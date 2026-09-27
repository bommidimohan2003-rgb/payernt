import os
import sys
import pytest
import uuid
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from payernt_database import get_rental_security_record

import unittest

client = TestClient(app)

class TestSharedDatabaseCrossIntegration(unittest.TestCase):
    """
    Validates end-to-end cross-side integration on the unified shared database:
    - Independent accounts for paye₹nt and pay₹ent on the same email
    - paye₹nt creates product -> pay₹ent views and books product
    - Unified rental security with Vendor PIN + Renter PIN + OTP
    - Strict authorization boundaries between renter and vendor
    """

    @classmethod
    def setUpClass(cls):
        unique_id = uuid.uuid4().hex[:6]
        cls.test_email = f"shared_{unique_id}@payent.io"
        cls.password = "SharedSecurePass123!"
        cls.vendor_phone = f"+9198{random.randint(10000000, 99999999)}"
        cls.renter_phone = f"+9197{random.randint(10000000, 99999999)}"
        cls.payernt_token = None
        cls.payrent_token = None
        cls.product_id = None
        cls.vendor_pin = None
        cls.booking_id = None
        cls.renter_pin = None
        cls.payernt_account_id = None
        cls.payrent_email = None

    @classmethod
    def tearDownClass(cls):
        try:
            from database import execute_write
            if getattr(cls, "payrent_email", None):
                execute_write("DELETE FROM users WHERE email = %s", (cls.payrent_email,))
            if getattr(cls, "test_email", None):
                execute_write("DELETE FROM users WHERE email = %s", (cls.test_email,))
            if getattr(cls, "payernt_account_id", None):
                execute_write("DELETE FROM payernt_wallet_transactions WHERE owner_id = %s", (cls.payernt_account_id,))
                execute_write("DELETE FROM payernt_wallets WHERE owner_id = %s", (cls.payernt_account_id,))
                execute_write("DELETE FROM payernt_bank_accounts WHERE owner_id = %s", (cls.payernt_account_id,))
                execute_write("DELETE FROM payernt_notifications WHERE owner_id = %s", (cls.payernt_account_id,))
                execute_write("DELETE FROM payernt_audit_logs WHERE user_id = %s", (cls.payernt_account_id,))
                execute_write("DELETE FROM payernt_products WHERE owner_id = %s", (cls.payernt_account_id,))
                execute_write("DELETE FROM rental_security WHERE vendor_id = %s OR renter_id = %s", (cls.payernt_account_id, cls.payernt_account_id))
                execute_write("DELETE FROM payernt_accounts WHERE id = %s", (cls.payernt_account_id,))
        except Exception:
            pass

    def test_01_account_separation_same_email(self):
        # 1. Register paye₹nt (Vendor) account
        payernt_res = client.post("/api/paye₹nt/auth/register", json={
            "name": "Vendor Mohan",
            "email": self.test_email,
            "aadhaarNumber": "123456789012",
            "phoneNumber": self.vendor_phone,
            "address": "Tech Zone 1, Cyberabad",
            "pincode": "500081",
            "password": self.password,
            "confirmPassword": self.password
        })
        assert payernt_res.status_code in (200, 201), f"paye₹nt register failed: {payernt_res.text}"
        payernt_data = payernt_res.json()
        assert payernt_data.get("accountType") == "paye₹nt"
        TestSharedDatabaseCrossIntegration.payernt_token = payernt_data.get("token")

        # 2. Register pay₹ent (Renter) account with identical email
        payrent_res = client.post("/api/register", json={
            "full_name": "Renter Mohan",
            "email": self.test_email,
            "pan_number": "ABCDE1234F",
            "phone": self.renter_phone,
            "address": "Customer Residency, Madhapur",
            "pincode": "500081",
            "password": self.password,
            "otp": "DIRECT"
        })
        assert payrent_res.status_code in (200, 201), f"pay₹ent register failed: {payrent_res.text}"

        # 3. Login to paye₹nt and verify account claims
        login_payernt = client.post("/api/paye₹nt/auth/login", json={
            "email": self.test_email,
            "password": self.password
        })
        assert login_payernt.status_code == 200, f"paye₹nt login failed: {login_payernt.text}"
        assert login_payernt.json().get("accountType") == "paye₹nt"
        TestSharedDatabaseCrossIntegration.payernt_token = login_payernt.json()["token"]

        # 4. Login to pay₹ent and verify token claims
        login_payrent = client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.password
        })
        assert login_payrent.status_code == 200, f"pay₹ent login failed: {login_payrent.text}"
        TestSharedDatabaseCrossIntegration.payrent_token = login_payrent.json()["token"]

    def test_02_payernt_creates_product_and_payrent_discovers_it(self):
        # 1. Vendor lists a new camera
        product_payload = {
            "name": "Sony Alpha A7 IV",
            "category": "cameras",
            "daily_rate": 1800,
            "city": "Hyderabad",
            "description": "Full-frame 33MP hybrid camera for photo and 4K 60p video.",
            "condition_grade": "Excellent",
            "primaryImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32"
        }
        res = client.post(
            "/api/paye₹nt/products",
            json=product_payload,
            headers={"Authorization": f"Bearer {self.payernt_token}"}
        )
        assert res.status_code == 200, f"Create product failed: {res.text}"
        prod_data = res.json()
        TestSharedDatabaseCrossIntegration.product_id = prod_data["product"]["id"]
        TestSharedDatabaseCrossIntegration.vendor_pin = prod_data["vendorSecretPin"]
        assert len(str(TestSharedDatabaseCrossIntegration.vendor_pin)) == 4

        # 2. Renter accesses product catalog via public catalog endpoint
        renter_view = client.get(f"/api/paye₹nt/catalog/{self.product_id}")
        assert renter_view.status_code == 200, f"Renter view product failed: {renter_view.text}"
        assert "vendor_secret_pin" not in renter_view.json()["product"]

    def test_03_booking_creation_and_rental_security_lifecycle(self):
        # 1. Renter books the product
        booking_payload = {
            "productId": self.product_id,
            "startDate": "2026-10-01",
            "endDate": "2026-10-05"
        }
        res = client.post(
            "/api/bookings",
            json=booking_payload,
            headers={"Authorization": f"Bearer {self.payrent_token}"}
        )
        assert res.status_code == 200, f"Booking creation failed: {res.text}"
        booking_data = res.json()
        booking_id = booking_data["booking"]["id"]
        renter_pin = booking_data["booking"]["renterSecretPin"]
        assert len(str(renter_pin)) == 4
        TestSharedDatabaseCrossIntegration.booking_id = booking_id
        TestSharedDatabaseCrossIntegration.renter_pin = renter_pin

        # 2. Verify Renter PIN
        rpin_res = client.post(
            f"/api/bookings/{booking_id}/security/renter-pin",
            json={"pin": renter_pin}
        )
        assert rpin_res.status_code == 200

        # 3. Verify Vendor PIN
        vpin_res = client.post(
            f"/api/bookings/{booking_id}/security/vendor-pin",
            json={"pin": self.vendor_pin}
        )
        assert vpin_res.status_code == 200

        # 4. Verify OTP
        otp_res = client.post(
            f"/api/bookings/{booking_id}/security/otp",
            json={"otp": "123456"}
        )
        assert otp_res.status_code == 200

        # 5. Check Rental Security record is active
        sec = get_rental_security_record(booking_id)
        assert sec is not None
        assert sec["rental_started"] is True or sec["status"] == "active"

    def test_04_strict_authorization_boundaries(self):
        # 1. Renter cannot access vendor wallet
        wallet_res = client.get(
            "/api/paye₹nt/wallet",
            headers={"Authorization": f"Bearer {self.payrent_token}"}
        )
        assert wallet_res.status_code in (401, 403, 404)

        # 2. Vendor can access own wallet
        vendor_wallet_res = client.get(
            "/api/paye₹nt/wallet",
            headers={"Authorization": f"Bearer {self.payernt_token}"}
        )
        assert vendor_wallet_res.status_code == 200
        assert "available_balance" in vendor_wallet_res.json()["wallet"]

    @classmethod
    def teardown_class(cls):
        try:
            from database import execute_write
            execute_write("DELETE FROM users WHERE email = %s", (cls.payrent_email,))
            execute_write("DELETE FROM payernt_wallet_transactions WHERE owner_id = %s", (cls.payernt_account_id,))
            execute_write("DELETE FROM payernt_wallets WHERE owner_id = %s", (cls.payernt_account_id,))
            execute_write("DELETE FROM payernt_bank_accounts WHERE owner_id = %s", (cls.payernt_account_id,))
            execute_write("DELETE FROM payernt_notifications WHERE owner_id = %s", (cls.payernt_account_id,))
            execute_write("DELETE FROM payernt_audit_logs WHERE user_id = %s", (cls.payernt_account_id,))
            execute_write("DELETE FROM payernt_products WHERE owner_id = %s", (cls.payernt_account_id,))
            execute_write("DELETE FROM rental_security WHERE vendor_id = %s OR renter_id = %s", (cls.payernt_account_id, cls.payernt_account_id))
            execute_write("DELETE FROM payernt_accounts WHERE id = %s", (cls.payernt_account_id,))
        except Exception:
            pass
