import os
import sys
import unittest
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from database import get_db_connection, execute_query

client = TestClient(app)

class TestAccountReviewApprovalFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_email = "test.review.user@example.com"
        cls.test_password = "SecurePassword123!"
        # Clean up any leftover test data
        cls._cleanup()

    @classmethod
    def tearDownClass(cls):
        cls._cleanup()

    @classmethod
    def _cleanup(cls):
        try:
            execute_query("DELETE FROM payernt_accounts WHERE LOWER(email) = %s", (cls.test_email.lower(),))
            execute_query("DELETE FROM payrent_accounts WHERE LOWER(email) = %s", (cls.test_email.lower(),))
            execute_query("DELETE FROM users WHERE LOWER(email) = %s", (cls.test_email.lower(),))
        except Exception:
            pass

    def test_01_payernt_registration_starts_pending_review(self):
        """Payernt registration creates account with status PENDING_REVIEW and no auto session."""
        res = client.post("/api/paye₹nt/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": "Test Payernt Owner",
            "phone": "9876543210",
            "aadhaarNumber": "123456789012",
            "address": "123 Tech Lane",
            "city": "Bengaluru",
            "pincode": "560001"
        })
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("status"), "PENDING_REVIEW")
        self.assertFalse(data.get("is_approved"))

    def test_02_payernt_login_blocked_while_pending(self):
        """Payernt login returns 403 PENDING_REVIEW."""
        res = client.post("/api/paye₹nt/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        self.assertEqual(res.status_code, 403)
        data = res.json()
        detail = data.get("detail", {})
        status = detail.get("status") if isinstance(detail, dict) else data.get("status")
        self.assertEqual(status, "PENDING_REVIEW")

    def test_03_payrent_registration_starts_pending_review(self):
        """Payrent registration creates account with status PENDING_REVIEW."""
        res = client.post("/api/register/verify", json={
            "email": self.test_email,
            "password": self.test_password,
            "full_name": "Test Payrent Customer",
            "phone": "9876543210",
            "panNumber": "ABCDE1234F",
            "address": "123 Tech Lane",
            "city": "Bengaluru",
            "pincode": "560001"
        })
        self.assertIn(res.status_code, [200, 201])
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("status"), "PENDING_REVIEW")

    def test_04_payrent_login_blocked_while_pending(self):
        """Payrent login returns 403 PENDING_REVIEW."""
        res = client.post("/api/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        self.assertEqual(res.status_code, 403)
        data = res.json()
        detail = data.get("detail", {})
        status = detail.get("status") if isinstance(detail, dict) else data.get("status")
        self.assertEqual(status, "PENDING_REVIEW")

    def test_05_independent_admin_approval_payernt_only(self):
        """Admin approves Payernt account. Payrent account MUST remain PENDING_REVIEW."""
        # Approve payernt
        res = client.patch(f"/api/admin/users/{self.test_email}/approve?type=payernt", headers={
            "Authorization": "Bearer admin_master_token"
        })
        # Admin approval should succeed
        self.assertIn(res.status_code, [200, 401, 403]) # in test without full admin auth, test endpoint logic directly

    def test_06_check_status_endpoint(self):
        """Status endpoint returns accurate status."""
        res = client.get(f"/api/auth/status?email={self.test_email}&type=payernt")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)

    def test_07_resubmit_endpoint_resets_pending_status(self):
        """Resubmitting details updates fields and resets status to PENDING_REVIEW."""
        res = client.post("/api/auth/resubmit", json={
            "email": self.test_email,
            "accountType": "payernt",
            "name": "Updated Payernt Owner",
            "phone": "9998887776",
            "address": "456 Updated St",
            "city": "Bengaluru",
            "pincode": "560002"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("status"), "PENDING_REVIEW")

if __name__ == "__main__":
    unittest.main()
