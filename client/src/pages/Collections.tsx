import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Image, Star, Eye, TrendingUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function Collections() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    coverImage: "",
  });

  // Get all collections
  const { data: collections, refetch } = trpc.publicMarketplace.getCollections.useQuery();
  
  // Get NFTs for selection
  const { data: nftsData } = trpc.nftEmpire.getPortfolioSummary.useQuery();

  // Create collection mutation
  const createCollection = trpc.publicMarketplace.createCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection created successfully!");
      setIsCreateOpen(false);
      setNewCollection({ name: "", description: "", coverImage: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Feature collection mutation
  const featureCollection = trpc.publicMarketplace.featureCollection.useMutation({
    onSuccess: () => {
      toast.success("Collection featured!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateCollection = () => {
    if (!newCollection.name) {
      toast.error("Please enter a collection name");
      return;
    }
    createCollection.mutate(newCollection);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NFT Collections</h1>
          <p className="text-muted-foreground">
            Create and manage themed collections to boost visibility and sales
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Collection Name</label>
                <Input
                  placeholder="e.g., Cosmic Dreams"
                  value={newCollection.name}
                  onChange={(e) =>
                    setNewCollection({ ...newCollection, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe your collection..."
                  value={newCollection.description}
                  onChange={(e) =>
                    setNewCollection({
                      ...newCollection,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cover Image URL</label>
                <Input
                  placeholder="https://..."
                  value={newCollection.coverImage}
                  onChange={(e) =>
                    setNewCollection({
                      ...newCollection,
                      coverImage: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateCollection}
                disabled={createCollection.isPending}
              >
                {createCollection.isPending ? "Creating..." : "Create Collection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Image className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Collections</p>
                <p className="text-2xl font-bold">{collections?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold">
                  {collections?.filter((c: any) => c.isFeatured).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">
                  {collections?.reduce((sum: number, c: any) => sum + (c.viewCount || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total NFTs</p>
                <p className="text-2xl font-bold">{nftsData?.totalNfts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections?.map((collection: any) => (
          <Card key={collection.id} className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 relative">
              {collection.coverImage ? (
                <img
                  src={collection.coverImage}
                  alt={collection.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image className="h-12 w-12 text-white/50" />
                </div>
              )}
              {collection.isFeatured && (
                <Badge className="absolute top-2 right-2 bg-yellow-500">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{collection.name}</span>
                <Badge variant="outline">{collection.nftCount || 0} NFTs</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {collection.description || "No description"}
              </p>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{collection.viewCount || 0} views</span>
                <span>{collection.floorPrice || "0"} ETH floor</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`/market?collection=${collection.id}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant={collection.isFeatured ? "secondary" : "default"}
                  size="sm"
                  className="flex-1"
                  onClick={() => featureCollection.mutate({ collectionId: collection.id, featured: !collection.isFeatured })}
                >
                  <Star className="h-4 w-4 mr-1" />
                  {collection.isFeatured ? "Unfeature" : "Feature"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {(!collections || collections.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Collections Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first collection to organize and showcase your NFTs
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suggested Collections */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Collection Themes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Abstract Art", description: "Geometric and abstract designs" },
              { name: "Nature & Landscapes", description: "Natural beauty and scenery" },
              { name: "Pixel Art", description: "Retro pixel-style artwork" },
              { name: "3D Renders", description: "Three-dimensional digital art" },
              { name: "Anime & Manga", description: "Japanese-style illustrations" },
              { name: "Cyberpunk", description: "Futuristic neon aesthetics" },
              { name: "Generative Art", description: "Algorithm-generated artwork" },
              { name: "Photography", description: "Digital photography NFTs" },
            ].map((theme) => (
              <Button
                key={theme.name}
                variant="outline"
                className="h-auto py-3 flex-col items-start"
                onClick={() => {
                  setNewCollection({
                    name: theme.name,
                    description: theme.description,
                    coverImage: "",
                  });
                  setIsCreateOpen(true);
                }}
              >
                <span className="font-medium">{theme.name}</span>
                <span className="text-xs text-muted-foreground">{theme.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
