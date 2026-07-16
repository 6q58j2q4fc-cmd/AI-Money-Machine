/**
 * server/tradingBot/execution.ts
 *
 * Paper-mode-only execution adapter for Alpaca Markets.
 *
 * ─── SAFETY CONTRACT ───────────────────────────────────────────────────────
 *  • PAPER_BASE_URL is the ONLY base URL used.  The live URL is never referenced.
 *  • LIVE_TRADING_DISABLED = true is checked before every outbound HTTP call.
 *    If it is ever set to false the call throws immediately.
 *  • The module exports NO function that accepts a base-URL override.
 *  • Withdrawal operations are not implemented — the adapter only submits,
 *    queries, and cancels orders.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * All functions are async and return typed results.  They do NOT touch the
 * database — persistence is handled by the tRPC procedures in routers.ts.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** The only base URL this module will ever contact. */
export const PAPER_BASE_URL = "https://paper-api.alpaca.markets" as const;

/**
 * Hard kill-switch.  Must remain `true` at all times.
 * Any code path that sets this to `false` will throw at the call site.
 */
export const LIVE_TRADING_DISABLED = true as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type TimeInForce = "day" | "gtc" | "ioc" | "fok";
export type OrderStatus =
  | "new"
  | "partially_filled"
  | "filled"
  | "done_for_day"
  | "canceled"
  | "expired"
  | "replaced"
  | "pending_cancel"
  | "pending_replace"
  | "held"
  | "accepted"
  | "pending_new"
  | "accepted_for_bidding"
  | "stopped"
  | "rejected"
  | "suspended"
  | "calculated";

export interface SubmitOrderParams {
  symbol: string;
  qty: number;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  /** Required when type = 'limit' or 'stop_limit' */
  limitPrice?: number;
  /** Required when type = 'stop' or 'stop_limit' */
  stopPrice?: number;
  /** Optional client-supplied idempotency key */
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

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Enforce the paper-mode guard before every outbound call.
 * Throws if LIVE_TRADING_DISABLED is somehow false.
 */
function assertPaperMode(): void {
  if (!LIVE_TRADING_DISABLED) {
    throw new Error(
      "[EXECUTION ADAPTER] LIVE_TRADING_DISABLED is false. " +
      "Live trading is not permitted. Aborting."
    );
  }
}

/**
 * Build Alpaca API request headers from environment secrets.
 * Keys are read at call time (not module load time) so tests can inject them.
 */
function buildHeaders(): Record<string, string> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  if (!key || !secret) {
    throw new Error(
      "[EXECUTION ADAPTER] ALPACA_API_KEY or ALPACA_SECRET_KEY is not set. " +
      "Configure paper trading keys in project secrets."
    );
  }
  return {
    "APCA-API-KEY-ID": key,
    "APCA-API-SECRET-KEY": secret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Thin fetch wrapper that enforces paper mode and returns a typed result.
 */
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
      error: {
        code: "NETWORK_ERROR",
        message: err?.message ?? "Network request failed",
      },
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

/**
 * Submit a paper order to Alpaca.
 *
 * Only reaches paper-api.alpaca.markets — live URL is never used.
 */
export async function submitPaperOrder(
  params: SubmitOrderParams
): Promise<ExecutionResult<AlpacaOrder>> {
  assertPaperMode();

  if (params.qty <= 0 || !Number.isFinite(params.qty)) {
    return {
      ok: false,
      error: { code: "INVALID_QTY", message: `qty must be a positive finite number, got ${params.qty}` },
    };
  }
  if (!params.symbol || params.symbol.trim() === "") {
    return {
      ok: false,
      error: { code: "INVALID_SYMBOL", message: "symbol must not be empty" },
    };
  }
  if ((params.type === "limit" || params.type === "stop_limit") && !params.limitPrice) {
    return {
      ok: false,
      error: { code: "MISSING_LIMIT_PRICE", message: `limitPrice is required for order type '${params.type}'` },
    };
  }
  if ((params.type === "stop" || params.type === "stop_limit") && !params.stopPrice) {
    return {
      ok: false,
      error: { code: "MISSING_STOP_PRICE", message: `stopPrice is required for order type '${params.type}'` },
    };
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

  return alpacaFetch<AlpacaOrder>("/v2/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Cancel an open paper order by its Alpaca order ID.
 */
export async function cancelPaperOrder(
  orderId: string
): Promise<ExecutionResult<{ canceled: true }>> {
  assertPaperMode();
  if (!orderId) {
    return { ok: false, error: { code: "INVALID_ORDER_ID", message: "orderId must not be empty" } };
  }
  const result = await alpacaFetch<void>(`/v2/orders/${orderId}`, { method: "DELETE" });
  if (!result.ok) return result as ExecutionResult<{ canceled: true }>;
  // 204 No Content on success
  return { ok: true, data: { canceled: true } };
}

/**
 * Fetch the status of a single paper order.
 */
export async function getOrderStatus(
  orderId: string
): Promise<ExecutionResult<AlpacaOrder>> {
  assertPaperMode();
  if (!orderId) {
    return { ok: false, error: { code: "INVALID_ORDER_ID", message: "orderId must not be empty" } };
  }
  return alpacaFetch<AlpacaOrder>(`/v2/orders/${orderId}`);
}

/**
 * List all open paper orders, optionally filtered by symbol.
 */
export async function listOpenOrders(
  symbol?: string
): Promise<ExecutionResult<AlpacaOrder[]>> {
  assertPaperMode();
  const params = new URLSearchParams({ status: "open", limit: "100" });
  if (symbol) params.set("symbols", symbol.toUpperCase());
  return alpacaFetch<AlpacaOrder[]>(`/v2/orders?${params.toString()}`);
}

/**
 * Fetch all current paper positions.
 */
export async function getPositions(): Promise<ExecutionResult<AlpacaPosition[]>> {
  assertPaperMode();
  return alpacaFetch<AlpacaPosition[]>("/v2/positions");
}

/**
 * Fetch paper account information (equity, buying power, cash, etc.).
 */
export async function getAccountInfo(): Promise<ExecutionResult<AlpacaAccount>> {
  assertPaperMode();
  return alpacaFetch<AlpacaAccount>("/v2/account");
}

/**
 * Cancel ALL open paper orders.  Use with caution.
 */
export async function cancelAllPaperOrders(): Promise<ExecutionResult<{ canceledCount: number }>> {
  assertPaperMode();
  const result = await alpacaFetch<AlpacaOrder[]>("/v2/orders", { method: "DELETE" });
  if (!result.ok) return result as ExecutionResult<{ canceledCount: number }>;
  const arr = Array.isArray(result.data) ? result.data : [];
  return { ok: true, data: { canceledCount: arr.length } };
}

/**
 * Close a single paper position by symbol.
 */
export async function closePaperPosition(
  symbol: string
): Promise<ExecutionResult<AlpacaOrder>> {
  assertPaperMode();
  if (!symbol) {
    return { ok: false, error: { code: "INVALID_SYMBOL", message: "symbol must not be empty" } };
  }
  return alpacaFetch<AlpacaOrder>(`/v2/positions/${symbol.toUpperCase()}`, { method: "DELETE" });
}
