"""
RAG Retriever
Coordinates query embedding and vector search to fetch context for answers.
"""

import asyncio
import logging
from typing import List, Dict, Any

from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore
from app.schemas.knowledge import SourceCitation

logger = logging.getLogger("rag.retriever")


class RetrievalEngine:
    
    @classmethod
    async def retrieve_context(cls, user_id: str, query: str, top_k: int = 5) -> List[SourceCitation]:
        """
        1. Embeds the user's natural language query.
        2. Searches ChromaDB top_k nearest chunks.
        3. Formats results into strict SourceCitation schemas.
        """
        loop = asyncio.get_event_loop()
        
        # Step 1: Embed query
        query_vector = await loop.run_in_executor(None, Embedder.embed_query, query)
        
        # Step 2: Search vector DB
        raw_results = await loop.run_in_executor(
            None, 
            VectorStore.query, 
            user_id, 
            query_vector, 
            top_k
        )
        
        citations = []
        for res in raw_results:
            meta = res.get("metadata", {})
            citations.append(
                SourceCitation(
                    document_id=meta.get("document_id", "unknown"),
                    chunk_id=res["chunk_id"],
                    title=meta.get("document_title", "Untitled Document"),
                    page_number=meta.get("page_number", -1) if meta.get("page_number") != -1 else None,
                    excerpt=res["text"],
                    similarity_score=res["similarity"]
                )
            )
            
        logger.debug("Retrieved %d context chunks for query by %s", len(citations), user_id)
        return citations
