"""
RAG Answer Generator
Uses an LLM (flan-t5 in open-source mode) to synthesize answers grounded strictly
in retrieved knowledge context.
"""

import logging
from typing import List

from app.schemas.knowledge import SourceCitation

logger = logging.getLogger("rag.answer_generator")

_PIPELINE = None


def _load_generator():
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE
        
    try:
        from transformers import pipeline
        logger.info("Loading LLM generator (google/flan-t5-base) ...")
        # flan-t5-base is lightweight enough for CPU inference (approx 1GB memory)
        _PIPELINE = pipeline("text2text-generation", model="google/flan-t5-base", max_new_tokens=256)
        logger.info("LLM generator loaded.")
    except ImportError:
        logger.warning("transformers not installed. LLM generation disabled.")
        _PIPELINE = None
        
    return _PIPELINE


class AnswerGenerator:

    @classmethod
    def generate_answer(cls, question: str, sources: List[SourceCitation]) -> str:
        """
        Synthesize answer to question strictly using context from sources.
        """
        pipe = _load_generator()
        
        if not sources:
            return "Based on your uploaded documents, I do not have enough information to answer this question."
            
        context_parts = []
        for i, src in enumerate(sources):
            # Format context with citation numbers [1], [2], etc.
            context_parts.append(f"[{i+1}] {src.excerpt}")
            
        context_block = "\n".join(context_parts)
        
        prompt = (
            f"Use the following pieces of context to answer the question at the end. "
            f"If you don't know the answer, just say you don't know, don't try to make up an answer.\n\n"
            f"Context:\n{context_block}\n\n"
            f"Question: {question}\n\n"
            f"Answer:"
        )
        
        if pipe is None:
            # Fallback for dev environments missing ML dependencies
            logger.debug("Prompt generated: \n%s", prompt)
            return "(LLM disabled) Answer generated based on context: " + ", ".join([f"[{i+1}]" for i in range(len(sources))])
            
        try:
            result = pipe(prompt)
            answer_text = result[0]["generated_text"].strip()
            return answer_text
        except Exception as exc:
            logger.error("LLM Generation failed: %s", exc)
            return "An internal error occurred during answer generation."
