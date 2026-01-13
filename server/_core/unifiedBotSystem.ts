/**
 * Unified Bot Communication System
 * 
 * This system ensures all bots, LLMs, and the Hive Mind communicate efficiently:
 * 1. Real-time data synchronization across all pages
 * 2. Centralized decision-making through the Hive Mind
 * 3. Bot coordination for content generation, SEO, and distribution
 * 4. Automatic learning and optimization
 */

import { getDb } from '../db';
import { 
  articles, affiliateLinks, articleDistribution, automationSettings, 
  auditLog, cjProducts 
} from '../../drizzle/schema';
import { eq, desc, sql, and, gte, count } from 'drizzle-orm';
import { logEvent, getHiveMindState } from './hiveMind';
import { getApprovedCJVendors, checkTopicHasCJLinks } from './cjContentIntegration';
import { invokeMultiLLM, getAvailableProviders } from './multiLlm';

// Bot Types
type BotType = 
  | 'content_bot'      // Generates articles
  | 'seo_bot'          // Optimizes SEO
  | 'distribution_bot' // Handles distribution
  | 'affiliate_bot'    // Manages affiliate links
  | 'analytics_bot'    // Analyzes performance
  | 'learning_bot';    // Learns from data

interface BotMessage {
  from: BotType;
  to: BotType | 'hive_mind' | 'all';
  type: 'request' | 'response' | 'update' | 'alert';
  payload: Record<string, unknown>;
  timestamp: Date;
}

interface BotState {
  type: BotType;
  isActive: boolean;
  lastAction: Date | null;
  pendingTasks: number;
  completedTasks: number;
  errors: number;
}

// In-memory bot state
const botStates: Map<BotType, BotState> = new Map();
const messageQueue: BotMessage[] = [];
const MAX_QUEUE_SIZE = 1000;

// Initialize bot states
const BOT_TYPES: BotType[] = [
  'content_bot', 'seo_bot', 'distribution_bot', 
  'affiliate_bot', 'analytics_bot', 'learning_bot'
];

for (const botType of BOT_TYPES) {
  botStates.set(botType, {
    type: botType,
    isActive: true,
    lastAction: null,
    pendingTasks: 0,
    completedTasks: 0,
    errors: 0,
  });
}

/**
 * Send a message between bots
 */
export function sendBotMessage(message: Omit<BotMessage, 'timestamp'>): void {
  const fullMessage: BotMessage = {
    ...message,
    timestamp: new Date(),
  };
  
  messageQueue.push(fullMessage);
  
  // Trim queue if too large
  if (messageQueue.length > MAX_QUEUE_SIZE) {
    messageQueue.splice(0, messageQueue.length - MAX_QUEUE_SIZE);
  }
  
  // Update sender state
  const senderState = botStates.get(message.from);
  if (senderState) {
    senderState.lastAction = new Date();
  }
}

/**
 * Get messages for a specific bot
 */
export function getBotMessages(botType: BotType, limit: number = 50): BotMessage[] {
  return messageQueue
    .filter(m => m.to === botType || m.to === 'all' || m.to === 'hive_mind')
    .slice(-limit);
}

/**
 * Get all bot states
 */
export function getAllBotStates(): BotState[] {
  return Array.from(botStates.values());
}

/**
 * Get unified system data for all bots
 */
export async function getUnifiedSystemData(userId: number): Promise<{
  articles: {
    total: number;
    published: number;
    draft: number;
    avgSeoScore: number;
    recentArticles: Array<{ id: number; title: string; status: string; seoScore: number | null }>;
  };
  affiliateLinks: {
    total: number;
    active: number;
    totalClicks: number;
    topLinks: Array<{ id: number; name: string; clicks: number }>;
  };
  distribution: {
    total: number;
    published: number;
    pending: number;
    platforms: Record<string, number>;
  };
  cjVendors: {
    total: number;
    topVendors: Array<{ name: string; epc: string }>;
  };
  performance: {
    totalViews: number;
    totalClicks: number;
    conversionRate: number;
  };
  botActivity: {
    totalMessages: number;
    activeBotsCount: number;
    recentActions: string[];
  };
}> {
  const db = await getDb();
  if (!db) {
    return {
      articles: { total: 0, published: 0, draft: 0, avgSeoScore: 0, recentArticles: [] },
      affiliateLinks: { total: 0, active: 0, totalClicks: 0, topLinks: [] },
      distribution: { total: 0, published: 0, pending: 0, platforms: {} },
      cjVendors: { total: 0, topVendors: [] },
      performance: { totalViews: 0, totalClicks: 0, conversionRate: 0 },
      botActivity: { totalMessages: 0, activeBotsCount: 0, recentActions: [] },
    };
  }

  try {
    // Get article stats
    const articleStats = await db.select({
      total: count(),
      published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      draft: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
      avgSeoScore: sql<number>`AVG(seoScore)`,
    })
      .from(articles)
      .where(eq(articles.userId, userId));

    const recentArticles = await db.select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      seoScore: articles.seoScore,
    })
      .from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(desc(articles.createdAt))
      .limit(10);

    // Get affiliate link stats
    const linkStats = await db.select({
      total: count(),
      active: sql<number>`SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END)`,
      totalClicks: sql<number>`SUM(clicks)`,
    })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.userId, userId));

    const topLinks = await db.select({
      id: affiliateLinks.id,
      name: affiliateLinks.name,
      clicks: affiliateLinks.clicks,
    })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.userId, userId))
      .orderBy(desc(affiliateLinks.clicks))
      .limit(5);

    // Get distribution stats
    const distStats = await db.select({
      total: count(),
      published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
    })
      .from(articleDistribution)
      .where(eq(articleDistribution.userId, userId));

    // Get CJ vendors
    const cjVendors = await getApprovedCJVendors(userId);

    // Calculate performance
    const totalViews = recentArticles.reduce((sum, a) => sum + (a.seoScore || 0), 0);
    const totalClicks = Number(linkStats[0]?.totalClicks || 0);
    const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    // Get bot activity
    const activeBotsCount = Array.from(botStates.values()).filter(b => b.isActive).length;
    const recentActions = messageQueue.slice(-10).map(m => 
      `${m.from} → ${m.to}: ${m.type}`
    );

    return {
      articles: {
        total: Number(articleStats[0]?.total || 0),
        published: Number(articleStats[0]?.published || 0),
        draft: Number(articleStats[0]?.draft || 0),
        avgSeoScore: Number(articleStats[0]?.avgSeoScore || 0),
        recentArticles: recentArticles.map(a => ({
          id: a.id,
          title: a.title,
          status: a.status,
          seoScore: a.seoScore,
        })),
      },
      affiliateLinks: {
        total: Number(linkStats[0]?.total || 0),
        active: Number(linkStats[0]?.active || 0),
        totalClicks,
        topLinks: topLinks.map(l => ({
          id: l.id,
          name: l.name,
          clicks: l.clicks || 0,
        })),
      },
      distribution: {
        total: Number(distStats[0]?.total || 0),
        published: Number(distStats[0]?.published || 0),
        pending: Number(distStats[0]?.pending || 0),
        platforms: {},
      },
      cjVendors: {
        total: cjVendors.length,
        topVendors: cjVendors.slice(0, 5).map(v => ({
          name: v.advertiserName,
          epc: v.epc,
        })),
      },
      performance: {
        totalViews,
        totalClicks,
        conversionRate,
      },
      botActivity: {
        totalMessages: messageQueue.length,
        activeBotsCount,
        recentActions,
      },
    };
  } catch (error) {
    console.error('[UnifiedBot] Error getting system data:', error);
    return {
      articles: { total: 0, published: 0, draft: 0, avgSeoScore: 0, recentArticles: [] },
      affiliateLinks: { total: 0, active: 0, totalClicks: 0, topLinks: [] },
      distribution: { total: 0, published: 0, pending: 0, platforms: {} },
      cjVendors: { total: 0, topVendors: [] },
      performance: { totalViews: 0, totalClicks: 0, conversionRate: 0 },
      botActivity: { totalMessages: 0, activeBotsCount: 0, recentActions: [] },
    };
  }
}

/**
 * Content Bot: Generates articles based on CJ vendors and trending topics
 */
export async function runContentBot(userId: number): Promise<{
  success: boolean;
  articlesGenerated: number;
  topicsFound: number;
  actions: string[];
}> {
  const actions: string[] = [];
  let articlesGenerated = 0;
  let topicsFound = 0;

  try {
    // Get CJ vendors for content ideas
    const vendors = await getApprovedCJVendors(userId);
    actions.push(`Found ${vendors.length} CJ vendors for content ideas`);

    // Notify Hive Mind
    sendBotMessage({
      from: 'content_bot',
      to: 'hive_mind',
      type: 'update',
      payload: { vendorsFound: vendors.length },
    });

    // Get system data for context
    const systemData = await getUnifiedSystemData(userId);
    
    // Find topics that don't have articles yet
    const existingTitles = systemData.articles.recentArticles.map(a => a.title.toLowerCase());
    
    for (const vendor of vendors.slice(0, 3)) {
      // Check if we already have content for this vendor
      const hasContent = existingTitles.some(t => 
        t.includes(vendor.advertiserName.toLowerCase())
      );

      if (!hasContent) {
        topicsFound++;
        actions.push(`New topic opportunity: ${vendor.advertiserName}`);
        
        // Notify affiliate bot
        sendBotMessage({
          from: 'content_bot',
          to: 'affiliate_bot',
          type: 'request',
          payload: { 
            action: 'prepare_links',
            vendor: vendor.advertiserName,
            links: vendor.links.slice(0, 3),
          },
        });
      }
    }

    // Log event
    await logEvent(userId, 'bot_decision', {
      message: `Content Bot: Found ${topicsFound} new topic opportunities`,
      metadata: { topicsFound, vendorsAnalyzed: vendors.length },
    });

    // Update bot state
    const state = botStates.get('content_bot');
    if (state) {
      state.completedTasks++;
      state.lastAction = new Date();
    }

    return {
      success: true,
      articlesGenerated,
      topicsFound,
      actions,
    };
  } catch (error) {
    const state = botStates.get('content_bot');
    if (state) state.errors++;
    
    return {
      success: false,
      articlesGenerated: 0,
      topicsFound: 0,
      actions: [`Error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * SEO Bot: Optimizes articles for search engines
 */
export async function runSEOBot(userId: number): Promise<{
  success: boolean;
  articlesOptimized: number;
  improvements: string[];
}> {
  const improvements: string[] = [];
  let articlesOptimized = 0;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Find articles with low SEO scores
    const lowSeoArticles = await db.select({
      id: articles.id,
      title: articles.title,
      seoScore: articles.seoScore,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
    })
      .from(articles)
      .where(and(
        eq(articles.userId, userId),
        sql`(seoScore IS NULL OR seoScore < 70)`
      ))
      .limit(5);

    for (const article of lowSeoArticles) {
      const issues: string[] = [];
      let newScore = article.seoScore || 0;

      if (!article.metaTitle) {
        issues.push('Missing meta title');
      }
      if (!article.metaDescription) {
        issues.push('Missing meta description');
      }
      if (article.title.length < 30 || article.title.length > 60) {
        issues.push('Title length not optimal');
      }

      if (issues.length > 0) {
        improvements.push(`Article "${article.title}": ${issues.join(', ')}`);
        
        // Notify content bot about needed improvements
        sendBotMessage({
          from: 'seo_bot',
          to: 'content_bot',
          type: 'request',
          payload: {
            action: 'improve_seo',
            articleId: article.id,
            issues,
          },
        });
      }

      articlesOptimized++;
    }

    // Log event
    await logEvent(userId, 'bot_optimization', {
      message: `SEO Bot: Analyzed ${articlesOptimized} articles, found ${improvements.length} improvements`,
      metadata: { articlesOptimized, improvements },
    });

    // Update bot state
    const state = botStates.get('seo_bot');
    if (state) {
      state.completedTasks++;
      state.lastAction = new Date();
    }

    return {
      success: true,
      articlesOptimized,
      improvements,
    };
  } catch (error) {
    const state = botStates.get('seo_bot');
    if (state) state.errors++;
    
    return {
      success: false,
      articlesOptimized: 0,
      improvements: [`Error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Distribution Bot: Handles article distribution
 */
export async function runDistributionBot(userId: number): Promise<{
  success: boolean;
  articlesDistributed: number;
  platformsUsed: string[];
}> {
  const platformsUsed: string[] = [];
  let articlesDistributed = 0;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Find published articles not yet distributed
    const undistributedArticles = await db.select({
      id: articles.id,
      title: articles.title,
    })
      .from(articles)
      .where(and(
        eq(articles.userId, userId),
        eq(articles.status, 'published')
      ))
      .limit(10);

    // Check which are already distributed
    for (const article of undistributedArticles) {
      const distributions = await db.select()
        .from(articleDistribution)
        .where(eq(articleDistribution.articleId, article.id));

      if (distributions.length === 0) {
        articlesDistributed++;
        
        // Notify analytics bot
        sendBotMessage({
          from: 'distribution_bot',
          to: 'analytics_bot',
          type: 'update',
          payload: {
            action: 'track_distribution',
            articleId: article.id,
            title: article.title,
          },
        });
      }
    }

    // Log event
    await logEvent(userId, 'bot_decision', {
      message: `Distribution Bot: Found ${articlesDistributed} articles ready for distribution`,
      metadata: { articlesDistributed },
    });

    // Update bot state
    const state = botStates.get('distribution_bot');
    if (state) {
      state.completedTasks++;
      state.lastAction = new Date();
    }

    return {
      success: true,
      articlesDistributed,
      platformsUsed,
    };
  } catch (error) {
    const state = botStates.get('distribution_bot');
    if (state) state.errors++;
    
    return {
      success: false,
      articlesDistributed: 0,
      platformsUsed: [],
    };
  }
}

/**
 * Affiliate Bot: Manages affiliate links
 */
export async function runAffiliateBot(userId: number): Promise<{
  success: boolean;
  linksVerified: number;
  linksAdded: number;
  issues: string[];
}> {
  const issues: string[] = [];
  let linksVerified = 0;
  let linksAdded = 0;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get all affiliate links
    const links = await db.select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.userId, userId))
      .limit(50);

    // Verify each link
    for (const link of links) {
      linksVerified++;
      
      // Check if link is from CJ
      if (link.program === 'CJ Affiliate') {
        // Verify the link is still active
        try {
          const response = await fetch(link.url, { method: 'HEAD', redirect: 'follow' });
          if (!response.ok && response.status !== 301 && response.status !== 302) {
            issues.push(`Link "${link.name}" may be broken (${response.status})`);
          }
        } catch {
          issues.push(`Link "${link.name}" failed verification`);
        }
      }
    }

    // Get CJ vendors for potential new links
    const vendors = await getApprovedCJVendors(userId);
    const existingPrograms = new Set(links.map(l => l.program));
    
    for (const vendor of vendors) {
      if (!existingPrograms.has(vendor.advertiserName)) {
        linksAdded++;
        
        // Notify content bot about new affiliate opportunity
        sendBotMessage({
          from: 'affiliate_bot',
          to: 'content_bot',
          type: 'update',
          payload: {
            action: 'new_affiliate_opportunity',
            vendor: vendor.advertiserName,
            epc: vendor.epc,
          },
        });
      }
    }

    // Log event
    await logEvent(userId, 'bot_decision', {
      message: `Affiliate Bot: Verified ${linksVerified} links, found ${issues.length} issues`,
      metadata: { linksVerified, linksAdded, issues },
    });

    // Update bot state
    const state = botStates.get('affiliate_bot');
    if (state) {
      state.completedTasks++;
      state.lastAction = new Date();
    }

    return {
      success: true,
      linksVerified,
      linksAdded,
      issues,
    };
  } catch (error) {
    const state = botStates.get('affiliate_bot');
    if (state) state.errors++;
    
    return {
      success: false,
      linksVerified: 0,
      linksAdded: 0,
      issues: [`Error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Analytics Bot: Analyzes performance data
 */
export async function runAnalyticsBot(userId: number): Promise<{
  success: boolean;
  insights: string[];
  recommendations: string[];
}> {
  const insights: string[] = [];
  const recommendations: string[] = [];

  try {
    const systemData = await getUnifiedSystemData(userId);

    // Analyze article performance
    if (systemData.articles.total > 0) {
      const publishRate = (systemData.articles.published / systemData.articles.total) * 100;
      insights.push(`Publish rate: ${publishRate.toFixed(1)}%`);
      
      if (publishRate < 50) {
        recommendations.push('Consider publishing more draft articles');
      }
    }

    // Analyze affiliate performance
    if (systemData.affiliateLinks.total > 0) {
      const activeRate = (systemData.affiliateLinks.active / systemData.affiliateLinks.total) * 100;
      insights.push(`Active links: ${activeRate.toFixed(1)}%`);
      
      if (activeRate < 80) {
        recommendations.push('Review and reactivate inactive affiliate links');
      }
    }

    // Analyze CJ vendors
    if (systemData.cjVendors.total > 0) {
      insights.push(`CJ vendors available: ${systemData.cjVendors.total}`);
      
      if (systemData.cjVendors.topVendors.length > 0) {
        const topVendor = systemData.cjVendors.topVendors[0];
        recommendations.push(`Focus on ${topVendor.name} (EPC: $${topVendor.epc})`);
      }
    }

    // Notify Hive Mind with insights
    sendBotMessage({
      from: 'analytics_bot',
      to: 'hive_mind',
      type: 'update',
      payload: {
        insights,
        recommendations,
        timestamp: new Date().toISOString(),
      },
    });

    // Log event
    await logEvent(userId, 'bot_learning', {
      message: `Analytics Bot: Generated ${insights.length} insights and ${recommendations.length} recommendations`,
      metadata: { insights, recommendations },
    });

    // Update bot state
    const state = botStates.get('analytics_bot');
    if (state) {
      state.completedTasks++;
      state.lastAction = new Date();
    }

    return {
      success: true,
      insights,
      recommendations,
    };
  } catch (error) {
    const state = botStates.get('analytics_bot');
    if (state) state.errors++;
    
    return {
      success: false,
      insights: [],
      recommendations: [`Error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Learning Bot: Learns from data and improves system
 */
export async function runLearningBot(userId: number): Promise<{
  success: boolean;
  lessonsLearned: string[];
  optimizations: string[];
}> {
  const lessonsLearned: string[] = [];
  const optimizations: string[] = [];

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Analyze audit log for patterns
    const recentLogs = await db.select()
      .from(auditLog)
      .where(eq(auditLog.userId, userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(100);

    // Count event types
    const eventCounts: Record<string, number> = {};
    for (const log of recentLogs) {
      eventCounts[log.eventType] = (eventCounts[log.eventType] || 0) + 1;
    }

    // Learn from patterns
    if (eventCounts['automation_cycle_completed'] > 5) {
      lessonsLearned.push('Automation is running consistently');
    }
    
    if (eventCounts['automation_cycle_failed'] > 2) {
      lessonsLearned.push('Some automation cycles are failing - investigate');
      optimizations.push('Review automation settings for errors');
    }

    if (eventCounts['affiliate_link_clicked'] > 0) {
      lessonsLearned.push(`Affiliate links are getting clicks (${eventCounts['affiliate_link_clicked']})`);
    } else {
      optimizations.push('No affiliate clicks detected - improve link placement');
    }

    // Get LLM providers status
    const providers = getAvailableProviders();
    lessonsLearned.push(`${providers.length} LLM providers available`);

    // Notify all bots with learnings
    sendBotMessage({
      from: 'learning_bot',
      to: 'all',
      type: 'update',
      payload: {
        lessonsLearned,
        optimizations,
      },
    });

    // Log event
    await logEvent(userId, 'bot_learning', {
      message: `Learning Bot: ${lessonsLearned.length} lessons, ${optimizations.length} optimizations`,
      metadata: { lessonsLearned, optimizations, eventCounts },
    });

    // Update bot state
    const state = botStates.get('learning_bot');
    if (state) {
      state.completedTasks++;
      state.lastAction = new Date();
    }

    return {
      success: true,
      lessonsLearned,
      optimizations,
    };
  } catch (error) {
    const state = botStates.get('learning_bot');
    if (state) state.errors++;
    
    return {
      success: false,
      lessonsLearned: [],
      optimizations: [`Error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Run all bots in sequence
 */
export async function runAllBots(userId: number): Promise<{
  success: boolean;
  results: Record<BotType, { success: boolean; summary: string }>;
  totalActions: number;
}> {
  const results: Record<string, { success: boolean; summary: string }> = {};
  let totalActions = 0;

  // Run content bot
  const contentResult = await runContentBot(userId);
  results['content_bot'] = {
    success: contentResult.success,
    summary: `Topics: ${contentResult.topicsFound}, Articles: ${contentResult.articlesGenerated}`,
  };
  totalActions += contentResult.actions.length;

  // Run SEO bot
  const seoResult = await runSEOBot(userId);
  results['seo_bot'] = {
    success: seoResult.success,
    summary: `Optimized: ${seoResult.articlesOptimized}, Improvements: ${seoResult.improvements.length}`,
  };
  totalActions += seoResult.improvements.length;

  // Run distribution bot
  const distResult = await runDistributionBot(userId);
  results['distribution_bot'] = {
    success: distResult.success,
    summary: `Distributed: ${distResult.articlesDistributed}`,
  };
  totalActions += distResult.articlesDistributed;

  // Run affiliate bot
  const affResult = await runAffiliateBot(userId);
  results['affiliate_bot'] = {
    success: affResult.success,
    summary: `Verified: ${affResult.linksVerified}, Added: ${affResult.linksAdded}`,
  };
  totalActions += affResult.linksVerified + affResult.linksAdded;

  // Run analytics bot
  const analyticsResult = await runAnalyticsBot(userId);
  results['analytics_bot'] = {
    success: analyticsResult.success,
    summary: `Insights: ${analyticsResult.insights.length}, Recommendations: ${analyticsResult.recommendations.length}`,
  };
  totalActions += analyticsResult.insights.length + analyticsResult.recommendations.length;

  // Run learning bot
  const learningResult = await runLearningBot(userId);
  results['learning_bot'] = {
    success: learningResult.success,
    summary: `Lessons: ${learningResult.lessonsLearned.length}, Optimizations: ${learningResult.optimizations.length}`,
  };
  totalActions += learningResult.lessonsLearned.length + learningResult.optimizations.length;

  // Log overall event
  await logEvent(userId, 'system_event', {
    message: `All bots completed: ${totalActions} total actions`,
    metadata: { results, totalActions },
  });

  return {
    success: Object.values(results).every(r => r.success),
    results: results as Record<BotType, { success: boolean; summary: string }>,
    totalActions,
  };
}
