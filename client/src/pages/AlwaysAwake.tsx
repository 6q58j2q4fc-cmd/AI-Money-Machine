import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { 
  Zap, 
  Power, 
  Activity, 
  Clock, 
  DollarSign, 
  Image, 
  TrendingUp, 
  RefreshCw,
  Play,
  Pause,
  Rocket,
  Brain,
  Coins,
  ShoppingCart,
  Globe,
  Timer
} from 'lucide-react';

export default function AlwaysAwake() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  // tRPC queries
  const statusQuery = trpc.alwaysAwake.getStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  const earningsQuery = trpc.alwaysAwake.getEarnings.useQuery(undefined, {
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // tRPC mutations
  const startMutation = trpc.alwaysAwake.start.useMutation({
    onSuccess: () => {
      toast.success('Always Awake system started! 🚀');
      statusQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to start: ${error.message}`);
    }
  });

  const stopMutation = trpc.alwaysAwake.stop.useMutation({
    onSuccess: () => {
      toast.info('Always Awake system stopped');
      statusQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to stop: ${error.message}`);
    }
  });

  const wakeUpMutation = trpc.alwaysAwake.wakeUp.useMutation({
    onSuccess: () => {
      toast.success('System woken up! ☀️');
      statusQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to wake up: ${error.message}`);
    }
  });

  const forceRunMutation = trpc.alwaysAwake.forceRunAll.useMutation({
    onSuccess: (result: any) => {
      toast.success(`Force run complete! Generated ${result.results?.nftsGenerated || 0} NFTs, synced ${result.results?.awinProgrammes || 0} Awin programmes`);
      statusQuery.refetch();
      earningsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Force run failed: ${error.message}`);
    }
  });

  useEffect(() => {
    if (statusQuery.data) {
      setIsRunning(statusQuery.data.isRunning);
      if (statusQuery.data.lastHeartbeat) {
        setLastHeartbeat(new Date(statusQuery.data.lastHeartbeat));
      }
    }
  }, [statusQuery.data]);

  const handleToggle = () => {
    if (isRunning) {
      stopMutation.mutate();
    } else {
      startMutation.mutate();
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const status = statusQuery.data as any;
  const earnings = earningsQuery.data as any;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              Always Awake Control Center
            </h1>
            <p className="text-muted-foreground mt-1">
              24/7 autonomous money-making machine
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge 
              variant={isRunning ? "default" : "secondary"}
              className={isRunning ? "bg-green-500 animate-pulse" : ""}
            >
              {isRunning ? "🟢 RUNNING" : "⚪ STOPPED"}
            </Badge>
            <Switch
              checked={isRunning}
              onCheckedChange={handleToggle}
              disabled={startMutation.isPending || stopMutation.isPending}
            />
          </div>
        </div>

        {/* Main Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Power className="h-5 w-5 text-yellow-500" />
                System Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => startMutation.mutate()}
                  disabled={isRunning || startMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start System
                </Button>
                <Button 
                  onClick={() => stopMutation.mutate()}
                  disabled={!isRunning || stopMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop System
                </Button>
                <Button 
                  onClick={() => wakeUpMutation.mutate()}
                  disabled={wakeUpMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${wakeUpMutation.isPending ? 'animate-spin' : ''}`} />
                  Wake Up
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-purple-500" />
                Force Run All
              </CardTitle>
              <CardDescription>
                Execute all operations immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => forceRunMutation.mutate()}
                disabled={forceRunMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {forceRunMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running All Operations...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Force Run Everything
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Generates NFTs, syncs Awin, scans crypto opportunities
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-blue-500" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Last Heartbeat</span>
                  <span className="text-muted-foreground">{formatTimeAgo(lastHeartbeat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Uptime</span>
                  <span className="text-muted-foreground">{status?.uptime || '0h 0m'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Operations Run</span>
                  <span className="text-muted-foreground">{status?.operationsRun || 0}</span>
                </div>
                <Progress value={isRunning ? 100 : 0} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduling Intervals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-500" />
              Automated Scheduling
            </CardTitle>
            <CardDescription>
              Operations run automatically at these intervals when the system is active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-red-500" />
                <div className="font-semibold">Heartbeat</div>
                <div className="text-sm text-muted-foreground">Every 1 min</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Brain className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <div className="font-semibold">Content Gen</div>
                <div className="text-sm text-muted-foreground">Every 15 min</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Image className="h-6 w-6 mx-auto mb-2 text-pink-500" />
                <div className="font-semibold">NFT Generation</div>
                <div className="text-sm text-muted-foreground">Every 1 hour</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Coins className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="font-semibold">Crypto Scan</div>
                <div className="text-sm text-muted-foreground">Every 10 min</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="font-semibold">Affiliate Sync</div>
                <div className="text-sm text-muted-foreground">Every 30 min</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Globe className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="font-semibold">Marketplace Sync</div>
                <div className="text-sm text-muted-foreground">Every 30 min</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <div className="font-semibold">Faucet Claims</div>
                <div className="text-sm text-muted-foreground">Every 1 hour</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
                <div className="font-semibold">Auto-Buyer Submit</div>
                <div className="text-sm text-muted-foreground">Every 24 hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Earnings Summary
            </CardTitle>
            <CardDescription>
              Total earnings from all automated operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30">
                <div className="text-2xl font-bold text-green-500">
                  ${earnings?.totalEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Total Earnings</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30">
                <div className="text-2xl font-bold text-blue-500">
                  ${earnings?.affiliateEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Affiliate</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/20 to-transparent border border-yellow-500/30">
                <div className="text-2xl font-bold text-yellow-500">
                  ${earnings?.cryptoEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Crypto</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/20 to-transparent border border-pink-500/30">
                <div className="text-2xl font-bold text-pink-500">
                  ${(earnings as any)?.nftEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">NFT Sales</div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30">
                <div className="text-2xl font-bold text-purple-500">
                  ${(earnings as any)?.dataEarnings?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Data Sales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(status as any)?.recentActivity?.length ? (
                (status as any).recentActivity.map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' : 
                        activity.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span>{activity.operation}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Start the system to begin generating income</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
