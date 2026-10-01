import sys
import os

# Ensure backend dir is on path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import database

def clean_database():
    conn = database.get_db_connection()
    cur = conn.cursor()

    REAL_EMAILS = [
        "bommidimohan2003@gmail.com",
        "bommidimohan2330@gmail.com"
    ]
    
    print("=" * 60)
    print("PURGING FAKE ACCOUNTS AND PRODUCTS FROM DATABASE")
    print(f"Preserving real accounts: {REAL_EMAILS}")
    print("=" * 60)

    # 1. Custom Products (all fake test products)
    cur.execute("SELECT count(*) as cnt FROM custom_products")
    print(f"Total custom_products before: {cur.fetchone()['cnt']}")
    cur.execute(
        "DELETE FROM custom_products WHERE user_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake custom_products: {cur.rowcount}")

    # 2. Payernt Products (all fake test products)
    cur.execute("SELECT count(*) as cnt FROM payernt_products")
    print(f"Total payernt_products before: {cur.fetchone()['cnt']}")
    cur.execute(
        "DELETE FROM payernt_products WHERE owner_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake payernt_products: {cur.rowcount}")

    # 3. Product Confirmations (for fake products/accounts)
    cur.execute(
        "DELETE FROM product_confirmations WHERE owner_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake product_confirmations: {cur.rowcount}")

    # 4. Orders & Deliveries (fake test orders)
    cur.execute(
        "DELETE FROM deliveries WHERE booking_id NOT IN (SELECT id FROM orders WHERE user_email IN (%s, %s))",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake deliveries: {cur.rowcount}")

    cur.execute(
        "DELETE FROM orders WHERE user_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake orders: {cur.rowcount}")

    # 5. Payernt Wallet Transactions (for fake wallets/accounts)
    cur.execute(
        "DELETE FROM payernt_wallet_transactions WHERE owner_id NOT IN (SELECT id FROM payernt_accounts WHERE email IN (%s, %s))",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake payernt_wallet_transactions: {cur.rowcount}")

    # 6. Payernt Wallets (for fake accounts)
    cur.execute(
        "DELETE FROM payernt_wallets WHERE owner_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake payernt_wallets: {cur.rowcount}")

    # 7. Messages & Conversations
    cur.execute(
        "DELETE FROM messages WHERE sender_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake messages: {cur.rowcount}")

    cur.execute(
        "DELETE FROM conversation_members WHERE user_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake conversation_members: {cur.rowcount}")

    cur.execute(
        "DELETE FROM conversations WHERE customer_email NOT IN (%s, %s) AND lender_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1], REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake conversations: {cur.rowcount}")

    # 8. Notifications
    cur.execute(
        "DELETE FROM notifications WHERE user_email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake notifications: {cur.rowcount}")

    cur.execute(
        "DELETE FROM payernt_notifications WHERE owner_id NOT IN (SELECT id FROM payernt_accounts WHERE email IN (%s, %s))",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake payernt_notifications: {cur.rowcount}")

    # 9. Payernt Accounts (Vendor/Lender)
    cur.execute(
        "DELETE FROM payernt_accounts WHERE email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake payernt_accounts: {cur.rowcount}")

    # 10. Payrent Accounts (Renter/Customer)
    cur.execute(
        "DELETE FROM payrent_accounts WHERE email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake payrent_accounts: {cur.rowcount}")

    # 11. Admin Accounts
    cur.execute(
        "DELETE FROM admin_accounts WHERE email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake admin_accounts: {cur.rowcount}")

    # 12. Users table (General)
    cur.execute(
        "DELETE FROM users WHERE email NOT IN (%s, %s)",
        (REAL_EMAILS[0], REAL_EMAILS[1])
    )
    print(f"Deleted fake users: {cur.rowcount}")

    # 13. Persons table (remove test persons)
    # Keep real persons linked to real accounts
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
    """)
    print(f"Deleted fake persons: {cur.rowcount}")

    # 14. Clean test tokens, sessions, otps
    cur.execute("DELETE FROM password_reset_tokens WHERE user_email NOT IN (%s, %s)", (REAL_EMAILS[0], REAL_EMAILS[1]))
    cur.execute("DELETE FROM sessions WHERE user_email NOT IN (%s, %s)", (REAL_EMAILS[0], REAL_EMAILS[1]))
    cur.execute("DELETE FROM mobile_verifications WHERE phone NOT LIKE '%7989002612%' AND phone NOT LIKE '%8810519885%'")

    conn.commit()

    print("\n" + "=" * 60)
    print("CURRENT CLEAN DATABASE STATE:")
    print("=" * 60)
    
    for tbl in [
        'users', 
        'admin_accounts', 
        'payernt_accounts', 
        'payrent_accounts', 
        'custom_products', 
        'payernt_products', 
        'orders', 
        'deliveries',
        'payernt_wallets',
        'product_confirmations'
    ]:
        cur.execute(f"SELECT count(*) as cnt FROM {tbl}")
        cnt = cur.fetchone()['cnt']
        print(f"  {tbl:25}: {cnt} records")
        if cnt > 0:
            if tbl in ['users', 'admin_accounts', 'payrent_accounts']:
                cur.execute(f"SELECT email, full_name, role FROM {tbl}")
                for row in cur.fetchall():
                    print(f"    -> {row}")
            elif tbl == 'payernt_accounts':
                cur.execute(f"SELECT email, name FROM {tbl}")
                for row in cur.fetchall():
                    print(f"    -> {row}")
            elif tbl in ['custom_products', 'payernt_products']:
                cur.execute(f"SELECT id, title FROM {tbl}")
                for row in cur.fetchall():
                    print(f"    -> {row}")

    conn.close()
    print("\nDatabase cleanup complete successfully!")

if __name__ == "__main__":
    clean_database()
