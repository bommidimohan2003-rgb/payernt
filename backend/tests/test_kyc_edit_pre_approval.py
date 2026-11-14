import os
import sys
import uuid
import base64
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, create_access_token
from database import MOCK_KYC_VERIFICATIONS

client = TestClient(app)

TINY_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)
TINY_PNG_B64 = f"data:image/png;base64,{base64.b64encode(TINY_PNG_BYTES).decode('utf-8')}"

class TestKycEditPreApproval(unittest.TestCase):
    def setUp(self):
        self.user_email = f"renter_edit_{uuid.uuid4().hex[:6]}@testpayent.in"
        self.user_token = create_access_token({
            "sub": self.user_email,
            "role": "customer",
            "account_type": "payrent"
        })
        self.admin_email = f"admin_edit_{uuid.uuid4().hex[:6]}@testpayent.in"
        self.admin_token = create_access_token({
            "sub": self.admin_email,
            "role": "admin",
            "account_type": "payrent"
        })

    def test_edit_allowed_before_approval_and_blocked_after_approval(self):
        user_headers = {"Authorization": f"Bearer {self.user_token}"}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # 1. Initial KYC Submission -> PENDING
        res_initial = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileName": "pan_original.png",
                "fileType": "image/png",
                "fileData": TINY_PNG_B64,
                "fileSize": len(TINY_PNG_BYTES)
            },
            headers=user_headers
        )
        self.assertEqual(res_initial.status_code, 200)
        initial_data = res_initial.json()
        self.assertEqual(initial_data.get("status"), "PENDING")
        self.assertEqual(initial_data.get("maskedNumber"), "XXXXX1234F")
        v1_id = initial_data.get("verificationId")

        # 2. Duplicate submission without edit flag while PENDING returns 409
        res_dup = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "ABCDE1234F",
                "fileName": "pan_dup.png",
                "fileType": "image/png",
                "fileData": TINY_PNG_B64,
                "fileSize": len(TINY_PNG_BYTES),
                "isEdit": False
            },
            headers=user_headers
        )
        self.assertEqual(res_dup.status_code, 409)

        # 3. User edits KYC details BEFORE admin approval (with isEdit=True)
        res_edit = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "XYZAB9876C",
                "fileName": "pan_corrected.png",
                "fileType": "image/png",
                "fileData": TINY_PNG_B64,
                "fileSize": len(TINY_PNG_BYTES),
                "isEdit": True
            },
            headers=user_headers
        )
        self.assertEqual(res_edit.status_code, 200)
        edit_data = res_edit.json()
        self.assertEqual(edit_data.get("status"), "PENDING")
        self.assertEqual(edit_data.get("maskedNumber"), "XXXXX9876C")
        v2_id = edit_data.get("verificationId")
        self.assertNotEqual(v1_id, v2_id)

        # 4. Confirm latest status reflects the edited details
        status_res = client.get("/api/kyc/status", headers=user_headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json().get("maskedNumber"), "XXXXX9876C")
        self.assertEqual(status_res.json().get("status"), "PENDING")

        # 5. Admin APPROVES the updated KYC submission
        approve_res = client.post(
            f"/api/admin/kyc/{v2_id}/review",
            json={"action": "approve"},
            headers=admin_headers
        )
        self.assertEqual(approve_res.status_code, 200)
        self.assertEqual(approve_res.json().get("status"), "APPROVED")

        # 6. User status is now APPROVED
        status_approved = client.get("/api/kyc/status", headers=user_headers)
        self.assertEqual(status_approved.status_code, 200)
        self.assertEqual(status_approved.json().get("status"), "APPROVED")

        # 7. Attempting to edit or resubmit AFTER admin approval is strictly BLOCKED (400)
        res_blocked = client.post(
            "/api/kyc/submit",
            json={
                "documentType": "PAN",
                "documentNumber": "MNOPQ5555Z",
                "fileName": "pan_after_approved.png",
                "fileType": "image/png",
                "fileData": TINY_PNG_B64,
                "isEdit": True
            },
            headers=user_headers
        )
        self.assertEqual(res_blocked.status_code, 400)
        self.assertIn("already been approved", res_blocked.json().get("detail", "").lower())

if __name__ == "__main__":
    unittest.main()
