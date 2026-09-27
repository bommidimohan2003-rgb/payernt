import pytest
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from payernt_database import (
    check_registration_identity,
    get_db_connection,
)

client = TestClient(app)

def setup_module():
    """Ensure clean test data in shared database."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cursor:
            # Clean any old test users
            cursor.execute("DELETE FROM users WHERE email IN ('cross_test_1@example.com', 'cross_test_2@example.com')")
            cursor.execute("DELETE FROM payernt_accounts WHERE email IN ('cross_test_1@example.com', 'cross_test_2@example.com')")
            
            # 1. Insert an existing paye₹nt vendor account
            cursor.execute("""
                INSERT INTO payernt_accounts (
                    id, name, email, phone, aadhaar_number, password_hash,
                    address, pincode, status, person_id, created_at
                ) VALUES (
                    'PAYERNT_TEST_01', 'Ramesh Kumar', 'cross_test_1@example.com', '9876543210', '123456789012',
                    '$2b$12$eX4mP1eH4sH...', '123 Beach Road, MVP Colony', '530017', 'active', 'PERSON_TEST_RAMESH_1', NOW()
                )
            """)

            # 2. Insert an existing user who has BOTH accounts
            cursor.execute("""
                INSERT INTO users (
                    email, full_name, phone, pan_number, password_hash,
                    address, city, pincode, person_id, created_at
                ) VALUES (
                    'cross_test_2@example.com', 'Sita Sharma', '9123456780', 'ABCDE1234F',
                    '$2b$12$eX4mP1eH4sH...', '456 Hill View, Gajuwaka', 'Visakhapatnam', '530026', 'PERSON_TEST_SITA_2', NOW()
                )
            """)
            cursor.execute("""
                INSERT INTO payernt_accounts (
                    id, name, email, phone, aadhaar_number, password_hash,
                    address, pincode, status, person_id, created_at
                ) VALUES (
                    'PAYERNT_TEST_02', 'Sita Sharma', 'cross_test_2@example.com', '9123456780', '987654321098',
                    '$2b$12$eX4mP1eH4sH...', '456 Hill View, Gajuwaka', '530026', 'active', 'PERSON_TEST_SITA_2', NOW()
                )
            """)
            conn.commit()
    finally:
        conn.close()

def teardown_module():
    """Cleanup test accounts."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE email IN ('cross_test_1@example.com', 'cross_test_2@example.com')")
            cursor.execute("DELETE FROM payernt_accounts WHERE email IN ('cross_test_1@example.com', 'cross_test_2@example.com')")
            conn.commit()
    finally:
        conn.close()

def test_1_existing_payernt_check_payrent():
    """TEST 1: Existing paye₹nt -> create pay₹ent -> CHECK -> found, safe prefill, targetAccountExists=false."""
    response = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Ramesh Kumar",
            "mobile": "9876543210",
            "email": "cross_test_1@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["found"] is True
    assert data["paye₹ntExists"] is True
    assert data["pay₹entExists"] is False
    assert data["targetAccountExists"] is False
    assert "prefill" in data
    assert data["prefill"]["name"] == "Ramesh Kumar"
    assert data["prefill"]["email"] == "cross_test_1@example.com"
    assert data["prefill"]["mobile"] == "9876543210"
    assert data["prefill"]["address"] == "123 Beach Road, MVP Colony"
    assert data["prefill"]["pincode"] == "530017"
    
    # CRITICAL SECURITY VERIFICATION: No sensitive data exposed
    assert "password" not in data
    assert "password_hash" not in data
    assert "passwordHash" not in data
    assert "aadhaar" not in data["prefill"]
    assert "aadhaar_number" not in data["prefill"]
    assert "pan" not in data["prefill"]
    assert "otp" not in data
    assert "secret_pin" not in data

def test_2_existing_payernt_check_from_payernt_router():
    """TEST 2: Check endpoint accessible from /api/paye₹nt/auth/check-registration."""
    response = client.post(
        "/api/paye₹nt/auth/check-registration",
        json={
            "name": "Ramesh Kumar",
            "mobile": "9876543210",
            "email": "cross_test_1@example.com",
            "targetAccountType": "paye₹nt",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["found"] is True
    assert data["paye₹ntExists"] is True
    # Target is paye₹nt and it already exists!
    assert data["targetAccountExists"] is True

def test_3_both_accounts_exist():
    """TEST 3: Existing paye₹nt + pay₹ent -> targetAccountExists=true, do not create duplicate."""
    response = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Sita Sharma",
            "mobile": "9123456780",
            "email": "cross_test_2@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["found"] is True
    assert data["paye₹ntExists"] is True
    assert data["pay₹entExists"] is True
    assert data["targetAccountExists"] is True

def test_4_new_user_not_found():
    """TEST 4: New user -> not found -> normal registration allowed."""
    response = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Unknown User",
            "mobile": "9999900000",
            "email": "unknown_unique_xyz@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["found"] is False
    assert data["paye₹ntExists"] is False
    assert data["pay₹entExists"] is False
    assert data["targetAccountExists"] is False

def test_5_wrong_name_must_not_match():
    """TEST 5: Wrong name + correct mobile + correct email -> MUST NOT treat as matching identity."""
    response = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Completely Wrong Name",
            "mobile": "9876543210",
            "email": "cross_test_1@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert data["targetAccountExists"] is False

def test_6_wrong_mobile_must_not_match():
    """TEST 6: Correct name + wrong mobile + correct email -> MUST NOT treat as matching identity."""
    response = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Ramesh Kumar",
            "mobile": "9000000000",
            "email": "cross_test_1@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert data["targetAccountExists"] is False

def test_7_wrong_email_must_not_match():
    """TEST 7: Correct name + correct mobile + wrong email -> MUST NOT treat as matching identity."""
    response = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Ramesh Kumar",
            "mobile": "9876543210",
            "email": "different_email_random@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is False
    assert data["targetAccountExists"] is False

def test_8_end_to_end_check_to_create_payrent_from_payernt():
    """TEST 8: Complete CHECK -> Details Autofill -> Password Entry -> Create pay₹ent -> DB verified -> Independent Logins."""
    # 1. CHECK on pay₹ent registration for existing Ramesh Kumar (paye₹nt)
    check_res = client.post(
        "/api/auth/check-registration",
        json={
            "name": "Ramesh Kumar",
            "mobile": "9876543210",
            "email": "cross_test_1@example.com",
            "targetAccountType": "pay₹ent",
        },
    )
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["found"] is True
    assert check_data["paye₹ntExists"] is True
    assert check_data["pay₹entExists"] is False
    assert check_data["targetAccountExists"] is False
    prefill = check_data["prefill"]
    assert prefill["name"] == "Ramesh Kumar"
    assert prefill["address"] == "123 Beach Road, MVP Colony"
    assert prefill["pincode"] == "530017"

    # 2. Submit pay₹ent customer account creation with PAN and new password
    customer_pass = "CustomerSecurePass!2026"
    create_res = client.post(
        "/api/register/verify",
        json={
            "email": "cross_test_1@example.com",
            "phone": "9876543210",
            "full_name": prefill["name"],
            "pan_number": "ABCDE1234F",
            "address": prefill["address"],
            "city": "Visakhapatnam",
            "pincode": prefill["pincode"],
            "password": customer_pass,
            "otp": "DIRECT",
            "account_type": "pay₹ent"
        }
    )
    assert create_res.status_code == 201
    create_data = create_res.json()
    assert create_data["success"] is True
    assert create_data["user"]["accountType"] == "pay₹ent"
    assert create_data["user"]["panNumber"] == "ABCDE1234F"
    assert "token" in create_data

    # 3. Database verification: BOTH accounts exist independently in shared DB
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM payernt_accounts WHERE email = 'cross_test_1@example.com'")
            v_acc = cursor.fetchone()
            assert v_acc is not None
            assert v_acc["account_type"] == "paye₹nt"

            cursor.execute("SELECT * FROM users WHERE email = 'cross_test_1@example.com'")
            c_acc = cursor.fetchone()
            assert c_acc is not None
            assert c_acc["account_type"] == "pay₹ent"
            assert c_acc["pan_number"] == "ABCDE1234F"

            # Both accounts share the same person_id
            assert v_acc.get("person_id") is not None
            assert c_acc.get("person_id") is not None
            assert v_acc.get("person_id") == c_acc.get("person_id")
    finally:
        conn.close()

    # 4. Independent login verification
    login_cust = client.post("/api/auth/login", json={
        "email": "cross_test_1@example.com",
        "password": customer_pass
    })
    assert login_cust.status_code == 200
    assert login_cust.json().get("success") is True

    # 5. Duplicate creation blocked on pay₹ent side
    dup_res = client.post(
        "/api/register/verify",
        json={
            "email": "cross_test_1@example.com",
            "phone": "9876543210",
            "full_name": "Ramesh Kumar",
            "pan_number": "ABCDE1234F",
            "password": customer_pass,
            "otp": "DIRECT"
        }
    )
    assert dup_res.status_code == 409

