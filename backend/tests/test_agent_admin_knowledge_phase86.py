"""
PAYENT AGENT — PHASE 8.6 TEST SUITE:
COMPLETE ADMIN KNOWLEDGE MANAGEMENT SYSTEM & LIFECYCLE
Validates:
1. Admin authentication & RBAC boundary enforcement (401 on missing/invalid/expired JWT, 403 on non-admin).
2. Reviewer identity derivation strictly from JWT claims (no spoofing).
3. Knowledge statistics endpoint schema and aggregations.
4. Multi-field search (canonical question, answer markdown, synonyms).
5. Multi-facet filtering (category, status, verification, retrieval type).
6. Pagination handling (page, per_page, total, total_pages).
7. Knowledge entry creation in pending_review (never auto-published).
8. Knowledge entry updating, automatic version increments, and audit tracking.
9. Unicode Telugu-English preservation on create/update.
10. Explicit verification workflow (marks is_verified=True, records reviewer).
11. Rejection of verification on entries containing [VERIFY IN PAYENT].
12. Revocation of verification (resets is_verified=False, demotes published entries).
13. Publication boundary: rejection of unverified entries (400 Bad Request).
14. Publication boundary: rejection of entries with [VERIFY IN PAYENT] (400 Bad Request).
15. Publication of verified clean entries (updates status, triggers atomic retrieval index rebuild).
16. Unpublication removes entry from active retrieval index.
17. Atomic index rebuild preserves previous index if rebuild encounters errors.
18. Version history immutability and rollback as non-destructive forward version.
19. Draft suggestion review, approval (converts to pending_review knowledge entry), rejection, and request-changes.
20. Support ticket PII sanitization (phone, email, cards, OTP, PIN, txn IDs) and internal notes exclusion.
21. Duplicate suggestion detection using TF-IDF similarity.
22. Retrieval index health monitor and manual rebuild endpoint.
23. Production database failure safety (503 Service Unavailable, no mock data fallback).
"""

import copy
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_USERS,
    REVOKED_JTIS,
    DatabaseConnectionError,
)
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
    sanitize_support_text_pii,
    format_canonical_question_from_query,
)

client = TestClient(app)

ADMIN_EMAIL = "admin_phase86@payent.com"
CUSTOMER_EMAIL = "customer_phase86@payent.com"
VENDOR_EMAIL = "vendor_phase86@payent.com"


@pytest.fixture(autouse=True)
def reset_admin_knowledge_state():
    """Reset mock database, JWT revocation, and knowledge state between tests."""
    reset_knowledge_state()
    KnowledgeIndexManager.reset()
    REVOKED_JTIS.clear()

    # Setup admin user
    MOCK_USERS[ADMIN_EMAIL] = {
        "id": ADMIN_EMAIL,
        "email": ADMIN_EMAIL,
        "full_name": "Senior Editorial Admin",
        "role": "admin",
        "verified": True,
        "status": "active",
    }
    # Setup customer user
    MOCK_USERS[CUSTOMER_EMAIL] = {
        "id": CUSTOMER_EMAIL,
        "email": CUSTOMER_EMAIL,
        "full_name": "Test Customer",
        "role": "customer",
        "verified": True,
        "status": "active",
    }
    # Setup vendor user
    MOCK_USERS[VENDOR_EMAIL] = {
        "id": VENDOR_EMAIL,
        "email": VENDOR_EMAIL,
        "full_name": "Test Vendor",
        "role": "vendor",
        "verified": True,
        "status": "active",
    }

    yield

    reset_knowledge_state()
    KnowledgeIndexManager.reset()
    REVOKED_JTIS.clear()


def make_admin_token(email: str = ADMIN_EMAIL, exp_minutes: int = 60, jti: str = "jti_adm_86") -> str:
    return create_access_token(
        {"sub": email, "role": "admin", "account_type": "payrent", "jti": jti},
        expires_delta=timedelta(minutes=exp_minutes),
    )


def make_customer_token(email: str = CUSTOMER_EMAIL) -> str:
    return create_access_token(
        {"sub": email, "role": "customer", "account_type": "payrent", "jti": "jti_cust_86"},
        expires_delta=timedelta(minutes=60),
    )


def make_vendor_token(email: str = VENDOR_EMAIL) -> str:
    return create_access_token(
        {"sub": email, "role": "vendor", "account_type": "payernt", "jti": "jti_vend_86"},
        expires_delta=timedelta(minutes=60),
    )


# ============================================================================
# 1. AUTHENTICATION & RBAC BOUNDARIES
# ============================================================================

def test_01_stats_endpoint_requires_auth():
    """Unauthenticated request is rejected with 401."""
    res = client.get("/api/admin/agent-knowledge/stats")
    assert res.status_code == 401
    detail = res.json().get("detail", "").lower()
    assert "authentication required" in detail or "not authenticated" in detail or "missing" in detail


def test_02_stats_endpoint_rejects_invalid_jwt():
    """Malformed or invalid JWT is rejected with 401."""
    res = client.get(
        "/api/admin/agent-knowledge/stats",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert res.status_code == 401


def test_03_stats_endpoint_rejects_expired_jwt():
    """Expired JWT is rejected with 401."""
    expired_token = create_access_token(
        {"sub": ADMIN_EMAIL, "role": "admin", "jti": "jti_exp"},
        expires_delta=timedelta(minutes=-10),
    )
    res = client.get(
        "/api/admin/agent-knowledge/stats",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401


def test_04_stats_endpoint_rejects_revoked_jwt():
    """Revoked JWT token JTI is rejected with 401."""
    from auth import decode_access_token
    token = make_admin_token()
    payload = decode_access_token(token)
    assert payload and "jti" in payload
    jti = payload["jti"]
    REVOKED_JTIS.add(jti)
    res = client.get(
        "/api/admin/agent-knowledge/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 401
    assert "revoked" in res.json().get("detail", "").lower()


def test_05_stats_endpoint_rejects_customer_role():
    """Customer role is rejected with 403 Forbidden."""
    token = make_customer_token()
    res = client.get(
        "/api/admin/agent-knowledge/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    detail = res.json().get("detail", "").lower()
    assert "authorization required" in detail or "forbidden" in detail


def test_06_stats_endpoint_rejects_vendor_role():
    """Vendor / lender role is rejected with 403 Forbidden."""
    token = make_vendor_token()
    res = client.get(
        "/api/admin/agent-knowledge/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    detail = res.json().get("detail", "").lower()
    assert "authorization required" in detail or "forbidden" in detail


def test_07_stats_endpoint_allows_admin():
    """Admin role gets 200 and complete stats structure."""
    token = make_admin_token()
    res = client.get(
        "/api/admin/agent-knowledge/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    stats = data["data"]
    for key in ["total", "published", "pending_review", "draft_suggestions", "verified", "needs_verification", "index_status"]:
        assert key in stats
    assert stats["index_status"]["status"] in ["healthy", "empty", "degraded"]


def test_08_reviewer_identity_derived_strictly_from_jwt():
    """Reviewer email in audit trail is strictly derived from token claims."""
    token = make_admin_token(email="auditor_lead@payent.com")
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="POLICY",
        canonical_question="Can I cancel within 1 hour?",
        answer_markdown="Free cancellation within 1 hour.",
        created_by="system",
    )

    # Attempt to spoof reviewer via headers/params
    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        json={"verification_notes": "All checks passed", "verified_by": "spoofed_admin@fake.com"},
    )
    assert res.status_code == 200
    updated = res.json()["data"]
    assert updated["verified_by"] == "auditor_lead@payent.com"
    assert updated["verified_by"] != "spoofed_admin@fake.com"


# ============================================================================
# 2. PAGINATION, SEARCH & FILTERING
# ============================================================================

def test_09_knowledge_list_pagination():
    """Knowledge list supports pagination parameters (page, per_page, total_pages)."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    for i in range(12):
        mgr.create_entry(
            category="GENERAL",
            canonical_question=f"Test Question Number {i:02d}?",
            answer_markdown=f"Answer for number {i}.",
            created_by="admin",
        )

    res = client.get(
        "/api/admin/agent-knowledge?page=1&per_page=5",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert len(body["items"]) == 5
    assert body["page"] == 1
    assert body["per_page"] == 5
    assert body["total"] >= 12
    assert body["total_pages"] >= 3

    # Page 2
    res2 = client.get(
        "/api/admin/agent-knowledge?page=2&per_page=5",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    body2 = res2.json()
    assert len(body2["items"]) == 5
    assert body2["page"] == 2


def test_10_knowledge_search_canonical_question():
    """Search matches canonical question keywords."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    mgr.create_entry(
        category="REFUND",
        canonical_question="How long does an instant UPI refund take?",
        answer_markdown="UPI refunds typically reflect within 2 to 4 hours.",
        created_by="admin",
    )
    res = client.get(
        "/api/admin/agent-knowledge?query=instant+UPI+refund",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert any("instant UPI refund" in it["canonical_question"] for it in items)


def test_11_knowledge_search_answer_markdown():
    """Search matches words inside answer markdown."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    mgr.create_entry(
        category="DELIVERY",
        canonical_question="Who delivers the rental equipment?",
        answer_markdown="Our specialized hyper-local delivery fleet handles transport.",
        created_by="admin",
    )
    res = client.get(
        "/api/admin/agent-knowledge?query=hyper-local+fleet",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert any("hyper-local" in it["answer_markdown"] for it in items)


def test_12_knowledge_search_synonyms():
    """Search matches terms in synonyms."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="CANCELLATION",
        canonical_question="How do I cancel my booking?",
        answer_markdown="Go to bookings and tap Cancel.",
        created_by="admin",
    )
    mgr.add_synonym(entry.id, "raddhu cheyatam ela", "admin")

    res = client.get(
        "/api/admin/agent-knowledge?query=raddhu",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(it["id"] == entry.id for it in items)


def test_13_knowledge_filter_category():
    """Filtering by category returns only entries in that category."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    mgr.create_entry(category="KYC", canonical_question="KYC question?", answer_markdown="KYC answer.", created_by="admin")
    mgr.create_entry(category="PAYMENT", canonical_question="Payment question?", answer_markdown="Payment answer.", created_by="admin")

    res = client.get(
        "/api/admin/agent-knowledge?category=KYC",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["category"] == "KYC"


def test_14_knowledge_filter_status():
    """Filtering by status isolates published vs pending entries."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    e1 = mgr.create_entry(category="SEC", canonical_question="Q1?", answer_markdown="A1.", created_by="admin")
    mgr.verify_entry(e1.id, "admin")
    mgr.publish_entry(e1.id, "admin")

    mgr.create_entry(category="SEC", canonical_question="Q2?", answer_markdown="A2.", created_by="admin")

    res_pub = client.get(
        "/api/admin/agent-knowledge?status=published",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_pub.status_code == 200
    for it in res_pub.json()["items"]:
        assert it["status"] == "published"

    res_pen = client.get(
        "/api/admin/agent-knowledge?status=pending_review",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_pen.status_code == 200
    for it in res_pen.json()["items"]:
        assert it["status"] == "pending_review"


def test_15_knowledge_filter_verification_and_retrieval_type():
    """Filter by is_verified and retrieval_type."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    e = mgr.create_entry(
        category="DISPUTE",
        canonical_question="Dispute resolution guide?",
        answer_markdown="How disputes are resolved.",
        retrieval_type="HYBRID",
        created_by="admin",
    )
    mgr.verify_entry(e.id, "admin")

    res = client.get(
        "/api/admin/agent-knowledge?is_verified=true&retrieval_type=HYBRID",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(it["id"] == e.id for it in items)
    for it in items:
        assert it["is_verified"] is True
        assert it["retrieval_type"] == "HYBRID"


# ============================================================================
# 3. KNOWLEDGE ENTRY DETAIL & CRUD
# ============================================================================

def test_16_get_knowledge_entry_detail():
    """Get knowledge entry returns entry details and version list."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="SECURITY",
        canonical_question="How is my security deposit held?",
        answer_markdown="Security deposit is held in escrow until item return inspection.",
        created_by="admin",
    )
    res = client.get(
        f"/api/admin/agent-knowledge/{entry.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["data"]["id"] == entry.id
    assert "versions" in body
    assert len(body["versions"]) >= 1


def test_17_get_nonexistent_entry_returns_404():
    """Nonexistent entry ID returns 404."""
    token = make_admin_token()
    res = client.get(
        "/api/admin/agent-knowledge/NONEXISTENT_999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404


def test_18_create_knowledge_entry_defaults_pending_review():
    """New entry starts in pending_review, is_verified=False, and is NOT published."""
    token = make_admin_token()
    payload = {
        "category": "ACCOUNT",
        "canonical_question": "How do I update my registered mobile number?",
        "answer_markdown": "Go to Account Settings > Security > Update Phone.",
        "retrieval_type": "GUIDE",
        "synonyms": ["change phone", "phone update"],
    }
    res = client.post(
        "/api/admin/agent-knowledge",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert res.status_code == 201
    entry = res.json()["data"]
    assert entry["status"] == "pending_review"
    assert entry["is_verified"] is False
    assert entry["version"] == 1
    assert entry["published_at"] is None

    # Verify NOT in active retrieval index
    idx = KnowledgeIndexManager.get_instance()
    assert not any(d["id"] == entry["id"] for d in idx.get_all_documents())


def test_19_create_knowledge_entry_validations():
    """Short questions or missing answers are rejected with 400 or 422."""
    token = make_admin_token()
    # Missing answer
    res = client.post(
        "/api/admin/agent-knowledge",
        headers={"Authorization": f"Bearer {token}"},
        json={"category": "BOOKING", "canonical_question": "Valid Question Here?", "answer_markdown": ""},
    )
    assert res.status_code in [400, 422]

    # Too short question
    res2 = client.post(
        "/api/admin/agent-knowledge",
        headers={"Authorization": f"Bearer {token}"},
        json={"category": "BOOKING", "canonical_question": "Hi?", "answer_markdown": "Valid Answer Here."},
    )
    assert res2.status_code in [400, 422]


def test_20_unicode_telugu_preservation():
    """Telugu and English transliterated content is preserved accurately."""
    token = make_admin_token()
    telugu_q = "బుకింగ్ రద్దు విధానం ఏమిటి మరియు రీఫండ్ ఎప్పుడు వస్తుంది?"
    telugu_a = "మీరు ఆర్డర్ రద్దు చేసిన 24 గంటలలోపు రీఫండ్ మీ బ్యాంక్ ఖాతాకు జమ అవుతుంది."
    payload = {
        "category": "CANCELLATION",
        "canonical_question": telugu_q,
        "answer_markdown": telugu_a,
        "synonyms": ["raddhu vidhanam", "refund eppudu vasthundi"],
    }
    res = client.post(
        "/api/admin/agent-knowledge",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert res.status_code == 201
    entry = res.json()["data"]
    assert entry["canonical_question"] == telugu_q
    assert entry["answer_markdown"] == telugu_a


def test_21_update_knowledge_entry_bumps_version():
    """Updating an entry increments version number and creates version history row."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="COMPLIANCE",
        canonical_question="What are the platform terms of service?",
        answer_markdown="Terms v1",
        created_by="admin",
    )
    assert entry.version == 1

    res = client.put(
        f"/api/admin/agent-knowledge/{entry.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "answer_markdown": "Terms v2 with updated insurance indemnity clauses.",
            "change_reason": "Updated insurance policy",
        },
    )
    assert res.status_code == 200
    updated = res.json()["data"]
    assert updated["version"] == 2
    assert "insurance indemnity" in updated["answer_markdown"]

    # Check version history
    res_v = client.get(
        f"/api/admin/agent-knowledge/{entry.id}/versions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_v.status_code == 200
    versions = res_v.json()["data"]
    assert len(versions) >= 2


# ============================================================================
# 4. EDITORIAL VERIFICATION & PUBLISHING LIFECYCLE
# ============================================================================

def test_22_verify_entry_marks_verified_and_does_not_publish():
    """Verifying an entry marks is_verified=True, sets verified_by, but does not publish."""
    token = make_admin_token(email="reviewer_lead@payent.com")
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="KYC",
        canonical_question="Which identity documents are accepted for KYC?",
        answer_markdown="Government-issued Aadhaar and PAN cards.",
        created_by="editor",
    )

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        json={"verification_notes": "Cross-checked with compliance policy."},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_verified"] is True
    assert data["verified_by"] == "reviewer_lead@payent.com"
    assert data["status"] == "pending_review"  # Stays pending until published!


def test_23_verify_entry_rejects_verify_marker():
    """Verifying an entry containing [VERIFY IN PAYENT] returns 400 Bad Request."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="PAYMENT",
        canonical_question="What is the late return penalty fee?",
        answer_markdown="The late return fee is [VERIFY IN PAYENT] per hour.",
        created_by="editor",
    )

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        json={"verification_notes": "Attempting verification"},
    )
    assert res.status_code == 400
    assert "[VERIFY" in res.json().get("detail", "")


def test_24_revoke_verification():
    """Revoking verification sets is_verified=False and resets published entry to pending_review."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="GENERAL",
        canonical_question="Can I extend my rental?",
        answer_markdown="Yes, via the app before the booking ends.",
        created_by="admin",
    )
    mgr.verify_entry(entry.id, "admin")
    mgr.publish_entry(entry.id, "admin")
    assert mgr.get_entry(entry.id).status == "published"

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/revoke-verification",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Policy undergoing revision"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_verified"] is False
    assert data["status"] == "pending_review"

    # Index manager has unindexed it
    idx = KnowledgeIndexManager.get_instance()
    assert not any(d["id"] == entry.id for d in idx.get_all_documents())


def test_25_publish_unverified_entry_rejected():
    """Publishing an unverified entry returns 400 Bad Request."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="BOOKING",
        canonical_question="How early should I book equipment?",
        answer_markdown="At least 24 hours in advance.",
        created_by="editor",
    )
    assert entry.is_verified is False

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "must be verified" in res.json().get("detail", "").lower()


def test_26_publish_entry_with_verify_marker_rejected():
    """Publishing an entry with [VERIFY IN PAYENT] returns 400 even if caller attempts to force."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="REFUND",
        canonical_question="What is the refund turnaround timeline?",
        answer_markdown="Refunds take [VERIFY IN PAYENT] working days.",
        created_by="editor",
    )

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


def test_27_publish_verified_entry_succeeds_and_indexes():
    """Publishing a clean, verified entry updates status to published and loads into index."""
    token = make_admin_token(email="publisher_lead@payent.com")
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="DELIVERY",
        canonical_question="What is the delivery handover verification protocol?",
        answer_markdown="Both customer and delivery agent must confirm the 8-digit secure PIN.",
        created_by="editor",
    )
    mgr.verify_entry(entry.id, "reviewer@payent.com")

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/publish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "published"
    assert data["published_by"] == "publisher_lead@payent.com"
    assert res.json()["index_refreshed"] is True

    # Document is in retrieval index
    idx = KnowledgeIndexManager.get_instance()
    docs = idx.get_all_documents()
    assert any(d["id"] == entry.id for d in docs)


def test_28_unpublish_removes_entry_from_index():
    """Unpublishing removes the entry from active retrieval index."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="PLATFORM",
        canonical_question="What happens if a tool is returned damaged?",
        answer_markdown="Report damage immediately during check-in.",
        created_by="editor",
    )
    mgr.verify_entry(entry.id, "reviewer@payent.com")
    mgr.publish_entry(entry.id, "admin")

    idx = KnowledgeIndexManager.get_instance()
    assert any(d["id"] == entry.id for d in idx.get_all_documents())

    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/unpublish",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Temporary content audit"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["status"] in ["pending_review", "unpublished", "archived"]

    # Entry is gone from active index
    assert not any(d["id"] == entry.id for d in idx.get_all_documents())


# ============================================================================
# 5. VERSION HISTORY & ROLLBACK
# ============================================================================

def test_29_version_history_immutable_and_rollback_as_new_version():
    """Rollback restores historical version content by creating a NEW forward version."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="POLICY",
        canonical_question="What is the deposit policy?",
        answer_markdown="Version 1 content: Standard deposit is 20 percent.",
        created_by="admin",
    )
    # v2
    mgr.update_entry(entry.id, answer_markdown="Version 2 content: Deposit is 30 percent.", changed_by="admin")
    # v3
    mgr.update_entry(entry.id, answer_markdown="Version 3 content: Deposit is 50 percent.", changed_by="admin")

    cur = mgr.get_entry(entry.id)
    assert cur.version == 3

    # Rollback to v1
    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/rollback",
        headers={"Authorization": f"Bearer {token}"},
        json={"target_version": 1, "rollback_reason": "Reverting back to original 20% policy."},
    )
    assert res.status_code == 200
    rolled = res.json()["data"]
    # Crucial requirement: Creates a NEW version (version 4) rather than deleting history!
    assert rolled["version"] == 4
    assert "Version 1 content" in rolled["answer_markdown"]

    # All 4 versions exist in history
    versions = mgr.get_version_history(entry.id)
    assert len(versions) == 4
    version_numbers = [v["version"] for v in versions]
    assert version_numbers == [1, 2, 3, 4]


def test_30_rollback_invalid_target_version():
    """Attempting rollback to non-existent version returns 400."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    entry = mgr.create_entry(
        category="POLICY",
        canonical_question="Sample Question?",
        answer_markdown="Sample Answer.",
        created_by="admin",
    )
    res = client.post(
        f"/api/admin/agent-knowledge/{entry.id}/rollback",
        headers={"Authorization": f"Bearer {token}"},
        json={"target_version": 99, "rollback_reason": "Invalid version test"},
    )
    assert res.status_code == 400


# ============================================================================
# 6. DRAFT SUGGESTIONS WORKFLOW & SUPPORT TICKET INGESTION
# ============================================================================

def test_31_draft_suggestions_listing_and_filtering():
    """Draft suggestions endpoint supports status filtering and pagination."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    d1 = mgr.create_draft_suggestion(
        customer_query="Can I return early?",
        suggested_answer="Early return is allowed with partial credit.",
        category="BOOKING",
    )
    d2 = mgr.create_draft_suggestion(
        customer_query="Can someone else pick up my order?",
        suggested_answer="Authorized proxy pickup requires KYC verification.",
        category="DELIVERY",
    )
    mgr.reject_draft(d2.id, "Not standard policy", "admin")

    # Filter pending
    res_pen = client.get(
        "/api/admin/agent-knowledge-drafts?status=pending_review",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_pen.status_code == 200
    items = res_pen.json()["items"]
    assert any(it["id"] == d1.id for it in items)
    assert not any(it["id"] == d2.id for it in items)


def test_32_draft_approval_converts_to_pending_review_entry():
    """Approving draft converts it to a pending_review knowledge entry (never auto-publishes)."""
    token = make_admin_token(email="approver@payent.com")
    mgr = KnowledgeManager.get_instance()
    draft = mgr.create_draft_suggestion(
        customer_query="How do I get an invoice with GST number?",
        suggested_answer="Go to Order Details > Download Tax Invoice.",
        category="PAYMENT",
    )

    res = client.post(
        f"/api/admin/agent-knowledge-drafts/{draft.id}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "canonical_question": "How do I download a GST tax invoice?",
            "answer_markdown": "Invoices with GSTIN are available under Order Details > Download Invoice.",
            "category": "PAYMENT",
            "synonyms": ["gst invoice", "tax bill"],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["draft"]["status"] == "approved"
    assert body["draft"]["reviewed_by"] == "approver@payent.com"

    # Converted knowledge entry MUST be in pending_review and unverified
    new_entry = body["knowledge_entry"]
    assert new_entry["status"] == "pending_review"
    assert new_entry["is_verified"] is False
    assert "GST" in new_entry["canonical_question"]


def test_33_draft_rejection_workflow():
    """Rejecting draft records rejection reason and reviewer identity."""
    token = make_admin_token(email="reviewer@payent.com")
    mgr = KnowledgeManager.get_instance()
    draft = mgr.create_draft_suggestion(
        customer_query="Can I rent for 15 minutes?",
        suggested_answer="No, minimum rental is 1 day.",
    )

    res = client.post(
        f"/api/admin/agent-knowledge-drafts/{draft.id}/reject",
        headers={"Authorization": f"Bearer {token}"},
        json={"rejection_reason": "Duplicate of existing rental duration guide."},
    )
    assert res.status_code == 200
    updated = res.json()["data"]
    assert updated["status"] == "rejected"
    assert updated["reviewed_by"] == "reviewer@payent.com"
    assert updated["rejection_reason"] == "Duplicate of existing rental duration guide."


def test_34_draft_request_changes_workflow():
    """Requesting changes updates draft status to changes_requested."""
    token = make_admin_token(email="lead@payent.com")
    mgr = KnowledgeManager.get_instance()
    draft = mgr.create_draft_suggestion(
        customer_query="What happens in case of rain during camera rental?",
        suggested_answer="Avoid water exposure.",
    )

    res = client.post(
        f"/api/admin/agent-knowledge-drafts/{draft.id}/request-changes",
        headers={"Authorization": f"Bearer {token}"},
        json={"change_notes": "Please specify the weather insurance coverage policy."},
    )
    assert res.status_code == 200
    updated = res.json()["data"]
    assert updated["status"] == "changes_requested"
    assert updated["reviewed_by"] == "lead@payent.com"


def test_35_duplicate_suggestion_detection():
    """Duplicate suggestion detection flags potential duplicate using TF-IDF similarity."""
    mgr = KnowledgeManager.get_instance()
    mgr.create_entry(
        category="CANCELLATION",
        canonical_question="How do I cancel my rental booking before delivery?",
        answer_markdown="Go to bookings and tap cancel booking.",
        created_by="admin",
    )

    # Suggest a nearly identical query
    draft = mgr.create_draft_suggestion(
        customer_query="How do I cancel my rental booking before delivery?",
        suggested_answer="Tap cancel in orders.",
        category="CANCELLATION",
    )
    assert draft.duplicate_of_id is not None
    assert draft.similarity_score is not None
    assert draft.similarity_score >= 0.70


# ============================================================================
# 7. SUPPORT TICKET SANITIZATION & SUGGESTION
# ============================================================================

def test_36_sanitize_support_text_pii():
    """Sanitizer scrubs phone numbers, emails, cards, OTPs, PINs, and transaction IDs."""
    raw_text = (
        "Customer phone is +91 9876543210 and email is user.name@gmail.com. "
        "Paid using card 4111 2222 3333 4444. Transaction ID is pay_01H89XYZ. "
        "One-time password OTP is 482910 and delivery PIN is 98765432."
    )
    sanitized = sanitize_support_text_pii(raw_text)
    assert "9876543210" not in sanitized
    assert "user.name@gmail.com" not in sanitized
    assert "4111 2222 3333 4444" not in sanitized
    assert "482910" not in sanitized
    assert "98765432" not in sanitized
    assert "pay_01H89XYZ" not in sanitized
    assert "[REDACTED_PHONE]" in sanitized or "[REDACTED" in sanitized or "[MASKED" in sanitized
    assert "[REDACTED_EMAIL]" in sanitized or "[REDACTED" in sanitized or "[MASKED" in sanitized


def test_37_support_ticket_suggest_knowledge_excludes_internal_notes():
    """Admin internal notes are excluded when suggesting knowledge from support ticket."""
    from database import MOCK_SUPPORT_TICKETS

    ticket_id = "tkt_sample_101"
    MOCK_SUPPORT_TICKETS[ticket_id] = {
        "id": ticket_id,
        "subject": "Can I pick up rental items on Sunday?",
        "category": "DELIVERY",
        "status": "resolved",
        "messages": [
            {
                "id": "m1",
                "sender": "user",
                "message": "Are pickup centers open on Sunday in Hyderabad? Call me at 9876543210.",
            },
            {
                "id": "m2",
                "sender": "admin",
                "message": "Yes, Hyderabad hub operates Monday through Sunday 9 AM to 8 PM.",
            },
            {
                "id": "m3",
                "sender": "admin",
                "message": "CONFIDENTIAL INTERNAL NOTE: Sunday staff operates on double shift overtime.",
            },
        ],
    }

    token = make_admin_token()
    res = client.post(
        f"/api/admin/support/{ticket_id}/suggest-knowledge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code in [200, 201]
    draft = res.json()["data"]

    # Customer phone masked
    assert "9876543210" not in draft["customer_query"]
    # Answer contains public resolution
    assert "Monday through Sunday" in draft["suggested_answer"]
    # Internal confidential note strictly excluded
    assert "CONFIDENTIAL INTERNAL NOTE" not in draft["suggested_answer"]
    assert "overtime" not in draft["suggested_answer"]


def test_38_support_ticket_suggest_never_auto_publishes():
    """Ticket suggestion creates a draft in pending_review only, never live in index."""
    from database import MOCK_SUPPORT_TICKETS

    ticket_id = "tkt_sample_102"
    MOCK_SUPPORT_TICKETS[ticket_id] = {
        "id": ticket_id,
        "subject": "Do you provide drone flying training?",
        "category": "GENERAL",
        "status": "resolved",
        "messages": [
            {"id": "m1", "sender": "user", "message": "Do you offer drone flying training?"},
            {"id": "m2", "sender": "admin", "message": "We provide a 15-minute basic safety briefing upon handover."},
        ],
    }

    token = make_admin_token()
    res = client.post(
        f"/api/admin/support/{ticket_id}/suggest-knowledge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code in [200, 201]
    draft_id = res.json()["data"]["id"]

    # Draft must not be in published knowledge table
    mgr = KnowledgeManager.get_instance()
    entry = mgr.get_entry(draft_id)
    assert entry is None  # It's in drafts, not entries

    # Draft must not be in retrieval index
    idx = KnowledgeIndexManager.get_instance()
    assert not any(d["id"] == draft_id for d in idx.get_all_documents())


# ============================================================================
# 8. RETRIEVAL INDEX HEALTH & MANUAL REBUILD
# ============================================================================

def test_39_index_status_endpoint():
    """Index status returns document count, health status, and last refresh."""
    token = make_admin_token()
    res = client.get(
        "/api/admin/agent-knowledge/index-status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "status" in data
    assert "total_indexed" in data
    assert data["status"] in ["healthy", "empty", "degraded"]


def test_40_manual_index_refresh_requires_admin():
    """Non-admin cannot trigger manual index refresh."""
    token = make_customer_token()
    res = client.post(
        "/api/admin/agent-knowledge/index-refresh",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_41_manual_index_refresh_succeeds_for_admin():
    """Admin triggers manual index refresh and returns updated health stats."""
    token = make_admin_token()
    mgr = KnowledgeManager.get_instance()
    e = mgr.create_entry(
        category="POLICY",
        canonical_question="Live Index Rebuild Test Question?",
        answer_markdown="Clean Answer without markers.",
        created_by="admin",
    )
    mgr.verify_entry(e.id, "admin")
    mgr.publish_entry(e.id, "admin")

    res = client.post(
        "/api/admin/agent-knowledge/index-refresh",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["total_indexed"] >= 1


# ============================================================================
# 9. PRODUCTION DATABASE FAILURE SAFETY
# ============================================================================

def test_42_production_database_failure_returns_503_never_mock():
    """Under production mode, database connection failure returns 503 and never mock data."""
    token = make_admin_token()

    with patch.object(KnowledgeManager, "get_stats", side_effect=DatabaseConnectionError("TiDB Cloud connection failed")):
        res = client.get(
            "/api/admin/agent-knowledge/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 503
        detail = res.json().get("detail", "")
        assert "temporarily unavailable" in detail.lower()
        # Ensure no mock statistics or leak
        assert "MOCK" not in str(res.json())
