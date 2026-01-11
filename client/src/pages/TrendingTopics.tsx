import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  TrendingUp, 
  Search, 
  Sparkles, 
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  Loader2,
  RefreshCw
} from "lucide-react";

const categories = [
  { value: "all", label: "All Topics" },
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "business", label: "Business" },
  { value: "entertainment", label: "Entertainment" },
];

export default function TrendingTopics() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [niche, setNiche] = useState("");
  const [savedTopicIds, setSavedTopicIds] = useState<Set<number>>(new Set());

  const { data: topics, isLoading, refetch } = trpc.topics.list.useQuery({ category: selectedCategory });
  const { data: savedTopics } = trpc.topics.saved.useQuery();
  
  // Update saved topic IDs when data changes
  if (savedTopics && savedTopicIds.size === 0 && savedTopics.length > 0) {
    const ids = new Set<number>();
    savedTopics.forEach(s => ids.add(s.topicId));
    if (ids.size !== savedTopicIds.size) {
      setSavedTopicIds(ids);
    }
  }

  const discoverMutation = trpc.topics.discover.useMutation({
    onSuccess: () => {
      toast.success("New trending topics discovered!");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to discover topics: " + error.message);
    }
  });

  const saveMutation = trpc.topics.save.useMutation({
    onSuccess: (_, variables) => {
      setSavedTopicIds(prev => {
        const next = new Set<number>(prev);
        next.add(variables.topicId);
        return next;
      });
      toast.success("Topic saved!");
    }
  });

  const unsaveMutation = trpc.topics.unsave.useMutation({
    onSuccess: (_, variables) => {
      setSavedTopicIds(prev => {
        const next = new Set(prev);
        next.delete(variables.topicId);
        return next;
      });
      toast.success("Topic removed from saved");
    }
  });

  const handleDiscover = () => {
    discoverMutation.mutate({ niche: niche || undefined });
  };

  const handleSaveToggle = (topicId: number) => {
    if (savedTopicIds.has(topicId)) {
      unsaveMutation.mutate({ topicId });
    } else {
      saveMutation.mutate({ topicId });
    }
  };

  const handleCreateArticle = (topic: any) => {
    // Navigate to article editor with topic pre-filled
    setLocation(`/articles/new?topic=${encodeURIComponent(topic.title)}&keywords=${encodeURIComponent((topic.keywords || []).join(','))}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-primary" />
              Trending Topics
            </h1>
            <p className="text-muted-foreground mt-1">
              Discover trending topics with high monetization potential
            </p>
          </div>
        </div>

        {/* Discovery Section */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Topic Discovery
            </CardTitle>
            <CardDescription>
              Let AI find trending topics in your niche with monetization potential
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter a niche (e.g., 'personal finance', 'fitness')..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleDiscover}
                disabled={discoverMutation.isPending}
                className="btn-glow"
              >
                {discoverMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover Topics
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Topics Tabs */}
        <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-secondary">
              {categories.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {categories.map(cat => (
            <TabsContent key={cat.value} value={cat.value} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : topics && topics.length > 0 ? (
                <div className="grid gap-4">
                  {topics.map((topic) => (
                    <Card key={topic.id} className="card-glow hover:border-primary/50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-lg font-semibold">{topic.title}</h3>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveToggle(topic.id)}
                                className={savedTopicIds.has(topic.id) ? "text-primary" : "text-muted-foreground"}
                              >
                                {savedTopicIds.has(topic.id) ? (
                                  <BookmarkCheck className="w-5 h-5" />
                                ) : (
                                  <Bookmark className="w-5 h-5" />
                                )}
                              </Button>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{topic.category}</Badge>
                              <Badge className={`competition-${topic.competition}`}>
                                {topic.competition} competition
                              </Badge>
                              {topic.searchVolume && (
                                <Badge variant="outline">{topic.searchVolume} searches</Badge>
                              )}
                            </div>

                            {topic.keywords && (topic.keywords as string[]).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {(topic.keywords as string[]).map((keyword, i) => (
                                  <span 
                                    key={i}
                                    className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">
                                {topic.popularityScore}
                              </div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                            <Button onClick={() => handleCreateArticle(topic)} className="btn-glow">
                              Write Article
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No topics found</h3>
                  <p className="text-muted-foreground mb-4">
                    Use AI discovery to find trending topics in your niche
                  </p>
                  <Button onClick={handleDiscover} disabled={discoverMutation.isPending}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover Topics
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
