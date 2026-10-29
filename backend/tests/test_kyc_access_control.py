import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_USERS,
    MOCK_CUSTOM_PRODUCTS,
    MOCK_ORDERS,
    MOCK_KYC_VERIFICATIONS,
    get_user_kyc_status,
    review_kyc_verification,
)
from payernt_database import (
    MOCK_PAYERNT_ACCOUNTS,
    MOCK_PAYERNT_PRODUCTS,
)

client = TestClient(app)


def setup_kyc_test_env():
    uid = uuid.uuid4().hex[:6]
    admin_email = f"admin_kyc_{uid}@payent.com"
    verified_vendor_email = f"verified_vendor_{uid}@payent.com"
    unverified_vendor_email = f"unverified_vendor_{uid}@payent.com"
    verified_renter_email = f"verified_renter_{uid}@payent.com"
    unverified_renter_email = f"unverified_renter_{uid}@payent.com"

    # Setup admin
    MOCK_USERS[admin_email] = {
        "id": admin_email,
        "email": admin_email,
        "full_name": "Platform Admin",
        "role": "admin",
        "verified": True,
        "status": "active",
        "account_type": "payrent",
        "kyc_status": "APPROVED",
    }

    # Setup verified vendor
    v_acc_id = f"vnd_ver_{uid}"
    vendor_data = {
        "id": v_acc_id,
        "email": verified_vendor_email,
        "name": "Verified Vendor",
        "role": "vendor",
        "kyc_status": "APPROVED",
        "status": "active",
    }
    MOCK_USERS[verified_vendor_email] = {
        "id": verified_vendor_email,
        "email": verified_vendor_email,
        "role": "vendor",
        "status": "active",
        "account_type": "payernt",
        "kyc_status": "APPROVED",
    }
    MOCK_PAYERNT_ACCOUNTS[v_acc_id] = vendor_data
    MOCK_PAYERNT_ACCOUNTS[verified_vendor_email] = vendor_data

    # Setup unverified vendor
    unv_acc_id = f"vnd_unv_{uid}"
    unv_vendor_data = {
        "id": unv_acc_id,
        "email": unverified_vendor_email,
        "name": "Unverified Vendor",
        "role": "vendor",
        "kyc_status": "NOT_STARTED",
        "status": "active",
    }
    MOCK_USERS[unverified_vendor_email] = {
        "id": unverified_vendor_email,
        "email": unverified_vendor_email,
        "role": "vendor",
        "status": "active",
        "account_type": "payernt",
        "kyc_status": "NOT_STARTED",
    }
    MOCK_PAYERNT_ACCOUNTS[unv_acc_id] = unv_vendor_data
    MOCK_PAYERNT_ACCOUNTS[unverified_vendor_email] = unv_vendor_data

    # Setup verified renter
    MOCK_USERS[verified_renter_email] = {
        "id": verified_renter_email,
        "email": verified_renter_email,
        "role": "customer",
        "status": "active",
        "is_approved": True,
        "account_type": "payrent",
        "kyc_status": "APPROVED",
    }

    # Setup unverified renter
    MOCK_USERS[unverified_renter_email] = {
        "id": unverified_renter_email,
        "email": unverified_renter_email,
        "role": "customer",
        "status": "active",
        "is_approved": True,
        "account_type": "payrent",
        "kyc_status": "NOT_STARTED",
    }

    admin_token = create_access_token({"sub": admin_email, "role": "admin", "account_type": "payrent"})
    v_vendor_token = create_access_token({"sub": verified_vendor_email, "role": "vendor", "account_type": "payernt", "account_id": v_acc_id})
    unv_vendor_token = create_access_token({"sub": unverified_vendor_email, "role": "vendor", "account_type": "payernt", "account_id": unv_acc_id})
    v_renter_token = create_access_token({"sub": verified_renter_email, "role": "customer", "account_type": "payrent"})
    unv_renter_token = create_access_token({"sub": unverified_renter_email, "role": "customer", "account_type": "payrent"})

    return {
        "admin_email": admin_email,
        "admin_token": admin_token,
        "v_vendor_email": verified_vendor_email,
        "v_acc_id": v_acc_id,
        "v_vendor_token": v_vendor_token,
        "unv_vendor_email": unverified_vendor_email,
        "unv_acc_id": unv_acc_id,
        "unv_vendor_token": unv_vendor_token,
        "v_renter_email": verified_renter_email,
        "v_renter_token": v_renter_token,
        "unv_renter_email": unverified_renter_email,
        "unv_renter_token": unv_renter_token,
    }


# ============================================================
# Requirement 2: KYC Eligibility Enforcement
# ============================================================

def test_unverified_vendor_cannot_create_product():
    env = setup_kyc_test_env()
    res = client.post(
        "/api/payernt/products",
        headers={"Authorization": f"Bearer {env['unv_vendor_token']}"},
        json={
            "name": "Unverified Lens",
            "category": "Cameras",
            "daily_rate": 500,
        },
    )
    assert res.status_code == 403, res.text
    assert "Admin-approved KYC" in res.json()["detail"]


def test_verified_vendor_can_create_product():
    env = setup_kyc_test_env()
    res = client.post(
        "/api/payernt/products",
        headers={"Authorization": f"Bearer {env['v_vendor_token']}"},
        json={
            "name": "Verified 50mm Lens",
            "category": "Cameras",
            "daily_rate": 600,
            "status": "under_review",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True


def test_unverified_vendor_cannot_activate_listing():
    env = setup_kyc_test_env()
    prod_id = f"prod_unv_act_{uuid.uuid4().hex[:6]}"
    MOCK_PAYERNT_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Existing Inactive Gear",
        "category": "Cameras",
        "daily_rate": 500,
        "owner_id": env["unv_acc_id"],
        "owner_email": env["unv_vendor_email"],
        "status": "pending_admin_review",
        "availability_status": "paused",
        "available": False,
    }

    res = client.patch(
        f"/api/payernt/products/{prod_id}/status",
        headers={"Authorization": f"Bearer {env['unv_vendor_token']}"},
        json={"status": "approved", "availability_status": "available"},
    )
    assert res.status_code == 403, res.text
    assert "Admin-approved KYC" in res.json()["detail"]


def test_unverified_renter_cannot_create_booking():
    env = setup_kyc_test_env()
    prod_id = f"prod_rent_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Camera Kit",
        "category": "Cameras",
        "price": 1000,
        "user_email": env["v_vendor_email"],
        "owner_email": env["v_vendor_email"],
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }

    res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {env['unv_renter_token']}"},
        json={
            "id": f"ord_{uuid.uuid4().hex[:6]}",
            "productId": prod_id,
            "startDate": "2026-11-20",
            "endDate": "2026-11-22",
            "total": 2000,
            "deliveryMethod": "pickup",
        },
    )
    assert res.status_code == 403, res.text
    assert "Admin-approved KYC" in res.json()["detail"]


def test_renter_cannot_book_unverified_vendor_listing():
    env = setup_kyc_test_env()
    prod_id = f"prod_unv_lender_{uuid.uuid4().hex[:6]}"
    MOCK_CUSTOM_PRODUCTS[prod_id] = {
        "id": prod_id,
        "title": "Unverified Lender Drone",
        "category": "Drones",
        "price": 1200,
        "user_email": env["unv_vendor_email"],
        "owner_email": env["unv_vendor_email"],
        "available": True,
        "availability_status": "available",
        "status": "approved",
    }

    # Verified renter tries to book gear owned by unverified vendor
    res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {env['v_renter_token']}"},
        json={
            "id": f"ord_{uuid.uuid4().hex[:6]}",
            "productId": prod_id,
            "startDate": "2026-11-20",
            "endDate": "2026-11-22",
            "total": 2400,
            "deliveryMethod": "pickup",
        },
    )
    assert res.status_code == 400, res.text
    assert "vendor's kyc" in res.json()["detail"].lower()


# ============================================================
# Requirement 3: Admin-Only KYC Verification & Access Control
# ============================================================

def test_non_admin_cannot_list_kyc_submissions():
    env = setup_kyc_test_env()
    # Renter
    res_r = client.get("/api/admin/kyc/list", headers={"Authorization": f"Bearer {env['v_renter_token']}"})
    assert res_r.status_code == 403

    # Vendor
    res_v = client.get("/api/admin/kyc/list", headers={"Authorization": f"Bearer {env['v_vendor_token']}"})
    assert res_v.status_code == 403


def test_non_admin_cannot_review_kyc():
    env = setup_kyc_test_env()
    v_id = f"kyc_sub_{uuid.uuid4().hex[:6]}"
    MOCK_KYC_VERIFICATIONS[v_id] = {
        "id": v_id,
        "email": env["unv_renter_email"],
        "account_type": "payrent",
        "status": "PENDING",
        "document_type": "PAN",
    }

    # Renter tries to self-approve
    res = client.post(
        f"/api/admin/kyc/{v_id}/review",
        headers={"Authorization": f"Bearer {env['unv_renter_token']}"},
        json={"action": "approve"},
    )
    assert res.status_code == 403


def test_admin_can_approve_kyc():
    env = setup_kyc_test_env()
    v_id = f"kyc_appr_{uuid.uuid4().hex[:6]}"
    MOCK_KYC_VERIFICATIONS[v_id] = {
        "id": v_id,
        "email": env["unv_renter_email"],
        "account_type": "payrent",
        "status": "PENDING",
        "document_type": "PAN",
    }

    res = client.post(
        f"/api/admin/kyc/{v_id}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={"action": "approve"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "APPROVED"
    assert data["audit"]["reviewerEmail"] == env["admin_email"]

    # Verify user record updated in memory
    assert MOCK_USERS[env["unv_renter_email"]]["kyc_status"] == "APPROVED"


def test_admin_reject_requires_reason():
    env = setup_kyc_test_env()
    v_id = f"kyc_rej_val_{uuid.uuid4().hex[:6]}"
    MOCK_KYC_VERIFICATIONS[v_id] = {
        "id": v_id,
        "email": env["unv_renter_email"],
        "account_type": "payrent",
        "status": "PENDING",
        "document_type": "PAN",
    }

    # Missing reason -> 400
    res_bad = client.post(
        f"/api/admin/kyc/{v_id}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={"action": "reject", "rejectionReason": "   "},
    )
    assert res_bad.status_code == 400
    assert "mandatory" in res_bad.json()["detail"].lower()

    # With reason -> 200
    res_good = client.post(
        f"/api/admin/kyc/{v_id}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={"action": "reject", "rejectionReason": "Document blurred, signature illegible"},
    )
    assert res_good.status_code == 200
    assert res_good.json()["status"] == "REJECTED"


def test_admin_request_additional_information():
    env = setup_kyc_test_env()
    v_id = f"kyc_req_info_{uuid.uuid4().hex[:6]}"
    MOCK_KYC_VERIFICATIONS[v_id] = {
        "id": v_id,
        "email": env["unv_vendor_email"],
        "account_type": "payernt",
        "status": "PENDING",
        "document_type": "AADHAAR",
    }

    res = client.post(
        f"/api/admin/kyc/{v_id}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={"action": "needs_information", "notes": "Please upload a clearer image of backside of Aadhaar card"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "NEEDS_INFORMATION"
    assert data["audit"]["decision"] == "NEEDS_INFORMATION"
