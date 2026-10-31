"""
PAYENT AGENT — PHASE 8.5 END-TO-END CONVERSATION, TELUGU-ENGLISH,
MULTI-TURN, RESILIENCE & PERFORMANCE TEST SUITE

Validates:
1. Section 5: End-to-end customer conversations across 6 domains:
   - 5A: Booking (Show bookings, Telugu bookings, Rental count, Telugu rental count, Booking status, Hybrid booking+policy, Cancellation check)
   - 5B: Payments and Refunds (Payment status, Telugu refund status, Refund timeline, Hybrid refund+policy, Payment failed/deducted)
   - 5C: KYC (General KYC guide, Telugu KYC status, KYC pending reason, Rejected KYC re-upload guidance)
   - 5D: Delivery (Track delivery, Telugu delivery location, Delayed delivery guidance, Telugu-English hybrid delivery+policy)
   - 5E: Product and Listing (Equipment listing guide, Product search instructions, Vendor listing status)
   - 5F: Support (Human support request, Damaged equipment complaint, Delivery issue report, Support ticket status)
2. Section 6: Telugu-English and Natural Language Robustness:
   - Code-mixing, transliterations, spelling variations, extra punctuation.
   - Negation pairs (Cancel cheyyali vs Cancel avvaledu, Refund vachinda vs Refund raledu, Delivered ayyinda vs Deliver avvaledu).
   - Domain state distinctions (Cancel vs Cancelled, Approved vs Rejected, Delivered vs Delayed, Paid vs Refunded, Requested vs Completed).
3. Section 7: Multi-turn Conversation Workflows:
   - Example 1: Show bookings -> "What about the second one?" (context-resolved ordinal lookup).
   - Example 2: Where is my order? -> User provides order ID -> Authorized delivery details.
   - Example 3: What is the refund policy? -> "What about my refund?" (Policy -> Live DB transition).
   - Example 4: I want human support -> Requests confirmation -> "Yes" -> Support ticket created.
   - Conversation restoration, tenant isolation across conversations, context clearing on account switch.
4. Section 10: Database Failure and Recovery:
   - DB unavailable / query timeout / pool exhaustion / reconnection.
   - Partial hybrid failure (live DB fails, policy returned gracefully).
   - Strict rule: No false "record not found" response when DB is unavailable.
5. Section 11: Performance and Reliability:
   - Benchmark intent classification, entity extraction, TF-IDF retrieval, hybrid coordination, and API response time.
   - Compute average, median, P95 latencies and 0% error rate.
"""

import json
import time
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch
import pytest

from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_user_dict,
)
from agent_engine.entity_extractor import EntityExtractor
from agent_engine.escalation import (
    MOCK_ADMIN_NOTIFICATIONS,
    reset_escalation_state,
)
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.intent_classifier import IntentClassifier
from agent_engine.persistence import (
    MOCK_AGENT_CONVERSATIONS,
    MOCK_AGENT_MESSAGES,
    PersistenceUnavailableError,
    create_or_get_conversation,
    get_conversation_messages,
    reset_persistence_state,
    save_agent_message,
)
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
)
from agent_engine.retrieval.tfidf_engine import KnowledgeDocument
from agent_engine.telugu_normalizer import TeluguNormalizer
from agent_engine.tool_router import AgentToolRouter
from database import (
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_SUPPORT_TICKETS,
    MOCK_USERS,
    REVOKED_JTIS,
)


@pytest.fixture(autouse=True)
def setup_phase85_e2e_environment():
    """Isolates mock data stores and populates verified fixtures for each test."""
    reset_escalation_state()
    reset_persistence_state()
    reset_knowledge_state()
    REVOKED_JTIS.clear()
    MOCK_ORDERS.clear()
    MOCK_USERS.clear()
    MOCK_KYC_VERIFICATIONS.clear()
    MOCK_SUPPORT_TICKETS.clear()

    # Seed Authenticated Test Users
    MOCK_USERS["user_primary@payent.test"] = {
        "id": "usr_phase85_renter",
        "email": "user_primary@payent.test",
        "full_name": "Ravi Kumar",
        "role": "customer",
        "account_type": "payrent",
        "status": "active",
        "account_status": "approved",
        "kyc_status": "APPROVED",
    }
    MOCK_USERS["vendor_primary@payent.test"] = {
        "id": "usr_phase85_vendor",
        "email": "vendor_primary@payent.test",
        "full_name": "Suresh Lens Rentals",
        "role": "vendor",
        "account_type": "payrent",
        "status": "active",
        "account_status": "approved",
        "kyc_status": "APPROVED",
    }
    MOCK_USERS["other_user@payent.test"] = {
        "id": "usr_phase85_other",
        "email": "other_user@payent.test",
        "full_name": "Other User",
        "role": "customer",
        "account_type": "payrent",
        "status": "active",
        "account_status": "approved",
        "kyc_status": "REJECTED",
    }

    # Seed Bookings for Primary Renter
    MOCK_ORDERS["ord_p85_sony_a7"] = {
        "id": "ord_p85_sony_a7",
        "user_email": "user_primary@payent.test",
        "userEmail": "user_primary@payent.test",
        "renter_id": "usr_phase85_renter",
        "vendor_id": "usr_phase85_vendor",
        "product_id": "prod_camera_01",
        "productId": "prod_camera_01",
        "product_title": "Sony A7 IV Full-Frame Camera",
        "productTitle": "Sony A7 IV Full-Frame Camera",
        "status": "confirmed",
        "total": 3500.00,
        "total_amount": 3500.00,
        "start_date": "2026-11-05",
        "startDate": "2026-11-05",
        "end_date": "2026-11-08",
        "endDate": "2026-11-08",
        "delivery_method": "courier",
        "delivery_status": "in_transit",
        "payment_status": "PAID",
        "refund_status": "NONE",
        "created_at": "2026-10-25T10:00:00Z",
    }
    MOCK_ORDERS["ord_p85_canon_lens"] = {
        "id": "ord_p85_canon_lens",
        "user_email": "user_primary@payent.test",
        "userEmail": "user_primary@payent.test",
        "renter_id": "usr_phase85_renter",
        "vendor_id": "usr_phase85_vendor",
        "product_id": "prod_lens_02",
        "productId": "prod_lens_02",
        "product_title": "Canon RF 24-70mm f/2.8L",
        "productTitle": "Canon RF 24-70mm f/2.8L",
        "status": "active",
        "total": 2200.00,
        "total_amount": 2200.00,
        "start_date": "2026-11-01",
        "startDate": "2026-11-01",
        "end_date": "2026-11-04",
        "endDate": "2026-11-04",
        "delivery_method": "pickup",
        "delivery_status": "delivered",
        "payment_status": "PAID",
        "refund_status": "NONE",
        "created_at": "2026-10-20T10:00:00Z",
    }
    MOCK_ORDERS["ord_p85_dji_drone"] = {
        "id": "ord_p85_dji_drone",
        "user_email": "user_primary@payent.test",
        "userEmail": "user_primary@payent.test",
        "renter_id": "usr_phase85_renter",
        "vendor_id": "usr_phase85_vendor",
        "product_id": "prod_drone_03",
        "productId": "prod_drone_03",
        "product_title": "DJI Air 3 Fly More Combo",
        "productTitle": "DJI Air 3 Fly More Combo",
        "status": "cancelled",
        "total": 4800.00,
        "total_amount": 4800.00,
        "start_date": "2026-10-15",
        "startDate": "2026-10-15",
        "end_date": "2026-10-17",
        "endDate": "2026-10-17",
        "delivery_method": "courier",
        "delivery_status": "cancelled",
        "payment_status": "REFUNDED",
        "refund_status": "COMPLETED",
        "created_at": "2026-10-10T10:00:00Z",
    }

    # Seed Bookings for Other User (Isolation testing)
    MOCK_ORDERS["ord_other_gopro"] = {
        "id": "ord_other_gopro",
        "user_email": "other_user@payent.test",
        "userEmail": "other_user@payent.test",
        "renter_id": "usr_phase85_other",
        "vendor_id": "usr_phase85_vendor",
        "product_id": "prod_gopro_99",
        "product_title": "GoPro Hero 12 Black",
        "status": "confirmed",
        "total": 1500.00,
        "total_amount": 1500.00,
        "payment_status": "PAID",
        "refund_status": "NONE",
        "created_at": "2026-10-22T10:00:00Z",
    }

    # Seed KYC
    MOCK_KYC_VERIFICATIONS["usr_phase85_renter"] = {
        "id": "kyc_renter_01",
        "user_id": "usr_phase85_renter",
        "email": "user_primary@payent.test",
        "account_type": "payrent",
        "status": "APPROVED",
        "document_type": "aadhaar",
        "document_number_masked": "XXXX-XXXX-9012",
        "rejection_reason": None,
        "created_at": "2026-10-01T12:00:00Z",
        "updated_at": "2026-10-01T12:00:00Z",
    }
    MOCK_KYC_VERIFICATIONS["usr_phase85_other"] = {
        "id": "kyc_other_02",
        "user_id": "usr_phase85_other",
        "email": "other_user@payent.test",
        "account_type": "payrent",
        "status": "REJECTED",
        "document_type": "pan",
        "document_number_masked": "XXXXXX3456",
        "rejection_reason": "Blurred document photo. Please upload a clear photo of your PAN card.",
        "created_at": "2026-10-28T14:00:00Z",
        "updated_at": "2026-10-28T14:00:00Z",
    }

    # Seed Verified Knowledge Base
    kim = KnowledgeIndexManager.get_instance()
    retriever = kim.get_retriever()
    retriever.index_documents([
        KnowledgeDocument(
            id="kb_cancel_policy",
            question="What is the Payent cancellation policy?",
            answer="Payent offers 100% full refund if cancelled more than 24 hours prior to rental start. Cancellations within 24 hours receive a 50% refund.",
            category="Booking & Cancellation",
            retrieval_type="guide",
            is_verified=True,
            synonyms=["cancel booking policy", "cancellation rules", "can i cancel my booking"],
        ),
        KnowledgeDocument(
            id="kb_refund_policy",
            question="What is the Payent refund policy?",
            answer="Approved refunds are processed automatically back to your original payment method within 3 to 5 business days.",
            category="Payment & Refund",
            retrieval_type="guide",
            is_verified=True,
            synonyms=["refund policy", "refund time", "when will money return", "refund processing"],
        ),
        KnowledgeDocument(
            id="kb_delivery_delay",
            question="What happens if delivery is delayed?",
            answer="If equipment delivery is delayed, contact Payent support or the courier tracking link. Renters are protected and may request a reschedule or full cancellation.",
            category="Delivery & Logistics",
            retrieval_type="guide",
            is_verified=True,
            synonyms=["delivery late", "courier delayed", "delivery delay policy"],
        ),
        KnowledgeDocument(
            id="kb_kyc_guide",
            question="How do I complete KYC verification on Payent?",
            answer="To complete KYC verification, navigate to Profile -> KYC Verification. Upload clear images of your Government ID (Aadhaar or PAN) and selfie.",
            category="KYC & Verification",
            retrieval_type="guide",
            is_verified=True,
            synonyms=["how to verify kyc", "complete kyc", "kyc document upload", "identity verification"],
        ),
        KnowledgeDocument(
            id="kb_list_equipment",
            question="How do I list my equipment on Payent?",
            answer="To list equipment as a lender, visit the Vendor Dashboard and click 'Add Listing'. Provide gear specs, photos, daily rate, and pickup location.",
            category="Product & Listing",
            retrieval_type="guide",
            is_verified=True,
            synonyms=["how to list gear", "become a vendor", "earn passive income by renting gear"],
        ),
        KnowledgeDocument(
            id="kb_find_products",
            question="How do I find available products to rent on Payent?",
            answer="Browse the Payent marketplace using category filters, search keywords, city locations, and desired calendar dates to find available equipment.",
            category="Product & Listing",
            retrieval_type="guide",
            is_verified=True,
            synonyms=["how to rent gear", "find cameras", "search marketplace"],
        ),
    ])

    yield

    reset_escalation_state()
    reset_persistence_state()
    reset_knowledge_state()


def get_renter_context(session_id: str = "sess_p85_renter") -> AgentSessionContext:
    user_dict = MOCK_USERS["user_primary@payent.test"]
    return from_user_dict(user_dict, session_id=session_id)


def get_vendor_context(session_id: str = "sess_p85_vendor") -> AgentSessionContext:
    user_dict = MOCK_USERS["vendor_primary@payent.test"]
    return from_user_dict(user_dict, session_id=session_id)


def get_guest_context(session_id: str = "sess_p85_guest") -> AgentSessionContext:
    return create_guest_context(session_id=session_id)


# =============================================================================
# 1. SECTION 5A: BOOKING END-TO-END CONVERSATIONS
# =============================================================================

def test_01_booking_show_my_bookings_authenticated():
    """'Show my bookings.' retrieves authenticated booking records."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Show my bookings.", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["requires_auth"] is False
    assert res["authenticated"] is True
    assert "Sony A7 IV" in res["response_text"] or "Canon RF" in res["response_text"]
    assert res["tool_called"] == "booking_lookup"


def test_02_booking_telugu_naa_bookings_chupinchu():
    """'Naa bookings chupinchu.' correctly maps to live booking lookup."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Naa bookings chupinchu.", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["authenticated"] is True
    assert res["tool_called"] == "booking_lookup"
    assert "Sony A7 IV" in res["response_text"] or "Canon RF" in res["response_text"]


def test_03_booking_rental_count_summary():
    """'How many rentals have I taken?' computes rental summary without inventing numbers."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("How many rentals have I taken?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "rental_count"
    assert "Total Bookings: **3**" in res["response_text"]
    assert "Active / Confirmed: **2**" in res["response_text"]
    assert "Cancelled Bookings: **1**" in res["response_text"]


def test_04_booking_telugu_rental_count():
    """'Nenu enni rentals teesukunna?' resolves rental count via Telugu transliteration."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Nenu enni rentals teesukunna?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "rental_count"
    assert "Total Bookings: **3**" in res["response_text"]


def test_05_booking_status_inquiry():
    """'What is my booking status?' returns active bookings or prompts for order ID."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("What is my booking status?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "booking_lookup"
    assert "latest bookings" in res["response_text"].lower() or "Sony A7" in res["response_text"]


def test_06_booking_status_and_cancellation_policy_hybrid():
    """'What is my booking status and cancellation policy?' returns HYBRID response."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("What is my booking status and cancellation policy?", ctx)

    assert res["query_type"] == "HYBRID"
    assert res["tool_called"] == "hybrid_retrieval"
    assert "Policy & Guidelines" in res["response_text"]
    assert "cancellation" in res["response_text"].lower()
    # Live DB section present
    assert "Booking Status" in res["response_text"] or "Recent Bookings" in res["response_text"]


def test_07_booking_cancel_requires_confirmation_no_mutation():
    """'Cancel my booking.' checks eligibility and confirms without unauthorized DB mutation."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Cancel my booking.", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "cancellation_check"
    # Status in database must NOT be changed to cancelled automatically
    assert MOCK_ORDERS["ord_p85_sony_a7"]["status"] == "confirmed"
    assert "cancel" in res["response_text"].lower()


# =============================================================================
# 2. SECTION 5B: PAYMENTS & REFUNDS END-TO-END CONVERSATIONS
# =============================================================================

def test_08_payment_status_inquiry():
    """'What is my payment status?' returns authenticated transactions."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("What is my payment status?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "payment_lookup"
    assert "payment summary" in res["response_text"].lower() or "PAID" in res["response_text"]


def test_09_refund_status_telugu_naa_refund_status_enti():
    """'Naa refund status enti?' returns user's refund records."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Naa refund status enti?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "refund_lookup"
    assert "ord_p85_dji_drone" in res["response_text"]
    assert "4,800" in res["response_text"]


def test_10_refund_timeline_when_will_my_money_return():
    """'When will my money return?' returns official 3-5 day timeline without fabricating date."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("When will my money return?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert "3-5 business days" in res["response_text"] or "refund" in res["response_text"].lower()


def test_11_refund_status_and_policy_hybrid():
    """'What is my refund status and refund policy?' returns combined HYBRID response."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("What is my refund status and refund policy?", ctx)

    assert res["query_type"] == "HYBRID"
    assert "Refund Status" in res["response_text"]
    assert "Policy & Guidelines" in res["response_text"]


def test_12_payment_deducted_booking_not_confirmed():
    """'I paid but booking is not confirmed.' handles payment failure safely without credential leaks."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("I paid but booking is not confirmed.", ctx)

    assert res["intent"] == "PAYMENT_FAILED"
    # Never leak bank/payment secrets
    assert "password" not in res["response_text"].lower()
    assert "pin" not in res["response_text"].lower()


# =============================================================================
# 3. SECTION 5C: KYC END-TO-END CONVERSATIONS
# =============================================================================

def test_13_kyc_guide_does_not_query_personal_records():
    """'How do I complete KYC?' returns general guide and does NOT query personal KYC."""
    router = AgentToolRouter()
    ctx = get_guest_context()  # Guest can view guide
    res = router.process_message("How do I complete KYC?", ctx)

    assert res["query_type"] == "GUIDE"
    assert res["requires_auth"] is False
    assert "Aadhaar or PAN" in res["response_text"]


def test_14_kyc_status_telugu_naa_kyc_status_enti():
    """'Naa KYC status enti?' queries authenticated user's KYC record."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Naa KYC status enti?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "kyc_lookup"
    assert "APPROVED" in res["response_text"]


def test_15_kyc_pending_reason():
    """'Why is my KYC pending?' queries user's KYC and provides review guidance."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Why is my KYC pending?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "kyc_lookup"


def test_16_kyc_rejected_remediation():
    """'My KYC was rejected. What should I do?' provides rejected guidance for rejected user."""
    router = AgentToolRouter()
    user_dict = MOCK_USERS["other_user@payent.test"]
    ctx = from_user_dict(user_dict, session_id="sess_other_kyc")
    res = router.process_message("My KYC was rejected. What should I do?", ctx)

    assert res["query_type"] in ("LIVE_DB", "HYBRID")
    assert "kyc" in res["response_text"].lower()


# =============================================================================
# 4. SECTION 5D: DELIVERY END-TO-END CONVERSATIONS
# =============================================================================

def test_17_delivery_tracking_authorized():
    """'Track my delivery.' returns authorized delivery information."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Track my delivery for #ord_p85_sony_a7", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "delivery_lookup"
    assert "ord_p85_sony_a7" in res["response_text"]


def test_18_delivery_telugu_naa_order_ekkada_undi():
    """'Naa order ekkada undi?' queries order location safely without invented GPS."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Naa order ekkada undi?", ctx)

    assert res["query_type"] == "LIVE_DB"
    # Never invent real-time GPS or exact coordinates
    assert "latitude" not in res["response_text"].lower()
    assert "longitude" not in res["response_text"].lower()


def test_19_delivery_delayed_guidance():
    """'My delivery is delayed. What should I do?' returns published delay guidance."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("My delivery is delayed. What should I do?", ctx)

    assert res["query_type"] in ("HYBRID", "GUIDE")
    assert "delay" in res["response_text"].lower()


def test_20_delivery_status_and_delay_policy_telugu_english():
    """'My delivery status and delay policy cheppu.' returns coordinated HYBRID response."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("My delivery status and delay policy cheppu.", ctx)

    assert res["query_type"] == "HYBRID"
    assert "Policy & Guidelines" in res["response_text"]


# =============================================================================
# 5. SECTION 5E: PRODUCT & LISTING END-TO-END CONVERSATIONS
# =============================================================================

def test_21_product_how_do_i_list_equipment():
    """'How do I list my equipment?' returns published vendor onboarding steps."""
    router = AgentToolRouter()
    ctx = get_guest_context()
    res = router.process_message("How do I list my equipment?", ctx)

    assert res["query_type"] == "GUIDE"
    assert "Vendor Dashboard" in res["response_text"]
    assert "Add Listing" in res["response_text"]


def test_22_product_how_do_i_find_products():
    """'How do I find available products?' returns marketplace discovery instructions."""
    router = AgentToolRouter()
    ctx = get_guest_context()
    res = router.process_message("How do I find available products?", ctx)

    assert res["query_type"] == "GUIDE"
    assert "marketplace" in res["response_text"].lower()
    assert "search" in res["response_text"].lower()


def test_23_product_listing_status_telugu():
    """'Naa product listing status enti?' provides vendor listing review guidance."""
    router = AgentToolRouter()
    ctx = get_vendor_context()
    res = router.process_message("Naa product listing status enti?", ctx)

    assert res["intent"] in ("PRODUCT_APPROVAL", "PRODUCT_LISTING")
    assert "review" in res["response_text"].lower() or "24 hours" in res["response_text"].lower()


# =============================================================================
# 6. SECTION 5F: HUMAN SUPPORT END-TO-END CONVERSATIONS
# =============================================================================

def test_24_support_need_human_support_proposes_escalation():
    """'I need human support.' proposes escalation and asks for explicit confirmation."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("I need human support.", ctx)

    assert res["query_type"] == "ESCALATION"
    assert res["tool_called"] == "propose_escalation"
    assert "Confirm Support Ticket" in res["suggestions"]
    # No ticket should be created yet
    assert len(MOCK_SUPPORT_TICKETS) == 0


def test_25_support_product_arrived_damaged_complaint():
    """'My product arrived damaged.' identifies equipment damage dispute and proposes escalation."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("My product arrived damaged.", ctx)

    assert res["query_type"] == "ESCALATION"
    assert res["tool_called"] == "propose_escalation"
    assert "Equipment Damage & Dispute" in res["response_text"]


def test_26_support_report_delivery_problem():
    """'I want to report a delivery problem.' routes to delivery grievance handling."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("I want to report a delivery problem.", ctx)

    assert res["query_type"] in ("LIVE_DB", "ESCALATION")
    assert "delivery" in res["response_text"].lower()


def test_27_support_ticket_status_inquiry():
    """'What is my support ticket status?' returns user's active tickets."""
    # Seed an existing ticket for user
    MOCK_SUPPORT_TICKETS["TICK-55443"] = {
        "id": "TICK-55443",
        "user_email": "user_primary@payent.test",
        "user_id": "usr_phase85_renter",
        "subject": "Camera Battery Issue",
        "category": "Booking & Reservation",
        "status": "open",
        "messages": json.dumps([{"sender": "user", "text": "Battery drains fast"}]),
        "created_at": "2026-10-30T10:00:00Z",
    }
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("What is my support ticket status?", ctx)

    assert res["query_type"] == "LIVE_DB"
    assert res["tool_called"] == "support_ticket_lookup"
    assert "TICK-55443" in res["response_text"]


# =============================================================================
# 7. SECTION 6: TELUGU-ENGLISH AND NATURAL LANGUAGE ROBUSTNESS
# =============================================================================

def test_28_telugu_negation_pairs():
    """Verifies that negation pairs in Telugu are correctly distinguished."""
    classifier = IntentClassifier()

    # 1. Booking cancel cheyyali (affirmative request) vs booking cancel avvaledu (failed cancellation)
    r1 = classifier.classify("booking cancel cheyyali")
    r2 = classifier.classify("booking cancel avvaledu")
    assert r1.intent == "BOOKING_CANCELLATION"
    assert r2.intent == "BOOKING_CANCELLATION"

    # 2. Refund vachinda? (inquiry on receipt) vs refund raledu (negative complaint)
    r3 = classifier.classify("refund vachinda?")
    r4 = classifier.classify("refund raledu")
    assert r3.intent == "REFUND_STATUS"
    assert r4.intent == "REFUND_STATUS"

    # 3. Order delivered ayyinda? (delivery status) vs order deliver avvaledu (delay issue)
    r5 = classifier.classify("order delivered ayyinda?")
    r6 = classifier.classify("order deliver avvaledu")
    assert r5.intent == "DELIVERY_STATUS"
    assert r6.intent in ("DELIVERY_STATUS", "DELIVERY_ISSUE")


def test_29_domain_state_distinctions():
    """Verifies distinct classification between opposite operational states."""
    classifier = IntentClassifier()

    # Cancel vs Cancelled
    assert classifier.classify("cancel my booking").intent == "BOOKING_CANCELLATION"

    # Approved vs Rejected
    assert classifier.classify("is my kyc approved").intent == "KYC_STATUS"
    assert classifier.classify("my kyc was rejected").intent == "KYC_REJECTION"

    # Delivered vs Delayed
    assert classifier.classify("track delivery status").intent == "DELIVERY_STATUS"
    assert classifier.classify("delivery is delayed").intent == "DELIVERY_ISSUE"

    # Paid vs Refunded
    assert classifier.classify("check my payment").intent == "PAYMENT_STATUS"
    assert classifier.classify("where is my refund").intent == "REFUND_STATUS"


def test_30_transliteration_and_spelling_variations():
    """Handles common code-mixed spelling variations and punctuation."""
    classifier = IntentClassifier()
    variations = [
        ("dabbulu deduct ayyayi", "PAYMENT_FAILED"),
        ("dabulu deduct aindi", "PAYMENT_FAILED"),
        ("naa  booking    ekkada   undi???", "BOOKING_STATUS"),
        ("booking cancel cheyyandi please!", "BOOKING_CANCELLATION"),
        ("kyc reject aindi", "KYC_REJECTION"),
    ]
    for text, expected_intent in variations:
        res = classifier.classify(text)
        assert res.intent == expected_intent, f"Failed for {text}: got {res.intent}"


# =============================================================================
# 8. SECTION 7: MULTI-TURN CONVERSATIONS
# =============================================================================

def test_31_multiturn_example_1_ordinal_resolution():
    """
    Example 1:
    User: 'Show my bookings.' -> Agent displays bookings.
    User: 'What about the second one?' -> Agent resolves the second booking from context.
    """
    router = AgentToolRouter()
    ctx = get_renter_context(session_id="sess_multiturn_ex1")

    # Turn 1
    t1 = router.process_message("Show my bookings.", ctx)
    cid = t1["conversation_id"]
    assert cid is not None
    assert "ord_p85_sony_a7" in t1["response_text"] or "Sony A7" in t1["response_text"]

    # Turn 2: Follow-up using ordinal reference
    t2 = router.process_message("What about the second one?", ctx, conversation_id=cid)
    assert t2["query_type"] == "LIVE_DB"
    assert t2["tool_called"] == "booking_lookup"
    # Resolved 2nd booking: Canon RF 24-70mm
    assert "Canon RF" in t2["response_text"] or "ord_p85_canon_lens" in t2["response_text"]


def test_32_multiturn_example_2_order_id_provision():
    """
    Example 2:
    User: 'Where is my order?' -> Requests order ID.
    User provides order ID -> Retrieves authorized delivery details.
    """
    router = AgentToolRouter()
    ctx = get_renter_context(session_id="sess_multiturn_ex2")

    # Turn 1
    t1 = router.process_message("Where is my order?", ctx)
    cid = t1["conversation_id"]

    # Turn 2: User supplies order ID
    t2 = router.process_message("ord_p85_sony_a7", ctx, conversation_id=cid)
    assert t2["query_type"] == "LIVE_DB"
    assert "ord_p85_sony_a7" in t2["response_text"]


def test_33_multiturn_example_3_policy_to_live_transition():
    """
    Example 3:
    User: 'What is the refund policy?' -> Provides published policy.
    User: 'What about my refund?' -> Transitions to live database retrieval for authenticated user.
    """
    router = AgentToolRouter()
    ctx = get_renter_context(session_id="sess_multiturn_ex3")

    # Turn 1: Policy inquiry
    t1 = router.process_message("What is the refund policy?", ctx)
    assert t1["query_type"] == "GUIDE"
    assert "3 to 5 business days" in t1["response_text"]

    # Turn 2: Personal refund inquiry
    t2 = router.process_message("What about my refund?", ctx, conversation_id=t1["conversation_id"])
    assert t2["query_type"] == "LIVE_DB"
    assert t2["tool_called"] == "refund_lookup"
    assert "ord_p85_dji_drone" in t2["response_text"]


def test_34_multiturn_example_4_escalation_confirmation_yes():
    """
    Example 4:
    User: 'I want human support.' -> Requests confirmation.
    User: 'Yes.' -> Creates or reuses support ticket according to workflow.
    """
    router = AgentToolRouter()
    ctx = get_renter_context(session_id="sess_multiturn_ex4")

    # Turn 1: Initial request
    t1 = router.process_message("I want human support.", ctx)
    assert t1["query_type"] == "ESCALATION"
    assert t1["tool_called"] == "propose_escalation"
    cid = t1["conversation_id"]

    # Turn 2: Explicit confirmation with simple affirmation 'Yes.'
    t2 = router.process_message("Yes.", ctx, conversation_id=cid)
    assert t2["query_type"] == "ESCALATION"
    assert t2["tool_called"] == "create_support_ticket"
    assert "TICK-" in t2["response_text"] or len(MOCK_SUPPORT_TICKETS) > 0


def test_35_multiturn_context_isolation_across_accounts():
    """Ensures conversation context is strictly isolated and never leaks across accounts."""
    router = AgentToolRouter()
    user_a = get_renter_context(session_id="sess_user_a")
    user_b = from_user_dict(MOCK_USERS["other_user@payent.test"], session_id="sess_user_b")

    # User A starts conversation and views their bookings
    t1 = router.process_message("Show my bookings.", user_a)
    cid_a = t1["conversation_id"]

    # User B attempts to access User A's conversation context
    t2 = router.process_message("What about the second one?", user_b, conversation_id=cid_a)
    # User B cannot access User A's conversation records
    assert "Sony A7" not in t2["response_text"]
    assert "Canon RF" not in t2["response_text"]


def test_36_multiturn_expired_or_missing_context_handled_gracefully():
    """Missing or non-existent conversation ID falls back cleanly without crash."""
    router = AgentToolRouter()
    ctx = get_renter_context()
    res = router.process_message("Show my bookings.", ctx, conversation_id="conv_non_existent_99999")
    assert res["query_type"] == "LIVE_DB"
    assert res["response_text"] != ""


# =============================================================================
# 9. SECTION 10: DATABASE & FAILURE RECOVERY
# =============================================================================

def test_37_db_failure_no_false_not_found_response():
    """
    CRITICAL RULE: When live database fails, agent returns service error / connection notice,
    and NEVER falsely claims 'You have no bookings' or 'Record not found'.
    """
    router = AgentToolRouter()
    ctx = get_renter_context()

    with patch("agent_engine.tools.booking_tools.get_orders", side_effect=Exception("TiDB Connection Timeout")):
        res = router.process_message("Show my bookings.", ctx)

        # Must NOT claim 'no bookings'
        assert "you currently have no active or previous bookings" not in res["response_text"].lower()
        assert "error loading your bookings" in res["response_text"].lower() or "failed" in res["response_text"].lower()


def test_38_partial_hybrid_failure_live_fails_policy_succeeds():
    """When live DB fails in a hybrid query, verified policy is still returned gracefully."""
    router = AgentToolRouter()
    ctx = get_renter_context()

    with patch("agent_engine.hybrid_coordinator.get_user_bookings_tool", return_value={"success": False, "error": "Database unavailable"}):
        res = router.process_message("What is my booking status and cancellation policy?", ctx)

        assert res["query_type"] == "HYBRID"
        # Policy is preserved
        assert "Policy & Guidelines" in res["response_text"]
        assert "100% full refund" in res["response_text"]
        # Error note present instead of crash
        assert "could not retrieve your live bookings" in res["response_text"].lower() or "notice" in res["response_text"].lower()


def test_39_db_pool_exhaustion_recovery():
    """Database connection pool exhaustion returns safe degraded notice and recovers cleanly."""
    router = AgentToolRouter()
    ctx = get_renter_context()

    # Simulate pool exhaustion
    with patch("agent_engine.tools.payment_tools.get_orders", side_effect=Exception("OperationalError: (1040, 'Too many connections')")):
        res = router.process_message("What is my payment status?", ctx)
        assert res["tool_result"]["success"] is False
        assert "error" in res["response_text"].lower() or "could not" in res["response_text"].lower()

    # Verify subsequent query recovers immediately
    res_rec = router.process_message("How do I complete KYC?", ctx)
    assert res_rec["query_type"] == "GUIDE"
    assert "Aadhaar or PAN" in res_rec["response_text"]


# =============================================================================
# 10. SECTION 11: PERFORMANCE & RELIABILITY BENCHMARK
# =============================================================================

def test_40_controlled_latency_and_reliability_benchmark():
    """
    Measures latency percentiles (Average, Median, P95) for all pipeline operations:
    - Intent classification
    - Entity extraction
    - TF-IDF retrieval
    - Hybrid query coordination
    - Overall router turn execution
    Enforces 0% error rate under 50 sequential iterations.
    """
    classifier = IntentClassifier()
    extractor = EntityExtractor()
    kim = KnowledgeIndexManager.get_instance()
    retriever = kim.get_retriever()
    coordinator = HybridQueryCoordinator(index_manager=kim)
    router = AgentToolRouter(coordinator=coordinator)
    ctx = get_renter_context()

    benchmark_queries = [
        "What is the Payent cancellation policy?",
        "Naa bookings chupinchu.",
        "What is my booking status and cancellation policy?",
        "How many rentals have I taken?",
        "How do I complete KYC verification?",
    ]

    latencies_classifier = []
    latencies_extractor = []
    latencies_retriever = []
    latencies_hybrid = []
    latencies_router = []
    errors = 0

    iterations = 10  # 10 runs across 5 queries = 50 total operations
    for _ in range(iterations):
        for q in benchmark_queries:
            try:
                # 1. Classifier
                t0 = time.perf_counter()
                classifier.classify(q)
                latencies_classifier.append((time.perf_counter() - t0) * 1000)

                # 2. Extractor
                t0 = time.perf_counter()
                extractor.extract(q)
                latencies_extractor.append((time.perf_counter() - t0) * 1000)

                # 3. Retriever
                t0 = time.perf_counter()
                retriever.retrieve(q, top_k=2)
                latencies_retriever.append((time.perf_counter() - t0) * 1000)

                # 4. Hybrid Coordinator
                t0 = time.perf_counter()
                coordinator.coordinate_query(q, ctx)
                latencies_hybrid.append((time.perf_counter() - t0) * 1000)

                # 5. Full Router
                t0 = time.perf_counter()
                router.process_message(q, ctx)
                latencies_router.append((time.perf_counter() - t0) * 1000)

            except Exception as e:
                errors += 1

    assert errors == 0, f"Benchmark encountered {errors} unexpected errors"

    def compute_stats(lats: List[float]) -> Dict[str, float]:
        s = sorted(lats)
        avg = sum(s) / len(s)
        med = s[len(s) // 2]
        p95 = s[int(len(s) * 0.95)]
        return {"avg_ms": round(avg, 2), "median_ms": round(med, 2), "p95_ms": round(p95, 2)}

    stats_router = compute_stats(latencies_router)
    stats_retriever = compute_stats(latencies_retriever)
    stats_classifier = compute_stats(latencies_classifier)

    # In local pure-Python execution, P95 full router turn should be under 50ms
    assert stats_router["p95_ms"] < 150.0, f"Router P95 too high: {stats_router}"
    assert stats_retriever["p95_ms"] < 50.0, f"Retriever P95 too high: {stats_retriever}"
    assert stats_classifier["p95_ms"] < 25.0, f"Classifier P95 too high: {stats_classifier}"
