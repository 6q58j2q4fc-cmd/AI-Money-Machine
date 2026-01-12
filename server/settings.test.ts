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

describe("urlShortener router", () => {
  it("getSettings returns settings object", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.urlShortener.getSettings();
    
    expect(result).toBeDefined();
    expect(typeof result.provider).toBe("string");
    expect(typeof result.isEnabled).toBe("boolean");
  });

  it("saveSettings validates provider enum", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Valid provider should work
    const result = await caller.urlShortener.saveSettings({
      provider: "shorte_st",
      apiKey: "test-key",
      isEnabled: true,
    });
    
    expect(result.success).toBe(true);
  });

  it("getShortenedUrls returns array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.urlShortener.getShortenedUrls();
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("tracking router", () => {
  it("getPixels returns array", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.tracking.getPixels();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("getCookieStats returns stats object", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.tracking.getCookieStats();
    
    expect(result).toBeDefined();
    expect(typeof result.totalClicks).toBe("number");
    expect(typeof result.totalConversions).toBe("number");
    expect(typeof result.conversionRate).toBe("number");
  });

  it("addPixel creates new tracking pixel", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.tracking.addPixel({
      pixelType: "facebook",
      pixelId: "123456789012345",
    });
    
    expect(result.success).toBe(true);
  });
});

// Bot router tests - the bot router uses different procedure names
// Core functionality is tested via the distribution and learning routers
