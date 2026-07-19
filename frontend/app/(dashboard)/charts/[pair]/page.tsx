"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import { 
  Camera, BrainCircuit, X, ChevronDown, Activity, Loader2, Plus, Minus, Zap, RefreshCcw
} from "lucide-react";
import { runAutoAnalysis, calcTimeframeBias, type OHLCV, type AutoAnalysisResult } from "@/lib/analysis/engine";
import AutoAnalysisPanel, { type OverlayConfig } from "./components/AutoAnalysisPanel";

export default function Charts() {
  const params = useParams();
  const pair = String(params.pair || "EUR_USD").replace("_", "/");
  const binanceSymbol = (pair.replace(/[\/_]/g, "") + "T").toUpperCase();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const stochContainerRef = useRef<HTMLDivElement>(null);
  const atrContainerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<any>(null);

  // Trendline series refs for overlay rendering
  const trendlineSeriesRef = useRef<any[]>([]);
  const levelLineRefs = useRef<any[]>([]);

  const [timeframe, setTimeframe] = useState("1h");
  const intervals = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

  // --- Original AI Analysis panel state ---
  const defaultAnalysisData = {
    direction: "LONG", confidence: 73, targetTimeframe: "1h",
    entry: "1.0847", sl: "1.0801", tp: "1.0935", rr: "1:2.05",
    pattern: "Double Bottom", patternConf: 84,
    indicators: {
      rsi: "31 Oversold", macd: "Bullish cross", ema: "Uptrend",
      adx: "28 Moderate", bb: "Consolidating midpoint", stoch: "22 Cross up", atr: "Volatility flat"
    }
  };
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "done">("done");
  const [analysisData, setAnalysisData] = useState<any>(defaultAnalysisData);

  // --- Phase 15: Auto Analysis state ---
  const [autoStatus, setAutoStatus] = useState<"idle" | "running" | "done">("idle");
  const [autoResult, setAutoResult] = useState<AutoAnalysisResult | null>(null);
  const [showAutoPanel, setShowAutoPanel] = useState(false);
  const [ohlcvCache, setOhlcvCache] = useState<OHLCV[]>([]);
  const [overlays, setOverlays] = useState<OverlayConfig>({
    trendlines: true,
    levels: true,
    structure: true,
    patterns: true,
  });

  const handleToggleOverlay = (key: keyof OverlayConfig) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAnalyze = () => {
    setAnalysisStatus("analyzing");
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

  const handleZoomIn = () => {
    if (!mainChartRef.current) return;
    const ts = mainChartRef.current.timeScale();
    const range = ts.getVisibleLogicalRange();
    if (range) {
      const diff = range.to - range.from;
      ts.setVisibleLogicalRange({ from: range.from + diff * 0.15, to: range.to - diff * 0.15 });
    }
  };

  const handleZoomOut = () => {
    if (!mainChartRef.current) return;
    const ts = mainChartRef.current.timeScale();
    const range = ts.getVisibleLogicalRange();
    if (range) {
      const diff = range.to - range.from;
      ts.setVisibleLogicalRange({ from: range.from - diff * 0.15, to: range.to + diff * 0.15 });
    }
  };

  // Phase 15: Run Auto Analysis
  const handleAutoAnalysis = useCallback(async () => {
    if (ohlcvCache.length < 30) return;
    setAutoStatus("running");
    setShowAutoPanel(true);

    // Fetch additional timeframes for MTF analysis
    const tfMap: Record<string, string> = { "1m": "5m", "5m": "15m", "15m": "1h", "1h": "4h", "4h": "1d", "1d": "1w", "1w": "1w" };
    const higherTf = tfMap[timeframe] ?? "1h";
    let mtfData: { timeframe: string; data: OHLCV[] }[] = [];

    try {
      const htfRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${higherTf}&limit=100`);
      const htfJson = await htfRes.json();
      if (Array.isArray(htfJson)) {
        const htfOHLCV: OHLCV[] = htfJson.map((d: any) => ({
          time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]),
          low: parseFloat(d[3]), close: parseFloat(d[4]),
        }));
        mtfData = [
          { timeframe, data: ohlcvCache },
          { timeframe: higherTf, data: htfOHLCV },
        ];
      }
    } catch {
      mtfData = [{ timeframe, data: ohlcvCache }];
    }

    // Run engine (CPU-bound but fast for 300 bars)
    await new Promise(r => setTimeout(r, 100)); // yield to paint
    const result = runAutoAnalysis(ohlcvCache, pair.replace("/", ""), timeframe, mtfData);
    setAutoResult(result);
    setAutoStatus("done");

    // Draw trendline overlays on chart
    if (mainChartRef.current && overlays.trendlines) {
      // Clear old trendlines
      trendlineSeriesRef.current.forEach(s => {
        try { mainChartRef.current.removeSeries(s); } catch {}
      });
      trendlineSeriesRef.current = [];

      result.trendlines
        .filter(tl => tl.type !== "BROKEN")
        .slice(0, 5)
        .forEach(tl => {
          const color = tl.direction === "BULLISH"
            ? `rgba(34, 197, 94, ${0.3 + tl.strength * 0.5})`
            : `rgba(239, 68, 68, ${0.3 + tl.strength * 0.5})`;
          const series = mainChartRef.current.addSeries(LineSeries, {
            color, lineWidth: tl.type === "PRIMARY" ? 2 : 1,
            lineStyle: tl.type === "INTERNAL" ? 1 : 0,
          });
          series.setData([
            { time: tl.startTime as any, value: tl.startPrice },
            { time: tl.endTime as any, value: tl.endPrice },
          ]);
          trendlineSeriesRef.current.push(series);
        });
    }

    // Draw S/R price lines
    if (mainChartRef.current && overlays.levels && result.levels.length > 0) {
      const mainSeries = mainChartRef.current.series()[0];
      levelLineRefs.current.forEach(l => { try { mainSeries?.removePriceLine(l); } catch {} });
      levelLineRefs.current = [];
      result.levels.slice(0, 8).forEach(lvl => {
        const lineColor =
          lvl.type === "RESISTANCE" || lvl.type === "SUPPLY" ? "rgba(239,68,68,0.6)"
          : lvl.type === "SUPPORT" || lvl.type === "DEMAND" ? "rgba(34,197,94,0.6)"
          : "rgba(245,158,11,0.5)";
        try {
          const line = mainSeries?.createPriceLine({
            price: lvl.price, color: lineColor, lineWidth: 1, lineStyle: 2,
            axisLabelVisible: true, title: lvl.type.slice(0, 3),
          });
          if (line) levelLineRefs.current.push(line);
        } catch {}
      });
    }
  }, [ohlcvCache, timeframe, pair, binanceSymbol, overlays.levels, overlays.trendlines]);

  useEffect(() => {
    if (!chartContainerRef.current || !rsiContainerRef.current || !macdContainerRef.current
      || !stochContainerRef.current || !atrContainerRef.current) return;

    const commonOptions = {
      layout: { background: { color: "transparent" }, textColor: "#94A3B8", fontSize: 10 },
      grid: { vertLines: { color: "rgba(30, 45, 74, 0.25)" }, horzLines: { color: "rgba(30, 45, 74, 0.25)" } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#3B82F6", style: 3 }, horzLine: { color: "#3B82F6", style: 3 } },
      timeScale: { borderColor: "#1E2D4A", timeVisible: true, secondsVisible: false },
    };

    const mainChart = createChart(chartContainerRef.current, { ...commonOptions, width: chartContainerRef.current.clientWidth, height: 380 });
    mainChartRef.current = mainChart;
    const mainSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22C55E", downColor: "#EF4444", borderVisible: false, wickUpColor: "#22C55E", wickDownColor: "#EF4444",
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
    });
    const bbUpperSeries = mainChart.addSeries(LineSeries, { color: "rgba(59, 130, 246, 0.4)", lineWidth: 1 });
    const bbLowerSeries = mainChart.addSeries(LineSeries, { color: "rgba(59, 130, 246, 0.4)", lineWidth: 1 });
    const bbSmaSeries = mainChart.addSeries(LineSeries, { color: "rgba(255, 255, 255, 0.2)", lineWidth: 1, lineStyle: 2 });

    const rsiChart = createChart(rsiContainerRef.current, { ...commonOptions, width: rsiContainerRef.current.clientWidth, height: 120 });
    const rsiSeries = rsiChart.addSeries(LineSeries, { color: "#8B5CF6", lineWidth: 2 });
    rsiSeries.createPriceLine({ price: 70, color: '#EF4444', lineWidth: 1, lineStyle: 2, title: 'OB' });
    rsiSeries.createPriceLine({ price: 30, color: '#22C55E', lineWidth: 1, lineStyle: 2, title: 'OS' });

    const macdChart = createChart(macdContainerRef.current, { ...commonOptions, width: macdContainerRef.current.clientWidth, height: 140 });
    const macdHist = macdChart.addSeries(HistogramSeries, { color: "#22C55E" });
    const macdLine = macdChart.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 2 });
    const macdSignal = macdChart.addSeries(LineSeries, { color: "#EF4444", lineWidth: 2 });

    const stochChart = createChart(stochContainerRef.current, { ...commonOptions, width: stochContainerRef.current.clientWidth, height: 120 });
    const stochK = stochChart.addSeries(LineSeries, { color: "#3B82F6", lineWidth: 2 });
    const stochD = stochChart.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 2 });
    stochK.createPriceLine({ price: 80, color: '#EF4444', lineWidth: 1, lineStyle: 2, title: 'OB' });
    stochK.createPriceLine({ price: 20, color: '#22C55E', lineWidth: 1, lineStyle: 2, title: 'OS' });

    const atrChart = createChart(atrContainerRef.current, { ...commonOptions, width: atrContainerRef.current.clientWidth, height: 120 });
    const atrSeries = atrChart.addSeries(LineSeries, { color: "#06B6D4", lineWidth: 2 });

    // Sync all timescales
    const mainTs = mainChart.timeScale();
    const rsiTs = rsiChart.timeScale();
    const macdTs = macdChart.timeScale();
    const stochTs = stochChart.timeScale();
    const atrTs = atrChart.timeScale();
    const allTs = [mainTs, rsiTs, macdTs, stochTs, atrTs];
    allTs.forEach((ts, idx) => {
      ts.subscribeVisibleLogicalRangeChange(range => {
        if (!range) return;
        allTs.forEach((other, i) => { if (i !== idx) other.setVisibleLogicalRange(range); });
      });
    });

    let ws: WebSocket | null = null;
    const setupLiveData = async () => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${timeframe}&limit=300`);
        const data = await res.json();
        if (data && data.length > 0) {
          const chartData: any[] = [];
          const rsiData: any[] = []; const macdHD: any[] = []; const macdL: any[] = []; const macdS: any[] = [];
          const bbUpData: any[] = []; const bbLowData: any[] = []; const bbSmaData: any[] = [];
          const stochKData: any[] = []; const stochDData: any[] = []; const atrData: any[] = [];
          const ohlcvBuf: OHLCV[] = [];

          for (let i = 0; i < data.length; i++) {
            const t = (data[i][0] / 1000) as any;
            const h = parseFloat(data[i][2]);
            const l = parseFloat(data[i][3]);
            const c = parseFloat(data[i][4]);
            const o = parseFloat(data[i][1]);
            chartData.push({ time: t, open: o, high: h, low: l, close: c });
            ohlcvBuf.push({ time: data[i][0] / 1000, open: o, high: h, low: l, close: c });
            rsiData.push({ time: t, value: 40 + Math.sin(i / 10) * 30 + Math.random() * 5 });
            const mLine = Math.sin(i / 5) * 0.005; const sLine = Math.sin((i - 2) / 5) * 0.005;
            macdL.push({ time: t, value: mLine }); macdS.push({ time: t, value: sLine });
            macdHD.push({ time: t, value: mLine - sLine, color: (mLine - sLine) >= 0 ? '#22C55E' : '#EF4444' });
            const sma = (h + l) / 2; const dev = 0.0025;
            bbSmaData.push({ time: t, value: sma }); bbUpData.push({ time: t, value: sma + dev }); bbLowData.push({ time: t, value: sma - dev });
            stochKData.push({ time: t, value: 50 + Math.sin(i / 8) * 35 });
            stochDData.push({ time: t, value: 50 + Math.sin((i - 3) / 8) * 35 });
            atrData.push({ time: t, value: 0.0015 + Math.sin(i / 15) * 0.0005 });
          }

          mainSeries.setData(chartData); rsiSeries.setData(rsiData);
          macdLine.setData(macdL); macdSignal.setData(macdS); macdHist.setData(macdHD);
          bbUpperSeries.setData(bbUpData); bbLowerSeries.setData(bbLowData); bbSmaSeries.setData(bbSmaData);
          stochK.setData(stochKData); stochD.setData(stochDData); atrSeries.setData(atrData);
          mainTs.fitContent(); rsiTs.fitContent(); macdTs.fitContent(); stochTs.fitContent(); atrTs.fitContent();

          // Cache OHLCV for Phase 15 engine
          setOhlcvCache(ohlcvBuf);

          ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe}`);
          ws.onmessage = (event) => {
            const kline = JSON.parse(event.data).k;
            mainSeries.update({ time: (kline.t / 1000) as any, open: parseFloat(kline.o), high: parseFloat(kline.h), low: parseFloat(kline.l), close: parseFloat(kline.c) });
          };
        }
      } catch (err) { console.error("Data load error", err); }
    };
    setupLiveData();

    const handleResize = () => {
      mainChart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      rsiChart.applyOptions({ width: rsiContainerRef.current?.clientWidth });
      macdChart.applyOptions({ width: macdContainerRef.current?.clientWidth });
      stochChart.applyOptions({ width: stochContainerRef.current?.clientWidth });
      atrChart.applyOptions({ width: atrContainerRef.current?.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ws) ws.close();
      mainChart.remove(); rsiChart.remove(); macdChart.remove(); stochChart.remove(); atrChart.remove();
    };
  }, [timeframe, binanceSymbol]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto h-full flex flex-col">

      {/* Top Toolbar */}
      <div className="flex items-center justify-between bg-bg-surface border border-border-default/40 rounded-xl p-3 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-bg-card border border-border-default flex items-center px-4 py-2 rounded-lg gap-2 cursor-pointer">
            <span className="font-bold text-sm text-white">{pair}</span>
            <ChevronDown size={14} className="text-text-muted" />
          </div>
          <div className="flex items-center gap-0.5 bg-bg-card border border-border-default p-1 rounded-lg">
            {intervals.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${timeframe === tf ? 'bg-bg-elevated text-primary-400' : 'text-text-secondary hover:text-text-primary'}`}>{tf}</button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-bg-card border border-border-default px-4 py-1.5 rounded-lg text-xs font-semibold text-text-secondary">
            <div className="flex items-center gap-1.5"><span className="text-white">EMA</span><div className="w-6 h-3.5 bg-primary-500 rounded-full flex items-center p-0.5"><div className="w-2.5 h-2.5 bg-white rounded-full ml-auto"/></div></div>
            <div className="flex items-center gap-1.5"><span>RSI</span><div className="w-6 h-3.5 bg-border-strong rounded-full flex items-center p-0.5"><div className="w-2.5 h-2.5 bg-text-muted rounded-full"/></div></div>
            <div className="flex items-center gap-1.5"><span>MACD</span><div className="w-6 h-3.5 bg-border-strong rounded-full flex items-center p-0.5"><div className="w-2.5 h-2.5 bg-text-muted rounded-full"/></div></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-text-muted/10 border border-border-default px-4 py-1.5 rounded-lg text-xs font-medium text-text-primary hover:bg-bg-card transition"><Camera size={14} /><span>Capture</span></button>
          <button
            onClick={handleAutoAnalysis}
            disabled={autoStatus === "running" || ohlcvCache.length < 30}
            className="flex items-center gap-2 bg-gradient-to-r from-accent-violet to-accent-cyan text-white font-bold px-5 py-1.5 text-xs rounded-lg uppercase tracking-wider disabled:opacity-50 transition shadow-md"
          >
            {autoStatus === "running" ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            <span>{autoStatus === "running" ? "Analyzing..." : "Auto Analysis"}</span>
          </button>
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">

        {/* LEFT: Charts */}
        <div className={`space-y-4 ${showAutoPanel ? "lg:col-span-7" : "lg:col-span-8"}`}>

          {/* Main candlestick */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
            <div className="absolute top-6 left-6 z-10 flex gap-2">
              <span className="bg-primary-500/20 text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded border border-primary-500/30">EMA</span>
              {showAutoPanel && autoResult && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  autoResult.scenarios.overallBias === "BULLISH" ? "bg-bullish/20 text-bullish border-bullish/30"
                  : autoResult.scenarios.overallBias === "BEARISH" ? "bg-bearish/20 text-bearish border-bearish/30"
                  : "bg-border-default text-text-muted border-border-strong"
                }`}>
                  AI: {autoResult.scenarios.overallBias} {autoResult.scenarios.bullish > autoResult.scenarios.bearish ? autoResult.scenarios.bullish : autoResult.scenarios.bearish}%
                </span>
              )}
            </div>
            <div className="absolute bottom-6 right-16 z-10 flex gap-2">
              <button onClick={handleZoomOut} className="bg-bg-card border border-border-strong hover:bg-bg-elevated p-2 rounded-lg text-text-muted hover:text-white transition shadow-sm" title="Zoom Out"><Minus size={16}/></button>
              <button onClick={handleZoomIn} className="bg-bg-card border border-border-strong hover:bg-bg-elevated p-2 rounded-lg text-text-muted hover:text-white transition shadow-sm" title="Zoom In"><Plus size={16}/></button>
            </div>
            <div ref={chartContainerRef} className="w-full relative" />
          </div>

          {/* RSI */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
            <div className="absolute top-6 left-6 z-10"><span className="text-[10px] font-bold text-white">RSI 14 <span className="text-accent-violet">70 31</span></span></div>
            <div ref={rsiContainerRef} className="w-full relative" />
          </div>

          {/* MACD */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
            <div className="absolute top-6 left-6 z-10"><span className="text-[10px] font-bold text-white">MACD<span className="text-bullish ml-2">1.084</span><span className="text-bearish ml-2">Signal 1.080</span></span></div>
            <div ref={macdContainerRef} className="w-full relative" />
          </div>

          {/* Stochastic */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
            <div className="absolute top-6 left-6 z-10"><span className="text-[10px] font-bold text-white">Stochastic <span className="text-primary-400">K</span> <span className="text-neutral-warning ml-1">D</span></span></div>
            <div ref={stochContainerRef} className="w-full relative" />
          </div>

          {/* ATR */}
          <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 relative">
            <div className="absolute top-6 left-6 z-10"><span className="text-[10px] font-bold text-white">ATR <span className="text-accent-cyan ml-1">Vol</span></span></div>
            <div ref={atrContainerRef} className="w-full relative" />
          </div>
        </div>

        {/* RIGHT: Analysis Panels */}
        <div className={`space-y-5 ${showAutoPanel ? "lg:col-span-5" : "lg:col-span-4"}`}>

          {/* Phase 15 Auto Analysis Panel */}
          {showAutoPanel && (
            <div className="relative">
              <button
                onClick={() => setShowAutoPanel(false)}
                className="absolute top-4 right-4 z-20 text-text-muted hover:text-white p-1 rounded transition"
              >
                <X size={14} />
              </button>
              {autoStatus === "running" ? (
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 flex flex-col items-center justify-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-border-strong border-t-accent-violet animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap size={20} className="text-accent-violet" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-white">Running Auto Analysis</h3>
                    <p className="text-xs text-text-muted font-mono">Pivots → Trendlines → S/R → Structure → Patterns → MTF</p>
                  </div>
                </div>
              ) : autoResult ? (
                <AutoAnalysisPanel result={autoResult} overlays={overlays} onToggleOverlay={handleToggleOverlay} />
              ) : null}
            </div>
          )}

          {/* Original AI Analysis Panel */}
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
                <div className={`flex flex-col items-center justify-center p-4 bg-gradient-to-b rounded-xl border ${analysisData.direction === "LONG" ? "from-bullish/5 border-bullish/10" : "from-bearish/5 border-bearish/10"}`}>
                  <h3 className={`text-sm font-black uppercase tracking-wider mb-2 text-center ${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>
                    Next {analysisData.targetTimeframe} Candle<br/>{analysisData.direction === "LONG" ? "BULLISH SIGNAL" : "BEARISH SIGNAL"}
                  </h3>
                  <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-border-default mt-2">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="351" strokeDashoffset={351 - (351 * (analysisData.confidence / 100))} className={`${analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"} transition-all duration-1000`} />
                    </svg>
                    <span className="text-3xl font-black text-white relative z-10">{analysisData.confidence}%</span>
                  </div>
                  <div className={`mt-5 border font-bold uppercase tracking-widest text-[10px] px-4 py-1.5 rounded-full ${analysisData.direction === "LONG" ? "bg-bullish/10 border-bullish/30 text-bullish" : "bg-bearish/10 border-bearish/30 text-bearish"}`}>
                    Direction: <span className="text-white ml-2">{analysisData.direction}</span>
                  </div>
                </div>
                <div className="mt-6 space-y-2">
                  {[
                    { l: "Target Entry:", v: analysisData.entry, c: "text-text-primary" },
                    { l: "Stop Loss:", v: analysisData.sl, c: "text-bearish" },
                    { l: "Take Profit:", v: analysisData.tp, c: "text-bullish" },
                    { l: "RR:", v: analysisData.rr, c: "text-white" },
                    { l: "Position Size:", v: "0.3 lots", c: "text-white" },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between items-center p-2 rounded hover:bg-bg-card transition">
                      <span className="text-xs text-text-muted">{row.l}</span>
                      <span className={`text-xs font-mono font-bold ${row.c}`}>{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border border-border-default rounded-xl p-4 bg-bg-card">
                  <div className="flex items-center gap-2 mb-2 text-text-secondary"><Activity size={14}/><h4 className="text-xs font-medium">Pattern Detected</h4></div>
                  <p className="text-sm font-semibold text-white leading-snug">{analysisData.pattern},<br/><span className="text-text-muted font-normal text-xs">{analysisData.patternConf}% confidence</span></p>
                </div>
                <div className="mt-4 border border-border-default rounded-xl p-4 bg-bg-card">
                  <h4 className="text-xs font-medium mb-3 text-text-secondary">{analysisData.targetTimeframe} Indicator Summary</h4>
                  <div className="space-y-2 text-xs font-mono">
                    {Object.entries(analysisData.indicators).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-text-muted uppercase">{k}:</span>
                        <span className={analysisData.direction === "LONG" ? "text-bullish" : "text-bearish"}>{v as string}</span>
                      </div>
                    ))}
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
