import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection

def reset_tidb_cloud():
    print("=" * 80)
    print("RESETTING TIDB CLOUD DATA (PRESERVING USERS, ADMINS, AND AGENTS)")
    print("=" * 80)

    conn = get_db_connection()
    if not conn:
        print("ERROR: Could not establish connection to TiDB Cloud!")
        return

    # Tables to completely clear/reset
    tables_to_clear = [
        "orders",
        "payments",
        "processed_payment_events",
        "custom_products",
        "payernt_products",
        "product_confirmations",
        "cart_items",
        "deliveries",
        "delivery_location_updates",
        "rental_security",
        "booking_cancellations",
        "conversations",
        "conversation_members",
        "messages",
        "message_attachments",
        "support_tickets",
        "reports",
        "reviews",
        "devices",
        "device_security_history",
        "device_transfers",
        "admin_logs",
        "payernt_audit_logs",
        "user_events",
        "notifications",
        "admin_notifications",
        "payernt_notifications",
        "payernt_wallet_transactions",
        "sessions",
        "token_blocklist",
        "auth_rate_limits",
        "password_reset_tokens",
        "persons",
        "payernt_accounts",
        "payrent_accounts",
        "payernt_bank_accounts",
    ]

    try:
        with conn.cursor() as cur:
            cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            print("\n1. Clearing operational marketplace and activity data...")
            cleared_summary = []
            for tbl in tables_to_clear:
                try:
                    cur.execute(f"SELECT COUNT(*) as c FROM `{tbl}`")
                    before_cnt = cur.fetchone()["c"]
                    cur.execute(f"DELETE FROM `{tbl}`")
                    cleared_summary.append((tbl, before_cnt))
                    print(f"  ✓ {tbl:<30} : Cleared {before_cnt} records")
                except Exception as e:
                    print(f"  ⚠ {tbl:<30} : {e}")

            # 2. Reset wallet balances to 0 for a clean start
            print("\n2. Resetting wallet balances to ₹0.00...")
            try:
                cur.execute("""
                    UPDATE payernt_wallets 
                    SET balance = 0.00, locked_balance = 0.00, pending_withdrawal = 0.00
                """)
                cur.execute("SELECT COUNT(*) as c FROM payernt_wallets")
                w_cnt = cur.fetchone()["c"]
                print(f"  ✓ payernt_wallets              : {w_cnt} wallets reset to ₹0.00")
            except Exception as e:
                print(f"  ⚠ payernt_wallets reset error : {e}")

            cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
            conn.commit()

        # 3. Verification of Preserved Accounts
        print("\n3. Verifying Preserved Tables in TiDB Cloud:")
        with conn.cursor() as cur:
            cur.execute("SELECT email, full_name, role FROM users")
            users = cur.fetchall()
            print(f"  ✓ users ({len(users)} accounts preserved):")
            for u in users:
                print(f"      - {u['email']} ({u['full_name']} - Role: {u['role']})")

            cur.execute("SELECT email, full_name, role FROM admin_accounts")
            admins = cur.fetchall()
            print(f"  ✓ admin_accounts ({len(admins)} admin accounts preserved):")
            for a in admins:
                print(f"      - {a['email']} ({a['full_name']} - Role: {a['role']})")

            cur.execute("SELECT id, user_email, status FROM agents")
            agents = cur.fetchall()
            print(f"  ✓ agents ({len(agents)} staff agents preserved):")
            for ag in agents:
                print(f"      - {ag['user_email']} (ID: {ag['id']}, Status: {ag['status']})")

            cur.execute("SELECT COUNT(*) as c FROM orders")
            print(f"  ✓ orders remaining: {cur.fetchone()['c']}")
            cur.execute("SELECT COUNT(*) as c FROM custom_products")
            print(f"  ✓ custom_products remaining: {cur.fetchone()['c']}")
            cur.execute("SELECT COUNT(*) as c FROM payernt_products")
            print(f"  ✓ payernt_products remaining: {cur.fetchone()['c']}")
            cur.execute("SELECT COUNT(*) as c FROM payments")
            print(f"  ✓ payments remaining: {cur.fetchone()['c']}")

        print("\n" + "=" * 80)
        print("TIDB CLOUD DATABASE RESET COMPLETE SUCCESSFULLY!")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"FATAL ERROR during reset: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    reset_tidb_cloud()
