"""Backtest module: event-driven backtesting engine with performance analytics."""

from .engine import BacktestEngine
from .metrics import PerformanceMetrics

__all__ = ["BacktestEngine", "PerformanceMetrics"]
