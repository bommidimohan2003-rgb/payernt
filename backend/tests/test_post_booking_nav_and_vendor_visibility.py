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
    MOCK_KYC_VERIFICATIONS,
)
from payernt_database import (
    MOCK_PAYERNT_PRODUCTS,
    MOCK_PAYERNT_ACCOUNTS,
    get_payernt_vendor_bookings,
)

client = TestClient(app)


def setup_marketplace_entities():
    """Sets up an authentic vendor with listed product, an authentic renter with KYC, and an unrelated third-party vendor."""
    uid = uuid.uuid4().hex[:6]
    vendor_id = f"PAYERNT_VENDOR_{uid}"
    vendor_email = f"vendor_{uid}@payernt.com"
    renter_email = f"renter_{uid}@payent.com"
    other_vendor_id = f"PAYERNT_OTHER_{uid}"
    other_vendor_email = f"othervendor_{uid}@payernt.com"
    stranger_email = f"stranger_{uid}@example.com"

    # 1. Setup Vendor Account & KYC
    MOCK_USERS[vendor_email] = {
        "id": vendor_id,
        "email": vendor_email,
        "full_name": f"Pro Camera Lender {uid}",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "paye₹nt",
        "address": "Indiranagar 100ft Rd, Bengaluru, Karnataka 560038",
    }
    MOCK_PAYERNT_ACCOUNTS[vendor_id] = {
        "id": vendor_id,
        "email": vendor_email,
        "fullName": f"Pro Camera Lender {uid}",
        "status": "APPROVED",
        "isApproved": True,
        "role": "lender",
    }
    MOCK_KYC_VERIFICATIONS[f"kyc_v_{uid}"] = {
        "id": f"kyc_v_{uid}",
        "user_id": vendor_id,
        "email": vendor_email,
        "full_name": f"Pro Camera Lender {uid}",
        "account_type": "payernt",
        "status": "APPROVED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # 2. Setup Other Vendor
    MOCK_USERS[other_vendor_email] = {
        "id": other_vendor_id,
        "email": other_vendor_email,
        "full_name": f"Unrelated Vendor {uid}",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "paye₹nt",
    }
    MOCK_PAYERNT_ACCOUNTS[other_vendor_id] = {
        "id": other_vendor_id,
        "email": other_vendor_email,
        "fullName": f"Unrelated Vendor {uid}",
        "status": "APPROVED",
        "isApproved": True,
        "role": "lender",
    }

    # 3. Setup Renter Customer & KYC
    MOCK_USERS[renter_email] = {
        "id": renter_email,
        "email": renter_email,
        "full_name": f"Renter User {uid}",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "pay₹ent",
    }
    MOCK_KYC_VERIFICATIONS[f"kyc_r_{uid}"] = {
        "id": f"kyc_r_{uid}",
        "user_id": renter_email,
        "email": renter_email,
        "full_name": f"Renter User {uid}",
        "account_type": "payrent",
        "status": "APPROVED",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # 4. Setup Stranger
    MOCK_USERS[stranger_email] = {
        "id": stranger_email,
        "email": stranger_email,
        "full_name": "Unauthorized Stranger",
        "role": "customer",
        "verified": True,
    }

    # 5. Product owned by the authentic vendor
    product_id = f"prod_gear_{uid}"
    category = f"Cameras_{uid}"
    prod_data = {
        "id": product_id,
        "name": f"Sony A7S III Cinema Kit {uid}",
        "title": f"Sony A7S III Cinema Kit {uid}",
        "category": category,
        "price": 2500.0,
        "daily_rate": 2500.0,
        "owner_id": vendor_id,
        "owner_email": vendor_email,
        "owner_name": f"Pro Camera Lender {uid}",
        "user_email": vendor_email,
        "available": True,
        "is_available": True,
        "availability_status": "available",
        "vendor_secret_pin": "7821",
        "city": "Bengaluru, Karnataka",
        "primary_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
    }
    MOCK_CUSTOM_PRODUCTS[product_id] = prod_data
    MOCK_PAYERNT_PRODUCTS[product_id] = prod_data

    # Generate access tokens
    vendor_token = create_access_token({
        "sub": vendor_email,
        "role": "lender",
        "account_type": "paye₹nt",
        "user_id": vendor_id,
        "email": vendor_email,
    })
    other_vendor_token = create_access_token({
        "sub": other_vendor_email,
        "role": "lender",
        "account_type": "paye₹nt",
        "user_id": other_vendor_id,
        "email": other_vendor_email,
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
        "role": "customer",
        "user_id": stranger_email,
        "email": stranger_email,
    })

    return {
        "vendor_id": vendor_id,
        "vendor_email": vendor_email,
        "vendor_token": vendor_token,
        "other_vendor_id": other_vendor_id,
        "other_vendor_token": other_vendor_token,
        "renter_email": renter_email,
        "renter_token": renter_token,
        "stranger_token": stranger_token,
        "product_id": product_id,
        "category": category,
    }


def test_post_booking_lifecycle_and_vendor_visibility():
    """
    Tests the complete end-to-end booking submission, confirmation,
    persisted booking details retrieval, and vendor request visibility.
    """
    env = setup_marketplace_entities()
    now_dt = datetime.now(timezone.utc)
    start_str = (now_dt + timedelta(days=2)).strftime("%Y-%m-%d")
    end_str = (now_dt + timedelta(days=5)).strftime("%Y-%m-%d")
    booking_id = f"ord_test_{uuid.uuid4().hex[:8]}"

    payload = {
        "id": booking_id,
        "productId": env["product_id"],
        "productTitle": "Sony A7S III Cinema Kit",
        "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "startDate": start_str,
        "endDate": end_str,
        "total": 7500.0,
        "status": "pending",
        "deliveryMethod": "delivery",
        "deliveryAddress": "124 Indiranagar, Bengaluru, Karnataka",
        "locationDirections": "Opposite Metro Station, Pillar 42",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }

    # 1. Renter submits booking to backend
    headers = {"Authorization": f"Bearer {env['renter_token']}"}
    create_res = client.post("/api/orders", json=payload, headers=headers)
    assert create_res.status_code == 200, f"Order creation failed: {create_res.text}"
    create_data = create_res.json()
    assert create_data.get("success") is True
    assert create_data.get("id") == booking_id
    assert create_data.get("bookingId") == booking_id
    assert create_data.get("status") in ("pending", "active")

    # 2. Verify direct retrieval via /api/bookings/{id} for renter
    b_res = client.get(f"/api/bookings/{booking_id}", headers=headers)
    assert b_res.status_code == 200, f"Fetch booking failed: {b_res.text}"
    b_data = b_res.json()
    assert b_data["id"] == booking_id
    assert b_data["productId"] == env["product_id"]
    assert b_data["total"] == 7500.0
    assert b_data["startDate"] == start_str
    assert b_data["endDate"] == end_str
    assert b_data["deliveryAddress"] == "124 Indiranagar, Bengaluru, Karnataka"
    assert b_data["vendorName"] is not None
    assert "vendor" in b_data
    assert b_data["vendor"]["name"] is not None
    assert b_data["vendor"]["city"] is not None
    assert b_data["paymentStatus"] == "paid"

    # 3. Verify vendor can retrieve this booking on Payernt side
    vendor_headers = {"Authorization": f"Bearer {env['vendor_token']}"}
    v_res = client.get("/api/payernt/bookings", headers=vendor_headers)
    assert v_res.status_code == 200, f"Vendor bookings fetch failed: {v_res.text}"
    v_data = v_res.json()
    assert v_data.get("success") is True
    bookings_list = v_data.get("bookings", [])
    matched = [b for b in bookings_list if b.get("id") == booking_id or b.get("bookingId") == booking_id]
    assert len(matched) == 1, f"Booking {booking_id} not found in vendor requests! Found: {[b.get('id') for b in bookings_list]}"

    vendor_booking = matched[0]
    assert vendor_booking["productId"] == env["product_id"]
    assert vendor_booking["renterEmail"] == env["renter_email"]
    assert vendor_booking["status"] in ("pending", "requested")

    # 4. Verify another vendor CANNOT see this booking
    other_headers = {"Authorization": f"Bearer {env['other_vendor_token']}"}
    other_res = client.get("/api/payernt/bookings", headers=other_headers)
    assert other_res.status_code == 200
    other_list = other_res.json().get("bookings", [])
    other_matched = [b for b in other_list if b.get("id") == booking_id or b.get("bookingId") == booking_id]
    assert len(other_matched) == 0, "Booking leaked to an unrelated vendor!"

    # 5. Verify unauthorized stranger CANNOT view booking details via /api/bookings/{id}
    stranger_headers = {"Authorization": f"Bearer {env['stranger_token']}"}
    stranger_res = client.get(f"/api/bookings/{booking_id}", headers=stranger_headers)
    assert stranger_res.status_code in (403, 404), "Unauthorized stranger accessed booking details!"


def test_booking_details_endpoint_compatibility():
    """
    Tests both /api/bookings/{id} and /api/orders/{id} routes return identical
    persisted canonical data for browser direct navigation and refresh.
    """
    env = setup_marketplace_entities()
    now_dt = datetime.now(timezone.utc)
    booking_id = f"ord_compat_{uuid.uuid4().hex[:8]}"

    payload = {
        "id": booking_id,
        "productId": env["product_id"],
        "productTitle": "Sony Cinema Lens",
        "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "startDate": (now_dt + timedelta(days=3)).strftime("%Y-%m-%d"),
        "endDate": (now_dt + timedelta(days=6)).strftime("%Y-%m-%d"),
        "total": 5000.0,
        "status": "pending",
        "deliveryMethod": "pickup",
        "pickupLocation": "Indiranagar Hub, Bengaluru",
    }

    headers = {"Authorization": f"Bearer {env['renter_token']}"}
    c_res = client.post("/api/orders", json=payload, headers=headers)
    assert c_res.status_code == 200

    # Fetch from /api/bookings/{id}
    res_b = client.get(f"/api/bookings/{booking_id}", headers=headers)
    assert res_b.status_code == 200
    data_b = res_b.json()

    # Fetch from /api/orders/{id}
    res_o = client.get(f"/api/orders/{booking_id}", headers=headers)
    assert res_o.status_code == 200
    data_o = res_o.json()

    assert data_b["id"] == data_o["id"] == booking_id
    assert data_b["productId"] == data_o["productId"] == env["product_id"]
    assert data_b["deliveryMethod"] == data_o["deliveryMethod"] == "pickup"
    assert data_b["vendorName"] == data_o["vendorName"]
