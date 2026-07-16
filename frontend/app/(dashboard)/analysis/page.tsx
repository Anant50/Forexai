"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid
} from "recharts";
import { 
  MoreHorizontal, BrainCircuit, Activity, Info
} from "lucide-react";

// Mock Data targeting the SHAP chart image 
const shapData = [
  { name: 'RSI Divergence', value: 0.8 },
  { name: 'MACD Crossover', value: 0.4 },
  { name: 'Feature A', value: 0.2 },
  { name: 'Feature B', value: -0.1 },
  { name: 'Indicator C', value: -0.2 },
  { name: 'Market Info', value: -0.3 },
  { name: 'News Sentiment', value: -0.9 },
];

export default function Analysis() {
  const [pair, setPair] = useState("EUR/USD");

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-default/40">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
          <span>AI Analysis — {pair}</span>
        </h1>
        <span className="text-xs text-text-muted font-mono">{new Date().toUTCString()}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        
        {/* LEFT COLUMN (40%) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Signal Card */}
          <div className="bg-bg-card border border-border-default/50 rounded-xl p-6 glass-panel relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-bullish/10 to-transparent z-0 relative" />
            <div className="flex gap-6 items-center z-10 relative">
              {/* Fake Progress Ring */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center rounded-full border-4 border-border-default bg-bg-surface/50">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border-subtle" />
                  <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="264" strokeDashoffset="71" className="text-bullish drop-shadow-md" />
                </svg>
                <span className="text-xl font-bold text-white relative z-10">73%</span>
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-bullish drop-shadow-sm">BULLISH SIGNAL</h2>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">Your signal signal is confirm a 73% confidence current signal.</p>
                <div className="mt-3 inline-block px-3 py-1 rounded bg-bg-surface border border-border-subtle text-[10px] uppercase font-semibold text-text-muted">Not financial advice</div>
              </div>
            </div>
          </div>

          {/* Multi-Timeframe Analysis */}
          <div className="bg-bg-card border border-border-default/40 rounded-xl p-5">
            <h3 className="text-xs font-bold text-white mb-4">Multi-Timeframe Analysis</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-[60px_1fr_40px] items-center gap-3 text-xs">
                <span className="font-semibold text-text-secondary">1H: <span className="text-bullish">BULLISH</span></span>
                <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden w-full"><div className="h-full bg-bullish w-[78%]" /></div>
                <span className="text-right font-mono text-text-primary">78%</span>
              </div>
              <div className="grid grid-cols-[60px_1fr_40px] items-center gap-3 text-xs">
                <span className="font-semibold text-text-secondary">4H: <span className="text-bullish">BULLISH</span></span>
                <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden w-full"><div className="h-full bg-bullish w-[71%]" /></div>
                <span className="text-right font-mono text-text-primary">71%</span>
              </div>
              <div className="grid grid-cols-[60px_1fr_40px] items-center gap-3 text-xs">
                <span className="font-semibold text-text-secondary">Daily: <span className="text-text-muted">NEUTRAL</span></span>
                <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden w-full"><div className="h-full bg-text-muted w-[52%]" /></div>
                <span className="text-right font-mono text-text-primary">52%</span>
              </div>
            </div>
          </div>

          {/* Indicator Analysis */}
          <div className="bg-bg-card border border-border-default/40 rounded-xl p-5 relative overflow-hidden flex flex-col h-[340px]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-white">Indicator Analysis</h3>
               <MoreHorizontal size={14} className="text-text-muted" />
             </div>
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full text-xs text-left">
                  <thead className="text-text-muted border-b border-border-subtle sticky top-0 bg-bg-card z-10">
                    <tr>
                      <th className="font-medium pb-2">Name</th>
                      <th className="font-medium pb-2 text-right">Current Value</th>
                      <th className="font-medium pb-2 text-center">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/30 font-mono">
                    {[
                      { n: "EMA 20", v: "32.990", s: "bullish" },
                      { n: "MACD Main", v: "0.25", s: "bullish" },
                      { n: "RSI 14", v: "13.25%", s: "neutral" },
                      { n: "Bollinger B", v: "1.0844", s: "bearish" },
                      { n: "Stochastic", v: "82.551", s: "bearish" },
                      { n: "ATR 14", v: "0.0012", s: "neutral" },
                      { n: "Ichimoku", v: "10.80%", s: "bullish" },
                      { n: "ADX 14", v: "28.5", s: "bullish" },
                      { n: "VWAP", v: "1.082", s: "neutral" }
                    ].map((idx, i) => (
                      <tr key={i} className="group hover:bg-bg-surface/50 transition">
                        <td className="py-2 text-text-secondary">{idx.n}</td>
                        <td className="py-2 text-text-primary text-right">{idx.v}</td>
                        <td className="py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase tracking-wider
                            ${idx.s === 'bullish' ? 'bg-bullish/10 text-bullish border border-bullish/20' : 
                              idx.s === 'bearish' ? 'bg-bearish/10 text-bearish border border-bearish/20' : 
                              'bg-text-muted/10 text-text-muted border border-text-muted/20'}`}>
                            {idx.s}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>

          {/* Pattern Detection */}
          <div className="bg-bg-card border border-border-default/40 rounded-xl p-5">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-white">Pattern Detection</h3>
               <MoreHorizontal size={14} className="text-text-muted" />
             </div>
             <div className="space-y-3">
               <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Double Bottom <span className="text-bullish ml-1 font-bold">✓ 84%</span></span>
                  <div className="flex gap-1">
                     <span className="w-8 h-6 bg-bg-surface rounded border border-border-subtle flex items-center justify-center text-text-muted"><Activity size={12}/></span>
                     <span className="w-8 h-6 bg-bg-surface rounded border border-border-subtle flex items-center justify-center text-text-muted"><Activity size={12}/></span>
                  </div>
               </div>
               <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Bullish Engulfing <span className="text-bullish ml-1 font-bold">✓ 77%</span></span>
                  <div className="flex gap-1">
                     <span className="w-8 h-6 bg-bullish/10 rounded border border-bullish/20 flex items-center justify-center text-bullish"><Activity size={12}/></span>
                     <span className="w-8 h-6 bg-bg-surface rounded border border-border-subtle flex items-center justify-center text-text-muted"><Activity size={12}/></span>
                  </div>
               </div>
             </div>
          </div>

        </div>

        {/* RIGHT COLUMN (60%) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Top: Explanation */}
          <div className="bg-bg-card border border-border-default/40 rounded-xl p-5 relative">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-xs font-bold text-white">AI Explanation</h3>
               <MoreHorizontal size={14} className="text-text-muted" />
             </div>
             <p className="text-xs text-text-secondary leading-relaxed mb-4">
                The AI has historically defined the current signal analyzed the confidence measures. The entire macro context validates the confidence to be historically positive for long exposure signals. The execution process represents complex environment variables.
             </p>
             <h4 className="text-[11px] font-bold text-text-primary mb-2">Top 3 drivers influencing current signal:</h4>
             <ul className="text-xs text-text-secondary space-y-1.5 list-disc pl-4 marker:text-text-muted">
               <li>The MACD histogram shift denotes strong underlying buying pressure.</li>
               <li>Immense liquidity void filled at standard deviation support bands.</li>
               <li>Recent macro news aligns with European central bank rhetoric.</li>
             </ul>
          </div>

          {/* Middle: SHAP */}
          <div className="bg-bg-card border border-border-default/40 rounded-xl p-5 flex-1 relative flex flex-col min-h-[300px]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-white">SHAP Feature Importance</h3>
               <MoreHorizontal size={14} className="text-text-muted" />
             </div>
             <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shapData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#1E2D4A" />
                    <XAxis type="number" stroke="#475569" tick={{fill: '#94A3B8', fontSize: 10}} domain={[-1.0, 1.5]} />
                    <YAxis dataKey="name" type="category" stroke="#475569" tick={{fill: '#E2E8F0', fontSize: 10}} width={90} />
                    <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} contentStyle={{ backgroundColor: '#0F1629', borderColor: '#253556', fontSize: '11px', color: '#E2E8F0' }} />
                    <ReferenceLine x={0} stroke="#475569" />
                    <Bar dataKey="value" barSize={12}>
                      {shapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#3B82F6' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="absolute bottom-0 left-0 w-full text-center mt-2">
                  <span className="text-[10px] text-text-muted font-mono">Contribution Value</span>
                </div>
             </div>
          </div>

          {/* Bottom Grid: Risk & News */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-bg-card border border-border-default/40 rounded-xl p-5">
               <h3 className="text-xs font-bold text-white mb-4">Risk Parameters</h3>
               <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="bg-bg-surface p-2 rounded border border-border-subtle hover:border-border-default transition cursor-pointer">
                    <p className="text-[9px] text-text-muted uppercase mb-1">Entry</p>
                    <p className="text-text-primary font-bold">1.084</p>
                  </div>
                  <div className="bg-bg-surface p-2 rounded border border-border-subtle hover:border-border-default transition cursor-pointer">
                    <p className="text-[9px] text-text-muted uppercase mb-1">SL</p>
                    <p className="text-bearish font-bold">1.080</p>
                  </div>
                  <div className="bg-bg-surface p-2 rounded border border-border-subtle hover:border-border-default transition cursor-pointer">
                    <p className="text-[9px] text-text-muted uppercase mb-1">TP</p>
                    <p className="text-bullish font-bold">1.093</p>
                  </div>
                  <div className="bg-bg-surface p-2 rounded border border-border-subtle hover:border-border-default transition cursor-pointer">
                    <p className="text-[9px] text-text-muted uppercase mb-1">RR</p>
                    <p className="text-text-primary font-bold">1:3</p>
                  </div>
               </div>
            </div>

            <div className="bg-bg-card border border-border-default/40 rounded-xl p-5 relative">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-white">News Sentiment</h3>
                 <MoreHorizontal size={14} className="text-text-muted" />
               </div>
               <div className="grid grid-cols-2 gap-3 text-xs">
                 <div className="bg-bearish/5 border border-bearish/10 rounded-lg p-3">
                   <p className="text-text-secondary mb-1">USD</p>
                   <p className="text-bearish font-bold">-0.34 <span className="font-normal text-[10px] ml-1">Bearish</span></p>
                 </div>
                 <div className="bg-bullish/5 border border-bullish/10 rounded-lg p-3">
                   <p className="text-text-secondary mb-1">EUR</p>
                   <p className="text-bullish font-bold">+0.12 <span className="font-normal text-[10px] ml-1">Slightly Bullish</span></p>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-1">
            <button className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-8 rounded-lg shadow-glow-blue transition active:scale-95 text-xs">
              Add to Journal
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
