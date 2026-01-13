import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Brain, Mic, MicOff, Send, Bot, Zap, Globe, DollarSign, 
  Activity, RefreshCw, Play, Pause, Settings, Target,
  TrendingUp, Eye, Link2, FileText, BarChart3, Cpu,
  Sparkles, Volume2, VolumeX, CheckCircle2, AlertCircle,
  Clock, Users, Database, Shield, Rocket, Crown
} from "lucide-react";

export default function HiveMindCenter() {
  const [command, setCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [conversation, setConversation] = useState<Array<{role: string, content: string, timestamp: Date}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Queries
  const { data: systemData, refetch: refetchSystem } = trpc.hiveMind.getState.useQuery();
  const { data: botStates } = trpc.hiveMind.getBotStates.useQuery();
  const { data: schedulerStatus, refetch: refetchScheduler } = trpc.hiveMind.getSchedulerState.useQuery();
  // Income streams tracked locally
  const { data: articleStats } = trpc.articles.list.useQuery({});
  const { data: affiliateLinkStats } = trpc.affiliate.list.useQuery();
  const { data: distributionStats } = trpc.distribution.stats.useQuery();
  const { data: cjSettings } = trpc.cj.getSettings.useQuery();
  const { data: botStats } = trpc.bot.stats.useQuery();

  // Mutations
  const askHiveMind = trpc.hiveMind.askWithFullContext.useMutation();
  const runAllBots = trpc.hiveMind.runAllBots.useMutation();
  const startAutonomous = trpc.hiveMind.startAutonomous.useMutation();
  const stopAutonomous = trpc.hiveMind.stopAutonomous.useMutation();
  const startScheduler = trpc.hiveMind.startScheduler.useMutation();
  const stopScheduler = trpc.hiveMind.stopScheduler.useMutation();
  const syncCJ = trpc.hiveMind.syncCJVendors.useMutation();
  const globalAutoWake = trpc.hiveMind.globalAutoWake.useMutation();
  const discoverIncome = trpc.hiveMind.discoverNewOpportunities.useMutation();
  const optimizeSystem = trpc.hiveMind.runOptimizationCycle.useMutation();

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCommand(transcript);
        handleSendCommand(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Voice recognition error. Please try again.");
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      toast.info("Listening... Speak your command");
    }
  };

  const speakResponse = (text: string) => {
    if (isSpeaking && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendCommand = async (cmd?: string) => {
    const commandText = cmd || command;
    if (!commandText.trim()) return;

    setConversation(prev => [...prev, { role: 'user', content: commandText, timestamp: new Date() }]);
    setCommand("");
    setIsProcessing(true);

    try {
      const response = await askHiveMind.mutateAsync({ question: commandText });
      const aiResponse = response.response;
      setConversation(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date() }]);
      speakResponse(aiResponse.substring(0, 500)); // Speak first 500 chars
      refetchSystem();
    } catch (error) {
      const errorMsg = "I encountered an error processing your command. Please try again.";
      setConversation(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    toast.info(`Executing: ${action}`);
    try {
      switch (action) {
        case 'run-bots':
          await runAllBots.mutateAsync();
          toast.success("All bots executed successfully");
          break;
        case 'start-autonomous':
          await startAutonomous.mutateAsync();
          toast.success("Autonomous mode activated");
          break;
        case 'stop-autonomous':
          await stopAutonomous.mutateAsync();
          toast.success("Autonomous mode deactivated");
          break;
        case 'start-scheduler':
          await startScheduler.mutateAsync();
          toast.success("Scheduler started");
          break;
        case 'stop-scheduler':
          await stopScheduler.mutateAsync();
          toast.success("Scheduler stopped");
          break;
        case 'sync-cj':
          await syncCJ.mutateAsync();
          toast.success("CJ vendors synced");
          break;
        case 'auto-wake':
          await globalAutoWake.mutateAsync();
          toast.success("Global auto-wake executed");
          break;
        case 'discover-income':
          await discoverIncome.mutateAsync();
          toast.success("Income discovery completed");
          break;
        case 'optimize':
          await optimizeSystem.mutateAsync();
          toast.success("System optimization completed");
          break;
      }
      refetchSystem();
      refetchScheduler();
    } catch (error) {
      toast.error(`Failed to execute: ${action}`);
    }
  };

  const [isAutonomousActive, setIsAutonomousActive] = useState(false);
  const isSchedulerRunning = schedulerStatus?.isRunning || false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              Hive Mind Command Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Central intelligence hub for autonomous income generation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAutonomousActive ? "default" : "secondary"} className="text-sm py-1 px-3">
              {isAutonomousActive ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <AlertCircle className="h-4 w-4 mr-1" />}
              {isAutonomousActive ? "AUTONOMOUS ACTIVE" : "MANUAL MODE"}
            </Badge>
            <Badge variant={isSchedulerRunning ? "default" : "outline"} className="text-sm py-1 px-3">
              <Clock className="h-4 w-4 mr-1" />
              Scheduler: {isSchedulerRunning ? "Running" : "Stopped"}
            </Badge>
          </div>
        </div>

        {/* Owner & Purpose Banner */}
        <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Owner: Dakota Rea</h2>
                  <p className="text-purple-200">PayPal: dakotarea@icloud.com</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-200">PRIMARY OBJECTIVE</p>
                <p className="text-lg font-bold text-white">Maximize Income Through All Available Channels</p>
                <p className="text-sm text-purple-300">Affiliate Commissions • Ad Revenue • Sponsored Content • Any Free Money</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Command Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voice/Text Command */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Command the Hive Mind
                </CardTitle>
                <CardDescription>
                  Speak or type commands to control the entire system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Conversation History */}
                <div className="h-64 overflow-y-auto bg-muted/30 rounded-lg p-4 space-y-3">
                  {conversation.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Start a conversation with the Hive Mind</p>
                      <p className="text-sm">Try: "What's our current income status?" or "Find new money-making opportunities"</p>
                    </div>
                  )}
                  {conversation.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Processing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={conversationEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex gap-2">
                  <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleListening}
                    className="shrink-0"
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSpeaking(!isSpeaking)}
                    className="shrink-0"
                  >
                    {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  <Input
                    placeholder="Type a command or question..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                    disabled={isProcessing}
                  />
                  <Button onClick={() => handleSendCommand()} disabled={isProcessing || !command.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quick Commands */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCommand("What's our current income status?")}>
                    💰 Income Status
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCommand("Find new money-making opportunities")}>
                    🔍 Find Opportunities
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCommand("Optimize all articles for maximum clicks")}>
                    📈 Optimize Content
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCommand("What platforms should we post to next?")}>
                    🌐 Platform Suggestions
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCommand("Generate a full system report")}>
                    📊 System Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant={isAutonomousActive ? "destructive" : "default"}
                    onClick={() => handleQuickAction(isAutonomousActive ? 'stop-autonomous' : 'start-autonomous')}
                  >
                    {isAutonomousActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    <span>{isAutonomousActive ? "Stop Autonomous" : "Start Autonomous"}</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant={isSchedulerRunning ? "destructive" : "outline"}
                    onClick={() => handleQuickAction(isSchedulerRunning ? 'stop-scheduler' : 'start-scheduler')}
                  >
                    <Clock className="h-5 w-5" />
                    <span>{isSchedulerRunning ? "Stop Scheduler" : "Start Scheduler"}</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => handleQuickAction('run-bots')}
                  >
                    <Bot className="h-5 w-5" />
                    <span>Run All Bots</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => handleQuickAction('sync-cj')}
                  >
                    <Link2 className="h-5 w-5" />
                    <span>Sync CJ Links</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => handleQuickAction('discover-income')}
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>Find Income</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => handleQuickAction('optimize')}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span>Optimize System</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => handleQuickAction('auto-wake')}
                  >
                    <Rocket className="h-5 w-5" />
                    <span>Global Auto-Wake</span>
                  </Button>
                  <Button 
                    className="h-auto py-4 flex flex-col gap-2"
                    variant="outline"
                    onClick={() => refetchSystem()}
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span>Refresh Status</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Status */}
          <div className="space-y-6">
            {/* System Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <FileText className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold">{articleStats?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Articles</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Link2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    <p className="text-2xl font-bold">{affiliateLinkStats?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Affiliate Links</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Globe className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-2xl font-bold">{distributionStats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Distributions</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Eye className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                    <p className="text-2xl font-bold">{distributionStats?.published || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CJ Vendors</span>
                    <span className="font-medium">{cjSettings?.cid ? '71' : '0'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bot Decisions</span>
                    <span className="font-medium">{botStats?.totalDecisions || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Auto Cycles</span>
                    <span className="font-medium">{schedulerStatus?.cycleCount || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bot Network */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-500" />
                  Bot Network
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {botStates?.map((bot: any) => (
                  <div key={bot.name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${bot.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="text-sm">{bot.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {bot.tasks || 0} tasks
                    </Badge>
                  </div>
                )) || (
                  <>
                    {['Content Bot', 'SEO Bot', 'Distribution Bot', 'Affiliate Bot', 'Analytics Bot', 'Learning Bot'].map(name => (
                      <div key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm">{name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Income Streams */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Income Streams
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-green-500/10 rounded border border-green-500/30">
                    <span className="text-sm">Commission Junction</span>
                    <Badge className="bg-green-500">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">ShareASale</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">Amazon Associates</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">ClickBank</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">AdSense</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-2" size="sm">
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect More Networks
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
