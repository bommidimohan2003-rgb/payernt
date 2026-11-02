import pytest
import datetime
from fastapi.testclient import TestClient
from main import app, check_single_product_availability
from database import (
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    get_slot_price,
    get_product_slots_for_date
)

@pytest.fixture
def client():
    return TestClient(app)

def test_authoritative_available_date_and_slots(client):
    """
    Issue 1 & 5 Acceptance Criteria:
    - October 31, 2026 is unblocked and unbooked.
    - Calendar, slot cards, and Check Slot Availability must all confirm AVAILABLE.
    - Check Slot Availability MUST NOT falsely report 'unavailable by owner'.
    """
    pid = "prod-test-oct31-avail"
    MOCK_CUSTOM_PRODUCTS[pid] = {
        "id": pid,
        "title": "Sony A7S III Cinema Kit",
        "name": "Sony A7S III Cinema Kit",
        "status": "approved",
        "available": True,
        "price": 3500.0,
        "daily_rate": 3500.0,
        "blocked_dates": ["2026-10-30"],  # Owner blocked Oct 30, but Oct 31 is available
    }

    # 1. Fetch slots for Oct 31
    slots_res = get_product_slots_for_date(pid, "2026-10-31")
    assert slots_res["isProductAvailable"] is True
    assert slots_res["isBlocked"] is False
    assert len(slots_res["slots"]) == 3
    for s in slots_res["slots"]:
        assert s["status"] == "available"
        assert s["statusLabel"] == "Available"
        assert s["enabled"] is True

    # 2. Check dynamic 50% pricing on slot cards: Morning (50%), Afternoon (50%), Full Day
    m_slot = next(s for s in slots_res["slots"] if s["id"] == "morning")
    a_slot = next(s for s in slots_res["slots"] if s["id"] == "afternoon")
    f_slot = next(s for s in slots_res["slots"] if s["id"] == "full_day")
    assert m_slot["price"] == 1750.0
    assert a_slot["price"] == 1750.0
    assert f_slot["price"] == 3500.0

    # 3. Calendar availability lookahead
    cal_res = client.get(f"/api/products/{pid}/availability?start_date=2026-10-01&end_date=2026-10-31")
    assert cal_res.status_code == 200
    cal_data = cal_res.json()
    assert cal_data["isProductAvailable"] is True
    assert "2026-10-30" in cal_data["blockedDates"]
    assert "2026-10-31" not in cal_data["blockedDates"]
    assert cal_data["session_availability"]["2026-10-31"]["morning"] is True
    assert cal_data["session_availability"]["2026-10-31"]["afternoon"] is True
    assert cal_data["session_availability"]["2026-10-31"]["full_day"] is True

    # 4. Check Slot Availability for Oct 31 Morning
    avail_check_m = client.get(f"/api/products/{pid}/availability?start_date=2026-10-31&end_date=2026-10-31&session=morning&duration_type=half_day")
    assert avail_check_m.status_code == 200
    data_m = avail_check_m.json()
    assert data_m["is_available"] is True
    assert data_m["status"] == "available"
    assert data_m["reason"] is None
    assert len(data_m["conflicts"]) == 0

    # 5. Check Slot Availability for Oct 31 Full Day
    avail_check_f = client.get(f"/api/products/{pid}/availability?start_date=2026-10-31&end_date=2026-10-31&session=full_day&duration_type=full_day")
    assert avail_check_f.status_code == 200
    data_f = avail_check_f.json()
    assert data_f["is_available"] is True
    assert data_f["status"] == "available"
    assert data_f["reason"] is None

def test_date_specific_owner_blocking_does_not_affect_unrelated_dates(client):
    """
    Issue 1 & Requirement 3:
    - Date-specific owner block on 2026-10-30 affects ONLY 2026-10-30.
    - Other dates remain available.
    """
    pid = "prod-test-date-block"
    MOCK_CUSTOM_PRODUCTS[pid] = {
        "id": pid,
        "title": "Canon R5 Mirrorless Camera",
        "status": "approved",
        "available": True,
        "price": 4000.0,
        "blocked_dates": ["2026-10-30"],
    }

    # Oct 30 is blocked
    res_oct30 = client.get(f"/api/products/{pid}/availability?start_date=2026-10-30&end_date=2026-10-30&session=full_day")
    assert res_oct30.status_code == 200
    data_oct30 = res_oct30.json()
    assert data_oct30["is_available"] is False
    assert data_oct30["status"] == "blocked"

    # Oct 31 is free
    res_oct31 = client.get(f"/api/products/{pid}/availability?start_date=2026-10-31&end_date=2026-10-31&session=full_day")
    assert res_oct31.status_code == 200
    data_oct31 = res_oct31.json()
    assert data_oct31["is_available"] is True
    assert data_oct31["status"] == "available"

def test_globally_unavailable_product_shows_no_available_slots(client):
    """
    Requirement 4:
    - If the owner marks the entire product as unavailable (or paused),
      all dates and time slots must display as unavailable.
      NO slot should have AVAILABLE labels.
    """
    pid = "prod-test-globally-paused"
    MOCK_CUSTOM_PRODUCTS[pid] = {
        "id": pid,
        "title": "DJI Ronin 4D 6K Cinema Camera",
        "status": "paused",
        "available": False,
        "price": 8500.0,
        "blocked_dates": [],
    }

    # 1. Slot endpoint must return not_available for all slots
    slots_res = get_product_slots_for_date(pid, "2026-10-31")
    assert slots_res["isProductAvailable"] is False
    for s in slots_res["slots"]:
        assert s["status"] == "not_available"
        assert s["status"] != "available"
        assert "paused" in s["statusLabel"].lower() or "unavailable" in s["statusLabel"].lower()
        assert s["enabled"] is False

    # 2. Availability endpoint must return isProductAvailable=False and all dates marked blocked
    cal_res = client.get(f"/api/products/{pid}/availability?start_date=2026-10-01&end_date=2026-10-31")
    assert cal_res.status_code == 200
    cal_data = cal_res.json()
    assert cal_data["isProductAvailable"] is False
    assert cal_data["isAvailable"] is False
    assert cal_data["status"] == "unavailable"
    assert "paused" in cal_data["reason"].lower() or "unavailable" in cal_data["reason"].lower()
    assert cal_data["session_availability"]["2026-10-31"]["morning"] is False
    assert cal_data["session_availability"]["2026-10-31"]["afternoon"] is False
    assert cal_data["session_availability"]["2026-10-31"]["full_day"] is False

def test_slot_pricing_model_and_full_day_retention():
    """
    Issue 2:
    - Morning = ₹500
    - Afternoon = ₹500
    - Full Day retains configured price unchanged (not calculated from 500)
    """
    prod = {
        "id": "prod-pricing-test",
        "price": 4200.0,
        "daily_rate": 4200.0,
    }
    assert get_slot_price("morning", prod) == 500.0
    assert get_slot_price("afternoon", prod) == 500.0
    assert get_slot_price("full_day", prod) == 4200.0

def test_full_day_and_session_conflict_rules(client):
    """
    Acceptance Criteria:
    - A full-day booking blocks conflicting Morning and Afternoon sessions.
    - Existing session bookings prevent conflicting full-day bookings.
    - Cancelled bookings release their slots.
    """
    pid = "prod-test-conflicts"
    MOCK_CUSTOM_PRODUCTS[pid] = {
        "id": pid,
        "title": "Red Komodo 6K",
        "status": "approved",
        "available": True,
        "price": 6000.0,
        "blocked_dates": [],
    }

    # Simulate existing morning booking on 2026-11-05
    ord_id = "ord-conflict-morning"
    MOCK_ORDERS[ord_id] = {
        "id": ord_id,
        "product_id": pid,
        "status": "confirmed",
        "time_slot": "morning",
        "start_datetime": "2026-11-05T08:00:00Z",
        "end_datetime": "2026-11-05T12:00:00Z",
        "start_date": "2026-11-05",
        "end_date": "2026-11-05"
    }

    # 1. Full day check on 2026-11-05 must be rejected
    res_f = client.get(f"/api/products/{pid}/availability?start_date=2026-11-05&end_date=2026-11-05&session=full_day")
    assert res_f.json()["is_available"] is False

    # 2. Afternoon session on 2026-11-05 must remain available
    res_a = client.get(f"/api/products/{pid}/availability?start_date=2026-11-05&end_date=2026-11-05&session=afternoon&duration_type=half_day")
    assert res_a.json()["is_available"] is True

    # 3. Cancel the morning order -> releases slot
    MOCK_ORDERS[ord_id]["status"] = "cancelled"
    res_f_released = client.get(f"/api/products/{pid}/availability?start_date=2026-11-05&end_date=2026-11-05&session=full_day")
    assert res_f_released.json()["is_available"] is True
