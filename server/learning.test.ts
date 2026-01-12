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

describe("learning router", () => {
  it("getInsights returns performance data structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.learning.getInsights();

    // Verify the structure of the response
    expect(result).toHaveProperty("topTopics");
    expect(result).toHaveProperty("topKeywords");
    expect(result).toHaveProperty("topCategories");
    expect(result).toHaveProperty("contentTypePerformance");
    expect(result).toHaveProperty("categoryPerformance");
    expect(result).toHaveProperty("successfulPatterns");
    
    // Arrays should be returned (even if empty)
    expect(Array.isArray(result.topTopics)).toBe(true);
    expect(Array.isArray(result.topKeywords)).toBe(true);
    expect(Array.isArray(result.topCategories)).toBe(true);
  });

  it("updateScores completes successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.learning.updateScores();

    expect(result).toEqual({ success: true });
  });

  it("recordLearning accepts valid learning data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.learning.recordLearning({
      learningType: "topic",
      learningKey: "test-topic",
      impressions: 100,
      clicks: 10,
      conversions: 2,
      revenue: "50.00",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("success", true);
  });
});

describe("automation router", () => {
  it("status returns automation status structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.status();

    // Verify the structure
    expect(result).toHaveProperty("pendingContent");
    expect(result).toHaveProperty("generatingContent");
    expect(result).toHaveProperty("readyToPublish");
    expect(result).toHaveProperty("scheduledPublish");
    expect(result).toHaveProperty("totalArticles");
    expect(result).toHaveProperty("publishedArticles");
    expect(result).toHaveProperty("affiliateLinks");
    expect(result).toHaveProperty("isActive");
    
    // Numbers should be returned
    expect(typeof result.pendingContent).toBe("number");
    expect(typeof result.totalArticles).toBe("number");
  });

  it("getSettings returns settings or null", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.getSettings();

    // Should return settings object or undefined
    if (result) {
      expect(result).toHaveProperty("isEnabled");
      expect(result).toHaveProperty("articlesPerCycle");
      expect(result).toHaveProperty("cycleIntervalHours");
    }
  });

  it("saveSettings accepts valid settings with high article count", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.automation.saveSettings({
      isEnabled: true,
      articlesPerCycle: 50, // Test the increased max
      cycleIntervalHours: 24,
      autoPublish: true,
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("success", true);
  });
});
