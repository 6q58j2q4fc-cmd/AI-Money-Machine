import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Settings, RefreshCw, DollarSign, Clock, CheckCircle, XCircle, Key, Shield } from "lucide-react";

export default function FaucetAccounts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  
  // CAPTCHA settings state
  const [captchaService, setCaptchaService] = useState<"none" | "2captcha" | "anticaptcha" | "capsolver">("none");
  const [twoCaptchaKey, setTwoCaptchaKey] = useState("");
  const [antiCaptchaKey, setAntiCaptchaKey] = useState("");
  const [maxCostPerDay, setMaxCostPerDay] = useState("5");

  // Queries
  const { data: accounts, refetch: refetchAccounts } = trpc.faucetAccounts.list.useQuery();
  const { data: platforms } = trpc.faucetAccounts.platforms.useQuery();
  const { data: stats } = trpc.faucetAccounts.stats.useQuery();
  const { data: claimHistory } = trpc.faucetAccounts.claimHistory.useQuery({ limit: 20 });
  const { data: captchaSettings } = trpc.captcha.settings.useQuery();
  const { data: captchaStats } = trpc.captcha.stats.useQuery();

  // Mutations
  const addAccount = trpc.faucetAccounts.add.useMutation({
    onSuccess: () => {
      toast.success("Faucet account added successfully!");
      setIsAddDialogOpen(false);
      resetForm();
      refetchAccounts();
    },
    onError: (error) => {
      toast.error(`Failed to add account: ${error.message}`);
    },
  });

  const deleteAccount = trpc.faucetAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Account deleted");
      refetchAccounts();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const toggleAccount = trpc.faucetAccounts.update.useMutation({
    onSuccess: () => {
      refetchAccounts();
    },
  });

  const saveCaptchaSettings = trpc.captcha.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("CAPTCHA settings saved!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedPlatform("");
    setEmail("");
    setPassword("");
    setWalletAddress("");
  };

  const handleAddAccount = () => {
    if (!selectedPlatform || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    addAccount.mutate({
      platform: selectedPlatform,
      email,
      password,
      walletAddress: walletAddress || undefined,
    });
  };

  const handleSaveCaptchaSettings = () => {
    saveCaptchaSettings.mutate({
      primaryService: captchaService,
      twoCaptchaApiKey: twoCaptchaKey || undefined,
      antiCaptchaApiKey: antiCaptchaKey || undefined,
      maxCostPerDay: parseFloat(maxCostPerDay) || 5,
      autoSolveEnabled: true,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Faucet Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your crypto faucet accounts for automated claiming
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Faucet Account</DialogTitle>
                <DialogDescription>
                  Add your faucet account credentials for automated claiming
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a faucet platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.icon} {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wallet Address (Optional)</Label>
                  <Input
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Override the default wallet for this faucet
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAccount} disabled={addAccount.isPending}>
                  {addAccount.isPending ? "Adding..." : "Add Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Accounts</p>
                  <p className="text-2xl font-bold">{stats?.totalAccounts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats?.activeAccounts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Claims</p>
                  <p className="text-2xl font-bold">{stats?.totalClaims || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{stats?.successRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="captcha">CAPTCHA Settings</TabsTrigger>
            <TabsTrigger value="history">Claim History</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            {accounts?.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Faucet Accounts</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first faucet account to start automated claiming
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Account
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {accounts?.map((account) => (
                  <Card key={account.id} className="bg-card border-border">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{account.platformIcon}</div>
                          <div>
                            <h3 className="font-semibold">{account.platform}</h3>
                            <p className="text-sm text-muted-foreground">{account.email}</p>
                          </div>
                          <Badge
                            variant={account.loginStatus === "logged_in" ? "default" : "secondary"}
                            className={account.loginStatus === "logged_in" ? "bg-green-500" : ""}
                          >
                            {account.loginStatus === "logged_in" ? "Connected" : "Disconnected"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Claims</p>
                            <p className="font-semibold">{account.totalClaims}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Earnings</p>
                            <p className="font-semibold text-green-500">
                              {parseFloat(account.totalEarnings).toFixed(8)} {account.earningsCurrency}
                            </p>
                          </div>
                          <Switch
                            checked={account.isEnabled}
                            onCheckedChange={(checked) =>
                              toggleAccount.mutate({ accountId: account.id, isEnabled: checked })
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAccount.mutate({ accountId: account.id })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {account.errorMessage && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                          {account.errorMessage}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="captcha" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  CAPTCHA Solving Service
                </CardTitle>
                <CardDescription>
                  Configure automatic CAPTCHA solving for faucet claims
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Primary Service</Label>
                  <Select
                    value={captchaSettings?.primaryService || captchaService}
                    onValueChange={(v: any) => setCaptchaService(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CAPTCHA service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Manual)</SelectItem>
                      <SelectItem value="2captcha">2Captcha</SelectItem>
                      <SelectItem value="anticaptcha">Anti-Captcha</SelectItem>
                      <SelectItem value="capsolver">CapSolver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>2Captcha API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter your 2Captcha API key"
                      value={twoCaptchaKey}
                      onChange={(e) => setTwoCaptchaKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your key at{" "}
                      <a href="https://2captcha.com" target="_blank" className="text-primary hover:underline">
                        2captcha.com
                      </a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Anti-Captcha API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter your Anti-Captcha API key"
                      value={antiCaptchaKey}
                      onChange={(e) => setAntiCaptchaKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your key at{" "}
                      <a href="https://anti-captcha.com" target="_blank" className="text-primary hover:underline">
                        anti-captcha.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Max Cost Per Day ($)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={maxCostPerDay}
                    onChange={(e) => setMaxCostPerDay(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stop solving CAPTCHAs when daily cost reaches this limit
                  </p>
                </div>

                <Button onClick={handleSaveCaptchaSettings} disabled={saveCaptchaSettings.isPending}>
                  {saveCaptchaSettings.isPending ? "Saving..." : "Save Settings"}
                </Button>

                {captchaStats?.configured && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-3">CAPTCHA Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Solved</p>
                        <p className="text-xl font-bold">{captchaStats.totalSolved}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-xl font-bold">${captchaStats.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Today's Cost</p>
                        <p className="text-xl font-bold">
                          ${captchaStats.dailyCostUsed.toFixed(2)} / ${captchaStats.dailyCostLimit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Balances</p>
                        {Object.entries(captchaStats.balances || {}).map(([service, balance]) => (
                          <p key={service} className="text-sm">
                            {service}: ${(balance as number).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Claims
                </CardTitle>
              </CardHeader>
              <CardContent>
                {claimHistory?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No claims yet. Add accounts and start claiming!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {claimHistory?.map((claim) => (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {claim.status === "success" ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <div>
                            <p className="font-medium">{claim.platform}</p>
                            <p className="text-xs text-muted-foreground">
                              {claim.createdAt ? new Date(claim.createdAt).toLocaleString() : "Unknown"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {claim.status === "success" ? (
                            <p className="text-green-500 font-semibold">
                              +{claim.claimAmount} {claim.currency}
                            </p>
                          ) : (
                            <p className="text-destructive text-sm">{claim.errorMessage || "Failed"}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
