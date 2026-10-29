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
    get_order_by_id,
    record_booking_cancellation,
)
from payernt_database import (
    MOCK_PAYERNT_ACCOUNTS,
    MOCK_PAYERNT_PRODUCTS,
    MOCK_RENTAL_SECURITIES,
    get_payernt_vendor_bookings,
    invalidate_vendor_dashboard_cache,
)

client = TestClient(app)


def setup_cancellation_env():
    """Sets up isolated mock users, product, and authorization tokens."""
    uid = uuid.uuid4().hex[:6]
    lender_email = f"lender_sync_{uid}@payent.com"
    renter_email = f"renter_sync_{uid}@payent.com"
    stranger_email = f"stranger_sync_{uid}@payent.com"
    vendor_id = f"vnd_{uid}"

    MOCK_USERS[lender_email] = {
        "id": lender_email,
        "email": lender_email,
        "full_name": "Lender Sync",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "account_type": "payernt",
        "kyc_status": "APPROVED",
    }
    MOCK_PAYERNT_ACCOUNTS[vendor_id] = {
        "id": vendor_id,
        "email": lender_email,
        "name": "Lender Sync",
        "role": "vendor",
        "kyc_status": "APPROVED",
    }
    MOCK_USERS[renter_email] = {
        "id": renter_email,
        "email": renter_email,
        "full_name": "Renter Sync",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "account_type": "payrent",
        "kyc_status": "APPROVED",
    }
    MOCK_USERS[stranger_email] = {
        "id": stranger_email,
        "email": stranger_email,
        "full_name": "Stranger Sync",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "account_type": "payrent",
        "kyc_status": "APPROVED",
    }

    product_id = f"prod_sync_{uid}"
    MOCK_CUSTOM_PRODUCTS[product_id] = {
        "id": product_id,
        "title": "Sync Pro Camera",
        "category": "Cameras",
        "price": 800,
        "daily_rate": 800,
        "user_email": lender_email,
        "owner_id": vendor_id,
        "owner_email": lender_email,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }
    MOCK_PAYERNT_PRODUCTS[product_id] = {
        "id": product_id,
        "title": "Sync Pro Camera",
        "category": "Cameras",
        "daily_rate": 800,
        "owner_id": vendor_id,
        "owner_email": lender_email,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }

    renter_token = create_access_token({"sub": renter_email, "role": "customer", "account_type": "payrent"})
    lender_token = create_access_token({"sub": lender_email, "role": "vendor", "account_type": "payernt", "account_id": vendor_id})
    stranger_token = create_access_token({"sub": stranger_email, "role": "customer", "account_type": "payrent"})

    return {
        "lender_email": lender_email,
        "renter_email": renter_email,
        "stranger_email": stranger_email,
        "vendor_id": vendor_id,
        "product_id": product_id,
        "renter_token": renter_token,
        "lender_token": lender_token,
        "stranger_token": stranger_token,
    }


def test_renter_cancellation_persists_and_updates_vendor():
    env = setup_cancellation_env()
    booking_id = f"ord_sync_{uuid.uuid4().hex[:6]}"

    # Seed booking in MOCK_ORDERS and MOCK_RENTAL_SECURITIES
    MOCK_ORDERS[booking_id] = {
        "id": booking_id,
        "product_id": env["product_id"],
        "productId": env["product_id"],
        "product_title": "Sync Pro Camera",
        "user_email": env["renter_email"],
        "owner_id": env["vendor_id"],
        "lender_email": env["lender_email"],
        "start_date": "2026-11-10",
        "end_date": "2026-11-12",
        "total": 1600.0,
        "status": "confirmed",
        "payment_status": "held",
        "delivery_status": "WAITING_FOR_ADMIN",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    MOCK_RENTAL_SECURITIES[booking_id] = {
        "booking_id": booking_id,
        "product_id": env["product_id"],
        "vendor_id": env["vendor_id"],
        "renter_id": env["renter_email"],
        "status": "confirmed",
        "vendor_handover_verified": False,
        "renter_handover_verified": False,
    }

    # Verify initial vendor bookings shows confirmed
    vendor_bookings = get_payernt_vendor_bookings(vendor_id=env["vendor_id"])
    target_vb = next((b for b in vendor_bookings if b["id"] == booking_id), None)
    assert target_vb is not None
    assert target_vb["status"] == "confirmed"

    # Renter cancels booking via API
    res = client.post(
        f"/api/orders/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {env['renter_token']}"},
        json={"reason": "SCHEDULE_CONFLICT", "notes": "Plans changed"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "cancelled"
    assert data["bookingId"] == booking_id

    # Verify order status in MOCK_ORDERS is updated to cancelled
    assert MOCK_ORDERS[booking_id]["status"] == "cancelled"
    assert MOCK_ORDERS[booking_id]["refund_status"] == "pending_review"

    # Verify in-memory rental security is updated to cancelled
    assert MOCK_RENTAL_SECURITIES[booking_id]["status"] == "cancelled"

    # Verify vendor bookings endpoint now reflects cancelled
    vendor_bookings_after = get_payernt_vendor_bookings(vendor_id=env["vendor_id"])
    target_vb_after = next((b for b in vendor_bookings_after if b["id"] == booking_id), None)
    assert target_vb_after is not None
    assert target_vb_after["status"] == "cancelled"

    # Verify via vendor API endpoint as well
    api_vb_res = client.get(
        "/api/payernt/bookings",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
    )
    assert api_vb_res.status_code == 200
    api_bookings = api_vb_res.json().get("bookings", [])
    api_target = next((b for b in api_bookings if b["id"] == booking_id), None)
    assert api_target is not None
    assert api_target["status"] == "cancelled"


def test_cannot_cancel_already_cancelled_booking():
    env = setup_cancellation_env()
    booking_id = f"ord_sync_{uuid.uuid4().hex[:6]}"

    MOCK_ORDERS[booking_id] = {
        "id": booking_id,
        "product_id": env["product_id"],
        "user_email": env["renter_email"],
        "owner_id": env["vendor_id"],
        "status": "cancelled",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    res = client.post(
        f"/api/orders/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {env['renter_token']}"},
    )
    assert res.status_code == 400
    assert "already been cancelled" in res.json()["detail"].lower()


def test_cannot_cancel_completed_booking():
    env = setup_cancellation_env()
    booking_id = f"ord_sync_{uuid.uuid4().hex[:6]}"

    MOCK_ORDERS[booking_id] = {
        "id": booking_id,
        "product_id": env["product_id"],
        "user_email": env["renter_email"],
        "owner_id": env["vendor_id"],
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    res = client.post(
        f"/api/orders/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {env['renter_token']}"},
    )
    assert res.status_code == 400
    assert "completed" in res.json()["detail"].lower()


def test_cannot_cancel_after_handover_or_pickup():
    env = setup_cancellation_env()
    booking_id = f"ord_sync_{uuid.uuid4().hex[:6]}"

    MOCK_ORDERS[booking_id] = {
        "id": booking_id,
        "product_id": env["product_id"],
        "user_email": env["renter_email"],
        "owner_id": env["vendor_id"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    MOCK_RENTAL_SECURITIES[booking_id] = {
        "booking_id": booking_id,
        "product_id": env["product_id"],
        "vendor_id": env["vendor_id"],
        "renter_id": env["renter_email"],
        "status": "active",
        "vendor_handover_verified": True,
        "renter_handover_verified": True,
    }

    res = client.post(
        f"/api/orders/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {env['renter_token']}"},
    )
    assert res.status_code == 400
    assert "handover" in res.json()["detail"].lower()


def test_unauthorized_user_cannot_cancel():
    env = setup_cancellation_env()
    booking_id = f"ord_sync_{uuid.uuid4().hex[:6]}"

    MOCK_ORDERS[booking_id] = {
        "id": booking_id,
        "product_id": env["product_id"],
        "user_email": env["renter_email"],
        "owner_id": env["vendor_id"],
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    res = client.post(
        f"/api/orders/{booking_id}/cancel",
        headers={"Authorization": f"Bearer {env['stranger_token']}"},
    )
    assert res.status_code == 403

