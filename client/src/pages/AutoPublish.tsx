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
  ArrowRight
} from "lucide-react";

export default function AutoPublish() {
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: contentQueue, isLoading: queueLoading } = trpc.contentQueue.list.useQuery();
  const { data: publishingQueue, isLoading: publishLoading } = trpc.publishing.queue.useQuery();
  const { data: draftArticles } = trpc.articles.list.useQuery({ status: "draft" });

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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
