import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Zap, 
  Settings, 
  Play, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Link2, 
  TrendingUp,
  Sparkles,
  Target,
  Gauge,
  Bot,
  Cpu
} from "lucide-react";

interface PipelineConfig {
  articlesPerCycle: number;
  wordCountMin: number;
  wordCountMax: number;
  contentStyle: "informative" | "persuasive" | "review" | "comparison" | "listicle";
  targetNiches: string[];
  focusKeywords: string[];
  minAffiliateLinks: number;
  maxAffiliateLinks: number;
  affiliateDensity: "low" | "medium" | "high" | "aggressive";
  autoPublish: boolean;
  autoDistribute: boolean;
  publishDelay: number;
  minSeoScore: number;
  temperature: number;
}

const DEFAULT_CONFIG: PipelineConfig = {
  articlesPerCycle: 5,
  wordCountMin: 1500,
  wordCountMax: 3000,
  contentStyle: "persuasive",
  targetNiches: ["technology", "finance", "health"],
  focusKeywords: [],
  minAffiliateLinks: 3,
  maxAffiliateLinks: 7,
  affiliateDensity: "high",
  autoPublish: true,
  autoDistribute: true,
  publishDelay: 5,
  minSeoScore: 70,
  temperature: 0.7,
};

const NICHE_OPTIONS = [
  "technology", "finance", "health", "lifestyle", "business", 
  "entertainment", "travel", "food", "fitness", "education",
  "home", "automotive", "fashion", "beauty", "gaming"
];

export default function ContentPipeline() {
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);
  const [newKeyword, setNewKeyword] = useState("");
  const [pipelineResults, setPipelineResults] = useState<any>(null);

  const { data: providers } = trpc.automation.getAvailableLLMProviders.useQuery();

  const runPipeline = trpc.automation.runPipeline.useMutation({
    onSuccess: (data) => {
      setPipelineResults(data);
      if (data.success) {
        toast.success(`Pipeline completed! Generated ${data.articlesGenerated} articles with ${data.affiliateLinksInserted} affiliate links.`);
      } else {
        toast.error(`Pipeline completed with errors: ${data.errors.join(", ")}`);
      }
    },
    onError: (error) => {
      toast.error(`Pipeline failed: ${error.message}`);
    },
  });

  const discoverTopics = trpc.automation.discoverTopicsMultiLLM.useMutation({
    onSuccess: (data) => {
      toast.success(`Discovered ${data.topics.length} topics using ${data.provider}`);
    },
    onError: (error) => {
      toast.error(`Topic discovery failed: ${error.message}`);
    },
  });

  const handleRunPipeline = () => {
    runPipeline.mutate({
      articlesPerCycle: config.articlesPerCycle,
      contentStyle: config.contentStyle,
      targetNiches: config.targetNiches,
      affiliateDensity: config.affiliateDensity,
      autoPublish: config.autoPublish,
      autoDistribute: config.autoDistribute,
    });
  };

  const handleDiscoverTopics = () => {
    discoverTopics.mutate({
      niches: config.targetNiches,
      count: config.articlesPerCycle,
    });
  };

  const addKeyword = () => {
    if (newKeyword && !config.focusKeywords.includes(newKeyword)) {
      setConfig({ ...config, focusKeywords: [...config.focusKeywords, newKeyword] });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setConfig({ ...config, focusKeywords: config.focusKeywords.filter(k => k !== keyword) });
  };

  const toggleNiche = (niche: string) => {
    if (config.targetNiches.includes(niche)) {
      setConfig({ ...config, targetNiches: config.targetNiches.filter(n => n !== niche) });
    } else {
      setConfig({ ...config, targetNiches: [...config.targetNiches, niche] });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              Content Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Automated hands-free content creation powered by Multi-LLM Intelligence
            </p>
          </div>
          <div className="flex items-center gap-2">
            {providers && providers.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Cpu className="h-3 w-3" />
                {providers.length} LLM{providers.length > 1 ? "s" : ""} Active
              </Badge>
            )}
          </div>
        </div>

        {providers && providers.length > 0 && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Bot className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Active LLM Providers:</span>
                <div className="flex gap-2">
                  {providers.map((provider) => (
                    <Badge key={provider} variant="secondary" className="capitalize">
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="configure" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure" className="gap-2">
              <Settings className="h-4 w-4" />
              Configure
            </TabsTrigger>
            <TabsTrigger value="run" className="gap-2">
              <Play className="h-4 w-4" />
              Run Pipeline
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Settings
                  </CardTitle>
                  <CardDescription>Configure article generation parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Articles Per Cycle</Label>
                    <Select
                      value={config.articlesPerCycle.toString()}
                      onValueChange={(v) => setConfig({ ...config, articlesPerCycle: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10, 15, 20].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n} articles</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Content Style</Label>
                    <Select
                      value={config.contentStyle}
                      onValueChange={(v: any) => setConfig({ ...config, contentStyle: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informative">Informative</SelectItem>
                        <SelectItem value="persuasive">Persuasive</SelectItem>
                        <SelectItem value="review">Product Review</SelectItem>
                        <SelectItem value="comparison">Comparison</SelectItem>
                        <SelectItem value="listicle">Listicle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Word Count Range: {config.wordCountMin} - {config.wordCountMax}</Label>
                    <div className="flex gap-4">
                      <Input
                        type="number"
                        value={config.wordCountMin}
                        onChange={(e) => setConfig({ ...config, wordCountMin: parseInt(e.target.value) || 1000 })}
                        className="w-24"
                      />
                      <span className="self-center">to</span>
                      <Input
                        type="number"
                        value={config.wordCountMax}
                        onChange={(e) => setConfig({ ...config, wordCountMax: parseInt(e.target.value) || 3000 })}
                        className="w-24"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>LLM Temperature: {config.temperature}</Label>
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([v]) => setConfig({ ...config, temperature: v })}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Affiliate Settings
                  </CardTitle>
                  <CardDescription>Configure affiliate link insertion</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Affiliate Density</Label>
                    <Select
                      value={config.affiliateDensity}
                      onValueChange={(v: any) => setConfig({ ...config, affiliateDensity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (2-3 links)</SelectItem>
                        <SelectItem value="medium">Medium (4-5 links)</SelectItem>
                        <SelectItem value="high">High (5-7 links)</SelectItem>
                        <SelectItem value="aggressive">Aggressive (7-10 links)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Links</Label>
                      <Input
                        type="number"
                        value={config.minAffiliateLinks}
                        onChange={(e) => setConfig({ ...config, minAffiliateLinks: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Links</Label>
                      <Input
                        type="number"
                        value={config.maxAffiliateLinks}
                        onChange={(e) => setConfig({ ...config, maxAffiliateLinks: parseInt(e.target.value) || 10 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Min SEO Score: {config.minSeoScore}</Label>
                    <Slider
                      value={[config.minSeoScore]}
                      onValueChange={([v]) => setConfig({ ...config, minSeoScore: v })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Target Niches
                  </CardTitle>
                  <CardDescription>Select niches for content generation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map((niche) => (
                      <Badge
                        key={niche}
                        variant={config.targetNiches.includes(niche) ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleNiche(niche)}
                      >
                        {niche}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Publishing Settings
                  </CardTitle>
                  <CardDescription>Configure auto-publishing behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Auto-Publish Articles</Label>
                    <Switch
                      checked={config.autoPublish}
                      onCheckedChange={(v) => setConfig({ ...config, autoPublish: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Auto-Distribute to Platforms</Label>
                    <Switch
                      checked={config.autoDistribute}
                      onCheckedChange={(v) => setConfig({ ...config, autoDistribute: v })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Delay Between Articles (seconds)</Label>
                    <Input
                      type="number"
                      value={config.publishDelay}
                      onChange={(e) => setConfig({ ...config, publishDelay: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Focus Keywords (Optional)
                </CardTitle>
                <CardDescription>Add specific keywords to target in generated content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  />
                  <Button onClick={addKeyword}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.focusKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                  {config.focusKeywords.length === 0 && (
                    <span className="text-sm text-muted-foreground">No keywords added. Pipeline will auto-discover keywords.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="run" className="space-y-6">
            <Card className="border-2 border-dashed">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Ready to Generate Content?</CardTitle>
                <CardDescription>
                  The pipeline will discover {config.articlesPerCycle} trending topics in {config.targetNiches.join(", ")} niches,
                  generate SEO-optimized articles, and insert affiliate links automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{config.articlesPerCycle}</div>
                    <div className="text-sm text-muted-foreground">Articles</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{config.targetNiches.length}</div>
                    <div className="text-sm text-muted-foreground">Niches</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold capitalize">{config.affiliateDensity}</div>
                    <div className="text-sm text-muted-foreground">Link Density</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold capitalize">{config.contentStyle}</div>
                    <div className="text-sm text-muted-foreground">Style</div>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleDiscoverTopics}
                    disabled={discoverTopics.isPending}
                  >
                    {discoverTopics.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4 mr-2" />
                        Preview Topics
                      </>
                    )}
                  </Button>

                  <Button
                    size="lg"
                    onClick={handleRunPipeline}
                    disabled={runPipeline.isPending}
                    className="px-8"
                  >
                    {runPipeline.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Run Pipeline
                      </>
                    )}
                  </Button>
                </div>

                {runPipeline.isPending && (
                  <div className="text-center text-muted-foreground mt-4">
                    <p>This may take a few minutes. The pipeline is:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>1. Discovering trending topics...</li>
                      <li>2. Generating SEO-optimized articles...</li>
                      <li>3. Inserting affiliate links...</li>
                      <li>4. Publishing to your blog...</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {discoverTopics.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Discovered Topics</CardTitle>
                  <CardDescription>
                    Found {discoverTopics.data.topics.length} topics using {discoverTopics.data.provider}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {discoverTopics.data.topics.map((topic: any, i: number) => (
                      <div key={i} className="p-3 bg-muted rounded-lg">
                        <div className="font-medium">{topic.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{topic.description}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.keywords?.map((kw: string) => (
                            <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {pipelineResults ? (
              <>
                <Card className={pipelineResults.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {pipelineResults.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      Pipeline {pipelineResults.success ? "Completed" : "Failed"}
                    </CardTitle>
                    <CardDescription>
                      Execution time: {(pipelineResults.executionTime / 1000).toFixed(1)}s
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-3xl font-bold text-green-500">{pipelineResults.articlesGenerated}</div>
                        <div className="text-sm text-muted-foreground">Articles Generated</div>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-3xl font-bold text-blue-500">{pipelineResults.articlesPublished}</div>
                        <div className="text-sm text-muted-foreground">Articles Published</div>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-3xl font-bold text-purple-500">{pipelineResults.affiliateLinksInserted}</div>
                        <div className="text-sm text-muted-foreground">Affiliate Links</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pipelineResults.details.map((step: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          {step.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{step.step}</div>
                            <div className="text-sm text-muted-foreground">{step.details}</div>
                            {step.data?.provider && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Provider: {step.data.provider}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(step.duration / 1000).toFixed(1)}s
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {pipelineResults.errors.length > 0 && (
                  <Card className="border-red-500/20">
                    <CardHeader>
                      <CardTitle className="text-red-500">Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {pipelineResults.errors.map((error: string, i: number) => (
                          <li key={i} className="text-sm text-red-400">{error}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground">
                    Run the content pipeline to see results here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
