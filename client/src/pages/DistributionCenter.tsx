import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Share2, CheckCircle, XCircle, Clock, ExternalLink, Send, RefreshCw, Link2, Eye, MousePointer, TrendingUp, Bug, Zap, Bot, AlertTriangle, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [selectedArticle, setSelectedArticle] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(PLATFORMS.map(p => p.id)); // Auto-select all platforms by default
  const [autoSelectAll, setAutoSelectAll] = useState(true); // Enable auto-select all by default

  const { data: stats, isLoading: statsLoading } = trpc.distribution.stats.useQuery();
  const { data: distributions, isLoading: distLoading, refetch } = trpc.distribution.list.useQuery({});
  const { data: articles, isLoading: articlesLoading } = trpc.articles.list.useQuery({});
  const { data: realUrls, isLoading: realUrlsLoading, refetch: refetchRealUrls } = trpc.hiveMind.getRealDistributionUrls.useQuery({ limit: 100 });
  const { data: debugState, refetch: refetchDebugState } = trpc.hiveMind.getDebugBotState.useQuery();
  
  const autoFixUrlsMutation = trpc.hiveMind.autoFixDistributionUrls.useMutation({
    onSuccess: (result) => {
      toast.success(`Fixed ${result.fixed} distribution URLs`);
      refetch();
      refetchRealUrls();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const runDebugScanMutation = trpc.hiveMind.runDebugScan.useMutation({
    onSuccess: (result) => {
      toast.success(`Scan complete: ${result.issuesFound} issues found, ${result.issuesFixed} fixed`);
      refetchDebugState();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const startMonitoringMutation = trpc.hiveMind.startDebugMonitoring.useMutation({
    onSuccess: () => {
      toast.success('Debug bot monitoring started');
      refetchDebugState();
    },
  });
  
  const stopMonitoringMutation = trpc.hiveMind.stopDebugMonitoring.useMutation({
    onSuccess: () => {
      toast.success('Debug bot monitoring stopped');
      refetchDebugState();
    },
  });

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
      articleId: parseInt(selectedArticle),
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

  const selectAllPlatforms = () => {
    setSelectedPlatforms(PLATFORMS.map(p => p.id));
  };

  const clearAllPlatforms = () => {
    setSelectedPlatforms([]);
  };

  const selectPressReleasesOnly = () => {
    setSelectedPlatforms(['pr_newswire', 'prweb', 'free_press_release']);
  };

  const selectSocialMediaOnly = () => {
    setSelectedPlatforms(['twitter', 'facebook', 'linkedin', 'pinterest', 'reddit']);
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Distribution Center</h1>
            <p className="text-muted-foreground mt-1">
              Distribute your articles across multiple platforms to maximize reach and traffic
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoFixUrlsMutation.mutate()}
              disabled={autoFixUrlsMutation.isPending}
            >
              {autoFixUrlsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
              Auto-Fix URLs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runDebugScanMutation.mutate()}
              disabled={runDebugScanMutation.isPending}
            >
              {runDebugScanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bug className="w-4 h-4 mr-2" />}
              Debug Scan
            </Button>
          </div>
        </div>

        {/* Debug Bot Status */}
        {debugState && (
          <Card className="card-glow border-purple-500/30 bg-purple-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Bot className={`w-8 h-8 ${debugState.isActive ? 'text-green-400 animate-pulse' : 'text-muted-foreground'}`} />
                  <div>
                    <h3 className="font-semibold">Autonomous Debug Bot</h3>
                    <p className="text-sm text-muted-foreground">
                      {debugState.isActive ? 'Actively monitoring and fixing issues' : 'Monitoring paused'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">{debugState.issuesDetected}</div>
                    <div className="text-xs text-muted-foreground">Detected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">{debugState.issuesFixed}</div>
                    <div className="text-xs text-muted-foreground">Fixed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-400">{debugState.learnings}</div>
                    <div className="text-xs text-muted-foreground">Learnings</div>
                  </div>
                  {debugState.isActive ? (
                    <Button variant="outline" size="sm" onClick={() => stopMonitoringMutation.mutate()}>
                      Stop Monitoring
                    </Button>
                  ) : (
                    <Button variant="default" size="sm" onClick={() => startMonitoringMutation.mutate()}>
                      <Zap className="w-4 h-4 mr-2" />
                      Start Monitoring
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              {articlesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading articles...
                </div>
              ) : publishedArticles.length === 0 ? (
                <div className="text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                  No published articles available. Create and publish an article first.
                </div>
              ) : (
                <Select 
                  value={selectedArticle} 
                  onValueChange={setSelectedArticle}
                >
                  <SelectTrigger className="w-full">
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
              )}
            </div>

            {/* Platform Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Platforms ({selectedPlatforms.length} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PLATFORMS.map(platform => (
                  <Button
                    key={platform.id}
                    variant={selectedPlatforms.includes(platform.id) ? "default" : "outline"}
                    className={`h-auto py-3 flex flex-col items-center gap-1 ${
                      selectedPlatforms.includes(platform.id) 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "hover:bg-primary/10"
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    <span className="text-xl">{platform.icon}</span>
                    <span className="text-xs font-medium">{platform.name}</span>
                    <span className="text-[10px] text-muted-foreground">{platform.description}</span>
                  </Button>
                ))}
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={selectAllPlatforms}>
                  Select All ({PLATFORMS.length})
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllPlatforms}>
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={selectPressReleasesOnly}>
                  Press Releases Only
                </Button>
                <Button variant="outline" size="sm" onClick={selectSocialMediaOnly}>
                  Social Media Only
                </Button>
              </div>
            </div>

            {/* Distribute Button */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleDistribute}
              disabled={!selectedArticle || selectedPlatforms.length === 0 || distributeMutation.isPending}
            >
              {distributeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Distributing...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Distribute to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Distribution History */}
        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Distribution History & Confirmed Destinations
              </CardTitle>
              <CardDescription>
                Track where your articles have been distributed with live URLs
              </CardDescription>
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
            ) : !distributions || distributions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No distributions yet</p>
                <p className="text-sm">Start distributing your articles to reach more readers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {distributions.map((dist: any) => {
                  const platform = PLATFORMS.find(p => p.id === dist.platform);
                  const confirmedUrl = getConfirmedUrl(dist);
                  return (
                    <div key={dist.id} className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{platform?.icon || '🔗'}</span>
                            <span className="font-medium">{platform?.name || dist.platformName || dist.platform}</span>
                            {getStatusBadge(dist.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Article: <span className="text-foreground">{getArticleTitle(dist.articleId)}</span>
                          </p>
                          {confirmedUrl && (
                            <a 
                              href={confirmedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {confirmedUrl}
                            </a>
                          )}
                          {dist.submittedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Submitted: {format(new Date(dist.submittedAt), 'PPp')}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="w-3 h-3" />
                            {dist.views || 0} views
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MousePointer className="w-3 h-3" />
                            {dist.clicks || 0} clicks
                          </div>
                          {dist.referralTraffic > 0 && (
                            <div className="flex items-center gap-1 text-green-400">
                              <TrendingUp className="w-3 h-3" />
                              {dist.referralTraffic} referrals
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Guide */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Platform Distribution Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-green-400 mb-2">🟢 Free Platforms (No Signup)</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Free Press Release - instant distribution</li>
                  <li>• Article Directories - content syndication</li>
                  <li>• RSS Syndication - automatic feed updates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">🔵 Social Platforms</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Twitter/X - viral potential</li>
                  <li>• LinkedIn - professional audience</li>
                  <li>• Facebook - broad reach</li>
                  <li>• Pinterest - visual discovery</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">🟣 Press Release Wires</h4>
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
