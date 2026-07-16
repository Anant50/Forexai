"""
Stage 5: Data Structurer
Converts all extracted signals from Stages 1–4 into a canonical ChartAnalysis dict.

The ChartAnalysis payload is the standardised contract between the Computer Vision
Engine and the Phase 7 AI Prediction Engine (feature bridge).
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("cv.data_structurer")


class DataStructurer:
    """
    Assembles all pipeline outputs into the canonical ChartAnalysis schema.
    """

    @staticmethod
    def structure(
        preprocess_output: Dict[str, Any],
        yolo_output: Dict[str, Any],
        vit_output: Dict[str, Any],
        ocr_output: Dict[str, Any],
        provided_pair: Optional[str] = None,
        provided_timeframe: Optional[str] = None,
        processing_time_ms: int = 0,
    ) -> Dict[str, Any]:
        """
        Merge outputs from all four pipeline stages into a single ChartAnalysis dict.

        Priority for pair/timeframe resolution:
          1. Caller-provided value (user specified in API call)
          2. OCR-detected value from chart labels
          3. None (left as unknown)
        """
        # ── Pair & Timeframe resolution ───────────────────────────────────────
        pair = provided_pair or ocr_output.get("pair")
        timeframe = provided_timeframe or ocr_output.get("timeframe")

        # ── Candlestick detections ────────────────────────────────────────────
        candlesticks = yolo_output.get("candlesticks", [])

        # ── Trendlines: merge YOLO detections + Hough geometric lines ─────────
        yolo_trendlines = yolo_output.get("trendlines", [])
        hough_lines = preprocess_output.get("hough_trendlines", [])
        trendlines = yolo_trendlines  # YOLO semantic trendlines surface first

        # ── Support & Resistance zones ────────────────────────────────────────
        support_zones = yolo_output.get("support_zones", [])
        resistance_zones = yolo_output.get("resistance_zones", [])

        # If YOLO found price anchors via OCR, enrich with real price levels
        ocr_prices = ocr_output.get("prices", [])
        if ocr_prices:
            # Heuristic: lowest 30% of detected prices → support, upper 30% → resistance
            sorted_prices = sorted(ocr_prices)
            n = len(sorted_prices)
            if n >= 3:
                support_anchor = sorted_prices[: max(1, n // 3)]
                resistance_anchor = sorted_prices[-(max(1, n // 3)):]
                for p in support_anchor:
                    support_zones.append({"price": p, "confidence": 0.70, "source": "ocr"})
                for p in resistance_anchor:
                    resistance_zones.append({"price": p, "confidence": 0.70, "source": "ocr"})

        # ── Chart patterns from ViT ───────────────────────────────────────────
        chart_patterns = []
        if vit_output.get("chart_pattern") and vit_output["chart_pattern"] != "no_pattern":
            chart_patterns.append({
                "name": vit_output["chart_pattern"],
                "confidence": vit_output.get("chart_pattern_confidence", 0.0),
                "phase": _infer_pattern_phase(vit_output["chart_pattern"]),
            })
        # Add secondary top patterns if confidence is meaningful
        for p in vit_output.get("top_patterns", [])[1:3]:
            if p.get("score", 0) > 0.25 and p["label"] != "no_pattern":
                chart_patterns.append({
                    "name": p["label"],
                    "confidence": round(p["score"], 4),
                    "phase": _infer_pattern_phase(p["label"]),
                })

        # ── Market structure ──────────────────────────────────────────────────
        market_structure = {
            "trend": _derive_trend(vit_output),
            "phase": vit_output.get("trend_phase", "unknown"),
            "phase_confidence": vit_output.get("trend_phase_confidence", 0.0),
            "structure": vit_output.get("market_structure", "unknown"),
            "structure_confidence": vit_output.get("market_structure_confidence", 0.0),
            "momentum": vit_output.get("momentum", "neutral"),
        }

        # ── Indicator readings from OCR ───────────────────────────────────────
        indicator_readings = ocr_output.get("indicator_readings", {})
        indicator_readings["pair_detected"] = bool(pair)
        indicator_readings["timeframe_detected"] = bool(timeframe)

        # ── Final canonical output ────────────────────────────────────────────
        return {
            "pair": pair,
            "timeframe": timeframe,
            "candlesticks": candlesticks,
            "trendlines": trendlines,
            "support_zones": support_zones,
            "resistance_zones": resistance_zones,
            "chart_patterns": chart_patterns,
            "market_structure": market_structure,
            "indicator_readings": indicator_readings,
            "ocr_labels": ocr_output.get("raw_labels", []),
            "ocr_prices": ocr_prices,
            "hough_trendlines": hough_lines,
            "processing_time_ms": processing_time_ms,
            "model_versions": {
                "vit": vit_output.get("model", "unknown"),
                "yolo": "yolov8",
                "ocr": "easyocr",
            },
        }


def _derive_trend(vit_output: Dict[str, Any]) -> str:
    """Map ViT market structure to simple bullish/bearish/ranging label."""
    structure = vit_output.get("market_structure", "")
    if "higher_highs" in structure:
        return "bullish"
    if "lower_highs" in structure or "lower_lows" in structure:
        return "bearish"
    return "ranging"


def _infer_pattern_phase(pattern_name: str) -> str:
    """Infer the likely breakout phase from the chart pattern name."""
    breakout_imminent = {"ascending_triangle", "descending_triangle", "pennant", "bull_flag", "bear_flag"}
    completed = {"head_and_shoulders", "double_top", "double_bottom", "cup_and_handle"}
    if pattern_name in breakout_imminent:
        return "breakout_pending"
    if pattern_name in completed:
        return "pattern_complete"
    return "forming"
