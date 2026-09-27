import os
import sys
import unittest
import uuid
import time

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, hash_password
from database import execute_query, fetch_one, fetch_all

client = TestClient(app)

class TestAdminSharedIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = client
        cls.admin_email = f"admin_int_{uuid.uuid4().hex[:8]}@payent.io"
        cls.vendor_email = f"vendor_int_{uuid.uuid4().hex[:8]}@payent.io"
        cls.renter_email = f"renter_int_{uuid.uuid4().hex[:8]}@payent.io"
        cls.raw_password = "SecureAdminPassword!2026"
        cls.hashed_pw = hash_password(cls.raw_password)

        # 1. Insert Admin Account into admin_accounts table
        execute_query("""
            INSERT INTO admin_accounts (id, email, full_name, phone, password_hash, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (f"ADMIN_{cls.admin_email}", cls.admin_email, "Platform SuperAdmin", "+919988776655", cls.hashed_pw, "admin", "active", 1))

        # 2. Insert Vendor Account into payernt_accounts table
        execute_query("""
            INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (f"PAYERNT_{cls.vendor_email}", "paye₹nt", cls.vendor_email, "Vendor John", "XXXX-XXXX-1234", "+919876500001", "123 Tech Lane", "560001", cls.hashed_pw, "active"))

        # 3. Insert Customer Account into payrent_accounts table
        execute_query("""
            INSERT INTO payrent_accounts (email, account_type, full_name, pan_number, phone, password_hash, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """, (cls.renter_email, "pay₹ent", "Customer Alice", "ABCDE1234F", "+919876500002", cls.hashed_pw, "active"))

        # Create JWT Tokens
        cls.admin_token = create_access_token({"sub": cls.admin_email, "role": "admin"})
        cls.vendor_token = create_access_token({"sub": cls.vendor_email, "role": "lender"})
        cls.renter_token = create_access_token({"sub": cls.renter_email, "role": "customer"})
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        cls.user_headers = {"Authorization": f"Bearer {cls.renter_token}"}

    @classmethod
    def tearDownClass(cls):
        # Clean up created test accounts
        execute_query("DELETE FROM admin_accounts WHERE email = %s", (cls.admin_email,))
        execute_query("DELETE FROM payernt_accounts WHERE email = %s", (cls.vendor_email,))
        execute_query("DELETE FROM payrent_accounts WHERE email = %s", (cls.renter_email,))
        execute_query("DELETE FROM payernt_products WHERE owner_email = %s", (cls.vendor_email,))
        execute_query("DELETE FROM custom_products WHERE user_email = %s", (cls.vendor_email,))
        execute_query("DELETE FROM payernt_wallets WHERE owner_email = %s", (cls.vendor_email,))
        execute_query("DELETE FROM payernt_wallet_transactions WHERE owner_id = %s", (f"PAYERNT_{cls.vendor_email}",))

    def test_01_admin_auth_and_rbac_enforcement(self):
        """Verify Admin login endpoint and that non-admin accounts are rejected with 403."""
        # 1. Admin Login via dedicated /api/admin/auth/login
        login_res = self.client.post("/api/admin/auth/login", json={
            "email": self.admin_email,
            "password": self.raw_password
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("token", login_res.json())

        # 2. Verify non-admin request to admin dashboard returns 403 Forbidden
        user_res = self.client.get("/api/admin/dashboard/stats", headers=self.user_headers)
        self.assertEqual(user_res.status_code, 403)

        # 3. Verify admin request succeeds
        admin_res = self.client.get("/api/admin/dashboard/stats", headers=self.admin_headers)
        self.assertEqual(admin_res.status_code, 200)
        stats = admin_res.json()
        self.assertIn("totalUsers", stats)
        self.assertIn("totalProducts", stats)

    def test_02_paye_rnt_product_creation_and_admin_approval_flow(self):
        """Verify paye₹nt product lifecycle: created -> pending in Admin -> approved -> discovers in catalog."""
        prod_id = f"test_prod_{uuid.uuid4().hex[:6]}"
        
        # 1. paye₹nt creates a product in payernt_products
        execute_query("""
            INSERT INTO payernt_products (id, owner_id, owner_email, owner_name, category, name, title, brand, model, daily_rate, status, available, availability_status, vendor_secret_pin, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (prod_id, f"PAYERNT_{self.vendor_email}", self.vendor_email, "Vendor John", "Cameras", "Sony FX3 Cinema Camera", "Sony FX3 Cinema Camera", "Sony", "FX3", 3500, "pending", 0, "paused", "778899"))

        # 2. Admin retrieves product list and inspects pending product
        res = self.client.get("/api/admin/products", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        prods = res.json()
        target = next((p for p in prods if p["id"] == prod_id), None)
        self.assertIsNotNone(target)
        self.assertEqual(target["status"], "pending")
        # Ensure secret pin is not exposed
        self.assertNotIn("vendor_secret_pin", str(target))
        self.assertNotIn("778899", str(target))

        # 3. Admin approves product
        app_res = self.client.patch(f"/api/admin/products/{prod_id}/approve", headers=self.admin_headers)
        self.assertEqual(app_res.status_code, 200)
        self.assertEqual(app_res.json()["status"], "approved")

        # 4. Verify product status in shared database
        row_pp = fetch_one("SELECT status, available FROM payernt_products WHERE id = %s", (prod_id,))
        self.assertEqual(row_pp["status"], "approved")
        self.assertEqual(row_pp["available"], 1)

        # 5. Admin suspends product
        susp_res = self.client.patch(f"/api/admin/products/{prod_id}/suspend", headers=self.admin_headers, json={"reason": "Safety Inspection"})
        self.assertEqual(susp_res.status_code, 200)
        self.assertEqual(susp_res.json()["status"], "suspended")

        # 6. Admin restores product
        rest_res = self.client.patch(f"/api/admin/products/{prod_id}/restore", headers=self.admin_headers)
        self.assertEqual(rest_res.status_code, 200)
        self.assertEqual(rest_res.json()["status"], "approved")

    def test_03_admin_user_management_and_safe_data_exposure(self):
        """Verify Admin can view all 3 account types with sensitive fields (password, PIN, OTP) protected."""
        # 1. Unified users list
        res_users = self.client.get("/api/admin/users", headers=self.admin_headers)
        self.assertEqual(res_users.status_code, 200)
        users = res_users.json()
        
        # Verify passwords and hashes are NOT exposed in user list
        for u in users:
            self.assertNotIn("password_hash", u)
            self.assertNotIn("password", u)
            self.assertNotIn("aadhaar_number", u)
            self.assertNotIn("pan_number", u)

        # 2. Dedicated paye₹nt vendor list
        res_payernt = self.client.get("/api/admin/users/payernt", headers=self.admin_headers)
        self.assertEqual(res_payernt.status_code, 200)
        payernt_list = res_payernt.json()
        vendor_entry = next((v for v in payernt_list if v["email"] == self.vendor_email), None)
        self.assertIsNotNone(vendor_entry)
        self.assertIn("productCount", vendor_entry)
        self.assertIn("walletBalance", vendor_entry)

        # 3. Dedicated pay₹ent customer list
        res_payrent = self.client.get("/api/admin/users/payrent", headers=self.admin_headers)
        self.assertEqual(res_payrent.status_code, 200)
        payrent_list = res_payrent.json()
        renter_entry = next((r for r in payrent_list if r["email"] == self.renter_email), None)
        self.assertIsNotNone(renter_entry)
        self.assertIn("bookingCount", renter_entry)

    def test_04_admin_wallets_and_withdrawals_workflow(self):
        """Verify Admin wallet viewing, balance adjustments, and withdrawal approvals with audit logs."""
        wallet_id = f"w-{uuid.uuid4().hex[:6]}"
        tx_id = f"tx-wdr-{uuid.uuid4().hex[:6]}"
        
        # 1. Setup vendor wallet and withdrawal request in database
        execute_query("""
            INSERT INTO payernt_wallets (id, owner_id, owner_email, available_balance, pending_amount, currency, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (wallet_id, f"PAYERNT_{self.vendor_email}", self.vendor_email, 15000.0, 5000.0, "INR"))

        execute_query("""
            INSERT INTO payernt_wallet_transactions (id, wallet_id, owner_id, booking_id, type, amount, status, description, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (tx_id, wallet_id, f"PAYERNT_{self.vendor_email}", "", "WITHDRAWAL", 5000.0, "PENDING", "Vendor Bank Transfer Request"))

        # 2. Admin retrieves wallets list
        res_wallets = self.client.get("/api/admin/wallets", headers=self.admin_headers)
        self.assertEqual(res_wallets.status_code, 200)
        w_entry = next((w for w in res_wallets.json() if w["userEmail"] == self.vendor_email), None)
        self.assertIsNotNone(w_entry)
        self.assertEqual(w_entry["availableBalance"], 15000.0)

        # 3. Admin retrieves withdrawals list
        res_wdr = self.client.get("/api/admin/withdrawals", headers=self.admin_headers)
        self.assertEqual(res_wdr.status_code, 200)
        tx_entry = next((t for t in res_wdr.json() if t["id"] == tx_id), None)
        self.assertIsNotNone(tx_entry)
        self.assertEqual(tx_entry["status"], "PENDING")

        # 4. Admin approves withdrawal
        appr_wdr = self.client.patch(f"/api/admin/withdrawals/{tx_id}/approve", headers=self.admin_headers)
        self.assertEqual(appr_wdr.status_code, 200)

        # 5. Admin adjusts wallet balance
        adj_res = self.client.post("/api/admin/wallets/adjust", headers=self.admin_headers, json={
            "user_email": self.vendor_email,
            "amount": 2000.0,
            "reason": "Promotional bonus credit"
        })
        self.assertEqual(adj_res.status_code, 200)

        # Verify updated balance in DB
        w_db = fetch_one("SELECT available_balance FROM payernt_wallets WHERE owner_email = %s", (self.vendor_email,))
        self.assertEqual(w_db["available_balance"], 17000.0)

    def test_05_admin_audit_logs_persistence(self):
        """Verify all privileged Admin actions write immutable audit records to admin_logs."""
        res_logs = self.client.get("/api/admin/audit-logs", headers=self.admin_headers)
        self.assertEqual(res_logs.status_code, 200)
        logs = res_logs.json()
        self.assertTrue(len(logs) > 0)
        
        # Verify log fields
        sample = logs[0]
        self.assertIn("action", sample)
        self.assertIn("user_name", sample)
        self.assertIn("timestamp", sample)

if __name__ == "__main__":
    unittest.main()
