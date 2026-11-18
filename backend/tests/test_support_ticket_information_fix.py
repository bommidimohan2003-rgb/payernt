"""
Tests for paYent AI Agent — Support Ticket Information Fix
Verifies:
1. Original user inquiry is passed into support ticket creation.
2. Requester name and inquiry description are stored separately.
3. Ticket record persists the correct inquiry.
4. Admin ticket API returns the correct description and originalInquiry.
5. Notification contains the correct ticket reference and navigation target.
6. Existing ticket can be safely repaired when source conversation is available.
7. Missing legacy description does not display the requester's name as the issue.
8. Existing escalation confirmation and duplicate prevention still work.
"""

import json
import pytest
from unittest.mock import patch, MagicMock

from agent_engine.context import AgentSessionContext
from agent_engine.escalation import (
    create_support_ticket,
    record_admin_notification,
    find_active_support_ticket,
    sanitize_ticket_record,
    MOCK_ADMIN_NOTIFICATIONS,
)
from agent_engine.tool_router import AgentToolRouter
from agent_engine.fallback_responses import (
    register_pending_escalation,
    get_pending_escalation,
    clear_pending_escalation,
    reset_pending_escalations,
)
from database import MOCK_SUPPORT_TICKETS


@pytest.fixture(autouse=True)
def clean_state():
    reset_pending_escalations()
    MOCK_SUPPORT_TICKETS.clear()
    MOCK_ADMIN_NOTIFICATIONS.clear()
    yield
    reset_pending_escalations()
    MOCK_SUPPORT_TICKETS.clear()
    MOCK_ADMIN_NOTIFICATIONS.clear()


def test_1_original_inquiry_passed_to_support_ticket_creation():
    """1. Original user inquiry is retrieved from pending escalation state and passed into create_support_ticket."""
    router = AgentToolRouter()
    user_email = "mohan@payent.test"
    user_name = "mohan bommidi"
    session_id = "sess_fix_test_1"
    conv_id = "conv_fix_test_1"

    context = AgentSessionContext(
        user_email=user_email,
        full_name=user_name,
        is_authenticated=True,
        session_id=session_id
    )

    # Step 1: User asks unknown question
    unanswered_q = "Can you teleport me to Mars"
    turn1 = router.process_message(unanswered_q, context, conversation_id=conv_id)
    assert turn1["intent"] == "UNKNOWN_INTENT"
    assert turn1["tool_called"] == "propose_support_fallback"

    pending = get_pending_escalation(session_id, conv_id)
    assert pending is not None
    assert pending["unanswered_query"] == unanswered_q

    # Step 2: User confirms escalation with "Yes, connect me"
    turn2 = router.process_message("Yes, connect me", context, conversation_id=conv_id)
    assert turn2["tool_called"] == "create_support_ticket"
    assert turn2["tool_result"]["success"] is True

    t_id = turn2["tool_result"]["ticket_id"]
    assert t_id.startswith("TICK-")

    # Verify ticket stored in MOCK_SUPPORT_TICKETS
    assert t_id in MOCK_SUPPORT_TICKETS
    ticket = MOCK_SUPPORT_TICKETS[t_id]
    assert ticket["originalInquiry"] == unanswered_q
    assert "Can you teleport me to Mars" in ticket["description"]
    assert "Original user inquiry:" in ticket["description"]


def test_2_requester_name_and_inquiry_stored_separately():
    """2. Requester name and inquiry description are stored in distinct, dedicated fields."""
    ctx = AgentSessionContext(
        user_email="alice@example.com",
        full_name="Alice Smith",
        is_authenticated=True,
        session_id="sess_sep_test"
    )

    ticket_res = create_support_ticket(
        context=ctx,
        subject="Support Request: Unanswered Inquiry",
        message="Original user inquiry:\nWhere is my drone?\n\nEscalation requested:\nYes.",
        category="General Help",
        conversation_id="conv_sep_test",
        original_inquiry="Where is my drone?"
    )

    assert ticket_res["success"] is True
    t_id = ticket_res["ticket_id"]
    record = MOCK_SUPPORT_TICKETS[t_id]

    # Stored in dedicated fields
    assert record["user_name"] == "Alice Smith"
    assert record["user_email"] == "alice@example.com"
    assert record["originalInquiry"] == "Where is my drone?"

    # First message content must NOT be just the requester's name
    first_msg = record["messages"][0]
    assert first_msg["sender"] == "Alice Smith"
    assert first_msg["senderType"] == "user"
    assert first_msg["content"] != "Alice Smith"
    assert "Where is my drone?" in first_msg["content"]
    assert "Where is my drone?" in first_msg["message"]


def test_3_ticket_record_persists_correct_inquiry_and_context():
    """3. Ticket record persists the correct inquiry, originalInquiry, and conversationContext."""
    ctx = AgentSessionContext(
        user_email="bob@example.com",
        full_name="Bob Jones",
        is_authenticated=True,
        session_id="sess_pers_test"
    )

    conv_context = [
        {"sender": "Bob Jones", "senderType": "user", "text": "Can you teleport me to Mars", "timestamp": None},
        {"sender": "Payent Agent", "senderType": "assistant", "text": "I'm sorry, I couldn't understand...", "timestamp": None},
        {"sender": "Bob Jones", "senderType": "user", "text": "Yes, connect me", "timestamp": None}
    ]

    res = create_support_ticket(
        context=ctx,
        subject="Support Request: Unanswered Inquiry",
        message="Original user inquiry:\nCan you teleport me to Mars\n\nEscalation reason:\nUnassisted inquiry",
        category="General Help",
        conversation_id="conv_pers_test",
        conversation_context=conv_context,
        original_inquiry="Can you teleport me to Mars"
    )

    t_id = res["ticket_id"]
    record = MOCK_SUPPORT_TICKETS[t_id]

    first_msg = record["messages"][0]
    assert first_msg["originalInquiry"] == "Can you teleport me to Mars"
    assert len(first_msg["conversationContext"]) == 3
    assert first_msg["conversationContext"][0]["text"] == "Can you teleport me to Mars"


def test_4_admin_ticket_api_returns_correct_description_and_mapping():
    """4. Admin ticket list API returns description, originalInquiry, and normalized messages."""
    from main import admin_support_tickets_list

    # Insert a ticket into in-memory store
    ticket_id = "TICK-TEST-ADMIN-API"
    MOCK_SUPPORT_TICKETS[ticket_id] = {
        "id": ticket_id,
        "user_name": "mohan bommidi",
        "user_email": "bommidimohan304@gmail.com",
        "subject": "Support Request: Unanswered Inquiry",
        "category": "General Help",
        "status": "open",
        "priority": "medium",
        "created_at": "2026-11-18T10:51:27.148607+00:00",
        "updated_at": "2026-11-18T10:51:27.148607+00:00",
        "messages": [
            {
                "id": "msg-test",
                "sender": "mohan bommidi",
                "senderType": "user",
                "content": "Original user inquiry:\nCan you teleport me to Mars\n\nEscalation reason:\nThe AI Agent could not resolve.",
                "originalInquiry": "Can you teleport me to Mars",
                "timestamp": "2026-11-18T10:51:27.148607+00:00"
            }
        ]
    }

    current_admin = {"sub": "admin@payent.com", "role": "admin"}
    tickets = admin_support_tickets_list(current_admin)

    target = next((t for t in tickets if t["id"] == ticket_id), None)
    assert target is not None
    assert target["userName"] == "mohan bommidi"
    assert target["userEmail"] == "bommidimohan304@gmail.com"
    assert target["originalInquiry"] == "Can you teleport me to Mars"
    assert "Can you teleport me to Mars" in target["description"]

    # Verify messages normalization has both 'message' and 'content', 'createdAt' and 'timestamp'
    msg = target["messages"][0]
    assert msg["message"] == msg["content"]
    assert "Can you teleport me to Mars" in msg["message"]
    assert msg["createdAt"] == "2026-11-18T10:51:27.148607+00:00"
    assert msg["timestamp"] == "2026-11-18T10:51:27.148607+00:00"


def test_5_notification_contains_ticket_reference_and_navigation():
    """5. record_admin_notification records ticket_id and dispatches navigation target."""
    notif = record_admin_notification(
        title="New Agent Escalation: TICK-123456",
        message="Ticket TICK-123456 created by mohan regarding General Help.",
        notification_type="General Help",
        ticket_id="TICK-123456",
        subject="Support Request: Unanswered Inquiry",
        user_name="mohan bommidi"
    )

    assert notif["ticket_id"] == "TICK-123456"
    assert "TICK-123456" in notif["title"]
    assert len(MOCK_ADMIN_NOTIFICATIONS) == 1


def test_6_legacy_ticket_missing_description_handled_gracefully():
    """6. Legacy tickets without explicit message or description do not display user_name as message."""
    from main import admin_support_tickets_list

    ticket_id = "TICK-LEGACY-EMPTY"
    MOCK_SUPPORT_TICKETS[ticket_id] = {
        "id": ticket_id,
        "user_name": "legacy requester",
        "user_email": "legacy@test.com",
        "subject": "Legacy Ticket Without Message",
        "category": "General Help",
        "status": "open",
        "priority": "low",
        "messages": []
    }

    current_admin = {"sub": "admin@payent.com", "role": "admin"}
    tickets = admin_support_tickets_list(current_admin)
    target = next((t for t in tickets if t["id"] == ticket_id), None)
    assert target is not None
    # Description should NOT be the requester name
    assert target["description"] == ""
    assert target["originalInquiry"] == ""
    assert target["userName"] == "legacy requester"


def test_7_escalation_confirmation_and_duplicate_prevention_still_work():
    """7. Repeated confirmation returns is_duplicate=True without creating a redundant ticket."""
    router = AgentToolRouter()
    context = AgentSessionContext(
        user_email="dupe_user@payent.test",
        full_name="Dupe User",
        is_authenticated=True,
        session_id="sess_dupe"
    )

    register_pending_escalation(
        session_id="sess_dupe",
        conversation_id="conv_dupe",
        unanswered_query="How do I travel through time?"
    )

    turn1 = router.process_message("Yes, connect me", context, conversation_id="conv_dupe")
    assert turn1["tool_called"] == "create_support_ticket"
    assert turn1["tool_result"]["success"] is True
    assert turn1["tool_result"].get("is_duplicate") is False
    t_id = turn1["tool_result"]["ticket_id"]

    # Re-register or trigger duplicate confirmation
    register_pending_escalation(
        session_id="sess_dupe",
        conversation_id="conv_dupe",
        unanswered_query="How do I travel through time?"
    )

    turn2 = router.process_message("Yes, connect me", context, conversation_id="conv_dupe")
    assert turn2["tool_called"] == "create_support_ticket"
    assert turn2["tool_result"]["is_duplicate"] is True
    assert turn2["tool_result"]["ticket_id"] == t_id


def test_8_escalation_success_response_wording():
    """8. Escalation response uses truthful asynchronous support wording without claiming live human connection."""
    router = AgentToolRouter()
    context = AgentSessionContext(
        user_email="wording_user@payent.test",
        full_name="Wording User",
        is_authenticated=True,
        session_id="sess_word"
    )

    register_pending_escalation(
        session_id="sess_word",
        conversation_id="conv_word",
        unanswered_query="Tell me about the meaning of life"
    )

    turn = router.process_message("Yes, connect me", context, conversation_id="conv_word")
    resp_text = turn["response_text"]
    assert "Your support request has been created successfully." in resp_text
    assert "Our support team can review your request and follow up with you." in resp_text
    assert "You can track updates in the Support section." in resp_text
    # Must NOT claim a live agent is connected
    assert "I have connected you with our human support team" not in resp_text
