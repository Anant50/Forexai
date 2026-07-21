/**
 * Phase 22: Risk Management Math Engine
 *
 * Provides pure functions for position sizing, pip value conversion, and Risk/Reward calculations.
 * Ensures zero automatic execution, serving entirely as a mathematical oracle for users.
 */

export interface RiskProfile {
  accountBalance: number;
  baseCurrency: string;
  riskPercent: number;
  minRR: number;
}

export interface TradeSetupCalculations {
  maxMonetaryRisk: number;
  pipDistanceSL: number;
  pipDistanceTP1: number;
  pipValuePerLot: number;
  positionSizeLots: number;
  potentialLoss: number;
  potentialReward: number;
  rrRatio: number;
}

/**
 * Normalizes pairs to extract correctly sized pip distances.
 * JPY pairs pips are at the 0.01 decimal, while EUR/USD pips are at 0.0001.
 */
export function getPipMultiplier(pair: string): number {
  return pair.includes("JPY") ? 100 : 10000;
}

/**
 * Calculates raw pip distance between two price points.
 */
export function calculatePipDistance(pair: string, priceA: number, priceB: number): number {
  return Math.abs(priceA - priceB) * getPipMultiplier(pair);
}

/**
 * Estimates the Pip Value in the Base Currency per Standard Lot (100,000 units).
 * This is an approximation formula for the platform (requires live cross-rates for exact precision).
 */
export function estimatePipValue(pair: string, accountCurrency: string, currentRate: number): number {
  const isJpy = pair.includes("JPY");
  // A standard lot involves 100,000 units of the base currency.
  // Generally, pip value = (Pip_in_decimal / CurrentRate) * 100000 
  // However, if the account currency is the quote currency (e.g. trading EUR/USD with a USD account)
  // Pip value is flat $10/pip.
  
  if (pair.endsWith(accountCurrency)) {
    return isJpy ? 1000 : 10;
  }
  
  // Approximation if quote currency differs (e.g., EUR/GBP with USD account).
  // Ideally requires live conversion. We use a flat estimate here since live cross-rates are unavailable offline.
  return isJpy ? 10 / currentRate : 10 * currentRate; 
}

/**
 * The core mathematically strict position sizing formula.
 */
export function calculatePositionSize(
  profile: RiskProfile,
  pair: string,
  entry: number,
  stopLoss: number,
  takeProfit: number
): TradeSetupCalculations {
  
  const pipMultiplier = getPipMultiplier(pair);
  const pipDistanceSL = calculatePipDistance(pair, entry, stopLoss);
  const pipDistanceTP1 = calculatePipDistance(pair, entry, takeProfit);
  
  // 1. Max allowed monetary risk
  const maxMonetaryRisk = profile.accountBalance * (profile.riskPercent / 100);
  
  // 2. Pip Value Estimation (Approximated to standard Account Currency equivalence)
  const pipValuePerLot = estimatePipValue(pair, profile.baseCurrency, entry);
  
  // 3. Position Size in standard Lots
  // Loss$ = PipDistance * PipValue * Lots
  // Lots = Loss$ / (PipDistance * PipValue)
  let positionSizeLots = 0;
  if (pipDistanceSL > 0 && pipValuePerLot > 0) {
    positionSizeLots = maxMonetaryRisk / (pipDistanceSL * pipValuePerLot);
  }
  
  // Round to nearest micro lot (0.01)
  positionSizeLots = Math.floor(positionSizeLots * 100) / 100;
  
  // 4. Exact monetary geometries
  const potentialLoss = positionSizeLots * pipDistanceSL * pipValuePerLot;
  const potentialReward = positionSizeLots * pipDistanceTP1 * pipValuePerLot;
  const rrRatio = potentialLoss > 0 ? potentialReward / potentialLoss : 0;
  
  return {
    maxMonetaryRisk,
    pipDistanceSL: Math.round(pipDistanceSL * 10) / 10,
    pipDistanceTP1: Math.round(pipDistanceTP1 * 10) / 10,
    pipValuePerLot,
    positionSizeLots,
    potentialLoss,
    potentialReward,
    rrRatio: Math.round(rrRatio * 100) / 100
  };
}
