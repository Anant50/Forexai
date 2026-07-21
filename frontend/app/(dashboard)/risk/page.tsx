"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Calculator, TriangleAlert, Target, DollarSign,
  TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Scale, Server
} from "lucide-react";
import { executeMasterDecision, type DecisionResult } from "@/lib/analysis/decisionEngine";
import type { OHLCV } from "@/lib/analysis/engine";

export default function RiskDashboard() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [pair, setPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [decision, setDecision] = useState<DecisionResult | null>(null);

  // Simulated active trades to trigger correlation logic
  const mockActiveTrades = [
    { pair: "GBP/USD", direction: "BUY", positionSize: 1.0 },
    { pair: "AUD/USD", direction: "BUY", positionSize: 0.5 }
  ];

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

  const risk = decision?.riskProfile;

  return (
    <div className="flex flex-col gap-6 max-w-[1440px] mx-auto w-full min-h-full pb-12">
      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative shrink-0 rounded-3xl overflow-hidden border border-white/10"
        style={{ background: "linear-gradient(135deg, #18181b, #27272a, #09090b)" }}
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-400 font-black uppercase tracking-[0.2em]">Phase 22 · Risk Intelligence</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Position & <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">Risk Management</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-sm text-white/50 mt-3 max-w-lg leading-relaxed">
              Mathematical trade validation, precise lot sizing limits, volatility stop-loss checks, and cross-asset correlation exposure scanning.
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex flex-col gap-3 shrink-0 w-full lg:w-auto" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 20 }}>
            <div className="flex gap-3">
              {[
                { val: pair, set: setPair,        opts: [["EUR/USD","EUR/USD"],["GBP/USD","GBP/USD"],["USD/JPY","USD/JPY"]] },
                { val: timeframe, set: setTimeframe, opts: [["15m","15m"],["1h","1H"],["4h","4H"]] },
              ].map((sel, i) => (
                <select key={i} value={sel.val} onChange={e => sel.set(e.target.value)}
                  className="flex-1 text-white text-sm font-bold outline-none rounded-xl px-3 py-2.5 transition focus:border-red-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {sel.opts.map(([v, l]) => <option key={v} value={v} className="bg-zinc-900">{l}</option>)}
                </select>
              ))}
            </div>
            <motion.button
              onClick={handleAnalyze} disabled={status === "loading"}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 0 30px rgba(239,68,68,0.3)" }}
            >
              {status === "loading" ? <Server size={16} className="animate-spin" /> : <Calculator size={16} />}
              {status === "loading" ? "Analyzing Exposure…" : "Calculate Trade Risk"}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* ══ LOADING & IDLE ════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-28 gap-6">
            <ShieldAlert size={40} className="text-zinc-600" />
            <p className="text-white font-bold tracking-widest uppercase text-sm">Risk Engine Standby</p>
          </motion.div>
        )}

        {/* ══ RESULTS ═════════════════════════════════════════════════════════ */}
        {status === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            
            {decision?.signal.action === "WAIT" ? (
              <div className="p-10 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 text-center">
                <AlertTriangle size={32} className="mx-auto mb-3 text-yellow-500/50" />
                <h3 className="text-sm font-black text-yellow-500 mb-1">NO TRADE SETUP GENERATED</h3>
                <p className="text-xs text-white/50">The AI did not find a high-probability setup to calculate risk for. Wait for better market structure.</p>
              </div>
            ) : risk ? (
              <>
                {/* Master Setup Strip */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex justify-between items-center min-w-[300px]">
                     <div>
                       <p className="text-[10px] text-white/40 uppercase font-black mb-1">AI Recommendation</p>
                       <div className="flex items-center gap-2">
                         <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${decision.signal.action === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                           {decision.signal.action}
                         </span>
                         <span className="text-lg font-black text-white">{pair}</span>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] text-white/40 uppercase font-black mb-1">Calculated Limit Entry</p>
                       <p className="text-lg font-mono text-white/90">{decision.signal.entry}</p>
                     </div>
                  </div>
                  
                  <div className="flex-1 p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex justify-between items-center min-w-[300px]">
                    <div>
                      <p className="text-[10px] text-red-400 uppercase font-black mb-1 flex items-center gap-1.5"><TrendingDown size={12}/> Stop Loss</p>
                      <p className="text-lg font-mono text-white/90">{decision.signal.sl}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-400 uppercase font-black mb-1 flex items-center gap-1.5 justify-end"><TrendingUp size={12}/> Take Profit 1</p>
                      <p className="text-lg font-mono text-white/90">{decision.signal.tp1}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
                  {/* LEFT: Sizing & Math */}
                  <div className="flex flex-col gap-6">
                     <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-2">
                             <Scale size={16} className="text-orange-500" />
                             <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Position Sizing Engine</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-white/40 uppercase font-black">Demonstration Profile</p>
                            <p className="text-xs text-white/70 font-mono">$10,000 Balance · 1% Risk</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Max Monetary Risk</p>
                            <p className="text-xl font-black text-red-400">${risk.maxMonetaryRisk.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Lot Size Required</p>
                            <p className="text-xl font-black text-orange-400">{risk.positionSizeLots} Lots</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Risk/Reward Ratio</p>
                            <p className={`text-xl font-black ${risk.rrRatio >= 1.5 ? "text-emerald-400" : "text-red-400"}`}>1 : {risk.rrRatio}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Target 1 Reward</p>
                            <p className="text-xl font-black text-emerald-400">${risk.potentialReward.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                           <div className="flex justify-between p-3 rounded-xl bg-white/[0.02]">
                              <span className="text-xs text-white/40 font-bold">Pip Distance (Risk)</span>
                              <span className="text-xs font-mono">{risk.pipDistanceSL} pips</span>
                           </div>
                           <div className="flex justify-between p-3 rounded-xl bg-white/[0.02]">
                              <span className="text-xs text-white/40 font-bold">Pip Distance (Target)</span>
                              <span className="text-xs font-mono">{risk.pipDistanceTP1} pips</span>
                           </div>
                           <div className="flex justify-between p-3 rounded-xl bg-white/[0.02] col-span-2">
                              <span className="text-xs text-white/40 font-bold">Estimated Base Currency Pip Value (1 Lot)</span>
                              <span className="text-xs font-mono">${risk.pipValuePerLot.toFixed(2)}</span>
                           </div>
                        </div>
                     </motion.div>

                     {/* Invalidation Rules */}
                     <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-6">
                           <ShieldAlert size={16} className="text-red-500" />
                           <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Setup Invalidation Rules</h3>
                        </div>
                        <div className="space-y-4">
                          {risk.invalidations.map((inv, i) => (
                            <div key={i} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                              <p className="text-[10px] text-white/40 uppercase font-black mb-2">If this happens:</p>
                              <p className="text-xs text-red-300 font-semibold mb-3">{inv.invalidationTrigger}</p>
                              <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-red-500/10">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-white/30 uppercase mt-0.5 shrink-0 w-16">Thesis:</span>
                                  <span className="text-[11px] text-white/60 leading-tight">{inv.thesis}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-white/30 uppercase mt-0.5 shrink-0 w-16">Result:</span>
                                  <span className="text-[11px] text-orange-400/80 leading-tight">{inv.alternativeScenario}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                     </motion.div>
                  </div>

                  {/* RIGHT: Warnings & Correlation */}
                  <div className="flex flex-col gap-6">
                     <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`p-6 rounded-3xl border ${risk.warnings.length > 0 ? "border-orange-500/20 bg-orange-500/[0.02]" : "border-emerald-500/20 bg-emerald-500/[0.02]"}`}>
                        <div className="flex items-center gap-2 mb-5">
                           <TriangleAlert size={16} className={risk.warnings.length > 0 ? "text-orange-500" : "text-emerald-500"} />
                           <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Risk Scan Warnings</h3>
                        </div>
                        {risk.warnings.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <ShieldCheck size={28} className="text-emerald-500/40 mb-2" />
                            <p className="text-xs text-emerald-500/70">No severe risk warnings detected.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {risk.warnings.map((w, i) => {
                              const c = w.type === "CRITICAL" ? "text-red-400 bg-red-400/10 border-red-400/20" : w.type === "HIGH" ? "text-orange-400 bg-orange-400/10 border-orange-400/20" : w.type === "MEDIUM" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" : "text-blue-400 bg-blue-400/10 border-blue-400/20";
                              return (
                                <div key={i} className={`p-3 rounded-lg border flex gap-3 items-start ${c}`}>
                                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider mb-0.5">{w.type}</p>
                                    <p className="text-[11px] leading-relaxed opacity-90 font-medium">{w.message}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                     </motion.div>

                     {/* Correlation Matrix */}
                     <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-5">
                           <div className="flex items-center gap-2">
                             <Server size={16} className="text-indigo-400" />
                             <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Correlation Scan</h3>
                           </div>
                           <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${risk.correlationRisk === "HIGH" ? "bg-red-500/20 text-red-400" : risk.correlationRisk === "MEDIUM" ? "bg-orange-500/20 text-orange-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                             {risk.correlationRisk} Risk
                           </span>
                        </div>
                        <p className="text-[10px] text-white/40 mb-3 leading-relaxed">Scanning active mocked portfolio against this proposed setup to detect dangerous multi-asset exposure.</p>
                        <div className="space-y-2 opacity-50 pointer-events-none">
                          {mockActiveTrades.map((t, i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                              <span className="text-xs font-bold text-white">{t.pair}</span>
                              <span className="text-[10px] font-black">{t.direction} {t.positionSize}L</span>
                            </div>
                          ))}
                        </div>
                     </motion.div>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
