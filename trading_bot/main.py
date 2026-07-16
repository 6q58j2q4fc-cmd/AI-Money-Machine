"""
AI Trading Bot — Main Entry Point
Usage:
  python -m trading_bot.main --mode paper     # paper trading
  python -m trading_bot.main --mode backtest  # run backtest
  python -m trading_bot.main --mode dashboard # start API server only
"""

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("trading_bot")


def run_backtest():
    """Run a quick backtest on the configured watchlist."""
    from .config.settings import config
    from .data.fetcher import DataFetcher
    from .signals.strategies import MLEnsembleStrategy
    from .backtest.engine import BacktestEngine

    fetcher = DataFetcher()
    strategy = MLEnsembleStrategy()
    engine = BacktestEngine(strategy)

    start = datetime.strptime(config.backtest.start_date, "%Y-%m-%d")
    end = datetime.strptime(config.backtest.end_date, "%Y-%m-%d")

    for symbol in config.strategy.watchlist[:3]:  # test first 3 symbols
        logger.info("Backtesting %s from %s to %s...", symbol, start.date(), end.date())
        df = fetcher.get_bars(symbol, config.strategy.timeframe, start, end)
        if df.empty:
            logger.warning("No data for %s", symbol)
            continue
        result = engine.run(symbol, df)
        m = result.metrics
        logger.info(
            "%s | Return: %.1f%% | Sharpe: %.2f | MaxDD: %.1f%% | Trades: %d | WinRate: %.1f%%",
            symbol,
            m.get("total_return_pct", 0),
            m.get("sharpe_ratio", 0),
            m.get("max_drawdown_pct", 0),
            m.get("total_trades", 0),
            m.get("win_rate_pct", 0),
        )


def run_paper_trading():
    """Run the paper trading loop."""
    from .config.settings import config
    from .data.fetcher import DataFetcher
    from .signals.strategies import MLEnsembleStrategy
    from .risk.manager import RiskManager
    from .risk.position_sizer import PositionSizer
    from .execution.order_manager import Order, OrderManager, OrderSide, OrderType

    fetcher = DataFetcher()
    strategy = MLEnsembleStrategy()
    risk = RiskManager()
    orders = OrderManager()

    portfolio_value = config.backtest.initial_capital
    logger.info("Paper trading started. Portfolio: $%.2f", portfolio_value)

    while True:
        for symbol in config.strategy.watchlist:
            try:
                df = fetcher.get_bars(symbol, config.strategy.timeframe)
                if df.empty:
                    continue
                signal = strategy.generate(symbol, df)
                price = signal.price or float(df.iloc[-1]["close"])

                if signal.action.value == "BUY":
                    approved, reason = risk.check_trade(
                        symbol, "buy",
                        PositionSizer.fixed_percent(portfolio_value, price),
                        price, portfolio_value, signal.confidence
                    )
                    if approved:
                        qty = PositionSizer.fixed_percent(portfolio_value, price)
                        order = Order(symbol=symbol, side=OrderSide.BUY, quantity=qty,
                                      order_type=OrderType.MARKET, limit_price=price)
                        orders.submit(order)
                        risk.register_open(symbol, "long", price, qty)
                        logger.info("BUY %s qty=%d @ %.4f | %s", symbol, qty, price, signal.reason)

                elif signal.action.value == "SELL" and symbol in risk.open_positions():
                    pos = risk.open_positions()[symbol]
                    order = Order(symbol=symbol, side=OrderSide.SELL, quantity=pos["quantity"],
                                  order_type=OrderType.MARKET, limit_price=price)
                    orders.submit(order)
                    risk.register_close(symbol)
                    logger.info("SELL %s qty=%.4f @ %.4f | %s", symbol, pos["quantity"], price, signal.reason)

            except Exception as exc:
                logger.error("Error processing %s: %s", symbol, exc)

        import time
        time.sleep(60)  # check every minute


def run_dashboard():
    """Start the FastAPI dashboard server."""
    import uvicorn
    from .dashboard.api import create_app

    app = create_app()
    from .config.settings import config
    uvicorn.run(app, host=config.dashboard_host, port=config.dashboard_port, log_level="info")


def main():
    parser = argparse.ArgumentParser(description="AI Trading Bot")
    parser.add_argument(
        "--mode",
        choices=["paper", "backtest", "dashboard", "live"],
        default=os.getenv("BOT_MODE", "dashboard"),
        help="Bot operating mode",
    )
    args = parser.parse_args()

    logger.info("Starting AI Trading Bot in '%s' mode", args.mode)

    if args.mode == "backtest":
        run_backtest()
    elif args.mode in ("paper", "live"):
        run_paper_trading()
    else:
        run_dashboard()


if __name__ == "__main__":
    main()
