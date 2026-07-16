"""
Engine 2: Multi-Timeframe Aligner
Ensures alignment across macroscopic and microscopic trends.
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.intelligence.regime_detector import MarketRegimeDetector
import logging

logger = logging.getLogger("intelligence.timeframe_aligner")

class TimeframeAligner:
    
    # Hierarchy of timeframes
    TF_MACRO = {"1m": "15m", "5m": "1H", "15m": "4H", "30m": "4H", "1H": "1D", "4H": "1W"}
    
    @classmethod
    async def align_timeframes(cls, db: AsyncSession, pair: str, base_timeframe: str) -> Dict[str, Any]:
        """
        Detects regime of base timeframe and macro timeframe to find alignment.
        """
        macro_tf = cls.TF_MACRO.get(base_timeframe)
        import asyncio
        
        if macro_tf:
            base_regime, macro_regime = await asyncio.gather(
                MarketRegimeDetector.detect_regime(db, pair, base_timeframe),
                MarketRegimeDetector.detect_regime(db, pair, macro_tf)
            )
        else:
            base_regime = await MarketRegimeDetector.detect_regime(db, pair, base_timeframe)
            macro_regime = None
            
        is_aligned = True
        conflict_reason = None
        
        if macro_regime:
            
            # Simple conflict detection: e.g. base is bull but macro is bear
            if base_regime.regime == "trending_bull" and macro_regime.regime == "trending_bear":
                is_aligned = False
                conflict_reason = f"Macroscopic counter-trend ({macro_tf} is strongly bearish)"
            elif base_regime.regime == "trending_bear" and macro_regime.regime == "trending_bull":
                is_aligned = False
                conflict_reason = f"Macroscopic counter-trend ({macro_tf} is strongly bullish)"
                
        logger.debug("Timeframe alignment for %s %s vs %s: aligned=%s", pair, base_timeframe, macro_tf, is_aligned)
        
        return {
            "base_regime": base_regime,
            "macro_regime": macro_regime,
            "is_aligned": is_aligned,
            "conflict_reason": conflict_reason
        }
