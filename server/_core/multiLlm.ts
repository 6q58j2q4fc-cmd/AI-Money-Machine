/**
 * Multi-LLM Service with Intelligent Task Routing
 * 
 * Routes different tasks to the most appropriate LLM provider based on:
 * - Task complexity and requirements
 * - Provider rate limits and availability
 * - Model capabilities and intelligence
 * 
 * Supported Providers (all FREE):
 * - Groq: Fastest inference, best for articles
 * - Cerebras: Highest volume, best for complex reasoning
 * - OpenRouter: Model diversity, DeepSeek R1 for deep research
 * - Google AI Studio: Gemini for multimodal tasks
 */

import { ENV } from "./env";

// Task types that the LLM router handles
export type LLMTaskType = 
  | "article_generation"      // Long-form content (1500-3000 words)
  | "seo_optimization"        // Titles, meta descriptions, keywords
  | "topic_research"          // Trending topics, market analysis
  | "affiliate_matching"      // Product-to-content matching
  | "content_rewriting"       // Paraphrasing, style adaptation
  | "headline_generation"     // Click-worthy titles, CTAs
  | "performance_analysis"    // Content performance insights
  | "quick_task"              // Classification, sentiment, short responses
  | "deep_reasoning"          // Complex analysis, research synthesis
  | "code_generation";        // Automation scripts, structured output

// Provider configuration
interface ProviderConfig {
  name: string;
  endpoint: string;
  models: Record<string, string>;
  headers: (apiKey: string) => Record<string, string>;
  formatRequest: (messages: Message[], model: string, options?: LLMOptions) => any;
  parseResponse: (response: any) => string;
  rateLimit: {
    requestsPerDay: number;
    tokensPerMinute: number;
  };
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Provider configurations
const PROVIDERS: Record<string, ProviderConfig> = {
  groq: {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    models: {
      fast: "llama-3.3-70b-versatile",
      quick: "llama-3.1-8b-instant",
      reasoning: "llama-3.3-70b-versatile",
    },
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    formatRequest: (messages, model, options) => ({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
    }),
    parseResponse: (response) => response.choices[0]?.message?.content || "",
    rateLimit: { requestsPerDay: 1000, tokensPerMinute: 12000 },
  },
  
  cerebras: {
    name: "Cerebras",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    models: {
      fast: "llama-3.3-70b",
      reasoning: "qwen-3-235b-a22b",
      quick: "llama-3.1-8b",
    },
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
    formatRequest: (messages, model, options) => ({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
    }),
    parseResponse: (response) => response.choices[0]?.message?.content || "",
    rateLimit: { requestsPerDay: 14400, tokensPerMinute: 60000 },
  },
  
  openrouter: {
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    models: {
      fast: "meta-llama/llama-3.3-70b-instruct:free",
      reasoning: "deepseek/deepseek-r1-0528:free",
      quick: "meta-llama/llama-3.2-3b-instruct:free",
      creative: "moonshotai/kimi-k2:free",
    },
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://moneymachine.app",
      "X-Title": "MoneyMachine",
    }),
    formatRequest: (messages, model, options) => ({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP ?? 1,
    }),
    parseResponse: (response) => response.choices[0]?.message?.content || "",
    rateLimit: { requestsPerDay: 50, tokensPerMinute: 100000 },
  },
  
  google: {
    name: "Google AI Studio",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    models: {
      fast: "gemini-2.0-flash",
      reasoning: "gemini-2.5-flash-preview-05-20",
      quick: "gemini-2.0-flash-lite",
    },
    headers: () => ({
      "Content-Type": "application/json",
    }),
    formatRequest: (messages, model, options) => ({
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
        topP: options?.topP ?? 1,
      },
    }),
    parseResponse: (response) => response.candidates?.[0]?.content?.parts?.[0]?.text || "",
    rateLimit: { requestsPerDay: 20, tokensPerMinute: 250000 },
  },
};

// Task to provider/model mapping
const TASK_ROUTING: Record<LLMTaskType, { provider: string; modelType: string; fallback?: { provider: string; modelType: string } }> = {
  article_generation: { 
    provider: "groq", 
    modelType: "fast",
    fallback: { provider: "cerebras", modelType: "fast" }
  },
  seo_optimization: { 
    provider: "groq", 
    modelType: "fast",
    fallback: { provider: "cerebras", modelType: "fast" }
  },
  topic_research: { 
    provider: "cerebras", 
    modelType: "reasoning",
    fallback: { provider: "openrouter", modelType: "reasoning" }
  },
  affiliate_matching: { 
    provider: "groq", 
    modelType: "quick",
    fallback: { provider: "cerebras", modelType: "quick" }
  },
  content_rewriting: { 
    provider: "groq", 
    modelType: "fast",
    fallback: { provider: "cerebras", modelType: "fast" }
  },
  headline_generation: { 
    provider: "groq", 
    modelType: "quick",
    fallback: { provider: "cerebras", modelType: "quick" }
  },
  performance_analysis: { 
    provider: "cerebras", 
    modelType: "reasoning",
    fallback: { provider: "groq", modelType: "reasoning" }
  },
  quick_task: { 
    provider: "groq", 
    modelType: "quick",
    fallback: { provider: "cerebras", modelType: "quick" }
  },
  deep_reasoning: { 
    provider: "openrouter", 
    modelType: "reasoning",
    fallback: { provider: "cerebras", modelType: "reasoning" }
  },
  code_generation: { 
    provider: "groq", 
    modelType: "fast",
    fallback: { provider: "cerebras", modelType: "fast" }
  },
};

// API key retrieval
function getApiKey(provider: string): string | null {
  switch (provider) {
    case "groq":
      return ENV.groqApiKey || null;
    case "cerebras":
      return ENV.cerebrasApiKey || null;
    case "openrouter":
      return ENV.openrouterApiKey || null;
    case "google":
      return ENV.googleAiApiKey || null;
    default:
      return null;
  }
}

// Check if provider is available
function isProviderAvailable(provider: string): boolean {
  const apiKey = getApiKey(provider);
  return !!apiKey && apiKey.length > 0;
}

// Get available providers
export function getAvailableProviders(): string[] {
  return Object.keys(PROVIDERS).filter(isProviderAvailable);
}

// Make LLM request to a specific provider
async function callProvider(
  provider: string,
  modelType: string,
  messages: Message[],
  options?: LLMOptions
): Promise<LLMResponse> {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }
  
  const model = config.models[modelType];
  if (!model) {
    throw new Error(`Unknown model type ${modelType} for provider ${provider}`);
  }
  
  let endpoint = config.endpoint;
  let body = config.formatRequest(messages, model, options);
  
  // Google AI Studio has a different endpoint structure
  if (provider === "google") {
    endpoint = `${config.endpoint}/${model}:generateContent?key=${apiKey}`;
  }
  
  console.log(`[MultiLLM] Calling ${config.name} with model ${model}`);
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: config.headers(apiKey),
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MultiLLM] ${config.name} error:`, errorText);
    throw new Error(`${config.name} API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const content = config.parseResponse(data);
  
  return {
    content,
    provider: config.name,
    model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}

/**
 * Main function to invoke LLM with intelligent routing
 * Automatically selects the best provider based on task type
 */
export async function invokeMultiLLM(
  taskType: LLMTaskType,
  messages: Message[],
  options?: LLMOptions
): Promise<LLMResponse> {
  const routing = TASK_ROUTING[taskType];
  
  // Try primary provider first
  if (isProviderAvailable(routing.provider)) {
    try {
      return await callProvider(routing.provider, routing.modelType, messages, options);
    } catch (error) {
      console.warn(`[MultiLLM] Primary provider ${routing.provider} failed:`, error);
    }
  }
  
  // Try fallback provider
  if (routing.fallback && isProviderAvailable(routing.fallback.provider)) {
    try {
      console.log(`[MultiLLM] Using fallback provider ${routing.fallback.provider}`);
      return await callProvider(routing.fallback.provider, routing.fallback.modelType, messages, options);
    } catch (error) {
      console.warn(`[MultiLLM] Fallback provider ${routing.fallback.provider} failed:`, error);
    }
  }
  
  // Try any available provider
  const availableProviders = getAvailableProviders();
  for (const provider of availableProviders) {
    if (provider !== routing.provider && provider !== routing.fallback?.provider) {
      try {
        console.log(`[MultiLLM] Trying alternative provider ${provider}`);
        return await callProvider(provider, "fast", messages, options);
      } catch (error) {
        console.warn(`[MultiLLM] Alternative provider ${provider} failed:`, error);
      }
    }
  }
  
  throw new Error("No LLM providers available. Please configure at least one API key.");
}

/**
 * Direct provider call (bypass routing)
 */
export async function callLLMDirect(
  provider: string,
  modelType: string,
  messages: Message[],
  options?: LLMOptions
): Promise<LLMResponse> {
  return callProvider(provider, modelType, messages, options);
}

/**
 * Helper function for article generation
 */
export async function generateArticle(
  topic: string,
  keywords: string[],
  wordCount: number = 2000,
  style: string = "informative"
): Promise<LLMResponse> {
  const systemPrompt = `You are an expert content writer specializing in SEO-optimized articles. 
Write engaging, well-researched content that naturally incorporates keywords while providing genuine value to readers.
Use proper heading structure (H2, H3), include relevant examples, and maintain a ${style} tone throughout.`;

  const userPrompt = `Write a ${wordCount}-word article about: ${topic}

Keywords to naturally incorporate: ${keywords.join(", ")}

Requirements:
- Start with an engaging introduction that hooks the reader
- Use clear H2 and H3 headings to structure the content
- Include practical examples and actionable insights
- End with a compelling conclusion
- Optimize for SEO while maintaining readability
- Do not use markdown code blocks, just write the article directly`;

  return invokeMultiLLM("article_generation", [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { maxTokens: 8000, temperature: 0.7 });
}

/**
 * Helper function for SEO optimization
 */
export async function optimizeSEO(
  content: string,
  targetKeyword: string
): Promise<{ title: string; metaDescription: string; headings: string[]; suggestions: string[] }> {
  const systemPrompt = `You are an SEO expert. Analyze content and provide optimization recommendations.
Always respond in valid JSON format.`;

  const userPrompt = `Analyze this content for SEO optimization targeting the keyword "${targetKeyword}":

${content.substring(0, 3000)}...

Provide a JSON response with:
{
  "title": "SEO-optimized title (60 chars max)",
  "metaDescription": "Compelling meta description (155 chars max)",
  "headings": ["Suggested H2 headings"],
  "suggestions": ["Specific SEO improvement suggestions"]
}`;

  const response = await invokeMultiLLM("seo_optimization", [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { maxTokens: 1000, temperature: 0.3 });

  try {
    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("[MultiLLM] Failed to parse SEO response:", e);
  }
  
  return {
    title: targetKeyword,
    metaDescription: `Learn about ${targetKeyword}`,
    headings: [],
    suggestions: ["Could not parse SEO suggestions"],
  };
}

/**
 * Helper function for topic research
 */
export async function researchTopics(
  niche: string,
  count: number = 10
): Promise<{ topics: { title: string; description: string; keywords: string[]; difficulty: string }[] }> {
  const systemPrompt = `You are a content strategist specializing in identifying trending topics with high monetization potential.
Always respond in valid JSON format.`;

  const userPrompt = `Research ${count} trending topics in the "${niche}" niche that have:
- High search volume potential
- Good affiliate marketing opportunities
- Low to medium competition
- Evergreen or trending appeal

Respond with JSON:
{
  "topics": [
    {
      "title": "Topic title",
      "description": "Brief description of why this topic is valuable",
      "keywords": ["related", "keywords"],
      "difficulty": "low|medium|high"
    }
  ]
}`;

  const response = await invokeMultiLLM("topic_research", [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { maxTokens: 2000, temperature: 0.8 });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("[MultiLLM] Failed to parse topics response:", e);
  }
  
  return { topics: [] };
}

/**
 * Helper function for affiliate matching
 */
export async function matchAffiliateProducts(
  articleContent: string,
  availableProducts: { name: string; category: string; description: string }[]
): Promise<{ matches: { product: string; relevance: number; placement: string }[] }> {
  const systemPrompt = `You are an affiliate marketing expert. Match products to content naturally.
Always respond in valid JSON format.`;

  const userPrompt = `Given this article content:
${articleContent.substring(0, 2000)}...

And these available affiliate products:
${JSON.stringify(availableProducts.slice(0, 20), null, 2)}

Identify the best product matches and suggest natural placement points.

Respond with JSON:
{
  "matches": [
    {
      "product": "Product name",
      "relevance": 0.95,
      "placement": "Suggested placement context in the article"
    }
  ]
}`;

  const response = await invokeMultiLLM("affiliate_matching", [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { maxTokens: 1000, temperature: 0.3 });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("[MultiLLM] Failed to parse affiliate matches:", e);
  }
  
  return { matches: [] };
}

/**
 * Helper function for headline generation
 */
export async function generateHeadlines(
  topic: string,
  count: number = 5,
  style: "clickbait" | "informative" | "question" | "listicle" = "informative"
): Promise<string[]> {
  const styleGuides = {
    clickbait: "Create attention-grabbing, curiosity-inducing headlines",
    informative: "Create clear, value-focused headlines",
    question: "Create question-based headlines that address reader pain points",
    listicle: "Create numbered list headlines (e.g., '10 Ways to...')",
  };

  const response = await invokeMultiLLM("headline_generation", [
    { role: "system", content: `You are a headline writing expert. ${styleGuides[style]}` },
    { role: "user", content: `Generate ${count} ${style} headlines for an article about: ${topic}\n\nRespond with just the headlines, one per line.` },
  ], { maxTokens: 500, temperature: 0.9 });

  return response.content.split("\n").filter(h => h.trim().length > 0).slice(0, count);
}

// Export types and utilities
export { PROVIDERS, TASK_ROUTING };
