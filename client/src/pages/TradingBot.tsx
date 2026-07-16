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

// Walk-forward result types — mirror the exact server response shape
type WFWindow = {
  windowIndex: number;
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
  selectedStrategy: string;  // server field name
  trainSharpe: number;
  testSharpe: number;
  testSortino: number;
  testMaxDrawdown: number;
  testWinRate: number;
  testProfitFactor: number;
  testCagr: number;
  testNetPnl: number;
  tradeCount: number;        // server field name
};

type WFAggregate = {
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  cagr: number;
  totalNetPnl: number;
  totalTrades: number;
  deflatedSharpe: number;
  nVariantsTested: number;
};

type WFResult = {
  runId: string;
  symbol: string;
  initialCapital: number;
  finalCapital: number;
  windowCount: number;
  totalCandles: number;
  aggregate: WFAggregate;
  windows: WFWindow[];
  aggregateEquityCurve: { time: number; equity: number; drawdown: number }[];
  costs: { commissionFlat: number; commissionPct: number; slippagePct: number };
  createdAt: number;
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



// ─── Execution Tab Component (Paper Mode Only) ────────────────────────────────
function ExecutionTab() {
  const utils = trpc.useUtils();
  const [orderForm, setOrderForm] = useState({
    symbol: "AAPL",
    qty: "1",
    side: "buy" as "buy" | "sell",
    type: "market" as "market" | "limit" | "stop" | "stop_limit",
    timeInForce: "day" as "day" | "gtc" | "ioc" | "fok",
    limitPrice: "",
    stopPrice: "",
  });

  const { data: account, isLoading: acctLoading, refetch: refetchAcct } =
    trpc.tradingBot.getAccountInfo.useQuery(undefined, { refetchInterval: 30_000 });

  const { data: openOrders, isLoading: ordersLoading, refetch: refetchOrders } =
    trpc.tradingBot.listOpenOrders.useQuery({ symbol: undefined }, { refetchInterval: 15_000 });

  const { data: positions, isLoading: posLoading, refetch: refetchPos } =
    trpc.tradingBot.getPositions.useQuery(undefined, { refetchInterval: 15_000 });

  const { data: orderHistory } =
    trpc.tradingBot.listOrderHistory.useQuery({ limit: 50 });

  const submitOrder = trpc.tradingBot.submitOrder.useMutation({
    onSuccess: (res) => {
      toast.success(`Paper order submitted: ${res.order.id.slice(0, 8)}…`);
      utils.tradingBot.listOpenOrders.invalidate();
      utils.tradingBot.getAccountInfo.invalidate();
      utils.tradingBot.listOrderHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelOrder = trpc.tradingBot.cancelOrder.useMutation({
    onSuccess: () => {
      toast.success("Order canceled");
      utils.tradingBot.listOpenOrders.invalidate();
      utils.tradingBot.listOrderHistory.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    const qty = parseInt(orderForm.qty, 10);
    if (isNaN(qty) || qty < 1) { toast.error("Quantity must be a positive integer"); return; }
    submitOrder.mutate({
      symbol: orderForm.symbol.toUpperCase(),
      qty,
      side: orderForm.side,
      type: orderForm.type,
      timeInForce: orderForm.timeInForce,
      limitPrice: orderForm.limitPrice ? parseFloat(orderForm.limitPrice) : undefined,
      stopPrice: orderForm.stopPrice ? parseFloat(orderForm.stopPrice) : undefined,
    });
  }

  const acct = account?.account;

  return (
    <div className="space-y-6">
      {/* Paper Mode Banner */}
      <div className="bg-amber-950/40 border border-amber-700/40 rounded-xl p-3 flex items-center gap-3">
        <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-amber-300 text-sm">
          <span className="font-semibold">Paper Trading Mode</span> — all orders execute against{" "}
          <code className="text-amber-200 text-xs bg-amber-900/40 px-1 rounded">paper-api.alpaca.markets</code>.
          Live trading is permanently disabled in this adapter.
        </p>
      </div>

      {/* Account Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Equity", value: acct ? `$${parseFloat(acct.equity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (acctLoading ? "Loading…" : "—") },
          { label: "Cash", value: acct ? `$${parseFloat(acct.cash).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" },
          { label: "Buying Power", value: acct ? `$${parseFloat(acct.buyingPower).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" },
          { label: "Account Status", value: acct?.status ?? "—" },
        ].map((m) => (
          <Card key={m.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-3">
              <p className="text-zinc-500 text-xs mb-1">{m.label}</p>
              <p className="text-white text-lg font-bold font-mono">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Entry Form */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Submit Paper Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs">Symbol</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-white font-mono uppercase mt-1"
                  value={orderForm.symbol}
                  onChange={(e) => setOrderForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Quantity (shares)</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-white font-mono mt-1"
                  value={orderForm.qty}
                  onChange={(e) => setOrderForm((p) => ({ ...p, qty: e.target.value }))}
                  placeholder="1"
                  type="number"
                  min="1"
                  step="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs">Side</Label>
                <Select value={orderForm.side} onValueChange={(v) => setOrderForm((p) => ({ ...p, side: v as typeof p.side }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs">Order Type</Label>
                <Select value={orderForm.type} onValueChange={(v) => setOrderForm((p) => ({ ...p, type: v as typeof p.type }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                    <SelectItem value="stop_limit">Stop Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(orderForm.type === "limit" || orderForm.type === "stop_limit") && (
              <div>
                <Label className="text-zinc-400 text-xs">Limit Price</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-white font-mono mt-1"
                  value={orderForm.limitPrice}
                  onChange={(e) => setOrderForm((p) => ({ ...p, limitPrice: e.target.value }))}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
              </div>
            )}
            {(orderForm.type === "stop" || orderForm.type === "stop_limit") && (
              <div>
                <Label className="text-zinc-400 text-xs">Stop Price</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 text-white font-mono mt-1"
                  value={orderForm.stopPrice}
                  onChange={(e) => setOrderForm((p) => ({ ...p, stopPrice: e.target.value }))}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
              </div>
            )}
            <div>
              <Label className="text-zinc-400 text-xs">Time in Force</Label>
              <Select value={orderForm.timeInForce} onValueChange={(v) => setOrderForm((p) => ({ ...p, timeInForce: v as typeof p.timeInForce }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="gtc">GTC (Good Till Canceled)</SelectItem>
                  <SelectItem value="ioc">IOC (Immediate or Cancel)</SelectItem>
                  <SelectItem value="fok">FOK (Fill or Kill)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className={`w-full mt-2 font-semibold ${
                orderForm.side === "buy"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              } text-white`}
              onClick={handleSubmit}
              disabled={submitOrder.isPending}
            >
              {submitOrder.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : orderForm.side === "buy" ? (
                <TrendingUp className="w-4 h-4 mr-2" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-2" />
              )}
              {submitOrder.isPending ? "Submitting…" : `Paper ${orderForm.side === "buy" ? "Buy" : "Sell"} ${orderForm.qty} ${orderForm.symbol}`}
            </Button>
          </CardContent>
        </Card>

        {/* Positions */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              Open Positions
            </CardTitle>
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 h-7 text-xs" onClick={() => refetchPos()}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {posLoading ? (
              <div className="flex items-center justify-center h-24 text-zinc-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : !positions || positions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">No open positions</div>
            ) : (
              <div className="space-y-2">
                {positions.map((pos) => (
                  <div key={pos.symbol} className="flex items-center justify-between p-2 bg-zinc-800 rounded-lg">
                    <div>
                      <p className="text-white font-mono font-semibold text-sm">{pos.symbol}</p>
                      <p className="text-zinc-500 text-xs">{pos.qty} shares · avg ${parseFloat(pos.avgEntryPrice).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-mono">${parseFloat(pos.marketValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className={`text-xs font-mono ${parseFloat(pos.unrealizedPl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {parseFloat(pos.unrealizedPl) >= 0 ? "+" : ""}
                        ${parseFloat(pos.unrealizedPl).toFixed(2)} ({(parseFloat(pos.unrealizedPlpc) * 100).toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Orders */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Open Orders
          </CardTitle>
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 h-7 text-xs" onClick={() => refetchOrders()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex items-center justify-center h-16 text-zinc-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : !openOrders || openOrders.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">No open orders</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Order ID", "Symbol", "Side", "Type", "Qty", "Status", "Submitted", ""].map((h) => (
                      <th key={h} className="text-left text-zinc-500 text-xs py-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((o) => (
                    <tr key={o.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-2 pr-4 font-mono text-zinc-400 text-xs">{o.id.slice(0, 8)}…</td>
                      <td className="py-2 pr-4 font-mono text-white font-semibold">{o.symbol}</td>
                      <td className="py-2 pr-4">
                        <Badge className={o.side === "buy" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                          {o.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-zinc-300 capitalize">{o.type}</td>
                      <td className="py-2 pr-4 font-mono text-zinc-300">{o.qty}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">{o.status}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-zinc-500 text-xs">{new Date(o.submittedAt).toLocaleTimeString()}</td>
                      <td className="py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-800 text-red-400 hover:bg-red-950 h-6 text-xs px-2"
                          onClick={() => cancelOrder.mutate({ orderId: o.id })}
                          disabled={cancelOrder.isPending}
                        >
                          Cancel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-zinc-400" />
            Order History (last 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!orderHistory || orderHistory.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">No order history yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Symbol", "Side", "Type", "Qty", "Filled Avg", "Status", "Mode", "Submitted"].map((h) => (
                      <th key={h} className="text-left text-zinc-500 text-xs py-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.map((o) => (
                    <tr key={o.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-2 pr-4 font-mono text-white font-semibold">{o.symbol}</td>
                      <td className="py-2 pr-4">
                        <Badge className={o.side === "buy" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                          {o.side.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-zinc-300 capitalize">{o.orderType}</td>
                      <td className="py-2 pr-4 font-mono text-zinc-300">{o.qty}</td>
                      <td className="py-2 pr-4 font-mono text-zinc-300">{o.filledAvgPrice ? `$${o.filledAvgPrice.toFixed(2)}` : "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={`border-zinc-700 text-xs ${
                          o.status === "filled" ? "text-emerald-400 border-emerald-800" :
                          o.status === "canceled" ? "text-red-400 border-red-800" :
                          "text-zinc-400"
                        }`}>{o.status}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-700/30 text-xs">{o.mode.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2 text-zinc-500 text-xs">{new Date(o.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Risk Management Tab Component ───────────────────────────────────────────
function RiskManagementTab() {
  const utils = trpc.useUtils();

  const { data: riskData, isLoading: riskLoading, refetch: refetchRisk } =
    trpc.tradingBot.getRiskState.useQuery(undefined, { refetchInterval: 15_000 });

  const { data: riskEvents } = trpc.tradingBot.getRiskEvents.useQuery({ limit: 50 });

  const [configEditing, setConfigEditing] = useState(false);
  const [cfgForm, setCfgForm] = useState({
    maxRiskPctPerTrade: "",
    stopLossPct: "",
    takeProfitPct: "",
    maxPositionPct: "",
    dailyLossLimitPct: "",
    maxDrawdownPct: "",
  });

  const updateConfig = trpc.tradingBot.updateRiskConfig.useMutation({
    onSuccess: () => {
      toast.success("Risk config updated");
      setConfigEditing(false);
      utils.tradingBot.getRiskState.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetDaily = trpc.tradingBot.resetDailyLoss.useMutation({
    onSuccess: () => { toast.success("Daily loss counter reset"); utils.tradingBot.getRiskState.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const ackKill = trpc.tradingBot.acknowledgeKillSwitch.useMutation({
    onSuccess: (r) => {
      if (r.success) { toast.success("Kill switch deactivated. Trading may resume."); utils.tradingBot.getRiskState.invalidate(); }
      else toast.error(r.message);
    },
    onError: (e) => toast.error(e.message),
  });

  const cfg = riskData?.config;
  const state = riskData?.state;
  const dailyCheck = riskData?.dailyCheck;
  const killCheck = riskData?.killCheck;

  function startEdit() {
    if (!cfg) return;
    setCfgForm({
      maxRiskPctPerTrade: String(cfg.maxRiskPctPerTrade),
      stopLossPct: String(cfg.stopLossPct),
      takeProfitPct: String(cfg.takeProfitPct),
      maxPositionPct: String(cfg.maxPositionPct),
      dailyLossLimitPct: String(cfg.dailyLossLimitPct),
      maxDrawdownPct: String(cfg.maxDrawdownPct),
    });
    setConfigEditing(true);
  }

  function submitConfig() {
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(cfgForm)) {
      const n = parseFloat(v);
      if (!isNaN(n)) parsed[k] = n;
    }
    updateConfig.mutate(parsed as any);
  }

  const severityColor = (s: string) =>
    s === "critical" ? "text-red-400" : s === "warning" ? "text-amber-400" : "text-zinc-400";

  const eventTypeLabel = (t: string) => t.replace(/_/g, " ");

  if (riskLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading risk state…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kill Switch Banner */}
      {state?.killSwitchActive && (
        <div className="bg-red-950 border border-red-700 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold text-sm">Kill Switch Active — Trading Halted</p>
              <p className="text-red-400 text-xs mt-0.5">{state.killSwitchReason ?? "Max drawdown exceeded."}</p>
              {state.killSwitchActivatedAt && (
                <p className="text-red-500 text-xs mt-1">
                  Activated: {new Date(state.killSwitchActivatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-700 text-red-300 hover:bg-red-900 flex-shrink-0"
            onClick={() => ackKill.mutate()}
            disabled={ackKill.isPending}
          >
            {ackKill.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Acknowledge & Resume"}
          </Button>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Portfolio Value",
            value: state ? `$${state.portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
            sub: state ? `Peak: $${state.peakValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "",
            color: "text-emerald-400",
          },
          {
            label: "Daily P&L",
            value: state ? `${state.dailyPnl >= 0 ? "+" : ""}$${state.dailyPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
            sub: dailyCheck ? (dailyCheck.allowed ? "Within limit" : "⚠ Limit breached") : "",
            color: state && state.dailyPnl >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "Drawdown",
            value: state ? `${state.currentDrawdownPct.toFixed(2)}%` : "—",
            sub: cfg ? `Limit: ${(cfg.maxDrawdownPct * 100).toFixed(0)}%` : "",
            color: state && cfg && state.currentDrawdownPct > cfg.maxDrawdownPct * 100 * 0.8 ? "text-amber-400" : "text-zinc-300",
          },
          {
            label: "Kill Switch",
            value: state?.killSwitchActive ? "ACTIVE" : "Standby",
            sub: state?.killSwitchActive ? "Trading halted" : "All guards passing",
            color: state?.killSwitchActive ? "text-red-400" : "text-emerald-400",
          },
        ].map((m) => (
          <Card key={m.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-4 pb-3">
              <p className="text-zinc-500 text-xs mb-1">{m.label}</p>
              <p className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</p>
              <p className="text-zinc-600 text-xs mt-0.5">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Config Panel */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Risk Configuration
            </CardTitle>
            <div className="flex gap-2">
              {!configEditing ? (
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-7 text-xs" onClick={startEdit}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 h-7 text-xs" onClick={() => setConfigEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs" onClick={submitConfig} disabled={updateConfig.isPending}>
                    {updateConfig.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Save"}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cfg && (
              <div className="space-y-3">
                {[
                  { key: "maxRiskPctPerTrade", label: "Max Risk / Trade", value: `${(cfg.maxRiskPctPerTrade * 100).toFixed(1)}%`, desc: "Capital at risk per trade (default 1%)" },
                  { key: "stopLossPct", label: "Stop Loss", value: `${(cfg.stopLossPct * 100).toFixed(1)}%`, desc: "Auto-exit on loss" },
                  { key: "takeProfitPct", label: "Take Profit", value: `${(cfg.takeProfitPct * 100).toFixed(1)}%`, desc: "Auto-exit on gain" },
                  { key: "maxPositionPct", label: "Max Position Size", value: `${(cfg.maxPositionPct * 100).toFixed(0)}%`, desc: "Portfolio cap per position" },
                  { key: "dailyLossLimitPct", label: "Daily Loss Limit", value: `${(cfg.dailyLossLimitPct * 100).toFixed(0)}%`, desc: "Hard daily loss ceiling" },
                  { key: "maxDrawdownPct", label: "Max Drawdown Kill", value: `${(cfg.maxDrawdownPct * 100).toFixed(0)}%`, desc: "Kill switch threshold" },
                ].map((r) => (
                  <div key={r.key} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{r.label}</p>
                      <p className="text-zinc-500 text-xs">{r.desc}</p>
                    </div>
                    {configEditing ? (
                      <Input
                        className="w-24 h-7 text-xs bg-zinc-800 border-zinc-700 text-white font-mono text-right"
                        value={cfgForm[r.key as keyof typeof cfgForm]}
                        onChange={(e) => setCfgForm((prev) => ({ ...prev, [r.key]: e.target.value }))}
                        placeholder={r.value}
                      />
                    ) : (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300 font-mono">{r.value}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guard Status + Manual Controls */}
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Guard Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Daily Loss Guard", ok: dailyCheck?.allowed ?? true, detail: dailyCheck?.message ?? "—" },
                  { label: "Max Drawdown Guard", ok: killCheck?.allowed ?? true, detail: killCheck?.message ?? "—" },
                  { label: "Kill Switch", ok: !(state?.killSwitchActive ?? false), detail: state?.killSwitchActive ? `Active since ${state.killSwitchActivatedAt ? new Date(state.killSwitchActivatedAt).toLocaleTimeString() : "unknown"}` : "Inactive" },
                ].map((g) => (
                  <div key={g.label} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                    {g.ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{g.label}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{g.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Manual Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Reset Daily Loss Counter</p>
                  <p className="text-zinc-500 text-xs">Resets today's P&L tracking to zero</p>
                </div>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-7 text-xs" onClick={() => resetDaily.mutate()} disabled={resetDaily.isPending}>
                  {resetDaily.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Reset"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Refresh Risk State</p>
                  <p className="text-zinc-500 text-xs">Pull latest state from server</p>
                </div>
                <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 h-7 text-xs" onClick={() => refetchRisk()}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Log */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            Risk Event Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!riskEvents || riskEvents.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">No risk events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-zinc-500 font-medium pb-2 pr-4">Time</th>
                    <th className="text-left text-zinc-500 font-medium pb-2 pr-4">Event</th>
                    <th className="text-left text-zinc-500 font-medium pb-2 pr-4">Severity</th>
                    <th className="text-left text-zinc-500 font-medium pb-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {riskEvents.map((ev) => (
                    <tr key={ev.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="py-2 pr-4 text-zinc-500 font-mono whitespace-nowrap">
                        {new Date(Number(ev.triggeredAt)).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-zinc-300 font-mono">{eventTypeLabel(ev.eventType)}</td>
                      <td className="py-2 pr-4">
                        <span className={`font-semibold ${severityColor(ev.severity)}`}>{ev.severity.toUpperCase()}</span>
                      </td>
                      <td className="py-2 text-zinc-400">{ev.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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

  // Walk-forward backtest state
  const [wfSymbol, setWfSymbol] = useState("AAPL");
  const [wfTimeframe, setWfTimeframe] = useState<"1d" | "1h" | "1m">("1d");
  const [wfTrainBars, setWfTrainBars] = useState("252");
  const [wfTestBars, setWfTestBars] = useState("63");
  const [wfCapital, setWfCapital] = useState("10000");
  const [wfCommFlat, setWfCommFlat] = useState("1.00");
  const [wfCommPct, setWfCommPct] = useState("0.001");
  const [wfSlippage, setWfSlippage] = useState("0.0005");
  const [wfResult, setWfResult] = useState<WFResult | null>(null);
  const [wfSelectedWindow, setWfSelectedWindow] = useState<number | null>(null);

  const runWalkForward = trpc.tradingBot.runWalkForward.useMutation({
    onSuccess: (data) => {
      setWfResult(data as unknown as WFResult);
      setWfSelectedWindow(null);
      const ret = ((data.finalCapital - data.initialCapital) / data.initialCapital * 100).toFixed(1);
      const agg = (data as unknown as WFResult).aggregate;
      toast.success("Walk-Forward Complete", {
        description: `${data.windowCount} windows · Sharpe ${agg?.sharpe?.toFixed(2) ?? "N/A"} · ${ret}% return`,
      });
    },
    onError: (err) => toast.error("Backtest Failed", { description: err.message }),
  });

  const displayedWindow = useMemo(() => {
    if (!wfResult) return null;
    if (wfSelectedWindow === null) return null;
    return wfResult.windows.find((w) => w.windowIndex === wfSelectedWindow) ?? null;
  }, [wfResult, wfSelectedWindow]);

  const aggregateChartData = useMemo(() => {
    if (!wfResult?.aggregateEquityCurve) return [];
    const curve = wfResult.aggregateEquityCurve;
    const step = Math.max(1, Math.floor(curve.length / 300));
    return curve.filter((_, i) => i % step === 0).map((p) => ({
      t: new Date(p.time).toLocaleDateString(),  // server uses 'time' not 't'
      equity: p.equity,
    }));
  }, [wfResult]);

  // Window equity curves are not in the summary response (stripped for size)
  // We show a placeholder message instead
  const windowChartData: { t: string; equity: number }[] = [];

  const strategyLabels: Record<string, string> = {
    sma_crossover: "SMA Crossover",
    ema_crossover: "EMA Crossover",
    macd: "MACD",
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
            <TabsTrigger value="execution" className="data-[state=active]:bg-zinc-700">
              <Activity className="w-4 h-4 mr-1" />
              Execution
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

          {/* ── Walk-Forward Backtest Tab ── */}
          <TabsContent value="backtest">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* ── Config Panel ── */}
              <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Walk-Forward Config
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Symbol</Label>
                    <Input
                      value={wfSymbol}
                      onChange={(e) => setWfSymbol(e.target.value.toUpperCase())}
                      placeholder="AAPL"
                      className="bg-zinc-800 border-zinc-700 text-white font-mono h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Timeframe</Label>
                    <Select value={wfTimeframe} onValueChange={(v) => setWfTimeframe(v as typeof wfTimeframe)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="1d">Daily (1d)</SelectItem>
                        <SelectItem value="1h">Hourly (1h)</SelectItem>
                        <SelectItem value="1m">1-Minute (1m)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Train Bars</Label>
                      <Input type="number" value={wfTrainBars} onChange={(e) => setWfTrainBars(e.target.value)}
                        min={30} className="bg-zinc-800 border-zinc-700 text-white font-mono h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs">Test Bars</Label>
                      <Input type="number" value={wfTestBars} onChange={(e) => setWfTestBars(e.target.value)}
                        min={10} className="bg-zinc-800 border-zinc-700 text-white font-mono h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs">Initial Capital ($)</Label>
                    <Input type="number" value={wfCapital} onChange={(e) => setWfCapital(e.target.value)}
                      min={100} className="bg-zinc-800 border-zinc-700 text-white font-mono h-8 text-sm" />
                  </div>
                  <div className="pt-1 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Transaction Costs</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Commission (flat $)</Label>
                        <Input type="number" value={wfCommFlat} onChange={(e) => setWfCommFlat(e.target.value)}
                          step="0.01" className="bg-zinc-800 border-zinc-700 text-white font-mono h-7 text-xs w-20 text-right" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Commission (%)</Label>
                        <Input type="number" value={wfCommPct} onChange={(e) => setWfCommPct(e.target.value)}
                          step="0.0001" className="bg-zinc-800 border-zinc-700 text-white font-mono h-7 text-xs w-20 text-right" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Slippage (%)</Label>
                        <Input type="number" value={wfSlippage} onChange={(e) => setWfSlippage(e.target.value)}
                          step="0.0001" className="bg-zinc-800 border-zinc-700 text-white font-mono h-7 text-xs w-20 text-right" />
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
                    onClick={() =>
                      runWalkForward.mutate({
                        symbol: wfSymbol,
                        timeframe: wfTimeframe,
                        trainBars: parseInt(wfTrainBars) || 252,
                        testBars: parseInt(wfTestBars) || 63,
                        portfolioValue: parseFloat(wfCapital) || 10000,
                        commissionFlat: parseFloat(wfCommFlat) || 1,
                        commissionPct: parseFloat(wfCommPct) || 0.001,
                        slippagePct: parseFloat(wfSlippage) || 0.0005,
                      })
                    }
                    disabled={runWalkForward.isPending}
                  >
                    {runWalkForward.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4 mr-2" />
                    )}
                    {runWalkForward.isPending ? "Running…" : "Run Walk-Forward"}
                  </Button>
                  {runWalkForward.isPending && (
                    <p className="text-xs text-zinc-500 text-center">Fetching OHLCV + running all strategy variants…</p>
                  )}
                </CardContent>
              </Card>

              {/* ── Results Panel ── */}
              <div className="lg:col-span-3 space-y-4">
                {wfResult ? (
                  <>
                    {/* Aggregate Metrics — all from wfResult.aggregate */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard
                        label="Sharpe Ratio"
                        value={wfResult.aggregate.sharpe.toFixed(2)}
                        sub="Out-of-sample"
                        icon={Activity}
                        positive={wfResult.aggregate.sharpe >= 1}
                      />
                      <MetricCard
                        label="Deflated Sharpe"
                        value={wfResult.aggregate.deflatedSharpe.toFixed(3)}
                        sub={`${wfResult.aggregate.nVariantsTested} variants tested`}
                        icon={Shield}
                        positive={wfResult.aggregate.deflatedSharpe >= 0.95}
                      />
                      <MetricCard
                        label="Max Drawdown"
                        value={`${(wfResult.aggregate.maxDrawdown * 100).toFixed(1)}%`}
                        icon={AlertTriangle}
                        positive={false}
                      />
                      <MetricCard
                        label="Win Rate"
                        value={`${(wfResult.aggregate.winRate * 100).toFixed(1)}%`}
                        sub={`${wfResult.aggregate.totalTrades} trades`}
                        icon={CheckCircle}
                        positive={wfResult.aggregate.winRate >= 0.5}
                      />
                      <MetricCard
                        label="Sortino Ratio"
                        value={wfResult.aggregate.sortino.toFixed(2)}
                        icon={TrendingUp}
                        positive={wfResult.aggregate.sortino >= 1}
                      />
                      <MetricCard
                        label="Profit Factor"
                        value={wfResult.aggregate.profitFactor.toFixed(2)}
                        icon={DollarSign}
                        positive={wfResult.aggregate.profitFactor >= 1.5}
                      />
                      <MetricCard
                        label="CAGR"
                        value={`${(wfResult.aggregate.cagr * 100).toFixed(1)}%`}
                        icon={TrendingUp}
                        positive={wfResult.aggregate.cagr >= 0}
                      />
                      <MetricCard
                        label="Final Capital"
                        value={`$${wfResult.finalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        sub={`Started $${wfResult.initialCapital.toLocaleString()}`}
                        icon={DollarSign}
                        positive={wfResult.finalCapital >= wfResult.initialCapital}
                      />
                    </div>

                    {/* Transaction cost summary */}
                    <div className="flex flex-wrap gap-3 text-xs">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono">
                        Commission: ${wfResult.costs.commissionFlat.toFixed(2)} flat + {(wfResult.costs.commissionPct * 100).toFixed(3)}%
                      </Badge>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono">
                        Slippage: {(wfResult.costs.slippagePct * 100).toFixed(3)}% per trade
                      </Badge>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono">
                        {wfResult.windowCount} windows
                      </Badge>
                    </div>

                    {/* Aggregate Equity Curve */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm">
                          Aggregate Out-of-Sample Equity Curve — {wfResult.symbol}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={aggregateChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="t" tick={{ fill: "#71717a", fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: "#71717a", fontSize: 10 }}
                              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} width={55} />
                            <Tooltip
                              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff", fontSize: 12 }}
                              formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Equity"]}
                            />
                            <ReferenceLine y={wfResult.initialCapital} stroke="#52525b" strokeDasharray="4 4" />
                            <Line type="monotone" dataKey="equity"
                              stroke={wfResult.finalCapital >= wfResult.initialCapital ? "#10b981" : "#ef4444"}
                              strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Per-Window Breakdown */}
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm">Window Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-zinc-500 uppercase border-b border-zinc-800">
                                <th className="text-left pb-2 pr-3">#</th>
                                <th className="text-left pb-2 pr-3">Test Period</th>
                                <th className="text-left pb-2 pr-3">Strategy Selected</th>
                                <th className="text-right pb-2 pr-3">Train SR</th>
                                <th className="text-right pb-2 pr-3">Test SR</th>
                                <th className="text-right pb-2 pr-3">Drawdown</th>
                                <th className="text-right pb-2 pr-3">Win%</th>
                                <th className="text-right pb-2 pr-3">Trades</th>
                                <th className="text-right pb-2">Net P&L</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                              {wfResult.windows.map((w) => (
                                <tr
                                  key={w.windowIndex}
                                  className={`hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                                    wfSelectedWindow === w.windowIndex ? "bg-zinc-800/60" : ""
                                  }`}
                                  onClick={() => setWfSelectedWindow(
                                    wfSelectedWindow === w.windowIndex ? null : w.windowIndex
                                  )}
                                >
                                  <td className="py-2 pr-3 text-zinc-400 font-mono">{w.windowIndex + 1}</td>
                                  <td className="py-2 pr-3 text-zinc-400 font-mono">
                                    {new Date(w.testStart).toLocaleDateString()} – {new Date(w.testEnd).toLocaleDateString()}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
                                      {strategyLabels[w.selectedStrategy] ?? w.selectedStrategy}
                                    </Badge>
                                  </td>
                                  <td className={`py-2 pr-3 text-right font-mono ${
                                    w.trainSharpe >= 1 ? "text-emerald-400" : w.trainSharpe >= 0 ? "text-zinc-300" : "text-red-400"
                                  }`}>{w.trainSharpe.toFixed(2)}</td>
                                  <td className={`py-2 pr-3 text-right font-mono ${
                                    w.testSharpe >= 1 ? "text-emerald-400" : w.testSharpe >= 0 ? "text-zinc-300" : "text-red-400"
                                  }`}>{w.testSharpe.toFixed(2)}</td>
                                  <td className="py-2 pr-3 text-right font-mono text-red-400">
                                    {(w.testMaxDrawdown * 100).toFixed(1)}%
                                  </td>
                                  <td className={`py-2 pr-3 text-right font-mono ${
                                    w.testWinRate >= 0.5 ? "text-emerald-400" : "text-zinc-400"
                                  }`}>{(w.testWinRate * 100).toFixed(1)}%</td>
                                  <td className="py-2 pr-3 text-right font-mono text-zinc-400">{w.tradeCount}</td>
                                  <td className={`py-2 text-right font-mono font-semibold ${
                                    w.testNetPnl >= 0 ? "text-emerald-400" : "text-red-400"
                                  }`}>
                                    {w.testNetPnl >= 0 ? "+" : ""}${w.testNetPnl.toFixed(0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Selected Window Stats */}
                    {displayedWindow && (
                      <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-white text-sm">
                            Window {displayedWindow.windowIndex + 1} Detail — {strategyLabels[displayedWindow.selectedStrategy] ?? displayedWindow.selectedStrategy}
                            <span className="text-zinc-500 font-normal ml-2 text-xs">
                              ({new Date(displayedWindow.testStart).toLocaleDateString()} – {new Date(displayedWindow.testEnd).toLocaleDateString()})
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-zinc-800 rounded-lg p-3">
                              <p className="text-xs text-zinc-500 mb-1">Test Sharpe</p>
                              <p className={`text-lg font-bold ${
                                displayedWindow.testSharpe >= 1 ? "text-emerald-400" : displayedWindow.testSharpe >= 0 ? "text-zinc-300" : "text-red-400"
                              }`}>{displayedWindow.testSharpe.toFixed(2)}</p>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3">
                              <p className="text-xs text-zinc-500 mb-1">Max Drawdown</p>
                              <p className="text-lg font-bold text-red-400">{(displayedWindow.testMaxDrawdown * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3">
                              <p className="text-xs text-zinc-500 mb-1">Win Rate</p>
                              <p className={`text-lg font-bold ${
                                displayedWindow.testWinRate >= 0.5 ? "text-emerald-400" : "text-zinc-300"
                              }`}>{(displayedWindow.testWinRate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-zinc-800 rounded-lg p-3">
                              <p className="text-xs text-zinc-500 mb-1">Net P&L</p>
                              <p className={`text-lg font-bold ${
                                displayedWindow.testNetPnl >= 0 ? "text-emerald-400" : "text-red-400"
                              }`}>{displayedWindow.testNetPnl >= 0 ? "+" : ""}${displayedWindow.testNetPnl.toFixed(0)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="bg-zinc-900 border-zinc-800 h-80 flex items-center justify-center">
                    <div className="text-center text-zinc-500 space-y-3">
                      <BarChart3 className="w-14 h-14 mx-auto opacity-20" />
                      <p className="text-sm font-medium">Walk-Forward Backtester</p>
                      <p className="text-xs max-w-xs leading-relaxed">
                        Trains on rolling windows, selects the best strategy out-of-sample, and reports
                        Sharpe, Sortino, max drawdown, win rate, and deflated Sharpe adjusted for
                        {" "}{3} strategy variants tested.
                      </p>
                      <p className="text-xs text-zinc-600">Configure parameters and click Run Walk-Forward</p>
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

          {/* ── Execution Tab ── */}
          <TabsContent value="execution">
            <ExecutionTab />
          </TabsContent>

          {/* ── Risk Config Tab ── */}
          <TabsContent value="risk">
            <RiskManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
