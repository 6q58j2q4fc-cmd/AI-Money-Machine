import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useMemo, useEffect, useState as useStateReact } from "react";
import { marked } from "marked";
import { getAuthorForArticle, type Author } from "@shared/authors";
import { Loader2, ArrowLeft, Calendar, Eye, MousePointer, Share2, Twitter, Facebook, Linkedin, Mail, Copy, Check, ExternalLink, ShoppingCart, Star, TrendingUp, User, Clock, Award, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SocialProofSection, StarRating, TrustBadges } from "@/components/SocialProof";
import { AdPlaceholder } from "@/components/AdSense";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Product images by category - high-quality relevant images
const categoryImages: Record<string, string> = {
  // Technology & Software
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  software: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
  cybersecurity: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80",
  vpn: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
  gadgets: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
  
  // Finance & Business
  finance: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80",
  investing: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
  crypto: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80",
  banking: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
  tax: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
  business: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
  
  // Health & Wellness
  health: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  wellness: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
  fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
  medical: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
  nutrition: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
  
  // Home & Lifestyle
  home: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
  lifestyle: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80",
  "smart home": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  security: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80",
  furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
  
  // Education & Career
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  learning: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
  career: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80",
  productivity: "https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800&q=80",
  
  // Travel & Adventure
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  adventure: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=80",
  outdoor: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80",
  vacation: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  
  // Food & Shopping
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  shopping: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80",
  entertainment: "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&q=80",
  
  // Default
  default: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
};

// Category color themes - matching category images
const categoryThemes: Record<string, { gradient: string; accent: string; badge: string }> = {
  // Technology & Software
  technology: { gradient: "from-blue-600/20 to-cyan-600/10", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
  cybersecurity: { gradient: "from-slate-600/20 to-gray-600/10", accent: "text-slate-400", badge: "bg-slate-500/20 text-slate-300" },
  vpn: { gradient: "from-teal-600/20 to-cyan-600/10", accent: "text-teal-400", badge: "bg-teal-500/20 text-teal-300" },
  ai: { gradient: "from-violet-600/20 to-purple-600/10", accent: "text-violet-400", badge: "bg-violet-500/20 text-violet-300" },
  gadgets: { gradient: "from-sky-600/20 to-blue-600/10", accent: "text-sky-400", badge: "bg-sky-500/20 text-sky-300" },
  
  // Finance & Business
  investing: { gradient: "from-emerald-600/20 to-green-600/10", accent: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
  crypto: { gradient: "from-orange-600/20 to-amber-600/10", accent: "text-orange-400", badge: "bg-orange-500/20 text-orange-300" },
  banking: { gradient: "from-blue-600/20 to-indigo-600/10", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
  tax: { gradient: "from-lime-600/20 to-green-600/10", accent: "text-lime-400", badge: "bg-lime-500/20 text-lime-300" },
  business: { gradient: "from-gray-600/20 to-slate-600/10", accent: "text-gray-400", badge: "bg-gray-500/20 text-gray-300" },
  
  // Health & Wellness
  wellness: { gradient: "from-teal-600/20 to-emerald-600/10", accent: "text-teal-400", badge: "bg-teal-500/20 text-teal-300" },
  fitness: { gradient: "from-orange-600/20 to-red-600/10", accent: "text-orange-400", badge: "bg-orange-500/20 text-orange-300" },
  medical: { gradient: "from-red-600/20 to-rose-600/10", accent: "text-red-400", badge: "bg-red-500/20 text-red-300" },
  nutrition: { gradient: "from-green-600/20 to-lime-600/10", accent: "text-green-400", badge: "bg-green-500/20 text-green-300" },
  
  // Home & Lifestyle
  home: { gradient: "from-amber-600/20 to-yellow-600/10", accent: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  "smart home": { gradient: "from-cyan-600/20 to-blue-600/10", accent: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-300" },
  security: { gradient: "from-slate-600/20 to-zinc-600/10", accent: "text-slate-400", badge: "bg-slate-500/20 text-slate-300" },
  furniture: { gradient: "from-stone-600/20 to-neutral-600/10", accent: "text-stone-400", badge: "bg-stone-500/20 text-stone-300" },
  
  // Education & Career
  learning: { gradient: "from-blue-600/20 to-sky-600/10", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
  career: { gradient: "from-indigo-600/20 to-blue-600/10", accent: "text-indigo-400", badge: "bg-indigo-500/20 text-indigo-300" },
  productivity: { gradient: "from-purple-600/20 to-violet-600/10", accent: "text-purple-400", badge: "bg-purple-500/20 text-purple-300" },
  
  // Travel & Adventure
  travel: { gradient: "from-sky-600/20 to-blue-600/10", accent: "text-sky-400", badge: "bg-sky-500/20 text-sky-300" },
  adventure: { gradient: "from-emerald-600/20 to-teal-600/10", accent: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
  outdoor: { gradient: "from-green-600/20 to-emerald-600/10", accent: "text-green-400", badge: "bg-green-500/20 text-green-300" },
  vacation: { gradient: "from-cyan-600/20 to-sky-600/10", accent: "text-cyan-400", badge: "bg-cyan-500/20 text-cyan-300" },
  
  // Food & Shopping
  shopping: { gradient: "from-pink-600/20 to-rose-600/10", accent: "text-pink-400", badge: "bg-pink-500/20 text-pink-300" },
  software: { gradient: "from-purple-600/20 to-pink-600/10", accent: "text-purple-400", badge: "bg-purple-500/20 text-purple-300" },
  finance: { gradient: "from-green-600/20 to-emerald-600/10", accent: "text-green-400", badge: "bg-green-500/20 text-green-300" },
  health: { gradient: "from-red-600/20 to-orange-600/10", accent: "text-red-400", badge: "bg-red-500/20 text-red-300" },
  lifestyle: { gradient: "from-pink-600/20 to-rose-600/10", accent: "text-pink-400", badge: "bg-pink-500/20 text-pink-300" },
  education: { gradient: "from-yellow-600/20 to-amber-600/10", accent: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300" },
  entertainment: { gradient: "from-indigo-600/20 to-violet-600/10", accent: "text-indigo-400", badge: "bg-indigo-500/20 text-indigo-300" },
  default: { gradient: "from-primary/20 to-primary/5", accent: "text-primary", badge: "bg-primary/20 text-primary" },
};

export default function PublicArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  
  const { data: article, isLoading, error } = trpc.publicArticles.get.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const trackClickMutation = trpc.publicArticles.trackClick.useMutation();

  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' && article) {
      trackClickMutation.mutate({ articleId: article.id });
    }
  };

  const handleAffiliateClick = (linkId?: number) => {
    if (article) {
      trackClickMutation.mutate({ articleId: article.id, linkId });
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(article?.title || '');

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=Check out this article: ${encodedUrl}`,
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          url: currentUrl,
        });
      } catch {
        // User cancelled
      }
    }
  };

  // Helper function to add UTM parameters to affiliate links for tracking
  const addUtmParams = (url: string, linkName: string, position: number) => {
    try {
      const urlObj = new URL(url);
      // Add UTM parameters for analytics tracking
      urlObj.searchParams.set('utm_source', 'benjaminfranklins');
      urlObj.searchParams.set('utm_medium', 'affiliate');
      urlObj.searchParams.set('utm_campaign', article?.slug || 'article');
      urlObj.searchParams.set('utm_content', `pos${position}_${linkName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`);
      urlObj.searchParams.set('utm_term', article?.keywords?.slice(0, 3).join(',') || 'general');
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  // Extract affiliate links from article content HTML if affiliateLinks array is empty
  const extractedLinks = useMemo(() => {
    if (!article?.content) return [];
    const links: Array<{url: string; name: string; category: string}> = [];
    // Match CJ affiliate links from the HTML content
    const linkRegex = /<a[^>]*href="(https:\/\/www\.(jdoqocy|dpbolvw|anrdoezrs|kqzyfj|tkqlhce)\.(com|net)\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(article.content)) !== null && links.length < 10) {
      links.push({
        url: match[1],
        name: match[4].replace(/&gt;/g, '>').replace(/&lt;/g, '<').trim(),
        category: 'technology'
      });
    }
    return links;
  }, [article?.content]);

  // Use extracted links if affiliateLinks array is empty, and add UTM tracking
  const displayLinks = (article as any)?.affiliateLinks?.length > 0 
    ? (article as any).affiliateLinks.map((linkData: any, i: number) => ({
        ...linkData,
        link: {
          ...linkData.link,
          url: addUtmParams(linkData.link.url, linkData.link.name || 'product', i + 1)
        }
      }))
    : extractedLinks.map((link, i) => ({
        affiliateLinkId: i,
        link: { 
          url: addUtmParams(link.url, link.name, i + 1), 
          name: link.name, 
          category: link.category 
        }
      }));

  // Parse markdown content to HTML
  const parsedContent = useMemo(() => {
    if (!article?.content) return '';
    // Check if content is already HTML (has HTML tags)
    if (article.content.includes('<p>') || article.content.includes('<h1>') || article.content.includes('<div>')) {
      return article.content;
    }
    // Parse markdown to HTML
    try {
      return marked.parse(article.content, { async: false }) as string;
    } catch {
      return article.content;
    }
  }, [article?.content]);

  // Get category from first affiliate link or default
  const articleCategory = displayLinks?.[0]?.link?.category?.toLowerCase() || "default";
  const theme = categoryThemes[articleCategory] || categoryThemes.default;
  const heroImage = categoryImages[articleCategory] || categoryImages.default;

  // Get author based on article keywords
  const author = useMemo(() => {
    if (!article?.keywords) return getAuthorForArticle([]);
    return getAuthorForArticle(article.keywords as string[]);
  }, [article?.keywords]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!article?.content) return 5;
    const wordCount = article.content.split(/\s+/).length;
    return Math.max(3, Math.ceil(wordCount / 200));
  }, [article?.content]);

  // Generate Article JSON-LD structured data
  const articleJsonLd = useMemo(() => {
    if (!article) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.metaDescription || article.title,
      "image": heroImage,
      "author": {
        "@type": "Person",
        "name": author.name,
        "jobTitle": author.title,
        "description": author.bio,
        "url": typeof window !== 'undefined' ? `${window.location.origin}/about` : ''
      },
      "publisher": {
        "@type": "Organization",
        "name": "Benjamin Franklin's Recommendations",
        "logo": {
          "@type": "ImageObject",
          "url": typeof window !== 'undefined' ? `${window.location.origin}/benjamin-franklin-logo.png` : ''
        }
      },
      "datePublished": article.createdAt ? new Date(article.createdAt).toISOString() : new Date().toISOString(),
      "dateModified": article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": typeof window !== 'undefined' ? window.location.href : ''
      },
      "keywords": article.keywords?.join(', ') || '',
      "articleSection": articleCategory.charAt(0).toUpperCase() + articleCategory.slice(1)
    };
  }, [article, heroImage, articleCategory]);

  // Generate BreadcrumbList JSON-LD
  const breadcrumbJsonLd = useMemo(() => {
    if (!article) return null;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Blog",
          "item": `${baseUrl}/blog`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": article.title,
          "item": typeof window !== 'undefined' ? window.location.href : ''
        }
      ]
    };
  }, [article]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/blog">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Button>
        </Link>
      </div>
    );
  }

  const affiliateLinks = displayLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      
      {/* Professional Header with Category Theme */}
      <header className={`border-b border-border bg-gradient-to-r ${theme.gradient} backdrop-blur-sm sticky top-0 z-50`}>
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Articles
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Badge className={theme.badge}>
              {articleCategory.charAt(0).toUpperCase() + articleCategory.slice(1)}
            </Badge>
            
            {/* Share Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => window.open(shareLinks.twitter, '_blank')}>
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter / X
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(shareLinks.facebook, '_blank')}>
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(shareLinks.linkedin, '_blank')}>
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(shareLinks.email, '_blank')}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  {copied ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Copy Link
                </DropdownMenuItem>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <DropdownMenuItem onClick={handleNativeShare}>
                    <Share2 className="w-4 h-4 mr-2" />
                    More Options...
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Hero Section with Product Image */}
      <div className={`relative bg-gradient-to-b ${theme.gradient} pb-12`}>
        <div className="container max-w-6xl pt-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Article Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {article.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(article.publishedAt), "MMMM d, yyyy")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {article.views} views
                </span>
                <span className="flex items-center gap-1">
                  <MousePointer className="w-4 h-4" />
                  {article.clicks} clicks
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                {article.title}
              </h1>
              
              {article.excerpt && (
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {article.excerpt
                    .replace(/( - Top Picks & Reviews)+/g, '')
                    .replace(/Top Picks & Reviews/g, '')
                    .trim()}
                </p>
              )}

              {article.keywords && (article.keywords as string[]).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(article.keywords as string[]).slice(0, 5).map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="bg-white/10">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Featured Product CTA */}
              {displayLinks.length > 0 && (
                <a
                  href={displayLinks[0]?.link?.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleAffiliateClick(displayLinks[0]?.affiliateLinkId)}
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Get {displayLinks[0]?.link?.name || 'Featured Product'}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Hero Image with Clickable Affiliate Link */}
            <div className="relative">
              {displayLinks.length > 0 ? (
                <a
                  href={displayLinks[0]?.link?.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleAffiliateClick(displayLinks[0]?.affiliateLinkId)}
                  className="block relative group cursor-pointer"
                >
                  <img
                    src={heroImage}
                    alt={article.title}
                    className="w-full h-80 object-cover rounded-2xl shadow-2xl group-hover:scale-[1.02] transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="text-white">
                      <p className="text-sm opacity-80">Featured Product</p>
                      <p className="font-bold">{displayLinks[0]?.link?.name || 'Click to Learn More'}</p>
                    </div>
                    <Button size="sm" className="bg-white text-black hover:bg-white/90">
                      Shop Now <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </a>
              ) : (
                <img
                  src={heroImage}
                  alt={article.title}
                  className="w-full h-80 object-cover rounded-2xl shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="container max-w-6xl py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Author Byline */}
            <div className="author-byline">
              <img 
                src={author.avatar} 
                alt={author.name}
                className="author-avatar"
              />
              <div className="author-info">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="author-name">{author.name}</h4>
                  <span className="reading-time">
                    <Clock className="w-4 h-4" />
                    {readingTime} min read
                  </span>
                </div>
                <p className="author-title">{author.title}</p>
                <div className="author-credentials">
                  {author.credentials.slice(0, 2).map((credential, i) => (
                    <span key={i} className="credential-badge">
                      <Award className="w-3 h-3 inline mr-1" />
                      {credential}
                    </span>
                  ))}
                </div>
                <p className="author-bio">{author.bio}</p>
              </div>
            </div>

            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:text-foreground/80 article-content"
              onClick={handleLinkClick}
              dangerouslySetInnerHTML={{ __html: parsedContent }}
            />

            {/* In-Article Ad Placement */}
            <div className="my-8">
              <AdPlaceholder type="in-article" className="mx-auto" />
            </div>

            {/* Inline Product Cards */}
            {affiliateLinks.length > 0 && (
              <div className="mt-12 space-y-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className={`w-6 h-6 ${theme.accent}`} />
                  Products Mentioned in This Article
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {affiliateLinks.map((linkData: any, i: number) => (
                    <a
                      key={i}
                      href={linkData.link?.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleAffiliateClick(linkData.affiliateLinkId)}
                      className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${theme.gradient} p-6 hover:border-primary/50 transition-all hover:shadow-lg`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className={`w-8 h-8 ${theme.accent}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                            {linkData.link?.name || linkData.anchorText}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {linkData.link?.category || 'Product'}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            {[1,2,3,4,5].map((star) => (
                              <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">Top Rated</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-4 btn-glow">
                        Check Price <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Social Proof Section */}
            <div className="mt-12 pt-8 border-t border-border">
              <SocialProofSection 
                productName={affiliateLinks.length > 0 ? affiliateLinks[0]?.link?.name : article.title}
                category={articleCategory}
              />
            </div>
          </div>

          {/* Sidebar with Sticky Affiliate Links */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Featured Products Sidebar */}
              {affiliateLinks.length > 0 && (
                <div className={`rounded-xl border border-border bg-gradient-to-b ${theme.gradient} p-6`}>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Star className={`w-5 h-5 ${theme.accent}`} />
                    Top Picks
                  </h3>
                  <div className="space-y-4">
                    {affiliateLinks.slice(0, 5).map((linkData: any, i: number) => (
                      <a
                        key={i}
                        href={linkData.link?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleAffiliateClick(linkData.affiliateLinkId)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors group"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-lg font-bold ${theme.accent}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                            {linkData.link?.name || linkData.anchorText}
                          </p>
                          <p className="text-xs text-muted-foreground">Click to view →</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Capture Card */}
              <div className={`rounded-xl border border-border bg-gradient-to-b ${theme.gradient} p-6`}>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Mail className={`w-5 h-5 ${theme.accent}`} />
                  Get More Tips
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Subscribe to receive exclusive deals, product reviews, and money-saving tips.
                </p>
                <form 
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
                    if (email) {
                      toast.success("Thanks for subscribing! Check your inbox.");
                      form.reset();
                    }
                  }}
                >
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    className="bg-background/50"
                    required
                  />
                  <Button type="submit" className="w-full btn-glow">
                    <Mail className="w-4 h-4 mr-2" />
                    Subscribe Free
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  No spam. Unsubscribe anytime.
                </p>
              </div>

              {/* Share Card */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-bold mb-4">Share This Article</h3>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(shareLinks.twitter, '_blank')}
                    className="hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
                  >
                    <Twitter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(shareLinks.facebook, '_blank')}
                    className="hover:bg-[#4267B2]/10 hover:text-[#4267B2] hover:border-[#4267B2]"
                  >
                    <Facebook className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(shareLinks.linkedin, '_blank')}
                    className="hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]"
                  >
                    <Linkedin className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Sidebar Ad Placement */}
              <div className="mt-6">
                <AdPlaceholder type="sidebar" className="mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Professional Footer with Branding */}
      <footer className={`border-t border-border bg-gradient-to-r ${theme.gradient} py-12`}>
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-xl font-bold text-primary">Benjamin Franklin's</p>
                  <p className="text-sm text-muted-foreground">Top New Brands & Recommendations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/blog">
                <Button variant="outline" className="bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  More Articles
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Benjamin Franklin's Top New Brands & Recommendations. All rights reserved.</p>
            <p className="mt-2 text-xs">
              Disclosure: This article contains affiliate links. We may earn a commission if you make a purchase through these links, at no extra cost to you. Our editorial team independently reviews products to provide honest recommendations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
