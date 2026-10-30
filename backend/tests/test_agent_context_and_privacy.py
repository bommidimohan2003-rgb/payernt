"""
PAYENT AGENT — PHASE 3 TEST SUITE: CONTEXT & PRIVACY
Validates:
1. AgentSessionContext creation from guest, tokens, and verified dictionaries.
2. Ownership verification logic for users, bookings, and deliveries.
3. Strict sensitive data redaction (Aadhaar, PAN, Card, OTP, PIN, Passwords).
4. Purging of vendor_secret_pin from booking and product projections.
"""

import pytest
from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_auth_token,
    from_user_dict,
)
from agent_engine.privacy import (
    mask_aadhaar,
    mask_card,
    mask_pan,
    mask_sensitive_text,
    sanitize_booking_record,
    sanitize_delivery_record,
    sanitize_dict_fields,
    sanitize_kyc_record,
    sanitize_product_record,
    sanitize_user_record,
)
from auth import create_access_token


def test_guest_context_properties():
    ctx = create_guest_context("guest_session_123")
    assert ctx.is_authenticated is False
    assert ctx.is_admin is False
    assert ctx.is_vendor is False
    assert ctx.role == "guest"
    assert ctx.user_email is None
    assert ctx.session_id == "guest_session_123"
    assert ctx.can_access_user_data("user@payent.test") is False


def test_auth_token_context_renter():
    token = create_access_token({
        "sub": "renter_alice@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })
    ctx = from_auth_token(token, "sess_alice")
    assert ctx.is_authenticated is True
    assert ctx.user_email == "renter_alice@payent.test"
    assert ctx.role == "customer"
    assert ctx.is_admin is False
    assert ctx.is_vendor is False
    assert ctx.can_access_user_data("renter_alice@payent.test") is True
    assert ctx.can_access_user_data("intruder@payent.test") is False


def test_auth_token_context_vendor():
    token = create_access_token({
        "sub": "lender_bob@payent.test",
        "user_id": "vendor_bob_01",
        "role": "vendor",
        "account_type": "paye₹nt"
    })
    ctx = from_auth_token(token, "sess_bob")
    assert ctx.is_authenticated is True
    assert ctx.is_vendor is True
    assert ctx.is_admin is False
    assert ctx.user_id == "vendor_bob_01"


def test_auth_token_context_admin():
    token = create_access_token({
        "sub": "admin_carol@payent.test",
        "role": "admin",
        "account_type": "payrent"
    })
    ctx = from_auth_token(token, "sess_admin")
    assert ctx.is_authenticated is True
    assert ctx.is_admin is True
    assert ctx.can_access_user_data("any_user@payent.test") is True


def test_booking_ownership_validation():
    renter_ctx = from_user_dict({
        "email": "renter@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })
    vendor_ctx = from_user_dict({
        "email": "vendor@payent.test",
        "id": "v_100",
        "role": "vendor",
        "account_type": "payernt"
    })
    stranger_ctx = from_user_dict({
        "email": "stranger@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })
    guest_ctx = create_guest_context()

    booking = {
        "id": "ord_12345",
        "user_email": "renter@payent.test",
        "lender_email": "vendor@payent.test",
        "vendor_id": "v_100",
        "status": "pending"
    }

    assert renter_ctx.can_access_booking(booking) is True
    assert vendor_ctx.can_access_booking(booking) is True
    assert stranger_ctx.can_access_booking(booking) is False
    assert guest_ctx.can_access_booking(booking) is False


def test_sensitive_masking_helpers():
    assert mask_aadhaar("123456789012") == "XXXX-XXXX-9012"
    assert mask_pan("ABCDE1234F") == "XXXXXX1234"
    assert mask_card("1234567890123456") == "XXXX-XXXX-XXXX-3456"

    text = "My Aadhaar is 1234-5678-9012 and PAN is ABCDE1234F"
    masked = mask_sensitive_text(text)
    assert "1234-5678-9012" not in masked
    assert "ABCDE1234F" not in masked
    assert "[REDACTED_AADHAAR]" in masked
    assert "[REDACTED_PAN]" in masked


def test_booking_record_purges_vendor_secret_pin():
    raw_booking = {
        "id": "ord_secure_01",
        "productId": "prod_camera",
        "productTitle": "Sony FX3",
        "vendor_secret_pin": "4819",
        "vendorSecretPin": "4819",
        "pin": "4819",
        "password_hash": "$2b$12$secretHash",
        "total": 5000,
        "status": "pending"
    }
    sanitized = sanitize_booking_record(raw_booking)
    assert "vendor_secret_pin" not in sanitized
    assert "vendorSecretPin" not in sanitized
    assert "pin" not in sanitized
    assert "password_hash" not in sanitized
    assert "4819" not in str(sanitized)
    assert sanitized["booking_id"] == "ord_secure_01"
    assert sanitized["total_amount"] == 5000


def test_product_record_purges_vendor_pin():
    raw_product = {
        "id": "prod_dji_01",
        "name": "DJI Mini 4 Pro",
        "vendor_secret_pin": "9921",
        "price": 2500,
        "available": True
    }
    sanitized = sanitize_product_record(raw_product)
    assert "vendor_secret_pin" not in sanitized
    assert "9921" not in str(sanitized)
    assert sanitized["daily_rate"] == 2500


def test_kyc_record_sanitization():
    raw_kyc = {
        "status": "APPROVED",
        "accountType": "payrent",
        "expectedDocumentType": "PAN",
        "maskedNumber": "ABCDE1234F"
    }
    sanitized = sanitize_kyc_record(raw_kyc)
    assert sanitized["status"] == "APPROVED"
    assert sanitized["is_approved"] is True
    assert sanitized["document_type"] == "PAN"
    assert sanitized["masked_document_number"] == "XXXXXX1234"
