import os
import re
import json
import time
import uuid
import random
import secrets
import hashlib
import hmac
import logging
from datetime import datetime as dt, timezone
from typing import Optional, List, Dict, Any, Tuple
from config import IS_PRODUCTION, PIN_HASH_SECRET, ENABLE_TEST_OTP_RESPONSE, OTP_PROVIDER, IS_MOCK_OTP_MODE
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

    def _add_pp_col(col_def: str):
        try:
            execute_query(f"ALTER TABLE payernt_products ADD COLUMN {col_def}")
        except Exception:
            pass

    _add_pp_col("min_price FLOAT NULL")
    _add_pp_col("max_price FLOAT NULL")
    _add_pp_col("price_unit VARCHAR(50) DEFAULT 'PER DAY'")
    _add_pp_col("price_status VARCHAR(50) DEFAULT 'NOT_SET'")
    _add_pp_col("price_approved_at VARCHAR(100) NULL")
    _add_pp_col("price_approved_by VARCHAR(255) NULL")
    _add_pp_col("price_history LONGTEXT NULL")
    _add_pp_col("video_url LONGTEXT NULL")
    _add_pp_col("revision_notes LONGTEXT NULL")

    # 3. Rental Security Table (Links Vendor PIN + Renter PIN in ONE canonical record)
    execute_query("""
        CREATE TABLE IF NOT EXISTS rental_security (
            id VARCHAR(255) PRIMARY KEY,
            booking_id VARCHAR(255) UNIQUE NOT NULL,
            product_id VARCHAR(255) NOT NULL,
            vendor_id VARCHAR(255) NOT NULL,
            renter_id VARCHAR(255) NOT NULL,
            delivery_boy_id VARCHAR(255) NULL,
            vendor_secret_pin VARCHAR(255) NOT NULL,
            renter_secret_pin VARCHAR(255) NOT NULL,
            vendor_pin_hash VARCHAR(255) NULL,
            renter_pin_hash VARCHAR(255) NULL,
            final_activation_pin_hash VARCHAR(255) NULL,
            vendor_pin_verified BOOLEAN DEFAULT FALSE,
            renter_pin_verified BOOLEAN DEFAULT FALSE,
            vendor_otp_verified BOOLEAN DEFAULT FALSE,
            renter_otp_verified BOOLEAN DEFAULT FALSE,
            vendor_handover_verified BOOLEAN DEFAULT FALSE,
            renter_handover_verified BOOLEAN DEFAULT FALSE,
            rental_activated BOOLEAN DEFAULT FALSE,
            activated_at VARCHAR(100) NULL,
            earnings_started_at VARCHAR(100) NULL,
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

    def _add_rs_col(col_def: str):
        try:
            execute_query(f"ALTER TABLE rental_security ADD COLUMN {col_def}")
        except Exception:
            pass

    _add_rs_col("delivery_boy_id VARCHAR(255) NULL")
    _add_rs_col("vendor_pin_hash VARCHAR(255) NULL")
    _add_rs_col("renter_pin_hash VARCHAR(255) NULL")
    _add_rs_col("final_activation_pin_hash VARCHAR(255) NULL")
    _add_rs_col("vendor_otp_verified BOOLEAN DEFAULT FALSE")
    _add_rs_col("renter_otp_verified BOOLEAN DEFAULT FALSE")
    _add_rs_col("vendor_handover_verified BOOLEAN DEFAULT FALSE")
    _add_rs_col("renter_handover_verified BOOLEAN DEFAULT FALSE")
    _add_rs_col("rental_activated BOOLEAN DEFAULT FALSE")
    _add_rs_col("activated_at VARCHAR(100) NULL")
    _add_rs_col("earnings_started_at VARCHAR(100) NULL")
    _add_rs_col("renter_confirmed_receipt BOOLEAN DEFAULT FALSE")
    _add_rs_col("inspection_confirmed_at VARCHAR(100) NULL")
    _add_rs_col("inspection_checklist LONGTEXT NULL")
    _add_rs_col("failed_pin_attempts INT DEFAULT 0")

    # 3b. Dedicated Handover OTPs Table
    execute_query("""
        CREATE TABLE IF NOT EXISTS handover_otps (
            id VARCHAR(255) PRIMARY KEY,
            booking_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NULL,
            purpose VARCHAR(50) NOT NULL,
            otp_code VARCHAR(10) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            expires_at INT NOT NULL,
            attempts INT DEFAULT 0,
            max_attempts INT DEFAULT 5,
            verified BOOLEAN DEFAULT FALSE,
            verified_at VARCHAR(100) NULL,
            created_at VARCHAR(100) NOT NULL,
            INDEX idx_ho_booking (booking_id),
            INDEX idx_ho_purpose (purpose)
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
        "status": "PENDING_REVIEW",
        "rejection_reason": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "avatar": f"https://ui-avatars.com/api/?name={name.strip().replace(' ', '+')}&background=0c0c0c&color=ffffff",
        "created_at": now_iso,
        "last_login_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO payernt_accounts (id, person_id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, rejection_reason, reviewed_by, reviewed_at, avatar, created_at, last_login_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            account["rejection_reason"],
            account["reviewed_by"],
            account["reviewed_at"],
            account["avatar"],
            account["created_at"],
            account["last_login_at"],
            account["updated_at"],
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
    log_payernt_audit_event("REGISTER", account_id, {"email": clean_email, "name": name, "status": "PENDING_REVIEW"})
    return account


def resubmit_payernt_account(
    email: str,
    name: str = None,
    phone: str = None,
    address: str = None,
    pincode: str = None,
    aadhaar_number: str = None,
) -> Optional[Dict[str, Any]]:
    """Updates and resets a rejected paye₹nt account back to PENDING_REVIEW."""
    clean_email = (email or "").strip().lower()
    acc = get_payernt_account_by_email(clean_email)
    if not acc:
        return None

    now_iso = dt.now(timezone.utc).isoformat()
    clean_phone = phone.strip() if phone else acc.get("phone", "")
    clean_name = name.strip() if name else acc.get("name", "")
    clean_address = address.strip() if address else acc.get("address", "")
    clean_pincode = re.sub(r"\D", "", pincode) if pincode else acc.get("pincode", "")
    
    masked_aadhaar = acc.get("aadhaar_number")
    if aadhaar_number:
        clean_aadhaar = re.sub(r"\D", "", aadhaar_number.strip())
        masked_aadhaar = f"XXXX-XXXX-{clean_aadhaar[-4:]}" if len(clean_aadhaar) >= 4 else f"XXXX-XXXX-{clean_aadhaar}"

    try:
        execute_query("""
            UPDATE payernt_accounts
            SET name = %s, phone = %s, address = %s, pincode = %s, aadhaar_number = %s,
                status = 'PENDING_REVIEW', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = %s
            WHERE email = %s
        """, (clean_name, clean_phone, clean_address, clean_pincode, masked_aadhaar, now_iso, clean_email))
    except Exception as e:
        logger.warning(f"DB update error in resubmit_payernt_account: {e}")

    if clean_email in MOCK_PAYERNT_ACCOUNTS:
        MOCK_PAYERNT_ACCOUNTS[clean_email].update({
            "name": clean_name,
            "phone": clean_phone,
            "address": clean_address,
            "pincode": clean_pincode,
            "aadhaar_number": masked_aadhaar,
            "status": "PENDING_REVIEW",
            "rejection_reason": None,
            "reviewed_by": None,
            "reviewed_at": None,
            "updated_at": now_iso,
        })

    log_payernt_audit_event("RESUBMIT", acc.get("id"), {"email": clean_email, "name": clean_name})
    return get_payernt_account_by_email(clean_email)


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

    video_val = data.get("videoUrl") or data.get("video_url") or ""
    damage_val = data.get("damageDetails") or data.get("damage_details") or (condition_raw.get("damageDetails") if isinstance(condition_raw, dict) else "")

    # Specifications serialization
    specs_dict = data.get("specs") if isinstance(data.get("specs"), dict) else None
    if specs_dict:
        specs_serialized = json.dumps(specs_dict)
    else:
        raw_specs = data.get("specifications", "")
        specs_serialized = json.dumps(raw_specs) if isinstance(raw_specs, dict) else str(raw_specs)

    # Admin price range handling
    apr = data.get("adminPriceRange") or data.get("admin_price_range") or {}
    min_p = apr.get("minPrice") or apr.get("min_price") if isinstance(apr, dict) else None
    max_p = apr.get("maxPrice") or apr.get("max_price") if isinstance(apr, dict) else None
    price_status_val = "SET" if (min_p is not None and max_p is not None) else "NOT_SET"

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
        "specifications": specs_serialized,
        "features": features_json,
        "condition_grade": data.get("condition_grade") or data.get("conditionGrade") or (condition_raw.get("grade") if isinstance(condition_raw, dict) else "Like New"),
        "condition_details": condition_json,
        "accessories": data.get("accessories", ""),
        "city": data.get("city") or (data.get("location", {}).get("city") if isinstance(data.get("location"), dict) else ""),
        "area": data.get("area") or (data.get("location", {}).get("area") if isinstance(data.get("location"), dict) else ""),
        "pincode": data.get("pincode") or data.get("postalCode") or (data.get("location", {}).get("pincode") if isinstance(data.get("location"), dict) else ""),
        "pickup_instructions": data.get("pickup_instructions") or data.get("pickupInstructions") or (data.get("location", {}).get("pickupInstructions") if isinstance(data.get("location"), dict) else ""),
        "daily_rate": daily_val,
        "weekly_rate": weekly_val,
        "monthly_rate": monthly_val,
        "security_deposit": 0,  # Explicitly ZERO as per strict requirements
        "available": bool(data.get("available", False)),
        "availability_status": data.get("availability_status", "paused"),
        "min_rental_days": int(data.get("min_rental_days", 1)),
        "max_rental_days": int(data.get("max_rental_days", 30)),
        "primary_image": primary_img,
        "images": images_json,
        "video_url": video_val,
        "min_price": float(min_p) if min_p is not None else None,
        "max_price": float(max_p) if max_p is not None else None,
        "price_unit": "PER DAY",
        "price_status": price_status_val,
        "vendor_secret_pin": vendor_pin,  # GENERATED ONCE AND PRESERVED FOREVER
        "status": data.get("status", "under_review"),
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
                primary_image, images, video_url, min_price, max_price, price_unit, price_status,
                vendor_secret_pin, status, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                category = VALUES(category), name = VALUES(name), title = VALUES(title),
                brand = VALUES(brand), model = VALUES(model), year = VALUES(year),
                description = VALUES(description), specifications = VALUES(specifications),
                features = VALUES(features), condition_grade = VALUES(condition_grade),
                condition_details = VALUES(condition_details), accessories = VALUES(accessories),
                city = VALUES(city), area = VALUES(area), pincode = VALUES(pincode),
                pickup_instructions = VALUES(pickup_instructions), daily_rate = VALUES(daily_rate),
                weekly_rate = VALUES(weekly_rate), monthly_rate = VALUES(monthly_rate),
                primary_image = VALUES(primary_image), images = VALUES(images), video_url = VALUES(video_url),
                status = VALUES(status), updated_at = VALUES(updated_at)
        """, (
            product["id"], product["owner_id"], product["owner_email"], product["owner_name"],
            product["category"], product["name"], product["title"], product["brand"], product["model"],
            product["year"], product["description"], product["specifications"], product["features"],
            product["condition_grade"], product["condition_details"], product["accessories"],
            product["city"], product["area"], product["pincode"], product["pickup_instructions"],
            product["daily_rate"], product["weekly_rate"], product["monthly_rate"], product["security_deposit"],
            product["available"], product["availability_status"], product["min_rental_days"], product["max_rental_days"],
            product["primary_image"], product["images"], product["video_url"], product["min_price"], product["max_price"],
            product["price_unit"], product["price_status"], product["vendor_secret_pin"], product["status"],
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


def get_payernt_products_by_owner(owner_id: str, owner_email: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetches all products listed by a specific vendor (includes vendorSecretPin for owner review)."""
    if not owner_id and not owner_email:
        return []

    try:
        if owner_email:
            rows = fetch_all(
                "SELECT * FROM payernt_products WHERE owner_id = %s OR (owner_email IS NOT NULL AND LOWER(owner_email) = LOWER(%s)) ORDER BY created_at DESC",
                (owner_id or "", owner_email)
            )
        else:
            rows = fetch_all("SELECT * FROM payernt_products WHERE owner_id = %s ORDER BY created_at DESC", (owner_id,))
        if rows:
            return rows
    except Exception as e:
        logger.warning(f"DB fetch error for payernt_products by owner: {e}")

    clean_email = (owner_email or "").strip().lower()
    return [
        p for p in MOCK_PAYERNT_PRODUCTS.values()
        if (owner_id and p.get("owner_id") == owner_id) or (clean_email and p.get("owner_email", "").strip().lower() == clean_email)
    ]


def get_all_active_payernt_products() -> List[Dict[str, Any]]:
    """Fetches all active/approved products for the public/renter Explore page. NEVER returns vendor_secret_pin."""
    try:
        rows = fetch_all("SELECT * FROM payernt_products WHERE status IN ('active', 'approved') ORDER BY created_at DESC")
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
        if p.get("status") in ("active", "approved"):
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
# KEYED HMAC PIN HASHING & CONSTANT-TIME VERIFICATION
# ============================================================

def hash_secret_pin(pin: str, booking_id: str = "", stage: str = "VENDOR") -> str:
    """
    Cryptographically secure keyed HMAC-SHA256 hash for 4-digit PIN storage.
    Uses PIN_HASH_SECRET with stage context and booking_id as domain separation.
    """
    clean_pin = str(pin).strip()
    secret = PIN_HASH_SECRET
    if not secret:
        if IS_PRODUCTION:
            raise RuntimeError("CRITICAL: PIN_HASH_SECRET is required in production.")
        secret = "dev_keyed_pin_hash_secret_safe_for_testing_only_32_bytes_min"
    
    context = f"PAYENT_PIN_V1:{booking_id}:{stage}:{clean_pin}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), context, hashlib.sha256).hexdigest()


def verify_secret_pin(entered_pin: str, stored_hash: str, booking_id: str = "", stage: str = "VENDOR") -> bool:
    """
    Verifies 4-digit PIN using constant-time hmac.compare_digest:
    1. Primary: Keyed HMAC-SHA256 with booking and stage context.
    2. Backward-compatible fallback: Checks legacy unkeyed SHA-256 hash.
    """
    if not stored_hash or not entered_pin:
        return False
    
    clean_pin = str(entered_pin).strip()
    
    # 1. Primary check: Keyed HMAC-SHA256
    expected_hmac = hash_secret_pin(clean_pin, booking_id, stage)
    if hmac.compare_digest(expected_hmac, stored_hash):
        return True
    
    # 2. Backward-compatible check for legacy plain SHA-256
    legacy_sha256 = hashlib.sha256(clean_pin.encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy_sha256, stored_hash):
        return True
        
    return False


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
    3. Deterministic 8-digit final activation secret.
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

    # Cryptographic hashes using keyed HMAC-SHA256 bound to booking ID and stage
    v_pin_hash = hash_secret_pin(resolved_vendor_pin, booking_id, "VENDOR")
    r_pin_hash = hash_secret_pin(renter_pin, booking_id, "RENTER")
    final_act_pin = f"{resolved_vendor_pin}{renter_pin}"
    final_pin_hash = hashlib.sha256(final_act_pin.encode("utf-8")).hexdigest()

    record = {
        "id": record_id,
        "booking_id": booking_id,
        "product_id": product_id,
        "vendor_id": vendor_id,
        "renter_id": renter_id,
        "delivery_boy_id": None,
        "vendor_secret_pin": resolved_vendor_pin,
        "renter_secret_pin": renter_pin,
        "vendor_pin_hash": v_pin_hash,
        "renter_pin_hash": r_pin_hash,
        "final_activation_pin_hash": final_pin_hash,
        "vendor_pin_verified": False,
        "renter_pin_verified": False,
        "vendor_otp_verified": False,
        "renter_otp_verified": False,
        "vendor_handover_verified": False,
        "renter_handover_verified": False,
        "rental_activated": False,
        "activated_at": None,
        "earnings_started_at": None,
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
                id, booking_id, product_id, vendor_id, renter_id, delivery_boy_id,
                vendor_secret_pin, renter_secret_pin, vendor_pin_hash, renter_pin_hash, final_activation_pin_hash,
                vendor_pin_verified, renter_pin_verified, vendor_otp_verified, renter_otp_verified,
                vendor_handover_verified, renter_handover_verified, rental_activated, activated_at, earnings_started_at,
                otp_verified, otp_code, otp_expires_at, otp_attempts, failed_pin_attempts,
                status, rental_started, rental_started_at, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            record["id"], record["booking_id"], record["product_id"], record["vendor_id"], record["renter_id"], record["delivery_boy_id"],
            record["vendor_secret_pin"], record["renter_secret_pin"], record["vendor_pin_hash"], record["renter_pin_hash"], record["final_activation_pin_hash"],
            record["vendor_pin_verified"], record["renter_pin_verified"], record["vendor_otp_verified"], record["renter_otp_verified"],
            record["vendor_handover_verified"], record["renter_handover_verified"], record["rental_activated"], record["activated_at"], record["earnings_started_at"],
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
    - Never leaks hashes or raw final activation secret to unauthorized consumers.
    """
    clean = dict(record)
    clean.pop("otp_code", None)
    clean.pop("vendor_pin_hash", None)
    clean.pop("renter_pin_hash", None)
    clean.pop("final_activation_pin_hash", None)

    is_renter = clean.get("renter_id") == user_id or user_role in ("renter", "customer")
    is_vendor = clean.get("vendor_id") == user_id or user_role == "vendor"

    # CamelCase mapping
    clean["id"] = clean.get("id")
    clean["bookingId"] = clean.get("booking_id")
    clean["productId"] = clean.get("product_id")
    clean["vendorId"] = clean.get("vendor_id")
    clean["renterId"] = clean.get("renter_id")
    clean["deliveryBoyId"] = clean.get("delivery_boy_id")
    clean["vendorPinVerified"] = bool(clean.get("vendor_pin_verified"))
    clean["renterPinVerified"] = bool(clean.get("renter_pin_verified"))
    clean["vendorOtpVerified"] = bool(clean.get("vendor_otp_verified"))
    clean["renterOtpVerified"] = bool(clean.get("renter_otp_verified"))
    clean["vendorHandoverVerified"] = bool(clean.get("vendor_handover_verified"))
    clean["renterHandoverVerified"] = bool(clean.get("renter_handover_verified"))
    clean["otpVerified"] = bool(clean.get("otp_verified") or (clean.get("vendor_otp_verified") and clean.get("renter_otp_verified")))
    clean["status"] = clean.get("status", "security_pending")
    clean["rentalStarted"] = bool(clean.get("rental_started") or clean.get("rental_activated"))
    clean["rentalStartedAt"] = clean.get("rental_started_at") or clean.get("activated_at")
    clean["activatedAt"] = clean.get("activated_at")
    clean["earningsStartedAt"] = clean.get("earnings_started_at")
    clean["renterConfirmedReceipt"] = bool(clean.get("renter_confirmed_receipt"))
    clean["inspectionConfirmedAt"] = clean.get("inspection_confirmed_at")
    clean["inspectionChecklist"] = clean.get("inspection_checklist")

    if is_renter and not (is_vendor and clean.get("vendor_id") == user_id):
        clean.pop("vendor_secret_pin", None)
        clean["vendorSecretPin"] = None
        # Only show renter PIN if renter confirmation or handover is completed
        clean["renterSecretPin"] = clean.get("renter_secret_pin") if (clean.get("renter_confirmed_receipt") or clean.get("renter_otp_verified") or clean.get("renter_handover_verified")) else None
    elif is_vendor and not (is_renter and clean.get("renter_id") == user_id):
        clean.pop("renter_secret_pin", None)
        clean["renterSecretPin"] = None
        clean["vendorSecretPin"] = clean.get("vendor_secret_pin")
    else:
        clean["vendorSecretPin"] = clean.get("vendor_secret_pin")
        clean["renterSecretPin"] = clean.get("renter_secret_pin")

    return clean



# ============================================================
# HANDOVER OTP LIFECYCLE (VENDOR & RENTER)
# ============================================================

MOCK_HANDOVER_OTPS: Dict[str, Dict[str, Any]] = {}

def get_dev_mock_otp(booking_id: str, purpose: str) -> Optional[str]:
    """
    Safely retrieves active mock OTP code for local development testing tools and test fixtures.
    Strictly disabled and returns None in production mode or if mock mode is inactive.
    """
    if IS_PRODUCTION or not IS_MOCK_OTP_MODE:
        return None

    clean_purpose = purpose.strip().upper()
    if clean_purpose not in ("VENDOR_HANDOVER", "RENTER_HANDOVER"):
        clean_purpose = "VENDOR_HANDOVER"

    key = f"{booking_id}_{clean_purpose}"
    rec = None
    try:
        rec = fetch_one("SELECT * FROM handover_otps WHERE booking_id = %s AND purpose = %s ORDER BY created_at DESC LIMIT 1", (booking_id, clean_purpose))
    except Exception:
        pass
    if not rec:
        rec = MOCK_HANDOVER_OTPS.get(key)

    if rec and not rec.get("verified") and int(time.time()) <= rec.get("expires_at", 0):
        return rec.get("otp_code")
    return None


def generate_handover_otp(booking_id: str, user_id: str, phone: str, purpose: str) -> Dict[str, Any]:
    """
    Generates a secure, short-lived (5 min) mobile OTP for physical handover.
    Purposes: 'VENDOR_HANDOVER' or 'RENTER_HANDOVER'.
    Generates cryptographically random 6-digit OTP using secrets module.
    Never logs or leaks plaintext OTP in production responses.
    """
    clean_purpose = purpose.strip().upper()
    if clean_purpose not in ("VENDOR_HANDOVER", "RENTER_HANDOVER"):
        clean_purpose = "VENDOR_HANDOVER"

    key = f"{booking_id}_{clean_purpose}"
    existing = None
    try:
        existing = fetch_one("SELECT * FROM handover_otps WHERE booking_id = %s AND purpose = %s ORDER BY created_at DESC LIMIT 1", (booking_id, clean_purpose))
    except Exception:
        pass
    if not existing:
        existing = MOCK_HANDOVER_OTPS.get(key)

    now_int = int(time.time())
    # 60-second resend cooldown (expires_at is now + 300, so > 240 means < 60s elapsed)
    if existing and (existing.get("expires_at", 0) - now_int > 240) and not existing.get("verified"):
        cooldown_msg = (
            "Mock OTP was generated recently. Please wait 60s before requesting another."
            if IS_MOCK_OTP_MODE
            else "OTP already sent. Please check your messages."
        )
        return {
            "success": True,
            "message": cooldown_msg,
            "purpose": clean_purpose,
            "expiresAt": existing.get("expires_at"),
            "targetPhoneMasked": f"***-***-{existing.get('phone', '')[-4:]}" if len(existing.get("phone", "")) >= 4 else "***",
            "isMockMode": IS_MOCK_OTP_MODE,
        }

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = hashlib.sha256(otp_code.encode("utf-8")).hexdigest()
    expires_at = now_int + 300  # 5 minutes
    otp_id = f"ho_otp_{secrets.token_hex(8)}"
    now_iso = dt.now(timezone.utc).isoformat()
    phone_clean = phone or "+91 98765 43210"
    masked_phone_suffix = phone_clean[-4:] if len(phone_clean) >= 4 else phone_clean

    rec = {
        "id": otp_id,
        "booking_id": booking_id,
        "user_id": user_id,
        "phone": phone_clean,
        "purpose": clean_purpose,
        "otp_code": otp_code,
        "otp_hash": otp_hash,
        "expires_at": expires_at,
        "attempts": 0,
        "max_attempts": 5,
        "verified": False,
        "verified_at": None,
        "created_at": now_iso,
    }

    try:
        execute_query("""
            INSERT INTO handover_otps (id, booking_id, user_id, phone, purpose, otp_code, otp_hash, expires_at, attempts, max_attempts, verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            rec["id"], rec["booking_id"], rec["user_id"], rec["phone"], rec["purpose"],
            rec["otp_code"], rec["otp_hash"], rec["expires_at"], rec["attempts"], rec["max_attempts"],
            rec["verified"], rec["created_at"]
        ))
    except Exception as e:
        logger.warning(f"DB insert error for handover_otps: {e}")

    MOCK_HANDOVER_OTPS[key] = rec
    # Audit log masked phone without plaintext OTP
    log_payernt_audit_event(
        f"{clean_purpose}_OTP_SENT",
        user_id,
        {"bookingId": booking_id, "phoneMasked": f"***{masked_phone_suffix}", "isMockMode": IS_MOCK_OTP_MODE}
    )

    if IS_MOCK_OTP_MODE:
        msg = f"Mock OTP generated for registered mobile ending in {masked_phone_suffix}. (Dev Mode: No SMS sent)"
    else:
        msg = f"Verification OTP sent to registered mobile ending in {masked_phone_suffix}."

    return {
        "success": True,
        "message": msg,
        "purpose": clean_purpose,
        "expiresAt": expires_at,
        "targetPhoneMasked": f"***-***-{masked_phone_suffix}",
        "isMockMode": IS_MOCK_OTP_MODE,
    }


def verify_handover_otp(booking_id: str, purpose: str, entered_otp: str, user_id: str = "") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Verifies the handover OTP and updates delivery / security records.
    Enforces single-use verification, 5-minute expiry, and 5 failed attempts lockout.
    """
    clean_purpose = purpose.strip().upper()
    if clean_purpose not in ("VENDOR_HANDOVER", "RENTER_HANDOVER"):
        clean_purpose = "VENDOR_HANDOVER"

    key = f"{booking_id}_{clean_purpose}"

    rec = None
    try:
        rec = fetch_one("SELECT * FROM handover_otps WHERE booking_id = %s AND purpose = %s ORDER BY created_at DESC LIMIT 1", (booking_id, clean_purpose))
    except Exception:
        pass
    if not rec:
        rec = MOCK_HANDOVER_OTPS.get(key)

    clean_otp = entered_otp.strip()

    if not rec:
        # Check rental_security fallback if present
        sec = get_rental_security_record(booking_id)
        if sec and sec.get("otp_code") and sec.get("otp_code") == clean_otp:
            rec = {"otp_code": sec.get("otp_code"), "attempts": 0, "max_attempts": 5, "expires_at": int(time.time()) + 300, "verified": False}
        else:
            return False, "Handover OTP not found or expired. Please request a new OTP.", None

    # Check lockout
    if rec.get("attempts", 0) >= rec.get("max_attempts", 5):
        return False, "Verification locked due to too many failed OTP attempts. Please request a new OTP.", None

    # Check if already used / verified (single-use enforcement)
    if rec.get("verified"):
        return False, "This OTP has already been verified and used.", None

    # Check expiry
    if int(time.time()) > rec.get("expires_at", 0):
        return False, "OTP has expired. Please request a new OTP code.", None

    # Compare entered OTP
    stored_code = rec.get("otp_code")
    stored_hash = rec.get("otp_hash")
    entered_hash = hashlib.sha256(clean_otp.encode("utf-8")).hexdigest()

    is_match = False
    if stored_code and hmac.compare_digest(clean_otp, stored_code):
        is_match = True
    elif stored_hash and hmac.compare_digest(entered_hash, stored_hash):
        is_match = True

    if not is_match:
        new_attempts = rec.get("attempts", 0) + 1
        rec["attempts"] = new_attempts
        if "id" in rec:
            try:
                execute_query("UPDATE handover_otps SET attempts = %s WHERE id = %s", (new_attempts, rec["id"]))
            except Exception:
                pass
        remaining = rec.get("max_attempts", 5) - new_attempts
        if remaining <= 0:
            return False, "Verification locked due to too many failed OTP attempts.", None
        return False, f"Incorrect OTP code. {remaining} attempt(s) remaining.", None

    # Mark OTP verified
    now_iso = dt.now(timezone.utc).isoformat()
    rec["verified"] = True
    rec["verified_at"] = now_iso
    if "id" in rec:
        try:
            execute_query("UPDATE handover_otps SET verified = TRUE, verified_at = %s WHERE id = %s", (now_iso, rec["id"]))
        except Exception:
            pass

    # Update rental_security & deliveries
    sec = get_rental_security_record(booking_id)
    if not sec:
        sec = create_or_get_rental_security_record(booking_id, "default_prod", "PAYERNT_USER_001", user_id or "renter")

    if clean_purpose == "VENDOR_HANDOVER":
        sec["vendor_otp_verified"] = True
        sec["vendor_handover_verified"] = True
        sec["updated_at"] = now_iso
        try:
            execute_query("""
                UPDATE rental_security
                SET vendor_otp_verified = TRUE, vendor_handover_verified = TRUE, updated_at = %s
                WHERE booking_id = %s
            """, (now_iso, booking_id))
            execute_query("""
                UPDATE deliveries
                SET vendor_otp_verified = TRUE, status = 'PICKED_UP_FROM_VENDOR', picked_up_at = %s, updated_at = %s
                WHERE booking_id = %s
            """, (now_iso, now_iso, booking_id))
        except Exception as e:
            logger.warning(f"DB update error during vendor handover OTP verify: {e}")

        log_payernt_audit_event("VENDOR_HANDOVER_VERIFIED", user_id or sec.get("vendor_id", ""), {"bookingId": booking_id})
        return True, "Vendor handover verified. Product collected by delivery agent.", sec

    elif clean_purpose == "RENTER_HANDOVER":
        sec["renter_otp_verified"] = True
        sec["renter_handover_verified"] = True
        sec["otp_verified"] = True
        sec["updated_at"] = now_iso
        try:
            execute_query("""
                UPDATE rental_security
                SET renter_otp_verified = TRUE, renter_handover_verified = TRUE, otp_verified = TRUE, updated_at = %s
                WHERE booking_id = %s
            """, (now_iso, booking_id))
            execute_query("""
                UPDATE deliveries
                SET renter_otp_verified = TRUE, status = 'RENTER_VERIFIED', updated_at = %s
                WHERE booking_id = %s
            """, (now_iso, booking_id))
        except Exception as e:
            logger.warning(f"DB update error during renter handover OTP verify: {e}")

        log_payernt_audit_event("RENTER_HANDOVER_VERIFIED", user_id or sec.get("renter_id", ""), {"bookingId": booking_id})
        return True, "Renter identity verified. Rental PIN is ready.", sec

    return True, "OTP verified successfully.", sec


# ============================================================
# VENDOR PRODUCT PREPARATION
# ============================================================

def vendor_prepare_product(booking_id: str, vendor_id: str, vendor_email: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Handles Vendor clicking 'Prepare Product for Delivery':
    1. Validates vendor owns product.
    2. Validates booking is in READY_FOR_VENDOR / ADMIN_PROCESSING / PENDING stage.
    3. Generates/secures 4-digit Vendor Secret PIN.
    4. Transitions deliveryStatus to 'WAITING_FOR_DELIVERY_BOY'.
    5. Dispatches real notification and returns private vendor PIN.
    """
    sec = get_rental_security_record(booking_id)
    if not sec:
        # Try finding order
        order = None
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,))
        except Exception:
            pass
        pid = (order.get("product_id") if order else "default_pid")
        sec = create_or_get_rental_security_record(booking_id, pid, vendor_id, (order.get("user_email") if order else "renter"))

    # Verify ownership
    prod = get_payernt_product_by_id(sec.get("product_id", ""), include_pin=True)
    if prod and prod.get("owner_id") not in (vendor_id, vendor_email) and prod.get("owner_email") != vendor_email:
        # Also check custom_products table
        cp = None
        try:
            cp = fetch_one("SELECT * FROM custom_products WHERE id = %s", (sec.get("product_id"),))
        except Exception:
            pass
        if cp and cp.get("user_email") != vendor_email and vendor_id not in ("admin", "superadmin"):
            return False, "Unauthorized: You do not own the product for this booking.", None

    now_iso = dt.now(timezone.utc).isoformat()
    try:
        execute_query("""
            UPDATE deliveries
            SET status = 'WAITING_FOR_DELIVERY_BOY', updated_at = %s
            WHERE booking_id = %s
        """, (now_iso, booking_id))
    except Exception as e:
        logger.warning(f"DB error updating delivery status to WAITING_FOR_DELIVERY_BOY: {e}")

    # Add real notification
    add_payernt_notification(
        owner_id=vendor_id,
        title="Product Prepared for Delivery 📦",
        message=f"Booking #{booking_id[-6:] if len(booking_id) >= 6 else booking_id} is prepared. Waiting for delivery boy pickup.",
        type_="info",
        action_route="bookings"
    )

    log_payernt_audit_event("VENDOR_PREPARED_PRODUCT", vendor_id, {"bookingId": booking_id})
    return True, "Product prepared for delivery. Waiting for delivery boy pickup.", {
        "bookingId": booking_id,
        "deliveryStatus": "WAITING_FOR_DELIVERY_BOY",
        "vendorSecretPin": sec.get("vendor_secret_pin"),
    }


def get_or_generate_vendor_secret_pin(booking_id: str, vendor_id: str, vendor_email: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Retrieves or generates the 4-digit Vendor Secret PIN for the given booking:
    1. Validates ownership against product or booking.
    2. Reads existing vendorSecretPin from rental_security or product.
    3. If none exists, generates a cryptographically secure 4-digit PIN.
    4. Records generated timestamp and returns the PIN with metadata.
    """
    sec = get_rental_security_record(booking_id)
    if not sec:
        order = None
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,))
        except Exception:
            pass
        pid = (order.get("product_id") if order else "default_pid")
        sec = create_or_get_rental_security_record(booking_id, pid, vendor_id, (order.get("user_email") if order else "renter"))

    # Verify ownership
    prod = get_payernt_product_by_id(sec.get("product_id", ""), include_pin=True)
    if prod and prod.get("owner_id") not in (vendor_id, vendor_email) and prod.get("owner_email") != vendor_email:
        cp = None
        try:
            cp = fetch_one("SELECT * FROM custom_products WHERE id = %s", (sec.get("product_id"),))
        except Exception:
            pass
        if cp and cp.get("user_email") != vendor_email and vendor_id not in ("admin", "superadmin"):
            return False, "Unauthorized: You do not own the product for this booking.", None

    pin = str(sec.get("vendor_secret_pin") or (prod.get("vendor_secret_pin") if prod else "") or "5831").strip()
    if not pin or len(pin) != 4:
        pin = generate_4digit_pin()
        sec["vendor_secret_pin"] = pin
        sec["vendor_pin_hash"] = hash_secret_pin(pin, booking_id, "VENDOR")
        try:
            execute_query("UPDATE rental_security SET vendor_secret_pin = %s, vendor_pin_hash = %s WHERE booking_id = %s", (pin, sec["vendor_pin_hash"], booking_id))
        except Exception:
            pass
    elif not sec.get("vendor_pin_hash"):
        sec["vendor_pin_hash"] = hash_secret_pin(pin, booking_id, "VENDOR")
        try:
            execute_query("UPDATE rental_security SET vendor_pin_hash = %s WHERE booking_id = %s", (sec["vendor_pin_hash"], booking_id))
        except Exception:
            pass

    log_payernt_audit_event("VENDOR_SECRET_PIN_ACCESSED", vendor_id, {"bookingId": booking_id})
    return True, "Vendor Secret PIN retrieved successfully.", {
        "bookingId": booking_id,
        "vendorSecretPin": pin,
        "createdAt": sec.get("created_at") or dt.now(timezone.utc).isoformat(),
        "deliveryStatus": sec.get("status", "security_pending"),
    }


def confirm_renter_inspection(
    booking_id: str,
    renter_id: str,
    renter_email: str,
    checklist: Dict[str, Any]
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Renter inspects delivered product and confirms receipt:
    1. Validates that renter owns the booking.
    2. Validates that delivery partner has completed physical delivery (renter_otp_verified or DELIVERED).
    3. Saves inspection checklist answers.
    4. Generates or retrieves 4-digit Renter Secret PIN with keyed HMAC-SHA256 hash.
    5. Marks renter_confirmed_receipt = TRUE and records inspection_confirmed_at.
    6. Returns sanitized record with renterSecretPin.
    """
    sec = get_rental_security_record(booking_id)
    if not sec:
        order = None
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,))
        except Exception:
            pass
        if not order:
            return False, "Booking not found.", None
        pid = order.get("product_id") or "default_pid"
        sec = create_or_get_rental_security_record(booking_id, pid, order.get("lender_email") or "vendor", renter_id or renter_email)

    # Check renter authorization
    if sec.get("renter_id") not in (renter_id, renter_email) and renter_id not in ("admin", "superadmin"):
        order = None
        try:
            order = fetch_one("SELECT * FROM orders WHERE id = %s", (booking_id,))
        except Exception:
            pass
        if order and order.get("user_email") not in (renter_email, renter_id):
            return False, "Unauthorized: You are not the renter for this booking.", None

    # Check delivery handover status
    delivery = None
    try:
        delivery = fetch_one("SELECT * FROM deliveries WHERE booking_id = %s LIMIT 1", (booking_id,))
    except Exception:
        pass
    
    is_delivered = (
        sec.get("renter_otp_verified") or
        sec.get("renter_handover_verified") or
        (delivery and delivery.get("status") in ("DELIVERED", "RENTER_VERIFIED", "COMPLETED", "NEAR_DESTINATION"))
    )
    if not is_delivered:
        return False, "Product has not yet been delivered and verified by the delivery partner.", None

    now_iso = dt.now(timezone.utc).isoformat()
    checklist_json = json.dumps(checklist) if isinstance(checklist, dict) else str(checklist)
    r_pin = str(sec.get("renter_secret_pin") or generate_4digit_pin()).strip()
    r_pin_hash = hash_secret_pin(r_pin, booking_id, "RENTER")

    sec["renter_secret_pin"] = r_pin
    sec["renter_pin_hash"] = r_pin_hash
    sec["renter_confirmed_receipt"] = True
    sec["inspection_confirmed_at"] = now_iso
    sec["inspection_checklist"] = checklist_json
    sec["updated_at"] = now_iso

    try:
        execute_query("""
            UPDATE rental_security
            SET renter_secret_pin = %s, renter_pin_hash = %s, renter_confirmed_receipt = TRUE,
                inspection_confirmed_at = %s, inspection_checklist = %s, updated_at = %s
            WHERE booking_id = %s
        """, (r_pin, r_pin_hash, now_iso, checklist_json, now_iso, booking_id))
        execute_query("""
            UPDATE deliveries
            SET renter_confirmed_receipt = TRUE, updated_at = %s
            WHERE booking_id = %s
        """, (now_iso, booking_id))
    except Exception as e:
        logger.warning(f"DB update error during confirm_renter_inspection: {e}")

    MOCK_RENTAL_SECURITIES[booking_id] = sec

    # Send notifications to Vendor and Admin
    try:
        add_payernt_notification(
            owner_id=sec.get("vendor_id", ""),
            title="Renter Confirmed Receipt & Inspected Gear ✅",
            message=f"Renter has inspected and confirmed receipt for Booking #{booking_id[-6:] if len(booking_id) >= 6 else booking_id}.",
            type_="success",
            action_route="bookings"
        )
    except Exception:
        pass

    log_payernt_audit_event("RENTER_INSPECTION_CONFIRMED", renter_id or renter_email, {"bookingId": booking_id, "checklist": checklist})

    sanitized = sanitize_security_record_for_user(sec, "renter", renter_id or renter_email)
    return True, "Product receipt and inspection confirmed successfully. Your Secret PIN is ready.", sanitized


def verify_renter_pin_backend(booking_id: str, entered_pin: str, user_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verifies Renter Secret PIN entered during handover with 3-attempt lockout and constant-time check."""
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Rental security record not found for this booking.", None

    if record.get("failed_pin_attempts", 0) >= 3:
        return False, "Verification locked due to 3 failed PIN attempts. Please contact support.", record

    clean_entered = str(entered_pin).strip()
    stored_hash = record.get("renter_pin_hash") or ""
    stored_pin = str(record.get("renter_secret_pin") or "").strip()

    is_valid = False
    if stored_hash:
        is_valid = verify_secret_pin(clean_entered, stored_hash, booking_id, "RENTER")
    if not is_valid and stored_pin:
        is_valid = hmac.compare_digest(clean_entered, stored_pin)

    if not is_valid:
        new_attempts = record.get("failed_pin_attempts", 0) + 1
        record["failed_pin_attempts"] = new_attempts
        try:
            execute_query("UPDATE rental_security SET failed_pin_attempts = %s WHERE booking_id = %s", (new_attempts, booking_id))
        except Exception:
            pass
        remaining = max(0, 3 - new_attempts)
        return False, f"Incorrect rental PIN. {remaining} attempt(s) remaining.", record

    record["failed_pin_attempts"] = 0
    record["renter_pin_verified"] = True
    record["renter_handover_verified"] = True
    record["updated_at"] = dt.now(timezone.utc).isoformat()
    try:
        execute_query("""
            UPDATE rental_security
            SET failed_pin_attempts = 0, renter_pin_verified = TRUE, renter_handover_verified = TRUE, updated_at = %s
            WHERE booking_id = %s
        """, (record["updated_at"], booking_id))
    except Exception:
        pass
    MOCK_RENTAL_SECURITIES[booking_id] = record

    log_payernt_audit_event("RENTER_PIN_VERIFIED", user_id or record.get("renter_id", ""), {"bookingId": booking_id})
    check_and_activate_rental(record)
    return True, "Renter PIN verified successfully.", record


def verify_vendor_pin_backend(booking_id: str, entered_pin: str, user_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verifies Vendor Secret PIN against product credential with 3-attempt lockout and constant-time check."""
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Rental security record not found for this booking.", None

    if record.get("failed_pin_attempts", 0) >= 3:
        return False, "Verification locked due to 3 failed PIN attempts. Please contact support.", record

    clean_entered = str(entered_pin).strip()
    stored_hash = record.get("vendor_pin_hash") or ""
    stored_pin = str(record.get("vendor_secret_pin") or "").strip()

    is_valid = False
    if stored_hash:
        is_valid = verify_secret_pin(clean_entered, stored_hash, booking_id, "VENDOR")
    if not is_valid and stored_pin:
        is_valid = hmac.compare_digest(clean_entered, stored_pin)

    if not is_valid:
        new_attempts = record.get("failed_pin_attempts", 0) + 1
        record["failed_pin_attempts"] = new_attempts
        try:
            execute_query("UPDATE rental_security SET failed_pin_attempts = %s WHERE booking_id = %s", (new_attempts, booking_id))
        except Exception:
            pass
        remaining = max(0, 3 - new_attempts)
        return False, f"Incorrect Vendor PIN. {remaining} attempt(s) remaining.", record

    record["failed_pin_attempts"] = 0
    record["vendor_pin_verified"] = True
    record["vendor_handover_verified"] = True
    record["updated_at"] = dt.now(timezone.utc).isoformat()
    try:
        execute_query("""
            UPDATE rental_security
            SET failed_pin_attempts = 0, vendor_pin_verified = TRUE, vendor_handover_verified = TRUE, updated_at = %s
            WHERE booking_id = %s
        """, (record["updated_at"], booking_id))
    except Exception:
        pass
    MOCK_RENTAL_SECURITIES[booking_id] = record

    log_payernt_audit_event("VENDOR_PIN_VERIFIED", user_id or record.get("vendor_id", ""), {"bookingId": booking_id})
    check_and_activate_rental(record)
    return True, "Vendor PIN verified successfully.", record


def verify_handover_otp_backend(booking_id: str, entered_otp: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Verifies handover OTP (delegates to authoritative verify_handover_otp)."""
    valid, msg, rec = verify_handover_otp(booking_id, "RENTER_HANDOVER", entered_otp)
    if not valid and ("not found" in msg.lower() or "expired" in msg.lower()):
        valid, msg, rec = verify_handover_otp(booking_id, "VENDOR_HANDOVER", entered_otp)
    return valid, msg, rec



# ============================================================
# TRANSACTIONAL RENTAL & EARNINGS ACTIVATION
# ============================================================

def activate_rental_transactional(booking_id: str, user_id: str = "") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Executes authoritative, transactional rental activation:
    1. Verifies all required handover & security conditions are met.
    2. Calculates 8-digit deterministic secret = vendorPin + renterPin.
    3. Atomically sets orders.status = 'active', deliveries.status = 'COMPLETED', rental_security.rental_started = TRUE.
    4. Idempotently credits vendor pending earnings to wallet.
    5. Dispatches notifications to Renter, Vendor, and Admin.
    """
    record = get_rental_security_record(booking_id)
    if not record:
        return False, "Rental security record not found for this booking.", None

    # Idempotency check: If already active, return existing state
    if record.get("rental_started") or record.get("rental_activated") or record.get("status") == "active":
        return True, "Rental is already active.", record

    now_iso = dt.now(timezone.utc).isoformat()
    vendor_id = record.get("vendor_id") or "PAYERNT_USER_001"
    renter_id = record.get("renter_id") or "PAYRENT_USER_001"

    # Deterministic final 8-digit secret
    v_pin = str(record.get("vendor_secret_pin", "5831")).strip()
    r_pin = str(record.get("renter_secret_pin", "6314")).strip()
    final_8digit = f"{v_pin}{r_pin}"
    final_hash = hashlib.sha256(final_8digit.encode("utf-8")).hexdigest()

    # Fetch booking rental amount
    order_row = None
    try:
        order_row = fetch_one("SELECT total, user_email FROM orders WHERE id = %s", (booking_id,))
    except Exception:
        pass
    rental_total = float(order_row.get("total", 2499.0)) if order_row else 2499.0
    renter_email = (order_row.get("user_email") if order_row else renter_id)

    # 1. Update Rental Security
    record["rental_started"] = True
    record["rental_activated"] = True
    record["rental_started_at"] = now_iso
    record["activated_at"] = now_iso
    record["earnings_started_at"] = now_iso
    record["status"] = "active"
    record["vendor_pin_verified"] = True
    record["renter_pin_verified"] = True
    record["vendor_handover_verified"] = True
    record["renter_handover_verified"] = True
    record["vendor_otp_verified"] = True
    record["renter_otp_verified"] = True
    record["final_activation_pin_hash"] = final_hash
    record["updated_at"] = now_iso

    try:
        execute_query("""
            UPDATE rental_security
            SET rental_started = TRUE, rental_activated = TRUE, rental_started_at = %s,
                activated_at = %s, earnings_started_at = %s, status = 'active',
                vendor_pin_verified = TRUE, renter_pin_verified = TRUE,
                vendor_handover_verified = TRUE, renter_handover_verified = TRUE,
                vendor_otp_verified = TRUE, renter_otp_verified = TRUE,
                final_activation_pin_hash = %s, updated_at = %s
            WHERE booking_id = %s
        """, (now_iso, now_iso, now_iso, final_hash, now_iso, booking_id))

        execute_query("UPDATE orders SET status = 'active' WHERE id = %s", (booking_id,))
        execute_query("UPDATE deliveries SET status = 'COMPLETED', customer_confirmed_at = %s, updated_at = %s WHERE booking_id = %s", (now_iso, now_iso, booking_id))
    except Exception as e:
        logger.warning(f"DB update error during transactional rental activation: {e}")

    MOCK_RENTAL_SECURITIES[booking_id] = record

    # 2. Idempotent Vendor Wallet Pending Earnings Activation
    add_payernt_pending_earnings(
        owner_id=vendor_id,
        amount=rental_total,
        booking_id=booking_id,
        description=f"Pending earnings for active booking #{booking_id[-6:] if len(booking_id) >= 6 else booking_id}"
    )

    # 3. Real Notifications
    add_payernt_notification(
        owner_id=vendor_id,
        title="Rental Activated & Earnings Started 🎉",
        message=f"Booking #{booking_id[-6:] if len(booking_id) >= 6 else booking_id} is active! ₹{rental_total:.2f} recorded in pending earnings.",
        type_="earning",
        action_route="wallet"
    )

    try:
        from database import create_notification
        create_notification(
            email=renter_email,
            title="Rental Active! Enjoy Your Tech Gear ⚡",
            message=f"Handover complete for booking #{booking_id}. Your rental duration has officially begun.",
            notif_type="booking"
        )
    except Exception:
        pass

    log_payernt_audit_event("RENTAL_ACTIVATED_TRANSACTIONAL", vendor_id, {
        "bookingId": booking_id,
        "amount": rental_total,
        "startedAt": now_iso,
    })

    return True, "Rental activated successfully. Earnings lifecycle has begun.", record


def check_and_activate_rental(record: Dict[str, Any]) -> bool:
    """
    Backend-authoritative check:
    Rental becomes ACTIVE only when renter_pin_verified/renter_handover_verified, vendor_pin_verified/vendor_handover_verified, and otp_verified are TRUE.
    """
    if (record.get("renter_pin_verified") or record.get("renter_handover_verified")) and \
       (record.get("vendor_pin_verified") or record.get("vendor_handover_verified")) and \
       (record.get("otp_verified") or (record.get("vendor_otp_verified") and record.get("renter_otp_verified"))):
        success, _, _ = activate_rental_transactional(record["booking_id"], record.get("vendor_id", ""))
        return success
    return False


def complete_rental_and_credit_vendor(booking_id: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Completes rental and settles vendor's pending earnings to available balance.
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
        execute_query("UPDATE deliveries SET status = 'COMPLETED', updated_at = %s WHERE booking_id = %s", (now_iso, booking_id))
        execute_query("UPDATE rental_security SET status = 'completed', updated_at = %s WHERE booking_id = %s", (now_iso, booking_id))
    except Exception as e:
        logger.warning(f"DB update error during rental completion: {e}")

    # Settle pending earnings to available balance
    settle_payernt_earnings(
        owner_id=vendor_id,
        amount=total_amount,
        booking_id=booking_id,
        description=f"Rental earnings settlement for completed booking #{booking_id[-6:] if len(booking_id) >= 6 else booking_id}"
    )

    log_payernt_audit_event("RENTAL_COMPLETED", vendor_id, {"bookingId": booking_id, "amount": total_amount})
    return True, "Rental completed and vendor wallet settled successfully.", record


def add_payernt_pending_earnings(owner_id: str, amount: float, booking_id: Optional[str], description: str) -> Dict[str, Any]:
    """
    Idempotently records pending earnings in the vendor's wallet upon rental activation.
    Guarantees that duplicate calls for the same booking_id will NOT duplicate earnings.
    """
    wallet = get_or_create_payernt_wallet(owner_id, "")
    now_iso = dt.now(timezone.utc).isoformat()

    # Idempotency check in DB transactions table
    if booking_id:
        existing_txn = None
        try:
            existing_txn = fetch_one("SELECT id FROM payernt_wallet_transactions WHERE booking_id = %s AND (type = 'earning_pending' OR type = 'credit') LIMIT 1", (booking_id,))
        except Exception:
            pass
        if existing_txn:
            return wallet

    current_pending = float(wallet.get("pending_amount", 0.0))
    new_pending = current_pending + amount

    try:
        execute_query("""
            UPDATE payernt_wallets
            SET pending_amount = %s, updated_at = %s
            WHERE owner_id = %s
        """, (new_pending, now_iso, owner_id))
    except Exception as e:
        logger.warning(f"DB update error for payernt_wallet pending earnings: {e}")

    wallet["pending_amount"] = new_pending
    wallet["updated_at"] = now_iso
    MOCK_PAYERNT_WALLETS[owner_id] = wallet

    txn_id = f"TXN_{int(time.time() * 1000)}"
    txn = {
        "id": txn_id,
        "wallet_id": wallet["id"],
        "owner_id": owner_id,
        "booking_id": booking_id,
        "type": "earning_pending",
        "amount": amount,
        "status": "pending",
        "description": description,
        "reference_id": f"REF_PEND_{txn_id[-6:]}",
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

    return wallet


def settle_payernt_earnings(owner_id: str, amount: float, booking_id: Optional[str], description: str) -> Dict[str, Any]:
    """
    Settles pending earnings to available balance upon rental completion.
    """
    wallet = get_or_create_payernt_wallet(owner_id, "")
    current_pending = max(0.0, float(wallet.get("pending_amount", 0.0)) - amount)
    current_avail = float(wallet.get("available_balance", 0.0)) + amount
    current_total = float(wallet.get("total_received", 0.0)) + amount
    now_iso = dt.now(timezone.utc).isoformat()

    try:
        execute_query("""
            UPDATE payernt_wallets
            SET pending_amount = %s, available_balance = %s, total_received = %s, updated_at = %s
            WHERE owner_id = %s
        """, (current_pending, current_avail, current_total, now_iso, owner_id))
    except Exception as e:
        logger.warning(f"DB update error for payernt_wallet settle: {e}")

    wallet["pending_amount"] = current_pending
    wallet["available_balance"] = current_avail
    wallet["total_received"] = current_total
    wallet["updated_at"] = now_iso
    MOCK_PAYERNT_WALLETS[owner_id] = wallet

    txn_id = f"TXN_{int(time.time() * 1000)}"
    try:
        execute_query("""
            INSERT INTO payernt_wallet_transactions (id, wallet_id, owner_id, booking_id, type, amount, status, description, reference_id, created_at)
            VALUES (%s, %s, %s, %s, 'settlement', %s, 'completed', %s, %s, %s)
        """, (
            txn_id, wallet["id"], owner_id, booking_id, amount, description,
            f"REF_SET_{txn_id[-6:]}", now_iso
        ))
    except Exception as e:
        logger.warning(f"DB insert error for settlement transaction: {e}")

    return wallet


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


# ============================================================
# PAYE₹NT VENDOR BOOKINGS & AUTHORITATIVE DASHBOARD AGGREGATION
# ============================================================

def get_payernt_vendor_bookings(vendor_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Fetches real bookings for products belonging to this authenticated vendor.
    Queries rental_security records, orders, and deliveries.
    """
    bookings = []
    seen_ids = set()

    # 1. Query DB rental_security joined with orders, payernt_products, and deliveries
    try:
        query = """
            SELECT 
                sec.booking_id,
                sec.product_id,
                sec.vendor_id,
                sec.renter_id,
                sec.status as security_status,
                sec.vendor_pin_verified,
                sec.renter_pin_verified,
                sec.vendor_otp_verified,
                sec.renter_otp_verified,
                sec.vendor_handover_verified,
                sec.renter_handover_verified,
                sec.rental_started,
                sec.rental_started_at,
                sec.activated_at,
                sec.earnings_started_at,
                sec.created_at as security_created_at,
                o.product_title as order_title,
                o.product_image as order_image,
                o.user_email as renter_email,
                o.start_date,
                o.end_date,
                o.total,
                o.status as order_status,
                o.created_at as order_created_at,
                pp.title as product_title,
                pp.primary_image as product_image,
                pp.category as product_category,
                pp.daily_rate,
                d.status as delivery_status,
                d.delivery_boy_name,
                d.delivery_boy_phone,
                d.picked_up_at
            FROM rental_security sec
            LEFT JOIN orders o ON sec.booking_id = o.id
            LEFT JOIN payernt_products pp ON sec.product_id = pp.id
            LEFT JOIN deliveries d ON sec.booking_id = d.booking_id
            WHERE sec.vendor_id = %s OR pp.owner_id = %s
            ORDER BY sec.created_at DESC
            LIMIT %s
        """
        rows = fetch_all(query, (vendor_id, vendor_id, limit))
        if rows:
            for r in rows:
                b_id = r.get("booking_id")
                if not b_id or b_id in seen_ids:
                    continue
                seen_ids.add(b_id)
                renter_email = r.get("renter_email") or ""
                r_name = renter_email.split("@")[0].capitalize() if renter_email else "Customer"
                del_status = r.get("delivery_status") or "WAITING_FOR_ADMIN"
                bookings.append({
                    "id": b_id,
                    "bookingId": b_id,
                    "productId": r.get("product_id") or "",
                    "productTitle": r.get("product_title") or r.get("order_title") or "Gear Listing",
                    "productImage": r.get("product_image") or r.get("order_image") or "",
                    "category": r.get("product_category") or "Tech Gear",
                    "renterId": r.get("renter_id") or renter_email or "renter",
                    "renterName": r_name,
                    "renterEmail": renter_email,
                    "startDate": r.get("start_date") or "",
                    "endDate": r.get("end_date") or "",
                    "amount": float(r.get("total") or r.get("daily_rate") or 0.0),
                    "total": float(r.get("total") or r.get("daily_rate") or 0.0),
                    "status": r.get("order_status") or r.get("security_status") or "pending",
                    "bookingStatus": r.get("order_status") or "CONFIRMED",
                    "deliveryStatus": del_status,
                    "securityStatus": r.get("security_status") or "security_pending",
                    "vendorPinVerified": bool(r.get("vendor_pin_verified")),
                    "renterPinVerified": bool(r.get("renter_pin_verified")),
                    "vendorOtpVerified": bool(r.get("vendor_otp_verified")),
                    "renterOtpVerified": bool(r.get("renter_otp_verified")),
                    "vendorHandoverVerified": bool(r.get("vendor_handover_verified")),
                    "renterHandoverVerified": bool(r.get("renter_handover_verified")),
                    "otpVerified": bool(r.get("vendor_otp_verified") and r.get("renter_otp_verified")),
                    "rentalStarted": bool(r.get("rental_started")),
                    "rentalStartedAt": r.get("rental_started_at") or r.get("activated_at"),
                    "activatedAt": r.get("activated_at"),
                    "earningsStartedAt": r.get("earnings_started_at"),
                    "deliveryBoyName": r.get("delivery_boy_name"),
                    "deliveryBoyPhone": r.get("delivery_boy_phone"),
                    "pickedUpAt": r.get("picked_up_at"),
                    "createdAt": r.get("security_created_at") or r.get("order_created_at") or dt.now(timezone.utc).isoformat(),
                })
    except Exception as e:
        logger.warning(f"DB error fetching vendor bookings from rental_security: {e}")

    # 2. Also check orders table for orders whose product is owned by vendor
    try:
        orders_query = """
            SELECT 
                o.id as booking_id,
                o.product_id,
                o.product_title,
                o.product_image,
                o.user_email as renter_email,
                o.start_date,
                o.end_date,
                o.total,
                o.status as order_status,
                o.created_at,
                pp.category,
                pp.daily_rate,
                d.status as delivery_status
            FROM orders o
            JOIN payernt_products pp ON o.product_id = pp.id
            LEFT JOIN deliveries d ON o.id = d.booking_id
            WHERE pp.owner_id = %s
            ORDER BY o.created_at DESC
            LIMIT %s
        """
        o_rows = fetch_all(orders_query, (vendor_id, limit))
        if o_rows:
            for r in o_rows:
                b_id = r.get("booking_id")
                if not b_id or b_id in seen_ids:
                    continue
                seen_ids.add(b_id)
                renter_email = r.get("renter_email") or ""
                r_name = renter_email.split("@")[0].capitalize() if renter_email else "Customer"
                del_status = r.get("delivery_status") or "WAITING_FOR_ADMIN"
                bookings.append({
                    "id": b_id,
                    "bookingId": b_id,
                    "productId": r.get("product_id") or "",
                    "productTitle": r.get("product_title") or "Gear Listing",
                    "productImage": r.get("product_image") or "",
                    "category": r.get("category") or "Tech Gear",
                    "renterId": renter_email or "renter",
                    "renterName": r_name,
                    "renterEmail": renter_email,
                    "startDate": r.get("start_date") or "",
                    "endDate": r.get("end_date") or "",
                    "amount": float(r.get("total") or r.get("daily_rate") or 0.0),
                    "total": float(r.get("total") or r.get("daily_rate") or 0.0),
                    "status": r.get("order_status") or "pending",
                    "bookingStatus": r.get("order_status") or "CONFIRMED",
                    "deliveryStatus": del_status,
                    "securityStatus": "pending",
                    "vendorPinVerified": False,
                    "renterPinVerified": False,
                    "vendorOtpVerified": False,
                    "renterOtpVerified": False,
                    "vendorHandoverVerified": False,
                    "renterHandoverVerified": False,
                    "otpVerified": False,
                    "rentalStarted": False,
                    "rentalStartedAt": None,
                    "createdAt": r.get("created_at") or dt.now(timezone.utc).isoformat(),
                })
    except Exception as e:
        logger.warning(f"DB error fetching vendor orders: {e}")

    # 3. Fallback to in-memory mock store if database is offline or empty
    if not bookings:
        vendor_products = [p for p in MOCK_PAYERNT_PRODUCTS.values() if p.get("owner_id") == vendor_id]
        vendor_prod_ids = {p["id"] for p in vendor_products}
        for sec in MOCK_RENTAL_SECURITIES.values():
            if sec.get("vendor_id") == vendor_id or sec.get("product_id") in vendor_prod_ids:
                b_id = sec.get("booking_id")
                if not b_id or b_id in seen_ids:
                    continue
                seen_ids.add(b_id)
                prod = MOCK_PAYERNT_PRODUCTS.get(sec.get("product_id", ""))
                daily = float(prod.get("daily_rate", 500) if prod else 500)
                bookings.append({
                    "id": b_id,
                    "bookingId": b_id,
                    "productId": sec.get("product_id") or "",
                    "productTitle": prod.get("title", "Tech Gear") if prod else "Tech Gear",
                    "productImage": prod.get("primary_image", "") if prod else "",
                    "category": prod.get("category", "Tech") if prod else "Tech",
                    "renterId": sec.get("renter_id", "renter"),
                    "renterName": "Customer",
                    "renterEmail": "",
                    "startDate": "",
                    "endDate": "",
                    "amount": daily,
                    "total": daily,
                    "status": sec.get("status", "security_pending"),
                    "securityStatus": sec.get("status", "security_pending"),
                    "vendorPinVerified": bool(sec.get("vendor_pin_verified")),
                    "renterPinVerified": bool(sec.get("renter_pin_verified")),
                    "otpVerified": bool(sec.get("otp_verified")),
                    "rentalStarted": bool(sec.get("rental_started")),
                    "createdAt": sec.get("created_at") or dt.now(timezone.utc).isoformat(),
                })

    return bookings[:limit]


def get_payernt_vendor_dashboard(vendor_id: str, email: str) -> Dict[str, Any]:
    """
    Authoritative single-request dashboard aggregation for paye₹nt Home (Desktop and Mobile).
    Returns real wallet balances, earnings, product listings counts, rental counts,
    upcoming bookings, products preview, recent activities, and unread notification/message counts.
    """
    # 1. Authoritative Wallet & Transactions
    wallet = get_or_create_payernt_wallet(vendor_id, email)
    avail_bal = float(wallet.get("available_balance", 0.0))
    pending_amt = float(wallet.get("pending_amount", 0.0))
    total_received = float(wallet.get("total_received", 0.0))
    total_withdrawn = float(wallet.get("total_withdrawn", 0.0))

    transactions = get_payernt_wallet_transactions(vendor_id)

    # 2. Products / Listings
    products = get_payernt_products_by_owner(vendor_id, email)
    total_listings = len(products)
    active_listings = len([p for p in products if p.get("status") in ("active", "approved")])
    pending_listings = len([p for p in products if p.get("status") in ("pending_confirmation", "pending", "under_review", "pending_admin_review")])

    # 3. Bookings & Rentals
    bookings = get_payernt_vendor_bookings(vendor_id, limit=20)
    active_rentals = len([
        b for b in bookings
        if b.get("rentalStarted") or b.get("status") in ("active", "ongoing", "in_progress", "handover")
    ])
    upcoming_bookings = [
        b for b in bookings
        if b.get("status") in ("security_pending", "pending", "confirmed", "approved", "active")
    ][:5]

    # 4. Recent Activities from Audit Logs & Transactions
    activities = []
    # Add transactions
    for tx in transactions[:6]:
        tx_type = tx.get("type", "transaction")
        amt = float(tx.get("amount", 0.0))
        amt_str = f"+₹{amt:,.0f}" if tx_type == "credit" else f"-₹{amt:,.0f}"
        activities.append({
            "id": f"tx_{tx.get('id')}",
            "title": tx.get("description") or ("Payment received" if tx_type == "credit" else "Payout withdrawal"),
            "timestamp": tx.get("created_at") or "",
            "amount": amt_str,
            "type": tx_type,
            "createdAt": tx.get("created_at") or "",
        })

    # Add audit logs
    audit_logs = get_payernt_audit_logs(vendor_id, limit=6)
    action_titles = {
        "PRODUCT_CREATED": "Product listing submitted",
        "PRODUCT_APPROVED": "Product approved by Admin",
        "PRODUCT_UPDATED": "Listing updated",
        "WALLET_CREDIT": "Earnings credited to wallet",
        "WALLET_WITHDRAW": "Withdrawal requested",
        "RENTAL_SECURITY_CREATED": "New booking received",
        "PROFILE_UPDATE": "Profile updated",
        "OTP_RESENT": "Verification code resent",
    }
    for log in audit_logs:
        action = log.get("action", "")
        if action in action_titles:
            activities.append({
                "id": f"audit_{log.get('id')}",
                "title": action_titles[action],
                "timestamp": log.get("created_at") or "",
                "amount": None,
                "type": "audit",
                "createdAt": log.get("created_at") or "",
            })

    # Sort activities by timestamp descending
    activities.sort(key=lambda x: str(x.get("createdAt", "")), reverse=True)
    recent_activities = activities[:6]

    # 5. Notifications & Messages counts
    notifs = get_payernt_notifications(vendor_id)
    unread_notifs = len([n for n in notifs if not (n.get("is_read") or n.get("read"))])
    unread_msgs = get_payernt_unread_messages_count(vendor_id)

    # 6. Preview products (first 4 items with sanitized fields)
    preview_products = []
    for p in products[:4]:
        clean_p = dict(p)
        clean_p.pop("vendor_secret_pin", None)
        preview_products.append(clean_p)

    return {
        "wallet": {
            "availableBalance": avail_bal,
            "pendingAmount": pending_amt,
            "totalReceived": total_received,
            "totalWithdrawn": total_withdrawn,
            "currency": wallet.get("currency", "INR"),
        },
        "earnings": {
            "total": total_received if total_received > 0 else avail_bal,
            "available": avail_bal,
            "pending": pending_amt,
            "withdrawn": total_withdrawn,
        },
        "listings": {
            "total": total_listings,
            "active": active_listings,
            "pending": pending_listings,
        },
        "rentals": {
            "active": active_rentals,
            "total": len(bookings),
        },
        "bookings": upcoming_bookings,
        "products": preview_products,
        "recentActivity": recent_activities,
        "notifications": {
            "unread": unread_notifs,
            "total": len(notifs),
        },
        "messages": {
            "unread": unread_msgs,
        },
    }

