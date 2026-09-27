import os
import sys
import pytest
import uuid
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import get_user
from payernt_database import get_payernt_account_by_email

import unittest

client = TestClient(app)

class TestCrossSideAccountCreation(unittest.TestCase):
    """
    Validates the complete Cross-Side Account Creation flow:
    - Test A: paye₹nt exists -> register pay₹ent with same mobile (OTP + PAN)
    - Test B: pay₹ent exists -> register paye₹nt with same mobile (OTP + Aadhaar)
    - Test C: Duplicate paye₹nt registration prevented when both exist
    - Test D: Duplicate pay₹ent registration prevented when both exist
    """

    @classmethod
    def tearDownClass(cls):
        try:
            from database import execute_write
            execute_write("DELETE FROM users WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io'")
            execute_write("DELETE FROM payernt_wallet_transactions WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io')")
            execute_write("DELETE FROM payernt_wallets WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io')")
            execute_write("DELETE FROM payernt_bank_accounts WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io')")
            execute_write("DELETE FROM payernt_notifications WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io')")
            execute_write("DELETE FROM payernt_audit_logs WHERE user_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io')")
            execute_write("DELETE FROM payernt_products WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io')")
            execute_write("DELETE FROM payernt_accounts WHERE email LIKE '%@test.com' OR email LIKE '%shared_%@payent.io'")
            execute_write("DELETE FROM persons WHERE phone NOT IN ('+91 8810519885', '8810519885', '+918810519885', '9876543210')")
        except Exception:
            pass

    def test_01_case_a_payernt_exists_then_create_payrent(self):
        # 1. User registers paye₹nt (Vendor) account
        uid = uuid.uuid4().hex[:6]
        vendor_email = f"vendor_{uid}@test.com"
        shared_phone = f"+9196{random.randint(10000000, 99999999)}"
        password_vendor = "VendorPass!2026"

        reg_vendor = client.post("/api/paye₹nt/auth/register", json={
            "name": "Mohan Vendor",
            "email": vendor_email,
            "aadhaarNumber": "123456789012",
            "phoneNumber": shared_phone,
            "address": "42 Cyber Towers, Hitec City",
            "pincode": "500081",
            "password": password_vendor,
            "confirmPassword": password_vendor
        })
        assert reg_vendor.status_code in (200, 201)
        vendor_account = get_payernt_account_by_email(vendor_email)
        assert vendor_account is not None

        # 2. User opens pay₹ent registration and checks mobile
        check_res = client.post("/api/auth/cross-side/check-mobile", json={
            "phone": shared_phone,
            "targetAccountType": "pay₹ent"
        })
        assert check_res.status_code == 200
        check_data = check_res.json()
        assert check_data["cross_side_eligible"] is True
        assert check_data["existing_account_type"] == "paye₹nt"

        # 3. Request OTP for mobile verification
        otp_res = client.post("/api/auth/cross-side/send-otp", json={
            "phone": shared_phone,
            "targetAccountType": "pay₹ent"
        })
        assert otp_res.status_code == 200
        otp_data = otp_res.json()
        token = otp_data["token"]
        otp = otp_data.get("otp") or "123456"

        # 4. Verify OTP and receive sanitized prefill fields
        verify_res = client.post("/api/auth/cross-side/verify-otp", json={
            "token": token,
            "otp": otp
        })
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["verified"] is True
        assert verify_data["requiredDocument"] == "pan"
        prefill = verify_data["prefill"]
        assert prefill["name"] == "Mohan Vendor"
        assert prefill["address"] == "42 Cyber Towers, Hitec City"
        assert prefill["pincode"] == "500081"
        # Ensure sensitive fields are NEVER exposed
        assert "aadhaar_number" not in prefill
        assert "password" not in prefill
        assert "password_hash" not in prefill

        # 5. Submit pay₹ent registration with PAN and new password
        customer_email = f"customer_{uid}@test.com"
        password_customer = "CustomerPass!2026"
        reg_cross = client.post("/api/auth/cross-side/register", json={
            "targetAccountType": "pay₹ent",
            "verificationToken": token,
            "email": customer_email,
            "name": prefill["name"],
            "address": prefill["address"],
            "pincode": prefill["pincode"],
            "panNumber": "ABCDE1234F",
            "password": password_customer,
            "confirmPassword": password_customer
        })
        assert reg_cross.status_code == 200
        cross_data = reg_cross.json()
        assert cross_data["success"] is True
        assert cross_data["user"]["accountType"] == "pay₹ent"
        assert cross_data["user"]["personId"] is not None

        # 6. Verify original paye₹nt vendor account is intact and separate
        vendor_after = get_payernt_account_by_email(vendor_email)
        assert vendor_after is not None
        assert vendor_after["account_type"] == "paye₹nt"
        assert vendor_after["id"] != cross_data["user"]["accountId"]

    def test_02_case_b_payrent_exists_then_create_payernt(self):
        # 1. User registers pay₹ent (Customer) account
        uid = uuid.uuid4().hex[:6]
        customer_email = f"renter_{uid}@test.com"
        shared_phone = f"+9195{random.randint(10000000, 99999999)}"
        password_customer = "CustomerPass!2026"

        reg_customer = client.post("/api/register", json={
            "full_name": "Ravi Renter",
            "email": customer_email,
            "pan_number": "ABCDE5678G",
            "phone": shared_phone,
            "address": "15 Green Meadows, Bengaluru",
            "pincode": "560001",
            "password": password_customer,
            "otp": "DIRECT"
        })
        assert reg_customer.status_code in (200, 201)

        # 2. User opens paye₹nt registration and checks mobile
        check_res = client.post("/api/auth/cross-side/check-mobile", json={
            "phone": shared_phone,
            "targetAccountType": "paye₹nt"
        })
        assert check_res.status_code == 200
        check_data = check_res.json()
        assert check_data["cross_side_eligible"] is True
        assert check_data["existing_account_type"] == "pay₹ent"

        # 3. Request OTP for mobile verification
        otp_res = client.post("/api/auth/cross-side/send-otp", json={
            "phone": shared_phone,
            "targetAccountType": "paye₹nt"
        })
        assert otp_res.status_code == 200
        otp_data = otp_res.json()
        token = otp_data["token"]
        otp = otp_data.get("otp") or "123456"

        # 4. Verify OTP and receive sanitized prefill fields
        verify_res = client.post("/api/auth/cross-side/verify-otp", json={
            "token": token,
            "otp": otp
        })
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["verified"] is True
        assert verify_data["requiredDocument"] == "aadhaar"
        prefill = verify_data["prefill"]
        assert prefill["name"] == "Ravi Renter"
        assert prefill["address"] == "15 Green Meadows, Bengaluru"
        assert prefill["pincode"] == "560001"
        assert "pan_number" not in prefill

        # 5. Submit paye₹nt registration with Aadhaar and new password
        vendor_email = f"lender_{uid}@test.com"
        password_vendor = "VendorPass!2026"
        reg_cross = client.post("/api/auth/cross-side/register", json={
            "targetAccountType": "paye₹nt",
            "verificationToken": token,
            "email": vendor_email,
            "name": prefill["name"],
            "address": prefill["address"],
            "pincode": prefill["pincode"],
            "aadhaarNumber": "987654321098",
            "password": password_vendor,
            "confirmPassword": password_vendor
        })
        assert reg_cross.status_code == 200
        cross_data = reg_cross.json()
        assert cross_data["success"] is True
        assert cross_data["accountType"] == "paye₹nt"
        assert cross_data["account"]["personId"] is not None

        # 6. Verify original pay₹ent account remains unchanged
        customer_after = get_user(customer_email)
        assert customer_after is not None
        assert customer_after["account_type"] == "pay₹ent"

    def test_03_case_c_and_d_duplicate_prevention_when_both_exist(self):
        # Setup person with both accounts on shared mobile
        uid = uuid.uuid4().hex[:6]
        phone = f"+9194{random.randint(10000000, 99999999)}"
        email_v = f"both_v_{uid}@test.com"
        email_r = f"both_r_{uid}@test.com"

        # Register paye₹nt
        r_v = client.post("/api/paye₹nt/auth/register", json={
            "name": "Both Sides User",
            "email": email_v,
            "aadhaarNumber": "112233445566",
            "phoneNumber": phone,
            "address": "Sector 5, Noida",
            "pincode": "201301",
            "password": "Password123!",
            "confirmPassword": "Password123!"
        })
        assert r_v.status_code in (200, 201)

        # Register pay₹ent
        r_c = client.post("/api/register", json={
            "full_name": "Both Sides User",
            "email": email_r,
            "pan_number": "ABCDE9999Z",
            "phone": phone,
            "address": "Sector 5, Noida",
            "pincode": "201301",
            "password": "Password123!",
            "otp": "DIRECT"
        })
        assert r_c.status_code in (200, 201)

        # Test C: Check paye₹nt again -> Should indicate already exists
        check_v = client.post("/api/auth/cross-side/check-mobile", json={
            "phone": phone,
            "targetAccountType": "paye₹nt"
        })
        assert check_v.status_code == 200
        assert check_v.json()["exists_same_side"] is True
        assert check_v.json()["cross_side_eligible"] is False

        # Test D: Check pay₹ent again -> Should indicate already exists
        check_r = client.post("/api/auth/cross-side/check-mobile", json={
            "phone": phone,
            "targetAccountType": "pay₹ent"
        })
        assert check_r.status_code == 200
        assert check_r.json()["exists_same_side"] is True
        assert check_r.json()["cross_side_eligible"] is False

    @classmethod
    def teardown_class(cls):
        try:
            from database import execute_write
            execute_write("DELETE FROM users WHERE email LIKE '%@test.com'")
            execute_write("DELETE FROM payernt_wallet_transactions WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com')")
            execute_write("DELETE FROM payernt_wallets WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com')")
            execute_write("DELETE FROM payernt_bank_accounts WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com')")
            execute_write("DELETE FROM payernt_notifications WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com')")
            execute_write("DELETE FROM payernt_audit_logs WHERE user_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com')")
            execute_write("DELETE FROM payernt_products WHERE owner_id IN (SELECT id FROM payernt_accounts WHERE email LIKE '%@test.com')")
            execute_write("DELETE FROM payernt_accounts WHERE email LIKE '%@test.com'")
            execute_write("DELETE FROM persons WHERE phone NOT IN ('+91 8810519885', '8810519885', '+918810519885', '9876543210')")
        except Exception:
            pass
