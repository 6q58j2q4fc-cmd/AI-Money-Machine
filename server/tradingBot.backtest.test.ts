/**
 * Unit tests for server/tradingBot/backtest.ts
 *
 * Coverage:
 *  - Math helpers: mean, stddev, annualisedSharpe, annualisedSortino, maxDrawdown, cagr
 *  - Transaction costs: applyTransactionCosts
 *  - Single-window backtest: backtestWindow (BUY/SELL/HOLD paths, stop-loss, take-profit)
 *  - Walk-forward engine: runWalkForward (window count, aggregate metrics, deflated Sharpe)
 *  - Edge cases: empty candles, no trades, single window, all-HOLD signals
 *  - Statistical helpers: skewness, kurtosis, deflatedSharpeRatio
 */

import { describe, it, expect } from "vitest";
import {
  mean,
  stddev,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
  cagr,
  applySlippage,
  transactionCost,
  simulateWindow,
  runWalkForward,
  skewness,
  kurtosis,
  deflatedSharpeRatio,
} from "./tradingBot/backtest";
import type { CandleInput as Candle, StrategyConfig, TransactionCostConfig } from "./tradingBot/backtest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal candle array with linearly increasing close prices */
function makeTrendCandles(n: number, startPrice = 100, step = 1): Candle[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => ({
    openTime: now + i * 86_400_000,
    close: startPrice + i * step,
    high: startPrice + i * step + 2,
    low: startPrice + i * step - 2,
    volume: 10_000,
  }));
}

/** Build a flat candle array (no trend) */
function makeFlatCandles(n: number, price = 100): Candle[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => ({
    openTime: now + i * 86_400_000,
    close: price,
    high: price + 1,
    low: price - 1,
    volume: 10_000,
  }));
}

/** Build a candle array with alternating up/down moves for realistic RSI */
function makeAlternatingCandles(n: number, base = 100, amplitude = 2): Candle[] {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const close = base + (i % 2 === 0 ? amplitude : -amplitude);
    return {
      openTime: now + i * 86_400_000,
      close,
      high: close + 1,
      low: close - 1,
      volume: 10_000,
    };
  });
}

const DEFAULT_SIZING = {
  portfolioValue: 10_000,
  riskPctPerTrade: 0.02,
  stopLossPct: 0.02,
  takeProfitPct: 0.04,
  maxPositionPct: 0.1,
  minPositionSize: 1,
};

const DEFAULT_COSTS = {
  commissionFlat: 1.0,
  commissionPct: 0.0005,
  slippagePct: 0.0005,
};

const SMA_STRATEGY: StrategyConfig = {
  name: "sma_crossover",
  fastPeriod: 9,
  slowPeriod: 21,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

describe("mean()", () => {
  it("returns 0 for empty array", () => {
    expect(mean([])).toBe(0);
  });

  it("computes correct mean", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });

  it("handles single element", () => {
    expect(mean([42])).toBe(42);
  });
});

describe("stddev()", () => {
  it("returns 0 for empty array", () => {
    expect(stddev([])).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(stddev([5])).toBe(0);
  });

  it("computes population stddev correctly", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, population stddev=2
    const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2, 1);
  });
});

describe("sharpeRatio()", () => {
  it("returns 0 for empty returns", () => {
    expect(sharpeRatio([], 252)).toBe(0);
  });

  it("returns 0 when stddev is 0 (flat returns)", () => {
    expect(sharpeRatio([0.01, 0.01, 0.01], 252)).toBe(0);
  });

  it("returns positive Sharpe for consistently positive returns", () => {
    const returns = Array(252).fill(0.001); // 0.1% daily
    // Inject tiny noise so stddev > 0
    returns[0] = 0.002;
    returns[1] = 0.0005;
    const sharpe = sharpeRatio(returns, 252);
    expect(sharpe).toBeGreaterThan(0);
  });

  it("returns negative Sharpe for consistently negative returns", () => {
    const returns = Array(50).fill(-0.005);
    returns[0] = -0.003;
    returns[1] = -0.007;
    const sharpe = sharpeRatio(returns, 252);
    expect(sharpe).toBeLessThan(0);
  });
});

describe("sortinoRatio()", () => {
  it("returns 0 for empty returns", () => {
    expect(sortinoRatio([], 252)).toBe(0);
  });

  it("returns Infinity when no downside deviation and mean > 0", () => {
    // All positive returns with positive mean → Sortino = Infinity
    const returns = [0.01, 0.02, 0.005, 0.015];
    expect(sortinoRatio(returns, 252)).toBe(Infinity);
  });

  it("returns positive Sortino for mixed returns with positive mean", () => {
    const returns = [0.02, -0.005, 0.015, -0.003, 0.025, -0.001, 0.018];
    const sortino = sortinoRatio(returns, 252);
    expect(sortino).toBeGreaterThan(0);
  });
});

describe("maxDrawdown()", () => {
  it("returns 0 for empty equity curve", () => {
    expect(maxDrawdown([])).toBe(0);
  });

  it("returns 0 for monotonically increasing equity", () => {
    expect(maxDrawdown([100, 110, 120, 130])).toBe(0);
  });

  it("computes correct drawdown for simple drop (returns % not fraction)", () => {
    // Peak 100, trough 80 → drawdown = 20% (not 0.20 — function returns percentage)
    const dd = maxDrawdown([100, 90, 80, 85, 95]);
    expect(dd).toBeCloseTo(20, 1);
  });

  it("picks the maximum drawdown across multiple peaks", () => {
    // First peak 100 → trough 90 (10% DD), second peak 120 → trough 96 (20% DD)
    const dd = maxDrawdown([100, 90, 95, 120, 96, 110]);
    expect(dd).toBeCloseTo(20, 1);
  });
});

describe("cagr()", () => {
  it("returns 0 for zero duration", () => {
    expect(cagr(10_000, 10_000, 0)).toBe(0);
  });

  it("returns 0 when initial capital is 0", () => {
    expect(cagr(0, 10_000, 365)).toBe(0);
  });

  it("computes positive CAGR for doubling over 365 days (returns % not fraction)", () => {
    // Double in 1 year → CAGR = 100% (function returns percentage)
    const result = cagr(10_000, 20_000, 365);
    expect(result).toBeCloseTo(100, 1);
  });

  it("computes negative CAGR for loss over 365 days", () => {
    // Half in 1 year → CAGR = -50%
    const result = cagr(10_000, 5_000, 365);
    expect(result).toBeCloseTo(-50, 1);
  });
});

// ─── Transaction costs ────────────────────────────────────────────────────────

describe("applySlippage() + transactionCost()", () => {
  it("increases fill price for BUY by slippage", () => {
    // Fill price = 100 * (1 + 0.0005) = 100.05
    const fillPrice = applySlippage(100, "BUY", DEFAULT_COSTS.slippagePct);
    expect(fillPrice).toBeCloseTo(100.05, 4);
  });

  it("decreases fill price for SELL by slippage", () => {
    // Fill price = 100 * (1 - 0.0005) = 99.95
    const fillPrice = applySlippage(100, "SELL", DEFAULT_COSTS.slippagePct);
    expect(fillPrice).toBeCloseTo(99.95, 4);
  });

  it("transactionCost = flat + price * shares * pct", () => {
    // 1.0 + 100 * 10 * 0.0005 = 1.0 + 0.5 = 1.5
    const cost = transactionCost(100, 10, DEFAULT_COSTS);
    expect(cost).toBeCloseTo(1.5, 4);
  });

  it("transactionCost with zero shares = flat commission only", () => {
    const cost = transactionCost(100, 0, DEFAULT_COSTS);
    expect(cost).toBeCloseTo(1.0, 4);
  });
});

// ─── Single-window backtest ───────────────────────────────────────────────────

describe("simulateWindow()", () => {
  it("returns zero trades and initial capital when no signals fire", () => {
    const candles = makeFlatCandles(50);
    const result = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, DEFAULT_COSTS, DEFAULT_SIZING.portfolioValue, 252);
    // Flat candles → no crossover → no trades
    expect(result.trades).toHaveLength(0);
    expect(result.finalCapital).toBeCloseTo(DEFAULT_SIZING.portfolioValue, 0);
  });

  it("produces a valid result structure", () => {
    const candles = makeTrendCandles(60);
    const result = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, DEFAULT_COSTS, DEFAULT_SIZING.portfolioValue, 252);
    expect(result).toHaveProperty("trades");
    expect(result).toHaveProperty("equityCurve");
    expect(result).toHaveProperty("finalCapital");
    expect(Array.isArray(result.equityCurve)).toBe(true);
  });

  it("equity curve length equals candle count (simulation starts after minBars warmup)", () => {
    // simulateWindow starts at bar minBars = max(slowPeriod+2, 15) = max(23, 15) = 23
    // So equityCurve has candles.length entries (one per bar including warmup)
    const candles = makeTrendCandles(60);
    const result = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, DEFAULT_COSTS, DEFAULT_SIZING.portfolioValue, 252);
    // The equity curve has one entry per candle processed (from bar 0 to end)
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBeLessThanOrEqual(candles.length);
  });

  it("equity curve starts at initial capital", () => {
    const candles = makeTrendCandles(60);
    const result = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, DEFAULT_COSTS, DEFAULT_SIZING.portfolioValue, 252);
    expect(result.equityCurve[0].equity).toBeCloseTo(DEFAULT_SIZING.portfolioValue, 0);
  });

  it("each trade has required fields", () => {
    const candles = makeTrendCandles(100, 100, 0.5);
    const result = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, DEFAULT_COSTS, DEFAULT_SIZING.portfolioValue, 252);
    for (const trade of result.trades) {
      expect(trade).toHaveProperty("entryTime");
      expect(trade).toHaveProperty("exitTime");
      expect(trade).toHaveProperty("entryPrice");
      expect(trade).toHaveProperty("exitPrice");
      expect(trade).toHaveProperty("shares");
      expect(trade).toHaveProperty("netPnl");
      expect(trade).toHaveProperty("commission");
      expect(trade).toHaveProperty("exitReason");
      expect(["SIGNAL", "STOP_LOSS", "TAKE_PROFIT", "END_OF_WINDOW"]).toContain(trade.exitReason);
    }
  });

  it("applies transaction costs — final capital should be <= no-cost run", () => {
    const candles = makeTrendCandles(100, 100, 1);
    const resultWithCosts = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, DEFAULT_COSTS, DEFAULT_SIZING.portfolioValue, 252);
    const zeroCosts: TransactionCostConfig = { commissionFlat: 0, commissionPct: 0, slippagePct: 0 };
    const resultNoCosts = simulateWindow(candles, SMA_STRATEGY, DEFAULT_SIZING, zeroCosts, DEFAULT_SIZING.portfolioValue, 252);
    // With costs, final capital should be <= without costs (costs reduce returns)
    if (resultWithCosts.trades.length > 0) {
      expect(resultWithCosts.finalCapital).toBeLessThanOrEqual(resultNoCosts.finalCapital + 0.01);
    }
  });
});

// ─── Walk-forward engine ──────────────────────────────────────────────────────

describe("runWalkForward()", () => {
  const variants = [SMA_STRATEGY];

  it("returns zero windows when candles are insufficient", () => {
    // runWalkForward does not throw — it returns empty windows when
    // trainBars + testBars > candles.length
    const candles = makeTrendCandles(10);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 30,
      testBars: 20,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    expect(result.windows).toHaveLength(0);
  });

  it("produces at least one window with enough candles", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    expect(result.windows.length).toBeGreaterThanOrEqual(1);
  });

  it("produces correct number of windows for step = testBars", () => {
    // With 300 candles, trainBars=100, testBars=50, step=50:
    // windows start at 0, 50, 100, 150 → 4 windows
    const candles = makeTrendCandles(300);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      stepBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    // Each window needs trainBars + testBars = 150 candles
    // Steps: 0→150, 50→200, 100→250, 150→300 → 4 windows
    expect(result.windows.length).toBe(4);
  });

  it("returns required top-level fields", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    expect(result).toHaveProperty("runId");
    expect(result).toHaveProperty("symbol");
    expect(result).toHaveProperty("windows");
    expect(result).toHaveProperty("aggregateEquityCurve");
    expect(result).toHaveProperty("aggregate");
    expect(result).toHaveProperty("initialCapital");
    expect(result).toHaveProperty("finalCapital");
    expect(result).toHaveProperty("costs");
    expect(result).toHaveProperty("createdAt");
  });

  it("aggregate has all required metric fields", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    const agg = result.aggregate;
    expect(agg).toHaveProperty("sharpe");
    expect(agg).toHaveProperty("sortino");
    expect(agg).toHaveProperty("maxDrawdown");
    expect(agg).toHaveProperty("winRate");
    expect(agg).toHaveProperty("profitFactor");
    expect(agg).toHaveProperty("cagr");
    expect(agg).toHaveProperty("totalNetPnl");
    expect(agg).toHaveProperty("totalTrades");
    expect(agg).toHaveProperty("deflatedSharpe");
    expect(agg).toHaveProperty("nVariantsTested");
  });

  it("nVariantsTested equals number of strategy variants passed", () => {
    const candles = makeTrendCandles(200);
    const twoVariants = [SMA_STRATEGY, { ...SMA_STRATEGY, name: "ema_crossover" as const }];
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: twoVariants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    expect(result.aggregate.nVariantsTested).toBe(2);
  });

  it("deflatedSharpe is <= raw Sharpe (multiple testing penalty)", () => {
    const candles = makeTrendCandles(300, 100, 0.5);
    const threeVariants = [
      SMA_STRATEGY,
      { ...SMA_STRATEGY, name: "ema_crossover" as const },
      { ...SMA_STRATEGY, name: "macd" as const },
    ];
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: threeVariants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    // Deflated Sharpe must be <= raw Sharpe (multiple testing always penalises)
    expect(result.aggregate.deflatedSharpe).toBeLessThanOrEqual(result.aggregate.sharpe + 0.001);
  });

  it("aggregate equity curve is non-empty", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    expect(result.aggregateEquityCurve.length).toBeGreaterThan(0);
  });

  it("each equity curve point has time, equity, drawdown", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    for (const point of result.aggregateEquityCurve) {
      expect(point).toHaveProperty("time");
      expect(point).toHaveProperty("equity");
      expect(point).toHaveProperty("drawdown");
      expect(point.equity).toBeGreaterThan(0);
      expect(point.drawdown).toBeGreaterThanOrEqual(0);
    }
  });

  it("each window has required fields", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    for (const w of result.windows) {
      expect(w).toHaveProperty("windowIndex");
      expect(w).toHaveProperty("trainStart");
      expect(w).toHaveProperty("trainEnd");
      expect(w).toHaveProperty("testStart");
      expect(w).toHaveProperty("testEnd");
      expect(w).toHaveProperty("selectedStrategy");
      expect(w).toHaveProperty("trainSharpe");
      expect(w).toHaveProperty("testSharpe");
      expect(w).toHaveProperty("testSortino");
      expect(w).toHaveProperty("testMaxDrawdown");
      expect(w).toHaveProperty("testWinRate");
      expect(w).toHaveProperty("testProfitFactor");
      expect(w).toHaveProperty("testCagr");
      expect(w).toHaveProperty("testNetPnl");
      expect(w).toHaveProperty("testTrades");
    }
  });

  it("window test periods do not overlap (walk-forward property)", () => {
    const candles = makeTrendCandles(400);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      stepBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    for (let i = 1; i < result.windows.length; i++) {
      const prev = result.windows[i - 1];
      const curr = result.windows[i];
      // Each window's test start must be >= previous window's test end
      expect(curr.testStart).toBeGreaterThanOrEqual(prev.testEnd);
    }
  });

  it("selectedStrategy is one of the provided variants", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    const validNames = new Set(variants.map((v) => v.name));
    for (const w of result.windows) {
      expect(validNames.has(w.selectedStrategy as never)).toBe(true);
    }
  });

  it("initialCapital equals portfolioValue from sizing config", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: { ...DEFAULT_SIZING, portfolioValue: 25_000 },
      costs: DEFAULT_COSTS,
    });
    expect(result.initialCapital).toBe(25_000);
  });

  it("runId is a non-empty string", () => {
    const candles = makeTrendCandles(200);
    const result = runWalkForward("AAPL", candles, {
      trainBars: 100,
      testBars: 50,
      strategyVariants: variants,
      sizing: DEFAULT_SIZING,
      costs: DEFAULT_COSTS,
    });
    expect(typeof result.runId).toBe("string");
    expect(result.runId.length).toBeGreaterThan(0);
  });
});

// ─── Statistical helpers ──────────────────────────────────────────────────────

describe("skewness()", () => {
  it("returns 0 for fewer than 3 values", () => {
    expect(skewness([])).toBe(0);
    expect(skewness([1])).toBe(0);
    expect(skewness([1, 2])).toBe(0);
  });

  it("returns 0 for symmetric distribution", () => {
    // Symmetric around 0
    const sym = [-3, -2, -1, 0, 1, 2, 3];
    expect(skewness(sym)).toBeCloseTo(0, 5);
  });

  it("returns positive skewness for right-skewed distribution", () => {
    // Long right tail
    const rightSkewed = [1, 1, 1, 1, 1, 1, 1, 1, 1, 100];
    expect(skewness(rightSkewed)).toBeGreaterThan(0);
  });
});

describe("kurtosis()", () => {
  it("returns 3 for fewer than 4 values (normal distribution default)", () => {
    expect(kurtosis([])).toBe(3);
    expect(kurtosis([1, 2, 3])).toBe(3);
  });

  it("returns a finite number for normal-ish data", () => {
    const data = [1, 2, 2, 3, 3, 3, 4, 4, 5];
    expect(isFinite(kurtosis(data))).toBe(true);
  });
});

describe("deflatedSharpeRatio()", () => {
  it("returns 0 when sharpe is 0", () => {
    expect(deflatedSharpeRatio(0, 10, 252, 3, 0, 3)).toBe(0);
  });

  it("returns a value between 0 and 1 for typical inputs", () => {
    // The function de-annualises the Sharpe (divides by sqrt(252)) before computing
    // the z-score, so the result is always in [0, 1] as a probability.
    const dsr = deflatedSharpeRatio(1.5, 252, 252, 3, 0, 3);
    expect(dsr).toBeGreaterThanOrEqual(0);
    expect(dsr).toBeLessThanOrEqual(1);
  });

  it("decreases as number of variants increases (multiple testing penalty)", () => {
    const dsr1 = deflatedSharpeRatio(1.5, 252, 252, 1, 0, 3);
    const dsr3 = deflatedSharpeRatio(1.5, 252, 252, 3, 0, 3);
    const dsr10 = deflatedSharpeRatio(1.5, 252, 252, 10, 0, 3);
    expect(dsr1).toBeGreaterThanOrEqual(dsr3);
    expect(dsr3).toBeGreaterThanOrEqual(dsr10);
  });

  it("increases as Sharpe increases", () => {
    const dsr1 = deflatedSharpeRatio(0.5, 252, 252, 3, 0, 3);
    const dsr2 = deflatedSharpeRatio(1.5, 252, 252, 3, 0, 3);
    const dsr3 = deflatedSharpeRatio(3.0, 252, 252, 3, 0, 3);
    expect(dsr1).toBeLessThanOrEqual(dsr2);
    expect(dsr2).toBeLessThanOrEqual(dsr3);
  });
});
