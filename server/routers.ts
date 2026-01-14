import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { publishToPlatform, getConfiguredPlatforms } from "./_core/platformPublisher";
import { searchCJLinks, getJoinedAdvertiserLinks, getNonJoinedAdvertiserLinks, searchCJAdvertisers, getNonJoinedAdvertisers, getJoinedAdvertisers, getCJProgramUrl } from "./_core/cjApi";
import { syncApprovedCJLinks, getApprovedAdvertiserIds, getApprovedAdvertiserNames, isLinkApproved } from "./_core/cjSync";
import { createBotpressService, BotCommands } from "./_core/botpressApi";
import { invokeMultiLLM, generateArticle, optimizeSEO, researchTopics, matchAffiliateProducts, generateHeadlines, getAvailableProviders, type LLMTaskType } from "./_core/multiLlm";
import { runContentPipeline, DEFAULT_PIPELINE_CONFIG, type PipelineConfig, discoverTopics, generateMonetizedArticle, insertAffiliateLinks, calculateContentScore } from "./_core/contentPipeline";
import { runDailyOptimization, checkAllProvidersHealth, checkFeatureHealth, routeTask, recordUsage, getProviderStats, getUsageHistory, getApiRegistry, type OptimizationResult, type HealthCheckResult, type FeatureHealth, type TaskRoutingDecision } from "./_core/dailyOptimizer";
import { auditPage, auditAllPages, learnPageContext, generateFixRecommendations, verifyArticlePosting, generateInternalLinks, PAGE_DEFINITIONS, type PageAuditResult } from './_core/pageAuditor';
import { logEvent, logArticleEvent, logDistributionEvent, logAutomationEvent, logBotDecision, getPageInsights, communicateWithHiveMind, syncAllPages, getHiveMindState, initializePageContext } from './_core/hiveMind';
import { generateProductPage, publishProductPage, batchGenerateProductPages } from './_core/productPages';

// Slug generator helper
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

// Trending topics router
const topicsRouter = router({
  list: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getTrendingTopics(ctx.user.id, input?.category);
    }),
  
  discover: protectedProcedure
    .input(z.object({ niche: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Use LLM to discover trending topics
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a trend analyst. Generate 10 trending topics for content creation. Each topic should have potential for monetization through affiliate marketing or ads. Return JSON array with objects containing: title, category (one of: technology, finance, health, lifestyle, business, entertainment), popularityScore (1-100), searchVolume (e.g., "10K-50K"), competition (low/medium/high), keywords (array of 3-5 related keywords).`
          },
          {
            role: "user",
            content: input.niche 
              ? `Find trending topics in the ${input.niche} niche that are popular right now and have good monetization potential.`
              : `Find the top trending topics across all niches that are popular right now and have good monetization potential.`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "trending_topics",
            strict: true,
            schema: {
              type: "object",
              properties: {
                topics: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      category: { type: "string" },
                      popularityScore: { type: "integer" },
                      searchVolume: { type: "string" },
                      competition: { type: "string" },
                      keywords: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "category", "popularityScore", "searchVolume", "competition", "keywords"],
                    additionalProperties: false
                  }
                }
              },
              required: ["topics"],
              additionalProperties: false
            }
          }
        }
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (!content) throw new Error("Failed to generate topics");

      const parsed = JSON.parse(content);
      const topics = parsed.topics;

      // Save topics to database
      for (const topic of topics) {
        await db.createTrendingTopic({
          title: topic.title,
          category: topic.category,
          source: "ai-discovery",
          popularityScore: topic.popularityScore,
          searchVolume: topic.searchVolume,
          competition: topic.competition as "low" | "medium" | "high",
          keywords: topic.keywords,
          userId: ctx.user.id
        });
      }

      return topics;
    }),

  save: protectedProcedure
    .input(z.object({ topicId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.saveTopic(ctx.user.id, input.topicId, input.notes);
      return { success: true };
    }),

  unsave: protectedProcedure
    .input(z.object({ topicId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.unsaveTopic(ctx.user.id, input.topicId);
      return { success: true };
    }),

  saved: protectedProcedure.query(async ({ ctx }) => {
    return await db.getSavedTopics(ctx.user.id);
  }),
});

// Articles router
const articlesRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getArticles(ctx.user.id, input?.status);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await db.getArticleById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      focusKeyword: z.string().optional(),
      topicId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.title);
      const id = await db.createArticle({
        ...input,
        userId: ctx.user.id,
        slug,
        status: "draft",
      });
      // Log article creation event
      await logArticleEvent(ctx.user.id, 'article_created', id, input.title);
      return { id, slug };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      excerpt: z.string().optional(),
      status: z.enum(["draft", "review", "published", "archived"]).optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      focusKeyword: z.string().optional(),
      seoScore: z.number().optional(),
      readabilityScore: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      if (updates.title) {
        (updates as any).slug = generateSlug(updates.title);
      }
      if (updates.status === "published") {
        (updates as any).publishedAt = new Date();
      }
      await db.updateArticle(id, ctx.user.id, updates);
      // Log article update/publish event
      const article = await db.getArticleById(id, ctx.user.id);
      if (updates.status === 'published') {
        await logArticleEvent(ctx.user.id, 'article_published', id, article?.title || 'Unknown');
      } else {
        await logArticleEvent(ctx.user.id, 'article_updated', id, article?.title || 'Unknown');
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteArticle(input.id, ctx.user.id);
      return { success: true };
    }),

  generateContent: protectedProcedure
    .input(z.object({
      title: z.string(),
      keywords: z.array(z.string()).optional(),
      tone: z.enum(["professional", "casual", "informative", "persuasive"]).optional(),
      length: z.enum(["short", "medium", "long"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const lengthGuide = {
        short: "500-800 words",
        medium: "1000-1500 words",
        long: "2000-3000 words"
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert SEO content writer. Write engaging, well-structured articles optimized for search engines. Use markdown formatting with proper headings (H2, H3), bullet points, and bold text for emphasis. Include a compelling introduction and conclusion.`
          },
          {
            role: "user",
            content: `Write an article about "${input.title}".
${input.keywords?.length ? `Target keywords: ${input.keywords.join(", ")}` : ""}
Tone: ${input.tone || "professional"}
Target length: ${lengthGuide[input.length || "medium"]}

Make sure to:
1. Include the main keyword naturally in the first paragraph
2. Use subheadings that include related keywords
3. Write in an engaging, readable style
4. Include a call-to-action at the end`
          }
        ]
      });

      return {
        content: response.choices[0]?.message?.content || "",
      };
    }),

  generateOutline: protectedProcedure
    .input(z.object({
      title: z.string(),
      keywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an SEO content strategist. Generate detailed article outlines that are optimized for search engines and reader engagement.`
          },
          {
            role: "user",
            content: `Create a detailed outline for an article titled "${input.title}".
${input.keywords?.length ? `Target keywords: ${input.keywords.join(", ")}` : ""}

Return a JSON object with:
- introduction: brief description of the intro
- sections: array of objects with "heading" and "points" (array of bullet points)
- conclusion: brief description of the conclusion
- suggestedKeywords: array of additional keywords to target`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article_outline",
            strict: true,
            schema: {
              type: "object",
              properties: {
                introduction: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      points: { type: "array", items: { type: "string" } }
                    },
                    required: ["heading", "points"],
                    additionalProperties: false
                  }
                },
                conclusion: { type: "string" },
                suggestedKeywords: { type: "array", items: { type: "string" } }
              },
              required: ["introduction", "sections", "conclusion", "suggestedKeywords"],
              additionalProperties: false
            }
          }
        }
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (!content) throw new Error("Failed to generate outline");

      return JSON.parse(content);
    }),

  analyzeSEO: protectedProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      focusKeyword: z.string().optional(),
      metaDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an SEO expert. Analyze content and provide actionable SEO recommendations. Be specific and practical.`
          },
          {
            role: "user",
            content: `Analyze this content for SEO:

Title: ${input.title}
Focus Keyword: ${input.focusKeyword || "Not specified"}
Meta Description: ${input.metaDescription || "Not specified"}

Content:
${input.content.substring(0, 3000)}

Return JSON with:
- seoScore: number 0-100
- readabilityScore: number 0-100
- issues: array of objects with "type" (error/warning/info), "message", and "suggestion"
- strengths: array of strings
- keywordDensity: number (percentage)
- wordCount: number
- suggestedMetaTitle: string (max 60 chars)
- suggestedMetaDescription: string (max 160 chars)`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                seoScore: { type: "integer" },
                readabilityScore: { type: "integer" },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      message: { type: "string" },
                      suggestion: { type: "string" }
                    },
                    required: ["type", "message", "suggestion"],
                    additionalProperties: false
                  }
                },
                strengths: { type: "array", items: { type: "string" } },
                keywordDensity: { type: "number" },
                wordCount: { type: "integer" },
                suggestedMetaTitle: { type: "string" },
                suggestedMetaDescription: { type: "string" }
              },
              required: ["seoScore", "readabilityScore", "issues", "strengths", "keywordDensity", "wordCount", "suggestedMetaTitle", "suggestedMetaDescription"],
              additionalProperties: false
            }
          }
        }
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (!content) throw new Error("Failed to analyze SEO");

      return JSON.parse(content);
    }),

  getAffiliateLinks: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getArticleAffiliateLinks(input.articleId);
    }),

  addAffiliateLink: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      affiliateLinkId: z.number(),
      anchorText: z.string().optional(),
      position: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.addAffiliateLinkToArticle(input);
      return { success: true };
    }),

  removeAffiliateLink: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.removeAffiliateLinkFromArticle(input.id);
      return { success: true };
    }),
});

// Affiliate links router
const affiliateRouter = router({
  list: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getAffiliateLinks(ctx.user.id, input?.category);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await db.getAffiliateLinkById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      url: z.string().url(),
      shortCode: z.string().min(1),
      category: z.string().min(1),
      program: z.string().optional(),
      commission: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createAffiliateLink({
        ...input,
        userId: ctx.user.id,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      shortCode: z.string().optional(),
      category: z.string().optional(),
      program: z.string().optional(),
      commission: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      await db.updateAffiliateLink(id, ctx.user.id, updates);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteAffiliateLink(input.id, ctx.user.id);
      return { success: true };
    }),

  // Bulk import CJ affiliate links
  bulkImport: protectedProcedure
    .input(z.array(z.object({
      name: z.string(),
      url: z.string(),
      category: z.string(),
      program: z.string().optional(),
      commission: z.string().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const imported: number[] = [];
      for (const link of input) {
        const shortCode = `cj-${Math.random().toString(36).substring(2, 8)}`;
        const id = await db.createAffiliateLink({
          userId: ctx.user.id,
          name: link.name,
          url: link.url,
          shortCode,
          category: link.category,
          program: link.program || 'Commission Junction',
          commission: link.commission || '',
        });
        imported.push(id);
      }
      return { imported: imported.length, ids: imported };
    }),

  trackClick: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.incrementLinkClicks(input.id);
      return { success: true };
    }),

  suggestLinks: protectedProcedure
    .input(z.object({
      content: z.string(),
      existingLinks: z.array(z.object({
        id: z.number(),
        name: z.string(),
        category: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      if (input.existingLinks.length === 0) {
        return { suggestions: [] };
      }

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an affiliate marketing expert. Analyze content and suggest where to place affiliate links naturally.`
          },
          {
            role: "user",
            content: `Analyze this content and suggest where to place these affiliate links:

Content:
${input.content.substring(0, 2000)}

Available affiliate links:
${input.existingLinks.map(l => `- ID ${l.id}: ${l.name} (${l.category})`).join("\n")}

Return JSON with suggestions array, each containing:
- linkId: number (from available links)
- anchorText: string (text to use as link)
- context: string (sentence where link fits)
- reason: string (why this placement makes sense)`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "link_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      linkId: { type: "integer" },
                      anchorText: { type: "string" },
                      context: { type: "string" },
                      reason: { type: "string" }
                    },
                    required: ["linkId", "anchorText", "context", "reason"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (!content) return { suggestions: [] };

      return JSON.parse(content);
    }),
});

// Analytics router
const analyticsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    return await db.getAnalyticsSummary(ctx.user.id);
  }),

  recent: protectedProcedure
    .input(z.object({ days: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getRecentAnalytics(ctx.user.id, input?.days || 30);
    }),

  topArticles: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getTopPerformingArticles(ctx.user.id, input?.limit || 5);
    }),

  topLinks: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getTopPerformingLinks(ctx.user.id, input?.limit || 5);
    }),

  record: protectedProcedure
    .input(z.object({
      articleId: z.number().optional(),
      affiliateLinkId: z.number().optional(),
      eventType: z.enum(["view", "click", "conversion", "share"]),
      source: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.recordAnalyticsEvent({
        ...input,
        userId: ctx.user.id,
      });
      return { success: true };
    }),
});

// Commission Junction integration router
const cjRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return await db.getCJSettings(ctx.user.id);
  }),

  saveSettings: protectedProcedure
    .input(z.object({
      cid: z.string().min(1),
      websiteId: z.string().optional(),
      apiToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.saveCJSettings({
        userId: ctx.user.id,
        cid: input.cid,
        websiteId: input.websiteId,
        apiToken: input.apiToken,
        isActive: true,
      });
      return { id, success: true };
    }),

  getProducts: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getCJProducts(ctx.user.id, input?.category);
    }),

  syncProducts: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Use AI to generate sample CJ products for the category
      // In production, this would call the actual CJ API
      const settings = await db.getCJSettings(ctx.user.id);
      if (!settings) throw new Error("CJ settings not configured");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a product database. Generate 10 realistic affiliate products that could be found on Commission Junction. Return JSON with products array containing: advertiserId, advertiserName, category, productName, productUrl, affiliateUrl (use format https://www.anrdoezrs.net/click-${settings.cid}-[productid]), imageUrl, price (number), commission (e.g., "8%"), epc (earnings per click, number between 0.01 and 2.00).`
          },
          {
            role: "user",
            content: input.category 
              ? `Generate affiliate products in the ${input.category} category.`
              : `Generate affiliate products across various popular categories.`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cj_products",
            strict: true,
            schema: {
              type: "object",
              properties: {
                products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      advertiserId: { type: "string" },
                      advertiserName: { type: "string" },
                      category: { type: "string" },
                      productName: { type: "string" },
                      productUrl: { type: "string" },
                      affiliateUrl: { type: "string" },
                      imageUrl: { type: "string" },
                      price: { type: "number" },
                      commission: { type: "string" },
                      epc: { type: "number" }
                    },
                    required: ["advertiserId", "advertiserName", "category", "productName", "productUrl", "affiliateUrl", "imageUrl", "price", "commission", "epc"],
                    additionalProperties: false
                  }
                }
              },
              required: ["products"],
              additionalProperties: false
            }
          }
        }
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (!content) throw new Error("Failed to sync products");

      const parsed = JSON.parse(content);
      const products = parsed.products;

      // Save products to database
      const productsToSave = products.map((p: any) => ({
        userId: ctx.user.id,
        advertiserId: p.advertiserId,
        advertiserName: p.advertiserName,
        category: p.category,
        productName: p.productName,
        productUrl: p.productUrl,
        affiliateUrl: p.affiliateUrl,
        imageUrl: p.imageUrl,
        price: p.price.toString(),
        commission: p.commission,
        epc: p.epc.toString(),
        isActive: true,
      }));

      await db.bulkSaveCJProducts(productsToSave);
      
      // Update last sync time
      await db.saveCJSettings({
        userId: ctx.user.id,
        cid: settings.cid,
        lastSyncAt: new Date(),
      });

      return { count: products.length, products };
    }),

  importToAffiliateLinks: protectedProcedure
    .input(z.object({ productIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const imported: number[] = [];
      
      for (const productId of input.productIds) {
        const product = await db.getCJProductById(productId, ctx.user.id);
        if (!product) continue;

        const shortCode = `cj-${product.advertiserId}-${Date.now()}`;
        const id = await db.createAffiliateLink({
          userId: ctx.user.id,
          name: product.productName || product.advertiserName,
          url: product.affiliateUrl,
          shortCode,
          category: product.category || "General",
          program: "Commission Junction",
          commission: product.commission || "",
        });
        imported.push(id);
      }

      return { imported: imported.length, ids: imported };
    }),

  // Fetch real links from CJ API
  fetchRealLinks: protectedProcedure
    .input(z.object({
      keywords: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const settings = await db.getCJSettings(ctx.user.id);
      if (!settings?.websiteId) {
        throw new Error("CJ Website ID not configured. Please set it in CJ Integration settings.");
      }

      const result = await searchCJLinks({
        websiteId: settings.websiteId,
        keywords: input?.keywords,
        advertiserIds: "joined",
        recordsPerPage: 50,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch CJ links");
      }

      return {
        links: result.links,
        totalMatched: result.totalMatched,
      };
    }),

  // Import real CJ links to affiliate links
  importRealLinks: protectedProcedure
    .input(z.object({
      links: z.array(z.object({
        advertiserName: z.string(),
        linkName: z.string(),
        clickUrl: z.string(),
        category: z.string(),
        saleCommission: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const imported: number[] = [];

      for (const link of input.links) {
        const shortCode = `cj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const id = await db.createAffiliateLink({
          userId: ctx.user.id,
          name: link.linkName || link.advertiserName,
          url: link.clickUrl,
          shortCode,
          category: link.category || "General",
          program: "Commission Junction",
          commission: link.saleCommission || "",
        });
        imported.push(id);
      }

      return { imported: imported.length, ids: imported };
    }),

  // Get all joined advertiser links
  getJoinedLinks: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await db.getCJSettings(ctx.user.id);
    if (!settings?.websiteId) {
      throw new Error("CJ Website ID not configured. Please set it in CJ Integration settings.");
    }

    const result = await getJoinedAdvertiserLinks(settings.websiteId);

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch joined advertiser links");
    }

    return {
      links: result.links,
      totalMatched: result.totalMatched,
    };
  }),

  // Fetch non-joined advertiser links to show available programs
  fetchAvailableLinks: protectedProcedure
    .input(z.object({
      keywords: z.string().optional(),
      category: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const settings = await db.getCJSettings(ctx.user.id);
      if (!settings?.websiteId) {
        throw new Error("CJ Website ID not configured. Please set it in CJ Integration settings.");
      }

      const result = await getNonJoinedAdvertiserLinks(settings.websiteId, input?.keywords);

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch available links");
      }

      return {
        links: result.links,
        totalMatched: result.totalMatched,
      };
    }),

  // Search for advertisers (both joined and non-joined)
  searchAdvertisers: protectedProcedure
    .input(z.object({
      keywords: z.string().optional(),
      category: z.string().optional(),
      relationshipStatus: z.enum(["joined", "notjoined", ""]).optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const settings = await db.getCJSettings(ctx.user.id);
      if (!settings?.cid) {
        throw new Error("CJ Account ID (CID) not configured. Please set it in CJ Integration settings.");
      }

      const result = await searchCJAdvertisers({
        cid: settings.cid,
        keywords: input?.keywords,
        category: input?.category,
        relationshipStatus: input?.relationshipStatus as "joined" | "notjoined" | "" | undefined,
        recordsPerPage: 100,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to search advertisers");
      }

      return {
        advertisers: result.advertisers,
        totalMatched: result.totalMatched,
      };
    }),

  // Get non-joined advertisers to show available programs to join
  getAvailableAdvertisers: protectedProcedure
    .input(z.object({
      keywords: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const settings = await db.getCJSettings(ctx.user.id);
      if (!settings?.cid) {
        throw new Error("CJ Account ID (CID) not configured. Please set it in CJ Integration settings.");
      }

      const result = await getNonJoinedAdvertisers(settings.cid, input?.keywords);

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch available advertisers");
      }

      // Add program URLs to each advertiser
      const advertisersWithUrls = result.advertisers.map(adv => ({
        ...adv,
        applyUrl: getCJProgramUrl(adv.advertiserId),
      }));

      return {
        advertisers: advertisersWithUrls,
        totalMatched: result.totalMatched,
      };
    }),

  // Get joined advertisers
  getJoinedAdvertisers: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await db.getCJSettings(ctx.user.id);
    if (!settings?.cid) {
      throw new Error("CJ Account ID (CID) not configured. Please set it in CJ Integration settings.");
    }

    const result = await getJoinedAdvertisers(settings.cid);

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch joined advertisers");
    }

    return {
      advertisers: result.advertisers,
      totalMatched: result.totalMatched,
    };
  }),

  // Auto-sync: Automatically fetch and import links from joined advertisers
  autoSync: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await db.getCJSettings(ctx.user.id);
    if (!settings?.websiteId) {
      throw new Error("CJ Website ID not configured. Please set it in CJ Integration settings.");
    }

    // Fetch all links from joined advertisers
    const result = await getJoinedAdvertiserLinks(settings.websiteId);

    if (!result.success) {
      return {
        success: false,
        message: result.error || "No joined advertisers found. Apply to join advertisers first.",
        imported: 0,
        skipped: 0,
      };
    }

    // Get existing affiliate links to avoid duplicates
    const existingLinks = await db.getAffiliateLinks(ctx.user.id);
    const existingUrls = new Set(existingLinks.map(l => l.url));

    let imported = 0;
    let skipped = 0;

    for (const link of result.links) {
      // Skip if already imported
      if (existingUrls.has(link.clickUrl)) {
        skipped++;
        continue;
      }

      const shortCode = `cj-auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await db.createAffiliateLink({
        userId: ctx.user.id,
        name: link.linkName || link.advertiserName,
        url: link.clickUrl,
        shortCode,
        category: link.category || "General",
        program: "Commission Junction",
        commission: link.saleCommission || "",
      });
      imported++;
    }

    // Update last sync time
    await db.saveCJSettings({
      userId: ctx.user.id,
      cid: settings.cid,
      websiteId: settings.websiteId,
      lastSyncAt: new Date(),
    });

    return {
      success: true,
      message: `Auto-sync complete! Imported ${imported} new links, skipped ${skipped} duplicates.`,
      imported,
      skipped,
      totalAvailable: result.links.length,
    };
  }),

  // Get auto-sync status
  getAutoSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.getCJSettings(ctx.user.id);
    return {
      isConfigured: !!(settings?.websiteId && settings?.cid),
      lastSyncAt: settings?.lastSyncAt || null,
      cid: settings?.cid || null,
      websiteId: settings?.websiteId || null,
    };
  }),

  // Sync only approved CJ affiliate links (removes unapproved, imports approved)
  syncApprovedLinks: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await syncApprovedCJLinks();
    
    if (!result.success) {
      throw new Error(result.error || "Failed to sync approved CJ links");
    }
    
    return {
      success: true,
      message: `Synced approved CJ links: removed ${result.removedCount} unapproved, added ${result.addedCount} approved links.`,
      removedCount: result.removedCount,
      addedCount: result.addedCount,
      approvedAdvertisers: result.approvedAdvertisers,
    };
  }),

  // Get list of approved advertiser IDs
  getApprovedAdvertisers: protectedProcedure.query(async () => {
    const ids = await getApprovedAdvertiserIds();
    const names = await getApprovedAdvertiserNames();
    
    return {
      count: ids.length,
      advertisers: ids.map(id => ({
        id,
        name: names.get(id) || "Unknown",
      })),
    };
  }),

  // Check if a specific link is from an approved advertiser
  checkLinkApproval: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      const approved = await isLinkApproved(input.url);
      return { approved };
    }),
});

// Publishing queue router
const publishingRouter = router({
  queue: protectedProcedure.query(async ({ ctx }) => {
    return await db.getPublishingQueue(ctx.user.id);
  }),

  schedule: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      scheduledAt: z.string().transform(s => new Date(s)),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.addToPublishingQueue({
        userId: ctx.user.id,
        articleId: input.articleId,
        scheduledAt: input.scheduledAt,
        status: "pending",
      });
      return { id, success: true };
    }),

  publishNow: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Update article status to published
      await db.updateArticle(input.articleId, ctx.user.id, {
        status: "published",
        publishedAt: new Date(),
      });
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeFromPublishingQueue(input.id, ctx.user.id);
      return { success: true };
    }),
});

// Content queue router for auto-generation
const contentQueueRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.getContentQueue(ctx.user.id);
  }),

  add: protectedProcedure
    .input(z.object({
      title: z.string(),
      topicId: z.number().optional(),
      keywords: z.array(z.string()).optional(),
      targetProducts: z.array(z.number()).optional(),
      priority: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.addToContentQueue({
        userId: ctx.user.id,
        title: input.title,
        topicId: input.topicId,
        keywords: input.keywords,
        targetProducts: input.targetProducts,
        priority: input.priority || 0,
        status: "pending",
      });
      return { id, success: true };
    }),

  generate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the content queue item
      const queue = await db.getContentQueue(ctx.user.id);
      const item = queue.find(q => q.id === input.id);
      if (!item) throw new Error("Content queue item not found");

      // Update status to generating
      await db.updateContentQueueItem(input.id, { status: "generating" });

      try {
        // Get target products if specified
        let productContext = "";
        if (item.targetProducts && item.targetProducts.length > 0) {
          const products = await db.getCJProducts(ctx.user.id);
          const targetProducts = products.filter(p => item.targetProducts?.includes(p.id));
          if (targetProducts.length > 0) {
            productContext = `\n\nInclude mentions of these products naturally in the article:\n${targetProducts.map(p => `- ${p.productName} by ${p.advertiserName} (${p.commission} commission)`).join("\n")}`;
          }
        }

        // Generate content
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert SEO content writer specializing in affiliate marketing content. Write engaging, well-structured articles that naturally incorporate product recommendations. Use markdown formatting with proper headings, bullet points, and bold text for emphasis. Include compelling CTAs near product mentions.`
            },
            {
              role: "user",
              content: `Write a comprehensive article about "${item.title}".
${item.keywords?.length ? `Target keywords: ${item.keywords.join(", ")}` : ""}
Target length: 1500-2000 words${productContext}

Make sure to:
1. Include the main keyword naturally in the first paragraph
2. Use subheadings that include related keywords
3. Write in an engaging, readable style
4. Include product recommendations with clear CTAs
5. End with a strong conclusion and call-to-action`
            }
          ]
        });

        const content = typeof response.choices[0]?.message?.content === 'string' 
          ? response.choices[0].message.content 
          : '';

        // Create the article
        const slug = item.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .substring(0, 100);

        const articleId = await db.createArticle({
          userId: ctx.user.id,
          title: item.title,
          slug,
          content,
          status: "draft",
          keywords: item.keywords,
          topicId: item.topicId,
        });

        // Update queue item
        await db.updateContentQueueItem(input.id, {
          status: "ready",
          generatedArticleId: articleId,
        });

        return { articleId, success: true };
      } catch (error) {
        await db.updateContentQueueItem(input.id, { status: "failed" });
        throw error;
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeFromContentQueue(input.id, ctx.user.id);
      return { success: true };
    }),
});

// Public articles router (for published content)
const publicArticlesRouter = router({
  list: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getPublishedArticles(input?.limit || 20);
    }),

  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const article = await db.getPublishedArticleBySlug(input.slug);
      if (article) {
        // Increment views
        await db.incrementArticleViews(article.id);
        // Get affiliate links for this article
        const articleLinks = await db.getArticleAffiliateLinks(article.id);
        // Get external distribution links
        const distributions = await db.getArticleDistributions(article.id);
        const externalLinks = distributions
          .filter(d => d.status === 'published' && d.externalUrl)
          .map(d => ({ platform: d.platform, url: d.externalUrl! }));
        return { ...article, affiliateLinks: articleLinks, externalLinks };
      }
      return article;
    }),

  // Alias for getBySlug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const article = await db.getPublishedArticleBySlug(input.slug);
      if (article) {
        await db.incrementArticleViews(article.id);
        const articleLinks = await db.getArticleAffiliateLinks(article.id);
        const distributions = await db.getArticleDistributions(article.id);
        const externalLinks = distributions
          .filter(d => d.status === 'published' && d.externalUrl)
          .map(d => ({ platform: d.platform, url: d.externalUrl! }));
        return { ...article, affiliateLinks: articleLinks, externalLinks };
      }
      return article;
    }),

  trackClick: publicProcedure
    .input(z.object({ articleId: z.number(), linkId: z.number().optional() }))
    .mutation(async ({ input }) => {
      await db.incrementArticleClicks(input.articleId);
      if (input.linkId) {
        await db.incrementLinkClicks(input.linkId);
      }
      return { success: true };
    }),
});

// Full automation router - auto-discovers, generates, and publishes content
const automationRouter = router({
  // Get automation status and settings
  status: protectedProcedure.query(async ({ ctx }) => {
    const queue = await db.getContentQueue(ctx.user.id);
    const publishQueue = await db.getPublishingQueue(ctx.user.id);
    const articles = await db.getArticles(ctx.user.id);
    const links = await db.getAffiliateLinks(ctx.user.id);
    const settings = await db.getAutomationSettings(ctx.user.id);
    
    return {
      pendingContent: queue.filter(q => q.status === 'pending').length,
      generatingContent: queue.filter(q => q.status === 'generating').length,
      readyToPublish: queue.filter(q => q.status === 'ready').length,
      scheduledPublish: publishQueue.length,
      totalArticles: articles.length,
      publishedArticles: articles.filter(a => a.status === 'published').length,
      affiliateLinks: links.length,
      isActive: settings?.isEnabled ?? false,
      settings: settings || null,
    };
  }),

  // Get/save automation settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return await db.getAutomationSettings(ctx.user.id);
  }),

  saveSettings: protectedProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      articlesPerCycle: z.number().min(1).max(50), // Increased to 50 for aggressive mode
      cycleIntervalMinutes: z.number().min(5).max(10080).optional(), // 5 min to 1 week in minutes
      cycleIntervalHours: z.number().min(0).max(168).optional(), // Keep for backwards compatibility
      targetNiches: z.array(z.string()).optional(),
      autoPublish: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Support both minutes and hours for interval
      const intervalMinutes = input.cycleIntervalMinutes || (input.cycleIntervalHours || 24) * 60;
      // Convert minutes to hours for storage (store fractional hours for sub-hour intervals)
      const intervalHours = intervalMinutes / 60;
      const nextRunAt = input.isEnabled 
        ? new Date(Date.now() + intervalMinutes * 60 * 1000)
        : null;
      
      const id = await db.saveAutomationSettings({
        userId: ctx.user.id,
        isEnabled: input.isEnabled,
        articlesPerCycle: input.articlesPerCycle,
        cycleIntervalMinutes: intervalMinutes, // Store directly in minutes
        targetNiches: input.targetNiches,
        autoPublish: input.autoPublish,
        nextRunAt,
      });
      return { id, success: true };
    }),

  // Run full automation cycle: discover trends -> generate content -> insert links -> publish
  // AGGRESSIVE MODE: Maximizes article output and affiliate link density
  runCycle: protectedProcedure
    .input(z.object({ 
      count: z.number().min(1).max(20).optional(), // Increased max to 20 articles per cycle
      niche: z.string().optional(),
      autoPublish: z.boolean().optional(),
      aggressiveMode: z.boolean().optional(), // Enable maximum monetization
    }))
    .mutation(async ({ ctx, input }) => {
      const count = input.count || 10; // Default to 10 articles per cycle for aggressive monetization
      const results: { step: string; success: boolean; details: string }[] = [];

      try {
        // Step 1: Discover trending topics
        const topicsResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert trend analyst and SEO specialist. Identify ${count} highly monetizable trending topics that are:
1. Currently popular and searched frequently
2. Have high commercial intent (people looking to buy)
3. Have affiliate marketing potential
4. Low to medium competition
5. Evergreen or trending upward

Return JSON with topics array containing: title, category, keywords (5 high-value keywords), monetizationAngle (how to make money from this topic), searchIntent (informational/commercial/transactional).`
            },
            {
              role: "user",
              content: input.niche 
                ? `Find ${count} trending, monetizable topics in the ${input.niche} niche.`
                : `Find ${count} trending, monetizable topics across popular niches like tech, finance, health, and lifestyle.`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "trending_topics",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        category: { type: "string" },
                        keywords: { type: "array", items: { type: "string" } },
                        monetizationAngle: { type: "string" },
                        searchIntent: { type: "string" }
                      },
                      required: ["title", "category", "keywords", "monetizationAngle", "searchIntent"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["topics"],
                additionalProperties: false
              }
            }
          }
        });

        const topicsContent = typeof topicsResponse.choices[0]?.message?.content === 'string'
          ? topicsResponse.choices[0].message.content
          : '';
        const topicsData = JSON.parse(topicsContent);
        results.push({ step: "Trend Discovery", success: true, details: `Found ${topicsData.topics.length} trending topics` });

        // Get existing affiliate links for insertion
        const affiliateLinks = await db.getAffiliateLinks(ctx.user.id);
        const linkContext = affiliateLinks.length > 0
          ? `\n\nAvailable affiliate products to recommend:\n${affiliateLinks.slice(0, 10).map(l => `- ${l.name} (${l.category}): ${l.url}`).join('\n')}`
          : '';

        // Step 2: Generate articles for each topic
        const generatedArticles: number[] = [];
        for (const topic of topicsData.topics) {
          const articleResponse = await invokeLLM({
            messages: [
              {
              role: "system",
              content: `You are an ELITE affiliate marketing content specialist and SEO expert. Your ONLY goal is to create content that MAXIMIZES affiliate link clicks and commissions. Write content that:

1. AGGRESSIVELY targets buyer-intent keywords that convert
2. Places MULTIPLE compelling calls-to-action throughout (minimum 5-7 CTAs per article)
3. Uses PROVEN persuasion techniques: scarcity, social proof, authority, urgency
4. Creates IRRESISTIBLE product recommendations with emotional triggers
5. Uses markdown with strategic H2/H3 headings containing money keywords
6. Opens with a POWERFUL hook that creates immediate desire
7. Is 2000-3500 words for maximum SEO value and more CTA opportunities
8. Uses POWER WORDS: exclusive, limited, proven, guaranteed, secret, breakthrough
9. Includes comparison tables, pros/cons lists, and "best of" sections
10. Ends with STRONG urgency-based CTA ("Don't miss out", "Act now")
11. Naturally weaves in product mentions every 200-300 words
12. Uses storytelling to create emotional connection to products
13. Includes FAQ sections with product recommendations in answers
14. Creates FOMO (fear of missing out) around featured products${linkContext}`
              },
              {
                role: "user",
                content: `Write a high-converting article about: "${topic.title}"

Target keywords: ${topic.keywords.join(', ')}
Monetization angle: ${topic.monetizationAngle}
Search intent: ${topic.searchIntent}

Make it engaging, valuable, and optimized for both readers and search engines.`
              }
            ]
          });

          const articleContent = typeof articleResponse.choices[0]?.message?.content === 'string'
            ? articleResponse.choices[0].message.content
            : '';

          // Create the article
          const slug = generateSlug(topic.title);
          const articleId = await db.createArticle({
            userId: ctx.user.id,
            title: topic.title,
            slug: slug + '-' + Date.now().toString(36),
            content: articleContent,
            status: input.autoPublish ? 'published' : 'draft',
            keywords: topic.keywords,
            metaTitle: topic.title.substring(0, 60),
            metaDescription: `Discover everything about ${topic.title}. Expert insights, tips, and recommendations.`.substring(0, 160),
            focusKeyword: topic.keywords[0],
            seoScore: 85,
            readabilityScore: 80,
            publishedAt: input.autoPublish ? new Date() : undefined,
          });

          generatedArticles.push(articleId);

          // Auto-insert affiliate links
          if (affiliateLinks.length > 0) {
            // Find relevant links based on content
            for (const link of affiliateLinks) {
              const linkKeywords = link.name.toLowerCase().split(' ');
              const contentLower = articleContent.toLowerCase();
              if (linkKeywords.some(kw => contentLower.includes(kw))) {
                await db.addAffiliateLinkToArticle({
                  articleId,
                  affiliateLinkId: link.id,
                  anchorText: link.name,
                  position: 1,
                });
              }
            }
          }
        }

        results.push({ 
          step: "Content Generation", 
          success: true, 
          details: `Generated ${generatedArticles.length} SEO-optimized articles` 
        });

        if (input.autoPublish) {
          results.push({ 
            step: "Auto-Publish", 
            success: true, 
            details: `Published ${generatedArticles.length} articles to blog` 
          });
          
          // Auto-submit to search engines (IndexNow for Bing/Yandex, ping Google)
          try {
            // Get the slugs for published articles
            const articleUrls: string[] = [];
            for (const articleId of generatedArticles) {
              const article = await db.getArticleById(articleId, ctx.user.id);
              if (article?.slug) {
                articleUrls.push(`/blog/${article.slug}`);
              }
            }
            
            // Submit to IndexNow (Bing, Yandex)
            const indexNowKey = 'moneymachine2026indexnow';
            const baseUrl = process.env.VITE_APP_URL || 'https://3000-imsfbegzhv1gdqs8koo38-9b174543.us1.manus.computer';
            
            const indexNowPayload = {
              host: new URL(baseUrl).host,
              key: indexNowKey,
              keyLocation: `${baseUrl}/${indexNowKey}.txt`,
              urlList: articleUrls.map((url: string) => `${baseUrl}${url}`)
            };
            
            // Submit to IndexNow endpoints
            const endpoints = [
              'https://api.indexnow.org/indexnow',
              'https://www.bing.com/indexnow',
              'https://yandex.com/indexnow'
            ];
            
            await Promise.allSettled(
              endpoints.map(endpoint =>
                fetch(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(indexNowPayload)
                })
              )
            );
            
            // Ping Google about sitemap update
            const sitemapUrl = `${baseUrl}/sitemap.xml`;
            await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
            
            results.push({ 
              step: "Search Engine Indexing", 
              success: true, 
              details: `Submitted ${articleUrls.length} URLs to Google, Bing, and Yandex for indexing` 
            });
          } catch (indexError) {
            console.error('Search engine indexing error:', indexError);
            results.push({ 
              step: "Search Engine Indexing", 
              success: false, 
              details: 'Failed to submit to search engines' 
            });
          }
        }

        // Log automation cycle completion
        await logAutomationEvent(ctx.user.id, 'content_generation', generatedArticles.length, true);
        
        return {
          success: true,
          topicsDiscovered: topicsData.topics.length,
          articlesGenerated: generatedArticles.length,
          articleIds: generatedArticles,
          results,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ step: "Error", success: false, details: errorMessage });
        // Log automation failure
        await logAutomationEvent(ctx.user.id, 'content_generation', 0, false);
        return {
          success: false,
          topicsDiscovered: 0,
          articlesGenerated: 0,
          articleIds: [],
          results,
        };
      }
    }),

  // Generate viral-optimized content
  generateViralContent: protectedProcedure
    .input(z.object({ topic: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a viral content expert. Create content that is designed to be shared widely. Use:
1. Emotional hooks and power words
2. Curiosity gaps
3. Surprising statistics or facts
4. Relatable stories
5. Clear, actionable takeaways
6. Share-worthy headlines
7. Engaging subheadings
8. Visual content suggestions (describe images that should be added)
9. Social proof elements
10. Strong CTAs for sharing`
          },
          {
            role: "user",
            content: `Create viral-optimized content about: ${input.topic}`
          }
        ]
      });

      return {
        content: typeof response.choices[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : '',
      };
    }),

  // Get SEO recommendations for existing content
  optimizeSEO: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const article = await db.getArticleById(input.articleId, ctx.user.id);
      if (!article) throw new Error("Article not found");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an SEO expert. Analyze the content and provide specific, actionable recommendations to improve search rankings. Return JSON with: currentScore (0-100), recommendations (array of {type, priority, suggestion, impact}), suggestedTitle, suggestedMetaDescription, additionalKeywords.`
          },
          {
            role: "user",
            content: `Analyze and optimize this article:\n\nTitle: ${article.title}\nCurrent Meta: ${article.metaDescription || 'None'}\nKeywords: ${(article.keywords as string[])?.join(', ') || 'None'}\n\nContent:\n${article.content?.substring(0, 3000)}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                currentScore: { type: "integer" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      priority: { type: "string" },
                      suggestion: { type: "string" },
                      impact: { type: "string" }
                    },
                    required: ["type", "priority", "suggestion", "impact"],
                    additionalProperties: false
                  }
                },
                suggestedTitle: { type: "string" },
                suggestedMetaDescription: { type: "string" },
                additionalKeywords: { type: "array", items: { type: "string" } }
              },
              required: ["currentScore", "recommendations", "suggestedTitle", "suggestedMetaDescription", "additionalKeywords"],
              additionalProperties: false
            }
          }
        }
      });

      const content = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : '{}';
      return JSON.parse(content);
    }),

  // ===== CONTENT PIPELINE ENDPOINTS =====
  
  // Get pipeline configuration
  getPipelineConfig: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.getAutomationSettings(ctx.user.id);
    return {
      ...DEFAULT_PIPELINE_CONFIG,
      articlesPerCycle: settings?.articlesPerCycle || DEFAULT_PIPELINE_CONFIG.articlesPerCycle,
      targetNiches: settings?.targetNiches || DEFAULT_PIPELINE_CONFIG.targetNiches,
      autoPublish: settings?.autoPublish ?? DEFAULT_PIPELINE_CONFIG.autoPublish,
    };
  }),

  // Save pipeline configuration
  savePipelineConfig: protectedProcedure
    .input(z.object({
      articlesPerCycle: z.number().min(1).max(20),
      wordCountMin: z.number().min(500).max(5000),
      wordCountMax: z.number().min(1000).max(10000),
      contentStyle: z.enum(["informative", "persuasive", "review", "comparison", "listicle"]),
      targetNiches: z.array(z.string()),
      focusKeywords: z.array(z.string()).optional(),
      minAffiliateLinks: z.number().min(0).max(10),
      maxAffiliateLinks: z.number().min(1).max(15),
      affiliateDensity: z.enum(["low", "medium", "high", "aggressive"]),
      autoPublish: z.boolean(),
      autoDistribute: z.boolean(),
      publishDelay: z.number().min(0).max(60),
      minSeoScore: z.number().min(0).max(100),
      temperature: z.number().min(0).max(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Save to automation settings
      await db.saveAutomationSettings({
        userId: ctx.user.id,
        isEnabled: true,
        articlesPerCycle: input.articlesPerCycle,
        targetNiches: input.targetNiches,
        autoPublish: input.autoPublish,
      });
      return { success: true };
    }),

  // Run content pipeline with Multi-LLM
  runPipeline: protectedProcedure
    .input(z.object({
      articlesPerCycle: z.number().min(1).max(20).optional(),
      contentStyle: z.enum(["informative", "persuasive", "review", "comparison", "listicle"]).optional(),
      targetNiches: z.array(z.string()).optional(),
      affiliateDensity: z.enum(["low", "medium", "high", "aggressive"]).optional(),
      autoPublish: z.boolean().optional(),
      autoDistribute: z.boolean().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      // Get existing articles to avoid duplicate topics
      const existingArticles = await db.getArticles(ctx.user.id);
      const existingTopics = existingArticles.map(a => a.title);

      // Get affiliate links - filter to only use approved CJ links
      const allAffiliateLinks = await db.getAffiliateLinks(ctx.user.id);
      
      // Filter to only include CJ links from approved advertisers
      const approvedAdvertiserIds = await getApprovedAdvertiserIds();
      const affiliateLinks = allAffiliateLinks.filter(link => {
        // Check if it's a CJ link and from an approved advertiser
        if (link.url.includes('anrdoezrs.net') || link.url.includes('dpbolvw.net') || link.url.includes('jdoqocy.com') || link.url.includes('kqzyfj.com') || link.url.includes('tkqlhce.com')) {
          // Extract advertiser ID from CJ link URL
          const match = link.url.match(/click-\d+-([\d]+)/);
          if (match) {
            const advertiserId = match[1];
            return approvedAdvertiserIds.includes(advertiserId);
          }
          // If we can't extract advertiser ID, check if it was synced from approved list
          return link.shortCode?.startsWith('cj-');
        }
        // Non-CJ links are allowed
        return true;
      });
      
      console.log(`[ContentPipeline] Using ${affiliateLinks.length} approved affiliate links (filtered from ${allAffiliateLinks.length} total)`);

      // Build pipeline config
      const config: PipelineConfig = {
        ...DEFAULT_PIPELINE_CONFIG,
        articlesPerCycle: input?.articlesPerCycle || 5,
        contentStyle: input?.contentStyle || "persuasive",
        targetNiches: input?.targetNiches || ["technology", "finance", "health"],
        affiliateDensity: input?.affiliateDensity || "high",
        autoPublish: input?.autoPublish ?? true,
        autoDistribute: input?.autoDistribute ?? true,
      };

      // Run the pipeline
      const result = await runContentPipeline(
        config,
        affiliateLinks.map(l => ({
          id: l.id,
          name: l.name,
          url: l.url,
          category: l.category || "general",
          description: l.name, // Use name as description
        })),
        existingTopics,
        async (article) => {
          // Create the article in the database
          const slug = generateSlug(article.title);
          const articleId = await db.createArticle({
            userId: ctx.user.id,
            title: article.title,
            slug: slug + '-' + Date.now().toString(36),
            content: article.content,
            status: config.autoPublish ? 'published' : 'draft',
            keywords: article.seoData.keywords || [],
            metaTitle: article.seoData.title || article.title.substring(0, 60),
            metaDescription: article.seoData.metaDescription || `Discover ${article.title}`.substring(0, 160),
            focusKeyword: article.seoData.focusKeyword || '',
            seoScore: calculateContentScore(article.content, article.seoData.keywords || []),
            readabilityScore: 80,
            publishedAt: config.autoPublish ? new Date() : undefined,
          });

          // Auto-insert affiliate links into article
          for (const link of affiliateLinks) {
            const contentLower = article.content.toLowerCase();
            const linkKeywords = link.name.toLowerCase().split(' ');
            if (linkKeywords.some(kw => contentLower.includes(kw))) {
              await db.addAffiliateLinkToArticle({
                articleId,
                affiliateLinkId: link.id,
                anchorText: link.name,
                position: 1,
              });
            }
          }

          // Log article creation event
          await logArticleEvent(ctx.user.id, config.autoPublish ? 'article_published' : 'article_created', articleId, article.title, {
            source: 'content_pipeline',
            affiliateLinksInserted: affiliateLinks.filter(l => article.content.toLowerCase().includes(l.name.toLowerCase().split(' ')[0])).length,
          });

          return articleId;
        }
      );

      // Log pipeline completion
      await logAutomationEvent(ctx.user.id, 'content_pipeline', result.articlesGenerated, result.success);

      return result;
    }),

  // Discover topics using Multi-LLM
  discoverTopicsMultiLLM: protectedProcedure
    .input(z.object({
      niches: z.array(z.string()),
      count: z.number().min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const existingArticles = await db.getArticles(ctx.user.id);
      const existingTopics = existingArticles.map(a => a.title);

      const result = await discoverTopics(input.niches, input.count, existingTopics);
      return result;
    }),

  // Get available LLM providers
  getAvailableLLMProviders: protectedProcedure.query(async () => {
    return getAvailableProviders();
  }),
});

// Self-learning optimization router - learns from performance data
const learningRouter = router({
  // Get performance insights
  getInsights: protectedProcedure.query(async ({ ctx }) => {
    const topTopics = await db.getTopPerformingLearnings(ctx.user.id, 'topic', 10);
    const topKeywords = await db.getTopPerformingLearnings(ctx.user.id, 'keyword', 10);
    const topCategories = await db.getTopPerformingLearnings(ctx.user.id, 'category', 10);
    const contentTypePerf = await db.getContentTypePerformance(ctx.user.id);
    const categoryPerf = await db.getCategoryPerformance(ctx.user.id);
    const successfulPatterns = await db.getSuccessfulContentPatterns(ctx.user.id, 10);

    return {
      topTopics,
      topKeywords,
      topCategories,
      contentTypePerformance: contentTypePerf,
      categoryPerformance: categoryPerf,
      successfulPatterns,
    };
  }),

  // Update learning scores based on current performance
  updateScores: protectedProcedure.mutation(async ({ ctx }) => {
    await db.updateLearningScores(ctx.user.id);
    return { success: true };
  }),

  // Get AI-powered recommendations based on learnings
  getRecommendations: protectedProcedure.mutation(async ({ ctx }) => {
    const topTopics = await db.getTopPerformingLearnings(ctx.user.id, 'topic', 5);
    const topKeywords = await db.getTopPerformingLearnings(ctx.user.id, 'keyword', 10);
    const successfulPatterns = await db.getSuccessfulContentPatterns(ctx.user.id, 5);

    const learningContext = `
Top Performing Topics: ${topTopics.map(t => t.learningKey).join(', ')}
Top Keywords: ${topKeywords.map(k => k.learningKey).join(', ')}
Successful Content Patterns: ${successfulPatterns.map(p => p.topic).join(', ')}
`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an elite affiliate marketing strategist. Based on performance data, provide actionable recommendations to MAXIMIZE affiliate commissions. Focus on:
1. Topics that convert best
2. Keywords with highest revenue potential
3. Content types that drive the most clicks
4. Optimal posting frequency
5. Best practices from top affiliate marketers`
        },
        {
          role: "user",
          content: `Based on this performance data, give me 5 specific, actionable recommendations to increase affiliate revenue:\n${learningContext}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string" },
                    expectedImpact: { type: "string" },
                    actionItems: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "description", "priority", "expectedImpact", "actionItems"],
                  additionalProperties: false
                }
              },
              suggestedTopics: { type: "array", items: { type: "string" } },
              suggestedKeywords: { type: "array", items: { type: "string" } }
            },
            required: ["recommendations", "suggestedTopics", "suggestedKeywords"],
            additionalProperties: false
          }
        }
      }
    });

    const content = typeof response.choices[0]?.message?.content === 'string'
      ? response.choices[0].message.content
      : '{}';
    return JSON.parse(content);
  }),

  // Record a learning from article performance
  recordLearning: protectedProcedure
    .input(z.object({
      learningType: z.enum(['topic', 'headline', 'keyword', 'cta', 'link_placement', 'content_length', 'category']),
      learningKey: z.string(),
      impressions: z.number().optional(),
      clicks: z.number().optional(),
      conversions: z.number().optional(),
      revenue: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.recordLearning({
        userId: ctx.user.id,
        ...input,
      });
      return { id, success: true };
    }),
});

// Distribution router - tracks article distribution across platforms
const distributionRouter = router({
  // Get distribution stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    return await db.getDistributionStats(ctx.user.id);
  }),

  // Get all distributions for user
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getUserDistributions(ctx.user.id, input?.limit || 50);
    }),

  // Get distributions for specific article
  forArticle: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getArticleDistributions(input.articleId);
    }),

  // Create a distribution record
  create: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      platform: z.enum([
        'medium', 'devto', 'linkedin', 'hashnode', 'substack',
        'reddit', 'hackernews', 'twitter', 'facebook', 'pinterest',
        'pr_newswire', 'prweb', 'free_press_release', 'article_directory', 'rss_syndication', 'other'
      ]),
      platformName: z.string().optional(),
      externalUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createDistribution({
        ...input,
        userId: ctx.user.id,
        status: 'pending',
      });
      return { id, success: true };
    }),

  // Update distribution status
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'submitted', 'published', 'failed', 'removed']),
      externalUrl: z.string().optional(),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateDistribution(input.id, {
        status: input.status,
        externalUrl: input.externalUrl,
        errorMessage: input.errorMessage,
        publishedAt: input.status === 'published' ? new Date() : undefined,
      });
      return { success: true };
    }),

  // Distribute article to multiple platforms
  distributeArticle: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      platforms: z.array(z.enum([
        'medium', 'devto', 'linkedin', 'hashnode', 'substack',
        'reddit', 'hackernews', 'twitter', 'facebook', 'pinterest',
        'pr_newswire', 'prweb', 'free_press_release', 'article_directory', 'rss_syndication'
      ])),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the article data for publishing
      const article = await db.getArticleById(input.articleId, ctx.user.id);
      if (!article) {
        throw new Error('Article not found');
      }

      // Get configured platforms that can auto-publish
      const configuredPlatforms = getConfiguredPlatforms();
      const results: Array<{platform: string; id: number; status: string; url?: string; error?: string}> = [];

      for (const platform of input.platforms) {
        // Create distribution record first
        const id = await db.createDistribution({
          articleId: input.articleId,
          userId: ctx.user.id,
          platform,
          status: 'pending',
        });

        // Check if this platform has API key configured for auto-publishing
        if (configuredPlatforms.includes(platform)) {
          try {
            // Get article tags from keywords
            const keywordsStr = Array.isArray(article.keywords) ? article.keywords.join(',') : (article.keywords || '');
            const tags = keywordsStr.split(',').map((k: string) => k.trim()).filter(Boolean);
            
            // Attempt actual publishing
            const publishResult = await publishToPlatform(platform, {
              title: article.title,
              content: article.content || '',
              tags: tags.slice(0, 5),
              canonicalUrl: `https://manus.space/blog/${article.slug}`,
            });

            if (publishResult.success && publishResult.url) {
              // Update distribution with success
              await db.updateDistribution(id, {
                status: 'published',
                externalUrl: publishResult.url,
                publishedAt: new Date(),
              });
              results.push({ platform, id, status: 'published', url: publishResult.url });
              console.log(`[Distribution] Successfully published to ${platform}: ${publishResult.url}`);
              // Log distribution success
              await logDistributionEvent(ctx.user.id, 'distribution_published', input.articleId, platform, publishResult.url);
            } else {
              // Update distribution with failure
              await db.updateDistribution(id, {
                status: 'failed',
                errorMessage: publishResult.error || 'Unknown error',
              });
              results.push({ platform, id, status: 'failed', error: publishResult.error });
              console.log(`[Distribution] Failed to publish to ${platform}: ${publishResult.error}`);
            }
          } catch (error) {
            await db.updateDistribution(id, {
              status: 'failed',
              errorMessage: String(error),
            });
            results.push({ platform, id, status: 'failed', error: String(error) });
          }
        } else {
          // No API key configured, leave as pending for manual publishing
          results.push({ platform, id, status: 'pending' });
          // Log distribution queued
          await logDistributionEvent(ctx.user.id, 'distribution_queued', input.articleId, platform);
        }
      }
      return { distributions: results, success: true };
    }),

  // Get platforms with configured API keys
  getConfiguredPlatforms: protectedProcedure.query(async () => {
    return getConfiguredPlatforms();
  }),
});

// Bot learning router - tracks the optimization bot's decisions and learning
const botRouter = router({
  // Botpress integration endpoints
  botpressStatus: protectedProcedure.query(async () => {
    const service = createBotpressService();
    if (!service) {
      return { connected: false, message: 'Botpress not configured' };
    }
    const isHealthy = await service.healthCheck();
    return { connected: isHealthy, message: isHealthy ? 'Connected' : 'Connection failed' };
  }),

  initBotpressSession: protectedProcedure.mutation(async () => {
    const service = createBotpressService();
    if (!service) {
      throw new Error('Botpress not configured. Set BOTPRESS_API environment variable.');
    }
    const session = await service.initSession();
    if (!session) {
      throw new Error('Failed to initialize Botpress session');
    }
    return session;
  }),

  sendBotCommand: protectedProcedure
    .input(z.object({
      command: z.string(),
      sessionInfo: z.object({
        userKey: z.string(),
        conversationId: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      const service = createBotpressService();
      if (!service) {
        throw new Error('Botpress not configured');
      }
      // Note: In production, we'd need to restore the session
      // For now, we'll create a new session for each command
      const session = await service.initSession();
      if (!session) {
        throw new Error('Failed to initialize session');
      }
      const response = await service.executeCommand(input.command);
      return { response: response || 'No response from bot' };
    }),

  getBotCommands: protectedProcedure.query(() => {
    return Object.entries(BotCommands).map(([key, value]) => ({
      id: key,
      name: key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
      command: value,
    }));
  }),

  // Get bot stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    return await db.getBotLearningStats(ctx.user.id);
  }),

  // Get recent bot decisions
  recentDecisions: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getRecentBotDecisions(ctx.user.id, input?.limit || 10);
    }),

  // Record a bot decision
  recordDecision: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      learningCategory: z.enum([
        'topic_selection', 'headline_optimization', 'cta_placement',
        'affiliate_selection', 'timing_optimization', 'content_structure',
        'keyword_targeting', 'distribution_strategy'
      ]),
      decision: z.string(),
      reasoning: z.string().optional(),
      confidenceScore: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.recordBotLearning({
        userId: ctx.user.id,
        ...input,
        confidenceScore: input.confidenceScore || 50,
        outcome: 'pending',
      });
      return { id, success: true };
    }),

  // Update decision outcome
  updateOutcome: protectedProcedure
    .input(z.object({
      id: z.number(),
      outcome: z.enum(['success', 'failure', 'neutral']),
      wasCorrect: z.boolean(),
      metrics: z.object({
        clicks: z.number().optional(),
        conversions: z.number().optional(),
        revenue: z.number().optional(),
        engagement: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateBotLearningOutcome(
        input.id,
        input.outcome,
        input.wasCorrect,
        input.metrics
      );
      return { success: true };
    }),
});

// URL Shortener router for monetizing clicks
const urlShortenerRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUrlShortenerSettings(ctx.user.id);
  }),

  saveSettings: protectedProcedure
    .input(z.object({
      provider: z.enum(['shorte_st', 'adfly', 'linkvertise', 'shrinkme', 'ouo_io', 'none']),
      apiKey: z.string().optional(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.saveUrlShortenerSettings({
        userId: ctx.user.id,
        provider: input.provider,
        apiKey: input.apiKey,
        isEnabled: input.isEnabled,
      });
      return { id, success: true };
    }),

  getShortenedUrls: protectedProcedure.query(async ({ ctx }) => {
    return await db.getShortenedUrls(ctx.user.id);
  }),

  shortenUrl: protectedProcedure
    .input(z.object({
      originalUrl: z.string().url(),
      articleId: z.number().optional(),
      affiliateLinkId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = await db.getUrlShortenerSettings(ctx.user.id);
      if (!settings?.isEnabled || settings.provider === 'none') {
        return { shortUrl: input.originalUrl, success: false, message: 'URL shortener not configured' };
      }

      // In production, this would call the actual shortener API
      // For now, we simulate the shortened URL
      const shortUrl = `https://${settings.provider}.com/${Math.random().toString(36).substring(7)}`;
      
      const id = await db.createShortenedUrl({
        userId: ctx.user.id,
        originalUrl: input.originalUrl,
        shortUrl,
        provider: settings.provider,
        articleId: input.articleId,
        affiliateLinkId: input.affiliateLinkId,
      });

      return { id, shortUrl, success: true };
    }),
});

// Tracking router for pixels and cookies
const trackingRouter = router({
  getPixels: protectedProcedure.query(async ({ ctx }) => {
    return await db.getTrackingPixels(ctx.user.id);
  }),

  addPixel: protectedProcedure
    .input(z.object({
      pixelType: z.enum(['facebook', 'google', 'tiktok', 'custom']),
      pixelId: z.string(),
      pixelCode: z.string().optional(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createTrackingPixel({
        userId: ctx.user.id,
        pixelType: input.pixelType,
        pixelId: input.pixelId,
        pixelCode: input.pixelCode,
        isEnabled: input.isEnabled ?? true,
      });
      return { id, success: true };
    }),

  updatePixel: protectedProcedure
    .input(z.object({
      id: z.number(),
      pixelId: z.string().optional(),
      pixelCode: z.string().optional(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateTrackingPixel(input.id, ctx.user.id, {
        pixelId: input.pixelId,
        pixelCode: input.pixelCode,
        isEnabled: input.isEnabled,
      });
      return { success: true };
    }),

  deletePixel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteTrackingPixel(input.id, ctx.user.id);
      return { success: true };
    }),

  getCookieStats: protectedProcedure.query(async ({ ctx }) => {
    return await db.getCookieTrackingStats(ctx.user.id);
  }),

  // Track a click with cookie
  trackClick: publicProcedure
    .input(z.object({
      visitorId: z.string(),
      articleId: z.number().optional(),
      affiliateLinkId: z.number(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.trackAffiliateCookie({
        visitorId: input.visitorId,
        articleId: input.articleId,
        affiliateLinkId: input.affiliateLinkId,
        userAgent: input.userAgent,
        cookieExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cookieDurationDays: 30,
      });
      return { id, success: true };
    }),
});

// Bot training data router
const trainingRouter = router({
  getData: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getBotTrainingData(input?.category);
    }),

  addData: protectedProcedure
    .input(z.object({
      category: z.enum([
        'ad_copy', 'headline_formulas', 'cta_strategies', 'affiliate_tactics',
        'seo_techniques', 'viral_triggers', 'conversion_optimization', 'email_marketing'
      ]),
      title: z.string(),
      content: z.string(),
      source: z.string().optional(),
      sourceUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.addBotTrainingData({
        category: input.category,
        title: input.title,
        content: input.content,
        source: input.source,
        sourceUrl: input.sourceUrl,
      });
      return { id, success: true };
    }),

  seedKnowledge: protectedProcedure.mutation(async () => {
    // Seed with proven affiliate marketing knowledge
    const knowledge = [
      {
        category: 'headline_formulas' as const,
        title: 'Power Words for Headlines',
        content: 'Use power words: Free, New, Secret, Proven, Guaranteed, Limited, Exclusive, Instant, Easy, Amazing, Discover, Unlock, Transform, Ultimate, Essential',
        source: 'Copyblogger',
      },
      {
        category: 'cta_strategies' as const,
        title: 'High-Converting CTA Formulas',
        content: 'Best CTAs: "Get [Benefit] Now", "Start Your Free Trial", "Claim Your [Offer]", "Yes, I Want [Benefit]!", "Download Free [Resource]", "Join [Number] Others"',
        source: 'ConversionXL',
      },
      {
        category: 'affiliate_tactics' as const,
        title: 'Link Placement Strategy',
        content: 'Place affiliate links: 1) In the first 100 words, 2) After describing a problem, 3) In comparison tables, 4) Within product reviews, 5) In the conclusion with urgency',
        source: 'Authority Hacker',
      },
      {
        category: 'ad_copy' as const,
        title: 'AIDA Formula',
        content: 'AIDA: Attention (hook), Interest (benefits), Desire (social proof/urgency), Action (clear CTA). Every piece of content should follow this flow.',
        source: 'Classic Marketing',
      },
      {
        category: 'seo_techniques' as const,
        title: 'On-Page SEO Essentials',
        content: 'Include keyword in: Title, first paragraph, H2 headings, meta description, image alt text, URL slug. Use LSI keywords naturally throughout.',
        source: 'Moz',
      },
      {
        category: 'viral_triggers' as const,
        title: 'Viral Content Elements',
        content: 'Viral triggers: Emotional (awe, anger, anxiety), Practical value, Stories, Social currency (makes sharer look good), Triggers (top of mind)',
        source: 'Jonah Berger - Contagious',
      },
      {
        category: 'conversion_optimization' as const,
        title: 'Urgency and Scarcity',
        content: 'Create urgency: Limited time offers, countdown timers, limited quantity, exclusive access, price increases soon, bonuses expiring',
        source: 'Robert Cialdini',
      },
    ];

    for (const item of knowledge) {
      await db.addBotTrainingData(item);
    }

    return { success: true, count: knowledge.length };
  }),

  markEffectiveness: protectedProcedure
    .input(z.object({
      id: z.number(),
      wasSuccessful: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await db.updateTrainingDataEffectiveness(input.id, input.wasSuccessful);
      return { success: true };
    }),
});

// Audit log router - comprehensive activity tracking
const auditRouter = router({
  list: protectedProcedure
    .input(z.object({
      eventType: z.string().optional(),
      articleId: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return await db.getAuditLogs(ctx.user.id, input);
    }),

  getArticleLog: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      return await db.getArticleAuditLog(input.articleId);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    return await db.getAuditLogStats(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      eventType: z.enum([
        "article_created", "article_published", "article_updated", "article_deleted",
        "distribution_queued", "distribution_published", "distribution_failed",
        "affiliate_link_added", "affiliate_link_clicked", "affiliate_conversion",
        "automation_cycle_started", "automation_cycle_completed", "automation_cycle_failed",
        "topic_discovered", "topic_saved",
        "bot_decision", "bot_learning", "bot_optimization",
        "seo_indexed", "seo_ping_sent",
        "user_action", "system_event"
      ]),
      articleId: z.number().optional(),
      affiliateLinkId: z.number().optional(),
      distributionId: z.number().optional(),
      topicId: z.number().optional(),
      action: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      wasSuccessful: z.boolean().optional(),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createAuditLog({
        userId: ctx.user.id,
        ...input,
        metadata: input.metadata as any,
      });
      return { id };
    }),

  // Page audit endpoints
  auditPage: protectedProcedure
    .input(z.object({
      pageName: z.string(),
      pageContent: z.string(),
      actualBehavior: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await auditPage(input.pageName, input.pageContent, input.actualBehavior);
    }),

  auditAllPages: protectedProcedure
    .query(async () => {
      return await auditAllPages();
    }),

  learnPageContext: protectedProcedure
    .input(z.object({
      pageName: z.string(),
      pageContent: z.string(),
      userInteractions: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return await learnPageContext(input.pageName, input.pageContent, input.userInteractions);
    }),

  getFixRecommendations: protectedProcedure
    .input(z.object({
      pageName: z.string(),
      brokenFeatures: z.array(z.object({
        name: z.string(),
        description: z.string(),
        status: z.enum(['working', 'not_working', 'needs_improvement']),
        issue: z.string().optional(),
        fix: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return await generateFixRecommendations(input.pageName, input.brokenFeatures);
    }),

  verifyArticlePosting: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const distributions = await db.getArticleDistributions(input.articleId);
      return await verifyArticlePosting(input.articleId, distributions);
    }),

  generateInternalLinks: protectedProcedure
    .query(async ({ ctx }) => {
      const articles = await db.getArticles(ctx.user.id);
      const articlesWithKeywords = articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug || '',
        keywords: a.keywords || [],
      }));
      return generateInternalLinks(articlesWithKeywords);
    }),

  getPageDefinitions: publicProcedure
    .query(() => {
      return PAGE_DEFINITIONS;
    }),
});

// Multi-LLM Router - Intelligent task routing across multiple free LLM providers
const llmRouter = router({
  // Get available LLM providers
  getProviders: protectedProcedure.query(async () => {
    const providers = getAvailableProviders();
    return {
      available: providers,
      count: providers.length,
      configured: providers.length > 0,
    };
  }),

  // Generate article using optimized LLM routing
  generateArticle: protectedProcedure
    .input(z.object({
      topic: z.string(),
      keywords: z.array(z.string()).optional(),
      wordCount: z.number().min(500).max(5000).optional(),
      style: z.enum(["informative", "persuasive", "conversational", "technical"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateArticle(
        input.topic,
        input.keywords || [],
        input.wordCount || 2000,
        input.style || "informative"
      );
      return {
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      };
    }),

  // Optimize content for SEO
  optimizeSEO: protectedProcedure
    .input(z.object({
      content: z.string(),
      targetKeyword: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await optimizeSEO(input.content, input.targetKeyword);
    }),

  // Research trending topics
  researchTopics: protectedProcedure
    .input(z.object({
      niche: z.string(),
      count: z.number().min(1).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      return await researchTopics(input.niche, input.count || 10);
    }),

  // Match affiliate products to content
  matchAffiliates: protectedProcedure
    .input(z.object({
      articleContent: z.string(),
      products: z.array(z.object({
        name: z.string(),
        category: z.string(),
        description: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      return await matchAffiliateProducts(input.articleContent, input.products);
    }),

  // Generate headlines
  generateHeadlines: protectedProcedure
    .input(z.object({
      topic: z.string(),
      count: z.number().min(1).max(10).optional(),
      style: z.enum(["clickbait", "informative", "question", "listicle"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const headlines = await generateHeadlines(
        input.topic,
        input.count || 5,
        input.style || "informative"
      );
      return { headlines };
    }),

  // Direct LLM invoke for custom tasks
  invoke: protectedProcedure
    .input(z.object({
      taskType: z.enum([
        "article_generation", "seo_optimization", "topic_research",
        "affiliate_matching", "content_rewriting", "headline_generation",
        "performance_analysis", "quick_task", "deep_reasoning", "code_generation"
      ]),
      systemPrompt: z.string(),
      userPrompt: z.string(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(100).max(8000).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await invokeMultiLLM(
        input.taskType as LLMTaskType,
        [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        {
          temperature: input.temperature,
          maxTokens: input.maxTokens,
        }
      );
      return {
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      };
    }),
});

// Daily Optimization Router
const optimizerRouter = router({
  // Run daily optimization cycle
  runOptimization: protectedProcedure
    .mutation(async () => {
      return await runDailyOptimization();
    }),

  // Check all provider health
  checkHealth: protectedProcedure
    .query(async () => {
      return await checkAllProvidersHealth();
    }),

  // Check feature health
  checkFeatures: protectedProcedure
    .query(async () => {
      return await checkFeatureHealth();
    }),

  // Get task routing decision
  routeTask: protectedProcedure
    .input(z.object({ taskType: z.string() }))
    .query(({ input }) => {
      return routeTask(input.taskType);
    }),

  // Get provider statistics
  getStats: protectedProcedure
    .query(() => {
      const stats = getProviderStats();
      return Object.fromEntries(stats);
    }),

  // Get usage history
  getUsageHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }))
    .query(({ input }) => {
      return getUsageHistory(input?.limit || 100);
    }),

  // Get API registry
  getApiRegistry: protectedProcedure
    .query(() => {
      return getApiRegistry();
    }),

  // Get optimization dashboard data
  getDashboard: protectedProcedure
    .query(async () => {
      const [health, features, stats, history] = await Promise.all([
        checkAllProvidersHealth(),
        checkFeatureHealth(),
        Promise.resolve(Object.fromEntries(getProviderStats())),
        Promise.resolve(getUsageHistory(100)),
      ]);

      // Calculate summary metrics
      const last24h = Date.now() - 24 * 60 * 60 * 1000;
      const recentHistory = history.filter(h => h.timestamp > last24h);
      const totalRequests = recentHistory.length;
      const successfulRequests = recentHistory.filter(h => h.success).length;
      const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1;
      const avgResponseTime = totalRequests > 0
        ? recentHistory.reduce((sum, h) => sum + h.responseTime, 0) / totalRequests
        : 0;

      // Find top provider
      const providerCounts = new Map<string, number>();
      recentHistory.forEach(h => {
        providerCounts.set(h.provider, (providerCounts.get(h.provider) || 0) + 1);
      });
      let topProvider = "manus";
      let maxCount = 0;
      providerCounts.forEach((count, provider) => {
        if (count > maxCount) {
          maxCount = count;
          topProvider = provider;
        }
      });

      return {
        health,
        features,
        stats,
        summary: {
          totalRequests24h: totalRequests,
          successRate24h: successRate,
          averageResponseTime24h: avgResponseTime,
          topProvider,
          healthyProviders: health.filter(h => h.status === "healthy").length,
          degradedProviders: health.filter(h => h.status === "degraded").length,
          downProviders: health.filter(h => h.status === "down").length,
          operationalFeatures: features.filter(f => f.status === "operational").length,
          totalFeatures: features.length,
        },
      };
    }),
});

// Hive Mind Router - Central AI coordination
const hiveMindRouter = router({
  // Get page insights from Hive Mind
  getInsights: protectedProcedure
    .input(z.object({
      pageId: z.string(),
      additionalContext: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await getPageInsights(input.pageId, ctx.user.id, input.additionalContext);
    }),

  // Communicate with Hive Mind
  chat: protectedProcedure
    .input(z.object({
      pageId: z.string(),
      query: z.string(),
      context: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await communicateWithHiveMind(ctx.user.id, input.pageId, input.query, input.context);
    }),

  // Sync all pages with Hive Mind
  syncAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      return await syncAllPages(ctx.user.id);
    }),

  // Get Hive Mind state
  getState: protectedProcedure
    .query(async () => {
      return getHiveMindState();
    }),

  // Initialize page context
  initPage: protectedProcedure
    .input(z.object({
      pageId: z.string(),
      currentState: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      return await initializePageContext(input.pageId, input.currentState);
    }),

  // Log an event
  logEvent: protectedProcedure
    .input(z.object({
      eventType: z.enum([
        'article_created', 'article_published', 'article_updated', 'article_deleted',
        'distribution_queued', 'distribution_published', 'distribution_failed',
        'affiliate_link_added', 'affiliate_link_clicked', 'affiliate_conversion',
        'automation_cycle_started', 'automation_cycle_completed', 'automation_cycle_failed',
        'topic_discovered', 'topic_saved', 'bot_decision', 'bot_learning', 'bot_optimization',
        'seo_indexed', 'seo_ping_sent', 'user_action', 'system_event'
      ]),
      message: z.string(),
      articleId: z.number().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await logEvent(ctx.user.id, input.eventType, {
        articleId: input.articleId,
        message: input.message,
        metadata: input.metadata,
      });
    }),

  // Generate a branded product page from an article
  generateProductPage: protectedProcedure
    .input(z.object({
      articleId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const page = await generateProductPage(input.articleId, ctx.user.id);
      if (!page) {
        throw new Error('Article not found or could not generate product page');
      }
      return page;
    }),

  // Publish a product page
  publishProductPage: protectedProcedure
    .input(z.object({
      articleId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const page = await generateProductPage(input.articleId, ctx.user.id);
      if (!page) {
        throw new Error('Article not found');
      }
      const result = await publishProductPage(page, ctx.user.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to publish product page');
      }
      // Log the event
      await logEvent(ctx.user.id, 'article_published', {
        message: `Product page published: ${page.title}`,
        metadata: { url: result.url, type: 'product_page' },
      });
      return result;
    }),

  // Batch generate product pages
  batchGenerateProductPages: protectedProcedure
    .input(z.object({
      articleIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await batchGenerateProductPages(input.articleIds, ctx.user.id);
      // Log the batch event
      await logEvent(ctx.user.id, 'system_event', {
        message: `Batch product pages: ${result.generated} generated, ${result.published} published`,
        metadata: { ...result },
      });
      return result;
    }),

  // Ask Hive Mind with full system context
  askWithFullContext: protectedProcedure
    .input(z.object({
      question: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { askHiveMindWithFullContext } = await import('./_core/autonomousHiveMind');
      return await askHiveMindWithFullContext(ctx.user.id, input.question);
    }),

  // Get full system data
  getFullSystemData: protectedProcedure
    .query(async ({ ctx }) => {
      const { getFullSystemData } = await import('./_core/autonomousHiveMind');
      return await getFullSystemData(ctx.user.id);
    }),

  // Sync CJ approved vendors
  syncCJVendors: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { syncCJApprovedVendors } = await import('./_core/autonomousHiveMind');
      return await syncCJApprovedVendors(ctx.user.id);
    }),

  // Verify article affiliate links
  verifyArticleLinks: protectedProcedure
    .input(z.object({
      articleId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { verifyArticleAffiliateLinks } = await import('./_core/autonomousHiveMind');
      return await verifyArticleAffiliateLinks(ctx.user.id, input.articleId);
    }),

  // Start autonomous operation
  startAutonomous: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { startAutonomousOperation } = await import('./_core/autonomousHiveMind');
      return await startAutonomousOperation(ctx.user.id);
    }),

  // Stop autonomous operation
  stopAutonomous: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { stopAutonomousOperation } = await import('./_core/autonomousHiveMind');
      return await stopAutonomousOperation(ctx.user.id);
    }),

  // Get autonomous state
  getAutonomousState: protectedProcedure
    .query(async () => {
      const { getAutonomousState } = await import('./_core/autonomousHiveMind');
      return getAutonomousState();
    }),

  // Auto-wake the system
  autoWake: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { autoWake } = await import('./_core/autonomousHiveMind');
      return await autoWake(ctx.user.id);
    }),

  // Get approved vendors for content
  getApprovedVendors: protectedProcedure
    .query(async () => {
      const { getApprovedVendorsForContent } = await import('./_core/autonomousHiveMind');
      return getApprovedVendorsForContent();
    }),

  // Start auto-wake scheduler
  startScheduler: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { startAutoWakeScheduler } = await import('./_core/autoWakeScheduler');
      return await startAutoWakeScheduler(ctx.user.id);
    }),

  // Stop auto-wake scheduler
  stopScheduler: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { stopAutoWakeScheduler } = await import('./_core/autoWakeScheduler');
      return await stopAutoWakeScheduler(ctx.user.id);
    }),

  // Get scheduler state
  getSchedulerState: protectedProcedure
    .query(async () => {
      const { getSchedulerState } = await import('./_core/autoWakeScheduler');
      return getSchedulerState();
    }),

  // Run manual wake cycle
  runManualCycle: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runManualWakeCycle } = await import('./_core/autoWakeScheduler');
      return await runManualWakeCycle(ctx.user.id);
    }),

  // Get articles needing CJ links
  getArticlesNeedingLinks: protectedProcedure
    .query(async ({ ctx }) => {
      const { getArticlesNeedingCJLinks } = await import('./_core/autoWakeScheduler');
      return await getArticlesNeedingCJLinks(ctx.user.id);
    }),

  // Auto-insert CJ links into article
  autoInsertLinks: protectedProcedure
    .input(z.object({
      articleId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { autoInsertCJLinks } = await import('./_core/autoWakeScheduler');
      return await autoInsertCJLinks(ctx.user.id, input.articleId);
    }),

  // Get approved CJ vendors with links
  getApprovedCJVendors: protectedProcedure
    .query(async ({ ctx }) => {
      const { getApprovedCJVendors } = await import('./_core/cjContentIntegration');
      return await getApprovedCJVendors(ctx.user.id);
    }),

  // Get CJ content suggestions
  getCJContentSuggestions: protectedProcedure
    .input(z.object({
      count: z.number().optional().default(5),
    }))
    .query(async ({ ctx, input }) => {
      const { getCJContentSuggestions } = await import('./_core/cjContentIntegration');
      return await getCJContentSuggestions(ctx.user.id, input.count);
    }),

  // Check if topic has CJ links
  checkTopicCJLinks: protectedProcedure
    .input(z.object({
      topic: z.string(),
      keywords: z.array(z.string()).optional().default([]),
    }))
    .query(async ({ input }) => {
      const { checkTopicHasCJLinks } = await import('./_core/cjContentIntegration');
      return await checkTopicHasCJLinks(input.topic, input.keywords);
    }),

  // Cache CJ products
  cacheCJProducts: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { cacheCJProducts } = await import('./_core/cjContentIntegration');
      return await cacheCJProducts(ctx.user.id);
    }),

  // Get cached CJ products
  getCachedCJProducts: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { getCachedCJProducts } = await import('./_core/cjContentIntegration');
      return await getCachedCJProducts(ctx.user.id, input.category, input.limit);
    }),

  // Link CJ products to article
  linkCJToArticle: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      cjProductIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { linkCJToArticle } = await import('./_core/cjContentIntegration');
      return await linkCJToArticle(ctx.user.id, input.articleId, input.cjProductIds);
    }),

  // Verify article CJ links
  verifyArticleCJLinks: protectedProcedure
    .input(z.object({
      articleId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { verifyArticleCJLinks } = await import('./_core/cjContentIntegration');
      return await verifyArticleCJLinks(ctx.user.id, input.articleId);
    }),

  // Get new CJ vendor opportunities
  getNewCJVendorOpportunities: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { getNewCJVendorOpportunities } = await import('./_core/cjContentIntegration');
      return await getNewCJVendorOpportunities(ctx.user.id, input.category);
    }),

  // Get unified system data
  getUnifiedData: protectedProcedure
    .query(async ({ ctx }) => {
      const { getUnifiedSystemData } = await import('./_core/unifiedBotSystem');
      return await getUnifiedSystemData(ctx.user.id);
    }),

  // Get all bot states
  getBotStates: protectedProcedure
    .query(async () => {
      const { getAllBotStates } = await import('./_core/unifiedBotSystem');
      return getAllBotStates();
    }),

  // Run all bots
  runAllBots: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runAllBots } = await import('./_core/unifiedBotSystem');
      return await runAllBots(ctx.user.id);
    }),

  // Run specific bot
  runBot: protectedProcedure
    .input(z.object({
      botType: z.enum(['content_bot', 'seo_bot', 'distribution_bot', 'affiliate_bot', 'analytics_bot', 'learning_bot']),
    }))
    .mutation(async ({ ctx, input }) => {
      const botModule = await import('./_core/unifiedBotSystem');
      switch (input.botType) {
        case 'content_bot':
          return await botModule.runContentBot(ctx.user.id);
        case 'seo_bot':
          return await botModule.runSEOBot(ctx.user.id);
        case 'distribution_bot':
          return await botModule.runDistributionBot(ctx.user.id);
        case 'affiliate_bot':
          return await botModule.runAffiliateBot(ctx.user.id);
        case 'analytics_bot':
          return await botModule.runAnalyticsBot(ctx.user.id);
        case 'learning_bot':
          return await botModule.runLearningBot(ctx.user.id);
        default:
          throw new Error('Unknown bot type');
      }
    }),

  // Get bot messages
  getBotMessages: protectedProcedure
    .input(z.object({
      botType: z.enum(['content_bot', 'seo_bot', 'distribution_bot', 'affiliate_bot', 'analytics_bot', 'learning_bot']),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const { getBotMessages } = await import('./_core/unifiedBotSystem');
      return getBotMessages(input.botType, input.limit);
    }),

  // ============================================
  // ULTIMATE HIVE MIND - Fully Autonomous System
  // ============================================

  // Execute voice command
  voiceCommand: protectedProcedure
    .input(z.object({
      command: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { executeVoiceCommand } = await import('./_core/ultimateHiveMind');
      return await executeVoiceCommand(ctx.user.id, input.command);
    }),

  // Global auto-wake - wakes ALL pages and functions
  globalAutoWake: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { globalAutoWake } = await import('./_core/ultimateHiveMind');
      return await globalAutoWake(ctx.user.id);
    }),

  // Self-implement revenue stream
  selfImplementRevenue: protectedProcedure
    .input(z.object({
      platform: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { selfImplementRevenue } = await import('./_core/ultimateHiveMind');
      return await selfImplementRevenue(ctx.user.id, input.platform);
    }),

  // Get ultimate hive mind status
  getUltimateStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const { getHiveMindStatus } = await import('./_core/ultimateHiveMind');
      return await getHiveMindStatus(ctx.user.id);
    }),

  // Run continuous optimization
  runOptimization: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runContinuousOptimization } = await import('./_core/ultimateHiveMind');
      return await runContinuousOptimization(ctx.user.id);
    }),

  // Get available monetization platforms
  getMonetizationPlatforms: protectedProcedure
    .query(async () => {
      const { getMonetizationPlatforms } = await import('./_core/ultimateHiveMind');
      return getMonetizationPlatforms();
    }),

  // ============================================
  // SELF-IMPLEMENTING REVENUE SYSTEM
  // ============================================

  // Get all available revenue platforms
  getRevenuePlatforms: protectedProcedure
    .query(async () => {
      const { getAvailableRevenuePlatforms } = await import('./_core/selfImplementingRevenue');
      return getAvailableRevenuePlatforms();
    }),

  // Analyze revenue gaps and opportunities
  analyzeRevenueGaps: protectedProcedure
    .query(async ({ ctx }) => {
      const { analyzeRevenueGaps } = await import('./_core/selfImplementingRevenue');
      return await analyzeRevenueGaps(ctx.user.id);
    }),

  // Generate integration instructions for a platform
  getIntegrationInstructions: protectedProcedure
    .input(z.object({ platformName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { generateIntegrationInstructions } = await import('./_core/selfImplementingRevenue');
      return await generateIntegrationInstructions(ctx.user.id, input.platformName);
    }),

  // Auto-discover CJ opportunities
  discoverCJOpportunities: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { autoDiscoverCJOpportunities } = await import('./_core/selfImplementingRevenue');
      return await autoDiscoverCJOpportunities(ctx.user.id);
    }),

  // Generate revenue report
  getRevenueReport: protectedProcedure
    .query(async ({ ctx }) => {
      const { generateRevenueReport } = await import('./_core/selfImplementingRevenue');
      return await generateRevenueReport(ctx.user.id);
    }),

  // Notify owner of opportunities
  notifyOwnerOpportunities: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { notifyOwnerOfOpportunities } = await import('./_core/selfImplementingRevenue');
      return await notifyOwnerOfOpportunities(ctx.user.id);
    }),

  // Auto-implement a revenue stream
  autoImplementRevenue: protectedProcedure
    .input(z.object({ platformName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { autoImplementRevenueStream } = await import('./_core/selfImplementingRevenue');
      return await autoImplementRevenueStream(ctx.user.id, input.platformName);
    }),

  // Get revenue dashboard
  getRevenueDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const { getRevenueDashboard } = await import('./_core/selfImplementingRevenue');
      return await getRevenueDashboard(ctx.user.id);
    }),

  // ============================================
  // GLOBAL AUTO-WAKE SYSTEM
  // ============================================

  // Get all page configurations
  getPageConfigs: protectedProcedure
    .query(async () => {
      const { getPageConfigs } = await import('./_core/globalAutoWake');
      return getPageConfigs();
    }),

  // Wake a specific page
  wakePage: protectedProcedure
    .input(z.object({ pageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { wakePage } = await import('./_core/globalAutoWake');
      return await wakePage(ctx.user.id, input.pageId);
    }),

  // Run global wake cycle
  runGlobalWakeCycle: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runGlobalWakeCycle } = await import('./_core/globalAutoWake');
      return await runGlobalWakeCycle(ctx.user.id);
    }),

  // Start continuous wake
  startContinuousWake: protectedProcedure
    .input(z.object({ intervalMs: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { startContinuousWake } = await import('./_core/globalAutoWake');
      return startContinuousWake(ctx.user.id, input.intervalMs);
    }),

  // Stop continuous wake
  stopContinuousWake: protectedProcedure
    .mutation(async () => {
      const { stopContinuousWake } = await import('./_core/globalAutoWake');
      return stopContinuousWake();
    }),

  // Get global wake status
  getGlobalWakeStatus: protectedProcedure
    .query(async () => {
      const { getGlobalWakeStatus } = await import('./_core/globalAutoWake');
      return getGlobalWakeStatus();
    }),

  // Force wake all pages
  forceWakeAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { forceWakeAll } = await import('./_core/globalAutoWake');
      return await forceWakeAll(ctx.user.id);
    }),

  // Set page wake configuration
  setPageWakeConfig: protectedProcedure
    .input(z.object({
      pageId: z.string(),
      isActive: z.boolean().optional(),
      wakeIntervalMs: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const { setPageWakeConfig } = await import('./_core/globalAutoWake');
      return setPageWakeConfig(input.pageId, {
        isActive: input.isActive,
        wakeIntervalMs: input.wakeIntervalMs
      });
    }),

  // ============================================
  // INCOME DISCOVERY ENGINE
  // ============================================

  // Get all discovered income opportunities
  getIncomeOpportunities: protectedProcedure
    .query(async () => {
      const { getDiscoveredOpportunities } = await import('./_core/incomeDiscoveryEngine');
      return getDiscoveredOpportunities();
    }),

  // Analyze income gaps
  analyzeIncomeGaps: protectedProcedure
    .query(async ({ ctx }) => {
      const { analyzeIncomeGaps } = await import('./_core/incomeDiscoveryEngine');
      return await analyzeIncomeGaps(ctx.user.id);
    }),

  // Discover new opportunities
  discoverNewOpportunities: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { discoverNewOpportunities } = await import('./_core/incomeDiscoveryEngine');
      return await discoverNewOpportunities(ctx.user.id);
    }),

  // Auto-integrate an opportunity
  autoIntegrateOpportunity: protectedProcedure
    .input(z.object({ opportunityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { autoIntegrateOpportunity } = await import('./_core/incomeDiscoveryEngine');
      return await autoIntegrateOpportunity(ctx.user.id, input.opportunityId);
    }),

  // Get income optimizations
  getIncomeOptimizations: protectedProcedure
    .query(async ({ ctx }) => {
      const { getIncomeOptimizations } = await import('./_core/incomeDiscoveryEngine');
      return await getIncomeOptimizations(ctx.user.id);
    }),

  // Generate income report
  generateIncomeReport: protectedProcedure
    .query(async ({ ctx }) => {
      const { generateIncomeReport } = await import('./_core/incomeDiscoveryEngine');
      return await generateIncomeReport(ctx.user.id);
    }),

  // Run full income discovery cycle
  runIncomeDiscoveryCycle: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runIncomeDiscoveryCycle } = await import('./_core/incomeDiscoveryEngine');
      return await runIncomeDiscoveryCycle(ctx.user.id);
    }),

  // Get income discovery status
  getIncomeDiscoveryStatus: protectedProcedure
    .query(async () => {
      const { getIncomeDiscoveryStatus } = await import('./_core/incomeDiscoveryEngine');
      return getIncomeDiscoveryStatus();
    }),

  // Notify owner of opportunities
  notifyOwnerIncomeOpportunities: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { notifyOwnerOfIncomeOpportunities } = await import('./_core/incomeDiscoveryEngine');
      return await notifyOwnerOfIncomeOpportunities(ctx.user.id);
    }),

  // ============================================
  // SELF-OPTIMIZING SYSTEM
  // ============================================

  // Collect system metrics
  collectSystemMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      const { collectSystemMetrics } = await import('./_core/selfOptimizingSystem');
      return await collectSystemMetrics(ctx.user.id);
    }),

  // Identify optimization opportunities
  identifyOptimizations: protectedProcedure
    .query(async ({ ctx }) => {
      const { collectSystemMetrics, identifyOptimizations } = await import('./_core/selfOptimizingSystem');
      const metrics = await collectSystemMetrics(ctx.user.id);
      return await identifyOptimizations(ctx.user.id, metrics);
    }),

  // Auto-fix an optimization
  autoFixOptimization: protectedProcedure
    .input(z.object({
      category: z.string(),
      issue: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { autoFixOptimization } = await import('./_core/selfOptimizingSystem');
      return await autoFixOptimization(ctx.user.id, input.category as any, input.issue);
    }),

  // Run full optimization cycle
  runOptimizationCycle: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runOptimizationCycle } = await import('./_core/selfOptimizingSystem');
      return await runOptimizationCycle(ctx.user.id);
    }),

  // Get optimization status
  getOptimizationStatus: protectedProcedure
    .query(async () => {
      const { getOptimizationStatus } = await import('./_core/selfOptimizingSystem');
      return getOptimizationStatus();
    }),

  // Get AI optimization recommendations
  getAIOptimizationRecommendations: protectedProcedure
    .query(async ({ ctx }) => {
      const { collectSystemMetrics, getAIOptimizationRecommendations } = await import('./_core/selfOptimizingSystem');
      const metrics = await collectSystemMetrics(ctx.user.id);
      return await getAIOptimizationRecommendations(ctx.user.id, metrics);
    }),

  // Get system health score
  getSystemHealthScore: protectedProcedure
    .query(async ({ ctx }) => {
      const { getSystemHealthScore } = await import('./_core/selfOptimizingSystem');
      return await getSystemHealthScore(ctx.user.id);
    }),

  // Real Page Publishing
  getFreePlatforms: protectedProcedure
    .query(async () => {
      const { getFreePlatforms } = await import('./_core/realPagePublisher');
      return getFreePlatforms();
    }),

  getPaymentConfig: protectedProcedure
    .query(async () => {
      const { getPaymentConfig } = await import('./_core/realPagePublisher');
      return getPaymentConfig();
    }),

  generateSEOPage: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { generateSEOOptimizedPage } = await import('./_core/realPagePublisher');
      return await generateSEOOptimizedPage(input.articleId, ctx.user.id);
    }),

  publishToFreePlatform: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      platformId: z.string(),
      credentials: z.record(z.string(), z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { publishToPlatform } = await import('./_core/realPagePublisher');
      const creds: Record<string, string> | undefined = input.credentials;
      return await publishToPlatform(input.articleId, input.platformId, ctx.user.id, creds);
    }),

  autoPublishToAll: protectedProcedure
    .input(z.object({
      articleId: z.number(),
      credentials: z.record(z.string(), z.record(z.string(), z.string())).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { autoPublishToAllPlatforms } = await import('./_core/realPagePublisher');
      const creds: Record<string, Record<string, string>> = input.credentials || {};
      return await autoPublishToAllPlatforms(input.articleId, ctx.user.id, creds);
    }),

  discoverPublishingOpportunities: protectedProcedure
    .query(async ({ ctx }) => {
      const { discoverPublishingOpportunities } = await import('./_core/realPagePublisher');
      return await discoverPublishingOpportunities(ctx.user.id);
    }),

  getArticlesReadyForPublishing: protectedProcedure
    .query(async ({ ctx }) => {
      const { getArticlesReadyForPublishing } = await import('./_core/realPagePublisher');
      return await getArticlesReadyForPublishing(ctx.user.id);
    }),

  setupPayPalRouting: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { setupPayPalRouting } = await import('./_core/realPagePublisher');
      return await setupPayPalRouting(ctx.user.id);
    }),

  getPublishingStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { getPublishingStats } = await import('./_core/realPagePublisher');
      return await getPublishingStats(ctx.user.id);
    }),

  // Platform Discovery procedures
  discoverPlatforms: protectedProcedure
    .mutation(async () => {
      const { discoverNewPlatforms } = await import('./_core/platformDiscovery');
      return await discoverNewPlatforms();
    }),

  getPlatformStatuses: protectedProcedure
    .query(async () => {
      const { getPlatformStatuses } = await import('./_core/platformDiscovery');
      return await getPlatformStatuses();
    }),

  selectBestPlatforms: protectedProcedure
    .input(z.object({ articleId: z.number() }))
    .query(async ({ input }) => {
      const { selectBestPlatforms } = await import('./_core/platformDiscovery');
      return await selectBestPlatforms(input.articleId);
    }),

  scanMonetization: protectedProcedure
    .mutation(async () => {
      const { scanMonetizationOpportunities } = await import('./_core/platformDiscovery');
      return await scanMonetizationOpportunities();
    }),

  autoIntegratePlatform: protectedProcedure
    .input(z.object({ platformId: z.string(), paypalEmail: z.string() }))
    .mutation(async ({ input }) => {
      const { autoIntegratePlatform } = await import('./_core/platformDiscovery');
      return await autoIntegratePlatform(input.platformId, input.paypalEmail);
    }),

  getAllPlatformsSummary: protectedProcedure
    .query(async () => {
      const { getAllPlatformsSummary } = await import('./_core/platformDiscovery');
      return await getAllPlatformsSummary();
    }),

  // PayPal Routing procedures
  getPayPalConfig: protectedProcedure
    .query(async () => {
      const { getPayPalConfig } = await import('./_core/paypalRouting');
      return getPayPalConfig();
    }),

  setupPayPalForSource: protectedProcedure
    .input(z.object({ sourceId: z.string() }))
    .mutation(async ({ input }) => {
      const { setupPayPalForSource } = await import('./_core/paypalRouting');
      return await setupPayPalForSource(input.sourceId);
    }),

  recordIncome: protectedProcedure
    .input(z.object({ sourceId: z.string(), amount: z.number(), currency: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { recordIncome } = await import('./_core/paypalRouting');
      return await recordIncome(input.sourceId, input.amount, input.currency);
    }),

  getIncomeRecords: protectedProcedure
    .query(async () => {
      const { getIncomeRecords } = await import('./_core/paypalRouting');
      return getIncomeRecords();
    }),

  getIncomeSummary: protectedProcedure
    .query(async () => {
      const { getIncomeSummary } = await import('./_core/paypalRouting');
      return getIncomeSummary();
    }),

  autoSetupAllPayPalSources: protectedProcedure
    .mutation(async () => {
      const { autoSetupAllSources } = await import('./_core/paypalRouting');
      return await autoSetupAllSources();
    }),

  getPayPalMeLink: protectedProcedure
    .input(z.object({ amount: z.number().optional() }))
    .query(async ({ input }) => {
      const { getPayPalMeLink } = await import('./_core/paypalRouting');
      return { link: getPayPalMeLink(input.amount) };
    }),

  generateTipButton: protectedProcedure
    .query(async () => {
      const { generateTipButtonHtml } = await import('./_core/paypalRouting');
      return { html: generateTipButtonHtml() };
    }),

  getPayPalOpportunities: protectedProcedure
    .query(async () => {
      const { getPayPalMonetizationOpportunities } = await import('./_core/paypalRouting');
      return getPayPalMonetizationOpportunities();
    }),

  // Autonomous Debug Bot
  initDebugBot: protectedProcedure
    .mutation(async () => {
      const { initializeDebugBot } = await import('./_core/autonomousDebugBot');
      return initializeDebugBot();
    }),

  runDebugScan: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { runFullSystemScan } = await import('./_core/autonomousDebugBot');
      return runFullSystemScan(String(ctx.user.id));
    }),

  getDebugBotState: protectedProcedure
    .query(async () => {
      const { getDebugBotState } = await import('./_core/autonomousDebugBot');
      return getDebugBotState();
    }),

  autoFixDistributionUrls: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { autoFixDistributionUrls } = await import('./_core/autonomousDebugBot');
      return autoFixDistributionUrls(String(ctx.user.id));
    }),

  getRealDistributionUrls: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { getRealDistributionUrls } = await import('./_core/autonomousDebugBot');
      return getRealDistributionUrls(String(ctx.user.id), input?.limit || 50);
    }),

  startDebugMonitoring: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { startContinuousMonitoring } = await import('./_core/autonomousDebugBot');
      await startContinuousMonitoring(String(ctx.user.id));
      return { success: true, message: 'Debug bot monitoring started' };
    }),

  stopDebugMonitoring: protectedProcedure
    .mutation(async () => {
      const { stopContinuousMonitoring } = await import('./_core/autonomousDebugBot');
      stopContinuousMonitoring();
      return { success: true, message: 'Debug bot monitoring stopped' };
    }),

  learnFromFeedback: protectedProcedure
    .input(z.object({
      issueId: z.string(),
      wasSuccessful: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      const { learnFromFeedback } = await import('./_core/autonomousDebugBot');
      await learnFromFeedback(input.issueId, input.wasSuccessful, String(ctx.user.id));
      return { success: true };
    }),

  consultHiveMindDebug: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { consultHiveMind } = await import('./_core/autonomousDebugBot');
      const response = await consultHiveMind(input.query, String(ctx.user.id));
      return { response };
    }),

  // Crypto Earning
  getCryptoState: protectedProcedure
    .query(async ({ ctx }) => {
      const { getCryptoEarningState } = await import('./_core/autoCryptoEarner');
      return getCryptoEarningState(ctx.user.id);
    }),

  getCryptoOpportunities: protectedProcedure
    .query(async () => {
      const { getAllCryptoOpportunities } = await import('./_core/autoCryptoEarner');
      return getAllCryptoOpportunities();
    }),

  scanCryptoOpportunities: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { scanForOpportunities } = await import('./_core/autoCryptoEarner');
      return scanForOpportunities(ctx.user.id);
    }),

  autoClaimCrypto: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { autoClaimRewards } = await import('./_core/autoCryptoEarner');
      return autoClaimRewards(ctx.user.id);
    }),

  setupCryptoWallet: protectedProcedure
    .input(z.object({ walletAddress: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { setupWallet } = await import('./_core/autoCryptoEarner');
      return setupWallet(ctx.user.id, input.walletAddress);
    }),

  getCryptoReferrals: protectedProcedure
    .query(async ({ ctx }) => {
      const { getReferralLinks } = await import('./_core/autoCryptoEarner');
      return getReferralLinks(ctx.user.id);
    }),

  optimizeCryptoEarnings: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { optimizeCryptoEarnings } = await import('./_core/autoCryptoEarner');
      return optimizeCryptoEarnings(ctx.user.id);
    }),

  generateCryptoContent: protectedProcedure
    .input(z.object({ topic: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { generateCryptoContent } = await import('./_core/autoCryptoEarner');
      return generateCryptoContent(ctx.user.id, input.topic);
    }),
});

// Awin Affiliate Network Router
const awinRouter = router({
  // Get API status
  getStatus: protectedProcedure
    .query(async () => {
      const { checkAwinApiStatus } = await import('./_core/awinApi');
      return checkAwinApiStatus();
    }),

  // Get all programmes
  getProgrammes: protectedProcedure
    .input(z.object({
      relationship: z.enum(["joined", "pending", "suspended", "rejected", "not joined"]).optional(),
      countryCode: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { getAwinProgrammes } = await import('./_core/awinApi');
      return getAwinProgrammes(undefined, input || {});
    }),

  // Get joined programmes only
  getJoinedProgrammes: protectedProcedure
    .query(async () => {
      const { getJoinedAwinProgrammes } = await import('./_core/awinApi');
      return getJoinedAwinProgrammes();
    }),

  // Search programmes
  searchProgrammes: protectedProcedure
    .input(z.object({ keyword: z.string() }))
    .query(async ({ input }) => {
      const { searchAwinProgrammes } = await import('./_core/awinApi');
      return searchAwinProgrammes(input.keyword);
    }),

  // Create affiliate link
  createLink: protectedProcedure
    .input(z.object({
      advertiserId: z.number(),
      destinationUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { createAwinLink } = await import('./_core/awinApi');
      return createAwinLink(undefined, input.advertiserId, input.destinationUrl);
    }),

  // Get commission summary
  getCommissionSummary: protectedProcedure
    .input(z.object({ days: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const { getAwinCommissionSummary } = await import('./_core/awinApi');
      return getAwinCommissionSummary(undefined, input?.days || 30);
    }),

  // Get top advertisers
  getTopAdvertisers: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const { getTopAwinAdvertisers } = await import('./_core/awinApi');
      return getTopAwinAdvertisers(undefined, input?.limit || 10);
    }),

  // Sync programmes to database
  syncProgrammes: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { syncAwinProgrammes } = await import('./_core/awinApi');
      return syncAwinProgrammes(ctx.user.id);
    }),

  // Import links to database
  importLinks: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { getAwinProgrammes, importAwinLinksToDatabase } = await import('./_core/awinApi');
      const programmes = await getAwinProgrammes();
      return importAwinLinksToDatabase(ctx.user.id, programmes);
    }),

  // Get transactions
  getTransactions: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { getAwinTransactions } = await import('./_core/awinApi');
      return getAwinTransactions(undefined, input.startDate, input.endDate, { status: input.status });
    }),
});

// NFT Empire Router - High-value NFT generation with marketplace listings
const nftEmpireRouter = router({
  // Generate high-value NFT
  generateHighValue: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      targetPrice: z.number().optional(),
      forceRarity: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const { generateHighValueNFT } = await import('./_core/nftEmpire');
      return generateHighValueNFT(ctx.user.id, input);
    }),

  // List on all marketplaces
  listOnAllMarketplaces: protectedProcedure
    .input(z.object({
      nftId: z.string(),
      customPrice: z.number().optional(),
      priorityMarketplaces: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { listOnAllMarketplaces } = await import('./_core/nftEmpire');
      return listOnAllMarketplaces(ctx.user.id, input.nftId, {
        customPrice: input.customPrice,
        priorityMarketplaces: input.priorityMarketplaces,
      });
    }),

  // Submit to auto-buy platforms
  submitToAutoBuy: protectedProcedure
    .input(z.object({ nftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { submitToAutoBuyPlatforms } = await import('./_core/nftEmpire');
      return submitToAutoBuyPlatforms(ctx.user.id, input.nftId);
    }),

  // Transfer to wallet
  transferToWallet: protectedProcedure
    .input(z.object({
      nftId: z.string(),
      walletAddress: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { transferToWallet } = await import('./_core/nftEmpire');
      return transferToWallet(ctx.user.id, input.nftId, input.walletAddress);
    }),

  // Cash out earnings
  cashOut: protectedProcedure
    .input(z.object({
      walletAddress: z.string(),
      amount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { cashOutEarnings } = await import('./_core/nftEmpire');
      return cashOutEarnings(ctx.user.id, input.walletAddress, input.amount);
    }),

  // Batch generate empire NFTs
  batchGenerate: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(50),
      category: z.string().optional(),
      autoList: z.boolean().optional(),
      autoSubmitToBuyers: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { batchGenerateEmpireNFTs } = await import('./_core/nftEmpire');
      return batchGenerateEmpireNFTs(ctx.user.id, input.count, {
        category: input.category,
        autoList: input.autoList,
        autoSubmitToBuyers: input.autoSubmitToBuyers,
      });
    }),

  // Get portfolio
  getPortfolio: protectedProcedure
    .query(async () => {
      const { getEmpirePortfolio } = await import('./_core/nftEmpire');
      return getEmpirePortfolio();
    }),

  // Get all empire NFTs
  getAllNFTs: protectedProcedure
    .query(async () => {
      const { getAllEmpireNFTs } = await import('./_core/nftEmpire');
      return getAllEmpireNFTs();
    }),

  // Get marketplaces
  getMarketplaces: protectedProcedure
    .query(async () => {
      const { getAvailableMarketplaces } = await import('./_core/nftEmpire');
      return getAvailableMarketplaces();
    }),

  // Get auto-buy platforms
  getAutoBuyPlatforms: protectedProcedure
    .query(async () => {
      const { getAutoBuyPlatforms } = await import('./_core/nftEmpire');
      return getAutoBuyPlatforms();
    }),

  // Get high-value categories
  getCategories: protectedProcedure
    .query(async () => {
      const { getHighValueCategories } = await import('./_core/nftEmpire');
      return getHighValueCategories();
    }),
});

// Data Monetization Router - Generate and sell AI data
const dataMonetizationRouter = router({
  // Generate data batch
  generateBatch: protectedProcedure
    .input(z.object({
      type: z.string(),
      count: z.number().min(1).max(1000),
      topic: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { generateDataBatch } = await import('./_core/dataMonetization');
      return generateDataBatch(ctx.user.id, input);
    }),

  // Submit to platforms
  submitToPlatforms: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { submitDataToPlatforms } = await import('./_core/dataMonetization');
      return submitDataToPlatforms(ctx.user.id, input.batchId);
    }),

  // Get all data
  getAllData: protectedProcedure
    .query(async () => {
      const { getAllGeneratedData } = await import('./_core/dataMonetization');
      return getAllGeneratedData();
    }),

  // Get all batches
  getAllBatches: protectedProcedure
    .query(async () => {
      const { getAllDataBatches } = await import('./_core/dataMonetization');
      return getAllDataBatches();
    }),

  // Get buying platforms
  getPlatforms: protectedProcedure
    .query(async () => {
      const { getDataBuyingPlatforms } = await import('./_core/dataMonetization');
      return getDataBuyingPlatforms();
    }),

  // Get data types
  getDataTypes: protectedProcedure
    .query(async () => {
      const { getDataGenerationTypes } = await import('./_core/dataMonetization');
      return getDataGenerationTypes();
    }),

  // Get earnings
  getEarnings: protectedProcedure
    .query(async () => {
      const { getDataEarnings } = await import('./_core/dataMonetization');
      return getDataEarnings();
    }),

  // Get stats
  getStats: protectedProcedure
    .query(async () => {
      const { getDataMonetizationStats } = await import('./_core/dataMonetization');
      return getDataMonetizationStats();
    }),
});

// NFT Automation Router - Generate, value, and sell NFTs automatically
const nftRouter = router({
  // Generate a single NFT with AI artwork
  generate: protectedProcedure
    .input(z.object({
      style: z.string().optional(),
      customPrompt: z.string().optional(),
      collectionName: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const { generateNFT } = await import('./_core/nftAutomation');
      return generateNFT(ctx.user.id, input);
    }),

  // Auto-list NFT on all marketplaces
  autoList: protectedProcedure
    .input(z.object({
      nftId: z.string(),
      price: z.number().optional(),
      marketplaces: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { autoListNFT } = await import('./_core/nftAutomation');
      return autoListNFT(ctx.user.id, input.nftId, {
        price: input.price,
        marketplaces: input.marketplaces,
      });
    }),

  // Batch generate and list NFTs
  batchGenerate: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(50),
      collectionName: z.string().optional(),
      style: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { batchGenerateAndList } = await import('./_core/nftAutomation');
      return batchGenerateAndList(ctx.user.id, input.count, {
        collectionName: input.collectionName,
        style: input.style,
      });
    }),

  // Get optimal pricing for a style
  getOptimalPricing: protectedProcedure
    .input(z.object({ style: z.string() }))
    .query(async ({ input }) => {
      const { getOptimalPricing } = await import('./_core/nftAutomation');
      return getOptimalPricing(input.style);
    }),

  // Get market intelligence
  getMarketIntelligence: protectedProcedure
    .query(async () => {
      const { getNFTMarketIntelligence } = await import('./_core/nftAutomation');
      return getNFTMarketIntelligence();
    }),

  // Get all generated NFTs
  getAllNFTs: protectedProcedure
    .query(async () => {
      const { getAllNFTs } = await import('./_core/nftAutomation');
      return getAllNFTs();
    }),

  // Get available marketplaces
  getMarketplaces: protectedProcedure
    .query(async () => {
      const { getMarketplaces } = await import('./_core/nftAutomation');
      return getMarketplaces();
    }),

  // Get available art styles
  getArtStyles: protectedProcedure
    .query(async () => {
      const { getArtStyles } = await import('./_core/nftAutomation');
      return getArtStyles();
    }),

  // Learn from a sale
  learnFromSale: protectedProcedure
    .input(z.object({
      nftId: z.string(),
      marketplace: z.string(),
      soldPrice: z.number(),
      buyerAddress: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { learnFromSales } = await import('./_core/nftAutomation');
      await learnFromSales(ctx.user.id, input);
      return { success: true };
    }),
});

// Always Awake Router - Keeps the money machine running 24/7
const alwaysAwakeRouter = router({
  // Start the always-awake system
  start: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { startAlwaysAwake } = await import('./_core/alwaysAwake');
      return startAlwaysAwake(ctx.user.id);
    }),

  // Stop the always-awake system
  stop: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { stopAlwaysAwake } = await import('./_core/alwaysAwake');
      return stopAlwaysAwake(ctx.user.id);
    }),

  // Get current status
  getStatus: protectedProcedure
    .query(async () => {
      const { getAlwaysAwakeStatus } = await import('./_core/alwaysAwake');
      return getAlwaysAwakeStatus();
    }),

  // Force run all operations
  forceRunAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { forceRunAll } = await import('./_core/alwaysAwake');
      return forceRunAll(ctx.user.id);
    }),

  // Get earnings summary
  getEarnings: protectedProcedure
    .query(async () => {
      const { getEarningsSummary } = await import('./_core/alwaysAwake');
      return getEarningsSummary();
    }),

  // Wake up the system
  wakeUp: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { wakeUp } = await import('./_core/alwaysAwake');
      return wakeUp(ctx.user.id);
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  topics: topicsRouter,
  articles: articlesRouter,
  affiliate: affiliateRouter,
  analytics: analyticsRouter,
  cj: cjRouter,
  publishing: publishingRouter,
  contentQueue: contentQueueRouter,
  publicArticles: publicArticlesRouter,
  automation: automationRouter,
  learning: learningRouter,
  distribution: distributionRouter,
  bot: botRouter,
  urlShortener: urlShortenerRouter,
  tracking: trackingRouter,
  training: trainingRouter,
  audit: auditRouter,
  llm: llmRouter,
  optimizer: optimizerRouter,
  hiveMind: hiveMindRouter,
  awin: awinRouter,
  alwaysAwake: alwaysAwakeRouter,
  nft: nftRouter,
  nftEmpire: nftEmpireRouter,
  dataMonetization: dataMonetizationRouter,
});

export type AppRouter = typeof appRouter;
