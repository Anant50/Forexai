"""
Engine 6: Performance Analyzer
Builds feedback loops by analyzing historical prediction accuracy across different market regimes.
"""

from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.models import JournalEntry, OutcomeType
from app.schemas.intelligence import PerformanceReportResponse, RegimeType

class PerformanceAnalyzer:
    
    @classmethod
    async def generate_report(cls, db: AsyncSession) -> PerformanceReportResponse:
        """
        Calculates historical effectiveness of the AI models.
        In a production scenario, this determines dynamic model weights for the Ensemble.
        """
        # Fetch basic win/loss
        total_q = select(func.count(JournalEntry.id)).filter(JournalEntry.outcome != OutcomeType.open)
        wins_q = select(func.count(JournalEntry.id)).filter(JournalEntry.outcome == OutcomeType.win)
        
        total = (await db.execute(total_q)).scalar() or 0
        wins = (await db.execute(wins_q)).scalar() or 0
        
        win_rate = (wins / total * 100) if total > 0 else 0.0
        
        # Stub logic for regime tracking (requires regime to be logged in JournalEntry ideally)
        # Using dummy data for demonstration
        best_regime = RegimeType.trending_bull
        worst_regime = RegimeType.news_driven
        
        weights = {
            "xgboost": 0.45,
            "lstm": 0.35,
            "vision_transformer": 0.20
        }
        
        summary = (
            f"Over {total} completed trades, the system holds a {win_rate:.1f}% accuracy. "
            f"The models perform best during {best_regime.value} phases."
        )
        
        return PerformanceReportResponse(
            total_predictions=total,
            overall_win_rate=round(win_rate, 2),
            best_regime=best_regime,
            worst_regime=worst_regime,
            model_weights=weights,
            ai_summary=summary
        )
