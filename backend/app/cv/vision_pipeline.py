"""
Vision Pipeline Orchestrator
Runs all 5 stages sequentially for a given image, coordinating async execution
of CPU-bound OpenCV/YOLO/ViT/OCR operations via asyncio.run_in_executor.

Usage:
    pipeline = VisionPipeline()
    result = await pipeline.run(image_bytes, pair="EUR/USD", timeframe="4H")
"""

import asyncio
import logging
import time
from functools import partial
from typing import Dict, Any, Optional

from app.cv.preprocessor import ImagePreprocessor
from app.cv.yolo_detector import YOLODetector
from app.cv.vit_classifier import ViTClassifier
from app.cv.ocr_engine import OCREngine
from app.cv.data_structurer import DataStructurer

logger = logging.getLogger("cv.pipeline")


class VisionPipeline:
    """
    Orchestrates the 5-stage Computer Vision pipeline.
    All heavy CPU/GPU operations run in a thread pool executor to avoid
    blocking FastAPI's async event loop.
    """

    def __init__(self):
        self._loop = None

    async def run(
        self,
        image_bytes: bytes,
        pair: Optional[str] = None,
        timeframe: Optional[str] = None,
        enable_yolo: bool = True,
        enable_vit: bool = True,
        enable_ocr: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute the full vision pipeline asynchronously.

        Args:
            image_bytes: Raw image bytes (PNG or JPEG)
            pair: Optional user-provided currency pair override
            timeframe: Optional user-provided timeframe override
            enable_yolo: Toggle YOLO object detection stage
            enable_vit: Toggle ViT classification stage
            enable_ocr: Toggle OCR text extraction stage

        Returns:
            ChartAnalysis canonical dict from DataStructurer.
        """
        loop = asyncio.get_event_loop()
        t_start = time.monotonic()

        logger.info(
            "Starting vision pipeline. pair=%s tf=%s yolo=%s vit=%s ocr=%s",
            pair, timeframe, enable_yolo, enable_vit, enable_ocr,
        )

        # ── Stage 1: OpenCV pre-processing (CPU-bound) ───────────────────────
        preprocess_fn = partial(ImagePreprocessor.full_preprocess, image_bytes)
        preprocess_output = await loop.run_in_executor(None, preprocess_fn)
        logger.debug("Stage 1 complete (preprocess). hough_lines=%d", len(preprocess_output.get("hough_trendlines", [])))

        yolo_array = preprocess_output["yolo_array"]
        vit_array = preprocess_output["vit_array"]

        # ── Stages 2, 3, 4 run concurrently where enabled ────────────────────
        yolo_task = None
        vit_task = None
        ocr_task = None

        async def run_yolo():
            fn = partial(YOLODetector.detect, yolo_array)
            return await loop.run_in_executor(None, fn)

        async def run_vit(yolo_result):
            fn = partial(ViTClassifier.classify, vit_array, yolo_result)
            return await loop.run_in_executor(None, fn)

        async def run_ocr():
            fn = partial(OCREngine.extract_text, vit_array)
            return await loop.run_in_executor(None, fn)

        # YOLO first (needed as context for ViT)
        if enable_yolo:
            yolo_output = await run_yolo()
            logger.debug("Stage 2 complete (YOLO). detections=%d", sum(
                len(v) for v in yolo_output.values() if isinstance(v, list)
            ))
        else:
            yolo_output = {"candlesticks": [], "support_zones": [], "resistance_zones": [], "trendlines": [], "other": []}

        # ViT and OCR can run concurrently
        tasks = []
        if enable_vit:
            tasks.append(run_vit(yolo_output))
        if enable_ocr:
            tasks.append(run_ocr())

        results = await asyncio.gather(*tasks)

        # Unpack gathered results
        result_idx = 0
        if enable_vit:
            vit_output = results[result_idx]
            result_idx += 1
            logger.debug("Stage 3 complete (ViT). pattern=%s", vit_output.get("chart_pattern"))
        else:
            vit_output = {
                "chart_pattern": "no_pattern", "chart_pattern_confidence": 0.0,
                "trend_phase": "unknown", "market_structure": "unknown",
                "momentum": "neutral", "top_patterns": [], "model": "disabled",
            }

        if enable_ocr:
            ocr_output = results[result_idx]
            logger.debug("Stage 4 complete (OCR). tokens=%d", len(ocr_output.get("raw_labels", [])))
        else:
            ocr_output = {"raw_labels": [], "prices": [], "pair": None, "timeframe": None,
                          "indicator_readings": {}, "datetimes": []}

        # ── Stage 5: Data Structurer ──────────────────────────────────────────
        t_elapsed_ms = int((time.monotonic() - t_start) * 1000)
        chart_analysis = DataStructurer.structure(
            preprocess_output=preprocess_output,
            yolo_output=yolo_output,
            vit_output=vit_output,
            ocr_output=ocr_output,
            provided_pair=pair,
            provided_timeframe=timeframe,
            processing_time_ms=t_elapsed_ms,
        )

        logger.info(
            "Vision pipeline complete in %dms. patterns=%d candlesticks=%d",
            t_elapsed_ms, len(chart_analysis["chart_patterns"]), len(chart_analysis["candlesticks"]),
        )

        return chart_analysis
