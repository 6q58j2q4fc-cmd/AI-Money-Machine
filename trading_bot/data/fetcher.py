"""
Data Fetcher — retrieves OHLCV bars and real-time quotes from multiple providers.

Supported providers:
  - Yahoo Finance  (free, no key required)
  - Polygon.io     (POLYGON_API_KEY)
  - Alpaca Markets (ALPACA_API_KEY + ALPACA_SECRET_KEY)
  - Alpha Vantage  (ALPHA_VANTAGE_API_KEY)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import pandas as pd

from ..config.settings import config

logger = logging.getLogger(__name__)


class DataFetcher:
    """Unified interface for fetching market data from configured provider."""

    def __init__(self):
        self.provider = config.data.default_provider
        self._cache: Dict[str, pd.DataFrame] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_bars(
        self,
        symbol: str,
        timeframe: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 500,
    ) -> pd.DataFrame:
        """
        Return OHLCV DataFrame for *symbol* over the requested period.

        Columns: open, high, low, close, volume  (index = DatetimeIndex)
        """
        if start is None:
            start = datetime.utcnow() - timedelta(days=365)
        if end is None:
            end = datetime.utcnow()

        cache_key = f"{symbol}_{timeframe}_{start.date()}_{end.date()}"
        if cache_key in self._cache:
            logger.debug("Cache hit for %s", cache_key)
            return self._cache[cache_key]

        if self.provider == "polygon":
            df = self._fetch_polygon(symbol, timeframe, start, end)
        elif self.provider == "alpaca":
            df = self._fetch_alpaca(symbol, timeframe, start, end)
        elif self.provider == "alpha_vantage":
            df = self._fetch_alpha_vantage(symbol, timeframe)
        else:
            df = self._fetch_yahoo(symbol, timeframe, start, end)

        self._cache[cache_key] = df
        return df

    def get_latest_quote(self, symbol: str) -> Dict:
        """Return the latest bid/ask/last for *symbol*."""
        if self.provider == "alpaca":
            return self._latest_alpaca_quote(symbol)
        return self._latest_yahoo_quote(symbol)

    def get_multiple_bars(
        self,
        symbols: List[str],
        timeframe: str = "1d",
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> Dict[str, pd.DataFrame]:
        """Fetch bars for a list of symbols concurrently."""
        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {
                symbol: pool.submit(self.get_bars, symbol, timeframe, start, end)
                for symbol in symbols
            }
        return {sym: fut.result() for sym, fut in futures.items()}

    # ------------------------------------------------------------------
    # Yahoo Finance (default, no API key required)
    # ------------------------------------------------------------------

    def _fetch_yahoo(
        self, symbol: str, timeframe: str, start: datetime, end: datetime
    ) -> pd.DataFrame:
        try:
            import yfinance as yf  # type: ignore

            interval_map = {
                "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
                "1h": "1h", "4h": "1h",  # yfinance has no 4h; use 1h
                "1d": "1d", "1w": "1wk", "1mo": "1mo",
            }
            interval = interval_map.get(timeframe, "1d")
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start, end=end, interval=interval)
            df.columns = [c.lower() for c in df.columns]
            df.index.name = "timestamp"
            return df[["open", "high", "low", "close", "volume"]]
        except Exception as exc:
            logger.error("Yahoo Finance fetch failed for %s: %s", symbol, exc)
            return pd.DataFrame()

    def _latest_yahoo_quote(self, symbol: str) -> Dict:
        try:
            import yfinance as yf  # type: ignore

            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            return {
                "symbol": symbol,
                "price": getattr(info, "last_price", None),
                "bid": getattr(info, "bid", None),
                "ask": getattr(info, "ask", None),
            }
        except Exception as exc:
            logger.error("Yahoo quote failed for %s: %s", symbol, exc)
            return {"symbol": symbol, "price": None}

    # ------------------------------------------------------------------
    # Polygon.io
    # ------------------------------------------------------------------

    def _fetch_polygon(
        self, symbol: str, timeframe: str, start: datetime, end: datetime
    ) -> pd.DataFrame:
        try:
            from polygon import RESTClient  # type: ignore

            multiplier_map = {
                "1m": (1, "minute"), "5m": (5, "minute"), "15m": (15, "minute"),
                "30m": (30, "minute"), "1h": (1, "hour"), "4h": (4, "hour"),
                "1d": (1, "day"), "1w": (1, "week"),
            }
            mult, span = multiplier_map.get(timeframe, (1, "day"))
            client = RESTClient(config.data.polygon_api_key)
            aggs = client.get_aggs(
                symbol,
                mult,
                span,
                start.strftime("%Y-%m-%d"),
                end.strftime("%Y-%m-%d"),
                limit=50000,
            )
            rows = [
                {
                    "timestamp": pd.Timestamp(a.timestamp, unit="ms", tz="UTC"),
                    "open": a.open,
                    "high": a.high,
                    "low": a.low,
                    "close": a.close,
                    "volume": a.volume,
                }
                for a in aggs
            ]
            df = pd.DataFrame(rows).set_index("timestamp")
            return df
        except Exception as exc:
            logger.error("Polygon fetch failed for %s: %s", symbol, exc)
            return self._fetch_yahoo(symbol, timeframe, start, end)

    # ------------------------------------------------------------------
    # Alpaca Markets
    # ------------------------------------------------------------------

    def _fetch_alpaca(
        self, symbol: str, timeframe: str, start: datetime, end: datetime
    ) -> pd.DataFrame:
        try:
            from alpaca.data.historical import StockHistoricalDataClient  # type: ignore
            from alpaca.data.requests import StockBarsRequest  # type: ignore
            from alpaca.data.timeframe import TimeFrame  # type: ignore

            tf_map = {
                "1m": TimeFrame.Minute, "5m": TimeFrame.Minute,
                "1h": TimeFrame.Hour, "1d": TimeFrame.Day,
            }
            client = StockHistoricalDataClient(
                config.broker.alpaca_api_key, config.broker.alpaca_secret_key
            )
            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf_map.get(timeframe, TimeFrame.Day),
                start=start,
                end=end,
            )
            bars = client.get_stock_bars(request).df
            bars.index = bars.index.get_level_values("timestamp")
            bars.columns = [c.lower() for c in bars.columns]
            return bars[["open", "high", "low", "close", "volume"]]
        except Exception as exc:
            logger.error("Alpaca fetch failed for %s: %s", symbol, exc)
            return self._fetch_yahoo(symbol, timeframe, start, end)

    def _latest_alpaca_quote(self, symbol: str) -> Dict:
        try:
            from alpaca.data.historical import StockHistoricalDataClient  # type: ignore
            from alpaca.data.requests import StockLatestQuoteRequest  # type: ignore

            client = StockHistoricalDataClient(
                config.broker.alpaca_api_key, config.broker.alpaca_secret_key
            )
            req = StockLatestQuoteRequest(symbol_or_symbols=symbol)
            quote = client.get_stock_latest_quote(req)[symbol]
            return {
                "symbol": symbol,
                "bid": quote.bid_price,
                "ask": quote.ask_price,
                "price": (quote.bid_price + quote.ask_price) / 2,
            }
        except Exception as exc:
            logger.error("Alpaca quote failed for %s: %s", symbol, exc)
            return {"symbol": symbol, "price": None}

    # ------------------------------------------------------------------
    # Alpha Vantage
    # ------------------------------------------------------------------

    def _fetch_alpha_vantage(self, symbol: str, timeframe: str) -> pd.DataFrame:
        try:
            from alpha_vantage.timeseries import TimeSeries  # type: ignore

            tf_map = {
                "1m": "1min", "5m": "5min", "15m": "15min",
                "30m": "30min", "1h": "60min",
            }
            ts = TimeSeries(key=config.data.alpha_vantage_api_key, output_format="pandas")
            if timeframe in tf_map:
                df, _ = ts.get_intraday(symbol=symbol, interval=tf_map[timeframe], outputsize="full")
            else:
                df, _ = ts.get_daily_adjusted(symbol=symbol, outputsize="full")
            df.columns = ["open", "high", "low", "close", "adjusted_close", "volume", "dividend", "split"]
            return df[["open", "high", "low", "close", "volume"]]
        except Exception as exc:
            logger.error("Alpha Vantage fetch failed for %s: %s", symbol, exc)
            return self._fetch_yahoo(symbol, timeframe, datetime.utcnow() - timedelta(days=365), datetime.utcnow())
