import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  trendingTopics, InsertTrendingTopic, TrendingTopic,
  articles, InsertArticle, Article,
  affiliateLinks, InsertAffiliateLink, AffiliateLink,
  articleAffiliateLinks, InsertArticleAffiliateLink,
  analyticsEvents, InsertAnalyticsEvent,
  savedTopics, InsertSavedTopic,
  articleDistribution, InsertArticleDistribution,
  botLearning, InsertBotLearning,
  urlShortenerSettings, InsertUrlShortenerSettings, UrlShortenerSettings,
  shortenedUrls, InsertShortenedUrl, ShortenedUrl,
  trackingPixels, InsertTrackingPixel, TrackingPixel,
  botTrainingData, InsertBotTrainingData, BotTrainingData,
  affiliateCookieTracking, InsertAffiliateCookieTracking, AffiliateCookieTracking
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ TRENDING TOPICS FUNCTIONS ============
export async function getTrendingTopics(userId?: number, category?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(trendingTopics);
  
  if (category && category !== 'all') {
    query = query.where(eq(trendingTopics.category, category)) as typeof query;
  }
  
  return await query.orderBy(desc(trendingTopics.popularityScore)).limit(50);
}

export async function createTrendingTopic(topic: InsertTrendingTopic) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(trendingTopics).values(topic);
  return result[0].insertId;
}

export async function getSavedTopics(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: savedTopics.id,
      topicId: savedTopics.topicId,
      notes: savedTopics.notes,
      createdAt: savedTopics.createdAt,
      topic: trendingTopics
    })
    .from(savedTopics)
    .leftJoin(trendingTopics, eq(savedTopics.topicId, trendingTopics.id))
    .where(eq(savedTopics.userId, userId))
    .orderBy(desc(savedTopics.createdAt));
}

export async function saveTopic(userId: number, topicId: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(savedTopics).values({ userId, topicId, notes });
}

export async function unsaveTopic(userId: number, topicId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(savedTopics).where(
    and(eq(savedTopics.userId, userId), eq(savedTopics.topicId, topicId))
  );
}

// ============ ARTICLES FUNCTIONS ============
export async function getArticles(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  let conditions = [eq(articles.userId, userId)];
  if (status && status !== 'all') {
    conditions.push(eq(articles.status, status as 'draft' | 'review' | 'published' | 'archived'));
  }
  
  return await db
    .select()
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.updatedAt));
}

export async function getArticleById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function createArticle(article: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(articles).values(article);
  return result[0].insertId;
}

export async function updateArticle(id: number, userId: number, updates: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(articles)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(articles.id, id), eq(articles.userId, userId)));
}

export async function deleteArticle(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(articles).where(and(eq(articles.id, id), eq(articles.userId, userId)));
}

// ============ AFFILIATE LINKS FUNCTIONS ============
export async function getAffiliateLinks(userId: number, category?: string) {
  const db = await getDb();
  if (!db) return [];

  let conditions = [eq(affiliateLinks.userId, userId)];
  if (category && category !== 'all') {
    conditions.push(eq(affiliateLinks.category, category));
  }
  
  return await db
    .select()
    .from(affiliateLinks)
    .where(and(...conditions))
    .orderBy(desc(affiliateLinks.createdAt));
}

export async function getAffiliateLinkById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.id, id), eq(affiliateLinks.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function createAffiliateLink(link: InsertAffiliateLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(affiliateLinks).values(link);
  return result[0].insertId;
}

export async function updateAffiliateLink(id: number, userId: number, updates: Partial<InsertAffiliateLink>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(affiliateLinks)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(affiliateLinks.id, id), eq(affiliateLinks.userId, userId)));
}

export async function deleteAffiliateLink(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(affiliateLinks).where(and(eq(affiliateLinks.id, id), eq(affiliateLinks.userId, userId)));
}

export async function incrementLinkClicks(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(affiliateLinks)
    .set({ clicks: sql`${affiliateLinks.clicks} + 1` })
    .where(eq(affiliateLinks.id, id));
}

// ============ ARTICLE AFFILIATE LINKS FUNCTIONS ============
export async function getArticleAffiliateLinks(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: articleAffiliateLinks.id,
      articleId: articleAffiliateLinks.articleId,
      affiliateLinkId: articleAffiliateLinks.affiliateLinkId,
      anchorText: articleAffiliateLinks.anchorText,
      position: articleAffiliateLinks.position,
      link: affiliateLinks
    })
    .from(articleAffiliateLinks)
    .leftJoin(affiliateLinks, eq(articleAffiliateLinks.affiliateLinkId, affiliateLinks.id))
    .where(eq(articleAffiliateLinks.articleId, articleId));
}

export async function addAffiliateLinkToArticle(data: InsertArticleAffiliateLink) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(articleAffiliateLinks).values(data);
}

export async function removeAffiliateLinkFromArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(articleAffiliateLinks).where(eq(articleAffiliateLinks.id, id));
}

// ============ ANALYTICS FUNCTIONS ============
export async function recordAnalyticsEvent(event: InsertAnalyticsEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(analyticsEvents).values(event);
}

export async function getAnalyticsSummary(userId: number) {
  const db = await getDb();
  if (!db) return { totalViews: 0, totalClicks: 0, totalArticles: 0, totalRevenue: "0.00" };
  
  const articleStats = await db
    .select({
      totalViews: sql<number>`COALESCE(SUM(${articles.views}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${articles.clicks}), 0)`,
      totalArticles: sql<number>`COUNT(*)`,
      totalRevenue: sql<string>`COALESCE(SUM(${articles.estimatedRevenue}), 0)`
    })
    .from(articles)
    .where(eq(articles.userId, userId));
  
  return articleStats[0] || { totalViews: 0, totalClicks: 0, totalArticles: 0, totalRevenue: "0.00" };
}

export async function getRecentAnalytics(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await db
    .select()
    .from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.userId, userId),
      sql`${analyticsEvents.createdAt} >= ${startDate}`
    ))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(100);
}

export async function getTopPerformingArticles(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(articles)
    .where(eq(articles.userId, userId))
    .orderBy(desc(articles.views))
    .limit(limit);
}

export async function getTopPerformingLinks(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(affiliateLinks)
    .where(eq(affiliateLinks.userId, userId))
    .orderBy(desc(affiliateLinks.clicks))
    .limit(limit);
}


// ============ COMMISSION JUNCTION FUNCTIONS ============
import { 
  cjSettings, InsertCJSettings, CJSettings,
  cjProducts, InsertCJProduct, CJProduct,
  publishingQueue, InsertPublishingQueue, PublishingQueue,
  contentQueue, InsertContentQueue, ContentQueue
} from "../drizzle/schema";

export async function getCJSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(cjSettings)
    .where(eq(cjSettings.userId, userId))
    .limit(1);
  
  return result[0];
}

export async function saveCJSettings(settings: InsertCJSettings) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if settings exist
  const existing = await getCJSettings(settings.userId);
  
  if (existing) {
    await db
      .update(cjSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(cjSettings.userId, settings.userId));
    return existing.id;
  } else {
    const result = await db.insert(cjSettings).values(settings);
    return result[0].insertId;
  }
}

export async function getCJProducts(userId: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions = [eq(cjProducts.userId, userId), eq(cjProducts.isActive, true)];
  if (category) {
    conditions.push(eq(cjProducts.category, category));
  }
  
  return await db
    .select()
    .from(cjProducts)
    .where(and(...conditions))
    .orderBy(desc(cjProducts.epc))
    .limit(100);
}

export async function saveCJProduct(product: InsertCJProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cjProducts).values(product);
  return result[0].insertId;
}

export async function bulkSaveCJProducts(products: InsertCJProduct[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (products.length === 0) return;
  
  await db.insert(cjProducts).values(products);
}

export async function getCJProductById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(cjProducts)
    .where(and(eq(cjProducts.id, id), eq(cjProducts.userId, userId)))
    .limit(1);
  
  return result[0];
}

// ============ PUBLISHING QUEUE FUNCTIONS ============
export async function getPublishingQueue(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: publishingQueue.id,
      articleId: publishingQueue.articleId,
      scheduledAt: publishingQueue.scheduledAt,
      status: publishingQueue.status,
      publishedAt: publishingQueue.publishedAt,
      errorMessage: publishingQueue.errorMessage,
      createdAt: publishingQueue.createdAt,
      article: articles
    })
    .from(publishingQueue)
    .leftJoin(articles, eq(publishingQueue.articleId, articles.id))
    .where(eq(publishingQueue.userId, userId))
    .orderBy(desc(publishingQueue.scheduledAt));
}

export async function addToPublishingQueue(item: InsertPublishingQueue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(publishingQueue).values(item);
  return result[0].insertId;
}

export async function updatePublishingQueueItem(id: number, updates: Partial<InsertPublishingQueue>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(publishingQueue)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(publishingQueue.id, id));
}

export async function getPendingPublishItems() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  
  return await db
    .select()
    .from(publishingQueue)
    .where(and(
      eq(publishingQueue.status, 'pending'),
      sql`${publishingQueue.scheduledAt} <= ${now}`
    ))
    .orderBy(publishingQueue.scheduledAt);
}

export async function removeFromPublishingQueue(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(publishingQueue).where(
    and(eq(publishingQueue.id, id), eq(publishingQueue.userId, userId))
  );
}

// ============ CONTENT QUEUE FUNCTIONS ============
export async function getContentQueue(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(contentQueue)
    .where(eq(contentQueue.userId, userId))
    .orderBy(desc(contentQueue.priority), desc(contentQueue.createdAt));
}

export async function addToContentQueue(item: InsertContentQueue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(contentQueue).values(item);
  return result[0].insertId;
}

export async function updateContentQueueItem(id: number, updates: Partial<InsertContentQueue>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(contentQueue)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(contentQueue.id, id));
}

export async function getPendingContentItems(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(contentQueue)
    .where(eq(contentQueue.status, 'pending'))
    .orderBy(desc(contentQueue.priority), contentQueue.createdAt)
    .limit(limit);
}

export async function removeFromContentQueue(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(contentQueue).where(
    and(eq(contentQueue.id, id), eq(contentQueue.userId, userId))
  );
}

// ============ PUBLISHED ARTICLES (PUBLIC) ============
export async function getPublishedArticles(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export async function getPublishedArticlesForSitemap() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      slug: articles.slug,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt));
}

export async function getPublishedArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
    .limit(1);
  
  return result[0];
}

export async function incrementArticleViews(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(articles)
    .set({ views: sql`${articles.views} + 1` })
    .where(eq(articles.id, id));
}

export async function incrementArticleClicks(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(articles)
    .set({ clicks: sql`${articles.clicks} + 1` })
    .where(eq(articles.id, id));
}


// ============ AUTOMATION SETTINGS FUNCTIONS ============
import { automationSettings, InsertAutomationSettings, AutomationSettings } from "../drizzle/schema";

export async function getAutomationSettings(userId: number): Promise<AutomationSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(automationSettings)
    .where(eq(automationSettings.userId, userId))
    .limit(1);

  return result[0];
}

export async function saveAutomationSettings(settings: InsertAutomationSettings): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert - update if exists, insert if not
  const existing = await getAutomationSettings(settings.userId);
  
  if (existing) {
    await db
      .update(automationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(automationSettings.userId, settings.userId));
    return existing.id;
  } else {
    const result = await db.insert(automationSettings).values(settings);
    return result[0].insertId;
  }
}

export async function updateAutomationStats(userId: number, articlesGenerated: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(automationSettings)
    .set({
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next run in 24 hours
      totalArticlesGenerated: sql`${automationSettings.totalArticlesGenerated} + ${articlesGenerated}`,
      updatedAt: new Date(),
    })
    .where(eq(automationSettings.userId, userId));
}

export async function getActiveAutomationUsers(): Promise<AutomationSettings[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(automationSettings)
    .where(eq(automationSettings.isEnabled, true));
}


// ============ PERFORMANCE LEARNING FUNCTIONS ============
import { 
  performanceLearning, InsertPerformanceLearning, PerformanceLearning,
  contentGenerationHistory, InsertContentGenerationHistory, ContentGenerationHistory
} from "../drizzle/schema";

export async function recordLearning(learning: InsertPerformanceLearning): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if this learning already exists
  const existing = await db
    .select()
    .from(performanceLearning)
    .where(and(
      eq(performanceLearning.userId, learning.userId),
      eq(performanceLearning.learningType, learning.learningType),
      eq(performanceLearning.learningKey, learning.learningKey)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing learning with new data
    await db
      .update(performanceLearning)
      .set({
        impressions: sql`${performanceLearning.impressions} + ${learning.impressions || 0}`,
        clicks: sql`${performanceLearning.clicks} + ${learning.clicks || 0}`,
        conversions: sql`${performanceLearning.conversions} + ${learning.conversions || 0}`,
        revenue: sql`${performanceLearning.revenue} + ${learning.revenue || 0}`,
        timesUsed: sql`${performanceLearning.timesUsed} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(performanceLearning.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(performanceLearning).values(learning);
    return result[0].insertId;
  }
}

export async function getTopPerformingLearnings(
  userId: number, 
  learningType: string, 
  limit: number = 10
): Promise<PerformanceLearning[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(performanceLearning)
    .where(and(
      eq(performanceLearning.userId, userId),
      eq(performanceLearning.learningType, learningType as any)
    ))
    .orderBy(desc(performanceLearning.performanceScore), desc(performanceLearning.clicks))
    .limit(limit);
}

export async function updateLearningScores(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Update CTR, conversion rate, and performance scores
  await db.execute(sql`
    UPDATE performance_learning 
    SET 
      ctr = CASE WHEN impressions > 0 THEN clicks / impressions ELSE 0 END,
      conversionRate = CASE WHEN clicks > 0 THEN conversions / clicks ELSE 0 END,
      revenuePerClick = CASE WHEN clicks > 0 THEN revenue / clicks ELSE 0 END,
      performanceScore = LEAST(100, GREATEST(0, 
        (CASE WHEN impressions > 0 THEN (clicks / impressions) * 40 ELSE 0 END) +
        (CASE WHEN clicks > 0 THEN (conversions / clicks) * 30 ELSE 0 END) +
        (CASE WHEN clicks > 0 THEN LEAST(30, (revenue / clicks) * 10) ELSE 0 END)
      )),
      updatedAt = NOW()
    WHERE userId = ${userId}
  `);
}

export async function recordContentGeneration(history: InsertContentGenerationHistory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(contentGenerationHistory).values(history);
  return result[0].insertId;
}

export async function getSuccessfulContentPatterns(userId: number, limit: number = 20): Promise<ContentGenerationHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(contentGenerationHistory)
    .where(and(
      eq(contentGenerationHistory.userId, userId),
      eq(contentGenerationHistory.wasSuccessful, true)
    ))
    .orderBy(desc(contentGenerationHistory.revenue), desc(contentGenerationHistory.clicks))
    .limit(limit);
}

export async function markContentAsSuccessful(articleId: number, reason: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(contentGenerationHistory)
    .set({
      wasSuccessful: true,
      successReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(contentGenerationHistory.articleId, articleId));
}

export async function updateContentPerformance(articleId: number, views: number, clicks: number, conversions: number, revenue: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(contentGenerationHistory)
    .set({
      views,
      clicks,
      conversions,
      revenue,
      updatedAt: new Date(),
    })
    .where(eq(contentGenerationHistory.articleId, articleId));
}

export async function getContentTypePerformance(userId: number): Promise<{contentType: string, avgClicks: number, avgRevenue: number, count: number}[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      contentType,
      AVG(clicks) as avgClicks,
      AVG(CAST(revenue AS DECIMAL(10,2))) as avgRevenue,
      COUNT(*) as count
    FROM content_generation_history
    WHERE userId = ${userId}
    GROUP BY contentType
    ORDER BY avgRevenue DESC
  `);

  return result[0] as any;
}

export async function getCategoryPerformance(userId: number): Promise<{category: string, totalClicks: number, totalRevenue: number, count: number}[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      category,
      SUM(clicks) as totalClicks,
      SUM(CAST(revenue AS DECIMAL(10,2))) as totalRevenue,
      COUNT(*) as count
    FROM content_generation_history
    WHERE userId = ${userId} AND category IS NOT NULL
    GROUP BY category
    ORDER BY totalRevenue DESC
  `);

  return result[0] as any;
}


// ============ ARTICLE DISTRIBUTION FUNCTIONS ============
export async function createDistribution(data: InsertArticleDistribution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(articleDistribution).values(data);
  return result[0].insertId;
}

export async function getArticleDistributions(articleId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(articleDistribution)
    .where(eq(articleDistribution.articleId, articleId))
    .orderBy(desc(articleDistribution.createdAt));
}

export async function getUserDistributions(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(articleDistribution)
    .where(eq(articleDistribution.userId, userId))
    .orderBy(desc(articleDistribution.createdAt))
    .limit(limit);
}

export async function updateDistribution(id: number, updates: Partial<InsertArticleDistribution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(articleDistribution)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(articleDistribution.id, id));
}

export async function getDistributionStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, published: 0, pending: 0, failed: 0, totalViews: 0, totalClicks: 0 };
  
  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN status = 'pending' OR status = 'submitted' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      totalViews: sql<number>`COALESCE(SUM(views), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(clicks), 0)`,
    })
    .from(articleDistribution)
    .where(eq(articleDistribution.userId, userId));
  
  return stats[0] || { total: 0, published: 0, pending: 0, failed: 0, totalViews: 0, totalClicks: 0 };
}

// ============ BOT LEARNING FUNCTIONS ============
export async function recordBotLearning(data: InsertBotLearning) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(botLearning).values(data);
  return result[0].insertId;
}

export async function getBotLearnings(userId: number, category?: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db
    .select()
    .from(botLearning)
    .where(eq(botLearning.userId, userId))
    .orderBy(desc(botLearning.createdAt))
    .limit(limit);
  
  return await query;
}

export async function updateBotLearningOutcome(id: number, outcome: string, wasCorrect: boolean, metrics?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(botLearning)
    .set({ 
      outcome: outcome as any, 
      wasCorrect, 
      outcomeMetrics: metrics,
      updatedAt: new Date() 
    })
    .where(eq(botLearning.id, id));
}

export async function getBotLearningStats(userId: number) {
  const db = await getDb();
  if (!db) return { 
    totalDecisions: 0, 
    successfulDecisions: 0, 
    failedDecisions: 0, 
    successRate: 0,
    avgConfidence: 0 
  };
  
  const stats = await db
    .select({
      totalDecisions: sql<number>`COUNT(*)`,
      successfulDecisions: sql<number>`SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)`,
      failedDecisions: sql<number>`SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END)`,
      avgConfidence: sql<number>`AVG(confidenceScore)`,
    })
    .from(botLearning)
    .where(eq(botLearning.userId, userId));
  
  const result = stats[0] || { totalDecisions: 0, successfulDecisions: 0, failedDecisions: 0, avgConfidence: 0 };
  const successRate = result.totalDecisions > 0 
    ? Math.round((result.successfulDecisions / result.totalDecisions) * 100) 
    : 0;
  
  return { ...result, successRate };
}

export async function getRecentBotDecisions(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(botLearning)
    .where(eq(botLearning.userId, userId))
    .orderBy(desc(botLearning.createdAt))
    .limit(limit);
}


// ============ URL SHORTENER FUNCTIONS ============
export async function getUrlShortenerSettings(userId: number): Promise<UrlShortenerSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(urlShortenerSettings)
    .where(eq(urlShortenerSettings.userId, userId))
    .limit(1);

  return result[0];
}

export async function saveUrlShortenerSettings(settings: InsertUrlShortenerSettings): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUrlShortenerSettings(settings.userId);
  
  if (existing) {
    await db
      .update(urlShortenerSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(urlShortenerSettings.userId, settings.userId));
    return existing.id;
  } else {
    const result = await db.insert(urlShortenerSettings).values(settings);
    return result[0].insertId;
  }
}

export async function createShortenedUrl(data: InsertShortenedUrl): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(shortenedUrls).values(data);
  return result[0].insertId;
}

export async function getShortenedUrls(userId: number): Promise<ShortenedUrl[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(shortenedUrls)
    .where(eq(shortenedUrls.userId, userId))
    .orderBy(desc(shortenedUrls.createdAt));
}

export async function updateShortenedUrlStats(id: number, clicks: number, earnings: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(shortenedUrls)
    .set({ 
      clicks: sql`${shortenedUrls.clicks} + ${clicks}`,
      earnings: sql`${shortenedUrls.earnings} + ${earnings}`,
      updatedAt: new Date() 
    })
    .where(eq(shortenedUrls.id, id));
}

// ============ TRACKING PIXEL FUNCTIONS ============
export async function getTrackingPixels(userId: number): Promise<TrackingPixel[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(trackingPixels)
    .where(eq(trackingPixels.userId, userId))
    .orderBy(desc(trackingPixels.createdAt));
}

export async function createTrackingPixel(data: InsertTrackingPixel): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(trackingPixels).values(data);
  return result[0].insertId;
}

export async function updateTrackingPixel(id: number, userId: number, updates: Partial<InsertTrackingPixel>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(trackingPixels)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(trackingPixels.id, id), eq(trackingPixels.userId, userId)));
}

export async function deleteTrackingPixel(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(trackingPixels).where(
    and(eq(trackingPixels.id, id), eq(trackingPixels.userId, userId))
  );
}

// ============ BOT TRAINING DATA FUNCTIONS ============
export async function getBotTrainingData(category?: string): Promise<BotTrainingData[]> {
  const db = await getDb();
  if (!db) return [];

  if (category) {
    return await db
      .select()
      .from(botTrainingData)
      .where(eq(botTrainingData.category, category as any))
      .orderBy(desc(botTrainingData.effectivenessScore));
  }

  return await db
    .select()
    .from(botTrainingData)
    .orderBy(desc(botTrainingData.effectivenessScore));
}

export async function addBotTrainingData(data: InsertBotTrainingData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(botTrainingData).values(data);
  return result[0].insertId;
}

export async function updateTrainingDataEffectiveness(id: number, wasSuccessful: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(botTrainingData)
    .set({
      timesApplied: sql`${botTrainingData.timesApplied} + 1`,
      effectivenessScore: wasSuccessful 
        ? sql`LEAST(100, ${botTrainingData.effectivenessScore} + 2)`
        : sql`GREATEST(0, ${botTrainingData.effectivenessScore} - 1)`,
      updatedAt: new Date()
    })
    .where(eq(botTrainingData.id, id));
}

// ============ AFFILIATE COOKIE TRACKING FUNCTIONS ============
export async function trackAffiliateCookie(data: InsertAffiliateCookieTracking): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(affiliateCookieTracking).values(data);
  return result[0].insertId;
}

export async function getAffiliateCookieByVisitor(visitorId: string): Promise<AffiliateCookieTracking | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(affiliateCookieTracking)
    .where(eq(affiliateCookieTracking.visitorId, visitorId))
    .orderBy(desc(affiliateCookieTracking.clickedAt))
    .limit(1);

  return result[0];
}

export async function markCookieConverted(id: number, conversionValue: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(affiliateCookieTracking)
    .set({
      hasConverted: true,
      convertedAt: new Date(),
      conversionValue: conversionValue,
      updatedAt: new Date()
    })
    .where(eq(affiliateCookieTracking.id, id));
}

export async function getCookieTrackingStats(userId: number): Promise<{
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}> {
  const db = await getDb();
  if (!db) return { totalClicks: 0, totalConversions: 0, conversionRate: 0 };

  const result = await db
    .select({
      totalClicks: sql<number>`COUNT(*)`,
      totalConversions: sql<number>`SUM(CASE WHEN hasConverted = 1 THEN 1 ELSE 0 END)`
    })
    .from(affiliateCookieTracking)
    .innerJoin(affiliateLinks, eq(affiliateCookieTracking.affiliateLinkId, affiliateLinks.id))
    .where(eq(affiliateLinks.userId, userId));

  const stats = result[0];
  const totalClicks = Number(stats?.totalClicks || 0);
  const totalConversions = Number(stats?.totalConversions || 0);
  
  return {
    totalClicks,
    totalConversions,
    conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
  };
}
