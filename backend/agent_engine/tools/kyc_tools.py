"""
PAYENT AGENT — KYC VERIFICATION DATABASE TOOLS
Provides safe retrieval of identity verification status for renters and vendors.
Masks national identity document numbers (Aadhaar / PAN) and enforces account isolation.
"""

from typing import Any, Dict, Optional

from agent_engine.context import AgentSessionContext
from agent_engine.privacy import sanitize_kyc_record
from database import DatabaseConnectionError, get_user_kyc_status


def get_kyc_status_tool(
    context: AgentSessionContext,
    account_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves the authoritative KYC verification status for the authenticated user.
    Guests must be authenticated before viewing verification credentials.
    """
    if not context.is_authenticated:
        return {
            "success": False,
            "requires_auth": True,
            "error": "Authentication required. Please sign in to check your KYC status."
        }

    # Authoritatively resolve the target account type
    target_type = str(account_type or context.account_type or "payrent").lower().strip()
    norm_acc_type = "payernt" if target_type in ("payernt", "paye₹nt", "vendor", "lender") else "payrent"

    try:
        raw_kyc = get_user_kyc_status(context.clean_email, norm_acc_type)
    except DatabaseConnectionError:
        return {
            "success": False,
            "error": "Payent KYC verification service is temporarily unavailable due to a database connection delay. Please try again shortly.",
            "status": "service_unavailable",
            "database_error": True
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error retrieving KYC verification status: {str(e)}"
        }

    sanitized = sanitize_kyc_record(raw_kyc)
    curr_st = sanitized.get("status", "NOT_STARTED")

    if curr_st == "APPROVED":
        guidance = "Your KYC identity verification is approved and active. You have full access to marketplace rentals and listings."
        action = None
    elif curr_st == "PENDING":
        guidance = "Your identity documents have been submitted and are currently awaiting administrative review."
        action = "Review typically completes within 24 to 48 business hours."
    elif curr_st == "REJECTED":
        reason = sanitized.get("rejection_reason") or "Document readability or mismatch issue."
        guidance = f"Your KYC application was rejected with the following reason: {reason}."
        action = "You may re-upload a clear, valid identity document via your profile KYC section."
    else:
        doc_type = sanitized.get("document_type", "PAN" if norm_acc_type == "payrent" else "AADHAAR")
        guidance = f"You have not yet completed KYC verification. Verification requires a valid {doc_type} document."
        action = "Please complete identity verification in your dashboard to enable booking transactions."

    return {
        "success": True,
        "user_email": context.clean_email,
        "account_type": norm_acc_type,
        "kyc": sanitized,
        "guidance": guidance,
        "next_step": action
    }
