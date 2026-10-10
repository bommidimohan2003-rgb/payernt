import os
import sys
import pytest
import secrets
import hashlib
import hmac
import time

# Ensure backend directory is on import path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from auth import create_access_token
from config import PIN_HASH_SECRET, IS_MOCK_OTP_MODE, IS_PRODUCTION
from payernt_database import (
    get_or_generate_vendor_secret_pin,
    confirm_renter_inspection,
    get_rental_security_record,
    sanitize_security_record_for_user,
    generate_4digit_pin,
    create_or_get_rental_security_record,
    verify_vendor_pin_backend,
    verify_renter_pin_backend,
    hash_secret_pin,
    verify_secret_pin,
    generate_handover_otp,
    verify_handover_otp,
    get_dev_mock_otp,
    MOCK_HANDOVER_OTPS,
    MOCK_RENTAL_SECURITIES,
)
from database import MOCK_DELIVERIES, MOCK_ORDERS

client = TestClient(app)

def test_pin_generation():
    pin = generate_4digit_pin()
    assert len(pin) == 4
    assert pin.isdigit()

def test_keyed_hmac_pin_hashing_and_verification():
    pin = "7294"
    booking_id = "test_bk_keyed_1"
    
    # Keyed hash with VENDOR stage
    vendor_hash = hash_secret_pin(pin, booking_id, "VENDOR")
    assert vendor_hash != pin
    # Stage separation: RENTER hash for same PIN/booking must differ
    renter_hash = hash_secret_pin(pin, booking_id, "RENTER")
    assert vendor_hash != renter_hash
    
    # Correct verification
    assert verify_secret_pin(pin, vendor_hash, booking_id, "VENDOR") is True
    assert verify_secret_pin("0000", vendor_hash, booking_id, "VENDOR") is False
    assert verify_secret_pin(pin, vendor_hash, booking_id, "RENTER") is False
    
    # Backward compatibility with legacy plain SHA-256
    legacy_hash = hashlib.sha256(pin.encode("utf-8")).hexdigest()
    assert verify_secret_pin(pin, legacy_hash, booking_id, "VENDOR") is True

def test_pin_failed_attempts_lockout():
    test_booking_id = f"test_bk_lockout_{secrets.token_hex(4)}"
    test_vendor_id = f"test_v_{secrets.token_hex(4)}"
    
    sec = create_or_get_rental_security_record(test_booking_id, "prod_1", test_vendor_id, "renter_1")
    sec["failed_pin_attempts"] = 0
    sec["vendor_secret_pin"] = "4321"
    sec["vendor_pin_hash"] = hash_secret_pin("4321", test_booking_id, "VENDOR")
    MOCK_RENTAL_SECURITIES[test_booking_id] = sec
    
    # Attempt 1: Wrong PIN
    ok1, msg1, _ = verify_vendor_pin_backend(test_booking_id, "0000", test_vendor_id)
    assert ok1 is False
    assert "2 attempt(s) remaining" in msg1
    
    # Attempt 2: Wrong PIN
    ok2, msg2, _ = verify_vendor_pin_backend(test_booking_id, "0000", test_vendor_id)
    assert ok2 is False
    assert "1 attempt(s) remaining" in msg2
    
    # Attempt 3: Wrong PIN
    ok3, msg3, _ = verify_vendor_pin_backend(test_booking_id, "0000", test_vendor_id)
    assert ok3 is False
    assert "0 attempt(s) remaining" in msg3
    
    # Attempt 4: Even with correct PIN, must be locked out
    ok4, msg4, _ = verify_vendor_pin_backend(test_booking_id, "4321", test_vendor_id)
    assert ok4 is False
    assert "locked" in msg4.lower()

def test_otp_response_leakage_prevention():
    test_booking_id = f"test_bk_leak_{secrets.token_hex(4)}"
    res = generate_handover_otp(test_booking_id, "vendor_1", "+919876543210", "VENDOR_HANDOVER")
    
    assert res["success"] is True
    assert "targetPhoneMasked" in res
    assert res["targetPhoneMasked"].endswith("3210")
    # Plaintext "otp" or "otp_code" must never be returned in default response
    assert "otp" not in res
    assert "otp_code" not in res
    if IS_MOCK_OTP_MODE:
        assert "no sms sent" in res["message"].lower()

def test_dev_mock_otp_retrieval_and_endpoint():
    booking_id = f"test_dev_endpoint_{secrets.token_hex(4)}"
    gen_res = generate_handover_otp(booking_id, "vendor_1", "+919876543210", "VENDOR_HANDOVER")
    assert gen_res["success"] is True
    
    # 1. Retrieve via backend helper
    mock_otp = get_dev_mock_otp(booking_id, "VENDOR_HANDOVER")
    assert mock_otp is not None
    assert len(mock_otp) == 6
    assert mock_otp.isdigit()
    
    # 2. Retrieve via dev endpoint with auth
    dev_token = create_access_token({"sub": "dev@payent.in", "user_id": "dev_user", "role": "admin"})
    headers = {"Authorization": f"Bearer {dev_token}"}
    
    dev_res = client.get(f"/api/deliveries/dev/mock-otps/{booking_id}/VENDOR_HANDOVER", headers=headers)
    assert dev_res.status_code == 200
    assert dev_res.json()["mockOtp"] == mock_otp
    assert dev_res.json()["label"] == "MOCK OTP — Development Only"
    assert "No SMS was sent" in dev_res.json()["notice"]

def test_complete_phase12_2_mock_otp_and_delivery_lifecycle():
    booking_id = f"test_bk_lifecycle_{secrets.token_hex(4)}"
    vendor_id = f"v_{secrets.token_hex(3)}"
    renter_id = f"r_{secrets.token_hex(3)}"
    courier_id = f"courier_{secrets.token_hex(3)}"
    
    # Setup initial mock delivery and rental security
    MOCK_DELIVERIES[booking_id] = {
        "id": f"del_{booking_id}",
        "booking_id": booking_id,
        "delivery_boy_id": courier_id,
        "status": "READY",
    }
    sec = create_or_get_rental_security_record(booking_id, "prod_1", vendor_id, renter_id)
    MOCK_RENTAL_SECURITIES[booking_id] = sec
    
    courier_token = create_access_token({"sub": f"{courier_id}@payent.in", "user_id": courier_id, "role": "courier"})
    headers = {"Authorization": f"Bearer {courier_token}"}
    
    # 1. Generate Vendor Secret PIN
    ok_vpin, msg_vpin, v_pin_res = get_or_generate_vendor_secret_pin(booking_id, vendor_id, f"{vendor_id}@payent.in")
    assert ok_vpin is True
    assert v_pin_res is not None
    assert len(v_pin_res["vendorSecretPin"]) == 4
    
    # 2. Request mock Vendor OTP
    res_send_v = client.post(f"/api/deliveries/{booking_id}/vendor-otp/send", headers=headers, json={})
    assert res_send_v.status_code == 200
    assert res_send_v.json()["success"] is True
    assert "otp" not in res_send_v.json()
    
    # 3. Retrieve mock Vendor OTP through dev mechanism
    v_otp = get_dev_mock_otp(booking_id, "VENDOR_HANDOVER")
    assert v_otp is not None
    assert len(v_otp) == 6
    
    # 4. Verify wrong OTP is rejected
    wrong_otp = "000000" if v_otp != "000000" else "111111"
    res_verify_wrong = client.post(f"/api/deliveries/{booking_id}/vendor-otp/verify", headers=headers, json={"otp": wrong_otp})
    assert res_verify_wrong.status_code == 400
    assert "Incorrect OTP code" in res_verify_wrong.json()["detail"]
    
    # 5. Verify Vendor OTP with correct mock OTP
    res_verify_v = client.post(f"/api/deliveries/{booking_id}/vendor-otp/verify", headers=headers, json={"otp": v_otp})
    assert res_verify_v.status_code == 200
    assert res_verify_v.json()["deliveryStatus"] == "PICKED_UP_FROM_VENDOR"
    assert res_verify_v.json()["vendorHandoverVerified"] is True
    
    # 6. Request separate mock Renter OTP
    res_send_r = client.post(f"/api/deliveries/{booking_id}/renter-otp/send", headers=headers, json={})
    assert res_send_r.status_code == 200
    assert res_send_r.json()["success"] is True
    
    # 7. Retrieve mock Renter OTP and verify separation
    r_otp = get_dev_mock_otp(booking_id, "RENTER_HANDOVER")
    assert r_otp is not None
    assert len(r_otp) == 6
    
    # Verify Renter OTP with Vendor OTP must fail (different purpose / token separation)
    if r_otp != v_otp:
        res_cross_verify = client.post(f"/api/deliveries/{booking_id}/renter-otp/verify", headers=headers, json={"otp": v_otp})
        assert res_cross_verify.status_code == 400
    
    # 8. Verify Renter OTP with correct mock OTP
    res_verify_r = client.post(f"/api/deliveries/{booking_id}/renter-otp/verify", headers=headers, json={"otp": r_otp})
    assert res_verify_r.status_code == 200
    assert res_verify_r.json()["deliveryStatus"] == "RENTER_VERIFIED"
    assert res_verify_r.json()["renterHandoverVerified"] is True
    
    # 9. Complete renter inspection checklist
    checklist = {
        "received": True,
        "matchesBooking": True,
        "accessoriesChecked": True,
        "conditionChecked": True,
    }
    ok_insp, msg_insp, res_insp = confirm_renter_inspection(booking_id, renter_id, f"{renter_id}@payent.in", checklist)
    assert ok_insp is True
    assert "renterSecretPin" in res_insp
    assert len(res_insp["renterSecretPin"]) == 4
    
    # 10. Generate the separate Renter Secret PIN confirmed
    renter_pin = res_insp["renterSecretPin"]
    assert renter_pin != v_pin_res["vendorSecretPin"]

def test_otp_single_use_and_lockout_guards():
    booking_id = f"test_bk_guards_{secrets.token_hex(4)}"
    generate_handover_otp(booking_id, "user_1", "+919876543210", "VENDOR_HANDOVER")
    otp_code = get_dev_mock_otp(booking_id, "VENDOR_HANDOVER")
    assert otp_code is not None
    
    # Verify successfully
    ok, msg, _ = verify_handover_otp(booking_id, "VENDOR_HANDOVER", otp_code)
    assert ok is True
    
    # Single-use: Attempting to verify same OTP again must be rejected
    ok_reuse, msg_reuse, _ = verify_handover_otp(booking_id, "VENDOR_HANDOVER", otp_code)
    assert ok_reuse is False
    assert "already been verified" in msg_reuse.lower()
    
    # Lockout test: New booking with 5 wrong attempts
    lockout_booking_id = f"test_bk_lockout_{secrets.token_hex(4)}"
    generate_handover_otp(lockout_booking_id, "user_2", "+919876543210", "VENDOR_HANDOVER")
    real_otp = get_dev_mock_otp(lockout_booking_id, "VENDOR_HANDOVER")
    wrong_code = "999999" if real_otp != "999999" else "888888"
    
    for i in range(1, 5):
        ok_w, msg_w, _ = verify_handover_otp(lockout_booking_id, "VENDOR_HANDOVER", wrong_code)
        assert ok_w is False
        assert f"{5 - i} attempt(s) remaining" in msg_w
        
    # 5th attempt locks out
    ok_w5, msg_w5, _ = verify_handover_otp(lockout_booking_id, "VENDOR_HANDOVER", wrong_code)
    assert ok_w5 is False
    assert "locked" in msg_w5.lower()
    
    # Even correct OTP now rejected due to lockout
    ok_lock, msg_lock, _ = verify_handover_otp(lockout_booking_id, "VENDOR_HANDOVER", real_otp)
    assert ok_lock is False
    assert "locked" in msg_lock.lower()


def test_cooldown_and_expiry_guards():
    booking_id = f"test_bk_cooldown_{secrets.token_hex(4)}"
    
    # 1. First OTP generation
    res1 = generate_handover_otp(booking_id, "user_1", "+919876543210", "VENDOR_HANDOVER")
    assert res1["success"] is True
    
    # 2. Resend immediately -> Cooldown triggered (< 60s elapsed)
    res2 = generate_handover_otp(booking_id, "user_1", "+919876543210", "VENDOR_HANDOVER")
    assert res2["success"] is True
    assert "wait 60s" in res2["message"].lower() or "recently" in res2["message"].lower() or "already sent" in res2["message"].lower()
    
    # 3. Expiry test
    exp_booking_id = f"test_bk_exp_{secrets.token_hex(4)}"
    generate_handover_otp(exp_booking_id, "user_exp", "+919876543210", "VENDOR_HANDOVER")
    exp_otp = get_dev_mock_otp(exp_booking_id, "VENDOR_HANDOVER")
    assert exp_otp is not None
    
    # Artificially expire record
    key = f"{exp_booking_id}_VENDOR_HANDOVER"
    if key in MOCK_HANDOVER_OTPS:
        MOCK_HANDOVER_OTPS[key]["expires_at"] = int(time.time()) - 10
        
    ok_exp, msg_exp, _ = verify_handover_otp(exp_booking_id, "VENDOR_HANDOVER", exp_otp)
    assert ok_exp is False
    assert "expired" in msg_exp.lower()


def test_unassigned_courier_and_unauthenticated_rejected():
    booking_id = f"test_bk_auth_{secrets.token_hex(4)}"
    
    # Unauthenticated -> 401
    res_unauth = client.post(f"/api/deliveries/{booking_id}/vendor-otp/send", json={})
    assert res_unauth.status_code == 401
    
    # Create delivery assigned to "assigned_agent"
    MOCK_DELIVERIES[booking_id] = {
        "id": f"del_{booking_id}",
        "booking_id": booking_id,
        "delivery_boy_id": "assigned_agent",
        "status": "READY",
    }
    
    # Unauthorized agent -> 403
    unauth_token = create_access_token({"sub": "intruder@payent.in", "user_id": "other_agent", "role": "courier"})
    headers = {"Authorization": f"Bearer {unauth_token}"}
    
    res_forbidden = client.post(f"/api/deliveries/{booking_id}/vendor-otp/send", headers=headers, json={})
    assert res_forbidden.status_code == 403
    assert "not assigned" in res_forbidden.json()["detail"].lower()

