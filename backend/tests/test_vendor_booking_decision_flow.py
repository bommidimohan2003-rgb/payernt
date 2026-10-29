import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_USERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    create_order,
    execute_query,
    get_order_by_id,
)
from payernt_database import get_payernt_vendor_bookings, MOCK_PAYERNT_PRODUCTS

client = TestClient(app)


def setup_test_environment(custom_category: str = None):
    """Sets up isolated mock users, product, and authorization tokens for decision tests."""
    uid = uuid.uuid4().hex[:6]
    lender_email = f"lender_dec_{uid}@payent.com"
    renter_email = f"renter_dec_{uid}@payent.com"
    stranger_email = f"stranger_dec_{uid}@payent.com"

    category = custom_category or f"Cameras_{uid}"

    MOCK_USERS[lender_email] = {
        "id": lender_email,
        "email": lender_email,
        "full_name": "Authorized Vendor",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "paye₹nt",
        "address": "Vendor HQ, Koramangala 5th Block, Bengaluru 560095",
    }
    MOCK_USERS[renter_email] = {
        "id": renter_email,
        "email": renter_email,
        "full_name": "Renter Customer",
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
        "address": "Stranger Studio, Indiranagar, Bengaluru",
    }

    product_id = f"prod_dec_{uid}"
    MOCK_CUSTOM_PRODUCTS[product_id] = {
        "id": product_id,
        "name": "Sony FX3 Full Cinema Kit",
        "title": "Sony FX3 Full Cinema Kit",
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


def test_booking_location_empty_reports_location_not_provided():
    """Verify that when no location is provided, the backend does not inject a phantom hardcoded address."""
    env = setup_test_environment()
    order_id = f"ord_noloc_{env['uid']}"

    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "status": "pending",
        "deliveryMethod": "delivery",
        "deliveryAddress": "",
        "delivery_address": "",
        "pickupLocation": "",
        "pickup_location": "",
    }
    create_order(env["renter_email"], order_payload)

    # Fetch vendor bookings
    vendor_bookings = get_payernt_vendor_bookings(env["lender_email"])
    matched = next((b for b in vendor_bookings if b["id"] == order_id), None)
    assert matched is not None, f"Booking {order_id} should appear in vendor bookings"

    # Address should NOT be hardcoded Indiranagar Bengaluru
    assert matched["deliveryAddress"] == ""
    assert matched["pickupLocation"] == ""
    assert "Indiranagar" not in (matched["deliveryAddress"] or "")


def test_booking_location_delivery_and_pickup_both_persisted():
    """Verify that both delivery address and pickup location are clearly persisted and returned separately."""
    env = setup_test_environment()
    order_id = f"ord_bothloc_{env['uid']}"

    order_payload = {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 7000.0,
        "startDate": "2026-11-15",
        "endDate": "2026-11-17",
        "status": "pending",
        "deliveryMethod": "delivery",
        "deliveryAddress": "Flat 402, Lotus Palm Towers, Whitefield, Bengaluru",
        "delivery_address": "Flat 402, Lotus Palm Towers, Whitefield, Bengaluru",
        "pickupLocation": "Payent Hub #3, Indiranagar 100ft Road, Bengaluru",
        "pickup_location": "Payent Hub #3, Indiranagar 100ft Road, Bengaluru",
        "locationDirections": "Opposite Metro Pillar 124",
    }
    create_order(env["renter_email"], order_payload)

    vendor_bookings = get_payernt_vendor_bookings(env["lender_email"])
    matched = next((b for b in vendor_bookings if b["id"] == order_id), None)
    assert matched is not None
    assert matched["deliveryAddress"] == "Flat 402, Lotus Palm Towers, Whitefield, Bengaluru"
    assert matched["pickupLocation"] == "Payent Hub #3, Indiranagar 100ft Road, Bengaluru"
    assert matched["locationDirections"] == "Opposite Metro Pillar 124"


def test_authorized_vendor_accept_booking():
    """Verify that an authorized vendor can accept an incoming pending booking."""
    env = setup_test_environment()
    order_id = f"ord_accept_{env['uid']}"

    create_order(env["renter_email"], {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-20",
        "endDate": "2026-11-22",
        "status": "pending",
        "deliveryAddress": "77 Brigade Road, Bengaluru",
    })

    # Accept as authorized lender
    res = client.post(
        f"/api/payernt/bookings/{order_id}/accept",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
    )
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
    body = res.json()
    assert body["success"] is True
    assert body["status"] == "accepted"

    # Verify database persistence
    saved_order = get_order_by_id(order_id)
    assert saved_order is not None
    assert saved_order["status"] == "accepted"

    # Verify customer order visibility
    cust_res = client.get(
        "/api/orders",
        headers={"Authorization": f"Bearer {env['renter_token']}"},
    )
    assert cust_res.status_code == 200
    cust_orders = cust_res.json()
    order_match = next((o for o in cust_orders if o["id"] == order_id), None)
    assert order_match is not None
    assert order_match["status"] == "accepted"


def test_authorized_vendor_decline_booking():
    """Verify that an authorized vendor can decline an incoming booking with a confirmation reason."""
    env = setup_test_environment()
    order_id = f"ord_reject_{env['uid']}"

    create_order(env["renter_email"], {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-11-25",
        "endDate": "2026-11-27",
        "status": "pending",
        "deliveryAddress": "42 Church Street, Bengaluru",
    })

    # Decline as authorized lender
    res = client.post(
        f"/api/payernt/bookings/{order_id}/reject",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
        json={
            "reason": "Equipment undergoing maintenance or repair",
            "feedback": "Device scheduled for sensor calibration",
        },
    )
    assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
    body = res.json()
    assert body["success"] is True
    assert body["status"] == "rejected"

    # Verify database persistence
    saved_order = get_order_by_id(order_id)
    assert saved_order is not None
    assert saved_order["status"] == "rejected"


def test_unauthorized_vendor_cannot_accept_or_decline():
    """Verify that a stranger/unauthorized vendor cannot accept or decline someone else's booking (403 Forbidden)."""
    env = setup_test_environment()
    order_id = f"ord_unauth_{env['uid']}"

    create_order(env["renter_email"], {
        "id": order_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 3500.0,
        "startDate": "2026-12-01",
        "endDate": "2026-12-03",
        "status": "pending",
        "deliveryAddress": "100 MG Road, Bengaluru",
    })

    # Stranger attempts to accept
    accept_res = client.post(
        f"/api/payernt/bookings/{order_id}/accept",
        headers={"Authorization": f"Bearer {env['stranger_token']}"},
    )
    assert accept_res.status_code == 403, f"Expected 403 Forbidden, got {accept_res.status_code}: {accept_res.text}"

    # Stranger attempts to decline
    reject_res = client.post(
        f"/api/payernt/bookings/{order_id}/reject",
        headers={"Authorization": f"Bearer {env['stranger_token']}"},
        json={"reason": "Malicious reject attempt"},
    )
    assert reject_res.status_code == 403, f"Expected 403 Forbidden, got {reject_res.status_code}: {reject_res.text}"

    # Verify status remains pending
    saved_order = get_order_by_id(order_id)
    assert saved_order["status"] == "pending"


def test_invalid_status_transitions():
    """Verify that duplicate decisions or decisions on completed/active orders are rejected (400 Bad Request)."""
    env1 = setup_test_environment(custom_category=f"Category_A_{uuid.uuid4().hex[:4]}")
    order_id = f"ord_dup_{env1['uid']}"

    create_order(env1["renter_email"], {
        "id": order_id,
        "productId": env1["product_id"],
        "product_id": env1["product_id"],
        "category": env1["category"],
        "total": 3500.0,
        "startDate": "2026-12-05",
        "endDate": "2026-12-07",
        "status": "accepted",
    })

    # Duplicate accept attempt
    dup_res = client.post(
        f"/api/payernt/bookings/{order_id}/accept",
        headers={"Authorization": f"Bearer {env1['lender_token']}"},
    )
    assert dup_res.status_code == 400
    assert "already been accepted" in dup_res.text.lower()

    # Completed order accept attempt with a separate renter
    env2 = setup_test_environment(custom_category=f"Category_B_{uuid.uuid4().hex[:4]}")
    completed_id = f"ord_comp_{env2['uid']}"
    create_order(env2["renter_email"], {
        "id": completed_id,
        "productId": env2["product_id"],
        "product_id": env2["product_id"],
        "category": env2["category"],
        "total": 3500.0,
        "startDate": "2026-10-01",
        "endDate": "2026-10-03",
        "status": "completed",
    })

    comp_res = client.post(
        f"/api/payernt/bookings/{completed_id}/accept",
        headers={"Authorization": f"Bearer {env2['lender_token']}"},
    )
    assert comp_res.status_code == 400
    assert "cannot accept booking" in comp_res.text.lower() or "not eligible" in comp_res.text.lower()


def test_scheduling_interval_conflict_prevents_acceptance():
    """Verify that accepting an order whose dates conflict with an existing confirmed order returns 409 Conflict."""
    env = setup_test_environment()

    renter1_email = f"renter1_conf_{env['uid']}@payent.com"
    renter2_email = f"renter2_conf_{env['uid']}@payent.com"

    for r_email in (renter1_email, renter2_email):
        MOCK_USERS[r_email] = {
            "id": r_email,
            "email": r_email,
            "role": "customer",
            "verified": True,
            "status": "active",
            "account_type": "pay₹ent",
        }

    # Order 1: Confirmed / Active for Dec 10-14
    order1_id = f"ord_conf1_{env['uid']}"
    create_order(renter1_email, {
        "id": order1_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "total": 14000.0,
        "startDate": "2026-12-10",
        "endDate": "2026-12-14",
        "status": "confirmed",
    })

    # Order 2: Another pending order with conflicting dates Dec 12-16
    order2_id = f"ord_conf2_{env['uid']}"
    order2_data = {
        "id": order2_id,
        "productId": env["product_id"],
        "product_id": env["product_id"],
        "category": env["category"],
        "user_email": renter2_email,
        "total": 14000.0,
        "startDate": "2026-12-12",
        "endDate": "2026-12-16",
        "start_date": "2026-12-12",
        "end_date": "2026-12-16",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    MOCK_ORDERS[order2_id] = order2_data

    # Attempt to accept Order 2 -> fails with 409 Conflict due to overlap with confirmed Order 1
    res = client.post(
        f"/api/payernt/bookings/{order2_id}/accept",
        headers={"Authorization": f"Bearer {env['lender_token']}"},
    )
    assert res.status_code == 409, f"Expected 409 Conflict, got {res.status_code}: {res.text}"
    assert "conflict" in res.text.lower()
