import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Image, 
  Sparkles, 
  Wallet, 
  TrendingUp, 
  ExternalLink, 
  RefreshCw,
  Zap,
  DollarSign,
  Eye,
  Heart,
  Share2,
  Plus,
  Palette,
  Wand2,
  Brain,
  Rocket,
  Target,
  BarChart3,
  Store,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Settings
} from "lucide-react";

export default function NFTGallery() {
  const [activeTab, setActiveTab] = useState("gallery");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [batchCount, setBatchCount] = useState(5);
  const [collectionName, setCollectionName] = useState("");
  const [autoListEnabled, setAutoListEnabled] = useState(true);
  // Trust Wallet - pre-configured, no MetaMask required
  const TRUST_WALLET_ADDRESS = "0x75812e1c4246A880f6576db8292405247e6a8775";
  const OPENSEA_API_KEY = "042g5w5cQcCYJsK2CIS0jiCV8yV3qT6tMMHcUT2u031q7fpz";
  const walletConnected = true; // Always connected to Trust Wallet

  // tRPC queries
  const { data: nfts, refetch: refetchNFTs } = trpc.nft.getAllNFTs.useQuery();
  const { data: marketplaces } = trpc.nft.getMarketplaces.useQuery();
  const { data: artStyles } = trpc.nft.getArtStyles.useQuery();
  const { data: marketIntelligence, refetch: refetchIntelligence } = trpc.nft.getMarketIntelligence.useQuery();

  // tRPC mutations
  const generateMutation = trpc.nft.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`NFT "${data.name}" generated successfully!`);
      refetchNFTs();
      refetchIntelligence();
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    }
  });

  const autoListMutation = trpc.nft.autoList.useMutation({
    onSuccess: (data) => {
      toast.success(`Listed on ${data.listings.length} marketplaces!`);
      refetchNFTs();
    },
    onError: (error) => {
      toast.error(`Listing failed: ${error.message}`);
    }
  });

  const batchGenerateMutation = trpc.nft.batchGenerate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.generated} NFTs, listed ${data.listed}!`);
      refetchNFTs();
      refetchIntelligence();
      setIsBatchGenerating(false);
    },
    onError: (error) => {
      toast.error(`Batch generation failed: ${error.message}`);
      setIsBatchGenerating(false);
    }
  });

  const handleGenerateArt = async () => {
    if (!prompt && !selectedStyle) {
      toast.error("Please enter a prompt or select a style");
      return;
    }
    
    setIsGenerating(true);
    toast.info("Generating NFT artwork with AI...");
    
    try {
      await generateMutation.mutateAsync({
        style: selectedStyle || undefined,
        customPrompt: prompt || undefined,
        collectionName: nftName || undefined
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!collectionName) {
      toast.error("Please enter a collection name");
      return;
    }

    setIsBatchGenerating(true);
    toast.info(`Starting batch generation of ${batchCount} NFTs...`);
    
    await batchGenerateMutation.mutateAsync({
      count: batchCount,
      collectionName,
      style: selectedStyle || undefined
    });
  };

  const handleAutoList = async (nftId: string) => {
    toast.info("Listing on all marketplaces...");
    await autoListMutation.mutateAsync({ nftId });
  };

  // Copy wallet address to clipboard
  const copyWalletAddress = () => {
    navigator.clipboard.writeText(TRUST_WALLET_ADDRESS);
    toast.success("Trust Wallet address copied!");
  };

  // Copy OpenSea API key to clipboard
  const copyOpenSeaKey = () => {
    navigator.clipboard.writeText(OPENSEA_API_KEY);
    toast.success("OpenSea API key copied!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "listed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Listed</Badge>;
      case "sold":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Sold</Badge>;
      case "generated":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Generated</Badge>;
      case "minted":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Minted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!nfts) return { total: 0, listed: 0, sold: 0, totalValue: 0 };
    return {
      total: nfts.length,
      listed: nfts.filter(n => n.status === "listed").length,
      sold: nfts.filter(n => n.status === "sold").length,
      totalValue: nfts.reduce((sum, n) => sum + n.suggestedPrice, 0)
    };
  }, [nfts]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Palette className="w-8 h-8 text-purple-500" />
              NFT Automation Center
            </h1>
            <p className="text-zinc-400 mt-1">
              AI-powered NFT generation, pricing, and auto-listing across all marketplaces
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              onClick={copyOpenSeaKey}
              title="Click to copy OpenSea API key"
            >
              <Store className="w-4 h-4 mr-2" />
              <span className="text-xs">OpenSea: ...7fpz</span>
              <CheckCircle className="w-3 h-3 ml-1 text-green-400" />
            </Button>
            <Button 
              variant="outline" 
              className="border-green-500 text-green-400 hover:bg-green-500/10"
              onClick={copyWalletAddress}
              title="Click to copy Trust Wallet address"
            >
              <Wallet className="w-4 h-4 mr-2" />
              <span className="text-xs">Trust:</span>
              {TRUST_WALLET_ADDRESS.slice(0, 6)}...{TRUST_WALLET_ADDRESS.slice(-4)}
              <CheckCircle className="w-3 h-3 ml-1 text-green-400" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Total NFTs</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Image className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Listed</p>
                  <p className="text-2xl font-bold text-white">{stats.listed}</p>
                </div>
                <Store className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">Sold</p>
                  <p className="text-2xl font-bold text-white">{stats.sold}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400">Total Value</p>
                  <p className="text-2xl font-bold text-white">{stats.totalValue.toFixed(2)} ETH</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-400">Marketplaces</p>
                  <p className="text-2xl font-bold text-white">{marketplaces?.length || 0}</p>
                </div>
                <Globe className="w-8 h-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OpenSea API Status */}
        <Card className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Store className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    OpenSea API Integration
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </h3>
                  <p className="text-sm text-zinc-400">Connected • Real-time marketplace data • Auto-listing enabled</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-500">API Key</p>
                  <p className="text-sm font-mono text-blue-400">...{OPENSEA_API_KEY.slice(-8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Trust Wallet</p>
                  <p className="text-sm font-mono text-green-400">{TRUST_WALLET_ADDRESS.slice(0, 8)}...{TRUST_WALLET_ADDRESS.slice(-6)}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => window.open('https://opensea.io', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View on OpenSea
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="gallery" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Image className="w-4 h-4 mr-2" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Wand2 className="w-4 h-4 mr-2" />
              Create NFT
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Rocket className="w-4 h-4 mr-2" />
              Batch Generate
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              Market Intelligence
            </TabsTrigger>
            <TabsTrigger value="marketplaces" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Store className="w-4 h-4 mr-2" />
              Marketplaces
            </TabsTrigger>
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="mt-4">
            {nfts && nfts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nfts.map((nft) => (
                  <Card key={nft.id} className="bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50 transition-all overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <img 
                        src={nft.imageUrl} 
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/400/400?random=${nft.id}`;
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white truncate">{nft.name}</h3>
                        {getStatusBadge(nft.status)}
                      </div>
                      <p className="text-lg font-bold text-purple-400 mb-2">{nft.suggestedPrice} ETH</p>
                      <p className="text-xs text-zinc-500 mb-3">Style: {nft.style}</p>
                      
                      {/* Listings */}
                      {nft.listings && nft.listings.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-zinc-400 mb-1">Listed on:</p>
                          <div className="flex flex-wrap gap-1">
                            {nft.listings.slice(0, 3).map((listing, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {listing.marketplace}
                              </Badge>
                            ))}
                            {nft.listings.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{nft.listings.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {nft.status === "generated" && (
                          <Button 
                            size="sm" 
                            className="flex-1 bg-purple-500 hover:bg-purple-600"
                            onClick={() => handleAutoList(nft.id)}
                          >
                            <Store className="w-3 h-3 mr-1" />
                            List All
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Image className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">No NFTs Yet</h3>
                  <p className="text-zinc-400 mb-4">Start generating AI artwork to build your collection</p>
                  <Button onClick={() => setActiveTab("create")} className="bg-purple-500 hover:bg-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First NFT
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Create NFT Tab */}
          <TabsContent value="create" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Art Generator */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-500" />
                    AI Art Generator
                  </CardTitle>
                  <CardDescription>
                    Generate unique NFT artwork using AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Art Style</label>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select a style (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {artStyles?.map((style) => (
                          <SelectItem key={style.style} value={style.style}>
                            <div className="flex items-center justify-between w-full">
                              <span className="capitalize">{style.style}</span>
                              <span className="text-xs text-zinc-400 ml-2">~{style.avgPrice} ETH</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Custom Prompt (optional)</label>
                    <Textarea 
                      placeholder="Describe the artwork you want to create..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">NFT Name</label>
                    <Input 
                      placeholder="My Awesome NFT"
                      value={nftName}
                      onChange={(e) => setNftName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-400">Auto-list on all marketplaces</label>
                    <Switch checked={autoListEnabled} onCheckedChange={setAutoListEnabled} />
                  </div>

                  <Button 
                    onClick={handleGenerateArt}
                    disabled={isGenerating || generateMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isGenerating || generateMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate NFT
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Styles */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-500" />
                    Popular Styles
                  </CardTitle>
                  <CardDescription>
                    Click to generate with trending styles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {artStyles?.slice(0, 8).map((style) => (
                      <Button
                        key={style.style}
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-start"
                        onClick={() => {
                          setSelectedStyle(style.style);
                          handleGenerateArt();
                        }}
                        disabled={isGenerating}
                      >
                        <span className="capitalize font-semibold">{style.style}</span>
                        <span className="text-xs text-zinc-400">~{style.avgPrice} ETH • {style.popularity}% popular</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Batch Generate Tab */}
          <TabsContent value="batch" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-purple-500" />
                    Batch NFT Generation
                  </CardTitle>
                  <CardDescription>
                    Generate and auto-list multiple NFTs at once
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Collection Name *</label>
                    <Input 
                      placeholder="My Amazing Collection"
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

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
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                      <span>1</span>
                      <span>25</span>
                      <span>50</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block">Art Style (optional)</label>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Random styles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Random (AI chooses best)</SelectItem>
                        {artStyles?.map((style) => (
                          <SelectItem key={style.style} value={style.style}>
                            {style.style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-2">Batch Summary</h4>
                    <div className="space-y-1 text-sm text-zinc-400">
                      <p>• {batchCount} NFTs will be generated</p>
                      <p>• Auto-listed on {marketplaces?.filter(m => m.autoList).length || 0} marketplaces</p>
                      <p>• Estimated value: ~{(batchCount * 0.1).toFixed(2)} ETH</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleBatchGenerate}
                    disabled={isBatchGenerating || !collectionName}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isBatchGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating {batchCount} NFTs...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Generate & List {batchCount} NFTs
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generation Progress */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Generation Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-purple-400">{marketIntelligence?.totalGenerated || 0}</p>
                      <p className="text-sm text-zinc-400">Total Generated</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-400">{marketIntelligence?.totalListed || 0}</p>
                      <p className="text-sm text-zinc-400">Total Listed</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-blue-400">{marketIntelligence?.totalSold || 0}</p>
                      <p className="text-sm text-zinc-400">Total Sold</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-400">
                        {marketIntelligence?.priceRecommendations?.moderate?.toFixed(3) || "0.100"} ETH
                      </p>
                      <p className="text-sm text-zinc-400">Avg Price</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Top Performing Styles</h4>
                    <div className="space-y-2">
                      {marketIntelligence?.topStyles?.slice(0, 5).map((style, i) => (
                        <div key={style.style} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">#{i + 1}</span>
                            <span className="capitalize text-white">{style.style}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-400">{style.sales} sales</span>
                            <span className="text-sm text-zinc-400">{style.avgPrice.toFixed(3)} ETH</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Market Intelligence Tab */}
          <TabsContent value="intelligence" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    AI Learning Insights
                  </CardTitle>
                  <CardDescription>
                    The system learns what sells best and optimizes automatically
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-2">Price Recommendations</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-green-400">
                          {marketIntelligence?.priceRecommendations?.conservative?.toFixed(3) || "0.070"} ETH
                        </p>
                        <p className="text-xs text-zinc-400">Conservative</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-yellow-400">
                          {marketIntelligence?.priceRecommendations?.moderate?.toFixed(3) || "0.100"} ETH
                        </p>
                        <p className="text-xs text-zinc-400">Moderate</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-400">
                          {marketIntelligence?.priceRecommendations?.aggressive?.toFixed(3) || "0.150"} ETH
                        </p>
                        <p className="text-xs text-zinc-400">Aggressive</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Learning Progress</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-400">Style Optimization</span>
                          <span className="text-purple-400">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-400">Price Intelligence</span>
                          <span className="text-purple-400">72%</span>
                        </div>
                        <Progress value={72} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-400">Marketplace Performance</span>
                          <span className="text-purple-400">90%</span>
                        </div>
                        <Progress value={90} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Top Marketplaces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketIntelligence?.topMarketplaces?.map((mp, i) => (
                      <div key={mp.name} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-purple-400">#{i + 1}</span>
                          <div>
                            <p className="font-medium text-white">{mp.name}</p>
                            <p className="text-xs text-zinc-400">{mp.sales} sales</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">{mp.avgPrice.toFixed(3)} ETH</p>
                          <p className="text-xs text-zinc-400">avg price</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Marketplaces Tab */}
          <TabsContent value="marketplaces" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-500" />
                  Connected Marketplaces
                </CardTitle>
                <CardDescription>
                  Your NFTs are automatically listed on all these platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketplaces?.map((mp) => (
                    <div key={mp.name} className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 hover:border-purple-500/50 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">{mp.name}</h3>
                        {mp.autoList ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Auto-List
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-400">
                            <Clock className="w-3 h-3 mr-1" />
                            Manual
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Fee</span>
                          <span className="text-white">{mp.fee}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Min Price</span>
                          <span className="text-white">{mp.minPrice} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Max Royalty</span>
                          <span className="text-white">{mp.maxRoyalty}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Chains</span>
                          <span className="text-white">{mp.chains.slice(0, 2).join(", ")}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => window.open(mp.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Visit
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
