/**
 * Automated Content Pipeline Service
 * 
 * Connects Multi-LLM Intelligence to Auto Publish for hands-free content creation.
 * This service orchestrates the entire content generation workflow:
 * 
 * 1. Topic Discovery - Uses LLM to find trending, monetizable topics
 * 2. Content Generation - Creates SEO-optimized articles with affiliate hooks
 * 3. Affiliate Matching - Automatically matches and inserts relevant affiliate links
 * 4. SEO Optimization - Optimizes titles, meta descriptions, and keywords
 * 5. Auto Publishing - Schedules and publishes content automatically
 * 6. Distribution - Syncs with distribution platforms
 */

import { 
  invokeMultiLLM, 
  generateArticle, 
  optimizeSEO, 
  researchTopics, 
  matchAffiliateProducts,
  generateHeadlines,
  getAvailableProviders,
  type LLMTaskType 
} from "./multiLlm";

// Pipeline configuration
export interface PipelineConfig {
  // Content settings
  articlesPerCycle: number;
  wordCountMin: number;
  wordCountMax: number;
  contentStyle: "informative" | "persuasive" | "review" | "comparison" | "listicle";
  
  // Targeting
  targetNiches: string[];
  focusKeywords: string[];
  
  // Affiliate settings
  minAffiliateLinks: number;
  maxAffiliateLinks: number;
  affiliateDensity: "low" | "medium" | "high" | "aggressive";
  
  // Publishing settings
  autoPublish: boolean;
  autoDistribute: boolean;
  publishDelay: number; // minutes between articles
  
  // Quality settings
  minSeoScore: number;
  requireImages: boolean;
  
  // LLM settings
  preferredProvider?: string;
  temperature: number;
}

// Default pipeline configuration
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  articlesPerCycle: 5,
  wordCountMin: 1500,
  wordCountMax: 3000,
  contentStyle: "persuasive",
  targetNiches: ["technology", "finance", "health", "lifestyle"],
  focusKeywords: [],
  minAffiliateLinks: 3,
  maxAffiliateLinks: 7,
  affiliateDensity: "high",
  autoPublish: true,
  autoDistribute: true,
  publishDelay: 5,
  minSeoScore: 70,
  requireImages: false,
  temperature: 0.7,
};

// Pipeline execution result
export interface PipelineResult {
  success: boolean;
  articlesGenerated: number;
  articlesPublished: number;
  affiliateLinksInserted: number;
  errors: string[];
  executionTime: number;
  details: PipelineStepResult[];
}

export interface PipelineStepResult {
  step: string;
  success: boolean;
  duration: number;
  details: string;
  data?: any;
}

// Affiliate link structure
interface AffiliateLink {
  id: number;
  name: string;
  url: string;
  category: string;
  description?: string;
}

// Topic structure
interface TopicData {
  title: string;
  description: string;
  keywords: string[];
  monetizationAngle: string;
  searchIntent: string;
  difficulty: string;
}

/**
 * Generate monetizable topics using Multi-LLM
 */
export async function discoverTopics(
  niches: string[],
  count: number,
  existingTopics: string[] = []
): Promise<{ topics: TopicData[]; provider: string }> {
  const nicheList = niches.length > 0 ? niches.join(", ") : "technology, finance, health, lifestyle";
  
  const systemPrompt = `You are an expert content strategist and affiliate marketing specialist. 
Your goal is to identify HIGHLY MONETIZABLE topics that:
1. Have strong buyer intent (people ready to purchase)
2. Match popular affiliate product categories
3. Are currently trending or evergreen
4. Have low to medium competition
5. Can naturally incorporate product recommendations

Focus on topics that lead to affiliate conversions, not just traffic.`;

  const userPrompt = `Find ${count} highly monetizable content topics in these niches: ${nicheList}

${existingTopics.length > 0 ? `Avoid these existing topics:\n${existingTopics.slice(0, 20).join("\n")}\n\n` : ""}

For each topic, provide:
- A compelling, SEO-friendly title
- Brief description of monetization potential
- 5 high-value keywords (buyer intent preferred)
- Specific monetization angle (what products/services to promote)
- Search intent (informational/commercial/transactional)
- Competition level (low/medium/high)

Respond in JSON format:
{
  "topics": [
    {
      "title": "Topic title",
      "description": "Why this topic converts",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "monetizationAngle": "How to monetize this topic",
      "searchIntent": "commercial",
      "difficulty": "low"
    }
  ]
}`;

  const response = await invokeMultiLLM("topic_research", [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { maxTokens: 3000, temperature: 0.8 });

  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { 
        topics: parsed.topics || [], 
        provider: response.provider 
      };
    }
  } catch (e) {
    console.error("[ContentPipeline] Failed to parse topics:", e);
  }

  return { topics: [], provider: response.provider };
}

/**
 * Generate a high-converting article with affiliate hooks
 */
export async function generateMonetizedArticle(
  topic: TopicData,
  affiliateLinks: AffiliateLink[],
  config: PipelineConfig
): Promise<{ content: string; seoData: any; provider: string }> {
  const wordCount = Math.floor(
    Math.random() * (config.wordCountMax - config.wordCountMin) + config.wordCountMin
  );

  // Build affiliate context for the LLM
  const affiliateContext = affiliateLinks.length > 0
    ? `\n\nAVAILABLE AFFILIATE PRODUCTS TO RECOMMEND (naturally integrate ${config.minAffiliateLinks}-${config.maxAffiliateLinks} of these):\n${affiliateLinks.slice(0, 15).map(l => `- ${l.name} (${l.category}): ${l.description || 'Quality product'}`).join('\n')}`
    : '';

  const densityInstructions = {
    low: "Include 2-3 subtle product mentions",
    medium: "Include 4-5 product recommendations with soft CTAs",
    high: "Include 5-7 product recommendations with clear CTAs throughout",
    aggressive: "Include 7-10 product recommendations with multiple strong CTAs, comparison tables, and urgency elements",
  };

  const styleInstructions = {
    informative: "Write in an educational, helpful tone that builds trust",
    persuasive: "Write in a compelling, benefit-focused tone that drives action",
    review: "Write as a detailed product review with pros, cons, and recommendations",
    comparison: "Write as a comparison guide helping readers choose between options",
    listicle: "Write as a numbered list of recommendations or tips",
  };

  const systemPrompt = `You are an ELITE affiliate content writer with proven conversion skills.
Your content MUST:
1. Hook readers immediately with a compelling opening
2. ${styleInstructions[config.contentStyle]}
3. ${densityInstructions[config.affiliateDensity]}
4. Use power words: exclusive, proven, guaranteed, limited, breakthrough, secret
5. Include strategic H2/H3 headings with keywords
6. Add comparison tables or pros/cons lists where relevant
7. Create urgency without being pushy
8. End with a strong call-to-action
9. Be ${wordCount} words for maximum SEO value

Write in markdown format with proper heading structure.${affiliateContext}`;

  const userPrompt = `Write a high-converting ${config.contentStyle} article about: "${topic.title}"

Target Keywords: ${topic.keywords.join(", ")}
Monetization Angle: ${topic.monetizationAngle}
Search Intent: ${topic.searchIntent}

Requirements:
- Start with an attention-grabbing hook
- Use H2 and H3 headings strategically
- Include practical value for readers
- Naturally weave in product recommendations
- Add a FAQ section if appropriate
- End with a compelling CTA

Write the complete article now:`;

  const response = await invokeMultiLLM("article_generation", [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { maxTokens: 8000, temperature: config.temperature });

  // Generate SEO metadata
  const seoResponse = await optimizeSEO(response.content, topic.keywords[0]);

  return {
    content: response.content,
    seoData: seoResponse,
    provider: response.provider,
  };
}

/**
 * Match and insert affiliate links into content
 */
export async function insertAffiliateLinks(
  content: string,
  affiliateLinks: AffiliateLink[],
  maxLinks: number = 7
): Promise<{ content: string; linksInserted: number; linkIds: number[] }> {
  if (affiliateLinks.length === 0) {
    return { content, linksInserted: 0, linkIds: [] };
  }

  // Use LLM to intelligently match products to content
  const matchResponse = await matchAffiliateProducts(
    content,
    affiliateLinks.map(l => ({
      name: l.name,
      category: l.category,
      description: l.description || "",
    }))
  );

  let modifiedContent = content;
  const insertedLinkIds: number[] = [];
  let linksInserted = 0;

  // Insert matched affiliate links
  for (const match of matchResponse.matches.slice(0, maxLinks)) {
    const link = affiliateLinks.find(l => l.name === match.product);
    if (link && !insertedLinkIds.includes(link.id)) {
      // Find a good insertion point based on the placement suggestion
      const placementKeywords = match.placement.toLowerCase().split(" ").slice(0, 3);
      
      // Create affiliate link markdown
      const affiliateMarkdown = `[${link.name}](${link.url})`;
      
      // Try to insert near relevant content
      const contentLower = modifiedContent.toLowerCase();
      for (const keyword of placementKeywords) {
        const index = contentLower.indexOf(keyword);
        if (index !== -1) {
          // Find end of sentence
          const sentenceEnd = modifiedContent.indexOf(".", index);
          if (sentenceEnd !== -1 && sentenceEnd < index + 200) {
            // Insert recommendation after sentence
            const insertion = ` Check out ${affiliateMarkdown} for the best results.`;
            modifiedContent = modifiedContent.slice(0, sentenceEnd + 1) + insertion + modifiedContent.slice(sentenceEnd + 1);
            insertedLinkIds.push(link.id);
            linksInserted++;
            break;
          }
        }
      }
    }
  }

  // If we haven't inserted enough links, add some at the end
  if (linksInserted < 3 && affiliateLinks.length > 0) {
    const remainingLinks = affiliateLinks.filter(l => !insertedLinkIds.includes(l.id)).slice(0, 3 - linksInserted);
    if (remainingLinks.length > 0) {
      let recommendations = "\n\n## Recommended Products\n\n";
      for (const link of remainingLinks) {
        recommendations += `- [${link.name}](${link.url}) - ${link.description || 'Top-rated choice'}\n`;
        insertedLinkIds.push(link.id);
        linksInserted++;
      }
      modifiedContent += recommendations;
    }
  }

  return {
    content: modifiedContent,
    linksInserted,
    linkIds: insertedLinkIds,
  };
}

/**
 * Generate optimized headlines for A/B testing
 */
export async function generateOptimizedHeadlines(
  topic: string,
  style: "clickbait" | "informative" | "question" | "listicle" = "informative"
): Promise<string[]> {
  return generateHeadlines(topic, 5, style);
}

/**
 * Calculate content quality score
 */
export function calculateContentScore(content: string, keywords: string[]): number {
  let score = 50; // Base score

  // Word count scoring
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 1500) score += 10;
  if (wordCount >= 2000) score += 10;
  if (wordCount >= 2500) score += 5;

  // Heading structure
  const h2Count = (content.match(/^##\s/gm) || []).length;
  const h3Count = (content.match(/^###\s/gm) || []).length;
  if (h2Count >= 3) score += 5;
  if (h3Count >= 2) score += 5;

  // Keyword presence
  const contentLower = content.toLowerCase();
  let keywordHits = 0;
  for (const keyword of keywords) {
    if (contentLower.includes(keyword.toLowerCase())) {
      keywordHits++;
    }
  }
  score += Math.min(keywordHits * 3, 15);

  // Link presence
  const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  if (linkCount >= 3) score += 5;
  if (linkCount >= 5) score += 5;

  // List presence
  const listItems = (content.match(/^[-*]\s/gm) || []).length;
  if (listItems >= 5) score += 5;

  return Math.min(score, 100);
}

/**
 * Main pipeline execution function
 */
export async function runContentPipeline(
  config: PipelineConfig,
  affiliateLinks: AffiliateLink[],
  existingTopics: string[] = [],
  onArticleGenerated?: (article: { title: string; content: string; seoData: any }) => Promise<number>
): Promise<PipelineResult> {
  const startTime = Date.now();
  const result: PipelineResult = {
    success: false,
    articlesGenerated: 0,
    articlesPublished: 0,
    affiliateLinksInserted: 0,
    errors: [],
    executionTime: 0,
    details: [],
  };

  try {
    // Check if any LLM providers are available
    const providers = getAvailableProviders();
    if (providers.length === 0) {
      result.errors.push("No LLM providers available. Please configure at least one API key.");
      return result;
    }

    console.log(`[ContentPipeline] Starting with providers: ${providers.join(", ")}`);

    // Step 1: Discover topics
    const topicStart = Date.now();
    const { topics, provider: topicProvider } = await discoverTopics(
      config.targetNiches,
      config.articlesPerCycle,
      existingTopics
    );

    result.details.push({
      step: "Topic Discovery",
      success: topics.length > 0,
      duration: Date.now() - topicStart,
      details: `Found ${topics.length} topics using ${topicProvider}`,
      data: { topics: topics.map(t => t.title) },
    });

    if (topics.length === 0) {
      result.errors.push("Failed to discover topics");
      return result;
    }

    // Step 2: Generate articles for each topic
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const articleStart = Date.now();

      try {
        // Generate article
        const { content, seoData, provider } = await generateMonetizedArticle(
          topic,
          affiliateLinks,
          config
        );

        // Insert affiliate links
        const { content: finalContent, linksInserted, linkIds } = await insertAffiliateLinks(
          content,
          affiliateLinks,
          config.maxAffiliateLinks
        );

        // Calculate quality score
        const qualityScore = calculateContentScore(finalContent, topic.keywords);

        result.details.push({
          step: `Article ${i + 1}: ${topic.title}`,
          success: true,
          duration: Date.now() - articleStart,
          details: `Generated ${finalContent.split(/\s+/).length} words, ${linksInserted} affiliate links, quality score: ${qualityScore}`,
          data: {
            title: topic.title,
            wordCount: finalContent.split(/\s+/).length,
            linksInserted,
            qualityScore,
            provider,
          },
        });

        result.articlesGenerated++;
        result.affiliateLinksInserted += linksInserted;

        // Call the article handler if provided
        if (onArticleGenerated) {
          const articleId = await onArticleGenerated({
            title: seoData.title || topic.title,
            content: finalContent,
            seoData: {
              ...seoData,
              keywords: topic.keywords,
              focusKeyword: topic.keywords[0],
            },
          });

          if (config.autoPublish && articleId) {
            result.articlesPublished++;
          }
        }

        // Add delay between articles to avoid rate limits
        if (i < topics.length - 1 && config.publishDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, config.publishDelay * 1000));
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to generate article "${topic.title}": ${errorMsg}`);
        result.details.push({
          step: `Article ${i + 1}: ${topic.title}`,
          success: false,
          duration: Date.now() - articleStart,
          details: `Error: ${errorMsg}`,
        });
      }
    }

    result.success = result.articlesGenerated > 0;
    result.executionTime = Date.now() - startTime;

    console.log(`[ContentPipeline] Completed: ${result.articlesGenerated} articles, ${result.affiliateLinksInserted} links, ${result.executionTime}ms`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Pipeline error: ${errorMsg}`);
    result.executionTime = Date.now() - startTime;
  }

  return result;
}

// Export configuration type for external use
export type { AffiliateLink, TopicData };
