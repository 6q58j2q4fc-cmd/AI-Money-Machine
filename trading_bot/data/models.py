"""Shared data models for market data."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class OHLCV:
    """Open-High-Low-Close-Volume bar."""
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    vwap: Optional[float] = None
    trades: Optional[int] = None


@dataclass
class Tick:
    """Real-time tick data."""
    timestamp: datetime
    symbol: str
    price: float
    size: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    bid_size: Optional[float] = None
    ask_size: Optional[float] = None
