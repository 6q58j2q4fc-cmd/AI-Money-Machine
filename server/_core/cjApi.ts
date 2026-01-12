import { ENV } from "./env";

interface CJLink {
  advertiserId: string;
  advertiserName: string;
  category: string;
  clickUrl: string;
  destination: string;
  linkName: string;
  linkType: string;
  saleCommission: string;
  description: string;
  relationshipStatus?: string;
}

interface CJSearchResult {
  success: boolean;
  links: CJLink[];
  totalMatched: number;
  error?: string;
}

interface CJAdvertiser {
  advertiserId: string;
  advertiserName: string;
  category: string;
  networkRank: string;
  sevenDayEpc: string;
  threeMonthEpc: string;
  programUrl: string;
  relationshipStatus: string;
  mobileTrackingCertified: boolean;
  networkEarnings: string;
  actionCommission: string;
}

interface CJAdvertiserResult {
  success: boolean;
  advertisers: CJAdvertiser[];
  totalMatched: number;
  error?: string;
}

/**
 * Search for affiliate links from CJ using the Link Search API
 */
export async function searchCJLinks(params: {
  websiteId: string;
  keywords?: string;
  advertiserIds?: string;
  linkType?: string;
  category?: string;
  recordsPerPage?: number;
}): Promise<CJSearchResult> {
  const apiKey = ENV.cjApiKey;
  
  if (!apiKey) {
    console.error("[CJ API] No API key configured");
    return { success: false, links: [], totalMatched: 0, error: "No CJ API key configured" };
  }

  const queryParams = new URLSearchParams();
  queryParams.set("website-id", params.websiteId);
  
  if (params.keywords) queryParams.set("keywords", params.keywords);
  if (params.advertiserIds) queryParams.set("advertiser-ids", params.advertiserIds);
  if (params.linkType) queryParams.set("link-type", params.linkType);
  if (params.category) queryParams.set("category", params.category);
  queryParams.set("records-per-page", String(params.recordsPerPage || 100));

  const url = `https://link-search.api.cj.com/v2/link-search?${queryParams.toString()}`;
  
  console.log(`[CJ API] Searching links: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/xml",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CJ API] Error ${response.status}: ${errorText}`);
      return { 
        success: false, 
        links: [], 
        totalMatched: 0, 
        error: `CJ API error: ${response.status} - ${errorText}` 
      };
    }

    const xmlText = await response.text();
    console.log(`[CJ API] Response received, parsing XML...`);
    
    // Parse XML response
    const links = parseCJXmlResponse(xmlText);
    const totalMatched = extractTotalMatched(xmlText);
    
    console.log(`[CJ API] Found ${links.length} links (total matched: ${totalMatched})`);
    
    return { success: true, links, totalMatched };
  } catch (error) {
    console.error("[CJ API] Request failed:", error);
    return { 
      success: false, 
      links: [], 
      totalMatched: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Search for advertisers using the Advertiser Lookup API
 */
export async function searchCJAdvertisers(params: {
  cid: string;
  keywords?: string;
  advertiserIds?: string;
  category?: string;
  relationshipStatus?: "joined" | "notjoined" | "";
  recordsPerPage?: number;
}): Promise<CJAdvertiserResult> {
  const apiKey = ENV.cjApiKey;
  
  if (!apiKey) {
    console.error("[CJ API] No API key configured");
    return { success: false, advertisers: [], totalMatched: 0, error: "No CJ API key configured" };
  }

  const queryParams = new URLSearchParams();
  queryParams.set("requestor-cid", params.cid);
  
  if (params.keywords) queryParams.set("keywords", params.keywords);
  // For non-joined advertisers, use "notjoined" value
  if (params.relationshipStatus === "notjoined") {
    queryParams.set("advertiser-ids", "notjoined");
  } else if (params.relationshipStatus === "joined") {
    queryParams.set("advertiser-ids", "joined");
  } else if (params.advertiserIds) {
    queryParams.set("advertiser-ids", params.advertiserIds);
  }
  queryParams.set("records-per-page", String(params.recordsPerPage || 100));

  // Use v2 endpoint as per CJ documentation
  const url = `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?${queryParams.toString()}`;
  
  console.log(`[CJ API] Searching advertisers: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/xml",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CJ API] Advertiser lookup error ${response.status}: ${errorText}`);
      return { 
        success: false, 
        advertisers: [], 
        totalMatched: 0, 
        error: `CJ API error: ${response.status} - ${errorText}` 
      };
    }

    const xmlText = await response.text();
    console.log(`[CJ API] Advertiser response received, parsing XML...`);
    
    // Parse XML response
    const advertisers = parseCJAdvertiserResponse(xmlText);
    const totalMatched = extractTotalMatched(xmlText);
    
    console.log(`[CJ API] Found ${advertisers.length} advertisers (total matched: ${totalMatched})`);
    
    return { success: true, advertisers, totalMatched };
  } catch (error) {
    console.error("[CJ API] Advertiser lookup failed:", error);
    return { 
      success: false, 
      advertisers: [], 
      totalMatched: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get non-joined advertisers to show available programs
 */
export async function getNonJoinedAdvertisers(cid: string, keywords?: string): Promise<CJAdvertiserResult> {
  return searchCJAdvertisers({
    cid,
    keywords,
    relationshipStatus: "notjoined",
    recordsPerPage: 100,
  });
}

/**
 * Get joined advertisers
 */
export async function getJoinedAdvertisers(cid: string): Promise<CJAdvertiserResult> {
  return searchCJAdvertisers({
    cid,
    relationshipStatus: "joined",
    recordsPerPage: 100,
  });
}

/**
 * Get all joined advertiser links
 */
export async function getJoinedAdvertiserLinks(websiteId: string): Promise<CJSearchResult> {
  return searchCJLinks({
    websiteId,
    advertiserIds: "joined",
    recordsPerPage: 100,
  });
}

/**
 * Get non-joined advertiser links (for preview)
 */
export async function getNonJoinedAdvertiserLinks(websiteId: string, keywords?: string): Promise<CJSearchResult> {
  return searchCJLinks({
    websiteId,
    keywords,
    advertiserIds: "notjoined",
    recordsPerPage: 100,
  });
}

/**
 * Search for product-related affiliate links by keyword
 */
export async function searchProductLinks(websiteId: string, keyword: string): Promise<CJSearchResult> {
  return searchCJLinks({
    websiteId,
    keywords: keyword,
    advertiserIds: "joined",
    linkType: "Text Link",
    recordsPerPage: 50,
  });
}

/**
 * Parse CJ XML response to extract links
 */
function parseCJXmlResponse(xml: string): CJLink[] {
  const links: CJLink[] = [];
  
  // Simple XML parsing using regex (for reliability without external dependencies)
  const linkMatches = xml.match(/<link>([\s\S]*?)<\/link>/g);
  
  if (!linkMatches) {
    return links;
  }

  for (const linkXml of linkMatches) {
    const link: CJLink = {
      advertiserId: extractXmlValue(linkXml, "advertiser-id") || "",
      advertiserName: extractXmlValue(linkXml, "advertiser-name") || "",
      category: extractXmlValue(linkXml, "category") || "",
      clickUrl: extractXmlValue(linkXml, "clickUrl") || extractXmlValue(linkXml, "click-url") || "",
      destination: extractXmlValue(linkXml, "destination") || "",
      linkName: extractXmlValue(linkXml, "link-name") || "",
      linkType: extractXmlValue(linkXml, "link-type") || "",
      saleCommission: extractXmlValue(linkXml, "sale-commission") || "",
      description: extractXmlValue(linkXml, "description") || "",
      relationshipStatus: extractXmlValue(linkXml, "relationship-status") || "",
    };
    
    if (link.clickUrl || link.advertiserId) {
      links.push(link);
    }
  }

  return links;
}

/**
 * Parse CJ Advertiser XML response
 */
function parseCJAdvertiserResponse(xml: string): CJAdvertiser[] {
  const advertisers: CJAdvertiser[] = [];
  
  // Match advertiser elements
  const advertiserMatches = xml.match(/<advertiser>([\s\S]*?)<\/advertiser>/g);
  
  if (!advertiserMatches) {
    return advertisers;
  }

  for (const advXml of advertiserMatches) {
    const advertiser: CJAdvertiser = {
      advertiserId: extractXmlValue(advXml, "advertiser-id") || "",
      advertiserName: extractXmlValue(advXml, "advertiser-name") || "",
      category: extractXmlValue(advXml, "primary-category") || extractXmlValue(advXml, "category") || "",
      networkRank: extractXmlValue(advXml, "network-rank") || "",
      sevenDayEpc: extractXmlValue(advXml, "seven-day-epc") || "",
      threeMonthEpc: extractXmlValue(advXml, "three-month-epc") || "",
      programUrl: extractXmlValue(advXml, "program-url") || "",
      relationshipStatus: extractXmlValue(advXml, "relationship-status") || "",
      mobileTrackingCertified: extractXmlValue(advXml, "mobile-tracking-certified") === "true",
      networkEarnings: extractXmlValue(advXml, "network-earnings") || "",
      actionCommission: extractXmlValue(advXml, "actions")?.match(/commission="([^"]+)"/)?.[1] || "",
    };
    
    if (advertiser.advertiserId) {
      advertisers.push(advertiser);
    }
  }

  return advertisers;
}

/**
 * Extract value from XML tag
 */
function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract total-matched attribute from response
 */
function extractTotalMatched(xml: string): number {
  const match = xml.match(/total-matched="(\d+)"/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Generate a CJ deep link for a specific destination URL
 */
export function generateCJDeepLink(
  publisherId: string,
  advertiserId: string,
  destinationUrl: string
): string {
  // CJ deep link format
  const encodedUrl = encodeURIComponent(destinationUrl);
  return `https://www.anrdoezrs.net/links/${publisherId}/type/dlg/sid/moneymachine/${encodedUrl}`;
}

/**
 * Get the CJ program application URL for an advertiser
 */
export function getCJProgramUrl(advertiserId: string): string {
  return `https://members.cj.com/member/publisher/home.do#advertiserDetails/cid=${advertiserId}`;
}
