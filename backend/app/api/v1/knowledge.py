"""
Knowledge API Router — /api/v1/knowledge
Phase 10: Interaction endpoints for the Retrieval-Augmented Generation engine.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os
import secrets
from pathlib import Path

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.models import User
from app.services.knowledge_service import KnowledgeService
from app.schemas.knowledge import (
    DocumentResponse, PaginatedDocumentsList, AskRequest, 
    AskResponse, SearchRequest, SearchResponse,
    TradeExplanationResponse, KnowledgeStatsResponse
)

router = APIRouter(prefix="/knowledge", tags=["Knowledge AI / RAG"])

_ALLOWED_MIME = {
    "application/pdf", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain", 
    "text/markdown",
    "application/epub+zip"
}
_MAX_BYTES = 50 * 1024 * 1024  # 50 MB
UPLOAD_DIR = Path(os.getenv("KNOWLEDGE_UPLOAD_DIR", "/tmp/forexai_knowledge"))

def _validate_file(file: UploadFile) -> None:
    if file.content_type not in _ALLOWED_MIME and not file.filename.endswith(('.md', '.txt')):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT, MD, EPUB."
        )

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> DocumentResponse:
    """
    **Upload and process a document into your Knowledge Base.**
    File is parsed, chunked, and embedded into a private vector collection.
    Upload is asynchronous; the returned status will be `processing` and update to `ready`.
    """
    _validate_file(file)
    
    file_bytes = await file.read()
    size = len(file_bytes)
    if size > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 50 MB limit."
        )
        
    # Save raw file
    os.makedirs(UPLOAD_DIR / current_user.id, exist_ok=True)
    safe_name = f"{secrets.token_hex(4)}_{file.filename}"
    file_path = UPLOAD_DIR / current_user.id / safe_name
    file_path.write_bytes(file_bytes)
    
    doc = await KnowledgeService.create_document(
        db, current_user.id, title=file.filename, filename=file.filename,
        file_path=str(file_path), file_size_bytes=size, 
        mime_type=file.content_type or "text/plain"
    )
    return DocumentResponse.model_validate(doc)


@router.get("/documents", response_model=PaginatedDocumentsList)
async def list_documents(
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PaginatedDocumentsList:
    """List all your uploaded documents."""
    total, items = await KnowledgeService.list_documents(db, current_user.id, page, size)
    return PaginatedDocumentsList(
        total=total, page=page, size=size,
        items=[DocumentResponse.model_validate(d) for d in items]
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> DocumentResponse:
    """Get metadata for a specific document. Useful for polling status."""
    doc = await KnowledgeService.get_document(db, document_id, current_user.id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return DocumentResponse.model_validate(doc)


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Delete a document. Purges all its semantic vectors from the isolated vector store."""
    deleted = await KnowledgeService.delete_document(db, document_id, current_user.id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return {"detail": "Document vectors purged and record deleted."}


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    payload: AskRequest,
    current_user: User = Depends(get_current_user)
) -> AskResponse:
    """
    **Chat with your knowledge base (RAG).**
    Retrieves the most semantically relevant chunks from your private vector store
    and generates an LLM answer with direct citations.
    """
    result = await KnowledgeService.ask_question(current_user.id, payload.question, payload.top_k)
    return AskResponse(**result)


@router.post("/search", response_model=SearchResponse)
async def search_knowledge(
    payload: SearchRequest,
    current_user: User = Depends(get_current_user)
) -> SearchResponse:
    """
    **Semantic search (no generation).**
    Retrieves raw relevant document chunks based on semantic similarity.
    """
    result = await KnowledgeService.search_knowledge(current_user.id, payload.query, payload.top_k)
    return SearchResponse(**result)


@router.post("/explain-trade/{prediction_id}", response_model=TradeExplanationResponse)
async def explain_trade(
    prediction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TradeExplanationResponse:
    """
    **Personalized Trade Explanation.**
    Given an AI prediction, fetches relevant concepts from your personal uploaded books/strategies
    and synthesizes a custom explanation justifying the trade.
    """
    try:
        result = await KnowledgeService.explain_trade(db, prediction_id, current_user.id)
        return TradeExplanationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/health", tags=["Health Check"])
async def knowledge_health() -> dict:
    from app.rag.embedder import _EMBEDDER_MODEL
    from app.rag.answer_generator import _PIPELINE
    from app.rag.vector_store import _get_client
    
    return {
        "status": "healthy",
        "components": {
            "sentence_transformers": "loaded" if _EMBEDDER_MODEL else "disabled",
            "flan_t5": "loaded" if _PIPELINE else "disabled",
            "chromadb": "connected" if _get_client() else "error"
        }
    }


# ── Admin Endpoints ────────────────────────────────────────────────────────────

@router.get("/admin/stats", response_model=KnowledgeStatsResponse, tags=["Platform Administration"])
async def knowledge_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> KnowledgeStatsResponse:
    """Global system stats for the RAG engine."""
    result = await KnowledgeService.get_admin_stats(db)
    return KnowledgeStatsResponse(**result)
    
@router.delete("/admin/documents/{document_id}", tags=["Platform Administration"])
async def admin_delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> dict:
    """Force delete any user's document."""
    from app.models.models import KnowledgeDocument
    from sqlalchemy.future import select
    
    q = select(KnowledgeDocument).filter(KnowledgeDocument.id == document_id)
    doc = (await db.execute(q)).scalars().first()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
        
    await KnowledgeService.delete_document(db, document_id, doc.user_id)
    return {"detail": "Admin force delete successful"}
