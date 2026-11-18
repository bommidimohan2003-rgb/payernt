import sys
sys.path.insert(0, "backend")

from database import (
    get_db_connection,
    fetch_one,
    fetch_all,
    save_support_ticket_message,
    get_support_ticket_messages,
    mark_support_ticket_messages_read,
    get_user_unread_support_count,
    create_notification,
)
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_reply")

def verify_ticket_1794999087148():
    ticket_id = "TICK-1794999087148"
    logger.info(f"--- 1. Retrieving ticket {ticket_id} from TiDB ---")
    ticket = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (ticket_id,))
    assert ticket is not None, f"Ticket {ticket_id} not found in TiDB!"
    logger.info(f"Ticket found: ID={ticket['id']}, User={ticket['user_name']} ({ticket['user_email']}), Status={ticket['status']}")

    logger.info(f"--- 2. Confirming original inquiry remains intact ---")
    raw_msgs = ticket.get("messages")
    msgs = json.loads(raw_msgs) if isinstance(raw_msgs, str) else (raw_msgs or [])
    first_msg = msgs[0] if msgs else {}
    first_content = first_msg.get("content") or first_msg.get("message") or ""
    assert "Can you teleport me to Mars" in first_content, f"Original inquiry missing: {first_content}"
    logger.info(f"Original inquiry intact: '{first_content[:80]}...'")

    logger.info(f"--- 3. Sending test admin reply ---")
    admin_reply_text = "We are checking your request. Our team will update you shortly."
    saved = save_support_ticket_message(
        ticket_id=ticket_id,
        sender_id="admin@payent.com",
        sender_type="admin",
        sender_name="paYent Support",
        message=admin_reply_text,
        is_read=False,
    )
    assert saved is not None
    logger.info(f"Admin reply saved with ID: {saved['id']}")

    # Create notification for ticket owner
    notif = create_notification(
        user_email=ticket["user_email"],
        title=f"Support Reply: #{ticket_id}",
        message=f"Our support team replied: \"{admin_reply_text}\"",
        type="support",
        link=f"/support?id={ticket_id}",
        event_key=f"support_reply_{ticket_id}_{saved['id']}"
    )
    logger.info(f"User notification created: ID={notif.get('id')}, Link={notif.get('link')}")

    logger.info(f"--- 4. Confirming reply is persisted in TiDB ---")
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM support_ticket_messages WHERE id = %s", (saved["id"],))
        db_msg = cursor.fetchone()
        assert db_msg is not None, "Message not found in support_ticket_messages table!"
        assert db_msg["ticket_id"] == ticket_id
        assert db_msg["message"] == admin_reply_text
        assert db_msg["sender_type"] == "admin"
        assert db_msg["is_read"] in (0, False)
        logger.info(f"Verified in support_ticket_messages table: ID={db_msg['id']}, Sender={db_msg['sender_name']}")
    conn.close()

    logger.info(f"--- 5. Retrieving thread through get_support_ticket_messages ---")
    thread = get_support_ticket_messages(ticket_id, include_internal=False)
    assert len(thread) >= 2, f"Expected at least 2 messages, got {len(thread)}"
    logger.info(f"Retrieved {len(thread)} messages in chronological order:")
    for i, m in enumerate(thread):
        logger.info(f"  [{i+1}] {m['sender']} ({m['senderType']}): {m['message'][:60]}... (read={m.get('isRead')})")

    assert thread[-1]["id"] == saved["id"]
    assert thread[-1]["senderType"] == "admin"
    assert thread[-1]["message"] == admin_reply_text

    logger.info(f"--- 6. Verifying unread count before mark-as-read ---")
    unread_before = get_user_unread_support_count(ticket["user_email"])
    logger.info(f"Unread support count for {ticket['user_email']}: {unread_before}")
    assert unread_before >= 1

    logger.info(f"--- 7. Simulating user opening ticket (mark-as-read) ---")
    mark_support_ticket_messages_read(ticket_id, reader_type="user")
    unread_after = get_user_unread_support_count(ticket["user_email"])
    logger.info(f"Unread count after mark-as-read: {unread_after}")
    assert unread_after == 0

    thread_after = get_support_ticket_messages(ticket_id, include_internal=False)
    admin_msgs = [m for m in thread_after if m["senderType"] == "admin"]
    assert all(m.get("isRead") or m.get("read") for m in admin_msgs), "Admin messages not marked read!"
    logger.info("All admin messages successfully marked as read.")

    logger.info("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY FOR TICK-1794999087148!")
    return True

if __name__ == "__main__":
    success = verify_ticket_1794999087148()
    sys.exit(0 if success else 1)
