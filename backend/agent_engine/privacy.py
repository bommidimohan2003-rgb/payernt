"""
PAYENT AGENT — PRIVACY & SENSITIVE DATA MASKING
Provides automated sanitization, redaction, and projection filters for records
before any data reaches conversation context, tool responses, or agent logs.
"""

import re
from typing import Any, Dict, List, Optional, Union

# Sensitive field keys to strip completely from any serialized dictionary
FORBIDDEN_RECORD_KEYS = {
    "password_hash",
    "password",
    "pin",
    "pin_hash",
    "vendor_secret_pin",
    "vendorSecretPin",
    "secret_pin",
    "otp",
    "access_token",
    "refresh_token",
    "token",
    "secret_key",
    "api_key",
    "auth_token",
    "firebase_token",
    "signature",
}

REDACTION_AADHAAR = re.compile(r"\b(?:\d{4}[-\s]?){2}\d{4}\b")
REDACTION_PAN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", re.IGNORECASE)
REDACTION_CARD = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b")
REDACTION_PIN_OTP = re.compile(
    r"\b(?:otp|secret\s+pin|handover\s+pin|pin|password)\s*(?:is|:|=)?\s*([0-9a-zA-Z]{4,8})\b",
    re.IGNORECASE
)


def mask_aadhaar(val: str) -> str:
    """Masks 12-digit Aadhaar to XXXX-XXXX-1234."""
    digits = re.sub(r"\D", "", str(val or ""))
    if len(digits) == 12:
        return f"XXXX-XXXX-{digits[-4:]}"
    return "[REDACTED_AADHAAR]"


def mask_pan(val: str) -> str:
    """Masks 10-char PAN to XXXXXX1234."""
    clean = str(val or "").strip().upper()
    if len(clean) == 10:
        return f"XXXXXX{clean[5:9]}"
    return "[REDACTED_PAN]"


def mask_card(val: str) -> str:
    """Masks 16-digit Card to XXXX-XXXX-XXXX-1234."""
    digits = re.sub(r"\D", "", str(val or ""))
    if len(digits) == 16:
        return f"XXXX-XXXX-XXXX-{digits[-4:]}"
    return "[REDACTED_CARD]"


def mask_sensitive_text(text: Optional[str]) -> str:
    """Applies regex masking on sensitive strings (Aadhaar, PAN, Card, OTP, PIN, Passwords)."""
    if not text or not isinstance(text, str):
        return ""

    out = REDACTION_CARD.sub("[REDACTED_CARD]", text)
    out = REDACTION_AADHAAR.sub("[REDACTED_AADHAAR]", out)
    out = REDACTION_PAN.sub("[REDACTED_PAN]", out)
    out = REDACTION_PIN_OTP.sub("[REDACTED_PIN]", out)
    return out


def sanitize_dict_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively removes forbidden secret keys and masks PII attributes."""
    if not isinstance(record, dict):
        return record

    cleaned: Dict[str, Any] = {}
    for k, v in record.items():
        if k in FORBIDDEN_RECORD_KEYS:
            continue

        if isinstance(v, dict):
            cleaned[k] = sanitize_dict_fields(v)
        elif isinstance(v, list):
            cleaned[k] = [sanitize_dict_fields(item) if isinstance(item, dict) else item for item in v]
        elif k in ("aadhaar_number", "aadhaarNumber", "aadhaar"):
            cleaned[k] = mask_aadhaar(v)
        elif k in ("pan_number", "panNumber", "pan"):
            cleaned[k] = mask_pan(v)
        elif k in ("card_number", "cardNumber"):
            cleaned[k] = mask_card(v)
        else:
            cleaned[k] = v

    return cleaned


def sanitize_booking_record(order: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitizes an authoritative booking/order record for safe presentation to the agent.
    Guarantees that secret PINs, vendor credentials, and private payment secrets are purged.
    """
    if not order or not isinstance(order, dict):
        return {}

    safe = sanitize_dict_fields(dict(order))

    # Explicitly enforce removal of vendor_secret_pin under all casing variants
    safe.pop("vendor_secret_pin", None)
    safe.pop("vendorSecretPin", None)
    safe.pop("secret_pin", None)
    safe.pop("pin", None)
    safe.pop("pin_hash", None)

    # Project standard permitted fields
    b_id = safe.get("id") or safe.get("bookingId") or safe.get("booking_id")
    p_id = safe.get("productId") or safe.get("product_id")
    title = safe.get("productTitle") or safe.get("product_title") or safe.get("title") or "Rental Gear"
    st = safe.get("status") or "pending"
    start_d = safe.get("startDate") or safe.get("start_date")
    end_d = safe.get("endDate") or safe.get("end_date")
    tot = safe.get("total") or safe.get("amount") or safe.get("total_amount")

    # Payment and refund metadata
    pay_st = safe.get("payment_status") or safe.get("paymentStatus") or ("COMPLETED" if st in ("confirmed", "active", "completed") else "PENDING")
    ref_st = safe.get("refund_status") or safe.get("refundStatus") or "NONE"
    canc_st = safe.get("cancellation_request_status") or safe.get("cancellationRequestStatus") or ("CANCELLED" if st == "cancelled" else "NONE")

    return {
        "booking_id": b_id,
        "product_id": p_id,
        "product_title": title,
        "status": st,
        "start_date": start_d,
        "end_date": end_d,
        "total_amount": tot,
        "category": safe.get("category", "gear"),
        "delivery_method": safe.get("delivery_method") or safe.get("deliveryMethod") or "pickup",
        "pickup_location": safe.get("pickup_location") or safe.get("pickupLocation") or "",
        "delivery_address": safe.get("delivery_address") or safe.get("deliveryAddress") or "",
        "created_at": safe.get("created_at") or safe.get("createdAt"),
        "payment_status": pay_st,
        "refund_status": ref_st,
        "cancellation_request_status": canc_st,
        "cancelled_at": safe.get("cancelled_at") or safe.get("cancelledAt"),
        "cancellation_reason": safe.get("cancellation_reason") or safe.get("cancellationReason"),
    }


def sanitize_kyc_record(kyc: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes KYC verification responses, masking document numbers."""
    if not kyc or not isinstance(kyc, dict):
        return {
            "status": "NOT_STARTED",
            "account_type": "payrent",
            "document_type": "PAN",
            "is_approved": False,
        }

    st = (kyc.get("status") or "NOT_STARTED").upper()
    acc_type = kyc.get("accountType") or kyc.get("account_type") or "payrent"
    doc_type = kyc.get("expectedDocumentType") or kyc.get("documentType") or kyc.get("document_type") or ("AADHAAR" if acc_type == "payernt" else "PAN")

    raw_num = kyc.get("maskedNumber") or kyc.get("document_number_masked") or kyc.get("document_number")
    masked_num = mask_aadhaar(raw_num) if doc_type == "AADHAAR" else mask_pan(raw_num) if raw_num else None

    return {
        "status": st,
        "is_approved": bool(st == "APPROVED"),
        "account_type": acc_type,
        "document_type": doc_type,
        "masked_document_number": masked_num,
        "submitted_at": kyc.get("submittedAt") or kyc.get("submitted_at"),
        "reviewed_at": kyc.get("reviewedAt") or kyc.get("reviewed_at"),
        "rejection_reason": kyc.get("rejectionReason") or kyc.get("rejection_reason"),
        "allow_resubmission": bool(kyc.get("allowResubmission", st in ("NOT_STARTED", "REJECTED"))),
    }


def sanitize_delivery_record(delivery: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes delivery records, purging internal keys."""
    if not delivery or not isinstance(delivery, dict):
        return {}

    safe = sanitize_dict_fields(dict(delivery))
    return {
        "delivery_id": safe.get("id"),
        "booking_id": safe.get("booking_id") or safe.get("bookingId"),
        "status": safe.get("status") or "PENDING",
        "stage": safe.get("stage") or "AWAITING_DISPATCH",
        "delivery_method": safe.get("delivery_method") or "pickup",
        "pickup_location": safe.get("pickup_location") or "",
        "delivery_address": safe.get("delivery_address") or "",
        "scheduled_pickup_time": safe.get("scheduled_pickup_time"),
        "estimated_delivery_time": safe.get("estimated_delivery_time"),
        "actual_delivery_time": safe.get("actual_delivery_time"),
        "is_courier_assigned": bool(safe.get("courier_name") or safe.get("delivery_boy_id")),
    }


def sanitize_product_record(product: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes public product catalog records, purging vendor secret PIN."""
    if not product or not isinstance(product, dict):
        return {}

    safe = sanitize_dict_fields(dict(product))
    safe.pop("vendor_secret_pin", None)
    safe.pop("vendorSecretPin", None)
    safe.pop("secret_pin", None)

    return {
        "product_id": safe.get("id"),
        "name": safe.get("name") or safe.get("title") or "Rental Product",
        "title": safe.get("title") or safe.get("name") or "Rental Product",
        "category": safe.get("category", "gear"),
        "daily_rate": safe.get("daily_rate") or safe.get("dailyRate") or safe.get("price") or 0.0,
        "city": safe.get("city") or safe.get("location", {}).get("city") if isinstance(safe.get("location"), dict) else "",
        "condition_grade": safe.get("condition_grade") or safe.get("conditionGrade") or "Good",
        "available": bool(safe.get("available", True)),
        "description": safe.get("description", ""),
        "specifications": safe.get("specifications", ""),
    }


def sanitize_user_record(user: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes user account attributes, purging secrets and masking IDs."""
    if not user or not isinstance(user, dict):
        return {}

    safe = sanitize_dict_fields(dict(user))
    return {
        "email": safe.get("email"),
        "full_name": safe.get("full_name") or safe.get("name"),
        "role": safe.get("role", "customer"),
        "account_type": safe.get("account_type", "payrent"),
        "status": safe.get("status", "active"),
        "phone": safe.get("phone"),
        "city": safe.get("city"),
        "masked_aadhaar": safe.get("aadhaar_number"),
        "masked_pan": safe.get("pan_number"),
    }
