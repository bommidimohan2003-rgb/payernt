"""
PAYENT AGENT — PHASE 8.5 PRODUCTION DATABASE SAFETY & INTEGRITY AUDIT SUITE

Validates that in production (IS_PRODUCTION=True):
1. Database connection failures or pool exhaustion NEVER return mock account records:
   - MOCK_ORDERS
   - MOCK_USERS
   - MOCK_KYC_VERIFICATIONS
   - MOCK_DELIVERIES
   - MOCK_SUPPORT_TICKETS
   - MOCK_KNOWLEDGE_ENTRIES
   - MOCK_CUSTOM_PRODUCTS
2. Database failures are NOT silently converted into "record not found".
3. Safe temporary-unavailable responses ("service_unavailable", database_error=True)
   are returned gracefully to customers with recovery options ("Try Again", "Contact Support").
4. Connection recovery restores service cleanly without connection leaks or orphaned handles.
5. In development/testing (IS_PRODUCTION=False), in-memory mock fixtures remain intact for unit tests.
"""

from unittest.mock import MagicMock, patch
import pytest

from agent_engine.context import AgentSessionContext, from_user_dict
from agent_engine.hybrid_coordinator import HybridQueryCoordinator, QueryType
from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
    reset_knowledge_state,
)
from agent_engine.tools.booking_tools import (
    get_booking_details_tool,
    get_user_bookings_tool,
)
from agent_engine.tools.delivery_tools import get_delivery_status_tool
from agent_engine.tools.kyc_tools import get_kyc_status_tool
from agent_engine.tools.payment_tools import (
    get_payment_status_tool,
    get_refund_status_tool,
)
from agent_engine.escalation import (
    get_support_ticket_detail,
    get_user_support_tickets,
)
from database import (
    DatabaseConnectionError,
    MOCK_DELIVERIES,
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_SUPPORT_TICKETS,
    MOCK_USERS,
    find_authoritative_product,
    get_delivery,
    get_delivery_by_booking,
    get_order_by_id,
    get_orders,
    get_user,
    get_user_kyc_status,
)


@pytest.fixture(autouse=True)
def clean_environment():
    """Ensure clean test environment before each safety test."""
    reset_knowledge_state()
    MOCK_ORDERS.clear()
    MOCK_USERS.clear()
    MOCK_KYC_VERIFICATIONS.clear()
    MOCK_DELIVERIES.clear()
    MOCK_SUPPORT_TICKETS.clear()

    # Seed mock data that must NEVER leak to production callers during DB drops
    MOCK_USERS["victim@payent.test"] = {
        "id": "usr_victim",
        "email": "victim@payent.test",
        "full_name": "Confidential Victim",
        "role": "customer",
    }
    MOCK_ORDERS["ord_secret_999"] = {
        "id": "ord_secret_999",
        "user_email": "victim@payent.test",
        "total": 50000.0,
        "product_title": "Confidential Red Helium Rig",
        "status": "confirmed",
    }
    MOCK_KYC_VERIFICATIONS["usr_victim"] = {
        "id": "kyc_secret",
        "email": "victim@payent.test",
        "status": "APPROVED",
        "account_type": "payrent",
        "document_type": "PAN",
    }
    MOCK_DELIVERIES["del_secret_999"] = {
        "id": "del_secret_999",
        "booking_id": "ord_secret_999",
        "status": "in_transit",
    }
    MOCK_SUPPORT_TICKETS["TICK-SECRET-999"] = {
        "id": "TICK-SECRET-999",
        "user_email": "victim@payent.test",
        "subject": "Confidential Fraud Investigation",
        "status": "in_progress",
    }
    yield
    reset_knowledge_state()


def get_test_ctx(email: str = "victim@payent.test") -> AgentSessionContext:
    return from_user_dict({"id": "usr_victim", "email": email, "role": "customer"}, session_id="sess_safety")


# =============================================================================
# 1. CORE DATABASE LAYER PRODUCTION SAFETY
# =============================================================================

def test_prod_get_orders_db_failure_raises_and_never_returns_mock(monkeypatch):
    """In production, DB failure raises DatabaseConnectionError and never returns MOCK_ORDERS."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)

    with patch("database.get_db_connection", return_value=None):
        with pytest.raises(DatabaseConnectionError):
            get_orders("victim@payent.test")


def test_prod_get_order_by_id_db_failure_raises_and_never_returns_mock(monkeypatch):
    """In production, DB failure in get_order_by_id raises and never returns MOCK_ORDERS."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)

    with patch("database.get_db_connection", return_value=None):
        with pytest.raises(DatabaseConnectionError):
            get_order_by_id("ord_secret_999")


def test_prod_get_user_db_failure_returns_none_never_mock(monkeypatch):
    """In production, DB failure in get_user returns None and never returns MOCK_USERS."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)

    with patch("database.get_db_connection", return_value=None):
        user = get_user("victim@payent.test")
        assert user is None, f"Expected None in production, got mock user: {user}"


def test_prod_get_user_kyc_status_db_failure_raises_and_never_returns_mock(monkeypatch):
    """In production, DB failure in get_user_kyc_status raises and never returns MOCK_KYC_VERIFICATIONS."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)

    with patch("database.get_db_connection", return_value=None):
        with pytest.raises(DatabaseConnectionError):
            get_user_kyc_status("victim@payent.test", "payrent")


def test_prod_get_delivery_db_failure_raises_and_never_returns_mock(monkeypatch):
    """In production, DB failure in delivery lookup raises and never returns MOCK_DELIVERIES."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)

    with patch("database.get_db_connection", return_value=None):
        with pytest.raises(DatabaseConnectionError):
            get_delivery_by_booking("ord_secret_999")
        with pytest.raises(DatabaseConnectionError):
            get_delivery("del_secret_999")


def test_prod_get_support_tickets_db_failure_returns_service_unavailable(monkeypatch):
    """In production, DB failure in support ticket lookup returns service_unavailable, never mock."""
    monkeypatch.setattr("agent_engine.escalation.IS_PRODUCTION", True)
    ctx = get_test_ctx("victim@payent.test")

    with patch("agent_engine.escalation.get_db_connection", return_value=None):
        # 1. Ticket list
        res_list = get_user_support_tickets(ctx)
        assert res_list["success"] is False
        assert res_list["status"] == "service_unavailable"
        assert res_list["database_error"] is True
        assert len(res_list["tickets"]) == 0

        # 2. Ticket detail
        res_detail = get_support_ticket_detail(ctx, "TICK-SECRET-999")
        assert res_detail["success"] is False
        assert res_detail["status"] == "service_unavailable"
        assert res_detail["database_error"] is True
        assert "ticket" not in res_detail


def test_prod_knowledge_manager_never_returns_mock_when_db_down(monkeypatch):
    """In production, KnowledgeManager defaults to use_in_memory=False and raises on DB failure."""
    monkeypatch.setattr("agent_engine.retrieval.knowledge_manager.IS_PRODUCTION", True)

    with patch("agent_engine.retrieval.knowledge_manager.is_db_connected", return_value=False):
        km = KnowledgeManager()
        assert km.use_in_memory is False, "Production KnowledgeManager must not default to in-memory mode"

        with pytest.raises(DatabaseConnectionError):
            km.get_active_knowledge_documents()


def test_prod_find_authoritative_product_never_returns_mock(monkeypatch):
    """In production, find_authoritative_product never returns mock catalog items."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    from database import MOCK_CUSTOM_PRODUCTS
    MOCK_CUSTOM_PRODUCTS["prod_mock_secret"] = {"id": "prod_mock_secret", "title": "Mock Cinema Drone"}

    with patch("database.fetch_one", return_value=None):
        res = find_authoritative_product("prod_mock_secret")
        assert res is None


# =============================================================================
# 2. AGENT TOOL LAYER PRODUCTION SAFETY & "RECORD NOT FOUND" PREVENTION
# =============================================================================

def test_prod_agent_booking_tool_db_failure_returns_service_unavailable(monkeypatch):
    """DB failure in booking tool must return service_unavailable, not 'booking not found'."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()

    with patch("database.get_db_connection", return_value=None):
        # List bookings
        list_res = get_user_bookings_tool(ctx)
        assert list_res["success"] is False
        assert list_res["status"] == "service_unavailable"
        assert list_res["database_error"] is True
        assert "not found" not in list_res["error"].lower()

        # Specific booking
        detail_res = get_booking_details_tool(ctx, "ord_secret_999")
        assert detail_res["success"] is False
        assert detail_res["status"] == "service_unavailable"
        assert detail_res["database_error"] is True
        assert "not found" not in detail_res["error"].lower()


def test_prod_agent_payment_tool_db_failure_returns_service_unavailable(monkeypatch):
    """DB failure in payment tool must return service_unavailable, not 'no booking found'."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()

    with patch("database.get_db_connection", return_value=None):
        res = get_payment_status_tool(ctx, "ord_secret_999")
        assert res["success"] is False
        assert res["status"] == "service_unavailable"
        assert res["database_error"] is True
        assert "not found" not in res["error"].lower()


def test_prod_agent_refund_tool_db_failure_returns_service_unavailable(monkeypatch):
    """DB failure in refund tool must return service_unavailable, not 'no refund found'."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()

    with patch("database.get_db_connection", return_value=None):
        res = get_refund_status_tool(ctx, "ord_secret_999")
        assert res["success"] is False
        assert res["status"] == "service_unavailable"
        assert res["database_error"] is True
        assert "not found" not in res["error"].lower()


def test_prod_agent_delivery_tool_db_failure_returns_service_unavailable(monkeypatch):
    """DB failure in delivery tool must return service_unavailable, not 'no tracking found'."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()

    with patch("database.get_db_connection", return_value=None):
        res = get_delivery_status_tool(ctx, booking_id="ord_secret_999")
        assert res["success"] is False
        assert res["status"] == "service_unavailable"
        assert res["database_error"] is True
        assert "not found" not in res["error"].lower()


def test_prod_agent_kyc_tool_db_failure_returns_service_unavailable(monkeypatch):
    """DB failure in KYC tool must return service_unavailable, not 'NOT_STARTED'."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()

    with patch("database.get_db_connection", return_value=None):
        res = get_kyc_status_tool(ctx)
        assert res["success"] is False
        assert res["status"] == "service_unavailable"
        assert res["database_error"] is True


# =============================================================================
# 3. END-TO-END TURN & GRACEFUL RECOVERY
# =============================================================================

def test_prod_hybrid_coordinator_turn_graceful_maintenance_message(monkeypatch):
    """When DB fails during live query in production, coordinator returns maintenance message."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()
    coord = HybridQueryCoordinator()

    with patch("database.get_db_connection", return_value=None):
        res = coord.coordinate_query("Where is my booking?", ctx)
        assert res["query_type"] == "LIVE_DB"
        assert res["status"] == "service_unavailable"
        assert res["database_error"] is True
        assert "temporarily undergoing maintenance" in res["response_text"].lower()
        assert "Try Again" in res["suggestions"]
        assert "Contact Support" in res["suggestions"]
        assert "ord_secret_999" not in res["response_text"]


def test_prod_db_recovery_restores_service_cleanly(monkeypatch):
    """Simulates transient DB failure followed by recovery; verifies clean resumption."""
    monkeypatch.setattr("database.IS_PRODUCTION", True)
    ctx = get_test_ctx()

    # Phase 1: DB is down
    with patch("database.get_db_connection", return_value=None):
        res_down = get_user_bookings_tool(ctx)
        assert res_down["status"] == "service_unavailable"
        assert res_down["database_error"] is True

    # Phase 2: DB recovers with real live connection mock
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [
        {
            "id": "ord_real_recovered_1",
            "user_email": "victim@payent.test",
            "product_title": "Sony A7S III",
            "status": "confirmed",
            "total": 3500.0,
        }
    ]
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("database.get_db_connection", return_value=mock_conn):
        res_recovered = get_user_bookings_tool(ctx)
        assert res_recovered["success"] is True
        assert res_recovered["count"] == 1
        assert res_recovered["bookings"][0]["booking_id"] == "ord_real_recovered_1"
        assert mock_conn.close.called, "Database connection must be closed/returned to pool in finally block"


def test_dev_mode_preserves_mock_fixtures(monkeypatch):
    """In development/testing (IS_PRODUCTION=False), mock fixtures remain active for unit tests."""
    monkeypatch.setattr("database.IS_PRODUCTION", False)

    with patch("database.get_db_connection", return_value=None):
        # In dev/test, offline unit tests can use mock orders
        orders = get_orders("victim@payent.test")
        assert len(orders) == 1
        assert orders[0]["id"] == "ord_secret_999"

        # Mock order by id works in dev/test
        order = get_order_by_id("ord_secret_999")
        assert order is not None
        assert order["id"] == "ord_secret_999"
