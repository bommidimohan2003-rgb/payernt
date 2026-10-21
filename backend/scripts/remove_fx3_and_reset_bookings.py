import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_db_connection

def verify_and_clean_products():
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Could not connect to TiDB Cloud database.")
        sys.exit(1)

    try:
        with conn.cursor() as cur:
            # 1. custom_products
            cur.execute("SELECT id, title, user_email FROM custom_products")
            all_cp = cur.fetchall()
            print("Current custom_products:", all_cp)
            
            cur.execute("DELETE FROM custom_products WHERE title LIKE '%FX3%' OR id LIKE '%FX3%' OR id = 'prod-1790474939846-841'")
            deleted_cp = cur.rowcount
            print(f"Deleted {deleted_cp} records from custom_products.")

            # 2. payernt_products
            cur.execute("SELECT id, title, name, owner_email FROM payernt_products")
            all_pp = cur.fetchall()
            print("Current payernt_products:", all_pp)
            
            cur.execute("DELETE FROM payernt_products WHERE title LIKE '%FX3%' OR name LIKE '%FX3%' OR id = 'prod-1790474939846-841'")
            deleted_pp = cur.rowcount
            print(f"Deleted {deleted_pp} records from payernt_products.")

            # 3. orders / bookings
            cur.execute("DELETE FROM orders")
            deleted_orders = cur.rowcount
            print(f"Deleted {deleted_orders} records from orders.")

            # 4. related booking tables
            for tbl in ["rental_security", "deliveries", "booking_cancellations"]:
                try:
                    cur.execute(f"DELETE FROM {tbl}")
                    print(f"Cleared {tbl}.")
                except Exception as ex:
                    print(f"Note on {tbl}: {ex}")

            conn.commit()
            print("[SUCCESS] All FX3 products removed and bookings reset!")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR]: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    verify_and_clean_products()
