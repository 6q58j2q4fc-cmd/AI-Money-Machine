import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("CJ API Key Validation", () => {
  it("should have CJ_API_KEY configured", () => {
    expect(ENV.cjApiKey).toBeTruthy();
    expect(ENV.cjApiKey.length).toBeGreaterThan(10);
  });

  it("should be able to authenticate with CJ Advertiser Lookup API", async () => {
    const apiKey = ENV.cjApiKey;
    
    // Test with a simple advertiser lookup request
    const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=7841523&advertiser-ids=notjoined&records-per-page=1`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    // The API should return 200 for valid authentication
    // Even if no results, it should not return 401 (unauthorized)
    expect(response.status).not.toBe(401);
    
    const text = await response.text();
    console.log("CJ API Response status:", response.status);
    console.log("CJ API Response:", text.substring(0, 500));
    
    // Check that we don't get an authentication error
    expect(text).not.toContain("You must specify a developer key");
    expect(text).not.toContain("Not Authenticated");
  });
});
