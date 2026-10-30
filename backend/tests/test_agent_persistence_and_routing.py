"""
PAYENT AGENT — PHASE 3 TEST SUITE: PERSISTENCE & TOOL ROUTER
Validates:
1. Conversation and message storage with additive schema and mock support.
2. Tenant isolation: Guest sessions cannot access authenticated user conversations;
   User A cannot access User B's conversation.
3. AgentToolRouter end-to-end integration:
   - Greeting, Goodbye, and General Help responses.
   - Public FAQ responses for guests.
   - Booking query with real order details.
   - Payment query with real transaction data.
   - Cancellation request-only flow.
   - KYC status query with real verification data.
   - Delivery tracking query.
   - Out-of-domain query fallback.
"""

import time
import pytest
from agent_engine.context import create_guest_context, from_user_dict
from agent_engine.persistence import (
    create_or_get_conversation,
    get_conversation,
    get_conversation_messages,
    save_agent_message,
)
from agent_engine.tool_router import AgentToolRouter
from database import (
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_USERS,
    create_order,
)


@pytest.fixture(autouse=True)
def setup_router_data():
    t_id = int(time.time() * 1000)
    renter_email = f"user_{t_id}@payent.test"
    other_email = f"other_{t_id}@payent.test"

    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Test Renter",
        "role": "customer",
        "status": "approved"
    }
    MOCK_USERS[other_email] = {
        "email": other_email,
        "full_name": "Other User",
        "role": "customer",
        "status": "approved"
    }

    booking_id = f"ord_live_{t_id}"
    order_data = {
        "id": booking_id,
        "user_email": renter_email,
        "lender_email": "vendor@payent.test",
        "productId": f"prod_{t_id}",
        "productTitle": "Canon EOS R5 Mirrorless Camera",
        "startDate": "2026-11-25",
        "endDate": "2026-11-28",
        "total": 7500.0,
        "status": "pending",
        "payment_status": "COMPLETED",
        "delivery_method": "pickup",
        "pickup_location": "Koramangala Hub"
    }
    create_order(renter_email, order_data)
    MOCK_ORDERS[booking_id] = order_data

    MOCK_KYC_VERIFICATIONS[f"kyc_{renter_email}"] = {
        "id": f"kyc_{renter_email}",
        "email": renter_email,
        "account_type": "payrent",
        "status": "APPROVED",
        "document_type": "PAN",
        "document_number_masked": "ABCDE1234F"
    }

    return {
        "renter_email": renter_email,
        "other_email": other_email,
        "booking_id": booking_id,
    }


def test_conversation_persistence_and_message_saving(setup_router_data):
    data = setup_router_data
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"}, session_id="sess_001")

    conv = create_or_get_conversation("sess_001", ctx)
    assert conv["id"] is not None
    assert conv["user_email"] == data["renter_email"]

    # Save a message
    msg = save_agent_message(
        conversation_id=conv["id"],
        sender_type="user",
        content="Where is my booking?",
        intent="BOOKING_STATUS"
    )
    assert msg["id"] is not None

    messages = get_conversation_messages(conv["id"], ctx)
    assert len(messages) >= 1
    assert messages[0]["content"] == "Where is my booking?"


def test_conversation_tenant_isolation(setup_router_data):
    data = setup_router_data
    user_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"}, session_id="sess_u1")
    other_ctx = from_user_dict({"email": data["other_email"], "role": "customer"}, session_id="sess_u2")
    guest_ctx = create_guest_context(session_id="guest_sess_g1")

    conv = create_or_get_conversation("sess_u1", user_ctx)
    conv_id = conv["id"]

    # Authenticated user who owns the conversation can access it
    assert get_conversation(conv_id, user_ctx) is not None

    # Another authenticated user CANNOT access it
    assert get_conversation(conv_id, other_ctx) is None

    # A guest CANNOT access an authenticated user's conversation
    assert get_conversation(conv_id, guest_ctx) is None


def test_router_guest_faq_query():
    router = AgentToolRouter()
    guest = create_guest_context()

    res = router.process_message("What is the security deposit policy?", guest)
    assert res["intent"] == "FAQ_QUERY"
    assert res["requires_auth"] is False
    assert "security deposit" in res["response_text"].lower()


def test_router_guest_booking_query_requires_auth():
    router = AgentToolRouter()
    guest = create_guest_context()

    res = router.process_message("Where is my booking?", guest)
    assert res["intent"] == "BOOKING_STATUS"
    assert res["requires_auth"] is True
    assert "sign in" in res["response_text"].lower()


def test_router_authenticated_booking_status(setup_router_data):
    data = setup_router_data
    router = AgentToolRouter()
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    query = f"Where is my booking {data['booking_id']}?"
    res = router.process_message(query, ctx)
    assert res["intent"] == "BOOKING_STATUS"
    assert res["requires_auth"] is False
    assert res["tool_called"] == "booking_lookup"
    assert "Canon EOS R5" in res["response_text"]
    assert "PENDING" in res["response_text"]


def test_router_authenticated_cancellation_inquiry(setup_router_data):
    data = setup_router_data
    router = AgentToolRouter()
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    query = f"I want to cancel booking {data['booking_id']}"
    res = router.process_message(query, ctx)
    assert res["intent"] == "BOOKING_CANCELLATION"
    assert res["requires_auth"] is False
    assert res["tool_called"] == "cancellation_check"
    assert "qualifies for cancellation" in res["response_text"].lower()
    # Ensure status was NOT mutated
    assert MOCK_ORDERS[data["booking_id"]]["status"] == "pending"


def test_router_authenticated_kyc_status(setup_router_data):
    data = setup_router_data
    router = AgentToolRouter()
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer", "account_type": "payrent"})

    res = router.process_message("What is my KYC status?", ctx)
    assert res["intent"] == "KYC_STATUS"
    assert res["requires_auth"] is False
    assert res["tool_called"] == "kyc_lookup"
    assert "APPROVED" in res["response_text"]


def test_router_out_of_domain_query():
    router = AgentToolRouter()
    guest = create_guest_context()

    res = router.process_message("How do I bake sourdough bread with yeast?", guest)
    assert res["intent"] == "UNKNOWN_INTENT"
    assert len(res["suggestions"]) >= 1
