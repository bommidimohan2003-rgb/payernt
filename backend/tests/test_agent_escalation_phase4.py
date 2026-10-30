"""
PAYENT AGENT — PHASE 4 TEST SUITE: HUMAN SUPPORT ESCALATION & ADMIN BRIDGE
Validates:
1. Intent detection for human escalation (English and Telugu-English).
2. Guest ticket creation rejection (requires authentication).
3. Authenticated ticket proposal and explicit confirmation requirement.
4. Ticket creation and duplicate prevention across retries.
5. Ticket ownership verification and unauthorized customer access rejection.
6. Booking ownership validation on escalations.
7. Sensitive data sanitization (PINs, OTPs, Aadhaar, cards) in tickets and alerts.
8. Admin notification and live WebSocket event dispatch.
9. Chronological human reply retrieval and internal admin note privacy.
10. Ticket status lifecycle handling.
11. Production database outage fail-safe behavior.
12. Compatibility with existing platform support infrastructure.
"""

import json
import time
import pytest
from unittest.mock import MagicMock, patch

from auth import create_access_token
from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_auth_token,
    from_user_dict,
)
from agent_engine.escalation import (
    MOCK_ADMIN_NOTIFICATIONS,
    create_support_ticket,
    find_active_support_ticket,
    get_support_ticket_detail,
    get_user_support_tickets,
    normalize_support_category,
    normalize_ticket_status,
    propose_human_escalation,
    record_admin_notification,
    reset_escalation_state,
    sanitize_ticket_record,
)
from agent_engine.intent_classifier import IntentClassifier
from agent_engine.persistence import (
    PersistenceUnavailableError,
    reset_persistence_state,
)
from agent_engine.tool_router import AgentToolRouter
from database import (
    MOCK_ORDERS,
    MOCK_SUPPORT_TICKETS,
    REVOKED_JTIS,
)


@pytest.fixture(autouse=True)
def clean_state():
    """Resets all mock stores, escalation state, and persistence before each test."""
    reset_persistence_state()
    reset_escalation_state()
    MOCK_SUPPORT_TICKETS.clear()
    MOCK_ADMIN_NOTIFICATIONS.clear()
    REVOKED_JTIS.clear()
    yield
    reset_persistence_state()
    reset_escalation_state()
    MOCK_SUPPORT_TICKETS.clear()
    MOCK_ADMIN_NOTIFICATIONS.clear()
    REVOKED_JTIS.clear()


# ============================================================================
# 1. INTENT CLASSIFICATION FOR ESCALATION (ENGLISH & TELUGU)
# ============================================================================

def test_escalation_intent_detection():
    classifier = IntentClassifier()
    phrases = [
        ("I want to talk to a human.", "HUMAN_SUPPORT"),
        ("Connect me to customer support.", "HUMAN_SUPPORT"),
        ("I need an actual person.", "HUMAN_SUPPORT"),
        ("Real person tho matladali.", "HUMAN_SUPPORT"),
        ("Support team ki connect cheyyi.", "HUMAN_SUPPORT"),
        ("Na problem solve avvaledu.", "COMPLAINT"),
        ("Agent tho matladali.", "HUMAN_SUPPORT"),
        ("Confirm Support Ticket", "HUMAN_SUPPORT"),
        ("check my ticket status", "SUPPORT_STATUS"),
        ("did support reply", "SUPPORT_STATUS"),
    ]
    for phrase, expected_intent in phrases:
        res = classifier.classify(phrase)
        assert res.intent == expected_intent, f"Failed for '{phrase}': got {res.intent}, expected {expected_intent}"
        assert res.confidence >= 0.65


# ============================================================================
# 2. GUEST VS AUTHENTICATED ESCALATION & EXPLICIT CONFIRMATION
# ============================================================================

def test_guest_cannot_propose_or_create_ticket():
    guest = create_guest_context("guest_session_1")
    
    # Proposal rejected
    prop = propose_human_escalation(guest, "I need help with my gear")
    assert prop["success"] is False
    assert prop["requires_auth"] is True

    # Direct creation rejected
    create_res = create_support_ticket(guest, "Help", "I need human support")
    assert create_res["success"] is False
    assert create_res["requires_auth"] is True
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_authenticated_user_proposal_requires_confirmation():
    user = AgentSessionContext(user_email="renter_bob@payent.test", is_authenticated=True, session_id="sess_bob")
    
    prop = propose_human_escalation(user, "My booking camera was not delivered", category="Delivery & Logistics")
    assert prop["success"] is True
    assert prop["requires_confirmation"] is True
    assert prop["category"] == "Delivery & Logistics"
    assert "Would you like me to proceed with creating this support ticket?" in prop["message"]
    assert "Confirm Support Ticket" in prop["suggestions"]
    # Verify no ticket was created yet during proposal stage
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_authenticated_ticket_creation_on_explicit_confirmation():
    user = AgentSessionContext(
        user_email="renter_alice@payent.test",
        full_name="Alice Smith",
        is_authenticated=True,
        session_id="sess_alice"
    )

    res = create_support_ticket(
        context=user,
        subject="Deposit Refund Inquiry",
        message="I completed my rental 3 days ago, when will deposit return?",
        category="Payment & Refund",
        conversation_id="sess_alice"
    )

    assert res["success"] is True
    assert res["is_duplicate"] is False
    ticket_id = res["ticket_id"]
    assert ticket_id.startswith("TICK-")
    assert res["status"] == "open"
    assert res["category"] == "Payment & Refund"
    assert ticket_id in MOCK_SUPPORT_TICKETS

    ticket_in_store = MOCK_SUPPORT_TICKETS[ticket_id]
    assert ticket_in_store["user_email"] == "renter_alice@payent.test"
    assert ticket_in_store["user_name"] == "Alice Smith"
    assert ticket_in_store["category"] == "Payment & Refund"
    assert len(ticket_in_store["messages"]) == 1
    assert ticket_in_store["messages"][0]["source"] == "payent_agent"


# ============================================================================
# 3. DUPLICATE PREVENTION & RETRY IDEMPOTENCY
# ============================================================================

def test_duplicate_ticket_creation_prevented():
    user = AgentSessionContext(user_email="user_dup@payent.test", is_authenticated=True, session_id="sess_dup")

    # First creation
    res1 = create_support_ticket(
        context=user,
        subject="Camera sensor issue",
        message="Sensor has spots",
        category="Equipment Damage & Dispute",
        conversation_id="conv_dup_01"
    )
    assert res1["success"] is True
    assert res1["is_duplicate"] is False
    t1_id = res1["ticket_id"]

    # Repeated confirmation click with same conversation_id
    res2 = create_support_ticket(
        context=user,
        subject="Camera sensor issue",
        message="Sensor has spots",
        category="Equipment Damage & Dispute",
        conversation_id="conv_dup_01"
    )
    assert res2["success"] is True
    assert res2["is_duplicate"] is True
    assert res2["ticket_id"] == t1_id
    # Assert store still contains only 1 ticket
    assert len(MOCK_SUPPORT_TICKETS) == 1


# ============================================================================
# 4. BOOKING OWNERSHIP VALIDATION
# ============================================================================

def test_booking_ownership_validation_on_ticket_creation():
    # Setup test bookings in mock orders
    MOCK_ORDERS["bk_alice_own"] = {
        "id": "bk_alice_own",
        "user_email": "alice@payent.test",
        "lender_email": "vendor@payent.test",
        "status": "active"
    }
    MOCK_ORDERS["bk_eve_private"] = {
        "id": "bk_eve_private",
        "user_email": "eve@payent.test",
        "lender_email": "vendor2@payent.test",
        "status": "active"
    }

    alice_ctx = AgentSessionContext(user_email="alice@payent.test", is_authenticated=True)

    # 1. Propose with Alice's own booking -> succeeds
    prop_own = propose_human_escalation(alice_ctx, "Question about rental", booking_id="bk_alice_own")
    assert prop_own["success"] is True
    assert prop_own["booking_id"] == "bk_alice_own"

    # 2. Propose with Eve's booking -> rejected for unowned booking
    prop_unowned = propose_human_escalation(alice_ctx, "Question about rental", booking_id="bk_eve_private")
    assert prop_unowned["success"] is False
    assert "not associated with your account" in prop_unowned["message"]

    # 3. Create ticket with Eve's booking directly -> rejected
    create_unowned = create_support_ticket(
        context=alice_ctx,
        subject="Stolen inquiry",
        message="Tell me details",
        booking_id="bk_eve_private"
    )
    assert create_unowned["success"] is False
    assert "Unauthorized" in create_unowned["error"]
    assert len(MOCK_SUPPORT_TICKETS) == 0


# ============================================================================
# 5. SENSITIVE DATA REDACTION (PINS, OTPS, AADHAAR, CARDS)
# ============================================================================

def test_sensitive_data_sanitization_in_tickets():
    user = AgentSessionContext(user_email="safe_user@payent.test", is_authenticated=True)
    raw_message = (
        "My secret pin is 8842 and my OTP is 123456. "
        "Also my Aadhaar is 9876 5432 1098 and my card was 4111-2222-3333-4444."
    )

    res = create_support_ticket(
        context=user,
        subject="Payment problem with secret pin 8842",
        message=raw_message,
        category="Payment & Refund"
    )
    assert res["success"] is True
    t_id = res["ticket_id"]
    ticket = MOCK_SUPPORT_TICKETS[t_id]

    # Subject sanitized
    assert "8842" not in ticket["subject"]

    # Message content sanitized
    content = ticket["messages"][0]["content"]
    assert "8842" not in content
    assert "123456" not in content
    assert "9876 5432 1098" not in content
    assert "4111-2222-3333-4444" not in content
    assert "[REDACTED_PIN]" in content or "[REDACTED_AADHAAR]" in content


# ============================================================================
# 6. ADMIN NOTIFICATIONS
# ============================================================================

def test_admin_notification_recording_and_event():
    user = AgentSessionContext(user_email="notif_test@payent.test", is_authenticated=True)

    with patch("agent_engine.escalation.broadcast_admin_event_safe") as mock_broadcast:
        res = create_support_ticket(
            context=user,
            subject="KYC Document Stuck",
            message="Driving license pending verification for 2 days",
            category="KYC & Verification"
        )
        assert res["success"] is True
        t_id = res["ticket_id"]

        # Admin notifications recorded in mock
        assert len(MOCK_ADMIN_NOTIFICATIONS) == 1
        notif = MOCK_ADMIN_NOTIFICATIONS[0]
        assert t_id in notif["title"]
        assert "KYC & Verification" in notif["message"]

        # Live websocket broadcast called
        assert mock_broadcast.called
        event_name, payload = mock_broadcast.call_args[0]
        assert event_name == "support.ticket_created"
        assert payload["id"] == t_id


# ============================================================================
# 7. TICKET RETRIEVAL & INTERNAL ADMIN NOTE PRIVACY
# ============================================================================

def test_ticket_retrieval_and_internal_note_isolation():
    user_email = "customer_carol@payent.test"
    user_ctx = AgentSessionContext(user_email=user_email, is_authenticated=True)
    other_ctx = AgentSessionContext(user_email="stranger_dave@payent.test", is_authenticated=True)
    admin_ctx = AgentSessionContext(user_email="admin@payent.test", is_authenticated=True, is_admin=True, role="admin")

    # Create ticket with initial user message
    res = create_support_ticket(user_ctx, "Tripod leg broken", "Item arrived broken", category="Equipment Damage & Dispute")
    t_id = res["ticket_id"]

    # Add staff reply and internal admin note
    MOCK_SUPPORT_TICKETS[t_id]["messages"].append({
        "id": "msg-staff-1",
        "sender": "Agent Vijay",
        "senderType": "admin",
        "content": "We have contacted the vendor for an immediate replacement.",
        "timestamp": "2026-10-30T11:00:00Z"
    })
    MOCK_SUPPORT_TICKETS[t_id]["messages"].append({
        "id": "msg-internal-note",
        "sender": "Admin Manager",
        "senderType": "internal_note",
        "is_internal": True,
        "content": "CONFIDENTIAL: Check vendor insurance history for repeated broken gear.",
        "timestamp": "2026-10-30T11:05:00Z"
    })

    # 1. Ticket owner Carol retrieves detail
    carol_detail = get_support_ticket_detail(user_ctx, t_id)
    assert carol_detail["success"] is True
    carol_msgs = carol_detail["ticket"]["messages"]
    assert len(carol_msgs) == 2, "Internal admin note must be stripped for customer"
    assert "We have contacted the vendor" in carol_msgs[1]["content"]
    assert all("CONFIDENTIAL" not in m["content"] for m in carol_msgs)

    # 2. Stranger Dave tries to view Carol's ticket -> Rejected
    dave_detail = get_support_ticket_detail(other_ctx, t_id)
    assert dave_detail["success"] is False
    assert "Unauthorized" in dave_detail["error"]

    # 3. Admin retrieves ticket detail -> sees all messages including internal note
    admin_detail = get_support_ticket_detail(admin_ctx, t_id)
    assert admin_detail["success"] is True
    admin_msgs = admin_detail["ticket"]["messages"]
    assert len(admin_msgs) == 3
    assert any("CONFIDENTIAL" in m["content"] for m in admin_msgs)


# ============================================================================
# 8. TICKET STATUS LIFECYCLE
# ============================================================================

def test_ticket_status_normalization_and_updates():
    assert normalize_ticket_status("open") == "open"
    assert normalize_ticket_status("In-Progress") == "in_progress"
    assert normalize_ticket_status("WAITING_FOR_USER") == "waiting_for_user"
    assert normalize_ticket_status("Resolved") == "resolved"
    assert normalize_ticket_status("closed") == "closed"
    assert normalize_ticket_status(None) == "open"

    user_ctx = AgentSessionContext(user_email="status_user@payent.test", is_authenticated=True)
    res = create_support_ticket(user_ctx, "Tripod status test", "Testing status lifecycle")
    t_id = res["ticket_id"]

    # Update status in store (e.g. by admin)
    MOCK_SUPPORT_TICKETS[t_id]["status"] = "in_progress"
    detail = get_support_ticket_detail(user_ctx, t_id)
    assert detail["ticket"]["status"] == "in_progress"


# ============================================================================
# 9. PRODUCTION DATABASE OUTAGE FAIL-SAFE
# ============================================================================

def test_production_ticket_creation_db_offline_raises():
    user = AgentSessionContext(user_email="prod_esc_user@payent.test", is_authenticated=True)

    with patch("agent_engine.escalation.IS_PRODUCTION", True):
        with patch("agent_engine.escalation.is_db_available", return_value=False):
            with pytest.raises(PersistenceUnavailableError):
                create_support_ticket(
                    context=user,
                    subject="Production failure test",
                    message="Should not write to mock store in prod"
                )
    # Ensure no ticket written in mock store when DB offline in production
    assert len(MOCK_SUPPORT_TICKETS) == 0


# ============================================================================
# 10. ROUTER CONVERSATIONAL WORKFLOW (FULL TURN-BY-TURN INTEGRATION)
# ============================================================================

def test_router_escalation_workflow_turn_by_turn():
    router = AgentToolRouter()
    user = AgentSessionContext(
        user_email="renter_turn@payent.test",
        full_name="Turn Tester",
        is_authenticated=True,
        session_id="sess_turn_101"
    )

    # Turn 1: Customer requests human assistance
    turn1 = router.process_message(
        message="I want to talk to a human.",
        context=user,
        conversation_id="conv_turn_101"
    )
    assert turn1["intent"] == "HUMAN_SUPPORT"
    assert turn1["tool_called"] == "propose_escalation"
    assert "Would you like me to proceed with creating this support ticket?" in turn1["response_text"]
    assert "Confirm Support Ticket" in turn1["suggestions"]
    assert len(MOCK_SUPPORT_TICKETS) == 0

    # Turn 2: Customer clicks/sends "Confirm Support Ticket"
    turn2 = router.process_message(
        message="Confirm Support Ticket",
        context=user,
        conversation_id="conv_turn_101"
    )
    assert turn2["intent"] == "HUMAN_SUPPORT"
    assert turn2["tool_called"] == "create_support_ticket"
    assert "Your support ticket" in turn2["response_text"]
    assert "OPEN" in turn2["response_text"]
    assert len(MOCK_SUPPORT_TICKETS) == 1

    # Turn 3: Customer retries confirmation -> Duplicate prevented
    turn3 = router.process_message(
        message="Confirm Support Ticket",
        context=user,
        conversation_id="conv_turn_101"
    )
    assert "You already have an active support ticket" in turn3["response_text"]
    assert len(MOCK_SUPPORT_TICKETS) == 1

    # Turn 4: Customer checks ticket status
    turn4 = router.process_message(
        message="check my ticket status",
        context=user,
        conversation_id="conv_turn_101"
    )
    assert turn4["tool_called"] == "support_ticket_lookup"
    assert "support ticket" in turn4["response_text"].lower()


# ============================================================================
# 11. EXISTING SUPPORT API COMPATIBILITY
# ============================================================================

def test_existing_support_api_compatibility():
    """
    Verifies that tickets created by the Payent Agent are seamlessly accessible,
    listable, and replyable through the existing /api/support and /api/messages HTTP routes.
    """
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    user_email = "api_compat_user@payent.test"
    token = create_access_token({"sub": user_email, "role": "customer"})
    headers = {"Authorization": f"Bearer {token}"}

    stranger_token = create_access_token({"sub": "api_stranger@payent.test", "role": "customer"})
    stranger_headers = {"Authorization": f"Bearer {stranger_token}"}

    ctx = AgentSessionContext(user_email=user_email, is_authenticated=True, session_id="sess_api_compat")

    # 1. Agent creates ticket
    res = create_support_ticket(
        context=ctx,
        subject="API Compatibility Rental Inquiry",
        message="Created by agent engine for verification",
        category="General Help"
    )
    assert res["success"] is True
    ticket_id = res["ticket_id"]

    # 2. Existing GET /api/support lists the agent-created ticket
    api_list = client.get("/api/support", headers=headers)
    assert api_list.status_code == 200
    tickets = api_list.json()
    assert any(t["id"] == ticket_id for t in tickets)

    # 3. Existing GET /api/messages/{id} fetches ticket detail
    api_detail = client.get(f"/api/messages/{ticket_id}", headers=headers)
    assert api_detail.status_code == 200
    detail = api_detail.json()
    assert detail["id"] == ticket_id
    assert detail["subject"] == "API Compatibility Rental Inquiry"
    assert len(detail["messages"]) == 1

    # 4. Existing POST /api/messages/{id}/reply adds a customer reply
    api_reply = client.post(
        f"/api/messages/{ticket_id}/reply",
        json={"message": "Customer follow up reply via web portal"},
        headers=headers
    )
    assert api_reply.status_code == 200
    assert api_reply.json()["success"] is True

    # 5. Agent immediately sees the updated message from the existing API
    agent_detail = get_support_ticket_detail(ctx, ticket_id)
    assert agent_detail["success"] is True
    agent_msgs = agent_detail["ticket"]["messages"]
    assert len(agent_msgs) == 2
    assert "Customer follow up reply via web portal" in agent_msgs[1]["content"]

    # 6. Unauthorized stranger receives 403 Forbidden
    api_forbidden = client.get(f"/api/messages/{ticket_id}", headers=stranger_headers)
    assert api_forbidden.status_code == 403

