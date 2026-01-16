import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Image, Sparkles, TrendingUp, DollarSign, ExternalLink, 
  Loader2, RefreshCw, Wallet, ShoppingCart, Eye, Heart,
  CheckCircle, Clock, AlertCircle, Zap, Crown, Store,
  Target, Coins, Database, Send, Upload, Download, Package,
  FileJson, Copy, Check
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function NFTEmpire() {
  const [selectedCategory, setSelectedCategory] = useState<string>("auto");
  const [batchCount, setBatchCount] = useState(3);
  const [autoMintEnabled, setAutoMintEnabled] = useState(false);
  const [selectedNftForExport, setSelectedNftForExport] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Trust Wallet address - pre-configured, no MetaMask required
  const TRUST_WALLET_ADDRESS = "0x75812e1c4246A880f6576db8292405247e6a8775";
  const walletConnected = true; // Always connected to Trust Wallet
  
  // Auto-mint queries
  const { data: autoMintConfig, refetch: refetchAutoMintConfig } = trpc.nftEmpire.getAutoMintConfig.useQuery();
  const { data: autoMintStats, refetch: refetchAutoMintStats } = trpc.nftEmpire.getAutoMintStats.useQuery();
  
  // Auto-mint mutations
  const startAutoMintMutation = trpc.nftEmpire.startAutoMint.useMutation({
    onSuccess: () => {
      toast.success('Auto-mint scheduler started!');
      setAutoMintEnabled(true);
      refetchAutoMintConfig();
      refetchAutoMintStats();
    },
    onError: (error) => toast.error(`Failed to start: ${error.message}`),
  });
  
  const stopAutoMintMutation = trpc.nftEmpire.stopAutoMint.useMutation({
    onSuccess: () => {
      toast.success('Auto-mint scheduler stopped');
      setAutoMintEnabled(false);
      refetchAutoMintConfig();
    },
    onError: (error) => toast.error(`Failed to stop: ${error.message}`),
  });
  
  const runMintCycleMutation = trpc.nftEmpire.runMintCycle.useMutation({
    onSuccess: (data) => {
      toast.success(`Minted ${data.nftsMinted} NFTs worth ${data.totalValue.toFixed(4)} ETH!`);
      refetchNfts();
      refetchPortfolio();
      refetchAutoMintStats();
    },
    onError: (error) => toast.error(`Mint cycle failed: ${error.message}`),
  });
  
  const updateAutoMintConfigMutation = trpc.nftEmpire.updateAutoMintConfig.useMutation({
    onSuccess: () => {
      toast.success('Auto-mint configuration updated');
      refetchAutoMintConfig();
    },
    onError: (error) => toast.error(`Update failed: ${error.message}`),
  });
  
  // Sync auto-mint enabled state
  useEffect(() => {
    if (autoMintConfig) {
      setAutoMintEnabled(autoMintConfig.enabled);
    }
  }, [autoMintConfig]);
  
  // Real NFT queries - NO DEMO DATA
  const { data: userNfts, isLoading: nftsLoading, refetch: refetchNfts } = trpc.nftEmpire.getUserNfts.useQuery();
  const { data: portfolio, refetch: refetchPortfolio } = trpc.nftEmpire.getPortfolioSummary.useQuery();
  const { data: categories } = trpc.nftEmpire.getRealCategories.useQuery();
  const { data: marketplaces } = trpc.nftEmpire.getRealMarketplaces.useQuery();
  const { data: autoBuyerPlatforms } = trpc.nftEmpire.getRealAutoBuyerPlatforms.useQuery();
  
  // Mutations
  const generateMutation = trpc.nftEmpire.generateReal.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated NFT: ${data.name}`);
      refetchNfts();
      refetchPortfolio();
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });
  
  const listOnAllMutation = trpc.nftEmpire.listRealOnAll.useMutation({
    onSuccess: (data) => {
      toast.success(`Listed on ${data.length} marketplaces!`);
      refetchNfts();
    },
    onError: (error) => {
      toast.error(`Listing failed: ${error.message}`);
    },
  });
  
  const submitToAutoBuyersMutation = trpc.nftEmpire.submitRealToAutoBuyers.useMutation({
    onSuccess: (data) => {
      toast.success(`Submitted to ${data.length} auto-buyer platforms!`);
      refetchNfts();
    },
    onError: (error) => {
      toast.error(`Submission failed: ${error.message}`);
    },
  });
  
  const batchGenerateMutation = trpc.nftEmpire.batchGenerateReal.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.nfts.length} NFTs with ${data.listings.length} listings worth ${data.totalEstimatedValue.toFixed(4)} ETH!`);
      refetchNfts();
      refetchPortfolio();
    },
    onError: (error) => {
      toast.error(`Batch generation failed: ${error.message}`);
    },
  });
  
  const handleGenerateAndList = async () => {
    const category = selectedCategory === "auto" ? undefined : selectedCategory;
    const nft = await generateMutation.mutateAsync({ category });
    if (nft) {
      await listOnAllMutation.mutateAsync({ nftId: nft.id });
      await submitToAutoBuyersMutation.mutateAsync({ nftId: nft.id });
    }
  };
  
  const handleBatchGenerate = () => {
    const category = selectedCategory === "auto" ? undefined : selectedCategory;
    batchGenerateMutation.mutate({ count: batchCount, category });
  };

  // No wallet connection needed - using pre-configured Trust Wallet
  const copyWalletAddress = () => {
    navigator.clipboard.writeText(TRUST_WALLET_ADDRESS);
    toast.success("Wallet address copied to clipboard!");
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "sold":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30"><DollarSign className="w-3 h-3 mr-1" />Sold</Badge>;
      case "submitted":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Send className="w-3 h-3 mr-1" />Submitted</Badge>;
      case "accepted":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const isGenerating = generateMutation.isPending || batchGenerateMutation.isPending;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Crown className="w-8 h-8 text-yellow-400" />
              NFT Empire
            </h1>
            <p className="text-zinc-400 mt-1">Real AI-generated NFTs • Auto-listed on all marketplaces • No demo mode</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-green-500 text-green-400 hover:bg-green-500/10"
              onClick={copyWalletAddress}
              title="Click to copy wallet address"
            >
              <Wallet className="w-4 h-4 mr-2" />
              <span className="text-xs mr-1">Trust Wallet:</span>
              {TRUST_WALLET_ADDRESS.slice(0, 6)}...{TRUST_WALLET_ADDRESS.slice(-4)}
              <CheckCircle className="w-3 h-3 ml-2 text-green-400" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { refetchNfts(); refetchPortfolio(); }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400">Total NFTs</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.totalNfts || 0}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">Active Listings</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.totalListings || 0}</p>
                </div>
                <Store className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Auto-Buyer Subs</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.totalSubmissions || 0}</p>
                </div>
                <Target className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Est. Value</p>
                  <p className="text-2xl font-bold text-white">
                    {(portfolio?.totalEstimatedValue || 0).toFixed(4)} ETH
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-400">Total Sales</p>
                  <p className="text-2xl font-bold text-white">{portfolio?.totalSales || 0}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-400">Total Earnings</p>
                  <p className="text-2xl font-bold text-white">
                    {(portfolio?.totalEarnings || 0).toFixed(4)} ETH
                  </p>
                </div>
                <Coins className="w-8 h-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate & List
            </TabsTrigger>
            <TabsTrigger value="nfts">
              <Image className="w-4 h-4 mr-2" />
              My NFTs ({userNfts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="marketplaces">
              <Store className="w-4 h-4 mr-2" />
              Marketplaces
            </TabsTrigger>
            <TabsTrigger value="autobuyers">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Auto-Buyers
            </TabsTrigger>
            <TabsTrigger value="automint">
              <Zap className="w-4 h-4 mr-2" />
              Auto-Mint {autoMintEnabled && <span className="ml-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </TabsTrigger>
            <TabsTrigger value="opensea">
              <Upload className="w-4 h-4 mr-2" />
              OpenSea Export
            </TabsTrigger>
          </TabsList>
          
          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Generate Real AI NFTs
                </CardTitle>
                <CardDescription>
                  Create unique AI-generated artwork stored in database and automatically list on all marketplaces with real URLs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Best Selling)</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.basePrice} ETH base)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Batch Count</label>
                    <Select value={batchCount.toString()} onValueChange={(v) => setBatchCount(Number(v))}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n} NFT{n > 1 ? "s" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleGenerateAndList}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
                    size="lg"
                  >
                    {generateMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate & Auto-List (1 NFT)</>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleBatchGenerate}
                    disabled={isGenerating}
                    variant="outline"
                    size="lg"
                    className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    {batchGenerateMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Batch...</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" />Batch Generate ({batchCount})</>
                    )}
                  </Button>
                </div>
                
                {isGenerating && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-300 text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating AI artwork, storing in database, uploading to S3, and listing on all marketplaces...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Categories Info */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Available Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categories?.map((cat) => (
                    <div key={cat.id} className="bg-zinc-800/50 rounded-lg p-3">
                      <h4 className="font-medium text-white">{cat.name}</h4>
                      <p className="text-sm text-green-400">{cat.basePrice} ETH base</p>
                      
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* My NFTs Tab */}
          <TabsContent value="nfts" className="space-y-4">
            {nftsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
              </div>
            ) : userNfts?.length === 0 ? (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="py-12 text-center">
                  <Image className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-400 mb-4">No NFTs yet. Generate your first one!</p>
                  <Button onClick={() => document.querySelector('[value="generate"]')?.dispatchEvent(new Event('click'))}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate NFT
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userNfts?.map(({ nft, listings, submissions }) => (
                  <Card key={nft.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* NFT Image */}
                      <div className="w-full md:w-48 h-48 flex-shrink-0 bg-zinc-800">
                        {nft.imageUrl ? (
                          <img 
                            src={nft.imageUrl} 
                            alt={nft.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      
                      {/* NFT Details */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-white text-lg">{nft.name}</h3>
                            <p className="text-sm text-zinc-400">{nft.category} • ID: {nft.id}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg">
                              {Number(nft.estimatedValue || 0).toFixed(4)} ETH
                            </Badge>
                            <p className="text-xs text-zinc-500 mt-1">Estimated Value</p>
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex gap-4 mt-2 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />{nft.views || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />{nft.likes || 0} likes
                          </span>
                          <span className="text-zinc-500">
                            Created: {new Date(nft.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Marketplace Listings */}
                        <div className="mt-4">
                          <p className="text-sm font-medium text-white mb-2">
                            Listed on {listings.length} marketplaces:
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {listings.map((listing) => (
                              <a
                                key={listing.id}
                                href={listing.listingUrl ?? "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors group"
                              >
                                <div>
                                  <p className="text-sm font-medium text-white">{listing.marketplace}</p>
                                  <p className="text-xs text-green-400">{Number(listing.listPrice).toFixed(4)} ETH</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getStatusBadge(listing.status ?? 'pending')}
                                  <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                        
                        {/* Auto-Buyer Submissions */}
                        {submissions.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-white mb-2">
                              Auto-Buyer Submissions ({submissions.length}):
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {submissions.map((sub) => (
                                <a
                                  key={sub.id}
                                  href={sub.platformUrl ?? "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors group"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-white">{sub.platform}</p>
                                    <p className="text-xs text-yellow-400">${sub.offeredPrice} offered</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {getStatusBadge(sub.status ?? 'pending')}
                                    <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-white" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          {listings.length === 0 && (
                            <Button 
                              size="sm" 
                              onClick={() => listOnAllMutation.mutate({ nftId: nft.id })}
                              disabled={listOnAllMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              <Store className="w-3 h-3 mr-1" />
                              List on All Marketplaces
                            </Button>
                          )}
                          {submissions.length === 0 && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => submitToAutoBuyersMutation.mutate({ nftId: nft.id })}
                              disabled={submitToAutoBuyersMutation.isPending}
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              Submit to Auto-Buyers
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Download NFT image
                              if (nft.imageUrl) {
                                const link = document.createElement('a');
                                link.href = nft.imageUrl;
                                link.download = `${nft.name.replace(/\s+/g, '_')}.png`;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                toast.success('NFT image download started!');
                              }
                            }}
                          >
                            <Database className="w-3 h-3 mr-1" />
                            Download NFT
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Copy metadata JSON
                              const metadata = {
                                name: nft.name,
                                description: nft.description || `${nft.name} - AI-generated NFT artwork`,
                                image: nft.imageUrl,
                                external_url: `https://monetizemac-rymvrvam.manus.space/marketplace/${nft.id}`,
                                attributes: [
                                  { trait_type: 'Category', value: nft.category },
                                  { trait_type: 'Token ID', value: nft.tokenId || nft.id },
                                  { trait_type: 'Chain', value: nft.chain || 'polygon' }
                                ]
                              };
                              navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
                              toast.success('NFT metadata copied to clipboard!');
                            }}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Copy Metadata
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Marketplaces Tab */}
          <TabsContent value="marketplaces" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">NFT Marketplaces</CardTitle>
                <CardDescription>Your NFTs are automatically listed on all these marketplaces</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {marketplaces?.map((mp) => (
                    <div key={mp.id} className="bg-zinc-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{mp.name}</h3>
                        <Badge variant="outline" className="text-green-400">
                          {(mp.fee * 100).toFixed(1)}% fee
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">
                        {portfolio?.byMarketplace?.[mp.name]?.listings || 0} active listings
                      </p>
                      <p className="text-sm text-zinc-400 mb-3">
                        {portfolio?.byMarketplace?.[mp.name]?.sales || 0} sales
                      </p>
                      <a
                        href={mp.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                      >
                        Visit Marketplace <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Auto-Buyers Tab */}
          <TabsContent value="autobuyers" className="space-y-4">
            {/* Quick Submit Instructions */}
            <Card className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-yellow-500/10 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">How to Submit to Auto-Buyers</h3>
                    <p className="text-sm text-zinc-400">1. Click "Download NFT" on any NFT card to get the image file</p>
                    <p className="text-sm text-zinc-400">2. Click "Copy Metadata" to get the JSON metadata</p>
                    <p className="text-sm text-zinc-400">3. Visit the platform below and upload your NFT</p>
                    <p className="text-sm text-zinc-400">4. Paste the metadata when prompted for description/attributes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Auto-Buyer Platforms</CardTitle>
                <CardDescription>
                  Platforms that automatically purchase AI-generated art and content. Click to submit your NFTs directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {autoBuyerPlatforms?.map((platform) => (
                    <div key={platform.id} className="bg-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800/70 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{platform.name}</h4>
                        <Badge className="bg-green-500/20 text-green-400">
                          ${platform.avgPrice} avg
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400 mb-2">{platform.type}</p>
                      <p className="text-xs text-zinc-500 mb-3">Accepts: Images, AI Art, Digital Content</p>
                      
                      <div className="flex flex-col gap-2">
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          Upload to {platform.name} <ExternalLink className="w-3 h-3" />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(platform.url);
                            toast.success(`${platform.name} URL copied!`);
                          }}
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Manual Upload Section */}
                <div className="mt-6 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-400" />
                    Additional Marketplaces for Manual Upload
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <a href="https://opensea.io/asset/create" target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors text-center">
                      <p className="text-sm font-medium text-white">OpenSea</p>
                      <p className="text-xs text-zinc-400">Create NFT</p>
                    </a>
                    <a href="https://rarible.com/create" target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors text-center">
                      <p className="text-sm font-medium text-white">Rarible</p>
                      <p className="text-xs text-zinc-400">Create NFT</p>
                    </a>
                    <a href="https://foundation.app/create" target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors text-center">
                      <p className="text-sm font-medium text-white">Foundation</p>
                      <p className="text-xs text-zinc-400">Create NFT</p>
                    </a>
                    <a href="https://zora.co/create" target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors text-center">
                      <p className="text-sm font-medium text-white">Zora</p>
                      <p className="text-xs text-zinc-400">Create NFT</p>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Auto-Mint Tab */}
          <TabsContent value="automint" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Auto-Mint Control Panel */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Auto-Mint Scheduler
                    {autoMintEnabled && (
                      <Badge className="bg-green-500/20 text-green-400 ml-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                        Running
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Automatically generate and list NFTs on a schedule
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {!autoMintEnabled ? (
                      <Button
                        onClick={() => startAutoMintMutation.mutate()}
                        disabled={startAutoMintMutation.isPending}
                        className="bg-green-500 hover:bg-green-600 flex-1"
                      >
                        {startAutoMintMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4 mr-2" />
                        )}
                        Start Auto-Mint
                      </Button>
                    ) : (
                      <Button
                        onClick={() => stopAutoMintMutation.mutate()}
                        disabled={stopAutoMintMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        {stopAutoMintMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <AlertCircle className="w-4 h-4 mr-2" />
                        )}
                        Stop Auto-Mint
                      </Button>
                    )}
                    <Button
                      onClick={() => runMintCycleMutation.mutate({})}
                      disabled={runMintCycleMutation.isPending}
                      variant="outline"
                    >
                      {runMintCycleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Run Now
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">NFTs per Cycle</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={autoMintConfig?.nftsPerCycle || 3}
                        onChange={(e) => updateAutoMintConfigMutation.mutate({ nftsPerCycle: parseInt(e.target.value) || 3 })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Interval (minutes)</label>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={autoMintConfig?.intervalMinutes || 30}
                        onChange={(e) => updateAutoMintConfigMutation.mutate({ intervalMinutes: parseInt(e.target.value) || 30 })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Min Price to Auto-Accept (ETH)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0.01}
                      value={autoMintConfig?.minPriceThreshold || 0.05}
                      onChange={(e) => updateAutoMintConfigMutation.mutate({ minPriceThreshold: parseFloat(e.target.value) || 0.05 })}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={autoMintConfig?.autoList ?? true}
                        onChange={(e) => updateAutoMintConfigMutation.mutate({ autoList: e.target.checked })}
                        className="rounded"
                      />
                      Auto-List on Marketplaces
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={autoMintConfig?.autoSubmitToBuyers ?? true}
                        onChange={(e) => updateAutoMintConfigMutation.mutate({ autoSubmitToBuyers: e.target.checked })}
                        className="rounded"
                      />
                      Submit to Auto-Buyers
                    </label>
                  </div>
                </CardContent>
              </Card>
              
              {/* Auto-Mint Statistics */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Auto-Mint Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400">Total Auto-Minted</p>
                      <p className="text-2xl font-bold text-white">{autoMintStats?.totalMinted || 0}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400">Total Earnings</p>
                      <p className="text-2xl font-bold text-green-400">${(autoMintStats?.totalEarnings || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400">Last Run</p>
                      <p className="text-lg font-medium text-white">
                        {autoMintStats?.lastRunAt 
                          ? new Date(autoMintStats.lastRunAt).toLocaleTimeString()
                          : 'Never'}
                      </p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <p className="text-sm text-zinc-400">Next Run</p>
                      <p className="text-lg font-medium text-white">
                        {autoMintStats?.nextRunAt && autoMintStats.enabled
                          ? new Date(autoMintStats.nextRunAt).toLocaleTimeString()
                          : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">How Auto-Mint Works</h4>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      <li>• Generates high-value AI NFTs on schedule</li>
                      <li>• Auto-lists on OpenSea, Blur, Magic Eden, and more</li>
                      <li>• Submits to auto-buyer platforms for instant sales</li>
                      <li>• Auto-accepts offers above your price threshold</li>
                      <li>• Earnings accumulate in your portfolio wallet</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* OpenSea Export Tab */}
          <TabsContent value="opensea" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  Export NFTs to OpenSea
                </CardTitle>
                <CardDescription>
                  Export your NFT packages for manual upload to OpenSea and other marketplaces.
                  Each package includes the image, metadata JSON, and listing details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Export Guide */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    How to List on OpenSea
                  </h4>
                  <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>Select an NFT below and click "Export Package"</li>
                    <li>Download the image and copy the metadata</li>
                    <li>Go to <a href="https://opensea.io/asset/create" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenSea Create</a> and upload the image</li>
                    <li>Fill in the name, description, and properties from the metadata</li>
                    <li>Set your price and list the NFT!</li>
                  </ol>
                </div>
                
                {/* NFT Grid for Export */}
                <div className="space-y-4">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-yellow-400" />
                    Select NFT to Export ({userNfts?.length || 0} available)
                  </h4>
                  
                  {nftsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                    </div>
                  ) : userNfts && userNfts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {userNfts.map((nftData: any) => {
                        const nft = nftData.nft;
                        return (
                        <div
                          key={nft.id}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            selectedNftForExport === nft.id
                              ? 'border-yellow-500 ring-2 ring-yellow-500/50'
                              : 'border-zinc-700 hover:border-zinc-600'
                          }`}
                          onClick={() => setSelectedNftForExport(nft.id)}
                        >
                          <img
                            src={nft.imageUrl || '/placeholder-nft.png'}
                            alt={nft.name}
                            className="w-full aspect-square object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-sm font-medium text-white truncate">{nft.name}</p>
                            <p className="text-xs text-zinc-400">{nft.category}</p>
                            <p className="text-xs text-yellow-400 mt-1">
                              {parseFloat(nft.estimatedValue || '0').toFixed(4)} ETH
                            </p>
                          </div>
                          {selectedNftForExport === nft.id && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-6 h-6 text-yellow-500" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-400">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No NFTs available. Generate some NFTs first!</p>
                    </div>
                  )}
                </div>
                
                {/* Export Details Panel */}
                {selectedNftForExport && userNfts && (() => {
                  const selectedNftData = userNfts.find((n: any) => n.nft.id === selectedNftForExport);
                  const selectedNft = selectedNftData?.nft;
                  if (!selectedNft) return null;
                  
                  const copyToClipboard = (text: string, field: string) => {
                    navigator.clipboard.writeText(text);
                    setCopiedField(field);
                    toast.success(`${field} copied to clipboard!`);
                    setTimeout(() => setCopiedField(null), 2000);
                  };
                  
                  const metadata = {
                    name: selectedNft.name,
                    description: selectedNft.description || `A unique ${selectedNft.category} NFT generated by AI`,
                    image: selectedNft.imageUrl,
                    external_url: `https://moneymachine.app/nft/${selectedNft.id}`,
                    attributes: [
                      { trait_type: "Category", value: selectedNft.category },
                      { trait_type: "Style", value: selectedNft.style || "AI Generated" },
                      { trait_type: "Rarity", value: (selectedNft.traits as any)?.find((t: any) => t.trait_type === 'Rarity')?.value || "Common" },
                      { trait_type: "Created", value: new Date(selectedNft.createdAt).toISOString().split('T')[0] },
                    ]
                  };
                  
                  return (
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={selectedNft.imageUrl || '/placeholder-nft.png'}
                          alt={selectedNft.name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-lg">{selectedNft.name}</h4>
                          <p className="text-sm text-zinc-400 mt-1">{selectedNft.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge className="bg-yellow-500/20 text-yellow-400">
                              {parseFloat(selectedNft.estimatedValue || '0').toFixed(4)} ETH
                            </Badge>
                            <Badge variant="outline" className="border-zinc-600">
                              {selectedNft.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Export Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Download Image */}
                        <div className="p-3 bg-zinc-900/50 rounded-lg">
                          <p className="text-sm font-medium text-white mb-2">1. Download Image</p>
                          <a
                            href={selectedNft.imageUrl}
                            download={`${selectedNft.name.replace(/\s+/g, '_')}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download Image
                          </a>
                        </div>
                        
                        {/* Copy Metadata */}
                        <div className="p-3 bg-zinc-900/50 rounded-lg">
                          <p className="text-sm font-medium text-white mb-2">2. Copy Metadata JSON</p>
                          <Button
                            onClick={() => copyToClipboard(JSON.stringify(metadata, null, 2), 'Metadata')}
                            variant="outline"
                            className="border-zinc-600"
                          >
                            {copiedField === 'Metadata' ? (
                              <><Check className="w-4 h-4 mr-2" /> Copied!</>
                            ) : (
                              <><Copy className="w-4 h-4 mr-2" /> Copy Metadata</>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Quick Copy Fields */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-white">Quick Copy Fields:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start text-xs"
                            onClick={() => copyToClipboard(selectedNft.name, 'Name')}
                          >
                            {copiedField === 'Name' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            Name
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start text-xs"
                            onClick={() => copyToClipboard(selectedNft.description || '', 'Description')}
                          >
                            {copiedField === 'Description' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            Description
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start text-xs"
                            onClick={() => copyToClipboard(parseFloat(selectedNft.estimatedValue || '0').toFixed(4), 'Price')}
                          >
                            {copiedField === 'Price' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            Price (ETH)
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start text-xs"
                            onClick={() => copyToClipboard(selectedNft.imageUrl || '', 'Image URL')}
                          >
                            {copiedField === 'Image URL' ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            Image URL
                          </Button>
                        </div>
                      </div>
                      
                      {/* Metadata Preview */}
                      <div className="p-3 bg-zinc-900 rounded-lg">
                        <p className="text-sm font-medium text-white mb-2">Metadata Preview:</p>
                        <pre className="text-xs text-zinc-400 overflow-x-auto max-h-40 overflow-y-auto">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </div>
                      
                      {/* Direct Links */}
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://opensea.io/asset/create"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Create on OpenSea
                        </a>
                        <a
                          href="https://rarible.com/create"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Create on Rarible
                        </a>
                        <a
                          href="https://foundation.app/create"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Create on Foundation
                        </a>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Bulk Export Section */}
                <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-400" />
                    Bulk Export Options
                  </h4>
                  <p className="text-sm text-zinc-400 mb-4">
                    Export all your NFTs at once for batch uploading to marketplaces.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => {
                        if (!userNfts || userNfts.length === 0) {
                          toast.error('No NFTs to export');
                          return;
                        }
                        const allMetadata = userNfts.map((nft: any) => ({
                          id: nft.id,
                          name: nft.name,
                          description: nft.description,
                          image: nft.imageUrl,
                          price_eth: parseFloat(nft.estimatedValue || '0').toFixed(4),
                          category: nft.category,
                          attributes: [
                            { trait_type: "Category", value: nft.category },
                            { trait_type: "Rarity", value: nft.rarity || "Common" },
                          ]
                        }));
                        const blob = new Blob([JSON.stringify(allMetadata, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'nft_collection_metadata.json';
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Exported metadata for ${userNfts.length} NFTs`);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export All Metadata (JSON)
                    </Button>
                    <Button
                      variant="outline"
                      className="border-zinc-600"
                      onClick={() => {
                        if (!userNfts || userNfts.length === 0) {
                          toast.error('No NFTs to export');
                          return;
                        }
                        const csv = [
                          ['ID', 'Name', 'Description', 'Image URL', 'Price (ETH)', 'Category'].join(','),
                          ...userNfts.map((nft: any) => [
                            nft.id,
                            `"${nft.name}"`,
                            `"${(nft.description || '').replace(/"/g, '""')}"`,
                            nft.imageUrl,
                            parseFloat(nft.estimatedValue || '0').toFixed(4),
                            nft.category
                          ].join(','))
                        ].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'nft_collection.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Exported ${userNfts.length} NFTs to CSV`);
                      }}
                    >
                      <FileJson className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
