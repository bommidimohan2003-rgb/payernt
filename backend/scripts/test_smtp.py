"""
Utility script to test outbound SMTP email connectivity for paYent.
Usage:
    python backend/scripts/test_smtp.py [optional_recipient_email]
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_USE_TLS,
    SMTP_USE_SSL,
    MAIL_FROM,
    MAIL_FROM_NAME,
)
from email_service import send_email_smtp, build_otp_email_html, build_otp_email_text, is_smtp_configured

def main():
    print("=" * 60)
    print("paYent SMTP Connectivity Diagnostics")
    print("=" * 60)
    print(f"SMTP_HOST:     {SMTP_HOST or '[NOT SET]'}")
    print(f"SMTP_PORT:     {SMTP_PORT}")
    print(f"SMTP_USER:     {SMTP_USER or '[NOT SET]'}")
    print(f"SMTP_PASSWORD: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else '[NOT SET]'}")
    print(f"SMTP_USE_TLS:  {SMTP_USE_TLS}")
    print(f"SMTP_USE_SSL:  {SMTP_USE_SSL}")
    print(f"MAIL_FROM:     {MAIL_FROM}")
    print(f"MAIL_FROM_NAME:{MAIL_FROM_NAME}")
    print("=" * 60)

    if not is_smtp_configured():
        print("❌ Error: SMTP_HOST is not configured in backend/.env.")
        print("Please add your SMTP credentials to backend/.env and re-run.")
        sys.exit(1)

    if not SMTP_USER or not SMTP_PASSWORD:
        print("❌ Error: SMTP_USER or SMTP_PASSWORD is not set in backend/.env.")
        sys.exit(1)

    recipient = sys.argv[1].strip() if len(sys.argv) > 1 else SMTP_USER
    print(f"Attempting to send test OTP email to: {recipient} ...")

    test_otp = "849201"
    subject = f"{test_otp} is your paYent verification code (Test)"
    html = build_otp_email_html(test_otp, "SMTP connectivity test")
    text = build_otp_email_text(test_otp, "SMTP connectivity test")

    success, err = send_email_smtp(recipient, subject, html, text)

    if success:
        print("✅ SUCCESS! Test OTP email was accepted and sent by the SMTP server.")
        print(f"Check your inbox (and spam folder) for '{subject}'.")
    else:
        print("❌ FAILED! Could not send email via SMTP.")
        print(f"Error details: {err}")
        print("\nCommon Troubleshooting Tips:")
        print("1. If using Gmail, make sure you generated a 16-character 'App Password', NOT your standard Google account password.")
        print("2. Ensure 2-Step Verification is enabled on your Google account.")
        print("3. Check that SMTP_HOST=smtp.gmail.com and SMTP_PORT=587 with SMTP_USE_TLS=true.")
        sys.exit(1)

if __name__ == "__main__":
    main()
