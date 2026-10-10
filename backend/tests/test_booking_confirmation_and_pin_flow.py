import os
import sys
import uuid
import random
from datetime import datetime, timezone
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, MOCK_CUSTOM_PRODUCTS, MOCK_USERS, MOCK_ORDERS
from auth import create_access_token
from payernt_database import (
    create_or_get_rental_security_record,
    get_rental_security_record,
    verify_secret_pin,
    hash_secret_pin,
    log_payernt_audit_event,
)
from database import execute_query, fetch_one


class TestBookingConfirmationAndPinSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.renter_email = f"renter_flow_{uuid.uuid4().hex[:8]}@payernt.com"
        self.other_user_email = f"intruder_{uuid.uuid4().hex[:8]}@payernt.com"
        self.admin_email = f"admin_{uuid.uuid4().hex[:8]}@payernt.com"
        self.lender_email = f"lender_{uuid.uuid4().hex[:8]}@payernt.com"

        # Insert active users into both DB and mock store
        for email, role in [
            (self.renter_email, "customer"),
            (self.other_user_email, "customer"),
            (self.lender_email, "lender"),
            (self.admin_email, "admin"),
        ]:
            execute_query("""
                INSERT INTO users (email, phone, full_name, role, status, verified, created_at)
                VALUES (%s, %s, %s, %s, 'approved', TRUE, %s)
                ON DUPLICATE KEY UPDATE status = 'approved', verified = TRUE
            """, (email, f"+919{random.randint(100000000, 999999999)}", "Test User", role, datetime.now(timezone.utc).isoformat()))
            MOCK_USERS[email] = {
                "email": email,
                "role": role,
                "status": "approved",
                "verified": True,
                "full_name": f"Test {role.title()}",
                "is_approved": True,
            }

        self.renter_token = create_access_token(
            {"sub": self.renter_email, "role": "customer", "user_id": "renter_001"}
        )
        self.other_token = create_access_token(
            {"sub": self.other_user_email, "role": "customer", "user_id": "intruder_002"}
        )
        self.admin_token = create_access_token(
            {"sub": self.admin_email, "role": "admin", "user_id": "admin_001"}
        )

        # Create a test product in both DB and mock store
        self.product_id = f"prod_test_{uuid.uuid4().hex[:8]}"
        prod_data = {
            "id": self.product_id,
            "title": "Sony FX3 Cinema Camera Kit",
            "category": "Cameras",
            "price": 2500,
            "user_email": self.lender_email,
            "status": "approved",
            "available": True,
            "condition_grade": "like-new",
            "location": "Bengaluru",
            "description": "Test product",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        MOCK_CUSTOM_PRODUCTS[self.product_id] = prod_data
        execute_query("""
            INSERT INTO custom_products (
                id, title, category, price, user_email, status, available,
                condition_grade, location, description, created_at
            ) VALUES (%s, %s, %s, %s, %s, 'approved', TRUE, 'like-new', 'Bengaluru', 'Test product', %s)
        """, (
            self.product_id,
            "Sony FX3 Cinema Camera Kit",
            "Cameras",
            2500,
            self.lender_email,
            datetime.now(timezone.utc).isoformat()
        ))

    def test_01_booking_creation_does_not_leak_renter_pin(self):
        """Test that booking creation persists order in TiDB but does NOT return plaintext renterSecretPin."""
        booking_id = f"test_bk_{os.urandom(4).hex()}"
        payload = {
            "id": booking_id,
            "productId": self.product_id,
            "productTitle": "Sony Cinema FX3",
            "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
            "startDate": "2026-11-01",
            "endDate": "2026-11-05",
            "total": 6000,
            "status": "pending",
        }

        response = self.client.post(
            "/api/orders",
            json=payload,
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        # Verify renterSecretPin is NOT exposed in response
        self.assertNotIn("renterSecretPin", data)
        self.assertNotIn("renter_secret_pin", data)

        # Verify order was saved in database or store
        saved = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,)) or MOCK_ORDERS.get(booking_id)
        self.assertIsNotNone(saved)
        self.assertEqual(saved.get("user_email") or saved.get("userEmail"), self.renter_email)

    def test_08_unavailable_date_prevents_booking_creation(self):
        """Test that date conflict prevents booking creation (HTTP 409 Conflict)."""
        booking_id1 = f"test_bk_date1_{os.urandom(4).hex()}"
        res1 = self.client.post(
            "/api/orders",
            json={
                "id": booking_id1,
                "productId": self.product_id,
                "productTitle": "Sony FX3 Cinema Camera Kit",
                "startDate": "2026-12-01",
                "endDate": "2026-12-05",
                "total": 6000,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(res1.status_code, 200)

        booking_id2 = f"test_bk_date2_{os.urandom(4).hex()}"
        res_conflict = self.client.post(
            "/api/orders",
            json={
                "id": booking_id2,
                "productId": self.product_id,
                "productTitle": "Sony FX3 Cinema Camera Kit",
                "startDate": "2026-12-02",
                "endDate": "2026-12-04",
                "total": 3000,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(res_conflict.status_code, 409)

    def test_02_authorized_renter_can_reveal_secret_pin(self):
        """Test that the authenticated renter can retrieve their PIN on demand."""
        booking_id = f"test_bk_reveal_{os.urandom(4).hex()}"
        # Create order
        self.client.post(
            "/api/orders",
            json={
                "id": booking_id,
                "productId": self.product_id,
                "productTitle": "Sony Cinema FX3",
                "startDate": "2026-11-10",
                "endDate": "2026-11-12",
                "total": 8500,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )

        # Call GET renter-pin endpoint
        res = self.client.get(
            f"/api/bookings/{booking_id}/renter-pin",
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        pin = data.get("renterSecretPin")
        self.assertIsNotNone(pin)
        self.assertEqual(len(str(pin)), 4)
        self.assertTrue(str(pin).isdigit())

    def test_03_repeated_pin_retrievals_are_deterministic_and_do_not_regenerate(self):
        """Repeated clicks / calls must return the exact same PIN."""
        booking_id = f"test_bk_repeat_{os.urandom(4).hex()}"
        self.client.post(
            "/api/orders",
            json={
                "id": booking_id,
                "productId": self.product_id,
                "productTitle": "Sony Cinema FX3",
                "startDate": "2026-11-15",
                "endDate": "2026-11-18",
                "total": 9200,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )

        res1 = self.client.get(
            f"/api/bookings/{booking_id}/renter-pin",
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        pin1 = res1.json().get("renterSecretPin")

        res2 = self.client.get(
            f"/api/bookings/{booking_id}/renter-pin",
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        pin2 = res2.json().get("renterSecretPin")

        self.assertEqual(pin1, pin2)

    def test_04_unauthorized_user_cannot_reveal_another_renters_pin(self):
        """Intruder cannot access another user's Renter Secret PIN (HTTP 403 Forbidden)."""
        booking_id = f"test_bk_secure_{os.urandom(4).hex()}"
        self.client.post(
            "/api/orders",
            json={
                "id": booking_id,
                "productId": self.product_id,
                "productTitle": "Sony Cinema FX3",
                "startDate": "2026-11-20",
                "endDate": "2026-11-25",
                "total": 35000,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )

        # Attempt retrieval with other user's token
        res = self.client.get(
            f"/api/bookings/{booking_id}/renter-pin",
            headers={"Authorization": f"Bearer {self.other_token}"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Forbidden", res.json().get("detail", ""))

    def test_05_unauthenticated_request_is_rejected(self):
        """Unauthenticated requests must be rejected with 401."""
        booking_id = f"test_bk_noauth_{os.urandom(4).hex()}"
        res = self.client.get(f"/api/bookings/{booking_id}/renter-pin")
        self.assertEqual(res.status_code, 401)

    def test_06_admin_can_access_pin_for_support(self):
        """Admin can access PIN to assist in disputes/support."""
        booking_id = f"test_bk_admin_{os.urandom(4).hex()}"
        self.client.post(
            "/api/orders",
            json={
                "id": booking_id,
                "productId": self.product_id,
                "productTitle": "Sony Cinema FX3",
                "startDate": "2026-11-20",
                "endDate": "2026-11-22",
                "total": 4500,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )

        res = self.client.get(
            f"/api/bookings/{booking_id}/renter-pin",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))
        self.assertIsNotNone(res.json().get("renterSecretPin"))

    def test_07_pin_verification_workflow(self):
        """Cryptographic HMAC-SHA256 constant-time PIN verification continues working."""
        booking_id = f"test_bk_verify_{os.urandom(4).hex()}"
        sec = create_or_get_rental_security_record(
            booking_id=booking_id,
            product_id="prod_dji_ronin",
            vendor_id="lender@payernt.com",
            renter_id=self.renter_email,
            vendor_secret_pin="4821",
        )
        renter_pin = sec.get("renter_secret_pin")
        stored_hash = sec.get("renter_pin_hash")

        # Wrong PIN
        valid_wrong = verify_secret_pin("9999", stored_hash, booking_id, "RENTER")
        self.assertFalse(valid_wrong)

        # Correct PIN
        valid_correct = verify_secret_pin(renter_pin, stored_hash, booking_id, "RENTER")
        self.assertTrue(valid_correct)


if __name__ == "__main__":
    unittest.main()

