"""
Payent - Local MySQL Health, Verification and Table Initialization Utility
Run this script from your terminal:
    cd C:\\payernt-main\\payernt-main\\backend
    python check_local_db.py
"""
import sys
import os

# Set up paths
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import config
import pymysql

def main():
    print("=" * 70)
    print("PAYENT - LOCAL MYSQL VERIFICATION & TABLE INITIALIZATION")
    print("=" * 70)
    print(f"Host:     {config.MYSQL_HOST}:{config.MYSQL_PORT}")
    print(f"User:     {config.MYSQL_USER}")
    print(f"Database: {config.MYSQL_DB}")
    print(f"SSL:      {config.MYSQL_SSL}")
    print("-" * 70)

    # Step 1: Connect to MySQL server and ensure database exists
    try:
        raw_conn = pymysql.connect(
            host=config.MYSQL_HOST,
            port=config.MYSQL_PORT,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            charset="utf8mb4"
        )
        with raw_conn.cursor() as cur:
            cur.execute("SELECT VERSION()")
            ver = cur.fetchone()[0]
            print(f"[OK] Connected to MySQL Server! Version: {ver}")
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{config.MYSQL_DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print(f"[OK] Database '{config.MYSQL_DB}' confirmed/created.")
        raw_conn.close()
    except Exception as e:
        print(f"[ERROR] Could not connect to MySQL server at {config.MYSQL_HOST}:{config.MYSQL_PORT}: {e}")
        sys.exit(1)

    # Step 2: Initialize tables using Payent's database engine
    print("-" * 70)
    print("Initializing Payent database tables via init_db(force=True)...")
    try:
        import database
        database.init_db(force=True)
        print("[OK] database.init_db() finished execution.")
    except Exception as e:
        print(f"[WARN] database.init_db() warning: {e}")

    # Step 3: Initialize Agent tables
    try:
        from agent_engine.persistence import init_agent_tables
        init_agent_tables()
        print("[OK] agent_engine.persistence tables initialized.")
    except Exception as e:
        print(f"[WARN] agent_engine.persistence notice: {e}")

    try:
        from agent_engine.retrieval.knowledge_manager import init_knowledge_tables
        init_knowledge_tables()
        print("[OK] agent_engine.retrieval knowledge tables initialized.")
    except Exception as e:
        print(f"[WARN] agent_engine.retrieval notice: {e}")

    # Step 4: Verify tables directly from MySQL
    print("-" * 70)
    try:
        conn = pymysql.connect(
            host=config.MYSQL_HOST,
            port=config.MYSQL_PORT,
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            database=config.MYSQL_DB,
            charset="utf8mb4"
        )
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            rows = cur.fetchall()
            tables = [r[0] for r in rows]

        conn.close()

        print(f"[RESULT] Found {len(tables)} tables in '{config.MYSQL_DB}':")
        for i, t in enumerate(sorted(tables), 1):
            print(f"  {i:2d}. {t}")

        if len(tables) > 0:
            print("-" * 70)
            print(f"[SUCCESS] ALL {len(tables)} TABLES ARE PRESENT IN LOCAL MYSQL!")
            print("You can now run local tests and start the backend:")
            print("    python -m uvicorn main:app --reload --port 8000")
            print("=" * 70)
        else:
            print("-" * 70)
            print("[ERROR] 0 tables found. Inspecting connection fallback...")
            print("=" * 70)
            sys.exit(1)

    except Exception as e:
        print(f"[ERROR] Failed to query tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
