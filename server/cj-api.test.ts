import { describe, expect, it } from "vitest";

describe("CJ API Key Validation", () => {
  it("CJ_API_KEY environment variable is set", () => {
    const apiKey = process.env.CJ_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(typeof apiKey).toBe("string");
  });

  it("CJ_API_KEY has valid format", () => {
    const apiKey = process.env.CJ_API_KEY;
    // CJ API keys can contain alphanumeric characters, underscores, and hyphens
    expect(apiKey).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(apiKey!.length).toBeGreaterThan(10);
  });
});
