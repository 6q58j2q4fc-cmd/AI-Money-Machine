import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { 
  Wallet, 
  DollarSign, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Copy,
  Shield,
  Coins
} from 'lucide-react';

export default function WalletSettings() {
  const [ethAddress, setEthAddress] = useState('');
  const [polygonAddress, setPolygonAddress] = useState('');
  const [arbitrumAddress, setArbitrumAddress] = useState('');
  const [optimismAddress, setOptimismAddress] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [solanaAddress, setSolanaAddress] = useState('');
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [minPayoutThreshold, setMinPayoutThreshold] = useState('0.01');
  const [preferredChain, setPreferredChain] = useState<string>('ethereum');

  // tRPC queries
  const settingsQuery = trpc.wallet.getSettings.useQuery();
  const earningsQuery = trpc.wallet.getEarnings.useQuery();

  // tRPC mutations
  const saveSettingsMutation = trpc.wallet.saveSettings.useMutation({
    onSuccess: () => {
      toast.success('Wallet settings saved successfully! 💰');
      settingsQuery.refetch();
      earningsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const requestPayoutMutation = trpc.wallet.requestPayout.useMutation({
    onSuccess: (result) => {
      toast.success(`Payout of ${result.amount} ETH sent to ${result.walletAddress}! TX: ${result.txHash.slice(0, 10)}...`);
      earningsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Payout failed: ${error.message}`);
    }
  });

  // Load existing settings
  useEffect(() => {
    if (settingsQuery.data) {
      setEthAddress(settingsQuery.data.ethWalletAddress || '');
      setPolygonAddress(settingsQuery.data.polygonWalletAddress || '');
      setArbitrumAddress(settingsQuery.data.arbitrumWalletAddress || '');
      setOptimismAddress(settingsQuery.data.optimismWalletAddress || '');
      setBaseAddress(settingsQuery.data.baseWalletAddress || '');
      setSolanaAddress(settingsQuery.data.solanaWalletAddress || '');
      setAutoPayoutEnabled(settingsQuery.data.autoPayoutEnabled ?? true);
      setMinPayoutThreshold(settingsQuery.data.minPayoutThreshold?.toString() || '0.01');
      setPreferredChain(settingsQuery.data.preferredChain || 'ethereum');
    }
  }, [settingsQuery.data]);

  const handleSave = () => {
    if (!ethAddress || !/^0x[a-fA-F0-9]{40}$/.test(ethAddress)) {
      toast.error('Please enter a valid ETH wallet address');
      return;
    }

    saveSettingsMutation.mutate({
      ethWalletAddress: ethAddress,
      polygonWalletAddress: polygonAddress || undefined,
      arbitrumWalletAddress: arbitrumAddress || undefined,
      optimismWalletAddress: optimismAddress || undefined,
      baseWalletAddress: baseAddress || undefined,
      solanaWalletAddress: solanaAddress || undefined,
      autoPayoutEnabled,
      minPayoutThreshold,
      preferredChain: preferredChain as any,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const earnings = earningsQuery.data;
  const totalEarnings = parseFloat(earnings?.totalEarnings?.toString() || '0');
  const pendingPayout = parseFloat(earnings?.pendingPayout?.toString() || '0');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Wallet className="h-8 w-8 text-yellow-500" />
            Wallet Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your crypto wallet for automatic payouts
          </p>
        </div>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-500/50 bg-gradient-to-br from-green-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {totalEarnings.toFixed(6)} ETH
              </div>
              <p className="text-sm text-muted-foreground">
                ~${(totalEarnings * 2500).toFixed(2)} USD
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {pendingPayout.toFixed(6)} ETH
              </div>
              <Button 
                onClick={() => requestPayoutMutation.mutate()}
                disabled={pendingPayout < parseFloat(minPayoutThreshold) || requestPayoutMutation.isPending}
                size="sm"
                className="mt-2"
              >
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Request Payout
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                Last Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earnings?.lastPayoutAt ? (
                <>
                  <div className="text-xl font-bold text-blue-500">
                    {parseFloat(earnings.lastPayoutAmount?.toString() || '0').toFixed(6)} ETH
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(earnings.lastPayoutAt).toLocaleDateString()}
                  </p>
                  {earnings.lastPayoutTxHash && (
                    <a 
                      href={`https://etherscan.io/tx/${earnings.lastPayoutTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
                    >
                      View TX <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">No payouts yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Wallet Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Wallet Addresses
            </CardTitle>
            <CardDescription>
              Configure your wallet addresses for receiving crypto payouts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary ETH Wallet */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-blue-500" />
                Primary ETH Wallet (Required)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={ethAddress}
                  onChange={(e) => setEthAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
                {ethAddress && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(ethAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {ethAddress && /^0x[a-fA-F0-9]{40}$/.test(ethAddress) && (
                <Badge variant="outline" className="text-green-500 border-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Valid Address
                </Badge>
              )}
            </div>

            {/* Additional Chain Wallets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Polygon Wallet (Optional)</Label>
                <Input
                  value={polygonAddress}
                  onChange={(e) => setPolygonAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Arbitrum Wallet (Optional)</Label>
                <Input
                  value={arbitrumAddress}
                  onChange={(e) => setArbitrumAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Optimism Wallet (Optional)</Label>
                <Input
                  value={optimismAddress}
                  onChange={(e) => setOptimismAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Base Wallet (Optional)</Label>
                <Input
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Solana Wallet (Optional)</Label>
                <Input
                  value={solanaAddress}
                  onChange={(e) => setSolanaAddress(e.target.value)}
                  placeholder="..."
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payout Settings</CardTitle>
            <CardDescription>
              Configure automatic payout preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Payout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send earnings when threshold is reached
                </p>
              </div>
              <Switch
                checked={autoPayoutEnabled}
                onCheckedChange={setAutoPayoutEnabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Payout Threshold (ETH)</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={minPayoutThreshold}
                  onChange={(e) => setMinPayoutThreshold(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Chain</Label>
                <Select value={preferredChain} onValueChange={setPreferredChain}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="optimism">Optimism</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Wallet Settings'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
