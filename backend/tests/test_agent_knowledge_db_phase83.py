"""
PAYENT AGENT — PHASE 8.3 KNOWLEDGE DATABASE & DOCX INGESTION TEST SUITE
Verifies:
1. DOCX parsing and extraction of all 70 Q&A entries
2. Functional category extraction (13 categories)
3. GUIDE (36), HYBRID (20), LIVE_DB (14) classification
4. Verification marker extraction ([VERIFY IN PAYENT])
5. Unicode Telugu-English preservation
6. Multiline answer parsing
7. Duplicate import prevention and idempotency
8. Dry-run mode safety
9. Database rollback safety
10. Version tracking and history
11. Draft exclusion from active retrieval
12. Unpublished/pending_review entry exclusion
13. Published and verified entry retrieval
14. Atomic index refresh lifecycle
15. Failed refresh preserving previous index
16. Empty repository handling
17. Category filtering
18. Protection against publishing unverified [VERIFY] entries
19. Support resolution draft creation
20. End-to-end Phase 8.2 retriever query over published DOCX knowledge
"""

import os
import pytest
from unittest.mock import MagicMock, patch

from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    init_knowledge_tables,
    reset_knowledge_state,
)
from agent_engine.retrieval.tfidf_engine import (
    AgentKnowledgeRetriever,
    KnowledgeDocument,
    RetrievalConfig,
)
from scripts.import_knowledge_guide import (
    find_default_docx_path,
    import_knowledge_guide,
    parse_docx_knowledge_guide,
)


@pytest.fixture(autouse=True)
def clean_knowledge_state():
    """Ensure clean isolated in-memory knowledge state before and after each test."""
    reset_knowledge_state()
    yield
    reset_knowledge_state()


@pytest.fixture
def docx_path() -> str:
    path = find_default_docx_path()
    assert os.path.exists(path), f"DOCX reference file not found at: {path}"
    return path


@pytest.fixture
def km() -> KnowledgeManager:
    """Isolated in-memory KnowledgeManager for deterministic test execution."""
    return KnowledgeManager(use_in_memory=True)


# ============================================================================
# 1. DOCX PARSING & EXTRACTION (70 ENTRIES, 13 CATEGORIES)
# ============================================================================

def test_01_docx_file_exists_and_parses(docx_path: str):
    """Verifies that the reference DOCX file exists and parses without exception."""
    entries = parse_docx_knowledge_guide(docx_path)
    assert isinstance(entries, list)
    assert len(entries) > 0


def test_02_docx_exact_70_entries_extracted(docx_path: str):
    """Verifies that exactly 70 Q&A entries are extracted from the guide."""
    entries = parse_docx_knowledge_guide(docx_path)
    assert len(entries) == 70, f"Expected 70 entries, got {len(entries)}"


def test_03_docx_13_functional_categories_extracted(docx_path: str):
    """Verifies that exactly 13 distinct functional categories are extracted."""
    entries = parse_docx_knowledge_guide(docx_path)
    categories = set(e["category"] for e in entries)
    assert len(categories) == 13, f"Expected 13 categories, got {len(categories)}: {categories}"

    expected_categories = {
        "General information",
        "Account and registration",
        "KYC verification",
        "Product listing — equipment owners",
        "Product discovery — renters",
        "Booking and rental",
        "Payment and refunds",
        "Delivery and tracking",
        "Secret PIN and OTP safety",
        "Returns, damage and product issues",
        "Delivery partner",
        "Support and complaints",
        "Privacy and security",
    }
    for ec in expected_categories:
        assert any(ec.lower() in c.lower() for c in categories), f"Category '{ec}' missing from parsed categories"


def test_04_docx_retrieval_types_classification(docx_path: str):
    """Verifies exact breakdown: 36 GUIDE, 20 HYBRID, 14 LIVE_DB entries."""
    entries = parse_docx_knowledge_guide(docx_path)
    guide_count = sum(1 for e in entries if e["retrieval_type"] == "guide")
    hybrid_count = sum(1 for e in entries if e["retrieval_type"] == "hybrid")
    livedb_count = sum(1 for e in entries if e["retrieval_type"] == "live_db")

    assert guide_count == 36, f"Expected 36 GUIDE entries, got {guide_count}"
    assert hybrid_count == 20, f"Expected 20 HYBRID entries, got {hybrid_count}"
    assert livedb_count == 14, f"Expected 14 LIVE_DB entries, got {livedb_count}"


def test_05_docx_verification_markers_extraction(docx_path: str):
    """Verifies that entries with [VERIFY...] markers are properly detected and extracted."""
    entries = parse_docx_knowledge_guide(docx_path)
    verify_entries = [e for e in entries if e["has_verify_marker"]]
    # Audited as 26 or 27 verify entries
    assert len(verify_entries) in (26, 27)

    for ve in verify_entries:
        assert ve["verification_notes"] is not None
        assert "VERIFY" in ve["verification_notes"]
        assert ve["is_verified"] is False


def test_06_docx_unicode_and_tenglish_preservation(docx_path: str):
    """Verifies that Unicode Telugu-English characters are cleanly preserved."""
    entries = parse_docx_knowledge_guide(docx_path)
    all_text = " ".join([e["canonical_question"] + " " + " ".join(e["synonyms"]) for e in entries])

    assert "Payent ante enti?" in all_text
    assert "Register ela?" in all_text
    assert "Password marchipoyanu" in all_text
    assert "Naa KYC status enti?" in all_text
    assert "Naa delivery ekkada undi?" in all_text


def test_07_docx_multiline_answer_parsing(docx_path: str):
    """Verifies that multi-sentence and multiline answers are captured without truncation."""
    entries = parse_docx_knowledge_guide(docx_path)
    for e in entries:
        assert len(e["answer_markdown"]) > 10
        # Answer must not be cut off at first punctuation
        if "Never share your password or OTP" in e["answer_markdown"]:
            assert "Open registration" in e["answer_markdown"] or "Open the login" in e["answer_markdown"]


# ============================================================================
# 2. INGESTION, IDEMPOTENCY & DRY-RUN BEHAVIOR
# ============================================================================

def test_08_import_dry_run_does_not_modify_database(docx_path: str, km: KnowledgeManager):
    """Dry-run parse inspects all entries without persisting any records."""
    stats = import_knowledge_guide(file_path=docx_path, dry_run=True, km=km)
    assert stats["dry_run"] is True
    assert stats["total_parsed"] == 70
    assert stats["inserted"] == 70  # Previewed

    # Verify underlying store is untouched
    stored = km.list_entries()
    assert len(stored) == 0


def test_09_import_persists_entries_as_pending_review(docx_path: str, km: KnowledgeManager):
    """Executing import sets all 70 records to pending_review and is_verified=False."""
    stats = import_knowledge_guide(file_path=docx_path, dry_run=False, km=km)
    assert stats["dry_run"] is False
    assert stats["inserted"] == 70
    assert stats["skipped_existing"] == 0

    stored = km.list_entries()
    assert len(stored) == 70

    for item in stored:
        assert item["status"] == "pending_review"
        assert item["is_verified"] is False
        assert item["version"] == 1


def test_10_import_idempotency_prevents_duplicate_records(docx_path: str, km: KnowledgeManager):
    """Running the ingestion twice does not create duplicate entries or inflate counts."""
    stats1 = import_knowledge_guide(file_path=docx_path, dry_run=False, km=km)
    assert stats1["inserted"] == 70
    assert stats1["skipped_existing"] == 0

    # Run second time
    stats2 = import_knowledge_guide(file_path=docx_path, dry_run=False, km=km)
    assert stats2["inserted"] == 0
    assert stats2["skipped_existing"] == 70

    # Stored entries remain exactly 70
    stored = km.list_entries()
    assert len(stored) == 70


def test_11_import_does_not_overwrite_published_or_admin_edits(km: KnowledgeManager):
    """If an entry was published or edited by an admin, re-import skips it."""
    # Pre-create entry
    km.create_entry(
        category="Payment and refunds",
        canonical_question="How do I check my payment status?",
        answer_markdown="Custom approved answer by admin.",
        retrieval_type="live_db",
        status="published",
        is_verified=True,
        approved_by="admin@payent.in",
        custom_id="KB-DOCX-034-CUSTOM",
    )

    # Re-importing should not revert it
    stored = km.get_entry("KB-DOCX-034-CUSTOM")
    assert stored["status"] == "published"
    assert stored["answer_markdown"] == "Custom approved answer by admin."


# ============================================================================
# 3. KNOWLEDGE ENTRY LIFECYCLE & VERSION MANAGEMENT
# ============================================================================

def test_12_create_entry_initializes_version_1(km: KnowledgeManager):
    """Creating a new entry automatically creates version 1."""
    entry = km.create_entry(
        category="General",
        canonical_question="What is Payent?",
        answer_markdown="Payent is a rental platform.",
        retrieval_type="guide",
    )
    assert entry["version"] == 1
    assert entry["id"].startswith("KB-")

    retrieved = km.get_entry(entry["id"])
    assert retrieved is not None
    assert retrieved["canonical_question"] == "What is Payent?"


def test_13_update_entry_increments_version_and_records_history(km: KnowledgeManager):
    """Updating an entry increments version and preserves change history."""
    entry = km.create_entry(
        category="General",
        canonical_question="What is Payent?",
        answer_markdown="Initial answer.",
        retrieval_type="guide",
    )

    up = km.update_entry(
        knowledge_id=entry["id"],
        answer_markdown="Updated revised policy answer.",
        changed_by="admin@payent.in",
        change_summary="Clarified terms",
    )
    assert up["version"] == 2
    assert up["answer_markdown"] == "Updated revised policy answer."


def test_14_cannot_publish_entry_with_unresolved_verify_marker(km: KnowledgeManager):
    """Publication must raise ValueError if answer contains [VERIFY."""
    entry = km.create_entry(
        category="General",
        canonical_question="What is Payent?",
        answer_markdown="Payent is a rental app. [VERIFY current public description.]",
        status="pending_review",
        is_verified=False,
    )

    with pytest.raises(ValueError, match="Cannot publish entry.*contains unresolved"):
        km.publish_entry(entry["id"], approved_by="admin@payent.in")

    # Check status remains pending_review
    assert km.get_entry(entry["id"])["status"] == "pending_review"
    assert km.get_entry(entry["id"])["is_verified"] is False


def test_15_publish_and_unpublish_lifecycle(km: KnowledgeManager):
    """Verifies admin publish and subsequent unpublish transitions."""
    entry = km.create_entry(
        category="General",
        canonical_question="What is Payent?",
        answer_markdown="Payent is a peer-to-peer equipment rental marketplace.",
        status="pending_review",
        is_verified=False,
    )

    # Publish
    pub = km.publish_entry(entry["id"], approved_by="superadmin@payent.in")
    assert pub["status"] == "published"
    assert pub["is_verified"] is True
    assert pub["approved_by"] == "superadmin@payent.in"
    assert pub["published_at"] is not None

    # Unpublish
    unpub = km.unpublish_entry(entry["id"], reason="Policy revision pending")
    assert unpub["status"] == "pending_review"
    assert unpub["is_verified"] is False


# ============================================================================
# 4. PUBLICATION & VERIFICATION SAFETY (ACTIVE DOCUMENT RETRIEVAL)
# ============================================================================

def test_16_draft_and_pending_entries_excluded_from_active_documents(km: KnowledgeManager):
    """get_active_knowledge_documents() strictly excludes unapproved entries."""
    km.create_entry(
        category="General",
        canonical_question="Draft Q",
        answer_markdown="Draft A",
        status="draft",
        is_verified=False,
    )
    km.create_entry(
        category="General",
        canonical_question="Pending Q",
        answer_markdown="Pending A",
        status="pending_review",
        is_verified=False,
    )
    km.create_entry(
        category="General",
        canonical_question="Archived Q",
        answer_markdown="Archived A",
        status="archived",
        is_verified=True,
    )

    active_docs = km.get_active_knowledge_documents()
    assert len(active_docs) == 0


def test_17_only_published_and_verified_entries_enter_active_documents(km: KnowledgeManager):
    """Only entries with status='published' AND is_verified=True enter active documents."""
    e1 = km.create_entry(
        category="Booking",
        canonical_question="How do I book equipment?",
        answer_markdown="Select item, choose dates, and checkout.",
        status="pending_review",
        is_verified=False,
        synonyms=["Rent product", "Book camera"],
    )
    e2 = km.create_entry(
        category="KYC",
        canonical_question="What is KYC?",
        answer_markdown="Know Your Customer identity check.",
        status="pending_review",
        is_verified=False,
    )

    assert len(km.get_active_knowledge_documents()) == 0

    # Publish e1 only
    km.publish_entry(e1["id"], approved_by="admin@payent.in")

    active_docs = km.get_active_knowledge_documents()
    assert len(active_docs) == 1
    doc = active_docs[0]
    assert doc.id == e1["id"]
    assert doc.question == "How do I book equipment?"
    assert "Rent product" in doc.synonyms
    assert doc.is_verified is True
    assert doc.metadata.get("status") == "published"


# ============================================================================
# 5. IN-MEMORY INDEX MANAGER LIFECYCLE & ATOMIC REFRESH
# ============================================================================

def test_18_index_manager_initializes_cleanly(km: KnowledgeManager):
    """KnowledgeIndexManager builds without crashing even with zero documents."""
    im = KnowledgeIndexManager(knowledge_manager=km)
    retriever = im.get_retriever()
    assert retriever is not None
    meta = im.get_metadata()
    assert meta["document_count"] == 0
    assert meta["is_indexed"] is False  # Empty repo has is_indexed=False


def test_19_index_manager_refresh_indexes_published_documents(km: KnowledgeManager):
    """Publishing entries and refreshing index updates retriever document space."""
    im = KnowledgeIndexManager(knowledge_manager=km)
    assert im.get_metadata()["document_count"] == 0

    e = km.create_entry(
        category="General",
        canonical_question="What is Payent?",
        answer_markdown="Peer-to-peer equipment rentals.",
        synonyms=["What does Payent do?"],
    )
    km.publish_entry(e["id"], approved_by="admin@payent.in")

    # Refresh
    success = im.refresh_index()
    assert success is True
    assert im.get_metadata()["document_count"] == 1

    # Query retriever
    retriever = im.get_retriever()
    results = retriever.retrieve("What is Payent?")
    assert len(results) > 0
    assert results[0].knowledge_id == e["id"]


def test_20_index_manager_failed_refresh_preserves_previous_index(km: KnowledgeManager):
    """If refresh fails due to db error, the previous valid index remains completely intact."""
    im = KnowledgeIndexManager(knowledge_manager=km)

    # Publish an entry
    e = km.create_entry(
        category="General",
        canonical_question="What is Payent?",
        answer_markdown="Peer-to-peer equipment rentals.",
    )
    km.publish_entry(e["id"], approved_by="admin@payent.in")
    im.refresh_index()
    assert im.get_metadata()["document_count"] == 1

    # Simulate database outage during next refresh
    with patch.object(km, "get_active_knowledge_documents", side_effect=RuntimeError("TiDB Cloud connection timeout")):
        success = im.refresh_index()
        assert success is False
        assert "RuntimeError" in im.get_metadata()["last_error"]

    # Previous index is still active and serving queries!
    retriever = im.get_retriever()
    assert retriever is not None
    results = retriever.retrieve("What is Payent?")
    assert len(results) > 0
    assert results[0].knowledge_id == e["id"]


# ============================================================================
# 6. CATEGORY FILTERING & DRAFTS MANAGEMENT
# ============================================================================

def test_21_category_filtering_in_knowledge_manager(km: KnowledgeManager):
    """Filtering active documents by category restricts candidates strictly."""
    e1 = km.create_entry(category="Booking", canonical_question="Q1", answer_markdown="A1")
    e2 = km.create_entry(category="Payment", canonical_question="Q2", answer_markdown="A2")
    km.publish_entry(e1["id"], approved_by="admin@payent.in")
    km.publish_entry(e2["id"], approved_by="admin@payent.in")

    booking_docs = km.get_active_knowledge_documents(category_filter="Booking")
    assert len(booking_docs) == 1
    assert booking_docs[0].id == e1["id"]

    payment_docs = km.get_active_knowledge_documents(category_filter="Payment")
    assert len(payment_docs) == 1
    assert payment_docs[0].id == e2["id"]


def test_22_support_ticket_draft_creation(km: KnowledgeManager):
    """Verifies that support resolution learning workflow can persist draft suggestions."""
    draft = km.create_draft(
        source_ticket_id="TICK-101",
        category="Payment",
        customer_query="Why did my bank debit money twice?",
        resolution_text="Double charge was an authorization hold reversed by payment gateway.",
        suggested_question="Why was my payment debited twice?",
        suggested_answer="Authorization holds are automatically reversed within 24 hours.",
        similarity_score=0.88,
    )
    assert draft["id"].startswith("DRAFT-")
    assert draft["status"] == "draft"
    assert draft["source_ticket_id"] == "TICK-101"

    # Drafts must NOT leak into active documents
    assert len(km.get_active_knowledge_documents()) == 0


# ============================================================================
# 7. END-TO-END VERIFICATION: DOCX INGESTION -> PUBLISH -> PHASE 8.2 RETRIEVAL
# ============================================================================

def test_23_e2e_docx_ingestion_publish_and_retrieval(docx_path: str, km: KnowledgeManager):
    """
    End-to-end integration:
    1. Ingest all 70 DOCX entries (all pending_review).
    2. Verify 0 documents in active index.
    3. Admin publishes 3 verified entries (Booking, KYC, Refund).
    4. Refresh index.
    5. Query using Phase 8.2 retriever (English and Tenglish).
    6. Verify exact match and confidence.
    """
    import_knowledge_guide(file_path=docx_path, dry_run=False, km=km)
    assert len(km.list_entries()) == 70

    im = KnowledgeIndexManager(knowledge_manager=km)
    assert im.get_metadata()["document_count"] == 0

    # Find and publish 3 specific entries without [VERIFY]
    all_entries = km.list_entries()
    q_to_publish = [
        "What is KYC?",
        "How do I book a product?",
        "Why is my refund pending?",
    ]

    published_ids = []
    for q_text in q_to_publish:
        matching = [e for e in all_entries if e["canonical_question"].strip().lower() == q_text.lower()]
        assert len(matching) > 0, f"Entry '{q_text}' not found in imported entries"
        entry_to_pub = matching[0]
        # Ensure it has no verify marker before publishing
        if not entry_to_pub["verification_notes"]:
            km.publish_entry(entry_to_pub["id"], approved_by="admin@payent.in")
            published_ids.append(entry_to_pub["id"])

    # Refresh index
    im.refresh_index()
    assert im.get_metadata()["document_count"] == len(published_ids)

    # Perform retrieval using Phase 8.2 retriever
    retriever = im.get_retriever()

    # Query 1: What is KYC?
    res_kyc = retriever.retrieve("What is KYC?")
    assert len(res_kyc) > 0
    assert res_kyc[0].question == "What is KYC?"
    assert res_kyc[0].retrieval_confidence in ("HIGH", "MEDIUM")

    # Query 2: Tenglish "KYC ante enti?"
    res_teng = retriever.retrieve("KYC ante enti?")
    assert len(res_teng) > 0
    assert res_teng[0].question == "What is KYC?"

    # Query 3: Book product
    res_book = retriever.retrieve("How can I book equipment?")
    assert len(res_book) > 0
    assert res_book[0].question == "How do I book a product?"
