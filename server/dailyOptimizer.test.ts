import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  runDailyOptimization, 
  checkAllProvidersHealth, 
  checkFeatureHealth, 
  routeTask, 
  recordUsage, 
  getProviderStats, 
  getUsageHistory,
  getApiRegistry,
} from "./_core/dailyOptimizer";

describe("Daily Optimizer Service", () => {
  describe("API Registry", () => {
    it("should return all registered API providers", () => {
      const registry = getApiRegistry();
      
      expect(registry).toBeDefined();
      expect(typeof registry).toBe("object");
      
      // Check for expected providers
      expect(registry.groq).toBeDefined();
      expect(registry.cerebras).toBeDefined();
      expect(registry.openrouter).toBeDefined();
      expect(registry.google).toBeDefined();
      expect(registry.manus).toBeDefined();
      expect(registry.cj).toBeDefined();
      expect(registry.botpress).toBeDefined();
    });

    it("should have correct provider structure", () => {
      const registry = getApiRegistry();
      
      for (const [id, provider] of Object.entries(registry)) {
        expect(provider.name).toBeDefined();
        expect(provider.type).toMatch(/^(llm|affiliate|distribution|analytics|bot)$/);
        expect(provider.envKey).toBeDefined();
        expect(provider.endpoint).toBeDefined();
        expect(provider.rateLimit).toBeDefined();
        expect(provider.rateLimit.requestsPerDay).toBeGreaterThan(0);
        expect(provider.rateLimit.requestsPerMinute).toBeGreaterThan(0);
        expect(Array.isArray(provider.capabilities)).toBe(true);
        expect(typeof provider.priority).toBe("number");
        expect(typeof provider.costPerRequest).toBe("number");
      }
    });
  });

  describe("Task Routing", () => {
    it("should route article_generation to appropriate provider", () => {
      const decision = routeTask("article_generation");
      
      expect(decision).toBeDefined();
      expect(decision.primaryProvider).toBeDefined();
      expect(Array.isArray(decision.fallbackProviders)).toBe(true);
      expect(decision.reason).toBeDefined();
      expect(typeof decision.estimatedCost).toBe("number");
      expect(typeof decision.estimatedTime).toBe("number");
    });

    it("should route seo_optimization to appropriate provider", () => {
      const decision = routeTask("seo_optimization");
      
      expect(decision.primaryProvider).toBeDefined();
      expect(decision.fallbackProviders.length).toBeGreaterThanOrEqual(0);
    });

    it("should route topic_research to appropriate provider", () => {
      const decision = routeTask("topic_research");
      
      expect(decision.primaryProvider).toBeDefined();
    });

    it("should route deep_reasoning to appropriate provider", () => {
      const decision = routeTask("deep_reasoning");
      
      expect(decision.primaryProvider).toBeDefined();
    });

    it("should handle unknown task types gracefully", () => {
      const decision = routeTask("unknown_task_type");
      
      expect(decision.primaryProvider).toBe("manus");
      expect(decision.reason).toContain("Unknown task type");
    });

    it("should provide fallback providers", () => {
      const decision = routeTask("article_generation");
      
      // Should have at least some fallback options
      expect(decision.fallbackProviders).toBeDefined();
    });
  });

  describe("Usage Recording", () => {
    it("should record successful usage", () => {
      const initialHistory = getUsageHistory(100);
      const initialLength = initialHistory.length;
      
      recordUsage("groq", "article_generation", true, 1500, 500);
      
      const newHistory = getUsageHistory(100);
      expect(newHistory.length).toBe(initialLength + 1);
      
      const lastRecord = newHistory[newHistory.length - 1];
      expect(lastRecord.provider).toBe("groq");
      expect(lastRecord.taskType).toBe("article_generation");
      expect(lastRecord.success).toBe(true);
      expect(lastRecord.responseTime).toBe(1500);
      expect(lastRecord.tokensUsed).toBe(500);
    });

    it("should record failed usage with error", () => {
      recordUsage("cerebras", "topic_research", false, 5000, undefined, "API timeout");
      
      const history = getUsageHistory(100);
      const lastRecord = history[history.length - 1];
      
      expect(lastRecord.provider).toBe("cerebras");
      expect(lastRecord.success).toBe(false);
      expect(lastRecord.error).toBe("API timeout");
    });

    it("should update provider stats on usage", () => {
      const statsBefore = getProviderStats().get("manus");
      const totalBefore = statsBefore?.totalRequests || 0;
      
      recordUsage("manus", "quick_task", true, 500);
      
      const statsAfter = getProviderStats().get("manus");
      expect(statsAfter?.totalRequests).toBe(totalBefore + 1);
    });
  });

  describe("Provider Stats", () => {
    it("should return stats for all providers", () => {
      const stats = getProviderStats();
      
      expect(stats).toBeDefined();
      expect(stats instanceof Map).toBe(true);
      
      // Check for expected providers
      expect(stats.has("groq")).toBe(true);
      expect(stats.has("cerebras")).toBe(true);
      expect(stats.has("manus")).toBe(true);
    });

    it("should have correct stats structure", () => {
      const stats = getProviderStats();
      
      for (const [provider, stat] of stats) {
        expect(typeof stat.totalRequests).toBe("number");
        expect(typeof stat.successfulRequests).toBe("number");
        expect(typeof stat.failedRequests).toBe("number");
        expect(typeof stat.averageResponseTime).toBe("number");
        expect(typeof stat.totalTokensUsed).toBe("number");
        expect(typeof stat.lastUsed).toBe("number");
        expect(stat.healthStatus).toMatch(/^(healthy|degraded|down)$/);
      }
    });
  });

  describe("Health Checks", () => {
    it("should check all providers health", async () => {
      const results = await checkAllProvidersHealth();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      for (const result of results) {
        expect(result.provider).toBeDefined();
        expect(result.status).toMatch(/^(healthy|degraded|down)$/);
        expect(typeof result.responseTime).toBe("number");
        expect(typeof result.lastChecked).toBe("number");
      }
    }, 30000);

    it("should check feature health", async () => {
      const results = await checkFeatureHealth();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      for (const result of results) {
        expect(result.feature).toBeDefined();
        expect(result.status).toMatch(/^(operational|degraded|down)$/);
        expect(typeof result.lastChecked).toBe("number");
        expect(Array.isArray(result.dependencies)).toBe(true);
        expect(Array.isArray(result.issues)).toBe(true);
      }
    }, 30000);
  });

  describe("Daily Optimization", () => {
    it("should run daily optimization and return results", async () => {
      const result = await runDailyOptimization();
      
      expect(result).toBeDefined();
      expect(typeof result.timestamp).toBe("number");
      expect(Array.isArray(result.healthChecks)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.actionsPerformed)).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(typeof result.metrics.totalRequests24h).toBe("number");
      expect(typeof result.metrics.successRate24h).toBe("number");
      expect(typeof result.metrics.averageResponseTime24h).toBe("number");
      expect(result.metrics.topPerformingProvider).toBeDefined();
      expect(Array.isArray(result.metrics.underperformingProviders)).toBe(true);
    }, 60000);
  });

  describe("Usage History", () => {
    it("should return limited usage history", () => {
      // Record some usage first
      recordUsage("groq", "test", true, 100);
      recordUsage("cerebras", "test", true, 200);
      
      const history = getUsageHistory(5);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should return usage history with correct structure", () => {
      const history = getUsageHistory(10);
      
      for (const record of history) {
        expect(record.provider).toBeDefined();
        expect(typeof record.timestamp).toBe("number");
        expect(record.taskType).toBeDefined();
        expect(typeof record.success).toBe("boolean");
        expect(typeof record.responseTime).toBe("number");
      }
    });
  });
});
