"use client";

import { useState } from "react";
import { api } from "@/lib/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Camera, 
  AlertTriangle,
  Info,
  ShieldCheck
} from "lucide-react";

export default function Analysis() {
  const [pair, setPair] = useState("EUR_USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await api.post<any>("/predictions/analyze", {
        pair: pair.replace("_", "/"),
        timeframe
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to parse forecast prediction. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">AI Inference Analysis</h1>
        <p className="text-xs text-text-secondary mt-1">Execute ensemble forecasting models on live forex charts with real-time XAI explainer diagnostics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings options panel */}
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-subtle text-text-primary">
            <BrainCircuit className="w-5 h-5 text-primary-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Inference Parameters</h2>
          </div>

          {/* Pair selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-extrabold tracking-widest text-text-secondary">Target Forex Pair</label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-primary-500 focus:outline-none transition"
            >
              <option value="EUR_USD">EUR/USD (Euro / US Dollar)</option>
              <option value="GBP_USD">GBP/USD (Pound / US Dollar)</option>
              <option value="USD_JPY">USD/JPY (US Dollar / Yen)</option>
              <option value="USD_CHF">USD/CHF (US Dollar / Franc)</option>
              <option value="GBP_JPY">GBP/JPY (Pound / Yen)</option>
            </select>
          </div>

          {/* Timeframe option */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-extrabold tracking-widest text-text-secondary">Timeframe Interval</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-bg-card border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-primary-500 focus:outline-none transition"
            >
              <option value="5m">5 Minutes (Scalping)</option>
              <option value="15m">15 Minutes (Intraday)</option>
              <option value="1h">1 Hour (Swing)</option>
              <option value="4h">4 Hours (Swing)</option>
              <option value="1d">1 Day (Position)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-lg shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 glow-blue"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing Inference...</span>
                </>
              ) : (
                <>
                  <BrainCircuit size={14} />
                  <span>Execute AI Forecast</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inference output results */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-bearish/10 border border-bearish/20 p-4 rounded-xl flex gap-3 text-xs text-bearish"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-extrabold uppercase tracking-wide">Analysis Request Failed</h4>
                  <p className="mt-1 text-text-secondary leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}

            {!data && !loading && !error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-bg-surface border border-dashed border-border-default rounded-xl p-8 text-center flex flex-col justify-center items-center h-[320px]"
              >
                <div className="p-3 rounded-full bg-bg-card border border-border-default text-text-muted mb-3">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">No Inference Loaded</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1.5">Configure your target currencies pair options and trigger the forecast engine to render probabilistic signals.</p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-bg-surface border border-border-subtle rounded-xl p-8 flex flex-col justify-center items-center h-[320px]"
              >
                <span className="w-10 h-10 border-3 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mb-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Running Ensemble Models</h3>
                <p className="text-xs text-text-muted max-w-xs text-center mt-1.5 leading-relaxed">Processing technical indicators overlays, currency sentiment logs, and generating SHAP explanation values...</p>
              </motion.div>
            )}

            {data && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Result KPI headers */}
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-border-default rounded-lg p-3.5 bg-bg-card flex flex-col justify-between">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Active Bias</span>
                    <span className={`text-base font-extrabold uppercase mt-1 flex items-center gap-1.5
                      ${data.direction === "long" ? "text-bullish" : "text-bearish"}`}
                    >
                      {data.direction === "long" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>{data.direction}</span>
                    </span>
                  </div>

                  <div className="border border-border-default rounded-lg p-3.5 bg-bg-card flex flex-col justify-between">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Confidence Score</span>
                    <span className={`text-base font-mono font-bold mt-1
                      ${data.confidence_value >= 70 ? "text-bullish" : "text-neutral-warning"}`}
                    >
                      {data.confidence_value.toFixed(1)}%
                    </span>
                  </div>

                  <div className="border border-border-default rounded-lg p-3.5 bg-bg-card flex flex-col justify-between">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest">Risk Reward Ratio</span>
                    <span className="text-base font-mono font-bold mt-1 text-text-primary">
                      1:{data.risk_reward.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Parameters panel */}
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-text-secondary border-b border-border-subtle pb-2 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#10B981]" />
                    <span>Target Parameters Execution</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                      <p className="text-[9px] uppercase tracking-wider text-text-muted">Target Entry</p>
                      <p className="text-xs font-extrabold mt-1 text-text-primary">{data.entry_price.toFixed(5)}</p>
                    </div>
                    <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                      <p className="text-[9px] uppercase tracking-wider text-text-muted">Stop Loss (SL)</p>
                      <p className="text-xs font-extrabold mt-1 text-bearish">{data.stop_loss.toFixed(5)}</p>
                    </div>
                    <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                      <p className="text-[9px] uppercase tracking-wider text-text-muted">Take Profit (TP)</p>
                      <p className="text-xs font-extrabold mt-1 text-bullish">{data.take_profit.toFixed(5)}</p>
                    </div>
                    <div className="bg-bg-card p-3 rounded-lg border border-border-default">
                      <p className="text-[9px] uppercase tracking-wider text-text-muted">Max Account Risk</p>
                      <p className="text-xs font-extrabold mt-1 text-text-primary">{data.account_risk_pct}%</p>
                    </div>
                  </div>
                </div>

                {/* Explanation and SHAP graphs */}
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#E2E8F0] border-b border-border-subtle pb-2 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-primary-400" />
                    <span>XAI Explanation Narrative</span>
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-card border border-border-default p-4 rounded-xl">
                    {data.ai_narrative}
                  </p>

                  {/* SHAP indicator contributions simulation */}
                  <div className="space-y-3.5 pt-2">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted flex items-center gap-1">
                      <Info size={11} />
                      <span>Feature Importances (SHAP Contributions)</span>
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-text-primary font-semibold">RSI Divergence</span>
                          <span className="text-bullish font-bold">+35%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-bullish rounded-full" style={{ width: "35%" }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-text-primary font-semibold">MACD Histogram Crossover</span>
                          <span className="text-bullish font-bold">+28%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-bullish rounded-full" style={{ width: "28%" }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-text-primary font-semibold">Market News Sentiment Index</span>
                          <span className="text-neutral-warning font-bold">+15%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-neutral-warning rounded-full" style={{ width: "15%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
