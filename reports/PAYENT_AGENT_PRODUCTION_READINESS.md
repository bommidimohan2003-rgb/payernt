# paYent AI AGENT — PRODUCTION DEPLOYMENT READINESS REPORT

**Date:** November 3, 2026  
**Lead DevOps & Release Architect:** Senior AI Engineer & Systems Architect  
**Classification:** PRODUCTION READINESS VERIFICATION  
**Release Target:** Production V1.0.0-rc1  
**Deployment Restriction:** **EXPLICIT HUMAN APPROVAL REQUIRED PRIOR TO PRODUCTION RELEASE**

---

## 1. Production Architecture Topology

```mermaid
flowchart TD
    subgraph Client Layer
        Browser[User Browser / Mobile]
        Vercel[Vercel CDN\nReact + Vite Frontend\nHelpChatbot.tsx]
    end

    subgraph API & Compute Layer
        Railway[Railway Container Platform\nFastAPI Python 3.12/3.14\nUvicorn / Gunicorn Workers]
        AgentRouter[agent_router.py\nRate Limiter & Chat Dispatcher]
        Coordinator[HybridQueryCoordinator\nTF-IDF Index Engine]
    end

    subgraph Data & Cloud Persistence
        TiDB[TiDB Cloud Serverless\nHigh Availability MySQL Cluster\nConnection Pool: 5-20]
        AdminDash[Admin Knowledge Dashboard\nResolution & Publishing]
    end

    Browser -->|HTTPS / Assets| Vercel
    Browser -->|POST /api/agent/chat\nJWT Bearer| Railway
    Railway --> AgentRouter
    AgentRouter --> Coordinator
    Coordinator -->|Authorized Tools| TiDB
    AdminDash -->|Review / Publish| TiDB
```

---

## 2. Environment Configuration Matrix

### 2.1. Backend Production Environment Variables (`.env.production`)
The backend FastAPI application requires the following validated production environment settings:

| Variable Name | Required Value / Format | Security & Purpose |
| :--- | :--- | :--- |
| `IS_PRODUCTION` | `True` | Activates fail-closed security, PII strict masking, and test fixture isolation. |
| `JWT_SECRET_KEY` | High-entropy 64+ char secret string | Cryptographic signing key for HS256 tokens. Must be kept secret. |
| `JWT_ALGORITHM` | `HS256` | Explicit algorithm pinning to avoid algorithm-switching exploits. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime for authenticated sessions. |
| `DB_HOST` | `gateway01.ap-south-1.prod.aws.tidbcloud.com` | TiDB Cloud serverless host endpoint in India (Mumbai AWS). |
| `DB_PORT` | `4000` | TiDB Cloud standard connection port. |
| `DB_USER` | Production authorized database username | Restricted database user with read/write to agent tables only. |
| `DB_PASSWORD` | Encrypted high-entropy password | Production database credential. |
| `DB_NAME` | `payent_production` | Production database name. |
| `DB_SSL_CA` | `/etc/ssl/certs/ca-certificates.crt` | SSL/TLS certificate authority bundle for secure encrypted transport. |
| `LOG_LEVEL` | `INFO` | Structured JSON log output level. |

### 2.2. Frontend Production Environment Variables (`.env.production`)

| Variable Name | Required Value / Format | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://api.payent.in` | Base URL for FastAPI backend endpoints. |
| `VITE_ENABLE_CHATBOT` | `true` | Feature flag to render `HelpChatbot.tsx`. |
| `VITE_ENVIRONMENT` | `production` | Production build mode disabling dev console loggers. |

---

## 3. Hosting & Infrastructure Deployment Specifications

### 3.1. Backend Hosting: Railway Platform
- **Base Image**: `python:3.12-slim` (or `python:3.14-slim`).
- **Web Server Command**:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4 --proxy-headers --forwarded-allow-ips='*'
  ```
- **Health Checks**:
  - Liveness probe: `GET /health` (Expects HTTP 200 `{"status": "healthy"}`).
  - Readiness probe: `GET /api/agent/stats` (Confirms knowledge index is warmed up).
- **Auto-restart Policy**: `on-failure` (max 5 retries).

### 3.2. Frontend Hosting: Vercel Platform
- **Framework**: Vite + React + TailwindCSS.
- **Build Command**: `pnpm build` (or `npm run build`).
- **Output Directory**: `dist/`.
- **Security Headers**:
  - `Content-Security-Policy`: Disallows unauthorized external scripts.
  - `X-Frame-Options`: `DENY` (prevents clickjacking attacks).
  - `X-Content-Type-Options`: `nosniff`.

### 3.3. Database: TiDB Cloud Serverless (Mumbai, AWS)
- **High Availability**: Multi-Availability Zone replication.
- **Connection Limits**: Default serverless autoscaling handling up to 500 concurrent connections.
- **Backup Schedule**: Automated daily snapshot backups with 7-day point-in-time recovery (PITR).

---

## 4. Observability, Logging & Alerting

1. **Structured Logging**:
   - Every request logs: timestamp, `session_id`, obfuscated user (`usr_***`), route taken (`GUIDE`, `LIVE_DB`, `HYBRID`, `ACTION`), intent, latency, and HTTP status.
   - PII filter runs automatically before log emission; no PAN, Aadhaar, PIN, or password can appear in stdout.
2. **Key Metric Alarms**:
   - **Error Rate Alarm**: Alert triggered if HTTP 5xx responses exceed 1% over a 5-minute window.
   - **Rate Limit Abuse Alarm**: Alert triggered if HTTP 429 responses exceed 50 in 1 minute (indicates bot probing).
   - **Database Connection Degradation**: Alert triggered if fallback degraded mode activates for $> 60\text{ seconds}$.

---

## 5. Rollback & Disaster Recovery Procedures

If an unexpected production issue arises post-deployment:
1. **Instant Railway Rollback**: Railway supports one-click rollback to the previous deployment artifact in $< 30\text{ seconds}$.
2. **Git Release Tags**:
   - `v1.0.0-rc1` $\rightarrow$ Target release.
   - `v0.9.8-stable` $\rightarrow$ Validated rollback commit.
3. **Database Schema Rollback**:
   - No breaking DDL modifications were introduced in this release. All queries maintain 100% backward compatibility with prior versions.
4. **Feature Flag Kill Switch**:
   - If the agent needs to be temporarily paused without redeploying the app, setting `VITE_ENABLE_CHATBOT=false` in Vercel disables the floating widget immediately.

---

## 6. Pre-Flight Production Checklist

- [x] Full code audit completed across all agent components.
- [x] 79 / 79 End-to-End assertions passing.
- [x] 20 / 20 Staging integration & security tests passing.
- [x] 288 / 288 Backend regression unit tests passing.
- [x] Rate limiting active and verified (HTTP 429).
- [x] Strict JWT authentication and JTI revocation verified.
- [x] PII regex masking and record sanitization verified.
- [x] Row-level multi-tenant isolation verified.
- [x] Latency verified ($2.61\text{ ms}$ avg, $4.36\text{ ms}$ P95).
- [x] Degraded database fallback verified.
- [x] Test fixture isolation enabled in production mode (`IS_PRODUCTION=True`).
- [ ] **Explicit Human Approval Received for Production Deployment** *(Pending Admin Action)*.

---

## 7. Deployment Readiness Verdict

The paYent AI Agent has successfully completed all technical verification, security hardening, and performance benchmarking milestones.

**Current Classification:** **READY FOR PRODUCTION APPROVAL**  
*(Deployment will only proceed upon receipt of explicit human authorization.)*
