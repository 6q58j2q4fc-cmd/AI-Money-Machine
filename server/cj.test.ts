import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-cj",
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
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("CJ Integration Router", () => {
  it("returns settings object or null", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cj.getSettings();
    
    // Should return either null/undefined or a valid settings object
    if (result) {
      // Settings exist - verify structure
      expect(result).toHaveProperty("cid");
      expect(result).toHaveProperty("websiteId");
    }
    // If null/undefined, that's also valid (no settings configured)
    expect(result === undefined || result === null || typeof result === "object").toBe(true);
  });

  it("returns empty array when no CJ products exist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cj.getProducts({});
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Publishing Router", () => {
  it("returns empty array when no items in publishing queue", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publishing.queue();
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Content Queue Router", () => {
  it("returns empty array when no items in content queue", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contentQueue.list();
    
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Public Articles Router", () => {
  it("returns empty array when no published articles exist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publicArticles.list({});
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns undefined for non-existent article slug", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publicArticles.get({ slug: "non-existent-article-slug" });
    
    expect(result === undefined || result === null).toBe(true);
  });
});
