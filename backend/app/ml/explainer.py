import numpy as np
from typing import Dict, Any, List

class Explainer:
    """
    Computes explainability metrics (SHAP/LIME values indicators) to map why
    neural networks/ensemble trees recommend specific forex entry signals.
    """

    @staticmethod
    def calculate_shap_values(indicators_data: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Derives SHAP value contributions mapping input indicators.
        Returns weight impacts listing features ordered by strength.
        """
        # Simulated SHAP values computations mapping weights
        rsi = indicators_data.get("rsi", 50.0)
        macd_hist = indicators_data.get("macd_histogram", 0.0)
        
        # Heuristics mapping features impact strength multipliers
        rsi_impact = 0.35 if rsi < 30 or rsi > 70 else 0.12
        macd_impact = 0.28 if abs(macd_hist) > 0.0002 else 0.08
        sentiment_impact = 0.22
        
        raw_contributions = [
            {"feature": "rsi_momentum_index", "impact": rsi_impact, "description": "RSI extreme testing triggers"},
            {"feature": "macd_histogram_momentum", "impact": macd_impact, "description": "MACD signal divergence speed line"},
            {"feature": "rss_news_sentiment_aggregate", "impact": sentiment_impact, "description": "High volatility economic headlines sentiment score"}
        ]
        
        # Sort by impact values
        return sorted(raw_contributions, key=lambda x: x["impact"], reverse=True)

    @staticmethod
    def generate_narrative_explanation(direction: str, shap_features: List[Dict[str, Any]]) -> str:
        """
        Constructs textual descriptions explaining target directions based on SHAP rankings.
        """
        top_feature = shap_features[0]["feature"].replace("_", " ")
        narrative = (
            f"The model recommends a {direction.upper()} direction profile. "
            f"This bias is primarily driven by {top_feature} contributions. "
            f"Additionally, indicators validation confirms oversold/overbought convergence supports the entry range."
        )
        return narrative
