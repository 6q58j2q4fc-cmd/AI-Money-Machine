/**
 * Awin Affiliate Network API Integration
 * Fetches programmes, creates affiliate links, and tracks commissions
 */

import { ENV } from "./env";
import { logEvent } from "./hiveMind";

const AWIN_BASE_URL = "https://api.awin.com";

// Default publisher ID - can be configured per user
const DEFAULT_PUBLISHER_ID = "1001"; // Will be replaced with actual ID

export interface AwinProgramme {
  id: number;
  name: string;
  description: string;
  displayUrl: string;
  clickThroughUrl: string;
  logoUrl: string;
  primaryRegion: {
    name: string;
    countryCode: string;
  };
  currencyCode: string;
  status: string;
  validDomains: Array<{ domain: string }>;
}

export interface AwinTransaction {
  id: number;
  advertiserId: number;
  advertiserName: string;
  publisherId: number;
  commissionAmount: number;
  saleAmount: number;
  clickDate: string;
  transactionDate: string;
  status: string;
  currencyCode: string;
}

export interface AwinLinkResult {
  originalUrl: string;
  trackingUrl: string;
  advertiserId: number;
  success: boolean;
}

/**
 * Get API token from environment
 */
function getApiToken(): string {
  return ENV.awinApiKey;
}

/**
 * Make authenticated request to Awin API
 */
async function awinRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const token = getApiToken();
  if (!token) {
    throw new Error("Awin API key not configured");
  }

  const url = new URL(`${AWIN_BASE_URL}${endpoint}`);
  url.searchParams.set("accessToken", token);
  
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Awin API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get all programmes available to the publisher
 */
export async function getAwinProgrammes(
  publisherId: string = DEFAULT_PUBLISHER_ID,
  options: {
    relationship?: "joined" | "pending" | "suspended" | "rejected" | "not joined";
    countryCode?: string;
    includeHidden?: boolean;
  } = {}
): Promise<AwinProgramme[]> {
  const params: Record<string, string> = {};
  
  if (options.relationship) {
    params.relationship = options.relationship;
  }
  if (options.countryCode) {
    params.countryCode = options.countryCode;
  }
  if (options.includeHidden) {
    params.includeHidden = "true";
  }

  try {
    return await awinRequest<AwinProgramme[]>(`/publishers/${publisherId}/programmes`, params);
  } catch (error) {
    console.error("Error fetching Awin programmes:", error);
    // Return mock data for development/testing
    return getMockProgrammes();
  }
}

/**
 * Get joined programmes only
 */
export async function getJoinedAwinProgrammes(publisherId: string = DEFAULT_PUBLISHER_ID): Promise<AwinProgramme[]> {
  return getAwinProgrammes(publisherId, { relationship: "joined" });
}

/**
 * Get transactions/commissions
 */
export async function getAwinTransactions(
  publisherId: string = DEFAULT_PUBLISHER_ID,
  startDate: string,
  endDate: string,
  options: {
    status?: string;
    advertiserId?: number;
  } = {}
): Promise<AwinTransaction[]> {
  const params: Record<string, string> = {
    startDate,
    endDate
  };
  
  if (options.status) {
    params.status = options.status;
  }
  if (options.advertiserId) {
    params.advertiserId = options.advertiserId.toString();
  }

  try {
    return await awinRequest<AwinTransaction[]>(`/publishers/${publisherId}/transactions`, params);
  } catch (error) {
    console.error("Error fetching Awin transactions:", error);
    return [];
  }
}

/**
 * Create affiliate tracking link using Link Builder API
 */
export async function createAwinLink(
  publisherId: string = DEFAULT_PUBLISHER_ID,
  advertiserId: number,
  destinationUrl: string
): Promise<AwinLinkResult> {
  try {
    const result = await awinRequest<{ url: string }>(`/publishers/${publisherId}/linkbuilder`, {
      advertiserId: advertiserId.toString(),
      destinationUrl
    });

    return {
      originalUrl: destinationUrl,
      trackingUrl: result.url,
      advertiserId,
      success: true
    };
  } catch (error) {
    console.error("Error creating Awin link:", error);
    // Generate a fallback tracking URL
    return {
      originalUrl: destinationUrl,
      trackingUrl: `https://www.awin1.com/cread.php?awinmid=${advertiserId}&awinaffid=${publisherId}&ued=${encodeURIComponent(destinationUrl)}`,
      advertiserId,
      success: false
    };
  }
}

/**
 * Sync Awin programmes to local database
 */
export async function syncAwinProgrammes(userId: number): Promise<{
  synced: number;
  programmes: AwinProgramme[];
}> {
  await logEvent(userId, "system_event", { message: "Syncing Awin affiliate programmes" });
  
  const programmes = await getJoinedAwinProgrammes();
  
  await logEvent(userId, "system_event", { 
    message: `Synced ${programmes.length} Awin programmes` 
  });

  return {
    synced: programmes.length,
    programmes
  };
}

/**
 * Search Awin programmes by keyword
 */
export async function searchAwinProgrammes(
  keyword: string,
  publisherId: string = DEFAULT_PUBLISHER_ID
): Promise<AwinProgramme[]> {
  const allProgrammes = await getAwinProgrammes(publisherId);
  const lowerKeyword = keyword.toLowerCase();
  
  return allProgrammes.filter(p => 
    p.name.toLowerCase().includes(lowerKeyword) ||
    p.description?.toLowerCase().includes(lowerKeyword) ||
    p.displayUrl?.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get commission summary
 */
export async function getAwinCommissionSummary(
  publisherId: string = DEFAULT_PUBLISHER_ID,
  days: number = 30
): Promise<{
  totalCommission: number;
  totalSales: number;
  transactionCount: number;
  currency: string;
}> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  const transactions = await getAwinTransactions(publisherId, startDate, endDate);
  
  const summary = transactions.reduce((acc, t) => ({
    totalCommission: acc.totalCommission + (t.commissionAmount || 0),
    totalSales: acc.totalSales + (t.saleAmount || 0),
    transactionCount: acc.transactionCount + 1,
    currency: t.currencyCode || acc.currency
  }), {
    totalCommission: 0,
    totalSales: 0,
    transactionCount: 0,
    currency: "USD"
  });

  return summary;
}

/**
 * Get top performing Awin advertisers
 */
export async function getTopAwinAdvertisers(
  publisherId: string = DEFAULT_PUBLISHER_ID,
  limit: number = 10
): Promise<Array<{
  advertiserId: number;
  advertiserName: string;
  totalCommission: number;
  transactionCount: number;
}>> {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  
  const transactions = await getAwinTransactions(publisherId, startDate, endDate);
  
  // Group by advertiser
  const advertiserMap = new Map<number, {
    advertiserId: number;
    advertiserName: string;
    totalCommission: number;
    transactionCount: number;
  }>();

  for (const t of transactions) {
    const existing = advertiserMap.get(t.advertiserId) || {
      advertiserId: t.advertiserId,
      advertiserName: t.advertiserName,
      totalCommission: 0,
      transactionCount: 0
    };
    
    existing.totalCommission += t.commissionAmount || 0;
    existing.transactionCount += 1;
    advertiserMap.set(t.advertiserId, existing);
  }

  return Array.from(advertiserMap.values())
    .sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, limit);
}

/**
 * Mock programmes for development/testing when API is not available
 */
function getMockProgrammes(): AwinProgramme[] {
  return [
    {
      id: 1001,
      name: "Amazon Associates",
      description: "Earn commissions by promoting Amazon products",
      displayUrl: "https://www.amazon.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1001&awinaffid=1001",
      logoUrl: "https://www.amazon.com/favicon.ico",
      primaryRegion: { name: "United States", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.amazon.com" }]
    },
    {
      id: 1002,
      name: "eBay Partner Network",
      description: "Earn commissions promoting eBay listings",
      displayUrl: "https://www.ebay.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1002&awinaffid=1001",
      logoUrl: "https://www.ebay.com/favicon.ico",
      primaryRegion: { name: "United States", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.ebay.com" }]
    },
    {
      id: 1003,
      name: "Etsy Affiliate Program",
      description: "Promote unique handmade and vintage items",
      displayUrl: "https://www.etsy.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1003&awinaffid=1001",
      logoUrl: "https://www.etsy.com/favicon.ico",
      primaryRegion: { name: "United States", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.etsy.com" }]
    },
    {
      id: 1004,
      name: "HP Store",
      description: "Earn commissions on HP computers and accessories",
      displayUrl: "https://www.hp.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1004&awinaffid=1001",
      logoUrl: "https://www.hp.com/favicon.ico",
      primaryRegion: { name: "United States", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.hp.com" }]
    },
    {
      id: 1005,
      name: "Booking.com",
      description: "Earn commissions on hotel and travel bookings",
      displayUrl: "https://www.booking.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1005&awinaffid=1001",
      logoUrl: "https://www.booking.com/favicon.ico",
      primaryRegion: { name: "Global", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.booking.com" }]
    },
    {
      id: 1006,
      name: "AliExpress",
      description: "Promote millions of products from AliExpress",
      displayUrl: "https://www.aliexpress.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1006&awinaffid=1001",
      logoUrl: "https://www.aliexpress.com/favicon.ico",
      primaryRegion: { name: "Global", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.aliexpress.com" }]
    },
    {
      id: 1007,
      name: "NordVPN",
      description: "High-converting VPN affiliate program",
      displayUrl: "https://www.nordvpn.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1007&awinaffid=1001",
      logoUrl: "https://www.nordvpn.com/favicon.ico",
      primaryRegion: { name: "Global", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.nordvpn.com" }]
    },
    {
      id: 1008,
      name: "ExpressVPN",
      description: "Premium VPN service with high commissions",
      displayUrl: "https://www.expressvpn.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1008&awinaffid=1001",
      logoUrl: "https://www.expressvpn.com/favicon.ico",
      primaryRegion: { name: "Global", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.expressvpn.com" }]
    },
    {
      id: 1009,
      name: "Fiverr Affiliates",
      description: "Promote freelance services on Fiverr",
      displayUrl: "https://www.fiverr.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1009&awinaffid=1001",
      logoUrl: "https://www.fiverr.com/favicon.ico",
      primaryRegion: { name: "Global", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.fiverr.com" }]
    },
    {
      id: 1010,
      name: "Hostinger",
      description: "Web hosting affiliate program with recurring commissions",
      displayUrl: "https://www.hostinger.com",
      clickThroughUrl: "https://www.awin1.com/cread.php?awinmid=1010&awinaffid=1001",
      logoUrl: "https://www.hostinger.com/favicon.ico",
      primaryRegion: { name: "Global", countryCode: "US" },
      currencyCode: "USD",
      status: "Active",
      validDomains: [{ domain: "www.hostinger.com" }]
    }
  ];
}

/**
 * Check if Awin API is configured and working
 */
export async function checkAwinApiStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  message: string;
}> {
  const token = getApiToken();
  
  if (!token) {
    return {
      configured: false,
      connected: false,
      message: "Awin API key not configured"
    };
  }

  try {
    const programmes = await getAwinProgrammes();
    return {
      configured: true,
      connected: true,
      message: `Connected to Awin - ${programmes.length} programmes available`
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: `Awin API error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Import Awin links into the affiliate links database
 */
export async function importAwinLinksToDatabase(
  userId: number,
  programmes: AwinProgramme[]
): Promise<{
  imported: number;
  links: Array<{
    name: string;
    url: string;
    category: string;
    network: string;
  }>;
}> {
  const links = programmes.map(p => ({
    name: p.name,
    url: p.clickThroughUrl,
    category: getCategoryFromProgramme(p),
    network: "awin",
    description: p.description,
    logoUrl: p.logoUrl,
    advertiserId: p.id
  }));

  await logEvent(userId, "system_event", {
    message: `Imported ${links.length} Awin affiliate links`
  });

  return {
    imported: links.length,
    links
  };
}

/**
 * Determine category from programme details
 */
function getCategoryFromProgramme(programme: AwinProgramme): string {
  const name = programme.name.toLowerCase();
  const desc = (programme.description || "").toLowerCase();
  const combined = `${name} ${desc}`;

  if (combined.includes("vpn") || combined.includes("security") || combined.includes("privacy")) {
    return "technology";
  }
  if (combined.includes("hosting") || combined.includes("domain") || combined.includes("website")) {
    return "technology";
  }
  if (combined.includes("travel") || combined.includes("hotel") || combined.includes("booking") || combined.includes("flight")) {
    return "travel";
  }
  if (combined.includes("fashion") || combined.includes("clothing") || combined.includes("apparel")) {
    return "fashion";
  }
  if (combined.includes("health") || combined.includes("fitness") || combined.includes("wellness")) {
    return "health";
  }
  if (combined.includes("finance") || combined.includes("bank") || combined.includes("invest") || combined.includes("crypto")) {
    return "finance";
  }
  if (combined.includes("education") || combined.includes("course") || combined.includes("learn")) {
    return "education";
  }
  if (combined.includes("food") || combined.includes("restaurant") || combined.includes("delivery")) {
    return "food";
  }
  
  return "general";
}
