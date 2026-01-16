import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, Heart, Share2, ExternalLink, ArrowLeft, 
  Clock, Eye, Tag, Layers, Shield, Copy, Check,
  Twitter, Send, Sparkles, CreditCard, DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Wallet hook (same as marketplace)
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

export default function PublicNFTDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const nftId = parseInt(params.id || "0");
  
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isStripeCheckout, setIsStripeCheckout] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [showStripeDialog, setShowStripeDialog] = useState(false);
  
  const wallet = useWallet();
  
  // Fetch NFT details
  const { data: nft, isLoading } = trpc.publicMarketplace.getNFTDetails.useQuery(
    { nftId },
    { enabled: nftId > 0 }
  );
  
  // Auth and purchase mutations
  const walletAuth = trpc.publicMarketplace.walletAuth.useMutation();
  const recordPurchase = trpc.publicMarketplace.recordPurchase.useMutation();
  const addFavorite = trpc.publicMarketplace.addFavorite.useMutation();
  const createStripeCheckout = trpc.stripe.createCheckoutSession.useMutation();
  
  // Check for payment success from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      toast.success('Payment successful! Your NFT purchase is being processed.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      toast.info('Payment cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  // SEO
  useEffect(() => {
    if (nft) {
      document.title = `${nft.name} - NFT Marketplace | MoneyMachine`;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", nft.description || `Buy ${nft.name} NFT on MoneyMachine Marketplace`);
    }
  }, [nft]);
  
  const handleWalletConnect = async () => {
    await wallet.connect();
  };
  
  const handleBuy = async () => {
    if (!wallet.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (!nft) return;
    
    setIsPurchasing(true);
    try {
      // Get or create marketplace user
      const user = await walletAuth.mutateAsync({ walletAddress: wallet.address });
      
      // In production, this would trigger a blockchain transaction
      // For now, we record the purchase intent
      const price = nft.listing?.listPrice || nft.estimatedValue || "0";
      
      // Simulate blockchain transaction
      if ((window as any).ethereum) {
        try {
          // Request transaction
          const txHash = await (window as any).ethereum.request({
            method: "eth_sendTransaction",
            params: [{
              from: wallet.address,
              to: nft.contractAddress || "0x0000000000000000000000000000000000000000",
              value: "0x" + (parseFloat(String(price)) * 1e18).toString(16),
            }],
          });
          
          // Record purchase with tx hash
          await recordPurchase.mutateAsync({
            buyerId: user.id,
            buyerWallet: wallet.address,
            nftAssetId: nft.id,
            purchasePrice: String(price),
            currency: "ETH",
            chain: nft.chain || "ethereum",
            txHash,
          });
          
          toast.success("Purchase successful! Transaction submitted.");
        } catch (txErr: any) {
          if (txErr.code === 4001) {
            toast.error("Transaction cancelled by user");
          } else {
            // Record purchase without tx (pending)
            await recordPurchase.mutateAsync({
              buyerId: user.id,
              buyerWallet: wallet.address,
              nftAssetId: nft.id,
              purchasePrice: String(price),
              currency: "ETH",
              chain: nft.chain || "ethereum",
            });
            toast.success("Purchase recorded! Awaiting blockchain confirmation.");
          }
        }
      }
    } catch (err) {
      console.error("Purchase error:", err);
      toast.error("Failed to complete purchase");
    }
    setIsPurchasing(false);
  };
  
  // Handle Stripe checkout
  const handleStripeCheckout = async () => {
    if (!buyerEmail) {
      toast.error("Please enter your email address");
      return;
    }
    
    if (!nft) return;
    
    setIsStripeCheckout(true);
    try {
      const result = await createStripeCheckout.mutateAsync({
        nftId: nft.id,
        userEmail: buyerEmail,
        userName: buyerName || "Guest Buyer",
        userId: wallet.address || "guest",
      });
      
      if (result.url) {
        toast.info("Redirecting to checkout...");
        window.open(result.url, "_blank");
        setShowStripeDialog(false);
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      toast.error(err.message || "Failed to initiate checkout");
    }
    setIsStripeCheckout(false);
  };
  
  const handleFavorite = async () => {
    if (!wallet.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      const user = await walletAuth.mutateAsync({ walletAddress: wallet.address });
      await addFavorite.mutateAsync({ userId: user.id, nftAssetId: nftId });
      setIsLiked(true);
      toast.success("Added to favorites!");
    } catch (err) {
      console.error("Favorite error:", err);
    }
  };
  
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };
  
  const shareOnTwitter = () => {
    const text = `Check out this amazing NFT: ${nft?.name}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!nft) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">NFT Not Found</h1>
        <Link href="/market">
          <Button>Back to Marketplace</Button>
        </Link>
      </div>
    );
  }
  
  const price = nft.listing?.listPrice || nft.estimatedValue || "0";
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/market">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Marketplace
              </Button>
            </Link>
            
            <div className="flex items-center gap-3">
              {wallet.address ? (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </Badge>
              ) : (
                <Button
                  onClick={handleWalletConnect}
                  disabled={wallet.isConnecting}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
              <img
                src={nft.imageUrl || "/placeholder-nft.png"}
                alt={nft.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Badge className="bg-zinc-900/80 text-white border-0">
                  {nft.chain || "ETH"}
                </Badge>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700"
                onClick={handleFavorite}
              >
                <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                {isLiked ? "Favorited" : "Favorite"}
              </Button>
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={handleShare}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="outline" className="border-zinc-700" onClick={shareOnTwitter}>
                <Twitter className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-3 bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                {nft.category}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{nft.name}</h1>
              <p className="text-zinc-400">{nft.description}</p>
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Eye className="w-4 h-4" />
                {nft.views} views
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Heart className="w-4 h-4" />
                {nft.likes} likes
              </div>
            </div>
            
            {/* Price Card */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-6">
                <p className="text-sm text-zinc-400 mb-2">Current Price</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold text-yellow-500">
                    {parseFloat(String(price)).toFixed(4)}
                  </span>
                  <span className="text-xl text-zinc-400">ETH</span>
                </div>
                
                <div className="space-y-3">
                  {/* Crypto Payment */}
                  <Button
                    size="lg"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg"
                    onClick={handleBuy}
                    disabled={isPurchasing || nft.status === "sold"}
                  >
                    {isPurchasing ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mr-2" />
                        Processing...
                      </>
                    ) : nft.status === "sold" ? (
                      "Sold"
                    ) : (
                      <>
                        <Wallet className="w-5 h-5 mr-2" />
                        Buy with Crypto
                      </>
                    )}
                  </Button>
                  
                  {/* Stripe Payment */}
                  <Dialog open={showStripeDialog} onOpenChange={setShowStripeDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-zinc-700 hover:bg-zinc-800 font-bold text-lg"
                        disabled={nft.status === "sold"}
                      >
                        <CreditCard className="w-5 h-5 mr-2" />
                        Buy with Card
                        <span className="ml-2 text-sm text-zinc-400">
                          (~${(parseFloat(String(price)) * 2000).toFixed(2)})
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle className="text-white">Complete Purchase</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                          Enter your details to purchase {nft.name} with a credit card.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <img
                              src={nft.imageUrl || "/placeholder-nft.png"}
                              alt={nft.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-semibold text-white">{nft.name}</p>
                              <p className="text-sm text-zinc-400">{nft.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-yellow-500">
                              {parseFloat(String(price)).toFixed(4)} ETH
                            </p>
                            <p className="text-sm text-zinc-400">
                              ~${(parseFloat(String(price)) * 2000).toFixed(2)} USD
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-white">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-white">Name (Optional)</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Your Name"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        
                        <Button
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                          onClick={handleStripeCheckout}
                          disabled={isStripeCheckout || !buyerEmail}
                        >
                          {isStripeCheckout ? (
                            <>
                              <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mr-2" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-5 h-5 mr-2" />
                              Pay ${(parseFloat(String(price)) * 2000).toFixed(2)}
                            </>
                          )}
                        </Button>
                        
                        <p className="text-xs text-zinc-500 text-center">
                          Secure payment powered by Stripe. Test card: 4242 4242 4242 4242
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {!wallet.address && (
                  <p className="text-center text-sm text-zinc-400 mt-3">
                    Connect wallet for crypto, or use card payment
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Details Tabs */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full bg-zinc-900 border border-zinc-800">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="traits" className="flex-1">Traits</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Contract Address</span>
                      <span className="font-mono text-sm">
                        {nft.contractAddress ? `${nft.contractAddress.slice(0, 8)}...${nft.contractAddress.slice(-6)}` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Token ID</span>
                      <span className="font-mono">{nft.tokenId || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Blockchain</span>
                      <span>{nft.chain || "Ethereum"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Token Standard</span>
                      <span>ERC-721</span>
                    </div>
                    {nft.metadataUri && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Metadata</span>
                        <a href={nft.metadataUri} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline flex items-center gap-1">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="traits" className="mt-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    {nft.traits && nft.traits.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {nft.traits.map((trait: any, i: number) => (
                          <div key={i} className="bg-zinc-800 rounded-lg p-3 text-center">
                            <p className="text-xs text-zinc-400 uppercase">{trait.trait_type}</p>
                            <p className="font-semibold">{trait.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-center py-4">No traits available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    {nft.salesHistory && nft.salesHistory.length > 0 ? (
                      <div className="space-y-3">
                        {nft.salesHistory.map((sale: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                            <div>
                              <p className="font-semibold">Sale</p>
                              <p className="text-sm text-zinc-400">
                                {new Date(sale.soldAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-yellow-500">
                                {parseFloat(String(sale.salePrice)).toFixed(4)} ETH
                              </p>
                              {sale.txHash && (
                                <a
                                  href={`https://etherscan.io/tx/${sale.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-zinc-400 hover:text-yellow-500"
                                >
                                  View Tx
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-center py-4">No sales history</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
