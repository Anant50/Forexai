/**
 * ForexAI Pro — Phase 20: Calibration Tracker
 *
 * Tracks the accuracy of the AI engine's predictions over time.
 * Stores records in localStorage for a fully client-side demonstration.
 * In production this would write to PostgreSQL.
 *
 * Implements Brier Score as the primary calibration metric.
 * Brier Score (BS) = (1/N) * sum((predicted_prob - actual_outcome)^2)
 * A perfect score is 0.0. A useless score is 1.0.
 */

export interface CalibrationRecord {
  id: string;
  pair: string;
  timeframe: string;
  predictedAction: "BUY" | "SELL" | "WAIT";
  predictedProbability: number;   // 0–1 (e.g. 0.72)
  masterScore: number;            // 0–100
  modelVersion: string;
  timestamp: number;
  outcome: "WIN" | "LOSS" | "PENDING";
  brierContribution: number;      // 0–1 (lower is better)
}

export interface CalibrationStats {
  totalRecords: number;
  resolvedRecords: number;
  overallBrierScore: number;         // Lower is better
  winRate: number;                   // Percentage
  calibrationStatus: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  byConfidenceBucket: ConfidenceBucket[];
}

export interface ConfidenceBucket {
  label: string;            // e.g. "70–80% Confidence"
  predicted: number;        // midpoint, e.g. 0.75
  actualWinRate: number;    // Observed win rate in that bucket
  count: number;
  calibrationError: number; // abs(predicted - actualWinRate)
}

const STORAGE_KEY = "forexai_calibration_records";
const MODEL_VERSION = "20.0.0";

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────

function loadRecords(): CalibrationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecords(records: CalibrationRecord[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function recordPrediction(
  pair: string,
  timeframe: string,
  action: "BUY" | "SELL" | "WAIT",
  probability: number,  // 0–1
  masterScore: number
): string {
  const records = loadRecords();
  const id = `cal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: CalibrationRecord = {
    id, pair, timeframe,
    predictedAction: action,
    predictedProbability: probability,
    masterScore,
    modelVersion: MODEL_VERSION,
    timestamp: Date.now(),
    outcome: "PENDING",
    brierContribution: 0,
  };
  records.push(record);
  saveRecords(records);
  return id;
}

export function resolveOutcome(id: string, outcome: "WIN" | "LOSS"): void {
  const records = loadRecords();
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  const actual = outcome === "WIN" ? 1 : 0;
  rec.outcome = outcome;
  rec.brierContribution = Math.pow(rec.predictedProbability - actual, 2);
  saveRecords(records);
}

export function getCalibrationStats(): CalibrationStats {
  const records = loadRecords();
  const resolved = records.filter(r => r.outcome !== "PENDING");

  const totalRecords    = records.length;
  const resolvedRecords = resolved.length;

  const brierScore = resolvedRecords > 0
    ? resolved.reduce((sum, r) => sum + r.brierContribution, 0) / resolvedRecords
    : 0;

  const wins    = resolved.filter(r => r.outcome === "WIN").length;
  const winRate = resolvedRecords > 0 ? Math.round((wins / resolvedRecords) * 100) : 0;

  const calibrationStatus: CalibrationStats["calibrationStatus"] =
    brierScore <= 0.10 ? "EXCELLENT" :
    brierScore <= 0.20 ? "GOOD" :
    brierScore <= 0.33 ? "FAIR" : "POOR";

  // Build confidence buckets
  const buckets = [
    { min: 0.5,  max: 0.6,  label: "50–60%" },
    { min: 0.6,  max: 0.7,  label: "60–70%" },
    { min: 0.7,  max: 0.8,  label: "70–80%" },
    { min: 0.8,  max: 0.9,  label: "80–90%" },
    { min: 0.9,  max: 1.01, label: "90–100%" },
  ];

  const byConfidenceBucket: ConfidenceBucket[] = buckets.map(b => {
    const inBucket = resolved.filter(r => r.predictedProbability >= b.min && r.predictedProbability < b.max);
    const wins = inBucket.filter(r => r.outcome === "WIN").length;
    const actualWinRate = inBucket.length > 0 ? wins / inBucket.length : 0;
    const midpoint = (b.min + b.max) / 2;
    return {
      label: `${b.label} Confidence`,
      predicted: midpoint,
      actualWinRate,
      count: inBucket.length,
      calibrationError: Math.abs(midpoint - actualWinRate),
    };
  }).filter(b => b.count > 0);

  return {
    totalRecords,
    resolvedRecords,
    overallBrierScore: Math.round(brierScore * 1000) / 1000,
    winRate,
    calibrationStatus,
    byConfidenceBucket,
  };
}

export function getAllRecords(): CalibrationRecord[] {
  return loadRecords().sort((a, b) => b.timestamp - a.timestamp);
}

export function clearHistory(): void {
  saveRecords([]);
}
