import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import datetime
from database import (
    MOCK_ORDERS,
    check_product_interval_conflicts,
    check_products_booking_conflicts,
    create_order,
    record_booking_cancellation,
    normalize_slot_interval,
    get_product_slots_for_date
)

def test_next_day_booking_block_lifecycle():
    # Setup clean product and dates
    test_pid = "test_camera_next_day_block_1"
    
    # 2026-11-09 is a Monday
    monday_str = "2026-11-09"
    tuesday_str = "2026-11-10"
    wednesday_str = "2026-11-11"
    
    # Clean any previous test orders for this product
    for k in list(MOCK_ORDERS.keys()):
        if str(MOCK_ORDERS[k].get("productId") or MOCK_ORDERS[k].get("product_id")) == test_pid:
            del MOCK_ORDERS[k]

    # Verify initially Monday, Tuesday, Wednesday are available
    m_s, m_e = normalize_slot_interval(monday_str, "full_day")
    t_s, t_e = normalize_slot_interval(tuesday_str, "full_day")
    w_s, w_e = normalize_slot_interval(wednesday_str, "full_day")

    conf_mon, _ = check_product_interval_conflicts(test_pid, m_s, m_e)
    conf_tue, _ = check_product_interval_conflicts(test_pid, t_s, t_e)
    conf_wed, _ = check_product_interval_conflicts(test_pid, w_s, w_e)
    assert not conf_mon, "Monday should initially be available"
    assert not conf_tue, "Tuesday should initially be available"
    assert not conf_wed, "Wednesday should initially be available"

    # User A books Monday (2026-11-09)
    order_a = {
        "id": "ord_user_a_monday",
        "productId": test_pid,
        "product_id": test_pid,
        "startDate": monday_str,
        "start_date": monday_str,
        "endDate": monday_str,
        "end_date": monday_str,
        "timeSlot": "full_day",
        "time_slot": "full_day",
        "status": "confirmed",
        "total": 1500
    }
    created_a = create_order("user_a@example.com", order_a)
    assert created_a is not None

    # Now verify:
    # 1. Monday = BOOKED
    conf_mon, reason_mon = check_product_interval_conflicts(test_pid, m_s, m_e)
    assert conf_mon is True
    assert "Conflict with existing" in reason_mon

    # 2. Tuesday = AUTOMATICALLY BLOCKED (Preparation Day)
    conf_tue, reason_tue = check_product_interval_conflicts(test_pid, t_s, t_e)
    assert conf_tue is True
    assert "This product is unavailable on the day following an existing booking." in reason_tue

    # 3. Wednesday = AVAILABLE
    conf_wed, reason_wed = check_product_interval_conflicts(test_pid, w_s, w_e)
    assert not conf_wed, f"Wednesday should be available, got conflict: {reason_wed}"

    # Verify slot availability API for Tuesday returns blocked preparation day
    tue_slots = get_product_slots_for_date(test_pid, tuesday_str)
    assert tue_slots["isBlocked"] is True
    assert tue_slots.get("isPreparationDay") is True
    assert tue_slots.get("preparationReason") == "This product is unavailable on the day following an existing booking."
    assert all(s["status"] == "blocked" for s in tue_slots["slots"])

    # Verify slot availability API for Wednesday returns available
    wed_slots = get_product_slots_for_date(test_pid, wednesday_str)
    assert wed_slots["isBlocked"] is False
    assert wed_slots.get("isPreparationDay") is False
    assert any(s["status"] == "available" for s in wed_slots["slots"])

    # Verify User B cannot book Tuesday (raises ValueError with message)
    order_b_tue = {
        "id": "ord_user_b_tuesday",
        "productId": test_pid,
        "product_id": test_pid,
        "startDate": tuesday_str,
        "start_date": tuesday_str,
        "endDate": tuesday_str,
        "end_date": tuesday_str,
        "timeSlot": "full_day",
        "time_slot": "full_day",
        "status": "confirmed",
        "total": 1500
    }
    with pytest.raises(ValueError) as excinfo:
        create_order("user_b@example.com", order_b_tue)
    assert "This product is unavailable on the day following an existing booking." in str(excinfo.value)

    # Verify User B CAN book Wednesday
    order_b_wed = {
        "id": "ord_user_b_wednesday",
        "productId": test_pid,
        "product_id": test_pid,
        "startDate": wednesday_str,
        "start_date": wednesday_str,
        "endDate": wednesday_str,
        "end_date": wednesday_str,
        "timeSlot": "full_day",
        "time_slot": "full_day",
        "status": "confirmed",
        "total": 1500
    }
    created_b = create_order("user_b@example.com", order_b_wed)
    assert created_b is not None

    # Now verify Multi-Day Booking block:
    # Let User C book Friday to Saturday (2026-11-13 to 2026-11-14)
    # Friday = 2026-11-13, Saturday = 2026-11-14
    # Sunday = 2026-11-15 (should be AUTOMATICALLY BLOCKED)
    # Monday = 2026-11-16 (should be AVAILABLE)
    test_pid_multi = "test_drone_multi_day_2"
    fri_str = "2026-11-13"
    sat_str = "2026-11-14"
    sun_str = "2026-11-15"
    next_mon_str = "2026-11-16"

    order_c = {
        "id": "ord_user_c_multi",
        "productId": test_pid_multi,
        "product_id": test_pid_multi,
        "startDate": fri_str,
        "start_date": fri_str,
        "endDate": sat_str,
        "end_date": sat_str,
        "timeSlot": "full_day",
        "time_slot": "full_day",
        "status": "confirmed",
        "total": 3000
    }
    create_order("user_c@example.com", order_c)

    sun_s, sun_e = normalize_slot_interval(sun_str, "full_day")
    nmon_s, nmon_e = normalize_slot_interval(next_mon_str, "full_day")

    # Sunday must be automatically blocked as next day after return date (Saturday)
    conf_sun, reason_sun = check_product_interval_conflicts(test_pid_multi, sun_s, sun_e)
    assert conf_sun is True
    assert "This product is unavailable on the day following an existing booking." in reason_sun

    # Next Monday must be available
    conf_nmon, _ = check_product_interval_conflicts(test_pid_multi, nmon_s, nmon_e)
    assert not conf_nmon, "Next Monday should be available"

    # Now verify cancellation releases the booking and blocked next day
    record_booking_cancellation("ord_user_a_monday", test_pid, "lender@example.com", "user_a@example.com", "I found a better alternative.")
    
    # Monday and Tuesday must now be released and AVAILABLE!
    conf_mon_after_cancel, _ = check_product_interval_conflicts(test_pid, m_s, m_e)
    conf_tue_after_cancel, _ = check_product_interval_conflicts(test_pid, t_s, t_e)
    assert not conf_mon_after_cancel, "Monday should be available after cancellation"
    assert not conf_tue_after_cancel, "Tuesday should be available after cancellation"

def test_availability_api_endpoint_payload():
    from main import check_single_product_availability
    from payernt_database import MOCK_PAYERNT_PRODUCTS

    test_pid = "test_cam_api_payload_1"
    MOCK_PAYERNT_PRODUCTS[test_pid] = {
        "id": test_pid,
        "title": "Payload Test Camera",
        "category": "Cameras",
        "status": "approved",
        "available": True,
        "daily_rate": 2000,
        "owner_id": "owner@example.com"
    }

    # Clean existing orders
    for k in list(MOCK_ORDERS.keys()):
        if str(MOCK_ORDERS[k].get("productId") or MOCK_ORDERS[k].get("product_id")) == test_pid:
            del MOCK_ORDERS[k]

    # Create active booking for Friday (2026-11-20)
    fri_str = "2026-11-20"
    sat_str = "2026-11-21"
    sun_str = "2026-11-22"

    order_fri = {
        "id": "ord_api_test_fri",
        "productId": test_pid,
        "product_id": test_pid,
        "startDate": fri_str,
        "start_date": fri_str,
        "endDate": fri_str,
        "end_date": fri_str,
        "timeSlot": "full_day",
        "time_slot": "full_day",
        "status": "confirmed",
        "total": 2000
    }
    create_order("renter1@example.com", order_fri)

    # 1. Query availability view window covering Friday through Sunday
    data = check_single_product_availability(test_pid, start_date=fri_str, end_date=sun_str)

    # Friday must be in bookedDates
    assert fri_str in data["bookedDates"], f"Expected {fri_str} in bookedDates, got {data['bookedDates']}"
    # Saturday must be in blockedDates AND preparationBlockedDates, but NOT in bookedDates
    assert sat_str in data["blockedDates"], f"Expected {sat_str} in blockedDates"
    assert sat_str in data["preparationBlockedDates"], f"Expected {sat_str} in preparationBlockedDates"
    assert sat_str not in data["bookedDates"], f"Did not expect {sat_str} in bookedDates"

    # Sunday must be neither booked nor blocked
    assert sun_str not in data["bookedDates"]
    assert sun_str not in data["blockedDates"]

    # 2. Query specific check for Saturday (the blocked day following the booking)
    sat_data = check_single_product_availability(test_pid, start_date=sat_str, end_date=sat_str, session="full_day")
    assert sat_data["isAvailable"] is False
    assert sat_data["status"] == "blocked"
    assert "This product is unavailable on the day following an existing booking." in sat_data["reason"]
    assert len(sat_data["conflicts"]) > 0
    assert sat_data["conflicts"][0]["reason"] == "preparation_blocked"

    # 3. Query specific check for Sunday (available)
    sun_data = check_single_product_availability(test_pid, start_date=sun_str, end_date=sun_str, session="full_day")
    assert sun_data["isAvailable"] is True
    assert sun_data["status"] == "available"


def test_multi_day_booking_pricing_and_next_day_block():
    from main import check_single_product_availability
    from payernt_database import MOCK_PAYERNT_PRODUCTS

    test_pid = "test_camera_multiday_suite_1"
    MOCK_PAYERNT_PRODUCTS[test_pid] = {
        "id": test_pid,
        "title": "Multi-Day Test Camera",
        "category": "Cameras",
        "status": "approved",
        "available": True,
        "daily_rate": 2000,
        "owner_id": "owner@example.com"
    }

    # Clean any previous orders for this product
    for k in list(MOCK_ORDERS.keys()):
        if str(MOCK_ORDERS[k].get("productId") or MOCK_ORDERS[k].get("product_id")) == test_pid:
            del MOCK_ORDERS[k]

    # Booking spans 3 full calendar days: Dec 1, Dec 2, Dec 3
    start_str = "2026-12-01"
    end_str = "2026-12-03"
    next_day_prep = "2026-12-04"
    available_day = "2026-12-05"

    order_multiday = {
        "id": "ord_multiday_3days",
        "productId": test_pid,
        "product_id": test_pid,
        "startDate": start_str,
        "start_date": start_str,
        "endDate": end_str,
        "end_date": end_str,
        "timeSlot": "full_day",
        "time_slot": "full_day",
        "duration_type": "custom",
        "status": "confirmed",
        "total": 0  # Should be authoritatively computed as 3 * daily_rate (2000) = 6000
    }
    created = create_order("renter_multi@example.com", order_multiday)
    assert created["total"] == 2000.0 * 3, f"Expected total 6000.0 for 3 days, got {created['total']}"

    # Verify availability across window Dec 1 through Dec 5
    data = check_single_product_availability(test_pid, start_date=start_str, end_date=available_day)

    # Dec 1, 2, 3 must be booked
    assert "2026-12-01" in data["bookedDates"]
    assert "2026-12-02" in data["bookedDates"]
    assert "2026-12-03" in data["bookedDates"]

    # Dec 4 must be automatically blocked as preparation day
    assert next_day_prep in data["blockedDates"]
    assert next_day_prep in data["preparationBlockedDates"]
    assert next_day_prep not in data["bookedDates"]

    # Dec 5 must be available
    assert available_day not in data["bookedDates"]
    assert available_day not in data["blockedDates"]

    # Dec 4 check gives preparation_blocked status
    prep_check = check_single_product_availability(test_pid, start_date=next_day_prep, end_date=next_day_prep)
    assert prep_check["isAvailable"] is False
    assert prep_check["status"] == "blocked"
    assert "This product is unavailable on the day following an existing booking." in prep_check["reason"]

    # Dec 5 check is available
    avail_check = check_single_product_availability(test_pid, start_date=available_day, end_date=available_day)
    assert avail_check["isAvailable"] is True
    assert avail_check["status"] == "available"
