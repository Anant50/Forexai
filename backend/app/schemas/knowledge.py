"""
Pydantic Schemas for the Phase 10 Knowledge Engine.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import timezone, datetime
from app.models.models import DocumentType, DocumentStatus

# ─── Document Management ────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_size_bytes: int
    mime_type: str
    document_type: DocumentType
    page_count: Optional[int]
    word_count: Optional[int]
    chunk_count: Optional[int]
    embedding_model: Optional[str]
    status: DocumentStatus
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PaginatedDocumentsList(BaseModel):
    total: int
    page: int
    size: int
    items: List[DocumentResponse]


# ─── RAG Search and QA ─────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=1000, description="The user's question to the AI")
    top_k: int = Field(5, ge=1, le=20, description="Number of knowledge chunks to retrieve for context")

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Semantic search keyword/phrase")
    top_k: int = Field(10, ge=1, le=50, description="Number of results to return")

class SourceCitation(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    page_number: Optional[int]
    excerpt: str
    similarity_score: float

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    confidence_score: float
    generative_model: str
    processing_time_ms: int

class SearchResponse(BaseModel):
    query: str
    results: List[SourceCitation]
    processing_time_ms: int


# ─── Trade Explanation ────────────────────────────────────────────────────────

class TradeExplanationResponse(BaseModel):
    prediction_id: str
    explanation: str
    references: List[SourceCitation]
    processing_time_ms: int


# ─── Admin Stats ──────────────────────────────────────────────────────────────

class KnowledgeStatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    active_users: int
    storage_bytes: int
