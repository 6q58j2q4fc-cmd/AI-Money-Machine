import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useMemo } from "react";
import { Loader2, ArrowLeft, Calendar, Eye, MousePointer, Share2, Twitter, Facebook, Linkedin, Mail, Copy, Check, ExternalLink, ShoppingCart, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Product images by category
const categoryImages: Record<string, string> = {
  technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  software: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
  finance: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80",
  health: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  lifestyle: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  entertainment: "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&q=80",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  default: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
};

// Category color themes
const categoryThemes: Record<string, { gradient: string; accent: string; badge: string }> = {
  technology: { gradient: "from-blue-600/20 to-cyan-600/10", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
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

  // Use extracted links if affiliateLinks array is empty
  const displayLinks = (article as any)?.affiliateLinks?.length > 0 
    ? (article as any).affiliateLinks 
    : extractedLinks.map((link, i) => ({
        affiliateLinkId: i,
        link: { url: link.url, name: link.name, category: link.category }
      }));

  // Get category from first affiliate link or default
  const articleCategory = displayLinks?.[0]?.link?.category?.toLowerCase() || "default";
  const theme = categoryThemes[articleCategory] || categoryThemes.default;
  const heroImage = categoryImages[articleCategory] || categoryImages.default;

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
            <div 
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:text-foreground/80 article-content"
              onClick={handleLinkClick}
              dangerouslySetInnerHTML={{ __html: article.content || "" }}
            />

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
