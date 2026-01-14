import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  Search, Filter, Grid, List, ShoppingCart, Heart, Eye, 
  ExternalLink, TrendingUp, DollarSign, Image,
  ArrowUpDown, Clock, Sparkles, Crown, Zap, Share2,
  Twitter, Facebook, Copy, CheckCircle, AlertCircle
} from "lucide-react";
import { ConnectWallet, useWallet } from "@/components/ConnectWallet";

// SEO Meta component
function SEOHead() {
  useEffect(() => {
    // Update document title
    document.title = "NFT Marketplace - Buy & Sell AI-Generated Digital Art | MoneyMachine";
    
    // Update meta tags
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Discover and collect unique AI-generated NFTs. Browse our curated marketplace of digital art, generative pieces, and exclusive collections. Buy, sell, and trade with confidence.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Discover and collect unique AI-generated NFTs. Browse our curated marketplace of digital art, generative pieces, and exclusive collections. Buy, sell, and trade with confidence.';
      document.head.appendChild(meta);
    }
    
    // Add Open Graph tags
    const ogTags = [
      { property: 'og:title', content: 'NFT Marketplace - AI-Generated Digital Art' },
      { property: 'og:description', content: 'Browse and collect unique AI-generated NFTs. Digital art, generative pieces, and exclusive collections.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:image', content: '/nft-marketplace-og.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'NFT Marketplace - AI-Generated Digital Art' },
      { name: 'twitter:description', content: 'Browse and collect unique AI-generated NFTs.' },
    ];
    
    ogTags.forEach(tag => {
      const existing = document.querySelector(`meta[${tag.property ? 'property' : 'name'}="${tag.property || tag.name}"]`);
      if (existing) {
        existing.setAttribute('content', tag.content);
      } else {
        const meta = document.createElement('meta');
        if (tag.property) meta.setAttribute('property', tag.property);
        if (tag.name) meta.name = tag.name;
        meta.content = tag.content;
        document.head.appendChild(meta);
      }
    });
    
    // Add JSON-LD structured data
    const existingJsonLd = document.querySelector('script[type="application/ld+json"]');
    if (existingJsonLd) existingJsonLd.remove();
    
    const jsonLd = document.createElement('script');
    jsonLd.type = 'application/ld+json';
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NFT Marketplace",
      "description": "Discover and collect unique AI-generated NFTs",
      "url": window.location.href,
      "mainEntity": {
        "@type": "ItemList",
        "name": "NFT Collection",
        "description": "AI-generated digital art NFTs for sale",
        "itemListElement": []
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": window.location.origin + "/marketplace?search={search_term}",
        "query-input": "required name=search_term"
      }
    });
    document.head.appendChild(jsonLd);
    
    return () => {
      // Cleanup on unmount
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, []);
  
  return null;
}

// NFT Card Component
function NFTCard({ nft, onBuy, onView }: { 
  nft: any; 
  onBuy: (nft: any) => void;
  onView: (nft: any) => void;
}) {
  const [isLiked, setIsLiked] = useState(false);
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      abstract: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      generative: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      pixel: "bg-green-500/20 text-green-400 border-green-500/30",
      "3d": "bg-orange-500/20 text-orange-400 border-orange-500/30",
      photography: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      anime: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[category?.toLowerCase()] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };
  
  return (
    <Card className="group overflow-hidden bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={nft.imageUrl || nft.thumbnailUrl || '/placeholder-nft.png'} 
          alt={nft.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Quick actions overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            size="sm" 
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            onClick={() => onBuy(nft)}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Buy Now
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="border-white/30 hover:bg-white/10"
            onClick={() => onView(nft)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Like button */}
        <button 
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
        
        {/* Category badge */}
        <Badge className={`absolute top-3 left-3 ${getCategoryColor(nft.category)}`}>
          {nft.category}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-bold text-lg text-white truncate mb-1">{nft.name}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{nft.description}</p>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Current Price</p>
            <p className="text-lg font-bold text-yellow-400">
              {parseFloat(nft.estimatedValue || nft.listPrice || '0.05').toFixed(4)} ETH
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Views</p>
            <p className="text-sm text-gray-300 flex items-center gap-1">
              <Eye className="w-3 h-3" /> {nft.views || 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// NFT Detail Modal
function NFTDetailModal({ nft, isOpen, onClose, onBuy }: {
  nft: any;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (nft: any) => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/marketplace/nft/${nft?.id}` : '';
  
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard!');
  };
  
  if (!nft) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden">
            <img 
              src={nft.imageUrl || '/placeholder-nft.png'} 
              alt={nft.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Details */}
          <div className="flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{nft.name}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {nft.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-4 flex-1">
              {/* Price */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                <p className="text-sm text-gray-400">Current Price</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {parseFloat(nft.estimatedValue || '0.05').toFixed(4)} ETH
                </p>
                <p className="text-sm text-gray-500">
                  ≈ ${(parseFloat(nft.estimatedValue || '0.05') * 3500).toFixed(2)} USD
                </p>
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="font-medium capitalize">{nft.category}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500">Chain</p>
                  <p className="font-medium capitalize">{nft.chain || 'Ethereum'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500">Token ID</p>
                  <p className="font-medium truncate">{nft.tokenId || 'Pending'}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500">Views</p>
                  <p className="font-medium">{nft.views || 0}</p>
                </div>
              </div>
              
              {/* Traits */}
              {nft.traits && nft.traits.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Traits</p>
                  <div className="flex flex-wrap gap-2">
                    {nft.traits.map((trait: any, i: number) => (
                      <Badge key={i} variant="outline" className="border-gray-600">
                        {trait.trait_type}: {trait.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="mt-4 space-y-3">
              <Button 
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold text-lg py-6"
                onClick={() => onBuy(nft)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Buy Now for {parseFloat(nft.estimatedValue || '0.05').toFixed(4)} ETH
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-gray-600" onClick={copyLink}>
                  {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" className="border-gray-600" asChild>
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this amazing NFT: ${nft.name}`)}`} target="_blank" rel="noopener noreferrer">
                    <Twitter className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="outline" className="border-gray-600" asChild>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                    <Facebook className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sell NFT Modal
function SellNFTModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'abstract' as 'abstract' | 'generative' | 'pixel' | '3d' | 'photography' | 'anime',
    price: '0.05',
    imageUrl: '',
    imageBase64: '',
    chain: 'polygon' as 'ethereum' | 'polygon' | 'sepolia' | 'amoy',
    royaltyPercentage: 2.5,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const submitMutation = trpc.marketplace.submitUserNft.useMutation({
    onSuccess: (data) => {
      toast.success('NFT submitted successfully!', {
        description: `Token ID: ${data.tokenId}`,
      });
      setFormData({
        name: '',
        description: '',
        category: 'abstract',
        price: '0.05',
        imageUrl: '',
        imageBase64: '',
        chain: 'polygon',
        royaltyPercentage: 2.5,
      });
      setImagePreview(null);
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to submit NFT', {
        description: error.message,
      });
    },
  });
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large', { description: 'Max file size is 5MB' });
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData({ ...formData, imageBase64: base64, imageUrl: '' });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };
  
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name for your NFT');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!formData.imageBase64 && !formData.imageUrl) {
      toast.error('Please upload an image or provide an image URL');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        imageBase64: formData.imageBase64 || undefined,
        imageUrl: formData.imageUrl || undefined,
        chain: formData.chain,
        royaltyPercentage: formData.royaltyPercentage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            List Your NFT for Sale
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Submit your NFT to be listed on our marketplace. Images are uploaded to secure storage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-gray-300">NFT Image</label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg border border-gray-700"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-gray-900/80"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData({ ...formData, imageBase64: '' });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-yellow-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="w-12 h-12 mx-auto text-gray-500 mb-2" />
                  <p className="text-gray-400">Click to upload image</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Or provide an image URL:</p>
            <Input 
              placeholder="https://..."
              value={formData.imageUrl}
              onChange={(e) => {
                setFormData({...formData, imageUrl: e.target.value, imageBase64: ''});
                setImagePreview(e.target.value || null);
              }}
              className="mt-1 bg-gray-800 border-gray-700"
              disabled={!!formData.imageBase64}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300">NFT Name</label>
            <Input 
              placeholder="My Amazing NFT"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="mt-1 bg-gray-800 border-gray-700"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-300">Description</label>
            <Input 
              placeholder="Describe your NFT..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="mt-1 bg-gray-800 border-gray-700"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Category</label>
              <Select value={formData.category} onValueChange={(v: any) => setFormData({...formData, category: v})}>
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abstract">Abstract Art</SelectItem>
                  <SelectItem value="generative">Generative Art</SelectItem>
                  <SelectItem value="pixel">Pixel Art</SelectItem>
                  <SelectItem value="3d">3D Art</SelectItem>
                  <SelectItem value="photography">AI Photography</SelectItem>
                  <SelectItem value="anime">Anime Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300">Blockchain</label>
              <Select value={formData.chain} onValueChange={(v: any) => setFormData({...formData, chain: v})}>
                <SelectTrigger className="mt-1 bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="sepolia">Sepolia (Testnet)</SelectItem>
                  <SelectItem value="amoy">Amoy (Testnet)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Price (ETH)</label>
              <Input 
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.05"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="mt-1 bg-gray-800 border-gray-700"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300">Royalty %</label>
              <Input 
                type="number"
                step="0.5"
                min="0"
                max="10"
                placeholder="2.5"
                value={formData.royaltyPercentage}
                onChange={(e) => setFormData({...formData, royaltyPercentage: parseFloat(e.target.value) || 0})}
                className="mt-1 bg-gray-800 border-gray-700"
              />
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
            <p className="text-gray-400">Listing Fee: <span className="text-green-400">Free</span></p>
            <p className="text-gray-400">Platform Fee: <span className="text-yellow-400">2.5%</span> on sale</p>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Clock className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Submit Listing</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NFTMarketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  
  // Fetch all listed NFTs (public endpoint)
  const { data: marketplaceNfts, isLoading } = trpc.marketplace.getListedNfts.useQuery({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    sortBy,
    search: searchQuery || undefined,
  });
  
  const { data: stats } = trpc.marketplace.getStats.useQuery();
  
  const handleBuy = (nft: any) => {
    toast.info('Connect your wallet to complete the purchase. Wallet integration coming soon!');
  };
  
  const handleView = (nft: any) => {
    setSelectedNft(nft);
  };
  
  // Filter and sort NFTs
  const filteredNfts = marketplaceNfts || [];
  
  const categories = [
    { id: "all", name: "All Categories", icon: Grid },
    { id: "abstract", name: "Abstract", icon: Sparkles },
    { id: "generative", name: "Generative", icon: Zap },
    { id: "pixel", name: "Pixel Art", icon: Image },
    { id: "3d", name: "3D Art", icon: Crown },
    { id: "photography", name: "Photography", icon: Image },
    { id: "anime", name: "Anime", icon: Heart },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <SEOHead />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center gap-2">
                <Crown className="w-8 h-8 text-yellow-400" />
                <span className="text-xl font-bold">NFT Marketplace</span>
              </a>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/marketplace"><a className="text-yellow-400 font-medium">Explore</a></Link>
              <Link href="/blog"><a className="text-gray-400 hover:text-white transition-colors">Blog</a></Link>
              <Link href="/dashboard"><a className="text-gray-400 hover:text-white transition-colors">Dashboard</a></Link>
            </nav>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => setShowSellModal(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Sell NFT
              </Button>
              <ConnectWallet />
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-purple-500/10" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">AI-Generated</span> NFTs
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Browse our curated collection of unique digital art. Buy, sell, and trade with confidence on the most innovative NFT marketplace.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-2xl font-bold text-yellow-400">{stats?.totalNfts || 89}</p>
                <p className="text-sm text-gray-500">Total NFTs</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-2xl font-bold text-green-400">{stats?.activeListings || 704}</p>
                <p className="text-sm text-gray-500">Active Listings</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-2xl font-bold text-purple-400">{stats?.totalVolume || '12.87'} ETH</p>
                <p className="text-sm text-gray-500">Total Volume</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <p className="text-2xl font-bold text-blue-400">{stats?.uniqueCollectors || 156}</p>
                <p className="text-sm text-gray-500">Collectors</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Search and Filters */}
      <section className="py-6 border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input 
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700 focus:border-yellow-500"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-1 border border-gray-700 rounded-lg p-1">
                <Button 
                  variant={viewMode === "grid" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-yellow-500 text-black" : ""}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-yellow-500 text-black" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id 
                  ? "bg-yellow-500 text-black hover:bg-yellow-400" 
                  : "border-gray-700 hover:border-yellow-500/50"}
              >
                <cat.icon className="w-4 h-4 mr-1" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </section>
      
      {/* NFT Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
                  <div className="aspect-square bg-gray-700/50" />
                  <CardContent className="p-4">
                    <div className="h-6 bg-gray-700/50 rounded mb-2" />
                    <div className="h-4 bg-gray-700/50 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredNfts.length === 0 ? (
            <div className="text-center py-20">
              <Image className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No NFTs Found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-4"
            }>
              {filteredNfts.map((nft: any) => (
                <NFTCard 
                  key={nft.id} 
                  nft={nft} 
                  onBuy={handleBuy}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-yellow-400" />
                <span className="font-bold">NFT Marketplace</span>
              </div>
              <p className="text-gray-500 text-sm">
                The premier destination for AI-generated digital art. Buy, sell, and discover unique NFTs.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Marketplace</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/marketplace"><a className="hover:text-white">Explore</a></Link></li>
                <li><Link href="/marketplace?category=abstract"><a className="hover:text-white">Abstract Art</a></Link></li>
                <li><Link href="/marketplace?category=generative"><a className="hover:text-white">Generative Art</a></Link></li>
                <li><Link href="/marketplace?category=pixel"><a className="hover:text-white">Pixel Art</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/blog"><a className="hover:text-white">Blog</a></Link></li>
                <li><Link href="/monetization-guide"><a className="hover:text-white">Guides</a></Link></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <div className="flex gap-3">
                <a href="#" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            © 2026 NFT Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
      
      {/* Modals */}
      <NFTDetailModal 
        nft={selectedNft}
        isOpen={!!selectedNft}
        onClose={() => setSelectedNft(null)}
        onBuy={handleBuy}
      />
      
      <SellNFTModal 
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
      />
    </div>
  );
}
