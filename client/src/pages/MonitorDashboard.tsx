import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Shield,
  ShieldOff,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PositionSummary {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
  costBasis: number;
}

interface Snapshot {
  portfolioValue: number;
  cash: number;
  equity: number;
  dailyPnl: number;
  dailyPnlPct: number;
  totalPnl: number;
  drawdownPct: number;
  openPositions: number;
  killSwitchActive: boolean;
  positions: PositionSummary[];
  capturedAt: number;
  stale?: boolean;
}

interface EquityPoint { ts: number; equity: number; dailyPnl: number; }
interface LogRow { id: number; level: string; source: string; message: string; createdAt: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${fmt(Math.abs(n))}`;
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${fmt(n)}%`;
}

function levelColor(level: string) {
  switch (level) {
    case "debug":    return "text-muted-foreground";
    case "info":     return "text-blue-400";
    case "warn":     return "text-yellow-400";
    case "error":    return "text-red-400";
    case "critical": return "text-red-500 font-bold";
    default:         return "text-foreground";
  }
}

function levelBadgeVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  if (level === "critical" || level === "error") return "destructive";
  if (level === "warn") return "outline";
  return "secondary";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  title,
  value,
  sub,
  positive,
  danger,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  sub?: string;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <Card className={danger ? "border-red-500/60 bg-red-950/20" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl font-bold tabular-nums ${danger ? "text-red-400" : positive === true ? "text-green-400" : positive === false ? "text-red-400" : ""}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <Icon className={`h-5 w-5 mt-1 ${danger ? "text-red-400" : "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function MonitorDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [killReason, setKillReason] = useState("");
  const [showKillDialog, setShowKillDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [logLevel, setLogLevel] = useState<string>("all");
  const [logSource, setLogSource] = useState<string>("all");
  const logEndRef = useRef<HTMLDivElement>(null);

  // tRPC queries
  const snapshotQuery = trpc.tradingBot.getMonitorSnapshot.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  const equityQuery = trpc.tradingBot.getEquityCurve.useQuery(
    { limit: 200 },
    { refetchInterval: autoRefresh ? 15000 : false }
  );

  const logsQuery = trpc.tradingBot.getMonitorLogs.useQuery(
    {
      limit: 100,
      level: logLevel !== "all" ? (logLevel as any) : undefined,
      source: logSource !== "all" ? (logSource as any) : undefined,
    },
    { refetchInterval: autoRefresh ? 5000 : false }
  );

  const ksQuery = trpc.tradingBot.getKillSwitchState.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Mutations
  const triggerKS = trpc.tradingBot.triggerKillSwitch.useMutation({
    onSuccess: () => {
      toast.error("Kill switch activated — trading halted");
      setShowKillDialog(false);
      setKillReason("");
      snapshotQuery.refetch();
      ksQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetKS = trpc.tradingBot.resetKillSwitch.useMutation({
    onSuccess: () => {
      toast.success("Kill switch reset — trading can resume");
      setShowResetDialog(false);
      snapshotQuery.refetch();
      ksQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Sync snapshot from query
  useEffect(() => {
    if (snapshotQuery.data) setSnapshot(snapshotQuery.data as Snapshot);
  }, [snapshotQuery.data]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logsQuery.data]);

  const ks = ksQuery.data;
  const equityCurve: EquityPoint[] = (equityQuery.data ?? []) as EquityPoint[];
  const logs: LogRow[] = (logsQuery.data ?? []) as LogRow[];
  const startEquity = equityCurve.length > 0 ? equityCurve[0].equity : 0;

  const chartData = equityCurve.map((p) => ({
    time: new Date(p.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    equity: p.equity,
    pnl: p.dailyPnl,
  }));

  const handleManualRefresh = useCallback(() => {
    snapshotQuery.refetch();
    equityQuery.refetch();
    logsQuery.refetch();
    ksQuery.refetch();
  }, [snapshotQuery, equityQuery, logsQuery, ksQuery]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-400" />
            Bot Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live paper trading dashboard — Alpaca paper API
            {snapshot?.stale && (
              <span className="ml-2 text-yellow-400">(stale data — Alpaca unavailable)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className={autoRefresh ? "border-green-500/50 text-green-400" : ""}
          >
            <Zap className={`h-4 w-4 mr-1 ${autoRefresh ? "text-green-400" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={snapshotQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${snapshotQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Kill Switch Alert Banner */}
      {ks?.active && (
        <Alert variant="destructive" className="border-red-500">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">KILL SWITCH ACTIVE — Trading Halted</AlertTitle>
          <AlertDescription className="mt-1">
            <span className="font-medium">Reason:</span> {ks.reason || "No reason provided"} &nbsp;|&nbsp;
            <span className="font-medium">Triggered by:</span> {ks.triggeredBy} &nbsp;|&nbsp;
            <span className="font-medium">At:</span> {ks.triggeredAt ? new Date(ks.triggeredAt).toLocaleString() : "—"}
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-red-400 text-red-300 hover:bg-red-900/30"
              onClick={() => setShowResetDialog(true)}
            >
              Reset Kill Switch
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          title="Portfolio Value"
          value={snapshot ? `$${fmt(snapshot.portfolioValue)}` : "—"}
          sub={snapshot ? `Cash: $${fmt(snapshot.cash)}` : undefined}
        />
        <MetricCard
          icon={snapshot && snapshot.dailyPnl >= 0 ? TrendingUp : TrendingDown}
          title="Daily P&L"
          value={snapshot ? fmtMoney(snapshot.dailyPnl) : "—"}
          sub={snapshot ? fmtPct(snapshot.dailyPnlPct) : undefined}
          positive={snapshot ? snapshot.dailyPnl >= 0 : undefined}
        />
        <MetricCard
          icon={BarChart2}
          title="Max Drawdown"
          value={snapshot ? `${fmt(snapshot.drawdownPct)}%` : "—"}
          sub={snapshot ? `${snapshot.openPositions} open positions` : undefined}
          danger={snapshot ? snapshot.drawdownPct > 8 : false}
        />
        <MetricCard
          icon={ks?.active ? ShieldOff : Shield}
          title="Kill Switch"
          value={ks ? (ks.active ? "ACTIVE" : "Off") : "—"}
          sub={ks?.active ? ks.reason.slice(0, 30) : "Trading allowed"}
          danger={ks?.active}
        />
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Equity Curve
            <span className="text-xs text-muted-foreground font-normal ml-2">
              (last {equityCurve.length} snapshots)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No equity data yet — refresh to capture first snapshot
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.2)" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="rgba(255,255,255,0.2)"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => [`$${fmt(v)}`, "Equity"]}
                />
                {startEquity > 0 && (
                  <ReferenceLine y={startEquity} stroke="#6b7280" strokeDasharray="4 4" label={{ value: "Start", fill: "#6b7280", fontSize: 11 }} />
                )}
                <Area type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={2} fill="url(#equityGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Open Positions
            <Badge variant="secondary" className="ml-1">{snapshot?.positions.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!snapshot || snapshot.positions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No open positions</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 pr-4">Symbol</th>
                    <th className="text-right py-2 pr-4">Qty</th>
                    <th className="text-right py-2 pr-4">Avg Entry</th>
                    <th className="text-right py-2 pr-4">Current</th>
                    <th className="text-right py-2 pr-4">Market Value</th>
                    <th className="text-right py-2">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.positions.map((pos) => (
                    <tr key={pos.symbol} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-2 pr-4 font-medium">
                        {pos.symbol}
                        <Badge variant={pos.side === "long" ? "default" : "destructive"} className="ml-2 text-xs">
                          {pos.side}
                        </Badge>
                      </td>
                      <td className="text-right py-2 pr-4 tabular-nums">{pos.qty}</td>
                      <td className="text-right py-2 pr-4 tabular-nums">${fmt(pos.avgEntryPrice)}</td>
                      <td className="text-right py-2 pr-4 tabular-nums">${fmt(pos.currentPrice)}</td>
                      <td className="text-right py-2 pr-4 tabular-nums">${fmt(pos.marketValue)}</td>
                      <td className={`text-right py-2 tabular-nums ${pos.unrealizedPl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmtMoney(pos.unrealizedPl)}
                        <span className="text-xs ml-1 opacity-70">({fmtPct(pos.unrealizedPlPct)})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Stream + Kill Switch side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Log Stream */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" /> Log Stream
              </CardTitle>
              <div className="flex gap-2">
                <Select value={logLevel} onValueChange={setLogLevel}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={logSource} onValueChange={setLogSource}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="bot">Bot</SelectItem>
                    <SelectItem value="risk">Risk</SelectItem>
                    <SelectItem value="execution">Execution</SelectItem>
                    <SelectItem value="signal">Signal</SelectItem>
                    <SelectItem value="backtest">Backtest</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-black/40 rounded-md p-3 h-72 overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">No log entries yet</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-2 leading-relaxed">
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <Badge variant={levelBadgeVariant(log.level)} className="text-[10px] h-4 shrink-0 px-1">
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground/60 shrink-0">[{log.source}]</span>
                    <span className={levelColor(log.level)}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Kill Switch Panel */}
        <Card className={ks?.active ? "border-red-500/60" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {ks?.active ? <ShieldOff className="h-4 w-4 text-red-400" /> : <Shield className="h-4 w-4 text-green-400" />}
              Kill Switch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-lg p-4 text-center ${ks?.active ? "bg-red-950/40 border border-red-500/40" : "bg-green-950/20 border border-green-500/20"}`}>
              <p className={`text-3xl font-bold ${ks?.active ? "text-red-400" : "text-green-400"}`}>
                {ks?.active ? "HALTED" : "ACTIVE"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {ks?.active ? "All trading blocked" : "Bot is running"}
              </p>
            </div>

            {ks?.active ? (
              <>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason</span>
                    <span className="font-medium text-right max-w-[160px] truncate">{ks.reason || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Triggered by</span>
                    <span className="font-medium">{ks.triggeredBy || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">At</span>
                    <span className="font-medium">{ks.triggeredAt ? new Date(ks.triggeredAt).toLocaleTimeString() : "—"}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-green-500/50 text-green-400 hover:bg-green-900/20"
                  onClick={() => setShowResetDialog(true)}
                >
                  Reset Kill Switch
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Manually halt all trading immediately. The bot will not place or cancel any orders until the switch is reset.
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowKillDialog(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Trigger Kill Switch
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kill Switch Confirmation Dialog */}
      <Dialog open={showKillDialog} onOpenChange={setShowKillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Trigger Kill Switch
            </DialogTitle>
            <DialogDescription>
              This will immediately halt all trading activity. Provide a reason for the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="ks-reason">Reason (required)</Label>
            <Input
              id="ks-reason"
              placeholder="e.g. Unusual market volatility detected"
              value={killReason}
              onChange={(e) => setKillReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKillDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!killReason.trim() || triggerKS.isPending}
              onClick={() => triggerKS.mutate({ reason: killReason.trim() })}
            >
              {triggerKS.isPending ? "Activating…" : "Confirm — Halt Trading"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" /> Reset Kill Switch
            </DialogTitle>
            <DialogDescription>
              This will allow the bot to resume trading. Confirm only if the issue that triggered the halt has been resolved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={resetKS.isPending}
              onClick={() => resetKS.mutate({ confirm: true })}
            >
              {resetKS.isPending ? "Resetting…" : "Confirm — Resume Trading"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
