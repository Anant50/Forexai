"""
Document Ingestion Pipeline
Coordinates the end-to-end processing of uploaded files: 
Parsing → Chunking → Embedding → Vector Storage → Relational DB sync.
"""

import asyncio
import logging
import uuid
import time
from typing import Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import KnowledgeDocument, KnowledgeChunk, DocumentStatus
from app.rag.file_parser import FileParser
from app.rag.chunker import TextChunker
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore

logger = logging.getLogger("rag.ingestion_pipeline")


class IngestionPipeline:
    """
    Orchestrates the 4-stage document processing pipeline.
    Must be called from a context that has an open DB session.
    Heavy synchronous operations (parsing, chunking, embedding) are delegated
    to an executor pool to prevent event loop blocking.
    """
    
    @classmethod
    async def process_document(
        cls, 
        db: AsyncSession, 
        document_id: str, 
        user_id: str, 
        file_path: str, 
        mime_type: str, 
        document_title: str
    ) -> None:
        """
        Execute parsing, chunking, and embedding pipeline.
        Updates the KnowledgeDocument record with final chunk counts and status.
        """
        logger.info("Starting ingestion pipeline for doc=%s, user=%s", document_id, user_id)
        
        loop = asyncio.get_event_loop()
        start_time = time.monotonic()
        
        try:
            # Stage 1: Parse to text
            pages = await loop.run_in_executor(None, FileParser.parse_file, file_path, mime_type)
            if not pages:
                raise ValueError("No text could be extracted from this document.")

            # Stage 2: Chunk text
            chunks = await loop.run_in_executor(None, TextChunker.split_document, pages)
            if not chunks:
                raise ValueError("Chunking failed: document might be too small or formatting unreadable.")

            # Stage 3: Embed chunks
            embeddings = await loop.run_in_executor(None, Embedder.embed_chunks, chunks)
            
            # Generate UUIDs for all chunks (needed to tie PG strings -> Chroma vectors)
            chunk_uuids = [str(uuid.uuid4()) for _ in chunks]
            
            # Stage 4: Store in Vector DB (ChromaDB)
            # Serialize for Chroma
            serialized_chunks = [c.to_dict() for c in chunks]
            await loop.run_in_executor(
                None, 
                VectorStore.store_chunks, 
                user_id, 
                document_id, 
                document_title,
                serialized_chunks, 
                embeddings, 
                chunk_uuids
            )
            
            # Stage 5: Sync with PostgreSQL
            total_words = sum(c.word_count for c in chunks)
            
            # Flush existing chunks if it's a re-process
            delete_q = select(KnowledgeChunk).filter(KnowledgeChunk.document_id == document_id)
            chunks_to_delete = await db.execute(delete_q)
            for old_c in chunks_to_delete.scalars():
                await db.delete(old_c)
                
            db_chunks = [
                KnowledgeChunk(
                    id=cuuid,
                    document_id=document_id,
                    user_id=user_id,
                    chunk_index=c.chunk_index,
                    chunk_text=c.text,
                    page_number=c.page_number,
                    word_count=c.word_count,
                )
                for cuuid, c in zip(chunk_uuids, chunks)
            ]
            db.add_all(db_chunks)
            
            # Update Document stats
            q = select(KnowledgeDocument).filter(KnowledgeDocument.id == document_id)
            res = await db.execute(q)
            doc = res.scalars().first()
            
            if doc:
                doc.page_count = len(pages)
                doc.word_count = total_words
                doc.chunk_count = len(chunks)
                doc.status = DocumentStatus.ready
                doc.embedding_model = "all-MiniLM-L6-v2"
                db.add(doc)
            
            await db.commit()
            
            elapsed = time.monotonic() - start_time
            logger.info("Ingestion complete in %.2fs. Indexed %d chunks.", elapsed, len(chunks))
            
        except Exception as exc:
            logger.error("Ingestion failed for doc=%s: %s", document_id, exc)
            
            # Mark document as failed
            q = select(KnowledgeDocument).filter(KnowledgeDocument.id == document_id)
            res = await db.execute(q)
            doc = res.scalars().first()
            if doc:
                doc.status = DocumentStatus.failed
                doc.error_message = str(exc)
                db.add(doc)
                await db.commit()
