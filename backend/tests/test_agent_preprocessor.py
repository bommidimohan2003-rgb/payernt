"""
Unit tests for Payent Agent Engine — Text Preprocessor.
Verifies normalization, contraction expansion, slang mapping, character collapsing,
and entity token preservation.
"""

import pytest
from agent_engine.preprocessor import TextPreprocessor


@pytest.fixture
def preprocessor():
    return TextPreprocessor()


def test_lowercase_normalization(preprocessor):
    result = preprocessor.preprocess("CHECK MY BOOKING STATUS PLEASE")
    assert result.normalized_text == "check my booking status please"
    assert "check" in result.tokens
    assert "booking" in result.tokens


def test_whitespace_and_newline_normalization(preprocessor):
    result = preprocessor.preprocess("   where    is \n\t my \r  order?   ")
    assert result.normalized_text == "where is my order"
    assert result.tokens == ["where", "is", "my", "order"]


def test_contraction_expansion(preprocessor):
    inputs = [
        ("can't find my product", "cannot find my product"),
        ("don't cancel it", "do not cancel it"),
        ("what's my booking status", "what is my booking status"),
        ("i'm waiting for delivery", "i am waiting for delivery"),
        ("won't let me pay", "will not let me pay"),
    ]
    for raw, expected in inputs:
        res = preprocessor.preprocess(raw)
        assert res.normalized_text == expected, f"Failed for '{raw}'"


def test_chat_slang_normalization(preprocessor):
    inputs = [
        ("plz chk my paymnt", "please check my payment"),
        ("u can cancel", "you can cancel"),
        ("need info on delivry", "need information on delivery"),
        ("thx for help", "thanks for help"),
    ]
    for raw, expected in inputs:
        res = preprocessor.preprocess(raw)
        assert res.normalized_text == expected, f"Failed for '{raw}'"


def test_repeated_characters_collapsing(preprocessor):
    inputs = [
        ("heyyy there", "hey there"),
        ("sooooo late", "so late"),
        ("pleaaase help me", "please help me"),
        ("okkkayy", "okay"),
    ]
    for raw, expected in inputs:
        res = preprocessor.preprocess(raw)
        assert res.normalized_text == expected, f"Failed for '{raw}'"


def test_entity_tokens_preserved_during_char_collapse(preprocessor):
    raw = "check ord_11111111 please"
    res = preprocessor.preprocess(raw)
    assert "ord_11111111" in res.tokens
    assert "ord_11111111" in res.normalized_text


def test_empty_and_whitespace_input(preprocessor):
    empty_res = preprocessor.preprocess("")
    assert empty_res.has_content is False
    assert empty_res.normalized_text == ""
    assert empty_res.tokens == []

    ws_res = preprocessor.preprocess("    \n\t   ")
    assert ws_res.has_content is False
    assert ws_res.normalized_text == ""

    none_res = preprocessor.preprocess(None)
    assert none_res.has_content is False
    assert none_res.normalized_text == ""


def test_non_string_input_safe_handling(preprocessor):
    res = preprocessor.preprocess(123456)
    assert res.has_content is True
    assert res.normalized_text == "123456"
    assert res.tokens == ["123456"]


def test_original_text_preserved(preprocessor):
    raw = "PLEASE Check MY order ord_987654321!"
    res = preprocessor.preprocess(raw)
    assert res.original_text == raw
    assert res.normalized_text != raw
