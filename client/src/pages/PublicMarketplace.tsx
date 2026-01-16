import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Search, Heart, ShoppingCart, TrendingUp, Grid3X3, Filter, ChevronRight, ExternalLink, Sparkles } from "lucide-react";

// SEO Head component
function SEOHead() {
  useEffect(() => {
    document.title = "NFT Marketplace - Buy & Sell Digital Art | MoneyMachine";
    
    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Discover and collect unique digital art NFTs. Browse thousands of NFTs from talented creators. Connect your wallet and start collecting today.");
    
    // Open Graph tags
    const ogTags = [
      { property: "og:title", content: "NFT Marketplace - MoneyMachine" },
      { property: "og:description", content: "Discover and collect unique digital art NFTs" },
      { property: "og:type", content: "website" },
    ];
    
    ogTags.forEach(tag => {
      let el = document.querySelector(`meta[property="${tag.property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", tag.property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", tag.content);
    });
  }, []);
  
  return null;
}

// Wallet connection state (simplified - in production use wagmi/viem)
function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const connect = async () => {
    setIsConnecting(true);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts[0]) {
          setAddress(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
        }
      } else {
        alert("Please install MetaMask to connect your wallet");
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
    setIsConnecting(false);
  };
  
  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem("walletAddress");
  };
  
  useEffect(() => {
    const saved = localStorage.getItem("walletAddress");
    if (saved) setAddress(saved);
  }, []);
  
  return { address, isConnecting, connect, disconnect };
}

// NFT Card component
function NFTCard({ nft, onFavorite }: { nft: any; onFavorite?: (id: number) => void }) {
  const [isLiked, setIsLiked] = useState(false);
  
  return (
    <Card className="group overflow-hidden bg-zinc-900 border-zinc-800 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={nft.imageUrl || "/placeholder-nft.png"}
          alt={nft.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className="bg-zinc-900/80 text-white border-0">
            {nft.chain || "ETH"}
          </Badge>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsLiked(!isLiked);
            onFavorite?.(nft.id);
          }}
          className="absolute top-3 left-3 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 transition-colors"
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-white truncate">{nft.name}</h3>
            <p className="text-sm text-zinc-400">{nft.category}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-xs text-zinc-500">Price</p>
            <p className="text-lg font-bold text-yellow-500">
              {parseFloat(String(nft.listPrice || nft.estimatedValue || 0)).toFixed(4)} ETH
            </p>
          </div>
          <Link href={`/nft/${nft.id}`}>
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Public Marketplace Page
export default function PublicMarketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [priceRange, setPriceRange] = useState<string>("");
  
  const wallet = useWallet();
  
  // Fetch data
  const { data: stats } = trpc.publicMarketplace.getStats.useQuery();
  const { data: featured } = trpc.publicMarketplace.getFeatured.useQuery({ limit: 4 });
  const { data: categories } = trpc.publicMarketplace.getCategories.useQuery();
  const { data: nftsData, isLoading } = trpc.publicMarketplace.getNFTs.useQuery({
    limit: 20,
    category: category && category !== 'all' ? category : undefined,
    search: search || undefined,
    sortBy: sortBy as any,
    minPrice: priceRange === "under1" ? undefined : priceRange === "1to5" ? 1 : priceRange === "over5" ? 5 : undefined,
    maxPrice: priceRange === "under1" ? 1 : priceRange === "1to5" ? 5 : priceRange === "all" ? undefined : undefined,
  });
  
  // Auth mutation for wallet
  const walletAuth = trpc.publicMarketplace.walletAuth.useMutation();
  
  const handleWalletConnect = async () => {
    await wallet.connect();
    if (wallet.address) {
      await walletAuth.mutateAsync({ walletAddress: wallet.address });
    }
  };
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SEOHead />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/market">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-xl font-bold">NFT Market</span>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/market" className="text-zinc-400 hover:text-white transition-colors">Explore</Link>
              <Link href="/market/collections" className="text-zinc-400 hover:text-white transition-colors">Collections</Link>
              {wallet.address && (
                <>
                  <Link href="/market/favorites" className="text-zinc-400 hover:text-white transition-colors">Favorites</Link>
                  <Link href="/market/profile" className="text-zinc-400 hover:text-white transition-colors">Profile</Link>
                </>
              )}
            </nav>
            
            <div className="flex items-center gap-3">
              {wallet.address ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={wallet.disconnect}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleWalletConnect}
                  disabled={wallet.isConnecting}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {wallet.isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Discover & Collect
              <span className="text-yellow-500"> Unique NFTs</span>
            </h1>
            <p className="text-xl text-zinc-400 mb-8">
              Explore thousands of digital artworks from talented creators around the world.
              Connect your wallet and start your collection today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                <Grid3X3 className="w-5 h-5 mr-2" />
                Explore NFTs
              </Button>
              {!wallet.address && (
                <Button size="lg" variant="outline" onClick={handleWalletConnect} className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats Bar */}
      <section className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats?.totalListed || 0}</p>
              <p className="text-sm text-zinc-400">NFTs Listed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats?.totalSales || 0}</p>
              <p className="text-sm text-zinc-400">Total Sales</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">
                {parseFloat(String(stats?.totalVolume || 0)).toFixed(2)} ETH
              </p>
              <p className="text-sm text-zinc-400">Volume Traded</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats?.uniqueBuyers || 0}</p>
              <p className="text-sm text-zinc-400">Collectors</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured NFTs */}
      {featured && featured.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-yellow-500" />
                  Featured NFTs
                </h2>
                <p className="text-zinc-400 mt-1">Most popular artworks this week</p>
              </div>
              <Link href="/market">
                <Button variant="ghost" className="text-yellow-500 hover:text-yellow-400">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((nft: any) => (
                <NFTCard key={nft.id} nft={nft} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Browse Section */}
      <section className="py-16 bg-zinc-900/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Browse Marketplace</h2>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search NFTs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-700"
                />
              </div>
            </div>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat: any) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under1">Under 1 ETH</SelectItem>
                <SelectItem value="1to5">1 - 5 ETH</SelectItem>
                <SelectItem value="over5">Over 5 ETH</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* NFT Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
                  <div className="aspect-square bg-zinc-800" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-zinc-800 rounded mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : nftsData?.nfts && nftsData.nfts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {nftsData.nfts.map((nft: any) => (
                  <NFTCard key={nft.id} nft={nft} />
                ))}
              </div>
              <div className="text-center mt-8 text-zinc-400">
                Showing {nftsData.nfts.length} of {nftsData.total} NFTs
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Grid3X3 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No NFTs Found</h3>
              <p className="text-zinc-400">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="font-bold">NFT Market</span>
            </div>
            <p className="text-zinc-400 text-sm">
              © 2026 MoneyMachine NFT Marketplace. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
