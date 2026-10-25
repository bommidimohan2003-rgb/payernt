import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from database import (
    MOCK_USERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    create_order,
)

client = TestClient(app)

def setup_mock_test_users():
    uid = uuid.uuid4().hex[:6]
    renter_email = f"renter_loc_{uid}@payent.com"
    lender_email = f"lender_loc_{uid}@payent.com"
    stranger_email = f"stranger_loc_{uid}@payent.com"

    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Renter Loc Tester",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "address": "123 Renter St, Indiranagar, Bengaluru 560038",
    }
    MOCK_USERS[lender_email] = {
        "id": lender_email,
        "email": lender_email,
        "full_name": "Lender Loc Tester",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
        "account_type": "paye₹nt",
        "address": "456 Lender Hub, Koramangala, Bengaluru 560034",
    }
    MOCK_USERS[stranger_email] = {
        "email": stranger_email,
        "full_name": "Stranger Tester",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }

    renter_token = create_access_token({"sub": renter_email, "role": "customer", "account_type": "pay₹ent", "user_id": renter_email})
    lender_token = create_access_token({"sub": lender_email, "role": "lender", "account_type": "paye₹nt", "user_id": lender_email})
    stranger_token = create_access_token({"sub": stranger_email, "role": "customer", "account_type": "pay₹ent", "user_id": stranger_email})

    return {
        "renter_email": renter_email,
        "lender_email": lender_email,
        "stranger_email": stranger_email,
        "renter_headers": {"Authorization": f"Bearer {renter_token}"},
        "lender_headers": {"Authorization": f"Bearer {lender_token}"},
        "stranger_headers": {"Authorization": f"Bearer {stranger_token}"},
    }

def test_delivery_booking_creation_and_location_display():
    """Test 1: Delivery booking displays full delivery address, map link, and delivery method."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_deliv_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Canon Cinema Lens Kit",
        "price": 2000,
        "category": f"Cameras_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "approved",
    }

    order_id = f"ord_deliv_{uuid.uuid4().hex[:8]}"
    order = create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "Canon Cinema Lens Kit",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-01",
            "endDate": "2026-11-04",
            "total": 6000,
            "status": "requested",
            "deliveryMethod": "delivery",
            "deliveryAddress": "Tower 2, Flat 804, Prestige Palms, Whitefield, Bengaluru 560066",
            "locationDirections": "Opposite Sigma Tech Park, gate code #804",
            "latitude": 12.9698,
            "longitude": 77.7499,
        }
    )

    assert order["deliveryMethod"] == "delivery"
    assert "Prestige Palms" in order["deliveryAddress"]
    assert "Sigma Tech Park" in order["locationDirections"]

    # Verify GET /api/orders/{id}/location for renter
    res = client.get(f"/api/orders/{order_id}/location", headers=ctx["renter_headers"])
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["deliveryMethod"] == "delivery"
    assert "Prestige Palms" in data["deliveryAddress"]
    assert "https://www.google.com/maps/search/?api=1" in data["mapUrl"]

    # Verify GET /api/orders/{id}/location for lender
    res_lender = client.get(f"/api/orders/{order_id}/location", headers=ctx["lender_headers"])
    assert res_lender.status_code == 200, res_lender.text
    assert res_lender.json()["deliveryAddress"] == data["deliveryAddress"]

    # Verify Lender Bookings endpoint maps location fields
    res_vendor = client.get("/api/payernt/bookings", headers=ctx["lender_headers"])
    assert res_vendor.status_code == 200, res_vendor.text
    vendor_bookings = res_vendor.json().get("bookings", [])
    matching = [b for b in vendor_bookings if b.get("bookingId") == order_id or b.get("id") == order_id]
    assert len(matching) > 0
    vb = matching[0]
    assert vb["deliveryMethod"] == "delivery"
    assert "Prestige Palms" in vb["deliveryAddress"]
    assert vb["mapUrl"] is not None

def test_owner_pickup_booking():
    """Test 2: Owner pickup booking displays agreed pickup location and map link."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_pickup_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "RED Komodo 6K Camera",
        "price": 5000,
        "category": f"Cameras_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "approved",
    }

    order_id = f"ord_pickup_{uuid.uuid4().hex[:8]}"
    order = create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "RED Komodo 6K Camera",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-05",
            "endDate": "2026-11-08",
            "total": 15000,
            "status": "requested",
            "deliveryMethod": "pickup",
            "pickupLocation": "Payent Hub Koramangala 4th Block, 80 Feet Road, Bengaluru",
            "locationDirections": "Ask at reception desk for Locker B-12",
        }
    )

    assert order["deliveryMethod"] == "pickup"
    assert "Koramangala" in order["pickupLocation"]

    res = client.get(f"/api/orders/{order_id}/location", headers=ctx["renter_headers"])
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["deliveryMethod"] == "pickup"
    assert "Koramangala" in data["pickupLocation"]
    assert "Locker B-12" in data["locationDirections"]
    assert "google.com/maps" in data["mapUrl"]

def test_custom_location_booking():
    """Test 3: Custom location booking displays custom meetup spot and additional directions."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_custom_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Aputure 600d Pro Light",
        "price": 1800,
        "category": f"Lighting_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "approved",
    }

    order_id = f"ord_custom_{uuid.uuid4().hex[:8]}"
    order = create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "Aputure 600d Pro Light",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-10",
            "endDate": "2026-11-12",
            "total": 3600,
            "status": "requested",
            "deliveryMethod": "custom",
            "customLocation": "Studio 4B, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru",
            "locationDirections": "First floor soundstage, call sound engineer on arrival",
        }
    )

    assert order["deliveryMethod"] == "custom"
    assert "Studio 4B" in order["customLocation"]

    res = client.get(f"/api/orders/{order_id}/location", headers=ctx["lender_headers"])
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["deliveryMethod"] == "custom"
    assert "Studio 4B" in data["customLocation"]
    assert "soundstage" in data["locationDirections"]

def test_missing_address_fallback():
    """Test 4: Missing address gracefully defaults with fallback message without crashing."""
    ctx = setup_mock_test_users()
    # Explicitly clear address from user profile to test missing address scenario
    MOCK_USERS[ctx["renter_email"]]["address"] = ""
    MOCK_USERS[ctx["renter_email"]]["city"] = ""
    MOCK_USERS[ctx["renter_email"]]["pincode"] = ""

    prod_id = f"prod_loc_missing_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "DJI Ronin RS3 Gimbal",
        "price": 1500,
        "category": f"Gimbals_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "approved",
    }

    order_id = f"ord_missing_{uuid.uuid4().hex[:8]}"
    create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "DJI Ronin RS3 Gimbal",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-15",
            "endDate": "2026-11-16",
            "total": 1500,
            "status": "requested",
            "deliveryMethod": "delivery",
            "deliveryAddress": "",  # Missing address
        }
    )

    res = client.get(f"/api/orders/{order_id}/location", headers=ctx["renter_headers"])
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["deliveryMethod"] == "delivery"
    assert data["hasMissingAddress"] is True
    assert data.get("displayLocation") is not None or data.get("primaryLocation") is not None

def test_location_update_before_acceptance_updates_directly():
    """Test 5: Location change BEFORE lender accepts updates the booking directly."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_direct_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Sony A7S III Camera",
        "price": 2500,
        "category": f"Cameras_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "requested",
    }

    order_id = f"ord_direct_{uuid.uuid4().hex[:8]}"
    create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "Sony A7S III Camera",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-20",
            "endDate": "2026-11-23",
            "total": 7500,
            "status": "requested",  # unaccepted
            "deliveryMethod": "delivery",
            "deliveryAddress": "Old Address 101, Bengaluru",
        }
    )

    # Renter changes location before lender acceptance
    update_payload = {
        "delivery_method": "delivery",
        "delivery_address": "New Direct Address 999, Indiranagar, Bengaluru",
        "location_directions": "Updated buzzer code 99",
    }
    res = client.put(f"/api/orders/{order_id}/location", json=update_payload, headers=ctx["renter_headers"])
    assert res.status_code == 200, res.text
    assert res.json()["isPendingApproval"] is False

    # Check updated location in order
    loc_res = client.get(f"/api/orders/{order_id}/location", headers=ctx["lender_headers"])
    assert loc_res.status_code == 200, loc_res.text
    assert "New Direct Address 999" in loc_res.json()["deliveryAddress"]
    assert loc_res.json()["locationChangeRequest"] is None

def test_location_change_after_acceptance_requires_approval():
    """Test 6: Location change AFTER lender acceptance creates a change request for lender approval."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_req_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Sennheiser MKH 416 Mic",
        "price": 1200,
        "category": f"Audio_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "accepted",
    }

    order_id = f"ord_after_accept_{uuid.uuid4().hex[:8]}"
    create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "Sennheiser MKH 416 Mic",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-25",
            "endDate": "2026-11-27",
            "total": 2400,
            "status": "accepted",  # already accepted
            "deliveryMethod": "delivery",
            "deliveryAddress": "Original Studio, HSR Layout, Bengaluru",
        }
    )

    # Renter requests location change after acceptance
    req_payload = {
        "delivery_method": "delivery",
        "delivery_address": "Relocated Film Set, Sarjapur Road, Bengaluru",
        "location_directions": "Shoot stage 2",
        "reason": "Production shifted outdoor scenes to Sarjapur",
    }
    res = client.put(f"/api/orders/{order_id}/location", json=req_payload, headers=ctx["renter_headers"])
    assert res.status_code == 200, res.text
    res_data = res.json()
    assert res_data["isPendingApproval"] is True
    assert "submitted for lender approval" in res_data["message"]

    # Current confirmed location is still Original Studio
    loc_res = client.get(f"/api/orders/{order_id}/location", headers=ctx["lender_headers"])
    assert "Original Studio" in loc_res.json()["deliveryAddress"]
    pending_cr = loc_res.json()["locationChangeRequest"]
    assert pending_cr is not None
    assert pending_cr["status"] == "pending"
    assert "Relocated Film Set" in pending_cr["deliveryAddress"]
    assert "outdoor scenes" in pending_cr["reason"]

    # Lender approves location change request
    appr_res = client.post(f"/api/payernt/bookings/{order_id}/location-change/approve", headers=ctx["lender_headers"])
    assert appr_res.status_code == 200, appr_res.text
    assert appr_res.json()["success"] is True

    # Confirmed location is now updated to Relocated Film Set and change request is cleared
    loc_res2 = client.get(f"/api/orders/{order_id}/location", headers=ctx["renter_headers"])
    assert "Relocated Film Set" in loc_res2.json()["deliveryAddress"]
    assert loc_res2.json()["locationChangeRequest"] is None

def test_location_change_rejection_flow():
    """Test 7: Lender rejects location change request with feedback; original location is preserved."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_rej_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Blackmagic Pocket 6K Pro",
        "price": 3000,
        "category": f"Cameras_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "accepted",
    }

    order_id = f"ord_reject_cr_{uuid.uuid4().hex[:8]}"
    create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "Blackmagic Pocket 6K Pro",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-11-28",
            "endDate": "2026-11-30",
            "total": 6000,
            "status": "accepted",
            "deliveryMethod": "pickup",
            "pickupLocation": "Hub A, MG Road, Bengaluru",
        }
    )

    # Renter requests change to custom location
    req_payload = {
        "delivery_method": "custom",
        "custom_location": "Far Outskirts Resort, Nandi Hills",
        "reason": "Family weekend outing",
    }
    client.put(f"/api/orders/{order_id}/location", json=req_payload, headers=ctx["renter_headers"])

    # Lender rejects change request
    rej_res = client.post(
        f"/api/payernt/bookings/{order_id}/location-change/reject",
        json={"feedback": "Too far from delivery radius"},
        headers=ctx["lender_headers"],
    )
    assert rej_res.status_code == 200, rej_res.text
    assert rej_res.json()["success"] is True

    # Confirmed location remains Hub A, change request marked rejected
    loc_res = client.get(f"/api/orders/{order_id}/location", headers=ctx["renter_headers"])
    assert "Hub A" in loc_res.json()["pickupLocation"]
    cr = loc_res.json()["locationChangeRequest"]
    assert cr["status"] == "rejected"
    assert "Too far" in (cr.get("feedback") or cr.get("rejectionReason") or "")

def test_privacy_and_security_restrictions():
    """Test 8: Unauthorized users are forbidden (403) from accessing another user's booking location."""
    ctx = setup_mock_test_users()
    prod_id = f"prod_loc_priv_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Private Lens System",
        "price": 2000,
        "category": f"Lenses_{uuid.uuid4().hex[:4]}",
        "owner_email": ctx["lender_email"],
        "user_email": ctx["lender_email"],
        "owner_id": ctx["lender_email"],
        "is_available": True,
        "status": "requested",
    }

    order_id = f"ord_priv_{uuid.uuid4().hex[:8]}"
    create_order(
        ctx["renter_email"],
        {
            "id": order_id,
            "productId": prod_id,
            "productTitle": "Private Lens System",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "startDate": "2026-12-01",
            "endDate": "2026-12-03",
            "total": 4000,
            "status": "requested",
            "deliveryMethod": "delivery",
            "deliveryAddress": "Private Villa 7, Confidential Road, Bengaluru",
        }
    )

    # Stranger tries to fetch renter's private address -> 403 Forbidden
    res_stranger = client.get(f"/api/orders/{order_id}/location", headers=ctx["stranger_headers"])
    assert res_stranger.status_code == 403, res_stranger.text

    # Stranger tries to update renter's address -> 403 Forbidden
    res_stranger_update = client.put(
        f"/api/orders/{order_id}/location",
        json={"delivery_address": "Hacked Address"},
        headers=ctx["stranger_headers"],
    )
    assert res_stranger_update.status_code == 403, res_stranger_update.text
