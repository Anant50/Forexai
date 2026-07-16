from typing import Dict, Tuple

class EnsembleCombiner:
    """
    Groups predictions from multiple machine learning / deep learning networks
    (XGBoost, LSTM, Random Forest) using an accuracy-based weighting factor.
    """

    @staticmethod
    def combine_predictions(
        model_scores: Dict[str, float], weights: Dict[str, float] = None
    ) -> Tuple[str, float]:
        """
        Combines individual probability direction metrics.
        Returns:
            Tuple of:
              - Signal Bias Direction ('long', 'short', or 'wait')
              - Confidence score percentage (0.0 to 100.0)
        """
        if not model_scores:
            return "wait", 50.0

        # Define default model weights if not specified (based on recent accuracy telemetry)
        if not weights:
            weights = {
                "xgboost": 0.40,
                "lstm": 0.35,
                "random_forest": 0.25
            }

        total_weight = 0.0
        weighted_score = 0.0

        for model_name, score in model_scores.items():
            weight = weights.get(model_name, 0.10)
            weighted_score += score * weight
            total_weight += weight

        if total_weight > 0:
            final_score = weighted_score / total_weight
        else:
            final_score = sum(model_scores.values()) / len(model_scores)

        # Map score to Buy, Sell, or Wait (threshold boundaries check)
        # Score > 0.58 = Buy (Long), Score < 0.42 = Sell (Short), else Wait
        if final_score > 0.58:
            direction = "long"
            confidence = final_score * 100
        elif final_score < 0.42:
            direction = "short"
            confidence = (1 - final_score) * 100
        else:
            direction = "wait"
            confidence = 50.0

        # Cap confidence limits
        confidence = max(50.0, min(98.0, confidence))

        return direction, float(confidence)
