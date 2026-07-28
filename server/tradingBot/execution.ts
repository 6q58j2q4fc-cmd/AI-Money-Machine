/**
 * server/tradingBot/execution.ts
 *
 * Execution adapter for Alpaca Markets — PAPER MODE by default.
 *
 * ─── SAFETY CONTRACT ───────────────────────────────────────────────────────
 *  LAYER 1 — Compile-time constant:
 *    LIVE_TRADING_DISABLED = true is a TypeScript literal.  It cannot be
 *    assigned false without a compile error.  assertPaperMode() throws if it
 *    is somehow false at runtime.
 *
 *  LAYER 2 — Environment flag:
 *    isLiveTradingEnvEnabled() returns true ONLY when the ENABLE_LIVE_TRADING
 *    env var is exactly the string "true".  Any other value returns false.
 *
 *  LAYER 3 — Runtime state (DB-persisted):
 *    Live trading can only be active when BOTH Layer 2 is true AND the
 *    live_trading_config row in the database has enabled=true.  The DB row
 *    is only written after the user provides the correct typed confirmation.
 *
 *  LAYER 4 — Hard caps (enforced on every live order):
 *    • Max order value:            $500 per single order
 *    • Max position size:          2% of portfolio value
 *    • Max total capital at risk:  10% of portfolio value
 *    These caps are enforced by applyLiveCaps() before any order is submitted.
 *
 *  LAYER 5 — No withdrawal operations:
 *    The adapter only submits, queries, and cancels orders.
 *
 *  LAYER 6 — URL isolation:
 *    Paper mode uses PAPER_BASE_URL only.
 *    The module exports NO function that accepts a base-URL override.
 * ───────────────────────────────────────────────────────────────────────────
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Paper trading base URL — always safe, no real money. */
export const PAPER_BASE_URL = "https://paper-api.alpaca.markets" as const;

/** Live trading base URL — referenced for documentation only; not used by any function. */
export const LIVE_BASE_URL = "https://api.alpaca.markets" as const;

/**
 * Compile-time kill-switch.  Must remain `true` at all times.
 * Any code path that sets this to `false` will throw at the call site.
 */
export const LIVE_TRADING_DISABLED = true as const;

/** Exact string the user must type to enable live trading via the UI. */
export const LIVE_TRADING_CONFIRMATION = "I ACCEPT LIVE TRADING RISK" as const;

// ─── Hard caps ────────────────────────────────────────────────────────────────

export interface LiveTradingCaps {
  /** Maximum value (USD) of a single live order. Default: $500. */
  maxOrderValueUsd: number;
  /** Maximum position size as a fraction of portfolio value. Default: 0.02 (2%). */
  maxPositionFraction: number;
  /** Maximum total capital at risk as a fraction of portfolio value. Default: 0.10 (10%). */
  maxTotalCapitalAtRiskFraction: number;
}

export const DEFAULT_LIVE_CAPS: LiveTradingCaps = {
  maxOrderValueUsd: 500,
  maxPositionFraction: 0.02,
  maxTotalCapitalAtRiskFraction: 0.10,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type TradingMode = "paper" | "live";
export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type TimeInForce = "day" | "gtc" | "ioc" | "fok";
export type OrderStatus =
  | "new" | "partially_filled" | "filled" | "done_for_day"
  | "canceled" | "expired" | "replaced" | "pending_cancel"
  | "pending_replace" | "held" | "accepted" | "pending_new"
  | "accepted_for_bidding" | "stopped" | "rejected" | "suspended" | "calculated";

export interface SubmitOrderParams {
  symbol: string;
  qty: number;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  limitPrice?: number;
  stopPrice?: number;
  clientOrderId?: string;
}

export interface AlpacaOrder {
  id: string;
  clientOrderId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
  filledAt: string | null;
  expiredAt: string | null;
  canceledAt: string | null;
  assetClass: string;
  symbol: string;
  qty: string;
  filledQty: string;
  filledAvgPrice: string | null;
  orderClass: string;
  orderType: string;
  type: string;
  side: string;
  timeInForce: string;
  limitPrice: string | null;
  stopPrice: string | null;
  status: OrderStatus;
  extendedHours: boolean;
  legs: AlpacaOrder[] | null;
}

export interface AlpacaPosition {
  assetId: string;
  symbol: string;
  exchange: string;
  assetClass: string;
  avgEntryPrice: string;
  qty: string;
  qtyAvailable: string;
  side: "long" | "short";
  marketValue: string;
  costBasis: string;
  unrealizedPl: string;
  unrealizedPlpc: string;
  unrealizedIntradayPl: string;
  unrealizedIntradayPlpc: string;
  currentPrice: string;
  lastdayPrice: string;
  changeToday: string;
}

export interface AlpacaAccount {
  id: string;
  accountNumber: string;
  status: string;
  currency: string;
  cash: string;
  portfolioValue: string;
  patternDayTrader: boolean;
  tradingBlocked: boolean;
  transfersBlocked: boolean;
  accountBlocked: boolean;
  createdAt: string;
  shortingEnabled: boolean;
  longMarketValue: string;
  shortMarketValue: string;
  equity: string;
  lastEquity: string;
  multiplier: string;
  buyingPower: string;
  initialMargin: string;
  maintenanceMargin: string;
  sma: string;
  daytradeCount: number;
  lastMaintenanceMargin: string;
  daytradeCount2: number;
  daytradeCount3: number;
  daytradeCount4: number;
  daytradeCount5: number;
  cryptoStatus: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  statusCode?: number;
}

export type ExecutionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ExecutionError };

export interface CapCheckResult {
  allowed: boolean;
  reason?: string;
  caps: LiveTradingCaps;
}

export interface LiveTradingState {
  active: boolean;
  envFlagSet: boolean;
  mode: TradingMode;
  caps: LiveTradingCaps;
  enabledAt: string | null;
  blockedReason: string | null;
}

// ─── Layer 2: Environment flag ────────────────────────────────────────────────

/**
 * Returns true ONLY when ENABLE_LIVE_TRADING env var is exactly "true".
 * Read at call time so tests can inject the env var.
 */
export function isLiveTradingEnvEnabled(): boolean {
  return process.env.ENABLE_LIVE_TRADING === "true";
}

// ─── Layer 3: Typed confirmation ──────────────────────────────────────────────

/**
 * Validates the user-supplied confirmation string.
 * Must exactly match LIVE_TRADING_CONFIRMATION (case-sensitive, no trim).
 */
export function validateLiveTradingConfirmation(confirmation: string): boolean {
  return confirmation === LIVE_TRADING_CONFIRMATION;
}

// ─── Layer 4: Hard cap enforcement ───────────────────────────────────────────

/**
 * Checks whether a proposed order passes the live-trading hard caps.
 *
 * @param orderValueUsd      price × qty for the proposed order
 * @param portfolioValue     current portfolio value from Alpaca account
 * @param totalCapitalAtRisk sum of all current open position market values
 * @param caps               cap config (defaults to DEFAULT_LIVE_CAPS)
 */
export function applyLiveCaps(
  orderValueUsd: number,
  portfolioValue: number,
  totalCapitalAtRisk: number,
  caps: LiveTradingCaps = DEFAULT_LIVE_CAPS
): CapCheckResult {
  if (orderValueUsd > caps.maxOrderValueUsd) {
    return {
      allowed: false,
      reason: `Order value $${orderValueUsd.toFixed(2)} exceeds hard cap of $${caps.maxOrderValueUsd.toFixed(2)} per order`,
      caps,
    };
  }
  if (portfolioValue > 0) {
    const positionFraction = orderValueUsd / portfolioValue;
    if (positionFraction > caps.maxPositionFraction) {
      return {
        allowed: false,
        reason: `Order is ${(positionFraction * 100).toFixed(2)}% of portfolio, exceeds hard cap of ${(caps.maxPositionFraction * 100).toFixed(0)}%`,
        caps,
      };
    }
    const newTotalAtRisk = totalCapitalAtRisk + orderValueUsd;
    const totalFraction = newTotalAtRisk / portfolioValue;
    if (totalFraction > caps.maxTotalCapitalAtRiskFraction) {
      return {
        allowed: false,
        reason: `Total capital at risk would be ${(totalFraction * 100).toFixed(2)}% of portfolio, exceeds hard cap of ${(caps.maxTotalCapitalAtRiskFraction * 100).toFixed(0)}%`,
        caps,
      };
    }
  }
  return { allowed: true, caps };
}

// ─── Live trading state builder ───────────────────────────────────────────────

/**
 * Build a LiveTradingState snapshot from current env and DB state.
 * Pure function — no I/O.
 */
export function buildLiveTradingState(
  dbEnabled: boolean,
  enabledAt: string | null,
  caps: LiveTradingCaps = DEFAULT_LIVE_CAPS
): LiveTradingState {
  const envFlagSet = isLiveTradingEnvEnabled();
  const active = envFlagSet && dbEnabled;

  let blockedReason: string | null = null;
  if (!envFlagSet) {
    blockedReason = "ENABLE_LIVE_TRADING environment variable is not set to 'true'";
  } else if (!dbEnabled) {
    blockedReason = "Live trading has not been enabled via the dashboard toggle";
  }

  return {
    active,
    envFlagSet,
    mode: active ? "live" : "paper",
    caps,
    enabledAt: active ? enabledAt : null,
    blockedReason,
  };
}

// ─── Layer 1: Compile-time guard ──────────────────────────────────────────────

function assertPaperMode(): void {
  if (!LIVE_TRADING_DISABLED) {
    throw new Error(
      "[EXECUTION ADAPTER] LIVE_TRADING_DISABLED is false. " +
      "Live trading is not permitted via this code path. Aborting."
    );
  }
}

// ─── Auth headers ─────────────────────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) {
    throw new Error(
      "[EXECUTION ADAPTER] ALPACA_API_KEY or ALPACA_SECRET_KEY is not set."
    );
  }
  return {
    "APCA-API-KEY-ID": key,
    "APCA-API-SECRET-KEY": secret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

async function alpacaFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ExecutionResult<T>> {
  assertPaperMode();
  const url = `${PAPER_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...buildHeaders(), ...(options.headers ?? {}) },
    });
  } catch (err: any) {
    return {
      ok: false,
      error: { code: "NETWORK_ERROR", message: err?.message ?? "Network request failed" },
    };
  }
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: body?.code ?? "API_ERROR",
        message: body?.message ?? `HTTP ${res.status}`,
        statusCode: res.status,
      },
    };
  }
  return { ok: true, data: body as T };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function submitPaperOrder(
  params: SubmitOrderParams
): Promise<ExecutionResult<AlpacaOrder>> {
  assertPaperMode();
  if (params.qty <= 0 || !Number.isFinite(params.qty)) {
    return { ok: false, error: { code: "INVALID_QTY", message: `qty must be a positive finite number, got ${params.qty}` } };
  }
  if (!params.symbol || params.symbol.trim() === "") {
    return { ok: false, error: { code: "INVALID_SYMBOL", message: "symbol must not be empty" } };
  }
  if ((params.type === "limit" || params.type === "stop_limit") && !params.limitPrice) {
    return { ok: false, error: { code: "MISSING_LIMIT_PRICE", message: `limitPrice is required for order type '${params.type}'` } };
  }
  if ((params.type === "stop" || params.type === "stop_limit") && !params.stopPrice) {
    return { ok: false, error: { code: "MISSING_STOP_PRICE", message: `stopPrice is required for order type '${params.type}'` } };
  }
  const body: Record<string, unknown> = {
    symbol: params.symbol.toUpperCase(),
    qty: String(Math.floor(params.qty)),
    side: params.side,
    type: params.type,
    time_in_force: params.timeInForce,
  };
  if (params.limitPrice != null) body.limit_price = String(params.limitPrice);
  if (params.stopPrice != null) body.stop_price = String(params.stopPrice);
  if (params.clientOrderId) body.client_order_id = params.clientOrderId;
  return alpacaFetch<AlpacaOrder>("/v2/orders", { method: "POST", body: JSON.stringify(body) });
}

export async function cancelPaperOrder(orderId: string): Promise<ExecutionResult<{ canceled: true }>> {
  assertPaperMode();
  if (!orderId) return { ok: false, error: { code: "INVALID_ORDER_ID", message: "orderId must not be empty" } };
  const result = await alpacaFetch<void>(`/v2/orders/${orderId}`, { method: "DELETE" });
  if (!result.ok) return result as ExecutionResult<{ canceled: true }>;
  return { ok: true, data: { canceled: true } };
}

export async function getOrderStatus(orderId: string): Promise<ExecutionResult<AlpacaOrder>> {
  assertPaperMode();
  if (!orderId) return { ok: false, error: { code: "INVALID_ORDER_ID", message: "orderId must not be empty" } };
  return alpacaFetch<AlpacaOrder>(`/v2/orders/${orderId}`);
}

export async function listOpenOrders(symbol?: string): Promise<ExecutionResult<AlpacaOrder[]>> {
  assertPaperMode();
  const params = new URLSearchParams({ status: "open", limit: "100" });
  if (symbol) params.set("symbols", symbol.toUpperCase());
  return alpacaFetch<AlpacaOrder[]>(`/v2/orders?${params.toString()}`);
}

export async function getPositions(): Promise<ExecutionResult<AlpacaPosition[]>> {
  assertPaperMode();
  return alpacaFetch<AlpacaPosition[]>("/v2/positions");
}

export async function getAccountInfo(): Promise<ExecutionResult<AlpacaAccount>> {
  assertPaperMode();
  return alpacaFetch<AlpacaAccount>("/v2/account");
}

export async function cancelAllPaperOrders(): Promise<ExecutionResult<{ canceledCount: number }>> {
  assertPaperMode();
  const result = await alpacaFetch<AlpacaOrder[]>("/v2/orders", { method: "DELETE" });
  if (!result.ok) return result as ExecutionResult<{ canceledCount: number }>;
  const arr = Array.isArray(result.data) ? result.data : [];
  return { ok: true, data: { canceledCount: arr.length } };
}

export async function closePaperPosition(symbol: string): Promise<ExecutionResult<AlpacaOrder>> {
  assertPaperMode();
  if (!symbol) return { ok: false, error: { code: "INVALID_SYMBOL", message: "symbol must not be empty" } };
  return alpacaFetch<AlpacaOrder>(`/v2/positions/${symbol.toUpperCase()}`, { method: "DELETE" });
}
