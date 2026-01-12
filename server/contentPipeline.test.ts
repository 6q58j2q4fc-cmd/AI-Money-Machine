import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  discoverTopics,
  generateMonetizedArticle,
  insertAffiliateLinks,
  calculateContentScore,
  runContentPipeline,
  DEFAULT_PIPELINE_CONFIG,
  type PipelineConfig,
  type AffiliateLink,
  type TopicData,
} from "./server/_core/contentPipeline";

describe("Content Pipeline Service", () => {
  // Mock affiliate links
  const mockAffiliateLinks: AffiliateLink[] = [
    {
      id: 1,
      name: "NordVPN",
      url: "https://nordvpn.com/ref/abc123",
      category: "VPN",
      description: "Secure VPN service",
    },
    {
      id: 2,
      name: "ExpressVPN",
      url: "https://expressvpn.com/ref/xyz789",
      category: "VPN",
      description: "Fast VPN service",
    },
    {
      id: 3,
      name: "Bluehost",
      url: "https://bluehost.com/ref/hosting",
      category: "Hosting",
      description: "Web hosting provider",
    },
  ];

  // Mock topic data
  const mockTopic: TopicData = {
    title: "Best VPN for 2024",
    description: "Complete guide to choosing the best VPN",
    keywords: ["best vpn", "vpn 2024", "secure vpn", "vpn comparison"],
    monetizationAngle: "Recommend premium VPN services",
    searchIntent: "commercial",
    difficulty: "low",
  };

  describe("calculateContentScore", () => {
    it("should calculate content score based on word count", () => {
      const content = "word ".repeat(1500); // 1500 words
      const keywords = ["test"];
      const score = calculateContentScore(content, keywords);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should give higher score for content with proper structure", () => {
      const content = `
## Main Heading
Content here.

### Sub Heading
More content.

- Item 1
- Item 2
- Item 3

[Link](https://example.com)
`;
      const keywords = ["heading"];
      const score = calculateContentScore(content, keywords);
      expect(score).toBeGreaterThan(0);
    });

    it("should reward keyword presence", () => {
      const content = "This is about VPN services. VPN is important. Best VPN providers.";
      const keywords = ["VPN", "services"];
      const score = calculateContentScore(content, keywords);
      expect(score).toBeGreaterThan(50);
    });

    it("should reward link presence", () => {
      const content = `
[Link 1](https://example1.com)
[Link 2](https://example2.com)
[Link 3](https://example3.com)
[Link 4](https://example4.com)
[Link 5](https://example5.com)
`;
      const keywords = ["test"];
      const score = calculateContentScore(content, keywords);
      expect(score).toBeGreaterThan(50);
    });

    it("should return max score of 100", () => {
      const content = "word ".repeat(3000) + "\n## Heading\n### Sub\n" + "[Link](url) ".repeat(10);
      const keywords = ["word"];
      const score = calculateContentScore(content, keywords);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("insertAffiliateLinks", () => {
    it("should insert affiliate links into content", () => {
      const content = `
This article is about VPN services. VPN is essential for security.
NordVPN is one of the best options available.
ExpressVPN offers great speeds.
`;
      const result = insertAffiliateLinks(content, mockAffiliateLinks, 3);
      expect(result.linksInserted).toBeGreaterThan(0);
      expect(result.linkIds.length).toBeGreaterThan(0);
      expect(result.content).toContain("[");
    });

    it("should respect max links limit", () => {
      const content = "NordVPN ExpressVPN Bluehost test content";
      const result = insertAffiliateLinks(content, mockAffiliateLinks, 2);
      expect(result.linksInserted).toBeLessThanOrEqual(2);
    });

    it("should not insert duplicate links", () => {
      const content = "NordVPN is great. NordVPN is secure.";
      const result = insertAffiliateLinks(content, mockAffiliateLinks, 5);
      const nordvpnCount = (result.content.match(/NordVPN/g) || []).length;
      expect(nordvpnCount).toBeLessThanOrEqual(3); // Original + max 1 link
    });

    it("should handle empty affiliate links", () => {
      const content = "Some content here";
      const result = insertAffiliateLinks(content, [], 5);
      expect(result.linksInserted).toBe(0);
      expect(result.linkIds.length).toBe(0);
      expect(result.content).toBe(content);
    });

    it("should add recommendations section if needed", () => {
      const content = "Some content";
      const result = insertAffiliateLinks(content, mockAffiliateLinks, 3);
      if (result.linksInserted < 3) {
        expect(result.content).toContain("Recommended");
      }
    });
  });

  describe("DEFAULT_PIPELINE_CONFIG", () => {
    it("should have valid default configuration", () => {
      expect(DEFAULT_PIPELINE_CONFIG.articlesPerCycle).toBeGreaterThan(0);
      expect(DEFAULT_PIPELINE_CONFIG.wordCountMin).toBeGreaterThan(0);
      expect(DEFAULT_PIPELINE_CONFIG.wordCountMax).toBeGreaterThan(DEFAULT_PIPELINE_CONFIG.wordCountMin);
      expect(DEFAULT_PIPELINE_CONFIG.minAffiliateLinks).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_PIPELINE_CONFIG.maxAffiliateLinks).toBeGreaterThanOrEqual(DEFAULT_PIPELINE_CONFIG.minAffiliateLinks);
      expect(DEFAULT_PIPELINE_CONFIG.temperature).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_PIPELINE_CONFIG.temperature).toBeLessThanOrEqual(1);
    });

    it("should have valid content styles", () => {
      const validStyles = ["informative", "persuasive", "review", "comparison", "listicle"];
      expect(validStyles).toContain(DEFAULT_PIPELINE_CONFIG.contentStyle);
    });

    it("should have valid affiliate density", () => {
      const validDensities = ["low", "medium", "high", "aggressive"];
      expect(validDensities).toContain(DEFAULT_PIPELINE_CONFIG.affiliateDensity);
    });

    it("should have at least one target niche", () => {
      expect(DEFAULT_PIPELINE_CONFIG.targetNiches.length).toBeGreaterThan(0);
    });
  });

  describe("Pipeline Configuration", () => {
    it("should validate article count range", () => {
      const config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };
      expect(config.articlesPerCycle).toBeGreaterThanOrEqual(1);
      expect(config.articlesPerCycle).toBeLessThanOrEqual(20);
    });

    it("should validate word count range", () => {
      const config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };
      expect(config.wordCountMin).toBeGreaterThanOrEqual(500);
      expect(config.wordCountMax).toBeLessThanOrEqual(10000);
      expect(config.wordCountMax).toBeGreaterThan(config.wordCountMin);
    });

    it("should validate SEO score range", () => {
      const config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };
      expect(config.minSeoScore).toBeGreaterThanOrEqual(0);
      expect(config.minSeoScore).toBeLessThanOrEqual(100);
    });

    it("should validate publish delay", () => {
      const config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };
      expect(config.publishDelay).toBeGreaterThanOrEqual(0);
      expect(config.publishDelay).toBeLessThanOrEqual(60);
    });
  });

  describe("Topic Data Validation", () => {
    it("should have valid topic structure", () => {
      expect(mockTopic.title).toBeTruthy();
      expect(mockTopic.description).toBeTruthy();
      expect(mockTopic.keywords.length).toBeGreaterThan(0);
      expect(mockTopic.monetizationAngle).toBeTruthy();
      expect(mockTopic.searchIntent).toBeTruthy();
      expect(mockTopic.difficulty).toBeTruthy();
    });

    it("should have valid search intent", () => {
      const validIntents = ["informational", "commercial", "transactional"];
      expect(validIntents).toContain(mockTopic.searchIntent);
    });

    it("should have valid difficulty level", () => {
      const validDifficulties = ["low", "medium", "high"];
      expect(validDifficulties).toContain(mockTopic.difficulty);
    });
  });

  describe("Affiliate Link Validation", () => {
    it("should have valid affiliate link structure", () => {
      for (const link of mockAffiliateLinks) {
        expect(link.id).toBeTruthy();
        expect(link.name).toBeTruthy();
        expect(link.url).toMatch(/^https?:\/\//);
        expect(link.category).toBeTruthy();
      }
    });

    it("should have unique link IDs", () => {
      const ids = mockAffiliateLinks.map(l => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid URLs", () => {
      for (const link of mockAffiliateLinks) {
        expect(() => new URL(link.url)).not.toThrow();
      }
    });
  });

  describe("Pipeline Result Structure", () => {
    it("should have valid result structure", async () => {
      // Test with empty inputs to verify structure
      const result = await runContentPipeline(
        DEFAULT_PIPELINE_CONFIG,
        [],
        [],
        undefined
      );

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("articlesGenerated");
      expect(result).toHaveProperty("articlesPublished");
      expect(result).toHaveProperty("affiliateLinksInserted");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("executionTime");
      expect(result).toHaveProperty("details");

      expect(typeof result.success).toBe("boolean");
      expect(typeof result.articlesGenerated).toBe("number");
      expect(typeof result.articlesPublished).toBe("number");
      expect(typeof result.affiliateLinksInserted).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.executionTime).toBe("number");
      expect(Array.isArray(result.details)).toBe(true);
    });

    it("should record execution time", async () => {
      const result = await runContentPipeline(
        DEFAULT_PIPELINE_CONFIG,
        [],
        [],
        undefined
      );

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});
