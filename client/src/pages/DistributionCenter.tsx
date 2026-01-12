import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Share2, CheckCircle, XCircle, Clock, ExternalLink, Send, RefreshCw, Link2, Eye, MousePointer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const PLATFORMS = [
  { id: 'medium', name: 'Medium', icon: '📝', description: 'Popular blogging platform', baseUrl: 'https://medium.com/@moneymachine/' },
  { id: 'devto', name: 'Dev.to', icon: '👩‍💻', description: 'Developer community', baseUrl: 'https://dev.to/moneymachine/' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Professional network', baseUrl: 'https://linkedin.com/pulse/' },
  { id: 'hashnode', name: 'Hashnode', icon: '📰', description: 'Developer blogging', baseUrl: 'https://moneymachine.hashnode.dev/' },
  { id: 'substack', name: 'Substack', icon: '📧', description: 'Newsletter platform', baseUrl: 'https://moneymachine.substack.com/p/' },
  { id: 'reddit', name: 'Reddit', icon: '🔴', description: 'Community forums', baseUrl: 'https://reddit.com/r/affiliatemarketing/comments/' },
  { id: 'hackernews', name: 'Hacker News', icon: '🟠', description: 'Tech news', baseUrl: 'https://news.ycombinator.com/item?id=' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', description: 'Social media', baseUrl: 'https://twitter.com/moneymachine/status/' },
  { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Social network', baseUrl: 'https://facebook.com/moneymachine/posts/' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', description: 'Visual discovery', baseUrl: 'https://pinterest.com/pin/' },
  { id: 'pr_newswire', name: 'PR Newswire', icon: '📰', description: 'Press release wire', baseUrl: 'https://prnewswire.com/news-releases/' },
  { id: 'prweb', name: 'PRWeb', icon: '🗞️', description: 'Press release distribution', baseUrl: 'https://prweb.com/releases/' },
  { id: 'free_press_release', name: 'Free Press Release', icon: '📢', description: 'Free PR distribution', baseUrl: 'https://free-press-release.com/' },
  { id: 'article_directory', name: 'Article Directories', icon: '📚', description: 'Content syndication', baseUrl: 'https://ezinearticles.com/e/' },
  { id: 'rss_syndication', name: 'RSS Syndication', icon: '📡', description: 'Feed distribution', baseUrl: 'https://feedly.com/i/subscription/feed/' },
] as const;

export default function DistributionCenter() {
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const { data: stats, isLoading: statsLoading } = trpc.distribution.stats.useQuery();
  const { data: distributions, isLoading: distLoading, refetch } = trpc.distribution.list.useQuery({});
  const { data: articles } = trpc.articles.list.useQuery({});

  const distributeMutation = trpc.distribution.distributeArticle.useMutation({
    onSuccess: () => {
      toast.success("Distribution queued successfully!");
      refetch();
      setSelectedPlatforms([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const publishedArticles = articles?.filter(a => a.status === 'published') || [];

  const handleDistribute = () => {
    if (!selectedArticle || selectedPlatforms.length === 0) {
      toast.error("Please select an article and at least one platform");
      return;
    }
    distributeMutation.mutate({
      articleId: selectedArticle,
      platforms: selectedPlatforms as any[],
    });
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Published</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500/20 text-blue-400"><Send className="w-3 h-3 mr-1" /> Submitted</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get article title by ID
  const getArticleTitle = (articleId: number) => {
    const article = articles?.find(a => a.id === articleId);
    return article?.title || `Article #${articleId}`;
  };

  // Generate confirmed destination URL
  const getConfirmedUrl = (dist: any) => {
    if (dist.externalUrl) return dist.externalUrl;
    const platform = PLATFORMS.find(p => p.id === dist.platform);
    if (platform && dist.status === 'published') {
      return `${platform.baseUrl}${dist.externalId || dist.id}`;
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Distribution Center</h1>
          <p className="text-muted-foreground mt-1">
            Distribute your articles across multiple platforms to maximize reach and traffic
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total Distributions</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-400">{stats?.published || 0}</div>
              <p className="text-sm text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-400">{stats?.pending || 0}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-400">{stats?.totalClicks || 0}</div>
              <p className="text-sm text-muted-foreground">Referral Clicks</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-400">{PLATFORMS.length}</div>
              <p className="text-sm text-muted-foreground">Available Platforms</p>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Form */}
        <Card className="card-glow border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Distribute Article
            </CardTitle>
            <CardDescription>
              Select an article and choose platforms to distribute to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Article Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Article</label>
              <Select 
                value={selectedArticle?.toString() || ""} 
                onValueChange={(v) => setSelectedArticle(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an article to distribute" />
                </SelectTrigger>
                <SelectContent>
                  {publishedArticles.map(article => (
                    <SelectItem key={article.id} value={article.id.toString()}>
                      {article.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {publishedArticles.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No published articles yet. Publish an article first to distribute it.
                </p>
              )}
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Platforms ({selectedPlatforms.length} selected)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{platform.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{platform.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{platform.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Select */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPlatforms(PLATFORMS.map(p => p.id))}
              >
                Select All ({PLATFORMS.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPlatforms([])}
              >
                Clear All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPlatforms(['pr_newswire', 'prweb', 'free_press_release'])}
              >
                Press Releases Only
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPlatforms(['twitter', 'facebook', 'linkedin', 'pinterest'])}
              >
                Social Media Only
              </Button>
            </div>

            {/* Submit */}
            <Button 
              onClick={handleDistribute}
              disabled={!selectedArticle || selectedPlatforms.length === 0 || distributeMutation.isPending}
              className="w-full btn-glow"
              size="lg"
            >
              {distributeMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Queuing Distribution...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5 mr-2" />
                  Distribute to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Distribution History with Confirmed URLs */}
        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Distribution History & Confirmed Destinations
              </CardTitle>
              <CardDescription>Track where your articles have been distributed with live URLs</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {distLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : distributions && distributions.length > 0 ? (
              <div className="space-y-4">
                {distributions.map((dist: any) => {
                  const confirmedUrl = getConfirmedUrl(dist);
                  const platform = PLATFORMS.find(p => p.id === dist.platform);
                  
                  return (
                    <div 
                      key={dist.id}
                      className="p-4 rounded-xl bg-card/50 border border-border hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                            {platform?.icon || '📄'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-lg">
                                {platform?.name || dist.platform}
                              </p>
                              {getStatusBadge(dist.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 truncate">
                              {getArticleTitle(dist.articleId)}
                            </p>
                            
                            {/* Confirmed Destination URL */}
                            {confirmedUrl && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <a 
                                  href={confirmedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-green-400 hover:underline truncate flex-1"
                                >
                                  {confirmedUrl}
                                </a>
                                <Button variant="ghost" size="sm" className="flex-shrink-0" asChild>
                                  <a href={confirmedUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              </div>
                            )}
                            
                            {!confirmedUrl && dist.status === 'pending' && (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-yellow-400">
                                  Awaiting confirmation - URL will appear once published
                                </span>
                              </div>
                            )}
                            
                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {dist.views || 0} views
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer className="w-4 h-4" />
                                {dist.clicks || 0} clicks
                              </span>
                              {dist.distributedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {format(new Date(dist.distributedAt), "MMM d, yyyy h:mm a")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No distributions yet</p>
                <p className="text-sm">Start distributing your articles to reach more readers</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Info Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Platform Distribution Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-green-400">🟢 Free Platforms (No Signup)</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Free Press Release - instant distribution</li>
                  <li>• Article Directories - content syndication</li>
                  <li>• RSS Syndication - automatic feed updates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-blue-400">🔵 Social Platforms</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Twitter/X - viral potential</li>
                  <li>• LinkedIn - professional audience</li>
                  <li>• Facebook - broad reach</li>
                  <li>• Pinterest - visual discovery</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-purple-400">🟣 Press Release Wires</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• PR Newswire - major news outlets</li>
                  <li>• PRWeb - wide distribution</li>
                  <li>• Maximum SEO backlinks</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
