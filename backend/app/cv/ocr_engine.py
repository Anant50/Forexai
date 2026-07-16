"""
Stage 4: OCR Engine
Reads text labels, price values, timestamps, indicator readings, and currency
pair info directly from chart images.

Primary:  EasyOCR (GPU-accelerated, handles stylized chart fonts well)
Fallback: pytesseract (CPU-only, offline)

Extracted targets:
  - Price levels  (e.g. "1.08550")
  - Date/time     (e.g. "Jul 15", "14:30")
  - Indicator values (e.g. "RSI: 67.4", "MACD -0.002")
  - Currency pair (e.g. "EUR/USD")
  - Timeframe     (e.g. "4H", "1H", "D1")
"""

import logging
import re
from typing import Dict, Any, List, Optional

import numpy as np

logger = logging.getLogger("cv.ocr_engine")

_EASYOCR_READER = None  # Lazy-loaded EasyOCR reader

# Regex patterns for structured data extraction
_PRICE_RE = re.compile(r"\b\d{1,4}\.\d{3,6}\b")
_PAIR_RE = re.compile(r"\b([A-Z]{3})[/\-]([A-Z]{3})\b")
_TIMEFRAME_RE = re.compile(r"\b(1m|5m|15m|30m|1H|4H|1D|D1|W1|MN)\b", re.IGNORECASE)
_INDICATOR_RSI_RE = re.compile(r"RSI[\s:]+(\d{1,2}\.?\d*)", re.IGNORECASE)
_INDICATOR_MACD_RE = re.compile(r"MACD[\s:]+(-?\d+\.?\d*)", re.IGNORECASE)
_DATETIME_RE = re.compile(
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b"
    r"|\b\d{2}:\d{2}\b",
    re.IGNORECASE,
)


def _load_easyocr():
    """Lazy-load EasyOCR reader (English only, GPU if available)."""
    global _EASYOCR_READER
    if _EASYOCR_READER is not None:
        return _EASYOCR_READER
    try:
        import easyocr
        logger.info("Loading EasyOCR reader (this may take a moment first time).")
        _EASYOCR_READER = easyocr.Reader(["en"], gpu=False, verbose=False)
        logger.info("EasyOCR loaded.")
    except Exception as exc:
        logger.warning("EasyOCR unavailable (%s). Will try pytesseract fallback.", exc)
        _EASYOCR_READER = None
    return _EASYOCR_READER


def _tesseract_ocr(img_array: np.ndarray) -> List[str]:
    """Tesseract fallback: returns a flat list of text tokens."""
    try:
        import pytesseract
        from PIL import Image as PILImage
        pil_img = PILImage.fromarray(img_array)
        raw_text = pytesseract.image_to_string(pil_img, lang="eng")
        return [t.strip() for t in raw_text.splitlines() if t.strip()]
    except Exception as exc:
        logger.warning("Tesseract OCR also failed: %s. Returning empty labels.", exc)
        return []


def _extract_structured_data(raw_labels: List[str]) -> Dict[str, Any]:
    """
    Parse extracted text tokens into structured fields using regex.
    Returns dict with prices, pair, timeframe, indicator readings, and datetimes.
    """
    full_text = " ".join(raw_labels)

    prices = [float(p) for p in _PRICE_RE.findall(full_text)]
    pair_match = _PAIR_RE.search(full_text)
    pair = f"{pair_match.group(1)}/{pair_match.group(2)}" if pair_match else None
    tf_match = _TIMEFRAME_RE.search(full_text)
    timeframe = tf_match.group(0).upper() if tf_match else None
    datetimes = _DATETIME_RE.findall(full_text)

    indicator_readings: Dict[str, Any] = {}
    rsi_match = _INDICATOR_RSI_RE.search(full_text)
    if rsi_match:
        try:
            indicator_readings["rsi"] = float(rsi_match.group(1))
        except ValueError:
            pass
    macd_match = _INDICATOR_MACD_RE.search(full_text)
    if macd_match:
        try:
            indicator_readings["macd"] = float(macd_match.group(1))
        except ValueError:
            pass

    return {
        "prices": prices,
        "pair": pair,
        "timeframe": timeframe,
        "datetimes": datetimes,
        "indicator_readings": indicator_readings,
    }


class OCREngine:
    """
    Stage 4 OCR engine. Synchronous; call from run_in_executor.
    """

    @staticmethod
    def extract_text(rgb_array: np.ndarray) -> Dict[str, Any]:
        """
        Run OCR on a pre-processed RGB image array.

        Returns:
            raw_labels: list of all text fragments detected
            prices: list of float price values extracted
            pair: detected currency pair string (e.g. "EUR/USD") or None
            timeframe: detected timeframe (e.g. "4H") or None
            indicator_readings: dict of parsed indicator values
            datetimes: list of detected date/time strings
        """
        reader = _load_easyocr()
        raw_labels: List[str] = []

        if reader is not None:
            try:
                results = reader.readtext(rgb_array, detail=0, paragraph=False)
                raw_labels = [str(r).strip() for r in results if str(r).strip()]
            except Exception as exc:
                logger.warning("EasyOCR inference failed (%s). Trying tesseract.", exc)
                raw_labels = _tesseract_ocr(rgb_array)
        else:
            raw_labels = _tesseract_ocr(rgb_array)

        structured = _extract_structured_data(raw_labels)

        logger.debug(
            "OCR complete. tokens=%d prices=%d pair=%s tf=%s",
            len(raw_labels), len(structured["prices"]),
            structured["pair"], structured["timeframe"],
        )

        return {
            "raw_labels": raw_labels,
            **structured,
        }
