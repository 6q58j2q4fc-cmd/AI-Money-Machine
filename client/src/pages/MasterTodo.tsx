import { useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  Zap,
  RefreshCw,
  ExternalLink,
  Wallet,
  FileText,
  Link2,
  Bot,
  TrendingUp,
  DollarSign,
  Wrench,
  Eye,
  AlertCircle,
  ChevronRight,
  Play,
  Clock
} from "lucide-react";

type PageStatus = 'working' | 'partial' | 'simulated' | 'broken' | 'needs_setup';

const statusColors: Record<PageStatus, string> = {
  working: 'bg-green-500',
  partial: 'bg-yellow-500',
  simulated: 'bg-blue-500',
  broken: 'bg-red-500',
  needs_setup: 'bg-orange-500'
};

const statusLabels: Record<PageStatus, string> = {
  working: 'Working',
  partial: 'Partial',
  simulated: 'Simulated',
  broken: 'Broken',
  needs_setup: 'Needs Setup'
};

const statusIcons: Record<PageStatus, React.ReactNode> = {
  working: <CheckCircle className="w-4 h-4 text-green-500" />,
  partial: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  simulated: <Eye className="w-4 h-4 text-blue-500" />,
  broken: <XCircle className="w-4 h-4 text-red-500" />,
  needs_setup: <Settings className="w-4 h-4 text-orange-500" />
};

export default function MasterTodo() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isAuditing, setIsAuditing] = useState(false);

  // tRPC queries
  const { data: auditData, refetch: refetchAudit, isLoading } = trpc.masterTodo.runAudit.useQuery();
  const { data: moneyFlow } = trpc.masterTodo.checkMoneyFlow.useQuery();
  const { data: fixes } = trpc.masterTodo.getFixes.useQuery();

  const handleRunAudit = async () => {
    setIsAuditing(true);
    await refetchAudit();
    setIsAuditing(false);
    toast.success('Full site audit completed');
  };

  const summary = auditData?.summary;
  const pages = auditData?.pages || [];

  // Calculate progress
  const totalPages = summary?.totalPages || 0;
  const workingPages = summary?.workingPages || 0;
  const progressPercent = totalPages > 0 ? (workingPages / totalPages) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-amber-500" />
              Master TODO Dashboard
            </h1>
            <p className="text-zinc-400 mt-1">
              Comprehensive site audit • Real money flow verification • Actionable fixes
            </p>
          </div>
          <Button 
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            {isAuditing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Run Full Audit
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-400">{summary?.workingPages || 0}</p>
              <p className="text-xs text-zinc-400">Working</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-400">{summary?.partialPages || 0}</p>
              <p className="text-xs text-zinc-400">Partial</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-400">{summary?.simulatedPages || 0}</p>
              <p className="text-xs text-zinc-400">Simulated</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4 text-center">
              <Settings className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-400">{summary?.needsSetupPages || 0}</p>
              <p className="text-xs text-zinc-400">Needs Setup</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-400">{summary?.criticalIssues || 0}</p>
              <p className="text-xs text-zinc-400">Critical Issues</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <Wrench className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-400">{summary?.autoFixableIssues || 0}</p>
              <p className="text-xs text-zinc-400">Auto-Fixable</p>
            </CardContent>
          </Card>
        </div>

        {/* Real Money Flow Status */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Real Money Flow Status
            </CardTitle>
            <CardDescription>
              Verification of actual crypto earnings and transfers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Free Income */}
              <div className={`p-4 rounded-lg border-2 ${moneyFlow?.freeIncome?.isReal ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-semibold">Free Income</span>
                </div>
                <Badge className={moneyFlow?.freeIncome?.isReal ? 'bg-green-500' : 'bg-red-500'}>
                  {moneyFlow?.freeIncome?.isReal ? 'REAL' : 'SIMULATED'}
                </Badge>
                <p className="text-xs text-zinc-400 mt-2">
                  {moneyFlow?.freeIncome?.isReal 
                    ? 'Earning real crypto from faucets' 
                    : 'Faucet claims are simulated - needs browser automation'}
                </p>
              </div>

              {/* NFTs */}
              <div className={`p-4 rounded-lg border-2 ${moneyFlow?.nfts?.isReal ? 'border-green-500 bg-green-500/10' : 'border-orange-500 bg-orange-500/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">NFT Earnings</span>
                </div>
                <Badge className={moneyFlow?.nfts?.isReal ? 'bg-green-500' : 'bg-orange-500'}>
                  {moneyFlow?.nfts?.isReal ? 'READY' : 'NEEDS FUNDING'}
                </Badge>
                <p className="text-xs text-zinc-400 mt-2">
                  {moneyFlow?.nfts?.isReal 
                    ? `${moneyFlow.nfts.totalMinted} minted, ${moneyFlow.nfts.totalListed} listed` 
                    : 'Fund hot wallet to enable real minting'}
                </p>
              </div>

              {/* Hot Wallet */}
              <div className={`p-4 rounded-lg border-2 ${moneyFlow?.hotWallet?.canTransfer ? 'border-green-500 bg-green-500/10' : 'border-orange-500 bg-orange-500/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5" />
                  <span className="font-semibold">Hot Wallet</span>
                </div>
                <Badge className={moneyFlow?.hotWallet?.canTransfer ? 'bg-green-500' : 'bg-orange-500'}>
                  {moneyFlow?.hotWallet?.canTransfer ? 'FUNDED' : 'EMPTY'}
                </Badge>
                <p className="text-xs text-zinc-400 mt-2">
                  Balance: {moneyFlow?.hotWallet?.totalBalance?.toFixed(6) || '0'} ETH
                </p>
              </div>

              {/* Transfers */}
              <div className={`p-4 rounded-lg border-2 ${(moneyFlow?.transfers?.successfulTransfers || 0) > 0 ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 bg-zinc-800/50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-5 h-5" />
                  <span className="font-semibold">Transfers</span>
                </div>
                <Badge className="bg-zinc-600">
                  {moneyFlow?.transfers?.successfulTransfers || 0} COMPLETED
                </Badge>
                <p className="text-xs text-zinc-400 mt-2">
                  {moneyFlow?.transfers?.pendingTransfers || 0} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">All Pages ({pages.length})</TabsTrigger>
            <TabsTrigger value="issues">Issues ({summary?.totalIssues || 0})</TabsTrigger>
            <TabsTrigger value="fixes">Fixes ({fixes?.fixes?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle>Site Health Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-zinc-400">Fully Working Pages</span>
                      <span className="text-sm font-semibold text-white">{workingPages}/{totalPages}</span>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400">Hot Wallet Status</p>
                      <p className="text-lg font-bold text-white flex items-center gap-2">
                        {summary?.hotWalletFunded ? (
                          <><CheckCircle className="w-5 h-5 text-green-500" /> Funded</>
                        ) : (
                          <><XCircle className="w-5 h-5 text-red-500" /> Not Funded</>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400">Real Money Flow</p>
                      <p className="text-lg font-bold text-white flex items-center gap-2">
                        {summary?.realMoneyFlowEnabled ? (
                          <><CheckCircle className="w-5 h-5 text-green-500" /> Enabled</>
                        ) : (
                          <><XCircle className="w-5 h-5 text-red-500" /> Disabled</>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400">Affiliates Configured</p>
                      <p className="text-lg font-bold text-white flex items-center gap-2">
                        {summary?.affiliatesConfigured ? (
                          <><CheckCircle className="w-5 h-5 text-green-500" /> Yes</>
                        ) : (
                          <><XCircle className="w-5 h-5 text-red-500" /> No</>
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <p className="text-sm text-zinc-400">WordPress Connected</p>
                      <p className="text-lg font-bold text-white flex items-center gap-2">
                        {summary?.wordpressConnected ? (
                          <><CheckCircle className="w-5 h-5 text-green-500" /> Yes</>
                        ) : (
                          <><XCircle className="w-5 h-5 text-red-500" /> No</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle>Quick Actions to Enable Real Money</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="font-semibold text-white">Fund Hot Wallet</p>
                        <p className="text-xs text-zinc-400">Send ETH/MATIC to enable real transactions</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black" onClick={() => window.location.href = '/hot-wallet'}>
                      Go to Wallet <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Link2 className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-semibold text-white">Configure Affiliate APIs</p>
                        <p className="text-xs text-zinc-400">Add Awin Publisher ID and CJ credentials</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/settings'}>
                      Settings <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-semibold text-white">Connect WordPress</p>
                        <p className="text-xs text-zinc-400">Add WordPress URL and API credentials</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => window.location.href = '/settings'}>
                      Settings <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            <div className="grid gap-3">
              {pages.map((page: any) => (
                <Card key={page.path} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {statusIcons[page.status as PageStatus]}
                        <div>
                          <p className="font-semibold text-white">{page.page}</p>
                          <p className="text-xs text-zinc-400">{page.path}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusColors[page.status as PageStatus]}>
                          {statusLabels[page.status as PageStatus]}
                        </Badge>
                        {page.realMoneyFlow && (
                          <Badge className="bg-green-500">Real Money</Badge>
                        )}
                        {page.issues?.length > 0 && (
                          <Badge variant="outline" className="border-red-500 text-red-400">
                            {page.issues.length} issues
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => window.location.href = page.path}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Features */}
                    {page.features && page.features.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-800">
                        <div className="flex flex-wrap gap-2">
                          {page.features.map((feature: any, i: number) => (
                            <div key={i} className="flex items-center gap-1 text-xs">
                              {feature.isReal ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                              )}
                              <span className={feature.isReal ? 'text-green-400' : 'text-yellow-400'}>
                                {feature.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            {pages.flatMap((p: any) => p.issues || []).map((issue: any, i: number) => (
              <Card key={i} className={`bg-zinc-900/50 border-l-4 ${
                issue.severity === 'critical' ? 'border-l-red-500' :
                issue.severity === 'high' ? 'border-l-orange-500' :
                issue.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          issue.severity === 'critical' ? 'bg-red-500' :
                          issue.severity === 'high' ? 'bg-orange-500' :
                          issue.severity === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-white">{issue.title}</span>
                      </div>
                      <p className="text-sm text-zinc-400">{issue.description}</p>
                      <p className="text-xs text-zinc-500 mt-1">Affects: {issue.affectedFeature}</p>
                    </div>
                    {issue.canAutoFix && (
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black">
                        <Wrench className="w-4 h-4 mr-1" /> Auto-Fix
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Fixes Tab */}
          <TabsContent value="fixes" className="space-y-4">
            {fixes?.fixes?.map((fix: any, i: number) => (
              <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold text-white">{fix.title}</span>
                        <Badge variant="outline">{fix.page}</Badge>
                      </div>
                      <p className="text-sm text-zinc-400">{fix.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fix.estimatedTime}
                        </span>
                        <span>Type: {fix.actionType}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className={
                        fix.actionType === 'fund_wallet' ? 'bg-amber-500 hover:bg-amber-600 text-black' :
                        fix.actionType === 'add_credentials' ? 'bg-blue-500 hover:bg-blue-600' :
                        'bg-purple-500 hover:bg-purple-600'
                      }
                      onClick={() => {
                        if (fix.actionType === 'fund_wallet') {
                          window.location.href = '/hot-wallet';
                        } else if (fix.actionType === 'add_credentials') {
                          window.location.href = '/settings';
                        } else {
                          toast.info('Manual fix required - see description');
                        }
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" /> Apply Fix
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Last Audit Time */}
        {summary?.lastFullAudit && (
          <p className="text-xs text-zinc-500 text-center">
            Last full audit: {new Date(summary.lastFullAudit).toLocaleString()}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
