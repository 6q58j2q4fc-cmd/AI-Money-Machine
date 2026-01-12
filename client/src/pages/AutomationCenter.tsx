import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
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
  Settings,
  Clock,
  Power,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

export default function AutomationCenter() {
  const [niche, setNiche] = useState("");
  const [articleCount, setArticleCount] = useState(10); // Default to 10 for aggressive monetization
  const [autoPublish, setAutoPublish] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleResults, setCycleResults] = useState<any>(null);

  // Scheduler settings
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [schedulerArticles, setSchedulerArticles] = useState(10); // Default to 10 for aggressive monetization
  const [schedulerInterval, setSchedulerInterval] = useState(24);
  const [schedulerNiches, setSchedulerNiches] = useState<string[]>([]);
  const [schedulerAutoPublish, setSchedulerAutoPublish] = useState(true);

  const { data: status, refetch: refetchStatus } = trpc.automation.status.useQuery();
  const { data: settings, refetch: refetchSettings } = trpc.automation.getSettings.useQuery();
  
  // Load settings when available
  useEffect(() => {
    if (settings) {
      setSchedulerEnabled(settings.isEnabled);
      setSchedulerArticles(settings.articlesPerCycle);
      setSchedulerInterval(settings.cycleIntervalHours);
      setSchedulerNiches(settings.targetNiches || []);
      setSchedulerAutoPublish(settings.autoPublish);
    }
  }, [settings]);

  const saveSettingsMutation = trpc.automation.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Automation settings saved!");
      refetchSettings();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

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

  const handleSaveScheduler = () => {
    saveSettingsMutation.mutate({
      isEnabled: schedulerEnabled,
      articlesPerCycle: schedulerArticles,
      cycleIntervalHours: schedulerInterval,
      targetNiches: schedulerNiches.length > 0 ? schedulerNiches : undefined,
      autoPublish: schedulerAutoPublish,
    });
  };

  const nicheOptions = [
    "technology", "finance", "health", "lifestyle", "business", 
    "entertainment", "education", "travel", "food", "fitness"
  ];

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
          <div className="flex items-center gap-2">
            {status?.isActive ? (
              <Badge className="bg-green-500/20 text-green-500 border-green-500">
                <Power className="w-3 h-3 mr-1" />
                Auto-Pilot Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Power className="w-3 h-3 mr-1" />
                Manual Mode
              </Badge>
            )}
          </div>
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

        {/* Auto-Pilot Scheduler */}
        <Card className="card-glow border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              Auto-Pilot Scheduler
              {status?.isActive && (
                <Badge className="ml-2 bg-green-500/20 text-green-500 text-xs">RUNNING</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Set it and forget it - automatically generates and publishes content on schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Enable Auto-Pilot</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically run content generation cycles
                </p>
              </div>
              <Switch
                checked={schedulerEnabled}
                onCheckedChange={setSchedulerEnabled}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Articles Per Cycle</Label>
                <Select 
                  value={schedulerArticles.toString()} 
                  onValueChange={(v) => setSchedulerArticles(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7, 10, 15, 20, 30, 50].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} articles</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Run Every</Label>
                <Select 
                  value={schedulerInterval.toString()} 
                  onValueChange={(v) => setSchedulerInterval(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours (Daily)</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Publish Articles</Label>
                <p className="text-xs text-muted-foreground">
                  Publish immediately after generation
                </p>
              </div>
              <Switch
                checked={schedulerAutoPublish}
                onCheckedChange={setSchedulerAutoPublish}
              />
            </div>

            {settings?.nextRunAt && schedulerEnabled && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Next scheduled run: {format(new Date(settings.nextRunAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
            )}

            {settings?.lastRunAt && (
              <p className="text-xs text-muted-foreground">
                Last run: {format(new Date(settings.lastRunAt), "MMM d, yyyy 'at' h:mm a")} 
                {settings.totalArticlesGenerated > 0 && ` • ${settings.totalArticlesGenerated} total articles generated`}
              </p>
            )}

            <Button 
              onClick={handleSaveScheduler}
              disabled={saveSettingsMutation.isPending}
              className="w-full"
            >
              {saveSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Save Scheduler Settings
            </Button>
          </CardContent>
        </Card>

        {/* Manual Run Panel */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="card-glow border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Run Manual Cycle
              </CardTitle>
              <CardDescription>
                Trigger an immediate content generation cycle
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
                </div>

                <div>
                  <Label htmlFor="count">Number of Articles</Label>
                  <Select 
                    value={articleCount.toString()} 
                    onValueChange={(v) => setArticleCount(parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select article count" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 7, 10, 15, 20, 30, 50].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} articles</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Publish</Label>
                    <p className="text-xs text-muted-foreground">
                      Publish articles immediately
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
                    Start Cycle Now
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
              <Brain className="w-5 h-5 text-primary" />
              How Auto-Pilot Works
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
                  SEO-optimized articles created with affiliate opportunities
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium mb-1">3. Link Insertion</h3>
                <p className="text-xs text-muted-foreground">
                  Your CJ affiliate links automatically placed for clicks
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium mb-1">4. Publish & Earn</h3>
                <p className="text-xs text-muted-foreground">
                  Content goes live and starts generating commissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
