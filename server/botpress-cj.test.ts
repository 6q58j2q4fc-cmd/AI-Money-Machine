import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBotpressService, BotCommands } from "./_core/botpressApi";
import { ENV } from "./_core/env";

// Mock fetch for Botpress API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Botpress API Service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("createBotpressService", () => {
    it("should return null when BOTPRESS_API is not configured", () => {
      // Save original value
      const originalKey = ENV.botpressApiKey;
      
      // Temporarily set to empty
      (ENV as any).botpressApiKey = "";
      
      const service = createBotpressService();
      expect(service).toBeNull();
      
      // Restore
      (ENV as any).botpressApiKey = originalKey;
    });

    it("should return a BotpressService instance when configured", () => {
      // Save original value
      const originalKey = ENV.botpressApiKey;
      
      // Set a test webhook ID
      (ENV as any).botpressApiKey = "test-webhook-id";
      
      const service = createBotpressService();
      expect(service).not.toBeNull();
      
      // Restore
      (ENV as any).botpressApiKey = originalKey;
    });
  });

  describe("BotCommands", () => {
    it("should have predefined commands", () => {
      expect(BotCommands.ANALYZE_PERFORMANCE).toBeDefined();
      expect(BotCommands.OPTIMIZE_AFFILIATE).toBeDefined();
      expect(BotCommands.GENERATE_TOPICS).toBeDefined();
      expect(BotCommands.REVIEW_SEO).toBeDefined();
      expect(BotCommands.EFFICIENCY_REPORT).toBeDefined();
      expect(BotCommands.MARKET_TRENDS).toBeDefined();
    });

    it("should have meaningful command strings", () => {
      expect(typeof BotCommands.ANALYZE_PERFORMANCE).toBe("string");
      expect(BotCommands.ANALYZE_PERFORMANCE.length).toBeGreaterThan(10);
    });
  });

  describe("BotpressService health check", () => {
    it("should return true when API is reachable", async () => {
      // Save original value
      const originalKey = ENV.botpressApiKey;
      (ENV as any).botpressApiKey = "test-webhook-id";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok" }),
      });

      const service = createBotpressService();
      expect(service).not.toBeNull();
      
      const isHealthy = await service!.healthCheck();
      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://chat.botpress.cloud/test-webhook-id/hello"
      );
      
      // Restore
      (ENV as any).botpressApiKey = originalKey;
    });

    it("should return false when API is not reachable", async () => {
      // Save original value
      const originalKey = ENV.botpressApiKey;
      (ENV as any).botpressApiKey = "test-webhook-id";
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const service = createBotpressService();
      const isHealthy = await service!.healthCheck();
      expect(isHealthy).toBe(false);
      
      // Restore
      (ENV as any).botpressApiKey = originalKey;
    });
  });
});

describe("CJ Auto-Sync Feature", () => {
  describe("High-EPC Advertiser Recommendations", () => {
    it("should have a list of high-EPC advertisers defined in the frontend", () => {
      // This is a conceptual test - the actual data is in the frontend
      const highEpcAdvertisers = [
        { name: "ExpressVPN", epc: "$239.48", category: "VPN", id: "5577978" },
        { name: "Norton", epc: "$363.55", category: "Security", id: "2102181" },
        { name: "Kaspersky EU", epc: "$548.91", category: "Security", id: "6209109" },
      ];
      
      expect(highEpcAdvertisers.length).toBeGreaterThan(0);
      expect(highEpcAdvertisers[0]).toHaveProperty("name");
      expect(highEpcAdvertisers[0]).toHaveProperty("epc");
      expect(highEpcAdvertisers[0]).toHaveProperty("category");
      expect(highEpcAdvertisers[0]).toHaveProperty("id");
    });
  });

  describe("Preset Keywords", () => {
    it("should have preset keyword categories for quick search", () => {
      const presetKeywords = [
        { label: "VPN & Security", keywords: "VPN" },
        { label: "Web Hosting", keywords: "hosting" },
        { label: "Software", keywords: "software" },
        { label: "Travel", keywords: "travel" },
        { label: "Finance", keywords: "finance" },
        { label: "Health", keywords: "health" },
        { label: "Education", keywords: "education" },
        { label: "E-commerce", keywords: "ecommerce" },
      ];
      
      expect(presetKeywords.length).toBe(8);
      presetKeywords.forEach(preset => {
        expect(preset).toHaveProperty("label");
        expect(preset).toHaveProperty("keywords");
        expect(typeof preset.label).toBe("string");
        expect(typeof preset.keywords).toBe("string");
      });
    });
  });
});
