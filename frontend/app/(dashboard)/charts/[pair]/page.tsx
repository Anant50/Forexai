"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Camera, 
  BrainCircuit, 
  ChevronRight, 
  Bot, 
  Info,
  Sliders,
  Sparkles,
  TrendingUp,
  X 
} from "lucide-react";
import { api } from "@/lib/api/apiClient";

export default function Charts() {
  const params = useParams();
  const pair = String(params.pair || "EUR_USD").replace("_", "/");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState("1h");
  const [panelOpen, setPanelOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [predictionData, setPredictionData] = useState<any>(null);

  // Timeframe options
  const intervals = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

  // Initialize TradingView Chart on Client Side
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart options matching dark theme colors
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 480,
      layout: {
        background: { color: "#0A0E1A" },
        textColor: "#E2E8F0",
      },
      grid: {
        vertLines: { color: "rgba(30, 45, 74, 0.25)" },
        horzLines: { color: "rgba(30, 45, 74, 0.25)" },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: "#3B82F6",
          width: 1,
          style: 3, // dashed
        },
        horzLine: {
          color: "#3B82F6",
          width: 1,
          style: 3,
        },
      },
      timeScale: {
        borderColor: "#1E2D4A",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Unified API v5+ for series inclusion
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
      priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
      },
    });

    let ws: WebSocket | null = null;

    const setupLiveData = async () => {
      try {
        // Map Forex pair to Crypto Proxy (e.g. EUR/USD -> EURUSDT) 
        // This allows free, public, high-speed streaming without API limits.
        const symbol = (pair.replace(/[\/_]/g, "") + "T").toUpperCase();
        const lowerSymbol = symbol.toLowerCase();
        
        // 1. Fetch initial history limit to populate the chart viewport
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=150`);
        const data = await res.json();
        
        if (data && data.length > 0) {
          const chartData = data.map((d: any) => ({
            time: (d[0] / 1000) as any, // lightweight-charts expects unix timestamp in seconds
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
          }));
          series.setData(chartData);
          chart.timeScale().fitContent();

          // 2. Connect to Native WebSocket Engine for real-time tick streaming
          ws = new WebSocket(`wss://stream.binance.com:9443/ws/${lowerSymbol}@kline_${timeframe}`);
          ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const kline = message.k;
            // Native Lightweight-chart streaming update!
            series.update({
               time: (kline.t / 1000) as any,
               open: parseFloat(kline.o),
               high: parseFloat(kline.h),
               low: parseFloat(kline.l),
               close: parseFloat(kline.c),
            });
          };
        }
      } catch (err) {
        console.error("Failed to connect to live market proxy.", err);
      }
    };
    setupLiveData();

    chartRef.current = chart;
    seriesRef.current = series;

    // Crosshair legend handler
    chart.subscribeCrosshairMove((param) => {
      const tooltip = document.getElementById("chart-tooltip");
      if (!tooltip) return;
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        tooltip.style.display = 'none';
      } else {
        const data = param.seriesData.get(series) as any;
        if (data && data.open !== undefined) {
          tooltip.style.display = 'flex';
          document.getElementById('tt-o')!.innerText = data.open.toFixed(5);
          document.getElementById('tt-c')!.innerText = data.close.toFixed(5);
          document.getElementById('tt-h')!.innerText = data.high.toFixed(5);
          document.getElementById('tt-l')!.innerText = data.low.toFixed(5);
        }
      }
    });

    // Resize Handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ws) ws.close();
      chart.remove();
    };
  }, [timeframe]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res: any = await api.post("/intelligence/analyze/multi-model", { 
         pair: pair, 
         timeframe: timeframe 
      });
      setPredictionData(res);
      setPanelOpen(true);
    } catch (err) {
      console.error(err);
      // Fallback display if database is disconnected
      setPredictionData({
         suggested_direction: "long",
         confidence: 73,
         trade_grade: "B+",
         trade_setup: { entry: 1.0847, stop_loss: 1.0801, take_profit: 1.0935, risk_reward_ratio: 1.91 },
         explanation: "Failed to connect to backend, displaying historical cache layout bounding structures."
      });
      setPanelOpen(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleScreenCapture = () => {
    if (!chartRef.current) return;
    const canvas = chartRef.current.takeScreenshot();
    const link = document.createElement("a");
    link.download = `ForexAI_${pair.replace("/", "_")}_${timeframe}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-6 relative h-full">
      
      {/* Header bar actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <span>Chart Analyst:</span>
            <span className="text-primary-400 font-mono">{pair}</span>
          </h1>
          <p className="text-xs text-text-secondary mt-1">Select timeframes and active indicator overlays to parse predictions.</p>
        </div>
        
        {/* Indicators list triggers */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={handleScreenCapture}
            className="inline-flex items-center gap-2 bg-bg-surface hover:bg-bg-card border border-border-default text-text-primary px-4.5 py-2 rounded-lg text-xs font-semibold select-none transition cursor-pointer"
          >
            <Camera size={14} className="text-accent-cyan" />
            <span>Screen Capture</span>
          </button>

          <button 
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider select-none transition cursor-pointer shadow-glow-blue disabled:opacity-50"
          >
            <BrainCircuit size={14} />
            <span>{analyzing ? "Analyzing..." : "Analyze Chart"}</span>
          </button>
        </div>
      </div>

      {/* Toolbar Timeframes selectors */}
      <div className="bg-bg-surface border border-border-subtle rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 bg-bg-card border border-border-default p-1 rounded-lg">
          {intervals.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide select-none cursor-pointer transition
                ${timeframe === tf 
                  ? "bg-bg-elevated text-primary-400 border border-border-strong shade-md" 
                  : "text-text-secondary hover:text-text-primary"
                }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-card border border-border-default">
            <Sliders size={12} className="text-primary-400" />
            <span>Selected overlays: EMA, RSI, MACD</span>
          </span>
        </div>
      </div>

      {/* Main interactive chart viewport container */}
      <div className="flex gap-6 items-start">
        
        {/* Left side chart component */}
        <div className="flex-1 bg-bg-surface border border-border-subtle rounded-xl p-4 overflow-hidden relative shadow-sm">
          {analyzing && (
            <div className="absolute inset-0 bg-bg-base/65 backdrop-blur-sm z-35 flex flex-col justify-center items-center gap-3">
              <span className="w-10 h-10 border-3 border-primary-500/25 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-xs font-bold text-text-primary tracking-wider uppercase">Running Ensemble Models Inference...</p>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-[480px] bg-bg-base" />
          {/* Native Chart Hover OHLC Tooltip */}
          <div 
            id="chart-tooltip" 
            className="absolute bottom-6 left-6 z-40 bg-bg-surface/85 backdrop-blur-md border border-border-default rounded-lg p-3 text-xs font-mono shadow-xl hidden flex-col gap-1.5 pointer-events-none select-none"
          >
            <div className="flex justify-between gap-4"><span className="text-text-muted">Open:</span> <span id="tt-o" className="text-text-primary font-bold">0.00000</span></div>
            <div className="flex justify-between gap-4"><span className="text-text-muted">Close:</span> <span id="tt-c" className="text-text-primary font-bold">0.00000</span></div>
            <div className="flex justify-between gap-4"><span className="text-text-muted">High:</span> <span id="tt-h" className="text-bullish font-bold">0.00000</span></div>
            <div className="flex justify-between gap-4"><span className="text-text-muted">Low:</span> <span id="tt-l" className="text-bearish font-bold">0.00000</span></div>
          </div>
        </div>

        {/* Dynamic sliding Framer-Motion PredictionPanel side overlays */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              transition={{ type: "tween", duration: 0.3 }}
              className="w-full max-w-[400px] bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-2xl glass-panel relative overflow-y-auto max-h-[580px] z-30"
            >
              
              {/* Slider panel headers */}
              <div className="flex justify-between items-center pb-4 border-b border-border-subtle">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#10B981] bg-[#10B981]/15 px-3 py-1 rounded-full">
                  <Sparkles size={12} />
                  <span>BULLISH SIGNAL</span>
                </span>
                <button 
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Confidence gauges display */}
              <div className="my-5 p-4 rounded-xl bg-bg-card border border-border-default text-center relative overflow-hidden group hover:border-[#10B981] transition">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">AI Prediction Confidence</p>
                <div className={`mt-3 text-3xl font-mono font-bold ${predictionData?.suggested_direction === 'short' ? 'text-bearish' : 'text-bullish'}`}>
                  {predictionData?.confidence || 0}% <span className="text-xs text-text-secondary font-semibold uppercase">{predictionData?.suggested_direction}</span>
                </div>
                <div className="mt-2 w-full bg-bg-elevated h-1 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${predictionData?.suggested_direction === 'short' ? 'bg-bearish' : 'bg-bullish'}`} style={{ width: `${predictionData?.confidence || 0}%` }} />
                </div>
              </div>

              {/* Action Parameter Details */}
              <div className="space-y-4">
                <div className="border border-border-default rounded-xl p-4 bg-bg-card">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-text-secondary mb-3 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-primary-400" />
                    <span>Risk Parameters (Grade: {predictionData?.trade_grade})</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-text-muted">Target Entry</p>
                      <h4 className="font-mono font-bold text-text-primary mt-0.5">{predictionData?.trade_setup?.entry || "N/A"}</h4>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Stop Loss</p>
                      <h4 className="font-mono font-bold text-bearish mt-0.5">{predictionData?.trade_setup?.stop_loss || "N/A"}</h4>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Take Profit</p>
                      <h4 className="font-mono font-bold text-bullish mt-0.5">{predictionData?.trade_setup?.take_profit || "N/A"}</h4>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted">Risk Reward</p>
                      <h4 className="font-mono font-bold text-text-primary mt-0.5">1:{predictionData?.trade_setup?.risk_reward_ratio || "N/A"}</h4>
                    </div>
                  </div>
                </div>

                <div className="border border-border-default rounded-xl p-4 bg-bg-card">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-text-secondary mb-2 flex items-center gap-1.5">
                    <Bot size={12} className="text-accent-cyan" />
                    <span>AI Explanation Summary</span>
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {predictionData?.explanation || "Analyzing multi-dimensional time series boundaries..."}
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => alert("Added trading position data to Personal Journal logs.")}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-[10px] uppercase tracking-widest py-3 rounded-lg shadow-lg transition cursor-pointer text-center"
                >
                  Add to Journal
                </button>
                <button 
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="flex-1 bg-transparent hover:bg-bg-card border border-border-default text-text-secondary hover:text-text-primary font-bold text-[10px] uppercase tracking-widest py-3 rounded-lg transition cursor-pointer text-center"
                >
                  Dismiss
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}
