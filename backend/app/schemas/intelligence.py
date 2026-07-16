from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum
from app.models.models import DirectionType, SignalType

class RegimeType(str, Enum):
    trending_bull = "trending_bull"
    trending_bear = "trending_bear"
    sideways = "sideways"
    volatile = "volatile"
    news_driven = "news_driven"

class TradeGrade(str, Enum):
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"
    F = "F"
    WAIT = "WAIT"

class RegimeResponse(BaseModel):
    pair: str
    timeframe: str
    regime: RegimeType
    severity_score: float
    adx_value: float
    atr_value: float
    news_impact: bool

class EnsemblePredictionRequest(BaseModel):
    pair: str
    timeframe: str

class XaiFeature(BaseModel):
    feature: str
    importance: float
    impact_direction: SignalType

class XaiResponse(BaseModel):
    prediction_id: str
    shap_values: List[XaiFeature]
    plain_english_summary: str
    processing_time_ms: int

class EnsemblePredictionResponse(BaseModel):
    prediction_id: str
    pair: str
    timeframe: str
    suggested_direction: DirectionType
    confidence_score: float
    grade: TradeGrade
    regime: RegimeType
    is_conflicting: bool
    risk_score: int
    entry_target: float
    stop_loss: float
    take_profit: float
    risk_reward: float
    ai_narrative: str
    xai: Optional[XaiResponse]
    processing_time_ms: int

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    processing_time_ms: int

class PerformanceReportResponse(BaseModel):
    total_predictions: int
    overall_win_rate: float
    best_regime: RegimeType
    worst_regime: RegimeType
    model_weights: Dict[str, float]
    ai_summary: str
