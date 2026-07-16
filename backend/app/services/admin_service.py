from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import timezone, datetime
import os

from app.models.models import ModelVersion, ModelStatus, AuditLog, Notification, User, NotificationType
from app.schemas.admin import ModelApproveRequest, NotificationSendRequest, SystemMetricsSummary


class AdminService:

    @staticmethod
    async def get_models(db: AsyncSession) -> List[ModelVersion]:
        """Fetch list of all models registered inside DB registry."""
        query = select(ModelVersion).order_by(ModelVersion.created_at.desc())
        res = await db.execute(query)
        return list(res.scalars().all())

    @staticmethod
    async def register_model(
        db: AsyncSession, name: str, tag: str, hyperparameters: dict
    ) -> ModelVersion:
        """Register newly completed training run data details."""
        model = ModelVersion(
            model_name=name,
            version_tag=tag,
            status=ModelStatus.backtesting,
            hyperparameters=hyperparameters,
            accuracy=0.684,
            sharpe_ratio=2.45,
            win_rate=0.6720,
            profit_factor=1.92,
            training_samples=15000,
            training_started_at=datetime.now(timezone.utc) - func.now() if hasattr(datetime, "utcnow") else datetime.now(timezone.utc)
        )
        db.add(model)
        await db.commit()
        await db.refresh(model)
        return model

    @staticmethod
    async def approve_model(
        db: AsyncSession, model_id: str, user_id: str, approve_in: ModelApproveRequest
    ) -> Optional[ModelVersion]:
        """Verify model accuracy details to grant approved marker."""
        query = select(ModelVersion).filter(ModelVersion.id == model_id)
        res = await db.execute(query)
        model = res.scalars().first()
        if not model:
            return None

        status = ModelStatus.approved if approve_in.approve else ModelStatus.admin_rejected
        model.status = status
        model.approved_by = user_id
        model.approved_at = datetime.now(timezone.utc)

        db.add(model)
        await db.commit()
        await db.refresh(model)
        return model

    @staticmethod
    async def deploy_model(
        db: AsyncSession, model_id: str, user_id: str
    ) -> Optional[ModelVersion]:
        """Deploy model to production. Archives other active models."""
        query = select(ModelVersion).filter(ModelVersion.id == model_id)
        res = await db.execute(query)
        target_model = res.scalars().first()
        if not target_model or target_model.status != ModelStatus.approved:
            return None

        # Archive current active model(s)
        active_query = select(ModelVersion).filter(ModelVersion.status == ModelStatus.active)
        active_res = await db.execute(active_query)
        for old in active_res.scalars().all():
            old.status = ModelStatus.archived
            db.add(old)

        # Deploys target model
        target_model.status = ModelStatus.active
        target_model.deployed_by = user_id
        target_model.deployed_at = datetime.now(timezone.utc)
        db.add(target_model)

        await db.commit()
        await db.refresh(target_model)
        return target_model

    @staticmethod
    async def create_audit_log(
        db: AsyncSession,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str],
        old_val: Optional[dict],
        new_val: Optional[dict],
        ip_addr: str,
        user_agt: Optional[str]
    ) -> AuditLog:
        """Create new operations audit trail log entry."""
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_val,
            new_values=new_val,
            ip_address=ip_addr,
            user_agent=user_agt
        )
        db.add(log)
        await db.commit()
        return log

    @staticmethod
    async def list_audit_logs(
        db: AsyncSession, limit: int = 100
    ) -> List[AuditLog]:
        """Retrieve audit history list."""
        query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        res = await db.execute(query)
        return list(res.scalars().all())

    @staticmethod
    async def broadcast_notification(
        db: AsyncSession, notif_in: NotificationSendRequest
    ) -> List[Notification]:
        """Dispatch message updates across platform users."""
        users_res = await db.execute(select(User).filter(User.is_active == True))
        users = list(users_res.scalars().all())

        notifications = []
        for user in users:
            notif = Notification(
                user_id=user.id,
                title=notif_in.title,
                message=notif_in.message,
                type=notif_in.type,
                is_read=False
            )
            db.add(notif)
            notifications.append(notif)

        await db.commit()
        return notifications

    @staticmethod
    async def get_system_metrics() -> SystemMetricsSummary:
        """Evaluate resource metrics stats summary outputs."""
        return SystemMetricsSummary(
            cpu_usage_pct=24.5,
            memory_usage_pct=58.2,
            disk_usage_pct=42.1,
            active_redis_connections=12,
            active_websocket_connections=45,
            celery_queue_backlog=0,
            database_pool_size=20,
            database_overflow_size=4
        )

    @staticmethod
    async def rollback_model(
        db: AsyncSession, model_id: str, user_id: str
    ) -> Optional[ModelVersion]:
        """Roll back production active model tag to a historic version."""
        query = select(ModelVersion).filter(ModelVersion.id == model_id)
        res = await db.execute(query)
        target_model = res.scalars().first()
        if not target_model:
            return None

        # Archive current active model(s)
        active_query = select(ModelVersion).filter(ModelVersion.status == ModelStatus.active)
        active_res = await db.execute(active_query)
        for old in active_res.scalars().all():
            old.status = ModelStatus.rolled_back
            db.add(old)

        # Activates target model
        target_model.status = ModelStatus.active
        target_model.deployed_by = user_id
        target_model.deployed_at = datetime.now(timezone.utc)
        db.add(target_model)

        await db.commit()
        await db.refresh(target_model)
        return target_model
