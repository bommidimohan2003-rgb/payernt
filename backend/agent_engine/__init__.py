"""
Payent Agent Engine — Package Interface
Pure-Python deterministic intent detection, Telugu-English normalization,
entity extraction, authenticated session context, and secure database tools.
"""

from agent_engine.confidence import ConfidenceScorer, IntentCandidateScore
from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_auth_token,
    from_user_dict,
)
from agent_engine.entity_extractor import EntityExtractor, ExtractedEntities
from agent_engine.intent_classifier import ClassificationResult, IntentClassifier
from agent_engine.intent_definitions import (
    DEFAULT_INTENT_DEFINITIONS,
    IntentDefinition,
    IntentRegistry,
)
from agent_engine.persistence import (
    create_or_get_conversation,
    get_conversation,
    get_conversation_messages,
    init_agent_tables,
    save_agent_message,
)
from agent_engine.preprocessor import PreprocessedText, TextPreprocessor
from agent_engine.privacy import (
    mask_aadhaar,
    mask_card,
    mask_pan,
    mask_sensitive_text,
    sanitize_booking_record,
    sanitize_delivery_record,
    sanitize_kyc_record,
    sanitize_product_record,
    sanitize_user_record,
)
from agent_engine.response_templates import ResponseTemplate, get_response_template
from agent_engine.telugu_normalizer import TeluguNormalizer
from agent_engine.tool_router import AgentToolRouter
from agent_engine.tools import (
    check_cancellation_eligibility_tool,
    get_booking_details_tool,
    get_delivery_status_tool,
    get_kyc_status_tool,
    get_payment_status_tool,
    get_public_product_info_tool,
    get_refund_status_tool,
    get_user_bookings_tool,
)

__all__ = [
    # Phase 2 Core NLP
    "TextPreprocessor",
    "PreprocessedText",
    "TeluguNormalizer",
    "IntentDefinition",
    "IntentRegistry",
    "DEFAULT_INTENT_DEFINITIONS",
    "ConfidenceScorer",
    "IntentCandidateScore",
    "EntityExtractor",
    "ExtractedEntities",
    "ResponseTemplate",
    "get_response_template",
    "IntentClassifier",
    "ClassificationResult",
    # Phase 3 Session Context & Privacy
    "AgentSessionContext",
    "create_guest_context",
    "from_auth_token",
    "from_user_dict",
    "mask_aadhaar",
    "mask_pan",
    "mask_card",
    "mask_sensitive_text",
    "sanitize_booking_record",
    "sanitize_kyc_record",
    "sanitize_delivery_record",
    "sanitize_product_record",
    "sanitize_user_record",
    # Phase 3 Database Tools
    "get_user_bookings_tool",
    "get_booking_details_tool",
    "check_cancellation_eligibility_tool",
    "get_payment_status_tool",
    "get_refund_status_tool",
    "get_kyc_status_tool",
    "get_delivery_status_tool",
    "get_public_product_info_tool",
    # Phase 3 Persistence & Routing
    "init_agent_tables",
    "create_or_get_conversation",
    "get_conversation",
    "save_agent_message",
    "get_conversation_messages",
    "AgentToolRouter",
]
