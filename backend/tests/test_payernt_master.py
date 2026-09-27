import os
import sys
import unittest
import uuid
import random
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from auth import create_access_token
from payernt_database import (
    get_all_active_payernt_products,
    get_payernt_product_by_id,
    get_rental_security_record,
    get_or_create_payernt_wallet,
    credit_payernt_wallet,
)


class TestPayerntMasterBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.test_email = f"vendor_{uuid.uuid4().hex[:8]}@payent.io"
        cls.test_password = "SecureVendorPass!2026"
        cls.test_name = "Mohan Test Vendor"
        cls.test_phone = "9876543210"
        cls.test_aadhaar = "123456789012"
        cls.test_pincode = "500081"
        cls.test_address = "Madhapur IT SEZ, Hyderabad"

    def test_01_health_check(self):
        """Verify paye₹nt health check endpoint."""
        res = self.client.get("/api/paye₹nt/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("status"), "ok")

    def test_02_registration_and_validation(self):
        """Test paye₹nt registration validation and success."""
        # 1. Invalid Aadhaar (not 12 digits)
        bad_aadhaar = {
            "name": self.test_name,
            "email": f"bad_{uuid.uuid4().hex[:6]}@payent.io",
            "aadhaarNumber": "12345",
            "phoneNumber": "9876543210",
            "address": self.test_address,
            "pincode": "500081",
            "password": self.test_password,
            "confirmPassword": self.test_password,
        }
        res = self.client.post("/api/paye₹nt/auth/register", json=bad_aadhaar)
        self.assertEqual(res.status_code, 422)

        # 2. Password mismatch
        bad_mismatch = {
            "name": self.test_name,
            "email": f"bad_{uuid.uuid4().hex[:6]}@payent.io",
            "aadhaarNumber": "123456789012",
            "phoneNumber": "9876543210",
            "address": self.test_address,
            "pincode": "500081",
            "password": self.test_password,
            "confirmPassword": "DifferentPassword123!",
        }
        res = self.client.post("/api/paye₹nt/auth/register", json=bad_mismatch)
        self.assertEqual(res.status_code, 422)

        # 3. Successful registration
        valid_payload = {
            "name": self.test_name,
            "email": self.test_email,
            "aadhaarNumber": self.test_aadhaar,
            "phoneNumber": self.test_phone,
            "address": self.test_address,
            "pincode": self.test_pincode,
            "password": self.test_password,
            "confirmPassword": self.test_password,
        }
        res = self.client.post("/api/paye₹nt/auth/register", json=valid_payload)
        self.assertIn(res.status_code, (200, 201))
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("accountType"), "paye₹nt")
        self.assertIn("token", data)
        self.assertNotIn("password_hash", data.get("account", {}))

        # 4. Duplicate registration rejected
        res_dup = self.client.post("/api/paye₹nt/auth/register", json=valid_payload)
        self.assertEqual(res_dup.status_code, 409)

    def test_03_login_and_token_claims(self):
        """Test paye₹nt authentication and token claims."""
        # Invalid login
        bad_res = self.client.post("/api/paye₹nt/auth/login", json={
            "email": self.test_email,
            "password": "WrongPassword123!",
        })
        self.assertEqual(bad_res.status_code, 401)

        # Valid login
        res = self.client.post("/api/paye₹nt/auth/login", json={
            "email": self.test_email,
            "password": self.test_password,
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("accountType"), "paye₹nt")
        self.__class__.vendor_token = data.get("token")
        self.__class__.vendor_id = data.get("userId")

    def test_04_profile_management(self):
        """Test profile retrieval and updates."""
        headers = {"Authorization": f"Bearer {self.vendor_token}"}
        # Get profile
        res = self.client.get("/api/paye₹nt/profile", headers=headers)
        self.assertEqual(res.status_code, 200)
        prof = res.json().get("profile", {})
        self.assertEqual(prof.get("email"), self.test_email)
        self.assertTrue(prof.get("aadhaar_number").startswith("XXXX"))

        # Update profile
        update_res = self.client.patch("/api/paye₹nt/profile", json={
            "name": "Mohan Updated Name",
            "pincode": "500090",
        }, headers=headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["profile"]["name"], "Mohan Updated Name")

    def test_05_product_creation_and_vendor_pin(self):
        """
        Verify that product creation generates ONE 4-digit Vendor Secret PIN.
        Vendor PIN must NOT be exposed through public catalog APIs.
        """
        headers = {"Authorization": f"Bearer {self.vendor_token}"}
        prod_payload = {
            "category": "cameras",
            "name": "Sony FX3 Cinema Camera",
            "title": "Sony FX3 Full-Frame Cinema Line Camera",
            "brand": "Sony",
            "model": "FX3",
            "daily_rate": 3499,
            "city": "Hyderabad",
            "pincode": "500081",
            "features": ["4K 120p", "15+ stops dynamic range", "XLR Handle"],
        }
        res = self.client.post("/api/paye₹nt/products", json=prod_payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))

        product = data.get("product", {})
        vendor_pin = data.get("vendorSecretPin")
        self.assertIsNotNone(vendor_pin)
        self.assertEqual(len(str(vendor_pin)), 4)
        self.assertTrue(str(vendor_pin).isdigit())

        self.__class__.created_product_id = product.get("id")
        self.__class__.vendor_pin = vendor_pin

        # Verify public listing DOES NOT contain vendor PIN
        public_products = get_all_active_payernt_products()
        for p in public_products:
            self.assertNotIn("vendor_secret_pin", p)

    def test_06_product_vendor_pin_invariance_and_booking_security(self):
        """
        CRITICAL TEST (Section 51 of Master Prompt):
        Product created with Vendor PIN = X
        Booking #1 created -> Vendor PIN remains X, Renter PIN = A (A != X)
        Booking #2 created -> Vendor PIN remains X, Renter PIN = B (B != X)
        Exactly ONE RentalSecurity record per booking.
        """
        headers = {"Authorization": f"Bearer {self.vendor_token}"}
        prod_id = self.created_product_id
        original_vendor_pin = self.vendor_pin

        # Generate renter token for Booking #1
        renter1_token = create_access_token({
            "sub": "renter1@test.com",
            "account_type": "pay₹ent",
            "user_id": "RENTER_USER_001",
            "role": "renter",
        })
        renter1_headers = {"Authorization": f"Bearer {renter1_token}"}

        booking1_res = self.client.post("/api/bookings", json={
            "productId": prod_id,
            "startDate": "2026-10-01",
            "endDate": "2026-10-04",
        }, headers=renter1_headers)
        self.assertEqual(booking1_res.status_code, 200)
        b1_data = booking1_res.json()
        b1_id = b1_data["booking"]["id"]
        b1_renter_pin = b1_data["booking"]["renterSecretPin"]

        # Check RentalSecurity Record #1
        sec1 = get_rental_security_record(b1_id)
        self.assertIsNotNone(sec1)
        self.assertEqual(sec1["vendor_secret_pin"], original_vendor_pin)
        self.assertEqual(sec1["renter_secret_pin"], b1_renter_pin)
        self.assertNotEqual(sec1["renter_secret_pin"], original_vendor_pin)

        # Generate renter token for Booking #2
        renter2_token = create_access_token({
            "sub": "renter2@test.com",
            "account_type": "pay₹ent",
            "user_id": "RENTER_USER_002",
            "role": "renter",
        })
        renter2_headers = {"Authorization": f"Bearer {renter2_token}"}

        booking2_res = self.client.post("/api/bookings", json={
            "productId": prod_id,
            "startDate": "2026-10-05",
            "endDate": "2026-10-08",
        }, headers=renter2_headers)
        self.assertEqual(booking2_res.status_code, 200)
        b2_data = booking2_res.json()
        b2_id = b2_data["booking"]["id"]
        b2_renter_pin = b2_data["booking"]["renterSecretPin"]

        # Check RentalSecurity Record #2
        sec2 = get_rental_security_record(b2_id)
        self.assertIsNotNone(sec2)
        # CRITICAL: Vendor PIN MUST REMAIN IDENTICAL across all bookings!
        self.assertEqual(sec2["vendor_secret_pin"], original_vendor_pin)
        self.assertEqual(sec2["renter_secret_pin"], b2_renter_pin)
        self.assertNotEqual(sec2["renter_secret_pin"], original_vendor_pin)

        # Store booking 1 for verification test
        self.__class__.booking_id = b1_id
        self.__class__.b1_renter_pin = b1_renter_pin
        self.__class__.renter1_headers = renter1_headers

    def test_07_pin_verification_and_atomic_rental_activation(self):
        """
        Tests server-side PIN and OTP verification and atomic activation.
        Rental becomes active ONLY when vendor PIN, renter PIN, and OTP are all verified.
        """
        b_id = self.booking_id
        v_pin = self.vendor_pin
        r_pin = self.b1_renter_pin

        # 1. Incorrect Renter PIN rejected
        bad_rpin_res = self.client.post(f"/api/bookings/{b_id}/security/renter-pin", json={"pin": "0000"})
        self.assertEqual(bad_rpin_res.status_code, 400)

        # 2. Correct Renter PIN verified
        good_rpin_res = self.client.post(f"/api/bookings/{b_id}/security/renter-pin", json={"pin": r_pin})
        self.assertEqual(good_rpin_res.status_code, 200)

        # Check not yet active
        sec = get_rental_security_record(b_id)
        self.assertFalse(sec["rental_started"])

        # 3. Incorrect Vendor PIN rejected
        bad_vpin_res = self.client.post(f"/api/bookings/{b_id}/security/vendor-pin", json={"pin": "9999"})
        self.assertEqual(bad_vpin_res.status_code, 400)

        # 4. Correct Vendor PIN verified
        good_vpin_res = self.client.post(f"/api/bookings/{b_id}/security/vendor-pin", json={"pin": v_pin})
        self.assertEqual(good_vpin_res.status_code, 200)

        # 5. Correct OTP verified -> triggers atomic activation
        otp_res = self.client.post(f"/api/bookings/{b_id}/security/otp", json={"otp": "123456"})
        self.assertEqual(otp_res.status_code, 200)

        sec_after = get_rental_security_record(b_id)
        self.assertTrue(sec_after["rental_started"])
        self.assertEqual(sec_after["status"], "active")
        self.assertIsNotNone(sec_after["rental_started_at"])

    def test_08_wallet_and_withdrawal_management(self):
        """
        Tests vendor wallet balances, bank account registration, and withdrawal validation.
        """
        headers = {"Authorization": f"Bearer {self.vendor_token}"}
        v_id = self.vendor_id

        # 1. Credit wallet with test funds
        credit_payernt_wallet(v_id, 25000.0, None, "Test credit deposit")

        # 2. Fetch wallet
        w_res = self.client.get("/api/paye₹nt/wallet", headers=headers)
        self.assertEqual(w_res.status_code, 200)
        w_data = w_res.json()
        self.assertTrue(w_data.get("success"))
        avail_bal = float(w_data["wallet"]["available_balance"])
        self.assertGreaterEqual(avail_bal, 25000.0)

        # 3. Add bank account
        bank_res = self.client.post("/api/paye₹nt/wallet/bank-accounts", json={
            "accountHolderName": "Mohan Test Vendor",
            "bankName": "ICICI Bank",
            "accountNumber": "987654321098",
            "confirmAccountNumber": "987654321098",
            "ifsc": "ICIC0001234",
        }, headers=headers)
        self.assertEqual(bank_res.status_code, 200)
        bank_data = bank_res.json().get("bankAccount", {})
        bank_id = bank_data.get("id")
        self.assertTrue(bank_data.get("account_number_masked").startswith("XXXX"))

        # 4. Withdraw excessive amount (exceeds balance) -> must fail
        bad_wdl = self.client.post("/api/paye₹nt/wallet/withdraw", json={
            "amount": 999999999.0,
            "bankAccountId": bank_id,
        }, headers=headers)
        self.assertEqual(bad_wdl.status_code, 400)

        # 5. Withdraw valid amount -> succeeds and decreases balance
        good_wdl = self.client.post("/api/paye₹nt/wallet/withdraw", json={
            "amount": 5000.0,
            "bankAccountId": bank_id,
        }, headers=headers)
        self.assertEqual(good_wdl.status_code, 200)
        updated_w = good_wdl.json().get("updatedWallet", {})
        self.assertEqual(float(updated_w["available_balance"]), avail_bal - 5000.0)

    @classmethod
    def tearDownClass(cls):
        try:
            from database import execute_write, fetch_one
            account = fetch_one("SELECT id FROM payernt_accounts WHERE email = %s", (cls.test_email,))
            if account and account.get("id"):
                acc_id = account["id"]
                execute_write("DELETE FROM payernt_wallet_transactions WHERE owner_id = %s", (acc_id,))
                execute_write("DELETE FROM payernt_wallets WHERE owner_id = %s", (acc_id,))
                execute_write("DELETE FROM payernt_bank_accounts WHERE owner_id = %s", (acc_id,))
                execute_write("DELETE FROM payernt_notifications WHERE owner_id = %s", (acc_id,))
                execute_write("DELETE FROM payernt_audit_logs WHERE user_id = %s", (acc_id,))
                execute_write("DELETE FROM payernt_products WHERE owner_id = %s", (acc_id,))
                execute_write("DELETE FROM payernt_accounts WHERE id = %s", (acc_id,))
        except Exception:
            pass


if __name__ == "__main__":
    unittest.main()
