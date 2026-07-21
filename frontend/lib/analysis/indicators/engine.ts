/**
 * Phase 21: Adaptive Indicator Aggregation Engine
 *
 * Automatically computes standard technical indicators, detects market state (Trending/Ranging/Volatile),
 * adapts weighting dynamically, searches for divergences, and outputs a unified IndicatorSignal Matrix.
 */

import type { OHLCV } from "../engine";
import { calculateEMA, calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands, calculateATR, calculateADX, calculateStochastic } from "./math";
import { detectDivergence, type DivergenceResult } from "./divergence";

export interface IndicatorSignal {
  name: string;
  value: number | string | object;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: number; // 0-100
  explanation: string;
  category: "TREND" | "MOMENTUM" | "VOLATILITY" | "DIVERGENCE";
}

export interface IndicatorAnalysis {
  state: "TRENDING" | "RANGING" | "HIGH_VOLATILITY" | "LOW_VOLATILITY";
  signals: IndicatorSignal[];
  divergences: DivergenceResult[];
  agreementScore: number;     // 0-100
  conflictScore: number;      // 0-100
  overallBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  overallScore: number;       // -1.0 to 1.0 (vector to feed into Phase 19)
}

export function runIndicatorEngine(data: OHLCV[]): IndicatorAnalysis {
  const closes = data.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  const signals: IndicatorSignal[] = [];

  if (closes.length < 50) return getEmptyAnalysis();

  // 1. Array Calculations
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  
  const rsi = calculateRSI(closes, 14);
  const macdData = calculateMACD(closes);
  const stoch = calculateStochastic(data);
  
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(data, 14);
  const adxData = calculateADX(data, 14);

  // 2. Extract current values
  const currEMA20  = ema20[ema20.length - 1];
  const currEMA50  = ema50[ema50.length - 1];
  const currSMA200 = sma200[sma200.length - 1];
  
  const currRSI = rsi[rsi.length - 1];
  const prevRSI = rsi[rsi.length - 2];
  
  const currMacdHist = macdData.hist[macdData.hist.length - 1];
  const prevMacdHist = macdData.hist[macdData.hist.length - 2];
  
  const currStochK = stoch.k[stoch.k.length - 1];
  
  const currBBUp   = bb.upper[bb.upper.length - 1];
  const currBBDn   = bb.lower[bb.lower.length - 1];
  
  const currADX    = adxData.adx[adxData.adx.length - 1];
  const currPlusDI = adxData.plusDI[adxData.plusDI.length - 1];

  // 3. Market State Detection
  // We use ADX > 25 for trending, ATR to detect volatility spikes
  const isTrending = currADX > 25;
  const state: IndicatorAnalysis["state"] = isTrending ? "TRENDING" : "RANGING";
  // We could also mix volatility here, but keep it simple for now

  // 4. Generate Signals (Categorized)
  
  // -- TREND (Weight heavily if trending)
  let trendBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (currentPrice > currEMA20 && currEMA20 > currEMA50 && currentPrice > currSMA200) {
    trendBias = "BULLISH";
    signals.push({ name: "Moving Averages", value: { ema20: currEMA20, ema50: currEMA50 }, bias: "BULLISH", strength: 80, explanation: "Price is above short and medium-term moving averages.", category: "TREND" });
  } else if (currentPrice < currEMA20 && currEMA20 < currEMA50 && currentPrice < currSMA200) {
    trendBias = "BEARISH";
    signals.push({ name: "Moving Averages", value: { ema20: currEMA20, ema50: currEMA50 }, bias: "BEARISH", strength: 80, explanation: "Price is below short and medium-term moving averages.", category: "TREND" });
  } else {
    signals.push({ name: "Moving Averages", value: { ema20: currEMA20, ema50: currEMA50 }, bias: "NEUTRAL", strength: 30, explanation: "Moving averages are crossed or price is entangled.", category: "TREND" });
  }

  if (currADX > 20) {
     const adxBias = currPlusDI > 50 ? "BULLISH" : "BEARISH";
     signals.push({ name: "ADX Trend Strength", value: currADX.toFixed(1), bias: adxBias, strength: Math.min(currADX * 2, 90), explanation: `ADX shows established trend strength (${adxBias}).`, category: "TREND" });
  }

  // -- MOMENTUM (Weight heavily if ranging)
  if (currRSI > 70) {
    signals.push({ name: "RSI", value: currRSI.toFixed(1), bias: "BEARISH", strength: 75, explanation: "RSI is in overbought territory, increasing reversal risk.", category: "MOMENTUM" });
  } else if (currRSI < 30) {
    signals.push({ name: "RSI", value: currRSI.toFixed(1), bias: "BULLISH", strength: 75, explanation: "RSI is in oversold territory, indicating exhaustion of selling pressure.", category: "MOMENTUM" });
  } else {
    const momentum = currRSI > 50 ? "BULLISH" : "BEARISH";
    signals.push({ name: "RSI", value: currRSI.toFixed(1), bias: momentum, strength: Math.abs(currRSI - 50) * 2, explanation: `RSI shows moderate ${momentum} momentum.`, category: "MOMENTUM" });
  }

  if (currMacdHist > 0 && currMacdHist > prevMacdHist) {
    signals.push({ name: "MACD Histogram", value: currMacdHist.toFixed(4), bias: "BULLISH", strength: 80, explanation: "MACD histogram is positive and expanding.", category: "MOMENTUM" });
  } else if (currMacdHist < 0 && currMacdHist < prevMacdHist) {
    signals.push({ name: "MACD Histogram", value: currMacdHist.toFixed(4), bias: "BEARISH", strength: 80, explanation: "MACD histogram is negative and expanding.", category: "MOMENTUM" });
  } else {
    signals.push({ name: "MACD Histogram", value: currMacdHist.toFixed(4), bias: "NEUTRAL", strength: 40, explanation: "MACD momentum is contracting or neutral.", category: "MOMENTUM" });
  }
  
  if (currStochK > 80) {
    signals.push({ name: "Stochastic", value: currStochK.toFixed(1), bias: "BEARISH", strength: 60, explanation: "Stochastic oscillator is overbought.", category: "MOMENTUM" });
  } else if (currStochK < 20) {
    signals.push({ name: "Stochastic", value: currStochK.toFixed(1), bias: "BULLISH", strength: 60, explanation: "Stochastic oscillator is oversold.", category: "MOMENTUM" });
  }

  // -- VOLATILITY (Support/Resistance via Bollinger)
  if (currentPrice >= currBBUp) {
    signals.push({ name: "Bollinger Bands", value: "Upper Touch", bias: "BEARISH", strength: 65, explanation: "Price is touching the upper standard deviation band.", category: "VOLATILITY" });
  } else if (currentPrice <= currBBDn) {
    signals.push({ name: "Bollinger Bands", value: "Lower Touch", bias: "BULLISH", strength: 65, explanation: "Price is touching the lower standard deviation band.", category: "VOLATILITY" });
  }

  // 5. Divergence Detection
  const divergences = detectDivergence(data, rsi, "RSI");
  divergences.forEach(d => {
     const bias = d.type.includes("BULLISH") ? "BULLISH" : "BEARISH";
     const expl = d.type.includes("HIDDEN") ? "Hidden divergence indicates trend continuation." : "Regular divergence indicates possible reversal.";
     signals.push({ name: `RSI Divergence`, value: d.type, bias, strength: d.confidence, explanation: expl, category: "DIVERGENCE" });
  });


  // 6. Adaptive Weighting Aggregation
  let bullWeight = 0;
  let bearWeight = 0;
  let totalWeight = 0;

  signals.forEach(sig => {
    // Determine dynamic weight multiplier based on market state
    let baseMult = 1.0;
    if (state === "TRENDING") {
      if (sig.category === "TREND") baseMult = 1.5;
      if (sig.category === "MOMENTUM") baseMult = 0.8;
    } else {
      // RANGING
      if (sig.category === "MOMENTUM" || sig.category === "VOLATILITY") baseMult = 1.5;
      if (sig.category === "TREND") baseMult = 0.5;
    }
    
    // Divergences are always strong signals
    if (sig.category === "DIVERGENCE") baseMult = 2.0;

    const w = (sig.strength / 100) * baseMult;
    totalWeight += w;
    
    if (sig.bias === "BULLISH") bullWeight += w;
    if (sig.bias === "BEARISH") bearWeight += w;
  });

  const overallScoreRange = totalWeight > 0 ? (bullWeight - bearWeight) / totalWeight : 0; // -1 to 1
  
  const agreement = totalWeight > 0 ? Math.max(bullWeight, bearWeight) / totalWeight : 0;
  const conflict = 1 - agreement;
  
  let overallBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (overallScoreRange > 0.2) overallBias = "BULLISH";
  else if (overallScoreRange < -0.2) overallBias = "BEARISH";

  return {
    state,
    signals,
    divergences,
    agreementScore: Math.round(agreement * 100),
    conflictScore: Math.round(conflict * 100),
    overallBias,
    overallScore: overallScoreRange
  };
}

export function getEmptyAnalysis(): IndicatorAnalysis {
  return {
    state: "RANGING",
    signals: [],
    divergences: [],
    agreementScore: 0,
    conflictScore: 0,
    overallBias: "NEUTRAL",
    overallScore: 0
  };
}
