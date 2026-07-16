"""Signals module: computes technical indicators and generates BUY/SELL/HOLD signals."""

from .indicators import Indicators
from .strategies import (
    BollingerBandsStrategy,
    MACDRSIStrategy,
    MovingAverageCrossoverStrategy,
    MLEnsembleStrategy,
    SignalResult,
)

__all__ = [
    "Indicators",
    "MACDRSIStrategy",
    "BollingerBandsStrategy",
    "MovingAverageCrossoverStrategy",
    "MLEnsembleStrategy",
    "SignalResult",
]
