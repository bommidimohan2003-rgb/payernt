import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app, create_access_token
from database import get_db_connection

def main():
    print("=" * 80)
    print("LIVE AUDIT: ADMIN SECTIONS -> FRONTEND SERVICES -> BACKEND -> TIDB CLOUD")
    print("=" * 80)
    
    # 1. Verify TiDB Cloud active connection
    conn = get_db_connection()
    if not conn:
        print("FAILED: Could not obtain connection from TiDB Cloud pool!")
        return
    with conn.cursor() as cur:
        cur.execute("SELECT VERSION() as v, DATABASE() as db")
        info = cur.fetchone()
        print(f"TiDB Engine Version: {info['v']}")
        print(f"TiDB Database Name:   {info['db']}")
    conn.close()
    
    # 2. Mint test admin token for bommidimohan2003@gmail.com
    admin_token = create_access_token(
        data={
            "sub": "bommidimohan2003@gmail.com",
            "email": "bommidimohan2003@gmail.com",
            "role": "admin",
            "account_type": "admin"
        }
    )
    headers = {"Authorization": f"Bearer {admin_token}"}
    client = TestClient(app)
    
    # 3. Test list of admin endpoints mapped to each Admin Page
    admin_sections = [
        ("Dashboard (Stats)", "/api/admin/dashboard/stats", "Dashboard.tsx"),
        ("Dashboard (Charts)", "/api/admin/dashboard/charts?days=30", "Dashboard.tsx"),
        ("Dashboard (Activity)", "/api/admin/dashboard/activities", "Dashboard.tsx"),
        ("Analytics (Funnel)", "/api/admin/dashboard/funnel?days=30", "Analytics.tsx"),
        ("Bookings / Orders", "/api/admin/bookings", "Bookings.tsx"),
        ("Products / Inventory", "/api/admin/products", "Products.tsx"),
        ("Categories", "/api/admin/categories", "Categories.tsx"),
        ("Users (All Accounts)", "/api/admin/users", "Users.tsx"),
        ("Users (Vendors/Lenders)", "/api/admin/users/payernt", "Users.tsx"),
        ("Users (Renters/Customers)", "/api/admin/users/payrent", "Users.tsx"),
        ("Payments & Invoices", "/api/admin/payments", "Payments.tsx"),
        ("Reviews & Moderation", "/api/admin/reviews", "Reviews.tsx"),
        ("Support Tickets", "/api/admin/support", "Support.tsx"),
        ("Reports & Flagged", "/api/admin/reports", "Reports.tsx"),
        ("Activity Logs", "/api/admin/activity-logs", "ActivityLogs.tsx"),
        ("Audit Logs", "/api/admin/audit-logs", "ActivityLogs.tsx"),
        ("Notifications", "/api/admin/notifications", "Notifications.tsx"),
        ("Agents & Staff", "/api/admin/agents", "Agents.tsx"),
        ("Pin Verification History", "/api/admin/verify-pin/history", "PinVerification.tsx"),
        ("Settings", "/api/admin/settings", "Settings.tsx"),
        ("Admin Profile (Me)", "/api/admin/auth/me", "Profile.tsx"),
        ("Backend Health Check", "/api/admin/health", "Dashboard.tsx"),
    ]
    
    print("\n" + "-" * 80)
    print(f"{'Section / Page':<28} | {'HTTP Endpoint':<32} | {'Status':<6} | {'Items/Records':<12}")
    print("-" * 80)
    
    passed = 0
    failed = 0
    
    for section_name, path, page_name in admin_sections:
        try:
            resp = client.get(path, headers=headers)
            status_code = resp.status_code
            if status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    count_str = f"{len(data)} items"
                elif isinstance(data, dict):
                    if "items" in data:
                        count_str = f"{len(data['items'])} items"
                    elif "stats" in data:
                        count_str = "Stats dict"
                    elif "status" in data:
                        count_str = f"Status: {data['status']}"
                    else:
                        count_str = f"{len(data)} keys"
                else:
                    count_str = "OK"
                print(f"{section_name:<28} | {path:<32} | {status_code}   | {count_str:<12}")
                passed += 1
            else:
                print(f"{section_name:<28} | {path:<32} | {status_code}   | ERROR: {resp.text[:40]}")
                failed += 1
        except Exception as e:
            print(f"{section_name:<28} | {path:<32} | EXCP   | {str(e)[:40]}")
            failed += 1
            
    print("-" * 80)
    print(f"Audit Complete: {passed} PASSED, {failed} FAILED out of {len(admin_sections)} sections checked.")
    print("=" * 80)

if __name__ == "__main__":
    main()
