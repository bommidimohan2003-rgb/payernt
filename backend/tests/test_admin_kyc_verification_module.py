import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from auth import create_access_token
from database import (
    MOCK_USERS,
    MOCK_KYC_VERIFICATIONS,
    MOCK_NOTIFICATIONS,
    get_user_kyc_status,
    get_notifications,
)
from payernt_database import (
    MOCK_PAYERNT_ACCOUNTS,
    MOCK_PAYERNT_NOTIFICATIONS,
)

client = TestClient(app)


def setup_admin_kyc_env():
    uid = uuid.uuid4().hex[:6]
    admin_email = f"admin_{uid}@payent.com"
    vendor_email = f"vendor_{uid}@payent.com"
    renter_email = f"renter_{uid}@payent.com"
    other_user_email = f"other_{uid}@payent.com"

    # Admin user
    MOCK_USERS[admin_email] = {
        "id": admin_email,
        "email": admin_email,
        "full_name": "Compliance Admin",
        "role": "admin",
        "verified": True,
        "status": "active",
        "kyc_status": "APPROVED",
    }
    admin_token = create_access_token(
        {"sub": admin_email, "role": "admin", "account_type": "payrent"}
    )

    # Vendor applicant
    v_acc_id = f"vnd_{uid}"
    MOCK_PAYERNT_ACCOUNTS[v_acc_id] = {
        "id": v_acc_id,
        "email": vendor_email,
        "name": "LensCraft Studio",
        "business_name": "LensCraft Studio",
        "phone": "+919876543210",
        "role": "vendor",
        "kyc_status": "PENDING",
        "status": "active",
    }
    MOCK_USERS[vendor_email] = {
        "id": vendor_email,
        "email": vendor_email,
        "full_name": "LensCraft Studio",
        "role": "vendor",
        "account_type": "payernt",
        "kyc_status": "PENDING",
        "status": "active",
    }
    vendor_token = create_access_token(
        {"sub": vendor_email, "role": "vendor", "account_type": "payernt"}
    )

    # Renter applicant
    MOCK_USERS[renter_email] = {
        "id": renter_email,
        "email": renter_email,
        "full_name": "Rohan Verma",
        "phone": "+919123456789",
        "role": "customer",
        "account_type": "payrent",
        "kyc_status": "PENDING",
        "status": "active",
    }
    renter_token = create_access_token(
        {"sub": renter_email, "role": "customer", "account_type": "payrent"}
    )

    # Other unrelated user
    MOCK_USERS[other_user_email] = {
        "id": other_user_email,
        "email": other_user_email,
        "full_name": "Random Visitor",
        "role": "customer",
        "account_type": "payrent",
        "kyc_status": "PENDING",
    }
    other_token = create_access_token(
        {"sub": other_user_email, "role": "customer", "account_type": "payrent"}
    )

    # Setup 2 sample KYC applications
    vendor_kyc_id = f"kyc_v_{uid}"
    MOCK_KYC_VERIFICATIONS[vendor_kyc_id] = {
        "id": vendor_kyc_id,
        "user_id": vendor_email,
        "email": vendor_email,
        "account_type": "payernt",
        "document_type": "AADHAAR",
        "document_number_masked": "•••• •••• 5678",
        "document_number_hash": "hash_aadhaar_5678",
        "document_file_name": "aadhaar_card.jpg",
        "document_mime_type": "image/jpeg",
        "document_file_size": 256000,
        "document_data_encrypted": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        "status": "PENDING",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    renter_kyc_id = f"kyc_r_{uid}"
    MOCK_KYC_VERIFICATIONS[renter_kyc_id] = {
        "id": renter_kyc_id,
        "user_id": renter_email,
        "email": renter_email,
        "account_type": "payrent",
        "document_type": "PAN",
        "document_number_masked": "••••• 1234F",
        "document_number_hash": "hash_pan_1234F",
        "document_file_name": "pan_card.png",
        "document_mime_type": "image/png",
        "document_file_size": 184000,
        "document_data_encrypted": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
        "status": "PENDING",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "admin_email": admin_email,
        "admin_token": admin_token,
        "vendor_email": vendor_email,
        "vendor_token": vendor_token,
        "vendor_kyc_id": vendor_kyc_id,
        "renter_email": renter_email,
        "renter_token": renter_token,
        "renter_kyc_id": renter_kyc_id,
        "other_email": other_user_email,
        "other_token": other_token,
    }


def test_admin_kyc_list_and_stats():
    env = setup_admin_kyc_env()

    # 1. Fetch listing as Admin
    res = client.get(
        "/api/admin/kyc/list",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert "stats" in data
    assert "verifications" in data

    stats = data["stats"]
    assert stats["total"] >= 2
    assert stats["pending"] >= 2
    assert "approved" in stats
    assert "rejected" in stats
    assert "needs_information" in stats

    # Verify applicant enrichment
    apps = {v["id"]: v for v in data["verifications"]}
    assert env["vendor_kyc_id"] in apps
    assert apps[env["vendor_kyc_id"]]["applicant_name"] == "LensCraft Studio"
    assert apps[env["vendor_kyc_id"]]["document_type"] == "AADHAAR"

    assert env["renter_kyc_id"] in apps
    assert apps[env["renter_kyc_id"]]["applicant_name"] == "Rohan Verma"
    assert apps[env["renter_kyc_id"]]["document_type"] == "PAN"

    # 2. Separate Stats Endpoint
    res_stats = client.get(
        "/api/admin/kyc/stats",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
    )
    assert res_stats.status_code == 200
    assert res_stats.json()["stats"]["total"] >= 2


def test_admin_get_kyc_details_and_document_preview():
    env = setup_admin_kyc_env()

    # Admin fetches detailed verification with document payload
    res = client.get(
        f"/api/admin/kyc/{env['vendor_kyc_id']}",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert "verification" in data
    assert "document" in data
    assert data["document"]["fileData"].startswith("data:image/")
    assert data["document"]["fileName"] == "aadhaar_card.jpg"
    assert data["verification"]["applicant_name"] == "LensCraft Studio"


def test_non_admin_cannot_access_admin_kyc_apis():
    env = setup_admin_kyc_env()

    # Renter tries admin listing
    res1 = client.get(
        "/api/admin/kyc/list",
        headers={"Authorization": f"Bearer {env['renter_token']}"},
    )
    assert res1.status_code == 403

    # Vendor tries admin details
    res2 = client.get(
        f"/api/admin/kyc/{env['vendor_kyc_id']}",
        headers={"Authorization": f"Bearer {env['vendor_token']}"},
    )
    assert res2.status_code == 403

    # Other user cannot view private document of another user
    res3 = client.get(
        f"/api/kyc/document/{env['vendor_kyc_id']}",
        headers={"Authorization": f"Bearer {env['other_token']}"},
    )
    assert res3.status_code == 403


def test_admin_approve_flow_updates_status_and_notifies():
    env = setup_admin_kyc_env()

    # Approve vendor KYC
    res = client.post(
        f"/api/admin/kyc/{env['vendor_kyc_id']}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={"action": "approve"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "APPROVED"
    assert data["audit"]["reviewerEmail"] == env["admin_email"]

    # Verify status in memory
    vendor_kyc = get_user_kyc_status(env["vendor_email"], "payernt")
    assert vendor_kyc["status"] == "APPROVED"

    # Verify notification created
    notifs = get_notifications(env["vendor_email"])
    assert any("approved" in n.get("title", "").lower() or "approved" in n.get("message", "").lower() for n in notifs)


def test_admin_reject_flow_mandatory_reason_and_notifies():
    env = setup_admin_kyc_env()

    # 1. Missing reason must fail
    res_fail = client.post(
        f"/api/admin/kyc/{env['renter_kyc_id']}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={"action": "reject", "rejectionReason": "   "},
    )
    assert res_fail.status_code == 400
    assert "mandatory" in res_fail.json()["detail"].lower()

    # 2. With valid reason
    res_ok = client.post(
        f"/api/admin/kyc/{env['renter_kyc_id']}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={
            "action": "reject",
            "rejectionReason": "PAN card photo is blurry and signature is not clearly visible.",
        },
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["status"] == "REJECTED"

    # Verify status in memory
    renter_kyc = get_user_kyc_status(env["renter_email"], "payrent")
    assert renter_kyc["status"] == "REJECTED"
    assert "blurry" in renter_kyc.get("rejectionReason", "").lower()

    # Verify notification created with reason
    notifs = get_notifications(env["renter_email"])
    assert any("rejected" in n.get("title", "").lower() for n in notifs)


def test_admin_request_more_information_flow():
    env = setup_admin_kyc_env()

    res = client.post(
        f"/api/admin/kyc/{env['vendor_kyc_id']}/review",
        headers={"Authorization": f"Bearer {env['admin_token']}"},
        json={
            "action": "needs_information",
            "notes": "Please upload a color scan of the front and back of your Aadhaar card.",
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "NEEDS_INFORMATION"

    vendor_kyc = get_user_kyc_status(env["vendor_email"], "payernt")
    assert vendor_kyc["status"] == "NEEDS_INFORMATION"
