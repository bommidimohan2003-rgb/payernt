"""
PAYENT AGENT — KNOWLEDGE DATABASE, VERSIONING & INDEX MANAGER
Manages the structured knowledge repository for the unified Payent Agent.
Handles additive schemas, entry lifecycle, versioning, verification safety,
and atomic in-memory retrieval index lifecycle using the Phase 8.2 retrieval engine.
"""

import copy
import hashlib
import json
import logging
import math
import re
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from agent_engine.privacy import mask_sensitive_text
from agent_engine.retrieval.synonym_dict import SynonymRegistry, default_synonym_registry
from agent_engine.retrieval.tfidf_engine import (
    AgentKnowledgeRetriever,
    KnowledgeDocument,
    RetrievalConfig,
)
from config import IS_PRODUCTION
from database import DatabaseConnectionError, execute_query, fetch_all, fetch_one, get_db_connection

logger = logging.getLogger("payent.agent.knowledge")

# In-memory stores for fallback, offline execution, and isolated test suites
MOCK_KNOWLEDGE_ENTRIES: Dict[str, Dict[str, Any]] = {}
MOCK_KNOWLEDGE_SYNONYMS: Dict[str, List[Dict[str, Any]]] = {}
MOCK_KNOWLEDGE_VERSIONS: Dict[str, List[Dict[str, Any]]] = {}
MOCK_KNOWLEDGE_DRAFTS: Dict[str, Dict[str, Any]] = {}

_knowledge_tables_initialized = False
_db_lock = threading.RLock()


def is_db_connected() -> bool:
    """Checks whether the persistent database connection is active."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return False
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:
        return False
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def reset_knowledge_state() -> None:
    """Clears in-memory mock stores and reset flags for test isolation."""
    global _knowledge_tables_initialized
    with _db_lock:
        _knowledge_tables_initialized = False
        MOCK_KNOWLEDGE_ENTRIES.clear()
        MOCK_KNOWLEDGE_SYNONYMS.clear()
        MOCK_KNOWLEDGE_VERSIONS.clear()
        MOCK_KNOWLEDGE_DRAFTS.clear()
    KnowledgeManager.reset()
    KnowledgeIndexManager.reset()


def init_knowledge_tables() -> None:
    """
    Idempotent additive table and index initialization for knowledge management.
    Creates:
    - agent_knowledge_entries
    - agent_knowledge_synonyms
    - agent_knowledge_versions
    - agent_knowledge_drafts
    """
    global _knowledge_tables_initialized
    with _db_lock:
        if _knowledge_tables_initialized:
            return

        conn = None
        try:
            conn = get_db_connection()
        except Exception as e:
            logger.warning(f"Notice connecting to database for knowledge tables: {e}")
            if IS_PRODUCTION:
                raise RuntimeError("Database unavailable for knowledge table initialization") from e

        if not conn:
            logger.debug("Operating knowledge repository in fallback in-memory mode.")
            _knowledge_tables_initialized = True
            return

        try:
            # 1. Main Knowledge Entries Table
            execute_query("""
                CREATE TABLE IF NOT EXISTS agent_knowledge_entries (
                    id VARCHAR(255) PRIMARY KEY,
                    category VARCHAR(100) NOT NULL,
                    canonical_question TEXT NOT NULL,
                    answer_markdown TEXT NOT NULL,
                    retrieval_type VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
                    is_verified BOOLEAN DEFAULT FALSE,
                    verification_notes TEXT NULL,
                    version INT DEFAULT 1,
                    source_document VARCHAR(255) NULL,
                    created_at VARCHAR(100) NOT NULL,
                    updated_at VARCHAR(100) NOT NULL,
                    published_at VARCHAR(100) NULL,
                    approved_by VARCHAR(255) NULL
                )
            """)

            # 2. Knowledge Synonyms Table
            execute_query("""
                CREATE TABLE IF NOT EXISTS agent_knowledge_synonyms (
                    id VARCHAR(255) PRIMARY KEY,
                    knowledge_id VARCHAR(255) NOT NULL,
                    phrase TEXT NOT NULL,
                    language VARCHAR(50) DEFAULT 'en',
                    created_at VARCHAR(100) NOT NULL
                )
            """)

            # 3. Knowledge Versions Table
            execute_query("""
                CREATE TABLE IF NOT EXISTS agent_knowledge_versions (
                    id VARCHAR(255) PRIMARY KEY,
                    knowledge_id VARCHAR(255) NOT NULL,
                    version_number INT NOT NULL,
                    canonical_question TEXT NOT NULL,
                    answer_markdown TEXT NOT NULL,
                    changed_by VARCHAR(255) NULL,
                    change_summary TEXT NULL,
                    created_at VARCHAR(100) NOT NULL
                )
            """)

            # 4. Knowledge Drafts (from support resolutions) Table
            execute_query("""
                CREATE TABLE IF NOT EXISTS agent_knowledge_drafts (
                    id VARCHAR(255) PRIMARY KEY,
                    source_ticket_id VARCHAR(255) NULL,
                    category VARCHAR(100) NOT NULL,
                    customer_query TEXT NOT NULL,
                    resolution_text TEXT NOT NULL,
                    suggested_question TEXT NOT NULL,
                    suggested_answer TEXT NOT NULL,
                    similarity_score FLOAT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'draft',
                    reviewed_by VARCHAR(255) NULL,
                    created_at VARCHAR(100) NOT NULL,
                    updated_at VARCHAR(100) NOT NULL
                )
            """)

            # Add indices safely
            indices = [
                ("agent_knowledge_entries", "idx_ake_category", "category"),
                ("agent_knowledge_entries", "idx_ake_status", "status"),
                ("agent_knowledge_entries", "idx_ake_verified", "is_verified"),
                ("agent_knowledge_synonyms", "idx_aks_knowledge_id", "knowledge_id"),
                ("agent_knowledge_versions", "idx_akv_knowledge_id", "knowledge_id, version_number"),
                ("agent_knowledge_drafts", "idx_akd_status", "status"),
                ("agent_knowledge_drafts", "idx_akd_ticket", "source_ticket_id"),
            ]
            for table, idx_name, cols in indices:
                try:
                    with conn.cursor() as cur:
                        cur.execute(f"CREATE INDEX {idx_name} ON {table} ({cols})")
                    conn.commit()
                except Exception:
                    pass

            _knowledge_tables_initialized = True
            logger.info("Agent knowledge tables and indices initialized successfully.")
        except Exception as err:
            logger.warning(f"Notice initializing agent knowledge tables: {err}")
            if IS_PRODUCTION:
                raise
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass


class KnowledgeRecord(dict):
    """Dictionary subclass supporting dot notation access for convenience and test compatibility."""
    def __getattr__(self, name: str) -> Any:
        if name in self:
            return self[name]
        raise AttributeError(f"'KnowledgeRecord' object has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value

    def to_dict(self) -> Dict[str, Any]:
        return dict(self)


class KnowledgeManager:
    """
    Manages structured knowledge entries, revisions, synonyms, and drafts.
    Guarantees that unapproved, unverified, and draft knowledge cannot leak to customers.
    """
    _instance: Optional["KnowledgeManager"] = None

    @classmethod
    def get_instance(cls, use_in_memory: Optional[bool] = None) -> "KnowledgeManager":
        if cls._instance is None:
            cls._instance = cls(use_in_memory=use_in_memory)
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        cls._instance = None

    def __init__(self, use_in_memory: Optional[bool] = None):
        """
        If use_in_memory is True, strictly uses in-memory dictionaries (useful for unit tests).
        If use_in_memory is None and IS_PRODUCTION, strictly uses database (mock fallback forbidden in production).
        If use_in_memory is None and not IS_PRODUCTION, uses database if available, falling back to in-memory.
        """
        if use_in_memory is not None:
            self.use_in_memory = use_in_memory
        elif IS_PRODUCTION:
            self.use_in_memory = False
        else:
            self.use_in_memory = not is_db_connected()

        if not self.use_in_memory:
            init_knowledge_tables()

    def create_entry(
        self,
        category: str,
        canonical_question: str,
        answer_markdown: str,
        retrieval_type: str = "guide",
        status: str = "pending_review",
        is_verified: bool = False,
        verification_notes: Optional[str] = None,
        source_document: Optional[str] = None,
        synonyms: Optional[List[str]] = None,
        approved_by: Optional[str] = None,
        custom_id: Optional[str] = None,
        created_by: Optional[str] = None,
        **kwargs,
    ) -> KnowledgeRecord:
        """
        Creates a new knowledge entry, initial version record, and associated synonyms.
        """
        entry_id = custom_id or f"KB-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        if not approved_by and created_by:
            approved_by = created_by

        # Validation safety: check valid retrieval_type and status
        valid_retrieval_types = {"guide", "hybrid", "live_db"}
        valid_statuses = {"draft", "pending_review", "published", "archived", "rejected"}

        raw_retrieval = (retrieval_type or "guide").strip()
        if raw_retrieval.lower() in valid_retrieval_types:
            clean_retrieval = raw_retrieval
        else:
            clean_retrieval = "guide"

        clean_status = status.lower().strip()
        if clean_status not in valid_statuses:
            clean_status = "pending_review"

        # Verification safety: entries containing [VERIFY must not be marked verified
        has_verify_marker = "[VERIFY" in answer_markdown.upper()
        if has_verify_marker:
            is_verified = False
            if clean_status == "published":
                clean_status = "pending_review"

        published_at = now_iso if clean_status == "published" and is_verified else None
        published_by = approved_by if clean_status == "published" and is_verified else None
        verified_by = approved_by if is_verified else None
        verified_at = now_iso if is_verified else None

        entry_record = {
            "id": entry_id,
            "category": category.strip(),
            "canonical_question": canonical_question.strip(),
            "answer_markdown": answer_markdown.strip(),
            "retrieval_type": clean_retrieval,
            "status": clean_status,
            "is_verified": bool(is_verified),
            "verified_by": verified_by,
            "verified_at": verified_at,
            "verification_notes": verification_notes.strip() if verification_notes else None,
            "version": 1,
            "source_document": source_document,
            "created_at": now_iso,
            "updated_at": now_iso,
            "published_at": published_at,
            "published_by": published_by,
            "approved_by": approved_by,
        }

        # Handle persistence
        if self.use_in_memory:
            with _db_lock:
                MOCK_KNOWLEDGE_ENTRIES[entry_id] = copy.deepcopy(entry_record)
                MOCK_KNOWLEDGE_VERSIONS[entry_id] = [
                    {
                        "id": f"VER-{uuid.uuid4().hex[:8]}",
                        "knowledge_id": entry_id,
                        "version": 1,
                        "version_number": 1,
                        "canonical_question": entry_record["canonical_question"],
                        "answer_markdown": entry_record["answer_markdown"],
                        "changed_by": approved_by or "system",
                        "change_summary": "Initial ingestion",
                        "created_at": now_iso,
                    }
                ]
                if synonyms:
                    syn_list = []
                    for s in synonyms:
                        s_clean = s.strip()
                        if s_clean:
                            syn_list.append({
                                "id": f"SYN-{uuid.uuid4().hex[:8]}",
                                "knowledge_id": entry_id,
                                "phrase": s_clean,
                                "language": "te" if any(c in s_clean.lower() for c in ["enti", "ela", "ekkada", "kavali", "naa", "dabbulu"]) else "en",
                                "created_at": now_iso,
                            })
                    MOCK_KNOWLEDGE_SYNONYMS[entry_id] = syn_list
            return KnowledgeRecord(entry_record)

        # Database transaction
        conn = get_db_connection()
        if not conn:
            raise RuntimeError("Database connection unavailable for create_entry")
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO agent_knowledge_entries (
                        id, category, canonical_question, answer_markdown, retrieval_type,
                        status, is_verified, verification_notes, version, source_document,
                        created_at, updated_at, published_at, approved_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entry_record["id"],
                        entry_record["category"],
                        entry_record["canonical_question"],
                        entry_record["answer_markdown"],
                        entry_record["retrieval_type"],
                        entry_record["status"],
                        entry_record["is_verified"],
                        entry_record["verification_notes"],
                        entry_record["version"],
                        entry_record["source_document"],
                        entry_record["created_at"],
                        entry_record["updated_at"],
                        entry_record["published_at"],
                        entry_record["approved_by"],
                    ),
                )

                # Version 1 record
                cursor.execute(
                    """
                    INSERT INTO agent_knowledge_versions (
                        id, knowledge_id, version_number, canonical_question, answer_markdown,
                        changed_by, change_summary, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        f"VER-{uuid.uuid4().hex[:8]}",
                        entry_id,
                        1,
                        entry_record["canonical_question"],
                        entry_record["answer_markdown"],
                        approved_by or "system",
                        "Initial ingestion",
                        now_iso,
                    ),
                )

                # Synonyms
                if synonyms:
                    for s in synonyms:
                        s_clean = s.strip()
                        if s_clean:
                            cursor.execute(
                                """
                                INSERT INTO agent_knowledge_synonyms (
                                    id, knowledge_id, phrase, language, created_at
                                ) VALUES (%s, %s, %s, %s, %s)
                                """,
                                (
                                    f"SYN-{uuid.uuid4().hex[:8]}",
                                    entry_id,
                                    s_clean,
                                    "te" if any(c in s_clean.lower() for c in ["enti", "ela", "ekkada", "kavali", "naa", "dabbulu"]) else "en",
                                    now_iso,
                                ),
                            )
            conn.commit()
            return KnowledgeRecord(entry_record)
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def update_entry(
        self,
        knowledge_id: str,
        canonical_question: Optional[str] = None,
        answer_markdown: Optional[str] = None,
        category: Optional[str] = None,
        retrieval_type: Optional[str] = None,
        status: Optional[str] = None,
        is_verified: Optional[bool] = None,
        verification_notes: Optional[str] = None,
        changed_by: Optional[str] = None,
        change_summary: Optional[str] = None,
        new_synonyms: Optional[List[str]] = None,
        change_reason: Optional[str] = None,
        **kwargs,
    ) -> Optional[KnowledgeRecord]:
        """
        Updates an existing entry, bumps version, records version history.
        """
        current = self.get_entry(knowledge_id)
        if not current:
            return None

        if not change_summary and change_reason:
            change_summary = change_reason

        now_iso = datetime.now(timezone.utc).isoformat()
        new_version = current["version"] + 1

        up_question = canonical_question.strip() if canonical_question is not None else current["canonical_question"]
        up_answer = answer_markdown.strip() if answer_markdown is not None else current["answer_markdown"]
        up_category = category.strip() if category is not None else current["category"]
        up_retrieval = retrieval_type.strip() if retrieval_type is not None else current["retrieval_type"]
        up_status = status.strip().lower() if status is not None else current["status"]
        up_verified = is_verified if is_verified is not None else current["is_verified"]
        up_notes = verification_notes if verification_notes is not None else current["verification_notes"]

        if "[VERIFY" in up_answer.upper():
            up_verified = False
            if up_status == "published":
                up_status = "pending_review"

        published_at = now_iso if up_status == "published" and up_verified else current.get("published_at")
        published_by = changed_by if up_status == "published" and up_verified else current.get("published_by")
        approved_by = changed_by if up_status == "published" and up_verified else current.get("approved_by")

        if up_verified:
            verified_by = changed_by or current.get("verified_by") or "admin"
            verified_at = now_iso if not current.get("is_verified") else current.get("verified_at", now_iso)
        else:
            verified_by = None
            verified_at = None

        updated_record = {
            "id": knowledge_id,
            "category": up_category,
            "canonical_question": up_question,
            "answer_markdown": up_answer,
            "retrieval_type": up_retrieval,
            "status": up_status,
            "is_verified": bool(up_verified),
            "verified_by": verified_by,
            "verified_at": verified_at,
            "verification_notes": up_notes,
            "version": new_version,
            "source_document": current.get("source_document"),
            "created_at": current["created_at"],
            "updated_at": now_iso,
            "published_at": published_at,
            "published_by": published_by,
            "approved_by": approved_by,
        }

        if self.use_in_memory:
            with _db_lock:
                MOCK_KNOWLEDGE_ENTRIES[knowledge_id] = copy.deepcopy(updated_record)
                MOCK_KNOWLEDGE_VERSIONS.setdefault(knowledge_id, []).append({
                    "id": f"VER-{uuid.uuid4().hex[:8]}",
                    "knowledge_id": knowledge_id,
                    "version": new_version,
                    "version_number": new_version,
                    "canonical_question": up_question,
                    "answer_markdown": up_answer,
                    "changed_by": changed_by or "system",
                    "change_summary": change_summary or f"Updated to version {new_version}",
                    "created_at": now_iso,
                })
                if new_synonyms is not None:
                    syn_list = []
                    for s in new_synonyms:
                        s_clean = s.strip()
                        if s_clean:
                            syn_list.append({
                                "id": f"SYN-{uuid.uuid4().hex[:8]}",
                                "knowledge_id": knowledge_id,
                                "phrase": s_clean,
                                "language": "en",
                                "created_at": now_iso,
                            })
                    MOCK_KNOWLEDGE_SYNONYMS[knowledge_id] = syn_list
            return KnowledgeRecord(updated_record)

        conn = get_db_connection()
        if not conn:
            raise RuntimeError("Database connection unavailable for update_entry")
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE agent_knowledge_entries SET
                        category = %s, canonical_question = %s, answer_markdown = %s,
                        retrieval_type = %s, status = %s, is_verified = %s,
                        verification_notes = %s, version = %s, updated_at = %s,
                        published_at = %s, approved_by = %s
                    WHERE id = %s
                    """,
                    (
                        up_category, up_question, up_answer, up_retrieval,
                        up_status, up_verified, up_notes, new_version, now_iso,
                        published_at, approved_by, knowledge_id,
                    ),
                )
                cursor.execute(
                    """
                    INSERT INTO agent_knowledge_versions (
                        id, knowledge_id, version_number, canonical_question, answer_markdown,
                        changed_by, change_summary, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        f"VER-{uuid.uuid4().hex[:8]}",
                        knowledge_id,
                        new_version,
                        up_question,
                        up_answer,
                        changed_by or "system",
                        change_summary or f"Updated to version {new_version}",
                        now_iso,
                    ),
                )
                if new_synonyms is not None:
                    cursor.execute("DELETE FROM agent_knowledge_synonyms WHERE knowledge_id = %s", (knowledge_id,))
                    for s in new_synonyms:
                        s_clean = s.strip()
                        if s_clean:
                            cursor.execute(
                                """
                                INSERT INTO agent_knowledge_synonyms (
                                    id, knowledge_id, phrase, language, created_at
                                ) VALUES (%s, %s, %s, %s, %s)
                                """,
                                (f"SYN-{uuid.uuid4().hex[:8]}", knowledge_id, s_clean, "en", now_iso),
                            )
            conn.commit()
            return KnowledgeRecord(updated_record)
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def publish_entry(
        self,
        knowledge_id: str,
        approved_by: str,
        is_admin: bool = True,
        require_verified: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Publishes and marks an entry verified.
        Requires admin authorization.
        Rejects publication if answer still contains [VERIFY.
        If require_verified=True, rejects unverified entries.
        """
        if not is_admin:
            raise PermissionError("Administrative authorization required to publish knowledge entries.")

        entry = self.get_entry(knowledge_id)
        if not entry:
            return None

        if require_verified and not entry.get("is_verified"):
            raise ValueError(f"Cannot publish unverified knowledge entry {knowledge_id}. Entry must be verified before publication. Content verification is required.")

        if "[VERIFY" in entry["answer_markdown"].upper():
            raise ValueError(f"Cannot publish entry {knowledge_id} while it contains unresolved [VERIFY marker.")

        res = self.update_entry(
            knowledge_id=knowledge_id,
            status="published",
            is_verified=True,
            changed_by=approved_by,
            change_summary="Published and approved by authorized administrator",
        )
        try:
            KnowledgeIndexManager.get_instance().refresh_index()
        except Exception as e:
            logger.warning(f"Notice refreshing index on publish: {e}")
        return res

    def unpublish_entry(self, knowledge_id: str, reason: str = "Unpublished by admin") -> Optional[Dict[str, Any]]:
        """Reverts a published entry to pending_review and refreshes the retrieval index."""
        res = self.update_entry(
            knowledge_id=knowledge_id,
            status="pending_review",
            is_verified=False,
            change_summary=reason,
        )
        try:
            KnowledgeIndexManager.get_instance().refresh_index()
        except Exception as e:
            logger.warning(f"Notice refreshing index on unpublish: {e}")
        return res

    def get_entry(self, knowledge_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single knowledge entry with its synonyms and version history."""
        if self.use_in_memory:
            with _db_lock:
                entry = MOCK_KNOWLEDGE_ENTRIES.get(knowledge_id)
                if not entry:
                    return None
                result = copy.deepcopy(entry)
                syns = [s["phrase"] for s in MOCK_KNOWLEDGE_SYNONYMS.get(knowledge_id, [])]
                result["synonyms"] = syns
                return KnowledgeRecord(result)

        row = fetch_one("SELECT * FROM agent_knowledge_entries WHERE id = %s", (knowledge_id,))
        if not row:
            return None
        syn_rows = fetch_all("SELECT phrase FROM agent_knowledge_synonyms WHERE knowledge_id = %s", (knowledge_id,))
        row["synonyms"] = [r["phrase"] for r in (syn_rows or [])]
        row["is_verified"] = bool(row.get("is_verified", False))
        return KnowledgeRecord(row)

    def list_entries(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """Lists entries with optional filtering."""
        if self.use_in_memory:
            with _db_lock:
                results = []
                for entry in MOCK_KNOWLEDGE_ENTRIES.values():
                    if category and entry["category"].lower() != category.lower():
                        continue
                    if status and entry["status"].lower() != status.lower():
                        continue
                    if is_verified is not None and bool(entry["is_verified"]) != is_verified:
                        continue
                    item = copy.deepcopy(entry)
                    item["synonyms"] = [s["phrase"] for s in MOCK_KNOWLEDGE_SYNONYMS.get(entry["id"], [])]
                    results.append(item)
                return results

        query = "SELECT * FROM agent_knowledge_entries WHERE 1=1"
        params: List[Any] = []
        if category:
            query += " AND LOWER(category) = LOWER(%s)"
            params.append(category)
        if status:
            query += " AND LOWER(status) = LOWER(%s)"
            params.append(status)
        if is_verified is not None:
            query += " AND is_verified = %s"
            params.append(1 if is_verified else 0)

        rows = fetch_all(query, tuple(params)) or []
        for r in rows:
            r["is_verified"] = bool(r.get("is_verified", False))
            syn_rows = fetch_all("SELECT phrase FROM agent_knowledge_synonyms WHERE knowledge_id = %s", (r["id"],))
            r["synonyms"] = [sr["phrase"] for sr in (syn_rows or [])]
        return rows

    def list_knowledge_entries(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """Alias for list_entries."""
        return self.list_entries(category=category, status=status, is_verified=is_verified)

    def get_version_history(self, knowledge_id: str) -> List[Dict[str, Any]]:
        """Retrieves full version audit history for a knowledge entry."""
        if self.use_in_memory:
            with _db_lock:
                raw = copy.deepcopy(MOCK_KNOWLEDGE_VERSIONS.get(knowledge_id, []))
                return [KnowledgeRecord(v) for v in raw]
        rows = fetch_all(
            "SELECT * FROM agent_knowledge_versions WHERE knowledge_id = %s ORDER BY version_number ASC",
            (knowledge_id,),
        )
        out = []
        for r in (rows or []):
            if "version" not in r and "version_number" in r:
                r["version"] = r["version_number"]
            out.append(KnowledgeRecord(r))
        return out

    def get_versions(self, knowledge_id: str) -> List[Dict[str, Any]]:
        return self.get_version_history(knowledge_id)

    def add_synonym(self, knowledge_id: str, synonym: str, added_by: Optional[str] = None) -> bool:
        """Adds a synonym phrasing variant for an existing knowledge entry."""
        syn_clean = synonym.strip()
        if not syn_clean:
            return False
        now_iso = datetime.now(timezone.utc).isoformat()
        if self.use_in_memory:
            with _db_lock:
                entry = MOCK_KNOWLEDGE_ENTRIES.get(knowledge_id)
                if not entry:
                    return False
                syn_list = entry.setdefault("synonyms", [])
                if syn_clean not in syn_list:
                    syn_list.append(syn_clean)
                MOCK_KNOWLEDGE_SYNONYMS.setdefault(knowledge_id, []).append({
                    "id": f"SYN-{uuid.uuid4().hex[:8]}",
                    "knowledge_id": knowledge_id,
                    "phrase": syn_clean,
                    "synonym": syn_clean,
                    "language": "te" if any(c in syn_clean.lower() for c in ["enti", "ela", "ekkada", "kavali", "naa", "dabbulu"]) else "en",
                    "created_at": now_iso,
                })
            return True
        else:
            execute_query(
                "INSERT INTO agent_knowledge_synonyms (id, knowledge_id, phrase, created_at) VALUES (%s, %s, %s, %s)",
                (f"SYN-{uuid.uuid4().hex[:8]}", knowledge_id, syn_clean, now_iso),
            )
            return True

    def create_knowledge_entry(
        self,
        question: str,
        answer: str,
        category: str = "General",
        author: Optional[str] = None,
        is_verified: bool = False,
        status: str = "pending_review",
        retrieval_type: str = "guide",
        synonyms: Optional[List[str]] = None,
        verification_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Convenience method for creating a knowledge entry with simplified parameters."""
        return self.create_entry(
            category=category,
            canonical_question=question,
            answer_markdown=answer,
            retrieval_type=retrieval_type,
            status=status,
            is_verified=is_verified,
            verification_notes=verification_notes,
            synonyms=synonyms,
            approved_by=author,
        )

    def publish_knowledge_entry(
        self,
        knowledge_id: str,
        published_by: str,
        is_admin: bool = True,
    ) -> Dict[str, Any]:
        """Publishes a knowledge entry, returning structured status result."""
        if not is_admin:
            return {"success": False, "error": "Administrative authorization required to publish knowledge entries."}
        try:
            res = self.publish_entry(knowledge_id=knowledge_id, approved_by=published_by, is_admin=is_admin)
            if res:
                return {"success": True, "entry": res}
            return {"success": False, "error": f"Knowledge entry {knowledge_id} not found."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def unpublish_knowledge_entry(
        self,
        knowledge_id: str,
        unpublished_by: Optional[str] = None,
        is_admin: bool = True,
        reason: str = "Unpublished by admin",
    ) -> Dict[str, Any]:
        """Reverts a knowledge entry to unverified pending review."""
        if not is_admin:
            return {"success": False, "error": "Administrative authorization required to unpublish knowledge entries."}
        try:
            res = self.unpublish_entry(knowledge_id=knowledge_id, reason=reason)
            return {"success": True, "entry": res}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_knowledge_entry(
        self,
        knowledge_id: str,
        question: Optional[str] = None,
        answer: Optional[str] = None,
        category: Optional[str] = None,
        updated_by: Optional[str] = None,
        change_reason: Optional[str] = None,
        status: Optional[str] = None,
        is_verified: Optional[bool] = None,
        new_synonyms: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Convenience method for updating a knowledge entry."""
        return self.update_entry(
            knowledge_id=knowledge_id,
            canonical_question=question,
            answer_markdown=answer,
            category=category,
            status=status,
            is_verified=is_verified,
            changed_by=updated_by,
            change_summary=change_reason,
            new_synonyms=new_synonyms,
        )

    def get_active_knowledge_documents(self, category_filter: Optional[str] = None) -> List[KnowledgeDocument]:
        """
        Retrieves ONLY published and verified entries, converting them into Phase 8.2 KnowledgeDocument objects.
        Explicitly excludes draft, pending_review, rejected, archived, or unverified entries.
        """
        if not self.use_in_memory and IS_PRODUCTION and not is_db_connected():
            raise DatabaseConnectionError("Database connection unavailable for active knowledge retrieval in production")

        raw_entries = self.list_knowledge_entries(
            category=category_filter,
            status="published",
            is_verified=True,
        )

        documents: List[KnowledgeDocument] = []
        for e in raw_entries:
            # Redundant safety guard: double-check status and verification
            if e["status"].lower() != "published" or not e["is_verified"]:
                continue
            if "[VERIFY" in e["answer_markdown"].upper():
                continue

            doc = KnowledgeDocument(
                id=e["id"],
                question=e["canonical_question"],
                answer=e["answer_markdown"],
                category=e["category"],
                synonyms=e.get("synonyms", []),
                retrieval_type=e["retrieval_type"],
                is_verified=True,
                metadata={"status": "published", "version": e.get("version", 1)},
            )
            documents.append(doc)
        return documents

    def create_draft(
        self,
        category: str,
        customer_query: str,
        resolution_text: str,
        suggested_question: str,
        suggested_answer: str,
        source_ticket_id: Optional[str] = None,
        similarity_score: Optional[float] = None,
        status: str = "draft",
    ) -> Dict[str, Any]:
        """Creates a knowledge draft from a support ticket resolution for admin review."""
        draft_id = f"DRAFT-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        draft_record = {
            "id": draft_id,
            "source_ticket_id": source_ticket_id,
            "category": category.strip(),
            "customer_query": customer_query.strip(),
            "resolution_text": resolution_text.strip(),
            "suggested_question": suggested_question.strip(),
            "suggested_answer": suggested_answer.strip(),
            "similarity_score": similarity_score,
            "status": status,
            "reviewed_by": None,
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        if self.use_in_memory:
            with _db_lock:
                MOCK_KNOWLEDGE_DRAFTS[draft_id] = copy.deepcopy(draft_record)
            return KnowledgeRecord(draft_record)

        execute_query(
            """
            INSERT INTO agent_knowledge_drafts (
                id, source_ticket_id, category, customer_query, resolution_text,
                suggested_question, suggested_answer, similarity_score, status,
                reviewed_by, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                draft_id, source_ticket_id, category.strip(), customer_query.strip(),
                resolution_text.strip(), suggested_question.strip(), suggested_answer.strip(),
                similarity_score, "pending_review", None, now_iso, now_iso,
            ),
        )
        return KnowledgeRecord(draft_record)

    def create_draft_suggestion(
        self,
        customer_query: str,
        suggested_answer: str,
        category: str = "GENERAL",
        suggested_question: Optional[str] = None,
        source_ticket_id: Optional[str] = None,
        similarity_score: Optional[float] = None,
        duplicate_of_id: Optional[str] = None,
        **kwargs,
    ) -> KnowledgeRecord:
        """Convenience method for creating a draft suggestion with duplicate matching."""
        if similarity_score is None or duplicate_of_id is None:
            # 1. Try retriever if indexed
            try:
                im = KnowledgeIndexManager.get_instance()
                retriever = im.get_retriever()
                dup = retriever.check_duplicate(suggested_question or customer_query, threshold=0.5)
                if dup:
                    score = getattr(dup, "score", 0.0)
                    doc_id = getattr(dup, "id", None)
                    if not score and isinstance(dup, tuple) and len(dup) >= 2:
                        score = dup[1] if isinstance(dup[1], (int, float)) else (dup[2] if len(dup) >= 3 and isinstance(dup[2], (int, float)) else 0.0)
                        doc_id = dup[0]["id"] if isinstance(dup[0], dict) else getattr(dup[0], "id", None)
                    similarity_score = round(float(score), 4)
                    duplicate_of_id = doc_id
            except Exception:
                pass

            # 2. Also check across all entries (even unindexed/pending) using token overlap
            if not duplicate_of_id:
                try:
                    from agent_engine.preprocessor import TextPreprocessor
                    prep = TextPreprocessor()
                    q_clean = prep.preprocess(suggested_question or customer_query).normalized_text
                    q_tokens = set(q_clean.split())
                    best_score = 0.0
                    best_id = None
                    candidates = list(MOCK_KNOWLEDGE_ENTRIES.values()) if self.use_in_memory else (
                        fetch_all("SELECT id, canonical_question FROM agent_knowledge_entries") or []
                    )
                    for cand in candidates:
                        c_text = prep.preprocess(cand.get("canonical_question", "")).normalized_text
                        c_tokens = set(c_text.split())
                        if q_tokens and c_tokens:
                            inter = len(q_tokens & c_tokens)
                            union = len(q_tokens | c_tokens)
                            score = inter / union if union else 0.0
                            if score > best_score:
                                best_score = score
                                best_id = cand["id"]
                    if best_score >= 0.5:
                        similarity_score = round(best_score, 4)
                        duplicate_of_id = best_id
                except Exception:
                    pass

        draft = self.create_draft(
            category=category,
            customer_query=customer_query,
            resolution_text=suggested_answer,
            suggested_question=suggested_question or customer_query,
            suggested_answer=suggested_answer,
            source_ticket_id=source_ticket_id,
            similarity_score=similarity_score,
            status="pending_review",
        )
        if duplicate_of_id:
            draft["duplicate_of_id"] = duplicate_of_id
            if self.use_in_memory:
                MOCK_KNOWLEDGE_DRAFTS[draft["id"]]["duplicate_of_id"] = duplicate_of_id
        return KnowledgeRecord(draft)

    def get_stats(self) -> Dict[str, Any]:
        """Provides consolidated statistics for the admin knowledge dashboard."""
        if not self.use_in_memory and IS_PRODUCTION and not is_db_connected():
            raise DatabaseConnectionError("Database connection unavailable for knowledge stats in production")

        if self.use_in_memory:
            with _db_lock:
                total = len(MOCK_KNOWLEDGE_ENTRIES)
                published = sum(1 for e in MOCK_KNOWLEDGE_ENTRIES.values() if str(e.get("status", "")).lower() == "published")
                pending_review = sum(1 for e in MOCK_KNOWLEDGE_ENTRIES.values() if str(e.get("status", "")).lower() == "pending_review")
                archived = sum(1 for e in MOCK_KNOWLEDGE_ENTRIES.values() if str(e.get("status", "")).lower() in ("archived", "rejected"))
                draft_suggestions = len(MOCK_KNOWLEDGE_DRAFTS)
                verified = sum(1 for e in MOCK_KNOWLEDGE_ENTRIES.values() if e.get("is_verified"))
                needs_verification = sum(
                    1 for e in MOCK_KNOWLEDGE_ENTRIES.values()
                    if "[VERIFY" in str(e.get("answer_markdown", "")).upper() or not e.get("is_verified")
                )
        else:
            row_total = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_entries") or {}
            row_pub = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_entries WHERE LOWER(status) = 'published'") or {}
            row_pend = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_entries WHERE LOWER(status) = 'pending_review'") or {}
            row_arch = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_entries WHERE LOWER(status) IN ('archived', 'rejected')") or {}
            row_draft = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_drafts") or {}
            row_ver = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_entries WHERE is_verified = 1") or {}
            row_verify_marker = fetch_one("SELECT COUNT(*) as cnt FROM agent_knowledge_entries WHERE is_verified = 0 OR answer_markdown LIKE '%[VERIFY%'") or {}

            total = row_total.get("cnt", 0)
            published = row_pub.get("cnt", 0)
            pending_review = row_pend.get("cnt", 0)
            archived = row_arch.get("cnt", 0)
            draft_suggestions = row_draft.get("cnt", 0)
            verified = row_ver.get("cnt", 0)
            needs_verification = row_verify_marker.get("cnt", 0)

        im = KnowledgeIndexManager.get_instance()
        meta = im.get_metadata()

        status_str = "healthy" if meta.get("is_indexed") else ("empty" if meta.get("document_count", 0) == 0 else "degraded")
        return {
            "total": total,
            "total_entries": total,
            "published": published,
            "published_entries": published,
            "pending_review": pending_review,
            "pending_review_entries": pending_review,
            "draft_suggestions": draft_suggestions,
            "unpublished": archived,
            "unpublished_entries": archived,
            "verified": verified,
            "verified_entries": verified,
            "needs_verification": needs_verification,
            "index_status": {
                "status": status_str,
                "total_indexed": meta.get("document_count", 0),
                "document_count": meta.get("document_count", 0),
                "last_refresh": meta.get("last_refresh_timestamp"),
                "last_refresh_timestamp": meta.get("last_refresh_timestamp"),
                "is_indexed": meta.get("is_indexed", False),
                "vocabulary_size": meta.get("vocabulary_size", 0),
                "last_error": meta.get("last_error"),
            },
        }

    def list_entries_paginated(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        is_verified: Optional[bool] = None,
        retrieval_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "updated_at",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        """Lists entries with keyword search, multi-field filtering, and backend pagination."""
        if not self.use_in_memory and IS_PRODUCTION and not is_db_connected():
            raise DatabaseConnectionError("Database connection unavailable for knowledge search in production")

        safe_page = max(1, page)
        safe_size = max(1, min(page_size, 100))
        offset = (safe_page - 1) * safe_size

        if self.use_in_memory:
            with _db_lock:
                filtered = []
                search_term = (search or "").strip().lower()
                for entry in MOCK_KNOWLEDGE_ENTRIES.values():
                    # Category filter
                    if category and entry.get("category", "").lower() != category.lower():
                        continue
                    # Status filter
                    if status and entry.get("status", "").lower() != status.lower():
                        continue
                    # Verification filter
                    if is_verified is not None and bool(entry.get("is_verified")) != is_verified:
                        continue
                    # Retrieval type filter
                    if retrieval_type and entry.get("retrieval_type", "").lower() != retrieval_type.lower():
                        continue
                    # Keyword search filter
                    if search_term:
                        q_text = entry.get("canonical_question", "").lower()
                        a_text = entry.get("answer_markdown", "").lower()
                        c_text = entry.get("category", "").lower()
                        syns = [s.get("phrase", "").lower() for s in MOCK_KNOWLEDGE_SYNONYMS.get(entry["id"], []) if s.get("phrase")]
                        all_text = f"{q_text} {a_text} {c_text} {' '.join(syns)}"

                        exact_match = (search_term in q_text) or (search_term in a_text) or (search_term in c_text) or any(search_term in syn for syn in syns)
                        words = [w for w in search_term.split() if w]
                        words_match = all(w in all_text for w in words) if words else False

                        if not (exact_match or words_match):
                            continue

                    item = copy.deepcopy(entry)
                    item["synonyms"] = [s.get("phrase") for s in MOCK_KNOWLEDGE_SYNONYMS.get(entry["id"], []) if s.get("phrase")]
                    filtered.append(item)

                # Sort
                reverse_sort = sort_order.lower() == "desc"
                sort_key = sort_by if sort_by in ("canonical_question", "category", "created_at", "updated_at", "version") else "updated_at"
                filtered.sort(key=lambda x: str(x.get(sort_key) or ""), reverse=reverse_sort)

                total = len(filtered)
                total_pages = max(1, math.ceil(total / safe_size))
                items = filtered[offset : offset + safe_size]
                return {
                    "items": items,
                    "total": total,
                    "page": safe_page,
                    "page_size": safe_size,
                    "per_page": safe_size,
                    "total_pages": total_pages,
                }

        # SQL Database pagination & search
        where_clauses = ["1=1"]
        params: List[Any] = []

        if category:
            where_clauses.append("LOWER(category) = LOWER(%s)")
            params.append(category.strip())
        if status:
            where_clauses.append("LOWER(status) = LOWER(%s)")
            params.append(status.strip())
        if is_verified is not None:
            where_clauses.append("is_verified = %s")
            params.append(1 if is_verified else 0)
        if retrieval_type:
            where_clauses.append("LOWER(retrieval_type) = LOWER(%s)")
            params.append(retrieval_type.strip())
        if search and search.strip():
            st = f"%{search.strip().lower()}%"
            where_clauses.append(
                "(LOWER(canonical_question) LIKE %s OR LOWER(answer_markdown) LIKE %s OR id IN ("
                "SELECT knowledge_id FROM agent_knowledge_synonyms WHERE LOWER(phrase) LIKE %s))"
            )
            params.extend([st, st, st])

        where_sql = " AND ".join(where_clauses)

        # Count total
        count_row = fetch_one(f"SELECT COUNT(*) as cnt FROM agent_knowledge_entries WHERE {where_sql}", tuple(params)) or {}
        total = count_row.get("cnt", 0)
        total_pages = max(1, math.ceil(total / safe_size))

        # Query items
        valid_cols = {"canonical_question", "category", "created_at", "updated_at", "version", "status", "retrieval_type"}
        col = sort_by if sort_by in valid_cols else "updated_at"
        direction = "DESC" if sort_order.lower() == "desc" else "ASC"

        query = f"SELECT * FROM agent_knowledge_entries WHERE {where_sql} ORDER BY {col} {direction} LIMIT %s OFFSET %s"
        query_params = list(params) + [safe_size, offset]
        rows = fetch_all(query, tuple(query_params)) or []

        for r in rows:
            r["is_verified"] = bool(r.get("is_verified", False))
            syn_rows = fetch_all("SELECT phrase FROM agent_knowledge_synonyms WHERE knowledge_id = %s", (r["id"],))
            r["synonyms"] = [sr["phrase"] for sr in (syn_rows or []) if sr.get("phrase")]

        return {
            "items": rows,
            "total": total,
            "page": safe_page,
            "page_size": safe_size,
            "per_page": safe_size,
            "total_pages": total_pages,
        }

    def verify_entry(
        self,
        knowledge_id: str,
        verified_by: str,
        verification_notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Explicit admin verification action.
        Validates content and marks is_verified=True.
        Crucial requirement: Verification is distinct from publishing; does NOT publish automatically.
        """
        entry = self.get_entry(knowledge_id)
        if not entry:
            return None

        if "[VERIFY" in str(entry.get("answer_markdown", "")).upper():
            raise ValueError(f"Cannot verify knowledge entry {knowledge_id} while it contains unresolved [VERIFY marker.")

        notes = (verification_notes or "").strip()
        summary = f"Content verified by administrator: {notes}" if notes else "Content verified by administrator"
        return self.update_entry(
            knowledge_id=knowledge_id,
            is_verified=True,
            verification_notes=notes or entry.get("verification_notes"),
            changed_by=verified_by,
            change_summary=summary,
        )

    def revoke_verification(
        self,
        knowledge_id: str,
        revoked_by: str,
        reason: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Revokes verification status, transitions published articles back to pending_review,
        and refreshes the index so active customer retrieval immediately excludes the unverified entry.
        """
        entry = self.get_entry(knowledge_id)
        if not entry:
            return None

        clean_reason = (reason or "Verification revoked by administrator").strip()
        updated = self.update_entry(
            knowledge_id=knowledge_id,
            is_verified=False,
            status="pending_review",
            changed_by=revoked_by,
            change_summary=clean_reason,
        )
        try:
            KnowledgeIndexManager.get_instance().refresh_index()
        except Exception as e:
            logger.warning(f"Notice refreshing index on revoke verification: {e}")
        return updated

    def rollback_entry_version(
        self,
        knowledge_id: str,
        target_version: int,
        rolled_back_by: str,
        reason: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Reverts an entry's question and answer to a historical version.
        Crucial safety rule: Creates a NEW version recording the rollback audit trail.
        Never overwrites or deletes historical version records!
        """
        history = self.get_version_history(knowledge_id)
        target_record = None
        for v in history:
            v_num = v.get("version_number") or v.get("version")
            if v_num == target_version:
                target_record = v
                break

        if not target_record:
            return None

        current = self.get_entry(knowledge_id)
        if not current:
            return None

        r_reason = (reason or f"Rolled back to version {target_version}").strip()
        # Rollbacks reset to pending_review and unverified until re-reviewed
        return self.update_entry(
            knowledge_id=knowledge_id,
            canonical_question=target_record.get("canonical_question"),
            answer_markdown=target_record.get("answer_markdown"),
            status="pending_review",
            is_verified=False,
            changed_by=rolled_back_by,
            change_summary=r_reason,
        )

    def list_drafts(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Lists knowledge draft suggestions with optional status/category filtering and pagination."""
        if not self.use_in_memory and IS_PRODUCTION and not is_db_connected():
            raise DatabaseConnectionError("Database connection unavailable for knowledge drafts in production")

        safe_page = max(1, page)
        safe_size = max(1, min(page_size, 100))
        offset = (safe_page - 1) * safe_size

        if self.use_in_memory:
            with _db_lock:
                filtered = []
                for d in MOCK_KNOWLEDGE_DRAFTS.values():
                    if status and d.get("status", "").lower() != status.lower():
                        continue
                    if category and d.get("category", "").lower() != category.lower():
                        continue
                    filtered.append(copy.deepcopy(d))

                filtered.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
                total = len(filtered)
                total_pages = max(1, math.ceil(total / safe_size))
                items = filtered[offset : offset + safe_size]
                return {
                    "items": items,
                    "total": total,
                    "page": safe_page,
                    "page_size": safe_size,
                    "per_page": safe_size,
                    "total_pages": total_pages,
                }

        where_clauses = ["1=1"]
        params: List[Any] = []
        if status:
            where_clauses.append("LOWER(status) = LOWER(%s)")
            params.append(status.strip())
        if category:
            where_clauses.append("LOWER(category) = LOWER(%s)")
            params.append(category.strip())

        where_sql = " AND ".join(where_clauses)
        count_row = fetch_one(f"SELECT COUNT(*) as cnt FROM agent_knowledge_drafts WHERE {where_sql}", tuple(params)) or {}
        total = count_row.get("cnt", 0)
        total_pages = max(1, math.ceil(total / safe_size))

        query = f"SELECT * FROM agent_knowledge_drafts WHERE {where_sql} ORDER BY created_at DESC LIMIT %s OFFSET %s"
        query_params = list(params) + [safe_size, offset]
        rows = fetch_all(query, tuple(query_params)) or []

        return {
            "items": rows,
            "total": total,
            "page": safe_page,
            "page_size": safe_size,
            "per_page": safe_size,
            "total_pages": total_pages,
        }

    def get_draft(self, draft_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single knowledge draft by ID."""
        if self.use_in_memory:
            with _db_lock:
                draft = MOCK_KNOWLEDGE_DRAFTS.get(draft_id)
                return KnowledgeRecord(copy.deepcopy(draft)) if draft else None

        row = fetch_one("SELECT * FROM agent_knowledge_drafts WHERE id = %s", (draft_id,))
        return KnowledgeRecord(row) if row else None

    def update_draft(
        self,
        draft_id: str,
        category: Optional[str] = None,
        customer_query: Optional[str] = None,
        resolution_text: Optional[str] = None,
        suggested_question: Optional[str] = None,
        suggested_answer: Optional[str] = None,
        status: Optional[str] = None,
        reviewed_by: Optional[str] = None,
        rejection_reason: Optional[str] = None,
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        """Updates draft fields and review state."""
        current = self.get_draft(draft_id)
        if not current:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        up_category = category.strip() if category is not None else current["category"]
        up_query = customer_query.strip() if customer_query is not None else current["customer_query"]
        up_res = resolution_text.strip() if resolution_text is not None else current["resolution_text"]
        up_q = suggested_question.strip() if suggested_question is not None else current["suggested_question"]
        up_a = suggested_answer.strip() if suggested_answer is not None else current["suggested_answer"]
        up_status = status.strip().lower() if status is not None else current["status"]
        up_reviewer = reviewed_by if reviewed_by is not None else current.get("reviewed_by")
        up_rejection_reason = rejection_reason if rejection_reason is not None else current.get("rejection_reason")

        updated = {
            "id": draft_id,
            "source_ticket_id": current.get("source_ticket_id"),
            "category": up_category,
            "customer_query": up_query,
            "resolution_text": up_res,
            "suggested_question": up_q,
            "suggested_answer": up_a,
            "similarity_score": current.get("similarity_score"),
            "status": up_status,
            "reviewed_by": up_reviewer,
            "rejection_reason": up_rejection_reason,
            "created_at": current["created_at"],
            "updated_at": now_iso,
        }

        if self.use_in_memory:
            with _db_lock:
                MOCK_KNOWLEDGE_DRAFTS[draft_id] = copy.deepcopy(updated)
            return updated

        execute_query(
            """
            UPDATE agent_knowledge_drafts SET
                category = %s, customer_query = %s, resolution_text = %s,
                suggested_question = %s, suggested_answer = %s, status = %s,
                reviewed_by = %s, updated_at = %s
            WHERE id = %s
            """,
            (up_category, up_query, up_res, up_q, up_a, up_status, up_reviewer, now_iso, draft_id),
        )
        return updated

    def approve_draft(
        self,
        draft_id: str,
        reviewed_by: str,
        convert_to_entry: bool = True,
        custom_question: Optional[str] = None,
        custom_answer: Optional[str] = None,
        custom_category: Optional[str] = None,
        synonyms: Optional[List[str]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Approves a draft suggestion.
        Optionally creates a new knowledge entry in pending_review state.
        CRITICAL: Never automatically publishes the entry to customer retrieval!
        """
        draft = self.get_draft(draft_id)
        if not draft:
            raise ValueError(f"Knowledge draft '{draft_id}' not found.")

        # Update draft status
        updated_draft = self.update_draft(
            draft_id=draft_id,
            status="approved",
            reviewed_by=reviewed_by,
        )

        created_entry = None
        if convert_to_entry:
            q = (custom_question or draft.get("suggested_question") or draft.get("customer_query", "")).strip()
            a = (custom_answer or draft.get("suggested_answer") or draft.get("resolution_text", "")).strip()
            cat = (custom_category or draft.get("category") or "GENERAL").strip()
            src = f"ticket:{draft.get('source_ticket_id') or draft_id}"

            created_entry = self.create_entry(
                category=cat,
                canonical_question=q,
                answer_markdown=a,
                status="pending_review",
                is_verified=False,
                source_document=src,
                approved_by=reviewed_by,
                synonyms=synonyms,
            )

        return {
            "success": True,
            "draft": updated_draft,
            "created_entry": created_entry,
            "knowledge_entry": created_entry,
            "data": created_entry,
        }

    def reject_draft(
        self,
        draft_id: str,
        reviewed_by: str,
        reason: Optional[str] = None,
        rejection_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Rejects a knowledge draft suggestion."""
        draft = self.get_draft(draft_id)
        if not draft:
            raise ValueError(f"Knowledge draft '{draft_id}' not found.")

        final_reason = rejection_reason or reason
        updated = self.update_draft(
            draft_id=draft_id,
            status="rejected",
            reviewed_by=reviewed_by,
            rejection_reason=final_reason,
        )
        if isinstance(updated, dict):
            updated["rejection_reason"] = final_reason
        return {"success": True, "draft": updated, "data": updated, "reason": final_reason, "rejection_reason": final_reason}

    def request_changes_draft(
        self,
        draft_id: str,
        reviewed_by: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Marks draft as changes_requested with administrator notes."""
        draft = self.get_draft(draft_id)
        if not draft:
            raise ValueError(f"Knowledge draft '{draft_id}' not found.")

        updated = self.update_draft(
            draft_id=draft_id,
            status="changes_requested",
            reviewed_by=reviewed_by,
        )
        return {"success": True, "draft": updated, "data": updated, "notes": notes}

    def suggest_knowledge_from_ticket(
        self,
        ticket_id: str,
        admin_email: str,
    ) -> Dict[str, Any]:
        """
        Ingests a resolved support ticket, strips customer PII and internal admin notes,
        detects duplicate similarity against active knowledge, and stores a draft suggestion.
        CRITICAL: Never automatically publishes content to customer retrieval.
        """
        ticket = None
        if not self.use_in_memory:
            ticket = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (ticket_id,))
        if not ticket and not IS_PRODUCTION:
            from database import MOCK_SUPPORT_TICKETS
            ticket = MOCK_SUPPORT_TICKETS.get(ticket_id)
            if not ticket:
                for tid, t in MOCK_SUPPORT_TICKETS.items():
                    if tid.lower() == ticket_id.lower():
                        ticket = t
                        break

        if not ticket:
            raise ValueError(f"Support ticket '{ticket_id}' not found.")

        subject = ticket.get("subject") or "Customer Support Inquiry"
        category = ticket.get("category") or "General"

        # Parse messages
        messages = ticket.get("messages") or []
        if isinstance(messages, str):
            try:
                messages = json.loads(messages)
            except Exception:
                messages = [{"sender": "user", "text": messages}]

        user_texts = []
        resolution_texts = []
        for m in messages:
            sender = (m.get("sender") or m.get("sender_type") or "").lower()
            text = (m.get("text") or m.get("message") or m.get("content") or "").strip()
            if not text:
                continue
            # Strip internal admin notes strictly
            if "internal" in m or "confidential" in text.lower() or "do not share" in text.lower():
                continue
            if sender in ("user", "customer", "renter", "client"):
                user_texts.append(text)
            elif sender in ("admin", "support", "agent", "specialist"):
                resolution_texts.append(text)

        raw_query = user_texts[0] if user_texts else subject
        raw_resolution = resolution_texts[-1] if resolution_texts else (ticket.get("resolution") or "Standard customer resolution provided by Payent support.")

        # PII Sanitization
        clean_query = sanitize_support_text_pii(raw_query)
        clean_resolution = sanitize_support_text_pii(raw_resolution)

        # Deterministic question formatting
        suggested_q = format_canonical_question_from_query(clean_query, subject)
        suggested_a = clean_resolution

        # Check duplicate similarity against active knowledge retriever
        similarity_score = 0.0
        try:
            im = KnowledgeIndexManager.get_instance()
            retriever = im.get_retriever()
            dup = retriever.check_duplicate(suggested_q, threshold=0.65)
            if dup:
                score = getattr(dup, "score", 0.0)
                if not score and isinstance(dup, tuple) and len(dup) >= 2:
                    score = dup[1] if isinstance(dup[1], (int, float)) else (dup[2] if len(dup) >= 3 and isinstance(dup[2], (int, float)) else 0.0)
                similarity_score = round(float(score), 4)
        except Exception as e:
            logger.debug(f"Notice during duplicate detection for ticket draft: {e}")

        # Store as draft in pending_review
        draft = self.create_draft(
            category=category,
            customer_query=clean_query,
            resolution_text=clean_resolution,
            suggested_question=suggested_q,
            suggested_answer=suggested_a,
            source_ticket_id=ticket_id,
            similarity_score=similarity_score,
            status="pending_review",
        )
        return draft


def sanitize_support_text_pii(text: str) -> str:
    """Strips phone numbers, emails, cards, Aadhaar, PAN, OTPs, PINs, and transaction IDs from text."""
    if not text:
        return ""
    # Mask card, Aadhaar, PAN, PIN via privacy module
    out = mask_sensitive_text(text)
    # Mask Indian mobile numbers
    out = re.sub(r"\b(?:\+91[-\s]?)?[6-9]\d{9}\b", "[REDACTED_PHONE]", out)
    # Mask email addresses
    out = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", "[REDACTED_EMAIL]", out)
    # Mask transaction / payment IDs (pay_..., ord_..., rfnd_...)
    out = re.sub(r"\b(pay_[A-Za-z0-9]{8,}|order_[A-Za-z0-9]{8,}|rfnd_[A-Za-z0-9]{8,}|TICK-[A-Za-z0-9]{4,})\b", "[REDACTED_TXN]", out)
    return out.strip()


def format_canonical_question_from_query(query: str, subject: str) -> str:
    """Deterministic question normalization for knowledge draft suggestions."""
    clean = (query or subject or "").strip()
    clean = re.sub(r"^(hi|hello|hey|dear\s+support|please\s+help|urgent)\b[,\s.:-]*", "", clean, flags=re.IGNORECASE).strip()
    if not clean:
        clean = subject.strip()
    clean = clean[0].upper() + clean[1:] if clean else "Customer Inquiry"
    if not clean.endswith("?") and not clean.endswith("."):
        clean += "?"
    return clean


class KnowledgeIndexManager:
    """
    Manages the in-memory retrieval index lifecycle.
    Guarantees atomic index swaps, failure resilience, and metadata tracking.
    Never exposes partially constructed or failed indices.
    """

    _instance: Optional["KnowledgeIndexManager"] = None
    _singleton_lock = threading.Lock()

    def __init__(
        self,
        knowledge_manager: Optional[KnowledgeManager] = None,
        retrieval_config: Optional[RetrievalConfig] = None,
        synonym_registry: Optional[SynonymRegistry] = None,
    ):
        self.km = knowledge_manager or KnowledgeManager()
        self.config = retrieval_config or RetrievalConfig()
        self.synonym_registry = synonym_registry or default_synonym_registry

        self._active_retriever: Optional[AgentKnowledgeRetriever] = None
        self._last_refresh_timestamp: Optional[str] = None
        self._document_count: int = 0
        self._last_error: Optional[str] = None
        self._lock = threading.RLock()

        # Build initial empty or existing active index safely
        self.refresh_index()

    @classmethod
    def get_instance(cls) -> "KnowledgeIndexManager":
        """Thread-safe singleton accessor."""
        with cls._singleton_lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Resets the singleton instance for clean test isolation."""
        with cls._singleton_lock:
            cls._instance = None

    def get_retriever(self) -> AgentKnowledgeRetriever:
        """Returns the currently active indexed retriever."""
        with self._lock:
            if self._active_retriever is None:
                # Fallback to an empty retriever
                retriever = AgentKnowledgeRetriever(
                    config=self.config,
                    synonym_registry=self.synonym_registry,
                )
                retriever.index_documents([])
                return retriever
            return self._active_retriever

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Returns currently indexed active documents."""
        with self._lock:
            if self._active_retriever and hasattr(self._active_retriever, "documents"):
                raw_docs = self._active_retriever.documents
                docs = raw_docs.values() if isinstance(raw_docs, dict) else raw_docs
                out = []
                for d in docs:
                    if hasattr(d, "to_dict"):
                        out.append(d.to_dict())
                    elif isinstance(d, dict):
                        out.append(d)
                    elif hasattr(d, "id"):
                        out.append({
                            "id": getattr(d, "id", None),
                            "question": getattr(d, "question", ""),
                            "answer": getattr(d, "answer", ""),
                            "category": getattr(d, "category", ""),
                            "retrieval_type": getattr(d, "retrieval_type", "guide"),
                        })
                    elif isinstance(d, str):
                        out.append({"id": d})
                return out
            return []

    def refresh_index(self) -> bool:
        """
        Reconstructs the TF-IDF retrieval index from active published documents.
        Atomic operation: if building or querying fails, the previous index remains completely intact.
        """
        with self._lock:
            try:
                # 1. Fetch active documents (only published and verified)
                docs = self.km.get_active_knowledge_documents()

                # 2. Build candidate retriever
                new_retriever = AgentKnowledgeRetriever(
                    config=self.config,
                    synonym_registry=self.synonym_registry,
                )
                new_retriever.index_documents(docs)

                # 3. Atomic swap
                self._active_retriever = new_retriever
                self._document_count = len(docs)
                self._last_refresh_timestamp = datetime.now(timezone.utc).isoformat()
                self._last_error = None
                logger.info(f"Knowledge index refreshed successfully with {len(docs)} active documents.")
                return True
            except Exception as e:
                self._last_error = f"{type(e).__name__}: {str(e)}"
                logger.error(f"Failed to refresh knowledge index: {self._last_error}. Retaining existing index.")
                # Previous index is safely retained
                if self._active_retriever is None:
                    # Provide an empty retriever if none existed
                    fallback = AgentKnowledgeRetriever(
                        config=self.config,
                        synonym_registry=self.synonym_registry,
                    )
                    fallback.index_documents([])
                    self._active_retriever = fallback
                return False

    def get_metadata(self) -> Dict[str, Any]:
        """Provides operational metadata for health checks and monitoring."""
        with self._lock:
            return {
                "document_count": self._document_count,
                "last_refresh_timestamp": self._last_refresh_timestamp,
                "is_indexed": self._active_retriever.is_indexed if self._active_retriever else False,
                "vocabulary_size": len(self._active_retriever.vocabulary) if self._active_retriever else 0,
                "last_error": self._last_error,
            }

    def refresh_index_manual(self, triggered_by: Optional[str] = None) -> Dict[str, Any]:
        """Explicit administrator-triggered index rebuild action."""
        success = self.refresh_index()
        meta = self.get_metadata()
        return {
            "success": success,
            "document_count": meta.get("document_count", 0),
            "last_refresh_timestamp": meta.get("last_refresh_timestamp"),
            "triggered_by": triggered_by or "administrator",
            "is_indexed": meta.get("is_indexed", False),
            "last_error": meta.get("last_error"),
        }
