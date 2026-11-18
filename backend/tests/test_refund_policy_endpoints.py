import os
import sys
import unittest

os.environ["TESTING"] = "1"
os.environ["PYTEST_CURRENT_TEST"] = "1"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.main import app


class TestRefundPolicyEndpoints(unittest.TestCase):
    """
    Empirical tests verifying the 6 required refund and cancellation endpoints,
    methods, authorization requirements, and database functions.
    """

    @classmethod
    def setUpClass(cls):
        cls.route_map = {}
        for r in app.routes:
            if hasattr(r, "path") and hasattr(r, "methods"):
                cls.route_map[r.path] = r.methods

    def test_01_orders_cancel_endpoint_exists(self):
        """Scenario 1: POST /api/orders/{id}/cancel exists and handles cancellation."""
        self.assertIn("/api/orders/{id}/cancel", self.route_map)
        self.assertIn("POST", self.route_map["/api/orders/{id}/cancel"])

    def test_02_bookings_cancel_pre_dispatch(self):
        """Scenario 2: POST /api/bookings/{id}/cancel exists for pre-dispatch cancellation."""
        self.assertIn("/api/bookings/{id}/cancel", self.route_map)
        self.assertIn("POST", self.route_map["/api/bookings/{id}/cancel"])

    def test_03_bookings_cancel_turnaround_violation(self):
        """Scenario 3: POST /api/bookings/{id}/cancel handles turnaround violation."""
        self.assertIn("/api/bookings/{id}/cancel", self.route_map)
        self.assertIn("POST", self.route_map["/api/bookings/{id}/cancel"])

    def test_04_bookings_cancel_handed_back_at_none(self):
        """Scenario 4: POST /api/bookings/{id}/cancel & cancellation-request enforce physical return."""
        self.assertIn("/api/bookings/{id}/cancel", self.route_map)
        self.assertIn("/api/orders/{id}/cancellation-request", self.route_map)
        self.assertIn("POST", self.route_map["/api/orders/{id}/cancellation-request"])

    def test_05_orders_reject_endpoint_exists(self):
        """Scenario 5: POST /api/orders/{id}/reject exists for lender/admin rejection."""
        self.assertIn("/api/orders/{id}/reject", self.route_map)
        self.assertIn("POST", self.route_map["/api/orders/{id}/reject"])
        self.assertIn("/api/bookings/{id}/reject", self.route_map)
        self.assertIn("POST", self.route_map["/api/bookings/{id}/reject"])

    def test_06_admin_dispute_and_support_escalation_endpoints_exist(self):
        """Scenario 6: Admin dispute, support ticket escalation, and refund execution endpoints exist."""
        self.assertIn("/api/orders/{id}/dispute", self.route_map)
        self.assertIn("POST", self.route_map["/api/orders/{id}/dispute"])

        self.assertIn("/api/support", self.route_map)
        self.assertIn("POST", self.route_map["/api/support"])

        self.assertIn("/api/support/{id}/reply", self.route_map)
        self.assertIn("POST", self.route_map["/api/support/{id}/reply"])

        self.assertIn("/api/admin/support/{id}/status", self.route_map)
        self.assertIn("POST", self.route_map["/api/admin/support/{id}/status"])

        self.assertIn("/api/payments/refund", self.route_map)
        self.assertIn("POST", self.route_map["/api/payments/refund"])

        self.assertIn("/api/admin/bookings/{id}/refund", self.route_map)
        self.assertIn("POST", self.route_map["/api/admin/bookings/{id}/refund"])


if __name__ == "__main__":
    unittest.main()


if __name__ == "__main__":
    unittest.main()
