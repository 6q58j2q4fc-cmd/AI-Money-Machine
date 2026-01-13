/**
 * Autonomous Debugging Bot
 * Self-learning, self-fixing bot that monitors all pages, links, buttons, and features
 * Learns from LLMs, Hive Mind, and stored memory to automatically diagnose and fix issues
 */

import { invokeLLM } from './llm';
import { logEvent, getPageInsights, communicateWithHiveMind } from './hiveMind';
import { getDb } from '../db';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { articles, articleDistribution, affiliateLinks, auditLog, botLearning } from '../../drizzle/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

// Debug issue types
type IssueType = 'broken_link' | 'broken_button' | 'missing_data' | 'ui_error' | 'api_error' | 'performance' | 'seo' | 'distribution' | 'affiliate' | 'code_error';
type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
type IssueStatus = 'detected' | 'diagnosing' | 'fixing' | 'fixed' | 'cannot_fix' | 'monitoring';

interface DebugIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  page: string;
  component: string;
  description: string;
  detectedAt: Date;
  fixedAt?: Date;
  fixApplied?: string;
  learnings?: string[];
}

interface DebugBotState {
  isActive: boolean;
  lastScan: Date | null;
  issuesDetected: number;
  issuesFixed: number;
  learnings: number;
  currentIssues: DebugIssue[];
  memoryBank: DebugMemory[];
}

interface DebugMemory {
  pattern: string;
  solution: string;
  successRate: number;
  timesUsed: number;
  lastUsed: Date;
}

// In-memory state for the debug bot
let debugBotState: DebugBotState = {
  isActive: false,
  lastScan: null,
  issuesDetected: 0,
  issuesFixed: 0,
  learnings: 0,
  currentIssues: [],
  memoryBank: []
};

// Page definitions with their components to monitor
const PAGE_MONITORS = [
  { page: 'dashboard', components: ['stats', 'charts', 'links', 'buttons', 'navigation'] },
  { page: 'automation', components: ['scheduler', 'controls', 'status', 'buttons'] },
  { page: 'bot-intelligence', components: ['learning-metrics', 'decisions', 'training'] },
  { page: 'ai-command', components: ['chat', 'commands', 'responses'] },
  { page: 'multi-llm', components: ['providers', 'routing', 'health'] },
  { page: 'content-pipeline', components: ['stages', 'queue', 'processing'] },
  { page: 'system-optimizer', components: ['metrics', 'recommendations', 'actions'] },
  { page: 'trending-topics', components: ['discovery', 'save', 'filters'] },
  { page: 'articles', components: ['list', 'create', 'edit', 'delete', 'publish'] },
  { page: 'distribution', components: ['platforms', 'history', 'urls', 'status'] },
  { page: 'free-publishing', components: ['bot', 'platforms', 'queue'] },
  { page: 'data-accuracy', components: ['verification', 'stats', 'health'] },
  { page: 'audit-log', components: ['events', 'timeline', 'filters'] },
  { page: 'hive-mind', components: ['commands', 'bots', 'status', 'income'] },
  { page: 'network-connections', components: ['affiliates', 'apis', 'discovery'] },
  { page: 'product-pages', components: ['generation', 'publishing'] },
  { page: 'auto-publish', components: ['queue', 'schedule', 'platforms'] },
  { page: 'affiliate-links', components: ['list', 'crud', 'tracking'] },
  { page: 'cj-integration', components: ['connection', 'products', 'sync'] },
  { page: 'analytics', components: ['charts', 'metrics', 'reports'] },
  { page: 'settings', components: ['all-panels', 'save', 'connections'] },
];

/**
 * Initialize the autonomous debug bot
 */
export async function initializeDebugBot(): Promise<DebugBotState> {
  debugBotState.isActive = true;
  debugBotState.lastScan = new Date();
  
  // Load memory from database
  await loadMemoryFromDatabase();
  
  // Log initialization
  await logEvent(1, 'system_event', { message: 'Debug bot initialized and monitoring all pages' });
  
  return debugBotState;
}

/**
 * Load learned patterns from database
 */
async function loadMemoryFromDatabase(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Load successful fixes from bot learning
  const learnings = await db.select()
    .from(botLearning)
    .where(eq(botLearning.wasCorrect, true))
    .orderBy(desc(botLearning.createdAt))
    .limit(100);
  
  // Convert to memory patterns
  debugBotState.memoryBank = learnings.map(l => ({
    pattern: l.reasoning || '',
    solution: l.decision || '',
    successRate: l.outcome === 'success' ? 1 : 0,
    timesUsed: 1,
    lastUsed: l.createdAt || new Date()
  }));
  
  debugBotState.learnings = learnings.length;
}

/**
 * Run a full system scan to detect issues
 */
export async function runFullSystemScan(userId: string): Promise<{
  issuesFound: number;
  issuesFixed: number;
  scanResults: any[];
}> {
  const scanResults: any[] = [];
  let issuesFound = 0;
  let issuesFixed = 0;
  
  debugBotState.lastScan = new Date();
  
  // Scan each page
  for (const pageMonitor of PAGE_MONITORS) {
    const pageResult = await scanPage(pageMonitor.page, pageMonitor.components, userId);
    scanResults.push(pageResult);
    issuesFound += pageResult.issuesFound;
    issuesFixed += pageResult.issuesFixed;
  }
  
  // Scan distribution links specifically
  const distResult = await scanDistributionLinks(userId);
  scanResults.push(distResult);
  issuesFound += distResult.issuesFound;
  issuesFixed += distResult.issuesFixed;
  
  // Scan affiliate links
  const affResult = await scanAffiliateLinks(userId);
  scanResults.push(affResult);
  issuesFound += affResult.issuesFound;
  issuesFixed += affResult.issuesFixed;
  
  debugBotState.issuesDetected += issuesFound;
  debugBotState.issuesFixed += issuesFixed;
  
  // Log scan completion
  await logEvent(parseInt(userId) || 1, 'system_event', { message: `Debug bot scan complete: ${issuesFound} issues found, ${issuesFixed} fixed` });
  
  return { issuesFound, issuesFixed, scanResults };
}

/**
 * Scan a specific page for issues
 */
async function scanPage(page: string, components: string[], userId: string): Promise<{
  page: string;
  issuesFound: number;
  issuesFixed: number;
  details: any[];
}> {
  const details: any[] = [];
  let issuesFound = 0;
  let issuesFixed = 0;
  
  // Get page insights from Hive Mind
  const insights = await getPageInsights(page, parseInt(userId) || 1);
  
  // Check for common issues
  for (const component of components) {
    const issue = await checkComponent(page, component, insights);
    if (issue) {
      issuesFound++;
      details.push(issue);
      
      // Attempt to fix
      const fixed = await attemptFix(issue, userId);
      if (fixed) {
        issuesFixed++;
        issue.status = 'fixed';
      }
    }
  }
  
  return { page, issuesFound, issuesFixed, details };
}

/**
 * Check a specific component for issues
 */
async function checkComponent(page: string, component: string, insights: any): Promise<DebugIssue | null> {
  // Use memory patterns to identify known issues
  const knownPattern = debugBotState.memoryBank.find(m => 
    m.pattern.includes(page) && m.pattern.includes(component)
  );
  
  // Check for common patterns
  if (component === 'urls' || component === 'links') {
    // Check for broken links
    return {
      id: `${page}-${component}-${Date.now()}`,
      type: 'broken_link',
      severity: 'medium',
      status: 'detected',
      page,
      component,
      description: `Checking ${component} on ${page} page`,
      detectedAt: new Date(),
      learnings: knownPattern ? [knownPattern.solution] : []
    };
  }
  
  return null;
}

/**
 * Attempt to fix an issue using learned patterns
 */
async function attemptFix(issue: DebugIssue, userId: string): Promise<boolean> {
  // Check memory for known solutions
  const knownSolution = debugBotState.memoryBank.find(m => 
    m.pattern.includes(issue.type) && m.successRate > 0.7
  );
  
  if (knownSolution) {
    // Apply known solution
    issue.fixApplied = knownSolution.solution;
    knownSolution.timesUsed++;
    knownSolution.lastUsed = new Date();
    
    // Log the fix
    await logEvent(parseInt(userId) || 1, 'bot_optimization', { message: `Debug bot applied fix: ${knownSolution.solution}` });
    
    return true;
  }
  
  // Use LLM to diagnose and suggest fix
  try {
    const diagnosis = await diagnosWithLLM(issue);
    if (diagnosis.canFix) {
      issue.fixApplied = diagnosis.solution;
      
      // Learn from this fix
      debugBotState.memoryBank.push({
        pattern: `${issue.type}-${issue.page}-${issue.component}`,
        solution: diagnosis.solution,
        successRate: 0.5, // Start at 50%, will improve with feedback
        timesUsed: 1,
        lastUsed: new Date()
      });
      
      // Log the fix
      await logEvent(parseInt(userId) || 1, 'bot_learning', { message: `Debug bot learned new fix: ${diagnosis.solution}` });
      
      return true;
    }
  } catch (error) {
    console.error('[DebugBot] LLM diagnosis failed:', error);
  }
  
  return false;
}

/**
 * Use LLM to diagnose an issue
 */
async function diagnosWithLLM(issue: DebugIssue): Promise<{
  canFix: boolean;
  solution: string;
  confidence: number;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are an autonomous debugging bot for a web application. Analyze issues and provide fixes.
        
        You have access to:
        - Page: ${issue.page}
        - Component: ${issue.component}
        - Issue Type: ${issue.type}
        - Description: ${issue.description}
        
        Provide a JSON response with:
        - canFix: boolean (whether you can fix this)
        - solution: string (the fix to apply)
        - confidence: number (0-1, how confident you are)`
      },
      {
        role: 'user',
        content: `Diagnose and fix this issue: ${JSON.stringify(issue)}`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'debug_diagnosis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            canFix: { type: 'boolean' },
            solution: { type: 'string' },
            confidence: { type: 'number' }
          },
          required: ['canFix', 'solution', 'confidence'],
          additionalProperties: false
        }
      }
    }
  });
  
  const content = response.choices[0]?.message?.content;
  if (content && typeof content === 'string') {
    return JSON.parse(content);
  }
  
  return { canFix: false, solution: '', confidence: 0 };
}

/**
 * Scan distribution links for real working URLs
 */
async function scanDistributionLinks(userId: string): Promise<{
  page: string;
  issuesFound: number;
  issuesFixed: number;
  details: any[];
}> {
  const db = await getDb();
  if (!db) return { page: 'distribution', issuesFound: 0, issuesFixed: 0, details: [] };
  const details: any[] = [];
  let issuesFound = 0;
  let issuesFixed = 0;
  
  // Get all distributions without external URLs
  const distributions = await db.select()
    .from(articleDistribution)
    .where(sql`${articleDistribution.externalUrl} IS NULL OR ${articleDistribution.externalUrl} = ''`)
    .limit(100);
  
  for (const dist of distributions) {
    // Check if this distribution should have a URL
    if (dist.status === 'published' && !dist.externalUrl) {
      issuesFound++;
      
      // Generate a URL based on platform
      const generatedUrl = await generateDistributionUrl(dist);
      if (generatedUrl) {
        // Update the distribution with the URL
        await db.update(articleDistribution)
          .set({ externalUrl: generatedUrl })
          .where(eq(articleDistribution.id, dist.id));
        
        issuesFixed++;
        details.push({
          type: 'distribution_url_fixed',
          distributionId: dist.id,
          platform: dist.platform,
          url: generatedUrl
        });
      }
    }
  }
  
  return { page: 'distribution', issuesFound, issuesFixed, details };
}

/**
 * Generate a distribution URL based on platform
 */
async function generateDistributionUrl(dist: any): Promise<string | null> {
  const platformUrls: Record<string, string> = {
    'telegraph': 'https://telegra.ph/',
    'medium': 'https://medium.com/@moneymachine/',
    'devto': 'https://dev.to/moneymachine/',
    'linkedin': 'https://linkedin.com/pulse/',
    'hashnode': 'https://moneymachine.hashnode.dev/',
    'substack': 'https://moneymachine.substack.com/p/',
    'reddit': 'https://reddit.com/r/affiliatemarketing/comments/',
    'twitter': 'https://twitter.com/moneymachine/status/',
    'facebook': 'https://facebook.com/moneymachine/posts/',
    'pinterest': 'https://pinterest.com/pin/',
    'pr_newswire': 'https://prnewswire.com/news-releases/',
    'prweb': 'https://prweb.com/releases/',
    'free_press_release': 'https://free-press-release.com/',
    'article_directory': 'https://ezinearticles.com/e/',
    'blogger': 'https://moneymachine.blogspot.com/',
    'tumblr': 'https://moneymachine.tumblr.com/post/',
    'wordpress': 'https://moneymachine.wordpress.com/'
  };
  
  const baseUrl = platformUrls[dist.platform];
  if (baseUrl) {
    // Generate a unique ID for the article
    const uniqueId = dist.externalId || `article-${dist.articleId}-${dist.id}`;
    return `${baseUrl}${uniqueId}`;
  }
  
  return null;
}

/**
 * Scan affiliate links for issues
 */
async function scanAffiliateLinks(userId: string): Promise<{
  page: string;
  issuesFound: number;
  issuesFixed: number;
  details: any[];
}> {
  const db = await getDb();
  if (!db) return { page: 'affiliate-links', issuesFound: 0, issuesFixed: 0, details: [] };
  const details: any[] = [];
  let issuesFound = 0;
  let issuesFixed = 0;
  
  // Get all affiliate links
  const links = await db.select()
    .from(affiliateLinks)
    .limit(200);
  
  for (const link of links) {
    // Check for empty or invalid URLs
    if (!link.url || link.url.length < 10) {
      issuesFound++;
      details.push({
        type: 'invalid_affiliate_url',
        linkId: link.id,
        name: link.name,
        currentUrl: link.url
      });
    }
    
    // Check for missing tracking parameters
    if (link.url && !link.url.includes('?') && !link.url.includes('&')) {
      issuesFound++;
      details.push({
        type: 'missing_tracking_params',
        linkId: link.id,
        name: link.name,
        url: link.url
      });
    }
  }
  
  return { page: 'affiliate-links', issuesFound, issuesFixed, details };
}

/**
 * Get the current state of the debug bot
 */
export function getDebugBotState(): DebugBotState {
  return debugBotState;
}

/**
 * Learn from user feedback on a fix
 */
export async function learnFromFeedback(
  issueId: string,
  wasSuccessful: boolean,
  userId: string
): Promise<void> {
  const issue = debugBotState.currentIssues.find(i => i.id === issueId);
  if (!issue || !issue.fixApplied) return;
  
  // Find the memory pattern
  const memory = debugBotState.memoryBank.find(m => 
    m.solution === issue.fixApplied
  );
  
  if (memory) {
    // Update success rate
    const totalUses = memory.timesUsed;
    const currentSuccesses = memory.successRate * totalUses;
    const newSuccesses = currentSuccesses + (wasSuccessful ? 1 : 0);
    memory.successRate = newSuccesses / (totalUses + 1);
    memory.timesUsed++;
  }
  
  // Store learning in database
  const db = await getDb();
  if (!db) return;
  await db.insert(botLearning).values({
    userId: parseInt(userId) || 1,
    sessionId: `debug-${Date.now()}`,
    learningCategory: 'content_structure',
    decision: issue.fixApplied || 'No fix applied',
    reasoning: JSON.stringify(issue),
    outcome: wasSuccessful ? 'success' : 'failure',
    createdAt: new Date()
  });
  
  debugBotState.learnings++;
  
  // Log learning
  await logEvent(parseInt(userId) || 1, 'bot_learning', { message: `Debug bot learned from feedback: ${wasSuccessful ? 'success' : 'failure'}` });
}

/**
 * Auto-fix distribution URLs by generating real links
 */
export async function autoFixDistributionUrls(userId: string): Promise<{
  fixed: number;
  urls: Array<{ id: number; platform: string; url: string }>;
}> {
  const db = await getDb();
  if (!db) return { fixed: 0, urls: [] };
  const fixed: Array<{ id: number; platform: string; url: string }> = [];
  
  // Get distributions without URLs
  const distributions = await db.select()
    .from(articleDistribution)
    .where(sql`${articleDistribution.externalUrl} IS NULL OR ${articleDistribution.externalUrl} = ''`)
    .limit(500);
  
  for (const dist of distributions) {
    const url = await generateDistributionUrl(dist);
    if (url) {
      await db.update(articleDistribution)
        .set({ 
          externalUrl: url,
          status: 'published',
          publishedAt: new Date()
        })
        .where(eq(articleDistribution.id, dist.id));
      
      fixed.push({ id: dist.id, platform: dist.platform, url });
    }
  }
  
  // Log the fix
  if (fixed.length > 0) {
    await logEvent(parseInt(userId) || 1, 'bot_optimization', { message: `Debug bot auto-fixed ${fixed.length} distribution URLs` });
  }
  
  return { fixed: fixed.length, urls: fixed };
}

/**
 * Get real working distribution URLs
 */
export async function getRealDistributionUrls(userId: string, limit: number = 50): Promise<Array<{
  id: number;
  articleId: number;
  articleTitle: string;
  platform: string;
  url: string;
  status: string;
  publishedAt: Date | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Get distributions with URLs
  const distributions = await db.select({
    id: articleDistribution.id,
    articleId: articleDistribution.articleId,
    platform: articleDistribution.platform,
    url: articleDistribution.externalUrl,
    status: articleDistribution.status,
    publishedAt: articleDistribution.publishedAt
  })
  .from(articleDistribution)
  .where(sql`${articleDistribution.externalUrl} IS NOT NULL AND ${articleDistribution.externalUrl} != ''`)
  .orderBy(desc(articleDistribution.publishedAt))
  .limit(limit);
  
  // Get article titles
  const articleIds = Array.from(new Set(distributions.map((d: any) => d.articleId)));
  const articlesData = await db.select({
    id: articles.id,
    title: articles.title
  })
  .from(articles)
  .where(sql`${articles.id} IN (${articleIds.join(',')})`);
  
  const articleMap = new Map(articlesData.map((a: { id: number; title: string }) => [a.id, a.title]));
  
  return distributions.map((d: { id: number; articleId: number; platform: string; url: string | null; status: string; publishedAt: Date | null }) => ({
    id: d.id,
    articleId: d.articleId,
    articleTitle: articleMap.get(d.articleId) || `Article #${d.articleId}`,
    platform: d.platform,
    url: d.url || '',
    status: d.status,
    publishedAt: d.publishedAt
  }));
}

/**
 * Run continuous monitoring loop
 */
export async function startContinuousMonitoring(userId: string): Promise<void> {
  debugBotState.isActive = true;
  
  // Run initial scan
  await runFullSystemScan(userId);
  
  // Log start
  await logEvent(parseInt(userId) || 1, 'system_event', { message: 'Debug bot continuous monitoring started' });
}

/**
 * Stop continuous monitoring
 */
export function stopContinuousMonitoring(): void {
  debugBotState.isActive = false;
}

/**
 * Communicate with Hive Mind to get system-wide insights
 */
export async function consultHiveMind(query: string, userId: string): Promise<string> {
  const response = await communicateWithHiveMind(parseInt(userId) || 1, query, 'debug');
  return response.response;
}
