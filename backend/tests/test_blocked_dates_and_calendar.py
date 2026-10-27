import json
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from database import execute_query, fetch_one, check_products_booking_conflicts
from payernt_database import create_payernt_account, get_payernt_product_by_id

client = TestClient(app)

class TestBlockedDatesAndCalendarIntegration:
    @classmethod
    def setup_class(cls):
        # Create test vendor
        cls.vendor_email = f"calendar_vendor_{int(datetime.now().timestamp())}@payent.com"
        cls.vendor = create_payernt_account(
            email=cls.vendor_email,
            name="Cinema Gear Pro",
            phone="+91 9988776655",
            aadhaar_number="555566667777",
            address="77 Indiranagar, Bengaluru",
            pincode="560038",
            password="VendorPassword123!",
        )
        cls.vendor_token = create_access_token(
            data={"sub": cls.vendor_email, "account_type": "paye₹nt", "user_id": cls.vendor["id"]}
        )
        cls.vendor_headers = {"Authorization": f"Bearer {cls.vendor_token}"}

        # Create test renter
        cls.renter_email = f"calendar_renter_{int(datetime.now().timestamp())}@payent.com"
        cls.renter = create_payernt_account(
            email=cls.renter_email,
            name="Karan Director",
            phone="+91 9988776656",
            aadhaar_number="666677778888",
            address="88 Koramangala, Bengaluru",
            pincode="560034",
            password="RenterPassword123!",
        )
        cls.renter_token = create_access_token(
            data={"sub": cls.renter_email, "account_type": "renter", "user_id": cls.renter["id"]}
        )
        cls.renter_headers = {"Authorization": f"Bearer {cls.renter_token}"}

        # Create corresponding approved entry in users table and MOCK_USERS
        execute_query("""
            INSERT INTO users (id, email, full_name, role, status, created_at)
            VALUES (%s, %s, %s, 'renter', 'approved', %s)
            ON DUPLICATE KEY UPDATE status = 'approved'
        """, (cls.renter["id"], cls.renter_email, "Karan Director", datetime.now(timezone.utc).isoformat()))
        from database import MOCK_USERS
        MOCK_USERS[cls.renter_email] = {
            "id": cls.renter["id"],
            "email": cls.renter_email,
            "full_name": "Karan Director",
            "role": "renter",
            "status": "approved",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

    def test_01_create_product_with_initial_blocked_dates(self):
        """Vendor listing wizard Stage 3 blocked dates persist in database upon product creation."""
        initial_blocked = ["2026-11-15", "2026-11-16", "2026-11-20"]
        res = client.post(
            "/api/payernt/products",
            headers=self.vendor_headers,
            json={
                "category": "camera",
                "name": "RED Komodo 6K Cinema Camera",
                "title": "RED Komodo 6K Cinema Camera",
                "brand": "RED",
                "model": "Komodo 6K",
                "price": 3500,
                "dailyRate": 3500,
                "available": True,
                "status": "approved",
                "availability": {
                    "type": "always",
                    "availableNow": True,
                    "unavailableDates": initial_blocked,
                    "blockedDates": initial_blocked,
                    "bufferDaysBetweenRentals": 0
                },
                "blockedDates": initial_blocked
            }
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["success"] is True
        product_id = data.get("productId") or data.get("product", {}).get("id")
        assert product_id is not None
        TestBlockedDatesAndCalendarIntegration.product_id = str(product_id)

        # Verify database row contains blocked_dates (or fallback store if offline)
        row = fetch_one("SELECT blocked_dates, available, status FROM payernt_products WHERE id = %s", (product_id,))
        if row is not None:
            assert row["blocked_dates"] is not None
            db_blocked = json.loads(row["blocked_dates"])
            assert "2026-11-15" in db_blocked
            assert "2026-11-16" in db_blocked
            assert "2026-11-20" in db_blocked
        else:
            from payernt_database import MOCK_PAYERNT_PRODUCTS
            mock_prod = MOCK_PAYERNT_PRODUCTS.get(product_id)
            assert mock_prod is not None
            mock_blocked = mock_prod.get("blocked_dates") or []
            if isinstance(mock_blocked, str):
                mock_blocked = json.loads(mock_blocked)
            assert "2026-11-15" in mock_blocked
            assert "2026-11-16" in mock_blocked
            assert "2026-11-20" in mock_blocked

        # Ensure active in DB and mock stores for public booking tests
        execute_query("UPDATE payernt_products SET status = 'approved', available = 1 WHERE id = %s", (product_id,))
        execute_query("UPDATE custom_products SET status = 'approved', available = 1 WHERE id = %s", (product_id,))
        from payernt_database import MOCK_PAYERNT_PRODUCTS
        from database import MOCK_CUSTOM_PRODUCTS
        if product_id in MOCK_PAYERNT_PRODUCTS:
            MOCK_PAYERNT_PRODUCTS[product_id]["status"] = "approved"
            MOCK_PAYERNT_PRODUCTS[product_id]["available"] = True
            MOCK_PAYERNT_PRODUCTS[product_id]["availability_status"] = "available"
        if product_id in MOCK_CUSTOM_PRODUCTS:
            MOCK_CUSTOM_PRODUCTS[product_id]["status"] = "approved"
            MOCK_CUSTOM_PRODUCTS[product_id]["available"] = True
            MOCK_CUSTOM_PRODUCTS[product_id]["availability_status"] = "available"

    def test_02_vendor_fetches_availability_config(self):
        """Vendor can retrieve saved blocked dates via availability-config endpoint."""
        res = client.get(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers
        )
        assert res.status_code == 200
        config = res.json()
        assert config["success"] is True
        assert "2026-11-15" in config["blockedDates"]
        assert "2026-11-16" in config["blockedDates"]
        assert "2026-11-20" in config["blockedDates"]

    def test_03_vendor_updates_blocked_dates_range_and_non_consecutive(self):
        """Vendor can block multiple non-consecutive dates and continuous ranges."""
        new_blocked = ["2026-11-15", "2026-11-16", "2026-11-20", "2026-12-01", "2026-12-02", "2026-12-03"]
        res = client.post(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers,
            json={
                "blockedDates": new_blocked,
                "allowHalfDay": True,
                "halfDayRate": 2100,
                "bufferMinutes": 60
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert len(data["config"]["blockedDates"]) == 6
        assert "2026-12-02" in data["config"]["blockedDates"]

        # Confirm in DB
        row = fetch_one("SELECT blocked_dates FROM payernt_products WHERE id = %s", (self.product_id,))
        if row is not None:
            db_dates = json.loads(row["blocked_dates"])
            assert "2026-12-02" in db_dates
        else:
            from payernt_database import MOCK_PAYERNT_PRODUCTS
            mock_dates = MOCK_PAYERNT_PRODUCTS[self.product_id].get("blocked_dates") or []
            if isinstance(mock_dates, str):
                mock_dates = json.loads(mock_dates)
            assert "2026-12-02" in mock_dates

    def test_04_vendor_removes_blocked_date(self):
        """Vendor can unblock previously blocked dates and changes persist in DB."""
        unblocked_list = ["2026-11-15", "2026-12-01", "2026-12-02", "2026-12-03"]
        res = client.post(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers,
            json={
                "blockedDates": unblocked_list
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert "2026-11-16" not in data["config"]["blockedDates"]
        assert "2026-11-20" not in data["config"]["blockedDates"]
        assert "2026-11-15" in data["config"]["blockedDates"]

        # Verify DB reflects removal
        row = fetch_one("SELECT blocked_dates FROM payernt_products WHERE id = %s", (self.product_id,))
        if row is not None:
            db_dates = json.loads(row["blocked_dates"])
            assert "2026-11-16" not in db_dates
            assert "2026-11-15" in db_dates
        else:
            from payernt_database import MOCK_PAYERNT_PRODUCTS
            mock_dates = MOCK_PAYERNT_PRODUCTS[self.product_id].get("blocked_dates") or []
            if isinstance(mock_dates, str):
                mock_dates = json.loads(mock_dates)
            assert "2026-11-16" not in mock_dates
            assert "2026-11-15" in mock_dates

    def test_05_renter_availability_calendar_returns_blocked_dates(self):
        """Renter calendar queries availability and receives authoritative blockedDates."""
        res = client.get(f"/api/products/{self.product_id}/availability")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "2026-11-15" in data["blockedDates"]
        assert "2026-12-01" in data["blockedDates"]

    def test_06_renter_slots_returns_blocked_status_and_label(self):
        """Renter slot exploration on a blocked date returns 'blocked' status and 'Blocked by Owner'."""
        res = client.get(f"/api/products/{self.product_id}/slots?date=2026-11-15")
        assert res.status_code == 200
        data = res.json()
        assert data["isBlocked"] is True
        assert any(s["status"] == "blocked" for s in data["slots"])
        assert any("Blocked by Owner" in s["statusLabel"] for s in data["slots"])

    def test_07_renter_booking_rejected_for_single_blocked_date(self):
        """Booking submission for a blocked date is rejected with HTTP 409."""
        res = client.post(
            "/api/orders",
            headers=self.renter_headers,
            json={
                "id": f"ord_test_{int(datetime.now().timestamp())}",
                "productId": self.product_id,
                "startDate": "2026-11-15",
                "endDate": "2026-11-15",
                "total": 3500,
                "status": "active"
            }
        )
        assert res.status_code == 409
        assert "blocked" in res.text.lower() or "personal use" in res.text.lower()

    def test_08_renter_booking_rejected_for_multi_day_spanning_blocked_date(self):
        """Multi-day booking crossing a blocked date is strictly rejected by backend."""
        # 2026-11-14 to 2026-11-17 spans across 2026-11-15 (which is blocked)
        res = client.post(
            "/api/orders",
            headers=self.renter_headers,
            json={
                "id": f"ord_test_span_{int(datetime.now().timestamp())}",
                "productId": self.product_id,
                "startDate": "2026-11-14",
                "endDate": "2026-11-17",
                "total": 14000,
                "status": "active"
            }
        )
        assert res.status_code == 409
        assert "conflict" in res.text.lower() or "blocked" in res.text.lower()

    def test_09_direct_booking_api_rejected_for_blocked_date(self):
        """Direct booking creation via /api/bookings is also rejected for blocked dates."""
        res = client.post(
            "/api/bookings",
            headers=self.renter_headers,
            json={
                "productId": self.product_id,
                "startDate": "2026-12-02",
                "endDate": "2026-12-02",
                "timeSlot": "full_day"
            }
        )
        assert res.status_code == 409
        assert "unavailable" in res.text.lower() or "blocked" in res.text.lower() or "personal use" in res.text.lower()

    def test_10_renter_booking_succeeds_on_available_date(self):
        """Renter can book an unblocked available date, which converts date to booked."""
        avail_date = "2026-11-25"
        res = client.post(
            "/api/orders",
            headers=self.renter_headers,
            json={
                "id": f"ord_test_avail_{int(datetime.now().timestamp())}",
                "productId": self.product_id,
                "startDate": avail_date,
                "endDate": avail_date,
                "total": 3500,
                "status": "active"
            }
        )
        assert res.status_code == 200, res.text

        # Verify that 2026-11-25 now appears in bookedDates
        cal_res = client.get(f"/api/products/{self.product_id}/availability")
        assert cal_res.status_code == 200
        cal_data = cal_res.json()
        assert avail_date in cal_data["bookedDates"]

    def test_11_vendor_cannot_block_already_booked_date(self):
        """Vendor attempt to block an already-booked date is rejected with 409."""
        booked_date = "2026-11-25"
        res = client.post(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers,
            json={
                "blockedDates": ["2026-11-15", booked_date]
            }
        )
        assert res.status_code == 409
        assert "reservation" in res.text.lower() or "booked" in res.text.lower()

    def test_12_year_and_month_boundaries_handled_safely(self):
        """Dates across month and year boundaries persist safely without timezone drift."""
        boundary_dates = ["2026-12-31", "2027-01-01"]
        res = client.post(
            f"/api/payernt/products/{self.product_id}/availability-config",
            headers=self.vendor_headers,
            json={
                "blockedDates": ["2026-11-15", "2026-12-31", "2027-01-01"]
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert "2026-12-31" in data["config"]["blockedDates"]
        assert "2027-01-01" in data["config"]["blockedDates"]
