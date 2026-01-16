import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Receipt, 
  ExternalLink, 
  Search,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Image,
  DollarSign,
  Calendar,
  Mail,
  Hash,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'wouter';

export default function PaymentHistory() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch payment history
  const { data: payments, isLoading, refetch } = trpc.stripe.getPaymentHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  const filteredPayments = payments?.filter((payment: any) => {
    const matchesSearch = 
      payment.nftName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.buyerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.stripeSessionId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalSpent = filteredPayments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amountUsd || '0'), 0);

  const completedCount = filteredPayments.filter((p: any) => p.status === 'completed').length;
  const pendingCount = filteredPayments.filter((p: any) => p.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-yellow-500" />
              Payment History
            </h1>
            <p className="text-zinc-400 mt-1">
              Track your NFT purchases and transaction status
            </p>
          </div>
          <Button 
            onClick={() => refetch()}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Total Spent</p>
                  <p className="text-2xl font-bold text-white">${totalSpent.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20">
                  <CheckCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Completed</p>
                  <p className="text-2xl font-bold text-white">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Pending</p>
                  <p className="text-2xl font-bold text-white">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search by NFT name, email, or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'completed', 'pending', 'failed', 'refunded'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status 
                      ? 'bg-yellow-500 text-black hover:bg-yellow-600' 
                      : 'border-zinc-700 hover:bg-zinc-800'
                    }
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment List */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Transactions</CardTitle>
            <CardDescription>
              {filteredPayments.length} transaction{filteredPayments.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No transactions found</h3>
                <p className="text-zinc-400 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Your purchase history will appear here'}
                </p>
                <Link href="/market">
                  <Button className="bg-yellow-500 text-black hover:bg-yellow-600">
                    Browse Marketplace
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* NFT Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                        {payment.nftImageUrl ? (
                          <img 
                            src={payment.nftImageUrl} 
                            alt={payment.nftName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-zinc-500" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-white truncate">
                              {payment.nftName || 'NFT Purchase'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{payment.buyerEmail}</span>
                            </div>
                          </div>
                          {getStatusBadge(payment.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-zinc-500">Amount</p>
                            <p className="text-sm font-medium text-white">
                              ${parseFloat(payment.amountUsd || '0').toFixed(2)}
                            </p>
                            {payment.amountEth && (
                              <p className="text-xs text-zinc-400">
                                {parseFloat(payment.amountEth).toFixed(4)} ETH
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Date</p>
                            <p className="text-sm text-white">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Transaction ID</p>
                            <p className="text-sm text-white font-mono truncate">
                              {payment.stripeSessionId?.slice(0, 20)}...
                            </p>
                          </div>
                          <div className="flex items-end gap-2">
                            {payment.receiptUrl && (
                              <a
                                href={payment.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-500 hover:text-yellow-400 text-sm flex items-center gap-1"
                              >
                                <Receipt className="w-4 h-4" />
                                Receipt
                              </a>
                            )}
                            {payment.nftAssetId && (
                              <Link href={`/nft/${payment.nftAssetId}`}>
                                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                  <ArrowUpRight className="w-4 h-4" />
                                  View NFT
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
