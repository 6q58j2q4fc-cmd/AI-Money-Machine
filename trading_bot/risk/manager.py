"""
Risk Manager — enforces portfolio-level risk rules before any order is placed.
"""

import logging
from typing import Dict, List, Optional

from ..config.settings import config

logger = logging.getLogger(__name__)


class RiskManager:
    """
    Evaluates whether a proposed trade passes all risk checks.
    Call check_trade() before sending any order to execution.
    """

    def __init__(self):
        self.max_position_pct = config.risk.max_position_size_pct
        self.max_portfolio_risk = config.risk.max_portfolio_risk_pct
        self.max_drawdown = config.risk.max_drawdown_pct
        self.max_open_trades = config.risk.max_open_trades
        self.stop_loss_pct = config.risk.stop_loss_pct
        self.take_profit_pct = config.risk.take_profit_pct

        self._peak_equity: float = 0.0
        self._open_positions: Dict[str, dict] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check_trade(
        self,
        symbol: str,
        side: str,           # "buy" | "sell"
        quantity: float,
        price: float,
        portfolio_value: float,
        confidence: float = 0.5,
    ) -> tuple[bool, str]:
        """
        Returns (approved: bool, reason: str).
        """
        # 1. Max open trades
        if side == "buy" and len(self._open_positions) >= self.max_open_trades:
            return False, f"Max open trades reached ({self.max_open_trades})"

        # 2. Position size limit
        trade_value = quantity * price
        position_pct = trade_value / portfolio_value if portfolio_value > 0 else 1.0
        if position_pct > self.max_position_pct:
            return False, f"Position size {position_pct:.1%} exceeds limit {self.max_position_pct:.1%}"

        # 3. Drawdown circuit breaker
        self._peak_equity = max(self._peak_equity, portfolio_value)
        current_drawdown = (self._peak_equity - portfolio_value) / self._peak_equity if self._peak_equity > 0 else 0
        if current_drawdown > self.max_drawdown:
            return False, f"Drawdown {current_drawdown:.1%} exceeds limit {self.max_drawdown:.1%} — trading halted"

        # 4. Minimum confidence threshold
        if confidence < 0.4:
            return False, f"Signal confidence {confidence:.2f} below minimum threshold 0.40"

        # 5. Duplicate position check
        if side == "buy" and symbol in self._open_positions:
            return False, f"Already holding position in {symbol}"

        return True, "Approved"

    def register_open(self, symbol: str, side: str, price: float, quantity: float):
        """Record a newly opened position."""
        self._open_positions[symbol] = {
            "side": side,
            "entry_price": price,
            "quantity": quantity,
            "stop_loss": price * (1 - self.stop_loss_pct),
            "take_profit": price * (1 + self.take_profit_pct),
        }
        logger.info("Position opened: %s %s @ %.4f qty=%.4f", side.upper(), symbol, price, quantity)

    def register_close(self, symbol: str):
        """Remove a closed position."""
        self._open_positions.pop(symbol, None)
        logger.info("Position closed: %s", symbol)

    def get_stop_loss(self, symbol: str) -> Optional[float]:
        pos = self._open_positions.get(symbol)
        return pos["stop_loss"] if pos else None

    def get_take_profit(self, symbol: str) -> Optional[float]:
        pos = self._open_positions.get(symbol)
        return pos["take_profit"] if pos else None

    def open_positions(self) -> Dict[str, dict]:
        return dict(self._open_positions)

    def portfolio_risk_pct(self, portfolio_value: float) -> float:
        """Returns current % of portfolio at risk across all open positions."""
        if portfolio_value <= 0:
            return 0.0
        total_risk = sum(
            pos["quantity"] * pos["entry_price"] * self.stop_loss_pct
            for pos in self._open_positions.values()
        )
        return total_risk / portfolio_value
