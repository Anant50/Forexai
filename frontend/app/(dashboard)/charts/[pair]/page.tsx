"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import { 
  Camera, BrainCircuit, X, ChevronDown, Activity, Loader2, Plus, Minus, Zap, TrendingUp, TrendingDown
} from "lucide-react";
import { runAutoAnalysis, type OHLCV, type AutoAnalysisResult } from "@/lib/analysis/engine";
import AutoAnalysisPanel, { type OverlayConfig } from "./components/AutoAnalysisPanel";

// ─── Chart Label pill shown inside a chart card ─────────────────────────────
const ChartLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
    {children}
  </div>
);
const Pill = ({ text, color = "text-text-muted" }: { text: string; color?: string }) => (
  <span className={`text-[10px] font-bold font-mono ${color} bg-bg-card/90 backdrop-blur-sm border border-border-subtle px-2 py-0.5 rounded`}>{text}</span>
);

// ─── Chart card wrapper: overflow hidden ensures chart stays contained ───────
const ChartCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative rounded-xl border border-border-subtle bg-bg-surface shadow-md overflow-hidden ${className}`}>
    {children}
  </div>
);

export default function Charts() {
  const params = useParams();
  const pair = String(params.pair || "EUR_USD").replace("_", "/");
  const binanceSymbol = (pair.replace(/[\/_]/g, "") + "T").toUpperCase();

  const chartContainerRef  = useRef<HTMLDivElement>(null);
  const rsiContainerRef    = useRef<HTMLDivElement>(null);
  const macdContainerRef   = useRef<HTMLDivElement>(null);
  const stochContainerRef  = useRef<HTMLDivElement>(null);
  const atrContainerRef    = useRef<HTMLDivElement>(null);
  const mainChartRef       = useRef<any>(null);
  const trendlineSeriesRef = useRef<any[]>([]);

  const [timeframe, setTimeframe] = useState("1h");
  const intervals = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
  const [ohlcvCache, setOhlcvCache] = useState<OHLCV[]>([]);

  // AI Analysis (original)
  const defaultData = {
    direction: "LONG", confidence: 73, targetTimeframe: "1h",
    entry: "1.0847", sl: "1.0801", tp: "1.0935", rr: "1:2.05",
    pattern: "Double Bottom", patternConf: 84,
    indicators: { rsi: "31 Oversold", macd: "Bullish cross", ema: "Uptrend", adx: "28 Moderate", bb: "Midpoint band", stoch: "22 Cross up", atr: "Flat" }
  };
  const [aiStatus, setAiStatus] = useState<"idle" | "analyzing" | "done">("done");
  const [aiData, setAiData] = useState<any>(defaultData);

  // Auto Analysis (Phase 15)
  const [autoStatus, setAutoStatus]   = useState<"idle" | "running" | "done">("idle");
  const [autoResult, setAutoResult]   = useState<AutoAnalysisResult | null>(null);
  const [activeRightPanel, setActiveRightPanel] = useState<"ai" | "auto">("ai");
  const [overlays, setOverlays]       = useState<OverlayConfig>({ trendlines: true, levels: true, structure: true, patterns: true });

  const handleToggleOverlay = (key: keyof OverlayConfig) =>
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));

  const handleAiAnalyze = () => {
    setAiStatus("analyzing");
    setTimeout(() => {
      const bull = Math.random() > 0.5;
      const conf = Math.floor(65 + Math.random() * 25);
      setAiData({
        direction: bull ? "LONG" : "SHORT", confidence: conf, targetTimeframe: timeframe,
        entry: (1 + Math.random() * 0.5).toFixed(4),
        sl:    (1 + Math.random() * 0.5).toFixed(4),
        tp:    (1 + Math.random() * 0.5).toFixed(4),
        rr: `1:${(1.5 + Math.random()).toFixed(1)}`,
        pattern: bull ? "Bullish Engulfing" : "Bearish Harami",
        patternConf: Math.floor(60 + Math.random() * 30),
        indicators: {
          rsi:  bull ? "Oversold bounce"      : "Overbought reject",
          macd: bull ? "Bullish divergence"   : "Bearish crossover",
          ema:  bull ? "Above 200 EMA"        : "Below 20 EMA",
          adx:  (20 + Math.random() * 20).toFixed(1) + " strength",
          bb:   bull ? "Off lower band"       : "At upper band",
          stoch:bull ? "Crossing 20 up"       : "Crossing 80 down",
          atr:  "Volatility increasing",
        },
      });
      setAiStatus("done");
    }, 2000);
  };

  const handleZoomIn = () => {
    if (!mainChartRef.current) return;
    const ts = mainChartRef.current.timeScale();
    const r = ts.getVisibleLogicalRange();
    if (r) { const d = r.to - r.from; ts.setVisibleLogicalRange({ from: r.from + d * 0.15, to: r.to - d * 0.15 }); }
  };
  const handleZoomOut = () => {
    if (!mainChartRef.current) return;
    const ts = mainChartRef.current.timeScale();
    const r = ts.getVisibleLogicalRange();
    if (r) { const d = r.to - r.from; ts.setVisibleLogicalRange({ from: r.from - d * 0.15, to: r.to + d * 0.15 }); }
  };

  const handleAutoAnalysis = useCallback(async () => {
    if (ohlcvCache.length < 30) return;
    setAutoStatus("running");
    setActiveRightPanel("auto");

    const tfMap: Record<string, string> = { "1m": "5m", "5m": "15m", "15m": "1h", "1h": "4h", "4h": "1d", "1d": "1w", "1w": "1w" };
    const higherTf = tfMap[timeframe] ?? "1h";
    let mtfData: { timeframe: string; data: OHLCV[] }[] = [{ timeframe, data: ohlcvCache }];

    try {
      const res  = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${higherTf}&limit=100`);
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const htf: OHLCV[] = json.map((d: any) => ({
          time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4])
        }));
        mtfData = [{ timeframe, data: ohlcvCache }, { timeframe: higherTf, data: htf }];
      }
    } catch {}

    await new Promise(r => setTimeout(r, 120));
    const result = runAutoAnalysis(ohlcvCache, pair.replace("/", ""), timeframe, mtfData);
    setAutoResult(result);
    setAutoStatus("done");

    // Draw trendlines on main chart
    if (mainChartRef.current && overlays.trendlines) {
      trendlineSeriesRef.current.forEach(s => { try { mainChartRef.current.removeSeries(s); } catch {} });
      trendlineSeriesRef.current = [];
      result.trendlines.filter(t => t.type !== "BROKEN").slice(0, 5).forEach(tl => {
        const alpha = 0.35 + tl.strength * 0.55;
        const color = tl.direction === "BULLISH" ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`;
        const s = mainChartRef.current.addSeries(LineSeries, {
          color, lineWidth: tl.type === "PRIMARY" ? 2 : 1, lineStyle: tl.type === "INTERNAL" ? 1 : 0,
        });
        s.setData([{ time: tl.startTime as any, value: tl.startPrice }, { time: tl.endTime as any, value: tl.endPrice }]);
        trendlineSeriesRef.current.push(s);
      });
    }
  }, [ohlcvCache, timeframe, binanceSymbol, pair, overlays.trendlines]);

  // ─── Chart setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const refs = [chartContainerRef, rsiContainerRef, macdContainerRef, stochContainerRef, atrContainerRef];
    if (refs.some(r => !r.current)) return;

    // Base chart options — right price scale is always scoped to the container
    const base = {
      layout: { background: { color: "transparent" }, textColor: "#64748B", fontSize: 10 },
      grid: { vertLines: { color: "rgba(30,45,74,0.3)" }, horzLines: { color: "rgba(30,45,74,0.3)" } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#3B82F6", style: 3 }, horzLine: { color: "#3B82F6", style: 3 } },
      timeScale: { borderColor: "#1E2D4A", timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: "#1E2D4A", scaleMargins: { top: 0.08, bottom: 0.08 } },
      leftPriceScale: { visible: false },
      handleScroll: { vertTouchDrag: false },
    };

    const w = (el: HTMLDivElement | null) => el?.clientWidth ?? 600;

    const mainChart  = createChart(chartContainerRef.current!,  { ...base, width: w(chartContainerRef.current),  height: 360 });
    const rsiChart   = createChart(rsiContainerRef.current!,    { ...base, width: w(rsiContainerRef.current),    height: 110 });
    const macdChart  = createChart(macdContainerRef.current!,   { ...base, width: w(macdContainerRef.current),   height: 120 });
    const stochChart = createChart(stochContainerRef.current!,  { ...base, width: w(stochContainerRef.current),  height: 110 });
    const atrChart   = createChart(atrContainerRef.current!,    { ...base, width: w(atrContainerRef.current),    height: 100 });

    mainChartRef.current = mainChart;

    const mainSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22C55E", downColor: "#EF4444", borderVisible: false,
      wickUpColor: "#22C55E", wickDownColor: "#EF4444",
      priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
    });
    const bbUp  = mainChart.addSeries(LineSeries, { color: "rgba(59,130,246,0.35)", lineWidth: 1 });
    const bbLow = mainChart.addSeries(LineSeries, { color: "rgba(59,130,246,0.35)", lineWidth: 1 });
    const bbMid = mainChart.addSeries(LineSeries, { color: "rgba(255,255,255,0.15)", lineWidth: 1, lineStyle: 2 });

    const rsiLine   = rsiChart.addSeries(LineSeries,       { color: "#8B5CF6", lineWidth: 2 });
    const macdHist  = macdChart.addSeries(HistogramSeries, { color: "#22C55E" });
    const macdLine  = macdChart.addSeries(LineSeries,      { color: "#3B82F6", lineWidth: 2 });
    const macdSig   = macdChart.addSeries(LineSeries,      { color: "#EF4444", lineWidth: 2 });
    const stochK    = stochChart.addSeries(LineSeries,     { color: "#3B82F6", lineWidth: 2 });
    const stochD    = stochChart.addSeries(LineSeries,     { color: "#F59E0B", lineWidth: 2 });
    const atrLine   = atrChart.addSeries(LineSeries,       { color: "#06B6D4", lineWidth: 2 });

    // Threshold lines
    rsiLine.createPriceLine({  price: 70, color: "rgba(239,68,68,0.6)",   lineWidth: 1, lineStyle: 2, title: "OB" });
    rsiLine.createPriceLine({  price: 30, color: "rgba(34,197,94,0.6)",   lineWidth: 1, lineStyle: 2, title: "OS" });
    stochK.createPriceLine({   price: 80, color: "rgba(239,68,68,0.6)",   lineWidth: 1, lineStyle: 2, title: "OB" });
    stochK.createPriceLine({   price: 20, color: "rgba(34,197,94,0.6)",   lineWidth: 1, lineStyle: 2, title: "OS" });

    // Sync all timescales
    const allTs = [mainChart, rsiChart, macdChart, stochChart, atrChart].map(c => c.timeScale());
    allTs.forEach((ts, i) => {
      ts.subscribeVisibleLogicalRangeChange(range => {
        if (!range) return;
        allTs.forEach((other, j) => { if (i !== j) other.setVisibleLogicalRange(range); });
      });
    });

    let ws: WebSocket | null = null;

    const load = async () => {
      try {
        const res  = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${timeframe}&limit=300`);
        const raw  = await res.json();
        if (!Array.isArray(raw) || raw.length === 0) return;

        const candles: any[] = []; const rsiD: any[] = [];
        const mHistD: any[] = []; const mLineD: any[] = []; const mSigD: any[] = [];
        const bbUpD: any[] = []; const bbLowD: any[] = []; const bbMidD: any[] = [];
        const skD: any[] = []; const sdD: any[] = []; const atrD: any[] = [];
        const ohlcv: OHLCV[] = [];

        for (let i = 0; i < raw.length; i++) {
          const t = (raw[i][0] / 1000) as any;
          const o = parseFloat(raw[i][1]), h = parseFloat(raw[i][2]),
                l = parseFloat(raw[i][3]), c = parseFloat(raw[i][4]);
          candles.push({ time: t, open: o, high: h, low: l, close: c });
          ohlcv.push({ time: raw[i][0] / 1000, open: o, high: h, low: l, close: c });

          rsiD.push({ time: t, value: 40 + Math.sin(i / 10) * 30 + Math.random() * 3 });

          const ml = Math.sin(i / 5) * 0.005, sl = Math.sin((i - 2) / 5) * 0.005;
          mLineD.push({ time: t, value: ml }); mSigD.push({ time: t, value: sl });
          mHistD.push({ time: t, value: ml - sl, color: ml >= sl ? "#22C55E" : "#EF4444" });

          const mid = (h + l) / 2, dev = 0.0025;
          bbMidD.push({ time: t, value: mid }); bbUpD.push({ time: t, value: mid + dev }); bbLowD.push({ time: t, value: mid - dev });

          skD.push({ time: t, value: 50 + Math.sin(i / 8) * 35 });
          sdD.push({ time: t, value: 50 + Math.sin((i - 3) / 8) * 35 });
          atrD.push({ time: t, value: 0.0015 + Math.sin(i / 15) * 0.0005 });
        }

        mainSeries.setData(candles); bbUp.setData(bbUpD); bbLow.setData(bbLowD); bbMid.setData(bbMidD);
        rsiLine.setData(rsiD);
        macdLine.setData(mLineD); macdSig.setData(mSigD); macdHist.setData(mHistD);
        stochK.setData(skD); stochD.setData(sdD);
        atrLine.setData(atrD);
        allTs.forEach(ts => ts.fitContent());
        setOhlcvCache(ohlcv);

        // Live tick
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe}`);
        ws.onmessage = ev => {
          const k = JSON.parse(ev.data).k;
          mainSeries.update({ time: (k.t / 1000) as any, open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c) });
        };
      } catch (e) { console.error(e); }
    };
    load();

    const onResize = () => {
      [
        [mainChart,  chartContainerRef],  [rsiChart,  rsiContainerRef],
        [macdChart,  macdContainerRef],   [stochChart, stochContainerRef],
        [atrChart,   atrContainerRef],
      ].forEach(([chart, ref]: any) => {
        if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
      });
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (ws) ws.close();
      [mainChart, rsiChart, macdChart, stochChart, atrChart].forEach(c => c.remove());
    };
  }, [timeframe, binanceSymbol]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 max-w-[1700px] mx-auto w-full">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between bg-bg-surface border border-border-subtle rounded-xl px-4 py-2.5 shadow-sm gap-4 flex-wrap">
        {/* Left: Pair + TF */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-bg-card border border-border-default rounded-lg px-3 py-1.5 cursor-pointer hover:border-text-muted transition">
            <span className="font-bold text-sm text-white tracking-tight">{pair}</span>
            <ChevronDown size={13} className="text-text-muted" />
          </div>

          <div className="flex items-center bg-bg-card border border-border-default rounded-lg p-0.5">
            {intervals.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${
                  timeframe === tf ? "bg-primary-600/30 text-primary-400 shadow-sm" : "text-text-muted hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator pills */}
          <div className="hidden lg:flex items-center gap-1.5">
            {[
              { l: "BB", c: "text-primary-400 border-primary-500/30 bg-primary-500/10" },
              { l: "RSI", c: "text-accent-violet border-accent-violet/30 bg-accent-violet/10" },
              { l: "MACD", c: "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10" },
              { l: "STOCH", c: "text-neutral-warning border-neutral-warning/30 bg-neutral-warning/10" },
              { l: "ATR", c: "text-text-secondary border-border-strong bg-bg-card" },
            ].map(p => (
              <span key={p.l} className={`text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase ${p.c}`}>{p.l}</span>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-text-muted hover:text-white border border-border-default hover:border-text-muted bg-bg-card px-3 py-1.5 rounded-lg text-[11px] font-medium transition">
            <Camera size={13} /> Screenshot
          </button>

          <button
            onClick={handleAutoAnalysis}
            disabled={autoStatus === "running" || ohlcvCache.length < 30}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition shadow-md disabled:opacity-50 ${
              activeRightPanel === "auto" && autoResult
                ? "bg-accent-violet/20 border border-accent-violet/50 text-accent-violet"
                : "bg-gradient-to-r from-accent-violet to-accent-cyan text-white"
            }`}
          >
            {autoStatus === "running" ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Auto Analysis
          </button>

          <button
            onClick={handleAiAnalyze}
            disabled={aiStatus === "analyzing"}
            className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold px-4 py-1.5 text-[11px] rounded-lg uppercase tracking-wide shadow-md disabled:opacity-50 transition"
          >
            {aiStatus === "analyzing" ? <Loader2 size={13} className="animate-spin" /> : <BrainCircuit size={13} />}
            Analyze Chart
          </button>
        </div>
      </div>

      {/* ── Main layout: Charts + Right Panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">

        {/* ── LEFT: Chart stack ── */}
        <div className="flex flex-col gap-3 min-w-0">

          {/* Main candlestick chart */}
          <ChartCard>
            <ChartLabel>
              <Pill text={pair} color="text-white" />
              <Pill text={timeframe.toUpperCase()} color="text-primary-400" />
              <Pill text="BB" color="text-primary-400" />
              {autoResult && (
                <Pill
                  text={`AI ${autoResult.scenarios.overallBias} ${Math.max(autoResult.scenarios.bullish, autoResult.scenarios.bearish)}%`}
                  color={autoResult.scenarios.overallBias === "BULLISH" ? "text-bullish" : autoResult.scenarios.overallBias === "BEARISH" ? "text-bearish" : "text-neutral-warning"}
                />
              )}
            </ChartLabel>

            {/* Zoom controls — bottom right, inside chart card */}
            <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5">
              <button
                onClick={handleZoomOut}
                className="w-7 h-7 flex items-center justify-center bg-bg-card/90 backdrop-blur-sm border border-border-strong hover:bg-bg-elevated hover:text-white text-text-muted rounded-lg transition shadow-sm"
                title="Zoom Out"
              >
                <Minus size={13} />
              </button>
              <button
                onClick={handleZoomIn}
                className="w-7 h-7 flex items-center justify-center bg-bg-card/90 backdrop-blur-sm border border-border-strong hover:bg-bg-elevated hover:text-white text-text-muted rounded-lg transition shadow-sm"
                title="Zoom In"
              >
                <Plus size={13} />
              </button>
            </div>

            <div ref={chartContainerRef} className="w-full block" />
          </ChartCard>

          {/* RSI */}
          <ChartCard>
            <ChartLabel>
              <Pill text="RSI 14" color="text-accent-violet" />
              <Pill text="OB 70" color="text-bearish" />
              <Pill text="OS 30" color="text-bullish" />
            </ChartLabel>
            <div ref={rsiContainerRef} className="w-full block" />
          </ChartCard>

          {/* MACD */}
          <ChartCard>
            <ChartLabel>
              <Pill text="MACD (12,26,9)" color="text-white" />
              <Pill text="Signal" color="text-bearish" />
              <Pill text="Hist" color="text-bullish" />
            </ChartLabel>
            <div ref={macdContainerRef} className="w-full block" />
          </ChartCard>

          {/* Stochastic */}
          <ChartCard>
            <ChartLabel>
              <Pill text="Stochastic (14,3)" color="text-white" />
              <Pill text="K" color="text-primary-400" />
              <Pill text="D" color="text-neutral-warning" />
            </ChartLabel>
            <div ref={stochContainerRef} className="w-full block" />
          </ChartCard>

          {/* ATR */}
          <ChartCard>
            <ChartLabel>
              <Pill text="ATR (14)" color="text-white" />
              <Pill text="Volatility" color="text-accent-cyan" />
            </ChartLabel>
            <div ref={atrContainerRef} className="w-full block" />
          </ChartCard>

        </div>

        {/* ── RIGHT: Analysis sidebar ── */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-4 min-w-0">

          {/* Panel switcher tabs */}
          <div className="flex bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setActiveRightPanel("ai")}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition ${
                activeRightPanel === "ai" ? "bg-primary-600/20 text-primary-400 border-b-2 border-primary-500" : "text-text-muted hover:text-white"
              }`}
            >
              <BrainCircuit size={13} /> AI Signal
            </button>
            <button
              onClick={() => setActiveRightPanel("auto")}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition ${
                activeRightPanel === "auto" ? "bg-accent-violet/20 text-accent-violet border-b-2 border-accent-violet" : "text-text-muted hover:text-white"
              }`}
            >
              <Zap size={13} /> Auto TA
            </button>
          </div>

          {/* AI Signal panel */}
          {activeRightPanel === "ai" && (
            <div className="bg-bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border-default flex items-center justify-between bg-bg-card">
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <BrainCircuit size={14} className="text-primary-500" /> AI Analysis Panel
                </h2>
                <span className="text-[10px] font-mono text-text-muted uppercase">{timeframe}</span>
              </div>

              {aiStatus === "analyzing" ? (
                <div className="flex flex-col items-center justify-center py-14 gap-4">
                  <Loader2 size={30} className="text-primary-500 animate-spin" />
                  <p className="text-xs text-text-muted uppercase tracking-wider font-bold text-center">
                    Extracting indicators<br />for {timeframe} timeframe...
                  </p>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Signal */}
                  <div className={`rounded-xl border p-4 text-center ${aiData.direction === "LONG" ? "bg-bullish/5 border-bullish/20" : "bg-bearish/5 border-bearish/20"}`}>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-bold">Next {aiData.targetTimeframe} Candle</p>
                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" strokeWidth="10" fill="transparent" stroke="currentColor" className="text-border-strong" />
                        <circle cx="50" cy="50" r="42" strokeWidth="10" fill="transparent" stroke="currentColor"
                          strokeDasharray="263.9"
                          strokeDashoffset={263.9 - (263.9 * aiData.confidence / 100)}
                          className={`${aiData.direction === "LONG" ? "text-bullish" : "text-bearish"} transition-all duration-1000`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="relative z-10 text-center">
                        <p className="text-2xl font-black text-white leading-none">{aiData.confidence}%</p>
                        <p className={`text-[9px] font-black uppercase mt-0.5 ${aiData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>
                          {aiData.direction === "LONG" ? "BULLISH" : "BEARISH"}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${
                      aiData.direction === "LONG" ? "bg-bullish/10 border-bullish/30 text-bullish" : "bg-bearish/10 border-bearish/30 text-bearish"
                    }`}>
                      {aiData.direction === "LONG" ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                      {aiData.direction} — {aiData.pattern}
                    </div>
                  </div>

                  {/* Trade levels */}
                  <div className="rounded-xl border border-border-default bg-bg-card overflow-hidden">
                    <div className="px-3 py-2 border-b border-border-default">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Trade Levels</p>
                    </div>
                    <div className="divide-y divide-border-default">
                      {[
                        { l: "Entry",       v: aiData.entry, c: "text-white" },
                        { l: "Stop Loss",   v: aiData.sl,    c: "text-bearish" },
                        { l: "Take Profit", v: aiData.tp,    c: "text-bullish" },
                        { l: "Risk/Reward", v: aiData.rr,    c: "text-primary-400" },
                        { l: "Position",    v: "0.3 lots",   c: "text-text-secondary" },
                      ].map(row => (
                        <div key={row.l} className="flex justify-between items-center px-3 py-2 hover:bg-bg-elevated/30 transition">
                          <span className="text-xs text-text-muted">{row.l}</span>
                          <span className={`text-xs font-mono font-bold ${row.c}`}>{row.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="rounded-xl border border-border-default bg-bg-card overflow-hidden">
                    <div className="px-3 py-2 border-b border-border-default">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{aiData.targetTimeframe} Indicator Summary</p>
                    </div>
                    <div className="divide-y divide-border-default">
                      {Object.entries(aiData.indicators).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center px-3 py-2">
                          <span className="text-[10px] text-text-muted font-mono uppercase">{k}</span>
                          <span className={`text-[10px] font-bold font-mono ${aiData.direction === "LONG" ? "text-bullish" : "text-bearish"}`}>{v as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto TA panel */}
          {activeRightPanel === "auto" && (
            <>
              {autoStatus === "idle" && (
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 flex flex-col items-center gap-4 text-center shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-accent-violet/10 border border-accent-violet/30 flex items-center justify-center">
                    <Zap size={24} className="text-accent-violet" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Auto Analysis Ready</h3>
                    <p className="text-xs text-text-muted leading-relaxed">Click the <span className="text-accent-violet font-bold">Auto Analysis</span> button in the toolbar to detect trendlines, S/R zones, market structure, and chart patterns automatically.</p>
                  </div>
                  <button
                    onClick={handleAutoAnalysis}
                    disabled={ohlcvCache.length < 30}
                    className="flex items-center gap-2 bg-gradient-to-r from-accent-violet to-accent-cyan text-white font-bold px-6 py-2 rounded-lg text-xs uppercase tracking-wide disabled:opacity-50 transition"
                  >
                    <Zap size={13} /> Run Now
                  </button>
                </div>
              )}

              {autoStatus === "running" && (
                <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 flex flex-col items-center gap-5 shadow-sm">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-border-strong border-t-accent-violet animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center"><Zap size={20} className="text-accent-violet" /></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white mb-1">Analyzing Chart</h3>
                    <p className="text-[10px] text-text-muted font-mono space-y-1 text-center">
                      Pivots → Trendlines → S/R → Structure → Patterns → MTF
                    </p>
                  </div>
                </div>
              )}

              {autoStatus === "done" && autoResult && (
                <AutoAnalysisPanel result={autoResult} overlays={overlays} onToggleOverlay={handleToggleOverlay} />
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
