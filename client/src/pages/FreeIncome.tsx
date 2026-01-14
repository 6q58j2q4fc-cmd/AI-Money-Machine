import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  DollarSign, 
  Gift, 
  Coins, 
  TrendingUp, 
  ExternalLink, 
  RefreshCw,
  Zap,
  Star,
  Clock,
  CheckCircle,
  Wallet,
  Bitcoin,
  Sparkles,
  Play,
  Square,
  ArrowUpRight,
  Copy,
  Activity,
  Bot,
  Terminal,
  AlertCircle,
  Trash2,
  Power
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Wallet addresses
const TRUST_WALLET_ADDRESS = '0x75812e1c4246A880f6576db8292405247e6a8775';

export default function FreeIncome() {
  const [activeTab, setActiveTab] = useState("faucets");
  const [withdrawDestination, setWithdrawDestination] = useState<'trust' | 'hot'>('hot');
  const [showAutomationLogs, setShowAutomationLogs] = useState(false);
  
  // Get hot wallet status
  const { data: hotWalletStatus } = trpc.hotWallet.getStatus.useQuery();
  
  // tRPC queries and mutations
  const { data: claimStatus, refetch: refetchStatus } = trpc.autoClaims.getStatus.useQuery();
  const { data: earnings, refetch: refetchEarnings } = trpc.autoClaims.getEarnings.useQuery();
  const { data: sourcesData } = trpc.autoClaims.getSources.useQuery();
  const { data: nftPortfolio } = trpc.nftEmpire.getPortfolio.useQuery();
  
  const startAllMutation = trpc.autoClaims.startAll.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
      refetchEarnings();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const stopAllMutation = trpc.autoClaims.stopAll.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchStatus();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const forceRunMutation = trpc.autoClaims.forceRun.useMutation({
    onSuccess: (data) => {
      toast.success(`Processed ${data.claimsProcessed} claims, earned $${data.totalEarned.toFixed(4)}`);
      refetchStatus();
      refetchEarnings();
    },
    onError: (error) => toast.error(error.message),
  });

  // Browser automation queries and mutations
  const { data: automationStatus, refetch: refetchAutomation } = trpc.autoClaims.getAutomationStatus.useQuery(undefined, {
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  const performRealClaimMutation = trpc.autoClaims.performRealClaim.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Real claim successful: ${data.message}`);
      } else {
        toast.warning(`Claim attempt: ${data.message}`);
      }
      refetchAutomation();
      refetchEarnings();
    },
    onError: (error) => toast.error(error.message),
  });

  const runAllRealClaimsMutation = trpc.autoClaims.runAllRealClaims.useMutation({
    onSuccess: (data) => {
      toast.success(`Completed ${data.successful}/${data.totalAttempted} real browser claims`);
      refetchAutomation();
      refetchEarnings();
    },
    onError: (error) => toast.error(error.message),
  });

  const clearLogsMutation = trpc.autoClaims.clearAutomationLogs.useMutation({
    onSuccess: () => {
      toast.success('Automation logs cleared');
      refetchAutomation();
    },
  });

  const closeBrowserMutation = trpc.autoClaims.closeBrowser.useMutation({
    onSuccess: () => {
      toast.success('Browser instance closed');
      refetchAutomation();
    },
  });
  
  const withdrawMutation = trpc.autoClaims.withdraw.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchEarnings();
    },
    onError: (error) => toast.error(error.message),
  });

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(TRUST_WALLET_ADDRESS);
    toast.success('Wallet address copied to clipboard');
  };

  const handleWithdraw = () => {
    const totalETH = earnings?.totalETH || 0;
    if (totalETH < 0.001) {
      toast.error('Minimum withdrawal is 0.001 ETH');
      return;
    }
    const destination = withdrawDestination === 'hot' 
      ? (hotWalletStatus?.address || TRUST_WALLET_ADDRESS)
      : TRUST_WALLET_ADDRESS;
    withdrawMutation.mutate({ 
      amount: totalETH, 
      currency: 'ETH',
      destination: destination
    });
  };

  const copyHotWalletAddress = () => {
    if (hotWalletStatus?.address) {
      navigator.clipboard.writeText(hotWalletStatus.address);
      toast.success('Hot Wallet address copied to clipboard');
    }
  };

  const renderOpportunityCard = (opp: any, index: number) => (
    <Card key={index} className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-white">{opp.name}</h4>
              {opp.autoClaimInterval && (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400 mb-2">{opp.reward}</p>
            <Badge variant="outline" className="text-xs">{opp.currency}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(opp.url, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
            {opp.enabled && (
              <Badge className="bg-green-500/20 text-green-400 text-xs justify-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const sources = sourcesData?.sources;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              Free Income Discovery
            </h1>
            <p className="text-zinc-400 mt-1">
              Automatic ways to earn crypto and cash - all free, all legitimate
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => forceRunMutation.mutate()}
              disabled={forceRunMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${forceRunMutation.isPending ? 'animate-spin' : ''}`} />
              Force Claim All
            </Button>
            {claimStatus?.active ? (
              <Button 
                variant="destructive"
                onClick={() => stopAllMutation.mutate()}
                disabled={stopAllMutation.isPending}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Auto-Claims
              </Button>
            ) : (
              <Button 
                className="bg-green-500 hover:bg-green-600"
                onClick={() => startAllMutation.mutate()}
                disabled={startAllMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Start All Auto-Claims
              </Button>
            )}
          </div>
        </div>

        {/* Auto-Claim Status Banner */}
        <Card className={`border-2 ${claimStatus?.active ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 bg-zinc-900/50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${claimStatus?.active ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
                <div>
                  <p className="font-semibold text-white">
                    {claimStatus?.active ? 'Auto-Claims Running 24/7' : 'Auto-Claims Stopped'}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {claimStatus?.activeSources || 0} sources active • {claimStatus?.totalClaims || 0} total claims • {(claimStatus?.successRate || 0).toFixed(1)}% success rate
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Est. Hourly Earnings</p>
                <p className="text-xl font-bold text-green-400">${(claimStatus?.estimatedHourlyEarnings || 0).toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Total Earned</p>
                  <p className="text-2xl font-bold text-white">${(earnings?.totalUSD || 0).toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">{(earnings?.totalETH || 0).toFixed(6)} ETH</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-400">Today</p>
                  <p className="text-2xl font-bold text-white">${(earnings?.todayUSD || 0).toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">NFT Portfolio</p>
                  <p className="text-2xl font-bold text-white">{(nftPortfolio?.totalValue || 0).toFixed(4)} ETH</p>
                  <p className="text-xs text-zinc-400">{nftPortfolio?.totalNFTs || 0} NFTs</p>
                </div>
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Active Sources</p>
                  <p className="text-2xl font-bold text-white">{claimStatus?.activeSources || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Withdrawal Section */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Withdraw Earnings
            </CardTitle>
            <CardDescription>
              Choose where to send your earned crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Withdrawal Destination Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hot Wallet Option */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  withdrawDestination === 'hot' 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}
                onClick={() => setWithdrawDestination('hot')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Hot Wallet</p>
                      <p className="text-xs text-zinc-400">For immediate use in-app</p>
                    </div>
                  </div>
                  {withdrawDestination === 'hot' && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-emerald-400 font-mono text-xs bg-zinc-900 px-2 py-1 rounded flex-1 truncate">
                    {hotWalletStatus?.address ? `${hotWalletStatus.address.slice(0, 10)}...${hotWalletStatus.address.slice(-6)}` : 'Not initialized'}
                  </code>
                  {hotWalletStatus?.address && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); copyHotWalletAddress(); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Use for NFT minting, gas fees, trading</p>
              </div>

              {/* Trust Wallet Option */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  withdrawDestination === 'trust' 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}
                onClick={() => setWithdrawDestination('trust')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Trust Wallet</p>
                      <p className="text-xs text-zinc-400">Your personal wallet</p>
                    </div>
                  </div>
                  {withdrawDestination === 'trust' && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-blue-400 font-mono text-xs bg-zinc-900 px-2 py-1 rounded flex-1 truncate">
                    {TRUST_WALLET_ADDRESS.slice(0, 10)}...{TRUST_WALLET_ADDRESS.slice(-6)}
                  </code>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); copyWalletAddress(); }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Final payout to your personal wallet</p>
              </div>
            </div>

            {/* Withdrawal Action */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
              <div>
                <p className="text-sm text-zinc-400">Available to Withdraw</p>
                <p className="text-2xl font-bold text-green-400">{(earnings?.totalETH || 0).toFixed(6)} ETH</p>
                <p className="text-xs text-zinc-500">≈ ${((earnings?.totalETH || 0) * 2500).toFixed(2)} USD</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold px-6"
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending || (earnings?.totalETH || 0) < 0.001}
                >
                  {withdrawMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                  )}
                  Withdraw to {withdrawDestination === 'hot' ? 'Hot Wallet' : 'Trust Wallet'}
                </Button>
                <p className="text-xs text-zinc-500">Minimum: 0.001 ETH</p>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              PayPal: dakotarea@icloud.com (for cash earnings)
            </p>
          </CardContent>
        </Card>

        {/* Recent Claims */}
        {earnings?.claims && earnings.claims.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Recent Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {earnings.claims.slice(-10).reverse().map((claim: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${claim.status === 'claimed' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-white">{claim.sourceName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-400">{claim.amount.toFixed(6)} {claim.currency}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(claim.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Income Opportunities Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="faucets" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Bitcoin className="w-4 h-4 mr-2" />
              Crypto Faucets
            </TabsTrigger>
            <TabsTrigger value="airdrops" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Gift className="w-4 h-4 mr-2" />
              Airdrops
            </TabsTrigger>
            <TabsTrigger value="earnCrypto" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Coins className="w-4 h-4 mr-2" />
              Earn Crypto
            </TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
              <Bot className="w-4 h-4 mr-2" />
              Browser Bot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bitcoin className="w-5 h-5 text-orange-500" />
                  Auto-Claim Crypto Faucets
                </CardTitle>
                <CardDescription>
                  These faucets are automatically claimed by the system - set and forget!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources?.faucets?.map((opp: any, i: number) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="airdrops" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  Active Airdrops
                </CardTitle>
                <CardDescription>
                  Free tokens from new crypto projects - automatically monitored and claimed!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources?.airdrops?.map((opp: any, i: number) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnCrypto" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Passive Crypto Earning
                </CardTitle>
                <CardDescription>
                  Earn crypto automatically just by using these apps and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources?.earnCrypto?.map((opp: any, i: number) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="mt-4">
            <div className="space-y-4">
              {/* Automation Status Card */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-green-500" />
                        Real Browser Automation
                      </CardTitle>
                      <CardDescription>
                        Puppeteer-powered headless browser for real faucet claims
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${automationStatus?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
                      <span className="text-sm text-zinc-400">
                        {automationStatus?.isRunning ? 'Running' : 'Idle'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-400">Total Claims</p>
                      <p className="text-xl font-bold text-white">{automationStatus?.totalClaims || 0}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-400">Successful</p>
                      <p className="text-xl font-bold text-green-400">{automationStatus?.successfulClaims || 0}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-400">Failed</p>
                      <p className="text-xl font-bold text-red-400">{automationStatus?.failedClaims || 0}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-xs text-zinc-400">Success Rate</p>
                      <p className="text-xl font-bold text-amber-400">
                        {automationStatus?.totalClaims ? 
                          ((automationStatus.successfulClaims / automationStatus.totalClaims) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Current Task */}
                  {automationStatus?.currentTask && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-green-400 animate-spin" />
                        <span className="text-green-400 font-medium">{automationStatus.currentTask}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-black"
                      onClick={() => runAllRealClaimsMutation.mutate()}
                      disabled={runAllRealClaimsMutation.isPending || automationStatus?.isRunning}
                    >
                      {runAllRealClaimsMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Run All Real Claims
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAutomationLogs(!showAutomationLogs)}
                    >
                      <Terminal className="w-4 h-4 mr-2" />
                      {showAutomationLogs ? 'Hide' : 'Show'} Logs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => clearLogsMutation.mutate()}
                      disabled={clearLogsMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Logs
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => closeBrowserMutation.mutate()}
                      disabled={closeBrowserMutation.isPending}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      Close Browser
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Automation Logs */}
              {showAutomationLogs && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-green-500" />
                      Live Automation Logs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] rounded-lg bg-black/50 p-4 font-mono text-sm">
                      {automationStatus?.logs && automationStatus.logs.length > 0 ? (
                        <div className="space-y-1">
                          {automationStatus.logs.map((log: any, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-zinc-500 text-xs whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <span className={`text-xs font-medium ${
                                log.status === 'success' ? 'text-green-400' :
                                log.status === 'error' ? 'text-red-400' :
                                log.status === 'warning' ? 'text-amber-400' :
                                'text-blue-400'
                              }`}>
                                [{log.status.toUpperCase()}]
                              </span>
                              <span className="text-zinc-300 text-xs">
                                <span className="text-amber-400">{log.site}</span>: {log.action}
                                {log.details && <span className="text-zinc-500"> - {log.details}</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-center">No logs yet. Run a claim to see activity.</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Individual Claim Buttons */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Individual Real Claims
                  </CardTitle>
                  <CardDescription>
                    Click to perform a real browser-automated claim on each faucet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sources?.faucets?.map((faucet: any) => (
                      <div key={faucet.id} className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{faucet.name}</p>
                          <p className="text-xs text-zinc-400">{faucet.reward}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          onClick={() => performRealClaimMutation.mutate({
                            sourceId: faucet.id,
                            sourceName: faucet.name,
                            url: faucet.url,
                          })}
                          disabled={performRealClaimMutation.isPending || automationStatus?.isRunning}
                        >
                          <Bot className="w-3 h-3 mr-1" />
                          Claim
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    How Browser Automation Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-zinc-400">
                  <p>
                    This system uses <span className="text-green-400 font-medium">Puppeteer</span>, a headless Chrome browser, 
                    to visit faucet websites and attempt real claims automatically.
                  </p>
                  <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                    <p className="text-white font-medium">What it does:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Opens a real Chrome browser in headless mode</li>
                      <li>Navigates to faucet websites</li>
                      <li>Looks for claim buttons and clicks them</li>
                      <li>Detects captchas and reports when manual intervention is needed</li>
                      <li>Logs all actions in real-time</li>
                    </ul>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <p className="text-amber-400 font-medium">Important Notes:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Many faucets require account login - you may need to set up accounts first</li>
                      <li>Captchas cannot be solved automatically - manual solving may be required</li>
                      <li>Some sites may block automated access</li>
                      <li>Real claims depend on external site availability</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
