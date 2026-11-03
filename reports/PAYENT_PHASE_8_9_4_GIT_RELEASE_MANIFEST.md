# PAYENT AGENT — PHASE 8.9.4 GIT RELEASE MANIFEST & DEPLOYMENT SEQUENCE

**Roles:** Senior QA Lead, Backend Security Engineer, Production Release Manager  
**Date & Timestamp:** 2026-11-02T05:30:00Z  
**Target Branch:** `main`  
**Current HEAD Commit:** `be1b36a4d03d2e9da94a70e2bf13e4cc32cd0385`  
**Upstream:** `origin/main` (`be1b36a4d03d2e9da94a70e2bf13e4cc32cd0385`)  

---

## 1. File Categorization & Audit

### Group A: Required Application Code (To Stage & Commit)
1. [`backend/agent_engine/hybrid_coordinator.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/hybrid_coordinator.py)
   - Diagnostic traceability: adds `source_reference` metadata to guide and hybrid tool responses.
2. [`backend/agent_engine/retrieval/knowledge_manager.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/retrieval/knowledge_manager.py)
   - Runtime provenance hardening: removes permissive non-production bypass (`or not IS_PRODUCTION`).
   - Requires stable canonical ID (`KB-DOCX-`) and approved reference document (`PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx`).
   - Guards `_allow_test_fixtures` to abort with `RuntimeError` if invoked in production.
   - Wires singleton knowledge index manager accessor.
3. [`backend/agent_engine/retrieval/synonym_dict.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/retrieval/synonym_dict.py)
   - Conservative domain synonyms: registration, KYC proof/rejection, OTP/passcodes, handover roles, and support tickets with polarity preservation.
4. [`backend/agent_engine/retrieval/tfidf_engine.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/retrieval/tfidf_engine.py)
   - Retrieval precision: pronoun/auxiliary stop-word damping, title-gating on category/answer scores, transliteration term coverage.
5. [`backend/config.py`](file:///c:/payernt-main/payernt-main/backend/config.py)
   - Staging/production CORS origin whitelist preservation: ensures `DEFAULT_TRUSTED_ORIGINS` are preserved when `.env` overrides exist.

### Group B: Ingestion Utilities (To Stage & Commit)
6. [`backend/scripts/import_knowledge_guide.py`](file:///c:/payernt-main/payernt-main/backend/scripts/import_knowledge_guide.py)
   - Production safety guards: adds explicit `--target [local|production]` and mandatory `--confirm-production` flag.
   - Idempotent DOCX parser with dry-run support, pending-review default status, and unverified initial state.
7. [`backend/import_knowledge_guide.py`](file:///c:/payernt-main/payernt-main/backend/import_knowledge_guide.py)
   - Top-level CLI import shim delegating safely to `scripts/import_knowledge_guide.py`.

### Group C: Automated Test Suites (To Stage & Commit)
8. [`backend/tests/test_agent_admin_knowledge_phase86.py`](file:///c:/payernt-main/payernt-main/backend/tests/test_agent_admin_knowledge_phase86.py)
   - Scoped `_allow_test_fixtures` test isolation and index refresh cleanup in admin publish/unpublish tests.
9. [`backend/tests/test_agent_production_safety_phase85.py`](file:///c:/payernt-main/payernt-main/backend/tests/test_agent_production_safety_phase85.py)
   - Verifies `_allow_test_fixtures` cannot be enabled in production and non-authoritative entries are isolated.
10. [`backend/tests/test_agent_security_phase85.py`](file:///c:/payernt-main/payernt-main/backend/tests/test_agent_security_phase85.py)
    - Adds `source_document` parameter in unpublishing verification test.
11. [`backend/tests/test_agent_ingestion_phase89.py`](file:///c:/payernt-main/payernt-main/backend/tests/test_agent_ingestion_phase89.py)
    - Phase 8.9 knowledge ingestion validation test suite (10 automated tests).

---

### Group D: Excluded from Release Commit (Do NOT Stage)
- `reports/` (Local audit benchmarks, manifests, and test outputs).
- `PAYENT_AGENT_PHASE_8_1_RETRIEVAL_AUDIT.docx` (Audit artifact).
- `PAYENT_AGENT_PHASE_8_1_RETRIEVAL_AUDIT.md` (Audit artifact).
- `backend/verify_phase861_security.py` (Local debugging script).
- Any `.env` or credentials files.

---

## 2. Proposed Exact Release Git Commit

```bash
git add backend/agent_engine/hybrid_coordinator.py \
        backend/agent_engine/retrieval/knowledge_manager.py \
        backend/agent_engine/retrieval/synonym_dict.py \
        backend/agent_engine/retrieval/tfidf_engine.py \
        backend/config.py \
        backend/scripts/import_knowledge_guide.py \
        backend/import_knowledge_guide.py \
        backend/tests/test_agent_admin_knowledge_phase86.py \
        backend/tests/test_agent_production_safety_phase85.py \
        backend/tests/test_agent_security_phase85.py \
        backend/tests/test_agent_ingestion_phase89.py

git commit -m "feat(agent,retrieval): Phase 8.9 release - hardened runtime provenance, safe importer, and retrieval accuracy"
```

---

## 3. Production Deployment & Verification Sequence

1. **Step 1: Commit and Push to GitHub `main`**
   - Push release commit to GitHub repository `bommidimohan2003-rgb/payernt-main`.
2. **Step 2: Deploy to Railway**
   - Trigger Railway backend redeployment using the new commit SHA.
   - Monitor build logs and verify successful container startup.
3. **Step 3: Verify Railway Deployment Health**
   - Query `GET https://payernt-production.up.railway.app/health` and verify HTTP 200 OK.
   - Query `GET /api/agent/health` or `GET /api/admin/agent-knowledge` to confirm active status.
4. **Step 4: Execute Safe Production Ingestion**
   - Execute knowledge importer targeting production TiDB with dry-run verification first:
     ```bash
     python backend/import_knowledge_guide.py --target production --confirm-production --dry-run
     python backend/import_knowledge_guide.py --target production --confirm-production
     ```
   - Confirms all 70 canonical entries enter TiDB in `pending_review` status with `is_verified=False`.
5. **Step 5: Publish Only the 45 Approved Entries**
   - Via Admin API or publication script: publish the 45 clean entries (`KB-DOCX-001`, `KB-DOCX-004` through `KB-DOCX-070` without `[VERIFY]`).
   - Retain the 25 entries containing `[VERIFY]` in `pending_review` (quarantined).
6. **Step 6: Live Production Smoke Verification**
   - Run live production query for Q1 ("What is Payent?"), Q2 ("How does Payent work?"), and Q3 ("Payrent meaning enti?").
   - Confirm live database queries enforce authentication and hybrid routing functions properly.
