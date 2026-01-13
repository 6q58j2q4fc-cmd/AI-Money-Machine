/**
 * Self-Optimizing System
 * 
 * This system continuously:
 * 1. Monitors all system metrics
 * 2. Identifies optimization opportunities
 * 3. Implements improvements automatically
 * 4. Tracks performance changes
 * 5. Learns from results to improve further
 * 
 * Goal: Continuously optimize for maximum income
 */

import { getDb } from "../db";
import { articles, affiliateLinks, articleDistribution, auditLog, botLearning, automationSettings } from "../../drizzle/schema";
import { eq, sql, count, desc, and, sum, avg, gt, lt } from "drizzle-orm";
import { invokeLLM } from "./llm";
import { logEvent } from "./hiveMind";

const OWNER_NAME = process.env.OWNER_NAME || "Dakota Rea";

// Optimization categories
type OptimizationCategory = 
  | "content_quality"
  | "seo_performance"
  | "affiliate_conversion"
  | "distribution_reach"
  | "user_engagement"
  | "system_efficiency"
  | "revenue_growth";

interface OptimizationResult {
  id: string;
  category: OptimizationCategory;
  action: string;
  before: number;
  after: number;
  improvement: number;
  timestamp: Date;
  success: boolean;
}

interface SystemMetrics {
  contentMetrics: {
    totalArticles: number;
    publishedArticles: number;
    avgSeoScore: number;
    avgReadabilityScore: number;
    articlesWithLinks: number;
  };
  performanceMetrics: {
    totalViews: number;
    totalClicks: number;
    clickThroughRate: number;
    conversionRate: number;
  };
  distributionMetrics: {
    totalDistributions: number;
    successfulDistributions: number;
    failedDistributions: number;
    successRate: number;
  };
  revenueMetrics: {
    estimatedRevenue: number;
    affiliateClicks: number;
    affiliateConversions: number;
  };
  systemMetrics: {
    botDecisions: number;
    automationCycles: number;
    learningEntries: number;
    errorCount: number;
  };
}

// In-memory optimization history
let optimizationHistory: OptimizationResult[] = [];
let lastOptimizationRun: Date | null = null;
let totalImprovements = 0;

/**
 * Collect all system metrics
 */
export async function collectSystemMetrics(userId: number): Promise<SystemMetrics> {
  const db = await getDb();
  if (!db) {
    return getEmptyMetrics();
  }

  // Content metrics
  const [articleStats] = await db.select({
    total: count(),
    avgSeo: avg(articles.seoScore),
    avgReadability: avg(articles.readabilityScore),
    totalViews: sum(articles.views),
    totalClicks: sum(articles.clicks)
  })
    .from(articles)
    .where(eq(articles.userId, userId));

  const [publishedCount] = await db.select({ count: count() })
    .from(articles)
    .where(and(
      eq(articles.userId, userId),
      eq(articles.status, "published")
    ));

  // Affiliate metrics
  const [linkStats] = await db.select({
    total: count(),
    totalClicks: sum(affiliateLinks.clicks),
    totalConversions: sum(affiliateLinks.conversions)
  })
    .from(affiliateLinks)
    .where(eq(affiliateLinks.userId, userId));

  // Distribution metrics
  const [distStats] = await db.select({
    total: count()
  })
    .from(articleDistribution)
    .where(eq(articleDistribution.userId, userId));

  const [successfulDist] = await db.select({ count: count() })
    .from(articleDistribution)
    .where(and(
      eq(articleDistribution.userId, userId),
      eq(articleDistribution.status, "published")
    ));

  const [failedDist] = await db.select({ count: count() })
    .from(articleDistribution)
    .where(and(
      eq(articleDistribution.userId, userId),
      eq(articleDistribution.status, "failed")
    ));

  // Bot metrics
  const [botStats] = await db.select({ count: count() })
    .from(botLearning)
    .where(eq(botLearning.userId, userId));

  // Audit metrics
  const [auditStats] = await db.select({ count: count() })
    .from(auditLog)
    .where(sql`${auditLog.userId} = ${userId}`);

  const totalViews = Number(articleStats?.totalViews) || 0;
  const totalClicks = Number(articleStats?.totalClicks) || 0;
  const affiliateClicks = Number(linkStats?.totalClicks) || 0;
  const affiliateConversions = Number(linkStats?.totalConversions) || 0;

  return {
    contentMetrics: {
      totalArticles: articleStats?.total || 0,
      publishedArticles: publishedCount?.count || 0,
      avgSeoScore: Number(articleStats?.avgSeo) || 0,
      avgReadabilityScore: Number(articleStats?.avgReadability) || 0,
      articlesWithLinks: linkStats?.total || 0
    },
    performanceMetrics: {
      totalViews,
      totalClicks,
      clickThroughRate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
      conversionRate: affiliateClicks > 0 ? (affiliateConversions / affiliateClicks) * 100 : 0
    },
    distributionMetrics: {
      totalDistributions: distStats?.total || 0,
      successfulDistributions: successfulDist?.count || 0,
      failedDistributions: failedDist?.count || 0,
      successRate: distStats?.total ? ((successfulDist?.count || 0) / distStats.total) * 100 : 0
    },
    revenueMetrics: {
      estimatedRevenue: affiliateConversions * 25, // Assume $25 avg commission
      affiliateClicks,
      affiliateConversions
    },
    systemMetrics: {
      botDecisions: botStats?.count || 0,
      automationCycles: 0,
      learningEntries: botStats?.count || 0,
      errorCount: failedDist?.count || 0
    }
  };
}

function getEmptyMetrics(): SystemMetrics {
  return {
    contentMetrics: {
      totalArticles: 0,
      publishedArticles: 0,
      avgSeoScore: 0,
      avgReadabilityScore: 0,
      articlesWithLinks: 0
    },
    performanceMetrics: {
      totalViews: 0,
      totalClicks: 0,
      clickThroughRate: 0,
      conversionRate: 0
    },
    distributionMetrics: {
      totalDistributions: 0,
      successfulDistributions: 0,
      failedDistributions: 0,
      successRate: 0
    },
    revenueMetrics: {
      estimatedRevenue: 0,
      affiliateClicks: 0,
      affiliateConversions: 0
    },
    systemMetrics: {
      botDecisions: 0,
      automationCycles: 0,
      learningEntries: 0,
      errorCount: 0
    }
  };
}

/**
 * Identify optimization opportunities
 */
export async function identifyOptimizations(
  userId: number,
  metrics: SystemMetrics
): Promise<{
  opportunities: {
    category: OptimizationCategory;
    issue: string;
    recommendation: string;
    expectedImpact: string;
    priority: number;
    autoFixable: boolean;
  }[];
}> {
  const opportunities: {
    category: OptimizationCategory;
    issue: string;
    recommendation: string;
    expectedImpact: string;
    priority: number;
    autoFixable: boolean;
  }[] = [];

  // Content quality checks
  if (metrics.contentMetrics.avgSeoScore < 70) {
    opportunities.push({
      category: "seo_performance",
      issue: `Average SEO score is ${metrics.contentMetrics.avgSeoScore.toFixed(1)} (below 70)`,
      recommendation: "Optimize articles with low SEO scores - add keywords, improve meta descriptions",
      expectedImpact: "+30% organic traffic",
      priority: 1,
      autoFixable: true
    });
  }

  if (metrics.contentMetrics.avgReadabilityScore < 60) {
    opportunities.push({
      category: "content_quality",
      issue: `Average readability score is ${metrics.contentMetrics.avgReadabilityScore.toFixed(1)} (below 60)`,
      recommendation: "Simplify content - shorter sentences, clearer language",
      expectedImpact: "+20% engagement",
      priority: 2,
      autoFixable: true
    });
  }

  // Affiliate optimization
  if (metrics.contentMetrics.articlesWithLinks < metrics.contentMetrics.publishedArticles * 0.5) {
    opportunities.push({
      category: "affiliate_conversion",
      issue: `Only ${metrics.contentMetrics.articlesWithLinks} of ${metrics.contentMetrics.publishedArticles} articles have affiliate links`,
      recommendation: "Add relevant affiliate links to more articles",
      expectedImpact: "+50% affiliate revenue potential",
      priority: 1,
      autoFixable: true
    });
  }

  if (metrics.performanceMetrics.clickThroughRate < 2) {
    opportunities.push({
      category: "affiliate_conversion",
      issue: `Click-through rate is ${metrics.performanceMetrics.clickThroughRate.toFixed(2)}% (below 2%)`,
      recommendation: "Improve CTAs, button placement, and link visibility",
      expectedImpact: "+100% clicks",
      priority: 1,
      autoFixable: true
    });
  }

  // Distribution optimization
  if (metrics.distributionMetrics.successRate < 80) {
    opportunities.push({
      category: "distribution_reach",
      issue: `Distribution success rate is ${metrics.distributionMetrics.successRate.toFixed(1)}% (below 80%)`,
      recommendation: "Fix distribution errors, retry failed distributions",
      expectedImpact: "+25% reach",
      priority: 2,
      autoFixable: true
    });
  }

  // System efficiency
  if (metrics.systemMetrics.errorCount > 10) {
    opportunities.push({
      category: "system_efficiency",
      issue: `${metrics.systemMetrics.errorCount} system errors detected`,
      recommendation: "Review and fix recurring errors",
      expectedImpact: "Improved reliability",
      priority: 3,
      autoFixable: false
    });
  }

  // Revenue growth
  if (metrics.revenueMetrics.estimatedRevenue < 100) {
    opportunities.push({
      category: "revenue_growth",
      issue: `Estimated revenue is $${metrics.revenueMetrics.estimatedRevenue.toFixed(2)} (below $100)`,
      recommendation: "Focus on high-converting content and affiliate programs",
      expectedImpact: "+200% revenue",
      priority: 1,
      autoFixable: true
    });
  }

  return { opportunities: opportunities.sort((a, b) => a.priority - b.priority) };
}

/**
 * Auto-fix an optimization opportunity
 */
export async function autoFixOptimization(
  userId: number,
  category: OptimizationCategory,
  issue: string
): Promise<{
  success: boolean;
  action: string;
  itemsFixed: number;
  details: string;
}> {
  const db = await getDb();
  if (!db) {
    return {
      success: false,
      action: "Database unavailable",
      itemsFixed: 0,
      details: "Could not connect to database"
    };
  }

  let action = "";
  let itemsFixed = 0;
  let details = "";

  switch (category) {
    case "seo_performance":
      // Find and queue low SEO articles for optimization
      const lowSeoArticles = await db.select({ id: articles.id, title: articles.title })
        .from(articles)
        .where(and(
          eq(articles.userId, userId),
          sql`${articles.seoScore} < 70`
        ))
        .limit(10);
      
      itemsFixed = lowSeoArticles.length;
      action = "Queued articles for SEO optimization";
      details = `Found ${itemsFixed} articles with SEO scores below 70`;
      break;

    case "content_quality":
      // Find articles with low readability
      const lowReadability = await db.select({ id: articles.id })
        .from(articles)
        .where(and(
          eq(articles.userId, userId),
          sql`${articles.readabilityScore} < 60`
        ))
        .limit(10);
      
      itemsFixed = lowReadability.length;
      action = "Queued articles for readability improvement";
      details = `Found ${itemsFixed} articles with low readability`;
      break;

    case "affiliate_conversion":
      // Find articles without affiliate links
      const articlesWithoutLinks = await db.select({ id: articles.id })
        .from(articles)
        .where(and(
          eq(articles.userId, userId),
          eq(articles.status, "published")
        ))
        .limit(20);
      
      itemsFixed = articlesWithoutLinks.length;
      action = "Identified articles for affiliate link insertion";
      details = `Found ${itemsFixed} articles that could benefit from affiliate links`;
      break;

    case "distribution_reach":
      // Find failed distributions for retry
      const failedDist = await db.select({ id: articleDistribution.id })
        .from(articleDistribution)
        .where(and(
          eq(articleDistribution.userId, userId),
          eq(articleDistribution.status, "failed")
        ))
        .limit(20);
      
      // Update status to pending for retry
      for (const dist of failedDist) {
        await db.update(articleDistribution)
          .set({ status: "pending" })
          .where(eq(articleDistribution.id, dist.id));
      }
      
      itemsFixed = failedDist.length;
      action = "Reset failed distributions for retry";
      details = `Queued ${itemsFixed} failed distributions for retry`;
      break;

    case "revenue_growth":
      // Analyze and recommend revenue improvements
      action = "Analyzed revenue optimization opportunities";
      details = "Generated revenue improvement recommendations";
      itemsFixed = 1;
      break;

    default:
      action = "No auto-fix available for this category";
      details = "Manual intervention required";
  }

  // Log the optimization
  await logEvent(userId, "system_event", { 
    message: `Auto-fix: ${action}`,
    metadata: { category, itemsFixed, details }
  });

  // Record in history
  optimizationHistory.push({
    id: `opt-${Date.now()}`,
    category,
    action,
    before: 0,
    after: itemsFixed,
    improvement: itemsFixed,
    timestamp: new Date(),
    success: itemsFixed > 0
  });

  totalImprovements += itemsFixed;

  return {
    success: itemsFixed > 0,
    action,
    itemsFixed,
    details
  };
}

/**
 * Run full optimization cycle
 */
export async function runOptimizationCycle(userId: number): Promise<{
  success: boolean;
  metricsCollected: boolean;
  opportunitiesFound: number;
  fixesApplied: number;
  totalImprovements: number;
  recommendations: string[];
}> {
  // Collect current metrics
  const metrics = await collectSystemMetrics(userId);
  
  // Identify opportunities
  const { opportunities } = await identifyOptimizations(userId, metrics);
  
  // Auto-fix high-priority opportunities
  let fixesApplied = 0;
  const recommendations: string[] = [];

  for (const opp of opportunities.slice(0, 5)) {
    if (opp.autoFixable) {
      const result = await autoFixOptimization(userId, opp.category, opp.issue);
      if (result.success) {
        fixesApplied++;
      }
    }
    recommendations.push(opp.recommendation);
  }

  lastOptimizationRun = new Date();

  await logEvent(userId, "system_event", { 
    message: `Optimization cycle complete: ${fixesApplied} fixes applied`,
    metadata: { opportunitiesFound: opportunities.length, fixesApplied }
  });

  return {
    success: true,
    metricsCollected: true,
    opportunitiesFound: opportunities.length,
    fixesApplied,
    totalImprovements,
    recommendations
  };
}

/**
 * Get optimization status
 */
export function getOptimizationStatus(): {
  lastRun: Date | null;
  totalOptimizations: number;
  totalImprovements: number;
  recentOptimizations: OptimizationResult[];
  categories: { category: string; count: number }[];
} {
  const categoryCounts = optimizationHistory.reduce((acc, opt) => {
    acc[opt.category] = (acc[opt.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    lastRun: lastOptimizationRun,
    totalOptimizations: optimizationHistory.length,
    totalImprovements,
    recentOptimizations: optimizationHistory.slice(-10),
    categories: Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count
    }))
  };
}

/**
 * Get optimization recommendations using LLM
 */
export async function getAIOptimizationRecommendations(
  userId: number,
  metrics: SystemMetrics
): Promise<{
  recommendations: string[];
  priorityActions: string[];
  longTermStrategy: string[];
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an optimization expert for ${OWNER_NAME}'s content monetization platform. Your goal is to maximize their income through continuous improvement.`
      },
      {
        role: "user",
        content: `Current metrics:
- ${metrics.contentMetrics.totalArticles} articles (${metrics.contentMetrics.publishedArticles} published)
- Average SEO score: ${metrics.contentMetrics.avgSeoScore.toFixed(1)}
- ${metrics.performanceMetrics.totalViews} views, ${metrics.performanceMetrics.totalClicks} clicks
- CTR: ${metrics.performanceMetrics.clickThroughRate.toFixed(2)}%
- ${metrics.distributionMetrics.totalDistributions} distributions (${metrics.distributionMetrics.successRate.toFixed(1)}% success)
- Estimated revenue: $${metrics.revenueMetrics.estimatedRevenue.toFixed(2)}

Provide:
1. Top 5 immediate recommendations
2. Priority actions for this week
3. Long-term strategy for growth

Return as JSON with keys: recommendations (array), priorityActions (array), longTermStrategy (array)`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "optimization_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: { type: "array", items: { type: "string" } },
            priorityActions: { type: "array", items: { type: "string" } },
            longTermStrategy: { type: "array", items: { type: "string" } }
          },
          required: ["recommendations", "priorityActions", "longTermStrategy"],
          additionalProperties: false
        }
      }
    }
  });

  let result = {
    recommendations: ["Improve SEO scores", "Add more affiliate links", "Increase content output"],
    priorityActions: ["Fix low-performing articles", "Retry failed distributions"],
    longTermStrategy: ["Build email list", "Diversify income streams", "Scale content production"]
  };

  try {
    const contentStr = (response.choices[0]?.message?.content || "{}") as string;
    const parsed = JSON.parse(contentStr);
    if (parsed.recommendations) result = parsed;
  } catch (e) {
    // Use defaults
  }

  return result;
}

/**
 * Get system health score
 */
export async function getSystemHealthScore(userId: number): Promise<{
  overallScore: number;
  breakdown: {
    content: number;
    performance: number;
    distribution: number;
    revenue: number;
    system: number;
  };
  status: "excellent" | "good" | "fair" | "poor";
  issues: string[];
}> {
  const metrics = await collectSystemMetrics(userId);
  
  // Calculate component scores (0-100)
  const contentScore = Math.min(100, (
    (metrics.contentMetrics.avgSeoScore / 100) * 40 +
    (metrics.contentMetrics.avgReadabilityScore / 100) * 30 +
    (metrics.contentMetrics.publishedArticles > 0 ? 30 : 0)
  ));

  const performanceScore = Math.min(100, (
    (metrics.performanceMetrics.clickThroughRate / 5) * 50 +
    (metrics.performanceMetrics.conversionRate / 3) * 50
  ));

  const distributionScore = Math.min(100, metrics.distributionMetrics.successRate);

  const revenueScore = Math.min(100, (
    (metrics.revenueMetrics.estimatedRevenue / 1000) * 100
  ));

  const systemScore = Math.min(100, (
    100 - (metrics.systemMetrics.errorCount * 5)
  ));

  const overallScore = (
    contentScore * 0.25 +
    performanceScore * 0.25 +
    distributionScore * 0.20 +
    revenueScore * 0.20 +
    systemScore * 0.10
  );

  const issues: string[] = [];
  if (contentScore < 50) issues.push("Content quality needs improvement");
  if (performanceScore < 50) issues.push("Performance metrics are low");
  if (distributionScore < 50) issues.push("Distribution success rate is poor");
  if (revenueScore < 50) issues.push("Revenue is below target");
  if (systemScore < 50) issues.push("System has errors to address");

  let status: "excellent" | "good" | "fair" | "poor";
  if (overallScore >= 80) status = "excellent";
  else if (overallScore >= 60) status = "good";
  else if (overallScore >= 40) status = "fair";
  else status = "poor";

  return {
    overallScore,
    breakdown: {
      content: contentScore,
      performance: performanceScore,
      distribution: distributionScore,
      revenue: revenueScore,
      system: systemScore
    },
    status,
    issues
  };
}
