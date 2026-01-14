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
  cycleIntervalMinutes: int("cycleIntervalMinutes").default(1440).notNull(), // How often to run (in minutes)
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
    "pr_newswire", "prweb", "free_press_release", "article_directory", "rss_syndication", "other"
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


/**
 * Comprehensive audit log - tracks all system activities for bot learning
 */
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  
  // Event type
  eventType: mysqlEnum("eventType", [
    "article_created", "article_published", "article_updated", "article_deleted",
    "distribution_queued", "distribution_published", "distribution_failed",
    "affiliate_link_added", "affiliate_link_clicked", "affiliate_conversion",
    "automation_cycle_started", "automation_cycle_completed", "automation_cycle_failed",
    "topic_discovered", "topic_saved",
    "bot_decision", "bot_learning", "bot_optimization",
    "seo_indexed", "seo_ping_sent",
    "user_action", "system_event"
  ]).notNull(),
  
  // Related entities
  articleId: int("articleId"),
  affiliateLinkId: int("affiliateLinkId"),
  distributionId: int("distributionId"),
  topicId: int("topicId"),
  
  // Event details
  action: varchar("action", { length: 255 }).notNull(),
  description: text("description"),
  
  // Metadata for bot learning
  metadata: json("metadata").$type<{
    platform?: string;
    externalUrl?: string;
    linksUsed?: number[];
    seoScore?: number;
    performance?: {
      views?: number;
      clicks?: number;
      conversions?: number;
      revenue?: number;
    };
    botDecision?: string;
    botReasoning?: string;
    searchEngines?: string[];
    cycleResults?: {
      articlesGenerated?: number;
      articlesPublished?: number;
      distributionsQueued?: number;
    };
  }>(),
  
  // Success tracking
  wasSuccessful: boolean("wasSuccessful").default(true).notNull(),
  errorMessage: text("errorMessage"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;


/**
 * User wallet settings for crypto payouts
 */
export const walletSettings = mysqlTable("wallet_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Primary ETH wallet for payouts
  ethWalletAddress: varchar("ethWalletAddress", { length: 42 }).notNull(),
  
  // Additional wallet addresses for different chains
  polygonWalletAddress: varchar("polygonWalletAddress", { length: 42 }),
  arbitrumWalletAddress: varchar("arbitrumWalletAddress", { length: 42 }),
  optimismWalletAddress: varchar("optimismWalletAddress", { length: 42 }),
  baseWalletAddress: varchar("baseWalletAddress", { length: 42 }),
  solanaWalletAddress: varchar("solanaWalletAddress", { length: 44 }),
  
  // Payout preferences
  autoPayoutEnabled: boolean("autoPayoutEnabled").default(true).notNull(),
  minPayoutThreshold: decimal("minPayoutThreshold", { precision: 18, scale: 8 }).default("0.01"),
  preferredChain: mysqlEnum("preferredChain", ["ethereum", "polygon", "arbitrum", "optimism", "base", "solana"]).default("ethereum"),
  
  // Earnings tracking
  totalEarnings: decimal("totalEarnings", { precision: 18, scale: 8 }).default("0"),
  pendingPayout: decimal("pendingPayout", { precision: 18, scale: 8 }).default("0"),
  lastPayoutAt: timestamp("lastPayoutAt"),
  lastPayoutAmount: decimal("lastPayoutAmount", { precision: 18, scale: 8 }),
  lastPayoutTxHash: varchar("lastPayoutTxHash", { length: 66 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WalletSettings = typeof walletSettings.$inferSelect;
export type InsertWalletSettings = typeof walletSettings.$inferInsert;


/**
 * NFT Assets - Stores all generated NFTs
 */
export const nftAssets = mysqlTable("nft_assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // NFT Identity
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Image storage
  imageUrl: text("imageUrl").notNull(),
  imageKey: varchar("imageKey", { length: 500 }),
  thumbnailUrl: text("thumbnailUrl"),
  
  // Metadata
  category: varchar("category", { length: 100 }).notNull(),
  style: varchar("style", { length: 100 }),
  traits: json("traits").$type<{ trait_type: string; value: string }[]>(),
  
  // Blockchain info
  tokenId: varchar("tokenId", { length: 100 }),
  contractAddress: varchar("contractAddress", { length: 42 }),
  chain: mysqlEnum("chain", ["ethereum", "polygon", "arbitrum", "optimism", "base", "solana"]).default("ethereum"),
  metadataUri: text("metadataUri"),
  
  // Valuation
  estimatedValue: decimal("estimatedValue", { precision: 18, scale: 8 }).default("0"),
  floorPrice: decimal("floorPrice", { precision: 18, scale: 8 }),
  lastSalePrice: decimal("lastSalePrice", { precision: 18, scale: 8 }),
  
  // Status
  status: mysqlEnum("status", ["generating", "generated", "minting", "minted", "listed", "sold", "burned"]).default("generating"),
  isMinted: boolean("isMinted").default(false),
  
  // Analytics
  views: int("views").default(0),
  likes: int("likes").default(0),
  offers: int("offers").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NftAsset = typeof nftAssets.$inferSelect;
export type InsertNftAsset = typeof nftAssets.$inferInsert;

/**
 * NFT Listings - Tracks where each NFT is listed
 */
export const nftListings = mysqlTable("nft_listings", {
  id: int("id").autoincrement().primaryKey(),
  nftAssetId: int("nftAssetId").notNull(),
  userId: int("userId").notNull(),
  
  // Marketplace info
  marketplace: varchar("marketplace", { length: 100 }).notNull(),
  listingUrl: text("listingUrl"),
  listingId: varchar("listingId", { length: 200 }),
  
  // Pricing
  listPrice: decimal("listPrice", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ETH"),
  expectedSalePrice: decimal("expectedSalePrice", { precision: 18, scale: 8 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "active", "sold", "cancelled", "expired"]).default("pending"),
  
  // Timestamps
  listedAt: timestamp("listedAt"),
  expiresAt: timestamp("expiresAt"),
  soldAt: timestamp("soldAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NftListing = typeof nftListings.$inferSelect;
export type InsertNftListing = typeof nftListings.$inferInsert;

/**
 * NFT Sales - Completed sales records
 */
export const nftSales = mysqlTable("nft_sales", {
  id: int("id").autoincrement().primaryKey(),
  nftAssetId: int("nftAssetId").notNull(),
  nftListingId: int("nftListingId"),
  userId: int("userId").notNull(),
  
  // Sale details
  marketplace: varchar("marketplace", { length: 100 }).notNull(),
  salePrice: decimal("salePrice", { precision: 18, scale: 8 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ETH"),
  
  // Buyer info
  buyerAddress: varchar("buyerAddress", { length: 42 }),
  
  // Transaction
  txHash: varchar("txHash", { length: 66 }),
  blockNumber: int("blockNumber"),
  
  // Fees
  marketplaceFee: decimal("marketplaceFee", { precision: 18, scale: 8 }),
  royaltyFee: decimal("royaltyFee", { precision: 18, scale: 8 }),
  netProceeds: decimal("netProceeds", { precision: 18, scale: 8 }),
  
  // Payout
  isPaidOut: boolean("isPaidOut").default(false),
  payoutTxHash: varchar("payoutTxHash", { length: 66 }),
  
  soldAt: timestamp("soldAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NftSale = typeof nftSales.$inferSelect;
export type InsertNftSale = typeof nftSales.$inferInsert;

/**
 * Auto-Buyer Submissions - Track submissions to platforms that buy NFTs/art
 */
export const autoBuyerSubmissions = mysqlTable("auto_buyer_submissions", {
  id: int("id").autoincrement().primaryKey(),
  nftAssetId: int("nftAssetId").notNull(),
  userId: int("userId").notNull(),
  
  // Platform info
  platform: varchar("platform", { length: 100 }).notNull(),
  platformUrl: text("platformUrl"),
  submissionId: varchar("submissionId", { length: 200 }),
  
  // Pricing
  offeredPrice: decimal("offeredPrice", { precision: 18, scale: 8 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  
  // Status
  status: mysqlEnum("status", ["pending", "submitted", "under_review", "accepted", "rejected", "sold"]).default("pending"),
  rejectionReason: text("rejectionReason"),
  
  // Earnings
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0"),
  isPaidOut: boolean("isPaidOut").default(false),
  
  submittedAt: timestamp("submittedAt"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AutoBuyerSubmission = typeof autoBuyerSubmissions.$inferSelect;
export type InsertAutoBuyerSubmission = typeof autoBuyerSubmissions.$inferInsert;


/**
 * System Hot Wallet - Persisted server-side wallet for gas fees and transactions
 * Only one row should exist - the system hot wallet
 */
export const systemHotWallet = mysqlTable("system_hot_wallet", {
  id: int("id").autoincrement().primaryKey(),
  
  // Wallet address (public)
  address: varchar("address", { length: 42 }).notNull().unique(),
  
  // Encrypted private key (AES-256-GCM encrypted)
  encryptedPrivateKey: text("encryptedPrivateKey").notNull(),
  
  // Encryption metadata
  encryptionIv: varchar("encryptionIv", { length: 32 }).notNull(),
  encryptionAuthTag: varchar("encryptionAuthTag", { length: 32 }).notNull(),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Cached balances (updated periodically)
  balanceEthereum: varchar("balanceEthereum", { length: 50 }).default("0"),
  balancePolygon: varchar("balancePolygon", { length: 50 }).default("0"),
  balanceArbitrum: varchar("balanceArbitrum", { length: 50 }).default("0"),
  balanceOptimism: varchar("balanceOptimism", { length: 50 }).default("0"),
  balanceBase: varchar("balanceBase", { length: 50 }).default("0"),
  
  lastBalanceCheck: timestamp("lastBalanceCheck"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemHotWallet = typeof systemHotWallet.$inferSelect;
export type InsertSystemHotWallet = typeof systemHotWallet.$inferInsert;


/**
 * Crypto Transaction Log - Comprehensive log of all crypto transactions
 * Tracks all incoming and outgoing transactions with blockchain verification
 */
export const cryptoTransactionLog = mysqlTable("crypto_transaction_log", {
  id: int("id").autoincrement().primaryKey(),
  
  // Transaction identification
  txHash: varchar("txHash", { length: 66 }).unique(),
  
  // Direction and type
  direction: mysqlEnum("direction", ["incoming", "outgoing"]).notNull(),
  txType: mysqlEnum("txType", ["deposit", "withdrawal", "nft_mint", "nft_sale", "gas_fee", "transfer", "contract_deploy"]).notNull(),
  
  // Network info
  network: varchar("network", { length: 50 }).notNull(),
  chainId: int("chainId").notNull(),
  
  // Addresses
  fromAddress: varchar("fromAddress", { length: 42 }).notNull(),
  toAddress: varchar("toAddress", { length: 42 }).notNull(),
  
  // Amount
  amount: varchar("amount", { length: 78 }).notNull(), // Wei as string for precision
  amountFormatted: varchar("amountFormatted", { length: 50 }).notNull(), // Human readable
  currency: varchar("currency", { length: 10 }).notNull(),
  usdValue: decimal("usdValue", { precision: 18, scale: 2 }),
  
  // Gas info
  gasUsed: varchar("gasUsed", { length: 50 }),
  gasPrice: varchar("gasPrice", { length: 50 }),
  gasCost: varchar("gasCost", { length: 50 }),
  gasCostUsd: decimal("gasCostUsd", { precision: 18, scale: 4 }),
  
  // Block info
  blockNumber: int("blockNumber"),
  blockHash: varchar("blockHash", { length: 66 }),
  blockTimestamp: timestamp("blockTimestamp"),
  
  // Verification status
  status: mysqlEnum("status", ["pending", "confirming", "confirmed", "failed", "dropped"]).default("pending").notNull(),
  confirmations: int("confirmations").default(0),
  requiredConfirmations: int("requiredConfirmations").default(12),
  
  // Verification timestamps
  firstSeenAt: timestamp("firstSeenAt"),
  confirmedAt: timestamp("confirmedAt"),
  
  // Explorer link
  explorerUrl: text("explorerUrl"),
  
  // Related entities
  userId: int("userId"),
  nftAssetId: int("nftAssetId"),
  relatedTxId: int("relatedTxId"), // For linked transactions (e.g., gas fee for NFT mint)
  
  // Metadata
  description: text("description"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  
  // Error handling
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CryptoTransactionLog = typeof cryptoTransactionLog.$inferSelect;
export type InsertCryptoTransactionLog = typeof cryptoTransactionLog.$inferInsert;


/**
 * Faucet Accounts - Store credentials for crypto faucet sites
 * Credentials are encrypted with AES-256
 */
export const faucetAccounts = mysqlTable("faucet_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Faucet platform info
  platform: varchar("platform", { length: 100 }).notNull(),
  platformUrl: text("platformUrl").notNull(),
  platformIcon: varchar("platformIcon", { length: 50 }),
  
  // Encrypted credentials
  encryptedEmail: text("encryptedEmail"),
  encryptedPassword: text("encryptedPassword"),
  encryptedApiKey: text("encryptedApiKey"),
  
  // Wallet address for this faucet (where rewards go)
  walletAddress: varchar("walletAddress", { length: 42 }),
  
  // Session management
  sessionCookies: text("sessionCookies"), // Encrypted session cookies for persistent login
  lastLoginAt: timestamp("lastLoginAt"),
  loginStatus: mysqlEnum("loginStatus", ["logged_out", "logged_in", "expired", "error"]).default("logged_out"),
  
  // Claim tracking
  lastClaimAt: timestamp("lastClaimAt"),
  nextClaimAt: timestamp("nextClaimAt"),
  claimIntervalMinutes: int("claimIntervalMinutes").default(60),
  totalClaims: int("totalClaims").default(0),
  totalEarnings: decimal("totalEarnings", { precision: 18, scale: 8 }).default("0"),
  earningsCurrency: varchar("earningsCurrency", { length: 20 }).default("BTC"),
  
  // Status
  isEnabled: boolean("isEnabled").default(true),
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FaucetAccount = typeof faucetAccounts.$inferSelect;
export type InsertFaucetAccount = typeof faucetAccounts.$inferInsert;

/**
 * CAPTCHA Solving Settings - API keys for CAPTCHA solving services
 */
export const captchaSettings = mysqlTable("captcha_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Primary CAPTCHA service
  primaryService: mysqlEnum("primaryService", ["2captcha", "anticaptcha", "capsolver", "none"]).default("none"),
  
  // 2Captcha settings
  twoCaptchaApiKey: text("twoCaptchaApiKey"), // Encrypted
  twoCaptchaBalance: decimal("twoCaptchaBalance", { precision: 10, scale: 4 }).default("0"),
  
  // Anti-Captcha settings
  antiCaptchaApiKey: text("antiCaptchaApiKey"), // Encrypted
  antiCaptchaBalance: decimal("antiCaptchaBalance", { precision: 10, scale: 4 }).default("0"),
  
  // CapSolver settings
  capSolverApiKey: text("capSolverApiKey"), // Encrypted
  capSolverBalance: decimal("capSolverBalance", { precision: 10, scale: 4 }).default("0"),
  
  // Usage tracking
  totalCaptchasSolved: int("totalCaptchasSolved").default(0),
  totalCost: decimal("totalCost", { precision: 10, scale: 4 }).default("0"),
  successRate: decimal("successRate", { precision: 5, scale: 2 }).default("0"),
  
  // Auto-solve settings
  autoSolveEnabled: boolean("autoSolveEnabled").default(true),
  maxCostPerDay: decimal("maxCostPerDay", { precision: 10, scale: 2 }).default("5.00"),
  dailyCostUsed: decimal("dailyCostUsed", { precision: 10, scale: 4 }).default("0"),
  costResetAt: timestamp("costResetAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CaptchaSettings = typeof captchaSettings.$inferSelect;
export type InsertCaptchaSettings = typeof captchaSettings.$inferInsert;

/**
 * CAPTCHA Solve Log - Track individual CAPTCHA solves
 */
export const captchaSolveLog = mysqlTable("captcha_solve_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  faucetAccountId: int("faucetAccountId"),
  
  // CAPTCHA details
  captchaType: mysqlEnum("captchaType", ["recaptcha_v2", "recaptcha_v3", "hcaptcha", "funcaptcha", "image", "text"]).notNull(),
  service: varchar("service", { length: 50 }).notNull(),
  siteKey: varchar("siteKey", { length: 100 }),
  pageUrl: text("pageUrl"),
  
  // Result
  status: mysqlEnum("status", ["pending", "solving", "solved", "failed", "timeout"]).default("pending"),
  solveTimeMs: int("solveTimeMs"),
  cost: decimal("cost", { precision: 10, scale: 6 }).default("0"),
  
  // Error handling
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CaptchaSolveLog = typeof captchaSolveLog.$inferSelect;
export type InsertCaptchaSolveLog = typeof captchaSolveLog.$inferInsert;

/**
 * Faucet Claim Log - Track individual faucet claims
 */
export const faucetClaimLog = mysqlTable("faucet_claim_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  faucetAccountId: int("faucetAccountId").notNull(),
  
  // Claim details
  platform: varchar("platform", { length: 100 }).notNull(),
  claimAmount: decimal("claimAmount", { precision: 18, scale: 8 }),
  currency: varchar("currency", { length: 20 }),
  usdValue: decimal("usdValue", { precision: 10, scale: 4 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "claiming", "success", "failed", "captcha_failed"]).default("pending"),
  
  // CAPTCHA info
  captchaRequired: boolean("captchaRequired").default(false),
  captchaSolveLogId: int("captchaSolveLogId"),
  
  // Error handling
  errorMessage: text("errorMessage"),
  screenshotUrl: text("screenshotUrl"),
  
  claimedAt: timestamp("claimedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FaucetClaimLog = typeof faucetClaimLog.$inferSelect;
export type InsertFaucetClaimLog = typeof faucetClaimLog.$inferInsert;


/**
 * Real NFT mints with blockchain proof
 */
export const nftMints = mysqlTable("nft_mints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Blockchain identifiers
  tokenId: varchar("tokenId", { length: 100 }).notNull(),
  contractAddress: varchar("contractAddress", { length: 100 }).notNull(),
  transactionHash: varchar("transactionHash", { length: 100 }).notNull(),
  blockNumber: int("blockNumber"),
  blockHash: varchar("blockHash", { length: 100 }),
  network: varchar("network", { length: 50 }).notNull(),
  
  // NFT metadata
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  metadataUrl: text("metadataUrl"),
  category: varchar("category", { length: 100 }),
  rarity: varchar("rarity", { length: 50 }),
  
  // Transaction details
  gasUsed: varchar("gasUsed", { length: 100 }),
  gasCost: varchar("gasCost", { length: 100 }),
  
  // Status
  status: mysqlEnum("status", ["minted", "listed", "sold", "transferred"]).default("minted").notNull(),
  
  // Marketplace listings
  listedOn: json("listedOn").$type<string[]>(),
  listingUrls: json("listingUrls").$type<Record<string, string>>(),
  currentPrice: varchar("currentPrice", { length: 100 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NftMint = typeof nftMints.$inferSelect;
export type InsertNftMint = typeof nftMints.$inferInsert;

/**
 * NFT earnings with transaction proof
 */
export const nftEarnings = mysqlTable("nft_earnings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // NFT reference
  nftId: varchar("nftId", { length: 100 }),
  tokenId: varchar("tokenId", { length: 100 }),
  contractAddress: varchar("contractAddress", { length: 100 }),
  
  // Sale details
  salePrice: varchar("salePrice", { length: 100 }).notNull(),
  currency: varchar("currency", { length: 20 }).notNull(),
  marketplace: varchar("marketplace", { length: 100 }),
  buyerAddress: varchar("buyerAddress", { length: 100 }),
  
  // Transaction proof
  transactionHash: varchar("transactionHash", { length: 100 }),
  blockNumber: int("blockNumber"),
  
  // Earnings breakdown
  netEarnings: varchar("netEarnings", { length: 100 }),
  fees: varchar("fees", { length: 100 }),
  
  // Transfer status
  status: mysqlEnum("status", ["pending", "confirmed", "transferred"]).default("pending").notNull(),
  transferTxHash: varchar("transferTxHash", { length: 100 }),
  transferredToWallet: varchar("transferredToWallet", { length: 100 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NftEarning = typeof nftEarnings.$inferSelect;
export type InsertNftEarning = typeof nftEarnings.$inferInsert;


/**
 * NFT Favorites/Watchlist - Users can save NFTs they're interested in
 */
export const nftFavorites = mysqlTable("nft_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  nftAssetId: int("nftAssetId").notNull(),
  
  // Price tracking for notifications
  priceAtSave: varchar("priceAtSave", { length: 50 }),
  notifyOnPriceChange: boolean("notifyOnPriceChange").default(true),
  notifyOnSale: boolean("notifyOnSale").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NftFavorite = typeof nftFavorites.$inferSelect;
export type InsertNftFavorite = typeof nftFavorites.$inferInsert;

/**
 * NFT Royalty Settings - Creator royalty configuration
 */
export const nftRoyalties = mysqlTable("nft_royalties", {
  id: int("id").autoincrement().primaryKey(),
  nftAssetId: int("nftAssetId").notNull(),
  
  // Royalty percentage (0-100, with decimals)
  royaltyPercentage: varchar("royaltyPercentage", { length: 10 }).default("2.5"),
  
  // Royalty recipient wallet address
  recipientAddress: varchar("recipientAddress", { length: 100 }),
  
  // Whether royalties are enforced on-chain
  onChainEnforced: boolean("onChainEnforced").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NftRoyalty = typeof nftRoyalties.$inferSelect;
export type InsertNftRoyalty = typeof nftRoyalties.$inferInsert;

/**
 * NFT Price History - Track price changes for watchlist notifications
 */
export const nftPriceHistory = mysqlTable("nft_price_history", {
  id: int("id").autoincrement().primaryKey(),
  nftAssetId: int("nftAssetId").notNull(),
  
  price: varchar("price", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ETH"),
  marketplace: varchar("marketplace", { length: 50 }),
  
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});
export type NftPriceHistory = typeof nftPriceHistory.$inferSelect;
export type InsertNftPriceHistory = typeof nftPriceHistory.$inferInsert;

/**
 * Marketplace API Settings - Store API keys for OpenSea, Rarible, etc.
 */
export const marketplaceApiSettings = mysqlTable("marketplace_api_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  marketplace: varchar("marketplace", { length: 50 }).notNull(), // opensea, rarible, etc.
  apiKey: varchar("apiKey", { length: 500 }),
  apiSecret: varchar("apiSecret", { length: 500 }),
  
  isEnabled: boolean("isEnabled").default(true),
  autoSync: boolean("autoSync").default(true),
  lastSyncAt: timestamp("lastSyncAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketplaceApiSettings = typeof marketplaceApiSettings.$inferSelect;
export type InsertMarketplaceApiSettings = typeof marketplaceApiSettings.$inferInsert;
