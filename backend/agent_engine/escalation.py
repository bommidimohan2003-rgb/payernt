"""
PAYENT AGENT — HUMAN SUPPORT ESCALATION & ADMIN BRIDGE
Module connecting the deterministic Payent Agent to existing Payent support-ticket
and admin notification infrastructure.
Strictly reuses `support_tickets` and `admin_notifications` tables and schemas.
Enforces authentication boundaries, booking ownership verification, duplicate prevention,
PII/secret redaction, and internal note privacy.
"""

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from config import IS_PRODUCTION
from agent_engine.context import AgentSessionContext
from agent_engine.persistence import (
    PersistenceUnavailableError,
    _notify_admin_db_failure,
    is_db_available,
)
from agent_engine.privacy import mask_sensitive_text
from database import (
    broadcast_admin_event_safe,
    execute_query,
    fetch_all,
    fetch_one,
    get_db_connection,
    get_order_by_id,
)

logger = logging.getLogger("payent.agent.escalation")

# Canonical Payent Support Categories (matching platform convention)
SUPPORT_CATEGORIES = [
    "General Help",
    "Booking & Reservation",
    "Payment & Refund",
    "KYC & Verification",
    "Equipment Damage & Dispute",
    "Delivery & Logistics",
]

# Canonical Ticket Lifecycle Statuses
VALID_TICKET_STATUSES = {
    "open",
    "pending",
    "in_progress",
    "waiting_for_user",
    "resolved",
    "closed",
}

# In-memory store for offline test execution
MOCK_ADMIN_NOTIFICATIONS: List[Dict[str, Any]] = []


def reset_escalation_state() -> None:
    """Helper for test fixtures to reset escalation state."""
    MOCK_ADMIN_NOTIFICATIONS.clear()


def normalize_support_category(category: Optional[str]) -> str:
    """Maps freeform or extracted category hints into canonical Payent support categories."""
    if not category:
        return "General Help"
    cat_lower = category.strip().lower()
    if any(k in cat_lower for k in ("book", "rent", "reservation", "schedule", "extend")):
        return "Booking & Reservation"
    if any(k in cat_lower for k in ("pay", "refund", "deposit", "money", "fee", "charge")):
        return "Payment & Refund"
    if any(k in cat_lower for k in ("kyc", "aadhaar", "pan", "verify", "document", "identity")):
        return "KYC & Verification"
    if any(k in cat_lower for k in ("damage", "dispute", "broken", "scam", "fraud", "complaint")):
        return "Equipment Damage & Dispute"
    if any(k in cat_lower for k in ("deliver", "courier", "track", "ship", "pickup")):
        return "Delivery & Logistics"
    for sc in SUPPORT_CATEGORIES:
        if sc.lower() == cat_lower:
            return sc
    return "General Help"


def normalize_ticket_status(status: Optional[str]) -> str:
    """Normalizes raw status strings to canonical lifecycle values."""
    if not status:
        return "open"
    st = status.strip().lower()
    if st in ("in-progress", "in_progress", "inprogress", "processing"):
        return "in_progress"
    if st in ("waiting", "waiting_for_user", "waiting-for-user", "pending_user"):
        return "waiting_for_user"
    if st in ("resolved", "fixed", "completed"):
        return "resolved"
    if st in ("closed", "dismissed", "cancelled"):
        return "closed"
    if st in ("pending", "open"):
        return st
    return "open"


def record_admin_notification(
    title: str,
    message: str,
    notification_type: str = "support",
    ticket_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatches admin notification via database table and live WebSocket event bus.
    Sanitizes title and message to guarantee zero leakage of secret credentials or PII.
    """
    clean_title = mask_sensitive_text(title.strip())[:250]
    clean_message = mask_sensitive_text(message.strip())[:950]
    notif_id = f"notif_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": notif_id,
        "title": clean_title,
        "message": clean_message,
        "type": notification_type,
        "is_read": False,
        "created_at": now_iso
    }

    # DB persistence
    try:
        execute_query("""
            INSERT INTO admin_notifications (id, title, message, type, is_read, created_at)
            VALUES (%s, %s, %s, %s, 0, %s)
        """, (notif_id, clean_title, clean_message, notification_type, now_iso))
    except Exception as e:
        logger.warning("Notice inserting admin_notification: %s", type(e).__name__)

    # Live platform broadcast
    try:
        broadcast_admin_event_safe("support.ticket_created", {
            "id": ticket_id or notif_id,
            "title": clean_title,
            "category": notification_type,
            "created_at": now_iso
        })
    except Exception:
        pass

    MOCK_ADMIN_NOTIFICATIONS.append(record)
    return record


def find_active_support_ticket(
    user_email: str,
    conversation_id: Optional[str] = None,
    booking_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Checks for an existing open or pending support ticket for the user.
    Used for strict duplicate prevention upon repeated confirmation clicks or retries.
    """
    clean_email = (user_email or "").strip().lower()
    if not clean_email:
        return None

    # 1. Search in DB
    try:
        query = """
            SELECT * FROM support_tickets 
            WHERE LOWER(user_email) = %s 
              AND status IN ('open', 'pending', 'in_progress', 'waiting_for_user')
            ORDER BY COALESCE(updated_at, created_at) DESC
        """
        rows = fetch_all(query, (clean_email,))
        for r in (rows or []):
            msgs_raw = r.get("messages") or []
            if isinstance(msgs_raw, str):
                try:
                    msgs_raw = json.loads(msgs_raw)
                except Exception:
                    msgs_raw = []
            
            # Match by conversation_id
            if conversation_id:
                for m in msgs_raw:
                    if m.get("conversationId") == conversation_id:
                        return r

            # Match by bookingId if specified
            if booking_id:
                ticket_b = r.get("bookingId") or r.get("booking_id")
                if ticket_b and str(ticket_b).strip() == str(booking_id).strip():
                    return r
    except Exception:
        pass

    # 2. Search in Mock store ONLY if not in production
    if not IS_PRODUCTION:
        from database import MOCK_SUPPORT_TICKETS
        for t in MOCK_SUPPORT_TICKETS.values():
            if (t.get("user_email") or "").strip().lower() == clean_email:
                st = str(t.get("status") or "open").lower()
                if st in ('open', 'pending', 'in_progress', 'waiting_for_user'):
                    msgs = t.get("messages") or []
                    if isinstance(msgs, str):
                        try:
                            msgs = json.loads(msgs)
                        except Exception:
                            msgs = []
                    if conversation_id:
                        for m in msgs:
                            if m.get("conversationId") == conversation_id:
                                return t
                    if booking_id:
                        tb = t.get("bookingId") or t.get("booking_id")
                        if tb and str(tb).strip() == str(booking_id).strip():
                            return t

    return None


def propose_human_escalation(
    context: AgentSessionContext,
    summary: str,
    category: Optional[str] = None,
    booking_id: Optional[str] = None,
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Workflow Steps 3-7: Validates authentication, sanitizes conversation summary,
    validates booking ownership, and formulates a confirmation proposal.
    Does NOT create a ticket yet (explicit customer confirmation required).
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required to request human support.",
            "message": "To connect you with our human support team or raise a formal support ticket, please sign in to your Payent account.",
            "suggestions": ["Sign In", "Browse Equipment", "Help Center"]
        }

    # Validate optional booking ownership
    clean_booking_id = None
    if booking_id:
        b_res = get_order_by_id(booking_id)
        if b_res:
            if not context.can_access_booking(b_res):
                return {
                    "success": False,
                    "requires_auth": False,
                    "error": f"Booking #{booking_id} does not belong to your account.",
                    "message": f"Booking #{booking_id} is not associated with your account. We can still connect you with support under General Help without linking this booking.",
                    "suggestions": ["Proceed without Booking", "Check My Bookings", "Cancel"]
                }
            clean_booking_id = str(booking_id).strip()

    norm_category = normalize_support_category(category)
    clean_summary = mask_sensitive_text(summary)
    if len(clean_summary) < 5:
        clean_summary = f"Customer requested human assistance regarding {norm_category}."

    return {
        "success": True,
        "requires_auth": False,
        "requires_confirmation": True,
        "category": norm_category,
        "booking_id": clean_booking_id,
        "summary": clean_summary,
        "conversation_id": conversation_id or context.session_id,
        "message": (
            f"I can connect you with our human support specialists and create a support ticket.\n\n"
            f"• **Category**: {norm_category}\n"
            f"• **Related Booking**: {clean_booking_id or 'None'}\n"
            f"• **Summary**: {clean_summary}\n\n"
            f"Would you like me to proceed with creating this support ticket?"
        ),
        "suggestions": ["Confirm Support Ticket", "Change Category", "Cancel"]
    }


def create_support_ticket(
    context: AgentSessionContext,
    subject: str,
    message: str,
    category: Optional[str] = "General Help",
    booking_id: Optional[str] = None,
    priority: str = "medium",
    conversation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Workflow Step 8: Authenticated, idempotent ticket creation in support_tickets table and MOCK_SUPPORT_TICKETS.
    Enforces production persistence safety and prevents duplicate ticket creation.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required to create a support ticket."
        }

    clean_email = context.clean_email
    if not clean_email or "@" not in clean_email:
        return {"success": False, "error": "Invalid user identity."}

    norm_category = normalize_support_category(category)
    clean_sub = mask_sensitive_text(subject.strip())
    if len(clean_sub) < 3:
        clean_sub = f"Support Request: {norm_category}"
    clean_msg = mask_sensitive_text(message.strip())
    if len(clean_msg) < 5:
        clean_msg = f"User {clean_email} requested support regarding {norm_category}."

    # Validate optional booking ownership
    clean_booking_id = None
    if booking_id:
        b_res = get_order_by_id(booking_id)
        if b_res:
            if not context.can_access_booking(b_res):
                return {
                    "success": False,
                    "error": f"Unauthorized: Booking #{booking_id} does not belong to your account."
                }
            clean_booking_id = str(booking_id).strip()

    # --- DUPLICATE PREVENTION ---
    existing = find_active_support_ticket(clean_email, conversation_id=conversation_id, booking_id=clean_booking_id)
    if existing:
        return {
            "success": True,
            "is_duplicate": True,
            "ticket_id": existing["id"],
            "status": existing.get("status", "open"),
            "category": existing.get("category", norm_category),
            "booking_id": clean_booking_id,
            "message": (
                f"You already have an active support ticket **#{existing['id']}** (Status: **{existing.get('status', 'open').upper()}**).\n"
                f"Our team has already been notified and is reviewing your request. You can check for updates in your Support Messages."
            ),
            "suggestions": ["Check Ticket Status", "Return to Assistant"]
        }

    # Production database safety check
    if IS_PRODUCTION and not is_db_available():
        logger.error("Production database unavailable for support ticket creation")
        _notify_admin_db_failure("create_support_ticket")
        raise PersistenceUnavailableError("Persistent database unavailable for support ticket creation")

    # Generate ticket ID following platform TICK-{timestamp} pattern
    ticket_id = f"TICK-{int(time.time() * 1000)}"
    user_name = context.full_name or clean_email.split("@")[0]
    now_str = datetime.now(timezone.utc).isoformat()

    init_messages = [{
        "id": f"msg-{int(time.time() * 1000)}",
        "sender": user_name,
        "senderType": "user",
        "content": clean_msg,
        "bookingId": clean_booking_id,
        "category": norm_category,
        "conversationId": conversation_id,
        "source": "payent_agent",
        "timestamp": now_str
    }]

    # In-memory store update
    from database import MOCK_SUPPORT_TICKETS
    ticket_record = {
        "id": ticket_id,
        "user_email": clean_email,
        "user_name": user_name,
        "subject": clean_sub,
        "category": norm_category,
        "status": "open",
        "priority": priority,
        "bookingId": clean_booking_id,
        "conversation_id": conversation_id,
        "messages": init_messages,
        "created_at": now_str,
        "updated_at": now_str
    }
    MOCK_SUPPORT_TICKETS[ticket_id] = ticket_record

    # DB persistence
    try:
        execute_query("""
            INSERT INTO support_tickets (id, user_email, user_name, subject, category, status, priority, messages, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            ticket_id, clean_email, user_name,
            clean_sub, norm_category, "open", priority,
            json.dumps(init_messages), now_str, now_str
        ))
    except Exception as e:
        logger.error("Failed to insert support ticket into DB: %s", type(e).__name__)
        if IS_PRODUCTION:
            _notify_admin_db_failure("create_support_ticket_insert")
            raise PersistenceUnavailableError("Failed to persist support ticket in production database") from e

    # Record Admin Notification & Broadcast Event
    record_admin_notification(
        title=f"New Agent Escalation: {ticket_id}",
        message=f"Ticket {ticket_id} created by {clean_email} regarding {norm_category}.",
        notification_type=norm_category,
        ticket_id=ticket_id
    )

    # Link to agent conversation in persistence if active
    if conversation_id:
        try:
            from agent_engine.persistence import MOCK_AGENT_CONVERSATIONS
            if conversation_id in MOCK_AGENT_CONVERSATIONS:
                MOCK_AGENT_CONVERSATIONS[conversation_id]["support_ticket_id"] = ticket_id
            execute_query("""
                UPDATE agent_conversations SET updated_at = %s WHERE id = %s
            """, (now_str, conversation_id))
        except Exception:
            pass

    return {
        "success": True,
        "is_duplicate": False,
        "ticket_id": ticket_id,
        "status": "open",
        "category": norm_category,
        "booking_id": clean_booking_id,
        "message": (
            f"Your support ticket **#{ticket_id}** has been created with status **OPEN**.\n"
            f"• Category: {norm_category}\n"
            f"• Reference: {clean_booking_id or 'General'}\n\n"
            f"Our human support team has been notified and will review your request shortly. "
            f"You will be able to view updates and reply directly in your Support Messages."
        ),
        "suggestions": ["Check Ticket Status", "My Tickets", "Return to Assistant"]
    }


def sanitize_ticket_record(ticket: Dict[str, Any], context: AgentSessionContext) -> Dict[str, Any]:
    """
    Filters messages to preserve chronological order, redacts sensitive PII,
    and excludes internal admin notes (senderType == 'internal_note' or is_internal == True)
    when accessed by customers.
    """
    raw_msgs = ticket.get("messages") or []
    if isinstance(raw_msgs, str):
        try:
            raw_msgs = json.loads(raw_msgs)
        except Exception:
            raw_msgs = []

    filtered_msgs = []
    for m in raw_msgs:
        # Exclude internal admin notes for non-admin customers
        if not context.is_admin:
            if m.get("is_internal") or m.get("senderType") in ("internal_note", "admin_note"):
                continue

        clean_m = {
            "id": m.get("id"),
            "sender": m.get("sender"),
            "senderType": m.get("senderType"),
            "content": mask_sensitive_text(m.get("content") or m.get("message") or ""),
            "timestamp": m.get("timestamp") or m.get("createdAt")
        }
        filtered_msgs.append(clean_m)

    return {
        "id": ticket["id"],
        "subject": mask_sensitive_text(ticket.get("subject") or "Support Request"),
        "category": ticket.get("category") or "General Help",
        "status": normalize_ticket_status(ticket.get("status")),
        "priority": ticket.get("priority") or "medium",
        "booking_id": ticket.get("bookingId") or ticket.get("booking_id"),
        "created_at": ticket.get("created_at"),
        "updated_at": ticket.get("updated_at") or ticket.get("created_at"),
        "messages": filtered_msgs,
        "last_message": filtered_msgs[-1]["content"] if filtered_msgs else "",
        "last_reply_by": filtered_msgs[-1]["senderType"] if filtered_msgs else None
    }


def get_user_support_tickets(context: AgentSessionContext, limit: int = 5) -> Dict[str, Any]:
    """Retrieves tickets owned by the authenticated caller. Never leaks other customers' tickets."""
    if not context.is_authenticated:
        return {"success": False, "requires_auth": True, "tickets": [], "error": "Authentication required."}

    clean_email = context.clean_email
    tickets = []

    # Read from DB
    try:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT * FROM support_tickets 
                        WHERE LOWER(user_email) = %s 
                        ORDER BY COALESCE(updated_at, created_at) DESC
                        LIMIT %s
                    """, (clean_email, limit))
                    rows = cursor.fetchall()
                    if rows:
                        tickets.extend(rows)
            finally:
                conn.close()
        else:
            if IS_PRODUCTION:
                return {
                    "success": False,
                    "error": "Payent support ticket service is temporarily unavailable due to a database connection delay. Please try again shortly.",
                    "status": "service_unavailable",
                    "database_error": True,
                    "tickets": [],
                }
    except Exception as e:
        logger.warning(f"Database error in get_user_support_tickets: {e}")
        if IS_PRODUCTION:
            return {
                "success": False,
                "error": "Payent support ticket service is temporarily unavailable due to a database connection delay. Please try again shortly.",
                "status": "service_unavailable",
                "database_error": True,
                "tickets": [],
            }

    # Read from Mock ONLY if not in production
    if not IS_PRODUCTION:
        from database import MOCK_SUPPORT_TICKETS
        seen_ids = {t["id"] for t in tickets}
        for tid, mt in MOCK_SUPPORT_TICKETS.items():
            if tid not in seen_ids and (mt.get("user_email") or "").strip().lower() == clean_email:
                tickets.append(mt)

    sanitized_tickets = []
    for t in tickets[:limit]:
        sanitized_tickets.append(sanitize_ticket_record(t, context))

    return {
        "success": True,
        "count": len(sanitized_tickets),
        "tickets": sanitized_tickets
    }


def get_support_ticket_detail(context: AgentSessionContext, ticket_id: str) -> Dict[str, Any]:
    """
    Retrieves a single ticket after verifying ownership.
    Excludes internal admin notes from customer view.
    Preserves exact message ordering.
    """
    if not context.is_authenticated:
        return {"success": False, "requires_auth": True, "error": "Authentication required."}

    clean_tid = (ticket_id or "").strip()
    ticket = None

    try:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM support_tickets WHERE id = %s", (clean_tid,))
                    ticket = cursor.fetchone()
            finally:
                conn.close()
        else:
            if IS_PRODUCTION:
                return {
                    "success": False,
                    "error": "Payent support ticket service is temporarily unavailable due to a database connection delay. Please try again shortly.",
                    "status": "service_unavailable",
                    "database_error": True,
                }
    except Exception as e:
        logger.warning(f"Database error in get_support_ticket_detail: {e}")
        if IS_PRODUCTION:
            return {
                "success": False,
                "error": "Payent support ticket service is temporarily unavailable due to a database connection delay. Please try again shortly.",
                "status": "service_unavailable",
                "database_error": True,
            }

    if not ticket and not IS_PRODUCTION:
        from database import MOCK_SUPPORT_TICKETS
        ticket = MOCK_SUPPORT_TICKETS.get(clean_tid)

    if not ticket:
        return {"success": False, "error": f"Ticket #{clean_tid} not found."}

    # Verify ownership
    ticket_email = (ticket.get("user_email") or "").strip().lower()
    if not context.is_admin and ticket_email != context.clean_email:
        return {"success": False, "error": "Unauthorized: You do not have permission to view this ticket."}

    sanitized = sanitize_ticket_record(ticket, context)
    return {
        "success": True,
        "ticket": sanitized
    }
