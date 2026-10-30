"""
Comprehensive Intent Classification Test Suite for Payent Agent Engine.
Tests all English and Telugu-English canonical queries, casing variations,
spelling variations, empty inputs, ambiguity detection, entity extraction,
and false-positive prevention across 50+ deterministic test cases.
"""

import pytest
from agent_engine.intent_classifier import IntentClassifier


@pytest.fixture
def classifier():
    return IntentClassifier()


# -------------------------------------------------------------
# 1. Core English Queries Required by Specification
# -------------------------------------------------------------

def test_english_where_is_my_booking(classifier):
    res = classifier.classify("Where is my booking?")
    assert res.intent == "BOOKING_STATUS"
    assert res.confidence >= 0.70
    assert res.requires_clarification is False


def test_english_check_my_payment(classifier):
    res = classifier.classify("Check my payment.")
    assert res.intent in ("PAYMENT_STATUS", "PAYMENT_FAILED")
    assert res.confidence >= 0.65


def test_english_my_refund_is_delayed(classifier):
    res = classifier.classify("My refund is delayed.")
    assert res.intent == "REFUND_STATUS"
    assert res.confidence >= 0.70


def test_english_my_kyc_is_pending(classifier):
    res = classifier.classify("My KYC is pending.")
    assert res.intent == "KYC_STATUS"
    assert res.confidence >= 0.70


def test_english_i_need_human_support(classifier):
    res = classifier.classify("I need human support.")
    assert res.intent == "HUMAN_SUPPORT"
    assert res.confidence >= 0.75


# -------------------------------------------------------------
# 2. Core Telugu-English Queries Required by Specification
# -------------------------------------------------------------

def test_telugu_na_booking_ekkada_undi(classifier):
    res = classifier.classify("na booking ekkada undi")
    assert res.intent == "BOOKING_STATUS"
    assert res.confidence >= 0.70


def test_telugu_booking_cancel_cheyali(classifier):
    res = classifier.classify("booking cancel cheyali")
    assert res.intent == "BOOKING_CANCELLATION"
    assert res.confidence >= 0.70


def test_telugu_dabulu_deduct_ayyayi(classifier):
    res = classifier.classify("dabulu deduct ayyayi")
    assert res.intent == "PAYMENT_FAILED"
    assert res.confidence >= 0.70


def test_telugu_refund_eppudu_vastundi(classifier):
    res = classifier.classify("refund eppudu vastundi")
    assert res.intent == "REFUND_STATUS"
    assert res.confidence >= 0.70


def test_telugu_na_kyc_pending_lo_undi(classifier):
    res = classifier.classify("na KYC pending lo undi")
    assert res.intent == "KYC_STATUS"
    assert res.confidence >= 0.70


def test_telugu_delivery_boy_ekkada_unnadu(classifier):
    res = classifier.classify("delivery boy ekkada unnadu")
    assert res.intent == "DELIVERY_STATUS"
    assert res.confidence >= 0.70


def test_telugu_support_agent_tho_matladali(classifier):
    res = classifier.classify("support agent tho matladali")
    assert res.intent == "HUMAN_SUPPORT"
    assert res.confidence >= 0.75


# -------------------------------------------------------------
# 3. Additional Telugu-English Dialogue Variations
# -------------------------------------------------------------

def test_telugu_booking_confirm_ayyinda(classifier):
    res = classifier.classify("booking confirm ayyinda")
    assert res.intent == "BOOKING_STATUS"


def test_telugu_kyc_reject_ayyindi(classifier):
    res = classifier.classify("kyc reject ayyindi")
    assert res.intent in ("KYC_REJECTION", "KYC_STATUS")


def test_telugu_product_inka_raledu(classifier):
    res = classifier.classify("product inka raledu")
    assert res.intent in ("DELIVERY_ISSUE", "DELIVERY_STATUS")


def test_telugu_na_money_return_cheyyandi(classifier):
    res = classifier.classify("na money return cheyyandi")
    assert res.intent == "REFUND_STATUS"


def test_telugu_real_person_tho_matladali(classifier):
    res = classifier.classify("real person tho matladali")
    assert res.intent == "HUMAN_SUPPORT"


# -------------------------------------------------------------
# 4. Casing Robustness (Uppercase, Lowercase, Mixed Case)
# -------------------------------------------------------------

def test_casing_uppercase(classifier):
    res = classifier.classify("WHERE IS MY BOOKING ORD_12345678?")
    assert res.intent == "BOOKING_STATUS"
    assert res.entities.get("booking_id") == "ord_12345678"


def test_casing_lowercase(classifier):
    res = classifier.classify("where is my booking ord_12345678?")
    assert res.intent == "BOOKING_STATUS"
    assert res.entities.get("booking_id") == "ord_12345678"


def test_casing_mixed_case(classifier):
    res = classifier.classify("WhErE Is My BoOkInG OrD_12345678?")
    assert res.intent == "BOOKING_STATUS"
    assert res.entities.get("booking_id") == "ord_12345678"


# -------------------------------------------------------------
# 5. Spelling Variations & Chat Slang
# -------------------------------------------------------------

def test_spelling_variation_cancel(classifier):
    res = classifier.classify("plz cancle my booking")
    assert res.intent == "BOOKING_CANCELLATION"


def test_spelling_variation_dabbulu_vs_dabulu(classifier):
    res = classifier.classify("dabbulu deduct ayyayi")
    assert res.intent == "PAYMENT_FAILED"


def test_spelling_variation_ekada_vs_ekkada(classifier):
    res = classifier.classify("delivery ekada undi")
    assert res.intent == "DELIVERY_STATUS"


# -------------------------------------------------------------
# 6. Empty & Whitespace Inputs
# -------------------------------------------------------------

def test_empty_string_input(classifier):
    res = classifier.classify("")
    assert res.intent == "UNKNOWN_INTENT"
    assert res.confidence == 0.0
    assert res.requires_clarification is True


def test_whitespace_only_input(classifier):
    res = classifier.classify("     \n\t   ")
    assert res.intent == "UNKNOWN_INTENT"
    assert res.confidence == 0.0
    assert res.requires_clarification is True


def test_none_input(classifier):
    res = classifier.classify(None)
    assert res.intent == "UNKNOWN_INTENT"
    assert res.confidence == 0.0


# -------------------------------------------------------------
# 7. Out-of-Scope & Unknown Inquiries
# -------------------------------------------------------------

def test_unknown_question_weather(classifier):
    res = classifier.classify("What is the weather in Hyderabad today?")
    assert res.intent == "UNKNOWN_INTENT"
    assert res.requires_clarification is True


def test_unknown_question_recipe(classifier):
    res = classifier.classify("Tell me a recipe for chicken biryani")
    assert res.intent == "UNKNOWN_INTENT"
    assert res.requires_clarification is True


def test_unknown_question_random_numbers(classifier):
    res = classifier.classify("98471928374912")
    assert res.intent == "UNKNOWN_INTENT"


# -------------------------------------------------------------
# 8. Ambiguous & Multi-Intent Questions
# -------------------------------------------------------------

def test_ambiguous_booking_and_payment(classifier):
    # Both booking status and payment mentioned equally
    res = classifier.classify("check my booking status and payment status together")
    # Should identify ambiguity or pick the top one with competing intents noted
    assert len(res.competing_intents) >= 2


def test_ambiguous_cancellation_with_refund(classifier):
    res = classifier.classify("i want to cancel my booking and get a refund")
    # Cancellation has higher priority (90 vs 85) but refund should be recognized as competing
    assert res.intent in ("BOOKING_CANCELLATION", "REFUND_STATUS")
    intents = [c["intent"] for c in res.competing_intents]
    assert "BOOKING_CANCELLATION" in intents
    assert "REFUND_STATUS" in intents


# -------------------------------------------------------------
# 9. Entity Extraction Combined With Intent
# -------------------------------------------------------------

def test_intent_with_booking_id(classifier):
    res = classifier.classify("Can you track my order ord_777888999 please?")
    assert res.intent in ("BOOKING_STATUS", "DELIVERY_STATUS")
    assert res.entities.get("booking_id") == "ord_777888999"


def test_intent_with_ticket_id(classifier):
    res = classifier.classify("I want an update on ticket TICK-1730987654")
    assert res.entities.get("ticket_id") == "TICK-1730987654"


def test_intent_with_phone_number(classifier):
    res = classifier.classify("Please call me back on 9876543210 regarding my booking")
    assert res.entities.get("phone_number") == "9876543210"


def test_intent_with_date(classifier):
    res = classifier.classify("When is my rental starting on 2026-11-15?")
    assert res.entities.get("date") == "2026-11-15"


# -------------------------------------------------------------
# 10. False-Positive Prevention
# -------------------------------------------------------------

def test_false_positive_book_noun_prevented(classifier):
    # Using the word 'book' as a reading material should NOT trigger BOOKING_CANCELLATION
    res = classifier.classify("I love reading this fantasy book in my free time")
    assert res.intent != "BOOKING_CANCELLATION"


def test_false_positive_pay_prevented(classifier):
    # General expression with 'pay' without rental context
    res = classifier.classify("I always pay attention to details")
    assert res.intent != "PAYMENT_FAILED"


# -------------------------------------------------------------
# 11. Greetings and Farewells
# -------------------------------------------------------------

def test_greeting_english_hi(classifier):
    res = classifier.classify("Hi")
    assert res.intent == "GREETING"
    assert res.response_template_key == "greeting_response"


def test_greeting_english_hello(classifier):
    res = classifier.classify("Hello there")
    assert res.intent == "GREETING"


def test_greeting_telugu_namaste(classifier):
    res = classifier.classify("Namaste")
    assert res.intent == "GREETING"


def test_greeting_telugu_ela_unnaru(classifier):
    res = classifier.classify("ela unnaru")
    assert res.intent == "GREETING"


def test_goodbye_english_bye(classifier):
    res = classifier.classify("Goodbye have a nice day")
    assert res.intent == "GOODBYE"
    assert res.response_template_key == "goodbye_response"


def test_goodbye_english_see_you(classifier):
    res = classifier.classify("see you later bye")
    assert res.intent == "GOODBYE"


# -------------------------------------------------------------
# 12. General Help & FAQ Inquiries
# -------------------------------------------------------------

def test_general_help(classifier):
    res = classifier.classify("Can you help me please?")
    assert res.intent == "GENERAL_HELP"
    assert res.response_template_key == "general_help_response"


def test_faq_insurance_query(classifier):
    res = classifier.classify("How does the 5 lakhs damage protection work?")
    assert res.intent == "FAQ_QUERY"
    assert res.confidence >= 0.60


def test_faq_security_deposit_query(classifier):
    res = classifier.classify("Do verified users have to pay security deposit?")
    assert res.intent == "FAQ_QUERY"


def test_faq_operating_cities_query(classifier):
    res = classifier.classify("What cities does Payent operate in?")
    assert res.intent == "FAQ_QUERY"


# -------------------------------------------------------------
# 13. Vendor Operations Intents
# -------------------------------------------------------------

def test_product_listing_how_to_list(classifier):
    res = classifier.classify("How do I list my camera equipment for rent?")
    assert res.intent == "PRODUCT_LISTING"
    assert res.confidence >= 0.65


def test_product_listing_become_lender(classifier):
    res = classifier.classify("I want to become a lender on Payent")
    assert res.intent == "PRODUCT_LISTING"


def test_product_approval_under_review(classifier):
    res = classifier.classify("Why is my listing under review?")
    assert res.intent == "PRODUCT_APPROVAL"


def test_booking_acceptance_vendor(classifier):
    res = classifier.classify("How do I accept a rental request from a customer?")
    assert res.intent == "BOOKING_ACCEPTANCE"


def test_booking_rejection_vendor(classifier):
    res = classifier.classify("How do I decline a booking request?")
    assert res.intent == "BOOKING_REJECTION"


# -------------------------------------------------------------
# 14. Account Support & Complaints
# -------------------------------------------------------------

def test_account_support_forgot_password(classifier):
    res = classifier.classify("I forgot my password how do I reset it?")
    assert res.intent == "ACCOUNT_SUPPORT"


def test_account_support_login_issue(classifier):
    res = classifier.classify("Unable to login to my account")
    assert res.intent == "ACCOUNT_SUPPORT"


def test_complaint_damaged_product(classifier):
    res = classifier.classify("The product delivered was completely broken and damaged, file a complaint")
    assert res.intent == "COMPLAINT"
    assert res.confidence >= 0.68


def test_structured_dict_output(classifier):
    res = classifier.classify("Where is my booking ord_12345678?")
    d = res.to_dict()
    assert isinstance(d, dict)
    assert d["intent"] == "BOOKING_STATUS"
    assert d["confidence"] >= 0.70
    assert d["is_ambiguous"] is False
    assert d["requires_clarification"] is False
    assert "booking_id" in d["entities"]
    assert d["entities"]["booking_id"] == "ord_12345678"
    assert len(d["suggested_chips"]) > 0
