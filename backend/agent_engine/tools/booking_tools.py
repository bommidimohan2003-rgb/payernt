"""
PAYENT AGENT — BOOKING DATABASE TOOLS
Implements allowlisted booking queries with strict ownership enforcement,
safe data projection, and cancellation eligibility analysis.
"""

from typing import Any, Dict, List, Optional

from agent_engine.context import AgentSessionContext
from agent_engine.privacy import sanitize_booking_record
from database import DatabaseConnectionError, get_orders, get_order_by_id
from payernt_database import get_payernt_vendor_bookings


def get_user_bookings_tool(context: AgentSessionContext, limit: int = 10) -> Dict[str, Any]:
    """
    Retrieves bookings belonging to the authenticated user.
    Guests are rejected with a clear authentication requirement.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to view your bookings.",
            "bookings": []
        }

    limit = max(1, min(limit, 50))
    raw_bookings: List[Dict[str, Any]] = []

    try:
        if context.is_vendor:
            # Vendor querying their received rental requests
            vendor_res = get_payernt_vendor_bookings(
                vendor_id=context.user_id or "",
                vendor_email=context.clean_email
            )
            raw_bookings = vendor_res if isinstance(vendor_res, list) else []
        else:
            # Renter querying their orders
            raw_orders = get_orders(context.clean_email)
            raw_bookings = raw_orders if isinstance(raw_orders, list) else []
    except DatabaseConnectionError:
        return {
            "success": False,
            "error": "Payent booking service is temporarily unavailable due to a database connection delay. Please try again shortly.",
            "status": "service_unavailable",
            "database_error": True,
            "bookings": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to retrieve bookings: {str(e)}",
            "bookings": []
        }

    sanitized = [sanitize_booking_record(b) for b in raw_bookings[:limit]]
    return {
        "success": True,
        "count": len(sanitized),
        "user_email": context.clean_email,
        "role": context.role,
        "bookings": sanitized
    }


def get_booking_details_tool(context: AgentSessionContext, booking_id: str) -> Dict[str, Any]:
    """
    Retrieves full details for a single booking, verifying ownership.
    Prevents unauthorized users from probing or viewing other accounts' bookings.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to view booking details."
        }

    clean_bid = (booking_id or "").strip()
    if not clean_bid:
        return {
            "success": False,
            "error": "Please provide a valid booking or order ID."
        }

    try:
        order = get_order_by_id(clean_bid)
        if not order:
            order = get_order_by_id(clean_bid.upper()) or get_order_by_id(clean_bid.lower())
    except DatabaseConnectionError:
        return {
            "success": False,
            "error": "Payent booking service is temporarily unavailable due to a database connection delay. Please try again shortly.",
            "status": "service_unavailable",
            "database_error": True
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error retrieving booking details: {str(e)}"
        }

    if not order:
        return {
            "success": False,
            "error": f"No booking found with ID '{clean_bid}' in your account records."
        }

    # Strict ownership check
    if not context.can_access_booking(order):
        return {
            "success": False,
            "error": f"Access denied: You are not authorized to view booking '{clean_bid}'."
        }

    sanitized = sanitize_booking_record(order)
    return {
        "success": True,
        "booking": sanitized
    }


def check_cancellation_eligibility_tool(context: AgentSessionContext, booking_id: str) -> Dict[str, Any]:
    """
    Evaluates whether a booking can be cancelled based on existing marketplace policies.
    CRITICAL: This tool is strictly inquiry/request-only; it does NOT mutate booking status.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to check cancellation options."
        }

    clean_bid = (booking_id or "").strip()
    if not clean_bid:
        return {
            "success": False,
            "error": "Please provide a booking ID to evaluate cancellation eligibility."
        }

    try:
        order = get_order_by_id(clean_bid)
        if not order:
            order = get_order_by_id(clean_bid.upper()) or get_order_by_id(clean_bid.lower())
    except Exception as e:
        return {
            "success": False,
            "error": f"Error checking cancellation status: {str(e)}"
        }

    if not order:
        return {
            "success": False,
            "error": f"Booking '{clean_bid}' was not found in our records."
        }

    if not context.can_access_booking(order):
        return {
            "success": False,
            "error": f"Access denied: You do not have permission to manage booking '{clean_bid}'."
        }

    curr_st = str(order.get("status") or "").lower().strip()
    cancellation_req_st = str(order.get("cancellation_request_status") or "").upper().strip()

    # Rule 1: Already cancelled
    if curr_st in ("cancelled", "canceled"):
        return {
            "success": True,
            "eligible": False,
            "booking_id": clean_bid,
            "current_status": "cancelled",
            "reason": "This booking is already cancelled.",
            "policy_summary": "No further cancellation actions can be taken on a cancelled reservation.",
            "action_required": None
        }

    # Rule 2: Completed / Returned
    if curr_st in ("completed", "returned"):
        return {
            "success": True,
            "eligible": False,
            "booking_id": clean_bid,
            "current_status": curr_st,
            "reason": "Cannot cancel a completed rental order.",
            "policy_summary": "Orders that have reached completion are archived.",
            "action_required": None
        }

    # Rule 3: Active / Handed over to renter
    if curr_st in ("active", "in_progress", "ongoing"):
        return {
            "success": True,
            "eligible": False,
            "booking_id": clean_bid,
            "current_status": curr_st,
            "reason": "Cannot cancel booking after physical equipment handover has occurred.",
            "policy_summary": "Once equipment is in your possession, standard rental return and dispute procedures apply.",
            "action_required": "Please initiate an early return through the rental portal if you wish to conclude the rental."
        }

    # Rule 4: Pending cancellation request already exists
    if cancellation_req_st == "PENDING":
        return {
            "success": True,
            "eligible": False,
            "booking_id": clean_bid,
            "current_status": curr_st,
            "cancellation_request_status": "PENDING",
            "reason": "A cancellation request for this booking is already under review.",
            "policy_summary": "Your cancellation request has been recorded and is awaiting vendor or administrator confirmation.",
            "action_required": "No further action needed. You will be notified once reviewed."
        }

    # Rule 5: Eligible for cancellation request (Pending / Confirmed prior to handover)
    total_val = float(order.get("total") or order.get("amount") or 0.0)
    return {
        "success": True,
        "eligible": True,
        "booking_id": clean_bid,
        "current_status": curr_st,
        "total_amount": total_val,
        "policy_summary": "Full refund is available prior to equipment dispatch or physical pickup.",
        "explanation": f"Booking '{clean_bid}' is in '{curr_st}' status and qualifies for cancellation.",
        "confirmation_prompt": f"Would you like to confirm submitting a cancellation request for booking {clean_bid}?",
        "action_required": "To execute this cancellation, please confirm in chat or use the 'Cancel Booking' option in your dashboard."
    }
