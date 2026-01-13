/**
 * Auto-Wake Scheduler
 * 
 * This service automatically runs all system operations without user intervention:
 * 1. Syncs CJ vendors periodically
 * 2. Runs automation cycles
 * 3. Verifies article affiliate links
 * 4. Executes content pipeline
 * 5. Distributes articles
 * 6. Updates system metrics
 */

import { getDb } from '../db';
import { articles, affiliateLinks, articleDistribution, automationSettings, auditLog } from '../../drizzle/schema';
import { eq, desc, sql, and, lt, isNull, or } from 'drizzle-orm';
import { logEvent } from './hiveMind';
import { 
  syncCJApprovedVendors, 
  autoWake, 
  verifyArticleAffiliateLinks,
  getApprovedVendorsForContent,
  getAutonomousState
} from './autonomousHiveMind';
import { searchCJLinks, getJoinedAdvertiserLinks } from './cjApi';

// Constants
const CJ_WEBSITE_ID = '101630462';
const AUTO_WAKE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CJ_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const ARTICLE_VERIFY_BATCH_SIZE = 10;

interface SchedulerState {
  isRunning: boolean;
  autoWakeTimer: NodeJS.Timeout | null;
  cjSyncTimer: NodeJS.Timeout | null;
  lastAutoWake: Date | null;
  lastCJSync: Date | null;
  cycleCount: number;
}

let schedulerState: SchedulerState = {
  isRunning: false,
  autoWakeTimer: null,
  cjSyncTimer: null,
  lastAutoWake: null,
  lastCJSync: null,
  cycleCount: 0,
};

/**
 * Start the auto-wake scheduler
 */
export async function startAutoWakeScheduler(userId: number): Promise<{
  success: boolean;
  message: string;
}> {
  if (schedulerState.isRunning) {
    return { success: true, message: 'Auto-wake scheduler already running' };
  }

  schedulerState.isRunning = true;
  schedulerState.cycleCount = 0;

  // Run initial wake
  await runAutoWakeCycle(userId);

  // Set up recurring auto-wake
  schedulerState.autoWakeTimer = setInterval(async () => {
    if (schedulerState.isRunning) {
      await runAutoWakeCycle(userId);
    }
  }, AUTO_WAKE_INTERVAL_MS);

  // Set up CJ sync (less frequent)
  schedulerState.cjSyncTimer = setInterval(async () => {
    if (schedulerState.isRunning) {
      await runCJSyncCycle(userId);
    }
  }, CJ_SYNC_INTERVAL_MS);

  await logEvent(userId, 'system_event', {
    message: 'Auto-wake scheduler started',
    metadata: {
      autoWakeInterval: AUTO_WAKE_INTERVAL_MS,
      cjSyncInterval: CJ_SYNC_INTERVAL_MS,
    },
  });

  return {
    success: true,
    message: `Auto-wake scheduler started (wake every ${AUTO_WAKE_INTERVAL_MS / 60000} min, CJ sync every ${CJ_SYNC_INTERVAL_MS / 60000} min)`,
  };
}

/**
 * Stop the auto-wake scheduler
 */
export async function stopAutoWakeScheduler(userId: number): Promise<{
  success: boolean;
  message: string;
}> {
  if (!schedulerState.isRunning) {
    return { success: true, message: 'Auto-wake scheduler not running' };
  }

  schedulerState.isRunning = false;

  if (schedulerState.autoWakeTimer) {
    clearInterval(schedulerState.autoWakeTimer);
    schedulerState.autoWakeTimer = null;
  }

  if (schedulerState.cjSyncTimer) {
    clearInterval(schedulerState.cjSyncTimer);
    schedulerState.cjSyncTimer = null;
  }

  await logEvent(userId, 'system_event', {
    message: 'Auto-wake scheduler stopped',
    metadata: {
      totalCycles: schedulerState.cycleCount,
      lastAutoWake: schedulerState.lastAutoWake,
      lastCJSync: schedulerState.lastCJSync,
    },
  });

  return {
    success: true,
    message: `Auto-wake scheduler stopped after ${schedulerState.cycleCount} cycles`,
  };
}

/**
 * Run a single auto-wake cycle
 */
async function runAutoWakeCycle(userId: number): Promise<void> {
  const startTime = Date.now();
  schedulerState.cycleCount++;
  schedulerState.lastAutoWake = new Date();

  console.log(`[AutoWake] Starting cycle #${schedulerState.cycleCount}`);

  try {
    // 1. Run base auto-wake
    const wakeResult = await autoWake(userId);
    
    // 2. Verify articles without proper affiliate links
    await verifyArticlesWithoutLinks(userId);
    
    // 3. Check for pending distributions
    await processPendingDistributions(userId);
    
    // 4. Update article SEO scores
    await updateArticleSEOScores(userId);

    const duration = Date.now() - startTime;
    
    await logEvent(userId, 'automation_cycle_completed', {
      message: `Auto-wake cycle #${schedulerState.cycleCount} completed in ${duration}ms`,
      metadata: {
        cycleNumber: schedulerState.cycleCount,
        duration,
        operations: wakeResult.operations,
        errors: wakeResult.errors,
      },
    });

    console.log(`[AutoWake] Cycle #${schedulerState.cycleCount} completed in ${duration}ms`);
  } catch (error) {
    console.error(`[AutoWake] Cycle #${schedulerState.cycleCount} failed:`, error);
    
    await logEvent(userId, 'automation_cycle_failed', {
      message: `Auto-wake cycle #${schedulerState.cycleCount} failed`,
      metadata: {
        cycleNumber: schedulerState.cycleCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Run CJ sync cycle
 */
async function runCJSyncCycle(userId: number): Promise<void> {
  console.log('[AutoWake] Running CJ sync cycle');
  schedulerState.lastCJSync = new Date();

  try {
    const result = await syncCJApprovedVendors(userId);
    
    if (result.success) {
      console.log(`[AutoWake] CJ sync: ${result.vendorsFound} vendors, ${result.linksFound} links`);
      
      if (result.newVendors.length > 0) {
        await logEvent(userId, 'system_event', {
          message: `New CJ vendors discovered: ${result.newVendors.join(', ')}`,
          metadata: {
            newVendors: result.newVendors,
            totalVendors: result.vendorsFound,
          },
        });
      }
    }
  } catch (error) {
    console.error('[AutoWake] CJ sync failed:', error);
  }
}

/**
 * Verify articles without proper affiliate links
 */
async function verifyArticlesWithoutLinks(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get published articles
    const publishedArticles = await db.select({
      id: articles.id,
      title: articles.title,
    })
      .from(articles)
      .where(and(
        eq(articles.userId, userId),
        eq(articles.status, 'published')
      ))
      .limit(ARTICLE_VERIFY_BATCH_SIZE);

    for (const article of publishedArticles) {
      const verification = await verifyArticleAffiliateLinks(userId, article.id);
      
      if (!verification.isValid && verification.recommendations.length > 0) {
        await logEvent(userId, 'bot_optimization', {
          message: `Article "${article.title}" needs affiliate link optimization`,
          articleId: article.id,
          metadata: {
            hasLinks: verification.hasLinks,
            validLinks: verification.validLinks,
            invalidLinks: verification.invalidLinks,
            recommendations: verification.recommendations,
          },
        });
      }
    }
  } catch (error) {
    console.error('[AutoWake] Article verification failed:', error);
  }
}

/**
 * Process pending distributions
 */
async function processPendingDistributions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const pendingDist = await db.select({
      id: articleDistribution.id,
      articleId: articleDistribution.articleId,
      platform: articleDistribution.platform,
    })
      .from(articleDistribution)
      .where(and(
        eq(articleDistribution.userId, userId),
        eq(articleDistribution.status, 'pending')
      ))
      .limit(5);

    if (pendingDist.length > 0) {
      await logEvent(userId, 'system_event', {
        message: `Found ${pendingDist.length} pending distributions to process`,
        metadata: {
          pendingCount: pendingDist.length,
          platforms: pendingDist.map(d => d.platform),
        },
      });
    }
  } catch (error) {
    console.error('[AutoWake] Distribution processing failed:', error);
  }
}

/**
 * Update article SEO scores
 */
async function updateArticleSEOScores(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get articles with low or no SEO scores
    const articlesToUpdate = await db.select({
      id: articles.id,
      title: articles.title,
      seoScore: articles.seoScore,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
    })
      .from(articles)
      .where(and(
        eq(articles.userId, userId),
        or(
          isNull(articles.seoScore),
          lt(articles.seoScore, 50)
        )
      ))
      .limit(5);

    for (const article of articlesToUpdate) {
      // Calculate basic SEO score
      let score = 0;
      if (article.metaTitle) score += 25;
      if (article.metaDescription) score += 25;
      if (article.title && article.title.length >= 30 && article.title.length <= 60) score += 25;
      // Base score for having content
      score += 25;

      if (score !== article.seoScore) {
        await db.update(articles)
          .set({ seoScore: score })
          .where(eq(articles.id, article.id));
      }
    }
  } catch (error) {
    console.error('[AutoWake] SEO score update failed:', error);
  }
}

/**
 * Get scheduler state
 */
export function getSchedulerState(): {
  isRunning: boolean;
  lastAutoWake: Date | null;
  lastCJSync: Date | null;
  cycleCount: number;
  autoWakeIntervalMs: number;
  cjSyncIntervalMs: number;
} {
  return {
    isRunning: schedulerState.isRunning,
    lastAutoWake: schedulerState.lastAutoWake,
    lastCJSync: schedulerState.lastCJSync,
    cycleCount: schedulerState.cycleCount,
    autoWakeIntervalMs: AUTO_WAKE_INTERVAL_MS,
    cjSyncIntervalMs: CJ_SYNC_INTERVAL_MS,
  };
}

/**
 * Run a single manual wake cycle (for testing/manual trigger)
 */
export async function runManualWakeCycle(userId: number): Promise<{
  success: boolean;
  operations: string[];
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const operations: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Auto-wake
    const wakeResult = await autoWake(userId);
    operations.push(...wakeResult.operations);
    errors.push(...wakeResult.errors);

    // 2. CJ Sync
    const cjResult = await syncCJApprovedVendors(userId);
    if (cjResult.success) {
      operations.push(`Synced ${cjResult.vendorsFound} CJ vendors`);
    } else {
      errors.push('CJ sync failed');
    }

    // 3. Verify articles
    await verifyArticlesWithoutLinks(userId);
    operations.push('Verified article affiliate links');

    // 4. Process distributions
    await processPendingDistributions(userId);
    operations.push('Processed pending distributions');

    // 5. Update SEO scores
    await updateArticleSEOScores(userId);
    operations.push('Updated SEO scores');

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  const duration = Date.now() - startTime;

  return {
    success: errors.length === 0,
    operations,
    errors,
    duration,
  };
}

/**
 * Get articles that need CJ affiliate links
 */
export async function getArticlesNeedingCJLinks(userId: number): Promise<{
  articles: Array<{
    id: number;
    title: string;
    hasLinks: boolean;
    validLinks: number;
  }>;
  totalCount: number;
}> {
  const db = await getDb();
  if (!db) return { articles: [], totalCount: 0 };

  try {
    const publishedArticles = await db.select({
      id: articles.id,
      title: articles.title,
    })
      .from(articles)
      .where(and(
        eq(articles.userId, userId),
        eq(articles.status, 'published')
      ))
      .orderBy(desc(articles.createdAt))
      .limit(50);

    const articlesWithVerification = await Promise.all(
      publishedArticles.map(async (article) => {
        const verification = await verifyArticleAffiliateLinks(userId, article.id);
        return {
          id: article.id,
          title: article.title,
          hasLinks: verification.hasLinks,
          validLinks: verification.validLinks,
        };
      })
    );

    const needingLinks = articlesWithVerification.filter(a => !a.hasLinks || a.validLinks < 2);

    return {
      articles: needingLinks,
      totalCount: needingLinks.length,
    };
  } catch (error) {
    console.error('[AutoWake] Failed to get articles needing CJ links:', error);
    return { articles: [], totalCount: 0 };
  }
}

/**
 * Auto-insert CJ links into an article
 */
export async function autoInsertCJLinks(
  userId: number,
  articleId: number
): Promise<{
  success: boolean;
  linksInserted: number;
  vendors: string[];
}> {
  const db = await getDb();
  if (!db) return { success: false, linksInserted: 0, vendors: [] };

  try {
    // Get the article
    const article = await db.select()
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);

    if (!article[0]) {
      return { success: false, linksInserted: 0, vendors: [] };
    }

    // Get approved vendors
    const approvedVendors = getApprovedVendorsForContent();
    
    if (approvedVendors.length === 0) {
      // Try to sync first
      await syncCJApprovedVendors(userId);
    }

    // Search for relevant CJ links based on article title/keywords
    const keywords = article[0].title.split(' ').slice(0, 3).join(' ');
    const cjLinks = await searchCJLinks({
      websiteId: CJ_WEBSITE_ID,
      keywords,
      advertiserIds: 'joined',
      recordsPerPage: 10,
    });

    if (!cjLinks.success || cjLinks.links.length === 0) {
      return { success: false, linksInserted: 0, vendors: [] };
    }

    // Insert links into affiliate_links table
    const insertedVendors: string[] = [];
    let linksInserted = 0;

    for (const link of cjLinks.links.slice(0, 3)) {
      try {
        await db.insert(affiliateLinks).values({
          userId,
          name: link.linkName,
          url: link.clickUrl,
          shortCode: `cj-${link.advertiserId}-${Date.now()}`,
          category: link.category || 'general',
          program: 'CJ Affiliate',
          commission: link.saleCommission,
          isActive: true,
        });
        
        insertedVendors.push(link.advertiserName);
        linksInserted++;
      } catch (error) {
        console.error(`Failed to insert CJ link for ${link.advertiserName}:`, error);
      }
    }

    if (linksInserted > 0) {
      await logEvent(userId, 'affiliate_link_added', {
        message: `Auto-inserted ${linksInserted} CJ links for article "${article[0].title}"`,
        articleId,
        metadata: {
          vendors: insertedVendors,
          linksInserted,
        },
      });
    }

    return {
      success: linksInserted > 0,
      linksInserted,
      vendors: insertedVendors,
    };
  } catch (error) {
    console.error('[AutoWake] Auto-insert CJ links failed:', error);
    return { success: false, linksInserted: 0, vendors: [] };
  }
}
