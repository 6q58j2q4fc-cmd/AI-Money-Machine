"""
Order Manager — submits, tracks, and cancels orders via configured broker.
Supports paper trading mode (simulated fills) and live execution via Alpaca.
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from ..config.settings import config

logger = logging.getLogger(__name__)


class OrderStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


@dataclass
class Order:
    symbol: str
    side: OrderSide
    quantity: float
    order_type: OrderType = OrderType.MARKET
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    trail_percent: Optional[float] = None
    time_in_force: str = "day"  # "day" | "gtc" | "ioc" | "fok"
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    status: OrderStatus = OrderStatus.PENDING
    filled_price: Optional[float] = None
    filled_qty: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    filled_at: Optional[datetime] = None
    broker_order_id: Optional[str] = None
    error_message: Optional[str] = None


class OrderManager:
    """
    Unified order manager supporting paper and live trading modes.
    """

    def __init__(self):
        self.mode = config.mode  # "paper" | "live" | "backtest"
        self._orders: Dict[str, Order] = {}
        self._alpaca_client = None

        if self.mode == "live":
            self._init_alpaca()

    def _init_alpaca(self):
        try:
            from alpaca.trading.client import TradingClient  # type: ignore
            self._alpaca_client = TradingClient(
                config.broker.alpaca_api_key,
                config.broker.alpaca_secret_key,
                paper=False,
            )
            logger.info("Alpaca LIVE trading client initialised")
        except Exception as exc:
            logger.error("Failed to init Alpaca live client: %s", exc)

    # ------------------------------------------------------------------
    # Order submission
    # ------------------------------------------------------------------

    def submit(self, order: Order) -> Order:
        """Submit an order. Returns the updated Order with broker ID."""
        self._orders[order.id] = order

        if self.mode == "paper":
            return self._paper_fill(order)
        elif self.mode == "live" and self._alpaca_client:
            return self._submit_alpaca(order)
        else:
            logger.warning("Bot mode '%s' — order not submitted to broker", self.mode)
            order.status = OrderStatus.PENDING
            return order

    def cancel(self, order_id: str) -> bool:
        order = self._orders.get(order_id)
        if not order:
            return False
        if self.mode == "live" and self._alpaca_client and order.broker_order_id:
            try:
                self._alpaca_client.cancel_order_by_id(order.broker_order_id)
            except Exception as exc:
                logger.error("Cancel failed: %s", exc)
                return False
        order.status = OrderStatus.CANCELLED
        logger.info("Order %s cancelled", order_id)
        return True

    def get_order(self, order_id: str) -> Optional[Order]:
        return self._orders.get(order_id)

    def open_orders(self) -> List[Order]:
        return [o for o in self._orders.values() if o.status in (OrderStatus.PENDING, OrderStatus.SUBMITTED)]

    def order_history(self) -> List[Order]:
        return list(self._orders.values())

    # ------------------------------------------------------------------
    # Paper trading simulation
    # ------------------------------------------------------------------

    def _paper_fill(self, order: Order) -> Order:
        """Simulate immediate market fill at limit/stop price or last known price."""
        order.status = OrderStatus.FILLED
        order.filled_qty = order.quantity
        order.filled_price = order.limit_price or order.stop_price or 0.0
        order.filled_at = datetime.utcnow()
        logger.info(
            "[PAPER] %s %s %s qty=%.4f @ %.4f",
            order.side.upper(), order.symbol, order.order_type,
            order.quantity, order.filled_price or 0,
        )
        return order

    # ------------------------------------------------------------------
    # Alpaca live execution
    # ------------------------------------------------------------------

    def _submit_alpaca(self, order: Order) -> Order:
        try:
            from alpaca.trading.requests import (  # type: ignore
                MarketOrderRequest, LimitOrderRequest, StopOrderRequest,
                TrailingStopOrderRequest,
            )
            from alpaca.trading.enums import OrderSide as AlpacaSide, TimeInForce  # type: ignore

            side = AlpacaSide.BUY if order.side == OrderSide.BUY else AlpacaSide.SELL
            tif = TimeInForce.DAY if order.time_in_force == "day" else TimeInForce.GTC

            if order.order_type == OrderType.MARKET:
                req = MarketOrderRequest(symbol=order.symbol, qty=order.quantity, side=side, time_in_force=tif)
            elif order.order_type == OrderType.LIMIT:
                req = LimitOrderRequest(symbol=order.symbol, qty=order.quantity, side=side,
                                        time_in_force=tif, limit_price=order.limit_price)
            elif order.order_type == OrderType.TRAILING_STOP:
                req = TrailingStopOrderRequest(symbol=order.symbol, qty=order.quantity, side=side,
                                               time_in_force=tif, trail_percent=order.trail_percent)
            else:
                req = MarketOrderRequest(symbol=order.symbol, qty=order.quantity, side=side, time_in_force=tif)

            result = self._alpaca_client.submit_order(req)
            order.broker_order_id = str(result.id)
            order.status = OrderStatus.SUBMITTED
            logger.info("[LIVE] Order submitted to Alpaca: %s", result.id)
        except Exception as exc:
            order.status = OrderStatus.REJECTED
            order.error_message = str(exc)
            logger.error("Alpaca order submission failed: %s", exc)

        return order
