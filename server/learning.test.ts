import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-learning",
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

describe("learning router", () => {
  it("getInsights returns performance data structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.learning.getInsights();

    // Should return an object with performance metrics
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("getRecommendations returns content suggestions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.learning.getRecommendations();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  }, 30000); // 30 second timeout for LLM calls
});

describe("automation router", () => {
  it("status returns automation status structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.status();

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    // Check for actual properties returned by the status endpoint
    expect(result).toHaveProperty("pendingContent");
  });

  it("getSettings returns settings or null", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.getSettings();

    // Should return settings object or undefined
    if (result) {
      expect(result).toHaveProperty("isEnabled");
      expect(result).toHaveProperty("articlesPerCycle");
      expect(result).toHaveProperty("cycleIntervalMinutes");
    }
  });

  it("saveSettings accepts valid settings with high article count", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.saveSettings({
      isEnabled: true,
      articlesPerCycle: 50,
      cycleIntervalHours: 24,
      autoPublish: true,
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("success", true);
  });
});
