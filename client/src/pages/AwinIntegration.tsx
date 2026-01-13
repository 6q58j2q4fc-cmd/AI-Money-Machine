import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Link2,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Globe,
  DollarSign,
  TrendingUp,
  Zap,
  ExternalLink,
  Building2,
  Loader2
} from "lucide-react";

export default function AwinIntegration() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Queries
  const statusQuery = trpc.awin.getStatus.useQuery();
  const programmesQuery = trpc.awin.getProgrammes.useQuery();
  const commissionQuery = trpc.awin.getCommissionSummary.useQuery();
  const topAdvertisersQuery = trpc.awin.getTopAdvertisers.useQuery();

  // Mutations
  const syncMutation = trpc.awin.syncProgrammes.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully synced ${data.synced} Awin programmes`);
      programmesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const importMutation = trpc.awin.importLinks.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} affiliate links`);
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  // Search programmes
  const searchQuery = trpc.awin.searchProgrammes.useQuery(
    { keyword: searchKeyword },
    { enabled: isSearching && searchKeyword.length > 0 }
  );

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      setIsSearching(true);
    }
  };

  const programmes = isSearching && searchKeyword ? searchQuery.data : programmesQuery.data;
  const isLoading = programmesQuery.isLoading || (isSearching && searchQuery.isLoading);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <Link2 className="h-6 w-6 text-white" />
            </div>
            Awin Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect to Awin affiliate network for more earning opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Programmes
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Import All Links
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {statusQuery.data?.connected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-lg font-semibold text-green-500">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-lg font-semibold text-red-500">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
              <Zap className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Programmes</p>
                <p className="text-2xl font-bold">{programmes?.length || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">30-Day Commission</p>
                <p className="text-2xl font-bold">
                  ${commissionQuery.data?.totalCommission?.toFixed(2) || "0.00"}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{commissionQuery.data?.transactionCount || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="programmes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programmes">Programmes</TabsTrigger>
          <TabsTrigger value="top-advertisers">Top Advertisers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="programmes" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Search programmes by name, category, or URL..."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    if (!e.target.value) setIsSearching(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!searchKeyword.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                {isSearching && (
                  <Button variant="outline" onClick={() => {
                    setSearchKeyword("");
                    setIsSearching(false);
                  }}>
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Programmes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : programmes && programmes.length > 0 ? (
              programmes.map((programme) => (
                <Card key={programme.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {programme.logoUrl ? (
                          <img
                            src={programme.logoUrl}
                            alt={programme.name}
                            className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{programme.name}</CardTitle>
                          <CardDescription className="text-xs">
                            ID: {programme.id}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={programme.status === "Active" ? "default" : "secondary"}
                        className={programme.status === "Active" ? "bg-green-500" : ""}
                      >
                        {programme.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {programme.description || "No description available"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span>{programme.primaryRegion?.name || "Global"}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{programme.currencyCode || "USD"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(programme.displayUrl, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visit
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                        onClick={() => {
                          navigator.clipboard.writeText(programme.clickThroughUrl);
                          toast.success("Affiliate link copied to clipboard");
                        }}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Copy Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {isSearching ? "No programmes found matching your search" : "No programmes available"}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="top-advertisers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Advertisers</CardTitle>
              <CardDescription>
                Your best performing Awin advertisers by commission earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topAdvertisersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : topAdvertisersQuery.data && topAdvertisersQuery.data.length > 0 ? (
                <div className="space-y-3">
                  {topAdvertisersQuery.data.map((advertiser, index) => (
                    <div
                      key={advertiser.advertiserId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{advertiser.advertiserName}</p>
                          <p className="text-xs text-muted-foreground">
                            {advertiser.transactionCount} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">
                          ${advertiser.totalCommission.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">commission</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No transaction data available yet. Start promoting to see your top advertisers!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Awin API Configuration</CardTitle>
              <CardDescription>
                Configure your Awin affiliate network settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Status</span>
                  <Badge variant={statusQuery.data?.connected ? "default" : "destructive"}>
                    {statusQuery.data?.connected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {statusQuery.data?.message || "Checking connection..."}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-dashed space-y-3">
                <h4 className="font-medium">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Programmes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => importMutation.mutate()}
                    disabled={importMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Import to Database
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://ui.awin.com", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Awin Dashboard
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/20">
                <h4 className="font-medium text-orange-500 mb-2">Pro Tip</h4>
                <p className="text-sm text-muted-foreground">
                  Awin has thousands of advertisers across multiple categories. Use the search feature to find programmes that match your content niche for higher conversion rates.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
