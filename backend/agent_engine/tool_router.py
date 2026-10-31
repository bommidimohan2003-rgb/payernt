"""
PAYENT AGENT — DETERMINISTIC INTENT-TO-TOOL ROUTER
Routes classified user intents and extracted entities directly to allowlisted database tools.
Enforces authentication boundaries, builds deterministic contextual responses with real data,
and integrates the Phase 8 Hybrid Query Coordinator for unified GUIDE, LIVE_DB, and HYBRID synthesis.
"""

import logging
from typing import Any, Dict, List, Optional

from agent_engine.context import AgentSessionContext
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.intent_classifier import IntentClassifier
from agent_engine.persistence import (
    PersistenceUnavailableError,
    create_or_get_conversation,
    save_agent_message,
)

logger = logging.getLogger("payent.agent.tool_router")


class AgentToolRouter:
    """
    Coordinates between intent understanding, knowledge retrieval, and allowlisted database tools.
    Delegates deterministic turn processing to HybridQueryCoordinator and handles conversation persistence.
    """

    def __init__(
        self,
        classifier: Optional[IntentClassifier] = None,
        coordinator: Optional[HybridQueryCoordinator] = None,
    ):
        self.classifier = classifier or IntentClassifier()
        self.coordinator = coordinator or HybridQueryCoordinator(classifier=self.classifier)

    def process_message(
        self,
        message: str,
        context: AgentSessionContext,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a single conversational turn:
        1. Coordinates GUIDE, LIVE_DB, HYBRID, CLARIFICATION, or ESCALATION via HybridQueryCoordinator.
        2. Persists the exchange if a conversation thread is active.
        3. Enforces production persistence failure fail-closed safety.
        """
        result = self.coordinator.coordinate_query(
            message=message,
            context=context,
            conversation_id=conversation_id,
        )

        # --- CONVERSATION PERSISTENCE ---
        cid = conversation_id
        if conversation_id or context.session_id:
            try:
                conv = create_or_get_conversation(context.session_id, context)
                cid = conv.get("id")
                # Save user message
                save_agent_message(
                    conversation_id=cid,
                    sender_type="user",
                    content=message,
                    intent=result.get("intent"),
                    entities=result.get("entities"),
                )
                # Save agent response
                save_agent_message(
                    conversation_id=cid,
                    sender_type="agent",
                    content=result.get("response_text"),
                    intent=result.get("intent"),
                    tool_result=result.get("tool_result"),
                )
            except PersistenceUnavailableError:
                logger.error("Production persistence failure during agent turn: service unavailable")
                return {
                    "intent": result.get("intent"),
                    "confidence": result.get("confidence"),
                    "is_ambiguous": result.get("is_ambiguous", False),
                    "requires_auth": result.get("requires_auth", False),
                    "tool_called": result.get("tool_called"),
                    "tool_result": None,
                    "response_text": (
                        "Payent Agent service is temporarily undergoing maintenance or experiencing connection delays. "
                        "Please try again in a few moments, or reach out to Payent support if the issue persists."
                    ),
                    "suggestions": ["Try Again", "Contact Support", "Help"],
                    "entities": result.get("entities"),
                    "session_id": context.session_id,
                    "conversation_id": cid,
                    "authenticated": context.is_authenticated,
                    "persistence_error": True,
                    "status": "service_unavailable",
                }
            except Exception as e:
                logger.warning(f"Non-critical persistence notice: {type(e).__name__}")

        result["conversation_id"] = cid
        return result
