from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timezone, datetime, timedelta
from typing import List, Optional
import random

from app.models.models import Prediction, Explanation, ModelVersion, ModelStatus, DirectionType, OutcomeType, XaiMethod
from app.schemas.prediction import RunAnalysisRequest


from app.ml.realtime_engine import RealtimePredictionEngine


class PredictionService:

    @staticmethod
    async def run_analysis(
        db: AsyncSession, request: RunAnalysisRequest
    ) -> Prediction:
        """
        Executes real-time model inference on target pair.
        Loads estimators, calculates features, and returns predictions.
        """
        engine = RealtimePredictionEngine(db)
        prediction = await engine.execute_realtime_prediction(
            pair=request.pair,
            timeframe=request.timeframe
        )
        
        # Load the explanation relationship
        res = await db.execute(
            select(Prediction)
            .filter(Prediction.id == prediction.id)
            .options(selectinload(Prediction.explanation))
        )
        return res.scalar_one()

    @staticmethod
    async def get_predictions_history(
        db: AsyncSession, limit: int = 50
    ) -> List[Prediction]:
        """Fetch history log of predictions including related explainability details."""
        query = select(Prediction).options(selectinload(Prediction.explanation)).order_by(Prediction.created_at.desc()).limit(limit)
        res = await db.execute(query)
        return list(res.scalars().all())

    @staticmethod
    async def get_prediction_by_id(
        db: AsyncSession, prediction_id: str
    ) -> Optional[Prediction]:
        """Fetch details of a single signal prediction."""
        query = select(Prediction).options(selectinload(Prediction.explanation)).filter(Prediction.id == prediction_id)
        res = await db.execute(query)
        return res.scalars().first()
