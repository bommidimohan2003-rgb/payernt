"""
PAYENT AGENT — PHASE 8.4 HYBRID QUERY COORDINATOR TEST SUITE
Comprehensive verification of:
1. GUIDE-only query (What is Payent? / What is KYC?)
2. LIVE_DB-only query (Naa booking status enti? / My payment status)
3. HYBRID query (Combining live account records with verified policy)
4. Booking status + cancellation policy ("Naa booking status enti, cancellation policy enti?")
5. Payment status + refund policy ("Naa payment refund status enti? Refund policy kuda cheppu.")
6. KYC instructions ("How do I complete KYC?") without querying personal records
7. Personal KYC status ("Naa KYC status enti?") querying authenticated user only
8. Delivery tracking + delivery guidance ("Where is my delivery and what should I do if delayed?")
9. Published and verified knowledge retrieval
10. Pending review knowledge exclusion
11. Unverified knowledge exclusion
12. Unpublished knowledge exclusion
13. Unresolved verification marker ([VERIFY]) exclusion
14. Low-confidence query fallback / clarification
15. Ambiguous query clarification
16. Missing booking ID follow-up
17. Multiple matching bookings handling
18. JWT-derived user context (identity from context only)
19. Cross-user data isolation (User A cannot view User B's bookings)
20. Sensitive-data masking (PINs, passwords, OTPs never leak)
21. Live database failure handling
22. Knowledge database failure handling
23. Index refresh failure resilience
24. Hybrid partial failure (live DB fails, policy returned gracefully)
25. Telugu-English query handling
26. Follow-up conversation context
27. Human escalation proposal & confirmation
28. API response contract compatibility
29. Conversation persistence integration
30. Rental count inquiry ("How many rentals have I taken?")
"""

import time
import pytest
from unittest.mock import MagicMock, patch

from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_user_dict,
)
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.persistence import (
    create_or_get_conversation,
    get_conversation_messages,
    reset_persistence_state,
)
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
)
from agent_engine.retrieval.tfidf_engine import KnowledgeDocument, RetrievalConfig
from agent_engine.tool_router import AgentToolRouter
from database import (
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_USERS,
    create_order,
)


@pytest.fixture(autouse=True)
def setup_isolated_environment():
    """Ensure clean persistence and knowledge repository state for each test."""
    reset_persistence_state()
    reset_knowledge_state()
    yield
    reset_persistence_state()
    reset_knowledge_state()


@pytest.fixture
def mock_users_and_orders():
    """Seeds predictable test orders and users for deterministic coordinator tests."""
    t_id = int(time.time() * 1000)
    renter_email = f"renter_{t_id}@payent.test"
    other_email = f"other_{t_id}@payent.test"

    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Renter User",
        "role": "customer",
        "status": "approved"
    }
    MOCK_USERS[other_email] = {
        "email": other_email,
        "full_name": "Other User",
        "role": "customer",
        "status": "approved"
    }

    b1_id = f"ord_coord_1_{t_id}"
    b2_id = f"ord_coord_2_{t_id}"

    order1 = {
        "id": b1_id,
        "user_email": renter_email,
        "lender_email": "lender@payent.test",
        "productId": f"prod_1_{t_id}",
        "productTitle": "Sony A7 IV Camera",
        "startDate": "2026-11-20",
        "endDate": "2026-11-24",
        "total": 6000.0,
        "status": "confirmed",
        "payment_status": "COMPLETED",
        "delivery_method": "pickup",
        "pickup_location": "Indiranagar Hub"
    }
    order2 = {
        "id": b2_id,
        "user_email": renter_email,
        "lender_email": "lender@payent.test",
        "productId": f"prod_2_{t_id}",
        "productTitle": "DJI Mini 3 Pro Drone",
        "startDate": "2026-12-01",
        "endDate": "2026-12-05",
        "total": 4500.0,
        "status": "completed",
        "payment_status": "COMPLETED",
        "delivery_method": "delivery",
    }

    create_order(renter_email, order1)
    create_order(renter_email, order2)
    MOCK_ORDERS[b1_id] = order1
    MOCK_ORDERS[b2_id] = order2

    MOCK_KYC_VERIFICATIONS[f"kyc_{renter_email}"] = {
        "id": f"kyc_{renter_email}",
        "email": renter_email,
        "account_type": "payrent",
        "status": "APPROVED",
        "document_type": "PAN",
        "document_number_masked": "ABCDE1234F"
    }

    return {
        "renter_email": renter_email,
        "other_email": other_email,
        "b1_id": b1_id,
        "b2_id": b2_id,
    }


@pytest.fixture
def populated_knowledge_manager() -> KnowledgeManager:
    """Provides a KnowledgeManager pre-seeded with representative verified and draft policies."""
    km = KnowledgeManager(use_in_memory=True)

    # 1. Published & Verified Cancellation Policy
    e_cancel = km.create_entry(
        category="Booking and rental",
        canonical_question="How do I cancel a booking?",
        answer_markdown="Cancellations made 24+ hours before start date receive a full 100% refund. Within 24 hours, a 1-day rental fee applies.",
        retrieval_type="guide",
        synonyms=["Cancellation policy", "Cancel order rules", "Booking cancel policy", "Refund on cancel"],
    )
    km.publish_entry(e_cancel["id"], approved_by="admin@payent.in")

    # 2. Published & Verified Refund Policy
    e_refund = km.create_entry(
        category="Payment and refunds",
        canonical_question="Why is my refund pending?",
        answer_markdown="Approved refunds typically process within 3 to 5 business days back to your original source payment method.",
        retrieval_type="hybrid",
        synonyms=["Refund policy", "Refund timeline", "Where is my refund?", "Dabbulu refund eppudu"],
    )
    km.publish_entry(e_refund["id"], approved_by="admin@payent.in")

    # 3. Published & Verified KYC Guide
    e_kyc = km.create_entry(
        category="KYC verification",
        canonical_question="What is KYC?",
        answer_markdown="KYC means Know Your Customer. Renters submit a valid PAN card to unlock equipment bookings and zero deposit eligibility.",
        retrieval_type="guide",
        synonyms=["KYC requirements", "How to complete KYC", "Identity verification guide", "KYC ante enti"],
    )
    km.publish_entry(e_kyc["id"], approved_by="admin@payent.in")

    # 4. Published & Verified Delivery Delay Guide
    e_del = km.create_entry(
        category="Delivery and tracking",
        canonical_question="Why is delivery delayed?",
        answer_markdown="If courier dispatch faces route delays, you can track live location in app or report a delay via support.",
        retrieval_type="hybrid",
        synonyms=["Delivery delayed", "Courier late", "What should I do if delivery is delayed?"],
    )
    km.publish_entry(e_del["id"], approved_by="admin@payent.in")

    # 5. Published General Info
    e_gen = km.create_entry(
        category="General information",
        canonical_question="What is Payent?",
        answer_markdown="Payent is a peer-to-peer equipment rental marketplace connecting renters with equipment owners.",
        retrieval_type="guide",
        synonyms=["Explain Payent", "Payent ante enti"],
    )
    km.publish_entry(e_gen["id"], approved_by="admin@payent.in")

    # 6. Unapproved / Pending Review Entry
    km.create_entry(
        category="Account and registration",
        canonical_question="How do I change phone number?",
        answer_markdown="Open account settings and change phone number.",
        status="pending_review",
        is_verified=False,
    )

    # 7. Unverified [VERIFY] Entry
    km.create_entry(
        category="Payment and refunds",
        canonical_question="Are international cards accepted?",
        answer_markdown="Payent may accept international cards. [VERIFY with payment gateway live policy.]",
        status="pending_review",
        is_verified=False,
    )

    return km


@pytest.fixture
def coordinator(populated_knowledge_manager: KnowledgeManager) -> HybridQueryCoordinator:
    im = KnowledgeIndexManager(knowledge_manager=populated_knowledge_manager)
    im.refresh_index()
    return HybridQueryCoordinator(knowledge_manager=populated_knowledge_manager, index_manager=im)


@pytest.fixture
def router(coordinator: HybridQueryCoordinator) -> AgentToolRouter:
    return AgentToolRouter(coordinator=coordinator)


# ============================================================================
# 1. GUIDE-ONLY QUERIES
# ============================================================================

def test_01_guide_only_query_what_is_payent(router: AgentToolRouter):
    """Guest asking general 'What is Payent?' receives published answer without auth requirement."""
    guest = create_guest_context()
    res = router.process_message("What is Payent?", guest)
    assert res["requires_auth"] is False
    assert "peer-to-peer equipment rental" in res["response_text"].lower()
    assert res.get("query_type") == QueryType.GUIDE.value


def test_02_guide_only_kyc_instructions_does_not_call_personal_kyc(router: AgentToolRouter, mock_users_and_orders):
    """Authenticated user asking general 'How do I complete KYC?' receives guide, not personal status."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("How do I complete KYC?", ctx)
    assert res["requires_auth"] is False
    assert "submit a valid pan" in res["response_text"].lower()
    # Tool called must be knowledge retrieval, NOT live kyc_lookup!
    assert res["tool_called"] in ("knowledge_retrieval", None)
    assert res.get("query_type") == QueryType.GUIDE.value


# ============================================================================
# 2. LIVE_DB-ONLY QUERIES
# ============================================================================

def test_03_live_db_guest_query_requires_auth(router: AgentToolRouter):
    """Guest asking for personal booking status is prompted to sign in."""
    guest = create_guest_context()
    res = router.process_message("What is my booking status?", guest)
    assert res["requires_auth"] is True
    assert "sign in" in res["response_text"].lower()
    assert "Sign In" in res["suggestions"]


def test_04_live_db_authenticated_kyc_status(router: AgentToolRouter, mock_users_and_orders):
    """Authenticated user asking 'Naa KYC status enti?' receives live KYC record."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Naa KYC status enti?", ctx)
    assert res["requires_auth"] is False
    assert res["tool_called"] == "kyc_lookup"
    assert "APPROVED" in res["response_text"]
    assert res.get("query_type") == QueryType.LIVE_DB.value


def test_05_live_db_authenticated_booking_details(router: AgentToolRouter, mock_users_and_orders):
    """Authenticated user asking for specific booking ID receives sanitized order details."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message(f"What is status of booking #{data['b1_id']}?", ctx)
    assert res["requires_auth"] is False
    assert res["tool_called"] == "booking_lookup"
    assert "Sony A7 IV Camera" in res["response_text"]
    assert "CONFIRMED" in res["response_text"]


def test_06_rental_count_calculation(router: AgentToolRouter, mock_users_and_orders):
    """Queries like 'How many rentals have I taken?' return computed breakdown."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("How many rentals have I taken?", ctx)
    assert res["requires_auth"] is False
    assert res["tool_called"] == "rental_count"
    assert "Total Bookings: **2**" in res["response_text"]
    assert "Completed Rentals: **1**" in res["response_text"]
    assert "Active / Confirmed: **1**" in res["response_text"]


# ============================================================================
# 3. HYBRID QUERIES (LIVE DATA + VERIFIED POLICY GUIDANCE)
# ============================================================================

def test_07_hybrid_booking_status_plus_cancellation_policy(router: AgentToolRouter, mock_users_and_orders):
    """User: 'Naa booking status enti, cancellation policy enti?' combines live booking and policy."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Naa booking status enti, cancellation policy enti?", ctx)
    assert res["requires_auth"] is False
    assert res["tool_called"] == "hybrid_retrieval"
    assert res.get("query_type") == QueryType.HYBRID.value

    # Check both sections are clearly presented
    text = res["response_text"]
    assert "Sony A7 IV" in text or "Recent Bookings" in text
    assert "Policy" in text
    assert "100% refund" in text or "Cancellations made" in text


def test_08_hybrid_refund_status_plus_refund_policy(router: AgentToolRouter, mock_users_and_orders):
    """User: 'Naa payment refund status enti? Refund policy kuda cheppu.' combines refund fact and policy."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Naa payment refund status enti? Refund policy kuda cheppu.", ctx)
    assert res["requires_auth"] is False
    assert res["tool_called"] == "hybrid_retrieval"
    assert res.get("query_type") == QueryType.HYBRID.value

    text = res["response_text"]
    assert "Refund Status" in text
    assert "3 to 5 business days" in text or "Policy" in text


def test_09_hybrid_delivery_status_plus_delay_guidance(router: AgentToolRouter, mock_users_and_orders):
    """User: 'Where is my delivery and what should I do if the delivery is delayed?' combines both."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Where is my delivery and what should I do if the delivery is delayed?", ctx)
    assert res["requires_auth"] is False
    assert res["tool_called"] == "hybrid_retrieval"
    assert res.get("query_type") == QueryType.HYBRID.value

    text = res["response_text"]
    assert "Delivery Status" in text
    assert "delay" in text.lower()


def test_10_hybrid_unauthenticated_guest_receives_policy_with_signin_note(router: AgentToolRouter):
    """Unauthenticated user asking hybrid question receives verified policy with sign-in prompt."""
    guest = create_guest_context()
    res = router.process_message("Naa booking status enti, cancellation policy enti?", guest)

    assert res["requires_auth"] is True
    text = res["response_text"]
    # Verified policy is provided
    assert "100% refund" in text or "Cancellations made" in text
    # Prompt to sign in for account records
    assert "sign in" in text.lower()
    assert "Sign In" in res["suggestions"]


# ============================================================================
# 4. KNOWLEDGE PUBLICATION & VERIFICATION SAFETY
# ============================================================================

def test_11_pending_review_entries_excluded_from_retrieval(router: AgentToolRouter, populated_knowledge_manager):
    """Unapproved entry ('How do I change phone number?') is not served as verified knowledge."""
    guest = create_guest_context()
    res = router.process_message("How do I change phone number?", guest)
    # Must not leak the pending_review text
    assert "Open account settings and change phone number." not in res["response_text"]


def test_12_unresolved_verify_marker_entry_excluded(router: AgentToolRouter):
    """Entry containing [VERIFY] marker is never served in customer response."""
    guest = create_guest_context()
    res = router.process_message("Are international cards accepted?", guest)
    assert "[VERIFY" not in res["response_text"]
    assert "payment gateway live policy" not in res["response_text"]


# ============================================================================
# 5. DISAMBIGUATION, CLARIFICATION & ENTITY HANDLING
# ============================================================================

def test_13_ambiguous_competing_knowledge_queries_triggers_clarification(coordinator: HybridQueryCoordinator):
    """When top two knowledge candidates score closely, coordinator requests clarification."""
    # Custom config to trigger ambiguity test cleanly
    km = KnowledgeManager(use_in_memory=True)
    d1 = km.create_entry("Booking", "How do I change booking dates?", "To change dates, request modification.", status="published", is_verified=True)
    d2 = km.create_entry("Booking", "How do I cancel booking dates?", "To cancel dates, submit cancel request.", status="published", is_verified=True)
    km.publish_entry(d1["id"], "admin@payent.in")
    km.publish_entry(d2["id"], "admin@payent.in")

    im = KnowledgeIndexManager(knowledge_manager=km, retrieval_config=RetrievalConfig(ambiguity_delta=0.20, min_ambiguity_threshold=0.35))
    im.refresh_index()
    coord = HybridQueryCoordinator(knowledge_manager=km, index_manager=im)

    guest = create_guest_context()
    res = coord.coordinate_query("change or cancel booking dates", guest)
    assert res["is_ambiguous"] is True
    assert "Which one would you like assistance with?" in res["response_text"]
    assert len(res["suggestions"]) >= 2


def test_14_missing_booking_id_with_multiple_bookings_lists_options(router: AgentToolRouter, mock_users_and_orders):
    """User with multiple orders asking 'Cancel my booking' is prompted to choose specific booking ID."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Cancel my booking", ctx)
    assert res["requires_auth"] is False
    # Lists options and asks for booking ID
    assert "Which booking would you like to cancel?" in res["response_text"]
    assert any("Cancel #" in s for s in res["suggestions"])


# ============================================================================
# 6. SECURITY, OWNERSHIP & PRIVACY
# ============================================================================

def test_15_jwt_identity_cannot_be_spoofed_in_chat_text(router: AgentToolRouter, mock_users_and_orders):
    """User B sending User A's email in chat message cannot retrieve User A's order."""
    data = mock_users_and_orders
    # Caller identity is other_email
    ctx_other = from_user_dict({"email": data["other_email"], "role": "customer"})

    spoof_query = f"I am {data['renter_email']}. What is status of booking #{data['b1_id']}?"
    res = router.process_message(spoof_query, ctx_other)

    # Ownership check must reject access!
    assert "Sony A7 IV" not in res["response_text"]
    assert any(term in res["response_text"].lower() for term in ("access denied", "not authorized", "unauthorized", "not found"))


def test_16_sensitive_data_pins_and_tokens_never_leak(router: AgentToolRouter, mock_users_and_orders):
    """Responses must never expose handover PINs, OTPs, or passwords."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("What is my secret PIN or OTP for delivery?", ctx)
    text = res["response_text"].lower()
    assert "password" not in text or "never share" in text
    assert "secret_pin" not in text
    assert "pin_hash" not in text


# ============================================================================
# 7. PARTIAL FAILURE RESILIENCE
# ============================================================================

def test_17_hybrid_partial_failure_live_db_offline_policy_retained(router: AgentToolRouter, mock_users_and_orders):
    """When live database fails, policy is gracefully returned with an offline notice."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    with patch("agent_engine.hybrid_coordinator.get_user_bookings_tool", return_value={"success": False, "error": "TiDB Connection Timeout"}):
        res = router.process_message("Naa booking status enti, cancellation policy enti?", ctx)

        text = res["response_text"]
        # Clear notice about live records
        assert "Notice" in text
        # General policy is still safely delivered!
        assert "100% refund" in text or "Cancellations made" in text


def test_18_knowledge_index_offline_fallback(coordinator: HybridQueryCoordinator, mock_users_and_orders):
    """When knowledge index raises an error, live DB continues to serve reliably."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    with patch.object(coordinator.index_manager.get_retriever(), "retrieve", side_effect=RuntimeError("Index unreadable")):
        res = coordinator.coordinate_query("Naa KYC status enti?", ctx)
        assert res["requires_auth"] is False
        assert "APPROVED" in res["response_text"]


# ============================================================================
# 8. TELUGU-ENGLISH (TENGLISH) TRANSLITERATIONS
# ============================================================================

def test_19_tenglish_hybrid_query(router: AgentToolRouter, mock_users_and_orders):
    """Tenglish 'Naa booking status enti, cancellation policy kuda cheppu' routes to HYBRID."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Naa booking status enti, cancellation policy kuda cheppu", ctx)
    assert res.get("query_type") == QueryType.HYBRID.value
    assert "Policy" in res["response_text"]


def test_20_tenglish_rental_count(router: AgentToolRouter, mock_users_and_orders):
    """Tenglish 'Nenu enni rentals teesukunnanu?' calculates rental history."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Nenu enni rentals teesukunnanu?", ctx)
    assert res["tool_called"] == "rental_count"
    assert "Total Bookings" in res["response_text"]


# ============================================================================
# 9. ESCALATION & GRIEVANCE COMPLAINTS
# ============================================================================

def test_21_human_escalation_proposal(router: AgentToolRouter, mock_users_and_orders):
    """Requesting human support proposes escalation and asks for confirmation."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("I want to speak with a human support agent", ctx)
    assert res["tool_called"] == "propose_escalation"
    assert "Confirm Support Ticket" in res["suggestions"]


def test_22_human_escalation_confirmation_creates_ticket(router: AgentToolRouter, mock_users_and_orders):
    """Explicitly confirming creates the support ticket."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = router.process_message("Confirm support ticket please", ctx)
    assert res["tool_called"] == "create_support_ticket"
    assert "created" in res["response_text"].lower() or "processed" in res["response_text"].lower()


# ============================================================================
# 10. CONVERSATION PERSISTENCE & API COMPATIBILITY
# ============================================================================

def test_23_conversation_persistence_saves_user_and_agent_messages(router: AgentToolRouter, mock_users_and_orders):
    """Router persists turns into conversation messages table/mock."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"}, session_id="sess_coord_turn")

    res = router.process_message("What is Payent?", ctx, conversation_id="conv_coord_turn")
    cid = res.get("conversation_id")
    assert cid is not None

    msgs = get_conversation_messages(cid, ctx)
    assert len(msgs) >= 2
    assert msgs[0]["content"] == "What is Payent?"
    assert "peer-to-peer" in msgs[1]["content"].lower()


def test_24_api_response_contract_fields_presence(router: AgentToolRouter):
    """Validates that router output strictly matches the AgentChatResponse schema."""
    guest = create_guest_context()
    res = router.process_message("What is Payent?", guest)

    required_keys = [
        "intent", "confidence", "is_ambiguous", "requires_auth",
        "tool_called", "tool_result", "response_text", "suggestions",
        "entities", "session_id", "conversation_id", "authenticated"
    ]
    for k in required_keys:
        assert k in res, f"Missing required response key: '{k}'"


# ============================================================================
# 11. ADVANCED SCENARIOS & SYSTEM ROBUSTNESS
# ============================================================================

def test_25_low_confidence_fallback_does_not_invent_policy(router: AgentToolRouter):
    """Completely out-of-domain query ('How to cook chicken biryani?') falls back safely."""
    guest = create_guest_context()
    res = router.process_message("How to cook Hyderabadi chicken biryani?", guest)
    assert res["requires_auth"] is False
    assert "biryani" not in res["response_text"].lower()
    assert "Payent Agent" in res["response_text"] or "assist" in res["response_text"].lower()


def test_26_follow_up_conversation_context_booking_status(router: AgentToolRouter, mock_users_and_orders):
    """Follow-up specifying booking ID resolves details within conversation session."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"}, session_id="sess_followup")

    # First turn: general check
    res1 = router.process_message("What is my booking status?", ctx, conversation_id="conv_followup")
    assert "Sony A7 IV" in res1["response_text"] or "Recent Bookings" in res1["response_text"]

    # Second turn: specific booking follow-up
    res2 = router.process_message(f"Check order #{data['b1_id']}", ctx, conversation_id="conv_followup")
    assert res2["tool_called"] == "booking_lookup"
    assert "Sony A7 IV" in res2["response_text"]


def test_27_cross_user_payment_access_rejected(router: AgentToolRouter, mock_users_and_orders):
    """User B cannot look up User A's payment details."""
    data = mock_users_and_orders
    ctx_other = from_user_dict({"email": data["other_email"], "role": "customer"})

    res = router.process_message(f"What is the payment status of booking #{data['b1_id']}?", ctx_other)
    assert any(term in res["response_text"].lower() for term in ("access denied", "not authorized", "not found", "error"))


def test_28_index_refresh_failure_preserves_active_retriever(coordinator: HybridQueryCoordinator):
    """When index refresh raises an error, existing retriever continues serving requests."""
    orig_retriever = coordinator.index_manager.get_retriever()
    assert orig_retriever is not None

    with patch.object(coordinator.knowledge_manager, "get_active_knowledge_documents", side_effect=RuntimeError("TiDB error")):
        refreshed = coordinator.index_manager.refresh_index()
        assert refreshed is False
        # Active retriever is still valid
        assert coordinator.index_manager.get_retriever() is not None


def test_29_live_db_failure_not_converted_to_no_records_found(router: AgentToolRouter, mock_users_and_orders):
    """Database query failure reports error status, never pretending 'no records found'."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    with patch("agent_engine.hybrid_coordinator.get_user_bookings_tool", return_value={"success": False, "error": "Database error: connection pool exhausted"}):
        res = router.process_message("Show my bookings", ctx)
        text = res["response_text"].lower()
        # Must report error, NOT claim that user has 0 bookings
        assert "no active or previous bookings" not in text
        assert "error" in text or "connection" in text


def test_30_regression_full_turn_kyc_and_support_flow(router: AgentToolRouter, mock_users_and_orders):
    """Full turn: user checks KYC, asks policy, and then requests escalation."""
    data = mock_users_and_orders
    ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    # 1. KYC status
    res1 = router.process_message("What is my KYC status?", ctx)
    assert "APPROVED" in res1["response_text"]

    # 2. General guide
    res2 = router.process_message("What is KYC?", ctx)
    assert "submit a valid pan" in res2["response_text"].lower()

    # 3. Escalation
    res3 = router.process_message("I need human support with my account", ctx)
    assert res3["tool_called"] == "propose_escalation"
