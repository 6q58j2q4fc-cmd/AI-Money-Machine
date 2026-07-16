"""Data module: fetches, caches, and normalises market data from multiple providers."""

from .fetcher import DataFetcher
from .models import OHLCV, Tick

__all__ = ["DataFetcher", "OHLCV", "Tick"]
