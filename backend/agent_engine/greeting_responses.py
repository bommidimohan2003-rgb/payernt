"""
Payent Agent Engine — Greeting Responses
Dedicated multilingual greeting templates, recognition, and routing utilities.
Supports English, Telugu, and Tenglish greeting variations.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


# ============================================================================
# CANONICAL GREETING RESPONSES (English, Telugu, Tenglish)
# ============================================================================

GREETING_TEMPLATES_ENGLISH = {
    "morning": "Good morning! Welcome to Payent. What can I help you with today?",
    "afternoon": "Good afternoon! Welcome to Payent. How can I assist you today?",
    "evening": "Good evening! Welcome to Payent. How can I assist you today?",
    "namaste": "Namaste! Welcome to Payent. How can I help you today?",
    "how_are_you": "I'm doing well, thank you! Welcome to Payent. How can I help you today?",
    "general": "Hello! Welcome to Payent. How can I help you today?",
}

GREETING_TEMPLATES_TELUGU = {
    "namaskaram": "Namaste! Welcome to Payent. How can I help you today?",
    "ela_unnaru": "Bagunnanu! Thank you. Payent lo meeku ela help cheyyagalanu?",
    "general": "Namaste! Welcome to Payent. Payent lo meeku ela help cheyyagalanu?",
}

DEFAULT_GREETING_SUGGESTIONS = [
    "Check Booking Status",
    "Delivery Tracking",
    "KYC Verification",
    "Talk to Human Support",
]


# ============================================================================
# GREETING PATTERNS & REGEX
# ============================================================================

GREETING_PREFIX_PATTERNS = [
    # English time-based greetings
    (r"^(good\s+morning)\b[,!\.\s]*", "morning"),
    (r"^(good\s+afternoon)\b[,!\.\s]*", "afternoon"),
    (r"^(good\s+evening)\b[,!\.\s]*", "evening"),
    # How are you
    (r"^(how\s+are\s+you(\s+doing)?(\s+today)?)\b[?\s,!\.]*", "how_are_you"),
    (r"^(how\'?s\s+it\s+going)\b[?\s,!\.]*", "how_are_you"),
    # Telugu / Tenglish greetings
    (r"^(ela\s+unnaru|ela\s+unnav|bagunnara)\b[?\s,!\.]*", "ela_unnaru"),
    (r"^(namaskaram|namaskaramu)\b[,!\.\s]*", "namaskaram"),
    (r"^(namaste)\b[,!\.\s]*", "namaste"),
    # Brand-specific greetings
    (r"^(hi\s+payent(\s+agent)?|hello\s+payent(\s+agent)?|hey\s+payent(\s+agent)?)\b[,!\.\s]*", "general"),
    # General greetings
    (r"^(hi|hello|hey|greetings|howdy)\b[,!\.\s]*", "general"),
]


def extract_greeting_prefix(text: str) -> Tuple[Optional[str], str]:
    """
    Checks if a user message begins with a recognizable greeting.
    Returns:
        (greeting_type, remaining_query)
    If no greeting is detected:
        (None, text.strip())
    """
    if not text or not isinstance(text, str):
        return None, ""

    cleaned = text.strip()
    lower_cleaned = cleaned.lower()

    for pattern, g_type in GREETING_PREFIX_PATTERNS:
        match = re.match(pattern, lower_cleaned)
        if match:
            # Slice off the greeting prefix
            end_pos = match.end()
            remaining = cleaned[end_pos:].lstrip(" ,;:-_!?").strip()
            return g_type, remaining

    return None, cleaned


def is_pure_greeting(text: str) -> Tuple[bool, Optional[str]]:
    """
    Determines if the message is SOLELY a greeting with no substantive inquiry.
    Example:
        "Hi" -> (True, "general")
        "Good morning" -> (True, "morning")
        "Hi, what is my booking status?" -> (False, "general")
    """
    g_type, remaining = extract_greeting_prefix(text)
    if g_type is not None and not remaining:
        return True, g_type
    return False, g_type


def get_greeting_response(
    greeting_type: str,
    user_name: Optional[str] = None,
    is_telugu: bool = False,
) -> Dict[str, Any]:
    """
    Builds a concise, friendly, and professional greeting response.
    Never calls external databases, never runs retrieval, never creates tickets.
    """
    if is_telugu:
        if greeting_type in GREETING_TEMPLATES_TELUGU:
            msg = GREETING_TEMPLATES_TELUGU[greeting_type]
        elif greeting_type in ("namaste", "namaskaram"):
            msg = GREETING_TEMPLATES_TELUGU["namaskaram"]
        else:
            msg = GREETING_TEMPLATES_TELUGU["general"]
    else:
        msg = GREETING_TEMPLATES_ENGLISH.get(greeting_type, GREETING_TEMPLATES_ENGLISH["general"])

    # Optional personalization if user name is known
    if user_name and isinstance(user_name, str) and user_name.strip():
        name = user_name.strip()
        if greeting_type == "morning":
            msg = f"Good morning, {name}! Welcome to Payent. What can I help you with today?"
        elif greeting_type == "afternoon":
            msg = f"Good afternoon, {name}! Welcome to Payent. How can I assist you today?"
        elif greeting_type == "evening":
            msg = f"Good evening, {name}! Welcome to Payent. How can I assist you today?"
        elif greeting_type == "namaste":
            msg = f"Namaste, {name}! Welcome to Payent. How can I help you today?"
        elif greeting_type == "general":
            msg = f"Hello, {name}! Welcome to Payent. How can I help you today?"

    return {
        "response_text": msg,
        "suggestions": DEFAULT_GREETING_SUGGESTIONS,
        "intent": "GREETING",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "tool_called": None,
        "tool_result": None,
        "query_type": "GUIDE",
    }
