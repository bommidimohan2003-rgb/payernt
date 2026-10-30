"""
PAYENT AGENT — PAYMENT & REFUND DATABASE TOOLS
Provides authoritative lookup for transaction and refund lifecycles.
Masks sensitive payment identifiers and prevents cross-user exposure.
"""

from typing import Any, Dict, Optional, List

from agent_engine.context import AgentSessionContext
from agent_engine.privacy import sanitize_booking_record
from database import get_orders, get_order_by_id


def get_payment_status_tool(
    context: AgentSessionContext,
    booking_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves authoritative payment status for a specific booking or latest active bookings.
    Requires authentication.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to check your payment status."
        }

    clean_bid = (booking_id or "").strip()

    if clean_bid:
        try:
            order = get_order_by_id(clean_bid)
        except Exception as e:
            return {"success": False, "error": f"Error retrieving payment record: {str(e)}"}

        if not order:
            return {"success": False, "error": f"No booking found with ID '{clean_bid}'."}

        if not context.can_access_booking(order):
            return {
                "success": False,
                "error": f"Access denied: You are not authorized to view payment details for booking '{clean_bid}'."
            }

        sanitized = sanitize_booking_record(order)
        pay_st = sanitized.get("payment_status", "PENDING")
        total_amt = sanitized.get("total_amount", 0.0)

        # Guidance message based on status
        if str(pay_st).upper() in ("COMPLETED", "SUCCESS", "PAID"):
            guidance = "Your payment was successfully received and confirmed."
        elif str(pay_st).upper() in ("FAILED", "FAILURE"):
            guidance = "Your payment failed. If money was debited from your account, it will automatically reverse within 3-5 business days."
        else:
            guidance = "Your payment is currently pending confirmation from the payment gateway."

        return {
            "success": True,
            "booking_id": clean_bid,
            "product_title": sanitized.get("product_title"),
            "payment_status": pay_st,
            "total_amount": total_amt,
            "guidance": guidance
        }

    # If no specific booking ID is provided, look at recent orders
    try:
        user_orders = get_orders(context.clean_email)
    except Exception as e:
        return {"success": False, "error": f"Could not fetch recent payments: {str(e)}"}

    if not user_orders:
        return {
            "success": True,
            "has_transactions": False,
            "message": "You currently have no payment transactions on record.",
            "payments": []
        }

    recent_payments: List[Dict[str, Any]] = []
    for o in user_orders[:5]:
        sb = sanitize_booking_record(o)
        recent_payments.append({
            "booking_id": sb.get("booking_id"),
            "product_title": sb.get("product_title"),
            "total_amount": sb.get("total_amount"),
            "payment_status": sb.get("payment_status"),
            "created_at": sb.get("created_at")
        })

    return {
        "success": True,
        "has_transactions": True,
        "count": len(recent_payments),
        "recent_payments": recent_payments
    }


def get_refund_status_tool(
    context: AgentSessionContext,
    booking_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authoritatively tracks refund progress for cancelled or rejected bookings.
    Never fabricates false transaction numbers or banking credentials.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to check your refund status."
        }

    clean_bid = (booking_id or "").strip()

    if clean_bid:
        try:
            order = get_order_by_id(clean_bid)
        except Exception as e:
            return {"success": False, "error": f"Error retrieving refund details: {str(e)}"}

        if not order:
            return {"success": False, "error": f"No booking found with ID '{clean_bid}'."}

        if not context.can_access_booking(order):
            return {
                "success": False,
                "error": f"Access denied: You are not authorized to view refund details for booking '{clean_bid}'."
            }

        sanitized = sanitize_booking_record(order)
        order_st = str(sanitized.get("status") or "").lower()
        ref_st = str(sanitized.get("refund_status") or "").upper()
        tot = sanitized.get("total_amount", 0.0)

        if ref_st in ("COMPLETED", "PROCESSED"):
            status_desc = "Refund has been processed to your original payment method."
            eta = "Amount should reflect in your source account within 3 to 5 business days."
        elif ref_st in ("INITIATED", "PENDING", "PROCESSING"):
            status_desc = "Refund has been initiated and is currently being processed by the payment gateway."
            eta = "Expected resolution is within 3 to 7 business days from cancellation."
        elif order_st == "cancelled":
            status_desc = "Booking is cancelled. Refund initiation is being queued."
            eta = "Refunds typically process within 3 to 5 business days."
        else:
            status_desc = f"Booking is currently in '{order_st}' status. No refund has been triggered."
            eta = "Refunds only apply to cancelled or rejected orders prior to rental completion."

        return {
            "success": True,
            "booking_id": clean_bid,
            "booking_status": order_st,
            "refund_status": ref_st if ref_st != "NONE" else ("QUEUED" if order_st == "cancelled" else "NOT_APPLICABLE"),
            "refund_amount": tot,
            "status_description": status_desc,
            "estimated_timeline": eta
        }

    # If no booking ID given, check if any recent cancelled booking has a refund
    try:
        user_orders = get_orders(context.clean_email)
    except Exception as e:
        return {"success": False, "error": f"Could not check refund history: {str(e)}"}

    cancelled_orders = [o for o in user_orders if str(o.get("status", "")).lower() == "cancelled"]
    if not cancelled_orders:
        return {
            "success": True,
            "has_refunds": False,
            "message": "You have no cancelled orders with active refunds.",
            "refunds": []
        }

    refunds_summary = []
    for co in cancelled_orders[:3]:
        sco = sanitize_booking_record(co)
        refunds_summary.append({
            "booking_id": sco.get("booking_id"),
            "product_title": sco.get("product_title"),
            "refund_amount": sco.get("total_amount"),
            "refund_status": sco.get("refund_status") if sco.get("refund_status") != "NONE" else "QUEUED",
            "cancelled_at": sco.get("cancelled_at")
        })

    return {
        "success": True,
        "has_refunds": True,
        "count": len(refunds_summary),
        "refunds": refunds_summary
    }
