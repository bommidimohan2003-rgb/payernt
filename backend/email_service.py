import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple, Optional
from config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_USE_TLS,
    SMTP_USE_SSL,
    MAIL_FROM,
    MAIL_FROM_NAME,
    IS_PRODUCTION
)

logger = logging.getLogger("payent.email")

def mask_email_for_logs(email: str) -> str:
    """Mask email for safe audit logging without leaking PII."""
    if not email or "@" not in email:
        return "unknown@***"
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    masked_name = name[0] + "***" + (name[-1] if len(name) > 1 else "")
    return f"{masked_name}@{domain}"

def is_smtp_configured() -> bool:
    """Check if SMTP outbound mailer is configured."""
    return bool(SMTP_HOST and SMTP_HOST.strip())

def send_email_smtp(
    recipient_email: str,
    subject: str,
    html_content: str,
    text_content: str
) -> Tuple[bool, Optional[str]]:
    """
    Dispatches a transactional email via standard SMTP.
    Returns (success: bool, error_message: Optional[str]).
    """
    clean_email = recipient_email.strip().lower()
    if not clean_email or "@" not in clean_email:
        return False, "Invalid recipient email address"

    if not is_smtp_configured():
        logger.info(f"SMTP not configured. Email to {mask_email_for_logs(clean_email)} simulated.")
        return False, "SMTP server not configured in environment"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
        msg["To"] = clean_email
        msg["Auto-Submitted"] = "auto-generated"
        msg["X-Auto-Response-Suppress"] = "All"

        # Attach plain text and HTML versions
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if SMTP_USE_SSL or SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=12)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12)
            if SMTP_USE_TLS:
                server.starttls()

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()

        logger.info(f"Email successfully dispatched to {mask_email_for_logs(clean_email)}")
        return True, None
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication Error sending to {mask_email_for_logs(clean_email)}: {e}")
        return False, "SMTP authentication failed"
    except (smtplib.SMTPException, OSError) as e:
        logger.error(f"SMTP Delivery Error sending to {mask_email_for_logs(clean_email)}: {e}")
        return False, f"SMTP delivery error: {e}"
    except Exception as e:
        logger.error(f"Unexpected email delivery exception: {e}")
        return False, "Unexpected mailer failure"

def build_password_reset_email_html(reset_url: str) -> str:
    """Generates a responsive HTML email template for password reset."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Payent Password</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0c0d0e;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
    }}
    .container {{
      max-width: 560px;
      margin: 40px auto;
      background: #14171a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 36px 32px;
    }}
    .logo {{
      font-size: 22px;
      font-weight: 900;
      color: #10b981;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
    }}
    .title {{
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 12px;
    }}
    .text {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }}
    .btn {{
      display: inline-block;
      background: #f2f0ea;
      color: #0c0d0e;
      font-weight: 800;
      font-size: 14px;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      margin-bottom: 24px;
    }}
    .footer {{
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      margin-top: 24px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">PAYENT</div>
    <div class="title">Reset Your Password</div>
    <p class="text">
      We received a request to reset the password for your Payent account. Click the button below to choose a new secure password.
    </p>
    <a href="{reset_url}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    <p class="text" style="font-size: 12px; color: #64748b;">
      This link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request a password reset, please ignore this email or secure your account.
    </p>
    <div class="footer">
      Payent Technologies • Peer-to-Peer Creator Gear Marketplace
    </div>
  </div>
</body>
</html>"""

def build_password_reset_email_text(reset_url: str) -> str:
    """Generates plain text email body for password reset."""
    return f"""PAYENT — PASSWORD RESET REQUEST

We received a request to reset the password for your Payent account.

To reset your password, visit the following link:
{reset_url}

This link is valid for 15 minutes and can only be used once.

If you did not request this reset, you can safely ignore this email.

— The Payent Security Team
"""

def build_otp_email_html(otp: str, purpose: str = "account registration") -> str:
    """Generates a responsive HTML email template for 6-digit OTP verification."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your paYent Verification Code</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0c0d0e;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
    }}
    .container {{
      max-width: 520px;
      margin: 40px auto;
      background: #14171a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 36px 32px;
    }}
    .logo {{
      font-size: 24px;
      font-weight: 900;
      color: #10b981;
      letter-spacing: -0.5px;
      margin-bottom: 20px;
    }}
    .title {{
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 10px;
    }}
    .text {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }}
    .otp-box {{
      background: #1e2329;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 18px 24px;
      text-align: center;
      margin: 24px 0;
    }}
    .otp-code {{
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #10b981;
      font-family: monospace;
    }}
    .footer {{
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
      margin-top: 24px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">paYent</div>
    <div class="title">Verification Code</div>
    <p class="text">
      Use the 6-digit verification code below to complete your {purpose}. This code is valid for <strong>5 minutes</strong>.
    </p>
    <div class="otp-box">
      <div class="otp-code">{otp}</div>
    </div>
    <p class="text" style="font-size: 12px; color: #64748b;">
      If you did not request this verification code, please ignore this email or secure your account. Never share your verification code with anyone.
    </p>
    <div class="footer">
      paYent Technologies • Peer-to-Peer Creator Gear Marketplace
    </div>
  </div>
</body>
</html>"""

def build_otp_email_text(otp: str, purpose: str = "account registration") -> str:
    """Generates plain text email body for 6-digit OTP verification."""
    return f"""paYent — VERIFICATION CODE

Your 6-digit verification code for {purpose} is:

{otp}

This code expires in 5 minutes and can only be used once.

If you did not request this code, please safely ignore this email. Never share your verification code with anyone.

— The paYent Security Team
"""
