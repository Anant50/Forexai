from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import timezone, datetime
from app.models.models import DirectionType, OutcomeType

# ─── Trading Journal Entry ───────────────────────────────────────────────────

class JournalEntryBase(BaseModel):
    pair: str = Field(..., description="e.g. EUR/USD")
    direction: DirectionType
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    position_size_lots: Optional[float] = None
    risk_reward: Optional[float] = None
    confidence_at_entry: Optional[float] = None
    ai_suggested: bool = False
    trade_taken: bool = False
    actual_entry_price: Optional[float] = None
    actual_exit_price: Optional[float] = None
    actual_pnl: Optional[float] = None
    outcome: OutcomeType = OutcomeType.open
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None
    trade_date: Optional[datetime] = None

class JournalEntryCreate(JournalEntryBase):
    prediction_id: Optional[str] = None

class JournalEntryUpdate(BaseModel):
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    position_size_lots: Optional[float] = None
    risk_reward: Optional[float] = None
    confidence_at_entry: Optional[float] = None
    trade_taken: Optional[bool] = None
    actual_entry_price: Optional[float] = None
    actual_exit_price: Optional[float] = None
    actual_pnl: Optional[float] = None
    outcome: Optional[OutcomeType] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None
    trade_date: Optional[datetime] = None

class JournalEntryResponse(JournalEntryBase):
    id: str
    user_id: str
    prediction_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ─── Performance Statistics ───────────────────────────────────────────────────

class PerformanceSummary(BaseModel):
    total_trades: int
    win_rate: float
    profit_factor: float
    total_pnl: float
    wins: int
    losses: int
    breakeven: int
    open_trades: int
    average_win: float
    average_loss: float
    max_drawdown: float
    expectancy: float
