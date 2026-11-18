"""
Payent Agent Engine — Fallback Responses & Multi-Turn Confirmation
Handlers for unknown or unsupported query detection, human support escalation offers,
and multi-turn confirmation processing (affirmative/negative).
Deterministic in-memory pending escalation registry ensuring zero-loss state tracking
across turns and sessions.
"""

import re
import time
from typing import Any, Dict, List, Optional


UNKNOWN_QUESTION_ENGLISH = (
    "I'm sorry, I couldn't understand your question. "
    "Would you like me to connect you with our human support team?"
)

UNKNOWN_QUESTION_TELUGU = (
    "Sorry, mee question ni nenu correct-ga understand chesukolekapoyanu. "
    "Meeru maa human support team tho connect avvalanukuntunnara?"
)

FALLBACK_ACTION_SUGGESTIONS = [
    "Yes, connect me",
    "No, I'll rephrase",
]

DECLINE_RESPONSE_ENGLISH = (
    "No problem! Please rephrase your question, and I'll try to help."
)

DECLINE_RESPONSE_TELUGU = (
    "Sare, no problem! Mee question ni rephrase chesi adagandi, nenu help cheyadaniki try chestanu."
)

DECLINE_SUGGESTIONS = [
    "Check Booking Status",
    "Delivery Tracking",
    "KYC Verification",
    "Help Center",
]

# Canonical and colloquial affirmative phrases (English & Telugu/Tenglish)
AFFIRMATIVE_PHRASES = {
    # English standard & button values
    "yes", "yes please", "connect me", "please connect me", "yes, connect me",
    "yes connect me", "yes, please", "talk to a human", "talk to human",
    "human support", "i need an agent", "need an agent", "please connect me to support",
    "please connect to support", "connect me to support", "connect to support",
    "connect to human support", "i want human support", "need human support",
    "sure", "proceed", "yep", "ok", "okay", "confirm", "confirm ticket",
    "proceed with ticket", "please proceed", "please connect", "yes proceed",
    "retry support ticket", "retry ticket", "try again", "retry",

    # Telugu / Tenglish
    "avunu", "avunu, connect cheyyandi", "avunu connect cheyyandi",
    "avunu connect cheyandi", "connect cheyyandi", "connect cheyandi",
    "connect cheyyi", "ha", "haa", "human support kavali", "human kavali",
    "support kavali", "agent kavali", "human agent kavali",
}

# Canonical and colloquial negative / cancellation phrases (English & Telugu/Tenglish)
NEGATIVE_PHRASES = {
    # English standard & button values
    "no", "no thanks", "no, thanks", "not now", "no, i'll rephrase",
    "no ill rephrase", "no i will rephrase", "let me rephrase",
    "i'll rephrase", "ill rephrase", "i will rephrase",
    "i'll ask differently", "ill ask differently", "i will ask differently",
    "ask differently", "cancel", "never mind", "dont connect", "don't connect",
    "no need", "rephrase", "decline",

    # Telugu / Tenglish
    "vaddu", "vaddhu", "oddu", "ledu", "vaddu rephrase chestanu",
    "rephrase chestanu", "malli adugutha", "malli adugutanu",
}

# In-memory registry for pending support escalations
# Keyed by session_id and/or conversation_id
_PENDING_ESCALATIONS: Dict[str, Dict[str, Any]] = {}
PENDING_EXPIRATION_SECONDS = 3600.0  # 1 hour expiration window


def register_pending_escalation(
    session_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    unanswered_query: str = "",
    is_telugu: bool = False,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Registers a pending human support escalation for the active session/conversation.
    Allows deterministic multi-turn confirmation without relying solely on database history.
    """
    record = {
        "unanswered_query": (unanswered_query or "").strip(),
        "is_telugu": is_telugu,
        "created_at": time.time(),
        "state": "AWAITING_SUPPORT_CONFIRMATION",
        "metadata": metadata or {},
    }
    if session_id and str(session_id).strip():
        _PENDING_ESCALATIONS[f"sess:{str(session_id).strip()}"] = record
    if conversation_id and str(conversation_id).strip():
        _PENDING_ESCALATIONS[f"conv:{str(conversation_id).strip()}"] = record


def get_pending_escalation(
    session_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Retrieves the pending escalation record if active and unexpired.
    Checks conversation_id key first, then session_id key.
    """
    now = time.time()
    candidates = []
    if conversation_id and str(conversation_id).strip():
        candidates.append(f"conv:{str(conversation_id).strip()}")
    if session_id and str(session_id).strip():
        candidates.append(f"sess:{str(session_id).strip()}")

    for key in candidates:
        record = _PENDING_ESCALATIONS.get(key)
        if record:
            if now - record.get("created_at", 0) <= PENDING_EXPIRATION_SECONDS:
                return record
            else:
                _PENDING_ESCALATIONS.pop(key, None)
    return None


def clear_pending_escalation(
    session_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> None:
    """Clears pending escalation state upon successful ticket creation or cancellation."""
    if session_id and str(session_id).strip():
        _PENDING_ESCALATIONS.pop(f"sess:{str(session_id).strip()}", None)
    if conversation_id and str(conversation_id).strip():
        _PENDING_ESCALATIONS.pop(f"conv:{str(conversation_id).strip()}", None)


def reset_pending_escalations() -> None:
    """Resets all pending escalations in memory (used by tests)."""
    _PENDING_ESCALATIONS.clear()


def is_affirmative_response(text: str) -> bool:
    """
    Checks whether the user message is an affirmative response to an escalation prompt.
    Deterministic matching against exact phrases, stripped punctuation, and bounded prefixes.
    """
    if not text or not isinstance(text, str):
        return False
    cleaned = text.strip().lower().strip(" .!?,;:")
    if cleaned in AFFIRMATIVE_PHRASES:
        return True

    # Punctuation-stripped check (e.g. "yes, connect me" -> "yes connect me")
    norm = re.sub(r"[^\w\s]", " ", cleaned)
    norm_collapsed = " ".join(norm.split())
    if norm_collapsed in AFFIRMATIVE_PHRASES:
        return True

    words = cleaned.split()
    if len(words) <= 5:
        # Prefix match
        if any(cleaned.startswith(p) for p in (
            "yes", "connect me", "please connect", "talk to human",
            "talk to a human", "avunu", "ha ", "human support", "proceed"
        )):
            return True
        # Explicit intent phrase check
        if "connect me" in cleaned or "human support" in cleaned or "need an agent" in cleaned:
            return True
        if "human" in cleaned and "kavali" in cleaned:
            return True
        if "support" in cleaned and "kavali" in cleaned:
            return True

    return False


def is_negative_response(text: str) -> bool:
    """
    Checks whether the user message is a negative response to an escalation prompt.
    Deterministic matching against exact phrases, stripped punctuation, and bounded prefixes.
    """
    if not text or not isinstance(text, str):
        return False
    cleaned = text.strip().lower().strip(" .!?,;:")
    if cleaned in NEGATIVE_PHRASES:
        return True

    # Punctuation-stripped check
    norm = re.sub(r"[^\w\s]", " ", cleaned)
    norm_collapsed = " ".join(norm.split())
    if norm_collapsed in NEGATIVE_PHRASES:
        return True

    words = cleaned.split()
    if len(words) <= 5:
        if any(cleaned.startswith(p) for p in (
            "no ", "no,", "no thanks", "vaddu", "ledu", "not now",
            "let me", "i'll ask", "ill ask", "i will ask"
        )):
            return True
        if "rephrase" in cleaned or "ask differently" in cleaned or "cancel" in cleaned:
            return True
        if "dont connect" in norm_collapsed or "dont want" in norm_collapsed:
            return True

    return False


def build_unknown_fallback_response(
    unanswered_query: str,
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Builds the honest unknown question response offering an optional human support connection.
    Registers a pending escalation state in memory so subsequent turns can confirm or decline.
    Sets tool_called="propose_support_fallback" with state="AWAITING_SUPPORT_CONFIRMATION".
    """
    msg = UNKNOWN_QUESTION_TELUGU if is_telugu else UNKNOWN_QUESTION_ENGLISH

    # Persist pending escalation state in session/conversation memory
    register_pending_escalation(
        session_id=session_id,
        conversation_id=conversation_id,
        unanswered_query=unanswered_query,
        is_telugu=is_telugu,
        metadata={"authenticated": authenticated},
    )

    return {
        "intent": "UNKNOWN_INTENT",
        "confidence": 0.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": True,
        "tool_called": "propose_support_fallback",
        "tool_result": {
            "state": "AWAITING_SUPPORT_CONFIRMATION",
            "unanswered_query": unanswered_query,
            "actions": [
                {"label": "Yes, connect me", "value": "Yes, connect me", "variant": "confirm"},
                {"label": "No, I'll rephrase", "value": "No, I'll rephrase", "variant": "default"},
            ],
        },
        "response_text": msg,
        "suggestions": FALLBACK_ACTION_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }


def build_decline_response(
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Builds the response when the user declines human support connection.
    Clears the pending escalation state without creating any ticket.
    """
    clear_pending_escalation(session_id=session_id, conversation_id=conversation_id)
    msg = DECLINE_RESPONSE_TELUGU if is_telugu else DECLINE_RESPONSE_ENGLISH

    return {
        "intent": "GENERAL_HELP",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": False,
        "tool_called": None,
        "tool_result": {
            "state": "SUPPORT_DECLINED",
        },
        "response_text": msg,
        "suggestions": DECLINE_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }
