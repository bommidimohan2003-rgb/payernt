import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_db_connection, execute_query, MOCK_CUSTOM_PRODUCTS

def clean_fake_data():
    conn = get_db_connection()
    if not conn:
        print("Could not connect to database.")
        return

    try:
        with conn.cursor() as cursor:
            # 1. Identify fake users from users & payernt_accounts
            cursor.execute("""
                SELECT email FROM users 
                WHERE email LIKE '%@example.com' 
                   OR email LIKE '%@payent.com'
                   OR email LIKE '%@payent.io'
                   OR email LIKE '%@test.com'
                   OR email LIKE 'test_%'
                   OR email LIKE 'vendor_%'
                   OR email LIKE 'lender_%'
                   OR email LIKE 'both_%'
                   OR email LIKE 'shared_%'
                   OR email = 'secure_vendor@payent.io'
            """)
            fake_users_renter = [r['email'] for r in cursor.fetchall()]

            cursor.execute("""
                SELECT email, id FROM payernt_accounts 
                WHERE email LIKE '%@example.com' 
                   OR email LIKE '%@payent.com'
                   OR email LIKE '%@payent.io'
                   OR email LIKE '%@test.com'
                   OR email LIKE 'test_%'
                   OR email LIKE 'vendor_%'
                   OR email LIKE 'lender_%'
                   OR email LIKE 'both_%'
                   OR email LIKE 'shared_%'
                   OR email = 'secure_vendor@payent.io'
            """)
            fake_payernt_accounts = cursor.fetchall()
            fake_payernt_emails = [r['email'] for r in fake_payernt_accounts]
            fake_payernt_ids = [r['id'] for r in fake_payernt_accounts]

            all_fake_emails = list(set(fake_users_renter + fake_payernt_emails))
            print(f"Found {len(all_fake_emails)} fake/test emails to purge.")

            # 2. Identify fake products from custom_products and payernt_products
            cursor.execute("""
                SELECT id, title, user_email FROM custom_products 
                WHERE user_email LIKE '%@example.com' 
                   OR user_email LIKE '%@payent.com'
                   OR user_email LIKE '%@payent.io'
                   OR user_email LIKE '%@test.com'
                   OR user_email LIKE 'vendor_%'
                   OR user_email LIKE 'shared_%'
                   OR title LIKE '%Test%' 
                   OR title LIKE '%Pending User Drone%'
                   OR title LIKE '%Approve Me Gear%'
                   OR title LIKE '%Reject Me Gear%'
                   OR id LIKE '%test%'
            """)
            fake_custom_prods = cursor.fetchall()
            print(f"Found {len(fake_custom_prods)} fake custom_products to remove.")

            cursor.execute("""
                SELECT id, name, owner_email FROM payernt_products 
                WHERE owner_email LIKE '%@example.com' 
                   OR owner_email LIKE '%@payent.com'
                   OR owner_email LIKE '%@payent.io'
                   OR owner_email LIKE '%@test.com'
                   OR owner_email LIKE 'vendor_%'
                   OR owner_email LIKE 'shared_%'
                   OR owner_email = 'secure_vendor@payent.io'
                   OR name LIKE '%Test%'
            """)
            fake_payernt_prods = cursor.fetchall()
            print(f"Found {len(fake_payernt_prods)} fake payernt_products to remove.")

            # 3. Delete payernt side fake records
            for p in fake_payernt_prods:
                pid = p['id']
                execute_query("DELETE FROM product_confirmations WHERE product_id = %s", (pid,))
                execute_query("DELETE FROM payernt_products WHERE id = %s", (pid,))
                execute_query("DELETE FROM rental_security WHERE product_id = %s", (pid,))

            for aid in fake_payernt_ids:
                execute_query("DELETE FROM payernt_wallets WHERE user_id = %s OR account_id = %s", (aid, aid))
                execute_query("DELETE FROM payernt_wallet_transactions WHERE user_id = %s OR account_id = %s", (aid, aid))
                execute_query("DELETE FROM payernt_bank_accounts WHERE user_id = %s OR account_id = %s", (aid, aid))
                execute_query("DELETE FROM payernt_notifications WHERE user_id = %s OR account_id = %s", (aid, aid))
                execute_query("DELETE FROM payernt_audit_logs WHERE user_id = %s OR account_id = %s", (aid, aid))
                execute_query("DELETE FROM payernt_accounts WHERE id = %s", (aid,))

            for email in all_fake_emails:
                execute_query("DELETE FROM product_confirmations WHERE owner_email = %s", (email,))
                execute_query("DELETE FROM payernt_accounts WHERE email = %s", (email,))
                execute_query("DELETE FROM cart_items WHERE user_email = %s", (email,))
                execute_query("DELETE FROM wishlist WHERE user_email = %s", (email,))
                execute_query("DELETE FROM notifications WHERE user_email = %s", (email,))
                execute_query("DELETE FROM password_reset_tokens WHERE user_email = %s", (email,))
                execute_query("DELETE FROM otps WHERE email = %s", (email,))
                execute_query("DELETE FROM sessions WHERE user_email = %s", (email,))
                execute_query("DELETE FROM conversation_members WHERE user_email = %s", (email,))
                execute_query("DELETE FROM agents WHERE user_email = %s", (email,))
                execute_query("DELETE FROM users WHERE email = %s", (email,))

            # 4. Delete renter side fake custom products
            for p in fake_custom_prods:
                pid = p['id']
                execute_query("DELETE FROM cart_items WHERE product_id = %s", (pid,))
                execute_query("DELETE FROM wishlist WHERE product_id = %s", (pid,))
                execute_query("DELETE FROM reviews WHERE product_id = %s", (pid,))
                execute_query("DELETE FROM reports WHERE product_id = %s", (pid,))
                execute_query("DELETE FROM custom_products WHERE id = %s", (pid,))
                MOCK_CUSTOM_PRODUCTS.pop(pid, None)

        print("Cleanup completed successfully. All fake data purged.")
    finally:
        conn.close()

if __name__ == "__main__":
    clean_fake_data()
