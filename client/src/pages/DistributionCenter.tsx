import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Share2, CheckCircle, XCircle, Clock, ExternalLink, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLATFORMS = [
  { id: 'medium', name: 'Medium', icon: '📝', description: 'Popular blogging platform' },
  { id: 'devto', name: 'Dev.to', icon: '👩‍💻', description: 'Developer community' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Professional network' },
  { id: 'hashnode', name: 'Hashnode', icon: '📰', description: 'Developer blogging' },
  { id: 'substack', name: 'Substack', icon: '📧', description: 'Newsletter platform' },
  { id: 'reddit', name: 'Reddit', icon: '🔴', description: 'Community forums' },
  { id: 'hackernews', name: 'Hacker News', icon: '🟠', description: 'Tech news' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', description: 'Social media' },
  { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Social network' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', description: 'Visual discovery' },
  { id: 'press_release', name: 'Press Release', icon: '📰', description: 'PR distribution' },
  { id: 'article_directory', name: 'Article Directories', icon: '📚', description: 'Content syndication' },
  { id: 'rss_syndication', name: 'RSS Syndication', icon: '📡', description: 'Feed distribution' },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <label className="text-sm font-medium mb-2 block">Select Platforms</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                        <p className="text-xs text-muted-foreground">{platform.description}</p>
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
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedPlatforms([])}
              >
                Clear All
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

        {/* Distribution History */}
        <Card className="card-glow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Distribution History</CardTitle>
              <CardDescription>Track where your articles have been distributed</CardDescription>
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
              <div className="space-y-3">
                {distributions.map((dist: any) => (
                  <div 
                    key={dist.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {PLATFORMS.find(p => p.id === dist.platform)?.icon || '📄'}
                      </span>
                      <div>
                        <p className="font-medium">
                          {PLATFORMS.find(p => p.id === dist.platform)?.name || dist.platform}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Article ID: {dist.articleId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(dist.status)}
                      {dist.externalUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={dist.externalUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No distributions yet</p>
                <p className="text-sm">Start distributing your articles to reach more readers</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How Distribution Works</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Select a published article and choose target platforms</li>
              <li>• The system queues your article for distribution</li>
              <li>• Articles are formatted appropriately for each platform</li>
              <li>• Track referral traffic and clicks from each distribution</li>
              <li>• More platforms = more potential traffic and affiliate clicks</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
