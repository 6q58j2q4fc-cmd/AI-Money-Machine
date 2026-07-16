/**
 * server/tradingBot.execution.test.ts
 *
 * Unit tests for the paper-mode Alpaca execution adapter.
 * All outbound HTTP is mocked — no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PAPER_BASE_URL,
  LIVE_TRADING_DISABLED,
  submitPaperOrder,
  cancelPaperOrder,
  getOrderStatus,
  listOpenOrders,
  getPositions,
  getAccountInfo,
  cancelAllPaperOrders,
  type SubmitOrderParams,
  type AlpacaOrder,
  type AlpacaPosition,
  type AlpacaAccount,
} from "./tradingBot/execution";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<AlpacaOrder> = {}): AlpacaOrder {
  return {
    id: "ord-abc123",
    clientOrderId: "client-001",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:01Z",
    submittedAt: "2024-01-01T10:00:00Z",
    filledAt: null,
    expiredAt: null,
    canceledAt: null,
    assetClass: "us_equity",
    symbol: "AAPL",
    qty: "10",
    filledQty: "0",
    filledAvgPrice: null,
    orderClass: "simple",
    orderType: "market",
    type: "market",
    side: "buy",
    timeInForce: "day",
    limitPrice: null,
    stopPrice: null,
    status: "new",
    extendedHours: false,
    legs: null,
    ...overrides,
  };
}

function makePosition(overrides: Partial<AlpacaPosition> = {}): AlpacaPosition {
  return {
    assetId: "asset-001",
    symbol: "AAPL",
    exchange: "NASDAQ",
    assetClass: "us_equity",
    avgEntryPrice: "150.00",
    qty: "10",
    side: "long",
    marketValue: "1520.00",
    costBasis: "1500.00",
    unrealizedPl: "20.00",
    unrealizedPlpc: "0.0133",
    unrealizedIntradayPl: "5.00",
    unrealizedIntradayPlpc: "0.003",
    currentPrice: "152.00",
    lastdayPrice: "149.00",
    changeToday: "0.02",
    ...overrides,
  };
}

function makeAccount(overrides: Partial<AlpacaAccount> = {}): AlpacaAccount {
  return {
    id: "acct-001",
    accountNumber: "PA123456",
    status: "ACTIVE",
    currency: "USD",
    cash: "95000.00",
    portfolioValue: "100000.00",
    patternDayTrader: false,
    tradingBlocked: false,
    transfersBlocked: false,
    accountBlocked: false,
    createdAt: "2024-01-01T00:00:00Z",
    shortingEnabled: false,
    longMarketValue: "5000.00",
    shortMarketValue: "0.00",
    equity: "100000.00",
    lastEquity: "99500.00",
    multiplier: "1",
    buyingPower: "95000.00",
    initialMargin: "0.00",
    maintenanceMargin: "0.00",
    sma: "0.00",
    daytradeCount: 0,
    lastMaintenanceMargin: "0.00",
    dayTradingBuyingPower: "0.00",
    regtBuyingPower: "95000.00",
    ...overrides,
  };
}

// ─── Mock fetch globally ──────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  process.env.ALPACA_API_KEY = "PKTEST123";
  process.env.ALPACA_SECRET_KEY = "secrettest456";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockOkResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status,
    text: async () => JSON.stringify(body),
  });
}

function mockErrorResponse(body: unknown, status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: async () => JSON.stringify(body),
  });
}

function mockNetworkError(message = "Network request failed") {
  mockFetch.mockRejectedValueOnce(new Error(message));
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe("Constants", () => {
  it("PAPER_BASE_URL points to paper-api.alpaca.markets only", () => {
    expect(PAPER_BASE_URL).toBe("https://paper-api.alpaca.markets");
    expect(PAPER_BASE_URL).not.toContain("api.alpaca.markets/v2");
    // Must not be the live URL
    expect(PAPER_BASE_URL).not.toBe("https://api.alpaca.markets");
  });

  it("LIVE_TRADING_DISABLED is permanently true", () => {
    expect(LIVE_TRADING_DISABLED).toBe(true);
  });
});

// ─── submitPaperOrder ─────────────────────────────────────────────────────────

describe("submitPaperOrder", () => {
  it("submits a valid market buy order and returns the order", async () => {
    const order = makeOrder();
    mockOkResponse(order);

    const result = await submitPaperOrder({
      symbol: "AAPL",
      qty: 10,
      side: "buy",
      type: "market",
      timeInForce: "day",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.symbol).toBe("AAPL");
    expect(result.data.side).toBe("buy");
    expect(result.data.type).toBe("market");
  });

  it("always calls paper-api.alpaca.markets, never the live URL", async () => {
    mockOkResponse(makeOrder());
    await submitPaperOrder({ symbol: "TSLA", qty: 1, side: "buy", type: "market", timeInForce: "day" });

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("paper-api.alpaca.markets");
    expect(calledUrl).not.toContain("https://api.alpaca.markets");
  });

  it("sends correct Alpaca auth headers", async () => {
    mockOkResponse(makeOrder());
    await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "buy", type: "market", timeInForce: "day" });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["APCA-API-KEY-ID"]).toBe("PKTEST123");
    expect(headers["APCA-API-SECRET-KEY"]).toBe("secrettest456");
  });

  it("returns INVALID_QTY error for qty = 0", async () => {
    const result = await submitPaperOrder({ symbol: "AAPL", qty: 0, side: "buy", type: "market", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_QTY");
  });

  it("returns INVALID_QTY error for negative qty", async () => {
    const result = await submitPaperOrder({ symbol: "AAPL", qty: -5, side: "buy", type: "market", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_QTY");
  });

  it("returns INVALID_SYMBOL error for empty symbol", async () => {
    const result = await submitPaperOrder({ symbol: "", qty: 1, side: "buy", type: "market", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_SYMBOL");
  });

  it("returns MISSING_LIMIT_PRICE for limit order without limitPrice", async () => {
    const result = await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "buy", type: "limit", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MISSING_LIMIT_PRICE");
  });

  it("returns MISSING_STOP_PRICE for stop order without stopPrice", async () => {
    const result = await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "sell", type: "stop", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MISSING_STOP_PRICE");
  });

  it("submits a limit order with limitPrice in the body", async () => {
    mockOkResponse(makeOrder({ type: "limit", limitPrice: "150.00" }));
    const result = await submitPaperOrder({
      symbol: "AAPL",
      qty: 5,
      side: "buy",
      type: "limit",
      timeInForce: "gtc",
      limitPrice: 150.00,
    });
    expect(result.ok).toBe(true);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.limit_price).toBe("150");
    expect(sentBody.type).toBe("limit");
  });

  it("submits a stop_limit order with both prices in the body", async () => {
    mockOkResponse(makeOrder({ type: "stop_limit", limitPrice: "148.00", stopPrice: "149.00" }));
    const result = await submitPaperOrder({
      symbol: "AAPL",
      qty: 5,
      side: "sell",
      type: "stop_limit",
      timeInForce: "day",
      limitPrice: 148.00,
      stopPrice: 149.00,
    });
    expect(result.ok).toBe(true);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.limit_price).toBe("148");
    expect(sentBody.stop_price).toBe("149");
  });

  it("returns API_ERROR on HTTP 422 from Alpaca", async () => {
    mockErrorResponse({ code: 40010001, message: "insufficient qty" }, 422);
    const result = await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "buy", type: "market", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.statusCode).toBe(422);
  });

  it("returns NETWORK_ERROR on fetch rejection", async () => {
    mockNetworkError("ECONNREFUSED");
    const result = await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "buy", type: "market", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NETWORK_ERROR");
    expect(result.error.message).toContain("ECONNREFUSED");
  });

  it("returns NETWORK_ERROR when API keys are missing", async () => {
    delete process.env.ALPACA_API_KEY;
    const result = await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "buy", type: "market", timeInForce: "day" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("ALPACA_API_KEY");
  });
});

// ─── cancelPaperOrder ─────────────────────────────────────────────────────────

describe("cancelPaperOrder", () => {
  it("cancels an order and returns { canceled: true }", async () => {
    // Alpaca returns 204 No Content on cancel
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, text: async () => "" });
    const result = await cancelPaperOrder("ord-abc123");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.canceled).toBe(true);
  });

  it("sends DELETE to /v2/orders/{orderId}", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, text: async () => "" });
    await cancelPaperOrder("ord-xyz789");
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("/v2/orders/ord-xyz789");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("returns INVALID_ORDER_ID for empty orderId", async () => {
    const result = await cancelPaperOrder("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_ORDER_ID");
  });

  it("returns API_ERROR on HTTP 404", async () => {
    mockErrorResponse({ message: "order not found" }, 404);
    const result = await cancelPaperOrder("nonexistent-order");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.statusCode).toBe(404);
  });
});

// ─── getOrderStatus ───────────────────────────────────────────────────────────

describe("getOrderStatus", () => {
  it("returns the order for a valid orderId", async () => {
    const order = makeOrder({ status: "filled", filledQty: "10", filledAvgPrice: "151.50" });
    mockOkResponse(order);
    const result = await getOrderStatus("ord-abc123");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("filled");
    expect(result.data.filledAvgPrice).toBe("151.50");
  });

  it("sends GET to /v2/orders/{orderId}", async () => {
    mockOkResponse(makeOrder());
    await getOrderStatus("ord-abc123");
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("/v2/orders/ord-abc123");
    expect(mockFetch.mock.calls[0][1].method).toBeUndefined(); // default GET
  });
});

// ─── listOpenOrders ───────────────────────────────────────────────────────────

describe("listOpenOrders", () => {
  it("returns an array of open orders", async () => {
    mockOkResponse([makeOrder(), makeOrder({ id: "ord-def456", symbol: "TSLA" })]);
    const result = await listOpenOrders();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("returns empty array when no open orders", async () => {
    mockOkResponse([]);
    const result = await listOpenOrders();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  it("filters by symbol when provided", async () => {
    mockOkResponse([makeOrder({ symbol: "AAPL" })]);
    await listOpenOrders("AAPL");
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("symbols=AAPL");
  });
});

// ─── getPositions ─────────────────────────────────────────────────────────────

describe("getPositions", () => {
  it("returns an array of positions", async () => {
    mockOkResponse([makePosition(), makePosition({ symbol: "TSLA", qty: "5" })]);
    const result = await getPositions();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0].symbol).toBe("AAPL");
  });

  it("returns empty array when no positions", async () => {
    mockOkResponse([]);
    const result = await getPositions();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(0);
  });

  it("sends GET to /v2/positions", async () => {
    mockOkResponse([]);
    await getPositions();
    expect(mockFetch.mock.calls[0][0]).toContain("/v2/positions");
  });
});

// ─── getAccountInfo ───────────────────────────────────────────────────────────

describe("getAccountInfo", () => {
  it("returns account info with equity and buying power", async () => {
    mockOkResponse(makeAccount());
    const result = await getAccountInfo();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.equity).toBe("100000.00");
    expect(result.data.buyingPower).toBe("95000.00");
    expect(result.data.status).toBe("ACTIVE");
  });

  it("sends GET to /v2/account", async () => {
    mockOkResponse(makeAccount());
    await getAccountInfo();
    expect(mockFetch.mock.calls[0][0]).toContain("/v2/account");
  });

  it("returns API_ERROR on HTTP 403 (invalid key)", async () => {
    mockErrorResponse({ message: "forbidden" }, 403);
    const result = await getAccountInfo();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.statusCode).toBe(403);
  });
});

// ─── cancelAllPaperOrders ─────────────────────────────────────────────────────

describe("cancelAllPaperOrders", () => {
  it("cancels all open orders and returns canceledCount", async () => {
    // Alpaca returns array of cancel results
    mockOkResponse([{ id: "ord-1", status: 200 }, { id: "ord-2", status: 200 }]);
    const result = await cancelAllPaperOrders();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.canceledCount).toBe(2);
  });

  it("sends DELETE to /v2/orders", async () => {
    mockOkResponse([]);
    await cancelAllPaperOrders();
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain("/v2/orders");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});

// ─── Paper mode guard ─────────────────────────────────────────────────────────

describe("Paper mode guard (LIVE_TRADING_DISABLED)", () => {
  it("LIVE_TRADING_DISABLED cannot be set to false (it is a const literal true)", () => {
    // TypeScript const assertion prevents reassignment — this test documents the contract
    // The type is `true` (literal), not `boolean`
    const val: true = LIVE_TRADING_DISABLED;
    expect(val).toBe(true);
  });

  it("all public functions call paper-api.alpaca.markets, never the live URL", async () => {
    mockOkResponse(makeOrder());
    mockOkResponse([]);
    mockOkResponse([]);
    mockOkResponse(makeAccount());

    await submitPaperOrder({ symbol: "AAPL", qty: 1, side: "buy", type: "market", timeInForce: "day" });
    await listOpenOrders();
    await getPositions();
    await getAccountInfo();

    for (const call of mockFetch.mock.calls) {
      const url: string = call[0];
      expect(url).toContain("paper-api.alpaca.markets");
      expect(url).not.toBe("https://api.alpaca.markets");
    }
  });
});
