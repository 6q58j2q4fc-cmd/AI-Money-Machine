/**
 * Platform Discovery System
 * Automatically discovers and integrates free posting platforms
 * for maximum content distribution and monetization
 */

import { getDb } from "../db";
import { articleDistribution, articles, affiliateLinks } from "../../drizzle/schema";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { logEvent } from "./hiveMind";
import { invokeLLM } from "./llm";

// Known free platforms that accept content
export const FREE_PLATFORMS = [
  // Instant Publishing (No account needed)
  { id: 'telegraph', name: 'Telegraph', type: 'instant', url: 'https://telegra.ph', requiresAuth: false, dailyLimit: 100 },
  { id: 'pastebin', name: 'Pastebin', type: 'instant', url: 'https://pastebin.com', requiresAuth: false, dailyLimit: 50 },
  { id: 'rentry', name: 'Rentry.co', type: 'instant', url: 'https://rentry.co', requiresAuth: false, dailyLimit: 100 },
  { id: 'ghostbin', name: 'Ghostbin', type: 'instant', url: 'https://ghostbin.com', requiresAuth: false, dailyLimit: 50 },
  
  // Blog Platforms (Account required)
  { id: 'medium', name: 'Medium', type: 'blog', url: 'https://medium.com', requiresAuth: true, dailyLimit: 3 },
  { id: 'devto', name: 'Dev.to', type: 'blog', url: 'https://dev.to', requiresAuth: true, dailyLimit: 5 },
  { id: 'hashnode', name: 'Hashnode', type: 'blog', url: 'https://hashnode.com', requiresAuth: true, dailyLimit: 5 },
  { id: 'blogger', name: 'Blogger', type: 'blog', url: 'https://blogger.com', requiresAuth: true, dailyLimit: 10 },
  { id: 'wordpress', name: 'WordPress.com', type: 'blog', url: 'https://wordpress.com', requiresAuth: true, dailyLimit: 10 },
  { id: 'tumblr', name: 'Tumblr', type: 'blog', url: 'https://tumblr.com', requiresAuth: true, dailyLimit: 20 },
  { id: 'substack', name: 'Substack', type: 'newsletter', url: 'https://substack.com', requiresAuth: true, dailyLimit: 2 },
  
  // Social/Community Platforms
  { id: 'linkedin', name: 'LinkedIn Articles', type: 'social', url: 'https://linkedin.com', requiresAuth: true, dailyLimit: 3 },
  { id: 'reddit', name: 'Reddit', type: 'social', url: 'https://reddit.com', requiresAuth: true, dailyLimit: 5 },
  { id: 'quora', name: 'Quora', type: 'social', url: 'https://quora.com', requiresAuth: true, dailyLimit: 10 },
  
  // Article Directories
  { id: 'hubpages', name: 'HubPages', type: 'directory', url: 'https://hubpages.com', requiresAuth: true, dailyLimit: 2 },
  { id: 'ezinearticles', name: 'EzineArticles', type: 'directory', url: 'https://ezinearticles.com', requiresAuth: true, dailyLimit: 5 },
  { id: 'articlebiz', name: 'ArticleBiz', type: 'directory', url: 'https://articlebiz.com', requiresAuth: true, dailyLimit: 5 },
  
  // Press Release Sites
  { id: 'prlog', name: 'PRLog', type: 'press', url: 'https://prlog.org', requiresAuth: true, dailyLimit: 3 },
  { id: 'openpr', name: 'OpenPR', type: 'press', url: 'https://openpr.com', requiresAuth: true, dailyLimit: 3 },
  { id: 'pr.com', name: 'PR.com', type: 'press', url: 'https://pr.com', requiresAuth: true, dailyLimit: 2 },
  
  // Document Sharing
  { id: 'slideshare', name: 'SlideShare', type: 'document', url: 'https://slideshare.net', requiresAuth: true, dailyLimit: 5 },
  { id: 'scribd', name: 'Scribd', type: 'document', url: 'https://scribd.com', requiresAuth: true, dailyLimit: 3 },
  { id: 'issuu', name: 'Issuu', type: 'document', url: 'https://issuu.com', requiresAuth: true, dailyLimit: 5 },
  
  // Video Platforms (for video content)
  { id: 'youtube', name: 'YouTube', type: 'video', url: 'https://youtube.com', requiresAuth: true, dailyLimit: 5 },
  { id: 'vimeo', name: 'Vimeo', type: 'video', url: 'https://vimeo.com', requiresAuth: true, dailyLimit: 5 },
  { id: 'dailymotion', name: 'Dailymotion', type: 'video', url: 'https://dailymotion.com', requiresAuth: true, dailyLimit: 10 },
  
  // Podcast Platforms
  { id: 'anchor', name: 'Anchor/Spotify', type: 'podcast', url: 'https://anchor.fm', requiresAuth: true, dailyLimit: 3 },
  { id: 'buzzsprout', name: 'Buzzsprout', type: 'podcast', url: 'https://buzzsprout.com', requiresAuth: true, dailyLimit: 3 },
];

// Monetization platforms beyond affiliate marketing
export const MONETIZATION_PLATFORMS = [
  // Ad Networks
  { id: 'adsense', name: 'Google AdSense', type: 'ads', minTraffic: 1000, payoutMethod: 'bank' },
  { id: 'mediavine', name: 'Mediavine', type: 'ads', minTraffic: 50000, payoutMethod: 'paypal' },
  { id: 'ezoic', name: 'Ezoic', type: 'ads', minTraffic: 10000, payoutMethod: 'paypal' },
  { id: 'adthrive', name: 'AdThrive', type: 'ads', minTraffic: 100000, payoutMethod: 'bank' },
  
  // Link Shorteners with Monetization
  { id: 'shorte.st', name: 'Shorte.st', type: 'links', minTraffic: 0, payoutMethod: 'paypal' },
  { id: 'adf.ly', name: 'Adf.ly', type: 'links', minTraffic: 0, payoutMethod: 'paypal' },
  { id: 'linkvertise', name: 'Linkvertise', type: 'links', minTraffic: 0, payoutMethod: 'paypal' },
  
  // Content Monetization
  { id: 'medium_partner', name: 'Medium Partner Program', type: 'content', minTraffic: 100, payoutMethod: 'stripe' },
  { id: 'vocal', name: 'Vocal Media', type: 'content', minTraffic: 0, payoutMethod: 'stripe' },
  { id: 'newsbreak', name: 'NewsBreak', type: 'content', minTraffic: 0, payoutMethod: 'paypal' },
  
  // Sponsored Content
  { id: 'cooperatize', name: 'Cooperatize', type: 'sponsored', minTraffic: 1000, payoutMethod: 'paypal' },
  { id: 'izea', name: 'IZEA', type: 'sponsored', minTraffic: 1000, payoutMethod: 'paypal' },
  
  // Tip/Donation
  { id: 'buymeacoffee', name: 'Buy Me a Coffee', type: 'tips', minTraffic: 0, payoutMethod: 'paypal' },
  { id: 'kofi', name: 'Ko-fi', type: 'tips', minTraffic: 0, payoutMethod: 'paypal' },
  { id: 'patreon', name: 'Patreon', type: 'subscription', minTraffic: 0, payoutMethod: 'paypal' },
];

interface DiscoveredPlatform {
  id: string;
  name: string;
  type: string;
  url: string;
  potentialReach: number;
  monetizationPotential: 'high' | 'medium' | 'low';
  integrationComplexity: 'easy' | 'medium' | 'hard';
  requiresAuth: boolean;
}

interface PlatformStatus {
  platformId: string;
  isConnected: boolean;
  lastPublished: Date | null;
  publishCount: number;
  successRate: number;
}

/**
 * Discover new free platforms for content distribution
 */
export async function discoverNewPlatforms(): Promise<DiscoveredPlatform[]> {
  const discovered: DiscoveredPlatform[] = [];
  
  // Use LLM to discover trending platforms
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert in content distribution and monetization. 
          Your task is to identify FREE platforms where content can be published to drive traffic and affiliate clicks.
          Focus on platforms that:
          1. Allow affiliate links in content
          2. Have good SEO (content gets indexed by Google)
          3. Don't require payment to publish
          4. Have decent traffic/reach`
        },
        {
          role: 'user',
          content: `List 5 lesser-known FREE platforms where I can publish SEO-optimized articles with affiliate links.
          For each platform, provide:
          - Platform name and URL
          - Type (blog, forum, directory, etc.)
          - Estimated monthly reach
          - Whether it allows affiliate links
          - How easy it is to publish (easy/medium/hard)
          
          Return as JSON array with fields: name, url, type, reach, allowsAffiliateLinks, difficulty`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'platform_discovery',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              platforms: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' },
                    type: { type: 'string' },
                    reach: { type: 'number' },
                    allowsAffiliateLinks: { type: 'boolean' },
                    difficulty: { type: 'string' }
                  },
                  required: ['name', 'url', 'type', 'reach', 'allowsAffiliateLinks', 'difficulty'],
                  additionalProperties: false
                }
              }
            },
            required: ['platforms'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      const parsed = JSON.parse(content);
      for (const p of parsed.platforms || []) {
        discovered.push({
          id: p.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          name: p.name,
          type: p.type,
          url: p.url,
          potentialReach: p.reach,
          monetizationPotential: p.allowsAffiliateLinks ? 'high' : 'low',
          integrationComplexity: p.difficulty as 'easy' | 'medium' | 'hard',
          requiresAuth: p.difficulty !== 'easy'
        });
      }
    }
  } catch (error) {
    console.error('Platform discovery error:', error);
  }
  
  await logEvent(0, 'system_event', { message: `Discovered ${discovered.length} new platforms` });
  
  return discovered;
}

/**
 * Get status of all known platforms
 */
export async function getPlatformStatuses(): Promise<PlatformStatus[]> {
  const db = await getDb();
  if (!db) return [];
  const statuses: PlatformStatus[] = [];
  
  for (const platform of FREE_PLATFORMS) {
    const distributions = await db
      .select()
      .from(articleDistribution)
      .where(eq(articleDistribution.platform, platform.id as any));
    
    const successCount = distributions.filter(d => d.status === 'published').length;
    const totalCount = distributions.length;
    
    statuses.push({
      platformId: platform.id,
      isConnected: platform.requiresAuth === false || totalCount > 0,
      lastPublished: distributions.length > 0 
        ? new Date(Math.max(...distributions.map(d => d.createdAt.getTime())))
        : null,
      publishCount: totalCount,
      successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0
    });
  }
  
  return statuses;
}

/**
 * Auto-select best platforms for an article based on content type
 */
export async function selectBestPlatforms(articleId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const article = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  
  if (!article[0]) return [];
  
  const content = article[0].content || '';
  const category = (article[0] as any).category || 'general';
  
  const selectedPlatforms: string[] = [];
  
  // Always include instant publishing platforms (no auth needed)
  selectedPlatforms.push('telegraph', 'rentry');
  
  // Select based on content type
  if (category.toLowerCase().includes('tech') || category.toLowerCase().includes('dev')) {
    selectedPlatforms.push('devto', 'hashnode');
  }
  
  if (category.toLowerCase().includes('business') || category.toLowerCase().includes('marketing')) {
    selectedPlatforms.push('linkedin', 'medium');
  }
  
  if (content.length > 2000) {
    // Long-form content works well on these
    selectedPlatforms.push('medium', 'hubpages');
  }
  
  // Always try to maximize distribution
  selectedPlatforms.push('blogger', 'tumblr', 'wordpress');
  
  // Remove duplicates
  return Array.from(new Set(selectedPlatforms));
}

/**
 * Get monetization recommendations based on current traffic
 */
export async function getMonetizationRecommendations(monthlyViews: number): Promise<typeof MONETIZATION_PLATFORMS[0][]> {
  return MONETIZATION_PLATFORMS.filter(p => p.minTraffic <= monthlyViews);
}

/**
 * Scan for new monetization opportunities
 */
export async function scanMonetizationOpportunities(): Promise<{
  currentOpportunities: string[];
  futureOpportunities: string[];
  recommendations: string[];
}> {
  const db = await getDb();
  if (!db) return { currentOpportunities: [], futureOpportunities: [], recommendations: [] };
  
  // Get current stats
  const articleCount = await db.select({ count: sql<number>`count(*)` }).from(articles);
  const linkCount = await db.select({ count: sql<number>`count(*)` }).from(affiliateLinks);
  
  // Estimate monthly views (simplified)
  const estimatedMonthlyViews = (articleCount[0]?.count || 0) * 10;
  
  const availableNow = MONETIZATION_PLATFORMS.filter(p => p.minTraffic <= estimatedMonthlyViews);
  const availableLater = MONETIZATION_PLATFORMS.filter(p => p.minTraffic > estimatedMonthlyViews);
  
  const recommendations: string[] = [];
  
  // PayPal-compatible platforms are prioritized
  const paypalPlatforms = availableNow.filter(p => p.payoutMethod === 'paypal');
  if (paypalPlatforms.length > 0) {
    recommendations.push(`You can start earning immediately with: ${paypalPlatforms.map(p => p.name).join(', ')}`);
  }
  
  // Link shortener monetization
  const linkShorteners = availableNow.filter(p => p.type === 'links');
  if (linkShorteners.length > 0) {
    recommendations.push(`Use monetized link shorteners for additional income: ${linkShorteners.map(p => p.name).join(', ')}`);
  }
  
  // Tip/donation platforms
  const tipPlatforms = availableNow.filter(p => p.type === 'tips');
  if (tipPlatforms.length > 0) {
    recommendations.push(`Add tip buttons to articles: ${tipPlatforms.map(p => p.name).join(', ')}`);
  }
  
  await logEvent(0, 'system_event', { message: `Found ${availableNow.length} current and ${availableLater.length} future opportunities` });
  
  return {
    currentOpportunities: availableNow.map(p => p.name),
    futureOpportunities: availableLater.map(p => p.name),
    recommendations
  };
}

/**
 * Auto-integrate a monetization platform
 */
export async function autoIntegratePlatform(platformId: string, paypalEmail: string): Promise<{
  success: boolean;
  message: string;
  setupUrl?: string;
}> {
  const platform = MONETIZATION_PLATFORMS.find(p => p.id === platformId);
  
  if (!platform) {
    return { success: false, message: 'Platform not found' };
  }
  
  // For PayPal-compatible platforms, provide setup instructions
  if (platform.payoutMethod === 'paypal') {
    await logEvent(0, 'system_event', { message: `Setting up ${platform.name} with PayPal: ${paypalEmail}` });
    
    return {
      success: true,
      message: `${platform.name} can be set up with your PayPal (${paypalEmail}). Visit the setup URL to complete integration.`,
      setupUrl: platform.id === 'buymeacoffee' ? 'https://buymeacoffee.com/signup' :
                platform.id === 'kofi' ? 'https://ko-fi.com/account/register' :
                platform.id === 'shorte.st' ? 'https://shorte.st/ref/register' :
                platform.id === 'adf.ly' ? 'https://adf.ly/register' :
                `https://${platform.id}.com/signup`
    };
  }
  
  return {
    success: true,
    message: `${platform.name} integration initiated. Follow the setup URL to complete.`,
    setupUrl: `https://${platform.id}.com/signup`
  };
}

/**
 * Get all platforms summary
 */
export async function getAllPlatformsSummary(): Promise<{
  freePlatforms: typeof FREE_PLATFORMS;
  monetizationPlatforms: typeof MONETIZATION_PLATFORMS;
  connectedCount: number;
  totalPublished: number;
}> {
  const db = await getDb();
  if (!db) return { freePlatforms: FREE_PLATFORMS, monetizationPlatforms: MONETIZATION_PLATFORMS, connectedCount: 0, totalPublished: 0 };
  
  const distributions = await db
    .select({ count: sql<number>`count(*)` })
    .from(articleDistribution)
    .where(eq(articleDistribution.status, 'published'));
  
  const connectedPlatforms = FREE_PLATFORMS.filter(p => !p.requiresAuth).length;
  
  return {
    freePlatforms: FREE_PLATFORMS,
    monetizationPlatforms: MONETIZATION_PLATFORMS,
    connectedCount: connectedPlatforms,
    totalPublished: distributions[0]?.count || 0
  };
}
