"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Activity, Zap, ShieldCheck, PieChart, Info, Radar, Target, Loader2, ArrowRight } from "lucide-react";
import { executeMasterDecision, type DecisionResult, type EngineWeights } from "@/lib/analysis/decisionEngine";
import type { OHLCV } from "@/lib/analysis/engine";
import { useUiStore } from "@/lib/store/uiStore";
import Link from "next/link";

export default function AiDashboard() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [pair, setPair] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("1h");
  
  const handleAnalyze = async () => {
    setStatus("loading");
    
    try {
      // Simulate fetching 500 candles for EURUSD 1h
      const symbol = pair.replace("/", "") + "T";
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=500`);
      const raw = await res.json();
      
      const data: OHLCV[] = raw.map((d: any) => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4])
      }));
      
      // Delay for UI spinning effect
      await new Promise(r => setTimeout(r, 1200));
      
      const decision = executeMasterDecision(pair, timeframe, data);
      setResult(decision);
      setStatus("done");
      
    } catch {
      setStatus("done");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full h-full pb-10">
      
      {/* Header Panel */}
      <div className="bg-bg-surface border border-border-subtle rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <BrainCircuit className="text-primary-400" size={32} /> 
            Master Intelligence Engine
          </h1>
          <p className="text-sm text-text-muted mt-2 max-w-lg leading-relaxed">
            The central AI pipeline fuses Pattern Recognition, Smart Money footprints, Multi-Timeframe logic, and standard TA into a singular Bayesian Probabilistic Outlook.
          </p>
        </div>
        
        <div className="flex flex-col w-full md:w-auto gap-3 z-10 bg-bg-card p-4 rounded-xl border border-border-default">
           <div className="flex items-center gap-3">
             <select 
               className="bg-bg-surface border border-border-strong text-white text-sm font-bold rounded-lg px-4 py-2 outline-none focus:border-primary-500 transition"
               value={pair} onChange={e => setPair(e.target.value)}
             >
               <option value="EUR/USD">EUR/USD</option>
               <option value="GBP/USD">GBP/USD</option>
               <option value="BTC/USDT">BTC/USD</option>
             </select>
             
             <select 
               className="bg-bg-surface border border-border-strong text-white text-sm font-bold rounded-lg px-4 py-2 outline-none focus:border-primary-500 transition"
               value={timeframe} onChange={e => setTimeframe(e.target.value)}
             >
               <option value="15m">15 Minutes</option>
               <option value="1h">1 Hour</option>
               <option value="4h">4 Hours</option>
             </select>
           </div>
           
           <button 
             onClick={handleAnalyze} disabled={status === "loading"}
             className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 transition shadow-lg shadow-primary-500/20"
           >
             {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Radar size={16} />}
             COMMENCE FUSION
           </button>
        </div>
      </div>
      
      {/* Dynamic Results Grid */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-text-muted">
             <Radar size={64} className="mb-4 opacity-20" />
             <p className="uppercase tracking-widest font-bold text-sm">System Ready for Inputs</p>
           </motion.div>
        )}
        
        {status === "loading" && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-primary-400">
             <Loader2 size={64} className="mb-4 animate-spin opacity-50" />
             <p className="uppercase tracking-widest font-bold text-sm animate-pulse">Running Neural Consensus Algorithms...</p>
           </motion.div>
        )}
        
        {status === "done" && result && (
           <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
              
              <div className="flex flex-col gap-6">
                 {/* Top Probability Dash */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 flex items-center gap-4 relative overflow-hidden">
                       <PieChart className="text-border-strong absolute -bottom-4 -right-4 w-32 h-32 opacity-20" />
                       <div className="relative z-10 w-full">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-1">Master Bias</p>
                         <h2 className="text-xl font-black text-white">{result.masterBias}</h2>
                         <div className="w-full h-1.5 bg-bg-card rounded-full mt-4 overflow-hidden flex">
                            <motion.div initial={{width:0}} animate={{width:`${result.probabilities.bullish}%`}} className="bg-bullish h-full" />
                            <motion.div initial={{width:0}} animate={{width:`${result.probabilities.sideways}%`}} className="bg-neutral-warning h-full" />
                            <motion.div initial={{width:0}} animate={{width:`${result.probabilities.bearish}%`}} className="bg-bearish h-full" />
                         </div>
                         <div className="flex justify-between text-[9px] font-bold mt-2">
                           <span className="text-bullish">{result.probabilities.bullish}% Bull</span>
                           <span className="text-neutral-warning">{result.probabilities.sideways}% Chop</span>
                           <span className="text-bearish">{result.probabilities.bearish}% Bear</span>
                         </div>
                       </div>
                    </div>
                    
                    <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6 flex flex-col justify-center items-center text-center relative col-span-1 md:col-span-2">
                       <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-2">Master Oracle Confidence</p>
                       <div className="flex items-end gap-2">
                         <span className="text-5xl font-black text-white leading-none">{result.masterScore}</span>
                         <span className="text-xl text-text-muted font-bold mb-1">/ 100</span>
                       </div>
                       <p className="text-xs text-text-muted mt-3">Statistical certainty based on multi-engine alignment.</p>
                       
                       <div className="absolute top-4 right-4 flex gap-2">
                         <span className="bg-bg-card border border-border-default px-2 py-1 rounded text-[10px] font-mono">{pair}</span>
                         <span className="bg-bg-card border border-border-default px-2 py-1 rounded text-[10px] font-mono">{timeframe}</span>
                       </div>
                    </div>
                 </div>
                 
                 {/* Breakdown Bars */}
                 <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Target size={14} /> Sub-Engine Consensus Vectors
                    </h3>
                    <div className="space-y-5">
                       {[
                         { id: "SMC (Smart Money)", s: result.breakdown.smcScore, icon: ShieldCheck, color: "rose" },
                         { id: "Pattern Recognition", s: result.breakdown.patternScore, icon: Activity, color: "amber" },
                         { id: "Technical Analysis", s: result.breakdown.taScore, icon: Zap, color: "primary" },
                         { id: "MTF (Multi-Timeframe)", s: result.breakdown.mtfScore, icon: BrainCircuit, color: "accent-violet" }
                       ].map(eng => {
                         const rawPct = (eng.s + 1) / 2 * 100; // Map -1..1 to 0..100 for visual bar
                         const I = eng.icon;
                         return (
                           <div key={eng.id}>
                             <div className="flex justify-between text-xs font-bold mb-2">
                               <span className="flex items-center gap-2 text-white"><I size={14} className={`text-${eng.color}-500`} /> {eng.id}</span>
                               <span className={eng.s > 0 ? "text-bullish" : eng.s < 0 ? "text-bearish" : "text-text-muted"}>
                                 {eng.s > 0 ? "BULLISH" : eng.s < 0 ? "BEARISH" : "NEUTRAL"} ({(Math.abs(eng.s)*100).toFixed(0)}%)
                               </span>
                             </div>
                             <div className="w-full h-2 bg-bg-card rounded-full overflow-hidden relative">
                               {/* Marker for zero (neutral) */}
                               <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-border-strong z-10" />
                               <motion.div 
                                 initial={{width:"50%"}} animate={{width:`${rawPct}%`}} 
                                 className={`h-full ${eng.s > 0 ? "bg-bullish" : "bg-bearish"}`} 
                               />
                             </div>
                           </div>
                         );
                       })}
                    </div>
                 </div>
                 
              </div>
              
              <div className="flex flex-col gap-6">
                 
                 {/* Trade Ticket */}
                 <div className={`border rounded-2xl p-6 ${
                    result.signal.action === "BUY" ? "bg-bullish/5 border-bullish/30" : 
                    result.signal.action === "SELL" ? "bg-bearish/5 border-bearish/30" : 
                    "bg-bg-surface border-border-subtle"
                 }`}>
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Oracle Trade Setup</h3>
                    
                    {result.signal.action === "WAIT" ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center px-4 bg-bg-card rounded-xl border border-border-default">
                         <ShieldCheck size={32} className="text-neutral-warning mb-3" />
                         <p className="text-sm font-bold text-white mb-2">WAIT — Do Not Enter</p>
                         <p className="text-xs text-text-muted">Master Confidence is below threshold or engines contradict. Preserving capital.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-end mb-6">
                           <div>
                             <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Signal Directive</p>
                             <h4 className={`text-3xl font-black ${result.signal.action === "BUY" ? "text-bullish" : "text-bearish"}`}>
                               {result.signal.action}
                             </h4>
                           </div>
                           <div className="text-right">
                             <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Risk Assessed</p>
                             <span className="px-3 py-1 bg-bg-card border border-border-strong rounded-full text-[10px] font-bold text-white">{result.signal.riskLevel} Risk</span>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                           <div className="flex justify-between bg-bg-card p-3 rounded-lg border border-border-default">
                             <span className="text-xs text-text-muted font-bold uppercase">Open Entry</span>
                             <span className="text-xs text-white font-mono font-bold">{result.signal.entry}</span>
                           </div>
                           <div className="flex justify-between bg-bearish/10 p-3 rounded-lg border border-bearish/20">
                             <span className="text-xs text-bearish font-bold uppercase">Invalidation (SL)</span>
                             <span className="text-xs text-bearish font-mono font-bold">{result.signal.sl}</span>
                           </div>
                           
                           <div className="grid grid-cols-3 gap-2 mt-4">
                              <div className="bg-bullish/5 border border-bullish/20 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-text-muted font-bold uppercase">TP 1</p>
                                <p className="text-[11px] font-mono font-bold text-bullish">{result.signal.tp1}</p>
                              </div>
                              <div className="bg-bullish/5 border border-bullish/20 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-text-muted font-bold uppercase">TP 2</p>
                                <p className="text-[11px] font-mono font-bold text-bullish">{result.signal.tp2}</p>
                              </div>
                              <div className="bg-bullish/5 border border-bullish/20 p-2 rounded-lg text-center">
                                <p className="text-[9px] text-text-muted font-bold uppercase">TP 3</p>
                                <p className="text-[11px] font-mono font-bold text-bullish">{result.signal.tp3}</p>
                              </div>
                           </div>
                        </div>
                        
                        <Link href={`/charts/${pair.replace("/", "_")}`} className="w-full mt-6 bg-bg-card hover:bg-bg-elevated border border-border-strong text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
                           View Live Chart <ArrowRight size={14} />
                        </Link>
                      </>
                    )}
                 </div>
                 
                 {/* XAI Reasoning */}
                 <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Info size={14} /> XAI Reasoning System
                    </h3>
                    <div className="space-y-3">
                       {result.explanation.map((exp, i) => (
                         <div key={i} className="bg-bg-card p-3 rounded-lg border border-border-default border-l-2 border-l-primary-500 text-[11px] text-text-muted leading-relaxed">
                            {exp}
                         </div>
                       ))}
                    </div>
                 </div>
                 
              </div>
           </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
