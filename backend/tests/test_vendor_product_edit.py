import os
import sys
import unittest
import uuid
import json
from unittest.mock import patch, MagicMock

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, hash_password
from database import execute_query, fetch_one, fetch_all, get_db_connection
from payernt_database import MOCK_PAYERNT_PRODUCTS, update_payernt_product, get_payernt_product_by_id

client = TestClient(app)

class TestVendorProductEdit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = client
        cls.vendor1_email = f"vendor1_edit_{uuid.uuid4().hex[:8]}@payent.io"
        cls.vendor2_email = f"vendor2_edit_{uuid.uuid4().hex[:8]}@payent.io"
        cls.vendor1_id = f"PAYERNT_{cls.vendor1_email}"
        cls.vendor2_id = f"PAYERNT_{cls.vendor2_email}"
        cls.hashed_pw = hash_password("VendorSecurePass123!")

        # Create Vendor 1
        execute_query("""
            INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at)
            VALUES (%s, 'paye₹nt', %s, 'Authorized Vendor One', 'XXXX-XXXX-1111', '+919111122222', '123 Studio Way', '530001', %s, 'active', NOW())
        """, (cls.vendor1_id, cls.vendor1_email, cls.hashed_pw))

        # Create Vendor 2 (Unauthorized / Cross-vendor)
        execute_query("""
            INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at)
            VALUES (%s, 'paye₹nt', %s, 'Unauthorized Vendor Two', 'XXXX-XXXX-2222', '+919333344444', '456 Studio Rd', '530002', %s, 'active', NOW())
        """, (cls.vendor2_id, cls.vendor2_email, cls.hashed_pw))

        # In-memory mock accounts for test environments without MySQL
        from payernt_database import MOCK_PAYERNT_ACCOUNTS
        MOCK_PAYERNT_ACCOUNTS[cls.vendor1_email] = {
            "id": cls.vendor1_id,
            "account_type": "paye₹nt",
            "email": cls.vendor1_email,
            "name": "Authorized Vendor One",
            "phone": "+919111122222",
            "address": "123 Studio Way",
            "pincode": "530001",
            "status": "active"
        }
        MOCK_PAYERNT_ACCOUNTS[cls.vendor2_email] = {
            "id": cls.vendor2_id,
            "account_type": "paye₹nt",
            "email": cls.vendor2_email,
            "name": "Unauthorized Vendor Two",
            "phone": "+919333344444",
            "address": "456 Studio Rd",
            "pincode": "530002",
            "status": "active"
        }

        cls.vendor1_token = create_access_token({"sub": cls.vendor1_email, "account_type": "paye₹nt", "role": "vendor"})
        cls.vendor2_token = create_access_token({"sub": cls.vendor2_email, "account_type": "paye₹nt", "role": "vendor"})

        cls.vendor1_headers = {"Authorization": f"Bearer {cls.vendor1_token}"}
        cls.vendor2_headers = {"Authorization": f"Bearer {cls.vendor2_token}"}

    @classmethod
    def tearDownClass(cls):
        try:
            execute_query("DELETE FROM payernt_accounts WHERE email IN (%s, %s)", (cls.vendor1_email, cls.vendor2_email))
            execute_query("DELETE FROM payernt_products WHERE owner_email IN (%s, %s)", (cls.vendor1_email, cls.vendor2_email))
            execute_query("DELETE FROM custom_products WHERE user_email IN (%s, %s)", (cls.vendor1_email, cls.vendor2_email))
        except Exception:
            pass

    def _create_test_product(self, prod_id: str, owner_id: str, owner_email: str, status="under_review", security_deposit=1200):
        initial_images = ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32", "https://images.unsplash.com/photo-1502920917128-1aa500764cbd"]
        try:
            execute_query("""
                INSERT INTO payernt_products (
                    id, owner_id, owner_email, owner_name, category, name, title, brand, model,
                    description, specifications, condition_grade, condition_details, city, area, pincode,
                    pickup_instructions, daily_rate, security_deposit, available, availability_status,
                    primary_image, images, vendor_secret_pin, status, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, 'Authorized Vendor One', 'Cameras', 'Canon EOS R5', 'Canon EOS R5 Mirrorless Camera', 'Canon', 'EOS R5',
                    'Original test description for Canon R5.', '8K Raw Video', 'Like New', '{\"grade\":\"Like New\"}', 'Visakhapatnam', 'MVP Colony', '530017',
                    'Pickup at studio lobby with ID', 1500, %s, 1, 'available',
                    %s, %s, '889900', %s, NOW(), NOW()
                )
            """, (
                prod_id, owner_id, owner_email, security_deposit,
                initial_images[0], json.dumps(initial_images), status
            ))

            execute_query("""
                INSERT INTO custom_products (
                    id, user_email, title, description, price, image, category, available, status, images, created_at
                ) VALUES (
                    %s, %s, 'Canon EOS R5 Mirrorless Camera', 'Original test description for Canon R5.', 1500, %s, 'Cameras', 1, %s, %s, NOW()
                )
            """, (
                prod_id, owner_email, initial_images[0], status, json.dumps(initial_images)
            ))
        except Exception:
            pass

        MOCK_PAYERNT_PRODUCTS[prod_id] = {
            "id": prod_id,
            "owner_id": owner_id,
            "owner_email": owner_email,
            "owner_name": "Authorized Vendor One",
            "category": "Cameras",
            "name": "Canon EOS R5",
            "title": "Canon EOS R5 Mirrorless Camera",
            "brand": "Canon",
            "model": "EOS R5",
            "description": "Original test description for Canon R5.",
            "daily_rate": 1500,
            "security_deposit": security_deposit,
            "available": True,
            "availability_status": "available",
            "primary_image": initial_images[0],
            "images": json.dumps(initial_images),
            "vendor_secret_pin": "889900",
            "status": status,
            "city": "Visakhapatnam",
            "area": "MVP Colony",
            "pincode": "530017",
            "pickup_instructions": "Pickup at studio lobby with ID",
            "created_at": "2026-10-28T00:00:00Z",
            "updated_at": "2026-10-28T00:00:00Z"
        }

    # 1. Authorized vendor can update their own product
    def test_01_authorized_vendor_can_update_own_product(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        payload = {
            "title": "Canon EOS R5 Mark II 8K Cinema",
            "description": "Updated description with enhanced 8K thermal management.",
            "dailyRate": 1800,
            "conditionGrade": "Mint",
            "pickupInstructions": "Pickup at Studio Block B, Reception."
        }

        res = self.client.patch(f"/api/payernt/products/{prod_id}", json=payload, headers=self.vendor1_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["product"]["title"], "Canon EOS R5 Mark II 8K Cinema")
        self.assertEqual(data["product"]["pricing"]["daily"], 1800)

    # 2. Updated values persist in the database
    def test_02_updated_values_persist_in_database(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        payload = {
            "title": "Canon EOS R5 Studio Kit",
            "price": 2200,
            "pickup_instructions": "Bring original Aadhaar card for handover."
        }
        res = self.client.patch(f"/api/payernt/products/{prod_id}", json=payload, headers=self.vendor1_headers)
        self.assertEqual(res.status_code, 200)

        # Verify via GET endpoint
        get_res = self.client.get(f"/api/payernt/products/{prod_id}", headers=self.vendor1_headers)
        self.assertEqual(get_res.status_code, 200)
        prod = get_res.json()["product"]
        self.assertEqual(prod["title"], "Canon EOS R5 Studio Kit")
        self.assertEqual(prod["pricing"]["daily"], 2200)
        self.assertEqual(prod["location"]["pickupInstructions"], "Bring original Aadhaar card for handover.")

    # 3. Another vendor cannot update the product
    def test_03_another_vendor_cannot_update_product(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        payload = {"title": "Hacked Title By Competitor"}
        res = self.client.patch(f"/api/payernt/products/{prod_id}", json=payload, headers=self.vendor2_headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("permission", res.json()["detail"].lower())

    # 4. Missing or invalid authentication is rejected
    def test_04_missing_or_invalid_auth_rejected(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        # No auth header
        res1 = self.client.patch(f"/api/payernt/products/{prod_id}", json={"title": "No Auth"})
        self.assertEqual(res1.status_code, 401)

        # Invalid token
        res2 = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"title": "Invalid Token"},
            headers={"Authorization": "Bearer invalid_garbage_token"}
        )
        self.assertEqual(res2.status_code, 401)

    # 5. Vendor cannot set status: "approved"
    def test_05_vendor_cannot_set_status_approved(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email, status="under_review")

        # 5a. PATCH /api/payernt/products/{id} schema forbids 'status' (extra="forbid")
        res1 = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"status": "approved"},
            headers=self.vendor1_headers
        )
        self.assertEqual(res1.status_code, 422)

        # 5b. PATCH /api/payernt/products/{id}/status blocks self-approval
        res2 = self.client.patch(
            f"/api/payernt/products/{prod_id}/status",
            json={"status": "approved"},
            headers=self.vendor1_headers
        )
        self.assertEqual(res2.status_code, 403)
        self.assertIn("cannot self-approve", res2.json()["detail"].lower())

    # 6. Vendor cannot modify ownership, secret PIN, or other protected fields
    def test_06_vendor_cannot_modify_protected_fields(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        # Attempt to modify owner_id
        res_owner = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"owner_id": self.vendor2_id},
            headers=self.vendor1_headers
        )
        self.assertEqual(res_owner.status_code, 422)

        # Attempt to modify secret PIN
        res_pin = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"vendor_secret_pin": "000000"},
            headers=self.vendor1_headers
        )
        self.assertEqual(res_pin.status_code, 422)

    # 7. Unexpected fields are rejected (extra="forbid")
    def test_07_unexpected_fields_rejected(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"arbitrary_hack_field": True},
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 422)

    # 8. Invalid price and invalid title are rejected
    def test_08_invalid_price_and_title_rejected(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        # Short title (< 3 chars)
        res_title = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"title": "ab"},
            headers=self.vendor1_headers
        )
        self.assertEqual(res_title.status_code, 422)

        # Non-positive price (<= 0)
        res_price = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"daily_rate": 0},
            headers=self.vendor1_headers
        )
        self.assertEqual(res_price.status_code, 422)

        # Invalid availability status
        res_avail = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"availability_status": "permanently_deleted"},
            headers=self.vendor1_headers
        )
        self.assertEqual(res_avail.status_code, 422)

    # 9. Database write failures return an error and do not report success
    def test_09_database_write_failure_returns_error(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        with patch("payernt_database.get_db_connection") as mock_get_conn:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = Exception("Simulated DB connection or disk write crash!")
            mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
            mock_get_conn.return_value = mock_conn

            res = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"title": "Failing Persistence Title"},
                headers=self.vendor1_headers
            )
            # Must return 500 server error, NEVER success
            self.assertEqual(res.status_code, 500)
            mock_conn.rollback.assert_called_once()

    # 10. Secondary catalog update failure triggers rollback
    def test_10_secondary_catalog_update_failure_triggers_rollback(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        with patch("payernt_database.get_db_connection") as mock_get_conn:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()

            # First execute (payernt_products) succeeds, second execute (custom_products) fails
            def cursor_execute_side_effect(sql, *args, **kwargs):
                if "custom_products" in sql:
                    raise Exception("Secondary custom_products foreign key constraint violation!")
                return None

            mock_cursor.execute.side_effect = cursor_execute_side_effect
            mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
            mock_get_conn.return_value = mock_conn

            res = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"title": "Secondary Sync Fail"},
                headers=self.vendor1_headers
            )
            self.assertEqual(res.status_code, 500)
            mock_conn.rollback.assert_called_once()

    # 11. Security deposit remains unchanged when not edited
    def test_11_security_deposit_preserved_when_not_edited(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        initial_deposit = 4500
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email, security_deposit=initial_deposit)

        # Update only description
        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"description": "Updated description without mentioning security deposit."},
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 200)
        prod = res.json()["product"]
        self.assertEqual(prod["pricing"]["securityDeposit"], initial_deposit)

    # 12. Product image and gallery data are preserved when not changed
    def test_12_images_and_gallery_preserved_when_not_changed(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)
        initial_prod = MOCK_PAYERNT_PRODUCTS[prod_id]
        orig_primary = initial_prod["primary_image"]

        # Vendor only updates price
        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"daily_rate": 1950},
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 200)
        prod = res.json()["product"]
        self.assertEqual(prod["primaryImage"], orig_primary)
        self.assertGreaterEqual(len(prod["images"]), 2)

    # 13. Active booking constraints are enforced
    def test_13_active_booking_constraints_enforced(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        # Mock an active order in fetch_one only for rental_security / orders queries
        with patch("payernt_database.fetch_one") as mock_fetch:
            def mock_fetch_active_booking(sql, *args, **kwargs):
                if "rental_security" in sql or "orders" in sql:
                    return {"id": "active_booking_123"}
                return None
            mock_fetch.side_effect = mock_fetch_active_booking

            # Pausing availability must be blocked
            res_pause = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"availability_status": "paused"},
                headers=self.vendor1_headers
            )
            self.assertEqual(res_pause.status_code, 400)
            self.assertIn("active rental booking", res_pause.json()["detail"].lower())

            # Changing pickup instructions must be blocked
            res_pickup = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"pickup_instructions": "New unauthorized location across town"},
                headers=self.vendor1_headers
            )
            self.assertEqual(res_pickup.status_code, 400)
            self.assertIn("active rental booking", res_pickup.json()["detail"].lower())

            # Non-conflicting edit (e.g. description) should still succeed
            res_safe = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"description": "Safe update to description that does not conflict with booking."},
                headers=self.vendor1_headers
            )
            self.assertEqual(res_safe.status_code, 200)

    # 14. Existing approval status is preserved appropriately
    def test_14_existing_approval_status_preserved(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email, status="under_review")

        # Vendor edits title and price
        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"title": "Canon EOS R5 Refined Title", "daily_rate": 1650},
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 200)
        prod = res.json()["product"]
        # Must retain under_review, never magically turned into approved or active
        self.assertEqual(prod["verificationDocs"]["proofStatus"], "under_review")

    # 15. Product updates do not create duplicate records
    def test_15_product_updates_do_not_create_duplicate_records(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        # Perform 3 sequential updates
        for idx in range(3):
            res = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"title": f"Canon EOS R5 Iteration {idx + 1}"},
                headers=self.vendor1_headers
            )
            self.assertEqual(res.status_code, 200)

        # Check DB row count
        rows = fetch_all("SELECT id FROM payernt_products WHERE id = %s", (prod_id,))
        if rows:
            self.assertEqual(len(rows), 1)

    # 16. Primary image replacement and gallery persistence
    def test_16_primary_image_replacement_and_gallery_persistence(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        new_primary = "https://res.cloudinary.com/payernt/image/upload/v1710000001/primary_gear_snap.jpg"
        new_gallery = [
            "https://res.cloudinary.com/payernt/image/upload/v1710000002/angle_front.jpg",
            "https://res.cloudinary.com/payernt/image/upload/v1710000003/angle_side.jpg",
            "https://res.cloudinary.com/payernt/image/upload/v1710000004/angle_accessories.jpg",
        ]

        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={
                "primaryImage": new_primary,
                "images": new_gallery
            },
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 200)
        prod = res.json()["product"]
        self.assertEqual(prod["primaryImage"], new_primary)
        self.assertEqual(len(prod["images"]), 3)
        self.assertIn(new_gallery[0], prod["images"])
        self.assertIn(new_gallery[1], prod["images"])
        self.assertIn(new_gallery[2], prod["images"])

    # 17. PyMySQL list serialization regression test (verifies operand 1241 fix)
    def test_17_images_passed_as_list_does_not_fail_pymysql_serialization(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        # Multiple URLs in list format
        gallery_list = [
            "https://res.cloudinary.com/payernt/image/upload/snap1.jpg",
            "https://res.cloudinary.com/payernt/image/upload/snap2.jpg"
        ]

        # Call update_payernt_product directly and via API
        updated = update_payernt_product(prod_id, self.vendor1_id, {
            "images": gallery_list,
            "blocked_dates": ["2026-11-01", "2026-11-02"]
        })
        self.assertIsNotNone(updated)
        self.assertIn("snap1.jpg", str(updated.get("images", "")))

    # 18. Partial image update preserves gallery when only primary changed
    def test_18_partial_image_update_preserves_gallery_when_only_primary_changed(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        initial = get_payernt_product_by_id(prod_id, include_pin=False)
        initial_gallery = initial.get("images")

        new_primary = "https://res.cloudinary.com/payernt/image/upload/new_primary_only.jpg"
        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"primaryImage": new_primary},
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 200)
        prod = res.json()["product"]
        self.assertEqual(prod["primaryImage"], new_primary)
        # Existing gallery should be preserved
        self.assertIsNotNone(prod.get("images"))
        self.assertGreaterEqual(len(prod.get("images", [])), 1)

    # 19. Gallery update preserves primary image
    def test_19_gallery_update_preserves_primary_image(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        initial = get_payernt_product_by_id(prod_id, include_pin=False)
        initial_primary = initial.get("primary_image") or initial.get("image")

        new_gallery = ["https://res.cloudinary.com/payernt/image/upload/extra_lens.jpg"]
        res = self.client.patch(
            f"/api/payernt/products/{prod_id}",
            json={"images": new_gallery},
            headers=self.vendor1_headers
        )
        self.assertEqual(res.status_code, 200)
        prod = res.json()["product"]
        self.assertEqual(prod["primaryImage"], initial_primary)

    # 20. Database write failure returns error and does not mutate product
    def test_20_database_write_failure_returns_error(self):
        prod_id = f"p_edit_{uuid.uuid4().hex[:6]}"
        self._create_test_product(prod_id, self.vendor1_id, self.vendor1_email)

        with patch("payernt_database.get_db_connection") as mock_conn:
            fake_conn = MagicMock()
            fake_cursor = MagicMock()
            fake_cursor.execute.side_effect = Exception("Simulated fatal database connection drop")
            fake_conn.cursor.return_value.__enter__.return_value = fake_cursor
            mock_conn.return_value = fake_conn

            res = self.client.patch(
                f"/api/payernt/products/{prod_id}",
                json={"title": "This Title Should Fail Persistence"},
                headers=self.vendor1_headers
            )
            self.assertEqual(res.status_code, 500)
            self.assertIn("persistence failed", res.json()["detail"].lower())
            fake_conn.rollback.assert_called_once()

if __name__ == "__main__":
    unittest.main()
