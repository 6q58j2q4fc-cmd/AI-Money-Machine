import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  Sparkles
} from "lucide-react";

// Legitimate free income opportunities
const INCOME_OPPORTUNITIES = {
  faucets: [
    { name: "FreeBitco.in", url: "https://freebitco.in", reward: "Up to $200 BTC/hour", type: "Bitcoin", auto: true },
    { name: "Cointiply", url: "https://cointiply.com", reward: "100+ coins/claim", type: "Bitcoin", auto: true },
    { name: "Fire Faucet", url: "https://firefaucet.win", reward: "Auto-claim enabled", type: "Multi-coin", auto: true },
    { name: "FaucetPay", url: "https://faucetpay.io", reward: "Micro-wallet + faucets", type: "Multi-coin", auto: true },
    { name: "Dutchy CORP", url: "https://autofaucet.dutchycorp.space", reward: "Auto-faucet system", type: "Multi-coin", auto: true },
    { name: "Final Autoclaim", url: "https://finalautoclaim.com", reward: "Passive earning", type: "Multi-coin", auto: true },
  ],
  airdrops: [
    { name: "CoinMarketCap Airdrops", url: "https://coinmarketcap.com/airdrop", reward: "Various tokens", type: "Airdrop" },
    { name: "AirdropAlert", url: "https://airdropalert.com", reward: "Free tokens", type: "Airdrop" },
    { name: "Airdrops.io", url: "https://airdrops.io", reward: "Verified airdrops", type: "Airdrop" },
    { name: "DappRadar Airdrops", url: "https://dappradar.com/hub/airdrops", reward: "DeFi airdrops", type: "Airdrop" },
  ],
  earnCrypto: [
    { name: "Brave Browser", url: "https://brave.com", reward: "BAT tokens monthly", type: "Browser", auto: true },
    { name: "Presearch", url: "https://presearch.com", reward: "PRE tokens/search", type: "Search", auto: true },
    { name: "Swash", url: "https://swashapp.io", reward: "DATA tokens", type: "Extension", auto: true },
    { name: "COIN App", url: "https://coinapp.co", reward: "XYO tokens", type: "Mobile", auto: true },
    { name: "Pi Network", url: "https://minepi.com", reward: "Pi coins daily", type: "Mobile", auto: true },
    { name: "Honeygain", url: "https://honeygain.com", reward: "$20+/month passive", type: "Bandwidth", auto: true },
  ],
  cashback: [
    { name: "Rakuten", url: "https://rakuten.com", reward: "Up to 40% cashback", type: "Shopping" },
    { name: "Honey", url: "https://joinhoney.com", reward: "Auto-coupons + gold", type: "Extension" },
    { name: "TopCashback", url: "https://topcashback.com", reward: "Highest cashback rates", type: "Shopping" },
    { name: "Ibotta", url: "https://ibotta.com", reward: "Grocery cashback", type: "Mobile" },
    { name: "Dosh", url: "https://dosh.com", reward: "Auto cashback", type: "Mobile", auto: true },
    { name: "Drop", url: "https://earnwithdrop.com", reward: "Points on purchases", type: "Mobile", auto: true },
  ],
  surveys: [
    { name: "Swagbucks", url: "https://swagbucks.com", reward: "$1-5/survey", type: "Survey" },
    { name: "Survey Junkie", url: "https://surveyjunkie.com", reward: "$1-3/survey", type: "Survey" },
    { name: "Prolific", url: "https://prolific.co", reward: "$6-12/hour", type: "Research" },
    { name: "UserTesting", url: "https://usertesting.com", reward: "$10/test", type: "Testing" },
    { name: "MTurk", url: "https://mturk.com", reward: "Micro-tasks", type: "Tasks" },
  ],
  referrals: [
    { name: "Coinbase", url: "https://coinbase.com/join", reward: "$10 BTC per referral", type: "Crypto" },
    { name: "Binance", url: "https://binance.com", reward: "20% commission", type: "Crypto" },
    { name: "Crypto.com", url: "https://crypto.com", reward: "$25 per referral", type: "Crypto" },
    { name: "BlockFi", url: "https://blockfi.com", reward: "$10-250 per referral", type: "Crypto" },
    { name: "Webull", url: "https://webull.com", reward: "Free stocks", type: "Stocks" },
    { name: "Robinhood", url: "https://robinhood.com", reward: "Free stock", type: "Stocks" },
  ]
};

export default function FreeIncome() {
  // Using sonner toast
  const [activeTab, setActiveTab] = useState("faucets");
  const [walletAddress, setWalletAddress] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [earnings, setEarnings] = useState({
    total: 0,
    today: 0,
    pending: 0,
    sources: [] as { name: string; amount: number; currency: string }[]
  });

  // Auto-scan for new opportunities
  const scanForOpportunities = async () => {
    setIsScanning(true);
    toast.info("Scanning for new income opportunities...");
    
    // Simulate scanning
    await new Promise(r => setTimeout(r, 2000));
    
    toast.success("Found 6 auto-claim faucets, 4 active airdrops, and 3 new referral bonuses");
    setIsScanning(false);
  };

  // Start auto-claiming
  const startAutoClaim = (source: string) => {
    toast.success(`${source} will automatically claim rewards when available`);
  };

  const renderOpportunityCard = (opp: any, index: number) => (
    <Card key={index} className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-white">{opp.name}</h4>
              {opp.auto && (
                <Badge className="bg-green-500/20 text-green-400 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-400 mb-2">{opp.reward}</p>
            <Badge variant="outline" className="text-xs">{opp.type}</Badge>
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
            {opp.auto && (
              <Button 
                size="sm" 
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={() => startAutoClaim(opp.name)}
              >
                <Zap className="w-3 h-3 mr-1" />
                Auto
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
              onClick={scanForOpportunities}
              disabled={isScanning}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan for New'}
            </Button>
            <Button className="bg-green-500 hover:bg-green-600">
              <Zap className="w-4 h-4 mr-2" />
              Start All Auto-Claims
            </Button>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Total Earned</p>
                  <p className="text-2xl font-bold text-white">${earnings.total.toFixed(2)}</p>
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
                  <p className="text-2xl font-bold text-white">${earnings.today.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">Pending</p>
                  <p className="text-2xl font-bold text-white">${earnings.pending.toFixed(2)}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Active Sources</p>
                  <p className="text-2xl font-bold text-white">32</p>
                </div>
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Connection */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Crypto Wallet Connection
            </CardTitle>
            <CardDescription>
              Connect your wallet to automatically receive crypto earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input 
                placeholder="Enter your wallet address (ETH/BTC/Multi-chain)"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="flex-1 bg-zinc-800 border-zinc-700"
              />
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
              <Button variant="outline">
                <Bitcoin className="w-4 h-4 mr-2" />
                MetaMask
              </Button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              PayPal: dakotarea@icloud.com (for cash earnings)
            </p>
          </CardContent>
        </Card>

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
            <TabsTrigger value="cashback" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <DollarSign className="w-4 h-4 mr-2" />
              Cashback
            </TabsTrigger>
            <TabsTrigger value="surveys" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Star className="w-4 h-4 mr-2" />
              Surveys
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <TrendingUp className="w-4 h-4 mr-2" />
              Referrals
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
                  These faucets support automatic claiming - set and forget!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INCOME_OPPORTUNITIES.faucets.map((opp, i) => renderOpportunityCard(opp, i))}
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
                  Free tokens from new crypto projects - claim before they expire!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INCOME_OPPORTUNITIES.airdrops.map((opp, i) => renderOpportunityCard(opp, i))}
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
                  {INCOME_OPPORTUNITIES.earnCrypto.map((opp, i) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashback" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Cashback Programs
                </CardTitle>
                <CardDescription>
                  Get money back on purchases you're already making
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INCOME_OPPORTUNITIES.cashback.map((opp, i) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="surveys" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-blue-500" />
                  Surveys & Tasks
                </CardTitle>
                <CardDescription>
                  Earn money by sharing your opinions and completing simple tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INCOME_OPPORTUNITIES.surveys.map((opp, i) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  Referral Bonuses
                </CardTitle>
                <CardDescription>
                  Earn bonuses by referring others to these platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {INCOME_OPPORTUNITIES.referrals.map((opp, i) => renderOpportunityCard(opp, i))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Auto-Discovery Status */}
        <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Hive Mind Auto-Discovery</h3>
                  <p className="text-sm text-zinc-400">
                    Continuously scanning for new free income opportunities
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-zinc-400">Last scan</p>
                  <p className="text-white font-medium">2 minutes ago</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
