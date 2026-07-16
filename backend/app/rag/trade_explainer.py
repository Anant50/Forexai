"""
Trade Explainer
Fetches a trade prediction, constructs a contextual query, searches the user's
knowledge base, and generates a personalized RAG explanation of the trade.
"""

import logging
from typing import Dict, Any, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import Prediction
from app.rag.retriever import RetrievalEngine
from app.rag.answer_generator import AnswerGenerator
from app.schemas.knowledge import SourceCitation

logger = logging.getLogger("rag.trade_explainer")


class TradeExplainer:

    @classmethod
    async def explain_trade(
        cls, 
        db: AsyncSession, 
        prediction_id: str, 
        user_id: str
    ) -> Tuple[str, List[SourceCitation]]:
        """
        Generates an explanation for a prediction based on user's documents.
        Returns Tuple[explanation_text, list_of_citations].
        """
        # 1. Fetch prediction details
        q = select(Prediction).filter(Prediction.id == prediction_id)
        res = await db.execute(q)
        prediction = res.scalars().first()
        
        if not prediction:
            raise ValueError(f"Prediction {prediction_id} not found.")
            
        direction = prediction.direction.value
        pair = prediction.pair
        entry = float(prediction.entry_price)
        indicators = prediction.technical_indicators
        
        # 2. Build structured RAG query based on trade context
        rsi = indicators.get("rsi", "unknown")
        patterns = indicators.get("cv_patterns", [])
        pattern_text = f" and a {patterns[0]} pattern" if patterns else ""
        
        query = (
            f"Explain why a {direction} trade on {pair} at {entry} would make sense "
            f"when RSI is {rsi}{pattern_text}. What do the trading strategies say about this?"
        )
        
        logger.info("Trade RAG query: %s", query)
        
        # 3. Retrieve context
        sources = await RetrievalEngine.retrieve_context(user_id, query, top_k=5)
        
        # 4. Generate answer
        if not sources:
            fallback = (
                f"The AI suggested a {direction} on {pair} (confidence {prediction.confidence_value:.2f}), "
                "but you have not uploaded any documents matching these exact market conditions."
            )
            return fallback, []
            
        explanation = AnswerGenerator.generate_answer(query, sources)
        return explanation, sources
