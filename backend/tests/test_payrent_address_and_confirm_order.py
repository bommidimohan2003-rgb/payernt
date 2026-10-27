import os
import sys
import uuid
import random
import json
from datetime import datetime, timezone
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, MOCK_USERS, MOCK_CUSTOM_PRODUCTS, MOCK_ORDERS, MOCK_USER_ADDRESSES
from auth import create_access_token
from payernt_database import (
    create_or_get_rental_security_record,
    verify_secret_pin,
)
from database import (
    execute_query,
    fetch_one,
    get_user_addresses,
    get_user_address_by_id,
    save_user_address,
)


class TestPayrentAddressAndConfirmOrderFlow(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.renter_email = f"renter_addr_{uuid.uuid4().hex[:8]}@payrent.com"
        self.intruder_email = f"intruder_{uuid.uuid4().hex[:8]}@payrent.com"
        self.lender_email = f"lender_{uuid.uuid4().hex[:8]}@payernt.com"

        for email, role in [
            (self.renter_email, "customer"),
            (self.intruder_email, "customer"),
            (self.lender_email, "lender"),
        ]:
            execute_query("""
                INSERT INTO users (email, phone, full_name, role, status, verified, created_at)
                VALUES (%s, %s, %s, %s, 'approved', TRUE, %s)
                ON DUPLICATE KEY UPDATE status = 'approved', verified = TRUE
            """, (email, f"+919{random.randint(100000000, 999999999)}", "Test Customer", role, datetime.now(timezone.utc).isoformat()))
            MOCK_USERS[email] = {
                "email": email,
                "role": role,
                "status": "approved",
                "verified": True,
                "full_name": f"User {role.title()}",
                "is_approved": True,
            }

        self.renter_token = create_access_token(
            {"sub": self.renter_email, "role": "customer", "user_id": f"uid_{self.renter_email}"}
        )
        self.intruder_token = create_access_token(
            {"sub": self.intruder_email, "role": "customer", "user_id": f"uid_{self.intruder_email}"}
        )

        # Create test product in non-conflicting category
        self.product_id = f"prod_addr_test_{uuid.uuid4().hex[:8]}"
        prod_data = {
            "id": self.product_id,
            "title": "Blackmagic Pocket Cinema 6K Pro",
            "category": "Cinema-Rig",
            "price": 3200,
            "user_email": self.lender_email,
            "status": "approved",
            "available": True,
            "condition_grade": "flawless",
            "location": "Bengaluru",
            "description": "Cinema camera kit with prime lens package.",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        MOCK_CUSTOM_PRODUCTS[self.product_id] = prod_data
        execute_query("""
            INSERT INTO custom_products (
                id, title, category, price, user_email, status, available,
                condition_grade, location, description, created_at
            ) VALUES (%s, %s, %s, %s, %s, 'approved', TRUE, 'flawless', 'Bengaluru', 'Cinema kit', %s)
        """, (
            self.product_id,
            "Blackmagic Pocket Cinema 6K Pro",
            "Cinema-Rig",
            3200,
            self.lender_email,
            datetime.now(timezone.utc).isoformat()
        ))

    def test_01_save_valid_address_does_not_create_order_or_trigger_pin(self):
        """Saving an address must persist the address record but NEVER create or confirm an order."""
        # Initial order count for this renter
        initial_orders = [o for o in MOCK_ORDERS.values() if o.get("user_email") == self.renter_email]
        
        address_payload = {
            "fullName": "Rahul Deshmukh",
            "phone": "9876543210",
            "flatHouse": "Apartment 5B, Skyline Towers",
            "streetArea": "100 Feet Road, Indiranagar",
            "landmark": "Opposite Metro Pillar 42",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560038",
            "deliveryInstructions": "Please call before arrival. Deliver at front security desk.",
            "isDefault": True,
        }

        res = self.client.post(
            "/api/user/addresses",
            json=address_payload,
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        addr = data.get("address")
        self.assertIsNotNone(addr)
        self.assertEqual(addr.get("full_name"), "Rahul Deshmukh")
        self.assertEqual(addr.get("phone"), "9876543210")
        self.assertEqual(addr.get("pincode"), "560038")
        self.assertEqual(addr.get("city"), "Bengaluru")
        self.assertEqual(addr.get("state"), "Karnataka")

        # Crucial Verification: No orders or bookings were created by saving the address
        current_orders = [o for o in MOCK_ORDERS.values() if o.get("user_email") == self.renter_email]
        self.assertEqual(len(current_orders), len(initial_orders))

    def test_02_invalid_incomplete_address_is_rejected(self):
        """Incomplete or malformed addresses must fail with HTTP 400 Bad Request."""
        # Missing full name
        bad_res1 = self.client.post(
            "/api/user/addresses",
            json={"phone": "9876543210", "flatHouse": "Flat 1", "streetArea": "Road", "city": "BLR", "state": "KA", "pincode": "560038"},
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(bad_res1.status_code, 400)
        self.assertIn("Full name is required", bad_res1.json().get("detail", ""))

        # Invalid phone (< 10 digits)
        bad_res2 = self.client.post(
            "/api/user/addresses",
            json={"fullName": "Arjun", "phone": "12345", "flatHouse": "Flat 1", "streetArea": "Road", "city": "BLR", "state": "KA", "pincode": "560038"},
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(bad_res2.status_code, 400)
        self.assertIn("10-digit", bad_res2.json().get("detail", ""))

        # Invalid PIN code (< 6 digits)
        bad_res3 = self.client.post(
            "/api/user/addresses",
            json={"fullName": "Arjun", "phone": "9876543210", "flatHouse": "Flat 1", "streetArea": "Road", "city": "BLR", "state": "KA", "pincode": "560"},
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(bad_res3.status_code, 400)
        self.assertIn("6-digit", bad_res3.json().get("detail", ""))

        # Missing house/flat
        bad_res4 = self.client.post(
            "/api/user/addresses",
            json={"fullName": "Arjun", "phone": "9876543210", "streetArea": "Road", "city": "BLR", "state": "KA", "pincode": "560038"},
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(bad_res4.status_code, 400)

    def test_03_address_ownership_security(self):
        """Intruder cannot read, modify, delete, or bind another user's saved address."""
        # Save address as legitimate renter
        legit_addr = save_user_address(self.renter_email, {
            "fullName": "Priya Sharma",
            "phone": "9876543211",
            "flatHouse": "Penthouse 12",
            "streetArea": "Koramangala 4th Block",
            "landmark": "Near Sony Signal",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560034"
        })
        addr_id = legit_addr["id"]

        # 1. Intruder attempts GET
        res_get = self.client.get(
            f"/api/user/addresses/{addr_id}",
            headers={"Authorization": f"Bearer {self.intruder_token}"},
        )
        self.assertEqual(res_get.status_code, 403)

        # 2. Intruder attempts PUT
        res_put = self.client.put(
            f"/api/user/addresses/{addr_id}",
            json={"fullName": "Hacked Name", "phone": "9999999999", "flatHouse": "Hacked", "streetArea": "Hacked", "city": "BLR", "state": "KA", "pincode": "560001"},
            headers={"Authorization": f"Bearer {self.intruder_token}"},
        )
        self.assertEqual(res_put.status_code, 403)

        # 3. Intruder attempts DELETE
        res_del = self.client.delete(
            f"/api/user/addresses/{addr_id}",
            headers={"Authorization": f"Bearer {self.intruder_token}"},
        )
        self.assertEqual(res_del.status_code, 403)

        # 4. Intruder attempts to use renter's address ID during order creation
        res_order = self.client.post(
            "/api/orders",
            json={
                "id": f"ord_hack_{os.urandom(4).hex()}",
                "productId": self.product_id,
                "productTitle": "Cinema Camera",
                "startDate": "2026-11-20",
                "endDate": "2026-11-22",
                "total": 6400,
                "status": "pending",
                "deliveryAddressId": addr_id,
            },
            headers={"Authorization": f"Bearer {self.intruder_token}"},
        )
        self.assertEqual(res_order.status_code, 403)
        self.assertIn("Unauthorized", res_order.json().get("detail", ""))

    def test_04_explicit_confirm_order_creates_booking_with_address_snapshot(self):
        """Explicitly clicking Confirm Order creates the booking exactly once and snapshots the address."""
        # Step A: Save delivery address
        save_res = self.client.post(
            "/api/user/addresses",
            json={
                "fullName": "Ananya Sen",
                "phone": "9812345678",
                "flatHouse": "Villa 18, Palm Meadows",
                "streetArea": "Whitefield Main Road",
                "landmark": "Next to Forum Mall",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560066",
                "deliveryInstructions": "Call from main security gate.",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(save_res.status_code, 200)
        saved_addr = save_res.json()["address"]
        addr_id = saved_addr["id"]

        booking_id = f"ord_confirm_{uuid.uuid4().hex[:8]}"

        # Step C: Confirm Order
        confirm_res = self.client.post(
            "/api/orders",
            json={
                "id": booking_id,
                "productId": self.product_id,
                "productTitle": "Blackmagic Pocket Cinema 6K Pro",
                "productImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
                "startDate": "2026-11-10",
                "endDate": "2026-11-13",
                "total": 9600,
                "status": "pending",
                "deliveryMethod": "delivery",
                "deliveryAddressId": addr_id,
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(confirm_res.status_code, 200)
        data = confirm_res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("bookingId"), booking_id)

        # Verify address snapshot is attached to order
        saved_order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,)) or MOCK_ORDERS.get(booking_id)
        self.assertIsNotNone(saved_order)
        delivery_addr_str = saved_order.get("delivery_address") or saved_order.get("deliveryAddress")
        self.assertIn("Ananya Sen", delivery_addr_str)
        self.assertIn("Villa 18, Palm Meadows", delivery_addr_str)
        self.assertIn("560066", delivery_addr_str)

        # Idempotency / Double click prevention: Submitting same booking_id returns the existing order exactly once
        repeat_res = self.client.post(
            "/api/orders",
            json={
                "id": booking_id,
                "productId": self.product_id,
                "productTitle": "Blackmagic Pocket Cinema 6K Pro",
                "startDate": "2026-11-10",
                "endDate": "2026-11-13",
                "total": 9600,
                "status": "pending",
                "deliveryAddressId": addr_id,
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(repeat_res.status_code, 200)

        # Verify secret PIN flow is unlocked for the authenticated renter
        pin_res = self.client.get(
            f"/api/bookings/{booking_id}/renter-pin",
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(pin_res.status_code, 200)
        pin_data = pin_res.json()
        self.assertTrue(pin_data.get("success"))
        self.assertIsNotNone(pin_data.get("renterSecretPin"))

    def test_05_rental_date_conflict_prevents_order_confirmation(self):
        """Conflicting booking dates for the same product must be rejected with HTTP 409 Conflict."""
        # Booking 1 occupies 2026-12-10 to 2026-12-15
        b1_id = f"ord_d1_{uuid.uuid4().hex[:8]}"
        res1 = self.client.post(
            "/api/orders",
            json={
                "id": b1_id,
                "productId": self.product_id,
                "productTitle": "Blackmagic Pocket Cinema 6K Pro",
                "startDate": "2026-12-10",
                "endDate": "2026-12-15",
                "total": 16000,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.renter_token}"},
        )
        self.assertEqual(res1.status_code, 200)

        # Booking 2 from another renter for overlapping dates 2026-12-12 to 2026-12-14
        b2_id = f"ord_d2_{uuid.uuid4().hex[:8]}"
        res2 = self.client.post(
            "/api/orders",
            json={
                "id": b2_id,
                "productId": self.product_id,
                "productTitle": "Blackmagic Pocket Cinema 6K Pro",
                "startDate": "2026-12-12",
                "endDate": "2026-12-14",
                "total": 9600,
                "status": "pending",
            },
            headers={"Authorization": f"Bearer {self.intruder_token}"},
        )
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already booked", res2.json().get("detail", ""))


if __name__ == "__main__":
    unittest.main()
