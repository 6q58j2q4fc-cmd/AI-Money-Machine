/**
 * tradingBot/signals.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Signals Module — Moving-Average Crossover Strategy
 *
 * Design principles:
 *   • Every exported function is a **pure function**: same inputs → same output,
 *     no side effects, no I/O.  This makes the logic trivially testable and
 *     safe to call from any context (server, test, worker).
 *   • Position sizing follows the Kelly-inspired fixed-fractional model:
 *       positionSize = (portfolioValue × riskPct) / (entryPrice × stopLossPct)
 *     clamped to [minSize, maxPositionPct × portfolioValue / entryPrice].
 *   • Signal confidence is derived from the magnitude of the MA spread and
 *     the RSI filter, giving a continuous [0, 1] score alongside the
 *     discrete BUY / SELL / HOLD action.
 *
 * Strategies implemented:
 *   1. SMA Crossover  — Simple Moving Average fast/slow crossover
 *   2. EMA Crossover  — Exponential Moving Average fast/slow crossover
 *   3. MACD           — MACD line / signal line crossover (EMA-based)
 *
 * All three share the same output type so the caller can swap strategies
 * without changing downstream code.
 *
 * Glossary:
 *   fast period  — shorter lookback (e.g. 9 or 12 bars)
 *   slow period  — longer lookback (e.g. 21 or 26 bars)
 *   signal period — smoothing period for MACD signal line (e.g. 9)
 *   RSI period   — lookback for Relative Strength Index filter (default 14)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface Signal {
  /** The trading symbol this signal applies to */
  symbol: string;
  /** Discrete action */
  action: SignalAction;
  /** Continuous confidence score in [0, 1] */
  confidence: number;
  /** Suggested number of shares/units to trade (0 for HOLD) */
  positionSize: number;
  /** Price at which the signal was generated */
  price: number;
  /** Suggested stop-loss price */
  stopLoss: number;
  /** Suggested take-profit price */
  takeProfit: number;
  /** Strategy that produced this signal */
  strategy: StrategyName;
  /** Human-readable reason */
  reason: string;
  /** Indicator snapshot at signal time */
  indicators: IndicatorSnapshot;
  /** Unix ms timestamp of the last candle used */
  timestamp: number;
}

export interface IndicatorSnapshot {
  fastMA: number;
  slowMA: number;
  maSpreadPct: number;   // (fastMA - slowMA) / slowMA × 100
  rsi?: number;
  macdLine?: number;
  signalLine?: number;
  macdHistogram?: number;
}

export type StrategyName = "sma_crossover" | "ema_crossover" | "macd";

export interface StrategyConfig {
  name: StrategyName;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod?: number;   // MACD only
  rsiPeriod: number;
  rsiOverbought: number;   // default 70
  rsiOversold: number;     // default 30
}

export interface PositionSizingConfig {
  portfolioValue: number;
  riskPctPerTrade: number;   // e.g. 0.02 = 2% of portfolio at risk per trade
  stopLossPct: number;       // e.g. 0.02 = 2% stop loss from entry
  takeProfitPct: number;     // e.g. 0.04 = 4% take profit from entry
  maxPositionPct: number;    // e.g. 0.05 = max 5% of portfolio in one position
  minPositionSize: number;   // minimum units (e.g. 1 share)
}

export interface CandleInput {
  openTime: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

// ─── Default configs ──────────────────────────────────────────────────────────

export const DEFAULT_STRATEGY_CONFIGS: Record<StrategyName, StrategyConfig> = {
  sma_crossover: {
    name:          "sma_crossover",
    fastPeriod:    9,
    slowPeriod:    21,
    rsiPeriod:     14,
    rsiOverbought: 70,
    rsiOversold:   30,
  },
  ema_crossover: {
    name:          "ema_crossover",
    fastPeriod:    12,
    slowPeriod:    26,
    rsiPeriod:     14,
    rsiOverbought: 70,
    rsiOversold:   30,
  },
  macd: {
    name:          "macd",
    fastPeriod:    12,
    slowPeriod:    26,
    signalPeriod:  9,
    rsiPeriod:     14,
    rsiOverbought: 70,
    rsiOversold:   30,
  },
};

export const DEFAULT_POSITION_SIZING: PositionSizingConfig = {
  portfolioValue:  100_000,
  riskPctPerTrade: 0.02,
  stopLossPct:     0.02,
  takeProfitPct:   0.04,
  maxPositionPct:  0.05,
  minPositionSize: 1,
};

// ─── Pure math helpers ────────────────────────────────────────────────────────

/**
 * Simple Moving Average of the last `period` values in `prices`.
 * Returns null if there are fewer than `period` values.
 */
export function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/**
 * Exponential Moving Average.
 * Computes the full EMA series from scratch using the standard multiplier
 * k = 2 / (period + 1).  Returns null if fewer than `period` values.
 */
export function ema(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  // Seed with SMA of first `period` values
  let value = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    value = prices[i] * k + value * (1 - k);
  }
  return value;
}

/**
 * Full EMA series (one value per input price after the seed period).
 * Used internally to compute MACD signal line.
 */
export function emaSeries(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let value = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(value);
  for (let i = period; i < prices.length; i++) {
    value = prices[i] * k + value * (1 - k);
    result.push(value);
  }
  return result;
}

/**
 * Relative Strength Index.
 * Returns null if fewer than `period + 1` values (need at least one change).
 */
export function rsi(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const gains   = changes.map((c) => (c > 0 ? c : 0));
  const losses  = changes.map((c) => (c < 0 ? -c : 0));

  // Initial averages over first `period` changes
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * MACD line, signal line, and histogram.
 * Returns null if there are insufficient prices.
 */
export function macd(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macdLine: number; signalLine: number; histogram: number } | null {
  if (prices.length < slowPeriod + signalPeriod) return null;

  // Build MACD line series = fastEMA - slowEMA for each point after slowPeriod
  const fastSeries = emaSeries(prices, fastPeriod);
  const slowSeries = emaSeries(prices, slowPeriod);

  // Align: slowSeries starts at index slowPeriod-1 of prices,
  //        fastSeries starts at index fastPeriod-1 of prices.
  // The overlap starts at slowPeriod - fastPeriod into fastSeries.
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = slowSeries.map((s, i) => fastSeries[i + offset] - s);

  if (macdLine.length < signalPeriod) return null;

  const signalLineSeries = emaSeries(macdLine, signalPeriod);
  const latestMacd   = macdLine[macdLine.length - 1];
  const latestSignal = signalLineSeries[signalLineSeries.length - 1];

  return {
    macdLine:  latestMacd,
    signalLine: latestSignal,
    histogram: latestMacd - latestSignal,
  };
}

// ─── Position sizing ──────────────────────────────────────────────────────────

/**
 * Calculate position size using fixed-fractional risk management.
 *
 * Formula:
 *   riskAmount   = portfolioValue × riskPctPerTrade
 *   riskPerShare = entryPrice × stopLossPct
 *   rawSize      = riskAmount / riskPerShare
 *   maxSize      = (portfolioValue × maxPositionPct) / entryPrice
 *   size         = clamp(rawSize, minPositionSize, maxSize)
 *
 * Returns 0 if entryPrice ≤ 0 or portfolioValue ≤ 0.
 */
export function calculatePositionSize(
  entryPrice: number,
  config: PositionSizingConfig
): number {
  if (entryPrice <= 0 || config.portfolioValue <= 0) return 0;

  const riskAmount   = config.portfolioValue * config.riskPctPerTrade;
  const riskPerShare = entryPrice * config.stopLossPct;
  if (riskPerShare <= 0) return 0;

  const rawSize = riskAmount / riskPerShare;
  const maxSize = (config.portfolioValue * config.maxPositionPct) / entryPrice;

  const size = Math.min(rawSize, maxSize);
  return size < config.minPositionSize ? 0 : Math.floor(size);
}

/**
 * Derive stop-loss and take-profit prices from entry price and config.
 */
export function calculateExitPrices(
  entryPrice: number,
  action: SignalAction,
  config: PositionSizingConfig
): { stopLoss: number; takeProfit: number } {
  if (action === "BUY") {
    return {
      stopLoss:   parseFloat((entryPrice * (1 - config.stopLossPct)).toFixed(4)),
      takeProfit: parseFloat((entryPrice * (1 + config.takeProfitPct)).toFixed(4)),
    };
  }
  if (action === "SELL") {
    return {
      stopLoss:   parseFloat((entryPrice * (1 + config.stopLossPct)).toFixed(4)),
      takeProfit: parseFloat((entryPrice * (1 - config.takeProfitPct)).toFixed(4)),
    };
  }
  return { stopLoss: entryPrice, takeProfit: entryPrice };
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

/**
 * Compute a [0, 1] confidence score from the MA spread and RSI.
 *
 * Logic:
 *   • Base confidence comes from |maSpreadPct| normalised to a 2% spread = 1.0.
 *   • RSI penalty: if RSI is in the overbought zone on a BUY (or oversold on
 *     a SELL) the confidence is reduced by up to 0.3.
 *   • Result is clamped to [0.05, 0.95] to avoid false certainty.
 */
export function computeConfidence(
  maSpreadPct: number,
  action: SignalAction,
  rsiValue: number | null | undefined,
  config: StrategyConfig
): number {
  // Base: 2% spread maps to confidence 1.0
  const base = Math.min(Math.abs(maSpreadPct) / 2, 1);

  let rsiPenalty = 0;
  if (rsiValue != null) {
    if (action === "BUY"  && rsiValue > config.rsiOverbought) {
      rsiPenalty = 0.3 * ((rsiValue - config.rsiOverbought) / (100 - config.rsiOverbought));
    }
    if (action === "SELL" && rsiValue < config.rsiOversold) {
      rsiPenalty = 0.3 * ((config.rsiOversold - rsiValue) / config.rsiOversold);
    }
  }

  return Math.min(0.95, Math.max(0.05, base - rsiPenalty));
}

// ─── Strategy implementations ─────────────────────────────────────────────────

/**
 * SMA Crossover signal.
 *
 * Rules:
 *   BUY  — fast SMA crosses above slow SMA (fastMA > slowMA and previously ≤)
 *   SELL — fast SMA crosses below slow SMA (fastMA < slowMA and previously ≥)
 *   HOLD — no crossover
 *
 * RSI filter: suppresses BUY when RSI > overbought, SELL when RSI < oversold.
 */
export function smaCrossoverSignal(
  symbol: string,
  candles: CandleInput[],
  strategy: StrategyConfig = DEFAULT_STRATEGY_CONFIGS.sma_crossover,
  sizing: PositionSizingConfig = DEFAULT_POSITION_SIZING
): Signal {
  const closes = candles.map((c) => c.close);
  const last   = candles[candles.length - 1];
  const price  = last.close;
  const ts     = last.openTime;

  // Need at least slowPeriod + 1 candles to detect a crossover
  const fastNow  = sma(closes, strategy.fastPeriod);
  const slowNow  = sma(closes, strategy.slowPeriod);
  const fastPrev = sma(closes.slice(0, -1), strategy.fastPeriod);
  const slowPrev = sma(closes.slice(0, -1), strategy.slowPeriod);
  const rsiValue = rsi(closes, strategy.rsiPeriod);

  if (fastNow == null || slowNow == null || fastPrev == null || slowPrev == null) {
    return holdSignal(symbol, price, ts, "sma_crossover", "Insufficient data for SMA calculation",
      { fastMA: fastNow ?? 0, slowMA: slowNow ?? 0, maSpreadPct: 0, rsi: rsiValue ?? undefined });
  }

  const maSpreadPct = ((fastNow - slowNow) / slowNow) * 100;
  const indicators: IndicatorSnapshot = {
    fastMA: fastNow, slowMA: slowNow, maSpreadPct,
    rsi: rsiValue ?? undefined,
  };

  // Crossover detection
  const crossedAbove = fastPrev <= slowPrev && fastNow > slowNow;
  const crossedBelow = fastPrev >= slowPrev && fastNow < slowNow;

  // RSI filter
  const rsiBlocksBuy  = rsiValue != null && rsiValue > strategy.rsiOverbought;
  const rsiBlocksSell = rsiValue != null && rsiValue < strategy.rsiOversold;

  if (crossedAbove && !rsiBlocksBuy) {
    const action = "BUY";
    const confidence = computeConfidence(maSpreadPct, action, rsiValue, strategy);
    const { stopLoss, takeProfit } = calculateExitPrices(price, action, sizing);
    const positionSize = calculatePositionSize(price, sizing);
    return {
      symbol, action, confidence, positionSize, price, stopLoss, takeProfit,
      strategy: "sma_crossover",
      reason: `SMA${strategy.fastPeriod} (${fastNow.toFixed(2)}) crossed above SMA${strategy.slowPeriod} (${slowNow.toFixed(2)})`,
      indicators, timestamp: ts,
    };
  }

  if (crossedBelow && !rsiBlocksSell) {
    const action = "SELL";
    const confidence = computeConfidence(maSpreadPct, action, rsiValue, strategy);
    const { stopLoss, takeProfit } = calculateExitPrices(price, action, sizing);
    const positionSize = calculatePositionSize(price, sizing);
    return {
      symbol, action, confidence, positionSize, price, stopLoss, takeProfit,
      strategy: "sma_crossover",
      reason: `SMA${strategy.fastPeriod} (${fastNow.toFixed(2)}) crossed below SMA${strategy.slowPeriod} (${slowNow.toFixed(2)})`,
      indicators, timestamp: ts,
    };
  }

  const holdReason = crossedAbove
    ? `Bullish crossover suppressed by RSI overbought (${rsiValue?.toFixed(1)})`
    : crossedBelow
    ? `Bearish crossover suppressed by RSI oversold (${rsiValue?.toFixed(1)})`
    : fastNow > slowNow
    ? `Uptrend in progress — SMA${strategy.fastPeriod} above SMA${strategy.slowPeriod} (spread ${maSpreadPct.toFixed(2)}%)`
    : `Downtrend in progress — SMA${strategy.fastPeriod} below SMA${strategy.slowPeriod} (spread ${maSpreadPct.toFixed(2)}%)`;

  return holdSignal(symbol, price, ts, "sma_crossover", holdReason, indicators);
}

/**
 * EMA Crossover signal.
 * Identical logic to SMA crossover but uses exponential moving averages,
 * which react faster to recent price changes.
 */
export function emaCrossoverSignal(
  symbol: string,
  candles: CandleInput[],
  strategy: StrategyConfig = DEFAULT_STRATEGY_CONFIGS.ema_crossover,
  sizing: PositionSizingConfig = DEFAULT_POSITION_SIZING
): Signal {
  const closes = candles.map((c) => c.close);
  const last   = candles[candles.length - 1];
  const price  = last.close;
  const ts     = last.openTime;

  const fastNow  = ema(closes, strategy.fastPeriod);
  const slowNow  = ema(closes, strategy.slowPeriod);
  const fastPrev = ema(closes.slice(0, -1), strategy.fastPeriod);
  const slowPrev = ema(closes.slice(0, -1), strategy.slowPeriod);
  const rsiValue = rsi(closes, strategy.rsiPeriod);

  if (fastNow == null || slowNow == null || fastPrev == null || slowPrev == null) {
    return holdSignal(symbol, price, ts, "ema_crossover", "Insufficient data for EMA calculation",
      { fastMA: fastNow ?? 0, slowMA: slowNow ?? 0, maSpreadPct: 0, rsi: rsiValue ?? undefined });
  }

  const maSpreadPct = ((fastNow - slowNow) / slowNow) * 100;
  const indicators: IndicatorSnapshot = {
    fastMA: fastNow, slowMA: slowNow, maSpreadPct,
    rsi: rsiValue ?? undefined,
  };

  const crossedAbove = fastPrev <= slowPrev && fastNow > slowNow;
  const crossedBelow = fastPrev >= slowPrev && fastNow < slowNow;
  const rsiBlocksBuy  = rsiValue != null && rsiValue > strategy.rsiOverbought;
  const rsiBlocksSell = rsiValue != null && rsiValue < strategy.rsiOversold;

  if (crossedAbove && !rsiBlocksBuy) {
    const action = "BUY";
    const confidence = computeConfidence(maSpreadPct, action, rsiValue, strategy);
    const { stopLoss, takeProfit } = calculateExitPrices(price, action, sizing);
    const positionSize = calculatePositionSize(price, sizing);
    return {
      symbol, action, confidence, positionSize, price, stopLoss, takeProfit,
      strategy: "ema_crossover",
      reason: `EMA${strategy.fastPeriod} (${fastNow.toFixed(2)}) crossed above EMA${strategy.slowPeriod} (${slowNow.toFixed(2)})`,
      indicators, timestamp: ts,
    };
  }

  if (crossedBelow && !rsiBlocksSell) {
    const action = "SELL";
    const confidence = computeConfidence(maSpreadPct, action, rsiValue, strategy);
    const { stopLoss, takeProfit } = calculateExitPrices(price, action, sizing);
    const positionSize = calculatePositionSize(price, sizing);
    return {
      symbol, action, confidence, positionSize, price, stopLoss, takeProfit,
      strategy: "ema_crossover",
      reason: `EMA${strategy.fastPeriod} (${fastNow.toFixed(2)}) crossed below EMA${strategy.slowPeriod} (${slowNow.toFixed(2)})`,
      indicators, timestamp: ts,
    };
  }

  const holdReason = crossedAbove
    ? `Bullish EMA crossover suppressed by RSI overbought (${rsiValue?.toFixed(1)})`
    : crossedBelow
    ? `Bearish EMA crossover suppressed by RSI oversold (${rsiValue?.toFixed(1)})`
    : fastNow > slowNow
    ? `EMA uptrend — EMA${strategy.fastPeriod} above EMA${strategy.slowPeriod} (spread ${maSpreadPct.toFixed(2)}%)`
    : `EMA downtrend — EMA${strategy.fastPeriod} below EMA${strategy.slowPeriod} (spread ${maSpreadPct.toFixed(2)}%)`;

  return holdSignal(symbol, price, ts, "ema_crossover", holdReason, indicators);
}

/**
 * MACD Crossover signal.
 *
 * Rules:
 *   BUY  — MACD line crosses above signal line (histogram goes positive)
 *   SELL — MACD line crosses below signal line (histogram goes negative)
 *   HOLD — no crossover
 *
 * RSI filter applied as in SMA/EMA strategies.
 */
export function macdSignal(
  symbol: string,
  candles: CandleInput[],
  strategy: StrategyConfig = DEFAULT_STRATEGY_CONFIGS.macd,
  sizing: PositionSizingConfig = DEFAULT_POSITION_SIZING
): Signal {
  const closes = candles.map((c) => c.close);
  const last   = candles[candles.length - 1];
  const price  = last.close;
  const ts     = last.openTime;

  const signalPeriod = strategy.signalPeriod ?? 9;
  const macdNow  = macd(closes, strategy.fastPeriod, strategy.slowPeriod, signalPeriod);
  const macdPrev = macd(closes.slice(0, -1), strategy.fastPeriod, strategy.slowPeriod, signalPeriod);
  const rsiValue = rsi(closes, strategy.rsiPeriod);

  if (!macdNow || !macdPrev) {
    return holdSignal(symbol, price, ts, "macd", "Insufficient data for MACD calculation",
      { fastMA: 0, slowMA: 0, maSpreadPct: 0, rsi: rsiValue ?? undefined });
  }

  const maSpreadPct = (macdNow.macdLine / price) * 100; // normalise to price
  const indicators: IndicatorSnapshot = {
    fastMA:        macdNow.macdLine,
    slowMA:        macdNow.signalLine,
    maSpreadPct,
    rsi:           rsiValue ?? undefined,
    macdLine:      macdNow.macdLine,
    signalLine:    macdNow.signalLine,
    macdHistogram: macdNow.histogram,
  };

  const crossedAbove = macdPrev.histogram <= 0 && macdNow.histogram > 0;
  const crossedBelow = macdPrev.histogram >= 0 && macdNow.histogram < 0;
  const rsiBlocksBuy  = rsiValue != null && rsiValue > strategy.rsiOverbought;
  const rsiBlocksSell = rsiValue != null && rsiValue < strategy.rsiOversold;

  if (crossedAbove && !rsiBlocksBuy) {
    const action = "BUY";
    const confidence = computeConfidence(maSpreadPct, action, rsiValue, strategy);
    const { stopLoss, takeProfit } = calculateExitPrices(price, action, sizing);
    const positionSize = calculatePositionSize(price, sizing);
    return {
      symbol, action, confidence, positionSize, price, stopLoss, takeProfit,
      strategy: "macd",
      reason: `MACD (${macdNow.macdLine.toFixed(4)}) crossed above signal (${macdNow.signalLine.toFixed(4)}), histogram ${macdNow.histogram.toFixed(4)}`,
      indicators, timestamp: ts,
    };
  }

  if (crossedBelow && !rsiBlocksSell) {
    const action = "SELL";
    const confidence = computeConfidence(maSpreadPct, action, rsiValue, strategy);
    const { stopLoss, takeProfit } = calculateExitPrices(price, action, sizing);
    const positionSize = calculatePositionSize(price, sizing);
    return {
      symbol, action, confidence, positionSize, price, stopLoss, takeProfit,
      strategy: "macd",
      reason: `MACD (${macdNow.macdLine.toFixed(4)}) crossed below signal (${macdNow.signalLine.toFixed(4)}), histogram ${macdNow.histogram.toFixed(4)}`,
      indicators, timestamp: ts,
    };
  }

  const holdReason = `MACD histogram ${macdNow.histogram >= 0 ? "positive" : "negative"} (${macdNow.histogram.toFixed(4)}) — no crossover`;
  return holdSignal(symbol, price, ts, "macd", holdReason, indicators);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Generate a signal for a symbol using the specified strategy.
 * This is the primary entry point — pure function, no I/O.
 */
export function generateSignal(
  symbol: string,
  candles: CandleInput[],
  strategyName: StrategyName = "sma_crossover",
  strategyConfig?: Partial<StrategyConfig>,
  sizingConfig?: Partial<PositionSizingConfig>
): Signal {
  const strategy = { ...DEFAULT_STRATEGY_CONFIGS[strategyName], ...strategyConfig };
  const sizing   = { ...DEFAULT_POSITION_SIZING, ...sizingConfig };

  switch (strategyName) {
    case "sma_crossover": return smaCrossoverSignal(symbol, candles, strategy, sizing);
    case "ema_crossover": return emaCrossoverSignal(symbol, candles, strategy, sizing);
    case "macd":          return macdSignal(symbol, candles, strategy, sizing);
    default:              return smaCrossoverSignal(symbol, candles, strategy, sizing);
  }
}

/**
 * Generate signals for multiple symbols in one call.
 * Each symbol gets its own Signal object.  Pure function.
 */
export function batchSignals(
  symbolCandles: Array<{ symbol: string; candles: CandleInput[] }>,
  strategyName: StrategyName = "sma_crossover",
  strategyConfig?: Partial<StrategyConfig>,
  sizingConfig?: Partial<PositionSizingConfig>
): Signal[] {
  return symbolCandles.map(({ symbol, candles }) =>
    generateSignal(symbol, candles, strategyName, strategyConfig, sizingConfig)
  );
}

// ─── Strategy metadata ────────────────────────────────────────────────────────

export interface StrategyInfo {
  name: StrategyName;
  displayName: string;
  description: string;
  defaultConfig: StrategyConfig;
  minCandlesRequired: number;
  pros: string[];
  cons: string[];
}

export function getStrategyInfo(): StrategyInfo[] {
  return [
    {
      name:        "sma_crossover",
      displayName: "SMA Crossover",
      description: "Generates a BUY signal when the fast Simple Moving Average crosses above the slow SMA, and a SELL when it crosses below. An RSI filter suppresses signals in overbought/oversold conditions.",
      defaultConfig: DEFAULT_STRATEGY_CONFIGS.sma_crossover,
      minCandlesRequired: DEFAULT_STRATEGY_CONFIGS.sma_crossover.slowPeriod + 2,
      pros: ["Simple and well-understood", "Effective in trending markets", "Low false-signal rate on daily bars"],
      cons: ["Lags price action", "Whipsaws in sideways/choppy markets", "Equal weight to all prices in window"],
    },
    {
      name:        "ema_crossover",
      displayName: "EMA Crossover",
      description: "Same crossover logic as SMA but uses Exponential Moving Averages, which weight recent prices more heavily and react faster to momentum shifts.",
      defaultConfig: DEFAULT_STRATEGY_CONFIGS.ema_crossover,
      minCandlesRequired: DEFAULT_STRATEGY_CONFIGS.ema_crossover.slowPeriod + 2,
      pros: ["Faster reaction to price changes than SMA", "Reduces lag on reversals", "Standard in professional algo trading"],
      cons: ["More sensitive — higher whipsaw risk", "Requires more data to initialise than SMA"],
    },
    {
      name:        "macd",
      displayName: "MACD Crossover",
      description: "Uses the MACD line (EMA12 − EMA26) and its 9-period signal line. A BUY fires when the histogram turns positive (MACD crosses above signal); SELL when it turns negative.",
      defaultConfig: DEFAULT_STRATEGY_CONFIGS.macd,
      minCandlesRequired: DEFAULT_STRATEGY_CONFIGS.macd.slowPeriod + (DEFAULT_STRATEGY_CONFIGS.macd.signalPeriod ?? 9) + 2,
      pros: ["Captures both trend and momentum", "Histogram gives early divergence warnings", "Industry-standard indicator"],
      cons: ["Requires the most candles to initialise", "Can produce late signals in fast markets"],
    },
  ];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function holdSignal(
  symbol: string,
  price: number,
  timestamp: number,
  strategy: StrategyName,
  reason: string,
  indicators: IndicatorSnapshot
): Signal {
  return {
    symbol,
    action:       "HOLD",
    confidence:   0,
    positionSize: 0,
    price,
    stopLoss:     price,
    takeProfit:   price,
    strategy,
    reason,
    indicators,
    timestamp,
  };
}
