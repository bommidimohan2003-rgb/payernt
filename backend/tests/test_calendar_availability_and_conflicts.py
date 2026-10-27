import pytest
import time
import threading
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_USERS,
    check_product_interval_conflicts,
    calculate_booking_interval,
    normalize_slot_interval,
    create_order,
    DEFAULT_BUFFER_MINUTES,
)

client = TestClient(app)

TEST_PROD_A = "cal_test_prod_alpha_01"
TEST_PROD_B = "cal_test_prod_beta_02"
TEST_PROD_BUFFER_90 = "cal_test_prod_buf90_03"

RENTER_1_EMAIL = "renter_cal_1@payent.test"
RENTER_2_EMAIL = "renter_cal_2@payent.test"
LENDER_EMAIL = "lender_cal@payent.test"


@pytest.fixture(autouse=True)
def setup_test_calendar_data():
    """Initializes isolated mock data for availability and conflict tests."""
    MOCK_USERS[RENTER_1_EMAIL] = {
        "id": "usr_cal_renter_1",
        "email": RENTER_1_EMAIL,
        "full_name": "Renter One",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[RENTER_2_EMAIL] = {
        "id": "usr_cal_renter_2",
        "email": RENTER_2_EMAIL,
        "full_name": "Renter Two",
        "role": "customer",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }
    MOCK_USERS[LENDER_EMAIL] = {
        "id": "usr_cal_lender",
        "email": LENDER_EMAIL,
        "full_name": "Lender Studio",
        "role": "lender",
        "verified": True,
        "status": "active",
        "is_approved": True,
        "isApproved": True,
    }

    # Product A: Camera
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_A] = {
        "id": TEST_PROD_A,
        "title": "Sony FX6 Cinema Camera",
        "category": "cinema_cameras",
        "available": True,
        "price": 5000,
        "daily_rate": 5000,
        "half_day_rate": 3000,
        "buffer_minutes": 60,
        "user_email": LENDER_EMAIL,
        "owner_email": LENDER_EMAIL,
        "vendor_secret_pin": "1234",
    }

    # Product B: Same Category (Cinema Camera), Independent availability
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_B] = {
        "id": TEST_PROD_B,
        "title": "Canon C70 Cinema Camera",
        "category": "cinema_cameras",
        "available": True,
        "price": 4000,
        "daily_rate": 4000,
        "half_day_rate": 2400,
        "buffer_minutes": 60,
        "user_email": LENDER_EMAIL,
        "owner_email": LENDER_EMAIL,
        "vendor_secret_pin": "5678",
    }

    # Product with 90-minute buffer (blocks adjacent half-day slots)
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_BUFFER_90] = {
        "id": TEST_PROD_BUFFER_90,
        "title": "Specialty Lens Rig",
        "category": "lenses",
        "available": True,
        "price": 3000,
        "daily_rate": 3000,
        "half_day_rate": 1800,
        "buffer_minutes": 90,
        "user_email": LENDER_EMAIL,
        "owner_email": LENDER_EMAIL,
        "vendor_secret_pin": "9999",
    }

    yield

    # Clean up mock orders created in tests
    keys_to_remove = [
        k for k, o in MOCK_ORDERS.items()
        if (o.get("product_id") in (TEST_PROD_A, TEST_PROD_B, TEST_PROD_BUFFER_90) or
            o.get("productId") in (TEST_PROD_A, TEST_PROD_B, TEST_PROD_BUFFER_90))
    ]
    for k in keys_to_remove:
        MOCK_ORDERS.pop(k, None)


def _get_headers(email: str):
    if email not in MOCK_USERS:
        MOCK_USERS[email] = {
            "id": f"usr_{email.replace('@', '_').replace('.', '_')}",
            "email": email,
            "full_name": "Test User",
            "role": "customer",
            "verified": True,
            "status": "active",
            "is_approved": True,
            "isApproved": True,
        }
    token = create_access_token(data={"sub": email, "email": email, "role": "customer"})
    return {"Authorization": f"Bearer {token}"}



# =========================================================================
# 1. A FULL-DAY BOOKING BLOCKS MORNING AND AFTERNOON
# =========================================================================

def test_01_full_day_booking_blocks_morning_and_afternoon():
    """A full-day booking must block morning, afternoon, and full-day sessions for that date."""
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    test_date = "2026-12-10"

    # Renter 1 books Full Day on 2026-12-10
    res_book = client.post("/api/orders", headers=headers1, json={
        "id": "ord_fd_test_001",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_book.status_code == 200, res_book.text

    # Calendar availability for Morning on 2026-12-10 must show booked
    cal_m = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=morning")
    assert cal_m.status_code == 200
    data_m = cal_m.json()
    assert data_m["is_available"] is False
    assert data_m["status"] == "booked"
    assert test_date in data_m["bookedDates"]

    # Calendar availability for Afternoon on 2026-12-10 must show booked
    cal_a = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=afternoon")
    assert cal_a.status_code == 200
    data_a = cal_a.json()
    assert data_a["is_available"] is False
    assert data_a["status"] == "booked"
    assert test_date in data_a["bookedDates"]

    # Direct booking attempt for Morning session must be rejected with 409
    res_m = client.post("/api/orders", headers=headers2, json={
        "id": "ord_m_conflict_001",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_m.status_code == 409
    assert "conflict" in res_m.text.lower() or "already booked" in res_m.text.lower()

    # Direct booking attempt for Afternoon session must be rejected with 409
    res_a = client.post("/api/orders", headers=headers2, json={
        "id": "ord_a_conflict_001",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_a.status_code == 409


# =========================================================================
# 2. A MORNING BOOKING BLOCKS ANOTHER MORNING BOOKING
# =========================================================================

def test_02_morning_booking_blocks_another_morning():
    """A morning booking blocks any subsequent morning booking on the same date."""
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    test_date = "2026-12-11"

    # Renter 1 books morning slot
    res_m1 = client.post("/api/orders", headers=headers1, json={
        "id": "ord_m_test_002",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_m1.status_code == 200, res_m1.text

    # Calendar check for morning
    cal_m = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=morning")
    assert cal_m.status_code == 200
    assert cal_m.json()["is_available"] is False
    assert test_date in cal_m.json()["bookedDates"]

    # Renter 2 attempts second morning booking on same date
    res_m2 = client.post("/api/orders", headers=headers2, json={
        "id": "ord_m_dup_002",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_m2.status_code == 409
    assert "conflict" in res_m2.text.lower() or "already booked" in res_m2.text.lower()


# =========================================================================
# 3. AN AFTERNOON BOOKING BLOCKS ANOTHER AFTERNOON BOOKING
# =========================================================================

def test_03_afternoon_booking_blocks_another_afternoon():
    """An afternoon booking blocks another afternoon booking on the same date."""
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    test_date = "2026-12-12"

    # Renter 1 books afternoon slot
    res_a1 = client.post("/api/orders", headers=headers1, json={
        "id": "ord_a_test_003",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_a1.status_code == 200, res_a1.text

    # Calendar check for afternoon
    cal_a = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=afternoon")
    assert cal_a.status_code == 200
    assert cal_a.json()["is_available"] is False
    assert test_date in cal_a.json()["bookedDates"]

    # Renter 2 attempts second afternoon booking
    res_a2 = client.post("/api/orders", headers=headers2, json={
        "id": "ord_a_dup_003",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_a2.status_code == 409


# =========================================================================
# 4. MORNING & AFTERNOON BUFFER AND GAP RULES
# =========================================================================

def test_04_morning_and_afternoon_buffer_rules():
    """
    Morning (08:00-12:00) and Afternoon (13:00-17:00) have a 60-minute gap.
    - Buffer <= 60 mins allows both bookings on same day.
    - Buffer > 60 mins (e.g. 90 mins) blocks the adjacent session.
    """
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    # CASE A: Product A with 60-minute buffer: Morning booked, Afternoon is ALLOWED
    test_date_60 = "2026-12-13"
    res_m = client.post("/api/orders", headers=headers1, json={
        "id": "ord_buf60_m",
        "productId": TEST_PROD_A,
        "startDate": test_date_60,
        "endDate": test_date_60,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_m.status_code == 200

    # Calendar for afternoon must be AVAILABLE!
    cal_afternoon = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date_60}&end_date={test_date_60}&session=afternoon")
    assert cal_afternoon.status_code == 200
    assert cal_afternoon.json()["is_available"] is True
    assert test_date_60 not in cal_afternoon.json()["bookedDates"]

    # Renter 2 booking afternoon succeeds!
    res_a = client.post("/api/orders", headers=headers2, json={
        "id": "ord_buf60_a",
        "productId": TEST_PROD_A,
        "startDate": test_date_60,
        "endDate": test_date_60,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_a.status_code == 200

    # CASE B: Product with 90-minute buffer: Morning booked, Afternoon is BLOCKED
    test_date_90 = "2026-12-14"
    res_m90 = client.post("/api/orders", headers=headers1, json={
        "id": "ord_buf90_m",
        "productId": TEST_PROD_BUFFER_90,
        "startDate": test_date_90,
        "endDate": test_date_90,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 1800,
        "status": "pending",
    })
    assert res_m90.status_code == 200

    # Calendar for afternoon must be BLOCKED / UNAVAILABLE due to buffer conflict!
    cal_afternoon_90 = client.get(f"/api/products/{TEST_PROD_BUFFER_90}/availability?start_date={test_date_90}&end_date={test_date_90}&session=afternoon")
    assert cal_afternoon_90.status_code == 200
    assert cal_afternoon_90.json()["is_available"] is False
    assert test_date_90 in cal_afternoon_90.json()["bookedDates"]

    # Renter 2 attempting to book afternoon on 90m buffer product is rejected
    res_a90 = client.post("/api/orders", headers=headers2, json={
        "id": "ord_buf90_a_fail",
        "productId": TEST_PROD_BUFFER_90,
        "startDate": test_date_90,
        "endDate": test_date_90,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 1800,
        "status": "pending",
    })
    assert res_a90.status_code == 409


# =========================================================================
# 5. OVERLAPPING SESSIONS BLOCK FULL-DAY BOOKINGS
# =========================================================================

def test_05_half_day_blocks_full_day():
    """An existing morning or afternoon booking blocks a full-day booking."""
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    test_date_m = "2026-12-15"
    client.post("/api/orders", headers=headers1, json={
        "id": "ord_m_block_fd",
        "productId": TEST_PROD_A,
        "startDate": test_date_m,
        "endDate": test_date_m,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })

    # Full day calendar check must show unavailable
    cal_fd = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date_m}&end_date={test_date_m}&session=full_day")
    assert cal_fd.json()["is_available"] is False
    assert test_date_m in cal_fd.json()["bookedDates"]

    # Booking full day must fail with 409
    res_fd = client.post("/api/orders", headers=headers2, json={
        "id": "ord_fd_conflict_on_m",
        "productId": TEST_PROD_A,
        "startDate": test_date_m,
        "endDate": test_date_m,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_fd.status_code == 409


# =========================================================================
# 6. CANCELLED BOOKINGS RELEASE AVAILABILITY ACCORDING TO POLICY
# =========================================================================

def test_06_cancelled_bookings_update_availability():
    """
    - Pre-pickup cancellation immediately releases the date for new bookings.
    - Post-pickup cancellation keeps equipment blocked until handed back to lender.
    """
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    test_date = "2026-12-17"

    # 1. Create booking
    res_ord = client.post("/api/orders", headers=headers1, json={
        "id": "ord_cancel_avail_001",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_ord.status_code == 200

    # Verify date is booked
    cal_pre = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=full_day")
    assert cal_pre.json()["is_available"] is False

    # 2. Cancel order before pickup
    res_cancel = client.post("/api/orders/ord_cancel_avail_001/cancel", headers=headers1, json={
        "reason": "Change of schedule"
    })
    assert res_cancel.status_code == 200

    # 3. Verify date is now immediately available
    cal_post = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=full_day")
    assert cal_post.json()["is_available"] is True
    assert test_date not in cal_post.json()["bookedDates"]

    # 4. Renter 2 can now successfully book this released date!
    res_rebook = client.post("/api/orders", headers=headers2, json={
        "id": "ord_rebook_after_cancel",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_rebook.status_code == 200


# =========================================================================
# 7. DIFFERENT PRODUCTS IN SAME CATEGORY HAVE INDEPENDENT AVAILABILITY
# =========================================================================

def test_07_different_products_in_same_category_independent_availability():
    """
    Product A and Product B belong to the same category ('cinema_cameras').
    Booking Product A must NOT block Product B's calendar.
    """
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    test_date = "2026-12-19"

    # Renter 1 books Product A on 2026-12-19
    res_a = client.post("/api/orders", headers=headers1, json={
        "id": "ord_indep_prod_a",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_a.status_code == 200

    # Product A calendar shows booked
    cal_a = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=full_day")
    assert cal_a.json()["is_available"] is False

    # Product B calendar must be completely AVAILABLE!
    cal_b = client.get(f"/api/products/{TEST_PROD_B}/availability?start_date={test_date}&end_date={test_date}&session=full_day")
    assert cal_b.status_code == 200
    assert cal_b.json()["is_available"] is True
    assert test_date not in cal_b.json()["bookedDates"]

    # Renter 2 can successfully book Product B on the exact same date!
    res_b = client.post("/api/orders", headers=headers2, json={
        "id": "ord_indep_prod_b",
        "productId": TEST_PROD_B,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 4000,
        "status": "pending",
    })
    assert res_b.status_code == 200


# =========================================================================
# 8. BLOCKED DATES STATUS & STYLING CONTRACT
# =========================================================================

def test_08_vendor_blocked_dates_contract():
    """Vendor-blocked dates are returned under blockedDates with status 'blocked'."""
    test_date = "2026-12-20"

    # Add blocked date to Product A
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_A]["blocked_dates"] = [test_date]

    cal_res = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}&session=full_day")
    assert cal_res.status_code == 200
    data = cal_res.json()
    assert data["is_available"] is False
    assert data["status"] == "blocked"
    assert test_date in data["blockedDates"]
    assert "blocked" in data["reason"].lower() or "personal use" in data["reason"].lower()

    # Attempting to book blocked date fails with 409
    headers = _get_headers(RENTER_1_EMAIL)
    res_blocked = client.post("/api/orders", headers=headers, json={
        "id": "ord_blocked_date_attempt",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_blocked.status_code == 409

    # Clean up
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_A].pop("blocked_dates", None)


# =========================================================================
# 9. MULTI-DAY CUSTOM RENTAL SPANNING OVER BOOKED DATE IS REJECTED
# =========================================================================

def test_09_multi_day_custom_rental_rejects_spanned_conflict():
    """A multi-day rental crossing any booked or blocked date is rejected."""
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)

    # Book single day in the middle (2026-12-22)
    client.post("/api/orders", headers=headers1, json={
        "id": "ord_middle_booked_day",
        "productId": TEST_PROD_A,
        "startDate": "2026-12-22",
        "endDate": "2026-12-22",
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })

    # Renter 2 attempts multi-day custom rental from Dec 21 to Dec 24 (spans Dec 22)
    cal_span = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date=2026-12-21&end_date=2026-12-24&duration_type=custom")
    assert cal_span.json()["is_available"] is False
    assert cal_span.json()["status"] == "booked"

    # Order creation fails with 409 Conflict
    res_span = client.post("/api/orders", headers=headers2, json={
        "id": "ord_span_attempt_fail",
        "productId": TEST_PROD_A,
        "startDate": "2026-12-21",
        "endDate": "2026-12-24",
        "timeSlot": "full_day",
        "durationType": "custom",
        "total": 15000,
        "status": "pending",
    })
    assert res_span.status_code == 409


# =========================================================================
# 10. CONCURRENT RENTER BOOKINGS PREVENT DOUBLE BOOKING
# =========================================================================

def test_10_concurrent_renter_booking_race_condition():
    """Two concurrent requests to book the same product slot cannot both succeed."""
    target_date = "2026-12-25"
    success_orders = []
    failed_orders = []
    lock = threading.Lock()

    def attempt_concurrent_booking(renter_email: str, order_id: str):
        token = create_access_token(data={"sub": renter_email, "email": renter_email, "role": "customer"})
        res = client.post("/api/orders", headers={"Authorization": f"Bearer {token}"}, json={
            "id": order_id,
            "productId": TEST_PROD_A,
            "startDate": target_date,
            "endDate": target_date,
            "timeSlot": "morning",
            "durationType": "half_day",
            "total": 3000,
            "status": "pending",
        })
        with lock:
            if res.status_code == 200:
                success_orders.append(order_id)
            else:
                failed_orders.append((order_id, res.status_code))

    t1 = threading.Thread(target=attempt_concurrent_booking, args=(RENTER_1_EMAIL, "ord_race_a"))
    t2 = threading.Thread(target=attempt_concurrent_booking, args=(RENTER_2_EMAIL, "ord_race_b"))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(success_orders) == 1, f"Expected exactly 1 success, got {len(success_orders)}"
    assert len(failed_orders) == 1, f"Expected exactly 1 rejection, got {len(failed_orders)}"
    assert failed_orders[0][1] == 409, f"Expected HTTP 409, got {failed_orders[0][1]}"


# =========================================================================
# 11. MONTH CHANGE AND PRODUCT SWITCHING FRESHNESS
# =========================================================================

def test_11_month_change_and_product_switching_freshness():
    """Changing view window and switching products retrieves accurate non-stale availability."""
    test_date_dec = "2026-12-28"
    test_date_jan = "2027-01-15"

    headers = _get_headers(RENTER_1_EMAIL)

    # Book date in Dec for Prod A
    client.post("/api/orders", headers=headers, json={
        "id": "ord_dec_prod_a",
        "productId": TEST_PROD_A,
        "startDate": test_date_dec,
        "endDate": test_date_dec,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })

    # Dec query for Prod A has test_date_dec booked
    cal_dec = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date=2026-12-01&end_date=2026-12-31")
    assert test_date_dec in cal_dec.json()["bookedDates"]

    # Jan query for Prod A does NOT have test_date_jan booked (fresh!)
    cal_jan = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date=2027-01-01&end_date=2027-01-31")
    assert test_date_jan not in cal_jan.json()["bookedDates"]

    # Switching to Product B on test_date_dec shows available (independent!)
    cal_b_dec = client.get(f"/api/products/{TEST_PROD_B}/availability?start_date={test_date_dec}&end_date={test_date_dec}")
    assert cal_b_dec.json()["is_available"] is True
    assert test_date_dec not in cal_b_dec.json()["bookedDates"]


# =========================================================================
# 12. BOUNDARY TIMES AND 24-HOUR ELAPSED INTERVALS
# =========================================================================

def test_12_boundary_times_and_exact_intervals():
    """
    Full-day booking calculates exact 24 elapsed hours.
    Multi-day booking calculates exact N * 24 elapsed hours.
    """
    s_dt, e_dt = calculate_booking_interval("2026-12-26", "2026-12-27", "full_day", "full_day", "10:00")
    assert s_dt.strftime("%H:%M") == "10:00"
    assert e_dt.strftime("%H:%M") == "10:00"
    assert (e_dt - s_dt).total_seconds() / 3600 == 24.0

    # 3-day rental
    s_dt3, e_dt3 = calculate_booking_interval("2026-12-26", "2026-12-29", "full_day", "custom", "10:00")
    assert (e_dt3 - s_dt3).total_seconds() / 3600 == 72.0


# =========================================================================
# 13. TWO SEPARATE SESSIONS MAKE ENTIRE DATE UNAVAILABLE
# =========================================================================

def test_13_two_separate_sessions_make_entire_date_unavailable():
    """
    If Morning is booked by Renter 1, Afternoon remains available.
    If Afternoon is subsequently booked by Renter 2, the entire date becomes unavailable.
    Both sessions and full day must show unavailable, and full_day_booked_dates must include the date.
    """
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)
    test_date = "2026-12-30"

    # 1. Renter 1 books Morning
    res1 = client.post("/api/orders", headers=headers1, json={
        "id": "ord_sep_morning_30",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res1.status_code == 200

    # Availability check: morning unavailable, afternoon available, date not yet in full_day_booked_dates
    cal_half = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}")
    assert cal_half.status_code == 200
    data_half = cal_half.json()
    assert test_date in data_half["bookedDates"]
    assert test_date not in data_half.get("full_day_booked_dates", [])
    sess_half = {s["session"]: s["available"] for s in data_half["dates"][0]["sessions"]}
    assert sess_half["morning"] is False
    assert sess_half["afternoon"] is True
    assert sess_half["full_day"] is False

    # 2. Renter 2 books Afternoon
    res2 = client.post("/api/orders", headers=headers2, json={
        "id": "ord_sep_afternoon_30",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res2.status_code == 200

    # Availability check: BOTH sessions unavailable -> entire date is fully booked
    cal_full = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}")
    assert cal_full.status_code == 200
    data_full = cal_full.json()
    assert test_date in data_full["bookedDates"]
    assert test_date in data_full.get("full_day_booked_dates", [])
    sess_full = {s["session"]: s["available"] for s in data_full["dates"][0]["sessions"]}
    assert sess_full["morning"] is False
    assert sess_full["afternoon"] is False
    assert sess_full["full_day"] is False

    # Attempting to book any session or full day fails with 409
    headers3 = _get_headers("renter3_conflict_test@payent.test")
    res_fail = client.post("/api/orders", headers=headers3, json={
        "id": "ord_fail_on_full_date",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_fail.status_code == 409


# =========================================================================
# 14. CANCELLED FULL-DAY RELEASES BOTH MORNING AND AFTERNOON SESSIONS
# =========================================================================

def test_14_cancelled_full_day_releases_both_morning_and_afternoon():
    """
    Cancelling a full-day booking immediately releases both morning and afternoon sessions.
    The date is removed from bookedDates and full_day_booked_dates.
    """
    headers = _get_headers(RENTER_1_EMAIL)
    test_date = "2026-12-31"

    # Book full day
    res = client.post("/api/orders", headers=headers, json={
        "id": "ord_fd_to_cancel_31",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res.status_code == 200

    cal_before = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}")
    assert test_date in cal_before.json()["full_day_booked_dates"]

    # Cancel the booking
    cancel_res = client.post("/api/orders/ord_fd_to_cancel_31/cancel", headers=headers, json={
        "reason": "Change of plans"
    })
    assert cancel_res.status_code == 200

    # Date must be completely available now: morning=True, afternoon=True, full_day=True
    cal_after = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}")
    assert cal_after.status_code == 200
    data_after = cal_after.json()
    assert test_date not in data_after.get("bookedDates", [])
    assert test_date not in data_after.get("full_day_booked_dates", [])
    sess_after = {s["session"]: s["available"] for s in data_after["dates"][0]["sessions"]}
    assert sess_after["morning"] is True
    assert sess_after["afternoon"] is True
    assert sess_after["full_day"] is True

    # Renter 2 can immediately book full day on this released date
    headers2 = _get_headers(RENTER_2_EMAIL)
    res_rebook = client.post("/api/orders", headers=headers2, json={
        "id": "ord_rebook_fd_31",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    assert res_rebook.status_code == 200


# =========================================================================
# 15. CANCELLED PARTIAL-DAY RELEASES ONLY THAT SESSION & PRESERVES BLOCKED DATES
# =========================================================================

def test_15_cancelled_partial_day_releases_only_that_session_and_keeps_blocked_dates():
    """
    When Morning and Afternoon are both booked, cancelling Morning releases ONLY Morning.
    Afternoon remains booked.
    Owner-blocked dates remain strictly unavailable even when other bookings are cancelled.
    """
    headers1 = _get_headers(RENTER_1_EMAIL)
    headers2 = _get_headers(RENTER_2_EMAIL)
    test_date = "2027-01-05"

    # Book Morning (Renter 1) and Afternoon (Renter 2)
    res_m = client.post("/api/orders", headers=headers1, json={
        "id": "ord_part_m_05",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "morning",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_m.status_code == 200

    res_a = client.post("/api/orders", headers=headers2, json={
        "id": "ord_part_a_05",
        "productId": TEST_PROD_A,
        "startDate": test_date,
        "endDate": test_date,
        "timeSlot": "afternoon",
        "durationType": "half_day",
        "total": 3000,
        "status": "pending",
    })
    assert res_a.status_code == 200

    # Cancel Morning booking only
    cancel_m = client.post("/api/orders/ord_part_m_05/cancel", headers=headers1, json={
        "reason": "Cancelled morning shoot"
    })
    assert cancel_m.status_code == 200

    # Availability check: Morning is released (True), Afternoon is STILL BOOKED (False)
    cal_res = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={test_date}&end_date={test_date}")
    sess = {s["session"]: s["available"] for s in cal_res.json()["dates"][0]["sessions"]}
    assert sess["morning"] is True, "Morning session should be released"
    assert sess["afternoon"] is False, "Afternoon session must remain booked"
    assert sess["full_day"] is False, "Full day cannot be available if afternoon is booked"
    # Date should no longer be in full_day_booked_dates since morning is available
    assert test_date not in cal_res.json().get("full_day_booked_dates", [])

    # Also test owner-blocked date preservation:
    owner_blocked_date = "2027-01-06"
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_A]["blocked_dates"] = [owner_blocked_date]

    # Create and cancel an unrelated order on another date
    client.post("/api/orders", headers=headers1, json={
        "id": "ord_temp_07",
        "productId": TEST_PROD_A,
        "startDate": "2027-01-07",
        "endDate": "2027-01-07",
        "timeSlot": "full_day",
        "durationType": "full_day",
        "total": 5000,
        "status": "pending",
    })
    client.post("/api/orders/ord_temp_07/cancel", headers=headers1, json={"reason": "Test"})

    # Owner-blocked date must strictly remain unavailable
    cal_blocked = client.get(f"/api/products/{TEST_PROD_A}/availability?start_date={owner_blocked_date}&end_date={owner_blocked_date}")
    assert cal_blocked.json()["is_available"] is False
    assert cal_blocked.json()["status"] == "blocked"
    assert owner_blocked_date in cal_blocked.json()["blockedDates"]

    # Clean up blocked dates
    MOCK_CUSTOM_PRODUCTS[TEST_PROD_A].pop("blocked_dates", None)


# =========================================================================
# 16. FULL-DAY BOOKING BEHAVIOR IDENTICAL ACROSS MULTIPLE PRODUCTS AND DATES
# =========================================================================

def test_16_full_day_booking_behavior_identical_across_multiple_products_and_dates():
    """
    Validates that full-day bookings across multiple dates and products:
    1. Consistently block morning, afternoon, and full day on the booked date.
    2. Crucially DO NOT bleed into the next day (Day D+1 remains 100% available).
    """
    headers = _get_headers(RENTER_1_EMAIL)

    test_cases = [
        (TEST_PROD_A, "2027-01-10", "2027-01-11"),
        (TEST_PROD_A, "2027-01-14", "2027-01-15"),
        (TEST_PROD_B, "2027-01-20", "2027-01-21"),
        (TEST_PROD_B, "2027-01-25", "2027-01-26"),
    ]

    for idx, (prod_id, booked_date, next_date) in enumerate(test_cases):
        case_headers = _get_headers(f"renter_bleed_case_{idx}@payent.test")
        # Book full day on booked_date
        res = client.post("/api/orders", headers=case_headers, json={
            "id": f"ord_bleed_test_{prod_id}_{booked_date}",
            "productId": prod_id,
            "startDate": booked_date,
            "endDate": booked_date,
            "timeSlot": "full_day",
            "durationType": "full_day",
            "total": 5000,
            "status": "pending",
        })
        assert res.status_code == 200, f"Booking failed for {prod_id} on {booked_date}"

        # Check booked_date: both sessions and full_day are unavailable
        cal_booked = client.get(f"/api/products/{prod_id}/availability?start_date={booked_date}&end_date={booked_date}")
        sess_booked = {s["session"]: s["available"] for s in cal_booked.json()["dates"][0]["sessions"]}
        assert sess_booked["morning"] is False, f"Morning should be booked on {booked_date}"
        assert sess_booked["afternoon"] is False, f"Afternoon should be booked on {booked_date}"
        assert sess_booked["full_day"] is False, f"Full day should be booked on {booked_date}"
        assert booked_date in cal_booked.json()["full_day_booked_dates"]

        # CRITICAL TEST: Check next_date (Day D+1) - MUST BE 100% AVAILABLE (NO NEXT-DAY BLEEDING!)
        cal_next = client.get(f"/api/products/{prod_id}/availability?start_date={next_date}&end_date={next_date}")
        assert cal_next.status_code == 200
        sess_next = {s["session"]: s["available"] for s in cal_next.json()["dates"][0]["sessions"]}
        assert sess_next["morning"] is True, f"Next day morning ({next_date}) must be available, but was blocked by bleeding!"
        assert sess_next["afternoon"] is True, f"Next day afternoon ({next_date}) must be available!"
        assert sess_next["full_day"] is True, f"Next day full-day ({next_date}) must be available!"
        assert next_date not in cal_next.json().get("bookedDates", [])
        assert next_date not in cal_next.json().get("full_day_booked_dates", [])

