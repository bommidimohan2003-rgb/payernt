"""
Test Suite: Advanced Conversational Intelligence Implementation for Payent AI Agent
Validates:
1. IDENTITY intent (English + Telugu/Tenglish, human-check, name-check, zero DB)
2. CAPABILITIES intent (English + Telugu/Tenglish, booking/payment/delivery checks, auth requirements)
3. GRATITUDE intent (English + Telugu/Tenglish, pure vs mixed queries)
4. FAREWELL intent (English + Telugu/Tenglish, session preservation)
5. WELCOME_BACK intent (English + Telugu/Tenglish, resuming context)
6. Mixed Queries & Conversational Prefix Stripping
7. Zero-resource fast-path validation (0 DB queries, 0 retrieval for social turns)
8. Safety & regression verification
"""

import pytest
from unittest.mock import MagicMock, patch

from agent_engine.context import AgentSessionContext
from agent_engine.hybrid_coordinator import HybridQueryCoordinator
from agent_engine.intent_classifier import IntentClassifier
from agent_engine.intent_definitions import IntentRegistry
from agent_engine.conversational_responses import strip_conversational_prefixes
from agent_engine.identity_responses import is_identity_query, get_identity_response
from agent_engine.capabilities_responses import is_capabilities_query, get_capabilities_response
from agent_engine.gratitude_responses import is_pure_gratitude, extract_gratitude_prefix
from agent_engine.farewell_responses import is_pure_farewell
from agent_engine.welcome_back_responses import is_pure_welcome_back, extract_welcome_back_prefix


@pytest.fixture
def coordinator():
    return HybridQueryCoordinator()


@pytest.fixture
def auth_context():
    return AgentSessionContext(
        session_id="test-conv-session-auth",
        user_id="user-101",
        full_name="Sai Kumar",
        user_email="saikumar@example.com",
        is_authenticated=True,
    )


@pytest.fixture
def guest_context():
    return AgentSessionContext(
        session_id="test-conv-session-guest",
        user_id=None,
        full_name="Guest Visitor",
        user_email=None,
        is_authenticated=False,
    )


# =============================================================================
# 1. IDENTITY INTENT TESTS
# =============================================================================

@pytest.mark.parametrize("query", [
    "Who are you?",
    "what is your name?",
    "what's your name",
    "Are you a human?",
    "Are you an AI?",
    "What is Payent Agent?",
    "Who am I talking to?",
])
def test_identity_english_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "IDENTITY"
    assert res["confidence"] == 1.0
    assert not res["requires_auth"]
    assert res["tool_called"] is None
    # Agent must never claim to be human
    assert "human" not in res["response_text"].lower() or "ai" in res["response_text"].lower()
    assert "payent" in res["response_text"].lower()


@pytest.mark.parametrize("query", [
    "Meeru evaru?",
    "Nee peru enti?",
    "Meeru human aa?",
    "Meeru AI aa?",
    "Nenu evaritho matladutunnanu?",
])
def test_identity_telugu_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "IDENTITY"
    assert res["confidence"] == 1.0
    # Must return Telugu response
    assert any(w in res["response_text"].lower() for w in ("nenu", "peru", "payent", "assistant"))


def test_identity_human_check_clarification(coordinator, guest_context):
    res = coordinator.coordinate_query("Are you a human?", guest_context)
    assert res["intent"] == "IDENTITY"
    assert "ai assistant" in res["response_text"].lower()
    assert "human support" in res["response_text"].lower()


# =============================================================================
# 2. CAPABILITIES INTENT TESTS
# =============================================================================

@pytest.mark.parametrize("query", [
    "What can you do?",
    "How can you help me?",
    "What services do you support?",
    "What are your capabilities?",
])
def test_capabilities_general_english(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "CAPABILITIES"
    assert res["confidence"] == 1.0
    assert res["tool_called"] is None
    text = res["response_text"].lower()
    # Mentions actual supported services
    assert any(w in text for w in ("rentals", "bookings", "kyc", "payment", "delivery", "support"))


@pytest.mark.parametrize("query", [
    "Meeru em cheyyagalru?",
    "Naaku ela help chestaru?",
    "Em services support chestaru?",
])
def test_capabilities_general_telugu(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "CAPABILITIES"
    assert res["confidence"] == 1.0
    text = res["response_text"].lower()
    assert any(w in text for w in ("payent", "guidelines", "bookings", "rentals", "support"))


@pytest.mark.parametrize("query,expected_keyword", [
    ("Can you help with bookings?", "booking"),
    ("Can you check my payment?", "payment"),
    ("Can you track my delivery?", "delivery"),
    ("Can you connect me to support?", "support"),
])
def test_capabilities_specific_inquiries(coordinator, guest_context, query, expected_keyword):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "CAPABILITIES"
    assert expected_keyword in res["response_text"].lower()
    # Explicitly mentions authentication needed for personal accounts when checking bookings/payments
    if expected_keyword in ("booking", "payment"):
        assert "authentication" in res["response_text"].lower() or "sign-in" in res["response_text"].lower() or "account" in res["response_text"].lower()


# =============================================================================
# 3. GRATITUDE INTENT TESTS
# =============================================================================

@pytest.mark.parametrize("query", [
    "Thank you.",
    "Thanks.",
    "Thanks a lot.",
    "Thank you so much.",
    "Appreciate it.",
    "That's helpful.",
    "Great, thanks.",
])
def test_gratitude_english_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "GRATITUDE"
    assert res["confidence"] == 1.0
    assert res["tool_called"] is None
    assert any(phrase in res["response_text"].lower() for phrase in ("welcome", "glad", "help"))


@pytest.mark.parametrize("query", [
    "Dhanyavadalu.",
    "Thank you anna.",
    "Thanks ra.",
    "Chala thanks.",
    "Helpful ga undi.",
    "Bagundi, thanks.",
])
def test_gratitude_telugu_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "GRATITUDE"
    assert res["confidence"] == 1.0
    text = res["response_text"].lower()
    assert any(w in text for w in ("swagatham", "santhosham", "help", "assistance"))


# =============================================================================
# 4. FAREWELL INTENT TESTS
# =============================================================================

@pytest.mark.parametrize("query", [
    "Bye.",
    "Goodbye.",
    "See you later.",
    "Talk to you later.",
    "That's all.",
    "I'm done.",
    "Have a nice day.",
])
def test_farewell_english_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "FAREWELL"
    assert res["confidence"] == 1.0
    assert res["tool_called"] is None
    text = res["response_text"].lower()
    assert any(w in text for w in ("goodbye", "see you", "great day", "return", "welcome"))


@pytest.mark.parametrize("query", [
    "Bye.",
    "Malli kaluddam.",
    "Velthanu.",
    "Sare, bye.",
    "Inka avasaram ledu.",
    "Thank you, bye.",
])
def test_farewell_telugu_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "FAREWELL"
    assert res["confidence"] == 1.0
    text = res["response_text"].lower()
    assert any(w in text for w in ("malli kaluddam", "bye", "dhanyavadalu", "day"))


# =============================================================================
# 5. WELCOME_BACK INTENT TESTS
# =============================================================================

@pytest.mark.parametrize("query", [
    "I'm back.",
    "Let's continue.",
    "I am back.",
    "We can continue.",
    "Continue our conversation.",
])
def test_welcome_back_english_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "WELCOME_BACK"
    assert res["confidence"] == 1.0
    assert res["tool_called"] is None
    text = res["response_text"].lower()
    assert any(w in text for w in ("welcome back", "continue", "help"))


@pytest.mark.parametrize("query", [
    "Malli vachanu.",
    "Manam continue cheddam.",
    "Nenu malli vachanu.",
    "Malli start cheddam.",
])
def test_welcome_back_telugu_recognition(coordinator, guest_context, query):
    res = coordinator.coordinate_query(query, guest_context)
    assert res["intent"] == "WELCOME_BACK"
    assert res["confidence"] == 1.0
    text = res["response_text"].lower()
    assert any(w in text for w in ("welcome back", "continue", "help", "cheddam"))


# =============================================================================
# 6. MIXED QUERIES & CONVERSATIONAL PREFIX STRIPPING TESTS
# =============================================================================

def test_prefix_stripping_utility():
    assert strip_conversational_prefixes("Thanks, check my payment") == ("gratitude", "check my payment")
    assert strip_conversational_prefixes("Thank you so much, check my delivery") == ("gratitude", "check my delivery")
    assert strip_conversational_prefixes("Okay, let's continue checking my delivery") == ("welcome_back", "checking my delivery")
    assert strip_conversational_prefixes("Hi, what is my booking status?") == ("greeting", "what is my booking status?")
    assert strip_conversational_prefixes("Hello, I received damaged equipment.") == ("greeting", "I received damaged equipment.")
    assert strip_conversational_prefixes("what is kyc?") == (None, "what is kyc?")


def test_mixed_query_thanks_check_my_payment(coordinator, auth_context):
    with patch("agent_engine.hybrid_coordinator.get_payment_status_tool") as mock_tool:
        mock_tool.return_value = {
            "status": "success",
            "payments": [{"payment_id": "PAY-101", "amount": 1500, "status": "completed"}],
        }
        res = coordinator.coordinate_query("Thanks, check my payment", auth_context)
        # Must NOT classify as pure GRATITUDE
        assert res["intent"] != "GRATITUDE"
        assert res["query_type"] == "LIVE_DB"
        assert res["tool_called"] == "payment_lookup"


def test_mixed_query_continue_checking_delivery(coordinator, auth_context):
    with patch("agent_engine.hybrid_coordinator.get_delivery_status_tool") as mock_tool:
        mock_tool.return_value = {
            "status": "success",
            "deliveries": [{"order_id": "ORD-1", "delivery_status": "in_transit"}],
        }
        res = coordinator.coordinate_query("Okay, let's continue checking my delivery", auth_context)
        # Must NOT classify as pure WELCOME_BACK
        assert res["intent"] != "WELCOME_BACK"
        assert res["query_type"] == "LIVE_DB"
        assert res["tool_called"] == "delivery_lookup"


def test_mixed_query_hello_damaged_equipment(coordinator, auth_context):
    res = coordinator.coordinate_query("Hello, I received damaged equipment.", auth_context)
    # Must NOT classify as pure GREETING
    assert res["intent"] != "GREETING"
    assert res["query_type"] == "ESCALATION"


def test_mixed_query_hi_booking_status(coordinator, auth_context):
    with patch("agent_engine.hybrid_coordinator.get_user_bookings_tool") as mock_tool:
        mock_tool.return_value = {
            "status": "success",
            "bookings": [{"booking_id": "ORD-999", "status": "active"}],
        }
        res = coordinator.coordinate_query("Hi, what is my booking status?", auth_context)
        assert res["intent"] != "GREETING"
        assert res["query_type"] == "LIVE_DB"


def test_mixed_query_hello_what_is_kyc(coordinator, guest_context):
    res = coordinator.coordinate_query("Hello, what is KYC?", guest_context)
    assert res["intent"] != "GREETING"
    assert res["query_type"] == "GUIDE"
    assert "kyc" in res["response_text"].lower() or "verification" in res["response_text"].lower()


# =============================================================================
# 7. ZERO RESOURCE UTILIZATION & PERFORMANCE
# =============================================================================

@pytest.mark.parametrize("query", [
    "Hi",
    "Who are you?",
    "What can you do?",
    "Thank you",
    "Goodbye",
    "I'm back",
])
def test_conversational_intents_zero_resource_fast_path(coordinator, guest_context, query):
    with patch("agent_engine.hybrid_coordinator.get_user_bookings_tool") as mock_b, \
         patch("agent_engine.hybrid_coordinator.get_payment_status_tool") as mock_p, \
         patch("agent_engine.hybrid_coordinator.get_delivery_status_tool") as mock_d, \
         patch("agent_engine.hybrid_coordinator.create_support_ticket") as mock_t:
        
        res = coordinator.coordinate_query(query, guest_context)
        # Assert no backend tools were triggered
        assert not mock_b.called
        assert not mock_p.called
        assert not mock_d.called
        assert not mock_t.called
        assert res["tool_called"] is None


# =============================================================================
# 8. REGRESSION TESTS (GREETINGS, UNKNOWN FALLBACK, AND INTENT REGISTRY)
# =============================================================================

def test_intent_registry_aliases():
    registry = IntentRegistry()
    assert registry.get("GREETING") is not None
    assert registry.get("IDENTITY") is not None
    assert registry.get("CAPABILITIES") is not None
    assert registry.get("GRATITUDE") is not None
    assert registry.get("FAREWELL") is not None
    assert registry.get("GOODBYE") is not None
    assert registry.get("WELCOME_BACK") is not None


def test_greeting_authenticated_personalization(coordinator, auth_context):
    res = coordinator.coordinate_query("Hi", auth_context)
    assert res["intent"] == "GREETING"
    assert "Sai Kumar" in res["response_text"]


def test_greeting_guest_no_leak(coordinator, guest_context):
    res = coordinator.coordinate_query("Hello", guest_context)
    assert res["intent"] == "GREETING"
    assert "Guest Visitor" not in res["response_text"]


def test_unknown_intent_offers_human_support(coordinator, guest_context):
    res = coordinator.coordinate_query("xyzabc quantum astrophysics warp drive 999", guest_context)
    assert res["intent"] == "UNKNOWN_INTENT"
    assert "human support team" in res["response_text"].lower()
    tool_res = res.get("tool_result") or {}
    assert tool_res.get("state") == "AWAITING_SUPPORT_CONFIRMATION"
