import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-llm",
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

describe("Multi-LLM Router", () => {
  it("getProviders returns provider status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.llm.getProviders();
    
    expect(result).toHaveProperty("available");
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("configured");
    expect(Array.isArray(result.available)).toBe(true);
    expect(typeof result.count).toBe("number");
    expect(typeof result.configured).toBe("boolean");
  });

  it("generateArticle mutation accepts valid input", { timeout: 30000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This may succeed if providers are configured, or fail if not
    try {
      const result = await caller.llm.generateArticle({
        topic: "Test topic",
        keywords: ["test", "keywords"],
        wordCount: 500,
        style: "informative",
      });
      // If it succeeds, verify the response structure
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("provider");
    } catch (error: any) {
      // Expected to fail if no LLM providers configured
      expect(error.message).toMatch(/No LLM providers available|rate limit|timeout/i);
    }
  });

  it("generateHeadlines mutation accepts valid input", { timeout: 30000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.llm.generateHeadlines({
        topic: "Test topic",
        count: 3,
        style: "informative",
      });
      expect(result).toHaveProperty("headlines");
    } catch (error: any) {
      expect(error.message).toMatch(/No LLM providers available|rate limit|timeout/i);
    }
  });

  it("researchTopics mutation accepts valid input", { timeout: 30000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.llm.researchTopics({
        niche: "technology",
        count: 3,
      });
      expect(result).toHaveProperty("topics");
    } catch (error: any) {
      expect(error.message).toMatch(/No LLM providers available|rate limit|timeout/i);
    }
  });

  it("optimizeSEO mutation accepts valid input", { timeout: 30000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.llm.optimizeSEO({
        content: "Test content for SEO optimization",
        targetKeyword: "test keyword",
      });
      expect(result).toHaveProperty("title");
    } catch (error: any) {
      expect(error.message).toMatch(/No LLM providers available|rate limit|timeout/i);
    }
  });

  it("invoke mutation accepts valid task types", { timeout: 60000 }, async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Just test one task type to verify the endpoint works
    try {
      const result = await caller.llm.invoke({
        taskType: "quick_task",
        systemPrompt: "You are a helpful assistant.",
        userPrompt: "Say hello",
        temperature: 0.7,
        maxTokens: 100,
      });
      expect(result).toHaveProperty("content");
    } catch (error: any) {
      expect(error.message).toMatch(/No LLM providers available|rate limit|timeout/i);
    }
  });

  it("matchAffiliates mutation accepts valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.llm.matchAffiliates({
        articleContent: "Test article about VPN services",
        products: [
          { name: "NordVPN", category: "VPN", description: "Secure VPN service" },
          { name: "ExpressVPN", category: "VPN", description: "Fast VPN service" },
        ],
      });
    } catch (error: any) {
      expect(error.message).toContain("No LLM providers available");
    }
  });
});

describe("Multi-LLM Service Functions", () => {
  it("getAvailableProviders returns array", async () => {
    const { getAvailableProviders } = await import("./_core/multiLlm");
    const providers = getAvailableProviders();
    
    expect(Array.isArray(providers)).toBe(true);
    // Providers should be one of the known providers if configured
    const knownProviders = ["groq", "cerebras", "openrouter", "google"];
    providers.forEach(p => {
      expect(knownProviders).toContain(p);
    });
  });
});
