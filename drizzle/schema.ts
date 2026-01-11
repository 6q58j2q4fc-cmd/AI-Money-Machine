import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Trending topics discovered from various sources
 */
export const trendingTopics = mysqlTable("trending_topics", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  popularityScore: int("popularityScore").default(0).notNull(),
  searchVolume: varchar("searchVolume", { length: 50 }),
  competition: mysqlEnum("competition", ["low", "medium", "high"]).default("medium"),
  keywords: json("keywords").$type<string[]>(),
  savedByUser: boolean("savedByUser").default(false),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrendingTopic = typeof trendingTopics.$inferSelect;
export type InsertTrendingTopic = typeof trendingTopics.$inferInsert;

/**
 * Articles created by users
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  status: mysqlEnum("status", ["draft", "review", "published", "archived"]).default("draft").notNull(),
  
  // SEO fields
  metaTitle: varchar("metaTitle", { length: 70 }),
  metaDescription: varchar("metaDescription", { length: 160 }),
  keywords: json("keywords").$type<string[]>(),
  focusKeyword: varchar("focusKeyword", { length: 100 }),
  
  // Analytics
  views: int("views").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  estimatedRevenue: decimal("estimatedRevenue", { precision: 10, scale: 2 }).default("0.00"),
  
  // SEO scores
  seoScore: int("seoScore").default(0),
  readabilityScore: int("readabilityScore").default(0),
  
  // Related topic
  topicId: int("topicId"),
  
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * Affiliate links for monetization
 */
export const affiliateLinks = mysqlTable("affiliate_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  url: text("url").notNull(),
  shortCode: varchar("shortCode", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  program: varchar("program", { length: 100 }), // e.g., "Amazon Associates", "ShareASale"
  commission: varchar("commission", { length: 50 }), // e.g., "5%", "$10 per sale"
  
  // Performance metrics
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = typeof affiliateLinks.$inferInsert;

/**
 * Junction table for articles and affiliate links
 */
export const articleAffiliateLinks = mysqlTable("article_affiliate_links", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  affiliateLinkId: int("affiliateLinkId").notNull(),
  anchorText: varchar("anchorText", { length: 200 }),
  position: int("position"), // Position in article
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ArticleAffiliateLink = typeof articleAffiliateLinks.$inferSelect;
export type InsertArticleAffiliateLink = typeof articleAffiliateLinks.$inferInsert;

/**
 * Analytics events for tracking
 */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId"),
  affiliateLinkId: int("affiliateLinkId"),
  eventType: mysqlEnum("eventType", ["view", "click", "conversion", "share"]).notNull(),
  source: varchar("source", { length: 100 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

/**
 * Saved topics for users
 */
export const savedTopics = mysqlTable("saved_topics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topicId: int("topicId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedTopic = typeof savedTopics.$inferSelect;
export type InsertSavedTopic = typeof savedTopics.$inferInsert;
