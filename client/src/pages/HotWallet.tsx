import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Wallet, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Fuel,
  Network,
  QrCode,
  Send,
  Loader2,
  DollarSign,
  Eye,
  EyeOff,
  KeyRound,
  Search
} from 'lucide-react';

// Trust Wallet address for payouts
const TRUST_WALLET = '0x75812e1c4246A880f6576db8292405247e6a8775';

export default function HotWallet() {
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ethereum');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState(TRUST_WALLET);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [previewAddress, setPreviewAddress] = useState<string | null>(null);
  const [isValidKey, setIsValidKey] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [lookupAddress, setLookupAddress] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Queries
  const { data: status, refetch: refetchStatus, isLoading: statusLoading } = trpc.hotWallet.getStatus.useQuery();
  const { data: depositInfo, refetch: refetchDeposit } = trpc.hotWallet.getDepositInstructions.useQuery();
  const { data: gasEstimate, refetch: refetchGas } = trpc.hotWallet.estimateGas.useQuery(
    { network: selectedNetwork as any },
    { enabled: !!selectedNetwork }
  );
  const { data: cheapestNetwork } = trpc.hotWallet.findCheapestNetwork.useQuery();
  const { data: networks } = trpc.hotWallet.getNetworks.useQuery();
  const { data: transactionHistory, refetch: refetchHistory } = trpc.hotWallet.getTransactionHistory.useQuery({ limit: 50 });
  const { data: realTransactions, refetch: refetchRealHistory, isLoading: realTxLoading } = trpc.hotWallet.getRealTransactionHistory.useQuery({ limit: 50 });

  // Mutations
  const initializeMutation = trpc.hotWallet.initialize.useMutation({
    onSuccess: () => {
      toast.success('Hot wallet initialized successfully!');
      refetchStatus();
      refetchDeposit();
    },
    onError: (error) => {
      toast.error(`Failed to initialize: ${error.message}`);
    },
  });

  // Import wallet mutation
  const importWalletMutation = trpc.hotWallet.importWallet.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Wallet imported successfully! Address: ${result.address?.slice(0, 10)}...`);
        setPrivateKeyInput('');
        setShowImportModal(false);
        refetchStatus();
        refetchDeposit();
      } else {
        toast.error(result.error || 'Failed to import wallet');
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const sendMutation = trpc.hotWallet.sendTransaction.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span>Transaction sent successfully!</span>
            <a 
              href={result.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              View on Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        );
        refetchStatus();
        setSendAmount('');
      } else {
        toast.error(result.error || 'Transaction failed');
      }
    },
    onError: (error) => {
      toast.error(`Transaction failed: ${error.message}`);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchStatus(), refetchDeposit(), refetchGas()]);
    setIsRefreshing(false);
    toast.success('Balances refreshed');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSend = () => {
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!sendTo) {
      toast.error('Please enter a destination address');
      return;
    }
    
    sendMutation.mutate({
      network: selectedNetwork as any,
      to: sendTo,
      amount: sendAmount,
    });
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0.0000';
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(4);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Wallet className="h-8 w-8 text-emerald-500" />
              Hot Wallet Management
            </h1>
            <p className="text-zinc-400 mt-1">
              Server-side wallet for gas fees and on-chain transfers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {!status?.initialized && (
              <Button
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {initializeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Initialize Wallet
              </Button>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Wallet Status</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {status?.initialized ? (
                      <span className="flex items-center gap-2 text-emerald-500">
                        <CheckCircle2 className="h-5 w-5" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-yellow-500">
                        <AlertTriangle className="h-5 w-5" />
                        Not Initialized
                      </span>
                    )}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Value</p>
                  <p className="text-xl font-bold text-emerald-500 mt-1">
                    ${status?.totalValueUsd?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Can Execute</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {status?.canExecuteTransactions ? (
                      <span className="text-emerald-500">Yes</span>
                    ) : (
                      <span className="text-red-500">No - Fund Wallet</span>
                    )}
                  </p>
                </div>
                <Send className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Cheapest Network</p>
                  <p className="text-xl font-bold text-white mt-1 capitalize">
                    {cheapestNetwork?.network || 'Loading...'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    ~${cheapestNetwork?.estimatedCostUsd?.toFixed(4) || '0'}/tx
                  </p>
                </div>
                <Fuel className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Balance Warnings */}
        {status?.lowBalanceWarnings && status.lowBalanceWarnings.length > 0 && (
          <Card className="bg-yellow-900/20 border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">Low Balance Warnings</p>
                  <ul className="text-sm text-yellow-400/80 mt-1 space-y-1">
                    {status.lowBalanceWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="deposit" className="space-y-4">
          <TabsList className="bg-zinc-800">
            <TabsTrigger value="deposit">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="balances">
              <Network className="h-4 w-4 mr-2" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="send">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Send
            </TabsTrigger>
            <TabsTrigger value="gas">
              <Fuel className="h-4 w-4 mr-2" />
              Gas Prices
            </TabsTrigger>
            <TabsTrigger value="history">
              <DollarSign className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="import">
              <Wallet className="h-4 w-4 mr-2" />
              Import
            </TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-500" />
                  Deposit Address
                </CardTitle>
                <CardDescription>
                  Send ETH or MATIC to this address to fund your hot wallet for gas fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {depositInfo?.address ? (
                  <>
                    <div className="bg-zinc-800 p-4 rounded-lg">
                      <Label className="text-zinc-400 text-sm">Hot Wallet Address</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 bg-zinc-950 p-3 rounded text-emerald-400 font-mono text-sm break-all">
                          {depositInfo.address}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(depositInfo.address, 'Address')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {depositInfo.networks.map((network) => (
                        <Card key={network.id} className="bg-zinc-800 border-zinc-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{network.name}</span>
                              <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                                {network.symbol}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-400">
                              Min deposit: {network.minDeposit} {network.symbol}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-500 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Important Warnings
                      </h4>
                      <ul className="text-sm text-yellow-400/80 mt-2 space-y-1 list-disc list-inside">
                        {depositInfo.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">Initialize wallet to get deposit address</p>
                    <Button
                      onClick={() => initializeMutation.mutate()}
                      disabled={initializeMutation.isPending}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Initialize Wallet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Network Balances</CardTitle>
                <CardDescription>
                  View your hot wallet balance across all supported networks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {status?.balances && Object.entries(status.balances).map(([networkId, data]) => (
                    <Card key={networkId} className="bg-zinc-800 border-zinc-700">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-white capitalize">{networkId}</span>
                          <Badge 
                            variant="outline" 
                            className={parseFloat(data.balance) > 0 ? 'text-emerald-400 border-emerald-400' : 'text-zinc-500 border-zinc-600'}
                          >
                            {data.symbol}
                          </Badge>
                        </div>
                        <p className={`text-2xl font-bold ${parseFloat(data.balance) > 0 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                          {formatBalance(data.balance)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {data.symbol}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Send Transaction</CardTitle>
                <CardDescription>
                  Send ETH from hot wallet to your Trust Wallet or other addresses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Network</Label>
                    <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {networks?.map((network) => (
                          <SelectItem key={network.id} value={network.id}>
                            {network.name} ({network.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="0.0000"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Destination Address</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="0x..."
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setSendTo(TRUST_WALLET)}
                    >
                      Trust Wallet
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Default: Your Trust Wallet ({TRUST_WALLET.slice(0, 10)}...{TRUST_WALLET.slice(-8)})
                  </p>
                </div>

                {gasEstimate && (
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-sm text-zinc-400">Estimated Gas Cost</p>
                    <p className="text-lg font-medium text-white">
                      {gasEstimate.estimatedTxCost} {selectedNetwork === 'polygon' ? 'MATIC' : 'ETH'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      ~${gasEstimate.estimatedTxCostUsd.toFixed(4)} USD • {gasEstimate.gasPriceGwei} Gwei
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || !sendAmount || !sendTo}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Transaction
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gas Prices Tab */}
          <TabsContent value="gas">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Gas Price Comparison</CardTitle>
                <CardDescription>
                  Compare gas prices across networks to find the cheapest option
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {networks?.map((network) => (
                    <GasPriceCard key={network.id} networkId={network.id} networkName={network.name} symbol={network.symbol} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      Transaction History
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                        LIVE BLOCKCHAIN
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Real transactions fetched directly from Etherscan and block explorers
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchHistory();
                      refetchRealHistory();
                    }}
                    disabled={realTxLoading}
                    className="border-zinc-700"
                  >
                    {realTxLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Real blockchain transactions */}
                {realTransactions?.transactions && realTransactions.transactions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-zinc-400 mb-4">
                      Found {(realTransactions as any).totalCount || realTransactions.transactions.length} transactions across all networks
                    </div>
                    {realTransactions.transactions.map((tx: any, index: number) => (
                      <div
                        key={tx.hash || index}
                        className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg border border-zinc-700"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${tx.type === 'incoming' ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}>
                            {tx.type === 'incoming' ? (
                              <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5 text-orange-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {tx.type === 'incoming' ? 'Received' : 'Sent'} {tx.valueFormatted}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  tx.status === 'success' ? 'text-emerald-400 border-emerald-400' :
                                  tx.status === 'failed' ? 'text-red-400 border-red-400' :
                                  'text-yellow-400 border-yellow-400'
                                }`}
                              >
                                {tx.status === 'success' ? 'Confirmed' : tx.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                                {tx.network?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-zinc-400">
                              Block #{tx.blockNumber} • {tx.dateFormatted}
                            </p>
                            <p className="text-xs text-zinc-500 font-mono mt-1">
                              TX: {tx.hash?.slice(0, 20)}...{tx.hash?.slice(-8)}
                            </p>
                            <p className="text-xs text-zinc-600 font-mono">
                              {tx.type === 'incoming' ? 'From' : 'To'}: {tx.type === 'incoming' ? tx.from?.slice(0, 10) : tx.to?.slice(0, 10)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-zinc-400">
                            {tx.confirmations} confirmations
                          </p>
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 justify-end mt-1"
                          >
                            View on Explorer <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : realTxLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 text-emerald-500 mx-auto mb-4 animate-spin" />
                    <p className="text-zinc-400">Fetching transactions from blockchain...</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No transactions found on blockchain</p>
                    <p className="text-sm text-zinc-500 mt-2">
                      Transactions will appear here once you send or receive crypto to this wallet
                    </p>
                    <p className="text-xs text-zinc-600 mt-4">
                      Wallet: {status?.address?.slice(0, 10)}...{status?.address?.slice(-8)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Wallet Tab */}
          <TabsContent value="import">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <KeyRound className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Import Existing Wallet</CardTitle>
                    <CardDescription>
                      Recover a wallet using its private key to access existing funds
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Important: Address vs Private Key */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <KeyRound className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-400">Important: Private Key Required</h4>
                      <div className="text-sm text-blue-300/80 mt-2 space-y-2">
                        <p><strong>Wallet Address</strong> (40 characters) - This is PUBLIC, like your bank account number:</p>
                        <code className="block bg-zinc-800 p-2 rounded text-xs text-zinc-300 break-all">
                          0x4Ced8a78aFA8B7B1f4352AB869F1CF6bF75726d0
                        </code>
                        <p className="mt-3"><strong>Private Key</strong> (64 characters) - This is SECRET, like your PIN:</p>
                        <code className="block bg-zinc-800 p-2 rounded text-xs text-zinc-300 break-all">
                          ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
                        </code>
                        <p className="mt-3 text-yellow-400">⚠️ You need the PRIVATE KEY to import a wallet, not the address.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-500">Security Warning</h4>
                      <p className="text-sm text-yellow-400/80 mt-1">
                        Never share your private key with anyone. Only import wallets you own.
                        This will replace your current hot wallet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Private Key Input */}
                <div className="space-y-3">
                  <Label className="text-white font-medium">Private Key (64 hex characters)</Label>
                  <div className="relative">
                    <Input
                      type={showPrivateKey ? 'text' : 'password'}
                      placeholder="Paste your 64-character private key here..."
                      value={privateKeyInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[\s-]/g, ''); // Remove spaces and dashes
                        setPrivateKeyInput(value);
                        // Check if user entered a wallet address instead of private key
                        const cleanValue = value.startsWith('0x') ? value.slice(2) : value;
                        const isWalletAddress = /^[a-fA-F0-9]{40}$/.test(cleanValue);
                        const isValidPrivateKey = /^[a-fA-F0-9]{64}$/.test(cleanValue);
                        
                        if (isWalletAddress && !isValidPrivateKey) {
                          setIsValidKey(false);
                          setPreviewAddress('ADDRESS_NOT_KEY');
                        } else if (isValidPrivateKey) {
                          setIsValidKey(true);
                          const keyHash = cleanValue.slice(0, 8);
                          setPreviewAddress(`0x${keyHash}...${cleanValue.slice(-8)}`);
                        } else {
                          setIsValidKey(false);
                          setPreviewAddress(null);
                        }
                      }}
                      className="bg-zinc-800 border-zinc-700 font-mono pr-12 text-white placeholder:text-zinc-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-zinc-700"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-zinc-400" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      {privateKeyInput ? `${(privateKeyInput.startsWith('0x') ? privateKeyInput.slice(2) : privateKeyInput).replace(/[\s-]/g, '').length}/64 characters` : '64 hexadecimal characters required'}
                    </p>
                    {privateKeyInput && (
                      <Badge 
                        variant={isValidKey ? 'default' : 'destructive'} 
                        className={isValidKey ? 'bg-emerald-600' : previewAddress === 'ADDRESS_NOT_KEY' ? 'bg-orange-600' : ''}
                      >
                        {isValidKey ? 'Valid Private Key ✓' : previewAddress === 'ADDRESS_NOT_KEY' ? 'This is an Address, not a Key!' : 'Invalid Format'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Error: User entered wallet address - with lookup option */}
                {previewAddress === 'ADDRESS_NOT_KEY' && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-400">You Entered a Wallet Address</h4>
                        <p className="text-sm text-orange-300/80 mt-1">
                          This looks like a <strong>wallet address</strong> (40 characters), not a <strong>private key</strong> (64 characters).
                        </p>
                        <p className="text-sm text-orange-300/80 mt-2">
                          To import a wallet, you need the private key. Here's how to find it:
                        </p>
                        <ul className="text-sm text-orange-300/80 mt-2 list-disc list-inside space-y-1">
                          <li><strong>Trust Wallet:</strong> Settings → Wallets → (i) icon → Show Private Key</li>
                          <li><strong>MetaMask:</strong> Account Details → Export Private Key</li>
                          <li><strong>Coinbase Wallet:</strong> Settings → Security → Show Private Key</li>
                        </ul>
                        
                        {/* Quick lookup button */}
                        <div className="mt-4 pt-4 border-t border-orange-500/30">
                          <p className="text-sm text-orange-300/80 mb-2">
                            <strong>Want to check if this address has funds?</strong>
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const cleanValue = privateKeyInput.startsWith('0x') ? privateKeyInput : `0x${privateKeyInput}`;
                              setLookupAddress(cleanValue);
                              setIsLookingUp(true);
                            }}
                            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Check Balance of This Address
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet Preview */}
                {isValidKey && previewAddress !== 'ADDRESS_NOT_KEY' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-emerald-400">✓ Valid Private Key - Ready to Import</h4>
                        <p className="text-sm text-emerald-300/80 mt-1 font-mono">
                          Key Preview: {previewAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Button */}
                <Button
                  onClick={() => {
                    if (!isValidKey) {
                      if (previewAddress === 'ADDRESS_NOT_KEY') {
                        toast.error('You entered a wallet address. Please enter the private key instead (64 characters).');
                      } else {
                        toast.error('Please enter a valid 64-character hex private key');
                      }
                      return;
                    }
                    importWalletMutation.mutate({ privateKey: privateKeyInput });
                  }}
                  disabled={!isValidKey || importWalletMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-medium"
                >
                  {importWalletMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Importing Wallet...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 mr-2" />
                      Import Wallet
                    </>
                  )}
                </Button>

                {/* Current Wallet Info */}
                <div className="border-t border-zinc-800 pt-6 mt-6">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-zinc-400" />
                    Current Hot Wallet
                  </h4>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Address:</p>
                        <p className="font-mono text-emerald-400 text-lg">
                          {status?.address || 'Not initialized'}
                        </p>
                      </div>
                      {status?.address && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(status.address!);
                            toast.success('Address copied!');
                          }}
                          className="hover:bg-zinc-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {status?.initialized && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-sm text-emerald-400">Wallet Active</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Import Instructions */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h5 className="font-medium text-white mb-2">How to Import</h5>
                  <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>Export your private key from your existing wallet (Trust Wallet, MetaMask, etc.)</li>
                    <li>Paste the 64-character hex key above (with or without 0x prefix)</li>
                    <li>Click "Import Wallet" to replace the current hot wallet</li>
                    <li>Your funds will be immediately accessible</li>
                  </ol>
                </div>

                {/* Address Lookup Section */}
                <div className="border-t border-zinc-800 pt-6 mt-6">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-400" />
                    Check Any Wallet Balance
                  </h4>
                  <p className="text-sm text-zinc-400 mb-4">
                    Enter any wallet address to check its balance across all networks (no private key needed).
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter wallet address (0x...)"
                      value={lookupAddress}
                      onChange={(e) => setLookupAddress(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 font-mono text-white placeholder:text-zinc-500"
                    />
                    <Button
                      onClick={() => setIsLookingUp(true)}
                      disabled={!lookupAddress || lookupAddress.length < 40}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Lookup
                    </Button>
                  </div>
                  
                  {/* Lookup Results */}
                  {isLookingUp && lookupAddress && (
                    <AddressLookupResults address={lookupAddress} onClose={() => setIsLookingUp(false)} />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Gas Price Card Component
function GasPriceCard({ networkId, networkName, symbol }: { networkId: string; networkName: string; symbol: string }) {
  const { data: gasEstimate, isLoading } = trpc.hotWallet.estimateGas.useQuery(
    { network: networkId as any },
    { refetchInterval: 30000 }
  );

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-white">{networkName}</span>
          <Badge variant="outline" className="text-zinc-400 border-zinc-600">
            {symbol}
          </Badge>
        </div>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-6 bg-zinc-700 rounded w-20 mb-2"></div>
            <div className="h-4 bg-zinc-700 rounded w-16"></div>
          </div>
        ) : (
          <>
            <p className="text-xl font-bold text-white">
              {gasEstimate?.gasPriceGwei || '0'} Gwei
            </p>
            <p className="text-sm text-zinc-400">
              ~${gasEstimate?.estimatedTxCostUsd?.toFixed(4) || '0'}/tx
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Address Lookup Results Component
function AddressLookupResults({ address, onClose }: { address: string; onClose: () => void }) {
  const { data: lookupData, isLoading, error } = trpc.hotWallet.lookupAddress.useQuery(
    { address },
    { enabled: !!address && address.length >= 40 }
  );

  if (isLoading) {
    return (
      <div className="mt-4 bg-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-zinc-300">Looking up wallet balance...</span>
        </div>
      </div>
    );
  }

  if (error || !lookupData?.success) {
    return (
      <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-red-400">Lookup Failed</h4>
            <p className="text-sm text-red-300/80 mt-1">
              {lookupData?.error || error?.message || 'Invalid address or network error'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </Button>
        </div>
      </div>
    );
  }

  const hasBalance = lookupData.totalValueUsd > 0;

  return (
    <div className="mt-4 bg-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-400" />
          <h4 className="font-medium text-white">Wallet Balance</h4>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">
          ✕
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 bg-zinc-900 rounded">
          <span className="text-sm text-zinc-400">Address:</span>
          <span className="font-mono text-sm text-zinc-300">{address.slice(0, 10)}...{address.slice(-8)}</span>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-zinc-900 rounded">
          <span className="text-sm text-zinc-400">Total Value:</span>
          <span className={`font-bold ${hasBalance ? 'text-emerald-400' : 'text-zinc-500'}`}>
            ${lookupData.totalValueUsd.toFixed(2)} USD
          </span>
        </div>

        {/* Network balances */}
        <div className="space-y-2 mt-4">
          <h5 className="text-sm font-medium text-zinc-400">Balances by Network:</h5>
          {Object.entries(lookupData.balances).map(([networkId, data]: [string, any]) => (
            <div key={networkId} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded text-sm">
              <span className="text-zinc-400">{data.network}</span>
              <span className={parseFloat(data.balance) > 0 ? 'text-emerald-400' : 'text-zinc-500'}>
                {parseFloat(data.balance).toFixed(6)} {data.symbol}
                {data.valueUsd > 0 && (
                  <span className="text-zinc-500 ml-2">(${data.valueUsd.toFixed(2)})</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {hasBalance ? (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-400">
              <strong>This wallet has funds!</strong> To access these funds, you need to import the wallet using its private key (not the address).
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>No balance found.</strong> This wallet appears to be empty across all supported networks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
