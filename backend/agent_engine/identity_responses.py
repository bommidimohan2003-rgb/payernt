"""
Payent Agent Engine — Identity Responses
Dedicated module for answering questions about the identity of the paYent AI Agent.
Answers identity questions concisely without triggering database tools or knowledge retrieval.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


IDENTITY_RESPONSES_ENGLISH = {
    "general": (
        "I'm Payent Agent, your AI assistant for the Payent marketplace. "
        "I can help with renting, lending, bookings, KYC, payments, delivery and platform support."
    ),
    "human_check": (
        "I'm an AI assistant designed to help you with Payent services. "
        "For additional assistance, I can connect you with our human support team."
    ),
    "name_check": (
        "I am Payent Agent, your digital assistant for the Payent peer-to-peer rental marketplace."
    ),
}

IDENTITY_RESPONSES_TELUGU = {
    "general": (
        "Nenu Payent Agent, mee AI assistant ni. "
        "Gear rentals, bookings, KYC, payments, delivery mariyu platform support lo meeku help cheyyagalanu."
    ),
    "human_check": (
        "Nenu AI assistant ni, Payent services lo help cheyadaniki design cheyabaddanu. "
        "Additional assistance kosam, nenu mimmalni maa human support team tho connect cheyagalanu."
    ),
    "name_check": (
        "Naa peru Payent Agent. Nenu Payent rental marketplace digital assistant ni."
    ),
}

DEFAULT_IDENTITY_SUGGESTIONS = [
    "What can you do?",
    "Check Booking Status",
    "Delivery Tracking",
    "Talk to Human Support",
]

IDENTITY_PATTERNS: List[Tuple[str, str]] = [
    # Human / AI check
    (r"\b(are\s+you\s+(a\s+)?(human|person|real\s+person|bot|robot|ai|an\s+ai))\b", "human_check"),
    (r"\b(meeru\s+(human|manishi|ai|bot)\s*(aa|a)?)\b", "human_check"),
    # Name check
    (r"\b(what\s+is\s+your\s+name|what\'?s\s+your\s+name|tell\s+me\s+your\s+name)\b", "name_check"),
    (r"\b(nee\s+peru\s+enti|mee\s+peru\s+enti|peru\s+enti)\b", "name_check"),
    # General identity
    (r"\b(who\s+are\s+you|who\s+r\s+u|who\s+am\s+i\s+talking\s+to|what\s+is\s+payent\s+agent|who\s+is\s+payent\s+agent)\b", "general"),
    (r"\b(meeru\s+evaru|nuvvu\s+evaru|nenu\s+evaritho\s+matladutunnanu|evaritho\s+matladutunnanu)\b", "general"),
]


def is_identity_query(text: str) -> Tuple[bool, Optional[str]]:
    """
    Checks if a user inquiry is an identity query.
    Returns (True, subtype) if matched, otherwise (False, None).
    """
    if not text or not isinstance(text, str):
        return False, None

    cleaned = text.strip().lower()
    for pattern, subtype in IDENTITY_PATTERNS:
        if re.search(pattern, cleaned):
            return True, subtype

    return False, None


def get_identity_response(
    subtype: str = "general",
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Builds a concise, accurate identity response.
    Never claims to be human. Never queries live databases or external retrieval.
    """
    templates = IDENTITY_RESPONSES_TELUGU if is_telugu else IDENTITY_RESPONSES_ENGLISH
    resp_text = templates.get(subtype, templates["general"])

    return {
        "intent": "IDENTITY",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": False,
        "tool_called": None,
        "tool_result": None,
        "response_text": resp_text,
        "suggestions": DEFAULT_IDENTITY_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }
