"""
Trading Strategies
Each strategy receives an OHLCV DataFrame (with indicators pre-computed) and
returns a SignalResult with action BUY / SELL / HOLD and a confidence score.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Optional

import pandas as pd

from .indicators import Indicators
from ..config.settings import config


class Action(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class SignalResult:
    action: Action
    confidence: float          # 0.0 – 1.0
    symbol: str
    price: float
    reason: str
    indicators: Dict[str, float]


class MACDRSIStrategy:
    """
    Combined MACD + RSI strategy.
    BUY  when MACD crosses above signal AND RSI < oversold threshold.
    SELL when MACD crosses below signal AND RSI > overbought threshold.
    """

    def __init__(self):
        self.rsi_oversold = config.strategy.rsi_oversold
        self.rsi_overbought = config.strategy.rsi_overbought
        self.fast = config.strategy.macd_fast
        self.slow = config.strategy.macd_slow
        self.signal_period = config.strategy.macd_signal

    def generate(self, symbol: str, df: pd.DataFrame) -> SignalResult:
        df = Indicators.add_all(df)
        if len(df) < 2:
            return SignalResult(Action.HOLD, 0.0, symbol, 0.0, "Insufficient data", {})

        latest = df.iloc[-1]
        prev = df.iloc[-2]
        price = float(latest["close"])

        macd_cross_up = prev["macd"] < prev["macd_signal"] and latest["macd"] > latest["macd_signal"]
        macd_cross_down = prev["macd"] > prev["macd_signal"] and latest["macd"] < latest["macd_signal"]
        rsi = float(latest["rsi"])

        indicators = {
            "rsi": rsi,
            "macd": float(latest["macd"]),
            "macd_signal": float(latest["macd_signal"]),
            "macd_hist": float(latest["macd_hist"]),
        }

        if macd_cross_up and rsi < self.rsi_oversold:
            confidence = min(1.0, (self.rsi_oversold - rsi) / self.rsi_oversold + 0.5)
            return SignalResult(Action.BUY, confidence, symbol, price,
                                f"MACD bullish crossover + RSI oversold ({rsi:.1f})", indicators)

        if macd_cross_down and rsi > self.rsi_overbought:
            confidence = min(1.0, (rsi - self.rsi_overbought) / (100 - self.rsi_overbought) + 0.5)
            return SignalResult(Action.SELL, confidence, symbol, price,
                                f"MACD bearish crossover + RSI overbought ({rsi:.1f})", indicators)

        return SignalResult(Action.HOLD, 0.3, symbol, price, "No clear signal", indicators)


class BollingerBandsStrategy:
    """
    Bollinger Bands mean-reversion strategy.
    BUY  when price touches/crosses below lower band.
    SELL when price touches/crosses above upper band.
    """

    def __init__(self):
        self.period = config.strategy.bb_period
        self.std_dev = config.strategy.bb_std_dev

    def generate(self, symbol: str, df: pd.DataFrame) -> SignalResult:
        df = Indicators.add_all(df)
        if len(df) < 2:
            return SignalResult(Action.HOLD, 0.0, symbol, 0.0, "Insufficient data", {})

        latest = df.iloc[-1]
        price = float(latest["close"])
        bb_pct = float(latest["bb_pct"])
        rsi = float(latest["rsi"])

        indicators = {
            "bb_upper": float(latest["bb_upper"]),
            "bb_middle": float(latest["bb_middle"]),
            "bb_lower": float(latest["bb_lower"]),
            "bb_pct": bb_pct,
            "rsi": rsi,
        }

        if bb_pct < 0.05 and rsi < 40:
            confidence = min(1.0, (0.1 - bb_pct) * 5 + 0.5)
            return SignalResult(Action.BUY, confidence, symbol, price,
                                f"Price near lower BB ({bb_pct:.2%})", indicators)

        if bb_pct > 0.95 and rsi > 60:
            confidence = min(1.0, (bb_pct - 0.9) * 5 + 0.5)
            return SignalResult(Action.SELL, confidence, symbol, price,
                                f"Price near upper BB ({bb_pct:.2%})", indicators)

        return SignalResult(Action.HOLD, 0.3, symbol, price, "Price within bands", indicators)


class MovingAverageCrossoverStrategy:
    """
    Golden Cross / Death Cross strategy.
    BUY  when fast SMA crosses above slow SMA (Golden Cross).
    SELL when fast SMA crosses below slow SMA (Death Cross).
    """

    def __init__(self):
        self.fast = config.strategy.ma_fast
        self.slow = config.strategy.ma_slow

    def generate(self, symbol: str, df: pd.DataFrame) -> SignalResult:
        df = Indicators.add_all(df)
        if len(df) < 2:
            return SignalResult(Action.HOLD, 0.0, symbol, 0.0, "Insufficient data", {})

        latest = df.iloc[-1]
        prev = df.iloc[-2]
        price = float(latest["close"])

        golden_cross = prev["sma_fast"] < prev["sma_slow"] and latest["sma_fast"] > latest["sma_slow"]
        death_cross = prev["sma_fast"] > prev["sma_slow"] and latest["sma_fast"] < latest["sma_slow"]

        indicators = {
            "sma_fast": float(latest["sma_fast"]),
            "sma_slow": float(latest["sma_slow"]),
            "spread_pct": float((latest["sma_fast"] - latest["sma_slow"]) / latest["sma_slow"]),
        }

        if golden_cross:
            return SignalResult(Action.BUY, 0.8, symbol, price,
                                f"Golden Cross: SMA{self.fast} crossed above SMA{self.slow}", indicators)
        if death_cross:
            return SignalResult(Action.SELL, 0.8, symbol, price,
                                f"Death Cross: SMA{self.fast} crossed below SMA{self.slow}", indicators)

        trend = "uptrend" if latest["sma_fast"] > latest["sma_slow"] else "downtrend"
        return SignalResult(Action.HOLD, 0.3, symbol, price, f"No crossover ({trend})", indicators)


class MLEnsembleStrategy:
    """
    Ensemble strategy that combines all three strategies with weighted voting.
    Weights can be tuned based on historical performance.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.macd_rsi = MACDRSIStrategy()
        self.bollinger = BollingerBandsStrategy()
        self.ma_cross = MovingAverageCrossoverStrategy()
        self.weights = weights or {"macd_rsi": 0.4, "bollinger": 0.35, "ma_cross": 0.25}

    def generate(self, symbol: str, df: pd.DataFrame) -> SignalResult:
        results = {
            "macd_rsi": self.macd_rsi.generate(symbol, df),
            "bollinger": self.bollinger.generate(symbol, df),
            "ma_cross": self.ma_cross.generate(symbol, df),
        }

        buy_score = sum(
            self.weights[k] * r.confidence
            for k, r in results.items()
            if r.action == Action.BUY
        )
        sell_score = sum(
            self.weights[k] * r.confidence
            for k, r in results.items()
            if r.action == Action.SELL
        )

        price = results["macd_rsi"].price
        all_indicators = {}
        for r in results.values():
            all_indicators.update(r.indicators)

        if buy_score > sell_score and buy_score > 0.35:
            return SignalResult(Action.BUY, buy_score, symbol, price,
                                f"Ensemble BUY (score={buy_score:.2f})", all_indicators)
        if sell_score > buy_score and sell_score > 0.35:
            return SignalResult(Action.SELL, sell_score, symbol, price,
                                f"Ensemble SELL (score={sell_score:.2f})", all_indicators)

        return SignalResult(Action.HOLD, 0.3, symbol, price,
                            f"Ensemble HOLD (buy={buy_score:.2f}, sell={sell_score:.2f})", all_indicators)
