"""
PAYENT AGENT — DETERMINISTIC INTENT-TO-TOOL ROUTER
Routes classified user intents and extracted entities directly to allowlisted database tools.
Enforces authentication boundaries, builds deterministic contextual responses with real data,
and generates relevant suggestion chips.
"""

import logging
from typing import Any, Dict, List, Optional

from agent_engine.context import AgentSessionContext
from agent_engine.intent_classifier import ClassificationResult, IntentClassifier
from agent_engine.persistence import (
    PersistenceUnavailableError,
    create_or_get_conversation,
    save_agent_message,
)
from agent_engine.response_templates import TEMPLATES, get_response_template
from agent_engine.escalation import (
    create_support_ticket,
    propose_human_escalation,
    get_user_support_tickets,
    get_support_ticket_detail,
)

logger = logging.getLogger("payent.agent.tool_router")
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


class AgentToolRouter:
    """
    Coordinates between intent understanding and allowlisted database tools.
    Never executes arbitrary SQL. All operations follow strict Python function paths.
    """

    def __init__(self, classifier: Optional[IntentClassifier] = None):
        self.classifier = classifier or IntentClassifier()

    def process_message(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a single conversational turn:
        1. Classifies intent & extracts safe entities.
        2. Routes to the appropriate verified database tool.
        3. Formulates a deterministic response incorporating real data.
        4. Persists the exchange if a conversation thread is active.
        """
        classification: ClassificationResult = self.classifier.classify(message)
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

        msg_lower = message.lower()
        is_confirmation = any(
            w in msg_lower
            for w in (
                "confirm support ticket",
                "confirm ticket",
                "create support ticket",
                "proceed with ticket",
                "confirm",
                "yes please create",
                "yes connect me",
            )
        )

        tool_called: Optional[str] = None
        tool_result: Optional[Dict[str, Any]] = None
        response_text: str = ""
        suggestions: List[str] = []
        requires_auth: bool = False

        # --- ROUTING ENGINE ---

        # 1. BOOKING STATUS & DETAILS
        if intent in ("BOOKING_STATUS", "BOOKING_DETAILS"):
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

        # 2. BOOKING CANCELLATION (REQUEST-ONLY)
        elif intent == "BOOKING_CANCELLATION":
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
                # Check user's most recent booking
                b_res = get_user_bookings_tool(context, limit=1)
                latest_b = (b_res.get("bookings") or [None])[0]
                if latest_b:
                    bid = latest_b.get("booking_id")
                    response_text = (
                        f"Which booking would you like to cancel? Your most recent booking is **#{bid}** ({latest_b.get('product_title')}).\n"
                        "To proceed, please specify the booking ID."
                    )
                    suggestions = [f"Cancel #{bid}", "My Bookings", "Cancellation FAQ"]
                else:
                    response_text = "Please provide the booking ID of the order you wish to cancel."
                    suggestions = ["My Bookings", "Cancellation Policy"]
                tool_result = {"success": True, "action": "request_booking_id"}

        # 3. PAYMENT STATUS & FAILED PAYMENTS
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

        # 7. PUBLIC PRODUCT INFO & LISTING
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

        # 8. HUMAN SUPPORT ESCALATION
        elif intent == "HUMAN_SUPPORT":
            tool_called = "support_escalation"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "To connect you with our human support team or raise a formal support ticket, please sign in to your Payent account."
                suggestions = ["Sign In", "Browse Equipment", "Help Center"]
                tool_result = {"success": False, "requires_auth": True}
            elif is_confirmation:
                tool_called = "create_support_ticket"
                tool_result = create_support_ticket(
                    context=context,
                    subject=f"Support Request: {booking_id or 'General Inquiry'}",
                    message=message,
                    category="General Help",
                    booking_id=booking_id,
                    conversation_id=context.session_id
                )
                response_text = tool_result.get("message") or "Support ticket processed."
                suggestions = tool_result.get("suggestions", ["Check Ticket Status", "My Tickets", "Return to Assistant"])
            else:
                tool_called = "propose_escalation"
                tool_result = propose_human_escalation(
                    context=context,
                    summary=message,
                    category="General Help",
                    booking_id=booking_id,
                    conversation_id=context.session_id
                )
                response_text = tool_result.get("message")
                suggestions = tool_result.get("suggestions", ["Confirm Support Ticket", "Change Category", "Cancel"])

        # 9. COMPLAINT & GRIEVANCE ESCALATION
        elif intent == "COMPLAINT":
            tool_called = "complaint_escalation"
            if not context.is_authenticated:
                requires_auth = True
                response_text = "To register a formal dispute or service complaint, please sign in to your Payent account."
                suggestions = ["Sign In", "Help Center", "Browse Equipment"]
                tool_result = {"success": False, "requires_auth": True}
            elif is_confirmation:
                tool_called = "create_support_ticket"
                tool_result = create_support_ticket(
                    context=context,
                    subject=f"Dispute: {booking_id or 'Service Issue'}",
                    message=message,
                    category="Equipment Damage & Dispute",
                    booking_id=booking_id,
                    priority="high",
                    conversation_id=context.session_id
                )
                response_text = tool_result.get("message") or "Support ticket processed."
                suggestions = tool_result.get("suggestions", ["Check Ticket Status", "My Tickets", "Return to Assistant"])
            else:
                tool_called = "propose_escalation"
                tool_result = propose_human_escalation(
                    context=context,
                    summary=message,
                    category="Equipment Damage & Dispute",
                    booking_id=booking_id,
                    conversation_id=context.session_id
                )
                response_text = tool_result.get("message")
                suggestions = tool_result.get("suggestions", ["Confirm Support Ticket", "Cancellation Policy", "Cancel"])

        # 10. SUPPORT TICKET STATUS & REPLIES
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

        # 11. DETERMINISTIC GENERAL / FAQ / GREETING RESPONSES
        else:
            tpl_key = classification.response_template_key
            tpl = TEMPLATES.get(tpl_key) or TEMPLATES.get(intent.lower()) or get_response_template(tpl_key)
            if tpl:
                response_text = tpl.message
                suggestions = list(tpl.suggested_chips)
            else:
                response_text = "I am Payent Agent, your digital assistant for rental bookings, payments, KYC, and delivery. How can I assist you today?"
                suggestions = ["My Bookings", "KYC Status", "Cancellation Policy", "Help"]

        # --- CONVERSATION PERSISTENCE ---
        cid = conversation_id
        if conversation_id or context.session_id:
            try:
                conv = create_or_get_conversation(context.session_id, context)
                cid = conv.get("id")
                # Save user message
                save_agent_message(
                    conversation_id=cid,
                    sender_type="user",
                    content=message,
                    intent=intent,
                    entities=entities_dict
                )
                # Save agent response
                save_agent_message(
                    conversation_id=cid,
                    sender_type="agent",
                    content=response_text,
                    intent=intent,
                    tool_result=tool_result
                )
            except PersistenceUnavailableError:
                logger.error("Production persistence failure during agent turn: service unavailable")
                return {
                    "intent": intent,
                    "confidence": classification.confidence,
                    "is_ambiguous": classification.is_ambiguous,
                    "requires_auth": requires_auth,
                    "tool_called": tool_called,
                    "tool_result": None,
                    "response_text": (
                        "Payent Agent service is temporarily undergoing maintenance or experiencing connection delays. "
                        "Please try again in a few moments, or reach out to Payent support if the issue persists."
                    ),
                    "suggestions": ["Try Again", "Contact Support", "Help"],
                    "entities": entities_dict,
                    "session_id": context.session_id,
                    "conversation_id": cid,
                    "authenticated": context.is_authenticated,
                    "persistence_error": True,
                    "status": "service_unavailable"
                }
            except Exception as e:
                logger.warning(f"Non-critical persistence notice: {type(e).__name__}")

        return {
            "intent": intent,
            "confidence": classification.confidence,
            "is_ambiguous": classification.is_ambiguous,
            "requires_auth": requires_auth,
            "tool_called": tool_called,
            "tool_result": tool_result,
            "response_text": response_text,
            "suggestions": suggestions,
            "entities": entities_dict,
            "session_id": context.session_id,
            "conversation_id": cid,
            "authenticated": context.is_authenticated
        }
