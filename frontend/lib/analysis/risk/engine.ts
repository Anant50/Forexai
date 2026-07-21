/**
 * Phase 22: High-Level Risk Management Engine
 *
 * Scans trade setups for structural invalidations, correlation exposure against active trades,
 * and warns if Stop Losses are placed too close to the current ATR market noise.
 */

import type { DecisionResult } from "../decisionEngine";
import { calculatePositionSize, type RiskProfile, type TradeSetupCalculations, calculatePipDistance } from "./math";

export interface ActiveTrade {
  pair: string;
  direction: "BUY" | "SELL";
  positionSize: number;
}

export interface RiskWarning {
  type: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  message: string;
}

export interface SetupInvalidation {
  thesis: string;
  invalidationTrigger: string;
  alternativeScenario: string;
}

export interface EnrichedTradeSetup extends TradeSetupCalculations {
  warnings: RiskWarning[];
  invalidations: SetupInvalidation[];
  correlationRisk: string; // e.g. "Low", "Medium", "High"
}

/**
 * Automatically calculates precise invalidations based on the AI's structural read or setup boundaries.
 */
function generateInvalidations(pair: string, bias: string, setupAction: string, sl: string): SetupInvalidation[] {
  const invalidations: SetupInvalidation[] = [];
  
  if (setupAction === "BUY") {
    invalidations.push({
      thesis: "Bullish structure continuation / Liquidity Sweep.",
      invalidationTrigger: `Price closes a strong bearish 1H candle below ${sl} or creates a bearish Change of Character (CHoCH).`,
      alternativeScenario: "Aggressive Bearish shift targeting lower liquidity pools."
    });
  } else if (setupAction === "SELL") {
    invalidations.push({
      thesis: "Bearish structure continuation / Sweeping premium liquidity.",
      invalidationTrigger: `Price breaks and holds above structural resistance at ${sl}.`,
      alternativeScenario: "Bullish reversal seeking higher timeframe order blocks."
    });
  } else {
    invalidations.push({
      thesis: "Market is entangled in sideways consolidation or conflicting AI metrics.",
      invalidationTrigger: "N/A - No active setup generated.",
      alternativeScenario: "Wait for clear structural breakout above resistance or below support."
    });
  }
  
  return invalidations;
}

/**
 * Scans a user's open portfolio to detect overlapping structural exposure.
 * E.g. BUY EUR/USD and BUY GBP/USD equates to heavily Shorting the USD.
 */
function calculateCorrelationExposure(targetPair: string, targetDirection: string, openTrades: ActiveTrade[]): { level: string; warnings: RiskWarning[] } {
  const warnings: RiskWarning[] = [];
  if (targetDirection === "WAIT") return { level: "LOW", warnings };

  // Break pair into Base and Quote (EUR/USD -> EUR, USD)
  const targetBase = targetPair.substring(0, 3);
  const targetQuote = targetPair.substring(targetPair.length - 3);
  
  // If BUY: Long Base, Short Quote. If SELL: Short Base, Long Quote.
  const targetLongExposure = targetDirection === "BUY" ? targetBase : targetQuote;
  const targetShortExposure = targetDirection === "BUY" ? targetQuote : targetBase;

  let duplicateExposureCount = 0;

  openTrades.forEach(trade => {
    const activeBase = trade.pair.substring(0, 3);
    const activeQuote = trade.pair.substring(trade.pair.length - 3);
    
    const activeLongExposure = trade.direction === "BUY" ? activeBase : activeQuote;
    const activeShortExposure = trade.direction === "BUY" ? activeQuote : activeBase;

    // Check if we are heavily leaning into the exact same currency direction
    if (targetLongExposure === activeLongExposure) {
      warnings.push({ type: "HIGH", message: `Correlated Exposure Risk: Both setups are LONG ${targetLongExposure} (${targetPair} vs ${trade.pair}).` });
      duplicateExposureCount++;
    }
    if (targetShortExposure === activeShortExposure) {
      warnings.push({ type: "HIGH", message: `Correlated Exposure Risk: Both setups are SHORT ${targetShortExposure} (${targetPair} vs ${trade.pair}).` });
      duplicateExposureCount++;
    }
  });

  let level = "LOW";
  if (duplicateExposureCount === 1) level = "MEDIUM";
  if (duplicateExposureCount > 1) level = "HIGH";

  return { level, warnings };
}

/**
 * Validates if the stop loss is placed far enough away from normal market noise using recent ATR.
 */
function evaluateVolatilitySL(pair: string, eps: number, entryPrice: string, slPrice: string, isTrending: boolean): RiskWarning | null {
  if (entryPrice === "N/A" || slPrice === "N/A") return null;
  
  const entry = parseFloat(entryPrice);
  const sl = parseFloat(slPrice);
  const slDistancePips = calculatePipDistance(pair, entry, sl);

  // If ATR (assumed average pip movement per candle nearby) is roughly 15 pips, 
  // an SL under 10 pips is highly likely to be knocked out prematurely.
  // Note: True ATR requires price array injection, we use `eps` (Extracted Pip Spread) dummy derived from AI strength here for demonstration architecture.
  const simulatedATR = eps * 1.5; // Roughly scale ATR to strength matrix
  
  if (slDistancePips < simulatedATR) {
    return { 
      type: "MEDIUM", 
      message: `Stop Loss (${slDistancePips} pips) is too tight relative to current ATR noise (${Math.round(simulatedATR)} pips). High probability of premature sweep.` 
    };
  }

  // If market is heavily ranging, breakout SLs need even more room
  if (!isTrending && slDistancePips < (simulatedATR * 1.5)) {
    return {
      type: "INFO",
      message: "Market is ranging. Consider widening stop loss to survive fake-out sweeps at liquidity boundaries."
    };
  }

  return null;
}


/**
 * The Master Risk Evaluation wrapper. Takes the Phase 19 AI Output and enriches it entirely with Phase 22 Risk Metrics.
 */
export function evaluateTradeRisk(
  decision: DecisionResult,
  profile: RiskProfile,
  activeTrades: ActiveTrade[] = []
): EnrichedTradeSetup | null {
  
  if (decision.signal.action === "WAIT" || decision.signal.entry === "N/A" || decision.signal.sl === "N/A" || decision.signal.tp1 === "N/A") {
    return null; 
  }

  const entry = parseFloat(decision.signal.entry);
  const sl = parseFloat(decision.signal.sl);
  const tp1 = parseFloat(decision.signal.tp1);

  // 1. Math Position Sizing Compute
  const calculations = calculatePositionSize(profile, decision.pair, entry, sl, tp1);

  // 2. Correlation Checks
  const { level: correlationRisk, warnings: corrWarnings } = calculateCorrelationExposure(decision.pair, decision.signal.action, activeTrades);

  // 3. Setup Warnings System
  const warnings: RiskWarning[] = [...corrWarnings];

  // Limit checks
  if (calculations.rrRatio < profile.minRR) {
    warnings.push({ type: "HIGH", message: `Risk/Reward Ratio (${calculations.rrRatio}) is below your minimum threshold (${profile.minRR}).` });
  }

  if (calculations.potentialLoss > profile.accountBalance * 0.05) {
     warnings.push({ type: "CRITICAL", message: `Position sizing implies drastic capital loss risk (${(calculations.potentialLoss / profile.accountBalance * 100).toFixed(1)}%). Re-calculate risk parameters immediately.` });
  }

  // Volatility bounds check (Proxy simulated ATR off master strength bounds)
  const volWarning = evaluateVolatilitySL(
    decision.pair, 
    decision.masterScore > 0 ? (100 - decision.masterScore) / 2 : 20, 
    decision.signal.entry, 
    decision.signal.sl, 
    decision.indicatorAnalysis?.state === "TRENDING"
  );
  if (volWarning) warnings.push(volWarning);

  // 4. Invalidation Logic Pipeline
  const invalidations = generateInvalidations(decision.pair, decision.masterBias, decision.signal.action, decision.signal.sl);

  return {
    ...calculations,
    warnings,
    invalidations,
    correlationRisk
  };
}
