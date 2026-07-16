"""
Vision Service
Business logic layer between the Vision API router and the CV pipeline + DB.
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.cv.vision_pipeline import VisionPipeline
from app.cv.screenshot_manager import ScreenshotManager
from app.cv.feature_bridge import FeatureBridge
from app.models.models import VisionAnalysis, ChartScreenshot, User

logger = logging.getLogger("services.vision")


class VisionService:

    @staticmethod
    async def analyze_chart(
        db: AsyncSession,
        user: User,
        image_bytes: bytes,
        mime_type: str,
        pair: Optional[str] = None,
        timeframe: Optional[str] = None,
        enable_yolo: bool = True,
        enable_vit: bool = True,
        enable_ocr: bool = True,
    ) -> Dict[str, Any]:
        """
        Run the full vision pipeline and persist the analysis result.
        Conditionally saves the screenshot based on user preferences.
        """
        # 1. Run vision pipeline
        pipeline = VisionPipeline()
        chart_analysis = await pipeline.run(
            image_bytes=image_bytes,
            pair=pair,
            timeframe=timeframe,
            enable_yolo=enable_yolo,
            enable_vit=enable_vit,
            enable_ocr=enable_ocr,
        )

        # 2. Optionally save screenshot
        screenshot: Optional[ChartScreenshot] = await ScreenshotManager.maybe_save(
            db=db,
            user=user,
            image_bytes=image_bytes,
            mime_type=mime_type,
            pair=chart_analysis.get("pair"),
            timeframe=chart_analysis.get("timeframe"),
        )

        # 3. Persist VisionAnalysis record
        market_structure_raw = chart_analysis.get("market_structure", {})
        vision_record = VisionAnalysis(
            user_id=user.id,
            screenshot_id=screenshot.id if screenshot else None,
            pair=chart_analysis.get("pair"),
            timeframe=chart_analysis.get("timeframe"),
            candlesticks=chart_analysis.get("candlesticks", []),
            trendlines=chart_analysis.get("trendlines", []),
            support_zones=chart_analysis.get("support_zones", []),
            resistance_zones=chart_analysis.get("resistance_zones", []),
            chart_patterns=chart_analysis.get("chart_patterns", []),
            market_structure=market_structure_raw,
            indicator_readings=chart_analysis.get("indicator_readings", {}),
            ocr_labels=chart_analysis.get("ocr_labels", []),
            hough_trendlines=chart_analysis.get("hough_trendlines", []),
            yolo_enabled=enable_yolo,
            vit_enabled=enable_vit,
            ocr_enabled=enable_ocr,
            processing_time_ms=chart_analysis.get("processing_time_ms", 0),
            screenshot_saved=screenshot is not None,
        )
        db.add(vision_record)
        await db.commit()
        await db.refresh(vision_record)

        return {
            "analysis_id": vision_record.id,
            "screenshot_id": screenshot.id if screenshot else None,
            "screenshot_saved": screenshot is not None,
            **chart_analysis,
        }

    @staticmethod
    async def analyze_and_predict(
        db: AsyncSession,
        user: User,
        image_bytes: bytes,
        mime_type: str,
        pair: str,
        timeframe: str,
        enable_yolo: bool = True,
        enable_vit: bool = True,
        enable_ocr: bool = True,
    ) -> Dict[str, Any]:
        """
        Run vision pipeline then immediately feed results into the Prediction Engine.
        """
        analysis_result = await VisionService.analyze_chart(
            db=db, user=user, image_bytes=image_bytes, mime_type=mime_type,
            pair=pair, timeframe=timeframe,
            enable_yolo=enable_yolo, enable_vit=enable_vit, enable_ocr=enable_ocr,
        )

        prediction = await FeatureBridge.run_prediction_with_vision(
            db=db,
            chart_analysis=analysis_result,
            pair=pair,
            timeframe=timeframe,
            vision_analysis_id=analysis_result["analysis_id"],
        )

        return {
            "analysis": analysis_result,
            "prediction_id": prediction.id,
            "direction": prediction.direction.value,
            "confidence_value": float(prediction.confidence_value),
            "entry_price": float(prediction.entry_price),
            "stop_loss": float(prediction.stop_loss),
            "take_profit": float(prediction.take_profit),
            "risk_reward": float(prediction.risk_reward),
            "ai_narrative": prediction.ai_narrative,
        }

    @staticmethod
    async def list_screenshots(
        db: AsyncSession, user_id: str, limit: int = 50
    ) -> List[ChartScreenshot]:
        """List non-deleted screenshots for the current user."""
        return await ScreenshotManager.list_screenshots(db, user_id, limit)

    @staticmethod
    async def delete_screenshot(
        db: AsyncSession, screenshot_id: str, user_id: str
    ) -> bool:
        """Soft-delete a screenshot by ID."""
        return await ScreenshotManager.delete_screenshot(db, screenshot_id, user_id, hard_delete=False)

    @staticmethod
    async def update_history_setting(
        db: AsyncSession, user: User, enabled: bool
    ) -> User:
        """Toggle screenshot history for current user."""
        return await ScreenshotManager.update_history_setting(db, user, enabled)

    @staticmethod
    async def get_analysis_stats(db: AsyncSession) -> Dict[str, Any]:
        """Admin: aggregate statistics for all vision analyses."""
        from sqlalchemy import func as sqlfunc
        q = select(
            sqlfunc.count(VisionAnalysis.id).label("total"),
            sqlfunc.avg(VisionAnalysis.processing_time_ms).label("avg_ms"),
        )
        res = await db.execute(q)
        row = res.first()
        return {
            "total_analyses": row.total or 0,
            "avg_processing_time_ms": round(float(row.avg_ms or 0), 1),
        }
