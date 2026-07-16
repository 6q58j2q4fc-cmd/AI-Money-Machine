/**
 * Unit tests for server/tradingBot/risk.ts
 *
 * Tests every exported pure function:
 *   calculateRiskAdjustedSize, checkDailyLossLimit, checkMaxDrawdown,
 *   checkCapitalSufficiency, evaluateTradeRisk, buildRiskState,
 *   resolveKillSwitchTransition, buildRiskEvent, updatePeak,
 *   shouldResetDailyState
 *
 * All tests are pure (no DB, no network, no side effects).
 */

import { describe, it, expect } from "vitest";
import {
  calculateRiskAdjustedSize,
  checkDailyLossLimit,
  checkMaxDrawdown,
  checkCapitalSufficiency,
  evaluateTradeRisk,
  buildRiskState,
  resolveKillSwitchTransition,
  buildRiskEvent,
  updatePeak,
  shouldResetDailyState,
  DEFAULT_RISK_CONFIG,
  type RiskConfig,
  type RiskState,
} from "./tradingBot/risk";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cfg = DEFAULT_RISK_CONFIG;

function makeState(overrides: Partial<{
  portfolioValue: number;
  dayStartValue: number;
  peakValue: number;
  realisedDailyPnl: number;
  killSwitchActive: boolean;
  killSwitchReason: string | null;
  killSwitchActivatedAt: number | null;
}>): RiskState {
  return buildRiskState({
    portfolioValue:        overrides.portfolioValue        ?? 100_000,
    dayStartValue:         overrides.dayStartValue         ?? 100_000,
    peakValue:             overrides.peakValue             ?? 100_000,
    realisedDailyPnl:      overrides.realisedDailyPnl      ?? 0,
    killSwitchActive:      overrides.killSwitchActive       ?? false,
    killSwitchReason:      (overrides.killSwitchReason as any) ?? null,
    killSwitchActivatedAt: overrides.killSwitchActivatedAt ?? null,
  });
}

// ─── calculateRiskAdjustedSize ────────────────────────────────────────────────

describe("calculateRiskAdjustedSize", () => {
  it("returns positive integer shares for a normal entry", () => {
    const result = calculateRiskAdjustedSize({
      entryPrice: 100,
      availableCapital: 100_000,
      config: cfg,
    });
    expect(result.shares).toBeGreaterThan(0);
    expect(Number.isInteger(result.shares)).toBe(true);
  });

  it("risks at most maxRiskPctPerTrade of capital", () => {
    // riskAmount = 100_000 * 0.01 = 1_000
    // sharesFromRisk = 1_000 / (100 * 0.02) = 500
    // sharesFromPosition = 100_000 * 0.05 / 100 = 50 → capped at 50
    const result = calculateRiskAdjustedSize({
      entryPrice: 100,
      availableCapital: 100_000,
      config: cfg,
    });
    expect(result.capitalAtRisk).toBeLessThanOrEqual(100_000 * cfg.maxRiskPctPerTrade + 1);
  });

  it("position value does not exceed maxPositionPct of capital", () => {
    const result = calculateRiskAdjustedSize({
      entryPrice: 100,
      availableCapital: 100_000,
      config: cfg,
    });
    expect(result.positionValue).toBeLessThanOrEqual(100_000 * cfg.maxPositionPct + 100);
  });

  it("returns 0 shares when entry price is 0", () => {
    const result = calculateRiskAdjustedSize({
      entryPrice: 0,
      availableCapital: 100_000,
      config: cfg,
    });
    expect(result.shares).toBe(0);
  });

  it("returns 0 shares when available capital is 0", () => {
    const result = calculateRiskAdjustedSize({
      entryPrice: 100,
      availableCapital: 0,
      config: cfg,
    });
    expect(result.shares).toBe(0);
  });

  it("stopLossPrice = entryPrice * (1 - stopLossPct)", () => {
    const result = calculateRiskAdjustedSize({
      entryPrice: 100,
      availableCapital: 100_000,
      config: cfg,
    });
    expect(result.stopLossPrice).toBeCloseTo(100 * (1 - cfg.stopLossPct), 5);
  });

  it("takeProfitPrice = entryPrice * (1 + takeProfitPct)", () => {
    const result = calculateRiskAdjustedSize({
      entryPrice: 100,
      availableCapital: 100_000,
      config: cfg,
    });
    expect(result.takeProfitPrice).toBeCloseTo(100 * (1 + cfg.takeProfitPct), 5);
  });
});

// ─── checkDailyLossLimit ─────────────────────────────────────────────────────

describe("checkDailyLossLimit", () => {
  it("allows trading when daily P&L is positive", () => {
    const result = checkDailyLossLimit(500, 100_000, cfg);
    expect(result.allowed).toBe(true);
  });

  it("allows trading when daily loss is within limit", () => {
    // limit = 100_000 * 0.02 = 2_000; loss = -1_000 → within limit
    const result = checkDailyLossLimit(-1_000, 100_000, cfg);
    expect(result.allowed).toBe(true);
  });

  it("blocks trading when daily loss equals the limit", () => {
    const limit = 100_000 * cfg.dailyLossLimitPct;
    const result = checkDailyLossLimit(-limit, 100_000, cfg);
    expect(result.allowed).toBe(false);
  });

  it("blocks trading when daily loss exceeds the limit", () => {
    const result = checkDailyLossLimit(-5_000, 100_000, cfg);
    expect(result.allowed).toBe(false);
  });

  it("returns severity=warning when approaching limit (>80%)", () => {
    // 80% of 2_000 = 1_600 → loss of -1_700 should be warning
    const result = checkDailyLossLimit(-1_700, 100_000, cfg);
    expect(result.severity).toBe("warning");
  });

  it("returns severity=critical when limit is breached", () => {
    const result = checkDailyLossLimit(-5_000, 100_000, cfg);
    expect(result.severity).toBe("critical");
  });
});

// ─── checkMaxDrawdown ─────────────────────────────────────────────────────────

describe("checkMaxDrawdown", () => {
  it("allows trading when drawdown is zero", () => {
    const result = checkMaxDrawdown(100_000, 100_000, false, cfg);
    expect(result.allowed).toBe(true);
  });

  it("allows trading when drawdown is below limit", () => {
    // 5% drawdown on 100k peak → current = 95k; limit = 10%
    const result = checkMaxDrawdown(95_000, 100_000, false, cfg);
    expect(result.allowed).toBe(true);
  });

  it("blocks trading when drawdown equals the limit", () => {
    const current = 100_000 * (1 - cfg.maxDrawdownPct);
    const result = checkMaxDrawdown(current, 100_000, false, cfg);
    expect(result.allowed).toBe(false);
  });

  it("blocks trading when drawdown exceeds the limit", () => {
    const result = checkMaxDrawdown(85_000, 100_000, false, cfg);
    expect(result.allowed).toBe(false);
  });

  it("blocks trading when kill switch is already active", () => {
    const result = checkMaxDrawdown(100_000, 100_000, true, cfg);
    expect(result.allowed).toBe(false);
  });

  it("returns severity=warning when approaching limit (>80%)", () => {
    // 80% of 10% = 8% drawdown → current = 92k on 100k peak
    const result = checkMaxDrawdown(91_500, 100_000, false, cfg);
    expect(result.severity).toBe("warning");
  });

  it("returns severity=critical when limit is breached", () => {
    const result = checkMaxDrawdown(85_000, 100_000, false, cfg);
    expect(result.severity).toBe("critical");
  });

  it("reason is MAX_DRAWDOWN_KILL when limit is breached", () => {
    const result = checkMaxDrawdown(85_000, 100_000, false, cfg);
    expect(result.reason).toBe("MAX_DRAWDOWN_KILL");
  });
});

// ─── checkCapitalSufficiency ──────────────────────────────────────────────────

describe("checkCapitalSufficiency", () => {
  it("allows trading when capital is above threshold", () => {
    const result = checkCapitalSufficiency(100_000, cfg);
    expect(result.allowed).toBe(true);
  });

  it("blocks trading when capital is below minCapitalThreshold", () => {
    const result = checkCapitalSufficiency(50, cfg); // below default 100
    expect(result.allowed).toBe(false);
  });

  it("allows trading when capital equals the threshold", () => {
    const result = checkCapitalSufficiency(cfg.minCapitalThreshold, cfg);
    expect(result.allowed).toBe(true);
  });
});

// ─── buildRiskState ───────────────────────────────────────────────────────────

describe("buildRiskState", () => {
  it("dailyPnl equals realisedDailyPnl", () => {
    const state = makeState({ realisedDailyPnl: 1_500 });
    expect(state.dailyPnl).toBeCloseTo(1_500, 2);
  });

  it("computes currentDrawdownPct correctly (as fraction, not percent)", () => {
    // peak = 100k, current = 90k → drawdown = 0.10 (10%)
    const state = makeState({ portfolioValue: 90_000, peakValue: 100_000 });
    expect(state.currentDrawdownPct).toBeCloseTo(0.10, 4);
  });

  it("currentDrawdownPct is 0 when at peak", () => {
    const state = makeState({ portfolioValue: 100_000, peakValue: 100_000 });
    expect(state.currentDrawdownPct).toBe(0);
  });

  it("preserves killSwitchActive flag", () => {
    const state = makeState({ killSwitchActive: true, killSwitchReason: "MAX_DRAWDOWN_KILL" });
    expect(state.killSwitchActive).toBe(true);
    expect(state.killSwitchReason).toBe("MAX_DRAWDOWN_KILL");
  });
});

// ─── updatePeak ───────────────────────────────────────────────────────────────

describe("updatePeak", () => {
  it("returns new value when it exceeds current peak", () => {
    expect(updatePeak(100_000, 110_000)).toBe(110_000);
  });

  it("returns current peak when new value is lower", () => {
    expect(updatePeak(100_000, 90_000)).toBe(100_000);
  });

  it("returns same value when equal", () => {
    expect(updatePeak(100_000, 100_000)).toBe(100_000);
  });
});

// ─── shouldResetDailyState ────────────────────────────────────────────────────

describe("shouldResetDailyState", () => {
  it("returns true when last reset was on a different calendar day", () => {
    // Yesterday at noon vs today
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(12, 0, 0, 0);
    expect(shouldResetDailyState(yesterday.getTime(), Date.now())).toBe(true);
  });

  it("returns false when last reset was on the same calendar day", () => {
    // Same day, 1 hour ago
    const sameDay = Date.now() - 60 * 60 * 1000;
    expect(shouldResetDailyState(sameDay, Date.now())).toBe(false);
  });

  it("returns true when lastResetAt is 0 (epoch = 1970-01-01)", () => {
    expect(shouldResetDailyState(0, Date.now())).toBe(true);
  });
});

// ─── resolveKillSwitchTransition ──────────────────────────────────────────────

describe("resolveKillSwitchTransition", () => {
  it("activates kill switch when drawdown check fails and switch is not yet active", () => {
    const state = makeState({ killSwitchActive: false });
    const ddCheck = checkMaxDrawdown(85_000, 100_000, false, cfg);
    const result = resolveKillSwitchTransition(state, ddCheck);
    expect(result.shouldActivate).toBe(true);
    expect(result.reason).toBe("MAX_DRAWDOWN_KILL");
  });

  it("does not activate kill switch when drawdown is within limits", () => {
    const state = makeState({ killSwitchActive: false });
    const ddCheck = checkMaxDrawdown(95_000, 100_000, false, cfg);
    const result = resolveKillSwitchTransition(state, ddCheck);
    expect(result.shouldActivate).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("does not re-activate when kill switch is already active", () => {
    const state = makeState({ killSwitchActive: true });
    const ddCheck = checkMaxDrawdown(85_000, 100_000, true, cfg);
    const result = resolveKillSwitchTransition(state, ddCheck);
    expect(result.shouldActivate).toBe(false);
  });
});

// ─── buildRiskEvent ───────────────────────────────────────────────────────────

describe("buildRiskEvent", () => {
  it("creates an event with the correct type and severity", () => {
    const state = makeState({});
    const ev = buildRiskEvent("MAX_DRAWDOWN_KILL", state, "Test message", "critical");
    expect(ev.eventType).toBe("MAX_DRAWDOWN_KILL");
    expect(ev.severity).toBe("critical");
    expect(ev.message).toBe("Test message");
  });

  it("includes a triggeredAt timestamp within the current second", () => {
    const state = makeState({});
    const before = Date.now();
    const ev = buildRiskEvent("DAILY_RESET", state, "Reset", "info");
    const after = Date.now();
    expect(Number(ev.triggeredAt)).toBeGreaterThanOrEqual(before);
    expect(Number(ev.triggeredAt)).toBeLessThanOrEqual(after);
  });

  it("includes portfolio snapshot in the event", () => {
    const state = makeState({ portfolioValue: 95_000, peakValue: 100_000 });
    const ev = buildRiskEvent("CONFIG_UPDATED", state, "Config changed", "info");
    expect(ev.portfolioValue).toBeCloseTo(95_000, 1);
    // drawdownPct = (100k - 95k) / 100k = 0.05
    expect(ev.drawdownPct).toBeCloseTo(0.05, 4);
  });

  it("acknowledgedAt is null by default", () => {
    const state = makeState({});
    const ev = buildRiskEvent("KILL_SWITCH_ACKNOWLEDGED", state, "Ack", "info");
    expect(ev.acknowledgedAt).toBeNull();
  });
});

// ─── evaluateTradeRisk ────────────────────────────────────────────────────────

describe("evaluateTradeRisk", () => {
  it("returns decision.allowed=true with valid sizing for a healthy portfolio", () => {
    const state = makeState({ portfolioValue: 100_000 });
    const result = evaluateTradeRisk(100, state, cfg);
    expect(result.decision.allowed).toBe(true);
    expect(result.sizing).not.toBeNull();
    expect(result.sizing!.shares).toBeGreaterThan(0);
  });

  it("returns decision.allowed=false when kill switch is active", () => {
    const state = makeState({ killSwitchActive: true });
    const result = evaluateTradeRisk(100, state, cfg);
    expect(result.decision.allowed).toBe(false);
    expect(result.sizing).toBeNull();
  });

  it("returns decision.allowed=false when daily loss limit is breached", () => {
    const state = makeState({ realisedDailyPnl: -5_000, dayStartValue: 100_000 });
    const result = evaluateTradeRisk(100, state, cfg);
    expect(result.decision.allowed).toBe(false);
  });

  it("returns decision.allowed=false when max drawdown is exceeded", () => {
    const state = makeState({ portfolioValue: 85_000, peakValue: 100_000 });
    const result = evaluateTradeRisk(100, state, cfg);
    expect(result.decision.allowed).toBe(false);
  });

  it("includes stop-loss and take-profit in sizing when allowed", () => {
    const state = makeState({ portfolioValue: 100_000 });
    const result = evaluateTradeRisk(100, state, cfg);
    expect(result.sizing!.stopLossPrice).toBeLessThan(100);
    expect(result.sizing!.takeProfitPrice).toBeGreaterThan(100);
  });

  it("position value does not exceed maxPositionPct of portfolio when allowed", () => {
    const state = makeState({ portfolioValue: 100_000 });
    const result = evaluateTradeRisk(100, state, cfg);
    expect(result.sizing!.positionValue).toBeLessThanOrEqual(100_000 * cfg.maxPositionPct + 100);
  });
});

// ─── DEFAULT_RISK_CONFIG ──────────────────────────────────────────────────────

describe("DEFAULT_RISK_CONFIG", () => {
  it("has maxRiskPctPerTrade = 0.01 (1%)", () => {
    expect(DEFAULT_RISK_CONFIG.maxRiskPctPerTrade).toBe(0.01);
  });

  it("has dailyLossLimitPct = 0.02 (2%)", () => {
    expect(DEFAULT_RISK_CONFIG.dailyLossLimitPct).toBe(0.02);
  });

  it("has maxDrawdownPct = 0.10 (10%)", () => {
    expect(DEFAULT_RISK_CONFIG.maxDrawdownPct).toBe(0.10);
  });

  it("has maxPositionPct = 0.05 (5%)", () => {
    expect(DEFAULT_RISK_CONFIG.maxPositionPct).toBe(0.05);
  });

  it("has stopLossPct = 0.02 (2%)", () => {
    expect(DEFAULT_RISK_CONFIG.stopLossPct).toBe(0.02);
  });

  it("has takeProfitPct = 0.04 (4%)", () => {
    expect(DEFAULT_RISK_CONFIG.takeProfitPct).toBe(0.04);
  });
});
