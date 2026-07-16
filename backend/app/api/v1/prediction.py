from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.prediction import PredictionResponse, RunAnalysisRequest
from app.services.prediction_service import PredictionService
from app.models.models import User

router = APIRouter(prefix="/predictions", tags=["Inference & Predictions"])


@router.post("/analyze", response_model=PredictionResponse, status_code=status.HTTP_201_CREATED)
async def run_analysis(
    request: RunAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PredictionResponse:
    """
    Triggers ensemble model forecasting inference.
    Parses techncial indicators, pattern profiles, sentiment metrics, and models explanation details.
    """
    prediction = await PredictionService.run_analysis(db, request)
    return prediction


@router.get("/history", response_model=List[PredictionResponse])
async def get_predictions_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[PredictionResponse]:
    """
    Retrieve previous platform forecast recommendations history list.
    """
    actions = await PredictionService.get_predictions_history(db, limit)
    return actions


@router.get("/{id}", response_model=PredictionResponse)
async def get_prediction_details(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PredictionResponse:
    """
    Get detailed metrics of a specific warning sign, entry request, or prediction run.
    Contains SHAP and LIME details in explanation block.
    """
    prediction = await PredictionService.get_prediction_by_id(db, id)
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction record not found"
        )
    return prediction
