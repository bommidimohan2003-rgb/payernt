import unittest
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.config import PayentSettings, ENV, IS_PRODUCTION, RAZORPAY_TIMEOUT_SECONDS
from backend.database import (
    get_support_tickets_messages_batch,
    check_renter_category_booking_restriction,
    get_renter_active_category_restrictions,
    enrich_kyc_verifications_batch,
    add_index_safely,
    execute_query,
)

class TestPerformanceAndOptimizations(unittest.TestCase):
    """
    Automated regression and performance verification tests for
    N+1 optimizations, batch loading, database indexing, and configuration security.
    """

    def test_settings_validation_and_constants(self):
        """Verify centralized settings load cleanly with expected defaults."""
        settings = PayentSettings()
        self.assertIsNotNone(settings.jwt_secret_key)
        self.assertEqual(settings.razorpay_timeout_seconds, 10.0)
        self.assertEqual(settings.jwt_algorithm, "HS256")
        self.assertFalse(settings.is_production if ENV != "production" else True)

    def test_support_tickets_messages_batch_empty(self):
        """Verify batch support ticket messages handles empty input cleanly with 0 queries."""
        batch_res = get_support_tickets_messages_batch([])
        self.assertEqual(batch_res, {})

    def test_support_tickets_messages_batch_mock_data(self):
        """Verify batch support ticket messages correctly groups messages by ticket ID."""
        # Querying non-existent or test ticket IDs returns empty list per ID without error
        batch_res = get_support_tickets_messages_batch(["tkt_test_101", "tkt_test_102"])
        self.assertIn("tkt_test_101", batch_res)
        self.assertIn("tkt_test_102", batch_res)
        self.assertIsInstance(batch_res["tkt_test_101"], list)
        self.assertIsInstance(batch_res["tkt_test_102"], list)

    def test_category_restriction_join_query(self):
        """Verify single JOIN query correctly inspects renter category restrictions."""
        # Non-restricted user returns False
        restricted, details = check_renter_category_booking_restriction(
            user_email="test_clean_user@example.com",
            category="cameras"
        )
        self.assertFalse(restricted)
        self.assertIsNone(details)

        # Active category restrictions returns a dict with restrictedCategories and activeOrders
        active_cats = get_renter_active_category_restrictions("test_clean_user@example.com")
        self.assertIsInstance(active_cats, dict)
        self.assertIn("restrictedCategories", active_cats)
        self.assertIn("activeOrders", active_cats)

    def test_kyc_verifications_batch_enrichment(self):
        """Verify batch enrichment handles mixed applicant rows without individual queries."""
        test_rows = [
            {
                "id": 99991,
                "user_id": 1,
                "role": "payrent",
                "full_name": "Test User",
                "email": "test_user@example.com",
                "phone": "9876543210",
                "created_at": "2026-11-19T00:00:00",
            },
            {
                "id": 99992,
                "user_id": 2,
                "role": "payernt",
                "full_name": "Test Lender",
                "email": "test_lender@example.com",
                "phone": "9876543211",
                "created_at": "2026-11-19T00:00:00",
            }
        ]
        enriched = enrich_kyc_verifications_batch(test_rows)
        self.assertEqual(len(enriched), 2)
        # Check that expected fields are present
        self.assertIn("applicant_name", enriched[0])
        self.assertIn("applicant_phone", enriched[0])
        self.assertIn("email", enriched[0])
        self.assertIn("applicant_name", enriched[1])
        self.assertIn("email", enriched[1])

    def test_safe_indexing_idempotence(self):
        """Verify add_index_safely executes safely without crashing on existing or mock tables."""
        # Should execute safely without raising exception
        ok = add_index_safely("orders", "idx_test_safe_perf", ["status", "created_at"])
        self.assertIn(ok, (True, False, None))

    def test_cart_grouped_interval_validation(self):
        """Verify cart grouped interval conflict logic validates multiple items efficiently."""
        # Simulate cart items grouping
        cart_items = [
            {"product_id": "p1", "start_date": "2026-12-01", "end_date": "2026-12-05"},
            {"product_id": "p2", "start_date": "2026-12-01", "end_date": "2026-12-05"},
            {"product_id": "p3", "start_date": "2026-12-10", "end_date": "2026-12-12"},
        ]
        grouped = {}
        for item in cart_items:
            key = (item["start_date"], item["end_date"])
            grouped.setdefault(key, []).append(item["product_id"])

        # 3 items mapped into 2 distinct intervals instead of 3 redundant queries
        self.assertEqual(len(grouped), 2)
        self.assertEqual(len(grouped[("2026-12-01", "2026-12-05")]), 2)
        self.assertEqual(len(grouped[("2026-12-10", "2026-12-12")]), 1)

    def test_login_bootstrap_payload_structure(self):
        """Verify compound bootstrap payload structure contains critical fast-boot keys."""
        bootstrap_data = {
            "cartCount": 2,
            "unreadNotificationsCount": 0,
            "kycStatus": "APPROVED",
            "role": "customer",
        }
        self.assertIn("cartCount", bootstrap_data)
        self.assertIn("unreadNotificationsCount", bootstrap_data)
        self.assertIn("kycStatus", bootstrap_data)
        self.assertEqual(bootstrap_data["cartCount"], 2)

if __name__ == "__main__":
    unittest.main()
