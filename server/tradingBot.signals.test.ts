/**
 * server/tradingBot.signals.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the signals module (server/tradingBot/signals.ts).
 *
 * All functions are pure — no mocks required.
 * Tests cover:
 *   1. Math helpers: sma, ema, emaSeries, rsi, macd
 *   2. Position sizing: calculatePositionSize, calculateExitPrices
 *   3. Confidence scoring: computeConfidence
 *   4. Strategy signals: smaCrossoverSignal, emaCrossoverSignal, macdSignal
 *   5. Dispatcher: generateSignal, batchSignals
 *   6. Metadata: getStrategyInfo
 */

import { describe, it, expect } from "vitest";
import {
  sma,
  ema,
  emaSeries,
  rsi,
  macd,
  calculatePositionSize,
  calculateExitPrices,
  computeConfidence,
  smaCrossoverSignal,
  emaCrossoverSignal,
  macdSignal,
  generateSignal,
  batchSignals,
  getStrategyInfo,
  DEFAULT_POSITION_SIZING,
  DEFAULT_STRATEGY_CONFIGS,
  type CandleInput,
  type PositionSizingConfig,
  type StrategyConfig,
} from "./tradingBot/signals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal CandleInput array from a close-price array. */
function candles(closes: number[]): CandleInput[] {
  return closes.map((close, i) => ({
    openTime: 1_700_000_000_000 + i * 86_400_000,
    close,
    high:   close * 1.01,
    low:    close * 0.99,
    volume: 1_000_000,
  }));
}

/**
 * Build a candle series that forces a golden cross on the LAST bar
 * WITHOUT triggering the RSI overbought filter.
 *
 * Uses an alternating +1/-1 base of 50 bars (RSI ~48) so the Wilder-smoothed
 * RSI is firmly in neutral territory, then adds 2 bars that force the crossover.
 */
function goldenCrossCandles(_fastPeriod: number, _slowPeriod: number): CandleInput[] {
  // Alternating series keeps RSI ~48 — well below the 70 overbought threshold
  const prices: number[] = [100];
  for (let i = 1; i < 50; i++) {
    prices.push(prices[i - 1] + (i % 2 === 0 ? 1 : -1));
  }
  // prev bar: dip so fastPrev < slowPrev
  prices.push(97);
  // last bar: recover so fastNow > slowNow (RSI ~59, well below 70)
  prices.push(103);
  return candles(prices);
}

/**
 * Build a candle series that forces a death cross on the LAST bar
 * WITHOUT triggering the RSI oversold filter.
 *
 * Same alternating base, then 2 bars that force fastPrev > slowPrev → fastNow < slowNow.
 * RSI lands ~37, well above the 30 oversold threshold.
 */
function deathCrossCandles(_fastPeriod: number, _slowPeriod: number): CandleInput[] {
  const prices: number[] = [100];
  for (let i = 1; i < 50; i++) {
    prices.push(prices[i - 1] + (i % 2 === 0 ? 1 : -1));
  }
  // prev bar: rise so fastPrev > slowPrev
  prices.push(103);
  // last bar: drop so fastNow < slowNow (RSI ~37, well above 30)
  prices.push(93);
  return candles(prices);
}

// ─── 1. sma ───────────────────────────────────────────────────────────────────

describe("sma", () => {
  it("returns null when fewer prices than period", () => {
    expect(sma([1, 2, 3], 5)).toBeNull();
  });

  it("returns exact average for a flat series", () => {
    expect(sma([10, 10, 10, 10, 10], 5)).toBe(10);
  });

  it("uses only the last `period` values", () => {
    // [1,2,3,4,5] — SMA(3) of last 3 = (3+4+5)/3 = 4
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4, 5);
  });

  it("returns a single value when period equals array length", () => {
    expect(sma([2, 4, 6], 3)).toBeCloseTo(4, 5);
  });

  it("handles period of 1 (returns last price)", () => {
    expect(sma([10, 20, 30], 1)).toBe(30);
  });
});

// ─── 2. ema ───────────────────────────────────────────────────────────────────

describe("ema", () => {
  it("returns null when fewer prices than period", () => {
    expect(ema([1, 2], 5)).toBeNull();
  });

  it("equals SMA when all prices are identical", () => {
    expect(ema([5, 5, 5, 5, 5], 5)).toBeCloseTo(5, 5);
  });

  it("is seeded from SMA of first period values", () => {
    // With exactly `period` prices the EMA seed = SMA = average
    const prices = [10, 20, 30, 40, 50];
    expect(ema(prices, 5)).toBeCloseTo(30, 5);
  });

  it("converges toward price in a flat tail", () => {
    // After many identical prices the EMA should be very close to that price
    const prices = [50, ...Array(40).fill(200)];
    const result = ema(prices, 10)!;
    expect(result).toBeGreaterThan(195);
  });

  it("returns a finite number for a normal series", () => {
    const prices = [100, 102, 98, 105, 103, 107, 110, 108, 112, 115];
    const result = ema(prices, 5);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!)).toBe(true);
  });
});

// ─── 3. emaSeries ─────────────────────────────────────────────────────────────

describe("emaSeries", () => {
  it("returns empty array when fewer prices than period", () => {
    expect(emaSeries([1, 2], 5)).toHaveLength(0);
  });

  it("returns length = prices.length - period + 1", () => {
    const result = emaSeries(Array(20).fill(100), 5);
    expect(result).toHaveLength(16); // 20 - 5 + 1
  });

  it("first value equals SMA of first `period` prices", () => {
    const prices = [10, 20, 30, 40, 50, 60];
    const series = emaSeries(prices, 3);
    // Seed = (10+20+30)/3 = 20
    expect(series[0]).toBeCloseTo(20, 5);
  });

  it("last value matches standalone ema()", () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const series = emaSeries(prices, 5);
    const standalone = ema(prices, 5)!;
    expect(series[series.length - 1]).toBeCloseTo(standalone, 8);
  });
});

// ─── 4. rsi ───────────────────────────────────────────────────────────────────

describe("rsi", () => {
  it("returns null when fewer than period+1 prices", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });

  it("returns 100 when all changes are gains (no losses)", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsi(prices, 14)).toBe(100);
  });

  it("returns 0 when all changes are losses (no gains)", () => {
    const prices = Array.from({ length: 20 }, (_, i) => 200 - i);
    expect(rsi(prices, 14)).toBeCloseTo(0, 1);
  });

  it("returns value in [0, 100]", () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
    const result = rsi(prices, 14)!;
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("returns ~50 for alternating up/down of equal magnitude", () => {
    const prices: number[] = [100];
    for (let i = 0; i < 30; i++) {
      prices.push(i % 2 === 0 ? prices[prices.length - 1] + 1 : prices[prices.length - 1] - 1);
    }
    const result = rsi(prices, 14)!;
    expect(result).toBeGreaterThan(40);
    expect(result).toBeLessThan(60);
  });
});

// ─── 5. macd ──────────────────────────────────────────────────────────────────

describe("macd", () => {
  it("returns null when insufficient data", () => {
    expect(macd(Array(10).fill(100), 12, 26, 9)).toBeNull();
  });

  it("returns an object with macdLine, signalLine, histogram", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    const result = macd(prices, 12, 26, 9);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("macdLine");
    expect(result).toHaveProperty("signalLine");
    expect(result).toHaveProperty("histogram");
  });

  it("histogram = macdLine - signalLine", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    const result = macd(prices, 12, 26, 9)!;
    expect(result.histogram).toBeCloseTo(result.macdLine - result.signalLine, 8);
  });

  it("macdLine is positive in a strong uptrend", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 50 + i * 3);
    const result = macd(prices, 12, 26, 9)!;
    expect(result.macdLine).toBeGreaterThan(0);
  });

  it("macdLine is negative in a strong downtrend", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 200 - i * 3);
    const result = macd(prices, 12, 26, 9)!;
    expect(result.macdLine).toBeLessThan(0);
  });
});

// ─── 6. calculatePositionSize ─────────────────────────────────────────────────

describe("calculatePositionSize", () => {
  const cfg: PositionSizingConfig = {
    portfolioValue:  100_000,
    riskPctPerTrade: 0.02,    // 2% = $2,000 at risk
    stopLossPct:     0.02,    // 2% stop
    takeProfitPct:   0.04,
    maxPositionPct:  0.05,    // max 5% = $5,000
    minPositionSize: 1,
  };

  it("returns 0 for zero entry price", () => {
    expect(calculatePositionSize(0, cfg)).toBe(0);
  });

  it("returns 0 for zero portfolio value", () => {
    expect(calculatePositionSize(100, { ...cfg, portfolioValue: 0 })).toBe(0);
  });

  it("caps at maxPositionPct when raw size exceeds it", () => {
    // $100 stock: rawSize = 2000/(100*0.02) = 1000, maxSize = 5000/100 = 50 → 50
    const size = calculatePositionSize(100, cfg);
    expect(size).toBe(50);
  });

  it("caps at maxPositionPct for high-priced stock", () => {
    // $1000 stock: rawSize = 2000/(1000*0.02) = 100, maxSize = 5000/1000 = 5 → 5
    const size = calculatePositionSize(1000, cfg);
    expect(size).toBe(5);
  });

  it("returns 0 when computed size is below minPositionSize", () => {
    // Very expensive stock: $50,000 — maxSize = 5000/50000 = 0.1 < 1
    const size = calculatePositionSize(50_000, cfg);
    expect(size).toBe(0);
  });

  it("floors to integer (no fractional shares)", () => {
    // $150 stock: rawSize = 2000/(150*0.02) = 666.67, maxSize = 5000/150 = 33.33 → 33
    const size = calculatePositionSize(150, cfg);
    expect(size).toBe(33);
    expect(Number.isInteger(size)).toBe(true);
  });
});

// ─── 7. calculateExitPrices ───────────────────────────────────────────────────

describe("calculateExitPrices", () => {
  const cfg = DEFAULT_POSITION_SIZING; // stopLoss 2%, takeProfit 4%

  it("BUY: stopLoss below entry, takeProfit above", () => {
    const { stopLoss, takeProfit } = calculateExitPrices(100, "BUY", cfg);
    expect(stopLoss).toBeCloseTo(98, 2);
    expect(takeProfit).toBeCloseTo(104, 2);
  });

  it("SELL: stopLoss above entry, takeProfit below", () => {
    const { stopLoss, takeProfit } = calculateExitPrices(100, "SELL", cfg);
    expect(stopLoss).toBeCloseTo(102, 2);
    expect(takeProfit).toBeCloseTo(96, 2);
  });

  it("HOLD: both equal entry price", () => {
    const { stopLoss, takeProfit } = calculateExitPrices(100, "HOLD", cfg);
    expect(stopLoss).toBe(100);
    expect(takeProfit).toBe(100);
  });
});

// ─── 8. computeConfidence ─────────────────────────────────────────────────────

describe("computeConfidence", () => {
  const cfg = DEFAULT_STRATEGY_CONFIGS.sma_crossover; // overbought=70, oversold=30

  it("returns value in [0.05, 0.95]", () => {
    for (const spread of [-5, -1, 0, 1, 5]) {
      const c = computeConfidence(spread, "BUY", 50, cfg);
      expect(c).toBeGreaterThanOrEqual(0.05);
      expect(c).toBeLessThanOrEqual(0.95);
    }
  });

  it("higher spread → higher base confidence", () => {
    const low  = computeConfidence(0.5, "BUY", 50, cfg);
    const high = computeConfidence(2.0, "BUY", 50, cfg);
    expect(high).toBeGreaterThan(low);
  });

  it("RSI overbought reduces BUY confidence", () => {
    const normal     = computeConfidence(1.5, "BUY", 50, cfg);
    const overbought = computeConfidence(1.5, "BUY", 85, cfg);
    expect(overbought).toBeLessThan(normal);
  });

  it("RSI oversold reduces SELL confidence", () => {
    const normal   = computeConfidence(1.5, "SELL", 50, cfg);
    const oversold = computeConfidence(1.5, "SELL", 15, cfg);
    expect(oversold).toBeLessThan(normal);
  });

  it("RSI does not penalise HOLD", () => {
    const c1 = computeConfidence(1, "HOLD", 90, cfg);
    const c2 = computeConfidence(1, "HOLD", 10, cfg);
    expect(c1).toBeCloseTo(c2, 5);
  });

  it("null RSI applies no penalty", () => {
    const withRsi    = computeConfidence(1, "BUY", 50, cfg);
    const withoutRsi = computeConfidence(1, "BUY", null, cfg);
    expect(withoutRsi).toBeCloseTo(withRsi, 5);
  });
});

// ─── 9. smaCrossoverSignal ────────────────────────────────────────────────────

describe("smaCrossoverSignal", () => {
  const cfg = DEFAULT_STRATEGY_CONFIGS.sma_crossover; // fast=9, slow=21

  it("returns HOLD with reason when insufficient data", () => {
    const result = smaCrossoverSignal("AAPL", candles([100, 101, 102]));
    expect(result.action).toBe("HOLD");
    expect(result.reason).toMatch(/Insufficient/i);
    expect(result.positionSize).toBe(0);
  });

  it("returns BUY on a golden cross (fast crosses above slow on last bar)", () => {
    const c = goldenCrossCandles(cfg.fastPeriod, cfg.slowPeriod);
    const result = smaCrossoverSignal("AAPL", c);
    expect(result.action).toBe("BUY");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.positionSize).toBeGreaterThanOrEqual(1);
    expect(result.stopLoss).toBeLessThan(result.price);
    expect(result.takeProfit).toBeGreaterThan(result.price);
    expect(result.strategy).toBe("sma_crossover");
  });

  it("returns SELL on a death cross (fast crosses below slow on last bar)", () => {
    const c = deathCrossCandles(cfg.fastPeriod, cfg.slowPeriod);
    const result = smaCrossoverSignal("AAPL", c);
    expect(result.action).toBe("SELL");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.stopLoss).toBeGreaterThan(result.price);
    expect(result.takeProfit).toBeLessThan(result.price);
  });

  it("returns HOLD when no crossover on last bar (steady uptrend throughout)", () => {
    // Monotonically rising — fast always above slow, no crossover event
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i);
    const c = candles(prices);
    const result = smaCrossoverSignal("AAPL", c);
    expect(result.action).toBe("HOLD");
  });

  it("BUY signal: fastMA > slowMA in indicators", () => {
    const c = goldenCrossCandles(cfg.fastPeriod, cfg.slowPeriod);
    const result = smaCrossoverSignal("AAPL", c);
    if (result.action === "BUY") {
      expect(result.indicators.fastMA).toBeGreaterThan(result.indicators.slowMA);
    }
  });

  it("returns correct symbol in output", () => {
    const c = candles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const result = smaCrossoverSignal("NVDA", c);
    expect(result.symbol).toBe("NVDA");
  });

  it("timestamp matches last candle openTime", () => {
    const c = candles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const result = smaCrossoverSignal("AAPL", c);
    expect(result.timestamp).toBe(c[c.length - 1].openTime);
  });

  it("HOLD signal has confidence 0 and stop/take equal to price", () => {
    const c = candles([100, 101, 102]); // insufficient data → HOLD
    const result = smaCrossoverSignal("AAPL", c);
    expect(result.confidence).toBe(0);
    expect(result.stopLoss).toBe(result.price);
    expect(result.takeProfit).toBe(result.price);
  });
});

// ─── 10. emaCrossoverSignal ───────────────────────────────────────────────────

describe("emaCrossoverSignal", () => {
  const cfg = DEFAULT_STRATEGY_CONFIGS.ema_crossover; // fast=12, slow=26

  it("returns HOLD with reason when insufficient data", () => {
    const result = emaCrossoverSignal("AAPL", candles([100, 101]));
    expect(result.action).toBe("HOLD");
    expect(result.reason).toMatch(/Insufficient/i);
  });

  it("returns BUY on a golden EMA cross", () => {
    const c = goldenCrossCandles(cfg.fastPeriod, cfg.slowPeriod);
    const result = emaCrossoverSignal("AAPL", c);
    expect(result.action).toBe("BUY");
    expect(result.strategy).toBe("ema_crossover");
    expect(result.positionSize).toBeGreaterThanOrEqual(1);
  });

  it("returns SELL on a death EMA cross", () => {
    const c = deathCrossCandles(cfg.fastPeriod, cfg.slowPeriod);
    const result = emaCrossoverSignal("AAPL", c);
    expect(result.action).toBe("SELL");
  });

  it("HOLD signal has positionSize 0", () => {
    const c = candles([100, 101]); // insufficient
    const result = emaCrossoverSignal("AAPL", c);
    expect(result.positionSize).toBe(0);
  });

  it("BUY exit prices are correctly oriented", () => {
    const c = goldenCrossCandles(cfg.fastPeriod, cfg.slowPeriod);
    const result = emaCrossoverSignal("AAPL", c);
    if (result.action === "BUY") {
      expect(result.stopLoss).toBeLessThan(result.price);
      expect(result.takeProfit).toBeGreaterThan(result.price);
    }
  });
});

// ─── 11. macdSignal ───────────────────────────────────────────────────────────

describe("macdSignal", () => {
  it("returns HOLD with reason when insufficient data", () => {
    const result = macdSignal("AAPL", candles(Array(10).fill(100)));
    expect(result.action).toBe("HOLD");
    expect(result.reason).toMatch(/Insufficient/i);
  });

  it("populates macdLine, signalLine, macdHistogram in indicators when data is sufficient", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    const result = macdSignal("AAPL", candles(prices));
    // Even if HOLD, indicators should be populated (non-zero for a trend)
    expect(result.indicators).toHaveProperty("macdLine");
    expect(result.indicators).toHaveProperty("signalLine");
    expect(result.indicators).toHaveProperty("macdHistogram");
  });

  it("strategy field is 'macd'", () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
    const result = macdSignal("AAPL", candles(prices));
    expect(result.strategy).toBe("macd");
  });

  it("returns BUY or HOLD (never SELL) on a strong uptrend", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 50 + i * 2);
    const result = macdSignal("AAPL", candles(prices));
    expect(["BUY", "HOLD"]).toContain(result.action);
  });

  it("returns SELL or HOLD (never BUY) on a strong downtrend", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 200 - i * 2);
    const result = macdSignal("AAPL", candles(prices));
    expect(["SELL", "HOLD"]).toContain(result.action);
  });

  it("BUY exit prices are correctly oriented when action is BUY", () => {
    // V-shape: down then sharp recovery to force histogram crossover
    const down = Array.from({ length: 30 }, (_, i) => 200 - i * 3);
    const up   = Array.from({ length: 30 }, (_, i) => 110 + i * 4);
    const result = macdSignal("AAPL", candles([...down, ...up]));
    if (result.action === "BUY") {
      expect(result.stopLoss).toBeLessThan(result.price);
      expect(result.takeProfit).toBeGreaterThan(result.price);
    }
  });
});

// ─── 12. generateSignal (dispatcher) ─────────────────────────────────────────

describe("generateSignal", () => {
  it("dispatches to smaCrossoverSignal by default", () => {
    const c = candles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const result = generateSignal("AAPL", c);
    expect(result.strategy).toBe("sma_crossover");
  });

  it("dispatches to emaCrossoverSignal", () => {
    const c = candles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const result = generateSignal("AAPL", c, "ema_crossover");
    expect(result.strategy).toBe("ema_crossover");
  });

  it("dispatches to macdSignal", () => {
    const c = candles(Array.from({ length: 50 }, (_, i) => 100 + i));
    const result = generateSignal("AAPL", c, "macd");
    expect(result.strategy).toBe("macd");
  });

  it("passes strategyConfig overrides — custom rsiOverbought allows BUY through", () => {
    // Use the standard crossover candles (designed for fast=9, slow=21)
    // Override rsiOverbought to 99 so the RSI filter never blocks the BUY
    const c = goldenCrossCandles(9, 21);
    const result = generateSignal("AAPL", c, "sma_crossover", { rsiOverbought: 99 });
    expect(result.action).toBe("BUY");
  });

  it("passes sizingConfig overrides — larger portfolio → larger or equal position", () => {
    const c = goldenCrossCandles(
      DEFAULT_STRATEGY_CONFIGS.sma_crossover.fastPeriod,
      DEFAULT_STRATEGY_CONFIGS.sma_crossover.slowPeriod
    );
    const base   = generateSignal("AAPL", c, "sma_crossover", {}, { portfolioValue: 100_000 });
    const bigger = generateSignal("AAPL", c, "sma_crossover", {}, { portfolioValue: 200_000 });
    if (base.action === "BUY" && bigger.action === "BUY") {
      expect(bigger.positionSize).toBeGreaterThanOrEqual(base.positionSize);
    }
  });

  it("always returns a Signal with all required fields", () => {
    const c = candles([100, 101, 102]);
    const result = generateSignal("TEST", c);
    expect(result).toMatchObject({
      symbol:       "TEST",
      action:       expect.stringMatching(/^(BUY|SELL|HOLD)$/),
      confidence:   expect.any(Number),
      positionSize: expect.any(Number),
      price:        expect.any(Number),
      stopLoss:     expect.any(Number),
      takeProfit:   expect.any(Number),
      strategy:     expect.any(String),
      reason:       expect.any(String),
      indicators:   expect.any(Object),
      timestamp:    expect.any(Number),
    });
  });
});

// ─── 13. batchSignals ─────────────────────────────────────────────────────────

describe("batchSignals", () => {
  it("returns one signal per input symbol", () => {
    const input = [
      { symbol: "AAPL", candles: candles(Array.from({ length: 30 }, (_, i) => 100 + i)) },
      { symbol: "MSFT", candles: candles(Array.from({ length: 30 }, (_, i) => 200 + i)) },
      { symbol: "TSLA", candles: candles(Array.from({ length: 30 }, (_, i) => 300 - i)) },
    ];
    const results = batchSignals(input);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.symbol)).toEqual(["AAPL", "MSFT", "TSLA"]);
  });

  it("each result has the correct symbol", () => {
    const symbols = ["AAPL", "NVDA", "SPY"];
    const input = symbols.map((symbol) => ({
      symbol,
      candles: candles(Array.from({ length: 30 }, (_, i) => 100 + i)),
    }));
    const results = batchSignals(input);
    results.forEach((r, i) => expect(r.symbol).toBe(symbols[i]));
  });

  it("handles empty input array", () => {
    expect(batchSignals([])).toHaveLength(0);
  });

  it("uses the specified strategy for all symbols", () => {
    const input = [
      { symbol: "AAPL", candles: candles(Array.from({ length: 50 }, (_, i) => 100 + i)) },
      { symbol: "MSFT", candles: candles(Array.from({ length: 50 }, (_, i) => 200 + i)) },
    ];
    const results = batchSignals(input, "macd");
    results.forEach((r) => expect(r.strategy).toBe("macd"));
  });
});

// ─── 14. getStrategyInfo ──────────────────────────────────────────────────────

describe("getStrategyInfo", () => {
  it("returns exactly 3 strategies", () => {
    expect(getStrategyInfo()).toHaveLength(3);
  });

  it("includes sma_crossover, ema_crossover, and macd", () => {
    const names = getStrategyInfo().map((s) => s.name);
    expect(names).toContain("sma_crossover");
    expect(names).toContain("ema_crossover");
    expect(names).toContain("macd");
  });

  it("each strategy has required fields", () => {
    getStrategyInfo().forEach((s) => {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("displayName");
      expect(s).toHaveProperty("description");
      expect(s).toHaveProperty("defaultConfig");
      expect(s).toHaveProperty("minCandlesRequired");
      expect(s).toHaveProperty("pros");
      expect(s).toHaveProperty("cons");
      expect(s.pros.length).toBeGreaterThan(0);
      expect(s.cons.length).toBeGreaterThan(0);
    });
  });

  it("minCandlesRequired is greater than slowPeriod for all strategies", () => {
    getStrategyInfo().forEach((s) => {
      expect(s.minCandlesRequired).toBeGreaterThan(s.defaultConfig.slowPeriod);
    });
  });

  it("returns a fresh outer array each call (mutations do not persist)", () => {
    const r1 = getStrategyInfo();
    const len = r1.length;
    (r1 as unknown[]).push({ fake: true });
    const r2 = getStrategyInfo();
    expect(r2).toHaveLength(len); // original length, not len+1
  });
});
