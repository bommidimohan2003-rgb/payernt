"""
PAYENT AGENT — PUBLIC PRODUCT DATABASE TOOLS
Surfaces catalog equipment specifications, pricing, and availability.
Permits public guest access while stripping vendor secret PINs and private seller data.
"""

from typing import Any, Dict

from agent_engine.context import AgentSessionContext
from agent_engine.privacy import sanitize_product_record
from database import find_authoritative_product


def get_public_product_info_tool(
    context: AgentSessionContext,
    product_id: str
) -> Dict[str, Any]:
    """
    Retrieves public listing information for a gear/product item.
    Available to both authenticated users and unauthenticated guests.
    """
    clean_pid = (product_id or "").strip()
    if not clean_pid:
        return {
            "success": False,
            "error": "Please provide a valid product identifier."
        }

    try:
        raw_product = find_authoritative_product(clean_pid)
    except Exception as e:
        return {
            "success": False,
            "error": f"Error finding product: {str(e)}"
        }

    if not raw_product:
        return {
            "success": False,
            "error": f"Product with ID '{clean_pid}' was not found in our catalog."
        }

    sanitized = sanitize_product_record(raw_product)
    return {
        "success": True,
        "product_id": clean_pid,
        "product": sanitized
    }
