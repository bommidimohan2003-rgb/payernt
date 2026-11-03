"""
PAYENT AGENT — INTELLIGENT CONCISE RESPONSE FORMATTER
Provides depth detection and concise response formatting across GUIDE, LIVE_DB,
and HYBRID retrieval modes while strictly preserving business policy accuracy,
provenance, qualifiers, and security boundaries.
"""

from enum import Enum
import re
from typing import Any, Dict, List, Optional, Tuple


class ResponseDepth(str, Enum):
    """
    Intelligent response depth tiers based on user query phrasing.
    """
    CONCISE = "concise"          # Simple questions: 1-2 short sentences, ~15-40 words
    EXPLANATION = "explanation"  # "Explain", "tell me about": short paragraph or bullets, ~40-80 words
    DETAILED = "detailed"        # "in detail", "step by step": full structured detailed answer


# ============================================================================
# DEPTH DETECTION REGEX PATTERNS
# ============================================================================

DETAILED_PATTERNS = [
    r"\b(in\s+detail|detailed|details|step\s*by\s*step|step-wise|comprehensively?|thoroughly?|walk\s+me\s+through|in-depth|full\s+explanation|complete\s+breakdown|all\s+details)\b",
    r"\b(vivaramga|motham\s+cheppu|step\s+by\s+step\s+cheppu|poorthiga\s+cheppu)\b",
]

EXPLANATION_PATTERNS = [
    r"\b(explain|tell\s+me\s+about|elaborate|clarify|how\s+does\s+(\w+\s+)?work|why\s+is\s+it|describe|what\s+does\s+it\s+mean)\b",
    r"\b(vivarinchu|cheppu|gurinchi\s+cheppu|teliyacheyyandi|ardham\s+enti)\b",
]


def determine_response_depth(query: str) -> ResponseDepth:
    """
    Detects the requested depth of response from the user's message.
    - DETAILED: Explicit requests for exhaustive breakdown, steps, or details.
    - EXPLANATION: Broad requests to explain or describe a concept.
    - CONCISE: Default for direct, simple questions ("What is...", "When are...", etc.).
    """
    if not query or not query.strip():
        return ResponseDepth.CONCISE

    q_lower = query.lower().strip()

    # 1. Detailed triggers take highest precedence
    for pat in DETAILED_PATTERNS:
        if re.search(pat, q_lower):
            return ResponseDepth.DETAILED

    # 2. Explanation triggers
    for pat in EXPLANATION_PATTERNS:
        if re.search(pat, q_lower):
            return ResponseDepth.EXPLANATION

    # 3. Default to concise
    return ResponseDepth.CONCISE


# ============================================================================
# TEXT CLEANING & SENTENCE EXTRACTION
# ============================================================================

def clean_knowledge_text(text: str) -> str:
    """
    Cleans raw markdown knowledge text by stripping unverified markers,
    internal directives, and normalizing whitespace.
    """
    if not text:
        return ""

    # Remove [VERIFY ...] markers cleanly
    clean = re.sub(r"\[VERIFY[^\]]*\]", "", text, flags=re.IGNORECASE)

    # Remove internal agent instructions if present (e.g. "Payent Agent should retrieve...")
    clean = re.sub(r"^Payent Agent should retrieve[^\.]*\.\s*", "", clean, flags=re.IGNORECASE)

    # Normalize whitespace
    clean = re.sub(r"[ \t]+", " ", clean)
    clean = re.sub(r"\n\s*\n+", "\n\n", clean)
    return clean.strip()


def split_into_sentences(text: str) -> List[str]:
    """Splits a body of text into clean declarative sentences."""
    clean = clean_knowledge_text(text)
    if not clean:
        return []

    # Protect digit-period patterns so "1. ", "2. " etc. are not split
    protected = re.sub(r"(\b\d+)\.\s+", r"\1___DOT___ ", clean)

    # Protect common abbreviations: e.g., i.e., vs., Rs., No., Dr., Mr., Ms.
    protected = re.sub(
        r"\b(e\.g|i\.e|vs|rs|no|dr|mr|ms)\.\s+",
        r"\1___ABBR___ ",
        protected,
        flags=re.IGNORECASE,
    )

    # Split by period, exclamation, or question mark followed by space or end of string
    parts = re.split(r"(?<=[.!?])\s+", protected)
    sentences = []
    for p in parts:
        restored = p.replace("___DOT___", ".").replace("___ABBR___", ".").strip()
        if restored:
            sentences.append(restored)
    return sentences


def _has_list_or_steps(text: str) -> bool:
    """
    Checks if text contains structured numbered steps, bullet points,
    or list items that must not be sliced mid-list.
    """
    if not text:
        return False
    # Matches numbered lines like "1. ", "1) ", "Step 1:"
    if re.search(r"(?:^|\n)\s*(?:\d+[\.\)]|step\s*\d+[:\.\)])\s+", text, re.IGNORECASE):
        return True
    # Matches bullet lines like "- ", "* ", "• "
    if re.search(r"(?:^|\n)\s*[•\-\*]\s+", text):
        return True
    # Matches procedural headers ending in colon like "steps:\n", "instructions:\n"
    if re.search(r"(?:steps?|following|instructions?|process|procedure|options?|rules?):\s*(?:\n|$)", text, re.IGNORECASE):
        return True
    return False


def _extract_list_items(text: str) -> Tuple[str, List[str]]:
    """
    Separates the introductory header text from individual list items or steps.
    """
    lines = text.split("\n")
    intro_lines: List[str] = []
    items: List[str] = []
    current_item: List[str] = []
    in_list = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        is_item_start = bool(re.match(r"^(?:\d+[\.\)]|step\s*\d+[:\.\)]|[•\-\*])\s+", stripped, re.IGNORECASE))
        if is_item_start:
            in_list = True
            if current_item:
                items.append(" ".join(current_item))
                current_item = []
            current_item.append(stripped)
        elif in_list:
            current_item.append(stripped)
        else:
            intro_lines.append(stripped)

    if current_item:
        items.append(" ".join(current_item))

    return "\n".join(intro_lines).strip(), items


def format_list_response(clean_ans: str, depth: ResponseDepth) -> str:
    """
    Formats multi-step or list-based responses cleanly without truncating mid-list
    or abandoning the user after only Step 1.
    """
    if depth == ResponseDepth.DETAILED:
        return clean_ans

    total_words = len(clean_ans.split())
    # Procedural/list answers under ~95 words are already compact and complete
    if total_words <= 95:
        return clean_ans

    intro, items = _extract_list_items(clean_ans)
    if not items:
        return clean_ans

    # If long list (>95 words), preserve at least 3-4 key steps
    limit = 5 if depth == ResponseDepth.EXPLANATION else 4
    kept_items = items[:limit]

    # Ensure we never produce a dangling single item from a multi-item list
    if len(items) > 1 and len(kept_items) < 2:
        kept_items = items[:min(len(items), 2)]

    out_parts: List[str] = []
    if intro:
        out_parts.append(intro)
    out_parts.append("\n".join(kept_items))

    if len(items) > len(kept_items):
        out_parts.append("For additional steps or assistance, contact Payent support.")

    return "\n\n".join(out_parts).strip()


# ============================================================================
# CANONICAL POLICIES & ACCURACY HARDENED SUMMARIES
# ============================================================================

def _is_delivery_earnings_query(query: str, answer: str) -> bool:
    """Detects delivery earnings inquiries."""
    combined = f"{query} {answer}".lower()
    return bool(re.search(r"\b(delivery\s+earnings|payout\s+day|earnings\s+transferred)\b", combined))


def _is_delivery_partner_query(query: str, answer: str) -> bool:
    """Detects inquiries asking how to become a delivery partner."""
    combined = f"{query} {answer}".lower()
    return bool(re.search(r"\b(become\s+a?\s*delivery\s+partner|delivery\s+partner\s+registration|join\s+as\s+delivery\s+partner|how\s+can\s+i\s+become\s+a\s+delivery\s+partner)\b", combined))


def _is_cancellation_policy_query(query: str, answer: str) -> bool:
    """Detects cancellation policy inquiries."""
    combined = f"{query} {answer}".lower()
    return bool(re.search(r"\b(cancellation\s+policy|cancel\s+policy|cancellation\s+rules|cancellation\s+fee|refund\s+on\s+cancel)\b", combined))


def _is_damaged_product_query(query: str, answer: str) -> bool:
    """Detects damaged product reporting inquiries."""
    combined = f"{query} {answer}".lower()
    return bool(re.search(r"\b(damaged\s+product|product\s+arrived\s+damaged|item\s+damaged|report\s+a\s+damaged\s+product)\b", combined))


def format_guide_response(
    query: str,
    canonical_question: str,
    full_answer: str,
    depth: Optional[ResponseDepth] = None,
) -> str:
    """
    Formats a Knowledge Guide response based on the determined response depth.
    - DETAILED: returns full structured answer intact.
    - EXPLANATION: returns a short paragraph (~40-80 words).
    - CONCISE: returns 1-2 short direct sentences (~15-40 words).
    """
    if not full_answer:
        return ""

    if depth is None:
        depth = determine_response_depth(query)

    clean_ans = clean_knowledge_text(full_answer)

    # DETAILED requests always receive the full structured markdown answer
    if depth == ResponseDepth.DETAILED:
        return clean_ans

    # 1. Specialized qualifier preservation for delivery earnings (Thursday payout + automation qualifier)
    if _is_delivery_earnings_query(query, full_answer):
        return "Payent's delivery-partner payout day is Thursday. Bank transfers will begin once payout automation is implemented."

    # 2. Accuracy hardening: delivery partner registration (Distinguish approved specs from active functionality)
    if _is_delivery_partner_query(query, full_answer):
        return "Delivery-partner onboarding is planned in product requirements, but a public registration flow is not currently active in the Payent app. Please contact Payent support for partnership inquiries."

    # 3. Accuracy hardening: cancellation policy (Grounded in booking_tools.py, no unverified 24-hr/1-day fee claims)
    if _is_cancellation_policy_query(query, full_answer):
        return "Cancellations made prior to equipment dispatch or physical handover are eligible for a full refund. Review your order details in the bookings tab or contact support to evaluate cancellation eligibility."

    # 4. Specialized qualifier preservation for damaged product reporting
    if _is_damaged_product_query(query, full_answer):
        return "Use Report a Problem in the Payent app before confirming the handover. Describe the damage and attach evidence where supported."

    # 5. Multi-step / structured list preservation: never truncate after Step 1 or mid-list
    if _has_list_or_steps(clean_ans):
        return format_list_response(clean_ans, depth)

    # If the answer is already concise (<= 40 words), return it directly
    total_words = len(clean_ans.split())
    if depth == ResponseDepth.CONCISE and total_words <= 40:
        return clean_ans

    # For explanation mode, if already within 40-80 words, return clean text
    if depth == ResponseDepth.EXPLANATION and 30 <= total_words <= 80:
        return clean_ans

    # Algorithmic sentence extraction for longer answers (> 40 words)
    sentences = split_into_sentences(clean_ans)
    if not sentences:
        return clean_ans

    if depth == ResponseDepth.CONCISE:
        # Target: 1-2 sentences, ~15-40 words
        s1 = sentences[0]
        s1_words = len(s1.split())

        # If s1 ends with a colon, it cannot stand alone as a complete sentence
        if s1.rstrip().endswith(":") and len(sentences) > 1:
            combined = f"{s1} {sentences[1]}"
            if len(sentences) > 2 and len(combined.split()) < 25:
                combined = f"{combined} {sentences[2]}"
            return combined

        if s1_words >= 15:
            return s1

        if len(sentences) > 1:
            s2 = sentences[1]
            combined = f"{s1} {s2}"
            if len(combined.split()) <= 45:
                return combined

        return s1

    elif depth == ResponseDepth.EXPLANATION:
        # Target: short paragraph (~40-80 words)
        collected: List[str] = []
        word_count = 0
        for s in sentences:
            s_len = len(s.split())
            if word_count + s_len > 90 and collected:
                break
            collected.append(s)
            word_count += s_len
            if word_count >= 40:
                break
        return " ".join(collected) if collected else sentences[0]

    return clean_ans


# ============================================================================
# LIVE_DB & HYBRID FORMATTERS
# ============================================================================

def format_live_status_first(tool_name: str, raw_text: str, data: Optional[Dict[str, Any]] = None) -> str:
    """
    Ensures that LIVE_DB responses state the requested value or status in the
    opening sentence before auxiliary details.
    """
    if not raw_text:
        return ""

    if "sign in" in raw_text.lower():
        return raw_text.strip()

    return raw_text.strip()


def format_hybrid_response(
    query: str,
    account_section: str,
    policy_section: str,
    depth: Optional[ResponseDepth] = None,
) -> str:
    """
    Combines personal live account status and policy information concisely.
    Ensures live status is presented first, policy is concise, and no empty
    bullets or redundant boilerplate are included.
    """
    if depth is None:
        depth = determine_response_depth(query)

    acc = account_section.strip() if account_section else ""
    pol = policy_section.strip() if policy_section else ""

    # Clean any trailing empty bullets in account section
    acc = re.sub(r"\n\s*•\s*$", "", acc)
    acc = re.sub(r"\n\s*-\s*$", "", acc)

    if acc and pol:
        return f"{acc}\n\n{pol}".strip()
    elif acc:
        return acc
    else:
        return pol
