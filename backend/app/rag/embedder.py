"""
Stage 3: Embedding Generator
Converts chunk text into 384-dimensional dense vectors using sentence-transformers.
"""

import logging
from typing import List, Any
import numpy as np

from app.rag.chunker import DocumentChunk

logger = logging.getLogger("rag.embedder")

_EMBEDDER_MODEL = None
_MODEL_NAME = "all-MiniLM-L6-v2"


def _load_embedder():
    """Lazy load the sentence-transformer model to save memory."""
    global _EMBEDDER_MODEL
    if _EMBEDDER_MODEL is not None:
        return _EMBEDDER_MODEL

    try:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading embedding model %s ...", _MODEL_NAME)
        # Using CPU inference for compatibility and ease of deployment.
        _EMBEDDER_MODEL = SentenceTransformer(_MODEL_NAME, device='cpu')
        logger.info("Embedding model loaded.")
    except ImportError:
        logger.warning("sentence-transformers not installed. Embedder will produce zero-vectors.")
        _EMBEDDER_MODEL = None

    return _EMBEDDER_MODEL


class Embedder:
    """
    Generates semantic vectors for document chunks or search queries.
    Synchronous interface; should run inside run_in_executor.
    """
    
    VECTOR_DIMENSION = 384

    @classmethod
    def embed_chunks(cls, chunks: List[DocumentChunk]) -> List[List[float]]:
        """
        Embed a batch of DocumentChunks into dense float vectors.
        """
        model = _load_embedder()
        
        if not chunks:
            return []
            
        texts = [chunk.text for chunk in chunks]

        if model is None:
            # Fallback for dev without ML libs: return zeros
            return [[0.0] * cls.VECTOR_DIMENSION for _ in texts]
            
        try:
            # Generate embeddings; model.encode returns numpy array by default
            embeddings = model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
            # Convert to standard Python lists for downstream JSON serialization/DB storage
            if isinstance(embeddings, np.ndarray):
                return embeddings.tolist()
            return [e.tolist() for e in embeddings]
        except Exception as exc:
            logger.error("Embedding generation failed: %s", exc)
            raise RuntimeError(f"Failed to encode chunks: {exc}")

    @classmethod
    def embed_query(cls, query: str) -> List[float]:
        """
        Embed a single text string (used for semantic search).
        """
        model = _load_embedder()
        if model is None:
             return [0.0] * cls.VECTOR_DIMENSION
             
        try:
            vector = model.encode(query, normalize_embeddings=True)
            if isinstance(vector, np.ndarray):
                return vector.tolist()
            return vector
        except Exception as exc:
            logger.error("Query embedding failed: %s", exc)
            raise RuntimeError(f"Failed to encode query: {exc}")
