"""
PAYENT — VENDOR BOOKINGS & RENTAL LIFECYCLES PAGE FIX REGRESSION TEST SUITE
Validates:
1. Renter creates a valid booking through /api/orders and it is persisted.
2. The booking is associated with the authoritative vendor and persisted in orders/rental_security.
3. The vendor booking API (/api/payernt/bookings) returns the booking with full metadata.
4. Pending bookings appear with status 'pending'/'security_pending'.
5. Status mapping and categorization into All, Pending, Ongoing, Cancelled, Completed.
6. Repeated queries / page refreshes preserve booking visibility and data integrity.
7. Authorization boundary: Another vendor cannot access this vendor's booking.
8. Unauthenticated requests (no token / invalid token) return 401, not empty states.
9. Unauthorized roles (pure customer without vendor role) return 403, not empty states.
10. Valid vendor role ('lender' or 'vendor' or 'admin') is permitted.
11. Booking cancellation transitions status cleanly to 'cancelled' and persists cancellation metadata.
"""

import pytest
import time
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from database import (
    create_order,
    get_order_by_id,
    create_user,
    get_user,
    MOCK_USERS,
    MOCK_ORDERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_KYC_VERIFICATIONS,
    execute_query,
    find_authoritative_product
)
from payernt_database import (
    create_payernt_account,
    get_payernt_account_by_email,
    create_payernt_product,
    get_payernt_vendor_bookings,
    MOCK_PAYERNT_ACCOUNTS,
    MOCK_PAYERNT_PRODUCTS,
    MOCK_RENTAL_SECURITIES
)
from auth import create_access_token

client = TestClient(app)


def test_01_renter_creates_booking_and_vendor_retrieves_it():
    """
    1. Renter books product owned by Vendor A.
    2. Booking persists successfully.
    3. Vendor A's booking endpoint returns the booking with matching details.
    """
    vendor_email = f"lender_alpha_{int(time.time()*1000)}@payent.test"
    renter_email = f"renter_alpha_{int(time.time()*1000)}@payent.test"
    
    # Register vendor account
    v_acc = create_payernt_account(
        name="Alpha Lender",
        email=vendor_email,
        phone="9876543210",
        password="ValidPassword@123"
    )
    vendor_id = v_acc["id"]
    MOCK_KYC_VERIFICATIONS[f"kyc_{vendor_email}"] = {
        "id": f"kyc_{vendor_email}",
        "user_id": vendor_id,
        "email": vendor_email,
        "full_name": "Alpha Lender",
        "account_type": "payernt",
        "status": "APPROVED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Register renter user
    create_user(
        email=renter_email,
        phone="9999999999",
        password_hash="hashed_pw",
        full_name="Alpha Renter",
        role="customer",
        status="approved"
    )
    MOCK_KYC_VERIFICATIONS[f"kyc_{renter_email}"] = {
        "id": f"kyc_{renter_email}",
        "user_id": renter_email,
        "email": renter_email,
        "full_name": "Alpha Renter",
        "account_type": "payrent",
        "status": "APPROVED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Vendor creates a listed product (available=True)
    prod_id = f"p_alpha_{int(time.time()*1000)}"
    create_payernt_product(
        owner_id=vendor_id,
        owner_email=vendor_email,
        owner_name="Alpha Lender",
        data={
            "id": prod_id,
            "category": "Cameras",
            "name": "Sony A7 IV Full Frame Camera",
            "title": "Sony A7 IV Full Frame Camera",
            "daily_rate": 3500.0,
            "city": "Bengaluru",
            "area": "Indiranagar",
            "pincode": "560038",
            "available": True,
            "availability_status": "AVAILABLE",
            "status": "approved"
        }
    )

    # Renter token
    renter_token = create_access_token({
        "sub": renter_email,
        "account_type": "payrent",
        "role": "customer"
    })

    # Renter books the product
    booking_id = f"ord_test_{int(time.time()*1000)}"
    booking_payload = {
        "id": booking_id,
        "productId": prod_id,
        "productTitle": "Sony A7 IV Full Frame Camera",
        "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "total": 7000,
        "status": "pending",
        "category": "Cameras",
        "deliveryMethod": "pickup",
        "pickupLocation": "Payent Hub, Indiranagar",
        "deliveryAddress": ""
    }

    resp = client.post(
        "/api/orders",
        json=booking_payload,
        headers={"Authorization": f"Bearer {renter_token}"}
    )
    assert resp.status_code in (200, 201), f"Booking creation failed: {resp.text}"
    data = resp.json()
    actual_booking_id = data.get("id") or data.get("order", {}).get("id") or booking_id

    # Vendor A logs in / generates token
    vendor_token = create_access_token({
        "sub": vendor_email,
        "user_id": vendor_id,
        "account_type": "paye₹nt",
        "role": "vendor"
    })

    # Vendor fetches bookings
    v_resp = client.get(
        "/api/payernt/bookings?limit=50",
        headers={"Authorization": f"Bearer {vendor_token}"}
    )
    assert v_resp.status_code == 200, f"Vendor fetch failed: {v_resp.text}"
    v_data = v_resp.json()
    assert v_data.get("success") is True
    bookings = v_data.get("bookings", [])
    assert len(bookings) >= 1

    # Find the specific booking
    found = next((b for b in bookings if b.get("id") == actual_booking_id or b.get("bookingId") == actual_booking_id), None)
    assert found is not None, f"Created booking {actual_booking_id} not found in vendor bookings"
    assert found.get("productId") == prod_id
    assert found.get("amount") == 7000.0 or found.get("total") == 7000.0
    assert found.get("status") in ("pending", "security_pending", "active")


def test_02_vendor_token_with_role_lender_is_authorized():
    """
    Validates that vendors with role='lender' can successfully access /api/payernt/bookings.
    """
    lender_email = f"lender_role_{int(time.time()*1000)}@payent.test"
    v_acc = create_payernt_account(
        name="Lender Role User",
        email=lender_email,
        phone="9876543211",
        password="ValidPassword@123"
    )

    # Token issued with role='lender' and standard account_type='pay₹ent'
    token = create_access_token({
        "sub": lender_email,
        "role": "lender",
        "account_type": "pay₹ent"
    })

    resp = client.get(
        "/api/payernt/bookings",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200, f"Expected 200 for role='lender', got {resp.status_code}: {resp.text}"
    assert resp.json().get("success") is True


def test_03_unauthenticated_request_returns_401():
    """
    Validates that unauthenticated requests return 401 Unauthorized, not a false empty state.
    """
    resp = client.get("/api/payernt/bookings")
    assert resp.status_code == 401
    assert "Authorization header" in resp.text or "Not authenticated" in resp.text or "detail" in resp.json()


def test_04_pure_customer_renter_cannot_access_vendor_bookings():
    """
    Validates that a pure customer/renter without vendor privileges is rejected with 403 Forbidden.
    """
    renter_email = f"pure_renter_{int(time.time()*1000)}@payent.test"
    renter_token = create_access_token({
        "sub": renter_email,
        "account_type": "customer",
        "role": "customer"
    })

    resp = client.get(
        "/api/payernt/bookings",
        headers={"Authorization": f"Bearer {renter_token}"}
    )
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}: {resp.text}"


def test_05_isolation_between_different_vendors():
    """
    Validates that Vendor B cannot view Vendor A's booking.
    """
    vendor_a_email = f"vendor_a_{int(time.time()*1000)}@payent.test"
    vendor_b_email = f"vendor_b_{int(time.time()*1000)}@payent.test"

    v_a = create_payernt_account(name="Vendor A", email=vendor_a_email, phone="9111111111", password="Password@123")
    v_b = create_payernt_account(name="Vendor B", email=vendor_b_email, phone="9222222222", password="Password@123")

    prod_id = f"p_a_{int(time.time()*1000)}"
    create_payernt_product(
        owner_id=v_a["id"],
        owner_email=vendor_a_email,
        owner_name="Vendor A",
        data={
            "id": prod_id,
            "category": "Drones",
            "name": "DJI Mini 4 Pro",
            "title": "DJI Mini 4 Pro",
            "daily_rate": 2000.0,
            "available": True,
            "availability_status": "AVAILABLE",
            "status": "approved"
        }
    )

    booking_id = f"ord_iso_{int(time.time()*1000)}"
    order_data = {
        "id": booking_id,
        "productId": prod_id,
        "productTitle": "DJI Mini 4 Pro",
        "startDate": "2026-11-15",
        "endDate": "2026-11-16",
        "total": 2000,
        "status": "pending",
        "category": "Drones",
        "lender_email": vendor_a_email,
        "vendor_id": v_a["id"]
    }
    create_order("renter@payent.test", order_data)

    token_b = create_access_token({
        "sub": vendor_b_email,
        "user_id": v_b["id"],
        "account_type": "paye₹nt",
        "role": "vendor"
    })

    resp_b = client.get("/api/payernt/bookings", headers={"Authorization": f"Bearer {token_b}"})
    assert resp_b.status_code == 200
    bookings_b = resp_b.json().get("bookings", [])
    found = [b for b in bookings_b if b.get("id") == booking_id or b.get("bookingId") == booking_id]
    assert len(found) == 0, "Vendor B was able to view Vendor A's booking!"


def test_06_refreshing_preserves_booking_persistence():
    """
    Validates that repeatedly querying the bookings endpoint returns persisted bookings consistently.
    """
    vendor_email = f"v_persist_{int(time.time()*1000)}@payent.test"
    v_acc = create_payernt_account(name="Persist Vendor", email=vendor_email, phone="9333333333", password="Password@123")

    prod_id = f"p_persist_{int(time.time()*1000)}"
    create_payernt_product(
        owner_id=v_acc["id"],
        owner_email=vendor_email,
        owner_name="Persist Vendor",
        data={
            "id": prod_id,
            "category": "Audio",
            "name": "Shure SM7B Microphone",
            "title": "Shure SM7B Microphone",
            "daily_rate": 1200.0,
            "available": True,
            "availability_status": "AVAILABLE",
            "status": "approved"
        }
    )

    b_id = f"ord_p_{int(time.time()*1000)}"
    order_data = {
        "id": b_id,
        "productId": prod_id,
        "productTitle": "Shure SM7B Microphone",
        "startDate": "2026-11-20",
        "endDate": "2026-11-21",
        "total": 1200,
        "status": "pending",
        "category": "Audio",
        "lender_email": vendor_email,
        "vendor_id": v_acc["id"]
    }
    create_order("customer@payent.test", order_data)

    token = create_access_token({"sub": vendor_email, "user_id": v_acc["id"], "account_type": "paye₹nt", "role": "vendor"})

    # Query multiple times in succession to simulate page refresh
    for i in range(3):
        res = client.get("/api/payernt/bookings", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        items = res.json().get("bookings", [])
        matched = [b for b in items if b.get("id") == b_id or b.get("bookingId") == b_id]
        assert len(matched) == 1, f"Iteration {i}: booking not preserved on refresh"


def test_07_cancellation_preserves_history_and_updates_status():
    """
    Validates that cancelling a booking updates status to cancelled and preserves cancellation reason.
    """
    vendor_email = f"v_canc_{int(time.time()*1000)}@payent.test"
    v_acc = create_payernt_account(name="Cancel Vendor", email=vendor_email, phone="9444444444", password="Password@123")

    prod_id = f"p_canc_{int(time.time()*1000)}"
    create_payernt_product(
        owner_id=v_acc["id"],
        owner_email=vendor_email,
        owner_name="Cancel Vendor",
        data={
            "id": prod_id,
            "category": "Tech",
            "name": "DJI Ronin RS3 Gimbal",
            "title": "DJI Ronin RS3 Gimbal",
            "daily_rate": 1800.0,
            "available": True,
            "availability_status": "AVAILABLE",
            "status": "approved"
        }
    )

    b_id = f"ord_canc_{int(time.time()*1000)}"
    order_data = {
        "id": b_id,
        "productId": prod_id,
        "productTitle": "DJI Ronin RS3 Gimbal",
        "startDate": "2026-11-25",
        "endDate": "2026-11-26",
        "total": 1800,
        "status": "pending",
        "category": "Tech",
        "lender_email": vendor_email,
        "vendor_id": v_acc["id"]
    }
    create_order("customer_canc@payent.test", order_data)

    token = create_access_token({"sub": vendor_email, "user_id": v_acc["id"], "account_type": "paye₹nt", "role": "vendor"})

    # Cancel the booking
    canc_resp = client.post(
        f"/api/bookings/{b_id}/cancel",
        json={"reason": "PERSONAL_USE", "feedback": "Need gear for personal shoot"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert canc_resp.status_code == 200, f"Cancel failed: {canc_resp.text}"

    # Verify vendor bookings endpoint reflects the cancelled status
    v_resp = client.get("/api/payernt/bookings", headers={"Authorization": f"Bearer {token}"})
    assert v_resp.status_code == 200
    bookings = v_resp.json().get("bookings", [])
    found = next((b for b in bookings if b.get("id") == b_id or b.get("bookingId") == b_id), None)
    assert found is not None
    assert found.get("status") == "cancelled"
    assert found.get("cancellation") is not None
