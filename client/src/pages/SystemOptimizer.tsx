import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Server,
  Cpu,
  Clock,
  TrendingUp,
  Shield,
  BarChart3,
  Settings,
  Play,
  Gauge,
  Brain,
  Link2,
  Globe,
  Bot,
  Sparkles,
} from "lucide-react";

// Status badge component
function StatusBadge({ status }: { status: "healthy" | "degraded" | "down" | "operational" }) {
  const config = {
    healthy: { color: "bg-green-500", icon: CheckCircle2, text: "Healthy" },
    operational: { color: "bg-green-500", icon: CheckCircle2, text: "Operational" },
    degraded: { color: "bg-yellow-500", icon: AlertTriangle, text: "Degraded" },
    down: { color: "bg-red-500", icon: XCircle, text: "Down" },
  };
  const { color, icon: Icon, text } = config[status] || config.down;
  
  return (
    <Badge variant="outline" className={`gap-1 ${color} text-white border-0`}>
      <Icon className="h-3 w-3" />
      {text}
    </Badge>
  );
}

// Provider type icon
function ProviderIcon({ type }: { type: string }) {
  const icons: Record<string, any> = {
    llm: Brain,
    affiliate: Link2,
    distribution: Globe,
    bot: Bot,
    analytics: BarChart3,
  };
  const Icon = icons[type] || Server;
  return <Icon className="h-4 w-4" />;
}

export default function SystemOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<any>(null);

  // Fetch dashboard data
  const { data: dashboard, isLoading, refetch } = trpc.optimizer.getDashboard.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Run optimization mutation
  const runOptimization = trpc.optimizer.runOptimization.useMutation({
    onMutate: () => setIsOptimizing(true),
    onSuccess: (data) => {
      setLastOptimization(data);
      toast.success("Optimization cycle completed!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Optimization failed: ${error.message}`);
    },
    onSettled: () => setIsOptimizing(false),
  });

  const handleRunOptimization = () => {
    runOptimization.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const { health = [], features = [], stats = {}, summary = {} as any } = dashboard || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gauge className="h-8 w-8 text-blue-500" />
              System Optimizer
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and optimize all API providers and features automatically
            </p>
          </div>
          <Button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            size="lg"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Optimization
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Healthy Providers</p>
                  <p className="text-3xl font-bold text-green-500">
                    {summary.healthyProviders || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate (24h)</p>
                  <p className="text-3xl font-bold">
                    {((summary.successRate24h || 1) * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-3xl font-bold">
                    {((summary.averageResponseTime24h || 0) / 1000).toFixed(1)}s
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Features Operational</p>
                  <p className="text-3xl font-bold text-green-500">
                    {summary.operationalFeatures || 0}/{summary.totalFeatures || 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers" className="gap-2">
              <Server className="h-4 w-4" />
              Providers
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="optimization" className="gap-2">
              <Zap className="h-4 w-4" />
              Optimization
            </TabsTrigger>
          </TabsList>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Provider Health</CardTitle>
                <CardDescription>
                  Real-time health status of all integrated API providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {health.map((provider: any) => (
                    <div
                      key={provider.provider}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-background rounded-lg">
                          <ProviderIcon type={provider.type || "llm"} />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{provider.provider}</div>
                          <div className="text-sm text-muted-foreground">
                            Response: {provider.responseTime}ms
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {provider.error && (
                          <span className="text-sm text-red-400 max-w-xs truncate">
                            {provider.error}
                          </span>
                        )}
                        <StatusBadge status={provider.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Provider Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Statistics</CardTitle>
                <CardDescription>
                  Usage and performance metrics for each provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats).map(([provider, stat]: [string, any]) => (
                    <div key={provider} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{provider}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat.totalRequests} requests
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Progress
                            value={stat.totalRequests > 0 
                              ? (stat.successfulRequests / stat.totalRequests) * 100 
                              : 100
                            }
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm">
                          {stat.totalRequests > 0 
                            ? ((stat.successfulRequests / stat.totalRequests) * 100).toFixed(0)
                            : 100
                          }% success
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Avg: {(stat.averageResponseTime / 1000).toFixed(1)}s</span>
                        <span>Tokens: {stat.totalTokensUsed.toLocaleString()}</span>
                        {stat.lastError && (
                          <span className="text-red-400">Last error: {stat.lastError}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Health Status</CardTitle>
                <CardDescription>
                  Operational status of all website features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feature: any) => (
                    <div
                      key={feature.feature}
                      className="p-4 bg-muted rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{feature.feature}</span>
                        <StatusBadge status={feature.status} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {feature.dependencies.map((dep: string) => (
                          <Badge key={dep} variant="outline" className="text-xs capitalize">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                      {feature.issues.length > 0 && (
                        <div className="text-sm text-yellow-400">
                          {feature.issues.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            {lastOptimization ? (
              <>
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Last Optimization Results
                    </CardTitle>
                    <CardDescription>
                      Completed at {new Date(lastOptimization.timestamp).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-2xl font-bold">
                          {lastOptimization.metrics?.totalRequests24h || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Requests (24h)</div>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-2xl font-bold">
                          {((lastOptimization.metrics?.successRate24h || 1) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-2xl font-bold capitalize">
                          {lastOptimization.metrics?.topPerformingProvider || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">Top Provider</div>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <div className="text-2xl font-bold">
                          {lastOptimization.actionsPerformed?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Actions Taken</div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {lastOptimization.recommendations?.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <h4 className="font-medium">Recommendations</h4>
                        {lastOptimization.recommendations.map((rec: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span className="text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions Performed */}
                    {lastOptimization.actionsPerformed?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Actions Performed</h4>
                        {lastOptimization.actionsPerformed.map((action: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">{action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-2 border-dashed">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Optimization Run Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Run Optimization" to analyze and optimize all providers
                  </p>
                  <Button onClick={handleRunOptimization} disabled={isOptimizing}>
                    {isOptimizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Task Routing Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Intelligent Task Routing</CardTitle>
                <CardDescription>
                  How tasks are automatically routed to optimal providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { task: "Article Generation", providers: ["Manus", "Groq", "Cerebras"] },
                    { task: "SEO Optimization", providers: ["Groq", "Manus", "Cerebras"] },
                    { task: "Topic Research", providers: ["Cerebras", "OpenRouter", "Manus"] },
                    { task: "Affiliate Matching", providers: ["Groq", "Cerebras", "Manus"] },
                    { task: "Deep Reasoning", providers: ["OpenRouter", "Cerebras", "Manus"] },
                    { task: "Headline Generation", providers: ["Groq", "Manus", "Cerebras"] },
                  ].map((item) => (
                    <div key={item.task} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">{item.task}</span>
                      <div className="flex gap-2">
                        {item.providers.map((provider, i) => (
                          <Badge
                            key={provider}
                            variant={i === 0 ? "default" : "outline"}
                            className="text-xs"
                          >
                            {i === 0 && "→ "}
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
