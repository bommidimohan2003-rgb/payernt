"""
Set-based high-performance migration script for Role-Based Notification Separation.
Applies schema columns and indexes, then executes atomic bulk updates over WAN.
"""
import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import execute_query, fetch_all, add_column_safely, add_index_safely

def run_set_based_migration():
    print("=" * 60, flush=True)
    print("STARTING SET-BASED NOTIFICATION MIGRATION", flush=True)
    print("=" * 60, flush=True)

    # 1. Add audience_role to notifications
    print("[1] Ensuring audience_role column in `notifications`...", flush=True)
    add_column_safely("notifications", "audience_role VARCHAR(20) DEFAULT 'PAYRENT'")
    add_index_safely("notifications", "idx_notif_audience_role", "user_email, audience_role, is_read")

    # 2. Add audience_role to payernt_notifications
    print("[2] Ensuring audience_role column in `payernt_notifications`...", flush=True)
    try:
        from payernt_database import _add_pn_col
        _add_pn_col("audience_role VARCHAR(20) DEFAULT 'PAYERNT'")
    except Exception:
        add_column_safely("payernt_notifications", "audience_role VARCHAR(20) DEFAULT 'PAYERNT'")
    add_index_safely("payernt_notifications", "idx_pn_audience_role", "owner_id, audience_role, is_read")

    # 3. Bulk classify notifications table
    print("[3] Running bulk classification for `notifications` table...", flush=True)

    # Default all to PAYRENT
    execute_query("UPDATE notifications SET audience_role = 'PAYRENT' WHERE audience_role IS NULL OR audience_role = ''")

    # Mark COMMON
    execute_query("""
        UPDATE notifications 
        SET audience_role = 'COMMON' 
        WHERE type = 'security' 
           OR title IN (
               'Password Reset Request',
               'Account Suspended ⚠️',
               'Account Reactivated ✅',
               'Security Alert',
               'Account Approved! 🎉'
           )
    """)

    # Mark PAYERNT
    execute_query("""
        UPDATE notifications
        SET audience_role = 'PAYERNT'
        WHERE link LIKE '%/payernt%'
           OR link LIKE '%/lender%'
           OR title IN (
               'New Rental Booking Received 📦',
               'New Booking Request Received 📦',
               'Booking Cancelled by Renter ⚠️',
               'Booking Cancellation Confirmed 🚫',
               'Gear Received Back ✅',
               'Inspection in Progress 🔍',
               'Product Approved! 🎉',
               'New Listing Submitted for Review ⏳',
               'KYC Verification Approved (AADHAAR)',
               'Listing Suspended ⚠️',
               'Listing Restored ✅',
               'Revision Requested for Product 📝',
               'Withdrawal Processed ✅',
               'Withdrawal Rejected',
               'Wallet Balance Adjusted',
               'Rental Completed & Earnings Credited 💰',
               'Rental Overdue Alert ⚠️',
               'Marked Ready for Pickup 📦',
               'Product Prepared for Delivery 📦'
           )
           OR LOWER(message) LIKE '%%you confirmed%%'
           OR LOWER(message) LIKE '%%new rental request%%'
           OR LOWER(message) LIKE '%%withdrawal%%'
           OR LOWER(message) LIKE '%%wallet was adjusted%%'
           OR LOWER(message) LIKE '%%your listing%%'
           OR LOWER(message) LIKE '%%approved rental price%%'
    """)

    # 4. Bulk classify payernt_notifications table
    print("[4] Running bulk classification for `payernt_notifications` table...", flush=True)

    # Default all to PAYERNT
    execute_query("UPDATE payernt_notifications SET audience_role = 'PAYERNT' WHERE audience_role IS NULL OR audience_role = ''")

    # Mark cross-synced renter notices in payernt_notifications as PAYRENT so they don't leak into lender panel
    execute_query("""
        UPDATE payernt_notifications
        SET audience_role = 'PAYRENT'
        WHERE title IN (
            'Booking Request Submitted 🎉',
            'Booking Cancelled 🚫',
            'Item Handed Back to Owner 🤝',
            'Rental Completed! 🌟',
            'Rental Active! Enjoy Your Tech Gear ⚡',
            'KYC Verification Approved (PAN)',
            'Gear Ready for Pickup 📦',
            'Rental In Progress ⏱️',
            'Rental Started & Pickup Confirmed ⏱️',
            'Return Initiated 🔄',
            'Rental Overdue Notice ⚠️'
        )
        OR LOWER(message) LIKE '%%enjoy your tech gear%%'
        OR LOWER(message) LIKE '%%your reservation request%%'
    """)

    # 5. Summarize
    n_stats = fetch_all("SELECT audience_role, COUNT(*) as c FROM notifications GROUP BY audience_role")
    pn_stats = fetch_all("SELECT audience_role, COUNT(*) as c FROM payernt_notifications GROUP BY audience_role")

    print(f"\nNotifications table by audience_role: {n_stats}", flush=True)
    print(f"Payernt notifications table by audience_role: {pn_stats}", flush=True)
    print("MIGRATION FINISHED SUCCESSFULLY!", flush=True)

if __name__ == "__main__":
    run_set_based_migration()
