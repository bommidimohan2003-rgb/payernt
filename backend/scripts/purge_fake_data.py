import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import database

REAL_EMAILS = [
    "bommidimohan304@gmail.com",
    "bommidimohan2003@gmail.com",
    "vasnathchikkala@gmail.com",
    "yernikumar1438@gmail.com",
    "shinyshakhina08@gmail.com",
    "pch7509@gmail.com"
]

def purge_all_fake_data():
    conn = database.get_db_connection()
    if not conn:
        print("Failed to establish connection to database.")
        sys.exit(1)
    cur = conn.cursor()

    lower_emails = [e.lower().strip() for e in REAL_EMAILS]
    placeholders = ", ".join(["%s"] * len(lower_emails))

    print("=" * 70)
    print("PURGING FAKE ACCOUNTS, PRODUCTS, AND DATA FROM DATABASE")
    print(f"Preserving real accounts: {lower_emails}")
    print("=" * 70)

    # 1. Custom Products (Keep only if belonging to real emails)
    try:
        cur.execute(f"DELETE FROM custom_products WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake custom_products: {cur.rowcount}")
    except Exception as e:
        print(f"custom_products error: {e}")

    # 2. Payernt Products (Keep only if belonging to real emails)
    try:
        cur.execute(f"DELETE FROM payernt_products WHERE LOWER(owner_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake payernt_products: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_products error: {e}")

    # 3. Product Confirmations
    try:
        cur.execute(f"DELETE FROM product_confirmations WHERE LOWER(owner_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake product_confirmations: {cur.rowcount}")
    except Exception as e:
        print(f"product_confirmations error: {e}")

    # 4. Rental Security
    try:
        cur.execute(f"""
            DELETE FROM rental_security 
            WHERE LOWER(vendor_id) NOT IN ({placeholders})
            AND vendor_id NOT IN (SELECT id FROM payernt_accounts WHERE LOWER(email) IN ({placeholders}))
            AND LOWER(renter_id) NOT IN ({placeholders})
            AND renter_id NOT IN (SELECT email FROM users WHERE LOWER(email) IN ({placeholders}))
        """, tuple(lower_emails + lower_emails + lower_emails + lower_emails))
        print(f"Deleted fake rental_security: {cur.rowcount}")
    except Exception as e:
        print(f"rental_security error: {e}")

    # 5. Orders & Deliveries
    try:
        cur.execute(f"DELETE FROM deliveries WHERE booking_id NOT IN (SELECT id FROM orders WHERE LOWER(user_email) IN ({placeholders}))", tuple(lower_emails))
        print(f"Deleted fake deliveries: {cur.rowcount}")
    except Exception as e:
        print(f"deliveries error: {e}")

    try:
        cur.execute(f"DELETE FROM orders WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake orders: {cur.rowcount}")
    except Exception as e:
        print(f"orders error: {e}")

    # 6. Reviews
    try:
        cur.execute(f"DELETE FROM reviews WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake reviews: {cur.rowcount}")
    except Exception as e:
        print(f"reviews error: {e}")

    # 7. Payernt Wallet Transactions
    try:
        cur.execute(f"DELETE FROM payernt_wallet_transactions WHERE owner_id NOT IN (SELECT id FROM payernt_accounts WHERE LOWER(email) IN ({placeholders}))", tuple(lower_emails))
        print(f"Deleted fake payernt_wallet_transactions: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_wallet_transactions error: {e}")

    # 8. Payernt Wallets
    try:
        cur.execute(f"DELETE FROM payernt_wallets WHERE LOWER(owner_email) NOT IN ({placeholders}) AND owner_id NOT IN (SELECT id FROM payernt_accounts WHERE LOWER(email) IN ({placeholders}))", tuple(lower_emails + lower_emails))
        print(f"Deleted fake payernt_wallets: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_wallets error: {e}")

    # 9. Messages & Conversations
    try:
        cur.execute(f"DELETE FROM messages WHERE LOWER(sender_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake messages: {cur.rowcount}")
    except Exception as e:
        print(f"messages error: {e}")

    try:
        cur.execute(f"DELETE FROM conversation_members WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake conversation_members: {cur.rowcount}")
    except Exception as e:
        print(f"conversation_members error: {e}")

    try:
        cur.execute(f"DELETE FROM conversations WHERE LOWER(customer_email) NOT IN ({placeholders}) AND LOWER(lender_email) NOT IN ({placeholders})", tuple(lower_emails + lower_emails))
        print(f"Deleted fake conversations: {cur.rowcount}")
    except Exception as e:
        print(f"conversations error: {e}")

    # 10. Notifications
    try:
        cur.execute(f"DELETE FROM notifications WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake notifications: {cur.rowcount}")
    except Exception as e:
        print(f"notifications error: {e}")

    try:
        cur.execute(f"DELETE FROM payernt_notifications WHERE owner_id NOT IN (SELECT id FROM payernt_accounts WHERE LOWER(email) IN ({placeholders}))", tuple(lower_emails))
        print(f"Deleted fake payernt_notifications: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_notifications error: {e}")

    # 11. Support Tickets & Messages
    try:
        cur.execute(f"DELETE FROM support_ticket_messages WHERE ticket_id NOT IN (SELECT id FROM support_tickets WHERE LOWER(user_email) IN ({placeholders}))", tuple(lower_emails))
        print(f"Deleted fake support_ticket_messages: {cur.rowcount}")
    except Exception as e:
        print(f"support_ticket_messages error: {e}")

    try:
        cur.execute(f"DELETE FROM support_tickets WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake support_tickets: {cur.rowcount}")
    except Exception as e:
        print(f"support_tickets error: {e}")

    # 12. Cart & Wishlist
    try:
        cur.execute(f"DELETE FROM cart WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake cart items: {cur.rowcount}")
    except Exception:
        pass

    try:
        cur.execute(f"DELETE FROM cart_items WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake cart_items: {cur.rowcount}")
    except Exception:
        pass

    try:
        cur.execute(f"DELETE FROM wishlist WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake wishlist items: {cur.rowcount}")
    except Exception as e:
        print(f"wishlist error: {e}")

    # 13. Payernt Accounts (Vendor/Lender)
    try:
        cur.execute(f"DELETE FROM payernt_accounts WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake payernt_accounts: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_accounts error: {e}")

    # 14. Payrent Accounts (Customer/Renter)
    try:
        cur.execute(f"DELETE FROM payrent_accounts WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake payrent_accounts: {cur.rowcount}")
    except Exception as e:
        print(f"payrent_accounts error: {e}")

    # 15. Admin Accounts (Only bommidimohan2003@gmail.com is real admin)
    try:
        cur.execute("DELETE FROM admin_accounts WHERE LOWER(email) != 'bommidimohan2003@gmail.com'")
        print(f"Deleted fake admin_accounts: {cur.rowcount}")
    except Exception as e:
        print(f"admin_accounts error: {e}")

    # 16. Users Table (General)
    try:
        cur.execute(f"DELETE FROM users WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake users: {cur.rowcount}")
    except Exception as e:
        print(f"users error: {e}")

    # 17. Clean Persons table (keep only those linked to real accounts)
    try:
        cur.execute("""
            DELETE FROM persons 
            WHERE id NOT IN (
                SELECT DISTINCT person_id FROM payernt_accounts WHERE person_id IS NOT NULL
                UNION
                SELECT DISTINCT person_id FROM payrent_accounts WHERE person_id IS NOT NULL
                UNION
                SELECT DISTINCT person_id FROM users WHERE person_id IS NOT NULL
            )
            AND name NOT LIKE '%Mohan%'
            AND name NOT LIKE '%Bommidi%'
            AND name NOT LIKE '%Vasnath%'
            AND name NOT LIKE '%Yerni%'
            AND name NOT LIKE '%Shiny%'
            AND name NOT LIKE '%Vinay%'
            AND name NOT LIKE '%Pediredla%'
        """)
        print(f"Deleted fake persons: {cur.rowcount}")
    except Exception as e:
        print(f"persons error: {e}")

    # 18. Tokens, sessions, otps
    try:
        cur.execute(f"DELETE FROM password_reset_tokens WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        cur.execute(f"DELETE FROM sessions WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
    except Exception as e:
        print(f"tokens/sessions error: {e}")

    # ============================================================
    # 19. CROSS-CONTEXT SYNCHRONIZATION FOR THE 6 REAL ACCOUNTS
    # ============================================================
    print("\nEnsuring cross-context synchronization for the 6 real accounts...")

    # A. Ensure pch7509@gmail.com (Vinay Pediredla) has a user record
    cur.execute("SELECT * FROM payernt_accounts WHERE LOWER(email) = 'pch7509@gmail.com'")
    vinay_p = cur.fetchone()
    if vinay_p:
        cur.execute("SELECT * FROM users WHERE LOWER(email) = 'pch7509@gmail.com'")
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO users (email, phone, password_hash, full_name, role, status, verified, kyc_status, created_at, account_type, person_id)
                VALUES ('pch7509@gmail.com', %s, %s, 'Vinay Pediredla', 'user', 'APPROVED', 1, 'APPROVED', NOW(), 'paye₹nt', %s)
            """, (vinay_p.get("phone", "+918374661542"), vinay_p.get("password_hash"), vinay_p.get("person_id")))
            print("  Created user record for pch7509@gmail.com (Vinay Pediredla).")

    # B. Ensure yernikumar1438@gmail.com (Yerni Kumar) has a user record
    cur.execute("SELECT * FROM payernt_accounts WHERE LOWER(email) = 'yernikumar1438@gmail.com'")
    yerni_p = cur.fetchone()
    if yerni_p:
        cur.execute("SELECT * FROM users WHERE LOWER(email) = 'yernikumar1438@gmail.com'")
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO users (email, phone, password_hash, full_name, role, status, verified, kyc_status, created_at, account_type, person_id)
                VALUES ('yernikumar1438@gmail.com', %s, %s, 'Yerni Kumar', 'user', 'APPROVED', 1, 'APPROVED', NOW(), 'paye₹nt', %s)
            """, (yerni_p.get("phone", "+919701041513"), yerni_p.get("password_hash"), yerni_p.get("person_id")))
            print("  Created user record for yernikumar1438@gmail.com (Yerni Kumar).")

    # C. Ensure vasnathchikkala@gmail.com has an entry in payernt_accounts
    cur.execute("SELECT * FROM users WHERE LOWER(email) = 'vasnathchikkala@gmail.com'")
    vasnath_u = cur.fetchone()
    if vasnath_u:
        cur.execute("SELECT * FROM payernt_accounts WHERE LOWER(email) = 'vasnathchikkala@gmail.com'")
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at, person_id)
                VALUES ('PAYERNT_USER_VASNATH', 'paye₹nt', 'vasnathchikkala@gmail.com', 'Vasnath Chikkala', 'XXXX-XXXX-4103', %s, %s, %s, %s, 'APPROVED', NOW(), %s)
            """, (vasnath_u.get("phone", "+919381654103"), vasnath_u.get("address", "Madhapur"), vasnath_u.get("pincode", "530051"), vasnath_u.get("password_hash"), vasnath_u.get("person_id")))
            print("  Created payernt_accounts record for vasnathchikkala@gmail.com.")

    # D. Ensure shinyshakhina08@gmail.com has an entry in payernt_accounts
    cur.execute("SELECT * FROM users WHERE LOWER(email) = 'shinyshakhina08@gmail.com'")
    shiny_u = cur.fetchone()
    if shiny_u:
        cur.execute("SELECT * FROM payernt_accounts WHERE LOWER(email) = 'shinyshakhina08@gmail.com'")
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO payernt_accounts (id, account_type, email, name, aadhaar_number, phone, address, pincode, password_hash, status, created_at, avatar, profile_photo_url, profile_photo_public_id, person_id)
                VALUES ('PAYERNT_USER_SHINY', 'paye₹nt', 'shinyshakhina08@gmail.com', 'Shiny Shakhina', 'XXXX-XXXX-2138', %s, %s, %s, %s, 'APPROVED', NOW(), %s, %s, %s, %s)
            """, (shiny_u.get("phone", "+919059902138"), shiny_u.get("address", "visakhapatnam"), shiny_u.get("pincode", "530027"), shiny_u.get("password_hash"), shiny_u.get("avatar"), shiny_u.get("profile_photo_url"), shiny_u.get("profile_photo_public_id"), shiny_u.get("person_id")))
            print("  Created payernt_accounts record for shinyshakhina08@gmail.com.")

    conn.commit()

    print("\n" + "=" * 70)
    print("FINAL DATABASE STATE (AFTER PURGING ALL REMAINING USERS & PRODUCTS):")
    print("=" * 70)
    for tbl in [
        'users', 
        'admin_accounts', 
        'payernt_accounts', 
        'payrent_accounts', 
        'payernt_products', 
        'custom_products', 
        'orders', 
        'deliveries',
        'payernt_wallets',
        'reviews',
        'support_tickets'
    ]:
        try:
            cur.execute(f"SELECT count(*) as cnt FROM {tbl}")
            cnt = cur.fetchone()['cnt']
            print(f"  {tbl:25}: {cnt} records")
            if cnt > 0:
                if tbl in ['users', 'admin_accounts', 'payrent_accounts']:
                    cur.execute(f"SELECT email, full_name, role, status FROM {tbl}")
                    for row in cur.fetchall():
                        print(f"    -> {row}")
                elif tbl == 'payernt_accounts':
                    cur.execute(f"SELECT email, name, status FROM {tbl}")
                    for row in cur.fetchall():
                        print(f"    -> {row}")
                elif tbl in ['custom_products', 'payernt_products']:
                    cur.execute(f"SELECT id, title, owner_email FROM {tbl}" if tbl == 'payernt_products' else f"SELECT id, title, user_email FROM {tbl}")
                    for row in cur.fetchall():
                        print(f"    -> {row}")
                elif tbl == 'support_tickets':
                    cur.execute("SELECT id, user_email, subject, status FROM support_tickets")
                    for row in cur.fetchall():
                        print(f"    -> {row}")
        except Exception as e:
            print(f"  {tbl:25}: error {e}")

    conn.close()
    print("\nPurge completed successfully! All remaining non-real users and products removed.")

if __name__ == "__main__":
    purge_all_fake_data()
