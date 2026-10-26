import sys
import os
import unittest
from datetime import datetime, timezone

# Ensure backend directory is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database import (
    init_db,
    notify_booking_event,
    get_notifications,
    mark_notification_read,
    mark_notifications_read,
    create_notification,
    MOCK_ORDERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_NOTIFICATIONS,
)
from payernt_database import (
    init_payernt_tables,
    get_payernt_notifications,
    mark_payernt_notification_read,
    mark_all_payernt_notifications_read,
    MOCK_PAYERNT_NOTIFICATIONS,
)

class TestNotificationsFeature(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        try:
            init_payernt_tables()
        except Exception:
            pass

    def setUp(self):
        self.renter_email = "renter_test@payent.com"
        self.lender_email = "lender_test@payent.com"
        self.order_id = "test_ord_notif_101"
        self.product_id = "test_prod_gear_101"
        self.product_title = "Sony FX3 Cinema Camera Kit"

        # Mock order setup
        MOCK_ORDERS[self.order_id] = {
            "id": self.order_id,
            "user_email": self.renter_email,
            "productId": self.product_id,
            "product_id": self.product_id,
            "product_title": self.product_title,
            "status": "pending",
            "total": 3500,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Mock custom product setup
        MOCK_CUSTOM_PRODUCTS[self.product_id] = {
            "id": self.product_id,
            "title": self.product_title,
            "user_email": self.lender_email,
            "owner_email": self.lender_email,
        }

    def test_01_new_booking_request_creates_notifications_for_both_parties(self):
        res = notify_booking_event(self.order_id, "booking_created")
        self.assertTrue(res.get("renter"))
        self.assertTrue(res.get("lender"))

        renter_notifs = get_notifications(self.renter_email)
        renter_match = next((n for n in renter_notifs if n.get("booking_id") == self.order_id or n.get("bookingId") == self.order_id), None)
        self.assertIsNotNone(renter_match)
        self.assertIn("Submitted", renter_match.get("title", ""))

        lender_notifs = get_notifications(self.lender_email)
        lender_match = next((n for n in lender_notifs if n.get("booking_id") == self.order_id or n.get("bookingId") == self.order_id), None)
        self.assertIsNotNone(lender_match)
        self.assertIn("Received", lender_match.get("title", ""))

    def test_02_idempotency_prevents_duplicate_notifications(self):
        # Call booking_created twice
        notify_booking_event(self.order_id, "booking_created")
        renter_count_1 = len([n for n in get_notifications(self.renter_email) if (n.get("booking_id") or n.get("bookingId")) == self.order_id and "Submitted" in n.get("title", "")])

        # Second dispatch with identical event_key
        notify_booking_event(self.order_id, "booking_created")
        renter_count_2 = len([n for n in get_notifications(self.renter_email) if (n.get("booking_id") or n.get("bookingId")) == self.order_id and "Submitted" in n.get("title", "")])

        self.assertEqual(renter_count_1, renter_count_2)

    def test_03_booking_confirmed_notifies_both_parties(self):
        res = notify_booking_event(self.order_id, "booking_confirmed", actor_email=self.lender_email)
        self.assertTrue(res.get("renter"))
        self.assertTrue(res.get("lender"))

        renter_notifs = get_notifications(self.renter_email)
        renter_match = next((n for n in renter_notifs if "Confirmed" in n.get("title", "")), None)
        self.assertIsNotNone(renter_match)

    def test_04_booking_rejected_notifies_renter_with_reason(self):
        reason = "Equipment unavailable due to studio schedule"
        notify_booking_event(self.order_id, "booking_rejected", actor_email=self.lender_email, reason=reason)

        renter_notifs = get_notifications(self.renter_email)
        renter_match = next((n for n in renter_notifs if "Declined" in n.get("title", "")), None)
        self.assertIsNotNone(renter_match)
        self.assertIn(reason, renter_match.get("message", ""))

    def test_05_cancellation_by_renter_notifies_both(self):
        order_cancel_id = "test_ord_cancel_renter_1"
        MOCK_ORDERS[order_cancel_id] = dict(MOCK_ORDERS[self.order_id], id=order_cancel_id)
        notify_booking_event(order_cancel_id, "cancelled_by_renter", actor_email=self.renter_email, reason="Plans changed")

        lender_notifs = get_notifications(self.lender_email)
        match = next((n for n in lender_notifs if (n.get("booking_id") or n.get("bookingId")) == order_cancel_id), None)
        self.assertIsNotNone(match)
        self.assertIn("Cancelled by Renter", match.get("title", ""))

    def test_06_cancellation_by_lender_notifies_both(self):
        order_cancel_id = "test_ord_cancel_lender_1"
        MOCK_ORDERS[order_cancel_id] = dict(MOCK_ORDERS[self.order_id], id=order_cancel_id)
        notify_booking_event(order_cancel_id, "cancelled_by_lender", actor_email=self.lender_email, reason="Gear maintenance")

        renter_notifs = get_notifications(self.renter_email)
        match = next((n for n in renter_notifs if (n.get("booking_id") or n.get("bookingId")) == order_cancel_id), None)
        self.assertIsNotNone(match)
        self.assertIn("Cancelled by Lender", match.get("title", ""))

    def test_07_ready_for_pickup_and_pickup_confirmation(self):
        # Ready for pickup
        notify_booking_event(self.order_id, "ready_for_pickup", actor_email=self.lender_email)
        renter_notifs = get_notifications(self.renter_email)
        self.assertTrue(any("Ready for Pickup" in n.get("title", "") for n in renter_notifs))

        # Pickup confirmed / rental started
        notify_booking_event(self.order_id, "picked_up", actor_email=self.renter_email)
        renter_notifs = get_notifications(self.renter_email)
        self.assertTrue(any("Rental Started" in n.get("title", "") for n in renter_notifs))

    def test_08_return_and_completion_lifecycle(self):
        # Return initiated
        notify_booking_event(self.order_id, "return_initiated", actor_email=self.renter_email)
        lender_notifs = get_notifications(self.lender_email)
        self.assertTrue(any("Return Initiated" in n.get("title", "") for n in lender_notifs))

        # Handed back
        notify_booking_event(self.order_id, "handed_back", actor_email=self.lender_email)
        lender_notifs = get_notifications(self.lender_email)
        self.assertTrue(any("Received Back" in n.get("title", "") for n in lender_notifs))

        # Completed
        notify_booking_event(self.order_id, "completed", actor_email=self.lender_email)
        renter_notifs = get_notifications(self.renter_email)
        self.assertTrue(any("Rental Completed" in n.get("title", "") for n in renter_notifs))

    def test_09_payment_and_refund_lifecycle(self):
        notify_booking_event(self.order_id, "payment_verified")
        renter_notifs = get_notifications(self.renter_email)
        self.assertTrue(any("Payment Verified" in n.get("title", "") for n in renter_notifs))

        notify_booking_event(self.order_id, "refund_processed", custom_message="Security deposit refunded ₹1000")
        renter_notifs = get_notifications(self.renter_email)
        self.assertTrue(any("Refund Processed" in n.get("title", "") for n in renter_notifs))

    def test_10_mark_as_read_individual_and_bulk(self):
        test_email = "test_read_user@payent.com"
        n1 = create_notification(email=test_email, title="Test 1", message="Msg 1")
        n2 = create_notification(email=test_email, title="Test 2", message="Msg 2")

        notifs = get_notifications(test_email)
        self.assertGreaterEqual(len(notifs), 2)

        # Mark single
        n1_id = n1.get("id") or notifs[0].get("id")
        mark_notification_read(n1_id, test_email)
        updated = get_notifications(test_email)
        target = next((n for n in updated if str(n.get("id")) == str(n1_id)), None)
        if target:
            self.assertTrue(target.get("read"))

        # Mark all
        mark_notifications_read(test_email)
        updated_all = get_notifications(test_email)
        self.assertTrue(all(n.get("read") for n in updated_all))

if __name__ == "__main__":
    unittest.main()
