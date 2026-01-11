import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  trendingTopics, InsertTrendingTopic, TrendingTopic,
  articles, InsertArticle, Article,
  affiliateLinks, InsertAffiliateLink, AffiliateLink,
  articleAffiliateLinks, InsertArticleAffiliateLink,
  analyticsEvents, InsertAnalyticsEvent,
  savedTopics, InsertSavedTopic
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
