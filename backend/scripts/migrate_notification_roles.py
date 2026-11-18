"""
Migration script for Role-Based Notification Separation.
Adds audience_role column to `notifications` and `payernt_notifications` tables,
creates indexes, and backfills all existing records with high precision.
"""
import sys
import os

# Ensure backend directory is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import execute_query, fetch_all, add_column_safely, add_index_safely

def run_migration():
    print("=" * 60)
    print("STARTING ROLE-BASED NOTIFICATION MIGRATION")
    print("=" * 60)

    # 1. Add audience_role to notifications
    print("\n[Step 1] Ensuring audience_role column in `notifications` table...")
    add_column_safely("notifications", "audience_role VARCHAR(20) DEFAULT 'PAYRENT'")
    add_index_safely("notifications", "idx_notif_audience_role", "user_email, audience_role, is_read")

    # 2. Add audience_role to payernt_notifications
    print("\n[Step 2] Ensuring audience_role column in `payernt_notifications` table...")
    try:
        from payernt_database import _add_pn_col
        _add_pn_col("audience_role VARCHAR(20) DEFAULT 'PAYERNT'")
    except Exception:
        add_column_safely("payernt_notifications", "audience_role VARCHAR(20) DEFAULT 'PAYERNT'")
    add_index_safely("payernt_notifications", "idx_pn_audience_role", "owner_id, audience_role, is_read")

    # 3. Classify and backfill `notifications` table
    print("\n[Step 3] Inspecting and backfilling `notifications` table...")
    all_notifs = fetch_all("SELECT id, user_email, title, message, link, type FROM notifications")
    print(f"Total rows in `notifications`: {len(all_notifs)}")

    payernt_titles = {
        "New Rental Booking Received 📦",
        "New Booking Request Received 📦",
        "Booking Cancelled by Renter ⚠️",
        "Booking Cancellation Confirmed 🚫",
        "Gear Received Back ✅",
        "Inspection in Progress 🔍",
        "Product Approved! 🎉",
        "New Listing Submitted for Review ⏳",
        "KYC Verification Approved (AADHAAR)",
        "Listing Suspended ⚠️",
        "Listing Restored ✅",
        "Revision Requested for Product 📝",
        "Withdrawal Processed ✅",
        "Withdrawal Rejected",
        "Wallet Balance Adjusted",
        "Rental Completed & Earnings Credited 💰",
        "Rental Overdue Alert ⚠️",
        "Marked Ready for Pickup 📦",
        "Product Prepared for Delivery 📦",
    }

    common_titles = {
        "Password Reset Request",
        "Account Suspended ⚠️",
        "Account Reactivated ✅",
        "Security Alert",
        "Account Approved! 🎉"
    }

    counts = {"PAYRENT": 0, "PAYERNT": 0, "COMMON": 0}

    for n in all_notifs:
        nid = n["id"]
        title = (n.get("title") or "").strip()
        msg = (n.get("message") or "").strip().lower()
        link = (n.get("link") or "").strip().lower()
        ntype = (n.get("type") or "").strip().lower()

        # Classification logic
        role = "PAYRENT"

        if link.startswith("/payernt") or "/lender" in link or title in payernt_titles:
            role = "PAYERNT"
        elif ntype == "security" or title in common_titles:
            role = "COMMON"
        elif "you confirmed" in msg or "new rental request" in msg or "withdrawal" in msg or "wallet" in msg:
            role = "PAYERNT"
        elif "your listing" in msg or "approved rental price" in msg:
            role = "PAYERNT"
        elif "received back" in title.lower():
            role = "PAYERNT"
        elif link.startswith("/orders") or "/browse" in link or "/kyc" in link:
            role = "PAYRENT"
        elif title.startswith("Booking Request Submitted") or "enjoy your tech gear" in msg or "rental reservation" in msg:
            role = "PAYRENT"

        execute_query("UPDATE notifications SET audience_role = %s WHERE id = %s", (role, nid))
        counts[role] += 1

    print(f"Notifications backfill summary: {counts}")

    # 4. Classify and backfill `payernt_notifications` table
    print("\n[Step 4] Inspecting and backfilling `payernt_notifications` table...")
    payernt_notifs = fetch_all("SELECT id, owner_id, title, message, action_route, type FROM payernt_notifications")
    print(f"Total rows in `payernt_notifications`: {len(payernt_notifs)}")

    p_counts = {"PAYRENT": 0, "PAYERNT": 0, "COMMON": 0}

    # Cross-synced renter notification titles that got copied into payernt_notifications historically
    renter_cross_sync_titles = {
        "Booking Request Submitted 🎉",
        "Booking Cancelled 🚫",
        "Item Handed Back to Owner 🤝",
        "Rental Completed! 🌟",
        "Rental Active! Enjoy Your Tech Gear ⚡",
        "KYC Verification Approved (PAN)",
        "Gear Ready for Pickup 📦",
        "Rental In Progress ⏱️",
        "Rental Started & Pickup Confirmed ⏱️",
        "Return Initiated 🔄",
        "Rental Overdue Notice ⚠️"
    }

    for pn in payernt_notifs:
        pn_id = pn["id"]
        title = (pn.get("title") or "").strip()
        msg = (pn.get("message") or "").strip().lower()
        route = (pn.get("action_route") or "").strip().lower()
        ntype = (pn.get("type") or "").strip().lower()

        role = "PAYERNT"

        if title in renter_cross_sync_titles or "enjoy your tech gear" in msg or "your reservation request" in msg:
            role = "PAYRENT"
        elif ntype == "security" or title in common_titles:
            role = "COMMON"
        else:
            role = "PAYERNT"

        execute_query("UPDATE payernt_notifications SET audience_role = %s WHERE id = %s", (role, pn_id))
        p_counts[role] += 1

    print(f"Payernt notifications backfill summary: {p_counts}")
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    run_migration()
