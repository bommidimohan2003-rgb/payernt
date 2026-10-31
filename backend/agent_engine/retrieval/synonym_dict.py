"""
PAYENT AGENT — DOMAIN SYNONYM DICTIONARY & VERNACULAR VOCABULARY
Provides structured, category-grouped synonym mappings, regional Telugu-English (Tenglish)
phrase expansions, and negation-preserving canonical term associations for equipment rental IR.
Strictly preserves negation and semantic intent differences (e.g. approve != reject, cancel != confirm).
"""

import re
from typing import Dict, List, Optional, Set, Tuple

# ============================================================================
# 1. CATEGORY-GROUPED DOMAIN SYNONYMS
# ============================================================================

SYNONYM_GROUPS: Dict[str, Dict[str, List[str]]] = {
    # Booking & Reservations
    "BOOKING": {
        "booking": [
            "reservation", "order", "rental", "book", "hire", "rent",
            "renting", "rented", "reservation order", "equipment rental", "gear booking"
        ],
        "extend": [
            "extend rental", "change dates", "reschedule", "prolong", "extension",
            "keep longer", "additional days"
        ],
    },

    # Cancellations (Action)
    "CANCELLATION": {
        "cancel": [
            "cancellation", "abort", "terminate", "withdraw", "drop",
            "cancel booking", "cancel order", "stop rental", "revoke"
        ],
    },

    # Refunds & Reimbursements
    "REFUND": {
        "refund": [
            "reimbursement", "money back", "return money", "reversal",
            "refund amount", "payout return", "payment return"
        ],
        "refund_pending": [
            "refund not received", "refund delay", "refund taking time",
            "pending refund", "where is my refund"
        ],
    },

    # Payments & Deposits
    "PAYMENT": {
        "payment": [
            "transaction", "charges", "fee", "amount", "money", "billing",
            "payment status", "cost", "price", "rental fee", "paid"
        ],
        "payment_failed": [
            "payment failure", "deducted but failed", "money cut but failed",
            "transaction failed", "payment error", "charged but no booking"
        ],
        "security_deposit": [
            "caution deposit", "advance", "guarantee deposit", "deposit amount",
            "refundable deposit", "zero deposit", "security advance"
        ],
    },

    # Delivery & Logistics
    "DELIVERY": {
        "delivery": [
            "shipping", "dispatch", "courier", "rider", "courier boy",
            "delivery boy", "delivery partner", "delivery person", "pickup",
            "handover", "tracking", "courier tracking", "logistics"
        ],
        "delivery_delayed": [
            "delivery late", "partner not arrived", "courier delay",
            "item not arrived", "delayed shipment"
        ],
    },

    # Equipment & Products
    "EQUIPMENT": {
        "equipment": [
            "item", "product", "gear", "gadget", "device", "kit",
            "camera", "lens", "drone", "bike", "vehicle", "cinematography gear",
            "audio gear", "gimbal", "sound system", "lights"
        ],
        "availability": [
            "in stock", "available dates", "calendar availability", "check dates",
            "is it available", "rent dates"
        ],
    },

    # KYC Verification
    "KYC": {
        "kyc": [
            "identity verification", "id verification", "document verification",
            "aadhaar verification", "pan verification", "id proof", "documents",
            "government id", "profile verification"
        ],
        "kyc_rejected": [
            "kyc rejection", "verification failed", "document rejected",
            "kyc declined", "resubmit kyc", "kyc disapproval"
        ],
        "kyc_pending": [
            "kyc in review", "verification pending", "kyc waiting",
            "document under review"
        ],
    },

    # Damage Protection & Insurance
    "DAMAGE_INSURANCE": {
        "damage_protection": [
            "insurance", "damage coverage", "repair cover", "damage policy",
            "5 lakhs coverage", "equipment protection", "accident coverage",
            "wear and tear", "theft protection"
        ],
    },

    # Human Support & Escalation
    "SUPPORT": {
        "human_support": [
            "customer care", "customer support", "live agent", "real person",
            "support representative", "support executive", "helpdesk",
            "support specialist", "talk to human", "call support", "speak to someone"
        ],
        "ticket": [
            "support ticket", "complaint ticket", "service request",
            "case number", "help ticket", "ticket status"
        ],
    },

    # Disputes & Issues
    "DISPUTE": {
        "damaged_product": [
            "broken item", "item arrived damaged", "defective gear",
            "cracked lens", "equipment issue", "not working"
        ],
        "wrong_product": [
            "different item received", "wrong gear delivered", "incorrect product",
            "mismatched equipment"
        ],
        "missing_accessory": [
            "missing charger", "parts not included", "missing cable",
            "battery missing", "accessories missing"
        ],
    },

    # Authentication & Account
    "ACCOUNT": {
        "account": [
            "profile", "login", "sign in", "credentials", "account settings",
            "profile settings", "user details"
        ],
        "password_reset": [
            "forgot password", "reset password", "change password",
            "password recovery", "update password"
        ],
    },
}

# ============================================================================
# 2. VERNACULAR (TELUGU-ENGLISH) SYNONYM MAPPINGS
# Maps regional colloquial Tenglish phrases directly to canonical concepts
# ============================================================================

TENGLISH_CONCEPT_MAP: List[Tuple[re.Pattern, str]] = [
    # Money & Refund
    (re.compile(r"\b(dabbulu|dabulu|paisalu|rupayalu)\s+(return|refund|vastundi|vastayi)\b", re.IGNORECASE), "refund money return"),
    (re.compile(r"\b(na\s+)?(dabbulu|dabulu|money|amount)\s+(cut\s+ayyindi|deduct\s+ayyayi|poyayi)\b", re.IGNORECASE), "money deducted payment failed"),
    (re.compile(r"\b(advance|security)\s+(dabulu|dabbulu|amount)\b", re.IGNORECASE), "security deposit amount"),
    
    # Booking & Cancellation
    (re.compile(r"\b(na\s+)?booking\s+(status\s+)?(enti|ek+ada\s+undi)\b", re.IGNORECASE), "my booking status check"),
    (re.compile(r"\bbooking\s+confirm\s+ayyinda\b", re.IGNORECASE), "booking confirmed status"),
    (re.compile(r"\b(booking|order)\s+(cancel\s+)?(cheyali|cheyyandi|cheyyi|vaddu|vadhu|oddu)\b", re.IGNORECASE), "cancel booking cancellation"),
    (re.compile(r"\b(nenu\s+)?enni\s+(rentals|bookings)\s+(teesukunnanu|chesanu)\b", re.IGNORECASE), "how many bookings rental history"),
    
    # KYC
    (re.compile(r"\b(na\s+)?kyc\s+(approve|confirm)\s+ayyinda\b", re.IGNORECASE), "kyc status approved"),
    (re.compile(r"\bkyc\s+(reject|fail)\s+ayyindi\b", re.IGNORECASE), "kyc rejected resubmit"),
    (re.compile(r"\bkyc\s+pending(\s+lo\s+undi)?\b", re.IGNORECASE), "kyc pending status"),
    (re.compile(r"\bdocuments?\s+(submit\s+chesanu|upload\s+chesa)\b", re.IGNORECASE), "kyc documents submitted"),
    
    # Delivery
    (re.compile(r"\b(delivery\s+boy|courier\s+partner|rider)\s+ek+ada\s+(unnadu|undi)\b", re.IGNORECASE), "delivery tracking courier location"),
    (re.compile(r"\b(product|item|gear|order)\s+inka\s+raledu\b", re.IGNORECASE), "delivery delayed product not arrived"),
    (re.compile(r"\bpickup\s+eppudu\s+(untundi|vastaru)\b", re.IGNORECASE), "pickup timing schedule"),
    
    # Support
    (re.compile(r"\b(support\s+agent|customer\s+care|real\s+person)\s+tho\s+matladali\b", re.IGNORECASE), "human support agent talk"),
    (re.compile(r"\b(human\s+support|customer\s+care)\s+kavali\b", re.IGNORECASE), "human support live agent"),
    
    # Damage & Issues
    (re.compile(r"\b(product|item|gear)\s+(damage|break|padu)\s+ayyindi\b", re.IGNORECASE), "product arrived damaged issue"),
]

# ============================================================================
# 3. NEGATION & POLARITY PRESERVATION
# Ensures antonyms or negated intents are never collapsed into opposite concepts
# ============================================================================

NEGATION_TOKENS: Set[str] = {
    "not", "no", "never", "cannot", "cant", "wont", "dont",
    "raledu", "vaddu", "vadhu", "oddu", "failed", "rejected",
    "delayed", "missing", "broken", "damaged", "wrong"
}

POLAR_DISTINCTIONS: Dict[str, Set[str]] = {
    "approved": {"rejected", "declined", "failed", "pending"},
    "rejected": {"approved", "confirmed", "verified", "passed"},
    "cancel": {"confirm", "complete", "book", "keep"},
    "confirm": {"cancel", "reject", "abort"},
    "received": {"raledu", "delayed", "missing", "not_received"},
    "success": {"failed", "rejected", "error"},
    "failed": {"success", "confirmed", "completed"},
}


class SynonymRegistry:
    """
    Registry providing high-precision synonym lookup, Tenglish idiom translation,
    and semantic polarity preservation for equipment rental information retrieval.
    """

    def __init__(self):
        # Inverted index: synonym_term -> set of canonical terms
        self._term_to_canonicals: Dict[str, Set[str]] = {}
        self._canonical_to_synonyms: Dict[str, Set[str]] = {}

        for category, mappings in SYNONYM_GROUPS.items():
            for canonical, syns in mappings.items():
                if canonical not in self._canonical_to_synonyms:
                    self._canonical_to_synonyms[canonical] = set()
                
                # Register self
                self._canonical_to_synonyms[canonical].add(canonical)
                if canonical not in self._term_to_canonicals:
                    self._term_to_canonicals[canonical] = set()
                self._term_to_canonicals[canonical].add(canonical)

                for syn in syns:
                    clean_syn = syn.lower().strip()
                    self._canonical_to_synonyms[canonical].add(clean_syn)
                    if clean_syn not in self._term_to_canonicals:
                        self._term_to_canonicals[clean_syn] = set()
                    self._term_to_canonicals[clean_syn].add(canonical)

    def get_synonyms(self, term: str) -> List[str]:
        """
        Returns synonyms for a term, prioritizing direct canonical concepts
        and single-word equivalents before multi-word phrases.
        """
        clean = term.lower().strip()
        canonicals = self._term_to_canonicals.get(clean, set())
        if not canonicals:
            return []

        results: List[str] = []

        # 1. Prioritize canonical concept first
        for c in sorted(list(canonicals)):
            if c != clean and c not in results:
                results.append(c)

        # 2. Add single-word synonyms
        for c in canonicals:
            syn_set = self._canonical_to_synonyms.get(c, set())
            single_words = [s for s in syn_set if " " not in s and s != clean]
            for sw in sorted(single_words):
                if sw not in results:
                    results.append(sw)

        # 3. Add multi-word phrases
        for c in canonicals:
            syn_set = self._canonical_to_synonyms.get(c, set())
            multi_words = [s for s in syn_set if " " in s and s != clean]
            for mw in sorted(multi_words):
                if mw not in results:
                    results.append(mw)

        return results

    def get_canonical(self, term: str) -> Optional[str]:
        """Returns the primary canonical concept for a term, if mapped."""
        clean = term.lower().strip()
        canonicals = self._term_to_canonicals.get(clean)
        if canonicals:
            return sorted(list(canonicals))[0]
        return None

    def expand_query(self, query: str, max_expansions_per_term: int = 1) -> str:
        """
        Safely expands query with category synonyms and Tenglish translations
        while strictly preserving negation and polar distinctions.
        """
        if not query:
            return ""

        result = query.strip()

        # 1. Apply multi-word vernacular idiom patterns first
        for pat, replacement in TENGLISH_CONCEPT_MAP:
            if pat.search(result):
                result = pat.sub(rf"\g<0> {replacement}", result)

        tokens = result.split()
        is_negated = any(t.lower() in NEGATION_TOKENS for t in tokens)

        additions: List[str] = []
        for token in tokens:
            t_clean = token.lower().strip(" .,!?:;-_()\"'")
            if not t_clean or len(t_clean) < 3:
                continue

            syns = self.get_synonyms(t_clean)
            if not syns:
                continue

            filtered_syns = []
            for s in syns:
                # Polarity check: do not add opposite polar words
                polar_opps = POLAR_DISTINCTIONS.get(t_clean, set())
                if s in polar_opps:
                    continue
                # If query is negated, do not add affirmative-only words
                if is_negated and s in ("approved", "success", "confirmed"):
                    continue
                filtered_syns.append(s)

            additions.extend(filtered_syns[:max_expansions_per_term])

        if additions:
            result = f"{result} {' '.join(additions)}"

        return result

    def are_polar_opposites(self, term1: str, term2: str) -> bool:
        """Checks whether two terms represent conflicting polar states (e.g. approved vs rejected)."""
        t1, t2 = term1.lower().strip(), term2.lower().strip()
        if t2 in POLAR_DISTINCTIONS.get(t1, set()):
            return True
        if t1 in POLAR_DISTINCTIONS.get(t2, set()):
            return True
        return False


# Singleton registry instance
default_synonym_registry = SynonymRegistry()
