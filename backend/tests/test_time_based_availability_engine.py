import pytest
import datetime
import threading
from database import (
    calculate_booking_interval,
    check_product_interval_conflicts,
    get_product_slots_for_date,
    normalize_slot_interval,
    find_authoritative_product,
    create_order,
    MOCK_ORDERS,
    MOCK_CUSTOM_PRODUCTS,
    DEFAULT_BUFFER_MINUTES,
    _BOOKING_CONCURRENCY_LOCK,
)
from auth import create_access_token


class TestTimeBasedAvailabilityEngine:
    """
    Authoritative test suite verifying:
    1. Canonical rental timing rules (Morning=4h, Afternoon=4h, Full Day=24h, Multi-day=N*24h).
    2. Half-open interval overlap logic [start, end).
    3. Vendor blocked dates & session intervals.
    4. Concurrency protection & race condition handling.
    5. Authoritative price recalculation.
    """

    # =========================================================================
    # 1. DURATION & TIMESTAMP INTERVAL CALCULATION TESTS
    # =========================================================================

    def test_canonical_morning_slot_duration(self):
        """Morning slot is 08:00 to 12:00 (exactly 4 hours)."""
        s_dt, e_dt = calculate_booking_interval("2026-11-01", "2026-11-01", time_slot="morning", duration_type="half_day")
        assert s_dt.strftime("%H:%M") == "08:00"
        assert e_dt.strftime("%H:%M") == "12:00"
        elapsed_hours = (e_dt - s_dt).total_seconds() / 3600
        assert elapsed_hours == 4.0

    def test_canonical_afternoon_slot_duration(self):
        """Afternoon slot is 13:00 to 17:00 (exactly 4 hours)."""
        s_dt, e_dt = calculate_booking_interval("2026-11-01", "2026-11-01", time_slot="afternoon", duration_type="half_day")
        assert s_dt.strftime("%H:%M") == "13:00"
        assert e_dt.strftime("%H:%M") == "17:00"
        elapsed_hours = (e_dt - s_dt).total_seconds() / 3600
        assert elapsed_hours == 4.0

    def test_canonical_full_day_is_exact_24_elapsed_hours(self):
        """Full Day is exactly 24 elapsed hours from start timestamp, not 08:00-17:00."""
        s_dt, e_dt = calculate_booking_interval("2026-11-01", "2026-11-02", time_slot="full_day", duration_type="full_day", start_time="10:00")
        assert s_dt.strftime("%H:%M") == "10:00"
        assert e_dt.strftime("%H:%M") == "10:00"
        elapsed_hours = (e_dt - s_dt).total_seconds() / 3600
        assert elapsed_hours == 24.0
        assert e_dt.date() == (s_dt.date() + datetime.timedelta(days=1))

    @pytest.mark.parametrize("days,expected_hours", [
        (1, 24.0),
        (2, 48.0),
        (3, 72.0),
        (4, 96.0),
        (5, 120.0),
        (7, 168.0),
        (10, 240.0),
        (14, 336.0),
        (30, 720.0),
    ])
    def test_flexible_multi_day_durations(self, days, expected_hours):
        """Multi-day rental duration must equal exactly N * 24 hours."""
        start_date = "2026-11-01"
        start_obj = datetime.date(2026, 11, 1)
        end_obj = start_obj + datetime.timedelta(days=days)
        end_date = end_obj.strftime("%Y-%m-%d")

        s_dt, e_dt = calculate_booking_interval(
            start_date, end_date, time_slot="full_day", duration_type="custom", start_time="10:00"
        )
        elapsed_hours = (e_dt - s_dt).total_seconds() / 3600
        assert elapsed_hours == expected_hours
        assert e_dt == s_dt + datetime.timedelta(days=days)

    def test_invalid_negative_or_inverted_dates_raise_error(self):
        """Inverted start and end dates must raise ValueError."""
        with pytest.raises(ValueError):
            calculate_booking_interval("2026-11-10", "2026-11-05", time_slot="full_day", duration_type="custom")

    # =========================================================================
    # 2. HALF-OPEN TIME OVERLAP LOGIC & SESSION CONFLICT TESTS
    # =========================================================================

    def test_morning_and_afternoon_adjacent_with_buffer(self):
        """Morning ends at 12:00, Afternoon starts at 13:00. With 60m buffer, they do not overlap."""
        product_id = "test_engine_prod_1"
        MOCK_CUSTOM_PRODUCTS[product_id] = {
            "id": product_id,
            "title": "Canon EOS R5",
            "category": "cameras",
            "available": True,
            "price": 3000,
            "buffer_minutes": 60,
        }
        # Simulate active order occupying morning
        m_start, m_end = normalize_slot_interval("2026-11-15", "morning")
        order_id = "test_ord_morning"
        MOCK_ORDERS[order_id] = {
            "id": order_id,
            "product_id": product_id,
            "status": "pending",
            "start_datetime": m_start.isoformat(),
            "end_datetime": m_end.isoformat(),
            "time_slot": "morning",
            "duration_type": "half_day",
        }

        # Check afternoon slot on same day
        a_start, a_end = normalize_slot_interval("2026-11-15", "afternoon")
        has_conf, reason = check_product_interval_conflicts(product_id, a_start, a_end, buffer_minutes=60)
        assert not has_conf, f"Afternoon slot should be available, got conflict: {reason}"

        # Clean up
        MOCK_ORDERS.pop(order_id, None)

    def test_full_day_blocks_both_morning_and_afternoon(self):
        """Full Day booking blocks both morning and afternoon on that day."""
        product_id = "test_engine_prod_2"
        MOCK_CUSTOM_PRODUCTS[product_id] = {
            "id": product_id,
            "title": "Sony A7S III",
            "category": "cameras",
            "available": True,
            "price": 3500,
            "buffer_minutes": 60,
        }
        f_start, f_end = normalize_slot_interval("2026-11-16", "full_day")
        order_id = "test_ord_fullday"
        MOCK_ORDERS[order_id] = {
            "id": order_id,
            "product_id": product_id,
            "status": "active",
            "start_datetime": f_start.isoformat(),
            "end_datetime": f_end.isoformat(),
            "time_slot": "full_day",
            "duration_type": "full_day",
        }

        # Check morning conflict
        m_start, m_end = normalize_slot_interval("2026-11-16", "morning")
        m_conf, _ = check_product_interval_conflicts(product_id, m_start, m_end, buffer_minutes=60)
        assert m_conf is True

        # Check afternoon conflict
        a_start, a_end = normalize_slot_interval("2026-11-16", "afternoon")
        a_conf, _ = check_product_interval_conflicts(product_id, a_start, a_end, buffer_minutes=60)
        assert a_conf is True

        # Clean up
        MOCK_ORDERS.pop(order_id, None)

    def test_multi_day_booking_checks_entire_interval(self):
        """Multi-day booking from Nov 20 to Nov 23 checks every day including Day 2 and Day 3."""
        product_id = "test_engine_prod_3"
        MOCK_CUSTOM_PRODUCTS[product_id] = {
            "id": product_id,
            "title": "RED Komodo 6K",
            "category": "cameras",
            "available": True,
            "price": 6000,
            "buffer_minutes": 60,
        }
        s_dt, e_dt = calculate_booking_interval("2026-11-20", "2026-11-23", "full_day", "custom", "10:00")
        order_id = "test_ord_multiday"
        MOCK_ORDERS[order_id] = {
            "id": order_id,
            "product_id": product_id,
            "status": "active",
            "start_datetime": s_dt.isoformat(),
            "end_datetime": e_dt.isoformat(),
            "time_slot": "full_day",
            "duration_type": "custom",
        }

        # Attempt to book on Day 2 (Nov 21 afternoon)
        d2_start, d2_end = normalize_slot_interval("2026-11-21", "afternoon")
        d2_conf, _ = check_product_interval_conflicts(product_id, d2_start, d2_end, buffer_minutes=60)
        assert d2_conf is True

        # Attempt to book on Day 3 (Nov 22 morning)
        d3_start, d3_end = normalize_slot_interval("2026-11-22", "morning")
        d3_conf, _ = check_product_interval_conflicts(product_id, d3_start, d3_end, buffer_minutes=60)
        assert d3_conf is True

        # Clean up
        MOCK_ORDERS.pop(order_id, None)

    # =========================================================================
    # 3. VENDOR BLOCKED DATES & TIME SESSIONS
    # =========================================================================

    def test_vendor_session_block_enforced_authoritatively(self):
        """Vendor blocking only the morning session keeps afternoon available."""
        product_id = "test_engine_prod_block"
        MOCK_CUSTOM_PRODUCTS[product_id] = {
            "id": product_id,
            "title": "DJI Ronin 4D",
            "category": "gimbals",
            "available": True,
            "price": 5000,
            "blocked_dates": [
                {"date": "2026-11-25", "session": "morning", "reason": "Lender camera calibration"}
            ],
        }

        m_start, m_end = normalize_slot_interval("2026-11-25", "morning")
        m_conf, m_reason = check_product_interval_conflicts(product_id, m_start, m_end)
        assert m_conf is True
        assert "calibration" in m_reason.lower() or "lender" in m_reason.lower()

        # Afternoon should remain available
        a_start, a_end = normalize_slot_interval("2026-11-25", "afternoon")
        a_conf, _ = check_product_interval_conflicts(product_id, a_start, a_end)
        assert not a_conf

        # Clean up
        MOCK_CUSTOM_PRODUCTS.pop(product_id, None)

    # =========================================================================
    # 4. CONCURRENCY & RACE CONDITION PROTECTION
    # =========================================================================

    def test_concurrent_conflicting_reservations_cannot_both_succeed(self):
        """When two concurrent requests attempt to reserve the same product interval, exactly one succeeds."""
        product_id = "test_engine_prod_concurrency"
        MOCK_CUSTOM_PRODUCTS[product_id] = {
            "id": product_id,
            "title": "ARRI Alexa Mini LF",
            "category": "cinema_cameras",
            "available": True,
            "price": 12000,
            "buffer_minutes": 60,
        }

        success_count = 0
        failure_count = 0
        lock = threading.Lock()

        def try_booking(renter_email, booking_id):
            nonlocal success_count, failure_count
            order_data = {
                "id": booking_id,
                "productId": product_id,
                "product_id": product_id,
                "productTitle": "ARRI Alexa Mini LF",
                "startDate": "2026-12-01",
                "endDate": "2026-12-01",
                "timeSlot": "morning",
                "durationType": "half_day",
                "startTime": "08:00",
                "endTime": "12:00",
                "total": 7200,
                "status": "pending",
                "category": "cinema_cameras",
            }
            try:
                create_order(renter_email, order_data)
                with lock:
                    success_count += 1
            except ValueError:
                with lock:
                    failure_count += 1

        t1 = threading.Thread(target=try_booking, args=("renter_race_1@payent.test", "ord_race_1"))
        t2 = threading.Thread(target=try_booking, args=("renter_race_2@payent.test", "ord_race_2"))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        assert success_count == 1, f"Expected exactly 1 successful booking, got {success_count}"
        assert failure_count == 1, f"Expected exactly 1 conflicting rejection, got {failure_count}"

        # Clean up
        MOCK_ORDERS.pop("ord_race_1", None)
        MOCK_ORDERS.pop("ord_race_2", None)
        MOCK_CUSTOM_PRODUCTS.pop(product_id, None)

    # =========================================================================
    # 5. AUTHORITATIVE PRICE VALIDATION
    # =========================================================================

    def test_authoritative_price_recalculation_on_tampering(self):
        """Client-submitted tampered price (e.g. ₹1) is overridden by authoritative server calculation."""
        product_id = "test_engine_prod_pricing"
        MOCK_CUSTOM_PRODUCTS[product_id] = {
            "id": product_id,
            "title": "Sony FX3",
            "category": "cameras",
            "available": True,
            "daily_rate": 3000,
            "half_day_rate": 1800,
            "price": 3000,
        }

        order_id = "ord_pricing_tamper_test"
        order_data = {
            "id": order_id,
            "productId": product_id,
            "product_id": product_id,
            "productTitle": "Sony FX3",
            "startDate": "2026-12-05",
            "endDate": "2026-12-07", # 2 days = 48 hours = 2 * 3000 = 6000
            "timeSlot": "full_day",
            "durationType": "custom",
            "total": 1.0,  # Malicious attempt to pay ₹1
            "status": "pending",
            "category": "cameras",
        }

        saved_order = create_order("tamper_tester@payent.test", order_data)
        assert saved_order["total"] == 6000.0, f"Expected server to recalculate ₹6000, got ₹{saved_order['total']}"

        # Clean up
        MOCK_ORDERS.pop(order_id, None)
        MOCK_CUSTOM_PRODUCTS.pop(product_id, None)
