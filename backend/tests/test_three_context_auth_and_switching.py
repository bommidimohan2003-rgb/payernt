import sys
import os
import unittest
import uuid
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import execute_query
from config import ADMIN_SETUP_CODE

client = TestClient(app)

class TestThreeContextAuthAndSwitching(unittest.TestCase):
    """
    Validates complete three-context authentication architecture:
    1. Payernt (Lender / Vendor)
    2. Payrent (Renter / Customer)
    3. Admin (Administrator)
    
    Includes single active user-side session enforcement, credential independence,
    and strict route authorization boundaries.
    """

    @classmethod
    def setUpClass(cls):
        uid = uuid.uuid4().hex[:6]
        cls.person_name = "AuthTest Person"
        cls.person_phone = f"+9199{random.randint(10000000, 99999999)}"
        
        # Payernt Credentials
        cls.payernt_email = f"lender_{uid}@testauth.in"
        cls.payernt_password = "PayerntPass123!@#"

        # Payrent Credentials (different email and different password)
        cls.payrent_email = f"renter_{uid}@testauth.in"
        cls.payrent_password = "PayrentPass456!@#"

        # Admin Credentials
        cls.admin_email = f"admin_{uid}@testauth.in"
        cls.admin_password = "AdminPass789!@#"
        cls.admin_code = ADMIN_SETUP_CODE

    @classmethod
    def tearDownClass(cls):
        try:
            execute_query("DELETE FROM sessions WHERE user_email IN (%s, %s, %s)", 
                          (cls.payernt_email, cls.payrent_email, cls.admin_email))
            execute_query("DELETE FROM payernt_accounts WHERE email = %s", (cls.payernt_email,))
            execute_query("DELETE FROM users WHERE email IN (%s, %s)", (cls.payrent_email, cls.admin_email))
        except Exception:
            pass

    def test_01_create_payernt_and_payrent_independent_accounts(self):
        """Register Payernt and Payrent accounts with different credentials for the same person."""
        # Register Payernt
        res_payernt = client.post("/api/payernt/auth/register", json={
            "name": self.person_name,
            "email": self.payernt_email,
            "aadhaarNumber": "987654321098",
            "phoneNumber": self.person_phone,
            "address": "HiTech City, Hyderabad",
            "pincode": "500081",
            "password": self.payernt_password,
            "confirmPassword": self.payernt_password
        })
        assert res_payernt.status_code in (200, 201), f"Payernt registration failed: {res_payernt.text}"
        assert res_payernt.json().get("success") is True

        # Register Payrent
        res_payrent = client.post("/api/register", json={
            "full_name": self.person_name,
            "email": self.payrent_email,
            "pan_number": "ABCDE5678G",
            "phone": self.person_phone,
            "address": "HiTech City, Hyderabad",
            "pincode": "500081",
            "password": self.payrent_password,
            "otp": "DIRECT"
        })
        assert res_payrent.status_code in (200, 201), f"Payrent registration failed: {res_payrent.text}"

        # Register Admin
        res_admin = client.post("/api/admin/auth/register", json={
            "email": self.admin_email,
            "password": self.admin_password,
            "fullName": "Admin Tester",
            "adminCode": self.admin_code
        })
        assert res_admin.status_code in (200, 201), f"Admin registration failed: {res_admin.text}"

    def test_02_login_payernt_activates_payernt_only(self):
        """TEST CASE 1: Login Payernt -> Payernt active."""
        login_res = client.post("/api/payernt/auth/login", json={
            "email": self.payernt_email,
            "password": self.payernt_password
        })
        assert login_res.status_code == 200, f"Payernt login failed: {login_res.text}"
        data = login_res.json()
        assert data.get("accountType") == "paye₹nt"
        payernt_token = data.get("token")
        assert payernt_token is not None

        # Access Payernt me route with Payernt token
        me_res = client.get("/api/payernt/auth/me", headers={"Authorization": f"Bearer {payernt_token}"})
        assert me_res.status_code == 200, f"Payernt auth/me failed: {me_res.text}"

    def test_03_login_payrent_switches_session_and_revokes_payernt(self):
        """TEST CASE 2: While Payernt is active, login Payrent -> Payernt revoked, Payrent active."""
        # 1. Login to Payernt
        login_payernt = client.post("/api/payernt/auth/login", json={
            "email": self.payernt_email,
            "password": self.payernt_password
        })
        payernt_token = login_payernt.json()["token"]

        # 2. While Payernt is active, login to Payrent passing the old token in header
        login_payrent = client.post("/api/auth/login", json={
            "email": self.payrent_email,
            "password": self.payrent_password
        }, headers={"Authorization": f"Bearer {payernt_token}"})
        assert login_payrent.status_code == 200, f"Payrent login failed: {login_payrent.text}"
        payrent_token = login_payrent.json()["token"]

        # 3. Payrent token should access Payrent endpoints
        me_payrent = client.get("/api/auth/me", headers={"Authorization": f"Bearer {payrent_token}"})
        assert me_payrent.status_code == 200, f"Payrent auth/me failed: {me_payrent.text}"

        # 4. Old Payernt token should now be revoked (401 Unauthorized)
        me_payernt = client.get("/api/payernt/auth/me", headers={"Authorization": f"Bearer {payernt_token}"})
        assert me_payernt.status_code == 401, f"Expected 401 for revoked Payernt token, got: {me_payernt.status_code}"

    def test_04_login_payernt_switches_session_and_revokes_payrent(self):
        """TEST CASE 3: While Payrent is active, login Payernt -> Payrent revoked, Payernt active."""
        # 1. Login to Payrent
        login_payrent = client.post("/api/auth/login", json={
            "email": self.payrent_email,
            "password": self.payrent_password
        })
        payrent_token = login_payrent.json()["token"]

        # 2. While Payrent is active, login to Payernt passing the old token in header
        login_payernt = client.post("/api/payernt/auth/login", json={
            "email": self.payernt_email,
            "password": self.payernt_password
        }, headers={"Authorization": f"Bearer {payrent_token}"})
        assert login_payernt.status_code == 200, f"Payernt login failed: {login_payernt.text}"
        payernt_token = login_payernt.json()["token"]

        # 3. Payernt token should access Payernt endpoints
        me_payernt = client.get("/api/payernt/auth/me", headers={"Authorization": f"Bearer {payernt_token}"})
        assert me_payernt.status_code == 200, f"Payernt auth/me failed: {me_payernt.text}"

        # 4. Old Payrent token should now be revoked (401 Unauthorized)
        me_payrent = client.get("/api/auth/me", headers={"Authorization": f"Bearer {payrent_token}"})
        assert me_payrent.status_code == 401, f"Expected 401 for revoked Payrent token, got: {me_payrent.status_code}"

    def test_05_admin_login_and_privileges(self):
        """TEST CASE 4: Login Admin -> Admin active, independent session."""
        login_admin = client.post("/api/admin/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert login_admin.status_code == 200, f"Admin login failed: {login_admin.text}"
        admin_token = login_admin.json()["token"]

        # Admin me route
        admin_me = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_me.status_code == 200, f"Admin auth/me failed: {admin_me.text}"

    def test_06_payernt_token_denied_on_payrent_endpoints(self):
        """TEST CASE 5: Payernt token cannot access Payrent-only endpoints (403 Forbidden)."""
        login_payernt = client.post("/api/payernt/auth/login", json={
            "email": self.payernt_email,
            "password": self.payernt_password
        })
        payernt_token = login_payernt.json()["token"]

        res = client.get("/api/wishlist", headers={"Authorization": f"Bearer {payernt_token}"})
        assert res.status_code == 403, f"Expected 403 Forbidden, got: {res.status_code}"

    def test_07_payrent_token_denied_on_payernt_endpoints(self):
        """TEST CASE 6: Payrent token cannot access Payernt-only endpoints (403 Forbidden)."""
        login_payrent = client.post("/api/auth/login", json={
            "email": self.payrent_email,
            "password": self.payrent_password
        })
        payrent_token = login_payrent.json()["token"]

        res = client.get("/api/payernt/profile", headers={"Authorization": f"Bearer {payrent_token}"})
        assert res.status_code == 403, f"Expected 403 Forbidden, got: {res.status_code}"

    def test_08_payernt_token_denied_on_admin_endpoints(self):
        """TEST CASE 7: Payernt token cannot access Admin endpoints (403 Forbidden)."""
        login_payernt = client.post("/api/payernt/auth/login", json={
            "email": self.payernt_email,
            "password": self.payernt_password
        })
        payernt_token = login_payernt.json()["token"]

        res = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {payernt_token}"})
        assert res.status_code == 403, f"Expected 403 Forbidden, got: {res.status_code}"

    def test_09_payrent_token_denied_on_admin_endpoints(self):
        """TEST CASE 8: Payrent token cannot access Admin endpoints (403 Forbidden)."""
        login_payrent = client.post("/api/auth/login", json={
            "email": self.payrent_email,
            "password": self.payrent_password
        })
        payrent_token = login_payrent.json()["token"]

        res = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {payrent_token}"})
        assert res.status_code == 403, f"Expected 403 Forbidden, got: {res.status_code}"

    def test_10_check_registration_cross_account_relationship(self):
        """TEST CASE 11 & 12: Check registration detects existing person and checks target existence."""
        # 1. Check for Payrent when Payernt exists
        check_payrent = client.post("/api/auth/check-registration", json={
            "name": self.person_name,
            "email": self.payernt_email,
            "mobile": self.person_phone,
            "targetAccountType": "pay₹ent"
        })
        assert check_payrent.status_code == 200
        data = check_payrent.json()
        assert data.get("payerntExists") is True or data.get("paye₹ntExists") is True

        # 2. Check for Payernt when Payernt already exists -> targetAccountExists is True
        check_payernt_dup = client.post("/api/auth/check-registration", json={
            "name": self.person_name,
            "email": self.payernt_email,
            "mobile": self.person_phone,
            "targetAccountType": "paye₹nt"
        })
        assert check_payernt_dup.status_code == 200
        dup_data = check_payernt_dup.json()
        assert dup_data.get("targetAccountExists") is True
