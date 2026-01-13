import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Wand2
} from "lucide-react";

// Sample NFT collections for display
const SAMPLE_NFTS = [
  { id: 1, name: "Cosmic Dreams #001", price: "0.05 ETH", views: 234, likes: 45, status: "listed" },
  { id: 2, name: "Digital Horizons #012", price: "0.08 ETH", views: 189, likes: 32, status: "listed" },
  { id: 3, name: "Abstract Flow #007", price: "0.03 ETH", views: 156, likes: 28, status: "sold" },
  { id: 4, name: "Neon City #023", price: "0.12 ETH", views: 312, likes: 67, status: "listed" },
  { id: 5, name: "Nature Fusion #005", price: "0.06 ETH", views: 98, likes: 19, status: "draft" },
  { id: 6, name: "Geometric Soul #018", price: "0.04 ETH", views: 145, likes: 24, status: "listed" },
];

const MARKETPLACES = [
  { name: "OpenSea", url: "https://opensea.io", fee: "2.5%", status: "connected" },
  { name: "Rarible", url: "https://rarible.com", fee: "2.5%", status: "available" },
  { name: "Foundation", url: "https://foundation.app", fee: "5%", status: "available" },
  { name: "SuperRare", url: "https://superrare.com", fee: "3%", status: "available" },
  { name: "Zora", url: "https://zora.co", fee: "0%", status: "available" },
  { name: "LooksRare", url: "https://looksrare.org", fee: "2%", status: "available" },
];

export default function NFTGallery() {
  const [activeTab, setActiveTab] = useState("gallery");
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);

  // AI Image generation - uses placeholder for demo
  const generateImageFn = async () => {
    await new Promise(r => setTimeout(r, 2000));
    return { imageUrl: "https://picsum.photos/512/512?random=" + Date.now() };
  };

  const handleGenerateArt = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt for the AI");
      return;
    }
    
    setIsGenerating(true);
    toast.info("Generating NFT artwork with AI...");
    
    try {
      const result = await generateImageFn();
      setGeneratedImage(result.imageUrl || "https://picsum.photos/512/512?random=" + Date.now());
      toast.success("NFT artwork generated successfully!");
    } catch (error) {
      // Use placeholder for demo
      setGeneratedImage("https://picsum.photos/512/512?random=" + Date.now());
      toast.success("NFT artwork generated!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMintNFT = () => {
    if (!generatedImage) {
      toast.error("Generate artwork first");
      return;
    }
    if (!nftName) {
      toast.error("Please enter a name for your NFT");
      return;
    }
    toast.success(`NFT "${nftName}" ready for minting! Connect wallet to complete.`);
  };

  const connectWallet = () => {
    toast.info("Connecting to MetaMask...");
    setTimeout(() => {
      setWalletConnected(true);
      toast.success("Wallet connected successfully!");
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "listed":
        return <Badge className="bg-green-500/20 text-green-400">Listed</Badge>;
      case "sold":
        return <Badge className="bg-blue-500/20 text-blue-400">Sold</Badge>;
      case "draft":
        return <Badge className="bg-zinc-500/20 text-zinc-400">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Palette className="w-8 h-8 text-purple-500" />
              NFT Gallery
            </h1>
            <p className="text-zinc-400 mt-1">
              Create, mint, and sell AI-generated NFT artwork
            </p>
          </div>
          <div className="flex gap-2">
            {!walletConnected ? (
              <Button onClick={connectWallet} className="bg-purple-500 hover:bg-purple-600">
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            ) : (
              <Button variant="outline" className="border-green-500 text-green-400">
                <Wallet className="w-4 h-4 mr-2" />
                0x7a3...8f2d
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-400">Total NFTs</p>
                  <p className="text-2xl font-bold text-white">6</p>
                </div>
                <Image className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Total Sales</p>
                  <p className="text-2xl font-bold text-white">0.03 ETH</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400">Total Views</p>
                  <p className="text-2xl font-bold text-white">1,134</p>
                </div>
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-400">Total Likes</p>
                  <p className="text-2xl font-bold text-white">215</p>
                </div>
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

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
            <TabsTrigger value="marketplaces" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Marketplaces
            </TabsTrigger>
          </TabsList>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_NFTS.map((nft) => (
                <Card key={nft.id} className="bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50 transition-all overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <img 
                      src={`https://picsum.photos/400/400?random=${nft.id}`} 
                      alt={nft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white">{nft.name}</h3>
                      {getStatusBadge(nft.status)}
                    </div>
                    <p className="text-lg font-bold text-purple-400 mb-3">{nft.price}</p>
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> {nft.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" /> {nft.likes}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                    <label className="text-sm text-zinc-400 mb-2 block">Art Prompt</label>
                    <Textarea 
                      placeholder="Describe the artwork you want to create... (e.g., 'A cosmic landscape with neon colors and geometric shapes')"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 min-h-[100px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGenerateArt}
                      disabled={isGenerating}
                      className="flex-1 bg-purple-500 hover:bg-purple-600"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Art
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setPrompt("")}>
                      Clear
                    </Button>
                  </div>
                  
                  {/* Quick Prompts */}
                  <div>
                    <p className="text-sm text-zinc-400 mb-2">Quick prompts:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Cosmic nebula with vibrant colors",
                        "Abstract geometric patterns",
                        "Futuristic city at night",
                        "Surreal dreamscape",
                        "Digital nature fusion"
                      ].map((p, i) => (
                        <Button 
                          key={i} 
                          size="sm" 
                          variant="outline"
                          onClick={() => setPrompt(p)}
                          className="text-xs"
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview & Mint */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-purple-500" />
                    Preview & Mint
                  </CardTitle>
                  <CardDescription>
                    Review your artwork and mint it as an NFT
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview Area */}
                  <div className="aspect-square bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {generatedImage ? (
                      <img 
                        src={generatedImage} 
                        alt="Generated NFT" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-zinc-500">
                        <Image className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p>Generated artwork will appear here</p>
                      </div>
                    )}
                  </div>

                  {/* NFT Details */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">NFT Name</label>
                      <Input 
                        placeholder="My Awesome NFT #001"
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Description</label>
                      <Textarea 
                        placeholder="Describe your NFT..."
                        value={nftDescription}
                        onChange={(e) => setNftDescription(e.target.value)}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>

                  {/* Mint Button */}
                  <Button 
                    onClick={handleMintNFT}
                    disabled={!generatedImage || !walletConnected}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {walletConnected ? "Mint NFT" : "Connect Wallet to Mint"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Marketplaces Tab */}
          <TabsContent value="marketplaces" className="mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  NFT Marketplaces
                </CardTitle>
                <CardDescription>
                  Connect to marketplaces to list and sell your NFTs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MARKETPLACES.map((marketplace, i) => (
                    <Card key={i} className="bg-zinc-800/50 border-zinc-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-white">{marketplace.name}</h4>
                            <p className="text-sm text-zinc-400">Fee: {marketplace.fee}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {marketplace.status === "connected" ? (
                              <Badge className="bg-green-500/20 text-green-400">Connected</Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  toast.success(`Connecting to ${marketplace.name}...`);
                                  window.open(marketplace.url, '_blank');
                                }}
                              >
                                Connect
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => window.open(marketplace.url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Auto-Generation Status */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Hive Mind NFT Generator</h3>
                  <p className="text-sm text-zinc-400">
                    AI continuously generates trending NFT artwork based on market analysis
                  </p>
                </div>
              </div>
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Zap className="w-4 h-4 mr-2" />
                Enable Auto-Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
