# Payent Tech-Gear Rental Marketplace

This repository contains the premium peer-to-peer tech gear rental platform, featuring a React 19 + TanStack Start + Vite 8 frontend and a FastAPI + TiDB Cloud backend.

---

## Admin Dashboard API & Data Persistence

The admin portal dashboard (`/admin`) is fully backed by the FastAPI backend server (`/api/admin/*`) and persists all details to the TiDB Cloud MySQL instance.

### Data Model & Sync Design

- **Users & Agents**: Agents are retrieved dynamically from the `users` table based on roles (`agent` or `lender`) or active product listings. Update, delete, suspend, and activate requests are processed and persisted in the MySQL database.
- **Products & Categories**: Features like product approval/rejection, visibility hiding, and promotional feature flags are saved. Product documents and images arrays are serialized as JSON strings in the MySQL schema.
- **Bookings & Payments**: Orders created on the public renter portal sync with the `payments` table. Admin actions like booking cancellation, completions, and transaction refunds directly update both order statuses and UPI/Card transaction records in MySQL.
- **Support Tickets, Product Reports, & Reviews**: Support requests, user tickets, and reported listings read and write real entries in the database. Product suspensions and user bans instantly execute cascade updates on listings and roles.
- **Settings & Settings Profiles**: Site configurations (contact emails, banner texts, SEO titles) are managed through a persistent `admin_settings` row.
- **Activity Logs**: Administrative operations trigger an audit record inserted into the `admin_logs` table.

---

## How to Run & Verify

1. **Start Backend**:
   - Execute `backend/run.bat` (Windows) or `backend/run.sh` (Linux/macOS) to boot the FastAPI uvicorn server on `http://127.0.0.1:8001`.
   - On startup, the script automatically verifies and connects to the MySQL / TiDB instance (credentials loaded from `.env`).

2. **Start Frontend**:
   - Run `npm install` and then `npm run dev` to start the local development server.
   - Go to `http://localhost:5173`.

3. **Verify Connection**:
   - Register your admin account at `/register` using your `ADMIN_SETUP_CODE`.
   - Log in to the admin panel using your registered admin credentials.
   - The Topbar connects directly to the live server.

---

## Production Deployment Architecture

The platform is configured for production hosting with the following stack:
- **Frontend**: Cloudflare Workers (TanStack Start / React 19 SSR via `@cloudflare/vite-plugin` & `wrangler.jsonc`)
- **Backend**: Railway (FastAPI ASGI Service via `railway.json` & `Dockerfile`)
- **Database**: TiDB Cloud (Serverless MySQL with verified TLS `ssl.CERT_REQUIRED`)
- **Payments**: Razorpay Verified HMAC Webhooks (`/api/payments/webhook`)

---

## Security Architecture & Status

- **Edge Layer (Cloudflare)**:
  - ✅ **Cloudflare CDN**: Active edge delivery & immutable static asset caching.
  - ✅ **Cloudflare SSL/TLS**: Active automated edge certificate termination.
  - ✅ **Standard DDoS Mitigation**: Active L3/L4 unmetered edge protection for Cloudflare-proxied frontend traffic.
  - ❌ **Cloudflare WAF**: Not currently enabled or verified. (Future production-hardening option; note that because the backend API is currently accessed directly via its Railway domain without a custom domain edge proxy, Cloudflare WAF does not protect direct Railway API traffic).
  - ❌ **Cloudflare Bot Fight Mode**: Not currently enabled or verified.
- **Application Layer (FastAPI / Railway)**:
  - ✅ **Authentication**: Cryptographic JWT access tokens (30m) & database-backed refresh token rotation (7d).
  - ✅ **Authorization**: Strict role-based access control (`admin`, `customer`, `vendor`) and account approval guards.
  - ✅ **CORS**: Explicit whitelist restricting cross-origin access to verified Cloudflare frontend origins.
  - ✅ **Rate Limiting**: Database-backed lockout on login (IP/User), registration, and password recovery endpoints.
  - ✅ **Data Validation**: Pydantic v2 schemas validating all inputs (including PAN and Aadhaar formats).
  - ✅ **Security Headers**: HSTS, Content-Security-Policy, X-Frame-Options (DENY), X-Content-Type-Options (nosniff).
- **Database Layer (TiDB Cloud)**:
  - ✅ **Verified TLS**: PyMySQL configured with `ssl.CERT_REQUIRED` and `check_hostname = True`.
  - ✅ **Backend-Only Access**: Zero direct database access from frontend; all queries executed via parameterized SQL.

For step-by-step instructions on setting up environment variables and deploying, see [docs/deployment-guide.md](docs/deployment-guide.md).
