import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Search, Heart, ShoppingCart, TrendingUp, Grid3X3, Filter, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';

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

// Wallet connection using wagmi/RainbowKit
function useWalletConnection() {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  
  return { 
    address: address || null, 
    isConnected,
    isConnecting, 
    disconnect 
  };
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
  
  const wallet = useWalletConnection();
  
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
  
  // Wallet auth is handled automatically by RainbowKit
  useEffect(() => {
    if (wallet.address) {
      walletAuth.mutateAsync({ walletAddress: wallet.address }).catch(console.error);
    }
  }, [wallet.address]);
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SEOHead />
      
      {/* Header - OpenSea-style Navigation */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="container mx-auto px-4">
          {/* Main Header Row */}
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <Link href="/market">
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-xl font-bold hidden sm:block">MoneyMachine</span>
              </div>
            </Link>
            
            {/* Search Bar - Center */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <Input
                  placeholder="Search NFTs, collections, and creators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border-zinc-700 rounded-xl focus:border-yellow-500 focus:ring-yellow-500/20 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Quick Links */}
              <nav className="hidden lg:flex items-center gap-1 mr-2">
                <Link href="/market">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                    Explore
                  </Button>
                </Link>
                <Link href="/collections">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                    Collections
                  </Button>
                </Link>
                <Link href="/payment-history">
                  <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Orders
                  </Button>
                </Link>
              </nav>
              
              {/* Wallet Connection - RainbowKit */}
              <div className="flex items-center gap-2">
                {wallet.address && (
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
                <ConnectButton 
                  showBalance={false}
                  chainStatus="icon"
                  accountStatus="address"
                />
              </div>
            </div>
          </div>
          
          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                placeholder="Search NFTs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-zinc-900 border-zinc-700 rounded-xl text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
          
          {/* Category Navigation Bar */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
            <Button
              variant={category === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('all')}
              className={category === 'all' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              All
            </Button>
            <Button
              variant={category === 'art' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('art')}
              className={category === 'art' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              🎨 Art
            </Button>
            <Button
              variant={category === 'photography' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('photography')}
              className={category === 'photography' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              📷 Photography
            </Button>
            <Button
              variant={category === 'music' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('music')}
              className={category === 'music' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              🎵 Music
            </Button>
            <Button
              variant={category === 'collectibles' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('collectibles')}
              className={category === 'collectibles' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              🏆 Collectibles
            </Button>
            <Button
              variant={category === 'gaming' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('gaming')}
              className={category === 'gaming' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              🎮 Gaming
            </Button>
            <Button
              variant={category === 'virtual-worlds' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategory('virtual-worlds')}
              className={category === 'virtual-worlds' ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
            >
              🌐 Virtual Worlds
            </Button>
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
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button size="lg" variant="outline" onClick={openConnectModal} className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                      <Wallet className="w-5 h-5 mr-2" />
                      Connect Wallet
                    </Button>
                  )}
                </ConnectButton.Custom>
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
          
          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-zinc-400" />
              <span className="text-zinc-400">Filters:</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-700 rounded-xl">
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
                <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700 rounded-xl">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
      <footer className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-black" />
                </div>
                <span className="text-xl font-bold">MoneyMachine</span>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                The premier NFT marketplace for digital art collectors and creators.
              </p>
              <div className="flex gap-3">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
              </div>
            </div>
            
            {/* Marketplace */}
            <div>
              <h4 className="font-semibold mb-4">Marketplace</h4>
              <ul className="space-y-2">
                <li><Link href="/market" className="text-zinc-400 hover:text-white transition-colors">Explore</Link></li>
                <li><Link href="/collections" className="text-zinc-400 hover:text-white transition-colors">Collections</Link></li>
                <li><Link href="/market?sortBy=popular" className="text-zinc-400 hover:text-white transition-colors">Trending</Link></li>
                <li><Link href="/market?category=art" className="text-zinc-400 hover:text-white transition-colors">Art</Link></li>
              </ul>
            </div>
            
            {/* Account */}
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2">
                <li><Link href="/profile" className="text-zinc-400 hover:text-white transition-colors">Profile</Link></li>
                <li><Link href="/payment-history" className="text-zinc-400 hover:text-white transition-colors">Orders</Link></li>
                <li><Link href="/watchlist" className="text-zinc-400 hover:text-white transition-colors">Watchlist</Link></li>
                <li><Link href="/" className="text-zinc-400 hover:text-white transition-colors">Settings</Link></li>
              </ul>
            </div>
            
            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="https://ethereum.org" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1">Learn about NFTs <ExternalLink className="w-3 h-3" /></a></li>
                <li><a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1">Get MetaMask <ExternalLink className="w-3 h-3" /></a></li>
                <li><a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1">Etherscan <ExternalLink className="w-3 h-3" /></a></li>
                <li><Link href="/blog" className="text-zinc-400 hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-500 text-sm">
              © 2026 MoneyMachine NFT Marketplace. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-zinc-500 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-zinc-500 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-zinc-500 hover:text-white text-sm transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
