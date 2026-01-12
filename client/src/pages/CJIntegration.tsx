import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Settings2, 
  RefreshCw,
  Loader2,
  CheckCircle,
  Package,
  DollarSign,
  Import,
  ExternalLink,
  Users,
  TrendingUp,
  Search,
  Building2,
  Star,
  Zap,
  Filter
} from "lucide-react";

// Preset keyword categories for quick search
const PRESET_KEYWORDS = [
  { label: "VPN & Security", keywords: "VPN" },
  { label: "Web Hosting", keywords: "hosting" },
  { label: "Software", keywords: "software" },
  { label: "Travel", keywords: "travel" },
  { label: "Finance", keywords: "finance" },
  { label: "Health", keywords: "health" },
  { label: "Education", keywords: "education" },
  { label: "E-commerce", keywords: "ecommerce" },
];

// High-EPC advertiser recommendations
const HIGH_EPC_ADVERTISERS = [
  { name: "ExpressVPN", epc: "$239.48", category: "VPN", id: "5577978" },
  { name: "Norton", epc: "$363.55", category: "Security", id: "2102181" },
  { name: "Kaspersky EU", epc: "$548.91", category: "Security", id: "6209109" },
  { name: "AVAST Software", epc: "$190.74", category: "Security", id: "4257305" },
  { name: "McAfee NA", epc: "$216.14", category: "Security", id: "5306132" },
  { name: "NordVPN", epc: "$101.02", category: "VPN", id: "4837117" },
  { name: "CyberGhost VPN", epc: "$82.85", category: "VPN", id: "4996371" },
  { name: "Incogni", epc: "$64.99", category: "Privacy", id: "6867883" },
];

interface CJAdvertiser {
  advertiserId: string;
  advertiserName: string;
  category: string;
  networkRank: string;
  sevenDayEpc: string;
  threeMonthEpc: string;
  programUrl: string;
  relationshipStatus: string;
  mobileTrackingCertified: boolean;
  networkEarnings: string;
  actionCommission: string;
  applyUrl?: string;
}

export default function CJIntegration() {
  const [cid, setCid] = useState("7841523"); // Pre-filled with user's CID
  const [websiteId, setWebsiteId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [syncCategory, setSyncCategory] = useState("");

  const utils = trpc.useUtils();

  const { data: settings, isLoading: settingsLoading } = trpc.cj.getSettings.useQuery();
  const { data: products, isLoading: productsLoading } = trpc.cj.getProducts.useQuery({});

  useEffect(() => {
    if (settings) {
      setCid(settings.cid);
      setWebsiteId(settings.websiteId || "");
    }
  }, [settings]);

  const saveSettingsMutation = trpc.cj.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("CJ settings saved!");
      utils.cj.getSettings.invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const syncProductsMutation = trpc.cj.syncProducts.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} products from CJ!`);
      utils.cj.getProducts.invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const importMutation = trpc.cj.importToAffiliateLinks.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} products as affiliate links!`);
      setSelectedProducts(new Set());
      utils.affiliate.list.invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const [realLinks, setRealLinks] = useState<any[]>([]);
  const [selectedRealLinks, setSelectedRealLinks] = useState<Set<number>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState("");

  // Available advertisers state
  const [availableAdvertisers, setAvailableAdvertisers] = useState<CJAdvertiser[]>([]);
  const [advertiserSearchKeyword, setAdvertiserSearchKeyword] = useState("");

  const fetchRealLinksMutation = trpc.cj.fetchRealLinks.useMutation({
    onSuccess: (data) => {
      setRealLinks(data.links);
      if (data.links.length === 0) {
        toast.info("No joined advertiser links found. Try joining some advertisers first!");
      } else {
        toast.success(`Found ${data.links.length} real CJ links!`);
      }
    },
    onError: (error) => toast.error(error.message)
  });

  const fetchAvailableAdvertisersMutation = trpc.cj.getAvailableAdvertisers.useMutation({
    onSuccess: (data) => {
      setAvailableAdvertisers(data.advertisers);
      if (data.advertisers.length === 0) {
        toast.info("No advertisers found. Try different keywords.");
      } else {
        toast.success(`Found ${data.advertisers.length} available advertisers to join!`);
      }
    },
    onError: (error) => toast.error(error.message)
  });

  const importRealLinksMutation = trpc.cj.importRealLinks.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.imported} real CJ links!`);
      setSelectedRealLinks(new Set());
      setRealLinks([]);
      utils.affiliate.list.invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  // Auto-sync mutation
  const autoSyncMutation = trpc.cj.autoSync.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        utils.affiliate.list.invalidate();
        utils.cj.getAutoSyncStatus.invalidate();
      } else {
        toast.info(data.message);
      }
    },
    onError: (error) => toast.error(error.message)
  });

  // Auto-sync status query
  const { data: autoSyncStatus } = trpc.cj.getAutoSyncStatus.useQuery();

  const handleFetchRealLinks = () => {
    if (!websiteId) {
      toast.error("Please enter your Website ID first");
      return;
    }
    fetchRealLinksMutation.mutate({ keywords: searchKeyword || undefined });
  };

  const handleFetchAvailableAdvertisers = () => {
    if (!cid) {
      toast.error("Please enter your CJ Account ID (CID) first");
      return;
    }
    fetchAvailableAdvertisersMutation.mutate({ keywords: advertiserSearchKeyword || undefined });
  };

  const handleImportRealLinks = () => {
    const linksToImport = realLinks.filter((_, i) => selectedRealLinks.has(i));
    if (linksToImport.length === 0) {
      toast.error("Select links to import");
      return;
    }
    importRealLinksMutation.mutate({ links: linksToImport });
  };

  const handleSaveSettings = () => {
    if (!cid) {
      toast.error("CID is required");
      return;
    }
    saveSettingsMutation.mutate({ cid, websiteId, apiToken });
  };

  const handleSync = () => {
    if (!settings) {
      toast.error("Please save your CJ settings first");
      return;
    }
    syncProductsMutation.mutate({ category: syncCategory || undefined });
  };

  const handleImport = () => {
    if (selectedProducts.size === 0) {
      toast.error("Select products to import");
      return;
    }
    importMutation.mutate({ productIds: Array.from(selectedProducts) });
  };

  const toggleProduct = (id: number) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (products) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="w-8 h-8 text-primary" />
            Commission Junction Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your CJ account to sync affiliate products automatically
          </p>
        </div>

        {/* Settings Card */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              CJ Account Settings
            </CardTitle>
            <CardDescription>
              Enter your Commission Junction account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cid">CJ Account ID (CID) *</Label>
                <Input
                  id="cid"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  placeholder="e.g., 7841523"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="websiteId">Website ID (PID) *</Label>
                <Input
                  id="websiteId"
                  value={websiteId}
                  onChange={(e) => setWebsiteId(e.target.value)}
                  placeholder="e.g., 101630462"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in CJ Dashboard → Account → Web Properties
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="apiToken">API Token (Optional)</Label>
              <Input
                id="apiToken"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="For advanced API access"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API token from{" "}
                <a 
                  href="https://members.cj.com/member/publisher/home.do" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  CJ Publisher Dashboard
                </a>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
                className="btn-glow"
              >
                {saveSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
              {settings && (
                <Badge variant="outline" className="text-green-500 border-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Advertisers Section - NEW */}
        <Card className="card-glow border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Building2 className="w-5 h-5" />
              Find Advertisers to Join
            </CardTitle>
            <CardDescription>
              Search for CJ advertisers you can apply to join. Once approved, their affiliate links will be available.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset Keyword Buttons */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Quick Search by Niche
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_KEYWORDS.map((preset) => (
                  <Button
                    key={preset.keywords}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdvertiserSearchKeyword(preset.keywords);
                      fetchAvailableAdvertisersMutation.mutate({ keywords: preset.keywords });
                    }}
                    disabled={fetchAvailableAdvertisersMutation.isPending}
                    className="hover:bg-amber-500/20 hover:border-amber-500"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={advertiserSearchKeyword}
                  onChange={(e) => setAdvertiserSearchKeyword(e.target.value)}
                  placeholder="Or enter custom keyword..."
                />
              </div>
              <Button 
                onClick={handleFetchAvailableAdvertisers}
                disabled={fetchAvailableAdvertisersMutation.isPending || !cid}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {fetchAvailableAdvertisersMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Find Advertisers
              </Button>
            </div>

            {/* High-EPC Recommendations */}
            {availableAdvertisers.length === 0 && (
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30">
                <h4 className="font-medium flex items-center gap-2 text-amber-500">
                  <Star className="w-4 h-4" />
                  Top Earning Advertisers (Recommended)
                </h4>
                <p className="text-sm text-muted-foreground">
                  These advertisers have the highest EPC (Earnings Per Click). Apply to join them for maximum revenue!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {HIGH_EPC_ADVERTISERS.map((adv) => (
                    <div key={adv.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div>
                        <span className="font-medium">{adv.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">{adv.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-500 border-green-500">
                          <Zap className="w-3 h-3 mr-1" />
                          {adv.epc}
                        </Badge>
                        <a 
                          href={`https://members.cj.com/member/publisher/home.do#advertiserDetails/cid=${adv.id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Apply
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!cid && (
              <p className="text-sm text-amber-500">
                ⚠️ Enter your CJ Account ID (CID) above and save settings first
              </p>
            )}

            {/* Available Advertisers List */}
            {availableAdvertisers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Found {availableAdvertisers.length} Advertisers to Join
                  </h4>
                </div>
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {availableAdvertisers.map((advertiser, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-amber-500/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{advertiser.advertiserName}</h4>
                        <p className="text-sm text-muted-foreground">ID: {advertiser.advertiserId}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {advertiser.category && (
                          <Badge variant="secondary">{advertiser.category}</Badge>
                        )}
                        {advertiser.networkRank && (
                          <Badge variant="outline" className="text-blue-500">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Rank: {advertiser.networkRank}
                          </Badge>
                        )}
                        {advertiser.sevenDayEpc && advertiser.sevenDayEpc !== "N/A" && (
                          <Badge variant="outline" className="text-green-500">
                            EPC: ${advertiser.sevenDayEpc}
                          </Badge>
                        )}
                      </div>
                      <a 
                        href={advertiser.applyUrl || `https://members.cj.com/member/publisher/home.do#advertiserDetails/cid=${advertiser.advertiserId}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Apply to Join
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 Click "Apply to Join" to request partnership with each advertiser. Once approved, their links will appear in "Fetch Real Links" section.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-Sync Card */}
        <Card className="card-glow border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <RefreshCw className="w-5 h-5" />
              Auto-Sync Affiliate Links
            </CardTitle>
            <CardDescription>
              Automatically import all links from your joined CJ advertisers. Duplicates are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    Status: {autoSyncStatus?.isConfigured ? (
                      <span className="text-green-500">Ready to sync</span>
                    ) : (
                      <span className="text-amber-500">Configure Website ID first</span>
                    )}
                  </p>
                  {autoSyncStatus?.lastSyncAt && (
                    <p className="text-muted-foreground">
                      Last sync: {new Date(autoSyncStatus.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => autoSyncMutation.mutate()}
                disabled={autoSyncMutation.isPending || !autoSyncStatus?.isConfigured}
                className="bg-green-600 hover:bg-green-700"
              >
                {autoSyncMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Auto-Sync Now
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 This will fetch all available links from advertisers you've joined and import them as affiliate links. Run this after getting approved by new advertisers.
            </p>
          </CardContent>
        </Card>

        {/* Sync Products Card */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Sync Affiliate Products
            </CardTitle>
            <CardDescription>
              Fetch available products from Commission Junction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={syncCategory}
                  onChange={(e) => setSyncCategory(e.target.value)}
                  placeholder="Category filter (optional, e.g., 'Technology')"
                />
              </div>
              <Button 
                onClick={handleSync}
                disabled={syncProductsMutation.isPending || !settings}
                variant="outline"
              >
                {syncProductsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Products
              </Button>
            </div>
            {!settings && (
              <p className="text-sm text-muted-foreground">
                Save your CJ settings first to sync products
              </p>
            )}
          </CardContent>
        </Card>

        {/* Products List */}
        {products && products.length > 0 && (
          <Card className="card-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Available Products ({products.length})
                  </CardTitle>
                  <CardDescription>
                    Select products to import as affiliate links
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={selectedProducts.size === 0 || importMutation.isPending}
                    className="btn-glow"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Import className="w-4 h-4 mr-2" />
                    )}
                    Import ({selectedProducts.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {products.map((product) => (
                  <div 
                    key={product.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                      selectedProducts.has(product.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleProduct(product.id)}
                  >
                    <Checkbox 
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    {product.imageUrl && (
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName || ""} 
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.productName}</h4>
                      <p className="text-sm text-muted-foreground">{product.advertiserName}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">{product.category}</Badge>
                      {product.price && (
                        <span className="font-medium">${parseFloat(product.price).toFixed(2)}</span>
                      )}
                      <Badge variant="outline" className="text-primary">
                        {product.commission}
                      </Badge>
                      {product.epc && (
                        <span className="text-muted-foreground">
                          EPC: ${parseFloat(product.epc).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <a 
                      href={product.productUrl || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {productsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {products && products.length === 0 && settings && (
          <Card className="card-glow">
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No products synced yet</h3>
              <p className="text-muted-foreground mb-4">
                Click "Sync Products" to fetch available affiliate products from CJ
              </p>
              <Button onClick={handleSync} disabled={syncProductsMutation.isPending}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Products
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Real CJ API Links Section */}
        <Card className="card-glow border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ExternalLink className="w-5 h-5" />
              Fetch Real CJ Affiliate Links (Joined Advertisers)
            </CardTitle>
            <CardDescription>
              Fetch affiliate links from advertisers you've already joined. If you see "No Joined Advertisers", use the section above to find and join advertisers first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Search keywords (optional, e.g., 'VPN', 'hosting')"
                />
              </div>
              <Button 
                onClick={handleFetchRealLinks}
                disabled={fetchRealLinksMutation.isPending || !websiteId}
                className="btn-glow"
              >
                {fetchRealLinksMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Fetch Real Links
              </Button>
            </div>
            {!websiteId && (
              <p className="text-sm text-amber-500">
                ⚠️ Enter your Website ID above and save settings to fetch real links
              </p>
            )}

            {/* Real Links List */}
            {realLinks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Found {realLinks.length} Real CJ Links</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedRealLinks(new Set(realLinks.map((_, i) => i)))}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedRealLinks(new Set())}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={handleImportRealLinks}
                      disabled={selectedRealLinks.size === 0 || importRealLinksMutation.isPending}
                      className="btn-glow"
                    >
                      {importRealLinksMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Import className="w-4 h-4 mr-2" />
                      )}
                      Import ({selectedRealLinks.size})
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {realLinks.map((link, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                        selectedRealLinks.has(index) 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedRealLinks(prev => {
                          const next = new Set(prev);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          return next;
                        });
                      }}
                    >
                      <Checkbox 
                        checked={selectedRealLinks.has(index)}
                        onCheckedChange={() => {
                          setSelectedRealLinks(prev => {
                            const next = new Set(prev);
                            if (next.has(index)) next.delete(index);
                            else next.add(index);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{link.linkName || link.advertiserName}</h4>
                        <p className="text-sm text-muted-foreground">{link.advertiserName}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {link.clickUrl?.substring(0, 60)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="secondary">{link.category || 'General'}</Badge>
                        {link.saleCommission && (
                          <Badge variant="outline" className="text-green-500">
                            {link.saleCommission}
                          </Badge>
                        )}
                      </div>
                      <a 
                        href={link.clickUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
