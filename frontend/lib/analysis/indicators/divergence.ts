/**
 * Phase 21: Divergence Detection Engine
 *
 * Scans price action vs oscillator swings to detect regular and hidden divergences.
 * - Regular Bullish: Price LL, Oscillator HL (Reversal)
 * - Regular Bearish: Price HH, Oscillator LH (Reversal)
 * - Hidden Bullish: Price HL, Oscillator LL (Trend Continuation)
 * - Hidden Bearish: Price LH, Oscillator HH (Trend Continuation)
 */

import type { OHLCV } from "../engine";

export interface DivergenceResult {
  type: "REGULAR_BULLISH" | "REGULAR_BEARISH" | "HIDDEN_BULLISH" | "HIDDEN_BEARISH";
  indicator: string;
  priceStartIdx: number;
  priceEndIdx: number;
  confidence: number;
}

export function detectDivergence(data: OHLCV[], oscillator: number[], indicatorName: string): DivergenceResult[] {
  const results: DivergenceResult[] = [];
  const lookback = 60; // Max bars to look back for a pivot
  const minSwing = 5;  // Min bars between pivots

  if (data.length < lookback || oscillator.length !== data.length) return results;

  // We only scan the recent history (last 10 candles) to see if a brand new divergence just formed
  const currentIdx = data.length - 1;

  // Helper to find swing highs/lows in a window
  const findPivots = (start: number, end: number) => {
    const highs: number[] = [];
    const lows: number[] = [];
    for (let i = start + 2; i <= end - 2; i++) {
       const isHigh = data[i].high > data[i-1].high && data[i].high > data[i-2].high && 
                      data[i].high > data[i+1].high && data[i].high > data[i+2].high;
       const isLow = data[i].low < data[i-1].low && data[i].low < data[i-2].low && 
                     data[i].low < data[i+1].low && data[i].low < data[i+2].low;
       if (isHigh && !isNaN(oscillator[i])) highs.push(i);
       if (isLow && !isNaN(oscillator[i])) lows.push(i);
    }
    return { highs, lows };
  };

  const { highs, lows } = findPivots(currentIdx - lookback, currentIdx);

  // Check Bullish Divergences (Compare Lows)
  if (lows.length >= 2) {
    const latestLow = lows[lows.length - 1];
    for (let i = lows.length - 2; i >= 0; i--) {
      const prevLow = lows[i];
      if (latestLow - prevLow < minSwing) continue;

      const p1 = data[prevLow].low;
      const p2 = data[latestLow].low;
      const o1 = oscillator[prevLow];
      const o2 = oscillator[latestLow];

      // Regular Bullish: Price Lower Low, Oscillator Higher Low
      if (p2 < p1 && o2 > o1) {
        results.push({ type: "REGULAR_BULLISH", indicator: indicatorName, priceStartIdx: prevLow, priceEndIdx: latestLow, confidence: 80 });
        break; // Only take the most recent clear one
      }
      
      // Hidden Bullish: Price Higher Low, Oscillator Lower Low (In an uptrend)
      if (p2 > p1 && o2 < o1) {
        results.push({ type: "HIDDEN_BULLISH", indicator: indicatorName, priceStartIdx: prevLow, priceEndIdx: latestLow, confidence: 70 });
        break;
      }
    }
  }

  // Check Bearish Divergences (Compare Highs)
  if (highs.length >= 2) {
    const latestHigh = highs[highs.length - 1];
    for (let i = highs.length - 2; i >= 0; i--) {
      const prevHigh = highs[i];
      if (latestHigh - prevHigh < minSwing) continue;

      const p1 = data[prevHigh].high;
      const p2 = data[latestHigh].high;
      const o1 = oscillator[prevHigh];
      const o2 = oscillator[latestHigh];

      // Regular Bearish: Price Higher High, Oscillator Lower High
      if (p2 > p1 && o2 < o1) {
        results.push({ type: "REGULAR_BEARISH", indicator: indicatorName, priceStartIdx: prevHigh, priceEndIdx: latestHigh, confidence: 80 });
        break;
      }
      
      // Hidden Bearish: Price Lower High, Oscillator Higher High (In a downtrend)
      if (p2 < p1 && o2 > o1) {
        results.push({ type: "HIDDEN_BEARISH", indicator: indicatorName, priceStartIdx: prevHigh, priceEndIdx: latestHigh, confidence: 70 });
        break;
      }
    }
  }

  return results;
}
