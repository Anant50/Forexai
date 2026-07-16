"""
Phase 10 Knowledge AI System (RAG) — Integration Test Suite

Tests document parsing, chunking, embedding, vector store (ChromaDB isolation), 
and the Knowledge API endpoints.
"""

import os
import tempfile
import pytest
import io
from uuid import uuid4
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pathlib import Path

from app.models.models import (
    User, UserRole, KnowledgeDocument, KnowledgeChunk, DocumentStatus, DocumentType
)
from app.core.security import get_password_hash
from app.rag.file_parser import FileParser, DocumentPage
from app.rag.chunker import TextChunker, DocumentChunk
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore, _get_client
from app.rag.ingestion_pipeline import IngestionPipeline


# ── Helpers ────────────────────────────────────────────────────────────────────

def _create_temp_txt(text: str) -> str:
    """Create a temporary text file for testing parsing/ingestion."""
    fd, path = tempfile.mkstemp(suffix=".txt")
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(text)
    return path


@pytest.fixture
async def rag_user1(db_session: AsyncSession) -> User:
    user = User(
        email="rag1@forexai.pro",
        full_name="RAG User One",
        hashed_password=get_password_hash("R1Test123!"),
        role=UserRole.trader,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def rag_user2(db_session: AsyncSession) -> User:
    user = User(
        email="rag2@forexai.pro",
        full_name="RAG User Two",
        hashed_password=get_password_hash("R2Test123!"),
        role=UserRole.trader,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def auth_headers1(client: AsyncClient, rag_user1: User) -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": rag_user1.email, "password": "R1Test123!"})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Stage 1: File Parser ──────────────────────────────────────────────────────

def test_file_parser_txt():
    """Parser should read text and return single DocumentPage."""
    text_content = "This is a test document.\nWith two lines."
    path = _create_temp_txt(text_content)
    try:
        pages = FileParser.parse_file(path, "text/plain")
        assert len(pages) == 1
        assert "This is a test document" in pages[0].text
    finally:
        os.remove(path)


# ── Stage 2: Chunker ───────────────────────────────────────────────────────────

def test_chunker_splits_correctly():
    """Chunker should respect boundaries and create DocumentChunk objects."""
    # Create artificial long text with distinct paragraphs
    text = "Paragraph 1 is here.\n\nParagraph 2 is slightly longer but distinct.\n\nParagraph 3 is the last one."
    pages = [DocumentPage(text=text * 50, page_number=1)]  # Multiply to force split
    
    chunks = TextChunker.split_document(pages)
    
    assert len(chunks) > 1
    assert all(isinstance(c, DocumentChunk) for c in chunks)
    assert all(c.page_number == 1 for c in chunks)
    assert chunks[0].chunk_index == 0


# ── Stage 3: Embedder ──────────────────────────────────────────────────────────

def test_embedder_dimensions():
    """Embedder should return 384d float lists."""
    chunks = [DocumentChunk("This is a simple sentence.", 1, 0)]
    embeddings = Embedder.embed_chunks(chunks)
    
    assert len(embeddings) == 1
    assert len(embeddings[0]) == 384
    assert isinstance(embeddings[0][0], float)

def test_embedder_query():
    query_vector = Embedder.embed_query("Strategy")
    assert len(query_vector) == 384


# ── Stage 4: Vector Store & Isolation ──────────────────────────────────────────

def test_vector_store_insert_and_retrieve():
    """Insert points, query, verify similarity."""
    client = _get_client()
    if not client:
        pytest.skip("ChromaDB not available in test environment.")
        
    user_id = str(uuid4())
    doc_id = str(uuid4())
    
    chunks = [
        {"text": "Apples are red fruit.", "chunk_index": 0, "page_number": 1},
        {"text": "The sky is blue today.", "chunk_index": 1, "page_number": 1},
        {"text": "Bananas are yellow.", "chunk_index": 2, "page_number": 1}
    ]
    
    # We must generate the embeddings
    embeds = Embedder.embed_chunks([DocumentChunk(c["text"], 1, i) for i, c in enumerate(chunks)])
    uuids = [str(uuid4()) for _ in chunks]
    
    VectorStore.store_chunks(user_id, doc_id, "Test Doc", chunks, embeds, uuids)
    
    # Query for the fruit
    query_vector = Embedder.embed_query("Tell me about red fruit")
    results = VectorStore.query(user_id, query_vector, top_k=2)
    
    assert len(results) > 0
    assert "Apple" in results[0]["text"]
    assert results[0]["similarity"] > 0.0


def test_user_isolation():
    """User A cannot retrieve User B's knowledge chunks."""
    client = _get_client()
    if not client:
        pytest.skip("ChromaDB not available.")
        
    user_a = str(uuid4())
    user_b = str(uuid4())
    
    embed_a = Embedder.embed_query("Secret Strategy A")
    embed_b = Embedder.embed_query("Public Strategy B")
    
    VectorStore.store_chunks(
        user_a, str(uuid4()), "Doc A", 
        [{"text": "Secret Strategy A", "chunk_index": 0, "page_number": 1}], [embed_a], [str(uuid4())]
    )
    
    VectorStore.store_chunks(
        user_b, str(uuid4()), "Doc B", 
        [{"text": "Public Strategy B", "chunk_index": 0, "page_number": 1}], [embed_b], [str(uuid4())]
    )
    
    # User A queries for B's strategy
    results_a = VectorStore.query(user_a, embed_b, top_k=5)
    
    # Because A doesn't have B's strategy, string shouldn't match
    if results_a:
        assert "Public Strategy B" not in results_a[0]["text"]


# ── Integration: Ingestion Pipeline ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingestion_pipeline_end_to_end(db_session: AsyncSession, rag_user1: User):
    """Pipeline should parse, chunk, embed, store in DB and Vector DB."""
    doc_text = "Trading Support and Resistance.\n\nBuy when price touches support and RS I is oversold."
    path = _create_temp_txt(doc_text)
    
    try:
        # Create DB record manually to mirror API
        doc = KnowledgeDocument(
            user_id=rag_user1.id,
            title="S_and_R.txt",
            filename="S_and_R.txt",
            file_path=path,
            file_size_bytes=100,
            mime_type="text/plain",
            document_type=DocumentType.txt,
            status=DocumentStatus.uploading
        )
        db_session.add(doc)
        await db_session.commit()
        await db_session.refresh(doc)
        
        # Run pipeline
        await IngestionPipeline.process_document(
            db=db_session,
            document_id=doc.id,
            user_id=rag_user1.id,
            file_path=path,
            mime_type="text/plain",
            document_title="S_and_R.txt"
        )
        
        # Verify DB updates
        await db_session.refresh(doc)
        assert doc.status == DocumentStatus.ready
        assert doc.chunk_count > 0
        assert doc.word_count > 0
        
        # Verify chunks saved to PG
        q = select(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc.id)
        res = await db_session.execute(q)
        chunks = list(res.scalars().all())
        assert len(chunks) == doc.chunk_count
        
    finally:
        os.remove(path)


# ── RAG API Endpoints ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_api(client: AsyncClient, auth_headers1):
    """POST /documents/upload processes file."""
    # Create dummy txt
    txt_content = b"MACD crossover strategy. A bullish signal occurs when..."
    files = {"file": ("test_strategy.txt", io.BytesIO(txt_content), "text/plain")}
    
    resp = await client.post("/api/v1/knowledge/documents/upload", files=files, headers=auth_headers1)
    
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "test_strategy.txt"
    assert body["status"] in ("processing", "ready")


@pytest.mark.asyncio
async def test_ask_api(client: AsyncClient, auth_headers1):
    """POST /ask returns generated answer and sources."""
    # Assumes previous test_upload_api created a doc for rag_user1
    payload = {"question": "What is a bullish signal in MACD?", "top_k": 3}
    resp = await client.post("/api/v1/knowledge/ask", json=payload, headers=auth_headers1)
    
    assert resp.status_code == 200
    body = resp.json()
    assert "answer" in body
    assert isinstance(body["sources"], list)


@pytest.mark.asyncio
async def test_delete_api(client: AsyncClient, auth_headers1, db_session: AsyncSession, rag_user1: User):
    """DELETE /documents/{id} soft-deletes and removes from Chroma."""
    # Find the document we just uploaded
    q = select(KnowledgeDocument).filter(KnowledgeDocument.user_id == rag_user1.id)
    res = await db_session.execute(q)
    doc = res.scalars().first()
    
    if not doc:
        pytest.skip("No document found to delete.")
        
    resp = await client.delete(f"/api/v1/knowledge/documents/{doc.id}", headers=auth_headers1)
    assert resp.status_code == 200
    
    # Assert DB status is deleted
    await db_session.refresh(doc)
    assert doc.status == DocumentStatus.deleted
    assert doc.deleted_at is not None
