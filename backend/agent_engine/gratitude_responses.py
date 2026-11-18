"""
Payent Agent Engine — Gratitude Responses
Dedicated module for responding naturally when users express appreciation or thanks.
Provides concise, polite acknowledgments without triggering retrieval, DB calls, or support tickets.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


GRATITUDE_RESPONSES_ENGLISH = [
    "You're welcome! Happy to help.",
    "You're always welcome! Let me know if you need anything else.",
    "Glad to help! Feel free to ask if you need further assistance.",
]

GRATITUDE_RESPONSES_TELUGU = [
    "Meeku swagatham! Inka emaina help kavala?",
    "Chala santhosham! Inka edaina assistance kavala?",
]

DEFAULT_GRATITUDE_SUGGESTIONS = [
    "Check Booking Status",
    "Delivery Tracking",
    "Browse Equipment",
    "Help Center",
]

GRATITUDE_PATTERNS = [
    r"^(thank\s+you(\s+so\s+much|\s+very\s+much|\s+a\s+lot)?)\b",
    r"^(thanks(\s+a\s+lot|\s+so\s+much|\s+again|\s+ton)?)\b",
    r"^(appreciate\s+it|much\s+appreciated|that\'?s\s+helpful|great[,\s]+thanks)\b",
    r"^(dhanyavadalu|chala\s+thanks|thank\s+you\s+anna|thanks\s+ra|helpful\s+ga\s+undi|bagundi[,\s]+thanks)\b",
]

# Patterns for extracting gratitude prefix when followed by substantive business question
GRATITUDE_PREFIX_PATTERNS = [
    r"^(thank\s+you(\s+so\s+much|\s+very\s+much|\s+a\s+lot)?)[,!\.\s]+(but\s+|and\s+)?",
    r"^(thanks(\s+a\s+lot|\s+so\s+much)?)[,!\.\s]+(but\s+|and\s+)?",
    r"^(appreciate\s+it|that\'?s\s+helpful|great[,\s]+thanks)[,!\.\s]+(but\s+|and\s+)?",
    r"^(dhanyavadalu|chala\s+thanks)[,!\.\s]+(kani\s+|mariyu\s+)?",
]


def extract_gratitude_prefix(text: str) -> Tuple[bool, str]:
    """
    Checks if text begins with gratitude followed by substantive request.
    Example:
        'Thank you, but can you check my payment?' -> (True, 'can you check my payment?')
        'Thanks, check my payment' -> (True, 'check my payment')
        'Thanks a lot' -> (False, '')
    """
    if not text or not isinstance(text, str):
        return False, ""

    cleaned = text.strip()
    lower_cleaned = cleaned.lower()

    for pat in GRATITUDE_PREFIX_PATTERNS:
        match = re.match(pat, lower_cleaned)
        if match:
            end_pos = match.end()
            remaining = cleaned[end_pos:].lstrip(" ,;:-_!?").strip()
            if remaining:
                return True, remaining

    return False, ""


def is_pure_gratitude(text: str) -> bool:
    """
    Determines if user input is solely an expression of gratitude without a substantive inquiry.
    """
    if not text or not isinstance(text, str):
        return False

    cleaned = text.strip().lower()
    # Strip common punctuation
    stripped = re.sub(r"[!.,?;:\-~]+", " ", cleaned).strip()

    # Exact matches
    exact_set = {
        "thank you", "thanks", "thanks a lot", "thank you so much", "thank you very much",
        "appreciate it", "much appreciated", "that's helpful", "thats helpful",
        "great thanks", "thanks ra", "thank you anna", "chala thanks", "dhanyavadalu",
        "helpful ga undi", "bagundi thanks", "super thanks", "ok thanks", "okay thanks",
    }
    if stripped in exact_set:
        return True

    # If the user is saying goodbye/bye along with thanks (e.g. "Thank you, bye"), it is a Farewell
    farewell_words = {"bye", "goodbye", "cya", "selavu", "vuntanu", "kaluddam", "velthanu"}
    tokens = set(re.findall(r"\b[a-z]+\b", cleaned))
    if tokens & farewell_words:
        return False

    for pat in GRATITUDE_PATTERNS:
        if re.search(pat, cleaned):
            # Check if there are substantive business words
            business_words = {
                "booking", "order", "delivery", "payment", "refund", "kyc", "cancel",
                "track", "status", "damaged", "return", "equipment", "pin", "lender"
            }
            tokens = set(re.findall(r"\b[a-z]+\b", cleaned))
            if not (tokens & business_words):
                return True

    return False


def get_gratitude_response(
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Returns a concise gratitude reply without executing tools or knowledge base searches.
    """
    templates = GRATITUDE_RESPONSES_TELUGU if is_telugu else GRATITUDE_RESPONSES_ENGLISH
    # Default to first template for determinism, or rotate
    resp_text = templates[0]

    return {
        "intent": "GRATITUDE",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": False,
        "tool_called": None,
        "tool_result": None,
        "response_text": resp_text,
        "suggestions": DEFAULT_GRATITUDE_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }
