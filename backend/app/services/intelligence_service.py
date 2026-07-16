"""
Intelligence Service
Business logic layer bridging API endpoints with the Advanced Intelligence sub-engines.
"""

import logging
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import Indicator, Prediction, Explanation

from app.schemas.intelligence import (
    EnsemblePredictionResponse, RegimeResponse, XaiResponse, ChatResponse, PerformanceReportResponse
)
from app.intelligence.ensemble_engine import EnsembleDecisionEngine
from app.intelligence.regime_detector import MarketRegimeDetector
from app.intelligence.xai_analyzer import XaiAnalyzer
from app.intelligence.trading_assistant import TradingAssistant
from app.intelligence.performance_analyzer import PerformanceAnalyzer

logger = logging.getLogger("services.intelligence")

class IntelligenceService:

    @staticmethod
    async def run_ensemble_analysis(
        db: AsyncSession, 
        pair: str, 
        timeframe: str
    ) -> EnsemblePredictionResponse:
        """
        Orchestrates the full Ensemble Prediction pipeline.
        In a real scenario, base models would be called here. We stub them for Phase 11 structure.
        """
        
        # 1. Fetch current price and latest indicators
        q = select(Indicator).filter(
            Indicator.pair == pair,
            Indicator.timeframe == timeframe
        ).order_by(Indicator.candle_time.desc()).limit(1)
        
        res = await db.execute(q)
        indicator = res.scalars().first()
        
        features = {
            "rsi": float(indicator.rsi) if indicator and indicator.rsi else 50.0,
            "macd_histogram": float(indicator.macd_histogram) if indicator and indicator.macd_histogram else 0.0,
            "adx": float(indicator.adx) if indicator and indicator.adx else 20.0
        }
        
        price = 1.0950 # Stub price
        
        # 2. Stub Base Model Predictions
        base_models = [
            {"model": "xgboost", "direction": "long", "confidence": 88.0},
            {"model": "lstm", "direction": "long", "confidence": 75.0},
            {"model": "vision", "direction": "short", "confidence": 60.0} # Creates a conflict
        ]
        
        # 3. Call Ensemble Engine
        response = await EnsembleDecisionEngine.analyze(
            db, pair, timeframe, base_models, price, features
        )
        
        # 4. Save to DB (Prediction & Explanation tables)
        # Usually we would map the response directly into the DB models here.
        # But this suffices for fulfilling the API contract.
        
        return response

    @staticmethod
    async def get_regime(db: AsyncSession, pair: str, timeframe: str) -> RegimeResponse:
        return await MarketRegimeDetector.detect_regime(db, pair, timeframe)

    @staticmethod
    async def explain_prediction(db: AsyncSession, prediction_id: str) -> XaiResponse:
        """
        Explains an existing prediction using SHAP or heuristics.
        """
        q = select(Prediction).filter(Prediction.id == prediction_id)
        prediction = (await db.execute(q)).scalars().first()
        
        features = {"rsi": 45.0, "macd_histogram": 0.002, "adx": 30.0}
        if prediction and prediction.indicator_signals:
            features = prediction.indicator_signals
            
        return XaiAnalyzer.generate_explanation(prediction_id, features)
        
    @staticmethod
    async def chat_with_assistant(user_id: str, query: str) -> ChatResponse:
        return await TradingAssistant.chat(user_id, query)

    @staticmethod
    async def get_performance_report(db: AsyncSession) -> PerformanceReportResponse:
        return await PerformanceAnalyzer.generate_report(db)
