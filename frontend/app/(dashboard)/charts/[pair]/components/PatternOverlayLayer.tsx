"use client";

import { useEffect, useRef } from "react";
import type { ISeriesApi, LineSeriesPartialOptions, Time } from "lightweight-charts";
import { LineSeries } from "lightweight-charts";
import type { PatternAnalysis, PatternResult } from "@/lib/analysis/patterns";
import type { OHLCV } from "@/lib/analysis/engine";

interface Props {
  chartRef: React.MutableRefObject<any>;
  analysis: PatternAnalysis | null;
  data: OHLCV[];
}

export default function PatternOverlayLayer({ chartRef, analysis, data }: Props) {
  const seriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !analysis || analysis.patterns.length === 0 || data.length === 0) {
      // Cleanup previous lines if analysis is cleared
      seriesRefs.current.forEach(s => {
        try { chart.removeSeries(s); } catch (e) {}
      });
      seriesRefs.current = [];
      return;
    }

    // Clean up old lines
    seriesRefs.current.forEach(s => {
      try { chart.removeSeries(s); } catch (e) {}
    });
    seriesRefs.current = [];

    // Draw only the top highest quality pattern to avoid clutter,
    // or up to 2 if they don't overlap much. For simplicity, just draw the top pattern's boundaries.
    const topPattern = analysis.topPattern;
    if (!topPattern || topPattern.pivotIndices.length < 2) return;

    // Helper to draw a line segment connecting two data points
    const drawLine = (i1: number, i2: number, color: string, width: number = 2, style: number = 0) => {
      if (i1 < 0 || i2 >= data.length || i1 >= i2) return;
      const t1 = data[i1].time as Time;
      const t2 = data[i2].time as Time;
      // Use high for highs, low for lows? Best approximation: use close for simplicity or OHLC values based on pivot type.
      // Since we don't pass the actual pivot prices, we just use close for drawing the visual line on the chart.
      const p1 = data[i1].close;
      const p2 = data[i2].close;

      const series = chart.addSeries(LineSeries, {
        color, lineWidth: width, lineStyle: style, crosshairMarkerVisible: false, priceLineVisible: false
      });
      series.setData([
        { time: t1, value: p1 },
        { time: t2, value: p2 },
      ]);
      seriesRefs.current.push(series);
    };

    const color = topPattern.bias === "BULLISH" ? "rgba(34, 197, 94, 0.8)" :
                  topPattern.bias === "BEARISH" ? "rgba(239, 68, 68, 0.8)" :
                  "rgba(245, 158, 11, 0.8)";

    // Connect the points in order
    const pts = [...topPattern.pivotIndices].sort((a,b)=>a-b);
    for (let i = 0; i < pts.length - 1; i++) {
        drawLine(pts[i], pts[i+1], color, 2, 0); // Solid lines between pattern points
    }

    // Also draw a horizontal line for trade setup entry if available
    if (topPattern.tradeSetup && topPattern.tradeSetup.direction !== "WAIT") {
        const entryPrice = parseFloat(topPattern.tradeSetup.entryZone);
        if (!isNaN(entryPrice)) {
            const entryLine = chart.addSeries(LineSeries, {
                color: "rgba(59, 130, 246, 0.6)", lineWidth: 1, lineStyle: 2, crosshairMarkerVisible: false, priceLineVisible: true,
                title: "Setup Entry"
            });
            // Just a dummy data point to make the series exist, we rely on priceLine for horizontal line, but priceLine needs data to show.
            // Actually, we can use createPriceLine on an existing series, but adding it to the main Candlestick series is better.
            // Since we don't have direct access to candlestick series here easily, we draw a regular line across the last 20 bars.
            const startIdx = Math.max(0, data.length - 20);
            entryLine.setData([
                { time: data[startIdx].time as Time, value: entryPrice },
                { time: data[data.length - 1].time as Time, value: entryPrice }
            ]);
            seriesRefs.current.push(entryLine);
        }
    }

    return () => {
      // Cleanup on unmount / re-render
      seriesRefs.current.forEach(s => {
        try { chart.removeSeries(s); } catch (e) {}
      });
      seriesRefs.current = [];
    };
  }, [chartRef, analysis, data]);

  return <></>; // This component just manages lightweight-charts instances imperative
}
