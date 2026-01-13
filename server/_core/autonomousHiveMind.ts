/**
 * Autonomous Hive Mind System
 * 
 * This module provides:
 * 1. Full system data awareness across all pages
 * 2. Auto-waking feature for autonomous operation
 * 3. CJ link verification and approved vendor checking
 * 4. Unified bot communication with real-time data sync
 */

import { getDb } from '../db';
import { 
  articles, affiliateLinks, articleDistribution, auditLog, 
  trendingTopics, savedTopics, botLearning, analyticsEvents,
  automationSettings, articleAffiliateLinks
} from '../../drizzle/schema';
import { eq, desc, sql, and, gte, count, sum, avg, isNotNull } from 'drizzle-orm';
import { invokeMultiLLM } from './multiLlm';
import { searchCJLinks, getJoinedAdvertisers, getJoinedAdvertiserLinks } from './cjApi';
import { logEvent } from './hiveMind';

// Constants
const CJ_WEBSITE_ID = '101630462';
const CJ_CID = '7841523';

// Global state for autonomous operation
interface AutonomousState {
  isRunning: boolean;
  lastWakeTime: Date;
  lastCJSync: Date;
  approvedVendors: Map<string, ApprovedVendor>;
  systemMetrics: SystemMetrics;
  autoWakeInterval: NodeJS.Timeout | null;
}

interface ApprovedVendor {
  advertiserId: string;
  advertiserName: string;
  category: string;
  epc: string;
  links: CJLinkInfo[];
  lastVerified: Date;
}

interface CJLinkInfo {
  linkId: string;
  clickUrl: string;
  linkName: string;
  isActive: boolean;
}

interface SystemMetrics {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalClicks: number;
  totalDistributions: number;
  successfulDistributions: number;
  totalAffiliateLinks: number;
  activeAffiliateLinks: number;
  automationCycles: number;
  botDecisions: number;
  lastUpdated: Date;
}

// Initialize autonomous state
let autonomousState: AutonomousState = {
  isRunning: false,
  lastWakeTime: new Date(),
  lastCJSync: new Date(0),
  approvedVendors: new Map(),
  systemMetrics: {
    totalArticles: 0,
    publishedArticles: 0,
    totalViews: 0,
    totalClicks: 0,
    totalDistributions: 0,
    successfulDistributions: 0,
    totalAffiliateLinks: 0,
    activeAffiliateLinks: 0,
    automationCycles: 0,
    botDecisions: 0,
    lastUpdated: new Date(),
  },
  autoWakeInterval: null,
};

/**
 * Get comprehensive system data from all pages
 */
export async function getFullSystemData(userId: number): Promise<{
  articles: any;
  affiliateLinks: any;
  distribution: any;
  automation: any;
  analytics: any;
  topics: any;
  botLearning: any;
  auditLog: any;
  cjVendors: any;
  systemHealth: any;
}> {
  const db = await getDb();
  if (!db) {
    return {
      articles: { error: 'Database not available' },
      affiliateLinks: { error: 'Database not available' },
      distribution: { error: 'Database not available' },
      automation: { error: 'Database not available' },
      analytics: { error: 'Database not available' },
      topics: { error: 'Database not available' },
      botLearning: { error: 'Database not available' },
      auditLog: { error: 'Database not available' },
      cjVendors: { error: 'Database not available' },
      systemHealth: { error: 'Database not available' },
    };
  }

  // Gather data from all tables
  const [
    articleStats,
    recentArticles,
    linkStats,
    recentLinks,
    distStats,
    recentDistributions,
    automationData,
    topicStats,
    recentTopics,
    learningData,
    recentEvents,
    eventStats,
  ] = await Promise.all([
    // Article statistics
    db.select({
      total: sql<number>`COUNT(*)`,
      published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      draft: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
      totalViews: sql<number>`COALESCE(SUM(views), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(clicks), 0)`,
      avgSeoScore: sql<number>`COALESCE(AVG(seoScore), 0)`,
      withAffiliateLinks: sql<number>`0`,
    }).from(articles).where(eq(articles.userId, userId)),

    // Recent articles
    db.select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      views: articles.views,
      clicks: articles.clicks,
      seoScore: articles.seoScore,
      createdAt: articles.createdAt,
    }).from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(desc(articles.createdAt))
      .limit(20),

    // Affiliate link statistics
    db.select({
      total: sql<number>`COUNT(*)`,
      totalClicks: sql<number>`COALESCE(SUM(clicks), 0)`,
      activeLinks: sql<number>`SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END)`,
      uniquePrograms: sql<number>`COUNT(DISTINCT program)`,
    }).from(affiliateLinks).where(eq(affiliateLinks.userId, userId)),

    // Recent affiliate links
    db.select({
      id: affiliateLinks.id,
      name: affiliateLinks.name,
      program: affiliateLinks.program,
      clicks: affiliateLinks.clicks,
      isActive: affiliateLinks.isActive,
      category: affiliateLinks.category,
    }).from(affiliateLinks)
      .where(eq(affiliateLinks.userId, userId))
      .orderBy(desc(affiliateLinks.clicks))
      .limit(20),

    // Distribution statistics
    db.select({
      total: sql<number>`COUNT(*)`,
      published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      uniquePlatforms: sql<number>`COUNT(DISTINCT platform)`,
    }).from(articleDistribution).where(eq(articleDistribution.userId, userId)),

    // Recent distributions
    db.select({
      id: articleDistribution.id,
      articleId: articleDistribution.articleId,
      platform: articleDistribution.platform,
      status: articleDistribution.status,
      externalUrl: articleDistribution.externalUrl,
      createdAt: articleDistribution.createdAt,
    }).from(articleDistribution)
      .where(eq(articleDistribution.userId, userId))
      .orderBy(desc(articleDistribution.createdAt))
      .limit(20),

    // Automation settings
    db.select().from(automationSettings).where(eq(automationSettings.userId, userId)).limit(1),

    // Topic statistics
    db.select({
      total: sql<number>`COUNT(*)`,
      saved: sql<number>`COUNT(*)`,
    }).from(savedTopics).where(eq(savedTopics.userId, userId)),

    // Recent trending topics
    db.select({
      id: trendingTopics.id,
      title: trendingTopics.title,
      category: trendingTopics.category,
      popularityScore: trendingTopics.popularityScore,
    }).from(trendingTopics)
      .orderBy(desc(trendingTopics.popularityScore))
      .limit(20),

    // Bot learning data
    db.select({
      total: sql<number>`COUNT(*)`,
      successRate: sql<number>`AVG(CASE WHEN wasCorrect = 1 THEN 100 ELSE 0 END)`,
    }).from(botLearning).where(eq(botLearning.userId, userId)),

    // Recent audit events
    db.select({
      id: auditLog.id,
      eventType: auditLog.eventType,
      action: auditLog.action,
      description: auditLog.description,
      wasSuccessful: auditLog.wasSuccessful,
      createdAt: auditLog.createdAt,
    }).from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(50),

    // Event statistics
    db.select({
      totalEvents: sql<number>`COUNT(*)`,
      articlesCreated: sql<number>`SUM(CASE WHEN eventType = 'article_created' THEN 1 ELSE 0 END)`,
      articlesPublished: sql<number>`SUM(CASE WHEN eventType = 'article_published' THEN 1 ELSE 0 END)`,
      distributionsQueued: sql<number>`SUM(CASE WHEN eventType = 'distribution_queued' THEN 1 ELSE 0 END)`,
      distributionsPublished: sql<number>`SUM(CASE WHEN eventType = 'distribution_published' THEN 1 ELSE 0 END)`,
      automationCycles: sql<number>`SUM(CASE WHEN eventType LIKE 'automation_%' THEN 1 ELSE 0 END)`,
      botDecisions: sql<number>`SUM(CASE WHEN eventType LIKE 'bot_%' THEN 1 ELSE 0 END)`,
    }).from(auditLog).where(eq(auditLog.userId, userId)),
  ]);

  // Get approved CJ vendors
  const approvedVendors = Array.from(autonomousState.approvedVendors.values());

  return {
    articles: {
      stats: articleStats[0],
      recent: recentArticles,
    },
    affiliateLinks: {
      stats: linkStats[0],
      recent: recentLinks,
    },
    distribution: {
      stats: distStats[0],
      recent: recentDistributions,
    },
    automation: {
      settings: automationData[0] || null,
      isEnabled: automationData[0]?.isEnabled || false,
      cycleInterval: automationData[0]?.cycleIntervalMinutes || 60,
    },
    analytics: {
      totalViews: articleStats[0]?.totalViews || 0,
      totalClicks: articleStats[0]?.totalClicks || 0,
      conversionRate: articleStats[0]?.totalViews > 0 
        ? ((articleStats[0]?.totalClicks || 0) / articleStats[0].totalViews * 100).toFixed(2)
        : '0.00',
    },
    topics: {
      stats: topicStats[0],
      trending: recentTopics,
    },
    botLearning: {
      stats: learningData[0],
      successRate: learningData[0]?.successRate || 0,
    },
    auditLog: {
      recent: recentEvents,
      stats: eventStats[0],
    },
    cjVendors: {
      approved: approvedVendors,
      lastSync: autonomousState.lastCJSync,
      totalVendors: approvedVendors.length,
    },
    systemHealth: {
      isAutonomousRunning: autonomousState.isRunning,
      lastWakeTime: autonomousState.lastWakeTime,
      articlesWithLinks: articleStats[0]?.withAffiliateLinks || 0,
      articlesWithoutLinks: (articleStats[0]?.total || 0) - (articleStats[0]?.withAffiliateLinks || 0),
    },
  };
}

/**
 * Ask the Hive Mind with full system awareness
 */
export async function askHiveMindWithFullContext(
  userId: number,
  question: string
): Promise<{
  response: string;
  dataUsed: string[];
  recommendations: string[];
  actions: string[];
}> {
  // Get full system data
  const systemData = await getFullSystemData(userId);

  const systemPrompt = `You are the Hive Mind - the central AI intelligence for MoneyMachine, a content monetization platform.

You have COMPLETE access to ALL system data in real-time:

=== ARTICLES DATA ===
Total Articles: ${systemData.articles.stats?.total || 0}
Published: ${systemData.articles.stats?.published || 0}
Draft: ${systemData.articles.stats?.draft || 0}
Total Views: ${systemData.articles.stats?.totalViews || 0}
Total Clicks: ${systemData.articles.stats?.totalClicks || 0}
Average SEO Score: ${Number(systemData.articles.stats?.avgSeoScore || 0).toFixed(1)}
Articles with Affiliate Links: ${systemData.articles.stats?.withAffiliateLinks || 0}

Recent Articles:
${systemData.articles.recent?.slice(0, 10).map((a: any) => 
  `- "${a.title}" (${a.status}, ${a.views} views, ${a.clicks} clicks, SEO: ${a.seoScore})`
).join('\n') || 'No articles'}

=== AFFILIATE LINKS DATA ===
Total Links: ${systemData.affiliateLinks.stats?.total || 0}
Active Links: ${systemData.affiliateLinks.stats?.activeLinks || 0}
Total Clicks: ${systemData.affiliateLinks.stats?.totalClicks || 0}
Unique Advertisers: ${systemData.affiliateLinks.stats?.uniqueAdvertisers || 0}

Top Performing Links:
${systemData.affiliateLinks.recent?.slice(0, 10).map((l: any) => 
  `- ${l.advertiserName}: "${l.linkName}" (${l.clicks} clicks, ${l.isActive ? 'Active' : 'Inactive'})`
).join('\n') || 'No links'}

=== DISTRIBUTION DATA ===
Total Distributions: ${systemData.distribution.stats?.total || 0}
Published: ${systemData.distribution.stats?.published || 0}
Pending: ${systemData.distribution.stats?.pending || 0}
Failed: ${systemData.distribution.stats?.failed || 0}
Platforms Used: ${systemData.distribution.stats?.uniquePlatforms || 0}

Recent Distributions:
${systemData.distribution.recent?.slice(0, 10).map((d: any) => 
  `- Article #${d.articleId} → ${d.platform} (${d.status})`
).join('\n') || 'No distributions'}

=== AUTOMATION DATA ===
Automation Enabled: ${systemData.automation.isEnabled ? 'Yes' : 'No'}
Cycle Interval: ${systemData.automation.cycleInterval} minutes

=== ANALYTICS ===
Total Views: ${systemData.analytics.totalViews}
Total Clicks: ${systemData.analytics.totalClicks}
Conversion Rate: ${systemData.analytics.conversionRate}%

=== TRENDING TOPICS ===
${systemData.topics.trending?.slice(0, 10).map((t: any) => 
  `- ${t.topic} (${t.category}, Score: ${t.trendScore})`
).join('\n') || 'No trending topics'}

=== BOT LEARNING ===
Total Learning Events: ${systemData.botLearning.stats?.total || 0}
Success Rate: ${systemData.botLearning.stats?.successRate?.toFixed(1) || 0}%

=== CJ AFFILIATE VENDORS ===
Approved Vendors: ${systemData.cjVendors.totalVendors}
Last CJ Sync: ${systemData.cjVendors.lastSync}

=== AUDIT LOG (Recent Events) ===
Total Events: ${systemData.auditLog.stats?.totalEvents || 0}
Articles Created: ${systemData.auditLog.stats?.articlesCreated || 0}
Articles Published: ${systemData.auditLog.stats?.articlesPublished || 0}
Distributions Queued: ${systemData.auditLog.stats?.distributionsQueued || 0}
Automation Cycles: ${systemData.auditLog.stats?.automationCycles || 0}
Bot Decisions: ${systemData.auditLog.stats?.botDecisions || 0}

Recent Activity:
${systemData.auditLog.recent?.slice(0, 15).map((e: any) => 
  `- [${e.eventType}] ${e.action} (${e.wasSuccessful ? '✓' : '✗'})`
).join('\n') || 'No recent events'}

=== SYSTEM HEALTH ===
Autonomous Mode: ${systemData.systemHealth.isAutonomousRunning ? 'Running' : 'Stopped'}
Last Wake: ${systemData.systemHealth.lastWakeTime}
Articles with Links: ${systemData.systemHealth.articlesWithLinks}
Articles Missing Links: ${systemData.systemHealth.articlesWithoutLinks}

---

Based on this comprehensive data, answer the user's question with specific, data-driven insights.
Always provide:
1. Direct answer to the question
2. Relevant metrics and data points
3. Actionable recommendations
4. Specific next steps

Be concise but thorough. Reference actual numbers from the data.`;

  try {
    const response = await invokeMultiLLM(
      'deep_reasoning',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      { maxTokens: 1500 }
    );

    // Extract recommendations and actions from response
    const recommendations: string[] = [];
    const actions: string[] = [];
    
    // Parse numbered lists for recommendations
    const recMatches = response.content.match(/(?:recommend|suggest|should|could).*?(?:\n|$)/gi);
    if (recMatches) {
      recommendations.push(...recMatches.slice(0, 5).map(r => r.trim()));
    }

    // Parse action items
    const actionMatches = response.content.match(/\d+\.\s+([^\n]+)/g);
    if (actionMatches) {
      actions.push(...actionMatches.slice(0, 5).map(a => a.replace(/^\d+\.\s+/, '').trim()));
    }

    // Log the query
    await logEvent(userId, 'bot_decision', {
      message: `Hive Mind query: "${question.substring(0, 50)}..."`,
      metadata: {
        questionLength: question.length,
        responseLength: response.content.length,
        dataPointsUsed: Object.keys(systemData).length,
      },
    });

    return {
      response: response.content,
      dataUsed: Object.keys(systemData),
      recommendations,
      actions,
    };
  } catch (error: any) {
    console.error('Hive Mind query failed:', error?.message || error);
    return {
      response: `I apologize, but I encountered an error processing your request: ${error?.message || 'Unknown error'}. The system data is available, but the AI analysis failed. Please try again.`,
      dataUsed: ['articles', 'affiliateLinks', 'distribution', 'automation', 'analytics', 'topics', 'botLearning', 'auditLog', 'cjVendors', 'systemHealth'],
      recommendations: ['Retry the query', 'Check system connectivity', 'Try a simpler question'],
      actions: ['Refresh the page', 'Click Run All Bots to update system state'],
    };
  }
}

/**
 * Sync CJ approved vendors and links
 */
export async function syncCJApprovedVendors(userId: number): Promise<{
  success: boolean;
  vendorsFound: number;
  linksFound: number;
  newVendors: string[];
}> {
  try {
    // Get joined advertisers
    const advertisersResult = await getJoinedAdvertisers(CJ_CID);
    
    // Get joined advertiser links
    const linksResult = await getJoinedAdvertiserLinks(CJ_WEBSITE_ID);

    if (!advertisersResult.success && !linksResult.success) {
      return {
        success: false,
        vendorsFound: 0,
        linksFound: 0,
        newVendors: [],
      };
    }

    const newVendors: string[] = [];

    // Process advertisers
    for (const advertiser of advertisersResult.advertisers || []) {
      const existingVendor = autonomousState.approvedVendors.get(advertiser.advertiserId);
      
      if (!existingVendor) {
        newVendors.push(advertiser.advertiserName);
      }

      // Find links for this advertiser
      const vendorLinks = (linksResult.links || [])
        .filter(link => link.advertiserId === advertiser.advertiserId)
        .map(link => ({
          linkId: link.advertiserId,
          clickUrl: link.clickUrl,
          linkName: link.linkName,
          isActive: true,
        }));

      autonomousState.approvedVendors.set(advertiser.advertiserId, {
        advertiserId: advertiser.advertiserId,
        advertiserName: advertiser.advertiserName,
        category: advertiser.category,
        epc: advertiser.sevenDayEpc || advertiser.threeMonthEpc || '0',
        links: vendorLinks,
        lastVerified: new Date(),
      });
    }

    autonomousState.lastCJSync = new Date();

    // Log the sync
    await logEvent(userId, 'system_event', {
      message: `CJ vendor sync completed: ${advertisersResult.advertisers?.length || 0} vendors, ${linksResult.links?.length || 0} links`,
      metadata: {
        vendorsFound: advertisersResult.advertisers?.length || 0,
        linksFound: linksResult.links?.length || 0,
        newVendors: newVendors.length,
      },
    });

    return {
      success: true,
      vendorsFound: advertisersResult.advertisers?.length || 0,
      linksFound: linksResult.links?.length || 0,
      newVendors,
    };
  } catch (error) {
    console.error('CJ sync failed:', error);
    return {
      success: false,
      vendorsFound: 0,
      linksFound: 0,
      newVendors: [],
    };
  }
}

/**
 * Verify article has valid CJ affiliate links
 */
export async function verifyArticleAffiliateLinks(
  userId: number,
  articleId: number
): Promise<{
  isValid: boolean;
  hasLinks: boolean;
  validLinks: number;
  invalidLinks: number;
  missingVendors: string[];
  recommendations: string[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      isValid: false,
      hasLinks: false,
      validLinks: 0,
      invalidLinks: 0,
      missingVendors: [],
      recommendations: ['Database not available'],
    };
  }

  // Get article
  const article = await db.select().from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
    .limit(1);

  if (!article[0]) {
    return {
      isValid: false,
      hasLinks: false,
      validLinks: 0,
      invalidLinks: 0,
      missingVendors: [],
      recommendations: ['Article not found'],
    };
  }

  // Get article's affiliate links
  const articleLinks = await db.select({
    affiliateLink: affiliateLinks,
  })
    .from(articleAffiliateLinks)
    .innerJoin(affiliateLinks, eq(articleAffiliateLinks.affiliateLinkId, affiliateLinks.id))
    .where(eq(articleAffiliateLinks.articleId, articleId));

  if (articleLinks.length === 0) {
    return {
      isValid: false,
      hasLinks: false,
      validLinks: 0,
      invalidLinks: 0,
      missingVendors: [],
      recommendations: [
        'Article has no affiliate links',
        'Add CJ affiliate links to monetize this content',
        'Consider running the content pipeline to auto-insert links',
      ],
    };
  }

  let validLinks = 0;
  let invalidLinks = 0;
  const missingVendors: string[] = [];

  for (const { affiliateLink } of articleLinks) {
    // Check if vendor is approved - use program field as vendor identifier
    const vendorId = affiliateLink.program || affiliateLink.category || '';
    const vendor = autonomousState.approvedVendors.get(vendorId);
    
    if (affiliateLink.isActive && affiliateLink.url) {
      validLinks++;
    } else {
      invalidLinks++;
      if (!vendor && affiliateLink.name) {
        missingVendors.push(affiliateLink.name);
      }
    }
  }

  const recommendations: string[] = [];
  if (invalidLinks > 0) {
    recommendations.push(`${invalidLinks} links need verification or replacement`);
  }
  if (missingVendors.length > 0) {
    recommendations.push(`Vendors not in approved list: ${missingVendors.join(', ')}`);
  }
  if (validLinks < 3) {
    recommendations.push('Consider adding more affiliate links for better monetization');
  }

  return {
    isValid: invalidLinks === 0 && validLinks > 0,
    hasLinks: articleLinks.length > 0,
    validLinks,
    invalidLinks,
    missingVendors: Array.from(new Set(missingVendors)),
    recommendations,
  };
}

/**
 * Get approved vendors for article generation
 */
export function getApprovedVendorsForContent(): ApprovedVendor[] {
  return Array.from(autonomousState.approvedVendors.values())
    .filter(v => v.links.length > 0)
    .sort((a, b) => parseFloat(b.epc) - parseFloat(a.epc));
}

/**
 * Start autonomous operation
 */
export async function startAutonomousOperation(userId: number): Promise<{
  success: boolean;
  message: string;
}> {
  if (autonomousState.isRunning) {
    return { success: true, message: 'Autonomous operation already running' };
  }

  autonomousState.isRunning = true;
  autonomousState.lastWakeTime = new Date();

  // Initial CJ sync
  await syncCJApprovedVendors(userId);

  // Log the start
  await logEvent(userId, 'system_event', {
    message: 'Autonomous Hive Mind operation started',
    metadata: {
      startTime: new Date().toISOString(),
      approvedVendors: autonomousState.approvedVendors.size,
    },
  });

  return {
    success: true,
    message: `Autonomous operation started with ${autonomousState.approvedVendors.size} approved vendors`,
  };
}

/**
 * Stop autonomous operation
 */
export async function stopAutonomousOperation(userId: number): Promise<{
  success: boolean;
  message: string;
}> {
  if (!autonomousState.isRunning) {
    return { success: true, message: 'Autonomous operation not running' };
  }

  autonomousState.isRunning = false;

  if (autonomousState.autoWakeInterval) {
    clearInterval(autonomousState.autoWakeInterval);
    autonomousState.autoWakeInterval = null;
  }

  await logEvent(userId, 'system_event', {
    message: 'Autonomous Hive Mind operation stopped',
    metadata: {
      stopTime: new Date().toISOString(),
      runtime: Date.now() - autonomousState.lastWakeTime.getTime(),
    },
  });

  return {
    success: true,
    message: 'Autonomous operation stopped',
  };
}

/**
 * Get autonomous state
 */
export function getAutonomousState(): {
  isRunning: boolean;
  lastWakeTime: Date;
  lastCJSync: Date;
  approvedVendorsCount: number;
  systemMetrics: SystemMetrics;
} {
  return {
    isRunning: autonomousState.isRunning,
    lastWakeTime: autonomousState.lastWakeTime,
    lastCJSync: autonomousState.lastCJSync,
    approvedVendorsCount: autonomousState.approvedVendors.size,
    systemMetrics: autonomousState.systemMetrics,
  };
}

/**
 * Auto-wake the system - runs all necessary operations
 */
export async function autoWake(userId: number): Promise<{
  success: boolean;
  operations: string[];
  errors: string[];
}> {
  const operations: string[] = [];
  const errors: string[] = [];

  autonomousState.lastWakeTime = new Date();

  try {
    // 1. Sync CJ vendors
    const cjSync = await syncCJApprovedVendors(userId);
    if (cjSync.success) {
      operations.push(`Synced ${cjSync.vendorsFound} CJ vendors, ${cjSync.linksFound} links`);
    } else {
      errors.push('CJ vendor sync failed');
    }

    // 2. Update system metrics
    const systemData = await getFullSystemData(userId);
    autonomousState.systemMetrics = {
      totalArticles: systemData.articles.stats?.total || 0,
      publishedArticles: systemData.articles.stats?.published || 0,
      totalViews: systemData.articles.stats?.totalViews || 0,
      totalClicks: systemData.articles.stats?.totalClicks || 0,
      totalDistributions: systemData.distribution.stats?.total || 0,
      successfulDistributions: systemData.distribution.stats?.published || 0,
      totalAffiliateLinks: systemData.affiliateLinks.stats?.total || 0,
      activeAffiliateLinks: systemData.affiliateLinks.stats?.activeLinks || 0,
      automationCycles: systemData.auditLog.stats?.automationCycles || 0,
      botDecisions: systemData.auditLog.stats?.botDecisions || 0,
      lastUpdated: new Date(),
    };
    operations.push('Updated system metrics');

    // 3. Log the wake event
    await logEvent(userId, 'system_event', {
      message: 'Auto-wake completed',
      metadata: {
        operationsCount: operations.length,
        errorsCount: errors.length,
        metrics: autonomousState.systemMetrics,
      },
    });
    operations.push('Logged wake event');

  } catch (error) {
    console.error('Auto-wake error:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return {
    success: errors.length === 0,
    operations,
    errors,
  };
}
