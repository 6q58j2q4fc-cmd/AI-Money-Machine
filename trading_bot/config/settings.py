"""
AI Trading Bot - Configuration Module
Loads all API keys and settings from environment variables / secrets.
"""

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BrokerConfig:
    """Broker / exchange API credentials."""

    # Alpaca (stocks, crypto)
    alpaca_api_key: str = field(default_factory=lambda: os.getenv("ALPACA_API_KEY", ""))
    alpaca_secret_key: str = field(default_factory=lambda: os.getenv("ALPACA_SECRET_KEY", ""))
    alpaca_base_url: str = field(
        default_factory=lambda: os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
    )

    # Binance (crypto)
    binance_api_key: str = field(default_factory=lambda: os.getenv("BINANCE_API_KEY", ""))
    binance_secret_key: str = field(default_factory=lambda: os.getenv("BINANCE_SECRET_KEY", ""))

    # Coinbase Advanced Trade
    coinbase_api_key: str = field(default_factory=lambda: os.getenv("COINBASE_API_KEY", ""))
    coinbase_secret_key: str = field(default_factory=lambda: os.getenv("COINBASE_SECRET_KEY", ""))

    # Interactive Brokers
    ib_host: str = field(default_factory=lambda: os.getenv("IB_HOST", "127.0.0.1"))
    ib_port: int = field(default_factory=lambda: int(os.getenv("IB_PORT", "7497")))
    ib_client_id: int = field(default_factory=lambda: int(os.getenv("IB_CLIENT_ID", "1")))


@dataclass
class DataConfig:
    """Market data provider credentials."""

    # Polygon.io (real-time & historical market data)
    polygon_api_key: str = field(default_factory=lambda: os.getenv("POLYGON_API_KEY", ""))

    # Alpha Vantage (free tier available)
    alpha_vantage_api_key: str = field(
        default_factory=lambda: os.getenv("ALPHA_VANTAGE_API_KEY", "")
    )

    # Twelve Data
    twelve_data_api_key: str = field(
        default_factory=lambda: os.getenv("TWELVE_DATA_API_KEY", "")
    )

    # Yahoo Finance (no key required, rate-limited)
    use_yahoo_finance: bool = True

    # Default data provider: "polygon" | "alpaca" | "yahoo" | "alpha_vantage"
    default_provider: str = field(
        default_factory=lambda: os.getenv("DATA_PROVIDER", "yahoo")
    )

    # Cache settings
    cache_dir: str = field(default_factory=lambda: os.getenv("DATA_CACHE_DIR", "./data_cache"))
    cache_ttl_seconds: int = 300  # 5 minutes for live data


@dataclass
class RiskConfig:
    """Risk management parameters."""

    max_position_size_pct: float = float(os.getenv("MAX_POSITION_SIZE_PCT", "0.05"))   # 5% per trade
    max_portfolio_risk_pct: float = float(os.getenv("MAX_PORTFOLIO_RISK_PCT", "0.20"))  # 20% total
    stop_loss_pct: float = float(os.getenv("STOP_LOSS_PCT", "0.02"))                   # 2% stop-loss
    take_profit_pct: float = float(os.getenv("TAKE_PROFIT_PCT", "0.06"))               # 6% take-profit
    max_drawdown_pct: float = float(os.getenv("MAX_DRAWDOWN_PCT", "0.15"))             # 15% max drawdown
    max_open_trades: int = int(os.getenv("MAX_OPEN_TRADES", "10"))
    use_trailing_stop: bool = os.getenv("USE_TRAILING_STOP", "true").lower() == "true"
    trailing_stop_pct: float = float(os.getenv("TRAILING_STOP_PCT", "0.03"))


@dataclass
class StrategyConfig:
    """Trading strategy parameters."""

    # Active strategy: "rsi_macd" | "bollinger_bands" | "moving_average_crossover" | "ml_ensemble"
    active_strategy: str = field(
        default_factory=lambda: os.getenv("ACTIVE_STRATEGY", "rsi_macd")
    )

    # RSI settings
    rsi_period: int = int(os.getenv("RSI_PERIOD", "14"))
    rsi_oversold: float = float(os.getenv("RSI_OVERSOLD", "30"))
    rsi_overbought: float = float(os.getenv("RSI_OVERBOUGHT", "70"))

    # MACD settings
    macd_fast: int = int(os.getenv("MACD_FAST", "12"))
    macd_slow: int = int(os.getenv("MACD_SLOW", "26"))
    macd_signal: int = int(os.getenv("MACD_SIGNAL", "9"))

    # Bollinger Bands
    bb_period: int = int(os.getenv("BB_PERIOD", "20"))
    bb_std_dev: float = float(os.getenv("BB_STD_DEV", "2.0"))

    # Moving Average Crossover
    ma_fast: int = int(os.getenv("MA_FAST", "50"))
    ma_slow: int = int(os.getenv("MA_SLOW", "200"))

    # Timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d"
    timeframe: str = field(default_factory=lambda: os.getenv("TIMEFRAME", "1h"))

    # Watchlist (comma-separated tickers)
    watchlist: list = field(
        default_factory=lambda: os.getenv(
            "WATCHLIST", "AAPL,MSFT,GOOGL,AMZN,NVDA,BTC-USD,ETH-USD"
        ).split(",")
    )


@dataclass
class BacktestConfig:
    """Backtesting parameters."""

    start_date: str = field(default_factory=lambda: os.getenv("BACKTEST_START", "2022-01-01"))
    end_date: str = field(default_factory=lambda: os.getenv("BACKTEST_END", "2024-12-31"))
    initial_capital: float = float(os.getenv("INITIAL_CAPITAL", "10000"))
    commission_pct: float = float(os.getenv("COMMISSION_PCT", "0.001"))  # 0.1%
    slippage_pct: float = float(os.getenv("SLIPPAGE_PCT", "0.0005"))     # 0.05%


@dataclass
class NotificationConfig:
    """Alert and notification settings."""

    telegram_bot_token: str = field(
        default_factory=lambda: os.getenv("TELEGRAM_BOT_TOKEN", "")
    )
    telegram_chat_id: str = field(
        default_factory=lambda: os.getenv("TELEGRAM_CHAT_ID", "")
    )
    discord_webhook_url: str = field(
        default_factory=lambda: os.getenv("DISCORD_WEBHOOK_URL", "")
    )
    email_smtp_host: str = field(default_factory=lambda: os.getenv("SMTP_HOST", ""))
    email_smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    email_address: str = field(default_factory=lambda: os.getenv("ALERT_EMAIL", ""))
    email_password: str = field(default_factory=lambda: os.getenv("ALERT_EMAIL_PASSWORD", ""))
    notify_on_trade: bool = True
    notify_on_error: bool = True
    notify_on_daily_summary: bool = True


@dataclass
class AppConfig:
    """Master configuration object."""

    broker: BrokerConfig = field(default_factory=BrokerConfig)
    data: DataConfig = field(default_factory=DataConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    strategy: StrategyConfig = field(default_factory=StrategyConfig)
    backtest: BacktestConfig = field(default_factory=BacktestConfig)
    notifications: NotificationConfig = field(default_factory=NotificationConfig)

    # Bot mode: "paper" | "live" | "backtest"
    mode: str = field(default_factory=lambda: os.getenv("BOT_MODE", "paper"))

    # Dashboard
    dashboard_host: str = field(default_factory=lambda: os.getenv("DASHBOARD_HOST", "0.0.0.0"))
    dashboard_port: int = int(os.getenv("DASHBOARD_PORT", "8050"))

    # Logging
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    log_file: str = field(default_factory=lambda: os.getenv("LOG_FILE", "logs/trading_bot.log"))


# Singleton config instance
config = AppConfig()
