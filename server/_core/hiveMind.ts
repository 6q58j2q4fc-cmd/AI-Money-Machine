/**
 * Hive Mind - Central Bot Intelligence System
 * 
 * This service acts as the central coordinator for all LLM communications,
 * maintaining shared memory, logging all events, and ensuring all pages
 * communicate harmoniously with the AI systems.
 */

import { invokeMultiLLM, LLMTaskType } from './multiLlm';
import { getDb } from '../db';
import { auditLog, articles, affiliateLinks, articleDistribution } from '../../drizzle/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

// Hive Mind Memory Store - persists across requests
interface HiveMemory {
  pageContexts: Map<string, PageContext>;
  llmConversations: Map<string, ConversationHistory>;
  systemObjectives: SystemObjective[];
  performanceMetrics: PerformanceMetrics;
  lastUpdated: Date;
}

interface PageContext {
  pageName: string;
  purpose: string;
  dataSchema: string;
  currentState: any;
  llmInstructions: string;
  lastAccessed: Date;
  interactionCount: number;
}

interface ConversationHistory {
  pageId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  insights: string[];
}

interface SystemObjective {
  id: string;
  objective: string;
  priority: number;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  assignedPages: string[];
}

interface PerformanceMetrics {
  totalArticles: number;
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  topPerformingTopics: string[];
  underperformingAreas: string[];
}

// Global Hive Mind instance
let hiveMemory: HiveMemory = {
  pageContexts: new Map(),
  llmConversations: new Map(),
  systemObjectives: [],
  performanceMetrics: {
    totalArticles: 0,
    totalViews: 0,
    totalClicks: 0,
    conversionRate: 0,
    topPerformingTopics: [],
    underperformingAreas: [],
  },
  lastUpdated: new Date(),
};

// Page definitions with their purposes and LLM instructions
const PAGE_DEFINITIONS: Record<string, Omit<PageContext, 'currentState' | 'lastAccessed' | 'interactionCount'>> = {
  dashboard: {
    pageName: 'Dashboard',
    purpose: 'Overview of content performance, revenue, and system health',
    dataSchema: 'articles, views, clicks, revenue, top performers',
    llmInstructions: 'Analyze performance metrics and suggest optimizations for revenue growth',
  },
  articles: {
    pageName: 'Articles',
    purpose: 'Manage and optimize article content for SEO and affiliate conversions',
    dataSchema: 'title, content, seoScore, keywords, affiliateLinks, views, clicks',
    llmInstructions: 'Optimize article titles, content, and affiliate link placement for maximum conversions',
  },
  distribution: {
    pageName: 'Distribution',
    purpose: 'Publish articles to external platforms for backlinks and traffic',
    dataSchema: 'platforms, status, externalUrls, backlinks, referralTraffic',
    llmInstructions: 'Prioritize high-traffic platforms and optimize posting schedules',
  },
  affiliateLinks: {
    pageName: 'Affiliate Links',
    purpose: 'Manage CJ affiliate links and track performance',
    dataSchema: 'advertiser, link, clicks, conversions, epc, category',
    llmInstructions: 'Identify high-performing links and suggest new affiliate opportunities',
  },
  contentPipeline: {
    pageName: 'Content Pipeline',
    purpose: 'Automated content generation with LLM-powered article creation',
    dataSchema: 'topics, niches, articleCount, affiliateDensity, publishSettings',
    llmInstructions: 'Generate trending topics and create SEO-optimized content with strategic affiliate placement',
  },
  automation: {
    pageName: 'Automation',
    purpose: 'Configure and monitor automated content cycles',
    dataSchema: 'schedules, triggers, cycleHistory, successRate',
    llmInstructions: 'Optimize automation schedules based on performance data',
  },
  cjIntegration: {
    pageName: 'CJ Integration',
    purpose: 'Manage Commission Junction affiliate partnerships',
    dataSchema: 'advertisers, links, approvalStatus, epc, categories',
    llmInstructions: 'Recommend high-EPC advertisers and optimize link selection',
  },
  trendingTopics: {
    pageName: 'Trending Topics',
    purpose: 'Discover and track trending topics for content creation',
    dataSchema: 'topics, trendScore, searchVolume, competition, relatedKeywords',
    llmInstructions: 'Identify emerging trends and suggest content angles',
  },
  botIntelligence: {
    pageName: 'Bot Intelligence',
    purpose: 'AI-powered insights and recommendations',
    dataSchema: 'insights, recommendations, learnings, decisions',
    llmInstructions: 'Provide strategic recommendations based on all system data',
  },
  auditLog: {
    pageName: 'Audit Log',
    purpose: 'Track all system events for transparency and bot learning',
    dataSchema: 'events, timestamps, actors, outcomes, learnings',
    llmInstructions: 'Analyze patterns in system behavior and identify optimization opportunities',
  },
  productPages: {
    pageName: 'Product Pages',
    purpose: 'Branded product recommendation pages with affiliate links',
    dataSchema: 'products, categories, affiliateLinks, images, seoData',
    llmInstructions: 'Create compelling product pages that maximize affiliate conversions',
  },
};

/**
 * Initialize or update a page context in the Hive Mind
 */
export async function initializePageContext(pageId: string, currentState?: any): Promise<PageContext> {
  const definition = PAGE_DEFINITIONS[pageId];
  if (!definition) {
    throw new Error(`Unknown page: ${pageId}`);
  }

  const existingContext = hiveMemory.pageContexts.get(pageId);
  
  const context: PageContext = {
    ...definition,
    currentState: currentState || existingContext?.currentState || {},
    lastAccessed: new Date(),
    interactionCount: (existingContext?.interactionCount || 0) + 1,
  };

  hiveMemory.pageContexts.set(pageId, context);
  hiveMemory.lastUpdated = new Date();

  return context;
}

/**
 * Log an event to the audit log with automatic LLM analysis
 */
export async function logEvent(
  userId: number,
  eventType: 'article_created' | 'article_published' | 'article_updated' | 'article_deleted' |
             'distribution_queued' | 'distribution_published' | 'distribution_failed' |
             'affiliate_link_added' | 'affiliate_link_clicked' | 'affiliate_conversion' |
             'automation_cycle_started' | 'automation_cycle_completed' | 'automation_cycle_failed' |
             'topic_discovered' | 'topic_saved' | 'bot_decision' | 'bot_learning' | 'bot_optimization' |
             'seo_indexed' | 'seo_ping_sent' | 'user_action' | 'system_event',
  details: {
    articleId?: number;
    message: string;
    metadata?: Record<string, any>;
    llmAnalysis?: boolean;
  }
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Create the audit log entry
  const result = await db.insert(auditLog).values({
    userId,
    eventType,
    articleId: details.articleId || null,
    action: details.message.substring(0, 255),
    description: details.message,
    metadata: (details.metadata || {}) as any,
  });

  const logId = Number(result[0].insertId);

  // If LLM analysis is requested, analyze the event
  if (details.llmAnalysis) {
    try {
      const analysis = await analyzeEventWithLLM(eventType, details.message, details.metadata);
      
      // Update the log with LLM insights
      await db.update(auditLog)
        .set({ metadata: { ...details.metadata, llmAnalysis: analysis } as any })
        .where(eq(auditLog.id, logId));
    } catch (error) {
      console.error('LLM analysis failed:', error);
    }
  }

  return logId;
}

/**
 * Analyze an event using the LLM
 */
async function analyzeEventWithLLM(
  eventType: string,
  message: string,
  metadata?: Record<string, any>
): Promise<string> {
  const systemPrompt = `You are the Hive Mind analyzer for MoneyMachine, a content monetization platform.
Your role is to analyze system events and provide actionable insights.

Event Type: ${eventType}
Event Message: ${message}
Metadata: ${JSON.stringify(metadata || {})}

Provide a brief analysis (2-3 sentences) with:
1. What this event means for the system
2. Any optimization opportunities
3. Recommended follow-up actions`;

  const response = await invokeMultiLLM(
    'deep_reasoning',
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Analyze this event and provide insights.' }],
    { maxTokens: 200 }
  );

  return response.content;
}

/**
 * Get insights from the Hive Mind for a specific page
 */
export async function getPageInsights(
  pageId: string,
  userId: number,
  additionalContext?: string
): Promise<{
  insights: string[];
  recommendations: string[];
  nextActions: string[];
}> {
  const context = await initializePageContext(pageId);
  
  // Gather relevant data for the page
  const pageData = await gatherPageData(pageId, userId);
  
  const systemPrompt = `You are the Hive Mind intelligence for MoneyMachine.
You are analyzing the "${context.pageName}" page.

Page Purpose: ${context.purpose}
Page Data Schema: ${context.dataSchema}
LLM Instructions: ${context.llmInstructions}

Current Page Data:
${JSON.stringify(pageData, null, 2)}

${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Provide actionable insights in JSON format:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "nextActions": ["action1", "action2", "action3"]
}`;

  try {
    const response = await invokeMultiLLM(
      'deep_reasoning',
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Analyze this page and provide insights.' }],
      { maxTokens: 500 }
    );

    // Parse the JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to get page insights:', error);
  }

  return {
    insights: ['Unable to generate insights at this time'],
    recommendations: ['Check system connectivity'],
    nextActions: ['Retry analysis'],
  };
}

/**
 * Gather relevant data for a specific page
 */
async function gatherPageData(pageId: string, userId: number): Promise<any> {
  const db = await getDb();
  if (!db) return {};

  switch (pageId) {
    case 'dashboard':
    case 'articles':
      const articleStats = await db.select({
        total: sql<number>`COUNT(*)`,
        published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
        totalViews: sql<number>`SUM(views)`,
        avgSeoScore: sql<number>`AVG(seo_score)`,
      }).from(articles).where(eq(articles.userId, userId));
      return articleStats[0];

    case 'affiliateLinks':
      const linkStats = await db.select({
        total: sql<number>`COUNT(*)`,
        totalClicks: sql<number>`SUM(clicks)`,
        avgEpc: sql<number>`AVG(CAST(epc AS DECIMAL(10,2)))`,
      }).from(affiliateLinks).where(eq(affiliateLinks.userId, userId));
      return linkStats[0];

    case 'distribution':
      const distStats = await db.select({
        total: sql<number>`COUNT(*)`,
        published: sql<number>`SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      }).from(articleDistribution).where(eq(articleDistribution.userId, userId));
      return distStats[0];

    case 'auditLog':
      const recentEvents = await db.select()
        .from(auditLog)
        .where(eq(auditLog.userId, userId))
        .orderBy(desc(auditLog.createdAt))
        .limit(10);
      return { recentEvents, eventCount: recentEvents.length };

    default:
      return {};
  }
}

/**
 * Communicate with the Hive Mind - central LLM interaction point
 */
export async function communicateWithHiveMind(
  userId: number,
  pageId: string,
  query: string,
  context?: any
): Promise<{
  response: string;
  actions: string[];
  shouldLog: boolean;
}> {
  // Initialize page context
  const pageContext = await initializePageContext(pageId, context);
  
  // Get or create conversation history
  let conversation = hiveMemory.llmConversations.get(`${userId}-${pageId}`);
  if (!conversation) {
    conversation = {
      pageId,
      messages: [],
      insights: [],
    };
    hiveMemory.llmConversations.set(`${userId}-${pageId}`, conversation);
  }

  // Build system prompt with full context
  const systemPrompt = `You are the Hive Mind - the central AI intelligence for MoneyMachine.
You have access to all system data and coordinate all AI operations.

Current Page: ${pageContext.pageName}
Page Purpose: ${pageContext.purpose}
Your Instructions: ${pageContext.llmInstructions}

System Objectives:
${hiveMemory.systemObjectives.map(o => `- ${o.objective} (Priority: ${o.priority}, Progress: ${o.progress}%)`).join('\n')}

Previous Conversation Context:
${conversation.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Current Page State:
${JSON.stringify(pageContext.currentState, null, 2)}

Respond with helpful, actionable guidance. If you recommend actions, list them clearly.
Always consider how your response affects the overall goal of maximizing affiliate revenue.`;

  // Add user message to history
  conversation.messages.push({
    role: 'user',
    content: query,
    timestamp: new Date(),
  });

  try {
    const response = await invokeMultiLLM(
      'deep_reasoning',
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
      { maxTokens: 800 }
    );

    // Add assistant response to history
    conversation.messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
    });

    // Extract actions from response
    const actions = extractActions(response.content);

    // Log the interaction
    await logEvent(userId, 'bot_learning', {
      message: `Hive Mind interaction on ${pageContext.pageName}`,
      metadata: {
        pageId,
        query: query.substring(0, 100),
        responseLength: response.content.length,
        actionsCount: actions.length,
      },
    });

    return {
      response: response.content,
      actions,
      shouldLog: true,
    };
  } catch (error) {
    console.error('Hive Mind communication failed:', error);
    return {
      response: 'I apologize, but I encountered an error processing your request. Please try again.',
      actions: [],
      shouldLog: false,
    };
  }
}

/**
 * Extract actionable items from LLM response
 */
function extractActions(response: string): string[] {
  const actions: string[] = [];
  
  // Look for numbered lists
  const numberedMatches = response.match(/\d+\.\s+([^\n]+)/g);
  if (numberedMatches) {
    actions.push(...numberedMatches.map(m => m.replace(/^\d+\.\s+/, '')));
  }
  
  // Look for bullet points
  const bulletMatches = response.match(/[-•]\s+([^\n]+)/g);
  if (bulletMatches) {
    actions.push(...bulletMatches.map(m => m.replace(/^[-•]\s+/, '')));
  }

  return actions.slice(0, 5); // Limit to 5 actions
}

/**
 * Update system objectives
 */
export function updateSystemObjectives(objectives: SystemObjective[]): void {
  hiveMemory.systemObjectives = objectives;
  hiveMemory.lastUpdated = new Date();
}

/**
 * Get the current Hive Mind state
 */
export function getHiveMindState(): {
  pageContexts: Record<string, PageContext>;
  objectivesCount: number;
  lastUpdated: Date;
  conversationCount: number;
} {
  return {
    pageContexts: Object.fromEntries(hiveMemory.pageContexts),
    objectivesCount: hiveMemory.systemObjectives.length,
    lastUpdated: hiveMemory.lastUpdated,
    conversationCount: hiveMemory.llmConversations.size,
  };
}

/**
 * Sync all pages with the Hive Mind - called periodically
 */
export async function syncAllPages(userId: number): Promise<{
  pagesUpdated: number;
  insightsGenerated: number;
  eventsLogged: number;
}> {
  let pagesUpdated = 0;
  let insightsGenerated = 0;
  let eventsLogged = 0;

  for (const pageId of Object.keys(PAGE_DEFINITIONS)) {
    try {
      // Initialize/update page context
      await initializePageContext(pageId);
      pagesUpdated++;

      // Generate insights for the page
      const insights = await getPageInsights(pageId, userId);
      insightsGenerated += insights.insights.length;

      // Log the sync event
      await logEvent(userId, 'system_event', {
        message: `Hive Mind synced ${pageId} page`,
        metadata: {
          pageId,
          insightsCount: insights.insights.length,
          recommendationsCount: insights.recommendations.length,
        },
      });
      eventsLogged++;
    } catch (error) {
      console.error(`Failed to sync page ${pageId}:`, error);
    }
  }

  return { pagesUpdated, insightsGenerated, eventsLogged };
}

/**
 * Auto-log article events - call this when articles are created/updated
 */
export async function logArticleEvent(
  userId: number,
  eventType: 'article_created' | 'article_published' | 'article_updated',
  articleId: number,
  articleTitle: string,
  additionalData?: Record<string, any>
): Promise<void> {
  await logEvent(userId, eventType, {
    articleId,
    message: `Article "${articleTitle}" was ${eventType.replace('article_', '')}`,
    metadata: {
      articleTitle,
      ...additionalData,
    },
    llmAnalysis: true,
  });
}

/**
 * Auto-log distribution events
 */
export async function logDistributionEvent(
  userId: number,
  eventType: 'distribution_queued' | 'distribution_published',
  articleId: number,
  platform: string,
  externalUrl?: string
): Promise<void> {
  await logEvent(userId, eventType, {
    articleId,
    message: `Distribution to ${platform} ${eventType === 'distribution_queued' ? 'queued' : 'published'}`,
    metadata: {
      platform,
      externalUrl,
    },
    llmAnalysis: eventType === 'distribution_published',
  });
}

/**
 * Auto-log automation cycle events
 */
export async function logAutomationEvent(
  userId: number,
  cycleType: string,
  articlesGenerated: number,
  success: boolean
): Promise<void> {
  await logEvent(userId, 'automation_cycle_completed', {
    message: `Automation cycle "${cycleType}" completed with ${articlesGenerated} articles`,
    metadata: {
      cycleType,
      articlesGenerated,
      success,
    },
    llmAnalysis: true,
  });
}

/**
 * Auto-log bot decisions
 */
export async function logBotDecision(
  userId: number,
  decision: string,
  reasoning: string,
  outcome?: string
): Promise<void> {
  await logEvent(userId, 'bot_decision', {
    message: decision,
    metadata: {
      reasoning,
      outcome,
    },
    llmAnalysis: true,
  });
}

// Initialize default system objectives
updateSystemObjectives([
  {
    id: 'revenue',
    objective: 'Maximize affiliate revenue through optimized content and link placement',
    priority: 1,
    status: 'active',
    progress: 0,
    assignedPages: ['articles', 'affiliateLinks', 'contentPipeline'],
  },
  {
    id: 'traffic',
    objective: 'Increase organic traffic through SEO optimization and distribution',
    priority: 2,
    status: 'active',
    progress: 0,
    assignedPages: ['articles', 'distribution', 'trendingTopics'],
  },
  {
    id: 'automation',
    objective: 'Achieve fully automated content generation and publishing',
    priority: 3,
    status: 'active',
    progress: 0,
    assignedPages: ['automation', 'contentPipeline', 'botIntelligence'],
  },
]);
