"""
Feature Bridge: Computer Vision ↔ AI Prediction Engine
Merges the structured ChartAnalysis output from the Vision Pipeline with
live numerical indicator data and forwards the enriched payload to the
Phase 7 Real-Time Prediction Engine.
"""

import logging
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.realtime_engine import RealtimePredictionEngine
from app.models.models import Prediction, VisionAnalysis

logger = logging.getLogger("cv.feature_bridge")


class FeatureBridge:
    """
    Merges vision-derived signals with the numeric prediction pipeline.
    """

    @staticmethod
    def enrich_indicators(
        chart_analysis: Dict[str, Any],
        live_indicators: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Combine CV-extracted signals with live numeric indicators.

        CV-extracted signals take precedence for structural data (patterns,
        support/resistance), while live numeric data governs oscillators
        (RSI, MACD, ATR) when available.

        Returns an enriched indicators dict compatible with the Prediction Engine.
        """
        enriched = dict(live_indicators) if live_indicators else {}

        # Merge OCR-extracted indicator readings (may refine live data)
        ocr_readings = chart_analysis.get("indicator_readings", {})
        if "rsi" in ocr_readings and ocr_readings["rsi"]:
            enriched.setdefault("rsi", ocr_readings["rsi"])
        if "macd" in ocr_readings and ocr_readings["macd"]:
            enriched.setdefault("macd_histogram", ocr_readings["macd"])

        # Inject vision-derived structural context
        market_structure = chart_analysis.get("market_structure", {})
        enriched["cv_trend"] = market_structure.get("trend", "ranging")
        enriched["cv_phase"] = market_structure.get("phase", "unknown")
        enriched["cv_market_structure"] = market_structure.get("structure", "unknown")

        # Inject detected chart patterns as context tags
        pattern_names = [p["name"] for p in chart_analysis.get("chart_patterns", [])]
        enriched["cv_patterns"] = pattern_names
        enriched["cv_candlesticks"] = [c["type"] for c in chart_analysis.get("candlesticks", [])]

        # Surface support / resistance from vision for risk calculations
        supports = chart_analysis.get("support_zones", [])
        resistances = chart_analysis.get("resistance_zones", [])
        if supports:
            enriched.setdefault("support_levels", [s.get("price", 0) for s in supports if "price" in s])
        if resistances:
            enriched.setdefault("resistance_levels", [r.get("price", 0) for r in resistances if "price" in r])

        return enriched

    @staticmethod
    async def run_prediction_with_vision(
        db: AsyncSession,
        chart_analysis: Dict[str, Any],
        pair: str,
        timeframe: str,
        vision_analysis_id: str,
    ) -> Prediction:
        """
        Run the Phase 7 Prediction Engine with vision-enriched context.

        Steps:
          1. Run realtime prediction engine for the pair/timeframe
          2. Annotate the returned prediction with the vision analysis ID
          3. Update the VisionAnalysis record with the new prediction ID
        """
        logger.info("Bridging CV analysis %s → Prediction Engine for %s %s", vision_analysis_id, pair, timeframe)

        engine = RealtimePredictionEngine(db)
        prediction: Prediction = await engine.execute_realtime_prediction(pair, timeframe)

        # Link the prediction back to the vision analysis
        from sqlalchemy.future import select
        q = select(VisionAnalysis).filter(VisionAnalysis.id == vision_analysis_id)
        res = await db.execute(q)
        vision_rec = res.scalars().first()
        if vision_rec:
            vision_rec.prediction_id = prediction.id
            db.add(vision_rec)
            await db.commit()

        logger.info(
            "CV-enriched prediction %s created. direction=%s confidence=%.1f",
            prediction.id, prediction.direction, prediction.confidence_value,
        )
        return prediction
