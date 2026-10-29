import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_USERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_BOOKING_CANCELLATIONS,
    create_order,
    get_order_by_id,
    record_booking_cancellation,
)
from payernt_database import MOCK_PAYERNT_PRODUCTS, MOCK_RENTAL_SECURITIES

client = TestClient(app)


def setup_test_env():
    """Sets up isolated mock users, product, and authorization tokens."""
    uid = uuid.uuid4().hex[:6]
    lender_email = f"vendor_canc_{uid}@payent.com"
    renter_email = f"renter_canc_{uid}@payent.com"
    stranger_email = f"stranger_canc_{uid}@payent.com"

    category = f"Cameras_{uid}"

    MOCK_USERS[lender_email] = {
        "id": lender_email,
        "email": lender_email,
        "full_name": "Lender Vendor",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "paye₹nt",
    }
    MOCK_USERS[renter_email] = {
        "id": renter_email,
        "email": renter_email,
        "full_name": "Renter User",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "pay₹ent",
    }
    MOCK_USERS[stranger_email] = {
        "id": stranger_email,
        "email": stranger_email,
        "full_name": "Unauthorized Stranger",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "paye₹nt",
    }

    product_id = f"prod_canc_{uid}"
    MOCK_CUSTOM_PRODUCTS[product_id] = {
        "id": product_id,
        "name": "Sony FX3 Camera Rig",
        "title": "Sony FX3 Camera Rig",
        "category": category,
        "price_per_day": 3500.0,
        "user_email": lender_email,
        "owner_id": lender_email,
        "owner_email": lender_email,
        "available": True,
        "is_available": True,
        "availability_status": "available",
    }
    MOCK_PAYERNT_PRODUCTS[product_id] = MOCK_CUSTOM_PRODUCTS[product_id]

    lender_token = create_access_token({
        "sub": lender_email,
        "role": "lender",
        "account_type": "paye₹nt",
        "user_id": lender_email,
        "email": lender_email,
    })
    renter_token = create_access_token({
        "sub": renter_email,
        "role": "customer",
        "account_type": "pay₹ent",
        "user_id": renter_email,
        "email": renter_email,
    })
    stranger_token = create_access_token({
        "sub": stranger_email,
        "role": "lender",
        "account_type": "paye₹nt",
        "user_id": stranger_email,
        "email": stranger_email,
    })

    return {
        "uid": uid,
        "product_id": product_id,
        "category": category,
        "lender_email": lender_email,
        "renter_email": renter_email,
        "stranger_email": stranger_email,
        "lender_token": lender_token,
        "renter_token": renter_token,
        "stranger_token": stranger_token,
    }


def test_vendor_can_decline_pending_booking():
    """Verify that a pending booking can be declined by the vendor."""
    env = setup_test_env()
    order_id = f"ord_pend_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-15",
        "endDate": "2026-11-17",
        "status": "pending",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # Lender declines the pending booking
    res = client.post(
        f"/api/payernt/bookings/{order_id}/reject",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reason": "SCHEDULING_CONFLICT", "feedback": "Maintenance on gear"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "rejected"

    updated = get_order_by_id(order_id)
    assert updated["status"] == "rejected"


def test_vendor_can_cancel_accepted_booking_with_reason():
    """Verify that an accepted booking can be cancelled by the vendor prior to handover."""
    env = setup_test_env()
    order_id = f"ord_acc_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 7000.0,
        "startDate": "2026-11-20",
        "endDate": "2026-11-22",
        "status": "accepted",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # Cancel the accepted booking with reason code
    res = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={
            "reasonCode": "NO_LONGER_AVAILABLE",
            "feedback": "Equipment required for unexpected studio shoot",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "cancelled"

    # Status in database / order store must be cancelled
    updated = get_order_by_id(order_id)
    assert updated["status"] == "cancelled"
    assert updated["cancellation_reason"] == "NO_LONGER_AVAILABLE"
    assert updated["cancelled_by"] == "LENDER"

    # Audit trail must be recorded in booking_cancellations
    canc_key = f"booking:{order_id}"
    assert canc_key in MOCK_BOOKING_CANCELLATIONS
    canc_rec = MOCK_BOOKING_CANCELLATIONS[canc_key]
    assert canc_rec["reason_code"] == "NO_LONGER_AVAILABLE"
    assert canc_rec["previous_status"] == "accepted"
    assert canc_rec["new_status"] == "cancelled"
    assert canc_rec["initiated_by"] == "LENDER"


def test_unauthorized_vendor_cannot_cancel_booking():
    """Verify that a vendor who does not own the product cannot cancel someone else's booking."""
    env = setup_test_env()
    order_id = f"ord_unauth_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-25",
        "endDate": "2026-11-26",
        "status": "accepted",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # Stranger tries to cancel
    res = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['stranger_token']}"},
        json={"reasonCode": "PERSONAL_USE"},
    )
    assert res.status_code == 403, res.text
    assert "Unauthorized" in res.json()["detail"]


def test_cannot_cancel_after_handover_verified():
    """Verify that cancellation is rejected once physical handover or pickup has occurred."""
    env = setup_test_env()
    order_id = f"ord_handover_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-28",
        "endDate": "2026-11-30",
        "status": "accepted",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # Set security record with verified handover
    MOCK_RENTAL_SECURITIES[order_id] = {
        "booking_id": order_id,
        "vendor_id": env["lender_email"],
        "renter_id": env["renter_email"],
        "product_id": env["product_id"],
        "vendor_handover_verified": True,
        "rental_started": True,
        "status": "active",
    }

    res = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reasonCode": "NO_LONGER_AVAILABLE"},
    )
    assert res.status_code == 400, res.text
    assert "handover" in res.json()["detail"].lower()


def test_cannot_cancel_completed_booking():
    """Verify that completed or returned bookings cannot be cancelled."""
    env = setup_test_env()
    order_id = f"ord_comp_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-01",
        "endDate": "2026-11-03",
        "status": "completed",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    res = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reasonCode": "NO_LONGER_AVAILABLE"},
    )
    assert res.status_code == 400, res.text
    assert "completed" in res.json()["detail"].lower()


def test_payment_safety_marks_refund_pending_review():
    """Verify that if payment was captured/held, cancellation flags refund_status as pending_review without claiming automatic refund."""
    env = setup_test_env()
    order_id = f"ord_pay_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 5000.0,
        "startDate": "2026-12-01",
        "endDate": "2026-12-03",
        "status": "accepted",
        "payment_status": "captured",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # Ensure payment_status is set in both DB and MOCK_ORDERS
    try:
        from database import execute_query
        execute_query("UPDATE orders SET payment_status = 'captured' WHERE id = %s", (order_id,))
    except Exception:
        pass
    if order_id in MOCK_ORDERS:
        MOCK_ORDERS[order_id]["payment_status"] = "captured"

    res = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reasonCode": "DAMAGED_OR_TECHNICAL_ISSUE", "feedback": "Lens element scratched"},
    )
    assert res.status_code == 200, res.text

    updated = get_order_by_id(order_id)
    assert updated.get("refund_status") == "pending_review"


def test_duplicate_cancellation_prevented():
    """Verify that cancelling an already cancelled booking is rejected."""
    env = setup_test_env()
    order_id = f"ord_dup_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-12-05",
        "endDate": "2026-12-07",
        "status": "accepted",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # First cancel succeeds
    res1 = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reasonCode": "SCHEDULING_CONFLICT"},
    )
    assert res1.status_code == 200

    # Second cancel must fail
    res2 = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reasonCode": "SCHEDULING_CONFLICT"},
    )
    assert res2.status_code == 400
    assert "already been cancelled" in res2.json()["detail"].lower()


def test_other_reason_requires_minimum_5_chars():
    """Verify that selecting 'OTHER' without at least 5 chars explanation is rejected."""
    env = setup_test_env()
    order_id = f"ord_oth_{env['uid']}"
    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-12-10",
        "endDate": "2026-12-12",
        "status": "accepted",
        "lender_email": env["lender_email"],
        "owner_id": env["lender_email"],
    }
    create_order(env["renter_email"], order_payload)

    # 'OTHER' with feedback less than 5 chars
    res = client.post(
        f"/api/payernt/bookings/{order_id}/cancel",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={"reasonCode": "OTHER", "feedback": "no"},
    )
    assert res.status_code == 400
    assert "minimum 5 characters" in res.json()["detail"]
