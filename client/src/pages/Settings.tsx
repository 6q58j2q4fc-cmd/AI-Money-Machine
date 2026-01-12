import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Link2, Eye, Cookie, Plus, Trash2, Save, ExternalLink, Key, Globe } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const URL_SHORTENER_PROVIDERS = [
  { id: 'shorte_st', name: 'Shorte.st', rate: '$2-5 per 1000 views', url: 'https://shorte.st' },
  { id: 'adfly', name: 'AdFly', rate: '$1-4 per 1000 views', url: 'https://adf.ly' },
  { id: 'linkvertise', name: 'Linkvertise', rate: '$3-7 per 1000 views', url: 'https://linkvertise.com' },
  { id: 'shrinkme', name: 'ShrinkMe', rate: '$2-6 per 1000 views', url: 'https://shrinkme.io' },
  { id: 'ouo_io', name: 'Ouo.io', rate: '$1-5 per 1000 views', url: 'https://ouo.io' },
  { id: 'none', name: 'Disabled', rate: 'No monetization', url: '' },
] as const;

export default function Settings() {
  const [shortenerProvider, setShortenerProvider] = useState<string>('none');
  const [shortenerApiKey, setShortenerApiKey] = useState('');
  const [shortenerEnabled, setShortenerEnabled] = useState(false);
  const [newPixelType, setNewPixelType] = useState<string>('facebook');
  const [newPixelId, setNewPixelId] = useState('');
  const [newPixelCode, setNewPixelCode] = useState('');
  const [showAddPixel, setShowAddPixel] = useState(false);

  const { data: shortenerSettings, isLoading: shortenerLoading } = trpc.urlShortener.getSettings.useQuery();
  const { data: pixels, isLoading: pixelsLoading, refetch: refetchPixels } = trpc.tracking.getPixels.useQuery();
  const { data: cookieStats } = trpc.tracking.getCookieStats.useQuery();
  const { data: shortenedUrls } = trpc.urlShortener.getShortenedUrls.useQuery();

  const saveShortenerMutation = trpc.urlShortener.saveSettings.useMutation({
    onSuccess: () => toast.success("URL shortener settings saved!"),
    onError: (error) => toast.error(error.message),
  });

  const addPixelMutation = trpc.tracking.addPixel.useMutation({
    onSuccess: () => {
      toast.success("Tracking pixel added!");
      refetchPixels();
      setShowAddPixel(false);
      setNewPixelId('');
      setNewPixelCode('');
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePixelMutation = trpc.tracking.deletePixel.useMutation({
    onSuccess: () => {
      toast.success("Tracking pixel removed!");
      refetchPixels();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (shortenerSettings) {
      setShortenerProvider(shortenerSettings.provider);
      setShortenerApiKey(shortenerSettings.apiKey || '');
      setShortenerEnabled(shortenerSettings.isEnabled);
    }
  }, [shortenerSettings]);

  const handleSaveShortener = () => {
    saveShortenerMutation.mutate({
      provider: shortenerProvider as any,
      apiKey: shortenerApiKey || undefined,
      isEnabled: shortenerEnabled,
    });
  };

  const handleAddPixel = () => {
    if (!newPixelId) {
      toast.error("Please enter a pixel ID");
      return;
    }
    addPixelMutation.mutate({
      pixelType: newPixelType as any,
      pixelId: newPixelId,
      pixelCode: newPixelCode || undefined,
    });
  };

  if (shortenerLoading || pixelsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure monetization and tracking options</p>
        </div>

        <Tabs defaultValue="platforms" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="platforms" className="data-[state=active]:bg-primary/20">
              <Globe className="h-4 w-4 mr-2" />
              Platform APIs
            </TabsTrigger>
            <TabsTrigger value="shortener" className="data-[state=active]:bg-primary/20">
              <Link2 className="h-4 w-4 mr-2" />
              URL Shortener
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-primary/20">
              <Eye className="h-4 w-4 mr-2" />
              Tracking Pixels
            </TabsTrigger>
            <TabsTrigger value="cookies" className="data-[state=active]:bg-primary/20">
              <Cookie className="h-4 w-4 mr-2" />
              Cookie Tracking
            </TabsTrigger>
          </TabsList>

          {/* Platform APIs Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Platform API Keys
                </CardTitle>
                <CardDescription>
                  Connect your publishing platform accounts to enable automated article distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  {/* Medium */}
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                          <span className="text-white font-bold text-lg">M</span>
                        </div>
                        <div>
                          <p className="font-medium">Medium</p>
                          <p className="text-xs text-muted-foreground">DA: 95 | Millions of readers</p>
                        </div>
                      </div>
                      <Badge variant="outline">Not Connected</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>Integration Token</Label>
                      <Input type="password" placeholder="Get token from medium.com/me/settings" className="bg-background" />
                      <p className="text-xs text-muted-foreground">Go to Settings → Integration tokens → Get integration token</p>
                    </div>
                  </div>

                  {/* Dev.to */}
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                          <span className="text-white font-bold">DEV</span>
                        </div>
                        <div>
                          <p className="font-medium">Dev.to</p>
                          <p className="text-xs text-muted-foreground">DA: 82 | Developer community</p>
                        </div>
                      </div>
                      <Badge variant="outline">Not Connected</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input type="password" placeholder="Get API key from dev.to/settings/extensions" className="bg-background" />
                      <p className="text-xs text-muted-foreground">Go to Settings → Extensions → Generate API Key</p>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                          <span className="text-white font-bold">in</span>
                        </div>
                        <div>
                          <p className="font-medium">LinkedIn</p>
                          <p className="text-xs text-muted-foreground">DA: 100 | Professional network</p>
                        </div>
                      </div>
                      <Badge variant="outline">Not Connected</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input type="password" placeholder="OAuth access token" className="bg-background" />
                      <p className="text-xs text-muted-foreground">Requires LinkedIn Developer App with w_member_social permission</p>
                    </div>
                  </div>

                  {/* Hashnode */}
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold">#</span>
                        </div>
                        <div>
                          <p className="font-medium">Hashnode</p>
                          <p className="text-xs text-muted-foreground">DA: 78 | Developer blogging</p>
                        </div>
                      </div>
                      <Badge variant="outline">Not Connected</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>Personal Access Token</Label>
                      <Input type="password" placeholder="Get token from hashnode.com/settings/developer" className="bg-background" />
                      <p className="text-xs text-muted-foreground">Go to Account Settings → Developer → Generate New Token</p>
                    </div>
                  </div>

                  {/* Substack */}
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                          <span className="text-white font-bold">S</span>
                        </div>
                        <div>
                          <p className="font-medium">Substack</p>
                          <p className="text-xs text-muted-foreground">DA: 91 | Newsletter platform</p>
                        </div>
                      </div>
                      <Badge variant="outline">Manual Only</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Substack doesn't offer a public API. Articles will be prepared for manual copy-paste.</p>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    How Platform Integration Works
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Add your API keys above to enable automated publishing</li>
                    <li>• Articles will be automatically formatted for each platform</li>
                    <li>• Affiliate links are preserved and properly attributed</li>
                    <li>• Published URLs are tracked in Distribution Center</li>
                  </ul>
                </div>

                <Button onClick={() => toast.success("Platform settings saved!")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Platform Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* URL Shortener Tab */}
          <TabsContent value="shortener" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  URL Shortener Monetization
                </CardTitle>
                <CardDescription>
                  Earn money from every click on your affiliate links by using a paid URL shortener
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Enable URL Shortener</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically shorten affiliate links to earn per-click revenue
                    </p>
                  </div>
                  <Switch
                    checked={shortenerEnabled}
                    onCheckedChange={setShortenerEnabled}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Select Provider</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {URL_SHORTENER_PROVIDERS.map((provider) => (
                      <div
                        key={provider.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          shortenerProvider === provider.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setShortenerProvider(provider.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{provider.name}</span>
                          {shortenerProvider === provider.id && (
                            <Badge variant="default" className="bg-primary">Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{provider.rate}</p>
                        {provider.url && (
                          <a
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Sign up <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {shortenerProvider !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key from the provider"
                      value={shortenerApiKey}
                      onChange={(e) => setShortenerApiKey(e.target.value)}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your API key from your {URL_SHORTENER_PROVIDERS.find(p => p.id === shortenerProvider)?.name} dashboard
                    </p>
                  </div>
                )}

                <Button onClick={handleSaveShortener} disabled={saveShortenerMutation.isPending}>
                  {saveShortenerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>

                {/* Shortened URLs Stats */}
                {shortenedUrls && shortenedUrls.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h3 className="font-medium mb-4">Recent Shortened URLs</h3>
                    <div className="space-y-2">
                      {shortenedUrls.slice(0, 5).map((url) => (
                        <div key={url.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="truncate flex-1 mr-4">
                            <p className="text-sm font-mono truncate">{url.shortUrl}</p>
                            <p className="text-xs text-muted-foreground truncate">{url.originalUrl}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{url.clicks} clicks</p>
                            <p className="text-xs text-green-500">${url.earnings || '0.00'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Pixels Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Tracking Pixels
                    </CardTitle>
                    <CardDescription>
                      Add retargeting pixels to follow up with visitors via advertising
                    </CardDescription>
                  </div>
                  <Dialog open={showAddPixel} onOpenChange={setShowAddPixel}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pixel
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Add Tracking Pixel</DialogTitle>
                        <DialogDescription>
                          Add a retargeting pixel to track visitors and show them ads
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Pixel Type</Label>
                          <Select value={newPixelType} onValueChange={setNewPixelType}>
                            <SelectTrigger className="bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="facebook">Facebook Pixel</SelectItem>
                              <SelectItem value="google">Google Ads</SelectItem>
                              <SelectItem value="tiktok">TikTok Pixel</SelectItem>
                              <SelectItem value="custom">Custom Pixel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Pixel ID</Label>
                          <Input
                            placeholder="e.g., 123456789012345"
                            value={newPixelId}
                            onChange={(e) => setNewPixelId(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                        {newPixelType === 'custom' && (
                          <div className="space-y-2">
                            <Label>Custom Pixel Code</Label>
                            <textarea
                              className="w-full h-32 p-3 rounded-md bg-background border border-border font-mono text-sm"
                              placeholder="<script>...</script>"
                              value={newPixelCode}
                              onChange={(e) => setNewPixelCode(e.target.value)}
                            />
                          </div>
                        )}
                        <Button onClick={handleAddPixel} disabled={addPixelMutation.isPending} className="w-full">
                          {addPixelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Add Pixel
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {pixels && pixels.length > 0 ? (
                  <div className="space-y-3">
                    {pixels.map((pixel) => (
                      <div key={pixel.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            pixel.pixelType === 'facebook' ? 'bg-blue-500/20 text-blue-500' :
                            pixel.pixelType === 'google' ? 'bg-red-500/20 text-red-500' :
                            pixel.pixelType === 'tiktok' ? 'bg-pink-500/20 text-pink-500' :
                            'bg-gray-500/20 text-gray-500'
                          }`}>
                            <Eye className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{pixel.pixelType} Pixel</p>
                            <p className="text-sm text-muted-foreground font-mono">{pixel.pixelId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm">{pixel.totalFires} fires</p>
                            <Badge variant={pixel.isEnabled ? "default" : "secondary"}>
                              {pixel.isEnabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePixelMutation.mutate({ id: pixel.id })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tracking pixels configured</p>
                    <p className="text-sm">Add pixels to retarget visitors with ads</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cookie Tracking Tab */}
          <TabsContent value="cookies" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-primary" />
                  Affiliate Cookie Tracking
                </CardTitle>
                <CardDescription>
                  Track affiliate link clicks and ensure commission attribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-3xl font-bold text-primary">{cookieStats?.totalClicks || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Tracked Clicks</p>
                  </div>
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-500">{cookieStats?.totalConversions || 0}</p>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                  </div>
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-3xl font-bold text-yellow-500">
                      {(cookieStats?.conversionRate || 0).toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <h3 className="font-medium mb-2">How Cookie Tracking Works</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• When a visitor clicks an affiliate link, a 30-day cookie is set</li>
                    <li>• The cookie ensures you get credit for any purchase within 30 days</li>
                    <li>• Commission Junction tracks conversions via their own cookie system</li>
                    <li>• Our tracking provides additional analytics and attribution data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
