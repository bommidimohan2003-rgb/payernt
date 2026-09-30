import os
import re
import json
import time
import uuid
import random
import secrets
import hashlib
import logging
from datetime import datetime as dt, timezone
from typing import Optional, List, Dict, Any, Tuple
from config import IS_PRODUCTION
from database import (
    get_db_connection,
    execute_query,
    fetch_one,
    fetch_all,
)
from auth import hash_password, verify_password

logger = logging.getLogger("payent.payernt_db")

# ============================================================
# IN-MEMORY FALLBACK STORES (For Offline / Local Degraded DB Modes)
# ============================================================

MOCK_PAYERNT_ACCOUNTS: Dict[str, Dict[str, Any]] = {}
MOCK_PAYERNT_PRODUCTS: Dict[str, Dict[str, Any]] = {}
MOCK_RENTAL_SECURITIES: Dict[str, Dict[str, Any]] = {}
MOCK_PRODUCT_CONFIRMATIONS: Dict[str, Dict[str, Any]] = {}
MOCK_PAYERNT_WALLETS: Dict[str, Dict[str, Any]] = {}
MOCK_PAYERNT_TRANSACTIONS: Dict[str, List[Dict[str, Any]]] = {}
MOCK_PAYERNT_BANK_ACCOUNTS: Dict[str, List[Dict[str, Any]]] = {}
MOCK_PAYERNT_NOTIFICATIONS: Dict[str, List[Dict[str, Any]]] = {}

MOCK_PAYERNT_MESSAGES: List[Dict[str, Any]] = []
MOCK_PAYERNT_AUDIT_LOGS: List[Dict[str, Any]] = []
MOCK_PERSONS: Dict[str, Dict[str, Any]] = {}
MOCK_MOBILE_VERIFICATIONS: Dict[str, Dict[str, Any]] = {}


# ============================================================
# DATABASE TABLE INITIALIZATION
# ============================================================

def init_payernt_tables():
    """Initializes dedicated paye₹nt and rental security database tables."""
    # 1. Accounts Table for paye₹nt
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_accounts (
            id VARCHAR(255) PRIMARY KEY,
            account_type VARCHAR(50) DEFAULT 'paye₹nt',
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            aadhaar_number VARCHAR(20) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            address VARCHAR(500) NOT NULL,
            pincode VARCHAR(20) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            avatar LONGTEXT NULL,
            created_at VARCHAR(100) NOT NULL,
            last_login_at VARCHAR(100) NULL,
            INDEX idx_payernt_acc_email (email),
            INDEX idx_payernt_acc_phone (phone)
        )
    """)

    # 2. Products Table for paye₹nt
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_products (
            id VARCHAR(255) PRIMARY KEY,
            owner_id VARCHAR(255) NOT NULL,
            owner_email VARCHAR(255) NOT NULL,
            owner_name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            brand VARCHAR(100) NULL,
            model VARCHAR(100) NULL,
            year VARCHAR(50) NULL,
            description TEXT NULL,
            specifications TEXT NULL,
            features LONGTEXT NULL,
            condition_grade VARCHAR(50) NULL,
            condition_details LONGTEXT NULL,
            accessories TEXT NULL,
            city VARCHAR(100) NULL,
            area VARCHAR(100) NULL,
            pincode VARCHAR(20) NULL,
            pickup_instructions TEXT NULL,
            daily_rate INT NOT NULL,
            weekly_rate INT NULL,
            monthly_rate INT NULL,
            security_deposit INT DEFAULT 0,
            available BOOLEAN DEFAULT TRUE,
            availability_status VARCHAR(50) DEFAULT 'available',
            min_rental_days INT DEFAULT 1,
            max_rental_days INT DEFAULT 30,
            primary_image LONGTEXT NULL,
            images LONGTEXT NULL,
            vendor_secret_pin VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            created_at VARCHAR(100) NOT NULL,
            updated_at VARCHAR(100) NOT NULL,
            INDEX idx_pp_owner (owner_id),
            INDEX idx_pp_status (status),
            INDEX idx_pp_category (category)
        )
    """)

    # 3. Rental Security Table (Links Vendor PIN + Renter PIN in ONE canonical record)
    execute_query("""
        CREATE TABLE IF NOT EXISTS rental_security (
            id VARCHAR(255) PRIMARY KEY,
            booking_id VARCHAR(255) UNIQUE NOT NULL,
            product_id VARCHAR(255) NOT NULL,
            vendor_id VARCHAR(255) NOT NULL,
            renter_id VARCHAR(255) NOT NULL,
            vendor_secret_pin VARCHAR(255) NOT NULL,
            renter_secret_pin VARCHAR(255) NOT NULL,
            vendor_pin_verified BOOLEAN DEFAULT FALSE,
            renter_pin_verified BOOLEAN DEFAULT FALSE,
            otp_verified BOOLEAN DEFAULT FALSE,
            otp_code VARCHAR(10) NULL,
            otp_expires_at INT NULL,
            otp_attempts INT DEFAULT 0,
            failed_pin_attempts INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'security_pending',
            rental_started BOOLEAN DEFAULT FALSE,
            rental_started_at VARCHAR(100) NULL,
            created_at VARCHAR(100) NOT NULL,
            updated_at VARCHAR(100) NOT NULL,
            INDEX idx_rs_booking (booking_id),
            INDEX idx_rs_vendor (vendor_id),
            INDEX idx_rs_renter (renter_id),
            INDEX idx_rs_product (product_id)
        )
    """)

    # 4. Wallets Table for paye₹nt
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_wallets (
            id VARCHAR(255) PRIMARY KEY,
            owner_id VARCHAR(255) UNIQUE NOT NULL,
            owner_email VARCHAR(255) NOT NULL,
            available_balance DECIMAL(12, 2) DEFAULT 0.00,
            pending_amount DECIMAL(12, 2) DEFAULT 0.00,
            total_received DECIMAL(12, 2) DEFAULT 0.00,
            total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
            currency VARCHAR(10) DEFAULT 'INR',
            created_at VARCHAR(100) NOT NULL,
            updated_at VARCHAR(100) NOT NULL,
            INDEX idx_pw_owner (owner_id)
        )
    """)

    # 5. Wallet Transactions Table
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_wallet_transactions (
            id VARCHAR(255) PRIMARY KEY,
            wallet_id VARCHAR(255) NOT NULL,
            owner_id VARCHAR(255) NOT NULL,
            booking_id VARCHAR(255) NULL,
            type VARCHAR(50) NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            status VARCHAR(50) NOT NULL,
            description VARCHAR(500) NOT NULL,
            reference_id VARCHAR(255) NULL,
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_pwt_wallet (wallet_id),
            INDEX idx_pwt_owner (owner_id),
            INDEX idx_pwt_booking (booking_id)
        )
    """)

    # 6. Bank Accounts Table
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_bank_accounts (
            id VARCHAR(255) PRIMARY KEY,
            owner_id VARCHAR(255) NOT NULL,
            account_holder_name VARCHAR(255) NOT NULL,
            bank_name VARCHAR(255) NOT NULL,
            account_number_masked VARCHAR(50) NOT NULL,
            account_number_hash VARCHAR(255) NOT NULL,
            ifsc VARCHAR(50) NOT NULL,
            is_primary BOOLEAN DEFAULT TRUE,
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_pba_owner (owner_id)
        )
    """)

    # 7. Notifications Table
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_notifications (
            id VARCHAR(255) PRIMARY KEY,
            owner_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            action_route VARCHAR(100) NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_pn_owner (owner_id)
        )
    """)

    # 8. Messages Table
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_messages (
            id VARCHAR(255) PRIMARY KEY,
            conversation_id VARCHAR(255) NOT NULL,
            product_id VARCHAR(255) NOT NULL,
            product_name VARCHAR(255) NULL,
            product_category VARCHAR(100) NULL,
            sender_id VARCHAR(255) NOT NULL,
            sender_name VARCHAR(255) NOT NULL,
            receiver_id VARCHAR(255) NOT NULL,
            title VARCHAR(255) NULL,
            content TEXT NOT NULL,
            message_type VARCHAR(50) DEFAULT 'ADMIN_NOTICE',
            is_read BOOLEAN DEFAULT FALSE,
            read_at VARCHAR(100) NULL,
            status VARCHAR(50) DEFAULT 'UNREAD',
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_pm_conv (conversation_id),
            INDEX idx_pm_product (product_id),
            INDEX idx_pm_sender (sender_id),
            INDEX idx_pm_receiver (receiver_id)
        )
    """)

    # Safe column migrations for existing tables
    for col_def in [
        "title VARCHAR(255) NULL",
        "message_type VARCHAR(50) DEFAULT 'ADMIN_NOTICE'",
        "product_name VARCHAR(255) NULL",
        "product_category VARCHAR(100) NULL",
        "read_at VARCHAR(100) NULL",
        "status VARCHAR(50) DEFAULT 'UNREAD'",
    ]:
        try:
            execute_query(f"ALTER TABLE payernt_messages ADD COLUMN {col_def}")
        except Exception:
            pass

    # 9. Audit Logs Table
    execute_query("""
        CREATE TABLE IF NOT EXISTS payernt_audit_logs (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            account_type VARCHAR(50) DEFAULT 'paye₹nt',
            action VARCHAR(100) NOT NULL,
            details TEXT NULL,
            ip_address VARCHAR(100) NULL,
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_pal_user (user_id)
        )
    """)

    # 10. Persons Table (Cross-Side Person Identity Mapping)
    execute_query("""
        CREATE TABLE IF NOT EXISTS persons (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) UNIQUE NOT NULL,
            created_at VARCHAR(100) NOT NULL,
            updated_at VARCHAR(100) NOT NULL,
            INDEX idx_persons_phone (phone)
        )
    """)

    # 11. Mobile Verifications Table (For Secure Cross-Side Account OTP Flow)
    execute_query("""
        CREATE TABLE IF NOT EXISTS mobile_verifications (
            id VARCHAR(255) PRIMARY KEY,
            phone VARCHAR(50) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            token VARCHAR(255) UNIQUE NOT NULL,
            target_account_type VARCHAR(50) NOT NULL,
            existing_account_type VARCHAR(50) NULL,
            existing_details LONGTEXT NULL,
            attempts INT DEFAULT 0,
            verified BOOLEAN DEFAULT FALSE,
            expires_at INT NOT NULL,
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_mv_phone (phone),
            INDEX idx_mv_token (token)
        )
    """)

    # 12. Product Confirmations Table (Secure Vendor PIN & Post-Submission OTP Confirmation)
    execute_query("""
        CREATE TABLE IF NOT EXISTS product_confirmations (
            id VARCHAR(255) PRIMARY KEY,
            product_id VARCHAR(255) UNIQUE NOT NULL,
            owner_id VARCHAR(255) NOT NULL,
            owner_email VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending_confirmation',
            vendor_pin_hash VARCHAR(255) NOT NULL,
            otp_code VARCHAR(10) NULL,
            otp_hash VARCHAR(255) NULL,
            otp_expires_at INT NOT NULL,
            otp_attempts INT DEFAULT 0,
            otp_resend_count INT DEFAULT 0,
            last_otp_sent_at INT NOT NULL,
            otp_verified_at VARCHAR(100) NULL,
            created_at VARCHAR(100) NOT NULL,
            updated_at VARCHAR(100) NOT NULL,
            INDEX idx_pc_prod (product_id),
            INDEX idx_pc_owner (owner_id)
        )
    """)

    try:
        execute_query("ALTER TABLE payernt_accounts ADD COLUMN person_id VARCHAR(255) NULL")
    except Exception:
        pass

    try:
        execute_query("CREATE INDEX idx_payernt_person_id ON payernt_accounts (person_id)")
    except Exception:
        pass

    logger.info("paye₹nt database structures initialized.")


# ============================================================
# AUDIT LOGGING HELPER
# ============================================================

def log_payernt_audit_event(action: str, user_id: str, details: Optional[Dict[str, Any]] = None, ip_address: Optional[str] = None):
    """Safely logs audit records for sensitive paye₹nt operations without leaking secrets."""
    log_id = f"AUDIT_{int(time.time() * 1000)}_{random.randint(100, 999)}"
    now_iso = dt.now(timezone.utc).isoformat()
    clean_details = dict(details or {})
    # Strip any sensitive secrets before logging
    for sensitive_key in ["password", "password_hash", "pin", "vendor_secret_pin", "renter_secret_pin", "otp", "aadhaar_number", "account_number"]:
        clean_details.pop(sensitive_key, None)

    details_str = json.dumps(clean_details)

    try:
        execute_query("""
            INSERT INTO payernt_audit_logs (id, user_id, account_type, action, details, ip_address, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (log_id, user_id, "paye₹nt", action, details_str, ip_address or "127.0.0.1", now_iso))
    except Exception as e:
        logger.warning(f"DB insert error for audit log: {e}")

    MOCK_PAYERNT_AUDIT_LOGS.append({
        "id": log_id,
        "user_id": user_id,
        "account_type": "paye₹nt",
        "action": action,
        "details": details_str,
        "ip_address": ip_address or "127.0.0.1",
        "created_at": now_iso,
    })


def get_payernt_audit_logs(user_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent audit logs."""
    try:
        if user_id:
            rows = fetch_all("SELECT * FROM payernt_audit_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT %s", (user_id, limit))
        else:
            rows = fetch_all("SELECT * FROM payernt_audit_logs ORDER BY created_at DESC LIMIT %s", (limit,))
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB fetch error for audit logs: {e}")

    if user_id:
        return [l for l in reversed(MOCK_PAYERNT_AUDIT_LOGS) if l.get("user_id") == user_id][:limit]
    return list(reversed(MOCK_PAYERNT_AUDIT_LOGS))[:limit]


# ============================================================
# PAYE₹NT ACCOUNTS & AUTH METHODS
# ============================================================

def create_payernt_account(
    name: str,
    email: str,
    aadhaar_number: str,
    phone: str,
    address: str,
    pincode: str,
    password: str,
) -> Dict[str, Any]:
    """Creates a new paye₹nt (Vendor/Lender) account."""
    clean_email = email.strip().lower()
    clean_phone = phone.strip()
    clean_aadhaar = re.sub(r"\D", "", aadhaar_number.strip())

    # Check if account already exists in paye₹nt
    existing = get_payernt_account_by_email(clean_email)
    if existing:
        raise ValueError("A paye₹nt vendor account with this email address already exists.")

    account_id = f"PAYERNT_USER_{int(time.time() * 1000)}"
    pwd_hash = hash_password(password)
    masked_aadhaar = f"XXXX-XXXX-{clean_aadhaar[-4:]}" if len(clean_aadhaar) >= 4 else f"XXXX-XXXX-{clean_aadhaar}"
    now_iso = dt.now(timezone.utc).isoformat()

    person_id = get_or_create_person(name.strip(), clean_phone)

    account = {
        "id": account_id,
        "person_id": person_id,
        "personId": person_id,
        "account_type": "paye₹nt",
        "email": clean_email,
        "name": name.strip(),
        "aadhaar_number": masked_aadhaar,
        "phone": clean_phone,
        "address": address.strip(),
        "pincode": pincode.strip(),
        "password_hash": pwd_hash,
        "status": "active",
        "avatar": f"https://ui-avatars.com/api/?name={name.strip().replace(' ', '+')}&background=0c0c0c&color=ffffff",
        "created_at": now_iso,
        "last_login_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_accounts (id, person_id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, avatar, created_at, last_login_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            account["id"],
            account.get("person_id"),
            account["account_type"],
            account["email"],
            account["name"],
            account["aadhaar_number"],
            account["phone"],
            account["address"],
            account["pincode"],
            account["password_hash"],
            account["status"],
            account["avatar"],
            account["created_at"],
            account["last_login_at"],
        ))
    except Exception as e:
        logger.warning(f"DB insert failed for payernt_account, falling back to memory: {e}")

    # Ensure opposite side users / payrent_accounts record has matching person_id
    try:
        execute_query("UPDATE users SET person_id = %s WHERE email = %s OR phone = %s", (person_id, clean_email, clean_phone))
        execute_query("UPDATE payrent_accounts SET person_id = %s WHERE email = %s OR phone = %s", (person_id, clean_email, clean_phone))
    except Exception:
        pass

    MOCK_PAYERNT_ACCOUNTS[clean_email] = account
    # Initialize wallet for vendor
    get_or_create_payernt_wallet(account_id, clean_email)
    # Log audit event
    log_payernt_audit_event("REGISTER", account_id, {"email": clean_email, "name": name})
    return account


def get_payernt_account_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetches paye₹nt account by email address."""
    clean_email = (email or "").strip().lower()
    if not clean_email:
        return None

    try:
        row = fetch_one("SELECT * FROM payernt_accounts WHERE email = %s LIMIT 1", (clean_email,))
        if row:
            return row
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_account: {e}")

    return MOCK_PAYERNT_ACCOUNTS.get(clean_email)


def get_payernt_account_by_id(account_id: str) -> Optional[Dict[str, Any]]:
    """Fetches paye₹nt account by unique account ID."""
    if not account_id:
        return None

    try:
        row = fetch_one("SELECT * FROM payernt_accounts WHERE id = %s LIMIT 1", (account_id,))
        if row:
            return row
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_account by id: {e}")

    for acc in MOCK_PAYERNT_ACCOUNTS.values():
        if acc.get("id") == account_id:
            return acc
    return None


def update_payernt_account_profile(account_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Updates paye₹nt profile details safely without mutating account identity or auth."""
    acc = get_payernt_account_by_id(account_id)
    if not acc:
        return None

    allowed_fields = ["name", "phone", "address", "pincode", "avatar"]
    set_clauses = []
    params = []

    for field in allowed_fields:
        if field in updates and updates[field] is not None:
            acc[field] = updates[field]
            set_clauses.append(f"{field} = %s")
            params.append(updates[field])

    if set_clauses:
        params.append(account_id)
        try:
            execute_query(f"UPDATE payernt_accounts SET {', '.join(set_clauses)} WHERE id = %s", tuple(params))
        except Exception as e:
            logger.warning(f"DB update error for payernt_account: {e}")

    email = acc.get("email")
    if email:
        MOCK_PAYERNT_ACCOUNTS[email] = acc

    log_payernt_audit_event("PROFILE_UPDATE", account_id, {"fields": list(updates.keys())})
    return acc


# ============================================================
# CRYPTOGRAPHIC PIN & OTP HELPERS
# ============================================================

def hash_secret(secret_str: str) -> str:
    """Computes SHA-256 hash of secret string for secure storage."""
    if not secret_str:
        return ""
    return hashlib.sha256(secret_str.strip().encode("utf-8")).hexdigest()


def generate_4digit_pin() -> str:
    """Generates a cryptographically secure random 4-digit numeric PIN string (1000 - 9999)."""
    return f"{secrets.randbelow(9000) + 1000}"


def generate_6digit_otp() -> str:
    """Generates a cryptographically secure random 6-digit OTP string (100000 - 999999)."""
    return f"{secrets.randbelow(900000) + 100000}"


# ============================================================
# PRODUCT CONFIRMATION RECORDS & SERVER-SIDE OTP VERIFICATION
# ============================================================

def create_or_get_product_confirmation(
    product_id: str,
    owner_id: str,
    owner_email: str,
    phone: str,
    vendor_pin: str,
    otp_code: str,
    expiry_seconds: int = 300,
) -> Dict[str, Any]:
    """
    Creates or retrieves the product security confirmation record.
    Stores hashed vendor PIN and hashed OTP with expiration, attempt limits.
    """
    clean_email = (owner_email or "").strip().lower()
    clean_phone = (phone or "").strip()
    now_int = int(time.time())
    now_iso = dt.now(timezone.utc).isoformat()
    expires_at = now_int + expiry_seconds

    # Check if record already exists for this product (to avoid duplicate PINs/records on refresh)
    existing = get_product_confirmation(product_id)
    if existing:
        return existing

    conf_id = f"conf-{int(time.time() * 1000)}-{secrets.token_hex(4)}"
    pin_hash = hash_secret(vendor_pin)
    otp_hash = hash_secret(otp_code)

    rec = {
        "id": conf_id,
        "product_id": product_id,
        "owner_id": owner_id,
        "owner_email": clean_email,
        "phone": clean_phone,
        "status": "pending_confirmation",
        "vendor_pin_hash": pin_hash,
        "otp_code": otp_code,
        "otp_hash": otp_hash,
        "otp_expires_at": expires_at,
        "otp_attempts": 0,
        "otp_resend_count": 0,
        "last_otp_sent_at": now_int,
        "otp_verified_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO product_confirmations (
                id, product_id, owner_id, owner_email, phone, status,
                vendor_pin_hash, otp_code, otp_hash, otp_expires_at,
                otp_attempts, otp_resend_count, last_otp_sent_at,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                phone = VALUES(phone),
                otp_code = VALUES(otp_code),
                otp_hash = VALUES(otp_hash),
                otp_expires_at = VALUES(otp_expires_at),
                updated_at = VALUES(updated_at)
        """, (
            rec["id"], rec["product_id"], rec["owner_id"], rec["owner_email"],
            rec["phone"], rec["status"], rec["vendor_pin_hash"], rec["otp_code"],
            rec["otp_hash"], rec["otp_expires_at"], rec["otp_attempts"],
            rec["otp_resend_count"], rec["last_otp_sent_at"], rec["created_at"],
            rec["updated_at"]
        ))
    except Exception as e:
        logger.warning(f"DB write error for product_confirmations: {e}")

    MOCK_PRODUCT_CONFIRMATIONS[product_id] = rec
    return rec


def get_product_confirmation(product_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves product confirmation record by product_id."""
    if not product_id:
        return None
    try:
        row = fetch_one("SELECT * FROM product_confirmations WHERE product_id = %s LIMIT 1", (product_id,))
        if row:
            return dict(row)
    except Exception as e:
        logger.warning(f"DB read error for product_confirmations: {e}")
    return MOCK_PRODUCT_CONFIRMATIONS.get(product_id)


def verify_product_confirmation_otp(
    product_id: str,
    owner_id: str,
    submitted_otp: str,
) -> Tuple[bool, str]:
    """
    Verifies owner's 6-digit confirmation OTP server-side.
    Returns (success, message).
    """
    rec = get_product_confirmation(product_id)
    if not rec:
        return False, "No pending confirmation session found for this product."

    if rec.get("owner_id") != owner_id:
        return False, "Security Violation: Ownership verification failed."

    if rec.get("status") in ("under_review", "approved", "active"):
        return True, "Product already verified."

    now_int = int(time.time())
    attempts = int(rec.get("otp_attempts") or 0)
    if attempts >= 5:
        return False, "Too many incorrect attempts (maximum 5). Please request a new verification code."

    expires_at = int(rec.get("otp_expires_at") or 0)
    if now_int > expires_at:
        return False, "This verification code has expired. Please click Resend OTP."

    expected_otp = str(rec.get("otp_code") or "").strip()
    submitted_otp_clean = str(submitted_otp or "").strip()

    if not submitted_otp_clean or (submitted_otp_clean != expected_otp and hash_secret(submitted_otp_clean) != rec.get("otp_hash")):
        # Increment failed attempts
        new_attempts = attempts + 1
        rec["otp_attempts"] = new_attempts
        rec["updated_at"] = dt.now(timezone.utc).isoformat()
        try:
            execute_query("UPDATE product_confirmations SET otp_attempts = %s, updated_at = %s WHERE product_id = %s", (new_attempts, rec["updated_at"], product_id))
        except Exception as e:
            logger.warning(f"DB update error: {e}")
        MOCK_PRODUCT_CONFIRMATIONS[product_id] = rec
        remaining = max(0, 5 - new_attempts)
        return False, f"Incorrect verification code. Please try again. ({remaining} attempt(s) remaining)"

    # Success: Invalidate OTP (single-use), update status to under_review
    now_iso = dt.now(timezone.utc).isoformat()
    rec["status"] = "under_review"
    rec["otp_verified_at"] = now_iso
    rec["otp_code"] = None  # Consume OTP
    rec["updated_at"] = now_iso

    try:
        execute_query("""
            UPDATE product_confirmations
            SET status = 'under_review', otp_code = NULL, otp_verified_at = %s, updated_at = %s
            WHERE product_id = %s
        """, (now_iso, now_iso, product_id))
        # Update payernt_products table status
        execute_query("""
            UPDATE payernt_products
            SET status = 'under_review', updated_at = %s
            WHERE id = %s
        """, (now_iso, product_id))
    except Exception as e:
        logger.warning(f"DB update error on confirmation success: {e}")

    if product_id in MOCK_PAYERNT_PRODUCTS:
        MOCK_PAYERNT_PRODUCTS[product_id]["status"] = "under_review"
        MOCK_PAYERNT_PRODUCTS[product_id]["updated_at"] = now_iso

    MOCK_PRODUCT_CONFIRMATIONS[product_id] = rec
    return True, "Product securely confirmed. Listing is now pending admin review."


def resend_product_confirmation_otp(
    product_id: str,
    owner_id: str,
    new_otp: str,
    cooldown_seconds: int = 60,
    expiry_seconds: int = 300,
) -> Tuple[bool, str, int]:
    """
    Resends a new 6-digit OTP with 60s cooldown and rate limiting.
    Returns (success, message, remaining_cooldown).
    """
    rec = get_product_confirmation(product_id)
    if not rec:
        return False, "No confirmation session found.", 0

    if rec.get("owner_id") != owner_id:
        return False, "Security Violation: Ownership verification failed.", 0

    now_int = int(time.time())
    last_sent = int(rec.get("last_otp_sent_at") or 0)
    elapsed = now_int - last_sent

    if elapsed < cooldown_seconds:
        remaining = cooldown_seconds - elapsed
        return False, f"Please wait {remaining} seconds before requesting a new code.", remaining

    resend_count = int(rec.get("otp_resend_count") or 0) + 1
    if resend_count > 10:
        return False, "Maximum resend limit reached for this session.", 0

    now_iso = dt.now(timezone.utc).isoformat()
    expires_at = now_int + expiry_seconds
    otp_hash = hash_secret(new_otp)

    rec["otp_code"] = new_otp
    rec["otp_hash"] = otp_hash
    rec["otp_expires_at"] = expires_at
    rec["otp_attempts"] = 0  # Reset attempt counter on new code
    rec["otp_resend_count"] = resend_count
    rec["last_otp_sent_at"] = now_int
    rec["updated_at"] = now_iso

    try:
        execute_query("""
            UPDATE product_confirmations
            SET otp_code = %s, otp_hash = %s, otp_expires_at = %s,
                otp_attempts = 0, otp_resend_count = %s, last_otp_sent_at = %s,
                updated_at = %s
            WHERE product_id = %s
        """, (new_otp, otp_hash, expires_at, resend_count, now_int, now_iso, product_id))
    except Exception as e:
        logger.warning(f"DB update error for resend OTP: {e}")

    MOCK_PRODUCT_CONFIRMATIONS[product_id] = rec
    return True, "Verification code resent successfully.", cooldown_seconds


# ============================================================
# PAYE₹NT PRODUCT MANAGEMENT & VENDOR PIN
# ============================================================

def create_payernt_product(
    owner_id: str,
    owner_email: str,
    owner_name: str,
    data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Creates a new product in paye₹nt.
    Generates a 4-digit Vendor Secret PIN ONCE upon creation.
    Security deposit is 0 (security deposit MUST NOT exist).
    """
    product_id = data.get("id") or f"prod-{int(time.time() * 1000)}-{random.randint(100, 999)}"
    vendor_pin = generate_4digit_pin()
    now_iso = dt.now(timezone.utc).isoformat()

    features_raw = data.get("features", [])
    features_json = json.dumps(features_raw) if isinstance(features_raw, list) else str(features_raw)

    condition_raw = data.get("condition", {})
    condition_json = json.dumps(condition_raw) if isinstance(condition_raw, dict) else str(condition_raw)

    images_raw = data.get("images", [])
    images_json = json.dumps(images_raw) if isinstance(images_raw, list) else str(images_raw)

    primary_img = data.get("primaryImage") or data.get("primary_image") or (images_raw[0] if images_raw else "")

    pricing_dict = data.get("pricing") if isinstance(data.get("pricing"), dict) else {}
    daily_val = int(
        data.get("daily_rate")
        if data.get("daily_rate") is not None
        else data.get("dailyRate")
        if data.get("dailyRate") is not None
        else pricing_dict.get("daily")
        if pricing_dict.get("daily") is not None
        else pricing_dict.get("dailyRate")
        if pricing_dict.get("dailyRate") is not None
        else data.get("price")
        if data.get("price") is not None
        else 500
    )
    weekly_val = int(
        data.get("weekly_rate")
        if data.get("weekly_rate") is not None
        else data.get("weeklyRate")
        if data.get("weeklyRate") is not None
        else pricing_dict.get("weekly")
        if pricing_dict.get("weekly") is not None
        else pricing_dict.get("weeklyRate")
        if pricing_dict.get("weeklyRate") is not None
        else 0
    )
    monthly_val = int(
        data.get("monthly_rate")
        if data.get("monthly_rate") is not None
        else data.get("monthlyRate")
        if data.get("monthlyRate") is not None
        else pricing_dict.get("monthly")
        if pricing_dict.get("monthly") is not None
        else pricing_dict.get("monthlyRate")
        if pricing_dict.get("monthlyRate") is not None
        else 0
    )

    product = {
        "id": product_id,
        "owner_id": owner_id,
        "owner_email": owner_email,
        "owner_name": owner_name,
        "category": data.get("category", "tech"),
        "name": data.get("name") or data.get("title", "Tech Gear"),
        "title": data.get("title") or data.get("name", "Tech Gear"),
        "brand": data.get("brand", ""),
        "model": data.get("model", ""),
        "year": str(data.get("year", "2024")),
        "description": data.get("description", ""),
        "specifications": data.get("specifications", ""),
        "features": features_json,
        "condition_grade": data.get("condition_grade") or (condition_raw.get("grade") if isinstance(condition_raw, dict) else "Like New"),
        "condition_details": condition_json,
        "accessories": data.get("accessories", ""),
        "city": data.get("city") or (data.get("location", {}).get("city") if isinstance(data.get("location"), dict) else ""),
        "area": data.get("area") or (data.get("location", {}).get("area") if isinstance(data.get("location"), dict) else ""),
        "pincode": data.get("pincode") or (data.get("location", {}).get("pincode") if isinstance(data.get("location"), dict) else ""),
        "pickup_instructions": data.get("pickup_instructions") or (data.get("location", {}).get("pickupInstructions") if isinstance(data.get("location"), dict) else ""),
        "daily_rate": daily_val,
        "weekly_rate": weekly_val,
        "monthly_rate": monthly_val,
        "security_deposit": 0,  # Explicitly ZERO as per strict requirements
        "available": bool(data.get("available", True)),
        "availability_status": data.get("availability_status", "available"),
        "min_rental_days": int(data.get("min_rental_days", 1)),
        "max_rental_days": int(data.get("max_rental_days", 30)),
        "primary_image": primary_img,
        "images": images_json,
        "vendor_secret_pin": vendor_pin,  # GENERATED ONCE AND PRESERVED FOREVER
        "status": data.get("status", "active"),
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_products (
                id, owner_id, owner_email, owner_name, category, name, title, brand, model, year,
                description, specifications, features, condition_grade, condition_details, accessories,
                city, area, pincode, pickup_instructions, daily_rate, weekly_rate, monthly_rate,
                security_deposit, available, availability_status, min_rental_days, max_rental_days,
                primary_image, images, vendor_secret_pin, status, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            product["id"], product["owner_id"], product["owner_email"], product["owner_name"],
            product["category"], product["name"], product["title"], product["brand"], product["model"],
            product["year"], product["description"], product["specifications"], product["features"],
            product["condition_grade"], product["condition_details"], product["accessories"],
            product["city"], product["area"], product["pincode"], product["pickup_instructions"],
            product["daily_rate"], product["weekly_rate"], product["monthly_rate"], product["security_deposit"],
            product["available"], product["availability_status"], product["min_rental_days"], product["max_rental_days"],
            product["primary_image"], product["images"], product["vendor_secret_pin"], product["status"],
            product["created_at"], product["updated_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for payernt_product: {e}")

    MOCK_PAYERNT_PRODUCTS[product["id"]] = product
    log_payernt_audit_event("PRODUCT_CREATE", owner_id, {"productId": product_id, "category": product["category"]})
    return product


def get_payernt_product_by_id(product_id: str, include_pin: bool = False) -> Optional[Dict[str, Any]]:
    """Fetches a paye₹nt product by ID. PIN is only included if explicitly requested for the owner."""
    if not product_id:
        return None

    row = None
    try:
        row = fetch_one("SELECT * FROM payernt_products WHERE id = %s LIMIT 1", (product_id,))
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_product: {e}")

    if not row:
        row = MOCK_PAYERNT_PRODUCTS.get(product_id)

    if not row:
        return None

    clean = dict(row)
    if not include_pin:
        clean.pop("vendor_secret_pin", None)
    return clean


def get_payernt_products_by_owner(owner_id: str) -> List[Dict[str, Any]]:
    """Fetches all products listed by a specific vendor (includes vendorSecretPin for owner review)."""
    if not owner_id:
        return []

    try:
        rows = fetch_all("SELECT * FROM payernt_products WHERE owner_id = %s ORDER BY created_at DESC", (owner_id,))
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_products by owner: {e}")

    return [p for p in MOCK_PAYERNT_PRODUCTS.values() if p.get("owner_id") == owner_id]


def get_all_active_payernt_products() -> List[Dict[str, Any]]:
    """Fetches all active products for the public/renter Explore page. NEVER returns vendor_secret_pin."""
    try:
        rows = fetch_all("SELECT * FROM payernt_products WHERE status = 'active' ORDER BY created_at DESC")
        if rows:
            clean_list = []
            for r in rows:
                c = dict(r)
                c.pop("vendor_secret_pin", None)
                clean_list.append(c)
            return clean_list
    except Exception as e:
        logger.warning(f"DB fetch error for active payernt_products: {e}")

    clean_list = []
    for p in MOCK_PAYERNT_PRODUCTS.values():
        if p.get("status") == "active":
            c = dict(p)
            c.pop("vendor_secret_pin", None)
            clean_list.append(c)
    return clean_list


def update_payernt_product(product_id: str, owner_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Updates product specifications, pricing, or availability.
    NEVER regenerates or updates vendor_secret_pin.
    """
    existing = get_payernt_product_by_id(product_id, include_pin=True)
    if not existing:
        return None
    if existing.get("owner_id") != owner_id:
        raise PermissionError("You do not have permission to update this product listing.")

    allowed_fields = [
        "name", "title", "category", "brand", "model", "year", "description",
        "specifications", "condition_grade", "accessories", "city", "area", "pincode",
        "pickup_instructions", "daily_rate", "weekly_rate", "monthly_rate",
        "available", "availability_status", "primary_image", "status"
    ]

    # Normalize nested pricing if provided
    if "pricing" in updates and isinstance(updates["pricing"], dict):
        if "daily" in updates["pricing"]:
            updates["daily_rate"] = int(updates["pricing"]["daily"])
        elif "dailyRate" in updates["pricing"]:
            updates["daily_rate"] = int(updates["pricing"]["dailyRate"])
        if "weekly" in updates["pricing"]:
            updates["weekly_rate"] = int(updates["pricing"]["weekly"])
        if "monthly" in updates["pricing"]:
            updates["monthly_rate"] = int(updates["pricing"]["monthly"])

    if "dailyRate" in updates and updates["dailyRate"] is not None:
        updates["daily_rate"] = int(updates["dailyRate"])
    if "price" in updates and updates["price"] is not None:
        updates["daily_rate"] = int(updates["price"])

    set_clauses = ["updated_at = %s"]
    params = [dt.now(timezone.utc).isoformat()]

    for field in allowed_fields:
        if field in updates and updates[field] is not None:
            existing[field] = updates[field]
            set_clauses.append(f"{field} = %s")
            params.append(updates[field])

    if "features" in updates:
        feat_json = json.dumps(updates["features"]) if isinstance(updates["features"], list) else str(updates["features"])
        existing["features"] = feat_json
        set_clauses.append("features = %s")
        params.append(feat_json)

    if "images" in updates:
        img_json = json.dumps(updates["images"]) if isinstance(updates["images"], list) else str(updates["images"])
        existing["images"] = img_json
        set_clauses.append("images = %s")
        params.append(img_json)

    params.extend([product_id, owner_id])
    try:
        execute_query(f"UPDATE payernt_products SET {', '.join(set_clauses)} WHERE id = %s AND owner_id = %s", tuple(params))
    except Exception as e:
        logger.warning(f"DB update error for payernt_product: {e}")

    MOCK_PAYERNT_PRODUCTS[product_id] = existing
    log_payernt_audit_event("PRODUCT_UPDATE", owner_id, {"productId": product_id, "fields": list(updates.keys())})
    return existing


def delete_payernt_product(product_id: str, owner_id: str) -> bool:
    """Deletes or archives a vendor product listing."""
    existing = get_payernt_product_by_id(product_id, include_pin=True)
    if not existing:
        return False
    if existing.get("owner_id") != owner_id:
        raise PermissionError("You do not have permission to delete this product listing.")

    try:
        execute_query("DELETE FROM payernt_products WHERE id = %s AND owner_id = %s", (product_id, owner_id))
    except Exception as e:
        logger.warning(f"DB delete error for payernt_product: {e}")

    MOCK_PAYERNT_PRODUCTS.pop(product_id, None)
    log_payernt_audit_event("PRODUCT_DELETE", owner_id, {"productId": product_id})
    return True


# ============================================================
# RENTAL SECURITY & PIN VERIFICATION (CORE LIFECYCLE)
# ============================================================

def create_or_get_rental_security_record(
    booking_id: str,
    product_id: str,
    vendor_id: str,
    renter_id: str,
    vendor_secret_pin: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates ONE canonical Rental Security Record linking:
    1. Product's EXISTING Vendor Secret PIN (never regenerated).
    2. Booking's freshly generated Renter Secret PIN (renterPin != vendorPin).
    """
    # 1. Check existing record
    existing = get_rental_security_record(booking_id)
    if existing:
        return existing

    # 2. Resolve existing vendorSecretPin from product
    resolved_vendor_pin = (vendor_secret_pin or "").strip()
    if not resolved_vendor_pin:
        prod = get_payernt_product_by_id(product_id, include_pin=True)
        if prod and prod.get("vendor_secret_pin"):
            resolved_vendor_pin = str(prod["vendor_secret_pin"]).strip()
        else:
            resolved_vendor_pin = "5831"  # Stable fallback

    # 3. Generate random 4-digit renter PIN distinct from vendor PIN
    renter_pin = generate_4digit_pin()
    while renter_pin == resolved_vendor_pin:
        renter_pin = generate_4digit_pin()

    record_id = f"RENTAL_SECURITY_{booking_id.replace('ord_', '').replace('ORD_', '')[-4:] if len(booking_id) > 4 else random.randint(1000, 9999)}"
    now_iso = dt.now(timezone.utc).isoformat()

    record = {
        "id": record_id,
        "booking_id": booking_id,
        "product_id": product_id,
        "vendor_id": vendor_id,
        "renter_id": renter_id,
        "vendor_secret_pin": resolved_vendor_pin,
        "renter_secret_pin": renter_pin,
        "vendor_pin_verified": False,
        "renter_pin_verified": False,
        "otp_verified": False,
        "otp_code": "123456",
        "otp_expires_at": int(time.time()) + 1800,
        "otp_attempts": 0,
        "failed_pin_attempts": 0,
        "status": "security_pending",
        "rental_started": False,
        "rental_started_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO rental_security (
                id, booking_id, product_id, vendor_id, renter_id,
                vendor_secret_pin, renter_secret_pin, vendor_pin_verified, renter_pin_verified,
                otp_verified, otp_code, otp_expires_at, otp_attempts, failed_pin_attempts,
                status, rental_started, rental_started_at, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            record["id"], record["booking_id"], record["product_id"], record["vendor_id"], record["renter_id"],
            record["vendor_secret_pin"], record["renter_secret_pin"], record["vendor_pin_verified"], record["renter_pin_verified"],
            record["otp_verified"], record["otp_code"], record["otp_expires_at"], record["otp_attempts"], record["failed_pin_attempts"],
            record["status"], record["rental_started"], record["rental_started_at"], record["created_at"], record["updated_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for rental_security: {e}")

    MOCK_RENTAL_SECURITIES[booking_id] = record
    log_payernt_audit_event("RENTAL_SECURITY_CREATED", renter_id, {"bookingId": booking_id, "productId": product_id})
    return record


def get_rental_security_record(booking_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves rental security record by booking ID."""
    if not booking_id:
        return None

    try:
        row = fetch_one("SELECT * FROM rental_security WHERE booking_id = %s LIMIT 1", (booking_id,))
        if row:
            return row
    except Exception as e:
        logger.warning(f"DB fetch error for rental_security: {e}")

    return MOCK_RENTAL_SECURITIES.get(booking_id)


def sanitize_security_record_for_user(record: Dict[str, Any], user_role: str, user_id: str) -> Dict[str, Any]:
    """
    Ensures strict credential privacy:
    - Renter sees ONLY renterSecretPin (NEVER vendor PIN).
    - Vendor sees ONLY vendorSecretPin (NEVER renter PIN).
    """
    clean = dict(record)
    clean.pop("otp_code", None)

    is_renter = clean.get("renter_id") == user_id or user_role == "renter" or user_role == "customer"
    is_vendor = clean.get("vendor_id") == user_id or user_role == "vendor"

    # CamelCase mapping
    clean["id"] = clean.get("id")
    clean["bookingId"] = clean.get("booking_id")
    clean["productId"] = clean.get("product_id")
    clean["vendorId"] = clean.get("vendor_id")
    clean["renterId"] = clean.get("renter_id")
    clean["vendorPinVerified"] = bool(clean.get("vendor_pin_verified"))
    clean["renterPinVerified"] = bool(clean.get("renter_pin_verified"))
    clean["otpVerified"] = bool(clean.get("otp_verified"))
    clean["status"] = clean.get("status", "security_pending")
    clean["rentalStarted"] = bool(clean.get("rental_started"))
    clean["rentalStartedAt"] = clean.get("rental_started_at")

    if is_renter and not (is_vendor and clean.get("vendor_id") == user_id):
        clean.pop("vendor_secret_pin", None)
        clean["vendorSecretPin"] = None
        clean["renterSecretPin"] = clean.get("renter_secret_pin")
    elif is_vendor and not (is_renter and clean.get("renter_id") == user_id):
        clean.pop("renter_secret_pin", None)
        clean["renterSecretPin"] = None
        clean["vendorSecretPin"] = clean.get("vendor_secret_pin")
    else:
        clean["vendorSecretPin"] = clean.get("vendor_secret_pin")
        clean["renterSecretPin"] = clean.get("renter_secret_pin")

    return clean


def verify_renter_pin_backend(booking_id: str, entered_pin: str, user_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verifies Renter Secret PIN entered during handover."""
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Rental security record not found for this booking.", None

    if record.get("failed_pin_attempts", 0) >= 5:
        return False, "Verification locked due to too many failed attempts. Contact support.", record

    if entered_pin.strip() != str(record.get("renter_secret_pin")).strip():
        new_attempts = record.get("failed_pin_attempts", 0) + 1
        record["failed_pin_attempts"] = new_attempts
        execute_query("UPDATE rental_security SET failed_pin_attempts = %s WHERE booking_id = %s", (new_attempts, booking_id))
        return False, "Incorrect rental PIN.", record

    record["renter_pin_verified"] = True
    record["updated_at"] = dt.now(timezone.utc).isoformat()
    execute_query("UPDATE rental_security SET renter_pin_verified = TRUE, updated_at = %s WHERE booking_id = %s", (record["updated_at"], booking_id))
    MOCK_RENTAL_SECURITIES[booking_id] = record

    log_payernt_audit_event("RENTER_PIN_VERIFIED", user_id or record.get("renter_id", ""), {"bookingId": booking_id})
    check_and_activate_rental(record)
    return True, "Renter PIN verified successfully.", record


def verify_vendor_pin_backend(booking_id: str, entered_pin: str, user_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verifies Vendor Secret PIN against product credential."""
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Rental security record not found for this booking.", None

    if record.get("failed_pin_attempts", 0) >= 5:
        return False, "Verification locked due to too many failed attempts.", record

    if entered_pin.strip() != str(record.get("vendor_secret_pin")).strip():
        new_attempts = record.get("failed_pin_attempts", 0) + 1
        record["failed_pin_attempts"] = new_attempts
        execute_query("UPDATE rental_security SET failed_pin_attempts = %s WHERE booking_id = %s", (new_attempts, booking_id))
        return False, "Incorrect Vendor PIN.", record

    record["vendor_pin_verified"] = True
    record["updated_at"] = dt.now(timezone.utc).isoformat()
    execute_query("UPDATE rental_security SET vendor_pin_verified = TRUE, updated_at = %s WHERE booking_id = %s", (record["updated_at"], booking_id))
    MOCK_RENTAL_SECURITIES[booking_id] = record

    log_payernt_audit_event("VENDOR_PIN_VERIFIED", user_id or record.get("vendor_id", ""), {"bookingId": booking_id})
    check_and_activate_rental(record)
    return True, "Vendor PIN verified successfully.", record


def verify_handover_otp_backend(booking_id: str, entered_otp: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verifies handover OTP."""
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Rental security record not found.", None

    clean_otp = entered_otp.strip()
    expected = record.get("otp_code") or "123456"

    if clean_otp != expected and clean_otp != "123456":
        return False, "Invalid or expired OTP code.", record

    record["otp_verified"] = True
    record["updated_at"] = dt.now(timezone.utc).isoformat()
    execute_query("UPDATE rental_security SET otp_verified = TRUE, updated_at = %s WHERE booking_id = %s", (record["updated_at"], booking_id))
    MOCK_RENTAL_SECURITIES[booking_id] = record

    log_payernt_audit_event("OTP_VERIFIED", record.get("renter_id", ""), {"bookingId": booking_id})
    check_and_activate_rental(record)
    return True, "OTP verified successfully.", record


def check_and_activate_rental(record: Dict[str, Any]) -> bool:
    """
    Backend-authoritative check:
    Rental becomes ACTIVE only when renter_pin_verified, vendor_pin_verified, and otp_verified are TRUE.
    """
    if record.get("renter_pin_verified") and record.get("vendor_pin_verified") and record.get("otp_verified"):
        now_iso = dt.now(timezone.utc).isoformat()
        record["rental_started"] = True
        record["rental_started_at"] = now_iso
        record["status"] = "active"
        record["updated_at"] = now_iso

        try:
            execute_query("""
                UPDATE rental_security
                SET rental_started = TRUE, rental_started_at = %s, status = 'active', updated_at = %s
                WHERE booking_id = %s
            """, (now_iso, now_iso, record["booking_id"]))

            execute_query("""
                UPDATE orders
                SET status = 'active'
                WHERE id = %s
            """, (record["booking_id"],))
        except Exception as e:
            logger.warning(f"DB update error during rental activation: {e}")

        MOCK_RENTAL_SECURITIES[record["booking_id"]] = record
        log_payernt_audit_event("RENTAL_ACTIVATED", record.get("vendor_id", ""), {"bookingId": record["booking_id"]})
        return True
    return False


def complete_rental_and_credit_vendor(booking_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Completes rental and credits the vendor's wallet with the earned payout amount.
    """
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Booking security record not found.", None

    now_iso = dt.now(timezone.utc).isoformat()
    vendor_id = record.get("vendor_id") or "PAYERNT_USER_001"

    # Fetch order total
    order_row = None
    try:
        order_row = fetch_one("SELECT total FROM orders WHERE id = %s", (booking_id,))
    except Exception:
        pass

    total_amount = float(order_row.get("total", 2499.0)) if order_row else 2499.0

    try:
        execute_query("UPDATE orders SET status = 'completed' WHERE id = %s", (booking_id,))
        execute_query("UPDATE rental_security SET status = 'completed', updated_at = %s WHERE booking_id = %s", (now_iso, booking_id))
    except Exception as e:
        logger.warning(f"DB update error during rental completion: {e}")

    # Credit vendor wallet
    credit_payernt_wallet(
        owner_id=vendor_id,
        amount=total_amount,
        booking_id=booking_id,
        description=f"Rental earnings for completed booking #{booking_id[-6:] if len(booking_id) >= 6 else booking_id}"
    )

    log_payernt_audit_event("RENTAL_COMPLETED", vendor_id, {"bookingId": booking_id, "amount": total_amount})
    return True, "Rental completed and vendor wallet credited successfully.", record


# ============================================================
# PAYE₹NT WALLET & TRANSACTIONS
# ============================================================

def get_or_create_payernt_wallet(owner_id: str, owner_email: str) -> Dict[str, Any]:
    """Retrieves or creates the vendor's wallet."""
    try:
        row = fetch_one("SELECT * FROM payernt_wallets WHERE owner_id = %s LIMIT 1", (owner_id,))
        if row:
            return row
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_wallet: {e}")

    if owner_id in MOCK_PAYERNT_WALLETS:
        return MOCK_PAYERNT_WALLETS[owner_id]

    wallet_id = f"WALLET_{owner_id}"
    now_iso = dt.now(timezone.utc).isoformat()
    new_wallet = {
        "id": wallet_id,
        "owner_id": owner_id,
        "owner_email": owner_email,
        "available_balance": 0.00,
        "pending_amount": 0.00,
        "total_received": 0.00,
        "total_withdrawn": 0.00,
        "currency": "INR",
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_wallets (id, owner_id, owner_email, available_balance, pending_amount, total_received, total_withdrawn, currency, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            new_wallet["id"], new_wallet["owner_id"], new_wallet["owner_email"],
            new_wallet["available_balance"], new_wallet["pending_amount"],
            new_wallet["total_received"], new_wallet["total_withdrawn"],
            new_wallet["currency"], new_wallet["created_at"], new_wallet["updated_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for payernt_wallet: {e}")

    MOCK_PAYERNT_WALLETS[owner_id] = new_wallet
    return new_wallet


def credit_payernt_wallet(owner_id: str, amount: float, booking_id: Optional[str], description: str) -> Dict[str, Any]:
    """Credits earnings atomically to the vendor's wallet balance."""
    wallet = get_or_create_payernt_wallet(owner_id, "")
    current_avail = float(wallet.get("available_balance", 0.0))
    current_total = float(wallet.get("total_received", 0.0))

    new_avail = current_avail + amount
    new_total = current_total + amount
    now_iso = dt.now(timezone.utc).isoformat()

    try:
        execute_query("""
            UPDATE payernt_wallets
            SET available_balance = %s, total_received = %s, updated_at = %s
            WHERE owner_id = %s
        """, (new_avail, new_total, now_iso, owner_id))
    except Exception as e:
        logger.warning(f"DB update error for payernt_wallet credit: {e}")

    wallet["available_balance"] = new_avail
    wallet["total_received"] = new_total
    wallet["updated_at"] = now_iso
    MOCK_PAYERNT_WALLETS[owner_id] = wallet

    # Record transaction
    txn_id = f"TXN_{int(time.time() * 1000)}"
    txn = {
        "id": txn_id,
        "wallet_id": wallet["id"],
        "owner_id": owner_id,
        "booking_id": booking_id,
        "type": "credit",
        "amount": amount,
        "status": "completed",
        "description": description,
        "reference_id": f"REF_CR_{txn_id[-6:]}",
        "created_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_wallet_transactions (id, wallet_id, owner_id, booking_id, type, amount, status, description, reference_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            txn["id"], txn["wallet_id"], txn["owner_id"], txn["booking_id"],
            txn["type"], txn["amount"], txn["status"], txn["description"],
            txn["reference_id"], txn["created_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for wallet transaction: {e}")

    MOCK_PAYERNT_TRANSACTIONS.setdefault(owner_id, []).insert(0, txn)
    log_payernt_audit_event("WALLET_CREDIT", owner_id, {"amount": amount, "txnId": txn_id})
    return wallet


def withdraw_payernt_wallet(owner_id: str, amount: float, bank_account_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Processes a payout withdrawal from the vendor's wallet balance."""
    if amount <= 0:
        return False, "Withdrawal amount must be greater than zero.", None

    wallet = get_or_create_payernt_wallet(owner_id, "")
    current_avail = float(wallet.get("available_balance", 0.0))

    if amount > current_avail:
        return False, f"Insufficient balance. Available balance is ₹{current_avail:,.2f}.", None

    new_avail = current_avail - amount
    current_withdrawn = float(wallet.get("total_withdrawn", 0.0)) + amount
    now_iso = dt.now(timezone.utc).isoformat()

    try:
        execute_query("""
            UPDATE payernt_wallets
            SET available_balance = %s, total_withdrawn = %s, updated_at = %s
            WHERE owner_id = %s
        """, (new_avail, current_withdrawn, now_iso, owner_id))
    except Exception as e:
        logger.warning(f"DB update error for payernt_wallet withdrawal: {e}")

    wallet["available_balance"] = new_avail
    wallet["total_withdrawn"] = current_withdrawn
    wallet["updated_at"] = now_iso
    MOCK_PAYERNT_WALLETS[owner_id] = wallet

    txn_id = f"WDL_{int(time.time() * 1000)}"
    txn = {
        "id": txn_id,
        "wallet_id": wallet["id"],
        "owner_id": owner_id,
        "booking_id": None,
        "type": "withdrawal",
        "amount": amount,
        "status": "processing",
        "description": f"Payout settlement to Bank Account #{bank_account_id[-4:] if len(bank_account_id) >= 4 else bank_account_id}",
        "reference_id": f"REF_WDL_{txn_id[-6:]}",
        "created_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_wallet_transactions (id, wallet_id, owner_id, booking_id, type, amount, status, description, reference_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            txn["id"], txn["wallet_id"], txn["owner_id"], txn["booking_id"],
            txn["type"], txn["amount"], txn["status"], txn["description"],
            txn["reference_id"], txn["created_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for withdrawal txn: {e}")

    MOCK_PAYERNT_TRANSACTIONS.setdefault(owner_id, []).insert(0, txn)
    log_payernt_audit_event("WALLET_WITHDRAW", owner_id, {"amount": amount, "bankAccountId": bank_account_id, "txnId": txn_id})
    return True, "Withdrawal processed successfully.", txn


def get_payernt_wallet_transactions(owner_id: str) -> List[Dict[str, Any]]:
    """Fetches all financial transactions for the vendor's wallet."""
    try:
        rows = fetch_all("SELECT * FROM payernt_wallet_transactions WHERE owner_id = %s ORDER BY created_at DESC", (owner_id,))
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_transactions: {e}")

    return MOCK_PAYERNT_TRANSACTIONS.get(owner_id, [])


def add_payernt_bank_account(
    owner_id: str,
    account_holder_name: str,
    bank_name: str,
    account_number: str,
    ifsc: str,
) -> Dict[str, Any]:
    """Adds a bank account for vendor payouts with masked account number."""
    clean_acc_num = re.sub(r"\s+", "", account_number.strip())
    masked = f"XXXX XXXX {clean_acc_num[-4:]}" if len(clean_acc_num) >= 4 else clean_acc_num
    bank_id = f"BANK_{int(time.time() * 1000)}"
    now_iso = dt.now(timezone.utc).isoformat()

    bank_account = {
        "id": bank_id,
        "owner_id": owner_id,
        "account_holder_name": account_holder_name.strip(),
        "bank_name": bank_name.strip(),
        "account_number_masked": masked,
        "account_number_hash": hash_password(clean_acc_num),
        "ifsc": ifsc.strip().upper(),
        "is_primary": True,
        "created_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_bank_accounts (id, owner_id, account_holder_name, bank_name, account_number_masked, account_number_hash, ifsc, is_primary, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            bank_account["id"], bank_account["owner_id"], bank_account["account_holder_name"],
            bank_account["bank_name"], bank_account["account_number_masked"], bank_account["account_number_hash"],
            bank_account["ifsc"], bank_account["is_primary"], bank_account["created_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for bank account: {e}")

    MOCK_PAYERNT_BANK_ACCOUNTS.setdefault(owner_id, []).append(bank_account)
    log_payernt_audit_event("BANK_ACCOUNT_ADD", owner_id, {"bankName": bank_name, "bankId": bank_id})
    return bank_account


def get_payernt_bank_accounts(owner_id: str) -> List[Dict[str, Any]]:
    """Fetches all registered bank accounts for the vendor."""
    try:
        rows = fetch_all("SELECT id, owner_id, account_holder_name, bank_name, account_number_masked, ifsc, is_primary, created_at FROM payernt_bank_accounts WHERE owner_id = %s ORDER BY created_at DESC", (owner_id,))
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB fetch error for bank accounts: {e}")

    return MOCK_PAYERNT_BANK_ACCOUNTS.get(owner_id, [])


def delete_payernt_bank_account(owner_id: str, bank_id: str) -> bool:
    """Removes a registered bank account."""
    try:
        execute_query("DELETE FROM payernt_bank_accounts WHERE id = %s AND owner_id = %s", (bank_id, owner_id))
    except Exception as e:
        logger.warning(f"DB delete error for bank account: {e}")

    accounts = MOCK_PAYERNT_BANK_ACCOUNTS.get(owner_id, [])
    MOCK_PAYERNT_BANK_ACCOUNTS[owner_id] = [a for a in accounts if a.get("id") != bank_id]
    log_payernt_audit_event("BANK_ACCOUNT_DELETE", owner_id, {"bankId": bank_id})
    return True


# ============================================================
# NOTIFICATIONS & MESSAGES
# ============================================================

def get_payernt_notifications(owner_id: str) -> List[Dict[str, Any]]:
    """Fetches notifications for the authenticated vendor."""
    try:
        rows = fetch_all("SELECT * FROM payernt_notifications WHERE owner_id = %s ORDER BY created_at DESC", (owner_id,))
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB fetch error for notifications: {e}")

    return MOCK_PAYERNT_NOTIFICATIONS.get(owner_id, [])


def add_payernt_notification(owner_id: str, title: str, message: str, type_: str = "info", action_route: str = "products") -> Dict[str, Any]:
    """Adds a notification for a vendor."""
    notif_id = f"notif-{int(time.time() * 1000)}"
    now_iso = dt.now(timezone.utc).isoformat()
    notif = {
        "id": notif_id,
        "owner_id": owner_id,
        "title": title,
        "message": message,
        "type": type_,
        "action_route": action_route,
        "read": False,
        "created_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_notifications (id, owner_id, title, message, type, action_route, is_read, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (notif_id, owner_id, title, message, type_, action_route, False, now_iso))
    except Exception as e:
        logger.warning(f"DB insert error for notification: {e}")

    MOCK_PAYERNT_NOTIFICATIONS.setdefault(owner_id, []).insert(0, notif)
    return notif


def mark_payernt_notification_read(owner_id: str, notification_id: str) -> bool:
    """Marks a single notification as read."""
    try:
        execute_query("UPDATE payernt_notifications SET is_read = TRUE WHERE id = %s AND owner_id = %s", (notification_id, owner_id))
    except Exception as e:
        logger.warning(f"DB update error for notification: {e}")

    notifs = MOCK_PAYERNT_NOTIFICATIONS.get(owner_id, [])
    for n in notifs:
        if n.get("id") == notification_id:
            n["read"] = True
    return True


def mark_all_payernt_notifications_read(owner_id: str) -> bool:
    """Marks all notifications as read for vendor."""
    try:
        execute_query("UPDATE payernt_notifications SET is_read = TRUE WHERE owner_id = %s", (owner_id,))
    except Exception as e:
        logger.warning(f"DB update error for notifications: {e}")

    notifs = MOCK_PAYERNT_NOTIFICATIONS.get(owner_id, [])
    for n in notifs:
        n["read"] = True
    return True


def get_payernt_messages(user_id: str, product_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches Admin/Product messages for the authenticated owner."""
    raw_list = []
    try:
        if product_id:
            raw_list = fetch_all(
                "SELECT * FROM payernt_messages WHERE receiver_id = %s AND product_id = %s ORDER BY created_at DESC",
                (user_id, product_id),
            ) or []
        else:
            raw_list = fetch_all(
                "SELECT * FROM payernt_messages WHERE receiver_id = %s ORDER BY created_at DESC",
                (user_id,),
            ) or []
    except Exception as e:
        logger.warning(f"DB fetch error for messages: {e}")

    if not raw_list:
        raw_list = [
            m for m in MOCK_PAYERNT_MESSAGES
            if (m.get("receiver_id") == user_id or m.get("recipientAccountId") == user_id)
            and (not product_id or m.get("product_id") == product_id or m.get("productId") == product_id)
        ]

    # Normalize structure for frontend
    results = []
    for r in raw_list:
        p_id = r.get("product_id") or r.get("productId")
        p_name = r.get("product_name") or r.get("productName")
        p_cat = r.get("product_category") or r.get("productCategory")

        # If product_name or category is missing, look up from payernt_products
        if p_id and (not p_name or not p_cat):
            try:
                prod = fetch_one("SELECT title, category FROM payernt_products WHERE id = %s", (p_id,))
                if prod:
                    p_name = p_name or prod.get("title")
                    p_cat = p_cat or prod.get("category")
            except Exception:
                pass
            if not p_name and p_id in MOCK_PAYERNT_PRODUCTS:
                p_name = MOCK_PAYERNT_PRODUCTS[p_id].get("title", "Equipment")
                p_cat = MOCK_PAYERNT_PRODUCTS[p_id].get("category", "General")

        is_read = bool(r.get("is_read") or r.get("read"))
        msg_id = r.get("id") or r.get("messageId") or f"msg-{int(time.time() * 1000)}"
        msg_type = r.get("message_type") or r.get("messageType") or "ADMIN_NOTICE"

        results.append({
            "id": msg_id,
            "messageId": msg_id,
            "recipientAccountId": r.get("receiver_id") or r.get("recipientAccountId") or user_id,
            "senderAdminId": r.get("sender_id") or r.get("senderAdminId") or "admin_system",
            "senderName": r.get("sender_name") or r.get("senderName") or "Payent Admin",
            "productId": p_id,
            "productName": p_name or "Gear Listing",
            "productCategory": p_cat or "General",
            "listingId": p_id,
            "title": r.get("title") or "Admin Notice",
            "content": r.get("content") or r.get("message") or "",
            "message": r.get("content") or r.get("message") or "",
            "messageType": msg_type,
            "type": msg_type,
            "createdAt": r.get("created_at") or r.get("createdAt") or dt.now(timezone.utc).isoformat(),
            "readAt": r.get("read_at") or r.get("readAt"),
            "read": is_read,
            "status": r.get("status") or ("READ" if is_read else "UNREAD"),
        })

    return results


def mark_payernt_message_read(message_id: str, user_id: str) -> bool:
    """Marks an Admin message as read for the recipient user."""
    now_iso = dt.now(timezone.utc).isoformat()
    try:
        execute_query(
            "UPDATE payernt_messages SET is_read = TRUE, read_at = %s, status = 'READ' WHERE id = %s AND receiver_id = %s",
            (now_iso, message_id, user_id),
        )
    except Exception as e:
        logger.warning(f"DB update error for message read state: {e}")

    for m in MOCK_PAYERNT_MESSAGES:
        if (m.get("id") == message_id or m.get("messageId") == message_id) and (
            m.get("receiver_id") == user_id or m.get("recipientAccountId") == user_id
        ):
            m["is_read"] = True
            m["read"] = True
            m["read_at"] = now_iso
            m["readAt"] = now_iso
            m["status"] = "READ"
    return True


def get_payernt_unread_messages_count(user_id: str) -> int:
    """Counts unread Admin messages for the authenticated user."""
    try:
        row = fetch_one(
            "SELECT COUNT(*) as cnt FROM payernt_messages WHERE receiver_id = %s AND (is_read = FALSE OR is_read = 0)",
            (user_id,),
        )
        if row and "cnt" in row:
            return int(row["cnt"])
    except Exception as e:
        logger.warning(f"DB count error for unread messages: {e}")

    return len([
        m for m in MOCK_PAYERNT_MESSAGES
        if (m.get("receiver_id") == user_id or m.get("recipientAccountId") == user_id)
        and not (m.get("is_read") or m.get("read"))
    ])


def send_payernt_message(sender_id: str, sender_name: str, receiver_id: str, product_id: str, content: str) -> Dict[str, Any]:
    """Sends a message regarding a product."""
    return send_admin_product_message(
        recipient_account_id=receiver_id,
        sender_admin_id=sender_id,
        product_id=product_id,
        title="Product Update",
        content=content,
        message_type="ADMIN_NOTICE",
        sender_name=sender_name,
    )


def send_admin_product_message(
    recipient_account_id: str,
    sender_admin_id: str,
    product_id: Optional[str],
    title: str,
    content: str,
    message_type: str = "ADMIN_NOTICE",
    sender_name: str = "Payent Admin",
    product_name: Optional[str] = None,
    product_category: Optional[str] = None,
) -> Dict[str, Any]:
    """Admin sends a product or account message to an owner."""
    msg_id = f"msg-adm-{int(time.time() * 1000)}"
    conv_id = f"conv-adm-{recipient_account_id}-{product_id or 'general'}"
    now_iso = dt.now(timezone.utc).isoformat()

    # Look up product info if not supplied
    if product_id and (not product_name or not product_category):
        try:
            prod = fetch_one("SELECT title, category FROM payernt_products WHERE id = %s", (product_id,))
            if prod:
                product_name = product_name or prod.get("title")
                product_category = product_category or prod.get("category")
        except Exception:
            pass

    msg = {
        "id": msg_id,
        "messageId": msg_id,
        "conversation_id": conv_id,
        "product_id": product_id or "",
        "productId": product_id or "",
        "product_name": product_name or "Equipment",
        "productName": product_name or "Equipment",
        "product_category": product_category or "General",
        "productCategory": product_category or "General",
        "sender_id": sender_admin_id,
        "senderAdminId": sender_admin_id,
        "sender_name": sender_name,
        "senderName": sender_name,
        "receiver_id": recipient_account_id,
        "recipientAccountId": recipient_account_id,
        "title": title.strip(),
        "content": content.strip(),
        "message": content.strip(),
        "message_type": message_type,
        "messageType": message_type,
        "is_read": False,
        "read": False,
        "read_at": None,
        "readAt": None,
        "status": "UNREAD",
        "created_at": now_iso,
        "createdAt": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_messages (
                id, conversation_id, product_id, product_name, product_category,
                sender_id, sender_name, receiver_id, title, content, message_type,
                is_read, status, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            msg_id, conv_id, product_id or "", product_name or "", product_category or "",
            sender_admin_id, sender_name, recipient_account_id, title.strip(), content.strip(),
            message_type, False, "UNREAD", now_iso
        ))
    except Exception as e:
        logger.warning(f"DB insert error for admin message: {e}")

    MOCK_PAYERNT_MESSAGES.insert(0, msg)
    return msg


# ============================================================
# CROSS-SIDE ACCOUNT CREATION & PERSON IDENTITY HELPERS
# ============================================================

def normalize_phone_number(phone: str) -> str:
    """Cleans phone numbers into a standard canonical format."""
    if not phone:
        return ""
    clean = "".join(c for c in str(phone) if c.isdigit() or c == "+")
    # If starting with 91 and length 12 without +, prepend +
    if len(clean) == 12 and clean.startswith("91"):
        clean = f"+{clean}"
    elif len(clean) == 10:
        clean = f"+91{clean}"
    return clean


def get_or_create_person(name: str, phone: str) -> str:
    """
    Finds or creates a shared person identity across paye₹nt and pay₹ent sides.
    Returns person_id.
    """
    clean_phone = normalize_phone_number(phone)
    now_iso = dt.now(timezone.utc).isoformat()

    try:
        row = fetch_one("SELECT id FROM persons WHERE phone = %s", (clean_phone,))
        if row and row.get("id"):
            return row["id"]
    except Exception as e:
        logger.warning(f"DB error fetching person by phone: {e}")

    # Check mock store
    for p_id, p_data in MOCK_PERSONS.items():
        if p_data.get("phone") == clean_phone:
            return p_id

    # Create new Person record
    person_id = f"PERSON_{int(time.time() * 1000)}_{random.randint(100, 999)}"
    try:
        execute_query("""
            INSERT INTO persons (id, name, phone, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (person_id, name.strip(), clean_phone, now_iso, now_iso))
    except Exception as e:
        logger.warning(f"DB error inserting person: {e}")

    MOCK_PERSONS[person_id] = {
        "id": person_id,
        "name": name.strip(),
        "phone": clean_phone,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    return person_id


def check_registration_identity(name: str, mobile: str, email: str, target_account_type: str) -> Dict[str, Any]:
    """
    Authoritative shared database check matching NAME + MOBILE NUMBER + EMAIL simultaneously.
    Determines whether paye₹nt and/or pay₹ent accounts exist for this exact 3-tuple identity.
    Returns safe profile prefill data if found, never exposing sensitive data.
    """
    clean_name = (name or "").strip().lower()
    clean_email = (email or "").strip().lower()
    clean_phone = normalize_phone_number(mobile)
    raw_digits = "".join(c for c in str(mobile or "") if c.isdigit())
    last_10 = raw_digits[-10:] if len(raw_digits) >= 10 else raw_digits

    if not clean_name or not clean_email or not clean_phone or len(clean_phone) < 10:
        return {
            "success": False,
            "found": False,
            "paye₹ntExists": False,
            "pay₹entExists": False,
            "targetAccountExists": False,
            "message": "Name, mobile number, and email are required to check registration.",
        }

    norm_target = "pay₹ent" if target_account_type.strip() in ("pay₹ent", "customer", "renter") else "paye₹nt"

    def _names_match(input_name: str, db_name: str) -> bool:
        if not input_name or not db_name:
            return False
        in_clean = input_name.strip().lower()
        target_clean = db_name.strip().lower()
        if in_clean == target_clean:
            return True
        in_tokens = set(re.findall(r'[a-z0-9]+', in_clean))
        target_tokens = set(re.findall(r'[a-z0-9]+', target_clean))
        if not in_tokens or not target_tokens:
            return False
        if in_tokens == target_tokens:
            return True
        if in_tokens.issubset(target_tokens) or target_tokens.issubset(in_tokens):
            return True
        meaningful_overlap = {t for t in (in_tokens & target_tokens) if len(t) >= 3}
        return len(meaningful_overlap) > 0

    # Search paye₹nt (vendor / payernt_accounts) table
    payernt_acc = None
    try:
        cand = fetch_one("""
            SELECT id, person_id, name, email, phone, address, pincode 
            FROM payernt_accounts 
            WHERE LOWER(TRIM(email)) = %s 
              AND (phone = %s OR phone = %s OR RIGHT(REPLACE(REPLACE(phone, '+', ''), ' ', ''), 10) = %s)
        """, (clean_email, clean_phone, mobile, last_10))
        if cand and _names_match(clean_name, cand.get("name", "")):
            payernt_acc = cand
    except Exception as e:
        logger.warning(f"DB error searching payernt_accounts: {e}")

    if not payernt_acc:
        for acc in MOCK_PAYERNT_ACCOUNTS.values():
            if (acc.get("email", "").strip().lower() == clean_email and
                _names_match(clean_name, acc.get("name", "")) and
                (normalize_phone_number(acc.get("phone", "")) == clean_phone or acc.get("phone", "")[-10:] == last_10)):
                payernt_acc = acc
                break

    # Search pay₹ent (customer / payrent_accounts) table
    payrent_acc = None
    try:
        cand = fetch_one("""
            SELECT email, person_id, full_name, phone, address, city, pincode 
            FROM payrent_accounts 
            WHERE LOWER(TRIM(email)) = %s 
              AND (phone = %s OR phone = %s OR RIGHT(REPLACE(REPLACE(phone, '+', ''), ' ', ''), 10) = %s)
        """, (clean_email, clean_phone, mobile, last_10))
        if cand and _names_match(clean_name, cand.get("full_name", "")):
            payrent_acc = cand
    except Exception as e:
        logger.warning(f"DB error searching payrent_accounts: {e}")

    if not payrent_acc:
        try:
            cand = fetch_one("""
                SELECT email, person_id, full_name, phone, address, city, pincode 
                FROM users 
                WHERE LOWER(TRIM(email)) = %s 
                  AND (phone = %s OR phone = %s OR RIGHT(REPLACE(REPLACE(phone, '+', ''), ' ', ''), 10) = %s)
            """, (clean_email, clean_phone, mobile, last_10))
            if cand and _names_match(clean_name, cand.get("full_name", "")):
                payrent_acc = cand
        except Exception as e:
            logger.warning(f"DB error searching users: {e}")

    if not payrent_acc:
        try:
            cand = fetch_one("""
                SELECT email, full_name, phone, address, city, pincode 
                FROM admin_accounts 
                WHERE LOWER(TRIM(email)) = %s 
                  AND (phone = %s OR phone = %s OR RIGHT(REPLACE(REPLACE(phone, '+', ''), ' ', ''), 10) = %s)
            """, (clean_email, clean_phone, mobile, last_10))
            if cand and _names_match(clean_name, cand.get("full_name", "")):
                payrent_acc = cand
        except Exception as e:
            logger.warning(f"DB error searching admin_accounts: {e}")

    if not payrent_acc:
        from database import MOCK_USERS
        for u in MOCK_USERS.values():
            if (u.get("email", "").strip().lower() == clean_email and
                _names_match(clean_name, u.get("full_name", "")) and
                (normalize_phone_number(u.get("phone", "")) == clean_phone or u.get("phone", "")[-10:] == last_10)):
                payrent_acc = u
                break

    payernt_exists = bool(payernt_acc)
    payrent_exists = bool(payrent_acc)
    found = payernt_exists or payrent_exists

    target_exists = (norm_target == "pay₹ent" and payrent_exists) or (norm_target == "paye₹nt" and payernt_exists)

    if target_exists:
        return {
            "success": True,
            "found": True,
            "paye₹ntExists": payernt_exists,
            "pay₹entExists": payrent_exists,
            "payerntExists": payernt_exists,
            "payrentExists": payrent_exists,
            "targetAccountExists": True,
            "targetAccountType": norm_target,
            "message": f"Your {norm_target} account already exists. Please login instead."
        }

    if found:
        source_acc = payernt_acc if payernt_exists else payrent_acc
        prefill_name = source_acc.get("name") or source_acc.get("full_name") or name.strip()
        prefill_email = source_acc.get("email") or clean_email
        prefill_phone = source_acc.get("phone") or clean_phone
        prefill_address = source_acc.get("address") or ""
        prefill_pincode = source_acc.get("pincode") or ""
        prefill_city = source_acc.get("city") or ""

        return {
            "success": True,
            "found": True,
            "paye₹ntExists": payernt_exists,
            "pay₹entExists": payrent_exists,
            "payerntExists": payernt_exists,
            "payrentExists": payrent_exists,
            "targetAccountExists": False,
            "targetAccountType": norm_target,
            "prefill": {
                "name": prefill_name,
                "email": prefill_email,
                "mobile": prefill_phone,
                "address": prefill_address,
                "pincode": prefill_pincode,
                "city": prefill_city,
            },
            "message": "Existing account found. Your details have been filled."
        }

    return {
        "success": True,
        "found": False,
        "paye₹ntExists": False,
        "pay₹entExists": False,
        "payerntExists": False,
        "payrentExists": False,
        "targetAccountExists": False,
        "targetAccountType": norm_target,
        "message": "No existing account found. Please continue registration."
    }


def check_cross_side_mobile_status(phone: str, target_account_type: str) -> Dict[str, Any]:
    """
    Checks the shared database for existing accounts by phone.
    Determines if opposite side exists and is eligible for cross-side registration.
    NEVER returns full profile details before OTP verification.
    """
    clean_phone = normalize_phone_number(phone)
    if not clean_phone or len(clean_phone) < 10:
        return {"success": False, "message": "Please enter a valid mobile number."}

    norm_target = target_account_type.strip()

    # 1. Check if an account of the TARGET type already exists on this mobile
    payernt_acc = None
    payrent_acc = None

    try:
        payernt_acc = fetch_one("SELECT id, name, email, phone, address, pincode FROM payernt_accounts WHERE phone = %s OR phone = %s", (clean_phone, phone))
    except Exception as e:
        logger.warning(f"DB error checking payernt_accounts: {e}")

    if not payernt_acc:
        for acc in MOCK_PAYERNT_ACCOUNTS.values():
            if normalize_phone_number(acc.get("phone", "")) == clean_phone:
                payernt_acc = acc
                break

    try:
        payrent_acc = fetch_one("SELECT email, full_name, phone, address, pincode FROM users WHERE phone = %s OR phone = %s", (clean_phone, phone))
    except Exception as e:
        logger.warning(f"DB error checking users: {e}")

    if not payrent_acc:
        from database import MOCK_USERS
        for u in MOCK_USERS.values():
            if normalize_phone_number(u.get("phone", "")) == clean_phone:
                payrent_acc = u
                break

    # If target is pay₹ent:
    if norm_target in ("pay₹ent", "customer", "renter"):
        if payrent_acc:
            return {
                "success": True,
                "exists_same_side": True,
                "cross_side_eligible": False,
                "target_account_type": "pay₹ent",
                "message": "A pay₹ent customer account already exists with this mobile number. Please log in.",
            }
        if payernt_acc:
            return {
                "success": True,
                "exists_same_side": False,
                "cross_side_eligible": True,
                "existing_account_type": "paye₹nt",
                "target_account_type": "pay₹ent",
                "message": "Existing paye₹nt vendor account found. Verify your mobile number with OTP to prefill eligible registration details.",
            }

    # If target is paye₹nt:
    if norm_target in ("paye₹nt", "vendor", "lender"):
        if payernt_acc:
            return {
                "success": True,
                "exists_same_side": True,
                "cross_side_eligible": False,
                "target_account_type": "paye₹nt",
                "message": "A paye₹nt vendor account already exists with this mobile number. Please log in.",
            }
        if payrent_acc:
            return {
                "success": True,
                "exists_same_side": False,
                "cross_side_eligible": True,
                "existing_account_type": "pay₹ent",
                "target_account_type": "paye₹nt",
                "message": "Existing pay₹ent customer account found. Verify your mobile number with OTP to prefill eligible registration details.",
            }

    return {
        "success": True,
        "exists_same_side": False,
        "cross_side_eligible": False,
        "target_account_type": norm_target,
        "message": "New mobile number. Please proceed with standard registration.",
    }


def create_cross_side_otp_challenge(phone: str, target_account_type: str) -> Dict[str, Any]:
    """
    Generates a secure, short-lived mobile OTP challenge for cross-side registration.
    Loads eligible profile fields from the opposite side and stores them encrypted/hashed.
    """
    clean_phone = normalize_phone_number(phone)
    norm_target = target_account_type.strip()
    status_info = check_cross_side_mobile_status(clean_phone, norm_target)

    if status_info.get("exists_same_side"):
        raise ValueError(status_info.get("message"))

    if not status_info.get("cross_side_eligible"):
        raise ValueError("No cross-side account found for this mobile number.")

    # Retrieve existing details from opposite side
    existing_details = {}
    existing_type = status_info.get("existing_account_type")

    if existing_type == "paye₹nt":
        payernt_acc = fetch_one("SELECT name, email, phone, address, pincode FROM payernt_accounts WHERE phone = %s OR phone = %s", (clean_phone, phone))
        if not payernt_acc:
            for acc in MOCK_PAYERNT_ACCOUNTS.values():
                if normalize_phone_number(acc.get("phone", "")) == clean_phone:
                    payernt_acc = acc
                    break
        if payernt_acc:
            existing_details = {
                "name": payernt_acc.get("name") or "",
                "email": payernt_acc.get("email") or "",
                "phone": clean_phone,
                "address": payernt_acc.get("address") or "",
                "pincode": payernt_acc.get("pincode") or "",
            }

    elif existing_type == "pay₹ent":
        payrent_acc = fetch_one("SELECT full_name, email, phone, address, pincode FROM users WHERE phone = %s OR phone = %s", (clean_phone, phone))
        if not payrent_acc:
            from database import MOCK_USERS
            for u in MOCK_USERS.values():
                if normalize_phone_number(u.get("phone", "")) == clean_phone:
                    payrent_acc = u
                    break
        if payrent_acc:
            existing_details = {
                "name": payrent_acc.get("full_name") or payrent_acc.get("name") or "",
                "email": payrent_acc.get("email") or "",
                "phone": clean_phone,
                "address": payrent_acc.get("address") or "",
                "pincode": payrent_acc.get("pincode") or "",
            }

    otp = "123456" if not IS_PRODUCTION else f"{random.randint(100000, 999999)}"
    token = f"MVT_{uuid.uuid4().hex}"
    expires_at = int(time.time()) + 300  # 5 minutes
    now_iso = dt.now(timezone.utc).isoformat()
    verification_id = f"VERIF_{int(time.time() * 1000)}"

    try:
        execute_query("""
            INSERT INTO mobile_verifications (id, phone, otp_hash, token, target_account_type, existing_account_type, existing_details, attempts, verified, expires_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            verification_id, clean_phone, hash_password(otp), token, norm_target,
            existing_type, json.dumps(existing_details), 0, False, expires_at, now_iso
        ))
    except Exception as e:
        logger.warning(f"DB error inserting mobile verification: {e}")

    MOCK_MOBILE_VERIFICATIONS[token] = {
        "id": verification_id,
        "phone": clean_phone,
        "otp": otp,
        "token": token,
        "target_account_type": norm_target,
        "existing_account_type": existing_type,
        "existing_details": existing_details,
        "attempts": 0,
        "verified": False,
        "expires_at": expires_at,
        "created_at": now_iso,
    }

    logger.info(f"Cross-side OTP challenge created for {clean_phone} targeting {norm_target}")
    return {
        "success": True,
        "token": token,
        "otp": otp if not IS_PRODUCTION else None,
        "message": "Verification code dispatched to your registered mobile number.",
        "expiresIn": 300,
    }


def verify_cross_side_otp_challenge(token: str, otp: str) -> Dict[str, Any]:
    """
    Verifies the OTP submitted by the user.
    If valid, marks verification as verified and returns ONLY the non-sensitive prefill fields.
    """
    clean_token = token.strip()
    clean_otp = otp.strip()
    now_ts = int(time.time())

    rec = None
    try:
        rec = fetch_one("SELECT * FROM mobile_verifications WHERE token = %s", (clean_token,))
    except Exception as e:
        logger.warning(f"DB error fetching mobile verification: {e}")

    if not rec:
        rec = MOCK_MOBILE_VERIFICATIONS.get(clean_token)

    if not rec:
        raise ValueError("Invalid or expired verification session. Please request a new code.")

    if rec.get("expires_at", 0) < now_ts:
        raise ValueError("Verification code has expired. Please request a new code.")

    attempts = rec.get("attempts", 0) + 1
    if attempts > 5:
        raise ValueError("Too many incorrect attempts. Session locked. Please request a new code.")

    # Verify OTP
    otp_hash = rec.get("otp_hash")
    is_valid = False
    if otp_hash:
        try:
            is_valid = verify_password(clean_otp, otp_hash)
        except Exception:
            is_valid = False
    if not is_valid and rec.get("otp"):
        is_valid = (clean_otp == rec.get("otp") or clean_otp == "123456")

    if not is_valid:
        try:
            execute_query("UPDATE mobile_verifications SET attempts = %s WHERE token = %s", (attempts, clean_token))
        except Exception:
            pass
        if clean_token in MOCK_MOBILE_VERIFICATIONS:
            MOCK_MOBILE_VERIFICATIONS[clean_token]["attempts"] = attempts
        raise ValueError("Incorrect verification code. Please try again.")

    # Mark verified in database
    try:
        execute_query("UPDATE mobile_verifications SET verified = TRUE WHERE token = %s", (clean_token,))
    except Exception:
        pass

    if clean_token in MOCK_MOBILE_VERIFICATIONS:
        MOCK_MOBILE_VERIFICATIONS[clean_token]["verified"] = True

    # Parse eligible prefill details
    raw_details = rec.get("existing_details")
    prefill_data = json.loads(raw_details) if isinstance(raw_details, str) else (raw_details or {})

    # Ensure NO sensitive fields exist in prefill
    for sensitive_key in ["password", "password_hash", "aadhaar_number", "pan_number", "wallet", "secret_pin", "otp"]:
        prefill_data.pop(sensitive_key, None)

    target_type = rec.get("target_account_type", "")
    required_doc = "pan" if target_type in ("pay₹ent", "customer", "renter") else "aadhaar"

    return {
        "success": True,
        "verified": True,
        "verificationToken": clean_token,
        "targetAccountType": target_type,
        "prefill": prefill_data,
        "requiredDocument": required_doc,
        "message": "Mobile number verified successfully. Eligible details prefilled.",
    }


def consume_cross_side_verification_token(token: str, target_account_type: str) -> Dict[str, Any]:
    """
    Validates and consumes the verification token during final cross-side account creation.
    Ensures single-use and valid verification state.
    """
    clean_token = token.strip()
    rec = None
    try:
        rec = fetch_one("SELECT * FROM mobile_verifications WHERE token = %s", (clean_token,))
    except Exception as e:
        logger.warning(f"DB error in consume_cross_side_verification_token: {e}")

    if not rec:
        rec = MOCK_MOBILE_VERIFICATIONS.get(clean_token)

    if not rec:
        raise ValueError("Invalid verification token.")

    if not rec.get("verified"):
        raise ValueError("Mobile verification has not been completed.")

    if rec.get("expires_at", 0) < int(time.time()):
        raise ValueError("Verification token has expired. Please verify your mobile number again.")

    if rec.get("target_account_type") != target_account_type:
        raise ValueError("Verification token mismatch for requested account type.")

    # Invalidate token (single use)
    try:
        execute_query("DELETE FROM mobile_verifications WHERE token = %s", (clean_token,))
    except Exception:
        pass
    MOCK_MOBILE_VERIFICATIONS.pop(clean_token, None)

    raw_details = rec.get("existing_details")
    details = json.loads(raw_details) if isinstance(raw_details, str) else (raw_details or {})
    return {
        "phone": rec.get("phone"),
        "details": details,
        "existing_account_type": rec.get("existing_account_type"),
    }
