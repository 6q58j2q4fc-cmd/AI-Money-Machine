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

/**
 * Commission Junction integration settings
 */
export const cjSettings = mysqlTable("cj_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cid: varchar("cid", { length: 50 }).notNull(), // CJ Account ID
  websiteId: varchar("websiteId", { length: 50 }),
  apiToken: text("apiToken"), // Encrypted API token if provided
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CJSettings = typeof cjSettings.$inferSelect;
export type InsertCJSettings = typeof cjSettings.$inferInsert;

/**
 * CJ Products/Advertisers cache
 */
export const cjProducts = mysqlTable("cj_products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  advertiserId: varchar("advertiserId", { length: 50 }).notNull(),
  advertiserName: varchar("advertiserName", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  productName: varchar("productName", { length: 500 }),
  productUrl: text("productUrl"),
  affiliateUrl: text("affiliateUrl").notNull(),
  imageUrl: text("imageUrl"),
  price: decimal("price", { precision: 10, scale: 2 }),
  commission: varchar("commission", { length: 100 }),
  epc: decimal("epc", { precision: 10, scale: 4 }), // Earnings per click
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CJProduct = typeof cjProducts.$inferSelect;
export type InsertCJProduct = typeof cjProducts.$inferInsert;

/**
 * Publishing queue for automated article publishing
 */
export const publishingQueue = mysqlTable("publishing_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "published", "failed"]).default("pending").notNull(),
  publishedAt: timestamp("publishedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishingQueue = typeof publishingQueue.$inferSelect;
export type InsertPublishingQueue = typeof publishingQueue.$inferInsert;

/**
 * Auto-generated content queue
 */
export const contentQueue = mysqlTable("content_queue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topicId: int("topicId"),
  title: varchar("title", { length: 500 }).notNull(),
  keywords: json("keywords").$type<string[]>(),
  targetProducts: json("targetProducts").$type<number[]>(), // CJ product IDs to include
  status: mysqlEnum("status", ["pending", "generating", "ready", "published", "failed"]).default("pending").notNull(),
  generatedArticleId: int("generatedArticleId"),
  priority: int("priority").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentQueue = typeof contentQueue.$inferSelect;
export type InsertContentQueue = typeof contentQueue.$inferInsert;


/**
 * Automation settings for scheduled content generation
 */
export const automationSettings = mysqlTable("automation_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  articlesPerCycle: int("articlesPerCycle").default(3).notNull(),
  cycleIntervalHours: int("cycleIntervalHours").default(24).notNull(), // How often to run
  targetNiches: json("targetNiches").$type<string[]>(), // Niches to focus on
  autoPublish: boolean("autoPublish").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  totalArticlesGenerated: int("totalArticlesGenerated").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutomationSettings = typeof automationSettings.$inferSelect;
export type InsertAutomationSettings = typeof automationSettings.$inferInsert;

/**
 * Performance learning - tracks what content strategies work best
 */
export const performanceLearning = mysqlTable("performance_learning", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // What we learned
  learningType: mysqlEnum("learningType", ["topic", "headline", "keyword", "cta", "link_placement", "content_length", "category"]).notNull(),
  learningKey: varchar("learningKey", { length: 500 }).notNull(), // The specific topic/headline/keyword
  
  // Performance metrics
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  
  // Calculated scores
  ctr: decimal("ctr", { precision: 5, scale: 4 }).default("0.0000"), // Click-through rate
  conversionRate: decimal("conversionRate", { precision: 5, scale: 4 }).default("0.0000"),
  revenuePerClick: decimal("revenuePerClick", { precision: 10, scale: 4 }).default("0.0000"),
  performanceScore: int("performanceScore").default(0).notNull(), // 0-100 overall score
  
  // Usage tracking
  timesUsed: int("timesUsed").default(1).notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PerformanceLearning = typeof performanceLearning.$inferSelect;
export type InsertPerformanceLearning = typeof performanceLearning.$inferInsert;

/**
 * Content generation history - tracks all generated content for learning
 */
export const contentGenerationHistory = mysqlTable("content_generation_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId"),
  
  // Generation parameters
  topic: varchar("topic", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }),
  keywords: json("keywords").$type<string[]>(),
  contentType: mysqlEnum("contentType", ["article", "listicle", "review", "comparison", "how_to", "news"]).default("article").notNull(),
  targetLength: int("targetLength").default(1500),
  
  // Performance after publishing
  views: int("views").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  
  // Learning flags
  wasSuccessful: boolean("wasSuccessful").default(false),
  successReason: text("successReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentGenerationHistory = typeof contentGenerationHistory.$inferSelect;
export type InsertContentGenerationHistory = typeof contentGenerationHistory.$inferInsert;


/**
 * Article distribution tracking - tracks where articles have been distributed
 */
export const articleDistribution = mysqlTable("article_distribution", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId").notNull(),
  userId: int("userId").notNull(),
  
  // Distribution platform
  platform: mysqlEnum("platform", [
    "medium", "devto", "linkedin", "hashnode", "substack", 
    "reddit", "hackernews", "twitter", "facebook", "pinterest",
    "press_release", "article_directory", "rss_syndication", "other"
  ]).notNull(),
  platformName: varchar("platformName", { length: 100 }), // Human readable name
  
  // Distribution details
  externalUrl: text("externalUrl"), // URL on the external platform
  externalId: varchar("externalId", { length: 255 }), // ID on external platform
  status: mysqlEnum("status", ["pending", "submitted", "published", "failed", "removed"]).default("pending").notNull(),
  
  // Performance from this distribution
  views: int("views").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  referralTraffic: int("referralTraffic").default(0).notNull(),
  
  // Error tracking
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  
  submittedAt: timestamp("submittedAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArticleDistribution = typeof articleDistribution.$inferSelect;
export type InsertArticleDistribution = typeof articleDistribution.$inferInsert;

/**
 * Optimization bot learning - tracks the bot's learning progress and decisions
 */
export const botLearning = mysqlTable("bot_learning", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Learning session
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  
  // What was learned
  learningCategory: mysqlEnum("learningCategory", [
    "topic_selection", "headline_optimization", "cta_placement", 
    "affiliate_selection", "timing_optimization", "content_structure",
    "keyword_targeting", "distribution_strategy"
  ]).notNull(),
  
  // Decision made
  decision: text("decision").notNull(),
  reasoning: text("reasoning"),
  
  // Outcome
  outcome: mysqlEnum("outcome", ["success", "failure", "pending", "neutral"]).default("pending").notNull(),
  outcomeMetrics: json("outcomeMetrics").$type<{
    clicks?: number;
    conversions?: number;
    revenue?: number;
    engagement?: number;
  }>(),
  
  // Learning score
  confidenceScore: int("confidenceScore").default(50).notNull(), // 0-100
  wasCorrect: boolean("wasCorrect"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotLearning = typeof botLearning.$inferSelect;
export type InsertBotLearning = typeof botLearning.$inferInsert;


/**
 * URL Shortener settings for monetizing link clicks
 */
export const urlShortenerSettings = mysqlTable("url_shortener_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Provider settings
  provider: mysqlEnum("provider", ["shorte_st", "adfly", "linkvertise", "shrinkme", "ouo_io", "none"]).default("none").notNull(),
  apiKey: varchar("apiKey", { length: 255 }),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  
  // Earnings tracking
  totalClicks: int("totalClicks").default(0).notNull(),
  totalEarnings: decimal("totalEarnings", { precision: 10, scale: 4 }).default("0.0000"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UrlShortenerSettings = typeof urlShortenerSettings.$inferSelect;
export type InsertUrlShortenerSettings = typeof urlShortenerSettings.$inferInsert;

/**
 * Shortened URLs tracking
 */
export const shortenedUrls = mysqlTable("shortened_urls", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId"),
  affiliateLinkId: int("affiliateLinkId"),
  
  // URLs
  originalUrl: text("originalUrl").notNull(),
  shortUrl: text("shortUrl").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  
  // Tracking
  clicks: int("clicks").default(0).notNull(),
  earnings: decimal("earnings", { precision: 10, scale: 4 }).default("0.0000"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShortenedUrl = typeof shortenedUrls.$inferSelect;
export type InsertShortenedUrl = typeof shortenedUrls.$inferInsert;

/**
 * Tracking pixels for retargeting
 */
export const trackingPixels = mysqlTable("tracking_pixels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Pixel configuration
  pixelType: mysqlEnum("pixelType", ["facebook", "google", "tiktok", "custom"]).notNull(),
  pixelId: varchar("pixelId", { length: 255 }).notNull(),
  pixelCode: text("pixelCode"),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  
  // Stats
  totalFires: int("totalFires").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrackingPixel = typeof trackingPixels.$inferSelect;
export type InsertTrackingPixel = typeof trackingPixels.$inferInsert;

/**
 * Bot training data - stores marketing knowledge for the AI
 */
export const botTrainingData = mysqlTable("bot_training_data", {
  id: int("id").autoincrement().primaryKey(),
  
  // Training category
  category: mysqlEnum("category", [
    "ad_copy", "headline_formulas", "cta_strategies", "affiliate_tactics",
    "seo_techniques", "viral_triggers", "conversion_optimization", "email_marketing"
  ]).notNull(),
  
  // Training content
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 255 }),
  sourceUrl: text("sourceUrl"),
  
  // Effectiveness rating
  effectivenessScore: int("effectivenessScore").default(50).notNull(), // 0-100
  timesApplied: int("timesApplied").default(0).notNull(),
  successRate: decimal("successRate", { precision: 5, scale: 2 }).default("0.00"),
  
  isVerified: boolean("isVerified").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotTrainingData = typeof botTrainingData.$inferSelect;
export type InsertBotTrainingData = typeof botTrainingData.$inferInsert;

/**
 * Affiliate cookie tracking - ensures attribution sticks
 */
export const affiliateCookieTracking = mysqlTable("affiliate_cookie_tracking", {
  id: int("id").autoincrement().primaryKey(),
  
  // Visitor identification
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  ipHash: varchar("ipHash", { length: 64 }), // Hashed for privacy
  userAgent: text("userAgent"),
  
  // Click details
  articleId: int("articleId"),
  affiliateLinkId: int("affiliateLinkId").notNull(),
  clickedAt: timestamp("clickedAt").defaultNow().notNull(),
  
  // Cookie info
  cookieExpiry: timestamp("cookieExpiry"),
  cookieDurationDays: int("cookieDurationDays").default(30),
  
  // Conversion tracking
  hasConverted: boolean("hasConverted").default(false).notNull(),
  convertedAt: timestamp("convertedAt"),
  conversionValue: decimal("conversionValue", { precision: 10, scale: 2 }),
  
  // Retargeting
  retargetingAttempts: int("retargetingAttempts").default(0).notNull(),
  lastRetargetedAt: timestamp("lastRetargetedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateCookieTracking = typeof affiliateCookieTracking.$inferSelect;
export type InsertAffiliateCookieTracking = typeof affiliateCookieTracking.$inferInsert;
