"""
Unit tests for Payent Agent Engine — Confidence Scorer.
Verifies scoring tiers (exact match, regex match, keyword match, fuzzy match),
confidence boundary constraints, and ambiguity detection logic.
"""

import pytest
from agent_engine.confidence import ConfidenceScorer, IntentCandidateScore
from agent_engine.intent_definitions import IntentDefinition


@pytest.fixture
def scorer():
    return ConfidenceScorer(ambiguity_delta=0.15)


@pytest.fixture
def sample_intent_def():
    return IntentDefinition(
        canonical_name="BOOKING_STATUS",
        description="Check status of a booking",
        english_keywords=("booking", "status", "order", "check"),
        telugu_keywords=("enti", "ekkada"),
        synonyms=("order state", "rental progress"),
        exact_phrases=("where is my booking", "check my booking status"),
        regex_patterns=(r"\b(where\s+is|check)\s+(my\s+)?booking\b",),
        priority=70,
        confidence_threshold=0.65,
    )


def test_exact_phrase_match_confidence(scorer, sample_intent_def):
    score = scorer.calculate_candidate_score(
        intent_def=sample_intent_def,
        normalized_text="where is my booking",
        tokens=["where", "is", "my", "booking"],
        token_set={"where", "is", "my", "booking"},
    )
    assert score.exact_phrase_match is True
    assert score.total_score >= 0.95


def test_regex_match_confidence(scorer, sample_intent_def):
    score = scorer.calculate_candidate_score(
        intent_def=sample_intent_def,
        normalized_text="please check my booking quickly",
        tokens=["please", "check", "my", "booking", "quickly"],
        token_set={"please", "check", "my", "booking", "quickly"},
    )
    assert score.regex_match is True
    assert score.total_score >= 0.85


def test_keyword_match_confidence(scorer, sample_intent_def):
    score = scorer.calculate_candidate_score(
        intent_def=sample_intent_def,
        normalized_text="hello i need the status for this rental",
        tokens=["hello", "i", "need", "the", "status", "for", "this", "rental"],
        token_set={"hello", "i", "need", "the", "status", "for", "this", "rental"},
    )
    assert score.exact_phrase_match is False
    assert score.regex_match is False
    assert "status" in score.matched_keywords
    assert 0.40 <= score.total_score <= 0.85


def test_fuzzy_match_typo_handling(scorer, sample_intent_def):
    # Typo: "sttaus" -> "status" (Levenshtein distance 1)
    score = scorer.calculate_candidate_score(
        intent_def=sample_intent_def,
        normalized_text="sttaus",
        tokens=["sttaus"],
        token_set={"sttaus"},
    )
    assert score.fuzzy_score > 0.0
    assert any("~status" in kw for kw in score.matched_keywords)


def test_zero_match_score(scorer, sample_intent_def):
    score = scorer.calculate_candidate_score(
        intent_def=sample_intent_def,
        normalized_text="weather in bangalore tomorrow is sunny",
        tokens=["weather", "in", "bangalore", "tomorrow", "is", "sunny"],
        token_set={"weather", "in", "bangalore", "tomorrow", "is", "sunny"},
    )
    assert score.total_score == 0.0
    assert len(score.matched_keywords) == 0


def test_ambiguity_evaluation_positive(scorer):
    # Two candidates with close scores
    candidate1 = IntentCandidateScore(
        canonical_name="BOOKING_STATUS",
        total_score=0.82,
    )
    candidate2 = IntentCandidateScore(
        canonical_name="PAYMENT_STATUS",
        total_score=0.78,
    )
    is_ambiguous, requires_clarification, secondary = scorer.evaluate_ambiguity([candidate1, candidate2])
    assert is_ambiguous is True
    assert requires_clarification is True
    assert secondary is not None
    assert secondary.canonical_name == "PAYMENT_STATUS"


def test_ambiguity_evaluation_negative(scorer):
    # One clear winner (delta > 0.15)
    candidate1 = IntentCandidateScore(
        canonical_name="BOOKING_CANCELLATION",
        total_score=0.95,
    )
    candidate2 = IntentCandidateScore(
        canonical_name="GENERAL_HELP",
        total_score=0.45,
    )
    is_ambiguous, requires_clarification, secondary = scorer.evaluate_ambiguity([candidate1, candidate2])
    assert is_ambiguous is False
    assert requires_clarification is False
    assert secondary is None


def test_score_boundaries(scorer, sample_intent_def):
    # Score should never exceed 1.0 or fall below 0.0
    score = scorer.calculate_candidate_score(
        intent_def=sample_intent_def,
        normalized_text="where is my booking check my booking status booking order",
        tokens=["where", "is", "my", "booking", "check", "my", "booking", "status", "booking", "order"],
        token_set={"where", "is", "my", "booking", "check", "status", "order"},
    )
    assert 0.0 <= score.total_score <= 1.0
