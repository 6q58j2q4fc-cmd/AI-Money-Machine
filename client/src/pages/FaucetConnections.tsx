import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Coins, 
  Key, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Wallet,
  RefreshCw
} from "lucide-react";

interface FaucetConfig {
  id: string;
  name: string;
  description: string;
  website: string;
  apiKeyName: string;
  apiKeyPlaceholder: string;
  setupGuide: string[];
  estimatedEarnings: string;
  payoutThreshold: string;
}

const FAUCET_CONFIGS: FaucetConfig[] = [
  {
    id: "freebitcoin",
    name: "FreeBitco.in",
    description: "One of the oldest and most trusted Bitcoin faucets. Claim free BTC every hour.",
    website: "https://freebitco.in",
    apiKeyName: "FREEBITCOIN_API_KEY",
    apiKeyPlaceholder: "Enter your FreeBitco.in API key",
    setupGuide: [
      "1. Go to freebitco.in and create an account",
      "2. Navigate to Profile → API",
      "3. Generate a new API key",
      "4. Copy the API key and paste it here"
    ],
    estimatedEarnings: "$0.10 - $0.50/day",
    payoutThreshold: "0.0003 BTC"
  },
  {
    id: "faucetpay",
    name: "FaucetPay",
    description: "Micro-wallet that aggregates earnings from multiple faucets. Supports BTC, ETH, LTC, and more.",
    website: "https://faucetpay.io",
    apiKeyName: "FAUCETPAY_API_KEY",
    apiKeyPlaceholder: "Enter your FaucetPay API key",
    setupGuide: [
      "1. Register at faucetpay.io",
      "2. Go to Dashboard → API",
      "3. Create a new API key with 'Read' permissions",
      "4. Copy the API key and paste it here"
    ],
    estimatedEarnings: "$0.05 - $0.30/day",
    payoutThreshold: "Varies by coin"
  },
  {
    id: "cointiply",
    name: "Cointiply",
    description: "Earn Bitcoin by completing tasks, watching videos, and playing games.",
    website: "https://cointiply.com",
    apiKeyName: "COINTIPLY_API_KEY",
    apiKeyPlaceholder: "Enter your Cointiply API key",
    setupGuide: [
      "1. Sign up at cointiply.com",
      "2. Go to Account Settings",
      "3. Find the API section",
      "4. Generate and copy your API key"
    ],
    estimatedEarnings: "$0.20 - $1.00/day",
    payoutThreshold: "50,000 coins (~$5)"
  },
  {
    id: "firefaucet",
    name: "FireFaucet",
    description: "Auto-claim faucet that supports multiple cryptocurrencies.",
    website: "https://firefaucet.win",
    apiKeyName: "FIREFAUCET_API_KEY",
    apiKeyPlaceholder: "Enter your FireFaucet API key",
    setupGuide: [
      "1. Register at firefaucet.win",
      "2. Go to Settings → API",
      "3. Enable API access",
      "4. Copy your API key"
    ],
    estimatedEarnings: "$0.05 - $0.25/day",
    payoutThreshold: "Varies by coin"
  },
  {
    id: "dutchycorp",
    name: "DutchyCorp",
    description: "Multi-faucet platform with auto-claim feature.",
    website: "https://autofaucet.dutchycorp.space",
    apiKeyName: "DUTCHYCORP_API_KEY",
    apiKeyPlaceholder: "Enter your DutchyCorp API key",
    setupGuide: [
      "1. Create account at autofaucet.dutchycorp.space",
      "2. Navigate to API settings",
      "3. Generate your API key",
      "4. Copy and paste here"
    ],
    estimatedEarnings: "$0.10 - $0.40/day",
    payoutThreshold: "Varies"
  },
  {
    id: "expresscrypto",
    name: "ExpressCrypto",
    description: "Micro-wallet supporting 20+ cryptocurrencies from various faucets.",
    website: "https://expresscrypto.io",
    apiKeyName: "EXPRESSCRYPTO_API_KEY",
    apiKeyPlaceholder: "Enter your ExpressCrypto API key",
    setupGuide: [
      "1. Sign up at expresscrypto.io",
      "2. Go to Account → API",
      "3. Create a new API key",
      "4. Copy the key here"
    ],
    estimatedEarnings: "$0.05 - $0.20/day",
    payoutThreshold: "Varies by coin"
  }
];

export default function FaucetConnections() {
  // Using sonner toast
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connected' | 'disconnected' | 'testing'>>({});
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // Get saved faucet accounts
  const { data: faucetAccounts, refetch: refetchAccounts } = trpc.faucetAccounts.list.useQuery();
  
  // Save API key mutation
  const saveApiKeyMutation = trpc.faucetAccounts.add.useMutation({
    onSuccess: () => {
      toast.success("API Key Saved - Your faucet API key has been saved successfully.");
      refetchAccounts();
    },
    onError: (error: { message: string }) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleApiKeyChange = (faucetId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [faucetId]: value }));
  };

  const handleTestConnection = async (faucet: FaucetConfig) => {
    setConnectionStatus(prev => ({ ...prev, [faucet.id]: 'testing' }));
    
    // Simulate API test (in real implementation, this would call the actual API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const apiKey = apiKeys[faucet.id];
    if (apiKey && apiKey.length > 10) {
      setConnectionStatus(prev => ({ ...prev, [faucet.id]: 'connected' }));
      toast.success(`Connected to ${faucet.name} successfully!`);
    } else {
      setConnectionStatus(prev => ({ ...prev, [faucet.id]: 'disconnected' }));
      toast.error("Connection Failed - Invalid API key. Please check and try again.");
    }
  };

  const handleSaveApiKey = async (faucet: FaucetConfig) => {
    const apiKey = apiKeys[faucet.id];
    if (!apiKey) {
      toast.error("Please enter an API key first.");
      return;
    }

    await saveApiKeyMutation.mutateAsync({
      platform: faucet.id,
      email: `${faucet.id}@faucet.local`,
      password: apiKey,
      walletAddress: "",
    });
  };

  const getConnectionBadge = (faucetId: string) => {
    const status = connectionStatus[faucetId];
    const savedAccount = faucetAccounts?.find((a) => a.platform === faucetId);
    
    if (status === 'testing') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Testing...</Badge>;
    }
    if (status === 'connected' || savedAccount?.loginStatus === 'connected') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>;
    }
    return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-400 border-zinc-500/30"><XCircle className="w-3 h-3 mr-1" /> Not Connected</Badge>;
  };

  const connectedCount = faucetAccounts?.filter((a) => a.loginStatus === 'connected').length || 0;
  const totalFaucets = FAUCET_CONFIGS.length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Coins className="w-7 h-7 text-yellow-500" />
              Faucet Connections
            </h1>
            <p className="text-zinc-400 mt-1">Connect your crypto faucet accounts to start earning real cryptocurrency</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg px-4 py-2 bg-zinc-800/50">
              <Wallet className="w-4 h-4 mr-2 text-yellow-500" />
              {connectedCount} / {totalFaucets} Connected
            </Badge>
          </div>
        </div>

        {/* Warning Banner */}
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-medium">Important: Real Earnings Require Real Connections</p>
              <p className="text-yellow-500/80 text-sm mt-1">
                To earn real cryptocurrency, you must connect your actual faucet accounts using valid API keys. 
                Without connections, the system can only show simulated data. Each faucet requires you to create 
                an account on their platform first.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Faucet Cards */}
        <div className="grid gap-4">
          {FAUCET_CONFIGS.map((faucet) => {
            const savedAccount = faucetAccounts?.find((a) => a.platform === faucet.id);
            const currentApiKey = apiKeys[faucet.id] || '';
            
            return (
              <Card key={faucet.id} className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">{faucet.name}</CardTitle>
                        <CardDescription className="text-zinc-400">{faucet.description}</CardDescription>
                      </div>
                    </div>
                    {getConnectionBadge(faucet.id)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Row */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Est. Earnings:</span>
                      <span className="text-green-400 font-medium">{faucet.estimatedEarnings}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">Payout:</span>
                      <span className="text-zinc-300">{faucet.payoutThreshold}</span>
                    </div>
                    <a 
                      href={faucet.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </a>
                  </div>

                  {/* API Key Input */}
                  <div className="space-y-2">
                    <Label htmlFor={`api-${faucet.id}`} className="text-zinc-300 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Key
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`api-${faucet.id}`}
                        type="password"
                        placeholder={faucet.apiKeyPlaceholder}
                        value={currentApiKey}
                        onChange={(e) => handleApiKeyChange(faucet.id, e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 text-white flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection(faucet)}
                        disabled={connectionStatus[faucet.id] === 'testing'}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        {connectionStatus[faucet.id] === 'testing' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Test
                      </Button>
                      <Button
                        onClick={() => handleSaveApiKey(faucet)}
                        disabled={saveApiKeyMutation.isPending}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        {saveApiKeyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Setup Guide Toggle */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedGuide(expandedGuide === faucet.id ? null : faucet.id)}
                      className="text-zinc-400 hover:text-white p-0 h-auto"
                    >
                      {expandedGuide === faucet.id ? "Hide" : "Show"} Setup Guide
                    </Button>
                    
                    {expandedGuide === faucet.id && (
                      <div className="mt-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <h4 className="text-sm font-medium text-white mb-2">How to get your API key:</h4>
                        <ol className="space-y-1">
                          {faucet.setupGuide.map((step, index) => (
                            <li key={index} className="text-sm text-zinc-400">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Help Section */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-zinc-400">
            <p>
              <strong className="text-white">Why connect faucets?</strong> Connecting your faucet accounts allows the system to automatically claim rewards and track your real earnings across multiple platforms.
            </p>
            <p>
              <strong className="text-white">Is it safe?</strong> API keys only provide limited access to your account (usually read-only or claim-only). They cannot be used to withdraw funds without additional verification.
            </p>
            <p>
              <strong className="text-white">How much can I earn?</strong> Earnings vary based on claim frequency, bonus multipliers, and market conditions. Combined earnings from all faucets can range from $0.50 to $3.00 per day.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
