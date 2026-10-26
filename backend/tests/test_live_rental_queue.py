import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token

client = TestClient(app)

def test_live_rental_queue_complete_lifecycle():
    """
    Empirically tests the 8 milestones of the Live Rental Queue:
    1. Order Confirmed
    2. Ready for Pickup
    3. Picked Up — start the rental timer only after pickup is confirmed
    4. Rental in Progress — elapsed time and time remaining
    5. Return Initiated
    6. Item Handed Back to Owner — stop the timer at verified handover timestamp
    7. Awaiting Owner Inspection
    8. Rental Completed
    Validates timestamp persistence across refreshing/re-querying.
    """
    renter_email = "renter_queue_test@payent.com"
    lender_email = "lender_queue_test@payent.com"

    renter_token = create_access_token({"sub": renter_email, "role": "customer", "account_type": "pay₹ent"})
    lender_token = create_access_token({"sub": lender_email, "role": "lender", "account_type": "paye₹nt"})
    admin_token = create_access_token({"sub": "admin_queue@payent.com", "role": "admin"})

    renter_headers = {"Authorization": f"Bearer {renter_token}"}
    lender_headers = {"Authorization": f"Bearer {lender_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    from database import MOCK_CUSTOM_PRODUCTS, MOCK_ORDERS, MOCK_USERS
    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Renter Queue Tester",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[lender_email] = {
        "email": lender_email,
        "full_name": "Lender Queue Tester",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS["admin_queue@payent.com"] = {
        "email": "admin_queue@payent.com",
        "full_name": "Admin Queue Tester",
        "role": "admin",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }

    prod_id = "test-prod-queue-001"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Sony FX3 Cinema Camera",
        "primary_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "category": "Cameras",
        "daily_rate": 2500,
        "price_per_day": 2500,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "availability_status": "available",
        "status": "active"
    }

    order_id = "test-order-queue-999"
    # Clean previous state if any
    MOCK_ORDERS.pop(order_id, None)

    # 1. Milestone 1: Order Confirmed
    create_res = client.post("/api/orders", json={
        "id": order_id,
        "productId": prod_id,
        "productTitle": "Sony FX3 Cinema Camera",
        "startDate": "2026-11-01",
        "endDate": "2026-11-05",
        "total": 10000,
        "status": "active"
    }, headers=renter_headers)
    assert create_res.status_code == 200, create_res.text

    order_check = client.get(f"/api/orders/{order_id}", headers=renter_headers).json()
    assert order_check["id"] == order_id
    assert order_check.get("confirmedAt") is not None
    assert order_check.get("pickedUpAt") is None  # Timer has NOT started yet!

    # 2. Milestone 2: Ready for Pickup
    # Renter cannot mark ready for pickup (only lender/admin)
    unauth_res = client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=renter_headers)
    assert unauth_res.status_code == 403

    ready_res = client.post(f"/api/orders/{order_id}/ready-for-pickup", headers=lender_headers)
    assert ready_res.status_code == 200, ready_res.text
    ready_data = ready_res.json()
    assert ready_data["status"] == "ready_for_pickup"
    ready_ts = ready_data["timestamps"]["ready_for_pickup_at"]
    assert ready_ts is not None

    # Check persistence: simulated refresh
    refreshed = client.get(f"/api/orders/{order_id}", headers=renter_headers).json()
    assert refreshed["status"] == "ready_for_pickup"
    assert refreshed["readyForPickupAt"] == ready_ts

    # 3. Milestone 3: Picked Up — start the rental timer only after pickup is confirmed
    pickup_res = client.post(f"/api/orders/{order_id}/pickup-confirm", headers=renter_headers)
    assert pickup_res.status_code == 200, pickup_res.text
    pickup_data = pickup_res.json()
    assert pickup_data["status"] == "rental_in_progress"
    picked_up_ts = pickup_data["timestamps"]["picked_up_at"]
    assert picked_up_ts is not None

    # Verify that refreshing never resets the pickup timer
    refreshed_pu = client.get(f"/api/orders/{order_id}", headers=renter_headers).json()
    assert refreshed_pu["status"] == "rental_in_progress"
    assert refreshed_pu["pickedUpAt"] == picked_up_ts

    # 4. Milestone 4: Rental in Progress — live timer is active
    # Timer start is guaranteed at picked_up_ts
    assert refreshed_pu["pickedUpAt"] == picked_up_ts
    assert refreshed_pu.get("handedBackAt") is None  # Handed back not yet set, timer is running

    # 5. Milestone 5: Return Initiated
    return_res = client.post(f"/api/orders/{order_id}/return", headers=renter_headers)
    assert return_res.status_code == 200, return_res.text
    return_data = return_res.json()
    assert return_data["status"] == "return_initiated"
    ret_ts = return_data["timestamps"]["return_initiated_at"]
    assert ret_ts is not None

    # 6. Milestone 6: Item Handed Back to Owner — stop the timer at verified handover timestamp
    handover_res = client.post(f"/api/orders/{order_id}/handed-back", headers=lender_headers)
    assert handover_res.status_code == 200, handover_res.text
    handover_data = handover_res.json()
    assert handover_data["status"] == "handed_back"
    handed_back_ts = handover_data["timestamps"]["handed_back_at"]
    assert handed_back_ts is not None

    # Verify timer STOP timestamp is persisted
    refreshed_stop = client.get(f"/api/orders/{order_id}", headers=renter_headers).json()
    assert refreshed_stop["status"] == "handed_back"
    assert refreshed_stop["pickedUpAt"] == picked_up_ts  # Start is same
    assert refreshed_stop["handedBackAt"] == handed_back_ts  # Stop is set! Refresh never resets it!

    # 7. Milestone 7: Awaiting Owner Inspection
    inspect_res = client.post(f"/api/orders/{order_id}/awaiting-inspection", headers=lender_headers)
    assert inspect_res.status_code == 200, inspect_res.text
    inspect_data = inspect_res.json()
    assert inspect_data["status"] == "awaiting_inspection"
    assert inspect_data["timestamps"]["awaiting_inspection_at"] is not None

    # 8. Milestone 8: Rental Completed
    complete_res = client.post(f"/api/orders/{order_id}/complete", headers=lender_headers)
    assert complete_res.status_code == 200, complete_res.text
    complete_data = complete_res.json()
    assert complete_data["status"] == "completed"
    assert complete_data["timestamps"]["completed_at"] is not None

    # Final Verification: Synchronized booking status on both Renter (/api/orders) and Lender (/api/payernt/bookings)
    renter_orders = client.get("/api/orders", headers=renter_headers).json()
    renter_order = next(o for o in renter_orders if o["id"] == order_id)
    assert renter_order["status"] == "completed"
    assert renter_order["confirmedAt"] is not None
    assert renter_order["readyForPickupAt"] == ready_ts
    assert renter_order["pickedUpAt"] == picked_up_ts
    assert renter_order["returnInitiatedAt"] == ret_ts
    assert renter_order["handedBackAt"] == handed_back_ts
    assert renter_order["completedAt"] is not None

    # Check vendor queue-advance universal endpoint works as expected
    test_adv_res = client.post(f"/api/orders/{order_id}/queue-advance", json={
        "milestone": "completed",
        "notes": "Verified all 8 milestones in succession"
    }, headers=admin_headers)
    assert test_adv_res.status_code == 200
    assert test_adv_res.json()["success"] is True


def test_payernt_vendor_queue_advance_endpoint():
    """
    Specifically validates the /api/payernt/bookings/{id}/queue-advance endpoint:
    - 401 on unauthenticated request
    - 403 when renter attempts Mark Ready for Pickup
    - 200 when lender marks Ready for Pickup
    - Timer stays stopped (picked_up_at is None) upon Ready for Pickup
    - Persists timestamps to /api/lender/orders and /api/orders across simulated refresh
    - 404 on nonexistent booking
    """
    renter_email = "renter_endpoint_test@payent.com"
    lender_email = "lender_endpoint_test@payent.com"

    renter_token = create_access_token({"sub": renter_email, "role": "customer", "account_type": "pay₹ent"})
    lender_token = create_access_token({"sub": lender_email, "role": "lender", "account_type": "paye₹nt"})

    renter_headers = {"Authorization": f"Bearer {renter_token}"}
    lender_headers = {"Authorization": f"Bearer {lender_token}"}

    from database import MOCK_CUSTOM_PRODUCTS, MOCK_ORDERS, MOCK_USERS
    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Renter Endpoint Tester",
        "role": "customer",
        "status": "active",
    }
    MOCK_USERS[lender_email] = {
        "email": lender_email,
        "full_name": "Lender Endpoint Tester",
        "role": "lender",
        "status": "active",
    }

    prod_id = "test-prod-endpoint-777"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Canon Cinema EOS C70",
        "user_email": lender_email,
        "owner_id": lender_email,
        "price_per_day": 3000,
        "status": "active"
    }

    order_id = "test-order-endpoint-888"
    MOCK_ORDERS[order_id] = {
        "id": order_id,
        "productId": prod_id,
        "product_id": prod_id,
        "productTitle": "Canon Cinema EOS C70",
        "product_title": "Canon Cinema EOS C70",
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "total": 6000,
        "status": "order_confirmed",
        "userEmail": renter_email,
        "user_email": renter_email,
        "lender_email": lender_email,
        "createdAt": "2026-10-26T10:00:00Z",
        "created_at": "2026-10-26T10:00:00Z",
        "confirmedAt": "2026-10-26T10:00:00Z",
        "confirmed_at": "2026-10-26T10:00:00Z",
    }

    # 1. Unauthenticated request must return 401
    no_auth_res = client.post(f"/api/payernt/bookings/{order_id}/queue-advance", json={
        "milestone": "ready_for_pickup"
    })
    assert no_auth_res.status_code == 401

    # 2. Nonexistent booking must return 404
    not_found_res = client.post("/api/payernt/bookings/nonexistent-booking-999/queue-advance", json={
        "milestone": "ready_for_pickup"
    }, headers=lender_headers)
    assert not_found_res.status_code == 404

    # 3. Renter cannot mark Ready for Pickup (must return 403 Forbidden)
    forbidden_res = client.post(f"/api/payernt/bookings/{order_id}/queue-advance", json={
        "milestone": "ready_for_pickup"
    }, headers=renter_headers)
    assert forbidden_res.status_code == 403

    # 4. Lender marks Ready for Pickup -> must succeed (200 OK)
    ready_res = client.post(f"/api/payernt/bookings/{order_id}/queue-advance", json={
        "milestone": "ready_for_pickup",
        "notes": "Lens cleaned and battery charged"
    }, headers=lender_headers)
    assert ready_res.status_code == 200, ready_res.text
    ready_data = ready_res.json()
    assert ready_data["success"] is True
    assert ready_data["status"] == "ready_for_pickup"
    assert ready_data["timestamps"]["ready_for_pickup_at"] is not None

    # CRITICAL: Rental timer MUST remain stopped until pickup is actually confirmed
    assert ready_data["timestamps"].get("picked_up_at") is None

    # 5. Check simulated page refresh on Lender Portal (/api/lender/orders)
    lender_orders = client.get("/api/lender/orders", headers=lender_headers).json()
    my_order = next(o for o in lender_orders if o["id"] == order_id)
    assert my_order["status"] == "ready_for_pickup"
    assert my_order["readyForPickupAt"] == ready_data["timestamps"]["ready_for_pickup_at"]
    assert my_order.get("pickedUpAt") is None  # Timer still not started

    # Verify identical creation timestamp across Renter and Lender views
    renter_order_info = client.get(f"/api/orders/{order_id}", headers=renter_headers).json()
    assert renter_order_info.get("createdAt") is not None
    assert my_order.get("createdAt") is not None
    assert (
        renter_order_info.get("createdAt") == my_order.get("createdAt")
        or renter_order_info.get("created_at") == my_order.get("created_at")
    )

    # 6. Lender confirms Pickup Handover -> starts timer
    pickup_res = client.post(f"/api/payernt/bookings/{order_id}/queue-advance", json={
        "milestone": "picked_up"
    }, headers=lender_headers)
    assert pickup_res.status_code == 200, pickup_res.text
    pickup_data = pickup_res.json()
    assert pickup_data["status"] == "rental_in_progress"
    assert pickup_data["timestamps"]["picked_up_at"] is not None
