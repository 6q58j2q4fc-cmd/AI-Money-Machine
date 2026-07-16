/**
 * server/tradingBot/backtest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Walk-Forward Backtester
 *
 * Architecture
 * ────────────
 * Walk-forward validation splits the full candle history into overlapping
 * windows.  Each window has a TRAIN segment (used to select the best strategy
 * variant) and an OUT-OF-SAMPLE TEST segment (used to evaluate the winner).
 * Only the test-segment equity curves are stitched together for the aggregate
 * statistics, preventing look-ahead bias.
 *
 *   ┌──────────────── window 1 ────────────────┐
 *   │  TRAIN (trainBars)  │  TEST (testBars)   │
 *   └──────────────────────────────────────────┘
 *            ┌──────────────── window 2 ────────────────┐
 *            │  TRAIN (trainBars)  │  TEST (testBars)   │
 *            └──────────────────────────────────────────┘
 *                     ┌──────────────── window 3 ─────────────────┐
 *                     │  TRAIN (trainBars)  │  TEST (testBars)    │
 *                     └───────────────────────────────────────────┘
 *
 * Realistic transaction costs
 * ───────────────────────────
 * • Commission: flat per-side fee (default $1.00) + percentage (default 0.05%)
 * • Slippage:   market-impact model — price moves against you by a fraction of
 *               the bid-ask spread (default 0.05% of price per side)
 * • Both are applied on every fill (entry and exit).
 *
 * Metrics reported per window and in aggregate
 * ─────────────────────────────────────────────
 * • Sharpe Ratio          — annualised (√252 for daily bars)
 * • Sortino Ratio         — downside deviation only
 * • Max Drawdown          — peak-to-trough as a percentage
 * • Win Rate              — fraction of closed trades with positive P&L
 * • Profit Factor         — gross profit / gross loss
 * • CAGR                  — compound annual growth rate
 * • Deflated Sharpe Ratio — Bailey & López de Prado (2014) adjustment for
 *                           multiple testing across N strategy variants
 *
 * All functions are pure except `runWalkForward`, which orchestrates the
 * window loop but still takes all inputs as parameters (no I/O).
 */

import {
  generateSignal,
  type CandleInput,
  type StrategyName,
  type StrategyConfig,
  type PositionSizingConfig,
  DEFAULT_STRATEGY_CONFIGS,
  DEFAULT_POSITION_SIZING,
} from "./signals";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransactionCostConfig {
  /** Flat commission per trade side in dollars (default 1.00) */
  commissionFlat: number;
  /** Percentage commission per trade side, e.g. 0.0005 = 0.05% (default) */
  commissionPct: number;
  /** Slippage as a fraction of price per side, e.g. 0.0005 = 0.05% (default) */
  slippagePct: number;
}

export const DEFAULT_TRANSACTION_COSTS: TransactionCostConfig = {
  commissionFlat: 1.00,
  commissionPct:  0.0005,
  slippagePct:    0.0005,
};

export interface WalkForwardConfig {
  /** Number of candles in each training window */
  trainBars: number;
  /** Number of candles in each out-of-sample test window */
  testBars: number;
  /** Step size between windows (default = testBars → non-overlapping test segments) */
  stepBars?: number;
  /** Annualisation factor: 252 for daily, 52 for weekly, 365 for crypto (default 252) */
  annualisationFactor?: number;
  /** Strategy variants to evaluate during training (default: all three) */
  strategyVariants?: Array<Partial<StrategyConfig> & { name: StrategyName }>;
  /** Position sizing config (default: DEFAULT_POSITION_SIZING) */
  sizing?: Partial<PositionSizingConfig>;
  /** Transaction cost config (default: DEFAULT_TRANSACTION_COSTS) */
  costs?: Partial<TransactionCostConfig>;
}

export interface BacktestTrade {
  entryBar:    number;   // index into the candle array
  exitBar:     number;
  entryTime:   number;   // Unix ms
  exitTime:    number;
  entryPrice:  number;   // after slippage
  exitPrice:   number;   // after slippage
  direction:   "LONG" | "SHORT";
  shares:      number;
  grossPnl:    number;   // (exitPrice - entryPrice) × shares × direction
  commission:  number;   // total commission both sides
  slippage:    number;   // total slippage cost both sides
  netPnl:      number;   // grossPnl - commission - slippage
  exitReason:  "SIGNAL" | "STOP_LOSS" | "TAKE_PROFIT" | "END_OF_WINDOW";
  strategy:    StrategyName;
}

export interface EquityPoint {
  time:   number;   // Unix ms
  equity: number;
  drawdown: number; // current drawdown from peak (negative %)
}

export interface WindowMetrics {
  windowIndex:    number;
  trainStart:     number;   // Unix ms
  trainEnd:       number;
  testStart:      number;
  testEnd:        number;
  selectedStrategy: StrategyName;
  selectedConfig:   StrategyConfig;
  trainSharpe:    number;
  testSharpe:     number;
  testSortino:    number;
  testMaxDrawdown: number;  // as positive percentage, e.g. 12.5 = 12.5%
  testWinRate:    number;   // 0–1
  testProfitFactor: number;
  testCagr:       number;
  testNetPnl:     number;
  testTrades:     BacktestTrade[];
  testEquityCurve: EquityPoint[];
}

export interface WalkForwardResult {
  /** Unique run identifier (caller-supplied or auto-generated) */
  runId:           string;
  symbol:          string;
  config:          WalkForwardConfig;
  costs:           TransactionCostConfig;
  windows:         WindowMetrics[];
  /** Stitched out-of-sample equity curve across all windows */
  aggregateEquityCurve: EquityPoint[];
  /** Aggregate metrics computed from the stitched equity curve */
  aggregate: {
    sharpe:          number;
    sortino:         number;
    maxDrawdown:     number;
    winRate:         number;
    profitFactor:    number;
    cagr:            number;
    totalNetPnl:     number;
    totalTrades:     number;
    /** Deflated Sharpe Ratio (Bailey & López de Prado 2014) */
    deflatedSharpe:  number;
    /** Number of strategy variants tested (used for DSR calculation) */
    nVariantsTested: number;
  };
  initialCapital:  number;
  finalCapital:    number;
  createdAt:       number;   // Unix ms
}

// ─── Transaction cost helpers ─────────────────────────────────────────────────

/**
 * Apply slippage to a fill price.
 * BUY fills at a slightly higher price; SELL fills at a slightly lower price.
 */
export function applySlippage(
  price: number,
  direction: "BUY" | "SELL",
  slippagePct: number
): number {
  return direction === "BUY"
    ? price * (1 + slippagePct)
    : price * (1 - slippagePct);
}

/**
 * Total transaction cost for one side of a trade.
 */
export function transactionCost(
  price: number,
  shares: number,
  costs: TransactionCostConfig
): number {
  return costs.commissionFlat + price * shares * costs.commissionPct;
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

/**
 * Compute daily returns from an equity curve.
 * Returns an empty array if fewer than 2 points.
 */
export function dailyReturns(equity: number[]): number[] {
  if (equity.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    returns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
  }
  return returns;
}

/**
 * Mean of an array.  Returns 0 for empty arrays.
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Population standard deviation.  Returns 0 for arrays with fewer than 2 elements.
 */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Annualised Sharpe Ratio (risk-free rate assumed 0).
 * Returns 0 when standard deviation is 0.
 */
export function sharpeRatio(returns: number[], annualisationFactor: number): number {
  if (returns.length < 2) return 0;
  const m  = mean(returns);
  const sd = stddev(returns);
  if (sd === 0) return 0;
  return (m / sd) * Math.sqrt(annualisationFactor);
}

/**
 * Annualised Sortino Ratio (penalises only downside volatility).
 * Returns 0 when downside deviation is 0.
 */
export function sortinoRatio(returns: number[], annualisationFactor: number): number {
  if (returns.length < 2) return 0;
  const m = mean(returns);
  const downside = returns.filter((r) => r < 0);
  if (downside.length === 0) return m > 0 ? Infinity : 0;
  const downsideDev = Math.sqrt(
    downside.reduce((acc, r) => acc + r ** 2, 0) / returns.length
  );
  if (downsideDev === 0) return 0;
  return (m / downsideDev) * Math.sqrt(annualisationFactor);
}

/**
 * Maximum drawdown as a positive percentage (e.g. 15.3 = 15.3% drawdown).
 * Returns 0 if equity never declines.
 */
export function maxDrawdown(equity: number[]): number {
  if (equity.length < 2) return 0;
  let peak = equity[0];
  let maxDD = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    const dd = (peak - e) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

/**
 * Build a full drawdown series (one value per equity point, as negative %).
 */
export function drawdownSeries(equity: number[]): number[] {
  let peak = equity[0] ?? 0;
  return equity.map((e) => {
    if (e > peak) peak = e;
    return peak > 0 ? -((peak - e) / peak) * 100 : 0;
  });
}

/**
 * Win rate: fraction of trades with netPnl > 0.
 * Returns 0 for empty trade lists.
 */
export function winRate(trades: BacktestTrade[]): number {
  if (trades.length === 0) return 0;
  return trades.filter((t) => t.netPnl > 0).length / trades.length;
}

/**
 * Profit factor: gross profit / gross loss.
 * Returns Infinity when there are no losing trades.
 * Returns 0 when there are no winning trades.
 */
export function profitFactor(trades: BacktestTrade[]): number {
  const grossProfit = trades.filter((t) => t.netPnl > 0).reduce((a, t) => a + t.netPnl, 0);
  const grossLoss   = trades.filter((t) => t.netPnl < 0).reduce((a, t) => a + Math.abs(t.netPnl), 0);
  if (grossLoss   === 0) return grossProfit > 0 ? Infinity : 0;
  if (grossProfit === 0) return 0;
  return grossProfit / grossLoss;
}

/**
 * Compound Annual Growth Rate.
 * `durationDays` is the number of calendar days in the test period.
 * Returns 0 if initial capital is 0 or duration is 0.
 */
export function cagr(
  initialCapital: number,
  finalCapital: number,
  durationDays: number
): number {
  if (initialCapital <= 0 || durationDays <= 0) return 0;
  const years = durationDays / 365;
  return (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100;
}

/**
 * Deflated Sharpe Ratio (Bailey & López de Prado, 2014).
 *
 * Adjusts the observed Sharpe for the number of independent strategy variants
 * tested (multiple testing bias).  The formula uses the expected maximum
 * Sharpe under the null hypothesis that all strategies have zero true Sharpe.
 *
 * DSR = Φ( (SR_obs - SR_0) / σ_SR )
 *
 * where:
 *   SR_0   = expected maximum Sharpe under H0 (Euler–Mascheroni approximation)
 *   σ_SR   = standard error of the Sharpe ratio
 *   Φ      = standard normal CDF
 *
 * Returns a probability in [0, 1].  Values > 0.95 indicate the strategy is
 * unlikely to be a false discovery at the 5% level.
 */
export function deflatedSharpeRatio(
  observedSharpe: number,
  nObservations: number,
  nVariants: number,
  skewness: number = 0,
  kurtosis: number = 3
): number {
  if (nObservations < 2 || nVariants < 1) return 0;

  // Expected maximum Sharpe under H0 (Euler–Mascheroni approximation)
  const gamma = 0.5772156649;
  const sr0 = (1 - gamma) * normalInverse(1 - 1 / nVariants) +
    gamma * normalInverse(1 - 1 / (nVariants * Math.E));

  // Standard error of the Sharpe ratio
  const sr = observedSharpe / Math.sqrt(252); // de-annualise for per-bar SR
  const sigmaSr = Math.sqrt(
    (1 - skewness * sr + ((kurtosis - 1) / 4) * sr ** 2) / (nObservations - 1)
  );

  if (sigmaSr <= 0) return 0;

  const z = (sr - sr0) / sigmaSr;
  return normalCdf(z);
}

// ─── Normal distribution helpers ─────────────────────────────────────────────

/**
 * Standard normal CDF using Abramowitz & Stegun approximation (error < 7.5e-8).
 */
export function normalCdf(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

/**
 * Inverse normal CDF (quantile function) using Beasley-Springer-Moro algorithm.
 * Accurate to ~1e-9 for p in (0, 1).
 */
export function normalInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return  Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01,  2.209460984245205e+02,
    -2.759285104469687e+02,  1.383577518672690e+02,
    -3.066479806614716e+01,  2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,  1.615858368580409e+02,
    -1.556989798598866e+02,  6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
     4.374664141464968e+00,  2.938163982698783e+00,
  ];
  const d = [
     7.784695709041462e-03,  3.224671290700398e-01,
     2.445134137142996e+00,  3.754408661907416e+00,
  ];

  const pLow  = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// ─── Single-window simulation ─────────────────────────────────────────────────

/**
 * Simulate a strategy on a candle slice.
 * Returns the trade log and equity curve.
 *
 * Position model:
 *   • Long-only (BUY opens, SELL closes).
 *   • One position at a time.
 *   • Stop-loss and take-profit are checked on each bar using high/low.
 *   • Slippage is applied to every fill.
 */
export function simulateWindow(
  candles: CandleInput[],
  strategyConfig: StrategyConfig,
  sizing: PositionSizingConfig,
  costs: TransactionCostConfig,
  initialCapital: number,
  annualisationFactor: number
): { trades: BacktestTrade[]; equityCurve: EquityPoint[]; finalCapital: number } {
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  let capital = initialCapital;
  let peak    = capital;

  // Open position state
  let inPosition    = false;
  let entryBar      = 0;
  let entryTime     = 0;
  let entryPrice    = 0;
  let stopLossPrice = 0;
  let takeProfitPrice = 0;
  let shares        = 0;
  let entrySlippage = 0;
  let entryCommission = 0;

  const minBars = Math.max(strategyConfig.slowPeriod + 2, 15);

  for (let i = minBars; i < candles.length; i++) {
    const candle = candles[i];

    // ── Check stop-loss / take-profit on open position ──────────────────────
    if (inPosition) {
      let exitPrice: number | null = null;
      let exitReason: BacktestTrade["exitReason"] = "SIGNAL";

      // Stop-loss: low touched the stop
      if (candle.low <= stopLossPrice) {
        exitPrice  = applySlippage(stopLossPrice, "SELL", costs.slippagePct);
        exitReason = "STOP_LOSS";
      }
      // Take-profit: high touched the target
      else if (candle.high >= takeProfitPrice) {
        exitPrice  = applySlippage(takeProfitPrice, "SELL", costs.slippagePct);
        exitReason = "TAKE_PROFIT";
      }

      if (exitPrice !== null) {
        const exitComm = transactionCost(exitPrice, shares, costs);
        const exitSlip = Math.abs(exitPrice - candle.close) * shares;
        const grossPnl = (exitPrice - entryPrice) * shares;
        const totalComm = entryCommission + exitComm;
        const totalSlip = entrySlippage + exitSlip;
        const netPnl    = grossPnl - totalComm - totalSlip;

        capital += netPnl;
        trades.push({
          entryBar, exitBar: i, entryTime, exitTime: candle.openTime,
          entryPrice, exitPrice, direction: "LONG", shares,
          grossPnl, commission: totalComm, slippage: totalSlip, netPnl,
          exitReason, strategy: strategyConfig.name,
        });
        inPosition = false;
      }
    }

    // ── Generate signal on the candles up to and including bar i ────────────
    if (!inPosition) {
      const signal = generateSignal(
        "SIM",
        candles.slice(0, i + 1),
        strategyConfig.name,
        strategyConfig,
        { ...sizing, portfolioValue: capital }
      );

      if (signal.action === "BUY" && signal.positionSize > 0) {
        const fillPrice = applySlippage(candle.close, "BUY", costs.slippagePct);
        const comm      = transactionCost(fillPrice, signal.positionSize, costs);
        const slip      = Math.abs(fillPrice - candle.close) * signal.positionSize;

        // Check we have enough capital
        if (fillPrice * signal.positionSize + comm <= capital) {
          inPosition      = true;
          entryBar        = i;
          entryTime       = candle.openTime;
          entryPrice      = fillPrice;
          shares          = signal.positionSize;
          stopLossPrice   = signal.stopLoss;
          takeProfitPrice = signal.takeProfit;
          entryCommission = comm;
          entrySlippage   = slip;
          capital        -= fillPrice * shares + comm;
        }
      }
    }

    // ── Record equity point ─────────────────────────────────────────────────
    const unrealisedPnl = inPosition
      ? (candle.close - entryPrice) * shares
      : 0;
    const totalEquity = capital + (inPosition ? entryPrice * shares : 0) + unrealisedPnl;
    if (totalEquity > peak) peak = totalEquity;
    const dd = peak > 0 ? -((peak - totalEquity) / peak) * 100 : 0;
    equityCurve.push({ time: candle.openTime, equity: totalEquity, drawdown: dd });
  }

  // ── Force-close any open position at end of window ───────────────────────
  if (inPosition && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice  = applySlippage(lastCandle.close, "SELL", costs.slippagePct);
    const exitComm   = transactionCost(exitPrice, shares, costs);
    const exitSlip   = Math.abs(exitPrice - lastCandle.close) * shares;
    const grossPnl   = (exitPrice - entryPrice) * shares;
    const totalComm  = entryCommission + exitComm;
    const totalSlip  = entrySlippage + exitSlip;
    const netPnl     = grossPnl - totalComm - totalSlip;

    capital += netPnl + entryPrice * shares;
    trades.push({
      entryBar, exitBar: candles.length - 1,
      entryTime, exitTime: lastCandle.openTime,
      entryPrice, exitPrice, direction: "LONG", shares,
      grossPnl, commission: totalComm, slippage: totalSlip, netPnl,
      exitReason: "END_OF_WINDOW", strategy: strategyConfig.name,
    });
  }

  return { trades, equityCurve, finalCapital: capital };
}

// ─── Metrics computation ──────────────────────────────────────────────────────

/**
 * Compute all metrics from a completed simulation.
 */
export function computeMetrics(
  trades: BacktestTrade[],
  equityCurve: EquityPoint[],
  initialCapital: number,
  annualisationFactor: number
): {
  sharpe: number; sortino: number; maxDD: number;
  wr: number; pf: number; cagrPct: number; netPnl: number;
} {
  const equityValues = equityCurve.map((p) => p.equity);
  const returns      = dailyReturns(equityValues);
  const finalCapital = equityValues[equityValues.length - 1] ?? initialCapital;
  const durationMs   = equityCurve.length > 1
    ? equityCurve[equityCurve.length - 1].time - equityCurve[0].time
    : 0;
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  return {
    sharpe:  sharpeRatio(returns, annualisationFactor),
    sortino: sortinoRatio(returns, annualisationFactor),
    maxDD:   maxDrawdown(equityValues),
    wr:      winRate(trades),
    pf:      profitFactor(trades),
    cagrPct: cagr(initialCapital, finalCapital, durationDays),
    netPnl:  trades.reduce((a, t) => a + t.netPnl, 0),
  };
}

// ─── Walk-forward orchestrator ────────────────────────────────────────────────

/**
 * Run a full walk-forward validation on a candle series.
 *
 * @param symbol      Trading symbol (for labelling only)
 * @param allCandles  Full candle history, sorted ascending by openTime
 * @param config      Walk-forward configuration
 * @param runId       Optional run identifier (defaults to timestamp)
 */
export function runWalkForward(
  symbol: string,
  allCandles: CandleInput[],
  config: WalkForwardConfig,
  runId?: string
): WalkForwardResult {
  const {
    trainBars,
    testBars,
    stepBars = testBars,
    annualisationFactor = 252,
  } = config;

  const costs: TransactionCostConfig = {
    ...DEFAULT_TRANSACTION_COSTS,
    ...config.costs,
  };
  const sizing: PositionSizingConfig = {
    ...DEFAULT_POSITION_SIZING,
    ...config.sizing,
  };
  const initialCapital = sizing.portfolioValue;

  // Build strategy variants to test during training
  const variants: StrategyConfig[] = config.strategyVariants
    ? config.strategyVariants.map((v) => ({
        ...DEFAULT_STRATEGY_CONFIGS[v.name],
        ...v,
      }))
    : Object.values(DEFAULT_STRATEGY_CONFIGS);

  const windows: WindowMetrics[] = [];
  const allTestTrades: BacktestTrade[] = [];
  const allTestEquity: EquityPoint[]   = [];

  let windowCapital = initialCapital;

  let windowStart = 0;
  while (windowStart + trainBars + testBars <= allCandles.length) {
    const trainSlice = allCandles.slice(windowStart, windowStart + trainBars);
    const testSlice  = allCandles.slice(windowStart + trainBars, windowStart + trainBars + testBars);

    // ── Training: select best variant by Sharpe ──────────────────────────────
    let bestVariant  = variants[0];
    let bestTrainSharpe = -Infinity;

    for (const variant of variants) {
      const { equityCurve } = simulateWindow(
        trainSlice, variant, sizing, costs, initialCapital, annualisationFactor
      );
      const equityValues = equityCurve.map((p) => p.equity);
      const returns      = dailyReturns(equityValues);
      const sr           = sharpeRatio(returns, annualisationFactor);
      if (sr > bestTrainSharpe) {
        bestTrainSharpe = sr;
        bestVariant     = variant;
      }
    }

    // ── Testing: evaluate winner out-of-sample ───────────────────────────────
    const { trades: testTrades, equityCurve: testEquity, finalCapital: testFinalCapital } =
      simulateWindow(testSlice, bestVariant, sizing, costs, windowCapital, annualisationFactor);

    const testMetrics = computeMetrics(testTrades, testEquity, windowCapital, annualisationFactor);

    // Carry capital forward to next window
    windowCapital = testFinalCapital;

    const windowIndex = windows.length;
    windows.push({
      windowIndex,
      trainStart:      trainSlice[0]?.openTime ?? 0,
      trainEnd:        trainSlice[trainSlice.length - 1]?.openTime ?? 0,
      testStart:       testSlice[0]?.openTime ?? 0,
      testEnd:         testSlice[testSlice.length - 1]?.openTime ?? 0,
      selectedStrategy: bestVariant.name,
      selectedConfig:   bestVariant,
      trainSharpe:     bestTrainSharpe,
      testSharpe:      testMetrics.sharpe,
      testSortino:     testMetrics.sortino,
      testMaxDrawdown: testMetrics.maxDD,
      testWinRate:     testMetrics.wr,
      testProfitFactor: testMetrics.pf,
      testCagr:        testMetrics.cagrPct,
      testNetPnl:      testMetrics.netPnl,
      testTrades,
      testEquityCurve: testEquity,
    });

    allTestTrades.push(...testTrades);
    allTestEquity.push(...testEquity);

    windowStart += stepBars;
  }

  // ── Aggregate metrics across all out-of-sample windows ───────────────────
  const aggEquityValues = allTestEquity.map((p) => p.equity);
  const aggReturns      = dailyReturns(aggEquityValues);
  const aggSharpe       = sharpeRatio(aggReturns, annualisationFactor);
  const aggSortino      = sortinoRatio(aggReturns, annualisationFactor);
  const aggMaxDD        = maxDrawdown(aggEquityValues);
  const aggWr           = winRate(allTestTrades);
  const aggPf           = profitFactor(allTestTrades);
  const aggNetPnl       = allTestTrades.reduce((a, t) => a + t.netPnl, 0);
  const durationMs      = allTestEquity.length > 1
    ? allTestEquity[allTestEquity.length - 1].time - allTestEquity[0].time
    : 0;
  const aggCagr         = cagr(initialCapital, windowCapital, durationMs / (1000 * 60 * 60 * 24));

  // Deflated Sharpe: skewness and excess kurtosis from return distribution
  const skew = skewness(aggReturns);
  const kurt = kurtosis(aggReturns);
  const dsr  = deflatedSharpeRatio(
    aggSharpe,
    aggReturns.length,
    variants.length,
    skew,
    kurt
  );

  // Rebuild aggregate equity curve with drawdown series
  const aggDdSeries = drawdownSeries(aggEquityValues);
  const aggregateEquityCurve: EquityPoint[] = allTestEquity.map((p, i) => ({
    ...p,
    drawdown: aggDdSeries[i] ?? 0,
  }));

  return {
    runId:       runId ?? `wf_${Date.now()}`,
    symbol,
    config,
    costs,
    windows,
    aggregateEquityCurve,
    aggregate: {
      sharpe:          aggSharpe,
      sortino:         aggSortino,
      maxDrawdown:     aggMaxDD,
      winRate:         aggWr,
      profitFactor:    aggPf,
      cagr:            aggCagr,
      totalNetPnl:     aggNetPnl,
      totalTrades:     allTestTrades.length,
      deflatedSharpe:  dsr,
      nVariantsTested: variants.length,
    },
    initialCapital,
    finalCapital:  windowCapital,
    createdAt:     Date.now(),
  };
}

// ─── Higher-order statistics ──────────────────────────────────────────────────

/**
 * Sample skewness of a distribution.
 */
export function skewness(values: number[]): number {
  if (values.length < 3) return 0;
  const m  = mean(values);
  const sd = stddev(values);
  if (sd === 0) return 0;
  const n = values.length;
  return (n / ((n - 1) * (n - 2))) *
    values.reduce((acc, v) => acc + ((v - m) / sd) ** 3, 0);
}

/**
 * Sample excess kurtosis (normal distribution = 0).
 */
export function kurtosis(values: number[]): number {
  if (values.length < 4) return 3;
  const m  = mean(values);
  const sd = stddev(values);
  if (sd === 0) return 3;
  const n = values.length;
  const k4 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) *
    values.reduce((acc, v) => acc + ((v - m) / sd) ** 4, 0);
  const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return k4 - correction + 3; // return full kurtosis (not excess)
}
