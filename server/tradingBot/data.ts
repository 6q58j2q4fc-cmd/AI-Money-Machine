/**
 * tradingBot/data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * OHLCV Data Module
 *
 * Responsibilities:
 *   1. Fetch OHLCV candles for a list of symbols from Alpaca Market Data API.
 *   2. Fall back to CCXT (Binance public) for crypto symbols when Alpaca
 *      returns no data or when the symbol is not a US equity.
 *   3. Cache every fetched candle to the `ohlcv_cache` MySQL table so
 *      subsequent calls within the TTL window are served from the DB.
 *   4. Log every fetch attempt to `ohlcv_fetch_log` for auditing.
 *
 * Cache TTL strategy:
 *   • 1m  candles  → 60 s TTL
 *   • 5m  candles  → 5 min TTL
 *   • 15m candles  → 15 min TTL
 *   • 1h  candles  → 1 h TTL
 *   • 1d  candles  → 6 h TTL (daily bars update after market close)
 *
 * Environment variables consumed:
 *   ALPACA_API_KEY        — Alpaca key ID
 *   ALPACA_SECRET_KEY     — Alpaca secret key
 *   ALPACA_BASE_URL       — optional override (default: paper endpoint)
 *   ALPACA_DATA_URL       — optional override (default: https://data.alpaca.markets)
 */

import { getDb } from "../db";
import { ohlcvCache, ohlcvFetchLog, type InsertOhlcvCandle } from "../../drizzle/schema";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";



// ─── Types ────────────────────────────────────────────────────────────────────

export interface OhlcvCandle {
  symbol: string;
  timeframe: string;
  openTime: number;   // Unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: "alpaca" | "ccxt" | "mock";
}

export interface FetchOhlcvOptions {
  symbols: string[];
  timeframe?: Timeframe;
  limit?: number;
  from?: number;   // Unix ms
  to?: number;     // Unix ms
  forceRefresh?: boolean;
}

export interface FetchOhlcvResult {
  symbol: string;
  candles: OhlcvCandle[];
  source: "alpaca" | "ccxt" | "mock" | "cache";
  cachedAt?: Date;
  fetchedAt: Date;
  error?: string;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Supported symbols — stocks (Alpaca) + crypto (CCXT fallback) */
export const SUPPORTED_SYMBOLS = {
  stocks: ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "SPY", "QQQ", "AMD"],
  crypto: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"],
} as const;

export const ALL_SYMBOLS = [...SUPPORTED_SYMBOLS.stocks, ...SUPPORTED_SYMBOLS.crypto];

/** Cache TTL per timeframe in milliseconds */
const CACHE_TTL_MS: Record<Timeframe, number> = {
  "1m":  60_000,
  "5m":  5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h":  60 * 60_000,
  "4h":  4 * 60 * 60_000,
  "1d":  6 * 60 * 60_000,
};

const ALPACA_DATA_URL =
  process.env.ALPACA_DATA_URL ?? "https://data.alpaca.markets";

const ALPACA_API_KEY    = process.env.ALPACA_API_KEY    ?? "";
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY ?? "";

/** Alpaca timeframe strings map */
const ALPACA_TF: Record<Timeframe, string> = {
  "1m":  "1Min",
  "5m":  "5Min",
  "15m": "15Min",
  "30m": "30Min",
  "1h":  "1Hour",
  "4h":  "4Hour",
  "1d":  "1Day",
};

// ─── Alpaca Fetcher ───────────────────────────────────────────────────────────

interface AlpacaBar {
  t: string;   // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/**
 * Fetch OHLCV bars from Alpaca Market Data API.
 * Returns an empty array (not an error) when the symbol has no data.
 */
export async function fetchFromAlpaca(
  symbol: string,
  timeframe: Timeframe,
  limit: number,
  from?: number,
  to?: number
): Promise<OhlcvCandle[]> {
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    return [];
  }

  // Alpaca uses "." separator for classes, e.g. BRK.B — keep as-is for equities
  // Crypto symbols like BTC/USDT are not supported by Alpaca equity endpoint
  if (symbol.includes("/")) return [];

  const params = new URLSearchParams({
    timeframe: ALPACA_TF[timeframe],
    limit: String(Math.min(limit, 1000)),
    adjustment: "raw",
    feed: "iex",
  });

  if (from) params.set("start", new Date(from).toISOString());
  if (to)   params.set("end",   new Date(to).toISOString());

  const url = `${ALPACA_DATA_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars?${params}`;

  const res = await fetch(url, {
    headers: {
      "APCA-API-KEY-ID":     ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { bars: AlpacaBar[] | null };
  const bars: AlpacaBar[] = json.bars ?? [];

  return bars.map((b) => ({
    symbol,
    timeframe,
    openTime: new Date(b.t).getTime(),
    open:   b.o,
    high:   b.h,
    low:    b.l,
    close:  b.c,
    volume: b.v,
    source: "alpaca" as const,
  }));
}

// ─── CCXT Fetcher ─────────────────────────────────────────────────────────────

/**
 * Fetch OHLCV via CCXT using Binance public API (no key required).
 * Used as fallback for crypto symbols or when Alpaca returns no data.
 */
export async function fetchFromCcxt(
  symbol: string,
  timeframe: Timeframe,
  limit: number,
  from?: number
): Promise<OhlcvCandle[]> {
  // Dynamic import to keep startup fast when CCXT is not needed
  const ccxt = await import("ccxt");
  const exchange = new ccxt.binance({ enableRateLimit: true });

  // CCXT timeframe strings
  const ccxtTf: Record<Timeframe, string> = {
    "1m":  "1m",
    "5m":  "5m",
    "15m": "15m",
    "30m": "30m",
    "1h":  "1h",
    "4h":  "4h",
    "1d":  "1d",
  };

  const rawBars = await exchange.fetchOHLCV(
    symbol,
    ccxtTf[timeframe],
    from,
    Math.min(limit, 500)
  );

  return rawBars.map(([ts, o, h, l, c, v]) => ({
    symbol,
    timeframe,
    openTime: ts as number,
    open:   o as number,
    high:   h as number,
    low:    l as number,
    close:  c as number,
    volume: v as number,
    source: "ccxt" as const,
  }));
}

// ─── Cache Layer ──────────────────────────────────────────────────────────────

/**
 * Check whether the cache is fresh enough for the given symbol + timeframe.
 * Returns the cached candles if valid, or null if stale / absent.
 */
export async function getCachedCandles(
  symbol: string,
  timeframe: Timeframe,
  from?: number,
  to?: number
): Promise<{ candles: OhlcvCandle[]; cachedAt: Date } | null> {
  const ttl = CACHE_TTL_MS[timeframe];
  const cutoff = new Date(Date.now() - ttl);

  // Find the most recent fetch for this symbol+timeframe
  const dbConn = await getDb();
  if (!dbConn) return null;
  const latestFetch = await dbConn
    .select({ fetchedAt: ohlcvCache.fetchedAt })
    .from(ohlcvCache)
    .where(and(eq(ohlcvCache.symbol, symbol), eq(ohlcvCache.timeframe, timeframe)))
    .orderBy(desc(ohlcvCache.fetchedAt))
    .limit(1);

  if (!latestFetch.length || latestFetch[0].fetchedAt < cutoff) {
    return null; // cache miss or stale
  }

  const conditions = [
    eq(ohlcvCache.symbol, symbol),
    eq(ohlcvCache.timeframe, timeframe),
  ];
  if (from) conditions.push(gte(ohlcvCache.openTime, from));
  if (to)   conditions.push(lte(ohlcvCache.openTime, to));

  const rows = await dbConn
    .select()
    .from(ohlcvCache)
    .where(and(...conditions))
    .orderBy(ohlcvCache.openTime);

  if (!rows.length) return null;

  const candles: OhlcvCandle[] = rows.map((r: typeof ohlcvCache.$inferSelect) => ({
    symbol:    r.symbol,
    timeframe: r.timeframe,
    openTime:  r.openTime,
    open:      r.open,
    high:      r.high,
    low:       r.low,
    close:     r.close,
    volume:    r.volume,
    source:    r.source,
  }));

  return { candles, cachedAt: latestFetch[0].fetchedAt };
}

/**
 * Persist a batch of candles to the DB cache using INSERT IGNORE to avoid
 * duplicates on (symbol, timeframe, openTime).
 */
export async function persistCandles(candles: OhlcvCandle[]): Promise<void> {
  if (!candles.length) return;

  const rows: InsertOhlcvCandle[] = candles.map((c) => ({
    symbol:    c.symbol,
    timeframe: c.timeframe,
    openTime:  c.openTime,
    open:      c.open,
    high:      c.high,
    low:       c.low,
    close:     c.close,
    volume:    c.volume,
    source:    c.source,
  }));

  // Batch insert in chunks of 500 to avoid packet-size limits
  const dbConn = await getDb();
  if (!dbConn) return;
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await dbConn
      .insert(ohlcvCache)
      .values(rows.slice(i, i + CHUNK))
      .onDuplicateKeyUpdate({
        set: {
          open:      sql`VALUES(open)`,
          high:      sql`VALUES(high)`,
          low:       sql`VALUES(low)`,
          close:     sql`VALUES(close)`,
          volume:    sql`VALUES(volume)`,
          source:    sql`VALUES(source)`,
          fetchedAt: sql`NOW()`,
        },
      });
  }
}

// ─── Fetch Log ────────────────────────────────────────────────────────────────

async function logFetch(
  symbol: string,
  timeframe: Timeframe,
  source: "alpaca" | "ccxt" | "mock",
  candlesFetched: number,
  durationMs: number,
  from?: number,
  to?: number,
  error?: string
): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  await dbConn.insert(ohlcvFetchLog).values({
    symbol,
    timeframe,
    source,
    candlesFetched,
    fromTime: from ?? null,
    toTime:   to   ?? null,
    durationMs,
    error: error ?? null,
  });
}

// ─── Main Public API ──────────────────────────────────────────────────────────

/**
 * Fetch OHLCV candles for one or more symbols.
 *
 * Strategy:
 *   1. Check DB cache — return immediately if fresh.
 *   2. Try Alpaca (equities + some crypto).
 *   3. Fall back to CCXT/Binance for crypto or when Alpaca returns nothing.
 *   4. Persist results to DB cache + fetch log.
 */
export async function fetchOHLCV(opts: FetchOhlcvOptions): Promise<FetchOhlcvResult[]> {
  const {
    symbols,
    timeframe = "1h",
    limit = 200,
    from,
    to,
    forceRefresh = false,
  } = opts;

  const results: FetchOhlcvResult[] = [];

  for (const symbol of symbols) {
    const fetchedAt = new Date();

    // ── 1. Cache check ────────────────────────────────────────────────────────
    if (!forceRefresh) {
      const cached = await getCachedCandles(symbol, timeframe, from, to);
      if (cached) {
        results.push({
          symbol,
          candles: cached.candles,
          source:  "cache",
          cachedAt: cached.cachedAt,
          fetchedAt,
        });
        continue;
      }
    }

    // ── 2. Try Alpaca ─────────────────────────────────────────────────────────
    let candles: OhlcvCandle[] = [];
    let source: "alpaca" | "ccxt" | "mock" = "alpaca";
    let fetchError: string | undefined;
    const t0 = Date.now();

    try {
      candles = await fetchFromAlpaca(symbol, timeframe, limit, from, to);
    } catch (err) {
      fetchError = String(err);
    }

    // ── 3. CCXT fallback ──────────────────────────────────────────────────────
    if (!candles.length) {
      source = "ccxt";
      fetchError = undefined;
      try {
        candles = await fetchFromCcxt(symbol, timeframe, limit, from);
      } catch (err) {
        fetchError = String(err);
        // Last resort: return empty with error
        candles = [];
      }
    }

    const durationMs = Date.now() - t0;

    // ── 4. Persist ────────────────────────────────────────────────────────────
    if (candles.length) {
      await persistCandles(candles);
    }

    await logFetch(symbol, timeframe, source, candles.length, durationMs, from, to, fetchError);

    results.push({
      symbol,
      candles,
      source,
      fetchedAt,
      error: fetchError,
    });
  }

  return results;
}

/**
 * Read candles directly from the DB cache without triggering a live fetch.
 */
export async function getCachedOHLCV(
  symbol: string,
  timeframe: Timeframe,
  from?: number,
  to?: number,
  limit = 500
): Promise<OhlcvCandle[]> {
  const conditions = [
    eq(ohlcvCache.symbol, symbol),
    eq(ohlcvCache.timeframe, timeframe),
  ];
  if (from) conditions.push(gte(ohlcvCache.openTime, from));
  if (to)   conditions.push(lte(ohlcvCache.openTime, to));

  const dbConn = await getDb();
  if (!dbConn) return [];
  const rows = await dbConn
    .select()
    .from(ohlcvCache)
    .where(and(...conditions))
    .orderBy(ohlcvCache.openTime)
    .limit(limit);

  return rows.map((r: typeof ohlcvCache.$inferSelect) => ({
    symbol:    r.symbol,
    timeframe: r.timeframe,
    openTime:  r.openTime,
    open:      r.open,
    high:      r.high,
    low:       r.low,
    close:     r.close,
    volume:    r.volume,
    source:    r.source,
  }));
}

/**
 * Delete cached candles for a symbol (or all symbols if none specified).
 * Returns the number of rows deleted.
 */
export async function clearOHLCVCache(symbol?: string, timeframe?: Timeframe): Promise<number> {
  const conditions = [];
  if (symbol)    conditions.push(eq(ohlcvCache.symbol, symbol));
  if (timeframe) conditions.push(eq(ohlcvCache.timeframe, timeframe));

  const dbConn = await getDb();
  if (!dbConn) return 0;
  const result = await dbConn
    .delete(ohlcvCache)
    .where(conditions.length ? and(...conditions) : undefined);

  // drizzle delete returns [ResultSetHeader, ...] in mysql2
  const header = (result as unknown as Array<{ affectedRows?: number }>)[0];
  return header?.affectedRows ?? 0;
}

/**
 * Return the list of symbols the module supports, grouped by asset class.
 */
export function getSupportedSymbols() {
  return {
    stocks: [...SUPPORTED_SYMBOLS.stocks],
    crypto: [...SUPPORTED_SYMBOLS.crypto],
    all:    ALL_SYMBOLS,
  };
}
