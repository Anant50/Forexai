"""
Engine 3: Ensemble Decision Engine (EDE)
Combines intelligence from base models utilizing historical regime performance weights.
"""

import logging
import time
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import DirectionType, SignalType
from app.schemas.intelligence import (
    EnsemblePredictionResponse, TradeGrade, RegimeType
)
from app.intelligence.timeframe_aligner import TimeframeAligner
from app.intelligence.risk_evaluator import RiskEvaluator
from app.intelligence.xai_analyzer import XaiAnalyzer

logger = logging.getLogger("intelligence.ensemble_engine")

class EnsembleDecisionEngine:
    
    @classmethod
    async def analyze(
        cls, 
        db: AsyncSession, 
        pair: str, 
        timeframe: str,
        base_models_predictions: List[Dict[str, Any]],
        current_price: float,
        indicators: Dict[str, float]
    ) -> EnsemblePredictionResponse:
        """
        Master intelligence orchestrator.
        """
        start_time = time.monotonic()
        
        # 1. Multi-TF Alignment & Regime Detection
        alignment = await TimeframeAligner.align_timeframes(db, pair, timeframe)
        base_regime = alignment["base_regime"]
        
        # 2. Base Model Aggregation (Voting)
        # simplistic unweighted average for now; production loops through performance_analyzer weights
        bull_votes = 0
        bear_votes = 0
        total_conf = 0.0
        
        for pred in base_models_predictions:
            if pred["direction"] == "long":
                bull_votes += 1
            elif pred["direction"] == "short":
                bear_votes += 1
            total_conf += pred["confidence"]
            
        avg_conf = total_conf / max(len(base_models_predictions), 1)
        
        suggested_dir = DirectionType.neutral
        if bull_votes > bear_votes:
            suggested_dir = DirectionType.long
        elif bear_votes > bull_votes:
            suggested_dir = DirectionType.short
            
        is_conflicting = (bull_votes > 0 and bear_votes > 0)
        
        # 3. Risk Evaluation
        grade, risk_score, entry, sl, tp = RiskEvaluator.evaluate_risk(
            base_confidence=avg_conf,
            alignment=alignment,
            volatility_atr=base_regime.atr_value,
            is_news_driven=base_regime.news_impact,
            current_price=current_price,
            suggested_dir=suggested_dir
        )
        
        if is_conflicting:
            grade = TradeGrade.WAIT
            
        # 4. Explainable AI
        xai_response = XaiAnalyzer.generate_explanation(
            prediction_id="temp_ensemble",
            features_dict=indicators
        )
        
        elapsed = int((time.monotonic() - start_time) * 1000)
        
        narrative = f"The ensemble engine suggests a {suggested_dir.value} trade "
        narrative += f"with {grade.value} quality rating. "
        if is_conflicting:
            narrative += "However, base models are conflicting. "
        if not alignment["is_aligned"]:
            narrative += alignment["conflict_reason"] + ". "
            
        return EnsemblePredictionResponse(
            prediction_id="ensemble_" + str(int(time.time())),
            pair=pair,
            timeframe=timeframe,
            suggested_direction=suggested_dir,
            confidence_score=round(avg_conf, 2),
            grade=grade,
            regime=base_regime.regime,
            is_conflicting=is_conflicting,
            risk_score=risk_score,
            entry_target=entry,
            stop_loss=sl,
            take_profit=tp,
            risk_reward=round(abs(tp - entry) / max(abs(sl - entry), 0.0001), 2),
            ai_narrative=narrative,
            xai=xai_response,
            processing_time_ms=elapsed
        )
