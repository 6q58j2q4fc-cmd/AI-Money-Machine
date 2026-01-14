/**
 * Branded Product Pages System
 * 
 * Generates beautifully designed, SEO-optimized product recommendation pages
 * that can be published directly to the MoneyMachine website. This serves as
 * a fallback when external platform APIs aren't available.
 */

import { getDb } from '../db';
import { articles, affiliateLinks } from '../../drizzle/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { invokeMultiLLM } from './multiLlm';
import { ENV } from './env';

export interface ProductPage {
  id?: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  products: ProductRecommendation[];
  heroImage?: string;
  seoMeta: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
  };
  content: {
    intro: string;
    buyingGuide: string;
    faq: { question: string; answer: string }[];
    conclusion: string;
  };
  affiliateLinks: EmbeddedAffiliateLink[];
  backlinks: { title: string; url: string; anchor: string }[];
  createdAt: Date;
  publishedAt?: Date;
  views: number;
  clicks: number;
}

export interface ProductRecommendation {
  name: string;
  description: string;
  price?: string;
  rating?: number;
  pros: string[];
  cons: string[];
  affiliateUrl: string;
  imageUrl?: string;
  badge?: 'Best Overall' | 'Best Value' | 'Premium Pick' | 'Budget Pick' | 'Editor\'s Choice';
}

export interface EmbeddedAffiliateLink {
  id: number;
  name: string;
  url: string;
  placement: 'hero' | 'product-card' | 'inline' | 'cta' | 'sidebar';
  imageUrl?: string;
}

/**
 * Generate a branded product page from an article
 */
export async function generateProductPage(
  articleId: number,
  userId: number
): Promise<ProductPage | null> {
  const db = await getDb();
  if (!db) return null;

  // Get the article
  const [article] = await db.select().from(articles).where(eq(articles.id, articleId));
  if (!article) return null;

  // Get approved affiliate links for this user
  const userLinks = await db.select()
    .from(affiliateLinks)
    .where(eq(affiliateLinks.userId, userId))
    .limit(20);

  // Generate product recommendations using LLM
  const productPrompt = `Based on this article about "${article.title}", generate 5 product recommendations.

Article excerpt: ${article.content?.substring(0, 1000)}

For each product, provide:
1. Product name
2. Brief description (2-3 sentences)
3. Estimated price range
4. Rating (1-5 stars)
5. 3 pros
6. 2 cons
7. A badge if applicable (Best Overall, Best Value, Premium Pick, Budget Pick, Editor's Choice)

Return as JSON array with objects containing: name, description, price, rating, pros (array), cons (array), badge (optional).`;

  const productResponse = await invokeMultiLLM('article_generation', [
    { role: 'system', content: 'You are a product review expert. Generate helpful, honest product recommendations.' },
    { role: 'user', content: productPrompt }
  ], { maxTokens: 2000 });

  // Parse products
  let products: ProductRecommendation[] = [];
  try {
    const jsonMatch = productResponse.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      products = parsed.map((p: any, index: number) => ({
        name: p.name || `Product ${index + 1}`,
        description: p.description || '',
        price: p.price,
        rating: p.rating || 4,
        pros: p.pros || [],
        cons: p.cons || [],
        affiliateUrl: userLinks[index % userLinks.length]?.url || '#',
        badge: p.badge,
      }));
    }
  } catch (e) {
    // Fallback to basic products
    products = userLinks.slice(0, 5).map((link, i) => ({
      name: link.name,
      description: `High-quality ${link.category || 'product'} recommended for ${article.title}`,
      price: '$29.99 - $99.99',
      rating: 4.5,
      pros: ['Great value', 'Highly rated', 'Easy to use'],
      cons: ['May vary by region'],
      affiliateUrl: link.url,
      badge: i === 0 ? 'Best Overall' : undefined,
    }));
  }

  // Generate content sections
  const contentPrompt = `Create content for a product recommendation page about "${article.title}".

Generate:
1. An engaging intro paragraph (100-150 words)
2. A buying guide section (200-300 words) with tips for choosing the right product
3. 5 FAQ items with questions and answers
4. A conclusion paragraph (100 words) with a call to action

Return as JSON with: intro, buyingGuide, faq (array of {question, answer}), conclusion.`;

  const contentResponse = await invokeMultiLLM('article_generation', [
    { role: 'system', content: 'You are a content writer creating helpful buying guides.' },
    { role: 'user', content: contentPrompt }
  ], { maxTokens: 2000 });

  let content = {
    intro: `Discover the best products for ${article.title}. Our team has researched and tested numerous options to bring you this curated list of recommendations.`,
    buyingGuide: `When shopping for products related to ${article.title}, consider factors like quality, price, and user reviews. Look for items with good warranties and customer support.`,
    faq: [
      { question: 'How did you select these products?', answer: 'Our team researches user reviews, expert opinions, and hands-on testing to curate the best options.' },
      { question: 'Are these affiliate links?', answer: 'Yes, we may earn a commission if you purchase through our links, at no extra cost to you.' },
    ],
    conclusion: `We hope this guide helps you find the perfect product. Click any recommendation above to learn more and make your purchase.`,
  };

  try {
    const jsonMatch = contentResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      content = {
        intro: parsed.intro || content.intro,
        buyingGuide: parsed.buyingGuide || content.buyingGuide,
        faq: parsed.faq || content.faq,
        conclusion: parsed.conclusion || content.conclusion,
      };
    }
  } catch (e) {
    // Use fallback content
  }

  // Generate slug
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80) + '-products';

  // Create embedded affiliate links
  const embeddedLinks: EmbeddedAffiliateLink[] = userLinks.slice(0, 10).map((link, i) => ({
    id: link.id,
    name: link.name,
    url: link.url,
    placement: i === 0 ? 'hero' : i < 5 ? 'product-card' : 'sidebar',
  }));

  // Create backlinks to related articles
  const relatedArticles = await db.select()
    .from(articles)
    .where(and(
      eq(articles.userId, userId),
      eq(articles.status, 'published')
    ))
    .orderBy(desc(articles.createdAt))
    .limit(5);

  const backlinks = relatedArticles
    .filter(a => a.id !== articleId)
    .map(a => ({
      title: a.title,
      url: `/blog/${a.slug}`,
      anchor: a.title.substring(0, 50),
    }));

  // Clean title - remove duplicate "Best" prefixes and suffixes
  const cleanTitle = article.title
    .replace(/^(Best\s*)+/gi, '') // Remove leading "Best" duplicates
    .replace(/\s*-\s*Top Picks & Reviews$/gi, '') // Remove trailing suffix if present
    .trim();
  
  const productPage: ProductPage = {
    slug,
    title: `Best ${cleanTitle} - Top Picks & Reviews`,
    description: `Find the best products for ${cleanTitle}. Expert reviews, comparisons, and buying guide.`,
    category: 'general',
    products,
    seoMeta: {
      title: `Best ${cleanTitle} - Top Picks & Reviews | MoneyMachine`,
      description: `Discover top-rated products for ${cleanTitle}. Compare prices, read reviews, and find the best deals.`,
      keywords: [
        article.title.toLowerCase(),
        'best products',
        'reviews',
        'buying guide',
        'top picks',
        ...(article.keywords || []),
      ],
    },
    content,
    affiliateLinks: embeddedLinks,
    backlinks,
    createdAt: new Date(),
    views: 0,
    clicks: 0,
  };

  return productPage;
}

/**
 * Generate HTML for a product page
 */
export function generateProductPageHTML(page: ProductPage): string {
  const productCards = page.products.map(product => `
    <div class="product-card">
      ${product.badge ? `<span class="badge">${product.badge}</span>` : ''}
      ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-image" />` : ''}
      <h3>${product.name}</h3>
      <div class="rating">${'★'.repeat(Math.floor(product.rating || 4))}${'☆'.repeat(5 - Math.floor(product.rating || 4))}</div>
      ${product.price ? `<p class="price">${product.price}</p>` : ''}
      <p class="description">${product.description}</p>
      <div class="pros-cons">
        <div class="pros">
          <h4>✓ Pros</h4>
          <ul>${product.pros.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        <div class="cons">
          <h4>✗ Cons</h4>
          <ul>${product.cons.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
      </div>
      <a href="${product.affiliateUrl}" class="cta-button" target="_blank" rel="noopener sponsored">
        Check Price →
      </a>
    </div>
  `).join('');

  const faqItems = page.content.faq.map(item => `
    <div class="faq-item">
      <h4>${item.question}</h4>
      <p>${item.answer}</p>
    </div>
  `).join('');

  const backlinksHTML = page.backlinks.map(link => `
    <a href="${link.url}" class="backlink">${link.anchor}</a>
  `).join(' • ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.seoMeta.title}</title>
  <meta name="description" content="${page.seoMeta.description}">
  <meta name="keywords" content="${page.seoMeta.keywords.join(', ')}">
  <meta property="og:title" content="${page.seoMeta.title}">
  <meta property="og:description" content="${page.seoMeta.description}">
  <meta property="og:type" content="article">
  ${page.seoMeta.ogImage ? `<meta property="og:image" content="${page.seoMeta.ogImage}">` : ''}
  <link rel="canonical" href="${ENV.appUrl}/products/${page.slug}">
  <style>
    :root {
      --primary: #f59e0b;
      --primary-dark: #d97706;
      --bg: #0f0f0f;
      --card-bg: #1a1a1a;
      --text: #ffffff;
      --text-muted: #9ca3af;
      --border: #333;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .hero {
      text-align: center;
      padding: 4rem 2rem;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border-radius: 1rem;
      margin-bottom: 3rem;
    }
    .hero h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .hero p { color: var(--text-muted); font-size: 1.2rem; max-width: 600px; margin: 0 auto; }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
      margin: 3rem 0;
    }
    .product-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2rem;
      position: relative;
    }
    .product-card .badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: var(--primary);
      color: #000;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .product-card h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .product-card .rating { color: var(--primary); margin-bottom: 0.5rem; }
    .product-card .price { font-size: 1.25rem; color: var(--primary); font-weight: 600; margin-bottom: 1rem; }
    .product-card .description { color: var(--text-muted); margin-bottom: 1.5rem; }
    .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
    .pros h4 { color: #22c55e; }
    .cons h4 { color: #ef4444; }
    .pros ul, .cons ul { list-style: none; padding-left: 0; }
    .pros li, .cons li { padding: 0.25rem 0; font-size: 0.9rem; color: var(--text-muted); }
    .cta-button {
      display: block;
      text-align: center;
      background: var(--primary);
      color: #000;
      padding: 1rem 2rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .cta-button:hover { background: var(--primary-dark); }
    .content-section { margin: 3rem 0; }
    .content-section h2 { font-size: 1.75rem; margin-bottom: 1rem; border-bottom: 2px solid var(--primary); padding-bottom: 0.5rem; }
    .content-section p { color: var(--text-muted); margin-bottom: 1rem; }
    .faq-section { background: var(--card-bg); padding: 2rem; border-radius: 1rem; }
    .faq-item { margin-bottom: 1.5rem; }
    .faq-item h4 { color: var(--primary); margin-bottom: 0.5rem; }
    .faq-item p { color: var(--text-muted); }
    .backlinks { text-align: center; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
    .backlinks a { color: var(--primary); text-decoration: none; }
    .backlinks a:hover { text-decoration: underline; }
    .affiliate-sidebar {
      position: fixed;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      background: var(--card-bg);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
      max-width: 200px;
    }
    .affiliate-sidebar a { display: block; padding: 0.5rem; color: var(--text); text-decoration: none; font-size: 0.9rem; }
    .affiliate-sidebar a:hover { color: var(--primary); }
    @media (max-width: 768px) {
      .hero h1 { font-size: 1.75rem; }
      .products-grid { grid-template-columns: 1fr; }
      .affiliate-sidebar { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <h1>${page.title}</h1>
      <p>${page.description}</p>
    </header>

    <section class="content-section">
      <h2>Overview</h2>
      <p>${page.content.intro}</p>
    </section>

    <section class="products-grid">
      ${productCards}
    </section>

    <section class="content-section">
      <h2>Buying Guide</h2>
      <p>${page.content.buyingGuide}</p>
    </section>

    <section class="content-section faq-section">
      <h2>Frequently Asked Questions</h2>
      ${faqItems}
    </section>

    <section class="content-section">
      <h2>Conclusion</h2>
      <p>${page.content.conclusion}</p>
    </section>

    <footer class="backlinks">
      <p>Related Articles: ${backlinksHTML}</p>
    </footer>
  </div>

  <aside class="affiliate-sidebar">
    <strong>Quick Links</strong>
    ${page.affiliateLinks.filter(l => l.placement === 'sidebar').map(l => `
      <a href="${l.url}" target="_blank" rel="noopener sponsored">${l.name}</a>
    `).join('')}
  </aside>

  <script>
    // Track clicks
    document.querySelectorAll('a[rel*="sponsored"]').forEach(link => {
      link.addEventListener('click', () => {
        fetch('/api/trpc/tracking.trackClick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: link.href, source: 'product-page' })
        });
      });
    });
  </script>
</body>
</html>
  `.trim();
}

/**
 * Publish a product page to the MoneyMachine blog
 */
export async function publishProductPage(
  page: ProductPage,
  userId: number
): Promise<{ success: boolean; url?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };

  try {
    // Generate unique slug
    const uniqueSlug = `${page.slug}-${Date.now().toString(36)}`;
    
    // Create article from product page
    const result = await db.insert(articles).values({
      userId,
      title: page.title,
      slug: uniqueSlug,
      content: generateProductPageHTML(page),
      excerpt: page.description,
      status: 'published',
      metaTitle: page.seoMeta.title.substring(0, 70),
      metaDescription: page.seoMeta.description.substring(0, 160),
      keywords: page.seoMeta.keywords,
      seoScore: 85, // Product pages are well-optimized
      publishedAt: new Date(),
    });

    const articleId = Number(result[0].insertId);
    const url = `${ENV.appUrl}/blog/${uniqueSlug}`;

    return { success: true, url };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Generate and publish product pages for multiple articles
 */
export async function batchGenerateProductPages(
  articleIds: number[],
  userId: number
): Promise<{ generated: number; published: number; errors: string[] }> {
  const results = { generated: 0, published: 0, errors: [] as string[] };

  for (const articleId of articleIds) {
    try {
      const page = await generateProductPage(articleId, userId);
      if (page) {
        results.generated++;
        
        const publishResult = await publishProductPage(page, userId);
        if (publishResult.success) {
          results.published++;
        } else {
          results.errors.push(`Failed to publish page for article ${articleId}: ${publishResult.error}`);
        }
      } else {
        results.errors.push(`Failed to generate page for article ${articleId}`);
      }
    } catch (error) {
      results.errors.push(`Error processing article ${articleId}: ${String(error)}`);
    }
  }

  return results;
}
