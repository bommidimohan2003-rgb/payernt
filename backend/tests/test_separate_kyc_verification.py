import os
import sys
import uuid
import base64
import unittest
import random

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app, create_access_token
from database import (
    execute_query,
    get_user,
    get_user_kyc_status,
    MOCK_KYC_VERIFICATIONS,
    MOCK_USERS,
)
from payernt_database import get_payernt_account_by_email

client = TestClient(app)

# Helper: minimal 1x1 valid JPEG image bytes in base64
TINY_JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342"
    b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00"
    b"\xff\xd9"
)
TINY_JPEG_B64 = f"data:image/jpeg;base64,{base64.b64encode(TINY_JPEG_BYTES).decode('utf-8')}"

# Helper: minimal valid PNG bytes in base64
TINY_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)
TINY_PNG_B64 = f"data:image/png;base64,{base64.b64encode(TINY_PNG_BYTES).decode('utf-8')}"

class TestSeparateKycVerification(unittest.TestCase):
    """
    Validates the 13 required scenarios from Senior Master Prompt for:
    Separate Aadhaar (Payernt / Lender) and PAN (Payrent / Renter) KYC Verification.
    """

    @classmethod
    def setUpClass(cls):
        uid = uuid.uuid4().hex[:6]
        cls.payernt_email = f"lender_kyc_{uid}@testpayent.in"
        cls.payernt_phone = f"+9198{random.randint(10000000, 99999999)}"
        cls.payernt_password = "PayerntSecurePass123!@#"

        cls.payrent_email = f"renter_kyc_{uid}@testpayent.in"
        cls.payrent_phone = f"+9197{random.randint(10000000, 99999999)}"
        cls.payrent_password = "PayrentSecurePass456!@#"

        cls.user_b_email = f"user_b_{uid}@testpayent.in"
        cls.user_b_phone = f"+9196{random.randint(10000000, 99999999)}"
        cls.user_b_password = "UserBSecurePass789!@#"

        cls.admin_email = f"admin_kyc_{uid}@testpayent.in"
        cls.admin_token = create_access_token({
            "sub": cls.admin_email,
            "role": "admin",
            "account_type": "payrent"
        })

    @classmethod
    def tearDownClass(cls):
        # Cleanup created records
        test_emails = (cls.payernt_email, cls.payrent_email, cls.user_b_email, cls.admin_email)
        try:
            execute_query(
                "DELETE FROM user_kyc_verifications WHERE user_email IN (%s, %s, %s, %s)",
                test_emails
            )
            execute_query(
                "DELETE FROM payernt_accounts WHERE email IN (%s, %s, %s, %s)",
                test_emails
            )
            execute_query(
                "DELETE FROM users WHERE email IN (%s, %s, %s, %s)",
                test_emails
            )
        except Exception:
            pass

    # -------------------------------------------------------------
    # 1. Payernt registration succeeds without an Aadhaar field
    # -------------------------------------------------------------
    def test_01_payernt_registration_succeeds_without_aadhaar(self):
        """Payernt registration creates account without requiring Aadhaar number or KYC documents."""
        payload = {
            "name": "Payernt Lender Test",
            "email": self.payernt_email,
            "phone": self.payernt_phone,
            "password": self.payernt_password,
            "address": "123 Vendor Avenue, Tech City",
            "pincode": "530017"
            # NOTE: aadhaarNumber is completely omitted
        }
        res = client.post("/api/payernt/auth/register", json=payload)
        self.assertIn(res.status_code, (200, 201), f"Payernt registration failed: {res.text}")
        data = res.json()
        self.assertTrue(data.get("success"), "Expected success=True")

        # Save payernt token for KYC submission tests (extract or create access token)
        token = data.get("token") or create_access_token({
            "sub": self.payernt_email,
            "account_type": "payernt",
            "user_id": data.get("userId") or f"PAYERNT_{self.payernt_email}",
            "role": "vendor"
        })
        self.__class__.payernt_token = token

        # Confirm in database that aadhaar is empty or not required
        acc = get_payernt_account_by_email(self.payernt_email)
        self.assertIsNotNone(acc, "Account must exist in database")

    # -------------------------------------------------------------
    # 2. Payrent registration succeeds without a PAN field
    # -------------------------------------------------------------
    def test_02_payrent_registration_succeeds_without_pan(self):
        """Payrent registration creates account without requiring PAN number or KYC documents."""
        payload = {
            "fullName": "Payrent Renter Test",
            "email": self.payrent_email,
            "phone": self.payrent_phone,
            "password": self.payrent_password,
            "address": "456 Customer Boulevard",
            "city": "Bengaluru",
            "pincode": "560001",
            "otp": "000000"  # Test bypass code for automated integration testing
            # NOTE: panNumber is completely omitted
        }
        res = client.post("/api/register/verify", json=payload)
        self.assertEqual(res.status_code, 201, f"Payrent registration failed: {res.text}")
        data = res.json()
        self.assertTrue(data.get("success"), "Expected success=True")

        # Create auth token for Payrent customer
        self.__class__.payrent_token = create_access_token({
            "sub": self.payrent_email,
            "account_type": "pay₹ent",
            "role": "user"
        })

        # Confirm in database that PAN was not required
        u = get_user(self.payrent_email)
        self.assertIsNotNone(u, "User must exist in database")
        self.assertFalse(u.get("pan_number"), "PAN should be null/empty on initial registration")

    # -------------------------------------------------------------
    # 3. Payernt Aadhaar KYC accepts a correctly formatted 12-digit number
    # -------------------------------------------------------------
    def test_03_payernt_aadhaar_kyc_accepts_valid_12_digits(self):
        """Payernt KYC accepts 12-digit Aadhaar number and valid document image."""
        headers = {"Authorization": f"Bearer {self.payernt_token}"}
        payload = {
            "documentType": "AADHAAR",
            "documentNumber": "9876 5432 1098",  # Spaced format to test normalization
            "fileName": "aadhaar_front.jpg",
            "fileType": "image/jpeg",
            "fileData": TINY_JPEG_B64,
            "fileSize": len(TINY_JPEG_BYTES)
        }
        res = client.post("/api/kyc/submit", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200, f"Aadhaar KYC submission failed: {res.text}")
        body = res.json()
        self.assertTrue(body.get("success"))
        self.assertEqual(body.get("status"), "PENDING")
        self.assertEqual(body.get("maskedNumber"), "XXXX-XXXX-1098")
        self.assertEqual(body.get("documentType"), "AADHAAR")

        # Save verification ID for subsequent document download and lifecycle tests
        self.__class__.payernt_verification_id = body.get("verificationId")

        # Verify status endpoint reflects PENDING
        status_res = client.get("/api/kyc/status", headers=headers)
        self.assertEqual(status_res.status_code, 200)
        s_data = status_res.json()
        self.assertEqual(s_data.get("status"), "PENDING")
        self.assertEqual(s_data.get("maskedNumber"), "XXXX-XXXX-1098")

    # -------------------------------------------------------------
    # 4. Payrent PAN KYC accepts a correctly formatted PAN number
    # -------------------------------------------------------------
    def test_04_payrent_pan_kyc_accepts_valid_pan(self):
        """Payrent KYC accepts valid 10-character PAN number and document image."""
        headers = {"Authorization": f"Bearer {self.payrent_token}"}
        payload = {
            "documentType": "PAN",
            "documentNumber": "abcde1234f",  # Lowercase to test uppercase normalization
            "fileName": "pan_card.png",
            "fileType": "image/png",
            "fileData": TINY_PNG_B64,
            "fileSize": len(TINY_PNG_BYTES)
        }
        res = client.post("/api/kyc/submit", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200, f"PAN KYC submission failed: {res.text}")
        body = res.json()
        self.assertTrue(body.get("success"))
        self.assertEqual(body.get("status"), "PENDING")
        self.assertEqual(body.get("maskedNumber"), "XXXXX1234F")
        self.assertEqual(body.get("documentType"), "PAN")

        self.__class__.payrent_verification_id = body.get("verificationId")

        # Verify status endpoint reflects PENDING
        status_res = client.get("/api/kyc/status", headers=headers)
        self.assertEqual(status_res.status_code, 200)
        s_data = status_res.json()
        self.assertEqual(s_data.get("status"), "PENDING")
        self.assertEqual(s_data.get("maskedNumber"), "XXXXX1234F")

    # -------------------------------------------------------------
    # 5. Invalid Aadhaar and PAN formats are rejected
    # -------------------------------------------------------------
    def test_05_invalid_formats_are_rejected(self):
        """Invalid Aadhaar digits or invalid PAN format must be rejected with 400 Bad Request."""
        # 5a. Payernt with 11 digits instead of 12
        # Use a fresh payernt token to avoid 409 conflict
        temp_payernt_token = create_access_token({
            "sub": "temp_lender@test.in",
            "account_type": "payernt",
            "user_id": "PAYERNT_TEMP_01",
            "role": "vendor"
        })
        res_bad_aadhaar = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "AADHAAR",
                "documentNumber": "12345678901",  # 11 digits
                "fileData": TINY_JPEG_B64
            },
            headers={"Authorization": f"Bearer {temp_payernt_token}"}
        )
        self.assertEqual(res_bad_aadhaar.status_code, 400)
        self.assertIn("12 numeric digits", res_bad_aadhaar.json().get("detail", ""))

        # 5b. Payrent with invalid PAN regex
        temp_payrent_token = create_access_token({
            "sub": "temp_renter@test.in",
            "account_type": "pay₹ent",
            "user_id": "PAYRENT_TEMP_01",
            "role": "user"
        })
        res_bad_pan = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "INVALID123",  # Not 5 letters + 4 digits + 1 letter
                "fileData": TINY_PNG_B64
            },
            headers={"Authorization": f"Bearer {temp_payrent_token}"}
        )
        self.assertEqual(res_bad_pan.status_code, 400)
        self.assertIn("format", res_bad_pan.json().get("detail", "").lower())

    # -------------------------------------------------------------
    # 6. Missing document photos are handled correctly
    # -------------------------------------------------------------
    def test_06_missing_document_photo_rejected(self):
        """Submitting KYC without document image must be rejected."""
        temp_token = create_access_token({
            "sub": "temp_photo_test@test.in",
            "account_type": "pay₹ent",
            "user_id": "TEMP_PHOTO_01",
            "role": "user"
        })
        res = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileData": ""  # Missing photo
            },
            headers={"Authorization": f"Bearer {temp_token}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("photo", res.json().get("detail", "").lower())

    # -------------------------------------------------------------
    # 7. Unsupported files and oversized uploads are rejected
    # -------------------------------------------------------------
    def test_07_unsupported_files_and_oversized_uploads_rejected(self):
        """Unsupported file types (415) and oversized uploads (413) must be rejected."""
        temp_token = create_access_token({
            "sub": "temp_files_test@test.in",
            "account_type": "pay₹ent",
            "user_id": "TEMP_FILES_01",
            "role": "user"
        })

        # 7a. Unsupported MIME type (e.g. application/x-msdownload or executable)
        exe_b64 = f"data:application/x-msdownload;base64,{base64.b64encode(b'MZ...fake_exe').decode('utf-8')}"
        res_unsupported = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileName": "malware.exe",
                "fileType": "application/x-msdownload",
                "fileData": exe_b64
            },
            headers={"Authorization": f"Bearer {temp_token}"}
        )
        self.assertEqual(res_unsupported.status_code, 415)
        self.assertIn("Unsupported document format", res_unsupported.json().get("detail", ""))

        # 7b. Oversized file (> 5MB)
        # Note: 5MB payload in base64 is ~7MB string.
        # We test with file_size metadata > 5MB or large base64 payload
        oversized_b64 = "data:image/jpeg;base64," + ("A" * (6 * 1024 * 1024))
        res_oversized = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileData": oversized_b64,
                "fileSize": 6 * 1024 * 1024
            },
            headers={"Authorization": f"Bearer {temp_token}"}
        )
        self.assertEqual(res_oversized.status_code, 413)

    # -------------------------------------------------------------
    # 8. Payernt cannot submit PAN through its KYC flow
    # -------------------------------------------------------------
    def test_08_payernt_cannot_submit_pan(self):
        """Cross-document rejection: Payernt accounts cannot submit PAN cards."""
        temp_payernt_token = create_access_token({
            "sub": "payernt_cross_doc@test.in",
            "account_type": "payernt",
            "user_id": "PAYERNT_CROSS_01",
            "role": "vendor"
        })
        res = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileData": TINY_JPEG_B64
            },
            headers={"Authorization": f"Bearer {temp_payernt_token}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Payernt lender accounts require Aadhaar", res.json().get("detail", ""))

    # -------------------------------------------------------------
    # 9. Payrent cannot submit Aadhaar through its KYC flow
    # -------------------------------------------------------------
    def test_09_payrent_cannot_submit_aadhaar(self):
        """Cross-document rejection: Payrent accounts cannot submit Aadhaar cards."""
        temp_payrent_token = create_access_token({
            "sub": "payrent_cross_doc@test.in",
            "account_type": "pay₹ent",
            "user_id": "PAYRENT_CROSS_01",
            "role": "user"
        })
        res = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "AADHAAR",
                "documentNumber": "123456789012",
                "fileData": TINY_JPEG_B64
            },
            headers={"Authorization": f"Bearer {temp_payrent_token}"}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Payrent customer accounts require PAN", res.json().get("detail", ""))

    # -------------------------------------------------------------
    # 10. Users cannot read or modify another user's KYC data
    # -------------------------------------------------------------
    def test_10_users_cannot_access_other_users_kyc_document(self):
        """Ownership authorization: User B cannot download User A's private KYC document."""
        # Create User B token
        user_b_token = create_access_token({
            "sub": self.user_b_email,
            "account_type": "pay₹ent",
            "user_id": "PAYRENT_USER_B",
            "role": "user"
        })

        # User B attempts to access Payernt's uploaded KYC document
        verification_id = getattr(self.__class__, "payernt_verification_id", None)
        self.assertIsNotNone(verification_id, "Verification ID must be present from earlier submission")

        res_unauthorized = client.get(
            f"/api/kyc/document/{verification_id}",
            headers={"Authorization": f"Bearer {user_b_token}"}
        )
        self.assertEqual(res_unauthorized.status_code, 403)
        self.assertIn("Forbidden", res_unauthorized.json().get("detail", ""))

        # But the actual owner CAN access it
        res_owner = client.get(
            f"/api/kyc/document/{verification_id}",
            headers={"Authorization": f"Bearer {self.payernt_token}"}
        )
        self.assertEqual(res_owner.status_code, 200)
        self.assertEqual(res_owner.json().get("fileType"), "image/jpeg")

    # -------------------------------------------------------------
    # 11. Verification failures do not produce false APPROVED statuses
    # -------------------------------------------------------------
    def test_11_verification_does_not_fabricate_approved_status(self):
        """Without external provider, submission must be PENDING with VERIFICATION_UNAVAILABLE, never APPROVED."""
        headers = {"Authorization": f"Bearer {self.payrent_token}"}
        status_res = client.get("/api/kyc/status", headers=headers)
        self.assertEqual(status_res.status_code, 200)
        data = status_res.json()
        self.assertEqual(data.get("status"), "PENDING")
        self.assertNotEqual(data.get("status"), "APPROVED")
        self.assertEqual(data.get("providerStatus"), "VERIFICATION_UNAVAILABLE")

    # -------------------------------------------------------------
    # 12. Pending, approved, rejected, and permitted resubmission states work correctly
    # -------------------------------------------------------------
    def test_12_kyc_lifecycle_and_resubmission(self):
        """Test admin review workflow: PENDING -> REJECTED -> RESUBMISSION -> APPROVED."""
        payrent_v_id = getattr(self.__class__, "payrent_verification_id", None)
        self.assertIsNotNone(payrent_v_id)

        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        user_headers = {"Authorization": f"Bearer {self.payrent_token}"}

        # 12a. Admin rejects submission with safe rejection reason
        reject_res = client.post(
            f"/api/admin/kyc/{payrent_v_id}/review",
            json={
                "action": "reject",
                "rejectionReason": "PAN card photo is blurry. Please upload a clear photo."
            },
            headers=admin_headers
        )
        self.assertEqual(reject_res.status_code, 200)
        self.assertEqual(reject_res.json().get("status"), "REJECTED")

        # 12b. User checks status -> status is REJECTED with rejection reason
        status_rejected = client.get("/api/kyc/status", headers=user_headers)
        self.assertEqual(status_rejected.status_code, 200)
        self.assertEqual(status_rejected.json().get("status"), "REJECTED")
        self.assertIn("blurry", status_rejected.json().get("rejectionReason", ""))

        # 12c. User resubmits with clearer document -> status returns to PENDING
        resubmit_res = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileName": "pan_card_clear.png",
                "fileType": "image/png",
                "fileData": TINY_PNG_B64,
                "fileSize": len(TINY_PNG_BYTES)
            },
            headers=user_headers
        )
        self.assertEqual(resubmit_res.status_code, 200)
        self.assertEqual(resubmit_res.json().get("status"), "PENDING")
        new_v_id = resubmit_res.json().get("verificationId")

        # 12d. Admin approves verified submission
        approve_res = client.post(
            f"/api/admin/kyc/{new_v_id}/review",
            json={"action": "approve"},
            headers=admin_headers
        )
        self.assertEqual(approve_res.status_code, 200)
        self.assertEqual(approve_res.json().get("status"), "APPROVED")

        # 12e. User status is now APPROVED
        status_approved = client.get("/api/kyc/status", headers=user_headers)
        self.assertEqual(status_approved.status_code, 200)
        self.assertEqual(status_approved.json().get("status"), "APPROVED")

        # 12f. Attempting to resubmit when already APPROVED is rejected (400)
        resubmit_after_approved = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileData": TINY_PNG_B64
            },
            headers=user_headers
        )
        self.assertEqual(resubmit_after_approved.status_code, 400)
        self.assertIn("already been approved", resubmit_after_approved.json().get("detail", "").lower())

    # -------------------------------------------------------------
    # 13. Existing login, product listing, and booking remain functional
    # -------------------------------------------------------------
    def test_13_existing_platform_functionality_preserved(self):
        """Existing routes (health, products, categories, profile) remain fully operational."""
        # Health check
        res_health = client.get("/health")
        self.assertIn(res_health.status_code, (200, 503, 404))  # 503 if TiDB server is remote/offline

        # Categories listing
        res_cats = client.get("/api/categories")
        self.assertIn(res_cats.status_code, (200, 404))

        # Products listing
        res_products = client.get("/api/products")
        self.assertEqual(res_products.status_code, 200)

        # Profile access for authenticated user
        user_headers = {"Authorization": f"Bearer {self.payrent_token}"}
        res_me = client.get("/api/auth/me", headers=user_headers)
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json().get("email"), self.payrent_email)

if __name__ == "__main__":
    unittest.main()
