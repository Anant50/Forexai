"""
Engine 4: Explainable AI (XAI) Module
Provides SHAP values and heuristic rule extraction to explain predictions in plain English.
"""

import logging
from typing import List, Dict, Any, Tuple
import numpy as np

from app.schemas.intelligence import XaiResponse, XaiFeature
from app.models.models import SignalType

try:
    import shap
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False
    
logger = logging.getLogger("intelligence.xai_analyzer")

class XaiAnalyzer:

    @classmethod
    def generate_explanation(
        cls, 
        prediction_id: str, 
        features_dict: Dict[str, float], 
        model_instance: Any = None
    ) -> XaiResponse:
        """
        Synchronously calculates feature importances. 
        If SHAP is unavailable or no model_instance is passed, falls back to fast heuristics.
        """
        shap_features = []
        
        if _SHAP_AVAILABLE and model_instance:
            try:
                # Assuming model_instance is a tree-based model compatible with TreeExplainer
                explainer = shap.TreeExplainer(model_instance)
                # Convert dict to array strictly in model's expected feature order
                X = np.array(list(features_dict.values())).reshape(1, -1)
                shap_vals = explainer.shap_values(X)
                
                # Extract top 3 features
                feature_names = list(features_dict.keys())
                vals = shap_vals[0] if isinstance(shap_vals, list) else shap_vals[0]
                
                # Sort by absolute impact
                top_indices = np.argsort(np.abs(vals))[-3:][::-1]
                
                for idx in top_indices:
                    impact = float(vals[idx])
                    shap_features.append(
                        XaiFeature(
                            feature=feature_names[idx],
                            importance=round(abs(impact), 4),
                            impact_direction=SignalType.bullish if impact > 0 else SignalType.bearish
                        )
                    )
            except Exception as e:
                logger.warning("SHAP execution failed, falling back to heuristics: %s", e)
                shap_features = cls._heuristic_fallback(features_dict)
        else:
            shap_features = cls._heuristic_fallback(features_dict)
            
        summary = cls._generate_plain_english(shap_features)
        
        return XaiResponse(
            prediction_id=prediction_id,
            shap_values=shap_features,
            plain_english_summary=summary,
            processing_time_ms=0 # Populated higher up
        )

    @classmethod
    def _heuristic_fallback(cls, features: Dict[str, float]) -> List[XaiFeature]:
        """Rule-based surrogate for XAI when SHAP is unavailable."""
        results = []
        if "rsi" in features:
            val = features["rsi"]
            if val < 30:
                results.append(XaiFeature(feature="rsi", importance=0.8, impact_direction=SignalType.bullish))
            elif val > 70:
                results.append(XaiFeature(feature="rsi", importance=0.8, impact_direction=SignalType.bearish))
                
        if "macd_histogram" in features:
            val = features["macd_histogram"]
            dir_bias = SignalType.bullish if val > 0 else SignalType.bearish
            results.append(XaiFeature(feature="macd_histogram", importance=0.6, impact_direction=dir_bias))
            
        if "adx" in features:
            val = features["adx"]
            if val > 25:
                results.append(XaiFeature(feature="adx", importance=0.9, impact_direction=SignalType.neutral))

        # Sort and take top 3
        return sorted(results, key=lambda x: x.importance, reverse=True)[:3]

    @classmethod
    def _generate_plain_english(cls, features: List[XaiFeature]) -> str:
        if not features:
            return "The model relied on a complex non-linear combination of baseline factors."
            
        top_f = features[0]
        direction = "upward" if top_f.impact_direction == SignalType.bullish else "downward"
        
        narrative = f"The most significant factor driving this decision was {top_f.feature.upper()}, "
        narrative += f"which strongly pushed the model towards a {direction} bias. "
        
        if len(features) > 1:
            second_f = features[1]
            narrative += f"This was reinforced by {second_f.feature.upper()}."
            
        return narrative
