"""
Unit tests for Payent Agent Engine — Telugu-English Normalizer.
Verifies code-mixed phrase mapping, spelling standardization, and Tenglish detection.
"""

import pytest
from agent_engine.telugu_normalizer import TeluguNormalizer


@pytest.fixture
def normalizer():
    return TeluguNormalizer()


def test_tenglish_greetings(normalizer):
    inputs = [
        ("namaste", "namaste"),
        ("namaskaram", "namaste greeting"),
        ("ela unnaru", "how are you greeting"),
        ("bagunnara", "how are you greeting"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_tenglish_booking_phrases(normalizer):
    inputs = [
        ("na booking enti", "my booking status check"),
        ("booking status enti", "my booking status check"),
        ("booking ekkada undi", "booking status location"),
        ("booking confirm ayyinda", "booking confirmed status"),
        ("booking details kavali", "booking details request"),
        ("booking cancel cheyali", "booking cancel request"),
        ("booking cancel cheyyandi", "booking cancel request"),
        ("booking vadhu", "booking cancel reject"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_tenglish_payment_phrases(normalizer):
    inputs = [
        ("dabulu deduct ayyayi", "money deducted payment issue"),
        ("money cut ayyindi", "money deducted payment issue"),
        ("payment success ayyinda", "payment success check"),
        ("payment fail ayyindi", "payment failed issue"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_tenglish_refund_phrases(normalizer):
    inputs = [
        ("refund eppudu vastundi", "refund status when return"),
        ("na money return cheyyandi", "refund request return money"),
        ("amount inka raledu", "refund delayed not received"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_tenglish_kyc_phrases(normalizer):
    inputs = [
        ("na kyc pending lo undi", "kyc status pending check"),
        ("kyc reject ayyindi", "kyc rejection issue"),
        ("kyc approve ayyinda", "kyc approval check"),
        ("documents submit chesanu", "kyc documents submitted status"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_tenglish_delivery_phrases(normalizer):
    inputs = [
        ("delivery ekkada undi", "delivery status location track"),
        ("delivery boy ekkada unnadu", "delivery courier location track"),
        ("product inka raledu", "delivery delayed product not arrived"),
        ("pickup eppudu", "pickup timing schedule"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_tenglish_human_support_phrases(normalizer):
    inputs = [
        ("human support kavali", "human support agent talk"),
        ("support agent tho matladali", "human agent support talk"),
        ("customer care kavali", "human support customer care"),
        ("real person tho matladali", "human agent support talk"),
    ]
    for raw, expected_substr in inputs:
        norm = normalizer.normalize_tenglish(raw)
        assert expected_substr in norm, f"Failed for '{raw}' -> got '{norm}'"


def test_spelling_variations_mapping(normalizer):
    # Verify variations resolve to canonical token
    variations = [
        ("dabbulu", "money"),
        ("dabulu", "money"),
        ("cheyyali", "cheyali"),
        ("cheyyandi", "cheyali"),
        ("ainda", "ayyinda"),
        ("ayinda", "ayyinda"),
        ("ekada", "where"),
        ("ekkada", "where"),
        ("epudu", "when"),
        ("eppudu", "when"),
        ("kaavali", "need"),
        ("kavali", "need"),
    ]
    for raw, expected in variations:
        res = normalizer.normalize_tenglish(raw)
        assert expected in res, f"Failed for spelling variation '{raw}'"


def test_is_tenglish_detection(normalizer):
    assert normalizer.is_tenglish("na booking status enti") is True
    assert normalizer.is_tenglish("dabulu cut ayyindi") is True
    assert normalizer.is_tenglish("delivery boy ekkada") is True
    assert normalizer.is_tenglish("support agent tho matladali") is True
    assert normalizer.is_tenglish("where is my camera order") is False
    assert normalizer.is_tenglish("please refund my money") is False


def test_get_tenglish_indicators(normalizer):
    indicators = normalizer.get_tenglish_indicators("na booking ekkada undi please")
    assert "na" in indicators
    assert "ekkada" in indicators
    assert "undi" in indicators
    assert "please" not in indicators
