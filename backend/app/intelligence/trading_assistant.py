"""
Engine 7: AI Trading Assistant
Conversational wrapper utilizing Phase 10 RAG tools to answer user trading questions.
"""

import time
from typing import Dict, Any

from app.schemas.intelligence import ChatResponse
from app.rag.retriever import RetrievalEngine
from app.rag.answer_generator import AnswerGenerator

class TradingAssistant:

    @classmethod
    async def chat(cls, user_id: str, query: str) -> ChatResponse:
        """
        Answers a user query based on their RAG documents and general logic.
        """
        start_time = time.monotonic()
        
        # 1. Retrieve context
        sources = await RetrievalEngine.retrieve_context(user_id, query, top_k=3)
        
        # 2. Generate answer
        answer = AnswerGenerator.generate_answer(query, sources)
        
        elapsed = int((time.monotonic() - start_time) * 1000)
        
        # Format sources for response
        formatted_sources = [{"title": s.title, "excerpt": s.excerpt[:100] + "..."} for s in sources]
        
        return ChatResponse(
            answer=answer,
            sources=formatted_sources,
            processing_time_ms=elapsed
        )
