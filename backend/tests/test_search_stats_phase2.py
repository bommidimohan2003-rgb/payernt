import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import Response
import main as backend_main
import database as backend_db
from search_ml import MLSearchEngine


class TestSearchStatsPhase2(unittest.TestCase):
    def setUp(self):
        backend_main.invalidate_cache()
        self.orig_engine = backend_main.ml_search_engine
        self.orig_get_catalog = backend_main.get_recommendation_catalog
        self.orig_get_popular = backend_main.get_popular_search_queries

    def tearDown(self):
        backend_main.ml_search_engine = self.orig_engine
        backend_main.get_recommendation_catalog = self.orig_get_catalog
        backend_main.get_popular_search_queries = self.orig_get_popular
        backend_main.invalidate_cache()

    def test_search_stats_unindexed_rebuilds_and_returns_contract(self):
        engine = MLSearchEngine()
        backend_main.ml_search_engine = engine
        backend_main.get_recommendation_catalog = lambda: [
            {
                "id": "p-1",
                "title": "MacBook Pro M3",
                "category": "electronics",
                "description": "Studio laptop for creators",
            },
            {
                "id": "p-2",
                "title": "Canon EOS R5",
                "category": "cameras",
                "description": "Full frame cinema mirrorless camera",
            },
        ]
        backend_main.get_popular_search_queries = lambda limit=6: ["macbook", "canon"]

        body = backend_main.get_search_stats()
        self.assertTrue(body["success"])
        self.assertTrue(body["is_indexed"])
        self.assertEqual(body["total_indexed"], 2)
        self.assertEqual(body["indexed_products_count"], 2)
        self.assertEqual(engine.total_documents, 2)
        self.assertGreater(body["vocabulary_size"], 0)
        self.assertEqual(body["popular_queries"], ["macbook", "canon"])

    def test_search_stats_empty_catalog_and_db_returns_zero_and_empty_list(self):
        engine = MLSearchEngine()
        backend_main.ml_search_engine = engine
        backend_main.get_recommendation_catalog = lambda: []
        backend_main.get_popular_search_queries = lambda limit=6: []

        body = backend_main.get_search_stats()
        self.assertTrue(body["success"])
        self.assertFalse(body["is_indexed"])
        self.assertEqual(body["total_indexed"], 0)
        self.assertEqual(body["indexed_products_count"], 0)
        self.assertEqual(body["vocabulary_size"], 0)
        # Never fabricates fake queries when DB is empty
        self.assertEqual(body["popular_queries"], [])

    def test_db_helpers_handle_none_connection_without_attribute_error(self):
        with patch.object(backend_db, "get_db_connection", return_value=None):
            popular = backend_db.get_popular_search_queries(limit=5)
            affinities = backend_db.get_user_category_affinities("user@example.com", "sess-1")
            self.assertIsInstance(popular, list)
            self.assertIsInstance(affinities, dict)

    def test_fetch_public_listings_filters_by_q(self):
        mock_listings = [
            {
                "id": "p-canon",
                "title": "Canon EOS R5",
                "category": "cameras",
                "description": "Full frame cinema mirrorless camera",
                "daily_rate": 2500,
                "owner_email": "owner@payent.com",
            },
            {
                "id": "p-mac",
                "title": "MacBook Pro M3",
                "category": "electronics",
                "description": "Laptop workstation",
                "daily_rate": 1800,
                "owner_email": "owner@payent.com",
            },
        ]
        with patch.object(backend_main, "get_all_approved_custom_products", return_value=mock_listings), \
             patch.object(backend_main, "check_products_booking_conflicts", return_value=[]):
            res = Response()
            results = backend_main.fetch_public_listings(
                response=res,
                limit=20,
                page=1,
                q="canon",
                categories=None,
                min_price=None,
                max_price=None,
                city=None,
                pincode=None,
                condition=None,
                start_date=None,
                end_date=None,
                sort=None,
                authorization=None,
            )
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]["id"], "p-canon")


if __name__ == "__main__":
    unittest.main()
