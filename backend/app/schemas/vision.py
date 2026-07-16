"""
Pydantic Schemas for the Computer Vision Engine API (Phase 9).
Covers request bodies, response payloads, and nested data structures.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import timezone, datetime


# ─── Nested CV result schemas ──────────────────────────────────────────────────

class BoundingBox(BaseModel):
    """Normalised bounding box [nx, ny, nw, nh] relative to image dimensions."""
    nx: float
    ny: float
    nw: float
    nh: float


class CandlestickDetection(BaseModel):
    type: str
    bbox: List[float]       # [nx, ny, nw, nh]
    confidence: float


class TrendlineDetection(BaseModel):
    type: str
    bbox: Optional[List[float]] = None
    start: Optional[List[float]] = None
    end: Optional[List[float]] = None
    angle_degrees: Optional[float] = None
    direction: Optional[str] = None
    confidence: Optional[float] = None


class SupportResistanceZone(BaseModel):
    price: Optional[float] = None
    bbox: Optional[List[float]] = None
    confidence: float
    source: Optional[str] = "yolo"  # "yolo" | "ocr"


class ChartPatternDetection(BaseModel):
    name: str
    confidence: float
    phase: str              # "forming" | "breakout_pending" | "pattern_complete"


class MarketStructure(BaseModel):
    trend: str              # "bullish" | "bearish" | "ranging"
    phase: str              # "accumulation" | "markup" | "distribution" | "markdown"
    phase_confidence: float
    structure: str          # "higher_highs_higher_lows" | etc.
    structure_confidence: float
    momentum: str           # "overbought" | "oversold" | "neutral"


class HoughTrendline(BaseModel):
    start: List[float]
    end: List[float]
    angle_degrees: float
    length_px: float
    direction: str


class ModelVersionInfo(BaseModel):
    vit: str
    yolo: str
    ocr: str


# ─── Primary API response ──────────────────────────────────────────────────────

class ChartAnalysisResponse(BaseModel):
    """Full output from the 5-stage vision pipeline."""
    analysis_id: str
    pair: Optional[str]
    timeframe: Optional[str]
    candlesticks: List[CandlestickDetection]
    trendlines: List[TrendlineDetection]
    support_zones: List[SupportResistanceZone]
    resistance_zones: List[SupportResistanceZone]
    chart_patterns: List[ChartPatternDetection]
    market_structure: MarketStructure
    indicator_readings: Dict[str, Any]
    ocr_labels: List[str]
    ocr_prices: List[float]
    hough_trendlines: List[HoughTrendline]
    processing_time_ms: int
    screenshot_saved: bool
    screenshot_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ChartAnalysisWithPredictionResponse(BaseModel):
    """Combined CV analysis + AI prediction response."""
    analysis: ChartAnalysisResponse
    prediction_id: str
    direction: str
    confidence_value: float
    entry_price: float
    stop_loss: float
    take_profit: float
    risk_reward: float
    ai_narrative: str
    model_config = ConfigDict(from_attributes=True)


# ─── Screenshot management ────────────────────────────────────────────────────

class ChartScreenshotResponse(BaseModel):
    id: str
    pair: Optional[str]
    timeframe: Optional[str]
    mime_type: str
    file_size_bytes: Optional[int]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class HistorySettingRequest(BaseModel):
    enabled: bool = Field(..., description="Enable or disable screenshot history storage.")


class HistorySettingResponse(BaseModel):
    vision_history_enabled: bool
    message: str
