import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Square,
  RefreshCw,
  Activity,
  BarChart3,
  Zap,
  Shield,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SignalAction = "BUY" | "SELL" | "HOLD";

type LiveSignal = {
  symbol: string;
  action: SignalAction;
  confidence: number;
  positionSize: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
  reason: string;
  indicators: {
    fastMA: number;
    slowMA: number;
    maSpreadPct: number;
    rsi?: number;
    macdLine?: number;
    signalLine?: number;
    macdHistogram?: number;
  };
  timestamp: number;
};

type BacktestResult = {
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  startCapital: number;
  endCapital: number;
  metrics: {
    total_return_pct: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown_pct: number;
    win_rate_pct: number;
    total_trades: number;
    profit_factor: number;
    avg_trade_pct: number;
  };
  trades: {
    entry_time: string;
    exit_time: string;
    entry_price: number;
    exit_price: number;
    pnl: number;
    pnl_pct: number;
    exit_reason: string;
  }[];
  equityCurve: { timestamp: string; equity: number }[];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: "BUY" | "SELL" | "HOLD" }) {
  if (action === "BUY")
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
        <TrendingUp className="w-3 h-3" /> BUY
      </Badge>
    );
  if (action === "SELL")
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
        <TrendingDown className="w-3 h-3" /> SELL
      </Badge>
    );
  return (
    <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 gap-1">
      <Minus className="w-3 h-3" /> HOLD
    </Badge>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75 ? "bg-emerald-500" : pct >= 55 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
            <p
              className={`text-2xl font-bold ${
                positive === undefined
                  ? "text-white"
                  : positive
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {value}
            </p>
            {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TradingBot() {
  // Status
  const { data: status, refetch: refetchStatus } = trpc.tradingBot.getStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Live signals — batch across all 10 default stock symbols
  const [signalStrategy, setSignalStrategy] = useState<"sma_crossover" | "ema_crossover" | "macd">("sma_crossover");
  const [signalTimeframe, setSignalTimeframe] = useState<"1d" | "1h" | "4h">("1d");
  const signalSymbols = useMemo(() => ["AAPL","MSFT","GOOGL","AMZN","TSLA","NVDA","META","SPY","QQQ","AMD"], []);

  const { data: liveSignals, isLoading: signalsLoading, refetch: refetchSignals } =
    trpc.tradingBot.batchSignals.useQuery(
      { symbols: signalSymbols, timeframe: signalTimeframe, strategy: signalStrategy },
      { refetchInterval: 60_000 }
    );

  // Strategy metadata from server
  const { data: strategyInfoList } = trpc.tradingBot.getStrategyInfo.useQuery();

  // Fetch OHLCV data for all symbols (triggers cache population)
  const fetchOHLCV = trpc.tradingBot.fetchOHLCV.useMutation({
    onSuccess: (data) => {
      const loaded = data.filter((r: { candles: unknown[] }) => r.candles.length > 0).length;
      toast.success("Market Data Loaded", { description: `Fetched candles for ${loaded}/${data.length} symbols` });
      refetchSignals();
    },
    onError: (err) => toast.error("Data Fetch Failed", { description: err.message }),
  });

  // Bot controls
  const startBot = trpc.tradingBot.startBot.useMutation({
    onSuccess: () => {
      toast.success("Bot Started", { description: "Paper trading mode activated." });
      refetchStatus();
    },
  });
  const stopBot = trpc.tradingBot.stopBot.useMutation({
    onSuccess: () => {
      toast.success("Bot Stopped", { description: "Trading loop halted." });
      refetchStatus();
    },
  });

  // Backtest form state
  const [btSymbol, setBtSymbol] = useState("AAPL");
  const [btStrategy, setBtStrategy] = useState<"macd_rsi" | "bollinger" | "ma_crossover" | "ml_ensemble">("ml_ensemble");
  const [btStart, setBtStart] = useState("2023-01-01");
  const [btEnd, setBtEnd] = useState("2024-01-01");
  const [btCapital, setBtCapital] = useState("10000");
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);

  const runBacktest = trpc.tradingBot.runBacktest.useMutation({
    onSuccess: (data) => {
      setBtResult(data as BacktestResult);
      toast.success("Backtest Complete", { description: `${data.symbol} — ${data.metrics.total_return_pct > 0 ? "+" : ""}${data.metrics.total_return_pct}% return` });
    },
    onError: (err) => {
      toast.error("Backtest Failed", { description: err.message });
    },
  });

  const equityChartData = useMemo(() => {
    if (!btResult?.equityCurve) return [];
    // Sample to max 200 points for performance
    const curve = btResult.equityCurve;
    const step = Math.max(1, Math.floor(curve.length / 200));
    return curve.filter((_, i) => i % step === 0);
  }, [btResult]);

  const strategyLabels: Record<string, string> = {
    sma_crossover: "SMA Crossover",
    ema_crossover: "EMA Crossover",
    macd: "MACD",
    // legacy labels kept for backtest display
    macd_rsi: "MACD + RSI",
    bollinger: "Bollinger Bands",
    ma_crossover: "MA Crossover",
    ml_ensemble: "ML Ensemble",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              AI Trading Bot
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Algorithmic trading with MACD, Bollinger Bands, MA Crossover, and ML Ensemble strategies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetchStatus(); refetchSignals(); }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {status?.running ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => stopBot.mutate()}
                disabled={stopBot.isPending}
              >
                <Square className="w-4 h-4 mr-1" />
                Stop Bot
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => startBot.mutate({ mode: "paper" })}
                disabled={startBot.isPending}
              >
                <Play className="w-4 h-4 mr-1" />
                Start Paper Trading
              </Button>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Bot Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.running ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                  }`}
                />
                <span className="text-white font-semibold">
                  {status?.running ? "Running" : "Stopped"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 capitalize">Mode: {status?.mode ?? "paper"}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Strategy</p>
              <p className="text-white font-semibold text-sm">
                {strategyLabels[status?.strategy ?? "ml_ensemble"]}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Timeframe: {status?.timeframe ?? "1d"}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Watchlist</p>
              <p className="text-white font-semibold">{status?.watchlist?.length ?? 8} symbols</p>
              <p className="text-xs text-zinc-500 mt-1 truncate">
                {status?.watchlist?.slice(0, 4).join(", ")}…
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Open Positions</p>
              <p className="text-white font-semibold">{status?.openPositions ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-1">Orders: {status?.openOrders ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="signals" className="data-[state=active]:bg-zinc-700">
              <Zap className="w-4 h-4 mr-1" />
              Live Signals
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:bg-zinc-700">
              <BarChart3 className="w-4 h-4 mr-1" />
              Backtest
            </TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-zinc-700">
              <Target className="w-4 h-4 mr-1" />
              Strategies
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-zinc-700">
              <Shield className="w-4 h-4 mr-1" />
              Risk Config
            </TabsTrigger>
          </TabsList>

          {/* ── Signals Tab ── */}
          <TabsContent value="signals">
            <div className="space-y-4">
              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Strategy</span>
                  <Select value={signalStrategy} onValueChange={(v) => setSignalStrategy(v as typeof signalStrategy)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="sma_crossover">SMA Crossover</SelectItem>
                      <SelectItem value="ema_crossover">EMA Crossover</SelectItem>
                      <SelectItem value="macd">MACD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Timeframe</span>
                  <Select value={signalTimeframe} onValueChange={(v) => setSignalTimeframe(v as typeof signalTimeframe)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hour</SelectItem>
                      <SelectItem value="1d">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8 text-xs"
                  onClick={() => fetchOHLCV.mutate({ symbols: signalSymbols, timeframe: signalTimeframe })}
                  disabled={fetchOHLCV.isPending}
                >
                  {fetchOHLCV.isPending ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  {fetchOHLCV.isPending ? "Fetching…" : "Fetch Market Data"}
                </Button>
                <Badge variant="outline" className="ml-auto text-xs border-zinc-700 text-zinc-400">
                  Auto-refreshes every 60s
                </Badge>
              </div>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    {strategyLabels[signalStrategy]} Signals — {signalTimeframe.toUpperCase()} bars
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {signalsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : !liveSignals || liveSignals.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No cached candles yet.</p>
                      <p className="text-xs mt-1">Click <strong>Fetch Market Data</strong> above to load OHLCV data from Alpaca.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                            <th className="text-left pb-2 pr-4">Symbol</th>
                            <th className="text-left pb-2 pr-4">Signal</th>
                            <th className="text-left pb-2 pr-4 w-32">Confidence</th>
                            <th className="text-right pb-2 pr-4">Price</th>
                            <th className="text-right pb-2 pr-4">Fast MA</th>
                            <th className="text-right pb-2 pr-4">Slow MA</th>
                            <th className="text-right pb-2 pr-4">RSI</th>
                            <th className="text-right pb-2 pr-4">Size</th>
                            <th className="text-left pb-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {(liveSignals as LiveSignal[]).map((s) => (
                            <tr key={s.symbol} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="py-3 pr-4 font-mono font-bold text-white">{s.symbol}</td>
                              <td className="py-3 pr-4">
                                <ActionBadge action={s.action} />
                              </td>
                              <td className="py-3 pr-4 w-32">
                                <ConfidenceBar value={s.confidence} />
                              </td>
                              <td className="py-3 pr-4 text-right font-mono text-zinc-300">
                                {s.price > 0 ? `$${s.price.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right font-mono text-zinc-400 text-xs">
                                {s.indicators.fastMA > 0 ? s.indicators.fastMA.toFixed(2) : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right font-mono text-zinc-400 text-xs">
                                {s.indicators.slowMA > 0 ? s.indicators.slowMA.toFixed(2) : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right font-mono text-zinc-400 text-xs">
                                {s.indicators.rsi != null ? s.indicators.rsi.toFixed(1) : "—"}
                              </td>
                              <td className="py-3 pr-4 text-right font-mono text-zinc-300 text-xs">
                                {s.positionSize > 0 ? s.positionSize : "—"}
                              </td>
                              <td className="py-3 text-zinc-400 text-xs max-w-xs truncate" title={s.reason}>
                                {s.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* BUY/SELL summary strip */}
              {liveSignals && liveSignals.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {(["BUY","SELL","HOLD"] as SignalAction[]).map((action) => {
                    const count = (liveSignals as LiveSignal[]).filter((s) => s.action === action).length;
                    const color = action === "BUY" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : action === "SELL" ? "text-red-400 bg-red-500/10 border-red-500/30"
                      : "text-zinc-400 bg-zinc-800 border-zinc-700";
                    return (
                      <Card key={action} className={`border ${color}`}>
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs uppercase tracking-wider mt-0.5">{action}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Backtest Tab ── */}
          <TabsContent value="backtest">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form */}
              <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base">Run Backtest</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Symbol</Label>
                    <Input
                      value={btSymbol}
                      onChange={(e) => setBtSymbol(e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      className="bg-zinc-800 border-zinc-700 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Strategy</Label>
                    <Select
                      value={btStrategy}
                      onValueChange={(v) => setBtStrategy(v as typeof btStrategy)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="ml_ensemble">ML Ensemble</SelectItem>
                        <SelectItem value="macd_rsi">MACD + RSI</SelectItem>
                        <SelectItem value="bollinger">Bollinger Bands</SelectItem>
                        <SelectItem value="ma_crossover">MA Crossover</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={btStart}
                        onChange={(e) => setBtStart(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={btEnd}
                        onChange={(e) => setBtEnd(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Initial Capital ($)</Label>
                    <Input
                      type="number"
                      value={btCapital}
                      onChange={(e) => setBtCapital(e.target.value)}
                      min={100}
                      className="bg-zinc-800 border-zinc-700 text-white font-mono"
                    />
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() =>
                      runBacktest.mutate({
                        symbol: btSymbol,
                        strategy: btStrategy,
                        startDate: btStart,
                        endDate: btEnd,
                        initialCapital: parseFloat(btCapital) || 10000,
                      })
                    }
                    disabled={runBacktest.isPending}
                  >
                    {runBacktest.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4 mr-2" />
                    )}
                    {runBacktest.isPending ? "Running…" : "Run Backtest"}
                  </Button>
                </CardContent>
              </Card>

              {/* Results */}
              <div className="lg:col-span-2 space-y-4">
                {btResult ? (
                  <>
                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard
                        label="Total Return"
                        value={`${btResult.metrics.total_return_pct > 0 ? "+" : ""}${btResult.metrics.total_return_pct}%`}
                        icon={TrendingUp}
                        positive={btResult.metrics.total_return_pct >= 0}
                      />
                      <MetricCard
                        label="Sharpe Ratio"
                        value={btResult.metrics.sharpe_ratio.toFixed(2)}
                        sub="Risk-adjusted return"
                        icon={Activity}
                        positive={btResult.metrics.sharpe_ratio >= 1}
                      />
                      <MetricCard
                        label="Max Drawdown"
                        value={`${btResult.metrics.max_drawdown_pct.toFixed(1)}%`}
                        icon={AlertTriangle}
                        positive={false}
                      />
                      <MetricCard
                        label="Win Rate"
                        value={`${btResult.metrics.win_rate_pct.toFixed(1)}%`}
                        sub={`${btResult.metrics.total_trades} trades`}
                        icon={CheckCircle}
                        positive={btResult.metrics.win_rate_pct >= 50}
                      />
                      <MetricCard
                        label="Profit Factor"
                        value={btResult.metrics.profit_factor.toFixed(2)}
                        icon={DollarSign}
                        positive={btResult.metrics.profit_factor >= 1.5}
                      />
                      <MetricCard
                        label="Sortino Ratio"
                        value={btResult.metrics.sortino_ratio.toFixed(2)}
                        icon={Shield}
                        positive={btResult.metrics.sortino_ratio >= 1}
                      />
                      <MetricCard
                        label="End Capital"
                        value={`$${btResult.endCapital.toLocaleString()}`}
                        sub={`Started $${btResult.startCapital.toLocaleString()}`}
                        icon={DollarSign}
                        positive={btResult.endCapital >= btResult.startCapital}
                      />
                      <MetricCard
                        label="Avg Trade"
                        value={`${btResult.metrics.avg_trade_pct > 0 ? "+" : ""}${btResult.metrics.avg_trade_pct.toFixed(2)}%`}
                        icon={Target}
                        positive={btResult.metrics.avg_trade_pct >= 0}
                      />
                    </div>

                    {/* Equity Curve */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm">
                          Equity Curve — {btResult.symbol} ({strategyLabels[btResult.strategy]})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={equityChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                              dataKey="timestamp"
                              tick={{ fill: "#71717a", fontSize: 10 }}
                              tickFormatter={(v) => v.slice(5)}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fill: "#71717a", fontSize: 10 }}
                              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                              width={55}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#18181b",
                                border: "1px solid #3f3f46",
                                borderRadius: 8,
                                color: "#fff",
                                fontSize: 12,
                              }}
                              formatter={(v: number) => [`$${v.toLocaleString()}`, "Equity"]}
                            />
                            <ReferenceLine
                              y={btResult.startCapital}
                              stroke="#52525b"
                              strokeDasharray="4 4"
                            />
                            <Line
                              type="monotone"
                              dataKey="equity"
                              stroke={btResult.endCapital >= btResult.startCapital ? "#10b981" : "#ef4444"}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Trade History */}
                    {btResult.trades.length > 0 && (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-white text-sm">Trade History (sample)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-zinc-500 uppercase border-b border-zinc-800">
                                  <th className="text-left pb-2 pr-3">Entry</th>
                                  <th className="text-left pb-2 pr-3">Exit</th>
                                  <th className="text-right pb-2 pr-3">Entry $</th>
                                  <th className="text-right pb-2 pr-3">Exit $</th>
                                  <th className="text-right pb-2 pr-3">P&L</th>
                                  <th className="text-right pb-2 pr-3">P&L %</th>
                                  <th className="text-left pb-2">Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                {btResult.trades.slice(0, 15).map((t, i) => (
                                  <tr key={i} className="hover:bg-zinc-800/30">
                                    <td className="py-2 pr-3 font-mono text-zinc-400">{t.entry_time}</td>
                                    <td className="py-2 pr-3 font-mono text-zinc-400">{t.exit_time}</td>
                                    <td className="py-2 pr-3 text-right font-mono text-zinc-300">
                                      ${t.entry_price.toFixed(2)}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-mono text-zinc-300">
                                      ${t.exit_price.toFixed(2)}
                                    </td>
                                    <td
                                      className={`py-2 pr-3 text-right font-mono font-semibold ${
                                        t.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                                      }`}
                                    >
                                      {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                                    </td>
                                    <td
                                      className={`py-2 pr-3 text-right font-mono ${
                                        t.pnl_pct >= 0 ? "text-emerald-400" : "text-red-400"
                                      }`}
                                    >
                                      {t.pnl_pct >= 0 ? "+" : ""}{t.pnl_pct.toFixed(2)}%
                                    </td>
                                    <td className="py-2 text-zinc-500 capitalize">
                                      {t.exit_reason.replace(/_/g, " ")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="bg-zinc-900 border-zinc-800 h-64 flex items-center justify-center">
                    <div className="text-center text-zinc-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Configure and run a backtest to see results</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Strategies Tab — driven by getStrategyInfo() from server ── */}
          <TabsContent value="strategies">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(strategyInfoList ?? []).map((s) => (
                <Card key={s.name} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center justify-between">
                      {s.displayName}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          signalStrategy === s.name
                            ? "border-emerald-500 text-emerald-400"
                            : "border-zinc-700 text-zinc-500"
                        }`}
                      >
                        {signalStrategy === s.name ? "Active" : "Available"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-zinc-400 text-sm leading-relaxed">{s.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500">Fast period: </span>
                        <span className="text-zinc-300 font-mono">{s.defaultConfig.fastPeriod}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Slow period: </span>
                        <span className="text-zinc-300 font-mono">{s.defaultConfig.slowPeriod}</span>
                      </div>
                      {s.defaultConfig.signalPeriod && (
                        <div>
                          <span className="text-zinc-500">Signal period: </span>
                          <span className="text-zinc-300 font-mono">{s.defaultConfig.signalPeriod}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">Min candles: </span>
                        <span className="text-zinc-300 font-mono">{s.minCandlesRequired}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Pros</p>
                      <ul className="space-y-0.5">
                        {s.pros.map((p) => (
                          <li key={p} className="text-xs text-zinc-400 flex items-start gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Cons</p>
                      <ul className="space-y-0.5">
                        {s.cons.map((c) => (
                          <li key={c} className="text-xs text-zinc-400 flex items-start gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`w-full h-7 text-xs border-zinc-700 ${
                        signalStrategy === s.name ? "border-emerald-500 text-emerald-400" : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                      onClick={() => {
                        setSignalStrategy(s.name as "sma_crossover" | "ema_crossover" | "macd");
                        toast.success("Strategy Selected", { description: `Now using ${s.displayName} for signals` });
                      }}
                    >
                      {signalStrategy === s.name ? "Currently Active" : "Use This Strategy"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Risk Config Tab ── */}
          <TabsContent value="risk">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Risk Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Max Position Size", value: "5%", desc: "Maximum % of portfolio per trade" },
                      { label: "Stop Loss", value: "2%", desc: "Automatic exit on loss" },
                      { label: "Take Profit", value: "4%", desc: "Automatic exit on gain" },
                      { label: "Max Drawdown", value: "15%", desc: "Circuit breaker — halts trading" },
                      { label: "Max Open Trades", value: "5", desc: "Concurrent position limit" },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                        <div>
                          <p className="text-white text-sm font-medium">{r.label}</p>
                          <p className="text-zinc-500 text-xs">{r.desc}</p>
                        </div>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300 font-mono">
                          {r.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Position Sizing Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        name: "Fixed Percent",
                        desc: "Allocates a fixed % of portfolio to each trade. Simple and consistent.",
                        active: true,
                      },
                      {
                        name: "Kelly Criterion",
                        desc: "Mathematically optimal sizing based on win rate and average win/loss ratio.",
                        active: false,
                      },
                      {
                        name: "ATR-Based",
                        desc: "Sizes positions based on market volatility (Average True Range). Reduces size in volatile markets.",
                        active: false,
                      },
                      {
                        name: "Fixed Dollar",
                        desc: "Fixed dollar amount per trade regardless of portfolio size.",
                        active: false,
                      },
                    ].map((m) => (
                      <div key={m.name} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                        <div
                          className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            m.active ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        <div>
                          <p className="text-white text-sm font-medium flex items-center gap-2">
                            {m.name}
                            {m.active && (
                              <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Active
                              </Badge>
                            )}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">{m.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Setup Instructions — updated to reflect real Alpaca + signals module */}
              <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    How Position Sizing Works
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-white font-semibold mb-2">1. Risk Per Trade</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Each trade risks <strong className="text-zinc-300">2% of portfolio</strong> ($2,000 on a $100k account).
                        The position size is calculated as: <code className="text-amber-400">riskAmount / (entryPrice × stopLossPct)</code>.
                      </p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-white font-semibold mb-2">2. Stop-Loss &amp; Take-Profit</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Stop-loss is placed <strong className="text-zinc-300">2% below entry</strong> for longs (above for shorts).
                        Take-profit targets <strong className="text-zinc-300">4% gain</strong>, giving a 2:1 reward-to-risk ratio.
                      </p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-white font-semibold mb-2">3. Position Cap</p>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        No single position can exceed <strong className="text-zinc-300">5% of portfolio value</strong>.
                        Minimum position size is <strong className="text-zinc-300">1 share</strong>.
                        All sizing is computed server-side as a pure function.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
