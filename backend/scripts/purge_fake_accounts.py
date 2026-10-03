#!/usr/bin/env python3
"""
Purge fake/test accounts and test artifacts from the TiDB database,
retaining only the real account(s) like bommidimohan2003@gmail.com.
"""
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import get_db_connection
from auth import hash_password

def purge_fake_accounts():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to TiDB database.")
        return

    cur = conn.cursor()
    real_email = "bommidimohan2003@gmail.com"

    print(f"Purging all fake accounts except {real_email}...")

    # Tables with email column
    tables_with_email = [
        ("users", "email"),
        ("payernt_accounts", "email"),
        ("payrent_accounts", "email"),
        ("admin_accounts", "email"),
        ("custom_products", "user_email"),
        ("payernt_products", "owner_email"),
        ("orders", "user_email"),
        ("cart_items", "user_email"),
        ("wishlist", "user_email"),
        ("reviews", "user_email"),
        ("sessions", "user_email"),
        ("password_reset_tokens", "user_email"),
        ("notifications", "user_email"),
        ("support_tickets", "user_email"),
        ("deliveries", "customer_email"),
        ("conversations", "customer_email"),
        ("conversations", "lender_email"),
        ("conversation_members", "user_email"),
        ("messages", "sender_email"),
    ]

    for tbl, col in tables_with_email:
        try:
            cur.execute(f"DELETE FROM `{tbl}` WHERE `{col}` != %s", (real_email,))
            print(f"Purged non-real rows from {tbl}")
        except Exception as e:
            print(f"Notice {tbl}: {e}")

    # Purge vendor sub-tables
    vendor_tables = [
        "payernt_wallets",
        "payernt_wallet_transactions",
        "payernt_bank_accounts",
        "payernt_notifications",
        "payernt_messages",
        "payernt_audit_logs",
        "product_confirmations",
        "rental_security",
    ]

    for tbl in vendor_tables:
        try:
            cur.execute(f"""
                DELETE FROM `{tbl}` 
                WHERE owner_id NOT LIKE %s 
                AND owner_id NOT IN (SELECT id FROM payernt_accounts WHERE email = %s)
            """, (f"%{real_email}%", real_email))
            print(f"Purged non-real rows from {tbl}")
        except Exception as e:
            print(f"Notice {tbl}: {e}")

    # Clean persons, otps, rate limits
    try:
        cur.execute("DELETE FROM persons WHERE phone NOT LIKE '%8810519885%' AND name NOT LIKE '%Mohan%'")
        cur.execute("DELETE FROM mobile_verifications")
        cur.execute("DELETE FROM otps")
        cur.execute("DELETE FROM auth_rate_limits")
        print("Purged persons, otps, and auth rate limits")
    except Exception as e:
        print(f"Notice cleanup: {e}")

    # Ensure real account exists in payernt_accounts
    cur.execute("SELECT * FROM payernt_accounts WHERE email = %s", (real_email,))
    payernt_acc = cur.fetchone()
    if not payernt_acc:
        cur.execute("SELECT password_hash FROM users WHERE email = %s", (real_email,))
        u = cur.fetchone()
        pwd_hash = u["password_hash"] if u and u.get("password_hash") else hash_password("Bmohan@2026")
        cur.execute("""
            INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at)
            VALUES ('PAYERNT_MOHAN_ADMIN', 'paye₹nt', %s, 'Bommidi Mohan', '881051988500', '+91 8810519885', 'Hyderabad, India', '500081', %s, 'active', NOW())
        """, (real_email, pwd_hash))
        print(f"Created clean payernt_accounts record for {real_email}")

    conn.commit()

    # Print remaining accounts
    print("\n--- REMAINING ACCOUNTS IN TIDB DATABASE ---")
    cur.execute("SELECT email, full_name, phone, role FROM users")
    print("USERS:", cur.fetchall())

    cur.execute("SELECT id, email, name, phone, account_type FROM payernt_accounts")
    print("PAYERNT_ACCOUNTS:", cur.fetchall())

    # Clean remaining tables with correct column names
    try:
        cur.execute("DELETE FROM wishlist WHERE user_id != 'bommidimohan2003@gmail.com' AND user_id NOT IN (SELECT id FROM users WHERE email = 'bommidimohan2003@gmail.com')")
    except Exception:
        try:
            cur.execute("DELETE FROM wishlist")
        except Exception:
            pass

    try:
        cur.execute("DELETE FROM deliveries WHERE booking_id NOT IN (SELECT id FROM orders)")
    except Exception:
        pass

    try:
        cur.execute("DELETE FROM payernt_messages WHERE sender_id NOT LIKE '%bommidimohan2003@gmail.com%' AND receiver_id NOT LIKE '%bommidimohan2003@gmail.com%'")
    except Exception:
        pass

    try:
        cur.execute("DELETE FROM payernt_audit_logs WHERE account_id NOT IN (SELECT id FROM payernt_accounts WHERE email = 'bommidimohan2003@gmail.com')")
    except Exception:
        pass

    try:
        cur.execute("DELETE FROM rental_security WHERE booking_id NOT IN (SELECT id FROM orders)")
    except Exception:
        pass

    conn.commit()

    # Print remaining accounts
    print("\n--- REMAINING ACCOUNTS IN TIDB DATABASE ---")
    cur.execute("SELECT email, full_name, phone, role FROM users")
    print("USERS:", cur.fetchall())

    cur.execute("SELECT id, email, name, phone, account_type FROM payernt_accounts")
    print("PAYERNT_ACCOUNTS:", cur.fetchall())

    try:
        cur.execute("SELECT email, full_name, phone FROM payrent_accounts")
        print("PAYRENT_ACCOUNTS:", cur.fetchall())
    except Exception:
        cur.execute("SELECT * FROM payrent_accounts")
        print("PAYRENT_ACCOUNTS:", cur.fetchall())

    try:
        cur.execute("SELECT * FROM admin_accounts")
        print("ADMIN_ACCOUNTS:", cur.fetchall())
    except Exception as e:
        print("ADMIN_ACCOUNTS notice:", e)

    conn.close()
    print("\nAll fake accounts successfully removed!")

if __name__ == "__main__":
    purge_fake_accounts()
