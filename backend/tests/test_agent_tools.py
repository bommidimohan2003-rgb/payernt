"""
PAYENT AGENT — PHASE 3 TEST SUITE: DATABASE TOOLS
Validates:
1. get_user_bookings_tool: Authenticated renter & vendor retrieval, guest rejection.
2. get_booking_details_tool: Authorized lookup, unauthorized cross-user rejection.
3. check_cancellation_eligibility_tool: Request-only policy checks, status immutability.
4. get_payment_status_tool: Payment tracking, sensitive masking.
5. get_refund_status_tool: Authoritative refund progress on cancelled orders.
6. get_kyc_status_tool: Renter and Vendor identity verification lookups.
7. get_delivery_status_tool: Delivery tracking with booking ownership checks.
8. get_public_product_info_tool: Catalog query with PIN purged for guests and users.
"""

import time
import pytest
from agent_engine.context import create_guest_context, from_user_dict
from agent_engine.tools.booking_tools import (
    check_cancellation_eligibility_tool,
    get_booking_details_tool,
    get_user_bookings_tool,
)
from agent_engine.tools.delivery_tools import get_delivery_status_tool
from agent_engine.tools.kyc_tools import get_kyc_status_tool
from agent_engine.tools.payment_tools import (
    get_payment_status_tool,
    get_refund_status_tool,
)
from agent_engine.tools.product_tools import get_public_product_info_tool
from database import (
    MOCK_CUSTOM_PRODUCTS,
    MOCK_DELIVERIES,
    MOCK_KYC_VERIFICATIONS,
    MOCK_ORDERS,
    MOCK_USERS,
    create_order,
)
from payernt_database import MOCK_PAYERNT_PRODUCTS


@pytest.fixture(autouse=True)
def setup_test_entities():
    """Seeds test orders, products, deliveries, and KYC records."""
    t_id = int(time.time() * 1000)
    renter_email = f"alice_{t_id}@payent.test"
    vendor_email = f"bob_{t_id}@payent.test"
    intruder_email = f"mallory_{t_id}@payent.test"

    # Seed Users
    MOCK_USERS[renter_email] = {
        "email": renter_email,
        "full_name": "Alice Renter",
        "role": "customer",
        "status": "approved",
    }
    MOCK_USERS[vendor_email] = {
        "email": vendor_email,
        "full_name": "Bob Vendor",
        "role": "vendor",
        "status": "approved",
    }
    MOCK_USERS[intruder_email] = {
        "email": intruder_email,
        "full_name": "Mallory Intruder",
        "role": "customer",
        "status": "approved",
    }

    # Seed Product
    prod_id = f"p_cam_{t_id}"
    MOCK_PAYERNT_PRODUCTS[prod_id] = {
        "id": prod_id,
        "name": "Sony FX6 Cinema Camera",
        "title": "Sony FX6 Cinema Camera",
        "daily_rate": 4500.0,
        "vendor_secret_pin": "5512",
        "status": "approved",
        "available": True,
        "city": "Bengaluru",
        "condition_grade": "Like New"
    }

    # Seed Booking 1: Pending
    b1_id = f"ord_pending_{t_id}"
    order_pending = {
        "id": b1_id,
        "user_email": renter_email,
        "lender_email": vendor_email,
        "vendor_id": f"v_{vendor_email}",
        "productId": prod_id,
        "productTitle": "Sony FX6 Cinema Camera",
        "startDate": "2026-11-20",
        "endDate": "2026-11-22",
        "total": 9000.0,
        "status": "pending",
        "payment_status": "COMPLETED",
        "vendor_secret_pin": "5512",
        "delivery_method": "pickup",
        "pickup_location": "Payent Indiranagar Hub"
    }
    create_order(renter_email, order_pending)
    MOCK_ORDERS[b1_id] = order_pending

    # Seed Booking 2: Cancelled with Refund
    b2_id = f"ord_cancelled_{t_id}"
    order_cancelled = {
        "id": b2_id,
        "user_email": renter_email,
        "lender_email": vendor_email,
        "productId": prod_id,
        "productTitle": "Sony FX6 Cinema Camera",
        "total": 4500.0,
        "status": "cancelled",
        "cancelled_at": "2026-10-30T09:00:00Z",
        "cancellation_reason": "PERSONAL_REASON",
        "refund_id": f"rfnd_{t_id}",
        "refund_status": "PROCESSED",
    }
    create_order(renter_email, order_cancelled)
    MOCK_ORDERS[b2_id] = order_cancelled

    # Seed Delivery
    del_id = f"del-{b1_id}"
    MOCK_DELIVERIES[del_id] = {
        "id": del_id,
        "booking_id": b1_id,
        "customer_email": renter_email,
        "lender_email": vendor_email,
        "status": "IN_TRANSIT",
        "stage": "OUT_FOR_DELIVERY",
        "delivery_method": "pickup",
        "pickup_location": "Payent Indiranagar Hub",
    }

    # Seed KYC
    MOCK_KYC_VERIFICATIONS[f"kyc_{renter_email}"] = {
        "id": f"kyc_{renter_email}",
        "email": renter_email,
        "account_type": "payrent",
        "status": "APPROVED",
        "document_type": "PAN",
        "document_number_masked": "ABCDE1234F"
    }

    return {
        "renter_email": renter_email,
        "vendor_email": vendor_email,
        "intruder_email": intruder_email,
        "prod_id": prod_id,
        "b1_id": b1_id,
        "b2_id": b2_id,
        "del_id": del_id,
    }


def test_user_bookings_guest_rejection():
    guest = create_guest_context()
    res = get_user_bookings_tool(guest)
    assert res["success"] is False
    assert res["requires_auth"] is True
    assert "Authentication required" in res["error"]


def test_user_bookings_authenticated_retrieval(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({
        "email": data["renter_email"],
        "role": "customer",
        "account_type": "payrent"
    })
    res = get_user_bookings_tool(renter_ctx)
    assert res["success"] is True
    assert res["count"] >= 2
    b_ids = [b["booking_id"] for b in res["bookings"]]
    assert data["b1_id"] in b_ids
    # Ensure PIN is purged
    for b in res["bookings"]:
        assert "vendor_secret_pin" not in b
        assert "5512" not in str(b)


def test_booking_details_ownership_enforcement(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})
    intruder_ctx = from_user_dict({"email": data["intruder_email"], "role": "customer"})

    # Authorized renter lookup
    res_auth = get_booking_details_tool(renter_ctx, data["b1_id"])
    assert res_auth["success"] is True
    assert res_auth["booking"]["booking_id"] == data["b1_id"]

    # Unauthorized intruder lookup
    res_unauth = get_booking_details_tool(intruder_ctx, data["b1_id"])
    assert res_unauth["success"] is False
    assert "Access denied" in res_unauth["error"]


def test_booking_details_missing_and_invalid_id(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res_empty = get_booking_details_tool(renter_ctx, "")
    assert res_empty["success"] is False
    assert "valid booking" in res_empty["error"]

    res_not_found = get_booking_details_tool(renter_ctx, "ord_non_existent_9999")
    assert res_not_found["success"] is False
    assert "No booking found" in res_not_found["error"]


def test_cancellation_eligibility_request_only(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    # Pending booking qualifies for cancellation request
    res = check_cancellation_eligibility_tool(renter_ctx, data["b1_id"])
    assert res["success"] is True
    assert res["eligible"] is True
    assert "Full refund" in res["policy_summary"]
    # Verify booking status in database has NOT been mutated!
    order_in_db = MOCK_ORDERS[data["b1_id"]]
    assert order_in_db["status"] == "pending"

    # Already cancelled booking
    res_canc = check_cancellation_eligibility_tool(renter_ctx, data["b2_id"])
    assert res_canc["success"] is True
    assert res_canc["eligible"] is False
    assert "already cancelled" in res_canc["reason"]


def test_cancellation_eligibility_unauthorized(setup_test_entities):
    data = setup_test_entities
    intruder_ctx = from_user_dict({"email": data["intruder_email"], "role": "customer"})
    res = check_cancellation_eligibility_tool(intruder_ctx, data["b1_id"])
    assert res["success"] is False
    assert "Access denied" in res["error"]


def test_payment_status_tool(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    # Specific booking payment status
    res = get_payment_status_tool(renter_ctx, data["b1_id"])
    assert res["success"] is True
    assert res["payment_status"] == "COMPLETED"
    assert res["total_amount"] == 9000.0

    # Unauthorized payment lookup
    intruder_ctx = from_user_dict({"email": data["intruder_email"], "role": "customer"})
    res_intruder = get_payment_status_tool(intruder_ctx, data["b1_id"])
    assert res_intruder["success"] is False
    assert "Access denied" in res_intruder["error"]


def test_refund_status_tool(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})

    res = get_refund_status_tool(renter_ctx, data["b2_id"])
    assert res["success"] is True
    assert res["refund_status"] == "PROCESSED"
    assert res["refund_amount"] == 4500.0


def test_kyc_status_tool(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer", "account_type": "payrent"})
    guest_ctx = create_guest_context()

    # Guest rejected
    assert get_kyc_status_tool(guest_ctx)["requires_auth"] is True

    # Authenticated lookup
    res = get_kyc_status_tool(renter_ctx)
    assert res["success"] is True
    assert res["kyc"]["status"] == "APPROVED"
    assert res["kyc"]["document_type"] == "PAN"


def test_delivery_status_tool(setup_test_entities):
    data = setup_test_entities
    renter_ctx = from_user_dict({"email": data["renter_email"], "role": "customer"})
    intruder_ctx = from_user_dict({"email": data["intruder_email"], "role": "customer"})

    # Authorized delivery lookup
    res = get_delivery_status_tool(renter_ctx, booking_id=data["b1_id"])
    assert res["success"] is True
    assert res["delivery"]["status"] == "IN_TRANSIT"
    assert "out for delivery" in res["status_message"]

    # Unauthorized delivery lookup
    res_intruder = get_delivery_status_tool(intruder_ctx, booking_id=data["b1_id"])
    assert res_intruder["success"] is False
    assert "Access denied" in res_intruder["error"]


def test_public_product_info_tool(setup_test_entities):
    data = setup_test_entities
    guest = create_guest_context()

    res = get_public_product_info_tool(guest, data["prod_id"])
    assert res["success"] is True
    assert res["product"]["product_id"] == data["prod_id"]
    assert res["product"]["daily_rate"] == 4500.0
    # Must NOT leak vendor_secret_pin!
    assert "vendor_secret_pin" not in res["product"]
    assert "5512" not in str(res["product"])
