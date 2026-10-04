import os
import sys
import datetime
import random
import pytest

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app, create_access_token
from database import execute_query, get_db_connection, update_delivery_status
from payernt_database import create_payernt_account, create_payernt_product

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_handover_test_data():
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Ensure Admin user exists
    execute_query("""
        INSERT INTO users (email, password_hash, full_name, phone, role, verified, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE role = 'admin'
    """, ("admin@payent.com", "hash", "Admin User", "+919999999999", "admin", 1, now_str))
    
    # 1. Create a Vendor User
    vendor_email = f"vendor_{random.randint(10000, 99999)}@payernt.com"
    vendor_user = create_payernt_account(
        "Test Master Vendor",
        vendor_email,
        "123456789012",
        "9876543210",
        "Madhapur IT SEZ, Hyderabad",
        "500081",
        "SecureVendorPass!2026"
    )
    
    # 2. Create a Renter User
    renter_email = f"renter_{random.randint(10000, 99999)}@payrent.com"
    execute_query("""
        INSERT INTO users (email, password_hash, full_name, phone, role, verified, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (renter_email, "hash", "Test Renter", "+919123456780", "customer", 1, now_str))
    
    # 3. Create a Product
    prod_id = f"p-handover-{random.randint(1000, 9999)}"
    create_payernt_product(
        vendor_user["id"],
        vendor_email,
        "Test Master Vendor",
        {
            "id": prod_id,
            "title": "Sony Alpha A7 IV Kit",
            "description": "Professional 4K camera gear",
            "category": "Cameras",
            "price": 2500,
            "security_deposit": 0,
            "status": "active",
            "is_available": True,
            "images": ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32"],
            "created_at": now_str
        }
    )
    
    yield {
        "vendor": vendor_user,
        "vendor_email": vendor_email,
        "renter_email": renter_email,
        "product_id": prod_id
    }

def test_full_handover_and_rental_activation_lifecycle(setup_handover_test_data):
    data = setup_handover_test_data
    vendor_email = data["vendor_email"]
    renter_email = data["renter_email"]
    product_id = data["product_id"]
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # --- Step 1: Create Booking ---
    booking_id = f"bkg-test-{random.randint(10000, 99999)}"
    execute_query("""
        INSERT INTO orders (id, user_email, product_id, product_title, product_image, total, start_date, end_date, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (booking_id, renter_email, product_id, "Sony Alpha A7 IV Kit", "https://img.com", 5000, "2026-10-05", "2026-10-07", "confirmed", now_str))
    
    # Create initial delivery record
    execute_query("""
        INSERT INTO deliveries (id, booking_id, status, vendor_id, renter_id, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (f"del-{random.randint(1000, 9999)}", booking_id, "WAITING_FOR_ADMIN", vendor_email, renter_email, now_str, now_str))
    
    # --- Step 2: Admin Workflow ---
    from main import create_access_token
    admin_token = create_access_token({"sub": "admin@payent.com", "role": "admin"})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Admin processes booking
    proc_res = client.post(f"/api/admin/bookings/{booking_id}/process", headers=admin_headers)
    assert proc_res.status_code == 200
    assert proc_res.json()["deliveryStatus"] == "ADMIN_PROCESSING"
    
    # Admin notifies vendor
    notif_res = client.post(f"/api/admin/bookings/{booking_id}/notify-vendor", headers=admin_headers)
    assert notif_res.status_code == 200
    assert notif_res.json()["deliveryStatus"] == "READY_FOR_VENDOR"
    
    # Admin assigns delivery boy
    assign_res = client.post(f"/api/admin/bookings/{booking_id}/assign-delivery", json={
        "deliveryBoyName": "Ramesh Express",
        "deliveryBoyPhone": "+91 99887 76655"
    }, headers=admin_headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["deliveryBoyName"] == "Ramesh Express"
    
    # --- Step 3: Vendor Prepares Product & Generates 4-Digit Vendor Secret PIN ---
    vendor_token = create_access_token({"sub": vendor_email, "email": vendor_email, "role": "vendor"})
    vendor_headers = {"Authorization": f"Bearer {vendor_token}"}
    
    prep_res = client.post(f"/api/payernt/bookings/{booking_id}/prepare", headers=vendor_headers)
    assert prep_res.status_code == 200
    prep_data = prep_res.json()
    assert prep_data["success"] is True
    assert prep_data["deliveryStatus"] == "WAITING_FOR_DELIVERY_BOY"
    vendor_pin = prep_data["vendorSecretPin"]
    assert len(vendor_pin) == 4
    assert vendor_pin.isdigit()
    
    # --- Step 4: Delivery Boy Pickup from Vendor (Vendor Handover OTP) ---
    send_v_otp = client.post(f"/api/deliveries/{booking_id}/vendor-otp/send", headers=vendor_headers)
    assert send_v_otp.status_code == 200
    assert send_v_otp.json()["success"] is True
    
    # Verify OTP
    verify_v_otp = client.post(f"/api/deliveries/{booking_id}/vendor-otp/verify", json={"otp": "123456"}, headers=vendor_headers)
    assert verify_v_otp.status_code == 200
    assert verify_v_otp.json()["deliveryStatus"] in ("PICKED_UP_FROM_VENDOR", "OUT_FOR_DELIVERY")
    assert verify_v_otp.json()["vendorHandoverVerified"] is True
    
    # Courier transitions to OUT_FOR_DELIVERY
    update_delivery_status(booking_id, "OUT_FOR_DELIVERY")
    
    # --- Step 5: Delivery Boy Arrives at Renter & Renter Handover OTP ---
    # Transition delivery to ARRIVED_AT_RENTER
    update_delivery_status(booking_id, "ARRIVED_AT_RENTER")
    
    renter_token = create_access_token({"sub": renter_email, "email": renter_email, "role": "customer"})
    renter_headers = {"Authorization": f"Bearer {renter_token}"}
    
    send_r_otp = client.post(f"/api/deliveries/{booking_id}/renter-otp/send", headers=renter_headers)
    assert send_r_otp.status_code == 200
    assert send_r_otp.json()["success"] is True
    
    # Renter verifies OTP and gets 4-Digit Renter Secret PIN
    verify_r_otp = client.post(f"/api/deliveries/{booking_id}/renter-otp/verify", json={"otp": "123456"}, headers=renter_headers)
    assert verify_r_otp.status_code == 200
    r_otp_data = verify_r_otp.json()
    assert r_otp_data["success"] is True
    renter_pin = r_otp_data["renterSecretPin"]
    assert len(renter_pin) == 4
    assert renter_pin.isdigit()
    
    # --- Step 6: Transactional Rental Activation & Idempotent Earnings ---
    act_res = client.post(f"/api/bookings/{booking_id}/activate-rental", json={"renterPin": renter_pin}, headers=renter_headers)
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert act_data["success"] is True
    assert act_data["rentalStatus"] == "active"
    assert act_data["deliveryStatus"] == "COMPLETED"
    assert "rentalStartedAt" in act_data
    
    # --- Step 7: Verify Idempotency ---
    # Calling activate-rental a second time must return existing active state with NO duplicate earnings
    act_res_2 = client.post(f"/api/bookings/{booking_id}/activate-rental", json={"renterPin": renter_pin}, headers=renter_headers)
    assert act_res_2.status_code == 200
    assert act_res_2.json()["success"] is True
    
    # Check that only ONE pending earning transaction was created for this booking
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as cnt FROM payernt_wallet_transactions WHERE booking_id = %s", (booking_id,))
            row = cursor.fetchone()
            assert row["cnt"] == 1
    finally:
        conn.close()
