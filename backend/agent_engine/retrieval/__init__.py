"""
PAYENT AGENT — INFORMATION RETRIEVAL MODULE
Pure-Python TF-IDF retrieval, cosine similarity, Telugu-English vernacular normalization,
category-grouped synonyms, and ambiguity detection for equipment rental Q&A knowledge.
"""

from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    init_knowledge_tables,
    reset_knowledge_state,
)
from agent_engine.retrieval.synonym_dict import (
    SYNONYM_GROUPS,
    TENGLISH_CONCEPT_MAP,
    SynonymRegistry,
    default_synonym_registry,
)
from agent_engine.retrieval.tfidf_engine import (
    AgentKnowledgeRetriever,
    KnowledgeDocument,
    RetrievalConfig,
    RetrievalResult,
)

__all__ = [
    "AgentKnowledgeRetriever",
    "KnowledgeDocument",
    "RetrievalConfig",
    "RetrievalResult",
    "SynonymRegistry",
    "default_synonym_registry",
    "SYNONYM_GROUPS",
    "TENGLISH_CONCEPT_MAP",
    "KnowledgeManager",
    "KnowledgeIndexManager",
    "init_knowledge_tables",
    "reset_knowledge_state",
]
