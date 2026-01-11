import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

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
});

export type AppRouter = typeof appRouter;
