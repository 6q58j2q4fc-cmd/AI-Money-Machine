/**
 * Alpaca API Key Validation Test
 * Verifies that the configured ALPACA_API_KEY and ALPACA_SECRET_KEY
 * can successfully authenticate with the Alpaca paper trading API.
 *
 * If no keys are set (user skipped), the test is skipped gracefully.
 */

import { describe, it, expect } from "vitest";

const ALPACA_KEY = process.env.ALPACA_API_KEY;
const ALPACA_SECRET = process.env.ALPACA_SECRET_KEY;
const BASE_URL = "https://paper-api.alpaca.markets";

describe("Alpaca API Key Validation", () => {
  it("skips if no keys are configured", () => {
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      console.log("ALPACA_API_KEY / ALPACA_SECRET_KEY not set — running in simulation mode. Skipping live API test.");
      expect(true).toBe(true); // graceful skip
      return;
    }
  });

  it("authenticates with Alpaca paper trading API when keys are present", async () => {
    if (!ALPACA_KEY || !ALPACA_SECRET) {
      // Keys not provided — skip without failing
      return;
    }

    const response = await fetch(`${BASE_URL}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET,
        "Accept": "application/json",
      },
    });

    // 200 = valid keys, 403 = invalid keys
    if (response.status === 403) {
      const body = await response.text();
      throw new Error(
        `Alpaca API authentication failed (403 Forbidden). ` +
        `Check that ALPACA_API_KEY and ALPACA_SECRET_KEY are correct paper trading keys. ` +
        `Response: ${body}`
      );
    }

    expect(response.status).toBe(200);

    const account = await response.json() as Record<string, unknown>;
    expect(account).toHaveProperty("id");
    expect(account).toHaveProperty("status");
    console.log(`✅ Alpaca account authenticated. Status: ${account.status}, Equity: $${account.equity}`);
  });
});
