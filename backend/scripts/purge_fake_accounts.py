import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_db_connection

REAL_EMAILS = ("bommidimohan2003@gmail.com", "bommidimohan2330@gmail.com", "boomidimoha2003@gmail.com")

def purge_all_fake_accounts():
    conn = get_db_connection()
    if not conn:
        print("Could not connect to database.")
        return

    try:
        with conn.cursor() as cursor:
            print(f"Purging all accounts except real emails: {REAL_EMAILS}")

            # 1. users
            cursor.execute("DELETE FROM users WHERE email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real users. Rows affected: {cursor.rowcount}")

            # 2. payernt_accounts
            cursor.execute("DELETE FROM payernt_accounts WHERE email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real payernt_accounts. Rows affected: {cursor.rowcount}")

            # 3. payrent_accounts
            cursor.execute("DELETE FROM payrent_accounts WHERE email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real payrent_accounts. Rows affected: {cursor.rowcount}")

            # 4. admin_accounts
            cursor.execute("DELETE FROM admin_accounts WHERE email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real admin_accounts. Rows affected: {cursor.rowcount}")

            # 5. sessions, otps, password_reset_tokens, auth_rate_limits, mobile_verifications
            for t in ["sessions", "otps", "password_reset_tokens", "auth_rate_limits", "mobile_verifications"]:
                try:
                    cursor.execute(f"SHOW COLUMNS FROM {t}")
                    cols = [r["Field"] for r in cursor.fetchall()]
                    if "user_email" in cols:
                        cursor.execute(f"DELETE FROM {t} WHERE user_email NOT IN %s", (REAL_EMAILS,))
                    elif "email" in cols:
                        cursor.execute(f"DELETE FROM {t} WHERE email NOT IN %s", (REAL_EMAILS,))
                    print(f"Purged non-real {t}. Rows affected: {cursor.rowcount}")
                except Exception as e:
                    print(f"Notice {t}: {e}")

            # 6. cart_items, wishlist, notifications, payernt_notifications, payernt_audit_logs, support_tickets, orders, deliveries
            for t in ["cart_items", "wishlist", "notifications", "support_tickets", "orders", "deliveries", "reviews", "reports"]:
                try:
                    cursor.execute(f"SHOW COLUMNS FROM {t}")
                    cols = [r["Field"] for r in cursor.fetchall()]
                    if "user_email" in cols:
                        cursor.execute(f"DELETE FROM {t} WHERE user_email NOT IN %s", (REAL_EMAILS,))
                        print(f"Purged non-real {t}. Rows affected: {cursor.rowcount}")
                    elif "email" in cols:
                        cursor.execute(f"DELETE FROM {t} WHERE email NOT IN %s", (REAL_EMAILS,))
                        print(f"Purged non-real {t}. Rows affected: {cursor.rowcount}")
                except Exception as e:
                    print(f"Notice {t}: {e}")

            # 7. product_confirmations and payernt_products
            cursor.execute("DELETE FROM product_confirmations WHERE owner_email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real product_confirmations. Rows affected: {cursor.rowcount}")

            cursor.execute("DELETE FROM payernt_products WHERE owner_email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real payernt_products. Rows affected: {cursor.rowcount}")

            # 8. custom_products
            cursor.execute("DELETE FROM custom_products WHERE user_email NOT IN %s", (REAL_EMAILS,))
            print(f"Purged non-real custom_products. Rows affected: {cursor.rowcount}")

            # 9. agents
            cursor.execute("""
                DELETE FROM agents 
                WHERE id NOT LIKE '%bommidimohan2003%' 
                  AND id NOT LIKE '%bommidimohan2330%'
                  AND id NOT LIKE '%boomidimoha2003%'
            """)
            print(f"Purged non-real agents. Rows affected: {cursor.rowcount}")

            # 10. persons: clean orphan persons
            cursor.execute("""
                SELECT person_id FROM payernt_accounts WHERE person_id IS NOT NULL 
                UNION 
                SELECT person_id FROM payrent_accounts WHERE person_id IS NOT NULL
                UNION
                SELECT person_id FROM users WHERE person_id IS NOT NULL
            """)
            valid_person_ids = [r['person_id'] for r in cursor.fetchall() if r['person_id']]
            if valid_person_ids:
                cursor.execute("DELETE FROM persons WHERE id NOT IN %s", (tuple(valid_person_ids),))
            else:
                cursor.execute("DELETE FROM persons")
            print(f"Purged orphan persons. Rows affected: {cursor.rowcount}")

            # 11. Wallets & Transactions for non-real accounts
            cursor.execute("""
                SELECT id FROM payernt_accounts WHERE email IN %s
            """, (REAL_EMAILS,))
            real_payernt_ids = [r['id'] for r in cursor.fetchall()]
            if real_payernt_ids:
                cursor.execute("DELETE FROM payernt_wallets WHERE owner_id NOT IN %s AND owner_email NOT IN %s", (tuple(real_payernt_ids), REAL_EMAILS))
                cursor.execute("DELETE FROM payernt_wallet_transactions WHERE owner_id NOT IN %s", (tuple(real_payernt_ids),))
                cursor.execute("DELETE FROM payernt_bank_accounts WHERE owner_id NOT IN %s", (tuple(real_payernt_ids),))
                cursor.execute("DELETE FROM payernt_messages WHERE receiver_id NOT IN %s AND sender_id NOT IN %s", (tuple(real_payernt_ids), tuple(real_payernt_ids)))
                cursor.execute("DELETE FROM payernt_audit_logs WHERE user_id NOT IN %s", (tuple(real_payernt_ids),))
                cursor.execute("DELETE FROM payernt_notifications WHERE owner_id NOT IN %s", (tuple(real_payernt_ids),))
            else:
                cursor.execute("DELETE FROM payernt_wallets")
                cursor.execute("DELETE FROM payernt_wallet_transactions")
                cursor.execute("DELETE FROM payernt_bank_accounts")
                cursor.execute("DELETE FROM payernt_messages")
                cursor.execute("DELETE FROM payernt_audit_logs")
                cursor.execute("DELETE FROM payernt_notifications")

        print("\n=======================================================")
        print(" Successfully purged all fake accounts!")
        print(" Only real accounts remain:")
        print(f" - bommidimohan2003@gmail.com")
        print(f" - bommidimohan2330@gmail.com")
        print("=======================================================\n")
    finally:
        conn.close()

if __name__ == "__main__":
    purge_all_fake_accounts()
