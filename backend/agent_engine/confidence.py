"""
Payent Agent Engine — Confidence Scorer
Transparent confidence score calculation combining exact phrase matching,
regex matches, keyword overlap, synonym coverage, and ambiguity detection.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

# Gracefully import existing Levenshtein distance utility from Payent search_ml
try:
    from search_ml import levenshtein_distance
except ImportError:
    def levenshtein_distance(s1: str, s2: str) -> int:
        if len(s1) < len(s2):
            return levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        return previous_row[-1]


@dataclass
class IntentCandidateScore:
    """Detailed score breakdown for a single intent candidate."""
    canonical_name: str
    total_score: float
    exact_phrase_match: bool = False
    regex_match: bool = False
    matched_keywords: List[str] = field(default_factory=list)
    matched_patterns: List[str] = field(default_factory=list)
    keyword_score: float = 0.0
    synonym_score: float = 0.0
    fuzzy_score: float = 0.0
    priority_bonus: float = 0.0
    ambiguity_penalty: float = 0.0


class ConfidenceScorer:
    """
    Evaluates semantic confidence across intent candidates deterministically.
    Penalizes competing intents and flags ambiguous inputs.
    """

    EXACT_PHRASE_WEIGHT = 0.95
    REGEX_MATCH_WEIGHT = 0.85
    KEYWORD_MATCH_WEIGHT = 0.60
    SYNONYM_MATCH_WEIGHT = 0.45
    FUZZY_MATCH_WEIGHT = 0.40

    # Ambiguity criteria: top two intents have score delta <= AMBIGUITY_DELTA
    AMBIGUITY_DELTA = 0.15
    AMBIGUITY_MIN_THRESHOLD = 0.50

    def __init__(self, ambiguity_delta: float = AMBIGUITY_DELTA):
        self.ambiguity_delta = ambiguity_delta

    def calculate_candidate_score(
        self,
        intent_def,
        normalized_text: str,
        tokens: List[str],
        token_set: Set[str],
    ) -> IntentCandidateScore:
        """Computes confidence score for one candidate intent definition."""
        matched_keywords: List[str] = []
        matched_patterns: List[str] = []

        exact_phrase_match = False
        regex_match = False

        # 1. Exact phrase match
        for phrase in intent_def.exact_phrases:
            phrase_clean = phrase.lower().strip()
            if phrase_clean and (phrase_clean == normalized_text or f" {phrase_clean} " in f" {normalized_text} "):
                exact_phrase_match = True
                matched_keywords.append(phrase_clean)
                break

        # 2. Regex pattern match
        import re
        for pat in intent_def.regex_patterns:
            try:
                if re.search(pat, normalized_text, re.IGNORECASE):
                    regex_match = True
                    matched_patterns.append(pat)
            except re.error:
                continue

        # 3. English and Telugu keyword token matches
        kw_matches = 0
        all_keywords = list(intent_def.english_keywords) + list(intent_def.telugu_keywords)
        for kw in all_keywords:
            kw_clean = kw.lower().strip()
            if " " in kw_clean:
                if kw_clean in normalized_text:
                    kw_matches += 1
                    if kw_clean not in matched_keywords:
                        matched_keywords.append(kw_clean)
            else:
                if kw_clean in token_set:
                    kw_matches += 1
                    if kw_clean not in matched_keywords:
                        matched_keywords.append(kw_clean)

        # Keyword density score
        keyword_score = 0.0
        if all_keywords:
            keyword_score = min(1.0, kw_matches / max(1, min(len(all_keywords), 3)))

        # 4. Synonym matches
        syn_matches = 0
        multi_word_syn_matched = False
        for syn in intent_def.synonyms:
            syn_clean = syn.lower().strip()
            if syn_clean and syn_clean in normalized_text:
                syn_matches += 1
                if " " in syn_clean:
                    multi_word_syn_matched = True
                if syn_clean not in matched_keywords:
                    matched_keywords.append(syn_clean)

        synonym_score = 0.0
        if intent_def.synonyms:
            synonym_score = min(1.0, syn_matches / max(1, len(intent_def.synonyms)))

        # 5. Fuzzy match for short typos if no direct keyword matches found
        fuzzy_score = 0.0
        if not exact_phrase_match and not regex_match and kw_matches == 0 and len(tokens) <= 4:
            for token in tokens:
                if len(token) >= 4:
                    for kw in all_keywords:
                        if len(kw) >= 4 and " " not in kw:
                            dist = levenshtein_distance(token, kw)
                            if dist == 1:
                                fuzzy_score = max(fuzzy_score, 0.70)
                                if f"{token}~{kw}" not in matched_keywords:
                                    matched_keywords.append(f"{token}~{kw}")
                            elif dist == 2 and len(kw) >= 5:
                                fuzzy_score = max(fuzzy_score, 0.60)
                                if f"{token}~{kw}" not in matched_keywords:
                                    matched_keywords.append(f"{token}~{kw}")

        # Priority small tie-breaker (max 0.05 bonus)
        priority_bonus = min(0.05, (intent_def.priority / 100.0) * 0.05)

        # Total combined score calculation
        if exact_phrase_match:
            base_score = self.EXACT_PHRASE_WEIGHT
            if regex_match:
                base_score = 0.98
        elif regex_match:
            base_score = self.REGEX_MATCH_WEIGHT
            if kw_matches > 0 or multi_word_syn_matched:
                base_score = min(0.95, base_score + (0.05 * max(1, kw_matches)))
        elif multi_word_syn_matched:
            # Multi-word synonym is strong intent indicator
            base_score = 0.80 + (0.05 * kw_matches)
        elif kw_matches > 0:
            base_score = min(0.85, 0.45 + (keyword_score * 0.35) + (synonym_score * 0.10))
            if kw_matches >= 2:
                base_score = max(base_score, 0.78)
        elif syn_matches > 0:
            base_score = min(0.70, 0.40 + (synonym_score * 0.30))
        elif fuzzy_score > 0.0:
            base_score = fuzzy_score
        else:
            base_score = 0.0

        if base_score > 0.0:
            total_score = min(1.0, max(0.0, base_score + priority_bonus))
        else:
            total_score = 0.0

        return IntentCandidateScore(
            canonical_name=intent_def.canonical_name,
            total_score=round(total_score, 3),
            exact_phrase_match=exact_phrase_match,
            regex_match=regex_match,
            matched_keywords=matched_keywords,
            matched_patterns=matched_patterns,
            keyword_score=round(keyword_score, 3),
            synonym_score=round(synonym_score, 3),
            fuzzy_score=round(fuzzy_score, 3),
            priority_bonus=round(priority_bonus, 3),
        )

    def evaluate_ambiguity(
        self,
        ranked_scores: List[IntentCandidateScore],
    ) -> Tuple[bool, bool, Optional[IntentCandidateScore]]:
        """
        Determines if the top intents are competing or ambiguous.
        Returns:
            (is_ambiguous, requires_clarification, secondary_intent)
        """
        if not ranked_scores or len(ranked_scores) < 2:
            return False, False, None

        top = ranked_scores[0]
        second = ranked_scores[1]

        # Both must meet minimum signal threshold
        if top.total_score >= self.AMBIGUITY_MIN_THRESHOLD and second.total_score >= self.AMBIGUITY_MIN_THRESHOLD:
            score_diff = abs(top.total_score - second.total_score)
            if score_diff <= self.ambiguity_delta:
                return True, True, second

        return False, False, None
