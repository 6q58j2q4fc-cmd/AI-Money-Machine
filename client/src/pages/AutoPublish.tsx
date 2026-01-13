import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Zap, 
  Plus,
  Calendar,
  Clock,
  Loader2,
  FileText,
  Sparkles,
  Play,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Globe,
  Rocket,
  ExternalLink,
  RefreshCw,
  Target,
  Link2,
  TrendingUp
} from "lucide-react";

export default function AutoPublish() {
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [selectedForPublish, setSelectedForPublish] = useState<number[]>([]);
  const [isAutoPublishing, setIsAutoPublishing] = useState(false);

  const utils = trpc.useUtils();

  const { data: contentQueue, isLoading: queueLoading } = trpc.contentQueue.list.useQuery();
  const { data: publishingQueue, isLoading: publishLoading } = trpc.publishing.queue.useQuery();
  const { data: draftArticles } = trpc.articles.list.useQuery({ status: "draft" });
  const { data: publishedArticles, refetch: refetchPublished } = trpc.articles.list.useQuery({ status: "published" });
  const { data: distributions, refetch: refetchDistributions } = trpc.distribution.list.useQuery({});

  // Free platform publishing mutations
  const autoPublishToAll = trpc.hiveMind.autoPublishToAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Published to ${data.length} platforms!`);
      refetchDistributions();
    },
    onError: (err) => toast.error(`Auto-publish failed: ${err.message}`)
  });

  const publishToFreePlatform = trpc.hiveMind.publishToFreePlatform.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Published to ${data.platform}!`);
        if (data.url) window.open(data.url, '_blank');
      } else {
        toast.error(`Failed: ${data.error}`);
      }
      refetchDistributions();
    },
    onError: (err) => toast.error(`Publish failed: ${err.message}`)
  });

  // Handle auto-publish all selected
  const handleAutoPublishAll = async () => {
    if (selectedForPublish.length === 0) {
      toast.error('Please select articles to publish');
      return;
    }
    setIsAutoPublishing(true);
    for (const articleId of selectedForPublish) {
      try {
        await autoPublishToAll.mutateAsync({ articleId });
      } catch (error) {
        console.error(`Failed to publish article ${articleId}:`, error);
      }
    }
    setIsAutoPublishing(false);
    setSelectedForPublish([]);
    toast.success('Auto-publish complete!');
  };

  // Toggle article selection for free publishing
  const togglePublishSelect = (id: number) => {
    setSelectedForPublish(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // Select all for publishing
  const selectAllForPublish = () => {
    if (publishedArticles) {
      setSelectedForPublish(publishedArticles.map((a: any) => a.id));
    }
  };

  // Free platforms list
  const freePlatforms = [
    { id: 'telegraph', name: 'Telegraph', type: 'instant', status: 'connected' },
    { id: 'medium', name: 'Medium', type: 'blog', status: 'available' },
    { id: 'devto', name: 'Dev.to', type: 'blog', status: 'available' },
    { id: 'hashnode', name: 'Hashnode', type: 'blog', status: 'available' },
    { id: 'linkedin', name: 'LinkedIn', type: 'social', status: 'available' },
    { id: 'wordpress', name: 'WordPress.com', type: 'blog', status: 'available' },
    { id: 'blogger', name: 'Blogger', type: 'blog', status: 'available' },
    { id: 'tumblr', name: 'Tumblr', type: 'blog', status: 'available' },
    { id: 'substack', name: 'Substack', type: 'newsletter', status: 'available' },
  ];

  const addToQueueMutation = trpc.contentQueue.add.useMutation({
    onSuccess: () => {
      toast.success("Added to content queue!");
      utils.contentQueue.list.invalidate();
      setIsAddDialogOpen(false);
      setNewTitle("");
      setNewKeywords("");
    },
    onError: (error) => toast.error(error.message)
  });

  const generateMutation = trpc.contentQueue.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Article generated!");
      utils.contentQueue.list.invalidate();
      utils.articles.list.invalidate();
      setLocation(`/articles/${data.articleId}`);
    },
    onError: (error) => toast.error(error.message)
  });

  const removeFromQueueMutation = trpc.contentQueue.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from queue");
      utils.contentQueue.list.invalidate();
    }
  });

  const scheduleMutation = trpc.publishing.schedule.useMutation({
    onSuccess: () => {
      toast.success("Article scheduled for publishing!");
      utils.publishing.queue.invalidate();
      setScheduledDate("");
      setSelectedArticleId(null);
    },
    onError: (error) => toast.error(error.message)
  });

  const publishNowMutation = trpc.publishing.publishNow.useMutation({
    onSuccess: () => {
      toast.success("Article published!");
      utils.publishing.queue.invalidate();
      utils.articles.list.invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const cancelScheduleMutation = trpc.publishing.cancel.useMutation({
    onSuccess: () => {
      toast.success("Publishing cancelled");
      utils.publishing.queue.invalidate();
    }
  });

  const handleAddToQueue = () => {
    if (!newTitle) {
      toast.error("Title is required");
      return;
    }
    addToQueueMutation.mutate({
      title: newTitle,
      keywords: newKeywords.split(",").map(k => k.trim()).filter(Boolean),
      priority: 0,
    });
  };

  const handleSchedule = () => {
    if (!selectedArticleId || !scheduledDate) {
      toast.error("Select an article and date");
      return;
    }
    scheduleMutation.mutate({
      articleId: selectedArticleId,
      scheduledAt: scheduledDate,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500",
      generating: "bg-blue-500/10 text-blue-500",
      ready: "bg-green-500/10 text-green-500",
      published: "bg-primary/10 text-primary",
      failed: "bg-destructive/10 text-destructive",
      processing: "bg-blue-500/10 text-blue-500",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              Auto Publish
            </h1>
            <p className="text-muted-foreground mt-1">
              Automate content generation and publishing
            </p>
          </div>
        </div>

        <Tabs defaultValue="content">
          <TabsList className="bg-secondary">
            <TabsTrigger value="content">
              <Sparkles className="w-4 h-4 mr-2" />
              Content Queue
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="w-4 h-4 mr-2" />
              Publishing Schedule
            </TabsTrigger>
            <TabsTrigger value="free-platforms">
              <Globe className="w-4 h-4 mr-2" />
              Free Platforms
            </TabsTrigger>
            <TabsTrigger value="live-pages">
              <ExternalLink className="w-4 h-4 mr-2" />
              Live Pages
            </TabsTrigger>
          </TabsList>

          {/* Content Queue Tab */}
          <TabsContent value="content" className="mt-6 space-y-6">
            {/* Add to Queue Card */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Add to Content Queue
                </CardTitle>
                <CardDescription>
                  Queue topics for automatic article generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-glow">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Topic
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Topic to Queue</DialogTitle>
                      <DialogDescription>
                        This topic will be queued for automatic article generation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="title">Article Title *</Label>
                        <Input
                          id="title"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g., Best Budget Laptops for 2025"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                        <Input
                          id="keywords"
                          value={newKeywords}
                          onChange={(e) => setNewKeywords(e.target.value)}
                          placeholder="e.g., budget laptops, best laptops, laptop reviews"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddToQueue}
                        disabled={addToQueueMutation.isPending}
                      >
                        {addToQueueMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Add to Queue
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Queue List */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Content Queue ({contentQueue?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : contentQueue && contentQueue.length > 0 ? (
                  <div className="space-y-3">
                    {contentQueue.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            {item.keywords && (item.keywords as string[]).length > 0 && (
                              <span className="text-xs">
                                · {(item.keywords as string[]).slice(0, 3).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(item.status)}
                        <div className="flex items-center gap-2">
                          {item.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => generateMutation.mutate({ id: item.id })}
                              disabled={generateMutation.isPending}
                            >
                              {generateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {item.status === "ready" && item.generatedArticleId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/articles/${item.generatedArticleId}`)}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromQueueMutation.mutate({ id: item.id })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No items in content queue</p>
                    <p className="text-sm">Add topics to automatically generate articles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Publishing Schedule Tab */}
          <TabsContent value="schedule" className="mt-6 space-y-6">
            {/* Schedule New */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Schedule Article
                </CardTitle>
                <CardDescription>
                  Schedule a draft article for automatic publishing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Select Article</Label>
                    <select
                      value={selectedArticleId || ""}
                      onChange={(e) => setSelectedArticleId(Number(e.target.value) || null)}
                      className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Choose an article...</option>
                      {draftArticles?.map((article) => (
                        <option key={article.id} value={article.id}>
                          {article.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Publish Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleSchedule}
                      disabled={!selectedArticleId || !scheduledDate || scheduleMutation.isPending}
                      className="btn-glow"
                    >
                      {scheduleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4 mr-2" />
                      )}
                      Schedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Items */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Publishing Queue ({publishingQueue?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {publishLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : publishingQueue && publishingQueue.length > 0 ? (
                  <div className="space-y-3">
                    {publishingQueue.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {(item as any).article?.title || `Article #${item.articleId}`}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Scheduled: {format(new Date(item.scheduledAt), "PPp")}
                          </div>
                        </div>
                        {getStatusBadge(item.status)}
                        <div className="flex items-center gap-2">
                          {item.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => publishNowMutation.mutate({ articleId: item.articleId })}
                                disabled={publishNowMutation.isPending}
                              >
                                {publishNowMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelScheduleMutation.mutate({ id: item.id })}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {item.status === "published" && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {item.status === "failed" && (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No scheduled publications</p>
                    <p className="text-sm">Schedule articles to publish automatically</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Free Platform Publishing Tab */}
          <TabsContent value="free-platforms" className="mt-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Published Online</p>
                      <p className="text-2xl font-bold text-green-400">
                        {distributions?.filter((d: any) => d.status === 'published').length || 0}
                      </p>
                    </div>
                    <Globe className="w-8 h-8 text-green-400/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Platforms</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {freePlatforms.filter(p => p.status === 'connected').length}
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-blue-400/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Articles Ready</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {publishedArticles?.length || 0}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-400/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">PayPal</p>
                      <p className="text-sm font-mono text-yellow-400 truncate">
                        dakotarea@icloud.com
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-yellow-400/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Auto-Publish Controls */}
            <Card className="card-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-primary" />
                      Auto-Publish to Free Platforms
                    </CardTitle>
                    <CardDescription>
                      Select articles and publish to all connected platforms automatically
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllForPublish}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedForPublish([])}>
                      Clear
                    </Button>
                    <Button 
                      onClick={handleAutoPublishAll}
                      disabled={isAutoPublishing || selectedForPublish.length === 0}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {isAutoPublishing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" />Publish Selected ({selectedForPublish.length})</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {publishedArticles?.map((article: any) => (
                    <div 
                      key={article.id}
                      className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedForPublish.includes(article.id) 
                          ? 'bg-purple-500/10 border-purple-500/50' 
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                      onClick={() => togglePublishSelect(article.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedForPublish.includes(article.id)}
                        onChange={() => {}}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{article.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          SEO: {article.seoScore || 0} | {article.wordCount || 0} words
                        </p>
                      </div>
                      <Badge variant="outline">{article.category || 'General'}</Badge>
                    </div>
                  ))}
                  {(!publishedArticles || publishedArticles.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No published articles found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Available Platforms */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Available Free Platforms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {freePlatforms.map((platform) => (
                    <div 
                      key={platform.id}
                      className={`p-4 rounded-lg border ${
                        platform.status === 'connected' 
                          ? 'bg-green-500/5 border-green-500/30' 
                          : 'bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{platform.name}</span>
                        {platform.status === 'connected' ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Badge variant="outline" className="text-xs">{platform.type}</Badge>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant={platform.status === 'connected' ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => {
                          if (selectedForPublish.length > 0) {
                            publishToFreePlatform.mutate({
                              articleId: selectedForPublish[0],
                              platformId: platform.id
                            });
                          } else {
                            toast.error('Select an article first');
                          }
                        }}
                      >
                        {platform.status === 'connected' ? 'Publish' : 'Connect'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Pages Tab */}
          <TabsContent value="live-pages" className="mt-6 space-y-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  Published Pages Online
                </CardTitle>
                <CardDescription>
                  Your articles live on the internet with working affiliate links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {distributions?.filter((d: any) => d.status === 'published' && d.publishedUrl)
                    .map((dist: any) => (
                      <div 
                        key={dist.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20"
                      >
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">Article #{dist.articleId}</h4>
                          <a 
                            href={dist.publishedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:underline truncate block"
                          >
                            {dist.publishedUrl}
                          </a>
                        </div>
                        <Badge>{dist.platform}</Badge>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={dist.publishedUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  {(!distributions || distributions.filter((d: any) => d.status === 'published').length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No live pages yet</p>
                      <p className="text-sm">Start publishing to see them here!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PayPal Info */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  PayPal Payment Routing
                </CardTitle>
                <CardDescription>
                  All non-affiliate income is automatically routed to your PayPal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-black/20">
                  <div>
                    <p className="text-sm text-muted-foreground">PayPal Email</p>
                    <p className="font-mono text-yellow-400">dakotarea@icloud.com</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
