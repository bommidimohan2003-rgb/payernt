"""
PAYENT AGENT — PHASE 5 TEST SUITE: FASTAPI AGENT ROUTER & CHAT API
Validates:
1. Guest and authenticated access to POST /api/agent/chat.
2. Authorization and private data boundary enforcement (booking/delivery/KYC require auth).
3. Invalid and revoked JWT handling (safe fallback to guest permissions).
4. Conversation creation, ownership isolation, and cross-user rejection.
5. Message length validation (min 1, max 2000 characters).
6. Human support escalation and ticket creation via HTTP API.
7. Idempotent duplicate prevention on repeated confirmation requests.
8. Controlled service-unavailable handling during production database outages.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from agent_engine.persistence import reset_persistence_state
from agent_engine.escalation import reset_escalation_state
from database import MOCK_ORDERS, MOCK_SUPPORT_TICKETS, REVOKED_JTIS

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_all_state():
    reset_persistence_state()
    reset_escalation_state()
    MOCK_SUPPORT_TICKETS.clear()
    REVOKED_JTIS.clear()
    yield
    reset_persistence_state()
    reset_escalation_state()
    MOCK_SUPPORT_TICKETS.clear()
    REVOKED_JTIS.clear()


# ============================================================================
# 1. GUEST CHAT & PRIVATE DATA BOUNDARY ENFORCEMENT
# ============================================================================

def test_guest_chat_general_inquiry():
    """Unauthenticated guest can ask general questions and receive deterministic responses."""
    res = client.post("/api/agent/chat", json={
        "message": "Do you have cameras or drones available for rent?",
        "session_id": "sess_guest_api_01"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["authenticated"] is False
    assert data["user_email"] is None
    assert "payent" in data["response"].lower() or "camera" in data["response"].lower()
    assert len(data["suggestions"]) > 0


def test_guest_chat_private_booking_requires_auth():
    """Guest asking for private booking information is directed to sign in."""
    res = client.post("/api/agent/chat", json={
        "message": "What is the status of my booking?",
        "session_id": "sess_guest_api_02"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["authenticated"] is False
    assert data["requires_auth"] is True
    assert "sign in" in data["response"].lower()


# ============================================================================
# 2. AUTHENTICATED CHAT & TOOL ROUTING
# ============================================================================

def test_authenticated_chat_booking_status():
    """Authenticated user can query their own bookings."""
    token = create_access_token({"sub": "renter_alice@payent.test", "role": "customer"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/agent/chat", json={
        "message": "Show my bookings",
        "session_id": "sess_alice_api"
    }, headers=headers)

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["authenticated"] is True
    assert data["user_email"] == "renter_alice@payent.test"
    assert data["requires_auth"] is False


def test_invalid_and_revoked_token_fallback():
    """Invalid token or revoked JWT falls back to guest context rather than crashing."""
    # Invalid token
    res_inv = client.post("/api/agent/chat", json={
        "message": "Hello",
        "session_id": "sess_inv"
    }, headers={"Authorization": "Bearer invalid.corrupted.jwt"})
    assert res_inv.status_code == 200
    assert res_inv.json()["authenticated"] is False

    # Revoked token
    token = create_access_token({"sub": "revoked_user@payent.test", "role": "customer"})
    from auth import decode_access_token
    jti = decode_access_token(token).get("jti")
    REVOKED_JTIS.add(jti)

    res_rev = client.post("/api/agent/chat", json={
        "message": "My booking status",
        "session_id": "sess_rev"
    }, headers={"Authorization": f"Bearer {token}"})
    assert res_rev.status_code == 200
    data = res_rev.json()
    # Revoked token treated as unauthenticated guest
    assert data["authenticated"] is False
    assert data["requires_auth"] is True


# ============================================================================
# 3. MESSAGE LENGTH VALIDATION
# ============================================================================

def test_message_length_validation():
    """Validates that empty messages and oversized messages return 422."""
    # Empty message
    res_empty = client.post("/api/agent/chat", json={"message": "   "})
    assert res_empty.status_code == 422

    # Oversized message (> 2000 chars)
    res_long = client.post("/api/agent/chat", json={"message": "A" * 2005})
    assert res_long.status_code == 422


# ============================================================================
# 4. CONVERSATION OWNERSHIP & TENANT ISOLATION
# ============================================================================

def test_conversation_ownership_isolation():
    token_alice = create_access_token({"sub": "alice@payent.test", "role": "customer"})
    token_bob = create_access_token({"sub": "bob@payent.test", "role": "customer"})

    # Alice creates conversation
    res1 = client.post("/api/agent/chat", json={
        "message": "Hello agent, this is Alice.",
        "session_id": "sess_alice_conv"
    }, headers={"Authorization": f"Bearer {token_alice}"})
    assert res1.status_code == 200
    conv_id = res1.json()["conversation_id"]
    assert conv_id is not None

    # Alice can view conversation detail
    res_alice_detail = client.get(f"/api/agent/conversations/{conv_id}", headers={"Authorization": f"Bearer {token_alice}"})
    assert res_alice_detail.status_code == 200
    data_alice = res_alice_detail.json()
    assert data_alice["conversation"]["user_email"] == "alice@payent.test"
    assert len(data_alice["messages"]) >= 1

    # Bob cannot view Alice's conversation -> 404
    res_bob_detail = client.get(f"/api/agent/conversations/{conv_id}", headers={"Authorization": f"Bearer {token_bob}"})
    assert res_bob_detail.status_code == 404

    # Guest cannot view Alice's conversation -> 404
    res_guest_detail = client.get(f"/api/agent/conversations/{conv_id}")
    assert res_guest_detail.status_code == 404


# ============================================================================
# 5. HUMAN SUPPORT ESCALATION & DUPLICATE PREVENTION VIA HTTP
# ============================================================================

def test_escalation_workflow_turn_by_turn_http():
    token = create_access_token({"sub": "renter_esc@payent.test", "role": "customer"})
    headers = {"Authorization": f"Bearer {token}"}
    conv_id = "conv_esc_http_101"

    # Turn 1: Request human support -> returns proposal
    turn1 = client.post("/api/agent/chat", json={
        "message": "I want to talk to a human.",
        "conversation_id": conv_id,
        "session_id": "sess_esc_http"
    }, headers=headers)
    assert turn1.status_code == 200
    data1 = turn1.json()
    assert data1["requires_confirmation"] is True
    assert "Confirm Support Ticket" in data1["suggestions"]
    assert len(MOCK_SUPPORT_TICKETS) == 0

    # Turn 2: Customer confirms ticket creation -> ticket created
    turn2 = client.post("/api/agent/chat", json={
        "message": "Confirm Support Ticket",
        "conversation_id": conv_id,
        "session_id": "sess_esc_http"
    }, headers=headers)
    assert turn2.status_code == 200
    data2 = turn2.json()
    assert "OPEN" in data2["response"]
    assert "TICK-" in data2["response"]
    assert len(MOCK_SUPPORT_TICKETS) == 1

    # Turn 3: Customer clicks confirm again -> duplicate prevented
    turn3 = client.post("/api/agent/chat", json={
        "message": "Confirm Support Ticket",
        "conversation_id": conv_id,
        "session_id": "sess_esc_http"
    }, headers=headers)
    assert turn3.status_code == 200
    data3 = turn3.json()
    assert "already have an active support ticket" in data3["response"].lower()
    assert len(MOCK_SUPPORT_TICKETS) == 1


# ============================================================================
# 6. PRODUCTION PERSISTENCE SERVICE UNAVAILABLE BEHAVIOR
# ============================================================================

def test_production_persistence_failure_returns_service_unavailable():
    """In production, database connection failure returns a controlled service_unavailable response."""
    token = create_access_token({"sub": "prod_tester@payent.test", "role": "customer"})
    headers = {"Authorization": f"Bearer {token}"}

    with patch("agent_engine.persistence.IS_PRODUCTION", True):
        with patch("agent_engine.persistence.is_db_available", return_value=False):
            res = client.post("/api/agent/chat", json={
                "message": "What is my booking status?",
                "conversation_id": "conv_prod_fail",
                "session_id": "sess_prod_fail"
            }, headers=headers)

            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "service_unavailable"
            assert data["persistence_error"] is True
            assert "temporarily undergoing maintenance" in data["response"]
            assert "Try Again" in data["suggestions"]
