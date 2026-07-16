from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import timezone, datetime
from app.models.models import ModelStatus, NotificationType

# ─── Model Registry & Evaluation ─────────────────────────────────────────────

class ModelVersionResponse(BaseModel):
    id: str
    model_name: str
    version_tag: str
    status: ModelStatus
    artifact_path: Optional[str]
    hyperparameters: Dict[str, Any]
    accuracy: Optional[float]
    sharpe_ratio: Optional[float]
    win_rate: Optional[float]
    profit_factor: Optional[float]
    backtest_summary: Dict[str, Any]
    training_samples: Optional[int]
    training_started_at: datetime
    training_completed_at: Optional[datetime]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    deployed_by: Optional[str]
    deployed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ModelApproveRequest(BaseModel):
    approve: bool = True

class BacktestResultResponse(BaseModel):
    id: str
    model_version_id: str
    pair: str
    timeframe: str
    start_date: str
    end_date: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    profit_factor: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown: Optional[float]
    total_return: float
    equity_curve: List[Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ─── Audit Log & Notifications ────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    ip_address: str
    user_agent: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationSendRequest(BaseModel):
    user_id: str
    title: str
    message: str
    type: NotificationType = NotificationType.system

class SystemMetricsSummary(BaseModel):
    cpu_usage_pct: float
    memory_usage_pct: float
    disk_usage_pct: float
    active_redis_connections: int
    active_websocket_connections: int
    celery_queue_backlog: int
    database_pool_size: int
    database_overflow_size: int


class ModelImportDatasetResponse(BaseModel):
    row_count: int
    start_time: datetime
    end_time: datetime
    pair: str
    timeframe: str

    model_config = ConfigDict(from_attributes=True)


class ModelRetrainRequest(BaseModel):
    pair: str
    timeframe: str
    version_tag: str
    hyperparameters: Optional[Dict[str, Any]] = None
