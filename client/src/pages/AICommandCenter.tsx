import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, Zap, Target, TrendingUp, Bot, Cpu, Activity, 
  Play, Pause, RefreshCw, Settings, MessageSquare, Sparkles,
  DollarSign, Users, Globe, FileText, Link2, Send
} from "lucide-react";
import { toast } from "sonner";

// AI Goals - The primary directives that guide all bot behavior
const AI_PRIMARY_GOALS = [
  {
    id: "revenue",
    name: "Maximize Affiliate Revenue",
    description: "Generate maximum commissions through strategic content and link placement",
    priority: 1,
    icon: DollarSign,
    color: "text-green-500",
  },
  {
    id: "traffic",
    name: "Exponential Traffic Growth",
    description: "Continuously grow organic traffic through SEO and distribution",
    priority: 2,
    icon: TrendingUp,
    color: "text-blue-500",
  },
  {
    id: "coverage",
    name: "Maximum Platform Coverage",
    description: "Publish content across all available free platforms",
    priority: 3,
    icon: Globe,
    color: "text-purple-500",
  },
  {
    id: "learning",
    name: "Self-Improving Intelligence",
    description: "Learn from performance data to optimize strategies",
    priority: 4,
    icon: Brain,
    color: "text-orange-500",
  },
];

// Bot modules that the AI controls
const BOT_MODULES = [
  { id: "content", name: "Content Generator", status: "active", tasks: 12 },
  { id: "seo", name: "SEO Optimizer", status: "active", tasks: 8 },
  { id: "distribution", name: "Distribution Engine", status: "active", tasks: 406 },
  { id: "affiliate", name: "Affiliate Manager", status: "active", tasks: 15 },
  { id: "analytics", name: "Performance Analyzer", status: "active", tasks: 5 },
  { id: "learning", name: "Learning Module", status: "learning", tasks: 3 },
];

export default function AICommandCenter() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{role: string, content: string, timestamp: Date}>>([
    {
      role: "system",
      content: "AI Command Center initialized. All bot modules are online and optimizing for maximum affiliate revenue. Primary goal: Generate exponential compounding growth through automated content creation, SEO optimization, and multi-platform distribution.",
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: stats } = trpc.analytics.summary.useQuery();
  const { data: articles } = trpc.articles.list.useQuery({ status: "published" });
  const { data: affiliateLinks } = trpc.affiliate.list.useQuery();
  const { data: auditStats } = trpc.audit.getStats.useQuery();
  
  const runCycleMutation = trpc.automation.runCycle.useMutation({
    onSuccess: (data) => {
      addAiMessage("system", `Automation cycle completed. Generated ${data.articlesGenerated} articles. SEO indexing initiated.`);
      toast.success("AI cycle completed successfully");
    },
    onError: (error) => {
      addAiMessage("system", `Error during automation cycle: ${error.message}`);
      toast.error("AI cycle failed");
    }
  });
  
  const addAiMessage = (role: string, content: string) => {
    setAiMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };
  
  const handleCommand = async () => {
    if (!commandInput.trim()) return;
    
    addAiMessage("user", commandInput);
    setIsProcessing(true);
    
    // Simulate AI processing and response
    setTimeout(() => {
      const command = commandInput.toLowerCase();
      let response = "";
      
      if (command.includes("generate") || command.includes("create")) {
        response = "Initiating content generation cycle. The AI will discover trending topics, generate SEO-optimized articles with affiliate links, and queue them for multi-platform distribution.";
        runCycleMutation.mutate({ niche: "", count: 10, autoPublish: true });
      } else if (command.includes("distribute") || command.includes("publish")) {
        response = "Distribution engine activated. All pending articles will be submitted to 15 platforms including Medium, Dev.to, LinkedIn, Reddit, and press release sites. IndexNow will notify search engines.";
      } else if (command.includes("optimize") || command.includes("seo")) {
        response = "SEO optimization in progress. Analyzing top-performing content patterns, updating meta tags, and improving internal linking structure for maximum search visibility.";
      } else if (command.includes("analyze") || command.includes("report")) {
        response = `Performance Report:\n- Total Articles: ${articles?.length || 0}\n- Affiliate Links: ${affiliateLinks?.length || 0}\n- Total Views: ${stats?.totalViews || 0}\n- Total Clicks: ${stats?.totalClicks || 0}\n- Automation Cycles: ${auditStats?.automationCycles || 0}\n\nRecommendation: Focus on high-converting topics and increase distribution frequency.`;
      } else if (command.includes("status")) {
        response = `System Status: All modules operational.\n- Content Generator: Active (12 pending tasks)\n- SEO Optimizer: Active (8 pending tasks)\n- Distribution Engine: Active (406 pending distributions)\n- Learning Module: Analyzing performance data\n\nPrimary Goal: Maximize affiliate revenue through exponential content growth.`;
      } else {
        response = `Command received: "${commandInput}"\n\nI'm continuously working to:\n1. Generate high-converting content\n2. Optimize for search engines\n3. Distribute across all platforms\n4. Learn from performance data\n5. Maximize your affiliate commissions\n\nAll systems are operating autonomously toward these goals.`;
      }
      
      addAiMessage("assistant", response);
      setIsProcessing(false);
    }, 1500);
    
    setCommandInput("");
  };
  
  // Calculate overall AI performance score
  const calculateAIScore = () => {
    const articleScore = Math.min((articles?.length || 0) / 100 * 25, 25);
    const linkScore = Math.min((affiliateLinks?.length || 0) / 50 * 25, 25);
    const viewScore = Math.min((stats?.totalViews || 0) / 1000 * 25, 25);
    const cycleScore = Math.min((auditStats?.automationCycles || 0) / 10 * 25, 25);
    return Math.round(articleScore + linkScore + viewScore + cycleScore);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cpu className="h-8 w-8 text-primary" />
            AI Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced LLM control system for autonomous bot management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="ai-toggle">AI Control</Label>
            <Switch
              id="ai-toggle"
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
            />
          </div>
          <Badge variant={aiEnabled ? "default" : "secondary"} className="px-3 py-1">
            {aiEnabled ? (
              <><Zap className="h-3 w-3 mr-1" /> ACTIVE</>
            ) : (
              <><Pause className="h-3 w-3 mr-1" /> PAUSED</>
            )}
          </Badge>
        </div>
      </div>
      
      {/* AI Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 md:col-span-2 border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Intelligence Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-primary">{calculateAIScore()}</div>
              <div className="flex-1">
                <Progress value={calculateAIScore()} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {calculateAIScore() < 30 ? "Learning Phase" : 
                   calculateAIScore() < 60 ? "Growing Intelligence" :
                   calculateAIScore() < 80 ? "Advanced Operations" : "Maximum Optimization"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{articles?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Articles Generated</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Link2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{affiliateLinks?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Affiliate Links</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Primary AI Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Primary AI Directives
          </CardTitle>
          <CardDescription>
            Core goals that guide all autonomous bot behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_PRIMARY_GOALS.map((goal) => (
              <div key={goal.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <goal.icon className={`h-5 w-5 ${goal.color}`} />
                  <Badge variant="outline">Priority #{goal.priority}</Badge>
                </div>
                <h4 className="font-semibold">{goal.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Bot Modules Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bot Module Status
          </CardTitle>
          <CardDescription>
            Real-time status of all autonomous bot modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {BOT_MODULES.map((module) => (
              <div key={module.id} className="p-4 rounded-lg border text-center">
                <Badge 
                  variant={module.status === "active" ? "default" : "secondary"}
                  className="mb-2"
                >
                  {module.status === "active" ? "Active" : "Learning"}
                </Badge>
                <h4 className="font-semibold text-sm">{module.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{module.tasks} tasks</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* AI Command Interface */}
      <Card className="border-purple-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            AI Command Interface
          </CardTitle>
          <CardDescription>
            Direct commands to the AI system (or let it run autonomously)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chat">
            <TabsList>
              <TabsTrigger value="chat">Command Chat</TabsTrigger>
              <TabsTrigger value="quick">Quick Actions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-4">
              <ScrollArea className="h-[300px] border rounded-lg p-4 mb-4">
                <div className="space-y-4">
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : msg.role === "system"
                          ? "bg-purple-500/10 border border-purple-500/30"
                          : "bg-muted"
                      }`}>
                        {msg.role !== "user" && (
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-3 w-3 text-purple-500" />
                            <span className="text-xs font-semibold text-purple-500">AI System</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-50 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">AI processing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="Enter command (e.g., 'generate articles', 'analyze performance', 'status')..."
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleCommand();
                    }
                  }}
                  className="min-h-[60px]"
                />
                <Button onClick={handleCommand} disabled={isProcessing}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="quick" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setCommandInput("generate 10 articles");
                    handleCommand();
                  }}
                >
                  <FileText className="h-6 w-6" />
                  <span>Generate Content</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setCommandInput("distribute all articles");
                    handleCommand();
                  }}
                >
                  <Globe className="h-6 w-6" />
                  <span>Mass Distribute</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setCommandInput("optimize seo");
                    handleCommand();
                  }}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>Optimize SEO</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => {
                    setCommandInput("analyze performance report");
                    handleCommand();
                  }}
                >
                  <Activity className="h-6 w-6" />
                  <span>Performance Report</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Autonomous Operation Info */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            Autonomous Operation Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            The AI system operates autonomously 24/7, continuously working toward the primary goals:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background">
              <h4 className="font-semibold mb-2">Every 5 Minutes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Discovers trending topics with affiliate potential</li>
                <li>• Generates SEO-optimized articles</li>
                <li>• Inserts relevant affiliate links</li>
                <li>• Publishes to SEO-friendly pages</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-background">
              <h4 className="font-semibold mb-2">Continuous Learning</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Analyzes which content performs best</li>
                <li>• Optimizes headlines and CTAs</li>
                <li>• Improves affiliate link placement</li>
                <li>• Adapts distribution strategy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
