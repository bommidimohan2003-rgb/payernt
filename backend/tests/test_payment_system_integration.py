import os
os.environ["TESTING"] = "1"
import sys
import uuid
import hmac
import hashlib
from datetime import datetime, timezone
import unittest
from fastapi import HTTPException

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import RAZORPAY_KEY_SECRET
from database import (
    init_db,
    record_or_update_payment,
    get_user_payments,
    create_order_record,
    get_order_by_id,
    update_order_payment_status,
    MOCK_USERS,
    MOCK_ORDERS,
    MOCK_PAYMENTS,
)
from main import (
    CreateRazorpayOrderSchema,
    VerifyRazorpayPaymentSchema,
    create_razorpay_order,
    verify_razorpay_payment,
    check_payment_status_endpoint,
    get_payment_receipt_endpoint,
)
import main
main.razorpay_client = None


class TestPaymentSystemIntegration(unittest.TestCase):
    def setUp(self):
        self.user_email = f"payer_test_{uuid.uuid4().hex[:8]}@payent.com"
        self.other_user_email = f"other_payer_{uuid.uuid4().hex[:8]}@payent.com"

        for email in [self.user_email, self.other_user_email]:
            MOCK_USERS[email] = {
                "email": email,
                "role": "customer",
                "status": "approved",
                "verified": True,
                "full_name": "Payer User",
            }

        self.current_user = {
            "email": self.user_email,
            "role": "customer",
            "status": "approved",
            "verified": True,
            "full_name": "Payer User",
        }

        self.secret = RAZORPAY_KEY_SECRET or "rzp_test_payent_key_secret"

    def test_record_or_update_and_get_user_payments(self):
        """Test database recording and querying payment transactions."""
        pay_id = f"pay_test_{uuid.uuid4().hex[:8]}"
        ord_id = f"ord_test_{uuid.uuid4().hex[:8]}"

        record_or_update_payment(
            payment_id=pay_id,
            order_id=ord_id,
            booking_id=ord_id,
            customer_id=self.user_email,
            amount=3500.0,
            currency="INR",
            status="successful",
            method="upi",
            gateway="razorpay",
            razorpay_order_id="order_rzp_test_1",
            razorpay_payment_id=pay_id,
            product_title="Canon EOS R5 Mirrorless Camera",
            metadata={"notes": "Rental for 3 days"}
        )

        payments = get_user_payments(self.user_email)
        self.assertTrue(len(payments) >= 1)
        target = next((p for p in payments if p["id"] == pay_id), None)
        self.assertIsNotNone(target)
        self.assertEqual(target["status"], "successful")
        self.assertEqual(target["amount"], 3500.0)
        self.assertEqual(target["product_title"], "Canon EOS R5 Mirrorless Camera")

        # Test search filter
        filtered = get_user_payments(self.user_email, search="Canon")
        self.assertTrue(any(p["id"] == pay_id for p in filtered))

        filtered_none = get_user_payments(self.user_email, search="NonExistentItem999")
        self.assertFalse(any(p["id"] == pay_id for p in filtered_none))

        # Test status filter
        filtered_status = get_user_payments(self.user_email, status_filter="successful")
        self.assertTrue(any(p["id"] == pay_id for p in filtered_status))

        filtered_failed = get_user_payments(self.user_email, status_filter="failed")
        self.assertFalse(any(p["id"] == pay_id for p in filtered_failed))

    def test_payment_status_endpoint(self):
        """Test check_payment_status_endpoint with ownership security."""
        ord_id = f"ord_stat_{uuid.uuid4().hex[:8]}"

        create_order_record(
            order_id=ord_id,
            user_email=self.user_email,
            product_id="prod_stat_1",
            product_title="Sony FX6 Cinema Camera",
            product_image="https://example.com/fx6.jpg",
            start_date="2026-09-01",
            end_date="2026-09-05",
            total=12000.0,
            status="pending",
            payment_status="unpaid"
        )

        # Owner gets status
        data = check_payment_status_endpoint(ord_id, self.user_email)
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("order_id"), ord_id)
        self.assertEqual(data.get("payment_status"), "unpaid")

        # Intruder gets 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            check_payment_status_endpoint(ord_id, self.other_user_email)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_payment_receipt_endpoint(self):
        """Test get_payment_receipt_endpoint."""
        ord_id = f"ord_rcpt_{uuid.uuid4().hex[:8]}"

        create_order_record(
            order_id=ord_id,
            user_email=self.user_email,
            product_id="prod_rcpt_1",
            product_title="MacBook Pro M3 Max",
            product_image="https://example.com/mbp.jpg",
            start_date="2026-10-01",
            end_date="2026-10-07",
            total=9000.0,
            status="active",
            payment_status="paid",
            razorpay_payment_id="pay_rcpt_12345"
        )

        receipt = get_payment_receipt_endpoint(ord_id, self.user_email)
        self.assertTrue(receipt.get("success"))
        self.assertEqual(receipt.get("order_id"), ord_id)
        self.assertEqual(receipt.get("total_amount"), 9000.0)
        self.assertEqual(receipt.get("payment_status"), "paid")
        self.assertEqual(receipt.get("currency"), "INR")
        self.assertIn("REC-", receipt.get("receipt_number"))

    def test_server_side_amount_validation_in_create_order(self):
        """Test that create_razorpay_order uses authoritative server-side order total."""
        ord_id = f"ord_srv_price_{uuid.uuid4().hex[:8]}"

        create_order_record(
            order_id=ord_id,
            user_email=self.user_email,
            product_id="prod_srv_1",
            product_title="Blackmagic Pocket 6K Pro",
            product_image="https://example.com/bmpcc.jpg",
            start_date="2026-11-01",
            end_date="2026-11-03",
            total=5400.0,
            status="pending",
            payment_status="unpaid"
        )

        req_schema = CreateRazorpayOrderSchema(
            order_id=ord_id,
            amount=100.0,  # Frontend tampered amount
            currency="INR",
            receipt=f"rcpt_{ord_id}"
        )

        res = create_razorpay_order(req_schema, self.current_user)
        # Authoritative amount should be 5400 INR (540000 paise), NOT 10000 paise
        self.assertEqual(res.get("amount"), 540000)
        self.assertEqual(res.get("total"), 5400)

    def test_cannot_pay_already_paid_or_cancelled_order(self):
        """Verify that create_razorpay_order rejects already paid or cancelled orders."""
        ord_paid = f"ord_already_paid_{uuid.uuid4().hex[:8]}"
        create_order_record(
            order_id=ord_paid,
            user_email=self.user_email,
            product_id="p1",
            product_title="Paid Camera",
            product_image="https://example.com/p.jpg",
            start_date="2026-11-01",
            end_date="2026-11-03",
            total=3000.0,
            status="active",
            payment_status="paid"
        )

        req_schema = CreateRazorpayOrderSchema(order_id=ord_paid)
        with self.assertRaises(HTTPException) as ctx:
            create_razorpay_order(req_schema, self.current_user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already", ctx.exception.detail.lower())

        # Test cancelled order
        ord_canc = f"ord_canc_{uuid.uuid4().hex[:8]}"
        create_order_record(
            order_id=ord_canc,
            user_email=self.user_email,
            product_id="p2",
            product_title="Cancelled Camera",
            product_image="https://example.com/p2.jpg",
            start_date="2026-11-01",
            end_date="2026-11-03",
            total=3000.0,
            status="cancelled",
            payment_status="unpaid"
        )
        req_canc = CreateRazorpayOrderSchema(order_id=ord_canc)
        with self.assertRaises(HTTPException) as ctx_canc:
            create_razorpay_order(req_canc, self.current_user)
        self.assertEqual(ctx_canc.exception.status_code, 400)
        self.assertIn("cancelled", ctx_canc.exception.detail.lower())

    def test_payment_verify_and_order_activation(self):
        """Verify HMAC signature validation and idempotent booking activation."""
        ord_id = f"ord_vfy_{uuid.uuid4().hex[:8]}"
        rzp_ord_id = f"order_rzp_{uuid.uuid4().hex[:8]}"
        pay_id = f"pay_{uuid.uuid4().hex[:8]}"

        create_order_record(
            order_id=ord_id,
            user_email=self.user_email,
            product_id="prod_vfy_1",
            product_title="Aputure 600d Pro Light",
            product_image="https://example.com/light.jpg",
            start_date="2026-11-10",
            end_date="2026-11-12",
            total=4000.0,
            status="pending",
            razorpay_order_id=rzp_ord_id,
            payment_status="unpaid"
        )

        msg = f"{rzp_ord_id}|{pay_id}"
        valid_signature = hmac.new(
            self.secret.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()

        # 1. Invalid signature should raise HTTPException 400
        bad_verify = VerifyRazorpayPaymentSchema(
            order_id=ord_id,
            razorpay_order_id=rzp_ord_id,
            razorpay_payment_id=pay_id,
            razorpay_signature="invalid_fake_signature"
        )
        with self.assertRaises(HTTPException) as ctx_bad:
            verify_razorpay_payment(bad_verify, self.user_email)
        self.assertEqual(ctx_bad.exception.status_code, 400)

        # 2. Valid signature succeeds and activates order
        good_verify = VerifyRazorpayPaymentSchema(
            order_id=ord_id,
            razorpay_order_id=rzp_ord_id,
            razorpay_payment_id=pay_id,
            razorpay_signature=valid_signature
        )
        res_good = verify_razorpay_payment(good_verify, self.user_email)
        self.assertTrue(res_good.get("success"))
        self.assertEqual(res_good.get("status"), "active")
        self.assertEqual(res_good.get("payment_status"), "paid")

        order_after = get_order_by_id(ord_id)
        self.assertEqual(order_after.get("payment_status"), "paid")
        self.assertEqual(order_after.get("status"), "active")

        # 3. Idempotent re-verify returns success
        res_retry = verify_razorpay_payment(good_verify, self.user_email)
        self.assertTrue(res_retry.get("success"))

    def tearDown(self):
        MOCK_USERS.pop(self.user_email, None)
        MOCK_USERS.pop(self.other_user_email, None)


if __name__ == "__main__":
    unittest.main()
