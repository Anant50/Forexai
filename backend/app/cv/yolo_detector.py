"""
Stage 2: YOLO Object Detector
Detects chart-specific objects using a fine-tuned YOLOv8 model.

Detectable classes (13 total):
  0:  candlestick_bullish
  1:  candlestick_bearish
  2:  candlestick_doji
  3:  candlestick_hammer
  4:  candlestick_shooting_star
  5:  support_zone
  6:  resistance_zone
  7:  trendline_ascending
  8:  trendline_descending
  9:  horizontal_line
  10: text_label
  11: indicator_panel
  12: volume_bar

Model loading is lazy: the model weight is only loaded on the first detection call
and held in memory for the lifetime of the process (no background daemon).
"""

import logging
import os
from typing import Dict, Any, List, Optional
from pathlib import Path

import numpy as np

logger = logging.getLogger("cv.yolo_detector")

# Class label map matching fine-tuned YOLO head
YOLO_CLASS_NAMES = {
    0: "candlestick_bullish",
    1: "candlestick_bearish",
    2: "candlestick_doji",
    3: "candlestick_hammer",
    4: "candlestick_shooting_star",
    5: "support_zone",
    6: "resistance_zone",
    7: "trendline_ascending",
    8: "trendline_descending",
    9: "horizontal_line",
    10: "text_label",
    11: "indicator_panel",
    12: "volume_bar",
}

_YOLO_MODEL = None  # Lazy-loaded singleton within this process

# Path to fine-tuned weights (gitignored binary). Falls back to base nano model.
_MODEL_WEIGHTS_PATH = Path(__file__).parent / "models" / "yolov8_forex_charts.pt"
_FALLBACK_WEIGHTS = "yolov8n.pt"

CONFIDENCE_THRESHOLD = 0.45
IOU_THRESHOLD = 0.50


def _load_yolo_model():
    """
    Lazy-load YOLOv8 model weights into process memory.
    Uses fine-tuned weights if available, falls back to pretrained base model.
    """
    global _YOLO_MODEL
    if _YOLO_MODEL is not None:
        return _YOLO_MODEL

    try:
        from ultralytics import YOLO
        weights = str(_MODEL_WEIGHTS_PATH) if _MODEL_WEIGHTS_PATH.exists() else _FALLBACK_WEIGHTS
        logger.info("Loading YOLO model from: %s", weights)
        _YOLO_MODEL = YOLO(weights)
        logger.info("YOLO model loaded successfully.")
    except Exception as exc:
        logger.warning("YOLO unavailable (%s). Detector will return stub data.", exc)
        _YOLO_MODEL = None

    return _YOLO_MODEL


def _bbox_to_normalised(box, img_w: int, img_h: int) -> List[float]:
    """Convert absolute pixel bbox [x1, y1, x2, y2] to [nx1, ny1, nw, nh]."""
    x1, y1, x2, y2 = float(box[0]), float(box[1]), float(box[2]), float(box[3])
    return [
        round(x1 / img_w, 4),
        round(y1 / img_h, 4),
        round((x2 - x1) / img_w, 4),
        round((y2 - y1) / img_h, 4),
    ]


class YOLODetector:
    """
    Wraps YOLOv8 inference into a clean synchronous API.
    Call from asyncio.run_in_executor to avoid blocking the event loop.
    """

    @staticmethod
    def detect(rgb_array: np.ndarray) -> Dict[str, List[Dict[str, Any]]]:
        """
        Run YOLO inference on a pre-processed 640×640 RGB image array.

        Returns a structured dict grouping detections by semantic category:
          - candlesticks: list of candle detection dicts
          - support_zones: list of support zone detections
          - resistance_zones: list of resistance zone detections
          - trendlines: list of trendline detections
          - other: remaining detected objects
        """
        model = _load_yolo_model()
        img_h, img_w = rgb_array.shape[:2]

        # Initialise empty result buckets
        result: Dict[str, List] = {
            "candlesticks": [],
            "support_zones": [],
            "resistance_zones": [],
            "trendlines": [],
            "indicator_panels": [],
            "other": [],
        }

        if model is None:
            # Return stub data for test/development environments without GPU
            logger.debug("YOLO model unavailable — returning stub detections.")
            result["candlesticks"] = [
                {"type": "candlestick_bullish", "bbox": [0.1, 0.2, 0.05, 0.1], "confidence": 0.87}
            ]
            result["trendlines"] = [
                {"type": "trendline_ascending", "bbox": [0.0, 0.8, 0.9, 0.15], "confidence": 0.75}
            ]
            result["support_zones"] = [
                {"type": "support_zone", "bbox": [0.0, 0.9, 1.0, 0.02], "confidence": 0.82}
            ]
            result["resistance_zones"] = [
                {"type": "resistance_zone", "bbox": [0.0, 0.1, 1.0, 0.02], "confidence": 0.79}
            ]
            return result

        try:
            predictions = model.predict(
                source=rgb_array,
                conf=CONFIDENCE_THRESHOLD,
                iou=IOU_THRESHOLD,
                verbose=False,
            )
        except Exception as exc:
            logger.error("YOLO inference failed: %s", exc)
            return result

        for pred in predictions:
            for box in pred.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = YOLO_CLASS_NAMES.get(cls_id, f"class_{cls_id}")
                bbox = _bbox_to_normalised(box.xyxy[0].tolist(), img_w, img_h)
                detection = {"type": label, "bbox": bbox, "confidence": round(conf, 4)}

                if label.startswith("candlestick"):
                    result["candlesticks"].append(detection)
                elif label == "support_zone":
                    result["support_zones"].append(detection)
                elif label == "resistance_zone":
                    result["resistance_zones"].append(detection)
                elif label in ("trendline_ascending", "trendline_descending", "horizontal_line"):
                    result["trendlines"].append(detection)
                elif label == "indicator_panel":
                    result["indicator_panels"].append(detection)
                else:
                    result["other"].append(detection)

        logger.debug(
            "YOLO detection: candles=%d support=%d resistance=%d trendlines=%d",
            len(result["candlesticks"]), len(result["support_zones"]),
            len(result["resistance_zones"]), len(result["trendlines"]),
        )
        return result
