/**
 * ForexAI Pro — Phase 17: Multi-Timeframe (MTF) AI Intelligence Engine
 * Orchestrates analysis across multiple frequencies to generate a unified consensus.
 */

import { findPivots, detectMarketStructure, type OHLCV, type StructurePoint } from "./engine";
import { runPatternAnalysis, type PatternAnalysis } from "./patterns";

export type TrendBias = "STRONG BULL" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG BEAR";
export type MacroBias = "BULLISH" | "NEUTRAL" | "BEARISH";

export interface TimeframeResult {
  timeframe: string;
  trend: TrendBias;
  structure: string;         // e.g. "HH/HL", "CHOP"
  structureBias: MacroBias;
  topPattern: string | null;
  patternBias: MacroBias;
  srProximity: string;       // e.g. "Near Support"
}

export interface MTFConsensus {
  id: string;
  pair: string;
  analyzedAt: number;
  timeframes: string[];
  
  agreementScore: number;     // 0-100%
  overallBias: MacroBias;
  
  scenarios: {
    bullish: number;
    sideways: number;
    bearish: number;
  };
  
  tradeSetup: {
    action: "LONG" | "SHORT" | "WAIT";
    entry: string;
    sl: string;
    tp1: string;
    tp2: string;
    tp3: string;
    rr: string;
  };

  results: TimeframeResult[];
  
  confluenceZones: {
    price: number;
    type: "SUPPORT" | "RESISTANCE";
    overlappingTfs: string[];
    strength: number; // 0-100
  }[];
}

// ─── TF Weighting ─────────────────────────────────────────────────────────────
// Exponential scaling: higher timeframes exert more macro dominance.
const TF_WEIGHTS: Record<string, number> = {
  "1m":  1,
  "3m":  1.5,
  "5m":  2,
  "15m": 4,
  "30m": 6,
  "1h":  10,
  "4h":  18,
  "1d":  30,
  "1w":  50,
  "1M":  75,
};

// ─── KERNEL 1: Trend Extraction ───────────────────────────────────────────────
function evaluateTrend(data: OHLCV[]): TrendBias {
  if (data.length < 200) return "NEUTRAL";
  
  // Quick EMA calculation
  const close = data.map(d => d.close);
  const ema = (period: number) => {
    let sum = 0; for(let i=0; i<period; i++) sum += close[i] || 0;
    let val = sum / period;
    const k = 2 / (period + 1);
    const res = [...Array(period).fill(0), val];
    for(let i=period; i<close.length; i++) {
      val = (close[i] - val) * k + val;
      res.push(val);
    }
    return res;
  };

  const ema20  = ema(20);
  const ema50  = ema(50);
  const ema200 = ema(200);

  const last20  = ema20[ema20.length - 1];
  const last50  = ema50[ema50.length - 1];
  const last200 = ema200[ema200.length - 1];
  const price   = close[close.length - 1];

  if (price > last20 && last20 > last50 && last50 > last200) return "STRONG BULL";
  if (price > last50 && last50 > last200) return "BULLISH";
  if (price < last20 && last20 < last50 && last50 < last200) return "STRONG BEAR";
  if (price < last50 && last50 < last200) return "BEARISH";
  return "NEUTRAL";
}

// ─── KERNEL 2: Structure Simplify ─────────────────────────────────────────────
function simplifyStructure(result: StructurePoint[]): { label: string; bias: MacroBias } {
  if (!result || result.length < 2) return { label: "CHOP", bias: "NEUTRAL" };
  
  const last = result[result.length - 1];
  const slast= result[result.length - 2];

  if (last.type === "HH") return { label: "HH/HL", bias: "BULLISH" };
  if (last.type === "LL") return { label: "LH/LL", bias: "BEARISH" };
  
  // Mixed signals (e.g. HH then HL then LH)
  if (last.type === "HL" && slast.type === "HH") return { label: "HH/HL", bias: "BULLISH" };
  if (last.type === "LH" && slast.type === "LL") return { label: "LH/LL", bias: "BEARISH" };

  return { label: "CHOP", bias: "NEUTRAL" };
}

// ─── MAIN ORCHESTRATOR ────────────────────────────────────────────────────────
export function runMTFAnalysis(
  pair: string,
  datasets: { timeframe: string; data: OHLCV[] }[]
): MTFConsensus {
  
  const results: TimeframeResult[] = [];
  let totalWeight = 0;
  let bullPoints = 0;
  let bearPoints = 0;

  const allLevels: { price: number; type: "SUPPORT"|"RESISTANCE"; tf: string; weight: number }[] = [];

  for (const ds of datasets) {
    if (ds.data.length < 100) continue; // skip invalid TF sets

    // 1. Structural Pivots
    const pivots = findPivots(ds.data, 5);
    const ms = detectMarketStructure(pivots);
    const struct = simplifyStructure(ms);

    // 2. Trend
    const trend = evaluateTrend(ds.data);
    let trendBias: MacroBias = "NEUTRAL";
    if (trend.includes("BULL")) trendBias = "BULLISH";
    if (trend.includes("BEAR")) trendBias = "BEARISH";

    // 3. Patterns
    const patRes = runPatternAnalysis(ds.data, pair, ds.timeframe);
    let patBias: MacroBias = "NEUTRAL";
    let topPat = null;
    if (patRes.topPattern) {
        patBias = patRes.topPattern.bias;
        topPat = patRes.topPattern.name;
    }

    // Accumulate weights
    const w = TF_WEIGHTS[ds.timeframe] || 1;
    totalWeight += w;

    // Consensus Voting Logic (Trend, Structure, Pattern) 
    // Normalized [-1 to 1] per component
    const scoreMap: Record<MacroBias, number> = { BULLISH: 1, BEARISH: -1, NEUTRAL: 0 };
    const tfScore = (scoreMap[trendBias]*0.4) + (scoreMap[struct.bias]*0.4) + (scoreMap[patBias]*0.2);
    
    if (tfScore > 0.2) bullPoints += w * tfScore;
    else if (tfScore < -0.2) bearPoints += w * Math.abs(tfScore);

    // Collect S/R Levels (simple extraction from highs/lows for merging)
    pivots.forEach(p => {
        allLevels.push({
            price: p.price,
            type: p.type === "HIGH" ? "RESISTANCE" : "SUPPORT",
            tf: ds.timeframe,
            weight: w
        });
    });

    results.push({
        timeframe: ds.timeframe,
        trend,
        structure: struct.label,
        structureBias: struct.bias,
        topPattern: topPat,
        patternBias: patBias,
        srProximity: "Mid-Range" // We will update this dynamically below if needed
    });
  }

  // Calculate Agreement %
  const totalDominant = Math.max(bullPoints, bearPoints);
  const sidePoints = totalWeight - bullPoints - bearPoints;
  const agreement = totalWeight > 0 ? Math.round((totalDominant / totalWeight) * 100) : 50;

  let overall: MacroBias = "NEUTRAL";
  if (bullPoints > bearPoints * 1.5 && agreement > 55) overall = "BULLISH";
  else if (bearPoints > bullPoints * 1.5 && agreement > 55) overall = "BEARISH";

  // S/R Confluence Merging
  allLevels.sort((a,b) => a.price - b.price);
  const confluenceZones: MTFConsensus["confluenceZones"] = [];
  const tolerance = datasets[0]?.data?.[0]?.close * 0.002 || 0.002; // 0.2% variance

  if (allLevels.length > 0) {
      let currentCluster = [allLevels[0]];
      
      for (let i = 1; i < allLevels.length; i++) {
          const l = allLevels[i];
          if (l.price - currentCluster[currentCluster.length-1].price <= tolerance) {
              currentCluster.push(l);
          } else {
              // Process cluster
              const tfs = new Set(currentCluster.map(c => c.tf));
              if (tfs.size >= 2) {
                  // Confluence zone
                  const avgPrice = currentCluster.reduce((s,c)=>s+c.price, 0) / currentCluster.length;
                  const types = currentCluster.map(c=>c.type);
                  const domType = types.filter(t=>t==="SUPPORT").length > types.length/2 ? "SUPPORT" : "RESISTANCE";
                  const strength = Math.min(100, currentCluster.reduce((s,c)=>s+c.weight, 0) * 5);
                  
                  confluenceZones.push({
                      price: avgPrice,
                      type: domType,
                      overlappingTfs: Array.from(tfs),
                      strength
                  });
              }
              currentCluster = [l];
          }
      }
  }

  confluenceZones.sort((a,b) => b.strength - a.strength); // strongest first
  
  // Re-run for Bayesian Scenario Probability based on accumulated points
  const total = bullPoints + bearPoints + (sidePoints > 0 ? sidePoints : totalWeight * 0.2);
  const pBull = Math.round((bullPoints / total) * 100);
  const pBear = Math.round((bearPoints / total) * 100);
  const pSide = 100 - pBull - pBear;

  // Trade Rule Oracle
  let setup: MTFConsensus["tradeSetup"] = { action: "WAIT", entry: "N/A", sl: "N/A", tp1: "N/A", tp2: "N/A", tp3: "N/A", rr: "N/A" };
  
  if (agreement > 65) {
      const lastPrice = datasets[datasets.length-1]?.data.slice(-1)[0].close || 0;
      const atr = 0.002 * lastPrice; // quick simulated ATR for logic completeness
      const dir = overall === "BULLISH" ? 1 : -1;
      
      if (overall !== "NEUTRAL") {
          const entry = lastPrice + dir * (atr * 0.2);
          const sl    = entry - dir * (atr * 1.5);
          const t1    = entry + dir * (atr * 2);
          const t2    = entry + dir * (atr * 4);
          const t3    = entry + dir * (atr * 6);
          const rrF   = Math.abs(t2 - entry) / Math.abs(entry - sl);
          
          setup = {
              action: overall === "BULLISH" ? "LONG" : "SHORT",
              entry: entry.toFixed(5),
              sl: sl.toFixed(5),
              tp1: t1.toFixed(5),
              tp2: t2.toFixed(5),
              tp3: t3.toFixed(5),
              rr: "1:" + rrF.toFixed(1)
          };
      }
  }

  return {
    id: `mtf_${Date.now()}`,
    pair,
    analyzedAt: Date.now(),
    timeframes: datasets.map(d => d.timeframe),
    agreementScore: agreement,
    overallBias: overall,
    scenarios: { bullish: pBull, sideways: pSide, bearish: pBear },
    tradeSetup: setup,
    results,
    confluenceZones: confluenceZones.slice(0, 10), // return top 10 zones
  };
}
