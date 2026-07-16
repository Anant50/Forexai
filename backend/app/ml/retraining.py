import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timezone, datetime, timedelta

from app.models.models import ModelVersion, ModelStatus, Notification, NotificationType
from app.ml.trainer import ModelTrainer

logger = logging.getLogger("ml.retraining")

class RetrainingScheduler:
    """
    Monitors live accuracy drift and handles automated model retraining tasks.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_performance_drift(self) -> bool:
        """
        Query accuracy metrics of the current active model.
        Returns True if retraining needs to be triggered.
        """
        # Fetch active model
        active_res = await self.db.execute(
            select(ModelVersion).filter(ModelVersion.status == ModelStatus.active)
        )
        active_model = active_res.scalars().first()
        
        if not active_model:
            logger.warning("No active production model found. Retraining trigger: TRUE")
            return True

        # Check accuracy limits
        if active_model.accuracy < 0.58 or active_model.profit_factor < 1.2:
            logger.warning(
                f"Model performance drift detected! Accuracy: {active_model.accuracy:.2f}, "
                f"Profit Factor: {active_model.profit_factor:.2f}. Triggering retraining."
            )
            return True

        logger.info(
            f"Active model version {active_model.version_tag} performance is stable. "
            f"Accuracy: {active_model.accuracy:.2f}, Sharpe: {active_model.sharpe_ratio:.2f}"
        )
        return False

    async def run_retraining_cycle(self, pair: str = "EUR/USD") -> Optional[ModelVersion]:
        """
        Checks performance drift and runs retraining to register a new model version.
        """
        needs_retrain = await self.evaluate_performance_drift()
        if not needs_retrain:
            return None

        # Build Version Tag
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
        new_tag = f"v-auto-{timestamp}"

        trainer = ModelTrainer(self.db)
        new_model = await trainer.train_and_register(pair, "1h", new_tag)

        # Notify admin of retraining completion
        notification = Notification(
            user_id="admin_all", # Broadcast prefix representation mockup
            title="Auto-Retraining Completed",
            message=f"Model version {new_tag} trained and registered inside catalog folder.",
            type=NotificationType.system,
            is_read=False
        )
        self.db.add(notification)
        await self.db.commit()

        logger.info(f"Auto-retraining completed. New candidate version: {new_tag}")
        return new_model
