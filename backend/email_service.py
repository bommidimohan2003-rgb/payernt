import os
import smtplib
import logging
import urllib.parse
import concurrent.futures
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
    IS_PRODUCTION,
    FRONTEND_URL
)

logger = logging.getLogger("payent.email")

# Background thread pool executor for non-blocking instantaneous email dispatch
_email_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="payent_email")

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

def send_email_async(
    recipient_email: str,
    subject: str,
    html_content: str,
    text_content: str
) -> None:
    """Dispatches transactional email in background thread for instant sub-20ms API response."""
    _email_executor.submit(send_email_smtp, recipient_email, subject, html_content, text_content)

def dispatch_otp_email(
    clean_email: str,
    otp: str,
    purpose: str = "account registration",
    action_url: Optional[str] = None,
    sync: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Builds and dispatches OTP email.
    If sync=False (default), sends via ThreadPoolExecutor in background so API responds in <15ms.
    If sync=True, waits for SMTP delivery synchronously.
    """
    if not is_smtp_configured():
        logger.info(f"SMTP not configured. OTP email to {mask_email_for_logs(clean_email)} simulated.")
        return False, "SMTP not configured"

    purpose_lower = purpose.lower()
    if "sign in" in purpose_lower or "login" in purpose_lower:
        subject = f"{otp} is your paYent sign-in code"
    elif "register" in purpose_lower or "lender" in purpose_lower:
        subject = f"{otp} is your paYent registration code"
    else:
        subject = f"{otp} is your paYent verification code"

    html = build_otp_email_html(otp, purpose, action_url=action_url, clean_email=clean_email)
    text = build_otp_email_text(otp, purpose, action_url=action_url, clean_email=clean_email)

    if sync:
        return send_email_smtp(clean_email, subject, html, text)
    else:
        _email_executor.submit(send_email_smtp, clean_email, subject, html, text)
        return True, None

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

def build_otp_email_html(
    otp: str,
    purpose: str = "account registration",
    action_url: Optional[str] = None,
    clean_email: str = ""
) -> str:
    """Generates a responsive, unslop HTML email template for 6-digit OTP verification with a working clickable button."""
    purpose_label = purpose.strip().lower()

    if not action_url:
        target_route = "/login"
        if "payernt" in purpose_label:
            if "register" in purpose_label or "lender" in purpose_label:
                target_route = "/payernt?mode=register"
            else:
                target_route = "/payernt?mode=login"
        elif "register" in purpose_label or "registration" in purpose_label:
            target_route = "/register"

        sep = "&" if "?" in target_route else "?"
        encoded_email = urllib.parse.quote(clean_email) if clean_email else ""
        email_param = f"&email={encoded_email}" if encoded_email else ""
        action_url = f"{FRONTEND_URL}{target_route}{sep}otp={otp}{email_param}"

    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{otp} is your paYent verification code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090a0c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090a0c; width: 100%; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #111317; border: 1px solid #23272f; border-radius: 16px; margin: 0 auto;">
          <!-- Brand -->
          <tr>
            <td style="padding: 28px 28px 0 28px;">
              <span style="font-size: 22px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">paYent</span>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding: 16px 28px 8px 28px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Verification Code</h1>
            </td>
          </tr>
          <!-- Body Text -->
          <tr>
            <td style="padding: 0 28px 20px 28px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
              We received a request for <strong style="color: #f1f5f9;">{purpose_label}</strong>. Enter the single-use 6-digit code below to confirm your request:
            </td>
          </tr>
          <!-- OTP Highlight Card -->
          <tr>
            <td style="padding: 0 28px 24px 28px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #171b21; border: 1px solid #28303c; border-radius: 12px; text-align: center;">
                <tr>
                  <td align="center" style="padding: 24px 16px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 12px;">
                      Your Single-Use Verification Code
                    </div>
                    <!-- Big Bold Code Box with full inline style -->
                    <div style="display: inline-block; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #10b981; font-family: 'Courier New', Courier, Consolas, monospace; background-color: #090a0c; border: 2px dashed #10b981; border-radius: 10px; padding: 12px 24px; text-align: center;">
                      {otp}
                    </div>
                    <div style="margin-top: 18px;">
                      <a href="{action_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #10b981; color: #090a0c !important; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 10px; padding: 13px 26px; text-align: center;">
                        Copy Code ({otp})
                      </a>
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #64748b; line-height: 1.4;">
                      Copies code directly to your clipboard without leaving your sign-in screen.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Expiration Notice -->
          <tr>
            <td style="padding: 0 28px 24px 28px; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
              This code expires in 5 minutes and can only be used once. Never share this code with anyone. If you did not make this request, you can safely ignore this message.
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px 24px 28px; border-top: 1px solid #1e2329; font-size: 11px; color: #475569; text-align: center; line-height: 1.5;">
              paYent Security • Automated identity verification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def build_otp_email_text(
    otp: str,
    purpose: str = "account registration",
    action_url: Optional[str] = None,
    clean_email: str = ""
) -> str:
    """Generates clean plain text email body for 6-digit OTP verification."""
    purpose_label = purpose.strip().lower()

    if not action_url:
        target_route = "/login"
        if "payernt" in purpose_label:
            if "register" in purpose_label or "lender" in purpose_label:
                target_route = "/payernt?mode=register"
            else:
                target_route = "/payernt?mode=login"
        elif "register" in purpose_label or "registration" in purpose_label:
            target_route = "/register"

        sep = "&" if "?" in target_route else "?"
        encoded_email = urllib.parse.quote(clean_email) if clean_email else ""
        email_param = f"&email={encoded_email}" if encoded_email else ""
        action_url = f"{FRONTEND_URL}{target_route}{sep}otp={otp}{email_param}"

    return f"""paYent — Verification Code

We received a request for {purpose_label}.

Your 6-digit verification code is:
{otp}

Click to copy code to clipboard:
{action_url}

This code expires in 5 minutes and can only be used once. Never share this code with anyone.
If you did not make this request, you can safely ignore this message.

— paYent Security Team
"""
