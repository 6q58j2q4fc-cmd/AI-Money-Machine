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
import { 
  FileText, Link2, Send, Bot, Search, Clock, CheckCircle, XCircle, 
  Activity, TrendingUp, Zap, RefreshCw, Filter, Download, Brain,
  MessageSquare, Sparkles, AlertCircle, Play
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
  const [hiveMindResponse, setHiveMindResponse] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  
  const { data: logs, isLoading, refetch } = trpc.audit.list.useQuery({
    eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
    limit: 200,
  });
  
  const { data: stats } = trpc.audit.getStats.useQuery();
  const { data: hiveMindState } = trpc.hiveMind.getState.useQuery();
  
  const logEventMutation = trpc.hiveMind.logEvent.useMutation();
  const chatMutation = trpc.hiveMind.chat.useMutation();
  const syncAllMutation = trpc.hiveMind.syncAll.useMutation();
  
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
    try {
      const result = await chatMutation.mutateAsync({
        pageId: 'audit-log',
        query: hiveMindQuery,
        context: { logs: logs?.slice(0, 20), stats }
      });
      setHiveMindResponse(result.response);
      toast.success("Hive Mind responded");
    } catch (error) {
      toast.error("Failed to query Hive Mind");
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
            <Activity className="h-8 w-8 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete activity log with Hive Mind LLM integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncAll} disabled={syncAllMutation.isPending}>
            <Brain className="h-4 w-4 mr-2" />
            {syncAllMutation.isPending ? "Syncing..." : "Sync Hive Mind"}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Hive Mind Status */}
      <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Hive Mind Central Intelligence
          </CardTitle>
          <CardDescription>
            Central bot coordinating all LLMs with shared memory across pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-background/50 border">
              <div className="text-sm text-muted-foreground">Active Pages</div>
              <div className="text-2xl font-bold text-primary">
                {Object.keys(hiveMindState?.pageContexts || {}).length || 12}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border">
              <div className="text-sm text-muted-foreground">Memory Items</div>
              <div className="text-2xl font-bold text-green-500">
                {hiveMindState?.objectivesCount || 0}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border">
              <div className="text-sm text-muted-foreground">LLM Calls Today</div>
              <div className="text-2xl font-bold text-purple-500">
                {hiveMindState?.conversationCount || 0}
              </div>
            </div>
          </div>
          
          {/* Hive Mind Chat */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ask the Hive Mind about system activity, patterns, or recommendations..."
                value={hiveMindQuery}
                onChange={(e) => setHiveMindQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleHiveMindQuery()}
              />
              <Button onClick={handleHiveMindQuery} disabled={isQuerying}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {isQuerying ? "Thinking..." : "Ask"}
              </Button>
            </div>
            
            {hiveMindResponse && (
              <div className="p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Hive Mind Response
                </div>
                <p className="text-sm">{hiveMindResponse}</p>
              </div>
            )}
          </div>
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
      
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Events
            </CardTitle>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="article_created">Article Created</SelectItem>
                <SelectItem value="article_published">Article Published</SelectItem>
                <SelectItem value="distribution_queued">Distribution Queued</SelectItem>
                <SelectItem value="distribution_published">Distribution Published</SelectItem>
                <SelectItem value="affiliate_link_clicked">Affiliate Clicks</SelectItem>
                <SelectItem value="automation_cycle_completed">Automation Cycles</SelectItem>
                <SelectItem value="bot_decision">Bot Decisions</SelectItem>
                <SelectItem value="seo_indexed">SEO Indexed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>
      
      {/* Activity Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="bot">Bot AI</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                {filteredLogs?.length || 0} events found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="mt-1">
                          {eventTypeIcons[log.eventType] || <Activity className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={log.wasSuccessful ? "default" : "destructive"}>
                              {eventTypeLabels[log.eventType] || log.eventType}
                            </Badge>
                            {log.articleId && (
                              <Badge variant="outline">Article #{log.articleId}</Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">{log.action}</p>
                          {log.description && (
                            <p className="text-xs text-muted-foreground mt-1">{log.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Events Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Events will appear here as you use the system. Try running the Content Pipeline or Automation to generate events.
                  </p>
                  <Button variant="outline" onClick={handleSyncAll}>
                    <Play className="h-4 w-4 mr-2" />
                    Initialize Hive Mind
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
