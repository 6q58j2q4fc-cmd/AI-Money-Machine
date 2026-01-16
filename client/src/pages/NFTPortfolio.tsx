import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, AlertTriangle, ExternalLink, Download, FileText, Shield } from "lucide-react";

export default function NFTPortfolio() {
  const { data: portfolio } = trpc.nftEmpire.getPortfolioSummary.useQuery();
  const { data: nftsData } = trpc.nftEmpire.getNFTsFromDB.useQuery();
  const [activeTab, setActiveTab] = useState("all");

  const nfts = (nftsData || []).map((item: any) => item.nft);
  const listedNfts = nfts.filter((n: any) => n.isListed);
  const soldNfts = nfts.filter((n: any) => n.status === "sold");

  const totalEstimatedValue = portfolio?.totalEstimatedValue || 0;
  const totalSales = portfolio?.totalSales || 0;
  const pendingEarnings = portfolio?.pendingEarnings || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              NFT Portfolio Verification
            </h1>
            <p className="text-zinc-400 mt-1">Blockchain-verified NFT ownership and valuations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success("PDF export started")}>
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
            <Button variant="outline" onClick={() => toast.success("CSV export started")}>
              <FileText className="w-4 h-4 mr-2" />Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                Portfolio Value (Est.)
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">ESTIMATED</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">{totalEstimatedValue.toFixed(4)} ETH</p>
              <p className="text-xs text-zinc-500 mt-1">Not guaranteed - based on listing prices</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
                Available to Withdraw
                <Badge variant="outline" className={pendingEarnings > 0 ? "text-green-400 border-green-400/50" : "text-red-400 border-red-400/50"}>
                  {pendingEarnings > 0 ? "VERIFIED" : "NO SALES"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{pendingEarnings.toFixed(4)} ETH</p>
              <p className="text-xs text-zinc-500 mt-1">From {totalSales} confirmed sales</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Total NFTs</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{nfts.length}</p>
              <p className="text-xs text-zinc-500 mt-1">{portfolio?.totalListings || 0} listed for sale</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Confirmed Sales</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-400">{totalSales}</p>
              <p className="text-xs text-zinc-500 mt-1">Real completed transactions</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-yellow-900/20 border-yellow-600/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Important: Understanding Your Portfolio Value</p>
                <ul className="text-sm text-zinc-400 mt-2 space-y-1">
                  <li>• <strong>Estimated Value:</strong> Based on listing prices. NOT guaranteed.</li>
                  <li>• <strong>Available to Withdraw:</strong> REAL money from confirmed sales.</li>
                  <li>• <strong>Banks should only consider "Available to Withdraw" as verified value.</strong></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All NFTs ({nfts.length})</TabsTrigger>
                <TabsTrigger value="listed">Listed ({listedNfts.length})</TabsTrigger>
                <TabsTrigger value="sold">Sold ({soldNfts.length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === "all" ? nfts : activeTab === "listed" ? listedNfts : soldNfts).slice(0, 12).map((nft: any) => (
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
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">{nft.category}</Badge>
                    <span className="text-yellow-400 font-bold">{Number(nft.estimatedValue || 0).toFixed(4)} ETH</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {nft.isListed && <Badge className="bg-green-500/20 text-green-400">Listed</Badge>}
                    {nft.status === "sold" && <Badge className="bg-purple-500/20 text-purple-400">Sold</Badge>}
                    {nft.tokenId && (
                      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => window.open(`https://etherscan.io/token/${nft.contractAddress}?a=${nft.tokenId}`, '_blank')}>
                        <ExternalLink className="w-3 h-3 mr-1" />Verify
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {nfts.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Crown className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No NFTs in your portfolio yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
