import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("distribution router", () => {
  it("stats returns distribution statistics structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.distribution.stats();
    
    expect(result).toBeDefined();
    // Values may be numbers or BigInt from SQL aggregations
    expect(result.total !== undefined).toBe(true);
    expect(result.published !== undefined).toBe(true);
    expect(result.pending !== undefined).toBe(true);
    expect(result.failed !== undefined).toBe(true);
  });

  it("list returns array of distributions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.distribution.list({});
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("bot router", () => {
  it("stats returns bot learning statistics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.bot.stats();
    
    expect(result).toBeDefined();
    // Values may be numbers or BigInt from SQL aggregations
    expect(result.totalDecisions !== undefined).toBe(true);
    expect(result.successRate !== undefined).toBe(true);
    expect(result.avgConfidence !== undefined).toBe(true);
  });

  it("recentDecisions returns array of decisions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.bot.recentDecisions({});
    
    expect(Array.isArray(result)).toBe(true);
  });
});
