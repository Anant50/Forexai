"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Network, Loader2, Play, AlertCircle, BarChart2, Zap, Target, Columns, 
  Activity, CheckCircle2, ChevronDown, ChevronRight, ShieldCheck, Waves
} from "lucide-react";
import type { OHLCV } from "@/lib/analysis/engine";
import { runMTFAnalysis, type MTFConsensus, type MacroBias } from "@/lib/analysis/mtf";
import MTFMatrixCard from "./components/MTFMatrixCard";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M"];
const PAIRS = ["EUR_USD", "GBP_USD", "USD_JPY", "BTC_USDT", "ETH_USDT", "XAU_USD"];

export default function MTFStudioPage() {
  const [selectedPair, setSelectedPair] = useState("EUR_USD");
  const [selectedTfs, setSelectedTfs] = useState<string[]>(["5m", "15m", "1h", "4h"]);
  
  const [status, setStatus] = useState<"idle" | "fetching" | "analyzing" | "done">("idle");
  const [consensus, setConsensus] = useState<MTFConsensus | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleTf = (tf: string) => {
    setSelectedTfs(prev => 
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf].sort((a,b) => TIMEFRAMES.indexOf(a) - TIMEFRAMES.indexOf(b))
    );
  };

  const handleRunMTF = useCallback(async () => {
    if (selectedTfs.length === 0) {
      setErrorMsg("Please select at least one timeframe.");
      return;
    }
    setErrorMsg("");
    setStatus("fetching");
    setConsensus(null);

    const symbol = selectedPair.replace(/[\/_]/g, "").concat(selectedPair.includes("USDT") ? "" : "T").toUpperCase().replace("TT", "T");
    const tfMap: Record<string, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d", "1w": "1w", "1M": "1M" };

    try {
      // Async Promise.all concurrent fetching for all timeframes
      const fetchPromises = selectedTfs.map(async (tf) => {
        const binanceTf = tfMap[tf];
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceTf}&limit=300`);
        if (!res.ok) throw new Error(`Binance error on ${binanceTf}`);
        const data = await res.json();
        
        const ohlcv: OHLCV[] = data.map((d: any) => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));
        
        return { timeframe: tf, data: ohlcv };
      });

      const datasets = await Promise.all(fetchPromises);
      
      setStatus("analyzing");
      // Let React render UI change before blocking cpu
      await new Promise(r => setTimeout(r, 150));
      
      const result = runMTFAnalysis(selectedPair, datasets);
      setConsensus(result);
      setStatus("done");
      
    } catch (e: any) {
      setErrorMsg("Failed to fetch data or process matrices. " + e.message);
      setStatus("idle");
    }
  }, [selectedPair, selectedTfs]);

  // Color mapping helpers
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

  return (
    <div className="flex flex-col gap-6 max-w-[1240px] mx-auto w-full pb-10 min-h-screen">
      
      {/* ── HEADER & CONTROLS ── */}
      <div className="bg-bg-surface border border-border-subtle rounded-2xl shadow-lg p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Network size={22} className="text-primary-500" /> Multi-Timeframe Studio
            </h1>
            <p className="text-xs text-text-muted mt-1 max-w-md">
              Run independent AI structural, trend, and pattern analysis across infinite timeframes concurrently.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Pair Selector */}
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="bg-bg-card border border-border-default text-white text-sm font-bold rounded-lg px-3 py-2 outline-none w-full sm:w-auto"
            >
              {PAIRS.map(p => <option key={p} value={p}>{p.replace("_", "/")}</option>)}
            </select>
            
            {/* Run Button */}
            <button
              onClick={handleRunMTF}
              disabled={status === "fetching" || status === "analyzing" || selectedTfs.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-xs shadow-md transition disabled:opacity-50"
            >
              {status === "fetching" || status === "analyzing" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {status === "fetching" ? "Fetching Data..." : status === "analyzing" ? "Analyzing matrices..." : "Run MTF Analysis"}
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-border-default pt-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><Columns size={12}/> Target Timeframes</p>
          <div className="flex flex-wrap items-center gap-2">
            {TIMEFRAMES.map(tf => {
              const active = selectedTfs.includes(tf);
              return (
                <button
                  key={tf}
                  onClick={() => toggleTf(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border ${
                    active ? "bg-primary-500/20 text-primary-400 border-primary-500/50" : "bg-bg-card text-text-muted border-border-default hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
          {errorMsg && <p className="text-xs text-bearish mt-3 flex items-center gap-1"><AlertCircle size={12}/>{errorMsg}</p>}
        </div>
      </div>

      {/* ── RESULTS AREA ── */}
      <AnimatePresence mode="wait">
        
        {status === "idle" && !consensus && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center text-text-muted">
            <Network size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-text-secondary">Ready for Multi-Timeframe Confluence</h3>
            <p className="text-sm max-w-sm mt-2">Select your custom timeframe combination above and execute the AI kernel array.</p>
          </motion.div>
        )}

        {(status === "fetching" || status === "analyzing") && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
               <div className="w-20 h-20 rounded-full border-4 border-border-strong border-t-primary-500 animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center"><Network size={24} className="text-primary-500" /></div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{status === "fetching" ? "Synchronizing Timeframes..." : "Resolving Matrices..."}</h3>
            <p className="text-xs text-text-muted font-mono">{selectedTfs.join(" | ")}</p>
          </motion.div>
        )}

        {status === "done" && consensus && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* 1. TOP OVERVIEW CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Macro Consensus Score */}
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><Activity size={80} /></div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Macro Agreement Score</h3>
                <div className="relative w-36 h-36 flex items-center justify-center my-2">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-border-strong" />
                    <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none"
                      strokeDasharray={`${263.9 * (consensus.agreementScore/100)} 263.9`}
                      className={biasColor[consensus.overallBias]} strokeLinecap="round" style={{ transition: "all 1.5s ease-out" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white leading-none">{consensus.agreementScore}%</span>
                  </div>
                </div>
                <div className={`mt-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest ${biasBg[consensus.overallBias]} ${biasColor[consensus.overallBias]}`}>
                  {consensus.overallBias}
                </div>
              </div>

              {/* Scenario Generator */}
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5"><BarChart2 size={13}/> Probability Vector</h3>
                  <div className="space-y-4">
                    {[
                      { l: "Bullish Accumulation",  v: consensus.scenarios.bullish, c: "bg-bullish" },
                      { l: "Sideways Equilibrium",  v: consensus.scenarios.sideways, c: "bg-neutral-warning" },
                      { l: "Bearish Distribution",  v: consensus.scenarios.bearish, c: "bg-bearish" }
                    ].map(s => (
                      <div key={s.l}>
                        <div className="flex justify-between text-[11px] font-bold text-white mb-1"><span className="text-text-secondary">{s.l}</span><span>{s.v}%</span></div>
                        <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${s.v}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className={`h-full ${s.c} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] text-text-muted leading-relaxed mt-4 bg-bg-card p-2.5 rounded-lg border border-border-default">
                  Derived using Bayesian integration of exponential timeframe weights and structural alignment matching.
                </p>
              </div>

              {/* Trade Oracle */}
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-md">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5"><Target size={13}/> AI Trade Oracle</h3>
                {consensus.tradeSetup.action === "WAIT" ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-border-default flex items-center justify-center">
                      <ShieldCheck size={20} className="text-text-muted" />
                    </div>
                    <p className="text-sm font-bold text-text-secondary">Patience Recommended</p>
                    <p className="text-[10px] text-text-muted text-center leading-relaxed">Agreement score ({consensus.agreementScore}%) did not cross the 65% confluence threshold necessary for safe directional bias setup generation.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`flex justify-between items-center px-3 py-2 border rounded-lg ${biasBg[consensus.overallBias]}`}>
                       <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Directives</span>
                       <span className={`text-sm font-black uppercase ${biasColor[consensus.overallBias]}`}>{consensus.tradeSetup.action}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-bg-card border border-border-default rounded-lg p-2.5">
                         <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Entry Target</p>
                         <p className="text-sm font-mono font-bold text-white">{consensus.tradeSetup.entry}</p>
                       </div>
                       <div className="bg-bg-card border border-bearish/20 rounded-lg p-2.5">
                         <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Stop Loss</p>
                         <p className="text-sm font-mono font-bold text-bearish">{consensus.tradeSetup.sl}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                          { l: "TP1", v: consensus.tradeSetup.tp1 },
                          { l: "TP2", v: consensus.tradeSetup.tp2 },
                          { l: "TP3", v: consensus.tradeSetup.tp3 },
                        ].map(tp => (
                          <div key={tp.l} className="bg-bg-card border border-bullish/15 rounded-lg p-2 text-center">
                             <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-0.5">{tp.l}</p>
                             <p className="text-[10px] font-mono font-bold text-bullish">{tp.v}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* 2. MATRICES */}
            <MTFMatrixCard results={consensus.results} />

            {/* 3. S/R CONFLUENCE ZONES */}
            <div className="bg-bg-surface border border-border-subtle rounded-xl shadow-md p-5">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Waves size={13} className="text-primary-500" /> S/R Overlap Matrix (Max ±0.2% Variance)
              </h3>
              
              {consensus.confluenceZones.length === 0 ? (
                <p className="text-xs text-text-muted py-4">No overlapping Supply/Demand zones detected across the requested timeframes.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {consensus.confluenceZones.map((z, i) => (
                    <div key={i} className="flex flex-col bg-bg-card border border-border-default rounded-lg p-3 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${z.type === "SUPPORT" ? "bg-bullish" : "bg-bearish"}`} />
                      <div className="pl-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-mono font-black text-white">{z.price.toFixed(5)}</span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            z.type === "SUPPORT" ? "text-bullish bg-bullish/10 border-bullish/20" : "text-bearish bg-bearish/10 border-bearish/20"
                          }`}>{z.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {z.overlappingTfs.map(tf => (
                            <span key={tf} className="text-[9px] font-mono bg-bg-surface border border-border-strong px-1.5 rounded text-text-muted">{tf}</span>
                          ))}
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[9px] text-text-muted mb-1"><span>Confluence Strength</span><span>{z.strength}%</span></div>
                          <div className="h-1 bg-border-strong rounded-full overflow-hidden">
                            <div className={`h-full ${z.type === "SUPPORT" ? "bg-bullish" : "bg-bearish"} opacity-80`} style={{ width: `${z.strength}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
