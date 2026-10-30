"""
Unit tests for Payent Agent Engine — Entity Extractor.
Verifies parsing of booking IDs, product IDs, ticket IDs, dates, phone numbers,
and enforces security sanitization of Aadhaar, PAN, card numbers, and OTPs.
"""

import pytest
from agent_engine.entity_extractor import EntityExtractor


@pytest.fixture
def extractor():
    return EntityExtractor()


def test_booking_id_extraction(extractor):
    inputs = [
        ("Where is my booking ord_1730001234567?", "ord_1730001234567"),
        ("Please cancel order_987654321 immediately", "order_987654321"),
        ("Check status for booking_555555 please", "booking_555555"),
        ("Order id 550e8400-e29b-41d4-a716-446655440000 details", "550e8400-e29b-41d4-a716-446655440000"),
    ]
    for text, expected_id in inputs:
        res = extractor.extract(text)
        assert expected_id in res.booking_ids, f"Failed to extract '{expected_id}' from '{text}'"


def test_product_id_extraction(extractor):
    inputs = [
        ("I want to rent prod_sony_a7s_kit", "prod_sony_a7s_kit"),
        ("Is p_alpha_12345 available?", "p_alpha_12345"),
        ("Check custom_lens_85mm", "custom_lens_85mm"),
    ]
    for text, expected_id in inputs:
        res = extractor.extract(text)
        assert expected_id in res.product_ids, f"Failed to extract '{expected_id}' from '{text}'"


def test_ticket_id_extraction(extractor):
    inputs = [
        ("Reference ticket TICK-1730123456 status", "TICK-1730123456"),
        ("Following up on CONV-1730999999 please", "CONV-1730999999"),
    ]
    for text, expected_id in inputs:
        res = extractor.extract(text)
        assert expected_id in res.ticket_ids, f"Failed to extract '{expected_id}' from '{text}'"


def test_date_extraction(extractor):
    inputs = [
        ("My rental starts on 2026-11-10", "2026-11-10"),
        ("Can I return on 15-11-2026?", "15-11-2026"),
        ("Scheduled for 25/12/2026 delivery", "25/12/2026"),
    ]
    for text, expected_date in inputs:
        res = extractor.extract(text)
        assert expected_date in res.dates, f"Failed to extract '{expected_date}' from '{text}'"


def test_phone_number_extraction(extractor):
    inputs = [
        ("Call me at 9876543210 please", "9876543210"),
        ("My number is +91-9123456789", "9123456789"),
        ("Reach out on 08765432109", "8765432109"),
    ]
    for text, expected_phone in inputs:
        res = extractor.extract(text)
        assert expected_phone in res.phone_numbers, f"Failed to extract '{expected_phone}' from '{text}'"


def test_sensitive_aadhaar_redaction(extractor):
    # 12-digit Aadhaar must be detected, sanitized, and NEVER returned as an entity
    raw = "My Aadhaar number is 5432 1234 9876 verify my kyc"
    res = extractor.extract(raw)
    assert res.has_sensitive_data_detected is True
    assert "5432 1234 9876" not in res.sanitized_text
    assert "[REDACTED_AADHAAR]" in res.sanitized_text
    assert "5432 1234 9876" not in res.booking_ids
    assert "5432 1234 9876" not in res.phone_numbers


def test_sensitive_pan_redaction(extractor):
    # 10-char PAN must be detected, sanitized, and NEVER returned as an entity
    raw = "Here is my pan ABCDE1234F for verification"
    res = extractor.extract(raw)
    assert res.has_sensitive_data_detected is True
    assert "ABCDE1234F" not in res.sanitized_text
    assert "[REDACTED_PAN]" in res.sanitized_text
    assert "ABCDE1234F" not in res.product_ids


def test_sensitive_card_redaction(extractor):
    raw = "I paid with 4111 2222 3333 4444 please refund"
    res = extractor.extract(raw)
    assert res.has_sensitive_data_detected is True
    assert "4111 2222 3333 4444" not in res.sanitized_text
    assert "[REDACTED_CARD]" in res.sanitized_text


def test_sensitive_otp_redaction(extractor):
    raw = "My secret pin is 7821 why is it not working"
    res = extractor.extract(raw)
    assert res.has_sensitive_data_detected is True
    assert "[REDACTED_PIN]" in res.sanitized_text


def test_invalid_and_false_positive_ids_prevented(extractor):
    # General words must not trigger entity extraction
    raw = "I am ordering some tickets for a product tomorrow"
    res = extractor.extract(raw)
    assert len(res.booking_ids) == 0
    assert len(res.product_ids) == 0
    assert len(res.ticket_ids) == 0


def test_empty_input_entity_extraction(extractor):
    res_empty = extractor.extract("")
    assert res_empty.booking_ids == []
    assert res_empty.product_ids == []
    assert res_empty.has_sensitive_data_detected is False

    res_none = extractor.extract(None)
    assert res_none.booking_ids == []
