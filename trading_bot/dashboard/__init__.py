"""Dashboard module: FastAPI REST API for bot status, signals, and backtest results."""

from .api import create_app

__all__ = ["create_app"]
