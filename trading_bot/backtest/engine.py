"""
Backtest Engine — event-driven simulation of trading strategies on historical data.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
import numpy as np

from ..config.settings import config
from ..signals.strategies import Action, SignalResult

logger = logging.getLogger(__name__)


@dataclass
class Trade:
    symbol: str
    entry_time: datetime
    entry_price: float
    quantity: float
    side: str  # "long" | "short"
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    exit_reason: Optional[str] = None


@dataclass
class BacktestResult:
    trades: List[Trade]
    equity_curve: pd.Series
    metrics: Dict[str, float]
    start_capital: float
    end_capital: float
    symbol: str
    strategy_name: str
    start_date: str
    end_date: str


class BacktestEngine:
    """
    Simple event-driven backtester.
    Iterates bar-by-bar, applies the strategy, and simulates order fills.
    """

    def __init__(self, strategy, initial_capital: Optional[float] = None):
        self.strategy = strategy
        self.initial_capital = initial_capital or config.backtest.initial_capital
        self.commission = config.backtest.commission_pct
        self.slippage = config.backtest.slippage_pct
        self.stop_loss_pct = config.risk.stop_loss_pct
        self.take_profit_pct = config.risk.take_profit_pct
        self.max_position_pct = config.risk.max_position_size_pct

    def run(self, symbol: str, df: pd.DataFrame) -> BacktestResult:
        """Run backtest on OHLCV DataFrame. Returns BacktestResult."""
        capital = self.initial_capital
        position: Optional[Trade] = None
        trades: List[Trade] = []
        equity: List[float] = []
        timestamps: List[datetime] = []

        lookback = 50  # minimum bars needed for indicators
        if len(df) < lookback:
            logger.warning("Insufficient data for backtest: %d bars", len(df))
            return self._empty_result(symbol)

        for i in range(lookback, len(df)):
            bar = df.iloc[i]
            window = df.iloc[: i + 1]
            price = float(bar["close"])
            ts = bar.name if isinstance(bar.name, datetime) else pd.Timestamp(bar.name).to_pydatetime()

            # Check stop-loss / take-profit on open position
            if position is not None:
                entry = position.entry_price
                if position.side == "long":
                    if price <= entry * (1 - self.stop_loss_pct):
                        capital, position = self._close_trade(position, price, ts, "stop_loss", capital, trades)
                    elif price >= entry * (1 + self.take_profit_pct):
                        capital, position = self._close_trade(position, price, ts, "take_profit", capital, trades)

            # Generate signal
            signal: SignalResult = self.strategy.generate(symbol, window)

            if position is None and signal.action == Action.BUY:
                fill_price = price * (1 + self.slippage)
                qty = (capital * self.max_position_pct) / fill_price
                cost = qty * fill_price * (1 + self.commission)
                if cost <= capital:
                    capital -= cost
                    position = Trade(
                        symbol=symbol,
                        entry_time=ts,
                        entry_price=fill_price,
                        quantity=qty,
                        side="long",
                    )

            elif position is not None and signal.action == Action.SELL:
                capital, position = self._close_trade(position, price, ts, "signal", capital, trades)

            # Mark-to-market equity
            mtm = capital + (position.quantity * price if position else 0)
            equity.append(mtm)
            timestamps.append(ts)

        # Close any open position at end
        if position is not None:
            last_price = float(df.iloc[-1]["close"])
            last_ts = df.index[-1]
            if not isinstance(last_ts, datetime):
                last_ts = pd.Timestamp(last_ts).to_pydatetime()
            capital, _ = self._close_trade(position, last_price, last_ts, "end_of_backtest", capital, trades)

        equity_series = pd.Series(equity, index=timestamps)
        from .metrics import PerformanceMetrics
        metrics = PerformanceMetrics.calculate(equity_series, trades, self.initial_capital)

        return BacktestResult(
            trades=trades,
            equity_curve=equity_series,
            metrics=metrics,
            start_capital=self.initial_capital,
            end_capital=capital,
            symbol=symbol,
            strategy_name=self.strategy.__class__.__name__,
            start_date=str(df.index[0]),
            end_date=str(df.index[-1]),
        )

    def _close_trade(
        self,
        position: Trade,
        price: float,
        ts: datetime,
        reason: str,
        capital: float,
        trades: List[Trade],
    ):
        fill_price = price * (1 - self.slippage)
        proceeds = position.quantity * fill_price * (1 - self.commission)
        pnl = proceeds - (position.quantity * position.entry_price)
        pnl_pct = pnl / (position.quantity * position.entry_price)
        position.exit_time = ts
        position.exit_price = fill_price
        position.pnl = pnl
        position.pnl_pct = pnl_pct
        position.exit_reason = reason
        trades.append(position)
        return capital + proceeds, None

    def _empty_result(self, symbol: str) -> BacktestResult:
        return BacktestResult(
            trades=[],
            equity_curve=pd.Series(dtype=float),
            metrics={},
            start_capital=self.initial_capital,
            end_capital=self.initial_capital,
            symbol=symbol,
            strategy_name=self.strategy.__class__.__name__,
            start_date="",
            end_date="",
        )
