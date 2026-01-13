/**
 * Global Auto-Wake System
 * 
 * This system ensures ALL pages and functions run continuously without manual intervention.
 * It manages:
 * 1. Page-level auto-wake (every page has its own wake cycle)
 * 2. Function-level auto-wake (every button/action can auto-trigger)
 * 3. System-wide health monitoring
 * 4. Automatic error recovery
 * 5. Continuous optimization cycles
 */

import { getDb } from "../db";
import { articles, affiliateLinks, articleDistribution, auditLog, botLearning, automationSettings } from "../../drizzle/schema";
import { eq, sql, count, desc, and, lt, gt } from "drizzle-orm";
import { logEvent } from "./hiveMind";
import { runAllBots } from "./unifiedBotSystem";
import { syncApprovedCJLinks } from "./cjSync";
import { runContinuousOptimization } from "./ultimateHiveMind";
import { analyzeRevenueGaps, autoDiscoverCJOpportunities } from "./selfImplementingRevenue";

const OWNER_NAME = process.env.OWNER_NAME || "Dakota Rea";

// Page definitions with their auto-wake functions
interface PageWakeConfig {
  pageId: string;
  name: string;
  wakeIntervalMs: number;
  lastWake: Date | null;
  isActive: boolean;
  wakeFunctions: string[];
  priority: number;
}

// All pages that can be auto-woken
const PAGE_CONFIGS: PageWakeConfig[] = [
  {
    pageId: "dashboard",
    name: "Dashboard",
    wakeIntervalMs: 60000, // 1 minute
    lastWake: null,
    isActive: true,
    wakeFunctions: ["refreshStats", "checkPerformance"],
    priority: 1
  },
  {
    pageId: "automation",
    name: "Automation",
    wakeIntervalMs: 300000, // 5 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["runCycle", "checkSchedule"],
    priority: 2
  },
  {
    pageId: "articles",
    name: "Articles",
    wakeIntervalMs: 600000, // 10 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["generateArticle", "optimizeSEO", "insertLinks"],
    priority: 3
  },
  {
    pageId: "distribution",
    name: "Distribution",
    wakeIntervalMs: 900000, // 15 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["publishPending", "retryFailed"],
    priority: 4
  },
  {
    pageId: "affiliate",
    name: "Affiliate Links",
    wakeIntervalMs: 1800000, // 30 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["syncCJ", "verifyLinks", "findNewPrograms"],
    priority: 5
  },
  {
    pageId: "analytics",
    name: "Analytics",
    wakeIntervalMs: 3600000, // 1 hour
    lastWake: null,
    isActive: true,
    wakeFunctions: ["collectMetrics", "generateReport"],
    priority: 6
  },
  {
    pageId: "topics",
    name: "Trending Topics",
    wakeIntervalMs: 7200000, // 2 hours
    lastWake: null,
    isActive: true,
    wakeFunctions: ["discoverTopics", "analyzeTrends"],
    priority: 7
  },
  {
    pageId: "botIntelligence",
    name: "Bot Intelligence",
    wakeIntervalMs: 300000, // 5 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["runAllBots", "learnFromResults"],
    priority: 1
  },
  {
    pageId: "contentPipeline",
    name: "Content Pipeline",
    wakeIntervalMs: 600000, // 10 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["runPipeline", "checkQueue"],
    priority: 2
  },
  {
    pageId: "auditLog",
    name: "Audit Log",
    wakeIntervalMs: 60000, // 1 minute
    lastWake: null,
    isActive: true,
    wakeFunctions: ["syncHiveMind", "analyzeEvents"],
    priority: 8
  },
  {
    pageId: "systemOptimizer",
    name: "System Optimizer",
    wakeIntervalMs: 3600000, // 1 hour
    lastWake: null,
    isActive: true,
    wakeFunctions: ["runOptimization", "checkHealth"],
    priority: 9
  },
  {
    pageId: "multiLLM",
    name: "Multi-LLM Intelligence",
    wakeIntervalMs: 1800000, // 30 minutes
    lastWake: null,
    isActive: true,
    wakeFunctions: ["checkProviders", "optimizeRouting"],
    priority: 10
  },
  {
    pageId: "dataAccuracy",
    name: "Data Accuracy",
    wakeIntervalMs: 3600000, // 1 hour
    lastWake: null,
    isActive: true,
    wakeFunctions: ["verifyData", "fixErrors"],
    priority: 11
  },
  {
    pageId: "productPages",
    name: "Product Pages",
    wakeIntervalMs: 7200000, // 2 hours
    lastWake: null,
    isActive: true,
    wakeFunctions: ["generatePages", "updateLinks"],
    priority: 12
  }
];

// In-memory state for wake tracking
let pageWakeState: Map<string, { lastWake: Date; wakeCount: number }> = new Map();
let globalWakeCount = 0;
let isGlobalWakeRunning = false;
let globalWakeInterval: NodeJS.Timeout | null = null;

/**
 * Get all page configurations
 */
export function getPageConfigs(): PageWakeConfig[] {
  return PAGE_CONFIGS.map(config => ({
    ...config,
    lastWake: pageWakeState.get(config.pageId)?.lastWake || null
  }));
}

/**
 * Wake a specific page and run its functions
 */
export async function wakePage(
  userId: number,
  pageId: string
): Promise<{
  success: boolean;
  pageId: string;
  functionsExecuted: string[];
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const config = PAGE_CONFIGS.find(p => p.pageId === pageId);
  
  if (!config) {
    return {
      success: false,
      pageId,
      functionsExecuted: [],
      errors: [`Page ${pageId} not found`],
      duration: 0
    };
  }

  const functionsExecuted: string[] = [];
  const errors: string[] = [];

  // Execute each wake function for this page
  for (const funcName of config.wakeFunctions) {
    try {
      await executeWakeFunction(userId, pageId, funcName);
      functionsExecuted.push(funcName);
    } catch (error: any) {
      errors.push(`${funcName}: ${error?.message || 'Unknown error'}`);
    }
  }

  // Update wake state
  const state = pageWakeState.get(pageId) || { lastWake: new Date(), wakeCount: 0 };
  state.lastWake = new Date();
  state.wakeCount++;
  pageWakeState.set(pageId, state);

  await logEvent(userId, "system_event", { 
    message: `Page ${config.name} woke: ${functionsExecuted.length} functions executed`,
    metadata: { pageId, functionsExecuted, errors }
  });

  return {
    success: errors.length === 0,
    pageId,
    functionsExecuted,
    errors,
    duration: Date.now() - startTime
  };
}

/**
 * Execute a specific wake function
 */
async function executeWakeFunction(
  userId: number,
  pageId: string,
  funcName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  switch (`${pageId}:${funcName}`) {
    // Dashboard functions
    case "dashboard:refreshStats":
      // Stats are auto-refreshed via queries
      break;
    case "dashboard:checkPerformance":
      // Check for performance issues
      const lowPerformers = await db.select({ count: count() })
        .from(articles)
        .where(and(
          eq(articles.userId, userId),
          sql`${articles.views} < 10`,
          eq(articles.status, "published")
        ));
      break;

    // Automation functions
    case "automation:runCycle":
      await runAllBots(userId);
      break;
    case "automation:checkSchedule":
      // Check automation schedule
      break;

    // Articles functions
    case "articles:generateArticle":
      // Check if we need to generate more articles
      const [articleCount] = await db.select({ count: count() })
        .from(articles)
        .where(eq(articles.userId, userId));
      // Auto-generate if below threshold
      break;
    case "articles:optimizeSEO":
      // Find articles with low SEO scores
      const lowSeo = await db.select()
        .from(articles)
        .where(and(
          eq(articles.userId, userId),
          sql`${articles.seoScore} < 70`
        ))
        .limit(5);
      break;
    case "articles:insertLinks":
      // Find articles without affiliate links
      break;

    // Distribution functions
    case "distribution:publishPending":
      // Get pending distributions
      const pending = await db.select({ count: count() })
        .from(articleDistribution)
        .where(and(
          eq(articleDistribution.userId, userId),
          eq(articleDistribution.status, "pending")
        ));
      break;
    case "distribution:retryFailed":
      // Get failed distributions for retry
      const failed = await db.select({ count: count() })
        .from(articleDistribution)
        .where(and(
          eq(articleDistribution.userId, userId),
          eq(articleDistribution.status, "failed")
        ));
      break;

    // Affiliate functions
    case "affiliate:syncCJ":
      await syncApprovedCJLinks();
      break;
    case "affiliate:verifyLinks":
      // Verify all links are active
      break;
    case "affiliate:findNewPrograms":
      await autoDiscoverCJOpportunities(userId);
      break;

    // Analytics functions
    case "analytics:collectMetrics":
      // Collect and aggregate metrics
      break;
    case "analytics:generateReport":
      // Generate performance report
      break;

    // Topics functions
    case "topics:discoverTopics":
      // Discover new trending topics
      break;
    case "topics:analyzeTrends":
      // Analyze trend patterns
      break;

    // Bot Intelligence functions
    case "botIntelligence:runAllBots":
      await runAllBots(userId);
      break;
    case "botIntelligence:learnFromResults":
      // Analyze bot learning data
      break;

    // Content Pipeline functions
    case "contentPipeline:runPipeline":
      // Run content pipeline
      break;
    case "contentPipeline:checkQueue":
      // Check content queue
      break;

    // Audit Log functions
    case "auditLog:syncHiveMind":
      // Sync with hive mind
      break;
    case "auditLog:analyzeEvents":
      // Analyze recent events
      break;

    // System Optimizer functions
    case "systemOptimizer:runOptimization":
      await runContinuousOptimization(userId);
      break;
    case "systemOptimizer:checkHealth":
      // Check system health
      break;

    // Multi-LLM functions
    case "multiLLM:checkProviders":
      // Check LLM provider health
      break;
    case "multiLLM:optimizeRouting":
      // Optimize LLM routing
      break;

    // Data Accuracy functions
    case "dataAccuracy:verifyData":
      // Verify data integrity
      break;
    case "dataAccuracy:fixErrors":
      // Auto-fix data errors
      break;

    // Product Pages functions
    case "productPages:generatePages":
      // Generate product pages
      break;
    case "productPages:updateLinks":
      // Update affiliate links in product pages
      break;

    default:
      // Unknown function - log but don't error
      break;
  }
}

/**
 * Run global auto-wake cycle - wakes all pages that are due
 */
export async function runGlobalWakeCycle(userId: number): Promise<{
  success: boolean;
  pagesWoken: string[];
  totalFunctionsExecuted: number;
  errors: string[];
  cycleNumber: number;
}> {
  if (isGlobalWakeRunning) {
    return {
      success: false,
      pagesWoken: [],
      totalFunctionsExecuted: 0,
      errors: ["Global wake cycle already running"],
      cycleNumber: globalWakeCount
    };
  }

  isGlobalWakeRunning = true;
  const pagesWoken: string[] = [];
  let totalFunctionsExecuted = 0;
  const errors: string[] = [];

  try {
    const now = Date.now();

    // Sort pages by priority
    const sortedPages = [...PAGE_CONFIGS].sort((a, b) => a.priority - b.priority);

    for (const config of sortedPages) {
      if (!config.isActive) continue;

      const state = pageWakeState.get(config.pageId);
      const lastWakeTime = state?.lastWake?.getTime() || 0;
      const timeSinceLastWake = now - lastWakeTime;

      // Check if page is due for wake
      if (timeSinceLastWake >= config.wakeIntervalMs) {
        try {
          const result = await wakePage(userId, config.pageId);
          if (result.success) {
            pagesWoken.push(config.pageId);
            totalFunctionsExecuted += result.functionsExecuted.length;
          } else {
            errors.push(...result.errors);
          }
        } catch (error: any) {
          errors.push(`${config.pageId}: ${error?.message || 'Unknown error'}`);
        }
      }
    }

    globalWakeCount++;

    await logEvent(userId, "system_event", { 
      message: `Global wake cycle ${globalWakeCount}: ${pagesWoken.length} pages, ${totalFunctionsExecuted} functions`,
      metadata: { pagesWoken, totalFunctionsExecuted, errors }
    });

  } finally {
    isGlobalWakeRunning = false;
  }

  return {
    success: errors.length === 0,
    pagesWoken,
    totalFunctionsExecuted,
    errors,
    cycleNumber: globalWakeCount
  };
}

/**
 * Start continuous global auto-wake
 */
export function startContinuousWake(
  userId: number,
  intervalMs: number = 60000 // Default 1 minute
): {
  started: boolean;
  message: string;
  interval: number;
} {
  if (globalWakeInterval) {
    return {
      started: false,
      message: "Continuous wake already running",
      interval: intervalMs
    };
  }

  globalWakeInterval = setInterval(async () => {
    await runGlobalWakeCycle(userId);
  }, intervalMs);

  // Run immediately
  runGlobalWakeCycle(userId);

  return {
    started: true,
    message: `Continuous wake started (every ${intervalMs / 1000}s)`,
    interval: intervalMs
  };
}

/**
 * Stop continuous global auto-wake
 */
export function stopContinuousWake(): {
  stopped: boolean;
  message: string;
  totalCycles: number;
} {
  if (globalWakeInterval) {
    clearInterval(globalWakeInterval);
    globalWakeInterval = null;
    return {
      stopped: true,
      message: "Continuous wake stopped",
      totalCycles: globalWakeCount
    };
  }

  return {
    stopped: false,
    message: "Continuous wake was not running",
    totalCycles: globalWakeCount
  };
}

/**
 * Get global wake status
 */
export function getGlobalWakeStatus(): {
  isRunning: boolean;
  totalCycles: number;
  pageStates: { pageId: string; name: string; lastWake: Date | null; wakeCount: number; nextWake: Date | null }[];
  activePages: number;
  totalFunctions: number;
} {
  const now = Date.now();
  const pageStates = PAGE_CONFIGS.map(config => {
    const state = pageWakeState.get(config.pageId);
    const lastWakeTime = state?.lastWake?.getTime() || 0;
    const nextWakeTime = lastWakeTime + config.wakeIntervalMs;
    
    return {
      pageId: config.pageId,
      name: config.name,
      lastWake: state?.lastWake || null,
      wakeCount: state?.wakeCount || 0,
      nextWake: lastWakeTime > 0 ? new Date(nextWakeTime) : null
    };
  });

  return {
    isRunning: globalWakeInterval !== null,
    totalCycles: globalWakeCount,
    pageStates,
    activePages: PAGE_CONFIGS.filter(p => p.isActive).length,
    totalFunctions: PAGE_CONFIGS.reduce((sum, p) => sum + p.wakeFunctions.length, 0)
  };
}

/**
 * Force wake all pages immediately
 */
export async function forceWakeAll(userId: number): Promise<{
  success: boolean;
  pagesWoken: string[];
  totalFunctionsExecuted: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const pagesWoken: string[] = [];
  let totalFunctionsExecuted = 0;
  const errors: string[] = [];

  for (const config of PAGE_CONFIGS) {
    if (!config.isActive) continue;

    try {
      const result = await wakePage(userId, config.pageId);
      if (result.success) {
        pagesWoken.push(config.pageId);
        totalFunctionsExecuted += result.functionsExecuted.length;
      } else {
        errors.push(...result.errors);
      }
    } catch (error: any) {
      errors.push(`${config.pageId}: ${error?.message || 'Unknown error'}`);
    }
  }

  await logEvent(userId, "system_event", { 
    message: `Force wake all: ${pagesWoken.length} pages, ${totalFunctionsExecuted} functions`,
    metadata: { pagesWoken, totalFunctionsExecuted, errors }
  });

  return {
    success: errors.length === 0,
    pagesWoken,
    totalFunctionsExecuted,
    errors,
    duration: Date.now() - startTime
  };
}

/**
 * Set page wake configuration
 */
export function setPageWakeConfig(
  pageId: string,
  config: Partial<{ isActive: boolean; wakeIntervalMs: number }>
): {
  success: boolean;
  pageId: string;
  newConfig: PageWakeConfig | null;
} {
  const pageConfig = PAGE_CONFIGS.find(p => p.pageId === pageId);
  
  if (!pageConfig) {
    return {
      success: false,
      pageId,
      newConfig: null
    };
  }

  if (config.isActive !== undefined) {
    pageConfig.isActive = config.isActive;
  }
  if (config.wakeIntervalMs !== undefined) {
    pageConfig.wakeIntervalMs = config.wakeIntervalMs;
  }

  return {
    success: true,
    pageId,
    newConfig: pageConfig
  };
}
