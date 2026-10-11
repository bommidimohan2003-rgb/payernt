import os
from urllib.parse import urlparse

# Suppress uv hardlink warning by explicitly setting link mode to copy
os.environ["UV_LINK_MODE"] = "copy"

# Load .env file if present (local development)
try:
    from dotenv import load_dotenv
    backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
    else:
        load_dotenv()
except ImportError:
    pass

# ENVIRONMENT Config
ENV = os.getenv("ENV", os.getenv("ENVIRONMENT", "development")).lower()
IS_PRODUCTION = ENV in ("production", "prod")
ALLOW_PRODUCTION_TESTING = os.getenv("ALLOW_PRODUCTION_TESTING", "false").lower() in ("true", "1", "yes")

def assert_testing_allowed():
    """
    Safeguard preventing test/seed scripts from running against live production
    without explicit ALLOW_PRODUCTION_TESTING=true environment authorization.
    """
    if IS_PRODUCTION and not ALLOW_PRODUCTION_TESTING:
        raise RuntimeError(
            "FATAL DATA INTEGRITY SAFEGUARD: Test/seed scripts are blocked from running in ENV='production'. "
            "To execute tests against dedicated environments, set ENV=testing or use an isolated test database."
        )

# Parse DATABASE_URL if provided (e.g. TiDB Cloud / Railway / Cloud)
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("TIDB_DATABASE_URL")

if DATABASE_URL:
    try:
        url = urlparse(DATABASE_URL)
        MYSQL_HOST = url.hostname or ""
        MYSQL_PORT = url.port or 4000
        MYSQL_USER = url.username or ""
        MYSQL_PASSWORD = url.password or ""
        MYSQL_DB = url.path.lstrip("/") or "payent_marketplace_db"
    except Exception as e:
        print(f"Warning: Failed to parse DATABASE_URL: {e}")
        MYSQL_HOST = os.getenv("TIDB_HOST", os.getenv("MYSQLHOST", os.getenv("MYSQL_HOST", "")))
        MYSQL_PORT = int(os.getenv("TIDB_PORT", os.getenv("MYSQLPORT", os.getenv("MYSQL_PORT", "4000"))))
        MYSQL_USER = os.getenv("TIDB_USER", os.getenv("MYSQLUSER", os.getenv("MYSQL_USER", "")))
        MYSQL_PASSWORD = os.getenv("TIDB_PASSWORD", os.getenv("MYSQLPASSWORD", os.getenv("MYSQL_PASSWORD", "")))
        MYSQL_DB = os.getenv("TIDB_DATABASE", os.getenv("MYSQLDATABASE", os.getenv("MYSQL_DB", "payent_marketplace_db")))
else:
    MYSQL_HOST = os.getenv("TIDB_HOST", os.getenv("MYSQLHOST", os.getenv("MYSQL_HOST", "localhost" if not IS_PRODUCTION else "")))
    MYSQL_PORT = int(os.getenv("TIDB_PORT", os.getenv("MYSQLPORT", os.getenv("MYSQL_PORT", "4000" if not IS_PRODUCTION else "4000"))))
    MYSQL_USER = os.getenv("TIDB_USER", os.getenv("MYSQLUSER", os.getenv("MYSQL_USER", "root" if not IS_PRODUCTION else "")))
    MYSQL_PASSWORD = os.getenv("TIDB_PASSWORD", os.getenv("MYSQLPASSWORD", os.getenv("MYSQL_PASSWORD", "")))
    MYSQL_DB = os.getenv("TIDB_DATABASE", os.getenv("MYSQLDATABASE", os.getenv("MYSQL_DB", "payent_marketplace_db")))

# TiDB Aliases for modern configuration
TIDB_HOST = MYSQL_HOST
TIDB_PORT = MYSQL_PORT
TIDB_USER = MYSQL_USER
TIDB_PASSWORD = MYSQL_PASSWORD
TIDB_DATABASE = MYSQL_DB

MYSQL_SSL = os.getenv("MYSQL_SSL", os.getenv("TIDB_SSL", "true")).lower() in ("true", "1", "yes")
TIDB_SSL = MYSQL_SSL
TIDB_SSL_CA = os.getenv("TIDB_SSL_CA", os.getenv("MYSQL_SSL_CA", ""))

# Fail-fast security validation for production mode
if IS_PRODUCTION:
    if not MYSQL_HOST or not MYSQL_USER or not MYSQL_PASSWORD:
        raise RuntimeError(
            "FATAL SECURITY CONFIGURATION: Production database credentials (DATABASE_URL or TIDB_HOST / TIDB_USER / TIDB_PASSWORD) "
            "are missing. Set required database environment variables in Railway service settings."
        )

# Security & Secrets
DEFAULT_INSECURE_SECRET = "payent_super_secret_key_change_me_in_production"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "" if IS_PRODUCTION else "payent_dev_jwt_secret_key_2026_local_only")

if IS_PRODUCTION:
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == DEFAULT_INSECURE_SECRET:
        raise RuntimeError(
            "FATAL SECURITY CONFIGURATION: JWT_SECRET_KEY must be explicitly set to a high-entropy secret in production."
        )

ADMIN_CREATION_SECRET = os.getenv("ADMIN_CREATION_SECRET", os.getenv("ADMIN_SETUP_CODE", "" if IS_PRODUCTION else "PAYENT-ADMIN-SECRET-2026"))
if IS_PRODUCTION and not ADMIN_CREATION_SECRET:
    print("[CONFIG WARNING]: ADMIN_CREATION_SECRET is unconfigured in production. Bootstrap admin creation will be disabled.")

ADMIN_SETUP_CODE = os.getenv("ADMIN_SETUP_CODE", "" if IS_PRODUCTION else "PAYENT-ADMIN-2026")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
if JWT_ALGORITHM not in ["HS256", "HS384", "HS512"]:
    raise RuntimeError(f"FATAL SECURITY ERROR: Insecure or unsupported JWT_ALGORITHM '{JWT_ALGORITHM}'")

# Token Expiries
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))        # 7 days

# CORS Configuration — Strict Origin Whitelist
DEFAULT_TRUSTED_ORIGINS = [
    "https://frontend.bommidimohan2003.workers.dev",
    "https://payent.in",
    "https://www.payent.in",
    "https://payernt-production.up.railway.app",
]

DEV_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://10.0.2.2:8001",
    "http://testserver",
]

ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "")
if ALLOWED_ORIGINS_RAW and ALLOWED_ORIGINS_RAW.strip() != "*":
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip() and origin.strip() != "*"]
else:
    ALLOWED_ORIGINS = list(DEFAULT_TRUSTED_ORIGINS)

if not IS_PRODUCTION:
    for dev_origin in DEV_LOCAL_ORIGINS:
        if dev_origin not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(dev_origin)

# Twilio Verify Config (Optional / Fallback)
ENABLE_TWILIO_SMS = os.getenv("ENABLE_TWILIO_SMS", "false").lower() == "true"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")
DISABLE_TWILIO_FOR_FIREBASE = os.getenv("DISABLE_TWILIO_FOR_FIREBASE", "true").lower() == "true"

# Payment Gateway (Razorpay) Config
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

if IS_PRODUCTION:
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        print("Notice: Production RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is unconfigured. Real-time payments require Railway environment keys.")
    if not RAZORPAY_WEBHOOK_SECRET:
        print("Notice: Production RAZORPAY_WEBHOOK_SECRET is unconfigured. Webhook verification requires Railway environment key.")

# SMTP & Email Delivery Config
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", os.getenv("SMTP_USERNAME", ""))
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", ""))
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
MAIL_FROM = os.getenv("MAIL_FROM", os.getenv("SMTP_FROM_EMAIL", "no-reply@payent.in"))
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Payent Security")
FRONTEND_URL = os.getenv("FRONTEND_URL", os.getenv("BASE_URL", "https://frontend.bommidimohan2003.workers.dev"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", os.getenv("VITE_GOOGLE_CLIENT_ID", ""))

# PIN Keyed Hashing & Development OTP Config
PIN_HASH_SECRET = os.getenv("PIN_HASH_SECRET", "")
if IS_PRODUCTION and not PIN_HASH_SECRET:
    # Fail fast if unconfigured in production
    raise RuntimeError("CRITICAL: PIN_HASH_SECRET environment variable is required in production for secure keyed HMAC PIN hashing.")
elif not PIN_HASH_SECRET:
    # In development mode, fallback to a dedicated static dev key (never reuse JWT_SECRET_KEY)
    PIN_HASH_SECRET = "dev_keyed_pin_hash_secret_safe_for_testing_only_32_bytes_min"

if IS_PRODUCTION and PIN_HASH_SECRET == JWT_SECRET_KEY:
    raise RuntimeError("FATAL SECURITY: PIN_HASH_SECRET must not be identical to JWT_SECRET_KEY.")

# OTP Provider & Mock OTP Configuration
_configured_otp_provider = os.getenv("OTP_PROVIDER", "mock" if not IS_PRODUCTION else "twilio").lower()
if IS_PRODUCTION:
    # In production, mock OTP mode is strictly forbidden regardless of env vars
    OTP_PROVIDER = "twilio"
    IS_MOCK_OTP_MODE = False
    ENABLE_TEST_OTP_RESPONSE = False
else:
    OTP_PROVIDER = _configured_otp_provider
    IS_MOCK_OTP_MODE = (OTP_PROVIDER == "mock")
    ENABLE_TEST_OTP_RESPONSE = (os.getenv("ENABLE_TEST_OTP_RESPONSE", "true" if IS_MOCK_OTP_MODE else "false").lower() == "true") and not IS_PRODUCTION




