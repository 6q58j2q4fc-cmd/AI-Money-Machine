import { getDb } from "../db";
import { affiliateLinks } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getJoinedAdvertisers, getJoinedAdvertiserLinks, searchCJLinks } from "./cjApi";
import { ENV } from "./env";

interface SyncResult {
  success: boolean;
  removedCount: number;
  addedCount: number;
  updatedCount: number;
  approvedAdvertisers: string[];
  error?: string;
}

/**
 * Get all approved advertiser IDs from CJ account
 */
export async function getApprovedAdvertiserIds(): Promise<string[]> {
  const result = await getJoinedAdvertisers(ENV.cjCid);
  
  if (!result.success || !result.advertisers) {
    console.error("[CJ Sync] Failed to fetch approved advertisers:", result.error);
    return [];
  }
  
  return result.advertisers.map(adv => adv.advertiserId);
}

/**
 * Get all approved advertiser names from CJ account
 */
export async function getApprovedAdvertiserNames(): Promise<Map<string, string>> {
  const result = await getJoinedAdvertisers(ENV.cjCid);
  const nameMap = new Map<string, string>();
  
  if (!result.success || !result.advertisers) {
    return nameMap;
  }
  
  for (const adv of result.advertisers) {
    nameMap.set(adv.advertiserId, adv.advertiserName);
  }
  
  return nameMap;
}

/**
 * Remove all unapproved CJ affiliate links from the database
 */
export async function removeUnapprovedLinks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const approvedIds = await getApprovedAdvertiserIds();
  
  if (approvedIds.length === 0) {
    console.log("[CJ Sync] No approved advertisers found, skipping removal");
    return 0;
  }
  
  console.log(`[CJ Sync] Found ${approvedIds.length} approved advertisers`);
  
  // Get all CJ links from database
  const allLinks = await db.select().from(affiliateLinks);
  
  // Find links that are CJ links but not from approved advertisers
  const linksToRemove: number[] = [];
  
  for (const link of allLinks) {
    // Check if it's a CJ link
    const isCJLink = link.url && (
      link.url.includes("anrdoezrs.net") ||
      link.url.includes("dpbolvw.net") ||
      link.url.includes("tkqlhce.com") ||
      link.url.includes("jdoqocy.com") ||
      link.url.includes("kqzyfj.com") ||
      link.url.includes("click-7841523") ||
      link.url.includes("click-101630462")
    );
    
    if (isCJLink) {
      // Extract advertiser ID from URL
      const advertiserIdMatch = link.url?.match(/click-\d+-(\d+)/);
      const advertiserId = advertiserIdMatch ? advertiserIdMatch[1] : null;
      
      // If we can't determine the advertiser or it's not approved, mark for removal
      if (!advertiserId || !approvedIds.includes(advertiserId)) {
        linksToRemove.push(link.id);
      }
    }
  }
  
  console.log(`[CJ Sync] Found ${linksToRemove.length} unapproved CJ links to remove`);
  
  if (linksToRemove.length > 0) {
    // Remove in batches
    for (let i = 0; i < linksToRemove.length; i += 100) {
      const batch = linksToRemove.slice(i, i + 100);
      await db.delete(affiliateLinks).where(inArray(affiliateLinks.id, batch));
    }
  }
  
  return linksToRemove.length;
}

/**
 * Import approved CJ affiliate links to the database
 */
export async function importApprovedLinks(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const websiteId = ENV.cjWebsiteId;
  
  // Fetch all links from joined advertisers
  const result = await getJoinedAdvertiserLinks(websiteId);
  
  if (!result.success || !result.links) {
    console.error("[CJ Sync] Failed to fetch affiliate links:", result.error);
    return 0;
  }
  
  console.log(`[CJ Sync] Fetched ${result.links.length} links from CJ (total available: ${result.totalMatched})`);
  
  // Get existing links to avoid duplicates
  const existingLinks = await db.select({ url: affiliateLinks.url }).from(affiliateLinks);
  const existingUrls = new Set(existingLinks.map(l => l.url));
  
  let addedCount = 0;
  
  for (const link of result.links) {
    // Skip if already exists
    if (existingUrls.has(link.clickUrl)) {
      continue;
    }
    
    // Determine category from CJ category
    let category = "general";
    if (link.category) {
      const catLower = link.category.toLowerCase();
      if (catLower.includes("tech") || catLower.includes("computer") || catLower.includes("electronic")) {
        category = "technology";
      } else if (catLower.includes("travel") || catLower.includes("hotel") || catLower.includes("car")) {
        category = "travel";
      } else if (catLower.includes("health") || catLower.includes("fitness") || catLower.includes("beauty")) {
        category = "health";
      } else if (catLower.includes("finance") || catLower.includes("insurance") || catLower.includes("credit")) {
        category = "finance";
      } else if (catLower.includes("home") || catLower.includes("garden") || catLower.includes("pet")) {
        category = "home";
      } else if (catLower.includes("food") || catLower.includes("grocery")) {
        category = "food";
      } else if (catLower.includes("fashion") || catLower.includes("apparel") || catLower.includes("clothing")) {
        category = "fashion";
      } else if (catLower.includes("education") || catLower.includes("book")) {
        category = "education";
      } else if (catLower.includes("entertainment") || catLower.includes("game") || catLower.includes("media")) {
        category = "entertainment";
      } else if (catLower.includes("business") || catLower.includes("service")) {
        category = "business";
      }
    }
    
    // Insert the link
    try {
      await db.insert(affiliateLinks).values({
        userId: 1, // System user
        name: link.linkName || link.advertiserName,
        url: link.clickUrl,
        shortCode: `cj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        category: category,
        program: link.advertiserName,
        commission: link.saleCommission || "Variable",
        isActive: true,
        clicks: 0,
        conversions: 0,
        revenue: "0",
      });
      
      addedCount++;
      existingUrls.add(link.clickUrl);
    } catch (error) {
      // Skip duplicates or errors
    }
  }
  
  console.log(`[CJ Sync] Added ${addedCount} new affiliate links`);
  
  return addedCount;
}

/**
 * Full sync: remove unapproved links and import approved ones
 */
export async function syncApprovedCJLinks(): Promise<SyncResult> {
  console.log("[CJ Sync] Starting full sync of approved CJ affiliate links...");
  
  try {
    // Get approved advertisers
    const approvedIds = await getApprovedAdvertiserIds();
    const advertiserNames = await getApprovedAdvertiserNames();
    const approvedAdvertisers = Array.from(advertiserNames.values());
    
    console.log(`[CJ Sync] Found ${approvedIds.length} approved advertisers`);
    
    // Remove unapproved links
    const removedCount = await removeUnapprovedLinks();
    
    // Import approved links
    const addedCount = await importApprovedLinks();
    
    return {
      success: true,
      removedCount,
      addedCount,
      updatedCount: 0,
      approvedAdvertisers,
    };
  } catch (error) {
    console.error("[CJ Sync] Sync failed:", error);
    return {
      success: false,
      removedCount: 0,
      addedCount: 0,
      updatedCount: 0,
      approvedAdvertisers: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if an affiliate link is from an approved advertiser
 */
export async function isLinkApproved(url: string): Promise<boolean> {
  const approvedIds = await getApprovedAdvertiserIds();
  
  // Extract advertiser ID from CJ URL
  const match = url.match(/click-\d+-(\d+)/);
  if (!match) {
    return false; // Not a CJ link or can't determine
  }
  
  const advertiserId = match[1];
  return approvedIds.includes(advertiserId);
}

/**
 * Get approved links for a specific category
 */
export async function getApprovedLinksByCategory(category: string): Promise<typeof affiliateLinks.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  
  const links = await db.select()
    .from(affiliateLinks)
    .where(
      and(
        eq(affiliateLinks.category, category),
        eq(affiliateLinks.isActive, true)
      )
    );
  
  return links;
}
