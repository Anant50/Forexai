from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import timezone, datetime
from app.models.models import DataSource, PatternType, SignalType

# ─── Candlestick Data ─────────────────────────────────────────────────────────

class CandleBase(BaseModel):
    pair: str = Field(..., description="e.g. EUR/USD")
    timeframe: str = Field(..., description="e.g. 1h")
    open_time: datetime
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    source: DataSource = DataSource.yfinance

class CandleCreate(CandleBase):
    pass

class CandleResponse(CandleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# ─── Technical Indicators ─────────────────────────────────────────────────────

class IndicatorResponse(BaseModel):
    id: int
    pair: str
    timeframe: str
    candle_time: datetime
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    ema9: Optional[float] = None
    ema21: Optional[float] = None
    ema50: Optional[float] = None
    ema200: Optional[float] = None
    sma20: Optional[float] = None
    sma50: Optional[float] = None
    sma200: Optional[float] = None
    atr: Optional[float] = None
    adx: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    vwap: Optional[float] = None
    supertrend: Optional[int] = None
    ichimoku: Optional[Dict[str, Any]] = None
    fibonacci_levels: Optional[Dict[str, Any]] = None
    pivot_points: Optional[Dict[str, Any]] = None
    computed_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ─── Geometric Chart Patterns ───────────────────────────────────────────────

class PatternResponse(BaseModel):
    id: str
    pair: str
    timeframe: str
    pattern_name: str
    pattern_grp: PatternType
    confidence: float
    direction_bias: SignalType
    key_level_1: Optional[float] = None
    key_level_2: Optional[float] = None
    key_level_3: Optional[float] = None
    from_image: bool
    start_candle_time: datetime
    end_candle_time: datetime
    detected_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ─── Market Feeds / News ──────────────────────────────────────────────────────

class NewsEventResponse(BaseModel):
    id: str
    headline: str
    source: str
    url: Optional[str] = None
    content_snippet: Optional[str] = None
    affected_currencies: List[str]
    sentiment: str
    sentiment_score: float
    impact: str
    published_at: datetime
    fetched_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CalendarEventResponse(BaseModel):
    id: str
    event_name: str
    currency: str
    impact: str
    forecast: Optional[str] = None
    actual: Optional[str] = None
    previous: Optional[str] = None
    event_time: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
