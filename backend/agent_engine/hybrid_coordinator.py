
"""
PAYENT AGENT — HYBRID QUERY COORDINATOR
Coordinates between:
- Phase 8.2 Pure-Python TF-IDF Knowledge Retrieval Engine
- Phase 8.3 KnowledgeManager & KnowledgeIndexManager
- Allowlisted live database tools (booking, payment, refund, kyc, delivery, product, support)
- Deterministic Intent Classifier & Telugu-English Normalizer
- Conversation Context & Follow-ups
- Human Support Escalation Workflow

Determines query classification:
1. GUIDE — Static verified marketplace rules, policies, and FAQs
2. LIVE_DB — Authenticated customer account, booking, payment, delivery, or KYC facts
3. HYBRID — Coordinated synthesis of personal account facts with verified policy guidance
4. CLARIFICATION — Disambiguation of competing concepts or selection among multiple bookings
5. ESCALATION — Support ticket proposal or creation workflow
"""

import logging
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from agent_engine.context import AgentSessionContext
from agent_engine.escalation import (
    create_support_ticket,
    get_support_ticket_detail,
    get_user_support_tickets,
    propose_human_escalation,
)
from agent_engine.intent_classifier import ClassificationResult, IntentClassifier
from agent_engine.response_templates import TEMPLATES, get_response_template
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
)
from agent_engine.retrieval.tfidf_engine import (
    AgentKnowledgeRetriever,
    RetrievalResult,
)
from agent_engine.tools.booking_tools import (
    check_cancellation_eligibility_tool,
    get_booking_details_tool,
    get_user_bookings_tool,
)
from agent_engine.tools.delivery_tools import get_delivery_status_tool
from agent_engine.tools.kyc_tools import get_kyc_status_tool
from agent_engine.tools.payment_tools import (
    get_payment_status_tool,
    get_refund_status_tool,
)
from agent_engine.tools.product_tools import get_public_product_info_tool

logger = logging.getLogger("payent.agent.hybrid_coordinator")


class QueryType(str, Enum):
    GUIDE = "GUIDE"
    LIVE_DB = "LIVE_DB"
    HYBRID = "HYBRID"
    CLARIFICATION = "CLARIFICATION"
    ESCALATION = "ESCALATION"


class HybridQueryCoordinator:
    """
    Deterministic coordinator uniting the Phase 8 retrieval engine with live database tools.
    Decides whether a query requires GUIDE, LIVE_DB, HYBRID, CLARIFICATION, or ESCALATION,
    and returns a unified, structured response.
    """

    def __init__(
        self,
        classifier: Optional[IntentClassifier] = None,
        index_manager: Optional[KnowledgeIndexManager] = None,
        knowledge_manager: Optional[KnowledgeManager] = None,
    ):
        self.classifier = classifier or IntentClassifier()
        self.index_manager = index_manager or KnowledgeIndexManager.get_instance()
        self.knowledge_manager = knowledge_manager or KnowledgeManager()

    # =========================================================================
    # QUERY CLASSIFICATION & INTENT DECOMPOSITION
    # =========================================================================

    def _has_personal_intent(self, text: str, intent: str) -> bool:
        """Determines if the query seeks personal account or order-specific data."""
        text_lower = text.lower()

        # If it is explicitly a general policy or FAQ query without personal possessives, it's not personal
        if any(p in text_lower for p in ("policy", "policies", "rules", "guidelines", "procedure", "how does", "how do i")):
            personal_possessives = ("my", "mine", "naa", "na", "nenu", "ma", "maa")
            if not any(re.search(rf"\b{p}\b", text_lower) for p in personal_possessives):
                return False

        # 1. Direct live intents
        live_intents = {
            "BOOKING_STATUS", "BOOKING_DETAILS", "PAYMENT_STATUS",
            "PAYMENT_FAILED", "REFUND_STATUS", "KYC_STATUS",
            "KYC_REJECTION", "DELIVERY_STATUS", "DELIVERY_ISSUE",
            "SUPPORT_STATUS", "RENTAL_HISTORY"
        }
        if intent in live_intents:
            return True

        # 2. Rental count query
        if self._is_rental_count_query(text):
            return True

        # 3. Personal indicator patterns (English and Telugu-English)
        personal_patterns = [
            r"\b(my|mine|i|me|naa|na|nenu|ma|maa)\s+(booking|bookings|order|orders|rentals?|payment|payments|refund|refunds|kyc|delivery|account|tickets?)\b",
            r"\b(where is my|show my|check my|track my|cancel my|all my)\b",
            r"\b(naa\s+booking|na\s+booking|naa\s+kyc|na\s+kyc|naa\s+payment|naa\s+delivery|naa\s+refund)\b",
            r"\b(naa\s+bookings\s+chupinchu|nenu\s+enni\s+rentals)\b",
            r"\b(my\s+bookings|my\s+orders|show\s+bookings)\b",
        ]
        text_lower = text.lower()
        return any(re.search(pat, text_lower) for pat in personal_patterns)

    def _has_policy_intent(self, text: str, intent: str) -> bool:
        """Determines if the query seeks general policy, instructions, or definitions."""
        guide_intents = {
            "FAQ_QUERY", "HOW_IT_WORKS", "CANCELLATION_POLICY",
            "SECURITY_DEPOSIT", "DAMAGE_PROTECTION", "KYC_INFO",
            "PAYMENT_OPTIONS", "PIN_SAFETY"
        }
        if intent in guide_intents:
            return True

        text_lower = text.lower()

        # Explicit policy and guidelines keywords
        if any(w in text_lower for w in ("policy", "policies", "rules", "rule", "terms", "guideline", "guidelines", "procedure")):
            return True

        # Telugu-English policy markers
        if any(w in text_lower for w in ("kuda cheppu", "kuda cheppandi", "ante enti", "ela cheyali")):
            return True

        # Advice/guidance phrases
        if any(w in text_lower for w in ("what should i do", "what if", "can i cancel", "how do i return", "how to return")):
            return True

        # General definitions "what is X" ONLY if not asking for personal status or records
        if re.search(r"\bwhat\s+is\s+(?!(the\s+)?([a-z]+\s+)?status\b|my\b|naa\b|na\b)", text_lower):
            return True

        # How to / how does
        if re.search(r"\b(how\s+to|how\s+does|how\s+do\s+i\s+(?!check\s+my|view\s+my|see\s+my|track\s+my))\b", text_lower):
            return True

        return False

    def _is_rental_count_query(self, text: str) -> bool:
        """Detects inquiries asking for rental count/history summary."""
        patterns = [
            r"\bhow\s+many\s+(rentals?|bookings?)\b",
            r"\bhow\s+many\s+rentals\s+(have\s+i|completed|taken)\b",
            r"\bnenu\s+enni\s+rentals\b",
            r"\benni\s+bookings\b",
            r"\brental\s+history\s+count\b",
        ]
        text_lower = text.lower()
        return any(re.search(p, text_lower) for p in patterns)

    def determine_query_type(
        self,
        message: str,
        intent: str,
        kb_match: Optional[RetrievalResult] = None,
    ) -> QueryType:
        """Determines the overarching query mode: ESCALATION, HYBRID, LIVE_DB, GUIDE, or CLARIFICATION."""
        # 1. Escalation check
        if intent in ("HUMAN_SUPPORT", "COMPLAINT"):
            return QueryType.ESCALATION

        # 2. Rental count check
        if self._is_rental_count_query(message):
            return QueryType.LIVE_DB

        has_live = self._has_personal_intent(message, intent)
        has_policy = self._has_policy_intent(message, intent)

        # 3. Hybrid detection: both live and policy indicators present
        if has_live and has_policy:
            return QueryType.HYBRID

        # 4. Pure Policy / Guide
        if has_policy and not has_live:
            return QueryType.GUIDE

        # 5. Knowledge base hybrid typing: KB document explicitly flagged as 'hybrid'
        if kb_match and kb_match.retrieval_type == "hybrid" and kb_match.retrieval_confidence in ("HIGH", "MEDIUM"):
            return QueryType.HYBRID

        # 6. Pure Live DB
        if has_live or intent in ("BOOKING_STATUS", "BOOKING_DETAILS", "BOOKING_CANCELLATION", "PAYMENT_STATUS", "REFUND_STATUS", "KYC_STATUS", "DELIVERY_STATUS", "SUPPORT_STATUS"):
            return QueryType.LIVE_DB

        # 7. Default Guide
        return QueryType.GUIDE

    # =========================================================================
    # COORDINATION PIPELINE
    # =========================================================================

    def coordinate_query(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for processing a conversational turn through the hybrid pipeline.
        """
        clean_msg = message.strip()

        # 1. Frontline Classification & Entity Extraction
        classification: ClassificationResult = self.classifier.classify(clean_msg)
        intent = classification.intent
        entities = classification.entities

        if isinstance(entities, dict):
            booking_id = entities.get("booking_id") or (entities.get("booking_ids", [None])[0] if entities.get("booking_ids") else None)
            product_id = entities.get("product_id") or (entities.get("product_ids", [None])[0] if entities.get("product_ids") else None)
            ticket_id = entities.get("ticket_id") or (entities.get("ticket_ids", [None])[0] if entities.get("ticket_ids") else None)
            entities_dict = entities
        else:
            b_ids = getattr(entities, "booking_ids", [])
            p_ids = getattr(entities, "product_ids", [])
            t_ids = getattr(entities, "ticket_ids", [])
            booking_id = b_ids[0] if b_ids else None
            product_id = p_ids[0] if p_ids else None
            ticket_id = t_ids[0] if t_ids else None
            entities_dict = entities.to_dict() if hasattr(entities, "to_dict") else {}

        # Multi-turn conversation context resolution
        history_messages: List[Dict[str, Any]] = []
        if conversation_id:
            try:
                from agent_engine.persistence import get_conversation_messages
                history_messages = get_conversation_messages(conversation_id, context, limit=10)
            except Exception as e:
                logger.debug(f"Could not load conversation history: {e}")
                history_messages = []

        last_agent_msg = None
        for m in reversed(history_messages):
            if m.get("sender_type") == "agent":
                last_agent_msg = m
                break

        # A. Resolve ordinal reference ("second one", "first one", "3rd booking", etc.)
        ordinal_match = re.search(r"\b(first|second|third|fourth|1st|2nd|3rd|4th|last)\s*(one|booking|order|rental)?\b", clean_msg.lower())
        if ordinal_match and not booking_id and last_agent_msg:
            prev_tool_res = last_agent_msg.get("tool_result") or {}
            if isinstance(prev_tool_res, str):
                try:
                    import json
                    prev_tool_res = json.loads(prev_tool_res)
                except Exception:
                    prev_tool_res = {}
            candidate_ids = []
            if isinstance(prev_tool_res, dict) and "bookings" in prev_tool_res:
                for b in prev_tool_res["bookings"]:
                    bid = b.get("booking_id") or b.get("id")
                    if bid:
                        candidate_ids.append(bid)
            if not candidate_ids and last_agent_msg.get("content"):
                candidate_ids = re.findall(r"#?(ord[-_][a-zA-Z0-9_-]+|booking[-_][a-zA-Z0-9_-]+)", last_agent_msg["content"], re.IGNORECASE)

            ord_word = ordinal_match.group(1).lower()
            chosen_id = None
            if ord_word in ("first", "1st") and len(candidate_ids) >= 1:
                chosen_id = candidate_ids[0]
            elif ord_word in ("second", "2nd") and len(candidate_ids) >= 2:
                chosen_id = candidate_ids[1]
            elif ord_word in ("third", "3rd") and len(candidate_ids) >= 3:
                chosen_id = candidate_ids[2]
            elif ord_word in ("fourth", "4th") and len(candidate_ids) >= 4:
                chosen_id = candidate_ids[3]
            elif ord_word == "last" and candidate_ids:
                chosen_id = candidate_ids[-1]

            if chosen_id:
                booking_id = chosen_id
                entities_dict["booking_id"] = chosen_id
                intent = "BOOKING_DETAILS"
                classification.intent = "BOOKING_DETAILS"
                classification.confidence = 0.95

        # B. Resolve pending Order ID follow-up (e.g. user provided order ID after "Where is my order?")
        if booking_id and last_agent_msg:
            prev_content = (last_agent_msg.get("content") or "").lower()
            if "transit status" in prev_content or "track" in prev_content or "delivery" in prev_content:
                if intent in ("UNKNOWN_INTENT", "GENERAL_HELP"):
                    intent = "DELIVERY_STATUS"
            elif "which booking would you like to cancel" in prev_content:
                if intent in ("UNKNOWN_INTENT", "GENERAL_HELP"):
                    intent = "BOOKING_CANCELLATION"
            elif "would you like details on a specific order" in prev_content:
                if intent in ("UNKNOWN_INTENT", "GENERAL_HELP"):
                    intent = "BOOKING_DETAILS"

        # C. Resolve pending escalation confirmation follow-up
        is_simple_affirmation = clean_msg.lower().strip(" .!?,") in (
            "yes", "yes please", "sure", "proceed", "confirm", "ok", "please connect me", "yep", "ha", "avunu"
        )
        if last_agent_msg and is_simple_affirmation:
            prev_tool = (last_agent_msg.get("tool_result") or {})
            if isinstance(prev_tool, str):
                try:
                    import json
                    prev_tool = json.loads(prev_tool)
                except Exception:
                    prev_tool = {}
            prev_action = prev_tool.get("action") if isinstance(prev_tool, dict) else None
            prev_text = (last_agent_msg.get("content") or "").lower()
            if prev_action == "propose_escalation" or "support ticket" in prev_text or "support specialist" in prev_text:
                intent = "HUMAN_SUPPORT"
                classification.intent = "HUMAN_SUPPORT"
                classification.confidence = 0.99

        # 2. Knowledge Retrieval (Phase 8.2 / 8.3)
        retriever: AgentKnowledgeRetriever = self.index_manager.get_retriever()
        kb_results: List[RetrievalResult] = []
        try:
            kb_results = retriever.retrieve(clean_msg, top_k=3)
        except Exception as e:
            logger.warning(f"Notice during knowledge retrieval: {e}")

        top_kb: Optional[RetrievalResult] = kb_results[0] if kb_results else None

        # Disambiguation / Ambiguity Handling
        if (
            top_kb
            and top_kb.is_ambiguous
            and top_kb.retrieval_confidence in ("HIGH", "MEDIUM")
        ):
            alt_q = top_kb.competing_candidates[0]["question"] if top_kb.competing_candidates else ""
            response_text = (
                f"I found a few topics related to your question:\n"
                f"1. **{top_kb.question}**\n"
                f"2. **{alt_q}**\n\n"
                f"Which one would you like assistance with?"
            )
            chips = [top_kb.question]
            if alt_q:
                chips.append(alt_q)
            chips.append("Contact Support")
            return {
                "intent": intent,
                "confidence": classification.confidence,
                "is_ambiguous": True,
                "requires_auth": False,
                "tool_called": "clarification",
                "tool_result": {"ambiguous_candidates": [top_kb.question, alt_q]},
                "response_text": response_text,
                "suggestions": chips,
                "entities": entities_dict,
                "session_id": context.session_id,
                "conversation_id": conversation_id,
                "authenticated": context.is_authenticated,
                "query_type": QueryType.CLARIFICATION.value,
            }

        # 3. Determine Execution Mode
        query_type = self.determine_query_type(clean_msg, intent, top_kb)

        # 4. Route by Execution Mode
        if query_type == QueryType.ESCALATION:
            return self._handle_escalation(clean_msg, context, conversation_id, intent, booking_id, entities_dict, classification)

        elif query_type == QueryType.HYBRID:
            return self._handle_hybrid(clean_msg, context, conversation_id, intent, booking_id, entities_dict, classification, top_kb)

        elif query_type == QueryType.LIVE_DB:
            return self._handle_live_db(clean_msg, context, conversation_id, intent, booking_id, product_id, ticket_id, entities_dict, classification)

        else:  # QueryType.GUIDE
            return self._handle_guide(clean_msg, context, conversation_id, intent, entities_dict, classification, top_kb)

    # =========================================================================
    # GUIDE RETRIEVAL HANDLER
    # =========================================================================

    def _handle_guide(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str],
        intent: str,
        entities_dict: Dict[str, Any],
        classification: ClassificationResult,
        top_kb: Optional[RetrievalResult],
    ) -> Dict[str, Any]:
        """Handles static guide, FAQ, policy, and greeting questions."""
        # Check if Knowledge Retrieval provides a high or medium confidence match
        if top_kb and top_kb.retrieval_confidence in ("HIGH", "MEDIUM") and top_kb.is_verified:
            # Guard against unresolved verify markers
            if "[VERIFY" not in top_kb.answer.upper():
                suggestions = self._get_suggestions_for_category(top_kb.category)
                return {
                    "intent": intent,
                    "confidence": max(classification.confidence, top_kb.similarity_score),
                    "is_ambiguous": False,
                    "requires_auth": False,
                    "tool_called": "knowledge_retrieval",
                    "tool_result": {
                        "success": True,
                        "knowledge_id": top_kb.knowledge_id,
                        "score": round(top_kb.similarity_score, 4),
                        "category": top_kb.category,
                        "retrieval_type": top_kb.retrieval_type,
                    },
                    "response_text": top_kb.answer,
                    "suggestions": suggestions,
                    "entities": entities_dict,
                    "session_id": context.session_id,
                    "conversation_id": conversation_id,
                    "authenticated": context.is_authenticated,
                    "query_type": QueryType.GUIDE.value,
                }

        # Fallback to existing deterministic response templates (e.g. Greetings, Help)
        tpl_key = classification.response_template_key
        tpl = TEMPLATES.get(tpl_key) or TEMPLATES.get(intent.lower()) or get_response_template(tpl_key)
        if tpl:
            response_text = tpl.message
            suggestions = list(tpl.suggested_chips)
        else:
            response_text = (
                "I am Payent Agent, your assistant for equipment rental bookings, payments, KYC, and delivery. "
                "How can I assist you today?"
            )
            suggestions = ["My Bookings", "KYC Status", "Cancellation Policy", "Help Center"]

        return {
            "intent": intent,
            "confidence": classification.confidence,
            "is_ambiguous": classification.is_ambiguous,
            "requires_auth": False,
            "tool_called": None,
            "tool_result": None,
            "response_text": response_text,
            "suggestions": suggestions,
            "entities": entities_dict,
            "session_id": context.session_id,
            "conversation_id": conversation_id,
            "authenticated": context.is_authenticated,
            "query_type": QueryType.GUIDE.value,
        }

    # =========================================================================
    # LIVE DATABASE HANDLER
    # =========================================================================

    def _handle_live_db(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str],
        intent: str,
        booking_id: Optional[str],
        product_id: Optional[str],
        ticket_id: Optional[str],
        entities_dict: Dict[str, Any],
        classification: ClassificationResult,
    ) -> Dict[str, Any]:
        """Handles live authenticated queries against verified database tools."""
        tool_called: Optional[str] = None
        tool_result: Optional[Dict[str, Any]] = None
        response_text: str = ""
        suggestions: List[str] = []
        requires_auth: bool = False

        # 0. Rental count calculation (Q: How many rentals have I taken?)
        if self._is_rental_count_query(message):
            tool_called = "rental_count"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "To view your rental count and booking history, please sign in to your Payent account."
                suggestions = ["Sign In", "Browse Equipment", "Help Center"]
                tool_result = {"success": False, "requires_auth": True}
            else:
                b_res = get_user_bookings_tool(context, limit=100)
                if b_res.get("success"):
                    bookings = b_res.get("bookings", [])
                    total_count = len(bookings)
                    completed = sum(1 for b in bookings if str(b.get("status", "")).lower() == "completed")
                    active = sum(1 for b in bookings if str(b.get("status", "")).lower() in ("active", "in_progress", "confirmed"))
                    cancelled = sum(1 for b in bookings if str(b.get("status", "")).lower() in ("cancelled", "rejected"))
                    response_text = (
                        f"Here is your Payent rental summary:\n"
                        f"• Total Bookings: **{total_count}**\n"
                        f"• Completed Rentals: **{completed}**\n"
                        f"• Active / Confirmed: **{active}**\n"
                        f"• Cancelled Bookings: **{cancelled}**"
                    )
                    suggestions = ["My Bookings", "Browse Equipment", "Help Center"]
                    tool_result = {
                        "success": True,
                        "total": total_count,
                        "completed": completed,
                        "active": active,
                        "cancelled": cancelled,
                    }
                else:
                    response_text = b_res.get("error", "Error loading your rental records.")
                    suggestions = ["Try Again", "Contact Support"]
                    tool_result = b_res

            return self._build_turn_result(
                intent, classification.confidence, requires_auth, tool_called,
                tool_result, response_text, suggestions, entities_dict, context, conversation_id, QueryType.LIVE_DB
            )

        # 1. BOOKING CANCELLATION
        if intent == "BOOKING_CANCELLATION" or ("cancel" in message.lower() and any(w in message.lower() for w in ("booking", "bookings", "order", "rental"))):
            tool_called = "cancellation_check"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "Please sign in to check cancellation options for your booking."
                suggestions = ["Sign In", "Cancellation Policy"]
                tool_result = {"success": False, "requires_auth": True}
            elif booking_id:
                tool_result = check_cancellation_eligibility_tool(context, booking_id)
                if tool_result.get("success"):
                    if tool_result.get("eligible"):
                        tot = tool_result.get("total_amount", 0.0)
                        response_text = (
                            f"Booking #{booking_id} qualifies for cancellation.\n"
                            f"• Total Refundable: ₹{tot:,.2f}\n"
                            f"• Policy: {tool_result.get('policy_summary')}\n\n"
                            f"{tool_result.get('confirmation_prompt')}"
                        )
                        suggestions = [f"Confirm Cancel #{booking_id}", "Keep Booking", "Rental Support"]
                    else:
                        response_text = (
                            f"Booking #{booking_id} cannot be cancelled at this stage: {tool_result.get('reason')}\n"
                            f"• Note: {tool_result.get('policy_summary')}"
                        )
                        suggestions = ["Rental Support", "Dispute Order", "Return Gear"]
                else:
                    response_text = tool_result.get("error", f"Could not verify booking #{booking_id}.")
                    suggestions = ["My Bookings", "Support"]
            else:
                b_res = get_user_bookings_tool(context, limit=3)
                bookings = b_res.get("bookings") or []
                if len(bookings) == 1:
                    bid = bookings[0].get("booking_id")
                    tool_result = check_cancellation_eligibility_tool(context, bid)
                    tot = tool_result.get("total_amount", 0.0)
                    response_text = (
                        f"Your active booking is **#{bid}** ({bookings[0].get('product_title')}).\n"
                        f"• Refundable Amount: ₹{tot:,.2f}\n"
                        f"• Policy: {tool_result.get('policy_summary')}\n\n"
                        f"Would you like to cancel this booking?"
                    )
                    suggestions = [f"Confirm Cancel #{bid}", "Keep Booking", "Rental Support"]
                elif len(bookings) > 1:
                    b_opts = "\n".join([f"• **#{b.get('booking_id')}** ({b.get('product_title')})" for b in bookings[:3]])
                    response_text = (
                        f"Which booking would you like to cancel? Please specify the booking ID:\n{b_opts}"
                    )
                    suggestions = [f"Cancel #{b.get('booking_id')}" for b in bookings[:2]] + ["Cancellation Policy"]
                    tool_result = {"success": True, "action": "request_booking_id"}
                else:
                    response_text = "You do not have any active bookings eligible for cancellation."
                    suggestions = ["Browse Gear", "Cancellation Policy"]
                    tool_result = {"success": True, "action": "no_bookings"}

        # 2. BOOKING STATUS & DETAILS
        elif intent in ("BOOKING_STATUS", "BOOKING_DETAILS") or any(w in message.lower() for w in ("booking", "bookings", "order", "orders", "rental", "rentals")):
            tool_called = "booking_lookup"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "To look up your reservation and rental schedule, please sign in to your Payent account."
                suggestions = ["Sign In", "Help Center", "Browse Equipment"]
                tool_result = {"success": False, "requires_auth": True}
            elif booking_id:
                tool_result = get_booking_details_tool(context, booking_id)
                if tool_result.get("success"):
                    b = tool_result.get("booking", {})
                    st = b.get("status", "pending")
                    title = b.get("product_title", "gear")
                    start_d = b.get("start_date", "TBD")
                    end_d = b.get("end_date", "TBD")
                    del_method = b.get("delivery_method", "pickup")
                    response_text = (
                        f"Booking #{booking_id} for **{title}** is currently **{st.upper()}**.\n"
                        f"• Rental Period: {start_d} to {end_d}\n"
                        f"• Delivery Mode: {del_method.title()}"
                    )
                    suggestions = ["Track Delivery", "Check Payment", "Cancellation Policy"]
                else:
                    response_text = tool_result.get("error", f"Could not find booking {booking_id}.")
                    suggestions = ["My Bookings", "Contact Support"]
            else:
                tool_result = get_user_bookings_tool(context, limit=5)
                if tool_result.get("success"):
                    bookings = tool_result.get("bookings", [])
                    if bookings:
                        b_list = "\n".join([f"• **#{b.get('booking_id')}** - {b.get('product_title')} ({b.get('status').upper()})" for b in bookings[:3]])
                        response_text = f"Here are your latest bookings:\n{b_list}\n\nWould you like details on a specific order?"
                        suggestions = [f"Status #{b.get('booking_id')}" for b in bookings[:2]] + ["All Bookings"]
                    else:
                        response_text = "You currently have no active or previous bookings."
                        suggestions = ["Browse Gear", "How It Works"]
                else:
                    response_text = tool_result.get("error", "Error loading your bookings.")
                    suggestions = ["Sign In", "Help"]

        # 3. PAYMENT STATUS
        elif intent in ("PAYMENT_STATUS", "PAYMENT_FAILED"):
            tool_called = "payment_lookup"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "Please sign in to view payment confirmation and transaction history."
                suggestions = ["Sign In", "Accepted Payment Methods"]
                tool_result = {"success": False, "requires_auth": True}
            else:
                tool_result = get_payment_status_tool(context, booking_id)
                if tool_result.get("success"):
                    if booking_id:
                        st = tool_result.get("payment_status", "PENDING")
                        amt = tool_result.get("total_amount", 0.0)
                        guidance = tool_result.get("guidance", "")
                        response_text = (
                            f"Payment for booking #{booking_id} is **{st}** (Amount: ₹{amt:,.2f}).\n"
                            f"{guidance}"
                        )
                        suggestions = ["Download Invoice", "Booking Details", "Help"]
                    elif tool_result.get("has_transactions"):
                        pts = tool_result.get("recent_payments", [])
                        pt_list = "\n".join([f"• #{p.get('booking_id')}: ₹{p.get('total_amount', 0.0):,.2f} ({p.get('payment_status')})" for p in pts[:3]])
                        response_text = f"Here is your recent payment summary:\n{pt_list}"
                        suggestions = ["Refund Status", "My Bookings"]
                    else:
                        response_text = "No recent payment records found on your account."
                        suggestions = ["Browse Gear", "Help Center"]
                else:
                    response_text = tool_result.get("error", "Error checking payment details.")
                    suggestions = ["Payment Support", "My Bookings"]

        # 4. REFUND STATUS
        elif intent == "REFUND_STATUS":
            tool_called = "refund_lookup"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "Please sign in to track refund processing for your cancelled bookings."
                suggestions = ["Sign In", "Refund Timeline FAQ"]
                tool_result = {"success": False, "requires_auth": True}
            else:
                tool_result = get_refund_status_tool(context, booking_id)
                if tool_result.get("success"):
                    if booking_id:
                        ref_st = tool_result.get("refund_status", "NONE")
                        amt = tool_result.get("refund_amount", 0.0)
                        desc = tool_result.get("status_description", "")
                        eta = tool_result.get("estimated_timeline", "")
                        response_text = (
                            f"Refund Status for #{booking_id}: **{ref_st}** (₹{amt:,.2f})\n"
                            f"• {desc}\n"
                            f"• Timeline: {eta}"
                        )
                        suggestions = ["Booking Details", "Contact Bank", "Support Ticket"]
                    elif tool_result.get("has_refunds"):
                        r_list = "\n".join([f"• #{r.get('booking_id')}: ₹{r.get('refund_amount', 0.0):,.2f} ({r.get('refund_status')})" for r in tool_result.get("refunds", [])])
                        response_text = f"Active refunds on your account:\n{r_list}\n\nRefunds normally take 3-5 business days to reach your source payment account."
                        suggestions = ["Payment Help", "My Bookings"]
                    else:
                        response_text = "You do not have any pending or processed refunds on your account."
                        suggestions = ["My Bookings", "Refund Policy"]
                else:
                    response_text = tool_result.get("error", "Error looking up refund status.")
                    suggestions = ["Support", "My Bookings"]

        # 5. KYC STATUS & REJECTION
        elif intent in ("KYC_STATUS", "KYC_REJECTION"):
            tool_called = "kyc_lookup"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "Please sign in to view your identity verification status."
                suggestions = ["Sign In", "KYC Requirements"]
                tool_result = {"success": False, "requires_auth": True}
            else:
                tool_result = get_kyc_status_tool(context)
                if tool_result.get("success"):
                    kyc = tool_result.get("kyc", {})
                    st = kyc.get("status", "NOT_STARTED")
                    guidance = tool_result.get("guidance", "")
                    next_s = tool_result.get("next_step")
                    response_text = f"Your KYC Verification status is **{st}**.\n• {guidance}"
                    if next_s:
                        response_text += f"\n• Next Step: {next_s}"
                    suggestions = ["Upload Documents", "Profile Settings", "Support"] if st != "APPROVED" else ["Browse Gear", "Rent Gear"]
                else:
                    response_text = tool_result.get("error", "Error checking KYC verification status.")
                    suggestions = ["Help", "Profile"]

        # 6. DELIVERY STATUS & ISSUES
        elif intent in ("DELIVERY_STATUS", "DELIVERY_ISSUE"):
            tool_called = "delivery_lookup"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "Please sign in to track courier and delivery dispatch status."
                suggestions = ["Sign In", "Delivery Zones"]
                tool_result = {"success": False, "requires_auth": True}
            else:
                tool_result = get_delivery_status_tool(context, booking_id=booking_id)
                if tool_result.get("success"):
                    msg = tool_result.get("status_message") or tool_result.get("message", "")
                    response_text = f"Delivery Tracking for #{booking_id or 'your booking'}:\n• {msg}"
                    del_data = tool_result.get("delivery")
                    if del_data:
                        stage = del_data.get("stage", "AWAITING_DISPATCH")
                        response_text += f"\n• Stage: {stage.replace('_', ' ').title()}"
                    suggestions = ["Contact Courier", "Pickup Instructions", "Booking Details"]
                else:
                    response_text = tool_result.get("error", "No delivery tracking found for this booking.")
                    suggestions = ["My Bookings", "Delivery Help"]

        # 7. PRODUCT LISTING
        elif intent == "PRODUCT_LISTING" and product_id:
            tool_called = "product_lookup"
            tool_result = get_public_product_info_tool(context, product_id)
            if tool_result.get("success"):
                p = tool_result.get("product", {})
                response_text = (
                    f"Product **{p.get('title')}** (#{product_id}):\n"
                    f"• Daily Rate: ₹{p.get('daily_rate', 0):,.2f}/day\n"
                    f"• City: {p.get('city', 'Available across hubs')}\n"
                    f"• Condition: {p.get('condition_grade', 'Verified')}\n"
                    f"• Availability: {'In Stock' if p.get('available') else 'Currently Rented'}"
                )
                suggestions = ["Check Availability", "Book Now", "View Specs"]
            else:
                response_text = tool_result.get("error", f"Product #{product_id} not found.")
                suggestions = ["Search Products", "Help Center"]

        # 8. SUPPORT TICKET STATUS
        elif intent == "SUPPORT_STATUS" or (ticket_id and "ticket" in message.lower()):
            tool_called = "support_ticket_lookup"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "To view your support tickets and messages, please sign in to your Payent account."
                suggestions = ["Sign In", "Help Center"]
                tool_result = {"success": False, "requires_auth": True}
            elif ticket_id:
                tool_result = get_support_ticket_detail(context, ticket_id)
                if tool_result.get("success"):
                    t = tool_result.get("ticket", {})
                    st = t.get("status", "open").upper()
                    last_msg = t.get("last_message") or "No messages yet."
                    last_by = "Support Specialist" if t.get("last_reply_by") == "admin" else "You"
                    response_text = (
                        f"Support Ticket **#{ticket_id}** is currently **{st}**.\n"
                        f"• Category: {t.get('category')}\n"
                        f"• Last Message ({last_by}): {last_msg}"
                    )
                    suggestions = ["My Tickets", "Return to Assistant"]
                else:
                    response_text = tool_result.get("error", f"Ticket #{ticket_id} not found.")
                    suggestions = ["My Tickets", "Contact Support"]
            else:
                tool_result = get_user_support_tickets(context, limit=5)
                if tool_result.get("success"):
                    tickets = tool_result.get("tickets", [])
                    if tickets:
                        lines = [f"Found {len(tickets)} support ticket(s) for your account:"]
                        for t in tickets:
                            lines.append(f"• **#{t['id']}** ({t.get('category')}) — **{t.get('status', 'open').upper()}**")
                        response_text = "\n".join(lines)
                        suggestions = [f"Ticket #{tickets[0]['id']}", "Talk to Human Support", "Help Center"]
                    else:
                        response_text = "You do not have any active support tickets. How can I assist you today?"
                        suggestions = ["My Bookings", "Talk to Support", "Help Center"]
                else:
                    response_text = tool_result.get("error", "Error loading support tickets.")
                    suggestions = ["Try Again", "Help"]

        if not response_text:
            response_text = "I am checking your account records. Please specify your booking ID or query topic if you need specific details."
            suggestions = ["My Bookings", "Help Center", "Contact Support"]

        return self._build_turn_result(
            intent, classification.confidence, requires_auth, tool_called,
            tool_result, response_text, suggestions, entities_dict, context, conversation_id, QueryType.LIVE_DB
        )

    # =========================================================================
    # HYBRID SYNTHESIS HANDLER
    # =========================================================================

    def _handle_hybrid(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str],
        intent: str,
        booking_id: Optional[str],
        entities_dict: Dict[str, Any],
        classification: ClassificationResult,
        top_kb: Optional[RetrievalResult],
    ) -> Dict[str, Any]:
        """
        Coordinates questions that combine live account status with verified policy guidance.
        Clearly separates personal data from general rules.
        Handles partial failures gracefully without fabricating information.
        """
        account_section: str = ""
        policy_section: str = ""
        live_tool_called: Optional[str] = None
        live_tool_result: Optional[Dict[str, Any]] = None
        requires_auth: bool = False
        suggestions: List[str] = ["Help Center"]

        msg_lower = message.lower()

        # 1. Fetch Policy / Guide Section from Knowledge Base
        # Look for targeted policy document if query contains specific keyword
        policy_query = message
        if "cancellation policy" in msg_lower or "cancel" in msg_lower:
            policy_query = "cancellation policy"
        elif "refund policy" in msg_lower or "refund" in msg_lower:
            policy_query = "refund policy"
        elif "delivery" in msg_lower and "delay" in msg_lower:
            policy_query = "delivery delayed"
        elif "kyc" in msg_lower:
            policy_query = "KYC requirements"

        retriever = self.index_manager.get_retriever()
        kb_matches = retriever.retrieve(policy_query, top_k=2)
        policy_doc = kb_matches[0] if kb_matches else top_kb

        if policy_doc and policy_doc.is_verified and "[VERIFY" not in policy_doc.answer.upper():
            policy_section = f"### Policy & Guidelines\n{policy_doc.answer}"
            suggestions = self._get_suggestions_for_category(policy_doc.category)
        else:
            # Fallback policy statement if KB has no match
            policy_section = "### Policy & Guidelines\nFor complete policy guidelines, please check our official Help Center."

        # 2. Fetch Personal Account / Live DB Section
        if not context.is_authenticated:
            requires_auth = True
            account_section = (
                "### Account Status\n"
                "To view your specific booking, payment, or delivery details alongside this policy, "
                "please sign in to your Payent account."
            )
            suggestions = ["Sign In"] + suggestions
            live_tool_result = {"success": False, "requires_auth": True}
        else:
            # Authenticated live lookup
            if "delivery" in msg_lower:
                live_tool_called = "delivery_lookup"
                live_tool_result = get_delivery_status_tool(context, booking_id=booking_id)
                if live_tool_result.get("success"):
                    msg_txt = live_tool_result.get("status_message") or live_tool_result.get("message", "In transit")
                    account_section = f"### Delivery Status\n• {msg_txt}"
                else:
                    if live_tool_result.get("database_error"):
                        account_section = "### Delivery Status\nNotice: Live delivery records are temporarily unavailable due to a database connection delay."
                    else:
                        account_section = "### Delivery Status\nNotice: No active delivery tracking found for this order."
            elif "refund" in msg_lower or "payment" in msg_lower:
                live_tool_called = "refund_lookup"
                live_tool_result = get_refund_status_tool(context, booking_id=booking_id)
                if live_tool_result.get("success"):
                    if booking_id:
                        ref_st = live_tool_result.get("refund_status", "NONE")
                        amt = live_tool_result.get("refund_amount", 0.0)
                        account_section = f"### Refund Status\n• Booking #{booking_id}: **{ref_st}** (₹{amt:,.2f})\n• {live_tool_result.get('status_description', '')}"
                    elif live_tool_result.get("has_refunds"):
                        r_list = "\n".join([f"• #{r.get('booking_id')}: ₹{r.get('refund_amount', 0.0):,.2f} ({r.get('refund_status')})" for r in live_tool_result.get("refunds", [])])
                        account_section = f"### Refund Status\n{r_list}"
                    else:
                        account_section = "### Refund Status\nNo matching refund record was found on your account."
                else:
                    if live_tool_result.get("database_error"):
                        account_section = "### Refund Status\nNotice: Live refund records are temporarily unavailable due to a database connection delay."
                    else:
                        account_section = f"### Refund Status\nNotice: {live_tool_result.get('error', 'Could not retrieve live refund data.')}"
            else:
                # Default to booking status
                live_tool_called = "booking_lookup"
                if booking_id:
                    live_tool_result = get_booking_details_tool(context, booking_id)
                    if live_tool_result.get("success"):
                        b = live_tool_result.get("booking", {})
                        account_section = (
                            f"### Booking Status\n"
                            f"• Booking **#{booking_id}** ({b.get('product_title')}) is currently **{b.get('status', 'PENDING').upper()}**.\n"
                            f"• Dates: {b.get('start_date')} to {b.get('end_date')}"
                        )
                    else:
                        if live_tool_result.get("database_error"):
                            account_section = "### Booking Status\nNotice: Live booking records are temporarily unavailable due to a database connection delay."
                        else:
                            account_section = f"### Booking Status\nNotice: Booking #{booking_id} not found."
                else:
                    live_tool_result = get_user_bookings_tool(context, limit=3)
                    if live_tool_result.get("success"):
                        b_list = live_tool_result.get("bookings", [])
                        if b_list:
                            lines = "\n".join([f"• **#{b['booking_id']}** - {b.get('product_title')} ({b.get('status').upper()})" for b in b_list[:2]])
                            account_section = f"### Your Recent Bookings\n{lines}"
                        else:
                            account_section = "### Booking Status\nYou currently have no active or previous bookings."
                    else:
                        account_section = "### Booking Status\nNotice: We could not retrieve your live bookings at this moment due to a connection delay."

        # 3. Combine Sections
        response_text = f"{account_section}\n\n{policy_section}".strip()

        combined_tool_result = {
            "success": True,
            "live_tool": live_tool_called,
            "live_result": live_tool_result,
            "knowledge_id": policy_doc.knowledge_id if policy_doc else None,
            "knowledge_score": round(policy_doc.similarity_score, 4) if policy_doc else None,
        }

        return self._build_turn_result(
            intent, classification.confidence, requires_auth, "hybrid_retrieval",
            combined_tool_result, response_text, suggestions, entities_dict, context, conversation_id, QueryType.HYBRID
        )

    # =========================================================================
    # ESCALATION HANDLER
    # =========================================================================

    def _handle_escalation(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str],
        intent: str,
        booking_id: Optional[str],
        entities_dict: Dict[str, Any],
        classification: ClassificationResult,
    ) -> Dict[str, Any]:
        """Handles human support escalation and grievance complaints."""
        msg_clean = message.lower().strip(" .!?,")
        is_confirmation = (
            msg_clean in ("yes", "yes please", "sure", "proceed", "confirm", "ok", "please create", "avunu", "ha")
            or msg_clean.startswith("confirm")
            or any(
                w in msg_clean
                for w in (
                    "confirm support ticket", "confirm ticket", "proceed with ticket",
                    "yes please create", "yes connect me",
                )
            )
        )

        category = "Equipment Damage & Dispute" if intent == "COMPLAINT" else "General Help"

        if not context.is_authenticated:
            return self._build_turn_result(
                intent, classification.confidence, True, "support_escalation",
                {"success": False, "requires_auth": True},
                "To connect you with our human support team or raise a formal support ticket, please sign in to your Payent account.",
                ["Sign In", "Help Center", "Browse Equipment"],
                entities_dict, context, conversation_id, QueryType.ESCALATION
            )

        if is_confirmation:
            tool_res = create_support_ticket(
                context=context,
                subject=f"Support Request: {booking_id or 'Inquiry'}",
                message=message,
                category=category,
                booking_id=booking_id,
                conversation_id=context.session_id,
            )
            resp = tool_res.get("message") or "Support ticket processed."
            chips = tool_res.get("suggestions", ["Check Ticket Status", "My Tickets", "Return to Assistant"])
            return self._build_turn_result(
                intent, classification.confidence, False, "create_support_ticket",
                tool_res, resp, chips, entities_dict, context, conversation_id, QueryType.ESCALATION
            )
        else:
            tool_res = propose_human_escalation(
                context=context,
                summary=message,
                category=category,
                booking_id=booking_id,
                conversation_id=context.session_id,
            )
            resp = tool_res.get("message")
            chips = tool_res.get("suggestions", ["Confirm Support Ticket", "Cancellation Policy", "Cancel"])
            return self._build_turn_result(
                intent, classification.confidence, False, "propose_escalation",
                tool_res, resp, chips, entities_dict, context, conversation_id, QueryType.ESCALATION
            )

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _get_suggestions_for_category(self, category: str) -> List[str]:
        """Provides contextually relevant suggestion chips for a given domain category."""
        cat_lower = category.lower()
        if "booking" in cat_lower:
            return ["My Bookings", "Booking Status", "Cancellation Policy"]
        if "refund" in cat_lower or "payment" in cat_lower:
            return ["My Payment Status", "Refund Timeline", "Security Deposit"]
        if "kyc" in cat_lower:
            return ["My KYC Status", "Upload Documents", "Help Center"]
        if "delivery" in cat_lower:
            return ["Track Delivery", "Delivery Zones", "Pickup Verification"]
        if "secret pin" in cat_lower or "pin" in cat_lower:
            return ["Handover Rules", "Report Issue", "Talk to Support"]
        return ["My Bookings", "Help Center", "Contact Support"]

    def _build_turn_result(
        self,
        intent: str,
        confidence: float,
        requires_auth: bool,
        tool_called: Optional[str],
        tool_result: Optional[Dict[str, Any]],
        response_text: str,
        suggestions: List[str],
        entities_dict: Dict[str, Any],
        context: AgentSessionContext,
        conversation_id: Optional[str],
        query_type: QueryType,
    ) -> Dict[str, Any]:
        """Assembles standard agent turn response dictionary."""
        is_db_err = bool(tool_result and (tool_result.get("database_error") or tool_result.get("status") == "service_unavailable"))
        if is_db_err and query_type != QueryType.HYBRID:
            response_text = (
                "Payent service is temporarily undergoing maintenance or experiencing connection delays. "
                "Please try again in a few moments, or reach out to Payent support if the issue persists."
            )
            suggestions = ["Try Again", "Contact Support", "Help Center"]

        res = {
            "intent": intent,
            "confidence": confidence,
            "is_ambiguous": False,
            "requires_auth": requires_auth,
            "tool_called": tool_called,
            "tool_result": tool_result,
            "response_text": response_text,
            "suggestions": suggestions,
            "entities": entities_dict,
            "session_id": context.session_id,
            "conversation_id": conversation_id,
            "authenticated": context.is_authenticated,
            "query_type": query_type.value,
        }
        if is_db_err:
            res["database_error"] = True
            res["status"] = "service_unavailable"
        return res
