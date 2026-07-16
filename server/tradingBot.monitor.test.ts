/**
 * Unit tests for server/tradingBot/monitor.ts
 *
 * Tests cover:
 *  - parseAlpacaNum: string→number conversion, null/undefined/empty handling
 *  - toPositionSummary: Alpaca position shape → PositionSummary
 *  - computeTotalUnrealizedPnl: sum across positions
 *  - computeDailyPnl: equity vs previous close
 *  - computeDrawdown: peak-relative percentage
 *  - buildSnapshot: full snapshot assembly
 *  - buildLogEntry: log record creation
 *  - buildKillSwitchActivated: kill switch state on activation
 *  - buildKillSwitchReset: kill switch state on reset
 *  - computePeakEquity: running max over equity curve
 *  - logLevelClass: CSS class mapping
 *  - snapshotToLogLine: human-readable snapshot summary
 */

import { describe, it, expect } from "vitest";
import {
  parseAlpacaNum,
  toPositionSummary,
  computeTotalUnrealizedPnl,
  computeDailyPnl,
  computeDrawdown,
  buildSnapshot,
  buildLogEntry,
  buildKillSwitchActivated,
  buildKillSwitchReset,
  computePeakEquity,
  logLevelClass,
  snapshotToLogLine,
  type PositionSummary,
  type EquityPoint,
} from "./tradingBot/monitor";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePosition(overrides: Partial<{
  symbol: string;
  qty: string;
  side: string;
  avgEntryPrice: string;
  currentPrice: string;
  marketValue: string;
  unrealizedPl: string;
  unrealizedPlpc: string;
  costBasis: string;
}> = {}): any {
  return {
    symbol: "AAPL",
    qty: "10",
    side: "long",
    avgEntryPrice: "150.00",
    currentPrice: "155.00",
    marketValue: "1550.00",
    unrealizedPl: "50.00",
    unrealizedPlpc: "0.0333",
    costBasis: "1500.00",
    ...overrides,
  };
}

// ─── parseAlpacaNum ───────────────────────────────────────────────────────────

describe("parseAlpacaNum", () => {
  it("parses a positive string", () => {
    expect(parseAlpacaNum("123.45")).toBeCloseTo(123.45);
  });

  it("parses a negative string", () => {
    expect(parseAlpacaNum("-42.5")).toBeCloseTo(-42.5);
  });

  it("returns 0 for null", () => {
    expect(parseAlpacaNum(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(parseAlpacaNum(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseAlpacaNum("")).toBe(0);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseAlpacaNum("not-a-number")).toBe(0);
  });

  it("parses zero correctly", () => {
    expect(parseAlpacaNum("0")).toBe(0);
  });
});

// ─── toPositionSummary ────────────────────────────────────────────────────────

describe("toPositionSummary", () => {
  it("maps all fields correctly for a long position", () => {
    const pos = makePosition();
    const summary = toPositionSummary(pos);
    expect(summary.symbol).toBe("AAPL");
    expect(summary.qty).toBe(10);
    expect(summary.side).toBe("long");
    expect(summary.avgEntryPrice).toBeCloseTo(150.0);
    expect(summary.currentPrice).toBeCloseTo(155.0);
    expect(summary.marketValue).toBeCloseTo(1550.0);
    expect(summary.unrealizedPl).toBeCloseTo(50.0);
    expect(summary.costBasis).toBeCloseTo(1500.0);
  });

  it("maps unrealizedPlPct as percentage (costBasis-based)", () => {
    // unrealizedPl=50, costBasis=1500 → 50/1500*100 = 3.33%
    const pos = makePosition();
    const summary = toPositionSummary(pos);
    expect(summary.unrealizedPlPct).toBeCloseTo(3.33, 1);
  });

  it("handles short side", () => {
    const pos = makePosition({ side: "short", qty: "-5" });
    const summary = toPositionSummary(pos);
    expect(summary.side).toBe("short");
    expect(summary.qty).toBe(-5);
  });

  it("handles zero P&L", () => {
    const pos = makePosition({ unrealizedPl: "0", costBasis: "1500.00" });
    const summary = toPositionSummary(pos);
    expect(summary.unrealizedPl).toBe(0);
    expect(summary.unrealizedPlPct).toBe(0);
  });
});

// ─── computeTotalUnrealizedPnl ────────────────────────────────────────────────

describe("computeTotalUnrealizedPnl", () => {
  it("sums unrealized P&L across positions", () => {
    const positions: PositionSummary[] = [
      { symbol: "AAPL", qty: 10, side: "long", avgEntryPrice: 150, currentPrice: 155, marketValue: 1550, unrealizedPl: 50, unrealizedPlPct: 3.33, costBasis: 1500 },
      { symbol: "TSLA", qty: 5, side: "long", avgEntryPrice: 200, currentPrice: 190, marketValue: 950, unrealizedPl: -50, unrealizedPlPct: -5, costBasis: 1000 },
    ];
    expect(computeTotalUnrealizedPnl(positions)).toBeCloseTo(0);
  });

  it("returns 0 for empty positions", () => {
    expect(computeTotalUnrealizedPnl([])).toBe(0);
  });

  it("handles all positive P&L", () => {
    const positions: PositionSummary[] = [
      { symbol: "A", qty: 1, side: "long", avgEntryPrice: 100, currentPrice: 110, marketValue: 110, unrealizedPl: 10, unrealizedPlPct: 10, costBasis: 100 },
      { symbol: "B", qty: 1, side: "long", avgEntryPrice: 100, currentPrice: 120, marketValue: 120, unrealizedPl: 20, unrealizedPlPct: 20, costBasis: 100 },
    ];
    expect(computeTotalUnrealizedPnl(positions)).toBeCloseTo(30);
  });
});

// ─── computeDailyPnl ──────────────────────────────────────────────────────────

describe("computeDailyPnl", () => {
  it("returns positive P&L when equity > previous close", () => {
    const result = computeDailyPnl(105000, 100000);
    expect(result.dailyPnl).toBeCloseTo(5000);
    expect(result.dailyPnlPct).toBeCloseTo(5.0);
  });

  it("returns negative P&L when equity < previous close", () => {
    const result = computeDailyPnl(95000, 100000);
    expect(result.dailyPnl).toBeCloseTo(-5000);
    expect(result.dailyPnlPct).toBeCloseTo(-5.0);
  });

  it("returns zero when equity equals previous close", () => {
    const result = computeDailyPnl(100000, 100000);
    expect(result.dailyPnl).toBe(0);
    expect(result.dailyPnlPct).toBe(0);
  });

  it("returns zero pct when previous close is 0", () => {
    const result = computeDailyPnl(100000, 0);
    expect(result.dailyPnl).toBeCloseTo(100000);
    expect(result.dailyPnlPct).toBe(0); // guard against division by zero
  });
});

// ─── computeDrawdown ──────────────────────────────────────────────────────────

describe("computeDrawdown", () => {
  it("returns 0 when at peak", () => {
    expect(computeDrawdown(100000, 100000)).toBe(0);
  });

  it("returns 10 for a 10% drawdown", () => {
    expect(computeDrawdown(90000, 100000)).toBeCloseTo(10.0);
  });

  it("returns 0 when equity exceeds peak (new high)", () => {
    expect(computeDrawdown(110000, 100000)).toBe(0);
  });

  it("returns 0 when peak is 0 (guard)", () => {
    expect(computeDrawdown(0, 0)).toBe(0);
  });

  it("returns 100 for total loss", () => {
    expect(computeDrawdown(0, 100000)).toBeCloseTo(100.0);
  });
});

// ─── buildSnapshot ────────────────────────────────────────────────────────────

describe("buildSnapshot", () => {
  const mockAccount = {
    equity: "105000",
    cash: "50000",
    lastEquity: "100000",
    portfolioValue: "105000",
  };

  const mockPositions = [
    makePosition({ symbol: "AAPL", unrealized_pl: "500", unrealized_plpc: "0.05" }),
  ];

  it("builds a snapshot with correct equity and cash", () => {
    const snap = buildSnapshot(mockAccount as any, mockPositions, 100000, false);
    expect(snap.equity).toBeCloseTo(105000);
    expect(snap.cash).toBeCloseTo(50000);
    expect(snap.portfolioValue).toBeCloseTo(105000);
  });

  it("computes daily P&L from equity vs lastEquity", () => {
    const snap = buildSnapshot(mockAccount as any, mockPositions, 100000, false);
    expect(snap.dailyPnl).toBeCloseTo(5000);
    expect(snap.dailyPnlPct).toBeCloseTo(5.0);
  });

  it("computes drawdown from peak equity", () => {
    const snap = buildSnapshot(mockAccount as any, mockPositions, 110000, false);
    expect(snap.drawdownPct).toBeCloseTo(4.545, 1);
  });

  it("reflects kill switch state", () => {
    const snap = buildSnapshot(mockAccount as any, mockPositions, 100000, true);
    expect(snap.killSwitchActive).toBe(true);
  });

  it("counts open positions correctly", () => {
    const snap = buildSnapshot(mockAccount as any, mockPositions, 100000, false);
    expect(snap.openPositions).toBe(1);
  });

  it("sets capturedAt as a recent timestamp", () => {
    const before = Date.now();
    const snap = buildSnapshot(mockAccount as any, mockPositions, 100000, false);
    const after = Date.now();
    expect(snap.capturedAt).toBeGreaterThanOrEqual(before);
    expect(snap.capturedAt).toBeLessThanOrEqual(after);
  });
});

// ─── buildLogEntry ────────────────────────────────────────────────────────────

describe("buildLogEntry", () => {
  it("creates a log entry with correct fields", () => {
    const entry = buildLogEntry("info", "bot", "Bot started");
    expect(entry.level).toBe("info");
    expect(entry.source).toBe("bot");
    expect(entry.message).toBe("Bot started");
    expect(typeof entry.createdAt).toBe("number");
  });

  it("accepts optional meta", () => {
    const entry = buildLogEntry("warn", "risk", "Drawdown warning", { drawdown: 8.5 });
    expect(entry.meta).toEqual({ drawdown: 8.5 });
  });

  it("sets meta to undefined when not provided", () => {
    const entry = buildLogEntry("debug", "system", "Heartbeat");
    expect(entry.meta).toBeUndefined();
  });

  it("sets createdAt to a recent timestamp", () => {
    const before = Date.now();
    const entry = buildLogEntry("error", "execution", "Order failed");
    const after = Date.now();
    expect(entry.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry.createdAt).toBeLessThanOrEqual(after);
  });
});

// ─── buildKillSwitchActivated ─────────────────────────────────────────────────

describe("buildKillSwitchActivated", () => {
  it("sets active to true", () => {
    const ks = buildKillSwitchActivated("Drawdown exceeded 10%", "risk");
    expect(ks.active).toBe(true);
  });

  it("stores the reason", () => {
    const ks = buildKillSwitchActivated("Manual halt", "user");
    expect(ks.reason).toBe("Manual halt");
  });

  it("stores the triggeredBy", () => {
    const ks = buildKillSwitchActivated("Daily loss limit", "risk");
    expect(ks.triggeredBy).toBe("risk");
  });

  it("sets triggeredAt to a recent timestamp", () => {
    const before = Date.now();
    const ks = buildKillSwitchActivated("Test", "system");
    const after = Date.now();
    expect(ks.triggeredAt).toBeGreaterThanOrEqual(before);
    expect(ks.triggeredAt).toBeLessThanOrEqual(after);
  });
});

// ─── buildKillSwitchReset ─────────────────────────────────────────────────────

describe("buildKillSwitchReset", () => {
  it("sets active to false", () => {
    const ks = buildKillSwitchReset();
    expect(ks.active).toBe(false);
  });

  it("clears reason and triggeredBy", () => {
    const ks = buildKillSwitchReset();
    expect(ks.reason).toBe("");
    expect(ks.triggeredBy).toBe("");
  });

  it("sets triggeredAt to null or 0", () => {
    const ks = buildKillSwitchReset();
    expect(ks.triggeredAt == null || ks.triggeredAt === 0).toBe(true);
  });
});

// ─── computePeakEquity ────────────────────────────────────────────────────────

describe("computePeakEquity", () => {
  it("returns the maximum equity from the curve", () => {
    const points: EquityPoint[] = [
      { ts: 1, equity: 100000, dailyPnl: 0 },
      { ts: 2, equity: 105000, dailyPnl: 5000 },
      { ts: 3, equity: 103000, dailyPnl: -2000 },
      { ts: 4, equity: 108000, dailyPnl: 5000 },
      { ts: 5, equity: 107000, dailyPnl: -1000 },
    ];
    expect(computePeakEquity(points)).toBe(108000);
  });

  it("returns 0 for empty curve", () => {
    expect(computePeakEquity([])).toBe(0);
  });

  it("returns the single value for a single-point curve", () => {
    expect(computePeakEquity([{ ts: 1, equity: 99000, dailyPnl: -1000 }])).toBe(99000);
  });
});

// ─── logLevelClass ────────────────────────────────────────────────────────────

describe("logLevelClass", () => {
  it("returns a string for each level", () => {
    const levels = ["debug", "info", "warn", "error", "critical"] as const;
    for (const level of levels) {
      expect(typeof logLevelClass(level)).toBe("string");
      expect(logLevelClass(level).length).toBeGreaterThan(0);
    }
  });

  it("returns different classes for different severity levels", () => {
    const debugClass = logLevelClass("debug");
    const criticalClass = logLevelClass("critical");
    expect(debugClass).not.toBe(criticalClass);
  });
});

// ─── snapshotToLogLine ────────────────────────────────────────────────────────

describe("snapshotToLogLine", () => {
  const snap = {
    portfolioValue: 105000,
    cash: 50000,
    equity: 105000,
    dailyPnl: 5000,
    dailyPnlPct: 5.0,
    totalPnl: 5000,
    drawdownPct: 0,
    openPositions: 2,
    killSwitchActive: false,
    positions: [],
    capturedAt: Date.now(),
  };

  it("returns a non-empty string", () => {
    const line = snapshotToLogLine(snap);
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
  });

  it("includes portfolio value", () => {
    const line = snapshotToLogLine(snap);
    expect(line).toContain("105000");
  });

  it("includes daily P&L", () => {
    const line = snapshotToLogLine(snap);
    expect(line).toContain("5000");
  });

  it("includes kill switch state", () => {
    const lineOff = snapshotToLogLine({ ...snap, killSwitchActive: false });
    const lineOn = snapshotToLogLine({ ...snap, killSwitchActive: true });
    expect(lineOff).not.toBe(lineOn);
  });
});
