import unittest
import os
import sys
from datetime import datetime

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from fastapi.testclient import TestClient

from config import ADMIN_CREATION_SECRET, MYSQL_DB
from database import (
    init_db,
    create_user,
    get_user,
    execute_query,
    fetch_one,
    has_admin_user
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)
from main import app, check_admin_user, require_authenticated_user, require_admin

client = TestClient(app)

class TestAdminRBACAndDB(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        try:
            init_db()
        except Exception as e:
            print(f"init_db notice in test setup: {e}")

    def test_01_database_name_is_project_payentdb(self):
        """Verify database name is configured to project database."""
        self.assertIn(MYSQL_DB, ("project_payentdb", "payent_marketplace_db"))

    def test_02_create_admin_unauthorized_without_secret(self):
        """Verify POST /api/auth/create-admin fails without valid ADMIN_CREATION_SECRET."""
        res = client.post("/api/auth/create-admin", json={
            "name": "Attacker",
            "email": "attacker@example.com",
            "password": "StrongPassword123!",
            "secret": "wrong-secret"
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid or missing admin creation secret", res.json()["detail"])

    def test_03_create_admin_bootstrap_and_conflict(self):
        """Verify secure one-time admin creation and 409 conflict on duplicate attempt."""
        # Clean up existing test admin if present
        admin_test_email = "bootstrap_admin_test@payent.com"
        try:
            execute_query("DELETE FROM users WHERE LOWER(email) = LOWER(%s)", (admin_test_email,))
        except Exception:
            pass

        # Call create-admin endpoint with correct secret
        secret = ADMIN_CREATION_SECRET or "PAYENT-ADMIN-SECRET-2026"
        res = client.post("/api/auth/create-admin", json={
            "name": "Bootstrap Admin",
            "email": admin_test_email,
            "password": "StrongPassword123!",
            "secret": secret
        })
        
        # If an admin user already exists (seeded or previous test), it should return 409 Conflict
        # If no admin existed, it should return 201 Created
        self.assertIn(res.status_code, (201, 409))
        if res.status_code == 201:
            body = res.json()
            self.assertTrue(body["success"])
            self.assertEqual(body["user"]["role"], "ADMIN")

            # Verify user record stored in DB has hashed password and role = 'admin'
            user_in_db = fetch_one("SELECT * FROM users WHERE email = %s", (admin_test_email,))
            self.assertIsNotNone(user_in_db)
            self.assertIn("admin", user_in_db["role"].lower())
            self.assertTrue(verify_password("StrongPassword123!", user_in_db["password_hash"]))
            # Plaintext password MUST NOT exist as a database column
            self.assertNotIn("password", user_in_db)

        # Attempt to create another admin must return 409 Conflict
        res_duplicate = client.post("/api/auth/create-admin", json={
            "name": "Second Admin",
            "email": "second_admin@example.com",
            "password": "StrongPassword123!",
            "secret": secret
        })
        self.assertEqual(res_duplicate.status_code, 409)

    def test_04_rbac_admin_endpoint_protection(self):
        """Verify 401 Unauthorized for unauthenticated, 403 Forbidden for USER, and 200 OK for ADMIN."""
        reg_email = "regular_user_test@payent.com"
        admin_email = "admin_user_test@payent.com"

        create_user(email=reg_email, phone="+919000000010", password_hash=hash_password("UserPass123!"), full_name="Regular User", role="user")
        create_user(email=admin_email, phone="+919000000011", password_hash=hash_password("AdminPass123!"), full_name="Admin User", role="admin")

        user_token = create_access_token({"sub": reg_email, "role": "user"})
        admin_token = create_access_token({"sub": admin_email, "role": "admin"})

        # 1. Unauthenticated request -> 401 Unauthorized
        res_unauth = client.get("/api/admin/dashboard/stats")
        self.assertEqual(res_unauth.status_code, 401)

        # 2. Normal USER request -> 403 Forbidden
        res_user = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {user_token}"})
        self.assertEqual(res_user.status_code, 403)

        # 3. ADMIN request -> 200 OK
        res_admin = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_admin.status_code, 200)
        self.assertIn("totalUsers", res_admin.json())

    def test_05_tampered_frontend_role_fails_backend_check(self):
        """Verify that a user claiming role=admin in a forged payload is rejected if DB role is user."""
        fake_email = "fake_admin_user@payent.com"
        create_user(email=fake_email, phone="+919000000012", password_hash=hash_password("UserPass123!"), full_name="Fake Admin", role="user")

        # Create token with forged role="admin"
        forged_token = create_access_token({"sub": fake_email, "role": "admin"})

        # Backend checks DB role for fake_email (which is 'user') -> MUST return 403 Forbidden
        res = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {forged_token}"})
        self.assertEqual(res.status_code, 403)

    @classmethod
    def tearDownClass(cls):
        try:
            execute_query("DELETE FROM users WHERE email IN ('bootstrap_admin_test@payent.com', 'regular_user_test@payent.com', 'admin_user_test@payent.com', 'fake_admin_user@payent.com')")
        except Exception:
            pass

if __name__ == "__main__":
    unittest.main()
