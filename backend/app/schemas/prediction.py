from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import timezone, datetime
from app.models.models import DirectionType, OutcomeType, XaiMethod

# ─── XAI Explanation ──────────────────────────────────────────────────────────

class ExplanationResponse(BaseModel):
    id: str
    prediction_id: str
    method: XaiMethod
    shap_values: Dict[str, Any]
    lime_values: Dict[str, Any]
    attention_weights: Dict[str, Any]
    plain_english_summary: str
    top_features: List[Dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ─── Prediction Signal ────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    id: str
    model_version_id: Optional[str]
    pair: str
    timeframe: str
    direction: DirectionType
    confidence_score: Optional[bool]
    confidence_value: float
    confidence_lower: Optional[float]
    confidence_upper: Optional[float]
    entry_price: float
    stop_loss: float
    take_profit: float
    risk_reward: float
    position_size_lots: Optional[float]
    account_risk_pct: Optional[float]
    model_scores: Dict[str, Any]
    indicator_signals: Dict[str, Any]
    detected_patterns: List[Any]
    news_sentiment: Dict[str, Any]
    ai_narrative: str
    outcome: OutcomeType
    actual_pnl: Optional[float]
    outcome_recorded_at: Optional[datetime]
    created_at: datetime
    explanation: Optional[ExplanationResponse] = None

    model_config = ConfigDict(from_attributes=True)

class RunAnalysisRequest(BaseModel):
    pair: str = Field(..., description="e.g. EUR/USD")
    timeframe: str = Field(..., description="e.g. 1h")
    screenshot_b64: Optional[str] = Field(None, description="Optional base64 encoded screenshot of the chart for YOLO model detection")
