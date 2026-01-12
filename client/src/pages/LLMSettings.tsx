import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Brain, 
  Zap, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Sparkles,
  FileText,
  Search,
  Link2,
  Heading,
  Settings2,
  Info
} from "lucide-react";

// Provider info for display
const PROVIDER_INFO = {
  groq: {
    name: "Groq",
    description: "Ultra-fast inference with Llama 3.3 70B",
    icon: Zap,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    limits: "1,000 req/day, 12K tokens/min",
    bestFor: "Article generation, SEO optimization",
  },
  cerebras: {
    name: "Cerebras",
    description: "High-volume with Qwen 3 235B",
    icon: Server,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    limits: "14,400 req/day, 1M tokens/day",
    bestFor: "Complex reasoning, topic research",
  },
  openrouter: {
    name: "OpenRouter",
    description: "DeepSeek R1 for deep research",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    limits: "50 req/day (free tier)",
    bestFor: "Deep reasoning, research synthesis",
  },
  google: {
    name: "Google AI Studio",
    description: "Gemini 2.5 Flash for multimodal",
    icon: Sparkles,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    limits: "20 req/day, 250K tokens/min",
    bestFor: "Complex analysis, long content",
  },
};

// Task types for testing
const TASK_TYPES = [
  { value: "article_generation", label: "Article Generation", icon: FileText },
  { value: "seo_optimization", label: "SEO Optimization", icon: Search },
  { value: "topic_research", label: "Topic Research", icon: Brain },
  { value: "affiliate_matching", label: "Affiliate Matching", icon: Link2 },
  { value: "headline_generation", label: "Headline Generation", icon: Heading },
  { value: "quick_task", label: "Quick Task", icon: Zap },
  { value: "deep_reasoning", label: "Deep Reasoning", icon: Sparkles },
];

export default function LLMSettings() {
  const [testTopic, setTestTopic] = useState("Best VPN services for privacy in 2025");
  const [testNiche, setTestNiche] = useState("technology");
  const [headlineStyle, setHeadlineStyle] = useState<"informative" | "clickbait" | "question" | "listicle">("informative");
  const [customPrompt, setCustomPrompt] = useState("");
  const [customTaskType, setCustomTaskType] = useState("quick_task");
  const [testResult, setTestResult] = useState<any>(null);

  // Get available providers
  const { data: providers, isLoading: loadingProviders } = trpc.llm.getProviders.useQuery();

  // Mutations for testing
  const generateArticle = trpc.llm.generateArticle.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success(`Article generated via ${data.provider}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const researchTopics = trpc.llm.researchTopics.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("Topics researched successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generateHeadlines = trpc.llm.generateHeadlines.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("Headlines generated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const optimizeSEO = trpc.llm.optimizeSEO.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("SEO optimization complete");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const invokeCustom = trpc.llm.invoke.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      toast.success(`Response from ${data.provider}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isAnyLoading = generateArticle.isPending || researchTopics.isPending || 
    generateHeadlines.isPending || optimizeSEO.isPending || invokeCustom.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-LLM Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Configure and test multiple AI providers for intelligent task routing
          </p>
        </div>

        {/* Provider Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(PROVIDER_INFO).map(([key, info]) => {
            const Icon = info.icon;
            const isAvailable = providers?.available?.includes(key);
            
            return (
              <Card key={key} className={`${info.bgColor} border-0`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${info.color}`} />
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                    </div>
                    {loadingProviders ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isAvailable ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{info.description}</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">Limits:</span> {info.limits}</p>
                    <p><span className="font-medium">Best for:</span> {info.bestFor}</p>
                  </div>
                  <Badge 
                    variant={isAvailable ? "default" : "secondary"} 
                    className="mt-2"
                  >
                    {isAvailable ? "Configured" : "Not Configured"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Configuration Notice */}
        {providers && providers.count === 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-500">
                <Info className="h-5 w-5" />
                No LLM Providers Configured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To enable multi-LLM intelligence, add API keys for at least one provider in Settings → Secrets:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code className="bg-muted px-1 rounded">GROQ_API_KEY</code> - Get free at <a href="https://console.groq.com" target="_blank" className="text-primary hover:underline">console.groq.com</a></li>
                <li>• <code className="bg-muted px-1 rounded">CEREBRAS_API_KEY</code> - Get free at <a href="https://cloud.cerebras.ai" target="_blank" className="text-primary hover:underline">cloud.cerebras.ai</a></li>
                <li>• <code className="bg-muted px-1 rounded">OPENROUTER_API_KEY</code> - Get free at <a href="https://openrouter.ai" target="_blank" className="text-primary hover:underline">openrouter.ai</a></li>
                <li>• <code className="bg-muted px-1 rounded">GOOGLE_AI_API_KEY</code> - Get free at <a href="https://aistudio.google.com" target="_blank" className="text-primary hover:underline">aistudio.google.com</a></li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Test Interface */}
        <Tabs defaultValue="article" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="article">Article</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="headlines">Headlines</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          {/* Article Generation Test */}
          <TabsContent value="article">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Test Article Generation
                </CardTitle>
                <CardDescription>
                  Generate a full article using the optimized LLM routing (Groq → Cerebras fallback)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    placeholder="Enter article topic..."
                  />
                </div>
                <Button
                  onClick={() => generateArticle.mutate({ 
                    topic: testTopic,
                    keywords: testTopic.split(" ").slice(0, 5),
                    wordCount: 1500,
                    style: "informative"
                  })}
                  disabled={isAnyLoading || !providers?.configured}
                >
                  {generateArticle.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Article</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Topic Research Test */}
          <TabsContent value="topics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Test Topic Research
                </CardTitle>
                <CardDescription>
                  Research trending topics using Cerebras Qwen 3 235B for complex reasoning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Niche</Label>
                  <Select value={testNiche} onValueChange={setTestNiche}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="health">Health & Wellness</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => researchTopics.mutate({ niche: testNiche, count: 5 })}
                  disabled={isAnyLoading || !providers?.configured}
                >
                  {researchTopics.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching...</>
                  ) : (
                    <><Search className="mr-2 h-4 w-4" /> Research Topics</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Headline Generation Test */}
          <TabsContent value="headlines">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heading className="h-5 w-5" />
                  Test Headline Generation
                </CardTitle>
                <CardDescription>
                  Generate click-worthy headlines using Groq's fast inference
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    placeholder="Enter topic for headlines..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={headlineStyle} onValueChange={(v) => setHeadlineStyle(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informative">Informative</SelectItem>
                      <SelectItem value="clickbait">Clickbait</SelectItem>
                      <SelectItem value="question">Question-Based</SelectItem>
                      <SelectItem value="listicle">Listicle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => generateHeadlines.mutate({ 
                    topic: testTopic, 
                    count: 5,
                    style: headlineStyle
                  })}
                  disabled={isAnyLoading || !providers?.configured}
                >
                  {generateHeadlines.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Heading className="mr-2 h-4 w-4" /> Generate Headlines</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO Optimization Test */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Test SEO Optimization
                </CardTitle>
                <CardDescription>
                  Optimize content for search engines using intelligent LLM routing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Keyword</Label>
                  <Input
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    placeholder="Enter target keyword..."
                  />
                </div>
                <Button
                  onClick={() => optimizeSEO.mutate({ 
                    content: `This is a sample article about ${testTopic}. It covers various aspects of the topic including benefits, features, and recommendations. The content is designed to help readers understand the subject better and make informed decisions.`,
                    targetKeyword: testTopic
                  })}
                  disabled={isAnyLoading || !providers?.configured}
                >
                  {optimizeSEO.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimizing...</>
                  ) : (
                    <><Search className="mr-2 h-4 w-4" /> Optimize SEO</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Prompt Test */}
          <TabsContent value="custom">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Custom LLM Invocation
                </CardTitle>
                <CardDescription>
                  Send a custom prompt to test different task types and routing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select value={customTaskType} onValueChange={setCustomTaskType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((task) => (
                        <SelectItem key={task.value} value={task.value}>
                          {task.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custom Prompt</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Enter your custom prompt..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={() => invokeCustom.mutate({ 
                    taskType: customTaskType as any,
                    systemPrompt: "You are a helpful AI assistant.",
                    userPrompt: customPrompt,
                    temperature: 0.7,
                    maxTokens: 2000
                  })}
                  disabled={isAnyLoading || !providers?.configured || !customPrompt}
                >
                  {invokeCustom.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Send to LLM</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Results Display */}
        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Result
                {testResult.provider && (
                  <Badge variant="outline" className="ml-2">
                    via {testResult.provider}
                  </Badge>
                )}
                {testResult.model && (
                  <Badge variant="secondary" className="ml-1">
                    {testResult.model}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResult.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {testResult.content}
                  </pre>
                </div>
              )}
              {testResult.headlines && (
                <ul className="space-y-2">
                  {testResult.headlines.map((h: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge variant="outline">{i + 1}</Badge>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
              {testResult.topics && (
                <div className="space-y-3">
                  {testResult.topics.map((t: any, i: number) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{i + 1}</Badge>
                        <span className="font-medium">{t.title}</span>
                        <Badge variant="outline">{t.difficulty}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                      <div className="flex gap-1 mt-2">
                        {t.keywords?.map((k: string) => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {testResult.title && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">SEO Title</Label>
                    <p className="font-medium">{testResult.title}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Meta Description</Label>
                    <p className="text-sm">{testResult.metaDescription}</p>
                  </div>
                  {testResult.suggestions && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Suggestions</Label>
                      <ul className="text-sm space-y-1 mt-1">
                        {testResult.suggestions.map((s: string, i: number) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {testResult.usage && (
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  Tokens: {testResult.usage.promptTokens} prompt + {testResult.usage.completionTokens} completion = {testResult.usage.totalTokens} total
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task Routing Info */}
        <Card>
          <CardHeader>
            <CardTitle>Intelligent Task Routing</CardTitle>
            <CardDescription>
              How different tasks are routed to optimal LLM providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Primary Routing</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <span className="text-foreground">Article Generation</span> → Groq (fast)</li>
                  <li>• <span className="text-foreground">SEO Optimization</span> → Groq (fast)</li>
                  <li>• <span className="text-foreground">Topic Research</span> → Cerebras (reasoning)</li>
                  <li>• <span className="text-foreground">Deep Reasoning</span> → OpenRouter (DeepSeek R1)</li>
                  <li>• <span className="text-foreground">Quick Tasks</span> → Groq (8B model)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Fallback Chain</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• If primary fails → Try fallback provider</li>
                  <li>• If fallback fails → Try any available provider</li>
                  <li>• Automatic retry with exponential backoff</li>
                  <li>• Rate limit aware routing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
