import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from database import fetch_one, execute_query

def repair_ticket():
    ticket_id = "TICK-1794999087148"
    ticket = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (ticket_id,))
    if not ticket:
        print(f"Error: Ticket {ticket_id} not found in database.")
        return False

    created_at = ticket.get("created_at")
    user_name = ticket.get("user_name") or "mohan bommidi"
    conversation_id = "conv_ag_4fd0576cbcb1"

    formatted_desc = (
        "Original user inquiry:\nCan you teleport me to Mars\n\n"
        "Escalation reason:\nThe AI Agent could not resolve the user's request.\n\n"
        "Escalation requested:\nYes."
    )

    conv_context = [
        {
            "sender": user_name,
            "senderType": "user",
            "text": "Can you teleport me to Mars",
            "timestamp": "2026-11-18T10:51:21.762530+00:00"
        },
        {
            "sender": "Payent Agent",
            "senderType": "assistant",
            "text": "I'm sorry, I couldn't understand your question. Would you like me to connect you with our human support team?",
            "timestamp": "2026-11-18T10:51:22.917198+00:00"
        },
        {
            "sender": user_name,
            "senderType": "user",
            "text": "Yes, connect me",
            "timestamp": "2026-11-18T10:51:28.062124+00:00"
        }
    ]

    updated_msgs = [
        {
            "id": "msg-1794999087148",
            "sender": user_name,
            "senderType": "user",
            "content": formatted_desc,
            "message": formatted_desc,
            "originalInquiry": "Can you teleport me to Mars",
            "conversationContext": conv_context,
            "bookingId": None,
            "category": "General Help",
            "conversationId": conversation_id,
            "source": "payent_agent",
            "timestamp": created_at,
            "createdAt": created_at
        }
    ]

    execute_query("""
        UPDATE support_tickets 
        SET messages = %s, updated_at = %s 
        WHERE id = %s
    """, (json.dumps(updated_msgs), created_at, ticket_id))

    repaired = fetch_one("SELECT * FROM support_tickets WHERE id = %s", (ticket_id,))
    print(f"Ticket {ticket_id} repaired successfully:")
    print("User:", repaired.get("user_name"))
    print("Email:", repaired.get("user_email"))
    print("Messages JSON:", repaired.get("messages"))
    return True

if __name__ == "__main__":
    repair_ticket()
