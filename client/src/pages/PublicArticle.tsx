import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Loader2, ArrowLeft, Calendar, Eye, MousePointer, Share2, Twitter, Facebook, Linkedin, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl py-4 flex items-center justify-between">
          <Link href="/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Articles
            </Button>
          </Link>
          
          {/* Share Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
      </header>

      {/* Article Content */}
      <article className="container max-w-4xl py-12">
        {/* Meta */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
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
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {article.title}
          </h1>
          
          {article.excerpt && (
            <p className="text-xl text-muted-foreground leading-relaxed">
              {article.excerpt}
            </p>
          )}

          {article.keywords && (article.keywords as string[]).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {(article.keywords as string[]).map((keyword, i) => (
                <Badge key={i} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div 
          className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:text-foreground/80"
          onClick={handleLinkClick}
        >
          <Streamdown>{article.content || ""}</Streamdown>
        </div>

        {/* Affiliate Links Section */}
        {(article as any).affiliateLinks && ((article as any).affiliateLinks as any[]).length > 0 && (
          <div className="mt-12 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span> Recommended Products
            </h3>
            <div className="grid gap-4">
              {((article as any).affiliateLinks as any[]).map((linkData: any, i: number) => (
                <a
                  key={i}
                  href={linkData.link?.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background transition-colors group"
                  onClick={() => trackClickMutation.mutate({ articleId: article.id, linkId: linkData.affiliateLinkId })}
                >
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">{linkData.link?.name || linkData.anchorText}</p>
                    <p className="text-sm text-muted-foreground">{linkData.link?.category}</p>
                  </div>
                  <Button size="sm" className="btn-glow">
                    Check Price →
                  </Button>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social Share Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="text-center mb-6">
            <p className="text-lg font-medium mb-4">Found this helpful? Share it!</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open(shareLinks.twitter, '_blank')}
                className="hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
              >
                <Twitter className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open(shareLinks.facebook, '_blank')}
                className="hover:bg-[#4267B2]/10 hover:text-[#4267B2] hover:border-[#4267B2]"
              >
                <Facebook className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open(shareLinks.linkedin, '_blank')}
                className="hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]"
              >
                <Linkedin className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href="/blog">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                More Articles
              </Button>
            </Link>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container max-w-4xl text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MoneyMachine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
