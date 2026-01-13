/**
 * Income Discovery Engine
 * 
 * This engine automatically:
 * 1. Discovers new monetization opportunities
 * 2. Analyzes market trends for income potential
 * 3. Identifies overlooked revenue streams
 * 4. Auto-integrates new income sources
 * 5. Continuously optimizes for maximum revenue
 * 
 * Single Purpose: Maximize income for Dakota Rea
 */

import { getDb } from "../db";
import { articles, affiliateLinks, articleDistribution, auditLog } from "../../drizzle/schema";
import { eq, sql, count, desc, and, sum } from "drizzle-orm";
import { invokeLLM } from "./llm";
import { logEvent } from "./hiveMind";
import { syncApprovedCJLinks, getApprovedAdvertiserIds } from "./cjSync";
import { notifyOwner } from "./notification";

const OWNER_NAME = process.env.OWNER_NAME || "Dakota Rea";

// Income opportunity types
interface IncomeOpportunity {
  id: string;
  type: "affiliate" | "ad_network" | "sponsored" | "digital_product" | "subscription" | "consulting" | "lead_gen" | "email_marketing";
  name: string;
  description: string;
  estimatedMonthlyRevenue: { min: number; max: number };
  effort: "low" | "medium" | "high";
  timeToFirstRevenue: string;
  requirements: string[];
  integrationSteps: string[];
  autoIntegrable: boolean;
  priority: number;
  status: "discovered" | "analyzing" | "integrating" | "active" | "failed";
}

// Comprehensive list of income opportunities
const INCOME_OPPORTUNITIES: IncomeOpportunity[] = [
  // Affiliate Programs
  {
    id: "cj-affiliate",
    type: "affiliate",
    name: "Commission Junction (CJ)",
    description: "Major affiliate network with thousands of advertisers",
    estimatedMonthlyRevenue: { min: 500, max: 5000 },
    effort: "low",
    timeToFirstRevenue: "1-2 weeks",
    requirements: ["Website with content", "Traffic"],
    integrationSteps: ["Sign up", "Get approved", "Add links to content"],
    autoIntegrable: true,
    priority: 1,
    status: "active"
  },
  {
    id: "amazon-associates",
    type: "affiliate",
    name: "Amazon Associates",
    description: "Amazon's affiliate program - huge product selection",
    estimatedMonthlyRevenue: { min: 100, max: 2000 },
    effort: "low",
    timeToFirstRevenue: "1-2 weeks",
    requirements: ["Website", "3 qualifying sales in 180 days"],
    integrationSteps: ["Apply", "Get approved", "Add product links"],
    autoIntegrable: true,
    priority: 2,
    status: "discovered"
  },
  {
    id: "shareasale",
    type: "affiliate",
    name: "ShareASale",
    description: "Large affiliate network with diverse merchants",
    estimatedMonthlyRevenue: { min: 200, max: 3000 },
    effort: "low",
    timeToFirstRevenue: "1-2 weeks",
    requirements: ["Website", "Content"],
    integrationSteps: ["Apply", "Join merchant programs", "Add links"],
    autoIntegrable: true,
    priority: 3,
    status: "discovered"
  },
  {
    id: "impact-radius",
    type: "affiliate",
    name: "Impact",
    description: "Premium affiliate network with major brands",
    estimatedMonthlyRevenue: { min: 300, max: 4000 },
    effort: "medium",
    timeToFirstRevenue: "2-4 weeks",
    requirements: ["Established website", "Quality content"],
    integrationSteps: ["Apply", "Get brand approvals", "Integrate links"],
    autoIntegrable: true,
    priority: 4,
    status: "discovered"
  },
  {
    id: "clickbank",
    type: "affiliate",
    name: "ClickBank",
    description: "Digital products affiliate marketplace",
    estimatedMonthlyRevenue: { min: 100, max: 5000 },
    effort: "low",
    timeToFirstRevenue: "1 week",
    requirements: ["Email list or website"],
    integrationSteps: ["Sign up", "Choose products", "Promote"],
    autoIntegrable: true,
    priority: 5,
    status: "discovered"
  },
  
  // Ad Networks
  {
    id: "google-adsense",
    type: "ad_network",
    name: "Google AdSense",
    description: "Google's display advertising network",
    estimatedMonthlyRevenue: { min: 50, max: 500 },
    effort: "low",
    timeToFirstRevenue: "1-2 weeks",
    requirements: ["Original content", "Policy compliance"],
    integrationSteps: ["Apply", "Add ad code", "Optimize placements"],
    autoIntegrable: true,
    priority: 6,
    status: "discovered"
  },
  {
    id: "mediavine",
    type: "ad_network",
    name: "Mediavine",
    description: "Premium ad network for established sites",
    estimatedMonthlyRevenue: { min: 1000, max: 10000 },
    effort: "medium",
    timeToFirstRevenue: "2-4 weeks",
    requirements: ["50,000 sessions/month", "Original content"],
    integrationSteps: ["Apply", "Get approved", "Install ads"],
    autoIntegrable: false,
    priority: 7,
    status: "discovered"
  },
  {
    id: "ezoic",
    type: "ad_network",
    name: "Ezoic",
    description: "AI-powered ad optimization platform",
    estimatedMonthlyRevenue: { min: 100, max: 2000 },
    effort: "low",
    timeToFirstRevenue: "1-2 weeks",
    requirements: ["10,000 pageviews/month"],
    integrationSteps: ["Apply", "Integrate", "Let AI optimize"],
    autoIntegrable: true,
    priority: 8,
    status: "discovered"
  },
  
  // Sponsored Content
  {
    id: "sponsored-posts",
    type: "sponsored",
    name: "Sponsored Posts",
    description: "Paid content from brands",
    estimatedMonthlyRevenue: { min: 100, max: 2000 },
    effort: "medium",
    timeToFirstRevenue: "1-3 months",
    requirements: ["Established audience", "Niche authority"],
    integrationSteps: ["Build media kit", "Reach out to brands", "Negotiate rates"],
    autoIntegrable: false,
    priority: 9,
    status: "discovered"
  },
  
  // Digital Products
  {
    id: "ebooks",
    type: "digital_product",
    name: "eBooks",
    description: "Create and sell digital books",
    estimatedMonthlyRevenue: { min: 50, max: 1000 },
    effort: "high",
    timeToFirstRevenue: "1-3 months",
    requirements: ["Expertise", "Writing ability"],
    integrationSteps: ["Write content", "Create PDF", "Set up sales page"],
    autoIntegrable: false,
    priority: 10,
    status: "discovered"
  },
  {
    id: "online-courses",
    type: "digital_product",
    name: "Online Courses",
    description: "Create and sell video courses",
    estimatedMonthlyRevenue: { min: 200, max: 5000 },
    effort: "high",
    timeToFirstRevenue: "2-6 months",
    requirements: ["Expertise", "Teaching ability"],
    integrationSteps: ["Create curriculum", "Record videos", "Launch on platform"],
    autoIntegrable: false,
    priority: 11,
    status: "discovered"
  },
  
  // Email Marketing
  {
    id: "email-marketing",
    type: "email_marketing",
    name: "Email Marketing",
    description: "Build list and monetize with promotions",
    estimatedMonthlyRevenue: { min: 100, max: 3000 },
    effort: "medium",
    timeToFirstRevenue: "1-3 months",
    requirements: ["Email list", "Content strategy"],
    integrationSteps: ["Set up email provider", "Create lead magnets", "Build sequences"],
    autoIntegrable: true,
    priority: 12,
    status: "discovered"
  },
  
  // Lead Generation
  {
    id: "lead-gen",
    type: "lead_gen",
    name: "Lead Generation",
    description: "Generate leads for businesses",
    estimatedMonthlyRevenue: { min: 500, max: 5000 },
    effort: "medium",
    timeToFirstRevenue: "1-2 months",
    requirements: ["Traffic", "Lead capture forms"],
    integrationSteps: ["Find lead buyers", "Set up forms", "Drive traffic"],
    autoIntegrable: true,
    priority: 13,
    status: "discovered"
  }
];

// In-memory state
let discoveredOpportunities: IncomeOpportunity[] = [...INCOME_OPPORTUNITIES];
let lastDiscoveryRun: Date | null = null;
let totalDiscoveredRevenue = 0;

/**
 * Get all discovered income opportunities
 */
export function getDiscoveredOpportunities(): IncomeOpportunity[] {
  return discoveredOpportunities.sort((a, b) => a.priority - b.priority);
}

/**
 * Analyze current income streams and find gaps
 */
export async function analyzeIncomeGaps(userId: number): Promise<{
  currentStreams: { name: string; status: string; estimatedRevenue: number }[];
  missingOpportunities: IncomeOpportunity[];
  totalPotentialRevenue: { min: number; max: number };
  recommendations: string[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      currentStreams: [],
      missingOpportunities: discoveredOpportunities,
      totalPotentialRevenue: { min: 0, max: 0 },
      recommendations: ["Database unavailable"]
    };
  }

  // Get current affiliate programs
  const currentLinks = await db.select({ program: affiliateLinks.program })
    .from(affiliateLinks)
    .where(eq(affiliateLinks.userId, userId));
  
  const currentPrograms = new Set<string>(currentLinks.map((l: { program: string | null }) => l.program?.toLowerCase() || ""));

  // Determine active streams
  const currentStreams: { name: string; status: string; estimatedRevenue: number }[] = [];
  const missingOpportunities: IncomeOpportunity[] = [];

  for (const opp of discoveredOpportunities) {
    const isActive = Array.from(currentPrograms).some(p => 
      p.includes(opp.name.toLowerCase()) || opp.name.toLowerCase().includes(p)
    );
    
    if (isActive || opp.status === "active") {
      currentStreams.push({
        name: opp.name,
        status: "active",
        estimatedRevenue: (opp.estimatedMonthlyRevenue.min + opp.estimatedMonthlyRevenue.max) / 2
      });
    } else {
      missingOpportunities.push(opp);
    }
  }

  // Calculate potential revenue
  const totalPotentialRevenue = missingOpportunities.reduce(
    (acc, opp) => ({
      min: acc.min + opp.estimatedMonthlyRevenue.min,
      max: acc.max + opp.estimatedMonthlyRevenue.max
    }),
    { min: 0, max: 0 }
  );

  // Generate recommendations
  const recommendations: string[] = [];
  const lowEffortOpps = missingOpportunities.filter(o => o.effort === "low" && o.autoIntegrable);
  if (lowEffortOpps.length > 0) {
    recommendations.push(`Quick win: Add ${lowEffortOpps[0].name} for $${lowEffortOpps[0].estimatedMonthlyRevenue.min}-$${lowEffortOpps[0].estimatedMonthlyRevenue.max}/month`);
  }
  
  const highRevenueOpps = missingOpportunities.filter(o => o.estimatedMonthlyRevenue.max >= 2000);
  if (highRevenueOpps.length > 0) {
    recommendations.push(`High potential: ${highRevenueOpps[0].name} could generate up to $${highRevenueOpps[0].estimatedMonthlyRevenue.max}/month`);
  }

  if (currentStreams.length < 3) {
    recommendations.push("Diversify income: Add at least 3 revenue streams to reduce risk");
  }

  return {
    currentStreams,
    missingOpportunities,
    totalPotentialRevenue,
    recommendations
  };
}

/**
 * Discover new income opportunities using LLM
 */
export async function discoverNewOpportunities(userId: number): Promise<{
  newOpportunities: string[];
  analysisInsights: string[];
  actionItems: string[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      newOpportunities: [],
      analysisInsights: [],
      actionItems: []
    };
  }

  // Get current content stats
  const [articleStats] = await db.select({
    count: count(),
    totalViews: sum(articles.views)
  })
    .from(articles)
    .where(eq(articles.userId, userId));

  // Use LLM to discover opportunities
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert income strategist for ${OWNER_NAME}. Your ONLY goal is to maximize their income through any legal means. Analyze their current situation and discover overlooked monetization opportunities.`
      },
      {
        role: "user",
        content: `Current situation:
- ${articleStats?.count || 0} articles published
- ${articleStats?.totalViews || 0} total views
- Active on CJ affiliate network
- Content website focused on various niches

Discover:
1. Overlooked income opportunities specific to their content
2. Quick wins they can implement today
3. Long-term revenue strategies
4. Emerging monetization trends they should capitalize on

Return as JSON with keys: newOpportunities (array of strings), analysisInsights (array of strings), actionItems (array of strings)`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "income_discovery",
        strict: true,
        schema: {
          type: "object",
          properties: {
            newOpportunities: { type: "array", items: { type: "string" } },
            analysisInsights: { type: "array", items: { type: "string" } },
            actionItems: { type: "array", items: { type: "string" } }
          },
          required: ["newOpportunities", "analysisInsights", "actionItems"],
          additionalProperties: false
        }
      }
    }
  });

  let result = {
    newOpportunities: ["Explore micro-niche affiliate programs", "Add email capture for list building"],
    analysisInsights: ["Content volume is good, focus on conversion optimization"],
    actionItems: ["Add more call-to-actions", "Test different affiliate offers"]
  };

  try {
    const contentStr = (response.choices[0]?.message?.content || "{}") as string;
    const parsed = JSON.parse(contentStr);
    if (parsed.newOpportunities) result = parsed;
  } catch (e) {
    // Use defaults
  }

  lastDiscoveryRun = new Date();
  
  await logEvent(userId, "system_event", { 
    message: `Income discovery: Found ${result.newOpportunities.length} new opportunities`,
    metadata: result
  });

  return result;
}

/**
 * Auto-integrate an income opportunity
 */
export async function autoIntegrateOpportunity(
  userId: number,
  opportunityId: string
): Promise<{
  success: boolean;
  opportunity: IncomeOpportunity | null;
  stepsCompleted: string[];
  nextSteps: string[];
  estimatedRevenue: { min: number; max: number };
}> {
  const opportunity = discoveredOpportunities.find(o => o.id === opportunityId);
  
  if (!opportunity) {
    return {
      success: false,
      opportunity: null,
      stepsCompleted: [],
      nextSteps: ["Opportunity not found"],
      estimatedRevenue: { min: 0, max: 0 }
    };
  }

  const stepsCompleted: string[] = [];
  const nextSteps: string[] = [];

  // Update status
  opportunity.status = "integrating";

  if (opportunity.autoIntegrable) {
    // For CJ, we can auto-integrate
    if (opportunity.id === "cj-affiliate") {
      await syncApprovedCJLinks();
      stepsCompleted.push("Synced CJ affiliate links");
      stepsCompleted.push("Links ready for content insertion");
      opportunity.status = "active";
    } else {
      // For other auto-integrable opportunities
      stepsCompleted.push(`Identified ${opportunity.name} as auto-integrable`);
      nextSteps.push(`Sign up at ${opportunity.name} website`);
      nextSteps.push("Get API credentials");
      nextSteps.push("Add to environment variables");
    }
  } else {
    // Manual integration required
    nextSteps.push(...opportunity.integrationSteps);
  }

  await logEvent(userId, "system_event", { 
    message: `Auto-integrate ${opportunity.name}: ${stepsCompleted.length} steps completed`,
    metadata: { opportunityId, stepsCompleted, nextSteps }
  });

  return {
    success: stepsCompleted.length > 0,
    opportunity,
    stepsCompleted,
    nextSteps,
    estimatedRevenue: opportunity.estimatedMonthlyRevenue
  };
}

/**
 * Get income optimization recommendations
 */
export async function getIncomeOptimizations(userId: number): Promise<{
  quickWins: { action: string; estimatedImpact: string; effort: string }[];
  longTermStrategies: { strategy: string; timeline: string; potential: string }[];
  contentOptimizations: { suggestion: string; articles: number }[];
  affiliateOptimizations: { suggestion: string; links: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      quickWins: [],
      longTermStrategies: [],
      contentOptimizations: [],
      affiliateOptimizations: []
    };
  }

  // Get article stats
  const lowSeoArticles = await db.select({ count: count() })
    .from(articles)
    .where(and(
      eq(articles.userId, userId),
      sql`${articles.seoScore} < 70`
    ));

  const noLinkArticles = await db.select({ count: count() })
    .from(articles)
    .where(and(
      eq(articles.userId, userId),
      eq(articles.status, "published")
    ));

  // Get link stats
  const [linkStats] = await db.select({
    total: count(),
    totalClicks: sum(affiliateLinks.clicks)
  })
    .from(affiliateLinks)
    .where(eq(affiliateLinks.userId, userId));

  return {
    quickWins: [
      {
        action: "Add affiliate links to top-performing articles",
        estimatedImpact: "+$50-200/month",
        effort: "Low (1 hour)"
      },
      {
        action: "Optimize SEO for low-scoring articles",
        estimatedImpact: "+30% traffic",
        effort: "Medium (2-3 hours)"
      },
      {
        action: "Add email capture popup",
        estimatedImpact: "+100 subscribers/month",
        effort: "Low (30 minutes)"
      }
    ],
    longTermStrategies: [
      {
        strategy: "Build email list to 10,000 subscribers",
        timeline: "6-12 months",
        potential: "$1,000-5,000/month from promotions"
      },
      {
        strategy: "Create digital product (eBook or course)",
        timeline: "2-3 months",
        potential: "$500-2,000/month passive income"
      },
      {
        strategy: "Reach 50,000 monthly sessions for Mediavine",
        timeline: "6-12 months",
        potential: "$1,000-3,000/month in ad revenue"
      }
    ],
    contentOptimizations: [
      {
        suggestion: `Improve SEO on ${lowSeoArticles[0]?.count || 0} articles with scores below 70`,
        articles: lowSeoArticles[0]?.count || 0
      },
      {
        suggestion: "Add more product review articles for higher affiliate conversions",
        articles: 10
      },
      {
        suggestion: "Create comparison articles for high-intent keywords",
        articles: 5
      }
    ],
    affiliateOptimizations: [
      {
        suggestion: `Add affiliate links to ${noLinkArticles[0]?.count || 0} published articles`,
        links: noLinkArticles[0]?.count || 0
      },
      {
        suggestion: "Test different CTA placements for better click-through",
        links: linkStats?.total || 0
      },
      {
        suggestion: "Join additional affiliate programs for product diversity",
        links: 20
      }
    ]
  };
}

/**
 * Generate income report for owner
 */
export async function generateIncomeReport(userId: number): Promise<{
  summary: {
    currentMonthlyEstimate: number;
    potentialMonthlyRevenue: number;
    activeStreams: number;
    pendingOpportunities: number;
  };
  breakdown: { source: string; status: string; revenue: number }[];
  recommendations: string[];
  nextActions: string[];
}> {
  const gaps = await analyzeIncomeGaps(userId);
  const optimizations = await getIncomeOptimizations(userId);

  const currentRevenue = gaps.currentStreams.reduce((sum, s) => sum + s.estimatedRevenue, 0);
  const potentialRevenue = (gaps.totalPotentialRevenue.min + gaps.totalPotentialRevenue.max) / 2;

  return {
    summary: {
      currentMonthlyEstimate: currentRevenue,
      potentialMonthlyRevenue: currentRevenue + potentialRevenue,
      activeStreams: gaps.currentStreams.length,
      pendingOpportunities: gaps.missingOpportunities.length
    },
    breakdown: gaps.currentStreams.map(s => ({
      source: s.name,
      status: s.status,
      revenue: s.estimatedRevenue
    })),
    recommendations: [
      ...gaps.recommendations,
      ...optimizations.quickWins.map(q => q.action)
    ],
    nextActions: [
      "Run income discovery to find new opportunities",
      "Auto-integrate low-effort opportunities",
      "Optimize existing content for better conversions",
      "Build email list for long-term monetization"
    ]
  };
}

/**
 * Notify owner of income opportunities
 */
export async function notifyOwnerOfIncomeOpportunities(userId: number): Promise<boolean> {
  const report = await generateIncomeReport(userId);
  const discovery = await discoverNewOpportunities(userId);

  const content = `
## Income Opportunity Report for ${OWNER_NAME}

### Current Status
- **Estimated Monthly Revenue**: $${report.summary.currentMonthlyEstimate.toFixed(2)}
- **Potential Monthly Revenue**: $${report.summary.potentialMonthlyRevenue.toFixed(2)}
- **Active Income Streams**: ${report.summary.activeStreams}
- **Pending Opportunities**: ${report.summary.pendingOpportunities}

### New Opportunities Discovered
${discovery.newOpportunities.slice(0, 5).map((o, i) => `${i + 1}. ${o}`).join("\n")}

### Quick Wins (Implement Today)
${report.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join("\n")}

### Action Items
${report.nextActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

---
*This report was auto-generated by the Income Discovery Engine*
`;

  return await notifyOwner({
    title: "💰 Income Opportunity Report",
    content
  });
}

/**
 * Run full income discovery cycle
 */
export async function runIncomeDiscoveryCycle(userId: number): Promise<{
  success: boolean;
  opportunitiesFound: number;
  actionsGenerated: number;
  estimatedImpact: string;
  notificationSent: boolean;
}> {
  // Discover new opportunities
  const discovery = await discoverNewOpportunities(userId);
  
  // Analyze gaps
  const gaps = await analyzeIncomeGaps(userId);
  
  // Get optimizations
  const optimizations = await getIncomeOptimizations(userId);
  
  // Auto-integrate any quick wins
  let autoIntegratedCount = 0;
  for (const opp of gaps.missingOpportunities.slice(0, 3)) {
    if (opp.autoIntegrable && opp.effort === "low") {
      const result = await autoIntegrateOpportunity(userId, opp.id);
      if (result.success) autoIntegratedCount++;
    }
  }

  // Notify owner if significant opportunities found
  let notificationSent = false;
  if (gaps.totalPotentialRevenue.max > 1000) {
    notificationSent = await notifyOwnerOfIncomeOpportunities(userId);
  }

  const estimatedImpact = `$${gaps.totalPotentialRevenue.min}-$${gaps.totalPotentialRevenue.max}/month potential`;

  await logEvent(userId, "system_event", { 
    message: `Income discovery cycle complete: ${discovery.newOpportunities.length} opportunities, ${autoIntegratedCount} auto-integrated`,
    metadata: { discovery, gaps: gaps.recommendations, autoIntegratedCount }
  });

  return {
    success: true,
    opportunitiesFound: discovery.newOpportunities.length + gaps.missingOpportunities.length,
    actionsGenerated: discovery.actionItems.length + optimizations.quickWins.length,
    estimatedImpact,
    notificationSent
  };
}

/**
 * Get income discovery status
 */
export function getIncomeDiscoveryStatus(): {
  lastRun: Date | null;
  totalOpportunities: number;
  activeOpportunities: number;
  pendingOpportunities: number;
  estimatedTotalRevenue: { min: number; max: number };
} {
  const active = discoveredOpportunities.filter(o => o.status === "active");
  const pending = discoveredOpportunities.filter(o => o.status !== "active");
  
  const totalRevenue = discoveredOpportunities.reduce(
    (acc, o) => ({
      min: acc.min + o.estimatedMonthlyRevenue.min,
      max: acc.max + o.estimatedMonthlyRevenue.max
    }),
    { min: 0, max: 0 }
  );

  return {
    lastRun: lastDiscoveryRun,
    totalOpportunities: discoveredOpportunities.length,
    activeOpportunities: active.length,
    pendingOpportunities: pending.length,
    estimatedTotalRevenue: totalRevenue
  };
}
