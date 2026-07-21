"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Radar, TrendingUp, TrendingDown, Minus, Loader2, Target, BarChart3, ChevronDown, FlaskConical, TriangleAlert
} from "lucide-react";
import { executeMasterDecision, type DecisionResult } from "@/lib/analysis/decisionEngine";
import type { OHLCV } from "@/lib/analysis/engine";

export default function IndicatorDashboard() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [pair, setPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [decision, setDecision] = useState<DecisionResult | null>(null);

  const handleAnalyze = async () => {
    setStatus("loading");
    try {
      const symbol = pair.replace("/", "") + "T";
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=500`);
      const raw = await res.json();
      const data: OHLCV[] = raw.map((d: any) => ({
        time: d[0] / 1000, open: parseFloat(d[1]),
        high: parseFloat(d[2]), low:  parseFloat(d[3]), close: parseFloat(d[4])
      }));
      await new Promise(r => setTimeout(r, 1200));
      const dec = executeMasterDecision(pair, timeframe, data);
      setDecision(dec);
      setStatus("done");
    } catch {
      setStatus("done");
    }
  };

  const indRes = decision?.indicatorAnalysis;

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full min-h-full pb-12">
      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative shrink-0 rounded-3xl overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg, #0b1120, #0f172a, #020617)" }}
      >
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.2em]">Phase 21 · Indicator Intelligence</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Advanced <span className="bg-gradient-to-r from-cyan-400 via-primary-400 to-emerald-400 bg-clip-text text-transparent">Indicators</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-sm text-white/50 mt-3 max-w-lg leading-relaxed">
              Vectorized technical analysis engine detecting trends, momentum exhaustion, and hidden divergences with adaptive market state weighting.
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex flex-col gap-3 shrink-0 w-full lg:w-auto" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 20 }}>
            <div className="flex gap-3">
              {[
                { val: pair, set: setPair,        opts: [["EUR/USD","EUR/USD"],["GBP/USD","GBP/USD"],["BTC/USDT","BTC/USDT"]] },
                { val: timeframe, set: setTimeframe, opts: [["15m","15m"],["1h","1H"],["4h","4H"],["1d","Daily"]] },
              ].map((sel, i) => (
                <select key={i} value={sel.val} onChange={e => sel.set(e.target.value)}
                  className="flex-1 text-white text-sm font-bold outline-none rounded-xl px-3 py-2.5 transition focus:border-cyan-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {sel.opts.map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
                </select>
              ))}
            </div>
            <motion.button
              onClick={handleAnalyze} disabled={status === "loading"}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #3b82f6)", boxShadow: "0 0 30px rgba(14,165,233,0.3)" }}
            >
              {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Radar size={16} />}
              {status === "loading" ? "Calculating Vectors…" : "Run Indicator Scan"}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* ══ LOADING & IDLE ════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-28 gap-6">
            <Activity size={40} className="text-cyan-500/40" />
            <p className="text-white font-bold tracking-widest uppercase text-sm">System Standby</p>
          </motion.div>
        )}
        {status === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-28 gap-6">
            <Loader2 size={40} className="text-cyan-500 animate-spin" />
            <p className="text-text-muted font-mono uppercase tracking-widest text-xs">Vectorizing indicator arrays…</p>
          </motion.div>
        )}

        {/* ══ RESULTS ═════════════════════════════════════════════════════════ */}
        {status === "done" && indRes && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            
            {/* Top Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { l: "Market State",   v: indRes.state.replace("_", " "), c: indRes.state === "TRENDING" ? "#a855f7" : "#3b82f6" },
                { l: "Overall Bias",   v: indRes.overallBias,              c: indRes.overallBias === "BULLISH" ? "#22c55e" : indRes.overallBias === "BEARISH" ? "#ef4444" : "#f59e0b" },
                { l: "Agreement",      v: `${indRes.agreementScore}%`,     c: "#10b981" },
                { l: "Vector Weight",  v: indRes.overallScore.toFixed(3),  c: "#0ea5e9" }
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl p-5 border border-white/5 bg-white/[0.02]">
                  <p className="text-[9px] uppercase font-black tracking-widest mb-1 text-white/40">{s.l}</p>
                  <p className="text-xl font-black" style={{ color: s.c }}>{s.v}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6">
              {/* Left Column: Signals Table */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-cyan-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Indicator Signal Matrix</h3>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {indRes.signals.map((sig, i) => {
                    const isBull = sig.bias === "BULLISH";
                    const isBear = sig.bias === "BEARISH";
                    const I = isBull ? TrendingUp : isBear ? TrendingDown : Minus;
                    const c = isBull ? "text-emerald-400" : isBear ? "text-red-400" : "text-yellow-400";
                    const bg = isBull ? "bg-emerald-500/10" : isBear ? "bg-red-500/10" : "bg-yellow-500/10";
                    return (
                      <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.015] transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-white/10 text-white/50">{sig.category.substring(0,4)}</span>
                            <span className="text-sm font-bold text-white/90">{sig.name}</span>
                          </div>
                          <p className="text-[11px] text-text-muted">{sig.explanation}</p>
                        </div>
                        
                        <div className="flex items-center gap-6 md:w-[350px] shrink-0">
                          <div className="w-[80px]">
                             <p className="text-[10px] text-white/30 uppercase font-black mb-1">Value</p>
                             <p className="text-xs font-mono text-white/80">{typeof sig.value === 'object' ? '...' : sig.value}</p>
                          </div>
                          <div className="w-[100px]">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${bg} ${c} border border-current/20`}>
                              <I size={12} />
                              <span className="text-[10px] font-black tracking-wider">{sig.bias}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-white/30 uppercase font-black mb-1">Strength {sig.strength}%</p>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${sig.strength}%` }} transition={{ duration: 1, delay: i*0.1 }} className="h-full rounded-full" style={{ background: isBull ? '#22c55e' : isBear ? '#ef4444' : '#eab308' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Right Column: Divergences */}
              <div className="flex flex-col gap-6">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                   <div className="flex items-center gap-2 mb-5">
                      <Target size={14} className="text-purple-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Divergence Scanner</h3>
                   </div>
                   {indRes.divergences.length === 0 ? (
                     <div className="p-6 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                       <TriangleAlert size={24} className="mx-auto text-white/10 mb-2" />
                       <p className="text-xs text-white/40">No divergences detected.</p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       {indRes.divergences.map((div, i) => (
                         <div key={i} className="p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">{div.type.replace("_", " ")}</span>
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">{div.confidence}% Conf</span>
                           </div>
                           <p className="text-[10px] text-white/50 leading-relaxed">
                             Detected between {div.indicator} and price action (Candle {div.priceStartIdx} to {div.priceEndIdx}).
                           </p>
                         </div>
                       ))}
                     </div>
                   )}
                </motion.div>

                {/* NLP Summary Map */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                  <div className="flex items-center gap-2 mb-5">
                      <FlaskConical size={14} className="text-emerald-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Adaptive Reasoning</h3>
                   </div>
                   <p className="text-[11px] text-white/60 leading-7">
                     In a <strong>{indRes.state.replace("_", " ")}</strong> environment, the engine dynamically modifies its weighting parameters. 
                     {indRes.state === "TRENDING" ? " Momentum oscillators are suppressed to prevent premature fading while moving averages dictate core bias." : " Oscillatory exhaustion inputs are heavily prioritized over moving average ribbons."}
                   </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
