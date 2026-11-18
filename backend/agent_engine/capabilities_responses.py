"""
Payent Agent Engine — Capabilities Responses
Dedicated module for explaining what the paYent AI Agent can actually help users with.
Accurately represents supported capabilities without promising unavailable backend actions.
"""

import re
from typing import Any, Dict, List, Optional, Tuple


CAPABILITIES_RESPONSES_ENGLISH = {
    "general": (
        "I'm Payent Agent. I can help you with platform guidelines, product rentals, "
        "bookings, KYC, payment status, delivery updates and human support."
    ),
    "booking": (
        "Yes, I can check your active bookings, rental schedules, and handover PINs. "
        "Please note that accessing personal booking records requires account authentication."
    ),
    "payment": (
        "Yes, I can check payment transactions and refund statuses. "
        "Accessing your personal payment records requires an authenticated account."
    ),
    "delivery": (
        "Yes, I can track delivery milestones and courier dispatch updates for your equipment rentals."
    ),
    "support": (
        "Yes, I can connect you directly with our human support team whenever you need dedicated assistance."
    ),
}

CAPABILITIES_RESPONSES_TELUGU = {
    "general": (
        "Nenu Payent Agent. Platform guidelines, product rentals, bookings, "
        "KYC, payment status, delivery updates mariyu human support lo meeku help cheyyagalanu."
    ),
    "booking": (
        "Avunu, nenu mee bookings mariyu rental schedules check cheyyagalanu. "
        "Personal booking records kosam account sign-in avasaram."
    ),
    "payment": (
        "Avunu, nenu payment transactions mariyu refund status check cheyyagalanu. "
        "Personal payment records kosam sign-in avasaram."
    ),
    "delivery": (
        "Avunu, nenu mee equipment rentals delivery milestones mariyu dispatch updates track cheyyagalanu."
    ),
    "support": (
        "Avunu, meeku additional assistance kavalsi vachinappudu nenu mimmalni direct-ga maa human support team tho connect cheyagalanu."
    ),
}

DEFAULT_CAPABILITY_SUGGESTIONS = [
    "Check Booking Status",
    "Delivery Tracking",
    "KYC Verification",
    "Refund Policy",
    "Talk to Human Support",
]

CAPABILITY_PATTERNS: List[Tuple[str, str]] = [
    # Specific capability checks
    (r"\b(can\s+you\s+(help\s+with\s+)?(check\s+my\s+)?booking(s)?|booking(s)?\s+check\s+cheyyagalara)\b", "booking"),
    (r"\b(can\s+you\s+(help\s+with\s+)?(check\s+my\s+)?payment(s)?|payment(s)?\s+status\s+cheppagalara)\b", "payment"),
    (r"\b(can\s+you\s+(help\s+with\s+)?(track\s+my\s+)?deliver(y|ies)|delivery\s+track\s+cheyyagalara)\b", "delivery"),
    (r"\b(can\s+you\s+(help\s+with\s+)?connect\s+(me\s+)?to\s+support|support\s+connect\s+cheyyagalara)\b", "support"),
    # General capabilities inquiries
    (r"\b(what\s+can\s+you\s+do|what\s+services\s+do\s+you\s+support|what\s+can\s+u\s+do|how\s+can\s+you\s+help(\s+me)?|how\s+can\s+u\s+help|what\s+are\s+your\s+capabilities)\b", "general"),
    (r"\b(meeru\s+em\s+(cheyyagalru|chestaru|help\s+chestaru)|naaku\s+ela\s+help\s+chestaru|em\s+services\s+support\s+chestaru)\b", "general"),
]


def is_capabilities_query(text: str) -> Tuple[bool, Optional[str]]:
    """
    Checks if a user inquiry is a capabilities inquiry.
    Returns (True, subtype) if matched, otherwise (False, None).
    """
    if not text or not isinstance(text, str):
        return False, None

    cleaned = text.strip().lower()

    # If the user is querying a specific transaction/booking/ticket ID, it is a business query, not a generic capability question
    if re.search(r"\b(ord|booking|ticket|tick)[-_][0-9a-zA-Z]+\b|\b(ord|booking|ticket|tick)[0-9]+\b", cleaned) or re.search(r"#[0-9]+", cleaned):
        return False, None

    for pattern, subtype in CAPABILITY_PATTERNS:
        if re.search(pattern, cleaned):
            return True, subtype

    return False, None


def get_capabilities_response(
    subtype: str = "general",
    is_telugu: bool = False,
    session_id: str = "",
    conversation_id: Optional[str] = None,
    authenticated: bool = False,
) -> Dict[str, Any]:
    """
    Builds a concise, realistic capabilities response.
    Never promises unavailable operations. Highlights authentication requirement for private records.
    """
    templates = CAPABILITIES_RESPONSES_TELUGU if is_telugu else CAPABILITIES_RESPONSES_ENGLISH
    resp_text = templates.get(subtype, templates["general"])

    return {
        "intent": "CAPABILITIES",
        "confidence": 1.0,
        "is_ambiguous": False,
        "requires_auth": False,
        "requires_confirmation": False,
        "tool_called": None,
        "tool_result": None,
        "response_text": resp_text,
        "suggestions": DEFAULT_CAPABILITY_SUGGESTIONS,
        "entities": {},
        "session_id": session_id,
        "conversation_id": conversation_id,
        "authenticated": authenticated,
        "query_type": "GUIDE",
    }
