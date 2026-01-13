import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("hiveMind router", () => {
  describe("getState", () => {
    it("returns hive mind state with page contexts", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.getState();

      // The actual return type has pageContexts, objectivesCount, lastUpdated, conversationCount
      expect(result).toHaveProperty("pageContexts");
      expect(result).toHaveProperty("objectivesCount");
      expect(result).toHaveProperty("lastUpdated");
      expect(result).toHaveProperty("conversationCount");
      expect(typeof result.pageContexts).toBe("object");
      expect(typeof result.objectivesCount).toBe("number");
    });
  });

  describe("initPage", () => {
    it("initializes a valid page context and returns page info", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Use a valid page ID from PAGE_DEFINITIONS
      const result = await caller.hiveMind.initPage({
        pageId: "dashboard",
        currentState: { test: true },
      });

      // initPage returns the page context object with pageName
      expect(result).toHaveProperty("pageName");
      expect(result.pageName).toBe("Dashboard");
    });

    it("throws error for unknown page", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.hiveMind.initPage({
          pageId: "unknown-page",
          currentState: {},
        })
      ).rejects.toThrow("Unknown page");
    });
  });

  describe("logEvent", () => {
    it("logs a user action event and returns the log ID", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.logEvent({
        eventType: "user_action",
        message: "Test user action event",
      });

      // logEvent returns the log ID (a number)
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("logs an article event with metadata", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.logEvent({
        eventType: "article_created",
        message: "New article was created",
        articleId: 123,
        metadata: {
          articleTitle: "Test Article",
          source: "test",
        },
      });

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("logs a system event", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.logEvent({
        eventType: "system_event",
        message: "System event for testing",
      });

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("logs a distribution event", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.logEvent({
        eventType: "distribution_queued",
        message: "Article queued for distribution",
        articleId: 456,
        metadata: {
          platform: "dev.to",
        },
      });

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("logs an automation cycle event", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.logEvent({
        eventType: "automation_cycle_completed",
        message: "Automation cycle completed successfully",
        metadata: {
          articlesGenerated: 5,
          duration: 120,
        },
      });

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("audit router", () => {
  describe("list", () => {
    it("returns audit log events as an array", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.audit.list({ limit: 10 });

      // The list endpoint returns an array directly, not { events, total }
      expect(Array.isArray(result)).toBe(true);
    });

    it("filters events by type when specified", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.audit.list({ 
        limit: 10, 
        eventType: "article_created" 
      });

      // The list endpoint returns an array directly
      expect(Array.isArray(result)).toBe(true);
      // All returned events should be of the specified type or empty
      result.forEach((event: { eventType: string }) => {
        expect(event.eventType).toBe("article_created");
      });
    });
  });

  describe("getStats", () => {
    it("returns event statistics", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.audit.getStats();

      expect(result).toHaveProperty("totalEvents");
      expect(result).toHaveProperty("articlesCreated");
      expect(result).toHaveProperty("articlesPublished");
      expect(result).toHaveProperty("automationCycles");
      expect(result).toHaveProperty("botDecisions");
      
      // All stats should be numbers
      expect(typeof result.totalEvents).toBe("number");
      expect(typeof result.articlesCreated).toBe("number");
      expect(typeof result.articlesPublished).toBe("number");
    });
  });
});
