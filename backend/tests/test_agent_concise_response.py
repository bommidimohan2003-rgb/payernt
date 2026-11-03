"""
PAYENT AGENT — PHASE 8.10 TEST SUITE:
INTELLIGENT CONCISE RESPONSE SYSTEM
Validates:
1. Depth detection: CONCISE (simple questions), EXPLANATION ("explain", "tell me about"), DETAILED ("in detail", "step by step").
2. Default response word count constraint (~15-40 words, 1-2 short sentences) for simple questions.
3. Preserving essential qualifiers (e.g. payout automation qualification, handover damage reporting qualification).
4. No unresolved [VERIFY] markers leaking into customer responses.
5. Preserving canonical knowledge ID and provenance in tool_result.
6. Execution across GUIDE, LIVE_DB, and HYBRID retrieval modes.
7. Status-first presentation for live database lookups.
8. Guest authentication enforcement and data isolation.
9. All 7 mandatory prompt queries:
   - "What is KYC?"
   - "When are delivery earnings transferred?"
   - "How can I become a delivery partner?"
   - "What is the cancellation policy?"
   - "What is my booking status?"
   - "Explain KYC and tell me whether my KYC has been approved."
   - "Explain the booking and cancellation process in detail."
10. Telugu and Tenglish vernacular query handling.
"""

import pytest
import time
from typing import Dict, Any

from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_user_dict,
)
from agent_engine.concise_formatter import (
    ResponseDepth,
    determine_response_depth,
    format_guide_response,
    format_hybrid_response,
    format_live_status_first,
    clean_knowledge_text,
    split_into_sentences,
)
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
)
from agent_engine.persistence import reset_persistence_state
from database import (
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_USERS,
    create_order,
)


@pytest.fixture(autouse=True)
def setup_isolated_env():
    """Ensure clean persistence and knowledge state for test isolation."""
    reset_persistence_state()
    reset_knowledge_state()
    yield
    reset_persistence_state()
    reset_knowledge_state()


@pytest.fixture
def mock_user_and_order():
    """Seeds test user, booking, and KYC verification."""
    t_id = int(time.time() * 1000)
    email = f"concise_user_{t_id}@payent.test"
    MOCK_USERS[email] = {
        "email": email,
        "full_name": "Concise Test User",
        "role": "customer",
        "status": "approved",
    }
    b_id = f"ord_concise_{t_id}"
    order = {
        "id": b_id,
        "user_email": email,
        "lender_email": "lender@payent.test",
        "productId": f"prod_concise_{t_id}",
        "productTitle": "Sony A7 IV Camera",
        "startDate": "2026-11-20",
        "endDate": "2026-11-24",
        "total": 6000.0,
        "status": "confirmed",
        "payment_status": "COMPLETED",
        "delivery_method": "pickup",
    }
    create_order(email, order)
    MOCK_ORDERS[b_id] = order
    MOCK_KYC_VERIFICATIONS[f"kyc_{email}"] = {
        "id": f"kyc_{email}",
        "email": email,
        "account_type": "payrent",
        "status": "APPROVED",
        "document_type": "PAN",
        "document_number_masked": "ABCDE1234F",
    }
    return {"email": email, "booking_id": b_id}


@pytest.fixture
def populated_km() -> KnowledgeManager:
    """Pre-seeds published and verified knowledge entries matching DOCX specifications."""
    KnowledgeManager.reset()
    KnowledgeIndexManager.reset()
    km = KnowledgeManager.get_instance(use_in_memory=True)

    # 1. KYC Guide
    e_kyc = km.create_entry(
        category="KYC verification",
        canonical_question="What is KYC?",
        answer_markdown="KYC means Know Your Customer. It is an identity-verification process used for applicable Payent account or transaction features. Renters submit a valid PAN card to unlock equipment bookings.",
        retrieval_type="guide",
        synonyms=["KYC requirements", "How to complete KYC", "Identity verification", "Identity verification guide", "KYC ante enti", "Explain KYC"],
        custom_id="KB-DOCX-011-A20B0658",
        source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
    )
    km.publish_entry(e_kyc["id"], approved_by="admin@payent.in")

    # 2. Delivery Earnings
    e_earn = km.create_entry(
        category="Delivery and logistics",
        canonical_question="When are delivery earnings transferred?",
        answer_markdown="Payent's delivery-partner payout day is Thursday. Bank transfers will begin once payout automation is implemented.",
        retrieval_type="guide",
        synonyms=["Delivery earnings transferred", "Delivery partner payout day", "When are rider earnings paid"],
        custom_id="KB-DOCX-047-49774659",
        source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
    )
    km.publish_entry(e_earn["id"], approved_by="admin@payent.in")

    # 3. Delivery Partner Registration
    e_part = km.create_entry(
        category="Delivery and logistics",
        canonical_question="How can I become a delivery partner?",
        answer_markdown="Apply through the delivery-partner registration flow in the Payent app and submit the required identity and vehicle documents.",
        retrieval_type="guide",
        synonyms=["Become a delivery partner", "Delivery partner registration", "How to deliver for Payent"],
        custom_id="KB-DOCX-045-81EFAEC7",
        source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
    )
    km.publish_entry(e_part["id"], approved_by="admin@payent.in")

    # 4. Cancellation Policy
    e_cancel = km.create_entry(
        category="Booking and rental",
        canonical_question="What is the cancellation policy?",
        answer_markdown="Cancellations made 24+ hours before the rental start date receive a full refund. Within 24 hours, a 1-day rental fee applies before dispatch.",
        retrieval_type="guide",
        synonyms=["Cancellation policy", "Cancel order rules", "Booking cancel policy", "Refund on cancel", "How to cancel booking"],
        custom_id="KB-DOCX-033-A9ED6B6A",
        source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
    )
    km.publish_entry(e_cancel["id"], approved_by="admin@payent.in")

    # 5. Detailed Booking & Cancellation Process
    e_detail = km.create_entry(
        category="Booking and rental",
        canonical_question="Explain the booking and cancellation process in detail.",
        answer_markdown="Payent booking and cancellation process:\n1. Browse verified gear and select rental dates.\n2. Submit identity verification (KYC) and complete secure payment.\n3. Handover is confirmed via 6-digit secure PIN exchange.\n4. Cancellations made 24+ hours before start date receive a 100% refund; cancellations within 24 hours incur a 1-day rental fee before dispatch.",
        retrieval_type="guide",
        synonyms=["Booking and cancellation process in detail", "Explain booking and cancellation step by step"],
        custom_id="KB-DOCX-070-DETAIL",
        source_document="PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx",
    )
    km.publish_entry(e_detail["id"], approved_by="admin@payent.in")

    return km


# ============================================================================
# 1. DEPTH DETECTION TESTS
# ============================================================================

def test_depth_detection_concise_queries():
    """Simple direct questions must classify as CONCISE."""
    assert determine_response_depth("What is KYC?") == ResponseDepth.CONCISE
    assert determine_response_depth("When are delivery earnings transferred?") == ResponseDepth.CONCISE
    assert determine_response_depth("How can I become a delivery partner?") == ResponseDepth.CONCISE
    assert determine_response_depth("What is the cancellation policy?") == ResponseDepth.CONCISE
    assert determine_response_depth("What is my booking status?") == ResponseDepth.CONCISE
    assert determine_response_depth("How do I report a damaged product?") == ResponseDepth.CONCISE
    assert determine_response_depth("KYC ante enti?") == ResponseDepth.CONCISE


def test_depth_detection_explanation_queries():
    """Broad explanation queries without detail modifiers must classify as EXPLANATION."""
    assert determine_response_depth("Explain KYC and tell me whether my KYC has been approved.") == ResponseDepth.EXPLANATION
    assert determine_response_depth("Explain KYC") == ResponseDepth.EXPLANATION
    assert determine_response_depth("Tell me about Payent") == ResponseDepth.EXPLANATION
    assert determine_response_depth("Can you explain how insurance works?") == ResponseDepth.EXPLANATION
    assert determine_response_depth("KYC gurinchi vivarinchu") == ResponseDepth.EXPLANATION


def test_depth_detection_detailed_queries():
    """Explicit requests for detail, steps, or exhaustive explanations must classify as DETAILED."""
    assert determine_response_depth("Explain the booking and cancellation process in detail.") == ResponseDepth.DETAILED
    assert determine_response_depth("Walk me through the handover process step by step") == ResponseDepth.DETAILED
    assert determine_response_depth("Give me all details about delivery tracking") == ResponseDepth.DETAILED
    assert determine_response_depth("Booking process vivaramga cheppu") == ResponseDepth.DETAILED


# ============================================================================
# 2. CONCISE FORMATTER UNIT TESTS
# ============================================================================

def test_format_guide_response_word_count_and_sentences():
    """Concise responses for simple questions must target 15-40 words and 1-2 sentences."""
    full_kyc = (
        "KYC means Know Your Customer. It is an identity-verification process used for applicable Payent account "
        "or transaction features. Renters submit a valid PAN card to unlock equipment bookings and zero deposit eligibility. "
        "Identity verification protects equipment owners and renters across all rental transactions."
    )
    res_kyc = format_guide_response("What is KYC?", "What is KYC?", full_kyc)
    words_kyc = len(res_kyc.split())
    assert 15 <= words_kyc <= 40
    assert "KYC means Know Your Customer" in res_kyc

    full_earn = (
        "Project requirements describe a Thursday bank-transfer schedule. Verify the active payout configuration "
        "and conditions before presenting it as a live guarantee. [VERIFY production policy.]"
    )
    res_earn = format_guide_response("When are delivery earnings transferred?", "When are delivery earnings transferred?", full_earn)
    words_earn = len(res_earn.split())
    assert 15 <= words_earn <= 40
    assert "Thursday" in res_earn
    assert "payout automation" in res_earn  # Essential qualifier preserved!


def test_format_guide_response_detailed_preserves_full_answer():
    """DETAILED requests must receive the full answer without mechanical truncation."""
    full_text = "Step 1: Browse gear. Step 2: Pay online. Step 3: Verify PIN. Step 4: Return gear safely."
    res = format_guide_response("Explain in detail", "Explain booking", full_text, ResponseDepth.DETAILED)
    assert res == full_text


def test_clean_knowledge_text_strips_verify_markers():
    """Unresolved verify markers must be completely stripped from output."""
    raw = "Project requirements describe a Thursday bank-transfer schedule. [VERIFY production policy.]"
    clean = clean_knowledge_text(raw)
    assert "[VERIFY" not in clean
    assert clean == "Project requirements describe a Thursday bank-transfer schedule."


# ============================================================================
# 3. MANDATORY QUERY 1: "What is KYC?" (GUIDE, CONCISE)
# ============================================================================

def test_query_1_what_is_kyc(populated_km, mock_user_and_order):
    """'What is KYC?' returns short concise definition (15-40 words) with provenance."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s1")

    res = coord.coordinate_query("What is KYC?", ctx)
    assert res["query_type"] == QueryType.GUIDE.value
    assert res["tool_called"] == "knowledge_retrieval"
    assert res["tool_result"]["knowledge_id"] == "KB-DOCX-011-A20B0658"
    assert res["tool_result"]["response_depth"] == "concise"

    ans = res["response_text"]
    words = len(ans.split())
    assert 15 <= words <= 40
    assert "KYC means Know Your Customer" in ans


# ============================================================================
# 4. MANDATORY QUERY 2: "When are delivery earnings transferred?" (GUIDE, CONCISE)
# ============================================================================

def test_query_2_delivery_earnings(populated_km, mock_user_and_order):
    """'When are delivery earnings transferred?' returns Thursday payout and automation qualifier."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s2")

    res = coord.coordinate_query("When are delivery earnings transferred?", ctx)
    assert res["query_type"] == QueryType.GUIDE.value
    assert res["tool_called"] == "knowledge_retrieval"
    assert res["tool_result"]["knowledge_id"] == "KB-DOCX-047-49774659"
    assert res["tool_result"]["response_depth"] == "concise"

    ans = res["response_text"]
    words = len(ans.split())
    assert 15 <= words <= 40
    assert "Thursday" in ans
    assert "payout automation" in ans


# ============================================================================
# 5. MANDATORY QUERY 3: "How can I become a delivery partner?" (GUIDE, CONCISE)
# ============================================================================

def test_query_3_become_delivery_partner(populated_km, mock_user_and_order):
    """'How can I become a delivery partner?' accurately distinguishes approved requirements from active features."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s3")

    res = coord.coordinate_query("How can I become a delivery partner?", ctx)
    assert res["query_type"] == QueryType.GUIDE.value
    assert res["tool_called"] == "knowledge_retrieval"
    assert res["tool_result"]["knowledge_id"] == "KB-DOCX-045-81EFAEC7"

    ans = res["response_text"]
    words = len(ans.split())
    assert 15 <= words <= 40
    # Must NOT claim an active self-service registration flow exists
    assert "not currently active" in ans.lower() or "planned in product requirements" in ans.lower()
    assert "apply through" not in ans.lower()


# ============================================================================
# 6. MANDATORY QUERY 4: "What is the cancellation policy?" (GUIDE, CONCISE)
# ============================================================================

def test_query_4_cancellation_policy(populated_km, mock_user_and_order):
    """'What is the cancellation policy?' returns grounded pre-handover refund rules without unsupported 24-hr/1-day fee claims."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s4")

    res = coord.coordinate_query("What is the cancellation policy?", ctx)
    assert res["query_type"] == QueryType.GUIDE.value
    assert res["tool_called"] == "knowledge_retrieval"
    assert res["tool_result"]["knowledge_id"] == "KB-DOCX-033-A9ED6B6A"

    ans = res["response_text"]
    words = len(ans.split())
    assert 15 <= words <= 40
    assert "cancellations made" in ans.lower()
    assert "full refund" in ans.lower() or "dispatch" in ans.lower()
    # Must NOT present unsupported 24-hr or 1-day rental fee claims as confirmed policy
    assert "24 hours" not in ans.lower()
    assert "one-day rental fee" not in ans.lower()


# ============================================================================
# 7. MANDATORY QUERY 5: "What is my booking status?" (LIVE_DB, STATUS FIRST)
# ============================================================================

def test_query_5_booking_status_authenticated(populated_km, mock_user_and_order):
    """Authenticated user querying booking status receives status value first."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s5")

    res = coord.coordinate_query("What is my booking status?", ctx)
    assert res["query_type"] == QueryType.LIVE_DB.value
    assert res["tool_called"] == "booking_lookup"

    ans = res["response_text"]
    # Direct status must be present prominently
    assert mock_user_and_order["booking_id"] in ans
    assert "CONFIRMED" in ans
    assert ans.startswith(f"Your booking **#{mock_user_and_order['booking_id']}**")


def test_query_5_booking_status_guest(populated_km):
    """Guest user querying booking status is prompted to sign in with zero data leakage."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    guest_ctx = create_guest_context(session_id="guest_s5")

    res = coord.coordinate_query("What is my booking status?", guest_ctx)
    assert res["query_type"] == QueryType.LIVE_DB.value
    assert res["requires_auth"] is True
    assert "sign in" in res["response_text"].lower()


# ============================================================================
# 8. MANDATORY QUERY 6: "Explain KYC and tell me whether my KYC has been approved." (HYBRID)
# ============================================================================

def test_query_6_hybrid_kyc_authenticated(populated_km, mock_user_and_order):
    """HYBRID query combines live personal KYC status with concise policy explanation without overbroad listing claims."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s6")

    res = coord.coordinate_query("Explain KYC and tell me whether my KYC has been approved.", ctx)
    assert res["query_type"] == QueryType.HYBRID.value
    assert res["tool_called"] == "hybrid_retrieval"
    assert res["tool_result"]["live_tool"] == "kyc_lookup"
    assert res["tool_result"]["knowledge_id"] == "KB-DOCX-011-A20B0658"
    assert res["tool_result"]["response_depth"] == "explanation"

    ans = res["response_text"]
    assert "### Your KYC Status" in ans
    assert "APPROVED" in ans
    assert "approved and active" in ans
    # Crucial safety check: must NOT claim approved customer KYC gives full access to marketplace listings!
    assert "full access to marketplace rentals and listings" not in ans
    assert "### Policy & Guidelines" in ans
    assert "KYC means Know Your Customer" in ans


def test_query_6_hybrid_kyc_guest(populated_km):
    """Guest user querying hybrid KYC receives sign-in prompt and policy guidance."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    guest_ctx = create_guest_context(session_id="guest_s6")

    res = coord.coordinate_query("Explain KYC and tell me whether my KYC has been approved.", guest_ctx)
    assert res["query_type"] == QueryType.HYBRID.value
    assert res["requires_auth"] is True
    assert "sign in" in res["response_text"].lower()
    assert "### Policy & Guidelines" in res["response_text"]


# ============================================================================
# 9. MANDATORY QUERY 7: "Explain the booking and cancellation process in detail." (DETAILED)
# ============================================================================

def test_query_7_detailed_booking_and_cancellation(populated_km, mock_user_and_order):
    """DETAILED request receives full structured answer without shortening."""
    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()
    ctx = from_user_dict(MOCK_USERS[mock_user_and_order["email"]], session_id="s7")

    res = coord.coordinate_query("Explain the booking and cancellation process in detail.", ctx)
    assert res["query_type"] == QueryType.GUIDE.value
    assert res["tool_called"] == "knowledge_retrieval"
    assert res["tool_result"]["knowledge_id"] == "KB-DOCX-070-DETAIL"
    assert res["tool_result"]["response_depth"] == "detailed"

    ans = res["response_text"]
    # All 4 numbered steps must be present intact
    assert "1. Browse verified gear" in ans
    assert "2. Submit identity verification" in ans
    assert "3. Handover is confirmed" in ans
    assert "4. Cancellations made 24+ hours" in ans


# ============================================================================
# 10. PRODUCTION LIVE_DB ISOLATION & FIXTURE LEAK PREVENTION TESTS
# ============================================================================

def test_production_isolation_blocks_mock_booking_id(monkeypatch):
    """In production mode (IS_PRODUCTION=True), mock/test booking IDs cannot be queried."""
    import config
    import agent_engine.tools.booking_tools as bt
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(bt, "IS_PRODUCTION", True)

    ctx = from_user_dict({"email": "real_user@payent.in", "role": "customer"}, session_id="prod_s1")

    # Mock fixture ID must be completely rejected in production
    res = bt.get_booking_details_tool(ctx, "ord_test_concise_101")
    assert res["success"] is False
    assert "No booking found with ID 'ord_test_concise_101'" in res["error"]


def test_production_isolation_blocks_fixture_orders_in_user_bookings(monkeypatch):
    """In production mode, user booking queries never leak fixture orders from MOCK_ORDERS."""
    import config
    import agent_engine.tools.booking_tools as bt
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(bt, "IS_PRODUCTION", True)

    ctx = from_user_dict({"email": "real_user@payent.in", "role": "customer"}, session_id="prod_s2")

    res = bt.get_user_bookings_tool(ctx)
    assert res["success"] is True
    # Zero mock or fixture bookings can appear in production output
    assert len(res["bookings"]) == 0
    for b in res["bookings"]:
        assert "test" not in str(b.get("booking_id", "")).lower()
        assert "Sony A7 IV Camera" not in str(b.get("product_title", ""))


def test_ownership_enforcement_cross_user_isolation():
    """A user cannot view another user's booking record."""
    from agent_engine.tools.booking_tools import get_booking_details_tool
    user_a = from_user_dict({"email": "user_a@payent.test", "role": "customer"}, session_id="ua")
    user_b = from_user_dict({"email": "user_b@payent.test", "role": "customer"}, session_id="ub")

    order_b_id = "ord_user_b_private"
    MOCK_ORDERS[order_b_id] = {
        "id": order_b_id,
        "user_email": "user_b@payent.test",
        "productTitle": "Private Drone",
        "status": "confirmed",
    }

    # User A tries to view User B's booking
    res = get_booking_details_tool(user_a, order_b_id)
    assert res["success"] is False
    assert "Access denied" in res["error"]


# ============================================================================
# 11. MULTI-STEP LIST & PROCEDURAL INTEGRITY TESTS
# ============================================================================

def test_multistep_list_response_never_truncated_to_step_1():
    """Multi-step procedural guides must never be truncated after only Step 1."""
    password_steps = (
        "If you forget your Payent account password, follow these steps:\n\n"
        "1. Open the Payent login page.\n"
        "2. Click on the 'Forgot Password?' link below the login form.\n"
        "3. Enter your registered email address or mobile number.\n"
        "4. Follow the password reset link sent to your email or SMS.\n"
        "5. Set your new secure password."
    )
    formatted = format_guide_response(
        query="I forgot my password. What should I do?",
        canonical_question="Forgot password recovery",
        full_answer=password_steps,
        depth=ResponseDepth.CONCISE,
    )
    assert "1. Open the Payent login page." in formatted
    assert "2. Click on the 'Forgot Password?' link" in formatted
    assert "3. Enter your registered email address" in formatted
    assert "4. Follow the password reset link" in formatted
    assert "5. Set your new secure password." in formatted


def test_password_recovery_end_to_end(populated_km):
    """End-to-end coordinator query for password reset preserves all procedural steps."""
    populated_km.create_entry(
        category="Account and profile",
        canonical_question="I forgot my password. What should I do?",
        answer_markdown=(
            "If you forget your Payent account password, follow these steps:\n\n"
            "1. Open the Payent login page.\n"
            "2. Click on the 'Forgot Password?' link.\n"
            "3. Enter your registered email address.\n"
            "4. Follow the instructions sent to your email to reset your password."
        ),
        retrieval_type="guide",
        synonyms=["forgot password", "reset password", "password marchipoyanu"],
        custom_id="KB-DOCX-099-PASS",
    )
    populated_km.publish_entry("KB-DOCX-099-PASS", approved_by="admin@payent.in")

    coord = HybridQueryCoordinator(knowledge_manager=populated_km)
    coord.index_manager.refresh_index()

    ctx = create_guest_context(session_id="pass_guest_1")
    res = coord.coordinate_query("I forgot my password. What should I do?", ctx)

    assert res["query_type"] == QueryType.GUIDE.value
    ans = res["response_text"]
    assert "1. Open the Payent login page." in ans
    assert "2. Click on the 'Forgot Password?' link." in ans
    assert "3. Enter your registered email address." in ans
    assert "4. Follow the instructions sent to your email" in ans


def test_sentence_splitter_preserves_abbreviations_and_steps():
    """Sentence splitting must not break on currency, abbreviations, or numbered step labels."""
    text = "Renters deposit Rs. 500 for gear. KYC requires ID proof e.g. PAN card. Step 1: Submit photos."
    sentences = split_into_sentences(text)
    assert len(sentences) == 3
    assert sentences[0] == "Renters deposit Rs. 500 for gear."
    assert sentences[1] == "KYC requires ID proof e.g. PAN card."
    assert sentences[2] == "Step 1: Submit photos."
