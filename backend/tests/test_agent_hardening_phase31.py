"""
PAYENT AGENT — PHASE 3.1 SECURITY & PERSISTENCE HARDENING TEST SUITE
Validates:
1. Issue 1: Production database persistence safety (no silent mock fallback, fail-safe error, operational alerts).
2. Issue 2: JWT token revocation (blacklist enforcement, fail-closed in production, raw token protection).
3. Reconnection resilience and non-destructive persistence behavior.
4. Privacy and log hygiene during system and database failures.
"""

import time
import uuid
import pytest
from unittest.mock import MagicMock, patch

from auth import create_access_token
from agent_engine.context import (
    AgentSessionContext,
    create_guest_context,
    from_auth_token,
)
from agent_engine.persistence import (
    PersistenceUnavailableError,
    create_or_get_conversation,
    get_conversation,
    get_conversation_messages,
    is_db_available,
    reset_persistence_state,
    save_agent_message,
)
from agent_engine.tool_router import AgentToolRouter
from database import REVOKED_JTIS, revoke_token


@pytest.fixture(autouse=True)
def clean_persistence_and_revocation():
    """Ensure clean test state before and after each test."""
    reset_persistence_state()
    REVOKED_JTIS.clear()
    yield
    reset_persistence_state()
    REVOKED_JTIS.clear()


# ============================================================================
# ISSUE 2: JWT REVOCATION & TOKEN BLACKLIST TESTS
# ============================================================================

def test_valid_token_authenticated():
    """Verifies that an unrevoked, properly signed JWT yields an authenticated session."""
    token = create_access_token({
        "sub": "user_active@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })
    ctx = from_auth_token(token, "session_active_01")
    assert ctx.is_authenticated is True
    assert ctx.clean_email == "user_active@payent.test"
    assert ctx.role == "customer"
    assert "token_jti" in ctx.metadata
    # Ensure raw token is NEVER persisted in metadata
    assert "raw_token" not in ctx.metadata
    assert token not in str(ctx.metadata.values())


def test_revoked_token_in_revoked_jtis_rejected():
    """Verifies that a token whose JTI is added to REVOKED_JTIS is rejected."""
    token = create_access_token({
        "sub": "revoked_user@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })
    from auth import decode_access_token
    decoded = decode_access_token(token)
    jti = decoded.get("jti")
    assert jti is not None

    # Revoke the token
    REVOKED_JTIS.add(jti)

    ctx = from_auth_token(token, "session_revoked_01")
    assert ctx.is_authenticated is False
    assert ctx.role == "guest"
    assert ctx.clean_email == ""


def test_revoked_token_via_revoke_token_helper():
    """Verifies that database.revoke_token() causes subsequent from_auth_token() to reject the token."""
    token = create_access_token({
        "sub": "logged_out_renter@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })
    from auth import decode_access_token
    decoded = decode_access_token(token)
    jti = decoded.get("jti")

    revoke_token(jti, "logged_out_renter@payent.test", expires_at=int(time.time() + 3600))

    ctx = from_auth_token(token)
    assert ctx.is_authenticated is False
    assert ctx.role == "guest"


def test_missing_or_empty_jti_rejected():
    """Verifies that tokens missing a JTI cannot be authenticated."""
    with patch("agent_engine.context.decode_access_token") as mock_decode:
        mock_decode.return_value = {
            "sub": "no_jti_user@payent.test",
            "role": "customer",
            "type": "access"
            # Missing "jti"
        }
        ctx = from_auth_token("fake.jwt.token")
        assert ctx.is_authenticated is False
        assert ctx.role == "guest"


def test_expired_or_invalid_signature_rejected():
    """Verifies that expired tokens or corrupted signatures return guest context."""
    ctx_corrupt = from_auth_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupt.signature")
    assert ctx_corrupt.is_authenticated is False
    assert ctx_corrupt.role == "guest"

    ctx_none = from_auth_token(None)
    assert ctx_none.is_authenticated is False
    assert ctx_none.role == "guest"


def test_production_revocation_store_down_fails_closed():
    """
    SECURITY CRITICAL: In production (IS_PRODUCTION=True), if the revocation store
    is unreachable, authentication MUST fail closed to prevent revoked tokens from being honored.
    """
    token = create_access_token({
        "sub": "prod_user@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })

    with patch("agent_engine.context.IS_PRODUCTION", True):
        # Simulate database revocation store being down
        with patch("agent_engine.context.is_revocation_store_healthy", return_value=False):
            ctx = from_auth_token(token, "sess_prod_failclosed")
            # Must fail closed: restricted to guest context
            assert ctx.is_authenticated is False
            assert ctx.role == "guest"
            assert ctx.clean_email == ""


def test_production_revocation_store_healthy_succeeds():
    """In production, when the revocation store is verified healthy, valid tokens are accepted."""
    token = create_access_token({
        "sub": "prod_healthy_user@payent.test",
        "role": "customer",
        "account_type": "payrent"
    })

    with patch("agent_engine.context.IS_PRODUCTION", True):
        with patch("agent_engine.context.is_revocation_store_healthy", return_value=True):
            with patch("agent_engine.context.is_token_revoked", return_value=False):
                ctx = from_auth_token(token, "sess_prod_healthy")
                assert ctx.is_authenticated is True
                assert ctx.clean_email == "prod_healthy_user@payent.test"


# ============================================================================
# ISSUE 1: PERSISTENCE SAFETY & FAIL-SAFE ERROR HANDLING
# ============================================================================

def test_dev_mode_in_memory_fallback():
    """In development/test mode (IS_PRODUCTION=False), offline DB safely falls back to in-memory store."""
    ctx = AgentSessionContext(user_email="dev_user@payent.test", is_authenticated=True, session_id="dev_sess_1")
    
    with patch("agent_engine.persistence.IS_PRODUCTION", False):
        with patch("agent_engine.persistence.is_db_available", return_value=False):
            conv = create_or_get_conversation("dev_sess_1", ctx)
            assert conv is not None
            assert conv["user_email"] == "dev_user@payent.test"

            msg = save_agent_message(
                conversation_id=conv["id"],
                sender_type="user",
                content="Hello in dev mode",
                intent="GREETING"
            )
            assert msg is not None
            assert msg["content"] == "Hello in dev mode"

            history = get_conversation_messages(conv["id"], ctx)
            assert len(history) == 1
            assert history[0]["content"] == "Hello in dev mode"


def test_production_mode_no_silent_mock_fallback():
    """
    CRITICAL: In production (IS_PRODUCTION=True), persistence MUST NOT silently fallback
    to in-memory storage when the database is unavailable. Must raise PersistenceUnavailableError.
    """
    ctx = AgentSessionContext(user_email="prod_user@payent.test", is_authenticated=True, session_id="prod_sess_1")

    with patch("agent_engine.persistence.IS_PRODUCTION", True):
        with patch("agent_engine.persistence.is_db_available", return_value=False):
            with pytest.raises(PersistenceUnavailableError):
                create_or_get_conversation("prod_sess_1", ctx)


def test_production_save_message_raises_on_db_offline():
    """In production, saving a message raises PersistenceUnavailableError when DB is offline."""
    with patch("agent_engine.persistence.IS_PRODUCTION", True):
        with patch("agent_engine.persistence.is_db_available", return_value=False):
            with pytest.raises(PersistenceUnavailableError):
                save_agent_message("conv_dummy", "user", "Test message")


def test_production_db_failure_broadcasts_alert():
    """Verifies that DB failure in production dispatches an operational alert event via broadcast_admin_event_safe."""
    ctx = AgentSessionContext(user_email="alert_user@payent.test", is_authenticated=True, session_id="alert_sess_1")

    with patch("agent_engine.persistence.IS_PRODUCTION", True):
        with patch("agent_engine.persistence.is_db_available", return_value=False):
            with patch("database.broadcast_admin_event_safe") as mock_broadcast:
                with pytest.raises(PersistenceUnavailableError):
                    create_or_get_conversation("alert_sess_1", ctx)

                assert mock_broadcast.called
                event_name, event_payload = mock_broadcast.call_args[0]
                assert event_name == "agent.database_failure"
                assert event_payload.get("module") == "agent_persistence"
                assert event_payload.get("environment") == "production"
                # Ensure no user credentials or message content in alert
                assert "alert_user@payent.test" not in str(event_payload.values())


def test_router_handles_persistence_unavailable_controlled_response():
    """
    Verifies that AgentToolRouter gracefully returns a controlled service_unavailable
    response when persistence fails in production, without leaking internal details or crashing.
    """
    router = AgentToolRouter()
    ctx = AgentSessionContext(user_email="renter@payent.test", is_authenticated=True, session_id="sess_router_dbdown")

    with patch("agent_engine.tool_router.create_or_get_conversation", side_effect=PersistenceUnavailableError("DB Offline")):
        result = router.process_message(
            message="What is my booking status?",
            context=ctx,
            conversation_id="conv_router_test"
        )
        assert result is not None
        assert result.get("status") == "service_unavailable"
        assert result.get("persistence_error") is True
        assert "temporarily undergoing maintenance" in result.get("response_text", "")
        # Verify suggestions for graceful customer recovery
        assert "Try Again" in result.get("suggestions", [])
        assert "Contact Support" in result.get("suggestions", [])


def test_reconnection_recovery_preserves_data_without_duplication():
    """
    Verifies that when database connectivity is restored, persistence resumes
    lookup and creation without duplicating conversations or deleting existing records.
    """
    ctx = AgentSessionContext(user_email="reconnect_user@payent.test", is_authenticated=True, session_id="reconn_1")

    # In dev mode with mock DB or live DB:
    conv1 = create_or_get_conversation("reconn_1", ctx)
    conv1_id = conv1["id"]

    # Calling create_or_get_conversation again for the same user retrieves existing conversation
    conv2 = create_or_get_conversation("reconn_1", ctx)
    assert conv2["id"] == conv1_id, "Should reuse existing active conversation, not duplicate it"


def test_log_hygiene_on_persistence_failure(caplog):
    """
    Confirms that when persistence errors occur, logs do not leak user tokens,
    passwords, OTPs, or raw query statements.
    """
    import logging
    ctx = AgentSessionContext(user_email="secret_user@payent.test", is_authenticated=True, session_id="sess_log_check")

    with patch("agent_engine.persistence.IS_PRODUCTION", True):
        with patch("agent_engine.persistence.is_db_available", return_value=False):
            with caplog.at_level(logging.ERROR):
                try:
                    create_or_get_conversation("sess_log_check", ctx)
                except PersistenceUnavailableError:
                    pass

                log_text = caplog.text
                # Critical security checks: No email, tokens, passwords in logs
                assert "secret_user@payent.test" not in log_text
                assert "Bearer" not in log_text
                assert "password" not in log_text.lower()
                assert "otp" not in log_text.lower()
