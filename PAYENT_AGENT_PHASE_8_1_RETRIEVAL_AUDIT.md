# PAYENT AGENT — PHASE 8.1: ADVANCED RETRIEVAL ARCHITECTURE AUDIT & SPECIFICATION

**Author:** Senior Python Backend Architect, Information Retrieval Engineer & Full-Stack Integration Engineer  
**Date:** October 30, 2026  
**Status:** AUDIT & DESIGN ONLY — Baseline Verified (170/170 Agent Tests Passed, 31/31 Platform Regressions Passed)  
**Primary Reference:** `PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx` (Version 1.0, 70 Curated Q&A Entries)  
**Target:** PAYENT Peer-to-Peer Rental Marketplace (FastAPI, React 19, TiDB Cloud, Railway)  

---

## EXECUTIVE SUMMARY

Phase 8 upgrades the existing **PAYENT AGENT** into an **advanced deterministic retrieval-based assistant**. The upgrade incorporates the newly provided reference document [`PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx`](file:///c:/payernt-main/payernt-main/PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx) as the foundational knowledge asset.

The system remains **ONE unified PAYENT AGENT**: one chatbot UI ([`HelpChatbot.tsx`](file:///c:/payernt-main/payernt-main/frontend/src/components/common/HelpChatbot.tsx)), one conversational API router ([`agent_router.py`](file:///c:/payernt-main/payernt-main/backend/agent_router.py)), and one deterministic routing pipeline ([`tool_router.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/tool_router.py)).

### Strict Non-Negotiable Boundaries
- **Zero External AI / LLMs**: No OpenAI, Gemini, Claude, Ollama, or remote inference APIs.
- **Pure-Python IR Engine**: TF-IDF vectorization and cosine similarity computed entirely in native Python.
- **Security & Authorization Invariant**: Knowledge retrieval never bypasses live database authorization. Private account, booking, payment, and KYC data can only be queried through verified, unrevoked JWT authentication.
- **Phase 8.1 Execution Rule**: Audit and design only. No production schema modifications, no source code changes, no deployments, and no git pushes.

---

## 1. EXISTING ARCHITECTURE & REUSE MAP

### 1.1 Current Request-to-Response Pipeline
```
[User Chat Input] 
       │
       ▼
[HelpChatbot.tsx] ── (HTTP POST /api/agent/chat) ──► [agent_router.py]
                                                             │
                                                    resolve_agent_context()
                                                    (JWT / Guest Session)
                                                             │
                                                             ▼
                                                [AgentToolRouter.process_message()]
                                                             │
                    ┌────────────────────────────────────────┴────────────────────────────────────────┐
                    ▼                                                                                 ▼
          [IntentClassifier]                                                                 [tool_router.py]
       11-step deterministic NLP                                                              Direct routing to:
   - TextPreprocessor (contractions/slang)                                                    - booking_tools.py
   - TeluguNormalizer (Tenglish phrases)                                                      - delivery_tools.py
   - EntityExtractor (orders, products, tickets)                                              - payment_tools.py
   - ConfidenceScorer (exact, regex, keyword, fuzzy)                                          - kyc_tools.py
   - Ambiguity & competing intent checks                                                      - escalation.py
                    │                                                                                 │
                    └────────────────────────────────────────┬────────────────────────────────────────┘
                                                             ▼
                                                [Deterministic Response Formulation]
                                                             │
                                                [agent_conversations & agent_messages]
                                                (Database persistence / in-memory test fallback)
                                                             │
                                                             ▼
                                                    [AgentChatResponse JSON]
```

### 1.2 Reusable Code Map
| Existing Asset | Location | Reusable Algorithms & Logic | Phase 8 Role |
| :--- | :--- | :--- | :--- |
| **Search Engine & Math** | [`backend/search_ml.py`](file:///c:/payernt-main/payernt-main/backend/search_ml.py) | `tokenize()`, `levenshtein_distance()`, TF-IDF calculations, sublinear TF scaling (`1.0 + ln(count)`), `_cosine_similarity()`, spelling correction. | Foundation for `AgentKnowledgeRetriever`. |
| **Text Preprocessing** | [`backend/agent_engine/preprocessor.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/preprocessor.py) | `TextPreprocessor`, contraction expansion, repeated char collapse, chat slang mappings. | Frontline token normalization for query indexing. |
| **Telugu Normalization** | [`backend/agent_engine/telugu_normalizer.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/telugu_normalizer.py) | `TeluguNormalizer`, `SPELLING_VARIANTS`, `CANONICAL_PHRASE_PATTERNS`, `TELUGU_CORE_TRANSLATION`. | Vernacular transliteration & Tenglish mapping layer. |
| **Entity Extraction** | [`backend/agent_engine/entity_extractor.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/entity_extractor.py) | Regex extractors for `booking_id`, `product_id`, `ticket_id`, dates, and currency amounts. | Identifies private entities in compound hybrid inquiries. |
| **Confidence Scorer** | [`backend/agent_engine/confidence.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/confidence.py) | `ConfidenceScorer`, `AMBIGUITY_DELTA = 0.15` logic. | Confidence arbitration between knowledge & DB tools. |
| **Privacy Sanitizer** | [`backend/agent_engine/privacy.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/privacy.py) | `mask_sensitive_text()`, `mask_aadhaar()`, `mask_card()`. | Automated PII stripping from support ticket resolutions. |
| **Escalation & Support** | [`backend/agent_engine/escalation.py`](file:///c:/payernt-main/payernt-main/backend/agent_engine/escalation.py) | `create_support_ticket()`, `find_active_support_ticket()`, canonical categories. | Fallback escalation destination and feeder for knowledge learning. |
| **Database Operations** | [`backend/database.py`](file:///c:/payernt-main/payernt-main/backend/database.py) | `execute_query()`, `fetch_all()`, `add_column_safely()`, `add_index_safely()`. | Idempotent table creation and connection pooling. |
| **Frontend Chatbot** | [`frontend/src/components/common/HelpChatbot.tsx`](file:///c:/payernt-main/payernt-main/frontend/src/components/common/HelpChatbot.tsx) | Complete UI, suggestion chips, auth detection, session/conversation storage. | Enhanced to display knowledge answers and hybrid guidance. |

---

## 2. KNOWLEDGE GUIDE AUDIT (`PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx`)

A programmatic audit of [`PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx`](file:///c:/payernt-main/payernt-main/PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx) was performed using a dedicated parser.

### 2.1 Document Summary
- **Document Title:** PAYENT AGENT — Question & Answer Knowledge Guide
- **Version & Date:** Version 1.0 (30 October 2026)
- **Total Paragraphs:** 345
- **Metadata Tables:** 1
- **Total Parsed Q&A Entries:** **70** across **13 functional categories**

### 2.2 Category & Question Breakdown
| Category | Total Q&As | Guide (Static) | Hybrid (Static + DB) | Live DB (Tool Only) | Unverified `[VERIFY]` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **2. General information** | 5 | 5 | 0 | 0 | 5 |
| **3. Account and registration** | 5 | 4 | 1 | 0 | 2 |
| **4. KYC verification** | 6 | 3 | 2 | 1 | 2 |
| **5. Product listing — equipment owners** | 6 | 5 | 1 | 0 | 5 |
| **6. Product discovery — renters** | 4 | 2 | 0 | 2 | 1 |
| **7. Booking and rental** | 8 | 1 | 3 | 4 | 1 |
| **8. Payment and refunds** | 6 | 1 | 3 | 2 | 1 |
| **9. Delivery and tracking** | 7 | 3 | 3 | 1 | 2 |
| **10. Secret PIN and OTP safety** | 4 | 2 | 2 | 0 | 2 |
| **11. Returns, damage and product issues** | 5 | 1 | 4 | 0 | 3 |
| **12. Delivery partner** | 6 | 3 | 0 | 3 | 3 |
| **13. Support and complaints** | 5 | 3 | 1 | 1 | 0 |
| **14. Privacy and security** | 3 | 3 | 0 | 0 | 1 |
| **TOTAL** | **70** | **36** | **20** | **14** | **27** |

### 2.3 Retrieval Classification Analysis
1. **Guide (36 entries)**:
   - Self-contained, static procedural rules, security reminders, and general explanations.
   - Example: *"What is Payent?"*, *"How does renting work?"*, *"What documents are needed for KYC?"*, *"What is damage protection?"*.
   - Served directly from the approved knowledge index.
2. **Hybrid (20 entries)**:
   - Queries requiring both verified policy knowledge AND user-specific live database state.
   - Example: *"Money was deducted but booking failed"* $\rightarrow$ Requires payment/booking record lookup + reconciliation guidance.
   - Example: *"How do I cancel a booking?"* $\rightarrow$ Requires order eligibility lookup (`check_cancellation_eligibility_tool`) + static refund policy summary.
   - Example: *"The product arrived damaged"* $\rightarrow$ Requires booking verification + dispute escalation procedure.
3. **Live DB (14 entries)**:
   - Purely dynamic, account-bound inquiries that must **never** be answered with generic static text.
   - Example: *"How do I check my payment status?"*, *"Track my delivery"*, *"Show all my bookings"*, *"Can you show another user's booking? (No)"*.
   - Must be routed directly to verified database tools with JWT ownership validation.

### 2.4 Catalog of 27 Unverified Entries (`[VERIFY IN PAYENT]`)
The guide contains **27 draft guidance entries** explicitly marked with `[VERIFY IN PAYENT]`. These entries **must not be treated as confirmed production policy** until validated against the Payent codebase and live configuration:

1. **What is Payent?** $\rightarrow$ `[VERIFY current public description.]`
2. **How does Payent work?** $\rightarrow$ `[VERIFY.]`
3. **What is Payrent?** $\rightarrow$ `[VERIFY current app labels.]` (Renter portal distinction)
4. **What is Payernt?** $\rightarrow$ `[VERIFY current app labels.]` (Vendor/Lender portal distinction)
5. **Can I rent and lend using Payent?** $\rightarrow$ `[VERIFY.]` (Dual-role account support)
6. **I forgot my password. What should I do?** $\rightarrow$ `[VERIFY current recovery flow.]` (Email reset link vs OTP)
7. **How do I update my profile?** $\rightarrow$ `[VERIFY editable fields.]` (Mobile/email update rules)
8. **Why do I need KYC?** $\rightarrow$ `[VERIFY exact feature gates.]` (Booking vs payout requirements)
9. **Which document is required for KYC?** $\rightarrow$ `[VERIFY by account role and live policy.]` (Aadhaar/PAN/Driving License)
10. **How do I list equipment?** $\rightarrow$ `[VERIFY current flow.]` (Step-by-step listing wizard)
11. **Which product photos are required?** $\rightarrow$ `[VERIFY.]` (Serial number and 360-degree angle requirements)
12. **How do I set rental price?** $\rightarrow$ `[VERIFY pricing units and charges.]` (Daily vs hourly, platform commission)
13. **How do I manage availability?** $\rightarrow$ `[VERIFY current calendar behaviour.]` (Buffer days and multi-day reservations)
14. **How do I edit or remove a listing?** $\rightarrow$ `[VERIFY actual controls and restrictions.]` (Active booking lockouts)
15. **Can I contact the equipment owner?** $\rightarrow$ `[VERIFY communication rules.]` (Pre-booking vs post-booking chat)
16. **Can I change booking dates?** $\rightarrow$ `[VERIFY whether modification is supported.]` (In-app rescheduling vs cancel-and-rebook)
17. **Which payment methods are supported?** $\rightarrow$ `[VERIFY live options.]` (UPI, Cards, NetBanking via Razorpay)
18. **How does delivery work?** $\rightarrow$ `[VERIFY current delivery coverage and workflow.]` (Hub pickup vs lender delivery vs partner courier)
19. **How is pickup confirmed?** $\rightarrow$ `[VERIFY live workflow before publication.]` (Secret PIN exchange between parties)
20. **What is the secret PIN?** $\rightarrow$ `[VERIFY which participant receives each PIN.]` (Renter vs Vendor PIN roles)
21. **My OTP expired or did not arrive. What should I do?** $\rightarrow$ `[VERIFY expiry and retry limits.]` (60s cooldown, max attempts)
22. **How do I return rented equipment?** $\rightarrow$ `[VERIFY return workflow.]` (Return PIN inspection checklist)
23. **The product arrived damaged. What should I do?** $\rightarrow$ `[VERIFY dispute procedure.]` (Pre-handover rejection vs dispute ticket)
24. **How can I become a delivery partner?** $\rightarrow$ `[VERIFY eligibility and current route.]` (Logistics fleet registration)
25. **Which documents are needed for delivery-partner KYC?** $\rightarrow$ `[VERIFY current production requirements and privacy policy.]`
26. **When are delivery earnings transferred?** $\rightarrow$ `[VERIFY production policy.]` (Weekly cycle vs instant payout)
27. **Why can't the agent answer my question?** $\rightarrow$ `[VERIFY IN PAYENT]` (Privacy boundary explanations)

### 2.5 Missing Synonyms & Telugu-English Variations
While the guide provides 1–2 standard English alternatives per entry, significant gaps exist for regional user phrasing:
- **Tenglish Transliterations**: Missing common forms like `dabbulu refund eppudu vastundi?`, `kyc reject ayyindi ela resubmit cheyali?`, `booking vadhu cancel cheyyi`, `delivery partner raledu ekkada unnaru?`.
- **Equipment Synonyms**: In Telugu rentals, users frequently use `camera`, `lens`, `drone`, `bike`, `vehicle`, `sound system`, `gadget`, and `equipment` interchangeably with generic terms like `item`, `product`, or `gear`.
- **Financial Synonyms**: `security deposit`, `caution deposit`, `advance`, `guarantee amount`, `dabbulu`, and `deposit dabulu` represent identical intent.
- **Delivery Synonyms**: `courier boy`, `delivery boy`, `partner`, `executive`, `rider`, and `delivery person`.

---

## 3. PROPOSED ADVANCED RETRIEVAL ARCHITECTURE

```
                                [Incoming User Query]
                                          │
                                          ▼
                             [TextPreprocessor & Normalizer]
                     - Expands contractions ("can't" -> "cannot")
                     - Slang & spelling standardization ("cancle" -> "cancel")
                     - Repeated character collapsing ("sooo" -> "so")
                                          │
                                          ▼
                            [Telugu-English Normalizer]
                     - Tenglish phrase extraction ("naa booking ekkada undi")
                     - Vernacular word replacement ("dabbulu" -> "money")
                     - Rental synonym expansion ("advance" -> "security deposit")
                                          │
                                          ▼
                             [Hybrid Query Coordinator]
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
       [Live Action / Tool Route]                  [Knowledge Base Retrieval]
   - Extracts: order/product/ticket ID         - Builds field-weighted query vector
   - Evaluates: IntentClassifier               - Computes Cosine Similarity vs Index
   - Calls: Authorized Database Tool           - Ranks candidate knowledge entries
                    │                                           │
                    │                               ┌───────────┴───────────┐
                    │                               ▼                       ▼
                    │                         [Top Score >= 0.72]     [Score < 0.72]
                    │                         Approved Article        Clarification /
                    │                               │                 Human Escalation
                    └───────────────────────┬───────┘
                                            ▼
                              [Response Synthesizer]
                     - Combines verified live record + policy guidance
                     - Generates contextual suggestion chips
                     - Enforces PII scrubbing on all outputs
```

### 3.1 Mathematical Retrieval Formulation
1. **Field-Weighted Term Scoring**:
   $$\text{Weight}(t, d) = 3.5 \cdot \text{TF}_{\text{Question}} + 2.5 \cdot \text{TF}_{\text{Synonyms}} + 1.5 \cdot \text{TF}_{\text{Category}} + 1.0 \cdot \text{TF}_{\text{Answer}}$$
2. **Sublinear Term Frequency**:
   $$\text{TF}(t, d) = 1 + \ln(\text{count}(t, d)) \quad \text{for } \text{count} > 0$$
3. **Smooth Inverse Document Frequency**:
   $$\text{IDF}(t, D) = \ln\left(1 + \frac{N}{\text{DF}(t)}\right)$$
4. **Vector Cosine Similarity**:
   $$\text{Sim}(\vec{q}, \vec{d}) = \frac{\sum_{t \in q \cap d} w_{t,q} \cdot w_{t,d}}{\sqrt{\sum_{t \in q} w_{t,q}^2} \cdot \sqrt{\sum_{t \in d} w_{t,d}^2}}$$

### 3.2 Confidence Calibration & Fallback Rules
- **High Confidence ($\text{Sim} \ge 0.72$)**: Serve approved knowledge answer directly.
- **Moderate Confidence ($0.50 \le \text{Sim} < 0.72$)**: Return best-matched answer with clarifying suggestion chips.
- **Low Confidence ($\text{Sim} < 0.50$)**: Fall back to intent engine or propose human support escalation (`propose_human_escalation`).

---

## 4. SAFE DOCX-TO-DATABASE IMPORT STRATEGY

To ingest `PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx` without compromising production integrity:

1. **Programmatic Extraction Script**:
   - Parse all 70 Q&A items, extracting Category, Primary Question, Alternative Phrasings, Answer, and Retrieval Type.
2. **Verification Partitioning**:
   - **Approved Entries (43 entries)**: Inserted with `status = 'approved'`, `is_verified = TRUE`, and active in the retrieval index.
   - **Unverified Draft Entries (27 entries with `[VERIFY]` notes)**: Inserted with `status = 'draft'`, `is_verified = FALSE`, and `verification_notes` populated. These remain invisible to customer-facing search until admin confirmation.
3. **Synonym Normalization**:
   - Explode semicolon-delimited alternative phrasings into discrete `agent_knowledge_synonyms` rows, generating both English and Telugu transliterated variants.
4. **Live DB Tool Alignment**:
   - For entries marked `Retrieval: Live DB`, the ingestion pipeline registers their query phrases into the deterministic `IntentRegistry` to ensure they trigger live authorized database tools rather than static text.

---

## 5. DATABASE MIGRATION PLAN

All schemas adhere to Payent's idempotent `CREATE TABLE IF NOT EXISTS` standard.

```sql
-- 1. Canonical Knowledge Base Articles
CREATE TABLE IF NOT EXISTS agent_knowledge_entries (
    id VARCHAR(255) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    canonical_question VARCHAR(500) NOT NULL,
    answer_markdown TEXT NOT NULL,
    retrieval_type VARCHAR(50) NOT NULL DEFAULT 'guide', -- 'guide', 'hybrid', 'live_db'
    status VARCHAR(50) NOT NULL DEFAULT 'approved',        -- 'approved', 'draft', 'archived'
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    verification_notes TEXT NULL,
    version INT NOT NULL DEFAULT 1,
    helpful_count INT NOT NULL DEFAULT 0,
    unhelpful_count INT NOT NULL DEFAULT 0,
    source_ticket_id VARCHAR(255) NULL,
    created_by VARCHAR(255) NULL,
    approved_by VARCHAR(255) NULL,
    created_at VARCHAR(100) NOT NULL,
    updated_at VARCHAR(100) NOT NULL
);

-- 2. Synonyms, Alternative Questions & Vernacular Phrasings
CREATE TABLE IF NOT EXISTS agent_knowledge_synonyms (
    id VARCHAR(255) PRIMARY KEY,
    knowledge_id VARCHAR(255) NOT NULL,
    phrase VARCHAR(500) NOT NULL,
    language VARCHAR(20) NOT NULL DEFAULT 'en', -- 'en', 'te', 'tenglish'
    created_at VARCHAR(100) NOT NULL
);

-- 3. Version History & Policy Audit Log
CREATE TABLE IF NOT EXISTS agent_knowledge_versions (
    id VARCHAR(255) PRIMARY KEY,
    knowledge_id VARCHAR(255) NOT NULL,
    version_number INT NOT NULL,
    canonical_question VARCHAR(500) NOT NULL,
    answer_markdown TEXT NOT NULL,
    changed_by VARCHAR(255) NOT NULL,
    change_summary VARCHAR(500) NULL,
    created_at VARCHAR(100) NOT NULL
);

-- 4. Harvested Drafts from Resolved Support Tickets
CREATE TABLE IF NOT EXISTS agent_knowledge_drafts (
    id VARCHAR(255) PRIMARY KEY,
    source_ticket_id VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    customer_query VARCHAR(1000) NOT NULL,
    resolution_text TEXT NOT NULL,
    suggested_question VARCHAR(500) NOT NULL,
    suggested_answer TEXT NOT NULL,
    suggested_synonyms_json TEXT NULL,
    similarity_score FLOAT NULL,
    matched_knowledge_id VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'approved', 'rejected'
    reviewed_by VARCHAR(255) NULL,
    created_at VARCHAR(100) NOT NULL,
    reviewed_at VARCHAR(100) NULL
);
```

---

## 6. HUMAN-SUPPORT LEARNING & ADMIN APPROVAL LIFECYCLE

```
[Customer Query Unresolved] ──► [Offer Support Escalation] ──► [Create Support Ticket]
                                                                        │
                                                             [Admin Resolves Ticket]
                                                             (frontend/src/admin/pages/Support.tsx)
                                                                        │
                                                                        ▼
                                                             [Automated Draft Harvester]
                                                             - Redacts PII / order IDs
                                                             - Extracts question + resolution
                                                             - Computes duplicate similarity
                                                                        │
                                                                        ▼
                                                             [Admin Review & Publishing]
                                                             - Cosine Sim >= 0.80 -> Alert Duplicate
                                                             - Modify / Approve / Tag Synonyms
                                                             - Status: 'approved'
                                                                        │
                                                                        ▼
                                                             [Atomic Index Refresh]
                                                             - Rebuilds in-memory TF-IDF index
                                                             - Instant availability to Agent
```

---

## 7. API & FRONTEND CHANGES REQUIRED

### 7.1 Public Chat API (`/api/agent/chat`)
- **Backward Compatible**: Existing client contracts remain intact.
- **Enhanced Response Metadata**:
  - `knowledge_retrieved`: Boolean flag indicating knowledge lookup.
  - `knowledge_id`: Identifier of the source article.
  - `retrieval_confidence`: Cosine similarity score.
  - `is_hybrid`: Indicates whether response combined live tool data and knowledge text.

### 7.2 Admin Knowledge API Endpoints
Secured under existing `check_admin_user` dependency:
- `GET /api/admin/knowledge`: Search and filter articles by category/status.
- `POST /api/admin/knowledge`: Manually author and publish articles.
- `GET /api/admin/knowledge/{id}`: Article details, version history, and synonyms.
- `PUT /api/admin/knowledge/{id}`: Update article (auto-increments version).
- `DELETE /api/admin/knowledge/{id}`: Archive / deactivate an entry.
- `GET /api/admin/knowledge/drafts`: View harvested resolutions awaiting review.
- `POST /api/admin/knowledge/drafts/{id}/approve`: Approve and publish draft.
- `POST /api/admin/knowledge/drafts/{id}/reject`: Dismiss draft.
- `POST /api/admin/knowledge/duplicate-check`: Real-time duplicate similarity check.
- `POST /api/admin/knowledge/index/refresh`: Trigger in-memory index reload.

### 7.3 Frontend UI Integration
- **Chatbot ([`HelpChatbot.tsx`](file:///c:/payernt-main/payernt-main/frontend/src/components/common/HelpChatbot.tsx))**: Renders formatted markdown knowledge answers with verified policy chips.
- **Admin Support Dashboard ([`Support.tsx`](file:///c:/payernt-main/payernt-main/frontend/src/admin/pages/Support.tsx))**: Adds a **"Resolve & Create Knowledge Draft"** action.
- **Admin Knowledge Base ([`KnowledgeBase.tsx`](file:///c:/payernt-main/payernt-main/frontend/src/admin/pages/KnowledgeBase.tsx))**: Dedicated interface for managing articles, reviewing drafts, and inspecting search metrics.

---

## 8. SECURITY & PRIVACY CONTROLS

1. **Authentication Boundary**: Private data (bookings, payments, refunds, KYC, secret PINs) can only be accessed through authenticated tools with verified JWT tokens. Knowledge articles never expose private records.
2. **Automated PII Stripping**: The resolution harvester applies `mask_sensitive_text()` to strip phone numbers, emails, order IDs, Aadhaar numbers, PAN cards, and bank account details prior to draft creation.
3. **No Autonomous Publishing**: Resolutions harvested from customer support tickets are **never** published directly to the knowledge base without explicit admin inspection and approval.
4. **Parameterized SQL Queries**: All database queries strictly use `%s` parameterization.
5. **Outdated Policy Archival**: Updating an article increments its version and archives previous text, ensuring the agent never dispenses deprecated terms or expired fees.

---

## 9. BASELINE TEST VERIFICATION

Executed all test suites across the project prior to concluding Phase 8.1:
- **Agent Test Suites (13 files)**: **170 passed, 0 failed** in $10.41$s.
- **Platform Regression Suites (5 core files)**: **31 passed, 0 failed** in $16.19$s.
- **Total Verified Baseline**: **201 passed, 0 failed**.
- **Working Tree**: Pristine. Zero modified source files.

---

## 10. ORDERED IMPLEMENTATION ROADMAP (PHASES 8.2–8.7)

```
Phase 8.1 ──► Audit & Architecture Specification (COMPLETED)
Phase 8.2 ──► Pure-Python TF-IDF Engine & Vernacular Synonym Dictionary
Phase 8.3 ──► Knowledge Base Schema, DOCX Ingestion & In-Memory Index Manager
Phase 8.4 ──► Hybrid Query Coordinator & Intent Pipeline Integration
Phase 8.5 ──► Support Resolution Harvester, Duplicate Detection & Learning Lifecycle
Phase 8.6 ──► Admin Knowledge Management API & Support UI Integration
Phase 8.7 ──► End-to-End Verification, Performance Benchmarking & Regression Testing
```

---

## EXACT FILES INSPECTED

1. `PAYENT_AGENT_QA_KNOWLEDGE_GUIDE.docx`
2. `backend/agent_engine/__init__.py`
3. `backend/agent_engine/intent_definitions.py`
4. `backend/agent_engine/intent_classifier.py`
5. `backend/agent_engine/confidence.py`
6. `backend/agent_engine/preprocessor.py`
7. `backend/agent_engine/telugu_normalizer.py`
8. `backend/agent_engine/entity_extractor.py`
9. `backend/agent_engine/context.py`
10. `backend/agent_engine/persistence.py`
11. `backend/agent_engine/escalation.py`
12. `backend/agent_engine/response_templates.py`
13. `backend/agent_engine/privacy.py`
14. `backend/agent_engine/tool_router.py`
15. `backend/agent_engine/tools/booking_tools.py`
16. `backend/agent_engine/tools/delivery_tools.py`
17. `backend/agent_engine/tools/payment_tools.py`
18. `backend/agent_engine/tools/kyc_tools.py`
19. `backend/agent_engine/tools/product_tools.py`
20. `backend/agent_router.py`
21. `backend/search_ml.py`
22. `backend/database.py`
23. `backend/main.py`
24. `backend/config.py`
25. `frontend/src/components/common/HelpChatbot.tsx`
26. `frontend/src/utils/api.ts`
27. `frontend/src/admin/pages/Support.tsx`

---

## RECOMMENDED FILES TO CREATE / MODIFY IN SUBSEQUENT PHASES

- **Phase 8.2 (Core Retrieval Engine & Vernacular Synonyms)**:
  - Create: `backend/agent_engine/retrieval/__init__.py`
  - Create: `backend/agent_engine/retrieval/tfidf_engine.py`
  - Create: `backend/agent_engine/retrieval/synonym_dict.py`
  - Create: `backend/tests/test_agent_retrieval_engine_phase82.py`
- **Phase 8.3 (Knowledge Persistence & DOCX Ingestion)**:
  - Update: `backend/database.py` (`init_knowledge_tables()`)
  - Create: `backend/agent_engine/retrieval/knowledge_manager.py`
  - Create: `backend/scripts/import_knowledge_guide.py`
  - Create: `backend/tests/test_agent_knowledge_db_phase83.py`
- **Phase 8.4 (Hybrid Query Coordinator)**:
  - Update: `backend/agent_engine/tool_router.py`
  - Update: `backend/agent_router.py`
  - Create: `backend/tests/test_agent_hybrid_retrieval_phase84.py`
- **Phase 8.5 & 8.6 (Resolution Harvester & Admin Knowledge API/UI)**:
  - Update: `backend/agent_engine/escalation.py`
  - Update: `backend/main.py`
  - Update: `frontend/src/admin/pages/Support.tsx`
  - Create: `frontend/src/admin/pages/KnowledgeBase.tsx`
  - Create: `backend/tests/test_agent_knowledge_learning_phase85.py`
- **Phase 8.7 (Verification & Regression)**:
  - Create: `backend/tests/test_agent_e2e_phase87.py`

---

*In strict adherence to the Phase 8.1 instructions, work has concluded with this comprehensive audit and design specification. Awaiting your explicit approval before initiating Phase 8.2.*
