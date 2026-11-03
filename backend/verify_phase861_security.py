import sys
import os
import requests
from datetime import datetime, timezone, timedelta

sys.path.insert(0, '.')
sys.path.insert(0, './backend')
from auth import create_access_token

BASE_URL = "http://127.0.0.1:8001"

def run_security_checks():
    print("=== STARTING PHASE 8.6.1 SECURITY INVARIANTS VALIDATION ===")
    
    # 1. Unauthenticated request -> 401 Unauthorized
    r_unauth = requests.get(f"{BASE_URL}/api/admin/agent-knowledge/stats")
    print(f"1. Unauthenticated GET /stats: Status={r_unauth.status_code}")
    assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
    
    # 2. Customer token -> 403 Forbidden
    cust_token = create_access_token({"sub": "cust_user@test.in", "role": "customer", "is_admin": False})
    r_cust = requests.get(f"{BASE_URL}/api/admin/agent-knowledge/stats", headers={"Authorization": f"Bearer {cust_token}"})
    print(f"2. Customer role GET /stats: Status={r_cust.status_code}")
    assert r_cust.status_code == 403, f"Expected 403, got {r_cust.status_code}"
    
    # 3. Vendor / Lender token -> 403 Forbidden
    vendor_token = create_access_token({"sub": "vendor_user@test.in", "role": "vendor", "is_admin": False})
    r_vendor = requests.get(f"{BASE_URL}/api/admin/agent-knowledge/stats", headers={"Authorization": f"Bearer {vendor_token}"})
    print(f"3. Vendor role GET /stats: Status={r_vendor.status_code}")
    assert r_vendor.status_code == 403, f"Expected 403, got {r_vendor.status_code}"
    
    # 4. Expired token -> 401 Unauthorized
    expired_token = create_access_token(
        {"sub": "admin_exp@payent.com", "role": "admin", "is_admin": True},
        expires_delta=timedelta(seconds=-60)
    )
    r_exp = requests.get(f"{BASE_URL}/api/admin/agent-knowledge/stats", headers={"Authorization": f"Bearer {expired_token}"})
    print(f"4. Expired admin token GET /stats: Status={r_exp.status_code}")
    assert r_exp.status_code == 401, f"Expected 401, got {r_exp.status_code}"
    
    # 5. Revoked / invalid token -> 401 Unauthorized
    r_bad = requests.get(f"{BASE_URL}/api/admin/agent-knowledge/stats", headers={"Authorization": "Bearer bad.token.here"})
    print(f"5. Malformed/invalid token GET /stats: Status={r_bad.status_code}")
    assert r_bad.status_code == 401, f"Expected 401, got {r_bad.status_code}"
    
    # 6. Admin token -> 200 OK
    admin_token = create_access_token(
        {"sub": "bommidimohan2003@gmail.com", "email": "bommidimohan2003@gmail.com", "role": "admin", "is_admin": True},
        expires_delta=timedelta(days=1)
    )
    r_admin = requests.get(f"{BASE_URL}/api/admin/agent-knowledge/stats", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"6. Authoritative admin token GET /stats: Status={r_admin.status_code}, data={r_admin.json()}")
    assert r_admin.status_code == 200, f"Expected 200, got {r_admin.status_code}"
    
    # 7. Reviewer identity spoofing check: client passes custom reviewer in payload/header,
    # backend MUST attribute review strictly to JWT 'sub'/'email'
    from agent_engine.retrieval.knowledge_manager import KnowledgeManager
    km = KnowledgeManager.get_instance()
    entry = km.create_entry(
        canonical_question="Test Spoofing Security Check Question?",
        answer_markdown="Clean answer text without placeholders.",
        category="SECURITY",
        approved_by=None
    )
    r_verify = requests.post(
        f"{BASE_URL}/api/admin/agent-knowledge/entries/{entry.id}/verify",
        headers={"Authorization": f"Bearer {admin_token}", "X-Reviewer-Email": "spoofed@attacker.com"},
        json={"notes": "Verification attempt", "verified_by": "spoofed@attacker.com"}
    )
    print(f"7. Spoof verification attempt: Status={r_verify.status_code}")
    assert r_verify.status_code == 200
    verified_entry = km.get_entry(entry.id)
    print(f"   Verified by attribute in store: {verified_entry.verified_by}")
    assert verified_entry.verified_by == "bommidimohan2003@gmail.com", (
        f"Spoofing detected! Expected 'bommidimohan2003@gmail.com', got {verified_entry.verified_by}"
    )
    
    print("=== ALL 7 SECURITY INVARIANTS VALIDATED WITH ZERO DEVIATIONS ===")

if __name__ == "__main__":
    run_security_checks()
