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
    "yernikumar1438@gmail.com"
]

def purge_all_fake_data():
    conn = database.get_db_connection()
    cur = conn.cursor()

    lower_emails = [e.lower().strip() for e in REAL_EMAILS]
    placeholders = ", ".join(["%s"] * len(lower_emails))

    print("=" * 70)
    print("PURGING FAKE ACCOUNTS AND PRODUCTS FROM DATABASE")
    print(f"Keeping only real accounts: {lower_emails}")
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

    # 4. Deliveries & Orders
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

    # 5. Reviews
    try:
        cur.execute(f"DELETE FROM reviews WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake reviews: {cur.rowcount}")
    except Exception as e:
        print(f"reviews error: {e}")

    # 6. Payernt Wallet Transactions
    try:
        cur.execute(f"DELETE FROM payernt_wallet_transactions WHERE owner_id NOT IN (SELECT id FROM payernt_accounts WHERE LOWER(email) IN ({placeholders}))", tuple(lower_emails))
        print(f"Deleted fake payernt_wallet_transactions: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_wallet_transactions error: {e}")

    # 7. Payernt Wallets
    try:
        cur.execute(f"DELETE FROM payernt_wallets WHERE LOWER(owner_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake payernt_wallets: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_wallets error: {e}")

    # 8. Messages & Conversations
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

    # 9. Notifications
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

    # 10. Cart & Wishlist
    try:
        cur.execute(f"DELETE FROM cart WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake cart items: {cur.rowcount}")
    except Exception as e:
        print(f"cart error: {e}")

    try:
        cur.execute(f"DELETE FROM wishlist WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake wishlist items: {cur.rowcount}")
    except Exception as e:
        print(f"wishlist error: {e}")

    # 11. Payernt Accounts (Vendor/Lender)
    try:
        cur.execute(f"DELETE FROM payernt_accounts WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake payernt_accounts: {cur.rowcount}")
    except Exception as e:
        print(f"payernt_accounts error: {e}")

    # 12. Payrent Accounts (Customer/Renter)
    try:
        cur.execute(f"DELETE FROM payrent_accounts WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake payrent_accounts: {cur.rowcount}")
    except Exception as e:
        print(f"payrent_accounts error: {e}")

    # 13. Admin Accounts
    try:
        cur.execute(f"DELETE FROM admin_accounts WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake admin_accounts: {cur.rowcount}")
    except Exception as e:
        print(f"admin_accounts error: {e}")

    # 14. Users Table (General)
    try:
        cur.execute(f"DELETE FROM users WHERE LOWER(email) NOT IN ({placeholders})", tuple(lower_emails))
        print(f"Deleted fake users: {cur.rowcount}")
    except Exception as e:
        print(f"users error: {e}")

    # 15. Clean Persons table
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
        """)
        print(f"Deleted fake persons: {cur.rowcount}")
    except Exception as e:
        print(f"persons error: {e}")

    # 16. Tokens, sessions, otps
    try:
        cur.execute(f"DELETE FROM password_reset_tokens WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
        cur.execute(f"DELETE FROM sessions WHERE LOWER(user_email) NOT IN ({placeholders})", tuple(lower_emails))
    except Exception as e:
        print(f"tokens/sessions error: {e}")

    conn.commit()

    print("\n" + "=" * 70)
    print("REMAINING DATA IN DATABASE:")
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
        'reviews'
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
        except Exception as e:
            print(f"  {tbl:25}: error {e}")

    conn.close()
    print("\nCleanup completed successfully!")

if __name__ == "__main__":
    purge_all_fake_data()
