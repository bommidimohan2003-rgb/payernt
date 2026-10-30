"""
PAYENT AGENT — FASTAPI ROUTER & CHAT API
Provides dedicated HTTP API endpoints for Payent Agent chatbot integration.
Supports dual-mode caller execution: verified authenticated users and guest visitors.
Derives authentication strictly from cryptographic JWT verification or server dependencies.
Enforces conversation ownership, input length validation, and tenant isolation.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_auth_token,
)
from agent_engine.persistence import (
    PersistenceUnavailableError,
    get_conversation,
    get_conversation_messages,
)
from agent_engine.tool_router import AgentToolRouter
from database import fetch_all, fetch_one

logger = logging.getLogger("payent.agent.router")

agent_router = APIRouter(prefix="/api/agent", tags=["Payent Agent"])

# Singleton router instance for deterministic pipeline processing
_tool_router = AgentToolRouter()


# ============================================================================
# SCHEMAS
# ============================================================================

class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Customer message or inquiry")
    session_id: Optional[str] = Field(None, max_length=128, description="Client session identifier")
    conversation_id: Optional[str] = Field(None, max_length=128, description="Existing conversation thread ID")


class AgentChatResponse(BaseModel):
    success: bool
    response: str
    intent: Optional[str] = None
    confidence: Optional[float] = None
    tool_called: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    suggestions: List[str] = Field(default_factory=list)
    requires_auth: bool = False
    requires_confirmation: bool = False
    session_id: str
    conversation_id: Optional[str] = None
    authenticated: bool = False
    user_email: Optional[str] = None
    status: str = "ok"
    persistence_error: bool = False


# ============================================================================
# CONTEXT EXTRACTION HELPER
# ============================================================================

def resolve_agent_context(
    authorization: Optional[str] = None,
    session_id: Optional[str] = None
) -> AgentSessionContext:
    """
    Authoritatively extracts session context:
    1. If a valid, unrevoked JWT is present in Authorization header, yields authenticated context.
    2. Otherwise, securely defaults to an unauthenticated guest context.
    Never trusts user identity or role from request body.
    """
    if authorization and authorization.strip():
        token = authorization.strip()
        if token.lower().startswith("bearer "):
            token = token[7:].strip()
        ctx = from_auth_token(token, session_id=session_id)
        if ctx and ctx.is_authenticated:
            return ctx

    return create_guest_context(session_id=session_id)


# ============================================================================
# API ENDPOINTS
# ============================================================================

@agent_router.post("/chat", response_model=AgentChatResponse)
def agent_chat_endpoint(
    payload: AgentChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Main conversational turn endpoint for the Payent frontend chatbot.
    Accepts messages from authenticated users or guest visitors.
    Routes to deterministic intent understanding and allowlisted database tools.
    """
    clean_message = payload.message.strip()
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty."
        )

    context = resolve_agent_context(authorization, session_id=payload.session_id)

    try:
        result = _tool_router.process_message(
            message=clean_message,
            context=context,
            conversation_id=payload.conversation_id
        )
    except PersistenceUnavailableError:
        logger.error("Production persistence failure during agent turn: returning controlled error")
        return AgentChatResponse(
            success=False,
            response=(
                "Payent Agent service is temporarily undergoing maintenance or experiencing connection delays. "
                "Please try again in a few moments, or reach out to Payent support if the issue persists."
            ),
            suggestions=["Try Again", "Contact Support", "Help"],
            requires_auth=False,
            session_id=context.session_id,
            conversation_id=payload.conversation_id,
            authenticated=context.is_authenticated,
            status="service_unavailable",
            persistence_error=True
        )
    except Exception as e:
        logger.error("Unexpected error in agent_chat_endpoint: %s", type(e).__name__)
        return AgentChatResponse(
            success=False,
            response="I encountered an issue processing your request. Please try again or contact customer care.",
            suggestions=["Help Center", "Contact Support"],
            session_id=context.session_id,
            conversation_id=payload.conversation_id,
            authenticated=context.is_authenticated,
            status="error"
        )

    requires_confirmation = False
    tool_res = result.get("tool_result")
    if isinstance(tool_res, dict) and tool_res.get("requires_confirmation"):
        requires_confirmation = True

    return AgentChatResponse(
        success=True,
        response=result.get("response_text", ""),
        intent=result.get("intent"),
        confidence=result.get("confidence"),
        tool_called=result.get("tool_called"),
        tool_result=result.get("tool_result"),
        suggestions=result.get("suggestions", []),
        requires_auth=result.get("requires_auth", False),
        requires_confirmation=requires_confirmation,
        session_id=result.get("session_id") or context.session_id,
        conversation_id=result.get("conversation_id") or payload.conversation_id,
        authenticated=context.is_authenticated,
        user_email=context.clean_email if context.is_authenticated else None,
        status=result.get("status", "ok"),
        persistence_error=result.get("persistence_error", False)
    )


@agent_router.get("/conversations")
def list_agent_conversations(
    authorization: Optional[str] = Header(None),
    session_id: Optional[str] = None
):
    """
    Lists conversations owned by the caller.
    - Authenticated users receive conversations matching their verified email.
    - Guests receive conversations strictly matching their guest session_id.
    """
    context = resolve_agent_context(authorization, session_id=session_id)

    conversations = []
    if context.is_authenticated and context.clean_email:
        try:
            rows = fetch_all("""
                SELECT id, user_email, session_id, account_type, status, created_at, updated_at
                FROM agent_conversations
                WHERE LOWER(user_email) = %s
                ORDER BY updated_at DESC
                LIMIT 20
            """, (context.clean_email,))
            if rows:
                conversations.extend(rows)
        except Exception:
            pass

        # Check mock store in dev/test
        from agent_engine.persistence import MOCK_AGENT_CONVERSATIONS
        seen_ids = {c["id"] for c in conversations}
        for cid, c in MOCK_AGENT_CONVERSATIONS.items():
            if cid not in seen_ids and (c.get("user_email") or "").strip().lower() == context.clean_email:
                conversations.append(c)

    elif session_id:
        clean_sid = str(session_id).strip()
        try:
            rows = fetch_all("""
                SELECT id, user_email, session_id, account_type, status, created_at, updated_at
                FROM agent_conversations
                WHERE session_id = %s AND user_email IS NULL
                ORDER BY updated_at DESC
                LIMIT 5
            """, (clean_sid,))
            if rows:
                conversations.extend(rows)
        except Exception:
            pass

        from agent_engine.persistence import MOCK_AGENT_CONVERSATIONS
        seen_ids = {c["id"] for c in conversations}
        for cid, c in MOCK_AGENT_CONVERSATIONS.items():
            if cid not in seen_ids and c.get("session_id") == clean_sid and not c.get("user_email"):
                conversations.append(c)

    return {"conversations": conversations}


@agent_router.get("/conversations/{conversation_id}")
def get_agent_conversation_detail(
    conversation_id: str,
    authorization: Optional[str] = Header(None),
    session_id: Optional[str] = None
):
    """
    Fetches details and message history for a specific conversation.
    Strictly verifies ownership: guests cannot read authenticated conversations,
    and customers cannot read another customer's conversations.
    """
    clean_cid = conversation_id.strip()
    context = resolve_agent_context(authorization, session_id=session_id)

    conv = get_conversation(clean_cid, context)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or unauthorized."
        )

    messages = get_conversation_messages(clean_cid, context, limit=50)
    return {
        "conversation": conv,
        "messages": messages
    }


@agent_router.post("/conversations/{conversation_id}/messages", response_model=AgentChatResponse)
def post_agent_conversation_message(
    conversation_id: str,
    payload: AgentChatRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Appends a new turn directly into an existing conversation thread after validating ownership.
    """
    clean_cid = conversation_id.strip()
    payload.conversation_id = clean_cid
    return agent_chat_endpoint(payload, authorization)

