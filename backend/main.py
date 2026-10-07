import os
import sys

# Suppress uv hardlink fallback warning across Python processes
os.environ["UV_LINK_MODE"] = "copy"

# Ensure backend directory is in Python module search path for serverless environments
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import datetime
from datetime import datetime as dt, timezone
import time
import random
import secrets
import logging
import json
import asyncio
import traceback
import re
import urllib.request
import urllib.parse
from typing import Optional, List, Set, Tuple, Dict, Any, Union
from email_service import send_email_smtp, build_password_reset_email_html, build_password_reset_email_text, is_smtp_configured

# Load env variables at application startup if dotenv is available (local dev)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException, Header, Depends, Query, status, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, EmailStr, validator, Field

# Setup Structured Logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("payent.security")

try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
    HAS_FIREBASE = True
except ImportError:
    firebase_admin = None
    credentials = None
    firebase_auth = None
    HAS_FIREBASE = False
    logger.warning("Notice: firebase_admin module not installed; Firebase Auth fallback active.")

# Initialize Firebase Admin SDK once if credentials provided
try:
    if HAS_FIREBASE and firebase_admin and not firebase_admin._apps:
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_account_json:
            try:
                cred_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized with service account JSON.")
            except Exception as json_err:
                logger.warning(f"Notice: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {json_err}")
        elif os.path.exists("firebase-service-account.json"):
            cred = credentials.Certificate("firebase-service-account.json")
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized from local firebase-service-account.json file.")
except Exception as fb_err:
    logger.warning(f"Notice: Firebase Admin SDK initialization notice: {fb_err}")

import hmac
import hashlib
import uuid
import math
import razorpay

from database import (
    init_db,
    get_user,
    get_user_by_phone,
    get_user_by_aadhaar,
    create_user,
    save_google_user,
    update_user_password,
    save_otp,
    get_otp,
    delete_otp,
    get_wishlist,
    toggle_wishlist,
    get_orders,
    create_order,
    cancel_order,
    get_custom_products,
    get_all_custom_products,
    get_all_approved_custom_products,
    create_custom_product,
    get_notifications,
    create_notification,
    get_admin_notifications,
    mark_notifications_read,
    execute_query,
    get_db_connection,
    invalidate_user_cache,
    delete_custom_product,
    toggle_custom_product_availability,
    update_custom_product,
    resubmit_payrent_account,
    revoke_token,
    is_token_revoked,
    record_failed_auth_attempt,
    clear_failed_auth_attempts,
    increment_otp_attempt,
    create_order_record,
    get_order_by_id,
    get_order_by_razorpay_order_id,
    update_order_payment_status,
    is_payment_event_processed,
    record_payment_event,
    record_user_event_record,
    record_user_events_batch,
    get_recent_user_events,
    get_trending_event_counts,
    get_order_co_occurrences,
    get_precomputed_similarities,
    get_user_category_affinities,
    get_popular_search_queries,
    has_admin_user,
    MOCK_USERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_CARTS,
    MOCK_WISHLISTS,
    MOCK_NOTIFICATIONS,
    MOCK_DELIVERIES,
    MOCK_DELIVERY_LOCATIONS,
    MOCK_CONVERSATIONS,
    MOCK_MESSAGES,
    MOCK_PASSWORD_RESET_TOKENS,
    create_password_reset_token,
    get_password_reset_token_record,
    consume_password_reset_token,
    fetch_one,
    fetch_all,
    create_db_session,
    get_valid_db_session,
    update_session_activity,
    revoke_db_session,
    revoke_db_session_by_token,
    revoke_all_user_sessions,
    revoke_cross_side_user_sessions,
    get_user_active_sessions,
    cleanup_expired_sessions,
    is_session_revoked,
    hash_refresh_token,
    get_reviews_from_db,
    get_review_stats_from_db,
    get_review_by_id,
    create_review_record,
    update_review_record,
    delete_review_record,
    recalculate_product_ratings,
    check_products_booking_conflicts,
    evaluate_product_availability,
    evaluate_products_availability_batch,
    get_products_batch,
    fetch_cart_validation_bundle,
    get_user_cart,
    add_or_update_cart_item,
    remove_cart_item,
    clear_user_cart,
    parse_date_safely,
    get_user_eligible_bookings,
    get_or_create_delivery,
    get_delivery,
    get_delivery_by_booking,
    update_delivery_status,
    add_delivery_location,
    get_delivery_locations,
    confirm_delivery_receipt,
    get_or_create_booking_conversation,
    get_or_create_product_conversation,
    get_conversation,
    get_user_conversations,
    get_conversation_detail,
    get_conversation_messages,
    add_message,
    mark_conversation_read,
    get_total_unread_messages_count,
    estimate_delivery_eta_minutes,
    check_db_health,
    mask_email_safely,
    get_api_keys_db,
    get_api_key_by_id_db,
    get_api_key_by_hash_db,
    create_api_key_db,
    update_api_key_db,
    delete_api_key_db,
    touch_api_key_last_used_db,
    MOCK_API_KEYS,
    get_devices_by_account,
    get_device_by_id,
    get_device_by_security_id,
    get_device_by_qr_token,
    create_registered_device,
    update_device_status_db,
    regenerate_device_qr_db,
    record_device_security_event,
    get_device_security_history_db,
    create_device_transfer_db,
    get_pending_transfers_db,
    accept_device_transfer_db,
    cancel_device_transfer_db,
    get_all_devices_admin_db,
    touch_device_last_verified,
    MOCK_DEVICES,
    MOCK_DEVICE_SECURITY_HISTORY,
    MOCK_DEVICE_TRANSFERS
)

from recommendations_ml import check_data_sufficiency, compute_and_save_item_similarities
from search_ml import ml_search_engine
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    validate_password_strength
)
from config import (
    ENABLE_TWILIO_SMS,
    DISABLE_TWILIO_FOR_FIREBASE,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID,
    ADMIN_SETUP_CODE,
    ADMIN_CREATION_SECRET,
    ALLOWED_ORIGINS,
    IS_PRODUCTION,
    ALLOW_PRODUCTION_TESTING,
    GOOGLE_CLIENT_ID,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET
)

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        logger.info("Razorpay Client SDK initialized successfully.")
    except Exception as rzp_err:
        logger.warning(f"Razorpay Client SDK initialization warning: {rzp_err}")
        razorpay_client = None
from contextlib import asynccontextmanager

def _async_startup_tasks():
    try:
        init_db()
        logger.info("MySQL database initialized successfully.")
    except Exception as e:
        logger.error(f"Could not initialize MySQL database at startup: {e}")

    try:
        if "get_recommendation_catalog" in globals():
            catalog = get_recommendation_catalog()
            ml_search_engine.build_index(catalog)
            logger.info(f"ML Search Engine index initialized with {len(catalog)} products.")
    except Exception as se_err:
        logger.error(f"Error initializing ML Search Engine index: {se_err}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run startup DB initialization in a background thread to prevent healthcheck timeout
    asyncio.create_task(asyncio.to_thread(_async_startup_tasks))
    yield

app = FastAPI(
    title="Payent Backend API",
    description="Backend API for Payent Peer-to-Peer Renting Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not IS_PRODUCTION else None,
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Enable GZip compression for payloads >= 500 bytes (reduces large JSON payloads by 85-90%)
app.add_middleware(GZipMiddleware, minimum_size=500)

# Register Button 1 (paye₹nt) and Rental Lifecycle Routers
try:
    from payernt_router import payernt_router, rental_router, delivery_handover_router
    app.include_router(payernt_router, prefix="/api/payernt")
    app.include_router(payernt_router, prefix="/api/paye₹nt")
    app.include_router(rental_router)
    app.include_router(delivery_handover_router)
except Exception as router_err:
    logger.warning(f"Notice: Failed to register payernt routers: {router_err}")

_cache_store = {}

def get_cached(key: str, ttl_seconds: int, fetch_func):
    now = time.time()
    if key in _cache_store:
        cached_time, cached_val = _cache_store[key]
        if now - cached_time < ttl_seconds:
            return cached_val
    val = fetch_func()
    _cache_store[key] = (now, val)
    return val

def invalidate_cache(key_prefix: str = None):
    if not key_prefix:
        _cache_store.clear()
        return
    keys_to_del = [k for k in _cache_store if k.startswith(key_prefix)]
    for k in keys_to_del:
        _cache_store.pop(k, None)

DEV_ORIGINS = {
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://10.0.2.2:8001",
    "http://testserver",
}

def is_origin_allowed(origin: Optional[str]) -> bool:
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS and origin != "*":
        return True
    if not IS_PRODUCTION:
        if origin in DEV_ORIGINS or origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:") or origin.startswith("http://10.0.2.2:"):
            return True
    # In production, verify trusted Cloudflare domains
    if origin == "https://frontend.bommidimohan2003.workers.dev" or origin == "https://payent.in" or origin == "https://www.payent.in":
        return True
    return False

# Custom Universal CORS, Structured Access Logging & Security Headers Middleware
@app.middleware("http")
async def custom_cors_and_security_middleware(request: Request, call_next):
    start_time = time.time()
    req_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    origin = request.headers.get("origin")
    allowed = is_origin_allowed(origin)
    
    # Immediately handle CORS OPTIONS preflight request
    if request.method == "OPTIONS":
        response = Response(status_code=204)
        if allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers", "*")
            response.headers["Access-Control-Max-Age"] = "86400"
            response.headers["Vary"] = "Origin"
        response.headers["X-Request-ID"] = req_id
        return response

    # Enforce request body size limit (max 10MB)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 10 * 1024 * 1024:
        res = Response(content=json.dumps({"detail": "Payload too large. Maximum allowed size is 10MB."}), status_code=413, media_type="application/json")
        res.headers["X-Request-ID"] = req_id
        return res

    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    
    # Structured Request Correlation Header
    response.headers["X-Request-ID"] = req_id

    # Attach CORS headers to response if origin is allowed
    if allowed and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        response.headers["Vary"] = "Origin"

    # Defense-in-depth Security Headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), geolocation=(self), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.jsdelivr.net https://apis.google.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https://images.unsplash.com https://ui-avatars.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.razorpay.com; "
        "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:* wss://* https://*.razorpay.com https://api.pwnedpasswords.com https://*.googleapis.com; "
        "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com;"
    )
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    # Structured access logging (excluding excessive heartbeat polling logs)
    if not request.url.path.startswith("/api/health") and not request.url.path in ("/", "/health", "/healthz"):
        logger.info(f"[{req_id}] {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")

    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    logger.error(f"[{req_id}] Unhandled Exception on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
    origin = request.headers.get("origin")
    allowed = is_origin_allowed(origin)
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
        "Access-Control-Allow-Headers": "*",
        "X-Request-ID": req_id
    }
    if allowed and origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    # Sanitize 500 error messages to prevent internal SQL / stack traces from leaking
    err_detail = "Internal Server Error. Please try again later." if IS_PRODUCTION else f"Internal Server Error: {str(exc)}"
    return JSONResponse(
        status_code=500,
        content={"detail": err_detail},
        headers=headers
    )

@app.get("/")
@app.get("/api/health")
@app.get("/health")
@app.get("/healthz")
def health_check(response: Response):
    """Universal health probe verifying both application runtime and TiDB database connectivity."""
    is_ready, msg = check_db_health()
    if is_ready:
        return {
            "status": "ok",
            "database": "connected",
            "service": "Payent FastAPI Backend API",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "degraded",
        "database": "disconnected",
        "service": "Payent FastAPI Backend API",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api/health/live")
def liveness_check():
    """Liveness probe: verifies the application runtime process is alive."""
    return {
        "status": "alive",
        "service": "Payent FastAPI Backend API",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api/health/ready")
def readiness_check(response: Response):
    """Readiness probe: verifies database connectivity and operational dependency state."""
    is_ready, msg = check_db_health()
    if is_ready:
        return {
            "status": "ready",
            "database": "connected",
            "service": "Payent FastAPI Backend API",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "unhealthy",
        "database": "disconnected",
        "service": "Payent FastAPI Backend API",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# Pydantic Schemas
class GoogleUserSyncSchema(BaseModel):
    model_config = {"populate_by_name": True}
    email: EmailStr
    fullName: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = ""
    avatar: Optional[str] = ""
    address: Optional[str] = ""
    city: Optional[str] = ""
    pincode: Optional[str] = ""
    admin_code: Optional[str] = None
    id_token: Optional[str] = None
    role: Optional[str] = "user"

    @property
    def resolved_full_name(self) -> str:
        return self.fullName or self.full_name or ""

def verify_google_identity_token(id_token: str, expected_email: str) -> dict:
    """
    Validate Google ID token with Google's OAuth2 Tokeninfo API or Firebase Auth.
    Ensures cryptographic signature, non-expiration, valid issuer/audience, matching email, and verified email status.
    """
    if not id_token or not id_token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Valid Google ID token required."
        )

    # In testing/dev mode with mock prefix
    if id_token.startswith("mock_") or id_token.startswith("test_"):
        if not ALLOW_PRODUCTION_TESTING and IS_PRODUCTION:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mock Google tokens are blocked in production."
            )
        return {
            "email": expected_email.lower().strip(),
            "email_verified": True,
            "name": "Test User",
            "sub": "mock-google-sub-123",
            "iss": "https://accounts.google.com"
        }

    try:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(id_token)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Payent-Identity-Auditor"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired Google token.")
            body = json.loads(response.read().decode("utf-8"))
            
            # 1. Verify Issuer
            iss = body.get("iss", "")
            if iss not in ("accounts.google.com", "https://accounts.google.com"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token issuer. Google identity required."
                )

            # 2. Verify Audience if configured
            if GOOGLE_CLIENT_ID and body.get("aud") != GOOGLE_CLIENT_ID:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google token audience mismatch."
                )

            # 3. Verify Expiration
            exp = int(body.get("exp", 0))
            if exp and exp < int(time.time()):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google ID token has expired."
                )

            # 4. Verify Subject and Verified Email
            token_sub = body.get("sub")
            token_email = (body.get("email") or "").strip().lower()
            is_verified = body.get("email_verified") in (True, "true", "True", "1", 1)
            
            if not token_sub:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing subject identifier in Google credential."
                )

            if not token_email or token_email != expected_email.strip().lower():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google token email does not match requested sync identity."
                )
            if not is_verified:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google account email is not verified."
                )
            return body
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google ID token with authentication provider."
        )

@app.post("/api/auth/google-sync")
def sync_google_user_to_mysql(data: GoogleUserSyncSchema):
    # Verify cryptographic ID token and extract verified claims
    verified_claims = verify_google_identity_token(data.id_token or "", data.email)
    verified_email = (verified_claims.get("email") or data.email).strip().lower()

    name = data.fullName or data.full_name or verified_claims.get("name") or verified_email.split("@")[0]
    
    # Enforce safe role: default to user, never allow arbitrary admin elevation from frontend
    role = "user"
    existing_user = get_user(verified_email)
    if existing_user and existing_user.get("role"):
        role = existing_user["role"]

    user_record = save_google_user(
        email=verified_email,
        full_name=name,
        firebase_uid=verified_claims.get("sub") or data.id_token or "",
        phone=data.phone or "",
        avatar=verified_claims.get("picture") or data.avatar or "",
        address=data.address or "",
        city=data.city or "",
        pincode=data.pincode or "",
        role=role
    )
    from auth import create_access_token
    token = create_access_token({"sub": verified_email, "role": user_record.get("role", role)})
    logger.info(f"Successfully verified and synced Google user: {verified_email}")
    return {"status": "ok", "success": True, "token": token, "user": user_record}

class OTPRequestSchema(BaseModel):
    email: EmailStr
    phone: str

class RegisterVerifySchema(BaseModel):
    model_config = {"populate_by_name": True}
    email: EmailStr
    phone: str
    password: str
    pan_number: Optional[str] = None
    panNumber: Optional[str] = None
    aadhaar_number: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    otp: Optional[str] = "DIRECT"
    full_name: Optional[str] = None
    fullName: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    admin_code: Optional[str] = None
    account_type: Optional[str] = "pay₹ent"
    accountType: Optional[str] = "pay₹ent"
    person_id: Optional[str] = None
    personId: Optional[str] = None

class LoginRequestSchema(BaseModel):
    email: EmailStr
    password: str

class CreateAdminSchema(BaseModel):
    name: Optional[str] = "Admin"
    email: EmailStr
    password: str
    secret: Optional[str] = None
    admin_code: Optional[str] = None
class ForgotPasswordRequestSchema(BaseModel):
    email: EmailStr
    recovery_token: Optional[str] = None
    recovery_session_id: Optional[str] = None

class ValidateResetTokenSchema(BaseModel):
    token: str

class ForgotPasswordResetSchema(BaseModel):
    token: Optional[str] = None
    recovery_token: Optional[str] = None
    new_password: str
    email: Optional[str] = None


class CheckRegistrationSchema(BaseModel):
    name: str = Field(..., min_length=1)
    mobile: Optional[str] = None
    phone: Optional[str] = None
    phoneNumber: Optional[str] = None
    email: EmailStr
    targetAccountType: Optional[str] = "pay₹ent"
    target_account_type: Optional[str] = None


class CrossSideCheckMobileSchema(BaseModel):
    phone: str
    targetAccountType: Optional[str] = "pay₹ent"
    target_account_type: Optional[str] = None


class CrossSideSendOTPSchema(BaseModel):
    phone: str
    targetAccountType: Optional[str] = "pay₹ent"
    target_account_type: Optional[str] = None


class CrossSideVerifyOTPSchema(BaseModel):
    token: str
    otp: str


class CrossSideRegisterSchema(BaseModel):
    targetAccountType: Optional[str] = "pay₹ent"
    target_account_type: Optional[str] = None
    verificationToken: str
    name: Optional[str] = None
    email: EmailStr
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    panNumber: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    aadhaar_number: Optional[str] = None
    password: str
    confirmPassword: Optional[str] = None

# Phone Normalization Helper
def normalize_phone(phone: str) -> str:
    """Clean and normalize phone number to E.164 format."""
    clean = "".join(c for c in phone if c.isdigit() or c == "+")
    if not clean.startswith("+"):
        if len(clean) == 10:
            return "+91" + clean
        else:
            return "+" + clean
    return clean

# Twilio / Internal OTP Verify API Helpers
def start_verification(phone: str) -> dict:
    """Generate verification code using secure internal OTP engine (Twilio SMS disabled)."""
    phone = normalize_phone(phone)
    if ENABLE_TWILIO_SMS and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID:
        try:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            verification = client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
                .verifications \
                .create(to=phone, channel='sms')
            logger.info(f"Twilio Verify SMS initiated to {phone}, status: {verification.status}")
            return {"mode": "twilio"}
        except Exception as e:
            logger.error(f"Twilio Verify call skipped/failed: {e}.")

    # Secure internal DB-backed OTP generation
    otp = f"{secrets.randbelow(900000) + 100000}"
    logger.info(f"[OTP System] Verification code generated for {phone}: {otp}")
    return {"mode": "internal", "otp": otp}

def check_verification(phone: str, code: str, email: str) -> bool:
    """Check verification code with single-use, max attempts, and expiration checks."""
    phone = normalize_phone(phone)
    record = get_otp(email)
    if record:
        # Rate limit OTP attempts (max 3 tries)
        attempts = increment_otp_attempt(email)
        if attempts > 3:
            delete_otp(email)
            logger.warning(f"OTP verification attempt limit exceeded for {email}. Deleting OTP.")
            return False

        # Check expiration (5 minutes = 300 seconds)
        created_at_str = record.get("created_at")
        if created_at_str:
            try:
                created_dt = datetime.datetime.fromisoformat(created_at_str)
                if (datetime.datetime.now(datetime.timezone.utc) - created_dt).total_seconds() > 300:
                    delete_otp(email)
                    logger.warning(f"OTP for {email} has expired.")
                    return False
            except Exception:
                pass

        if record["otp"] == code:
            delete_otp(email)  # Single-use: delete immediately on success
            return True
        return False

    if ENABLE_TWILIO_SMS and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID:
        try:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            verification_check = client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
                .verification_checks \
                .create(to=phone, code=code)
            return verification_check.status == "approved"
        except Exception as e:
            logger.error(f"Twilio Verify Check failed: {e}")
            return False

    return False

def get_current_user_email(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Must start with 'Bearer '"
        )
    
    token = authorization.split(" ")[1]

    # 1. Try Firebase Admin SDK cryptographic verification if initialized
    if HAS_FIREBASE and firebase_admin and firebase_admin._apps:
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            email = decoded_token.get("email")
            uid = decoded_token.get("uid")
            name = decoded_token.get("name") or (email.split("@")[0] if email else "User")
            picture = decoded_token.get("picture") or ""
            if email:
                save_google_user(email=email, full_name=name, firebase_uid=uid, avatar=picture)
                return email.strip().lower()
        except Exception:
            pass

    # 2. Cryptographic JWT access token verification with pinned algorithm and strict signature check
    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or Token expired"
        )

    # Check server-side token & session revocation
    jti = payload.get("jti")
    if jti and is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked or logged out."
        )

    sid = payload.get("sid")
    if sid and is_session_revoked(sid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired."
        )

    # Account type & role validation
    account_type = (payload.get("account_type") or payload.get("accountType") or "").strip().lower()
    role = str(payload.get("role") or "").strip().lower()
    # Allow all valid platform roles (customers, lenders, vendors, owners, admins, etc.)
    valid_roles = (
        "admin", "superadmin", "customer", "renter", "user", "lender",
        "vendor", "owner", "partner", "host", "merchant", "payernt", "paye₹nt", ""
    )
    if role and role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or unauthorized account role.",
        )

    user_email = payload["sub"].strip().lower()
    user = get_user(user_email)
    if not user:
        return user_email
    user_status = str(user.get("status") or "").lower().strip()
    if user_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact support."
        )
    if user_status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deleted or deactivated."
        )
    if user_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account application has been rejected. Please contact support."
        )

    return user_email

def get_optional_current_user_email(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user_email(authorization)
    except Exception:
        return None

def require_authenticated_user(authorization: Optional[str] = Header(None)) -> dict:
    email = get_current_user_email(authorization)
    user = get_user(email)
    if not user:
        user = {
            "email": email,
            "full_name": email.split("@")[0],
            "role": "user",
            "status": "active"
        }
    user_status = str(user.get("status") or "").lower().strip()
    if user_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact support."
        )
    if user_status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deleted or deactivated."
        )
    if user_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account application has been rejected. Please contact support."
        )
    return user

def get_approved_user(current_email: str = Depends(get_current_user_email)) -> dict:
    """
    Enforces that only verified, active/approved users can perform protected
    marketplace actions (Cart, Booking, Payment, Listing, Delivery).
    """
    clean_email = current_email.strip().lower()
    user = get_user(clean_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
    user_status = str(user.get("status") or "pending").lower().strip()
    if user_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact support."
        )
    if user_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account application has been rejected. Please contact support."
        )
    if user_status == "deleted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deleted or deactivated."
        )
    # Admin users bypass approval checks
    if str(user.get("role", "")).lower() == "admin":
        return user
    if user_status not in ("active", "approved"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account approval pending. Your account must be approved by an administrator before accessing marketplace transactions."
        )
    return user

def require_admin(current_user: dict = Depends(require_authenticated_user)) -> dict:
    role = str(current_user.get("role", "")).upper()
    if role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Admin access required."
        )
    return current_user

# Refresh Token Schema
class RefreshTokenSchema(BaseModel):
    refresh_token: Optional[str] = None

# Endpoints
@app.post("/api/register/request")
def register_request(data: OTPRequestSchema, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    key = f"regreq:{client_ip}"
    is_locked, secs = record_failed_auth_attempt(key, max_attempts=5, lock_duration_secs=600)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many registration requests. Please try again in {secs // 60} minutes."
        )

    clean_email = data.email.lower().strip()
    clean_phone = normalize_phone(data.phone)
    
    # Preventing enumeration: Return standard success message even if email exists
    existing = get_user(clean_email)
    if existing:
        return {"success": True, "message": "If this email is eligible, a verification code has been dispatched."}
    
    # Start internal OTP verification flow
    result = start_verification(clean_phone)
    if result["mode"] == "twilio":
        delete_otp(clean_email)
        return {"success": True, "message": "Verification code sent via SMS."}
    else:
        save_otp(clean_email, clean_phone, result["otp"])
        return {"success": True, "otp": result["otp"], "message": "Verification code generated successfully."}

@app.post("/api/register", status_code=status.HTTP_201_CREATED)
@app.post("/api/register/verify", status_code=status.HTTP_201_CREATED)
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_verify(data: RegisterVerifySchema, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    key = f"regver:{client_ip}:{data.email.lower().strip()}"
    is_locked, secs = record_failed_auth_attempt(key, max_attempts=5, lock_duration_secs=600)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many verification attempts. Please try again in {secs // 60} minutes."
        )

    # Identity validation: PAN Number (for pay₹ent renter side) or Aadhaar Number (if supplied)
    raw_pan = data.pan_number or data.panNumber
    raw_aadhaar = data.aadhaar_number or data.aadhaarNumber
    clean_pan = str(raw_pan).strip().upper() if raw_pan else None
    clean_aadhaar = str(raw_aadhaar).strip() if raw_aadhaar else None

    if clean_pan:
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", clean_pan):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter a valid PAN number format (e.g. ABCDE1234F)."
            )
    elif clean_aadhaar:
        if not re.match(r"^\d{12}$", clean_aadhaar):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aadhaar number must consist of exactly 12 numeric digits."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identity verification number (PAN Number) is required."
        )

    clean_email = data.email.lower().strip()
    clean_phone = normalize_phone(data.phone)
    
    # Verify the code if OTP is explicitly supplied and not bypassing direct registration
    if data.otp and data.otp.upper() not in ("DIRECT", "BYPASS", "000000"):
        is_valid = check_verification(clean_phone, data.otp, clean_email)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code."
            )
    
    # Duplicate account checks for target pay₹ent side
    existing = get_user(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your pay₹ent account already exists. Please login."
        )

    existing_phone_user = get_user_by_phone(clean_phone)
    if existing_phone_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your pay₹ent account with this phone number already exists. Please login."
        )

    # Determine the role (Preserve Admin Account Model)
    role = "user"
    if data.admin_code:
        if data.admin_code == ADMIN_SETUP_CODE:
            role = "admin"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid admin setup code."
            )

    display_name = data.full_name or data.fullName or clean_email.split("@")[0]

    # Validate password complexity
    is_valid_pwd, pwd_err = validate_password_strength(data.password)
    if not is_valid_pwd:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    hashed = hash_password(data.password)
    user_status = "APPROVED" if role == "admin" else "PENDING_REVIEW"
    is_verified = bool(role == "admin")

    from payernt_database import get_or_create_person
    person_id = data.person_id or data.personId or get_or_create_person(display_name, clean_phone)

    created_user_res = create_user(
        email=clean_email,
        phone=clean_phone,
        password_hash=hashed,
        full_name=display_name,
        role=role,
        address=data.address,
        city=data.city,
        pincode=data.pincode,
        aadhaar_number=clean_aadhaar,
        pan_number=clean_pan,
        account_type="pay₹ent",
        status=user_status,
        person_id=person_id
    )
    
    delete_otp(clean_email)
    clear_failed_auth_attempts(key)
    logger.info(f"User registration successful for {clean_email} with role={role}, status={user_status}")
    
    account_id = f"PAYRENT_USER_{clean_email}"
    token = None
    if role == "admin":
        token_payload = {
            "sub": clean_email,
            "account_type": "pay₹ent",
            "user_id": account_id,
            "person_id": person_id,
            "role": role,
        }
        token = create_access_token(token_payload)
    
    user_record = {
        "id": clean_email,
        "accountId": account_id,
        "personId": person_id,
        "person_id": person_id,
        "accountType": "pay₹ent",
        "fullName": display_name,
        "email": clean_email,
        "phone": clean_phone,
        "role": role,
        "address": data.address,
        "city": data.city,
        "pincode": data.pincode,
        "panNumber": clean_pan,
        "panMasked": f"XXXXX{clean_pan[-5:]}" if clean_pan and len(clean_pan) == 10 else None,
        "status": user_status,
        "verified": is_verified,
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    broadcast_admin_event("user.registered", user_record)
    
    return {
        "success": True, 
        "token": token,
        "status": user_status,
        "accountType": "Payrent",
        "message": "Your account has been created successfully. Our Admin team is currently reviewing your submitted information.",
        "account": user_record,
        "user": user_record
    }


# ============================================================
# CROSS-ACCOUNT REGISTRATION CHECK (NAME + MOBILE + EMAIL)
# ============================================================

@app.post("/api/auth/check-registration")
@app.post("/api/paye₹nt/auth/check-registration")
def check_registration_endpoint(data: CheckRegistrationSchema):
    """
    Authoritative shared database check matching:
    NAME + MOBILE NUMBER + EMAIL simultaneously.
    Determines whether paye₹nt and/or pay₹ent accounts already exist for this person.
    Returns safe profile prefill data if eligible for second account creation.
    """
    from payernt_database import check_registration_identity
    phone_input = data.mobile or data.phone or data.phoneNumber or ""
    target = data.target_account_type or data.targetAccountType or "pay₹ent"
    return check_registration_identity(
        name=data.name,
        mobile=phone_input,
        email=str(data.email),
        target_account_type=target,
    )


# ============================================================
# CROSS-SIDE ACCOUNT CREATION ENDPOINTS
# ============================================================

@app.post("/api/auth/cross-side/check-mobile")
@app.post("/api/paye₹nt/auth/cross-side/check-mobile")
def cross_side_check_mobile_endpoint(data: CrossSideCheckMobileSchema):
    """Checks if mobile number exists on the opposite side and is eligible for cross-side prefill."""
    from payernt_database import check_cross_side_mobile_status
    target = data.target_account_type or data.targetAccountType or "pay₹ent"
    return check_cross_side_mobile_status(data.phone, target)


@app.post("/api/auth/cross-side/send-otp")
@app.post("/api/paye₹nt/auth/cross-side/send-otp")
def cross_side_send_otp_endpoint(data: CrossSideSendOTPSchema):
    """Dispatches a secure OTP to verify ownership of the cross-side mobile number."""
    from payernt_database import create_cross_side_otp_challenge
    target = data.target_account_type or data.targetAccountType or "pay₹ent"
    try:
        return create_cross_side_otp_challenge(data.phone, target)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@app.post("/api/auth/cross-side/verify-otp")
@app.post("/api/paye₹nt/auth/cross-side/verify-otp")
def cross_side_verify_otp_endpoint(data: CrossSideVerifyOTPSchema):
    """Verifies OTP and securely releases non-sensitive prefill fields to the registration form."""
    from payernt_database import verify_cross_side_otp_challenge
    try:
        return verify_cross_side_otp_challenge(data.token, data.otp)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@app.post("/api/auth/cross-side/register")
@app.post("/api/paye₹nt/auth/cross-side/register")
def cross_side_register_endpoint(data: CrossSideRegisterSchema):
    """
    Creates a separate account on the second side linked via person_id.
    Requires valid verificationToken from completed mobile OTP verification.
    """
    from payernt_database import (
        consume_cross_side_verification_token,
        get_or_create_person,
        create_payernt_account,
        get_payernt_account_by_email
    )
    target = data.target_account_type or data.targetAccountType or "pay₹ent"
    norm_target = target.strip()

    try:
        context = consume_cross_side_verification_token(data.verificationToken, norm_target)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    verified_phone = context["phone"]
    prefill_details = context["details"]

    if data.confirmPassword and data.password != data.confirmPassword:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Passwords do not match.")

    is_valid_pwd, pwd_err = validate_password_strength(data.password)
    if not is_valid_pwd:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_err)

    clean_email = data.email.strip().lower()
    display_name = data.name or prefill_details.get("name") or clean_email.split("@")[0]
    address = data.address or prefill_details.get("address") or ""
    pincode = data.pincode or prefill_details.get("pincode") or ""

    person_id = get_or_create_person(display_name, verified_phone)

    if norm_target in ("pay₹ent", "customer", "renter"):
        raw_pan = data.pan_number or data.panNumber
        if not raw_pan:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PAN number is required for pay₹ent account registration.")
        clean_pan = str(raw_pan).strip().upper()
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", clean_pan):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid PAN number format (e.g. ABCDE1234F).")

        existing_u = get_user(clean_email)
        if existing_u:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A pay₹ent account with this email already exists.")

        create_user(
            email=clean_email,
            phone=verified_phone,
            password_hash=hash_password(data.password),
            full_name=display_name,
            role="user",
            address=address,
            city=data.city or "",
            pincode=pincode,
            pan_number=clean_pan,
            account_type="pay₹ent",
            status="active"
        )
        try:
            execute_query("UPDATE users SET person_id = %s WHERE email = %s", (person_id, clean_email))
        except Exception:
            pass

        account_id = f"PAYRENT_USER_{clean_email}"
        token = create_access_token({
            "sub": clean_email,
            "account_type": "pay₹ent",
            "user_id": account_id,
            "role": "user",
            "person_id": person_id
        })

        user_record = {
            "id": clean_email,
            "accountId": account_id,
            "personId": person_id,
            "accountType": "pay₹ent",
            "fullName": display_name,
            "email": clean_email,
            "phone": verified_phone,
            "address": address,
            "pincode": pincode,
            "panNumber": clean_pan,
            "status": "active"
        }
        return {
            "success": True,
            "token": token,
            "message": "pay₹ent customer account created successfully via cross-side verification.",
            "user": user_record
        }

    elif norm_target in ("paye₹nt", "vendor", "lender"):
        raw_aadhaar = data.aadhaar_number or data.aadhaarNumber
        if not raw_aadhaar:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aadhaar number is required for paye₹nt account registration.")
        clean_aadhaar = "".join(c for c in str(raw_aadhaar) if c.isdigit())
        if len(clean_aadhaar) != 12:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aadhaar number must consist of exactly 12 numeric digits.")

        existing_payernt = get_payernt_account_by_email(clean_email)
        if existing_payernt:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A paye₹nt account with this email already exists.")

        account = create_payernt_account(
            name=display_name,
            email=clean_email,
            aadhaar_number=clean_aadhaar,
            phone=verified_phone,
            address=address,
            pincode=pincode,
            password=data.password
        )
        try:
            execute_query("UPDATE payernt_accounts SET person_id = %s WHERE id = %s", (person_id, account["id"]))
        except Exception:
            pass

        token = create_access_token({
            "sub": clean_email,
            "account_type": "paye₹nt",
            "user_id": account["id"],
            "role": "vendor",
            "person_id": person_id
        })
        account["personId"] = person_id
        return {
            "success": True,
            "accountType": "paye₹nt",
            "userId": account["id"],
            "token": token,
            "account": account,
            "message": "paye₹nt vendor account created successfully via cross-side verification."
        }


@app.post("/api/login")
@app.post("/api/auth/login")
def login(data: LoginRequestSchema, request: Request, response: Response):
    clean_email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    ip_key = f"login_ip:{client_ip}"
    user_key = f"login_user:{clean_email}"

    # Rate Limiting Check
    is_locked_ip, secs_ip = record_failed_auth_attempt(ip_key, max_attempts=10, lock_duration_secs=900)
    if is_locked_ip:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts from this IP. Please try again in {secs_ip // 60} minutes."
        )
        
    is_locked_user, secs_user = record_failed_auth_attempt(user_key, max_attempts=5, lock_duration_secs=900)
    if is_locked_user:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account locked due to multiple failed logins. Please try again in {secs_user // 60} minutes or reset your password."
        )

    user = get_user(clean_email)
    if not user or not verify_password(data.password, user["password_hash"]):
        logger.warning(f"Failed login attempt for {clean_email} from IP {client_ip}")
        # Uniform failure message to prevent enumeration
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_status = str(user.get("status", "")).upper()
    if user.get("role") not in ("admin", "superadmin"):
        if user_status in ("PENDING_REVIEW", "PENDING", "UNVERIFIED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "status": "PENDING_REVIEW",
                    "accountType": "Payrent",
                    "email": user["email"],
                    "message": "Your account is still under review. Our Admin team is currently reviewing your submitted information."
                }
            )
        if user_status in ("REJECTED", "DECLINED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "status": "REJECTED",
                    "accountType": "Payrent",
                    "email": user["email"],
                    "rejectionReason": user.get("rejection_reason") or "Your submitted information could not be verified.",
                    "message": "Your account was not approved."
                }
            )
        if user_status in ("SUSPENDED", "INACTIVE", "BANNED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "status": "SUSPENDED",
                    "accountType": "Payrent",
                    "email": user["email"],
                    "message": "Your account has been suspended. Please contact support."
                }
            )

    # Clear lockout on success
    clear_failed_auth_attempts(ip_key)
    clear_failed_auth_attempts(user_key)

    # 1. Enforce single active user-side session: Revoke any active Payernt sessions
    revoke_cross_side_user_sessions(user["email"], user.get("person_id"), logging_in_account_type="payrent")

    # 2. Invalidate previous bearer token if present in headers (session switching)
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            prev_tok = auth_header.split(" ")[1]
            prev_dec = decode_access_token(prev_tok, expected_type="access")
            if prev_dec and "jti" in prev_dec:
                revoke_token(prev_dec["jti"], prev_dec.get("sub", ""), prev_dec.get("exp", 0))
        except Exception:
            pass

    # Generate session ID, 30-minute access token and 7-day refresh token
    session_id = f"sess-payrent-{uuid.uuid4()}"
    token_claims = {
        "sub": user["email"],
        "account_type": "pay₹ent",
        "accountType": "pay₹ent",
        "role": user.get("role", "customer"),
        "person_id": user.get("person_id"),
        "sid": session_id,
    }
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    # Detect user-agent & device metadata
    user_agent = request.headers.get("user-agent", "Unknown Browser")
    device_name = "Desktop" if ("Windows" in user_agent or "Macintosh" in user_agent or "Linux" in user_agent) and "Mobile" not in user_agent else ("Mobile" if "Mobile" in user_agent or "Android" in user_agent or "iPhone" in user_agent else "Web Browser")
    expires_at_str = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat()

    # Store hashed session entry in TiDB Cloud database
    create_db_session(session_id, user["email"], refresh_token, device_name, client_ip, user_agent, expires_at_str, account_type="payrent")

    # Set refresh token in HttpOnly, Secure cookie
    response.set_cookie(
        key="payent_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=7 * 86400
    )

    display_name = user.get("full_name") or clean_email.split("@")[0]
    user_record = {
        "id": user["email"],
        "accountId": f"PAYRENT_USER_{clean_email}",
        "accountType": "pay₹ent",
        "personId": user.get("person_id"),
        "fullName": display_name,
        "email": user["email"],
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
        "city": user.get("city", ""),
        "pincode": user.get("pincode", ""),
        "avatar": user.get("avatar") or f"https://ui-avatars.com/api/?name={display_name}&background=10b981&color=fff",
        "role": user.get("role", "customer"),
        "status": user.get("status", "active"),
        "verified": True
    }

    logger.info(f"Successful user login for {clean_email} from IP {client_ip} (session {session_id})")
    return {
        "success": True,
        "token": access_token,
        "refreshToken": refresh_token,
        "expiresIn": 1800,
        "accountType": "pay₹ent",
        "role": user["role"],
        "user": user_record,
        "message": "Login successful."
    }

@app.post("/api/auth/refresh")
@app.post("/api/refresh")
def refresh_token(request: Request, response: Response, data: Optional[RefreshTokenSchema] = None):
    # Retrieve refresh token from cookie or request body
    token = request.cookies.get("payent_refresh_token")
    if not token and data:
        token = data.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required."
        )

    payload = decode_access_token(token, expected_type="refresh")
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token."
        )

    # Validate active session hash in TiDB sessions table
    db_session = get_valid_db_session(token)
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked. Please sign in again."
        )

    user = get_user(payload["sub"])
    if not user or user.get("status") == "suspended":
        revoke_db_session(db_session["id"])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is suspended or invalid."
        )

    # Perform Refresh Token Rotation: Revoke old session and issue new session
    revoke_db_session(db_session["id"])

    new_session_id = f"sess-{uuid.uuid4()}"
    new_access_token = create_access_token({"sub": user["email"], "role": user["role"], "sid": new_session_id})
    new_refresh_token = create_refresh_token({"sub": user["email"], "role": user["role"], "sid": new_session_id})

    user_agent = request.headers.get("user-agent", db_session.get("user_agent", "Unknown Browser"))
    client_ip = request.client.host if request.client else db_session.get("ip_address", "127.0.0.1")
    device_name = db_session.get("device_name", "Web Browser")
    expires_at_str = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat()

    create_db_session(new_session_id, user["email"], new_refresh_token, device_name, client_ip, user_agent, expires_at_str)

    response.set_cookie(
        key="payent_refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=7 * 86400
    )

    return {
        "success": True,
        "token": new_access_token,
        "refreshToken": new_refresh_token,
        "expiresIn": 1800
    }

@app.post("/api/auth/logout")
@app.post("/api/logout")
def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    token = request.cookies.get("payent_refresh_token")
    if token:
        revoke_db_session_by_token(token)

    if authorization and authorization.startswith("Bearer "):
        access_tok = authorization.split(" ")[1]
        payload = decode_access_token(access_tok, expected_type="access")
        if payload and "jti" in payload:
            revoke_token(payload["jti"], payload.get("sub", ""), payload.get("exp", 0))

    response.delete_cookie("payent_refresh_token")
    return {"success": True, "message": "Logged out successfully."}

@app.post("/api/auth/logout-all")
def logout_all_sessions(response: Response, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    revoke_all_user_sessions(clean_email)
    response.delete_cookie("payent_refresh_token")
    return {"success": True, "message": "Logged out from all active devices."}

@app.get("/api/auth/sessions")
def list_user_sessions(request: Request, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    sessions = get_user_active_sessions(clean_email)
    
    current_token = request.cookies.get("payent_refresh_token")
    current_hash = hash_refresh_token(current_token) if current_token else None

    result = []
    for s in sessions:
        result.append({
            "id": s["id"],
            "deviceName": s.get("device_name") or "Browser Device",
            "ipAddress": s.get("ip_address") or "Unknown",
            "createdAt": s.get("created_at"),
            "lastUsedAt": s.get("last_used_at"),
            "expiresAt": s.get("expires_at"),
            "isCurrent": (s.get("refresh_token_hash") == current_hash) if current_hash else False
        })
    return {"success": True, "sessions": result}

@app.delete("/api/auth/sessions/{session_id}")
def revoke_specific_session(session_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    sessions = get_user_active_sessions(clean_email)
    match = next((s for s in sessions if s["id"] == session_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Session not found or already revoked.")
    
    revoke_db_session(session_id)
    return {"success": True, "message": "Session revoked successfully."}

def send_password_reset_link(email: str, reset_url: str) -> Tuple[bool, Optional[str]]:
    """
    Delivers password reset link via in-app notification and configured SMTP mailer.
    Raw reset secret is not logged in production application logs.
    """
    clean_email = (email or "").strip().lower()
    try:
        create_notification(
            email=clean_email,
            title="Password Reset Request",
            message="A password reset link has been dispatched for your account. If you did not request this, please secure your account.",
            notification_type="security"
        )
    except Exception as e:
        logger.warning(f"Failed to create password reset notification: {e}")

    if is_smtp_configured():
        subject = "Reset Your Payent Password"
        html = build_password_reset_email_html(reset_url)
        text = build_password_reset_email_text(reset_url)
        success, err = send_email_smtp(clean_email, subject, html, text)
        if not success:
            logger.warning(f"SMTP dispatch failed for {mask_email_safely(clean_email)}: {err}")
        return success, err
    else:
        logger.info(f"Outbound SMTP unconfigured. In-app notification recorded for {mask_email_safely(clean_email)}.")
        return True, None

@app.post("/api/forgot-password/request")
def forgot_password_request(data: ForgotPasswordRequestSchema, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    ip_key = f"forgotpw_ip:{client_ip}"
    email_key = f"forgotpw_email:{data.email.lower().strip()}"

    is_locked_ip, secs_ip = record_failed_auth_attempt(ip_key, max_attempts=10, lock_duration_secs=600)
    if is_locked_ip:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many password reset requests. Please try again in {secs_ip // 60} minutes."
        )

    is_locked_email, secs_email = record_failed_auth_attempt(email_key, max_attempts=5, lock_duration_secs=600)
    if is_locked_email:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many reset attempts for this account. Please try again in {secs_email // 60} minutes."
        )

    clean_email = data.email.lower().strip()
    user = get_user(clean_email)
    
    if not user:
        return {
            "success": False,
            "account_found": False,
            "recovery_authorized": False,
            "message": "No account found with this email address."
        }

    # Account exists in database -> Issue secure single-use recovery token for immediate password update
    active_recovery_token = create_password_reset_token(clean_email, expiry_seconds=900)
    
    return {
        "success": True,
        "account_found": True,
        "recovery_authorized": True,
        "recovery_token": active_recovery_token,
        "email": clean_email,
        "masked_email": mask_email_safely(clean_email) if "mask_email_safely" in globals() else clean_email,
        "message": "Account verified. Please set your new password."
    }

@app.post("/api/forgot-password/validate-token")
def validate_reset_token(data: ValidateResetTokenSchema):
    raw_token = (data.token or "").strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your password reset link is invalid or expired."
        )

    rec = get_password_reset_token_record(raw_token)
    now_int = int(time.time())
    if not rec or rec.get("used_at") is not None or rec.get("expires_at", 0) < now_int:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your password reset link is invalid or expired."
        )

    user_email = rec.get("user_email", "")
    return {
        "valid": True,
        "account_found": True,
        "recovery_authorized": True,
        "email": user_email,
        "masked_email": mask_email_safely(user_email) if "mask_email_safely" in globals() else user_email,
        "message": "Reset token is valid."
    }

@app.post("/api/forgot-password/reset")
def forgot_password_reset(data: ForgotPasswordResetSchema):
    raw_token = (data.recovery_token or data.token or "").strip()
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your password reset link is invalid or expired."
        )

    # 1. Enforce password strength policy first
    is_valid_pw, pw_err = validate_password_strength(data.new_password)
    if not is_valid_pw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet the required security rules."
        )

    # 2. Atomically consume the single-use reset token
    rec = consume_password_reset_token(raw_token)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your password reset link is invalid or expired."
        )

    user_email = rec["user_email"]
    user = get_user(user_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # 3. Hash new password and update user account in datastore
    hashed = hash_password(data.new_password)
    update_user_password(user_email, hashed)

    # 4. Invalidate all active user sessions across all devices
    revoke_all_user_sessions(user_email)

    logger.info("Secure password reset completed successfully for user.")
    return {
        "success": True,
        "message": "Password updated successfully."
    }

@app.post("/api/auth/create-admin", status_code=status.HTTP_201_CREATED)
def create_admin(
    data: CreateAdminSchema,
    request: Request,
    x_admin_creation_secret: Optional[str] = Header(None, alias="X-Admin-Creation-Secret")
):
    """
    Secure one-time admin account creation endpoint.
    Guarded by ADMIN_CREATION_SECRET and duplicate admin rejection logic.
    """
    provided_secret = x_admin_creation_secret or data.secret
    if not ADMIN_CREATION_SECRET or provided_secret != ADMIN_CREATION_SECRET:
        logger.warning(f"Unauthorized admin creation attempt for {data.email} from IP {request.client.host if request.client else 'unknown'}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin creation secret."
        )

    if has_admin_user():
        logger.warning(f"Admin creation attempt rejected for {data.email} — an admin account already exists.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An administrator account already exists. Bootstrap registration disabled."
        )

    valid_pass, msg = validate_password_strength(data.password)
    if not valid_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    clean_email = data.email.lower().strip()
    existing = get_user(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{clean_email}' already exists."
        )

    hashed = hash_password(data.password)
    display_name = data.name or clean_email.split("@")[0]

    created_user = create_user(
        email=clean_email,
        phone="+10000000000",
        password_hash=hashed,
        full_name=display_name,
        role="admin"
    )

    logger.info(f"First administrator account created successfully for {clean_email}")

    return {
        "success": True,
        "message": "First administrator account created successfully.",
        "user": {
            "name": display_name,
            "email": clean_email,
            "role": "ADMIN"
        }
    }

def mask_aadhaar(aadhaar: Optional[str]) -> str:
    if not aadhaar:
        return "XXXX-XXXX-9012"
    clean = "".join(c for c in str(aadhaar) if c.isdigit())
    if len(clean) >= 4:
        return f"XXXX-XXXX-{clean[-4:]}"
    return "XXXX-XXXX-9012"

def mask_pan(pan: Optional[str]) -> str:
    if not pan:
        return "XXXXX1234F"
    clean = str(pan).strip().upper()
    if len(clean) >= 5:
        return f"XXXXX{clean[-5:]}"
    return clean

@app.get("/api/me")
@app.get("/api/auth/me")
@app.get("/api/users/me")
@app.get("/api/profile")
def get_me(current_user_email: str = Depends(get_current_user_email)):
    user = get_user(current_user_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found."
        )
    display_name = user.get("full_name") or user["email"].split("@")[0]
    lat_val = float(user["latitude"]) if user.get("latitude") is not None else None
    lng_val = float(user["longitude"]) if user.get("longitude") is not None else None
    
    aadhaar_num = user.get("aadhaar_number")
    aadhaar_masked = mask_aadhaar(aadhaar_num)
    pan_num = user.get("pan_number") or ""
    pan_masked = mask_pan(pan_num) if pan_num else "XXXXX1234F"
    photo_url = user.get("profile_photo_url") or user.get("avatar") or ""

    return {
        "id": user["email"],
        "email": user["email"],
        "fullName": display_name,
        "role": user.get("role", "customer"),
        "phone": user.get("phone", ""),
        "panNumber": pan_num,
        "pan_number": pan_num,
        "panMasked": pan_masked,
        "pan_masked": pan_masked,
        "aadhaarMasked": aadhaar_masked,
        "aadhaar_masked": aadhaar_masked,
        "profilePhotoUrl": photo_url,
        "profile_photo_url": photo_url,
        "address": user.get("address", ""),
        "city": user.get("city", ""),
        "state": user.get("state", ""),
        "country": user.get("country", "India"),
        "pincode": user.get("pincode", ""),
        "latitude": lat_val,
        "longitude": lng_val,
        "locationUpdatedAt": user.get("location_updated_at", ""),
        "occupation": user.get("occupation", ""),
        "bio": user.get("bio", ""),
        "avatar": photo_url,
        "status": user.get("status", "active"),
        "verified": True
    }

@app.get("/api/auth/status")
@app.get("/api/users/me/status")
@app.get("/api/status")
def get_auth_status(
    email: Optional[str] = None,
    type: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    clean_email = None
    if email:
        clean_email = email.strip().lower()
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = decode_access_token(token, expected_type="access")
            if payload and "sub" in payload:
                clean_email = payload.get("sub", "").strip().lower()
        except Exception:
            pass

    if not clean_email:
        raise HTTPException(status_code=401, detail="Authentication token or email required.")

    account_type_req = (type or "").lower().strip()
    status_val = "PENDING_REVIEW"
    rejection_reason = None
    reviewed_by = None
    reviewed_at = None
    matched_type = "Payrent"
    role_val = "customer"

    # If checking Payernt / Vendor / Lender
    if "payernt" in account_type_req or "vendor" in account_type_req or "lender" in account_type_req:
        from payernt_database import get_payernt_account_by_email
        p_acc = get_payernt_account_by_email(clean_email)
        if p_acc:
            raw_s = str(p_acc.get("status", "PENDING_REVIEW")).upper()
            status_val = "APPROVED" if raw_s in ("APPROVED", "ACTIVE") else ("REJECTED" if raw_s == "REJECTED" else "PENDING_REVIEW")
            rejection_reason = p_acc.get("rejection_reason")
            reviewed_by = p_acc.get("reviewed_by")
            reviewed_at = p_acc.get("reviewed_at")
            matched_type = "Payernt"
            role_val = "lender"
    else:
        user = get_user(clean_email)
        if user:
            raw_s = str(user.get("status", "PENDING_REVIEW")).upper()
            role_val = user.get("role", "customer")
            if role_val in ("admin", "superadmin"):
                status_val = "APPROVED"
            else:
                status_val = "APPROVED" if raw_s in ("APPROVED", "ACTIVE") else ("REJECTED" if raw_s == "REJECTED" else "PENDING_REVIEW")
            rejection_reason = user.get("rejection_reason")
            reviewed_by = user.get("reviewed_by")
            reviewed_at = user.get("reviewed_at")
            matched_type = "Payernt" if role_val == "lender" or user.get("account_type") == "paye₹nt" else "Payrent"
        else:
            from payernt_database import get_payernt_account_by_email
            p_acc = get_payernt_account_by_email(clean_email)
            if p_acc:
                raw_s = str(p_acc.get("status", "PENDING_REVIEW")).upper()
                status_val = "APPROVED" if raw_s in ("APPROVED", "ACTIVE") else ("REJECTED" if raw_s == "REJECTED" else "PENDING_REVIEW")
                rejection_reason = p_acc.get("rejection_reason")
                reviewed_by = p_acc.get("reviewed_by")
                reviewed_at = p_acc.get("reviewed_at")
                matched_type = "Payernt"
                role_val = "lender"

    is_approved = status_val == "APPROVED"
    return {
        "email": clean_email,
        "status": status_val,
        "is_approved": is_approved,
        "accountType": matched_type,
        "role": role_val,
        "verified": is_approved,
        "rejectionReason": rejection_reason,
        "reviewedBy": reviewed_by,
        "reviewedAt": reviewed_at,
    }

@app.get("/api/profile/stats")
@app.get("/api/users/me/stats")
def get_user_profile_stats(current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    
    def _calculate_stats():
        conn = get_db_connection()
        if not conn:
            return {
                "completed_rentals": 0,
                "lender_rating": None,
                "review_count": 0,
                "on_time_return_rate": None,
                "average_response_time_minutes": None,
                "has_data": False
            }
        try:
            with conn.cursor() as cursor:
                # 1. Completed rentals (as renter + as lender) in single query
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM orders WHERE user_email = %s AND (status = 'completed' OR status = 'active')) as renter_orders,
                        (SELECT COUNT(*) FROM orders o JOIN custom_products cp ON o.product_id = cp.id WHERE cp.user_email = %s AND (o.status = 'completed' OR o.status = 'active')) as lender_orders
                """, (clean_email, clean_email))
                order_row = cursor.fetchone() or {}
                renter_orders = int(order_row.get("renter_orders", 0) or 0)
                lender_orders = int(order_row.get("lender_orders", 0) or 0)
                total_completed = renter_orders + lender_orders

                # 2. Rating and review count in single consolidated aggregation
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(r.id) FROM reviews r JOIN custom_products cp ON r.product_id = cp.id WHERE cp.user_email = %s AND (r.hidden = 0 OR r.hidden IS NULL)) as lender_rev_cnt,
                        (SELECT AVG(r.rating) FROM reviews r JOIN custom_products cp ON r.product_id = cp.id WHERE cp.user_email = %s AND (r.hidden = 0 OR r.hidden IS NULL)) as lender_avg_r,
                        (SELECT COUNT(id) FROM reviews WHERE user_email = %s AND (hidden = 0 OR hidden IS NULL)) as user_rev_cnt,
                        (SELECT AVG(rating) FROM reviews WHERE user_email = %s AND (hidden = 0 OR hidden IS NULL)) as user_avg_r
                """, (clean_email, clean_email, clean_email, clean_email))
                rev_row = cursor.fetchone() or {}
                lender_rev_cnt = int(rev_row.get("lender_rev_cnt", 0) or 0)
                lender_avg_r = rev_row.get("lender_avg_r")
                user_rev_cnt = int(rev_row.get("user_rev_cnt", 0) or 0)
                user_avg_r = rev_row.get("user_avg_r")

                final_rating = None
                final_review_count = 0
                if lender_rev_cnt > 0 and lender_avg_r is not None:
                    final_rating = round(float(lender_avg_r), 1)
                    final_review_count = lender_rev_cnt
                elif user_rev_cnt > 0 and user_avg_r is not None:
                    final_rating = round(float(user_avg_r), 1)
                    final_review_count = user_rev_cnt

                # 3. On-Time Return Rate
                on_time_rate = None
                if total_completed > 0:
                    on_time_rate = 100

                # 4. Average response time in minutes from support_tickets
                avg_response_min = None
                cursor.execute("""
                    SELECT messages FROM support_tickets 
                    WHERE user_email = %s 
                    ORDER BY created_at DESC LIMIT 5
                """, (clean_email,))
                ticket_rows = cursor.fetchall() or []
                diffs = []
                for trow in ticket_rows:
                    try:
                        msgs = json.loads(trow["messages"]) if isinstance(trow.get("messages"), str) else (trow.get("messages") or [])
                        if len(msgs) >= 2:
                            t0 = datetime.datetime.fromisoformat(msgs[0]["timestamp"].replace("Z", "+00:00"))
                            t1 = datetime.datetime.fromisoformat(msgs[1]["timestamp"].replace("Z", "+00:00"))
                            diff_min = abs((t1 - t0).total_seconds()) / 60.0
                            diffs.append(diff_min)
                    except Exception:
                        pass
                if diffs:
                    avg_response_min = int(sum(diffs) / len(diffs))

                has_data = total_completed > 0 or final_review_count > 0 or avg_response_min is not None

                return {
                    "completed_rentals": total_completed,
                    "lender_rating": final_rating,
                    "review_count": final_review_count,
                    "on_time_return_rate": on_time_rate,
                    "average_response_time_minutes": avg_response_min,
                    "has_data": has_data
                }
        finally:
            conn.close()

    return get_cached(f"profile_stats:{clean_email}", 30, _calculate_stats)

class ProfilePhotoUploadSchema(BaseModel):
    profile_photo_url: Optional[str] = None
    profilePhotoUrl: Optional[str] = None
    avatar: Optional[str] = None

@app.post("/api/users/profile/photo")
@app.post("/api/profile/photo")
@app.patch("/api/profile/photo")
def update_profile_photo_route(
    data: ProfilePhotoUploadSchema,
    current_user_email: str = Depends(get_current_user_email)
):
    clean_email = current_user_email.strip().lower()
    photo_url = data.profile_photo_url or data.profilePhotoUrl or data.avatar
    if not photo_url or not photo_url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile photo is required."
        )

    clean_photo = photo_url.strip()

    # Enforce safe URL / Data URI image format and 3MB size limit
    if not (clean_photo.startswith("http://") or clean_photo.startswith("https://") or clean_photo.startswith("data:image/")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Must be an HTTP/HTTPS URL or base64 image data URI."
        )
    if len(clean_photo) > 4 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile photo exceeds maximum size limit (3MB)."
        )

    # Ensure table columns support LONGTEXT for base64 photo storage
    try:
        execute_query("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL")
    except Exception:
        pass
    try:
        execute_query("ALTER TABLE users MODIFY COLUMN profile_photo_url LONGTEXT NULL")
    except Exception:
        pass

    # Update MySQL users table for current authenticated user
    try:
        execute_query(
            "UPDATE users SET profile_photo_url = %s, avatar = %s WHERE LOWER(email) = LOWER(%s)",
            (clean_photo, clean_photo, clean_email)
        )
    except Exception as e:
        logger.warning(f"Error in combined profile photo update for {clean_email}: {e}")
        try:
            execute_query(
                "UPDATE users SET profile_photo_url = %s WHERE LOWER(email) = LOWER(%s)",
                (clean_photo, clean_email)
            )
        except Exception as ex1:
            logger.warning(f"Error updating profile_photo_url in MySQL for {clean_email}: {ex1}")
        try:
            execute_query(
                "UPDATE users SET avatar = %s WHERE LOWER(email) = LOWER(%s)",
                (clean_photo, clean_email)
            )
        except Exception as ex2:
            logger.warning(f"Error updating avatar in MySQL for {clean_email}: {ex2}")

    # Update MOCK_USERS if active
    if clean_email in MOCK_USERS:
        MOCK_USERS[clean_email]["profile_photo_url"] = clean_photo
        MOCK_USERS[clean_email]["avatar"] = clean_photo

    # If user is an agent, sync photo to custom_products owner_avatar
    try:
        execute_query(
            "UPDATE custom_products SET owner_avatar = %s WHERE LOWER(user_email) = LOWER(%s)",
            (clean_photo, clean_email)
        )
    except Exception as e:
        logger.warning(f"Notice: Agent product owner avatar sync notice for {clean_email}: {e}")

    user = get_user(clean_email)
    display_name = user.get("full_name") if user else clean_email.split("@")[0]
    aadhaar_num = user.get("aadhaar_number") if user else None

    return {
        "success": True,
        "message": "Profile photo updated successfully.",
        "user": {
            "id": clean_email,
            "email": clean_email,
            "fullName": display_name,
            "profilePhotoUrl": clean_photo,
            "profile_photo_url": clean_photo,
            "avatar": clean_photo,
            "aadhaarMasked": mask_aadhaar(aadhaar_num),
            "aadhaar_masked": mask_aadhaar(aadhaar_num)
        }
    }

class UserProfileUpdateSchema(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    avatar: Optional[str] = None
    occupation: Optional[str] = None
    bio: Optional[str] = None

@app.post("/api/user/profile")
@app.post("/api/me/profile")
@app.patch("/api/me/profile")
@app.put("/api/me/profile")
@app.patch("/api/profile")
@app.put("/api/profile")
def update_user_profile_route(data: UserProfileUpdateSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    fields = []
    params = []
    
    if data.fullName is not None:
        fields.append("full_name = %s")
        params.append(data.fullName)
    if data.phone is not None:
        fields.append("phone = %s")
        params.append(data.phone)
    if data.address is not None:
        fields.append("address = %s")
        params.append(data.address)
    if data.city is not None:
        fields.append("city = %s")
        params.append(data.city)
    if data.state is not None:
        fields.append("state = %s")
        params.append(data.state)
    if data.country is not None:
        fields.append("country = %s")
        params.append(data.country)
    if data.pincode is not None:
        fields.append("pincode = %s")
        params.append(data.pincode)
        
    if data.latitude is not None:
        if not (-90.0 <= data.latitude <= 90.0):
            raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90.")
        fields.append("latitude = %s")
        params.append(data.latitude)
        
    if data.longitude is not None:
        if not (-180.0 <= data.longitude <= 180.0):
            raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180.")
        fields.append("longitude = %s")
        params.append(data.longitude)

    if data.latitude is not None or data.longitude is not None:
        fields.append("location_updated_at = %s")
        params.append(datetime.datetime.now(datetime.timezone.utc).isoformat())

    if data.avatar is not None:
        fields.append("avatar = %s")
        params.append(data.avatar)
        fields.append("profile_photo_url = %s")
        params.append(data.avatar)
    if data.occupation is not None:
        fields.append("occupation = %s")
        params.append(data.occupation)
    if data.bio is not None:
        fields.append("bio = %s")
        params.append(data.bio)
        
    if fields:
        params.append(clean_email)
        execute_query(f"UPDATE users SET {', '.join(fields)} WHERE LOWER(email) = LOWER(%s)", tuple(params))
        invalidate_user_cache(clean_email)
        
        if clean_email in MOCK_USERS:
            if data.fullName is not None: MOCK_USERS[clean_email]["full_name"] = data.fullName
            if data.phone is not None: MOCK_USERS[clean_email]["phone"] = data.phone
            if data.address is not None: MOCK_USERS[clean_email]["address"] = data.address
            if data.city is not None: MOCK_USERS[clean_email]["city"] = data.city
            if data.state is not None: MOCK_USERS[clean_email]["state"] = data.state
            if data.country is not None: MOCK_USERS[clean_email]["country"] = data.country
            if data.pincode is not None: MOCK_USERS[clean_email]["pincode"] = data.pincode
            if data.latitude is not None: MOCK_USERS[clean_email]["latitude"] = data.latitude
            if data.longitude is not None: MOCK_USERS[clean_email]["longitude"] = data.longitude
            if data.avatar is not None: MOCK_USERS[clean_email]["avatar"] = data.avatar
            if data.occupation is not None: MOCK_USERS[clean_email]["occupation"] = data.occupation
            if data.bio is not None: MOCK_USERS[clean_email]["bio"] = data.bio

    # Re-fetch updated profile
    return get_me(current_user_email=clean_email)

class LocationGeocodeSchema(BaseModel):
    latitude: float
    longitude: float

@app.post("/api/location/reverse-geocode")
def reverse_geocode_location(data: LocationGeocodeSchema, current_user_email: Optional[str] = Depends(get_optional_current_user_email)):
    if not (-90.0 <= data.latitude <= 90.0) or not (-180.0 <= data.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90, and longitude between -180 and 180.")

    import urllib.request
    import urllib.parse

    headers = {"User-Agent": "Payent-Rental-App/1.0 (contact@payent.in)"}
    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={data.latitude}&lon={data.longitude}"
    
    address_info = {
        "address": "",
        "city": "",
        "state": "",
        "country": "India",
        "pincode": "",
        "displayName": ""
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                res_data = json.loads(resp.read().decode("utf-8"))
                addr = res_data.get("address", {})
                city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb") or addr.get("county") or ""
                state = addr.get("state") or addr.get("state_district") or ""
                country = addr.get("country") or "India"
                pincode = addr.get("postcode") or ""
                road = addr.get("road") or addr.get("neighbourhood") or addr.get("suburb") or ""
                
                parts = [p for p in [road, city, state] if p]
                street_addr = ", ".join(parts)
                address_info["address"] = street_addr or res_data.get("display_name", "")
                address_info["city"] = city
                address_info["state"] = state
                address_info["country"] = country
                address_info["pincode"] = pincode
                address_info["displayName"] = res_data.get("display_name", "")
    except Exception as e:
        logger.warning(f"Reverse geocode lookup notice: {e}")

    return address_info

class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@app.post("/api/auth/change-password")
@app.post("/api/me/change-password")
def change_user_password(data: ChangePasswordSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation password do not match.")

    user = get_user(clean_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    stored_hash = user.get("password_hash")
    if stored_hash and not verify_password(data.current_password, stored_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    new_hash = hash_password(data.new_password)
    execute_query("UPDATE users SET password_hash = %s WHERE LOWER(email) = LOWER(%s)", (new_hash, clean_email))
    invalidate_user_cache(clean_email)
    if clean_email in MOCK_USERS:
        MOCK_USERS[clean_email]["password_hash"] = new_hash

    # Invalidate all active sessions across all devices for this user
    revoke_all_user_sessions(clean_email)

    return {"success": True, "message": "Password updated successfully. All other active sessions have been revoked."}

# Schemas and Routes for database persistence
class WishlistToggleSchema(BaseModel):
    product_id: str

class OrderSchema(BaseModel):
    id: str
    productId: Optional[str] = None
    product_id: Optional[str] = None
    productTitle: Optional[str] = None
    product_title: Optional[str] = None
    productImage: Optional[str] = None
    product_image: Optional[str] = None
    startDate: Optional[str] = None
    start_date: Optional[str] = None
    endDate: Optional[str] = None
    end_date: Optional[str] = None
    total: float
    status: Optional[str] = "active"

class ProductOwnerSchema(BaseModel):
    name: Optional[str] = "Verified Lender"
    avatar: Optional[str] = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
    rating: Optional[float] = 5.0

class CustomProductSchema(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    price: float
    image: str
    category: str
    rating: Optional[float] = 5.0
    reviews: Optional[int] = 0
    available: Optional[bool] = True
    isReference: Optional[bool] = False
    owner: Optional[ProductOwnerSchema] = None

class UpdateCustomProductSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    image: Optional[str] = None
    category: Optional[str] = None
    available: Optional[bool] = None

@app.get("/api/wishlist")
def fetch_wishlist(email: str = Depends(get_current_user_email)):
    return get_wishlist(email)

@app.post("/api/wishlist/toggle")
def toggle_wishlist_item(data: WishlistToggleSchema, email: str = Depends(get_current_user_email)):
    toggle_wishlist(email, data.product_id)
    return {"success": True}

@app.get("/api/orders")
def fetch_orders(email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    orders = get_orders(clean_email)
    
    result = []
    if not orders:
        return result
    for o in orders:
        if isinstance(o, dict):
            pid = str(o.get("product_id") or o.get("productId") or "")
            title = str(o.get("product_title") or o.get("productTitle") or "Gear Rental")
            img = str(o.get("product_image") or o.get("productImage") or "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600")
            start = str(o.get("start_date") or o.get("startDate") or "Today")
            end = str(o.get("end_date") or o.get("endDate") or "Tomorrow")
            created = str(o.get("created_at") or o.get("createdAt") or "")
            result.append({
                "id": str(o.get("id", "")),
                "productId": pid,
                "product_id": pid,
                "productTitle": title,
                "product_title": title,
                "productImage": img,
                "product_image": img,
                "startDate": start,
                "start_date": start,
                "endDate": end,
                "end_date": end,
                "total": float(o.get("total", 0)),
                "status": str(o.get("status", "active")),
                "createdAt": created,
                "created_at": created,
                "userEmail": clean_email,
                "user_email": clean_email
            })
    return result

@app.post("/api/orders")
def add_order(data: OrderSchema, current_user: dict = Depends(get_approved_user)):
    clean_email = current_user["email"].strip().lower()
    order_dict = getattr(data, "model_dump", data.dict)()
    pid = data.productId or data.product_id or ""
    title = data.productTitle or data.product_title or "Gear Rental"
    img = data.productImage or data.product_image or "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600"
    start = data.startDate or data.start_date or ""
    end = data.endDate or data.end_date or ""

    if not start or not end:
        raise HTTPException(status_code=400, detail="startDate and endDate are required.")

    s_dt = parse_date_safely(start)
    e_dt = parse_date_safely(end)
    if not s_dt or not e_dt:
        raise HTTPException(status_code=400, detail="Invalid start_date or end_date format.")

    today_dt = datetime.datetime.now(datetime.timezone.utc).date()
    s_date = s_dt.date() if isinstance(s_dt, datetime.datetime) else s_dt
    if s_date < today_dt:
        raise HTTPException(status_code=400, detail="Rental start date cannot be in the past.")
    if s_dt > e_dt:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date.")

    # Authoritative product existence & availability check
    prod = fetch_one_product(pid)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found in catalog.")

    is_avail, _, reason = evaluate_product_availability(prod)
    if not is_avail:
        raise HTTPException(status_code=400, detail=f"Product is currently unavailable: {reason}")

    normalized_order = {
        "id": data.id,
        "productId": pid,
        "product_id": pid,
        "productTitle": title,
        "product_title": title,
        "productImage": img,
        "product_image": img,
        "startDate": start,
        "start_date": start,
        "endDate": end,
        "end_date": end,
        "total": data.total,
        "status": data.status or "active",
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    try:
        create_order(clean_email, normalized_order)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(ve)
        )
    user = current_user
    cust_name = user["full_name"] if (user and isinstance(user, dict) and "full_name" in user) else clean_email.split("@")[0]

    # Notify customer
    create_notification(
        email=clean_email,
        title="Booking Request Confirmed 🎉",
        message=f"Your rental reservation for '{title}' (#{data.id}) has been created.",
        notif_type="booking"
    )

    # Notify lender
    lender_email = (prod.get("user_email") or "").strip().lower()
    if lender_email and lender_email != clean_email:
        create_notification(
            email=lender_email,
            title="New Rental Booking Received 📦",
            message=f"New booking #{data.id} for '{title}' from {cust_name}.",
            notif_type="booking"
        )
    
    broadcast_admin_event("booking.created", {
        "id": data.id,
        "productId": pid,
        "productTitle": title,
        "productImage": img,
        "customerId": clean_email,
        "customerName": cust_name,
        "startDate": start,
        "endDate": end,
        "amount": data.total,
        "status": "pending",
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    
    broadcast_admin_event("payment.created", {
        "id": f"pay-{data.id}",
        "bookingId": data.id,
        "customerId": clean_email,
        "customerName": cust_name,
        "amount": data.total,
        "status": "successful",
        "method": "Credit Card",
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    return {"success": True}

@app.post("/api/orders/{id}/cancel")
def cancel_user_order(id: str, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    order = fetch_one("SELECT * FROM orders WHERE id = %s OR product_id = %s", (id, id))
    if not order and id in MOCK_ORDERS:
        order = MOCK_ORDERS[id]

    if not order:
        user_orders = get_orders(clean_email)
        for uo in user_orders:
            if uo.get("id") == id or uo.get("productId") == id or uo.get("product_id") == id:
                order = uo
                break

    if order:
        order_owner = (order.get("user_email") or order.get("userEmail") or "").strip().lower()
        user = get_user(clean_email)
        is_admin = (user.get("role") == "admin") if (user and isinstance(user, dict)) else False

        if order_owner and order_owner != clean_email and not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden. You do not have permission to cancel this order.")

    cancel_order(id)
    if order and order.get("id"):
        cancel_order(str(order.get("id")))

    logger.info(f"Order {id} cancelled by {clean_email}")
    broadcast_admin_event("booking.cancelled", {"id": id, "status": "cancelled"})
    return {"success": True, "message": "Order cancelled successfully."}

@app.get("/api/orders/{id}")
def get_order_details(id: str, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    order = fetch_one("SELECT * FROM orders WHERE id = %s", (id,))
    if not order and id in MOCK_ORDERS:
        order = MOCK_ORDERS[id]
    if not order:
        user_orders = get_orders(clean_email)
        for uo in user_orders:
            if uo.get("id") == id:
                order = uo
                break

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    order_owner = (order.get("user_email") or order.get("userEmail") or "").strip().lower()
    user = get_user(clean_email)
    is_admin = (user.get("role") == "admin") if (user and isinstance(user, dict)) else False
    if order_owner and order_owner != clean_email and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden. You do not have permission to view this order.")

    pid = str(order.get("product_id") or order.get("productId") or "")
    title = str(order.get("product_title") or order.get("productTitle") or "Gear Rental")
    img = str(order.get("product_image") or order.get("productImage") or "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600")
    start = str(order.get("start_date") or order.get("startDate") or "Today")
    end = str(order.get("end_date") or order.get("endDate") or "Tomorrow")
    created = str(order.get("created_at") or order.get("createdAt") or "")

    return {
        "id": str(order.get("id", "")),
        "productId": pid,
        "product_id": pid,
        "productTitle": title,
        "product_title": title,
        "productImage": img,
        "product_image": img,
        "startDate": start,
        "start_date": start,
        "endDate": end,
        "end_date": end,
        "total": float(order.get("total", 0)),
        "status": str(order.get("status", "active")),
        "createdAt": created,
        "created_at": created,
        "user_email": order_owner,
        "userEmail": order_owner
    }

# ============================================================
# Order Return & Rental Completion Endpoints
# ============================================================

@app.post("/api/orders/{id}/return")
def initiate_order_return(id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    order = fetch_one("SELECT * FROM orders WHERE id = %s", (id,))
    if not order:
        order = MOCK_ORDERS.get(id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    cust_email = (order.get("user_email") or "").strip().lower()
    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"
    if clean_user != cust_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Only the renter or admin can initiate a return.")

    status_val = str(order.get("status") or "").lower()
    if status_val in ("cancelled", "refunded", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot initiate return on {status_val} booking.")
    if status_val == "completed":
        raise HTTPException(status_code=400, detail="Booking is already completed.")

    execute_query("UPDATE orders SET status = 'return_initiated' WHERE id = %s", (id,))
    if id in MOCK_ORDERS:
        MOCK_ORDERS[id]["status"] = "return_initiated"

    # Notify lender
    pid = order.get("product_id") or ""
    prod = fetch_one_product(pid) if pid else None
    lender_email = (prod.get("user_email") if prod else "").strip().lower()
    if lender_email:
        create_notification(
            email=lender_email,
            title="Rental Return Initiated 🔄",
            message=f"Customer has initiated gear return for booking #{id}.",
            notif_type="booking"
        )

    broadcast_admin_event("booking.return_initiated", {"id": id, "status": "return_initiated"})
    return {"success": True, "message": "Return initiated successfully.", "status": "return_initiated"}

@app.post("/api/orders/{id}/return-confirm")
def confirm_order_return(id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    order = fetch_one("SELECT * FROM orders WHERE id = %s", (id,))
    if not order:
        order = MOCK_ORDERS.get(id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    pid = order.get("product_id") or ""
    prod = fetch_one_product(pid) if pid else None
    lender_email = (prod.get("user_email") if prod else "").strip().lower()
    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Only the lender or admin can confirm gear return receipt.")

    status_val = str(order.get("status") or "").lower()
    if status_val in ("cancelled", "refunded", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot confirm return on {status_val} booking.")
    if status_val not in ("return_initiated", "active", "delivered"):
        raise HTTPException(status_code=400, detail=f"Invalid booking state for return confirmation: {status_val}")

    execute_query("UPDATE orders SET status = 'returned' WHERE id = %s", (id,))
    if id in MOCK_ORDERS:
        MOCK_ORDERS[id]["status"] = "returned"

    # Notify customer
    cust_email = (order.get("user_email") or "").strip().lower()
    if cust_email:
        create_notification(
            email=cust_email,
            title="Gear Return Confirmed ✅",
            message=f"Lender has inspected and confirmed receipt of returned gear for booking #{id}.",
            notif_type="booking"
        )

    broadcast_admin_event("booking.returned", {"id": id, "status": "returned"})
    return {"success": True, "message": "Gear return confirmed successfully.", "status": "returned"}

@app.post("/api/orders/{id}/complete")
def complete_order_endpoint(id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    order = fetch_one("SELECT * FROM orders WHERE id = %s", (id,))
    if not order:
        order = MOCK_ORDERS.get(id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    pid = order.get("product_id") or ""
    prod = fetch_one_product(pid) if pid else None
    lender_email = (prod.get("user_email") if prod else "").strip().lower()
    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Only the lender or admin can mark a rental as completed.")

    status_val = str(order.get("status") or "").lower()
    if status_val in ("cancelled", "refunded", "rejected"):
        raise HTTPException(status_code=400, detail="Cannot complete a cancelled or refunded booking.")
    if status_val not in ("returned", "active", "return_initiated"):
        raise HTTPException(status_code=400, detail=f"Cannot prematurely complete booking in status '{status_val}'. Return must be completed first.")

    execute_query("UPDATE orders SET status = 'completed' WHERE id = %s", (id,))
    if id in MOCK_ORDERS:
        MOCK_ORDERS[id]["status"] = "completed"

    # Notify customer
    cust_email = (order.get("user_email") or "").strip().lower()
    if cust_email:
        create_notification(
            email=cust_email,
            title="Rental Completed! 🌟",
            message=f"Your rental #{id} is complete. You can now leave a verified review for this gear.",
            notif_type="booking"
        )

    broadcast_admin_event("booking.completed", {"id": id, "status": "completed"})
    return {"success": True, "message": "Booking marked as completed.", "status": "completed"}

# ============================================================
# Product Availability & Booking Conflict Endpoints
# ============================================================

class BatchAvailabilitySchema(BaseModel):
    start_date: str
    end_date: str
    product_ids: List[str]

class AddToCartSchema(BaseModel):
    product_id: str
    start_date: str
    end_date: str

@app.post("/api/products/availability/batch")
def check_availability_batch(data: BatchAvailabilitySchema):
    start_str = data.start_date.strip() if data.start_date else ""
    end_str = data.end_date.strip() if data.end_date else ""
    pids = [str(pid).strip() for pid in data.product_ids if str(pid).strip()]
    
    start_dt = parse_date_safely(start_str)
    end_dt = parse_date_safely(end_str)
    if not start_dt or not end_dt:
        raise HTTPException(status_code=400, detail="Invalid start_date or end_date format.")
    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date.")

    # High-performance 2-query batch resolution
    availability_map = evaluate_products_availability_batch(pids, start_str, end_str)

    return {
        "start_date": start_str,
        "end_date": end_str,
        "availability": availability_map
    }

@app.get("/api/products/{id}/availability")
def check_single_product_availability(
    id: str,
    start_date: str = Query(...),
    end_date: str = Query(...)
):
    start_dt = parse_date_safely(start_date)
    end_dt = parse_date_safely(end_date)
    if not start_dt or not end_dt:
        raise HTTPException(status_code=400, detail="Invalid start_date or end_date format.")
    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date.")

    avail_map = evaluate_products_availability_batch([id], start_date, end_date)
    info = avail_map.get(id, {"status": "available", "is_available": True, "reason": None})

    return {
        "product_id": id,
        "start_date": start_date,
        "end_date": end_date,
        "is_available": info.get("is_available", True),
        "status": info.get("status", "available"),
        "reason": info.get("reason")
    }

# ============================================================
# Cart Endpoints
# ============================================================

@app.get("/api/cart")
def get_cart_endpoint(email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    raw_items = get_user_cart(clean_email)
    
    if not raw_items:
        return {
            "items": [],
            "count": 0,
            "subtotal": 0,
            "tax": 0,
            "total": 0
        }

    # Batch conflict check for all cart items in a single query
    pids = [it.get("product_id") for it in raw_items if it.get("product_id")]
    earliest_start = min((it.get("start_date") for it in raw_items if it.get("start_date")), default=None)
    latest_end = max((it.get("end_date") for it in raw_items if it.get("end_date")), default=None)
    conflicted_set = set()
    if pids and earliest_start and latest_end:
        conflicted_set = set(check_products_booking_conflicts(pids, earliest_start, latest_end))

    items = []
    subtotal = 0
    for it in raw_items:
        pid = it.get("product_id")
        start_d = it.get("start_date")
        end_d = it.get("end_date")
        
        s_dt = parse_date_safely(start_d)
        e_dt = parse_date_safely(end_d)
        days = max(1, (e_dt - s_dt).days) if (s_dt and e_dt) else int(it.get("days") or 1)
        daily_price = int(it.get("daily_price") or it.get("price") or 0)
        item_total = daily_price * days
        
        is_conflicted = pid in conflicted_set
        is_active = bool(it.get("is_product_active", True))
        
        is_avail = (not is_conflicted) and is_active
        reason = None
        if is_conflicted:
            reason = "Booked for selected dates"
        elif not is_active:
            reason = "Product currently unavailable"
            
        enriched_item = {
            "id": it.get("id"),
            "user_email": clean_email,
            "userEmail": clean_email,
            "product_id": pid,
            "productId": pid,
            "title": it.get("title") or "Tech Gear",
            "price": daily_price,
            "daily_price": daily_price,
            "dailyPrice": daily_price,
            "image": it.get("image") or "",
            "category": it.get("category") or "gear",
            "city": it.get("city") or "India",
            "start_date": start_d,
            "startDate": start_d,
            "end_date": end_d,
            "endDate": end_d,
            "days": days,
            "total_price": item_total,
            "totalPrice": item_total,
            "is_available": is_avail,
            "isAvailable": is_avail,
            "conflict_reason": reason,
            "conflictReason": reason,
            "created_at": it.get("created_at") or "",
            "updated_at": it.get("updated_at") or ""
        }
        items.append(enriched_item)
        subtotal += item_total
        
    tax = int(round(subtotal * 0.08))
    total = subtotal + tax
    
    return {
        "items": items,
        "count": len(items),
        "subtotal": subtotal,
        "tax": tax,
        "total": total
    }

class AddToCartSchema(BaseModel):
    product_id: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@app.post("/api/cart")
def add_to_cart_endpoint(data: AddToCartSchema, current_user: dict = Depends(get_approved_user)):
    clean_email = current_user["email"].strip().lower()
    pid = data.product_id.strip()
    start_d = data.start_date.strip() if data.start_date else ""
    end_d = data.end_date.strip() if data.end_date else ""

    # If dates are missing, fallback to tomorrow -> 4 days later
    if not start_d or not end_d:
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        start_d = (now_dt + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        end_d = (now_dt + datetime.timedelta(days=4)).strftime("%Y-%m-%d")

    s_dt = parse_date_safely(start_d)
    e_dt = parse_date_safely(end_d)
    if not s_dt or not e_dt:
        raise HTTPException(status_code=400, detail="Invalid start_date or end_date format.")
    today_dt = datetime.datetime.now(datetime.timezone.utc).date()
    s_date = s_dt.date() if isinstance(s_dt, datetime.datetime) else s_dt
    if s_date < today_dt:
        raise HTTPException(status_code=400, detail="Rental start date cannot be in the past.")
    if s_dt > e_dt:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date.")

    # Phase 10A Optimized Round Trip 1: Consolidated Cart Validation Bundle
    bundle = fetch_cart_validation_bundle(
        product_id=pid,
        user_email=clean_email,
        start_date_str=start_d,
        end_date_str=end_d
    )
    if not bundle or not bundle.get("product"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This product is no longer available."
        )

    # Check booking conflicts for selected rental dates
    if bundle.get("conflict_count", 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product is already booked for the selected dates. This product is no longer available."
        )

    prod = bundle["product"]
    # Authoritative in-memory availability evaluation (0 DB round trips)
    is_avail, avail_status, reason = evaluate_product_availability(prod, booked_pids_set=set())
    if not is_avail:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This product is no longer available."
        )

    days = max(1, (e_dt - s_dt).days)
    daily_price = int(prod.get("price") or 0)
    total_price = daily_price * days

    # Phase 10A Optimized Round Trip 2: Atomic upsert with known cart item ID (no re-select)
    item = add_or_update_cart_item(
        user_email=clean_email,
        product_id=pid,
        start_date=start_d,
        end_date=end_d,
        days=days,
        daily_price=daily_price,
        total_price=total_price,
        product_details=prod,
        existing_item_id=bundle.get("existing_cart_item_id")
    )

    return {
        "success": True,
        "message": "Item added to cart successfully.",
        "item": item
    }

@app.delete("/api/cart/{item_id}")
def delete_cart_item_endpoint(item_id: str, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    remove_cart_item(clean_email, item_id)
    return {"success": True, "message": "Item removed from cart."}

@app.delete("/api/cart")
def clear_cart_endpoint(email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    clear_user_cart(clean_email)
    return {"success": True, "message": "Cart cleared."}

@app.post("/api/cart/checkout")
def validate_cart_checkout_endpoint(current_user: dict = Depends(get_approved_user)):
    clean_email = current_user["email"].strip().lower()
    raw_items = get_user_cart(clean_email)
    if not raw_items:
        raise HTTPException(status_code=400, detail="Cart is empty.")
        
    conflicted_items = []
    subtotal = 0
    for it in raw_items:
        pid = it.get("product_id")
        start_d = it.get("start_date")
        end_d = it.get("end_date")
        conflicts = check_products_booking_conflicts([pid], start_d, end_d)
        if pid in conflicts:
            conflicted_items.append({
                "id": it.get("id"),
                "product_id": pid,
                "title": it.get("title"),
                "reason": "Booked for selected dates"
            })
        s_dt = parse_date_safely(start_d)
        e_dt = parse_date_safely(end_d)
        days = max(1, (e_dt - s_dt).days) if (s_dt and e_dt) else int(it.get("days") or 1)
        subtotal += int(it.get("daily_price") or it.get("price") or 0) * days
        
    if conflicted_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Some items in your cart are no longer available for the selected dates.",
                "conflicts": conflicted_items
            }
        )
        
    tax = int(round(subtotal * 0.08))
    total = subtotal + tax
    return {
        "valid": True,
        "item_count": len(raw_items),
        "subtotal": subtotal,
        "tax": tax,
        "total": total
    }

def format_product_dict(p: dict, is_summary: bool = False, booked_pids_set: Optional[Set[str]] = None, is_public: bool = False) -> dict:
    owner_info = p.get("owner") if isinstance(p.get("owner"), dict) else {}
    owner_name = p.get("owner_full_name") or p.get("owner_name") or owner_info.get("name") or "Lender"
    owner_avatar = p.get("owner_avatar") or owner_info.get("avatar") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
    owner_rating = float(p.get("owner_rating") or owner_info.get("rating") or 5.0)
    owner_email = str(p.get("user_email") or p.get("userEmail") or owner_info.get("email") or "").strip().lower()
    owner_status = str(p.get("owner_status") or owner_info.get("status") or "active").strip()

    city = str(p.get("owner_city") or owner_info.get("city") or p.get("city") or "").strip()
    state = str(p.get("owner_state") or owner_info.get("state") or p.get("state") or "").strip()
    address = str(p.get("owner_address") or owner_info.get("address") or p.get("address") or "").strip()
    pincode = str(p.get("owner_pincode") or owner_info.get("pincode") or p.get("pincode") or "").strip()

    loc_parts = [part for part in [city, state] if part]
    if loc_parts:
        location_str = ", ".join(loc_parts)
    elif address and not is_public:
        location_str = address
    elif p.get("location"):
        location_str = str(p["location"]).strip()
    else:
        location_str = "Location unavailable"

    # Authoritative lender and product availability evaluation (batched if set provided)
    is_avail, avail_status, reason = evaluate_product_availability(p, booked_pids_set=booked_pids_set)

    raw_img = str(p.get("image", "") or "").strip()
    images_val = p.get("images")
    if isinstance(images_val, str) and images_val.strip():
        try:
            images_list = json.loads(images_val)
        except Exception:
            images_list = [images_val]
    elif isinstance(images_val, list):
        images_list = images_val
    else:
        images_list = [raw_img] if raw_img else []

    if not raw_img and images_list:
        raw_img = str(images_list[0]).strip()

    v_url = str(p.get("video_url") or p.get("videoUrl") or "").strip()

    return {
        "id": str(p.get("id", "")),
        "title": str(p.get("title", "")),
        "name": str(p.get("name") or p.get("title") or ""),
        "description": str(p.get("description", "")),
        "price": float(p.get("price") if p.get("price") is not None else (p.get("daily_rate") or 0)),
        "daily_rate": float(p.get("daily_rate") if p.get("daily_rate") is not None else (p.get("price") or 0)),
        "image": raw_img,
        "primary_image": p.get("primary_image") or raw_img,
        "images": images_list,
        "video_url": v_url or None,
        "videoUrl": v_url or None,
        "brand": str(p.get("brand") or ""),
        "model": str(p.get("model") or ""),
        "year": str(p.get("year") or "2024"),
        "condition": str(p.get("condition") or p.get("condition_grade") or "Pristine / Mint"),
        "specifications": p.get("specifications"),
        "accessories": str(p.get("accessories") or ""),
        "category": str(p.get("category") or ""),
        "rating": float(p.get("rating") if p.get("rating") is not None else 5.0),
        "reviews": int(p.get("reviews") if p.get("reviews") is not None else 0),
        "available": bool(is_avail),
        "availability_status": avail_status,
        "availability_reason": reason,
        "status": str(p.get("status") or "approved"),
        "location": location_str,
        "city": city or None,
        "area": str(p.get("area") or ""),
        "owner": {
            "name": owner_name,
            "email": None if is_public else (owner_email or None),
            "avatar": owner_avatar,
            "rating": owner_rating,
            "city": city or None,
            "state": state or None,
            "address": None if is_public else (address or None),
            "pincode": None if is_public else (pincode or None),
            "location": location_str,
            "status": owner_status
        }
    }

@app.get("/api/products/custom")
def fetch_user_listings(email: str = Depends(get_current_user_email)):
    listings = get_custom_products(email)
    if not listings:
        return []
    pids = [str(p["id"]) for p in listings if p.get("id")]
    today_str = dt.now(timezone.utc).strftime("%Y-%m-%d")
    booked_set = set(check_products_booking_conflicts(pids, today_str, today_str)) if pids else set()
    return [format_product_dict(p, is_summary=False, booked_pids_set=booked_set, is_public=False) for p in listings]

@app.get("/api/products")
@app.get("/api/products/custom/public")
def fetch_public_listings(
    response: Response,
    limit: Optional[int] = Query(None, ge=1, le=100),
    page: Optional[int] = Query(1, ge=1)
):
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=120"
    offset = (page - 1) * limit if limit is not None else 0
    cache_key = f"public_custom_products:p{page}:l{limit}" if limit is not None else "public_custom_products"
    def _load():
        listings = get_all_approved_custom_products(limit=limit, offset=offset) or []
        try:
            from payernt_database import get_all_active_payernt_products
            payernt_items = get_all_active_payernt_products()
            for p in payernt_items:
                if not any(str(l.get("id")) == str(p.get("id")) for l in listings):
                    raw_imgs = p.get("images")
                    if isinstance(raw_imgs, str) and raw_imgs.startswith("["):
                        try:
                            parsed_imgs = json.loads(raw_imgs)
                        except Exception:
                            parsed_imgs = [p.get("primary_image")] if p.get("primary_image") else []
                    elif isinstance(raw_imgs, list):
                        parsed_imgs = raw_imgs
                    else:
                        parsed_imgs = [p.get("primary_image")] if p.get("primary_image") else []
                    
                    v_url = p.get("video_url") or ""

                    listings.append({
                        "id": p.get("id"),
                        "title": p.get("title") or p.get("name"),
                        "name": p.get("name"),
                        "brand": p.get("brand", ""),
                        "model": p.get("model", ""),
                        "description": p.get("description"),
                        "price": p.get("daily_rate", 999),
                        "daily_rate": p.get("daily_rate", 999),
                        "image": p.get("primary_image") or (parsed_imgs[0] if parsed_imgs else ""),
                        "primary_image": p.get("primary_image"),
                        "images": parsed_imgs,
                        "video_url": v_url or None,
                        "videoUrl": v_url or None,
                        "category": p.get("category", "tech"),
                        "condition": p.get("condition_grade", "Like New"),
                        "rating": 4.9,
                        "reviews": 12,
                        "available": p.get("available", True),
                        "owner_name": p.get("owner_name", "Payent Verified Vendor"),
                        "owner_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                        "owner_rating": 4.9,
                        "created_at": p.get("created_at"),
                        "status": "approved",
                        "featured": True,
                    })
        except Exception:
            pass

        if not listings:
            return []
        pids = [str(p["id"]) for p in listings if p.get("id")]
        today_str = dt.now(timezone.utc).strftime("%Y-%m-%d")
        booked_set = set(check_products_booking_conflicts(pids, today_str, today_str)) if pids else set()
        return [format_product_dict(p, is_summary=True, booked_pids_set=booked_set, is_public=True) for p in listings]
    return get_cached(cache_key, 30, _load)

@app.get("/api/products/custom/{id}")
@app.get("/api/products/{id}")
def fetch_product_by_id(id: str, response: Response):
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=120"
    def _load_prod():
        product = fetch_one_product(id)
        if not product:
            try:
                from payernt_database import get_payernt_product_by_id
                p = get_payernt_product_by_id(id, include_pin=False)
                if p:
                    v_url = p.get("video_url") or ""
                    raw_imgs = p.get("images")
                    if isinstance(raw_imgs, str) and raw_imgs.startswith("["):
                        try:
                            parsed_imgs = json.loads(raw_imgs)
                        except Exception:
                            parsed_imgs = [p.get("primary_image")] if p.get("primary_image") else []
                    elif isinstance(raw_imgs, list):
                        parsed_imgs = raw_imgs
                    else:
                        parsed_imgs = [p.get("primary_image")] if p.get("primary_image") else []

                    return {
                        "id": p.get("id"),
                        "title": p.get("title") or p.get("name"),
                        "name": p.get("name"),
                        "brand": p.get("brand", ""),
                        "model": p.get("model", ""),
                        "year": p.get("year", "2024"),
                        "description": p.get("description"),
                        "specifications": p.get("specifications"),
                        "price": p.get("daily_rate", 999),
                        "daily_rate": p.get("daily_rate", 999),
                        "weekly_rate": p.get("weekly_rate", 0),
                        "monthly_rate": p.get("monthly_rate", 0),
                        "image": p.get("primary_image") or (parsed_imgs[0] if parsed_imgs else ""),
                        "primary_image": p.get("primary_image"),
                        "images": parsed_imgs,
                        "video_url": v_url or None,
                        "videoUrl": v_url or None,
                        "category": p.get("category", "tech"),
                        "condition": p.get("condition_grade", "Like New"),
                        "accessories": p.get("accessories", ""),
                        "city": p.get("city", ""),
                        "area": p.get("area", ""),
                        "pincode": p.get("pincode", ""),
                        "rating": 4.9,
                        "reviews": 12,
                        "available": p.get("available", True),
                        "owner_name": p.get("owner_name", "Payent Verified Vendor"),
                        "owner_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                        "owner_rating": 4.9,
                        "owner_id": p.get("owner_id"),
                        "status": "approved",
                        "isReference": False,
                    }
            except Exception:
                pass
            return None
        return format_product_dict(product, is_public=True)
    
    prod = get_cached(f"product:{id}", 30, _load_prod)
    if not prod:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return prod

class CreateSupportTicketSchema(BaseModel):
    subject: str
    message: str
    priority: Optional[str] = "medium"

@app.get("/api/support")
@app.get("/api/messages")
def fetch_user_conversations(current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    tickets = fetch_all("""
        SELECT * FROM support_tickets 
        WHERE LOWER(user_email) = %s 
        ORDER BY COALESCE(updated_at, created_at) DESC
    """, (clean_email,))
    res = []
    for t in tickets:
        msgs = json.loads(t["messages"]) if isinstance(t.get("messages"), str) else (t.get("messages") or [])
        last_msg = msgs[-1] if msgs else {}
        unread_cnt = sum(1 for m in msgs if m.get("senderType") != "user" and not m.get("read"))
        res.append({
            "id": t["id"],
            "subject": t.get("subject") or "Inquiry",
            "category": t.get("category") or "Support",
            "status": t.get("status") or "open",
            "priority": t.get("priority") or "medium",
            "createdAt": t.get("created_at"),
            "updatedAt": t.get("updated_at") or t.get("created_at"),
            "partner": "Payent Support & Coordination",
            "partnerAvatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120",
            "lastMessage": last_msg.get("content") or last_msg.get("message") or "",
            "lastMessageAt": last_msg.get("timestamp") or t.get("created_at"),
            "unread": unread_cnt > 0 or (last_msg.get("senderType") != "user" and not last_msg.get("read")),
            "unreadCount": unread_cnt,
            "messageCount": len(msgs),
            "messages": msgs
        })
    return res

@app.get("/api/messages/{id}")
def fetch_conversation_detail(id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    ticket = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (id,))
    if not ticket:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if ticket.get("user_email", "").strip().lower() != clean_email:
        user_rec = get_user(clean_email) or {}
        if user_rec.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to access this conversation.")
    
    msgs = json.loads(ticket["messages"]) if isinstance(ticket.get("messages"), str) else (ticket.get("messages") or [])
    return {
        "id": ticket["id"],
        "subject": ticket.get("subject") or "Inquiry",
        "category": ticket.get("category") or "Support",
        "status": ticket.get("status") or "open",
        "priority": ticket.get("priority") or "medium",
        "createdAt": ticket.get("created_at"),
        "updatedAt": ticket.get("updated_at") or ticket.get("created_at"),
        "partner": "Payent Support & Coordination",
        "partnerAvatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120",
        "messages": msgs
    }

class ConversationReplySchema(BaseModel):
    message: str

@app.post("/api/messages/{id}/reply")
def reply_to_conversation(id: str, data: ConversationReplySchema, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    clean_msg = data.message.strip()
    if not clean_msg:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")
    
    ticket = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (id,))
    if not ticket:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    user_rec = get_user(clean_email) or {}
    is_admin = user_rec.get("role") == "admin"
    if ticket.get("user_email", "").strip().lower() != clean_email and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to reply to this conversation.")
    
    msgs = json.loads(ticket["messages"]) if isinstance(ticket.get("messages"), str) else (ticket.get("messages") or [])
    sender_name = user_rec.get("full_name") or clean_email.split("@")[0]
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_msg = {
        "id": f"msg-{int(time.time() * 1000)}",
        "sender": sender_name,
        "senderType": "admin" if is_admin else "user",
        "content": clean_msg,
        "timestamp": now_str
    }
    msgs.append(new_msg)
    new_status = "pending" if is_admin else "open"
    execute_query("""
        UPDATE support_tickets 
        SET messages = %s, status = %s, updated_at = %s 
        WHERE id = %s
    """, (json.dumps(msgs), new_status, now_str, id))
    
    return {
        "success": True,
        "id": id,
        "messages": msgs,
        "updatedAt": now_str
    }

class NewConversationSchema(BaseModel):
    subject: str
    message: str
    category: Optional[str] = "General Inquiry"

@app.post("/api/messages/new")
def create_new_conversation(data: NewConversationSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    clean_sub = data.subject.strip()
    clean_msg = data.message.strip()
    clean_cat = (data.category or "General Inquiry").strip()
    if len(clean_sub) < 3:
        raise HTTPException(status_code=422, detail="Subject must be at least 3 characters.")
    if len(clean_msg) < 5:
        raise HTTPException(status_code=422, detail="Message must be at least 5 characters.")
    
    user_rec = get_user(clean_email) or {}
    user_name = user_rec.get("full_name") or clean_email.split("@")[0]
    ticket_id = f"CONV-{int(time.time() * 1000)}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    init_messages = [{
        "id": f"msg-{int(time.time() * 1000)}",
        "sender": user_name,
        "senderType": "user",
        "content": clean_msg,
        "timestamp": now_str
    }]
    execute_query("""
        INSERT INTO support_tickets (id, user_email, user_name, subject, category, status, priority, messages, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (ticket_id, clean_email, user_name, clean_sub, clean_cat, "open", "medium", json.dumps(init_messages), now_str, now_str))
    
    return {
        "success": True,
        "id": ticket_id,
        "subject": clean_sub,
        "category": clean_cat,
        "messages": init_messages,
        "createdAt": now_str
    }

@app.patch("/api/messages/{id}/read")
@app.post("/api/messages/{id}/read")
def mark_support_ticket_read(id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_email = current_user_email.strip().lower()
    ticket = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (id,))
    if not ticket:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if ticket.get("user_email", "").strip().lower() != clean_email:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    msgs = json.loads(ticket["messages"]) if isinstance(ticket.get("messages"), str) else (ticket.get("messages") or [])
    for m in msgs:
        m["read"] = True
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("UPDATE support_tickets SET messages = %s, last_read_user_at = %s WHERE id = %s", (json.dumps(msgs), now_str, id))
    return {"success": True}

@app.post("/api/support")
def create_user_support_ticket(data: CreateSupportTicketSchema, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    user_rec = get_user(clean_email) or {}
    ticket_id = f"TICK-{int(time.time() * 1000)}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    init_messages = [{
        "id": f"msg-{int(time.time() * 1000)}",
        "sender": user_rec.get("full_name") or clean_email.split("@")[0],
        "senderType": "user",
        "content": data.message,
        "timestamp": now_str
    }]
    execute_query("""
        INSERT INTO support_tickets (id, user_email, user_name, subject, status, priority, messages, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        ticket_id, clean_email, user_rec.get("full_name") or clean_email.split("@")[0],
        data.subject, "open", data.priority or "medium",
        json.dumps(init_messages), now_str, now_str
    ))
    return {"success": True, "ticketId": ticket_id}

class ContactInquirySchema(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    category: Optional[str] = "General Inquiry"
    subject: str
    message: str

@app.post("/api/contact")
def submit_contact_inquiry(data: ContactInquirySchema):
    clean_name = data.name.strip()
    clean_email = str(data.email).strip().lower()
    clean_subject = data.subject.strip()
    clean_message = data.message.strip()
    clean_phone = (data.phone or "").strip()
    clean_category = (data.category or "General Inquiry").strip()

    if not clean_name or len(clean_name) < 2 or len(clean_name) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name must be between 2 and 100 characters."
        )

    if not clean_subject or len(clean_subject) < 3 or len(clean_subject) > 200:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subject must be between 3 and 200 characters."
        )

    if not clean_message or len(clean_message) < 10 or len(clean_message) > 5000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message must be between 10 and 5000 characters."
        )

    ticket_id = f"INQ-{int(time.time() * 1000)}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    init_messages = [{
        "id": f"msg-{int(time.time() * 1000)}",
        "sender": clean_name,
        "senderType": "user",
        "content": clean_message,
        "phone": clean_phone,
        "category": clean_category,
        "timestamp": now_str
    }]

    full_subject = f"[{clean_category}] {clean_subject}"

    try:
        execute_query("""
            INSERT INTO support_tickets (id, user_email, user_name, subject, category, status, priority, messages, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            ticket_id, clean_email, clean_name,
            full_subject, clean_category, "open", "medium",
            json.dumps(init_messages), now_str, now_str
        ))
        logger.info(f"Contact inquiry received: {ticket_id} from {clean_email}")
        return {
            "success": True,
            "message": "Message sent successfully. We received your message.",
            "ticketId": ticket_id
        }
    except Exception as e:
        logger.error(f"Error persisting contact inquiry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send your message. Please try again."
        )

@app.get("/api/categories")
@app.get("/api/categories/public")
def fetch_public_categories(response: Response):
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    def _load_categories():
        conn = get_db_connection()
        if not conn:
            return [
                {"id": "cameras", "name": "Cameras", "icon": "Camera", "count": 0, "color": "bg-blue-100 text-blue-800", "enabled": True},
                {"id": "laptops", "name": "Laptops", "icon": "Laptop", "count": 0, "color": "bg-purple-100 text-purple-800", "enabled": True},
                {"id": "drones", "name": "Drones", "icon": "Plane", "count": 0, "color": "bg-emerald-100 text-emerald-800", "enabled": True},
                {"id": "bikes", "name": "Bikes & Rides", "icon": "Bike", "count": 0, "color": "bg-amber-100 text-amber-800", "enabled": True},
                {"id": "tools", "name": "Electronic Drilling Tools", "icon": "Hammer", "count": 0, "color": "bg-red-100 text-red-800", "enabled": True},
                {"id": "powerbanks", "name": "Power Banks", "icon": "Zap", "count": 0, "color": "bg-slate-100 text-slate-800", "enabled": True},
            ]
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.id, c.name, c.icon, c.color, c.enabled,
                           COALESCE(p.cnt, 0) AS count
                    FROM categories c
                    LEFT JOIN (
                        SELECT category, COUNT(*) AS cnt 
                        FROM custom_products 
                        WHERE (hidden = 0 OR hidden IS NULL) AND (status = 'approved' OR status IS NULL)
                        GROUP BY category
                    ) p ON c.name = p.category OR c.id = p.category
                    WHERE c.enabled = 1
                """)
                rows = cursor.fetchall()
                res = []
                for r in rows:
                    res.append({
                        "id": r["id"],
                        "name": r["name"],
                        "icon": r["icon"] or "Laptop",
                        "count": int(r.get("count") or 0),
                        "color": r["color"] or "bg-secondary text-foreground",
                        "enabled": bool(r["enabled"])
                    })
                return res
        finally:
            conn.close()

    return get_cached("public_categories", 60, _load_categories)

@app.get("/api/stats/public")
def fetch_public_stats(response: Response):
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    def _load_stats():
        conn = get_db_connection()
        if not conn:
            return {
                "activeListings": 0,
                "totalRentals": 0,
                "happyLenders": 0,
                "citiesCovered": 0
            }
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM custom_products WHERE (hidden = 0 OR hidden IS NULL) AND (status = 'approved' OR status IS NULL)) AS activeListings,
                        (SELECT COUNT(*) FROM orders WHERE status = 'completed' OR (status IS NOT NULL AND status != 'cancelled')) AS totalRentals,
                        (SELECT COUNT(DISTINCT user_email) FROM custom_products WHERE user_email IS NOT NULL AND user_email != '') AS happyLenders,
                        (SELECT COUNT(DISTINCT city) FROM users WHERE city IS NOT NULL AND city != '') AS citiesCovered
                """)
                row = cursor.fetchone() or {}
                return {
                    "activeListings": int(row.get("activeListings") or 0),
                    "totalRentals": int(row.get("totalRentals") or 0),
                    "happyLenders": int(row.get("happyLenders") or 0),
                    "citiesCovered": int(row.get("citiesCovered") or 0)
                }
        finally:
            conn.close()

    return get_cached("public_stats", 60, _load_stats)

@app.post("/api/products/custom")
def add_custom_listing(data: CustomProductSchema, current_user: dict = Depends(require_authenticated_user)):
    email = current_user["email"].strip().lower()
    product_dict = getattr(data, "model_dump", data.dict)()
    if not product_dict.get("id"):
        product_dict["id"] = f"p-custom-{int(time.time() * 1000)}"
    user_rec = current_user
    owner_info = product_dict.get("owner") if isinstance(product_dict.get("owner"), dict) else {}
    product_dict["owner"] = {
        "name": owner_info.get("name") or user_rec.get("full_name") or email.split("@")[0],
        "email": email,
        "avatar": owner_info.get("avatar") or user_rec.get("avatar") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120",
        "rating": float(owner_info.get("rating") or 5.0)
    }
    product_dict["status"] = "pending"
    product_dict["available"] = False
    
    try:
        created = create_custom_product(email, product_dict)
    except Exception as e:
        logger.error(f"[add_custom_listing] Product creation failed in database for user '{email}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist product listing in database: {str(e)}"
        )
    
    broadcast_admin_event("product.created", format_product_dict(created))
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    return {
        "success": True,
        "product_id": created["id"],
        "status": created["status"],
        "product": format_product_dict(created),
        "message": "Product submitted successfully. Pending Admin approval."
    }

def fetch_one_product(product_id: str):
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT cp.*, 
                           u.address AS owner_address, 
                           u.city AS owner_city, 
                           u.state AS owner_state, 
                           u.pincode AS owner_pincode,
                           u.status AS owner_status,
                           u.verified AS owner_verified,
                           a.status AS agent_status
                    FROM custom_products cp
                    LEFT JOIN users u ON cp.user_email = u.email
                    LEFT JOIN agents a ON cp.user_email = a.user_email
                    WHERE cp.id = %s
                """, (product_id,))
                res = cursor.fetchone()
                if res:
                    return res
        except Exception:
            pass
        finally:
            try:
                conn.close()
            except Exception:
                pass
    if product_id in MOCK_CUSTOM_PRODUCTS:
        return MOCK_CUSTOM_PRODUCTS[product_id]
    return None

@app.delete("/api/products/custom/{id}")
@app.delete("/api/products/{id}")
def remove_custom_listing(id: str, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    product = fetch_one_product(id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Product listing not found."
        )

    prod_user = (product.get("user_email") or product.get("userEmail") or "").strip().lower()
    owner_dict = product.get("owner") if isinstance(product.get("owner"), dict) else {}
    owner_email = (owner_dict.get("email") or "").strip().lower()
    owner_name = (owner_dict.get("name") or product.get("owner_name") or "").strip().lower()

    user_rec = get_user(clean_email) or {}
    user_full_name = (user_rec.get("full_name") or "").strip().lower()
    user_role = (user_rec.get("role") or "").strip().lower()
    
    is_admin = user_role in ("admin", "superadmin")
    is_owner = bool(
        (prod_user and prod_user == clean_email) or
        (owner_email and owner_email == clean_email) or
        (owner_name and user_full_name and owner_name == user_full_name) or
        (owner_name and owner_name == clean_email.split("@")[0])
    )

    if not is_owner and not is_admin:
        logger.warning(
            f"Security Violation: User {clean_email} attempted unauthorized deletion of product {id}."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Security Violation: A product can only be deleted by its product owner or an admin."
        )

    delete_custom_product(id, clean_email)
    logger.info(f"Listing {id} deleted successfully from MySQL database for user {clean_email}.")
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    return {"success": True, "message": "Listing deleted successfully from MySQL database."}

@app.post("/api/products/custom/{id}/toggle-availability")
def toggle_listing_availability(id: str, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    product = fetch_one_product(id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Product listing not found."
        )

    prod_user = (product.get("user_email") or product.get("userEmail") or "").strip().lower()
    user_rec = get_user(clean_email) or {}

    if prod_user and prod_user != clean_email and user_rec.get("role") != "admin":
        logger.warning(
            f"Security Violation: User {clean_email} attempted unauthorized availability toggle of product {id} owned by {prod_user}."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Security Violation: You are not authorized to modify another user's product."
        )

    new_status = toggle_custom_product_availability(id, clean_email)
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    return {"success": True, "available": new_status}

@app.put("/api/products/custom/{id}")
@app.put("/api/products/{id}")
def edit_custom_listing(id: str, data: UpdateCustomProductSchema, email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    product = fetch_one_product(id)
        
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Product listing not found."
        )
    
    prod_user = (product.get("user_email") or product.get("userEmail") or "").strip().lower()
    user_rec = get_user(clean_email) or {}
    
    if prod_user and prod_user != clean_email and user_rec.get("role") != "admin":
        logger.warning(
            f"Security Violation: User {clean_email} attempted unauthorized edit of product {id} owned by {prod_user}."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Security Violation: You are not authorized to edit another user's product."
        )
        
    patch = {k: v for k, v in getattr(data, "model_dump", data.dict)().items() if v is not None}
    update_custom_product(id, clean_email, patch)
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    return {"success": True, "message": "Listing updated successfully."}

# Admin check dependencies
def check_admin_user(current_user_email: str = Depends(get_current_user_email)) -> dict:
    user = get_user(current_user_email)
    if not user or str(user.get("role", "")).lower() not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Admin access required."
        )
    return user

def check_superadmin_user(current_user_email: str = Depends(get_current_user_email)) -> dict:
    user = get_user(current_user_email)
    if not user or str(user.get("role", "")).lower() != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Superadmin access required."
        )
    return user

# ==============================================================================


# ==============================================================================
# --- RAZORPAY BACKEND PAYMENT ENDPOINTS ---
# ==============================================================================
class CreateRazorpayOrderSchema(BaseModel):
    product_id: str
    start_date: str
    end_date: str
    coupon_code: Optional[str] = None

class VerifyRazorpayPaymentSchema(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class RefundPaymentSchema(BaseModel):
    order_id: str
    amount: Optional[int] = None
    reason: Optional[str] = None

@app.post("/api/payments/create-order")
def create_razorpay_order(data: CreateRazorpayOrderSchema, current_user: dict = Depends(get_approved_user)):
    current_user_email = current_user["email"].strip().lower()
    product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (data.product_id,))
    if not product:
        # Check if product is in orders or default catalog ID format
        product = fetch_one("SELECT title, price, image FROM custom_products WHERE id LIKE %s", (f"%{data.product_id}%",))
        
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{data.product_id}' not found in catalog."
        )

    conflicts = check_products_booking_conflicts([data.product_id], data.start_date, data.end_date)
    if data.product_id in conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This gear is already booked by another creator for the selected dates. Please select different dates."
        )

    price_per_day = int(product.get("price", 0))
    product_title = product.get("title", "Tech Gear Rental")
    product_image = product.get("image", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600")

    try:
        d1 = datetime.datetime.fromisoformat(data.start_date.replace("Z", ""))
        d2 = datetime.datetime.fromisoformat(data.end_date.replace("Z", ""))
        days = max(1, math.ceil((d2 - d1).total_seconds() / 86400))
    except Exception:
        days = 3

    subtotal = price_per_day * days
    discount = 0
    if data.coupon_code:
        code_clean = data.coupon_code.strip().upper()
        if code_clean in ("SAVE10", "WELCOME10", "PAYENT10"):
            discount = int(subtotal * 0.10)

    tax = int((subtotal - discount) * 0.08)
    total_rupees = max(1, subtotal - discount + tax)
    amount_paise = total_rupees * 100

    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    razorpay_order_id = f"order_rzp_{uuid.uuid4().hex[:14]}"

    if razorpay_client:
        try:
            rzp_response = razorpay_client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": order_id,
                "notes": {
                    "product_id": data.product_id,
                    "user_email": current_user_email,
                    "rental_days": str(days)
                }
            })
            razorpay_order_id = rzp_response["id"]
        except Exception as e:
            logger.error(f"Error creating Razorpay Order via SDK: {e}")
            if IS_PRODUCTION:
                raise HTTPException(status_code=500, detail="Failed to initialize Razorpay payment order.")

    create_order_record(
        order_id=order_id,
        user_email=current_user_email,
        product_id=data.product_id,
        product_title=product_title,
        product_image=product_image,
        start_date=data.start_date,
        end_date=data.end_date,
        total=total_rupees,
        status="pending",
        razorpay_order_id=razorpay_order_id,
        payment_status="unpaid"
    )

    return {
        "success": True,
        "order_id": order_id,
        "razorpay_order_id": razorpay_order_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "total": total_rupees,
        "days": days
    }

@app.post("/api/payments/verify")
def verify_razorpay_payment(data: VerifyRazorpayPaymentSchema, current_user_email: str = Depends(get_current_user_email)):
    order = get_order_by_razorpay_order_id(data.razorpay_order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Booking order record not found.")

    if order.get("payment_status") == "paid":
        return {
            "success": True,
            "message": "Payment already verified.",
            "order_id": order["id"]
        }

    signature_valid = False
    if razorpay_client:
        try:
            razorpay_client.utility.verify_payment_signature({
                "razorpay_order_id": data.razorpay_order_id,
                "razorpay_payment_id": data.razorpay_payment_id,
                "razorpay_signature": data.razorpay_signature
            })
            signature_valid = True
        except Exception as e:
            logger.warning(f"Razorpay SDK signature verification failed: {e}")
            signature_valid = False

    if not signature_valid:
        msg = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
        expected_sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()
        signature_valid = hmac.compare_digest(expected_sig, data.razorpay_signature)

    if not signature_valid:
        update_order_payment_status(
            order_id=order["id"],
            payment_status="failed",
            status="failed",
            razorpay_payment_id=data.razorpay_payment_id,
            razorpay_signature=data.razorpay_signature
        )
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature. Verification failed.")

    update_order_payment_status(
        order_id=order["id"],
        payment_status="paid",
        status="active",
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature
    )

    create_notification(
        user_email=order["user_email"],
        title="Payment Verified & Booking Confirmed 🎉",
        message=f"Payment for '{order['product_title']}' has been verified. Your rental is active!",
        notif_type="success"
    )

    return {
        "success": True,
        "message": "Payment verified and booking activated successfully.",
        "order_id": order["id"]
    }

@app.post("/api/payments/webhook")
async def razorpay_webhook_handler(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature") or request.headers.get("x-razorpay-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header.")

    webhook_secret = RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET
    if not webhook_secret:
        if not ALLOW_PRODUCTION_TESTING and IS_PRODUCTION:
            logger.error("Razorpay webhook endpoint hit but RAZORPAY_WEBHOOK_SECRET is unconfigured in production.")
            raise HTTPException(status_code=500, detail="Razorpay webhook processing is unconfigured.")
        webhook_secret = "test_payent_webhook_secret_2026"

    expected_sig = hmac.new(
        webhook_secret.encode(),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature):
        logger.warning("Razorpay Webhook signature verification failed.")
        raise HTTPException(status_code=400, detail="Webhook signature verification failed.")

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event = payload.get("event")
    event_payload = payload.get("payload", {})
    payment_entity = event_payload.get("payment", {}).get("entity", {})
    
    razorpay_order_id = payment_entity.get("order_id")
    razorpay_payment_id = payment_entity.get("id")

    # Idempotency check: extract event ID
    event_id = payload.get("event_id") or payload.get("id") or f"{event}:{razorpay_payment_id}"
    if is_payment_event_processed(event_id):
        logger.info(f"Duplicate Razorpay webhook event received ({event_id}). Returning 200 OK without reprocessing.")
        return {"status": "ok", "event": event, "note": "duplicate event ignored"}

    order_id = None
    if razorpay_order_id:
        order = get_order_by_razorpay_order_id(razorpay_order_id)
        if order:
            order_id = order["id"]
            if event == "payment.captured":
                if order.get("payment_status") != "paid":
                    update_order_payment_status(
                        order_id=order["id"],
                        payment_status="paid",
                        status="active",
                        razorpay_payment_id=razorpay_payment_id
                    )
                    create_notification(
                        user_email=order["user_email"],
                        title="Payment Captured via Webhook 💳",
                        message=f"Payment for '{order['product_title']}' was captured successfully.",
                        notif_type="success"
                    )
            elif event in ("payment.failed", "payment.disputed"):
                if order.get("payment_status") != "paid":
                    update_order_payment_status(
                        order_id=order["id"],
                        payment_status="failed",
                        status="failed",
                        razorpay_payment_id=razorpay_payment_id
                    )

    # Record event as processed to prevent duplicate executions
    record_payment_event(event_id=event_id, event_type=event, payment_id=razorpay_payment_id, order_id=order_id)

    return {"status": "ok", "event": event}

@app.post("/api/payments/refund")
def process_admin_refund(data: RefundPaymentSchema, current_admin: dict = Depends(check_admin_user)):
    order = get_order_by_id(data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.get("payment_status") != "paid" or not order.get("razorpay_payment_id"):
        raise HTTPException(status_code=400, detail="Order does not have a completed paid transaction to refund.")

    refund_amount_rupees = data.amount if data.amount else order["total"]
    refund_amount_paise = int(refund_amount_rupees * 100)
    refund_id = f"rfnd_{uuid.uuid4().hex[:12]}"

    if razorpay_client:
        try:
            rzp_refund = razorpay_client.payment.refund(
                order["razorpay_payment_id"],
                {"amount": refund_amount_paise, "notes": {"reason": data.reason or "Admin initiated refund"}}
            )
            refund_id = rzp_refund["id"]
        except Exception as e:
            logger.error(f"Razorpay refund API error: {e}")
            if IS_PRODUCTION:
                raise HTTPException(status_code=500, detail=f"Failed to process Razorpay refund: {e}")

    update_order_payment_status(
        order_id=order["id"],
        payment_status="refunded",
        status="cancelled",
        refund_id=refund_id,
        refund_status="processed"
    )

    create_notification(
        user_email=order["user_email"],
        title="Refund Processed 💰",
        message=f"Refund of ₹{refund_amount_rupees} for '{order['product_title']}' has been processed.",
        notif_type="info"
    )

    return {
        "success": True,
        "message": f"Refund of ₹{refund_amount_rupees} processed successfully.",
        "refund_id": refund_id,
        "order_id": order["id"]
    }

@app.get("/api/lender/orders")
def fetch_lender_orders(email: str = Depends(get_current_user_email)):
    clean_email = email.strip().lower()
    try:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT o.*, u.full_name AS renter_name, u.phone AS renter_phone, u.email AS renter_email
                        FROM orders o
                        JOIN custom_products cp ON (o.product_id = cp.id OR o.product_id = cp.title)
                        JOIN users u ON LOWER(o.user_email) = LOWER(u.email)
                        WHERE LOWER(cp.user_email) = %s
                        ORDER BY o.created_at DESC
                    """, (clean_email,))
                    rows = cursor.fetchall()
                    result = []
                    for r in rows:
                        pid = str(r.get("product_id") or r.get("productId") or "")
                        title = str(r.get("product_title") or r.get("productTitle") or "Gear Rental")
                        img = str(r.get("product_image") or r.get("productImage") or "")
                        start = str(r.get("start_date") or r.get("startDate") or "")
                        end = str(r.get("end_date") or r.get("endDate") or "")
                        created = str(r.get("created_at") or r.get("createdAt") or "")
                        result.append({
                            "id": str(r.get("id", "")),
                            "productId": pid,
                            "product_id": pid,
                            "productTitle": title,
                            "product_title": title,
                            "productImage": img,
                            "product_image": img,
                            "startDate": start,
                            "start_date": start,
                            "endDate": end,
                            "end_date": end,
                            "total": float(r.get("total", 0)),
                            "status": str(r.get("status", "active")),
                            "createdAt": created,
                            "created_at": created,
                            "renter": {
                                "name": r.get("renter_name") or clean_email.split("@")[0],
                                "email": r.get("renter_email") or clean_email,
                                "phone": r.get("renter_phone") or ""
                            }
                        })
                    return result
            finally:
                conn.close()
    except Exception as e:
        logger.warning(f"Failed to fetch lender orders from DB: {e}")
    
    return []

@app.get("/api/notifications")
def fetch_notifications(email: str = Depends(get_current_user_email)):
    notifications = get_notifications(email)
    if not notifications:
        return []
    
    result = []
    for n in notifications:
        result.append({
            "id": n["id"],
            "title": n["title"],
            "message": n["message"],
            "type": n["type"],
            "read": bool(n["is_read"]),
            "createdAt": n["created_at"]
        })
    return result


@app.post("/api/notifications/read")
def read_all_notifications(email: str = Depends(get_current_user_email)):
    mark_notifications_read(email)
    return {"success": True}


# ----------------------------------------------------------------------
# Admin API Endpoints & Schemas
# ----------------------------------------------------------------------
import json

# Pydantic Schemas for updates
class UserUpdateSchema(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    verified: Optional[bool] = None

class ProductUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    available: Optional[bool] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    hidden: Optional[bool] = None
    image: Optional[str] = None
    images: Optional[list[str]] = None
    documents: Optional[list[str]] = None

class CategorySchema(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    enabled: Optional[bool] = True

class ProfileUpdateSchema(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None

class PasswordUpdateSchema(BaseModel):
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None

class SettingsUpdateSchema(BaseModel):
    websiteName: Optional[str] = None
    logoUrl: Optional[str] = None
    theme: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    socialFacebook: Optional[str] = None
    socialTwitter: Optional[str] = None
    socialInstagram: Optional[str] = None
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    homepageBannerText: Optional[str] = None
    footerText: Optional[str] = None

class SupportReplySchema(BaseModel):
    message: str

class SupportStatusSchema(BaseModel):
    status: str

class APIKeyCreateSchema(BaseModel):
    name: str
    scopes: Optional[list[str]] = ["users:read", "products:read"]
    rate_limit: Optional[int] = 100
    expires_at: Optional[str] = None

class APIKeyUpdateSchema(BaseModel):
    name: Optional[str] = None
    scopes: Optional[list[str]] = None
    rate_limit: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None


# ----------------------------------------------------------------------
# Admin Live WebSocket Real-Time Broadcast Infrastructure
# ----------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

ws_manager = ConnectionManager()

def broadcast_admin_event(event_type: str, data: dict):
    """Safely broadcast platform events to all active admin WebSocket connections."""
    # Sanitize payload: strip sensitive fields like password_hash or internal secrets
    sanitized = {k: v for k, v in data.items() if k not in ("password_hash", "otp", "password")}
    payload = {
        "type": event_type,
        "data": sanitized,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    try:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(ws_manager.broadcast(payload))
        except RuntimeError:
            asyncio.run(ws_manager.broadcast(payload))
    except Exception as e:
        logger.warning(f"Could not broadcast WS event {event_type}: {e}")

# ----------------------------------------------------------------------
# Delivery & Real-Time Chat WebSocket Infrastructure
# ----------------------------------------------------------------------

class DeliveryConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, delivery_id: str, websocket: WebSocket):
        if delivery_id not in self.rooms:
            self.rooms[delivery_id] = []
        self.rooms[delivery_id].append(websocket)

    def disconnect(self, delivery_id: str, websocket: WebSocket):
        if delivery_id in self.rooms:
            if websocket in self.rooms[delivery_id]:
                self.rooms[delivery_id].remove(websocket)
            if not self.rooms[delivery_id]:
                del self.rooms[delivery_id]

    async def broadcast(self, delivery_id: str, message: dict):
        if delivery_id not in self.rooms:
            return
        disconnected = []
        for connection in list(self.rooms[delivery_id]):
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(delivery_id, conn)

delivery_ws_manager = DeliveryConnectionManager()

class ConversationConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, conversation_id: str, websocket: WebSocket):
        if conversation_id not in self.rooms:
            self.rooms[conversation_id] = []
        self.rooms[conversation_id].append(websocket)

    def disconnect(self, conversation_id: str, websocket: WebSocket):
        if conversation_id in self.rooms:
            if websocket in self.rooms[conversation_id]:
                self.rooms[conversation_id].remove(websocket)
            if not self.rooms[conversation_id]:
                del self.rooms[conversation_id]

    async def broadcast(self, conversation_id: str, message: dict):
        if conversation_id not in self.rooms:
            return
        disconnected = []
        for connection in list(self.rooms[conversation_id]):
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conversation_id, conn)

chat_ws_manager = ConversationConnectionManager()

def broadcast_delivery_update(delivery_id: str, event_type: str, data: dict):
    if delivery_id not in delivery_ws_manager.rooms:
        return
    payload = {
        "type": event_type,
        "deliveryId": delivery_id,
        "data": data,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    try:
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                loop.create_task(delivery_ws_manager.broadcast(delivery_id, payload))
        except RuntimeError:
            pass
    except Exception as e:
        logger.warning(f"Could not broadcast delivery update: {e}")

def broadcast_chat_message(conversation_id: str, message_data: dict):
    if conversation_id not in chat_ws_manager.rooms:
        return
    payload = {
        "type": "message.received",
        "conversationId": conversation_id,
        "data": message_data,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    try:
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                loop.create_task(chat_ws_manager.broadcast(conversation_id, payload))
        except RuntimeError:
            pass
    except Exception as e:
        logger.warning(f"Could not broadcast chat message: {e}")

@app.websocket("/api/deliveries/{delivery_id}/ws")
async def delivery_websocket(websocket: WebSocket, delivery_id: str, token: Optional[str] = None):
    await websocket.accept()

    if not token:
        await websocket.close(code=4001, reason="Authentication token required.")
        return

    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        await websocket.close(code=4003, reason="Invalid or expired token.")
        return

    user_email = payload["sub"].strip().lower()
    delivery = get_delivery(delivery_id)
    if not delivery:
        await websocket.close(code=4004, reason="Delivery not found.")
        return

    order = None
    if delivery.get("booking_id"):
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (delivery["booking_id"],))
        except Exception:
            pass
        if not order:
            order = MOCK_ORDERS.get(delivery["booking_id"])

    customer_email = (order.get("user_email") if order else "").strip().lower()
    product_id = order.get("product_id") if order else ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id)
    lender_email = (product.get("user_email") if product else "").strip().lower()

    user_rec = get_user(user_email) or {}
    is_admin = user_rec.get("role") == "admin"

    if user_email not in (customer_email, lender_email) and not is_admin:
        await websocket.close(code=4003, reason="Not authorized to track this delivery.")
        return

    await delivery_ws_manager.connect(delivery_id, websocket)
    logger.info(f"WebSocket client connected to delivery {delivery_id} ({user_email})")

    try:
        await websocket.send_json({
            "type": "delivery.connected",
            "deliveryId": delivery_id,
            "data": {
                "status": delivery.get("status"),
                "currentLatitude": delivery.get("current_latitude"),
                "currentLongitude": delivery.get("current_longitude"),
                "deliveryLatitude": delivery.get("delivery_latitude"),
                "deliveryLongitude": delivery.get("delivery_longitude"),
                "etaMinutes": delivery.get("eta_minutes"),
                "updatedAt": delivery.get("updated_at")
            },
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    except WebSocketDisconnect:
        delivery_ws_manager.disconnect(delivery_id, websocket)
        logger.info(f"WebSocket disconnected from delivery {delivery_id}: {user_email}")
    except Exception as e:
        delivery_ws_manager.disconnect(delivery_id, websocket)
        logger.warning(f"WebSocket delivery error ({user_email}): {e}")

@app.websocket("/api/conversations/{conversation_id}/ws")
async def conversation_websocket(websocket: WebSocket, conversation_id: str, token: Optional[str] = None):
    await websocket.accept()

    if not token:
        await websocket.close(code=4001, reason="Authentication token required.")
        return

    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        await websocket.close(code=4003, reason="Invalid or expired token.")
        return

    user_email = payload["sub"].strip().lower()
    conv = None
    try:
        conv = fetch_one("SELECT * FROM conversations WHERE id = %s", (conversation_id,))
    except Exception:
        pass
    if not conv:
        conv = MOCK_CONVERSATIONS.get(conversation_id)

    if not conv:
        await websocket.close(code=4004, reason="Conversation not found.")
        return

    user_rec = get_user(user_email) or {}
    is_admin = user_rec.get("role") == "admin"
    is_member = (conv.get("customer_email", "").strip().lower() == user_email or
                 conv.get("lender_email", "").strip().lower() == user_email or
                 is_admin)

    if not is_member:
        await websocket.close(code=4003, reason="Not authorized to join this conversation.")
        return

    await chat_ws_manager.connect(conversation_id, websocket)
    logger.info(f"WebSocket client connected to conversation {conversation_id} ({user_email})")

    try:
        await websocket.send_json({
            "type": "chat.connected",
            "conversationId": conversation_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    except WebSocketDisconnect:
        chat_ws_manager.disconnect(conversation_id, websocket)
        logger.info(f"WebSocket disconnected from conversation {conversation_id}: {user_email}")
    except Exception as e:
        chat_ws_manager.disconnect(conversation_id, websocket)
        logger.warning(f"WebSocket chat error ({user_email}): {e}")

# ==============================================================================
# --- DELIVERY TRACKING API ENDPOINTS ---
# ==============================================================================

class DeliveryStatusUpdateSchema(BaseModel):
    status: str
    note: Optional[str] = None

class DeliveryLocationUpdateSchema(BaseModel):
    model_config = {"populate_by_name": True}
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    accuracy: Optional[float] = None

@app.get("/api/bookings/{booking_id}/delivery")
def get_booking_delivery_endpoint(booking_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_bid = booking_id.strip()

    order = None
    try:
        order = fetch_one("SELECT * FROM orders WHERE id = %s", (clean_bid,))
    except Exception:
        pass
    if not order:
        order = MOCK_ORDERS.get(clean_bid)

    if not order:
        raise HTTPException(status_code=404, detail="Booking not found.")

    customer_email = (order.get("user_email") or "").strip().lower()
    product_id = order.get("product_id") or order.get("productId") or ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") or "").strip().lower()

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != customer_email and clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Not authorized to view this booking's delivery.")

    delivery = get_or_create_delivery(clean_bid, clean_user)
    locations = get_delivery_locations(delivery["id"], limit=30)
    is_customer = clean_user == customer_email

    counterparty_email = lender_email if is_customer else customer_email
    counterparty_user = get_user(counterparty_email) or {}
    counterparty_name = counterparty_user.get("full_name") or counterparty_email.split("@")[0]
    counterparty_phone = counterparty_user.get("phone") or ""

    return {
        "success": True,
        "delivery": delivery,
        "locations": locations,
        "booking": {
            "id": clean_bid,
            "productId": product_id,
            "productTitle": order.get("product_title") or product.get("title") or "Gear Rental",
            "productImage": order.get("product_image") or product.get("image") or "",
            "startDate": order.get("start_date"),
            "endDate": order.get("end_date"),
            "status": order.get("status"),
            "total": order.get("total")
        },
        "isCustomer": is_customer,
        "counterparty": {
            "name": counterparty_name,
            "email": counterparty_email,
            "phone": counterparty_phone,
            "role": "lender" if is_customer else "customer"
        }
    }

@app.post("/api/deliveries/{delivery_id}/status")
def update_delivery_status_endpoint(delivery_id: str, data: DeliveryStatusUpdateSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_did = delivery_id.strip()
    target_status = data.status.strip().upper()

    delivery = get_delivery(clean_did)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found.")

    order = None
    if delivery.get("booking_id"):
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (delivery["booking_id"],))
        except Exception:
            pass
        if not order:
            order = MOCK_ORDERS.get(delivery["booking_id"])

    product_id = order.get("product_id") if order else ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") if product else "").strip().lower()

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Only the verified lender can update delivery status.")

    try:
        updated_del = update_delivery_status(clean_did, target_status, clean_user)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    customer_email = order.get("user_email") if order else ""
    bid = delivery.get("booking_id")
    conv = get_or_create_booking_conversation(bid, clean_user) if bid else None

    status_messages = {
        "PREPARING": "Lender has begun preparing and inspecting your rental gear.",
        "READY": "Gear has been packaged and is ready for dispatch.",
        "OUT_FOR_DELIVERY": "Delivery has started. Your gear is on the way!",
        "NEAR_DESTINATION": "Delivery is near the destination. Please be ready to receive your gear.",
        "DELIVERED": "Product marked as delivered. Please inspect the gear and confirm receipt in your app."
    }

    if target_status in status_messages and conv:
        add_message(
            conv["id"],
            sender_email="system",
            sender_name="Payent Delivery",
            content=status_messages[target_status],
            message_type="SYSTEM"
        )
        broadcast_chat_message(conv["id"], {
            "id": f"sys-{int(time.time()*1000)}",
            "conversation_id": conv["id"],
            "sender_email": "system",
            "sender_name": "Payent Delivery",
            "message_type": "SYSTEM",
            "content": status_messages[target_status],
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    if customer_email and target_status in status_messages:
        create_notification(
            email=customer_email,
            title=f"Delivery Update: {target_status.replace('_', ' ').title()}",
            message=status_messages[target_status],
            notif_type="delivery"
        )

    broadcast_delivery_update(clean_did, "delivery.status_updated", {
        "deliveryId": clean_did,
        "status": target_status,
        "startedAt": updated_del.get("started_at"),
        "nearDestinationAt": updated_del.get("near_destination_at"),
        "deliveredAt": updated_del.get("delivered_at"),
        "updatedAt": updated_del.get("updated_at")
    })

    return {
        "success": True,
        "delivery": updated_del,
        "message": f"Delivery transitioned to {target_status}"
    }

@app.post("/api/deliveries/{delivery_id}/location")
def update_delivery_location_endpoint(delivery_id: str, data: DeliveryLocationUpdateSchema, current_user_email: str = Depends(get_current_user_email), request: Request = None):
    clean_user = current_user_email.strip().lower()
    clean_did = delivery_id.strip()

    key = f"del_loc_rl:{clean_did}"
    is_locked, secs = record_failed_auth_attempt(key, max_attempts=30, lock_duration_secs=60)
    if is_locked:
        raise HTTPException(status_code=429, detail=f"Location update rate limit reached. Please wait {secs}s.")

    delivery = get_delivery(clean_did)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found.")

    order = None
    if delivery.get("booking_id"):
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (delivery["booking_id"],))
        except Exception:
            pass
        if not order:
            order = MOCK_ORDERS.get(delivery["booking_id"])

    product_id = order.get("product_id") if order else ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") if product else "").strip().lower()

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Only the lender can broadcast delivery location.")

    if delivery.get("status") not in ("OUT_FOR_DELIVERY", "NEAR_DESTINATION"):
        raise HTTPException(status_code=400, detail="Live location tracking is only permitted while delivery is active (OUT_FOR_DELIVERY or NEAR_DESTINATION).")

    lat_val = data.latitude if data.latitude is not None else data.lat
    lng_val = data.longitude if data.longitude is not None else data.lng
    if lat_val is None or lng_val is None:
        raise HTTPException(status_code=422, detail="Latitude and Longitude coordinates are required.")

    if not (-90.0 <= lat_val <= 90.0) or not (-180.0 <= lng_val <= 180.0):
        raise HTTPException(status_code=422, detail="Invalid GPS coordinates.")

    loc = add_delivery_location(
        clean_did,
        latitude=lat_val,
        longitude=lng_val,
        heading=data.heading,
        speed=data.speed,
        accuracy=data.accuracy
    )

    broadcast_delivery_update(clean_did, "delivery.location_updated", {
        "deliveryId": clean_did,
        "latitude": lat_val,
        "longitude": lng_val,
        "heading": data.heading,
        "speed": data.speed,
        "accuracy": data.accuracy,
        "etaMinutes": delivery.get("eta_minutes"),
        "recordedAt": loc.get("recorded_at")
    })

    return {
        "success": True,
        "location": loc,
        "etaMinutes": delivery.get("eta_minutes")
    }

@app.post("/api/deliveries/{delivery_id}/confirm")
def confirm_delivery_endpoint(delivery_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_did = delivery_id.strip()

    delivery = get_delivery(clean_did)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found.")

    order = None
    if delivery.get("booking_id"):
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (delivery["booking_id"],))
        except Exception:
            pass
        if not order:
            order = MOCK_ORDERS.get(delivery["booking_id"])

    customer_email = (order.get("user_email") if order else "").strip().lower()
    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != customer_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Only the customer who booked the gear can confirm delivery receipt.")

    try:
        updated_del = confirm_delivery_receipt(clean_did, clean_user)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    bid = delivery.get("booking_id")
    conv = get_or_create_booking_conversation(bid, clean_user) if bid else None
    if conv:
        add_message(
            conv["id"],
            sender_email="system",
            sender_name="Payent System",
            content="Customer confirmed receipt of the gear. Rental period is now active.",
            message_type="SYSTEM"
        )

    product_id = order.get("product_id") if order else ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") if product else "").strip().lower()
    if lender_email:
        create_notification(
            email=lender_email,
            title="Delivery Receipt Confirmed",
            message=f"Customer confirmed receipt for booking #{bid}. The rental period is now underway.",
            notif_type="booking"
        )

    broadcast_delivery_update(clean_did, "delivery.confirmed", {
        "deliveryId": clean_did,
        "customerConfirmedAt": updated_del.get("customer_confirmed_at")
    })

    return {
        "success": True,
        "delivery": updated_del,
        "message": "Delivery receipt confirmed. Enjoy your gear rental!"
    }

@app.get("/api/deliveries/{delivery_id}/tracking")
def get_delivery_tracking_endpoint(delivery_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_did = delivery_id.strip()

    delivery = get_delivery(clean_did)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found.")

    order = None
    if delivery.get("booking_id"):
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (delivery["booking_id"],))
        except Exception:
            pass
        if not order:
            order = MOCK_ORDERS.get(delivery["booking_id"])

    customer_email = (order.get("user_email") if order else "").strip().lower()
    product_id = order.get("product_id") if order else ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") if product else "").strip().lower()

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != customer_email and clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Not authorized to view tracking.")

    is_customer = clean_user == customer_email
    locations = get_delivery_locations(clean_did, limit=50)

    curr_lat = delivery.get("current_latitude") if delivery.get("current_latitude") is not None else delivery.get("currentLatitude")
    curr_lng = delivery.get("current_longitude") if delivery.get("current_longitude") is not None else delivery.get("currentLongitude")
    dest_lat = delivery.get("delivery_latitude") if delivery.get("delivery_latitude") is not None else delivery.get("deliveryLatitude")
    dest_lng = delivery.get("delivery_longitude") if delivery.get("delivery_longitude") is not None else delivery.get("deliveryLongitude")

    return {
        "success": True,
        "isCustomer": is_customer,
        "tracking": {
            "id": delivery["id"],
            "bookingId": delivery.get("booking_id"),
            "status": delivery.get("status"),
            "pickupAddress": delivery.get("pickup_address"),
            "deliveryAddress": delivery.get("delivery_address"),
            "deliveryLatitude": float(dest_lat) if dest_lat is not None else None,
            "deliveryLongitude": float(dest_lng) if dest_lng is not None else None,
            "currentLatitude": float(curr_lat) if curr_lat is not None else None,
            "currentLongitude": float(curr_lng) if curr_lng is not None else None,
            "etaMinutes": delivery.get("eta_minutes"),
            "startedAt": delivery.get("started_at"),
            "nearDestinationAt": delivery.get("near_destination_at"),
            "deliveredAt": delivery.get("delivered_at"),
            "customerConfirmedAt": delivery.get("customer_confirmed_at"),
            "isCustomer": is_customer,
            "locations": locations,
            "delivery": delivery,
        },
    }

@app.get("/api/deliveries/{delivery_id}/locations")
def get_delivery_locations_endpoint(delivery_id: str, limit: int = Query(50, ge=1, le=200), current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_did = delivery_id.strip()
    delivery = get_delivery(clean_did)
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found.")

    order = None
    if delivery.get("booking_id"):
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (delivery["booking_id"],))
        except Exception:
            pass
        if not order:
            order = MOCK_ORDERS.get(delivery["booking_id"])

    customer_email = (order.get("user_email") if order else "").strip().lower()
    product_id = order.get("product_id") if order else ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") if product else "").strip().lower()

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != customer_email and clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Not authorized to view delivery locations.")

    locations = get_delivery_locations(clean_did, limit=limit)
    return {"success": True, "locations": locations}

# ==============================================================================
# --- CUSTOMER ↔ LENDER PERSISTENT CHAT & CONVERSATIONS API ---
# ==============================================================================

class CreateOrGetConversationSchema(BaseModel):
    product_id: Optional[str] = None
    booking_id: Optional[str] = None
    initial_message: Optional[str] = None

class SendChatMessageSchema(BaseModel):
    content: str
    message_type: Optional[str] = "TEXT"
    attachment_url: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None

class MessageAttachmentUploadSchema(BaseModel):
    file_data: str
    file_name: str
    file_type: str
    file_size: Optional[int] = 0

@app.post("/api/conversations")
def create_or_get_conversation_endpoint(data: CreateOrGetConversationSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_pid = (data.product_id or "").strip()
    clean_bid = (data.booking_id or "").strip()

    if not clean_pid and not clean_bid:
        raise HTTPException(status_code=400, detail="Either product_id or booking_id must be provided.")

    try:
        if clean_bid:
            conv = get_or_create_booking_conversation(clean_bid, clean_user)
        else:
            conv = get_or_create_product_conversation(clean_pid, clean_user, data.initial_message)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    detail = get_conversation_detail(conv["id"], clean_user)
    return {
        "success": True,
        "conversation": detail
    }

@app.get("/api/bookings/{booking_id}/conversation")
def get_booking_conversation_endpoint(booking_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_bid = booking_id.strip()

    order = None
    try:
        order = fetch_one("SELECT * FROM orders WHERE id = %s", (clean_bid,))
    except Exception:
        pass
    if not order:
        order = MOCK_ORDERS.get(clean_bid)

    if not order:
        raise HTTPException(status_code=404, detail="Booking not found.")

    customer_email = (order.get("user_email") or "").strip().lower()
    product_id = order.get("product_id") or order.get("productId") or ""
    product = None
    if product_id:
        try:
            product = fetch_one("SELECT * FROM custom_products WHERE id = %s", (product_id,))
        except Exception:
            pass
        if not product:
            product = MOCK_CUSTOM_PRODUCTS.get(product_id, {})
    lender_email = (product.get("user_email") or "").strip().lower()

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"

    if clean_user != customer_email and clean_user != lender_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Not authorized to view this booking's conversation.")

    conv = get_or_create_booking_conversation(clean_bid, clean_user)
    detail = get_conversation_detail(conv["id"], clean_user)

    return {
        "success": True,
        "conversation": detail
    }

@app.get("/api/conversations")
def get_conversations_endpoint(search: Optional[str] = Query(None), current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    convs = get_user_conversations(clean_user, search=search)
    return {
        "success": True,
        "conversations": convs
    }

@app.get("/api/conversations/unread-count")
@app.get("/api/messages/unread-count")
def get_conversations_unread_count_endpoint(current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    cnt = get_total_unread_messages_count(clean_user)
    return {
        "success": True,
        "unreadCount": cnt,
        "unread_count": cnt
    }

@app.get("/api/conversations/{conversation_id}")
def get_conversation_endpoint(conversation_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_cid = conversation_id.strip()

    detail = get_conversation_detail(clean_cid, clean_user)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied.")

    return {
        "success": True,
        "conversation": detail
    }

@app.post("/api/conversations/{conversation_id}/messages")
def send_conversation_message_endpoint(conversation_id: str, data: SendChatMessageSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_cid = conversation_id.strip()
    clean_content = data.content.strip()

    # Rate limiting protection: 30 messages per 10s
    key = f"msg_send_rl:{clean_user}"
    is_locked, secs = record_failed_auth_attempt(key, max_attempts=30, lock_duration_secs=10)
    if is_locked:
        raise HTTPException(status_code=429, detail=f"You are sending messages too quickly. Please wait {secs}s.")

    if not clean_content and not data.attachment_url:
        raise HTTPException(status_code=422, detail="Message content or attachment is required.")
    if len(clean_content) > 5000:
        raise HTTPException(status_code=422, detail="Message content exceeds maximum allowed length of 5000 characters.")

    conv = None
    try:
        conv = fetch_one("SELECT * FROM conversations WHERE id = %s", (clean_cid,))
    except Exception:
        pass
    if not conv:
        conv = MOCK_CONVERSATIONS.get(clean_cid)

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") == "admin"
    is_customer = conv.get("customer_email", "").strip().lower() == clean_user
    is_lender = conv.get("lender_email", "").strip().lower() == clean_user

    if not is_customer and not is_lender and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Not authorized to message in this conversation.")

    sender_name = user_rec.get("full_name") or clean_user.split("@")[0]
    msg = add_message(
        conversation_id=clean_cid,
        sender_email=clean_user,
        sender_name=sender_name,
        content=clean_content or ("Attached file" if data.attachment_url else ""),
        message_type=data.message_type or ("IMAGE" if data.attachment_url and (data.file_type or "").startswith("image/") else "TEXT"),
        attachment_url=data.attachment_url,
        file_name=data.file_name,
        file_type=data.file_type,
        file_size=data.file_size
    )

    counterparty_email = conv.get("lender_email") if is_customer else conv.get("customer_email")
    if counterparty_email:
        preview_text = clean_content[:100] + ("..." if len(clean_content) > 100 else "") if clean_content else "Sent an attachment"
        create_notification(
            email=counterparty_email,
            title=f"New Message from {sender_name}",
            message=preview_text,
            notif_type="message"
        )

    broadcast_chat_message(clean_cid, msg)

    return {
        "success": True,
        "message": msg
    }

ALLOWED_ATTACHMENT_MIMES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    "application/pdf", "text/plain", "application/zip", "application/x-zip-compressed"
}

@app.post("/api/conversations/{conversation_id}/attachments")
def upload_conversation_attachment_endpoint(conversation_id: str, data: MessageAttachmentUploadSchema, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_cid = conversation_id.strip()

    conv = get_conversation(clean_cid)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    cust_email = (conv.get("customer_email") or "").strip().lower()
    lend_email = (conv.get("lender_email") or "").strip().lower()
    user_rec = get_user(clean_user) or {}
    is_admin = user_rec.get("role") in ("admin", "superadmin")

    if clean_user != cust_email and clean_user != lend_email and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden. Not authorized to upload attachments to this conversation.")

    # Validate attachment size (max 5MB in base64 is ~7MB string)
    if len(data.file_data) > 7 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Attachment size exceeds 5MB limit.")

    # Validate MIME type
    clean_mime = (data.file_type or "").strip().lower()
    if clean_mime not in ALLOWED_ATTACHMENT_MIMES and not clean_mime.startswith("image/"):
        raise HTTPException(status_code=415, detail=f"Unsupported file type '{data.file_type}'. Allowed types: images, PDF, text, ZIP.")

    # Sanitize file name to prevent path traversal
    raw_filename = os.path.basename(data.file_name or "attachment")
    sanitized_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', raw_filename)
    if not sanitized_filename:
        sanitized_filename = "attachment"

    sender_name = user_rec.get("full_name") or clean_user.split("@")[0]
    msg_type = "IMAGE" if clean_mime.startswith("image/") else "FILE"
    content_text = f"Shared {sanitized_filename}"

    msg = add_message(
        conversation_id=clean_cid,
        sender_email=clean_user,
        sender_name=sender_name,
        content=content_text,
        message_type=msg_type,
        attachment_url=data.file_data,
        file_name=sanitized_filename,
        file_type=clean_mime,
        file_size=data.file_size
    )

    counterparty_email = lend_email if clean_user == cust_email else cust_email
    if counterparty_email:
        create_notification(
            email=counterparty_email,
            title=f"New Attachment from {sender_name}",
            message=content_text,
            notif_type="message"
        )

    broadcast_chat_message(clean_cid, msg)

    return {
        "success": True,
        "message": msg
    }

@app.patch("/api/conversations/{conversation_id}/read")
def mark_conversation_read_patch_endpoint(conversation_id: str, current_user_email: str = Depends(get_current_user_email)):
    clean_user = current_user_email.strip().lower()
    clean_cid = conversation_id.strip()

    conv = get_conversation(clean_cid)
    if not conv:
        for c in MOCK_CONVERSATIONS.values():
            if c.get("id") == clean_cid or c.get("booking_id") == clean_cid:
                conv = c
                break

    target_id = conv["id"] if conv else clean_cid
    mark_conversation_read(target_id, clean_user)
    return {"success": True}

@app.post("/api/conversations/{conversation_id}/read")
def mark_conversation_read_post_endpoint(conversation_id: str, current_user_email: str = Depends(get_current_user_email)):
    return mark_conversation_read_patch_endpoint(conversation_id, current_user_email)

@app.websocket("/api/admin/ws")
async def admin_websocket(websocket: WebSocket, token: Optional[str] = None):
    # Accept websocket connection upfront
    await websocket.accept()

    # 1. Rate limiting WebSocket connection attempts per IP
    client_ip = websocket.client.host if websocket.client else "unknown"
    key = f"ws_conn:{client_ip}"
    is_locked, secs = record_failed_auth_attempt(key, max_attempts=30, lock_duration_secs=60)
    if is_locked:
        await websocket.close(code=4003, reason=f"Too many connection attempts. Locked for {secs} seconds.")
        return

    # 2. Strict Authentication & Role Check Guard
    if not token:
        await websocket.close(code=4003, reason="Forbidden. Admin JWT token required.")
        return

    payload = decode_access_token(token, expected_type="access")
    if not payload or "sub" not in payload:
        await websocket.close(code=4003, reason="Forbidden. Invalid or expired token.")
        return

    user = get_user(payload["sub"])
    role = (user.get("role") if user else payload.get("role", "")).lower()
    if role not in ("admin", "superadmin"):
        await websocket.close(code=4003, reason="Forbidden. Admin access required.")
        return

    # 3. Add to live connections manager
    if websocket not in ws_manager.active_connections:
        ws_manager.active_connections.append(websocket)
    logger.info(f"WebSocket admin session connected for {user['email']} from IP {client_ip}")

    try:
        await websocket.send_json({
            "type": "connection.established",
            "data": {
                "email": user["email"],
                "role": user["role"],
                "serverTime": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info(f"WebSocket admin disconnected: {user['email']}")
    except Exception as e:
        ws_manager.disconnect(websocket)
        logger.warning(f"WebSocket error for {user['email']}: {e}")

@app.get("/api/admin/events/poll")
def poll_admin_events(since: Optional[str] = None, current_admin: dict = Depends(check_admin_user)):
    """Serverless HTTP polling fallback for admin notifications/events."""
    notifications = get_admin_notifications(limit=20)
    return {
        "success": True,
        "events": notifications,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

class AdminRegisterSchema(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    fullName: Optional[str] = None
    phone: Optional[str] = "0000000000"
    admin_code: Optional[str] = None
    adminCode: Optional[str] = None

@app.post("/api/admin/auth/register")
def admin_register(data: AdminRegisterSchema):
    clean_email = data.email.lower().strip()
    code = data.admin_code or data.adminCode
    if not code or (code != ADMIN_SETUP_CODE and code != ADMIN_CREATION_SECRET):
        logger.warning(f"Unauthorized admin registration attempt for {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Forbidden. Valid admin setup code is required to register or promote an administrator."
        )

    valid_pass, msg = validate_password_strength(data.password)
    if not valid_pass:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    display_name = data.full_name or data.fullName or clean_email.split("@")[0]

    existing = get_user(clean_email)
    if existing:
        execute_query("UPDATE users SET role = 'admin', status = 'approved', verified = TRUE WHERE LOWER(email) = LOWER(%s)", (clean_email,))
        invalidate_user_cache(clean_email)
        if clean_email in MOCK_USERS:
            MOCK_USERS[clean_email]["role"] = "admin"
            MOCK_USERS[clean_email]["status"] = "approved"
            MOCK_USERS[clean_email]["verified"] = True
        logger.info(f"Existing user {clean_email} upgraded to administrator with valid setup code.")
        return {"success": True, "message": f"User {clean_email} upgraded to administrator role successfully."}

    hashed = hash_password(data.password)
    create_user(
        email=clean_email,
        phone=data.phone or "+10000000000",
        password_hash=hashed,
        full_name=display_name,
        role="admin",
        status="approved"
    )
    logger.info(f"New administrator account created for {clean_email}")
    return {"success": True, "message": f"Admin account for {clean_email} created successfully."}

@app.post("/api/admin/auth/login")
def admin_login(data: LoginRequestSchema, request: Request, response: Response):
    clean_email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    ip_key = f"admin_login_ip:{client_ip}"
    user_key = f"admin_login_user:{clean_email}"

    is_locked_ip, secs_ip = record_failed_auth_attempt(ip_key, max_attempts=10, lock_duration_secs=900)
    if is_locked_ip:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many admin login attempts from this IP. Locked out for {secs_ip // 60} minutes."
        )

    is_locked_user, secs_user = record_failed_auth_attempt(user_key, max_attempts=5, lock_duration_secs=900)
    if is_locked_user:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Admin account locked due to repeated failed logins. Locked out for {secs_user // 60} minutes."
        )

    user = get_user(clean_email)
    if not user or not verify_password(data.password, user["password_hash"]):
        logger.warning(f"Failed admin login attempt for {clean_email} from IP {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if user["role"] != "admin":
        logger.warning(f"Non-admin user {clean_email} attempted admin login from IP {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Admin access required."
        )

    clear_failed_auth_attempts(ip_key)
    clear_failed_auth_attempts(user_key)

    session_id = f"sess-admin-{uuid.uuid4()}"
    token_claims = {
        "sub": user["email"],
        "account_type": "admin",
        "accountType": "admin",
        "role": user["role"],
        "sid": session_id,
    }
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    user_agent = request.headers.get("user-agent", "Unknown Browser")
    device_name = "Desktop" if ("Windows" in user_agent or "Macintosh" in user_agent or "Linux" in user_agent) and "Mobile" not in user_agent else ("Mobile" if "Mobile" in user_agent or "Android" in user_agent or "iPhone" in user_agent else "Web Browser")
    expires_at_str = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)).isoformat()

    create_db_session(session_id, user["email"], refresh_token, device_name, client_ip, user_agent, expires_at_str, account_type="admin")

    response.set_cookie(
        key="payent_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=7 * 86400
    )

    logger.info(f"Successful admin login for {clean_email} from IP {client_ip}")
    return {
        "success": True,
        "token": access_token,
        "refreshToken": refresh_token,
        "user": {
            "id": user["email"],
            "fullName": user["full_name"],
            "email": user["email"],
            "phone": user["phone"],
            "role": user["role"],
            "status": user["status"] or "active",
            "verified": bool(user["verified"]),
            "avatar": user["avatar"] or "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            "createdAt": user["created_at"]
        }
    }

@app.post("/api/admin/auth/logout")
def admin_logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token, expected_type="access")
        if payload and "jti" in payload:
            revoke_token(payload["jti"], payload.get("sub", ""), payload.get("exp", 0))

    response.delete_cookie("payent_refresh_token")
    return {"success": True, "message": "Admin logged out successfully."}

@app.get("/api/admin/auth/me")
def admin_get_me(current_admin: dict = Depends(check_admin_user)):
    return {
        "id": current_admin["email"],
        "fullName": current_admin["full_name"],
        "email": current_admin["email"],
        "phone": current_admin["phone"],
        "role": current_admin["role"],
        "status": current_admin["status"] or "active",
        "verified": bool(current_admin["verified"]),
        "avatar": current_admin["avatar"] or "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        "createdAt": current_admin["created_at"]
    }

@app.post("/api/admin/profile")
def admin_update_profile(data: ProfileUpdateSchema, current_admin: dict = Depends(check_admin_user)):
    fields = []
    params = []
    if data.fullName is not None:
        fields.append("full_name = %s")
        params.append(data.fullName)
    if data.phone is not None:
        fields.append("phone = %s")
        params.append(data.phone)
    if data.avatar is not None:
        fields.append("avatar = %s")
        params.append(data.avatar)
        
    if fields:
        params.append(current_admin["email"])
        execute_query(f"UPDATE users SET {', '.join(fields)} WHERE email = %s", tuple(params))
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], "Updated profile details", "Settings", "127.0.0.1"))
    
    updated = get_user(current_admin["email"])
    return {
        "id": updated["email"],
        "fullName": updated["full_name"],
        "email": updated["email"],
        "phone": updated["phone"],
        "role": updated["role"],
        "status": updated["status"] or "active",
        "verified": bool(updated["verified"]),
        "avatar": updated["avatar"] or "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        "createdAt": updated["created_at"]
    }

@app.post("/api/admin/profile/password")
def admin_update_password(data: PasswordUpdateSchema, current_admin: dict = Depends(check_admin_user)):
    if not data.newPassword:
        raise HTTPException(status_code=400, detail="New password is required")
        
    if data.currentPassword:
        if not verify_password(data.currentPassword, current_admin["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
            
    hashed = hash_password(data.newPassword)
    update_user_password(current_admin["email"], hashed)
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], "Updated account password", "Settings", "127.0.0.1"))
    
    return {"success": True, "message": "Password updated successfully"}

@app.get("/api/admin/dashboard/stats")
@app.get("/api/admin/stats")
def admin_stats(current_admin: dict = Depends(check_admin_user)):
    stats_result = {
        "totalUsers": 0,
        "payerntAccounts": 0,
        "payrentAccounts": 0,
        "adminAccounts": 0,
        "totalAgents": 0,
        "totalProducts": 0,
        "pendingProducts": 0,
        "approvedProducts": 0,
        "rejectedProducts": 0,
        "suspendedProducts": 0,
        "totalCategories": 0,
        "bookingsToday": 0,
        "monthlyBookings": 0,
        "activeBookings": 0,
        "completedBookings": 0,
        "revenueToday": 0.0,
        "monthlyRevenue": 0.0,
        "pendingWithdrawals": 0,
        "pendingReports": 0,
        "unreadNotifications": 0,
        "activeVisitors": 0,
        "websiteVisitors": 0
    }
    conn = get_db_connection()
    if not conn:
        return stats_result
    try:
        with conn.cursor() as cursor:
            def safe_query(sql, params=None, default=0):
                try:
                    cursor.execute(sql, params or ())
                    row = cursor.fetchone()
                    if row:
                        val = next(iter(row.values()))
                        return val if val is not None else default
                    return default
                except Exception as ex:
                    logger.warning(f"[admin_stats] query failed: {sql} error: {ex}")
                    return default

            # User accounts across all 3 tables
            payernt_cnt = int(safe_query("SELECT COUNT(*) as count FROM payernt_accounts", default=0))
            payrent_cnt = int(safe_query("SELECT COUNT(*) as count FROM payrent_accounts", default=0))
            admin_cnt = int(safe_query("SELECT COUNT(*) as count FROM admin_accounts", default=0))
            distinct_users_cnt = int(safe_query("""
                SELECT COUNT(DISTINCT email) as count FROM (
                    SELECT email FROM users
                    UNION
                    SELECT email FROM payernt_accounts
                    UNION
                    SELECT email FROM payrent_accounts
                    UNION
                    SELECT email FROM admin_accounts
                ) as combined_users
            """, default=0))
            
            stats_result["payerntAccounts"] = payernt_cnt
            stats_result["payrentAccounts"] = payrent_cnt
            stats_result["adminAccounts"] = admin_cnt
            stats_result["totalUsers"] = distinct_users_cnt
            stats_result["totalAgents"] = int(safe_query("SELECT COUNT(*) as count FROM agents", default=0))
            
            # Products across payernt_products and custom_products
            pp_total = int(safe_query("SELECT COUNT(*) as count FROM payernt_products", default=0))
            cp_total = int(safe_query("SELECT COUNT(*) as count FROM custom_products", default=0))
            stats_result["totalProducts"] = pp_total + cp_total
            
            pp_pending = int(safe_query("SELECT COUNT(*) as count FROM payernt_products WHERE LOWER(status) IN ('pending', 'under_review', 'pending_admin_review')", default=0))
            cp_pending = int(safe_query("SELECT COUNT(*) as count FROM custom_products WHERE LOWER(status) IN ('pending', 'under_review', 'pending_admin_review')", default=0))
            stats_result["pendingProducts"] = pp_pending + cp_pending
            
            pp_approved = int(safe_query("SELECT COUNT(*) as count FROM payernt_products WHERE LOWER(status) = 'approved'", default=0))
            cp_approved = int(safe_query("SELECT COUNT(*) as count FROM custom_products WHERE LOWER(status) = 'approved'", default=0))
            stats_result["approvedProducts"] = max(pp_approved, cp_approved)
            
            pp_rejected = int(safe_query("SELECT COUNT(*) as count FROM payernt_products WHERE LOWER(status) = 'rejected'", default=0))
            cp_rejected = int(safe_query("SELECT COUNT(*) as count FROM custom_products WHERE LOWER(status) = 'rejected'", default=0))
            stats_result["rejectedProducts"] = max(pp_rejected, cp_rejected)
            
            pp_suspended = int(safe_query("SELECT COUNT(*) as count FROM payernt_products WHERE LOWER(status) = 'suspended'", default=0))
            cp_suspended = int(safe_query("SELECT COUNT(*) as count FROM custom_products WHERE LOWER(status) = 'suspended'", default=0))
            stats_result["suspendedProducts"] = max(pp_suspended, cp_suspended)
            
            stats_result["totalCategories"] = int(safe_query("SELECT COUNT(*) as count FROM categories", default=0))
            
            # Orders / Bookings
            stats_result["monthlyBookings"] = int(safe_query("SELECT COUNT(*) as count FROM orders", default=0))
            stats_result["activeBookings"] = int(safe_query("SELECT COUNT(*) as count FROM orders WHERE status IN ('active', 'in_progress', 'confirmed', 'delivered')", default=0))
            stats_result["completedBookings"] = int(safe_query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'", default=0))
            stats_result["monthlyRevenue"] = float(safe_query("SELECT IFNULL(SUM(total), 0) as total FROM orders", default=0.0))
            
            today_prefix = datetime.date.today().isoformat()
            stats_result["bookingsToday"] = int(safe_query("SELECT COUNT(*) as count FROM orders WHERE created_at LIKE %s OR created_at >= CURDATE()", (f"{today_prefix}%",), default=0))
            stats_result["revenueToday"] = float(safe_query("SELECT IFNULL(SUM(total), 0) as total FROM orders WHERE created_at LIKE %s OR created_at >= CURDATE()", (f"{today_prefix}%",), default=0.0))
            
            # Withdrawals & Reports
            stats_result["pendingWithdrawals"] = int(safe_query("SELECT COUNT(*) as count FROM payernt_wallet_transactions WHERE type = 'WITHDRAWAL' AND UPPER(status) = 'PENDING'", default=0))
            stats_result["pendingReports"] = int(safe_query("SELECT COUNT(*) as count FROM reports WHERE status = 'open'", default=0))
            stats_result["unreadNotifications"] = int(safe_query("SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0", default=0))

            visitors = safe_query("SELECT COUNT(DISTINCT session_id) as count FROM user_events WHERE session_id IS NOT NULL AND session_id != ''", default=0)
            if visitors == 0:
                visitors = safe_query("SELECT COUNT(*) as count FROM user_events", default=0)
            stats_result["websiteVisitors"] = int(visitors)
            stats_result["activeVisitors"] = max(1, int(visitors // 10)) if visitors > 0 else 1
    except Exception as e:
        logger.error(f"[admin_stats] overall error: {e}")
    finally:
        if conn:
            conn.close()
        
    return stats_result

@app.post("/api/admin/dashboard/reset-analytics")
def admin_reset_analytics(current_admin: dict = Depends(check_superadmin_user)):
    execute_query("DELETE FROM orders")
    execute_query("DELETE FROM payments")
    execute_query("DELETE FROM custom_products")
    
    # Broadcast WebSocket event so all connected admin clients update immediately
    broadcast_admin_event("dashboard.reset", {"message": "Analytics and metrics reset to zero"})
    
    return {"success": True, "message": "Total analytics, revenue, and active listings reset to 0."}

# ----------------------------------------------------------------------
# Secure API Key Management Security & Admin Endpoints
# ----------------------------------------------------------------------
import hashlib

def generate_secure_api_key():
    token = secrets.token_urlsafe(32)
    full_key = f"rw_live_{token}"
    prefix = f"rw_live_{token[:6]}"
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, prefix, key_hash

def require_api_key(required_scopes: Optional[list[str]] = None):
    def _dependency(
        authorization: Optional[str] = Header(None),
        x_api_key: Optional[str] = Header(None, alias="X-API-Key")
    ):
        raw_key = None
        if authorization and authorization.startswith("Bearer rw_live_"):
            raw_key = authorization.split(" ")[1]
        elif x_api_key and x_api_key.startswith("rw_live_"):
            raw_key = x_api_key
        elif authorization and authorization.startswith("rw_live_"):
            raw_key = authorization
        
        if not raw_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized. Valid API Key required in Authorization header or X-API-Key."
            )
        
        key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        record = get_api_key_by_hash_db(key_hash)
        if not record or not record.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized. Invalid or revoked API key."
            )
        
        expires_at = record.get("expires_at")
        if expires_at:
            try:
                exp_dt = datetime.datetime.fromisoformat(expires_at)
                if datetime.datetime.now(datetime.timezone.utc) > exp_dt:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Unauthorized. API key has expired."
                    )
            except Exception:
                pass
        
        key_scopes = [s.strip() for s in (record.get("scopes") or "").split(",") if s.strip()]
        if required_scopes:
            for scope in required_scopes:
                if scope not in key_scopes and "admin" not in key_scopes and "*" not in key_scopes:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Forbidden. API key lacks required scope '{scope}'."
                    )
        
        # Enforce rate limiting per key
        key_id = record.get("id")
        rate_limit = record.get("rate_limit") or 100
        rl_key = f"apikey_rl:{key_id}"
        is_locked, lock_secs = record_failed_auth_attempt(rl_key, max_attempts=rate_limit, lock_duration_secs=60)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for API key ({rate_limit} req/min). Try again in {lock_secs}s."
            )
        
        touch_api_key_last_used_db(key_id)
        return record
    return _dependency

@app.get("/api/admin/api-keys")
def admin_get_api_keys(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    q: Optional[str] = None,
    current_admin: dict = Depends(check_admin_user)
):
    return get_api_keys_db(page=page, limit=limit, search=q)

@app.post("/api/admin/api-keys")
def admin_create_api_key(data: APIKeyCreateSchema, current_admin: dict = Depends(check_admin_user)):
    if not data.name or not data.name.strip():
        raise HTTPException(status_code=400, detail="API Key name is required.")
    
    full_secret, prefix, key_hash = generate_secure_api_key()
    scopes_str = ",".join(data.scopes) if data.scopes else "read"
    
    created = create_api_key_db({
        "name": data.name.strip(),
        "key_prefix": prefix,
        "key_hash": key_hash,
        "user_email": current_admin["email"],
        "scopes": scopes_str,
        "rate_limit": data.rate_limit or 100,
        "is_active": True,
        "expires_at": data.expires_at
    })
    
    # Broadcast event to connected admin clients
    broadcast_admin_event("apikey.created", {"id": created["id"], "name": created["name"]})
    
    return {
        "success": True,
        "apiKey": created,
        "secretKey": full_secret,
        "message": "API key generated successfully. Save this secret key now as it cannot be retrieved again."
    }

@app.get("/api/admin/api-keys/{key_id}")
def admin_get_api_key(key_id: str, current_admin: dict = Depends(check_admin_user)):
    item = get_api_key_by_id_db(key_id)
    if not item:
        raise HTTPException(status_code=404, detail="API Key not found.")
    return item

@app.put("/api/admin/api-keys/{key_id}")
def admin_update_api_key(key_id: str, data: APIKeyUpdateSchema, current_admin: dict = Depends(check_admin_user)):
    item = get_api_key_by_id_db(key_id)
    if not item:
        raise HTTPException(status_code=404, detail="API Key not found.")
    
    updates = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.scopes is not None:
        updates["scopes"] = ",".join(data.scopes)
    if data.rate_limit is not None:
        updates["rate_limit"] = data.rate_limit
    if data.is_active is not None:
        updates["is_active"] = data.is_active
    if data.expires_at is not None:
        updates["expires_at"] = data.expires_at

    updated = update_api_key_db(key_id, updates)
    broadcast_admin_event("apikey.updated", {"id": key_id})
    return {"success": True, "apiKey": updated}

@app.delete("/api/admin/api-keys/{key_id}")
def admin_delete_api_key(key_id: str, current_admin: dict = Depends(check_admin_user)):
    item = get_api_key_by_id_db(key_id)
    if not item:
        raise HTTPException(status_code=404, detail="API Key not found.")
    delete_api_key_db(key_id)
    broadcast_admin_event("apikey.deleted", {"id": key_id})
    return {"success": True, "message": f"API Key '{item['name']}' has been revoked and deleted."}

@app.get("/api/admin/dashboard/charts")
def admin_charts(days: int = Query(30), current_admin: dict = Depends(check_admin_user)):
    fallback_charts = {
        "revenueChart": [],
        "bookingChart": [],
        "userGrowth": [],
        "productGrowth": [],
        "categoryDistribution": [],
        "topProducts": []
    }
    conn = get_db_connection()
    if not conn:
        return fallback_charts
    try:
        with conn.cursor() as cursor:
            # Build dynamic time-series buckets based on requested days
            num_days = max(1, min(days, 365))
            end_date = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=num_days - 1)
            
            top_products = []
            try:
                # Top products
                cursor.execute("""
                    SELECT product_title, COUNT(*) as rentals, IFNULL(SUM(total), 0) as revenue
                    FROM orders
                    GROUP BY product_title
                    ORDER BY rentals DESC
                    LIMIT 4
                """)
                top_rows = cursor.fetchall() or []
                top_products = [
                    {"name": r.get("product_title") or "Unnamed", "rentals": r.get("rentals", 0), "revenue": float(r.get("revenue", 0))}
                    for r in top_rows
                ]
            except Exception as e:
                logger.warning(f"[admin_charts] top products query failed: {e}")
                
            category_distribution = []
            try:
                # Category distribution share
                cursor.execute("""
                    SELECT category as name, COUNT(*) as value
                    FROM custom_products
                    GROUP BY category
                """)
                cat_rows = cursor.fetchall() or []
                category_distribution = [
                    {"name": c.get("name") or "General", "value": c.get("value", 0)}
                    for c in cat_rows if c.get("name")
                ]
            except Exception as e:
                logger.warning(f"[admin_charts] category distribution query failed: {e}")

            order_data = {}
            try:
                # Aggregate time-series for orders (revenue & booking count)
                cursor.execute("""
                    SELECT DATE(created_at) as dt, COUNT(*) as cnt, IFNULL(SUM(total), 0) as rev
                    FROM orders
                    WHERE created_at >= %s
                    GROUP BY DATE(created_at)
                """, (start_date.isoformat(),))
                order_data = {str(r["dt"]): (r.get("cnt", 0), float(r.get("rev", 0))) for r in (cursor.fetchall() or []) if r.get("dt")}
            except Exception as e:
                logger.warning(f"[admin_charts] order time-series failed: {e}")

            user_data = {}
            try:
                # Aggregate time-series for user growth
                cursor.execute("""
                    SELECT DATE(created_at) as dt, COUNT(*) as cnt
                    FROM users
                    WHERE created_at >= %s
                    GROUP BY DATE(created_at)
                """, (start_date.isoformat(),))
                user_data = {str(r["dt"]): r.get("cnt", 0) for r in (cursor.fetchall() or []) if r.get("dt")}
            except Exception as e:
                logger.warning(f"[admin_charts] user time-series failed: {e}")

            product_data = {}
            try:
                # Aggregate time-series for product growth
                cursor.execute("""
                    SELECT DATE(created_at) as dt, COUNT(*) as cnt
                    FROM custom_products
                    WHERE created_at >= %s
                    GROUP BY DATE(created_at)
                """, (start_date.isoformat(),))
                product_data = {str(r["dt"]): r.get("cnt", 0) for r in (cursor.fetchall() or []) if r.get("dt")}
            except Exception as e:
                logger.warning(f"[admin_charts] product time-series failed: {e}")

            revenue_chart = []
            booking_chart = []
            user_growth = []
            product_growth = []

            if num_days <= 31:
                # Group by day
                curr = start_date
                while curr <= end_date:
                    d_str = curr.isoformat()
                    label = curr.strftime("%b %d")
                    cnt, rev = order_data.get(d_str, (0, 0.0))
                    u_cnt = user_data.get(d_str, 0)
                    p_cnt = product_data.get(d_str, 0)

                    revenue_chart.append({"name": label, "revenue": rev})
                    booking_chart.append({"name": label, "bookings": cnt})
                    user_growth.append({"name": label, "users": u_cnt})
                    product_growth.append({"name": label, "products": p_cnt})
                    curr += datetime.timedelta(days=1)
            else:
                # Group by month for longer periods (90, 365 days)
                rev_m, book_m, user_m, prod_m = {}, {}, {}, {}
                curr = start_date
                while curr <= end_date:
                    d_str = curr.isoformat()
                    m_label = curr.strftime("%b %Y")
                    cnt, rev = order_data.get(d_str, (0, 0.0))
                    u_cnt = user_data.get(d_str, 0)
                    p_cnt = product_data.get(d_str, 0)

                    rev_m[m_label] = rev_m.get(m_label, 0.0) + rev
                    book_m[m_label] = book_m.get(m_label, 0) + cnt
                    user_m[m_label] = user_m.get(m_label, 0) + u_cnt
                    prod_m[m_label] = prod_m.get(m_label, 0) + p_cnt

                    curr += datetime.timedelta(days=1)

                for m_label in rev_m.keys():
                    revenue_chart.append({"name": m_label, "revenue": rev_m[m_label]})
                    booking_chart.append({"name": m_label, "bookings": book_m[m_label]})
                    user_growth.append({"name": m_label, "users": user_m[m_label]})
                    product_growth.append({"name": m_label, "products": prod_m[m_label]})

            return {
                "revenueChart": revenue_chart,
                "bookingChart": booking_chart,
                "userGrowth": user_growth,
                "productGrowth": product_growth,
                "categoryDistribution": category_distribution,
                "topProducts": top_products
            }
    except Exception as e:
        logger.error(f"[admin_charts] overall error: {e}")
        return fallback_charts
    finally:
        if conn:
            conn.close()

@app.get("/api/admin/dashboard/activities")
def admin_dashboard_activities(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    rows = []
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, timestamp, user_name, action, module FROM admin_logs ORDER BY timestamp DESC LIMIT 7")
            rows = cursor.fetchall() or []
    except Exception as e:
        logger.warning(f"[admin_dashboard_activities] error: {e}")
        return []
    finally:
        if conn:
            conn.close()
        
    res = []
    icon_map = {
        "Auth": "UserPlus",
        "Inventory": "Camera",
        "Orders": "Calendar",
        "Payments": "CreditCard",
        "Reports": "Flag",
        "Users": "Users"
    }
    for r in rows:
        module = r.get("module") or "System"
        res.append({
            "id": r.get("id") or str(random.randint(1000, 9999)),
            "type": module.lower(),
            "title": r.get("action") or "Activity",
            "detail": f"By {r.get('user_name', 'Admin')} in {module}",
            "time": r.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "icon": icon_map.get(module, "Info")
        })
        
    return res

# Users (Unified across all 3 tables: admin_accounts, payernt_accounts, payrent_accounts, users)
@app.get("/api/admin/users")
def admin_users_list(current_admin: dict = Depends(check_admin_user)):
    users_by_id = {}
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                # 1. Payernt (Vendor) accounts
                cursor.execute("SELECT id, email, name, phone, address, pincode, status, aadhaar_number, rejection_reason, reviewed_by, reviewed_at, avatar, created_at FROM payernt_accounts ORDER BY created_at DESC")
                for r in (cursor.fetchall() or []):
                    em = r["email"].lower().strip()
                    status_str = r.get("status") or "PENDING_REVIEW"
                    is_approved = status_str.upper() in ("APPROVED", "ACTIVE")
                    raw_aadh = r.get("aadhaar_number") or ""
                    masked_aadh = f"XXXX-XXXX-{raw_aadh[-4:]}" if len(raw_aadh) >= 4 else (raw_aadh if raw_aadh else None)
                    
                    users_by_id[f"payernt_{em}"] = {
                        "id": em,
                        "accountId": r.get("id") or f"PAYERNT_USER_{em}",
                        "fullName": r.get("name") or em.split("@")[0],
                        "name": r.get("name") or em.split("@")[0],
                        "email": r["email"],
                        "phone": r.get("phone") or "",
                        "address": r.get("address") or "",
                        "city": "",
                        "pincode": r.get("pincode") or "",
                        "aadhaarNumber": masked_aadh,
                        "aadhaarMasked": masked_aadh,
                        "role": "lender",
                        "accountType": "Payernt",
                        "status": status_str,
                        "rejectionReason": r.get("rejection_reason"),
                        "reviewedBy": r.get("reviewed_by"),
                        "reviewedAt": r.get("reviewed_at"),
                        "verified": is_approved,
                        "avatar": r.get("avatar") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(r.get('name') or em)}&background=0D151D&color=fff",
                        "createdAt": str(r.get("created_at") or "")
                    }

                # 2. Payrent (Customer) accounts
                try:
                    cursor.execute("SELECT email, full_name, phone, address, city, pincode, status, pan_number, rejection_reason, reviewed_by, reviewed_at, avatar, created_at FROM payrent_accounts ORDER BY created_at DESC")
                    for r in (cursor.fetchall() or []):
                        em = r["email"].lower().strip()
                        status_str = r.get("status") or "PENDING_REVIEW"
                        is_approved = status_str.upper() in ("APPROVED", "ACTIVE")
                        raw_pan = r.get("pan_number") or ""
                        masked_pan = f"XXXXX{raw_pan[-5:]}" if len(raw_pan) == 10 else (raw_pan if raw_pan else None)
                        
                        users_by_id[f"payrent_{em}"] = {
                            "id": em,
                            "accountId": f"PAYRENT_USER_{em}",
                            "fullName": r.get("full_name") or em.split("@")[0],
                            "name": r.get("full_name") or em.split("@")[0],
                            "email": r["email"],
                            "phone": r.get("phone") or "",
                            "address": r.get("address") or "",
                            "city": r.get("city") or "",
                            "pincode": r.get("pincode") or "",
                            "panNumber": masked_pan,
                            "panMasked": masked_pan,
                            "role": "customer",
                            "accountType": "Payrent",
                            "status": status_str,
                            "rejectionReason": r.get("rejection_reason"),
                            "reviewedBy": r.get("reviewed_by"),
                            "reviewedAt": r.get("reviewed_at"),
                            "verified": is_approved,
                            "avatar": r.get("avatar") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(r.get('full_name') or em)}&background=0D151D&color=fff",
                            "createdAt": str(r.get("created_at") or "")
                        }
                except Exception as pe:
                    logger.warning(f"[admin_users_list] payrent_accounts query error: {pe}")

                # 3. Users table (for any registered users not in payrent_accounts/payernt_accounts)
                try:
                    cursor.execute("SELECT email, full_name, phone, address, city, pincode, status, pan_number, aadhaar_number, rejection_reason, reviewed_by, reviewed_at, avatar, created_at, role, account_type, verified FROM users ORDER BY created_at DESC")
                    for r in (cursor.fetchall() or []):
                        em = r["email"].lower().strip()
                        role_str = (r.get("role") or "customer").lower()
                        if role_str in ("admin", "superadmin"):
                            continue
                        key = f"payrent_{em}" if "rent" in role_str or "customer" in role_str or "user" in role_str else f"payernt_{em}"
                        if key not in users_by_id:
                            status_str = r.get("status") or "PENDING_REVIEW"
                            is_approved = bool(r.get("verified")) or status_str.upper() in ("APPROVED", "ACTIVE")
                            raw_pan = r.get("pan_number") or ""
                            masked_pan = f"XXXXX{raw_pan[-5:]}" if len(raw_pan) == 10 else (raw_pan if raw_pan else None)
                            raw_aadh = r.get("aadhaar_number") or ""
                            masked_aadh = f"XXXX-XXXX-{raw_aadh[-4:]}" if len(raw_aadh) >= 4 else (raw_aadh if raw_aadh else None)
                            users_by_id[key] = {
                                "id": em,
                                "accountId": f"PAYRENT_USER_{em}" if "payrent" in key else f"PAYERNT_USER_{em}",
                                "fullName": r.get("full_name") or em.split("@")[0],
                                "name": r.get("full_name") or em.split("@")[0],
                                "email": r["email"],
                                "phone": r.get("phone") or "",
                                "address": r.get("address") or "",
                                "city": r.get("city") or "",
                                "pincode": r.get("pincode") or "",
                                "panNumber": masked_pan,
                                "panMasked": masked_pan,
                                "aadhaarNumber": masked_aadh,
                                "aadhaarMasked": masked_aadh,
                                "role": "customer" if "payrent" in key else "lender",
                                "accountType": "Payrent" if "payrent" in key else "Payernt",
                                "status": status_str,
                                "rejectionReason": r.get("rejection_reason"),
                                "reviewedBy": r.get("reviewed_by"),
                                "reviewedAt": r.get("reviewed_at"),
                                "verified": is_approved,
                                "avatar": r.get("avatar") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(r.get('full_name') or em)}&background=0D151D&color=fff",
                                "createdAt": str(r.get("created_at") or "")
                            }
                except Exception:
                    pass

                # 4. Admin accounts
                cursor.execute("SELECT id, email, full_name, phone, address, city, pincode, status, verified, avatar, created_at FROM admin_accounts ORDER BY created_at DESC")
                for r in (cursor.fetchall() or []):
                    em = r["email"].lower().strip()
                    users_by_id[f"admin_{em}"] = {
                        "id": em,
                        "accountId": r.get("id") or f"ADMIN_{em}",
                        "fullName": r.get("full_name") or "Administrator",
                        "name": r.get("full_name") or "Administrator",
                        "email": r["email"],
                        "phone": r.get("phone") or "",
                        "address": r.get("address") or "",
                        "city": r.get("city") or "",
                        "pincode": r.get("pincode") or "",
                        "role": "admin",
                        "accountType": "Admin",
                        "status": r.get("status") or "active",
                        "verified": bool(r.get("verified", 1)),
                        "avatar": r.get("avatar") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                        "createdAt": str(r.get("created_at") or "")
                    }
        except Exception as e:
            logger.warning(f"[admin_users_list] error: {e}")
        finally:
            conn.close()

    # In-memory fallback if DB returned nothing or is offline
    if not users_by_id:
        for em, u in MOCK_USERS.items():
            role_str = (u.get("role") or "customer").lower()
            key = f"admin_{em}" if role_str in ("admin", "superadmin") else f"payrent_{em}"
            status_str = u.get("status") or ("active" if role_str in ("admin", "superadmin") else "PENDING_REVIEW")
            users_by_id[key] = {
                "id": em,
                "accountId": f"USER_{em}",
                "fullName": u.get("full_name") or u.get("name") or em.split("@")[0],
                "name": u.get("full_name") or u.get("name") or em.split("@")[0],
                "email": u.get("email") or em,
                "phone": u.get("phone") or "",
                "address": u.get("address") or "",
                "city": u.get("city") or "",
                "pincode": u.get("pincode") or "",
                "role": role_str,
                "accountType": "Admin" if role_str in ("admin", "superadmin") else "Payrent",
                "status": status_str,
                "verified": bool(u.get("verified")),
                "avatar": u.get("avatar") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(u.get('full_name') or em)}&background=0D151D&color=fff",
                "createdAt": str(u.get("created_at") or "")
            }

    return list(users_by_id.values())



@app.get("/api/admin/users/payernt")
def admin_payernt_users_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id, p.email, p.name, p.phone, p.address, p.pincode, p.status, p.avatar, p.created_at,
                       (SELECT COUNT(*) FROM payernt_products WHERE LOWER(owner_email) = LOWER(p.email)) as product_count,
                       (SELECT available_balance FROM payernt_wallets WHERE LOWER(owner_email) = LOWER(p.email) LIMIT 1) as wallet_balance
                FROM payernt_accounts p
                ORDER BY p.created_at DESC
            """)
            rows = cursor.fetchall() or []
            return [
                {
                    "id": r["id"],
                    "email": r["email"],
                    "fullName": r.get("name") or r["email"].split("@")[0],
                    "phone": r.get("phone") or "",
                    "address": r.get("address"),
                    "pincode": r.get("pincode"),
                    "status": r.get("status") or "active",
                    "productCount": int(r.get("product_count") or 0),
                    "walletBalance": float(r.get("wallet_balance") or 0.0),
                    "avatar": r.get("avatar") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                    "createdAt": str(r.get("created_at") or "")
                }
                for r in rows
            ]
    finally:
        conn.close()

@app.get("/api/admin/users/payrent")
def admin_payrent_users_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.email, p.full_name, p.phone, p.address, p.pincode, p.status, p.avatar, p.created_at,
                       (SELECT COUNT(*) FROM orders WHERE LOWER(user_email) = LOWER(p.email)) as booking_count
                FROM payrent_accounts p
                ORDER BY p.created_at DESC
            """)
            rows = cursor.fetchall() or []
            return [
                {
                    "id": r["email"],
                    "email": r["email"],
                    "fullName": r.get("full_name") or r["email"].split("@")[0],
                    "phone": r.get("phone") or "",
                    "address": r.get("address"),
                    "pincode": r.get("pincode"),
                    "status": r.get("status") or "active",
                    "bookingCount": int(r.get("booking_count") or 0),
                    "avatar": r.get("avatar") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                    "createdAt": str(r.get("created_at") or "")
                }
                for r in rows
            ]
    finally:
        conn.close()

# Wallets & Withdrawals
@app.get("/api/admin/wallets")
def admin_wallets_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT w.*, acc.name as owner_name, acc.phone as owner_phone
                FROM payernt_wallets w
                LEFT JOIN payernt_accounts acc ON LOWER(w.owner_email) = LOWER(acc.email)
                ORDER BY w.updated_at DESC
            """)
            rows = cursor.fetchall() or []
            return [
                {
                    "id": r["id"],
                    "userEmail": r.get("owner_email") or "",
                    "ownerName": r.get("owner_name") or (r["owner_email"].split("@")[0] if r.get("owner_email") else "Vendor"),
                    "phone": r.get("owner_phone") or "",
                    "availableBalance": float(r.get("available_balance") or 0.0),
                    "pendingBalance": float(r.get("pending_amount") or 0.0),
                    "totalReceived": float(r.get("total_received") or 0.0),
                    "totalWithdrawn": float(r.get("total_withdrawn") or 0.0),
                    "currency": r.get("currency") or "INR",
                    "updatedAt": str(r.get("updated_at") or "")
                }
                for r in rows
            ]
    finally:
        conn.close()

@app.get("/api/admin/withdrawals")
def admin_withdrawals_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT tx.*, w.owner_email, acc.name as owner_name, acc.phone as owner_phone
                FROM payernt_wallet_transactions tx
                LEFT JOIN payernt_wallets w ON tx.wallet_id = w.id
                LEFT JOIN payernt_accounts acc ON (LOWER(w.owner_email) = LOWER(acc.email) OR tx.owner_id = acc.id)
                WHERE tx.type = 'WITHDRAWAL' OR LOWER(tx.description) LIKE '%withdrawal%'
                ORDER BY tx.created_at DESC
            """)
            rows = cursor.fetchall() or []
            return [
                {
                    "id": r["id"],
                    "walletId": r.get("wallet_id"),
                    "userEmail": r.get("owner_email") or "",
                    "ownerName": r.get("owner_name") or (r["owner_email"].split("@")[0] if r.get("owner_email") else "Vendor"),
                    "phone": r.get("owner_phone") or "",
                    "amount": float(r.get("amount") or 0.0),
                    "currency": "INR",
                    "status": (r.get("status") or "PENDING").upper(),
                    "description": r.get("description") or "Vendor Withdrawal Request",
                    "referenceId": r.get("reference_id"),
                    "createdAt": str(r.get("created_at") or "")
                }
                for r in rows
            ]
    finally:
        conn.close()

class RejectWithdrawalSchema(BaseModel):
    reason: Optional[str] = None

@app.patch("/api/admin/withdrawals/{tx_id}/approve")
@app.post("/api/admin/withdrawals/{tx_id}/approve")
def admin_approve_withdrawal(tx_id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT tx.*, w.owner_email 
                FROM payernt_wallet_transactions tx
                LEFT JOIN payernt_wallets w ON tx.wallet_id = w.id
                WHERE tx.id = %s
            """, (tx_id,))
            tx = cursor.fetchone()
            if not tx:
                raise HTTPException(status_code=404, detail="Withdrawal transaction not found")
                
            cursor.execute("UPDATE payernt_wallet_transactions SET status = 'COMPLETED' WHERE id = %s", (tx_id,))
            cursor.execute("""
                UPDATE payernt_wallets 
                SET pending_amount = GREATEST(0, pending_amount - %s),
                    total_withdrawn = total_withdrawn + %s
                WHERE id = %s
            """, (float(tx.get("amount") or 0.0), float(tx.get("amount") or 0.0), tx["wallet_id"]))
            
            # Create audit record
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Approved withdrawal {tx_id} (INR {tx.get('amount')}) for {tx.get('owner_email')}", "Payments", "127.0.0.1"))
    finally:
        conn.close()
        
    # Notify vendor
    user_email = tx.get("owner_email")
    if user_email:
        create_notification(
            email=user_email,
            title="Withdrawal Processed ✅",
            message=f"Your withdrawal of ₹{tx.get('amount')} has been approved and disbursed.",
            notif_type="system"
        )
    return {"success": True, "message": f"Withdrawal {tx_id} approved successfully."}

@app.patch("/api/admin/withdrawals/{tx_id}/reject")
@app.post("/api/admin/withdrawals/{tx_id}/reject")
def admin_reject_withdrawal(tx_id: str, data: Optional[RejectWithdrawalSchema] = None, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT tx.*, w.owner_email 
                FROM payernt_wallet_transactions tx
                LEFT JOIN payernt_wallets w ON tx.wallet_id = w.id
                WHERE tx.id = %s
            """, (tx_id,))
            tx = cursor.fetchone()
            if not tx:
                raise HTTPException(status_code=404, detail="Withdrawal transaction not found")
                
            # Revert pending amount to available balance in payernt_wallets
            amt = float(tx.get("amount") or 0.0)
            cursor.execute("""
                UPDATE payernt_wallets 
                SET available_balance = available_balance + %s, pending_amount = GREATEST(0, pending_amount - %s)
                WHERE id = %s
            """, (amt, amt, tx["wallet_id"]))
            
            cursor.execute("UPDATE payernt_wallet_transactions SET status = 'REJECTED' WHERE id = %s", (tx_id,))
            
            reason_txt = f" Reason: {data.reason}" if data and data.reason else ""
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Rejected withdrawal {tx_id}{reason_txt} for {tx.get('owner_email')}", "Payments", "127.0.0.1"))
    finally:
        conn.close()
        
    user_email = tx.get("owner_email")
    if user_email:
        create_notification(
            email=user_email,
            title="Withdrawal Rejected",
            message=f"Your withdrawal request of ₹{tx.get('amount')} was rejected and refunded to your wallet balance.{reason_txt}",
            notif_type="system"
        )
    return {"success": True, "message": f"Withdrawal {tx_id} rejected."}

class WalletAdjustmentSchema(BaseModel):
    user_email: str
    amount: float
    reason: str

@app.post("/api/admin/wallets/adjust")
def admin_wallet_adjustment(data: WalletAdjustmentSchema, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM payernt_wallets WHERE LOWER(owner_email) = LOWER(%s)", (data.user_email,))
            wallet = cursor.fetchone()
            if not wallet:
                raise HTTPException(status_code=404, detail="Vendor wallet not found")
                
            cursor.execute("""
                UPDATE payernt_wallets 
                SET available_balance = available_balance + %s 
                WHERE LOWER(owner_email) = LOWER(%s)
            """, (data.amount, data.user_email))
            
            tx_id = f"adj-{int(time.time()*1000)}-{secrets.token_hex(3)}"
            now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO payernt_wallet_transactions (id, wallet_id, owner_id, booking_id, type, amount, status, description, reference_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (tx_id, wallet["id"], wallet.get("owner_id") or "", "", "WALLET_ADJUSTMENT", data.amount, "COMPLETED", f"Admin adjustment: {data.reason}", f"admin-{current_admin.get('email')}", now_str))
            
            cursor.execute("""
                INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Adjusted wallet for {data.user_email} by INR {data.amount} (Reason: {data.reason})", "Payments", "127.0.0.1"))
    finally:
        conn.close()
        
    create_notification(
        email=data.user_email,
        title="Wallet Balance Adjusted",
        message=f"Your wallet was adjusted by ₹{data.amount}. Reason: {data.reason}",
        notif_type="system"
    )
    return {"success": True, "message": "Wallet adjusted successfully."}

@app.get("/api/admin/audit-logs")
def admin_audit_logs_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100")
            return cursor.fetchall() or []
    finally:
        conn.close()

@app.put("/api/admin/users/{id}")
def admin_update_user(id: str, data: UserUpdateSchema, current_admin: dict = Depends(check_admin_user)):
    user = get_user(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    fields = []
    params = []
    if data.fullName is not None:
        fields.append("full_name = %s")
        params.append(data.fullName)
    if data.phone is not None:
        fields.append("phone = %s")
        params.append(data.phone)
    if data.role is not None:
        fields.append("role = %s")
        params.append(data.role)
    if data.status is not None:
        fields.append("status = %s")
        params.append(data.status)
    if data.verified is not None:
        fields.append("verified = %s")
        params.append(1 if data.verified else 0)
        
    if fields:
        params.append(id)
        execute_query(f"UPDATE users SET {', '.join(fields)} WHERE email = %s", tuple(params))
        execute_query(f"UPDATE payernt_accounts SET {', '.join(['status = %s' if f.startswith('status') else ('phone = %s' if f.startswith('phone') else ('name = %s' if f.startswith('full_name') else '')) for f in fields if f])} WHERE email = %s", tuple([p for i, p in enumerate(params[:-1]) if fields[i].startswith(('status', 'phone', 'full_name'))] + [id]))
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Updated user {id}", "Users", "127.0.0.1"))
    
    updated = get_user(id)
    res_user = {
        "id": updated["email"],
        "fullName": updated.get("full_name") or updated.get("name") or updated["email"].split("@")[0],
        "email": updated["email"],
        "phone": updated.get("phone") or "",
        "role": updated.get("role") or "customer",
        "status": updated.get("status") or "active",
        "verified": bool(updated.get("verified", 1)),
        "avatar": updated.get("avatar") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        "createdAt": updated.get("created_at") or ""
    }
    broadcast_admin_event("user.updated", res_user)
    return res_user

@app.delete("/api/admin/users/{id}")
def admin_delete_user(id: str, current_admin: dict = Depends(check_admin_user)):
    user = get_user(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    execute_query("DELETE FROM users WHERE email = %s", (id,))
    invalidate_user_cache(id)
    MOCK_USERS.pop(id.strip().lower(), None)
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Deleted user {id}", "Users", "127.0.0.1"))
    
    broadcast_admin_event("user.deleted", {"id": id, "email": id})
    return {"success": True}

@app.post("/api/admin/users/{id}/suspend")
def admin_suspend_user(id: str, current_admin: dict = Depends(check_admin_user)):
    user = get_user(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    execute_query("UPDATE users SET status = 'suspended' WHERE email = %s", (id,))
    invalidate_user_cache(id)
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Suspended user {id}", "Users", "127.0.0.1"))
    
    # Notify user
    create_notification(
        email=id,
        title="Account Suspended ⚠️",
        message="Your account has been suspended by administration. Please contact support.",
        notif_type="system"
    )
    
    updated = get_user(id)
    res_user = {
        "id": updated["email"],
        "fullName": updated["full_name"],
        "email": updated["email"],
        "phone": updated["phone"],
        "role": updated["role"],
        "status": "suspended",
        "verified": bool(updated["verified"]),
        "avatar": updated["avatar"] or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        "createdAt": updated["created_at"]
    }
    broadcast_admin_event("user.updated", res_user)
    return res_user

@app.post("/api/admin/users/{id}/activate")
def admin_activate_user(id: str, current_admin: dict = Depends(check_admin_user)):
    user = get_user(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    execute_query("UPDATE users SET status = 'active' WHERE email = %s", (id,))
    invalidate_user_cache(id)
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Activated user {id}", "Users", "127.0.0.1"))
    
    # Notify user
    create_notification(
        email=id,
        title="Account Reactivated ✅",
        message="Your Payent account has been reactivated. You can now use all platform services.",
        notif_type="system"
    )
    
    updated = get_user(id)
    res_user = {
        "id": updated["email"],
        "fullName": updated["full_name"],
        "email": updated["email"],
        "phone": updated["phone"],
        "role": updated["role"],
        "status": "active",
        "verified": bool(updated["verified"]),
        "avatar": updated["avatar"] or updated.get("profile_photo_url") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        "createdAt": updated.get("created_at", "")
    }
    broadcast_admin_event("user.updated", res_user)
    return res_user


@app.get("/api/admin/users/{id}")
def admin_get_user_details(id: str, current_admin: dict = Depends(check_admin_user)):
    clean_raw_id = id.strip()
    clean_email = clean_raw_id.lower()
    for prefix in ["payrent_user_", "payernt_user_", "admin_user_", "payernt_", "payrent_", "admin_"]:
        if clean_email.startswith(prefix):
            clean_email = clean_email[len(prefix):]

    user = get_user(clean_email) or get_user(clean_raw_id)
    payernt_info = None
    payrent_info = None
    products_list = []
    bookings_list = []
    wallet_info = None
    p_acc = None
    r_acc = None
    
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                # 1. Payernt (Vendor) Account
                cursor.execute("""
                    SELECT id, name, email, phone, aadhaar_number, status, 
                           address, pincode, avatar, created_at
                    FROM payernt_accounts
                    WHERE LOWER(email) = LOWER(%s) OR id = %s
                """, (clean_email, clean_raw_id))
                p_acc = cursor.fetchone()
                if p_acc:
                    raw_aadh = p_acc.get("aadhaar_number") or ""
                    masked_aadh = f"XXXX-XXXX-{raw_aadh[-4:]}" if len(raw_aadh) >= 4 else (raw_aadh if raw_aadh else "Not provided")
                    
                    payernt_info = {
                        "accountId": p_acc["id"],
                        "name": p_acc.get("name") or "",
                        "email": p_acc["email"],
                        "phone": p_acc.get("phone") or "",
                        "aadhaarStatus": "VERIFIED" if raw_aadh else "PENDING",
                        "aadhaarMasked": masked_aadh,
                        "bankAccountMasked": "XXXXXX4589",
                        "bankIfsc": "HDFC0001234",
                        "accountStatus": p_acc.get("status") or "ACTIVE",
                        "verificationStatus": "VERIFIED" if (p_acc.get("status") or "").lower() == "active" or (p_acc.get("status") or "").upper() == "APPROVED" else "PENDING",
                        "isVerified": (p_acc.get("status") or "").lower() == "active" or (p_acc.get("status") or "").upper() == "APPROVED",
                        "address": p_acc.get("address") or "",
                        "pincode": p_acc.get("pincode") or "",
                        "avatar": p_acc.get("avatar") or "",
                        "createdAt": str(p_acc.get("created_at") or "")
                    }
                    
                    # Products owned
                    cursor.execute("""
                        SELECT id, title, name, category, daily_rate, status, available, primary_image, created_at
                        FROM payernt_products
                        WHERE LOWER(owner_email) = LOWER(%s)
                        ORDER BY created_at DESC
                    """, (clean_email,))
                    for prod in (cursor.fetchall() or []):
                        products_list.append({
                            "id": prod["id"],
                            "title": prod.get("title") or prod.get("name") or "Listing",
                            "category": prod.get("category") or "General",
                            "price": float(prod.get("daily_rate") or 0.0),
                            "status": prod.get("status") or "pending",
                            "available": bool(prod.get("available", 1)),
                            "image": prod.get("primary_image") or "",
                            "createdAt": str(prod.get("created_at") or "")
                        })
                        
                    # Wallet
                    cursor.execute("""
                        SELECT id, available_balance, pending_amount, total_received, total_withdrawn, currency
                        FROM payernt_wallets
                        WHERE LOWER(owner_email) = LOWER(%s)
                    """, (clean_email,))
                    w = cursor.fetchone()
                    if w:
                        wallet_info = {
                            "walletId": w["id"],
                            "availableBalance": float(w.get("available_balance") or 0.0),
                            "pendingAmount": float(w.get("pending_amount") or 0.0),
                            "totalReceived": float(w.get("total_received") or 0.0),
                            "totalWithdrawn": float(w.get("total_withdrawn") or 0.0),
                            "currency": w.get("currency") or "INR"
                        }

                # 2. Payrent (Renter/Customer) Account
                cursor.execute("""
                    SELECT email, phone, full_name, pan_number, 
                           status, verified, 
                           address, pincode, avatar, created_at
                    FROM payrent_accounts
                    WHERE LOWER(email) = LOWER(%s)
                """, (clean_email,))
                r_acc = cursor.fetchone()
                if not r_acc:
                    # Also check users table if not in payrent_accounts
                    cursor.execute("""
                        SELECT email, phone, full_name, pan_number, 
                               status, verified, 
                               address, pincode, avatar, created_at
                        FROM users
                        WHERE LOWER(email) = LOWER(%s)
                    """, (clean_email,))
                    r_acc = cursor.fetchone()
                if r_acc:
                    raw_pan = r_acc.get("pan_number") or ""
                    masked_pan = f"XXXXXX{raw_pan[-4:]}" if len(raw_pan) >= 4 else (raw_pan if raw_pan else "Not provided")
                    
                    payrent_info = {
                        "accountId": f"PAYRENT_USER_{r_acc['email']}",
                        "fullName": r_acc.get("full_name") or "",
                        "email": r_acc["email"],
                        "phone": r_acc.get("phone") or "",
                        "panStatus": "VERIFIED" if raw_pan else "PENDING",
                        "panMasked": masked_pan,
                        "accountStatus": r_acc.get("status") or "ACTIVE",
                        "verificationStatus": "VERIFIED" if r_acc.get("verified") or (r_acc.get("status") or "").upper() == "APPROVED" else "PENDING",
                        "isVerified": bool(r_acc.get("verified")) or (r_acc.get("status") or "").upper() == "APPROVED",
                        "address": r_acc.get("address") or "",
                        "pincode": r_acc.get("pincode") or "",
                        "avatar": r_acc.get("avatar") or "",
                        "createdAt": str(r_acc.get("created_at") or "")
                    }
                    
                    # Bookings made by renter
                    cursor.execute("""
                        SELECT o.id, o.product_id, o.start_date, o.end_date, o.total, o.status, o.created_at,
                               COALESCE(p.title, p.name, cp.title, o.product_id) as product_title
                        FROM orders o
                        LEFT JOIN payernt_products p ON o.product_id = p.id
                        LEFT JOIN custom_products cp ON o.product_id = cp.id
                        WHERE LOWER(o.user_email) = LOWER(%s)
                        ORDER BY o.created_at DESC
                    """, (clean_email,))
                    for b in (cursor.fetchall() or []):
                        bookings_list.append({
                            "id": b["id"],
                            "productId": b.get("product_id") or "",
                            "productTitle": b.get("product_title") or "Gear Rental",
                            "startDate": str(b.get("start_date") or ""),
                            "endDate": str(b.get("end_date") or ""),
                            "amount": float(b.get("total") or 0.0),
                            "status": b.get("status") or "pending",
                            "createdAt": str(b.get("created_at") or "")
                        })
        except Exception as e:
            logger.warning(f"[admin_get_user_details] DB inspection error: {e}")
        finally:
            conn.close()

    if not user:
        if p_acc:
            user = {
                "id": p_acc["email"],
                "email": p_acc["email"],
                "full_name": p_acc.get("name") or p_acc["email"].split("@")[0],
                "phone": p_acc.get("phone") or "",
                "role": "lender",
                "status": p_acc.get("status") or "PENDING_REVIEW",
                "verified": (p_acc.get("status") or "").upper() in ("APPROVED", "ACTIVE"),
                "address": p_acc.get("address") or "",
                "city": "",
                "pincode": p_acc.get("pincode") or "",
                "aadhaar_number": p_acc.get("aadhaar_number"),
                "avatar": p_acc.get("avatar"),
                "created_at": str(p_acc.get("created_at") or "")
            }
        elif r_acc:
            user = {
                "id": r_acc["email"],
                "email": r_acc["email"],
                "full_name": r_acc.get("full_name") or r_acc["email"].split("@")[0],
                "phone": r_acc.get("phone") or "",
                "role": "customer",
                "status": r_acc.get("status") or "PENDING_REVIEW",
                "verified": bool(r_acc.get("verified")) or (r_acc.get("status") or "").upper() in ("APPROVED", "ACTIVE"),
                "address": r_acc.get("address") or "",
                "city": "",
                "pincode": r_acc.get("pincode") or "",
                "pan_number": r_acc.get("pan_number"),
                "avatar": r_acc.get("avatar"),
                "created_at": str(r_acc.get("created_at") or "")
            }
        elif clean_email in MOCK_USERS:
            user = MOCK_USERS[clean_email]
        else:
            raise HTTPException(status_code=404, detail="User not found")

    raw_aadh_user = user.get("aadhaar_number") or ""
    masked_aadh_user = f"XXXX-XXXX-{raw_aadh_user[-4:]}" if len(raw_aadh_user) >= 4 else (raw_aadh_user if raw_aadh_user else "Not provided")
    raw_pan_user = user.get("pan_number") or ""
    masked_pan_user = f"XXXXX{raw_pan_user[-5:]}" if len(raw_pan_user) == 10 else (raw_pan_user if raw_pan_user else "Not provided")
    
    return {
        "id": user.get("email", clean_email),
        "accountId": user.get("accountId") or f"USER_{clean_email}",
        "fullName": user.get("full_name") or user.get("name") or clean_email.split("@")[0],
        "email": user.get("email", clean_email),
        "phone": user.get("phone") or "",
        "role": user.get("role", "user"),
        "status": user.get("status", "pending"),
        "verified": bool(user.get("verified")),
        "address": user.get("address") or "",
        "city": user.get("city") or "",
        "state": user.get("state") or "",
        "pincode": user.get("pincode") or "",
        "country": user.get("country", "India"),
        "occupation": user.get("occupation") or "",
        "bio": user.get("bio") or "",
        "website": user.get("website") or "",
        "upiId": user.get("upiId") or "",
        "avatar": user.get("avatar") or user.get("profile_photo_url") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(user.get('full_name') or clean_email)}&background=0D151D&color=fff",
        "profilePhotoUrl": user.get("profile_photo_url") or user.get("avatar"),
        "aadhaarNumber": raw_aadh_user or None,
        "aadhaarMasked": masked_aadh_user,
        "panNumber": raw_pan_user or None,
        "panMasked": masked_pan_user,
        "createdAt": str(user.get("created_at") or ""),
        "payerntAccount": payernt_info,
        "payrentAccount": payrent_info,
        "products": products_list,
        "bookings": bookings_list,
        "wallet": wallet_info
    }

@app.patch("/api/admin/users/{id}/approve")
@app.post("/api/admin/users/{id}/approve")
@app.put("/api/admin/users/{id}/approve")
def admin_approve_user(id: str, type: Optional[str] = Query(None), current_admin: dict = Depends(check_admin_user)):
    clean_raw_id = id.strip()
    clean_id = clean_raw_id.lower()
    clean_email = clean_id
    for prefix in ["payrent_user_", "payernt_user_", "admin_user_", "payernt_", "payrent_", "admin_"]:
        if clean_email.startswith(prefix):
            clean_email = clean_email[len(prefix):]

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    admin_identifier = current_admin.get("email") or current_admin.get("full_name") or "Admin"
    
    req_type = (type or "").strip().lower()
    is_payernt_target = req_type in ("payernt", "lender", "vendor") or clean_id.startswith("payernt") or clean_id.startswith("lender")
    is_payrent_target = req_type in ("payrent", "customer", "renter", "user") or clean_id.startswith("payrent")

    # If neither explicitly targeted by ID prefix or param, inspect if an accountId exists in tables
    if not is_payernt_target and not is_payrent_target:
        p_match = execute_query("SELECT id FROM payernt_accounts WHERE id = %s", (clean_raw_id,))
        if p_match:
            is_payernt_target = True
        else:
            r_match = execute_query("SELECT email FROM payrent_accounts WHERE LOWER(email) = %s", (clean_email,))
            if r_match:
                is_payrent_target = True

    if is_payernt_target:
        execute_query("""
            UPDATE payernt_accounts
            SET status = 'APPROVED', reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
            WHERE LOWER(email) = %s OR id = %s OR id = %s
        """, (admin_identifier, now_str, now_str, clean_email, clean_raw_id, clean_id))
        try:
            from payernt_database import MOCK_PAYERNT_ACCOUNTS
            if clean_email in MOCK_PAYERNT_ACCOUNTS:
                MOCK_PAYERNT_ACCOUNTS[clean_email]["status"] = "APPROVED"
                MOCK_PAYERNT_ACCOUNTS[clean_email]["account_status"] = "ACTIVE"
                MOCK_PAYERNT_ACCOUNTS[clean_email]["verification_status"] = "VERIFIED"
                MOCK_PAYERNT_ACCOUNTS[clean_email]["verified"] = True
        except Exception:
            pass
    elif is_payrent_target:
        execute_query("""
            UPDATE payrent_accounts
            SET status = 'APPROVED', verified = 1, reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
            WHERE LOWER(email) = %s
        """, (admin_identifier, now_str, now_str, clean_email))
        execute_query("""
            UPDATE users
            SET status = 'APPROVED', verified = 1, reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
            WHERE LOWER(email) = %s
        """, (admin_identifier, now_str, now_str, clean_email))
        if clean_email in MOCK_USERS:
            MOCK_USERS[clean_email]["status"] = "APPROVED"
            MOCK_USERS[clean_email]["verified"] = True
    else:
        # Check which account is pending review for this email
        p_pending = execute_query("SELECT id FROM payernt_accounts WHERE LOWER(email) = %s AND UPPER(status) = 'PENDING_REVIEW'", (clean_email,))
        r_pending = execute_query("SELECT email FROM payrent_accounts WHERE LOWER(email) = %s AND UPPER(status) = 'PENDING_REVIEW'", (clean_email,))
        if not r_pending:
            r_pending = execute_query("SELECT email FROM users WHERE LOWER(email) = %s AND UPPER(status) = 'PENDING_REVIEW'", (clean_email,))
        
        if p_pending and not r_pending:
            execute_query("""
                UPDATE payernt_accounts
                SET status = 'APPROVED', reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
                WHERE LOWER(email) = %s OR id = %s
            """, (admin_identifier, now_str, now_str, clean_email, clean_raw_id))
        elif r_pending and not p_pending:
            execute_query("""
                UPDATE payrent_accounts
                SET status = 'APPROVED', verified = 1, reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
                WHERE LOWER(email) = %s
            """, (admin_identifier, now_str, now_str, clean_email))
            execute_query("""
                UPDATE users
                SET status = 'APPROVED', verified = 1, reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
                WHERE LOWER(email) = %s
            """, (admin_identifier, now_str, now_str, clean_email))
        else:
            execute_query("""
                UPDATE payernt_accounts
                SET status = 'APPROVED', reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
                WHERE LOWER(email) = %s OR id = %s
            """, (admin_identifier, now_str, now_str, clean_email, clean_raw_id))
            execute_query("""
                UPDATE payrent_accounts
                SET status = 'APPROVED', verified = 1, reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
                WHERE LOWER(email) = %s
            """, (admin_identifier, now_str, now_str, clean_email))
            execute_query("""
                UPDATE users
                SET status = 'APPROVED', verified = 1, reviewed_by = %s, reviewed_at = %s, rejection_reason = NULL, updated_at = %s
                WHERE LOWER(email) = %s
            """, (admin_identifier, now_str, now_str, clean_email))
            if clean_email in MOCK_USERS:
                MOCK_USERS[clean_email]["status"] = "APPROVED"
                MOCK_USERS[clean_email]["verified"] = True

    invalidate_user_cache(clean_email)
    
    # Audit log
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name", "Admin"), f"Approved user account {clean_email} (Type: {req_type or 'All'})", "Users", "127.0.0.1"))
    
    # Dispatch notification to the approved user
    create_notification(
        email=clean_email,
        title="Account Approved! 🎉",
        message="Your account has been reviewed and approved by our Admin team. You can now log in and access your workspace.",
        notif_type="system"
    )
    
    updated = get_user(clean_email) or {}
    res_user = {
        "id": updated.get("email", clean_email),
        "fullName": updated.get("full_name") or updated.get("name") or clean_email.split("@")[0],
        "email": updated.get("email", clean_email),
        "phone": updated.get("phone", ""),
        "role": updated.get("role", "customer" if is_payrent_target else "lender"),
        "status": "APPROVED",
        "verified": True,
        "reviewedBy": admin_identifier,
        "reviewedAt": now_str,
        "avatar": updated.get("avatar") or updated.get("profile_photo_url") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(updated.get('full_name') or clean_email)}&background=0D151D&color=fff",
        "profilePhotoUrl": updated.get("profile_photo_url") or updated.get("avatar"),
        "createdAt": str(updated.get("created_at", ""))
    }
    broadcast_admin_event("user.updated", res_user)
    return {
        "success": True,
        "message": f"User {clean_email} approved successfully.",
        "user": res_user
    }


class RejectUserSchema(BaseModel):
    reason: Optional[str] = None
    accountType: Optional[str] = None
    account_type: Optional[str] = None


@app.patch("/api/admin/users/{id}/reject")
@app.post("/api/admin/users/{id}/reject")
@app.put("/api/admin/users/{id}/reject")
def admin_reject_user(id: str, data: Optional[RejectUserSchema] = None, type: Optional[str] = Query(None), current_admin: dict = Depends(check_admin_user)):
    clean_raw_id = id.strip()
    clean_id = clean_raw_id.lower()
    clean_email = clean_id
    for prefix in ["payrent_user_", "payernt_user_", "admin_user_", "payernt_", "payrent_", "admin_"]:
        if clean_email.startswith(prefix):
            clean_email = clean_email[len(prefix):]

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    admin_identifier = current_admin.get("email") or current_admin.get("full_name") or "Admin"
    rejection_reason = (data.reason.strip() if data and data.reason else "Your submitted information could not be verified.")

    req_type = (type or (data.accountType if data else None) or (data.account_type if data else None) or "").strip().lower()
    is_payernt_target = req_type in ("payernt", "lender", "vendor") or clean_id.startswith("payernt") or clean_id.startswith("lender")
    is_payrent_target = req_type in ("payrent", "customer", "renter", "user") or clean_id.startswith("payrent")

    if not is_payernt_target and not is_payrent_target:
        p_match = execute_query("SELECT id FROM payernt_accounts WHERE id = %s", (clean_raw_id,))
        if p_match:
            is_payernt_target = True
        else:
            r_match = execute_query("SELECT email FROM payrent_accounts WHERE LOWER(email) = %s", (clean_email,))
            if r_match:
                is_payrent_target = True

    if is_payernt_target:
        execute_query("""
            UPDATE payernt_accounts
            SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
            WHERE LOWER(email) = %s OR id = %s OR id = %s
        """, (rejection_reason, admin_identifier, now_str, now_str, clean_email, clean_raw_id, clean_id))
        try:
            from payernt_database import MOCK_PAYERNT_ACCOUNTS
            if clean_email in MOCK_PAYERNT_ACCOUNTS:
                MOCK_PAYERNT_ACCOUNTS[clean_email]["status"] = "REJECTED"
                MOCK_PAYERNT_ACCOUNTS[clean_email]["rejection_reason"] = rejection_reason
        except Exception:
            pass
    elif is_payrent_target:
        execute_query("""
            UPDATE payrent_accounts
            SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
            WHERE LOWER(email) = %s
        """, (rejection_reason, admin_identifier, now_str, now_str, clean_email))
        execute_query("""
            UPDATE users
            SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
            WHERE LOWER(email) = %s
        """, (rejection_reason, admin_identifier, now_str, now_str, clean_email))
        if clean_email in MOCK_USERS:
            MOCK_USERS[clean_email]["status"] = "REJECTED"
            MOCK_USERS[clean_email]["rejection_reason"] = rejection_reason
    else:
        # Check which account is pending review for this email
        p_pending = execute_query("SELECT id FROM payernt_accounts WHERE LOWER(email) = %s AND UPPER(status) = 'PENDING_REVIEW'", (clean_email,))
        r_pending = execute_query("SELECT email FROM payrent_accounts WHERE LOWER(email) = %s AND UPPER(status) = 'PENDING_REVIEW'", (clean_email,))
        if not r_pending:
            r_pending = execute_query("SELECT email FROM users WHERE LOWER(email) = %s AND UPPER(status) = 'PENDING_REVIEW'", (clean_email,))
        
        if p_pending and not r_pending:
            execute_query("""
                UPDATE payernt_accounts
                SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
                WHERE LOWER(email) = %s OR id = %s
            """, (rejection_reason, admin_identifier, now_str, now_str, clean_email, clean_raw_id))
        elif r_pending and not p_pending:
            execute_query("""
                UPDATE payrent_accounts
                SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
                WHERE LOWER(email) = %s
            """, (rejection_reason, admin_identifier, now_str, now_str, clean_email))
            execute_query("""
                UPDATE users
                SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
                WHERE LOWER(email) = %s
            """, (rejection_reason, admin_identifier, now_str, now_str, clean_email))
        else:
            execute_query("""
                UPDATE payernt_accounts
                SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
                WHERE LOWER(email) = %s OR id = %s
            """, (rejection_reason, admin_identifier, now_str, now_str, clean_email, clean_raw_id))
            execute_query("""
                UPDATE payrent_accounts
                SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
                WHERE LOWER(email) = %s
            """, (rejection_reason, admin_identifier, now_str, now_str, clean_email))
            execute_query("""
                UPDATE users
                SET status = 'REJECTED', rejection_reason = %s, reviewed_by = %s, reviewed_at = %s, updated_at = %s
                WHERE LOWER(email) = %s
            """, (rejection_reason, admin_identifier, now_str, now_str, clean_email))

    invalidate_user_cache(clean_email)
    
    # Audit log
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name", "Admin"), f"Rejected user account {clean_email} (Reason: {rejection_reason})", "Users", "127.0.0.1"))
    
    # Dispatch notification to user
    create_notification(
        email=clean_email,
        title="Account Review Update",
        message=f"Your account application was not approved: {rejection_reason}. Please update your details to resubmit.",
        notif_type="system"
    )
    
    updated = get_user(clean_email) or {}
    res_user = {
        "id": updated.get("email", clean_email),
        "fullName": updated.get("full_name") or updated.get("name") or clean_email.split("@")[0],
        "email": updated.get("email", clean_email),
        "phone": updated.get("phone", ""),
        "role": updated.get("role", "customer" if is_payrent_target else "lender"),
        "status": "REJECTED",
        "rejectionReason": rejection_reason,
        "reviewedBy": admin_identifier,
        "reviewedAt": now_str,
        "verified": False,
        "avatar": updated.get("avatar") or updated.get("profile_photo_url") or f"https://ui-avatars.com/api/?name={urllib.parse.quote(updated.get('full_name') or clean_email)}&background=0D151D&color=fff",
        "profilePhotoUrl": updated.get("profile_photo_url") or updated.get("avatar"),
        "createdAt": str(updated.get("created_at", ""))
    }
    broadcast_admin_event("user.updated", res_user)
    return {
        "success": True,
        "message": f"User {clean_email} rejected successfully.",
        "user": res_user
    }


class ResubmitAccountSchema(BaseModel):
    email: EmailStr
    fullName: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    phoneNumber: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    aadhaar_number: Optional[str] = None
    panNumber: Optional[str] = None
    pan_number: Optional[str] = None
    accountType: Optional[str] = None


@app.post("/api/auth/resubmit")
@app.post("/api/resubmit")
def resubmit_account(data: ResubmitAccountSchema):
    """Resubmits updated details for a rejected account and changes status back to PENDING_REVIEW."""
    clean_email = data.email.lower().strip()
    target_type = (data.accountType or "").lower().strip()

    name = data.fullName or data.name
    phone = data.phoneNumber or data.phone
    aadhaar = data.aadhaarNumber or data.aadhaar_number
    pan = data.panNumber or data.pan_number

    is_payernt = "payernt" in target_type or "vendor" in target_type or "lender" in target_type
    is_payrent = "payrent" in target_type or "customer" in target_type or "renter" in target_type

    updated_any = False

    if is_payernt or not is_payrent:
        from payernt_database import resubmit_payernt_account, get_payernt_account_by_email
        p_acc = get_payernt_account_by_email(clean_email)
        if p_acc:
            resubmit_payernt_account(
                email=clean_email,
                name=name,
                phone=phone,
                address=data.address,
                pincode=data.pincode,
                aadhaar_number=aadhaar
            )
            updated_any = True

    if is_payrent or not updated_any:
        resubmit_payrent_account(
            email=clean_email,
            full_name=name,
            phone=phone,
            address=data.address,
            city=data.city,
            pincode=data.pincode,
            pan_number=pan,
            aadhaar_number=aadhaar
        )
        updated_any = True

    broadcast_admin_event("user.updated", {"email": clean_email, "status": "PENDING_REVIEW"})

    return {
        "success": True,
        "status": "PENDING_REVIEW",
        "accountType": "Payernt" if is_payernt else "Payrent",
        "message": "Your details have been updated and resubmitted for Admin review. Our team will review your submitted information shortly."
    }




# Agents
@app.get("/api/admin/agents")
def admin_agents_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.id AS agent_id, a.user_email, a.status AS agent_status, a.created_at AS agent_created_at,
                       u.full_name, u.avatar, u.status AS user_status
                FROM agents a
                JOIN users u ON a.user_email = u.email
                ORDER BY a.created_at DESC
            """)
            agents_rows = cursor.fetchall() or []

            cursor.execute("""
                SELECT user_email, COUNT(*) as p_count
                FROM custom_products
                WHERE user_email IS NOT NULL AND user_email != ''
                GROUP BY user_email
            """)
            p_counts = {r["user_email"].lower(): r["p_count"] for r in (cursor.fetchall() or [])}

            cursor.execute("""
                SELECT p.user_email, COUNT(o.id) as b_count, IFNULL(SUM(o.total), 0) as revenue
                FROM orders o
                JOIN custom_products p ON o.product_id = p.id
                GROUP BY p.user_email
            """)
            o_stats = {r["user_email"].lower(): {"count": r["b_count"], "revenue": float(r["revenue"])} for r in (cursor.fetchall() or [])}

            cursor.execute("""
                SELECT p.user_email, IFNULL(AVG(r.rating), 4.8) as avg_rating
                FROM reviews r
                JOIN custom_products p ON r.product_id = p.id
                GROUP BY p.user_email
            """)
            r_stats = {r["user_email"].lower(): float(r["avg_rating"] or 4.8) for r in (cursor.fetchall() or [])}

            result = []
            for a in agents_rows:
                email_key = a["user_email"].lower()
                prod_count = p_counts.get(email_key, 0)
                order_info = o_stats.get(email_key, {"count": 0, "revenue": 0.0})
                rating_val = r_stats.get(email_key, 4.8)
                status_val = a["agent_status"] or a["user_status"] or "active"

                result.append({
                    "id": a["user_email"],
                    "agentId": a["agent_id"],
                    "fullName": a["full_name"] or email_key.split("@")[0],
                    "email": a["user_email"],
                    "avatar": a["avatar"] or "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
                    "productsCount": prod_count,
                    "bookingsCount": order_info["count"],
                    "revenue": order_info["revenue"],
                    "rating": round(rating_val, 1),
                    "status": status_val,
                    "createdAt": a["agent_created_at"]
                })
            return result
    finally:
        try:
            conn.close()
        except Exception:
            pass

@app.post("/api/admin/agents/{id}/suspend")
def admin_suspend_agent(id: str, current_admin: dict = Depends(check_admin_user)):
    clean_email = id.strip().lower()
    user = get_user(clean_email)
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    execute_query("UPDATE users SET status = 'suspended' WHERE LOWER(email) = LOWER(%s)", (clean_email,))
    execute_query("UPDATE agents SET status = 'suspended', updated_at = %s WHERE LOWER(user_email) = LOWER(%s)", (datetime.datetime.now(datetime.timezone.utc).isoformat(), clean_email))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Suspended agent {clean_email}", "Agents", "127.0.0.1"))
    
    conn = get_db_connection()
    p_count = 0
    o_data = {"count": 0, "revenue": 0.0}
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) as count FROM custom_products WHERE LOWER(user_email) = LOWER(%s)", (clean_email,))
                row = cursor.fetchone()
                if row: p_count = row["count"]

                cursor.execute("""
                    SELECT COUNT(*) as count, IFNULL(SUM(total), 0) as revenue
                    FROM orders o
                    JOIN custom_products p ON (o.product_id = p.id OR o.product_id = p.title)
                    WHERE LOWER(p.user_email) = LOWER(%s)
                """, (clean_email,))
                fetched_o = cursor.fetchone()
                if fetched_o: o_data = fetched_o
        finally:
            conn.close()
        
    return {
        "id": user["email"],
        "fullName": user["full_name"],
        "email": user["email"],
        "avatar": user["avatar"] or "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        "productsCount": p_count,
        "bookingsCount": o_data["count"],
        "revenue": float(o_data["revenue"]),
        "rating": 4.8,
        "status": "suspended",
        "createdAt": user["created_at"]
    }

@app.delete("/api/admin/agents/{id}")
def admin_delete_agent(id: str, current_admin: dict = Depends(check_admin_user)):
    clean_email = id.strip().lower()
    user = get_user(clean_email)
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    execute_query("DELETE FROM agents WHERE LOWER(user_email) = LOWER(%s)", (clean_email,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Deleted agent profile for {clean_email}", "Agents", "127.0.0.1"))
    
    return {"success": True}

# Helper function for unifying products across payernt_products and custom_products
def _safe_json_parse(val, fallback):
    if not val:
        return fallback
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return fallback

# Products
class SetProductPriceRangeSchema(BaseModel):
    minPrice: float
    maxPrice: float
    priceUnit: Optional[str] = "PER DAY"
    notes: Optional[str] = None

class ApproveProductSchema(BaseModel):
    minPrice: Optional[float] = None
    maxPrice: Optional[float] = None
    priceUnit: Optional[str] = None

class RequestProductRevisionSchema(BaseModel):
    reason: str
    requiredChanges: Optional[str] = None

@app.get("/api/admin/products")
def admin_products_list(
    status: Optional[str] = None,
    current_admin: dict = Depends(check_admin_user)
):
    conn = get_db_connection()
    if not conn:
        return []
    
    clean_st = status.strip().lower() if status else None
    products_by_id = {}
    
    try:
        with conn.cursor() as cursor:
            # 1. Query payernt_products (vendor products)
            cursor.execute("""
                SELECT p.id, p.owner_id, p.owner_email, p.owner_name, p.category, p.name, p.title,
                       p.brand, p.model, p.year, p.description, p.condition_grade, p.city, p.area, p.pincode,
                       p.daily_rate, p.weekly_rate, p.monthly_rate, p.security_deposit, p.available,
                       p.availability_status, p.primary_image, p.images, p.status, p.created_at,
                       p.min_price, p.max_price, p.price_unit, p.price_status, p.price_approved_at, p.price_approved_by,
                       p.video_url,
                       acc.phone AS owner_phone, acc.avatar AS owner_avatar
                FROM payernt_products p
                LEFT JOIN payernt_accounts acc ON LOWER(p.owner_email) = LOWER(acc.email)
                ORDER BY p.created_at DESC
            """)
            payernt_rows = cursor.fetchall() or []
            for r in payernt_rows:
                p_id = r["id"]
                st = (r.get("status") or "approved").lower()
                if clean_st and clean_st != "all":
                    if clean_st in ("pending", "under_review", "pending_admin_review") and st not in ("pending", "under_review", "pending_admin_review"):
                        continue
                    elif clean_st not in ("pending", "under_review", "pending_admin_review") and st != clean_st:
                        continue
                
                images_list = _safe_json_parse(r.get("images"), [r["primary_image"]] if r.get("primary_image") else [])
                
                approved_price_range = None
                min_p = r.get("min_price")
                max_p = r.get("max_price")
                if min_p is not None and max_p is not None:
                    approved_price_range = {
                        "minPrice": float(min_p),
                        "maxPrice": float(max_p),
                        "priceUnit": r.get("price_unit") or "PER DAY",
                        "priceStatus": r.get("price_status") or "SET",
                        "priceApprovedAt": r.get("price_approved_at"),
                        "priceApprovedBy": r.get("price_approved_by")
                    }

                products_by_id[p_id] = {
                    "id": p_id,
                    "title": r.get("title") or r.get("name") or "Equipment Listing",
                    "description": r.get("description") or "",
                    "category": r.get("category") or "General",
                    "brand": r.get("brand") or "Standard",
                    "model": r.get("model") or "",
                    "price": float(r.get("daily_rate") or 0.0),
                    "rating": 5.0,
                    "reviewsCount": 0,
                    "available": bool(r.get("available", 1) and r.get("availability_status") != "paused" and st == "approved"),
                    "status": st,
                    "featured": False,
                    "hidden": r.get("availability_status") == "paused",
                    "image": r.get("primary_image") or (images_list[0] if images_list else ""),
                    "images": images_list,
                    "videoUrl": r.get("video_url") or "",
                    "documents": ["purchase_proof.jpg"],
                    "approvedPriceRange": approved_price_range,
                    "priceStatus": r.get("price_status") or ("SET" if approved_price_range else "NOT_SET"),
                    "createdAt": str(r.get("created_at") or ""),
                    "owner": {
                        "id": r.get("owner_id") or r.get("owner_email") or "",
                        "name": r.get("owner_name") or (r["owner_email"].split("@")[0] if r.get("owner_email") else "Vendor"),
                        "avatar": r.get("owner_avatar") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                        "rating": 5.0,
                        "email": r.get("owner_email") or "",
                        "phone": r.get("owner_phone") or "",
                        "city": r.get("city") or ""
                    }
                }

            # 2. Query custom_products (catalog table)
            cursor.execute("""
                SELECT cp.*,
                       u.full_name AS user_full_name,
                       u.avatar AS user_avatar,
                       u.phone AS user_phone,
                       u.city AS user_city,
                       u.status AS user_status
                FROM custom_products cp
                LEFT JOIN users u ON LOWER(cp.user_email) = LOWER(u.email)
                ORDER BY cp.created_at DESC
            """)
            custom_rows = cursor.fetchall() or []
            for r in custom_rows:
                p_id = r["id"]
                if p_id in products_by_id:
                    continue  # already populated with rich payernt data
                
                st = (r.get("status") or "approved").lower()
                if clean_st and clean_st != "all":
                    if clean_st in ("pending", "under_review", "pending_admin_review") and st not in ("pending", "under_review", "pending_admin_review"):
                        continue
                    elif clean_st not in ("pending", "under_review", "pending_admin_review") and st != clean_st:
                        continue
                
                images_list = _safe_json_parse(r.get("images"), [r["image"]] if r.get("image") else [])
                docs_list = _safe_json_parse(r.get("documents"), ["purchase_receipt.jpg"])
                
                approved_price_range = None
                min_p = r.get("min_price")
                max_p = r.get("max_price")
                if min_p is not None and max_p is not None:
                    approved_price_range = {
                        "minPrice": float(min_p),
                        "maxPrice": float(max_p),
                        "priceUnit": r.get("price_unit") or "PER DAY",
                        "priceStatus": r.get("price_status") or "SET",
                        "priceApprovedAt": r.get("price_approved_at"),
                        "priceApprovedBy": r.get("price_approved_by")
                    }

                products_by_id[p_id] = {
                    "id": p_id,
                    "title": r.get("title") or "Product",
                    "description": r.get("description") or "",
                    "category": r.get("category") or "General",
                    "brand": "Standard",
                    "model": "",
                    "price": float(r.get("price") or 0.0),
                    "rating": float(r.get("rating") or 5.0),
                    "reviewsCount": int(r.get("reviews") or 0),
                    "available": bool(r.get("available", True)),
                    "status": st,
                    "featured": bool(r.get("featured", False)),
                    "hidden": bool(r.get("hidden", False)),
                    "image": r.get("image") or "",
                    "images": images_list,
                    "documents": docs_list,
                    "approvedPriceRange": approved_price_range,
                    "priceStatus": r.get("price_status") or ("SET" if approved_price_range else "NOT_SET"),
                    "createdAt": str(r.get("created_at") or ""),
                    "owner": {
                        "id": r.get("user_email") or "",
                        "name": r.get("user_full_name") or r.get("owner_name") or (r["user_email"].split("@")[0] if r.get("user_email") else "Owner"),
                        "avatar": r.get("user_avatar") or r.get("owner_avatar") or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                        "rating": float(r.get("owner_rating") or 5.0),
                        "email": r.get("user_email") or "",
                        "phone": r.get("user_phone") or "",
                        "city": r.get("user_city") or ""
                    }
                }
    except Exception as e:
        logger.warning(f"[admin_products_list] error: {e}")
    finally:
        if conn:
            conn.close()
        
    return list(products_by_id.values())

@app.get("/api/admin/products/{id}")
def admin_get_product(id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    res_product = None
    try:
        with conn.cursor() as cursor:
            # 1. Check payernt_products
            cursor.execute("""
                SELECT p.id, p.owner_id, p.owner_email, p.owner_name, p.category, p.name, p.title,
                       p.brand, p.model, p.year, p.description, p.specifications, p.features,
                       p.condition_grade, p.condition_details, p.accessories,
                       p.city, p.area, p.pincode, p.pickup_instructions,
                       p.daily_rate, p.weekly_rate, p.monthly_rate, p.security_deposit,
                       p.min_rental_days, p.max_rental_days,
                       p.available, p.availability_status, p.primary_image, p.images, p.status, p.created_at, p.updated_at,
                       p.min_price, p.max_price, p.price_unit, p.price_status, p.price_approved_at, p.price_approved_by,
                       p.price_history, p.video_url, p.revision_notes,
                       acc.phone AS owner_phone, acc.avatar AS owner_avatar, acc.address AS owner_address,
                       p.city AS owner_city, acc.pincode AS owner_pincode, acc.status AS owner_account_status,
                       acc.created_at AS owner_created_at
                FROM payernt_products p
                LEFT JOIN payernt_accounts acc ON LOWER(p.owner_email) = LOWER(acc.email)
                WHERE p.id = %s
            """, (id,))
            r = cursor.fetchone()
            if r:
                images_list = _safe_json_parse(r.get("images"), [r["primary_image"]] if r.get("primary_image") else [])
                specs_dict = _safe_json_parse(r.get("specifications"), {})
                features_list = _safe_json_parse(r.get("features"), [])
                condition_details = _safe_json_parse(r.get("condition_details"), {})
                price_history = _safe_json_parse(r.get("price_history"), [])
                st = (r.get("status") or "approved").lower()
                
                # Fetch count of products by this owner
                owner_email = r.get("owner_email") or ""
                owner_prod_count = 0
                if owner_email:
                    cursor.execute("SELECT COUNT(*) as cnt FROM payernt_products WHERE LOWER(owner_email) = LOWER(%s)", (owner_email,))
                    cnt_row = cursor.fetchone()
                    if cnt_row:
                        owner_prod_count = int(cnt_row.get("cnt") or 0)

                # Fetch bookings for this product
                cursor.execute("""
                    SELECT id, start_date, end_date, total, status, user_email, created_at
                    FROM orders
                    WHERE product_id = %s
                    ORDER BY created_at DESC
                """, (id,))
                prod_bookings = []
                for b in (cursor.fetchall() or []):
                    prod_bookings.append({
                        "id": b["id"],
                        "startDate": str(b.get("start_date") or ""),
                        "endDate": str(b.get("end_date") or ""),
                        "amount": float(b.get("total") or 0.0),
                        "status": b.get("status") or "pending",
                        "customerEmail": b.get("user_email") or "",
                        "customerName": b.get("user_email", "").split("@")[0],
                        "createdAt": str(b.get("created_at") or "")
                    })

                approved_price_range = None
                min_p = r.get("min_price")
                max_p = r.get("max_price")
                if min_p is not None and max_p is not None:
                    approved_price_range = {
                        "minPrice": float(min_p),
                        "maxPrice": float(max_p),
                        "priceUnit": r.get("price_unit") or "PER DAY",
                        "priceStatus": r.get("price_status") or "SET",
                        "priceApprovedAt": r.get("price_approved_at"),
                        "priceApprovedBy": r.get("price_approved_by")
                    }

                res_product = {
                    "id": r["id"],
                    "title": r.get("title") or r.get("name") or "Equipment Listing",
                    "category": r.get("category") or "General",
                    "brand": r.get("brand") or "Standard",
                    "model": r.get("model") or "",
                    "year": r.get("year") or "",
                    "description": r.get("description") or "",
                    "specifications": specs_dict,
                    "features": features_list,
                    "conditionGrade": r.get("condition_grade") or "Good",
                    "conditionDetails": condition_details,
                    "accessories": r.get("accessories") or "Standard accessories included",
                    "city": r.get("city") or "",
                    "area": r.get("area") or "",
                    "pincode": r.get("pincode") or "",
                    "pickupInstructions": r.get("pickup_instructions") or "Standard handover verification required at pickup location.",
                    "price": float(r.get("daily_rate") or 0.0),
                    "dailyRate": float(r.get("daily_rate") or 0.0),
                    "weeklyRate": float(r.get("weekly_rate") or 0.0) if r.get("weekly_rate") else None,
                    "monthlyRate": float(r.get("monthly_rate") or 0.0) if r.get("monthly_rate") else None,
                    "securityDeposit": float(r.get("security_deposit") or 0.0) if r.get("security_deposit") else 0.0,
                    "minRentalDays": int(r.get("min_rental_days") or 1),
                    "maxRentalDays": int(r.get("max_rental_days") or 30),
                    "rating": 5.0,
                    "reviewsCount": 0,
                    "available": bool(r.get("available", 1) and r.get("availability_status") != "paused" and st == "approved"),
                    "status": st,
                    "featured": False,
                    "hidden": r.get("availability_status") == "paused",
                    "image": r.get("primary_image") or (images_list[0] if images_list else ""),
                    "images": images_list,
                    "videoUrl": r.get("video_url") or "",
                    "documents": ["purchase_proof.jpg", "ownership_verification.pdf"],
                    "approvedPriceRange": approved_price_range,
                    "priceStatus": r.get("price_status") or ("SET" if approved_price_range else "NOT_SET"),
                    "priceHistory": price_history,
                    "revisionNotes": _safe_json_parse(r.get("revision_notes"), {}),
                    "createdAt": str(r.get("created_at") or ""),
                    "updatedAt": str(r.get("updated_at") or ""),
                    "bookings": prod_bookings,
                    "owner": {
                        "id": r.get("owner_id") or owner_email,
                        "name": r.get("owner_name") or (owner_email.split("@")[0] if owner_email else "Vendor"),
                        "avatar": r.get("owner_avatar") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                        "rating": 5.0,
                        "email": owner_email,
                        "phone": r.get("owner_phone") or "",
                        "address": r.get("owner_address") or "",
                        "city": r.get("owner_city") or r.get("city") or "",
                        "pincode": r.get("owner_pincode") or r.get("pincode") or "",
                        "accountStatus": r.get("owner_account_status") or "ACTIVE",
                        "verificationStatus": "VERIFIED" if r.get("owner_is_verified") else "PENDING",
                        "isVerified": bool(r.get("owner_is_verified", 1)),
                        "productsCount": owner_prod_count,
                        "createdAt": str(r.get("owner_created_at") or "")
                    }
                }
            else:
                # 2. Check custom_products
                cursor.execute("""
                    SELECT cp.*,
                           u.full_name AS user_full_name,
                           u.avatar AS user_avatar,
                           u.phone AS user_phone,
                           u.city AS user_city,
                           u.address AS user_address,
                           u.pincode AS user_pincode,
                           u.status AS user_status,
                           u.verified AS user_verified,
                           u.created_at AS user_created_at
                    FROM custom_products cp
                    LEFT JOIN users u ON LOWER(cp.user_email) = LOWER(u.email)
                    WHERE cp.id = %s
                """, (id,))
                cp = cursor.fetchone()
                if cp:
                    images_list = _safe_json_parse(cp.get("images"), [cp["image"]] if cp.get("image") else [])
                    docs_list = _safe_json_parse(cp.get("documents"), ["purchase_receipt.jpg"])
                    price_history = _safe_json_parse(cp.get("price_history"), [])
                    
                    user_email = cp.get("user_email") or ""
                    cursor.execute("""
                        SELECT id, start_date, end_date, total, status, user_email, created_at
                        FROM orders
                        WHERE product_id = %s
                        ORDER BY created_at DESC
                    """, (id,))
                    prod_bookings = []
                    for b in (cursor.fetchall() or []):
                        prod_bookings.append({
                            "id": b["id"],
                            "startDate": str(b.get("start_date") or ""),
                            "endDate": str(b.get("end_date") or ""),
                            "amount": float(b.get("total") or 0.0),
                            "status": b.get("status") or "pending",
                            "customerEmail": b.get("user_email") or "",
                            "customerName": b.get("user_email", "").split("@")[0],
                            "createdAt": str(b.get("created_at") or "")
                        })

                    approved_price_range = None
                    min_p = cp.get("min_price")
                    max_p = cp.get("max_price")
                    if min_p is not None and max_p is not None:
                        approved_price_range = {
                            "minPrice": float(min_p),
                            "maxPrice": float(max_p),
                            "priceUnit": cp.get("price_unit") or "PER DAY",
                            "priceStatus": cp.get("price_status") or "SET",
                            "priceApprovedAt": cp.get("price_approved_at"),
                            "priceApprovedBy": cp.get("price_approved_by")
                        }

                    res_product = {
                        "id": cp["id"],
                        "title": cp.get("title") or "Product",
                        "category": cp.get("category") or "General",
                        "brand": "Standard",
                        "model": "",
                        "year": "",
                        "description": cp.get("description") or "",
                        "specifications": {},
                        "features": [],
                        "conditionGrade": "Excellent",
                        "conditionDetails": {},
                        "accessories": "Standard accessories included",
                        "city": cp.get("user_city") or "",
                        "area": "",
                        "pincode": cp.get("user_pincode") or "",
                        "pickupInstructions": "Standard handover verification required.",
                        "price": float(cp.get("price") or 0.0),
                        "dailyRate": float(cp.get("price") or 0.0),
                        "weeklyRate": None,
                        "monthlyRate": None,
                        "securityDeposit": 0.0,
                        "minRentalDays": 1,
                        "maxRentalDays": 30,
                        "rating": float(cp.get("rating") or 5.0),
                        "reviewsCount": int(cp.get("reviews") or 0),
                        "available": bool(cp.get("available", True)),
                        "status": (cp.get("status") or "approved").lower(),
                        "featured": bool(cp.get("featured", False)),
                        "hidden": bool(cp.get("hidden", False)),
                        "image": cp.get("image") or "",
                        "images": images_list,
                        "videoUrl": cp.get("video_url") or "",
                        "documents": docs_list,
                        "approvedPriceRange": approved_price_range,
                        "priceStatus": cp.get("price_status") or ("SET" if approved_price_range else "NOT_SET"),
                        "priceHistory": price_history,
                        "revisionNotes": _safe_json_parse(cp.get("revision_notes"), {}),
                        "createdAt": str(cp.get("created_at") or ""),
                        "updatedAt": str(cp.get("created_at") or ""),
                        "bookings": prod_bookings,
                        "owner": {
                            "id": user_email,
                            "name": cp.get("user_full_name") or cp.get("owner_name") or (user_email.split("@")[0] if user_email else "Owner"),
                            "avatar": cp.get("user_avatar") or cp.get("owner_avatar") or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                            "rating": float(cp.get("owner_rating") or 5.0),
                            "email": user_email,
                            "phone": cp.get("user_phone") or "",
                            "address": cp.get("user_address") or "",
                            "city": cp.get("user_city") or "",
                            "pincode": cp.get("user_pincode") or "",
                            "accountStatus": cp.get("user_status") or "active",
                            "verificationStatus": "VERIFIED" if cp.get("user_verified") else "PENDING",
                            "isVerified": bool(cp.get("user_verified", 1)),
                            "productsCount": 1,
                            "createdAt": str(cp.get("user_created_at") or "")
                        }
                    }
    finally:
        conn.close()
        
    if not res_product:
        try:
            from payernt_database import MOCK_PAYERNT_PRODUCTS
            if id in MOCK_PAYERNT_PRODUCTS:
                p = MOCK_PAYERNT_PRODUCTS[id]
                st = (p.get("status") or "under_review").lower()
                specs_val = p.get("specifications")
                specs_parsed = {}
                if isinstance(specs_val, dict):
                    specs_parsed = specs_val
                elif isinstance(specs_val, str) and specs_val.startswith("{"):
                    try:
                        specs_parsed = json.loads(specs_val)
                    except Exception:
                        specs_parsed = {"notes": specs_val}
                else:
                    specs_parsed = {"brand": p.get("brand"), "model": p.get("model")}

                imgs_val = p.get("images") or "[]"
                images_list = json.loads(imgs_val) if isinstance(imgs_val, str) and imgs_val.startswith("[") else (imgs_val if isinstance(imgs_val, list) else [])
                cond_val = p.get("condition_details") or "{}"
                cond_parsed = json.loads(cond_val) if isinstance(cond_val, str) and cond_val.startswith("{") else (cond_val if isinstance(cond_val, dict) else {})
                feat_val = p.get("features") or "[]"
                feat_list = json.loads(feat_val) if isinstance(feat_val, str) and feat_val.startswith("[") else (feat_val if isinstance(feat_val, list) else [])

                res_product = {
                    "id": p["id"],
                    "title": p.get("title") or p.get("name") or "Equipment Listing",
                    "category": p.get("category") or "General",
                    "brand": p.get("brand") or "Standard",
                    "model": p.get("model") or "",
                    "year": p.get("year") or "",
                    "description": p.get("description") or "",
                    "specifications": specs_parsed,
                    "features": feat_list,
                    "conditionGrade": p.get("condition_grade") or "Like New",
                    "conditionDetails": cond_parsed,
                    "accessories": p.get("accessories") or "",
                    "city": p.get("city") or "",
                    "area": p.get("area") or "",
                    "pincode": p.get("pincode") or "",
                    "pickupInstructions": p.get("pickup_instructions") or "Standard pickup instructions.",
                    "price": float(p.get("daily_rate") or p.get("price") or 0.0),
                    "dailyRate": float(p.get("daily_rate") or p.get("price") or 0.0),
                    "weeklyRate": float(p.get("weekly_rate") or 0.0) if p.get("weekly_rate") else None,
                    "monthlyRate": float(p.get("monthly_rate") or 0.0) if p.get("monthly_rate") else None,
                    "securityDeposit": 0.0,
                    "minRentalDays": int(p.get("min_rental_days") or 1),
                    "maxRentalDays": int(p.get("max_rental_days") or 30),
                    "rating": 5.0,
                    "reviewsCount": 0,
                    "available": bool(st == "approved"),
                    "status": st,
                    "featured": False,
                    "hidden": p.get("availability_status") == "paused",
                    "image": p.get("primary_image") or (images_list[0] if images_list else ""),
                    "images": images_list,
                    "videoUrl": p.get("video_url") or "",
                    "documents": ["purchase_proof.jpg"],
                    "approvedPriceRange": None,
                    "priceStatus": "NOT_SET",
                    "priceHistory": [],
                    "revisionNotes": {},
                    "createdAt": str(p.get("created_at") or ""),
                    "updatedAt": str(p.get("updated_at") or ""),
                    "bookings": [],
                    "owner": {
                        "id": p.get("owner_id") or p.get("owner_email") or "",
                        "name": p.get("owner_name") or "Vendor",
                        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                        "rating": 5.0,
                        "email": p.get("owner_email") or "",
                        "phone": "",
                        "address": "",
                        "city": p.get("city") or "",
                        "pincode": p.get("pincode") or "",
                        "accountStatus": "ACTIVE",
                        "verificationStatus": "VERIFIED",
                        "isVerified": True,
                        "productsCount": 1,
                        "createdAt": str(p.get("created_at") or "")
                    }
                }
        except Exception:
            pass

    if not res_product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    return res_product

@app.put("/api/admin/products/{id}")
def admin_update_product(id: str, data: ProductUpdateSchema, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    fields_cp, params_cp = [], []
    fields_pp, params_pp = [], []
    
    if data.title is not None:
        fields_cp.append("title = %s"); params_cp.append(data.title)
        fields_pp.append("title = %s"); params_pp.append(data.title)
        fields_pp.append("name = %s"); params_pp.append(data.title)
    if data.description is not None:
        fields_cp.append("description = %s"); params_cp.append(data.description)
        fields_pp.append("description = %s"); params_pp.append(data.description)
    if data.category is not None:
        fields_cp.append("category = %s"); params_cp.append(data.category)
        fields_pp.append("category = %s"); params_pp.append(data.category)
    if data.price is not None:
        fields_cp.append("price = %s"); params_cp.append(data.price)
        fields_pp.append("daily_rate = %s"); params_pp.append(data.price)
    if data.available is not None:
        val = 1 if data.available else 0
        fields_cp.append("available = %s"); params_cp.append(val)
        fields_pp.append("available = %s"); params_pp.append(val)
    if data.status is not None:
        fields_cp.append("status = %s"); params_cp.append(data.status)
        fields_pp.append("status = %s"); params_pp.append(data.status)
    if data.featured is not None:
        fields_cp.append("featured = %s"); params_cp.append(1 if data.featured else 0)
    if data.hidden is not None:
        fields_cp.append("hidden = %s"); params_cp.append(1 if data.hidden else 0)
        fields_pp.append("availability_status = %s"); params_pp.append("paused" if data.hidden else "available")
    if data.image is not None:
        fields_cp.append("image = %s"); params_cp.append(data.image)
        fields_pp.append("primary_image = %s"); params_pp.append(data.image)
    if data.images is not None:
        js = json.dumps(data.images)
        fields_cp.append("images = %s"); params_cp.append(js)
        fields_pp.append("images = %s"); params_pp.append(js)
    if data.documents is not None:
        fields_cp.append("documents = %s"); params_cp.append(json.dumps(data.documents))
        
    if fields_cp:
        params_cp.append(id)
        execute_query(f"UPDATE custom_products SET {', '.join(fields_cp)} WHERE id = %s", tuple(params_cp))
    if fields_pp:
        params_pp.append(id)
        execute_query(f"UPDATE payernt_products SET {', '.join(fields_pp)} WHERE id = %s", tuple(params_pp))
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Updated product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    return admin_get_product(id, current_admin)

@app.delete("/api/admin/products/{id}")
def admin_delete_product(id: str, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    execute_query("DELETE FROM custom_products WHERE id = %s", (id,))
    execute_query("DELETE FROM payernt_products WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Deleted product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    broadcast_admin_event("product.deleted", {"id": id})
    return {"success": True}

@app.post("/api/admin/products/{id}/price-range")
@app.patch("/api/admin/products/{id}/price-range")
@app.put("/api/admin/products/{id}/price-range")
def admin_set_product_price_range(id: str, data: SetProductPriceRangeSchema, current_admin: dict = Depends(check_admin_user)):
    if data.minPrice <= 0:
        raise HTTPException(status_code=400, detail="Minimum price must be greater than zero.")
    if data.maxPrice < data.minPrice:
        raise HTTPException(status_code=400, detail="Maximum price must be greater than or equal to minimum price.")
    
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    admin_name = current_admin.get("full_name") or current_admin.get("email") or "Admin"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    prev_range = existing.get("approvedPriceRange") or {}
    prev_min = prev_range.get("minPrice")
    prev_max = prev_range.get("maxPrice")
    prev_unit = prev_range.get("priceUnit") or "PER DAY"
    
    history_list = existing.get("priceHistory") or []
    if prev_min is not None and prev_max is not None:
        history_list.append({
            "previousMin": prev_min,
            "previousMax": prev_max,
            "previousUnit": prev_unit,
            "newMin": data.minPrice,
            "newMax": data.maxPrice,
            "newUnit": data.priceUnit or "PER DAY",
            "admin": admin_name,
            "date": now_str
        })
        
    history_json = json.dumps(history_list)
    unit_str = data.priceUnit or "PER DAY"
    
    execute_query("""
        UPDATE payernt_products
        SET min_price = %s, max_price = %s, price_unit = %s, price_status = 'SET',
            price_approved_at = %s, price_approved_by = %s, price_history = %s,
            daily_rate = %s
        WHERE id = %s
    """, (data.minPrice, data.maxPrice, unit_str, now_str, admin_name, history_json, data.minPrice, id))
    
    execute_query("""
        UPDATE custom_products
        SET min_price = %s, max_price = %s, price_unit = %s, price_status = 'SET',
            price_approved_at = %s, price_approved_by = %s, price_history = %s,
            price = %s
        WHERE id = %s
    """, (data.minPrice, data.maxPrice, unit_str, now_str, admin_name, history_json, data.minPrice, id))
    
    # Audit log
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, admin_name, f"Set approved rental price range ₹{data.minPrice:.0f} - ₹{data.maxPrice:.0f} / {unit_str} for product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

@app.patch("/api/admin/products/{id}/approve")
@app.post("/api/admin/products/{id}/approve")
@app.put("/api/admin/products/{id}/approve")
def admin_approve_product(id: str, data: Optional[ApproveProductSchema] = None, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    admin_name = current_admin.get("full_name") or current_admin.get("email") or "Admin"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Handle price range passed with approval
    if data and data.minPrice is not None and data.maxPrice is not None:
        if data.minPrice <= 0:
            raise HTTPException(status_code=400, detail="Minimum price must be greater than zero.")
        if data.maxPrice < data.minPrice:
            raise HTTPException(status_code=400, detail="Maximum price must be greater than or equal to minimum price.")
        unit_str = data.priceUnit or "PER DAY"
        execute_query("""
            UPDATE payernt_products
            SET min_price = %s, max_price = %s, price_unit = %s, price_status = 'SET',
                price_approved_at = %s, price_approved_by = %s, daily_rate = %s
            WHERE id = %s
        """, (data.minPrice, data.maxPrice, unit_str, now_str, admin_name, data.minPrice, id))
        execute_query("""
            UPDATE custom_products
            SET min_price = %s, max_price = %s, price_unit = %s, price_status = 'SET',
                price_approved_at = %s, price_approved_by = %s, price = %s
            WHERE id = %s
        """, (data.minPrice, data.maxPrice, unit_str, now_str, admin_name, data.minPrice, id))
    else:
        # Check that product has a valid price range or fallback to daily_rate if set
        existing_range = existing.get("approvedPriceRange")
        if not existing_range:
            cur_price = existing.get("price") or existing.get("dailyRate") or 0.0
            if cur_price > 0:
                min_auto = float(cur_price) * 0.9
                max_auto = float(cur_price) * 1.2
                execute_query("""
                    UPDATE payernt_products
                    SET min_price = %s, max_price = %s, price_unit = 'PER DAY', price_status = 'SET',
                        price_approved_at = %s, price_approved_by = %s
                    WHERE id = %s
                """, (min_auto, max_auto, now_str, admin_name, id))
                execute_query("""
                    UPDATE custom_products
                    SET min_price = %s, max_price = %s, price_unit = 'PER DAY', price_status = 'SET',
                        price_approved_at = %s, price_approved_by = %s
                    WHERE id = %s
                """, (min_auto, max_auto, now_str, admin_name, id))
            else:
                raise HTTPException(status_code=400, detail="PRICE REQUIRED: Please enter and save a valid rental price range before approving this product.")
        
    execute_query("UPDATE payernt_products SET status = 'approved', availability_status = 'available', available = 1 WHERE id = %s", (id,))
    execute_query("UPDATE custom_products SET status = 'approved', available = 1 WHERE id = %s", (id,))
    if id in MOCK_CUSTOM_PRODUCTS:
        MOCK_CUSTOM_PRODUCTS[id]["status"] = "approved"
        MOCK_CUSTOM_PRODUCTS[id]["available"] = True
    try:
        from payernt_database import MOCK_PAYERNT_PRODUCTS
        if id in MOCK_PAYERNT_PRODUCTS:
            MOCK_PAYERNT_PRODUCTS[id]["status"] = "approved"
            MOCK_PAYERNT_PRODUCTS[id]["available"] = True
            MOCK_PAYERNT_PRODUCTS[id]["availability_status"] = "available"
    except Exception:
        pass
    
    # If product exists in payernt_products but not yet in custom_products, mirror it for customer discoverability
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM payernt_products WHERE id = %s", (id,))
                p_row = cursor.fetchone()
                if p_row:
                    cursor.execute("SELECT id FROM custom_products WHERE id = %s", (id,))
                    if not cursor.fetchone():
                        cursor.execute("""
                            INSERT INTO custom_products (id, user_email, title, description, price, image, category, rating, reviews, available, owner_name, owner_avatar, owner_rating, created_at, status, featured, hidden, images, documents, min_price, max_price, price_unit, price_status, price_approved_at, price_approved_by)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            p_row["id"],
                            p_row["owner_email"],
                            p_row.get("title") or p_row.get("name"),
                            p_row.get("description") or "",
                            float(p_row.get("daily_rate") or 0.0),
                            p_row.get("primary_image") or "",
                            p_row.get("category") or "General",
                            5.0,
                            0,
                            1,
                            p_row.get("owner_name") or "Vendor",
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                            5.0,
                            p_row.get("created_at") or now_str,
                            "approved",
                            0,
                            0,
                            p_row.get("images") or "[]",
                            "[\"purchase_proof.jpg\"]",
                            p_row.get("min_price"),
                            p_row.get("max_price"),
                            p_row.get("price_unit") or "PER DAY",
                            p_row.get("price_status") or "SET",
                            p_row.get("price_approved_at"),
                            p_row.get("price_approved_by")
                        ))
        finally:
            conn.close()
            
    # Send notifications to owner
    owner_email = existing.get("owner", {}).get("email") or ""
    if owner_email:
        create_notification(
            email=owner_email,
            title="Product Approved! 🎉",
            message=f"Your listing '{existing.get('title')}' has been approved by admin with the approved rental price range.",
            notif_type="system"
        )
    
    # Audit log
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, admin_name, f"Approved product {id} ({existing.get('title')})", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

@app.post("/api/admin/products/{id}/request-revision")
@app.patch("/api/admin/products/{id}/request-revision")
@app.put("/api/admin/products/{id}/request-revision")
def admin_request_product_revision(id: str, data: RequestProductRevisionSchema, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    admin_name = current_admin.get("full_name") or current_admin.get("email") or "Admin"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    revision_payload = {
        "reason": data.reason,
        "requiredChanges": data.requiredChanges or "",
        "requestedAt": now_str,
        "admin": admin_name
    }
    rev_json = json.dumps(revision_payload)
    
    execute_query("UPDATE payernt_products SET status = 'revision_required', availability_status = 'paused', available = 0, revision_notes = %s WHERE id = %s", (rev_json, id))
    execute_query("UPDATE custom_products SET status = 'revision_required', available = 0, revision_notes = %s WHERE id = %s", (rev_json, id))
    if id in MOCK_CUSTOM_PRODUCTS:
        MOCK_CUSTOM_PRODUCTS[id]["status"] = "revision_required"
        MOCK_CUSTOM_PRODUCTS[id]["available"] = False
    try:
        from payernt_database import MOCK_PAYERNT_PRODUCTS
        if id in MOCK_PAYERNT_PRODUCTS:
            MOCK_PAYERNT_PRODUCTS[id]["status"] = "revision_required"
            MOCK_PAYERNT_PRODUCTS[id]["available"] = False
            MOCK_PAYERNT_PRODUCTS[id]["availability_status"] = "paused"
    except Exception:
        pass
        
    owner_email = existing.get("owner", {}).get("email") or ""
    if owner_email:
        req_msg = f" Reason: {data.reason}."
        if data.requiredChanges:
            req_msg += f" Required Changes: {data.requiredChanges}"
        create_notification(
            email=owner_email,
            title="Revision Requested for Product 📝",
            message=f"Admin has requested revisions for your listing '{existing.get('title')}'.{req_msg}",
            notif_type="system"
        )
        
    # Audit log
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, admin_name, f"Requested revision for product {id}: {data.reason}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

class RejectProductSchema(BaseModel):
    reason: Optional[str] = None

@app.patch("/api/admin/products/{id}/reject")
@app.post("/api/admin/products/{id}/reject")
@app.put("/api/admin/products/{id}/reject")
def admin_reject_product(id: str, data: Optional[RejectProductSchema] = None, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    execute_query("UPDATE payernt_products SET status = 'rejected', availability_status = 'paused', available = 0 WHERE id = %s", (id,))
    execute_query("UPDATE custom_products SET status = 'rejected', available = 0 WHERE id = %s", (id,))
    if id in MOCK_CUSTOM_PRODUCTS:
        MOCK_CUSTOM_PRODUCTS[id]["status"] = "rejected"
        MOCK_CUSTOM_PRODUCTS[id]["available"] = False
    try:
        from payernt_database import MOCK_PAYERNT_PRODUCTS
        if id in MOCK_PAYERNT_PRODUCTS:
            MOCK_PAYERNT_PRODUCTS[id]["status"] = "rejected"
            MOCK_PAYERNT_PRODUCTS[id]["available"] = False
            MOCK_PAYERNT_PRODUCTS[id]["availability_status"] = "paused"
    except Exception:
        pass
    
    reason_txt = f" Reason: {data.reason}" if data and data.reason else ""
    owner_email = existing.get("owner", {}).get("email") or ""
    if owner_email:
        create_notification(
            email=owner_email,
            title="Product Verification Update",
            message=f"Your listing '{existing.get('title')}' was not approved.{reason_txt}",
            notif_type="system"
        )
    
    # Audit log
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Rejected product {id}{reason_txt}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

@app.patch("/api/admin/products/{id}/suspend")
@app.post("/api/admin/products/{id}/suspend")
@app.put("/api/admin/products/{id}/suspend")
def admin_suspend_product(id: str, data: Optional[RejectProductSchema] = None, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    execute_query("UPDATE payernt_products SET status = 'suspended', availability_status = 'paused', available = 0 WHERE id = %s", (id,))
    execute_query("UPDATE custom_products SET status = 'suspended', available = 0 WHERE id = %s", (id,))
    if id in MOCK_CUSTOM_PRODUCTS:
        MOCK_CUSTOM_PRODUCTS[id]["status"] = "suspended"
        MOCK_CUSTOM_PRODUCTS[id]["available"] = False
    
    reason_txt = f" Reason: {data.reason}" if data and data.reason else ""
    owner_email = existing.get("owner", {}).get("email") or ""
    if owner_email:
        create_notification(
            email=owner_email,
            title="Listing Suspended ⚠️",
            message=f"Your listing '{existing.get('title')}' has been suspended by administration.{reason_txt}",
            notif_type="system"
        )
        
    # Audit log
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Suspended product {id}{reason_txt}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

@app.patch("/api/admin/products/{id}/restore")
@app.post("/api/admin/products/{id}/restore")
@app.put("/api/admin/products/{id}/restore")
def admin_restore_product(id: str, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    execute_query("UPDATE payernt_products SET status = 'approved', availability_status = 'available', available = 1 WHERE id = %s", (id,))
    execute_query("UPDATE custom_products SET status = 'approved', available = 1 WHERE id = %s", (id,))
    if id in MOCK_CUSTOM_PRODUCTS:
        MOCK_CUSTOM_PRODUCTS[id]["status"] = "approved"
        MOCK_CUSTOM_PRODUCTS[id]["available"] = True
    
    owner_email = existing.get("owner", {}).get("email") or ""
    if owner_email:
        create_notification(
            email=owner_email,
            title="Listing Restored ✅",
            message=f"Your listing '{existing.get('title')}' has been restored and is available for bookings.",
            notif_type="system"
        )
        
    # Audit log
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Restored product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

@app.patch("/api/admin/products/{id}/archive")
@app.post("/api/admin/products/{id}/archive")
@app.put("/api/admin/products/{id}/archive")
def admin_archive_product(id: str, current_admin: dict = Depends(check_admin_user)):
    existing = admin_get_product(id, current_admin)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
        
    execute_query("UPDATE payernt_products SET status = 'archived', availability_status = 'archived', available = 0 WHERE id = %s", (id,))
    execute_query("UPDATE custom_products SET status = 'archived', available = 0 WHERE id = %s", (id,))
    
    # Audit log
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"Archived product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    res_prod = admin_get_product(id, current_admin)
    broadcast_admin_event("product.updated", res_prod)
    return res_prod

@app.post("/api/admin/products/{id}/toggle-feature")
def admin_toggle_feature_product(id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT featured FROM custom_products WHERE id = %s", (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    if not r:
        raise HTTPException(status_code=404, detail="Product not found")
        
    new_val = 0 if r["featured"] else 1
    execute_query("UPDATE custom_products SET featured = %s WHERE id = %s", (new_val, id))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    action_str = "Featured" if new_val else "Unfeatured"
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"{action_str} product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    return admin_get_product(id, current_admin)

@app.post("/api/admin/products/{id}/toggle-hide")
def admin_toggle_hide_product(id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT hidden FROM custom_products WHERE id = %s", (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    if not r:
        raise HTTPException(status_code=404, detail="Product not found")
        
    new_val = 0 if r["hidden"] else 1
    execute_query("UPDATE custom_products SET hidden = %s WHERE id = %s", (new_val, id))
    execute_query("UPDATE payernt_products SET availability_status = %s WHERE id = %s", ("paused" if new_val else "available", id))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    action_str = "Hid" if new_val else "Unhid"
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin.get("full_name") or "Admin", f"{action_str} product {id}", "Inventory", "127.0.0.1"))
    
    invalidate_cache("public_custom_products")
    invalidate_cache("public_categories")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{id}")
    return admin_get_product(id, current_admin)

# Categories
@app.get("/api/admin/categories")
def admin_categories_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM categories ORDER BY name ASC")
            rows = cursor.fetchall() or []
            
            cursor.execute("SELECT category, COUNT(*) as count FROM custom_products WHERE category IS NOT NULL GROUP BY category")
            cat_counts = {r["category"]: r["count"] for r in (cursor.fetchall() or [])}
            
            res = []
            for r in rows:
                p_count = cat_counts.get(r["name"], 0)
                res.append({
                    "id": r["id"],
                    "name": r["name"],
                    "icon": r["icon"] or "Laptop",
                    "count": p_count,
                    "color": r["color"] or "bg-gray-500/10 text-gray-500",
                    "enabled": bool(r.get("enabled", 1))
                })
            return res
    finally:
        try:
            conn.close()
        except Exception:
            pass

@app.post("/api/admin/categories", status_code=201)
def admin_create_category(data: CategorySchema, current_admin: dict = Depends(check_admin_user)):
    cat_id = f"cat-{random.randint(100000, 999999)}"
    execute_query("""
        INSERT INTO categories (id, name, icon, color, enabled)
        VALUES (%s, %s, %s, %s, %s)
    """, (cat_id, data.name, data.icon or "Laptop", data.color or "bg-gray-500/10 text-gray-500", 1 if data.enabled else 0))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Created category {data.name}", "Inventory", "127.0.0.1"))
    
    res_cat = {
        "id": cat_id,
        "name": data.name,
        "icon": data.icon or "Laptop",
        "count": 0,
        "color": data.color or "bg-gray-500/10 text-gray-500",
        "enabled": data.enabled
    }
    broadcast_admin_event("category.created", res_cat)
    return res_cat

@app.put("/api/admin/categories/{id}")
def admin_update_category(id: str, data: CategorySchema, current_admin: dict = Depends(check_admin_user)):
    fields = []
    params = []
    if data.name is not None:
        fields.append("name = %s")
        params.append(data.name)
    if data.icon is not None:
        fields.append("icon = %s")
        params.append(data.icon)
    if data.color is not None:
        fields.append("color = %s")
        params.append(data.color)
    if data.enabled is not None:
        fields.append("enabled = %s")
        params.append(1 if data.enabled else 0)
        
    if fields:
        params.append(id)
        execute_query(f"UPDATE categories SET {', '.join(fields)} WHERE id = %s", tuple(params))
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Updated category {id}", "Inventory", "127.0.0.1"))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM categories WHERE id = %s", (id,))
            r = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) as count FROM custom_products WHERE category = %s", (r["name"],))
            p_count = cursor.fetchone()["count"]
    finally:
        conn.close()
        
    return {
        "id": r["id"],
        "name": r["name"],
        "icon": r["icon"],
        "count": p_count,
        "color": r["color"],
        "enabled": bool(r["enabled"])
    }

@app.delete("/api/admin/categories/{id}")
def admin_delete_category(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("DELETE FROM categories WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Deleted category {id}", "Inventory", "127.0.0.1"))
    
    broadcast_admin_event("category.deleted", {"id": id})
    return {"success": True}

# Bookings
@app.get("/api/admin/bookings")
def admin_bookings_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT o.*, 
                       u.full_name as customer_name, 
                       COALESCE(p.owner_name, pp.owner_name) as owner_name, 
                       COALESCE(p.user_email, pp.owner_email) as owner_email,
                       d.status as delivery_status,
                       d.delivery_boy_id,
                       d.delivery_boy_name,
                       d.delivery_boy_phone,
                       d.pickup_location,
                       d.delivery_address,
                       d.picked_up_at,
                       d.arrived_at_renter_at,
                       d.completed_at as delivered_at,
                       sec.vendor_pin_verified,
                       sec.renter_pin_verified,
                       sec.otp_verified,
                       sec.rental_started,
                       sec.status as security_status,
                       sec.activated_at,
                       sec.vendor_otp_verified as sec_vendor_otp_verified,
                       sec.renter_otp_verified as sec_renter_otp_verified
                FROM orders o
                LEFT JOIN users u ON o.user_email = u.email
                LEFT JOIN custom_products p ON o.product_id = p.id
                LEFT JOIN payernt_products pp ON o.product_id = pp.id
                LEFT JOIN deliveries d ON o.id = d.booking_id
                LEFT JOIN rental_security sec ON o.id = sec.booking_id
                ORDER BY o.created_at DESC
            """)
            rows = cursor.fetchall() or []
    finally:
        conn.close()
        
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "productId": r["product_id"],
            "productTitle": r["product_title"],
            "productImage": r["product_image"],
            "customerId": r["user_email"],
            "customerName": r.get("customer_name") or (r["user_email"].split("@")[0] if r.get("user_email") else "Customer"),
            "ownerId": r.get("owner_email") or "",
            "ownerName": r.get("owner_name") or "Verified Lender",
            "startDate": r["start_date"],
            "endDate": r["end_date"],
            "amount": r["total"],
            "status": r.get("status") or "pending",
            "deliveryStatus": r.get("delivery_status") or "WAITING_FOR_ADMIN",
            "deliveryBoyId": r.get("delivery_boy_id"),
            "deliveryBoyName": r.get("delivery_boy_name"),
            "deliveryBoyPhone": r.get("delivery_boy_phone"),
            "pickupLocation": r.get("pickup_location"),
            "deliveryAddress": r.get("delivery_address"),
            "pickedUpAt": r.get("picked_up_at"),
            "arrivedAtRenterAt": r.get("arrived_at_renter_at"),
            "deliveredAt": r.get("delivered_at"),
            "rentalSecurity": {
                "vendorPinVerified": bool(r.get("vendor_pin_verified")),
                "renterPinVerified": bool(r.get("renter_pin_verified")),
                "otpVerified": bool(r.get("otp_verified")),
                "rentalStarted": bool(r.get("rental_started")),
                "securityStatus": r.get("security_status") or "pending",
                "activatedAt": r.get("activated_at"),
                "vendorOtpVerified": bool(r.get("sec_vendor_otp_verified")),
                "renterOtpVerified": bool(r.get("sec_renter_otp_verified"))
            },
            "createdAt": r["created_at"]
        })
    return res

class AdminAssignDeliveryPayload(BaseModel):
    deliveryBoyId: Optional[str] = None
    deliveryBoyName: Optional[str] = None
    deliveryBoyPhone: Optional[str] = None

@app.post("/api/admin/bookings/{id}/process")
def admin_process_booking(id: str, current_admin: dict = Depends(check_admin_user)):
    from database import update_delivery_status
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    # Transition delivery status to ADMIN_PROCESSING
    update_delivery_status(id, "ADMIN_PROCESSING")
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Processed booking {id}", "Orders", "127.0.0.1"))
    broadcast_admin_event("booking.processed", {"bookingId": id, "deliveryStatus": "ADMIN_PROCESSING"})
    return {"success": True, "bookingId": id, "deliveryStatus": "ADMIN_PROCESSING"}

@app.post("/api/admin/bookings/{id}/notify-vendor")
def admin_notify_vendor(id: str, current_admin: dict = Depends(check_admin_user)):
    from database import update_delivery_status
    from payernt_database import add_payernt_notification
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Update delivery status to READY_FOR_VENDOR
    update_delivery_status(id, "READY_FOR_VENDOR")
    
    # Get vendor/owner id
    conn = get_db_connection()
    vendor_id = ""
    title = ""
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT o.product_id, o.product_title, COALESCE(p.user_email, pp.owner_email, pp.owner_id) as owner_id
                FROM orders o
                LEFT JOIN custom_products p ON o.product_id = p.id
                LEFT JOIN payernt_products pp ON o.product_id = pp.id
                WHERE o.id = %s
            """, (id,))
            row = cursor.fetchone()
            if row:
                vendor_id = row.get("owner_id") or ""
                title = row.get("product_title") or "Product"
    finally:
        conn.close()
        
    if vendor_id:
        add_payernt_notification(
            owner_id=vendor_id,
            title="Product Ready for Preparation",
            message=f"Booking #{id} for '{title}' has been processed by Admin and is ready for delivery preparation. Please prepare the product.",
            type_="booking",
            action_route="products"
        )
        
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Notified vendor for booking {id}", "Orders", "127.0.0.1"))
    broadcast_admin_event("booking.vendor_notified", {"bookingId": id, "deliveryStatus": "READY_FOR_VENDOR"})
    return {"success": True, "bookingId": id, "deliveryStatus": "READY_FOR_VENDOR", "vendorNotified": bool(vendor_id)}

@app.post("/api/admin/bookings/{id}/assign-delivery")
def admin_assign_delivery(id: str, payload: AdminAssignDeliveryPayload, current_admin: dict = Depends(check_admin_user)):
    from database import execute_query
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    execute_query("""
        UPDATE deliveries 
        SET delivery_boy_id = %s, delivery_boy_name = %s, delivery_boy_phone = %s, updated_at = %s
        WHERE booking_id = %s
    """, (payload.deliveryBoyId or f"db-{random.randint(1000,9999)}", payload.deliveryBoyName or "Express Courier", payload.deliveryBoyPhone or "+91 98765 43210", now_str, id))
    
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Assigned delivery boy {payload.deliveryBoyName} to booking {id}", "Orders", "127.0.0.1"))
    
    broadcast_admin_event("booking.delivery_assigned", {"bookingId": id, "deliveryBoyName": payload.deliveryBoyName})
    return {"success": True, "bookingId": id, "deliveryBoyName": payload.deliveryBoyName, "deliveryBoyPhone": payload.deliveryBoyPhone}

@app.post("/api/admin/bookings/{id}/cancel")
def admin_cancel_booking(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE orders SET status = 'cancelled' WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Cancelled booking {id}", "Orders", "127.0.0.1"))
    
    # Return updated booking
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT o.*, u.full_name as customer_name, p.owner_name, p.user_email as owner_email
                FROM orders o
                LEFT JOIN users u ON o.user_email = u.email
                LEFT JOIN custom_products p ON o.product_id = p.id
                WHERE o.id = %s
            """, (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    res_b = {
        "id": r["id"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "productImage": r["product_image"],
        "customerId": r["user_email"],
        "customerName": r["customer_name"] or (r["user_email"].split("@")[0] if r["user_email"] else "Customer"),
        "ownerId": r["owner_email"] or "",
        "ownerName": r["owner_name"] or "Verified Lender",
        "startDate": r["start_date"],
        "endDate": r["end_date"],
        "amount": r["total"],
        "status": r["status"],
        "createdAt": r["created_at"]
    }
    broadcast_admin_event("booking.cancelled", res_b)
    return res_b

@app.post("/api/admin/bookings/{id}/complete")
def admin_complete_booking(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE orders SET status = 'completed' WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Completed booking {id}", "Orders", "127.0.0.1"))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT o.*, u.full_name as customer_name, p.owner_name, p.user_email as owner_email
                FROM orders o
                LEFT JOIN users u ON o.user_email = u.email
                LEFT JOIN custom_products p ON o.product_id = p.id
                WHERE o.id = %s
            """, (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    res_b = {
        "id": r["id"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "productImage": r["product_image"],
        "customerId": r["user_email"],
        "customerName": r["customer_name"] or (r["user_email"].split("@")[0] if r["user_email"] else "Customer"),
        "ownerId": r["owner_email"] or "",
        "ownerName": r["owner_name"] or "Verified Lender",
        "startDate": r["start_date"],
        "endDate": r["end_date"],
        "amount": r["total"],
        "status": r["status"],
        "createdAt": r["created_at"]
    }
    broadcast_admin_event("booking.updated", res_b)
    return res_b

@app.post("/api/admin/bookings/{id}/refund")
def admin_refund_booking(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE orders SET status = 'cancelled' WHERE id = %s", (id,))
    execute_query("UPDATE payments SET status = 'refunded' WHERE booking_id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Refunded booking {id}", "Orders", "127.0.0.1"))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT o.*, u.full_name as customer_name, p.owner_name, p.user_email as owner_email
                FROM orders o
                LEFT JOIN users u ON o.user_email = u.email
                LEFT JOIN custom_products p ON o.product_id = p.id
                WHERE o.id = %s
            """, (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    return {
        "id": r["id"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "productImage": r["product_image"],
        "customerId": r["user_email"],
        "customerName": r["customer_name"] or (r["user_email"].split("@")[0] if r["user_email"] else "Customer"),
        "ownerId": r["owner_email"] or "",
        "ownerName": r["owner_name"] or "Verified Lender",
        "startDate": r["start_date"],
        "endDate": r["end_date"],
        "amount": r["total"],
        "status": r["status"],
        "createdAt": r["created_at"]
    }

# Payments
@app.get("/api/admin/payments")
def admin_payments_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT o.id AS booking_id, o.user_email, o.total AS amount, o.payment_status, o.razorpay_payment_id,
                       o.razorpay_order_id, o.created_at, o.refund_status,
                       u.full_name AS customer_name
                FROM orders o
                LEFT JOIN users u ON o.user_email = u.email
                ORDER BY o.created_at DESC
            """)
            rows = cursor.fetchall() or []
    finally:
        try:
            conn.close()
        except Exception:
            pass
        
    res = []
    for r in rows:
        st = r.get("payment_status") or "successful"
        if r.get("refund_status") == "refunded":
            st = "refunded"
        res.append({
            "id": r.get("razorpay_payment_id") or f"pay-{r['booking_id']}",
            "bookingId": r["booking_id"],
            "customerId": r["user_email"],
            "customerName": r.get("customer_name") or (r["user_email"].split("@")[0] if r.get("user_email") else "Customer"),
            "amount": r["amount"],
            "status": st,
            "method": "Razorpay (UPI / Card)",
            "invoiceUrl": "#",
            "createdAt": r["created_at"]
        })
    return res

@app.post("/api/admin/payments/{id}/refund")
def admin_refund_payment(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE payments SET status = 'refunded' WHERE id = %s", (id,))
    
    # Get payment to cancel associated booking
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM payments WHERE id = %s", (id,))
            pay = cursor.fetchone()
            if pay:
                cursor.execute("UPDATE orders SET status = 'cancelled' WHERE id = %s", (pay["booking_id"],))
    finally:
        conn.close()
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Refunded payment transaction {id}", "Payments", "127.0.0.1"))
    
    res_p = {
        "id": pay["id"],
        "bookingId": pay["booking_id"],
        "customerId": pay["customer_id"],
        "customerName": pay["customer_name"],
        "amount": pay["amount"],
        "status": "refunded",
        "method": pay["method"],
        "invoiceUrl": pay["invoice_url"],
        "createdAt": pay["created_at"]
    }
    broadcast_admin_event("payment.refunded", res_p)
    return res_p

# ----------------------------------------------------------------------
# Real Customer Reviews API Endpoints & Schemas
# ----------------------------------------------------------------------

class ReviewCreateSchema(BaseModel):
    productId: Optional[str] = None
    product_id: Optional[str] = None
    bookingId: Optional[str] = None
    booking_id: Optional[str] = None
    rating: int
    comment: str

    @validator("rating")
    def validate_rating(cls, v):
        if v is None or v < 1 or v > 5:
            raise ValueError("Rating must be an integer between 1 and 5.")
        return int(v)

    @validator("comment")
    def validate_comment(cls, v):
        clean = (v or "").strip()
        if len(clean) < 5:
            raise ValueError("Review comment must be at least 5 characters long.")
        if len(clean) > 2000:
            raise ValueError("Review comment cannot exceed 2000 characters.")
        return clean

class ReviewUpdateSchema(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

    @validator("rating")
    def validate_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be an integer between 1 and 5.")
        return int(v) if v is not None else None

    @validator("comment")
    def validate_comment(cls, v):
        if v is not None:
            clean = v.strip()
            if len(clean) < 5:
                raise ValueError("Review comment must be at least 5 characters long.")
            if len(clean) > 2000:
                raise ValueError("Review comment cannot exceed 2000 characters.")
            return clean
        return v

@app.get("/api/reviews")
def list_public_reviews(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("newest"),
    rating: Optional[int] = Query(None, ge=1, le=5),
    product_id: Optional[str] = Query(None),
    productId: Optional[str] = Query(None),
    verified_only: bool = Query(False)
):
    """Retrieve verified production customer reviews with server-side pagination, sorting, and filtering."""
    target_pid = product_id or productId
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=120"
    cache_key = f"public_reviews:{page}:{limit}:{sort}:{rating}:{target_pid}:{verified_only}"
    return get_cached(
        cache_key,
        30,
        lambda: get_reviews_from_db(
            page=page,
            limit=limit,
            sort=sort,
            rating_filter=rating,
            product_id=target_pid,
            verified_only=verified_only
        )
    )

@app.get("/api/reviews/stats")
def get_review_statistics(response: Response, product_id: Optional[str] = Query(None)):
    """Retrieve dynamic aggregated review statistics (average rating, count, and 1-5 star distribution)."""
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    cache_key = f"public_reviews_stats:{product_id or 'all'}"
    return get_cached(cache_key, 60, lambda: get_review_stats_from_db(product_id=product_id))

@app.get("/api/reviews/eligible-bookings")
def get_eligible_rental_bookings(current_user: dict = Depends(require_authenticated_user)):
    """Retrieve completed/active rental bookings for current authenticated user that are eligible for review."""
    return get_user_eligible_bookings(current_user["email"])

@app.post("/api/reviews", status_code=status.HTTP_201_CREATED)
def create_customer_review(
    data: ReviewCreateSchema,
    current_user: dict = Depends(require_authenticated_user)
):
    """
    Create a genuine customer review.
    Enforces authentication, rental booking eligibility, and prevents duplicate reviews.
    """
    user_email = current_user["email"].strip().lower()
    pid = data.product_id or data.productId
    bid = data.booking_id or data.bookingId

    # 1. Eligibility & Duplicate Prevention Check
    booking_record = None
    if bid:
        booking_record = fetch_one("SELECT * FROM orders WHERE id = %s", (bid,))
        if not booking_record:
            user_orders = get_orders(user_email)
            for o in user_orders:
                if o.get("id") == bid:
                    booking_record = o
                    break
        if not booking_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified booking was not found."
            )
        
        booking_buyer = (booking_record.get("user_email") or booking_record.get("userEmail") or "").strip().lower()
        if booking_buyer != user_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only submit reviews for your own rental bookings."
            )

        b_status = str(booking_record.get("status") or "").lower()
        if b_status in ("cancelled", "rejected", "failed", "refunded"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit review on {b_status} rental booking."
            )

        if not pid:
            pid = booking_record.get("product_id") or booking_record.get("productId")

        # Check duplicate by booking_id
        existing_rev_by_booking = fetch_one("SELECT id FROM reviews WHERE booking_id = %s", (bid,))
        if existing_rev_by_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A review has already been submitted for this booking."
            )

    if not pid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid productId or bookingId is required to submit a review."
        )

    if not bid:
        # Check if user has an eligible completed/active order for this product
        eligible_orders = fetch_all("""
            SELECT id FROM orders 
            WHERE LOWER(user_email) = %s AND product_id = %s AND status IN ('completed', 'confirmed', 'delivered', 'active')
        """, (user_email, pid))
        if not eligible_orders:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must have an active or completed rental booking for this gear to leave a verified review."
            )

    # 2. Check duplicate review for same user & product
    existing_user_rev = fetch_one("""
        SELECT id FROM reviews 
        WHERE LOWER(user_email) = %s AND product_id = %s
    """, (user_email, pid))
    if existing_user_rev:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a review for this product."
        )

    # Resolve product title/image for denormalization
    prod_title = "Tech Gear Rental"
    prod_image = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600"
    target_product = fetch_one_product(pid)
    if target_product:
        prod_title = target_product.get("title") or prod_title
        prod_image = target_product.get("image") or prod_image

    # 3. Create review record
    rev_id = f"rev-{int(time.time() * 1000)}-{secrets.token_hex(4)}"
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    user_name = current_user.get("full_name") or user_email.split("@")[0]
    user_avatar = current_user.get("avatar") or current_user.get("profile_photo_url") or f"https://ui-avatars.com/api/?name={user_name}&background=0D151D&color=fff"
    user_location = current_user.get("city") or ""
    user_role = current_user.get("occupation") or "Creator"

    review_entry = {
        "id": rev_id,
        "product_id": pid,
        "product_title": prod_title,
        "product_image": prod_image,
        "user_email": user_email,
        "user_name": user_name,
        "user_avatar": user_avatar,
        "user_location": user_location,
        "user_role": user_role,
        "booking_id": bid,
        "rating": data.rating,
        "comment": data.comment,
        "is_verified": True if bid else False,
        "created_at": now_str,
        "updated_at": None
    }

    success = create_review_record(review_entry)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save review to database."
        )

    # 4. Synchronize product rating & count
    if pid:
        recalculate_product_ratings(pid)

    # Notify lender of incoming customer review
    lender_email = (target_product.get("user_email") if target_product else "").strip().lower()
    if lender_email and lender_email != user_email:
        create_notification(
            email=lender_email,
            title="New Review Received ⭐",
            message=f"{user_name} gave {data.rating} stars for '{prod_title}'.",
            notif_type="booking"
        )

    # 5. Broadcast real-time admin event
    broadcast_admin_event("review.created", {
        "id": rev_id,
        "productId": pid,
        "productTitle": prod_title,
        "userName": user_name,
        "userAvatar": user_avatar,
        "rating": data.rating,
        "comment": data.comment,
        "createdAt": now_str
    })
    invalidate_cache("public_reviews")
    invalidate_cache("public_reviews_stats")
    invalidate_cache("profile_stats")
    invalidate_cache("public_stats")
    invalidate_cache(f"product:{pid}")

    return {
        "id": rev_id,
        "productId": pid,
        "productTitle": prod_title,
        "productImage": prod_image,
        "bookingId": bid,
        "userId": mask_email_safely(user_email),
        "userName": user_name,
        "userAvatar": user_avatar,
        "userLocation": user_location,
        "userRole": user_role,
        "rating": data.rating,
        "comment": data.comment,
        "isVerified": bool(review_entry["is_verified"]),
        "createdAt": now_str,
        "updatedAt": None
    }

@app.put("/api/reviews/{id}")
def update_customer_review(
    id: str,
    data: ReviewUpdateSchema,
    current_user: dict = Depends(require_authenticated_user)
):
    """Update a review written by current authenticated user (or admin)."""
    existing = get_review_by_id(id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")

    rev_owner = (existing.get("user_email") or "").strip().lower()
    user_email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"
    if rev_owner != user_email and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. You do not have permission to edit this review."
        )

    new_rating = data.rating if data.rating is not None else existing.get("rating", 5)
    new_comment = data.comment if data.comment is not None else existing.get("comment", "")
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    update_review_record(id, new_rating, new_comment, now_str)

    pid = existing.get("product_id")
    if pid:
        recalculate_product_ratings(pid)

    broadcast_admin_event("review.updated", {"id": id, "rating": new_rating})
    invalidate_cache("public_reviews")
    invalidate_cache("public_reviews_stats")
    invalidate_cache("profile_stats")
    invalidate_cache("public_stats")
    if pid:
        invalidate_cache(f"product:{pid}")

    updated = get_review_by_id(id)
    user_display = updated.get("user_name") or current_user.get("full_name") or user_email.split("@")[0]
    return {
        "id": id,
        "productId": updated.get("product_id"),
        "productTitle": updated.get("product_title"),
        "productImage": updated.get("product_image"),
        "bookingId": updated.get("booking_id"),
        "userId": updated.get("user_email"),
        "userName": user_display,
        "userAvatar": updated.get("user_avatar") or "",
        "userLocation": updated.get("user_location") or "",
        "userRole": updated.get("user_role") or "",
        "rating": updated.get("rating"),
        "comment": updated.get("comment"),
        "isVerified": bool(updated.get("is_verified", True)),
        "createdAt": updated.get("created_at"),
        "updatedAt": updated.get("updated_at")
    }

@app.delete("/api/reviews/{id}")
def delete_customer_review(
    id: str,
    current_user: dict = Depends(require_authenticated_user)
):
    """Delete a review written by current authenticated user (or admin)."""
    existing = get_review_by_id(id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")

    rev_owner = (existing.get("user_email") or "").strip().lower()
    user_email = current_user["email"].strip().lower()
    is_admin = current_user.get("role") == "admin"
    if rev_owner != user_email and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. You do not have permission to delete this review."
        )

    pid = existing.get("product_id")
    delete_review_record(id)

    if pid:
        recalculate_product_ratings(pid)

    broadcast_admin_event("review.deleted", {"id": id})
    invalidate_cache("public_reviews")
    invalidate_cache("public_reviews_stats")
    invalidate_cache("profile_stats")
    invalidate_cache("public_stats")
    if pid:
        invalidate_cache(f"product:{pid}")
    return {"success": True, "message": "Review deleted successfully."}

# Admin Reviews
@app.get("/api/admin/reviews")
def admin_reviews_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reviews ORDER BY created_at DESC")
            rows = cursor.fetchall()
    finally:
        conn.close()
        
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "productId": r["product_id"],
            "productTitle": r["product_title"],
            "userName": r["user_name"],
            "userAvatar": r["user_avatar"] or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            "rating": r["rating"],
            "comment": r["comment"],
            "hidden": bool(r["hidden"]),
            "createdAt": r["created_at"]
        })
    return res

@app.delete("/api/admin/reviews/{id}")
def admin_delete_review(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("DELETE FROM reviews WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Deleted review {id}", "Reports", "127.0.0.1"))
    
    invalidate_cache("public_reviews")
    invalidate_cache("public_reviews_stats")
    invalidate_cache("public_stats")
    return {"success": True}

@app.post("/api/admin/reviews/{id}/toggle-hide")
def admin_toggle_hide_review(id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT hidden FROM reviews WHERE id = %s", (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
        
    new_val = 0 if r["hidden"] else 1
    execute_query("UPDATE reviews SET hidden = %s WHERE id = %s", (new_val, id))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    action_str = "Hid" if new_val else "Unhid"
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"{action_str} review {id}", "Reports", "127.0.0.1"))
    
    invalidate_cache("public_reviews")
    invalidate_cache("public_reviews_stats")
    invalidate_cache("public_stats")
    
    # Get updated review
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reviews WHERE id = %s", (id,))
            updated = cursor.fetchone()
    finally:
        conn.close()
        
    return {
        "id": updated["id"],
        "productId": updated["product_id"],
        "productTitle": updated["product_title"],
        "userName": updated["user_name"],
        "userAvatar": updated["user_avatar"],
        "rating": updated["rating"],
        "comment": updated["comment"],
        "hidden": bool(updated["hidden"]),
        "createdAt": updated["created_at"]
    }

# Reports
@app.get("/api/admin/reports")
def admin_reports_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")
            rows = cursor.fetchall()
    finally:
        conn.close()
        
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "reason": r["reason"],
            "evidence": r["evidence"],
            "productId": r["product_id"],
            "productTitle": r["product_title"],
            "reporterName": r["reporter_name"],
            "ownerName": r["owner_name"],
            "ownerId": r["owner_id"],
            "status": r["status"] or "open",
            "createdAt": r["created_at"]
        })
    return res

@app.post("/api/admin/reports/{id}/resolve")
def admin_resolve_report(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE reports SET status = 'resolved' WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Resolved report {id}", "Reports", "127.0.0.1"))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reports WHERE id = %s", (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    return {
        "id": r["id"],
        "reason": r["reason"],
        "evidence": r["evidence"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "reporterName": r["reporter_name"],
        "ownerName": r["owner_name"],
        "ownerId": r["owner_id"],
        "status": "resolved",
        "createdAt": r["created_at"]
    }

@app.post("/api/admin/reports/{id}/dismiss")
def admin_dismiss_report(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE reports SET status = 'dismissed' WHERE id = %s", (id,))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Dismissed report {id}", "Reports", "127.0.0.1"))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reports WHERE id = %s", (id,))
            r = cursor.fetchone()
    finally:
        conn.close()
        
    return {
        "id": r["id"],
        "reason": r["reason"],
        "evidence": r["evidence"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "reporterName": r["reporter_name"],
        "ownerName": r["owner_name"],
        "ownerId": r["owner_id"],
        "status": "dismissed",
        "createdAt": r["created_at"]
    }

@app.post("/api/admin/reports/{id}/suspend-product")
def admin_suspend_product_report(id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reports WHERE id = %s", (id,))
            r = cursor.fetchone()
            if r:
                cursor.execute("UPDATE custom_products SET status = 'rejected', available = 0 WHERE id = %s", (r["product_id"],))
                cursor.execute("UPDATE reports SET status = 'resolved' WHERE id = %s", (id,))
    finally:
        conn.close()
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Suspended reported product {r['product_id']} via report {id}", "Reports", "127.0.0.1"))
    
    return {
        "id": r["id"],
        "reason": r["reason"],
        "evidence": r["evidence"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "reporterName": r["reporter_name"],
        "ownerName": r["owner_name"],
        "ownerId": r["owner_id"],
        "status": "resolved",
        "createdAt": r["created_at"]
    }

@app.post("/api/admin/reports/{id}/ban-user")
def admin_ban_user_report(id: str, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM reports WHERE id = %s", (id,))
            r = cursor.fetchone()
            if r:
                cursor.execute("UPDATE users SET status = 'suspended' WHERE email = %s", (r["owner_id"],))
                cursor.execute("UPDATE reports SET status = 'resolved' WHERE id = %s", (id,))
    finally:
        conn.close()
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Suspended user {r['owner_id']} via report {id}", "Reports", "127.0.0.1"))
    
    return {
        "id": r["id"],
        "reason": r["reason"],
        "evidence": r["evidence"],
        "productId": r["product_id"],
        "productTitle": r["product_title"],
        "reporterName": r["reporter_name"],
        "ownerName": r["owner_name"],
        "ownerId": r["owner_id"],
        "status": "resolved",
        "createdAt": r["created_at"]
    }

# Notifications
@app.get("/api/admin/notifications")
def admin_notifications_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, title, message, type, is_read, created_at FROM admin_notifications ORDER BY created_at DESC")
            rows = cursor.fetchall()
    finally:
        conn.close()
        
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "title": r["title"],
            "message": r["message"],
            "type": r["type"] or "info",
            "read": bool(r["is_read"]),
            "createdAt": r["created_at"]
        })
    return res

@app.post("/api/admin/notifications/mark-read")
def admin_mark_read_all(current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE admin_notifications SET is_read = 1")
    return {"success": True}

@app.delete("/api/admin/notifications/{id}")
def admin_delete_notification(id: str, current_admin: dict = Depends(check_admin_user)):
    execute_query("DELETE FROM admin_notifications WHERE id = %s", (id,))
    return {"success": True}

# Support Tickets
@app.get("/api/admin/support")
def admin_support_tickets_list(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM support_tickets ORDER BY created_at DESC")
            rows = cursor.fetchall()
    finally:
        conn.close()
        
    res = []
    for r in rows:
        try:
            msg_list = json.loads(r["messages"]) if r["messages"] else []
        except Exception:
            msg_list = []
            
        res.append({
            "id": r["id"],
            "subject": r["subject"],
            "category": r["category"],
            "status": r["status"] or "open",
            "priority": r["priority"] or "medium",
            "userName": r["user_name"],
            "userEmail": r["user_email"],
            "messages": msg_list,
            "createdAt": r["created_at"]
        })
    return res

@app.post("/api/admin/support/{id}/reply")
def admin_reply_support_ticket(id: str, data: SupportReplySchema, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM support_tickets WHERE id = %s", (id,))
            r = cursor.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="Ticket not found")
                
            try:
                msg_list = json.loads(r["messages"]) if r["messages"] else []
            except Exception:
                msg_list = []
                
            new_msg = {
                "id": f"tm-{random.randint(100000, 999999)}",
                "sender": "admin",
                "message": data.message,
                "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            msg_list.append(new_msg)
            
            cursor.execute("UPDATE support_tickets SET messages = %s, status = 'pending' WHERE id = %s", (json.dumps(msg_list), id))
            conn.commit()
    finally:
        conn.close()
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Replied to ticket {id}", "Reports", "127.0.0.1"))
    
    return {
        "id": r["id"],
        "subject": r["subject"],
        "category": r["category"],
        "status": "pending",
        "priority": r["priority"],
        "userName": r["user_name"],
        "userEmail": r["user_email"],
        "messages": msg_list,
        "createdAt": r["created_at"]
    }

@app.post("/api/admin/support/{id}/status")
def admin_status_support_ticket(id: str, data: SupportStatusSchema, current_admin: dict = Depends(check_admin_user)):
    execute_query("UPDATE support_tickets SET status = %s WHERE id = %s", (data.status, id))
    
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], f"Changed ticket {id} status to {data.status}", "Reports", "127.0.0.1"))
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM support_tickets WHERE id = %s", (id,))
            r = cursor.fetchone()
            try:
                msg_list = json.loads(r["messages"]) if r["messages"] else []
            except Exception:
                msg_list = []
    finally:
        conn.close()
        
    return {
        "id": r["id"],
        "subject": r["subject"],
        "category": r["category"],
        "status": r["status"],
        "priority": r["priority"],
        "userName": r["user_name"],
        "userEmail": r["user_email"],
        "messages": msg_list,
        "createdAt": r["created_at"]
    }

# Settings
@app.get("/api/admin/settings")
def admin_settings_get(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM admin_settings LIMIT 1")
            r = cursor.fetchone()
    finally:
        conn.close()
        
    if not r:
        return {
            "websiteName": "PAYENT",
            "logoUrl": "",
            "theme": "dark",
            "contactEmail": "support@payent.com",
            "contactPhone": "+91 98765 43210",
            "socialFacebook": "",
            "socialTwitter": "",
            "socialInstagram": "",
            "seoTitle": "PAYENT — Premium Tech Gear Rental Platform",
            "seoDescription": "Rent top-tier creator and tech equipment safely and seamlessly with peer-to-peer verified agents.",
            "homepageBannerText": "Special Weekend Rate: Get 20% off cinema cameras and drones",
            "footerText": "© 2026 PAYENT Technologies Inc. All rights reserved."
        }
        
    return {
        "websiteName": r.get("website_name") or "PAYENT",
        "logoUrl": r.get("logo_url") or "",
        "theme": r.get("theme") or "dark",
        "contactEmail": r.get("contact_email") or "support@payent.com",
        "contactPhone": r.get("contact_phone") or "+91 98765 43210",
        "socialFacebook": r.get("social_facebook") or "",
        "socialTwitter": r.get("social_twitter") or "",
        "socialInstagram": r.get("social_instagram") or "",
        "seoTitle": r.get("seo_title") or "PAYENT — Premium Tech Gear Rental Platform",
        "seoDescription": r.get("seo_description") or "Rent top-tier creator and tech equipment safely and seamlessly with peer-to-peer verified agents.",
        "homepageBannerText": r.get("homepage_banner_text") or "",
        "footerText": r.get("footer_text") or "© 2026 PAYENT Technologies Inc. All rights reserved."
    }

@app.post("/api/admin/settings")
def admin_settings_save(data: SettingsUpdateSchema, current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM admin_settings LIMIT 1")
            existing = cursor.fetchone()
            if not existing:
                cursor.execute("""
                    INSERT INTO admin_settings (id, website_name, logo_url, theme, contact_email, contact_phone, social_facebook, social_twitter, social_instagram, seo_title, seo_description, homepage_banner_text, footer_text)
                    VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    data.websiteName or "PAYENT",
                    data.logoUrl or "",
                    data.theme or "dark",
                    data.contactEmail or "support@payent.com",
                    data.contactPhone or "+91 98765 43210",
                    data.socialFacebook or "",
                    data.socialTwitter or "",
                    data.socialInstagram or "",
                    data.seoTitle or "PAYENT — Premium Tech Gear Rental Platform",
                    data.seoDescription or "Rent top-tier creator and tech equipment safely and seamlessly with peer-to-peer verified agents.",
                    data.homepageBannerText or "",
                    data.footerText or "© 2026 PAYENT Technologies Inc. All rights reserved."
                ))
            else:
                fields = []
                params = []
                if data.websiteName is not None:
                    fields.append("website_name = %s")
                    params.append(data.websiteName)
                if data.logoUrl is not None:
                    fields.append("logo_url = %s")
                    params.append(data.logoUrl)
                if data.theme is not None:
                    fields.append("theme = %s")
                    params.append(data.theme)
                if data.contactEmail is not None:
                    fields.append("contact_email = %s")
                    params.append(data.contactEmail)
                if data.contactPhone is not None:
                    fields.append("contact_phone = %s")
                    params.append(data.contactPhone)
                if data.socialFacebook is not None:
                    fields.append("social_facebook = %s")
                    params.append(data.socialFacebook)
                if data.socialTwitter is not None:
                    fields.append("social_twitter = %s")
                    params.append(data.socialTwitter)
                if data.socialInstagram is not None:
                    fields.append("social_instagram = %s")
                    params.append(data.socialInstagram)
                if data.seoTitle is not None:
                    fields.append("seo_title = %s")
                    params.append(data.seoTitle)
                if data.seoDescription is not None:
                    fields.append("seo_description = %s")
                    params.append(data.seoDescription)
                if data.homepageBannerText is not None:
                    fields.append("homepage_banner_text = %s")
                    params.append(data.homepageBannerText)
                if data.footerText is not None:
                    fields.append("footer_text = %s")
                    params.append(data.footerText)
                    
                if fields:
                    params.append(existing["id"])
                    query = f"UPDATE admin_settings SET {', '.join(fields)} WHERE id = %s"
                    cursor.execute(query, tuple(params))
            conn.commit()
    finally:
        conn.close()
        
    # Log action
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    execute_query("""
        INSERT INTO admin_logs (id, timestamp, user_name, action, module, ip_address)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (f"l-{random.randint(100000, 999999)}", now_str, current_admin["full_name"], "Updated website configurations", "Settings", "127.0.0.1"))
    
    return admin_settings_get(current_admin)

# Activity Logs
@app.get("/api/admin/activity-logs")
def admin_activity_logs(current_admin: dict = Depends(check_admin_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, timestamp, user_name, action, module, ip_address FROM admin_logs ORDER BY timestamp DESC LIMIT 100")
            rows = cursor.fetchall()
    finally:
        conn.close()
        
    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "userName": r["user_name"],
            "action": r["action"],
            "module": r["module"],
            "ipAddress": r["ip_address"]
        })
    return res


# Event Tracking & Recommendation Schemas
class EventItemSchema(BaseModel):
    user_email: Optional[str] = None
    session_id: Optional[str] = None
    event_type: str
    product_id: Optional[str] = None
    category: Optional[str] = None
    search_query: Optional[str] = None
    recommendation_type: Optional[str] = None
    variant: Optional[str] = None

class EventBatchSchema(BaseModel):
    events: List[EventItemSchema]


# Helper: Recommendation Catalog from DB Only
DEFAULT_CATALOG_PRODUCTS: List[dict] = []

def get_recommendation_catalog() -> List[dict]:
    """Retrieve full product list from custom_products DB table."""
    db_products = get_all_custom_products()
    catalog_map = {}
    
    for db_p in db_products:
        if db_p.get("status", "approved") == "approved" and not db_p.get("hidden", False):
            owner_info = db_p.get("owner") if isinstance(db_p.get("owner"), dict) else {}
            owner_name = db_p.get("owner_name") or owner_info.get("name") or "Verified Lender"
            owner_avatar = db_p.get("owner_avatar") or owner_info.get("avatar") or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
            owner_rating = float(db_p.get("owner_rating") or owner_info.get("rating") or 5.0)
            
            catalog_map[str(db_p["id"])] = {
                "id": str(db_p["id"]),
                "title": str(db_p.get("title", "")),
                "description": str(db_p.get("description", "")),
                "price": float(db_p.get("price", 0)),
                "category": str(db_p.get("category", "General")),
                "rating": float(db_p.get("rating", 5.0)),
                "reviews": int(db_p.get("reviews", 0)),
                "available": bool(db_p.get("available", True)),
                "image": str(db_p.get("image", "")),
                "owner": {
                    "name": owner_name,
                    "avatar": owner_avatar,
                    "rating": owner_rating
                }
            }
    return list(catalog_map.values())


# Phase 1 — Event Tracking API Endpoint
@app.post("/api/events")
def post_events(payload: dict):
    """
    POST /api/events
    Accepts single event dict or batch JSON with list of events.
    """
    if "events" in payload and isinstance(payload["events"], list):
        events = payload["events"]
        record_user_events_batch(events)
        return {"status": "ok", "recorded": len(events)}
    else:
        record_user_event_record(payload)
        return {"status": "ok", "recorded": 1}


# Phase 2 — Immediate Non-ML Recommendations: Similar Items
@app.get("/api/recommendations/similar/{product_id}")
def get_similar_recommendations(product_id: str):
    """
    GET /api/recommendations/similar/{product_id}
    Returns items in same category with similar price and precomputed similarity boost.
    """
    catalog = get_recommendation_catalog()
    target = next((p for p in catalog if p["id"] == product_id), None)
    
    if not target:
        # Fallback to general high-rated products if product_id not found
        return sorted(catalog, key=lambda x: x["rating"], reverse=True)[:4]

    target_cat = target.get("category", "")
    target_price = target.get("price", 1000)

    # Load ML precomputed similarities if existing
    ml_similarities = {row["product_id"]: float(row["score"]) for row in get_precomputed_similarities(product_id)}

    scored_items = []
    for item in catalog:
        if item["id"] == product_id:
            continue
        
        score = 0.0
        # Category similarity (+50 pts)
        if item.get("category") == target_cat:
            score += 50.0
            
        # Price similarity (up to +30 pts)
        price_diff = abs(item.get("price", 0) - target_price)
        price_score = max(0.0, 30.0 - (30.0 * price_diff / max(1, target_price)))
        score += price_score
        
        # Rating quality (+10 pts max)
        score += item.get("rating", 4.0) * 2.0
        
        # ML Collaborative filtering similarity boost (+ up to 40 pts)
        if item["id"] in ml_similarities:
            score += ml_similarities[item["id"]] * 40.0

        scored_items.append((score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    return [item for score, item in scored_items[:6]]


# Phase 2 — Immediate Non-ML Recommendations: Trending Now
@app.get("/api/recommendations/trending")
def get_trending_recommendations():
    """
    GET /api/recommendations/trending
    Returns products ranked by recent weighted event interactions (booking_completed, add_to_cart, view_product)
    with time-decay, falling back to top catalog items.
    """
    catalog = get_recommendation_catalog()
    catalog_map = {p["id"]: p for p in catalog}
    
    event_counts = get_trending_event_counts(days=30)
    trending_items = []
    seen_ids = set()

    for row in event_counts:
        pid = row["product_id"]
        if pid in catalog_map:
            trending_items.append(catalog_map[pid])
            seen_ids.add(pid)

    # Fallback / Top up with highest rated items if events are sparse
    if len(trending_items) < 8:
        fallback_sorted = sorted(catalog, key=lambda x: (x.get("rating", 0), x.get("reviews", 0)), reverse=True)
        for item in fallback_sorted:
            if item["id"] not in seen_ids:
                trending_items.append(item)
                seen_ids.add(item["id"])
                if len(trending_items) >= 8:
                    break

    return trending_items[:8]


# Phase 2 — Immediate Non-ML Recommendations: Frequently Booked Together
@app.get("/api/recommendations/frequently-together/{product_id}")
def get_frequently_together_recommendations(product_id: str):
    """
    GET /api/recommendations/frequently-together/{product_id}
    Returns co-occurring items in order history or complementary category products.
    """
    catalog = get_recommendation_catalog()
    catalog_map = {p["id"]: p for p in catalog}
    target = catalog_map.get(product_id)

    co_occurrences = get_order_co_occurrences(product_id, limit=4)
    results = []
    seen_ids = {product_id}

    for row in co_occurrences:
        pid = row["product_id"]
        if pid in catalog_map:
            results.append(catalog_map[pid])
            seen_ids.add(pid)

    # Fallback to complementary / adjacent category items
    if len(results) < 3 and target:
        target_cat = target.get("category", "")
        # Adjacent complementary category mapping
        complement_cats = {
            "Cameras": ["Audio", "Power Banks", "Cameras"],
            "Laptops": ["Power Banks", "Audio", "Laptops"],
            "Drones": ["Power Banks", "Cameras", "Drones"],
            "Audio": ["Cameras", "Power Banks"],
            "Power Banks": ["Cameras", "Laptops", "Drones"]
        }.get(target_cat, [target_cat])

        for cat in complement_cats:
            for item in catalog:
                if item["id"] not in seen_ids and item.get("category") == cat:
                    results.append(item)
                    seen_ids.add(item["id"])
                    if len(results) >= 4:
                        break
            if len(results) >= 4:
                break

    return results[:4]


# Phase 3 — Cold-Start-Aware Personalization
@app.get("/api/recommendations/personalized")
def get_personalized_recommendations(user_email: Optional[str] = None, session_id: Optional[str] = None):
    """
    GET /api/recommendations/personalized
    Returns personalized items based on logged-in user's or current session's recent view/browse history.
    Falls back cleanly to Phase 2 trending products if no prior user history exists (cold-start).
    """
    catalog = get_recommendation_catalog()
    recent_events = get_recent_user_events(user_email=user_email, session_id=session_id, limit=25)

    if not recent_events:
        # COLD-START FALLBACK: Return trending items cleanly
        trending = get_trending_recommendations()
        return {
            "source": "trending_fallback",
            "title": "Trending Tech Gear",
            "description": "Popular items rented by the community this week",
            "items": trending
        }

    # Count user's interest frequency across categories and viewed product IDs
    cat_weights = {}
    viewed_pids = set()

    for ev in recent_events:
        cat = ev.get("category")
        pid = ev.get("product_id")
        if pid:
            viewed_pids.add(pid)

        if cat:
            weight = 3.0 if ev.get("event_type") == "add_to_cart" else 1.0
            cat_weights[cat] = cat_weights.get(cat, 0.0) + weight

    if not cat_weights:
        trending = get_trending_recommendations()
        return {
            "source": "trending_fallback",
            "title": "Trending Tech Gear",
            "description": "Popular items rented by the community this week",
            "items": trending
        }

    # Score catalog items based on user's category affinity
    scored_items = []
    top_cat = max(cat_weights.items(), key=lambda x: x[1])[0]

    for item in catalog:
        cat = item.get("category")
        pid = item.get("id")
        
        score = cat_weights.get(cat, 0.0) * 10.0
        # Give mild penalty to products already viewed so user discovers fresh gear
        if pid in viewed_pids:
            score -= 5.0
            
        score += item.get("rating", 4.0) * 2.0
        scored_items.append((score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    personalized_items = [item for score, item in scored_items[:8]]

    return {
        "source": "personalized",
        "title": f"Recommended For You in {top_cat}",
        "description": f"Based on your recent interest in {top_cat} and gear rentals",
        "items": personalized_items
    }


# Phase 4 — ML Data Sufficiency & Training Endpoints
@app.get("/api/recommendations/ml-status")
def get_ml_status():
    """
    GET /api/recommendations/ml-status
    Evaluates dataset interaction density and reports whether Phase 4 collaborative filtering ML can run.
    """
    return check_data_sufficiency()

@app.post("/api/recommendations/train")
def train_recommendation_model():
    """
    POST /api/recommendations/train
    Triggers batch computation of item-item similarity matrix if interaction dataset volume threshold is satisfied.
    """
    return compute_and_save_item_similarities()


# ML Search Engine Endpoints
class SearchRequestSchema(BaseModel):
    query: Optional[str] = ""
    category: Optional[str] = None
    user_email: Optional[str] = None
    session_id: Optional[str] = None
    limit: Optional[int] = 20

@app.post("/api/search")
def search_products_ml(req: SearchRequestSchema):
    """
    POST /api/search
    ML-powered search using TF-IDF, cosine similarity, and user event personalization.
    """
    if not ml_search_engine.is_indexed:
        catalog = get_recommendation_catalog()
        ml_search_engine.build_index(catalog)

    affinities = {}
    if req.user_email or req.session_id:
        affinities = get_user_category_affinities(req.user_email, req.session_id)

    results_data = ml_search_engine.search(
        query=req.query or "",
        category=req.category,
        user_affinities=affinities,
        limit=req.limit or 20
    )

    return {
        "success": True,
        "results": results_data["results"],
        "did_you_mean": results_data["did_you_mean"],
        "total": results_data["total"]
    }

@app.get("/api/search/stats")
def get_search_stats():
    """
    GET /api/search/stats
    Returns index stats and top trending search queries.
    """
    if not ml_search_engine.is_indexed:
        catalog = get_recommendation_catalog()
        ml_search_engine.build_index(catalog)

    popular_queries = get_popular_search_queries(limit=6)
    return {
        "success": True,
        "total_indexed": ml_search_engine.total_documents,
        "popular_queries": popular_queries
    }

# ===========================================================================
# SECURE DEVICE IDENTITY & MY SECURITY QR ENDPOINTS
# ===========================================================================

class DeviceRegisterSchema(BaseModel):
    deviceName: str
    brand: Optional[str] = "Apple"
    model: Optional[str] = ""
    serialNumber: Optional[str] = ""
    deviceType: Optional[str] = "LAPTOP"
    notes: Optional[str] = ""

class DevicePasswordVerifySchema(BaseModel):
    password: str

class DeviceActionWithPasswordSchema(BaseModel):
    password: str
    notes: Optional[str] = ""

class DeviceTransferRequestSchema(BaseModel):
    targetEmail: EmailStr
    password: str

class AdminDeviceStatusUpdateSchema(BaseModel):
    deviceStatus: str
    qrStatus: Optional[str] = None
    notes: Optional[str] = None

def _sanitize_device_for_user(dev: dict, include_qr: bool = False) -> dict:
    """Helper to return clean camelCase device data and withhold raw QR secret unless verified."""
    res = {
        "id": dev.get("id"),
        "accountId": dev.get("account_id"),
        "deviceId": dev.get("device_id"),
        "deviceType": dev.get("device_type", "LAPTOP"),
        "deviceName": dev.get("device_name"),
        "brand": dev.get("brand", ""),
        "model": dev.get("model", ""),
        "serialNumber": dev.get("serial_number", ""),
        "securityId": dev.get("security_id"),
        "qrStatus": dev.get("qr_status", "ACTIVE"),
        "deviceStatus": dev.get("device_status", "ACTIVE"),
        "registeredAt": dev.get("registered_at"),
        "updatedAt": dev.get("updated_at"),
        "lastVerifiedAt": dev.get("last_verified_at"),
        "notes": dev.get("notes", "")
    }
    if include_qr:
        res["qrToken"] = dev.get("qr_token")
        res["qrUrl"] = f"/verify/device/{dev.get('qr_token')}"
    return res

@app.get("/api/devices")
def get_user_registered_devices(current_user_email: str = Depends(get_current_user_email)):
    """
    GET /api/devices
    List all registered devices belonging to the authenticated user.
    """
    devices = get_devices_by_account(current_user_email)
    return {
        "success": True,
        "devices": [_sanitize_device_for_user(d, include_qr=False) for d in devices]
    }

@app.post("/api/devices")
def register_new_device(data: DeviceRegisterSchema, request: Request, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices
    Registers a new laptop device under the authenticated account.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    new_dev = create_registered_device(
        account_id=current_user_email,
        device_name=data.deviceName,
        brand=data.brand or "Other",
        model=data.model or "",
        serial_number=data.serialNumber or "",
        device_type=data.deviceType or "LAPTOP",
        notes=data.notes or "",
        ip_address=client_ip
    )
    return {
        "success": True,
        "message": "Device successfully registered with unique Security QR identity.",
        "device": _sanitize_device_for_user(new_dev, include_qr=False)
    }

@app.get("/api/devices/{device_id}")
def get_device_details(device_id: str, current_user_email: str = Depends(get_current_user_email)):
    """
    GET /api/devices/{device_id}
    Retrieves metadata for a registered device (requires user ownership).
    """
    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")
    return {
        "success": True,
        "device": _sanitize_device_for_user(dev, include_qr=False)
    }

@app.post("/api/devices/{device_id}/verify-password")
def verify_device_password_and_reveal_qr(device_id: str, data: DevicePasswordVerifySchema,
                                         request: Request, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices/{device_id}/verify-password
    PASSWORD-ONLY SECURITY:
    Authenticates the user's account password server-side before revealing the cryptographic Security QR.
    Rate-limits failed password attempts to protect device security.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"qr_reveal_pwd:{current_user_email.lower()}"

    is_locked, lock_secs = record_failed_auth_attempt(rate_key, max_attempts=5, lock_duration_secs=900)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many incorrect password attempts. Please wait {lock_secs // 60 + 1} minutes before trying again."
        )

    user = get_user(current_user_email)
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    clear_failed_auth_attempts(rate_key)

    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    # Record security audit event
    record_device_security_event(
        device_id=dev.get("device_id", device_id),
        event_type="QR_REVEALED",
        description="Security QR revealed after successful account password verification",
        actor_email=current_user_email,
        ip_address=client_ip
    )

    return {
        "success": True,
        "qrToken": dev.get("qr_token"),
        "qrUrl": f"/verify/device/{dev.get('qr_token')}",
        "securityId": dev.get("security_id"),
        "device": _sanitize_device_for_user(dev, include_qr=True)
    }

@app.post("/api/devices/{device_id}/regenerate-qr")
def regenerate_device_qr(device_id: str, data: DevicePasswordVerifySchema,
                         request: Request, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices/{device_id}/regenerate-qr
    Regenerates a fresh cryptographic QR token & Security ID after password verification.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user = get_user(current_user_email)
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password. Please try again.")

    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    updated_dev = regenerate_device_qr_db(device_id)
    if not updated_dev:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to regenerate QR token.")

    record_device_security_event(
        device_id=dev.get("device_id", device_id),
        event_type="QR_REGENERATED",
        description="Security QR regenerated; previous token invalidated and new security identity assigned",
        actor_email=current_user_email,
        ip_address=client_ip
    )

    return {
        "success": True,
        "message": "New Security QR generated successfully.",
        "qrToken": updated_dev.get("qr_token"),
        "qrUrl": f"/verify/device/{updated_dev.get('qr_token')}",
        "securityId": updated_dev.get("security_id"),
        "device": _sanitize_device_for_user(updated_dev, include_qr=True)
    }

@app.post("/api/devices/{device_id}/report-lost")
def report_device_lost(device_id: str, data: DeviceActionWithPasswordSchema,
                       request: Request, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices/{device_id}/report-lost
    Reports device as lost after password verification.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user = get_user(current_user_email)
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password. Please try again.")

    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    update_device_status_db(device_id, "REPORTED_LOST")
    desc = f"Device reported lost by owner. Notes: {data.notes}" if data.notes else "Device reported lost by owner"
    record_device_security_event(
        device_id=dev.get("device_id", device_id),
        event_type="DEVICE_REPORTED_LOST",
        description=desc,
        actor_email=current_user_email,
        ip_address=client_ip
    )
    return {"success": True, "message": "Device status updated to REPORTED LOST."}

@app.post("/api/devices/{device_id}/report-stolen")
def report_device_stolen(device_id: str, data: DeviceActionWithPasswordSchema,
                         request: Request, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices/{device_id}/report-stolen
    Reports device as stolen after password verification.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user = get_user(current_user_email)
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password. Please try again.")

    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    update_device_status_db(device_id, "REPORTED_STOLEN")
    desc = f"Device reported stolen by owner. Notes: {data.notes}" if data.notes else "Device reported stolen by owner"
    record_device_security_event(
        device_id=dev.get("device_id", device_id),
        event_type="DEVICE_REPORTED_STOLEN",
        description=desc,
        actor_email=current_user_email,
        ip_address=client_ip
    )
    return {"success": True, "message": "Device status updated to REPORTED STOLEN."}

@app.post("/api/devices/{device_id}/restore")
def restore_device_status(device_id: str, data: DevicePasswordVerifySchema,
                          request: Request, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices/{device_id}/restore
    Restores device status back to ACTIVE after password verification.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user = get_user(current_user_email)
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password. Please try again.")

    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    update_device_status_db(device_id, "ACTIVE", qr_status="ACTIVE")
    record_device_security_event(
        device_id=dev.get("device_id", device_id),
        event_type="DEVICE_RESTORED",
        description="Device status restored to ACTIVE by owner",
        actor_email=current_user_email,
        ip_address=client_ip
    )
    return {"success": True, "message": "Device restored to ACTIVE status."}

@app.get("/api/devices/{device_id}/security-history")
def get_device_history(device_id: str, current_user_email: str = Depends(get_current_user_email)):
    """
    GET /api/devices/{device_id}/security-history
    Audit timeline for a single registered device.
    """
    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")
    history = get_device_security_history_db(device_id=dev.get("device_id", device_id))
    return {"success": True, "history": history}

@app.get("/api/devices-security-history")
def get_all_user_devices_history(current_user_email: str = Depends(get_current_user_email)):
    """
    GET /api/devices-security-history
    Full security audit timeline across all devices owned by the user.
    """
    history = get_device_security_history_db(account_id=current_user_email)
    return {"success": True, "history": history}

@app.post("/api/devices/{device_id}/transfer")
def initiate_device_transfer(device_id: str, data: DeviceTransferRequestSchema,
                             current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/devices/{device_id}/transfer
    Initiate ownership transfer to another user.
    """
    user = get_user(current_user_email)
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password. Please try again.")

    dev = get_device_by_id(device_id)
    if not dev or dev.get("account_id", "").lower() != current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    clean_target = data.targetEmail.strip().lower()
    if clean_target == current_user_email.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot transfer device to your own account.")

    transfer_record = create_device_transfer_db(dev.get("device_id", device_id), current_user_email, clean_target)
    return {
        "success": True,
        "message": f"Ownership transfer requested to {clean_target}.",
        "transfer": transfer_record
    }

@app.get("/api/device-transfers/pending")
def get_pending_transfers(current_user_email: str = Depends(get_current_user_email)):
    """
    GET /api/device-transfers/pending
    Returns pending incoming and outgoing device transfers.
    """
    transfers = get_pending_transfers_db(current_user_email)
    return {"success": True, "transfers": transfers}

@app.post("/api/device-transfers/{transfer_id}/accept")
def accept_transfer(transfer_id: str, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/device-transfers/{transfer_id}/accept
    Target recipient accepts device ownership transfer.
    """
    success = accept_device_transfer_db(transfer_id, current_user_email)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not accept transfer. Invalid or expired request.")
    return {"success": True, "message": "Device ownership successfully transferred to your account."}

@app.post("/api/device-transfers/{transfer_id}/cancel")
def cancel_transfer(transfer_id: str, current_user_email: str = Depends(get_current_user_email)):
    """
    POST /api/device-transfers/{transfer_id}/cancel
    Cancels a pending ownership transfer.
    """
    success = cancel_device_transfer_db(transfer_id, current_user_email)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not cancel transfer.")
    return {"success": True, "message": "Device transfer cancelled successfully."}

# ===========================================================================
# PUBLIC DEVICE VERIFICATION ENDPOINT (NO LOGIN REQUIRED)
# ===========================================================================

@app.get("/api/verify/device/{token}")
def public_verify_device_qr(token: str, request: Request):
    """
    GET /api/verify/device/{token}
    Public endpoint: verifies scanned QR code token.
    DOES NOT EXPOSE PRIVATE OWNER INFORMATION (no email, phone, Aadhaar, PAN, address, or bank data).
    Returns verified status, device ID, security ID, device status, and registration timestamp.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    clean_tok = (token or "").strip()

    dev = get_device_by_qr_token(clean_tok)
    if not dev or dev.get("qr_status") == "DEACTIVATED":
        return {
            "verified": False,
            "status": "INVALID",
            "message": "This QR code is not registered in the paYent system."
        }

    # Touch last verified timestamp and log security scan
    touch_device_last_verified(dev.get("device_id", ""), ip_address=client_ip)

    return {
        "verified": True,
        "deviceId": dev.get("device_id"),
        "securityId": dev.get("security_id"),
        "deviceName": dev.get("device_name"),
        "brand": dev.get("brand", ""),
        "model": dev.get("model", ""),
        "deviceType": dev.get("device_type", "LAPTOP"),
        "deviceStatus": dev.get("device_status", "ACTIVE"),
        "qrStatus": dev.get("qr_status", "ACTIVE"),
        "registeredAt": dev.get("registered_at"),
        "lastVerifiedAt": dev.get("last_verified_at"),
        "notes": dev.get("notes", "")
    }

# ===========================================================================
# ADMIN DEVICE MANAGEMENT ENDPOINTS
# ===========================================================================

@app.get("/api/admin/devices")
def admin_list_devices(current_admin: dict = Depends(check_admin_user)):
    """
    GET /api/admin/devices
    Admin endpoint to view all registered devices across the platform.
    """
    devices = get_all_devices_admin_db()
    return {"success": True, "devices": devices}

@app.get("/api/admin/devices/{device_id}")
def admin_get_device_detail(device_id: str, current_admin: dict = Depends(check_admin_user)):
    """
    GET /api/admin/devices/{device_id}
    Admin endpoint to inspect device details and complete audit history.
    """
    dev = get_device_by_id(device_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found.")
    history = get_device_security_history_db(device_id=dev.get("device_id", device_id))
    safe_dev = dict(dev)
    safe_dev.pop("qr_token", None)
    safe_dev.pop("qr_token_hash", None)
    return {
        "success": True,
        "device": safe_dev,
        "history": history
    }

@app.post("/api/admin/devices/{device_id}/status")
def admin_update_device_status(device_id: str, data: AdminDeviceStatusUpdateSchema,
                               request: Request, current_admin: dict = Depends(check_admin_user)):
    """
    POST /api/admin/devices/{device_id}/status
    Admin status management (e.g. SUSPENDED, ACTIVE, DEACTIVATED).
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    dev = get_device_by_id(device_id)
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found.")

    update_device_status_db(device_id, data.deviceStatus, qr_status=data.qrStatus)
    record_device_security_event(
        device_id=dev.get("device_id", device_id),
        event_type=f"ADMIN_STATUS_CHANGE_{data.deviceStatus}",
        description=f"Admin {current_admin['email']} updated device status to {data.deviceStatus}. {data.notes or ''}",
        actor_email=current_admin["email"],
        ip_address=client_ip
    )
    return {"success": True, "message": f"Device status updated to {data.deviceStatus}."}




# ---------------------------------------------------------------------------
# Full-Stack React Frontend SPA Static File Handler
# ---------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist_dir = os.path.join(root_dir, "dist")
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_fullstack_spa(full_path: str = ""):
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="API route not found")
    
    current_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
    if full_path:
        target_path = os.path.join(current_dist, full_path)
        if os.path.exists(target_path) and os.path.isfile(target_path):
            return FileResponse(target_path)
    
    index_path = os.path.join(current_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return HTMLResponse(
        content="""<!DOCTYPE html><html><head><title>Payent API Backend</title></head>
        <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
        <div style="text-align:center; max-width:500px; padding:2rem; background:#1e293b; border-radius:1rem;">
        <h1 style="color:#38bdf8;">Payent API Backend Service</h1>
        <p>The FastAPI backend is online and connected to <strong>TiDB Cloud MySQL</strong>.</p>
        <p style="color:#94a3b8; font-size:0.9rem;">To access the full-stack interface, deploy the static frontend site on Render or run <code>npm run build</code>.</p>
        <a href="/api/health" style="color:#38bdf8;">Check API Health</a>
        </div></body></html>""",
        status_code=200
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)


