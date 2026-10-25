import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from main import app
from database import (
    execute_query,
    get_booking_cancellation,
    check_product_interval_conflicts,
    get_product_slots_for_date,
    normalize_slot_interval,
    MOCK_ORDERS,
    MOCK_BOOKING_CANCELLATIONS,
    MOCK_CUSTOM_PRODUCTS,
)
from auth import create_access_token
from payernt_database import (
    create_payernt_account,
    create_payernt_product,
    get_payernt_product_by_id,
    MOCK_PAYERNT_PRODUCTS,
)

client = TestClient(app)


class TestLenderCancellationAndTimeSlots:
    """
    Complete test suite for:
    1. Lender-initiated cancellation and feedback workflow with security guardrails.
    2. Flexible date and time-slot booking system (morning, afternoon, full-day, multi-day, buffer).
    """

    @classmethod
    def setup_class(cls):
        cls.vendor_email = "slot_vendor@payent.io"
        cls.other_vendor_email = "other_vendor@payent.io"
        cls.renter_email = "slot_renter@payent.io"

        # Cleanup existing test data if any
        try:
            execute_query("DELETE FROM booking_cancellations WHERE lender_id IN (%s, %s)", (cls.vendor_email, cls.other_vendor_email))
            execute_query("DELETE FROM orders WHERE user_email IN (%s, %s)", (cls.renter_email, cls.vendor_email))
            execute_query("DELETE FROM payernt_products WHERE owner_email IN (%s, %s)", (cls.vendor_email, cls.other_vendor_email))
            execute_query("DELETE FROM payernt_accounts WHERE email IN (%s, %s, %s)", (cls.vendor_email, cls.other_vendor_email, cls.renter_email))
        except Exception:
            pass

        # Create vendor 1
        cls.vendor = create_payernt_account(
            email=cls.vendor_email,
            name="Alpha Gear Rentals",
            phone="+91 9999900001",
            aadhaar_number="111122223333",
            address="12 HSR Layout, Bengaluru",
            pincode="560102",
            password="VendorPassword123!",
        )
        cls.vendor_token = create_access_token(
            data={"sub": cls.vendor_email, "account_type": "paye₹nt", "user_id": cls.vendor["id"]}
        )
        cls.vendor_headers = {"Authorization": f"Bearer {cls.vendor_token}"}

        # Create vendor 2 (for unauthorized check)
        cls.other_vendor = create_payernt_account(
            email=cls.other_vendor_email,
            name="Beta Studio Gear",
            phone="+91 9999900002",
            aadhaar_number="222233334444",
            address="45 Koramangala, Bengaluru",
            pincode="560034",
            password="OtherVendorPass123!",
        )
        cls.other_vendor_token = create_access_token(
            data={"sub": cls.other_vendor_email, "account_type": "paye₹nt", "user_id": cls.other_vendor["id"]}
        )
        cls.other_vendor_headers = {"Authorization": f"Bearer {cls.other_vendor_token}"}

        # Create renter (standard user / renter context)
        cls.renter = create_payernt_account(
            email=cls.renter_email,
            name="Rohan Filmmaker",
            phone="+91 9999900003",
            aadhaar_number="333344445555",
            address="78 Indiranagar, Bengaluru",
            pincode="560038",
            password="RenterPassword123!",
        )
        cls.renter_token = create_access_token(
            data={"sub": cls.renter_email, "account_type": "renter", "user_id": cls.renter["id"]}
        )
        cls.renter_headers = {"Authorization": f"Bearer {cls.renter_token}"}

        # Create a test gear listing
        cls.product = create_payernt_product(
            owner_id=cls.vendor["id"],
            owner_email=cls.vendor_email,
            owner_name="Alpha Gear Rentals",
            data={
                "title": "Sony FX6 Full-Frame Cinema Package",
                "category": "cameras",
                "daily_rate": 4500,
                "fair_market_price": 4500,
                "primary_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
                "serial_number": "FX6-TEST-998811",
                "city": "Bengaluru",
                "available": True,
                "status": "active",
            },
        )
        cls.product_id = str(cls.product["id"])
        # Ensure available
        try:
            execute_query("UPDATE payernt_products SET available = 1, status = 'active' WHERE id = %s", (cls.product_id,))
        except Exception:
            pass

    def _create_booking(self, start_date: str, end_date: str, time_slot=None, duration_type=None, start_time=None, end_time=None):
        res = client.post(
            "/api/bookings",
            headers=self.renter_headers,
            json={
                "productId": self.product_id,
                "startDate": start_date,
                "endDate": end_date,
                "timeSlot": time_slot,
                "durationType": duration_type,
                "startTime": start_time,
                "endTime": end_time,
            },
        )
        assert res.status_code == 200, res.text
        return res.json()["booking"]

    # =========================================================================
    # PHASE 1: LENDER CANCELLATION TESTS
    # =========================================================================

    def test_01_lender_cancel_eligible_booking_success(self):
        """Lender can cancel an eligible booking with a valid reason code and feedback."""
        booking = self._create_booking(
            start_date="2026-11-10",
            end_date="2026-11-10",
            time_slot="morning",
            duration_type="half_day",
            start_time="08:00",
            end_time="12:00",
        )
        booking_id = str(booking["id"])

        # Call lender cancel endpoint
        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={
                "reasonCode": "PERSONAL_USE",
                "feedback": "I need the cinema camera for a planned documentary shoot.",
            },
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["success"] is True
        assert data["booking"]["status"] == "cancelled"
        assert data["cancellation"]["reasonCode"] == "PERSONAL_USE"
        assert data["cancellation"]["initiatedBy"] == "LENDER"
        assert "documentary" in data["cancellation"]["feedback"]

        # Verify database record
        canc_rec = get_booking_cancellation(booking_id)
        assert canc_rec is not None
        assert canc_rec["reason_code"] == "PERSONAL_USE"
        assert canc_rec["initiated_by"] == "LENDER"

    def test_02_lender_cannot_cancel_other_lenders_booking(self):
        """A lender cannot cancel a booking owned by another lender."""
        booking = self._create_booking(
            start_date="2026-11-11",
            end_date="2026-11-11",
        )
        booking_id = str(booking["id"])

        # Other vendor tries to cancel
        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.other_vendor_headers,
            json={"reasonCode": "SCHEDULING_CONFLICT"},
        )
        assert res.status_code == 403
        assert "unauthorized" in res.text.lower()

    def test_03_renter_cannot_use_lender_cancel_endpoint(self):
        """A renter is forbidden from using the lender-only cancellation route."""
        booking = self._create_booking(
            start_date="2026-11-12",
            end_date="2026-11-12",
        )
        booking_id = str(booking["id"])

        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.renter_headers,
            json={"reasonCode": "PERSONAL_USE"},
        )
        assert res.status_code == 403

    def test_04_cancellation_requires_valid_reason_code(self):
        """Backend rejects unknown or invalid cancellation reasons."""
        booking = self._create_booking(
            start_date="2026-11-13",
            end_date="2026-11-13",
        )
        booking_id = str(booking["id"])

        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "INVALID_RANDOM_REASON"},
        )
        assert res.status_code == 400
        assert "invalid cancellation reason" in res.text.lower()

    def test_05_cancellation_other_requires_written_feedback(self):
        """Selecting OTHER reason code strictly requires a written explanation (min 5 chars)."""
        booking = self._create_booking(
            start_date="2026-11-14",
            end_date="2026-11-14",
        )
        booking_id = str(booking["id"])

        # Empty feedback
        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "OTHER", "feedback": ""},
        )
        assert res.status_code == 400
        assert "written explanation" in res.text.lower()

        # Whitespace only
        res_ws = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "OTHER", "feedback": "   "},
        )
        assert res_ws.status_code == 400

        # Valid explanation succeeds
        res_valid = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "OTHER", "feedback": "Client production moved to next quarter."},
        )
        assert res_valid.status_code == 200

    def test_06_cannot_cancel_completed_booking(self):
        """Completed bookings cannot be cancelled through the normal lender cancellation flow."""
        booking = self._create_booking(
            start_date="2026-11-15",
            end_date="2026-11-15",
        )
        booking_id = str(booking["id"])
        # Set to completed in database / mock
        try:
            execute_query("UPDATE orders SET status = 'completed' WHERE id = %s", (booking_id,))
        except Exception:
            pass
        for o in MOCK_ORDERS.values():
            if isinstance(o, dict) and str(o.get("id")) == booking_id:
                o["status"] = "completed"

        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "PERSONAL_USE"},
        )
        assert res.status_code == 400
        assert "completed" in res.text.lower()

    def test_07_cannot_cancel_after_handover_verified(self):
        """Normal cancellation is prevented after product handover/pickup has been verified."""
        booking = self._create_booking(
            start_date="2026-11-16",
            end_date="2026-11-16",
        )
        booking_id = str(booking["id"])
        # Mark handover verified
        try:
            execute_query(
                "UPDATE rental_security SET vendor_handover_verified = 1 WHERE booking_id = %s",
                (booking_id,),
            )
            execute_query(
                "UPDATE orders SET status = 'active' WHERE id = %s",
                (booking_id,),
            )
        except Exception:
            pass
        from payernt_database import MOCK_RENTAL_SECURITIES
        if booking_id in MOCK_RENTAL_SECURITIES:
            MOCK_RENTAL_SECURITIES[booking_id]["vendor_handover_verified"] = True
        for o in MOCK_ORDERS.values():
            if isinstance(o, dict) and str(o.get("id")) == booking_id:
                o["vendor_handover_verified"] = True
                o["status"] = "active"

        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "PERSONAL_USE"},
        )
        assert res.status_code == 400
        assert "handover" in res.text.lower() or "pickup" in res.text.lower()

    def test_08_cancellation_idempotency(self):
        """Submitting cancellation on an already cancelled booking returns 400 without duplicate rows."""
        booking = self._create_booking(
            start_date="2026-11-17",
            end_date="2026-11-17",
        )
        booking_id = str(booking["id"])

        res1 = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "SCHEDULING_CONFLICT"},
        )
        assert res1.status_code == 200

        # Second submission
        res2 = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "SCHEDULING_CONFLICT"},
        )
        assert res2.status_code == 400
        assert "already" in res2.text.lower() and "cancelled" in res2.text.lower()

    # =========================================================================
    # PHASE 2: FLEXIBLE TIME-SLOT BOOKING & CONFLICT LOGIC TESTS
    # =========================================================================

    def test_09_morning_and_afternoon_same_day_non_conflicting(self):
        """Morning (08:00-12:00) and Afternoon (13:00-17:00) can both be booked with 60-min buffer."""
        target_date = "2026-11-20"
        m_start, m_end = normalize_slot_interval(target_date, "morning")
        a_start, a_end = normalize_slot_interval(target_date, "afternoon")

        # Book morning slot
        self._create_booking(
            start_date=target_date,
            end_date=target_date,
            time_slot="morning",
            duration_type="half_day",
            start_time="08:00",
            end_time="12:00",
        )

        # Check conflict for afternoon slot on the same day (1 hour gap between 12:00 and 13:00)
        has_conflict, reason = check_product_interval_conflicts(
            self.product_id, a_start, a_end, buffer_minutes=60
        )
        assert not has_conflict, f"Expected afternoon slot to be available, but got: {reason}"

    def test_10_morning_vs_morning_overlap_conflict(self):
        """A second morning booking on the same day is rejected as conflicting."""
        target_date = "2026-11-21"
        m_start, m_end = normalize_slot_interval(target_date, "morning")

        # First morning booking
        self._create_booking(
            start_date=target_date,
            end_date=target_date,
            time_slot="morning",
            duration_type="half_day",
            start_time="08:00",
            end_time="12:00",
        )

        # Second morning reservation attempts
        has_conflict, reason = check_product_interval_conflicts(
            self.product_id, m_start, m_end, buffer_minutes=60
        )
        assert has_conflict is True
        assert "conflict" in reason.lower()

    def test_11_full_day_conflicts_with_half_day_slots(self):
        """A full-day booking conflicts with both morning and afternoon slots."""
        target_date = "2026-11-22"
        f_start, f_end = normalize_slot_interval(target_date, "full_day")
        m_start, m_end = normalize_slot_interval(target_date, "morning")
        a_start, a_end = normalize_slot_interval(target_date, "afternoon")

        # Book full day
        self._create_booking(
            start_date=target_date,
            end_date=target_date,
            time_slot="full_day",
            duration_type="full_day",
            start_time="08:00",
            end_time="17:00",
        )

        # Check morning conflict
        m_conflict, m_reason = check_product_interval_conflicts(
            self.product_id, m_start, m_end, buffer_minutes=60
        )
        assert m_conflict is True, "Morning slot should conflict with full day"

        # Check afternoon conflict
        a_conflict, a_reason = check_product_interval_conflicts(
            self.product_id, a_start, a_end, buffer_minutes=60
        )
        assert a_conflict is True, "Afternoon slot should conflict with full day"

    def test_12_multiday_booking_conflicts_with_all_intersecting_slots(self):
        """A 3-day booking conflicts with every slot on any of those 3 days."""
        # Create multi-day booking
        self._create_booking(
            start_date="2026-11-25",
            end_date="2026-11-27",
            time_slot="full_day",
            duration_type="custom",
        )

        # Attempt morning booking on Day 2 (Nov 26)
        day2_m_start, day2_m_end = normalize_slot_interval("2026-11-26", "morning")
        has_conflict, reason = check_product_interval_conflicts(
            self.product_id, day2_m_start, day2_m_end, buffer_minutes=60
        )
        assert has_conflict is True
        assert "conflict" in reason.lower()

    def test_13_cancelled_booking_releases_interval(self):
        """Once cancelled, a booking no longer blocks its interval for new renters."""
        target_date = "2026-11-28"
        m_start, m_end = normalize_slot_interval(target_date, "morning")

        booking = self._create_booking(
            start_date=target_date,
            end_date=target_date,
            time_slot="morning",
            duration_type="half_day",
        )
        booking_id = str(booking["id"])

        # Prior to cancellation, there is a conflict
        conf_before, _ = check_product_interval_conflicts(self.product_id, m_start, m_end)
        assert conf_before is True

        # Lender cancels
        res = client.post(
            f"/api/payernt/bookings/{booking_id}/cancel",
            headers=self.vendor_headers,
            json={"reasonCode": "PERSONAL_USE"},
        )
        assert res.status_code == 200

        # After cancellation, slot is freed
        conf_after, _ = check_product_interval_conflicts(self.product_id, m_start, m_end)
        assert conf_after is False

    def test_14_product_slots_endpoint_returns_pricing_and_availability(self):
        """GET /api/products/{id}/slots returns slot objects with live badges and rates."""
        target_date = "2026-12-01"
        res = client.get(f"/api/products/{self.product_id}/slots?date={target_date}")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["slots"]) == 3
        slot_ids = [s["id"] for s in data["slots"]]
        assert "morning" in slot_ids
        assert "afternoon" in slot_ids
        assert "full_day" in slot_ids
        for s in data["slots"]:
            assert s["status"] in ("available", "booked", "not_available")
            assert "rate" in s
            assert "statusLabel" in s

    def test_15_lender_availability_config_api(self):
        """Lender can update turnaround buffer, toggles, and block personal-use dates."""
        res_update = client.post(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers,
            json={
                "allowHalfDay": True,
                "morningSlotEnabled": True,
                "afternoonSlotEnabled": True,
                "fullDaySlotEnabled": True,
                "halfDayRate": 2800,
                "bufferMinutes": 90,
                "blockedDates": ["2026-12-25", "2026-12-31"],
            },
        )
        assert res_update.status_code == 200
        data = res_update.json()
        assert data["success"] is True

        # Fetch config
        res_get = client.get(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers,
        )
        assert res_get.status_code == 200
        config = res_get.json()
        assert config["bufferMinutes"] == 90
        assert config["halfDayRate"] == 2800
        assert "2026-12-25" in config["blockedDates"]

    def test_16_blocked_date_prevents_renter_booking(self):
        """A date marked as blocked for personal use rejects booking requests."""
        blocked_date = "2026-12-25"
        b_start, b_end = normalize_slot_interval(blocked_date, "full_day")

        has_conflict, reason = check_product_interval_conflicts(
            self.product_id, b_start, b_end
        )
        assert has_conflict is True
        assert "personal use" in reason.lower() or "blocked" in reason.lower()
