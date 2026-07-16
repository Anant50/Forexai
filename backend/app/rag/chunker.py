"""
Stage 2: Text Chunker
Splits parsed documents into overlapping, semantically meaningful chunks.
Uses LangChain's RecursiveCharacterTextSplitter.
"""

import logging
from typing import List, Dict, Any

from app.rag.file_parser import DocumentPage

logger = logging.getLogger("rag.chunker")

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    _LANGCHAIN_AVAILABLE = True
except ImportError:
    _LANGCHAIN_AVAILABLE = False


class DocumentChunk:
    """Represents a discrete piece of text ready for embedding."""
    def __init__(self, text: str, page_number: int, chunk_index: int):
        self.text = text
        self.page_number = page_number
        self.chunk_index = chunk_index
        # Word count is useful for metadata
        self.word_count = len(text.split())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "page_number": self.page_number,
            "chunk_index": self.chunk_index,
            "word_count": self.word_count,
        }


class TextChunker:
    """
    Splits text using recursive separator fallback strategy.
    Prioritises paragraphs, then lines, then sentences, then characters.
    """

    CHUNK_SIZE = 512       # Approximate token/character target (Langchain usually counts by char)
    CHUNK_OVERLAP = 64     # Overlap to preserve context boundary

    @classmethod
    def split_document(cls, pages: List[DocumentPage]) -> List[DocumentChunk]:
        """
        Takes a list of DocumentPages and splits their text into overlapping chunks.
        Preserves the source page number for citation mapping.
        """
        if not _LANGCHAIN_AVAILABLE:
            # Fallback for dev/test environments without langchain
            logger.warning("Langchain not available. Using simple split fallback.")
            all_chunks: List[DocumentChunk] = []
            global_chunk_idx = 0
            for page in pages:
                if not page.text.strip(): continue
                # Simple split by double newline
                paragraphs = page.text.split("\n\n")
                for p in paragraphs:
                    if p.strip():
                        # Chop to fixed length if still too long
                        p_len = len(p)
                        for i in range(0, p_len, cls.CHUNK_SIZE * 4):
                            segment = p[i:i + cls.CHUNK_SIZE * 4]
                            all_chunks.append(DocumentChunk(
                                text=segment.strip(),
                                page_number=page.page_number,
                                chunk_index=global_chunk_idx
                            ))
                            global_chunk_idx += 1
            return all_chunks

        # Standard RAG splitting config
        splitter = RecursiveCharacterTextSplitter(
            separators=["\n\n", "\n", " ", ""],
            chunk_size=cls.CHUNK_SIZE * 4,  # Approx chars assuming 4 chars per token
            chunk_overlap=cls.CHUNK_OVERLAP * 4,
            length_function=len,
        )

        all_chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        for page in pages:
            # Skip empty pages
            if not page.text.strip():
                continue

            # Split the page text
            texts = splitter.split_text(page.text)
            
            for text_segment in texts:
                chunk = DocumentChunk(
                    text=text_segment.strip(),
                    page_number=page.page_number,
                    chunk_index=global_chunk_idx,
                )
                all_chunks.append(chunk)
                global_chunk_idx += 1

        logger.debug("Chunker generated %d chunks from %d pages.", len(all_chunks), len(pages))
        return all_chunks
