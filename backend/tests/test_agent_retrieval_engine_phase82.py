"""
PAYENT AGENT — PHASE 8.2 TEST SUITE: ADVANCED PURE-PYTHON RETRIEVAL ENGINE
Validates:
1. English exact and partial phrase matching.
2. Telugu-English (Tenglish) vernacular transliteration handling.
3. Category-grouped domain synonym expansion.
4. Levenshtein-based spelling error correction.
5. Repeated character collapsing and chat slang normalization.
6. Negation and polar distinction preservation (reject != approve, cancel != confirm).
7. Discrimination between similar but semantically distinct questions.
8. Low-confidence fallback for out-of-domain queries.
9. Ambiguity detection and competing candidate flagging.
10. Empty, whitespace, punctuation, and Unicode input safety.
11. Configurable field weighting and category filtering.
12. Duplicate question detection (cosine similarity >= 0.80).
13. Compatibility with existing search_ml.py mathematical functions.
14. Confidence tier classification (HIGH >= 0.72, MEDIUM >= 0.50, LOW < 0.50).
"""

import pytest
from typing import List

from agent_engine.retrieval import (
    AgentKnowledgeRetriever,
    KnowledgeDocument,
    RetrievalConfig,
    RetrievalResult,
    SynonymRegistry,
    default_synonym_registry,
)
from search_ml import levenshtein_distance, tokenize as search_ml_tokenize


# ============================================================================
# TEST DATASET DERIVED FROM PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx
# ============================================================================

def create_sample_knowledge_base() -> List[KnowledgeDocument]:
    return [
        KnowledgeDocument(
            id="KB-001",
            question="What is Payent?",
            answer="Payent is a peer-to-peer equipment rental marketplace connecting verified renters with equipment owners.",
            category="General",
            synonyms=["What does Payent do?", "Explain Payent", "Payent ante enti?"],
            retrieval_type="guide",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-002",
            question="How does renting equipment work?",
            answer="A renter finds an item, reviews terms, selects rental dates, and follows the booking workflow to reserve.",
            category="Booking",
            synonyms=["How can I use Payent?", "How does renting work?", "How to rent gear?"],
            retrieval_type="guide",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-003",
            question="How do I cancel a booking?",
            answer="Use the cancellation option in your bookings tab before delivery dispatch. Review cancellation fee eligibility.",
            category="Booking",
            synonyms=["Cancel order", "I want to cancel booking", "Booking cancel ela?", "How to cancel reservation?"],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-004",
            question="Why was my booking cancelled?",
            answer="Check the cancellation status and recorded reason in your order details. Lenders may reject due to unavailable inventory.",
            category="Booking",
            synonyms=["Who cancelled my booking?", "Cancellation reason", "Order cancelled reason"],
            retrieval_type="live_db",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-004B",
            question="How do I check a booking status?",
            answer="Ask for a booking ID or retrieve the user's booking list. Verify ownership and fetch the latest status from the database.",
            category="Booking",
            synonyms=["Check booking status", "Is my order confirmed?", "Status of my booking", "Naa booking status enti?", "Booking status check"],
            retrieval_type="live_db",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-005",
            question="How do I check my payment status?",
            answer="Retrieve transactions using existing secure payment tools. View transaction confirmation and receipt details.",
            category="Payment",
            synonyms=["My payment status", "Was payment successful?", "Check transaction", "Payment ayyinda?"],
            retrieval_type="live_db",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-006",
            question="Money was deducted but booking failed. What should I do?",
            answer="Check booking and payment records together. Unreconciled banking gateway charges are reversed automatically within 24-48 hours.",
            category="Payment",
            synonyms=["Amount deducted but booking not created", "Payment success but order failed", "Money cut"],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-007",
            question="Why is my refund pending?",
            answer="Refunds normally take 3 to 5 business days to credit back to your original payment method after approval.",
            category="Refund",
            synonyms=[
                "Refund not received", "Refund taking time", "Where is my refund?",
                "Dabbulu return eppudu?", "Refund eppudu vastundi?", "Dabbulu refund eppudu vastayi?"
            ],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-008",
            question="Do I need to pay a security deposit?",
            answer="Payent offers zero security deposit on eligible equipment for renters who complete verified government KYC.",
            category="Payment",
            synonyms=["Caution deposit policy", "Security advance", "Zero deposit rules", "Deposit entha?"],
            retrieval_type="guide",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-009",
            question="How does damage protection insurance work?",
            answer="Payent provides up to 5 Lakhs damage protection on verified rentals covering accidental damage during active rental.",
            category="Insurance",
            synonyms=["Is equipment insured?", "Damage policy", "5 lakhs damage coverage", "Repair cover"],
            retrieval_type="guide",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-010",
            question="Why is my KYC pending?",
            answer="Identity verification typically completes within 24 hours while our compliance team verifies your government documents.",
            category="KYC",
            synonyms=["KYC in review", "Why is verification pending?", "KYC review taking time"],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-011",
            question="My KYC was rejected. What should I do?",
            answer="Check the rejection reason on your KYC profile screen, correct document blurriness or name mismatch, and resubmit.",
            category="KYC",
            synonyms=["KYC rejected", "How can I resubmit KYC?", "Verification failed resubmit"],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-012",
            question="How do I track delivery?",
            answer="Check real-time delivery status, courier dispatch stage, and delivery partner location in your order tracking view.",
            category="Delivery",
            synonyms=["Where is my delivery?", "Track my order", "Delivery courier location", "Naa delivery ekkada?"],
            retrieval_type="live_db",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-013",
            question="Why is delivery delayed?",
            answer="Check courier dispatch logs for traffic or route delays. You can reach out directly to the assigned delivery partner.",
            category="Delivery",
            synonyms=["Delivery late", "Partner not arrived", "Courier delay"],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-014",
            question="The product arrived damaged. What should I do?",
            answer="Do not complete secret PIN handover. Take clear photos of the damaged gear and report a dispute immediately.",
            category="Dispute",
            synonyms=["Received damaged item", "Product broken", "Equipment damaged on arrival"],
            retrieval_type="hybrid",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-015",
            question="What is the secret PIN?",
            answer="The 4-digit secret PIN secures the handover between renter and lender. Never share your secret PIN before inspecting gear.",
            category="Security",
            synonyms=["How does handover PIN work?", "Secret handover code", "OTP for rental pickup"],
            retrieval_type="guide",
            is_verified=False,  # Marked draft per [VERIFY IN PAYENT]
        ),
        KnowledgeDocument(
            id="KB-016",
            question="How do I speak to human customer support?",
            answer="Our customer care specialists are available from 9:00 AM to 9:00 PM IST. You can also create a formal support ticket.",
            category="Support",
            synonyms=["Connect me to agent", "Talk to real person", "Customer care number", "Human support kavali"],
            retrieval_type="guide",
            is_verified=True,
        ),
        KnowledgeDocument(
            id="KB-017",
            question="How do I list equipment on Payernt?",
            answer="Open the equipment owner dashboard, enter gear details and serial numbers, set daily rental rates, and upload photos.",
            category="Listing",
            synonyms=["How to list camera for rent?", "List drone on platform", "Owner rental listing"],
            retrieval_type="guide",
            is_verified=True,
        ),
    ]


@pytest.fixture
def retriever() -> AgentKnowledgeRetriever:
    r = AgentKnowledgeRetriever()
    r.index_documents(create_sample_knowledge_base())
    return r


# ============================================================================
# 1. ENGLISH MATCHING (EXACT & PARTIAL)
# ============================================================================

def test_01_english_exact_question_match(retriever: AgentKnowledgeRetriever):
    """Exact question input yields top-1 match with HIGH confidence >= 0.72."""
    res = retriever.retrieve("What is Payent?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-001"
    assert top.similarity_score >= 0.72
    assert top.retrieval_confidence == "HIGH"
    assert "payent" in top.matching_terms


def test_02_english_partial_phrase_match(retriever: AgentKnowledgeRetriever):
    """Partial English phrase retrieves relevant question."""
    res = retriever.retrieve("damage protection insurance 5 lakhs")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-009"
    assert "damage" in top.matching_terms or "insurance" in top.matching_terms


def test_03_english_case_insensitivity_and_whitespace(retriever: AgentKnowledgeRetriever):
    """Case variations and extraneous spaces do not degrade retrieval."""
    res1 = retriever.retrieve("WHAT IS PAYENT?")
    res2 = retriever.retrieve("   what   is    payent?   ")
    assert res1[0].knowledge_id == "KB-001"
    assert res2[0].knowledge_id == "KB-001"
    assert abs(res1[0].similarity_score - res2[0].similarity_score) < 0.001


# ============================================================================
# 2. TELUGU-ENGLISH (TENGLISH) TRANSLITERATIONS
# ============================================================================

def test_04_tenglish_transliteration_booking_status(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Naa booking status enti?' maps to booking status inquiry."""
    res = retriever.retrieve("Naa booking status enti?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id in ("KB-002", "KB-003", "KB-004", "KB-004B")
    assert top.similarity_score >= 0.50


def test_05_tenglish_transliteration_booking_confirmed(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Booking confirm ayyinda?' maps to booking confirmation check."""
    res = retriever.retrieve("Booking confirm ayyinda?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id in ("KB-002", "KB-004", "KB-004B", "KB-005")


def test_06_tenglish_transliteration_refund_timing(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Refund eppudu vastundi?' maps to refund pending timeline."""
    res = retriever.retrieve("Refund eppudu vastundi?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-007"
    assert top.similarity_score >= 0.60


def test_07_tenglish_transliteration_dabbulu_refund(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Dabbulu refund eppudu vastayi?' retrieves refund delay KB."""
    res = retriever.retrieve("Dabbulu refund eppudu vastayi?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-007"


def test_08_tenglish_transliteration_cancel_vaddu(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Booking vaddu cancel cheyali' retrieves cancellation guide."""
    res = retriever.retrieve("Booking vaddu cancel cheyali")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-003"
    assert top.similarity_score >= 0.70


def test_09_tenglish_transliteration_kyc_pending(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Naa kyc pending lo undi' retrieves KYC pending article."""
    res = retriever.retrieve("Naa kyc pending lo undi")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-010"


def test_10_tenglish_transliteration_delivery_courier(retriever: AgentKnowledgeRetriever):
    """Tenglish 'Delivery boy ekkada unnadu?' retrieves delivery tracking."""
    res = retriever.retrieve("Delivery boy ekkada unnadu?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id in ("KB-012", "KB-013")


# ============================================================================
# 3. CATEGORY SYNONYM EXPANSION
# ============================================================================

def test_11_synonym_expansion_reservation_to_booking(retriever: AgentKnowledgeRetriever):
    """Synonym 'reservation' correctly matches 'booking' article."""
    res = retriever.retrieve("How do I cancel my reservation?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-003"


def test_12_synonym_expansion_caution_deposit_to_security_deposit(retriever: AgentKnowledgeRetriever):
    """Synonym 'caution deposit' matches security deposit policy."""
    res = retriever.retrieve("Do I need to pay caution deposit?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-008"


def test_13_synonym_expansion_courier_rider_to_delivery(retriever: AgentKnowledgeRetriever):
    """Synonym 'courier rider' matches delivery tracking article."""
    res = retriever.retrieve("Where is the courier rider?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id in ("KB-012", "KB-013")


def test_14_synonym_expansion_gadget_gear_to_equipment(retriever: AgentKnowledgeRetriever):
    """Synonym 'gadget' and 'gear' match equipment renting."""
    res = retriever.retrieve("How does renting gadgets work?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-002"


def test_15_synonym_expansion_reimbursement_to_refund(retriever: AgentKnowledgeRetriever):
    """Synonym 'reimbursement' matches refund inquiries."""
    res = retriever.retrieve("Why is my reimbursement taking time?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-007"


# ============================================================================
# 4. SPELLING CORRECTION & CHAT SLANG NORMALIZATION
# ============================================================================

def test_16_spelling_correction_cancle_and_bokng(retriever: AgentKnowledgeRetriever):
    """Typo 'cancle' and 'bokng' correctly normalized and matched."""
    res = retriever.retrieve("How to cancle my bokng?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-003"


def test_17_spelling_correction_paymnt_and_refnd(retriever: AgentKnowledgeRetriever):
    """Typo 'paymnt' and 'refnd' correctly matched."""
    res = retriever.retrieve("Why is my refnd paymnt delay?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id in ("KB-006", "KB-007")


def test_18_spelling_correction_delivry_and_partnr(retriever: AgentKnowledgeRetriever):
    """Typo 'delivry partnr' correctly matched to delivery tracking."""
    res = retriever.retrieve("Where is my delivry partnr?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id in ("KB-012", "KB-013")


def test_19_repeated_characters_normalization(retriever: AgentKnowledgeRetriever):
    """Collapses repeated characters ('sooo', 'pleaaase', 'bookinggg')."""
    res = retriever.retrieve("pleaaase how do I cancel my bookinggg?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-003"


# ============================================================================
# 5. NEGATION & POLARITY PRESERVATION
# ============================================================================

def test_20_negation_preservation_kyc_approved_vs_rejected(retriever: AgentKnowledgeRetriever):
    """'Why was my KYC rejected?' strictly maps to rejection, not pending or approval."""
    res = retriever.retrieve("My KYC was rejected what should I do?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-011"
    assert top.knowledge_id != "KB-010"


def test_21_negation_preservation_booking_cancelled_vs_cancel_action(retriever: AgentKnowledgeRetriever):
    """'Why was my booking cancelled?' (passive inquiry) does not collapse into 'How to cancel'."""
    res = retriever.retrieve("Why was my booking cancelled?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-004"


# ============================================================================
# 6. DISCRIMINATION BETWEEN SIMILAR QUESTIONS
# ============================================================================

def test_22_similar_but_different_deposit_vs_insurance(retriever: AgentKnowledgeRetriever):
    """Discriminates between security deposit policy and damage protection insurance."""
    res_dep = retriever.retrieve("Do I need to pay a security deposit?")
    res_ins = retriever.retrieve("How does damage protection insurance work?")

    assert res_dep[0].knowledge_id == "KB-008"
    assert res_ins[0].knowledge_id == "KB-009"


def test_23_similar_delivery_tracking_vs_delivery_delayed(retriever: AgentKnowledgeRetriever):
    """Distinguishes general tracking from delay problem inquiry."""
    res_track = retriever.retrieve("How do I track delivery?")
    res_delay = retriever.retrieve("Why is delivery delayed?")

    assert res_track[0].knowledge_id == "KB-012"
    assert res_delay[0].knowledge_id == "KB-013"


# ============================================================================
# 7. LOW-CONFIDENCE OUT-OF-DOMAIN HANDLING
# ============================================================================

def test_24_low_confidence_out_of_domain_queries(retriever: AgentKnowledgeRetriever):
    """Out-of-domain queries yield LOW confidence (< 0.50)."""
    res = retriever.retrieve("How to cook Hyderabadi chicken biryani?")
    if res:
        assert res[0].similarity_score < 0.50
        assert res[0].retrieval_confidence == "LOW"


def test_25_low_confidence_completely_random_gibberish(retriever: AgentKnowledgeRetriever):
    """Gibberish strings produce 0 results or LOW confidence."""
    res = retriever.retrieve("xyzqwerty asdfgh jklpoiuy")
    assert len(res) == 0 or res[0].similarity_score < 0.30


# ============================================================================
# 8. AMBIGUITY DETECTION
# ============================================================================

def test_26_ambiguity_detection_for_competing_candidates(retriever: AgentKnowledgeRetriever):
    """Flags ambiguity when top two candidates score within ambiguity_delta."""
    # Custom config with wider delta to trigger ambiguity test cleanly
    ambiguous_cfg = RetrievalConfig(ambiguity_delta=0.15, min_ambiguity_threshold=0.35)
    r = AgentKnowledgeRetriever(config=ambiguous_cfg)
    r.index_documents([
        KnowledgeDocument(id="A-1", question="How do I change booking dates?", category="Booking"),
        KnowledgeDocument(id="A-2", question="How do I cancel booking dates?", category="Booking"),
    ])

    res = r.retrieve("change or cancel booking dates")
    assert len(res) >= 2
    top = res[0]
    assert top.is_ambiguous is True
    assert len(top.competing_candidates) > 0


# ============================================================================
# 9. EDGE CASES & INPUT SANITIZATION
# ============================================================================

def test_27_empty_and_whitespace_inputs_graceful(retriever: AgentKnowledgeRetriever):
    """None, empty strings, and whitespace return empty results without error."""
    assert retriever.retrieve("") == []
    assert retriever.retrieve("    ") == []
    assert retriever.retrieve("\t\n") == []
    assert retriever.retrieve(None) == []


def test_28_special_characters_and_punctuation_handling(retriever: AgentKnowledgeRetriever):
    """Excessive punctuation does not corrupt retrieval."""
    res = retriever.retrieve("??? What is Payent ????!!!!")
    assert len(res) > 0
    assert res[0].knowledge_id == "KB-001"
    assert res[0].similarity_score >= 0.70


# ============================================================================
# 10. CONFIGURABLE FIELD WEIGHTS & CATEGORY FILTERING
# ============================================================================

def test_29_category_filtering(retriever: AgentKnowledgeRetriever):
    """Category filter restricts candidates strictly to specified category."""
    res = retriever.retrieve("status", category_filter="Payment")
    assert len(res) > 0
    for r in res:
        assert r.category == "Payment"


def test_30_field_weights_question_vs_answer_influence():
    """Validates that question weighting (3.5) outweighs answer weighting (1.0)."""
    cfg = RetrievalConfig(weight_question=5.0, weight_answer=0.2)
    r = AgentKnowledgeRetriever(config=cfg)
    r.index_documents([
        KnowledgeDocument(id="D1", question="drone camera rental", answer="standard item"),
        KnowledgeDocument(id="D2", question="bike scooter rental", answer="includes drone camera accessories"),
    ])

    res = r.retrieve("drone camera")
    assert res[0].knowledge_id == "D1"


# ============================================================================
# 11. DUPLICATE QUESTION DETECTION
# ============================================================================

def test_31_duplicate_detection_utility(retriever: AgentKnowledgeRetriever):
    """check_duplicate flags high-similarity duplicates (>= 0.80)."""
    match = retriever.check_duplicate("What is Payent?", threshold=0.80)
    assert match is not None
    doc, score = match
    assert doc.id == "KB-001"
    assert score >= 0.80

    # Non-duplicate should return None
    no_match = retriever.check_duplicate("How to fly a Boeing 747 aircraft?", threshold=0.80)
    assert no_match is None


# ============================================================================
# 12. EXISTING SEARCH_ML COMPATIBILITY
# ============================================================================

def test_32_search_ml_compatibility():
    """Validates interoperability with existing search_ml functions."""
    tokens = search_ml_tokenize("Payent Camera Rental 2026!")
    assert "camera" in tokens
    assert "rental" in tokens

    dist = levenshtein_distance("cancle", "cancel")
    assert dist == 2


# ============================================================================
# 13. CONFIDENCE TIER CLASSIFICATION & VERIFICATION FLAG
# ============================================================================

def test_33_confidence_tier_boundaries(retriever: AgentKnowledgeRetriever):
    """Verifies assignment of HIGH, MEDIUM, and LOW confidence tiers."""
    cfg = RetrievalConfig(threshold_high=0.72, threshold_medium=0.50, threshold_low=0.30)
    r = AgentKnowledgeRetriever(config=cfg)
    r.index_documents(create_sample_knowledge_base())

    high_res = r.retrieve("What is Payent?")
    assert high_res[0].retrieval_confidence == "HIGH"

    medium_res = r.retrieve("How can I use Payent to rent gear?")
    assert medium_res[0].retrieval_confidence == "MEDIUM"

    low_res = r.retrieve("How to cook Hyderabadi chicken biryani?")
    if low_res:
        assert low_res[0].retrieval_confidence == "LOW"


def test_34_verified_vs_unverified_flag_preservation(retriever: AgentKnowledgeRetriever):
    """Preserves is_verified=False status on draft entries like Secret PIN."""
    res = retriever.retrieve("What is the secret PIN?")
    assert len(res) > 0
    top = res[0]
    assert top.knowledge_id == "KB-015"
    assert top.is_verified is False  # Explicitly unverified draft guidance
