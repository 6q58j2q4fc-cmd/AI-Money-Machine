/**
 * tradingBot/risk.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Risk Management Module
 *
 * Design principles:
 *   • Every exported function is a **pure function**: same inputs → same output,
 *     no side effects, no I/O.  DB persistence and alert dispatch are handled
 *     by the tRPC layer, not here.
 *   • Three independent guard layers, each returning a RiskDecision:
 *       1. Per-trade position sizing  — max 1% of capital at risk per trade
 *       2. Daily-loss limit           — hard stop when daily P&L < -threshold
 *       3. Max-drawdown kill switch   — halts all trading when portfolio DD
 *                                       exceeds the configured ceiling
 *   • evaluateTradeRisk() composes all three guards in priority order and
 *     returns the first HALT reason encountered.
 *
 * Units:
 *   • All monetary values are in USD (or the portfolio's base currency).
 *   • All percentage thresholds are fractions (0.01 = 1%, not 1).
 *   • Timestamps are Unix milliseconds.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Result of a single risk guard check. */
export interface RiskDecision {
  /** Whether the trade / bot should be allowed to proceed. */
  allowed: boolean;
  /** Machine-readable reason code when not allowed. */
  reason: RiskHaltReason | null;
  /** Human-readable explanation. */
  message: string;
  /** Severity level for alerting. */
  severity: "info" | "warning" | "critical";
}

export type RiskHaltReason =
  | "DAILY_LOSS_LIMIT"       // Daily P&L has breached the hard limit
  | "MAX_DRAWDOWN_KILL"      // Portfolio drawdown exceeded the kill-switch ceiling
  | "POSITION_SIZE_ZERO"     // Computed position size is 0 (price too high / capital too low)
  | "KILL_SWITCH_ACTIVE"     // Kill switch was manually or automatically activated
  | "INSUFFICIENT_CAPITAL";  // Available capital below minimum trade threshold

/** Immutable configuration for the risk module. */
export interface RiskConfig {
  /** Max fraction of portfolio at risk per trade (default 0.01 = 1%). */
  maxRiskPctPerTrade: number;
  /** Stop-loss distance as fraction of entry price (default 0.02 = 2%). */
  stopLossPct: number;
  /** Take-profit distance as fraction of entry price (default 0.04 = 4%). */
  takeProfitPct: number;
  /** Max fraction of portfolio in a single position (default 0.05 = 5%). */
  maxPositionPct: number;
  /** Minimum position size in shares (default 1). */
  minPositionSize: number;
  /** Hard daily-loss limit as fraction of starting-day capital (default 0.02 = 2%). */
  dailyLossLimitPct: number;
  /** Max drawdown from all-time peak before kill switch fires (default 0.10 = 10%). */
  maxDrawdownPct: number;
  /** Minimum capital required to place any trade (default $100). */
  minCapitalThreshold: number;
}

/** Snapshot of the portfolio's current risk state (computed, not stored). */
export interface RiskState {
  /** Current portfolio value. */
  portfolioValue: number;
  /** Portfolio value at the start of the current trading day (UTC). */
  dayStartValue: number;
  /** Realised P&L since dayStartValue was recorded. */
  dailyPnl: number;
  /** Daily P&L as a fraction of dayStartValue (negative = loss). */
  dailyPnlPct: number;
  /** All-time peak portfolio value observed. */
  peakValue: number;
  /** Current drawdown from peak as a positive fraction. */
  currentDrawdownPct: number;
  /** Whether the kill switch is currently active. */
  killSwitchActive: boolean;
  /** Reason the kill switch was activated (null if not active). */
  killSwitchReason: RiskHaltReason | null;
  /** Unix ms when the kill switch was activated (null if not active). */
  killSwitchActivatedAt: number | null;
}

/** Input required to size a single trade. */
export interface TradeSizingInput {
  /** Current entry price of the asset. */
  entryPrice: number;
  /** Available capital to deploy. */
  availableCapital: number;
  /** Risk config to apply. */
  config: RiskConfig;
}

/** Output of the position sizing calculation. */
export interface TradeSizingOutput {
  /** Number of shares/units to buy (integer, ≥ 0). */
  shares: number;
  /** Dollar value of the position. */
  positionValue: number;
  /** Dollar amount at risk (shares × entryPrice × stopLossPct). */
  capitalAtRisk: number;
  /** Fraction of portfolio at risk. */
  riskPct: number;
  /** Suggested stop-loss price. */
  stopLossPrice: number;
  /** Suggested take-profit price (2× risk by default). */
  takeProfitPrice: number;
}

/** A risk event to be persisted and/or alerted. */
export interface RiskEvent {
  id?: number;
  eventType: RiskHaltReason | "DAILY_RESET" | "KILL_SWITCH_ACKNOWLEDGED" | "CONFIG_UPDATED";
  severity: "info" | "warning" | "critical";
  message: string;
  portfolioValue: number;
  dailyPnl: number;
  drawdownPct: number;
  triggeredAt: number; // Unix ms
  acknowledgedAt: number | null;
}

// ─── Default configuration ────────────────────────────────────────────────────

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxRiskPctPerTrade:   0.01,   // 1% capital at risk per trade
  stopLossPct:          0.02,   // 2% stop-loss from entry
  takeProfitPct:        0.04,   // 4% take-profit (implied by 2:1 R:R)
  maxPositionPct:       0.05,   // max 5% of portfolio in one position
  minPositionSize:      1,
  dailyLossLimitPct:    0.02,   // halt if daily loss > 2% of day-start capital
  maxDrawdownPct:       0.10,   // kill switch at 10% drawdown from peak
  minCapitalThreshold:  100,    // minimum $100 to place any trade
};

// ─── Guard 1: Per-trade position sizing ──────────────────────────────────────

/**
 * Calculate the maximum position size that keeps capital at risk ≤ maxRiskPctPerTrade.
 *
 * Formula:
 *   sharesRaw = (portfolioValue × maxRiskPctPerTrade) / (entryPrice × stopLossPct)
 *   sharesCapped = min(sharesRaw, portfolioValue × maxPositionPct / entryPrice)
 *   shares = floor(sharesCapped)
 *
 * Returns 0 shares when the entry price is too high relative to available capital.
 */
export function calculateRiskAdjustedSize(input: TradeSizingInput): TradeSizingOutput {
  const { entryPrice, availableCapital, config } = input;

  if (entryPrice <= 0 || availableCapital <= 0) {
    return {
      shares: 0, positionValue: 0, capitalAtRisk: 0,
      riskPct: 0, stopLossPrice: entryPrice, takeProfitPrice: entryPrice,
    };
  }

  // Dollar amount we are willing to lose on this trade
  const maxRiskDollars = availableCapital * config.maxRiskPctPerTrade;

  // Shares that put exactly maxRiskDollars at risk given the stop-loss distance
  const sharesFromRisk = maxRiskDollars / (entryPrice * config.stopLossPct);

  // Shares that consume exactly maxPositionPct of the portfolio
  const sharesFromPosition = (availableCapital * config.maxPositionPct) / entryPrice;

  // Take the more conservative of the two limits, then floor to integer
  const sharesCapped = Math.min(sharesFromRisk, sharesFromPosition);
  const shares = Math.max(0, Math.floor(sharesCapped));

  // If we can't afford even one share, return zero
  if (shares < config.minPositionSize || shares * entryPrice > availableCapital) {
    return {
      shares: 0, positionValue: 0, capitalAtRisk: 0,
      riskPct: 0, stopLossPrice: entryPrice * (1 - config.stopLossPct),
      takeProfitPrice: entryPrice * (1 + config.takeProfitPct),
    };
  }

  const positionValue = shares * entryPrice;
  const capitalAtRisk = shares * entryPrice * config.stopLossPct;
  const riskPct = capitalAtRisk / availableCapital;
  const stopLossPrice = entryPrice * (1 - config.stopLossPct);
  const takeProfitPrice = entryPrice * (1 + config.takeProfitPct);

  return { shares, positionValue, capitalAtRisk, riskPct, stopLossPrice, takeProfitPrice };
}

// ─── Guard 2: Daily-loss limit ────────────────────────────────────────────────

/**
 * Check whether the current daily P&L has breached the hard daily-loss limit.
 *
 * @param dailyPnl         Realised P&L since the start of the trading day (negative = loss).
 * @param dayStartValue    Portfolio value at the start of the trading day.
 * @param config           Risk configuration.
 * @returns RiskDecision   ALLOW when within limit, HALT when limit is breached.
 */
export function checkDailyLossLimit(
  dailyPnl: number,
  dayStartValue: number,
  config: RiskConfig
): RiskDecision {
  if (dayStartValue <= 0) {
    return { allowed: true, reason: null, message: "No day-start value recorded.", severity: "info" };
  }

  const dailyLossPct = dailyPnl / dayStartValue; // negative when losing

  if (dailyLossPct <= -config.dailyLossLimitPct) {
    const lossAmt = Math.abs(dailyPnl).toFixed(2);
    const limitAmt = (dayStartValue * config.dailyLossLimitPct).toFixed(2);
    return {
      allowed: false,
      reason: "DAILY_LOSS_LIMIT",
      message: `Daily loss of $${lossAmt} has breached the hard limit of $${limitAmt} (${(config.dailyLossLimitPct * 100).toFixed(1)}% of day-start capital). Trading halted until next session reset.`,
      severity: "critical",
    };
  }

  const remaining = dayStartValue * config.dailyLossLimitPct + dailyPnl;
  const pctUsed = (-dailyLossPct / config.dailyLossLimitPct) * 100;

  if (pctUsed >= 80) {
    return {
      allowed: true,
      reason: null,
      message: `Daily loss is at ${pctUsed.toFixed(0)}% of the limit. $${remaining.toFixed(2)} remaining before halt.`,
      severity: "warning",
    };
  }

  return {
    allowed: true,
    reason: null,
    message: `Daily P&L: $${dailyPnl.toFixed(2)} (${(dailyLossPct * 100).toFixed(2)}%). Limit not breached.`,
    severity: "info",
  };
}

// ─── Guard 3: Max-drawdown kill switch ────────────────────────────────────────

/**
 * Check whether the portfolio drawdown from its all-time peak has exceeded the
 * kill-switch threshold.  Once triggered, the kill switch remains active until
 * explicitly acknowledged by the operator.
 *
 * @param currentValue     Current portfolio value.
 * @param peakValue        All-time peak portfolio value.
 * @param killSwitchActive Whether the kill switch is already active.
 * @param config           Risk configuration.
 * @returns RiskDecision   HALT if drawdown ≥ maxDrawdownPct or kill switch already active.
 */
export function checkMaxDrawdown(
  currentValue: number,
  peakValue: number,
  killSwitchActive: boolean,
  config: RiskConfig
): RiskDecision {
  // If kill switch was already tripped, keep halting until acknowledged
  if (killSwitchActive) {
    return {
      allowed: false,
      reason: "KILL_SWITCH_ACTIVE",
      message: "Kill switch is active. All trading is halted. Acknowledge to resume.",
      severity: "critical",
    };
  }

  if (peakValue <= 0) {
    return { allowed: true, reason: null, message: "No peak value recorded.", severity: "info" };
  }

  const drawdownPct = (peakValue - currentValue) / peakValue;

  if (drawdownPct >= config.maxDrawdownPct) {
    const ddAmt = (peakValue - currentValue).toFixed(2);
    return {
      allowed: false,
      reason: "MAX_DRAWDOWN_KILL",
      message: `Portfolio drawdown of ${(drawdownPct * 100).toFixed(2)}% ($${ddAmt}) has exceeded the kill-switch threshold of ${(config.maxDrawdownPct * 100).toFixed(1)}%. All trading halted. Manual acknowledgement required to resume.`,
      severity: "critical",
    };
  }

  const pctOfLimit = (drawdownPct / config.maxDrawdownPct) * 100;

  if (pctOfLimit >= 75) {
    return {
      allowed: true,
      reason: null,
      message: `Drawdown at ${(drawdownPct * 100).toFixed(2)}% — ${pctOfLimit.toFixed(0)}% of the kill-switch limit. Monitor closely.`,
      severity: "warning",
    };
  }

  return {
    allowed: true,
    reason: null,
    message: `Drawdown: ${(drawdownPct * 100).toFixed(2)}% (limit: ${(config.maxDrawdownPct * 100).toFixed(1)}%).`,
    severity: "info",
  };
}

// ─── Guard 4: Capital sufficiency ────────────────────────────────────────────

/**
 * Check whether available capital meets the minimum threshold to place a trade.
 */
export function checkCapitalSufficiency(
  availableCapital: number,
  config: RiskConfig
): RiskDecision {
  if (availableCapital < config.minCapitalThreshold) {
    return {
      allowed: false,
      reason: "INSUFFICIENT_CAPITAL",
      message: `Available capital ($${availableCapital.toFixed(2)}) is below the minimum threshold ($${config.minCapitalThreshold.toFixed(2)}).`,
      severity: "warning",
    };
  }
  return {
    allowed: true,
    reason: null,
    message: `Capital sufficient: $${availableCapital.toFixed(2)}.`,
    severity: "info",
  };
}

// ─── Composite evaluator ──────────────────────────────────────────────────────

/**
 * Run all risk guards in priority order and return the first HALT decision.
 * If all guards pass, returns an ALLOW decision with the sizing output.
 *
 * Priority order:
 *   1. Kill switch (already active)
 *   2. Max drawdown (may activate kill switch)
 *   3. Daily loss limit
 *   4. Capital sufficiency
 *   5. Position size (returns 0 shares)
 */
export function evaluateTradeRisk(
  entryPrice: number,
  state: RiskState,
  config: RiskConfig
): { decision: RiskDecision; sizing: TradeSizingOutput | null } {
  // 1. Kill switch
  const killCheck = checkMaxDrawdown(
    state.portfolioValue,
    state.peakValue,
    state.killSwitchActive,
    config
  );
  if (!killCheck.allowed) {
    return { decision: killCheck, sizing: null };
  }

  // 2. Daily loss limit
  const dailyCheck = checkDailyLossLimit(state.dailyPnl, state.dayStartValue, config);
  if (!dailyCheck.allowed) {
    return { decision: dailyCheck, sizing: null };
  }

  // 3. Capital sufficiency
  const capitalCheck = checkCapitalSufficiency(state.portfolioValue, config);
  if (!capitalCheck.allowed) {
    return { decision: capitalCheck, sizing: null };
  }

  // 4. Position sizing
  const sizing = calculateRiskAdjustedSize({
    entryPrice,
    availableCapital: state.portfolioValue,
    config,
  });

  if (sizing.shares === 0) {
    return {
      decision: {
        allowed: false,
        reason: "POSITION_SIZE_ZERO",
        message: `Cannot open a position: entry price $${entryPrice.toFixed(2)} is too high relative to available capital $${state.portfolioValue.toFixed(2)} and risk limits.`,
        severity: "warning",
      },
      sizing,
    };
  }

  // All guards passed — determine the most severe warning to surface
  const warnings = [killCheck, dailyCheck, capitalCheck].filter(d => d.severity === "warning");
  const worstWarning = warnings[0] ?? { allowed: true, reason: null, message: "All risk checks passed.", severity: "info" as const };

  return {
    decision: {
      allowed: true,
      reason: null,
      message: worstWarning.message,
      severity: worstWarning.severity,
    },
    sizing,
  };
}

// ─── State helpers ────────────────────────────────────────────────────────────

/**
 * Compute a fresh RiskState snapshot from raw inputs.
 * This is a pure function — it does not read from or write to the database.
 */
export function buildRiskState(params: {
  portfolioValue: number;
  dayStartValue: number;
  peakValue: number;
  realisedDailyPnl: number;
  killSwitchActive: boolean;
  killSwitchReason: RiskHaltReason | null;
  killSwitchActivatedAt: number | null;
}): RiskState {
  const {
    portfolioValue, dayStartValue, peakValue,
    realisedDailyPnl, killSwitchActive, killSwitchReason, killSwitchActivatedAt,
  } = params;

  const dailyPnl = realisedDailyPnl;
  const dailyPnlPct = dayStartValue > 0 ? dailyPnl / dayStartValue : 0;
  const currentDrawdownPct = peakValue > 0
    ? Math.max(0, (peakValue - portfolioValue) / peakValue)
    : 0;

  return {
    portfolioValue,
    dayStartValue,
    dailyPnl,
    dailyPnlPct,
    peakValue,
    currentDrawdownPct,
    killSwitchActive,
    killSwitchReason,
    killSwitchActivatedAt,
  };
}

/**
 * Determine whether a new kill switch event should be created based on the
 * current state and the result of checkMaxDrawdown.
 *
 * Returns the updated killSwitchActive flag and the reason to persist.
 */
export function resolveKillSwitchTransition(
  state: RiskState,
  drawdownDecision: RiskDecision
): { shouldActivate: boolean; reason: RiskHaltReason | null } {
  if (state.killSwitchActive) {
    // Already active — no new transition
    return { shouldActivate: false, reason: null };
  }
  if (!drawdownDecision.allowed && drawdownDecision.reason === "MAX_DRAWDOWN_KILL") {
    return { shouldActivate: true, reason: "MAX_DRAWDOWN_KILL" };
  }
  return { shouldActivate: false, reason: null };
}

/**
 * Build a RiskEvent record for persistence.
 */
export function buildRiskEvent(
  eventType: RiskEvent["eventType"],
  state: RiskState,
  message: string,
  severity: RiskEvent["severity"]
): Omit<RiskEvent, "id"> {
  return {
    eventType,
    severity,
    message,
    portfolioValue: state.portfolioValue,
    dailyPnl: state.dailyPnl,
    drawdownPct: state.currentDrawdownPct,
    triggeredAt: Date.now(),
    acknowledgedAt: null,
  };
}

/**
 * Compute the updated peak value after a portfolio update.
 * Pure function — returns the new peak (max of current peak and new value).
 */
export function updatePeak(currentPeak: number, newValue: number): number {
  return Math.max(currentPeak, newValue);
}

/**
 * Determine whether the daily state should be reset based on the current
 * timestamp vs. the last reset timestamp.
 *
 * Resets occur at UTC midnight.
 */
export function shouldResetDailyState(
  lastResetAt: number,
  nowMs: number = Date.now()
): boolean {
  const lastResetDay = new Date(lastResetAt).toISOString().slice(0, 10);
  const todayDay = new Date(nowMs).toISOString().slice(0, 10);
  return lastResetDay !== todayDay;
}
