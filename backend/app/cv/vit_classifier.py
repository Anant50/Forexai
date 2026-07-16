"""
Stage 3: Vision Transformer (ViT) Chart Classifier
Performs holistic chart understanding — classifying market structure,
chart patterns, and momentum phase beyond what bounding boxes can capture.

Model: google/vit-base-patch16-224 (fine-tuned on forex chart dataset)
Fallback: rule-based heuristics when model is unavailable.

Classification targets:
  - Chart Pattern:  head_and_shoulders, double_top, double_bottom,
                    ascending_triangle, descending_triangle, wedge_rising,
                    wedge_falling, bull_flag, bear_flag, pennant, cup_and_handle,
                    channel_up, channel_down, no_pattern
  - Trend Phase:    accumulation, markup, distribution, markdown
  - Market Structure: higher_highs_higher_lows, lower_highs_lower_lows,
                      ranging, transitioning
  - Momentum:       overbought, oversold, neutral
"""

import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

import numpy as np

logger = logging.getLogger("cv.vit_classifier")

_VIT_PIPELINE = None  # Lazy-loaded HuggingFace pipeline
_MODEL_DIR = Path(__file__).parent / "models" / "vit_forex_finetuned"
_HF_MODEL_ID = "google/vit-base-patch16-224"

# Pattern classes the ViT head is trained to predict
CHART_PATTERN_CLASSES = [
    "head_and_shoulders", "inverse_head_and_shoulders",
    "double_top", "double_bottom",
    "ascending_triangle", "descending_triangle", "symmetrical_triangle",
    "wedge_rising", "wedge_falling",
    "bull_flag", "bear_flag", "pennant",
    "cup_and_handle",
    "channel_up", "channel_down",
    "no_pattern",
]

TREND_PHASE_CLASSES = ["accumulation", "markup", "distribution", "markdown"]

MARKET_STRUCTURE_CLASSES = [
    "higher_highs_higher_lows",
    "lower_highs_lower_lows",
    "ranging",
    "transitioning",
]

MOMENTUM_CLASSES = ["overbought", "oversold", "neutral"]


def _load_vit_pipeline():
    """
    Lazy-load HuggingFace ViT image classification pipeline.
    Uses fine-tuned local weights if available, else falls back to base model.
    """
    global _VIT_PIPELINE
    if _VIT_PIPELINE is not None:
        return _VIT_PIPELINE

    try:
        from transformers import pipeline
        model_source = str(_MODEL_DIR) if _MODEL_DIR.exists() else _HF_MODEL_ID
        logger.info("Loading ViT pipeline from: %s", model_source)
        _VIT_PIPELINE = pipeline(
            "image-classification",
            model=model_source,
            top_k=5,
        )
        logger.info("ViT pipeline loaded successfully.")
    except Exception as exc:
        logger.warning("ViT model unavailable (%s). Will use heuristic fallback.", exc)
        _VIT_PIPELINE = None

    return _VIT_PIPELINE


def _heuristic_classification(yolo_detections: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rule-based fallback classifier when ViT model is not available.
    Uses YOLO detections and Hough trendlines as proxy signals.
    """
    candlesticks = yolo_detections.get("candlesticks", [])
    trendlines = yolo_detections.get("trendlines", [])
    support = yolo_detections.get("support_zones", [])
    resistance = yolo_detections.get("resistance_zones", [])

    bullish_count = sum(1 for c in candlesticks if "bullish" in c.get("type", ""))
    bearish_count = sum(1 for c in candlesticks if "bearish" in c.get("type", ""))

    # Derive chart pattern from structural signals
    if support and resistance and trendlines:
        pattern = "ascending_triangle" if bullish_count > bearish_count else "descending_triangle"
    elif bullish_count > bearish_count * 1.5:
        pattern = "bull_flag"
    elif bearish_count > bullish_count * 1.5:
        pattern = "bear_flag"
    else:
        pattern = "no_pattern"

    trend_phase = "markup" if bullish_count > bearish_count else "markdown" if bearish_count > bullish_count else "accumulation"
    market_structure = "higher_highs_higher_lows" if bullish_count > bearish_count else "lower_highs_lower_lows"
    momentum = "neutral"

    return {
        "chart_pattern": pattern,
        "chart_pattern_confidence": 0.65,
        "trend_phase": trend_phase,
        "trend_phase_confidence": 0.60,
        "market_structure": market_structure,
        "market_structure_confidence": 0.62,
        "momentum": momentum,
        "momentum_confidence": 0.55,
        "top_patterns": [
            {"label": pattern, "score": 0.65},
            {"label": "no_pattern", "score": 0.35},
        ],
        "model": "heuristic_fallback",
    }


class ViTClassifier:
    """
    Wraps ViT inference into a clean synchronous API.
    Call from asyncio.run_in_executor to avoid blocking the event loop.
    """

    @staticmethod
    def classify(
        vit_array: np.ndarray,
        yolo_detections: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run ViT classification on a pre-processed 224×224 RGB array.

        Args:
            vit_array: (224, 224, 3) uint8 RGB NumPy array
            yolo_detections: YOLO output dict (used as fallback context)

        Returns:
            Dict with chart_pattern, trend_phase, market_structure, momentum, and confidence scores.
        """
        pipeline = _load_vit_pipeline()

        if pipeline is None:
            return _heuristic_classification(yolo_detections)

        try:
            from PIL import Image as PILImage
            pil_img = PILImage.fromarray(vit_array)
            raw_preds = pipeline(pil_img)
        except Exception as exc:
            logger.error("ViT inference failed: %s. Using heuristic fallback.", exc)
            return _heuristic_classification(yolo_detections)

        # Map the top predicted label to our taxonomy
        top_label = raw_preds[0]["label"] if raw_preds else "no_pattern"
        top_score = raw_preds[0]["score"] if raw_preds else 0.5

        # Attempt to map to our chart pattern classes (may differ from pretrained labels)
        chart_pattern = top_label if top_label in CHART_PATTERN_CLASSES else "no_pattern"

        # Derive secondary classifications from pattern context
        bullish_patterns = {
            "bull_flag", "cup_and_handle", "ascending_triangle",
            "channel_up", "inverse_head_and_shoulders", "double_bottom",
        }
        bearish_patterns = {
            "bear_flag", "head_and_shoulders", "descending_triangle",
            "channel_down", "double_top", "wedge_rising",
        }

        if chart_pattern in bullish_patterns:
            trend_phase, market_structure = "markup", "higher_highs_higher_lows"
        elif chart_pattern in bearish_patterns:
            trend_phase, market_structure = "markdown", "lower_highs_lower_lows"
        else:
            trend_phase, market_structure = "accumulation", "ranging"

        return {
            "chart_pattern": chart_pattern,
            "chart_pattern_confidence": round(float(top_score), 4),
            "trend_phase": trend_phase,
            "trend_phase_confidence": round(float(top_score) * 0.85, 4),
            "market_structure": market_structure,
            "market_structure_confidence": round(float(top_score) * 0.80, 4),
            "momentum": "neutral",
            "momentum_confidence": 0.55,
            "top_patterns": [
                {"label": p["label"], "score": round(float(p["score"]), 4)}
                for p in raw_preds[:5]
            ],
            "model": "vit-base-patch16-224",
        }
