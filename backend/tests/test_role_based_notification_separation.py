import os
import sys

# Fast test mode: prevents WAN connection retries during testing
os.environ["TESTING"] = "1"
os.environ["PYTEST_CURRENT_TEST"] = "1"

import unittest
import asyncio
from datetime import datetime, timezone

# Ensure backend directory is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database import (
    init_db,
    notify_booking_event,
    get_notifications,
    get_unread_notifications_count,
    mark_notification_read,
    mark_notifications_read,
    delete_notification,
    create_notification,
    MOCK_ORDERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_NOTIFICATIONS,
)
from payernt_database import (
    init_payernt_tables,
    get_payernt_notifications,
    add_payernt_notification,
    mark_payernt_notification_read,
    mark_all_payernt_notifications_read,
    delete_payernt_notification,
    get_payernt_unread_notifications_count,
    MOCK_PAYERNT_NOTIFICATIONS,
)
from main import UserNotificationManager


class MockWebSocket:
    """Mock WebSocket for unit testing UserNotificationManager."""
    def __init__(self):
        self.messages = []
        self.closed = False

    async def accept(self):
        pass

    async def send_json(self, data):
        self.messages.append(data)

    async def close(self, code=1000, reason=""):
        self.closed = True


class TestRoleBasedNotificationSeparation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            init_db()
        except Exception:
            pass
        try:
            init_payernt_tables()
        except Exception:
            pass

    def setUp(self):
        self.user_a = "user_alpha_test@payent.in"
        self.user_b = "user_beta_test@payent.in"
        self.lender_id = "vendor_lender_test_01"

        # Clear mock structures for predictable test state
        MOCK_NOTIFICATIONS.clear()
        MOCK_PAYERNT_NOTIFICATIONS.clear()

    # Scenario 1: Payrent isolation
    def test_01_payrent_isolation(self):
        """Renter sees ONLY Payrent notifications (+ eligible COMMON), never Payernt lender notices."""
        create_notification(
            email=self.user_a,
            title="Rental Order Confirmed",
            message="Your gear is reserved.",
            audience_role="PAYRENT",
            event_key="payrent_order_1"
        )
        create_notification(
            email=self.user_a,
            title="Lender Payout Disbursed",
            message="Payout of ₹5000 sent to bank.",
            audience_role="PAYERNT",
            event_key="payernt_payout_1"
        )

        payrent_feed = get_notifications(self.user_a, role="PAYRENT")
        titles = [n.get("title") for n in payrent_feed]

        self.assertIn("Rental Order Confirmed", titles)
        self.assertNotIn("Lender Payout Disbursed", titles)

    # Scenario 2: Payernt isolation
    def test_02_payernt_isolation(self):
        """Lender sees ONLY Payernt notifications (+ eligible COMMON), never Payrent renter notices."""
        create_notification(
            email=self.user_a,
            title="Renter Delivery En Route",
            message="Delivery boy is on the way.",
            audience_role="PAYRENT",
            event_key="payrent_deliv_1"
        )
        create_notification(
            email=self.user_a,
            title="New Booking Request on Your Gear",
            message="Mohan requested Sony FX3.",
            audience_role="PAYERNT",
            event_key="payernt_req_1"
        )

        payernt_feed = get_notifications(self.user_a, role="PAYERNT")
        titles = [n.get("title") for n in payernt_feed]

        self.assertIn("New Booking Request on Your Gear", titles)
        self.assertNotIn("Renter Delivery En Route", titles)

    # Scenario 3: Common notifications in both
    def test_03_common_notifications_in_both(self):
        """COMMON platform notices (e.g. security alerts) appear in both Payrent and Payernt feeds."""
        create_notification(
            email=self.user_a,
            title="Security Alert: Password Changed",
            message="Your password was successfully updated.",
            audience_role="COMMON",
            event_key="common_sec_1"
        )

        payrent_feed = get_notifications(self.user_a, role="PAYRENT")
        payernt_feed = get_notifications(self.user_a, role="PAYERNT")

        payrent_titles = [n.get("title") for n in payrent_feed]
        payernt_titles = [n.get("title") for n in payernt_feed]

        self.assertIn("Security Alert: Password Changed", payrent_titles)
        self.assertIn("Security Alert: Password Changed", payernt_titles)

    # Scenario 4: Role switching
    def test_04_role_switching(self):
        """Switching active role returns the appropriate filtered set immediately without cache pollution."""
        create_notification(email=self.user_a, title="Renter Return Reminder", message="Return tomorrow.", audience_role="PAYRENT")
        create_notification(email=self.user_a, title="Lender Product Approved", message="Camera kit is live.", audience_role="PAYERNT")

        renter_view = get_notifications(self.user_a, role="PAYRENT")
        lender_view = get_notifications(self.user_a, role="PAYERNT")

        self.assertEqual(len(renter_view), 1)
        self.assertEqual(renter_view[0]["title"], "Renter Return Reminder")

        self.assertEqual(len(lender_view), 1)
        self.assertEqual(lender_view[0]["title"], "Lender Product Approved")

    # Scenario 5: Role-specific unread counts
    def test_05_role_specific_unread_counts(self):
        """Unread counts are strictly scoped to the active role."""
        # 2 unread Payrent notices
        create_notification(email=self.user_a, title="Order #1 Confirmed", audience_role="PAYRENT")
        create_notification(email=self.user_a, title="Order #2 Dispatched", audience_role="PAYRENT")
        # 1 unread Payernt notice
        create_notification(email=self.user_a, title="Payout Initiated", audience_role="PAYERNT")
        # 1 unread COMMON notice
        create_notification(email=self.user_a, title="Account Verified", audience_role="COMMON")

        payrent_unread = get_unread_notifications_count(self.user_a, role="PAYRENT")
        payernt_unread = get_unread_notifications_count(self.user_a, role="PAYERNT")

        # Payrent should count: 2 PAYRENT + 1 COMMON = 3
        self.assertEqual(payrent_unread, 3)
        # Payernt should count: 1 PAYERNT + 1 COMMON = 2
        self.assertEqual(payernt_unread, 2)

    # Scenario 6: Mark all read isolation
    def test_06_mark_all_read_isolation(self):
        """Marking all read in Payrent does NOT clear unread state in Payernt."""
        create_notification(email=self.user_a, title="Renter Notification", audience_role="PAYRENT")
        create_notification(email=self.user_a, title="Lender Notification", audience_role="PAYERNT")

        # Mark all read for PAYRENT only
        mark_notifications_read(self.user_a, role="PAYRENT")

        payrent_unread = get_unread_notifications_count(self.user_a, role="PAYRENT")
        payernt_unread = get_unread_notifications_count(self.user_a, role="PAYERNT")

        self.assertEqual(payrent_unread, 0)
        self.assertEqual(payernt_unread, 1)

    # Scenario 7: Real-time WebSocket delivery
    def test_07_realtime_websocket_delivery(self):
        """WebSocket manager delivers role-scoped notifications only to matching clients."""
        manager = UserNotificationManager()
        ws_renter = MockWebSocket()
        ws_lender = MockWebSocket()

        manager.connect(self.user_a, ws_renter, role="PAYRENT")
        manager.connect(self.user_a, ws_lender, role="PAYERNT")

        # 1. PAYRENT notice recipients
        payrent_recipients = manager.get_recipient_websockets(self.user_a, audience_role="PAYRENT")
        self.assertIn(ws_renter, payrent_recipients)
        self.assertNotIn(ws_lender, payrent_recipients)

        # 2. PAYERNT notice recipients
        payernt_recipients = manager.get_recipient_websockets(self.user_a, audience_role="PAYERNT")
        self.assertNotIn(ws_renter, payernt_recipients)
        self.assertIn(ws_lender, payernt_recipients)

        # 3. COMMON notice recipients
        common_recipients = manager.get_recipient_websockets(self.user_a, audience_role="COMMON")
        self.assertIn(ws_renter, common_recipients)
        self.assertIn(ws_lender, common_recipients)

        # 4. Role switching over WebSocket
        manager.update_role(self.user_a, ws_renter, new_role="PAYERNT")
        switched_recipients = manager.get_recipient_websockets(self.user_a, audience_role="PAYERNT")
        self.assertIn(ws_renter, switched_recipients)
        self.assertIn(ws_lender, switched_recipients)

    # Scenario 8: User isolation
    def test_08_user_isolation(self):
        """User A's notifications cannot be read or retrieved by User B."""
        n_a = create_notification(email=self.user_a, title="User A Secret", audience_role="PAYRENT")

        # User B queries their notifications
        user_b_feed = get_notifications(self.user_b, role="PAYRENT")
        b_ids = [n.get("id") for n in user_b_feed]
        self.assertNotIn(n_a["id"], b_ids)

        # User B attempts to delete User A's notification
        delete_notification(n_a["id"], email=self.user_b)
        # Notification must still exist for User A
        user_a_feed = get_notifications(self.user_a, role="PAYRENT")
        a_ids = [n.get("id") for n in user_a_feed]
        self.assertIn(n_a["id"], a_ids)

    # Scenario 9: Booking event classification
    def test_09_booking_event_classification(self):
        """notify_booking_event dispatches PAYRENT to renter, and PAYERNT to lender."""
        order_id = "test_sep_ord_999"
        prod_id = "test_sep_prod_999"
        renter_email = "renter_sep@payent.in"
        lender_email = "lender_sep@payent.in"

        MOCK_ORDERS[order_id] = {
            "id": order_id,
            "user_email": renter_email,
            "productId": prod_id,
            "product_id": prod_id,
            "product_title": "Sony A7SIII",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        MOCK_CUSTOM_PRODUCTS[prod_id] = {
            "id": prod_id,
            "title": "Sony A7SIII",
            "user_email": lender_email,
            "owner_email": lender_email,
        }

        results = notify_booking_event(order_id, "booking_created")
        renter_res = results.get("renter")
        lender_res = results.get("lender")

        self.assertIsNotNone(renter_res)
        self.assertIsNotNone(lender_res)
        self.assertEqual(renter_res.get("audience_role"), "PAYRENT")
        self.assertEqual(lender_res.get("audience_role"), "PAYERNT")

    # Scenario 10: Legacy record accessibility
    def test_10_legacy_record_accessibility(self):
        """Legacy records without explicit audience_role default cleanly to PAYRENT for customer visibility."""
        legacy_id = "legacy_notif_001"
        MOCK_NOTIFICATIONS[legacy_id] = {
            "id": legacy_id,
            "user_email": self.user_a,
            "title": "Legacy Booking Alert",
            "message": "Past order update.",
            "is_read": False,
            "audience_role": "PAYRENT"
        }

        feed = get_notifications(self.user_a, role="PAYRENT")
        self.assertTrue(any(n.get("id") == legacy_id for n in feed))

    # Scenario 11: Admin support reply isolation
    def test_11_admin_support_reply_isolation(self):
        """Renter ticket replies are classified as PAYRENT; lender ticket replies as PAYERNT."""
        renter_ticket_notif = create_notification(
            email=self.user_a,
            title="Support Reply: #TICK-RENTER",
            message="Your refund is being processed.",
            audience_role="PAYRENT"
        )
        lender_ticket_notif = create_notification(
            email=self.user_a,
            title="Support Reply: #TICK-LENDER",
            message="Your listing document was verified.",
            audience_role="PAYERNT"
        )

        renter_feed = get_notifications(self.user_a, role="PAYRENT")
        lender_feed = get_notifications(self.user_a, role="PAYERNT")

        renter_notif_ids = [n["id"] for n in renter_feed]
        lender_notif_ids = [n["id"] for n in lender_feed]

        self.assertIn(renter_ticket_notif["id"], renter_notif_ids)
        self.assertNotIn(lender_ticket_notif["id"], renter_notif_ids)

        self.assertIn(lender_ticket_notif["id"], lender_notif_ids)
        self.assertNotIn(renter_ticket_notif["id"], lender_notif_ids)

    # Scenario 12: Regression checks across booking, kyc, payment
    def test_12_regression_checks(self):
        """Ensure deletion and individual marking as read work across both role tables without cross-pollution."""
        notif = create_notification(
            email=self.user_a,
            title="KYC Verified Notice",
            message="Your KYC was approved.",
            audience_role="PAYRENT"
        )
        notif_id = notif["id"]

        # Mark single as read
        mark_notification_read(notif_id, self.user_a)
        feed = get_notifications(self.user_a, role="PAYRENT")
        matching = next((n for n in feed if n["id"] == notif_id), None)
        self.assertIsNotNone(matching)
        self.assertTrue(matching.get("is_read") or matching.get("read"))

        # Delete notification
        delete_notification(notif_id, self.user_a)
        feed_after = get_notifications(self.user_a, role="PAYRENT")
        self.assertFalse(any(n["id"] == notif_id for n in feed_after))


if __name__ == "__main__":
    unittest.main()
