"""
PAYENT AGENT — PHASE 6 END-TO-END INTEGRATION TEST SUITE
Comprehensive verification of:
1. Complete Frontend-to-Backend Message Lifecycle (Guest, Renter, Vendor, Admin).
2. Session & Authentication Isolation (Account switching, JWT expiry, JWT revocation).
3. Live / Persistent Data Access (Ownership boundaries, Booking lookup).
4. Complete Human Support Escalation Workflow (Creation, Deduplication, Admin Reply, Status Update).
5. Security Boundaries, Sensitive Data Masking, and System Reliability.
"""

import json
import time
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
import database
from database import (
    MOCK_USERS,
    MOCK_ORDERS,
    MOCK_SUPPORT_TICKETS,
    REVOKED_JTIS,
)
from agent_engine.persistence import (
    MOCK_AGENT_CONVERSATIONS,
    MOCK_AGENT_MESSAGES,
)
from agent_engine.escalation import (
    MOCK_ADMIN_NOTIFICATIONS,
    reset_escalation_state,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_phase6_test_environment():
    """Isolates mock data stores for each test run."""
    reset_escalation_state()
    MOCK_AGENT_CONVERSATIONS.clear()
    MOCK_AGENT_MESSAGES.clear()
    REVOKED_JTIS.clear()

    # Seed test users
    MOCK_USERS["renter_e2e@payent.test"] = {
        "id": "usr_renter_e2e",
        "email": "renter_e2e@payent.test",
        "full_name": "Renter E2E User",
        "role": "customer",
        "account_type": "payrent",
        "status": "active",
        "account_status": "approved",
    }
    MOCK_USERS["other_e2e@payent.test"] = {
        "id": "usr_other_e2e",
        "email": "other_e2e@payent.test",
        "full_name": "Other E2E User",
        "role": "customer",
        "account_type": "payrent",
        "status": "active",
        "account_status": "approved",
    }
    MOCK_USERS["vendor_e2e@payent.test"] = {
        "id": "usr_vendor_e2e",
        "email": "vendor_e2e@payent.test",
        "full_name": "Vendor E2E User",
        "role": "vendor",
        "account_type": "payernt",
        "status": "active",
        "account_status": "approved",
    }
    MOCK_USERS["admin_e2e@payent.test"] = {
        "id": "usr_admin_e2e",
        "email": "admin_e2e@payent.test",
        "full_name": "Admin E2E User",
        "role": "admin",
        "account_type": "payernt",
        "status": "active",
        "account_status": "approved",
    }

    # Seed test orders
    MOCK_ORDERS["ORD-RENTER-601"] = {
        "id": "ORD-RENTER-601",
        "order_id": "ORD-RENTER-601",
        "user_email": "renter_e2e@payent.test",
        "lender_email": "vendor_e2e@payent.test",
        "product_id": "PROD-CAM-01",
        "product_name": "Sony FX3 Cinema Camera",
        "status": "CONFIRMED",
        "order_status": "CONFIRMED",
        "payment_status": "PAID",
        "total_amount": 4500.0,
        "start_date": "2026-11-05",
        "end_date": "2026-11-08",
        "secret_pin": "6642",
    }
    MOCK_ORDERS["ORD-OTHER-602"] = {
        "id": "ORD-OTHER-602",
        "order_id": "ORD-OTHER-602",
        "user_email": "other_e2e@payent.test",
        "lender_email": "vendor_e2e@payent.test",
        "product_id": "PROD-DRONE-01",
        "product_name": "DJI Mavic 3 Pro",
        "status": "CONFIRMED",
        "order_status": "CONFIRMED",
        "payment_status": "PAID",
        "total_amount": 7200.0,
        "start_date": "2026-11-10",
        "end_date": "2026-11-12",
        "secret_pin": "9912",
    }

    yield

    # Cleanup
    MOCK_ORDERS.pop("ORD-RENTER-601", None)
    MOCK_ORDERS.pop("ORD-OTHER-602", None)
    MOCK_USERS.pop("renter_e2e@payent.test", None)
    MOCK_USERS.pop("other_e2e@payent.test", None)
    MOCK_USERS.pop("vendor_e2e@payent.test", None)
    MOCK_USERS.pop("admin_e2e@payent.test", None)


# ============================================================================
# 1. MESSAGE LIFECYCLE (GUEST, RENTER, VENDOR)
# ============================================================================

def test_01_guest_message_lifecycle():
    """Unauthenticated guest can ask general queries but is gated on private bookings."""
    # General FAQ query
    res = client.post("/api/agent/chat", json={
        "message": "How does insurance and damage protection work on Payent?",
        "session_id": "sess_guest_e2e_01"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["authenticated"] is False
    assert data["requires_auth"] is False
    assert len(data["suggestions"]) > 0
    assert "insurance" in data["response"].lower() or "protection" in data["response"].lower() or "damage" in data["response"].lower()

    # Private inquiry without credentials
    res_private = client.post("/api/agent/chat", json={
        "message": "Where is my booking #ORD-RENTER-601?",
        "session_id": "sess_guest_e2e_01"
    })
    assert res_private.status_code == 200
    p_data = res_private.json()
    assert p_data["success"] is True
    assert p_data["authenticated"] is False
    assert p_data["requires_auth"] is True
    # Asserts no private booking info leaked to guest
    assert "Sony FX3" not in p_data["response"]
    assert "6642" not in p_data["response"]


def test_02_renter_booking_lookup_and_ownership_isolation():
    """Renter can inspect their own booking, but cannot access another customer's booking."""
    token = create_access_token({"sub": "renter_e2e@payent.test", "role": "customer"})
    headers = {"Authorization": f"Bearer {token}"}

    # Lookup owned booking
    res = client.post("/api/agent/chat", json={
        "message": "What is the status of my booking #ORD-RENTER-601?",
        "session_id": "sess_renter_e2e"
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["authenticated"] is True
    assert data["requires_auth"] is False
    assert "ord-renter-601" in data["response"].lower()
    assert "CONFIRMED" in data["response"]
    # Secret PIN must be redacted
    assert "6642" not in data["response"]

    # Attempt lookup of another user's booking
    res_other = client.post("/api/agent/chat", json={
        "message": "Give me details of booking #ORD-OTHER-602",
        "session_id": "sess_renter_e2e"
    }, headers=headers)
    assert res_other.status_code == 200
    other_data = res_other.json()
    # Must be denied or indicate unauthorized
    assert "access denied" in other_data["response"].lower() or "not authorized" in other_data["response"].lower() or "unauthorized" in other_data["response"].lower()
    assert "DJI Mavic" not in other_data["response"]
    assert "9912" not in other_data["response"]


def test_03_vendor_booking_acceptance_lifecycle():
    """Vendor context receives guidance on how to accept bookings."""
    token = create_access_token({"sub": "vendor_e2e@payent.test", "role": "vendor", "account_type": "payernt"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/agent/chat", json={
        "message": "How do I accept a booking request?",
        "session_id": "sess_vendor_e2e"
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["intent"] == "BOOKING_ACCEPTANCE"
    assert "accept" in data["response"].lower() or "request" in data["response"].lower()


# ============================================================================
# 2. SESSION ISOLATION & JWT VALIDATION
# ============================================================================

def test_04_conversation_isolation_across_accounts():
    """User B and Guests cannot view User A's private conversations."""
    token_a = create_access_token({"sub": "renter_e2e@payent.test", "role": "customer"})
    token_b = create_access_token({"sub": "other_e2e@payent.test", "role": "customer"})

    # User A initiates conversation
    res_a = client.post("/api/agent/chat", json={
        "message": "Hello agent, please keep this conversation confidential.",
        "session_id": "sess_user_a"
    }, headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    conv_id = res_a.json()["conversation_id"]
    assert conv_id is not None

    # User A can view their conversation
    res_a_view = client.get(f"/api/agent/conversations/{conv_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a_view.status_code == 200
    assert len(res_a_view.json()["messages"]) >= 2

    # User B cannot view User A's conversation
    res_b_view = client.get(f"/api/agent/conversations/{conv_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b_view.status_code in (404, 403)

    # Guest cannot view User A's conversation
    res_guest_view = client.get(f"/api/agent/conversations/{conv_id}")
    assert res_guest_view.status_code in (404, 403)


def test_05_jwt_revocation_and_expiration():
    """Expired or revoked tokens fail-safe to guest context without leaking data."""
    # Expired token
    expired_token = create_access_token(
        {"sub": "renter_e2e@payent.test", "role": "customer"},
        expires_delta=timedelta(seconds=-60)
    )
    res_expired = client.post("/api/agent/chat", json={
        "message": "What is the status of my booking #ORD-RENTER-601?",
        "session_id": "sess_expired"
    }, headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 200
    data_expired = res_expired.json()
    assert data_expired["authenticated"] is False
    assert data_expired["requires_auth"] is True

    # Revoked token
    valid_token = create_access_token({"sub": "renter_e2e@payent.test", "role": "customer"})
    import jwt
    from config import JWT_SECRET_KEY, JWT_ALGORITHM
    decoded = jwt.decode(valid_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM], options={"verify_signature": False})
    jti = decoded.get("jti")
    REVOKED_JTIS.add(jti)

    res_revoked = client.post("/api/agent/chat", json={
        "message": "What is the status of my booking #ORD-RENTER-601?",
        "session_id": "sess_revoked"
    }, headers={"Authorization": f"Bearer {valid_token}"})
    assert res_revoked.status_code == 200
    data_revoked = res_revoked.json()
    assert data_revoked["authenticated"] is False
    assert data_revoked["requires_auth"] is True


# ============================================================================
# 3. COMPLETE HUMAN SUPPORT ESCALATION WORKFLOW
# ============================================================================

def test_06_human_support_end_to_end_workflow():
    """
    Validates complete human escalation lifecycle:
    1. Customer requests human support -> Agent proposes confirmation.
    2. Customer confirms -> Support ticket created (TICK-...).
    3. Duplicate confirmation -> Returns existing ticket without duplicate records.
    4. Admin views ticket in /api/admin/support.
    5. Admin replies via /api/admin/support/{id}/reply.
    6. Customer retrieves reply via /api/support.
    7. Admin updates status to 'resolved' via /api/admin/support/{id}/status.
    8. Customer retrieves updated status via /api/support.
    """
    token_user = create_access_token({"sub": "renter_e2e@payent.test", "role": "customer"})
    token_admin = create_access_token({"sub": "admin_e2e@payent.test", "role": "admin"})

    headers_user = {"Authorization": f"Bearer {token_user}"}
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # Step 1: Customer asks for human support
    res1 = client.post("/api/agent/chat", json={
        "message": "I need to talk to human support about my booking #ORD-RENTER-601",
        "session_id": "sess_e2e_support"
    }, headers=headers_user)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["requires_confirmation"] is True
    assert "confirm" in " ".join(d1["suggestions"]).lower()

    # Step 2: Customer confirms ticket creation
    res2 = client.post("/api/agent/chat", json={
        "message": "confirm support ticket",
        "session_id": "sess_e2e_support"
    }, headers=headers_user)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["tool_called"] in ("create_support_ticket", "human_escalation")
    ticket_id = d2["tool_result"]["ticket_id"]
    assert ticket_id.startswith("TICK-")

    # Step 3: Repeated confirmation click triggers duplicate prevention
    res3 = client.post("/api/agent/chat", json={
        "message": "confirm support ticket",
        "session_id": "sess_e2e_support"
    }, headers=headers_user)
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["tool_result"]["is_duplicate"] is True
    assert d3["tool_result"]["ticket_id"] == ticket_id

    # Step 4: Admin views support tickets list
    res_admin_list = client.get("/api/admin/support", headers=headers_admin)
    assert res_admin_list.status_code == 200
    tickets = res_admin_list.json()
    found_ticket = next((t for t in tickets if t["id"] == ticket_id), None)
    assert found_ticket is not None
    assert found_ticket["userEmail"] == "renter_e2e@payent.test"
    assert found_ticket["status"] == "open"

    # Step 5: Admin replies to ticket
    admin_reply_text = "Hello! We have reviewed your booking #ORD-RENTER-601 and approved the requested adjustment."
    res_admin_reply = client.post(
        f"/api/admin/support/{ticket_id}/reply",
        json={"message": admin_reply_text},
        headers=headers_admin
    )
    assert res_admin_reply.status_code == 200
    reply_data = res_admin_reply.json()
    assert reply_data["status"] == "pending"

    # Step 6: Customer fetches support tickets and receives admin reply
    res_user_tickets = client.get("/api/support", headers=headers_user)
    assert res_user_tickets.status_code == 200
    user_tickets = res_user_tickets.json()
    user_found = next((t for t in user_tickets if t["id"] == ticket_id), None)
    assert user_found is not None
    messages = user_found["messages"]
    assert len(messages) >= 2
    assert any(admin_reply_text in (m.get("content") or m.get("message") or "") for m in messages)

    # Step 7: Admin marks ticket as 'resolved'
    res_admin_status = client.post(
        f"/api/admin/support/{ticket_id}/status",
        json={"status": "resolved"},
        headers=headers_admin
    )
    assert res_admin_status.status_code == 200

    # Step 8: Customer views updated status
    res_user_updated = client.get("/api/support", headers=headers_user)
    assert res_user_updated.status_code == 200
    updated_tickets = res_user_updated.json()
    user_resolved = next((t for t in updated_tickets if t["id"] == ticket_id), None)
    assert user_resolved is not None
    assert user_resolved["status"] == "resolved"


# ============================================================================
# 4. PRIVACY, SENSITIVE DATA REDACTION & BOUNDARY VALIDATION
# ============================================================================

def test_07_sensitive_data_redaction_in_escalation():
    """Aadhaar, PAN, Card, OTP, and PIN credentials must be masked before entering tickets."""
    token_user = create_access_token({"sub": "renter_e2e@payent.test", "role": "customer"})
    headers = {"Authorization": f"Bearer {token_user}"}

    # Propose escalation containing sensitive tokens
    leak_message = (
        "Help! My card is 4532 0150 1234 5678, my Aadhaar is 9988 7766 5544, "
        "my PAN is ABCDE1234F, and my secret pin is 8842."
    )
    res_prop = client.post("/api/agent/chat", json={
        "message": f"I want human support: {leak_message}",
        "session_id": "sess_leak_test"
    }, headers=headers)
    assert res_prop.status_code == 200

    # Confirm ticket
    res_conf = client.post("/api/agent/chat", json={
        "message": "confirm support ticket",
        "session_id": "sess_leak_test"
    }, headers=headers)
    assert res_conf.status_code == 200
    ticket_id = res_conf.json()["tool_result"]["ticket_id"]

    # Verify stored ticket in MOCK_SUPPORT_TICKETS has masked secrets
    stored = MOCK_SUPPORT_TICKETS[ticket_id]
    ticket_content = json.dumps(stored)
    assert "4532" not in ticket_content
    assert "9988 7766 5544" not in ticket_content
    assert "ABCDE1234F" not in ticket_content
    assert "8842" not in ticket_content


def test_08_input_boundaries_and_malformed_requests():
    """Validates 422 responses on boundary input violations."""
    # Empty message
    res_empty = client.post("/api/agent/chat", json={"message": "   "})
    assert res_empty.status_code == 422

    # Excessively long message (> 2000 chars)
    res_long = client.post("/api/agent/chat", json={"message": "x" * 2001})
    assert res_long.status_code == 422

    # Non-existent conversation ID
    res_nonexistent = client.get("/api/agent/conversations/non_existent_conv_id_9999")
    assert res_nonexistent.status_code == 404
