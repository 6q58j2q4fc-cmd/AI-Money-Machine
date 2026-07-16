"""
Trading Bot Dashboard API (FastAPI)
Exposes REST endpoints consumed by the MoneyMachine frontend.

Endpoints:
  GET  /api/bot/status          — bot health, mode, open positions
  GET  /api/bot/signals         — latest signals for all watchlist symbols
  POST /api/bot/backtest        — run backtest on demand
  GET  /api/bot/trades          — trade history
  GET  /api/bot/performance     — aggregate performance metrics
  POST /api/bot/start           — start the trading loop
  POST /api/bot/stop            — stop the trading loop
  GET  /api/bot/config          — current config (sanitised, no secrets)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ..config.settings import config
from ..data.fetcher import DataFetcher
from ..signals.strategies import (
    Action,
    BollingerBandsStrategy,
    MACDRSIStrategy,
    MLEnsembleStrategy,
    MovingAverageCrossoverStrategy,
)
from ..backtest.engine import BacktestEngine
from ..risk.manager import RiskManager
from ..execution.order_manager import OrderManager

logger = logging.getLogger(__name__)

# Shared singletons (initialised once per process)
_fetcher = DataFetcher()
_risk = RiskManager()
_orders = OrderManager()
_bot_running = False
_bot_task: Optional[asyncio.Task] = None


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Trading Bot API",
        description="MoneyMachine AI Trading Bot — signals, backtest, and execution",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------------------------------
    # Request / Response Models
    # ------------------------------------------------------------------

    class BacktestRequest(BaseModel):
        symbol: str
        strategy: str = "ml_ensemble"  # "macd_rsi" | "bollinger" | "ma_crossover" | "ml_ensemble"
        start_date: Optional[str] = None
        end_date: Optional[str] = None
        initial_capital: float = 10000.0
        timeframe: str = "1d"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_strategy(name: str):
        strategies = {
            "macd_rsi": MACDRSIStrategy(),
            "bollinger": BollingerBandsStrategy(),
            "ma_crossover": MovingAverageCrossoverStrategy(),
            "ml_ensemble": MLEnsembleStrategy(),
        }
        return strategies.get(name, MLEnsembleStrategy())

    # ------------------------------------------------------------------
    # Endpoints
    # ------------------------------------------------------------------

    @app.get("/api/bot/status")
    async def get_status() -> Dict[str, Any]:
        return {
            "running": _bot_running,
            "mode": config.mode,
            "strategy": config.strategy.active_strategy,
            "watchlist": config.strategy.watchlist,
            "timeframe": config.strategy.timeframe,
            "open_positions": _risk.open_positions(),
            "open_orders": len(_orders.open_orders()),
            "timestamp": datetime.utcnow().isoformat(),
        }

    @app.get("/api/bot/signals")
    async def get_signals() -> List[Dict[str, Any]]:
        strategy = _get_strategy(config.strategy.active_strategy)
        results = []
        for symbol in config.strategy.watchlist[:10]:  # limit to 10 for speed
            try:
                df = _fetcher.get_bars(symbol, config.strategy.timeframe)
                if df.empty:
                    continue
                signal = strategy.generate(symbol, df)
                results.append({
                    "symbol": symbol,
                    "action": signal.action,
                    "confidence": round(signal.confidence, 3),
                    "price": signal.price,
                    "reason": signal.reason,
                    "indicators": {k: round(v, 4) for k, v in signal.indicators.items()},
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception as exc:
                logger.error("Signal error for %s: %s", symbol, exc)
        return results

    @app.post("/api/bot/backtest")
    async def run_backtest(req: BacktestRequest) -> Dict[str, Any]:
        try:
            start = datetime.strptime(req.start_date or config.backtest.start_date, "%Y-%m-%d")
            end = datetime.strptime(req.end_date or config.backtest.end_date, "%Y-%m-%d")
            df = _fetcher.get_bars(req.symbol, req.timeframe, start, end)
            if df.empty:
                raise HTTPException(status_code=400, detail=f"No data for {req.symbol}")
            strategy = _get_strategy(req.strategy)
            engine = BacktestEngine(strategy, req.initial_capital)
            result = engine.run(req.symbol, df)
            trades_data = [
                {
                    "entry_time": str(t.entry_time),
                    "exit_time": str(t.exit_time),
                    "entry_price": t.entry_price,
                    "exit_price": t.exit_price,
                    "pnl": round(t.pnl or 0, 2),
                    "pnl_pct": round((t.pnl_pct or 0) * 100, 2),
                    "exit_reason": t.exit_reason,
                }
                for t in result.trades
            ]
            equity_data = [
                {"timestamp": str(ts), "equity": round(eq, 2)}
                for ts, eq in result.equity_curve.items()
            ]
            return {
                "symbol": result.symbol,
                "strategy": result.strategy_name,
                "start_date": result.start_date,
                "end_date": result.end_date,
                "start_capital": result.start_capital,
                "end_capital": round(result.end_capital, 2),
                "metrics": result.metrics,
                "trades": trades_data,
                "equity_curve": equity_data[-200:],  # last 200 points for chart
            }
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Backtest error: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc))

    @app.get("/api/bot/trades")
    async def get_trades() -> List[Dict[str, Any]]:
        return [
            {
                "id": o.id,
                "symbol": o.symbol,
                "side": o.side,
                "quantity": o.quantity,
                "status": o.status,
                "filled_price": o.filled_price,
                "created_at": str(o.created_at),
                "filled_at": str(o.filled_at) if o.filled_at else None,
            }
            for o in _orders.order_history()
        ]

    @app.get("/api/bot/performance")
    async def get_performance() -> Dict[str, Any]:
        filled = [o for o in _orders.order_history() if o.status.value == "filled"]
        return {
            "total_orders": len(_orders.order_history()),
            "filled_orders": len(filled),
            "open_positions": len(_risk.open_positions()),
            "mode": config.mode,
        }

    @app.post("/api/bot/start")
    async def start_bot() -> Dict[str, str]:
        global _bot_running, _bot_task
        if _bot_running:
            return {"status": "already_running"}
        _bot_running = True
        logger.info("Trading bot started in %s mode", config.mode)
        return {"status": "started", "mode": config.mode}

    @app.post("/api/bot/stop")
    async def stop_bot() -> Dict[str, str]:
        global _bot_running
        _bot_running = False
        logger.info("Trading bot stopped")
        return {"status": "stopped"}

    @app.get("/api/bot/config")
    async def get_config() -> Dict[str, Any]:
        """Return sanitised config (no API keys)."""
        return {
            "mode": config.mode,
            "strategy": config.strategy.active_strategy,
            "watchlist": config.strategy.watchlist,
            "timeframe": config.strategy.timeframe,
            "risk": {
                "max_position_size_pct": config.risk.max_position_size_pct,
                "stop_loss_pct": config.risk.stop_loss_pct,
                "take_profit_pct": config.risk.take_profit_pct,
                "max_drawdown_pct": config.risk.max_drawdown_pct,
                "max_open_trades": config.risk.max_open_trades,
            },
            "backtest": {
                "start_date": config.backtest.start_date,
                "end_date": config.backtest.end_date,
                "initial_capital": config.backtest.initial_capital,
            },
        }

    return app
