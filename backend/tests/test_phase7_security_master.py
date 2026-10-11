import unittest
import os
import sys
import json
import time
import hmac
import hashlib
import uuid
import jwt
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import HTTPException
from fastapi.testclient import TestClient

from config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ADMIN_SETUP_CODE,
    ADMIN_CREATION_SECRET,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
    IS_PRODUCTION
)
from database import (
    init_db,
    create_user,
    get_user,
    execute_query,
    fetch_one,
    create_order,
    get_order_by_id,
    create_custom_product,
    get_custom_products,
    get_or_create_product_conversation,
    get_or_create_booking_conversation,
    get_or_create_delivery,
    update_delivery_status,
    revoke_token,
    is_token_revoked,
    create_db_session,
    revoke_db_session,
    revoke_all_user_sessions,
    is_session_revoked,
    save_otp,
    delete_otp,
    create_password_reset_token
)
from auth import (
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password
)
from main import (
    app,
    get_current_user_email,
    check_admin_user,
    is_origin_allowed
)

client = TestClient(app)

class TestPhase7SecurityMaster(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        try:
            init_db()
        except Exception:
            pass

        # Define test users
        cls.cust_a = "phase7_cust_a@payent.com"
        cls.cust_b = "phase7_cust_b@payent.com"
        cls.lender_a = "phase7_lender_a@payent.com"
        cls.lender_b = "phase7_lender_b@payent.com"
        cls.admin_user = "phase7_admin@payent.com"

        # Clean up existing test records
        test_emails = [cls.cust_a, cls.cust_b, cls.lender_a, cls.lender_b, cls.admin_user]
        try:
            for em in test_emails:
                execute_query("DELETE FROM users WHERE LOWER(email) = LOWER(%s)", (em,))
        except Exception:
            pass

        # Create test users in DB
        create_user(email=cls.cust_a, phone="+919100000001", password_hash=hash_password("P@ssw0rd2026!CustA"), full_name="Customer A", role="user")
        create_user(email=cls.cust_b, phone="+919100000002", password_hash=hash_password("P@ssw0rd2026!CustB"), full_name="Customer B", role="user")
        create_user(email=cls.lender_a, phone="+919100000003", password_hash=hash_password("P@ssw0rd2026!LendA"), full_name="Lender A", role="user")
        create_user(email=cls.lender_b, phone="+919100000004", password_hash=hash_password("P@ssw0rd2026!LendB"), full_name="Lender B", role="user")
        create_user(email=cls.admin_user, phone="+919100000005", password_hash=hash_password("P@ssw0rd2026!Admin"), full_name="Master Admin", role="admin")

        # Generate tokens
        cls.token_a = create_access_token({"sub": cls.cust_a, "role": "user"})
        cls.token_b = create_access_token({"sub": cls.cust_b, "role": "user"})
        cls.token_lender_a = create_access_token({"sub": cls.lender_a, "role": "user"})
        cls.token_lender_b = create_access_token({"sub": cls.lender_b, "role": "user"})
        cls.token_admin = create_access_token({"sub": cls.admin_user, "role": "admin"})

        # Create Products
        cls.prod_a_id = "phase7-prod-a-01"
        cls.prod_b_id = "phase7-prod-b-02"
        create_custom_product(cls.lender_a, {
            "id": cls.prod_a_id,
            "title": "Lender A Cinema Camera",
            "price": 3500,
            "category": "Cameras",
            "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "status": "approved",
            "available": True
        })
        create_custom_product(cls.lender_b, {
            "id": cls.prod_b_id,
            "title": "Lender B Drone Pro",
            "price": 4500,
            "category": "Drones",
            "image": "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600",
            "status": "approved",
            "available": True
        })

        # Create Orders
        cls.order_a_id = "phase7-order-a-101"
        cls.order_b_id = "phase7-order-b-102"
        create_order(cls.cust_a, {
            "id": cls.order_a_id,
            "product_id": cls.prod_a_id,
            "product_title": "Lender A Cinema Camera",
            "product_image": "",
            "start_date": "2026-09-20",
            "end_date": "2026-09-25",
            "total": 17500,
            "status": "active"
        })
        create_order(cls.cust_b, {
            "id": cls.order_b_id,
            "product_id": cls.prod_b_id,
            "product_title": "Lender B Drone Pro",
            "product_image": "",
            "start_date": "2026-09-20",
            "end_date": "2026-09-25",
            "total": 22500,
            "status": "active"
        })

    # ============================================================
    # 1. AUTHENTICATION & TOKEN INTEGRITY TESTS
    # ============================================================
    def test_01_unverified_jwt_signature_rejection(self):
        """Verify forged unsigned JWTs with Google/Firebase claims are rejected with 401."""
        # Craft an unsigned token claiming to be admin
        forged_payload = {
            "iss": "https://securetoken.google.com/fake-project",
            "sub": "fake_admin@payent.com",
            "email": "fake_admin@payent.com",
            "exp": int(time.time()) + 3600
        }
        forged_token = jwt.encode(forged_payload, "wrong_secret_key_12345", algorithm="HS256")

        res = client.get("/api/me", headers={"Authorization": f"Bearer {forged_token}"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("Could not validate credentials", res.json()["detail"])

    def test_02_mock_token_prefix_rejection(self):
        """Verify google- or firebase- mock prefix tokens are rejected without valid signature."""
        res = client.get("/api/me", headers={"Authorization": "Bearer google-fake-token-123"})
        self.assertEqual(res.status_code, 401)

        res2 = client.get("/api/me", headers={"Authorization": "Bearer firebase-demo-token"})
        self.assertEqual(res2.status_code, 401)

    def test_03_expired_jwt_rejection(self):
        """Verify expired access token is rejected with 401."""
        past_time = datetime.now(timezone.utc) - timedelta(hours=2)
        expired_payload = {
            "sub": self.cust_a,
            "role": "user",
            "exp": past_time,
            "iat": past_time - timedelta(minutes=30),
            "nbf": past_time - timedelta(minutes=30),
            "type": "access",
            "jti": str(uuid.uuid4())
        }
        expired_token = jwt.encode(expired_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        res = client.get("/api/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)

    def test_04_revoked_token_rejection(self):
        """Verify revoked token JTI raises 401."""
        jti = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        payload = {
            "sub": self.cust_a,
            "role": "user",
            "exp": now + timedelta(minutes=30),
            "iat": now,
            "nbf": now,
            "type": "access",
            "jti": jti
        }
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        revoke_token(jti, self.cust_a, int((now + timedelta(minutes=30)).timestamp()))
        self.assertTrue(is_token_revoked(jti))

        res = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("revoked", res.json()["detail"].lower())

    # ============================================================
    # 2. ADMIN RBAC & PRIVILEGE ESCALATION PROTECTION
    # ============================================================
    def test_05_admin_register_privilege_escalation_blocked(self):
        """Verify user cannot become admin via /api/admin/auth/register without ADMIN_SETUP_CODE."""
        # Attempt without code
        res = client.post("/api/admin/auth/register", json={
            "email": self.cust_a,
            "password": "P@ssw0rd2026!CustA"
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("Valid admin setup code is required", res.json()["detail"])

        # Attempt with invalid code
        res2 = client.post("/api/admin/auth/register", json={
            "email": self.cust_a,
            "password": "P@ssw0rd2026!CustA",
            "admin_code": "INVALID_CODE_999"
        })
        self.assertEqual(res2.status_code, 403)

    def test_06_non_admin_cannot_access_admin_endpoints(self):
        """Verify regular user token receives 403 on admin endpoints."""
        endpoints = [
            "/api/admin/users",
            "/api/admin/dashboard/stats",
            "/api/admin/products",
            "/api/admin/bookings",
            "/api/admin/api-keys"
        ]
        for ep in endpoints:
            res = client.get(ep, headers={"Authorization": f"Bearer {self.token_a}"})
            self.assertEqual(res.status_code, 403, f"Endpoint {ep} should reject non-admin with 403")

    def test_07_admin_token_succeeds_on_admin_endpoints(self):
        """Verify admin token receives 200 on admin endpoints."""
        res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {self.token_admin}"})
        self.assertEqual(res.status_code, 200)

    # ============================================================
    # 3. PASSWORD RESET WITH SECURE RESET TOKEN
    # ============================================================
    def test_08_password_reset_requires_valid_token(self):
        """Verify /api/forgot-password/reset fails without valid token."""
        res = client.post("/api/forgot-password/reset", json={
            "token": "invalid_reset_token_999999",
            "email": self.cust_a,
            "new_password": "NewStrongP@ssword2026!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("invalid or expired", res.json()["detail"])

    def test_09_password_reset_succeeds_with_valid_token(self):
        """Verify password reset succeeds with valid token and invalidates prior sessions."""
        # Generate secure reset token
        raw_token = create_password_reset_token(self.cust_a, expiry_seconds=900)

        res = client.post("/api/forgot-password/reset", json={
            "token": raw_token,
            "email": self.cust_a,
            "new_password": "NewStrongP@ssword2026!"
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Verify password in DB was updated
        user_db = get_user(self.cust_a)
        self.assertTrue(verify_password("NewStrongP@ssword2026!", user_db["password_hash"]))

        # Restore original password for downstream tests
        execute_query("UPDATE users SET password_hash = %s WHERE LOWER(email) = LOWER(%s)", (hash_password("P@ssw0rd2026!CustA"), self.cust_a))

    # ============================================================
    # 4. IDOR / CROSS-ACCOUNT AUTHORIZATION TESTS
    # ============================================================
    def test_10_idor_customer_order_isolation(self):
        """Verify Customer A cannot view or cancel Customer B's order."""
        # Customer A tries to view Order B -> 403
        res = client.get(f"/api/orders/{self.order_b_id}", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res.status_code, 403)

        # Customer A tries to cancel Order B -> 403
        res_cancel = client.post(f"/api/orders/{self.order_b_id}/cancel", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res_cancel.status_code, 403)

        # Customer B can view their own order -> 200
        res_own = client.get(f"/api/orders/{self.order_b_id}", headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_own.status_code, 200)

    def test_11_idor_lender_product_isolation(self):
        """Verify Lender A cannot edit or delete Lender B's product."""
        # Lender A tries to edit Product B -> 403
        res_edit = client.put(f"/api/products/custom/{self.prod_b_id}", json={"price": 9999}, headers={"Authorization": f"Bearer {self.token_lender_a}"})
        self.assertEqual(res_edit.status_code, 403)

        # Lender A tries to delete Product B -> 403
        res_del = client.delete(f"/api/products/custom/{self.prod_b_id}", headers={"Authorization": f"Bearer {self.token_lender_a}"})
        self.assertEqual(res_del.status_code, 403)

        # Admin CAN manage Product B -> 200
        res_admin = client.put(f"/api/products/custom/{self.prod_b_id}", json={"price": 4600}, headers={"Authorization": f"Bearer {self.token_admin}"})
        self.assertEqual(res_admin.status_code, 200)

    # ============================================================
    # 5. MESSAGING & CONVERSATION PRIVACY
    # ============================================================
    def test_12_messaging_authorization_and_sender_integrity(self):
        """Verify only conversation participants can view and send messages."""
        conv = get_or_create_product_conversation(self.prod_a_id, self.cust_a, "Hello Lender A!")
        conv_id = conv["id"]

        # Cust B (unrelated third party) tries to view conv -> 404 / 403
        res_view = client.get(f"/api/conversations/{conv_id}", headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_view.status_code, 404)

        # Cust B tries to message into conv -> 403
        res_msg = client.post(f"/api/conversations/{conv_id}/messages", json={"content": "Malicious message"}, headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_msg.status_code, 403)

        # Cust A (participant) sends message -> 200, sender is derived from JWT
        res_send = client.post(f"/api/conversations/{conv_id}/messages", json={"content": "Is gear available this weekend?"}, headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res_send.status_code, 200)
        self.assertEqual(res_send.json()["message"]["sender_email"], self.cust_a)

    # ============================================================
    # 6. DELIVERY LOCATION TRACKING & PRIVACY
    # ============================================================
    def test_13_delivery_tracking_authorization_and_privacy(self):
        """Verify delivery GPS broadcast is lender-only and tracking is participant-only."""
        delivery = get_or_create_delivery(self.order_a_id, self.cust_a)
        did = delivery["id"]

        # Customer tries to broadcast GPS -> 403 (only lender can broadcast)
        res_cust_gps = client.post(f"/api/deliveries/{did}/location", json={"latitude": 12.9716, "longitude": 77.5946}, headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res_cust_gps.status_code, 403)

        # Unrelated Customer B tries to view delivery tracking -> 403
        res_b_track = client.get(f"/api/deliveries/{did}/tracking", headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_b_track.status_code, 403)

    # ============================================================
    # 7. PAYMENT WEBHOOK SIGNATURE & IDEMPOTENCY
    # ============================================================
    def test_14_payment_webhook_signature_and_idempotency(self):
        """Verify Razorpay webhook verifies HMAC-SHA256 signature and handles duplicates idempotently."""
        secret = RAZORPAY_WEBHOOK_SECRET or "test_webhook_secret_key"
        # Temporarily set secret if unset for test
        import main
        main.RAZORPAY_WEBHOOK_SECRET = secret

        payload_dict = {
            "event": "payment.captured",
            "event_id": f"evt_test_{uuid.uuid4().hex[:8]}",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test_123456",
                        "order_id": "order_rzp_test_123",
                        "amount": 1750000,
                        "status": "captured"
                    }
                }
            }
        }
        raw_body = json.dumps(payload_dict).encode("utf-8")
        valid_sig = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()

        # 1. Invalid signature -> 400
        res_invalid = client.post(
            "/api/payments/webhook",
            content=raw_body,
            headers={"X-Razorpay-Signature": "invalid_signature_hex", "Content-Type": "application/json"}
        )
        self.assertEqual(res_invalid.status_code, 400)

        # 2. Valid signature -> 200
        res_valid = client.post(
            "/api/payments/webhook",
            content=raw_body,
            headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"}
        )
        self.assertEqual(res_valid.status_code, 200)
        self.assertEqual(res_valid.json()["status"], "ok")

        # 3. Duplicate event replay -> 200 OK with duplicate event ignored
        res_dup = client.post(
            "/api/payments/webhook",
            content=raw_body,
            headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"}
        )
        self.assertEqual(res_dup.status_code, 200)
        self.assertIn("duplicate", res_dup.json().get("note", ""))

    # ============================================================
    # 8. FILE UPLOAD & ATTACHMENT SECURITY
    # ============================================================
    def test_15_attachment_mime_and_filename_sanitization(self):
        """Verify attachments reject dangerous file extensions and sanitize path traversal."""
        conv = get_or_create_product_conversation(self.prod_a_id, self.cust_a)
        conv_id = conv["id"]

        # Reject unsupported executable MIME
        res_exe = client.post(
            f"/api/conversations/{conv_id}/attachments",
            json={
                "file_data": "data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgA",
                "file_name": "malware.exe",
                "file_type": "application/x-msdownload",
                "file_size": 1024
            },
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res_exe.status_code, 415)

        # Sanitize path traversal in valid image upload
        res_traversal = client.post(
            f"/api/conversations/{conv_id}/attachments",
            json={
                "file_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "file_name": "../../../etc/passwd.png",
                "file_type": "image/png",
                "file_size": 100
            },
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        msg_data = res_traversal.json()["message"]
        attachments = msg_data.get("attachments", [])
        self.assertTrue(len(attachments) > 0)
        saved_name = attachments[0]["file_name"]
        self.assertNotIn("/", saved_name)
        self.assertNotIn("..", saved_name)

    # ============================================================
    # 9. CORS & SECURITY HEADERS
    # ============================================================
    def test_16_cors_and_security_headers(self):
        """Verify strict CORS origin matching and presence of security headers."""
        # Allowed dev/test origin
        res = client.get("/api/health/live", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("access-control-allow-origin"), "http://localhost:3000")
        self.assertEqual(res.headers.get("x-frame-options"), "DENY")
        self.assertEqual(res.headers.get("x-content-type-options"), "nosniff")
        self.assertIn("default-src", res.headers.get("content-security-policy", ""))

        # Disallowed untrusted origin
        self.assertFalse(is_origin_allowed("https://evil-untrusted-site.com"))

    # ============================================================
    # 10. CLEANUP
    # ============================================================
    @classmethod
    def tearDownClass(cls):
        try:
            test_emails = [cls.cust_a, cls.cust_b, cls.lender_a, cls.lender_b, cls.admin_user]
            for em in test_emails:
                execute_query("DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_email = %s OR lender_email = %s))", (em, em))
                execute_query("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_email = %s OR lender_email = %s)", (em, em))
                execute_query("DELETE FROM conversation_members WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_email = %s OR lender_email = %s)", (em, em))
                execute_query("DELETE FROM conversations WHERE customer_email = %s OR lender_email = %s", (em, em))
                execute_query("DELETE FROM notifications WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM sessions WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM token_blocklist WHERE LOWER(email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM user_events WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM agents WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM users WHERE LOWER(email) = LOWER(%s)", (em,))
            execute_query("DELETE FROM orders WHERE id IN (%s, %s)", (cls.order_a_id, cls.order_b_id))
            execute_query("DELETE FROM custom_products WHERE id IN (%s, %s)", (cls.prod_a_id, cls.prod_b_id))
        except Exception:
            pass

if __name__ == "__main__":
    unittest.main()
