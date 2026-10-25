import concurrent.futures
import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from database import (
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_USERS,
    CATEGORY_BOOKING_RESTRICTION_MESSAGE,
    check_renter_category_booking_restriction,
    get_renter_active_category_restrictions,
    cancel_order,
    update_order_queue_milestone,
)

client = TestClient(app)

def test_category_based_booking_restriction_suite():
    """
    Comprehensive verification of category-based booking restriction rules:
    1. Only one product per category in booking-to-delivery process for same renter.
    2. Same category blocked while first order is awaiting delivery.
    3. Clear message: 'You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered.'
    4. Products from different categories can be booked independently.
    5. Confirmed delivery releases restriction even if rental remains in progress.
    6. Cancellation before delivery releases restriction.
    7. Simultaneous concurrent booking requests in same category serialize safely.
    """
    renter_email = "renter_cat_rule_test@payent.com"
    lender_email = "lender_cat_rule_test@payent.com"

    renter_token = create_access_token({"sub": renter_email, "role": "customer", "account_type": "pay₹ent"})
    lender_token = create_access_token({"sub": lender_email, "role": "lender", "account_type": "paye₹nt"})

    renter_headers = {"Authorization": f"Bearer {renter_token}"}
    lender_headers = {"Authorization": f"Bearer {lender_token}"}

    # Setup mock users
    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Renter Category Tester",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[lender_email] = {
        "email": lender_email,
        "full_name": "Lender Category Tester",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }

    # Setup mock catalog products in different categories
    # Cameras
    cam_prod_1 = "test-cam-001"
    cam_prod_2 = "test-cam-002"
    MOCK_CUSTOM_PRODUCTS[cam_prod_1] = {
        "id": cam_prod_1,
        "title": "Sony Alpha A7 IV",
        "primary_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "category": "Cameras",
        "daily_rate": 3500,
        "price_per_day": 3500,
        "price": 3500,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }
    MOCK_CUSTOM_PRODUCTS[cam_prod_2] = {
        "id": cam_prod_2,
        "title": "Canon EOS R5",
        "primary_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
        "category": "Cameras",
        "daily_rate": 4200,
        "price_per_day": 4200,
        "price": 4200,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }

    # Drones
    drone_prod_1 = "test-drone-001"
    MOCK_CUSTOM_PRODUCTS[drone_prod_1] = {
        "id": drone_prod_1,
        "title": "DJI Mavic 3 Pro",
        "primary_image": "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600",
        "image": "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600",
        "category": "Drones",
        "daily_rate": 5000,
        "price_per_day": 5000,
        "price": 5000,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }

    # Audio
    audio_prod_1 = "test-audio-001"
    audio_prod_2 = "test-audio-002"
    MOCK_CUSTOM_PRODUCTS[audio_prod_1] = {
        "id": audio_prod_1,
        "title": "Sennheiser MKH 416 Boom Mic",
        "primary_image": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
        "image": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
        "category": "Audio",
        "daily_rate": 1800,
        "price_per_day": 1800,
        "price": 1800,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }
    MOCK_CUSTOM_PRODUCTS[audio_prod_2] = {
        "id": audio_prod_2,
        "title": "Rode Wireless GO II Dual Kit",
        "primary_image": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
        "image": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
        "category": "Audio",
        "daily_rate": 1200,
        "price_per_day": 1200,
        "price": 1200,
        "user_email": lender_email,
        "owner_id": lender_email,
        "is_available": True,
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }

    # Laptops (for concurrency test)
    laptop_prod_1 = "test-laptop-001"
    laptop_prod_2 = "test-laptop-002"
    for lp in [laptop_prod_1, laptop_prod_2]:
        MOCK_CUSTOM_PRODUCTS[lp] = {
            "id": lp,
            "title": f"MacBook Pro M3 Max ({lp})",
            "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
            "category": "Laptops",
            "daily_rate": 4500,
            "price": 4500,
            "user_email": lender_email,
            "owner_id": lender_email,
            "available": True,
            "status": "approved",
        }

    # -------------------------------------------------------------
    # TEST 1: Same category second booking is blocked while first is awaiting delivery
    # -------------------------------------------------------------
    order_1_id = "ord-cat-test-001"
    create_res1 = client.post("/api/orders", json={
        "id": order_1_id,
        "productId": cam_prod_1,
        "productTitle": "Sony Alpha A7 IV",
        "startDate": "2026-11-01",
        "endDate": "2026-11-04",
        "total": 10500,
        "status": "active"
    }, headers=renter_headers)
    assert create_res1.status_code == 200, f"Expected 200 on initial booking, got: {create_res1.text}"

    # Verify query endpoint shows Cameras category is restricted
    check_query = client.get(
        f"/api/orders/check-category-restriction?category=Cameras",
        headers=renter_headers
    ).json()
    assert check_query["restricted"] is True
    assert check_query["message"] == CATEGORY_BOOKING_RESTRICTION_MESSAGE

    # Second booking in same category ("Cameras") by the same renter MUST BE BLOCKED
    order_2_id = "ord-cat-test-002"
    create_res2 = client.post("/api/orders", json={
        "id": order_2_id,
        "productId": cam_prod_2,
        "productTitle": "Canon EOS R5",
        "startDate": "2026-11-05",
        "endDate": "2026-11-08",
        "total": 12600,
        "status": "active"
    }, headers=renter_headers)
    assert create_res2.status_code in (400, 409), f"Expected 400/409 block, got {create_res2.status_code}"
    assert create_res2.json()["detail"] == CATEGORY_BOOKING_RESTRICTION_MESSAGE

    # -------------------------------------------------------------
    # TEST 2: Products from different categories CAN be booked independently
    # -------------------------------------------------------------
    order_drone_id = "ord-cat-test-drone"
    create_drone_res = client.post("/api/orders", json={
        "id": order_drone_id,
        "productId": drone_prod_1,
        "productTitle": "DJI Mavic 3 Pro",
        "startDate": "2026-11-02",
        "endDate": "2026-11-05",
        "total": 15000,
        "status": "active"
    }, headers=renter_headers)
    assert create_drone_res.status_code == 200, f"Expected 200 for independent category (Drones), got {create_drone_res.text}"

    # Verify active restrictions endpoint lists both active categories
    restr_list = client.get("/api/orders/category-restrictions", headers=renter_headers).json()
    assert "cameras" in [c.lower() for c in restr_list["restrictedCategories"]]
    assert "drones" in [c.lower() for c in restr_list["restrictedCategories"]]

    # -------------------------------------------------------------
    # TEST 3: Delivery Confirmation releases the restriction even if rental remains active
    # -------------------------------------------------------------
    # Confirm pickup/delivery for order 1 (Sony Alpha A7 IV)
    pickup_res = client.post(f"/api/orders/{order_1_id}/pickup-confirm", headers=renter_headers)
    assert pickup_res.status_code == 200, f"Failed to confirm pickup: {pickup_res.text}"
    assert pickup_res.json()["all_timestamps"]["picked_up_at"] is not None

    # Check query endpoint: Cameras category should now be UNRESTRICTED!
    check_query_after_pickup = client.get(
        f"/api/orders/check-category-restriction?category=Cameras",
        headers=renter_headers
    ).json()
    assert check_query_after_pickup["restricted"] is False, "Category restriction was NOT released after pickup/delivery confirmation!"

    # Now renter CAN book another product in "Cameras", even though the first camera rental is still active!
    order_3_id = "ord-cat-test-003"
    create_res3 = client.post("/api/orders", json={
        "id": order_3_id,
        "productId": cam_prod_2,
        "productTitle": "Canon EOS R5",
        "startDate": "2026-11-10",
        "endDate": "2026-11-12",
        "total": 8400,
        "status": "active"
    }, headers=renter_headers)
    assert create_res3.status_code == 200, f"Expected 200 for second camera after first delivery confirmed, got: {create_res3.text}"

    # -------------------------------------------------------------
    # TEST 4: Cancellation before delivery releases the restriction
    # -------------------------------------------------------------
    # Book an audio product
    audio_order_1 = "ord-cat-test-audio-1"
    create_audio_res1 = client.post("/api/orders", json={
        "id": audio_order_1,
        "productId": audio_prod_1,
        "productTitle": "Sennheiser MKH 416",
        "startDate": "2026-11-15",
        "endDate": "2026-11-18",
        "total": 5400,
        "status": "active"
    }, headers=renter_headers)
    assert create_audio_res1.status_code == 200

    # Verify Audio category is now restricted
    assert client.get("/api/orders/check-category-restriction?category=Audio", headers=renter_headers).json()["restricted"] is True

    # Attempt second audio booking while first is awaiting delivery -> BLOCKED
    audio_order_2 = "ord-cat-test-audio-2"
    blocked_audio = client.post("/api/orders", json={
        "id": audio_order_2,
        "productId": audio_prod_2,
        "productTitle": "Rode Wireless GO II",
        "startDate": "2026-11-19",
        "endDate": "2026-11-21",
        "total": 2400,
        "status": "active"
    }, headers=renter_headers)
    assert blocked_audio.status_code in (400, 409)
    assert blocked_audio.json()["detail"] == CATEGORY_BOOKING_RESTRICTION_MESSAGE

    # Cancel the first audio booking before delivery
    cancel_res = client.post(f"/api/orders/{audio_order_1}/cancel", headers=renter_headers)
    assert cancel_res.status_code == 200, f"Cancellation failed: {cancel_res.text}"

    # Verify Audio category is released immediately
    assert client.get("/api/orders/check-category-restriction?category=Audio", headers=renter_headers).json()["restricted"] is False

    # Now booking second audio product succeeds cleanly!
    create_audio_res2 = client.post("/api/orders", json={
        "id": audio_order_2,
        "productId": audio_prod_2,
        "productTitle": "Rode Wireless GO II",
        "startDate": "2026-11-19",
        "endDate": "2026-11-21",
        "total": 2400,
        "status": "active"
    }, headers=renter_headers)
    assert create_audio_res2.status_code == 200, f"Booking after cancellation failed: {create_audio_res2.text}"

    # -------------------------------------------------------------
    # TEST 5: Simultaneous / concurrent booking requests in same category
    # -------------------------------------------------------------
    # Send two simultaneous booking requests for different products in the same category ("Laptops")
    def attempt_concurrent_booking(prod_id: str, ord_id: str):
        c = TestClient(app)
        return c.post("/api/orders", json={
            "id": ord_id,
            "productId": prod_id,
            "productTitle": f"MacBook Pro ({prod_id})",
            "startDate": "2026-11-25",
            "endDate": "2026-11-28",
            "total": 13500,
            "status": "active"
        }, headers=renter_headers)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(attempt_concurrent_booking, laptop_prod_1, "ord-concurrent-laptop-1")
        f2 = executor.submit(attempt_concurrent_booking, laptop_prod_2, "ord-concurrent-laptop-2")
        r1 = f1.result()
        r2 = f2.result()

    statuses = [r1.status_code, r2.status_code]
    assert 200 in statuses, f"At least one concurrent booking must succeed, got statuses: {statuses}"
    # The other must be rejected with the category restriction message
    failed_response = r1 if r1.status_code != 200 else r2
    assert failed_response.status_code in (400, 409)
    assert failed_response.json()["detail"] == CATEGORY_BOOKING_RESTRICTION_MESSAGE
