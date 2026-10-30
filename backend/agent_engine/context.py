"""
PAYENT AGENT — AUTHENTICATED SESSION CONTEXT
Defines the authoritative session context for all Payent Agent interactions.
Identity is derived strictly from verified JWT tokens or server authentication dependencies.
Never trusts email, role, or user ID supplied in chat messages or request payloads.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

from config import IS_PRODUCTION
from auth import decode_access_token
from database import get_user, is_token_revoked

logger = logging.getLogger("payent.agent.context")


def is_revocation_store_healthy() -> bool:
    """Verifies that the database backend for token revocation is reachable."""
    conn = None
    try:
        from database import get_db_connection
        conn = get_db_connection()
        if not conn:
            return False
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM token_blocklist LIMIT 1")
            cursor.fetchone()
        return True
    except Exception:
        return False
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


@dataclass
class AgentSessionContext:
    """
    Immutable security boundary for an agent conversation turn.
    Holds the authoritative identity and role permissions of the caller.
    """
    user_email: Optional[str] = None
    user_id: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "guest"
    account_type: str = "payrent"
    is_authenticated: bool = False
    is_admin: bool = False
    is_vendor: bool = False
    session_id: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def clean_email(self) -> str:
        return (self.user_email or "").strip().lower()

    def can_access_user_data(self, target_email: str) -> bool:
        """Determines if the session context is authorized to view a target user's records."""
        if not self.is_authenticated:
            return False
        if self.is_admin:
            return True
        clean_target = (target_email or "").strip().lower()
        return bool(self.clean_email and self.clean_email == clean_target)

    def can_access_booking(self, booking: Dict[str, Any]) -> bool:
        """
        Enforces strict booking ownership:
        - Admin can view any booking.
        - Renter can only view bookings where user_email matches their clean email.
        - Vendor can only view bookings for products they own (lender_email or vendor_id match).
        - Unauthenticated guests can view no bookings.
        """
        if not self.is_authenticated or not booking:
            return False
        if self.is_admin:
            return True

        renter_email = (booking.get("user_email") or booking.get("userEmail") or booking.get("renter_email") or "").strip().lower()
        if self.clean_email and self.clean_email == renter_email:
            return True

        lender_email = (booking.get("lender_email") or booking.get("lenderEmail") or booking.get("vendor_email") or "").strip().lower()
        if self.clean_email and self.clean_email == lender_email:
            return True

        vendor_id = str(booking.get("vendor_id") or booking.get("vendorId") or booking.get("owner_id") or "").strip()
        if self.user_id and vendor_id and str(self.user_id).strip() == vendor_id:
            return True

        return False

    def can_access_delivery(self, delivery: Dict[str, Any], booking: Optional[Dict[str, Any]] = None) -> bool:
        """Validates ownership on delivery and courier tracking records."""
        if not self.is_authenticated or not delivery:
            return False
        if self.is_admin:
            return True

        # Check through associated booking if provided
        if booking and self.can_access_booking(booking):
            return True

        del_cust = (delivery.get("customer_email") or delivery.get("user_email") or "").strip().lower()
        if self.clean_email and self.clean_email == del_cust:
            return True

        del_lender = (delivery.get("lender_email") or delivery.get("vendor_email") or "").strip().lower()
        if self.clean_email and self.clean_email == del_lender:
            return True

        return False


def create_guest_context(session_id: Optional[str] = None) -> AgentSessionContext:
    """Creates an unauthenticated guest session context."""
    import uuid
    sid = str(session_id).strip() if session_id else f"guest_sess_{uuid.uuid4().hex[:12]}"
    return AgentSessionContext(
        user_email=None,
        user_id=None,
        full_name="Guest Visitor",
        role="guest",
        account_type="payrent",
        is_authenticated=False,
        is_admin=False,
        is_vendor=False,
        session_id=sid,
        metadata={"auth_mode": "guest"}
    )


def from_auth_token(token: Optional[str], session_id: Optional[str] = None) -> AgentSessionContext:
    """
    Cryptographically validates a JWT token and constructs the authoritative session context.
    If the token is invalid, expired, or missing, safely falls back to a guest context.
    """
    if not token or not isinstance(token, str):
        return create_guest_context(session_id)

    raw_token = token.strip()
    if raw_token.lower().startswith("bearer "):
        raw_token = raw_token[7:].strip()

    decoded = decode_access_token(raw_token)
    if not decoded or not isinstance(decoded, dict):
        return create_guest_context(session_id)

    email = str(decoded.get("sub") or "").strip().lower()
    if not email or "@" not in email:
        return create_guest_context(session_id)

    jti = decoded.get("jti")
    if not jti:
        return create_guest_context(session_id)

    # In production, verify the database revocation store is accessible (fail-closed)
    if IS_PRODUCTION:
        if not is_revocation_store_healthy():
            logger.error("Token revocation store is unavailable in production. Authentication failed closed.")
            return create_guest_context(session_id)

    if is_token_revoked(jti):
        logger.warning("Revoked JWT token rejected")
        return create_guest_context(session_id)

    token_sid = decoded.get("sid")
    if token_sid:
        from database import is_session_revoked
        if is_session_revoked(token_sid):
            logger.warning("Revoked session in token rejected")
            return create_guest_context(session_id)

    # Fetch authoritative user record to ensure user exists and is active
    user_record = get_user(email) or {}
    user_status = str(user_record.get("status") or "active").lower().strip()
    if user_status in ("deleted", "suspended", "rejected"):
        # Rejected or suspended accounts are restricted to guest capabilities
        return create_guest_context(session_id)

    role = str(decoded.get("role") or user_record.get("role") or "customer").lower().strip()
    account_type = str(decoded.get("account_type") or user_record.get("account_type") or "payrent").lower().strip()
    user_id = str(decoded.get("user_id") or user_record.get("id") or "").strip() or None
    full_name = user_record.get("full_name") or user_record.get("name") or decoded.get("name") or email.split("@")[0]

    is_admin = role in ("admin", "superadmin")
    is_vendor = role in ("vendor", "lender") or account_type in ("paye₹nt", "payernt", "vendor", "lender")

    import uuid
    sid = str(session_id).strip() if session_id else f"auth_sess_{uuid.uuid4().hex[:12]}"

    return AgentSessionContext(
        user_email=email,
        user_id=user_id,
        full_name=full_name,
        role=role,
        account_type=account_type,
        is_authenticated=True,
        is_admin=is_admin,
        is_vendor=is_vendor,
        session_id=sid,
        metadata={"token_jti": jti, "auth_mode": "jwt"}
    )


def from_user_dict(user: Optional[Dict[str, Any]], session_id: Optional[str] = None) -> AgentSessionContext:
    """
    Constructs an authoritative session context directly from a verified FastAPI dependency result.
    """
    if not user or not isinstance(user, dict):
        return create_guest_context(session_id)

    email = str(user.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return create_guest_context(session_id)

    role = str(user.get("role") or "customer").lower().strip()
    account_type = str(user.get("account_type") or "payrent").lower().strip()
    user_id = str(user.get("id") or user.get("user_id") or "").strip() or None
    full_name = user.get("full_name") or user.get("name") or email.split("@")[0]

    is_admin = role in ("admin", "superadmin")
    is_vendor = role in ("vendor", "lender") or account_type in ("paye₹nt", "payernt", "vendor", "lender")

    import uuid
    sid = str(session_id).strip() if session_id else f"auth_sess_{uuid.uuid4().hex[:12]}"

    return AgentSessionContext(
        user_email=email,
        user_id=user_id,
        full_name=full_name,
        role=role,
        account_type=account_type,
        is_authenticated=True,
        is_admin=is_admin,
        is_vendor=is_vendor,
        session_id=sid,
        metadata={"auth_mode": "dependency"}
    )
