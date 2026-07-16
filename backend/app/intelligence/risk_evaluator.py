"""
Engine 5: Risk & Quality Evaluator
Maps prediction confidence, ATR, and conflicts into a Trade Quality Grade and Risk Score.
"""

from typing import Dict, Any, Tuple
from app.schemas.intelligence import TradeGrade, RegimeType
from app.models.models import DirectionType

class RiskEvaluator:
    
    @classmethod
    def evaluate_risk(
        cls, 
        base_confidence: float, 
        alignment: Dict[str, Any], 
        volatility_atr: float, 
        is_news_driven: bool,
        current_price: float,
        suggested_dir: DirectionType
    ) -> Tuple[TradeGrade, int, float, float, float]:
        """
        Returns (Grade, RiskScore(0-100), Suggested Entry, SL, TP)
        """
        risk_score = 50
        
        # 1. Base modifiers
        if is_news_driven:
            risk_score += 40
        if not alignment["is_aligned"]:
            risk_score += 30
            
        # Volatility modifier
        if volatility_atr > 0.0050:
            risk_score += 15
            
        # Confidence modifier (High confidence lowers risk)
        if base_confidence > 85:
            risk_score -= 20
        elif base_confidence < 50:
            risk_score += 20
            
        risk_score = max(0, min(100, risk_score))
        
        # 2. Grade mapping
        if risk_score > 80:
            grade = TradeGrade.F if is_news_driven else TradeGrade.C
        elif risk_score > 60:
            grade = TradeGrade.B
        elif risk_score < 30 and alignment["is_aligned"]:
            grade = TradeGrade.A_PLUS
        else:
            grade = TradeGrade.A
            
        if suggested_dir == DirectionType.neutral or risk_score >= 90:
            grade = TradeGrade.WAIT
            
        # 3. Dynamic SL/TP based on ATR (1.5x ATR for SL, 2.5x ATR for TP standard)
        sl_dist = volatility_atr * 1.5
        tp_dist = volatility_atr * 2.5
        
        entry = current_price
        if suggested_dir == DirectionType.long:
            sl = entry - sl_dist
            tp = entry + tp_dist
        else:
            sl = entry + sl_dist
            tp = entry - tp_dist
            
        return grade, int(risk_score), entry, sl, tp
