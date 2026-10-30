"""
Payent Agent Engine — Text Preprocessor
Pure-Python text normalization, punctuation handling, tokenization,
and spelling variation standardization.
"""

import re
from dataclasses import dataclass
from typing import List, Pattern


@dataclass(frozen=True)
class PreprocessedText:
    """Immutable preprocessed text representation."""
    original_text: str
    normalized_text: str
    tokens: List[str]
    has_content: bool


class TextPreprocessor:
    """
    Standardizes user input into clean normalized text for intent classification
    while preserving original input for entity extraction and display.
    """

    # Common English contractions mapping
    CONTRACTIONS = {
        r"\bcan'?t\b": "cannot",
        r"\bwon'?t\b": "will not",
        r"\bdon'?t\b": "do not",
        r"\bdoesn'?t\b": "does not",
        r"\bdidn'?t\b": "did not",
        r"\bisn'?t\b": "is not",
        r"\baren'?t\b": "are not",
        r"\bwasn'?t\b": "was not",
        r"\bweren'?t\b": "were not",
        r"\bhaven'?t\b": "have not",
        r"\bhasn'?t\b": "has not",
        r"\bhadn'?t\b": "had not",
        r"\bwouldn'?t\b": "would not",
        r"\bshouldn'?t\b": "should not",
        r"\bcouldn'?t\b": "could not",
        r"\bi'?m\b": "i am",
        r"\byou'?re\b": "you are",
        r"\bwe'?re\b": "we are",
        r"\bthey'?re\b": "they are",
        r"\bit'?s\b": "it is",
        r"\bthat'?s\b": "that is",
        r"\bwhat'?s\b": "what is",
        r"\bthere'?s\b": "there is",
        r"\bwho'?s\b": "who is",
    }

    # Common chat slang and informal abbreviations
    COMMON_SLANG = {
        r"\bplz+\b": "please",
        r"\bpls+\b": "please",
        r"\bthx+\b": "thanks",
        r"\btks+\b": "thanks",
        r"\btq+\b": "thank you",
        r"\bu\b": "you",
        r"\bur\b": "your",
        r"\br\b": "are",
        r"\bchk\b": "check",
        r"\binfo\b": "information",
        r"\bmsg\b": "message",
        r"\bsec\b": "second",
        r"\bmin\b": "minute",
        r"\bdoc\b": "document",
        r"\bdocs\b": "documents",
        r"\bdelivry\b": "delivery",
        r"\bcancle\b": "cancel",
        r"\bcanceld\b": "cancelled",
        r"\bcanceling\b": "cancelling",
        r"\bpaymnt\b": "payment",
        r"\brefnd\b": "refund",
        r"\bokk+a*y*\b": "okay",
        r"\bokaay\b": "okay",
    }

    # Regex identifying known Payent entity identifiers (must NOT be altered by char-collapse)
    ENTITY_TOKEN_PATTERN = re.compile(
        r"\b(ord_[a-zA-Z0-9_]+|order_[a-zA-Z0-9_]+|booking_[a-zA-Z0-9_]+|"
        r"prod_[a-zA-Z0-9_]+|p_[a-zA-Z0-9_]+|TICK-\d+|CONV-\d+)\b",
        re.IGNORECASE,
    )

    def __init__(self):
        self._compiled_contractions = [
            (re.compile(pattern, re.IGNORECASE), repl)
            for pattern, repl in self.CONTRACTIONS.items()
        ]
        self._compiled_slang = [
            (re.compile(pattern, re.IGNORECASE), repl)
            for pattern, repl in self.COMMON_SLANG.items()
        ]

    def preprocess(self, raw_input: object) -> PreprocessedText:
        """
        Executes complete preprocessing on the input.
        Handles None, non-string, whitespace-only, and complex strings safely.
        """
        if raw_input is None:
            return PreprocessedText(
                original_text="",
                normalized_text="",
                tokens=[],
                has_content=False,
            )

        if not isinstance(raw_input, str):
            original = str(raw_input)
        else:
            original = raw_input

        cleaned_original = original.strip()
        if not cleaned_original:
            return PreprocessedText(
                original_text=original,
                normalized_text="",
                tokens=[],
                has_content=False,
            )

        normalized = self.normalize_text(cleaned_original)
        tokens = self.tokenize(normalized)

        return PreprocessedText(
            original_text=original,
            normalized_text=normalized,
            tokens=tokens,
            has_content=len(tokens) > 0,
        )

    def normalize_text(self, text: str) -> str:
        """
        Normalizes a string by converting to lowercase, expanding contractions,
        handling repeated characters, and cleaning irregular whitespace.
        """
        if not text:
            return ""

        # Lowercase
        normalized = text.lower()

        # Expand contractions
        for pattern, replacement in self._compiled_contractions:
            normalized = pattern.sub(replacement, normalized)

        # Standardize common chat slang
        for pattern, replacement in self._compiled_slang:
            normalized = pattern.sub(replacement, normalized)

        # Collapse excess repeated characters word-by-word (e.g. "sooo" -> "so", "heyyy" -> "hey")
        words = normalized.split()
        collapsed_words = []
        for word in words:
            # Check if this token matches a Payent entity format; if so, preserve as-is
            if self.ENTITY_TOKEN_PATTERN.match(word):
                collapsed_words.append(word)
            else:
                collapsed_words.append(self.collapse_repeated_chars(word))

        normalized = " ".join(collapsed_words)

        # Normalize punctuation: keep alphanumeric, spaces, hyphens, and underscores within words
        # Replace other punctuation with spaces
        normalized = re.sub(r"[^\w\s\-_]", " ", normalized)

        # Collapse multiple spaces and trim
        normalized = re.sub(r"\s+", " ", normalized).strip()

        return normalized

    def collapse_repeated_chars(self, word: str) -> str:
        """
        Collapses runs of 3 or more identical alphabetic characters down to 2 or 1.
        e.g. 'heyyy' -> 'hey', 'soooo' -> 'so', 'pleaaase' -> 'please'.
        Preserves standard words with double letters (e.g. 'book', 'good', 'cancel').
        """
        if not word or len(word) < 3:
            return word

        # Pattern: any alphabetic character repeated 3 or more times
        # Replace with 1 or 2 characters depending on English orthography
        # For simplicity and robust matching, reducing to 1 or 2:
        return re.sub(r"([a-z])\1{2,}", r"\1", word)

    def tokenize(self, normalized_text: str) -> List[str]:
        """
        Tokenizes normalized text into individual meaningful word tokens.
        Preserves hyphens and underscores in identifiers (e.g. 'ord_12345', 'tick-999').
        """
        if not normalized_text:
            return []

        # Split on whitespace
        raw_tokens = normalized_text.split()
        tokens: List[str] = []

        for token in raw_tokens:
            cleaned = token.strip(" -_")
            if cleaned:
                tokens.append(cleaned)

        return tokens
