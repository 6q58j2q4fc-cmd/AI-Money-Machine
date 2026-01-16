import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PenTool, Eye, Sparkles, ExternalLink, Crown } from "lucide-react";
import { Link } from "wouter";

export default function NftBlog() {
  const { data: nftsData } = trpc.nftEmpire.getNFTsFromDB.useQuery();
  const { data: portfolio } = trpc.nftEmpire.getPortfolioSummary.useQuery();

  const nfts = (nftsData || []).map((item: any) => item.nft);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <PenTool className="w-8 h-8 text-purple-400" />
              NFT Blog (SEO)
            </h1>
            <p className="text-zinc-400 mt-1">Auto-generated SEO content for NFT listings</p>
          </div>
          <Link href="/nft-empire">
            <Button>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate NFTs
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">NFTs Created</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-white">{portfolio?.totalNfts || 0}</p></CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Listed for Sale</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-purple-400">{portfolio?.totalListings || 0}</p></CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Total Value</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-yellow-400">{(portfolio?.totalEstimatedValue || 0).toFixed(2)} ETH</p></CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Sales</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-green-400">{portfolio?.totalSales || 0}</p></CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-400" />NFT Listings (SEO Content)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nfts.map((nft: any) => (
                <div key={nft.id} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <div className="aspect-square rounded-lg bg-zinc-700 mb-3 overflow-hidden">
                    {nft.imageUrl ? (
                      <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <Crown className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-white truncate">{nft.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{nft.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline">{nft.category}</Badge>
                    <span className="text-yellow-400 font-bold">{Number(nft.estimatedValue || 0).toFixed(4)} ETH</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`/marketplace/nft/${nft.id}`, '_blank')}>
                      <Eye className="w-3 h-3 mr-1" />View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/marketplace/nft/${nft.id}`);
                      toast.success('Link copied!');
                    }}>
                      <ExternalLink className="w-3 h-3 mr-1" />Share
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {nfts.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <PenTool className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No NFTs created yet</p>
                <Link href="/nft-empire">
                  <Button className="mt-4">Generate NFTs</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
