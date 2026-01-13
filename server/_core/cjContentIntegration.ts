/**
 * CJ Content Integration
 * 
 * This service ensures:
 * 1. Articles are only written about products with valid CJ affiliate links
 * 2. All CJ links are verified and working
 * 3. New approved vendors are automatically discovered
 * 4. Content is optimized for CJ affiliate conversions
 */

import { getDb } from '../db';
import { articles, affiliateLinks, cjProducts, articleAffiliateLinks } from '../../drizzle/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { searchCJLinks, getJoinedAdvertisers, getJoinedAdvertiserLinks, searchCJAdvertisers } from './cjApi';
import { logEvent } from './hiveMind';
import { invokeMultiLLM } from './multiLlm';

// Constants
const CJ_WEBSITE_ID = '101630462';
const CJ_CID = '7841523';

interface CJVendorInfo {
  advertiserId: string;
  advertiserName: string;
  category: string;
  epc: string;
  commission: string;
  links: Array<{
    linkName: string;
    clickUrl: string;
    description: string;
  }>;
}

interface ContentSuggestion {
  topic: string;
  vendor: CJVendorInfo;
  suggestedTitle: string;
  keywords: string[];
  affiliateLinks: string[];
}

/**
 * Get all approved CJ vendors with their links
 */
export async function getApprovedCJVendors(userId: number): Promise<CJVendorInfo[]> {
  try {
    // Get joined advertisers
    const advertisersResult = await getJoinedAdvertisers(CJ_CID);
    
    if (!advertisersResult.success) {
      console.error('[CJ Integration] Failed to get joined advertisers');
      return [];
    }

    // Get all links for joined advertisers
    const linksResult = await getJoinedAdvertiserLinks(CJ_WEBSITE_ID);
    
    const vendors: CJVendorInfo[] = [];
    
    for (const advertiser of advertisersResult.advertisers || []) {
      // Find links for this advertiser
      const advertiserLinks = (linksResult.links || [])
        .filter(link => link.advertiserId === advertiser.advertiserId)
        .map(link => ({
          linkName: link.linkName,
          clickUrl: link.clickUrl,
          description: link.description || '',
        }));

      if (advertiserLinks.length > 0) {
        vendors.push({
          advertiserId: advertiser.advertiserId,
          advertiserName: advertiser.advertiserName,
          category: advertiser.category,
          epc: advertiser.sevenDayEpc || advertiser.threeMonthEpc || '0',
          commission: advertiser.actionCommission || 'Variable',
          links: advertiserLinks,
        });
      }
    }

    // Sort by EPC (highest first)
    vendors.sort((a, b) => parseFloat(b.epc) - parseFloat(a.epc));

    // Log the sync
    await logEvent(userId, 'system_event', {
      message: `Retrieved ${vendors.length} approved CJ vendors with ${vendors.reduce((sum, v) => sum + v.links.length, 0)} total links`,
      metadata: {
        vendorCount: vendors.length,
        topVendors: vendors.slice(0, 5).map(v => v.advertiserName),
      },
    });

    return vendors;
  } catch (error) {
    console.error('[CJ Integration] Error getting approved vendors:', error);
    return [];
  }
}

/**
 * Verify a CJ link is still active and working
 */
export async function verifyCJLink(clickUrl: string): Promise<{
  isValid: boolean;
  statusCode?: number;
  error?: string;
}> {
  try {
    // Make a HEAD request to check if the link is valid
    const response = await fetch(clickUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });

    return {
      isValid: response.ok || response.status === 301 || response.status === 302,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get content suggestions based on approved CJ vendors
 */
export async function getCJContentSuggestions(
  userId: number,
  count: number = 5
): Promise<ContentSuggestion[]> {
  const vendors = await getApprovedCJVendors(userId);
  
  if (vendors.length === 0) {
    return [];
  }

  const suggestions: ContentSuggestion[] = [];

  // Get top vendors by EPC
  const topVendors = vendors.slice(0, count * 2);

  for (const vendor of topVendors.slice(0, count)) {
    try {
      // Generate content suggestion using LLM
      const prompt = `Generate a blog article topic for the following affiliate vendor:
Vendor: ${vendor.advertiserName}
Category: ${vendor.category}
Commission: ${vendor.commission}

Available affiliate links:
${vendor.links.slice(0, 3).map(l => `- ${l.linkName}: ${l.description}`).join('\n')}

Respond with JSON:
{
  "topic": "Brief topic description",
  "suggestedTitle": "SEO-optimized article title (50-60 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

      const response = await invokeMultiLLM(
        'topic_research',
        [{ role: 'user', content: prompt }],
        { maxTokens: 300 }
      );

      // Parse the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions.push({
          topic: parsed.topic,
          vendor,
          suggestedTitle: parsed.suggestedTitle,
          keywords: parsed.keywords || [],
          affiliateLinks: vendor.links.slice(0, 3).map(l => l.clickUrl),
        });
      }
    } catch (error) {
      console.error(`[CJ Integration] Failed to generate suggestion for ${vendor.advertiserName}:`, error);
    }
  }

  return suggestions;
}

/**
 * Check if an article topic has valid CJ affiliate links available
 */
export async function checkTopicHasCJLinks(
  topic: string,
  keywords: string[]
): Promise<{
  hasLinks: boolean;
  matchingVendors: Array<{
    advertiserName: string;
    linkCount: number;
    epc: string;
  }>;
  suggestedLinks: Array<{
    advertiserName: string;
    linkName: string;
    clickUrl: string;
  }>;
}> {
  try {
    // Search for links matching the topic keywords
    const searchTerms = [topic, ...keywords.slice(0, 2)].join(' ');
    
    const linksResult = await searchCJLinks({
      websiteId: CJ_WEBSITE_ID,
      keywords: searchTerms,
      advertiserIds: 'joined',
      recordsPerPage: 20,
    });

    if (!linksResult.success || linksResult.links.length === 0) {
      return {
        hasLinks: false,
        matchingVendors: [],
        suggestedLinks: [],
      };
    }

    // Group by advertiser
    const vendorMap = new Map<string, {
      advertiserName: string;
      links: typeof linksResult.links;
    }>();

    for (const link of linksResult.links) {
      if (!vendorMap.has(link.advertiserId)) {
        vendorMap.set(link.advertiserId, {
          advertiserName: link.advertiserName,
          links: [],
        });
      }
      vendorMap.get(link.advertiserId)!.links.push(link);
    }

    const matchingVendors = Array.from(vendorMap.values()).map(v => ({
      advertiserName: v.advertiserName,
      linkCount: v.links.length,
      epc: '0', // Would need to fetch from advertiser lookup
    }));

    const suggestedLinks = linksResult.links.slice(0, 5).map(link => ({
      advertiserName: link.advertiserName,
      linkName: link.linkName,
      clickUrl: link.clickUrl,
    }));

    return {
      hasLinks: true,
      matchingVendors,
      suggestedLinks,
    };
  } catch (error) {
    console.error('[CJ Integration] Error checking topic CJ links:', error);
    return {
      hasLinks: false,
      matchingVendors: [],
      suggestedLinks: [],
    };
  }
}

/**
 * Save CJ products to database for caching
 */
export async function cacheCJProducts(userId: number): Promise<{
  success: boolean;
  productsCached: number;
}> {
  const db = await getDb();
  if (!db) return { success: false, productsCached: 0 };

  try {
    const vendors = await getApprovedCJVendors(userId);
    let productsCached = 0;

    for (const vendor of vendors) {
      for (const link of vendor.links) {
        try {
          await db.insert(cjProducts).values({
            userId,
            advertiserId: vendor.advertiserId,
            advertiserName: vendor.advertiserName,
            category: vendor.category,
            productName: link.linkName,
            affiliateUrl: link.clickUrl,
            epc: vendor.epc,
            commission: vendor.commission,
            isActive: true,
          }).onDuplicateKeyUpdate({
            set: {
              epc: vendor.epc,
              commission: vendor.commission,
              isActive: true,
              updatedAt: new Date(),
            },
          });
          productsCached++;
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    await logEvent(userId, 'system_event', {
      message: `Cached ${productsCached} CJ products from ${vendors.length} vendors`,
      metadata: { productsCached, vendorCount: vendors.length },
    });

    return { success: true, productsCached };
  } catch (error) {
    console.error('[CJ Integration] Error caching products:', error);
    return { success: false, productsCached: 0 };
  }
}

/**
 * Get cached CJ products for content generation
 */
export async function getCachedCJProducts(
  userId: number,
  category?: string,
  limit: number = 50
): Promise<Array<{
  id: number;
  advertiserId: string;
  advertiserName: string;
  category: string;
  productName: string;
  affiliateUrl: string;
  epc: string;
  commission: string;
}>> {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select({
      id: cjProducts.id,
      advertiserId: cjProducts.advertiserId,
      advertiserName: cjProducts.advertiserName,
      category: cjProducts.category,
      productName: cjProducts.productName,
      affiliateUrl: cjProducts.affiliateUrl,
      epc: cjProducts.epc,
      commission: cjProducts.commission,
    })
      .from(cjProducts)
      .where(and(
        eq(cjProducts.userId, userId),
        eq(cjProducts.isActive, true)
      ))
      .orderBy(desc(cjProducts.epc))
      .limit(limit);

    const products = await query;
    return products.map(p => ({
      ...p,
      category: p.category || 'general',
      productName: p.productName || 'Unknown Product',
      epc: p.epc || '0',
      commission: p.commission || 'Variable',
    }));
  } catch (error) {
    console.error('[CJ Integration] Error getting cached products:', error);
    return [];
  }
}

/**
 * Link CJ affiliate links to an article
 */
export async function linkCJToArticle(
  userId: number,
  articleId: number,
  cjProductIds: number[]
): Promise<{
  success: boolean;
  linksAdded: number;
}> {
  const db = await getDb();
  if (!db) return { success: false, linksAdded: 0 };

  try {
    // Get the CJ products
    const products = await db.select()
      .from(cjProducts)
      .where(and(
        eq(cjProducts.userId, userId),
        inArray(cjProducts.id, cjProductIds)
      ));

    let linksAdded = 0;

    for (const product of products) {
      // Create affiliate link entry
      const [linkResult] = await db.insert(affiliateLinks).values({
        userId,
        name: product.productName || 'CJ Product',
        url: product.affiliateUrl,
        shortCode: `cj-${product.advertiserId}-${Date.now()}`,
        category: product.category || 'general',
        program: 'CJ Affiliate',
        commission: product.commission,
        isActive: true,
      });

      // Link to article
      if (linkResult.insertId) {
        await db.insert(articleAffiliateLinks).values({
          articleId,
          affiliateLinkId: Number(linkResult.insertId),
          anchorText: product.productName,
        });
        linksAdded++;
      }
    }

    if (linksAdded > 0) {
      await logEvent(userId, 'affiliate_link_added', {
        message: `Added ${linksAdded} CJ affiliate links to article #${articleId}`,
        articleId,
        metadata: {
          linksAdded,
          productIds: cjProductIds,
        },
      });
    }

    return { success: true, linksAdded };
  } catch (error) {
    console.error('[CJ Integration] Error linking CJ to article:', error);
    return { success: false, linksAdded: 0 };
  }
}

/**
 * Verify all CJ links in an article are still valid
 */
export async function verifyArticleCJLinks(
  userId: number,
  articleId: number
): Promise<{
  totalLinks: number;
  validLinks: number;
  invalidLinks: Array<{
    linkId: number;
    linkName: string;
    error: string;
  }>;
}> {
  const db = await getDb();
  if (!db) return { totalLinks: 0, validLinks: 0, invalidLinks: [] };

  try {
    // Get article's affiliate links
    const articleLinks = await db.select({
      linkId: affiliateLinks.id,
      linkName: affiliateLinks.name,
      url: affiliateLinks.url,
      program: affiliateLinks.program,
    })
      .from(articleAffiliateLinks)
      .innerJoin(affiliateLinks, eq(articleAffiliateLinks.affiliateLinkId, affiliateLinks.id))
      .where(eq(articleAffiliateLinks.articleId, articleId));

    // Filter to CJ links only
    const cjLinks = articleLinks.filter(l => l.program === 'CJ Affiliate');
    
    const invalidLinks: Array<{ linkId: number; linkName: string; error: string }> = [];
    let validLinks = 0;

    for (const link of cjLinks) {
      const verification = await verifyCJLink(link.url);
      
      if (verification.isValid) {
        validLinks++;
      } else {
        invalidLinks.push({
          linkId: link.linkId,
          linkName: link.linkName,
          error: verification.error || `HTTP ${verification.statusCode}`,
        });
      }
    }

    if (invalidLinks.length > 0) {
      await logEvent(userId, 'bot_optimization', {
        message: `Article #${articleId} has ${invalidLinks.length} invalid CJ links`,
        articleId,
        metadata: {
          totalLinks: cjLinks.length,
          validLinks,
          invalidLinks: invalidLinks.map(l => l.linkName),
        },
      });
    }

    return {
      totalLinks: cjLinks.length,
      validLinks,
      invalidLinks,
    };
  } catch (error) {
    console.error('[CJ Integration] Error verifying article CJ links:', error);
    return { totalLinks: 0, validLinks: 0, invalidLinks: [] };
  }
}

/**
 * Get new CJ vendors that we haven't joined yet
 */
export async function getNewCJVendorOpportunities(
  userId: number,
  category?: string
): Promise<Array<{
  advertiserId: string;
  advertiserName: string;
  category: string;
  epc: string;
  programUrl: string;
}>> {
  try {
    const result = await searchCJAdvertisers({
      cid: CJ_CID,
      keywords: category,
      relationshipStatus: 'notjoined',
      recordsPerPage: 50,
    });

    if (!result.success) {
      return [];
    }

    // Sort by EPC and return top opportunities
    const opportunities = (result.advertisers || [])
      .map(a => ({
        advertiserId: a.advertiserId,
        advertiserName: a.advertiserName,
        category: a.category,
        epc: a.sevenDayEpc || a.threeMonthEpc || '0',
        programUrl: a.programUrl,
      }))
      .sort((a, b) => parseFloat(b.epc) - parseFloat(a.epc))
      .slice(0, 20);

    await logEvent(userId, 'system_event', {
      message: `Found ${opportunities.length} new CJ vendor opportunities`,
      metadata: {
        topOpportunities: opportunities.slice(0, 5).map(o => o.advertiserName),
      },
    });

    return opportunities;
  } catch (error) {
    console.error('[CJ Integration] Error getting new vendor opportunities:', error);
    return [];
  }
}
