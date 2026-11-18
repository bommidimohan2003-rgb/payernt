"""
Payent Agent Engine — Conversational Intelligence Hub
Unified aggregator for conversational intents:
- GREETING
- IDENTITY
- CAPABILITIES
- GRATITUDE
- FAREWELL
- WELCOME_BACK
Provides clean prefix stripping for mixed queries and fast-path dispatch.
"""

from typing import Any, Dict, Optional, Tuple

from agent_engine.greeting_responses import (
    extract_greeting_prefix,
    get_greeting_response,
    is_pure_greeting,
)
from agent_engine.identity_responses import (
    get_identity_response,
    is_identity_query,
)
from agent_engine.capabilities_responses import (
    get_capabilities_response,
    is_capabilities_query,
)
from agent_engine.gratitude_responses import (
    extract_gratitude_prefix,
    get_gratitude_response,
    is_pure_gratitude,
)
from agent_engine.farewell_responses import (
    get_farewell_response,
    is_pure_farewell,
)
from agent_engine.welcome_back_responses import (
    extract_welcome_back_prefix,
    get_welcome_back_response,
    is_pure_welcome_back,
)


def strip_conversational_prefixes(text: str) -> Tuple[Optional[str], str]:
    """
    Strips social/conversational prefixes from mixed queries so the underlying business intent can be processed.
    Examples:
        'Hi, what is my booking status?' -> ('greeting', 'what is my booking status?')
        'Hello, what is KYC?' -> ('greeting', 'what is KYC?')
        'Thanks, check my payment' -> ('gratitude', 'check my payment')
        'Thank you, but can you check my payment?' -> ('gratitude', 'can you check my payment?')
        'Hello, I received damaged equipment.' -> ('greeting', 'I received damaged equipment.')
        'Okay, let's continue checking my delivery.' -> ('welcome_back', 'checking my delivery')
    Returns:
        (prefix_type, substantive_query)
    """
    if not text or not isinstance(text, str):
        return None, ""

    cleaned = text.strip()

    # 1. Check gratitude prefix (e.g. "Thanks, check my payment")
    has_grat, rem_grat = extract_gratitude_prefix(cleaned)
    if has_grat and rem_grat:
        return "gratitude", rem_grat

    # 2. Check welcome back prefix (e.g. "Okay, let's continue checking my delivery")
    has_wb, rem_wb = extract_welcome_back_prefix(cleaned)
    if has_wb and rem_wb:
        return "welcome_back", rem_wb

    # 3. Check greeting prefix (e.g. "Hi, what is my booking status?")
    g_type, rem_g = extract_greeting_prefix(cleaned)
    if g_type is not None and rem_g:
        return "greeting", rem_g

    return None, cleaned
