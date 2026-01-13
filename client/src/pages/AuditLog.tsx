import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { 
  FileText, Link2, Send, Bot, Search, Clock, CheckCircle, XCircle, 
  Activity, TrendingUp, Zap, RefreshCw, Filter, Download, Brain,
  MessageSquare, Sparkles, AlertCircle, Play, Power, PowerOff,
  Database, Eye, ShoppingBag, Settings, Loader2, Mic, MicOff, Volume2,
  Rocket, Target, DollarSign, Globe, Cpu
} from "lucide-react";

const eventTypeIcons: Record<string, React.ReactNode> = {
  article_created: <FileText className="h-4 w-4 text-blue-500" />,
  article_published: <CheckCircle className="h-4 w-4 text-green-500" />,
  article_updated: <FileText className="h-4 w-4 text-yellow-500" />,
  article_deleted: <XCircle className="h-4 w-4 text-red-500" />,
  distribution_queued: <Send className="h-4 w-4 text-blue-500" />,
  distribution_published: <CheckCircle className="h-4 w-4 text-green-500" />,
  distribution_failed: <XCircle className="h-4 w-4 text-red-500" />,
  affiliate_link_added: <Link2 className="h-4 w-4 text-purple-500" />,
  affiliate_link_clicked: <Link2 className="h-4 w-4 text-green-500" />,
  affiliate_conversion: <TrendingUp className="h-4 w-4 text-green-500" />,
  automation_cycle_started: <Zap className="h-4 w-4 text-yellow-500" />,
  automation_cycle_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  automation_cycle_failed: <XCircle className="h-4 w-4 text-red-500" />,
  topic_discovered: <Search className="h-4 w-4 text-blue-500" />,
  topic_saved: <CheckCircle className="h-4 w-4 text-green-500" />,
  bot_decision: <Bot className="h-4 w-4 text-purple-500" />,
  bot_learning: <Bot className="h-4 w-4 text-blue-500" />,
  bot_optimization: <Bot className="h-4 w-4 text-green-500" />,
  seo_indexed: <Search className="h-4 w-4 text-green-500" />,
  seo_ping_sent: <Send className="h-4 w-4 text-blue-500" />,
  user_action: <Activity className="h-4 w-4 text-gray-500" />,
  system_event: <Zap className="h-4 w-4 text-gray-500" />,
};

const eventTypeLabels: Record<string, string> = {
  article_created: "Article Created",
  article_published: "Article Published",
  article_updated: "Article Updated",
  article_deleted: "Article Deleted",
  distribution_queued: "Distribution Queued",
  distribution_published: "Distribution Published",
  distribution_failed: "Distribution Failed",
  affiliate_link_added: "Affiliate Link Added",
  affiliate_link_clicked: "Affiliate Click",
  affiliate_conversion: "Affiliate Conversion",
  automation_cycle_started: "Automation Started",
  automation_cycle_completed: "Automation Completed",
  automation_cycle_failed: "Automation Failed",
  topic_discovered: "Topic Discovered",
  topic_saved: "Topic Saved",
  bot_decision: "Bot Decision",
  bot_learning: "Bot Learning",
  bot_optimization: "Bot Optimization",
  seo_indexed: "SEO Indexed",
  seo_ping_sent: "SEO Ping Sent",
  user_action: "User Action",
  system_event: "System Event",
};

export default function AuditLog() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [hiveMindQuery, setHiveMindQuery] = useState("");
  const [hiveMindResponse, setHiveMindResponse] = useState<{
    response: string;
    dataUsed: string[];
    recommendations: string[];
    actions: string[];
  } | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  
  const { data: logs, isLoading, refetch } = trpc.audit.list.useQuery({
    eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
    limit: 200,
  });
  
  const { data: stats } = trpc.audit.getStats.useQuery();
  const { data: hiveMindState } = trpc.hiveMind.getState.useQuery();
  const { data: autonomousState, refetch: refetchAutonomous } = trpc.hiveMind.getAutonomousState.useQuery();
  const { data: fullSystemData } = trpc.hiveMind.getFullSystemData.useQuery();
  const { data: approvedVendors } = trpc.hiveMind.getApprovedVendors.useQuery();
  
  const logEventMutation = trpc.hiveMind.logEvent.useMutation();
  const askWithFullContextMutation = trpc.hiveMind.askWithFullContext.useMutation();
  const syncAllMutation = trpc.hiveMind.syncAll.useMutation();
  const syncCJVendorsMutation = trpc.hiveMind.syncCJVendors.useMutation();
  const startAutonomousMutation = trpc.hiveMind.startAutonomous.useMutation();
  const stopAutonomousMutation = trpc.hiveMind.stopAutonomous.useMutation();
  const autoWakeMutation = trpc.hiveMind.autoWake.useMutation();
  const runAllBotsMutation = trpc.hiveMind.runAllBots.useMutation();
  const startSchedulerMutation = trpc.hiveMind.startScheduler.useMutation();
  const stopSchedulerMutation = trpc.hiveMind.stopScheduler.useMutation();
  
  // Ultimate Hive Mind mutations
  const voiceCommandMutation = trpc.hiveMind.voiceCommand.useMutation();
  const globalAutoWakeMutation = trpc.hiveMind.globalAutoWake.useMutation();
  const runOptimizationMutation = trpc.hiveMind.runOptimization.useMutation();
  const { data: ultimateStatus, refetch: refetchUltimateStatus } = trpc.hiveMind.getUltimateStatus.useQuery();
  const { data: monetizationPlatforms } = trpc.hiveMind.getMonetizationPlatforms.useQuery();
  
  // Voice control state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState<{
    response: string;
    actionsExecuted: string[];
  } | null>(null);
  
  const { data: botStates, refetch: refetchBotStates } = trpc.hiveMind.getBotStates.useQuery();
  const { data: schedulerState, refetch: refetchScheduler } = trpc.hiveMind.getSchedulerState.useQuery();
  const { data: unifiedData, refetch: refetchUnifiedData } = trpc.hiveMind.getUnifiedData.useQuery();
  
  // Auto-log page visit
  useEffect(() => {
    logEventMutation.mutate({
      eventType: 'user_action',
      message: 'User visited Audit Log page',
      metadata: { page: 'audit-log', timestamp: new Date().toISOString() }
    });
  }, []);
  
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };
  
  const filteredLogs = logs?.filter(log => {
    if (activeTab === "all") return true;
    if (activeTab === "articles") return log.eventType.startsWith("article_");
    if (activeTab === "distribution") return log.eventType.startsWith("distribution_");
    if (activeTab === "affiliate") return log.eventType.startsWith("affiliate_");
    if (activeTab === "automation") return log.eventType.startsWith("automation_");
    if (activeTab === "bot") return log.eventType.startsWith("bot_");
    if (activeTab === "seo") return log.eventType.startsWith("seo_");
    return true;
  });
  
  const handleHiveMindQuery = async () => {
    if (!hiveMindQuery.trim()) return;
    
    setIsQuerying(true);
    setHiveMindResponse(null);
    try {
      const result = await askWithFullContextMutation.mutateAsync({
        question: hiveMindQuery,
      });
      setHiveMindResponse(result);
      toast.success("Hive Mind analyzed your question with full system data");
    } catch (error: any) {
      console.error('Hive Mind query error:', error);
      toast.error(`Failed to query Hive Mind: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsQuerying(false);
    }
  };
  
  const handleSyncAll = async () => {
    try {
      const result = await syncAllMutation.mutateAsync();
      toast.success(`Synced ${result.pagesUpdated} pages with Hive Mind`);
      refetch();
    } catch (error) {
      toast.error("Failed to sync pages");
    }
  };
  
  const handleSyncCJVendors = async () => {
    try {
      const result = await syncCJVendorsMutation.mutateAsync();
      if (result.success) {
        toast.success(`Synced ${result.vendorsFound} CJ vendors with ${result.linksFound} links`);
        if (result.newVendors.length > 0) {
          toast.info(`New vendors: ${result.newVendors.join(', ')}`);
        }
      } else {
        toast.error("CJ sync failed");
      }
      refetchAutonomous();
    } catch (error) {
      toast.error("Failed to sync CJ vendors");
    }
  };
  
  const handleStartAutonomous = async () => {
    try {
      const result = await startAutonomousMutation.mutateAsync();
      toast.success(result.message);
      refetchAutonomous();
    } catch (error) {
      toast.error("Failed to start autonomous operation");
    }
  };
  
  const handleStopAutonomous = async () => {
    try {
      const result = await stopAutonomousMutation.mutateAsync();
      toast.success(result.message);
      refetchAutonomous();
    } catch (error) {
      toast.error("Failed to stop autonomous operation");
    }
  };
  
  const handleAutoWake = async () => {
    try {
      const result = await autoWakeMutation.mutateAsync();
      if (result.success) {
        toast.success(`Auto-wake completed: ${result.operations.length} operations`);
      } else {
        toast.warning(`Auto-wake completed with errors: ${result.errors.join(', ')}`);
      }
      refetch();
      refetchAutonomous();
    } catch (error) {
      toast.error("Failed to auto-wake system");
    }
  };
  
  const handleRunAllBots = async () => {
    try {
      const result = await runAllBotsMutation.mutateAsync();
      if (result.success) {
        toast.success(`All bots completed: ${result.totalActions} total actions`);
      } else {
        toast.warning('Some bots encountered errors');
      }
      refetch();
      refetchBotStates();
      refetchUnifiedData();
    } catch (error) {
      toast.error('Failed to run all bots');
    }
  };
  
  const handleStartScheduler = async () => {
    try {
      const result = await startSchedulerMutation.mutateAsync();
      toast.success(result.message);
      refetchScheduler();
    } catch (error) {
      toast.error('Failed to start scheduler');
    }
  };
  
  const handleStopScheduler = async () => {
    try {
      const result = await stopSchedulerMutation.mutateAsync();
      toast.success(result.message);
      refetchScheduler();
    } catch (error) {
      toast.error('Failed to stop scheduler');
    }
  };
  
  // Voice control handlers
  const handleVoiceCommand = async (command: string) => {
    try {
      const result = await voiceCommandMutation.mutateAsync({ command });
      setVoiceResponse(result);
      toast.success(`Executed: ${result.actionsExecuted.join(', ')}`);
      refetch();
      refetchUltimateStatus();
      
      // Speak the response if speech synthesis is available
      if ('speechSynthesis' in window && result.audioResponse) {
        const utterance = new SpeechSynthesisUtterance(result.audioResponse);
        window.speechSynthesis.speak(utterance);
      }
    } catch (error: any) {
      toast.error(`Voice command failed: ${error?.message || 'Unknown error'}`);
    }
  };
  
  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceTranscript('');
    };
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setVoiceTranscript(transcript);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      if (voiceTranscript) {
        handleVoiceCommand(voiceTranscript);
      }
    };
    
    recognition.onerror = (event: any) => {
      setIsListening(false);
      toast.error(`Voice recognition error: ${event.error}`);
    };
    
    recognition.start();
  };
  
  const handleGlobalAutoWake = async () => {
    try {
      const result = await globalAutoWakeMutation.mutateAsync();
      if (result.success) {
        toast.success(`Global wake: ${result.pagesWoken.length} pages, ${result.decisionsLogged} decisions`);
        if (result.incomeOpportunities.length > 0) {
          toast.info(`Income opportunities: ${result.incomeOpportunities.slice(0, 2).join(', ')}`);
        }
      }
      refetch();
      refetchBotStates();
      refetchUltimateStatus();
    } catch (error: any) {
      toast.error(`Global wake failed: ${error?.message || 'Unknown error'}`);
    }
  };
  
  const handleRunOptimization = async () => {
    try {
      const result = await runOptimizationMutation.mutateAsync();
      toast.success(`Optimization: ${result.optimizationsApplied.length} applied, ${result.nextActions.length} next actions`);
      refetch();
      refetchUltimateStatus();
    } catch (error: any) {
      toast.error(`Optimization failed: ${error?.message || 'Unknown error'}`);
    }
  };
  
  const exportLogs = () => {
    if (!logs) return;
    const csv = [
      ["Timestamp", "Event Type", "Action", "Description", "Success", "Article ID", "Metadata"].join(","),
      ...logs.map(log => [
        formatDate(log.createdAt),
        log.eventType,
        log.action,
        log.description || "",
        log.wasSuccessful ? "Yes" : "No",
        log.articleId || "",
        JSON.stringify(log.metadata || {})
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Autonomous Hive Mind
          </h1>
          <p className="text-muted-foreground mt-1">
            Central AI with full system awareness - runs autonomously
          </p>
        </div>
        <div className="flex gap-2">
          {autonomousState?.isRunning ? (
            <Button variant="destructive" onClick={handleStopAutonomous} disabled={stopAutonomousMutation.isPending}>
              <PowerOff className="h-4 w-4 mr-2" />
              {stopAutonomousMutation.isPending ? "Stopping..." : "Stop Autonomous"}
            </Button>
          ) : (
            <Button variant="default" onClick={handleStartAutonomous} disabled={startAutonomousMutation.isPending}>
              <Power className="h-4 w-4 mr-2" />
              {startAutonomousMutation.isPending ? "Starting..." : "Start Autonomous"}
            </Button>
          )}
          <Button variant="outline" onClick={handleAutoWake} disabled={autoWakeMutation.isPending}>
            <Zap className="h-4 w-4 mr-2" />
            {autoWakeMutation.isPending ? "Waking..." : "Auto-Wake"}
          </Button>
          <Button variant="secondary" onClick={handleRunAllBots} disabled={runAllBotsMutation.isPending}>
            <Bot className="h-4 w-4 mr-2" />
            {runAllBotsMutation.isPending ? "Running..." : "Run All Bots"}
          </Button>
          <Button variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500" onClick={handleGlobalAutoWake} disabled={globalAutoWakeMutation.isPending}>
            <Globe className="h-4 w-4 mr-2" />
            {globalAutoWakeMutation.isPending ? "Waking All..." : "Global Wake"}
          </Button>
          <Button variant="outline" onClick={handleRunOptimization} disabled={runOptimizationMutation.isPending}>
            <Target className="h-4 w-4 mr-2" />
            {runOptimizationMutation.isPending ? "Optimizing..." : "Optimize"}
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Autonomous Status Banner */}
      <Card className={`border-2 ${autonomousState?.isRunning ? 'border-green-500 bg-green-500/5' : 'border-yellow-500 bg-yellow-500/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${autonomousState?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <div>
                <div className="font-semibold">
                  {autonomousState?.isRunning ? 'Autonomous Mode Active' : 'Autonomous Mode Inactive'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last wake: {autonomousState?.lastWakeTime ? formatDate(autonomousState.lastWakeTime) : 'Never'}
                  {' | '}
                  CJ Sync: {autonomousState?.lastCJSync ? formatDate(autonomousState.lastCJSync) : 'Never'}
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-primary">{autonomousState?.approvedVendorsCount || 0}</div>
                <div className="text-muted-foreground">CJ Vendors</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-green-500">{fullSystemData?.articles?.stats?.published || 0}</div>
                <div className="text-muted-foreground">Published</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-blue-500">{fullSystemData?.distribution?.stats?.published || 0}</div>
                <div className="text-muted-foreground">Distributed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bot Status Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                Bot Network Status
              </CardTitle>
              <CardDescription>
                All bots communicate through the Hive Mind for coordinated operation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {schedulerState?.isRunning ? (
                <Button variant="destructive" size="sm" onClick={handleStopScheduler} disabled={stopSchedulerMutation.isPending}>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Stop Scheduler
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleStartScheduler} disabled={startSchedulerMutation.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Scheduler
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {botStates?.map((bot) => (
              <div key={bot.type} className={`p-3 rounded-lg border ${bot.isActive ? 'bg-green-500/5 border-green-500/30' : 'bg-gray-500/5 border-gray-500/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${bot.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm font-medium capitalize">{bot.type.replace('_', ' ')}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Tasks: {bot.completedTasks}</div>
                  <div>Errors: {bot.errors}</div>
                </div>
              </div>
            ))}
          </div>
          {schedulerState && (
            <div className="mt-4 p-3 rounded-lg bg-background/50 border">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Scheduler: {schedulerState.isRunning ? 'Running' : 'Stopped'}</span>
                </div>
                <div className="text-muted-foreground">
                  Cycles: {schedulerState.cycleCount} | 
                  Wake interval: {schedulerState.autoWakeIntervalMs / 60000}min | 
                  CJ sync: {schedulerState.cjSyncIntervalMs / 60000}min
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Voice Control Interface */}
      <Card className="border-purple-500/50 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-purple-500" />
            Voice Control - Talk to the Hive Mind
          </CardTitle>
          <CardDescription>
            Speak commands to control the system. Say "run all bots", "sync CJ vendors", "generate articles", etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <Button 
                variant={isListening ? "destructive" : "default"}
                size="lg"
                className="w-40"
                onClick={startVoiceRecognition}
                disabled={voiceCommandMutation.isPending}
              >
                {isListening ? (
                  <><MicOff className="h-5 w-5 mr-2" /> Listening...</>
                ) : voiceCommandMutation.isPending ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Mic className="h-5 w-5 mr-2" /> Start Voice</>
                )}
              </Button>
              <div className="flex-1">
                <Input
                  placeholder="Or type a command here..."
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && voiceTranscript && handleVoiceCommand(voiceTranscript)}
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => voiceTranscript && handleVoiceCommand(voiceTranscript)}
                disabled={!voiceTranscript || voiceCommandMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {voiceResponse && (
              <div className="p-4 rounded-lg bg-background/50 border border-purple-500/30">
                <div className="font-medium mb-2">Hive Mind Response:</div>
                <p className="text-muted-foreground">{voiceResponse.response}</p>
                {voiceResponse.actionsExecuted.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-muted-foreground">Actions executed: </span>
                    {voiceResponse.actionsExecuted.map((action, i) => (
                      <Badge key={i} variant="secondary" className="mr-1">{action}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Quick Voice Commands */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleVoiceCommand('run all bots')}>
                <Bot className="h-3 w-3 mr-1" /> Run All Bots
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleVoiceCommand('sync cj vendors')}>
                <RefreshCw className="h-3 w-3 mr-1" /> Sync CJ
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleVoiceCommand('check performance')}>
                <TrendingUp className="h-3 w-3 mr-1" /> Check Performance
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleVoiceCommand('find new income')}>
                <DollarSign className="h-3 w-3 mr-1" /> Find Income
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleVoiceCommand('auto wake')}>
                <Zap className="h-3 w-3 mr-1" /> Auto Wake
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Ultimate Hive Mind Status */}
      {ultimateStatus && (
        <Card className="border-green-500/50 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-green-500" />
              Ultimate Hive Mind Status
            </CardTitle>
            <CardDescription>
              Single purpose: {ultimateStatus.primaryGoal}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground">Owner</div>
                <div className="font-bold">{ultimateStatus.owner}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground">Active Bots</div>
                <div className="font-bold text-green-500">{ultimateStatus.activeBots}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground">Total Decisions</div>
                <div className="font-bold text-purple-500">{ultimateStatus.totalDecisions}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground">Pages Managed</div>
                <div className="font-bold">{ultimateStatus.pagesManaged}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground">Last Wake</div>
                <div className="font-bold text-xs">{ultimateStatus.lastWake ? formatDate(ultimateStatus.lastWake) : 'Never'}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="text-sm text-muted-foreground">Autonomous</div>
                <div className={`font-bold ${ultimateStatus.autonomousMode ? 'text-green-500' : 'text-yellow-500'}`}>
                  {ultimateStatus.autonomousMode ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
            {ultimateStatus.incomeStreams.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-2">Active Income Streams:</div>
                <div className="flex flex-wrap gap-2">
                  {ultimateStatus.incomeStreams.map((stream, i) => (
                    <Badge key={i} variant="secondary">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {stream}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Monetization Platforms */}
      {monetizationPlatforms && monetizationPlatforms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              Available Monetization Platforms
            </CardTitle>
            <CardDescription>
              Platforms the Hive Mind can auto-integrate for additional revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {monetizationPlatforms.map((platform) => (
                <div key={platform.platform} className="p-3 rounded-lg bg-background/50 border hover:border-primary/50 transition-colors">
                  <div className="font-medium text-sm">{platform.platform}</div>
                  <div className="text-xs text-muted-foreground capitalize">{platform.revenueType.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Hive Mind Query Interface */}
      <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Ask the Hive Mind (Full System Awareness)
          </CardTitle>
          <CardDescription>
            Query the AI with complete access to all system data: articles, affiliate links, distributions, analytics, CJ vendors, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Articles
                </div>
                <div className="text-xl font-bold">{fullSystemData?.articles?.stats?.total || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  Affiliate Links
                </div>
                <div className="text-xl font-bold">{fullSystemData?.affiliateLinks?.stats?.total || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Send className="h-4 w-4" />
                  Distributions
                </div>
                <div className="text-xl font-bold">{fullSystemData?.distribution?.stats?.total || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Total Views
                </div>
                <div className="text-xl font-bold">{fullSystemData?.analytics?.totalViews || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingBag className="h-4 w-4" />
                  CJ Vendors
                </div>
                <div className="text-xl font-bold">{approvedVendors?.length || 0}</div>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Events
                </div>
                <div className="text-xl font-bold">{stats?.totalEvents || 0}</div>
              </div>
            </div>
            
            {/* Query Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask anything about your system: performance, articles, affiliate links, CJ vendors, recommendations..."
                value={hiveMindQuery}
                onChange={(e) => setHiveMindQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleHiveMindQuery()}
                className="flex-1"
              />
              <Button onClick={handleHiveMindQuery} disabled={isQuerying}>
                {isQuerying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                {isQuerying ? "Analyzing..." : "Ask"}
              </Button>
            </div>
            
            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setHiveMindQuery("What are my top performing articles and why?");
                }}
              >
                Top performing articles
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setHiveMindQuery("Which CJ affiliate links should I focus on for more revenue?");
                }}
              >
                Best CJ links
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setHiveMindQuery("How can I improve my content distribution strategy?");
                }}
              >
                Distribution strategy
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setHiveMindQuery("Give me a complete system health report with recommendations");
                }}
              >
                System health report
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setHiveMindQuery("What new articles should I create based on trending topics and available CJ vendors?");
                }}
              >
                Content recommendations
              </Badge>
            </div>
            
            {/* Response */}
            {hiveMindResponse && (
              <div className="space-y-4 p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Hive Mind Response (using data from: {hiveMindResponse.dataUsed.join(', ')})
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Streamdown>{hiveMindResponse.response}</Streamdown>
                </div>
                
                {hiveMindResponse.recommendations.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Recommendations
                    </div>
                    <ul className="text-sm space-y-1">
                      {hiveMindResponse.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {hiveMindResponse.actions.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      Suggested Actions
                    </div>
                    <ul className="text-sm space-y-1">
                      {hiveMindResponse.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Play className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* CJ Vendor Sync */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-500" />
                CJ Affiliate Vendors
              </CardTitle>
              <CardDescription>
                Approved vendors with active affiliate links
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleSyncCJVendors} disabled={syncCJVendorsMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncCJVendorsMutation.isPending ? 'animate-spin' : ''}`} />
              {syncCJVendorsMutation.isPending ? "Syncing..." : "Sync CJ Vendors"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {approvedVendors && approvedVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {approvedVendors.slice(0, 9).map((vendor, i) => (
                <div key={i} className="p-3 rounded-lg border bg-background/50">
                  <div className="font-medium truncate">{vendor.advertiserName}</div>
                  <div className="text-sm text-muted-foreground">{vendor.category}</div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">{vendor.links.length} links</Badge>
                    <span className="text-sm text-green-500">EPC: ${vendor.epc}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No CJ vendors synced yet</p>
              <p className="text-sm">Click "Sync CJ Vendors" to fetch approved affiliate programs</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats?.totalEvents || 0}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats?.articlesCreated || 0}</div>
            <div className="text-xs text-muted-foreground">Articles Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats?.articlesPublished || 0}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{stats?.distributionsQueued || 0}</div>
            <div className="text-xs text-muted-foreground">Distributions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats?.distributionsPublished || 0}</div>
            <div className="text-xs text-muted-foreground">Dist. Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats?.affiliateClicks || 0}</div>
            <div className="text-xs text-muted-foreground">Affiliate Clicks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats?.automationCycles || 0}</div>
            <div className="text-xs text-muted-foreground">Auto Cycles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{stats?.botDecisions || 0}</div>
            <div className="text-xs text-muted-foreground">Bot Decisions</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                {filteredLogs?.length || 0} events found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncAllMutation.isPending}>
                <Brain className="h-4 w-4 mr-2" />
                {syncAllMutation.isPending ? "Syncing..." : "Sync Hive Mind"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="bot">Bot AI</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <div className="mt-1">
                        {eventTypeIcons[log.eventType] || <Activity className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {eventTypeLabels[log.eventType] || log.eventType}
                          </Badge>
                          {log.wasSuccessful ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm mt-1">{log.action}</div>
                        {log.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {log.description}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No events found</p>
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
