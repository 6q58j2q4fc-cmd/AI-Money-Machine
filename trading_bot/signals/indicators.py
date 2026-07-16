"""
Technical Indicators Library
Computes RSI, MACD, Bollinger Bands, ATR, EMA, SMA, VWAP, and more.
All methods accept a pandas DataFrame with OHLCV columns and return a new DataFrame.
"""

import pandas as pd
import numpy as np


class Indicators:
    """Stateless collection of technical indicator calculations."""

    # ------------------------------------------------------------------
    # Trend Indicators
    # ------------------------------------------------------------------

    @staticmethod
    def sma(df: pd.DataFrame, period: int = 20, col: str = "close") -> pd.Series:
        """Simple Moving Average."""
        return df[col].rolling(window=period).mean()

    @staticmethod
    def ema(df: pd.DataFrame, period: int = 20, col: str = "close") -> pd.Series:
        """Exponential Moving Average."""
        return df[col].ewm(span=period, adjust=False).mean()

    @staticmethod
    def macd(
        df: pd.DataFrame,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
        col: str = "close",
    ) -> pd.DataFrame:
        """
        MACD indicator.
        Returns DataFrame with columns: macd, signal, histogram.
        """
        ema_fast = df[col].ewm(span=fast, adjust=False).mean()
        ema_slow = df[col].ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return pd.DataFrame(
            {"macd": macd_line, "signal": signal_line, "histogram": histogram},
            index=df.index,
        )

    # ------------------------------------------------------------------
    # Momentum Indicators
    # ------------------------------------------------------------------

    @staticmethod
    def rsi(df: pd.DataFrame, period: int = 14, col: str = "close") -> pd.Series:
        """Relative Strength Index (Wilder's smoothing)."""
        delta = df[col].diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        return 100 - (100 / (1 + rs))

    @staticmethod
    def stochastic(
        df: pd.DataFrame, k_period: int = 14, d_period: int = 3
    ) -> pd.DataFrame:
        """Stochastic Oscillator (%K and %D)."""
        low_min = df["low"].rolling(window=k_period).min()
        high_max = df["high"].rolling(window=k_period).max()
        k = 100 * (df["close"] - low_min) / (high_max - low_min)
        d = k.rolling(window=d_period).mean()
        return pd.DataFrame({"stoch_k": k, "stoch_d": d}, index=df.index)

    # ------------------------------------------------------------------
    # Volatility Indicators
    # ------------------------------------------------------------------

    @staticmethod
    def bollinger_bands(
        df: pd.DataFrame, period: int = 20, std_dev: float = 2.0, col: str = "close"
    ) -> pd.DataFrame:
        """
        Bollinger Bands.
        Returns DataFrame with columns: bb_upper, bb_middle, bb_lower, bb_width, bb_pct.
        """
        middle = df[col].rolling(window=period).mean()
        std = df[col].rolling(window=period).std()
        upper = middle + std_dev * std
        lower = middle - std_dev * std
        width = (upper - lower) / middle
        pct = (df[col] - lower) / (upper - lower)
        return pd.DataFrame(
            {
                "bb_upper": upper,
                "bb_middle": middle,
                "bb_lower": lower,
                "bb_width": width,
                "bb_pct": pct,
            },
            index=df.index,
        )

    @staticmethod
    def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Average True Range."""
        hl = df["high"] - df["low"]
        hc = (df["high"] - df["close"].shift()).abs()
        lc = (df["low"] - df["close"].shift()).abs()
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        return tr.ewm(alpha=1 / period, adjust=False).mean()

    # ------------------------------------------------------------------
    # Volume Indicators
    # ------------------------------------------------------------------

    @staticmethod
    def vwap(df: pd.DataFrame) -> pd.Series:
        """Volume Weighted Average Price (intraday, resets each day)."""
        typical_price = (df["high"] + df["low"] + df["close"]) / 3
        cum_tp_vol = (typical_price * df["volume"]).cumsum()
        cum_vol = df["volume"].cumsum()
        return cum_tp_vol / cum_vol

    @staticmethod
    def obv(df: pd.DataFrame) -> pd.Series:
        """On-Balance Volume."""
        direction = df["close"].diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
        return (direction * df["volume"]).cumsum()

    # ------------------------------------------------------------------
    # Convenience: add all indicators to a DataFrame
    # ------------------------------------------------------------------

    @classmethod
    def add_all(
        cls,
        df: pd.DataFrame,
        rsi_period: int = 14,
        macd_fast: int = 12,
        macd_slow: int = 26,
        macd_signal: int = 9,
        bb_period: int = 20,
        bb_std: float = 2.0,
        atr_period: int = 14,
        sma_fast: int = 50,
        sma_slow: int = 200,
    ) -> pd.DataFrame:
        """Return a copy of *df* with all indicator columns appended."""
        out = df.copy()
        out["rsi"] = cls.rsi(out, rsi_period)
        macd_df = cls.macd(out, macd_fast, macd_slow, macd_signal)
        out["macd"] = macd_df["macd"]
        out["macd_signal"] = macd_df["signal"]
        out["macd_hist"] = macd_df["histogram"]
        bb_df = cls.bollinger_bands(out, bb_period, bb_std)
        out["bb_upper"] = bb_df["bb_upper"]
        out["bb_middle"] = bb_df["bb_middle"]
        out["bb_lower"] = bb_df["bb_lower"]
        out["bb_pct"] = bb_df["bb_pct"]
        out["atr"] = cls.atr(out, atr_period)
        out["sma_fast"] = cls.sma(out, sma_fast)
        out["sma_slow"] = cls.sma(out, sma_slow)
        out["ema_20"] = cls.ema(out, 20)
        out["obv"] = cls.obv(out)
        return out.dropna()
