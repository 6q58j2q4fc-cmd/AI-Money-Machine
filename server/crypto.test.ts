import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Crypto Earning Features", () => {
  describe("hiveMind.getCryptoState", () => {
    it("returns crypto earning state with expected structure", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.getCryptoState();

      expect(result).toHaveProperty("totalEarned");
      expect(result).toHaveProperty("activeFaucets");
      expect(result).toHaveProperty("pendingAirdrops");
      expect(result).toHaveProperty("stakingPositions");
      expect(result).toHaveProperty("referralEarnings");
      expect(result).toHaveProperty("lastClaim");
      expect(result).toHaveProperty("walletAddress");
      expect(typeof result.totalEarned).toBe("number");
      expect(typeof result.activeFaucets).toBe("number");
    });
  });

  describe("hiveMind.getCryptoOpportunities", () => {
    it("returns all crypto opportunity categories", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.getCryptoOpportunities();

      expect(result).toHaveProperty("faucets");
      expect(result).toHaveProperty("airdrops");
      expect(result).toHaveProperty("staking");
      expect(result).toHaveProperty("referrals");
      expect(Array.isArray(result.faucets)).toBe(true);
      expect(Array.isArray(result.airdrops)).toBe(true);
      expect(Array.isArray(result.staking)).toBe(true);
      expect(Array.isArray(result.referrals)).toBe(true);
    });

    it("faucets have required properties", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.getCryptoOpportunities();

      if (result.faucets.length > 0) {
        const faucet = result.faucets[0];
        expect(faucet).toHaveProperty("name");
        expect(faucet).toHaveProperty("type");
        expect(faucet).toHaveProperty("reward");
        expect(faucet).toHaveProperty("crypto");
        expect(faucet).toHaveProperty("url");
        expect(faucet).toHaveProperty("autoClaimable");
      }
    });
  });

  describe("hiveMind.scanCryptoOpportunities", () => {
    it("scans and returns new opportunities", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.scanCryptoOpportunities();

      expect(result).toHaveProperty("newFaucets");
      expect(result).toHaveProperty("newAirdrops");
      expect(result).toHaveProperty("newStaking");
      expect(result).toHaveProperty("recommendations");
      expect(typeof result.newFaucets).toBe("number");
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe("hiveMind.autoClaimCrypto", () => {
    it("auto-claims from available sources", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.autoClaimCrypto();

      expect(result).toHaveProperty("claimed");
      expect(result).toHaveProperty("sources");
      expect(result).toHaveProperty("totalValue");
      expect(typeof result.claimed).toBe("number");
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });

  describe("hiveMind.setupCryptoWallet", () => {
    it("successfully sets up a valid wallet address", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.setupCryptoWallet({
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678"
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result.success).toBe(true);
    });

    it("rejects invalid wallet addresses", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.setupCryptoWallet({
        walletAddress: "short"
      });

      expect(result.success).toBe(false);
    });
  });

  describe("hiveMind.getCryptoReferrals", () => {
    it("returns referral links for crypto platforms", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.getCryptoReferrals();

      expect(result).toHaveProperty("links");
      expect(Array.isArray(result.links)).toBe(true);
      if (result.links.length > 0) {
        const link = result.links[0];
        expect(link).toHaveProperty("platform");
        expect(link).toHaveProperty("url");
        expect(link).toHaveProperty("reward");
      }
    });
  });

  describe("hiveMind.optimizeCryptoEarnings", () => {
    it("returns optimization recommendations", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.optimizeCryptoEarnings();

      expect(result).toHaveProperty("optimizations");
      expect(result).toHaveProperty("potentialIncrease");
      expect(Array.isArray(result.optimizations)).toBe(true);
      expect(result.optimizations.length).toBeGreaterThan(0);
    });
  });

  describe("hiveMind.generateCryptoContent", () => {
    it("generates content for crypto reward platforms", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.hiveMind.generateCryptoContent({
        topic: "Bitcoin"
      });

      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("platforms");
      expect(typeof result.title).toBe("string");
      expect(typeof result.content).toBe("string");
      expect(Array.isArray(result.platforms)).toBe(true);
    });
  });
});
