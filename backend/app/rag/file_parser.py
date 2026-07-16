"""
Stage 1: File Parser
Extracts plain text and basic metadata from PDF, DOCX, TXT, MD, and EPUB files.
"""

import logging
import os
from typing import Dict, Any, List

logger = logging.getLogger("rag.file_parser")

try:
    import fitz  # PyMuPDF
    _PYMUPDF_AVAILABLE = True
except ImportError:
    _PYMUPDF_AVAILABLE = False
    logger.warning("PyMuPDF (fitz) not installed. PDF parsing will fail.")

try:
    from docx import Document as DocxDocument
    _DOCX_AVAILABLE = True
except ImportError:
    _DOCX_AVAILABLE = False


class DocumentPage:
    """Represents a text segment tied to a page (where applicable)."""
    def __init__(self, text: str, page_number: int = 1):
        self.text = text
        self.page_number = page_number


class FileParser:
    """
    Parses various document formats into structured text blocks.
    Intended to be run in a thread pool executor as parsing can be CPU bound.
    """

    @classmethod
    def parse_file(cls, file_path: str, mime_type: str) -> List[DocumentPage]:
        """Route to appropriate parser based on extension/mime type."""
        ext = os.path.splitext(file_path)[1].lower()

        if mime_type == "application/pdf" or ext == ".pdf":
            return cls._parse_pdf(file_path)
        elif "word" in mime_type or ext == ".docx":
            return cls._parse_docx(file_path)
        elif "text/plain" in mime_type or ext in (".txt", ".md", ".csv"):
            return cls._parse_txt(file_path)
        elif "epub" in mime_type or ext == ".epub":
            return cls._parse_epub(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext} (MIME: {mime_type})")

    @classmethod
    def _parse_pdf(cls, file_path: str) -> List[DocumentPage]:
        """Extract text from PDF using PyMuPDF."""
        if not _PYMUPDF_AVAILABLE:
            raise ImportError("PyMuPDF required for PDF extraction.")

        pages = []
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text").strip()
            if text:
                pages.append(DocumentPage(text=text, page_number=page_num + 1))
        doc.close()
        return pages

    @classmethod
    def _parse_docx(cls, file_path: str) -> List[DocumentPage]:
        """Extract text from DOCX. Treated as a single page."""
        if not _DOCX_AVAILABLE:
            raise ImportError("python-docx required for DOCX extraction.")

        doc = DocxDocument(file_path)
        full_text = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return [DocumentPage(text=full_text)] if full_text else []

    @classmethod
    def _parse_txt(cls, file_path: str) -> List[DocumentPage]:
        """Extract text from TXT/MD files. Treats as a single page."""
        import chardet

        with open(file_path, 'rb') as f:
            raw_data = f.read()

        encoding_info = chardet.detect(raw_data)
        encoding = encoding_info['encoding'] or 'utf-8'

        try:
            text = raw_data.decode(encoding).strip()
        except UnicodeDecodeError:
            text = raw_data.decode('utf-8', errors='ignore').strip()

        return [DocumentPage(text=text)] if text else []

    @classmethod
    def _parse_epub(cls, file_path: str) -> List[DocumentPage]:
        """Extract text from EPUB using ebooklib and BeautifulSoup."""
        try:
            import ebooklib
            from ebooklib import epub
            from bs4 import BeautifulSoup
        except ImportError:
            raise ImportError("ebooklib and bs4 required for EPUB extraction.")
            
        book = epub.read_epub(file_path)
        pages = []
        page_counter = 1
        
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_body_content(), 'html.parser')
            text = soup.get_text(separator='\n').strip()
            if text:
                pages.append(DocumentPage(text=text, page_number=page_counter))
                page_counter += 1
                
        return pages
