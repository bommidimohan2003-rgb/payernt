"""
Payent Agent Engine — Entity Extractor
Extracts domain-specific identifiers (Booking IDs, Product IDs, Ticket IDs, Dates)
using robust regular expressions with strict sanitization of sensitive credentials.
"""

import re
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ExtractedEntities:
    """Holds parsed domain entities extracted from the text."""
    booking_ids: List[str] = field(default_factory=list)
    product_ids: List[str] = field(default_factory=list)
    ticket_ids: List[str] = field(default_factory=list)
    dates: List[str] = field(default_factory=list)
    phone_numbers: List[str] = field(default_factory=list)
    has_sensitive_data_detected: bool = False
    sanitized_text: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Converts extracted entities into a clean dictionary representation."""
        result = {}
        if self.booking_ids:
            result["booking_id"] = self.booking_ids[0]
            if len(self.booking_ids) > 1:
                result["all_booking_ids"] = self.booking_ids
        if self.product_ids:
            result["product_id"] = self.product_ids[0]
            if len(self.product_ids) > 1:
                result["all_product_ids"] = self.product_ids
        if self.ticket_ids:
            result["ticket_id"] = self.ticket_ids[0]
            if len(self.ticket_ids) > 1:
                result["all_ticket_ids"] = self.ticket_ids
        if self.dates:
            result["date"] = self.dates[0]
            if len(self.dates) > 1:
                result["all_dates"] = self.dates
        if self.phone_numbers:
            result["phone_number"] = self.phone_numbers[0]
        return result


class EntityExtractor:
    """
    Regex-based entity extractor tailored to Payent domain identifiers.
    Enforces security by redacting credentials and sensitive personal data.
    """

    # Domain ID Patterns discovered in Payent codebase
    BOOKING_ID_PATTERNS = [
        re.compile(r"#?\b(ord[-_][a-zA-Z0-9_-]{3,})\b", re.IGNORECASE),
        re.compile(r"#?\b(order[-_][a-zA-Z0-9_-]{3,})\b", re.IGNORECASE),
        re.compile(r"#?\b(booking[-_][a-zA-Z0-9_-]{3,})\b", re.IGNORECASE),
        # Standard UUID format for bookings
        re.compile(r"\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b"),
    ]

    PRODUCT_ID_PATTERNS = [
        re.compile(r"\b(prod_[a-zA-Z0-9_]{4,})\b", re.IGNORECASE),
        re.compile(r"\b(p_[a-zA-Z0-9_]{4,})\b", re.IGNORECASE),
        re.compile(r"\b(custom_[a-zA-Z0-9_]{4,})\b", re.IGNORECASE),
    ]

    TICKET_ID_PATTERNS = [
        re.compile(r"\b(TICK-\d{5,})\b", re.IGNORECASE),
        re.compile(r"\b(CONV-\d{5,})\b", re.IGNORECASE),
    ]

    DATE_PATTERNS = [
        # YYYY-MM-DD
        re.compile(r"\b(202[4-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b"),
        # DD-MM-YYYY or DD/MM/YYYY
        re.compile(r"\b((?:0[1-9]|[12]\d|3[01])[-/](?:0[1-9]|1[0-2])[-/]202[4-9])\b"),
    ]

    # Phone numbers: standard Indian mobile format (10 digits starting with 6-9, optional +91/0 prefix)
    PHONE_NUMBER_PATTERN = re.compile(r"(?:(?:\+91[\-\s]?|\b0))?([6-9]\d{9})\b")

    # Sensitive personal information patterns to DETECT and REDACT (never extract or return)
    # Order matters: check 16-digit cards first before 12-digit numbers
    SENSITIVE_PATTERNS = [
        # Explicit OTP codes (e.g. "otp is 123456", "my pin is 1234")
        (re.compile(r"\b(?:otp|secret\s+pin|handover\s+pin|password)\s*(?:is|:|=)?\s*([0-9a-zA-Z]{4,8})\b", re.IGNORECASE), "[REDACTED_PIN]"),
        # Payment Card Numbers (16 digits in blocks of 4)
        (re.compile(r"(?<![0-9a-zA-Z\-])\b(?:\d{4}[\s\-]?){3}\d{4}\b(?![0-9a-zA-Z\-])"), "[REDACTED_CARD]"),
        # Indian Aadhaar Number: 12 digits separated by space/hyphen, or isolated 12 digits
        (re.compile(r"(?<![0-9a-zA-Z\-])\b(?:\d{4}[\s\-]\d{4}[\s\-]\d{4}|\d{12})\b(?![0-9a-zA-Z\-])"), "[REDACTED_AADHAAR]"),
        # Indian PAN Number: 5 uppercase letters, 4 numbers, 1 letter
        (re.compile(r"(?<![0-9a-zA-Z\-])\b[A-Z]{5}[0-9]{4}[A-Z]\b(?![0-9a-zA-Z\-])", re.IGNORECASE), "[REDACTED_PAN]"),
    ]

    def extract(self, text: Optional[str]) -> ExtractedEntities:
        """
        Extracts non-sensitive domain entities from input string.
        Safely redacts any credentials before further processing.
        """
        if not text or not isinstance(text, str):
            return ExtractedEntities()

        sanitized = text
        sensitive_detected = False

        # First, detect and extract UUIDs if any to avoid collision with numeric redaction
        pre_extracted_uuids: List[str] = []
        for match in re.finditer(r"\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b", sanitized):
            pre_extracted_uuids.append(match.group(1).strip().lower())

        # Detect and redact sensitive patterns
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            if pattern.search(sanitized):
                sensitive_detected = True
                sanitized = pattern.sub(replacement, sanitized)

        # 1. Booking IDs
        booking_ids: List[str] = []
        for uid in pre_extracted_uuids:
            if uid not in booking_ids:
                booking_ids.append(uid)

        for pattern in self.BOOKING_ID_PATTERNS:
            for match in pattern.finditer(sanitized):
                val = match.group(1).strip().lower()
                if val and val not in booking_ids:
                    booking_ids.append(val)

        # 2. Product IDs
        product_ids: List[str] = []
        for pattern in self.PRODUCT_ID_PATTERNS:
            for match in pattern.finditer(sanitized):
                val = match.group(1).strip()
                if val and val not in product_ids:
                    product_ids.append(val)

        # 3. Ticket IDs
        ticket_ids: List[str] = []
        for pattern in self.TICKET_ID_PATTERNS:
            for match in pattern.finditer(sanitized):
                val = match.group(1).strip()
                if val and val not in ticket_ids:
                    ticket_ids.append(val)

        # 4. Dates
        dates: List[str] = []
        for pattern in self.DATE_PATTERNS:
            for match in pattern.finditer(sanitized):
                val = match.group(1).strip()
                if val and val not in dates:
                    dates.append(val)

        # 5. Phone numbers
        phone_numbers: List[str] = []
        for match in self.PHONE_NUMBER_PATTERN.finditer(sanitized):
            val = match.group(1).strip()
            # Avoid picking up timestamps or date numbers
            if val and val not in phone_numbers:
                phone_numbers.append(val)

        return ExtractedEntities(
            booking_ids=booking_ids,
            product_ids=product_ids,
            ticket_ids=ticket_ids,
            dates=dates,
            phone_numbers=phone_numbers,
            has_sensitive_data_detected=sensitive_detected,
            sanitized_text=sanitized,
        )
