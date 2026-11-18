"""
Payent Agent Engine — Welcome Back Responses
Dedicated module for recognizing returning users who resume an active or existing conversation.
Welcomes users back politely without leaking private history or querying live databases unnecessarily.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


WELCOME_BACK_RESPONSES_ENGLISH = {
    "general": "Welcome back! How can I help you today?",
    "continue": "Sure! Let's continue. What would you like help with?",
}

WELCOME_BACK_RESPONSES_TELUGU = {
    "general": "Welcome back! Meeku ela help cheyyagalanu?",
    "continue": "Sure! Manam continue cheddam. Meeku denilo help kavali?",
}

DEFAULT_WELCOME_BACK_SUGGESTIONS = [
    "Check Booking Status",
    "Delivery Tracking",
    "KYC Verification",
    "Talk to Human Support",
]

WELCOME_BACK_PATTERNS = [
    r"^(i\'?m\s+back|i\s+am\s+back|i\'?m\s+here\s+again|back\s+again|welcome\s+back\??)\b",
    r"^(let\'?s\s+continue|continue(\s+our)?\s+conversation|can\s+we\s+continue)\b",
    r"^(malli\s+vachanu|nenu\s+malli\s+vachanu|manam\s+continue\s+cheddam|malli\s+start\s+cheddam)\b",
]

WELCOME_BACK_PREFIX_PATTERNS = [
    r"^(okay[,\s]+)?(let\'?s\s+continue|continue(\s+our)?\s+conversation)[,\s]+(with\s+|by\s+)?",
    r"^(i\'?m\s+back|i\s+am\s+back)[,!\.\s]+",
    r"^(manam\s+continue\s+cheddam|malli\s+start\s+cheddam)[,!\.\s]+",
]


def extract_welcome_back_prefix(text: str) -> Tuple[bool, str]:
    """
    Checks if text begins with a welcome back or resume phrase followed by a substantive query.
    Example:
        'Okay, let's continue checking my delivery' -> (True, 'checking my delivery')
        'I'm back, where is my booking?' -> (True, 'where is my booking?')
    """
    if not text or not isinstance(text, str):
        return False, ""

    cleaned = text.strip()
    lower_cleaned = cleaned.lower()

    for pat in WELCOME_BACK_PREFIX_PATTERNS:
        match = re.match(pat, lower_cleaned)
        if match:
            end_pos = match.end()
            remaining = cleaned[end_pos:].lstrip(" ,;:-_!?").strip()
            if remaining:
                return True, remaining

    return False, ""


def is_pure_welcome_back(text: str) -> Tuple[bool, str]:
    """
    Determines if user message is solely a welcome-back or continuation remark.
    Returns (True, subtype) where subtype is 'continue' or 'general'.
    """
    if not text or not isinstance(text, str):
        return False, "general"

    cleaned = text.strip().lower()
    stripped = re.sub(r"[!.,?;:\-~]+", " ", cleaned).strip()

    exact_continue = {
        "let's continue", "lets continue", "continue our conversation",
        "continue conversation", "manam continue cheddam", "malli start cheddam"
    }
    if stripped in exact_continue:
        return True, "continue"

    exact_general = {
        "i'm back", "im back", "i am back", "welcome back", "welcome back?",
        "i'm here again", "back again", "malli vachanu", "nenu malli vachanu",
    }
    if stripped in exact_general:
        return True, "general"

    for pat in WELCOME_BACK_PATTERNS:
        if re.search(pat, cleaned):
            business_words = {
                "booking", "order", "delivery", "payment", "refund", "kyc", "cancel",
                "track", "status", "damaged", "return", "equipment", "pin", "lender"
            }
            tokens = set(re.findall(r"\b[a-z]+\b", cleaned))
            if not (tokens & business_words):
                subtype = "continue" if "continue" in cleaned or "cheddam" in cleaned else "general"
                return True, subtype

    return False, "general"


def get_welcome_back_response(
    subtype: str = "general",
    user_name: Optional[str] = None,
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Builds a friendly welcome-back reply.
    Optionally personalizes with user name if authenticated.
    Never exposes private booking or payment history automatically.
    """
    templates = WELCOME_BACK_RESPONSES_TELUGU if is_telugu else WELCOME_BACK_RESPONSES_ENGLISH
    msg = templates.get(subtype, templates["general"])

    if user_name and isinstance(user_name, str) and user_name.strip() and user_name.strip() != "Guest Visitor":
        name = user_name.strip()
        if is_telugu:
            msg = f"Welcome back, {name}! Meeku ela help cheyyagalanu?"
        else:
            msg = f"Welcome back, {name}! How can I help you today?"

    return {
        "intent": "WELCOME_BACK",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": False,
        "tool_called": None,
        "tool_result": None,
        "response_text": msg,
        "suggestions": DEFAULT_WELCOME_BACK_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }
