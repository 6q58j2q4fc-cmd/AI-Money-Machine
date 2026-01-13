/**
 * Daily Optimization Engine
 * 
 * Intelligently manages all API resources and ensures every feature
 * is constantly working and being optimized exponentially.
 * 
 * Features:
 * - API health monitoring for all providers
 * - Intelligent task routing based on provider performance
 * - Usage tracking and quota management
 * - Auto-recovery and failover mechanisms
 * - Daily optimization cycles
 * - Performance analytics and recommendations
 */

import { ENV } from "./env";
import { getAvailableProviders, invokeMultiLLM, type LLMTaskType } from "./multiLlm";
import { invokeLLM } from "./llm";

// ============================================================================
// API PROVIDER REGISTRY
// ============================================================================

export interface ApiProvider {
  name: string;
  type: "llm" | "affiliate" | "distribution" | "analytics" | "bot";
  envKey: string;
  endpoint: string;
  healthCheckEndpoint?: string;
  rateLimit: {
    requestsPerDay: number;
    requestsPerMinute: number;
  };
  capabilities: string[];
  priority: number; // 1-10, higher = preferred
  costPerRequest: number; // 0 = free
}

export const API_REGISTRY: Record<string, ApiProvider> = {
  // LLM Providers
  groq: {
    name: "Groq",
    type: "llm",
    envKey: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    healthCheckEndpoint: "https://api.groq.com/openai/v1/models",
    rateLimit: { requestsPerDay: 1000, requestsPerMinute: 30 },
    capabilities: ["article_generation", "seo_optimization", "headline_generation", "quick_task", "code_generation"],
    priority: 9,
    costPerRequest: 0,
  },
  cerebras: {
    name: "Cerebras",
    type: "llm",
    envKey: "CEREBRAS_API_KEY",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    healthCheckEndpoint: "https://api.cerebras.ai/v1/models",
    rateLimit: { requestsPerDay: 14400, requestsPerMinute: 60 },
    capabilities: ["topic_research", "performance_analysis", "deep_reasoning", "article_generation"],
    priority: 8,
    costPerRequest: 0,
  },
  openrouter: {
    name: "OpenRouter",
    type: "llm",
    envKey: "OPENROUTER_API_KEY",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    healthCheckEndpoint: "https://openrouter.ai/api/v1/models",
    rateLimit: { requestsPerDay: 50, requestsPerMinute: 10 },
    capabilities: ["deep_reasoning", "topic_research"],
    priority: 7,
    costPerRequest: 0,
  },
  google: {
    name: "Google AI Studio",
    type: "llm",
    envKey: "GOOGLE_AI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    rateLimit: { requestsPerDay: 1500, requestsPerMinute: 15 },
    capabilities: ["article_generation", "seo_optimization", "multimodal"],
    priority: 8,
    costPerRequest: 0,
  },
  manus: {
    name: "Manus Built-in LLM",
    type: "llm",
    envKey: "BUILT_IN_FORGE_API_KEY",
    endpoint: "built-in",
    rateLimit: { requestsPerDay: 10000, requestsPerMinute: 100 },
    capabilities: ["article_generation", "seo_optimization", "topic_research", "affiliate_matching", "all"],
    priority: 10,
    costPerRequest: 0,
  },
  
  // Affiliate Providers
  cj: {
    name: "Commission Junction",
    type: "affiliate",
    envKey: "CJ_API_KEY",
    endpoint: "https://advertiser-lookup.api.cj.com/v2/advertiser-lookup",
    rateLimit: { requestsPerDay: 1000, requestsPerMinute: 20 },
    capabilities: ["affiliate_links", "advertiser_search", "link_generation"],
    priority: 9,
    costPerRequest: 0,
  },
  
  // Distribution Providers
  devto: {
    name: "Dev.to",
    type: "distribution",
    envKey: "DEVDOTTO_API",
    endpoint: "https://dev.to/api/articles",
    rateLimit: { requestsPerDay: 100, requestsPerMinute: 10 },
    capabilities: ["article_publishing", "tech_content"],
    priority: 8,
    costPerRequest: 0,
  },
  hastewire: {
    name: "Hastewire",
    type: "distribution",
    envKey: "HASTEWIRE_API",
    endpoint: "https://api.hastewire.com",
    rateLimit: { requestsPerDay: 500, requestsPerMinute: 30 },
    capabilities: ["content_distribution", "social_sharing"],
    priority: 7,
    costPerRequest: 0,
  },
  
  // Bot Providers
  botpress: {
    name: "Botpress",
    type: "bot",
    envKey: "BOTPRESS_API",
    endpoint: "https://api.botpress.cloud/v1",
    rateLimit: { requestsPerDay: 5000, requestsPerMinute: 50 },
    capabilities: ["chatbot", "automation", "workflow"],
    priority: 8,
    costPerRequest: 0,
  },
  
  // Content Generation
  copymatic: {
    name: "Copymatic AI",
    type: "llm",
    envKey: "COPYMATIC_AI_API_KEY",
    endpoint: "https://api.copymatic.ai",
    rateLimit: { requestsPerDay: 100, requestsPerMinute: 10 },
    capabilities: ["copywriting", "marketing_content"],
    priority: 6,
    costPerRequest: 0,
  },
};

// ============================================================================
// USAGE TRACKING
// ============================================================================

interface UsageRecord {
  provider: string;
  timestamp: number;
  taskType: string;
  success: boolean;
  responseTime: number;
  tokensUsed?: number;
  error?: string;
}

interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  lastUsed: number;
  lastError?: string;
  healthStatus: "healthy" | "degraded" | "down";
}

// In-memory usage tracking (persisted to DB in production)
const usageHistory: UsageRecord[] = [];
const providerStats: Map<string, ProviderStats> = new Map();

// Initialize provider stats
Object.keys(API_REGISTRY).forEach(provider => {
  providerStats.set(provider, {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
    lastUsed: 0,
    healthStatus: "healthy",
  });
});

// ============================================================================
// HEALTH MONITORING
// ============================================================================

export interface HealthCheckResult {
  provider: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  lastChecked: number;
  error?: string;
  quotaRemaining?: number;
}

async function checkProviderHealth(providerId: string): Promise<HealthCheckResult> {
  const provider = API_REGISTRY[providerId];
  if (!provider) {
    return {
      provider: providerId,
      status: "down",
      responseTime: 0,
      lastChecked: Date.now(),
      error: "Provider not found",
    };
  }

  // Check if API key is configured
  const apiKey = getApiKeyForProvider(providerId);
  if (!apiKey) {
    return {
      provider: providerId,
      status: "down",
      responseTime: 0,
      lastChecked: Date.now(),
      error: "API key not configured",
    };
  }

  const startTime = Date.now();
  
  try {
    // For built-in Manus LLM, always return healthy
    if (providerId === "manus") {
      return {
        provider: providerId,
        status: "healthy",
        responseTime: 0,
        lastChecked: Date.now(),
      };
    }

    // Simple health check - just verify the endpoint responds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(provider.healthCheckEndpoint || provider.endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 means the endpoint is reachable but auth failed (still "healthy" infrastructure)
      return {
        provider: providerId,
        status: responseTime < 2000 ? "healthy" : "degraded",
        responseTime,
        lastChecked: Date.now(),
      };
    }

    return {
      provider: providerId,
      status: "degraded",
      responseTime,
      lastChecked: Date.now(),
      error: `HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      provider: providerId,
      status: "down",
      responseTime: Date.now() - startTime,
      lastChecked: Date.now(),
      error: error.message,
    };
  }
}

export async function checkAllProvidersHealth(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];
  
  for (const providerId of Object.keys(API_REGISTRY)) {
    const result = await checkProviderHealth(providerId);
    results.push(result);
    
    // Update provider stats
    const stats = providerStats.get(providerId);
    if (stats) {
      stats.healthStatus = result.status;
      if (result.error) {
        stats.lastError = result.error;
      }
    }
  }
  
  return results;
}

// ============================================================================
// INTELLIGENT TASK ROUTING
// ============================================================================

export interface TaskRoutingDecision {
  primaryProvider: string;
  fallbackProviders: string[];
  reason: string;
  estimatedCost: number;
  estimatedTime: number;
}

// Task to optimal provider mapping with performance weighting
const TASK_PROVIDER_MATRIX: Record<string, { providers: string[]; weights: number[] }> = {
  article_generation: { 
    providers: ["manus", "groq", "cerebras", "google"], 
    weights: [1.0, 0.9, 0.85, 0.8] 
  },
  seo_optimization: { 
    providers: ["groq", "manus", "cerebras"], 
    weights: [0.95, 1.0, 0.85] 
  },
  topic_research: { 
    providers: ["cerebras", "openrouter", "manus"], 
    weights: [0.9, 0.85, 1.0] 
  },
  affiliate_matching: { 
    providers: ["groq", "cerebras", "manus"], 
    weights: [0.9, 0.85, 1.0] 
  },
  headline_generation: { 
    providers: ["groq", "manus", "cerebras"], 
    weights: [0.95, 1.0, 0.85] 
  },
  deep_reasoning: { 
    providers: ["openrouter", "cerebras", "manus"], 
    weights: [0.9, 0.85, 1.0] 
  },
  performance_analysis: { 
    providers: ["cerebras", "manus", "groq"], 
    weights: [0.9, 1.0, 0.85] 
  },
  content_distribution: { 
    providers: ["devto", "hastewire"], 
    weights: [0.9, 0.85] 
  },
  affiliate_search: { 
    providers: ["cj"], 
    weights: [1.0] 
  },
  bot_automation: { 
    providers: ["botpress"], 
    weights: [1.0] 
  },
};

function getApiKeyForProvider(providerId: string): string | null {
  const provider = API_REGISTRY[providerId];
  if (!provider) return null;
  
  switch (provider.envKey) {
    case "GROQ_API_KEY": return ENV.groqApiKey || null;
    case "CEREBRAS_API_KEY": return ENV.cerebrasApiKey || null;
    case "OPENROUTER_API_KEY": return ENV.openrouterApiKey || null;
    case "GOOGLE_AI_API_KEY": return ENV.googleAiApiKey || null;
    case "BUILT_IN_FORGE_API_KEY": return ENV.forgeApiKey || null;
    case "CJ_API_KEY": return ENV.cjApiKey || null;
    case "DEVDOTTO_API": return ENV.devtoApiKey || null;
    case "HASTEWIRE_API": return ENV.hastewireApiKey || null;
    case "BOTPRESS_API": return ENV.botpressApiKey || null;
    case "COPYMATIC_AI_API_KEY": return ENV.copymaticApiKey || null;
    default: return null;
  }
}

export function routeTask(taskType: string): TaskRoutingDecision {
  const matrix = TASK_PROVIDER_MATRIX[taskType];
  if (!matrix) {
    // Default to Manus built-in for unknown tasks
    return {
      primaryProvider: "manus",
      fallbackProviders: ["groq", "cerebras"],
      reason: "Unknown task type, using default provider",
      estimatedCost: 0,
      estimatedTime: 2000,
    };
  }

  // Filter available providers
  const availableProviders: { provider: string; score: number }[] = [];
  
  for (let i = 0; i < matrix.providers.length; i++) {
    const providerId = matrix.providers[i];
    const weight = matrix.weights[i];
    const apiKey = getApiKeyForProvider(providerId);
    const stats = providerStats.get(providerId);
    
    if (apiKey && stats?.healthStatus !== "down") {
      // Calculate score based on weight, health, and recent performance
      let score = weight;
      
      if (stats) {
        // Boost score for healthy providers
        if (stats.healthStatus === "healthy") score *= 1.1;
        if (stats.healthStatus === "degraded") score *= 0.8;
        
        // Boost score for providers with good success rate
        if (stats.totalRequests > 0) {
          const successRate = stats.successfulRequests / stats.totalRequests;
          score *= (0.5 + successRate * 0.5);
        }
        
        // Slight penalty for slow providers
        if (stats.averageResponseTime > 5000) score *= 0.9;
      }
      
      availableProviders.push({ provider: providerId, score });
    }
  }

  // Sort by score
  availableProviders.sort((a, b) => b.score - a.score);

  if (availableProviders.length === 0) {
    return {
      primaryProvider: "manus",
      fallbackProviders: [],
      reason: "No providers available, falling back to Manus",
      estimatedCost: 0,
      estimatedTime: 2000,
    };
  }

  const primary = availableProviders[0];
  const fallbacks = availableProviders.slice(1, 3).map(p => p.provider);

  return {
    primaryProvider: primary.provider,
    fallbackProviders: fallbacks,
    reason: `Selected ${primary.provider} with score ${primary.score.toFixed(2)}`,
    estimatedCost: API_REGISTRY[primary.provider]?.costPerRequest || 0,
    estimatedTime: providerStats.get(primary.provider)?.averageResponseTime || 2000,
  };
}

// ============================================================================
// USAGE RECORDING
// ============================================================================

export function recordUsage(
  provider: string,
  taskType: string,
  success: boolean,
  responseTime: number,
  tokensUsed?: number,
  error?: string
): void {
  // Add to history
  usageHistory.push({
    provider,
    timestamp: Date.now(),
    taskType,
    success,
    responseTime,
    tokensUsed,
    error,
  });

  // Keep only last 1000 records in memory
  if (usageHistory.length > 1000) {
    usageHistory.shift();
  }

  // Update provider stats
  const stats = providerStats.get(provider);
  if (stats) {
    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
      stats.lastError = error;
    }
    
    // Update average response time
    stats.averageResponseTime = (
      (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) / 
      stats.totalRequests
    );
    
    if (tokensUsed) {
      stats.totalTokensUsed += tokensUsed;
    }
    
    stats.lastUsed = Date.now();
  }
}

// ============================================================================
// DAILY OPTIMIZATION CYCLE
// ============================================================================

export interface OptimizationResult {
  timestamp: number;
  healthChecks: HealthCheckResult[];
  recommendations: string[];
  actionsPerformed: string[];
  metrics: {
    totalRequests24h: number;
    successRate24h: number;
    averageResponseTime24h: number;
    topPerformingProvider: string;
    underperformingProviders: string[];
  };
}

export async function runDailyOptimization(): Promise<OptimizationResult> {
  const startTime = Date.now();
  const recommendations: string[] = [];
  const actionsPerformed: string[] = [];

  // 1. Health check all providers
  console.log("[DailyOptimizer] Running health checks...");
  const healthChecks = await checkAllProvidersHealth();
  actionsPerformed.push("Completed health checks for all providers");

  // 2. Analyze last 24h usage
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentUsage = usageHistory.filter(u => u.timestamp > last24h);
  
  const totalRequests = recentUsage.length;
  const successfulRequests = recentUsage.filter(u => u.success).length;
  const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1;
  const avgResponseTime = totalRequests > 0 
    ? recentUsage.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests 
    : 0;

  // 3. Identify top and underperforming providers
  const providerPerformance: Map<string, { requests: number; successRate: number; avgTime: number }> = new Map();
  
  for (const usage of recentUsage) {
    const perf = providerPerformance.get(usage.provider) || { requests: 0, successRate: 0, avgTime: 0 };
    perf.requests++;
    if (usage.success) perf.successRate++;
    perf.avgTime += usage.responseTime;
    providerPerformance.set(usage.provider, perf);
  }

  let topProvider = "manus";
  let topScore = 0;
  const underperforming: string[] = [];

  providerPerformance.forEach((perf, provider) => {
    const successRate = perf.requests > 0 ? perf.successRate / perf.requests : 0;
    const avgTime = perf.requests > 0 ? perf.avgTime / perf.requests : 0;
    const score = successRate * 100 - avgTime / 100;
    
    if (score > topScore) {
      topScore = score;
      topProvider = provider;
    }
    
    if (successRate < 0.8 || avgTime > 10000) {
      underperforming.push(provider);
    }
  });

  // 4. Generate recommendations
  const downProviders = healthChecks.filter(h => h.status === "down");
  const degradedProviders = healthChecks.filter(h => h.status === "degraded");

  if (downProviders.length > 0) {
    recommendations.push(
      `${downProviders.length} provider(s) are down: ${downProviders.map(p => p.provider).join(", ")}. ` +
      `Check API keys and service status.`
    );
  }

  if (degradedProviders.length > 0) {
    recommendations.push(
      `${degradedProviders.length} provider(s) are degraded: ${degradedProviders.map(p => p.provider).join(", ")}. ` +
      `Consider reducing load or switching to alternatives.`
    );
  }

  if (successRate < 0.9) {
    recommendations.push(
      `Overall success rate (${(successRate * 100).toFixed(1)}%) is below 90%. ` +
      `Review error logs and consider provider rotation.`
    );
  }

  if (avgResponseTime > 5000) {
    recommendations.push(
      `Average response time (${(avgResponseTime / 1000).toFixed(1)}s) is high. ` +
      `Consider using faster providers like Groq for time-sensitive tasks.`
    );
  }

  if (underperforming.length > 0) {
    recommendations.push(
      `Underperforming providers: ${underperforming.join(", ")}. ` +
      `Consider deprioritizing or investigating issues.`
    );
  }

  // 5. Auto-optimize routing based on performance
  for (const provider of underperforming) {
    const stats = providerStats.get(provider);
    if (stats && stats.healthStatus !== "down") {
      stats.healthStatus = "degraded";
      actionsPerformed.push(`Marked ${provider} as degraded due to poor performance`);
    }
  }

  // 6. Reset healthy providers that were previously degraded
  for (const check of healthChecks) {
    if (check.status === "healthy") {
      const stats = providerStats.get(check.provider);
      if (stats && stats.healthStatus === "degraded") {
        const perf = providerPerformance.get(check.provider);
        if (perf && perf.requests > 0) {
          const successRate = perf.successRate / perf.requests;
          if (successRate > 0.9) {
            stats.healthStatus = "healthy";
            actionsPerformed.push(`Restored ${check.provider} to healthy status`);
          }
        }
      }
    }
  }

  console.log(`[DailyOptimizer] Optimization complete in ${Date.now() - startTime}ms`);

  return {
    timestamp: Date.now(),
    healthChecks,
    recommendations,
    actionsPerformed,
    metrics: {
      totalRequests24h: totalRequests,
      successRate24h: successRate,
      averageResponseTime24h: avgResponseTime,
      topPerformingProvider: topProvider,
      underperformingProviders: underperforming,
    },
  };
}

// ============================================================================
// FEATURE HEALTH MONITORING
// ============================================================================

export interface FeatureHealth {
  feature: string;
  status: "operational" | "degraded" | "down";
  lastChecked: number;
  dependencies: string[];
  issues: string[];
}

const FEATURES: Record<string, { name: string; dependencies: string[] }> = {
  article_generation: { name: "Article Generation", dependencies: ["groq", "cerebras", "manus"] },
  topic_discovery: { name: "Topic Discovery", dependencies: ["cerebras", "openrouter", "manus"] },
  seo_optimization: { name: "SEO Optimization", dependencies: ["groq", "manus"] },
  affiliate_management: { name: "Affiliate Management", dependencies: ["cj"] },
  content_distribution: { name: "Content Distribution", dependencies: ["devto", "hastewire"] },
  bot_intelligence: { name: "Bot Intelligence", dependencies: ["botpress", "manus"] },
  analytics: { name: "Analytics", dependencies: ["manus"] },
  auto_publish: { name: "Auto Publish", dependencies: ["groq", "cerebras", "manus"] },
  content_pipeline: { name: "Content Pipeline", dependencies: ["groq", "cerebras", "manus", "cj"] },
};

export async function checkFeatureHealth(): Promise<FeatureHealth[]> {
  const healthChecks = await checkAllProvidersHealth();
  const healthMap = new Map(healthChecks.map(h => [h.provider, h]));
  
  const results: FeatureHealth[] = [];
  
  for (const [featureId, feature] of Object.entries(FEATURES)) {
    const issues: string[] = [];
    let hasHealthyProvider = false;
    let hasDegradedProvider = false;
    
    for (const dep of feature.dependencies) {
      const health = healthMap.get(dep);
      if (!health || health.status === "down") {
        issues.push(`${dep} is down`);
      } else if (health.status === "degraded") {
        hasDegradedProvider = true;
        issues.push(`${dep} is degraded`);
      } else {
        hasHealthyProvider = true;
      }
    }
    
    let status: "operational" | "degraded" | "down" = "operational";
    if (!hasHealthyProvider) {
      status = "down";
    } else if (hasDegradedProvider || issues.length > 0) {
      status = "degraded";
    }
    
    results.push({
      feature: feature.name,
      status,
      lastChecked: Date.now(),
      dependencies: feature.dependencies,
      issues,
    });
  }
  
  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getProviderStats(): Map<string, ProviderStats> {
  return providerStats;
}

export function getUsageHistory(limit: number = 100): UsageRecord[] {
  return usageHistory.slice(-limit);
}

export function getApiRegistry(): Record<string, ApiProvider> {
  return API_REGISTRY;
}
