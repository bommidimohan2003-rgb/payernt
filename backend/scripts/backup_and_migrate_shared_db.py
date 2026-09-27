import os
import sys
import json
import time
from datetime import datetime as dt, timezone

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import get_db_connection, execute_query, fetch_one, fetch_all, init_db
from payernt_database import init_payernt_tables

def create_database_backup():
    print("=== STEP 1: Creating Database Backup ===")
    backup_data = {
        "timestamp": dt.now(timezone.utc).isoformat(),
        "tables": {}
    }
    
    tables = [
        "users", "payernt_accounts", "custom_products", "payernt_products",
        "orders", "rental_security", "payernt_wallets", "payernt_wallet_transactions",
        "payernt_bank_accounts", "cart_items", "wishlist", "conversations",
        "messages", "payernt_messages", "notifications", "payernt_notifications",
        "payernt_audit_logs", "reviews", "support_tickets", "deliveries"
    ]
    
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                for table in tables:
                    try:
                        cursor.execute(f"SELECT * FROM {table}")
                        rows = cursor.fetchall()
                        backup_data["tables"][table] = rows
                        print(f"Backed up table '{table}': {len(rows)} records")
                    except Exception as te:
                        print(f"Table '{table}' backup notice: {te}")
                        backup_data["tables"][table] = []
        finally:
            conn.close()
            
    backup_file = os.path.join(backend_dir, "backups", f"db_backup_pre_shared_{int(time.time())}.json")
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, default=str, indent=2)
    print(f"Database backup saved successfully to {backup_file}")
    return backup_file

def ensure_unified_schema():
    print("\n=== STEP 2: Initializing and Verifying Unified Schema ===")
    init_db(force=True)
    init_payernt_tables()
    
    # Ensure account_type on users and payernt_accounts
    try:
        execute_query("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'pay₹ent'")
        execute_query("CREATE INDEX IF NOT EXISTS idx_users_account_email ON users (account_type, email)")
    except Exception as e:
        print(f"Users schema index notice: {e}")
        
    print("Unified schema verified and indexed.")

if __name__ == "__main__":
    backup_path = create_database_backup()
    ensure_unified_schema()
    print("\n=== SHARED DATABASE PREPARATION COMPLETE ===")
