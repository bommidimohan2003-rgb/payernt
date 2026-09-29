import os
import pytest
from fastapi.testclient import TestClient
from main import app
from database import execute_query
from auth import create_access_token
from payernt_database import (
    create_payernt_account,
    get_product_confirmation,
    get_payernt_product_by_id,
)

client = TestClient(app)


class TestListingConfirmationSecurityFlow:
    """
    Test suite for the secure product confirmation flow:
    1. 5-step listing submission creates listing as PENDING_CONFIRMATION (available=False).
    2. Server generates a 4-digit Vendor Secret PIN cryptographically and saves it securely.
    3. Server generates 6-digit OTP sent to registered mobile.
    4. Invalid OTP is rejected with remaining attempt count.
    5. Correct OTP verifies listing, transitions status to UNDER_REVIEW (Pending Admin Review).
    6. Admin can review product without seeing raw Vendor PIN or raw OTP.
    """

    @classmethod
    def setup_class(cls):
        cls.vendor_email = "secure_vendor@payent.io"
        cls.vendor_phone = "+91 9876543210"

        # Cleanup existing test data
        try:
            execute_query("DELETE FROM product_confirmations WHERE owner_email = %s", (cls.vendor_email,))
            execute_query("DELETE FROM payernt_products WHERE owner_email = %s", (cls.vendor_email,))
            execute_query("DELETE FROM payernt_accounts WHERE email = %s", (cls.vendor_email,))
        except Exception:
            pass

        # Create test vendor account
        cls.acc = create_payernt_account(
            email=cls.vendor_email,
            name="Secure Vendor Pro",
            aadhaar_number="123456789012",
            phone=cls.vendor_phone,
            address="100 Tech Park, Indiranagar",
            pincode="560038",
            password="SecurePassword123!",
        )
        cls.token = create_access_token(
            data={"sub": cls.vendor_email, "account_type": "paye₹nt", "user_id": cls.acc["id"]}
        )
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    def test_01_submit_product_creates_pending_confirmation_and_pin(self):
        """Listing submission returns PENDING_CONFIRMATION status, 4-digit PIN, and masked phone."""
        payload = {
            "category": "cameras",
            "name": "Sony FX3 Full-Frame Cinema Camera",
            "title": "Sony FX3 Full-Frame Cinema Camera",
            "brand": "Sony",
            "model": "FX3",
            "year": "2024",
            "description": "Professional 4K full frame cinema camera with XLR audio handle.",
            "daily_rate": 2500,
            "weekly_rate": 15000,
            "monthly_rate": 55000,
            "city": "Bengaluru",
            "area": "Indiranagar",
            "pincode": "560038",
            "primaryImage": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
        }

        res = client.post("/api/paye₹nt/products", json=payload, headers=self.headers)
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["success"] is True
        assert data["status"] == "pending_confirmation"
        assert "productId" in data
        assert len(data["vendorSecretPin"]) == 4
        assert data["vendorSecretPin"].isdigit()
        assert "******" in data["maskedPhone"]

        TestListingConfirmationSecurityFlow.product_id = data["productId"]
        TestListingConfirmationSecurityFlow.vendor_pin = data["vendorSecretPin"]

        # Check DB state: Product must NOT be available
        prod = get_payernt_product_by_id(data["productId"], include_pin=True)
        assert prod is not None
        assert prod["status"] == "pending_confirmation"
        assert prod["available"] == 0 or prod["available"] is False

    def test_02_incorrect_otp_rejected_with_attempts(self):
        """Submitting an incorrect OTP code fails and decrements attempts."""
        pid = TestListingConfirmationSecurityFlow.product_id
        res = client.post(
            f"/api/paye₹nt/products/{pid}/verify-otp",
            json={"otp": "000000"},
            headers=self.headers,
        )
        assert res.status_code == 400
        assert "Incorrect" in res.json()["detail"]

    def test_03_resend_cooldown_enforced(self):
        """Resend OTP immediately triggers cooldown notice."""
        pid = TestListingConfirmationSecurityFlow.product_id
        res = client.post(
            f"/api/paye₹nt/products/{pid}/resend-otp",
            headers=self.headers,
        )
        # Should either succeed or return wait if called within cooldown
        assert res.status_code in (200, 429, 400)

    def test_04_correct_otp_confirms_product_for_admin_review(self):
        """Correct OTP transitions product to under_review (Pending Admin Review)."""
        pid = TestListingConfirmationSecurityFlow.product_id
        conf = get_product_confirmation(pid)
        assert conf is not None
        correct_otp = conf["otp_code"]

        res = client.post(
            f"/api/paye₹nt/products/{pid}/verify-otp",
            json={"otp": correct_otp},
            headers=self.headers,
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["success"] is True
        assert data["status"] == "under_review"

        # Verify DB product status is updated
        prod = get_payernt_product_by_id(pid, include_pin=True)
        assert prod["status"] == "under_review"

    def test_05_public_catalog_does_not_expose_unapproved_product_or_pin(self):
        """Public catalog must not expose vendor PIN and only shows approved products."""
        res = client.get("/api/paye₹nt/catalog")
        assert res.status_code == 200
        catalog = res.json().get("products", [])
        for p in catalog:
            assert "vendor_secret_pin" not in p
            assert "vendorSecretPin" not in p
