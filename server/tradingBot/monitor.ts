/**
 * server/tradingBot/monitor.ts
 *
 * Monitoring module for the AI Trading Bot.
 *
 * Responsibilities:
 *  - Aggregate a live snapshot by calling the Alpaca execution adapter
 *  - Compute running P&L from account + positions
 *  - Persist snapshots and log entries to the database
 *  - Read/write the kill switch state row
 *
 * All database I/O is isolated to the functions that explicitly accept a `db`
 * parameter so the pure computation helpers remain testable without a DB.
 */

import type { AlpacaAccount, AlpacaPosition } from "./execution";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";
export type LogSource = "bot" | "risk" | "execution" | "signal" | "backtest" | "monitor" | "system";

export interface LogEntry {
  level: LogLevel;
  source: LogSource;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: number;
}

export interface PositionSummary {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  costBasis: number;
}

export interface MonitorSnapshot {
  portfolioValue: number;
  cash: number;
  equity: number;
  dailyPnl: number;
  dailyPnlPct: number;
  totalPnl: number;
  drawdownPct: number;
  openPositions: number;
  killSwitchActive: boolean;
  positions: PositionSummary[];
  capturedAt: number;
}

export interface EquityPoint {
  ts: number;       // Unix ms
  equity: number;
  dailyPnl: number;
}

export interface KillSwitchState {
  active: boolean;
  reason: string;
  triggeredBy: string;
  triggeredAt: number | null;
  resetAt: number | null;
  updatedAt: number;
}

// ─── Pure computation helpers ─────────────────────────────────────────────────

/**
 * Parse a numeric string from Alpaca (which returns all numbers as strings).
 * Returns 0 if the value is null, undefined, or not parseable.
 */
export function parseAlpacaNum(value: string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert an AlpacaPosition to a PositionSummary with numeric fields.
 */
export function toPositionSummary(p: AlpacaPosition): PositionSummary {
  const qty = parseAlpacaNum(p.qty);
  const avgEntry = parseAlpacaNum(p.avgEntryPrice);
  const current = parseAlpacaNum(p.currentPrice);
  const marketValue = parseAlpacaNum(p.marketValue);
  const unrealizedPl = parseAlpacaNum(p.unrealizedPl);
  const costBasis = parseAlpacaNum(p.costBasis);
  const unrealizedPlPct = costBasis !== 0 ? (unrealizedPl / Math.abs(costBasis)) * 100 : 0;

  return {
    symbol: p.symbol,
    qty,
    side: p.side as "long" | "short",
    avgEntryPrice: avgEntry,
    currentPrice: current,
    marketValue,
    unrealizedPl,
    unrealizedPlPct,
    costBasis,
  };
}

/**
 * Compute the total unrealized P&L across all positions.
 */
export function computeTotalUnrealizedPnl(positions: PositionSummary[]): number {
  return positions.reduce((sum, p) => sum + p.unrealizedPl, 0);
}

/**
 * Compute daily P&L from account data.
 * Alpaca provides lastEquity (previous day close) and equity (current).
 */
export function computeDailyPnl(
  equity: number,
  lastEquity: number
): { dailyPnl: number; dailyPnlPct: number } {
  const dailyPnl = equity - lastEquity;
  const dailyPnlPct = lastEquity !== 0 ? (dailyPnl / lastEquity) * 100 : 0;
  return { dailyPnl, dailyPnlPct };
}

/**
 * Compute drawdown from peak equity.
 * Returns a positive percentage (e.g. 5.2 = 5.2% drawdown).
 */
export function computeDrawdown(equity: number, peakEquity: number): number {
  if (peakEquity <= 0) return 0;
  const dd = (peakEquity - equity) / peakEquity * 100;
  return Math.max(0, dd);
}

/**
 * Build a MonitorSnapshot from Alpaca account + positions data.
 * `peakEquity` is the historical high-water mark (loaded from DB or passed in).
 * `killSwitchActive` comes from the kill_switch_state table.
 */
export function buildSnapshot(
  account: AlpacaAccount,
  positions: AlpacaPosition[],
  peakEquity: number,
  killSwitchActive: boolean
): MonitorSnapshot {
  const equity = parseAlpacaNum(account.equity);
  const cash = parseAlpacaNum(account.cash);
  const portfolioValue = parseAlpacaNum(account.portfolioValue);
  const lastEquity = parseAlpacaNum(account.lastEquity);

  const { dailyPnl, dailyPnlPct } = computeDailyPnl(equity, lastEquity);
  const positionSummaries = positions.map(toPositionSummary);
  const totalPnl = computeTotalUnrealizedPnl(positionSummaries);
  const drawdownPct = computeDrawdown(equity, Math.max(peakEquity, equity));

  return {
    portfolioValue,
    cash,
    equity,
    dailyPnl,
    dailyPnlPct,
    totalPnl,
    drawdownPct,
    openPositions: positionSummaries.length,
    killSwitchActive,
    positions: positionSummaries,
    capturedAt: Date.now(),
  };
}

/**
 * Build a structured log entry (pure, no DB).
 */
export function buildLogEntry(
  level: LogLevel,
  source: LogSource,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  return { level, source, message, meta, createdAt: Date.now() };
}

/**
 * Build a new kill switch state object (pure, no DB).
 */
export function buildKillSwitchActivated(
  reason: string,
  triggeredBy: string
): Omit<KillSwitchState, "resetAt"> {
  const now = Date.now();
  return {
    active: true,
    reason,
    triggeredBy,
    triggeredAt: now,
    updatedAt: now,
  };
}

/**
 * Build a reset kill switch state object (pure, no DB).
 */
export function buildKillSwitchReset(): KillSwitchState {
  const now = Date.now();
  return {
    active: false,
    reason: "",
    triggeredBy: "",
    triggeredAt: null,
    resetAt: now,
    updatedAt: now,
  };
}

/**
 * Derive the peak equity from a series of equity points.
 */
export function computePeakEquity(points: EquityPoint[]): number {
  if (points.length === 0) return 0;
  return Math.max(...points.map((p) => p.equity));
}

/**
 * Format a log level for display (adds colour class hint).
 */
export function logLevelClass(level: LogLevel): string {
  switch (level) {
    case "debug":    return "text-muted-foreground";
    case "info":     return "text-blue-400";
    case "warn":     return "text-yellow-400";
    case "error":    return "text-red-400";
    case "critical": return "text-red-600 font-bold";
    default:         return "text-foreground";
  }
}

/**
 * Summarise a snapshot into a one-line status string for logs.
 */
export function snapshotToLogLine(snap: MonitorSnapshot): string {
  const sign = snap.dailyPnl >= 0 ? "+" : "";
  return (
    `equity=$${snap.equity.toFixed(2)} ` +
    `dailyPnl=${sign}$${snap.dailyPnl.toFixed(2)} (${sign}${snap.dailyPnlPct.toFixed(2)}%) ` +
    `positions=${snap.openPositions} ` +
    `drawdown=${snap.drawdownPct.toFixed(2)}% ` +
    `killSwitch=${snap.killSwitchActive ? "ACTIVE" : "off"}`
  );
}
