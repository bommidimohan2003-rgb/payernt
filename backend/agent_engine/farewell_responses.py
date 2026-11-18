"""
Payent Agent Engine — Farewell Responses
Dedicated module for handling natural conversation endings and goodbyes.
Keeps replies polite and brief while preserving conversation history and session state.
"""

import re
from typing import Any, Dict, List, Optional


FAREWELL_RESPONSES_ENGLISH = [
    "Goodbye! Thank you for using Payent. Have a great day!",
    "See you again! We're here whenever you need assistance.",
    "Have a wonderful day! Feel free to return anytime.",
]

FAREWELL_RESPONSES_TELUGU = [
    "Malli kaluddam! Have a great day.",
    "Sare, bye! Payent ni use chesinanduku dhanyavadalu.",
]

DEFAULT_FAREWELL_SUGGESTIONS = [
    "Browse Equipment",
    "Help Center",
    "Customer Support",
]

FAREWELL_PATTERNS = [
    r"^(bye(\s+bye)?|goodbye|see\s+you(\s+later|\s+soon|\s+again)?|talk\s+to\s+you\s+later)\b",
    r"^(that\'?s\s+all|i\'?m\s+done|have\s+a\s+nice\s+day|have\s+a\s+good\s+one|cya|take\s+care)\b",
    r"^(malli\s+kaluddam|velthanu|sare[,\s]+bye|inka\s+avasaram\s+ledu|thank\s+you[,\s]+bye|selavu|vuntanu)\b",
]


def is_pure_farewell(text: str) -> bool:
    """
    Determines if user message is solely a farewell remark.
    """
    if not text or not isinstance(text, str):
        return False

    cleaned = text.strip().lower()
    stripped = re.sub(r"[!.,?;:\-~]+", " ", cleaned).strip()

    exact_set = {
        "bye", "goodbye", "bye bye", "see you later", "see you", "talk to you later",
        "that's all", "thats all", "i'm done", "im done", "have a nice day",
        "have a good day", "cya", "take care", "malli kaluddam", "velthanu",
        "sare bye", "inka avasaram ledu", "thank you bye", "selavu", "vuntanu",
    }
    if stripped in exact_set:
        return True

    for pat in FAREWELL_PATTERNS:
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


def get_farewell_response(
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Returns a brief, friendly farewell response.
    Never deletes the conversation thread or logs out the user.
    """
    templates = FAREWELL_RESPONSES_TELUGU if is_telugu else FAREWELL_RESPONSES_ENGLISH
    resp_text = templates[0]

    return {
        "intent": "FAREWELL",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": False,
        "tool_called": None,
        "tool_result": None,
        "response_text": resp_text,
        "suggestions": DEFAULT_FAREWELL_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }
