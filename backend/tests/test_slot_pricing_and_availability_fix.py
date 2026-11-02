import pytest
import datetime
from datetime import timezone
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_USERS,
    DEFAULT_SLOT_PRICE,
    get_slot_price,
    DEFAULT_TIME_SLOTS,
    check_product_interval_conflicts,
    normalize_slot_interval,
    get_product_slots_for_date,
    create_order,
)

client = TestClient(app)

TEST_USER_EMAIL = "slot_pricing_renter@payent.test"
TEST_LENDER_EMAIL = "slot_pricing_lender@payent.test"
TEST_PRODUCT_ID = "prod_slot_pricing_camera_01"


@pytest.fixture(autouse=True)
def setup_test_data():
    """Initializes clean mock state for slot pricing and availability validation."""
    MOCK_USERS[TEST_USER_EMAIL] = {
        "id": "usr_slot_renter_01",
        "email": TEST_USER_EMAIL,
        "full_name": "Slot Renter",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[TEST_LENDER_EMAIL] = {
        "id": "usr_slot_lender_01",
        "email": TEST_LENDER_EMAIL,
        "full_name": "Slot Lender",
        "role": "agent",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }

    # Full Day price is ₹3,500
    MOCK_CUSTOM_PRODUCTS[TEST_PRODUCT_ID] = {
        "id": TEST_PRODUCT_ID,
        "title": "Sony A7S III Cinema Kit",
        "category": "cameras",
        "price": 3500,
        "daily_rate": 3500,
        "available": True,
        "status": "approved",
        "owner_email": TEST_LENDER_EMAIL,
        "user_email": TEST_LENDER_EMAIL,
        "buffer_minutes": 60,
        "allow_half_day": True,
        "morning_slot_enabled": True,
        "afternoon_slot_enabled": True,
        "full_day_slot_enabled": True,
        "blocked_dates": '["2026-11-25"]',
    }

    yield

    MOCK_CUSTOM_PRODUCTS.pop(TEST_PRODUCT_ID, None)
    MOCK_USERS.pop(TEST_USER_EMAIL, None)
    MOCK_USERS.pop(TEST_LENDER_EMAIL, None)

    # Clean up any created mock orders
    keys_to_delete = [k for k, v in MOCK_ORDERS.items() if str(v.get("product_id")) == TEST_PRODUCT_ID]
    for k in keys_to_delete:
        MOCK_ORDERS.pop(k, None)


class TestSlotPricingRules:
    """Verifies dynamic slot pricing rule: Morning Price = Full Day Price * 0.5, Afternoon Price = Full Day Price * 0.5."""

    def test_centralized_default_slot_price_constant(self):
        assert DEFAULT_SLOT_PRICE == 500

    def test_morning_and_afternoon_50_percent_of_full_day(self):
        prod = MOCK_CUSTOM_PRODUCTS[TEST_PRODUCT_ID]
        # Full day is 3500, morning and afternoon are 1750
        assert get_slot_price("morning", prod) == 1750
        assert get_slot_price("afternoon", prod) == 1750
        assert get_slot_price("full_day", prod) == 3500

    def test_pricing_dynamically_calculated_from_full_day(self):
        # Example 1: Full Day price ₹1,000 (Morning: ₹500, Afternoon: ₹500, Full Day: ₹1,000)
        example_prod = {"daily_rate": 1000, "price": 1000}
        assert get_slot_price("morning", example_prod) == 500
        assert get_slot_price("afternoon", example_prod) == 500
        assert get_slot_price("full_day", example_prod) == 1000

        # Example 2: Full Day price ₹1,600 (Morning: ₹800, Afternoon: ₹800, Full Day: ₹1,600)
        prod_1600 = {"daily_rate": 1600, "price": 1600}
        assert get_slot_price("morning", prod_1600) == 800
        assert get_slot_price("afternoon", prod_1600) == 800
        assert get_slot_price("full_day", prod_1600) == 1600

        # Example 3: Full Day price ₹10,000 (Morning: ₹5,000, Afternoon: ₹5,000, Full Day: ₹10,000)
        expensive_prod = {"daily_rate": 10000, "price": 10000}
        assert get_slot_price("morning", expensive_prod) == 5000
        assert get_slot_price("afternoon", expensive_prod) == 5000
        assert get_slot_price("full_day", expensive_prod) == 10000

    def test_get_product_slots_endpoint_returns_50_percent_for_half_day(self):
        from main import get_product_slots_endpoint
        data = get_product_slots_endpoint(TEST_PRODUCT_ID, "2026-11-20")
        assert data["success"] is True

        morning_slot = next(s for s in data["slots"] if s["id"] == "morning")
        afternoon_slot = next(s for s in data["slots"] if s["id"] == "afternoon")
        full_day_slot = next(s for s in data["slots"] if s["id"] == "full_day")

        assert morning_slot["price"] == 1750
        assert morning_slot["rate"] == 1750
        assert afternoon_slot["price"] == 1750
        assert afternoon_slot["rate"] == 1750
        assert full_day_slot["price"] == 3500
        assert full_day_slot["rate"] == 3500

    def test_create_order_authoritative_slot_pricing(self):
        # Create Morning Booking (3500 * 0.5 = 1750.0)
        m_order = {
            "id": "ord_test_m_500",
            "productId": TEST_PRODUCT_ID,
            "startDate": "2026-11-20",
            "endDate": "2026-11-20",
            "timeSlot": "morning",
            "durationType": "half_day",
            "total": 1.0,  # tampered client total
            "status": "pending",
        }
        saved_m = create_order(TEST_USER_EMAIL, m_order)
        assert saved_m["total"] == 1750.0

        # Remove previous order to bypass category restriction for second order
        MOCK_ORDERS.pop("ord_test_m_500", None)

        # Create Afternoon Booking (3500 * 0.5 = 1750.0)
        a_order = {
            "id": "ord_test_a_500",
            "productId": TEST_PRODUCT_ID,
            "startDate": "2026-11-20",
            "endDate": "2026-11-20",
            "timeSlot": "afternoon",
            "durationType": "half_day",
            "total": 1.0,  # tampered client total
            "status": "pending",
        }
        saved_a = create_order(TEST_USER_EMAIL, a_order)
        assert saved_a["total"] == 1750.0


class TestAvailabilityValidationAndConflicts:
    """Validates slot availability check, owner blocked dates, and full-day / session conflict rules."""

    def test_available_slot_passes_check(self):
        response = client.get(
            f"/api/products/{TEST_PRODUCT_ID}/availability",
            params={
                "start_date": "2026-11-20",
                "end_date": "2026-11-20",
                "session": "morning",
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is True
        assert data["status"] == "available"

    def test_owner_blocked_date_shows_blocked_reason(self):
        # 2026-11-25 is configured in blocked_dates
        response = client.get(
            f"/api/products/{TEST_PRODUCT_ID}/availability",
            params={
                "start_date": "2026-11-25",
                "end_date": "2026-11-25",
                "session": "morning",
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is False
        assert data["status"] == "blocked"
        assert "blocked" in (data.get("reason") or "").lower() or "unavailable" in (data.get("reason") or "").lower()

    def test_full_day_booking_blocks_morning_and_afternoon(self):
        # Book Full Day on Nov 22
        f_start, f_end = normalize_slot_interval("2026-11-22", "full_day")
        order_id = "ord_fullday_block_test"
        MOCK_ORDERS[order_id] = {
            "id": order_id,
            "product_id": TEST_PRODUCT_ID,
            "status": "active",
            "start_datetime": f_start.isoformat(),
            "end_datetime": f_end.isoformat(),
            "time_slot": "full_day",
            "duration_type": "full_day",
            "start_date": "2026-11-22",
            "end_date": "2026-11-22",
        }

        # Check morning availability via endpoint
        m_res = client.get(
            f"/api/products/{TEST_PRODUCT_ID}/availability",
            params={
                "start_date": "2026-11-22",
                "end_date": "2026-11-22",
                "session": "morning",
            }
        )
        assert m_res.status_code == 200
        m_data = m_res.json()
        assert m_data["is_available"] is False

        # Check afternoon availability via endpoint
        a_res = client.get(
            f"/api/products/{TEST_PRODUCT_ID}/availability",
            params={
                "start_date": "2026-11-22",
                "end_date": "2026-11-22",
                "session": "afternoon",
            }
        )
        assert a_res.status_code == 200
        a_data = a_res.json()
        assert a_data["is_available"] is False

    def test_session_booking_blocks_full_day(self):
        # Book Morning session on Nov 23
        m_start, m_end = normalize_slot_interval("2026-11-23", "morning")
        order_id = "ord_session_block_test"
        MOCK_ORDERS[order_id] = {
            "id": order_id,
            "product_id": TEST_PRODUCT_ID,
            "status": "active",
            "start_datetime": m_start.isoformat(),
            "end_datetime": m_end.isoformat(),
            "time_slot": "morning",
            "duration_type": "half_day",
            "start_date": "2026-11-23",
            "end_date": "2026-11-23",
        }

        # Check full day availability - must be blocked!
        f_res = client.get(
            f"/api/products/{TEST_PRODUCT_ID}/availability",
            params={
                "start_date": "2026-11-23",
                "end_date": "2026-11-23",
                "session": "full_day",
            }
        )
        assert f_res.status_code == 200
        f_data = f_res.json()
        assert f_data["is_available"] is False

    def test_today_booking_does_not_block_future_date_slot_check(self):
        """
        Regression test for Issue 1 root cause:
        Having an active booking today must not falsely mark future date queries as unavailable.
        """
        today_str = datetime.datetime.now(timezone.utc).strftime("%Y-%m-%d")
        t_start, t_end = normalize_slot_interval(today_str, "full_day")
        today_order_id = "ord_today_collision"
        MOCK_ORDERS[today_order_id] = {
            "id": today_order_id,
            "product_id": TEST_PRODUCT_ID,
            "status": "active",
            "start_datetime": t_start.isoformat(),
            "end_datetime": t_end.isoformat(),
            "time_slot": "full_day",
            "duration_type": "full_day",
            "start_date": today_str,
            "end_date": today_str,
        }

        # Query future date Nov 28
        future_res = client.get(
            f"/api/products/{TEST_PRODUCT_ID}/availability",
            params={
                "start_date": "2026-11-28",
                "end_date": "2026-11-28",
                "session": "morning",
            }
        )
        assert future_res.status_code == 200
        future_data = future_res.json()
        assert future_data["is_available"] is True, f"Future slot falsely blocked: {future_data.get('reason')}"
        assert future_data["status"] == "available"
