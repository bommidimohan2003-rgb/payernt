import os
from urllib.parse import urlparse
from dotenv import load_dotenv

# Suppress uv hardlink warning by explicitly setting link mode to copy
os.environ["UV_LINK_MODE"] = "copy"

# Load .env file if present
load_dotenv()

# Parse DATABASE_URL if provided by Railway
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    try:
        url = urlparse(DATABASE_URL)
        MYSQL_HOST = url.hostname or "localhost"
        MYSQL_PORT = url.port or 3306
        MYSQL_USER = url.username or "root"
        MYSQL_PASSWORD = url.password or ""
        MYSQL_DB = url.path.lstrip("/") or "payent_marketplace_db"
    except Exception as e:
        print(f"Warning: Failed to parse DATABASE_URL: {e}")
        MYSQL_HOST = os.getenv("MYSQLHOST", os.getenv("MYSQL_HOST", "localhost"))
        MYSQL_PORT = int(os.getenv("MYSQLPORT", os.getenv("MYSQL_PORT", "3306")))
        MYSQL_USER = os.getenv("MYSQLUSER", os.getenv("MYSQL_USER", "root"))
        MYSQL_PASSWORD = os.getenv("MYSQLPASSWORD", os.getenv("MYSQL_PASSWORD", "Bmohan"))
        MYSQL_DB = os.getenv("MYSQLDATABASE", os.getenv("MYSQL_DB", "payent_marketplace_db"))
else:
    # Railway environment variable aliases (MYSQLHOST / MYSQL_HOST, etc.)
    MYSQL_HOST = os.getenv("MYSQLHOST", os.getenv("MYSQL_HOST", "localhost"))
    MYSQL_PORT = int(os.getenv("MYSQLPORT", os.getenv("MYSQL_PORT", "3306")))
    MYSQL_USER = os.getenv("MYSQLUSER", os.getenv("MYSQL_USER", "root"))
    MYSQL_PASSWORD = os.getenv("MYSQLPASSWORD", os.getenv("MYSQL_PASSWORD", "Bmohan"))
    MYSQL_DB = os.getenv("MYSQLDATABASE", os.getenv("MYSQL_DB", "payent_marketplace_db"))

MYSQL_SSL = os.getenv("MYSQL_SSL", "true").lower() in ("true", "1", "yes")

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

# Security & Secrets Audit
DEFAULT_SECRET = "payent_super_secret_key_change_me_in_production"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", DEFAULT_SECRET)
ADMIN_CREATION_SECRET = os.getenv("ADMIN_CREATION_SECRET", os.getenv("ADMIN_SETUP_CODE", "PAYENT-ADMIN-SECRET-2026"))
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if IS_PRODUCTION:
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == DEFAULT_SECRET:
        print("[CONFIG WARNING]: JWT_SECRET_KEY is using default secret. Set JWT_SECRET_KEY env var in production.")
    if not MYSQL_PASSWORD or MYSQL_PASSWORD == "Bmohan":
        print("[CONFIG WARNING]: MYSQL_PASSWORD is using default value. Set MYSQL_PASSWORD env var in production.")
    if not RAZORPAY_WEBHOOK_SECRET:
        print("[CONFIG WARNING]: RAZORPAY_WEBHOOK_SECRET is unconfigured. Set RAZORPAY_WEBHOOK_SECRET env var in production.")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
if JWT_ALGORITHM not in ["HS256", "HS384", "HS512"]:
    raise RuntimeError(f"FATAL SECURITY ERROR: Insecure or unsupported JWT_ALGORITHM '{JWT_ALGORITHM}'")

# Token Expiries
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))        # 7 days

# CORS Config
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]

# Twilio Verify Config (Twilio SMS integration disabled; using secure internal DB OTP engine)
ENABLE_TWILIO_SMS = os.getenv("ENABLE_TWILIO_SMS", "false").lower() == "true"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")
DISABLE_TWILIO_FOR_FIREBASE = os.getenv("DISABLE_TWILIO_FOR_FIREBASE", "true").lower() == "true"

# Admin Registration Config
ADMIN_SETUP_CODE = os.getenv("ADMIN_SETUP_CODE", "PAYENT-ADMIN-2026")

# Payment Gateway (Razorpay) Config
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if IS_PRODUCTION:
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        print("Warning: Production RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing. Payment processing will operate in test fallback mode.")
    if not RAZORPAY_WEBHOOK_SECRET:
        print("Warning: Production RAZORPAY_WEBHOOK_SECRET is missing. Register webhook secret in backend environment variables.")

# SMTP & Email Delivery Config
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", os.getenv("SMTP_USERNAME", ""))
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", ""))
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
MAIL_FROM = os.getenv("MAIL_FROM", os.getenv("SMTP_FROM_EMAIL", "no-reply@payent.in"))
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Payent Security")
FRONTEND_URL = os.getenv("FRONTEND_URL", os.getenv("BASE_URL", "https://payent.in"))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", os.getenv("VITE_GOOGLE_CLIENT_ID", ""))

