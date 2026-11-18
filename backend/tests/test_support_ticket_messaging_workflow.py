import pytest
import time
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app, check_admin_user, get_current_user_email
from database import (
    MOCK_SUPPORT_TICKETS,
    MOCK_SUPPORT_TICKET_MESSAGES,
    MOCK_NOTIFICATIONS,
    MOCK_USERS,
    save_support_ticket_message,
    get_support_ticket_messages,
    mark_support_ticket_messages_read,
    get_user_unread_support_count,
)
from agent_engine.escalation import MOCK_ADMIN_NOTIFICATIONS

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_test_environment():
    MOCK_SUPPORT_TICKETS.clear()
    MOCK_SUPPORT_TICKET_MESSAGES.clear()
    MOCK_NOTIFICATIONS.clear()
    MOCK_ADMIN_NOTIFICATIONS.clear()
    app.dependency_overrides.clear()

    # Seed test users
    MOCK_USERS["alice@payent.test"] = {
        "email": "alice@payent.test",
        "full_name": "Alice User",
        "role": "customer",
    }
    MOCK_USERS["bob@payent.test"] = {
        "email": "bob@payent.test",
        "full_name": "Bob Intruder",
        "role": "customer",
    }
    MOCK_USERS["admin@payent.test"] = {
        "email": "admin@payent.test",
        "full_name": "Admin Officer",
        "role": "admin",
    }
    yield
    MOCK_SUPPORT_TICKETS.clear()
    MOCK_SUPPORT_TICKET_MESSAGES.clear()
    MOCK_NOTIFICATIONS.clear()
    MOCK_ADMIN_NOTIFICATIONS.clear()
    app.dependency_overrides.clear()


def make_test_ticket(ticket_id="TICK-TEST-1001", user_email="alice@payent.test", status="open"):
    now_str = "2026-11-18T10:00:00Z"
    init_msg = {
        "id": f"msg-{ticket_id}-0",
        "sender": "Alice User",
        "senderType": "user",
        "content": "I need help with my camera booking.",
        "message": "I need help with my camera booking.",
        "createdAt": now_str,
        "timestamp": now_str,
        "read": True,
        "isRead": True,
    }
    ticket = {
        "id": ticket_id,
        "subject": "Camera Booking Issue",
        "category": "Rental & Product Issues",
        "status": status,
        "priority": "high",
        "user_name": "Alice User",
        "user_email": user_email,
        "messages": [init_msg],
        "created_at": now_str,
        "updated_at": now_str,
        "unread_user_count": 0,
    }
    MOCK_SUPPORT_TICKETS[ticket_id] = ticket
    save_support_ticket_message(
        ticket_id=ticket_id,
        sender_id=user_email,
        sender_type="user",
        sender_name="Alice User",
        message="I need help with my camera booking.",
        message_id=init_msg["id"],
        is_read=True,
        created_at=now_str,
    )
    return ticket


# --- 1. Admin can send a reply to an existing ticket ---
def test_1_admin_can_send_reply():
    make_test_ticket()
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    res = client.post(
        "/api/admin/support/TICK-TEST-1001/reply",
        json={"message": "We are looking into your camera booking."}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["id"] == "TICK-TEST-1001"
    assert data["status"] == "waiting_for_user"
    assert len(data["messages"]) >= 2
    assert data["messages"][-1]["senderType"] == "admin"
    assert data["messages"][-1]["content"] == "We are looking into your camera booking."


# --- 2. Admin reply is persisted in TiDB/mock store ---
def test_2_admin_reply_is_persisted():
    make_test_ticket()
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    client.post(
        "/api/admin/support/TICK-TEST-1001/reply",
        json={"message": "Persisted support reply content"}
    )
    # Check through direct persistence helper
    thread = get_support_ticket_messages("TICK-TEST-1001", include_internal=True)
    assert any(m["content"] == "Persisted support reply content" for m in thread)
    admin_m = [m for m in thread if m["senderType"] == "admin"]
    assert len(admin_m) == 1
    assert admin_m[0]["isRead"] is False


# --- 3. User can retrieve the admin reply ---
def test_3_user_can_retrieve_admin_reply():
    make_test_ticket()
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    client.post(
        "/api/admin/support/TICK-TEST-1001/reply",
        json={"message": "Please confirm your pickup location."}
    )

    app.dependency_overrides[get_current_user_email] = lambda: "alice@payent.test"
    res = client.get("/api/support/TICK-TEST-1001")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["id"] == "TICK-TEST-1001"
    assert len(data["messages"]) >= 2
    last_m = data["messages"][-1]
    assert last_m["senderType"] == "admin"
    assert last_m["content"] == "Please confirm your pickup location."


# --- 4. User cannot retrieve another user's ticket messages ---
def test_4_user_cannot_retrieve_another_users_ticket():
    make_test_ticket(ticket_id="TICK-ALICE", user_email="alice@payent.test")
    # Bob attempts to read Alice's ticket
    app.dependency_overrides[get_current_user_email] = lambda: "bob@payent.test"
    res = client.get("/api/support/TICK-ALICE")
    assert res.status_code == 403
    assert "Not authorized" in res.json()["detail"]


# --- 5. User can send a reply to their own ticket ---
def test_5_user_can_reply_to_own_ticket():
    make_test_ticket(ticket_id="TICK-ALICE", user_email="alice@payent.test")
    app.dependency_overrides[get_current_user_email] = lambda: "alice@payent.test"
    res = client.post(
        "/api/support/TICK-ALICE/reply",
        json={"message": "My pickup hub is Hyderabad Hitec City."}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert len(data["messages"]) >= 2
    last_msg = data["messages"][-1]
    assert last_msg["senderType"] == "user"
    assert last_msg["content"] == "My pickup hub is Hyderabad Hitec City."


# --- 6. User cannot reply to another user's ticket ---
def test_6_user_cannot_reply_to_another_users_ticket():
    make_test_ticket(ticket_id="TICK-ALICE", user_email="alice@payent.test")
    # Bob tries to reply to Alice's ticket
    app.dependency_overrides[get_current_user_email] = lambda: "bob@payent.test"
    res = client.post(
        "/api/support/TICK-ALICE/reply",
        json={"message": "I am intruding on Alice's ticket."}
    )
    assert res.status_code == 403
    assert "Not authorized" in res.json()["detail"]


# --- 7. Admin receives notification when the user replies ---
def test_7_admin_receives_notification_on_user_reply():
    make_test_ticket(ticket_id="TICK-ALICE", user_email="alice@payent.test")
    app.dependency_overrides[get_current_user_email] = lambda: "alice@payent.test"
    client.post(
        "/api/support/TICK-ALICE/reply",
        json={"message": "Confirming my payment reference ID."}
    )
    assert len(MOCK_ADMIN_NOTIFICATIONS) >= 1
    notif = MOCK_ADMIN_NOTIFICATIONS[-1]
    assert "TICK-ALICE" in notif.get("ticket_id", "") or "TICK-ALICE" in notif.get("title", "")
    assert "Confirming my payment" in notif.get("message", "")


# --- 8. User receives notification after admin reply is persisted ---
def test_8_user_receives_notification_after_admin_reply():
    make_test_ticket(ticket_id="TICK-ALICE", user_email="alice@payent.test")
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    client.post(
        "/api/admin/support/TICK-ALICE/reply",
        json={"message": "Your booking has been updated."}
    )

    # Check user notification in MOCK_NOTIFICATIONS
    user_notifs = [n for n in MOCK_NOTIFICATIONS.values() if n.get("user_email") == "alice@payent.test"]
    assert len(user_notifs) >= 1
    un = user_notifs[-1]
    assert "TICK-ALICE" in un.get("title", "") or "TICK-ALICE" in un.get("message", "")
    assert un.get("link") == "/support?id=TICK-ALICE"


# --- 9. Mark-as-read updates the correct message state ---
def test_9_mark_as_read_updates_message_state():
    make_test_ticket(ticket_id="TICK-ALICE", user_email="alice@payent.test")
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    client.post(
        "/api/admin/support/TICK-ALICE/reply",
        json={"message": "Admin update unread."}
    )

    # Unread count should be 1
    assert get_user_unread_support_count("alice@payent.test") >= 1

    # User opens ticket and marks as read
    app.dependency_overrides[get_current_user_email] = lambda: "alice@payent.test"
    res = client.post("/api/support/TICK-ALICE/read")
    assert res.status_code == 200, res.text
    assert res.json()["success"] is True

    # Unread count should now be 0
    assert get_user_unread_support_count("alice@payent.test") == 0


# --- 10. Closed ticket behavior follows existing rules ---
def test_10_closed_ticket_blocks_user_replies():
    make_test_ticket(ticket_id="TICK-CLOSED", user_email="alice@payent.test", status="closed")
    app.dependency_overrides[get_current_user_email] = lambda: "alice@payent.test"
    res = client.post(
        "/api/support/TICK-CLOSED/reply",
        json={"message": "Trying to reply to a closed ticket."}
    )
    assert res.status_code == 400
    assert "closed" in res.json()["detail"].lower()


# --- 11. Database/validation failure does not produce false success response ---
def test_11_empty_reply_produces_validation_error():
    make_test_ticket()
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    res = client.post(
        "/api/admin/support/TICK-TEST-1001/reply",
        json={"message": "   "}
    )
    assert res.status_code == 422


# --- 12. Nonexistent ticket returns 404 ---
def test_12_nonexistent_ticket_returns_404():
    app.dependency_overrides[check_admin_user] = lambda: {"email": "admin@payent.test", "full_name": "Admin Officer", "role": "admin"}
    res = client.post(
        "/api/admin/support/TICK-NONEXISTENT/reply",
        json={"message": "Hello?"}
    )
    assert res.status_code == 404
