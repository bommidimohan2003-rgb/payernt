import os
import sys
import unittest
from unittest.mock import patch

os.environ.setdefault("TESTING", "1")

from fastapi import Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import auth as backend_auth
import database as backend_db
import main as backend_main


class TestProductsPaginationPhase3(unittest.TestCase):
    def setUp(self):
        backend_main.invalidate_cache()

    def tearDown(self):
        backend_main.invalidate_cache()

    def test_cors_exposes_total_count_header(self):
        cors_middlewares = [
            mw for mw in backend_main.app.user_middleware
            if mw.cls.__name__ == "CORSMiddleware"
        ]
        self.assertTrue(cors_middlewares, "CORSMiddleware should be registered")
        expose_headers = cors_middlewares[0].kwargs.get("expose_headers", [])
        self.assertIn("X-Total-Count", expose_headers)

    def test_products_endpoint_merges_sorts_sets_x_total_count_and_slices(self):
        def _custom_items(**kwargs):
            return [
                {
                    "id": "custom-1",
                    "title": "Sony A7 IV",
                    "category": "cameras",
                    "description": "Mirrorless camera",
                    "daily_rate": 2400,
                    "owner_email": "owner-a@payent.com",
                    "owner_status": "active",
                    "created_at": "2026-10-01T10:00:00Z",
                },
                {
                    "id": "custom-2",
                    "title": "MacBook Pro 16",
                    "category": "laptops",
                    "description": "Creator workstation",
                    "daily_rate": 3200,
                    "owner_email": "owner-b@payent.com",
                    "owner_status": "active",
                    "created_at": "2026-10-03T10:00:00Z",
                },
            ]

        payernt_items = [
            {
                "id": "payernt-1",
                "title": "Rode Wireless Pro",
                "name": "Rode Wireless Pro",
                "category": "audio",
                "description": "Dual wireless microphone kit",
                "daily_rate": 900,
                "owner_email": "owner-c@payent.com",
                "created_at": "2026-10-04T10:00:00Z",
                "available": True,
            },
            {
                "id": "payernt-2",
                "title": "DJI Mini 4 Pro",
                "name": "DJI Mini 4 Pro",
                "category": "drones",
                "description": "Compact 4K drone",
                "daily_rate": 1800,
                "owner_email": "owner-a@payent.com",
                "created_at": "2026-10-02T10:00:00Z",
                "available": True,
            },
        ]

        with patch.object(backend_main, "get_all_approved_custom_products", side_effect=_custom_items) as mock_custom, \
             patch("payernt_database.get_all_active_payernt_products", return_value=payernt_items), \
             patch.object(backend_db, "get_cached_owner_status", return_value="active"), \
             patch.object(backend_main, "check_products_booking_conflicts", return_value=[]):

            # Page 1 with limit 2 sorted newest -> order should be payernt-1, custom-2, payernt-2, custom-1
            res1 = Response()
            data1 = backend_main.fetch_public_listings(
                response=res1,
                limit=2,
                page=1,
                q=None,
                categories=None,
                min_price=None,
                max_price=None,
                city=None,
                pincode=None,
                condition=None,
                start_date=None,
                end_date=None,
                sort="newest",
                authorization=None,
            )
            self.assertEqual(res1.headers.get("X-Total-Count"), "4")
            self.assertEqual([item["id"] for item in data1], ["payernt-1", "custom-2"])
            mock_custom.assert_called_with(limit=None, offset=0)

            # Page 2 returns remaining items cleanly
            res2 = Response()
            data2 = backend_main.fetch_public_listings(
                response=res2,
                limit=2,
                page=2,
                q=None,
                categories=None,
                min_price=None,
                max_price=None,
                city=None,
                pincode=None,
                condition=None,
                start_date=None,
                end_date=None,
                sort="newest",
                authorization=None,
            )
            self.assertEqual(res2.headers.get("X-Total-Count"), "4")
            self.assertEqual([item["id"] for item in data2], ["payernt-2", "custom-1"])

            # Overflow page returns empty array with full X-Total-Count
            res3 = Response()
            data3 = backend_main.fetch_public_listings(
                response=res3,
                limit=2,
                page=5,
                q=None,
                categories=None,
                min_price=None,
                max_price=None,
                city=None,
                pincode=None,
                condition=None,
                start_date=None,
                end_date=None,
                sort="newest",
                authorization=None,
            )
            self.assertEqual(res3.headers.get("X-Total-Count"), "4")
            self.assertEqual(data3, [])

    def test_caller_email_exclusion_runs_before_total_count_and_slice(self):
        custom_items = [
            {
                "id": "item-1",
                "title": "Item Owned By Caller",
                "category": "cameras",
                "daily_rate": 1000,
                "owner_email": "caller@payent.com",
                "owner_status": "active",
                "created_at": "2026-10-05T10:00:00Z",
            },
            {
                "id": "item-2",
                "title": "Item Two",
                "category": "cameras",
                "daily_rate": 1100,
                "owner_email": "other@payent.com",
                "owner_status": "active",
                "created_at": "2026-10-04T10:00:00Z",
            },
            {
                "id": "item-3",
                "title": "Item Three",
                "category": "cameras",
                "daily_rate": 1200,
                "owner_email": "other2@payent.com",
                "owner_status": "active",
                "created_at": "2026-10-03T10:00:00Z",
            },
        ]

        token = backend_auth.create_access_token({"sub": "caller@payent.com"})

        with patch.object(backend_main, "get_all_approved_custom_products", return_value=list(custom_items)), \
             patch("payernt_database.get_all_active_payernt_products", return_value=[]), \
             patch.object(backend_db, "get_cached_owner_status", return_value="active"), \
             patch.object(backend_main, "check_products_booking_conflicts", return_value=[]):

            res = Response()
            page1 = backend_main.fetch_public_listings(
                response=res,
                limit=1,
                page=1,
                q=None,
                categories=None,
                min_price=None,
                max_price=None,
                city=None,
                pincode=None,
                condition=None,
                start_date=None,
                end_date=None,
                sort="newest",
                authorization=f"Bearer {token}",
            )
            self.assertEqual(res.headers.get("X-Total-Count"), "2")
            self.assertEqual(len(page1), 1)
            self.assertEqual(page1[0]["id"], "item-2")

    def test_real_product_location_prioritized_over_generic_india_and_preserves_redaction(self):
        custom_items = [
            {
                "id": "custom-gajuwaka",
                "title": "Asus vivobook 15",
                "category": "computers",
                "daily_rate": 500,
                "product_city": "visakhapatnam",
                "product_area": "Gajuwaka",
                "owner_city": "India",
                "owner_address": "Private Street 99",
                "owner_pincode": "530051",
                "owner_email": "owner-a@payent.com",
                "owner_status": "active",
                "available": True,
                "created_at": "2026-10-05T10:00:00Z",
            },
            {
                "id": "custom-pendurthi",
                "title": "Acer",
                "category": "computers",
                "daily_rate": 800,
                "product_city": "Pendurthi",
                "product_area": "Pendurthi",
                "owner_city": "India",
                "owner_email": "owner-b@payent.com",
                "owner_status": "active",
                "available": True,
                "created_at": "2026-10-04T10:00:00Z",
            },
        ]
        payernt_items = [
            {
                "id": "payernt-blr",
                "title": "Sony FX6",
                "name": "Sony FX6",
                "category": "cameras",
                "daily_rate": 4500,
                "city": "Bengaluru",
                "area": "",
                "owner_email": "owner-c@payent.com",
                "created_at": "2026-10-06T10:00:00Z",
                "available": True,
            }
        ]

        with patch.object(backend_main, "get_all_approved_custom_products", return_value=custom_items), \
             patch("payernt_database.get_all_active_payernt_products", return_value=payernt_items), \
             patch.object(backend_db, "get_cached_owner_status", return_value="active"), \
             patch.object(backend_main, "check_products_booking_conflicts", return_value=[]):

            res = Response()
            items = backend_main.fetch_public_listings(
                response=res,
                limit=10,
                page=1,
                q=None,
                categories=None,
                min_price=None,
                max_price=None,
                city=None,
                pincode=None,
                condition=None,
                start_date=None,
                end_date=None,
                sort="newest",
                authorization=None,
            )
            by_id = {item["id"]: item for item in items}
            self.assertEqual(by_id["custom-gajuwaka"]["location"], "Gajuwaka, Visakhapatnam")
            self.assertEqual(by_id["custom-gajuwaka"]["city"], "Visakhapatnam")
            self.assertEqual(by_id["custom-gajuwaka"]["area"], "Gajuwaka")
            self.assertIsNone(by_id["custom-gajuwaka"]["owner"]["address"])
            self.assertIsNone(by_id["custom-gajuwaka"]["owner"]["pincode"])

            self.assertEqual(by_id["custom-pendurthi"]["location"], "Pendurthi")
            self.assertEqual(by_id["payernt-blr"]["location"], "Bengaluru")
            self.assertEqual(by_id["payernt-blr"]["city"], "Bengaluru")
            self.assertTrue(by_id["payernt-blr"]["available"])
            self.assertEqual(by_id["payernt-blr"]["availability_status"], "available")


if __name__ == "__main__":
    unittest.main()
