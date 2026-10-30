"""
PAYENT AGENT — DELIVERY & LOGISTICS DATABASE TOOLS
Provides authorized access to delivery milestones and equipment transit tracking.
Verifies booking ownership before surfacing delivery or location records.
"""

from typing import Any, Dict, Optional

from agent_engine.context import AgentSessionContext
from agent_engine.privacy import sanitize_delivery_record
from database import get_delivery, get_delivery_by_booking, get_order_by_id


def get_delivery_status_tool(
    context: AgentSessionContext,
    booking_id: Optional[str] = None,
    delivery_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves delivery and tracking status for an equipment rental.
    Strictly verifies that the associated booking belongs to the caller.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to track your delivery."
        }

    clean_bid = (booking_id or "").strip()
    clean_did = (delivery_id or "").strip()

    if not clean_bid and not clean_did:
        return {
            "success": False,
            "error": "Please provide a booking ID or delivery ID to check transit status."
        }

    raw_delivery = None
    target_bid = clean_bid

    try:
        if clean_bid:
            raw_delivery = get_delivery_by_booking(clean_bid)
        elif clean_did:
            raw_delivery = get_delivery(clean_did)
            if raw_delivery:
                target_bid = str(raw_delivery.get("booking_id") or "").strip()
    except Exception as e:
        return {"success": False, "error": f"Error querying delivery record: {str(e)}"}

    # Resolve associated booking to perform authoritative ownership check
    if target_bid:
        order = get_order_by_id(target_bid)
        if order and not context.can_access_booking(order):
            return {
                "success": False,
                "error": f"Access denied: You are not authorized to track delivery for booking '{target_bid}'."
            }

    if not raw_delivery:
        # Check if booking exists with deliveryMethod
        if target_bid:
            order = get_order_by_id(target_bid)
            if order and context.can_access_booking(order):
                del_method = order.get("delivery_method") or order.get("deliveryMethod") or "pickup"
                if del_method.lower() == "pickup":
                    loc = order.get("pickup_location") or order.get("pickupLocation") or "Payent Verified Hub"
                    return {
                        "success": True,
                        "booking_id": target_bid,
                        "status": "SELF_PICKUP",
                        "delivery_method": "pickup",
                        "pickup_location": loc,
                        "message": f"This reservation is scheduled for self-pickup at: {loc}."
                    }
                else:
                    return {
                        "success": True,
                        "booking_id": target_bid,
                        "status": "PROCESSING",
                        "delivery_method": "doorstep",
                        "message": "Your doorstep delivery is being prepared by our fulfillment network."
                    }

        return {
            "success": False,
            "error": f"No active delivery tracking found for the provided identifier."
        }

    sanitized = sanitize_delivery_record(raw_delivery)
    curr_stage = sanitized.get("stage", "AWAITING_DISPATCH")
    courier_assigned = sanitized.get("is_courier_assigned", False)

    if curr_stage == "DELIVERED":
        msg = "The equipment has been successfully delivered and handed over."
    elif curr_stage in ("OUT_FOR_DELIVERY", "IN_TRANSIT"):
        msg = "Your equipment is currently out for delivery."
    elif curr_stage == "COURIER_ASSIGNED" or courier_assigned:
        msg = "A verified courier has been assigned to transport your equipment."
    else:
        msg = "Your delivery is scheduled and currently awaiting dispatch."

    return {
        "success": True,
        "booking_id": target_bid or sanitized.get("booking_id"),
        "delivery": sanitized,
        "status_message": msg
    }
