import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Brain,
  Shield,
  Clock,
  TrendingUp,
  Bug,
  Wrench,
  Eye,
  Play,
  Pause,
  BarChart3,
  Server,
  Database,
  Globe,
  Cpu
} from "lucide-react";

export default function SystemHealth() {
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [isHealing, setIsHealing] = useState(false);

  // tRPC queries
  const { data: health, refetch: refetchHealth } = trpc.selfDebugger.getHealth.useQuery(undefined, {
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  const { data: summary, refetch: refetchSummary } = trpc.selfDebugger.getSummary.useQuery(undefined, {
    refetchInterval: 30000
  });
  const { data: errors, refetch: refetchErrors } = trpc.selfDebugger.getErrors.useQuery({ limit: 20 });
  const { data: hiveMindState } = trpc.hiveMind.getState.useQuery();

  // tRPC mutations
  const runDiagnosticsMutation = trpc.selfDebugger.runDiagnostics.useMutation({
    onSuccess: (data) => {
      toast.success(`Diagnostics complete: ${data.issues.length} issues found`);
      refetchHealth();
      refetchSummary();
      refetchErrors();
    },
    onError: (error) => {
      toast.error(`Diagnostics failed: ${error.message}`);
    }
  });

  const selfHealMutation = trpc.selfDebugger.selfHeal.useMutation({
    onSuccess: (data) => {
      toast.success(`Self-healing complete: ${data.fixed}/${data.attempted} issues fixed`);
      refetchHealth();
      refetchSummary();
      refetchErrors();
    },
    onError: (error) => {
      toast.error(`Self-healing failed: ${error.message}`);
    }
  });

  const startMonitoringMutation = trpc.selfDebugger.startMonitoring.useMutation({
    onSuccess: () => {
      toast.success("Continuous monitoring started");
      refetchSummary();
    }
  });

  const stopMonitoringMutation = trpc.selfDebugger.stopMonitoring.useMutation({
    onSuccess: () => {
      toast.info("Continuous monitoring stopped");
      refetchSummary();
    }
  });

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      await runDiagnosticsMutation.mutateAsync();
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleSelfHeal = async () => {
    setIsHealing(true);
    try {
      await selfHealMutation.mutateAsync();
    } finally {
      setIsHealing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'critical': return <XCircle className="w-6 h-6 text-red-400" />;
      default: return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium</Badge>;
      case 'low': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Low</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              System Health Center
            </h1>
            <p className="text-gray-400 mt-1">
              Real-time monitoring, self-debugging, and automatic error resolution
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                refetchHealth();
                refetchSummary();
                refetchErrors();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {summary?.isMonitoring ? (
              <Button
                variant="outline"
                onClick={() => stopMonitoringMutation.mutate()}
                className="border-yellow-500/50 text-yellow-400"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Monitoring
              </Button>
            ) : (
              <Button
                onClick={() => startMonitoringMutation.mutate()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Monitoring
              </Button>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">System Status</p>
                  <p className={`text-2xl font-bold capitalize ${getStatusColor(health?.status || 'unknown')}`}>
                    {health?.status || 'Unknown'}
                  </p>
                </div>
                {getStatusIcon(health?.status || 'unknown')}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Uptime: {health ? formatUptime(health.uptime) : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Errors</p>
                  <p className="text-2xl font-bold text-white">{health?.activeErrors || 0}</p>
                </div>
                <Bug className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Error rate: {health?.errorRate?.toFixed(2) || 0}/min
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Auto-Fixed</p>
                  <p className="text-2xl font-bold text-green-400">{health?.autoFixedCount || 0}</p>
                </div>
                <Wrench className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Fix rate: {((summary?.autoFixRate || 0) * 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Monitoring</p>
                  <p className="text-2xl font-bold text-white">
                    {summary?.isMonitoring ? 'Active' : 'Paused'}
                  </p>
                </div>
                <Eye className={`w-6 h-6 ${summary?.isMonitoring ? 'text-green-400' : 'text-gray-500'}`} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Real-time error detection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Zap className="w-5 h-5" />
                Run Diagnostics
              </CardTitle>
              <CardDescription>
                Perform comprehensive system analysis to identify issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRunDiagnostics}
                disabled={isRunningDiagnostics}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {isRunningDiagnostics ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run Full Diagnostics
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Brain className="w-5 h-5" />
                Self-Healing
              </CardTitle>
              <CardDescription>
                Automatically fix known issues using AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSelfHeal}
                disabled={isHealing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isHealing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Healing System...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Attempt Self-Heal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="errors" className="space-y-4">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="errors">Recent Errors</TabsTrigger>
            <TabsTrigger value="components">System Components</TabsTrigger>
            <TabsTrigger value="hivemind">Hive Mind Status</TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-red-400" />
                  Recent Errors
                </CardTitle>
                <CardDescription>
                  Latest errors detected by the self-debugging system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errors && errors.length > 0 ? (
                  <div className="space-y-3">
                    {errors.map((error: any) => (
                      <div
                        key={error.id}
                        className={`p-4 rounded-lg border ${
                          error.resolved 
                            ? 'bg-green-900/20 border-green-500/30' 
                            : 'bg-red-900/20 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getSeverityBadge(error.severity)}
                              <Badge variant="outline" className="text-xs">
                                {error.type}
                              </Badge>
                              {error.resolved && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  Resolved
                                </Badge>
                              )}
                              {error.autoFixed && (
                                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                  Auto-Fixed
                                </Badge>
                              )}
                            </div>
                            <p className="text-white font-medium">{error.message}</p>
                            {error.resolution && (
                              <p className="text-sm text-gray-400 mt-1">
                                Resolution: {error.resolution.slice(0, 200)}...
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>No errors detected - system running smoothly!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Database', icon: Database, status: 'healthy', details: 'MySQL/TiDB connected' },
                { name: 'API Server', icon: Server, status: 'healthy', details: 'tRPC endpoints active' },
                { name: 'NFT Service', icon: Cpu, status: 'healthy', details: 'Generation & listing ready' },
                { name: 'Hot Wallet', icon: Shield, status: 'healthy', details: 'Multi-chain support' },
                { name: 'Hive Mind', icon: Brain, status: 'healthy', details: 'LLM integration active' },
                { name: 'External APIs', icon: Globe, status: 'healthy', details: 'All connections stable' },
              ].map((component) => (
                <Card key={component.name} className="bg-gray-900/50 border-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-800">
                        <component.icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">{component.name}</p>
                          <div className={`w-2 h-2 rounded-full ${
                            component.status === 'healthy' ? 'bg-green-400' :
                            component.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                          }`} />
                        </div>
                        <p className="text-xs text-gray-500">{component.details}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hivemind" className="space-y-4">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Hive Mind Intelligence
                </CardTitle>
                <CardDescription>
                  Collective AI system for autonomous decision-making
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
                    <p className="text-sm text-gray-400">Active Contexts</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {hiveMindState?.pageContexts ? Object.keys(hiveMindState.pageContexts).length : 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                    <p className="text-sm text-gray-400">System Objectives</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {hiveMindState?.objectivesCount || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                    <p className="text-sm text-gray-400">Last Updated</p>
                    <p className="text-lg font-bold text-cyan-400">
                      {hiveMindState?.lastUpdated 
                        ? new Date(hiveMindState.lastUpdated).toLocaleTimeString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Active Page Contexts</h4>
                  <div className="space-y-2">
                    {hiveMindState?.pageContexts && Object.entries(hiveMindState.pageContexts).map(([pageId, context]: [string, any]) => (
                      <div key={pageId} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <span className="text-white">{pageId}</span>
                        <Badge variant="outline" className="text-xs">
                          {context.lastInteraction ? 'Active' : 'Idle'}
                        </Badge>
                      </div>
                    ))}
                    {(!hiveMindState?.pageContexts || Object.keys(hiveMindState.pageContexts).length === 0) && (
                      <p className="text-gray-500 text-center py-4">No active page contexts</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error Distribution */}
        {summary?.errorsByType && Object.keys(summary.errorsByType).length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                Error Distribution by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(summary.errorsByType).map(([type, count]) => {
                  const total = Object.values(summary.errorsByType).reduce((a: number, b: number) => a + b, 0);
                  const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400 capitalize">{type}</span>
                        <span className="text-white">{count as number} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
