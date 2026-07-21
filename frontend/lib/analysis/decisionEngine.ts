/**
 * ForexAI Pro — Phase 19: AI Decision Engine
 * Aggregates all logic from Phase 15-18 to form a singular Bayesian output.
 */

import type { OHLCV, AutoAnalysisResult } from "./engine";
import type { PatternAnalysis } from "./patterns";
import type { SMCAnalysis } from "./smc";
import { runAutoAnalysis } from "./engine";
import { runPatternAnalysis } from "./patterns";
import { runSMCAnalysis } from "./smc";
import { runIndicatorEngine, type IndicatorAnalysis } from "./indicators/engine";

// ─── TYPES ────────────────────────────────────────────────────────
export interface EngineWeights {
  ta: number;
  patterns: number;
  smc: number;
  mtf: number;
  indicators: number;
}

export interface DecisionResult {
  pair: string;
  timeframe: string;
  analyzedAt: number;
  
  masterScore: number;       // 0-100
  masterBias: "STRONG BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG BEARISH";
  
  probabilities: {
    bullish: number;
    sideways: number;
    bearish: number;
  };
  
  breakdown: {
    taScore: number;         // -1.0 to 1.0 (-1 bear, +1 bull)
    patternScore: number;    // -1.0 to 1.0
    smcScore: number;        // -1.0 to 1.0
    mtfScore: number;        // -1.0 to 1.0
    indicatorScore: number;  // -1.0 to 1.0
  };
  
  indicatorAnalysis?: IndicatorAnalysis;
  
  signal: {
    action: "BUY" | "SELL" | "WAIT";
    entry: string;
    sl: string;
    tp1: string;
    tp2: string;
    tp3: string;
    rr: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  };
  
  explanation: string[];
}

const DEFAULT_WEIGHTS: EngineWeights = {
  smc: 0.25,
  mtf: 0.25,
  ta: 0.20,
  patterns: 0.20,
  indicators: 0.10
};

// ─── MASTER FUSION ALGORITHM ──────────────────────────────────────
export function executeMasterDecision(
  pair: string,
  timeframe: string,
  data: OHLCV[],
  mtfDataSets?: { timeframe: string; data: OHLCV[] }[],
  weights: EngineWeights = DEFAULT_WEIGHTS
): DecisionResult {
  
  // 1. Run all sub-engines synchronously for this demonstration payload
  // In a real huge scale app this is Promise.all() across modules
  const taRes = runAutoAnalysis(data, pair, timeframe, mtfDataSets);
  const patRes = runPatternAnalysis(data, pair, timeframe);
  const smcRes = runSMCAnalysis(data, pair, timeframe);
  const indRes = runIndicatorEngine(data);
  
  // 2. Normalize Outputs to -1.0 (Bear) to +1.0 (Bull) Scale
  
  // --- TA Core (Trendlines & Levels) ---
  const tlScore = taRes.trendlines.reduce((acc, t) => {
      if (t.type === "BROKEN") return acc;
      return acc + (t.direction === "BULLISH" ? t.strength : -t.strength);
  }, 0) / Math.max(1, taRes.trendlines.length);
  const taNorm = Math.max(-1, Math.min(1, tlScore));
  
  // --- Patterns ---
  let patNorm = 0;
  if (patRes.patterns.length > 0) {
      const topPat = patRes.patterns[0]; // highest confidence
      patNorm = (topPat.qualityScore / 100) * (topPat.bias === "BULLISH" ? 1 : topPat.bias === "BEARISH" ? -1 : 0);
  }
  
  // --- SMC ---
  const smcNorm = (smcRes.institutionalScore / 100) * (smcRes.overallBias === "BULLISH" ? 1 : smcRes.overallBias === "BEARISH" ? -1 : 0);
  
  // --- MTF (Multi-timeframe Agreement) ---
  const mtfScores = taRes.mtfOutlook;
  const mtfAgreements = mtfScores.reduce((acc, m) => acc + (m.bias === "BULLISH" ? m.strength : m.bias === "BEARISH" ? -m.strength : 0), 0);
  const mtfNorm = Math.max(-1, Math.min(1, mtfAgreements / Math.max(1, mtfScores.length)));
  
  // --- Indicators ---
  const indNorm = indRes.overallScore; // Comes pre-normalized from -1.0 to 1.0
  
  // 3. Apply Bayesian Fusion Weighting
  const weightedFusion = 
      (taNorm * weights.ta) +
      (patNorm * weights.patterns) +
      (smcNorm * weights.smc) +
      (mtfNorm * weights.mtf) +
      (indNorm * weights.indicators);
      
  // Master Bias (-1 to 1) -> Probabilities
  const rawBull = 0.33 + (weightedFusion > 0 ? weightedFusion * 0.67 : 0);
  const rawBear = 0.33 + (weightedFusion < 0 ? Math.abs(weightedFusion) * 0.67 : 0);
  const rawSide = Math.max(0.1, 1 - Math.abs(weightedFusion));
  
  const total = rawBull + rawBear + rawSide;
  const bullish = Math.round((rawBull / total) * 100);
  const bearish = Math.round((rawBear / total) * 100);
  const sideways = 100 - bullish - bearish;
  
  // Absolute confidence vector strength (0-100)
  const masterScore = Math.round(Math.abs(weightedFusion) * 100);
  
  let biasText: DecisionResult["masterBias"] = "NEUTRAL";
  if (weightedFusion > 0.6) biasText = "STRONG BULLISH";
  else if (weightedFusion > 0.2) biasText = "BULLISH";
  else if (weightedFusion < -0.6) biasText = "STRONG BEARISH";
  else if (weightedFusion < -0.2) biasText = "BEARISH";
  
  // 4. Trace NLP Reasoning
  const explanation: string[] = [];
  
  if (weights.smc > 0 && smcNorm !== 0) {
      explanation.push(smcNorm > 0 
          ? `Institutional Order Flow is BULLISH (Strength: ${(Math.abs(smcNorm)*100).toFixed(0)}%). Unmitigated demand detected.` 
          : `Institutional Order Flow is BEARISH (Strength: ${(Math.abs(smcNorm)*100).toFixed(0)}%). Resistance absorbing supply.`);
  }
  
  if (weights.mtf > 0 && Math.abs(mtfNorm) > 0.4) {
      explanation.push(mtfNorm > 0 
          ? "Higher Timeframes are in heavy structural alignment for upside momentum." 
          : "Higher Timeframes confirm macro down-trend. Proceed with caution on lower TF longs.");
  }
  
  if (weights.patterns > 0 && patRes.patterns.length > 0) {
      explanation.push(`A primary ${patRes.patterns[0].name} detected with ${patRes.patterns[0].qualityScore}% algorithmic confidence.`);
  }

  if (indRes.overallScore !== 0) {
      const bias = indRes.overallScore > 0 ? "BULLISH" : "BEARISH";
      explanation.push(`Technical indicator analysis is ${bias} with a ${Math.abs(indRes.overallScore*100).toFixed(0)}% vector weight. State: ${indRes.state.replace("_", " ")}.`);
  }
  
  if (masterScore < 50) {
      explanation.push("CONTRADICTION DETECTED: Some engines point opposite to others (e.g., MTF opposes SMC). System outputs WAIT directive to preserve capital.");
  }
  
  // 5. Setup Generation
  const signal: DecisionResult["signal"] = {
      action: "WAIT",
      entry: "N/A", sl: "N/A", tp1: "N/A", tp2: "N/A", tp3: "N/A", rr: "N/A",
      riskLevel: "HIGH"
  };
  
  // Only suggest a trade if master confidence is solid (>55%)
  if (masterScore >= 55) {
      // Inherit the best logical entry from TA or SMC based on weight
      const useSmc = (weights.smc >= weights.patterns && smcRes.tradeSetup.action !== "WAIT");
      const fallbackSetup = patRes.patterns.length > 0 ? patRes.patterns[0].tradeSetup : null;
      let refSetup: any = useSmc ? smcRes.tradeSetup : fallbackSetup;
      
      if (!refSetup && smcRes.tradeSetup.action !== "WAIT") refSetup = smcRes.tradeSetup; // Fallback
      if (!refSetup) refSetup = { action: "WAIT" };
      
      if (refSetup.action !== "WAIT") {
          signal.action = refSetup.action === "LONG" ? "BUY" : refSetup.action === "SHORT" ? "SELL" : refSetup.action;
          signal.entry = refSetup.entry || refSetup.entryZone || "N/A";
          signal.sl = refSetup.sl || refSetup.stopLoss || "N/A";
          signal.tp1 = refSetup.tp1 || refSetup.takeProfit1 || "N/A";
          signal.tp2 = refSetup.tp2 || refSetup.takeProfit2 || "N/A";
          signal.tp3 = refSetup.tp3 || refSetup.takeProfit3 || "N/A";
          signal.rr = refSetup.rr || refSetup.rrRatio || "N/A";
          signal.riskLevel = masterScore > 80 ? "LOW" : masterScore > 65 ? "MEDIUM" : "HIGH";
      }
  }
  
  return {
      pair, timeframe, analyzedAt: Date.now(),
      masterScore,
      masterBias: biasText,
      probabilities: { bullish, sideways, bearish },
      breakdown: { taScore: taNorm, patternScore: patNorm, smcScore: smcNorm, mtfScore: mtfNorm, indicatorScore: indNorm },
      indicatorAnalysis: indRes,
      signal,
      explanation
  };
}
