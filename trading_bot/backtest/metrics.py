"""Performance metrics calculator for backtest results."""

from typing import Dict, List

import numpy as np
import pandas as pd


class PerformanceMetrics:
    """Calculates standard trading performance metrics."""

    @staticmethod
    def calculate(
        equity_curve: pd.Series,
        trades: list,
        initial_capital: float,
        risk_free_rate: float = 0.05,
    ) -> Dict[str, float]:
        if equity_curve.empty or not trades:
            return {}

        returns = equity_curve.pct_change().dropna()
        total_return = (equity_curve.iloc[-1] - initial_capital) / initial_capital

        # Sharpe Ratio (annualised, assuming daily bars)
        excess_returns = returns - risk_free_rate / 252
        sharpe = (excess_returns.mean() / excess_returns.std()) * np.sqrt(252) if excess_returns.std() > 0 else 0.0

        # Sortino Ratio
        downside = returns[returns < 0]
        sortino = (returns.mean() / downside.std()) * np.sqrt(252) if len(downside) > 0 and downside.std() > 0 else 0.0

        # Max Drawdown
        rolling_max = equity_curve.cummax()
        drawdown = (equity_curve - rolling_max) / rolling_max
        max_drawdown = float(drawdown.min())

        # Calmar Ratio
        calmar = (total_return / abs(max_drawdown)) if max_drawdown != 0 else 0.0

        # Win rate
        winning = [t for t in trades if t.pnl and t.pnl > 0]
        losing = [t for t in trades if t.pnl and t.pnl <= 0]
        win_rate = len(winning) / len(trades) if trades else 0.0

        # Profit factor
        gross_profit = sum(t.pnl for t in winning) if winning else 0.0
        gross_loss = abs(sum(t.pnl for t in losing)) if losing else 0.0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf")

        # Average trade
        avg_win = gross_profit / len(winning) if winning else 0.0
        avg_loss = gross_loss / len(losing) if losing else 0.0
        avg_trade = sum(t.pnl for t in trades if t.pnl) / len(trades) if trades else 0.0

        # Expectancy
        expectancy = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)

        return {
            "total_return_pct": round(total_return * 100, 2),
            "sharpe_ratio": round(sharpe, 3),
            "sortino_ratio": round(sortino, 3),
            "calmar_ratio": round(calmar, 3),
            "max_drawdown_pct": round(max_drawdown * 100, 2),
            "win_rate_pct": round(win_rate * 100, 2),
            "profit_factor": round(profit_factor, 3),
            "total_trades": len(trades),
            "winning_trades": len(winning),
            "losing_trades": len(losing),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "avg_trade": round(avg_trade, 2),
            "expectancy": round(expectancy, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_loss": round(gross_loss, 2),
        }
