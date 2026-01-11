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
  ExternalLink
} from "lucide-react";

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
                <Label htmlFor="websiteId">Website ID</Label>
                <Input
                  id="websiteId"
                  value={websiteId}
                  onChange={(e) => setWebsiteId(e.target.value)}
                  placeholder="Optional"
                  className="mt-1"
                />
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
      </div>
    </DashboardLayout>
  );
}
