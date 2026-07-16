import uuid
import enum
from datetime import timezone, datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy import (
    String, VARCHAR, Boolean, Integer, Numeric, BigInteger, DateTime, Date,
    ForeignKey, TEXT, Text, Enum as SQLEnum, ARRAY, UniqueConstraint, CheckConstraint,
    JSON, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB as PG_JSONB

# SQLite compatibility fallback mapping
JSONB = PG_JSONB().with_variant(JSON, "sqlite")

def SQLiteSafeArray(base_type):
    return ARRAY(base_type).with_variant(JSON, "sqlite")

import sys
IS_TESTING = "pytest" in sys.modules

def partition_pk(primary_key_val: bool = True) -> bool:
    return False if IS_TESTING else primary_key_val

from app.core.database import Base

# ─── Python Enum Declarations matching Database Types ──────────────────────────

class UserRole(str, enum.Enum):
    trader = "trader"
    analyst = "analyst"
    admin = "admin"

class DirectionType(str, enum.Enum):
    long = "long"
    short = "short"
    neutral = "neutral"

class SignalType(str, enum.Enum):
    bullish = "bullish"
    bearish = "bearish"
    neutral = "neutral"

class OutcomeType(str, enum.Enum):
    open = "open"
    win = "win"
    loss = "loss"
    breakeven = "breakeven"
    cancelled = "cancelled"

class ModelStatus(str, enum.Enum):
    training = "training"
    backtesting = "backtesting"
    pending_approval = "pending_approval"
    approved = "approved"
    active = "active"
    rejected = "rejected"
    admin_rejected = "admin_rejected"
    archived = "archived"
    rolled_back = "rolled_back"

class ImpactLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    red = "red"

class SentimentType(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"

class PatternType(str, enum.Enum):
    chart = "chart"
    candlestick = "candlestick"
    harmonic = "harmonic"

class NotificationType(str, enum.Enum):
    new_signal = "new_signal"
    model_retrained = "model_retrained"
    drawdown_warning = "drawdown_warning"
    daily_summary = "daily_summary"
    news_alert = "news_alert"
    system = "system"

class DataSource(str, enum.Enum):
    yfinance = "yfinance"
    alpha_vantage = "alpha_vantage"
    manual = "manual"

class XaiMethod(str, enum.Enum):
    shap = "shap"
    lime = "lime"
    attention = "attention"
    gradcam = "gradcam"
    rule = "rule"

class DocumentType(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    txt = "txt"
    md = "md"
    epub = "epub"

class DocumentStatus(str, enum.Enum):
    uploading = "uploading"
    processing = "processing"
    ready = "ready"
    failed = "failed"
    deleted = "deleted"

# ─── SQLAlchemy ORM Models ───────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="user_role"), nullable=False, default=UserRole.trader)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(255))
    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    preferences: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    # Phase 9: Computer Vision screenshot history preference
    vision_history_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc))

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    watchlist_items = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    notification_prefs = relationship("UserNotificationPref", back_populates="user", uselist=False, cascade="all, delete-orphan")
    vision_analyses = relationship("VisionAnalysis", back_populates="user", cascade="all, delete-orphan")
    chart_screenshots = relationship("ChartScreenshot", back_populates="user", cascade="all, delete-orphan")
    knowledge_documents = relationship("KnowledgeDocument", back_populates="user", cascade="all, delete-orphan")
    knowledge_chunks = relationship("KnowledgeChunk", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("failed_login_attempts >= 0", name="check_failed_login_attempts"),
    )




class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(TEXT)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="sessions")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="watchlist_items")

    __table_args__ = (
        UniqueConstraint("user_id", "pair", name="unique_user_pair"),
    )


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    version_tag: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    status: Mapped[ModelStatus] = mapped_column(SQLEnum(ModelStatus, name="model_status"), nullable=False, default=ModelStatus.training)
    artifact_path: Mapped[Optional[str]] = mapped_column(String(512))
    hyperparameters: Mapped[dict] = mapped_column(JSONB, default=dict)
    accuracy: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    sharpe_ratio: Mapped[Optional[float]] = mapped_column(Numeric(4, 2))
    win_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    profit_factor: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    backtest_summary: Mapped[dict] = mapped_column(JSONB, default=dict)
    training_samples: Mapped[Optional[int]] = mapped_column(Integer)
    training_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    training_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    approved_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deployed_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    deployed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    backtests = relationship("BacktestResult", back_populates="model_version", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="model_version")


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    model_version_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("model_versions.id", ondelete="CASCADE"), nullable=False)
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(5), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_trades: Mapped[int] = mapped_column(Integer, nullable=False)
    winning_trades: Mapped[int] = mapped_column(Integer, nullable=False)
    losing_trades: Mapped[int] = mapped_column(Integer, nullable=False)
    win_rate: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    profit_factor: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    sharpe_ratio: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    max_drawdown: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    total_return: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False)
    equity_curve: Mapped[dict] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    model_version = relationship("ModelVersion", back_populates="backtests")

    __table_args__ = (
        CheckConstraint("total_trades >= 0", name="check_total_trades_nonnegative"),
        CheckConstraint("winning_trades >= 0", name="check_winning_trades_nonnegative"),
        CheckConstraint("losing_trades >= 0", name="check_losing_trades_nonnegative"),
        CheckConstraint("win_rate >= 0 AND win_rate <= 1", name="check_win_rate_bounds"),
        CheckConstraint("profit_factor >= 0", name="check_profit_factor_bounds"),
        CheckConstraint("max_drawdown >= -1 AND max_drawdown <= 0", name="check_max_drawdown_bounds"),
        CheckConstraint("winning_trades + losing_trades <= total_trades", name="check_trades_totals"),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    model_version_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("model_versions.id", ondelete="SET NULL"))
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(5), nullable=False)
    direction: Mapped[DirectionType] = mapped_column(SQLEnum(DirectionType, name="direction_type"), nullable=False)
    confidence_score: Mapped[Optional[bool]] = mapped_column(Boolean)
    confidence_value: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    confidence_lower: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    confidence_upper: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    entry_price: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    stop_loss: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    take_profit: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    risk_reward: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    position_size_lots: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    account_risk_pct: Mapped[Optional[float]] = mapped_column(Numeric(4, 2))
    model_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    indicator_signals: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    detected_patterns: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    news_sentiment: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ai_narrative: Mapped[str] = mapped_column(TEXT, nullable=False)
    outcome: Mapped[OutcomeType] = mapped_column(SQLEnum(OutcomeType, name="outcome_type"), nullable=False, default=OutcomeType.open)
    actual_pnl: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    outcome_recorded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    model_version = relationship("ModelVersion", back_populates="predictions")
    explanation = relationship("Explanation", back_populates="prediction", uselist=False, cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="prediction")

    __table_args__ = (
        CheckConstraint("confidence_value BETWEEN 0 AND 100", name="check_confidence_value_bounds"),
        CheckConstraint("confidence_lower BETWEEN 0 AND 100", name="check_confidence_lower_bounds"),
        CheckConstraint("confidence_upper BETWEEN 0 AND 100", name="check_confidence_upper_bounds"),
        CheckConstraint("entry_price > 0", name="check_entry_price_pos"),
        CheckConstraint("stop_loss > 0", name="check_stop_loss_pos"),
        CheckConstraint("take_profit > 0", name="check_take_profit_pos"),
        CheckConstraint("risk_reward > 0", name="check_risk_reward_pos"),
        CheckConstraint("position_size_lots >= 0.01", name="check_position_size_bounds"),
        CheckConstraint("account_risk_pct BETWEEN 0 AND 100", name="check_account_risk_pct_bounds"),
        CheckConstraint("confidence_lower <= confidence_value AND confidence_value <= confidence_upper", name="check_confidence_values"),
    )


class Explanation(Base):
    __tablename__ = "explanations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    prediction_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("predictions.id", ondelete="CASCADE"), unique=True, nullable=False)
    method: Mapped[XaiMethod] = mapped_column(SQLEnum(XaiMethod, name="xai_method"), nullable=False, default=XaiMethod.shap)
    shap_values: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    lime_values: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    attention_weights: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    plain_english_summary: Mapped[str] = mapped_column(TEXT, nullable=False)
    top_features: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    prediction = relationship("Prediction", back_populates="explanation")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    prediction_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("predictions.id", ondelete="SET NULL"))
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    direction: Mapped[DirectionType] = mapped_column(SQLEnum(DirectionType, name="direction_type"), nullable=False)
    entry_price: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    stop_loss: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    take_profit: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    position_size_lots: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    risk_reward: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    confidence_at_entry: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    ai_suggested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    trade_taken: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    actual_entry_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    actual_exit_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    actual_pnl: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    outcome: Mapped[OutcomeType] = mapped_column(SQLEnum(OutcomeType, name="outcome_type"), nullable=False, default=OutcomeType.open)
    tags: Mapped[list] = mapped_column(SQLiteSafeArray(String(50)), nullable=False, default=list)
    notes: Mapped[Optional[str]] = mapped_column(TEXT)
    screenshot_url: Mapped[Optional[str]] = mapped_column(String(512))
    trade_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="journal_entries")
    prediction = relationship("Prediction", back_populates="journal_entries")

    __table_args__ = (
        CheckConstraint("entry_price > 0", name="check_entry_price_pos"),
        CheckConstraint("stop_loss > 0", name="check_stop_loss_pos"),
        CheckConstraint("take_profit > 0", name="check_take_profit_pos"),
        CheckConstraint("position_size_lots >= 0.01", name="check_position_size_bounds"),
        CheckConstraint("risk_reward > 0", name="check_risk_reward_pos"),
        CheckConstraint("confidence_at_entry BETWEEN 0 AND 100", name="check_confidence_bounds"),
        CheckConstraint("actual_entry_price > 0", name="check_actual_entry_price_pos"),
        CheckConstraint("actual_exit_price > 0", name="check_actual_exit_price_pos"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(TEXT, nullable=False)
    type: Mapped[NotificationType] = mapped_column(SQLEnum(NotificationType, name="notification_type"), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    extra_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="notifications")


class UserNotificationPref(Base):
    __tablename__ = "user_notification_prefs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    new_signal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    model_retrained: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    drawdown_warning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    daily_summary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    news_alert: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    via_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    via_telegram: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(50))

    user = relationship("User", back_populates="notification_prefs")


class EconomicCalendar(Base):
    __tablename__ = "economic_calendar"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    event_name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    impact: Mapped[ImpactLevel] = mapped_column(SQLEnum(ImpactLevel, name="impact_level"), nullable=False, default=ImpactLevel.low)
    forecast: Mapped[Optional[str]] = mapped_column(String(50))
    actual: Mapped[Optional[str]] = mapped_column(String(50))
    previous: Mapped[Optional[str]] = mapped_column(String(50))
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class NewsEvent(Base):
    __tablename__ = "news_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    headline: Mapped[str] = mapped_column(TEXT, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(512), unique=True)
    content_snippet: Mapped[Optional[str]] = mapped_column(TEXT)
    affected_currencies: Mapped[list] = mapped_column(SQLiteSafeArray(String(10)), nullable=False)
    sentiment: Mapped[SentimentType] = mapped_column(SQLEnum(SentimentType, name="sentiment_type"), nullable=False, default=SentimentType.neutral)
    sentiment_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    impact: Mapped[ImpactLevel] = mapped_column(SQLEnum(ImpactLevel, name="impact_level"), nullable=False, default=ImpactLevel.low)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("sentiment_score BETWEEN -1 AND 1", name="check_sentiment_score_bounds"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100))
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(TEXT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ─── Partitioned Master Tables (Using manual mapping since constraints differ per partition in SQLAlchemy) ───

class Candle(Base):
    __tablename__ = "candles"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    pair: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(5), index=True, primary_key=partition_pk(True), nullable=False)
    open_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    open_price: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    high_price: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    low_price: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    close_price: Mapped[float] = mapped_column(Numeric(10, 5), nullable=False)
    volume: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0.0)
    source: Mapped[DataSource] = mapped_column(SQLEnum(DataSource, name="data_source"), nullable=False, default=DataSource.yfinance)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("open_price > 0", name="check_open_price_pos"),
        CheckConstraint("close_price > 0", name="check_close_price_pos"),
        CheckConstraint("volume >= 0", name="check_volume_nonnegative"),
        CheckConstraint(
            "high_price >= open_price AND high_price >= close_price AND low_price <= open_price AND low_price <= close_price",
            name="check_wick_bounds"
        ),
    )


class Indicator(Base):
    __tablename__ = "indicators"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    pair: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    timeframe: Mapped[str] = mapped_column(String(5), index=True, primary_key=partition_pk(True), nullable=False)
    candle_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    
    rsi: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    macd: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    macd_signal: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    macd_histogram: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    
    ema9: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    ema21: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    ema50: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    ema200: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    sma20: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    sma50: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    sma200: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    
    atr: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    adx: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    bb_upper: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    bb_middle: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    bb_lower: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    vwap: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    supertrend: Mapped[Optional[int]] = mapped_column(Integer)
    
    ichimoku: Mapped[Optional[dict]] = mapped_column(JSONB)
    fibonacci_levels: Mapped[Optional[dict]] = mapped_column(JSONB)
    pivot_points: Mapped[Optional[dict]] = mapped_column(JSONB)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("rsi BETWEEN 0 AND 100", name="check_rsi_bounds"),
        CheckConstraint("adx BETWEEN 0 AND 100", name="check_adx_bounds"),
        CheckConstraint("atr >= 0", name="check_atr_nonnegative"),
        CheckConstraint("supertrend IN (-1, 1)", name="check_supertrend_values"),
    )


class Pattern(Base):
    __tablename__ = "patterns"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(5), primary_key=partition_pk(True), nullable=False)
    pattern_name: Mapped[str] = mapped_column(String(100), nullable=False)
    pattern_grp: Mapped[PatternType] = mapped_column(SQLEnum(PatternType, name="pattern_type"), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    direction_bias: Mapped[SignalType] = mapped_column(SQLEnum(SignalType, name="signal_type"), nullable=False, default=SignalType.neutral)
    key_level_1: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    key_level_2: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    key_level_3: Mapped[Optional[float]] = mapped_column(Numeric(10, 5))
    from_image: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    start_candle_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_candle_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("confidence BETWEEN 0 AND 100", name="check_confidence_bounds"),
        CheckConstraint("key_level_1 > 0", name="check_key_level_1_pos"),
        CheckConstraint("key_level_2 > 0", name="check_key_level_2_pos"),
        CheckConstraint("key_level_3 > 0", name="check_key_level_3_pos"),
        CheckConstraint("start_candle_time <= end_candle_time", name="check_pattern_timestamps"),
    )


class ImportedDataset(Base):
    __tablename__ = "imported_datasets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(5), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    imported_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ─── Phase 9: Computer Vision Engine ─────────────────────────────────────────

class ChartScreenshot(Base):
    """Stores screenshot metadata only when user has vision history enabled."""
    __tablename__ = "chart_screenshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False, default="image/png")
    pair: Mapped[Optional[str]] = mapped_column(String(10))
    timeframe: Mapped[Optional[str]] = mapped_column(String(5))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="chart_screenshots")
    vision_analyses = relationship("VisionAnalysis", back_populates="screenshot")


class VisionAnalysis(Base):
    """Stores structured results from each Computer Vision pipeline run."""
    __tablename__ = "vision_analyses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    screenshot_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("chart_screenshots.id", ondelete="SET NULL"))
    prediction_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("predictions.id", ondelete="SET NULL"))
    pair: Mapped[Optional[str]] = mapped_column(String(10))
    timeframe: Mapped[Optional[str]] = mapped_column(String(5))
    # Detection results stored as JSONB
    candlesticks: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    trendlines: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    support_zones: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    resistance_zones: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    chart_patterns: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    market_structure: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    indicator_readings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ocr_labels: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    hough_trendlines: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Pipeline control flags
    yolo_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    vit_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ocr_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    screenshot_saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", back_populates="vision_analyses")
    screenshot = relationship("ChartScreenshot", back_populates="vision_analyses")


# ─── Phase 10: RAG Knowledge Engine ──────────────────────────────────────────

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(SQLEnum(DocumentType, name="document_type_enum"), nullable=False)
    
    page_count: Mapped[Optional[int]] = mapped_column(Integer)
    word_count: Mapped[Optional[int]] = mapped_column(Integer)
    chunk_count: Mapped[Optional[int]] = mapped_column(Integer)
    
    embedding_model: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[DocumentStatus] = mapped_column(SQLEnum(DocumentStatus, name="document_status_enum"), nullable=False, default=DocumentStatus.uploading)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="knowledge_documents")
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()), server_default="uuid_generate_v4()")
    document_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    word_count: Mapped[Optional[int]] = mapped_column(Integer)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    document = relationship("KnowledgeDocument", back_populates="chunks")
    user = relationship("User", back_populates="knowledge_chunks")


