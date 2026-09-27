import re
import time
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header, status, Query, Request
from pydantic import BaseModel, Field, EmailStr
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    validate_password_strength,
)
from payernt_database import (
    create_payernt_account,
    get_payernt_account_by_email,
    get_payernt_account_by_id,
    update_payernt_account_profile,
    create_payernt_product,
    get_payernt_product_by_id,
    get_payernt_products_by_owner,
    get_all_active_payernt_products,
    update_payernt_product,
    delete_payernt_product,
    create_or_get_rental_security_record,
    get_rental_security_record,
    sanitize_security_record_for_user,
    verify_renter_pin_backend,
    verify_vendor_pin_backend,
    verify_handover_otp_backend,
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
    get_payernt_audit_logs,
)

logger = logging.getLogger("payent.payernt_router")

payernt_router = APIRouter(prefix="/api/paye₹nt", tags=["paye₹nt - Vendor/Lender Backend"])
rental_router = APIRouter(prefix="/api/bookings", tags=["Rental Lifecycle & Security"])


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

    account_type = payload.get("account_type")
    if not account_type or (account_type != "paye₹nt" and account_type != "admin"):
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
    aadhaarNumber: str = Field(..., min_length=12, max_length=20)
    phoneNumber: str = Field(..., min_length=10, max_length=15)
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
    category: str
    name: str
    title: Optional[str] = None
    brand: Optional[str] = ""
    model: Optional[str] = ""
    year: Optional[str] = "2024"
    description: Optional[str] = ""
    specifications: Optional[str] = ""
    features: Optional[List[str]] = []
    condition: Optional[Dict[str, Any]] = {}
    condition_grade: Optional[str] = "Like New"
    accessories: Optional[str] = ""
    location: Optional[Dict[str, Any]] = {}
    city: Optional[str] = ""
    area: Optional[str] = ""
    pincode: Optional[str] = ""
    pickup_instructions: Optional[str] = ""
    pricing: Optional[Dict[str, Any]] = {}
    price: Optional[int] = None
    daily_rate: Optional[int] = None
    dailyRate: Optional[int] = None
    weekly_rate: Optional[int] = None
    weeklyRate: Optional[int] = None
    monthly_rate: Optional[int] = None
    monthlyRate: Optional[int] = None
    available: Optional[bool] = True
    availability_status: Optional[str] = "available"
    min_rental_days: Optional[int] = 1
    max_rental_days: Optional[int] = 30
    primaryImage: Optional[str] = ""
    images: Optional[List[str]] = []
    status: Optional[str] = "active"


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
    clean_aadhaar = re.sub(r"\s+", "", data.aadhaarNumber)
    if not re.match(r"^\d{12}$", clean_aadhaar):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aadhaar number must contain exactly 12 numeric digits.",
        )

    # Validate Indian mobile number
    clean_phone = re.sub(r"[^\d+]", "", data.phoneNumber)
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
            phone=data.phoneNumber,
            address=data.address,
            pincode=clean_pincode,
            password=data.password,
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err))

    # Generate JWT access & refresh tokens
    token_payload = {
        "sub": account["email"],
        "account_type": "paye₹nt",
        "user_id": account["id"],
        "name": account["name"],
        "role": "vendor",
    }
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

    sanitized = _sanitize_payernt_account(account)

    return {
        "success": True,
        "message": "paye₹nt vendor account created successfully.",
        "user": {
            "id": account["id"],
            "name": account["name"],
            "email": account["email"],
            "accountType": "paye₹nt",
        },
        "userId": account["id"],
        "accountType": "paye₹nt",
        "name": account["name"],
        "email": account["email"],
        "role": "vendor",
        "account": sanitized,
        "token": access_token,
        "refreshToken": refresh_token,
    }


@payernt_router.post("/auth/login")
def login_payernt_vendor(data: PayerntLoginSchema):
    """Authenticates a paye₹nt Product Owner / Lender."""
    clean_email = data.email.strip().lower()
    account = get_payernt_account_by_email(clean_email)

    if not account or not verify_password(data.password, account.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password for paye₹nt vendor account.",
        )

    token_payload = {
        "sub": account["email"],
        "account_type": "paye₹nt",
        "user_id": account["id"],
        "name": account.get("name", "Vendor"),
        "role": "vendor",
    }
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

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


@payernt_router.post("/auth/logout")
def logout_payernt_vendor():
    """Logs out from paye₹nt."""
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


# ============================================================
# PAYE₹NT PRODUCT MANAGEMENT & VENDOR PIN
# ============================================================

@payernt_router.post("/products")
def create_product_endpoint(
    data: PayerntProductCreateSchema,
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """
    Creates a new product listing for the vendor.
    Generates a 4-digit Vendor Secret PIN ONCE upon creation.
    Returns the generated PIN only to the product owner.
    """
    product = create_payernt_product(
        owner_id=account["id"],
        owner_email=account["email"],
        owner_name=account.get("name", "Vendor"),
        data=data.dict(exclude_unset=False),
    )
    sanitized = _sanitize_payernt_product(product, include_pin=True)

    return {
        "success": True,
        "message": "Product listed successfully with Vendor Secret PIN.",
        "product": sanitized,
        "vendorSecretPin": sanitized.get("vendorSecretPin") or sanitized.get("vendor_secret_pin"),
    }


@payernt_router.get("/products")
def list_vendor_products_endpoint(account: Dict[str, Any] = Depends(get_current_payernt_account)):
    """Lists all products listed by the authenticated vendor."""
    products = get_payernt_products_by_owner(account["id"])
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
    """Fetches product messages involving the vendor."""
    messages = get_payernt_messages(account["id"], product_id)
    return {"success": True, "messages": messages}


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


@payernt_router.get("/audit-logs")
def get_audit_logs_endpoint(
    account: Dict[str, Any] = Depends(get_current_payernt_account),
):
    """Fetches audit logs for the vendor."""
    logs = get_payernt_audit_logs(account["id"])
    return {"success": True, "logs": logs}


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
            "status": "security_pending",
            "renterId": renter_id,
            "vendorId": vendor_id,
            "renterSecretPin": security_record["renter_secret_pin"],
        },
        "security": sanitized_sec,
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


@rental_router.post("/{booking_id}/complete")
def complete_rental_endpoint(
    booking_id: str,
):
    """Completes the rental and credits the vendor's wallet with earnings."""
    success, msg, record = complete_rental_and_credit_vendor(booking_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg}
