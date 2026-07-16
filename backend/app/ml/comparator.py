from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import ModelVersion, ModelStatus

class ModelComparator:
    
    @staticmethod
    async def evaluate_candidate(
        db: AsyncSession,
        candidate_accuracy: float,
        candidate_sharpe: float
    ) -> bool:
        """
        Compares new candidate parameters against the active production model version.
        Returns True if candidate exhibits performance improvements, or if no active model is found.
        """
        # Query active production model
        query = select(ModelVersion).filter(ModelVersion.status == ModelStatus.active)
        res = await db.execute(query)
        active_model = res.scalars().first()
        
        if not active_model:
            return True # Auto-approved if none is currently active
            
        prod_accuracy = float(active_model.accuracy or 0.0)
        prod_sharpe = float(active_model.sharpe_ratio or 0.0)
        
        # Validation checks: candidate beats accuracy by 0.5% OR shows better risk profile
        if candidate_accuracy > prod_accuracy + 0.005:
            return True
        if candidate_sharpe > prod_sharpe + 0.05:
            return True
            
        return False
