import sys
import os
import uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_otp, save_otp
from payernt_database import MOCK_PAYERNT_ACCOUNTS

client = TestClient(app)

def test_payernt_register_otp_request():
    """Requesting registration OTP saves OTP code and sends response."""
    test_email = f"payernt_reg_{uuid.uuid4().hex[:6]}@payent.io"
    test_phone = "+91 9876543210"

    res = client.post("/api/payernt/auth/register/request", json={
        "email": test_email,
        "phone": test_phone,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "Verification code" in data["message"]

    # Verify OTP was saved
    saved = get_otp(test_email)
    assert saved is not None
    assert len(saved["otp"]) == 6

def test_payernt_register_with_otp():
    """Registration verifies OTP before creating Payernt account."""
    uid = uuid.uuid4().hex[:6]
    test_email = f"payernt_new_{uid}@payent.io"
    test_phone = "9876543210"
    test_password = "SecurePassword123!"

    # 1. Request OTP
    req = client.post("/api/payernt/auth/register/request", json={
        "email": test_email,
        "phone": test_phone,
    })
    assert req.status_code == 200
    saved = get_otp(test_email)
    assert saved is not None
    valid_otp = saved["otp"]

    # 2. Registration with wrong OTP fails
    bad_res = client.post("/api/payernt/auth/register", json={
        "name": "OTP Test Vendor",
        "email": test_email,
        "phoneNumber": test_phone,
        "password": test_password,
        "confirmPassword": test_password,
        "otp": "999999",
    })
    assert bad_res.status_code == 400
    assert "Invalid or expired verification code" in bad_res.json()["detail"]

    # 3. Registration with correct OTP succeeds
    good_res = client.post("/api/payernt/auth/register", json={
        "name": "OTP Test Vendor",
        "email": test_email,
        "phoneNumber": test_phone,
        "password": test_password,
        "confirmPassword": test_password,
        "otp": valid_otp,
    })
    assert good_res.status_code == 201
    good_data = good_res.json()
    assert good_data["success"] is True
    assert good_data["status"] == "PENDING_REVIEW"
    assert good_data["accountType"] == "paye₹nt"

def test_payernt_login_otp_flow():
    """Approved Payernt account can request login OTP and sign in."""
    uid = uuid.uuid4().hex[:6]
    test_email = f"payernt_login_{uid}@payent.io"
    
    # Non-existent account returns 404
    non_res = client.post("/api/payernt/auth/login/otp/request", json={"email": "nonexistent_vendor@test.com"})
    assert non_res.status_code == 404

    # Seed approved account
    MOCK_PAYERNT_ACCOUNTS[test_email] = {
        "id": f"PAYERNT_USER_{uid}",
        "email": test_email,
        "name": "Approved Vendor",
        "phone": "+91 9876543210",
        "status": "APPROVED",
        "account_type": "paye₹nt",
        "role": "vendor",
    }

    # 1. Request login OTP
    req_res = client.post("/api/payernt/auth/login/otp/request", json={"email": test_email})
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["success"] is True

    # 2. Verify invalid OTP fails
    bad_verify = client.post("/api/payernt/auth/login/otp/verify", json={
        "email": test_email,
        "otp": "999999",
    })
    assert bad_verify.status_code == 400

    # 3. Verify valid OTP succeeds
    saved = get_otp(test_email)
    assert saved is not None
    valid_verify = client.post("/api/payernt/auth/login/otp/verify", json={
        "email": test_email,
        "otp": saved["otp"],
    })
    assert valid_verify.status_code == 200
    vdata = valid_verify.json()
    assert vdata["success"] is True
    assert "token" in vdata
    assert vdata["accountType"] == "paye₹nt"
    assert vdata["user"]["email"] == test_email
