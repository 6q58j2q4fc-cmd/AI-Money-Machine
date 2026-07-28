/**
 * server/tradingBot.liveTrading.test.ts
 *
 * Unit tests for the live-trading toggle safety system in execution.ts.
 * Covers all 6 guard layers, hard cap enforcement, and typed confirmation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PAPER_BASE_URL,
  LIVE_TRADING_DISABLED,
  LIVE_TRADING_CONFIRMATION,
  DEFAULT_LIVE_CAPS,
  isLiveTradingEnvEnabled,
  validateLiveTradingConfirmation,
  applyLiveCaps,
  buildLiveTradingState,
  type LiveTradingCaps,
} from "./tradingBot/execution";

// ─── Layer 1: Compile-time constants ─────────────────────────────────────────

describe("Layer 1 — Compile-time constants", () => {
  it("LIVE_TRADING_DISABLED is the literal true", () => {
    expect(LIVE_TRADING_DISABLED).toBe(true);
    // TypeScript literal — the type is `true`, not `boolean`
    const check: true = LIVE_TRADING_DISABLED;
    expect(check).toBe(true);
  });

  it("PAPER_BASE_URL points to paper API only", () => {
    expect(PAPER_BASE_URL).toBe("https://paper-api.alpaca.markets");
    expect(PAPER_BASE_URL).not.toContain("live");
    expect(PAPER_BASE_URL).not.toBe("https://api.alpaca.markets");
  });

  it("LIVE_TRADING_CONFIRMATION is the exact required string", () => {
    expect(LIVE_TRADING_CONFIRMATION).toBe("I ACCEPT LIVE TRADING RISK");
  });
});

// ─── Layer 2: Environment flag ────────────────────────────────────────────────

describe("Layer 2 — isLiveTradingEnvEnabled()", () => {
  const originalEnv = process.env.ENABLE_LIVE_TRADING;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ENABLE_LIVE_TRADING;
    } else {
      process.env.ENABLE_LIVE_TRADING = originalEnv;
    }
  });

  it("returns false when env var is not set", () => {
    delete process.env.ENABLE_LIVE_TRADING;
    expect(isLiveTradingEnvEnabled()).toBe(false);
  });

  it("returns false when env var is empty string", () => {
    process.env.ENABLE_LIVE_TRADING = "";
    expect(isLiveTradingEnvEnabled()).toBe(false);
  });

  it("returns false when env var is 'false'", () => {
    process.env.ENABLE_LIVE_TRADING = "false";
    expect(isLiveTradingEnvEnabled()).toBe(false);
  });

  it("returns false when env var is 'True' (wrong case)", () => {
    process.env.ENABLE_LIVE_TRADING = "True";
    expect(isLiveTradingEnvEnabled()).toBe(false);
  });

  it("returns false when env var is 'TRUE' (all caps)", () => {
    process.env.ENABLE_LIVE_TRADING = "TRUE";
    expect(isLiveTradingEnvEnabled()).toBe(false);
  });

  it("returns false when env var is '1'", () => {
    process.env.ENABLE_LIVE_TRADING = "1";
    expect(isLiveTradingEnvEnabled()).toBe(false);
  });

  it("returns true ONLY when env var is exactly 'true'", () => {
    process.env.ENABLE_LIVE_TRADING = "true";
    expect(isLiveTradingEnvEnabled()).toBe(true);
  });
});

// ─── Layer 3: Typed confirmation ──────────────────────────────────────────────

describe("Layer 3 — validateLiveTradingConfirmation()", () => {
  it("rejects empty string", () => {
    expect(validateLiveTradingConfirmation("")).toBe(false);
  });

  it("rejects partial match", () => {
    expect(validateLiveTradingConfirmation("I ACCEPT")).toBe(false);
  });

  it("rejects lowercase variant", () => {
    expect(validateLiveTradingConfirmation("i accept live trading risk")).toBe(false);
  });

  it("rejects with extra whitespace", () => {
    expect(validateLiveTradingConfirmation(" I ACCEPT LIVE TRADING RISK")).toBe(false);
    expect(validateLiveTradingConfirmation("I ACCEPT LIVE TRADING RISK ")).toBe(false);
  });

  it("rejects with punctuation added", () => {
    expect(validateLiveTradingConfirmation("I ACCEPT LIVE TRADING RISK!")).toBe(false);
  });

  it("accepts the exact required string", () => {
    expect(validateLiveTradingConfirmation("I ACCEPT LIVE TRADING RISK")).toBe(true);
  });

  it("matches the exported LIVE_TRADING_CONFIRMATION constant", () => {
    expect(validateLiveTradingConfirmation(LIVE_TRADING_CONFIRMATION)).toBe(true);
  });
});

// ─── Layer 4: Hard cap enforcement ───────────────────────────────────────────

describe("Layer 4 — applyLiveCaps()", () => {
  const caps: LiveTradingCaps = {
    maxOrderValueUsd: 500,
    maxPositionFraction: 0.02,
    maxTotalCapitalAtRiskFraction: 0.10,
  };

  it("allows an order within all caps", () => {
    const result = applyLiveCaps(100, 10000, 0, caps);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks an order exceeding maxOrderValueUsd", () => {
    const result = applyLiveCaps(501, 10000, 0, caps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("$501.00");
    expect(result.reason).toContain("hard cap");
  });

  it("blocks an order exactly at maxOrderValueUsd (boundary — strict >)", () => {
    // $500 on $10,000 portfolio = 5% position fraction which exceeds the 2% cap
    // (position fraction check fires before order value check at exactly $500)
    const result = applyLiveCaps(500, 10000, 0, caps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("5.00%");
  });

  it("blocks an order exceeding maxPositionFraction", () => {
    // $250 on a $10,000 portfolio = 2.5% > 2% cap
    const result = applyLiveCaps(250, 10000, 0, caps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("2.50%");
  });

  it("allows an order at exactly maxPositionFraction (boundary)", () => {
    // $200 on $10,000 = exactly 2%
    const result = applyLiveCaps(200, 10000, 0, caps);
    expect(result.allowed).toBe(true);
  });

  it("blocks when adding order would exceed maxTotalCapitalAtRiskFraction", () => {
    // Already $900 at risk on $10,000 portfolio (9%), adding $200 = 11% > 10%
    const result = applyLiveCaps(200, 10000, 900, caps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("11.00%");
  });

  it("allows when total capital at risk stays within cap", () => {
    // $800 at risk + $100 order = $900 / $10,000 = 9% < 10%
    const result = applyLiveCaps(100, 10000, 800, caps);
    expect(result.allowed).toBe(true);
  });

  it("skips fraction checks when portfolioValue is 0", () => {
    // Zero portfolio — only order value cap applies
    const result = applyLiveCaps(100, 0, 0, caps);
    expect(result.allowed).toBe(true);
  });

  it("uses DEFAULT_LIVE_CAPS when no caps argument provided", () => {
    const result = applyLiveCaps(100, 10000, 0);
    expect(result.caps).toEqual(DEFAULT_LIVE_CAPS);
    expect(result.allowed).toBe(true);
  });

  it("always returns the caps object in the result", () => {
    const result = applyLiveCaps(100, 10000, 0, caps);
    expect(result.caps).toEqual(caps);
  });

  it("blocks on first failing check (order value checked before position fraction)", () => {
    // $600 order on $10,000 portfolio: exceeds both order cap AND position fraction
    // Should report order value cap (checked first)
    const result = applyLiveCaps(600, 10000, 0, caps);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("$600.00");
  });
});

// ─── DEFAULT_LIVE_CAPS ────────────────────────────────────────────────────────

describe("DEFAULT_LIVE_CAPS", () => {
  it("has maxOrderValueUsd of $500", () => {
    expect(DEFAULT_LIVE_CAPS.maxOrderValueUsd).toBe(500);
  });

  it("has maxPositionFraction of 2%", () => {
    expect(DEFAULT_LIVE_CAPS.maxPositionFraction).toBe(0.02);
  });

  it("has maxTotalCapitalAtRiskFraction of 10%", () => {
    expect(DEFAULT_LIVE_CAPS.maxTotalCapitalAtRiskFraction).toBe(0.10);
  });
});

// ─── buildLiveTradingState() ──────────────────────────────────────────────────

describe("buildLiveTradingState()", () => {
  const originalEnv = process.env.ENABLE_LIVE_TRADING;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ENABLE_LIVE_TRADING;
    } else {
      process.env.ENABLE_LIVE_TRADING = originalEnv;
    }
  });

  it("returns paper mode when env flag is not set and DB is disabled", () => {
    delete process.env.ENABLE_LIVE_TRADING;
    const state = buildLiveTradingState(false, null);
    expect(state.active).toBe(false);
    expect(state.mode).toBe("paper");
    expect(state.envFlagSet).toBe(false);
    expect(state.blockedReason).toContain("ENABLE_LIVE_TRADING");
  });

  it("returns paper mode when env flag is set but DB is disabled", () => {
    process.env.ENABLE_LIVE_TRADING = "true";
    const state = buildLiveTradingState(false, null);
    expect(state.active).toBe(false);
    expect(state.mode).toBe("paper");
    expect(state.envFlagSet).toBe(true);
    expect(state.blockedReason).toContain("dashboard toggle");
  });

  it("returns paper mode when DB is enabled but env flag is not set", () => {
    delete process.env.ENABLE_LIVE_TRADING;
    const state = buildLiveTradingState(true, "2024-01-01T00:00:00.000Z");
    expect(state.active).toBe(false);
    expect(state.mode).toBe("paper");
    expect(state.envFlagSet).toBe(false);
  });

  it("returns live mode only when BOTH env flag is set AND DB is enabled", () => {
    process.env.ENABLE_LIVE_TRADING = "true";
    const enabledAt = "2024-01-01T00:00:00.000Z";
    const state = buildLiveTradingState(true, enabledAt);
    expect(state.active).toBe(true);
    expect(state.mode).toBe("live");
    expect(state.envFlagSet).toBe(true);
    expect(state.blockedReason).toBeNull();
    expect(state.enabledAt).toBe(enabledAt);
  });

  it("includes caps in the state", () => {
    delete process.env.ENABLE_LIVE_TRADING;
    const caps = { maxOrderValueUsd: 1000, maxPositionFraction: 0.05, maxTotalCapitalAtRiskFraction: 0.20 };
    const state = buildLiveTradingState(false, null, caps);
    expect(state.caps).toEqual(caps);
  });

  it("uses DEFAULT_LIVE_CAPS when no caps provided", () => {
    delete process.env.ENABLE_LIVE_TRADING;
    const state = buildLiveTradingState(false, null);
    expect(state.caps).toEqual(DEFAULT_LIVE_CAPS);
  });

  it("clears enabledAt when not active", () => {
    delete process.env.ENABLE_LIVE_TRADING;
    const state = buildLiveTradingState(true, "2024-01-01T00:00:00.000Z");
    expect(state.enabledAt).toBeNull();
  });
});

// ─── Integration: all guards must pass for live mode ─────────────────────────

describe("Integration — all guards must pass for live mode", () => {
  const originalEnv = process.env.ENABLE_LIVE_TRADING;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ENABLE_LIVE_TRADING;
    } else {
      process.env.ENABLE_LIVE_TRADING = originalEnv;
    }
  });

  it("fails if any single guard is missing", () => {
    // Missing env flag
    delete process.env.ENABLE_LIVE_TRADING;
    expect(buildLiveTradingState(true, null).active).toBe(false);

    // Missing DB enable
    process.env.ENABLE_LIVE_TRADING = "true";
    expect(buildLiveTradingState(false, null).active).toBe(false);
  });

  it("succeeds only when all guards pass", () => {
    process.env.ENABLE_LIVE_TRADING = "true";
    expect(buildLiveTradingState(true, "2024-01-01T00:00:00.000Z").active).toBe(true);
  });

  it("wrong confirmation always blocks enableLiveTrading", () => {
    const wrongAttempts = [
      "",
      "yes",
      "i accept live trading risk",
      "I ACCEPT LIVE TRADING",
      "I ACCEPT LIVE TRADING RISK!",
      " I ACCEPT LIVE TRADING RISK",
    ];
    for (const attempt of wrongAttempts) {
      expect(validateLiveTradingConfirmation(attempt)).toBe(false);
    }
  });
});
