"""
Knowledge Service
Business logic layer between Phase 10 API routes and the RAG engine underneath.
"""

import logging
import os
import time
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func as sqlfunc

from app.models.models import KnowledgeDocument, KnowledgeChunk, DocumentStatus, DocumentType
from app.rag.ingestion_pipeline import IngestionPipeline
from app.rag.retriever import RetrievalEngine
from app.rag.answer_generator import AnswerGenerator
from app.rag.trade_explainer import TradeExplainer
from app.rag.vector_store import VectorStore

logger = logging.getLogger("services.knowledge")


class KnowledgeService:

    @staticmethod
    async def create_document(
        db: AsyncSession, 
        user_id: str, 
        title: str, 
        filename: str, 
        file_path: str,
        file_size_bytes: int,
        mime_type: str,
    ) -> KnowledgeDocument:
        """Create DB record and trigger async ingestion."""
        # Map mime/ext to enum
        ext = os.path.splitext(filename)[1].lower()
        if "pdf" in mime_type or ext == ".pdf":
            doc_type = DocumentType.pdf
        elif "word" in mime_type or ext == ".docx":
            doc_type = DocumentType.docx
        elif "epub" in mime_type or ext == ".epub":
            doc_type = DocumentType.epub
        elif ext == ".md":
            doc_type = DocumentType.md
        else:
            doc_type = DocumentType.txt

        doc = KnowledgeDocument(
            user_id=user_id,
            title=title,
            filename=filename,
            file_path=file_path,
            file_size_bytes=file_size_bytes,
            mime_type=mime_type,
            document_type=doc_type,
            status=DocumentStatus.uploading
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        # Fire off ingestion (for production, wrap in BackgroundTasks or Celery)
        # Here we await it directly as requested by the plan.
        try:
            doc.status = DocumentStatus.processing
            db.add(doc)
            await db.commit()
            
            await IngestionPipeline.process_document(
                db, 
                document_id=doc.id, 
                user_id=user_id, 
                file_path=file_path,
                mime_type=mime_type,
                document_title=title
            )
        except Exception as exc:
            logger.error("Ingestion crashed for %s: %s", doc.id, exc)
            
        await db.refresh(doc)
        return doc

    @staticmethod
    async def get_document(db: AsyncSession, document_id: str, user_id: str) -> Optional[KnowledgeDocument]:
        q = select(KnowledgeDocument).filter(
            KnowledgeDocument.id == document_id, 
            KnowledgeDocument.user_id == user_id,
            KnowledgeDocument.deleted_at.is_(None)
        )
        res = await db.execute(q)
        return res.scalars().first()

    @staticmethod
    async def list_documents(db: AsyncSession, user_id: str, page: int = 1, size: int = 20) -> tuple[int, List[KnowledgeDocument]]:
        offset = (page - 1) * size
        
        # Count total
        count_q = select(sqlfunc.count(KnowledgeDocument.id)).filter(
            KnowledgeDocument.user_id == user_id,
            KnowledgeDocument.deleted_at.is_(None)
        )
        total_res = await db.execute(count_q)
        total = total_res.scalar() or 0
        
        # Fetch page
        q = select(KnowledgeDocument).filter(
            KnowledgeDocument.user_id == user_id,
            KnowledgeDocument.deleted_at.is_(None)
        ).order_by(KnowledgeDocument.created_at.desc()).offset(offset).limit(size)
        
        res = await db.execute(q)
        items = list(res.scalars().all())
        return total, items

    @staticmethod
    async def delete_document(db: AsyncSession, document_id: str, user_id: str) -> bool:
        """Two-phase delete: Purge vectors from ChromaDB, soft-delete from PG."""
        doc = await KnowledgeService.get_document(db, document_id, user_id)
        if not doc:
            return False
            
        import asyncio
        loop = asyncio.get_event_loop()
        
        # Phase 1: Purge ChromaDB
        await loop.run_in_executor(
            None, 
            VectorStore.delete_document_vectors, 
            user_id, 
            document_id
        )
        
        # Phase 2: Purge PG Chunks & soft-delete parent
        delete_q = select(KnowledgeChunk).filter(KnowledgeChunk.document_id == document_id)
        chunks = await db.execute(delete_q)
        for chunk in chunks.scalars():
            await db.delete(chunk)
            
        from datetime import timezone, datetime
        doc.deleted_at = datetime.now(timezone.utc)
        doc.status = DocumentStatus.deleted
        db.add(doc)
        
        await db.commit()
        return True

    @staticmethod
    async def ask_question(user_id: str, question: str, top_k: int = 5) -> Dict[str, Any]:
        """Perform RAG Q&A."""
        start_time = time.monotonic()
        
        sources = await RetrievalEngine.retrieve_context(user_id, question, top_k)
        answer = AnswerGenerator.generate_answer(question, sources)
        
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        
        # Approximate confidence by averaging top 3 source similarities
        conf = 0.0
        if sources:
            top_sources = sources[:3]
            conf = sum(s.similarity_score for s in top_sources) / len(top_sources)
            
        return {
            "answer": answer,
            "sources": sources,
            "confidence_score": round(conf, 4),
            "generative_model": "google/flan-t5-base",
            "processing_time_ms": elapsed_ms
        }
        
    @staticmethod
    async def search_knowledge(user_id: str, query: str, top_k: int = 10) -> Dict[str, Any]:
        """Perform pure semantic search without LLM answer generation."""
        start_time = time.monotonic()
        sources = await RetrievalEngine.retrieve_context(user_id, query, top_k)
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        
        return {
            "query": query,
            "results": sources,
            "processing_time_ms": elapsed_ms
        }

    @staticmethod
    async def explain_trade(db: AsyncSession, prediction_id: str, user_id: str) -> Dict[str, Any]:
        """Generate a trade explanation via RAG."""
        start_time = time.monotonic()
        explanation, references = await TradeExplainer.explain_trade(db, prediction_id, user_id)
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        
        return {
            "prediction_id": prediction_id,
            "explanation": explanation,
            "references": references,
            "processing_time_ms": elapsed_ms
        }
        
    @staticmethod
    async def get_admin_stats(db: AsyncSession) -> Dict[str, Any]:
        doc_q = select(sqlfunc.count(KnowledgeDocument.id)).filter(KnowledgeDocument.deleted_at.is_(None))
        chunk_q = select(sqlfunc.count(KnowledgeChunk.id))
        user_q = select(sqlfunc.count(sqlfunc.distinct(KnowledgeDocument.user_id)))
        size_q = select(sqlfunc.sum(KnowledgeDocument.file_size_bytes)).filter(KnowledgeDocument.deleted_at.is_(None))
        
        doc_count = (await db.execute(doc_q)).scalar() or 0
        chunk_count = (await db.execute(chunk_q)).scalar() or 0
        user_count = (await db.execute(user_q)).scalar() or 0
        size_bytes = (await db.execute(size_q)).scalar() or 0
        
        return {
            "total_documents": doc_count,
            "total_chunks": chunk_count,
            "active_users": user_count,
            "storage_bytes": size_bytes
        }
