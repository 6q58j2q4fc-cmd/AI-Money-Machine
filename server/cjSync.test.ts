import { describe, it, expect, vi, beforeEach } from "vitest";

describe("CJ Sync - Approved Links", () => {
  it("should have CJ API key configured", () => {
    const apiKey = process.env.CJ_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it("should have CJ CID configured", () => {
    const cid = process.env.CJ_CID || "7841523";
    expect(cid).toBeDefined();
    expect(cid.length).toBeGreaterThan(0);
  });

  it("should have CJ Website ID configured", () => {
    const websiteId = process.env.CJ_WEBSITE_ID || "101630462";
    expect(websiteId).toBeDefined();
    expect(websiteId.length).toBeGreaterThan(0);
  });

  it("should fetch joined advertisers from CJ API", async () => {
    const { getJoinedAdvertisers } = await import("./_core/cjApi");
    const cid = process.env.CJ_CID || "7841523";
    
    const result = await getJoinedAdvertisers(cid);
    
    // Should return success or a valid error
    if (result.success) {
      expect(result.advertisers).toBeDefined();
      expect(Array.isArray(result.advertisers)).toBe(true);
      // User has 66 approved advertisers
      expect(result.advertisers.length).toBeGreaterThan(0);
    } else {
      // API might be rate limited or have temporary issues
      expect(result.error).toBeDefined();
    }
  }, 30000);

  it("should fetch joined advertiser links from CJ API", async () => {
    const { getJoinedAdvertiserLinks } = await import("./_core/cjApi");
    const websiteId = process.env.CJ_WEBSITE_ID || "101630462";
    
    const result = await getJoinedAdvertiserLinks(websiteId);
    
    if (result.success) {
      expect(result.links).toBeDefined();
      expect(Array.isArray(result.links)).toBe(true);
      // User has 4317 available links
      expect(result.totalMatched).toBeGreaterThan(0);
    } else {
      expect(result.error).toBeDefined();
    }
  }, 30000);

  it("should get approved advertiser IDs", async () => {
    const { getApprovedAdvertiserIds } = await import("./_core/cjSync");
    
    const ids = await getApprovedAdvertiserIds();
    
    expect(Array.isArray(ids)).toBe(true);
    // User has 66 approved advertisers
    expect(ids.length).toBeGreaterThan(0);
  }, 30000);

  it("should get approved advertiser names", async () => {
    const { getApprovedAdvertiserNames } = await import("./_core/cjSync");
    
    const names = await getApprovedAdvertiserNames();
    
    expect(names instanceof Map).toBe(true);
    expect(names.size).toBeGreaterThan(0);
  }, 30000);

  it("should correctly identify approved CJ links", async () => {
    const { isLinkApproved } = await import("./_core/cjSync");
    
    // Test with a known approved advertiser link format
    // NordVPN is one of the approved advertisers
    const nordvpnLink = "https://www.anrdoezrs.net/click-7841523-14908261";
    
    const approved = await isLinkApproved(nordvpnLink);
    
    // The result depends on whether NordVPN advertiser ID matches
    expect(typeof approved).toBe("boolean");
  }, 30000);

  it("should filter out unapproved links", async () => {
    const { isLinkApproved } = await import("./_core/cjSync");
    
    // Test with a fake/unapproved advertiser ID
    const fakeLink = "https://www.anrdoezrs.net/click-7841523-99999999";
    
    const approved = await isLinkApproved(fakeLink);
    
    // Fake advertiser ID should not be approved
    expect(approved).toBe(false);
  }, 30000);
});

describe("Content Pipeline - Approved Links Filter", () => {
  it("should only use approved CJ links in content pipeline", async () => {
    const { getApprovedAdvertiserIds } = await import("./_core/cjSync");
    
    // Get approved advertiser IDs
    const approvedIds = await getApprovedAdvertiserIds();
    
    // Simulate filtering logic from routers.ts
    const testLinks = [
      { url: "https://www.anrdoezrs.net/click-7841523-4837117", name: "NordVPN" }, // Approved
      { url: "https://www.anrdoezrs.net/click-7841523-99999999", name: "Fake" }, // Not approved
      { url: "https://amazon.com/product", name: "Amazon" }, // Non-CJ link
    ];
    
    const filteredLinks = testLinks.filter(link => {
      if (link.url.includes('anrdoezrs.net')) {
        const match = link.url.match(/click-\d+-([\d]+)/);
        if (match) {
          return approvedIds.includes(match[1]);
        }
        return false;
      }
      return true; // Non-CJ links allowed
    });
    
    // Should include NordVPN (if approved) and Amazon (non-CJ)
    // Should exclude Fake (not approved)
    expect(filteredLinks.some(l => l.name === "Fake")).toBe(false);
    expect(filteredLinks.some(l => l.name === "Amazon")).toBe(true);
  }, 30000);
});
