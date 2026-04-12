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
import { ExitIntentPopup, ScrollAffiliateCTA, ContentUpgradeBox, DealCountdown } from "@/components/LeadCapture";
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

// Category color themes - clean white/amber theme matching Benjamin Franklin blog
const categoryThemes: Record<string, { gradient: string; accent: string; badge: string; headerBg: string }> = {
  // Technology & Software
  technology: { gradient: "from-blue-50 to-white", accent: "text-blue-600", badge: "bg-blue-100 text-blue-700", headerBg: "bg-blue-600" },
  cybersecurity: { gradient: "from-slate-50 to-white", accent: "text-slate-600", badge: "bg-slate-100 text-slate-700", headerBg: "bg-slate-700" },
  vpn: { gradient: "from-teal-50 to-white", accent: "text-teal-600", badge: "bg-teal-100 text-teal-700", headerBg: "bg-teal-600" },
  ai: { gradient: "from-violet-50 to-white", accent: "text-violet-600", badge: "bg-violet-100 text-violet-700", headerBg: "bg-violet-600" },
  gadgets: { gradient: "from-sky-50 to-white", accent: "text-sky-600", badge: "bg-sky-100 text-sky-700", headerBg: "bg-sky-600" },
  
  // Finance & Business
  investing: { gradient: "from-emerald-50 to-white", accent: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", headerBg: "bg-emerald-600" },
  crypto: { gradient: "from-orange-50 to-white", accent: "text-orange-600", badge: "bg-orange-100 text-orange-700", headerBg: "bg-orange-600" },
  banking: { gradient: "from-blue-50 to-white", accent: "text-blue-600", badge: "bg-blue-100 text-blue-700", headerBg: "bg-blue-700" },
  tax: { gradient: "from-lime-50 to-white", accent: "text-lime-700", badge: "bg-lime-100 text-lime-700", headerBg: "bg-lime-600" },
  business: { gradient: "from-gray-50 to-white", accent: "text-gray-600", badge: "bg-gray-100 text-gray-700", headerBg: "bg-gray-700" },
  
  // Health & Wellness
  wellness: { gradient: "from-teal-50 to-white", accent: "text-teal-600", badge: "bg-teal-100 text-teal-700", headerBg: "bg-teal-600" },
  fitness: { gradient: "from-orange-50 to-white", accent: "text-orange-600", badge: "bg-orange-100 text-orange-700", headerBg: "bg-orange-500" },
  medical: { gradient: "from-red-50 to-white", accent: "text-red-600", badge: "bg-red-100 text-red-700", headerBg: "bg-red-600" },
  nutrition: { gradient: "from-green-50 to-white", accent: "text-green-600", badge: "bg-green-100 text-green-700", headerBg: "bg-green-600" },
  
  // Home & Lifestyle
  home: { gradient: "from-amber-50 to-white", accent: "text-amber-600", badge: "bg-amber-100 text-amber-700", headerBg: "bg-amber-600" },
  "smart home": { gradient: "from-cyan-50 to-white", accent: "text-cyan-600", badge: "bg-cyan-100 text-cyan-700", headerBg: "bg-cyan-600" },
  security: { gradient: "from-slate-50 to-white", accent: "text-slate-600", badge: "bg-slate-100 text-slate-700", headerBg: "bg-slate-600" },
  furniture: { gradient: "from-stone-50 to-white", accent: "text-stone-600", badge: "bg-stone-100 text-stone-700", headerBg: "bg-stone-600" },
  
  // Education & Career
  learning: { gradient: "from-blue-50 to-white", accent: "text-blue-600", badge: "bg-blue-100 text-blue-700", headerBg: "bg-blue-600" },
  career: { gradient: "from-indigo-50 to-white", accent: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700", headerBg: "bg-indigo-600" },
  productivity: { gradient: "from-purple-50 to-white", accent: "text-purple-600", badge: "bg-purple-100 text-purple-700", headerBg: "bg-purple-600" },
  
  // Travel & Adventure
  travel: { gradient: "from-sky-50 to-white", accent: "text-sky-600", badge: "bg-sky-100 text-sky-700", headerBg: "bg-sky-600" },
  adventure: { gradient: "from-emerald-50 to-white", accent: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", headerBg: "bg-emerald-600" },
  outdoor: { gradient: "from-green-50 to-white", accent: "text-green-600", badge: "bg-green-100 text-green-700", headerBg: "bg-green-600" },
  vacation: { gradient: "from-cyan-50 to-white", accent: "text-cyan-600", badge: "bg-cyan-100 text-cyan-700", headerBg: "bg-cyan-600" },
  
  // Food & Shopping
  shopping: { gradient: "from-pink-50 to-white", accent: "text-pink-600", badge: "bg-pink-100 text-pink-700", headerBg: "bg-pink-600" },
  software: { gradient: "from-purple-50 to-white", accent: "text-purple-600", badge: "bg-purple-100 text-purple-700", headerBg: "bg-purple-600" },
  finance: { gradient: "from-green-50 to-white", accent: "text-green-600", badge: "bg-green-100 text-green-700", headerBg: "bg-green-700" },
  health: { gradient: "from-rose-50 to-white", accent: "text-rose-600", badge: "bg-rose-100 text-rose-700", headerBg: "bg-rose-600" },
  lifestyle: { gradient: "from-pink-50 to-white", accent: "text-pink-600", badge: "bg-pink-100 text-pink-700", headerBg: "bg-pink-600" },
  education: { gradient: "from-amber-50 to-white", accent: "text-amber-600", badge: "bg-amber-100 text-amber-700", headerBg: "bg-amber-600" },
  entertainment: { gradient: "from-indigo-50 to-white", accent: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700", headerBg: "bg-indigo-600" },
  food: { gradient: "from-orange-50 to-white", accent: "text-orange-600", badge: "bg-orange-100 text-orange-700", headerBg: "bg-orange-500" },
  default: { gradient: "from-amber-50 to-white", accent: "text-amber-600", badge: "bg-amber-100 text-amber-700", headerBg: "bg-amber-600" },
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

  // Detect category from article title/keywords for better relevance
  const articleCategory = useMemo(() => {
    const titleAndKeywords = [
      article?.title || '',
      ...(article?.keywords as string[] || [])
    ].join(' ').toLowerCase();
    
    // Health/Medical keywords
    if (/blood pressure|medical alert|heart|diabetes|senior|health|wellness|fitness|nutrition|supplement|vitamin|doctor|hospital|medicine|gps tracking|fall detection/.test(titleAndKeywords)) return 'health';
    // Finance keywords
    if (/tax|invest|credit|bank|loan|mortgage|budget|finance|money|saving|401k|ira|stock|crypto|insurance/.test(titleAndKeywords)) return 'finance';
    // Technology keywords
    if (/vpn|software|app|tech|computer|phone|laptop|gadget|security|antivirus|password|cloud|ai|robot/.test(titleAndKeywords)) return 'technology';
    // Travel keywords
    if (/travel|hotel|flight|vacation|trip|tour|booking|airbnb|cruise|destination/.test(titleAndKeywords)) return 'travel';
    // Education keywords
    if (/learn|course|education|school|college|degree|skill|training|language|certification/.test(titleAndKeywords)) return 'education';
    // Home keywords
    if (/home|house|furniture|decor|kitchen|garden|security camera|doorbell|smart home|cleaning/.test(titleAndKeywords)) return 'home';
    // Food keywords
    if (/food|meal|recipe|cook|diet|nutrition|grocery|restaurant|delivery/.test(titleAndKeywords)) return 'food';
    // Shopping keywords
    if (/shop|buy|deal|discount|coupon|sale|product|review|best|top/.test(titleAndKeywords)) return 'shopping';
    // Fall back to first affiliate link category or default
    return displayLinks?.[0]?.link?.category?.toLowerCase() || 'default';
  }, [article?.title, article?.keywords, displayLinks]);
  
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
      {/* Lead Capture Components */}
      <ExitIntentPopup 
        articleTitle={article.title}
        category={articleCategory}
        affiliateLinks={affiliateLinks}
      />
      <ScrollAffiliateCTA 
        affiliateLinks={affiliateLinks}
        category={articleCategory}
      />

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
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        {/* Colored top bar */}
        <div className={`h-1 w-full ${theme.headerBg}`} />
        <div className="container max-w-6xl py-3 flex items-center justify-between">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
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
                <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
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
      <div className={`relative bg-gradient-to-b ${theme.gradient} pb-12 border-b border-gray-100`}>
        <div className="container max-w-6xl pt-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Article Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm text-gray-500">
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
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
                {article.title}
              </h1>
              
              {article.excerpt && (
                <p className="text-xl text-gray-600 leading-relaxed">
                  {article.excerpt
                    .replace(/( - Top Picks & Reviews)+/g, '')
                    .replace(/Top Picks & Reviews/g, '')
                    .trim()}
                </p>
              )}

              {article.keywords && (article.keywords as string[]).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(article.keywords as string[]).slice(0, 5).map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="bg-white border border-gray-200 text-gray-600">
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
      <article className="bg-white">
      <div className="container max-w-6xl py-12">
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
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-blockquote:border-amber-400 prose-blockquote:text-gray-600 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 article-content"
              onClick={handleLinkClick}
              dangerouslySetInnerHTML={{ __html: parsedContent }}
            ></div>

            {/* In-Article Ad Placement */}
            <div className="my-8">
              <AdPlaceholder type="in-article" className="mx-auto" />
            </div>

            {/* Content Upgrade Box - Lead Capture */}
            <ContentUpgradeBox 
              articleTitle={article.title}
              category={articleCategory}
              affiliateLinks={affiliateLinks}
            />

            {/* Deal Countdown Timer */}
            {affiliateLinks.length > 0 && affiliateLinks[0]?.link?.url && (
              <DealCountdown
                linkName={affiliateLinks[0].link?.name || 'Top Recommended Product'}
                linkUrl={affiliateLinks[0].link?.url}
                onLinkClick={() => handleAffiliateClick(affiliateLinks[0].affiliateLinkId)}
              />
            )}

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
      </div>
      </article>

      {/* Professional Footer with Branding */}
      <footer className={`border-t border-gray-200 bg-white py-12`}>
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-xl font-bold text-amber-600">Benjamin Franklin's</p>
                  <p className="text-sm text-gray-500">Top New Brands & Recommendations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/blog">
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  More Articles
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
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
