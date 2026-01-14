import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Crown,
  Wallet,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Zap,
  DollarSign,
  Eye,
  Store,
  Globe,
  CheckCircle,
  Clock,
  Rocket,
  Target,
  BarChart3,
  ArrowUpRight,
  Coins,
  ShoppingCart,
  Database,
  FileText,
  Download,
  Send,
  Sparkles,
  Link2
} from "lucide-react";

export default function NFTEmpire() {
  const [activeTab, setActiveTab] = useState("portfolio");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("auto");
  const [batchCount, setBatchCount] = useState(5);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState("");

  // tRPC queries
  const { data: portfolio, refetch: refetchPortfolio } = trpc.nftEmpire.getPortfolio.useQuery();
  const { data: nfts, refetch: refetchNFTs } = trpc.nftEmpire.getAllNFTs.useQuery();
  const { data: marketplaces } = trpc.nftEmpire.getMarketplaces.useQuery();
  const { data: autoBuyPlatforms } = trpc.nftEmpire.getAutoBuyPlatforms.useQuery();
  const { data: categories } = trpc.nftEmpire.getCategories.useQuery();

  // Data monetization queries
  const { data: dataStats } = trpc.dataMonetization.getStats.useQuery();
  const { data: dataTypes } = trpc.dataMonetization.getDataTypes.useQuery();
  const { data: dataPlatforms } = trpc.dataMonetization.getPlatforms.useQuery();
  const { data: dataBatches, refetch: refetchBatches } = trpc.dataMonetization.getAllBatches.useQuery();

  // Mutations
  const generateMutation = trpc.nftEmpire.generateHighValue.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.rarity} NFT: ${data.name}`);
      refetchPortfolio();
      refetchNFTs();
    },
    onError: (error) => toast.error(error.message)
  });

  const listMutation = trpc.nftEmpire.listOnAllMarketplaces.useMutation({
    onSuccess: (data) => {
      toast.success(`Listed on ${data.listings.length} marketplaces!`);
      refetchNFTs();
    },
    onError: (error) => toast.error(error.message)
  });

  const submitAutoBuyMutation = trpc.nftEmpire.submitToAutoBuy.useMutation({
    onSuccess: (data) => {
      toast.success(`Received ${data.offers.length} auto-buy offers!`);
      refetchNFTs();
      refetchPortfolio();
    },
    onError: (error) => toast.error(error.message)
  });

  const batchGenerateMutation = trpc.nftEmpire.batchGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.generated} NFTs worth ${data.totalValue.toFixed(4)} ETH!`);
      refetchPortfolio();
      refetchNFTs();
      setIsBatchGenerating(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsBatchGenerating(false);
    }
  });

  const transferMutation = trpc.nftEmpire.transferToWallet.useMutation({
    onSuccess: (data) => {
      toast.success(`Transferred! TX: ${data.txHash.slice(0, 10)}...`);
      refetchNFTs();
    },
    onError: (error) => toast.error(error.message)
  });

  const cashOutMutation = trpc.nftEmpire.cashOut.useMutation({
    onSuccess: (data) => {
      toast.success(`Cashed out $${data.amount.toFixed(2)}!`);
      refetchPortfolio();
    },
    onError: (error) => toast.error(error.message)
  });

  // Data monetization mutations
  const generateDataMutation = trpc.dataMonetization.generateBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.itemCount} data items worth $${data.totalValue.toFixed(2)}`);
      refetchBatches();
    },
    onError: (error) => toast.error(error.message)
  });

  const submitDataMutation = trpc.dataMonetization.submitToPlatforms.useMutation({
    onSuccess: (data) => {
      toast.success(`Submitted to platforms - Total offered: $${data.totalOffered.toFixed(2)}`);
      refetchBatches();
    },
    onError: (error) => toast.error(error.message)
  });

  const handleGenerateNFT = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({
        category: selectedCategory === 'auto' ? undefined : selectedCategory
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true);
    await batchGenerateMutation.mutateAsync({
      count: batchCount,
      category: selectedCategory === 'auto' ? undefined : selectedCategory,
      autoList: true,
      autoSubmitToBuyers: true
    });
  };

  const connectWallet = async () => {
    // Check if MetaMask is available
    if (typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask) {
      try {
        toast.info("Connecting to MetaMask...");
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });
        if (accounts && accounts.length > 0) {
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
          toast.success("MetaMask wallet connected!");
          
          // Listen for account changes
          (window as any).ethereum.on('accountsChanged', (newAccounts: string[]) => {
            if (newAccounts.length > 0) {
              setWalletAddress(newAccounts[0]);
            } else {
              setWalletConnected(false);
              setWalletAddress("");
            }
          });
        }
      } catch (error: any) {
        if (error.code === 4001) {
          toast.error("Connection rejected by user");
        } else {
          toast.error("Failed to connect wallet");
        }
      }
    } else {
      // Fallback for demo mode
      toast.info("MetaMask not detected. Using demo mode...");
      setTimeout(() => {
        setWalletConnected(true);
        setWalletAddress("0x7a3F8b2c9d1E4f5A6B7C8D9E0F1A2B3C4D5E6F7A");
        toast.success("Demo wallet connected!");
      }, 1000);
    }
  };

  const handleCashOut = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    await cashOutMutation.mutateAsync({
      walletAddress,
      amount: cashoutAmount ? parseFloat(cashoutAmount) : undefined
    });
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: "text-zinc-400 bg-zinc-500/20",
      uncommon: "text-green-400 bg-green-500/20",
      rare: "text-blue-400 bg-blue-500/20",
      epic: "text-purple-400 bg-purple-500/20",
      legendary: "text-yellow-400 bg-yellow-500/20",
      mythic: "text-red-400 bg-red-500/20"
    };
    return colors[rarity] || "text-zinc-400 bg-zinc-500/20";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              NFT Empire
            </h1>
            <p className="text-zinc-400 mt-1">
              Autonomous high-value NFT generation & multi-marketplace sales
            </p>
          </div>
          <div className="flex gap-2">
            {!walletConnected ? (
              <Button onClick={connectWallet} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            ) : (
              <Button variant="outline" className="border-green-500 text-green-400">
                <Wallet className="w-4 h-4 mr-2" />
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Button>
            )}
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400">Total NFTs</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.totalNFTs || 0}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.totalValue?.toFixed(2) || "0.00"} ETH</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">Active Listings</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.activeListings || 0}</p>
                </div>
                <Store className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Pending Offers</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.pendingOffers || 0}</p>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-400">Total Earnings</p>
                  <p className="text-2xl font-bold text-white">${portfolio?.totalEarnings?.toFixed(2) || "0.00"}</p>
                </div>
                <DollarSign className="w-8 h-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-400">Wallet Balance</p>
                  <p className="text-2xl font-bold text-white">${portfolio?.walletBalance?.toFixed(2) || "0.00"}</p>
                </div>
                <Coins className="w-8 h-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Crown className="w-4 h-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="generate" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="marketplaces" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Store className="w-4 h-4 mr-2" />
              Marketplaces
            </TabsTrigger>
            <TabsTrigger value="autobuyers" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Auto-Buyers
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Database className="w-4 h-4 mr-2" />
              Data Sales
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="mt-4">
            {nfts && nfts.length > 0 ? (
              <div className="space-y-4">
                {nfts.map((nft) => (
                  <Card key={nft.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* NFT Image */}
                        <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={nft.imageUrl} 
                            alt={nft.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://picsum.photos/200/200?random=${nft.id}`;
                            }}
                          />
                        </div>

                        {/* NFT Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-bold text-white text-lg">{nft.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getRarityColor(nft.rarity)}>
                                  {nft.rarity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">{nft.category}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-yellow-400">{nft.currentValue.toFixed(4)} ETH</p>
                              <p className="text-sm text-zinc-400">~${(nft.currentValue * 2500).toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Marketplace Listings */}
                          {nft.listings && nft.listings.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-zinc-400 mb-2">Listed on {nft.listings.length} marketplaces:</p>
                              <div className="flex flex-wrap gap-2">
                                {nft.listings.map((listing, i) => (
                                  <a
                                    key={i}
                                    href={listing.viewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-sm hover:bg-zinc-700 transition-colors"
                                  >
                                    <span className="text-white">{listing.marketplace}</span>
                                    <span className="text-green-400">{listing.price.toFixed(4)} ETH</span>
                                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Auto-Buy Offers */}
                          {nft.autoBuyOffers && nft.autoBuyOffers.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-zinc-400 mb-2">Auto-buy offers:</p>
                              <div className="flex flex-wrap gap-2">
                                {nft.autoBuyOffers.slice(0, 3).map((offer, i) => (
                                  <a
                                    key={i}
                                    href={offer.platformUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-sm hover:bg-green-500/30 transition-colors"
                                  >
                                    <span className="text-white">{offer.platform}</span>
                                    <span className="text-green-400">${offer.offerPrice.toFixed(2)}</span>
                                    <Badge className={offer.status === "accepted" ? "bg-green-500" : "bg-yellow-500"} variant="outline">
                                      {offer.status}
                                    </Badge>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            {nft.status === "generated" && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                                  onClick={() => listMutation.mutate({ nftId: nft.id })}
                                >
                                  <Store className="w-3 h-3 mr-1" />
                                  List on All
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => submitAutoBuyMutation.mutate({ nftId: nft.id })}
                                >
                                  <ShoppingCart className="w-3 h-3 mr-1" />
                                  Get Offers
                                </Button>
                              </>
                            )}
                            {walletConnected && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => transferMutation.mutate({ nftId: nft.id, walletAddress })}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Transfer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500/50" />
                  <h3 className="text-xl font-semibold text-white mb-2">Build Your Empire</h3>
                  <p className="text-zinc-400 mb-4">Generate high-value NFTs and list them across all marketplaces</p>
                  <Button onClick={() => setActiveTab("generate")} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Generating
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Single Generation */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Generate High-Value NFT
                  </CardTitle>
                  <CardDescription>
                    AI generates the most valuable NFT for current market demand
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Category (optional)</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Auto-select best category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-select (AI chooses)</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.category} value={cat.category}>
                            <div className="flex items-center justify-between w-full">
                              <span>{cat.name}</span>
                              <span className="text-xs text-zinc-400 ml-2">~{cat.avgFloorPrice} ETH</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerateNFT}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate & Auto-List
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Batch Generation */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-yellow-500" />
                    Batch Empire Builder
                  </CardTitle>
                  <CardDescription>
                    Generate multiple NFTs and list on all marketplaces
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Number of NFTs: {batchCount}</label>
                    <input 
                      type="range"
                      min={1}
                      max={50}
                      value={batchCount}
                      onChange={(e) => setBatchCount(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-2">Batch Summary</h4>
                    <div className="space-y-1 text-sm text-zinc-400">
                      <p>• {batchCount} high-value NFTs</p>
                      <p>• Auto-listed on {marketplaces?.length || 0} marketplaces</p>
                      <p>• Auto-submitted to {autoBuyPlatforms?.length || 0} buyers</p>
                      <p>• Est. value: ~{(batchCount * 0.5).toFixed(2)} ETH</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleBatchGenerate}
                    disabled={isBatchGenerating}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
                  >
                    {isBatchGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Building Empire...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Build {batchCount} NFT Empire
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Categories */}
            <Card className="bg-zinc-900/50 border-zinc-800 mt-6">
              <CardHeader>
                <CardTitle>High-Value Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories?.map((cat) => (
                    <div 
                      key={cat.category}
                      className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-yellow-500/50 transition-all cursor-pointer"
                      onClick={() => setSelectedCategory(cat.category)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{cat.name}</h3>
                        <Badge className="bg-yellow-500/20 text-yellow-400">{cat.demandScore}% demand</Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">Avg floor: {cat.avgFloorPrice} ETH • {cat.traits.length} traits</p>
                      <p className="text-lg font-bold text-yellow-400">~{cat.avgFloorPrice} ETH floor</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplaces Tab */}
          <TabsContent value="marketplaces" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-yellow-500" />
                  NFT Marketplaces
                </CardTitle>
                <CardDescription>
                  Your NFTs are automatically listed on all these platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketplaces?.map((mp) => (
                    <a
                      key={mp.name}
                      href={mp.baseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-yellow-500/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                          {mp.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <Badge className="bg-green-500/20 text-green-400">Rank #{mp.rank}</Badge>
                          <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-yellow-400" />
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">24h Volume</span>
                          <span className="text-white">${(mp.volume24h / 1000000).toFixed(1)}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Fee</span>
                          <span className="text-white">{mp.fee}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Chains</span>
                          <span className="text-white">{mp.chains.slice(0, 2).join(", ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Auto-List</span>
                          <span className={mp.autoList ? "text-green-400" : "text-zinc-400"}>
                            {mp.autoList ? "Yes" : "Manual"}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Buyers Tab */}
          <TabsContent value="autobuyers" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-yellow-500" />
                  Auto-Buy Platforms
                </CardTitle>
                <CardDescription>
                  Platforms that automatically purchase AI-generated content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {autoBuyPlatforms?.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-green-500/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                          {platform.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          {platform.autoAccept && (
                            <Badge className="bg-green-500/20 text-green-400">Auto-Accept</Badge>
                          )}
                          <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-green-400" />
                        </div>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{platform.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Type: {platform.type}</span>
                        <span className="text-green-400">Min: ${platform.minPayout}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Sales Tab */}
          <TabsContent value="data" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Stats */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-yellow-500" />
                    Data Monetization Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-400">{dataStats?.totalItems || 0}</p>
                      <p className="text-sm text-zinc-400">Items Generated</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">${dataStats?.earnings?.total?.toFixed(2) || "0.00"}</p>
                      <p className="text-sm text-zinc-400">Total Earnings</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-400">{dataStats?.totalBatches || 0}</p>
                      <p className="text-sm text-zinc-400">Batches Created</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-400">${dataStats?.earnings?.pending?.toFixed(2) || "0.00"}</p>
                      <p className="text-sm text-zinc-400">Pending</p>
                    </div>
                  </div>

                  {/* Generate Data */}
                  <div className="space-y-3">
                    <Select onValueChange={(type) => {
                      generateDataMutation.mutate({ type, count: 50 });
                    }}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Generate data batch..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dataTypes?.map((dt) => (
                          <SelectItem key={dt.type} value={dt.type}>
                            <div className="flex items-center justify-between w-full">
                              <span>{dt.name}</span>
                              <span className="text-xs text-green-400 ml-2">${dt.avgValuePerItem}/item</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Data Platforms */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-yellow-500" />
                    Data Buying Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {dataPlatforms?.slice(0, 8).map((platform) => (
                      <a
                        key={platform.name}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{platform.name}</p>
                          <p className="text-xs text-zinc-400">{platform.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 text-sm">
                            ${platform.payRate.min}-${platform.payRate.max}/{platform.payRate.unit}
                          </span>
                          <ExternalLink className="w-4 h-4 text-zinc-400" />
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-yellow-500" />
                    Wallet Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!walletConnected ? (
                    <div className="text-center py-8">
                      <Wallet className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                      <p className="text-zinc-400 mb-4">Connect your wallet to transfer NFTs and cash out earnings</p>
                      <Button onClick={connectWallet} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect MetaMask
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-zinc-800 rounded-lg p-4">
                        <p className="text-sm text-zinc-400 mb-1">Connected Wallet</p>
                        <p className="font-mono text-white">{walletAddress}</p>
                      </div>

                      <div className="bg-gradient-to-r from-green-500/20 to-green-600/10 rounded-lg p-4 border border-green-500/30">
                        <p className="text-sm text-green-400 mb-1">Available Balance</p>
                        <p className="text-3xl font-bold text-white">${portfolio?.walletBalance?.toFixed(2) || "0.00"}</p>
                      </div>

                      <div>
                        <label className="text-sm text-zinc-400 mb-2 block">Cash Out Amount (optional)</label>
                        <Input 
                          type="number"
                          placeholder="Leave empty for full balance"
                          value={cashoutAmount}
                          onChange={(e) => setCashoutAmount(e.target.value)}
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </div>

                      <Button 
                        onClick={handleCashOut}
                        disabled={!portfolio?.walletBalance || portfolio.walletBalance <= 0}
                        className="w-full bg-green-500 hover:bg-green-600"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Cash Out to Wallet
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-yellow-500" />
                    Earnings Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-zinc-400">NFT Sales</span>
                      <span className="text-white font-bold">${portfolio?.totalEarnings?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-zinc-400">Data Sales</span>
                      <span className="text-white font-bold">${dataStats?.earnings?.paid?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                      <span className="text-zinc-400">Pending Payments</span>
                      <span className="text-yellow-400 font-bold">${dataStats?.earnings?.pending?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 rounded-lg border border-yellow-500/30">
                      <span className="text-yellow-400 font-medium">Total Earnings</span>
                      <span className="text-white font-bold text-xl">
                        ${((portfolio?.totalEarnings || 0) + (dataStats?.earnings?.total || 0)).toFixed(2)}
                      </span>
                    </div>
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
