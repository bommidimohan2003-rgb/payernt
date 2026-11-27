import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import MOCK_USERS, save_otp, get_otp

client = TestClient(app)

def test_login_otp_nonexistent_email():
    """Requesting login OTP for non-existent email returns 404."""
    res = client.post("/api/login/otp/request", json={"email": "nonexistent_otp_user@test.com"})
    assert res.status_code == 404
    assert "No account found with this email" in res.json()["detail"]

def test_login_otp_valid_flow():
    """Full login OTP flow: Request OTP -> Verify OTP -> Login Successful with Token."""
    test_email = "otp_login_test@payent.io"
    MOCK_USERS[test_email] = {
        "id": test_email,
        "email": test_email,
        "full_name": "OTP Test User",
        "phone": "+91 9998887776",
        "role": "customer",
        "status": "APPROVED",
        "kyc_status": "APPROVED",
    }

    # 1. Request OTP
    req_res = client.post("/api/login/otp/request", json={"email": test_email})
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["success"] is True

    # 2. Verify invalid OTP fails
    invalid_res = client.post("/api/login/otp/verify", json={"email": test_email, "otp": "999999"})
    assert invalid_res.status_code == 400
    assert "Invalid or expired verification code" in invalid_res.json()["detail"]

    # 3. Verify valid OTP succeeds
    saved = get_otp(test_email)
    otp_code = saved["otp"] if saved else "000000"
    valid_res = client.post("/api/login/otp/verify", json={"email": test_email, "otp": otp_code})
    assert valid_res.status_code == 200
    valid_data = valid_res.json()
    assert valid_data["success"] is True
    assert "token" in valid_data
    assert valid_data["user"]["email"] == test_email
    assert valid_data["user"]["fullName"] == "OTP Test User"


def test_copy_otp_page_endpoint():
    """Verify /api/auth/copy serves a micro-page that copies code without redirecting to login."""
    res = client.get("/api/auth/copy?otp=654321")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    html = res.text
    assert "654321" in html
    assert "Verification Code Copied" in html
    assert "Return to your <strong>Payent</strong> tab" in html
    assert "Paste code" in html
    assert "navigator.clipboard.writeText" in html
    # Ensure it does NOT redirect to /login
    assert "window.location.href = '/login'" not in html
    assert "window.location.replace('/login')" not in html


def test_otp_email_template_rendering():
    """Verify build_otp_email_html produces high-contrast inline styles with prominent OTP and Copy button."""
    from email_service import build_otp_email_html
    html = build_otp_email_html("789012", purpose="sign in to your paYent account", action_url="http://127.0.0.1:8001/api/auth/copy?otp=789012")
    assert "789012" in html
    assert "Copy Code (789012)" in html
    assert "http://127.0.0.1:8001/api/auth/copy?otp=789012" in html
    assert "#10b981" in html
    assert "background-color: #090a0c" in html
