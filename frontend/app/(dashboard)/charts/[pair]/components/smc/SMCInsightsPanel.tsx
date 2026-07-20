"use client";

import { motion } from "framer-motion";
import { Zap, Target, Activity, CheckCircle2, ChevronRight, ShieldCheck, Droplet, MoveDownRight, MoveUpRight, AlertTriangle } from "lucide-react";
import type { SMCAnalysis } from "@/lib/analysis/smc";

interface Props {
  result: SMCAnalysis;
}

export default function SMCInsightsPanel({ result }: Props) {
  const biasColor = {
    BULLISH: "text-bullish",
    BEARISH: "text-bearish",
    NEUTRAL: "text-neutral-warning"
  };
  const biasBg = {
    BULLISH: "bg-bullish/10 border-bullish/30",
    BEARISH: "bg-bearish/10 border-bearish/30",
    NEUTRAL: "bg-neutral-warning/10 border-neutral-warning/30"
  };

  const activeFVGs = result.fvgs.filter(f => !f.mitigated).length;
  const activeOBs = result.orderBlocks.filter(o => !o.mitigated).length;
  const sweptLiq = result.liquidity.filter(l => l.swept).length;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[600px]">
      
      {/* Header */}
      <div className={`px-4 py-3.5 border-b border-border-default bg-gradient-to-b ${
        result.overallBias === "BULLISH" ? "from-bullish/5 border-bullish/20" : result.overallBias === "BEARISH" ? "from-bearish/5 border-bearish/20" : "from-border-default border-border-strong"
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap size={14} className="text-primary-400" /> SMC Insights
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted bg-bg-card/60 px-2 py-0.5 rounded">{result.pair} · {result.timeframe}</span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${biasColor[result.overallBias]} ${biasBg[result.overallBias]}`}>
              {result.overallBias}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-bg-card scrollbar-thumb-border-strong">
        
        {/* Institutional Score & Scenarios */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-card border border-border-default rounded-xl p-3 flex flex-col justify-center items-center relative overflow-hidden">
             <div className="absolute top-1 right-2 opacity-10"><Activity size={40} /></div>
             <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1 font-bold z-10">Inst. Score</p>
             <p className={`text-3xl font-black z-10 ${result.institutionalScore > 75 ? "text-primary-400" : result.institutionalScore > 40 ? "text-neutral-warning" : "text-text-muted"}`}>
               {result.institutionalScore}
             </p>
          </div>
          <div className="bg-bg-card border border-border-default rounded-xl p-3 flex flex-col gap-1.5 justify-center">
            {[
              { l: "Bullish",  v: result.scenarios.bullish, c: "bg-bullish" },
              { l: "Sideways", v: result.scenarios.sideways, c: "bg-neutral-warning" },
              { l: "Bearish",  v: result.scenarios.bearish, c: "bg-bearish" }
            ].map(s => (
              <div key={s.l}>
                 <div className="flex justify-between text-[9px] font-bold text-white mb-0.5"><span className="text-text-muted">{s.l}</span><span>{s.v}%</span></div>
                 <div className="h-1 bg-bg-surface rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${s.v}%` }} className={`h-full ${s.c}`} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* SMC Struct Stats */}
        <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Active OBs", v: activeOBs, i: <ShieldCheck size={11} className="text-text-muted"/> },
              { l: "Open FVGs", v: activeFVGs, i: <Zap size={11} className="text-text-muted"/> },
              { l: "Sweeps", v: sweptLiq, i: <Droplet size={11} className="text-text-muted"/> },
            ].map(s => (
              <div key={s.l} className="bg-bg-surface rounded-lg p-2.5 border border-border-default border-dashed flex flex-col items-center justify-center text-center">
                 <div className="mb-1">{s.i}</div>
                 <p className="text-lg font-bold text-white leading-none mb-0.5">{s.v}</p>
                 <p className="text-[9px] text-text-muted uppercase tracking-wider">{s.l}</p>
              </div>
            ))}
        </div>

        {/* XAI Explainer */}
        <div className="bg-bg-surface rounded-lg p-3 space-y-2 border border-border-default">
           <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-primary-500" /> AI Explainer
           </h4>
           {result.explanation.map((line, i) => (
             <div key={i} className="flex items-start gap-1.5">
               <ChevronRight size={10} className="text-text-muted mt-0.5 flex-shrink-0" />
               <p className="text-[10px] text-text-muted leading-relaxed">{line}</p>
             </div>
           ))}
        </div>

        {/* Trade Setup */}
        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mt-2">
             <Target size={11} className="text-primary-500" /> Optimal Trade Entry (OTE)
        </h4>
        
        {result.tradeSetup.action === "WAIT" ? (
           <div className="flex flex-col items-center py-6 gap-2 text-center bg-bg-card border border-border-default rounded-xl">
             <ShieldCheck size={20} className="text-text-muted" />
             <p className="text-sm font-bold text-text-secondary">No Institutional Setup</p>
             <p className="text-[10px] text-text-muted px-4">Awaiting unmitigated Order Blocks with structurally aligned momentum.</p>
           </div>
        ) : (
           <div className="space-y-2">
             <div className={`rounded-xl border p-3 flex items-center justify-between ${biasBg[result.overallBias]}`}>
                <div>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Setup Directive</p>
                  <p className={`text-sm font-black ${biasColor[result.overallBias]} flex items-center gap-1.5 mt-0.5`}>
                     {result.tradeSetup.action === "LONG" ? <MoveUpRight size={14}/> : <MoveDownRight size={14}/>} {result.tradeSetup.action}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">R:R</p>
                  <p className={`text-sm font-black ${biasColor[result.overallBias]} mt-0.5`}>{result.tradeSetup.rr}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg-card border border-border-default rounded-lg p-2.5">
                   <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">Entry Zone</p>
                   <p className="text-xs font-mono font-bold text-white">{result.tradeSetup.entry}</p>
                </div>
                <div className="bg-bg-card border border-bearish/20 rounded-lg p-2.5">
                   <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">Stop Loss</p>
                   <p className="text-xs font-mono font-bold text-bearish">{result.tradeSetup.sl}</p>
                </div>
             </div>
             <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "TP1", v: result.tradeSetup.tp1 },
                  { l: "TP2", v: result.tradeSetup.tp2 },
                  { l: "TP3", v: result.tradeSetup.tp3 },
                ].map(tp => (
                  <div key={tp.l} className="bg-bg-card border border-bullish/15 rounded-lg p-2 text-center">
                     <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-1">{tp.l}</p>
                     <p className="text-[10px] font-mono font-bold text-bullish">{tp.v}</p>
                  </div>
                ))}
             </div>
           </div>
        )}

        <div className="flex items-start gap-2 p-2.5 bg-bg-card border border-border-default rounded-lg">
           <AlertTriangle size={12} className="text-neutral-warning mt-0.5 flex-shrink-0" />
           <p className="text-[9px] text-text-muted leading-relaxed">
             Based on ICT / Smart Money logic. Not financial advice. Wait for lower timeframe reaction (CHoCH) inside POI zones.
           </p>
        </div>

      </div>
    </div>
  );
}
