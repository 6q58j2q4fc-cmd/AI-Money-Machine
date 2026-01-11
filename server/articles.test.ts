import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getArticles: vi.fn().mockResolvedValue([]),
  getArticleById: vi.fn().mockResolvedValue(null),
  createArticle: vi.fn().mockResolvedValue(1),
  updateArticle: vi.fn().mockResolvedValue(undefined),
  deleteArticle: vi.fn().mockResolvedValue(undefined),
  getAnalyticsSummary: vi.fn().mockResolvedValue({
    totalViews: 100,
    totalClicks: 50,
    totalArticles: 5,
    totalRevenue: "25.00"
  }),
  getAffiliateLinks: vi.fn().mockResolvedValue([]),
  createAffiliateLink: vi.fn().mockResolvedValue(1),
  getTrendingTopics: vi.fn().mockResolvedValue([]),
  createTrendingTopic: vi.fn().mockResolvedValue(1),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          topics: [{
            title: "Test Topic",
            category: "technology",
            popularityScore: 85,
            searchVolume: "10K-50K",
            competition: "medium",
            keywords: ["test", "keyword"]
          }]
        })
      }
    }]
  })
}));

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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("articles router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an article with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articles.create({
      title: "Test Article Title",
      content: "This is test content for the article.",
      excerpt: "Test excerpt",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("slug");
    expect(result.slug).toBe("test-article-title");
  });

  it("lists articles for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articles.list({});

    expect(Array.isArray(result)).toBe(true);
  });

  it("updates an article", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articles.update({
      id: 1,
      title: "Updated Title",
      status: "published",
    });

    expect(result).toEqual({ success: true });
  });

  it("deletes an article", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articles.delete({ id: 1 });

    expect(result).toEqual({ success: true });
  });
});

describe("analytics router", () => {
  it("returns analytics summary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.summary();

    expect(result).toHaveProperty("totalViews");
    expect(result).toHaveProperty("totalClicks");
    expect(result).toHaveProperty("totalArticles");
    expect(result).toHaveProperty("totalRevenue");
  });
});

describe("affiliate router", () => {
  it("creates an affiliate link", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.affiliate.create({
      name: "Test Product",
      url: "https://example.com/affiliate",
      shortCode: "test-product",
      category: "Technology",
      program: "Amazon Associates",
      commission: "5%",
    });

    expect(result).toHaveProperty("id");
  });

  it("lists affiliate links", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.affiliate.list({});

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("topics router", () => {
  it("lists trending topics", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.topics.list({});

    expect(Array.isArray(result)).toBe(true);
  });

  it("discovers new topics via AI", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.topics.discover({ niche: "technology" });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("category");
    expect(result[0]).toHaveProperty("popularityScore");
  });
});
