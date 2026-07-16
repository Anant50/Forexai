"""
Intelligence API Router — /api/v1/intelligence
Phase 11: Endpoints for Advanced Decision Engine, Regime Detection, XAI.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.services.intelligence_service import IntelligenceService
from app.schemas.intelligence import (
    EnsemblePredictionRequest, EnsemblePredictionResponse, 
    RegimeResponse, XaiResponse, ChatRequest, ChatResponse, PerformanceReportResponse
)

router = APIRouter(prefix="/intelligence", tags=["Advanced AI Intelligence"])


@router.post("/analyze/multi-model", response_model=EnsemblePredictionResponse)
async def analyze_ensemble(
    payload: EnsemblePredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> EnsemblePredictionResponse:
    """
    **Trigger Ensemble Decision Engine**
    Aggregates ML, DL, and CV models, checks multi-timeframe alignment,
    detects conflicts, and returns a graded trading suggestion.
    """
    return await IntelligenceService.run_ensemble_analysis(db, payload.pair, payload.timeframe)


@router.get("/regime/{pair}/{timeframe}", response_model=RegimeResponse)
async def get_market_regime(
    pair: str,
    timeframe: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> RegimeResponse:
    """
    **Real-time Market Regime Detection**
    Analyzes ADX, ATR, and News impacts to determine if the market is trending, sideways, or volatile.
    """
    return await IntelligenceService.get_regime(db, pair, timeframe)


@router.get("/xai/{prediction_id}", response_model=XaiResponse)
async def explain_ai_decision(
    prediction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> XaiResponse:
    """
    **Explainable AI (XAI) Analysis**
    Uses SHAP values to decode the AI's logic into plain English feature importance.
    """
    return await IntelligenceService.explain_prediction(db, prediction_id)


@router.post("/assistant/chat", response_model=ChatResponse)
async def chat_with_assistant(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user)
) -> ChatResponse:
    """
    **AI Trading Assistant Chat**
    Talk to the AI contextually grounded in your personal RAG uploaded documents.
    """
    return await IntelligenceService.chat_with_assistant(current_user.id, payload.query)


@router.get("/reports/performance", response_model=PerformanceReportResponse)
async def generate_ai_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PerformanceReportResponse:
    """
    **Historical Performance Analysis**
    Measures AI success rate historically and how it is weighting models for the current regime.
    """
    return await IntelligenceService.get_performance_report(db)
