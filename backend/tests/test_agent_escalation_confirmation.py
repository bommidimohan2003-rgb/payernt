"""
PAYENT AGENT — HUMAN SUPPORT ESCALATION CONFIRMATION TEST SUITE
Comprehensive verification for deterministic human-support escalation confirmation,
recovering from the fallback loop, idempotency, failure recovery, and non-regression.

Tests:
1. Test 1 — Unknown question triggers fallback without ticket
2. Test 2 — Affirmative button creates and persists ticket with real ID
3. Test 3 — Typed confirmation (English & Telugu/Tenglish) creates ticket
4. Test 4 — Negative button / decline cancels without ticket
5. Test 5 — Ordinary affirmative message without pending escalation does not create ticket
6. Test 6 — Ticket creation failure displays honest error with retry option
7. Test 7 — Repeated confirmation is idempotent (at most one ticket created)
8. Test 8 — Existing complaint escalation (damage/dispute) remains working
"""

import time
import pytest
from unittest.mock import MagicMock, patch

from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_user_dict,
)
from agent_engine.fallback_responses import (
    _PENDING_ESCALATIONS,
    clear_pending_escalation,
    get_pending_escalation,
    is_affirmative_response,
    is_negative_response,
    register_pending_escalation,
    reset_pending_escalations,
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
    reset_pending_escalations()
    MOCK_SUPPORT_TICKETS.clear()
    yield
    reset_persistence_state()
    reset_knowledge_state()
    reset_pending_escalations()
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
def router() -> AgentToolRouter:
    """Provides standard AgentToolRouter instance."""
    return AgentToolRouter()


# ============================================================================
# TEST 1 — UNKNOWN QUESTION TRIGGERS FALLBACK WITHOUT TICKET
# ============================================================================

def test_1_unknown_question_triggers_fallback_without_ticket(router: AgentToolRouter, mock_user_and_orders):
    """
    User asks: 'Can you teleport me to Mars?'
    Expected:
    - Unknown-intent fallback appears.
    - Escalation confirmation actions appear (Yes, connect me / No, I'll rephrase).
    - requires_confirmation is True.
    - No support ticket is created yet.
    """
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    res = router.process_message("Can you teleport me to Mars?", auth_ctx)

    assert res["intent"] == "UNKNOWN_INTENT"
    assert res["tool_called"] == "propose_support_fallback"
    assert res["requires_confirmation"] is True
    assert res["tool_result"]["state"] == "AWAITING_SUPPORT_CONFIRMATION"
    assert "teleport me to mars" in res["tool_result"]["unanswered_query"].lower()
    assert "human support team" in res["response_text"].lower()

    # Verify action suggestions
    assert "Yes, connect me" in res["suggestions"]
    assert "No, I'll rephrase" in res["suggestions"]

    # Verify zero tickets created at this stage
    assert len(MOCK_SUPPORT_TICKETS) == 0


# ============================================================================
# TEST 2 — AFFIRMATIVE BUTTON CREATES AND PERSISTS TICKET WITH REAL ID
# ============================================================================

def test_2_affirmative_button_creates_ticket_with_real_id(router: AgentToolRouter, mock_user_and_orders):
    """
    User clicks 'Yes, connect me' with action='confirm_escalation'.
    Expected:
    - Escalation action executes deterministically.
    - Real support ticket is created in database (TICK-...).
    - Response displays the actual ticket ID.
    - Original fallback response is NOT repeated.
    """
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("Can you teleport me to Mars?", auth_ctx)
    cid = res1.get("conversation_id")
    assert res1["intent"] == "UNKNOWN_INTENT"
    assert len(MOCK_SUPPORT_TICKETS) == 0

    # Turn 2: User clicks affirmative button (with structured action)
    res2 = router.process_message("Yes, connect me", auth_ctx, conversation_id=cid, action="confirm_escalation")

    assert res2["intent"] == "HUMAN_SUPPORT"
    assert res2["tool_called"] == "create_support_ticket"
    assert res2["tool_result"] is not None
    assert res2["tool_result"]["state"] == "SUPPORT_ACCEPTED"
    assert res2["tool_result"]["success"] is True

    ticket_id = res2["tool_result"].get("ticket_id")
    assert ticket_id is not None
    assert str(ticket_id).startswith("TICK-")

    # Verify actual ticket ID appears in response text
    assert f"#{ticket_id}" in res2["response_text"]
    assert "Your support request has been created successfully." in res2["response_text"]
    # Guarantee the fallback loop is broken (fallback prompt is NOT repeated)
    assert "I'm sorry, I couldn't understand your question" not in res2["response_text"]

    # Verify persisted in database
    assert ticket_id in MOCK_SUPPORT_TICKETS
    saved_ticket = MOCK_SUPPORT_TICKETS[ticket_id]
    assert saved_ticket["user_email"] == mock_user_and_orders["user_email"]
    assert saved_ticket["status"] == "open"
    assert "teleport me to mars" in saved_ticket["messages"][0]["content"].lower()


# ============================================================================
# TEST 3 — TYPED CONFIRMATION (ENGLISH & TELUGU/TENGLISH)
# ============================================================================

@pytest.mark.parametrize("typed_affirmation", [
    "Yes, connect me",
    "Yes",
    "Connect me",
    "Talk to a human",
    "Human support",
    "I need an agent",
    "Please connect me to support",
    "Avunu, connect cheyyandi",
    "Human support kavali",
])
def test_3_typed_confirmation_variants(router: AgentToolRouter, mock_user_and_orders, typed_affirmation):
    """
    User types an affirmative response instead of clicking the button.
    All required variations (English and Telugu/Tenglish) must trigger escalation
    and return the ticket ID without repeating the fallback.
    """
    reset_pending_escalations()
    MOCK_SUPPORT_TICKETS.clear()

    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("How do I build a time machine on Payent?", auth_ctx)
    cid = res1.get("conversation_id")
    assert res1["intent"] == "UNKNOWN_INTENT"

    # Turn 2: User types confirmation phrase
    res2 = router.process_message(typed_affirmation, auth_ctx, conversation_id=cid)

    assert res2["intent"] == "HUMAN_SUPPORT"
    assert res2["tool_called"] == "create_support_ticket"
    assert res2["tool_result"]["state"] == "SUPPORT_ACCEPTED"
    ticket_id = res2["tool_result"]["ticket_id"]
    assert str(ticket_id).startswith("TICK-")
    assert f"#{ticket_id}" in res2["response_text"]
    assert "I'm sorry, I couldn't understand your question" not in res2["response_text"]


# ============================================================================
# TEST 4 — NEGATIVE BUTTON / DECLINE
# ============================================================================

@pytest.mark.parametrize("negative_input,action", [
    ("No, I'll rephrase", "cancel_escalation"),
    ("No, I'll rephrase", None),
    ("No", None),
    ("Let me rephrase", None),
    ("I'll ask differently", None),
    ("Vaddu", None),
])
def test_4_negative_button_cancels_without_ticket(router: AgentToolRouter, mock_user_and_orders, negative_input, action):
    """
    User clicks 'No, I'll rephrase' or types a negative cancellation.
    Expected:
    - Pending escalation is cancelled.
    - Zero support tickets created.
    - Polite decline response returned.
    - User can subsequently submit a new question normally.
    """
    reset_pending_escalations()
    MOCK_SUPPORT_TICKETS.clear()

    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("Can you teleport me to Mars?", auth_ctx)
    cid = res1.get("conversation_id")
    assert res1["intent"] == "UNKNOWN_INTENT"

    # Turn 2: Decline
    res2 = router.process_message(negative_input, auth_ctx, conversation_id=cid, action=action)
    assert res2["intent"] == "GENERAL_HELP"
    assert res2["tool_result"]["state"] == "SUPPORT_DECLINED"
    assert len(MOCK_SUPPORT_TICKETS) == 0

    # Turn 3: User submits a normal query afterwards -> answered normally
    res3 = router.process_message("What is Payent?", auth_ctx, conversation_id=cid)
    assert res3["intent"] != "UNKNOWN_INTENT"
    assert res3["tool_called"] != "create_support_ticket"
    assert len(MOCK_SUPPORT_TICKETS) == 0


# ============================================================================
# TEST 5 — ORDINARY AFFIRMATIVE MESSAGE WITHOUT PENDING ESCALATION
# ============================================================================

def test_5_ordinary_yes_without_escalation_does_not_create_ticket(router: AgentToolRouter, mock_user_and_orders):
    """
    User sends 'Yes' in an ordinary conversation where NO escalation is pending.
    Expected:
    - No support ticket is created.
    - Normal conversational or guide behavior is preserved.
    """
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Message sent cold without prior fallback
    res = router.process_message("Yes", auth_ctx)

    assert res["intent"] != "HUMAN_SUPPORT"
    assert res["tool_called"] != "create_support_ticket"
    assert len(MOCK_SUPPORT_TICKETS) == 0


# ============================================================================
# TEST 6 — TICKET CREATION FAILURE RECOVERY
# ============================================================================

def test_6_ticket_creation_failure_displays_honest_error_with_retry(router: AgentToolRouter, mock_user_and_orders):
    """
    Simulates database or ticket-service failure.
    Expected:
    - No false success message.
    - Honest error message explaining the temporary issue.
    - Clear retry suggestions appear.
    - No corrupt or partial ticket records created.
    - Subsequent retry after service recovery successfully creates ticket.
    """
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("Can I teleport my gear via quantum entanglement?", auth_ctx)
    cid = res1.get("conversation_id")

    # Turn 2: Simulate ticket service error
    with patch("agent_engine.hybrid_coordinator.create_support_ticket", side_effect=Exception("Database connection timeout")):
        res2 = router.process_message("Yes, connect me", auth_ctx, conversation_id=cid, action="confirm_escalation")

    assert res2["intent"] == "HUMAN_SUPPORT"
    assert res2["status"] == "error"
    assert res2["tool_result"]["success"] is False
    assert "encountered an issue submitting your support ticket" in res2["response_text"].lower()
    assert "Retry Support Ticket" in res2["suggestions"]
    assert len(MOCK_SUPPORT_TICKETS) == 0

    # Turn 3: User retries after service recovery
    res3 = router.process_message("Retry Support Ticket", auth_ctx, conversation_id=cid)
    assert res3["intent"] == "HUMAN_SUPPORT"
    assert res3["tool_result"]["state"] == "SUPPORT_ACCEPTED"
    assert len(MOCK_SUPPORT_TICKETS) == 1


# ============================================================================
# TEST 7 — REPEATED CONFIRMATION IDEMPOTENCY
# ============================================================================

def test_7_repeated_confirmation_is_idempotent(router: AgentToolRouter, mock_user_and_orders):
    """
    User double-clicks 'Yes, connect me' or sends confirmation twice.
    Expected:
    - Exactly one support ticket is created for that escalation request.
    - Repeated submission reuses existing ticket ID without duplicate DB records.
    """
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    # Turn 1: Unknown question
    res1 = router.process_message("Can you teleport me to Mars?", auth_ctx)
    cid = res1.get("conversation_id")

    # Turn 2: First click
    res2 = router.process_message("Yes, connect me", auth_ctx, conversation_id=cid, action="confirm_escalation")
    first_ticket_id = res2["tool_result"]["ticket_id"]
    assert len(MOCK_SUPPORT_TICKETS) == 1

    # Turn 3: Second click / duplicate submission
    res3 = router.process_message("Yes, connect me", auth_ctx, conversation_id=cid, action="confirm_escalation")
    assert res3["intent"] == "HUMAN_SUPPORT"
    assert res3["tool_result"]["ticket_id"] == first_ticket_id
    # Exactly one ticket in persistence
    assert len(MOCK_SUPPORT_TICKETS) == 1


# ============================================================================
# TEST 8 — EXISTING COMPLAINT ESCALATION REMAINS WORKING
# ============================================================================

def test_8_existing_complaint_escalation_remains_working(router: AgentToolRouter, mock_user_and_orders):
    """
    Verifies that explicit complaints (damaged equipment, disputes, human agent requests)
    continue to route to QueryType.ESCALATION and execute the existing escalation pipeline.
    """
    auth_ctx = from_user_dict(MOCK_USERS[mock_user_and_orders["user_email"]])

    res = router.process_message("I received damaged equipment", auth_ctx)

    assert res["query_type"] == QueryType.ESCALATION.value
    assert res["intent"] in ("COMPLAINT", "ESCALATE_HUMAN_SUPPORT", "SUPPORT_REQUEST", "DISPUTE_ORDER")
    assert res.get("requires_confirmation") is True
    assert res.get("tool_called") in ("propose_escalation", "create_support_ticket")

    # Also test explicit human agent request
    res_human = router.process_message("I want to talk to human support", auth_ctx)
    assert res_human["query_type"] == QueryType.ESCALATION.value
    assert res_human["intent"] == "HUMAN_SUPPORT"
    assert res_human.get("requires_confirmation") is True
    assert res_human.get("tool_called") == "propose_escalation"
