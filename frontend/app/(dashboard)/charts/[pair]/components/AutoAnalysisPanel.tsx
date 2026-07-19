"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Zap, Activity, ShieldAlert,
  Target, BarChart2, Layers, Eye, EyeOff, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import type {
  AutoAnalysisResult, TrendlineResult, SRLevel, StructurePoint, PatternResult, MTFBias
} from "@/lib/analysis/engine";

interface Props {
  result: AutoAnalysisResult;
  overlays: OverlayConfig;
  onToggleOverlay: (key: keyof OverlayConfig) => void;
}

export interface OverlayConfig {
  trendlines: boolean;
  levels: boolean;
  structure: boolean;
  patterns: boolean;
}

// ─── Sub-components ────────────────────────────────────────────────────────

const BiasTag = ({ bias, strength }: { bias: string; strength?: number }) => {
  const colors = {
    BULLISH: "text-bullish bg-bullish/10 border-bullish/30",
    BEARISH: "text-bearish bg-bearish/10 border-bearish/30",
    NEUTRAL: "text-neutral-warning bg-neutral-warning/10 border-neutral-warning/30",
  }[bias] ?? "text-text-muted bg-bg-card border-border-default";

  const Icon = bias === "BULLISH" ? TrendingUp : bias === "BEARISH" ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${colors}`}>
      <Icon size={10} /> {bias}
      {strength !== undefined && <span className="opacity-70 ml-1">{(strength * 100).toFixed(0)}%</span>}
    </span>
  );
};

const SectionHeader = ({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) => (
  <div className="flex items-center justify-between mb-3">
    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
      <Icon size={13} className="text-primary-500" /> {title}
    </h4>
    {count !== undefined && (
      <span className="text-[10px] font-mono bg-bg-card border border-border-default px-2 py-0.5 rounded text-text-muted">{count} found</span>
    )}
  </div>
);

// ─── Trendline Card ────────────────────────────────────────────────────────

const TrendlineCard = ({ tl }: { tl: TrendlineResult }) => {
  const typeColors: Record<string, string> = {
    PRIMARY: "border-primary-500/40 bg-primary-500/5",
    SECONDARY: "border-accent-cyan/30 bg-accent-cyan/5",
    INTERNAL: "border-border-strong bg-bg-card",
    BROKEN: "border-bearish/30 bg-bearish/5 opacity-60",
  };

  return (
    <div className={`rounded-lg border p-3 text-xs ${typeColors[tl.type]}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{tl.type}</span>
          <BiasTag bias={tl.direction} />
        </div>
        <span className="font-mono text-text-muted">✕{tl.confirmations}</span>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-text-muted mt-1">
        <span>Strength: <span className="text-white font-medium">{(tl.strength * 100).toFixed(0)}%</span></span>
        <span>Age: <span className="text-white font-medium">{tl.ageBars}b</span></span>
        <span>BrK%: <span className={tl.breakoutProbability > 0.6 ? "text-neutral-warning font-medium" : "text-white font-medium"}>{(tl.breakoutProbability * 100).toFixed(0)}%</span></span>
      </div>
    </div>
  );
};

// ─── Level Card ────────────────────────────────────────────────────────────

const LevelCard = ({ level }: { level: SRLevel }) => {
  const typeColors: Record<string, string> = {
    RESISTANCE: "text-bearish border-bearish/20 bg-bearish/5",
    SUPPORT: "text-bullish border-bullish/20 bg-bullish/5",
    SUPPLY: "text-bearish border-bearish/40 bg-bearish/10",
    DEMAND: "text-bullish border-bullish/40 bg-bullish/10",
    PSYCHOLOGICAL: "text-neutral-warning border-neutral-warning/30 bg-neutral-warning/5",
  };
  const c = typeColors[level.type] ?? "text-text-muted border-border-default bg-bg-card";

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${c}`}>
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase text-[10px] tracking-wide">{level.type}</span>
        <span className="font-mono text-white">{level.price.toFixed(5)}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span>T:{level.touches}</span>
        <div className="w-16 h-1.5 bg-bg-card rounded-full overflow-hidden">
          <div className="h-full bg-current rounded-full" style={{ width: `${level.confidence * 100}%` }} />
        </div>
        <span>{(level.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};

// ─── Structure Point ────────────────────────────────────────────────────────

const StructureCard = ({ pt }: { pt: StructurePoint }) => {
  const [expanded, setExpanded] = useState(false);
  const tagColors: Record<string, string> = {
    HH: "bg-bullish/20 text-bullish border-bullish/30",
    HL: "bg-bullish/10 text-bullish border-bullish/20",
    LH: "bg-bearish/10 text-bearish border-bearish/20",
    LL: "bg-bearish/20 text-bearish border-bearish/30",
    BOS: "bg-primary-500/20 text-primary-400 border-primary-500/40",
    CHoCH: "bg-accent-violet/20 text-accent-violet border-accent-violet/40",
  };

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-card transition text-xs"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${tagColors[pt.type] ?? "bg-bg-card text-text-muted border-border-default"}`}>
            {pt.type}
          </span>
          <span className="font-mono text-text-secondary">{pt.price.toFixed(5)}</span>
        </div>
        {expanded ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="exp"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 pb-3 text-[11px] text-text-muted leading-relaxed border-t border-border-default bg-bg-card"
          >
            <p className="pt-2">{pt.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Pattern Card ────────────────────────────────────────────────────────────

const PatternCard = ({ pattern }: { pattern: PatternResult }) => {
  const [expanded, setExpanded] = useState(false);
  const riskColors = { LOW: "text-bullish", MEDIUM: "text-neutral-warning", HIGH: "text-bearish" };

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-card transition"
      >
        <div className="flex items-center gap-2">
          <BiasTag bias={pattern.bias} />
          <span className="text-xs font-semibold text-white">{pattern.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-muted">{pattern.confidence}% conf</span>
          {expanded ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="exp"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-border-default bg-bg-card"
          >
            <div className="px-3 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-bg-surface rounded-lg p-2">
                  <p className="text-text-muted mb-0.5">Completion</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border-strong rounded-full">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pattern.completionPct}%` }} />
                    </div>
                    <span className="text-white font-bold">{pattern.completionPct}%</span>
                  </div>
                </div>
                <div className="bg-bg-surface rounded-lg p-2">
                  <p className="text-text-muted mb-0.5">Risk Level</p>
                  <p className={`font-bold ${riskColors[pattern.riskLevel]}`}>{pattern.riskLevel}</p>
                </div>
              </div>
              <div className="bg-bg-surface rounded-lg p-2 text-[10px]">
                <p className="text-text-muted mb-0.5">Expected Target</p>
                <p className="font-mono font-bold text-white">{pattern.expectedTarget.toFixed(5)}</p>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">{pattern.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MTF Grid ────────────────────────────────────────────────────────────────

const MTFGrid = ({ mtf }: { mtf: MTFBias[] }) => {
  const biasColors = {
    BULLISH: "bg-bullish/15 border-bullish/30 text-bullish",
    BEARISH: "bg-bearish/15 border-bearish/30 text-bearish",
    NEUTRAL: "bg-border-default border-border-strong text-text-muted",
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {mtf.map((m, i) => (
        <div key={i} className={`rounded-lg border p-2 text-center ${biasColors[m.bias]}`}>
          <p className="text-[10px] font-mono font-bold text-text-muted mb-1">{m.timeframe}</p>
          <p className="text-[11px] font-black uppercase tracking-wide">{m.bias === "NEUTRAL" ? "NEUT" : m.bias.slice(0, 4)}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Scenario Meter ───────────────────────────────────────────────────────────

const ScenarioMeter = ({ scenarios }: { scenarios: AutoAnalysisResult["scenarios"] }) => {
  const [showReasons, setShowReasons] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {[
        { key: "bullish", label: "Bullish Continuation", value: scenarios.bullish, color: "bg-bullish", textColor: "text-bullish", reason: scenarios.reasoning.bullish },
        { key: "sideways", label: "Sideways / Chop", value: scenarios.sideways, color: "bg-neutral-warning", textColor: "text-neutral-warning", reason: scenarios.reasoning.sideways },
        { key: "bearish", label: "Bearish Reversal", value: scenarios.bearish, color: "bg-bearish", textColor: "text-bearish", reason: scenarios.reasoning.bearish },
      ].map(s => (
        <div key={s.key}>
          <button
            onClick={() => setShowReasons(showReasons === s.key ? null : s.key)}
            className="w-full text-left"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-text-secondary font-medium">{s.label}</span>
              <span className={`text-xs font-black font-mono ${s.textColor}`}>{s.value}%</span>
            </div>
            <div className="h-2 bg-bg-card rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.value}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full ${s.color} rounded-full`}
              />
            </div>
          </button>
          <AnimatePresence>
            {showReasons === s.key && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="text-[11px] text-text-muted mt-2 leading-relaxed px-1 border-l-2 border-border-strong pl-3"
              >
                {s.reason}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN PANEL ──────────────────────────────────────────────────────────────

export default function AutoAnalysisPanel({ result, overlays, onToggleOverlay }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "trendlines" | "levels" | "structure" | "patterns">("overview");

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "trendlines", label: `TL (${result.trendlines.length})` },
    { key: "levels", label: `SR (${result.levels.length})` },
    { key: "structure", label: `MS (${result.structure.length})` },
    { key: "patterns", label: `Pat (${result.patterns.length})` },
  ] as const;

  const biasGradient = {
    BULLISH: "from-bullish/5 border-bullish/20",
    BEARISH: "from-bearish/5 border-bearish/20",
    NEUTRAL: "from-border-default border-border-strong",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className={`px-5 py-4 border-b border-border-default bg-gradient-to-b ${biasGradient[result.scenarios.overallBias]}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap size={14} className="text-primary-500" /> Auto Analysis
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted">{result.timeframe}</span>
            <BiasTag bias={result.scenarios.overallBias} />
          </div>
        </div>
        <p className="text-[10px] text-text-muted font-mono">
          {result.pair} · {new Date(result.analyzedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* Overlay Toggles */}
      <div className="px-4 py-2.5 border-b border-border-default bg-bg-card flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider mr-1">Overlays:</span>
        {(Object.keys(overlays) as (keyof OverlayConfig)[]).map(key => (
          <button
            key={key}
            onClick={() => onToggleOverlay(key)}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wide transition ${
              overlays[key]
                ? "bg-primary-500/15 border-primary-500/40 text-primary-400"
                : "bg-bg-surface border-border-default text-text-muted"
            }`}
          >
            {overlays[key] ? <Eye size={10} /> : <EyeOff size={10} />}
            {key}
          </button>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-border-default overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition whitespace-nowrap px-2 ${
              activeTab === tab.key
                ? "text-primary-400 border-b-2 border-primary-500"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4 max-h-[580px] overflow-y-auto scrollbar-thin scrollbar-track-bg-card scrollbar-thumb-border-strong">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-5">

                {/* Scenario Probabilities */}
                <div>
                  <SectionHeader icon={BarChart2} title="Directional Scenarios" />
                  <ScenarioMeter scenarios={result.scenarios} />
                  <p className="text-[10px] text-text-muted mt-3 leading-relaxed">
                    Click any scenario bar to reveal the reasoning behind its calculated probability.
                  </p>
                </div>

                {/* Statistical Summary */}
                <div>
                  <SectionHeader icon={Activity} title="Signal Count Summary" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Trendlines", val: result.trendlines.length, sub: `${result.trendlines.filter(t => t.type !== "BROKEN").length} active` },
                      { label: "S/R Levels", val: result.levels.length, sub: `${result.levels.filter(l => l.strength > 0.7).length} strong` },
                      { label: "Structure Pts", val: result.structure.length, sub: `${result.structure.filter(s => s.type === "BOS" || s.type === "CHoCH").length} key` },
                      { label: "Patterns", val: result.patterns.length, sub: `${result.patterns.filter(p => p.confidence > 75).length} high conf` },
                    ].map(s => (
                      <div key={s.label} className="bg-bg-card border border-border-default rounded-lg p-3">
                        <p className="text-text-muted text-[10px] mb-1">{s.label}</p>
                        <p className="text-xl font-black text-white leading-none">{s.val}</p>
                        <p className="text-[10px] text-text-muted mt-1">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MTF Overview */}
                {result.mtfOutlook.length > 0 && (
                  <div>
                    <SectionHeader icon={Layers} title="Multi-Timeframe Bias" />
                    <MTFGrid mtf={result.mtfOutlook} />
                    <p className="text-[10px] text-text-muted mt-2">
                      {result.mtfOutlook.filter(m => m.bias === "BULLISH").length > result.mtfOutlook.filter(m => m.bias === "BEARISH").length
                        ? "Majority of timeframes show bullish bias — provides higher probability edge for long setups."
                        : result.mtfOutlook.filter(m => m.bias === "BEARISH").length > result.mtfOutlook.filter(m => m.bias === "BULLISH").length
                        ? "Majority of timeframes show bearish bias — provides higher probability edge for short setups."
                        : "Mixed timeframe signals — proceed with caution, wait for confirmation."}
                    </p>
                  </div>
                )}

                {/* Top Pattern */}
                {result.patterns.length > 0 && (
                  <div>
                    <SectionHeader icon={Target} title="Top Pattern Detected" />
                    <PatternCard pattern={result.patterns[0]} />
                  </div>
                )}
              </div>
            )}

            {/* TRENDLINES TAB */}
            {activeTab === "trendlines" && (
              <div className="space-y-3">
                <SectionHeader icon={Activity} title="Detected Trendlines" count={result.trendlines.length} />
                {result.trendlines.length === 0 && (
                  <p className="text-text-muted text-xs text-center py-6">No significant trendlines detected on this timeframe.</p>
                )}
                {result.trendlines.map((tl, i) => <TrendlineCard key={i} tl={tl} />)}
                <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                  Trendline strength is computed from R² regression fit, number of confirmed touches, and recency of the last touch point.
                </p>
              </div>
            )}

            {/* LEVELS TAB */}
            {activeTab === "levels" && (
              <div className="space-y-2">
                <SectionHeader icon={ShieldAlert} title="Support, Resistance & Zones" count={result.levels.length} />
                {result.levels.length === 0 && (
                  <p className="text-text-muted text-xs text-center py-6">No significant levels detected.</p>
                )}
                {result.levels.map((lvl, i) => <LevelCard key={i} level={lvl} />)}
              </div>
            )}

            {/* STRUCTURE TAB */}
            {activeTab === "structure" && (
              <div className="space-y-2">
                <SectionHeader icon={Layers} title="Market Structure" count={result.structure.length} />
                {result.structure.length === 0 && (
                  <p className="text-text-muted text-xs text-center py-6">Insufficient pivot data for structure analysis.</p>
                )}
                {result.structure.map((pt, i) => <StructureCard key={i} pt={pt} />)}
                <div className="mt-3 p-3 bg-bg-card border border-border-default rounded-lg text-[10px] text-text-muted leading-relaxed">
                  <span className="font-bold text-white">Legend:</span> HH = Higher High · HL = Higher Low · LH = Lower High · LL = Lower Low · BOS = Break of Structure · CHoCH = Change of Character
                </div>
              </div>
            )}

            {/* PATTERNS TAB */}
            {activeTab === "patterns" && (
              <div className="space-y-3">
                <SectionHeader icon={Target} title="Chart Patterns" count={result.patterns.length} />
                {result.patterns.length === 0 && (
                  <p className="text-text-muted text-xs text-center py-6">No chart patterns detected on current data.</p>
                )}
                {result.patterns.map((p, i) => <PatternCard key={i} pattern={p} />)}
                {result.patterns.length > 0 && (
                  <div className="mt-2 p-3 bg-bg-card border border-border-default rounded-lg flex items-start gap-2">
                    <AlertTriangle size={13} className="text-neutral-warning mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-text-muted leading-relaxed">
                      Pattern confidence scores reflect geometric quality only. Always confirm with price action and volume before entering a trade.
                    </p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
