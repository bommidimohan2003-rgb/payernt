import unittest
from fastapi.testclient import TestClient
from main import app
from database import (
    MOCK_USERS,
    MOCK_DEVICES,
    MOCK_DEVICE_SECURITY_HISTORY,
    MOCK_DEVICE_TRANSFERS
)
from auth import hash_password, create_access_token

class TestSecureDeviceIdentity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app, raise_server_exceptions=False)
        pwd_hash = hash_password("Test@Password123")
        cls.user_a = {
            "email": "laptopowner@payernt.com",
            "phone": "+919876543210",
            "password_hash": pwd_hash,
            "full_name": "Laptop Owner",
            "role": "customer",
            "status": "active",
            "verified": True,
            "created_at": "2026-03-01T00:00:00.000Z"
        }
        cls.user_b = {
            "email": "transferee@payernt.com",
            "phone": "+919876543211",
            "password_hash": pwd_hash,
            "full_name": "New Owner",
            "role": "customer",
            "status": "active",
            "verified": True,
            "created_at": "2026-03-01T00:00:00.000Z"
        }
        cls.admin_user = {
            "email": "admin_device@payernt.com",
            "phone": "+919876543212",
            "password_hash": pwd_hash,
            "full_name": "Device Admin",
            "role": "admin",
            "status": "active",
            "verified": True,
            "created_at": "2026-03-01T00:00:00.000Z"
        }
        MOCK_USERS["laptopowner@payernt.com"] = cls.user_a
        MOCK_USERS["transferee@payernt.com"] = cls.user_b
        MOCK_USERS["admin_device@payernt.com"] = cls.admin_user

    def test_complete_device_identity_flow(self):
        token_a = create_access_token({"sub": "laptopowner@payernt.com", "role": "customer"})
        token_b = create_access_token({"sub": "transferee@payernt.com", "role": "customer"})
        token_admin = create_access_token({"sub": "admin_device@payernt.com", "role": "admin", "account_type": "admin"})

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        # 1. Register a laptop device
        reg_res = self.client.post("/api/devices", json={
            "deviceName": "ThinkPad X1 Carbon Gen 11",
            "brand": "Lenovo",
            "model": "21CBCTO1WW",
            "serialNumber": "PF-3X992A",
            "deviceType": "LAPTOP",
            "notes": "Bottom chassis security seal on primary screw."
        }, headers=headers_a)
        self.assertEqual(reg_res.status_code, 200)
        data = reg_res.json()
        self.assertTrue(data["success"])
        device = data["device"]
        device_id = device["deviceId"]
        security_id = device["securityId"]
        self.assertTrue(device_id.startswith("DEV-LT-"))
        self.assertTrue(security_id.startswith("PY-LT-"))
        self.assertNotIn("qrToken", device)  # Secret token withheld from listing

        # 2. List devices for User A
        list_res = self.client.get("/api/devices", headers=headers_a)
        self.assertEqual(list_res.status_code, 200)
        dev_list = list_res.json()["devices"]
        self.assertTrue(any(d["deviceId"] == device_id for d in dev_list))

        # 3. Attempt to reveal QR with wrong password
        wrong_pwd_res = self.client.post(f"/api/devices/{device_id}/verify-password", json={
            "password": "WrongPassword123!"
        }, headers=headers_a)
        self.assertEqual(wrong_pwd_res.status_code, 401)
        self.assertIn("Incorrect password", wrong_pwd_res.json()["detail"])

        # 4. Reveal QR with correct password (PASSWORD ONLY)
        correct_pwd_res = self.client.post(f"/api/devices/{device_id}/verify-password", json={
            "password": "Test@Password123"
        }, headers=headers_a)
        self.assertEqual(correct_pwd_res.status_code, 200)
        qr_data = correct_pwd_res.json()
        self.assertTrue(qr_data["success"])
        qr_token = qr_data["qrToken"]
        self.assertTrue(qr_token.startswith("pYnt_sec_"))
        self.assertEqual(qr_data["securityId"], security_id)
        self.assertEqual(qr_data["qrUrl"], f"/verify/device/{qr_token}")

        # 5. Public QR Verification scan (NO LOGIN REQUIRED)
        pub_res = self.client.get(f"/api/verify/device/{qr_token}")
        self.assertEqual(pub_res.status_code, 200)
        pub_data = pub_res.json()
        self.assertTrue(pub_data["verified"])
        self.assertEqual(pub_data["deviceId"], device_id)
        self.assertEqual(pub_data["securityId"], security_id)
        self.assertEqual(pub_data["deviceName"], "ThinkPad X1 Carbon Gen 11")
        self.assertEqual(pub_data["deviceStatus"], "ACTIVE")
        self.assertEqual(pub_data["deviceType"], "LAPTOP")
        # STRICT PRIVACY: Confirm NO owner email, phone, or password exposed
        self.assertNotIn("email", pub_data)
        self.assertNotIn("ownerEmail", pub_data)
        self.assertNotIn("phone", pub_data)
        self.assertNotIn("password", pub_data)

        # 6. Report Device Lost with password verification
        lost_res = self.client.post(f"/api/devices/{device_id}/report-lost", json={
            "password": "Test@Password123",
            "notes": "Left in conference hall room 402."
        }, headers=headers_a)
        self.assertEqual(lost_res.status_code, 200)

        # Public verification now returns REPORTED_LOST status
        pub_lost = self.client.get(f"/api/verify/device/{qr_token}").json()
        self.assertTrue(pub_lost["verified"])
        self.assertEqual(pub_lost["deviceStatus"], "REPORTED_LOST")

        # 7. Report Device Stolen with password verification
        stolen_res = self.client.post(f"/api/devices/{device_id}/report-stolen", json={
            "password": "Test@Password123",
            "notes": "Backpack stolen from vehicle."
        }, headers=headers_a)
        self.assertEqual(stolen_res.status_code, 200)

        pub_stolen = self.client.get(f"/api/verify/device/{qr_token}").json()
        self.assertTrue(pub_stolen["verified"])
        self.assertEqual(pub_stolen["deviceStatus"], "REPORTED_STOLEN")

        # 8. Restore Device to ACTIVE with password
        restore_res = self.client.post(f"/api/devices/{device_id}/restore", json={
            "password": "Test@Password123"
        }, headers=headers_a)
        self.assertEqual(restore_res.status_code, 200)

        pub_restored = self.client.get(f"/api/verify/device/{qr_token}").json()
        self.assertTrue(pub_restored["verified"])
        self.assertEqual(pub_restored["deviceStatus"], "ACTIVE")

        # 9. Regenerate QR (invalidates previous token, generates new one)
        regen_res = self.client.post(f"/api/devices/{device_id}/regenerate-qr", json={
            "password": "Test@Password123"
        }, headers=headers_a)
        self.assertEqual(regen_res.status_code, 200)
        new_qr_data = regen_res.json()
        new_qr_token = new_qr_data["qrToken"]
        new_sec_id = new_qr_data["securityId"]
        self.assertNotEqual(new_qr_token, qr_token)

        # Old token is now INVALID
        old_verify = self.client.get(f"/api/verify/device/{qr_token}").json()
        self.assertFalse(old_verify["verified"])
        self.assertEqual(old_verify["status"], "INVALID")

        # New token is VERIFIED ACTIVE
        new_verify = self.client.get(f"/api/verify/device/{new_qr_token}").json()
        self.assertTrue(new_verify["verified"])
        self.assertEqual(new_verify["securityId"], new_sec_id)

        # 10. Check Security History
        hist_res = self.client.get(f"/api/devices/{device_id}/security-history", headers=headers_a)
        self.assertEqual(hist_res.status_code, 200)
        events = hist_res.json()["history"]
        event_types = [e["event_type"] for e in events]
        self.assertIn("DEVICE_REGISTERED", event_types)
        self.assertIn("QR_REVEALED", event_types)
        self.assertIn("DEVICE_REPORTED_LOST", event_types)
        self.assertIn("DEVICE_REPORTED_STOLEN", event_types)
        self.assertIn("DEVICE_RESTORED", event_types)
        self.assertIn("QR_REGENERATED", event_types)
        self.assertIn("QR_VERIFIED", event_types)

        # 11. Ownership Transfer Flow
        transfer_res = self.client.post(f"/api/devices/{device_id}/transfer", json={
            "targetEmail": "transferee@payernt.com",
            "password": "Test@Password123"
        }, headers=headers_a)
        self.assertEqual(transfer_res.status_code, 200)
        transfer_id = transfer_res.json()["transfer"]["id"]

        # Target user checks pending transfers
        pending_res = self.client.get("/api/device-transfers/pending", headers=headers_b)
        self.assertEqual(pending_res.status_code, 200)
        incoming = pending_res.json()["transfers"]["incoming"]
        self.assertTrue(any(t["id"] == transfer_id for t in incoming))

        # Target user accepts transfer
        accept_res = self.client.post(f"/api/device-transfers/{transfer_id}/accept", headers=headers_b)
        self.assertEqual(accept_res.status_code, 200)

        # User B now owns device
        b_devices = self.client.get("/api/devices", headers=headers_b).json()["devices"]
        self.assertTrue(any(d["deviceId"] == device_id for d in b_devices))

        # 12. Admin device listing
        admin_devices = self.client.get("/api/admin/devices", headers=headers_admin).json()
        self.assertTrue(admin_devices["success"])
        self.assertTrue(any(d["device_id"] == device_id for d in admin_devices["devices"]))

if __name__ == "__main__":
    unittest.main()
