import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Wallet, ArrowLeft, User, Heart, ShoppingBag, 
  Grid3X3, Settings, ExternalLink, Copy, Check, Sparkles
} from "lucide-react";
import { toast } from "sonner";

// Wallet hook
function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem("walletAddress");
    if (saved) setAddress(saved);
  }, []);
  
  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem("walletAddress");
  };
  
  return { address, disconnect };
}

export default function MarketplaceProfile() {
  const wallet = useWallet();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    bio: "",
    twitterHandle: "",
    discordHandle: "",
    websiteUrl: "",
  });
  
  // Fetch user data
  const { data: user, refetch } = trpc.publicMarketplace.getUser.useQuery(
    { walletAddress: wallet.address || "" },
    { enabled: !!wallet.address }
  );
  
  // Fetch user's collection
  const { data: collection } = trpc.publicMarketplace.getCollection.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );
  
  // Fetch user's purchases
  const { data: purchases } = trpc.publicMarketplace.getPurchases.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );
  
  // Fetch user's favorites
  const { data: favorites } = trpc.publicMarketplace.getFavorites.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );
  
  // Update profile mutation
  const updateProfile = trpc.publicMarketplace.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!");
      setIsEditing(false);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });
  
  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        displayName: user.displayName || "",
        email: user.email || "",
        bio: user.bio || "",
        twitterHandle: user.twitterHandle || "",
        discordHandle: user.discordHandle || "",
        websiteUrl: user.websiteUrl || "",
      });
    }
  }, [user]);
  
  const handleSaveProfile = () => {
    if (!user) return;
    updateProfile.mutate({
      userId: user.id,
      ...formData,
    });
  };
  
  const copyAddress = async () => {
    if (wallet.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  if (!wallet.address) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <Wallet className="w-16 h-16 text-zinc-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Wallet Not Connected</h1>
        <p className="text-zinc-400 mb-6">Connect your wallet to view your profile</p>
        <Link href="/market">
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
            Go to Marketplace
          </Button>
        </Link>
      </div>
    );
  }
  
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
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </Badge>
              <Button variant="ghost" size="sm" onClick={wallet.disconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-black" />
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">
              {user?.displayName || user?.username || "Anonymous"}
            </h1>
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <span className="font-mono">{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</span>
              <button onClick={copyAddress} className="hover:text-white">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {user?.bio && <p className="text-zinc-400 max-w-xl">{user.bio}</p>}
            
            <div className="flex gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{collection?.length || 0}</p>
                <p className="text-sm text-zinc-400">Owned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{favorites?.length || 0}</p>
                <p className="text-sm text-zinc-400">Favorites</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{purchases?.length || 0}</p>
                <p className="text-sm text-zinc-400">Purchases</p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="border-zinc-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>
        
        {/* Edit Profile Form */}
        {isEditing && (
          <Card className="bg-zinc-900 border-zinc-800 mb-8">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Display Name"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yoursite.com"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>Twitter</Label>
                  <Input
                    value={formData.twitterHandle}
                    onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                    placeholder="@username"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>Discord</Label>
                  <Input
                    value={formData.discordHandle}
                    onChange={(e) => setFormData({ ...formData, discordHandle: e.target.value })}
                    placeholder="username#0000"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="bg-zinc-800 border-zinc-700"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                {updateProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Tabs */}
        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="collection" className="flex-1">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Collection ({collection?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1">
              <Heart className="w-4 h-4 mr-2" />
              Favorites ({favorites?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex-1">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Purchases ({purchases?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="collection" className="mt-6">
            {collection && collection.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {collection.map((item: any) => (
                  <Link key={item.id} href={`/nft/${item.nft.id}`}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-yellow-500/50 transition-all cursor-pointer">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={item.nft.imageUrl || "/placeholder-nft.png"}
                          alt={item.nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{item.nft.name}</h3>
                        <p className="text-sm text-zinc-400">{item.nft.category}</p>
                        <p className="text-yellow-500 mt-2">
                          {parseFloat(String(item.acquiredPrice || 0)).toFixed(4)} ETH
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Grid3X3 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No NFTs in Collection</h3>
                <p className="text-zinc-400 mb-4">Start collecting by purchasing NFTs from the marketplace</p>
                <Link href="/market">
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Browse NFTs
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-6">
            {favorites && favorites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.map((item: any) => (
                  <Link key={item.id} href={`/nft/${item.nft.id}`}>
                    <Card className="bg-zinc-900 border-zinc-800 hover:border-yellow-500/50 transition-all cursor-pointer">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={item.nft.imageUrl || "/placeholder-nft.png"}
                          alt={item.nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{item.nft.name}</h3>
                        <p className="text-sm text-zinc-400">{item.nft.category}</p>
                        <p className="text-yellow-500 mt-2">
                          {parseFloat(String(item.nft.estimatedValue || 0)).toFixed(4)} ETH
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
                <p className="text-zinc-400 mb-4">Heart NFTs you like to save them here</p>
                <Link href="/market">
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Browse NFTs
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="purchases" className="mt-6">
            {purchases && purchases.length > 0 ? (
              <div className="space-y-4">
                {purchases.map((purchase: any) => (
                  <Card key={purchase.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded overflow-hidden">
                        <img
                          src={purchase.nft.imageUrl || "/placeholder-nft.png"}
                          alt={purchase.nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{purchase.nft.name}</h3>
                        <p className="text-sm text-zinc-400">
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-500 font-semibold">
                          {parseFloat(String(purchase.purchasePrice)).toFixed(4)} ETH
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            purchase.status === "confirmed"
                              ? "border-green-500 text-green-500"
                              : purchase.status === "confirming"
                              ? "border-yellow-500 text-yellow-500"
                              : "border-zinc-500 text-zinc-500"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </div>
                      {purchase.txHash && (
                        <a
                          href={`https://etherscan.io/tx/${purchase.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-400 hover:text-yellow-500"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Purchases Yet</h3>
                <p className="text-zinc-400 mb-4">Your purchase history will appear here</p>
                <Link href="/market">
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                    Browse NFTs
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-zinc-400 text-sm">
          © 2026 MoneyMachine NFT Marketplace. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
