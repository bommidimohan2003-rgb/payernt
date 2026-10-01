import os
import sys
import unittest
import uuid
import json

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, hash_password
from database import execute_query, fetch_one, fetch_all

client = TestClient(app)

class TestAdminProductReviewPricing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = client
        cls.admin_email = f"admin_rev_{uuid.uuid4().hex[:8]}@payent.io"
        cls.lender_email = f"lender_rev_{uuid.uuid4().hex[:8]}@payent.io"
        cls.customer_email = f"cust_rev_{uuid.uuid4().hex[:8]}@payent.io"
        cls.raw_password = "SecureAdminPassword!2026"
        cls.hashed_pw = hash_password(cls.raw_password)

        # 1. Admin Account
        execute_query("""
            INSERT INTO admin_accounts (id, email, full_name, phone, password_hash, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (f"ADMIN_{cls.admin_email}", cls.admin_email, "Admin Reviewer", "+919888877777", cls.hashed_pw, "admin", "active", 1))

        # 2. Lender Account
        execute_query("""
            INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (f"PAYERNT_{cls.lender_email}", "paye₹nt", cls.lender_email, "Tech Rentals LLC", "XXXX-XXXX-9999", "+919777766666", "404 Silicon Hub", "560001", cls.hashed_pw, "active"))

        # JWT Tokens
        cls.admin_token = create_access_token({"sub": cls.admin_email, "role": "admin"})
        cls.lender_token = create_access_token({"sub": cls.lender_email, "role": "lender"})
        cls.customer_token = create_access_token({"sub": cls.customer_email, "role": "customer"})

        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        cls.lender_headers = {"Authorization": f"Bearer {cls.lender_token}"}
        cls.customer_headers = {"Authorization": f"Bearer {cls.customer_token}"}

    @classmethod
    def tearDownClass(cls):
        execute_query("DELETE FROM admin_accounts WHERE email = %s", (cls.admin_email,))
        execute_query("DELETE FROM payernt_accounts WHERE email = %s", (cls.lender_email,))
        execute_query("DELETE FROM payernt_products WHERE owner_email = %s", (cls.lender_email,))
        execute_query("DELETE FROM custom_products WHERE user_email = %s", (cls.lender_email,))

    def test_01_product_review_details_fetch(self):
        """Verify Admin can inspect the COMPLETE product with all lender specs, condition, and location."""
        prod_id = f"rev_prod_{uuid.uuid4().hex[:6]}"
        specs = {"Sensor": "Full Frame 33MP", "Mount": "Sony E", "Weight": "658g", "Resolution": "4K 60p"}
        cond = {"grade": "Like New", "scratches": "None", "opticalGlass": "Clean", "accessories": ["2x Battery", "Charger", "Strap"]}

        execute_query("""
            INSERT INTO payernt_products (
                id, owner_id, owner_email, owner_name, category, name, title, brand, model, year,
                description, specifications, condition_grade, condition_details, accessories,
                city, area, pincode, pickup_instructions, daily_rate, status, available,
                primary_image, images, video_url, vendor_secret_pin, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (
            prod_id, f"PAYERNT_{self.lender_email}", self.lender_email, "Tech Rentals LLC", "Cameras",
            "Sony A7 IV Mirrorless Camera", "Sony A7 IV Mirrorless Camera", "Sony", "A7 IV", "2023",
            "Professional hybrid mirrorless camera for photos and 4K cinema video.",
            json.dumps(specs), "Like New", json.dumps(cond), "2x Battery, Dual Charger, 128GB V90 Card",
            "Bengaluru", "Indiranagar", "560038", "ID verification required at studio pickup.",
            0, "pending_admin_review", 0,
            "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
            json.dumps(["https://images.unsplash.com/photo-1516035069371-29a1b244cc32", "https://images.unsplash.com/photo-1502920917128-1aa500764cbd"]),
            "https://assets.mixkit.co/videos/preview/mixkit-camera-zoom-lens-focusing-41551-large.mp4",
            "112233"
        ))

        # Admin fetches details
        res = self.client.get(f"/api/admin/products/{prod_id}", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        p = res.json()
        self.assertEqual(p["id"], prod_id)
        self.assertEqual(p["brand"], "Sony")
        self.assertEqual(p["model"], "A7 IV")
        self.assertEqual(p["category"], "Cameras")
        self.assertEqual(p["specifications"]["Sensor"], "Full Frame 33MP")
        self.assertEqual(p["conditionGrade"], "Like New")
        self.assertEqual(p["videoUrl"], "https://assets.mixkit.co/videos/preview/mixkit-camera-zoom-lens-focusing-41551-large.mp4")
        self.assertEqual(p["city"], "Bengaluru")
        self.assertEqual(p["owner"]["email"], self.lender_email)
        self.assertEqual(p["priceStatus"], "NOT_SET")

    def test_02_price_range_validation_and_persistence(self):
        """Verify Admin price range entry: validation rules, saving, and history audit."""
        prod_id = f"rev_prod_{uuid.uuid4().hex[:6]}"
        execute_query("""
            INSERT INTO payernt_products (id, owner_id, owner_email, owner_name, category, name, title, brand, model, daily_rate, status, available, vendor_secret_pin, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (prod_id, f"PAYERNT_{self.lender_email}", self.lender_email, "Tech Rentals LLC", "Lenses", "Sony 24-70mm GM II", "Sony 24-70mm GM II", "Sony", "FE 24-70mm", 0, "pending_admin_review", 0, "445566"))

        # 1. Negative minimum price rejected
        res_neg = self.client.post(f"/api/admin/products/{prod_id}/price-range", headers=self.admin_headers, json={
            "minPrice": -100,
            "maxPrice": 1500,
            "priceUnit": "PER DAY"
        })
        self.assertEqual(res_neg.status_code, 400)

        # 2. Inverted range (min > max) rejected
        res_inv = self.client.post(f"/api/admin/products/{prod_id}/price-range", headers=self.admin_headers, json={
            "minPrice": 2000,
            "maxPrice": 1200,
            "priceUnit": "PER DAY"
        })
        self.assertEqual(res_inv.status_code, 400)

        # 3. Non-admin unauthorized
        res_unauth = self.client.post(f"/api/admin/products/{prod_id}/price-range", headers=self.customer_headers, json={
            "minPrice": 800,
            "maxPrice": 1400,
            "priceUnit": "PER DAY"
        })
        self.assertEqual(res_unauth.status_code, 403)

        # 4. Valid price range save
        res_save = self.client.post(f"/api/admin/products/{prod_id}/price-range", headers=self.admin_headers, json={
            "minPrice": 800,
            "maxPrice": 1400,
            "priceUnit": "PER DAY"
        })
        self.assertEqual(res_save.status_code, 200)
        saved = res_save.json()
        self.assertIsNotNone(saved.get("approvedPriceRange"))
        self.assertEqual(saved["approvedPriceRange"]["minPrice"], 800.0)
        self.assertEqual(saved["approvedPriceRange"]["maxPrice"], 1400.0)
        self.assertEqual(saved["approvedPriceRange"]["priceUnit"], "PER DAY")
        self.assertEqual(saved["priceStatus"], "SET")

        # 5. Edit price range & verify history
        res_edit = self.client.post(f"/api/admin/products/{prod_id}/price-range", headers=self.admin_headers, json={
            "minPrice": 950,
            "maxPrice": 1600,
            "priceUnit": "PER DAY"
        })
        self.assertEqual(res_edit.status_code, 200)
        edited = res_edit.json()
        self.assertEqual(edited["approvedPriceRange"]["minPrice"], 950.0)
        self.assertEqual(edited["approvedPriceRange"]["maxPrice"], 1600.0)
        self.assertTrue(len(edited["priceHistory"]) >= 1)
        self.assertEqual(edited["priceHistory"][0]["previousMin"], 800.0)
        self.assertEqual(edited["priceHistory"][0]["newMin"], 950.0)

    def test_03_approval_and_revision_workflows(self):
        """Verify Admin Approval (with price range requirement) and Revision Request."""
        prod_id = f"rev_prod_{uuid.uuid4().hex[:6]}"
        execute_query("""
            INSERT INTO payernt_products (id, owner_id, owner_email, owner_name, category, name, title, brand, model, daily_rate, status, available, vendor_secret_pin, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (prod_id, f"PAYERNT_{self.lender_email}", self.lender_email, "Tech Rentals LLC", "Audio", "Sennheiser MKH 416", "Sennheiser MKH 416", "Sennheiser", "MKH 416", 0, "pending_admin_review", 0, "778899"))

        # 1. Request Revision
        res_rev = self.client.post(f"/api/admin/products/{prod_id}/request-revision", headers=self.admin_headers, json={
            "reason": "Serial number sticker not visible in photo 2",
            "requiredChanges": "Please upload a clear photo showing serial number and rear connector."
        })
        self.assertEqual(res_rev.status_code, 200)
        rev_prod = res_rev.json()
        self.assertEqual(rev_prod["status"], "revision_required")
        self.assertIn("Serial number sticker", str(rev_prod.get("revisionNotes", {})))

        # 2. Approve product after setting price range
        res_appr = self.client.post(f"/api/admin/products/{prod_id}/approve", headers=self.admin_headers, json={
            "minPrice": 500,
            "maxPrice": 900,
            "priceUnit": "PER DAY"
        })
        self.assertEqual(res_appr.status_code, 200)
        appr_prod = res_appr.json()
        self.assertEqual(appr_prod["status"], "approved")
        self.assertEqual(appr_prod["available"], True)
        self.assertEqual(appr_prod["approvedPriceRange"]["minPrice"], 500.0)
        self.assertEqual(appr_prod["approvedPriceRange"]["maxPrice"], 900.0)

if __name__ == "__main__":
    unittest.main()
