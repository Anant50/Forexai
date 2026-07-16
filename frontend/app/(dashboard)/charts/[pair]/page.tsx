"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import { 
  Camera, BrainCircuit, Sliders, X, CheckCircle2, ChevronDown, Activity, Loader2
} from "lucide-react";

export default function Charts() {
  const params = useParams();
  const pair = String(params.pair || "EUR_USD").replace("_", "/");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const [timeframe, setTimeframe] = useState("1h");
  const intervals = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

  const defaultAnalysisData = {
    direction: "LONG",
    confidence: 73,
    targetTimeframe: "1h",
    entry: "1.0847",
    sl: "1.0801",
    tp: "1.0935",
    rr: "1:2.05",
    pattern: "Double Bottom",
    patternConf: 84,
    indicators: {
      rsi: "31 Oversold",
      macd: "Bullish cross",
      ema: "Uptrend",
      adx: "28 Moderate",
      bb: "Consolidating midpoint",
      stoch: "22 Cross up",
      atr: "Volatility flat"
    }
  };

  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "done">("done");
  const [analysisData, setAnalysisData] = useState<any>(defaultAnalysisData);

  const handleAnalyze = () => {
    setAnalysisStatus("analyzing");
    
    // Simulate analyzing the selected timeframe
    setTimeout(() => {
      const isBullish = Math.random() > 0.5;
      const conf = Math.floor(65 + Math.random() * 25);
      
      setAnalysisData({
        direction: isBullish ? "LONG" : "SHORT",
        confidence: conf,
        targetTimeframe: timeframe,
        entry: (1 + Math.random() * 0.5).toFixed(4),
        sl: (1 + Math.random() * 0.5).toFixed(4),
        tp: (1 + Math.random() * 0.5).toFixed(4),
        rr: `1:${(1.5 + Math.random()).toFixed(1)}`,
        pattern: isBullish ? "Bullish Engulfing" : "Bearish Harami",
        patternConf: Math.floor(60 + Math.random() * 30),
        indicators: {
          rsi: isBullish ? "Oversold bounce" : "Overbought reject",
          macd: isBullish ? "Bullish divergence" : "Bearish crossover",
          ema: isBullish ? "Above 200 EMA" : "Below 20 EMA",
          adx: (20 + Math.random() * 20).toFixed(1) + " Trend strong",
          bb: isBullish ? "Bouncing off lower band" : "Rejected at upper band",
          stoch: isBullish ? "Crossing 20 line up" : "Crossing 80 line down",
          atr: "Volatility increasing"
        }
      });
      setAnalysisStatus("done");
    }, 2000);
  };

  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current || !macdContainerRef.current) return;

    const commonOptions = {
      layout: { background: { color: "transparent" }, textColor: "#94A3B8", fontSize: 10 },
      grid: { vertLines: { color: "rgba(30, 45, 74, 0.25)" }, horzLines: { color: "rgba(30, 45, 74, 0.25)" } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#3B82F6", style: 3 }, horzLine: { color: "#3B82F6", style: 3 } },
      timeScale: { borderColor: "#1E2D4A", timeVisible: true, secondsVisible: false },
    };

    // 1. MAIN CHART
    const mainChart = createChart(chartContainerRef.current, {
      ...commonOptions,
      width: chartContainerRef.current.clientWidth,
      height: 380,
    });
    const mainSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22C55E", downColor: "#EF4444", borderVisible: false, wickUpColor: "#22C55E", wickDownColor: "#EF4444",
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
    });

    // 2. RSI CHART
    const rsiChart = createChart(rsiContainerRef.current, {
      ...commonOptions, width: rsiContainerRef.current.clientWidth, height: 120,
    });
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: "#8B5CF6", lineWidth: 2 });
    // Add Overbought/Oversold lines to RSI
    rsiSeries.createPriceLine({ price: 70, color: '#EF4444', lineWidth: 1, lineStyle: 2, title: 'Overbought' });
    rsiSeries.createPriceLine({ price: 30, color: '#22C55E', lineWidth: 1, lineStyle: 2, title: 'Oversold' });

    // 3. MACD CHART
    const macdChart = createChart(macdContainerRef.current, {
      ...commonOptions, width: macdContainerRef.current.clientWidth, height: 140,
    });
    const macdHist = macdChart.addSeries(HistogramSeries, { color: "#22C55E" });
    const macdLine = macdChart.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 1 });
    const macdSignal = macdChart.addSeries(LineSeries, { color: "#EF4444", lineWidth: 1 });

    // Synchronization of time scales
    const mainTs = mainChart.timeScale();
    const rsiTs = rsiChart.timeScale();
    const macdTs = macdChart.timeScale();

    mainTs.subscribeVisibleLogicalRangeChange(timeRange => { if (timeRange) { rsiTs.setVisibleLogicalRange(timeRange); macdTs.setVisibleLogicalRange(timeRange); }});
    rsiTs.subscribeVisibleLogicalRangeChange(timeRange => { if (timeRange) { mainTs.setVisibleLogicalRange(timeRange); macdTs.setVisibleLogicalRange(timeRange); }});
    macdTs.subscribeVisibleLogicalRangeChange(timeRange => { if (timeRange) { mainTs.setVisibleLogicalRange(timeRange); rsiTs.setVisibleLogicalRange(timeRange); }});

    let ws: WebSocket | null = null;
    const setupLiveData = async () => {
      try {
        const symbol = (pair.replace(/[\/_]/g, "") + "T").toUpperCase();
        const lowerSymbol = symbol.toLowerCase();
        
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=200`);
        const data = await res.json();
        
        if (data && data.length > 0) {
          const chartData = []; const rsiData = []; const macdHD = []; const macdL = []; const macdS = [];
          for(let i=0; i<data.length; i++) {
             const t = (data[i][0] / 1000) as any;
             chartData.push({ time: t, open: parseFloat(data[i][1]), high: parseFloat(data[i][2]), low: parseFloat(data[i][3]), close: parseFloat(data[i][4]) });
             
             // Mock standard RSI oscillating between 20 and 80 based on some math
             const randRsi = 40 + Math.sin(i / 10) * 30 + Math.random() * 5;
             rsiData.push({ time: t, value: randRsi });

             // Mock MACD
             const mLine = Math.sin(i / 5) * 0.005;
             const sLine = Math.sin((i - 2) / 5) * 0.005;
             macdL.push({ time: t, value: mLine });
             macdS.push({ time: t, value: sLine });
             macdHD.push({ time: t, value: mLine - sLine, color: (mLine - sLine) >= 0 ? '#22C55E' : '#EF4444' });
          }
          mainSeries.setData(chartData); rsiSeries.setData(rsiData); 
          macdLine.setData(macdL); macdSignal.setData(macdS); macdHist.setData(macdHD);

          mainTs.fitContent(); rsiTs.fitContent(); macdTs.fitContent();

          // Connecting Live Tick streaming
          ws = new WebSocket(`wss://stream.binance.com:9443/ws/${lowerSymbol}@kline_${timeframe}`);
          ws.onmessage = (event) => {
            const kline = JSON.parse(event.data).k;
            mainSeries.update({
               time: (kline.t / 1000) as any,
               open: parseFloat(kline.o), high: parseFloat(kline.h), low: parseFloat(kline.l), close: parseFloat(kline.c),
            });
          };
        }
      } catch (err) {
        console.error("Data proxy fail", err);
      }
    };
    setupLiveData();

    // Resize Handler
    const handleResize = () => {
      mainChart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      rsiChart.applyOptions({ width: rsiContainerRef.current?.clientWidth });
      macdChart.applyOptions({ width: macdContainerRef.current?.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ws) ws.close();
      mainChart.remove(); rsiChart.remove(); macdChart.remove();
    };
  }, [timeframe, pair]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">
      
      {/* Top Toolbar Navigation */}
      <div className="flex items-center justify-between bg-bg-surface border border-border-default/40 rounded-xl p-3 shadow-sm">
         <div className="flex items-center gap-4">
           {/* Pair Dropdown Simulator */}
           <div className="bg-bg-card border border-border-default flex items-center px-4 py-2 rounded-lg gap-2 cursor-pointer">
             <span className="font-bold text-sm text-white">{pair}</span>
             <ChevronDown size={14} className="text-text-muted" />
           </div>
           
           {/* Timeframe selector */}
           <div className="flex items-center gap-0.5 bg-bg-card border border-border-default p-1 rounded-lg">
             {intervals.map(tf => (
               <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${timeframe === tf ? 'bg-bg-elevated text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}>{tf}</button>
             ))}
           </div>
           
           {/* Mock indicator toggles */}
           <div className="flex items-center gap-3 bg-bg-card border border-border-default px-4 py-1.5 rounded-lg text-xs font-semibold text-text-secondary">
             <div className="flex items-center gap-1.5"><span className="text-white">EMA</span><div className="w-6 h-3.5 bg-primary-500 rounded-full flex items-center p-0.5"><div className="w-2.5 h-2.5 bg-white rounded-full ml-auto"/></div></div>
             <div className="flex items-center gap-1.5"><span>RSI</span><div className="w-6 h-3.5 bg-border-strong rounded-full flex items-center p-0.5"><div className="w-2.5 h-2.5 bg-text-muted rounded-full"/></div></div>
             <div className="flex items-center gap-1.5"><span>MACD</span><div className="w-6 h-3.5 bg-border-strong rounded-full flex items-center p-0.5"><div className="w-2.5 h-2.5 bg-text-muted rounded-full"/></div></div>
           </div>
         </div>
         
         <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-text-muted/10 border border-border-default px-4 py-1.5 rounded-lg text-xs font-medium text-text-primary hover:bg-bg-card transition"><Camera size={14} /><span>Screen Capture</span></button>
            <button 
              onClick={handleAnalyze} 
              disabled={analysisStatus === "analyzing"}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold px-5 py-1.5 text-xs rounded-lg shadow-glow-blue uppercase tracking-wider glow-blue disabled:opacity-50 transition"
            >
              {analysisStatus === "analyzing" ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
              <span>{analysisStatus === "analyzing" ? "Processing..." : "Analyze Chart"}</span>
            </button>
         </div>
      </div>

      {/* Grid structure: 65% left, 35% right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        
        {/* LEFT COLUMN: 65% Charting Container */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
             <div className="absolute top-6 left-6 z-10 flex gap-2"><span className="bg-primary-500/20 text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded border border-primary-500/30">EMA</span></div>
             <div ref={chartContainerRef} className="w-full relative" />
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
             <div className="absolute top-6 left-6 z-10 flex flex-col"><span className="text-[10px] font-bold text-white">RSI 14 <span className="text-accent-violet">70 31</span></span></div>
             <div ref={rsiContainerRef} className="w-full relative" />
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
             <div className="absolute top-6 left-6 z-10 flex flex-col"><span className="text-[10px] font-bold text-white">MACD<span className="text-bullish ml-2">MACD 1.084</span><span className="text-bearish ml-2">Signal 1.080</span></span></div>
             <div ref={macdContainerRef} className="w-full relative" />
          </div>

        </div>

        {/* RIGHT COLUMN: 35% Analysis Panel */}
        <div className="lg:col-span-4 space-y-5">
           
           <div className="bg-bg-surface border border-border-subtle rounded-xl p-5 sticky top-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-default">
                 <h2 className="font-bold text-base text-white">AI Analysis Panel</h2>
                 <button className="text-text-muted hover:text-white"><X size={16} /></button>
              </div>

               {analysisStatus === "analyzing" ? (
                 <div className="flex flex-col items-center justify-center p-12 space-y-4">
                   <Loader2 size={32} className="text-primary-500 animate-spin" />
                   <p className="text-xs uppercase font-bold tracking-widest text-text-muted text-center leading-relaxed">
                     Extracting technical indicators<br/>for {timeframe} timeframe...
                   </p>
                 </div>
               ) : (
                 <>
                   {/* Central Signal Circle */}
                   <div className={`flex flex-col items-center justify-center p-4 bg-gradient-to-b rounded-xl border ${analysisData.direction === "LONG" ? "from-bullish/5 border-bullish/10" : "from-bearish/5 border-bearish/10"}`}>
                      <h3 className={`text-sm font-black uppercase tracking-wider mb-2 text-center ${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>
                        Next {analysisData.targetTimeframe} Candle<br/>{analysisData.direction === "LONG" ? "BULLISH SIGNAL" : "BEARISH SIGNAL"}
                      </h3>
                      <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-border-default mt-2">
                         <svg className="absolute inset-0 w-full h-full -rotate-90">
                           <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="351" strokeDashoffset={351 - (351 * (analysisData.confidence / 100))} className={`${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"} drop-shadow-md transition-all duration-1000 ease-out`} />
                         </svg>
                         <span className="text-3xl font-black text-white relative z-10">{analysisData.confidence}%</span>
                      </div>
                      <div className={`mt-5 border font-bold uppercase tracking-widest text-[10px] px-4 py-1.5 rounded-full ${analysisData.direction === "LONG" ? "bg-bullish/10 border-bullish/30 text-bullish" : "bg-bearish/10 border-bearish/30 text-bearish"}`}>
                         Direction: <span className="text-white ml-2">{analysisData.direction}</span>
                      </div>
                   </div>

                   {/* Trade Values Grid */}
                   <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center p-2 rounded hover:bg-bg-card transition"><span className="text-xs text-text-muted">Target Entry:</span><span className="text-xs font-mono font-bold text-text-primary">{analysisData.entry}</span></div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-bg-card transition"><span className="text-xs text-text-muted">Stop Loss:</span><span className="text-xs font-mono font-bold text-bearish">{analysisData.sl}</span></div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-bg-card transition"><span className="text-xs text-text-muted">Take Profit:</span><span className="text-xs font-mono font-bold text-bullish">{analysisData.tp}</span></div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-bg-card transition"><span className="text-xs text-text-muted">RR:</span><span className="text-xs font-mono font-bold text-white">{analysisData.rr}</span></div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-bg-card transition"><span className="text-xs text-text-muted">Position Size:</span><span className="text-xs font-mono font-bold text-white">0.3 lots</span></div>
                   </div>

                   {/* Pattern Detected */}
                   <div className="mt-6 border border-border-default rounded-xl p-4 bg-bg-card">
                      <div className="flex items-center gap-2 mb-2 text-text-secondary"><Activity size={14}/><h4 className="text-xs font-medium">Pattern Detected</h4></div>
                      <p className="text-sm font-semibold text-white leading-snug">{analysisData.pattern},<br/><span className="text-text-muted font-normal text-xs">{analysisData.patternConf}% confidence</span></p>
                   </div>

                   {/* Indicator Summary Block */}
                   <div className="mt-4 border border-border-default rounded-xl p-4 bg-bg-card">
                      <h4 className="text-xs font-medium mb-3 text-text-secondary">{analysisData.targetTimeframe} Indicator Summary</h4>
                      <div className="space-y-2 text-xs font-mono">
                         <div className="flex justify-between"><span className="text-text-muted">RSI:</span><span className={`flex items-center gap-1 ${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>{analysisData.indicators.rsi}</span></div>
                         <div className="flex justify-between"><span className="text-text-muted">MACD:</span><span className={`flex items-center gap-1 ${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>{analysisData.indicators.macd}</span></div>
                         <div className="flex justify-between"><span className="text-text-muted">EMA:</span><span className={`flex items-center gap-1 ${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>{analysisData.indicators.ema}</span></div>
                         <div className="flex justify-between"><span className="text-text-muted">ADX:</span><span className="text-neutral-warning flex items-center gap-1">{analysisData.indicators.adx}</span></div>
                         <div className="flex justify-between"><span className="text-text-muted">BB:</span><span className="text-text-primary flex items-center gap-1">{analysisData.indicators.bb}</span></div>
                         <div className="flex justify-between"><span className="text-text-muted">Stoch:</span><span className="text-text-primary flex items-center gap-1">{analysisData.indicators.stoch}</span></div>
                         <div className="flex justify-between"><span className="text-text-muted">ATR:</span><span className="text-text-primary flex items-center gap-1">{analysisData.indicators.atr}</span></div>
                      </div>
                   </div>
                 </>
               )}
            </div>

         </div>

      </div>

    </div>
  );
}
