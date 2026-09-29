import unittest
import os
import sys
import time
import uuid
from unittest.mock import patch
from datetime import datetime as dt, timezone, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import (
    init_db,
    create_user,
    get_user,
    create_password_reset_token,
    get_password_reset_token_record,
    consume_password_reset_token,
    hash_reset_token,
    create_db_session,
    get_user_active_sessions,
    execute_query,
    clear_failed_auth_attempts,
    RATE_LIMIT_STORE
)
from auth import hash_password, verify_password
from email_service import (
    send_email_smtp,
    build_password_reset_email_html,
    build_password_reset_email_text,
    is_smtp_configured
)

class TestPasswordResetSecure(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        try:
            init_db()
        except Exception:
            pass
        RATE_LIMIT_STORE.clear()
        try:
            execute_query("DELETE FROM auth_rate_limits WHERE key_id LIKE %s", ("forgotpw%",))
        except Exception:
            pass
        cls.client = TestClient(app)

    def setUp(self):
        RATE_LIMIT_STORE.clear()
        try:
            execute_query("DELETE FROM auth_rate_limits WHERE key_id LIKE %s", ("forgotpw%",))
        except Exception:
            pass
        self.unique_id = uuid.uuid4().hex[:8]
        self.test_email = f"reset_test_{self.unique_id}@example.com"
        self.initial_password = "InitialPass123!"
        self.new_password = "NewStrongPass#2026"
        
        # Create test user
        create_user(
            email=self.test_email,
            phone=f"+9198765{self.unique_id[:5]}",
            password_hash=hash_password(self.initial_password),
            full_name="Password Reset Test User",
            role="customer"
        )

    def test_01_forgot_password_request_unregistered_email_safe(self):
        """Verify non-existent email returns clear account_found=False without token leakage."""
        resp_fake = self.client.post("/api/forgot-password/request", json={"email": "nonexistent_account_999@example.com"})
        self.assertEqual(resp_fake.status_code, 200)
        data_fake = resp_fake.json()
        self.assertFalse(data_fake.get("success"))
        self.assertFalse(data_fake.get("account_found"))
        self.assertNotIn("recovery_token", data_fake)
        self.assertNotIn("otp", data_fake)

    def test_02_forgot_password_request_registered_email_issues_token(self):
        """Verify registered email check in database immediately returns recovery_token for setting new password."""
        resp_real = self.client.post("/api/forgot-password/request", json={"email": self.test_email})
        self.assertEqual(resp_real.status_code, 200)
        data_real = resp_real.json()
        self.assertTrue(data_real.get("success"))
        self.assertTrue(data_real.get("account_found"))
        self.assertTrue(data_real.get("recovery_authorized"))
        self.assertIsNotNone(data_real.get("recovery_token"))
        self.assertIn("Account verified", data_real.get("message", ""))

    def test_03_forgot_password_full_cycle_without_email_wait(self):
        """Verify 3-step seamless password reset: email check -> token -> reset -> login."""
        # 1. Check email in DB
        resp_req = self.client.post("/api/forgot-password/request", json={"email": self.test_email})
        self.assertEqual(resp_req.status_code, 200)
        rec_token = resp_req.json().get("recovery_token")
        self.assertIsNotNone(rec_token)

        # 2. Reset password
        resp_reset = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": rec_token,
            "new_password": self.new_password,
            "email": self.test_email
        })
        self.assertEqual(resp_reset.status_code, 200)
        self.assertTrue(resp_reset.json().get("success"))

        # 3. Sign in with new password
        resp_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.new_password
        })
        self.assertEqual(resp_login.status_code, 200)
        self.assertIn("token", resp_login.json())

    def test_04_invalid_email_format_rejected(self):
        """Verify malformed email addresses are rejected with 422 Unprocessable Entity."""
        resp_bad = self.client.post("/api/forgot-password/request", json={"email": "not-an-email"})
        self.assertEqual(resp_bad.status_code, 422)

    def test_05_validate_token_lifecycle(self):
        """Verify valid token validates successfully, while invalid/tampered tokens are rejected."""
        raw_token = create_password_reset_token(self.test_email, expiry_seconds=900)
        self.assertIsNotNone(raw_token)

        # 1. Valid token
        resp = self.client.post("/api/forgot-password/validate-token", json={"token": raw_token})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("valid"))
        self.assertTrue(data.get("recovery_authorized"))
        self.assertEqual(data.get("email"), self.test_email)

        # 2. Tampered / invalid token
        resp_bad = self.client.post("/api/forgot-password/validate-token", json={"token": "tampered_token_xyz_123"})
        self.assertEqual(resp_bad.status_code, 400)
        self.assertIn("invalid or expired", resp_bad.json().get("detail", ""))

        # 3. Empty token
        resp_empty = self.client.post("/api/forgot-password/validate-token", json={"token": ""})
        self.assertEqual(resp_empty.status_code, 400)

    def test_06_expired_token_rejected(self):
        """Verify expired tokens are rejected."""
        # Create token with 0 second expiry
        raw_token = create_password_reset_token(self.test_email, expiry_seconds=-10)
        
        resp = self.client.post("/api/forgot-password/validate-token", json={"token": raw_token})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("invalid or expired", resp.json().get("detail", ""))

        # Reset attempt with expired token should also fail
        resp_reset = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": raw_token,
            "new_password": self.new_password,
            "email": self.test_email
        })
        self.assertEqual(resp_reset.status_code, 400)

    def test_07_successful_password_reset_and_login_transition(self):
        """Verify complete password reset: old password fails, new password allows login."""
        raw_token = create_password_reset_token(self.test_email, expiry_seconds=900)
        
        # Reset password
        resp = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": raw_token,
            "new_password": self.new_password,
            "email": self.test_email
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIn("Password updated successfully", data.get("message", ""))

        # Verify old password is now rejected
        resp_old_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.initial_password
        })
        self.assertEqual(resp_old_login.status_code, 401)

        # Verify new password succeeds
        resp_new_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.new_password
        })
        self.assertEqual(resp_new_login.status_code, 200)
        login_data = resp_new_login.json()
        self.assertIn("token", login_data)

    def test_08_single_use_atomicity_and_replay_rejection(self):
        """Verify token is consumed atomically and replay attempts are rejected."""
        raw_token = create_password_reset_token(self.test_email, expiry_seconds=900)

        # First use -> Success
        resp1 = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": raw_token,
            "new_password": self.new_password,
            "email": self.test_email
        })
        self.assertEqual(resp1.status_code, 200)

        # Second use -> Replay rejection
        resp2 = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": raw_token,
            "new_password": "AnotherPassword#2026",
            "email": self.test_email
        })
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("invalid or expired", resp2.json().get("detail", ""))

    def test_09_password_policy_enforcement_on_reset(self):
        """Verify password policy is enforced on the reset endpoint."""
        raw_token = create_password_reset_token(self.test_email, expiry_seconds=900)

        # Weak password (too short)
        resp = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": raw_token,
            "new_password": "short",
            "email": self.test_email
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("security rules", resp.json().get("detail", ""))

        # Token should NOT be consumed if validation failed
        rec = get_password_reset_token_record(raw_token)
        self.assertIsNotNone(rec)
        self.assertIsNone(rec.get("used_at"))

    def test_10_all_user_sessions_revoked_on_reset(self):
        """Verify active sessions are invalidated upon password reset."""
        expiry_iso = (dt.now(timezone.utc) + timedelta(hours=1)).isoformat()
        sess1 = create_db_session(
            session_id=f"sess1_{self.unique_id}",
            user_email=self.test_email,
            raw_refresh_token=f"refresh_token_1_{self.unique_id}",
            device_name="Chrome Mac",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
            expires_at_str=expiry_iso
        )
        sess2 = create_db_session(
            session_id=f"sess2_{self.unique_id}",
            user_email=self.test_email,
            raw_refresh_token=f"refresh_token_2_{self.unique_id}",
            device_name="Safari iPhone",
            ip_address="127.0.0.1",
            user_agent="Mozilla/5.0",
            expires_at_str=expiry_iso
        )

        raw_token = create_password_reset_token(self.test_email, expiry_seconds=900)
        
        # Reset password
        resp = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": raw_token,
            "new_password": self.new_password,
            "email": self.test_email
        })
        self.assertEqual(resp.status_code, 200)

        # Check that sessions are revoked
        active_sessions = get_user_active_sessions(self.test_email)
        self.assertEqual(len(active_sessions), 0)

    def test_11_no_magic_otp_bypass_accepted(self):
        """Verify magic values like DIRECT or empty strings are not accepted."""
        resp = self.client.post("/api/forgot-password/reset", json={
            "recovery_token": "DIRECT",
            "new_password": self.new_password,
            "email": self.test_email
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn("invalid or expired", resp.json().get("detail", ""))

if __name__ == "__main__":
    unittest.main()
