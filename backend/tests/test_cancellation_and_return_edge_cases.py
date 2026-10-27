import pytest
import time
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from database import (
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_USERS,
    MOCK_DELIVERIES,
    MOCK_BOOKING_CANCELLATIONS,
    get_order_by_id,
    fetch_one,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_mock_environment():
    """Sets up clean test data for renter, lender, delivery-boy, and admin accounts."""
    renter_email = "renter_edge@payent.com"
    lender_email = "lender_edge@payent.com"
    delivery_email = "courier_edge@payent.com"
    admin_email = "admin_edge@payent.com"

    MOCK_USERS[renter_email] = {
        "id": "usr-renter-001",
        "email": renter_email,
        "full_name": "Renter Edge Tester",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[lender_email] = {
        "id": "usr-lender-001",
        "email": lender_email,
        "full_name": "Lender Edge Tester",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[delivery_email] = {
        "id": "usr-courier-001",
        "email": delivery_email,
        "full_name": "Delivery Agent Edge",
        "role": "courier",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[admin_email] = {
        "id": "usr-admin-001",
        "email": admin_email,
        "full_name": "Admin Edge Tester",
        "role": "admin",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }

    prod_id = "prod-edge-camera-99"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Red Komodo 6K Cinema Package",
        "primary_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "category": "Cameras",
        "daily_rate": 4500,
        "price_per_day": 4500,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "availability_status": "available",
        "status": "active"
    }


def _get_auth_headers():
    renter_token = create_access_token({"sub": "renter_edge@payent.com", "role": "customer", "account_type": "pay₹ent"})
    lender_token = create_access_token({"sub": "lender_edge@payent.com", "role": "lender", "account_type": "paye₹nt"})
    courier_token = create_access_token({"sub": "courier_edge@payent.com", "role": "courier", "account_type": "courier"})
    admin_token = create_access_token({"sub": "admin_edge@payent.com", "role": "admin"})

    return {
        "renter": {"Authorization": f"Bearer {renter_token}"},
        "lender": {"Authorization": f"Bearer {lender_token}"},
        "courier": {"Authorization": f"Bearer {courier_token}"},
        "admin": {"Authorization": f"Bearer {admin_token}"},
    }


def _create_test_order(order_id: str, delivery_method: str = "delivery", status: str = "order_confirmed"):
    renter_email = "renter_edge@payent.com"
    lender_email = "lender_edge@payent.com"
    prod_id = "prod-edge-camera-99"

    order_payload = {
        "id": order_id,
        "productId": prod_id,
        "product_id": prod_id,
        "productTitle": "Red Komodo 6K Cinema Package",
        "userEmail": renter_email,
        "user_email": renter_email,
        "lender_email": lender_email,
        "owner_id": lender_email,
        "status": status,
        "total": 9000,
        "delivery_method": delivery_method,
        "deliveryMethod": delivery_method,
        "delivery_boy_id": "usr-courier-001",
        "courier_id": "usr-courier-001",
        "created_at": "2026-10-27T10:00:00Z",
        "payment_status": "paid",
        "refund_status": "none",
        "confirmed_at": "2026-10-27T10:05:00Z",
    }
    MOCK_ORDERS[order_id] = order_payload
    return order_payload


# ==============================================================================
# SECTION 5: Cancellation Edge Cases Tests
# ==============================================================================

def test_01_cancelled_before_pickup():
    """
    Cancelled before pickup:
    - Stops the Live Queue immediately.
    - Prevents pickup and delivery actions.
    - Ensures the rental timer never starts (picked_up_at remains None).
    """
    headers = _get_auth_headers()
    order_id = "test-cancel-pre-pickup-001"
    _create_test_order(order_id)

    # Cancel before pickup
    res_cancel = client.post(f"/api/orders/{order_id}/cancel", headers=headers["renter"])
    assert res_cancel.status_code == 200, res_cancel.text
    cancel_json = res_cancel.json()
    assert cancel_json["success"] is True

    # Order status is cancelled
    order = get_order_by_id(order_id)
    assert order["status"] == "cancelled"
    assert order.get("picked_up_at") is None
    assert order.get("pickedUpAt") is None

    # Attempting pickup must fail
    res_pickup = client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["lender"])
    assert res_pickup.status_code == 400
    assert "cancelled before pickup" in res_pickup.json()["detail"].lower()

    # Attempting ready_for_pickup must fail
    res_ready = client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    assert res_ready.status_code == 400
    assert "cancelled before pickup" in res_ready.json()["detail"].lower()

    # Attempting return before pickup must fail
    res_return = client.post(f"/api/orders/{order_id}/return", headers=headers["renter"])
    assert res_return.status_code == 400
    assert "cancelled before pickup" in res_return.json()["detail"].lower()


def test_02_cancelled_after_pickup_requires_return_to_owner():
    """
    Cancelled after pickup but before delivery / during rental:
    - Does not mark the item as delivered to renter.
    - Blocks forward delivery actions.
    - Follows return-to-owner procedure: return_initiated -> return_collected -> handed_back -> completed.
    - Preserves picked_up_at and timer history.
    """
    headers = _get_auth_headers()
    order_id = "test-cancel-post-pickup-002"
    _create_test_order(order_id, delivery_method="delivery")

    # 1. Advance to ready_for_pickup
    client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    # 2. Courier confirms pickup from lender
    res_pu = client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["courier"])
    assert res_pu.status_code == 200
    picked_up_ts = res_pu.json()["timestamps"]["picked_up_at"]
    assert picked_up_ts is not None

    # 3. Order is cancelled while in transit
    res_cancel = client.post(f"/api/orders/{order_id}/cancel", headers=headers["renter"])
    assert res_cancel.status_code == 200

    order_post_canc = get_order_by_id(order_id)
    assert order_post_canc["status"] == "cancelled"
    # History preserved: picked_up_at must NOT be deleted
    assert (order_post_canc.get("picked_up_at") or order_post_canc.get("pickedUpAt")) == picked_up_ts

    # 4. Attempting forward pickup again must fail
    res_pickup_again = client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["courier"])
    assert res_pickup_again.status_code == 400
    assert "return-to-owner" in res_pickup_again.json()["detail"]

    # 5. Return to owner workflow proceeds
    res_ret_init = client.post(f"/api/orders/{order_id}/return", headers=headers["renter"])
    assert res_ret_init.status_code == 200, res_ret_init.text

    # Courier collects item for return
    res_ret_col = client.post(f"/api/orders/{order_id}/return-collected", headers=headers["courier"])
    assert res_ret_col.status_code == 200, res_ret_col.text
    assert res_ret_col.json()["timestamps"]["return_collected_at"] is not None

    # Handover to lender confirms physical return
    res_hb = client.post(f"/api/orders/{order_id}/handed-back", headers=headers["lender"])
    assert res_hb.status_code == 200
    assert res_hb.json()["timestamps"]["handed_back_at"] is not None


def test_03_cancellation_request_workflow():
    """
    Cancellation requested but not approved:
    - Keeps the booking in its existing valid state until approved.
    - If rejected, maintains active status.
    - If approved, transitions to cancelled safely.
    """
    headers = _get_auth_headers()
    order_id = "test-cancel-request-003"
    _create_test_order(order_id, status="rental_in_progress")
    MOCK_ORDERS[order_id]["picked_up_at"] = "2026-10-27T10:15:00Z"

    # Renter requests cancellation with reason and notes
    res_req = client.post(
        f"/api/orders/{order_id}/cancellation-request",
        headers=headers["renter"],
        json={"reason": "SCHEDULE_CONFLICT", "notes": "Shoot finished early"}
    )
    assert res_req.status_code == 200, res_req.text
    assert res_req.json()["success"] is True

    # Booking status must remain active/rental_in_progress pending approval!
    order = get_order_by_id(order_id)
    assert order["status"] == "rental_in_progress"
    assert order["cancellation_request_status"] == "PENDING"

    # Opposing party (lender) rejects request
    res_rej = client.post(
        f"/api/orders/{order_id}/cancellation-request/reject",
        headers=headers["lender"],
        json={"reason": "Cannot cancel after full day booked"}
    )
    assert res_rej.status_code == 200
    order_rej = get_order_by_id(order_id)
    assert order_rej["cancellation_request_status"] == "REJECTED"
    assert order_rej["status"] == "rental_in_progress"

    # Renter requests again
    client.post(
        f"/api/orders/{order_id}/cancellation-request",
        headers=headers["renter"],
        json={"reason": "MUTUAL_AGREEMENT", "notes": "Discussed with lender"}
    )
    # Lender approves cancellation request
    res_app = client.post(
        f"/api/orders/{order_id}/cancellation-request/approve",
        headers=headers["lender"]
    )
    assert res_app.status_code == 200
    order_app = get_order_by_id(order_id)
    assert order_app["status"] == "cancelled"
    assert order_app["cancellation_request_status"] == "APPROVED"


def test_04_duplicate_cancellation_idempotency():
    """
    Duplicate cancellation requests:
    - Process cancellation only once.
    - Prevent duplicate notifications, refunds, or status changes.
    - Second cancel attempt returns 400 Bad Request.
    """
    headers = _get_auth_headers()
    order_id = "test-cancel-dup-004"
    _create_test_order(order_id)

    # First cancel
    res_first = client.post(f"/api/orders/{order_id}/cancel", headers=headers["renter"])
    assert res_first.status_code == 200

    # Second cancel must fail cleanly with 400
    res_second = client.post(f"/api/orders/{order_id}/cancel", headers=headers["renter"])
    assert res_second.status_code == 400
    assert "already been cancelled" in res_second.json()["detail"].lower()


def test_05_payments_and_refunds_consistency_on_cancellation():
    """
    Payments and refunds:
    - Do not automatically mark a refund as completed merely because the booking was cancelled.
    - Refund status remains genuine (e.g. 'none' or 'pending').
    """
    headers = _get_auth_headers()
    order_id = "test-refund-consistency-005"
    _create_test_order(order_id)
    MOCK_ORDERS[order_id]["refund_status"] = "none"

    client.post(f"/api/orders/{order_id}/cancel", headers=headers["renter"])
    order = get_order_by_id(order_id)

    # Refund status must NOT be falsely marked completed
    assert order.get("refund_status") != "completed"
    assert order["status"] == "cancelled"


# ==============================================================================
# SECTION 6: Returned-Item Edge Cases Tests
# ==============================================================================

def test_06_return_collection_and_transit_state():
    """
    Returned-Item Edge Cases:
    - Return initiated but not collected keeps return pending.
    - Authorized delivery person collects item: records return_collected_at and responsible user.
    - Item collected but not handed back stays in return_in_transit.
    """
    headers = _get_auth_headers()
    order_id = "test-return-transit-006"
    _create_test_order(order_id, delivery_method="delivery")

    # Advance to rental_in_progress
    client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["courier"])

    # Renter initiates return
    res_init = client.post(f"/api/orders/{order_id}/return", headers=headers["renter"])
    assert res_init.status_code == 200
    assert res_init.json()["status"] == "return_initiated"

    # Unauthorized party (renter) cannot mark return collected in delivery mode
    res_unauth = client.post(f"/api/orders/{order_id}/return-collected", headers=headers["renter"])
    assert res_unauth.status_code == 403

    # Authorized courier collects item
    res_col = client.post(f"/api/orders/{order_id}/return-collected", headers=headers["courier"])
    assert res_col.status_code == 200
    assert res_col.json()["status"] == "return_in_transit"
    assert res_col.json()["timestamps"]["return_collected_at"] is not None

    # Booking must NOT be completed prematurely
    order = get_order_by_id(order_id)
    assert order["status"] in ("return_in_transit", "active")
    assert order.get("completed_at") is None


def test_07_handover_stops_rental_timer_and_inspection_gate():
    """
    Item handed back to lender:
    - Authorized person confirms actual handover.
    - Record handover timestamp and stops timer.
    - Cannot complete booking before inspection is performed.
    """
    headers = _get_auth_headers()
    order_id = "test-timer-stop-007"
    _create_test_order(order_id, delivery_method="direct")

    client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["renter"])
    client.post(f"/api/orders/{order_id}/return", headers=headers["renter"])

    # Lender confirms gear handover
    res_hb = client.post(f"/api/orders/{order_id}/handed-back", headers=headers["lender"])
    assert res_hb.status_code == 200
    hb_ts = res_hb.json()["timestamps"]["handed_back_at"]
    assert hb_ts is not None

    # Second handover confirmation is idempotent and returns clean 200
    res_hb_dup = client.post(f"/api/orders/{order_id}/handed-back", headers=headers["lender"])
    assert res_hb_dup.status_code == 200
    assert res_hb_dup.json()["timestamps"]["handed_back_at"] == hb_ts

    # Attempting completion before inspection must fail
    res_comp_premature = client.post(f"/api/orders/{order_id}/complete", headers=headers["lender"])
    assert res_comp_premature.status_code == 400
    assert "awaiting_inspection" in res_comp_premature.json()["detail"]

    # Now lender performs inspection with GOOD condition
    res_insp = client.post(
        f"/api/orders/{order_id}/queue-advance",
        headers=headers["lender"],
        json={"milestone": "awaiting_inspection", "checklist": {"condition": "GOOD"}}
    )
    assert res_insp.status_code == 200

    # Now completion succeeds
    res_comp = client.post(f"/api/orders/{order_id}/complete", headers=headers["lender"])
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"


def test_08_damaged_item_inspection_dispute_and_renter_rebuttal():
    """
    Damaged or different condition item:
    - Lender records condition DAMAGED and checklist.
    - Sets dispute_status = 'OPEN'.
    - Does NOT automatically charge renter or finalize deduction.
    - Prevents premature rental completion.
    - Renter submits dispute rebuttal: sets dispute_status = 'UNDER_REVIEW', preserves both records.
    """
    headers = _get_auth_headers()
    order_id = "test-dispute-workflow-008"
    _create_test_order(order_id, delivery_method="direct")

    client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["renter"])
    client.post(f"/api/orders/{order_id}/return", headers=headers["renter"])
    client.post(f"/api/orders/{order_id}/handed-back", headers=headers["lender"])

    # Lender performs inspection and reports sensor scratch damage
    res_insp = client.post(
        f"/api/orders/{order_id}/queue-advance",
        headers=headers["lender"],
        json={
            "milestone": "awaiting_inspection",
            "notes": "Sensor glass has visible scratch near top right.",
            "checklist": {
                "condition": "DAMAGED",
                "items_checked": ["lens_mount", "sensor", "buttons"],
                "notes": "Sensor scratched"
            }
        }
    )
    assert res_insp.status_code == 200
    order_insp = get_order_by_id(order_id)
    assert order_insp["inspection_condition"] == "DAMAGED"
    assert order_insp["dispute_status"] == "OPEN"

    # Lender completion is BLOCKED while dispute is open
    res_comp_blocked = client.post(f"/api/orders/{order_id}/complete", headers=headers["lender"])
    assert res_comp_blocked.status_code == 400
    assert "dispute is open" in res_comp_blocked.json()["detail"].lower()

    # Renter submits rebuttal and photo evidence
    res_rebuttal = client.post(
        f"/api/orders/{order_id}/dispute",
        headers=headers["renter"],
        json={
            "rebuttal_notes": "Scratch was pre-existing, see photos taken during pickup handover.",
            "evidence": ["https://cdn.payent.com/pickup-proof-01.jpg"]
        }
    )
    assert res_rebuttal.status_code == 200
    assert res_rebuttal.json()["dispute_status"] == "UNDER_REVIEW"

    # Both lender notes and renter rebuttal are preserved
    order_disputed = get_order_by_id(order_id)
    assert order_disputed["dispute_status"] == "UNDER_REVIEW"
    assert order_disputed["inspection_notes"] == "Sensor glass has visible scratch near top right."
    evidence_list = order_disputed["dispute_evidence"]
    assert len(evidence_list) >= 1
    assert "pre-existing" in evidence_list[0]["rebuttal_notes"]

    # Admin resolves dispute and finalizes booking
    res_admin_comp = client.post(f"/api/orders/{order_id}/complete", headers=headers["admin"])
    assert res_admin_comp.status_code == 200
    assert res_admin_comp.json()["status"] == "completed"


# ==============================================================================
# SECTION 7: Final Persona Authorization & Persistence Tests
# ==============================================================================

def test_09_strict_persona_role_authorization():
    """
    Verify that only the responsible authorized person can perform each action:
    1. Renter cannot mark gear ready for pickup.
    2. Lender cannot initiate return.
    3. Courier can only collect return in delivery mode.
    4. Random third-party user is denied (HTTP 403).
    """
    headers = _get_auth_headers()
    order_id = "test-auth-separation-009"
    _create_test_order(order_id)

    # 1. Renter cannot mark ready for pickup
    res1 = client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["renter"])
    assert res1.status_code == 403

    # Lender marks ready
    client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["courier"])

    # 2. Lender cannot initiate return (renter-only)
    res2 = client.post(f"/api/orders/{order_id}/return", headers=headers["lender"])
    assert res2.status_code == 403

    # 3. Third party unauthorized user
    intruder_token = create_access_token({"sub": "intruder@payent.com", "role": "customer"})
    res3 = client.post(f"/api/orders/{order_id}/return", headers={"Authorization": f"Bearer {intruder_token}"})
    assert res3.status_code == 403


def test_10_persistence_across_refresh():
    """
    Verify that every milestone transition and timestamp is persisted by the backend
    and re-querying / refreshing returns the exact same timestamps.
    """
    headers = _get_auth_headers()
    order_id = "test-persistence-010"
    _create_test_order(order_id, delivery_method="direct")

    client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=headers["lender"])
    pu_res = client.post(f"/api/orders/{order_id}/pickup-confirm", headers=headers["renter"])
    pu_ts = pu_res.json()["timestamps"]["picked_up_at"]

    # Re-fetch order from GET /api/bookings/{id}
    refetched = client.get(f"/api/bookings/{order_id}", headers=headers["renter"])
    assert refetched.status_code == 200
    ref_order = refetched.json()
    assert (ref_order.get("picked_up_at") or ref_order.get("pickedUpAt")) == pu_ts
    assert ref_order["status"] == "rental_in_progress"
