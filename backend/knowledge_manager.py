"""
Re-export shim for agent_engine.retrieval.knowledge_manager
Provides top-level import compatibility for KnowledgeManager and related classes.
"""
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeManager,
    KnowledgeRecord,
    KnowledgeIndexManager,
    MOCK_KNOWLEDGE_ENTRIES,
    MOCK_KNOWLEDGE_VERSIONS,
    MOCK_KNOWLEDGE_SYNONYMS,
    MOCK_KNOWLEDGE_DRAFTS,
    format_canonical_question_from_query,
    sanitize_support_text_pii,
)

__all__ = [
    "KnowledgeManager",
    "KnowledgeRecord",
    "KnowledgeIndexManager",
    "MOCK_KNOWLEDGE_ENTRIES",
    "MOCK_KNOWLEDGE_VERSIONS",
    "MOCK_KNOWLEDGE_SYNONYMS",
    "MOCK_KNOWLEDGE_DRAFTS",
    "format_canonical_question_from_query",
    "sanitize_support_text_pii",
]
