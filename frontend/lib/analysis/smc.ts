/**
 * ForexAI Pro — Phase 18: Smart Money Concepts (SMC) Engine
 * Detects Fair Value Gaps, Order Blocks, Liquidity Sweeps, and institutional market structure.
 */

import { findPivots, detectMarketStructure, type OHLCV, type StructurePoint, type Pivot } from "./engine";

export type SMCBias = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface FVG {
  id: string;
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  startIndex: number;
  startTime: number;
  mitigatedIndex?: number;
  mitigated: boolean;
}

export interface OrderBlock {
  id: string;
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  startIndex: number;
  startTime: number;
  mitigated: boolean;
}

export interface LiquidityLevel {
  id: string;
  type: "BUYSIDE" | "SELLSIDE";
  price: number;
  strength: number; // Touches
  swept: boolean;
  time: number;
}

export interface SMCAnalysis {
  pair: string;
  timeframe: string;
  analyzedAt: number;
  
  fvgs: FVG[];
  orderBlocks: OrderBlock[];
  liquidity: LiquidityLevel[];
  structure: StructurePoint[];
  
  institutionalScore: number; // 0-100 indicating participation weight
  overallBias: SMCBias;
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
  
  explanation: string[];
}

// ─── 1. FAIR VALUE GAPS (FVG) ────────────────────────────────────────────────
// A gap between candle 1 and candle 3 where price action bypasses a zone.
function detectFVGs(data: OHLCV[]): FVG[] {
  const fvgs: FVG[] = [];
  
  for (let i = 2; i < data.length; i++) {
    const c1 = data[i - 2];
    const c3 = data[i];
    
    // Bullish FVG: C3 Low > C1 High
    if (c3.low > c1.high) {
      fvgs.push({
        id: `fvg_bull_${i}`,
        type: "BULLISH",
        top: c3.low,
        bottom: c1.high,
        startIndex: i - 1,   // The gap occurs across the middle candle (i-1)
        startTime: data[i - 1].time,
        mitigated: false
      });
    }
    
    // Bearish FVG: C3 High < C1 Low
    else if (c3.high < c1.low) {
      fvgs.push({
        id: `fvg_bear_${i}`,
        type: "BEARISH",
        top: c1.low,
        bottom: c3.high,
        startIndex: i - 1,
        startTime: data[i - 1].time,
        mitigated: false
      });
    }
  }
  
  // Check mitigations (has future price traded back into the gap?)
  for (const fvg of fvgs) {
    for (let j = fvg.startIndex + 2; j < data.length; j++) {
      const c = data[j];
      let filled = false;
      if (fvg.type === "BULLISH" && c.low <= fvg.bottom) filled = true;
      if (fvg.type === "BEARISH" && c.high >= fvg.top) filled = true;
      
      if (filled) {
        fvg.mitigated = true;
        fvg.mitigatedIndex = j;
        break; 
      }
    }
  }
  
  // Return only recent unmitigated ones, plus a few recently mitigated for context
  return fvgs.filter(f => !f.mitigated || data.length - f.mitigatedIndex! < 20).slice(-15);
}


// ─── 2. ORDER BLOCKS (OB) ────────────────────────────────────────────────────
// Base of an impulsive move. Last opposing candle before a strong move.
function detectOrderBlocks(data: OHLCV[], fvgs: FVG[]): OrderBlock[] {
  const obs: OrderBlock[] = [];
  
  // We look for significant momentum candles (+- 0.3% move) or FVG creation points
  const unmitigatedFvgs = fvgs.filter(f => !f.mitigated);
  
  for (const fvg of unmitigatedFvgs) {
    // The impulse candle is the one that generated the FVG (fvg.startIndex)
    const impulseIdx = fvg.startIndex;
    
    // Scan backward to find the base candle opposing the move
    let baseIdx = impulseIdx - 1;
    if (baseIdx < 0) continue;
    
    const impulseCandle = data[impulseIdx];
    
    if (fvg.type === "BULLISH") {
      // Look for the last bearish candle (close < open) before the impulse
      while (baseIdx > 0 && data[baseIdx].close >= data[baseIdx].open) {
        baseIdx--;
      }
      
      const baseCandle = data[baseIdx];
      // Size check - base candle shouldn't be massive compared to the impulse
      // OB Zone is high to low of base candle
      obs.push({
        id: `ob_bull_${baseIdx}`,
        type: "BULLISH",
        top: baseCandle.high,
        bottom: baseCandle.low,
        startIndex: baseIdx,
        startTime: baseCandle.time,
        mitigated: false
      });
    } else {
      // Look for the last bullish candle before the bearish impulse
      while (baseIdx > 0 && data[baseIdx].close <= data[baseIdx].open) {
        baseIdx--;
      }
      const baseCandle = data[baseIdx];
      obs.push({
        id: `ob_bear_${baseIdx}`,
        type: "BEARISH",
        top: baseCandle.high,
        bottom: baseCandle.low,
        startIndex: baseIdx,
        startTime: baseCandle.time,
        mitigated: false
      });
    }
  }
  
  // Mitigation check for OBs (price re-enters the OB zone)
  for (const ob of obs) {
    for (let j = ob.startIndex + 2; j < data.length; j++) {
      const c = data[j];
      // Full mitigation means price pierced through it completely or largely entered
      if (ob.type === "BULLISH" && c.low <= (ob.top + ob.bottom)/2) {
        ob.mitigated = true; break;
      }
      if (ob.type === "BEARISH" && c.high >= (ob.top + ob.bottom)/2) {
        ob.mitigated = true; break;
      }
    }
  }
  
  // Deduplicate
  const uniqueObs = Array.from(new Map(obs.map(ob => [ob.id, ob])).values());
  return uniqueObs.filter(o => !o.mitigated).slice(-8); // Only active ones
}


// ─── 3. LIQUIDITY ZONES ──────────────────────────────────────────────────────
function detectLiquidity(data: OHLCV[], pivots: Pivot[]): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  const tolerance = data[0].close * 0.001; // 0.1% strict EQH/EQL tolerance
  
  const highs = pivots.filter(p => p.type === "HIGH");
  const lows = pivots.filter(p => p.type === "LOW");
  
  // Buy-Side Liquidity (Equal Highs)
  for (let i = 0; i < highs.length - 1; i++) {
    const cluster = [highs[i]];
    for (let j = i + 1; j < highs.length; j++) {
      if (Math.abs(highs[i].price - highs[j].price) <= tolerance) {
        cluster.push(highs[j]);
      }
    }
    if (cluster.length >= 2) {
      const p = cluster.reduce((sum, c) => sum + c.price, 0) / cluster.length;
      levels.push({
        id: `liq_bsl_${cluster[0].index}`,
        type: "BUYSIDE",
        price: p,
        strength: cluster.length,
        swept: false,
        time: cluster[cluster.length-1].time
      });
      i += cluster.length - 1; // skip clustered
    }
  }
  
  // Sell-Side Liquidity (Equal Lows)
  for (let i = 0; i < lows.length - 1; i++) {
    const cluster = [lows[i]];
    for (let j = i + 1; j < lows.length; j++) {
      if (Math.abs(lows[i].price - lows[j].price) <= tolerance) {
        cluster.push(lows[j]);
      }
    }
    if (cluster.length >= 2) {
      const p = cluster.reduce((sum, c) => sum + c.price, 0) / cluster.length;
      levels.push({
        id: `liq_ssl_${cluster[0].index}`,
        type: "SELLSIDE",
        price: p,
        strength: cluster.length,
        swept: false,
        time: cluster[cluster.length-1].time
      });
      i += cluster.length - 1;
    }
  }
  
  // Detect Sweeps in the last 20 bars
  const recentBars = data.slice(-20);
  for (const liq of levels) {
    if (liq.time >= recentBars[0].time) continue; // Must be created before
    
    for (const b of recentBars) {
      if (liq.type === "BUYSIDE" && b.high > liq.price && b.close < liq.price) {
        liq.swept = true; // Wick swept above but closed below
      }
      if (liq.type === "SELLSIDE" && b.low < liq.price && b.close > liq.price) {
        liq.swept = true; // Wick swept below but closed above
      }
    }
  }
  
  return levels.sort((a,b) => b.time - a.time).slice(0, 10);
}


// ─── MASTER ORCHESTRATOR ─────────────────────────────────────────────────────
export function runSMCAnalysis(
  data: OHLCV[],
  pair: string,
  timeframe: string
): SMCAnalysis {
  
  const pivots = findPivots(data, 5);
  const structure = detectMarketStructure(pivots);
  
  const fvgs = detectFVGs(data);
  const obs = detectOrderBlocks(data, fvgs);
  const liquidity = detectLiquidity(data, pivots);
  
  // Aggregate AI scoring & NLP
  const explanation: string[] = [];
  let bullPts = 0;
  let bearPts = 0;
  let score = 50;
  
  // 1. Structure Points
  const recentStruct = structure.slice(-2); // Last 2 structural events
  if (recentStruct.some(s => s.type === "BOS" && s.explanation.includes("Bullish"))) {
      bullPts += 2; explanation.push("Recent Bullish Break of Structure (BOS) indicates upside trend continuation.");
  } else if (recentStruct.some(s => s.type === "BOS" && s.explanation.includes("Bearish"))) {
      bearPts += 2; explanation.push("Recent Bearish Break of Structure (BOS) indicates downward trend continuation.");
  }
  
  if (recentStruct.some(s => s.type === "CHoCH" && s.explanation.includes("Bullish"))) {
      bullPts += 3; explanation.push("Bullish Change of Character (CHoCH) detected, predicting foundational shift upwards.");
  } else if (recentStruct.some(s => s.type === "CHoCH" && s.explanation.includes("Bearish"))) {
      bearPts += 3; explanation.push("Bearish Change of Character (CHoCH) detected, predicting structural downshift.");
  }
  
  // 2. Active Unmitigated Order Blocks
  const activeObs = obs.filter(o => !o.mitigated);
  if (activeObs.length > 0) {
      const latestOB = activeObs[activeObs.length - 1];
      if (latestOB.type === "BULLISH") { 
          bullPts += 2; explanation.push(`Unmitigated Bullish Order Block forming foundation at ${latestOB.top.toFixed(5)}.`);
      } else {
          bearPts += 2; explanation.push(`Unmitigated Bearish Order Block establishing supply at ${latestOB.bottom.toFixed(5)}.`);
      }
      score += 15; // Institutional participation high
  }
  
  // 3. Liquidity Sweeps
  const sweptLevs = liquidity.filter(l => l.swept);
  if (sweptLevs.length > 0) {
      const latestSweep = sweptLevs[0];
      if (latestSweep.type === "SELLSIDE") {
          bullPts += 2; explanation.push("Sell-side liquidity pool swept below (Stop Hunt), trapping shorts before a potential rally.");
      } else {
          bearPts += 2; explanation.push("Buy-side liquidity swept above range (Stop Hunt), trapping breakout longs before reversal.");
      }
      score += 20; // manipulation event
  }
  
  // Cap score
  score = Math.min(99, score + activeObs.length * 5);
  
  // Define bias and probabilities
  let bias: SMCBias = "NEUTRAL";
  if (bullPts > bearPts) bias = "BULLISH";
  if (bearPts > bullPts) bias = "BEARISH";
  
  const totalRaw = bullPts + bearPts + 2; // base offset
  const bullProb = Math.round(((bullPts + 1)/totalRaw)*100);
  const bearProb = Math.round(((bearPts + 1)/totalRaw)*100);
  const sideProb = 100 - bullProb - bearProb;
  
  if (explanation.length === 0) {
      explanation.push("Insufficient institutional footprint data in recent price action. Structure is balanced or choppy.");
  }
  
  // Trade Setup
  let setup: SMCAnalysis["tradeSetup"] = { action: "WAIT", entry: "N/A", sl: "N/A", tp1: "N/A", tp2: "N/A", tp3: "N/A", rr: "N/A" };
  
  const atr = data[data.length-1].close * 0.002;
  
  if (bias !== "NEUTRAL" && activeObs.length > 0) {
      const ob = activeObs[activeObs.length - 1]; // Closest OB
      if (bias === "BULLISH" && ob.type === "BULLISH") {
          const entry = ob.top;
          const sl = ob.bottom - (atr * 0.5);
          const t1 = entry + (atr * 2);
          const t2 = entry + (atr * 4);
          const rr = Math.abs(t2 - entry) / Math.abs(entry - sl);
          setup = { action: "LONG", entry: entry.toFixed(5), sl: sl.toFixed(5), tp1: t1.toFixed(5), tp2: t2.toFixed(5), tp3: (entry + atr*7).toFixed(5), rr: "1:" + rr.toFixed(1) };
      } 
      else if (bias === "BEARISH" && ob.type === "BEARISH") {
          const entry = ob.bottom;
          const sl = ob.top + (atr * 0.5);
          const t1 = entry - (atr * 2);
          const t2 = entry - (atr * 4);
          const rr = Math.abs(entry - t2) / Math.abs(sl - entry);
          setup = { action: "SHORT", entry: entry.toFixed(5), sl: sl.toFixed(5), tp1: t1.toFixed(5), tp2: t2.toFixed(5), tp3: (entry - atr*7).toFixed(5), rr: "1:" + rr.toFixed(1) };
      }
  }

  return {
    pair, timeframe, analyzedAt: Date.now(),
    fvgs, orderBlocks: obs, liquidity, structure,
    institutionalScore: score,
    overallBias: bias,
    scenarios: { bullish: bullProb, sideways: sideProb, bearish: bearProb },
    tradeSetup: setup,
    explanation
  };
}
