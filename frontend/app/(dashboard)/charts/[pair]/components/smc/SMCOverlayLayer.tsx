"use client";

import { useEffect, useRef } from "react";
import type { ISeriesApi, Time } from "lightweight-charts";
import { LineSeries } from "lightweight-charts";
import type { SMCAnalysis } from "@/lib/analysis/smc";
import type { OHLCV } from "@/lib/analysis/engine";

interface Props {
  chartRef: React.MutableRefObject<any>;
  analysis: SMCAnalysis | null;
  data: OHLCV[];
  enabled: boolean;
}

export default function SMCOverlayLayer({ chartRef, analysis, data, enabled }: Props) {
  const seriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  useEffect(() => {
    const chart = chartRef.current;
    
    // Cleanup previous drawings
    seriesRefs.current.forEach(s => {
      try { chart.removeSeries(s); } catch (e) {}
    });
    seriesRefs.current = [];

    if (!chart || !analysis || !enabled || data.length === 0) return;

    // Helper to draw a horizontal zone (Top / Bottom lines)
    const drawZone = (top: number, bottom: number, startIndex: number, type: "BULLISH" | "BEARISH", label: string, isFvg = false) => {
      const color = type === "BULLISH" 
          ? (isFvg ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.6)") 
          : (isFvg ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.6)");
      
      const style = isFvg ? 2 : 0; // Dashed for FVG, Solid for OB

      const topLine = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: style, crosshairMarkerVisible: false, priceLineVisible: false });
      const botLine = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: style, crosshairMarkerVisible: false, priceLineVisible: false });
      
      const t1 = data[startIndex].time as Time;
      const t2 = data[data.length - 1].time as Time;

      topLine.setData([{ time: t1, value: top }, { time: t2, value: top }]);
      botLine.setData([{ time: t1, value: bottom }, { time: t2, value: bottom }]);
      
      seriesRefs.current.push(topLine, botLine);
    };

    // Draw active FVGs
    const activeFvgs = analysis.fvgs.filter(f => !f.mitigated);
    activeFvgs.forEach(fvg => drawZone(fvg.top, fvg.bottom, fvg.startIndex, fvg.type, "FVG", true));

    // Draw active OBs
    const activeObs = analysis.orderBlocks.filter(o => !o.mitigated);
    activeObs.forEach(ob => drawZone(ob.top, ob.bottom, ob.startIndex, ob.type, "OB", false));

    // Draw swept liquidity lines
    const swept = analysis.liquidity.filter(l => l.swept).slice(0, 3);
    swept.forEach(liq => {
       const liqColor = liq.type === "BUYSIDE" ? "rgba(59, 130, 246, 0.8)" : "rgba(245, 158, 11, 0.8)";
       const ls = chart.addSeries(LineSeries, { color: liqColor, lineWidth: 1, lineStyle: 3, crosshairMarkerVisible: false, priceLineVisible: false });
       
       const startIdx = data.findIndex(d => d.time === liq.time) || Math.max(0, data.length - 20);
       ls.setData([{ time: data[startIdx].time as Time, value: liq.price }, { time: data[data.length - 1].time as Time, value: liq.price }]);
       seriesRefs.current.push(ls);
    });

    return () => {
      seriesRefs.current.forEach(s => {
        try { chart.removeSeries(s); } catch (e) {}
      });
      seriesRefs.current = [];
    };
  }, [chartRef, analysis, data, enabled]);

  return <></>;
}
