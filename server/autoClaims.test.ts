import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the hiveMind module
vi.mock("./_core/hiveMind", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
  getHiveMindState: vi.fn().mockReturnValue({
    objectivesCount: 5,
    conversationCount: 10,
  }),
}));

// Import after mocking
import {
  getAutoClaimStatus,
  startAllAutoClaims,
  stopAllAutoClaims,
  forceRunAllClaims,
  getEarningsSummary,
  requestWithdrawal,
  AUTO_CLAIM_SOURCES,
} from "./_core/autoClaimsService";

describe("Auto Claims Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAutoClaimStatus", () => {
    it("should return system status", () => {
      const status = getAutoClaimStatus();
      
      expect(status).toHaveProperty("active");
      expect(status).toHaveProperty("activeSources");
      expect(status).toHaveProperty("totalClaims");
      expect(status).toHaveProperty("successRate");
      expect(status).toHaveProperty("estimatedHourlyEarnings");
      expect(typeof status.active).toBe("boolean");
      expect(typeof status.activeSources).toBe("number");
    });
  });

  describe("startAllAutoClaims", () => {
    it("should start the auto-claims system", async () => {
      const result = await startAllAutoClaims();
      
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result.success).toBe(true);
    });
  });

  describe("stopAllAutoClaims", () => {
    it("should stop the auto-claims system", () => {
      const result = stopAllAutoClaims();
      
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result.success).toBe(true);
    });
  });

  describe("forceRunAllClaims", () => {
    it("should force run all claims", async () => {
      const result = await forceRunAllClaims();
      
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("claimsProcessed");
      expect(result).toHaveProperty("totalEarned");
      expect(typeof result.claimsProcessed).toBe("number");
      expect(typeof result.totalEarned).toBe("number");
      expect(result.success).toBe(true);
    });
  });

  describe("getEarningsSummary", () => {
    it("should return earnings summary", () => {
      const earnings = getEarningsSummary();
      
      expect(earnings).toHaveProperty("totalUSD");
      expect(earnings).toHaveProperty("totalETH");
      expect(earnings).toHaveProperty("todayUSD");
      expect(earnings).toHaveProperty("claims");
      expect(typeof earnings.totalUSD).toBe("number");
      expect(typeof earnings.totalETH).toBe("number");
      expect(Array.isArray(earnings.claims)).toBe(true);
    });
  });

  describe("requestWithdrawal", () => {
    it("should process withdrawal request", async () => {
      const result = await requestWithdrawal(0.01, "ETH");
      
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });

    it("should handle small withdrawal amounts", async () => {
      const result = await requestWithdrawal(0.0001, "ETH");
      
      // Small amounts may succeed or fail depending on implementation
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });
  });

  describe("AUTO_CLAIM_SOURCES", () => {
    it("should have faucet sources defined", () => {
      expect(AUTO_CLAIM_SOURCES).toBeDefined();
      expect(AUTO_CLAIM_SOURCES.faucets).toBeDefined();
      expect(Array.isArray(AUTO_CLAIM_SOURCES.faucets)).toBe(true);
      expect(AUTO_CLAIM_SOURCES.faucets.length).toBeGreaterThan(0);
      
      // Check structure of first faucet
      const firstFaucet = AUTO_CLAIM_SOURCES.faucets[0];
      expect(firstFaucet).toHaveProperty("name");
      expect(firstFaucet).toHaveProperty("url");
      expect(firstFaucet).toHaveProperty("reward");
      expect(firstFaucet).toHaveProperty("currency");
    });

    it("should have airdrop sources defined", () => {
      expect(AUTO_CLAIM_SOURCES.airdrops).toBeDefined();
      expect(Array.isArray(AUTO_CLAIM_SOURCES.airdrops)).toBe(true);
      expect(AUTO_CLAIM_SOURCES.airdrops.length).toBeGreaterThan(0);
    });

    it("should have earn crypto sources defined", () => {
      expect(AUTO_CLAIM_SOURCES.earnCrypto).toBeDefined();
      expect(Array.isArray(AUTO_CLAIM_SOURCES.earnCrypto)).toBe(true);
      expect(AUTO_CLAIM_SOURCES.earnCrypto.length).toBeGreaterThan(0);
    });
  });

  describe("Hive Mind Integration", () => {
    it("should integrate with hive mind for optimization", async () => {
      const { logEvent } = await import("./_core/hiveMind");
      
      await startAllAutoClaims();
      
      // Verify hive mind logging was called
      expect(logEvent).toHaveBeenCalled();
    });
  });
});
