import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Zap, 
  Play, 
  Loader2, 
  TrendingUp, 
  FileText, 
  Link2, 
  CheckCircle,
  AlertCircle,
  Rocket,
  Brain,
  Target,
  DollarSign,
  RefreshCw,
  Settings
} from "lucide-react";

export default function AutomationCenter() {
  const [niche, setNiche] = useState("");
  const [articleCount, setArticleCount] = useState(3);
  const [autoPublish, setAutoPublish] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleResults, setCycleResults] = useState<any>(null);

  const { data: status, refetch: refetchStatus } = trpc.automation.status.useQuery();
  
  const runCycleMutation = trpc.automation.runCycle.useMutation({
    onSuccess: (data) => {
      setCycleResults(data);
      refetchStatus();
      if (data.success) {
        toast.success(`Generated ${data.articlesGenerated} articles from ${data.topicsDiscovered} trending topics!`);
      } else {
        toast.error("Automation cycle encountered issues");
      }
      setIsRunning(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsRunning(false);
    }
  });

  const handleRunCycle = () => {
    setIsRunning(true);
    setCycleResults(null);
    runCycleMutation.mutate({
      count: articleCount,
      niche: niche || undefined,
      autoPublish,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Automation Control Center
            </h1>
            <p className="text-muted-foreground text-sm">
              Fully automated content generation and publishing
            </p>
          </div>
          <Badge variant="outline" className="text-primary border-primary w-fit">
            <Brain className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </div>

        {/* Status Overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                  <p className="text-2xl font-bold">{status?.totalArticles || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold text-green-500">{status?.publishedArticles || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Affiliate Links</p>
                  <p className="text-2xl font-bold">{status?.affiliateLinks || 0}</p>
                </div>
                <Link2 className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Queue</p>
                  <p className="text-2xl font-bold">{(status?.pendingContent || 0) + (status?.scheduledPublish || 0)}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Automation Panel */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Run Automation */}
          <Card className="card-glow border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Run Automation Cycle
              </CardTitle>
              <CardDescription>
                Discover trends, generate articles, insert affiliate links, and publish automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="niche">Target Niche (optional)</Label>
                  <Input
                    id="niche"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g., personal finance, tech gadgets, health..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to discover across all niches
                  </p>
                </div>

                <div>
                  <Label htmlFor="count">Number of Articles</Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={10}
                    value={articleCount}
                    onChange={(e) => setArticleCount(parseInt(e.target.value) || 3)}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Publish</Label>
                    <p className="text-xs text-muted-foreground">
                      Publish articles immediately after generation
                    </p>
                  </div>
                  <Switch
                    checked={autoPublish}
                    onCheckedChange={setAutoPublish}
                  />
                </div>
              </div>

              <Button 
                onClick={handleRunCycle}
                disabled={isRunning}
                className="w-full btn-glow"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running Automation...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Automation Cycle
                  </>
                )}
              </Button>

              {isRunning && (
                <div className="space-y-2">
                  <Progress value={33} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    Discovering trends and generating content...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Cycle Results
              </CardTitle>
              <CardDescription>
                Results from the last automation cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cycleResults ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {cycleResults.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-medium">
                      {cycleResults.success ? "Cycle Completed Successfully" : "Cycle Encountered Issues"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50 text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{cycleResults.topicsDiscovered}</div>
                      <div className="text-xs text-muted-foreground">Topics Discovered</div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 text-center">
                      <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{cycleResults.articlesGenerated}</div>
                      <div className="text-xs text-muted-foreground">Articles Generated</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Steps Completed:</p>
                    {cycleResults.results?.map((result: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="font-medium">{result.step}:</span>
                        <span className="text-muted-foreground">{result.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Run an automation cycle to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              How Automation Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium mb-1">1. Trend Discovery</h3>
                <p className="text-xs text-muted-foreground">
                  AI analyzes current trends to find high-potential topics
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium mb-1">2. Content Generation</h3>
                <p className="text-xs text-muted-foreground">
                  SEO-optimized articles are created with affiliate opportunities
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium mb-1">3. Link Insertion</h3>
                <p className="text-xs text-muted-foreground">
                  Affiliate links are automatically placed for maximum clicks
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium mb-1">4. Publish & Earn</h3>
                <p className="text-xs text-muted-foreground">
                  Content goes live and starts generating revenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
