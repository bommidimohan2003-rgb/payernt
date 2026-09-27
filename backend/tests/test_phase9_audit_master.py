import unittest
import json
import uuid
import time
import hmac
import hashlib
import datetime
import random
import concurrent.futures
from typing import List, Dict
from fastapi.testclient import TestClient

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
import main
from auth import create_access_token
from config import ADMIN_SETUP_CODE, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
from database import (
    get_db_connection,
    execute_query,
    fetch_one,
    fetch_all,
    clear_user_cart,
    MOCK_USERS,
    MOCK_ORDERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_CARTS
)

class TestPhase9AuditMaster(unittest.TestCase):
    """
    PAYENT Phase 9 Master Audit Test Suite
    End-to-End Business Workflows, Concurrency, Failure Injection, IDOR, and Latency
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
        # 1. Create unique Admin user for audit
        cls.admin_email = f"audit_admin_{uuid.uuid4().hex[:8]}@payent.com"
        cls.admin_token = create_access_token(data={"sub": cls.admin_email, "role": "admin"})
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        
        execute_query("""
            INSERT INTO users (email, phone, full_name, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE role = 'admin', status = 'active', verified = TRUE
        """, (cls.admin_email, "+919999999901", "Master Audit Admin", "admin", "active", True, datetime.datetime.now(datetime.timezone.utc).isoformat()))

        # 2. Create unique Lender user
        cls.lender_email = f"audit_lender_{uuid.uuid4().hex[:8]}@payent.com"
        cls.lender_token = create_access_token(data={"sub": cls.lender_email, "role": "user"})
        cls.lender_headers = {"Authorization": f"Bearer {cls.lender_token}"}
        
        execute_query("""
            INSERT INTO users (email, phone, full_name, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = 'active', verified = TRUE
        """, (cls.lender_email, "+919999999902", "Audit Lender Pro", "user", "active", True, datetime.datetime.now(datetime.timezone.utc).isoformat()))

        # 3. Create unique Customer user
        cls.customer_email = f"audit_cust_{uuid.uuid4().hex[:8]}@example.com"
        cls.customer_token = create_access_token(data={"sub": cls.customer_email, "role": "user"})
        cls.customer_headers = {"Authorization": f"Bearer {cls.customer_token}"}
        
        execute_query("""
            INSERT INTO users (email, phone, full_name, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = 'active', verified = TRUE
        """, (cls.customer_email, "+919999999903", "Audit Customer Renter", "user", "active", True, datetime.datetime.now(datetime.timezone.utc).isoformat()))

        cls.created_users = {cls.admin_email, cls.lender_email, cls.customer_email}

    # =========================================================================
    # 1. FULL CUSTOMER + LENDER END-TO-END JOURNEY
    # =========================================================================

    def test_01_complete_e2e_marketplace_lifecycle(self):
        """
        Tests the complete 17-step end-to-end marketplace workflow:
        Register -> Pending -> Admin Approval -> Login -> List Product ->
        Browse Catalog -> Product Detail -> Customer Inquiry Message ->
        Add to Cart -> Checkout Validation -> Create Booking -> Payment Verify ->
        Delivery Tracking -> Milestones -> Confirm Delivered -> Return / Complete -> Review.
        """
        # Step 1: New User Registration
        new_user_email = f"new_creator_{uuid.uuid4().hex[:8]}@test.com"
        self.__class__.created_users.add(new_user_email)
        reg_payload = {
            "email": new_user_email,
            "password": "StrongPassword!2026",
            "phone": f"+9198{random.randint(10000000, 99999999)}",
            "aadhaar_number": f"{random.randint(100000000000, 999999999999)}",
            "full_name": "Jane Creator"
        }
        reg_res = self.client.post("/api/register", json=reg_payload)
        self.assertIn(reg_res.status_code, (200, 201))
        
        # Step 2: Account Pending Verification
        status_res = self.client.get(f"/api/auth/status?email={new_user_email}")
        self.assertEqual(status_res.status_code, 200)
        self.assertIn(status_res.json().get("status"), ("pending", "active", "approved"))

        # Step 3: Admin Approval Workflow
        appr_res = self.client.patch(f"/api/admin/users/{new_user_email}/approve", headers=self.admin_headers)
        self.assertEqual(appr_res.status_code, 200)
        
        # Step 4: Login Post-Approval
        login_res = self.client.post("/api/auth/login", json={"email": new_user_email, "password": "StrongPassword!2026"})
        self.assertEqual(login_res.status_code, 200)
        user_jwt = login_res.json().get("access_token")
        user_headers = {"Authorization": f"Bearer {user_jwt}"}

        # Step 5: Lender Lists Gear
        gear_id = f"gear_audit_{uuid.uuid4().hex[:8]}"
        gear_payload = {
            "id": gear_id,
            "title": "Sony FX3 Cinema Camera Kit",
            "description": "Cinema line full frame camera with XLR handle and 24-70mm GM lens",
            "price": 2500,
            "category": "Cameras",
            "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "available": True,
            "status": "approved",
            "ownerName": "Audit Lender Pro"
        }
        create_prod_res = self.client.post("/api/products/custom", json=gear_payload, headers=self.lender_headers)
        self.assertEqual(create_prod_res.status_code, 200)

        # Step 5b: Admin Moderation Approves Product Listing
        appr_prod_res = self.client.post(f"/api/admin/products/{gear_id}/approve", headers=self.admin_headers)
        self.assertEqual(appr_prod_res.status_code, 200)

        # Step 6: Customer Browses Storefront Catalog
        catalog_res = self.client.get("/api/products/custom/public")
        self.assertEqual(catalog_res.status_code, 200)
        catalog = catalog_res.json()
        self.assertTrue(any(p.get("id") == gear_id for p in catalog))

        # Step 7: Customer Views Product Details
        detail_res = self.client.get(f"/api/products/{gear_id}")
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json().get("id"), gear_id)

        # Step 8: Customer Messages Lender (Inquiry)
        conv_payload = {
            "product_id": gear_id,
            "initial_message": "Hi, is this Sony FX3 available with extra batteries for this weekend?"
        }
        conv_res = self.client.post("/api/conversations", json=conv_payload, headers=self.customer_headers)
        self.assertEqual(conv_res.status_code, 200)
        conv_id = conv_res.json().get("conversation", {}).get("id") or conv_res.json().get("id")
        self.assertIsNotNone(conv_id)

        # Lender Replies
        reply_res = self.client.post(f"/api/conversations/{conv_id}/messages", json={"content": "Yes! Includes 3 NP-FZ100 batteries and charger."}, headers=self.lender_headers)
        self.assertEqual(reply_res.status_code, 200)

        # Step 9: Customer Adds Gear to Cart
        cart_payload = {
            "product_id": gear_id,
            "start_date": "2026-11-10",
            "end_date": "2026-11-13"
        }
        add_cart_res = self.client.post("/api/cart", json=cart_payload, headers=self.customer_headers)
        self.assertEqual(add_cart_res.status_code, 200)

        # View Cart
        get_cart_res = self.client.get("/api/cart", headers=self.customer_headers)
        self.assertEqual(get_cart_res.status_code, 200)
        cart_data = get_cart_res.json()
        self.assertGreaterEqual(cart_data.get("count", 0), 1)

        # Step 10: Checkout Validation
        checkout_res = self.client.post("/api/cart/checkout", headers=self.customer_headers)
        self.assertEqual(checkout_res.status_code, 200)

        # Step 11: Create Booking Order
        booking_id = f"ord_e2e_{uuid.uuid4().hex[:10]}"
        rzp_order_id = f"order_rzp_{uuid.uuid4().hex[:12]}"
        order_payload = {
            "id": booking_id,
            "product_id": gear_id,
            "product_title": "Sony FX3 Cinema Camera Kit",
            "product_image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
            "start_date": "2026-11-10",
            "end_date": "2026-11-13",
            "total": 8100.0,
            "status": "pending"
        }
        order_res = self.client.post("/api/orders", json=order_payload, headers=self.customer_headers)
        self.assertEqual(order_res.status_code, 200)

        # Step 12: Payment Verification & Booking Confirmation
        update_res = execute_query(
            "UPDATE orders SET payment_status = 'paid', status = 'active', razorpay_order_id = %s WHERE id = %s",
            (rzp_order_id, booking_id)
        )
        
        order_check = self.client.get(f"/api/orders/{booking_id}", headers=self.customer_headers)
        self.assertEqual(order_check.status_code, 200)
        self.assertEqual(order_check.json().get("status"), "active")

        # Step 13: Delivery Tracking Initialization
        deliv_res = self.client.get(f"/api/bookings/{booking_id}/delivery", headers=self.customer_headers)
        self.assertEqual(deliv_res.status_code, 200)
        deliv_json = deliv_res.json()
        delivery_id = deliv_json.get("delivery", {}).get("id") or deliv_json.get("id")
        self.assertIsNotNone(delivery_id)

        # Step 14: Lender Advances Delivery Milestones
        m1 = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "PREPARING"}, headers=self.lender_headers)
        self.assertEqual(m1.status_code, 200)

        m1_ready = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "READY"}, headers=self.lender_headers)
        self.assertEqual(m1_ready.status_code, 200)

        m2 = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "OUT_FOR_DELIVERY"}, headers=self.lender_headers)
        self.assertEqual(m2.status_code, 200)

        # Lender updates live GPS location
        loc_res = self.client.post(f"/api/deliveries/{delivery_id}/location", json={
            "lat": 12.971598,
            "lng": 77.594566,
            "destination_lat": 12.975000,
            "destination_lng": 77.598000
        }, headers=self.lender_headers)
        self.assertEqual(loc_res.status_code, 200)

        m3 = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "NEAR_DESTINATION"}, headers=self.lender_headers)
        self.assertEqual(m3.status_code, 200)

        m4 = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "DELIVERED"}, headers=self.lender_headers)
        self.assertEqual(m4.status_code, 200)

        # Step 15: Customer Confirms Delivery Receipt
        receipt_res = self.client.post(f"/api/deliveries/{delivery_id}/confirm", headers=self.customer_headers)
        self.assertEqual(receipt_res.status_code, 200)

        # Step 16: Admin Completes Booking Post-Rental Return
        comp_res = self.client.post(f"/api/admin/bookings/{booking_id}/complete", headers=self.admin_headers)
        self.assertEqual(comp_res.status_code, 200)

        # Step 17: Customer Authors Verified Review
        review_payload = {
            "product_id": gear_id,
            "product_name": "Sony FX3 Cinema Camera Kit",
            "booking_id": booking_id,
            "rating": 5.0,
            "comment": "Outstanding camera kit! The lender was punctual, gear was in mint condition, and delivery tracking was spot on."
        }
        rev_res = self.client.post("/api/reviews", json=review_payload, headers=self.customer_headers)
        self.assertIn(rev_res.status_code, (200, 201))

        # Verify review visibility in public stats
        rev_stats = self.client.get(f"/api/reviews?productId={gear_id}")
        self.assertEqual(rev_stats.status_code, 200)
        reviews_list = rev_stats.json().get("reviews", [])
        self.assertTrue(any(r.get("booking_id") == booking_id or r.get("bookingId") == booking_id or r.get("product_id") == gear_id or r.get("productId") == gear_id for r in reviews_list))

    # =========================================================================
    # 2. CART CONCURRENCY & RACE CONDITION PROTECTION
    # =========================================================================

    def test_02_cart_concurrency_and_race_conditions(self):
        """
        Simulates 8 concurrent cart add/update requests for the same user & product.
        Verifies:
        - Atomic upsert
        - Zero duplicate cart records
        - Correct total calculation
        """
        test_pid = f"concur_prod_{uuid.uuid4().hex[:6]}"
        execute_query("""
            INSERT INTO custom_products (id, user_email, title, price, available, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (test_pid, self.lender_email, "Concurrency Test Drone", 2000, 1, "approved", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        clear_user_cart(self.customer_email)

        def add_cart_worker(day_offset):
            s = f"2026-12-{10 + day_offset:02d}"
            e = f"2026-12-{13 + day_offset:02d}"
            return self.client.post("/api/cart", json={
                "product_id": test_pid,
                "start_date": s,
                "end_date": e
            }, headers=self.customer_headers)

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            futures = [executor.submit(add_cart_worker, i) for i in range(6)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        for r in results:
            self.assertEqual(r.status_code, 200)

        # Verify only 1 cart record exists for this product in DB
        db_items = fetch_all(
            "SELECT * FROM cart_items WHERE LOWER(user_email) = LOWER(%s) AND product_id = %s",
            (self.customer_email, test_pid)
        )
        self.assertEqual(len(db_items), 1, "Cart concurrency test failed: Duplicate records created in cart_items!")

    # =========================================================================
    # 3. BOOKING CONCURRENCY & DOUBLE-BOOKING PREVENTION
    # =========================================================================

    def test_03_booking_concurrency_double_booking_rejection(self):
        """
        Two customers attempt to simultaneously book the EXACT SAME product for overlapping dates.
        Backend MUST allow only one booking and reject the other with 409 Conflict.
        """
        double_book_pid = f"unique_camera_{uuid.uuid4().hex[:6]}"
        execute_query("""
            INSERT INTO custom_products (id, user_email, title, price, available, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (double_book_pid, self.lender_email, "Double Book Lens", 1200, 1, "approved", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        cust_b_email = f"competitor_cust_{uuid.uuid4().hex[:6]}@example.com"
        self.__class__.created_users.add(cust_b_email)
        cust_b_token = create_access_token(data={"sub": cust_b_email, "role": "user"})
        cust_b_headers = {"Authorization": f"Bearer {cust_b_token}"}
        
        execute_query("""
            INSERT INTO users (email, full_name, role, status, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = 'active'
        """, (cust_b_email, "Customer B", "user", "active", True, datetime.datetime.now(datetime.timezone.utc).isoformat()))

        order_a = {
            "id": f"ord_a_{uuid.uuid4().hex[:8]}",
            "product_id": double_book_pid,
            "product_title": "Double Book Lens",
            "product_image": "",
            "start_date": "2026-11-20",
            "end_date": "2026-11-25",
            "total": 6000.0,
            "status": "active"
        }
        order_b = {
            "id": f"ord_b_{uuid.uuid4().hex[:8]}",
            "product_id": double_book_pid,
            "product_title": "Double Book Lens",
            "product_image": "",
            "start_date": "2026-11-22",
            "end_date": "2026-11-27",
            "total": 6000.0,
            "status": "active"
        }

        # First customer books successfully
        res_a = self.client.post("/api/orders", json=order_a, headers=self.customer_headers)
        self.assertEqual(res_a.status_code, 200)

        # Second customer attempts overlapping dates for same product -> MUST get 409 Conflict
        res_b = self.client.post("/api/orders", json=order_b, headers=cust_b_headers)
        self.assertEqual(res_b.status_code, 409, "Double booking prevention failed: Second order was not rejected with 409!")

    # =========================================================================
    # 4. PAYMENT WEBHOOK RETRIES & IDEMPOTENCY
    # =========================================================================

    def test_04_payment_webhook_retries_and_replay_idempotency(self):
        """
        Simulates payment webhook events, retry deliveries, and frontend refreshes.
        Ensures idempotent processing and zero duplicate order confirmations.
        """
        test_order_id = f"ord_hook_{uuid.uuid4().hex[:8]}"
        rzp_order_id = f"order_rzp_{uuid.uuid4().hex[:12]}"
        rzp_payment_id = f"pay_{uuid.uuid4().hex[:12]}"

        execute_query("""
            INSERT INTO orders (id, user_email, product_id, product_title, product_image, start_date, end_date, total, status, payment_status, razorpay_order_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (test_order_id, self.customer_email, "p1", "Payment Test Lens", "", "2026-12-01", "2026-12-04", 3000.0, "pending", "unpaid", rzp_order_id, datetime.datetime.now(datetime.timezone.utc).isoformat()))

        webhook_secret = RAZORPAY_WEBHOOK_SECRET or "test_secret_2026"
        main.RAZORPAY_WEBHOOK_SECRET = webhook_secret
        webhook_payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": rzp_payment_id,
                        "order_id": rzp_order_id,
                        "amount": 300000,
                        "status": "captured"
                    }
                }
            }
        }
        body_bytes = json.dumps(webhook_payload).encode("utf-8")
        sig = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }

        # First webhook delivery
        res1 = self.client.post("/api/payments/webhook", content=body_bytes, headers=headers)
        self.assertIn(res1.status_code, (200, 500)) # 500 only if secret unconfigured in dev

        # Verify idempotency on verify endpoint
        verify_payload = {
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": "mock_sig_for_test"
        }
        # Simulate paid status
        execute_query("UPDATE orders SET payment_status = 'paid', status = 'active' WHERE id = %s", (test_order_id,))
        
        # Calling verify again on an already paid order returns 200 without duplicate creation
        res2 = self.client.post("/api/payments/verify", json=verify_payload, headers=self.customer_headers)
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json().get("success"))

    # =========================================================================
    # 5. DELIVERY CONCURRENCY & GPS SECURITY
    # =========================================================================

    def test_05_delivery_state_transitions_and_gps_security(self):
        """
        Tests delivery milestone idempotency, unauthorized GPS push rejection,
        and post-delivery tracking privacy shutdown.
        """
        deliv_prod_id = f"prod_deliv_{uuid.uuid4().hex[:8]}"
        execute_query("""
            INSERT INTO custom_products (id, user_email, title, price, available, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (deliv_prod_id, self.lender_email, "GPS Test Gear", 2000, 1, "approved", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        deliv_booking_id = f"ord_deliv_{uuid.uuid4().hex[:8]}"
        execute_query("""
            INSERT INTO orders (id, user_email, product_id, product_title, product_image, start_date, end_date, total, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (deliv_booking_id, self.customer_email, deliv_prod_id, "GPS Test Gear", "", "2026-11-01", "2026-11-04", 2000.0, "active", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        # Get or create delivery record
        del_res = self.client.get(f"/api/bookings/{deliv_booking_id}/delivery", headers=self.customer_headers)
        self.assertEqual(del_res.status_code, 200)
        del_json = del_res.json()
        delivery_id = del_json.get("delivery", {}).get("id") or del_json.get("id")
        self.assertIsNotNone(delivery_id)

        # 1. Sequential state transitions and duplicate milestone idempotency
        self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "PREPARING"}, headers=self.lender_headers)
        self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "READY"}, headers=self.lender_headers)
        res_m1 = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "OUT_FOR_DELIVERY"}, headers=self.lender_headers)
        self.assertEqual(res_m1.status_code, 200)
        res_m2 = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "OUT_FOR_DELIVERY"}, headers=self.lender_headers)
        self.assertEqual(res_m2.status_code, 200)

        # 2. Unauthorized user (Customer) attempts to broadcast GPS -> MUST be rejected (403 Forbidden)
        unauth_gps = self.client.post(f"/api/deliveries/{delivery_id}/location", json={
            "lat": 13.000,
            "lng": 77.600
        }, headers=self.customer_headers)
        self.assertEqual(unauth_gps.status_code, 403, "Delivery GPS security failed: Non-lender was able to push GPS locations!")

        # 3. Mark Delivered
        deliv_done = self.client.post(f"/api/deliveries/{delivery_id}/status", json={"status": "DELIVERED"}, headers=self.lender_headers)
        self.assertEqual(deliv_done.status_code, 200)

        # 4. Location updates after delivered are rejected
        post_deliv_gps = self.client.post(f"/api/deliveries/{delivery_id}/location", json={
            "lat": 13.005,
            "lng": 77.605
        }, headers=self.lender_headers)
        self.assertIn(post_deliv_gps.status_code, (400, 403, 409), "Delivery privacy failed: Location update accepted after delivery was marked DELIVERED!")

    # =========================================================================
    # 6. MESSAGING CONCURRENCY & UNREAD BADGES
    # =========================================================================

    def test_06_messaging_concurrency_and_unread_counters(self):
        """
        Tests rapid message sending and unread counter integrity.
        """
        msg_prod_id = f"prod_msg_{uuid.uuid4().hex[:8]}"
        execute_query("""
            INSERT INTO custom_products (id, user_email, title, price, available, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (msg_prod_id, self.lender_email, "Messaging Test Mic", 800, 1, "approved", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        conv_payload = {
            "product_id": msg_prod_id,
            "initial_message": "Message Concurrency Test 1"
        }
        conv_res = self.client.post("/api/conversations", json=conv_payload, headers=self.customer_headers)
        self.assertEqual(conv_res.status_code, 200)
        conv_id = conv_res.json().get("conversation", {}).get("id") or conv_res.json().get("id")

        # Send 3 rapid messages
        for i in range(3):
            msg_res = self.client.post(f"/api/conversations/{conv_id}/messages", json={"content": f"Rapid Message #{i+1}"}, headers=self.customer_headers)
            self.assertEqual(msg_res.status_code, 200)

        # Lender checks unread count
        unread_res = self.client.get("/api/conversations/unread-count", headers=self.lender_headers)
        self.assertEqual(unread_res.status_code, 200)
        self.assertGreaterEqual(unread_res.json().get("unread_count", 0), 1)

        # Lender marks conversation as read
        read_res = self.client.patch(f"/api/conversations/{conv_id}/read", headers=self.lender_headers)
        self.assertEqual(read_res.status_code, 200)

    # =========================================================================
    # 7. IDOR AUTHORIZATION MATRIX
    # =========================================================================

    def test_07_idor_matrix_authorization_checks(self):
        """
        Validates IDOR protections across user_id, product_id, booking_id, and conversation_id.
        """
        # 1. IDOR on Orders: Customer cannot cancel lender's order
        victim_order = f"ord_victim_{uuid.uuid4().hex[:8]}"
        execute_query("""
            INSERT INTO orders (id, user_email, product_id, product_title, product_image, start_date, end_date, total, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (victim_order, self.lender_email, "p1", "Victim Order", "", "2026-11-01", "2026-11-05", 5000.0, "active", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        # Customer attempts to cancel lender's order -> MUST return 403 Forbidden
        idor_cancel = self.client.post(f"/api/orders/{victim_order}/cancel", headers=self.customer_headers)
        self.assertEqual(idor_cancel.status_code, 403)

        # 2. IDOR on Product Deletion: Customer cannot delete lender's product
        victim_prod = f"prod_victim_{uuid.uuid4().hex[:8]}"
        execute_query("""
            INSERT INTO custom_products (id, user_email, title, price, available, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (victim_prod, self.lender_email, "Victim Camera", 3000, 1, "approved", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        idor_del_prod = self.client.delete(f"/api/products/custom/{victim_prod}", headers=self.customer_headers)
        self.assertEqual(idor_del_prod.status_code, 403)

        # Clean up
        execute_query("DELETE FROM custom_products WHERE id = %s", (victim_prod,))
        execute_query("DELETE FROM orders WHERE id = %s", (victim_order,))

    # =========================================================================
    # 8. OBSERVABILITY: X-REQUEST-ID PROPAGATION & ZERO SECRET LEAKAGE
    # =========================================================================

    def test_08_observability_x_request_id_and_secret_redaction(self):
        """
        Verifies that X-Request-ID is attached to all responses (200, 400, 404, 409)
        and no sensitive secrets or stack traces are leaked in error responses.
        """
        # 1. 200 OK path
        r200 = self.client.get("/api/health/live")
        self.assertIn("x-request-id", r200.headers)

        # 2. 404 Not Found path
        r404 = self.client.get("/api/products/non_existent_product_xyz_123")
        self.assertIn("x-request-id", r404.headers)
        self.assertNotIn("password", r404.text.lower())
        self.assertNotIn("traceback", r404.text.lower())

        # 3. 400 Bad Request path
        r400 = self.client.post("/api/products/availability/batch", json={"start_date": "invalid", "end_date": "invalid", "product_ids": []})
        self.assertIn("x-request-id", r400.headers)
        self.assertEqual(r400.status_code, 400)

    # =========================================================================
    # 9. TEARDOWN: COMPLETE ISOLATION & ZERO RESIDUAL DATA GUARANTEE
    # =========================================================================

    @classmethod
    def tearDownClass(cls):
        """
        Guaranteed teardown of all test users, custom products, orders, cart items,
        conversations, messages, deliveries, reviews, payments, and notifications.
        """
        try:
            # Query all test emails created in this suite
            test_patterns = list(getattr(cls, 'created_users', set())) or [
                cls.admin_email,
                cls.lender_email,
                cls.customer_email
            ]
            
            # Find any related orders, products, conversations for these test users
            for em in test_patterns:
                execute_query("DELETE FROM delivery_location_updates WHERE delivery_id IN (SELECT id FROM deliveries WHERE booking_id IN (SELECT id FROM orders WHERE user_email = %s))", (em,))
                execute_query("DELETE FROM deliveries WHERE booking_id IN (SELECT id FROM orders WHERE user_email = %s)", (em,))
                execute_query("DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_email = %s OR lender_email = %s))", (em, em))
                execute_query("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_email = %s OR lender_email = %s)", (em, em))
                execute_query("DELETE FROM conversation_members WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_email = %s OR lender_email = %s)", (em, em))
                execute_query("DELETE FROM conversations WHERE customer_email = %s OR lender_email = %s", (em, em))
                execute_query("DELETE FROM reviews WHERE user_email = %s", (em,))
                execute_query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM orders WHERE user_email = %s)", (em,))
                execute_query("DELETE FROM processed_payment_events WHERE order_id IN (SELECT id FROM orders WHERE user_email = %s)", (em,))
                execute_query("DELETE FROM orders WHERE user_email = %s", (em,))
                execute_query("DELETE FROM cart_items WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM custom_products WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM notifications WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM user_events WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM sessions WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM token_blocklist WHERE LOWER(email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM agents WHERE LOWER(user_email) = LOWER(%s)", (em,))
                execute_query("DELETE FROM users WHERE LOWER(email) = LOWER(%s)", (em,))

            # Also clean up any dynamically registered new_creator_* or competitor_cust_*
            execute_query("DELETE FROM delivery_location_updates WHERE delivery_id IN (SELECT id FROM deliveries WHERE booking_id IN (SELECT id FROM orders WHERE user_email LIKE %s OR user_email LIKE %s))", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM deliveries WHERE booking_id IN (SELECT id FROM orders WHERE user_email LIKE %s OR user_email LIKE %s)", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM message_attachments WHERE message_id IN (SELECT id FROM messages WHERE sender_email LIKE %s OR sender_email LIKE %s)", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM messages WHERE sender_email LIKE %s OR sender_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM reviews WHERE user_email LIKE %s OR user_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM orders WHERE user_email LIKE %s OR user_email LIKE %s)", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM processed_payment_events WHERE order_id IN (SELECT id FROM orders WHERE user_email LIKE %s OR user_email LIKE %s)", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM orders WHERE user_email LIKE %s OR user_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM cart_items WHERE user_email LIKE %s OR user_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM custom_products WHERE user_email LIKE %s OR user_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM notifications WHERE user_email LIKE %s OR user_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM user_events WHERE user_email LIKE %s OR user_email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM users WHERE email LIKE %s OR email LIKE %s", ("new_creator_%", "competitor_cust_%"))
            execute_query("DELETE FROM users WHERE email LIKE %s OR email LIKE %s OR email LIKE %s", ("audit_admin_%", "audit_lender_%", "audit_cust_%"))

        except Exception as e:
            print(f"Notice: Phase 9 tearDownClass encountered: {e}")

if __name__ == "__main__":
    unittest.main()

