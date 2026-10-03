#!/usr/bin/env python3
"""
Restrict bommidimohan2003@gmail.com strictly to Admin role only.
"""
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import get_db_connection

def set_admin_only():
    conn = get_db_connection()
    cur = conn.cursor()
    admin_email = "bommidimohan2003@gmail.com"

    # 1. Remove from vendor/lender payernt_accounts
    cur.execute("DELETE FROM payernt_accounts WHERE email = %s", (admin_email,))
    print("Removed from payernt_accounts (vendor side):", cur.rowcount)

    # 2. Remove from payrent_accounts (customer side)
    try:
        cur.execute("DELETE FROM payrent_accounts WHERE email = %s", (admin_email,))
        print("Removed from payrent_accounts (customer side):", cur.rowcount)
    except Exception as e:
        print("payrent_accounts notice:", e)

    # 3. Update users table to strictly role='admin'
    cur.execute("""
        UPDATE users 
        SET role = 'admin', account_type = 'admin' 
        WHERE email = %s
    """, (admin_email,))
    print("Updated users table role strictly to 'admin':", cur.rowcount)

    # 4. Verify admin_accounts table has superadmin entry
    cur.execute("SELECT email, full_name, role, status FROM admin_accounts WHERE email = %s", (admin_email,))
    admin_rec = cur.fetchone()
    print("admin_accounts record:", admin_rec)

    conn.commit()
    conn.close()
    print("\nAccount is now strictly configured as ADMIN ONLY.")

if __name__ == "__main__":
    set_admin_only()
