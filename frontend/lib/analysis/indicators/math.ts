/**
 * Phase 21: Advanced Technical Indicator Math Engine
 *
 * Provides vectorized / array-based calculation functions for standard technical indicators.
 * Optimized for performance across large OHLCV datasets.
 */

import type { OHLCV } from "../engine";

// ─── TREND INDICATORS ─────────────────────────────────────────────────────────

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
      result[i] = sum / period;
    } else if (i === period - 1) {
      result[i] = sum / period;
    }
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return result;

  const k = 2 / (period + 1);
  // Start EMA with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    result[i] = (data[i] * k) + (result[i - 1] * (1 - k));
  }
  return result;
}

export function calculateWMA(data: number[], period: number): number[] {
  const result: number[] = new Array(data.length).fill(NaN);
  const weightSum = (period * (period + 1)) / 2;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j] * (period - j);
    }
    result[i] = sum / weightSum;
  }
  return result;
}

export function calculateADX(data: OHLCV[], period: number = 14) {
  const resultADX = new Array(data.length).fill(NaN);
  const resultPlusDI = new Array(data.length).fill(NaN);
  const resultMinusDI = new Array(data.length).fill(NaN);

  if (data.length < period + 1) return { adx: resultADX, plusDI: resultPlusDI, minusDI: resultMinusDI };

  let trueRange = 0;
  let plusDM = 0;
  let minusDM = 0;
  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    
    let pDM = 0;
    let mDM = 0;
    if (upMove > downMove && upMove > 0) pDM = upMove;
    if (downMove > upMove && downMove > 0) mDM = downMove;

    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );

    if (i < period + 1) {
      trSmooth += tr;
      plusDMSmooth += pDM;
      minusDMSmooth += mDM;
      continue;
    } else if (i === period + 1) {
      // First value
      resultPlusDI[i] = 100 * (plusDMSmooth / trSmooth);
      resultMinusDI[i] = 100 * (minusDMSmooth / trSmooth);
    } else {
      trSmooth = trSmooth - (trSmooth / period) + tr;
      plusDMSmooth = plusDMSmooth - (plusDMSmooth / period) + pDM;
      minusDMSmooth = minusDMSmooth - (minusDMSmooth / period) + mDM;
      resultPlusDI[i] = 100 * (plusDMSmooth / trSmooth);
      resultMinusDI[i] = 100 * (minusDMSmooth / trSmooth);
    }
  }

  let dxSum = 0;
  for (let i = period + 1; i < data.length; i++) {
    const dx = 100 * (Math.abs(resultPlusDI[i] - resultMinusDI[i]) / (resultPlusDI[i] + resultMinusDI[i] || 1));
    if (i < 2 * period) {
      dxSum += dx;
    } else if (i === 2 * period) {
      resultADX[i] = (dxSum + dx) / period;
    } else {
      resultADX[i] = ((resultADX[i - 1] * (period - 1)) + dx) / period;
    }
  }

  return { adx: resultADX, plusDI: resultPlusDI, minusDI: resultMinusDI };
}


// ─── MOMENTUM INDICATORS ──────────────────────────────────────────────────────

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return rsi;

  let sumGain = 0;
  let sumLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) sumGain += diff;
    else sumLoss += Math.abs(diff);
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  rsi[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 1e-10))));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rsi[i] = 100 - (100 / (1 + (avgGain / (avgLoss || 1e-10))));
  }
  return rsi;
}

export function calculateMACD(data: number[], shortP = 12, longP = 26, sigP = 9) {
  const shortEma = calculateEMA(data, shortP);
  const longEma = calculateEMA(data, longP);
  
  const macdLine = new Array(data.length).fill(NaN);
  for (let i = longP - 1; i < data.length; i++) {
    macdLine[i] = shortEma[i] - longEma[i];
  }
  
  // Clean NaNs for EMA calculation
  const validMacd = macdLine.slice(longP - 1);
  const sigEma = calculateEMA(validMacd, sigP);
  
  const signalLine = new Array(data.length).fill(NaN);
  const histogram = new Array(data.length).fill(NaN);
  
  for (let i = 0; i < sigEma.length; i++) {
    const absIdx = i + longP - 1;
    signalLine[absIdx] = sigEma[i];
    histogram[absIdx] = macdLine[absIdx] - signalLine[absIdx];
  }

  return { macd: macdLine, signal: signalLine, hist: histogram };
}

export function calculateStochastic(data: OHLCV[], period = 14, smoothK = 3, smoothD = 3) {
  const kLine = new Array(data.length).fill(NaN);
  
  for (let i = period - 1; i < data.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < period; j++) {
      if (data[i - j].high > highest) highest = data[i - j].high;
      if (data[i - j].low < lowest) lowest = data[i - j].low;
    }
    const current = data[i].close;
    kLine[i] = ((current - lowest) / (highest - lowest || 1)) * 100;
  }

  const validK = kLine.slice(period - 1);
  const smoothKLineRaw = calculateSMA(validK, smoothK);
  
  const smoothKLine = new Array(data.length).fill(NaN);
  for (let i = 0; i < smoothKLineRaw.length; i++) smoothKLine[i + period - 1] = smoothKLineRaw[i];
  
  const validSmoothK = smoothKLine.slice(period - 1 + smoothK - 1);
  const smoothDLineRaw = calculateSMA(validSmoothK, smoothD);
  
  const smoothDLine = new Array(data.length).fill(NaN);
  for (let i = 0; i < smoothDLineRaw.length; i++) smoothDLine[i + period - 1 + smoothK - 1] = smoothDLineRaw[i];

  return { k: smoothKLine, d: smoothDLine };
}


// ─── VOLATILITY INDICATORS ────────────────────────────────────────────────────

export function calculateATR(data: OHLCV[], period: number = 14): number[] {
  const atr: number[] = new Array(data.length).fill(NaN);
  if (data.length < period) return atr;

  let trSum = 0;
  const trs = new Array(data.length);
  trs[0] = data[0].high - data[0].low;

  for (let i = 1; i < data.length; i++) {
    trs[i] = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
  }

  for (let i = 0; i < period; i++) trSum += trs[i];
  atr[period - 1] = trSum / period;

  for (let i = period; i < data.length; i++) {
    atr[i] = ((atr[i - 1] * (period - 1)) + trs[i]) / period;
  }
  return atr;
}

export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  const sma = calculateSMA(data, period);
  const upper = new Array(data.length).fill(NaN);
  const lower = new Array(data.length).fill(NaN);

  for (let i = period - 1; i < data.length; i++) {
    let sumSq = 0;
    for (let j = 0; j < period; j++) {
      sumSq += Math.pow(data[i - j] - sma[i], 2);
    }
    const stdDev = Math.sqrt(sumSq / period);
    upper[i] = sma[i] + (multiplier * stdDev);
    lower[i] = sma[i] - (multiplier * stdDev);
  }
  return { middle: sma, upper, lower };
}
