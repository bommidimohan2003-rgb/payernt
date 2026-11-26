import os
from urllib.parse import urlparse
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

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

# Helper to parse DATABASE_URL
_db_url_raw = os.getenv("DATABASE_URL") or os.getenv("TIDB_DATABASE_URL")
_parsed_host = ""
_parsed_port = 4000
_parsed_user = ""
_parsed_password = ""
_parsed_db = "payent_marketplace_db"

if _db_url_raw:
    try:
        _u = urlparse(_db_url_raw)
        _parsed_host = _u.hostname or ""
        _parsed_port = _u.port or 4000
        _parsed_user = _u.username or ""
        _parsed_password = _u.password or ""
        _parsed_db = _u.path.lstrip("/") or "payent_marketplace_db"
    except Exception as _e:
        print(f"Warning: Failed to parse DATABASE_URL: {_e}")

_raw_env = os.getenv("ENV", os.getenv("ENVIRONMENT", "development")).lower()
_is_prod = _raw_env in ("production", "prod")

# Default CORS origins
DEFAULT_TRUSTED_ORIGINS = [
    "https://frontend.bommidimohan2003.workers.dev",
    "https://payent.in",
    "https://www.payent.in",
    "https://payernt-production.up.railway.app",
]

DEV_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://10.0.2.2:8001",
    "http://testserver",
]

def _build_allowed_origins(is_production: bool) -> List[str]:
    origins = list(DEFAULT_TRUSTED_ORIGINS)
    raw_custom = os.getenv("ALLOWED_ORIGINS", "")
    if raw_custom and raw_custom.strip() != "*":
        for o in raw_custom.split(","):
            c = o.strip()
            if c and c != "*" and c not in origins:
                origins.append(c)
    if not is_production:
        for dev_o in DEV_LOCAL_ORIGINS:
            if dev_o not in origins:
                origins.append(dev_o)
    return origins

# ==============================================================================
# Central Pydantic Settings Validation Schema
# ==============================================================================

class PayentSettings(BaseModel):
    """
    Centralized, strongly typed, and secure Pydantic v2 application configuration.
    Validates required production credentials and supplies safe development fallbacks.
    """
    env: str = Field(default=_raw_env)
    is_production: bool = Field(default=_is_prod)
    allow_production_testing: bool = Field(
        default=os.getenv("ALLOW_PRODUCTION_TESTING", "false").lower() in ("true", "1", "yes")
    )
    
    # Relational Database / TiDB Cloud
    mysql_host: str = Field(
        default=_parsed_host or os.getenv("TIDB_HOST", os.getenv("MYSQLHOST", os.getenv("MYSQL_HOST", "localhost" if not _is_prod else "")))
    )
    mysql_port: int = Field(
        default=_parsed_port or int(os.getenv("TIDB_PORT", os.getenv("MYSQLPORT", os.getenv("MYSQL_PORT", "4000"))))
    )
    mysql_user: str = Field(
        default=_parsed_user or os.getenv("TIDB_USER", os.getenv("MYSQLUSER", os.getenv("MYSQL_USER", "root" if not _is_prod else "")))
    )
    mysql_password: str = Field(
        default=_parsed_password or os.getenv("TIDB_PASSWORD", os.getenv("MYSQLPASSWORD", os.getenv("MYSQL_PASSWORD", "")))
    )
    mysql_db: str = Field(
        default=_parsed_db or os.getenv("TIDB_DATABASE", os.getenv("MYSQLDATABASE", os.getenv("MYSQL_DB", "payent_marketplace_db")))
    )
    mysql_ssl: bool = Field(
        default=os.getenv("MYSQL_SSL", os.getenv("TIDB_SSL", "true")).lower() in ("true", "1", "yes")
    )
    tidb_ssl_ca: str = Field(
        default=os.getenv("TIDB_SSL_CA", os.getenv("MYSQL_SSL_CA", ""))
    )

    # JWT Authentication & Authorization
    jwt_secret_key: str = Field(
        default=os.getenv("JWT_SECRET_KEY", "" if _is_prod else "payent_dev_jwt_secret_key_2026_local_only")
    )
    jwt_algorithm: str = Field(default=os.getenv("JWT_ALGORITHM", "HS256"))
    access_token_expire_minutes: int = Field(
        default=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    )
    refresh_token_expire_days: int = Field(
        default=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    )
    admin_setup_code: str = Field(
        default=os.getenv("ADMIN_SETUP_CODE", "" if _is_prod else "PAYENT-ADMIN-2026")
    )
    admin_creation_secret: str = Field(
        default=os.getenv("ADMIN_CREATION_SECRET", os.getenv("ADMIN_SETUP_CODE", "" if _is_prod else "PAYENT-ADMIN-SECRET-2026"))
    )
    pin_hash_secret: str = Field(
        default=os.getenv("PIN_HASH_SECRET", "" if _is_prod else "dev_keyed_pin_hash_secret_safe_for_testing_only_32_bytes_min")
    )

    # Razorpay Payment Gateway
    razorpay_key_id: str = Field(default=os.getenv("RAZORPAY_KEY_ID", ""))
    razorpay_key_secret: str = Field(default=os.getenv("RAZORPAY_KEY_SECRET", ""))
    razorpay_webhook_secret: str = Field(default=os.getenv("RAZORPAY_WEBHOOK_SECRET", ""))
    razorpay_timeout_seconds: float = Field(default=10.0)

    # Twilio / SMS Verify
    enable_twilio_sms: bool = Field(
        default=os.getenv("ENABLE_TWILIO_SMS", "false").lower() == "true"
    )
    twilio_account_sid: str = Field(default=os.getenv("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = Field(default=os.getenv("TWILIO_AUTH_TOKEN", ""))
    twilio_verify_service_sid: str = Field(default=os.getenv("TWILIO_VERIFY_SERVICE_SID", ""))
    disable_twilio_for_firebase: bool = Field(
        default=os.getenv("DISABLE_TWILIO_FOR_FIREBASE", "true").lower() == "true"
    )
    otp_provider: str = Field(
        default="twilio" if _is_prod else os.getenv("OTP_PROVIDER", "mock").lower()
    )

    # Cloudinary Asset Storage
    cloudinary_cloud_name: str = Field(
        default=os.getenv("CLOUDINARY_CLOUD_NAME", os.getenv("VITE_CLOUDINARY_CLOUD_NAME", "dvyendk6j"))
    )
    cloudinary_api_key: str = Field(default=os.getenv("CLOUDINARY_API_KEY", ""))
    cloudinary_api_secret: str = Field(default=os.getenv("CLOUDINARY_API_SECRET", ""))
    cloudinary_url: str = Field(default=os.getenv("CLOUDINARY_URL", ""))
    cloudinary_upload_preset: str = Field(
        default=os.getenv("CLOUDINARY_UPLOAD_PRESET", os.getenv("VITE_CLOUDINARY_UPLOAD_PRESET", "payernt_uploads."))
    )
    cloudinary_timeout_seconds: float = Field(default=12.0)

    # SMTP Mailer
    smtp_host: str = Field(default=os.getenv("SMTP_HOST", ""))
    smtp_port: int = Field(default=int(os.getenv("SMTP_PORT", "587")))
    smtp_user: str = Field(default=os.getenv("SMTP_USER", os.getenv("SMTP_USERNAME", "")))
    smtp_password: str = Field(default=os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", "")))
    smtp_use_tls: bool = Field(
        default=os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    )
    smtp_use_ssl: bool = Field(
        default=os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
    )
    mail_from: str = Field(
        default=os.getenv("MAIL_FROM", os.getenv("SMTP_FROM_EMAIL", "payentsupport@gmail.com"))
    )
    mail_from_name: str = Field(default=os.getenv("MAIL_FROM_NAME", "paYent Security"))
    smtp_timeout_seconds: float = Field(default=12.0)

    # External Social Auth & URLs
    frontend_url: str = Field(
        default=os.getenv("FRONTEND_URL", os.getenv("BASE_URL", "https://frontend.bommidimohan2003.workers.dev"))
    )
    google_client_id: str = Field(
        default=os.getenv("GOOGLE_CLIENT_ID", os.getenv("VITE_GOOGLE_CLIENT_ID", ""))
    )
    allowed_origins: List[str] = Field(default_factory=lambda: _build_allowed_origins(_is_prod))

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_jwt_algorithm(cls, v: str) -> str:
        if v not in ["HS256", "HS384", "HS512"]:
            raise ValueError(f"Insecure or unsupported JWT_ALGORITHM: '{v}'")
        return v

# Instantiate and validate settings
settings = PayentSettings()

# ==============================================================================
# Security Hardening & Fail-Fast Production Guards
# ==============================================================================

ENV = settings.env
IS_PRODUCTION = settings.is_production
ALLOW_PRODUCTION_TESTING = settings.allow_production_testing

def assert_testing_allowed():
    """Safeguard preventing test/seed scripts from running against live production."""
    if IS_PRODUCTION and not ALLOW_PRODUCTION_TESTING:
        raise RuntimeError(
            "FATAL DATA INTEGRITY SAFEGUARD: Test/seed scripts are blocked from running in ENV='production'. "
            "To execute tests against dedicated environments, set ENV=testing or use an isolated test database."
        )

if IS_PRODUCTION:
    if not settings.mysql_host or not settings.mysql_user or not settings.mysql_password:
        raise RuntimeError(
            "FATAL SECURITY CONFIGURATION: Production database credentials (DATABASE_URL or TIDB_HOST / TIDB_USER / TIDB_PASSWORD) "
            "are missing. Set required database environment variables in Railway service settings."
        )
    if not settings.jwt_secret_key or settings.jwt_secret_key == "payent_super_secret_key_change_me_in_production":
        raise RuntimeError(
            "FATAL SECURITY CONFIGURATION: JWT_SECRET_KEY must be explicitly set to a high-entropy secret in production."
        )
    if not settings.pin_hash_secret:
        raise RuntimeError(
            "CRITICAL: PIN_HASH_SECRET environment variable is required in production for secure keyed HMAC PIN hashing."
        )
    if settings.pin_hash_secret == settings.jwt_secret_key:
        raise RuntimeError("FATAL SECURITY: PIN_HASH_SECRET must not be identical to JWT_SECRET_KEY.")
    if not settings.admin_creation_secret:
        print("[CONFIG WARNING]: ADMIN_CREATION_SECRET is unconfigured in production. Bootstrap admin creation will be disabled.")
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        print("Notice: Production RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is unconfigured. Real-time payments require Railway environment keys.")
    if not settings.razorpay_webhook_secret:
        print("Notice: Production RAZORPAY_WEBHOOK_SECRET is unconfigured. Webhook verification requires Railway environment key.")

# ==============================================================================
# Exported Backward-Compatible Configuration Constants
# ==============================================================================

DATABASE_URL = _db_url_raw
MYSQL_HOST = settings.mysql_host
MYSQL_PORT = settings.mysql_port
MYSQL_USER = settings.mysql_user
MYSQL_PASSWORD = settings.mysql_password
MYSQL_DB = settings.mysql_db
MYSQL_SSL = settings.mysql_ssl
TIDB_HOST = MYSQL_HOST
TIDB_PORT = MYSQL_PORT
TIDB_USER = MYSQL_USER
TIDB_PASSWORD = MYSQL_PASSWORD
TIDB_DATABASE = MYSQL_DB
TIDB_SSL = MYSQL_SSL
TIDB_SSL_CA = settings.tidb_ssl_ca

JWT_SECRET_KEY = settings.jwt_secret_key
JWT_ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days
ADMIN_SETUP_CODE = settings.admin_setup_code
ADMIN_CREATION_SECRET = settings.admin_creation_secret
PIN_HASH_SECRET = settings.pin_hash_secret

RAZORPAY_KEY_ID = settings.razorpay_key_id
RAZORPAY_KEY_SECRET = settings.razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET = settings.razorpay_webhook_secret
RAZORPAY_TIMEOUT_SECONDS = settings.razorpay_timeout_seconds

ENABLE_TWILIO_SMS = settings.enable_twilio_sms
TWILIO_ACCOUNT_SID = settings.twilio_account_sid
TWILIO_AUTH_TOKEN = settings.twilio_auth_token
TWILIO_VERIFY_SERVICE_SID = settings.twilio_verify_service_sid
DISABLE_TWILIO_FOR_FIREBASE = settings.disable_twilio_for_firebase
OTP_PROVIDER = settings.otp_provider
IS_MOCK_OTP_MODE = (OTP_PROVIDER == "mock") and not IS_PRODUCTION
ENABLE_TEST_OTP_RESPONSE = (os.getenv("ENABLE_TEST_OTP_RESPONSE", "true" if IS_MOCK_OTP_MODE else "false").lower() == "true") and not IS_PRODUCTION

CLOUDINARY_CLOUD_NAME = settings.cloudinary_cloud_name
CLOUDINARY_API_KEY = settings.cloudinary_api_key
CLOUDINARY_API_SECRET = settings.cloudinary_api_secret
CLOUDINARY_URL = settings.cloudinary_url
CLOUDINARY_UPLOAD_PRESET = settings.cloudinary_upload_preset
CLOUDINARY_TIMEOUT_SECONDS = settings.cloudinary_timeout_seconds

SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USER = settings.smtp_user
SMTP_PASSWORD = settings.smtp_password
SMTP_USE_TLS = settings.smtp_use_tls
SMTP_USE_SSL = settings.smtp_use_ssl
MAIL_FROM = settings.mail_from
MAIL_FROM_NAME = settings.mail_from_name
SMTP_TIMEOUT_SECONDS = settings.smtp_timeout_seconds

FRONTEND_URL = settings.frontend_url
GOOGLE_CLIENT_ID = settings.google_client_id
ALLOWED_ORIGINS = settings.allowed_origins
