"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Target,
  History, BarChart2, Layers, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, ShieldCheck, Zap, Activity
} from "lucide-react";
import type { PatternAnalysis, PatternResult, HistoricalMatch, TradeSetup } from "@/lib/analysis/patterns";

// ─── Shared Atoms ─────────────────────────────────────────────────────────────

const BiasChip = ({ bias }: { bias: string }) => {
  const map: Record<string, string> = {
    BULLISH: "text-bullish bg-bullish/10 border-bullish/30",
    BEARISH: "text-bearish bg-bearish/10 border-bearish/30",
    NEUTRAL: "text-neutral-warning bg-neutral-warning/10 border-neutral-warning/30",
  };
  const Icon = bias === "BULLISH" ? TrendingUp : bias === "BEARISH" ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${map[bias] ?? map.NEUTRAL}`}>
      <Icon size={9} /> {bias}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const map: Record<string, string> = {
    REVERSAL: "text-bearish/80 border-bearish/20 bg-bearish/5",
    CONTINUATION: "text-bullish/80 border-bullish/20 bg-bullish/5",
    NEUTRAL: "text-text-muted border-border-strong bg-bg-card",
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${map[type] ?? map.NEUTRAL}`}>{type}</span>
  );
};

const QualityRing = ({ score, size = 52 }: { score: number; size?: number }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);
  const color = score >= 75 ? "#22C55E" : score >= 55 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-border-strong" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-black text-white leading-none">{score}</span>
      </div>
    </div>
  );
};

const MiniBar = ({ value, color }: { value: number; color: string }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-border-strong rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
    <span className="text-[10px] font-mono text-text-muted w-6 text-right">{value}%</span>
  </div>
);

// ─── Scenario Probability Section ─────────────────────────────────────────────

const ScenarioSection = ({ scenarios }: { scenarios: PatternAnalysis["scenarios"] }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const bars = [
    { key: "bullish", label: "Bullish Continuation", val: scenarios.bullish, color: "bg-bullish", tc: "text-bullish", reason: scenarios.reasoning.bullish },
    { key: "sideways", label: "Sideways / Range",    val: scenarios.sideways, color: "bg-neutral-warning", tc: "text-neutral-warning", reason: scenarios.reasoning.sideways },
    { key: "bearish", label: "Bearish Reversal",     val: scenarios.bearish, color: "bg-bearish", tc: "text-bearish", reason: scenarios.reasoning.bearish },
  ];

  return (
    <div className="space-y-3">
      {bars.map(b => (
        <div key={b.key}>
          <button onClick={() => setExpanded(expanded === b.key ? null : b.key)} className="w-full text-left">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-text-secondary font-medium">{b.label}</span>
              <span className={`text-sm font-black font-mono ${b.tc}`}>{b.val}%</span>
            </div>
            <div className="h-2 bg-bg-card rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${b.val}%` }}
                transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${b.color} rounded-full`} />
            </div>
          </button>
          <AnimatePresence>
            {expanded === b.key && (
              <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                className="text-[11px] text-text-muted mt-2 pl-3 border-l-2 border-border-strong leading-relaxed"
              >
                {b.reason}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
      <p className="text-[9px] text-text-muted italic">Click any bar to reveal AI reasoning behind its probability.</p>
    </div>
  );
};

// ─── Historical Match Carousel ─────────────────────────────────────────────────

const HistoricalMatchRow = ({ match }: { match: HistoricalMatch }) => (
  <div className="flex-shrink-0 w-44 bg-bg-elevated border border-border-default rounded-xl p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-mono text-text-muted">{match.date}</span>
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
        match.outcome === "WIN" ? "text-bullish border-bullish/30 bg-bullish/10" : "text-bearish border-bearish/30 bg-bearish/10"
      }`}>{match.outcome}</span>
    </div>
    <div className="text-[10px] font-bold text-white">{match.pair} · {match.timeframe}</div>
    <div className="space-y-1 text-[9px]">
      <div className="flex justify-between"><span className="text-text-muted">Similarity</span><span className={`font-bold ${match.similarity >= 93 ? "text-bullish" : "text-neutral-warning"}`}>{match.similarity}%</span></div>
      <div className="flex justify-between"><span className="text-text-muted">Win Rate</span><span className="text-white font-bold">{match.winRate}%</span></div>
      <div className="flex justify-between"><span className="text-text-muted">Avg Move</span><span className={`font-mono font-bold ${match.avgMove.startsWith("+") ? "text-bullish" : "text-bearish"}`}>{match.avgMove}</span></div>
    </div>
  </div>
);

// ─── Trade Setup Card ──────────────────────────────────────────────────────────

const TradeSetupSection = ({ setup, patternName }: { setup: TradeSetup; patternName: string }) => {
  if (setup.direction === "WAIT") {
    return (
      <div className="flex flex-col items-center py-6 gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-border-default flex items-center justify-center">
          <Minus size={20} className="text-text-muted" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-secondary">No Trade Setup</p>
          <p className="text-xs text-text-muted mt-1">Pattern is neutral. Wait for breakout direction.</p>
        </div>
      </div>
    );
  }

  const isLong = setup.direction === "LONG";
  const dirColor = isLong ? "text-bullish" : "text-bearish";
  const dirBg    = isLong ? "bg-bullish/10 border-bullish/20" : "bg-bearish/10 border-bearish/20";

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border p-3 flex items-center justify-between ${dirBg}`}>
        <div>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Suggested Direction</p>
          <p className={`text-lg font-black ${dirColor} flex items-center gap-1.5 mt-0.5`}>
            {isLong ? <TrendingUp size={16}/> : <TrendingDown size={16}/>} {setup.direction}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Confidence</p>
          <p className={`text-lg font-black ${dirColor} mt-0.5`}>{setup.confidence}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg-card border border-border-default rounded-lg p-2.5">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">Entry Zone</p>
          <p className="text-xs font-mono font-bold text-white">{setup.entryZone}</p>
        </div>
        <div className="bg-bg-card border border-bearish/20 rounded-lg p-2.5">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">Stop Loss</p>
          <p className="text-xs font-mono font-bold text-bearish">{setup.stopLoss}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "TP 1", v: setup.takeProfit1 },
          { l: "TP 2", v: setup.takeProfit2 },
          { l: "TP 3", v: setup.takeProfit3 },
        ].map(tp => (
          <div key={tp.l} className="bg-bg-card border border-bullish/15 rounded-lg p-2.5">
            <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">{tp.l}</p>
            <p className="text-[10px] font-mono font-bold text-bullish">{tp.v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 bg-bg-card border border-primary-500/20 rounded-lg p-2.5">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">Risk / Reward</p>
          <p className="text-sm font-black text-primary-400">{setup.rrRatio}</p>
        </div>
        <div className="flex-1 bg-bg-card border border-border-default rounded-lg p-2.5">
          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">Est. Holding</p>
          <p className="text-[10px] font-bold text-text-secondary flex items-center gap-1"><Clock size={10}/>{setup.estimatedHolding}</p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-2.5 bg-bg-card border border-border-default rounded-lg">
        <AlertTriangle size={12} className="text-neutral-warning mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-text-muted leading-relaxed">
          Based on {patternName} geometry. Probabilities only — not financial advice. Always confirm with price action.
        </p>
      </div>
    </div>
  );
};

// ─── Individual Pattern Card ───────────────────────────────────────────────────

const PatternCard = ({ pattern, onSelectForSetup }: { pattern: PatternResult; onSelectForSetup: (p: PatternResult) => void }) => {
  const [open, setOpen] = useState(false);
  const riskColors = { LOW: "text-bullish", MEDIUM: "text-neutral-warning", HIGH: "text-bearish" };

  return (
    <div className={`rounded-xl border overflow-hidden transition ${
      pattern.qualityScore >= 75 ? "border-primary-500/25 bg-primary-500/3" : "border-border-default bg-bg-card/40"
    }`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elevated/20 transition text-left">
        <QualityRing score={pattern.qualityScore} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <BiasChip bias={pattern.bias} />
            <TypeBadge type={pattern.type} />
            {pattern.qualityScore >= 75 && <CheckCircle2 size={10} className="text-bullish" />}
          </div>
          <p className="text-xs font-bold text-white truncate">{pattern.name}</p>
          <div className="flex items-center gap-3 mt-0.5 text-[9px] text-text-muted">
            <span>Complete: <span className="text-white">{pattern.completionPct}%</span></span>
            <span>BrkP: <span className={pattern.breakoutProbability > 0.6 ? "text-bullish" : "text-neutral-warning"}>{(pattern.breakoutProbability * 100).toFixed(0)}%</span></span>
            <span className={riskColors[pattern.riskLevel]}>Risk: {pattern.riskLevel}</span>
          </div>
        </div>
        {open ? <ChevronUp size={13} className="text-text-muted flex-shrink-0" /> : <ChevronDown size={13} className="text-text-muted flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="border-t border-border-default"
          >
            <div className="px-3 py-3 space-y-3">
              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {[
                  { l: "Geometry Score",    v: `${(pattern.geometryScore * 100).toFixed(0)}%` },
                  { l: "Historical Win",     v: `${(pattern.historicalReliability * 100).toFixed(0)}%` },
                  { l: "Breakout Prob.",     v: `${(pattern.breakoutProbability * 100).toFixed(0)}%` },
                  { l: "Failure Prob.",      v: `${(pattern.failureProbability * 100).toFixed(0)}%` },
                ].map(m => (
                  <div key={m.l} className="bg-bg-surface rounded-lg p-2">
                    <p className="text-text-muted mb-0.5">{m.l}</p>
                    <p className="font-bold font-mono text-white">{m.v}</p>
                  </div>
                ))}
              </div>

              {/* AI Explanation */}
              <div className="bg-bg-surface rounded-lg p-2.5 space-y-1.5">
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Zap size={9} className="text-accent-violet" />AI Explanation</p>
                {pattern.explanation.map((line, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <ArrowRight size={9} className="text-text-muted mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-text-muted leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>

              {/* Historical Matches mini carousel */}
              {pattern.historicalMatches.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><History size={9} className="text-primary-500" />Top Historical Matches</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-strong">
                    {pattern.historicalMatches.slice(0, 5).map(m => (
                      <HistoricalMatchRow key={m.rank} match={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Setup button */}
              <button
                onClick={() => onSelectForSetup(pattern)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  pattern.tradeSetup.direction !== "WAIT"
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:opacity-90 shadow-sm"
                    : "bg-bg-surface border border-border-default text-text-muted cursor-not-allowed"
                }`}
              >
                <Target size={11} />
                {pattern.tradeSetup.direction !== "WAIT" ? "View Trade Setup" : "No Setup — Wait for Breakout"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MAIN PANEL ────────────────────────────────────────────────────────────────

type Tab = "overview" | "patterns" | "setup" | "history";

interface Props {
  result: PatternAnalysis;
}

export default function PatternResultsPanel({ result }: Props) {
  const [activeTab, setActiveTab]       = useState<Tab>("overview");
  const [selectedSetup, setSelectedSetup] = useState<PatternResult | null>(result.topPattern);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview",  label: "Overview",  icon: BarChart2 },
    { key: "patterns",  label: `Patterns (${result.patterns.length})`, icon: Activity },
    { key: "setup",     label: "Trade Setup", icon: Target },
    { key: "history",   label: "History",   icon: History },
  ];

  const biasColor = {
    BULLISH: "from-bullish/5 border-bullish/20",
    BEARISH: "from-bearish/5 border-bearish/20",
    NEUTRAL: "from-border-default border-border-strong",
  };
  const overallBias = result.scenarios.bullish > result.scenarios.bearish
    ? "BULLISH" : result.scenarios.bearish > result.scenarios.bullish ? "BEARISH" : "NEUTRAL";

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl">

      {/* Header */}
      <div className={`px-4 py-3.5 border-b border-border-default bg-gradient-to-b ${biasColor[overallBias]}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={14} className="text-primary-500" /> Pattern Recognition
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted bg-bg-card/60 px-2 py-0.5 rounded">{result.pair} · {result.timeframe}</span>
            <BiasChip bias={overallBias} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-text-muted">
          <span><span className="text-white font-bold">{result.totalScanned}</span> patterns scanned</span>
          <span><span className="text-white font-bold">{result.validatedCount}</span> validated</span>
          <span className="text-[9px] font-mono">{new Date(result.analyzedAt).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border-default overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 text-[10px] font-bold uppercase tracking-wide transition whitespace-nowrap px-2 ${
              activeTab === t.key ? "text-primary-400 border-b-2 border-primary-500" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <t.icon size={11} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="overflow-y-auto max-h-[580px] scrollbar-thin scrollbar-track-bg-card scrollbar-thumb-border-strong">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-4 space-y-4"
          >

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: "Total Detected",    v: result.validatedCount,  sub: `of ${result.totalScanned} scanned` },
                    { l: "Highest Score",     v: result.patterns[0]?.qualityScore ?? 0, sub: result.patterns[0]?.name ?? "None" },
                    { l: "Bullish Patterns",  v: result.patterns.filter(p => p.bias === "BULLISH").length, sub: "signals" },
                    { l: "Bearish Patterns",  v: result.patterns.filter(p => p.bias === "BEARISH").length, sub: "signals" },
                  ].map(s => (
                    <div key={s.l} className="bg-bg-card border border-border-default rounded-xl p-3">
                      <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1">{s.l}</p>
                      <p className="text-2xl font-black text-white leading-none">{s.v}</p>
                      <p className="text-[9px] text-text-muted mt-1 truncate">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Scenario Probabilities */}
                <div>
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <BarChart2 size={11} className="text-primary-500" /> AI Scenario Probabilities
                  </h4>
                  <ScenarioSection scenarios={result.scenarios} />
                </div>

                {/* Top Pattern Preview */}
                {result.topPattern && (
                  <div>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <CheckCircle2 size={11} className="text-bullish" /> Highest Quality Pattern
                    </h4>
                    <PatternCard pattern={result.topPattern} onSelectForSetup={p => { setSelectedSetup(p); setActiveTab("setup"); }} />
                  </div>
                )}

                {/* Pattern breakdown bar */}
                {result.patterns.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Layers size={11} className="text-primary-500" /> Quality Distribution
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] text-text-muted mb-1">
                        <span>Pattern Quality Scores</span>
                        <span>0 → 100</span>
                      </div>
                      {result.patterns.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-[10px]">
                          <span className="text-text-muted w-32 truncate">{p.name}</span>
                          <MiniBar value={p.qualityScore} color={p.bias === "BULLISH" ? "bg-bullish" : p.bias === "BEARISH" ? "bg-bearish" : "bg-neutral-warning"} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── PATTERNS TAB ── */}
            {activeTab === "patterns" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={11} className="text-primary-500" /> All Detected Patterns
                  </h4>
                  <span className="text-[9px] font-mono bg-bg-card border border-border-default px-2 py-0.5 rounded text-text-muted">
                    {result.patterns.length} validated
                  </span>
                </div>
                {result.patterns.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-border-default flex items-center justify-center">
                      <Activity size={20} className="text-text-muted" />
                    </div>
                    <p className="text-sm font-bold text-text-secondary">No Patterns Detected</p>
                    <p className="text-xs text-text-muted max-w-[220px]">Insufficient pivot structure on this timeframe. Try a higher timeframe or a different asset.</p>
                  </div>
                ) : (
                  result.patterns.map(p => (
                    <PatternCard key={p.id} pattern={p} onSelectForSetup={pat => { setSelectedSetup(pat); setActiveTab("setup"); }} />
                  ))
                )}
              </div>
            )}

            {/* ── TRADE SETUP TAB ── */}
            {activeTab === "setup" && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={11} className="text-primary-500" /> AI Trade Setup
                </h4>

                {/* Pattern selector */}
                {result.patterns.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {result.patterns.map(p => (
                      <button key={p.id} onClick={() => setSelectedSetup(p)}
                        className={`flex-shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide transition ${
                          selectedSetup?.id === p.id ? "bg-primary-500/20 border-primary-500/40 text-primary-400" : "bg-bg-card border-border-default text-text-muted hover:text-white"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {selectedSetup ? (
                  <TradeSetupSection setup={selectedSetup.tradeSetup} patternName={selectedSetup.name} />
                ) : (
                  <div className="flex flex-col items-center py-10 gap-3 text-center">
                    <Target size={28} className="text-text-muted" />
                    <p className="text-sm font-bold text-text-secondary">No pattern selected</p>
                    <p className="text-xs text-text-muted">Run pattern detection first, then select a pattern to view its trade setup.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === "history" && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <History size={11} className="text-primary-500" /> All Historical Matches
                </h4>
                {result.patterns.map(p => (
                  p.historicalMatches.length > 0 && (
                    <div key={p.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <BiasChip bias={p.bias} />
                        <span className="text-[10px] font-bold text-white">{p.name}</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-strong">
                        {p.historicalMatches.map(m => <HistoricalMatchRow key={m.rank} match={m} />)}
                      </div>
                    </div>
                  )
                ))}
                {result.patterns.every(p => p.historicalMatches.length === 0) && (
                  <p className="text-xs text-text-muted text-center py-8">No historical matches found.</p>
                )}
                <div className="flex items-start gap-2 p-2.5 bg-bg-card border border-border-default rounded-lg">
                  <ShieldCheck size={11} className="text-primary-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] text-text-muted leading-relaxed">
                    Historical matches are sourced from open Forex market data. Past pattern performance does not guarantee future results.
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
