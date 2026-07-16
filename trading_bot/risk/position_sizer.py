"""Position sizing algorithms: Fixed %, Kelly Criterion, ATR-based, and Fixed Dollar."""

import math
from typing import Optional

import pandas as pd

from ..config.settings import config
from ..signals.indicators import Indicators


class PositionSizer:
    """
    Calculates optimal position size using various methods.
    All methods return the number of shares/units to buy.
    """

    @staticmethod
    def fixed_percent(
        portfolio_value: float,
        price: float,
        pct: Optional[float] = None,
    ) -> float:
        """Risk a fixed % of portfolio per trade."""
        pct = pct or config.risk.max_position_size_pct
        return math.floor((portfolio_value * pct) / price)

    @staticmethod
    def kelly_criterion(
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        portfolio_value: float,
        price: float,
        fraction: float = 0.25,  # use 25% Kelly to reduce variance
    ) -> float:
        """
        Kelly Criterion: f* = (p*b - q) / b
        where p=win_rate, q=1-p, b=avg_win/avg_loss
        """
        if avg_loss <= 0:
            return 0.0
        b = avg_win / avg_loss
        q = 1 - win_rate
        kelly_pct = (win_rate * b - q) / b
        kelly_pct = max(0.0, min(kelly_pct * fraction, config.risk.max_position_size_pct))
        return math.floor((portfolio_value * kelly_pct) / price)

    @staticmethod
    def atr_based(
        df: pd.DataFrame,
        portfolio_value: float,
        price: float,
        risk_pct: Optional[float] = None,
        atr_period: int = 14,
        atr_multiplier: float = 2.0,
    ) -> float:
        """
        Size position so that 1 ATR move = risk_pct of portfolio.
        stop_distance = atr_multiplier * ATR
        quantity = (portfolio * risk_pct) / stop_distance
        """
        risk_pct = risk_pct or config.risk.stop_loss_pct
        atr = Indicators.atr(df, atr_period).iloc[-1]
        stop_distance = atr_multiplier * atr
        if stop_distance <= 0:
            return 0.0
        dollar_risk = portfolio_value * risk_pct
        return math.floor(dollar_risk / stop_distance)

    @staticmethod
    def fixed_dollar(amount: float, price: float) -> float:
        """Buy a fixed dollar amount worth of shares."""
        return math.floor(amount / price)
