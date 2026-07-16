"""
Stage 4: Vector Store Writer
Handles persisting embeddings and metadata to a persistent ChromaDB instance.
Guarantees per-user isolation by creating one ChromaDB collection per user.
"""

import os
import uuid
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("rag.vector_store")

_CHROMA_CLIENT = None
CHROMA_DIR = os.getenv("CHROMA_DIR", "/tmp/chroma_db_forexai")


def _get_client():
    """Lazy initialize the persistent ChromaDB client."""
    global _CHROMA_CLIENT
    if _CHROMA_CLIENT is not None:
        return _CHROMA_CLIENT
        
    try:
        import chromadb
        from chromadb.config import Settings
        
        # Ensure DB directory exists
        os.makedirs(CHROMA_DIR, exist_ok=True)
        
        logger.info("Initializing ChromaDB at %s", CHROMA_DIR)
        _CHROMA_CLIENT = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        return _CHROMA_CLIENT
    except ImportError:
        logger.warning("ChromaDB not installed. Vector store will fail.")
        return None


class VectorStore:
    """
    Manages write/read operations against ChromaDB. 
    Synchronous interface; intended to be run in executor for inserts.
    """

    @classmethod
    def _collection_name(cls, user_id: str) -> str:
        """Isolated collection name per user. Hyphens are restricted in Chroma names, use underscores."""
        clean_uuid = str(user_id).replace("-", "_")
        return f"user_{clean_uuid}"
        
    @classmethod
    def store_chunks(
        cls, 
        user_id: str, 
        document_id: str, 
        document_title: str, 
        chunks: List[Dict[str, Any]], 
        embeddings: List[List[float]],
        chunk_uuids: List[str]
    ) -> None:
        """
        Write chunks and their embeddings to the user's isolated ChromaDB collection.
        """
        client = _get_client()
        if not client:
            logger.warning("ChromaDB client unavailable. Skipping vector storage for dev/test.")
            return
            
        if len(chunks) != len(embeddings) or len(chunks) != len(chunk_uuids):
            raise ValueError("Mismatched counts for chunks, embeddings, or uuids.")

        collection_name = cls._collection_name(user_id)
        collection = client.get_or_create_collection(
            name=collection_name, 
            metadata={"description": f"Knowledge vectors for user {user_id}"}
        )
        
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "chunk_id": cuuid,
                "document_id": str(document_id),
                "user_id": str(user_id),
                "document_title": document_title,
                "chunk_index": c["chunk_index"],
                "page_number": c["page_number"] or -1, # Chroma doesn't allow None values in metadata
            }
            for cuuid, c in zip(chunk_uuids, chunks)
        ]
        
        # Batch insert into ChromaDB
        # Note: Chroma recommends batches >10 but <40,000. 
        # We assume `chunks` list from a single document isn't gigabytes large.
        max_batch = 5400 # Safe batch limit under SQLite limits
        
        for i in range(0, len(chunk_uuids), max_batch):
            collection.add(
                ids=chunk_uuids[i : i + max_batch],
                embeddings=embeddings[i : i + max_batch],
                documents=documents[i : i + max_batch],
                metadatas=metadatas[i : i + max_batch]
            )
            
        logger.info("Inserted %d chunks into ChromaDB collection %s.", len(chunk_uuids), collection_name)

    @classmethod
    def delete_document_vectors(cls, user_id: str, document_id: str) -> None:
        """
        Remove all vectors associated with a specific Document ID for a given user.
        """
        client = _get_client()
        if not client:
            return
            
        try:
            collection = client.get_collection(name=cls._collection_name(user_id))
            # Delete where metadata matches document_id
            collection.delete(where={"document_id": str(document_id)})
            logger.info("Deleted vectors for document %s.", document_id)
        except Exception as exc:
            # Collection might not exist yet, which is safe to ignore
            logger.warning("Could not delete vectors for doc %s (maybe safe): %s", document_id, exc)

    @classmethod
    def query(
        cls, 
        user_id: str, 
        query_vector: List[float], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search the user's isolated collection for the nearest vectors to the query vector.
        """
        client = _get_client()
        if not client:
            # Stub return for test environments
            return []
            
        try:
            collection = client.get_collection(name=cls._collection_name(user_id))
            
            results = collection.query(
                query_embeddings=[query_vector],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            if not results["ids"] or not results["ids"][0]:
                return []
                
            formatted_results = []
            
            # ChromaDB returns List[List[Type]] because it supports multi-querying
            # We are querying one vector, so we unpack the first element [0]
            ids = results["ids"][0]
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0] if "distances" in results else []
            
            for i, chunk_id in enumerate(ids):
                # Convert L2 distance to similarity score proxy
                score = 1.0 - (distances[i] if distances else 0.0)
                formatted_results.append({
                    "chunk_id": chunk_id,
                    "text": documents[i],
                    "metadata": metadatas[i],
                    "similarity": round(max(0.0, score), 4)
                })
                
            return formatted_results
            
        except Exception as exc:
            logger.error("ChromaDB query failed for user %s: %s", user_id, exc)
            return []
