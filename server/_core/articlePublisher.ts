import { ENV } from "./env";

/**
 * Article Publisher Service
 * Handles publishing articles to external platforms with proper SEO and tracking
 */

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
  platformId?: string;
  platform: string;
}

interface ArticleData {
  id: number;
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  keywords?: string[];
  coverImage?: string;
}

// Generate SEO-friendly canonical URL
export function generateCanonicalUrl(slug: string, baseUrl?: string): string {
  const base = baseUrl || ENV.appUrl || 'https://moneymachine.app';
  return `${base}/article/${slug}`;
}

// Generate Open Graph meta tags
export function generateOpenGraphTags(article: ArticleData, canonicalUrl: string): Record<string, string> {
  return {
    'og:title': article.metaTitle || article.title,
    'og:description': article.metaDescription || article.excerpt || '',
    'og:url': canonicalUrl,
    'og:type': 'article',
    'og:image': article.coverImage || '',
    'twitter:card': 'summary_large_image',
    'twitter:title': article.metaTitle || article.title,
    'twitter:description': article.metaDescription || article.excerpt || '',
  };
}

// Generate JSON-LD structured data for SEO
export function generateStructuredData(article: ArticleData, canonicalUrl: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title,
    'description': article.metaDescription || article.excerpt,
    'url': canonicalUrl,
    'image': article.coverImage,
    'keywords': article.keywords?.join(', ') || article.focusKeyword,
    'datePublished': new Date().toISOString(),
    'author': {
      '@type': 'Organization',
      'name': 'MoneyMachine'
    }
  };
}

// Add tracking parameters to affiliate links
export function addTrackingToAffiliateLinks(content: string, articleId: number, source: string): string {
  // Add UTM parameters to affiliate links for tracking
  const affiliateLinkRegex = /(https?:\/\/(?:www\.)?(?:anrdoezrs\.net|jdoqocy\.com|tkqlhce\.com|dpbolvw\.net|kqzyfj\.com)\/click-\d+-\d+)/g;
  
  return content.replace(affiliateLinkRegex, (match) => {
    const separator = match.includes('?') ? '&' : '?';
    return `${match}${separator}utm_source=${source}&utm_medium=article&utm_campaign=article_${articleId}`;
  });
}

// Publish to Reddit (free, no API key needed for link posts)
export async function publishToReddit(article: ArticleData, subreddit: string = 'technology'): Promise<PublishResult> {
  // Reddit requires OAuth for posting, but we can generate a share link
  const canonicalUrl = generateCanonicalUrl(article.slug);
  const shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(canonicalUrl)}&title=${encodeURIComponent(article.title)}`;
  
  return {
    success: true,
    url: shareUrl,
    platform: 'reddit',
    platformId: 'share_link'
  };
}

// Publish to Twitter/X (generate share link)
export async function publishToTwitter(article: ArticleData): Promise<PublishResult> {
  const canonicalUrl = generateCanonicalUrl(article.slug);
  const text = `${article.title}\n\n${article.excerpt?.substring(0, 200) || ''}\n\nRead more:`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(canonicalUrl)}`;
  
  return {
    success: true,
    url: shareUrl,
    platform: 'twitter',
    platformId: 'share_link'
  };
}

// Publish to Facebook (generate share link)
export async function publishToFacebook(article: ArticleData): Promise<PublishResult> {
  const canonicalUrl = generateCanonicalUrl(article.slug);
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`;
  
  return {
    success: true,
    url: shareUrl,
    platform: 'facebook',
    platformId: 'share_link'
  };
}

// Publish to LinkedIn (generate share link)
export async function publishToLinkedInShare(article: ArticleData): Promise<PublishResult> {
  const canonicalUrl = generateCanonicalUrl(article.slug);
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`;
  
  return {
    success: true,
    url: shareUrl,
    platform: 'linkedin',
    platformId: 'share_link'
  };
}

// Publish to Pinterest (generate pin link)
export async function publishToPinterest(article: ArticleData): Promise<PublishResult> {
  const canonicalUrl = generateCanonicalUrl(article.slug);
  const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(canonicalUrl)}&description=${encodeURIComponent(article.title)}`;
  
  return {
    success: true,
    url: shareUrl,
    platform: 'pinterest',
    platformId: 'share_link'
  };
}

// Publish to Hacker News (generate submit link)
export async function publishToHackerNews(article: ArticleData): Promise<PublishResult> {
  const canonicalUrl = generateCanonicalUrl(article.slug);
  const shareUrl = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(canonicalUrl)}&t=${encodeURIComponent(article.title)}`;
  
  return {
    success: true,
    url: shareUrl,
    platform: 'hackernews',
    platformId: 'share_link'
  };
}

// Generate RSS feed entry for article
export function generateRSSEntry(article: ArticleData): string {
  const canonicalUrl = generateCanonicalUrl(article.slug);
  return `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${canonicalUrl}</link>
      <description><![CDATA[${article.excerpt || article.metaDescription || ''}]]></description>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <guid isPermaLink="true">${canonicalUrl}</guid>
    </item>
  `.trim();
}

// Batch publish to all free platforms
export async function publishToAllFreePlatforms(article: ArticleData): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  
  // Social media share links (always work)
  results.push(await publishToReddit(article));
  results.push(await publishToTwitter(article));
  results.push(await publishToFacebook(article));
  results.push(await publishToLinkedInShare(article));
  results.push(await publishToPinterest(article));
  results.push(await publishToHackerNews(article));
  
  return results;
}

// Track affiliate link click
export interface ClickTrackingData {
  articleId: number;
  affiliateLinkId: number;
  source: string;
  userAgent?: string;
  ipHash?: string;
  referrer?: string;
  timestamp: Date;
}

// Generate click tracking URL
export function generateClickTrackingUrl(
  affiliateUrl: string, 
  articleId: number, 
  linkId: number,
  baseUrl?: string
): string {
  const base = baseUrl || ENV.appUrl || 'https://moneymachine.app';
  const trackingId = Buffer.from(`${articleId}:${linkId}:${Date.now()}`).toString('base64url');
  return `${base}/api/track/${trackingId}?dest=${encodeURIComponent(affiliateUrl)}`;
}

// Parse tracking ID from click
export function parseTrackingId(trackingId: string): { articleId: number; linkId: number; timestamp: number } | null {
  try {
    const decoded = Buffer.from(trackingId, 'base64url').toString();
    const [articleId, linkId, timestamp] = decoded.split(':').map(Number);
    return { articleId, linkId, timestamp };
  } catch {
    return null;
  }
}
