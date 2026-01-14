import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { 
  Bug, 
  Search, 
  Zap, 
  Shield, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileCode,
  Layout,
  GitBranch,
  Bot,
  Brain,
  Activity,
  Play,
  Pause,
  Eye,
  Wrench,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';

export default function DebugAdmin() {
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Queries
  const { data: summary, refetch: refetchSummary } = trpc.debugAdmin.getSummary.useQuery();
  const { data: bugs, refetch: refetchBugs } = trpc.debugAdmin.getAllBugs.useQuery();
  const { data: pageAudits, refetch: refetchPages } = trpc.debugAdmin.getPageAudits.useQuery();
  const { data: flowAudits, refetch: refetchFlows } = trpc.debugAdmin.getFlowAudits.useQuery();
  
  // Mutations
  const runCycleMutation = trpc.debugAdmin.runManualCycle.useMutation({
    onSuccess: (data) => {
      toast.success(`Debug cycle #${data.cycleNumber} complete in ${data.duration}ms`);
      refetchSummary();
      refetchBugs();
      refetchPages();
      refetchFlows();
    },
    onError: (error) => toast.error(`Debug cycle failed: ${error.message}`),
  });
  
  const scanCodeMutation = trpc.debugAdmin.scanCode.useMutation({
    onSuccess: (data) => {
      toast.success(`Scanned ${data.totalFiles} files, found ${data.totalBugs} issues`);
      refetchSummary();
      refetchBugs();
    },
    onError: (error) => toast.error(`Code scan failed: ${error.message}`),
  });
  
  const auditPagesMutation = trpc.debugAdmin.auditAllPages.useMutation({
    onSuccess: (data) => {
      toast.success(`Audited ${data.totalPages} pages: ${data.healthyPages} healthy, ${data.issuePages} with issues`);
      refetchPages();
    },
    onError: (error) => toast.error(`Page audit failed: ${error.message}`),
  });
  
  const auditFlowsMutation = trpc.debugAdmin.auditAllFlows.useMutation({
    onSuccess: (data) => {
      toast.success(`Tested ${data.length} process flows`);
      refetchFlows();
    },
    onError: (error) => toast.error(`Flow audit failed: ${error.message}`),
  });
  
  const autoFixMutation = trpc.debugAdmin.autoFix.useMutation({
    onSuccess: (data) => {
      toast.success(`Auto-fixed ${data.fixed} of ${data.attempted} issues`);
      refetchSummary();
      refetchBugs();
    },
    onError: (error) => toast.error(`Auto-fix failed: ${error.message}`),
  });
  
  const verifyMutation = trpc.debugAdmin.verifyWithHiveMind.useMutation({
    onSuccess: (data) => {
      toast.success('Hive Mind verification complete');
    },
    onError: (error) => toast.error(`Verification failed: ${error.message}`),
  });
  
  const toggleAutoDebugMutation = trpc.debugAdmin.toggleAutoDebug.useMutation({
    onSuccess: () => {
      refetchSummary();
      toast.success('Auto-debugging toggled');
    },
  });
  
  const handleRunCycle = async () => {
    setIsRunningCycle(true);
    try {
      await runCycleMutation.mutateAsync();
    } finally {
      setIsRunningCycle(false);
    }
  };
  
  const handleScanCode = async () => {
    setIsScanning(true);
    try {
      await scanCodeMutation.mutateAsync();
    } finally {
      setIsScanning(false);
    }
  };
  
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await verifyMutation.mutateAsync();
    } finally {
      setIsVerifying(false);
    }
  };
  
  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'text-red-500';
    if (severity >= 5) return 'text-orange-500';
    if (severity >= 3) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'issues':
      case 'warning':
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><AlertTriangle className="w-3 h-3 mr-1" />Issues</Badge>;
      case 'critical':
      case 'fail':
      case 'broken':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bug className="w-8 h-8 text-red-500" />
              Debug Admin Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive code analysis, bug detection, and automatic fixing
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={summary?.isAutoDebugging ? "default" : "outline"}
              onClick={() => toggleAutoDebugMutation.mutate({ enabled: !summary?.isAutoDebugging })}
            >
              {summary?.isAutoDebugging ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Auto-Debug: {summary?.isAutoDebugging ? 'ON' : 'OFF'}
            </Button>
            <Button onClick={handleRunCycle} disabled={isRunningCycle}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRunningCycle ? 'animate-spin' : ''}`} />
              {isRunningCycle ? 'Running...' : 'Run Full Cycle'}
            </Button>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bugs</p>
                  <p className="text-2xl font-bold text-red-400">{summary?.totalBugs || 0}</p>
                </div>
                <Bug className="w-8 h-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-orange-400">{summary?.criticalBugs || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Auto-Fixed</p>
                  <p className="text-2xl font-bold text-green-400">{summary?.autoFixedBugs || 0}</p>
                </div>
                <Wrench className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pages Audited</p>
                  <p className="text-2xl font-bold text-blue-400">{summary?.pagesAudited || 0}</p>
                </div>
                <Layout className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flows Tested</p>
                  <p className="text-2xl font-bold text-purple-400">{summary?.flowsTested || 0}</p>
                </div>
                <GitBranch className="w-8 h-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Debug Cycles</p>
                  <p className="text-2xl font-bold text-cyan-400">{summary?.debugCycleCount || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-cyan-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Run individual debugging operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleScanCode} disabled={isScanning}>
                <Search className={`w-4 h-4 mr-2 ${isScanning ? 'animate-pulse' : ''}`} />
                {isScanning ? 'Scanning...' : 'Scan All Code'}
              </Button>
              <Button variant="outline" onClick={() => auditPagesMutation.mutate()} disabled={auditPagesMutation.isPending}>
                <Layout className={`w-4 h-4 mr-2 ${auditPagesMutation.isPending ? 'animate-pulse' : ''}`} />
                {auditPagesMutation.isPending ? 'Auditing...' : 'Audit All Pages'}
              </Button>
              <Button variant="outline" onClick={() => auditFlowsMutation.mutate()} disabled={auditFlowsMutation.isPending}>
                <GitBranch className={`w-4 h-4 mr-2 ${auditFlowsMutation.isPending ? 'animate-pulse' : ''}`} />
                {auditFlowsMutation.isPending ? 'Testing...' : 'Test All Flows'}
              </Button>
              <Button variant="outline" onClick={() => autoFixMutation.mutate()} disabled={autoFixMutation.isPending}>
                <Wrench className={`w-4 h-4 mr-2 ${autoFixMutation.isPending ? 'animate-pulse' : ''}`} />
                {autoFixMutation.isPending ? 'Fixing...' : 'Auto-Fix Bugs'}
              </Button>
              <Button variant="outline" onClick={handleVerify} disabled={isVerifying} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                <Brain className={`w-4 h-4 mr-2 ${isVerifying ? 'animate-pulse' : ''}`} />
                {isVerifying ? 'Verifying...' : 'Verify with Hive Mind'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="bugs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bugs" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Bugs ({bugs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Pages ({pageAudits?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="flows" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Flows ({flowAudits?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="bots" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Bots
            </TabsTrigger>
          </TabsList>
          
          {/* Bugs Tab */}
          <TabsContent value="bugs">
            <Card>
              <CardHeader>
                <CardTitle>Bug Log</CardTitle>
                <CardDescription>All detected issues across the codebase</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Bug Categories */}
                {summary?.bugsByCategory && Object.keys(summary.bugsByCategory).length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {Object.entries(summary.bugsByCategory).map(([category, count]: [string, any]) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {bugs?.map((bug: any) => (
                      <div
                        key={bug.id}
                        className={`p-3 rounded-lg border ${
                          bug.autoFixed ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={bug.type === 'critical' ? 'destructive' : bug.type === 'error' ? 'destructive' : 'outline'}>
                                {bug.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{bug.category}</Badge>
                              <span className={`text-xs font-mono ${getSeverityColor(bug.severity)}`}>
                                Severity: {bug.severity}/10
                              </span>
                              {bug.autoFixed && (
                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />Auto-Fixed
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{bug.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <FileCode className="w-3 h-3 inline mr-1" />
                              {bug.file}:{bug.line}
                            </p>
                            {bug.codeSnippet && (
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded mt-1 block font-mono text-muted-foreground">
                                {bug.codeSnippet}
                              </code>
                            )}
                            <p className="text-xs text-blue-400 mt-1">
                              💡 {bug.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!bugs || bugs.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No bugs detected. Run a code scan to check.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pages Tab */}
          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <CardTitle>Page Audits</CardTitle>
                <CardDescription>Status of all pages, buttons, links, and forms</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {pageAudits?.map((audit: any) => (
                      <div key={audit.page} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Layout className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <h4 className="font-medium">{audit.page}</h4>
                              <p className="text-xs text-muted-foreground">{audit.path}</p>
                            </div>
                          </div>
                          {getStatusBadge(audit.status)}
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Buttons</p>
                            <p className="font-medium">
                              <span className="text-green-400">{audit.buttons.working}</span>
                              {audit.buttons.broken > 0 && (
                                <span className="text-red-400"> / {audit.buttons.broken} broken</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Links</p>
                            <p className="font-medium">
                              <span className="text-green-400">{audit.links.working}</span>
                              {audit.links.broken > 0 && (
                                <span className="text-red-400"> / {audit.links.broken} broken</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Forms</p>
                            <p className="font-medium text-green-400">{audit.forms.working}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">API Calls</p>
                            <p className="font-medium text-green-400">{audit.apiCalls.working}</p>
                          </div>
                        </div>
                        
                        {(audit.errors.length > 0 || audit.warnings.length > 0) && (
                          <div className="mt-3 space-y-1">
                            {audit.errors.map((err: string, i: number) => (
                              <p key={i} className="text-xs text-red-400">❌ {err}</p>
                            ))}
                            {audit.warnings.map((warn: string, i: number) => (
                              <p key={i} className="text-xs text-yellow-400">⚠️ {warn}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!pageAudits || pageAudits.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No pages audited yet. Click "Audit All Pages" to start.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Flows Tab */}
          <TabsContent value="flows">
            <Card>
              <CardHeader>
                <CardTitle>Process Flow Audits</CardTitle>
                <CardDescription>End-to-end testing of critical workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {flowAudits?.map((flow: any) => (
                      <div key={flow.flowName} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <GitBranch className="w-5 h-5 text-muted-foreground" />
                            <h4 className="font-medium">{flow.flowName}</h4>
                          </div>
                          {getStatusBadge(flow.overallStatus)}
                        </div>
                        
                        <div className="space-y-2">
                          {flow.steps.map((step: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              {step.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {step.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                              {step.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                              <span className="font-medium">{step.step}</span>
                              <span className="text-muted-foreground text-xs">— {step.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {(!flowAudits || flowAudits.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No flows tested yet. Click "Test All Flows" to start.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Bots Tab */}
          <TabsContent value="bots">
            <Card>
              <CardHeader>
                <CardTitle>Debugging Bots</CardTitle>
                <CardDescription>Automated systems monitoring and fixing issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-green-500/10 to-green-600/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Search className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Code Scanner Bot</h4>
                        <p className="text-xs text-green-400">Active</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scans all TypeScript files for bugs, security issues, and code smells.
                    </p>
                    <p className="text-xs mt-2">{summary?.totalBugs || 0} issues tracked</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Layout className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Page Auditor Bot</h4>
                        <p className="text-xs text-blue-400">Active</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Audits all pages for broken buttons, links, forms, and API calls.
                    </p>
                    <p className="text-xs mt-2">{summary?.pagesAudited || 0} pages audited</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Flow Tester Bot</h4>
                        <p className="text-xs text-purple-400">Active</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tests end-to-end process flows for NFTs, articles, and transactions.
                    </p>
                    <p className="text-xs mt-2">{summary?.flowsTested || 0} flows tested</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Auto-Fix Bot</h4>
                        <p className="text-xs text-yellow-400">Active</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically fixes low-severity bugs without manual intervention.
                    </p>
                    <p className="text-xs mt-2">{summary?.autoFixedBugs || 0} bugs auto-fixed</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Monitoring Bot</h4>
                        <p className="text-xs text-cyan-400">{summary?.isAutoDebugging ? 'Active' : 'Paused'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Continuous monitoring for new errors and system health.
                    </p>
                    <p className="text-xs mt-2">{summary?.debugCycleCount || 0} cycles completed</p>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gradient-to-br from-pink-500/10 to-pink-600/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-pink-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">Hive Mind Connector</h4>
                        <p className="text-xs text-pink-400">Active</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Coordinates with Hive Mind for collective intelligence debugging.
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={handleVerify}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Now'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Last Scan Info */}
        {summary?.lastFullScan && (
          <p className="text-xs text-muted-foreground text-center">
            Last full scan: {new Date(summary.lastFullScan).toLocaleString()}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
