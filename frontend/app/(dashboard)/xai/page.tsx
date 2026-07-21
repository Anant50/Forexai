"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, Loader2, Radar, CheckCircle2, AlertTriangle,
  XCircle, Info, ChevronDown, ChevronRight, Shield, Clock,
  TrendingUp, TrendingDown, Minus, BarChart3, Target, Zap,
  Activity, ShieldCheck
} from "lucide-react";
import { executeMasterDecision, type DecisionResult } from "@/lib/analysis/decisionEngine";
import { generateXAIReport, type XAIReport, type ExplanationLevel } from "@/lib/analysis/xai";
import { getCalibrationStats, recordPrediction, getAllRecords, clearHistory, type CalibrationStats } from "@/lib/analysis/calibration";
import type { OHLCV } from "@/lib/analysis/engine";

// ─── Reusable card ────────────────────────────────────────────────────────────
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-bg-surface border border-border-subtle rounded-2xl p-5 ${className}`}>{children}</div>
);

const SectionTitle = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted mb-5 flex items-center gap-2">
    <Icon size={13} className="text-primary-400" /> {label}
  </h3>
);

// ─── Signal Pill ─────────────────────────────────────────────────────────────
const SignalPill = ({ impact, label }: { impact: string; label: string }) => {
  const colors = {
    POSITIVE: "bg-bullish/10 border-bullish/30 text-bullish",
    NEGATIVE: "bg-bearish/10 border-bearish/30 text-bearish",
    NEUTRAL:  "bg-neutral-500/10 border-neutral-500/30 text-text-muted",
  }[impact] ?? "bg-bg-card border-border-default text-white";
  const Icon = impact === "POSITIVE" ? CheckCircle2 : impact === "NEGATIVE" ? XCircle : Minus;
  return (
    <div className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-[11px] font-medium leading-snug ${colors}`}>
      <Icon size={12} className="mt-0.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
};

// ─── Timeline Step ────────────────────────────────────────────────────────────
const TimelineStep = ({ step, open, onToggle }: { step: any; open: boolean; onToggle: () => void }) => {
  const colors = { complete: "bg-bullish text-white", warning: "bg-bearish text-white", info: "bg-text-muted/30 text-text-muted" };
  const Icons  = { complete: CheckCircle2, warning: AlertTriangle, info: Info };
  const Icon   = Icons[step.status as keyof typeof Icons];
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${colors[step.status as keyof typeof colors]}`}>{step.step}</div>
        <div className="w-0.5 bg-border-subtle flex-1 mt-1" />
      </div>
      <div className="pb-5 flex-1">
        <button onClick={onToggle} className="w-full flex items-center justify-between gap-2 text-left">
          <div className="flex items-center gap-2">
            <Icon size={13} className={step.status === "complete" ? "text-bullish" : step.status === "warning" ? "text-bearish" : "text-text-muted"} />
            <span className="text-xs font-bold text-white">{step.title}</span>
          </div>
          {step.subPoints ? (open ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />) : null}
        </button>
        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{step.description}</p>
        {open && step.subPoints && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} className="overflow-hidden mt-2 space-y-1">
            {step.subPoints.map((p: string, i: number) => (
              <li key={i} className="text-[10px] text-text-muted font-mono pl-2 border-l border-primary-500/30">• {p}</li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function XAIDashboard() {
  const [status, setStatus]         = useState<"idle" | "loading" | "done">("idle");
  const [pair, setPair]             = useState("EUR/USD");
  const [timeframe, setTimeframe]   = useState("1h");
  const [decisionResult, setDecision] = useState<DecisionResult | null>(null);
  const [report, setReport]         = useState<XAIReport | null>(null);
  const [nlpLevel, setNlpLevel]     = useState<ExplanationLevel>("simple");
  const [openSteps, setOpenSteps]   = useState<Record<number, boolean>>({});
  const [calibStats, setCalibStats] = useState<CalibrationStats | null>(null);
  const [activeTab, setActiveTab]   = useState<"xai" | "calibration" | "history">("xai");

  const handleAnalyze = async () => {
    setStatus("loading");
    setActiveTab("xai");
    try {
      const symbol = pair.replace("/", "") + "T";
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=500`);
      const raw = await res.json();
      const data: OHLCV[] = raw.map((d: any) => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]), high: parseFloat(d[2]),
        low: parseFloat(d[3]),  close: parseFloat(d[4])
      }));
      await new Promise(r => setTimeout(r, 1000));
      const decision = executeMasterDecision(pair, timeframe, data);
      const xai      = generateXAIReport(decision);
      setDecision(decision);
      setReport(xai);
      // Log to calibration
      if (decision.signal.action !== "WAIT") {
        recordPrediction(pair, timeframe, decision.signal.action, decision.probabilities.bullish / 100, decision.masterScore);
      }
      setCalibStats(getCalibrationStats());
      setStatus("done");
    } catch {
      setStatus("done");
    }
  };

  const toggleStep = (n: number) => setOpenSteps(prev => ({ ...prev, [n]: !prev[n] }));

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full min-h-full pb-10">

      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 relative bg-bg-surface border border-border-subtle rounded-3xl p-6 shadow-xl overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent-violet/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="z-10">
          <div className="flex items-center gap-2 text-accent-violet text-[10px] font-black uppercase tracking-widest mb-2">
            <Shield size={12} /> Explainable AI  ·  Phase 20
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <BrainCircuit size={32} className="text-accent-violet" />
            XAI Confidence Analytics
          </h1>
          <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
            Complete transparency into every AI decision — signal agreement, conflict detection, reasoning timeline, invalidation rules, and live calibration scoring.
          </p>
        </div>
        <div className="z-10 flex flex-col gap-3 bg-bg-card border border-border-default p-4 rounded-xl shrink-0 w-full lg:w-auto">
          <div className="flex gap-3">
            <select className="bg-bg-surface border border-border-strong text-white text-sm font-bold rounded-lg px-3 py-2 outline-none" value={pair} onChange={e => setPair(e.target.value)}>
              <option value="EUR/USD">EUR/USD</option>
              <option value="GBP/USD">GBP/USD</option>
              <option value="BTC/USDT">BTC/USDT</option>
            </select>
            <select className="bg-bg-surface border border-border-strong text-white text-sm font-bold rounded-lg px-3 py-2 outline-none" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
              <option value="15m">15m</option>
              <option value="1h">1H</option>
              <option value="4h">4H</option>
            </select>
          </div>
          <button onClick={handleAnalyze} disabled={status === "loading"} className="w-full bg-gradient-to-r from-accent-violet to-primary-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg">
            {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
            RUN XAI ANALYSIS
          </button>
        </div>
      </div>

      {/* ── Empty / Loading ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 text-text-muted">
            <Shield size={64} className="mb-4 opacity-20" />
            <p className="uppercase tracking-widest text-sm font-bold">Explainable AI System Ready</p>
            <p className="text-xs mt-2 opacity-60">Run an analysis to see the complete XAI breakdown</p>
          </motion.div>
        )}

        {status === "loading" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 text-accent-violet">
            <Loader2 size={56} className="animate-spin mb-4 opacity-50" />
            <p className="uppercase tracking-widest text-sm font-bold animate-pulse">Generating XAI Transparency Report…</p>
          </motion.div>
        )}

        {status === "done" && report && decisionResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">

            {/* Tab Bar */}
            <div className="flex gap-1 bg-bg-surface border border-border-subtle rounded-xl p-1">
              {(["xai", "calibration", "history"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${activeTab === t ? "bg-accent-violet text-white shadow" : "text-text-muted hover:text-white"}`}>
                  {t === "xai" ? "📊 XAI Report" : t === "calibration" ? "⚖️ Calibration" : "📋 History"}
                </button>
              ))}
            </div>

            {/* ── XAI TAB ──────────────────────────────────────────────────── */}
            {activeTab === "xai" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                <div className="flex flex-col gap-6">

                  {/* Analysis Summary */}
                  <Card>
                    <SectionTitle icon={Target} label="Analysis Summary" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { l: "Primary Outlook", v: decisionResult.masterBias, hi: true },
                        { l: "Bullish Probability", v: `${decisionResult.probabilities.bullish}%`, hi: false },
                        { l: "Master Confidence", v: `${decisionResult.masterScore} / 100`, hi: false },
                        { l: "Signal Quality", v: report.signalQuality, hi: false },
                      ].map(row => (
                        <div key={row.l} className="bg-bg-card border border-border-default rounded-xl p-3">
                          <p className="text-[9px] uppercase font-bold tracking-widest text-text-muted mb-1">{row.l}</p>
                          <p className={`text-sm font-black ${row.hi ? (decisionResult.masterBias.includes("BULL") ? "text-bullish" : decisionResult.masterBias.includes("BEAR") ? "text-bearish" : "text-text-secondary") : "text-white"}`}>{row.v}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Natural Language Explanation */}
                  <Card>
                    <SectionTitle icon={Info} label="Natural Language Explanation" />
                    <div className="flex gap-2 mb-4">
                      {(["simple", "detailed", "expert"] as ExplanationLevel[]).map(l => (
                        <button key={l} onClick={() => setNlpLevel(l)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition capitalize ${nlpLevel === l ? "bg-accent-violet text-white" : "bg-bg-card text-text-muted border border-border-default hover:text-white"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="bg-bg-elevated border border-border-default rounded-xl p-4 text-[12px] text-text-secondary leading-7 font-medium border-l-4 border-l-accent-violet">
                      {nlpLevel === "simple" ? report.simpleExplanation : nlpLevel === "detailed" ? report.detailedExplanation : report.expertExplanation}
                    </div>
                  </Card>

                  {/* Signal Agreement / Conflict */}
                  <Card>
                    <SectionTitle icon={Activity} label="Signal Agreement Matrix" />
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-bullish/5 border border-bullish/20 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Agreement</p>
                        <p className="text-2xl font-black text-bullish">{report.agreementScore}<span className="text-sm">%</span></p>
                      </div>
                      <div className="bg-bearish/5 border border-bearish/20 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">Conflict</p>
                        <p className="text-2xl font-black text-bearish">{report.conflictScore}<span className="text-sm">%</span></p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-bullish mb-2">✓ Supporting Signals</p>
                        <div className="space-y-2">
                          {[...report.bullishSignals, ...report.bearishSignals.filter(s => s.impact !== "NEGATIVE")].slice(0, 4).map((s, i) => <SignalPill key={i} impact={s.impact} label={s.label} />)}
                          {report.bullishSignals.length === 0 && report.bearishSignals.length === 0 && <p className="text-xs text-text-muted">No strongly aligned signals.</p>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-bearish mb-2">⚠ Conflicting Signals</p>
                        <div className="space-y-2">
                          {report.conflictingSignals.slice(0, 4).map((s, i) => <SignalPill key={i} impact="NEUTRAL" label={s.label} />)}
                          {report.conflictingSignals.length === 0 && <p className="text-xs text-text-muted">No engine conflicts detected.</p>}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Scenario Probability Explanation */}
                  <Card>
                    <SectionTitle icon={BarChart3} label="Scenario Probability Explanation" />
                    <div className="space-y-4">
                      {report.scenarioExplanations.map((sc, i) => (
                        <div key={i} className={`rounded-xl border p-4 ${sc.color === "bullish" ? "border-bullish/20 bg-bullish/5" : sc.color === "bearish" ? "border-bearish/20 bg-bearish/5" : "border-border-default bg-bg-card"}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {sc.color === "bullish" ? <TrendingUp size={14} className="text-bullish" /> : sc.color === "bearish" ? <TrendingDown size={14} className="text-bearish" /> : <Minus size={14} className="text-text-muted" />}
                              <span className={`text-sm font-black ${sc.color === "bullish" ? "text-bullish" : sc.color === "bearish" ? "text-bearish" : "text-white"}`}>{sc.scenario}</span>
                            </div>
                            <span className="text-2xl font-black text-white">{sc.probability}<span className="text-sm text-text-muted">%</span></span>
                          </div>
                          <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-3">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${sc.probability}%` }}
                              className={`h-full rounded-full ${sc.color === "bullish" ? "bg-bullish" : sc.color === "bearish" ? "bg-bearish" : "bg-text-muted"}`} />
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div>
                              <p className="font-bold text-bullish mb-1">Supporting</p>
                              {sc.supporting.map((s, j) => <p key={j} className="text-text-muted leading-relaxed mb-1">• {s}</p>)}
                            </div>
                            <div>
                              <p className="font-bold text-bearish mb-1">Risk Factors</p>
                              {sc.risks.map((r, j) => <p key={j} className="text-text-muted leading-relaxed mb-1">• {r}</p>)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                </div>

                {/* ── Right Column ─────────────────────────────────────────── */}
                <div className="flex flex-col gap-6">

                  {/* Confidence Breakdown */}
                  <Card>
                    <SectionTitle icon={Zap} label="Confidence Breakdown" />
                    <div className="space-y-4">
                      {report.confidenceBreakdown.map((c, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-white">{c.component}</span>
                            <span className={`text-[11px] font-black font-mono ${c.direction === "POSITIVE" ? "text-bullish" : c.direction === "NEGATIVE" ? "text-bearish" : "text-text-muted"}`}>{c.score}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${c.score}%` }}
                              className={`h-full rounded-full ${c.direction === "POSITIVE" ? "bg-bullish" : c.direction === "NEGATIVE" ? "bg-bearish" : "bg-text-muted/40"}`} />
                          </div>
                          <p className="text-[9px] text-text-muted mt-1">{c.note}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Risk & Invalidation */}
                  <Card>
                    <SectionTitle icon={AlertTriangle} label="Risk & Invalidation Rules" />
                    <div className="space-y-2 mb-4">
                      {report.primaryRiskFactors.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 bg-bearish/5 border border-bearish/20 rounded-lg px-3 py-2">
                          <AlertTriangle size={11} className="text-bearish mt-0.5 shrink-0" />
                          <p className="text-[11px] text-text-muted">{r}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Invalidation Conditions</p>
                    <div className="space-y-2">
                      {report.invalidationRules.map((rule, i) => (
                        <div key={i} className={`rounded-lg border px-3 py-2 ${rule.severity === "CRITICAL" ? "border-bearish/40 bg-bearish/5" : rule.severity === "HIGH" ? "border-yellow-500/30 bg-yellow-500/5" : "border-border-default bg-bg-card"}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${rule.severity === "CRITICAL" ? "bg-bearish/20 text-bearish" : rule.severity === "HIGH" ? "bg-yellow-500/20 text-yellow-400" : "bg-bg-elevated text-text-muted"}`}>{rule.severity}</span>
                          </div>
                          <p className="text-[11px] text-white font-medium">{rule.condition}</p>
                          <p className="text-[10px] text-text-muted mt-1">→ {rule.effect}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Reasoning Timeline */}
                  <Card>
                    <SectionTitle icon={Clock} label="AI Reasoning Timeline" />
                    <div>
                      {report.reasoningTimeline.map((step, i) => (
                        <TimelineStep key={i} step={step} open={!!openSteps[step.step]} onToggle={() => toggleStep(step.step)} />
                      ))}
                    </div>
                  </Card>

                </div>
              </div>
            )}

            {/* ── CALIBRATION TAB ──────────────────────────────────────────── */}
            {activeTab === "calibration" && calibStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { l: "Total Analyses", v: calibStats.totalRecords.toString(), sub: "All time" },
                  { l: "Win Rate", v: `${calibStats.winRate}%`, sub: "Resolved predictions" },
                  { l: "Brier Score", v: calibStats.overallBrierScore.toFixed(3), sub: "Lower = better (0 perfect)" },
                  { l: "Calibration Status", v: calibStats.calibrationStatus, sub: "Model quality grade" },
                ].map(s => (
                  <Card key={s.l}>
                    <p className="text-[9px] uppercase font-black tracking-widest text-text-muted mb-1">{s.l}</p>
                    <p className="text-2xl font-black text-white">{s.v}</p>
                    <p className="text-[10px] text-text-muted mt-1">{s.sub}</p>
                  </Card>
                ))}
                {calibStats.byConfidenceBucket.length > 0 ? (
                  <div className="col-span-full">
                    <Card>
                      <SectionTitle icon={BarChart3} label="Confidence Calibration Buckets" />
                      <div className="space-y-4">
                        {calibStats.byConfidenceBucket.map((b, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-white">{b.label}</span>
                              <span className="text-text-muted font-mono">{b.count} analyses · Predicted {(b.predicted * 100).toFixed(0)}% → Actual {(b.actualWinRate * 100).toFixed(0)}% · Error {(b.calibrationError * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-bg-card rounded-full overflow-hidden relative">
                              <div className="absolute top-0 left-0 h-full bg-text-muted/20 rounded-full" style={{ width: `${b.predicted * 100}%` }} />
                              <motion.div initial={{ width: 0 }} animate={{ width: `${b.actualWinRate * 100}%` }} className={`h-full rounded-full ${b.calibrationError < 0.1 ? "bg-bullish" : b.calibrationError < 0.2 ? "bg-yellow-500" : "bg-bearish"}`} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="col-span-full">
                    <Card className="py-10 text-center">
                      <ShieldCheck size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                      <p className="text-sm text-text-muted">Run more analyses to build calibration data.</p>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end">
                  <button onClick={() => { clearHistory(); setCalibStats(getCalibrationStats()); }} className="text-[10px] text-bearish hover:text-bearish/80 border border-bearish/30 px-3 py-1.5 rounded-lg transition">
                    Clear All History
                  </button>
                </div>
                {getAllRecords().length === 0 ? (
                  <Card className="py-10 text-center">
                    <Clock size={32} className="mx-auto mb-3 text-text-muted opacity-30" />
                    <p className="text-sm text-text-muted">No analysis history yet.</p>
                  </Card>
                ) : (
                  getAllRecords().map(rec => (
                    <Card key={rec.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${rec.predictedAction === "BUY" ? "bg-bullish/10 text-bullish" : rec.predictedAction === "SELL" ? "bg-bearish/10 text-bearish" : "bg-bg-elevated text-text-muted"}`}>
                          {rec.predictedAction === "BUY" ? "B" : rec.predictedAction === "SELL" ? "S" : "W"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{rec.pair} · {rec.timeframe}</p>
                          <p className="text-[10px] text-text-muted">{new Date(rec.timestamp).toLocaleString()} · Score {rec.masterScore}/100</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${rec.outcome === "WIN" ? "border-bullish/30 text-bullish bg-bullish/5" : rec.outcome === "LOSS" ? "border-bearish/30 text-bearish bg-bearish/5" : "border-border-default text-text-muted bg-bg-card"}`}>
                          {rec.outcome}
                        </span>
                        <p className="text-[9px] text-text-muted mt-1">Predicted: {(rec.predictedProbability * 100).toFixed(0)}%</p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
