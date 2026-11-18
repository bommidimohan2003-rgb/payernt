"""
PAYENT AI AGENT — GREETING SYSTEM & UNKNOWN QUESTION HUMAN SUPPORT FALLBACK
Comprehensive Test Suite verifying:
1. Intelligent Greeting Recognition & Routing (English, Telugu, Tenglish, Brand)
2. Greeting Stripping for Mixed Queries ("Hi, what is my booking status?")
3. Zero Resource Overhead for Pure Greetings (No DB, No Retrieval)
4. Unknown Question Detection (Honest Fallback, Confidence 0.0, No Hallucinations)
5. Multilingual Fallback Prompts (English & Telugu)
6. Multi-Turn Human Support Confirmation ("Yes, connect me" -> TICK-..., "No, I'll rephrase")
7. Guest Auth Gate for Ticket Creation
8. Session Isolation & Duplicate Prevention
9. Regression Verification across GUIDE, LIVE_DB, HYBRID, and ESCALATION routes
"""

import time
import pytest
from unittest.mock import MagicMock, patch

from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_user_dict,
)
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.persistence import (
    create_or_get_conversation,
    reset_persistence_state,
)
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
)
from agent_engine.tool_router import AgentToolRouter
from agent_engine.greeting_responses import (
    extract_greeting_prefix,
    is_pure_greeting,
    get_greeting_response,
)
from agent_engine.fallback_responses import (
    is_affirmative_response,
    is_negative_response,
    build_unknown_fallback_response,
    build_decline_response,
)
from database import (
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_USERS,
    MOCK_SUPPORT_TICKETS,
    create_order,
)


@pytest.fixture(autouse=True)
def setup_clean_env():
    """Ensure clean persistence, knowledge, and mock database state for each test."""
    reset_persistence_state()
    reset_knowledge_state()
    MOCK_SUPPORT_TICKETS.clear()
    yield
    reset_persistence_state()
    reset_knowledge_state()
    MOCK_SUPPORT_TICKETS.clear()


@pytest.fixture
def mock_user_and_orders():
    """Seeds test user, orders, and KYC records."""
    t_id = int(time.time() * 1000)
    user_email = f"renter_{t_id}@payent.test"

    MOCK_USERS[user_email] = {
        "email": user_email,
        "full_name": "Rohan Sharma",
        "role": "customer",
        "status": "approved",
    }

    order_id = f"ord_{t_id}"
    order = {
        "id": order_id,
        "user_email": user_email,
        "lender_email": "lender@payent.test",
        "productId": f"prod_{t_id}",
        "productTitle": "Sony FX3 Cinema Camera",
        "startDate": "2026-11-20",
        "endDate": "2026-11-25",
        "total": 7500.0,
        "status": "confirmed",
        "payment_status": "COMPLETED",
        "delivery_method": "pickup",
        "pickup_location": "Hyderabad Hub",
    }
    create_order(user_email, order)
    MOCK_ORDERS[order_id] = order

    MOCK_KYC_VERIFICATIONS[f"kyc_{user_email}"] = {
        "id": f"kyc_{user_email}",
        "email": user_email,
        "account_type": "payrent",
        "status": "APPROVED",
        "document_type": "PAN",
        "document_number_masked": "ABCDE1234F",
    }

    return {
        "user_email": user_email,
        "full_name": "Rohan Sharma",
        "order_id": order_id,
    }


@pytest.fixture
def populated_knowledge_manager() -> KnowledgeManager:
    """Pre-seeds verified knowledge base articles."""
    km = KnowledgeManager(use_in_memory=True)

    # 1. Guide: What is Payent?
    e1 = km.create_entry(
        category="General information",
        canonical_question="What is Payent?",
        answer_markdown="Payent is a peer-to-peer premium equipment rental platform.",
        retrieval_type="guide",
        synonyms=["Explain Payent", "About Payent", "Payent ante enti"],
    )
    km.publish_entry(e1["id"], approved_by="admin@payent.in")

    # 2. Guide: KYC Information
    e2 = km.create_entry(
        category="KYC verification",
        canonical_question="What is KYC?",
        answer_markdown="KYC means Know Your Customer. Renters submit a PAN card for identity verification.",
        retrieval_type="guide",
        synonyms=["Explain KYC", "KYC requirements", "KYC ante enti"],
    )
    km.publish_entry(e2["id"], approved_by="admin@payent.in")

    # 3. Hybrid: Cancellation Policy
    e3 = km.create_entry(
        category="Booking and rental",
        canonical_question="What is the cancellation policy?",
        answer_markdown="Cancellations made 24+ hours before the rental start receive a 100% full refund.",
        retrieval_type="hybrid",
        synonyms=["Cancel policy", "Cancellation rules"],
    )
    km.publish_entry(e3["id"], approved_by="admin@payent.in")

    return km


@pytest.fixture
def coordinator(populated_knowledge_manager: KnowledgeManager) -> HybridQueryCoordinator:
    im = KnowledgeIndexManager(knowledge_manager=populated_knowledge_manager)
    im.refresh_index()
    return HybridQueryCoordinator(knowledge_manager=populated_knowledge_manager, index_manager=im)


@pytest.fixture
def router(coordinator: HybridQueryCoordinator) -> AgentToolRouter:
    return AgentToolRouter(coordinator=coordinator)


# ============================================================================
# 1. GREETING TESTS (English, Telugu, Tenglish, Brand)
# ============================================================================

def test_greeting_english_pure_hi(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Hi", guest)
    assert res["intent"] == "GREETING"
    assert "Welcome to Payent" in res["response_text"]
    assert res["requires_auth"] is False
    assert res["tool_called"] is None


def test_greeting_english_pure_hello(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Hello", guest)
    assert res["intent"] == "GREETING"
    assert "Welcome to Payent" in res["response_text"]


def test_greeting_english_pure_hey(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Hey", guest)
    assert res["intent"] == "GREETING"
    assert "Welcome to Payent" in res["response_text"]


def test_greeting_english_good_morning(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Good morning", guest)
    assert res["intent"] == "GREETING"
    assert "Good morning!" in res["response_text"]
    assert "Welcome to Payent" in res["response_text"]


def test_greeting_english_good_afternoon(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Good afternoon", guest)
    assert res["intent"] == "GREETING"
    assert "Good afternoon!" in res["response_text"]


def test_greeting_english_good_evening(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Good evening", guest)
    assert res["intent"] == "GREETING"
    assert "Good evening!" in res["response_text"]


def test_greeting_english_how_are_you(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("How are you?", guest)
    assert res["intent"] == "GREETING"
    assert "doing well" in res["response_text"].lower() or "welcome to payent" in res["response_text"].lower()


def test_greeting_english_namaste(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Namaste", guest)
    assert res["intent"] == "GREETING"
    assert "Namaste!" in res["response_text"]


def test_greeting_brand_hi_payent(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Hi Payent", guest)
    assert res["intent"] == "GREETING"
    assert "Welcome to Payent" in res["response_text"]


def test_greeting_brand_hello_payent_agent(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Hello Payent Agent", guest)
    assert res["intent"] == "GREETING"
    assert "Welcome to Payent" in res["response_text"]


def test_greeting_telugu_namaskaram(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Namaskaram", guest)
    assert res["intent"] == "GREETING"
    assert "Namaste!" in res["response_text"]


def test_greeting_telugu_ela_unnaru(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Ela unnaru?", guest)
    assert res["intent"] == "GREETING"
    assert "Bagunnanu!" in res["response_text"]
    assert "Payent lo meeku ela help cheyyagalanu?" in res["response_text"]


def test_greeting_telugu_bagunnara(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Bagunnara?", guest)
    assert res["intent"] == "GREETING"
    assert "Bagunnanu!" in res["response_text"]


def test_greeting_telugu_ela_unnav(router: AgentToolRouter):
    guest = create_guest_context()
    res = router.process_message("Ela unnav?", guest)
    assert res["intent"] == "GREETING"
    assert "Bagunnanu!" in res["response_text"]


def test_greeting_authenticated_user_personalized(router: AgentToolRouter, mock_user_and_orders):
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    res = router.process_message("Good morning", auth_ctx)
    assert res["intent"] == "GREETING"
    assert "Good morning, Rohan Sharma!" in res["response_text"]


# ============================================================================
# 2. GREETING STRIPPING & MIXED QUERY ROUTING
# ============================================================================

def test_mixed_greeting_hi_what_is_my_booking_status(router: AgentToolRouter, mock_user_and_orders):
    """'Hi, what is my booking status?' must strip greeting and route to LIVE_DB."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    res = router.process_message("Hi, what is my booking status?", auth_ctx)
    assert res["intent"] == "BOOKING_STATUS"
    assert res["query_type"] == QueryType.LIVE_DB.value
    assert "Sony FX3" in res["response_text"] or mock_user_and_orders["order_id"] in res["response_text"]


def test_mixed_greeting_hello_what_is_kyc(router: AgentToolRouter):
    """'Hello, what is KYC?' must strip greeting and route to GUIDE."""
    guest = create_guest_context()
    res = router.process_message("Hello, what is KYC?", guest)
    assert res["intent"] == "KYC_INFO"
    assert res["query_type"] == QueryType.GUIDE.value
    assert "Know Your Customer" in res["response_text"] or "PAN" in res["response_text"]


def test_pure_greeting_does_not_call_retrieval_or_db(coordinator: HybridQueryCoordinator):
    """Pure greeting must bypass TF-IDF retrieval and DB lookups."""
    guest = create_guest_context()
    with patch.object(coordinator.index_manager, "get_retriever") as mock_get_retriever:
        res = coordinator.coordinate_query("Good morning", guest)
        assert res["intent"] == "GREETING"
        # Index retriever must not be called for pure greetings
        assert mock_get_retriever.call_count == 0


# ============================================================================
# 3. UNKNOWN QUESTION DETECTION & HONEST FALLBACK
# ============================================================================

def test_unknown_out_of_scope_quantum_physics(router: AgentToolRouter):
    """Unsupported question triggers honest fallback offering human support."""
    guest = create_guest_context()
    res = router.process_message("What is quantum physics?", guest)
    assert res["intent"] == "UNKNOWN_INTENT"
    assert res["confidence"] == 0.0
    assert "couldn't understand your question" in res["response_text"].lower()
    assert "connect you with our human support team" in res["response_text"].lower()
    assert res["tool_called"] == "propose_support_fallback"
    assert res["tool_result"]["state"] == "AWAITING_SUPPORT_CONFIRMATION"
    assert "Yes, connect me" in res["suggestions"]
    assert "No, I'll rephrase" in res["suggestions"]


def test_unknown_nonsense_input(router: AgentToolRouter):
    """Gibberish or random letters triggers unknown fallback."""
    guest = create_guest_context()
    res = router.process_message("asdfghjkl zxcvbnm", guest)
    assert res["intent"] == "UNKNOWN_INTENT"
    assert res["confidence"] == 0.0
    assert "couldn't understand your question" in res["response_text"].lower()


def test_unknown_telugu_query(router: AgentToolRouter):
    """Telugu unsupported question triggers Telugu fallback."""
    guest = create_guest_context()
    res = router.process_message("Ee cinema hit aa?", guest)
    assert res["intent"] == "UNKNOWN_INTENT"
    assert "understand chesukolekapoyanu" in res["response_text"]
    assert "human support team tho connect" in res["response_text"]


# ============================================================================
# 4. MULTI-TURN HUMAN SUPPORT ESCALATION CONFIRMATION
# ============================================================================

def test_multiturn_support_confirmation_yes_authenticated(router: AgentToolRouter, mock_user_and_orders):
    """User asks unknown question -> agent proposes support -> user answers 'Yes, connect me' -> creates real ticket."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("Can I book a rocket to Mars on Payent?", auth_ctx)
    cid = res1.get("conversation_id")
    assert res1["intent"] == "UNKNOWN_INTENT"
    assert res1["tool_result"]["state"] == "AWAITING_SUPPORT_CONFIRMATION"

    # Turn 2: User confirms
    res2 = router.process_message("Yes, connect me", auth_ctx, conversation_id=cid)
    assert res2["intent"] == "HUMAN_SUPPORT"
    assert res2["tool_called"] == "create_support_ticket"
    assert res2["tool_result"] is not None
    assert res2["tool_result"]["state"] == "SUPPORT_ACCEPTED"
    assert "ticket_id" in res2["tool_result"]
    assert str(res2["tool_result"]["ticket_id"]).startswith("TICK-")
    assert "I have connected you with our human support team" in res2["response_text"]


def test_multiturn_support_confirmation_no_declined(router: AgentToolRouter, mock_user_and_orders):
    """User asks unknown question -> agent proposes support -> user answers 'No, I'll rephrase' -> declines gracefully."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("What is the speed of light in vacuum?", auth_ctx)
    cid = res1.get("conversation_id")

    # Turn 2: User declines
    res2 = router.process_message("No, I'll rephrase", auth_ctx, conversation_id=cid)
    assert res2["intent"] in ("GENERAL_HELP", "UNKNOWN_INTENT", "SUPPORT_DECLINED")
    assert res2["tool_called"] is None
    assert "No problem! Please rephrase your question" in res2["response_text"]
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_multiturn_support_confirmation_telugu_yes(router: AgentToolRouter, mock_user_and_orders):
    """Telugu confirmation 'Avunu' creates ticket."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown query
    res1 = router.process_message("Payent lo rocket unda?", auth_ctx)
    cid = res1.get("conversation_id")

    # Turn 2: Telugu affirmative
    res2 = router.process_message("Avunu", auth_ctx, conversation_id=cid)
    assert res2["intent"] == "HUMAN_SUPPORT"
    assert res2["tool_result"]["state"] == "SUPPORT_ACCEPTED"
    assert str(res2["tool_result"]["ticket_id"]).startswith("TICK-")


def test_multiturn_support_rephrase_cancels_confirmation(router: AgentToolRouter, mock_user_and_orders):
    """User asks unknown question, but instead of Yes/No, asks a valid question -> cancels confirmation and answers."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("How do I fly an airplane?", auth_ctx)
    cid = res1.get("conversation_id")

    # Turn 2: User changes topic to a valid supported question
    res2 = router.process_message("What is Payent?", auth_ctx, conversation_id=cid)
    assert res2["intent"] == "ABOUT_PAYENT" or res2["query_type"] == QueryType.GUIDE.value
    assert "peer-to-peer" in res2["response_text"].lower()
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_standalone_yes_without_escalation_does_not_create_ticket(router: AgentToolRouter, mock_user_and_orders):
    """A standalone 'Yes' with no prior escalation prompt must NOT create a support ticket."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    res = router.process_message("Yes", auth_ctx)
    assert res["tool_called"] != "create_support_ticket"
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_multiturn_support_guest_requires_auth(router: AgentToolRouter):
    """Guest asking unknown question and answering 'Yes' must be prompted to log in."""
    guest = create_guest_context()

    # Turn 1: Unknown question
    res1 = router.process_message("What is quantum physics?", guest)
    cid = res1.get("conversation_id")

    # Turn 2: Guest clicks "Yes, connect me"
    res2 = router.process_message("Yes, connect me", guest, conversation_id=cid)
    assert res2["intent"] == "HUMAN_SUPPORT"
    assert res2["requires_auth"] is True
    assert "please sign in to your payent account" in res2["response_text"].lower()
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_duplicate_confirmation_reuses_existing_ticket(router: AgentToolRouter, mock_user_and_orders):
    """Confirming twice in the same conversation reuses the active ticket rather than creating duplicates."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("What is dark matter?", auth_ctx)
    cid = res1.get("conversation_id")

    # Turn 2: User confirms
    res2 = router.process_message("Yes, connect me", auth_ctx, conversation_id=cid)
    ticket_id_1 = res2["tool_result"]["ticket_id"]
    assert str(ticket_id_1).startswith("TICK-")

    # Turn 3: User confirms again in same thread
    res3 = router.process_message("Yes, please connect me", auth_ctx, conversation_id=cid)
    ticket_id_2 = res3["tool_result"]["ticket_id"]
    assert ticket_id_1 == ticket_id_2
    assert res3["tool_result"].get("is_duplicate") is True
    assert "already have an active support ticket" in res3["response_text"].lower()


def test_session_isolation_user_a_cannot_affect_user_b(router: AgentToolRouter, mock_user_and_orders):
    """User A's pending support confirmation cannot be completed by User B in a separate conversation."""
    user_a = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    user_b_email = "user_b@payent.test"
    MOCK_USERS[user_b_email] = {
        "email": user_b_email,
        "full_name": "User B",
        "role": "customer",
        "status": "approved",
    }
    user_b = from_user_dict(MOCK_USERS[user_b_email])

    # User A has an unanswered question
    res_a = router.process_message("Can I rent a submarine?", user_a)
    cid_a = res_a.get("conversation_id")

    # User B says "Yes" in their own session
    res_b = router.process_message("Yes", user_b)
    # User B must not create a ticket linked to User A
    assert res_b["tool_called"] != "create_support_ticket"


# ============================================================================
# 5. REGRESSION TESTS (Existing 4 Execution Routes Preserved)
# ============================================================================

def test_regression_guide_what_is_payent(router: AgentToolRouter):
    """Regression: 'What is Payent?' routes to GUIDE with confidence >= 0.8."""
    guest = create_guest_context()
    res = router.process_message("What is Payent?", guest)
    assert res["query_type"] == QueryType.GUIDE.value
    assert res["confidence"] >= 0.8
    assert "peer-to-peer" in res["response_text"].lower()


def test_regression_live_db_booking_status(router: AgentToolRouter, mock_user_and_orders):
    """Regression: 'What is my booking status?' routes to LIVE_DB."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    res = router.process_message("What is my booking status?", auth_ctx)
    assert res["query_type"] == QueryType.LIVE_DB.value
    assert res["intent"] == "BOOKING_STATUS"
    assert "Sony FX3" in res["response_text"]


def test_regression_hybrid_kyc_and_approval(router: AgentToolRouter, mock_user_and_orders):
    """Regression: 'What is KYC and is my KYC approved?' routes to HYBRID."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    res = router.process_message("What is KYC and is my KYC approved?", auth_ctx)
    assert res["query_type"] == QueryType.HYBRID.value
    assert "APPROVED" in res["response_text"]
    assert "Know Your Customer" in res["response_text"] or "PAN" in res["response_text"]


def test_regression_action_escalation_damaged_equipment(router: AgentToolRouter, mock_user_and_orders):
    """Regression: 'I received damaged equipment' routes to ESCALATION / ACTION."""
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])
    res = router.process_message("I received damaged equipment", auth_ctx)
    assert res["query_type"] == QueryType.ESCALATION.value
    assert res.get("requires_confirmation") is True or res.get("tool_called") in ("propose_escalation", "create_support_ticket")
