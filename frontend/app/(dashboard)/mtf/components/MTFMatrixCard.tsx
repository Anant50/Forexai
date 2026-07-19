"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Layers, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TimeframeResult, MacroBias } from "@/lib/analysis/mtf";

interface Props {
  results: TimeframeResult[];
}

const getBiasStyles = (bias: string) => {
  if (bias.includes("BULL") || bias === "HH/HL") return "text-bullish bg-bullish/10 border-bullish/30";
  if (bias.includes("BEAR") || bias === "LH/LL") return "text-bearish bg-bearish/10 border-bearish/30";
  return "text-neutral-warning bg-neutral-warning/10 border-neutral-warning/30";
};

const BiasCell = ({ val }: { val: string }) => {
  if (!val || val === "None") return <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">—</span>;
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${getBiasStyles(val)}`}>
      {val}
    </span>
  );
};

export default function MTFMatrixCard({ results }: Props) {
  return (
    <div className="bg-bg-card border border-border-default rounded-xl shadow-md overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Layers size={14} className="text-primary-500" /> Consensus Matrices
        </h3>
      </div>
      
      <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border-strong">
        <table className="w-full text-left min-w-[500px]">
          <thead>
            <tr className="bg-bg-surface border-b border-border-strong">
              <th className="py-2.5 px-4 text-[9px] font-bold text-text-muted uppercase tracking-wider w-1/4">Metric</th>
              {results.map(r => (
                <th key={r.timeframe} className="py-2.5 px-3 text-[10px] font-mono text-white w-24 text-center">
                  {r.timeframe}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            
            {/* Trend Row */}
            <tr className="hover:bg-bg-elevated/30 transition">
              <td className="py-3 px-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-secondary tracking-wide">
                <TrendingUp size={11} className="text-text-muted" /> Macro Trend
              </td>
              {results.map(r => (
                <td key={r.timeframe} className="py-3 px-3 text-center align-middle">
                  <BiasCell val={r.trend} />
                </td>
              ))}
            </tr>

            {/* Structure Row */}
            <tr className="hover:bg-bg-elevated/30 transition">
              <td className="py-3 px-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-secondary tracking-wide">
                <Layers size={11} className="text-text-muted" /> Market Structure
              </td>
              {results.map(r => (
                <td key={r.timeframe} className="py-3 px-3 text-center align-middle">
                  <BiasCell val={r.structure} />
                </td>
              ))}
            </tr>

            {/* Pattern Row */}
            <tr className="hover:bg-bg-elevated/30 transition">
              <td className="py-3 px-4 flex items-center gap-1.5 text-[10px] uppercase font-bold text-text-secondary tracking-wide">
                <CheckCircle2 size={11} className="text-text-muted" /> Top AI Pattern
              </td>
              {results.map(r => (
                <td key={r.timeframe} className="py-3 px-3 text-center align-middle">
                  {r.topPattern ? (
                     <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-white font-bold truncate max-w-[80px]" title={r.topPattern}>{r.topPattern}</span>
                        <BiasCell val={r.patternBias} />
                     </div>
                  ) : <BiasCell val="None" />}
                </td>
              ))}
            </tr>
            
          </tbody>
        </table>
      </div>
    </div>
  );
}
