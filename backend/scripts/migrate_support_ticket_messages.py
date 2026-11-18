import sys
sys.path.insert(0, "backend")

from database import get_db_connection, execute_query, fetch_all, fetch_one
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("support_migration")

def migrate_support_ticket_messages():
    logger.info("Starting support_ticket_messages migration...")
    
    # 1. Create table in TiDB
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id VARCHAR(255) PRIMARY KEY,
        ticket_id VARCHAR(255) NOT NULL,
        sender_id VARCHAR(255) NOT NULL,
        sender_type VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255),
        message TEXT NOT NULL,
        created_at VARCHAR(100) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        INDEX idx_stm_ticket (ticket_id),
        INDEX idx_stm_created (ticket_id, created_at),
        INDEX idx_stm_unread (ticket_id, is_read)
    );
    """
    conn = get_db_connection()
    if not conn:
        logger.error("Could not connect to TiDB Cloud.")
        return False
        
    try:
        with conn.cursor() as cursor:
            cursor.execute(create_table_sql)
            conn.commit()
            logger.info("Table support_ticket_messages ensured in TiDB.")
            
            # 2. Check existing tickets and backfill messages
            cursor.execute("SELECT id, user_email, user_name, messages, created_at FROM support_tickets")
            tickets = cursor.fetchall()
            logger.info(f"Found {len(tickets)} tickets in support_tickets.")
            
            backfilled_count = 0
            for t in tickets:
                t_id = t["id"]
                u_email = t.get("user_email") or "unknown"
                raw_msgs = t.get("messages")
                if not raw_msgs:
                    continue
                try:
                    msgs = json.loads(raw_msgs) if isinstance(raw_msgs, str) else raw_msgs
                except Exception as ex:
                    logger.warning(f"Could not parse messages for {t_id}: {ex}")
                    continue
                    
                if not isinstance(msgs, list):
                    continue
                    
                for idx, m in enumerate(msgs):
                    m_id = m.get("id") or f"msg-{t_id}-{idx}"
                    sender_type = (m.get("senderType") or m.get("sender_type") or ("admin" if m.get("sender") == "admin" else "user")).lower()
                    sender_id = u_email if sender_type == "user" else "admin"
                    sender_name = m.get("sender") or (t.get("user_name") if sender_type == "user" else "paYent Support")
                    content = m.get("content") or m.get("message") or ""
                    created_at = m.get("createdAt") or m.get("timestamp") or t.get("created_at") or "2026-11-18T00:00:00Z"
                    is_read = bool(m.get("read") or m.get("is_read") or False)
                    
                    # Check if already in support_ticket_messages
                    cursor.execute("SELECT id FROM support_ticket_messages WHERE id = %s", (m_id,))
                    if cursor.fetchone():
                        continue
                        
                    cursor.execute("""
                        INSERT INTO support_ticket_messages (id, ticket_id, sender_id, sender_type, sender_name, message, created_at, is_read)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (m_id, t_id, sender_id, sender_type, sender_name, content, created_at, is_read))
                    backfilled_count += 1
                    
            conn.commit()
            logger.info(f"Migration complete. Backfilled {backfilled_count} messages into support_ticket_messages.")
            
            # Verify TICK-1794999087148 messages
            cursor.execute("SELECT * FROM support_ticket_messages WHERE ticket_id = %s", ("TICK-1794999087148",))
            verified = cursor.fetchall()
            logger.info(f"Verified messages for TICK-1794999087148: {len(verified)}")
            for v in verified:
                logger.info(f"  - Message {v['id']} ({v['sender_type']}): {v['message'][:60]}...")
                
            return True
    except Exception as e:
        logger.error(f"Migration error: {e}", exc_info=True)
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_support_ticket_messages()
    sys.exit(0 if success else 1)
