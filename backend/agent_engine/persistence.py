"""
PAYENT AGENT — CONVERSATION & MESSAGE PERSISTENCE
Additive, isolated session storage for Payent Agent conversations.
Supports dual-mode execution: TiDB/MySQL database with graceful in-memory fallback for test/dev,
and strict fail-closed safety with operational alerting for production.
Enforces strict tenant isolation: guest sessions cannot view authenticated conversations.
"""

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from config import IS_PRODUCTION
from agent_engine.context import AgentSessionContext
from agent_engine.privacy import mask_sensitive_text
from database import execute_query, fetch_all, fetch_one, get_db_connection

logger = logging.getLogger("payent.agent.persistence")


class PersistenceUnavailableError(RuntimeError):
    """Raised when persistent database storage is required (production) but unavailable."""
    pass


# In-memory stores for offline execution, fallback mode, and test isolation
MOCK_AGENT_CONVERSATIONS: Dict[str, Dict[str, Any]] = {}
MOCK_AGENT_MESSAGES: Dict[str, List[Dict[str, Any]]] = {}

_tables_initialized = False


def reset_persistence_state() -> None:
    """Helper for test suites to reset in-memory persistence and table initialization state."""
    global _tables_initialized
    _tables_initialized = False
    MOCK_AGENT_CONVERSATIONS.clear()
    MOCK_AGENT_MESSAGES.clear()


def is_db_available() -> bool:
    """Checks whether the database connection is currently alive."""
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


def _notify_admin_db_failure(operation: str) -> None:
    """Dispatches high-priority operational alert through existing platform bus."""
    try:
        from database import broadcast_admin_event_safe
        broadcast_admin_event_safe("agent.database_failure", {
            "module": "agent_persistence",
            "operation": operation,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "environment": "production" if IS_PRODUCTION else "development"
        })
    except Exception:
        pass


def init_agent_tables() -> None:
    """
    Additive database migration initializing agent_conversations and agent_messages tables.
    Adheres strictly to Payent's idempotent CREATE TABLE IF NOT EXISTS pattern.
    """
    global _tables_initialized
    if _tables_initialized:
        return

    conn = None
    try:
        conn = get_db_connection()
    except Exception as e:
        logger.error("Failed to connect to database for agent table initialization: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("init_agent_tables")
            raise PersistenceUnavailableError("Persistent database unavailable for agent initialization") from e

    if not conn:
        if IS_PRODUCTION:
            logger.error("Failed to connect to database for agent table initialization (no connection returned)")
            _notify_admin_db_failure("init_agent_tables")
            raise PersistenceUnavailableError("Persistent database unavailable for agent initialization")
        logger.debug("Operating agent persistence in fallback in-memory mode (DB offline).")
        _tables_initialized = True
        return

    try:
        # 1. Agent Conversations Table
        execute_query("""
            CREATE TABLE IF NOT EXISTS agent_conversations (
                id VARCHAR(255) PRIMARY KEY,
                user_email VARCHAR(255) NULL,
                session_id VARCHAR(255) NOT NULL,
                account_type VARCHAR(50) DEFAULT 'payrent',
                status VARCHAR(50) DEFAULT 'active',
                created_at VARCHAR(100) NOT NULL,
                updated_at VARCHAR(100) NOT NULL
            )
        """)

        # 2. Agent Messages Table
        execute_query("""
            CREATE TABLE IF NOT EXISTS agent_messages (
                id VARCHAR(255) PRIMARY KEY,
                conversation_id VARCHAR(255) NOT NULL,
                sender_type VARCHAR(50) NOT NULL,
                intent VARCHAR(100) NULL,
                content TEXT NOT NULL,
                entities_json TEXT NULL,
                tool_calls_json TEXT NULL,
                created_at VARCHAR(100) NOT NULL
            )
        """)

        # Safely create indices
        try:
            with conn.cursor() as cursor:
                cursor.execute("CREATE INDEX idx_ag_conv_email ON agent_conversations (user_email)")
            conn.commit()
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("CREATE INDEX idx_ag_conv_session ON agent_conversations (session_id)")
            conn.commit()
        except Exception:
            pass

        try:
            with conn.cursor() as cursor:
                cursor.execute("CREATE INDEX idx_ag_msg_conv ON agent_messages (conversation_id)")
            conn.commit()
        except Exception:
            pass

        _tables_initialized = True
        logger.info("Agent persistence tables initialized successfully.")
    except Exception as e:
        logger.warning("Notice initializing agent persistence tables: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("init_agent_tables_ddl")
            raise PersistenceUnavailableError("Failed to initialize agent persistence schema in production") from e
    finally:
        try:
            conn.close()
        except Exception:
            pass


def can_access_conversation(conv: Dict[str, Any], context: AgentSessionContext) -> bool:
    """
    Enforces conversation privacy boundaries:
    - Admin can view any conversation.
    - Authenticated user can view conversations matching their email.
    - Guest can ONLY view conversations matching their specific guest session_id.
    - Guest CANNOT view conversations associated with authenticated users!
    """
    if not conv or not isinstance(conv, dict):
        return False

    if context.is_admin:
        return True

    conv_email = (conv.get("user_email") or "").strip().lower()
    conv_sess = str(conv.get("session_id") or "").strip()

    if context.is_authenticated:
        # Authenticated user can view if email matches or session matches with empty email
        if conv_email and conv_email == context.clean_email:
            return True
        if not conv_email and conv_sess and conv_sess == context.session_id:
            return True
        return False
    else:
        # Guest user: Can only access unauthenticated conversation matching their session_id
        if conv_email:
            return False  # Never permit guest to access an authenticated user's chat!
        return bool(conv_sess and conv_sess == context.session_id)


def create_or_get_conversation(
    session_id: str,
    context: AgentSessionContext
) -> Dict[str, Any]:
    """
    Retrieves an existing conversation for the session/user or creates a new one.
    """
    init_agent_tables()
    sid = str(session_id or context.session_id).strip()
    clean_email = context.clean_email if context.is_authenticated else None
    now_iso = datetime.now(timezone.utc).isoformat()

    if IS_PRODUCTION and not is_db_available():
        logger.error("Persistent database unavailable in production during create_or_get_conversation")
        _notify_admin_db_failure("create_or_get_conversation")
        raise PersistenceUnavailableError("Database persistence is unavailable in production")

    # 1. Search in MySQL DB if connected
    try:
        if clean_email:
            row = fetch_one("""
                SELECT * FROM agent_conversations
                WHERE user_email = %s AND status = 'active'
                ORDER BY updated_at DESC LIMIT 1
            """, (clean_email,))
        else:
            row = fetch_one("""
                SELECT * FROM agent_conversations
                WHERE session_id = %s AND user_email IS NULL AND status = 'active'
                ORDER BY updated_at DESC LIMIT 1
            """, (sid,))

        if row:
            return row
    except Exception as e:
        logger.error("DB read error in create_or_get_conversation: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("create_or_get_conversation_read")
            raise PersistenceUnavailableError("Failed to read conversation from database in production") from e

    # 2. Check in-memory store if non-production
    if not IS_PRODUCTION:
        for c in sorted(MOCK_AGENT_CONVERSATIONS.values(), key=lambda x: x.get("updated_at", ""), reverse=True):
            if clean_email and c.get("user_email") == clean_email and c.get("status") == "active":
                return c
            if not clean_email and c.get("session_id") == sid and not c.get("user_email") and c.get("status") == "active":
                return c

    # 3. Create new conversation record
    conv_id = f"conv_ag_{uuid.uuid4().hex[:12]}"
    conv_record = {
        "id": conv_id,
        "user_email": clean_email,
        "session_id": sid,
        "account_type": context.account_type,
        "status": "active",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    # Persist in DB
    try:
        execute_query("""
            INSERT INTO agent_conversations (id, user_email, session_id, account_type, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            conv_id,
            clean_email,
            sid,
            context.account_type,
            "active",
            now_iso,
            now_iso,
        ))
    except Exception as e:
        logger.error("DB insert error in agent_conversations: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("create_or_get_conversation_insert")
            raise PersistenceUnavailableError("Failed to persist new conversation in production") from e

    # Persist in mock store (for non-prod or fast memory cache)
    MOCK_AGENT_CONVERSATIONS[conv_id] = conv_record
    if conv_id not in MOCK_AGENT_MESSAGES:
        MOCK_AGENT_MESSAGES[conv_id] = []

    return conv_record


def get_conversation(conversation_id: str, context: AgentSessionContext) -> Optional[Dict[str, Any]]:
    """Retrieves a conversation by ID, enforcing tenant isolation."""
    init_agent_tables()
    cid = (conversation_id or "").strip()
    if not cid:
        return None

    if IS_PRODUCTION and not is_db_available():
        logger.error("Persistent database unavailable in production during get_conversation")
        _notify_admin_db_failure("get_conversation")
        raise PersistenceUnavailableError("Database persistence is unavailable in production")

    conv = None
    try:
        conv = fetch_one("SELECT * FROM agent_conversations WHERE id = %s", (cid,))
    except Exception as e:
        logger.error("DB read error in get_conversation: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("get_conversation_read")
            raise PersistenceUnavailableError("Failed to fetch conversation from database in production") from e

    if not conv and not IS_PRODUCTION:
        conv = MOCK_AGENT_CONVERSATIONS.get(cid)

    if not conv:
        return None

    if not can_access_conversation(conv, context):
        return None

    return conv


def save_agent_message(
    conversation_id: str,
    sender_type: str,
    content: str,
    intent: Optional[str] = None,
    entities: Optional[Dict[str, Any]] = None,
    tool_result: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Persists a sanitized message turn into the active conversation thread.
    Redacts any raw credentials or sensitive PII before persistence.
    """
    init_agent_tables()
    cid = (conversation_id or "").strip()
    msg_id = f"msg_ag_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_content = mask_sensitive_text(content)

    entities_str = json.dumps(entities) if isinstance(entities, dict) else None
    tool_str = json.dumps(tool_result) if isinstance(tool_result, dict) else None

    msg_record = {
        "id": msg_id,
        "conversation_id": cid,
        "sender_type": sender_type,
        "intent": intent,
        "content": clean_content,
        "entities_json": entities_str,
        "tool_calls_json": tool_str,
        "created_at": now_iso,
    }

    if IS_PRODUCTION and not is_db_available():
        logger.error("Persistent database unavailable in production during save_agent_message")
        _notify_admin_db_failure("save_agent_message")
        raise PersistenceUnavailableError("Database persistence is unavailable in production")

    # DB Persistence
    try:
        execute_query("""
            INSERT INTO agent_messages (id, conversation_id, sender_type, intent, content, entities_json, tool_calls_json, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            msg_id,
            cid,
            sender_type,
            intent,
            clean_content,
            entities_str,
            tool_str,
            now_iso
        ))
        # Update updated_at timestamp on parent conversation
        execute_query("UPDATE agent_conversations SET updated_at = %s WHERE id = %s", (now_iso, cid))
    except Exception as e:
        logger.error("DB insert error in agent_messages: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("save_agent_message_insert")
            raise PersistenceUnavailableError("Failed to persist agent message in production") from e

    # Mock Persistence
    if cid not in MOCK_AGENT_MESSAGES:
        MOCK_AGENT_MESSAGES[cid] = []
    MOCK_AGENT_MESSAGES[cid].append(msg_record)

    if cid in MOCK_AGENT_CONVERSATIONS:
        MOCK_AGENT_CONVERSATIONS[cid]["updated_at"] = now_iso

    return msg_record


def get_conversation_messages(
    conversation_id: str,
    context: AgentSessionContext,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Retrieves history for a conversation after verifying access permissions.
    """
    init_agent_tables()
    conv = get_conversation(conversation_id, context)
    if not conv:
        return []

    cid = str(conv.get("id"))
    limit = max(1, min(limit, 100))

    if IS_PRODUCTION and not is_db_available():
        logger.error("Persistent database unavailable in production during get_conversation_messages")
        _notify_admin_db_failure("get_conversation_messages")
        raise PersistenceUnavailableError("Database persistence is unavailable in production")

    try:
        rows = fetch_all("""
            SELECT * FROM agent_messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
            LIMIT %s
        """, (cid, limit))
        if rows:
            return rows
    except Exception as e:
        logger.error("DB read error in get_conversation_messages: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("get_conversation_messages_read")
            raise PersistenceUnavailableError("Failed to fetch conversation messages from database in production") from e

    if not IS_PRODUCTION:
        return MOCK_AGENT_MESSAGES.get(cid, [])[-limit:]
    return []
