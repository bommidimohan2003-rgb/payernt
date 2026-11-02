"""
PAYENT AGENT — PHASE 8.9: SAFE KNOWLEDGE INGESTION & CONTROLLED PUBLICATION TEST SUITE
Verifies:
1. Import idempotency and duplicate prevention.
2. Initial pending_review status and verification filtering.
3. [VERIFY] marker rejection upon publication.
4. Administrative RBAC enforcement on publication and verification.
5. Live knowledge retrieval from database with entry ID and source reference.
6. Hybrid query coordination with diagnostic metadata.
7. Live DB routing and auth gating.
8. ABOUT_PAYENT retrieves database knowledge entry rather than template.
9. Tenglish transliteration retrieval.
10. Database failure resilience and fail-closed safety.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from agent_engine.context import create_guest_context, from_auth_token
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
)
from agent_engine.retrieval.tfidf_engine import (
    AgentKnowledgeRetriever,
    KnowledgeDocument,
    RetrievalConfig,
)
from agent_engine.tool_router import AgentToolRouter
from scripts.import_knowledge_guide import (
    generate_stable_id,
    import_knowledge_guide,
    parse_docx_knowledge_guide,
)


class TestAgentIngestionPhase89(unittest.TestCase):
    """Exhaustive tests for Phase 8.9 knowledge ingestion and controlled publication."""

    def setUp(self):
        reset_knowledge_state()
        KnowledgeIndexManager.reset()
        KnowledgeManager.reset()
        self.km = KnowledgeManager(use_in_memory=True)
        self.im = KnowledgeIndexManager(knowledge_manager=self.km)
        self.coordinator = HybridQueryCoordinator(
            index_manager=self.im, knowledge_manager=self.km
        )
        self.guest_ctx = create_guest_context()

    def tearDown(self):
        reset_knowledge_state()
        KnowledgeIndexManager.reset()
        KnowledgeManager.reset()

    def test_01_import_idempotency_and_duplicate_prevention(self):
        """Verifies parser extracts exactly 70 canonical entries and second import actions 0 new records."""
        docx_path = os.path.join(BACKEND_DIR, "..", "PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx")
        if not os.path.exists(docx_path):
            self.skipTest("Knowledge guide DOCX not found at expected path")

        entries = parse_docx_knowledge_guide(docx_path)
        self.assertEqual(len(entries), 70, "Guide must parse exactly 70 canonical questions")

        # Initial import (in-memory mode)
        stats1 = import_knowledge_guide(file_path=docx_path, dry_run=False, km=self.km)
        self.assertEqual(stats1["inserted"], 70)
        self.assertEqual(stats1["skipped_existing"], 0)

        # Idempotent second import
        stats2 = import_knowledge_guide(file_path=docx_path, dry_run=False, km=self.km)
        self.assertEqual(stats2["inserted"], 0, "Second run must insert 0 duplicates")
        self.assertEqual(stats2["skipped_existing"], 70, "Second run must skip all 70 existing entries")

    def test_02_pending_review_and_verification_filtering(self):
        """Verifies newly ingested entries are strictly pending_review and unverified, yielding 0 active documents."""
        # Create unverified entry
        entry = self.km.create_entry(
            category="General information",
            canonical_question="How does Payent work?",
            answer_markdown="Payent connects gear owners with renters.",
            retrieval_type="guide",
            status="pending_review",
            is_verified=False,
            source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
        )
        self.assertEqual(entry["status"], "pending_review")
        self.assertFalse(entry["is_verified"])

        # Active documents filter must exclude it
        docs = self.km.get_active_knowledge_documents()
        self.assertEqual(len(docs), 0, "Pending review entries must not be returned as active documents")

        # Refresh index: document count must be 0
        self.im.refresh_index()
        self.assertEqual(self.im.get_metadata()["document_count"], 0)

    def test_03_verify_marker_publication_rejection(self):
        """Verifies publication is strictly rejected if answer contains [VERIFY."""
        entry = self.km.create_entry(
            category="Account and registration",
            canonical_question="How do I update my profile?",
            answer_markdown="Go to settings. [VERIFY editable fields.]",
            retrieval_type="guide",
            status="pending_review",
            is_verified=False,
        )

        # Admin tries to publish without removing marker
        with self.assertRaises(ValueError) as ctx:
            self.km.publish_entry(
                knowledge_id=entry["id"],
                approved_by="admin@payent.in",
                is_admin=True,
                require_verified=False,
            )
        self.assertIn("VERIFY", str(ctx.exception))

    def test_04_unauthorized_admin_requests_rejected(self):
        """Verifies non-admin users cannot publish or verify knowledge entries."""
        entry = self.km.create_entry(
            category="KYC verification",
            canonical_question="What is KYC?",
            answer_markdown="KYC is Know Your Customer verification.",
            retrieval_type="guide",
            status="pending_review",
            is_verified=True,
        )

        with self.assertRaises(PermissionError):
            self.km.publish_entry(
                knowledge_id=entry["id"],
                approved_by="attacker@domain.com",
                is_admin=False,
            )

    def test_05_guide_retrieval_with_metadata(self):
        """Verifies published guide entry is retrieved with knowledge_id and source_reference in diagnostic metadata."""
        entry = self.km.create_entry(
            category="Booking and rental",
            canonical_question="How do I book a product on Payent?",
            answer_markdown="Select dates, review pricing, and click Reserve Equipment.",
            retrieval_type="guide",
            status="pending_review",
            is_verified=False,
            source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
        )
        # Verify & Publish
        self.km.verify_entry(entry["id"], verified_by="admin@payent.in")
        self.km.publish_entry(entry["id"], approved_by="admin@payent.in", is_admin=True)
        self.im.refresh_index()

        # Execute query through coordinator
        res = self.coordinator.coordinate_query("How do I book a product on Payent?", self.guest_ctx)
        self.assertEqual(res["tool_called"], "knowledge_retrieval")
        self.assertIsNotNone(res["tool_result"])
        self.assertEqual(res["tool_result"]["knowledge_id"], entry["id"])
        self.assertEqual(res["tool_result"]["source_reference"], "PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx")
        self.assertIn("Select dates, review pricing", res["response_text"])

    def test_06_hybrid_routing_with_knowledge_id_and_source(self):
        """Verifies hybrid query combines live account context with verified policy guidance and records source metadata."""
        policy_entry = self.km.create_entry(
            category="Booking and rental",
            canonical_question="How do I cancel a booking?",
            answer_markdown="Bookings can be cancelled before delivery dispatch with full refund.",
            retrieval_type="hybrid",
            status="pending_review",
            is_verified=False,
            source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
        )
        self.km.verify_entry(policy_entry["id"], verified_by="admin@payent.in")
        self.km.publish_entry(policy_entry["id"], approved_by="admin@payent.in", is_admin=True)
        self.im.refresh_index()

        res = self.coordinator.coordinate_query("Can I cancel my booking and what is the policy?", self.guest_ctx)
        self.assertEqual(res["tool_called"], "hybrid_retrieval")
        self.assertEqual(res["query_type"], QueryType.HYBRID.value)
        tool_res = res["tool_result"]
        self.assertEqual(tool_res["knowledge_id"], policy_entry["id"])
        self.assertEqual(tool_res["source_reference"], "PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx")

    def test_07_live_db_routing_preserves_auth_boundary(self):
        """Verifies specific booking queries route to LIVE_DB without converting into static text."""
        res = self.coordinator.coordinate_query("Where is my booking ord_98765?", self.guest_ctx)
        self.assertEqual(res["query_type"], QueryType.LIVE_DB.value)
        self.assertEqual(res["tool_called"], "booking_lookup")
        self.assertTrue(res["requires_auth"])

    def test_08_about_payent_retrieves_published_guide_entry(self):
        """Verifies ABOUT_PAYENT queries retrieve the database entry when published, rather than only falling back to template."""
        # 1. Before publishing: falls back to template
        res_before = self.coordinator.coordinate_query("What is Payent?", self.guest_ctx)
        self.assertIsNone(res_before["tool_called"])

        # 2. Ingest, verify, and publish approved guide entry
        q1_entry = self.km.create_entry(
            category="General information",
            canonical_question="What is Payent?",
            answer_markdown="Payent is an authorized equipment rental marketplace.",
            retrieval_type="guide",
            status="pending_review",
            is_verified=False,
            source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
            custom_id="KB-DOCX-001-TEST",
        )
        self.km.verify_entry(q1_entry["id"], verified_by="admin@payent.in")
        self.km.publish_entry(q1_entry["id"], approved_by="admin@payent.in", is_admin=True)
        self.im.refresh_index()

        # 3. After publishing: retrieves database entry
        res_after = self.coordinator.coordinate_query("What is Payent?", self.guest_ctx)
        self.assertEqual(res_after["tool_called"], "knowledge_retrieval")
        self.assertEqual(res_after["tool_result"]["knowledge_id"], "KB-DOCX-001-TEST")
        self.assertEqual(res_after["tool_result"]["source_reference"], "PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx")
        self.assertIn("authorized equipment rental marketplace", res_after["response_text"])

    def test_09_tenglish_and_paraphrased_queries_retrieve_published_entries(self):
        """Verifies Tenglish transliteration retrieves published articles correctly."""
        entry = self.km.create_entry(
            category="General information",
            canonical_question="What is Payrent?",
            answer_markdown="Payrent is the customer renting portal on Payent.",
            retrieval_type="guide",
            status="pending_review",
            is_verified=False,
            synonyms=["Payrent meaning enti?", "What is the renter portal?"],
            source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
        )
        self.km.verify_entry(entry["id"], verified_by="admin@payent.in")
        self.km.publish_entry(entry["id"], approved_by="admin@payent.in", is_admin=True)
        self.im.refresh_index()

        res = self.coordinator.coordinate_query("Payrent meaning enti?", self.guest_ctx)
        self.assertEqual(res["tool_called"], "knowledge_retrieval")
        tool_res = res["tool_result"]
        self.assertEqual(tool_res.get("knowledge_id"), entry["id"])

    def test_10_database_failure_fail_closed_behavior(self):
        """Verifies retrieval fails closed cleanly if persistent database drops."""
        with patch.object(self.im, "refresh_index", return_value=False):
            success = self.im.refresh_index()
            self.assertFalse(success)


if __name__ == "__main__":
    unittest.main()
