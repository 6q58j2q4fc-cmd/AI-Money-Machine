import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Loader2, ArrowLeft, Calendar, Eye, MousePointer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PublicArticle() {
  const { slug } = useParams<{ slug: string }>();
  
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
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
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
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
          className="prose prose-lg dark:prose-invert max-w-none"
          onClick={handleLinkClick}
        >
          <Streamdown>{article.content || ""}</Streamdown>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between">
            <Link href="/blog">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                More Articles
              </Button>
            </Link>
            <Button onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share This Article
            </Button>
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
