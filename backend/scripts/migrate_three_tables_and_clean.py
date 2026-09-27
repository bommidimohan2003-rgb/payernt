import sys
import os
import pymysql

# Ensure backend dir is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_db_connection, init_db, execute_query, fetch_all, fetch_one
from payernt_database import init_payernt_tables

def run_migration_and_cleanup():
    print("============================================================")
    print("STEP 1: Initializing 3 Dedicated Account Tables")
    print("============================================================")

    # 1. Admin accounts table
    execute_query("""
        CREATE TABLE IF NOT EXISTS admin_accounts (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'admin',
            avatar LONGTEXT NULL,
            address VARCHAR(500) NULL,
            city VARCHAR(100) NULL,
            pincode VARCHAR(20) NULL,
            status VARCHAR(50) DEFAULT 'active',
            verified BOOLEAN DEFAULT TRUE,
            created_at VARCHAR(100) NOT NULL,
            last_login_at VARCHAR(100) NULL,
            INDEX idx_admin_email (email),
            INDEX idx_admin_role (role)
        )
    """)
    print("Table 'admin_accounts' ensured.")

    # 2. Payrent accounts table (Customer / Renter)
    execute_query("""
        CREATE TABLE IF NOT EXISTS payrent_accounts (
            email VARCHAR(255) PRIMARY KEY,
            phone VARCHAR(50) NOT NULL,
            password_hash VARCHAR(255) NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'customer',
            account_type VARCHAR(50) DEFAULT 'pay₹ent',
            pan_number VARCHAR(20) NULL,
            status VARCHAR(50) DEFAULT 'active',
            verified BOOLEAN DEFAULT TRUE,
            avatar LONGTEXT NULL,
            profile_photo_url LONGTEXT NULL,
            address VARCHAR(500) NULL,
            city VARCHAR(100) NULL,
            state VARCHAR(100) NULL,
            pincode VARCHAR(20) NULL,
            occupation VARCHAR(255) NULL,
            bio TEXT NULL,
            country VARCHAR(100) DEFAULT 'India',
            person_id VARCHAR(255) NULL,
            created_at VARCHAR(100) NOT NULL,
            last_login_at VARCHAR(100) NULL,
            updated_at VARCHAR(100) NULL,
            INDEX idx_payrent_phone (phone),
            INDEX idx_payrent_pan (pan_number),
            INDEX idx_payrent_person_id (person_id)
        )
    """)
    print("Table 'payrent_accounts' ensured.")

    # 3. Payernt accounts table (Vendor / Lender)
    init_payernt_tables()
    print("Table 'payernt_accounts' ensured.")

    print("\n============================================================")
    print("STEP 2: Cleaning All Fake / Test Users from Database")
    print("============================================================")

    # Clean fake users from 'users' table (keep only real admin or real users)
    execute_query("""
        DELETE FROM users 
        WHERE email LIKE '%%@test.com' 
           OR email LIKE '%%@example.com'
           OR email LIKE '%%fake%%'
           OR email LIKE 'shared_%%@payent.io'
           OR email LIKE 'customer_%%'
           OR email LIKE 'renter_%%'
           OR email LIKE 'both_%%'
           OR email LIKE 'lender_%%'
           OR email LIKE 'vendor_%%'
           OR email IN ('john@example.com', 'jane@example.com', 'admin@example.com', 'sarah@example.com', 'mike@example.com', 'demo@payent.com')
    """)

    # Clean fake users from 'payernt_accounts' table
    execute_query("""
        DELETE FROM payernt_accounts 
        WHERE email LIKE '%%@test.com' 
           OR email LIKE '%%@example.com'
           OR email LIKE '%%fake%%'
           OR email LIKE 'shared_%%@payent.io'
           OR email LIKE 'vendor_%%@payent.io'
           OR email LIKE 'customer_%%'
           OR email LIKE 'renter_%%'
           OR email LIKE 'both_%%'
           OR email LIKE 'lender_%%'
           OR email LIKE 'test_%%'
           OR email IN ('john@example.com', 'jane@example.com', 'admin@example.com')
    """)

    # Clean fake users from 'payrent_accounts'
    execute_query("""
        DELETE FROM payrent_accounts 
        WHERE email LIKE '%%@test.com' 
           OR email LIKE '%%@example.com'
           OR email LIKE '%%fake%%'
           OR email LIKE 'shared_%%@payent.io'
           OR email LIKE 'vendor_%%@payent.io'
           OR email LIKE 'customer_%%'
           OR email LIKE 'renter_%%'
           OR email LIKE 'both_%%'
           OR email LIKE 'lender_%%'
           OR email LIKE 'test_%%'
    """)

    # Clean test mobile verifications
    execute_query("""
        DELETE FROM mobile_verifications 
        WHERE phone LIKE '%%0000%%' 
           OR phone LIKE '%%123456%%'
           OR token LIKE '%%test%%'
    """)

    print("\n============================================================")
    print("STEP 3: Populating Real Accounts into Dedicated Tables")
    print("============================================================")

    # Real Admin account: bommidimohan2003@gmail.com
    admin_hash = "$2b$12$XbPCF4zGTgcZs6Z9afnXVuenqYPwmRIjLRs8PwXT7KZy99U8W2nE2"
    execute_query("""
        INSERT INTO admin_accounts (
            id, email, full_name, phone, password_hash, role, address, city, pincode, status, verified, created_at, last_login_at
        ) VALUES (
            'ADMIN_BOMMIDI_MOHAN_001', 'bommidimohan2003@gmail.com', 'Bommidi Mohan', '+91 8810519885',
            %s, 'admin', '123 Innovation Way', 'Bangalore', '560001', 'active', TRUE, NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE 
            full_name = 'Bommidi Mohan',
            phone = '+91 8810519885',
            role = 'admin',
            status = 'active',
            verified = TRUE
    """, (admin_hash,))
    print("Populated admin_accounts with real Admin 'bommidimohan2003@gmail.com'.")

    # Sync real customer accounts from users table to payrent_accounts
    execute_query("""
        INSERT INTO payrent_accounts (
            email, phone, password_hash, full_name, role, account_type, pan_number, status, verified, address, city, pincode, person_id, created_at
        )
        SELECT email, phone, password_hash, full_name, role, 'pay₹ent', pan_number, status, verified, address, city, pincode, person_id, created_at
        FROM users
        WHERE LOWER(role) NOT IN ('admin', 'superadmin')
        ON DUPLICATE KEY UPDATE 
            full_name = VALUES(full_name),
            phone = VALUES(phone),
            status = VALUES(status)
    """)
    print("Synchronized payrent_accounts.")

    print("\n============================================================")
    print("STEP 4: Verification of Clean State in Database")
    print("============================================================")
    admins = fetch_all("SELECT email, full_name, role, status FROM admin_accounts")
    print(f"1. ADMIN TABLE (admin_accounts) [{len(admins)} records]:")
    for a in admins:
        print("  -", a)

    vendors = fetch_all("SELECT email, name, account_type, status FROM payernt_accounts")
    print(f"\n2. PAYERNT TABLE (payernt_accounts) [{len(vendors)} records]:")
    for v in vendors:
        print("  -", v)

    customers = fetch_all("SELECT email, full_name, account_type, status FROM payrent_accounts")
    print(f"\n3. PAYRENT TABLE (payrent_accounts) [{len(customers)} records]:")
    for c in customers:
        print("  -", c)

if __name__ == "__main__":
    run_migration_and_cleanup()
