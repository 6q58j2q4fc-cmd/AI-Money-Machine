import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, ArrowDownLeft, ExternalLink, Search, Filter,
  Clock, CheckCircle, XCircle, Loader2, RefreshCw, Wallet,
  TrendingUp, TrendingDown, Copy, Check
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

// Explorer URLs for different chains
const EXPLORERS: Record<string, string> = {
  ethereum: 'https://etherscan.io',
  polygon: 'https://polygonscan.com',
  arbitrum: 'https://arbiscan.io',
  optimism: 'https://optimistic.etherscan.io',
  base: 'https://basescan.org',
  sepolia: 'https://sepolia.etherscan.io',
  amoy: 'https://amoy.polygonscan.com',
};

function getExplorerUrl(chain: string, txHash: string): string {
  const baseUrl = EXPLORERS[chain] || EXPLORERS.ethereum;
  return `${baseUrl}/tx/${txHash}`;
}

function getAddressUrl(chain: string, address: string): string {
  const baseUrl = EXPLORERS[chain] || EXPLORERS.ethereum;
  return `${baseUrl}/address/${address}`;
}

// Transaction type badge
function TransactionTypeBadge({ type }: { type: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    buy: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <ArrowDownLeft className="w-3 h-3" />, label: 'Buy' },
    sell: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <ArrowUpRight className="w-3 h-3" />, label: 'Sell' },
    mint: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Wallet className="w-3 h-3" />, label: 'Mint' },
    transfer: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <ArrowUpRight className="w-3 h-3" />, label: 'Transfer' },
    list: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: <TrendingUp className="w-3 h-3" />, label: 'List' },
    delist: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <TrendingDown className="w-3 h-3" />, label: 'Delist' },
  };
  
  const { color, icon, label } = config[type] || config.transfer;
  
  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1`}>
      {icon}
      {label}
    </Badge>
  );
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    confirmed: { color: 'bg-green-500/20 text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
    pending: { color: 'bg-yellow-500/20 text-yellow-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    failed: { color: 'bg-red-500/20 text-red-400', icon: <XCircle className="w-3 h-3" /> },
  };
  
  const { color, icon } = config[status] || config.pending;
  
  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Transaction row component
function TransactionRow({ tx }: { tx: any }) {
  const [copied, setCopied] = useState(false);
  
  const copyHash = async () => {
    if (tx.txHash) {
      await navigator.clipboard.writeText(tx.txHash);
      setCopied(true);
      toast.success('Transaction hash copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const formatAddress = (addr: string) => {
    if (!addr) return 'N/A';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Transaction Type */}
        <TransactionTypeBadge type={tx.type} />
        
        {/* NFT Info */}
        <div className="flex items-center gap-3">
          {tx.nftImage && (
            <img 
              src={tx.nftImage} 
              alt={tx.nftName || 'NFT'} 
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="font-medium text-white">{tx.nftName || 'Unknown NFT'}</p>
            <p className="text-sm text-gray-400">Token ID: {tx.tokenId || 'N/A'}</p>
          </div>
        </div>
      </div>
      
      {/* Amount */}
      <div className="text-right">
        <p className={`font-bold ${tx.type === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
          {tx.type === 'buy' ? '-' : '+'}{tx.amount} {tx.currency || 'ETH'}
        </p>
        <p className="text-sm text-gray-400">
          ≈ ${(parseFloat(tx.amount || '0') * 2500).toFixed(2)} USD
        </p>
      </div>
      
      {/* Chain & Status */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="capitalize">
          {tx.chain || 'ethereum'}
        </Badge>
        <StatusBadge status={tx.status || 'confirmed'} />
      </div>
      
      {/* Timestamp */}
      <div className="text-right min-w-[140px]">
        <p className="text-sm text-gray-400">{formatDate(tx.createdAt)}</p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {tx.txHash && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyHash}
              className="text-gray-400 hover:text-white"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(getExplorerUrl(tx.chain || 'ethereum', tx.txHash), '_blank')}
              className="text-gray-400 hover:text-white"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TransactionHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chainFilter, setChainFilter] = useState("all");
  
  // Fetch transactions from the crypto transaction log
  const { data: transactions, isLoading, refetch } = trpc.hotWallet.getTransactionHistory.useQuery({
    limit: 100,
  });
  
  // Get wallet stats
  const { data: walletStats } = trpc.hotWallet.getStatus.useQuery();
  
  // Get the transactions array from the response
  const txList = transactions?.transactions || [];
  
  // Filter transactions
  const filteredTransactions = txList.filter((tx: any) => {
    if (typeFilter !== 'all' && tx.txType !== typeFilter) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (chainFilter !== 'all' && tx.network !== chainFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.txHash?.toLowerCase().includes(query) ||
        tx.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });
  
  // Calculate stats
  const stats = {
    totalTransactions: transactions?.total || 0,
    totalVolume: txList.reduce((sum: number, tx: any) => sum + parseFloat(tx.amountFormatted || '0'), 0) || 0,
    pendingCount: txList.filter((tx: any) => tx.status === 'pending').length || 0,
    confirmedCount: txList.filter((tx: any) => tx.status === 'confirmed').length || 0,
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-400" />
              Transaction History
            </h1>
            <p className="text-gray-400 mt-1">
              View all your NFT transactions with blockchain verification
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Total Volume</p>
              <p className="text-2xl font-bold text-white">{stats.totalVolume.toFixed(4)} ETH</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-white">{stats.pendingCount}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <p className="text-sm text-gray-400">Confirmed</p>
              <p className="text-2xl font-bold text-white">{stats.confirmedCount}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by hash, NFT name, or token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700"
                />
              </div>
              
              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="mint">Mint</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Chain Filter */}
              <Select value={chainFilter} onValueChange={setChainFilter}>
                <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Chain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chains</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Transactions List */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Transactions</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transactions found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No transactions found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Transactions will appear here after you buy, sell, or mint NFTs
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((tx: any, index: number) => (
                  <TransactionRow key={tx.id || index} tx={tx} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Blockchain Verification Info */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-purple-500/20">
                <CheckCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Blockchain Verification</h3>
                <p className="text-gray-400 text-sm">
                  All transactions are recorded on the blockchain and can be independently verified. 
                  Click the external link icon on any transaction to view it on the block explorer.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(EXPLORERS).slice(0, 5).map(([chain, url]) => (
                    <Button
                      key={chain}
                      variant="outline"
                      size="sm"
                      className="text-xs capitalize"
                      onClick={() => window.open(url, '_blank')}
                    >
                      {chain}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
