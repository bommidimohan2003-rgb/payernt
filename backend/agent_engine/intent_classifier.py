"""
Payent Agent Engine — Intent Classifier
Deterministic rule-based intent classification engine implementing the 11-step
processing sequence, Telugu-English understanding, entity extraction, and ambiguity detection.
"""

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Set

from agent_engine.confidence import ConfidenceScorer, IntentCandidateScore
from agent_engine.entity_extractor import EntityExtractor, ExtractedEntities
from agent_engine.intent_definitions import DEFAULT_INTENT_DEFINITIONS, IntentDefinition, IntentRegistry
from agent_engine.preprocessor import PreprocessedText, TextPreprocessor
from agent_engine.response_templates import get_response_template
from agent_engine.telugu_normalizer import TeluguNormalizer


@dataclass
class ClassificationResult:
    """Structured result produced by the Intent Classifier."""
    intent: str
    confidence: float
    is_ambiguous: bool
    requires_clarification: bool
    matched_keywords: List[str]
    matched_patterns: List[str]
    entities: Dict[str, Any]
    original_text: str
    normalized_text: str
    response_template_key: str
    suggested_chips: List[str] = field(default_factory=list)
    competing_intents: List[Dict[str, Any]] = field(default_factory=list)
    clarification_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converts result into a serializable dictionary."""
        return {
            "intent": self.intent,
            "confidence": self.confidence,
            "is_ambiguous": self.is_ambiguous,
            "requires_clarification": self.requires_clarification,
            "matched_keywords": self.matched_keywords,
            "matched_patterns": self.matched_patterns,
            "entities": self.entities,
            "original_text": self.original_text,
            "normalized_text": self.normalized_text,
            "response_template_key": self.response_template_key,
            "suggested_chips": self.suggested_chips,
            "competing_intents": self.competing_intents,
            "clarification_message": self.clarification_message,
        }


class IntentClassifier:
    """
    Deterministic intent classifier for Payent customer support.
    Follows a strict 11-step pipeline without external AI/LLM models.
    """

    def __init__(
        self,
        registry: Optional[IntentRegistry] = None,
        preprocessor: Optional[TextPreprocessor] = None,
        telugu_normalizer: Optional[TeluguNormalizer] = None,
        entity_extractor: Optional[EntityExtractor] = None,
        confidence_scorer: Optional[ConfidenceScorer] = None,
    ):
        self.registry = registry or IntentRegistry(DEFAULT_INTENT_DEFINITIONS)
        self.preprocessor = preprocessor or TextPreprocessor()
        self.telugu_normalizer = telugu_normalizer or TeluguNormalizer()
        self.entity_extractor = entity_extractor or EntityExtractor()
        self.confidence_scorer = confidence_scorer or ConfidenceScorer()

    def classify(self, user_input: Any) -> ClassificationResult:
        """
        Executes the 11-step classification pipeline on user input.
        Returns a structured ClassificationResult.
        """
        # Step 1: Validate input
        if user_input is None:
            return self._build_empty_result("", "unknown_intent_response")

        if not isinstance(user_input, str):
            original_text = str(user_input)
        else:
            original_text = user_input

        # Step 2: Preserve original text
        cleaned_original = original_text.strip()
        if not cleaned_original:
            return self._build_empty_result(original_text, "unknown_intent_response")

        # Step 3: Normalize text (English & Telugu-English)
        prep: PreprocessedText = self.preprocessor.preprocess(cleaned_original)
        eng_normalized = prep.normalized_text
        telugu_normalized = self.telugu_normalizer.normalize_tenglish(eng_normalized)

        # Merge unique tokens for keyword matching
        eng_tokens = prep.tokens
        telugu_tokens = telugu_normalized.split()
        all_tokens = list(set(eng_tokens + telugu_tokens))
        token_set: Set[str] = set(all_tokens)

        # Step 4-8: Evaluate candidates against both normalized views
        extracted: ExtractedEntities = self.entity_extractor.extract(original_text)
        candidate_scores: List[IntentCandidateScore] = []

        all_definitions = self.registry.get_all()
        for intent_def in all_definitions:
            if intent_def.canonical_name == "UNKNOWN_INTENT":
                continue

            # Score against English normalized view
            score_eng = self.confidence_scorer.calculate_candidate_score(
                intent_def=intent_def,
                normalized_text=eng_normalized,
                tokens=eng_tokens,
                token_set=set(eng_tokens),
            )

            # Score against Telugu-English normalized view
            score_tel = self.confidence_scorer.calculate_candidate_score(
                intent_def=intent_def,
                normalized_text=telugu_normalized,
                tokens=telugu_tokens,
                token_set=set(telugu_tokens),
            )

            # Select stronger match
            best_score = score_eng if score_eng.total_score >= score_tel.total_score else score_tel

            # Entity context boost:
            # If user provided a booking ID and intent is booking/delivery/payment related, add a contextual boost
            if extracted.booking_ids and intent_def.canonical_name in (
                "BOOKING_STATUS", "BOOKING_DETAILS", "DELIVERY_STATUS", "REFUND_STATUS"
            ):
                if best_score.total_score >= 0.40:
                    best_score.total_score = min(0.95, round(best_score.total_score + 0.12, 3))
                    best_score.matched_patterns.append("booking_id_context_boost")

            if best_score.total_score > 0.0:
                candidate_scores.append(best_score)

        # Step 9: Rank candidates by total score
        candidate_scores.sort(key=lambda c: c.total_score, reverse=True)

        # Step 10: Detect competing intents and ambiguity
        is_ambiguous, requires_clarification, secondary = self.confidence_scorer.evaluate_ambiguity(candidate_scores)

        competing_intents: List[Dict[str, Any]] = [
            {"intent": c.canonical_name, "score": c.total_score}
            for c in candidate_scores[:3]
        ]

        # Case A: Ambiguous competing intents
        if is_ambiguous and secondary is not None:
            top_candidate = candidate_scores[0]
            template = get_response_template("ambiguous_intent_response")
            return ClassificationResult(
                intent=top_candidate.canonical_name,
                confidence=round(top_candidate.total_score * 0.75, 3),  # Ambiguity penalty
                is_ambiguous=True,
                requires_clarification=True,
                matched_keywords=top_candidate.matched_keywords,
                matched_patterns=top_candidate.matched_patterns,
                entities=extracted.to_dict(),
                original_text=original_text,
                normalized_text=eng_normalized,
                response_template_key="ambiguous_intent_response",
                suggested_chips=template.suggested_chips,
                competing_intents=competing_intents,
                clarification_message=f"I noticed you may be asking about {top_candidate.canonical_name} or {secondary.canonical_name}. Please clarify your request.",
            )

        # Case B: Top candidate found with sufficient confidence
        if candidate_scores:
            top_candidate = candidate_scores[0]
            matched_def = self.registry.get(top_candidate.canonical_name)
            threshold = matched_def.confidence_threshold if matched_def else 0.65

            if top_candidate.total_score >= threshold:
                template = get_response_template(matched_def.response_template_key if matched_def else "")
                return ClassificationResult(
                    intent=top_candidate.canonical_name,
                    confidence=top_candidate.total_score,
                    is_ambiguous=False,
                    requires_clarification=False,
                    matched_keywords=top_candidate.matched_keywords,
                    matched_patterns=top_candidate.matched_patterns,
                    entities=extracted.to_dict(),
                    original_text=original_text,
                    normalized_text=eng_normalized,
                    response_template_key=matched_def.response_template_key if matched_def else "general_help_response",
                    suggested_chips=template.suggested_chips,
                    competing_intents=competing_intents,
                    clarification_message=matched_def.clarification_message if matched_def else None,
                )

        # Case C: Low confidence fallback -> UNKNOWN_INTENT
        fallback_def = self.registry.get_fallback()
        template = get_response_template("unknown_intent_response")
        top_score = candidate_scores[0].total_score if candidate_scores else 0.0

        return ClassificationResult(
            intent=fallback_def.canonical_name,
            confidence=round(top_score, 3),
            is_ambiguous=False,
            requires_clarification=True,
            matched_keywords=candidate_scores[0].matched_keywords if candidate_scores else [],
            matched_patterns=[],
            entities=extracted.to_dict(),
            original_text=original_text,
            normalized_text=eng_normalized,
            response_template_key="unknown_intent_response",
            suggested_chips=template.suggested_chips,
            competing_intents=competing_intents,
            clarification_message=fallback_def.clarification_message,
        )

    def _build_empty_result(self, original_text: str, template_key: str) -> ClassificationResult:
        """Helper to build fallback result for empty or invalid inputs."""
        fallback_def = self.registry.get_fallback()
        template = get_response_template(template_key)
        return ClassificationResult(
            intent=fallback_def.canonical_name,
            confidence=0.0,
            is_ambiguous=False,
            requires_clarification=True,
            matched_keywords=[],
            matched_patterns=[],
            entities={},
            original_text=original_text,
            normalized_text="",
            response_template_key=template_key,
            suggested_chips=template.suggested_chips,
            competing_intents=[],
            clarification_message=fallback_def.clarification_message,
        )
