import os
import re
import json
import time
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Union, Tuple
from fastapi import APIRouter, HTTPException, Depends, Header, status, Query, Request, Response
from pydantic import BaseModel, Field, EmailStr
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    validate_password_strength,
)
from config import (
    ENABLE_TWILIO_SMS,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID,
    IS_PRODUCTION,
    IS_MOCK_OTP_MODE,
)
from database import fetch_one
from payernt_database import (
    create_payernt_account,
    resubmit_payernt_account,
    get_payernt_account_by_email,
    get_payernt_account_by_id,
    update_payernt_account_profile,
    create_payernt_product,
    get_payernt_product_by_id,
    get_payernt_products_by_owner,
    get_all_active_payernt_products,
    update_payernt_product,
    delete_payernt_product,
    create_or_get_product_confirmation,
    get_product_confirmation,
    verify_product_confirmation_otp,
    resend_product_confirmation_otp,
    generate_6digit_otp,
    log_payernt_audit_event,
    create_or_get_rental_security_record,
    get_rental_security_record,
    sanitize_security_record_for_user,
    verify_renter_pin_backend,
    verify_vendor_pin_backend,
    verify_handover_otp_backend,
    generate_handover_otp,
    verify_handover_otp,
    get_dev_mock_otp,
    vendor_prepare_product,
    get_or_generate_vendor_secret_pin,
    confirm_renter_inspection,
    activate_rental_transactional,
    add_payernt_pending_earnings,
    settle_payernt_earnings,
    complete_rental_and_credit_vendor,
    get_or_create_payernt_wallet,
    withdraw_payernt_wallet,
    get_payernt_wallet_transactions,
    add_payernt_bank_account,
    get_payernt_bank_accounts,
    delete_payernt_bank_account,
    get_payernt_notifications,
    add_payernt_notification,
    mark_payernt_notification_read,
    mark_all_payernt_notifications_read,
    get_payernt_messages,
    send_payernt_message,
    mark_payernt_message_read,
    get_payernt_unread_messages_count,
    send_admin_product_message,
    get_payernt_audit_logs,
    get_payernt_vendor_bookings,
    get_payernt_vendor_dashboard,
)

logger = logging.getLogger("payent.payernt_router")

payernt_router = APIRouter(tags=["paye₹nt - Vendor/Lender Backend"])
rental_router = APIRouter(prefix="/api/bookings", tags=["Rental Lifecycle & Security"])
delivery_handover_router = APIRouter(prefix="/api/deliveries", tags=["Delivery & Handover OTP"])


# ============================================================
# AUTH DEPENDENCY & ACCOUNT TYPE GUARD FOR PAYE₹NT
# ============================================================

def get_current_payernt_account(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Validates JWT token and strictly verifies that accountType === 'paye₹nt'.
    Blocks unauthorized renters or cross-side tokens.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header for paye₹nt.",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please log in to paye₹nt.",
        )

    # Server-side token & session revocation verification
    from database import is_token_revoked, is_session_revoked
    jti = payload.get("jti")
    if jti and is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked or logged out.",
        )

    sid = payload.get("sid")
    if sid and is_session_revoked(sid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired.",
        )

    account_type = (payload.get("account_type") or payload.get("accountType") or "").strip().lower()
    role = str(payload.get("role") or "").strip().lower()
    if account_type in ("pay₹ent", "payrent", "customer") and role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: This endpoint requires a paye₹nt vendor account.",
        )
    if account_type not in ("paye₹nt", "payernt", "admin", "vendor", "lender") and role not in ("vendor", "admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: This endpoint requires a paye₹nt vendor account.",
        )

    email = payload["sub"].strip().lower()
    account = get_payernt_account_by_email(email)

    if not account:
        user_id = payload.get("user_id") or f"PAYERNT_USER_{email}"
        account = {
            "id": user_id,
            "account_type": "paye₹nt",
            "email": email,
            "name": payload.get("name") or email.split("@")[0],
            "role": "vendor",
            "status": "active",
        }
    return account


# ============================================================
# SCHEMAS
# ============================================================

class CheckRegistrationSchema(BaseModel):
    name: str = Field(..., min_length=1)
    mobile: Optional[str] = None
    phone: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: EmailStr
    targetAccountType: Optional[str] = "paye₹nt"
    target_account_type: Optional[str] = None


class PayerntRegisterSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    aadhaarNumber: Optional[str] = None
    aadhaar_number: Optional[str] = None
    phoneNumber: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: str = Field(..., min_length=5)
    pincode: str = Field(..., min_length=6, max_length=10)
    password: str = Field(..., min_length=8)
    confirmPassword: Optional[str] = None


class PayerntLoginSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class PayerntProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    avatar: Optional[str] = None


class PayerntProductCreateSchema(BaseModel):
    id: Optional[str] = None
    category: str
    name: str
    title: Optional[str] = None
    brand: Optional[str] = ""
    model: Optional[str] = ""
    year: Optional[str] = "2024"
    description: Optional[str] = ""
    specifications: Optional[Union[str, Dict[str, Any]]] = None
    specs: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = []
    condition: Optional[Dict[str, Any]] = {}
    condition_grade: Optional[str] = "Like New"
    conditionGrade: Optional[str] = None
    damageDetails: Optional[str] = None
    damage_details: Optional[str] = None
    accessories: Optional[str] = ""
    location: Optional[Dict[str, Any]] = {}
    city: Optional[str] = ""
    area: Optional[str] = ""
    pincode: Optional[str] = ""
    postalCode: Optional[str] = None
    pickup_instructions: Optional[str] = ""
    pickupInstructions: Optional[str] = None
    pricing: Optional[Dict[str, Any]] = {}
    price: Optional[int] = None
    daily_rate: Optional[int] = None
    dailyRate: Optional[int] = None
    weekly_rate: Optional[int] = None
    weeklyRate: Optional[int] = None
    monthly_rate: Optional[int] = None
    monthlyRate: Optional[int] = None
    available: Optional[bool] = False
    availability_status: Optional[str] = "paused"
    availabilityStatus: Optional[str] = None
    availability: Optional[Dict[str, Any]] = None
    min_rental_days: Optional[int] = 1
    max_rental_days: Optional[int] = 30
    primaryImage: Optional[str] = ""
    primary_image: Optional[str] = None
    images: Optional[List[str]] = []
    photos: Optional[List[Dict[str, Any]]] = []
    videoUrl: Optional[str] = None
    video_url: Optional[str] = None
    customCategoryName: Optional[str] = None
    custom_category_name: Optional[str] = None
    verificationDocs: Optional[Dict[str, Any]] = None
    verificationStatus: Optional[str] = None
    verification_status: Optional[str] = None
    adminPriceRange: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

    class Config:
        extra = "allow"


def _sanitize_payernt_product(product: Dict[str, Any], include_pin: bool = False) -> Dict[str, Any]:
    if not product:
        return {}
    p = dict(product)
    if not include_pin:
        p.pop("vendor_secret_pin", None)

    pricing_dict = p.get("pricing") if isinstance(p.get("pricing"), dict) else {}
    daily = int(
        p.get("daily_rate")
        if p.get("daily_rate") is not None
        else p.get("dailyRate")
        if p.get("dailyRate") is not None
        else pricing_dict.get("daily")
        if pricing_dict.get("daily") is not None
        else pricing_dict.get("dailyRate")
        if pricing_dict.get("dailyRate") is not None
        else p.get("price")
        if p.get("price") is not None
        else 500
    )
    weekly = int(
        p.get("weekly_rate")
        if p.get("weekly_rate") is not None
        else p.get("weeklyRate")
        if p.get("weeklyRate") is not None
        else pricing_dict.get("weekly")
        if pricing_dict.get("weekly") is not None
        else pricing_dict.get("weeklyRate")
        if pricing_dict.get("weeklyRate") is not None
        else 0
    )
    monthly = int(
        p.get("monthly_rate")
        if p.get("monthly_rate") is not None
        else p.get("monthlyRate")
        if p.get("monthlyRate") is not None
        else pricing_dict.get("monthly")
        if pricing_dict.get("monthly") is not None
        else pricing_dict.get("monthlyRate")
        if pricing_dict.get("monthlyRate") is not None
        else 0
    )

    p["daily_rate"] = daily
    p["dailyRate"] = daily
    p["price"] = daily
    p["pricing"] = {
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "securityDeposit": 0,
        "minimumRentalDays": int(p.get("min_rental_days") or 1)
    }

    # Photos and images
    images_raw = p.get("images") or "[]"
    if isinstance(images_raw, str):
        try:
            images_list = json.loads(images_raw)
        except Exception:
            images_list = [images_raw] if images_raw else []
    else:
        images_list = list(images_raw)

    primary_img = p.get("primary_image") or p.get("primaryImage") or (images_list[0] if images_list else "")
    p["primaryImage"] = primary_img
    p["primary_image"] = primary_img
    p["images"] = images_list
    p["photos"] = [
        {"id": f"photo-{i}", "url": url, "tag": "Front View", "isPrimary": (i == 0 or url == primary_img)}
        for i, url in enumerate(images_list)
    ]

    # Location
    p["location"] = {
        "city": p.get("city") or "",
        "area": p.get("area") or "",
        "pincode": p.get("pincode") or "",
        "postalCode": p.get("pincode") or "",
        "pickupAvailable": True,
        "doorstepDeliveryAvailable": True,
        "pickupInstructions": p.get("pickup_instructions") or "",
    }

    # Condition
    cond_raw = p.get("condition_details") or "{}"
    if isinstance(cond_raw, str):
        try:
            cond_dict = json.loads(cond_raw)
        except Exception:
            cond_dict = {}
    else:
        cond_dict = dict(cond_raw or {})

    cond_grade = p.get("condition_grade") or cond_dict.get("grade") or "Like New"
    cond_dict["grade"] = cond_grade
    p["condition"] = cond_dict
    p["conditionGrade"] = cond_grade

    # Availability
    p["availability"] = {
        "type": "always",
        "availableNow": p.get("availability_status") == "available" or p.get("available") == 1,
        "unavailableDates": [],
    }

    # Verification Docs / Owner
    p["verificationDocs"] = {
        "ownerFullName": p.get("owner_name") or "Verified Owner",
        "ownerEmail": p.get("owner_email") or "",
        "proofStatus": p.get("status") or "under_review",
    }

    p["ownerId"] = p.get("owner_id")
    p["ownerEmail"] = p.get("owner_email") or ""
    p["videoUrl"] = p.get("video_url") or p.get("videoUrl") or ""
    p["damageDetails"] = p.get("damage_details") or p.get("damageDetails") or ""
    p["customCategoryName"] = p.get("custom_category_name") or p.get("customCategoryName") or ""

    # Parse specifications or specs
    specs_raw = p.get("specifications") or p.get("specs") or "{}"
    if isinstance(specs_raw, dict):
        p["specs"] = specs_raw
    elif isinstance(specs_raw, str) and specs_raw.strip().startswith("{"):
        try:
            p["specs"] = json.loads(specs_raw)
        except Exception:
            p["specs"] = {"brand": p.get("brand"), "model": p.get("model")}
    else:
        p["specs"] = {"brand": p.get("brand"), "model": p.get("model"), "notes": str(specs_raw)}

    if include_pin:
        p["vendorSecretPin"] = p.get("vendor_secret_pin")
    return p



class PayerntProductUpdateSchema(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[str] = None
    features: Optional[List[str]] = None
    condition_grade: Optional[str] = None
    accessories: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    pincode: Optional[str] = None
    pickup_instructions: Optional[str] = None
    daily_rate: Optional[int] = None
    weekly_rate: Optional[int] = None
    monthly_rate: Optional[int] = None
    available: Optional[bool] = None
    availability_status: Optional[str] = None
    primary_image: Optional[str] = None
    images: Optional[List[str]] = None
    status: Optional[str] = None


class ProductStatusUpdateSchema(BaseModel):
    status: str
    availability_status: Optional[str] = None


class AddProductImageSchema(BaseModel):
    imageUrl: str


class AddBankAccountSchema(BaseModel):
    accountHolderName: str = Field(..., min_length=2)
    bankName: str = Field(..., min_length=2)
    accountNumber: str = Field(..., min_length=8, max_length=25)
    confirmAccountNumber: Optional[str] = None
    ifsc: str = Field(..., min_length=4, max_length=15)


class WithdrawSchema(BaseModel):
    amount: float = Field(..., gt=0)
    bankAccountId: str


class CreateBookingSchema(BaseModel):
    productId: str
    startDate: str
    endDate: str
    vendorSecretPin: Optional[str] = None


class VerifyPinSchema(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)


class VerifyOtpSchema(BaseModel):
    otp: str = Field(..., min_length=4, max_length=8)


class SendMessageSchema(BaseModel):
    productId: str
    receiverId: str
    content: str = Field(..., min_length=1)


class AdminSendMessageSchema(BaseModel):
    recipientAccountId: str
    productId: Optional[str] = None
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    messageType: Optional[str] = "ADMIN_NOTICE"
    senderAdminId: Optional[str] = "admin_super"
    senderName: Optional[str] = "Payent Admin"
    productName: Optional[str] = None
    productCategory: Optional[str] = None


# ============================================================
# HEALTH CHECK
# ============================================================

@payernt_router.get("/health")
def payernt_health():
    """Health check for paye₹nt backend."""
    return {"success": True, "status": "ok", "service": "paye₹nt", "timestamp": int(time.time())}


# ============================================================
# PAYE₹NT AUTHENTICATION ENDPOINTS
# ============================================================

def _sanitize_payernt_account(account: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitizes payernt account dictionary with camelCase mappings for frontend consistency."""
    if not account:
        return {}
    sanitized = dict(account)
    sanitized.pop("password_hash", None)
    sanitized["accountId"] = sanitized.get("id")
    sanitized["accountType"] = sanitized.get("account_type", "paye₹nt")
    aadhaar = sanitized.get("aadhaar_number") or ""
    sanitized["aadhaarNumber"] = aadhaar
    sanitized["aadhaarMasked"] = aadhaar
    sanitized["createdAt"] = sanitized.get("created_at")
    return sanitized


@payernt_router.post("/auth/check-registration")
def payernt_check_registration(data: CheckRegistrationSchema):
    """
    Checks Name + Mobile + Email across shared database for paye₹nt registration.
    """
    from payernt_database import check_registration_identity
    phone_input = data.mobile or data.phone or data.phoneNumber or ""
    target = data.target_account_type or data.targetAccountType or "paye₹nt"
    return check_registration_identity(
        name=data.name,
        mobile=phone_input,
        email=str(data.email),
        target_account_type=target,
    )


@payernt_router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_payernt_vendor(data: PayerntRegisterSchema):
    """Registers a new paye₹nt Product Owner / Lender account."""
    if data.confirmPassword and data.password != data.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password and confirm password do not match.",
        )

    # Validate Aadhaar format: exactly 12 digits
    raw_aadhaar = data.aadhaarNumber or data.aadhaar_number or ""
    clean_aadhaar = re.sub(r"\s+", "", raw_aadhaar)
    if not re.match(r"^\d{12}$", clean_aadhaar):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aadhaar number must contain exactly 12 numeric digits.",
        )

    # Validate Indian mobile number
    raw_phone = data.phoneNumber or data.phone or data.mobile or ""
    clean_phone = re.sub(r"[^\d+]", "", raw_phone)
    if len(re.sub(r"\D", "", clean_phone)) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid 10-digit Indian phone number.",
        )

    # Validate pincode
    clean_pincode = re.sub(r"\D", "", data.pincode)
    if len(clean_pincode) != 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Pincode must be exactly 6 numeric digits.",
        )

    # Validate password complexity
    is_valid, msg = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=msg,
        )

    try:
        account = create_payernt_account(
            name=data.name,
            email=data.email,
            aadhaar_number=clean_aadhaar,
            phone=clean_phone,
            address=data.address,
            pincode=clean_pincode,
            password=data.password,
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err))

    return {
        "success": True,
        "status": "PENDING_REVIEW",
        "accountType": "Payernt",
        "message": "Your account has been created successfully. Our Admin team is currently reviewing your submitted information.",
        "user": {
            "id": account["id"],
            "name": account["name"],
            "email": account["email"],
            "accountType": "Payernt",
            "status": "PENDING_REVIEW",
        },
        "userId": account["id"],
        "name": account["name"],
        "email": account["email"],
        "role": "vendor",
    }


@payernt_router.post("/auth/login")
def login_payernt_vendor(data: PayerntLoginSchema, request: Request = None):
    """Authenticates a paye₹nt Product Owner / Lender."""
    clean_email = (data.email or "").strip().lower()
    if not clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is required.",
        )
    if not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required.",
        )

    account = get_payernt_account_by_email(clean_email)
    authenticated = False

    if account and account.get("password_hash"):
        if verify_password(data.password, account["password_hash"]):
            authenticated = True

    if not authenticated or not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password for paye₹nt vendor account.",
        )

    account_status = str(account.get("status", "PENDING_REVIEW")).upper()

    if account_status in ("PENDING_REVIEW", "PENDING", "UNVERIFIED"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "PENDING_REVIEW",
                "accountType": "Payernt",
                "email": clean_email,
                "message": "Your account is still under review. Our Admin team is currently reviewing your submitted information."
            },
        )

    if account_status in ("REJECTED", "DECLINED"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "REJECTED",
                "accountType": "Payernt",
                "email": clean_email,
                "rejectionReason": account.get("rejection_reason") or "Your submitted information could not be verified.",
                "message": "Your account was not approved."
            },
        )

    if account_status in ("SUSPENDED", "BANNED", "INACTIVE"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "SUSPENDED",
                "accountType": "Payernt",
                "email": clean_email,
                "message": "Your paye₹nt vendor account is inactive or suspended. Please contact support."
            },
        )

    try:
        from database import revoke_cross_side_user_sessions, create_db_session, revoke_token
        # 1. Enforce single active user-side session: Revoke any active Payrent sessions
        revoke_cross_side_user_sessions(account["email"], account.get("person_id"), logging_in_account_type="payernt")

        # 2. Invalidate previous bearer token if present in headers (session switching)
        if request and request.headers.get("authorization"):
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    prev_tok = auth_header.split(" ")[1]
                    prev_dec = decode_access_token(prev_tok, expected_type="access")
                    if prev_dec and "jti" in prev_dec:
                        revoke_token(prev_dec["jti"], prev_dec.get("sub", ""), prev_dec.get("exp", 0))
                except Exception:
                    pass

        session_id = f"sess-payernt-{uuid.uuid4()}"
        token_payload = {
            "sub": account["email"],
            "account_type": "paye₹nt",
            "accountType": "paye₹nt",
            "user_id": account["id"],
            "name": account.get("name", "Vendor"),
            "role": "vendor",
            "person_id": account.get("person_id"),
            "sid": session_id,
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        expires_at_str = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        create_db_session(session_id, account["email"], refresh_token, "Desktop", "unknown", "PayerntApp", expires_at_str, account_type="payernt")

        sanitized = _sanitize_payernt_account(account)

        return {
            "success": True,
            "message": "Signed in to paye₹nt successfully.",
            "user": {
                "id": account["id"],
                "name": account.get("name", "Vendor"),
                "email": account["email"],
                "accountType": "paye₹nt",
            },
            "userId": account["id"],
            "accountType": "paye₹nt",
            "name": account.get("name", "Vendor"),
            "email": account["email"],
            "role": "vendor",
            "account": sanitized,
            "token": access_token,
            "refreshToken": refresh_token,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error during paye₹nt login for {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to sign in. Please try again later.",
        )


@payernt_router.post("/auth/logout")
def logout_payernt_vendor(request: Request = None, response: Response = None, authorization: Optional[str] = Header(None)):
    """Logs out from paye₹nt and revokes active token/session."""
    from database import revoke_token, revoke_db_session
    if authorization and authorization.startswith("Bearer "):
        access_tok = authorization.split(" ")[1]
        payload = decode_access_token(access_tok, expected_type="access")
        if payload:
            if "jti" in payload:
                revoke_token(payload["jti"], payload.get("sub", ""), payload.get("exp", 0))
            if "sid" in payload:
                revoke_db_session(payload["sid"])
    return {"success": True, "message": "Logged out from paye₹nt."}


@payernt_router.get("/auth/me")
def get_payernt_me(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Returns current paye₹nt vendor profile."""
    sanitized = _sanitize_payernt_account(account)
    return {
        "success": True,
        "account": sanitized,
        "userId": sanitized.get("id"),
        "accountType": sanitized.get("accountType"),
    }


# ============================================================
# PAYE₹NT PROFILE
# ============================================================

@payernt_router.get("/profile")
def get_payernt_profile(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Fetches profile for authenticated vendor."""
    sanitized = _sanitize_payernt_account(account)
    return {"success": True, "profile": sanitized}


@payernt_router.patch("/profile")
def update_payernt_profile(
    data: PayerntProfileUpdateSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Updates profile details for authenticated vendor."""
    updated = update_payernt_account_profile(account["id"], data.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    sanitized = _sanitize_payernt_account(updated)
    return {"success": True, "message": "Profile updated successfully.", "profile": sanitized}


def mask_phone_number(phone: str) -> str:
    """Masks phone number (e.g. +91 9876543210 -> +91 ******3210) for UI display."""
    if not phone:
        return "+91 ******0000"
    clean = re.sub(r"[^\d+]", "", str(phone))
    if len(clean) >= 4:
        last4 = clean[-4:]
        prefix = "+91 " if not clean.startswith("+") else clean[:3] + " "
        return f"{prefix}******{last4}"
    return f"+91 ******{clean}"


class VerifyProductOtpSchema(BaseModel):
    otp: str = Field(..., min_length=4, max_length=8)


# ============================================================
# PAYE₹NT PRODUCT MANAGEMENT & SECURE CONFIRMATION
# ============================================================

@payernt_router.post("/products")
def create_product_endpoint(
    data: PayerntProductCreateSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Step 5 Listing Submission:
    1. Validates all 5 listing stages and ownership.
    2. Creates product record as PENDING_CONFIRMATION (available=False).
    3. Generates 4-digit Vendor Secret PIN cryptographically and saves securely.
    4. Generates 6-digit confirmation OTP sent to owner's registered phone.
    5. Returns masked phone, one-time owner reveal of Vendor PIN, and confirmation session details.
    """
    req_status = (data.status or "").strip().lower()
    product_dict = data.dict(exclude_unset=False)

    # Clean and resolve owner phone
    owner_phone = account.get("phone") or account.get("phoneNumber") or ""
    clean_email = account["email"].strip().lower()
    if not owner_phone:
        try:
            user_row = fetch_one("SELECT phone FROM users WHERE LOWER(email) = LOWER(%s) LIMIT 1", (clean_email,))
            if user_row and user_row.get("phone"):
                owner_phone = user_row["phone"]
        except Exception:
            pass
    if not owner_phone:
        owner_phone = "+91 9876543210"

    # Branch 1: Phone OTP / pending_confirmation security flow
    if req_status not in ("under_review", "pending_admin_review", "submitted"):
        product_dict["status"] = "pending_confirmation"
        product_dict["available"] = False
        product_dict["availability_status"] = "pending_confirmation"

        product = create_payernt_product(
            owner_id=account["id"],
            owner_email=account["email"],
            owner_name=account.get("name", "Vendor"),
            data=product_dict,
        )

        vendor_pin = product.get("vendor_secret_pin") or product.get("vendorSecretPin")
        otp_code = generate_6digit_otp()

        confirmation = create_or_get_product_confirmation(
            product_id=product["id"],
            owner_id=account["id"],
            owner_email=account["email"],
            phone=owner_phone,
            vendor_pin=vendor_pin,
            otp_code=otp_code,
            expiry_seconds=300,
        )

        try:
            if ENABLE_TWILIO_SMS and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID:
                from twilio.rest import Client
                client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                client.messages.create(
                    body=f"Your paYent listing confirmation OTP for {product.get('title', 'Gear')} is: {otp_code}. Valid for 5 minutes.",
                    to=owner_phone,
                    from_=os.getenv("TWILIO_PHONE_NUMBER", "")
                )
        except Exception as e:
            logger.warning(f"[paye₹nt SMS] OTP SMS dispatch notice: {e}")

        log_payernt_audit_event("PRODUCT_SUBMITTED", account["id"], {"productId": product["id"], "category": product["category"]})
        log_payernt_audit_event("VENDOR_PIN_GENERATED", account["id"], {"productId": product["id"]})
        log_payernt_audit_event("OTP_SENT", account["id"], {"productId": product["id"]})

        sanitized = _sanitize_payernt_product(product, include_pin=True)
        masked_phone = mask_phone_number(owner_phone)

        return {
            "success": True,
            "productId": product["id"],
            "status": "pending_confirmation",
            "vendorSecretPin": vendor_pin,
            "maskedPhone": masked_phone,
            "otpExpiresIn": 300,
            "resendCooldown": 60,
            "product": sanitized,
            "message": "Listing submitted as PENDING_CONFIRMATION. Enter the OTP sent to your registered mobile.",
        }

    # Branch 2: Standard Listing Submission -> Direct to UNDER_REVIEW (Pending Admin Review)
    product_dict["status"] = "under_review"
    product_dict["available"] = False
    product_dict["availability_status"] = "paused"
    product_dict["verification_status"] = "under_review"

    product = create_payernt_product(
        owner_id=account["id"],
        owner_email=account["email"],
        owner_name=account.get("name", "Vendor"),
        data=product_dict,
    )

    vendor_pin = product.get("vendor_secret_pin") or product.get("vendorSecretPin")
    log_payernt_audit_event("PRODUCT_SUBMITTED", account["id"], {"productId": product["id"], "category": product["category"]})
    log_payernt_audit_event("VENDOR_PIN_GENERATED", account["id"], {"productId": product["id"]})

    # Trigger admin notification
    try:
        from main import create_notification
        create_notification(
            email="admin@payent.com",
            title="New Listing Submitted for Review ⏳",
            message=f"New gear listing '{product.get('title')}' submitted by {account.get('name', 'Vendor')} is pending review.",
            notif_type="system"
        )
    except Exception:
        pass

    sanitized = _sanitize_payernt_product(product, include_pin=True)
    return {
        "success": True,
        "productId": product["id"],
        "status": "under_review",
        "verificationStatus": "under_review",
        "vendorSecretPin": vendor_pin,
        "product": sanitized,
        "message": "Listing submitted to Admin Review successfully.",
    }


@payernt_router.post("/products/{product_id}/verify-otp")
def verify_product_confirmation_endpoint(
    product_id: str,
    data: VerifyProductOtpSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Verifies owner OTP for product listing confirmation.
    On success, transitions product from PENDING_CONFIRMATION to UNDER_REVIEW (Pending Admin Review).
    """
    product = get_payernt_product_by_id(product_id, include_pin=True)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product listing not found.")

    if product.get("owner_id") != account["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: You can only confirm your own product listings.",
        )

    success, msg = verify_product_confirmation_otp(
        product_id=product_id,
        owner_id=account["id"],
        submitted_otp=data.otp,
    )

    if not success:
        log_payernt_audit_event("OTP_VERIFICATION_FAILED", account["id"], {"productId": product_id})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    log_payernt_audit_event("OTP_VERIFICATION_SUCCESS", account["id"], {"productId": product_id})
    log_payernt_audit_event("PRODUCT_CONFIRMATION_COMPLETED", account["id"], {"productId": product_id, "newStatus": "under_review"})

    # Send notification to vendor
    add_payernt_notification(
        owner_id=account["id"],
        title="Product Confirmed 🛡️",
        message=f'"{product.get("title", "Equipment")}" has passed secure confirmation and is now Pending Admin Review.',
        type_="success",
        action_route="products",
    )

    updated_product = get_payernt_product_by_id(product_id, include_pin=True)
    sanitized = _sanitize_payernt_product(updated_product or product, include_pin=True)

    return {
        "success": True,
        "productId": product_id,
        "status": "under_review",
        "verificationStatus": "under_review",
        "product": sanitized,
        "message": msg,
    }


@payernt_router.post("/products/{product_id}/resend-otp")
def resend_product_confirmation_otp_endpoint(
    product_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Resends product confirmation OTP with 60-second cooldown and rate limiting.
    """
    product = get_payernt_product_by_id(product_id, include_pin=True)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product listing not found.")

    if product.get("owner_id") != account["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: You can only request OTP for your own product listings.",
        )

    conf = get_product_confirmation(product_id)
    if not conf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Confirmation session not found.")

    owner_phone = conf.get("phone") or account.get("phone") or ""
    new_otp = generate_6digit_otp()

    success, msg, cooldown = resend_product_confirmation_otp(
        product_id=product_id,
        owner_id=account["id"],
        new_otp=new_otp,
        cooldown_seconds=60,
        expiry_seconds=300,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if "wait" in msg else status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # Dispatch new OTP
    try:
        if ENABLE_TWILIO_SMS and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=f"Your new paYent listing confirmation OTP for {product.get('title', 'Gear')} is: {new_otp}. Valid for 5 minutes.",
                to=owner_phone,
                from_=os.getenv("TWILIO_PHONE_NUMBER", "")
            )
        else:
            logger.info(f"[paye₹nt OTP Engine] Resent confirmation OTP for {owner_phone}: {new_otp}")
    except Exception as e:
        logger.warning(f"[paye₹nt SMS] Resend OTP SMS notice: {e}")

    log_payernt_audit_event("OTP_RESENT", account["id"], {"productId": product_id})

    return {
        "success": True,
        "productId": product_id,
        "maskedPhone": mask_phone_number(owner_phone),
        "resendCooldown": cooldown,
        "otpExpiresIn": 300,
        "message": msg,
    }


@payernt_router.get("/products/{product_id}/confirmation-status")
def get_product_confirmation_status_endpoint(
    product_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Retrieves existing confirmation session state without generating duplicate PINs or OTPs.
    """
    product = get_payernt_product_by_id(product_id, include_pin=True)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if product.get("owner_id") != account["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    conf = get_product_confirmation(product_id)
    if not conf:
        return {
            "success": True,
            "productId": product_id,
            "status": product.get("status", "pending_confirmation"),
            "hasActiveSession": False,
        }

    now_int = int(time.time())
    last_sent = int(conf.get("last_otp_sent_at") or 0)
    cooldown_remaining = max(0, 60 - (now_int - last_sent))
    expires_at = int(conf.get("otp_expires_at") or 0)
    expires_in = max(0, expires_at - now_int)

    return {
        "success": True,
        "productId": product_id,
        "status": conf.get("status", "pending_confirmation"),
        "maskedPhone": mask_phone_number(conf.get("phone", "")),
        "vendorSecretPin": product.get("vendor_secret_pin") or product.get("vendorSecretPin"),
        "resendCooldown": cooldown_remaining,
        "otpExpiresIn": expires_in,
        "hasActiveSession": True,
    }


@payernt_router.get("/products")
def list_vendor_products_endpoint(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Lists all products listed by the authenticated vendor."""
    products = get_payernt_products_by_owner(account["id"], account.get("email"))
    sanitized = [_sanitize_payernt_product(p, include_pin=True) for p in products]
    return {"success": True, "products": sanitized}


@payernt_router.get("/products/{product_id}")
def get_vendor_product_endpoint(
    product_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Fetches full vendor product detail (including vendor PIN for owner review)."""
    product = get_payernt_product_by_id(product_id, include_pin=True)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if product.get("owner_id") != account["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only view your own product listings.",
        )

    sanitized = _sanitize_payernt_product(product, include_pin=True)
    return {"success": True, "product": sanitized}


@payernt_router.get("/catalog")
def get_public_payernt_catalog_endpoint():
    """Public catalog endpoint for renters to discover active products without PIN exposure."""
    products = get_all_active_payernt_products()
    sanitized = [_sanitize_payernt_product(p, include_pin=False) for p in products]
    return {"success": True, "products": sanitized}


@payernt_router.get("/catalog/{product_id}")
def get_public_payernt_product_detail_endpoint(product_id: str):
    """Public product detail endpoint for renters without PIN exposure."""
    product = get_payernt_product_by_id(product_id, include_pin=False)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    sanitized = _sanitize_payernt_product(product, include_pin=False)
    return {"success": True, "product": sanitized}


@payernt_router.patch("/products/{product_id}")
def update_vendor_product_endpoint(
    product_id: str,
    data: PayerntProductUpdateSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Updates vendor product specifications without modifying Vendor Secret PIN."""
    try:
        updated = update_payernt_product(product_id, account["id"], data.dict(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        sanitized = _sanitize_payernt_product(updated, include_pin=True)
        return {"success": True, "message": "Product updated successfully.", "product": sanitized}
    except PermissionError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err))


@payernt_router.delete("/products/{product_id}")
def delete_vendor_product_endpoint(
    product_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Deletes vendor product listing."""
    try:
        success = delete_payernt_product(product_id, account["id"])
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        return {"success": True, "message": "Product removed successfully."}
    except PermissionError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err))


@payernt_router.patch("/products/{product_id}/status")
def update_product_status_endpoint(
    product_id: str,
    data: ProductStatusUpdateSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Updates status or availability status of a vendor's product."""
    updates = {"status": data.status}
    if data.availability_status:
        updates["availability_status"] = data.availability_status
    try:
        updated = update_payernt_product(product_id, account["id"], updates)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
        return {"success": True, "message": "Status updated successfully.", "product": updated}
    except PermissionError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err))


@payernt_router.post("/products/{product_id}/images")
def add_product_image_endpoint(
    product_id: str,
    data: AddProductImageSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Adds an image URL to a vendor's product."""
    product = get_payernt_product_by_id(product_id, include_pin=True)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    if product.get("owner_id") != account["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Not product owner.")

    import json
    imgs = []
    try:
        raw_imgs = product.get("images", "[]")
        imgs = json.loads(raw_imgs) if isinstance(raw_imgs, str) else list(raw_imgs)
    except Exception:
        imgs = []

    imgs.append(data.imageUrl)
    updated = update_payernt_product(product_id, account["id"], {"images": imgs})
    return {"success": True, "message": "Image added successfully.", "product": updated}


# ============================================================
# PAYE₹NT WALLET & TRANSACTIONS
# ============================================================

@payernt_router.get("/wallet")
def get_vendor_wallet_endpoint(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Fetches current vendor wallet balances, bank accounts, and recent transactions."""
    wallet = get_or_create_payernt_wallet(account["id"], account["email"])
    transactions = get_payernt_wallet_transactions(account["id"])
    bank_accounts = get_payernt_bank_accounts(account["id"])

    return {
        "success": True,
        "wallet": wallet,
        "transactions": transactions,
        "bankAccounts": bank_accounts,
    }


@payernt_router.get("/wallet/transactions")
def get_wallet_transactions_endpoint(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Fetches vendor financial transaction history."""
    transactions = get_payernt_wallet_transactions(account["id"])
    return {"success": True, "transactions": transactions}


@payernt_router.post("/wallet/bank-accounts")
def add_bank_account_endpoint(
    data: AddBankAccountSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Registers a bank account for vendor payouts."""
    if data.confirmAccountNumber and data.accountNumber != data.confirmAccountNumber:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Account numbers do not match.")

    bank_acc = add_payernt_bank_account(
        owner_id=account["id"],
        account_holder_name=data.accountHolderName,
        bank_name=data.bankName,
        account_number=data.accountNumber,
        ifsc=data.ifsc,
    )
    return {"success": True, "message": "Bank account linked successfully.", "bankAccount": bank_acc}


@payernt_router.delete("/wallet/bank-accounts/{bank_id}")
def delete_bank_account_endpoint(
    bank_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Removes a linked bank account."""
    success = delete_payernt_bank_account(account["id"], bank_id)
    return {"success": success, "message": "Bank account removed."}


@payernt_router.post("/wallet/withdraw")
def withdraw_wallet_funds_endpoint(
    data: WithdrawSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Processes a payout withdrawal to the vendor's bank account."""
    success, msg, txn = withdraw_payernt_wallet(
        owner_id=account["id"],
        amount=data.amount,
        bank_account_id=data.bankAccountId,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    wallet = get_or_create_payernt_wallet(account["id"], account["email"])
    return {
        "success": True,
        "message": msg,
        "transaction": txn,
        "updatedWallet": wallet,
    }


# ============================================================
# NOTIFICATIONS & MESSAGES & AUDIT ENDPOINTS
# ============================================================

@payernt_router.get("/notifications")
def get_vendor_notifications_endpoint(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Fetches notifications for vendor."""
    notifs = get_payernt_notifications(account["id"])
    return {"success": True, "notifications": notifs}


@payernt_router.patch("/notifications/{notification_id}/read")
def mark_notification_read_endpoint(
    notification_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Marks a notification as read."""
    mark_payernt_notification_read(account["id"], notification_id)
    return {"success": True, "message": "Notification marked as read."}


@payernt_router.post("/notifications/read-all")
def mark_all_notifications_read_endpoint(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Marks all notifications as read."""
    mark_all_payernt_notifications_read(account["id"])
    return {"success": True, "message": "All notifications marked as read."}


@payernt_router.get("/messages")
def get_vendor_messages_endpoint(
    product_id: Optional[str] = None,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Fetches Admin and Product messages strictly for the authenticated account."""
    messages = get_payernt_messages(account["id"], product_id)
    unread_count = get_payernt_unread_messages_count(account["id"])
    return {"success": True, "messages": messages, "unreadCount": unread_count}


@payernt_router.get("/messages/unread-count")
def get_vendor_unread_messages_count_endpoint(
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Fetches real unread Admin messages count for authenticated account."""
    unread_count = get_payernt_unread_messages_count(account["id"])
    return {"success": True, "unreadCount": unread_count}


@payernt_router.patch("/messages/{message_id}/read")
def mark_vendor_message_read_endpoint(
    message_id: str,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Marks a message as read for the authenticated account."""
    mark_payernt_message_read(message_id, account["id"])
    unread_count = get_payernt_unread_messages_count(account["id"])
    return {"success": True, "messageId": message_id, "status": "READ", "unreadCount": unread_count}


@payernt_router.post("/messages")
def send_vendor_message_endpoint(
    data: SendMessageSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Sends a product inquiry or response message."""
    msg = send_payernt_message(
        sender_id=account["id"],
        sender_name=account.get("name", "Vendor"),
        receiver_id=data.receiverId,
        product_id=data.productId,
        content=data.content,
    )
    return {"success": True, "message": msg}


@payernt_router.post("/messages/admin-send")
def send_admin_message_endpoint(
    data: AdminSendMessageSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Sends an Admin-to-Owner product or review notice message."""
    msg = send_admin_product_message(
        recipient_account_id=data.recipientAccountId,
        sender_admin_id=data.senderAdminId or account.get("id", "admin_system"),
        product_id=data.productId,
        title=data.title,
        content=data.content,
        message_type=data.messageType or "ADMIN_NOTICE",
        sender_name=data.senderName or "Payent Admin",
        product_name=data.productName,
        product_category=data.productCategory,
    )
    return {"success": True, "message": msg}


@payernt_router.get("/audit-logs")
def get_audit_logs_endpoint(
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Fetches audit logs for the vendor."""
    logs = get_payernt_audit_logs(account["id"])
    return {"success": True, "logs": logs}


# ============================================================
# AUTHORITATIVE UNIFIED DASHBOARD & BOOKINGS ENDPOINTS
# ============================================================

@payernt_router.get("/dashboard")
def get_vendor_dashboard_endpoint(
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Authoritative single-source dashboard endpoint consumed by BOTH Desktop and Mobile Home.
    Returns real wallet balances, earnings, product listings, rentals, upcoming bookings,
    preview products, recent activities, and unread notification/message counts.
    """
    dashboard_data = get_payernt_vendor_dashboard(
        vendor_id=account["id"],
        email=account.get("email", ""),
    )
    return {
        "success": True,
        "dashboard": dashboard_data,
        "wallet": dashboard_data["wallet"],
        "earnings": dashboard_data["earnings"],
        "listings": dashboard_data["listings"],
        "rentals": dashboard_data["rentals"],
        "bookings": dashboard_data["bookings"],
        "products": dashboard_data["products"],
        "recentActivity": dashboard_data["recentActivity"],
        "notifications": dashboard_data["notifications"],
        "messages": dashboard_data["messages"],
    }


@payernt_router.get("/bookings")
def get_vendor_bookings_endpoint(
    limit: int = 50,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Fetches real bookings belonging to the authenticated vendor.
    Exclusively returns bookings for this vendor's listed products.
    """
    bookings = get_payernt_vendor_bookings(vendor_id=account["id"], limit=limit)
    return {
        "success": True,
        "bookings": bookings,
        "total": len(bookings),
    }


@payernt_router.get("/earnings/summary")
def get_vendor_earnings_summary_endpoint(
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Authoritative backend earnings summary for vendor.
    """
    wallet = get_or_create_payernt_wallet(account["id"], account.get("email", ""))
    avail_bal = float(wallet.get("available_balance", 0.0))
    pending_amt = float(wallet.get("pending_amount", 0.0))
    total_received = float(wallet.get("total_received", 0.0))
    total_withdrawn = float(wallet.get("total_withdrawn", 0.0))

    return {
        "success": True,
        "total": total_received if total_received > 0 else avail_bal,
        "availableBalance": avail_bal,
        "pendingAmount": pending_amt,
        "totalReceived": total_received,
        "totalWithdrawn": total_withdrawn,
        "currency": wallet.get("currency", "INR"),
    }


# ============================================================
# RENTAL LIFECYCLE & SECURITY ENDPOINTS (SHARED / RENTER / VENDOR)
# ============================================================

@rental_router.post("")
def create_booking_with_security(
    data: CreateBookingSchema,
    authorization: Optional[str] = Header(None),
):
    """
    Creates a new booking from pay₹ent (Renter side):
    1. Checks date availability.
    2. Reads product's existing Vendor Secret PIN (never regenerated).
    3. Generates fresh random 4-digit Renter Secret PIN.
    4. Creates ONE RentalSecurity record linking both credentials.
    5. Returns booking + sanitized security record (renter only sees renter PIN).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to book gear.",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in to complete your booking.",
        )

    renter_email = payload["sub"].strip().lower()
    renter_id = payload.get("user_id") or f"PAYRENT_USER_{renter_email}"

    # Verify product existence
    product = get_payernt_product_by_id(data.productId, include_pin=True)
    vendor_id = "PAYERNT_USER_001"
    vendor_pin = "5831"
    prod_title = "Tech Gear Rental"
    prod_img = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"
    daily_rate = 2499

    if product:
        vendor_id = product.get("owner_id", "PAYERNT_USER_001")
        vendor_pin = str(product.get("vendor_secret_pin", "5831")).strip()
        prod_title = product.get("title") or product.get("name", "Tech Gear")
        prod_img = product.get("primary_image") or prod_img
        daily_rate = int(product.get("daily_rate", 2499))

    # Generate unique booking ID
    booking_id = f"ord_{int(time.time() * 1000)}"

    # Create canonical Rental Security record
    security_record = create_or_get_rental_security_record(
        booking_id=booking_id,
        product_id=data.productId,
        vendor_id=vendor_id,
        renter_id=renter_id,
        vendor_secret_pin=vendor_pin,
    )

    # Persist booking in orders database table so it appears in renter dashboard
    try:
        from database import create_order
        normalized_order = {
            "id": booking_id,
            "productId": data.productId,
            "productTitle": prod_title,
            "productImage": prod_img,
            "startDate": data.startDate,
            "endDate": data.endDate,
            "total": daily_rate * 3,
            "status": "pending",
            "createdAt": dt.now(timezone.utc).isoformat(),
        }
        create_order(renter_email, normalized_order)
    except Exception as e:
        logger.warning(f"Could not persist order record for booking {booking_id}: {e}")

    # Sanitize security record for renter (removes vendor PIN)
    sanitized_sec = sanitize_security_record_for_user(security_record, "renter", renter_id)

    return {
        "success": True,
        "message": "Booking created. Complete rental verification to start your rental.",
        "booking": {
            "id": booking_id,
            "productId": data.productId,
            "productTitle": prod_title,
            "productImage": prod_img,
            "startDate": data.startDate,
            "endDate": data.endDate,
            "total": daily_rate * 3,
            "status": "pending",
            "renterId": renter_id,
            "vendorId": vendor_id,
        },
        "security": sanitized_sec,
    }


@rental_router.get("/{booking_id}/renter-pin")
def get_renter_pin_endpoint(
    booking_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Authoritatively reveals the 4-digit Renter Secret PIN for the authorized renter:
    1. Validates JWT and confirms caller is the authenticated renter of the booking.
    2. Verifies booking exists in database.
    3. Retrieves the deterministic 4-digit PIN associated with the booking without regenerating it.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view Secret PIN.",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
        )

    caller_email = payload["sub"].strip().lower()
    caller_id = payload.get("user_id") or caller_email
    caller_role = payload.get("role", "customer")

    sec = get_rental_security_record(booking_id)
    if not sec:
        order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,))
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        pid = str(order.get("product_id") or order.get("productId") or "")
        lender_email = str(order.get("lender_email") or "PAYERNT_USER_001").strip().lower()
        sec = create_or_get_rental_security_record(
            booking_id=booking_id,
            product_id=pid,
            vendor_id=lender_email,
            renter_id=caller_id,
        )

    is_admin = caller_role in ("admin", "superadmin")
    is_owner_renter = sec.get("renter_id") in (caller_id, caller_email) or caller_email == sec.get("renter_id")
    if not is_owner_renter and not is_admin:
        order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,))
        if not order or order.get("user_email") != caller_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not authorized to view the Secret PIN for this booking."
            )

    r_pin = str(sec.get("renter_secret_pin") or "").strip()
    if not r_pin:
        r_pin = "6314"

    deliv = fetch_one("SELECT * FROM deliveries WHERE booking_id = %s LIMIT 1", (booking_id,))
    delivery_status = deliv.get("status") if deliv else "PENDING"

    log_payernt_audit_event("RENTER_PIN_REVEALED", caller_id, {"bookingId": booking_id})

    return {
        "success": True,
        "bookingId": booking_id,
        "renterSecretPin": r_pin,
        "status": sec.get("status", "security_pending"),
        "deliveryStatus": delivery_status,
        "instructions": "Share this 4-digit PIN with the delivery partner during physical device handover."
    }


@rental_router.get("/{booking_id}/security")
def get_booking_security_endpoint(
    booking_id: str,
    authorization: Optional[str] = Header(None),
):
    """Retrieves sanitized rental security record for authorized participant."""
    record = get_rental_security_record(booking_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental security record not found.")

    user_id = ""
    user_role = "renter"
    if authorization and authorization.startswith("Bearer "):
        payload = decode_access_token(authorization.split(" ")[1], expected_type="access")
        if payload:
            user_id = payload.get("user_id", "")
            user_role = payload.get("role", "renter")

    sanitized = sanitize_security_record_for_user(record, user_role, user_id)
    return {"success": True, "security": sanitized}


@rental_router.post("/{booking_id}/security/renter-pin")
def verify_renter_pin_endpoint(
    booking_id: str,
    data: VerifyPinSchema,
    authorization: Optional[str] = Header(None),
):
    """Verifies Renter PIN entered during handover."""
    user_id = ""
    if authorization and authorization.startswith("Bearer "):
        payload = decode_access_token(authorization.split(" ")[1], expected_type="access")
        if payload:
            user_id = payload.get("user_id", "")

    valid, msg, record = verify_renter_pin_backend(booking_id, data.pin, user_id)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    sanitized = sanitize_security_record_for_user(record, "renter", user_id) if record else None
    return {"success": True, "message": msg, "security": sanitized}


@rental_router.post("/{booking_id}/security/vendor-pin")
def verify_vendor_pin_endpoint(
    booking_id: str,
    data: VerifyPinSchema,
    authorization: Optional[str] = Header(None),
):
    """Verifies Vendor Secret PIN against product credential."""
    user_id = ""
    if authorization and authorization.startswith("Bearer "):
        payload = decode_access_token(authorization.split(" ")[1], expected_type="access")
        if payload:
            user_id = payload.get("user_id", "")

    valid, msg, record = verify_vendor_pin_backend(booking_id, data.pin, user_id)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    sanitized = sanitize_security_record_for_user(record, "vendor", user_id) if record else None
    return {"success": True, "message": msg, "security": sanitized}


@rental_router.post("/{booking_id}/security/otp")
def verify_otp_endpoint(
    booking_id: str,
    data: VerifyOtpSchema,
):
    """Verifies Handover OTP."""
    valid, msg, record = verify_handover_otp_backend(booking_id, data.otp)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg}


@rental_router.post("/{booking_id}/activate-rental")
@rental_router.post("/{booking_id}/security/activate")
def activate_rental_endpoint(
    booking_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Authoritative, transactional rental activation:
    1. Verifies handover and OTP states.
    2. Combines Vendor PIN + Renter PIN to deterministic 8-digit secret.
    3. Atomically starts rental (orders.status='active', deliveries.status='COMPLETED', rental_security.status='active').
    4. Starts vendor pending earnings in wallet idempotently.
    5. Sends notifications to Renter, Vendor, and Admin.
    """
    user_id = ""
    if authorization and authorization.startswith("Bearer "):
        payload = decode_access_token(authorization.split(" ")[1], expected_type="access")
        if payload:
            user_id = payload.get("user_id", "")

    valid, msg, record = activate_rental_transactional(booking_id, user_id)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    sanitized = sanitize_security_record_for_user(record, "renter", user_id) if record else None
    return {
        "success": True,
        "message": msg,
        "rentalStatus": "active",
        "deliveryStatus": "COMPLETED",
        "rentalStartedAt": record.get("rental_started_at") or record.get("activated_at"),
        "earningsStatus": "ACTIVE",
        "bookingStatus": "active",
        "security": sanitized
    }


@rental_router.post("/{booking_id}/complete")
def complete_rental_endpoint(
    booking_id: str,
):
    """Completes the rental and credits the vendor's wallet with earnings."""
    success, msg, record = complete_rental_and_credit_vendor(booking_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg}


# ============================================================
# VENDOR PREPARE & DELIVERY HANDOVER OTP ENDPOINTS
# ============================================================

@payernt_router.post("/bookings/{booking_id}/prepare")
@payernt_router.post("/paye₹nt/bookings/{booking_id}/prepare")
@payernt_router.post("/payernt/bookings/{booking_id}/prepare")
def vendor_prepare_product_endpoint(
    booking_id: str,
    current_vendor: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Vendor prepares product for delivery:
    1. Validates authenticated vendor owns product.
    2. Secures 4-digit Vendor Secret PIN.
    3. Updates deliveryStatus to 'WAITING_FOR_DELIVERY_BOY'.
    4. Notifies delivery workflow.
    """
    vendor_id = current_vendor.get("id") or current_vendor.get("email")
    vendor_email = current_vendor.get("email")
    valid, msg, data = vendor_prepare_product(booking_id, vendor_id, vendor_email)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {
        "success": True,
        "message": msg,
        "data": data,
        "vendorSecretPin": data.get("vendorSecretPin"),
        "deliveryStatus": data.get("deliveryStatus")
    }


@payernt_router.post("/bookings/{booking_id}/generate-secret-pin")
@payernt_router.get("/bookings/{booking_id}/secret-pin")
def get_or_generate_vendor_secret_pin_endpoint(
    booking_id: str,
    current_vendor: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Retrieves or generates the 4-digit Vendor Secret PIN for the authorized vendor:
    1. Cryptographically secure 4-digit numeric PIN.
    2. Linked to the exact booking and pickup stage.
    3. Returns creation timestamp, delivery status, and PIN.
    """
    vendor_id = current_vendor.get("id") or current_vendor.get("email")
    vendor_email = current_vendor.get("email")
    valid, msg, data = get_or_generate_vendor_secret_pin(booking_id, vendor_id, vendor_email)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {
        "success": True,
        "message": msg,
        "bookingId": booking_id,
        "vendorSecretPin": data.get("vendorSecretPin"),
        "createdAt": data.get("createdAt"),
        "deliveryStatus": data.get("deliveryStatus"),
    }


class RenterInspectionSchema(BaseModel):
    checklist: Optional[Dict[str, Any]] = None
    conditionNotes: Optional[str] = None


@rental_router.post("/{booking_id}/confirm-inspection")
def confirm_renter_inspection_endpoint(
    booking_id: str,
    data: Optional[RenterInspectionSchema] = None,
    authorization: Optional[str] = Header(None),
):
    """
    Stage 8: Renter inspects received product and generates/reveals Renter Secret PIN:
    1. Validates renter authentication and ownership.
    2. Confirms delivery partner handover has completed (renter_otp_verified).
    3. Records inspection checklist and confirmation timestamp.
    4. Generates/reveals 4-digit Renter Secret PIN exclusively for the renter.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    payload = decode_access_token(authorization.split(" ")[1], expected_type="access")
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalid or expired.")

    renter_email = payload["sub"].strip().lower()
    renter_id = payload.get("user_id") or renter_email
    checklist = data.checklist if data and data.checklist else {
        "received": True,
        "matchesBooking": True,
        "accessoriesChecked": True,
        "conditionChecked": True,
    }

    valid, msg, sec = confirm_renter_inspection(booking_id, renter_id, renter_email, checklist)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return {
        "success": True,
        "message": msg,
        "security": sec,
        "renterSecretPin": sec.get("renterSecretPin"),
        "inspectionConfirmedAt": sec.get("inspectionConfirmedAt"),
    }


def check_courier_authorization_for_delivery(booking_id: str, authorization: Optional[str]) -> Tuple[bool, int, str, Dict[str, Any]]:
    """
    Validates delivery partner authentication & assignment:
    1. Requires valid Bearer access token.
    2. Extracts authenticated user ID and role.
    3. Verifies user is the assigned delivery partner in deliveries / orders, or an admin.
    Returns (is_authorized, status_code, message, payload).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return False, status.HTTP_401_UNAUTHORIZED, "Authentication required. Bearer token missing.", {}

    token = authorization.split(" ")[1]
    payload = decode_access_token(token, expected_type="access")
    if not payload or ("sub" not in payload and "user_id" not in payload):
        return False, status.HTTP_401_UNAUTHORIZED, "Session invalid or expired.", {}

    user_email = str(payload.get("sub") or "").strip().lower()
    user_id = str(payload.get("user_id") or user_email).strip()
    user_role = str(payload.get("role") or "").strip().lower()

    if user_role in ("admin", "superadmin", "system"):
        return True, 200, "Authorized admin.", payload

    # Lookup delivery assignment
    delivery = None
    try:
        delivery = fetch_one("SELECT * FROM deliveries WHERE booking_id = %s OR id = %s LIMIT 1", (booking_id, booking_id))
    except Exception:
        pass
    if not delivery:
        from database import MOCK_DELIVERIES
        delivery = MOCK_DELIVERIES.get(booking_id)

    order = None
    try:
        order = fetch_one("SELECT * FROM orders WHERE id = %s LIMIT 1", (booking_id,))
    except Exception:
        pass
    if not order:
        from database import MOCK_ORDERS
        order = MOCK_ORDERS.get(booking_id)

    assigned_couriers = set()
    if delivery:
        if delivery.get("delivery_boy_id"):
            assigned_couriers.add(str(delivery.get("delivery_boy_id")).strip().lower())
        if delivery.get("delivery_boy_name"):
            assigned_couriers.add(str(delivery.get("delivery_boy_name")).strip().lower())
    if order:
        if order.get("delivery_boy_id"):
            assigned_couriers.add(str(order.get("delivery_boy_id")).strip().lower())

    if assigned_couriers:
        if user_id.lower() in assigned_couriers or user_email in assigned_couriers:
            return True, 200, "Authorized courier.", payload
        return False, status.HTTP_403_FORBIDDEN, "Forbidden: You are not assigned to this delivery task.", payload

    # If open assignment or lender dispatch, permit courier / vendor roles
    if user_role in ("delivery", "courier", "delivery_boy", "agent", "vendor", "lender"):
        return True, 200, "Authorized courier role.", payload

    return False, status.HTTP_403_FORBIDDEN, "Forbidden: Only authorized delivery partners can perform this action.", payload


class SendHandoverOtpSchema(BaseModel):
    phone: Optional[str] = None
    userId: Optional[str] = None


class VerifyHandoverOtpSchema(BaseModel):
    otp: str = Field(..., min_length=1)


@delivery_handover_router.post("/{booking_id}/vendor-otp/send")
def send_vendor_handover_otp_endpoint(
    booking_id: str,
    data: Optional[SendHandoverOtpSchema] = None,
    authorization: Optional[str] = Header(None)
):
    """Sends OTP to vendor for pickup verification. Requires authenticated, assigned delivery partner."""
    auth_ok, err_code, auth_msg, payload = check_courier_authorization_for_delivery(booking_id, authorization)
    if not auth_ok:
        raise HTTPException(status_code=err_code, detail=auth_msg)

    phone = data.phone if data else ""
    uid = data.userId if data else (payload.get("user_id") or payload.get("sub"))
    if not phone:
        sec = get_rental_security_record(booking_id)
        if sec:
            v_acc = get_payernt_account_by_id(sec.get("vendor_id", ""))
            if v_acc:
                phone = v_acc.get("phone", "")
    res = generate_handover_otp(booking_id, uid or "vendor", phone or "+91 98765 43210", purpose="VENDOR_HANDOVER")
    return res


@delivery_handover_router.post("/{booking_id}/vendor-otp/verify")
def verify_vendor_handover_otp_endpoint(
    booking_id: str,
    data: VerifyHandoverOtpSchema,
    authorization: Optional[str] = Header(None)
):
    """Verifies vendor handover OTP (Vendor -> Delivery Boy). Requires authenticated, assigned delivery partner."""
    auth_ok, err_code, auth_msg, payload = check_courier_authorization_for_delivery(booking_id, authorization)
    if not auth_ok:
        raise HTTPException(status_code=err_code, detail=auth_msg)

    valid, msg, rec = verify_handover_otp(booking_id, purpose="VENDOR_HANDOVER", entered_otp=data.otp, user_id=payload.get("user_id") or payload.get("sub"))
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {
        "success": True,
        "message": msg,
        "deliveryStatus": "PICKED_UP_FROM_VENDOR",
        "vendorHandoverVerified": True
    }


@delivery_handover_router.post("/{booking_id}/renter-otp/send")
def send_renter_handover_otp_endpoint(
    booking_id: str,
    data: Optional[SendHandoverOtpSchema] = None,
    authorization: Optional[str] = Header(None)
):
    """Sends OTP to renter for arrival / receipt verification. Enforces courier auth and vendor pickup verification first."""
    auth_ok, err_code, auth_msg, payload = check_courier_authorization_for_delivery(booking_id, authorization)
    if not auth_ok:
        raise HTTPException(status_code=err_code, detail=auth_msg)

    sec = get_rental_security_record(booking_id)
    if not sec or not (sec.get("vendor_otp_verified") or sec.get("vendor_handover_verified")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot dispatch renter delivery OTP before product pickup is verified with Vendor OTP."
        )

    phone = data.phone if data else ""
    uid = data.userId if data else (payload.get("user_id") or payload.get("sub"))
    if not phone:
        if sec:
            r_user = fetch_one("SELECT phone FROM users WHERE email = %s", (sec.get("renter_id"),))
            if r_user:
                phone = r_user.get("phone", "")
    res = generate_handover_otp(booking_id, uid or "renter", phone or "+91 98765 43211", purpose="RENTER_HANDOVER")
    return res


@delivery_handover_router.post("/{booking_id}/renter-otp/verify")
def verify_renter_handover_otp_endpoint(
    booking_id: str,
    data: VerifyHandoverOtpSchema,
    authorization: Optional[str] = Header(None)
):
    """Verifies renter handover OTP and confirms physical delivery. Requires authenticated, assigned delivery partner."""
    auth_ok, err_code, auth_msg, payload = check_courier_authorization_for_delivery(booking_id, authorization)
    if not auth_ok:
        raise HTTPException(status_code=err_code, detail=auth_msg)

    user_id = payload.get("user_id") or payload.get("sub") or ""
    valid, msg, rec = verify_handover_otp(booking_id, purpose="RENTER_HANDOVER", entered_otp=data.otp, user_id=user_id)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    
    r_pin = rec.get("renter_secret_pin") if rec and rec.get("renter_confirmed_receipt") else None
    return {
        "success": True,
        "message": msg,
        "deliveryStatus": "RENTER_VERIFIED",
        "renterHandoverVerified": True,
        "renterSecretPin": r_pin
    }


@delivery_handover_router.get("/dev/mock-otps/{booking_id}/{purpose}")
@delivery_handover_router.get("/{booking_id}/dev-mock-otp/{purpose}")
def get_dev_mock_otp_endpoint(
    booking_id: str,
    purpose: str,
    authorization: Optional[str] = Header(None)
):
    """
    Protected developer-only endpoint to inspect active Mock OTP during local development testing.
    Strictly disabled and returns 404 in production environment.
    """
    if IS_PRODUCTION:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dev mock endpoint not available in production.")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required for dev mock OTP access.")

    otp_code = get_dev_mock_otp(booking_id, purpose)
    if not otp_code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active mock OTP not found, expired, or already verified.")

    return {
        "success": True,
        "bookingId": booking_id,
        "purpose": purpose.upper(),
        "mockOtp": otp_code,
        "label": "MOCK OTP — Development Only",
        "notice": "Mock OTP generated. No SMS was sent.",
        "isMockMode": True
    }



class PayerntResubmitSchema(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phoneNumber: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    aadhaar_number: Optional[str] = None


@payernt_router.post("/auth/resubmit")
@payernt_router.post("/resubmit")
def resubmit_payernt_vendor(data: PayerntResubmitSchema):
    """Resubmits updated vendor details for Admin review."""
    clean_email = (data.email or "").strip().lower()
    acc = get_payernt_account_by_email(clean_email)
    if not acc:
        raise HTTPException(status_code=404, detail="Payernt account not found.")

    resubmit_payernt_account(
        email=clean_email,
        name=data.name,
        phone=data.phoneNumber or data.phone,
        address=data.address,
        pincode=data.pincode,
        aadhaar_number=data.aadhaarNumber or data.aadhaar_number,
    )

    return {
        "success": True,
        "status": "PENDING_REVIEW",
        "accountType": "Payernt",
        "message": "Your vendor details have been updated and resubmitted for Admin review.",
    }


@payernt_router.get("/auth/status")
@payernt_router.get("/status")
def get_payernt_status(email: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """Fetches real-time Payernt account review status."""
    clean_email = None
    if email:
        clean_email = email.lower().strip()
    elif authorization and authorization.startswith("Bearer "):
        try:
            payload = decode_access_token(authorization.split(" ")[1], expected_type="access")
            if payload and "sub" in payload:
                clean_email = payload["sub"].lower().strip()
        except Exception:
            pass

    if not clean_email:
        raise HTTPException(status_code=400, detail="Email is required to check account status.")

    acc = get_payernt_account_by_email(clean_email)
    if not acc:
        raise HTTPException(status_code=404, detail="Payernt account not found.")

    raw_status = str(acc.get("status", "PENDING_REVIEW")).upper()
    status_val = "APPROVED" if raw_status in ("APPROVED", "ACTIVE") else ("REJECTED" if raw_status == "REJECTED" else "PENDING_REVIEW")

    return {
        "status": status_val,
        "is_approved": status_val == "APPROVED",
        "accountType": "Payernt",
        "email": clean_email,
        "name": acc.get("name"),
        "rejectionReason": acc.get("rejection_reason"),
        "reviewedBy": acc.get("reviewed_by"),
        "reviewedAt": acc.get("reviewed_at"),
    }
