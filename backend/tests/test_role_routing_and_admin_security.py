"""
Focused test suite for:
- Two public login entry points (Payernt and Payrent) authenticating Admins
- Authoritative backend role detection
- Strict 403 gating of ordinary users from Admin endpoints
- Authoritative token revocation and logout session invalidation
"""
import sys
import os
import unittest
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import execute_query
from auth import hash_password
from config import ADMIN_SETUP_CODE

client = TestClient(app)

class TestRoleRoutingAndAdminSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        uid = uuid.uuid4().hex[:8]
        cls.admin_email = f"adm_role_{uid}@testauth.in"
        cls.customer_email = f"cust_role_{uid}@testauth.in"
        cls.password = "SecPassw0rd!2026"
        cls.pwd_hash = hash_password(cls.password)
        now_iso = "2026-10-25T12:00:00Z"

        # 1. Register admin via administrative endpoint with valid setup code
        res_admin = client.post("/api/admin/auth/register", json={
            "email": cls.admin_email,
            "password": cls.password,
            "fullName": "System Administrator",
            "adminCode": ADMIN_SETUP_CODE,
        })
        assert res_admin.status_code in (200, 201), f"Admin setup failed: {res_admin.text}"

        # 2. Register normal customer via unified user table
        execute_query("""
            INSERT INTO users (email, full_name, phone, password_hash, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 1, %s)
            ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), status = VALUES(status)
        """, (cls.customer_email, "Normal Customer", f"+9198{uid[:8]}", cls.pwd_hash, "customer", "active", now_iso))

    @classmethod
    def tearDownClass(cls):
        try:
            execute_query("DELETE FROM admin_accounts WHERE LOWER(email) = %s", (cls.admin_email,))
            execute_query("DELETE FROM users WHERE LOWER(email) IN (%s, %s)", (cls.admin_email, cls.customer_email))
            execute_query("DELETE FROM payernt_accounts WHERE LOWER(email) = %s", (cls.admin_email,))
        except Exception:
            pass

    def test_01_admin_login_via_payrent_entry_point(self):
        """Admin logs in through Payrent login (/api/auth/login) -> detected as admin."""
        res = client.post("/api/auth/login", json={
            "email": self.admin_email,
            "password": self.password,
        })
        self.assertEqual(res.status_code, 200, f"Payrent login for admin failed: {res.text}")
        data = res.json()
        self.assertIsNotNone(data.get("token"))
        self.assertIn(data.get("role"), ("admin", "superadmin"))
        self.assertIn(data.get("user", {}).get("role"), ("admin", "superadmin"))

        # Verify access to admin me endpoint
        me = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        self.assertEqual(me.status_code, 200, f"Admin /auth/me failed with Payrent token: {me.text}")
        self.assertIn(me.json().get("role"), ("admin", "superadmin"))

    def test_02_admin_login_via_payernt_entry_point(self):
        """Admin logs in through Payernt login (/api/payernt/auth/login) -> detected as admin."""
        res = client.post("/api/payernt/auth/login", json={
            "email": self.admin_email,
            "password": self.password,
        })
        self.assertEqual(res.status_code, 200, f"Payernt login for admin failed: {res.text}")
        data = res.json()
        self.assertIsNotNone(data.get("token"))
        self.assertIn(data.get("role"), ("admin", "superadmin"))
        self.assertIn(data.get("account", {}).get("role"), ("admin", "superadmin"))

        # Verify access to admin me endpoint
        me = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        self.assertEqual(me.status_code, 200, f"Admin /auth/me failed with Payernt token: {me.text}")
        self.assertIn(me.json().get("role"), ("admin", "superadmin"))

    def test_03_customer_denied_on_admin_endpoints(self):
        """Normal customer cannot access admin endpoints (403 Forbidden)."""
        res = client.post("/api/auth/login", json={
            "email": self.customer_email,
            "password": self.password,
        })
        self.assertEqual(res.status_code, 200, f"Customer login failed: {res.text}")
        cust_token = res.json()["token"]
        self.assertEqual(res.json().get("role"), "customer")

        # Attempt to access admin me endpoint
        me = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {cust_token}"})
        self.assertEqual(me.status_code, 403, f"Expected 403 Forbidden for customer, got {me.status_code}")

        # Attempt to access admin stats endpoint
        stats = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {cust_token}"})
        self.assertEqual(stats.status_code, 403, f"Expected 403 Forbidden for customer, got {stats.status_code}")

    def test_04_unauthenticated_request_denied(self):
        """Request without Authorization header is rejected with 401 Unauthorized."""
        me = client.get("/api/admin/auth/me")
        self.assertEqual(me.status_code, 401, f"Expected 401 Unauthorized, got {me.status_code}")

    def test_05_admin_logout_revokes_session(self):
        """Admin logout revokes token on server; subsequent requests return 401 Unauthorized."""
        login_res = client.post("/api/admin/auth/login", json={
            "email": self.admin_email,
            "password": self.password,
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["token"]

        # Verify token works initially
        before_logout = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(before_logout.status_code, 200)

        # Perform admin logout
        logout_res = client.post("/api/admin/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_res.status_code, 200)

        # Verify token is now revoked on the server
        after_logout = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(after_logout.status_code, 401, f"Expected 401 after logout, got {after_logout.status_code}")
