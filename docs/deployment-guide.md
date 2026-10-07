# Payent Platform Deployment Guide

This guide details the process for deploying the **Payent** tech gear rental platform using the verified production architecture:

```
Cloudflare Workers (TanStack Start SSR Frontend) ➔ Railway (FastAPI Backend) ➔ TiDB Cloud (MySQL Database) ➔ Payment Gateway (Verified Webhooks)
```

---

## Architecture Overview

1. **Database**: **TiDB Cloud** (Serverless MySQL)
   - Fully managed MySQL-compatible cloud database.
   - Requires verified SSL/TLS connection with `ssl.CERT_REQUIRED` and `check_hostname=True`.
2. **Backend**: **Railway** (FastAPI ASGI Web Service)
   - Deployed via Dockerfile (`Dockerfile`) pointing to `backend/start.py`.
   - Handles API routes, JWT authentication, PyMySQL connection pooling with PooledDB, database-backed rate limiting, and Razorpay HMAC-SHA256 webhooks.
   - Healthcheck endpoint: `/api/health`.
3. **Frontend**: **Cloudflare Workers** (TanStack Start / React 19 SSR)
   - Edge SSR application deployed via `@cloudflare/vite-plugin` and `wrangler.jsonc`.
   - Automated deployment managed via GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`).
4. **Payment Gateway**: **Razorpay** (Live/Test Webhook Engine)
   - Configured with signature verification (`X-Razorpay-Signature`) against `RAZORPAY_WEBHOOK_SECRET`.

---

## Security Model & Status

| Layer | Feature | Status | Details |
|---|---|---|---|
| **Edge (Cloudflare)** | Cloudflare CDN | ✅ Active | Static assets cached globally at the edge. |
| **Edge (Cloudflare)** | Cloudflare SSL/TLS | ✅ Active | Automated edge certificate termination. |
| **Edge (Cloudflare)** | Standard DDoS | ✅ Active | Layer 3/4 unmetered edge protection for Cloudflare-proxied frontend traffic. |
| **Edge (Cloudflare)** | Cloudflare WAF | ❌ Not Enabled | Not currently enabled or verified. Does not protect direct Railway API traffic. |
| **Edge (Cloudflare)** | Bot Fight Mode | ❌ Not Enabled | Not currently enabled or verified. |
| **Backend (FastAPI)** | JWT & Token Rotation | ✅ Active | Cryptographic HS256 tokens + 7-day refresh token rotation with DB revocation. |
| **Backend (FastAPI)** | Strict CORS | ✅ Active | Restricts cross-origin requests to explicit Cloudflare frontend origins. |
| **Backend (FastAPI)** | Rate Limiting | ✅ Active | Database-backed lockout for login (IP/User), registration, and password recovery. |
| **Backend (FastAPI)** | Input Validation | ✅ Active | Pydantic v2 schemas with Indian PAN and Aadhaar format checks. |
| **Backend (FastAPI)** | Security Headers | ✅ Active | HSTS, Content-Security-Policy, X-Frame-Options (DENY), nosniff. |
| **Database (TiDB)** | Verified TLS | ✅ Active | Enforced `ssl.CERT_REQUIRED` and `check_hostname=True`. |
| **Database (TiDB)** | Backend Isolation | ✅ Active | Frontend never directly connects to TiDB Cloud; all queries use parameterized SQL. |

---

## Step 1: Set Up TiDB Cloud Database

1. Sign in to [TiDB Cloud](https://tidbcloud.com/).
2. Create a Serverless cluster (e.g. `payent-marketplace-db`).
3. Under **Connect** -> **Standard Connection**:
   - Note down the **Host** (e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`), **Port** (`4000`), **User**, and **Password**.
4. Database name: `payent_marketplace_db`.

---

## Step 2: Deploy Backend to Railway

1. Sign in to [Railway.app](https://railway.app/).
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select your repository.
4. Railway will detect `railway.json` and use the root `Dockerfile`.
5. Under **Variables** in your Railway service settings, configure the following production environment variables:

| Variable Name | Description |
|---|---|
| `ENV` | `production` |
| `IS_PRODUCTION` | `true` |
| `JWT_SECRET_KEY` | High-entropy 64-char hex key (generate via `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `ADMIN_SETUP_CODE` | Your secure admin registration key |
| `ADMIN_CREATION_SECRET` | Your secure bootstrap admin creation secret |
| `MYSQL_HOST` / `TIDB_HOST` | Your TiDB Cloud cluster host |
| `MYSQL_PORT` / `TIDB_PORT` | `4000` |
| `MYSQL_USER` / `TIDB_USER` | Your TiDB Cloud username |
| `MYSQL_PASSWORD` / `TIDB_PASSWORD` | Your TiDB Cloud password |
| `MYSQL_DB` / `TIDB_DATABASE` | `payent_marketplace_db` |
| `MYSQL_SSL` / `TIDB_SSL` | `true` |
| `ALLOWED_ORIGINS` | `https://frontend.bommidimohan2003.workers.dev,https://payent.in,https://www.payent.in` |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxxxxxxxxxxx` (or test key) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Your Razorpay webhook secret |

6. Generate a Domain under **Settings** ➔ **Networking** (e.g. `https://payernt-production.up.railway.app`).
7. Verify deployment health at `https://payernt-production.up.railway.app/api/health`.

---

## Step 3: Deploy Frontend to Cloudflare Workers

1. Ensure `.github/workflows/deploy-frontend.yml` has the repository secrets configured:
   - `CLOUDFLARE_API_TOKEN`
2. The GitHub Actions workflow builds the TanStack Start bundle with `@cloudflare/vite-plugin` and deploys via Wrangler.
3. In `frontend/wrangler.jsonc`, `VITE_API_URL` points to `https://payernt-production.up.railway.app`.

---

## Step 4: Configure Razorpay Webhooks

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** ➔ **Webhooks** ➔ **Add New Webhook**.
3. **Webhook URL**: `https://payernt-production.up.railway.app/api/payments/webhook`
4. **Secret**: Enter the exact secret string you set in Railway under `RAZORPAY_WEBHOOK_SECRET`.
5. **Active Events**: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
6. Save Webhook.

---

## Verification & Post-Deployment Checklist

- [ ] **Backend Health Probe**: `GET https://payernt-production.up.railway.app/api/health` returns `200 OK` with JSON status.
- [ ] **Database Connectivity**: Verified TLS connection to TiDB Cloud with all existing accounts preserved.
- [ ] **Frontend Routing**: Direct navigation to `/admin`, `/catalog`, and `/dashboard` loads on Cloudflare Workers.
- [ ] **Authentication & CORS**: Login and token validation execute with strict origin validation.
