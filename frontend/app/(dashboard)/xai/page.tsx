"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue } from "framer-motion";
import {
  BrainCircuit, Loader2, Radar, CheckCircle2, AlertTriangle,
  XCircle, Info, ChevronDown, ChevronRight, Shield, Clock,
  TrendingUp, TrendingDown, Minus, BarChart3, Target, Zap,
  Activity, ShieldCheck, FlaskConical, Sparkles, Eye, Globe, TriangleAlert
} from "lucide-react";
import { executeMasterDecision, type DecisionResult } from "@/lib/analysis/decisionEngine";
import { generateXAIReport, type XAIReport, type ExplanationLevel } from "@/lib/analysis/xai";
import { getCalibrationStats, recordPrediction, getAllRecords, clearHistory, type CalibrationStats } from "@/lib/analysis/calibration";
import type { OHLCV } from "@/lib/analysis/engine";

// ─── Animated Radial Gauge ──────────────────────────────────────────────────
function RadialGauge({ value, max = 100, size = 140, label, color = "#6366f1" }: {
  value: number; max?: number; size?: number; label: string; color?: string;
}) {
  const pct = value / max;
  const r = (size / 2) - 12;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 200);
    return () => clearTimeout(t);
  }, [value]);

  const animPct = animated / max;
  const animDash = circ * animPct;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          {/* Value arc */}
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - animDash }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-2xl font-black text-white leading-none"
          >
            {animated}
          </motion.span>
          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">/{max}</span>
        </div>
      </div>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest text-center">{label}</p>
    </div>
  );
}

// ─── Animated Probability Bar ────────────────────────────────────────────────
function ProbabilityBar({ label, value, color, icon: Icon, delay = 0 }: {
  label: string; value: number; color: string; icon: any; delay?: number;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={13} className={color} />
          <span className="text-xs font-bold text-white">{label}</span>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.8 }}
          className={`text-sm font-black ${color}`}
        >{value}%</motion.span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.0, delay, ease: "easeOut" }}
          className="h-full rounded-full relative overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${value > 50 ? '#22c55e' : value > 30 ? '#eab308' : '#ef4444'}88, ${value > 50 ? '#22c55e' : value > 30 ? '#eab308' : '#ef4444'})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
        </motion.div>
        {/* Glow pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ delay: delay + 1.0, duration: 2, repeat: Infinity }}
          className="absolute top-0 h-full rounded-full"
          style={{ width: `${value}%`, background: value > 50 ? '#22c55e30' : value > 30 ? '#eab30830' : '#ef444430', filter: 'blur(6px)' }}
        />
      </div>
    </div>
  );
}

// ─── Signal Card ─────────────────────────────────────────────────────────────
function SignalCard({ impact, label, index }: { impact: string; label: string; index: number }) {
  const cfg = {
    POSITIVE: { bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/30", text: "text-emerald-400", icon: CheckCircle2, dot: "#22c55e" },
    NEGATIVE: { bg: "from-red-500/10 to-red-500/5",         border: "border-red-500/30",     text: "text-red-400",     icon: XCircle,      dot: "#ef4444" },
    NEUTRAL:  { bg: "from-yellow-500/10 to-yellow-500/5",   border: "border-yellow-500/30",  text: "text-yellow-400", icon: Minus,         dot: "#eab308" },
  }[impact] ?? { bg: "from-white/5 to-white/5", border: "border-white/10", text: "text-text-muted", icon: Minus, dot: "gray" };

  const I = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`flex items-start gap-2.5 bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-xl px-3.5 py-2.5 text-[11px] leading-snug group hover:scale-[1.02] transition-transform duration-200`}
    >
      <I size={12} className={`${cfg.text} mt-0.5 shrink-0`} />
      <span className="text-text-secondary font-medium">{label}</span>
    </motion.div>
  );
}

// ─── Reasoning Step ───────────────────────────────────────────────────────────
function TimelineStep({ step, open, onToggle, isLast }: { step: any; open: boolean; onToggle: () => void; isLast: boolean }) {
  type StepStatus = "complete" | "warning" | "info";
  const cfg = {
    complete: { ring: "ring-emerald-500/50 bg-emerald-500/20", dot: "bg-emerald-500", text: "text-emerald-400", line: "bg-emerald-500/20" },
    warning:  { ring: "ring-red-500/50 bg-red-500/20",         dot: "bg-red-500",     text: "text-red-400",     line: "bg-red-500/20" },
    info:     { ring: "ring-primary-500/30 bg-primary-500/10", dot: "bg-primary-400", text: "text-primary-400", line: "bg-white/5" },
  };
  const status: StepStatus = (step.status as StepStatus) in cfg ? (step.status as StepStatus) : "info";
  const s = cfg[status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step.step * 0.07 }}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ring-2 ${s.ring} flex items-center justify-center text-[10px] font-black text-white shrink-0 relative`}>
          <div className={`absolute inset-1.5 rounded-full ${s.dot}`} />
          <span className="relative z-10 text-[9px]">{step.step}</span>
        </div>
        {!isLast && <div className={`w-0.5 flex-1 mt-1 ${s.line}`} style={{ minHeight: 20 }} />}
      </div>

      <div className="pb-5 flex-1">
        <button onClick={onToggle} className="w-full flex items-center justify-between gap-2 text-left group">
          <span className={`text-xs font-bold ${s.text} group-hover:text-white transition-colors`}>{step.title}</span>
          {step.subPoints && (
            <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight size={12} className="text-text-muted" />
            </motion.div>
          )}
        </button>
        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{step.description}</p>
        <AnimatePresence>
          {open && step.subPoints && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ul className="mt-2 space-y-1 pl-2 border-l border-primary-500/20">
                {step.subPoints.map((p: string, i: number) => (
                  <li key={i} className="text-[10px] text-text-muted font-mono">• {p}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Invalidation Rule Card ───────────────────────────────────────────────────
function InvalidationCard({ rule, index }: { rule: any; index: number }) {
  const [hovered, setHovered] = useState(false);
  const sev = {
    CRITICAL: { bg: "from-red-900/30 to-red-900/10",       border: "border-red-500/40",    badge: "bg-red-500/20 text-red-400",    glow: "shadow-red-500/10" },
    HIGH:     { bg: "from-orange-900/20 to-orange-900/10", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-400", glow: "shadow-orange-500/10" },
    MEDIUM:   { bg: "from-yellow-900/20 to-yellow-900/10", border: "border-yellow-500/30", badge: "bg-yellow-500/20 text-yellow-400", glow: "shadow-yellow-500/10" },
  }[rule.severity as "CRITICAL" | "HIGH" | "MEDIUM"] ?? { bg: "from-white/5 to-white/5", border: "border-white/10", badge: "bg-white/10 text-text-muted", glow: "" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`bg-gradient-to-br ${sev.bg} border ${sev.border} rounded-xl p-4 transition-all duration-300 ${hovered ? `shadow-lg ${sev.glow}` : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <TriangleAlert size={11} className="text-current opacity-60" />
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${sev.badge}`}>{rule.severity}</span>
      </div>
      <p className="text-[11px] text-white font-semibold mb-1.5">{rule.condition}</p>
      <p className="text-[10px] text-text-muted leading-relaxed">→ {rule.effect}</p>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function XAIDashboard() {
  const [status, setStatus]       = useState<"idle" | "loading" | "done">("idle");
  const [pair, setPair]           = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [decision, setDecision]   = useState<DecisionResult | null>(null);
  const [report, setReport]       = useState<XAIReport | null>(null);
  const [nlpLevel, setNlpLevel]   = useState<ExplanationLevel>("simple");
  const [openSteps, setOpenSteps] = useState<Record<number,boolean>>({});
  const [calibStats, setCalibStats] = useState<CalibrationStats | null>(null);
  const [tab, setTab]             = useState<"xai" | "calibration" | "history">("xai");
  const [hoveredEngine, setHoveredEngine] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setStatus("loading");
    setTab("xai");
    try {
      const symbol = pair.replace("/", "") + "T";
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=500`);
      const raw = await res.json();
      const data: OHLCV[] = raw.map((d: any) => ({
        time: d[0] / 1000, open: parseFloat(d[1]),
        high: parseFloat(d[2]), low:  parseFloat(d[3]), close: parseFloat(d[4])
      }));
      await new Promise(r => setTimeout(r, 1400));
      const dec = executeMasterDecision(pair, timeframe, data);
      const xai = generateXAIReport(dec);
      setDecision(dec); setReport(xai);
      if (dec.signal.action !== "WAIT") {
        recordPrediction(pair, timeframe, dec.signal.action, dec.probabilities.bullish / 100, dec.masterScore);
      }
      setCalibStats(getCalibrationStats());
      setStatus("done");
    } catch {
      setStatus("done");
    }
  };

  const engines = decision ? [
    { id: "SMC",      label: "Smart Money Concepts",  score: Math.round(Math.abs(decision.breakdown.smcScore)*100),       dir: decision.breakdown.smcScore,       color: "#f43f5e",   glow: "rgba(244,63,94,0.3)" },
    { id: "MTF",      label: "Multi-Timeframe",        score: Math.round(Math.abs(decision.breakdown.mtfScore)*100),       dir: decision.breakdown.mtfScore,       color: "#a855f7",   glow: "rgba(168,85,247,0.3)" },
    { id: "Patterns", label: "Pattern Recognition",   score: Math.round(Math.abs(decision.breakdown.patternScore)*100),   dir: decision.breakdown.patternScore,   color: "#f59e0b",   glow: "rgba(245,158,11,0.3)" },
    { id: "TA",       label: "Technical Analysis",    score: Math.round(Math.abs(decision.breakdown.taScore)*100),        dir: decision.breakdown.taScore,        color: "#3b82f6",   glow: "rgba(59,130,246,0.3)" },
    { id: "Indicators",label:"Indicators",            score: Math.round(Math.abs(decision.breakdown.indicatorScore)*100), dir: decision.breakdown.indicatorScore, color: "#10b981",   glow: "rgba(16,185,129,0.3)" },
  ] : [];

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full min-h-full pb-12">

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative shrink-0 rounded-3xl overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg, #0f0c29, #1a1040, #0f0c29)" }}
      >
        {/* Animated gradient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-600/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }} />

        <div className="relative z-10 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-3"
            >
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[10px] text-violet-400 font-black uppercase tracking-[0.2em]">Phase 20 · Explainable AI</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl md:text-4xl font-black text-white tracking-tight"
            >
              XAI Confidence
              <span className="bg-gradient-to-r from-violet-400 via-primary-400 to-emerald-400 bg-clip-text text-transparent"> Analytics</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-white/50 mt-3 max-w-lg leading-relaxed"
            >
              Full transparency into every AI prediction — signal agreement, conflict detection, reasoning timeline, calibration scoring, and risk invalidation rules.
            </motion.p>
          </div>

          {/* Control Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3 shrink-0 w-full lg:w-auto"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 20 }}
          >
            <div className="flex gap-3">
              {[
                { val: pair, set: setPair,        opts: [["EUR/USD","EUR/USD"],["GBP/USD","GBP/USD"],["BTC/USDT","BTC/USDT"]] },
                { val: timeframe, set: setTimeframe, opts: [["15m","15m"],["1h","1H"],["4h","4H"]] },
              ].map((sel, i) => (
                <select key={i} value={sel.val} onChange={e => sel.set(e.target.value)}
                  className="flex-1 text-white text-sm font-bold outline-none rounded-xl px-3 py-2.5 transition"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {sel.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>
            <motion.button
              onClick={handleAnalyze}
              disabled={status === "loading"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}
            >
              {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {status === "loading" ? "Generating Report…" : "Run XAI Analysis"}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* ══ IDLE STATE ════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-6"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 rounded-full border border-violet-500/20 flex items-center justify-center"
              style={{ boxShadow: "0 0 60px rgba(124,58,237,0.15)" }}
            >
              <FlaskConical size={40} className="text-violet-500/40" />
            </motion.div>
            <div className="text-center">
              <p className="text-white font-bold tracking-widest uppercase text-sm">XAI System Standby</p>
              <p className="text-text-muted text-xs mt-1">Select a pair and click Run XAI Analysis</p>
            </div>
          </motion.div>
        )}

        {/* ══ LOADING STATE ═══════════════════════════════════════════════════ */}
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-8"
          >
            {/* Layered spinning rings */}
            <div className="relative w-28 h-28">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-3 rounded-full border-2 border-transparent border-t-primary-400" />
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-6 rounded-full border-2 border-transparent border-t-emerald-400" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit size={28} className="text-white/60" />
              </div>
            </div>
            {["Ingesting market data…", "Running sub-engine fusion…", "Building XAI transparency report…"].map((msg, i) => (
              <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: i * 0.9, duration: 0.9, repeat: Infinity, repeatDelay: 2.7 - 0.9 }}
                className="text-[11px] text-text-muted font-mono uppercase tracking-widest absolute"
                style={{ top: `${52 + i * 2}%` }}
              >{msg}</motion.p>
            ))}
          </motion.div>
        )}

        {/* ══ RESULTS ═════════════════════════════════════════════════════════ */}
        {status === "done" && report && decision && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {([
                { k: "xai",         label: "XAI Report",     icon: Eye },
                { k: "calibration", label: "Calibration",    icon: BarChart3 },
                { k: "history",     label: "History",         icon: Clock },
              ] as const).map(({ k, label, icon: Icon }) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200"
                  style={tab === k ? {
                    background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(79,70,229,0.3))",
                    color: "white",
                    boxShadow: "0 0 20px rgba(124,58,237,0.2)",
                    border: "1px solid rgba(124,58,237,0.3)"
                  } : { color: "rgba(255,255,255,0.35)" }}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* ══ XAI REPORT TAB ════════════════════════════════════════════ */}
            {tab === "xai" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">

                {/* LEFT */}
                <div className="flex flex-col gap-6">

                  {/* Master Confidence Gauges */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl p-6 relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #1a0e3b, #0d1b3e)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.3), transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.2), transparent 60%)" }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Master Analysis · {pair} · {timeframe}</p>
                          <h2 className={`text-2xl font-black ${decision.masterBias.includes("BULL") ? "text-emerald-400" : decision.masterBias.includes("BEAR") ? "text-red-400" : "text-white/70"}`}>
                            {decision.masterBias}
                          </h2>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide border ${report.signalQuality === "EXCELLENT" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : report.signalQuality === "GOOD" ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"}`}>
                          {report.signalQuality} Quality
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-around gap-6">
                        <RadialGauge value={decision.masterScore} label="Master Confidence" color="#7c3aed" size={130} />
                        <RadialGauge value={decision.probabilities.bullish} label="Bullish Probability" color="#22c55e" size={130} />
                        <RadialGauge value={report.agreementScore} label="Signal Agreement" color="#3b82f6" size={130} />
                        <RadialGauge value={100 - report.conflictScore} label="Consistency" color="#f59e0b" size={130} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Engine Breakdown — Interactive Visual */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <Target size={14} className="text-primary-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Sub-Engine Consensus Vectors</h3>
                    </div>
                    <div className="space-y-5">
                      {engines.map((eng, i) => (
                        <motion.div
                          key={eng.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          onHoverStart={() => setHoveredEngine(eng.id)}
                          onHoverEnd={() => setHoveredEngine(null)}
                          className="group cursor-default"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eng.color, boxShadow: hoveredEngine === eng.id ? `0 0 10px ${eng.glow}` : "none", transition: "box-shadow 0.3s" }} />
                              <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{eng.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black" style={{ color: eng.color }}>{eng.score}%</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${eng.dir > 0.1 ? "bg-emerald-500/10 text-emerald-400" : eng.dir < -0.1 ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/40"}`}>
                                {eng.dir > 0.1 ? "BULL" : eng.dir < -0.1 ? "BEAR" : "NEU"}
                              </span>
                            </div>
                          </div>
                          {/* Bipolar bar: center=neutral, left=bear, right=bull */}
                          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 left-[50%] bottom-0 w-px bg-white/15 z-10" />
                            <motion.div
                              initial={{ width: "50%" }}
                              animate={{ width: `${((eng.dir + 1) / 2) * 100}%` }}
                              transition={{ duration: 0.9, delay: i * 0.07, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${eng.dir > 0 ? `rgba(34,197,94,0.2), ${eng.color}` : `${eng.color}, rgba(34,197,94,0.2)`})` }}
                            />
                            {hoveredEngine === eng.id && (
                              <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="absolute inset-0 rounded-full"
                                style={{ background: `${eng.glow}`, filter: "blur(4px)" }}
                              />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Probability Distribution */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 size={14} className="text-primary-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Probability Scenario Distribution</h3>
                    </div>
                    <div className="space-y-5">
                      {report.scenarioExplanations.map((sc, i) => (
                        <div key={i}>
                          <ProbabilityBar
                            label={sc.scenario}
                            value={sc.probability}
                            color={sc.color === "bullish" ? "text-emerald-400" : sc.color === "bearish" ? "text-red-400" : "text-yellow-400"}
                            icon={sc.color === "bullish" ? TrendingUp : sc.color === "bearish" ? TrendingDown : Minus}
                            delay={i * 0.15}
                          />
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {sc.supporting.slice(0, 1).map((s, j) => (
                              <div key={j} className="text-[9px] text-text-muted bg-white/3 rounded-lg px-2 py-1.5 border border-white/5 leading-relaxed col-span-2">
                                ↑ {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Signal Matrices */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <Activity size={14} className="text-primary-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Signal Agreement Matrix</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-400 mb-3 flex items-center gap-1.5">
                          <CheckCircle2 size={11} /> Supporting Signals
                        </p>
                        <div className="space-y-2">
                          {[...report.bullishSignals, ...report.bearishSignals].slice(0, 5).map((s, i) => (
                            <SignalCard key={i} impact={s.impact} label={s.label} index={i} />
                          ))}
                          {report.bullishSignals.length === 0 && report.bearishSignals.length === 0 && (
                            <p className="text-[11px] text-white/30 px-2">No dominant directional signals.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-yellow-400 mb-3 flex items-center gap-1.5">
                          <AlertTriangle size={11} /> Conflicting Signals
                        </p>
                        <div className="space-y-2">
                          {report.conflictingSignals.slice(0, 5).map((s, i) => (
                            <SignalCard key={i} impact="NEUTRAL" label={s.label} index={i} />
                          ))}
                          {report.conflictingSignals.length === 0 && (
                            <p className="text-[11px] text-white/30 px-2">No engine conflicts detected.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* NLP Explanation */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-primary-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Natural Language Explanation</h3>
                      </div>
                      <div className="flex gap-1">
                        {(["simple", "detailed", "expert"] as ExplanationLevel[]).map(l => (
                          <button
                            key={l}
                            onClick={() => setNlpLevel(l)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold capitalize transition-all duration-200"
                            style={nlpLevel === l
                              ? { background: "rgba(124,58,237,0.3)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" }
                              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.06)" }
                            }
                          >{l}</button>
                        ))}
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={nlpLevel}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-2xl p-5 text-sm text-white/70 leading-8 font-medium"
                        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.04))", borderLeft: "3px solid rgba(124,58,237,0.5)" }}
                      >
                        {nlpLevel === "simple" ? report.simpleExplanation : nlpLevel === "detailed" ? report.detailedExplanation : report.expertExplanation}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* ── RIGHT COLUMN ──────────────────────────────────── */}
                <div className="flex flex-col gap-6">

                  {/* Confidence Heatmap */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <Zap size={14} className="text-primary-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Confidence Breakdown</h3>
                    </div>
                    <div className="space-y-3">
                      {report.confidenceBreakdown.map((c, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="group"
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] text-white/70 font-semibold group-hover:text-white transition-colors">{c.component}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-black ${c.direction === "POSITIVE" ? "text-emerald-400" : c.direction === "NEGATIVE" ? "text-red-400" : "text-white/40"}`}>{c.score}%</span>
                              {c.direction === "POSITIVE" ? <TrendingUp size={10} className="text-emerald-400" /> : c.direction === "NEGATIVE" ? <TrendingDown size={10} className="text-red-400" /> : <Minus size={10} className="text-white/30" />}
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${c.score}%` }}
                              transition={{ duration: 0.9, delay: i * 0.07 }}
                              className="h-full rounded-full"
                              style={{ background: c.direction === "POSITIVE" ? "linear-gradient(90deg, #22c55e80, #22c55e)" : c.direction === "NEGATIVE" ? "linear-gradient(90deg, #ef444480, #ef4444)" : "rgba(255,255,255,0.15)" }}
                            />
                          </div>
                          <p className="text-[9px] text-white/25 mt-1 leading-tight">{c.note}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Invalidation Rules */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <Shield size={14} className="text-red-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Risk & Invalidation Rules</h3>
                    </div>
                    {/* Risk factors summary */}
                    <div className="mb-4 space-y-2">
                      {report.primaryRiskFactors.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
                          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}
                        >
                          <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />
                          <span className="text-white/60">{r}</span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {report.invalidationRules.map((rule, i) => (
                        <InvalidationCard key={i} rule={rule} index={i} />
                      ))}
                    </div>
                  </motion.div>

                  {/* Reasoning Timeline */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-3xl p-6"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <Clock size={14} className="text-primary-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">AI Reasoning Timeline</h3>
                    </div>
                    <div>
                      {report.reasoningTimeline.map((step, i) => (
                        <TimelineStep
                          key={i}
                          step={step}
                          open={!!openSteps[step.step]}
                          onToggle={() => setOpenSteps(prev => ({ ...prev, [step.step]: !prev[step.step] }))}
                          isLast={i === report.reasoningTimeline.length - 1}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ══ CALIBRATION TAB ═══════════════════════════════════════════ */}
            {tab === "calibration" && calibStats && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { l: "Total Analyses", v: calibStats.totalRecords.toString(), note: "All-time",          color: "#7c3aed" },
                  { l: "Win Rate",        v: `${calibStats.winRate}%`,           note: "Resolved",          color: "#22c55e" },
                  { l: "Brier Score",      v: calibStats.overallBrierScore.toFixed(3), note: "Lower = better",  color: "#f59e0b" },
                  { l: "Calibration",     v: calibStats.calibrationStatus,       note: "Model quality grade", color: calibStats.calibrationStatus === "EXCELLENT" ? "#22c55e" : calibStats.calibrationStatus === "GOOD" ? "#3b82f6" : "#f59e0b" },
                ].map((s, i) => (
                  <motion.div
                    key={s.l}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-2xl p-5 relative overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}30` }}
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px]" style={{ background: `${s.color}15` }} />
                    <p className="text-[9px] uppercase font-black tracking-widest mb-2" style={{ color: `${s.color}80` }}>{s.l}</p>
                    <p className="text-2xl font-black text-white">{s.v}</p>
                    <p className="text-[10px] text-white/30 mt-1">{s.note}</p>
                  </motion.div>
                ))}
                {calibStats.byConfidenceBucket.length > 0 ? (
                  <div className="col-span-full rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 size={14} className="text-primary-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Confidence Calibration Buckets</h3>
                    </div>
                    <div className="space-y-5">
                      {calibStats.byConfidenceBucket.map((b, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[11px] font-bold mb-2">
                            <span className="text-white/70">{b.label}</span>
                            <span className="text-white/40 font-mono">{b.count} samples · Error: {(b.calibrationError * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-3 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.05)" }}>
                            {/* Predicted ghost bar */}
                            <div className="absolute top-0 left-0 h-full rounded-full opacity-20" style={{ width: `${b.predicted*100}%`, background: "white" }} />
                            {/* Actual bar */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${b.actualWinRate*100}%` }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className="h-full rounded-full"
                              style={{ background: b.calibrationError < 0.1 ? "#22c55e" : b.calibrationError < 0.2 ? "#f59e0b" : "#ef4444" }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-white/25 mt-1">
                            <span>Actual: {(b.actualWinRate*100).toFixed(0)}%</span>
                            <span>Predicted: {(b.predicted*100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="col-span-full rounded-3xl p-12 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <ShieldCheck size={40} className="mx-auto mb-4 text-white/15" />
                    <p className="text-white/40 text-sm">Run more analyses to accumulate calibration data.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ══ HISTORY TAB ════════════════════════════════════════════════ */}
            {tab === "history" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => { clearHistory(); setCalibStats(getCalibrationStats()); }}
                    className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                  >
                    Clear All History
                  </button>
                </div>
                {getAllRecords().length === 0 ? (
                  <div className="rounded-3xl p-16 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Clock size={40} className="mx-auto mb-4 text-white/15" />
                    <p className="text-white/40">No analysis history yet.</p>
                  </div>
                ) : (
                  getAllRecords().map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl p-4 flex items-center justify-between gap-4 group hover:scale-[1.005] transition-transform"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black ${rec.predictedAction === "BUY" ? "bg-emerald-500/15 text-emerald-400" : rec.predictedAction === "SELL" ? "bg-red-500/15 text-red-400" : "bg-white/5 text-white/40"}`}>
                          {rec.predictedAction}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{rec.pair} · {rec.timeframe}</p>
                          <p className="text-[10px] text-white/40">{new Date(rec.timestamp).toLocaleString()} · Score {rec.masterScore}/100</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-block text-[10px] font-black uppercase px-3 py-1 rounded-full border ${rec.outcome === "WIN" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : rec.outcome === "LOSS" ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-white/10 text-white/40 bg-white/5"}`}>
                          {rec.outcome}
                        </div>
                        <p className="text-[9px] text-white/30 mt-1">Predicted: {(rec.predictedProbability * 100).toFixed(0)}%</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
