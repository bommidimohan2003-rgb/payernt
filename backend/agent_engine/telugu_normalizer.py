"""
Payent Agent Engine — Telugu-English (Tenglish) Normalizer
Handles transliterated Telugu phrases, common code-mixed spelling variations,
and maps colloquial expressions into standardized intent tokens.
"""

import re
from typing import Dict, List, Set, Tuple


class TeluguNormalizer:
    """
    Normalizes Telugu-English ('Tenglish') expressions commonly used in Andhra Pradesh
    and Telangana peer-to-peer equipment rentals.
    Preserves original context while bridging vernacular phrases into canonical intents.
    """

    # Common spelling variations mapped to canonical Tenglish token
    SPELLING_VARIANTS: Dict[str, str] = {
        # Money / Amount
        "dabbulu": "dabulu",
        "dabbul": "dabulu",
        "dabulu": "dabulu",
        "dabul": "dabulu",
        "paise": "dabulu",
        "paisalu": "dabulu",
        "rupayalu": "dabulu",
        # Actions / Verbs
        "cheyali": "cheyali",
        "cheyyali": "cheyali",
        "cheyyandi": "cheyali",
        "cheyandi": "cheyali",
        "cheyyi": "cheyali",
        "chesta": "cheyali",
        "chesanu": "chesanu",
        "chesanuu": "chesanu",
        "chesa": "chesanu",
        # Status / State
        "vachinda": "vachinda",
        "vastundi": "vastundi",
        "ayyinda": "ayyinda",
        "ayinda": "ayyinda",
        "ainda": "ayyinda",
        "ayipoyinda": "ayyinda",
        "aipoyinda": "ayyinda",
        "ayyindi": "ayyindi",
        "ayindi": "ayyindi",
        "aindi": "ayyindi",
        "ayipoyindi": "ayyindi",
        "aipoyindi": "ayyindi",
        "raledu": "raledu",
        "raledhu": "raledu",
        "raaledu": "raledu",
        "ravatledu": "raledu",
        "undi": "undi",
        "undhi": "undi",
        "unnadi": "undi",
        "unnaru": "unnaru",
        "unaru": "unnaru",
        # Question words
        "ekkada": "ekkada",
        "ekada": "ekkada",
        "yekkada": "ekkada",
        "ekda": "ekkada",
        "eppudu": "eppudu",
        "epudu": "eppudu",
        "yeppudu": "eppudu",
        "epdu": "eppudu",
        "enti": "enti",
        "yenti": "enti",
        "yanti": "enti",
        "ela": "ela",
        "yela": "ela",
        # Desires / Modals
        "kavali": "kavali",
        "kavaali": "kavali",
        "kaavali": "kavali",
        "kavalenu": "kavali",
        "vadhu": "vadhu",
        "oddu": "vadhu",
        "vaddu": "vadhu",
        "vaddhu": "vadhu",
        # Communication
        "matladali": "matladali",
        "maatladali": "matladali",
        "matladalani": "matladali",
        "call": "call",
        "phone": "call",
        # Greetings
        "namaste": "namaste",
        "namaskaram": "namaste",
        "namaskar": "namaste",
        "vandanalu": "namaste",
    }

    # Multi-token Tenglish phrase patterns mapped to semantic intent concepts
    # Evaluated before single-word replacement to preserve idiom meaning
    CANONICAL_PHRASE_PATTERNS: List[Tuple[re.Pattern, str]] = [
        # Greetings
        (re.compile(r"\bela\s+unnaru\b", re.IGNORECASE), "how are you greeting"),
        (re.compile(r"\bbagunnara\b", re.IGNORECASE), "how are you greeting"),
        (re.compile(r"\bnamaskaram\b", re.IGNORECASE), "namaste greeting"),
        # Booking Status & Details
        (re.compile(r"\b((na|naa|maa|my)\s+)?booking\s+ek+ada\s+undi\b", re.IGNORECASE), "booking status location"),
        (re.compile(r"\b((na|naa|maa|my)\s+)?booking\s+(status\s+)?enti\b", re.IGNORECASE), "my booking status check"),
        (re.compile(r"\bbooking\s+confirm\s+ayyinda\b", re.IGNORECASE), "booking confirmed status"),
        (re.compile(r"\bbooking\s+details\s+kavali\b", re.IGNORECASE), "booking details request"),
        # Booking Cancellation
        (re.compile(r"\bbooking\s+cancel\s+(cheyali|cheyyandi|cheyandi|kavali)\b", re.IGNORECASE), "booking cancel request"),
        (re.compile(r"\bbooking\s+vadhu\b", re.IGNORECASE), "booking cancel reject"),
        (re.compile(r"\border\s+cancel\s+(cheyali|cheyyandi)\b", re.IGNORECASE), "booking cancel request"),
        # Payment Issues
        (re.compile(r"\b(dabulu|money|amount)\s+(deduct\s+ayyayi|cut\s+ayyindi|poyayi)\b", re.IGNORECASE), "money deducted payment issue"),
        (re.compile(r"\bpayment\s+(fail|failed)\s+ayyindi\b", re.IGNORECASE), "payment failed issue"),
        (re.compile(r"\bpayment\s+success\s+ayyinda\b", re.IGNORECASE), "payment success check"),
        # Refund Status
        (re.compile(r"\b(refund|dabulu|amount|money)\s+(vachinda|vastundi)\b", re.IGNORECASE), "refund status received check"),
        (re.compile(r"\b(refund|dabulu|amount|money)\s+(eppudu\s+vastundi|return\s+eppudu\s+vastundi)\b", re.IGNORECASE), "refund status when return"),
        (re.compile(r"\b((na|naa)\s+money|(na|naa)\s+dabulu|(na|naa)\s+amount)\s+return\s+(cheyyandi|kavali)\b", re.IGNORECASE), "refund request return money"),
        (re.compile(r"\b(amount|refund|money)\s+inka\s+raledu\b", re.IGNORECASE), "refund delayed not received"),
        # KYC Verification
        (re.compile(r"\b((na|naa|maa|my)\s+)?kyc\s+pending(\s+lo\s+undi)?\b", re.IGNORECASE), "kyc status pending check"),
        (re.compile(r"\bkyc\s+reject\s+ayyindi\b", re.IGNORECASE), "kyc rejection issue"),
        (re.compile(r"\bkyc\s+approve\s+ayyinda\b", re.IGNORECASE), "kyc approval check"),
        (re.compile(r"\bdocuments?\s+submit\s+chesanu\b", re.IGNORECASE), "kyc documents submitted status"),
        # Delivery & Tracking
        (re.compile(r"\b(order|delivery)\s+deliver(ed)?\s+ayyinda\b", re.IGNORECASE), "delivery status tracking delivered check"),
        (re.compile(r"\bdelivery\s+ek+ada\s+undi\b", re.IGNORECASE), "delivery status location track"),
        (re.compile(r"\bdelivery\s+boy\s+ek+ada\s+unnadu\b", re.IGNORECASE), "delivery courier location track"),
        (re.compile(r"\b(product|item|gear)\s+inka\s+raledu\b", re.IGNORECASE), "delivery delayed product not arrived"),
        (re.compile(r"\bpickup\s+eppudu\b", re.IGNORECASE), "pickup timing schedule"),
        # Human Support Escalation
        (re.compile(r"\bhuman\s+support\s+kavali\b", re.IGNORECASE), "human support agent talk"),
        (re.compile(r"\b(support\s+agent|customer\s+care|real\s+person)\s+tho\s+matladali\b", re.IGNORECASE), "human agent support talk"),
        (re.compile(r"\bcustomer\s+care\s+kavali\b", re.IGNORECASE), "human support customer care"),
    ]

    # Individual Tenglish words indicating vernacular context
    TELUGU_INDICATOR_WORDS: Set[str] = {
        "na", "naa", "maa", "enti", "yenti", "ekkada", "ekada", "eppudu", "epudu",
        "kavali", "cheyali", "cheyyandi", "cheyyi", "chesanu", "ayyinda",
        "ayyindi", "aindi", "raledu", "undi", "undhi", "unnaru", "unnadu",
        "vachinda", "vastundi",
        "dabulu", "dabbulu", "paisalu", "matladali", "vadhu", "oddu", "inka",
        "namaste", "namaskaram", "bagunnara", "tho", "lo", "kosam"
    }

    # Direct translation of semantic core terms for hybrid parsing
    TELUGU_CORE_TRANSLATION: Dict[str, str] = {
        "dabulu": "money",
        "dabbulu": "money",
        "ekkada": "where",
        "ekada": "where",
        "eppudu": "when",
        "epudu": "when",
        "enti": "what",
        "kavali": "need",
        "raledu": "not_received",
        "vadhu": "cancel",
        "matladali": "talk",
        "chesanu": "submitted",
    }

    def __init__(self):
        pass

    def normalize_tenglish(self, text: str) -> str:
        """
        Applies transliteration standardization and phrase mapping to code-mixed text.
        Returns normalized text where Tenglish idioms are mapped to canonical English/Tenglish tokens.
        """
        if not text:
            return ""

        result = text.strip().lower()

        # 1. Apply multi-word canonical phrase replacements
        for pattern, replacement in self.CANONICAL_PHRASE_PATTERNS:
            result = pattern.sub(replacement, result)

        # 2. Standardize spelling variations word-by-word
        tokens = result.split()
        normalized_tokens: List[str] = []
        for token in tokens:
            cleaned = token.strip(" .,!?:;-_")
            standardized = self.SPELLING_VARIANTS.get(cleaned, cleaned)
            # Map core terms to standard helper tokens
            mapped = self.TELUGU_CORE_TRANSLATION.get(standardized, standardized)
            normalized_tokens.append(mapped)

        return " ".join(normalized_tokens)

    def is_tenglish(self, text: str) -> bool:
        """Determines whether the input contains recognizable Telugu-English markers."""
        if not text:
            return False

        tokens = re.findall(r"\b[a-zA-Z]+\b", text.lower())
        return any(t in self.TELUGU_INDICATOR_WORDS for t in tokens)

    def get_tenglish_indicators(self, text: str) -> List[str]:
        """Returns the list of Telugu indicator words found in the text."""
        if not text:
            return []

        tokens = re.findall(r"\b[a-zA-Z]+\b", text.lower())
        return [t for t in tokens if t in self.TELUGU_INDICATOR_WORDS]
