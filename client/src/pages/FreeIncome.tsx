import { useState } from "react";
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
  Activity
} from "lucide-react";

// Trust Wallet address
const TRUST_WALLET_ADDRESS = '0x75812e1c4246A880f6576db8292405247e6a8775';

export default function FreeIncome() {
  const [activeTab, setActiveTab] = useState("faucets");
  
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
    withdrawMutation.mutate({ amount: totalETH, currency: 'ETH' });
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

        {/* Trust Wallet & Withdrawal */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Trust Wallet - All Earnings Go Here
            </CardTitle>
            <CardDescription>
              Your configured wallet for automatic crypto payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Trust Wallet Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-mono text-sm bg-zinc-800 px-2 py-1 rounded">
                      {TRUST_WALLET_ADDRESS.slice(0, 10)}...{TRUST_WALLET_ADDRESS.slice(-8)}
                    </code>
                    <Button size="sm" variant="ghost" onClick={copyWalletAddress}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <a 
                      href={`https://etherscan.io/address/${TRUST_WALLET_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-zinc-400">Available to Withdraw</p>
                  <p className="text-xl font-bold text-green-400">{(earnings?.totalETH || 0).toFixed(6)} ETH</p>
                </div>
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending || (earnings?.totalETH || 0) < 0.001}
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw to Wallet
                </Button>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4">
              PayPal: dakotarea@icloud.com (for cash earnings) • Minimum withdrawal: 0.001 ETH
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
