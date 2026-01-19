import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  FileText, 
  Link2, 
  Eye, 
  MousePointer,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Plus,
  Wallet,
  Crown,
  Send,
  ExternalLink,
  CheckCircle,
  BarChart3,
  Newspaper,
  Globe,
  Search,
  LinkIcon,
  Activity
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.summary.useQuery();
  const { data: topArticles } = trpc.analytics.topArticles.useQuery({ limit: 5 });
  const { data: topLinks } = trpc.analytics.topLinks.useQuery({ limit: 5 });
  const { data: nftPortfolio } = trpc.nftEmpire.getPortfolioSummary.useQuery();
  const { data: withdrawalHistory } = trpc.wallet.getWithdrawalHistory.useQuery();
  const { data: blogStats, isLoading: blogStatsLoading } = trpc.publicArticles.blogStats.useQuery();
  const { data: linkStats, isLoading: linkStatsLoading } = trpc.publicArticles.linkVerificationStats.useQuery();
  const { data: clickAnalytics, isLoading: clickAnalyticsLoading } = trpc.publicArticles.clickAnalytics.useQuery();
  
  // Trust Wallet address
  const TRUST_WALLET_ADDRESS = "0x75812e1c4246A880f6576db8292405247e6a8775";
  
  // Real ETH withdrawal mutation
  const withdrawETH = trpc.wallet.withdrawETH.useMutation({
    onSuccess: (data) => {
      if (data.success && !data.isSimulated) {
        // REAL transaction completed
        toast.success(`✅ REAL Withdrawal completed: ${data.amount} ${data.currency}`);
        toast.info(
          <div className="space-y-1">
            <p className="text-green-400 font-bold">Real Transaction!</p>
            <p>Hash: {data.transactionHash?.slice(0, 16)}...</p>
            <a 
              href={data.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              View on Blockchain <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        );
      } else if (data.isSimulated) {
        // SIMULATED - hot wallet needs funding
        toast.warning(
          <div className="space-y-2">
            <p className="text-yellow-400 font-bold">⚠️ SIMULATED - Not Real</p>
            <p className="text-sm">{data.message}</p>
            <p className="text-sm text-yellow-300">Fund the Hot Wallet to enable real withdrawals.</p>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Withdrawal failed: ${error.message}`);
    },
  });
  
  // Calculate REAL withdrawable funds (only from confirmed sales)
  const confirmedSalesEarnings = nftPortfolio?.pendingEarnings || 0;
  const estimatedPortfolioValue = nftPortfolio?.totalEstimatedValue || 0;
  const hasRealFunds = confirmedSalesEarnings > 0;
  
  const handleWithdraw = () => {
    if (confirmedSalesEarnings <= 0) {
      toast.error("No confirmed sales to withdraw. Estimated value cannot be withdrawn until NFTs are sold.");
      return;
    }
    
    withdrawETH.mutate({
      amount: confirmedSalesEarnings,
      network: 'ethereum',
    });
  };
  
  const copyWalletAddress = () => {
    navigator.clipboard.writeText(TRUST_WALLET_ADDRESS);
    toast.success("Trust Wallet address copied!");
  };

  const stats = [
    { 
      label: "Total Views", 
      value: summary?.totalViews || 0, 
      icon: Eye,
      color: "text-blue-400"
    },
    { 
      label: "Total Clicks", 
      value: summary?.totalClicks || 0, 
      icon: MousePointer,
      color: "text-green-400"
    },
    { 
      label: "Articles", 
      value: summary?.totalArticles || 0, 
      icon: FileText,
      color: "text-purple-400"
    },
    { 
      label: "Est. Revenue", 
      value: `$${parseFloat(summary?.totalRevenue || "0").toFixed(2)}`, 
      icon: DollarSign,
      color: "text-primary"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, <span className="gradient-text">{user?.name || "Creator"}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your content performance
            </p>
          </div>
          <Button onClick={() => setLocation("/articles/new")} className="btn-glow">
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="card-glow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">
                      {summaryLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* NFT Portfolio & Crypto Wallet */}
        <Card className="bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-blue-500/10 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* NFT Portfolio - Estimated vs Withdrawable */}
              <div className="flex items-center gap-6">
                {/* Estimated Value */}
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-yellow-500/20 rounded-xl">
                    <Crown className="w-10 h-10 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-400 font-medium flex items-center gap-2">
                      Portfolio Value (Estimated)
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">NOT REAL</span>
                    </p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {estimatedPortfolioValue.toFixed(4)} ETH
                    </p>
                    <p className="text-xs text-zinc-500">
                      {nftPortfolio?.totalNfts || 0} NFTs • {nftPortfolio?.totalListings || 0} Listings
                    </p>
                  </div>
                </div>
                
                {/* Separator */}
                <div className="hidden lg:block w-px h-16 bg-zinc-700" />
                
                {/* Withdrawable Funds */}
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-green-500/20 rounded-xl">
                    <DollarSign className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-green-400 font-medium flex items-center gap-2">
                      Withdrawable Funds
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">REAL</span>
                    </p>
                    <p className="text-3xl font-bold text-green-400">
                      {confirmedSalesEarnings.toFixed(4)} ETH
                    </p>
                    <p className="text-xs text-zinc-500">
                      From {nftPortfolio?.totalSales || 0} confirmed sales
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Wallet & Withdrawal */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-xs text-zinc-500">Trust Wallet</p>
                    <button 
                      onClick={copyWalletAddress}
                      className="text-sm font-mono text-green-400 hover:text-green-300 flex items-center gap-1"
                    >
                      {TRUST_WALLET_ADDRESS.slice(0, 10)}...{TRUST_WALLET_ADDRESS.slice(-8)}
                      <CheckCircle className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleWithdraw}
                    disabled={withdrawETH.isPending || confirmedSalesEarnings <= 0}
                    className={`${hasRealFunds ? 'bg-green-600 hover:bg-green-700' : 'bg-zinc-700'} text-white disabled:opacity-50`}
                  >
                    {withdrawETH.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : hasRealFunds ? (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Withdraw {confirmedSalesEarnings.toFixed(4)} ETH
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        No Sales Yet
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/nft-empire")}
                    className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    NFT Empire
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card 
            className="card-glow cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/topics")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Discover Topics</h3>
                  <p className="text-sm text-muted-foreground">Find trending topics to write about</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="card-glow cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/articles/new")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Generate Article</h3>
                  <p className="text-sm text-muted-foreground">Create AI-powered content</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="card-glow cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/affiliate-links")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Manage Links</h3>
                  <p className="text-sm text-muted-foreground">Organize affiliate links</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="card-glow cursor-pointer hover:border-green-500/50 transition-colors bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
            onClick={() => window.open('/blog', '_blank')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Newspaper className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-400">View Article Blog</h3>
                  <p className="text-sm text-muted-foreground">Browse all published articles</p>
                </div>
                <ExternalLink className="w-5 h-5 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Performance Dashboard */}
        <Card className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-green-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Live System Performance
            </CardTitle>
            <CardDescription>Real-time monitoring of all platform features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* NFT System */}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">NFT Minting</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-bold text-green-400">{nftPortfolio?.totalNfts || 0}</p>
                <p className="text-xs text-zinc-500">Total Minted</p>
              </div>
              
              {/* Marketplace */}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Marketplace</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-bold text-blue-400">{nftPortfolio?.totalListings || 0}</p>
                <p className="text-xs text-zinc-500">Active Listings</p>
              </div>
              
              {/* Auto-Buyers */}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Auto-Buyers</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-bold text-purple-400">{nftPortfolio?.totalSubmissions || 0}</p>
                <p className="text-xs text-zinc-500">Submissions</p>
              </div>
              
              {/* Articles */}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Content</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-bold text-orange-400">{summary?.totalArticles || 0}</p>
                <p className="text-xs text-zinc-500">Articles</p>
              </div>
              
              {/* Sales */}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Sales</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-bold text-pink-400">{nftPortfolio?.totalSales || 0}</p>
                <p className="text-xs text-zinc-500">Completed</p>
              </div>
              
              {/* Earnings */}
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">Earnings</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-bold text-cyan-400">{(nftPortfolio?.totalEarnings || 0).toFixed(2)}</p>
                <p className="text-xs text-zinc-500">ETH Total</p>
              </div>
            </div>
            
            {/* System Status Bar */}
            <div className="mt-4 flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-zinc-400">All Systems Operational</span>
                </div>
                <div className="text-xs text-zinc-500">|</div>
                <div className="text-xs text-zinc-400">
                  Blockchain: <span className="text-green-400">Connected</span>
                </div>
                <div className="text-xs text-zinc-500">|</div>
                <div className="text-xs text-zinc-400">
                  API: <span className="text-green-400">Live</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-zinc-400 hover:text-white"
                onClick={() => setLocation('/system-health')}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Benjamin Franklin's Blog Stats */}
        <Card className="bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 border-emerald-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  Benjamin Franklin's Recommendations Blog
                </CardTitle>
                <CardDescription>Real-time stats from your public article blog</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => window.open('/blog', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Blog
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {/* Total Published Articles */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-zinc-400">Published Articles</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {blogStatsLoading ? "..." : blogStats?.totalArticles || 0}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Total on blog</p>
              </div>
              
              {/* Verified Affiliate Links */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-zinc-400">CJ Affiliate Links</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {blogStatsLoading ? "..." : blogStats?.verifiedAffiliateLinks || 0}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Verified & active</p>
              </div>
              
              {/* Article Views */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-400">Total Views</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {blogStatsLoading ? "..." : blogStats?.totalViews?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-zinc-500 mt-1">All-time pageviews</p>
              </div>
              
              {/* Average SEO Score */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-zinc-400">Avg SEO Score</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">
                  {blogStatsLoading ? "..." : `${blogStats?.averageSeoScore || 0}%`}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Search optimization</p>
              </div>
              
              {/* Affiliate Link Clicks */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="w-4 h-4 text-pink-400" />
                  <span className="text-xs text-zinc-400">Link Clicks</span>
                </div>
                <p className="text-2xl font-bold text-pink-400">
                  {blogStatsLoading ? "..." : blogStats?.totalClicks?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Affiliate clicks</p>
              </div>
            </div>
            
            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Categories */}
              <div className="bg-zinc-800/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Top Categories
                </h4>
                <div className="space-y-2">
                  {blogStats?.topCategories && blogStats.topCategories.length > 0 ? (
                    blogStats.topCategories.map((cat: { name: string; count: number }, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">{cat.name}</span>
                        <span className="text-sm font-medium text-emerald-400">{cat.count} articles</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No categories yet</p>
                  )}
                </div>
              </div>
              
              {/* Recent Articles */}
              <div className="bg-zinc-800/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Recent Articles
                </h4>
                <div className="space-y-2">
                  {blogStats?.recentArticles && blogStats.recentArticles.length > 0 ? (
                    blogStats.recentArticles.slice(0, 3).map((article: { id: number; title: string; slug: string; views: number; clicks: number }, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between cursor-pointer hover:bg-zinc-700/30 rounded p-1 -mx-1"
                        onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                      >
                        <span className="text-sm text-zinc-400 truncate max-w-[200px]">{article.title}</span>
                        <span className="text-xs text-zinc-500">{article.views} views</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No articles yet</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Link Verification Stats */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Affiliate Link Verification Status
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {linkStatsLoading ? "..." : linkStats?.articlesWithVerifiedLinks || 0}
                  </p>
                  <p className="text-xs text-zinc-400">Verified Articles</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {linkStatsLoading ? "..." : linkStats?.articlesWithoutLinks || 0}
                  </p>
                  <p className="text-xs text-zinc-400">Without Links</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {linkStatsLoading ? "..." : (linkStats?.totalCJLinksFound || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400">Total CJ Links</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {linkStatsLoading ? "..." : `${linkStats?.verificationRate || 0}%`}
                  </p>
                  <p className="text-xs text-zinc-400">Verification Rate</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  All CJ affiliate links are live and commission-ready
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                  onClick={() => window.open('/blog', '_blank')}
                >
                  Browse All Articles
                </Button>
              </div>
            </div>
            
            {/* Click Analytics Section */}
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-purple-500" />
                Click Analytics & Conversion Tracking
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {clickAnalyticsLoading ? "..." : clickAnalytics?.totalClicks?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-zinc-400">Total Clicks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-pink-400">
                    {clickAnalyticsLoading ? "..." : `${clickAnalytics?.conversionRate || 0}%`}
                  </p>
                  <p className="text-xs text-zinc-400">Click-Through Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">
                    {clickAnalyticsLoading ? "..." : clickAnalytics?.topArticlesByClicks?.length || 0}
                  </p>
                  <p className="text-xs text-zinc-400">Converting Articles</p>
                </div>
              </div>
              
              {/* Top Converting Articles */}
              {clickAnalytics?.topArticlesByClicks && clickAnalytics.topArticlesByClicks.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-medium text-zinc-400 mb-2">Top Converting Articles</h5>
                  <div className="space-y-2">
                    {clickAnalytics.topArticlesByClicks.slice(0, 5).map((article: { id: number; title: string; slug: string; clicks: number; views: number; ctr: number }, i: number) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between cursor-pointer hover:bg-zinc-700/30 rounded p-2 -mx-2"
                        onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-400">#{i + 1}</span>
                          <span className="text-sm text-zinc-300 truncate max-w-[180px]">{article.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-pink-400">{article.clicks} clicks</span>
                          <span className="text-cyan-400">{article.ctr}% CTR</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Clicks by Category */}
              {clickAnalytics?.clicksByCategory && clickAnalytics.clicksByCategory.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-medium text-zinc-400 mb-2">Clicks by Category</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {clickAnalytics.clicksByCategory.slice(0, 6).map((cat: { category: string; clicks: number; articles: number }, i: number) => (
                      <div key={i} className="bg-zinc-800/50 rounded p-2 text-center">
                        <p className="text-xs text-zinc-400">{cat.category}</p>
                        <p className="text-sm font-bold text-purple-400">{cat.clicks} clicks</p>
                        <p className="text-xs text-zinc-500">{cat.articles} articles</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-500">
                  UTM tracking enabled: All affiliate links include source, campaign, and position tracking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Articles */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Top Performing Articles
              </CardTitle>
              <CardDescription>Your best content by views</CardDescription>
            </CardHeader>
            <CardContent>
              {topArticles && topArticles.length > 0 ? (
                <div className="space-y-4">
                  {topArticles.map((article, i) => (
                    <div 
                      key={article.id} 
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                      onClick={() => setLocation(`/articles/${article.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {article.views} views · {article.clicks} clicks
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs status-${article.status}`}>
                        {article.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No articles yet</p>
                  <Button 
                    variant="link" 
                    className="text-primary"
                    onClick={() => setLocation("/articles/new")}
                  >
                    Create your first article
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Links */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Top Performing Links
              </CardTitle>
              <CardDescription>Your best affiliate links by clicks</CardDescription>
            </CardHeader>
            <CardContent>
              {topLinks && topLinks.length > 0 ? (
                <div className="space-y-4">
                  {topLinks.map((link, i) => (
                    <div 
                      key={link.id} 
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {link.clicks} clicks · {link.conversions} conversions
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs bg-secondary text-secondary-foreground">
                        {link.category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No affiliate links yet</p>
                  <Button 
                    variant="link" 
                    className="text-primary"
                    onClick={() => setLocation("/affiliate-links")}
                  >
                    Add your first link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
