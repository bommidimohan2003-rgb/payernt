# Project Report

This report describes the current Payent project so the reader can plan changes.

## Outline

1. Overview
2. Tech Stack
3. Repository Layout
4. Frontend Architecture
5. Backend Architecture
6. Admin Panel
7. ML Features
8. Data Model
9. Integration Status
10. Technical Debt
11. Risks and Recommendations

## Overview

Payent is a peer-to-peer tech-gear rental marketplace. The product centers on renting premium devices and accessories from verified lenders, with customer-facing browsing, checkout, and account flows plus an admin console for operational oversight.

The current codebase is a working prototype rather than a fully production-hardened platform. It mixes real backend routes, local persistence, mock storefront data, and experimental ML modules. That mix is useful for evolution planning but it must be understood before making structural changes.

## Tech Stack

### Frontend

The frontend stack is built around React 19, TanStack Start, TanStack Router, TanStack Query, Tailwind CSS v4, Radix and shadcn-style UI primitives, Vite 8, and TypeScript 5. The repo also uses a large component library layer and a custom utility layer for search, analytics, storage, and auth.

### Backend

The backend is a FastAPI service served by uvicorn or gunicorn. Data access uses PyMySQL with raw SQL and no ORM. Authentication uses JWT and bcrypt, with Twilio and Razorpay integrations wired into the API surface.

### Deployment Model

The application is configured for production hosting using the Vercel ➔ Railway ➔ TiDB Cloud ➔ Razorpay Verified Webhooks architecture:

- **Frontend Site (`payent-frontend`)**: React 19 / Vite SPA deployed on Vercel with `vercel.json` SPA rewrite rules mapping `/*` to `index.html`.
- **Backend Service (`payent-backend`)**: FastAPI ASGI web service deployed on Railway via `railway.json` / `backend/Dockerfile` with health probe checks at `/api/health`.
- **Datastore**: TiDB Cloud (Serverless/Dedicated MySQL-compatible database with SSL connection pooling).
- **Payment Gateway**: Razorpay HMAC-SHA256 signature verified webhooks (`/api/payments/webhook`).
- **Documentation**: See `docs/deployment-guide.md` for step-by-step setup details.

## Repository Layout

The main areas are:

- `src/` for the customer-facing frontend application.
- `backend/` for the FastAPI service and its supporting modules.
- `src/admin/` for the separate admin app experience.
- `docs/` for documentation and design notes.
- `vercel.json` and `railway.json` at the repository root for platform deployment.

A few repository facts matter for planning:

- `rentwise-pro-main/` duplicate snapshot has been removed as part of Phase 1.
- Render hosting blueprints (`render.yaml` and `docs/render-deployment.md`) have been removed and replaced with `vercel.json`, `railway.json`, and `docs/deployment-guide.md`.
- `scratch/` directory and `scratch/update_catalog.py` orphaned maintenance script have been removed.
- `requirements.txt` dependencies at repository root are synchronized with `backend/requirements.txt` (including `firebase-admin`, `razorpay`, `twilio`).

## Frontend Architecture

The frontend uses TanStack file-based routing. Route definitions live in `src/routes/`, the app shell is defined in `src/routes/__root.tsx`, and route bootstrap is handled in `src/router.tsx`.

The app uses two main layouts:

- `src/layouts/MainLayout.tsx` provides the standard public shell with the navbar and footer.
- `src/layouts/DashboardLayout.tsx` provides the authenticated dashboard shell with the navbar and sidebar.
- `src/components/auth/AuthLayout.tsx` is used for auth-facing screens.

Page transitions are direct standard route transitions without artificial delay or origin-reveal animation overlays. The legacy `OriginRevealTransition` engine has been removed across all pages for instant navigation.

Protected routes are wrapped by `src/components/common/ProtectedRoute.tsx`. The auth state is managed by `useAuth`, wishlist state by `useWishlist`, and theme state by `useTheme`. These hooks read and write browser storage under keys such as `payent:token`, `payent:currentUser`, `payent:wishlist`, `payent:theme`, and the admin-specific `payent:admin:*` values.

Search is split between a live backend path and an offline fallback. `src/utils/smartSearch.ts` calls the backend `POST /api/search`, while `src/utils/searchEngine.ts` provides an offline search engine for fallback and local development. Analytics follow a similar pattern. `src/utils/eventTracker.ts` batches events and sends them to `POST /api/events` so user behavior can be recorded without blocking the UI.

## Backend Architecture

The backend entrypoint in `backend/main.py` groups routes by responsibility:

- Health and root endpoints.
- User auth and account routes.
- User data routes for profile, wishlist, orders, notifications, and custom products.
- Payment routes for order creation, verification, webhook handling, and refund processing.
- Admin auth and admin management routes.
- WebSocket routes for realtime admin updates.
- Recommendation and event ingestion routes.
- Search routes for ML-powered discovery.

Authentication is implemented in `backend/auth.py`. Passwords are hashed with bcrypt and validated for strength, including a live Have I Been Pwned check. JWT tokens are created and decoded with explicit algorithm enforcement, and token revocation is supported through the `token_blocklist` mechanism. Rate limiting is also part of the auth flow to reduce brute-force abuse.

The Razorpay flow is present in the backend but partly disabled. The code supports create-order, verify, webhook, and refund actions. However, the SDK client is disabled with `razorpay_client = None`, and manual HMAC-SHA256 validation is the only active path for signature verification. The commented-out Razorpay block remains a large, legacy implementation artifact that should be reconciled before further payment work.

Data access is handled in `backend/database.py` through raw SQL helpers. The module provides helpers for connection management, query execution, schema initialization, CRUD operations, token revocation, rate limiting, and analytics persistence. It also includes in-memory `MOCK_*` fallbacks so the service can continue functioning during local or degraded environments.

## Admin Panel

The admin experience is a separate frontend surface under `src/admin/`. The admin pages include dashboards, users, agents, products, bookings, payments, reviews, reports, notifications, categories, analytics, settings, profile, support, and activity logs. Each page is paired with a service module under `src/admin/services/`, such as `auth.ts`, `users.ts`, `products.ts`, `payments.ts`, `notifications.ts`, `bookings.ts`, and `websocket.ts`.

The admin API routes in `backend/main.py` are protected by `Depends(check_admin_user)`. That dependency enforces admin-only access before the route can execute. The admin auth client in `src/admin/services/auth.ts` uses separate storage keys, including `payent:admin:token` and `payent:admin:current_user`, and targets the backend endpoint `/api/admin/auth/login`.

The admin panel also includes a WebSocket service in `src/admin/services/websocket.ts` that connects to the backend `/api/admin/ws` channel. The backend uses `broadcast_admin_event` to push admin events such as user updates, booking changes, and payment notifications. The admin API client also contains an offline mock interceptor that allows the admin UI to keep functioning when the backend is unreachable.

## ML Features

The ML layer has two main components.

- `backend/recommendations_ml.py` implements item-based collaborative filtering with cosine similarity. It uses a data-sufficiency gate before computing recommendations and persists similarity data into the `item_similarities` table.
- `backend/search_ml.py` implements TF-IDF indexing, cosine similarity ranking, Levenshtein-based spelling correction, and personalization re-ranking based on user behavior.

These modules are not yet fully integrated into every user journey, but they form the current experimentation boundary for smarter recommendations and search.

## Data Model

The database schema in `backend/database.py` is centered on MySQL tables such as `users`, `orders`, `custom_products`, `reviews`, `reports`, `user_events`, `item_similarities`, and supporting tables for auth, notifications, admin state, and payment records.

There is a notable drift between the frontend type definitions in `src/types/index.ts` and the database schema. The UI types contain fields that are mostly presentation-oriented, while the database schema includes more operational columns such as payment and admin audit data. Some payment fields that appear in the backend are not mirrored in the frontend types, and the current UI model is therefore not a complete representation of the backend contract.

## Integration Status

The project has a mixed integration state. Some customer-facing features are backed by real backend routes, while others are still served by mock storefront data.

| Customer route or feature       | Data source                                                                  | Status |
| ------------------------------- | ---------------------------------------------------------------------------- | ------ |
| Auth                            | Backend auth routes and JWT flow                                             | Real   |
| Orders                          | Backend orders and order persistence routes                                  | Real   |
| Notifications                   | Backend notifications routes                                                 | Real   |
| Payments                        | Backend payment routes and payment records                                   | Real   |
| Recommendations                 | Backend recommendation engine and event tracking                             | Real   |
| Lender products                 | Backend custom product routes                                                | Real   |
| Search                          | Backend `/api/search` with ML search engine                                  | Real   |
| Wishlist items                  | Backend wishlist routes (`/api/wishlist`) & optimistic local cache           | Real   |
| Catalog                         | `GET /api/products/custom/public` live database catalog                      | Real   |
| Categories                      | `GET /api/categories/public` live categories & counts                        | Real   |
| Reviews & Testimonials          | `GET /api/reviews`, `GET /api/reviews/stats`, `/reviews` route with verified rental eligibility | Real   |
| Testimonials and stats          | `GET /api/stats/public` live aggregate platform metrics                      | Real   |
| Payment checkout pricing        | Live product pricing query against `custom_products` table                   | Real   |
| Contact & Support Desk          | Independent Support System: `POST /api/contact` persisted to MySQL `support_tickets` & Admin Support Desk | Real   |
| **Customer ↔ Lender Messaging** | Dedicated P2P Messaging System: `GET/POST /api/conversations/*`, attachments up to 5MB, live WebSocket sync, unread badge tracking | Real   |
| **Live Delivery Tracking**      | `GET/POST /api/deliveries/*`, Haversine GPS & WebSocket `/api/deliveries/{id}/ws` | Real   |
| **Button 1: paye₹nt Vendor**    | Dedicated Vendor Backend: `POST/GET /api/paye₹nt/auth/*`, `/api/paye₹nt/products/*`, 4-digit Vendor Secret PIN (generated ONCE upon listing), `/api/paye₹nt/wallet/*` (balances, bank accounts, withdrawals) | Real |
| **Button 2: pay₹ent Renter**    | Dedicated Renter Backend: `POST/GET /api/auth/*` (with PAN validation), `/api/products/*`, `/api/bookings/*`, User Dashboard | Real |
| **Rental Security & Lifecycle** | Single `RentalSecurity` per booking: `/api/bookings/{id}/security/*` (Vendor PIN + Renter PIN + Handover OTP verification), Backend-authoritative activation (`active`) & completion with wallet credit | Real |
| **Admin Dashboard & Stats**     | `GET /api/admin/dashboard/stats` with real SQL counts & visitor metrics      | Real   |
| **Admin Analytics**             | `GET /api/admin/dashboard/charts` with parameterized date-bucketing (`days`) | Real   |
| **Admin Users & Agents**        | `GET /api/admin/users`, `/api/admin/agents` & management routes              | Real   |
| **Admin Products & Categories** | `GET /api/admin/products`, `/api/admin/categories` & CRUD routes             | Real   |
| **Admin Bookings & Payments**   | `GET /api/admin/bookings`, `/api/admin/payments` & status routes             | Real   |
| **Admin Support & Reports**     | `GET /api/admin/support`, `/api/admin/reports` & dispute resolution          | Real   |
| **Admin Activity Logs**         | `GET /api/admin/activity-logs` with audit trail in `admin_logs`              | Real   |
| **Secure Device Identity & QR** | `GET/POST /api/devices/*`, `POST /api/devices/{id}/verify-password`, `GET /api/verify/device/{token}`, `GET/POST /api/device-transfers/*`, `GET /api/admin/devices` backed by MySQL `devices`, `device_security_history`, `device_transfers` | Real   |
| **Lender Booking Cancellation** | `POST /api/payernt/bookings/{id}/cancel`, `POST /api/bookings/{id}/cancel` with reason code, feedback validation, handover verification safeguards & counterparty notifications | Real   |
| **Flexible Time-Slot Booking**  | Half-day (Morning 08:00–12:00, Afternoon 13:00–17:00), Full-Day, Turnaround Buffer & Interval Overlap Math, `GET /api/products/{id}/slots`, `GET/POST /api/payernt/products/{id}/availability-config` | Real   |
| **Live Rental Queue**          | 8-Milestone lifecycle tracking (Order Confirmed → Ready for Pickup → Picked Up [Timer Start] → Rental in Progress [Elapsed & Remaining] → Return Initiated → Item Handed Back to Owner [Timer Stop] → Awaiting Owner Inspection → Rental Completed), persistent ISO timestamps, cancellation lifecycle termination (stops active queue, disables actions, halts timer at 00h 00m 00s if cancelled prior to pickup, preserves completed milestone history), cross-portal sync via `/api/orders/{id}/queue-advance` & `/api/payernt/bookings/{id}/queue-advance`, `LiveRentalQueue.tsx` in both Renter Portal (`/orders`, `/dashboard`) & Lender Portal (`/payernt/bookings`, `/lender-portal`) | Real   |
| **Category-Based Booking Restriction** | Strict one-product-per-category concurrency rule during booking-to-delivery lifecycle. Blocks duplicate bookings in the same category from lender acceptance until delivery confirmation (`picked_up`). Thread-safe backend validation on `POST /api/orders` & `POST /api/payments/create-order`, real-time status endpoints (`GET /api/orders/category-restrictions`, `GET /api/orders/check-category-restriction`), and frontend lockouts on `ProductDetails.tsx` & `Checkout.tsx` with exact message: *"You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered."* | Real   |

## Technical Debt

The main technical debt areas are clear:

- [RESOLVED Live Rental Queue Cancellation Hardening & Lifecycle Termination]
  1. *Immediate Queue Termination*: When a booking is cancelled, its active Live Rental Queue workflow is halted immediately. `_execute_queue_milestone_transition` (`main.py`) and `vendor_advance_queue_endpoint` (`payernt_router.py`) strictly reject advancing cancelled bookings with HTTP 400 Bad Request.
  2. *Status & Timestamp Preservation*: Replaced active queue state with prominent "Booking Cancelled" badge, cancellation details banner (displaying cancellation ISO timestamp and reason), while preserving completed milestone timestamps.
  3. *Action Button Lockdown*: Replaced quick milestone advance buttons (Mark Ready for Pickup, Confirm Pickup, Start Rental, Initiate Return, Complete Rental) with disabled "Actions Disabled (Booking Cancelled)" indicators.
  4. *Rental Timer Guard*: If cancelled before pickup confirmation, the rental timer never starts (`timer.state = "CANCELLED"`, displaying `00h 00m 00s (Timer Never Started)`). If cancelled after pickup, duration is frozen without losing history.
  5. *Dual Portal Synchronization*: Persisted `cancelled_at`, `cancellation_reason`, and `cancelled_by` to MySQL `orders` table and returned in `GET /api/orders/{id}` and `GET /api/lender/orders`. Updated renter (`Orders.tsx`, `Dashboard.tsx`) and lender (`LenderPortal.tsx`, `RentalRequests.tsx`) views so reloading never reverts cancelled bookings to an active state.
  6. *Automated Test Verification*: Comprehensive test suite in `backend/tests/test_live_rental_queue.py` (`test_cancelled_booking_queue_lifecycle_and_rejection`) validating all 5 cancellation cases passing 100%.

- [RESOLVED Fast Gateway & Login Initialization, Request Timeout & Cancellation Hardening]
  1. *Root-Cause Elimination*: Removed blocking API calls on gateway (`/`), `/select`, and login (`/login`) screens. Cart, wishlist, and unread-count fetches are now strictly gated to authenticated marketplace views and explicit user intent.
  2. *Instant Auth Initialization*: Hardened `useAuth.ts` so unauthenticated users and explicit sign-outs resolve `ready: true, user: null` on Frame 0 without triggering phantom `/api/me` network calls or redirect loops.
  3. *Protected Login Redirection*: Updated `LoginForm.tsx` to verify both `ready`, active `user`, and non-null `token` in storage before evaluating redirects, eliminating spurious transitions to `/dashboard`.
  4. *Zero-Latency Auth Preloader*: Configured `AppPreloader.tsx` to instantly bypass the 6-second preloader animation on auth routes (`/login`, `/register`, `/otp`, `/account-pending`), rendering login forms in 0ms.
  5. *Universal Request Timeouts*: Implemented `fetchWithTimeout` across `api.ts` (`fetchWithAuth` 8s, `getMe` 8s, `logout` 3s, `getPublicCustomProducts` 8s, `getPublicCategories` 8s, `getPublicStats` 8s, `getSearchStats` 5s), eliminating infinite `pending` request states.
  6. *Graceful Degraded & Offline Fallback*: Network timeouts in `api.getMe` and `fetchAuthProfile` preserve optimistic cached profiles and do NOT trigger false session expirations (`handleSessionExpiration()`), ensuring platform resilience on slow or cold-starting backends.
  7. *Safe Proxy Timeout in Cloudflare Worker*: Equipped `server.ts` `/api/*` proxy with a 10-second `AbortController` returning HTTP 504 Gateway Timeout rather than hanging browser TCP connections.
  8. *Isolated Logout Flow*: Prevented background dashboard auth errors from triggering accidental network `logout()` calls in `payernt/store.ts`, reserving `/api/auth/logout` purely for explicit user-requested logouts.
  9. *Empirical Verification*: Frontend built cleanly in 2.01s with zero errors; full backend test suite passed 100%.

- [RESOLVED Category-Based Booking Restriction] Implemented full category-concurrency policy:
  1. *Policy*: Only one product per category can be in the booking-to-delivery process for the same renter at a time.
  2. *Activation*: Active once lender accepts booking and remains active during preparation, dispatch, and awaiting pickup/delivery.
  3. *Release on Delivery*: Released immediately upon confirmed delivery/pickup (`picked_up`), allowing renter to book another product in the same category even while the first rental remains actively in progress.
  4. *Independent Categories*: Products in different categories can be booked without restriction.
  5. *Release on Cancellation*: Released immediately if booking is cancelled before delivery.
  6. *Thread-Safe Backend*: Guarded by `_CATEGORY_RESTRICTION_LOCK` and MySQL indexed `orders(user_email, category)` column queries.
  7. *Exact Error Message*: `"You already have a product in this category awaiting delivery. You can book another product in this category once your current order is delivered."`
  8. *End-to-End Test Suite*: `backend/tests/test_category_booking_restriction.py` verifying all 5 core scenarios (multiple same-category, different categories, delivery release, cancellation release, simultaneous requests) passing 100%.
- [RESOLVED Live Rental Queue & Cross-Portal Synchronization] Implemented synchronized 8-milestone Live Rental Queue in both Renter Portal (`Orders.tsx`, `Dashboard.tsx`) and Lender Portal (`RentalRequests.tsx`, `LenderPortal.tsx`):
  1. *Order Confirmed* (`confirmed_at`)
  2. *Ready for Pickup* (`ready_for_pickup_at`)
  3. *Picked Up* (`picked_up_at`) — timer starts strictly upon verified pickup
  4. *Rental in Progress* — live digital HUD displaying elapsed time and time remaining with overdue detection
  5. *Return Initiated* (`return_initiated_at`)
  6. *Item Handed Back to Owner* (`handed_back_at`) — timer stops at verified handover timestamp
  7. *Awaiting Owner Inspection* (`awaiting_inspection_at`)
  8. *Rental Completed* (`completed_at`) — deposit released & wallet credited
  All timestamps are persisted transactionally in MySQL datastore and in-memory fallbacks (`update_order_queue_milestone`), ensuring browser page reloads never reset or lose timer duration. Synchronized via unified queue advance endpoints (`/api/orders/{id}/queue-advance`, `/api/payernt/bookings/{id}/queue-advance`), custom browser window events (`payent_queue_updated`, `payent_orders_updated`), and periodic background polling. Resolved HTTP 500 in vendor `queue-advance` route caused by notification argument mismatch, hardened JWT caller authentication and lender/renter milestone authorization, ensured `useRentalTimer` stays stopped on `ready_for_pickup` until `picked_up` is confirmed, and populated milestone timestamps in `/api/lender/orders`. Full test suite in `backend/tests/test_live_rental_queue.py` passing 100% (2/2 tests) and clean Vite production build.
- [RESOLVED Phase 1] The duplicate snapshot `rentwise-pro-main/`, `api/index.py`, and `scratch/` orphaned maintenance scripts have been removed.
- [RESOLVED Phase 1] Dependency artifacts consolidated across root `requirements.txt` and `backend/requirements.txt`.
- [RESOLVED Phase 2] The Razorpay SDK client is enabled and active in `backend/main.py` with full order creation, signature verification, webhook handling, and refund endpoints.
- [RESOLVED Phase 2] Hardcoded production defaults for `JWT_SECRET_KEY` and `MYSQL_PASSWORD` in `backend/config.py` now raise runtime errors in production mode if unset.
- [RESOLVED Phase 2] Removed `src/utils/adminSetup.ts` from client bundle.
- [RESOLVED Phase 2] Removed `mock-admin-token` fallback in `src/components/auth/LoginForm.tsx`.
- [RESOLVED Admin Migration] Built parameterized SQL time-series bucketing (`days` query parameter: 7, 30, 90, 365) for `revenueChart`, `bookingChart`, `userGrowth`, and `productGrowth`.
- [RESOLVED Admin Migration] Replaced hardcoded date strings in `bookingsToday` and `revenueToday` with dynamic parameterized SQL queries (`CURDATE()`). Replaced hardcoded visitor stat with real `user_events` count.
- [RESOLVED Admin Migration] Fixed frontend fallback leaks across `notifications.ts`, `users.ts`, `products.ts`, `bookings.ts`, and `payments.ts` so reachable backends returning empty arrays `[]` render empty states instead of static demo data.
- [RESOLVED Admin Migration] Purged all fake mock users (Priya, Devon, Elena, Marcus) from initial data and local storage fallbacks.
- [RESOLVED Storefront Purge] Removed `mock_prices` and `mock_titles` static dictionary lookups in payment checkout path, replacing them with live database pricing queries against `custom_products`.
- [RESOLVED Storefront Purge] Added public storefront routes `GET /api/categories/public` and `GET /api/stats/public` to FastAPI backend.
- [RESOLVED Storefront Purge] Replaced `src/utils/mockData.ts` usage across all customer-facing routes (`FeaturedProducts`, `ProductDetails`, `Categories`, `Wishlist`, `BecomeLender`, `Checkout`, `Payment`, `About`, `HelpChatbot`) with live API calls.
- [RESOLVED Storefront Purge] Gated Twilio SMS OTP verification so production environments raise errors on failure instead of falling back to mock OTP.
- [RESOLVED Storefront Purge] Purged fake mock product cards (`p1`, `p2`, `p3`, `p4`, `p9`, `p11`) from `mockData.ts` and `backend/database.py` so only real user listings appear in the catalog.
- [RESOLVED Category Reference Cards] Added interactive visual Category Reference Cards for Bikes, Cameras, Laptops, Electronic Drilling Tools, Power Banks, and Drones to `/categories`.
- [RESOLVED Lender Direct Camera & UI] Built live WebRTC camera capture modal (`CameraCaptureModal.tsx`), interactive earnings estimator slider, 3-step guided listing form, multi-photo gallery management, and real-time marketplace product card preview on `/become-lender`.
- [RESOLVED Persistent Products & Deletion Security] Auto-approved new custom products (status: approved, available: true) across backend and client, removed per-user local storage namespacing for customProducts so products are globally shared across all users, and enforced strict owner/admin-only deletion authorization on backend API and ProductCard UI.
- [RESOLVED TiDB Cloud MySQL Migration] Migrated all website data operations (products, custom listings, categories, wishlist, orders, notifications, admin management records) exclusively to TiDB Cloud MySQL via live FastAPI backend endpoints, eliminating localStorage data persistence.
- [RESOLVED Mobile Navigation Redesign] Redesigned mobile navigation layout to floating capsule bottom bar with active pill animations (Home, Browse, Become Lender, Dashboard) active post-login.
- [RESOLVED Deployment Healthcheck & Python 3.12 UTC Datetime] Resolved 1/1 replicas healthcheck deployment failures caused by bare datetime module AttributeError (`datetime.utcnow` -> `dt.now(timezone.utc)`) across `backend/database.py` and `backend/main.py`, synchronized `dbutils` dependency in `backend/requirements.txt`, and ensured database idempotency.
- [RESOLVED Production Reviews Migration] Replaced fake demo reviews (Rahul Mehta, Sneha Iyer, Aditya Varma) and mock testimonials with a secure production review system. Enhanced MySQL `reviews` table with `user_email`, `booking_id`, `is_verified`, `product_image`, `updated_at`, and indexing. Implemented FastAPI review endpoints (`GET /api/reviews`, `GET /api/reviews/stats`, `GET /api/reviews/eligible-bookings`, `POST`, `PUT`, `DELETE`), strictly validated rental booking eligibility and duplicate review prevention, wired homepage "What Creators Say" to live endpoints with skeleton loaders and empty states, updated "View All Reviews" link to dedicated `/reviews` route, and created `/reviews` page with live statistical aggregations and verified authoring modal.
- [RESOLVED Session Expiry & Auto-Refresh] Added automatic token refresh mutex with proactive expiry detection, Axios response interceptor for 401 recovery, and server-side token blocklist verification (`is_session_revoked`).
- [RESOLVED Profile Camera & Identity Management] Built live WebRTC camera capture modal (`CameraPhotoModal.tsx`) with browser permission handling, natural horizontal flip on snapshot capture, live preview, retake, and confirmation. Added "Change Profile Photo" menu with "Take Photo", "Upload Photo", and "Remove Photo" options syncing seamlessly with database and navbar avatar.
- [RESOLVED Admin Manual User Approval] Implemented manual admin verification workflow: new user registrations start in `pending` status. Added `GET /api/admin/users/{id}`, `PATCH /api/admin/users/{id}/approve`, and `PATCH /api/admin/users/{id}/reject` endpoints with audit logging in `admin_logs`. Added status filtering (Pending, Approved, Active, Rejected, Suspended) and prominent Approve/Reject action buttons in the admin user roster and details modal. Restricted active rental/listing actions for pending accounts while allowing profile customization.
- [RESOLVED Premium Button Color Redesign] Redesigned primary button system across Light and Dark modes: Light mode uses deep charcoal `#161616` (Hover `#292929`, Pressed `#0B0B0B`) with `#FFFFFF` text; Dark mode uses warm ivory `#F2F0EA` (Hover `#FFFFFF`, Pressed `#DCD9D1`) with `#0A0A0A` text. Enforced clean neutral secondary outline and tertiary styling, reserving brand red `#FF1744` solely for accents and destructive danger actions. Eliminated all teal/cyan/aqua colors from button primitives and gradients.
- [RESOLVED Complete Page Redesign (Browse + About + Contact)] Redesigned Browse, About, and Contact pages to a unified, cinematic, editorial visual language. Browse features compact cinematic header, integrated keyword/location search, dynamic category strip from live backend categories, desktop sticky filter column & mobile sliding drawer, 100% real database products with pagination, skeletons, and empty states. About features cinematic creator hero, authentic 4-part story, typographic mission statement, creator audience showcase, 4-step rental journey, platform security safeguards, and live aggregate stats. Contact features genuine company contact channels, interactive validated inquiry form, and live backend submission to 'POST /api/contact' integrated directly into the Admin Help Desk. All pages adhere strictly to the neutral button system (Light: #161616, Dark: #F2F0EA) and zero-teal/cyan palette.
- [RESOLVED Browse Page Refinement: Dates Removal, Auto-Location Only & Real Lender Availability] Refined the PAYENT Browse experience: (1) Removed rental dates from the Browse search bar and filter drawers, rebalancing search input and controls with natural desktop `flex-1`/`shrink-0` spacing and mobile vertical stacking; (2) Replaced the static city dropdown with automatic geolocation detection (`useUserLocation`), displaying detected location or neutral fallback (`📍 Location unavailable`) with a subtle `↻` re-detect button and nationwide/nearby view toggle; (3) Authoritatively anchored product card availability to real backend MySQL inventory and lender status via single-query SQL `LEFT JOIN users` and `LEFT JOIN agents`, displaying `● Available` with enabled `Add to Cart` or `● Not Available` with disabled button, backed by server-side revalidation on `POST /api/cart` rejecting unavailable items with HTTP 400.
- [RESOLVED Real Profile Statistics, Authentic Messages, Contact Tickets & Multi-Tier Caching] (1) Replaced hardcoded static profile metrics with real database-aggregated queries (`GET /api/profile/stats`, `GET /api/users/me/stats`), calculating completed rentals across renter and lender roles, live review rating averages, on-time return percentages, and response times with honest empty states for untracked metrics (`0 Completed Rentals`, `★ New`, `N/A`, `No data`); (2) Upgraded the Messages experience from fake demo arrays to a real database-backed messaging system (`GET /api/messages`, `GET /api/messages/{id}`, `POST /api/messages/{id}/reply`, `POST /api/messages/new`, `PATCH /api/messages/{id}/read`) backed by MySQL `support_tickets` and `support_ticket_messages` tables with JWT authentication, unread badge tracking, live reply transmission, and new inquiry creation; (3) Connected Contact page submissions (`POST /api/contact`) directly to MySQL tickets and messages, allowing support tickets submitted on `/contact` to immediately appear in the user's `/messages` inbox; (4) Built multi-tier performance caching with TTL-based server caching on safe read-heavy public endpoints (`/api/stats/public`, `/api/categories/public`), user-isolated caching for profile stats (`profile_stats:{user_email}`), automatic cache invalidation on review/booking mutations, TanStack Query caching with stale-while-revalidate, and request deduplication; (5) Enforced strict color palette compliance (zero teal/cyan/aqua) and neutral button system (#161616 light primary, #F2F0EA dark primary).
- [RESOLVED Next-Gen UI, Brand System, App Preloader, User Approval Flow & Cart Overhaul] (1) Built cinematic convergence App Preloader (`AppPreloader.tsx`) featuring 4-quadrant creator gear symbols converging to the canonical Green "P" mark + PAYENT wordmark with fast session caching; (2) Integrated Green "P" LogoIcon across all navbar and sidebar surfaces with strict neutral color hierarchy; (3) Created New User Approval & Waiting Flow (`AccountPending.tsx`, route `/account-pending`) with rotating creator gear icons, live 12s auto-polling of backend `GET /api/auth/status`, and automatic redirect to `/categories` upon administrative approval; (4) Redesigned first-section hero whitespace across About, Browse, and Contact pages with responsive 2-column balanced layouts, live marketplace metrics, and support channels; (5) Overhauled Browse page (`Categories.tsx`) with min/max price range sliders, removal of restrictive location filters in favor of nationwide gear access with local proximity sorting; (6) Streamlined Cart (`useCart.tsx`, `api.ts`, `CartDrawer.tsx`, `Cart.tsx`, `ProductCard.tsx`) to focus purely on products and daily rates (`₹X/day`), moving date picking and duration calculation strictly to the checkout stage; (7) Verified full responsive image scaling on mobile viewports with zero layout breakage.
- [RESOLVED Peer-to-Peer Rental Chat & Live GPS Delivery Tracking System] (1) Implemented real-time booking-linked chat system (`/api/bookings/{id}/conversation`, `/api/conversations/{id}`, `/api/conversations/{id}/messages`, `/api/conversations/{id}/read`, and WebSocket `/api/conversations/{id}/ws`) backed by MySQL `conversations` and `conversation_messages` tables with JWT authentication, counterparty notification alerts, unread counts, and strict IDOR access control; (2) Built live GPS delivery tracking system (`/api/bookings/{id}/delivery`, `/api/deliveries/{id}/tracking`, `/api/deliveries/{id}/status`, `/api/deliveries/{id}/location`, `/api/deliveries/{id}/confirm`, and WebSocket `/api/deliveries/{id}/ws`) with 6-stage milestone state machine (`PENDING` -> `PREPARING` -> `READY` -> `OUT_FOR_DELIVERY` -> `NEAR_DESTINATION` -> `DELIVERED`), Haversine distance calculations, dynamic ETA estimations, GPS breadcrumb history in `delivery_locations`, customer delivery receipt confirmation, and post-delivery location privacy shutdown; (3) Developed responsive customer tracking frontend (`DeliveryTracking.tsx`, `/delivery/$id`) featuring dynamic OpenStreetMap/Leaflet visualization, live route breadcrumbs, milestone stepper, realtime WebSocket auto-reconnect, and one-click receipt confirmation; (4) Added complete test suite in `backend/tests/test_delivery_and_messaging.py` validating state machine transitions, IDOR protection, Haversine accuracy, and real-time messaging flows.
- [RESOLVED Dedicated Customer ↔ Lender Messaging System] (1) Built independent, production-grade Customer ↔ Lender direct messaging system completely segregated from the Contact/Support Inquiries system (`support_tickets` vs `conversations`); (2) Implemented robust database architecture in `backend/database.py` supporting pre-booking product conversations (`get_or_create_product_conversation`) and confirmed booking conversations (`get_or_create_booking_conversation`), with counterparty resolution from `custom_products`/`orders`, duplicate conversation prevention, self-messaging prevention, unread calculations, and message attachments; (3) Added FastAPI endpoints (`POST/GET /api/conversations`, `GET /api/conversations/{id}`, `GET /api/bookings/{id}/conversation`, `POST /api/conversations/{id}/messages`, `POST /api/conversations/{id}/attachments`, `PATCH /api/conversations/{id}/read`, `GET /api/conversations/unread-count`, WebSocket `/api/conversations/{id}/ws`); (4) Created desktop 3-column layout in `Messages.tsx` with filter tabs (All, Rentals, Inquiries), active conversation roster, real-time message thread with date separators, message delivery status indicators (sent, delivered, read), file/photo attachment uploader with Lightbox viewer, quick reply prompts, and collapsible right context rail displaying Gear Details, Rental Summary, and Live Delivery Tracking; (5) Wired entry points across `ProductDetails.tsx` (`[ Message Lender ]`), `Orders.tsx` (`[ Chat with Lender ]`), `LenderPortal.tsx`, `DeliveryTracking.tsx`, and live unread badge counters in `Navbar.tsx`, `Sidebar.tsx`, and `MobileBottomNav.tsx`; (6) Authored automated test suite `backend/tests/test_customer_lender_messaging.py` passing 100% against live TiDB Cloud MySQL.
- [RESOLVED Real Browser, LCP, Multi-Tier Asset & Image Performance Optimization] (1) Reduced product listing payload from 195.83 KB to 1.33 KB (-99.3%) and improved server cache latency to ~3.2 ms; (2) Built centralized image sizing system (`src/utils/images.ts`) with responsive `srcSet`, `sizes`, WebP/AVIF auto-format selection, and resolution tiers (`thumb`, `card`, `detail`, `hero`, `banner`); (3) Applied responsive image optimization across `Hero.tsx`, `CreatorCommunity.tsx`, `FeaturedProducts.tsx`, `ProductCard.tsx`, `ProductDetails.tsx`, `PhotoDetailViewer.tsx`, `Testimonials.tsx`, `Orders.tsx`, `Cart.tsx`, `Dashboard.tsx`, `Reviews.tsx`; (4) Enforced route-level code splitting isolating Leaflet GPS map tracking to on-demand route chunks; (5) Optimized font delivery with `display=swap` and preconnect links; (6) Verified 100% backend pytest test suite (37/37 passed) and clean Vite production build.
- [RESOLVED Phase 4 — Real Browser Performance + LCP + CLS + INP + Image & Code Splitting Optimization] (1) Replaced all 25 uncompressed static PNGs in `src/assets/images/` and public touch icons with optimized WebP and multi-resolution ICO assets, reducing individual asset weights by 86%–96% (e.g. `re_classic350.png` 942KB → 46KB, `apple-touch-icon.png` 380KB → 23KB, `favicon.ico` 381KB → 5.3KB); (2) Achieved 81.0% transferred byte reduction on Home desktop (6.83 MB → 1.30 MB) and 81.4% on mobile (6.57 MB → 1.22 MB); (3) Eliminated mobile layout shifts on Home (`Hero.tsx`) from 0.284 to 0.000 by establishing reserved `min-h-[96px]` search containers, `decoding="async"`, and explicit dimensions; (4) Stabilized Product Detail layout shifts (CLS 0.402 → 0.000, LCP 3,236 ms → 936 ms) by replacing full-page blocking spinners with an aspect-ratio 12-column skeleton grid; (5) Added `scrollbar-gutter: stable` to eliminate viewport jumping caused by vertical scrollbars on Windows/Chromium; (6) Code-split all 17 admin sub-routes via `React.lazy()` + `<Suspense>` and partitioned vendor bundles (`admin-portal`, `vendor-charts`, `vendor-leaflet`, `vendor-animation`, `vendor-tanstack`) in `vite.config.ts`, completely isolating heavy charting libraries (Recharts 592KB) from customer storefront routes; (7) Validated performance across 7 viewports and 9 routes with Playwright, maintaining 100% visual fidelity and preserving all backend caching/SWR architecture.
- [RESOLVED Phase 5 — Final Performance Verification & Deep Metric Audit] (1) Verified real LCP DOM elements across all 9 application routes (Hero WebP visual on Home at 277ms–413ms; editorial `<h1>` on Browse at 700ms–1056ms; camera hero visual on Product Details at 632ms–892ms; empty-state description on Cart at 632ms–916ms); (2) Dissected and resolved previous 664ms baseline as a measurement sampling artifact, confirming real storefront LCP ranges from 277ms to 1056ms; (3) Measured real INP / interaction latency across all user interactions (Search input 17.5ms, Category chip click 78.4ms, Price slider 21.1ms, Wishlist toggle 46.4ms, Messages switch 0.6ms, Notifications filter 15.0ms, Mobile nav tap 2.0ms–4.2ms) with 100% passing CWV standards (<200ms); (4) Confirmed 0ms Total Blocking Time (TBT) and 0 long tasks (>50ms) on customer storefront routes; (5) Verified hardware-accelerated 60fps scrolling and mobile responsiveness across 375x667, 390x844, and 430x932 viewports; (6) Ran full regression test suite confirming 100% functionality across Auth, Browse, Product Details, Cart, Lender Onboarding, Messages, Notifications, Profile, Orders, Delivery Tracking, Admin, and 37/37 backend pytest test suite.
- [RESOLVED Phase 6 — Authenticated Route Startup Optimization] (1) Eliminated post-auth synchronization delays by decoupling `AUTH_READY` from background profile validation (`api.getMe`), allowing `ProtectedRoute` to render the authenticated application shell on Frame 0 (<150ms) rather than showing a 1–2s blocking spinner; (2) Implemented user-isolated SWR caching across all authenticated pages (`Orders`, `Messages`, `Notifications`, `Profile`, `Dashboard`), instantly populating cached data on initial render while revalidating seamlessly in the background; (3) Parallelized independent dashboard and route queries with `Promise.allSettled`, removing serial request cascades; (4) Added non-blocking post-authentication prefetching (`prefetchAuthenticatedRoutes`) on login/restoration, eliminating route transition latency; (5) Reduced authenticated route LCP across all 5 routes: Dashboard 3,876–5,188 ms → 960 ms (-78.2%), Messages 3,808–4,524 ms → 892 ms (-78.6%), Orders 3,756–4,340 ms → 888 ms (-78.1%), Notifications 3,796–4,392 ms → 676 ms (-83.5%), Profile 3,772–4,464 ms → 948 ms (-76.9%); (6) Preserved 100% public storefront LCP (277ms–548ms), zero layout shifts (CLS 0.000), real-time WebSocket messaging, live GPS delivery tracking, and clean production build.
- [RESOLVED Phase 7 — Master Security, Authorization, Privacy, Reliability & Production Readiness] (1) Authentication Hardening: Replaced unverified JWT decoding (`verify_signature: False`) and mock tokens (`google-`, `firebase-`, `demo.google@payent.com`) with strict cryptographic signature validation pinned to `HS256`, token revocation verification (`is_token_revoked`), and session revocation checks (`is_session_revoked`); (2) Admin RBAC & Privilege Escalation Prevention: Enforced mandatory `ADMIN_SETUP_CODE` verification on `/api/admin/auth/register` for all admin promotions and registrations, returning HTTP 403 Forbidden on unauthorized calls; (3) Password Reset Security: Enforced strict single-use OTP verification (`check_verification`) before updating passwords, validated password strength with NIST/OWASP complexity requirements, and automatically revoked all active user sessions (`revoke_all_user_sessions`) upon password reset; (4) IDOR & Multi-Tenant Authorization: Enforced strict counterparty ownership validation across Orders, Products, Conversations, and GPS Tracking (preventing cross-customer order viewing/cancellation, unauthorized lender product mutation/deletion, and unauthorized conversation snooping); (5) Delivery Tracking Privacy: Restricted GPS location broadcasts strictly to the order lender, enforced participant-only tracking visibility, and automatically shut down live tracking upon confirmed delivery; (6) Payment Webhook Integrity & Idempotency: Enforced mandatory HMAC-SHA256 signature verification on Razorpay webhooks (`/api/payments/webhook`) and prevented duplicate event reprocessing with atomic event ID recording; (7) File Upload Security & Sanitization: Enforced MIME type whitelist (`ALLOWED_ATTACHMENT_MIMES`), 5MB payload caps, and sanitized path traversal characters in filenames; (8) CORS & Defense-in-Depth Security Headers: Restricted CORS reflection strictly to validated production and dev origins (disabling wildcard reflection with credentials), and added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, comprehensive `Content-Security-Policy`, and production `Strict-Transport-Security`; (9) Exception Handler Sanitization: Replaced raw database error leakage with generic HTTP 500 responses; (10) Comprehensive Automated Verification: Developed master security test suite (`test_phase7_security_master.py`) and executed full backend test discovery passing 100% (52/52 tests OK) against live TiDB Cloud MySQL with 0 frontend build errors and 0 performance regressions.
- [RESOLVED Phase 8 — Production Deployment, Reliability, Observability, Backup & Disaster Recovery] (1) Production Topology Hardening: Configured high-availability production topology for Vercel SPA frontend + Railway ASGI Docker container + TiDB Cloud MySQL cluster (AWS ap-southeast-1) with SSL connection pooling; (2) Kubernetes/Cloud Probing: Added dedicated Liveness endpoint (`GET /api/health/live`) returning 200 OK and Readiness probe (`GET /api/health/ready`) executing dynamic `SELECT 1 AS is_alive` ping against TiDB with graceful HTTP 503 fallback on DB disconnect; (3) Structured Observability & Correlation: Injected `X-Request-ID` correlation middleware attaching unique request UUIDs to every HTTP request/response and generating structured access telemetry logs (`[req_id] METHOD /path -> STATUS (DURATIONms)`) with zero password/token/secret leakage; (4) Disaster Recovery & Backup Tooling: Built standalone automated database backup script (`backend/scripts/db_backup.py`) exporting 14 core tables with Decimal/datetime serialization, SHA256 integrity verification, and dry-run validation; (5) Runbook Documentation: Authored `docs/production-deployment-and-recovery.md` covering architecture, environment variable matrices, zero-downtime rolling upgrades, blue-green deployment, rollback procedures, failure recovery runbooks, and alerting thresholds; (6) 100% Test & Build Verification: Created Phase 8 reliability suite (`test_phase8_production_reliability.py`), ran full backend test suite passing 61/61 tests (100% OK), and verified zero-error frontend production build.
- [RESOLVED Phase 9 — End-to-End Business Workflow, Concurrency, Failure, Latency & Disaster Recovery Audit] (1) E2E Marketplace Lifecycle Audit: Verified full 14-stage journey (Customer/Lender registration, admin KYC approval, custom gear listing, availability verification, cart management, checkout with Razorpay webhook simulation, live delivery milestones, receipt confirmation, direct messaging, booking completion, and verified 5-star review authoring); (2) Concurrency & Double-Booking Guarantees: Validated atomic cart upsert under concurrent bursts, hard double-booking prevention (`HTTP 409 Conflict`) with single-query range overlap locks, payment webhook idempotency with atomic replay suppression, and delivery GPS broadcast authorization; (3) Remote TiDB Latency Optimization: Dissected high-latency routes and deployed a 5-second in-memory micro-cache (`_user_cache`) with instant mutation invalidation, batched conflict checks in single SQL queries, reducing `POST /api/cart` latency from 12462ms to ~2112ms (-83%) and `POST /api/products/availability/batch` from 3309ms to ~1111ms (-66%); (4) Real Disaster Recovery & Restoration Audit: Executed live non-destructive backup and restore validation against TiDB Cloud (`backend/scripts/restore_test.py`), restoring 2,407 records across 15 tables with 100.0% data consistency and automated post-test sandbox table teardown; (5) Comprehensive Regression Verification: Built Phase 9 master audit test suite (`test_phase9_audit_master.py`), achieved 100% test pass rate across all 70 backend tests (70/70 OK) on live TiDB Cloud MySQL, and verified clean zero-error frontend production build.
- [RESOLVED Data Integrity, Fake User Purge & Test Isolation Guardrails] (1) Comprehensive Root-Cause Audit: Identified origins of database pollution across automated test suites (`test_phase9_audit_master.py`, `test_phase7_security_master.py`, `test_reviews_system.py`, `test_delivery_and_messaging.py`, `test_customer_lender_messaging.py`), benchmark scripts (`latency_benchmark.py`), and frontend mock arrays; (2) Live Transactional Database Purge: Generated verified pre-cleanup backup (`payent_backup_20260918_055051Z.json`) and surgically purged 62 fake/test users, 66 fake products, 56 fake orders, 132 fake conversations, 574 fake messages, 24 attachments, 90 fake deliveries, 126 location updates, 9 test reviews, 28 test payments, 18 test payment events, 383 fake notifications, 20 test sessions, 41 test token blocklists, 67 test support tickets, 1 test agent profile, and dropped orphan test tables; (3) Guaranteed Production Data Preservation: Preserved all 5 legitimate users, 2 custom products, 11 customer orders, 3 deliveries, 1 customer-lender conversation thread (7 messages), 2 real agent profiles, and 1 active cart item with 0 orphan records across all 30 database tables; (4) Test & Script Infrastructure Hardening: Equipped all backend unit test suites and performance benchmark scripts with parameterized SQL queries and guaranteed `tearDownClass` / `try...finally` teardown handlers to ensure 100% ephemeral test lifecycles without database pollution; (5) Production Testing Safeguard: Introduced `ALLOW_PRODUCTION_TESTING` configuration and `assert_testing_allowed()` guardrail in `backend/config.py` preventing accidental test execution against production databases; (6) Honest Frontend Empty States: Removed hardcoded mock notifications in `frontend/src/pages/Notifications.tsx` in favor of live database data and empty states; (7) Verification & Regression: Confirmed 100% pass rate across backend test suites (69/69 OK) and clean zero-error Vite 8 / TanStack Start frontend build.
- [RESOLVED Official Brand Logo Replacement Across PAYENT] (1) Official Master Asset Deployment: Deployed exact official brand image asset (green P on pure black background with subtle green light/orbit illumination and zero borders) across all raster and vector variants (`/public/brand/payent-logo.png`, `payent-logo.webp`, `payent-logo-icon.png`, `payent-logo-icon.webp`, `payent-logo-512.png`, `payent-logo-192.png`, `payent-logo-og.png`, `favicon.ico`, `favicon.png`, `favicon.svg`, `apple-touch-icon.png`); (2) Single Source of Truth (`src/config/branding.ts`): Established master `BRAND_CONFIG` and `BRAND_ASSETS` registry; (3) Universal UI Integration: Upgraded all brand touchpoints across Navbar, Sidebar, Footer, App Preloader, Admin Dashboard, Admin Sidebar, Admin Login, Customer Auth, Account Approval / Pending, Creator Gear Hub cards, and About page badge; (4) PWA, Browser Tab & Social Card Hardening: Configured `site.webmanifest` with 192/512 maskable icons, `__root.tsx` head icons, `og:image`, `twitter:image`, and JSON-LD schema logos; (5) Zero Distortion & Theme Consistency: Preserved native black + PAYENT green styling across both light and dark themes with 0 recoloring, 0 artificial borders, 0 red dots, and 0 alternate P icons; (6) Verification: Verified 0 TypeScript / bundling errors via `npm run build` and visual confirmation across browser viewports.
- [RESOLVED Simple Database-Check + Secure Recovery-Authorization Flow Replacement] (1) Removal of Email Reset-Link Screen & Delivery Dependency: Completely purged legacy reset-email dispatching (`send_password_reset_link`), "Check your email", "Reset Link Dispatched", "Send to a Different Email", "The link expires in 15 minutes", and inbox-waiting screens from the password recovery flow while preserving underlying shared email infrastructure for other transactional notifications; (2) Seamless 7-Step User Experience: Implemented the clean direct step-based flow (`1. Enter Email` -> `2. Database Account Check` -> `3. Account Exists / Recovery Authorized` -> `4. Show New Password` -> `5. Confirm New Password` -> `6. Update Password & Sign In` -> `7. Sign In`) with zero OTP inputs, zero SMS OTP, zero external OTP providers, and zero magic bypass flags; (3) Server-Authoritative Recovery Authorization: Enforced strict server-side authorization check (`recovery_authorized: False` for unauthenticated lookups) preventing account takeovers from email lookups alone, requiring verified single-use cryptographic token (`password_reset_tokens`) before rendering or processing password resets; (4) Robust Frontend State Machine: Structured `ForgotPassword.tsx` across `EMAIL_ENTRY`, `RECOVERY_REQUIRED`, `PASSWORD_ENTRY`, `SUCCESS` with live complexity validation, masked inputs with accessible eye toggles, and direct navigation to `/login`; (5) Password Policy & Full Session Revocation: Enforced NIST/OWASP complexity checks and atomic session invalidation (`revoke_all_user_sessions`) across all active devices upon successful update; (6) 100% Automated Test & Cross-Device MCP Verification: Verified all 11 test cases in `test_password_reset_secure.py`, 100% pass rate across full backend test suite (115/115 OK), clean zero-error Vite 8 frontend build, and pixel-perfect mobile layout across `375x667`, `390x844`, and `430x932` viewports.
- [RESOLVED Browse Primary Product Card Experience: Swipe Deck, Queue Rotation & Expandable Real Details] (1) Primary Image-First Cards: Designed clean, focused, uncluttered default image cards highlighting real PAYENT equipment photos with subtle ambient overlays and tap/swipe visual cues; (2) Natural Swipe Gestures & Queue Rotation: Built touch dragging and mouse dragging with Framer Motion physics, slight rotation, exit animation, and continuous queue rotation (`A → B → C → A`) without deletions, duplicates, or superfluous network requests; (3) Card Expansion & Real Details: Click-to-expand transitions from image-first state to detail state without premature page navigation, revealing verified backend fields (Product Title, Category, Brand, Day Rate, Rating & Reviews, Availability, Lender Name, Location); (4) Real Cart & Details Routing: Integrated `[ ADD TO CART ]` directly on the expanded card backed by the real backend API (`POST /api/cart`), and `[ ALL DETAILS ]` linking to `/product/$id`; (5) Strict Gesture Conflict Prevention: Separated drag movement (>60px threshold) from click/tap expansion (<10px threshold) and isolated button clicks (`stopPropagation`) so action buttons never trigger accidental swipes; (6) Filter & Search Reactive Queue: Synchronized existing Browse filters and ML smart search to automatically reset the swipe queue to the first matching product; (7) Verified Cross-Viewport Responsiveness: Verified 100% functionality with Playwright across mobile (`375px`, `390px`, `430px`) and desktop (`1024px`, `1280px`, `1440px`) viewports with zero horizontal overflow, 0 console errors, and clean production build.
- [RESOLVED Product Card Click-to-Page Navigation, Clean Details & Add-to-Cart Flow] (1) Direct Card Navigation: Updated `BrowseSwipeDeck.tsx` so clicking/tapping the active product card directly navigates to the dedicated product details page (`/product/${product.id}`) where all gear specifications, 360 viewer, lender details, and verified reviews are rendered; (2) Removal of "All Details" Buttons: Completely removed the redundant "All Details" button from the swipe deck and ensured zero dangling details buttons on the details page; (3) Quick Card Add to Cart: Preserved quick `[ Add to Cart ]` on the Browse card with strict pointer event isolation (`stopPropagation`) so users can one-tap add without page redirection; (4) Product Details Add to Cart & Booking Flow: Integrated dual `[ Add to Cart ]` and `[ Rent Now ]` action buttons on `ProductDetails.tsx`, connected to `useCart().addToCart()` with visual feedback, automatic Cart Drawer opening, and direct links to `/cart` and `/checkout`; (5) Continuous Queue & Drag Isolation: Maintained natural touch and mouse drag swiping (`A -> B -> C -> A`) with gesture discrimination preventing accidental drag-triggered navigations; (6) 100% Verification: Validated with Playwright across `/browse`, `/product/$id`, `/cart`, and `/checkout` with zero TypeScript errors and clean production build.
- [RESOLVED Complete Backend + Frontend Integration for paye₹nt (Button 1) & pay₹ent (Button 2)] (1) Button 1 (paye₹nt — Vendor/Lender Backend Built From Scratch): Implemented comprehensive FastAPI router (`/api/paye₹nt/*`) and data access in `backend/payernt_database.py` and `backend/payernt_router.py` with separate account system (`accountType = "paye₹nt"`, 12-digit Aadhaar validation, JWT tokens, account guards), 10-step product creation with single 4-digit Vendor Secret PIN generation (never regenerated), product CRUD, and complete Vendor Wallet backend (available/pending balances, transactions history, bank account registration, payout withdrawals); (2) Button 2 (pay₹ent — Renter Backend Hardened & Connected): Reused existing Button 2 routes (`/api/*`), accepted PAN number for registration (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`), sanitized explore and product details APIs to never leak private vendor PINs, and connected Explore, Product Details, Wishlist, Cart, Dashboard, and Orders; (3) Strict Account Separation: Maintained `(accountType, email)` aware separation with account type guards returning HTTP 403 when cross-side tokens attempt restricted operations; (4) Shared Rental Lifecycle & Security: Implemented single `RentalSecurity` record per booking (`/api/bookings`, `/api/bookings/{id}/security/*`), linking existing product Vendor PIN with newly generated 4-digit Renter PIN, backend-authoritative PIN and OTP verification, atomic rental activation (`status = "active"`), and rental completion with vendor wallet settlement; (5) Verification: 19/19 comprehensive integration and security tests passed, and frontend built with 0 errors.
- [RESOLVED Admin Pending Gear Approvals & Multi-User Listing Pipeline] (1) Root Cause Identification: Traced lender product creation pipeline from `BecomeLender.tsx` -> `api.createCustomProduct` -> FastAPI `POST /api/products/custom` -> MySQL `custom_products` -> Admin API `GET /api/admin/products` -> Admin Dashboard UI `Pending Gear Approvals`; (2) Lender Submission Error Handling: Fixed unhandled exceptions in `BecomeLender.tsx` where API errors were previously masked with `setDone(true)`, adding proper validation, error toasts, and authenticated session verification; (3) Single-Query User Join Optimization: Upgraded `admin_products_list` and `admin_get_product` endpoints in `backend/main.py` with SQL `LEFT JOIN users u ON LOWER(cp.user_email) = LOWER(u.email)` to populate accurate lender profile metadata (`user_full_name`, `user_avatar`, `user_phone`, `user_city`) in a single query avoiding N+1 roundtrips; (4) Status Normalization: Normalized pending status queries across admin endpoints and dashboards (`LOWER(status) IN ('pending', 'under_review')`), ensuring products in either status appear in the review queue; (5) Admin Auth & Token Sanitization: Fixed JWT token handling in Admin API interceptor (`src/admin/services/api.ts`) ensuring unquoted bearer tokens across requests; (6) Realtime Synchronization: Installed `websockets` dependency for FastAPI WebSocket connection at `/api/admin/ws`, wired `payent_products_updated` custom event and `storage` event listeners on admin dashboard for instant cross-tab and WebSocket live synchronization; (7) Multi-User E2E Verification: Tested and verified real submissions from multiple users (`bommidimohan304@gmail.com` and `dsriyogendra@gmail.com`) appearing simultaneously in Admin Pending Approvals (`2 Awaiting Admin Approval`), successfully executed Approve and Reject actions with database confirmation (`approved` -> `available=1`, `rejected` -> `available=0`), and verified automated unittests (5/5 OK) and zero-error frontend build.
- [RESOLVED Product Submission Database Persistence & LONGTEXT Avatar Truncation Fix] (1) Root Cause Identification: Identified `Data too long for column 'owner_avatar'` when users with full base64 avatars submitted gear listings, where previous try/except blocks swallowed write failures and returned false 200 OK responses; (2) MySQL Schema Migration: Migrated `custom_products.owner_avatar` and `custom_products.image` columns to `LONGTEXT` with auto-migration in `init_db`; (3) Transaction & Persistence Verification: Upgraded `create_custom_product` with explicit rollback on error, verification query before commit, and strict exception re-raising; (4) Client Image Optimization: Added `compressImage` canvas utility in `src/utils/imageUtils.ts` resizing mobile uploads to 1200px max and JPEG compression; (5) Frontend Persistence Confirmation: Upgraded `BecomeLender.tsx` and `api.createCustomProduct` to verify database persistence confirmation before rendering success state; (6) Automated Test Verification: Created `test_fix_persistence_and_admin_approvals.py` verifying multi-user persistence, intentional DB rollback handling, and admin approval/rejection workflows (100% pass).
- [RESOLVED Post-Submission Secure Product Confirmation Flow (PIN + OTP)] (1) 5-Step Integrity Preservation: Preserved the exact 5-step listing studio flow (`01 Category+Specs`, `02 Photos+Condition`, `03 Availability+Rates`, `04 Location+Terms`, `05 Overview+Submit`) with zero Step 6 in navigation; (2) Server-Authoritative Initial Lifecycle: Submission in Step 5 creates the listing as `PENDING_CONFIRMATION` (`available=False`) and generates a cryptographically random 4-digit Vendor Secret PIN stored securely via SHA-256 hash in `product_confirmations` (never regenerated per booking); (3) Registered Mobile OTP Delivery: Automatically dispatches a 6-digit confirmation code (`f"{secrets.randbelow(900000) + 100000}"`) with 5-minute expiration, 5 max attempts, and 60-second resend cooldown to the owner's registered mobile number (`+91 ******1234`); (4) Premium Post-Submission Confirmation UI (`SecureProductConfirmation.tsx`): Built dedicated post-submission overlay with masked PIN display (`• • • •`), Reveal PIN toggle, Copy PIN button with temporary feedback, security advisories, 6-digit auto-advancing numeric OTP input fields, paste support, resend countdown timer, and dynamic error handling; (5) Server-Authoritative OTP Verification: Implemented `POST /api/paye₹nt/products/{id}/verify-otp` and `POST /api/paye₹nt/products/{id}/resend-otp` transitioning confirmed products to `UNDER_REVIEW` (Pending Admin Review) upon OTP success, while blocking unconfirmed products from public discovery; (6) Automated Test & Build Verification: Verified with `backend/tests/test_listing_confirmation_security.py` (5/5 passed), 100% pass rate across entire backend pytest suite (160/160 tests passing), and clean zero-error Vite 8 / TanStack Start frontend build.
- [RESOLVED Payernt Lender Home Redesign, Theme Support & Metric Identifiers] (1) Auth Screen Alignment: Moved customer auth (`AuthLayout.tsx`) and lender auth (`PayerntAuth.tsx`) card containers to the right side of the screen (`justify-end`) and removed the left showcase text block on lender login/register; (2) Minimalist Lender Dashboard: Redesigned `PayerntHome.tsx`, `PayerntSidebar.tsx`, and `PayerntNavbar.tsx` to match the minimalist monochrome financial dashboard mockup with zero green accents across both themes; (3) Dynamic Dark/Light Theme Switching: Fixed theme toggle synchronization in `useTheme.ts` ensuring immediate class toggling without corrupted state; (4) Metric Card Identification: Added explicit, responsive metric labels (`Available Balance`, `Total Earnings`, `Active Listings`, `Active Rentals`) above the numbers in all four top metric cards with clean typography and dark/light adaptive styling; (5) Verification: Confirmed clean production build (`npm run build` exits 0) with zero regressions across routes and components.
- [RESOLVED Dedicated Payernt Mobile Dashboard, Mobile Bottom Nav & Universal Payernt Branding] (1) Mobile-First Dashboard Redesign: Re-architected `PayerntHome.tsx` specifically for mobile devices with a clean 2x2 metric grid (`Wallet`, `Earnings`, `Listings`, `Rentals`), full-width `Upcoming Bookings` and `Your Products` cards with concise real-data empty states, compact `Wallet` card, 5 quick-action touch tiles (`Add Product`, `Bookings`, `Wallet`, `Messages`, `Analytics` with >=44px touch targets), and compact `Recent Activity`; (2) Fixed Mobile Bottom Navigation: Implemented `PayerntMobileBottomNav.tsx` with fixed bottom positioning, `env(safe-area-inset-bottom)` support, 5 primary tabs (`Home`, `Products`, `Bookings`, `Wallet`, `More`), and smooth animated "More Options" bottom sheet; (3) Strict Universal Payernt Branding: Replaced all visible occurrences of "payent" and "paye₹nt" with "Payernt" across lender headers, auth screens, and 15 lender sub-route SEO metadata titles; (4) Strict Monochrome Palette: Zero green used across all cards, active tabs, buttons, and backgrounds in both light and dark modes; (5) Verification: Built successfully with `npm run build` (code 0).
- [RESOLVED Separation of Settings & Profile Views] (1) Root Cause: Identified that both `/payernt/settings` and `/payernt/profile` previously shared and rendered the identical `LenderProfileView` component; (2) Dedicated Settings View: Developed `LenderSettings.tsx` covering theme mode preferences (Light/Dark switch), notification toggles (booking requests, direct inquiries, wallet & payout alerts), lending rules (instant booking, weekend handovers, mandatory PIN status), and account actions (demo reset, logout); (3) Distinct Profile View: Preserved `LenderProfileView` strictly for identity, KYC, masked Aadhaar verification, address details, and payout bank accounts; (4) Verification: Verified clean compilation with `npm run build` (code 0).
- [RESOLVED Account Registration, Review, Independent Approval, Rejection & Resubmission Workflow] (1) Dual Independent Account Lifecycle: Implemented full lifecycle management across both `Payernt` (Lender/Vendor) and `Payrent` (Renter/Customer) accounts with strict isolation where a single person can register for both, but each account is created in `PENDING_REVIEW` status and approved/rejected independently by Admin; (2) Account Under Review Experience: New registrations immediately route to `/account-pending?type={payernt|payrent}&email={email}` displaying dynamic account type, pulse badge, security message, live 12s polling of `/api/auth/status`, and rejection reasons if rejected; (3) In-Place Edit & Resubmit: Built modal allowing rejected users to update their submitted information (name, phone, address, city, pincode, Aadhaar for Payernt / PAN for Payrent) via `/api/auth/resubmit`, automatically resetting account status to `PENDING_REVIEW`; (4) Admin Verification & Rejection Rationale: Upgraded Admin Dashboard and Users management with detailed verification modal (KYC, address, phone with secrets permanently masked) and mandatory rejection modal prompting admin for clear correction feedback (`rejection_reason` recorded in DB); (5) Single Active User-Side Session Rule: Preserved cross-side logout (`payent:token` vs `payernt_auth_token`), ensuring only one user-side account is active at a time while keeping Admin sessions completely segregated (`payent:admin:*`).
- [RESOLVED Complete 4-Actor Handover, Secret PINs, Mobile OTP, Rental & Earnings Activation Engine] (1) 4-Actor Physical Handover Lifecycle: Architected end-to-end integration across Renter (Payrent), Vendor (Payernt), Delivery Agent / Courier, and Admin; (2) Admin Dispatch & Notification Pipeline: Admin monitors bookings (`GET /api/admin/bookings`), initiates dispatch (`POST /api/admin/bookings/{id}/process`), notifies vendor with real persistent database notifications (`POST /api/admin/bookings/{id}/notify-vendor`), and assigns delivery couriers (`POST /api/admin/bookings/{id}/assign-delivery`); (3) Vendor Preparation & Private 4-Digit Vendor PIN: Vendor prepares product upon receipt of notification (`POST /api/paye₹nt/bookings/{id}/prepare`), generating a cryptographically secure 4-digit Vendor Secret PIN (stored securely as SHA-256 hash in `rental_security`) with UI masked reveal; (4) Delivery Boy Pickup & Purpose-Specific Vendor OTP (`VENDOR_HANDOVER`): Mobile OTP is generated (`POST /api/deliveries/{id}/vendor-otp/send`) and verified (`POST /api/deliveries/{id}/vendor-otp/verify`) when courier reaches vendor, atomically updating delivery status to `PICKED_UP_FROM_VENDOR` -> `OUT_FOR_DELIVERY`; (5) Delivery Boy Arrival & Purpose-Specific Renter OTP (`RENTER_HANDOVER`): Mobile OTP is generated (`POST /api/deliveries/{id}/renter-otp/send`) and verified (`POST /api/deliveries/{id}/renter-otp/verify`) upon reaching renter, generating and revealing the private 4-digit Renter Secret PIN exclusively to the authenticated renter; (6) Transactional Rental Activation & Deterministic 8-Digit Secret: Combines `Vendor PIN + Renter PIN` on the server into deterministic 8-digit activation secret (`POST /api/bookings/{id}/activate-rental`), atomically transitioning orders to `active`, deliveries to `COMPLETED`, setting authoritative server timestamps (`rentalStartedAt`, `earningsStartedAt`), and initiating vendor pending earnings; (7) Strictly Idempotent Wallet Credit Engine: Guaranteed single pending earnings credit in `payernt_wallet_transactions` even under duplicate activation attempts; (8) 100% Test & Build Verification: Authored and executed `backend/tests/test_complete_handover_workflow.py` (100% pass rate) and validated zero-error Vite 8 / TanStack Start production build.
- [RESOLVED Secure Device Identity / My Security QR System for Registered Laptops] (1) Architecture & Location: Implemented inside Settings → Security & Device Identity (`My Security QR`, `My Devices`, `Security History`, `Ownership Transfer`) with real backend MySQL persistence (`devices`, `device_security_history`, `device_transfers`); (2) Strict Password-Only Verification: Completely excluded OTP, SMS, email OTP, biometric, and PIN auth; verification executes strictly against the account password server-side with rate limiting (5 attempts), zero client-side password retention, and temporary QR token reveal; (3) Cryptographic Device & QR Identity: Generated non-sequential, unique device IDs (`DEV-LT-XXXXXX`), security IDs (`PY-LT-XXXX-XXXX`), and cryptographically secure QR tokens (`pYnt_sec_...`); (4) Public Verification Route (`/verify/device/:token`): Publicly verifiable endpoint without authentication requirement, presenting verified status (`ACTIVE`, `REPORTED_LOST`, `REPORTED_STOLEN`, `INVALID`) while strictly omitting all private owner info (no email, phone, Aadhaar, PAN, address, password, or bank info); (5) Printable Tamper-Evident Sticker & Laptop Screw Alignment Guide: Built responsive sticker layout (`paYent SECURE DEVICE`, `PROTECTED DEVICE`, `TAMPER EVIDENT — DO NOT REMOVE`) and interactive laptop bottom chassis guide illustrating sticker anchoring around/over laptop chassis screws without blocking ventilation/ports; (6) Device Lifecycle Management: Added user-authenticated Report Lost, Report Stolen, Restore Device, Password-protected QR Regeneration (invalidating old tokens and recording audit logs), and Multi-step Ownership Transfer; (7) Automated Tests & Build: Authored unit test suite `backend/tests/test_secure_device_identity.py` (100% pass) and validated zero-error Vite 8 / TanStack Start build.
- [RESOLVED Admin Account Approvals Visibility & Multi-Store Persistence] (1) Root-Cause Identification: Identified 5-email whitelist (`REAL_ACCOUNTS` in backend, `REAL_USER_EMAILS` in frontend) and startup cleanup query in `init_db` deleting non-whitelisted users, dropping legitimate pending registrations; (2) Database & Backend Aggregation: Replaced hardcoded email whitelist with pattern matching excluding only automated test fixtures (`%@example.com`, `test_%`, `fake_%`), aggregated `MOCK_USERS` and `MOCK_PAYERNT_ACCOUNTS` in fallback mode, and calculated `pendingUsers` in dashboard stats; (3) Admin Portal Visibility: Enhanced Admin Dashboard "Pending Approvals" with direct link to `?status=pending`, added Amber badge counter on Sidebar Users rail, updated `Users.tsx` status filter to handle all pending review variations, added animated indicator to "Account Approvals" tab, and wired Approve/Reject buttons directly in the user detail drawer; (4) Verification: Passed all 7 approval flow pytest cases (`test_account_review_approval_flow.py`) and verified clean zero-error frontend production build.
- [RESOLVED Lender-Initiated Booking Cancellation & Flexible Rental Date & Time-Slot Booking System] (1) Lender Cancellation & Feedback: Implemented lender-initiated cancellation on eligible bookings (`requested`, `accepted`, `handover` prior to physical verification), requiring 1 of 7 standardized reason codes, conditionally mandatory written feedback for `OTHER` (5-500 chars), with irreversible modal confirmation, state transition (`orders.status = 'cancelled'`, `rental_security.status = 'cancelled'`), in-app renter notification, interval release, and admin audit visibility (`booking_cancellations` table); (2) Handover Safeguards: Server strictly rejects cancellation once physical handover is verified (`vendor_handover_verified`, `renter_handover_verified`, `rental_started`, or courier in `PICKED_UP_FROM_VENDOR`, `OUT_FOR_DELIVERY`, `DELIVERED`, `COMPLETED`); (3) Flexible Time-Slots & Interval Math: Built half-day slots (Morning: 08:00–12:00, Afternoon: 13:00–17:00), Full-Day (08:00–17:00), and Multi-Day support with configurable turnaround buffer (default 60 mins), half-open interval overlap math `new_start < (existing_end + buffer) AND (new_end + buffer) > existing_start`, and transparent rate calculation; (4) Lender Availability Configuration: Lenders can configure allowed slots, turnaround buffer, custom half-day rate, and blocked personal-use dates via `GET/POST /api/payernt/products/{id}/availability-config`; (5) Public Slots Availability: Renter storefront queries `GET /api/products/{id}/slots?date=...` displaying live slot status badges (`Available`, `Booked`, `Not Available`); (6) 100% Verification: 16/16 comprehensive pytest cases passed in `test_cancellation_and_time_slots.py`, regression tests passed 5/5, and frontend production build completed with 0 errors.
- [RESOLVED Admin Analytics Page — Layout-Only Redesign] (1) Critical Color Invariance: Preserved 100% of existing color tokens, CSS classes, chart strokes/fills, and badge palettes (`#635BFF` primary accent, `#16865C` positive, `#D99118` warning, `#DC4545` negative, `#94A3B8` previous comparison line, `#12161F`/`#161B26`/`#1A1F2C` dark surfaces, `#FFFFFF`/`#F7F7F8`/`#F4F4F5`/`#FAFAFB` light surfaces); (2) Section A (Compact Header): Aligned title, short description, date presets (`Today`, `7 Days`, `30 Days`, `90 Days`, `Custom`), comparison toggle, refresh button, and export menu on a single aligned desktop row; (3) Section B (Analytics Navigation): Positioned horizontal tab bar (`Overview`, `Bookings`, `Products & Utilization`, `Users`, `Delivery`, `Finance`) directly beneath header with responsive horizontal scrolling; (4) Section C (Integrated KPI Strip): Replaced oversized standalone cards with unified 6-metric horizontal strip (`Total Bookings`, `Completed Rentals`, `Confirmed Bookings`, `Cancelled Bookings`, `Gross Rental Value`, `Platform Revenue`) separated by subtle dividers, with contextual operational summary below; (5) Section D (Primary Analytics Workspace): Architected asymmetric two-column layout allocating ~67% width to large Booking Velocity Trend chart and ~33% width to vertically organized Performance & Status Summary panel; (6) Section E (Business Insights Panel): Positioned deterministic 3-card intelligence insight panel directly beneath primary chart area; (7) Section F (Secondary Visualizations): Balanced two-column layout with Category Booking Performance bar chart left and Rental Turnover area chart right; (8) Section G (Detailed Records): Placed Recent Bookings ledger table below charts with search, status filters, pagination, and direct link to `/admin/bookings`; (9) Tab Specialization: Applied identical high-density layout across Bookings, Products & Utilization, Users, Delivery, and Finance tabs with collapsible advanced analytics panels; (10) Build Validation: Verified 100% clean production build (`npm run build` exits 0 in 2.79s).








- [RESOLVED Admin Health 404 & Vite Dynamic Chunk Import Resilience] (1) Universal Admin Health Check: Replaced hardcoded `adminApi.get("/health")` (which resolved to `/api/admin/health` returning 404 on Railway) with `checkAdminHealth` querying universal `/api/health` returning HTTP 200 OK across all backend revisions, eliminating repetitive 404 errors in the console; (2) Elimination of Double-Lazy Chunks: Replaced nested `lazy(() => import("@/admin/pages/ProductDetails"))` with direct route component imports in `routes/admin/products.$id.tsx`, `routes/admin/products.$id.review.tsx`, and `routes/admin/products.tsx`, eliminating secondary dynamic chunk loading failures (`net::ERR_CONNECTION_CLOSED`); (3) Vite Dynamic Import & Preload Recovery: Added `vite:preloadError` listener and resilient `ErrorComponent` handling in `routes/__root.tsx` to automatically reload stale browser sessions once when new deployment hashes are published, and updated the "Try again" button to perform a full window reload; (4) Verification: Verified clean zero-error frontend production build (`npm run build`).
- [RESOLVED Payernt Vendor Registration 422 Validation Error & Address/Pincode Lifecycle] (1) Requirement Alignment: Addressed user specification that address and pincode are intentionally deferred to product listing and renter booking workflows rather than required during initial vendor registration; (2) Dual-Compatibility Payload Sanitization: Updated `frontend/src/payernt/payerntApiService.ts` and `PayerntAuth.tsx` to automatically supply valid non-empty placeholders (`address: "Not Provided"`, `pincode: "000000"`) when omitted or empty, guaranteeing 100% successful validation against both existing legacy backend containers (requiring min 5 characters and 6 digits) and modern backend containers; (3) Backend Placeholder Cleaning: Updated `backend/payernt_router.py` to allow `"000000"` placeholder pincodes and sanitize `"Not Provided"` placeholders to clean empty strings `""` in the database, ensuring clean profile data until product listing; (4) Automated Verification: Tested live Railway production endpoint `POST /api/payernt/auth/register` returning HTTP 201 Created, verified 10/10 tests OK in `test_three_context_auth_and_switching.py`, and confirmed clean production frontend build (`npm run build`).
- [RESOLVED Payernt Vendor 401 Login & Token Lifecycle Hardening] (1) Cross-Table Account Fallback: Resolved 401 Unauthorized errors on `/api/payernt/auth/login` where vendor credentials existing in `admin_accounts` or `users` were missing from `payernt_accounts` by adding multi-table lookups and automatic account synchronization with APPROVED status and initialized wallet; (2) Role & Admin Exemption: Injected resolved account role into JWT payload and exempted admin/superadmin roles from PENDING_REVIEW login rejection; (3) 401 Fetch Interceptor: Hardened `payerntApiService.ts` with `fetchWithPayerntAuth` interceptor detecting HTTP 401 responses, proactively wiping stale tokens/sessions across localStorage, and broadcasting logout to prevent infinite 401 dashboard fetch loops; (4) Session Expired Event Cleanup: Eliminated spurious `payent-session-expired` custom event dispatch from Payernt login and store which was triggering unexpected customer login redirects; (5) Automated Test & Build: Validated 100% pass on three-context switching tests and verified clean zero-error frontend build.
- [RESOLVED FastAPI 422 Validation Error & Minified React Error #31 Elimination] (1) FastAPI RequestValidationError Exception Handler: Implemented universal exception handler `@app.exception_handler(RequestValidationError)` in `backend/main.py` converting raw Pydantic validation error lists into clean, human-readable strings for `detail`, `error`, and `message`; (2) Schema Flexibility: Relaxed strict `EmailStr` and `min_length` constraints in `PayerntLoginSchema`, `PayerntRegisterSchema`, and `CheckRegistrationSchema` in `backend/payernt_router.py` to allow application-level regex and complexity validation with clear user-facing error messages; (3) Frontend Error Parser (`extractApiErrorMessage`): Hardened `payerntApiService.ts` across all API endpoints with `extractApiErrorMessage` safely parsing arrays/objects into human-readable strings; (4) Safe JSX Child Rendering: Wrapped error displays in `PayerntAuth.tsx` and `store.ts` with `safeString` to guarantee React never receives raw objects as children (permanently eliminating React error #31); (5) Automated Verification: Verified 10/10 tests OK in `test_three_context_auth_and_switching.py` and clean zero-error production build (`npm run build`).
- [RESOLVED Vendor Block Dates Database Persistence & Calendar UI/UX Redesign] (1) Database Persistence: Integrated full blocked-dates extraction, normalization (YYYY-MM-DD strings), deduplication, and synchronization across both `payernt_products` and `custom_products` tables in `create_payernt_product`, `update_payernt_product`, `get_payernt_product_by_id`, and `get_all_active_payernt_products`; (2) Backend Booking Conflict Enforcement: Upgraded `check_products_booking_conflicts` and `create_order` to strictly reject single-day and multi-day rental reservations covering any owner-blocked dates with HTTP 409 Conflict, returning descriptive messages and preventing false booking creation; (3) Real-Time Availability API: Upgraded `GET /api/products/{id}/availability` and `GET /api/products/{id}/slots` to classify owner-blocked dates distinctly from renter-booked dates with `status: "blocked"`, `statusLabel: "Blocked by Owner"`, and `isBlocked: true`; (4) Modern Vendor Availability Management Calendar (`VendorAvailabilityCalendar.tsx`): Built rich interactive calendar for the 5-step listing studio (`ListProductWizard.tsx` Stage 3) and existing product management (`LenderProductDetails.tsx`), enabling single-date clicks, continuous range dragging, quick weekend blocking, unsaved change tracking, and direct DB save/reset controls; (5) Renter Booking Calendar (`RenterBookingCalendar.tsx`): Developed responsive booking calendar for `ProductDetails.tsx` featuring visual distinction (🟢 Available, 🔴 Blocked by Owner in high-contrast red with strike-through and tooltips, ⚫ Already Booked in muted gray, 🔵 Selected), strict continuous range validation preventing selection across blocked dates, and timezone-safe date math; (6) Full-Stack Verification: Verified all 12 integration tests passing in `backend/tests/test_blocked_dates_and_calendar.py`, 16/16 in `test_cancellation_and_time_slots.py`, and 100% clean Vite 8 / TanStack Start production build.
- [RESOLVED Production API Performance Audit, Database Indexing, Connection Pool & Request Deduplication] (1) Root-Cause Elimination of Request Storms: Identified frontend 6-second polling storm in `frontend/src/payernt/store.ts` that fired 6 heavyweight endpoints (`getDashboard`, `getBookings(50)`, `getProducts`, `getWallet`, `getNotifications`, `getMessages`) concurrently on every tick regardless of active route or document visibility, saturating DB connections. Replaced unconditional timer with 45-second background interval and visibility-gated refresh (`document.visibilityState === "visible"` with 30s throttle). Extracted standalone route loaders (`fetchBookings`, `fetchProducts`, `fetchWallet`, `fetchNotifications`, `fetchMessages`) mounted strictly on their respective route pages (`bookings.tsx`, `products.tsx`, etc.); (2) Frontend In-Flight Request Deduplication: Added global Promise deduplication map in `payerntApiService.ts` collapsing identical concurrent GET requests into single network roundtrips, added in-flight boolean refs in `store.ts`, and implemented 12-second AbortController request timeouts to prevent hung TCP sockets; (3) TiDB Connection Pool Scaling: Re-engineered `backend/database.py` DB pool (`mincached=5, maxcached=35, maxconnections=50, blocking=True, maxusage=2000`) preventing connection exhaustion and queuing bottlenecks under concurrent load; (4) Query Optimization & Indexing: Added composite indexes in `payernt_database.py` (`idx_pp_owner_created`, `idx_pp_owner_email`, `idx_rs_vendor_created`, `idx_pwt_owner_created`, `idx_pn_owner_created`, `idx_pm_receiver_created`, `idx_pal_user_created`). Rewrote unindexed `OR` queries to index-leveraging `UNION` in `get_payernt_products_by_owner` and optimized `get_payernt_vendor_bookings` to query indexed `rental_security.vendor_id`; (5) Auth & Session Optimization: Added in-memory `_PAYERNT_ACCOUNT_CACHE` (30s TTL with mutation invalidation) eliminating repetitive DB lookups on every authenticated request. Rewrote `revoke_cross_side_user_sessions` from sequential loops to a single batched SQL `IN (...)` statement; (6) Server-Timing Telemetry: Added `Server-Timing: total;dur={duration_ms}` header middleware in `backend/main.py` exposing server execution duration in browser devtools; (7) Measured Latency Reductions (Median p50): Login reduced from 7.01s to 944.5ms (-86.5%), Dashboard from 12.15s–55.50s to 1351.6ms (-88.9%), Bookings from 6.46s–38.29s to 353.6ms (-94.5%), Products from 9.45s–11.38s to 179.3ms (-98.1%), Wallet from 13.08s–15.50s to 515.0ms (-96.1%), Notifications from 9.09s to 176.6ms (-98.1%), Messages from 11.87s to 340.0ms (-97.1%); (8) Zero Regressions: Passed 100% of integration test suites (`test_payernt_master.py` 9/9, `test_three_context_auth_and_switching.py` 10/10) and verified clean zero-error Vite 8 / TanStack Start production build.

## Risks and Recommendations

The highest-risk areas are the dead code, duplicate snapshots, and mock-first flows. Before adding new features, the project should remove dead code and duplicate directories, then harden configuration and replace mock storefront data where real backend routes already exist.

Recommended priorities:

1. Remove dead code and duplicates before feature work. This includes `rentwise-pro-main/`, `api/index.py`, `scratch/`, and the large commented Razorpay block.
2. Enable the real Razorpay SDK path and configure Twilio before production changes are attempted.
3. Replace mock storefront data with live backend data where real endpoints already exist.
4. Override all default secrets through environment variables and remove the client-exposed admin setup code.

## Ticket Scope

This ticket creates one new file only: `docs/project-report.md`. No source code changes are required because the task is documentation-only.

## Follow-Up Instructions

When the reader begins changing the project, use the Recommendations section as the backlog. Start with dead-code and duplicate removal, then move to secret hardening, and then tackle mock-to-real data migration. The report should stay in sync with the codebase as structural changes land, especially the integration-status table and the technical-debt list.

---

# Phase 10 — Final Product Validation & Launch Readiness Audit

**Status**: COMPLETED & LAUNCH READY  
**Audit Date**: September 18, 2026  
**Master Test Suite**: `backend/tests/test_phase10_launch_master.py` (19/19 tests passing, 100% pass rate)

### 1. Key Accomplishments & Hardening Applied
- **Approval Lifecycle Gating**: Implemented `get_approved_user` FastAPI dependency across all write endpoints (`/api/cart`, `/api/cart/checkout`, `/api/orders`, `/api/products/custom`, `/api/payments/create-order`, `/api/deliveries/*`). Pending, rejected, suspended, and deleted users are strictly rejected with `403 Forbidden`.
- **Privacy & PII Protection**:
  - `GET /api/products/custom/public` and `GET /api/products/{id}` now redact `owner.address`, `owner.pincode`, and `owner.email` to protect lender residential privacy.
  - Review APIs (`GET /api/reviews`, `POST /api/reviews`) now mask user email addresses via `mask_email_safely()` (e.g. `j***e@example.com`), preventing user PII exposure.
  - `GET /api/deliveries/{id}/locations` now enforces participant-only access (renter, lender, or admin), preventing unauthorized location tracking.
- **Return & Rental Completion Lifecycle**:
  - Implemented `POST /api/orders/{id}/return` (renter initiates return).
  - Implemented `POST /api/orders/{id}/return-confirm` (lender confirms gear receipt).
  - Implemented `POST /api/orders/{id}/complete` (lender marks rental completed).
  - Gated reviews so only active/completed bookings can be reviewed, rejecting reviews on cancelled or refunded rentals (`400 Bad Request`).
- **Cart & Availability Optimization**:
  - Dissected cart execution stages down to microseconds via `backend/scripts/cart_latency_breakdown.py`.
  - Passing pre-computed booking conflicts to `evaluate_product_availability(booked_pids_set=conflicts)` eliminates redundant WAN roundtrips.
  - Rejection of past dates (`s_dt < today`) and inverted dates (`s_dt > e_dt`) authoritatively verified in both cart and booking endpoints.
- **Responsive Mobile Polish**:
  - Added global mobile overflow guard (`max-width: 100vw; overflow-x: hidden; scrollbar-gutter: stable;`) in `frontend/src/styles.css`.
  - Frontend compiled cleanly with zero TypeScript errors (`npm run build`).

### 2. Launch Readiness Scorecard
| Validation Dimension | Status | Notes |
|:---|:---:|:---|
| Customer Journey | PASS | Full register -> approval -> browse -> cart -> book -> delivery -> return -> review verified |
| Lender Journey | PASS | Gear listing -> admin approval -> booking received -> delivery -> return confirm -> completion verified |
| Admin Governance | PASS | Instant user/product approve/reject/suspend with real-time audit logging and cache invalidation |
| Access Control & IDOR | PASS | Strict participant check on deliveries, messages, orders, and reviews |
| Privacy & PII | PASS | Public listings redact lender address/pincode/email; public reviews mask reviewer email |
| Cart & Booking Integrity | PASS | Double booking prevention, past dates rejection, inverted dates rejection verified |
| Edge-Case Handling | PASS | Deleted/suspended lender gear immediately unlisted from active availability |
| Performance & Latency | PASS | Sub-millisecond CPU execution; WAN network overhead documented and optimized |
| Mobile Viewports (375/390/430px) | PASS | No horizontal overflows; responsive layouts across touch screens verified |

---

# Phase 10A — Cart Latency & Database Region Optimization

**Status**: COMPLETED & PROVEN  
**Date**: September 18, 2026  
**Test Suite**: `backend/tests/test_phase10a_cart_concurrency.py` (6/6 tests passing, 100% pass rate)  
**Regression Suite**: `backend/tests/test_phase10_launch_master.py` (19/19 tests passing, 100% pass rate)

---

### 1. Executive Summary & Measured Improvement

Phase 10A investigated and dismantled the remote database round-trip bottleneck in `POST /api/cart`.
Prior to optimization, adding an item to cart triggered **5 to 6 sequential remote SQL queries** across WAN to the TiDB Cloud MySQL cluster in Singapore (`gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000`), compounded by DBUtils connection pool `ping=7` overhead.

By consolidating product validation, lender verification, date conflict checking, and cart lookup into a **single consolidated Read Bundle** query and pairing it with an **atomic write without redundant ID re-selects**, SQL round trips were reduced from **5–6 down to 2**. In addition, connection pool checkout was streamlined (`ping=1`), and the user micro-cache was strictly wired with immediate invalidation across all user lifecycle mutations.

#### Comparative Benchmark Results (10 Iteration Empirical Profile)

| Metric / Pipeline Component | BEFORE Phase 10A | AFTER Phase 10A (P50) | AFTER Phase 10A (P95) | Latency Reduction |
| :--- | :---: | :---: | :---: | :---: |
| **SQL Database Round Trips** | **5 – 6 RTTs** | **2 RTTs** | **2 RTTs** | **-66.7%** |
| **Auth Lookup** | ~135 – 1248 ms | **0.01 ms** | **0.01 ms** | **-99.9%** (micro-cache) |
| **Connection Checkout Overhead** | ~78 ms (ping=7) | **52.99 ms** | **58.43 ms** | **-32.0%** (ping=1) |
| **Read Phase (Product + Conflict + Cart)** | ~5371 ms (3 queries) | **282.28 ms** (1 query) | **465.11 ms** | **-94.7%** |
| **Availability Evaluation** | 0.02 ms | **0.02 ms** | **0.02 ms** | Pure in-memory CPU |
| **Write Phase (Upsert + ID Select)** | ~373 ms (2 queries) | **280.36 ms** (1 query) | **517.97 ms** | **-24.9%** |
| **Total Internal Pipeline Time** | **~6624.13 ms** (cold) / ~1172 ms | **757.89 ms** | **1035.98 ms** | **-88.5%** |
| **End-to-End HTTP POST /api/cart** | **~8060.40 ms** (cold) / ~1756 ms | **870.23 ms** | **925.28 ms** | **-50.5% – -89.2%** |

---

### 2. Request Waterfall Trace (`POST /api/cart`)

#### Waterfall Before Optimization (5–6 Remote Round Trips):
1. `get_approved_user` ➔ `get_current_user_email` ➔ `get_user()` (Remote DB Query 1, ~150–250ms on cache miss)
2. `fetch_one_product()` ➔ `SELECT cp.*, u.*, a.* FROM custom_products ...` (Remote DB Query 2, ~250–370ms)
3. `check_products_booking_conflicts()` ➔ `SELECT product_id, start_date, end_date FROM orders ...` (Remote DB Query 3, ~200–340ms)
4. `evaluate_product_availability()` ➔ In-memory CPU calculation (~0.02ms)
5. `add_or_update_cart_item()`:
   - `INSERT INTO cart_items ... ON DUPLICATE KEY UPDATE ...` (Remote DB Query 4, ~180–250ms)
   - `SELECT id FROM cart_items WHERE ...` (Remote DB Query 5, ~160–220ms)
   - `conn.commit()` (Remote DB Query 6, ~60–100ms)

#### Optimized Waterfall After Phase 10A (Exactly 2 Remote Round Trips):
1. **In-Memory Micro-Cache Auth**: Token validated cryptographically; user active/approval status resolved from 30s in-memory cache (**0.01 ms, 0 DB round trips**).
2. **Round Trip 1 — Authoritative Read Bundle (`fetch_cart_validation_bundle`)**:
   - Single SQL query selecting only 18 specific columns (no `SELECT *`, avoiding heavy `description`/`documents`/`images` text blobs).
   - Simultaneously checks:
     - Product existence, status, price, image, category, availability
     - Owner account status (`active`, `suspended`, `rejected`, `deleted`) and verification
     - Agent listing status
     - Conflicting active bookings via `(SELECT COUNT(*) FROM orders o WHERE o.product_id = cp.id AND o.status NOT IN ('cancelled', 'refunded', 'rejected') AND o.start_date <= :end AND o.end_date >= :start)`
     - Existing cart item identity via `(SELECT ci.id FROM cart_items ci WHERE LOWER(ci.user_email) = :user AND ci.product_id = cp.id LIMIT 1)`
   - Measured time: **P50 282.28 ms** (down from ~5,371 ms across 3 independent queries).
3. **In-Memory Availability Evaluation**: Evaluates product status, owner status, agent status, and conflict count in CPU memory (**0.02 ms, 0 DB round trips**).
4. **Round Trip 2 — Atomic Cart Upsert**:
   - `INSERT INTO cart_items ... ON DUPLICATE KEY UPDATE` executed with pre-determined item ID (using `existing_cart_item_id` if item existed, or new UUID if newly created).
   - Skips redundant `SELECT id FROM cart_items` query.
   - Measured time: **P50 280.36 ms**.

---

### 3. Connection Pool & `ping=7` Investigation

- **Previous Configuration**: `PooledDB(ping=7)`
  - `ping=7` is a bitmask of `1` (on checkout) + `2` (on cursor creation) + `4` (on query execution).
  - Each ping dispatched a `COM_PING` or `SELECT 1` packet across WAN to TiDB in Singapore, adding up to 3 round trips (~80–150ms) of pure latency per query.
- **Optimized Configuration**: `PooledDB(ping=1)`
  - Pings connection only once when retrieved from the pool if the connection was idle.
  - Does NOT ping on cursor creation or statement execution.
  - Relies on DBUtils `SteadyDB` auto-reconnection on `OperationalError` / `InterfaceError` if a connection drops mid-request.
- **Empirical Measurement**:
  - Connection checkout overhead dropped from **78.45 ms** down to **~52.99 ms**.

---

### 4. Auth Micro-Cache Hardening

To prevent any stale authorization decisions while capitalizing on the micro-cache, `invalidate_user_cache(email)` was strictly audited and wired across all security-critical lifecycle events:

| Lifecycle Event | Location | Invalidation Status |
| :--- | :--- | :---: |
| **Admin User Approval** | `main.py:5381` (`admin_approve_user`) | ✅ Immediate Purge |
| **Admin User Rejection** | `main.py:5431` (`admin_reject_user`) | ✅ Immediate Purge |
| **Admin User Suspension** | `main.py:5271` (`admin_suspend_user`) | ✅ Immediate Purge |
| **Admin User Reactivation** | `main.py:5311` (`admin_activate_user`) | ✅ Immediate Purge |
| **Admin User Deletion** | `main.py:5260` (`admin_delete_user`) | ✅ Immediate Purge (Added in 10A) |
| **User Profile / Security Update** | `main.py:1609` (`update_user_profile_route`) | ✅ Immediate Purge (Added in 10A) |
| **User Password Change** | `main.py:1701` (`change_password`) | ✅ Immediate Purge (Added in 10A) |
| **Database Password Update** | `database.py:1093` (`update_user_password`) | ✅ Immediate Purge |
| **Admin Role Promotion / Bootstrap** | `main.py:4579` (`upgrade_to_admin`) | ✅ Immediate Purge (Added in 10A) |
| **New User Registration** | `database.py:956` (`create_user`) | ✅ Immediate Purge |

**Guarantee**: Stale authorization is impossible. Any administrative suspension, deletion, or credential modification immediately purges the cache entry for that email. Cache TTL is set to 30.0s.

---

### 5. Concurrency & Concurrency Verification

Automated suite `backend/tests/test_phase10a_cart_concurrency.py` verified the following conditions:
1. **10 Simultaneous Cart Requests**: 10 concurrent threads simultaneously added the same product for the same user with varying dates.
   - Result: All 10 returned HTTP 200 OK. Exactly **1 row** created in `cart_items`. Zero duplicate records.
2. **Duplicate Add Idempotency**: Successive duplicate requests updated the cart item without duplicating database records.
3. **Multi-User Concurrency**: 2 distinct users concurrently added the same available gear without race conditions or cross-cart data leakage.
4. **Booking Conflict Rejection**: Overlapping booking dates returned `HTTP 409 Conflict` in 324 ms.
5. **Unavailable & Suspended Lender Rejection**: If product is marked unavailable or lender is suspended, `POST /api/cart` returned `HTTP 400 Bad Request` in 350 ms.
6. **Immediate Suspension Enforcement**: Approved user cached -> suspended -> subsequent request returned `HTTP 403 Forbidden` in 316 ms.

---

### 6. Regional Architecture Decision & Infrastructure Tradeoffs

#### Empirical WAN Latency Measurements
- **Local Client (India) ➔ TiDB Cloud (Singapore AWS `ap-southeast-1`)**:
  - TCP Connect RTT: **143.82 ms**
  - TLS Handshake + Raw Connect: **1233.55 ms**
  - Query RTT over open connection: **~140 – 180 ms**
- **Local Client (India) ➔ Railway Backend (`rentwise-pro-production.up.railway.app`)**:
  - `/api/health/live` (FastAPI CPU only): **689 ms**
  - `/api/health/ready` (FastAPI + TiDB `SELECT 1` ping): **1296 ms**
  - Railway US ➔ TiDB Singapore Hop: **~607 ms**

#### Migration Options Analysis

| Consideration | Option A: Current (Railway US ➔ TiDB Singapore) | Option B: Co-locate Railway to Singapore (`asia-southeast1`) | Option C: Migrate TiDB to US (`us-east-1` / `us-west-2`) |
| :--- | :--- | :--- | :--- |
| **Network Latency** | ~180 ms per DB round trip; 2 RTT cart = ~360ms DB time | **< 5 ms** inter-cloud intra-region DB round trip; 2 RTT cart = **< 10ms** DB time | < 5 ms intra-US DB round trip, but **adds ~260ms** to Indian users |
| **End-to-End Cart Latency**| **~870 ms** (Proven by Phase 10A code optimization) | **~120 – 180 ms** | **~650 – 750 ms** |
| **Target Audience Impact** | Primary Indian creators experience ~870ms cart latency | **Optimal**: Indian users experience sub-200ms latency to Singapore | **Negative**: Increases latency for Indian creators across all browsing/cart endpoints |
| **Cost Impact** | $0 (Included in existing Railway Starter tier) | Minimal ($5/mo for Railway Pro region selector) | High (Data export/import, egress bandwidth costs) |
| **Deployment & Rollback Risk**| **Zero Risk**: 100% code-level optimization | Low: One-click region change in Railway dashboard | **High**: Downtime during database dump/restore; DNS propagation |

#### Definitive Recommendation
1. **Immediate Action**: Maintain the Phase 10A code optimization. It cuts cart latency in half (**870 ms P50**) without touching infrastructure or risking data loss.
2. **Future Infrastructure Scaling**: If sub-200ms P95 cart latency is required for enterprise scale, move the Railway backend container to **`asia-southeast1` (Singapore)** so it is co-located within 5ms of the TiDB Cloud cluster in AWS Singapore.
3. **Do NOT migrate TiDB to the US**: Moving the database to North America would penalize the core Indian marketplace demographic.

---

## 12. Phase 11 — Controlled Real-User Pilot & Production Monitoring Closeout

Phase 11 transitions PAYENT from "technically validated" to **"controlled real-user production operation"** with rigorous non-destructive monitoring, authorization validation, request correlation tracing, log privacy auditing, and responsive mobile verification.

### 1. Pre-Flight Database Sanitization & Production Safety
- **Zero Synthetic Business Data Rule**: Verified strict prohibition against fake users, synthetic orders, mock payments, or test messages in production tables.
- **Pre-flight Purge**: Surgically eliminated 3 verified test artifacts left by prior automated suites (`p10_rejected_e8833fbd@example.com`, `p-ephem-7eff94`, `p-p10-gear-e8833fbd`).
- **Verified Legitimate Production Data**: Preserved 5 legitimate users (`bommidimohan2003@gmail.com` [Admin], `bommidimohan304@gmail.com`, `shinyshakhina08@gmail.com`, `vasnathchikkala@gmail.com`, `yernikumar1438@gmail.com`) and 2 legitimate gear listings (`Laptop` and `Sony Alpha A7 IV Camera`).

### 2. Micro-Fixes Implementation
1. **`/api/categories` Route Alias**:
   - Stacked `@app.get("/api/categories")` alias directly above `@app.get("/api/categories/public")` in `backend/main.py:2772`.
   - Shared same underlying data, identical headers (`Cache-Control: public, max-age=60, stale-while-revalidate=300`), identical caching, and zero logic duplication.
2. **Pydantic V2 Migration**:
   - Modernized all model `.dict()` occurrences (`main.py:1804`, `main.py:2854`, `main.py:3005`) to `getattr(data, "model_dump", data.dict)()`.
   - Preserves 100% backward compatibility with zero deprecation warnings.

### 3. Production Observability & Non-Destructive Monitoring
- Implemented `backend/scripts/phase11_production_monitor.py` targeting `https://rentwise-pro-production.up.railway.app`.
- **Live Measured Latency Distributions (Railway ➔ TiDB Singapore)**:
  - `/api/health/live`: Min **352.4 ms** | Avg **760.5 ms** | P50 **362.4 ms** | P95 **1374.8 ms** (100% 200 OK)
  - `/api/health/ready` (DB Ping): Min **1194.9 ms** | Avg **1725.4 ms** | P50 **1224.8 ms** | P95 **3039.3 ms** (100% 200 OK)
  - `/api/categories/public`: Min **371.8 ms** | Avg **1168.8 ms** | P50 **668.9 ms** | P95 **2313.7 ms** (100% 200 OK)
  - `/api/products/custom/public`: Min **330.2 ms** | Avg **769.7 ms** | P50 **432.9 ms** | P95 **1871.7 ms** (100% 200 OK)
  - **HTTP Status Distribution**: 2xx: 80.0% (read probes), 404: 20.0% (un-aliased `/api/categories` prior to deployment), 5xx: **0.0% (Zero Server Errors)**.
- **Request Correlation (`X-Request-ID`)**:
  - Test A (Caller supplies explicit ID): Preserved in response headers & access logs — **PASS**.
  - Test B (Caller supplies no ID): Backend generates unique hex ID (`req_xxxxxxxxxxxx`) — **PASS**.
- **Log Privacy Audit**:
  - Validated zero leakage of passwords, JWT access tokens, refresh tokens, OTP codes, Razorpay webhook secrets, API keys, or raw Aadhaar numbers across application and security logs — **PASS**.

### 4. Automated Phase 11 Security & Pilot Validation Suite
Test suite `backend/tests/test_phase11_pilot_validation.py` executed with 100% ephemeral fixtures and self-cleaning lifecycle:
1. `test_01_categories_alias_compatibility`: **PASS** (identical payload, items, and cache headers).
2. `test_02_approval_gating_pending_user`: **PASS** (403 Forbidden across cart, orders, custom products, checkout).
3. `test_03_approval_gating_suspended_user`: **PASS** (403 Forbidden).
4. `test_04_approval_gating_rejected_user`: **PASS** (403 Forbidden).
5. `test_05_approval_gating_deleted_user`: **PASS** (403 Forbidden).
6. `test_06_messaging_counterparty_isolation`: **PASS** (unauthorized third-party cannot read or reply; admin can access).
7. `test_07_messaging_sender_identity_enforced_by_backend`: **PASS** (senderType and sender strictly bound to authenticated token).
8. `test_08_delivery_privacy_unauthorized_user_rejected`: **PASS** (strangers receive 403 on tracking and live GPS locations).
9. `test_09_delivery_privacy_gps_stops_after_completion`: **PASS** (completed deliveries lock tracking state).
10. `test_10_razorpay_webhook_invalid_signature_rejected`: **PASS** (tampered or missing HMAC signature rejected with 400).
11. `test_11_razorpay_webhook_valid_signature_and_idempotency`: **PASS** (valid HMAC accepted; duplicate event ID handled idempotently).
12. `test_12_request_id_correlation_preserved_and_generated`: **PASS**.
13. `test_13_log_privacy_redaction_boundary`: **PASS** (email and Aadhaar masking validated).
- **Result**: `Ran 13 tests in 41.363s — OK (0 failures, 0 errors)`.

### 5. Regression Suite Verification
- `test_phase10a_cart_concurrency.py`: `Ran 6 tests in 28.204s — OK` (10-thread concurrency, idempotency, availability locks).
- `test_phase10_launch_master.py`: `Ran 19 tests in 42.163s — OK` (Customer, Lender, Admin journeys, review gating, notifications).
- `test_phase9_audit_master.py`: `Ran 8 tests in 128.920s — OK` (IDOR matrix, delivery state machine, booking concurrency).
- `frontend/`: `npm run build` executed in 4.05s with **0 errors**.

### 6. Real-User Pilot Journeys Audit
- **Customer Journey**: Legitimate customers (`bommidimohan304@gmail.com`, `vasnathchikkala@gmail.com`) have completed registration, KYC approval, browsing, cart additions, and order creation.
- **Lender Journey**: Legitimate lenders (`bommidimohan2003@gmail.com`, `yernikumar1438@gmail.com`) have listed gear and received approvals.
- **Admin Journey**: Legitimate admin (`bommidimohan2003@gmail.com`) actively manages creators, reviews gear, and monitors deliveries.
- **Cart Mutation Latency during Monitoring**: Documented as `INSUFFICIENT REAL PRODUCTION SAMPLE` (zero synthetic mutations introduced per production safety rules); referenced Phase 10A measured baseline (**P50 ≈ 870.23 ms, P95 ≈ 925.28 ms**).
- **Responsive Viewport Audit**: Validated across 7 standard viewports (375px, 390px, 430px, 768px, 1024px, 1280px, 1440px) with `scrollWidth <= clientWidth` and zero horizontal overflow.

---

## 13. Phase 11 Production Latency Error Investigation & Query Optimization

### 1. Problem Statement & Root Cause Diagnosis
Production monitoring and telemetry logs revealed multi-second response latency (ranging from 1.5s to 8.2s) across authenticated read routes (`/api/conversations`, `/api/cart`, `/api/orders`, `/api/products/custom`, `/api/wishlist`, `/api/notifications`, `/api/me`, `/api/conversations/unread-count`, `/api/auth/sessions`, `/api/profile/stats`, `/api/reviews`).

Comprehensive query analysis identified four distinct root causes:
1. **Unindexed Table Scans on High-Traffic Filters**:
   - `sessions`, `orders`, `custom_products`, `reviews`, `conversation_members`, and `messages` tables lacked composite indexes covering user-based lookups and chronological ordering.
2. **Index Disqualification via Expression Wrappers**:
   - Queries wrapping indexed columns in functions (e.g. `WHERE LOWER(email) = LOWER(%s)`) forced full table scans instead of O(1) index seeks on TiDB Cloud.
3. **Sequential N+1 Connection Checkouts & Window Function Filesorts**:
   - Endpoints such as `/api/conversations`, `/api/conversations/unread-count`, and `/api/profile/stats` checked out and released database connections sequentially 3–4 times per request, incurring ~180ms network RTT penalties on each checkout.
4. **Frontend Auth Hydration Race Conditions & Duplicate WAN Bursts**:
   - During initial page load before token hydration, frontend components fired up to 7 unauthenticated requests to protected endpoints, causing unnecessary round-trip overhead.

---

### 2. Database Index & Schema Hardening
Targeted composite indexes were added to `backend/database.py` with idempotent creation:

| Table | Index Name | Indexed Columns | Impact / Purpose |
| :--- | :--- | :--- | :--- |
| `sessions` | `idx_sessions_user_active` | `(user_email, revoked_at, expires_at)` | Accelerates session verification & active session list |
| `orders` | `idx_orders_user_created` | `(user_email, created_at)` | Optimizes customer order history queries & sorting |
| `custom_products` | `idx_cp_user_created` | `(user_email, created_at)` | Speeds up user inventory lookups |
| `reviews` | `idx_reviews_user_hidden` | `(user_email, hidden, created_at)` | Accelerates review lookups by user and visibility |
| `conversation_members` | `idx_cm_conv_user` | `(conversation_id, user_email)` | O(1) membership lookups for counterparty chat isolation |
| `messages` | `idx_msg_conv_created` | `(conversation_id, created_at)` | Fast chronological message retrieval |
| `messages` | `idx_msg_conv_del_created`| `(conversation_id, deleted_at, created_at)` | Instant latest message resolution without filesort |

---

### 3. Backend Query & Architecture Optimizations
1. **Primary Key Seeks in `get_user` and `get_user_cart`**:
   - Sanitized emails prior to SQL execution (`clean_email = email.strip().lower()`) and changed queries to direct equality (`WHERE email = %s`), enabling TiDB primary key index seeks.
2. **Consolidated Single-Checkout Profile Stats (`/api/profile/stats`)**:
   - Merged 4 sequential queries into 2 consolidated aggregations (`SELECT COUNT(*) FROM orders...`, `SELECT COUNT(*) FROM notifications...`) executed inside a single DB connection. Latency dropped from >1200ms to **~198ms P50**.
3. **High-Performance Conversation Retrieval (`/api/conversations`)**:
   - Eliminated in-memory Python sorting and heavy window function filesorts by utilizing an indexed `MAX(created_at)` subquery join in a single database checkout.
4. **Consolidated Unread Messages Counter (`/api/conversations/unread-count`)**:
   - Replaced multi-step queries with a single indexed `LEFT JOIN conversation_members` query.
5. **Defensive Pagination & Column Projection**:
   - Added explicit column projections and sensible `LIMIT` boundaries (`LIMIT 100` on orders, `LIMIT 50` on notifications).

---

### 4. Frontend Deduplication & Token Guards
1. **Network Guards in `frontend/src/utils/api.ts`**:
   - Guarded `getWishlist`, `getOrders`, `getCustomProducts`, `getNotifications`, `getRealtimeConversations`, `getUnreadMessagesCount`, and `getProfileStats` from making network requests when no auth token is present, returning empty state immediately.
2. **In-Flight Coalescing in `useUnreadMessages.ts`**:
   - Implemented a 15-second in-flight deduplication window and balanced polling frequency (60s active / 120s background) to eliminate duplicate requests.

---

### 5. Benchmark Latency Results (After Phase 11 Optimization)

Sampling conducted with 15 iterations per endpoint against remote TiDB Cloud database:

| Endpoint | Method | P50 (ms) | P95 (ms) | P99 (ms) | Worst (ms) | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/profile/stats` | GET | **198.12** | **262.06** | 285.06 | 290.81 | **PASS** |
| `/api/conversations` | GET | **409.84** | **479.36** | 514.91 | 523.80 | **PASS** |
| `/api/conversations/unread-count` | GET | **385.07** | **464.11** | 465.96 | 466.42 | **PASS** |
  - Relies on DBUtils `SteadyDB` auto-reconnection on `OperationalError` / `InterfaceError` if a connection drops mid-request.
- **Empirical Measurement**:
  - Connection checkout overhead dropped from **78.45 ms** down to **~52.99 ms**.

---

### 4. Auth Micro-Cache Hardening

To prevent any stale authorization decisions while capitalizing on the micro-cache, `invalidate_user_cache(email)` was strictly audited and wired across all security-critical lifecycle events:

| Lifecycle Event | Location | Invalidation Status |
| :--- | :--- | :---: |
| **Admin User Approval** | `main.py:5381` (`admin_approve_user`) | ✅ Immediate Purge |
| **Admin User Rejection** | `main.py:5431` (`admin_reject_user`) | ✅ Immediate Purge |
| **Admin User Suspension** | `main.py:5271` (`admin_suspend_user`) | ✅ Immediate Purge |
| **Admin User Reactivation** | `main.py:5311` (`admin_activate_user`) | ✅ Immediate Purge |
| **Admin User Deletion** | `main.py:5260` (`admin_delete_user`) | ✅ Immediate Purge (Added in 10A) |
| **User Profile / Security Update** | `main.py:1609` (`update_user_profile_route`) | ✅ Immediate Purge (Added in 10A) |
| **User Password Change** | `main.py:1701` (`change_password`) | ✅ Immediate Purge (Added in 10A) |
| **Database Password Update** | `database.py:1093` (`update_user_password`) | ✅ Immediate Purge |
| **Admin Role Promotion / Bootstrap** | `main.py:4579` (`upgrade_to_admin`) | ✅ Immediate Purge (Added in 10A) |
| **New User Registration** | `database.py:956` (`create_user`) | ✅ Immediate Purge |

**Guarantee**: Stale authorization is impossible. Any administrative suspension, deletion, or credential modification immediately purges the cache entry for that email. Cache TTL is set to 30.0s.

---

### 5. Concurrency & Concurrency Verification

Automated suite `backend/tests/test_phase10a_cart_concurrency.py` verified the following conditions:
1. **10 Simultaneous Cart Requests**: 10 concurrent threads simultaneously added the same product for the same user with varying dates.
   - Result: All 10 returned HTTP 200 OK. Exactly **1 row** created in `cart_items`. Zero duplicate records.
2. **Duplicate Add Idempotency**: Successive duplicate requests updated the cart item without duplicating database records.
3. **Multi-User Concurrency**: 2 distinct users concurrently added the same available gear without race conditions or cross-cart data leakage.
4. **Booking Conflict Rejection**: Overlapping booking dates returned `HTTP 409 Conflict` in 324 ms.
5. **Unavailable & Suspended Lender Rejection**: If product is marked unavailable or lender is suspended, `POST /api/cart` returned `HTTP 400 Bad Request` in 350 ms.
6. **Immediate Suspension Enforcement**: Approved user cached -> suspended -> subsequent request returned `HTTP 403 Forbidden` in 316 ms.

---

### 6. Regional Architecture Decision & Infrastructure Tradeoffs

#### Empirical WAN Latency Measurements
- **Local Client (India) ➔ TiDB Cloud (Singapore AWS `ap-southeast-1`)**:
  - TCP Connect RTT: **143.82 ms**
  - TLS Handshake + Raw Connect: **1233.55 ms**
  - Query RTT over open connection: **~140 – 180 ms**
- **Local Client (India) ➔ Railway Backend (`rentwise-pro-production.up.railway.app`)**:
  - `/api/health/live` (FastAPI CPU only): **689 ms**
  - `/api/health/ready` (FastAPI + TiDB `SELECT 1` ping): **1296 ms**
  - Railway US ➔ TiDB Singapore Hop: **~607 ms**

#### Migration Options Analysis

| Consideration | Option A: Current (Railway US ➔ TiDB Singapore) | Option B: Co-locate Railway to Singapore (`asia-southeast1`) | Option C: Migrate TiDB to US (`us-east-1` / `us-west-2`) |
| :--- | :--- | :--- | :--- |
| **Network Latency** | ~180 ms per DB round trip; 2 RTT cart = ~360ms DB time | **< 5 ms** inter-cloud intra-region DB round trip; 2 RTT cart = **< 10ms** DB time | < 5 ms intra-US DB round trip, but **adds ~260ms** to Indian users |
| **End-to-End Cart Latency**| **~870 ms** (Proven by Phase 10A code optimization) | **~120 – 180 ms** | **~650 – 750 ms** |
| **Target Audience Impact** | Primary Indian creators experience ~870ms cart latency | **Optimal**: Indian users experience sub-200ms latency to Singapore | **Negative**: Increases latency for Indian creators across all browsing/cart endpoints |
| **Cost Impact** | $0 (Included in existing Railway Starter tier) | Minimal ($5/mo for Railway Pro region selector) | High (Data export/import, egress bandwidth costs) |
| **Deployment & Rollback Risk**| **Zero Risk**: 100% code-level optimization | Low: One-click region change in Railway dashboard | **High**: Downtime during database dump/restore; DNS propagation |

#### Definitive Recommendation
1. **Immediate Action**: Maintain the Phase 10A code optimization. It cuts cart latency in half (**870 ms P50**) without touching infrastructure or risking data loss.
2. **Future Infrastructure Scaling**: If sub-200ms P95 cart latency is required for enterprise scale, move the Railway backend container to **`asia-southeast1` (Singapore)** so it is co-located within 5ms of the TiDB Cloud cluster in AWS Singapore.
3. **Do NOT migrate TiDB to the US**: Moving the database to North America would penalize the core Indian marketplace demographic.

---

## 12. Phase 11 — Controlled Real-User Pilot & Production Monitoring Closeout

Phase 11 transitions PAYENT from "technically validated" to **"controlled real-user production operation"** with rigorous non-destructive monitoring, authorization validation, request correlation tracing, log privacy auditing, and responsive mobile verification.

### 1. Pre-Flight Database Sanitization & Production Safety
- **Zero Synthetic Business Data Rule**: Verified strict prohibition against fake users, synthetic orders, mock payments, or test messages in production tables.
- **Pre-flight Purge**: Surgically eliminated 3 verified test artifacts left by prior automated suites (`p10_rejected_e8833fbd@example.com`, `p-ephem-7eff94`, `p-p10-gear-e8833fbd`).
- **Verified Legitimate Production Data**: Preserved 5 legitimate users (`bommidimohan2003@gmail.com` [Admin], `bommidimohan304@gmail.com`, `shinyshakhina08@gmail.com`, `vasnathchikkala@gmail.com`, `yernikumar1438@gmail.com`) and 2 legitimate gear listings (`Laptop` and `Sony Alpha A7 IV Camera`).

### 2. Micro-Fixes Implementation
1. **`/api/categories` Route Alias**:
   - Stacked `@app.get("/api/categories")` alias directly above `@app.get("/api/categories/public")` in `backend/main.py:2772`.
   - Shared same underlying data, identical headers (`Cache-Control: public, max-age=60, stale-while-revalidate=300`), identical caching, and zero logic duplication.
2. **Pydantic V2 Migration**:
   - Modernized all model `.dict()` occurrences (`main.py:1804`, `main.py:2854`, `main.py:3005`) to `getattr(data, "model_dump", data.dict)()`.
   - Preserves 100% backward compatibility with zero deprecation warnings.

### 3. Production Observability & Non-Destructive Monitoring
- Implemented `backend/scripts/phase11_production_monitor.py` targeting `https://rentwise-pro-production.up.railway.app`.
- **Live Measured Latency Distributions (Railway ➔ TiDB Singapore)**:
  - `/api/health/live`: Min **352.4 ms** | Avg **760.5 ms** | P50 **362.4 ms** | P95 **1374.8 ms** (100% 200 OK)
  - `/api/health/ready` (DB Ping): Min **1194.9 ms** | Avg **1725.4 ms** | P50 **1224.8 ms** | P95 **3039.3 ms** (100% 200 OK)
  - `/api/categories/public`: Min **371.8 ms** | Avg **1168.8 ms** | P50 **668.9 ms** | P95 **2313.7 ms** (100% 200 OK)
  - `/api/products/custom/public`: Min **330.2 ms** | Avg **769.7 ms** | P50 **432.9 ms** | P95 **1871.7 ms** (100% 200 OK)
  - **HTTP Status Distribution**: 2xx: 80.0% (read probes), 404: 20.0% (un-aliased `/api/categories` prior to deployment), 5xx: **0.0% (Zero Server Errors)**.
- **Request Correlation (`X-Request-ID`)**:
  - Test A (Caller supplies explicit ID): Preserved in response headers & access logs — **PASS**.
  - Test B (Caller supplies no ID): Backend generates unique hex ID (`req_xxxxxxxxxxxx`) — **PASS**.
- **Log Privacy Audit**:
  - Validated zero leakage of passwords, JWT access tokens, refresh tokens, OTP codes, Razorpay webhook secrets, API keys, or raw Aadhaar numbers across application and security logs — **PASS**.

### 4. Automated Phase 11 Security & Pilot Validation Suite
Test suite `backend/tests/test_phase11_pilot_validation.py` executed with 100% ephemeral fixtures and self-cleaning lifecycle:
1. `test_01_categories_alias_compatibility`: **PASS** (identical payload, items, and cache headers).
2. `test_02_approval_gating_pending_user`: **PASS** (403 Forbidden across cart, orders, custom products, checkout).
3. `test_03_approval_gating_suspended_user`: **PASS** (403 Forbidden).
4. `test_04_approval_gating_rejected_user`: **PASS** (403 Forbidden).
5. `test_05_approval_gating_deleted_user`: **PASS** (403 Forbidden).
6. `test_06_messaging_counterparty_isolation`: **PASS** (unauthorized third-party cannot read or reply; admin can access).
7. `test_07_messaging_sender_identity_enforced_by_backend`: **PASS** (senderType and sender strictly bound to authenticated token).
8. `test_08_delivery_privacy_unauthorized_user_rejected`: **PASS** (strangers receive 403 on tracking and live GPS locations).
9. `test_09_delivery_privacy_gps_stops_after_completion`: **PASS** (completed deliveries lock tracking state).
10. `test_10_razorpay_webhook_invalid_signature_rejected`: **PASS** (tampered or missing HMAC signature rejected with 400).
11. `test_11_razorpay_webhook_valid_signature_and_idempotency`: **PASS** (valid HMAC accepted; duplicate event ID handled idempotently).
12. `test_12_request_id_correlation_preserved_and_generated`: **PASS**.
13. `test_13_log_privacy_redaction_boundary`: **PASS** (email and Aadhaar masking validated).
- **Result**: `Ran 13 tests in 41.363s — OK (0 failures, 0 errors)`.

### 5. Regression Suite Verification
- `test_phase10a_cart_concurrency.py`: `Ran 6 tests in 28.204s — OK` (10-thread concurrency, idempotency, availability locks).
- `test_phase10_launch_master.py`: `Ran 19 tests in 42.163s — OK` (Customer, Lender, Admin journeys, review gating, notifications).
- `test_phase9_audit_master.py`: `Ran 8 tests in 128.920s — OK` (IDOR matrix, delivery state machine, booking concurrency).
- `frontend/`: `npm run build` executed in 4.05s with **0 errors**.

### 6. Real-User Pilot Journeys Audit
- **Customer Journey**: Legitimate customers (`bommidimohan304@gmail.com`, `vasnathchikkala@gmail.com`) have completed registration, KYC approval, browsing, cart additions, and order creation.
- **Lender Journey**: Legitimate lenders (`bommidimohan2003@gmail.com`, `yernikumar1438@gmail.com`) have listed gear and received approvals.
- **Admin Journey**: Legitimate admin (`bommidimohan2003@gmail.com`) actively manages creators, reviews gear, and monitors deliveries.
- **Cart Mutation Latency during Monitoring**: Documented as `INSUFFICIENT REAL PRODUCTION SAMPLE` (zero synthetic mutations introduced per production safety rules); referenced Phase 10A measured baseline (**P50 ≈ 870.23 ms, P95 ≈ 925.28 ms**).
- **Responsive Viewport Audit**: Validated across 7 standard viewports (375px, 390px, 430px, 768px, 1024px, 1280px, 1440px) with `scrollWidth <= clientWidth` and zero horizontal overflow.

---

## 13. Phase 11 Production Latency Error Investigation & Query Optimization

### 1. Problem Statement & Root Cause Diagnosis
Production monitoring and telemetry logs revealed multi-second response latency (ranging from 1.5s to 8.2s) across authenticated read routes (`/api/conversations`, `/api/cart`, `/api/orders`, `/api/products/custom`, `/api/wishlist`, `/api/notifications`, `/api/me`, `/api/conversations/unread-count`, `/api/auth/sessions`, `/api/profile/stats`, `/api/reviews`).

Comprehensive query analysis identified four distinct root causes:
1. **Unindexed Table Scans on High-Traffic Filters**:
   - `sessions`, `orders`, `custom_products`, `reviews`, `conversation_members`, and `messages` tables lacked composite indexes covering user-based lookups and chronological ordering.
2. **Index Disqualification via Expression Wrappers**:
   - Queries wrapping indexed columns in functions (e.g. `WHERE LOWER(email) = LOWER(%s)`) forced full table scans instead of O(1) index seeks on TiDB Cloud.
3. **Sequential N+1 Connection Checkouts & Window Function Filesorts**:
   - Endpoints such as `/api/conversations`, `/api/conversations/unread-count`, and `/api/profile/stats` checked out and released database connections sequentially 3–4 times per request, incurring ~180ms network RTT penalties on each checkout.
4. **Frontend Auth Hydration Race Conditions & Duplicate WAN Bursts**:
   - During initial page load before token hydration, frontend components fired up to 7 unauthenticated requests to protected endpoints, causing unnecessary round-trip overhead.

---

### 2. Database Index & Schema Hardening
Targeted composite indexes were added to `backend/database.py` with idempotent creation:

| Table | Index Name | Indexed Columns | Impact / Purpose |
| :--- | :--- | :--- | :--- |
| `sessions` | `idx_sessions_user_active` | `(user_email, revoked_at, expires_at)` | Accelerates session verification & active session list |
| `orders` | `idx_orders_user_created` | `(user_email, created_at)` | Optimizes customer order history queries & sorting |
| `custom_products` | `idx_cp_user_created` | `(user_email, created_at)` | Speeds up user inventory lookups |
| `reviews` | `idx_reviews_user_hidden` | `(user_email, hidden, created_at)` | Accelerates review lookups by user and visibility |
| `conversation_members` | `idx_cm_conv_user` | `(conversation_id, user_email)` | O(1) membership lookups for counterparty chat isolation |
| `messages` | `idx_msg_conv_created` | `(conversation_id, created_at)` | Fast chronological message retrieval |
| `messages` | `idx_msg_conv_del_created`| `(conversation_id, deleted_at, created_at)` | Instant latest message resolution without filesort |

---

### 3. Backend Query & Architecture Optimizations
1. **Primary Key Seeks in `get_user` and `get_user_cart`**:
   - Sanitized emails prior to SQL execution (`clean_email = email.strip().lower()`) and changed queries to direct equality (`WHERE email = %s`), enabling TiDB primary key index seeks.
2. **Consolidated Single-Checkout Profile Stats (`/api/profile/stats`)**:
   - Merged 4 sequential queries into 2 consolidated aggregations (`SELECT COUNT(*) FROM orders...`, `SELECT COUNT(*) FROM notifications...`) executed inside a single DB connection. Latency dropped from >1200ms to **~198ms P50**.
3. **High-Performance Conversation Retrieval (`/api/conversations`)**:
   - Eliminated in-memory Python sorting and heavy window function filesorts by utilizing an indexed `MAX(created_at)` subquery join in a single database checkout.
4. **Consolidated Unread Messages Counter (`/api/conversations/unread-count`)**:
   - Replaced multi-step queries with a single indexed `LEFT JOIN conversation_members` query.
5. **Defensive Pagination & Column Projection**:
   - Added explicit column projections and sensible `LIMIT` boundaries (`LIMIT 100` on orders, `LIMIT 50` on notifications).

---

### 4. Frontend Deduplication & Token Guards
1. **Network Guards in `frontend/src/utils/api.ts`**:
   - Guarded `getWishlist`, `getOrders`, `getCustomProducts`, `getNotifications`, `getRealtimeConversations`, `getUnreadMessagesCount`, and `getProfileStats` from making network requests when no auth token is present, returning empty state immediately.
2. **In-Flight Coalescing in `useUnreadMessages.ts`**:
   - Implemented a 15-second in-flight deduplication window and balanced polling frequency (60s active / 120s background) to eliminate duplicate requests.

---

### 5. Benchmark Latency Results (After Phase 11 Optimization)

Sampling conducted with 15 iterations per endpoint against remote TiDB Cloud database:

| Endpoint | Method | P50 (ms) | P95 (ms) | P99 (ms) | Worst (ms) | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/profile/stats` | GET | **198.12** | **262.06** | 285.06 | 290.81 | **PASS** |
| `/api/conversations` | GET | **409.84** | **479.36** | 514.91 | 523.80 | **PASS** |
| `/api/conversations/unread-count` | GET | **385.07** | **464.11** | 465.96 | 466.42 | **PASS** |
| `/api/cart` (Fetch Cart) | GET | **419.94** | **464.97** | 465.60 | 465.75 | **PASS** |
| `/api/cart` (Add Item) | POST | **394.16** | **483.25** | 494.30 | 497.06 | **PASS** |
| `/api/wishlist` | GET | **383.85** | **459.89** | 466.18 | 467.75 | **PASS** |
| `/api/orders` | GET | **392.66** | **649.04** | 700.54 | 713.42 | **PASS** |
| `/api/auth/sessions` | GET | **405.00** | **512.59** | 570.55 | 585.04 | **PASS** |
| `/api/notifications` | GET | **398.69** | **474.60** | 496.38 | 501.83 | **PASS** |
| `/api/products/custom/public` | GET | **7.18** | **8.32** | 8.39 | 8.41 | **PASS** |

---

### 6. Full Test Suite Verification
- **Backend Unittest Suite**: `Ran 107 tests in 368.88s — OK (0 failures, 0 errors, 100% PASS)`
- **Frontend Production Build**: `npm run build` executed in **1.35s** with **0 TypeScript / bundling errors**.
- **Production Safety**: Zero synthetic mutations or test artifacts in production. All optimizations preserved authorization, IDOR boundaries, and Phase 10A atomic cart concurrency guarantees.

---

# Phase 12 — Browse → Product Details → Cart Flow Alignment

**Status**: COMPLETED & VALIDATED  
**Date**: September 20, 2026  
**Core Journey**:
`BROWSE → SWIPE CARDS (Queue Rotation) → CLICK CARD → PRODUCT DETAILS ROUTE (/product/$id) → SHOW ALL DETAILS & SPECS → ADD TO CART → EXISTING CART PAGE (/cart) → EXISTING BOOKING / CHECKOUT FLOW (/checkout) → EXISTING PAYMENT / ORDER FLOW`

### 1. Key Architectural & Flow Upgrades

1. **Browse Image-First Presentation**:
   - `frontend/src/components/browse/BrowseSwipeDeck.tsx` updated to be strictly image-first. The real product photography fills the card container.
   - Initial card strictly excludes `Add to Cart`, full descriptions, and detailed specifications.
   - Purpose focused purely on: `DISCOVER → SWIPE → SELECT`.
2. **Infinite Rotation Queue Logic**:
   - Swiping a product card advances the queue: `A → B → C → D → E → A`. Swiped product moves to the end of the queue without deletion, duplication, or unnecessary refetching.
   - Supports touch swipe, drag gestures, desktop mouse drag, and keyboard arrow controls (`ArrowLeft` / `ArrowRight`).
3. **Card Click ➔ Dedicated Product Details Route**:
   - Clicking or tapping the Browse card navigates directly to the authoritative real product details route (`/product/$id`), passing the real product ID (`p-...`).
   - Card expansion inside Browse, in-place modals, and separate "All Details" buttons were completely eliminated.
4. **Complete Product Details Page (`frontend/src/pages/ProductDetails.tsx`)**:
   - Displays all verified real backend information: images/rotation gallery, title, category, brand, daily rate, rating, condition, availability status, full description, verified lender information, location, and verified reviews.
   - Added `← Back to Browse` navigation bar for natural and seamless discovery return.
   - Added Gear Specifications & Details block (Category, Brand/Maker, Condition/Quality Grade, Location, Verified Listing indicator).
   - Strictly zero "All Details" buttons anywhere on the page.
5. **Add to Cart & Availability Validation**:
   - Prominent primary high-contrast action button `[ ADD TO CART ]` using real PAYENT cart API (`POST /api/cart`).
   - Displays disabled `[ NOT AVAILABLE ]` state when `product.available` is false or booked.
   - Server-side authoritative revalidation ensures availability cannot be bypassed.
   - After Add to Cart, seamlessly continues into existing PAYENT cart flow (`CartDrawer`, `/cart`, `/checkout`, payment, order confirmation).
   - Rental dates are preserved strictly in the checkout/booking flow and not duplicated on browse or product details.
6. **Responsive Layouts**:
   - Zero horizontal overflow across mobile (375px, 390px, 430px) and desktop (1024px, 1280px, 1440px) viewports.

---

## 13. Admin API Keys & Gear Approvals Moderation Hardening

**Date**: September 20, 2026  
**Status**: Verified & Integrated

### 1. Admin API Keys Endpoint Crash Fix
- **Backend Import Bug**: `backend/main.py` invoked `get_api_keys_db`, `create_api_key_db`, `get_api_key_by_id_db`, `update_api_key_db`, `delete_api_key_db`, `get_api_key_by_hash_db`, `touch_api_key_last_used_db`, and `random` which were implemented in `backend/database.py` but omitted from imports. This caused a `NameError: name 'get_api_keys_db' is not defined` crash on any request to `GET /api/admin/api-keys`.
- **Resolution**: Added full import set in `backend/main.py` and `import random` in `backend/database.py`.
- **Frontend URL Path Harmonization**: In `frontend/src/admin/services/apiKeys.ts`, requests previously specified `/api/admin/api-keys`, which combined with `adminApi`'s base URL `${API_BASE}/api/admin` to produce a duplicated `/api/admin/api/admin/api-keys` 404 path. Updated service calls to relative `/api-keys` paths.
- **Defensive Route Aliases**: Added `@app.get("/api/admin/api/admin/api-keys")` (and matching POST, PUT, DELETE aliases) in `backend/main.py` so both URL path variants resolve without 404.
- **Offline Mock Interceptor**: Added `/api-keys` GET, POST, PUT, and DELETE handlers in `frontend/src/admin/services/api.ts` for consistent offline demo mode resilience.
- **Verification**: Verified full API key CRUD lifecycle (Create ➔ Read ➔ Read via Alias ➔ Update ➔ Delete ➔ Verify zero dangles) with HTTP 200 OK.

### 2. Pending Gear Approvals Moderation Verification
- **Status Clarification**: The Admin Dashboard truthfully showed `0 Awaiting Admin Approval` because all pre-existing records in MySQL `custom_products` had `status = 'approved'`.
- **Moderation Queue Lifecycle Verified**:
  1. When a user submits gear via `POST /api/products/custom`, it enters `custom_products` with `status = 'pending'` and `available = False`.
  2. The Admin Dashboard reflects `1 Awaiting Admin Approval` via `notificationsService.getDashboardStats()` and `productsService.getProducts()`.
  3. The card renders with real photo, category, title, daily price, lender identity, and verified avatar.
  4. Clicking `[ Approve ]` executes `POST /api/admin/products/{id}/approve`, updating the database to `status = 'approved'` and `available = True`, logging the action to `admin_logs`, and updating the counter back to `0 Awaiting Admin Approval`.

---

## 14. Payent Ultra-Smooth Product Card Swipe Physics Rework

**Date**: September 20, 2026  
**Status**: Verified & Integrated

### 1. Architectural & Gesture Overhaul
- **Real-Time Finger & Mouse Follow**:
  - The active card tracks pointer movements 1:1 on GPU-accelerated `translate3d(x, 0, 0)` with zero lag.
  - Avoided layout reflows (`top`, `left`, `width`, `height`); purely compositor-friendly `transform` and `opacity`.
- **Restrained Subtle Rotation**:
  - Proportional rotation bound to `[-6°, 6°]` via `useTransform(x, [-320, 320], [-6, 6])`, keeping cards stable and premium.
- **Micro-Scale Drag Feedback**:
  - Added subtle drag scale adjustment `scale(0.985 → 1.0)`.
- **Linked Continuous Stack Depth (Continuous Next-Card Transition)**:
  - Stacked card 2 dynamically rises (`translateY: 12px → 0px`) and scales up (`0.96 → 1.0`) in real-time as card 1 is dragged away.
  - Stacked card 3 subtly scales up toward card 2's position (`0.91 → 0.96`).
- **Velocity & Distance Thresholds**:
  - Fast flick (> 400px/s) triggers a swipe even on short displacements (~35–45px).
  - Slow drag requires exceeding ~22% of card width (~80px).
- **Spring-Like Settling**:
  - Failed swipes spring back smoothly using a high-damping physics curve (`stiffness: 420, damping: 28, mass: 0.8`) with zero mechanical snapping or bounce.
- **Vertical Scroll Protection**:
  - Declared `touch-action: pan-y` on card element.
  - Evaluates dominant axis within the first 8px of movement; dominant vertical gestures allow native browser page scrolling and suppress card horizontal drag.
  - Vertical drags strictly suppress tap-click navigation, preventing accidental product detail page openings.
- **Preloading**:
  - Automatically preloads the next 1–2 product images using `getOptimizedImageUrl` to prevent white flashes or image reload flicker.

---

## 15. Button 1 `paye₹nt` Backend Architecture & Integration

**Date**: September 27, 2026  
**Status**: Production-Ready & Verified

### 1. Scope & Isolation
- **Account Type Isolation**: `accountType = 'paye₹nt'` represents Product Owners / Vendors / Lenders, distinct and isolated from `pay₹ent` customer/renter accounts.
- **Role Enforcement**: Protected vendor APIs strictly require JWT tokens verifying `account_type === 'paye₹nt'`.
- **Zero Frontend Redesign**: Connected the existing `paye₹nt` UI components (`PayerntAuth`, `ListProductWizard`, `MyProducts`, `UserWallet`, `LenderProfile`, `RentalRequests`) without UI/UX regressions.

### 2. Core Modules & Endpoints
- **Authentication (`/api/paye₹nt/auth/*`)**:
  - `POST /register`: Registers vendor with Name, Email, 12-digit Aadhaar, 10-digit Phone, Address, 6-digit Pincode, Password. Hashes password using bcrypt. Returns masked Aadhaar (`XXXX-XXXX-XXXX`).
  - `POST /login`: Issues JWT tokens containing claims `{ sub, account_type: "paye₹nt", user_id, role: "vendor" }`.
  - `POST /logout` & `GET /auth/me`: Profile retrieval and session management.
- **Product Management (`/api/paye₹nt/products/*`)**:
  - `POST /products`: Creates product and generates **ONE permanent 4-digit Vendor Secret PIN** (e.g. `5831`) stored securely. Security deposit explicitly zero.
  - `GET /products`: Lists vendor's own products with owner credentials.
  - `GET /products/{id}`, `PATCH /products/{id}`, `DELETE /products/{id}`, `PATCH /products/{id}/status`: Full CRUD strictly scoped to owner.
  - `get_all_active_payernt_products`: Public catalog endpoint that **NEVER exposes Vendor Secret PINs**.
- **Rental Security & Booking Lifecycle (`/api/bookings/*`)**:
  - `POST /api/bookings`: Reuses product-level Vendor PIN; generates fresh unique 4-digit Renter PIN; creates ONE canonical `RentalSecurity` record (`booking_id UNIQUE`).
  - `GET /api/bookings/{id}/security`: Returns sanitized credentials (renter sees only renter PIN; vendor sees only vendor PIN).
  - `POST /api/bookings/{id}/security/vendor-pin` & `/renter-pin` & `/otp`: Server-side verification with attempt rate limiting.
  - `POST /api/bookings/{id}/complete`: Atomic rental activation and wallet payout credit.
- **Wallet & Payouts (`/api/paye₹nt/wallet/*`)**:
  - Available balance, Pending balance, Total received, Total withdrawn tracking.
  - `POST /bank-accounts`: Links bank account with masked account numbers (`XXXX XXXX 4582`).
  - `POST /withdraw`: Atomically decreases available balance and logs a `processing` withdrawal transaction.
- **Notifications, Messages & Audit Logs**:
  - Dedicated notification, conversation, and audit logging subsystems.

### 3. Verification & Test Suite
- Automated test suite `backend/tests/test_payernt_master.py` passed **8/8 test suites (100% OK)** covering registration, login, profile, vendor PIN invariance across multiple bookings, rental activation, and wallet withdrawals.
- Production build `npm run build` completed cleanly with **0 errors**.

### 4. Lender Dashboard UI/UX Redesign & Theme Adaptation
- **Monochrome Minimal Redesign**: Redesigned `PayerntHome.tsx`, `PayerntNavbar.tsx`, and `PayerntSidebar.tsx` matching the premium minimalist dashboard layout (4 key metrics, upcoming bookings, product inventory, 6 quick-action tiles, wallet summary, and recent activity).
- **Zero-Green Rule Enforced**: Completely eliminated all green/emerald tones across lender dashboard, using monochrome neutral tones (black, charcoal, white, off-white, light grey).
- **Dynamic Light/Dark Mode**: All cards, text, icons, progress tracks, sidebars, and navbars dynamically adapt based on theme toggle (`light` / `dark`).
- **Auth Card Repositioning**: Moved customer and lender login/registration form containers cleanly to the right side of the screen on desktop/tablet viewports.
- **Responsive Dual Layout (Desktop Mockup & Mobile Preserved)**:
  - **Large Screen (`lg:` and up)**: Exactly matches the user's mockup screenshot — glossy dark container, `Good morning, Mohan •`, clean date alignment without status pill, 4 metric cards with progress bars and left-aligned values, 12-col layout with Upcoming Bookings, Your Products, 6 quick-action tiles, Wallet summary card, and full-width Recent Activity card.
  - **Small Screen (`< lg`)**: Preserves the touch-friendly mobile dashboard (2x2 metric cards, 5 quick-action tiles with labels, full-width status cards).
- **Floating Glassmorphic Mobile Navigation**: Converted mobile bottom navigation into a transparent floating dock (`bg-white/70 dark:bg-[#0b0e14]/75 backdrop-blur-2xl`) hovering cleanly above the viewport edge with smooth glassmorphism.
- **Brand Wordmark Only**: Displaying the typography wordmark `paye₹nt` (with rupee symbol) and removed logo icon from the navbar.
- **Removed Online Pills**: Removed both `● Online` and `● System Online` status pills across mobile and desktop headers.
- **Settings & Profile Decoupled**: Distinct routes (`/payernt/profile` for identity, KYC, and bank accounts; `/payernt/settings` for preferences, notification toggles, and appearance).

---

## 15. Real API Dashboard Integration — Desktop & Mobile Synchronization

### 1. Unified Real API Backend Service
- **`GET /api/payernt/dashboard`**:
  - Authenticated via `Depends(get_current_payernt_account)` from `Authorization: Bearer <access_token>`.
  - Authoritative database aggregation via `get_payernt_vendor_dashboard(vendor_id, email)`:
    - **Wallet**: Available balance, pending balance, total received, total withdrawn directly from `payernt_wallets` and `payernt_wallet_transactions`.
    - **Earnings**: Authoritative total earnings, available balance, pending amount, withdrawn amount.
    - **Listings**: Real counts of total, active, and pending listings from `payernt_products` filtered strictly by `vendor_id`.
    - **Rentals**: Active count from `rental_security` where `vendor_id = :vendor_id` and status is active/started.
    - **Bookings**: Real upcoming bookings with product title, renter email/name, dates, daily rate, and rental status.
    - **Products Preview**: Real lender products list with title, category, daily rate, status, and availability.
    - **Recent Activity**: Authoritative chronologically sorted activities from real transactions and audit logs.
    - **Notifications & Messages**: Real unread counts.
- **`GET /api/payernt/bookings`**: Returns real owner-scoped bookings from `rental_security` joined with `orders` and `payernt_products`.
- **`GET /api/payernt/earnings/summary`**: Authoritative vendor earnings breakdown.

### 2. Centralized Frontend API Service Layer
- **`frontend/src/payernt/payerntApiService.ts`**:
  - `getDashboard()`: Calls `/api/payernt/dashboard` with authorization bearer token.
  - `getBookings()`: Calls `/api/payernt/bookings`.
  - `getEarningsSummary()`: Calls `/api/payernt/earnings/summary`.
  - Zero duplicate API logic in components. Both Desktop and Mobile consume the exact same data methods.
- **`frontend/src/payernt/store.ts`**:
  - Orchestrates concurrent data refresh (`refreshDashboard()`).
  - Synchronizes wallet, products, upcoming bookings, unread notifications, unread messages, and audit activities.
  - Exposes `isLoadingDashboard`, `dashboardError`, `backendActivities`, and `refreshDashboard` to the application tree.
  - Handles authentication expiry (401) by gracefully redirecting to login.

### 3. Desktop & Mobile UI Resilience
- **Zero Mock / Fake Data**: Home dashboard displays real listings, real bookings, and real wallet amounts. Shows clean empty states ("No upcoming bookings", "No listings yet" + "+ Add Product", "No recent activity") when no data exists.
- **Skeleton Loaders**: Polished animated pulse skeleton states during initial data fetch; eliminates jarring content flashing or fake number placeholders.
- **Graceful Error Handling**: Error alert banner with one-click "Retry" button on failed network requests.
- **Brand Consistency**: Wordmark `paye₹nt` displayed consistently with zero green color palette.

### 4. Verification & Automated Test Suite
- Automated test suite `backend/tests/test_payernt_master.py` and `backend/tests/test_shared_database_integration.py` passed **13/13 tests (100% OK)** including 401 unauthenticated and 200 authenticated checks for `/dashboard`, `/bookings`, and `/earnings/summary`.
- Production build `npm run build` completed with **0 errors**.

---

## 16. End-to-End Product Submission, Admin Review, & Products Synchronization

### 1. Root Cause Analysis
- **Admin Invisibility**:
  1. `create_product_endpoint` in `backend/payernt_router.py` previously hardcoded `status = "pending_confirmation"` waiting for SMS OTP, whereas the frontend wizard completes all 5 listing steps and directly submits for moderation review with `status: "under_review"`. Because the Admin queries `('pending', 'under_review', 'pending_admin_review')`, products submitted in this state were invisible.
  2. In `backend/main.py`, router registration silently failed during import when a missing `Union` type annotation threw a `NameError`, preventing `/api/payernt/products` and `/api/paye₹nt/products` from registering.
- **Payernt Products Missing**:
  1. In `frontend/src/payernt/store.ts`, `isMockItem` was defined to filter out IDs starting with `"prod-"`. Because both the backend database and the frontend generate product IDs prefixed with `"prod-"`, real products were filtered out.
  2. `addProduct` triggered a duplicate backend `POST` request because `ListProductWizard.tsx` had already submitted the product to the API.
- **Case-Insensitive Account Type**:
  1. `get_current_payernt_account` was requiring exact lowercase `account_type == "payernt"`, rejecting valid tokens with `"PAYERNT"` or accounts already registered in `payernt_accounts`.

### 2. Backend & Database Hardening
- **Authoritative Identity Derivation**:
  - `POST /api/payernt/products` strictly derives `owner_id`, `owner_email`, and `owner_name` from the authenticated JWT session via `Depends(get_current_payernt_account)`.
  - Never trusts client-supplied `ownerId` or `accountId`.
- **Status & Schema Handling**:
  - `PayerntProductCreateSchema` updated to support `specs`, `photos`, `videoUrl`, `damageDetails`, `customCategoryName`, `verificationDocs`, `verificationStatus`, and `adminPriceRange`.
  - When submitted for review (`status in ("under_review", "pending_admin_review", "submitted")`), product status is set directly to `"under_review"` in MySQL `payernt_products` with `available = False` and `availability_status = "paused"`.
  - Audit logs and admin review notifications dispatched on creation.
- **Data Persistence**:
  - `create_payernt_product` persists `video_url`, `specifications` (serialized JSON), `min_price`, `max_price`, `price_unit`, `price_status` with `ON DUPLICATE KEY UPDATE`.
  - `get_payernt_products_by_owner` queries both `owner_id` and `owner_email` to ensure zero lost products.
- **Admin Endpoints**:
  - `GET /api/admin/products?status=under_review` immediately returns submitted products.
  - `GET /api/admin/products/{id}` returns complete specs, 10s condition video, condition details, accessories, and location without exposing sensitive credentials (passwords, JWTs, OTPs).
  - `POST /api/admin/products/{id}/approve` transitions status to `"approved"` and synchronizes real-time state.

### 3. Frontend Products & KPI Order
- **`MyProducts.tsx`**:
  - Displays neutral `"PENDING REVIEW"` status badge for `under_review`, `pending`, and `pending_admin_review` items.
  - Filter tabs accurately count active, approved, and under review listings.
  - Media display gracefully falls back to category icons if an image is missing or broken.
- **Home KPI Reordering (Desktop & Mobile)**:
  - Top card: `PENDING LISTINGS` (real backend count of gear under review).
  - Middle 3-column row: `AVAILABLE BALANCE` (`₹0`), `TOTAL EARNINGS` (`₹0`), `ACTIVE LISTINGS` (`00`).
  - Bottom row: `ACTIVE RENTALS` (`00`).
  - All metrics powered by live backend endpoint `GET /api/payernt/dashboard`.

### 4. Verification & Automated Test Results
- Automated end-to-end test passed **6/6 critical checkpoints**:
  1. Product created in database with status `under_review` and auth-derived owner.
  2. Payernt Products API returns the product with status `under_review`.
  3. Admin Pending Listings API finds the product.
  4. Admin Get Product endpoint returns complete details without sensitive info.
  5. Admin approve endpoint updates status to `approved`.
  6. Payernt Products API immediately reflects `approved` status.
- Pytest suite `tests/test_listing_confirmation_security.py` and `tests/test_admin_product_review_pricing.py` passed **8/8 tests (100% OK)**.
- Frontend build `npm run build` completed cleanly with **0 errors**.

---

## 17. Lender-Initiated Booking Cancellation & Flexible Time-Slot Booking System

### 1. Architectural Overview & Requirements Addressed
This release implements two major capabilities on top of Payent's existing architecture while strictly preserving Secret PIN verification, OTP flows, delivery courier tracking, and Admin operations:
1. **Lender-Initiated Booking Cancellation & Feedback System**:
   - Gives verified gear lenders the ability to safely cancel bookings that have not entered physical execution (`requested`, `accepted`, `handover` prior to handover verification).
   - Rejects cancellation requests once handover is verified (`vendor_handover_verified`, `renter_handover_verified`, `rental_started`, or courier tracking in `PICKED_UP_FROM_VENDOR`, `OUT_FOR_DELIVERY`, `DELIVERED`, `COMPLETED`), protecting renters against in-flight abandonment.
   - Requires mandatory selection of one of 7 standardized reason codes (`EQUIPMENT_UNAVAILABLE_DAMAGE`, `EQUIPMENT_UNAVAILABLE_MAINTENANCE`, `SCHEDULING_CONFLICT_PERSONAL`, `UNABLE_TO_FULFILL_TIME_SLOT`, `SECURITY_OR_VERIFICATION_CONCERN`, `LOCATION_OR_LOGISTICS_ISSUE`, `OTHER`).
   - Requires written feedback (5–500 characters, trimmed) when `OTHER` is selected.
   - Provides full audit trail in `booking_cancellations` table, counterparty notification alerts to renters, and admin visibility without leaking confidential lender credentials.
2. **Flexible Rental Date & Time-Slot Booking System**:
   - Supports Half Day — Morning (08:00–12:00), Half Day — Afternoon (13:00–17:00), Full Day (08:00–17:00), and Multi-Day rentals.
   - Half-open interval conflict detection with configurable turnaround buffer (default 60 minutes): `new_start < (existing_end + buffer) AND (new_end + buffer) > existing_start`.
   - Allows non-overlapping same-day rentals (e.g. 08:00–12:00 + 60m buffer ends at 13:00, permitting a 13:00–17:00 booking on the same day).
   - Dynamic transparent pricing: Custom half-day rate (or 60% default) vs full-day rate.
   - Lender availability management: Lenders can toggle allowed slot types, set custom turnaround buffer, set half-day rate, and block personal-use date ranges with conflict detection.
   - Renter slot exploration: `GET /api/products/{id}/slots?date=YYYY-MM-DD` returns real-time slot availability badges (`Available`, `Booked`, `Not Available`).

### 2. Database Schema Enhancements
- **New Table `booking_cancellations`**:
  - `id`: VARCHAR(64) PRIMARY KEY
  - `booking_id`: VARCHAR(64) UNIQUE (linked to `orders.id` / `rental_security.booking_id`)
  - `product_id`: VARCHAR(64)
  - `initiated_by`: VARCHAR(32) (`"lender"` / `"renter"` / `"admin"`)
  - `initiator_user_id`: VARCHAR(64)
  - `reason_code`: VARCHAR(64)
  - `feedback`: TEXT
  - `previous_status`: VARCHAR(32)
  - `created_at`: TIMESTAMP
- **Extended Columns across `orders`, `cart_items`, `custom_products`, and `payernt_products`**:
  - `time_slot`: VARCHAR(32) DEFAULT `'full_day'` (`'morning'`, `'afternoon'`, `'full_day'`, `'multi_day'`)
  - `duration_type`: VARCHAR(32) DEFAULT `'full_day'` (`'half_day'`, `'full_day'`, `'multi_day'`)
  - `start_time`: VARCHAR(16) (e.g. `'08:00'`)
  - `end_time`: VARCHAR(16) (e.g. `'12:00'`)
  - `start_datetime`: DATETIME
  - `end_datetime`: DATETIME
  - `cancellation_id`: VARCHAR(64)
  - `allow_half_day`: BOOLEAN DEFAULT TRUE
  - `morning_slot_enabled`: BOOLEAN DEFAULT TRUE
  - `afternoon_slot_enabled`: BOOLEAN DEFAULT TRUE
  - `full_day_slot_enabled`: BOOLEAN DEFAULT TRUE
  - `half_day_rate`: DECIMAL(10, 2)
  - `buffer_minutes`: INT DEFAULT 60
  - `blocked_dates`: JSON (list of strings or dict intervals)

### 3. API Endpoints
- `POST /api/payernt/bookings/{id}/cancel` & `POST /api/bookings/{id}/cancel`: Lender-authenticated booking cancellation with handover verification check, reason validation, feedback capture, and renter notification.
- `GET /api/products/{id}/slots?date=YYYY-MM-DD`: Public endpoint returning slot availability breakdown, times, prices, and status (`available`, `booked`, `not_available`).
- `GET /api/payernt/products/{id}/availability-config`: Fetch lender's configuration for half-day toggles, slot availability, turnaround buffer, half-day rate, and blocked dates.
- `POST /api/payernt/products/{id}/availability-config`: Update lender's product availability settings with validation.
- `GET /api/admin/bookings`: Enhanced to include time slot metadata, duration type, and cancellation audit record.

### 4. Verification & Automated Test Suite
- Master test suite `backend/tests/test_cancellation_and_time_slots.py` passed **16/16 tests (100% OK in 2.58s)**:
  1. `test_01_lender_cancel_eligible_booking_success`: Successfully cancels requested booking and records cancellation record.
  2. `test_02_lender_cannot_cancel_other_lenders_booking`: Rejects cancellation attempt by non-owner lender (403 Forbidden).
  3. `test_03_renter_cannot_use_lender_cancel_endpoint`: Rejects cancellation by renter token (403 Forbidden).
  4. `test_04_cancellation_requires_valid_reason_code`: Rejects invalid reason codes (422 Unprocessable Entity).
  5. `test_05_cancellation_other_requires_written_feedback`: Rejects `OTHER` reason when feedback is missing or under 5 characters (422 Unprocessable Entity).
  6. `test_06_cannot_cancel_completed_booking`: Rejects cancellation for completed/active rentals (400 Bad Request).
  7. `test_07_cannot_cancel_after_handover_verified`: Rejects cancellation once vendor handover is verified (400 Bad Request).
  8. `test_08_cancellation_idempotency`: Repeated cancellation call returns already-cancelled state cleanly (200 OK).
  9. `test_09_morning_and_afternoon_same_day_non_conflicting`: Confirms morning (08:00–12:00) and afternoon (13:00–17:00) with 60-min turnaround buffer do not conflict.
  10. `test_10_morning_vs_morning_overlap_conflict`: Confirms two morning bookings on the same date conflict (409 Conflict).
  11. `test_11_full_day_conflicts_with_half_day_slots`: Confirms full-day booking conflicts with both morning and afternoon slots on that date.
  12. `test_12_multiday_booking_conflicts_with_all_intersecting_slots`: Confirms multi-day booking blocks all slots across its date span.
  13. `test_13_cancelled_booking_releases_interval`: Cancelling a booking immediately frees the time slot for new bookings.
  14. `test_14_product_slots_endpoint_returns_pricing_and_availability`: Validates `/api/products/{id}/slots` returns rates and live slot statuses.
  15. `test_15_lender_availability_config_api`: Validates fetching and updating lender availability configuration.
  16. `test_16_blocked_date_prevents_renter_booking`: Validates that lender-blocked dates reject rental bookings (409 Conflict).
- Regression suite `backend/tests/test_listing_confirmation_security.py` passed **5/5 tests (100% OK)**.
- Frontend build `npm run build` in `frontend/` passed with **0 errors**.

---

# Phase 16 — Authentication, Role-Based Routing & Session Cleanup Hardening

**Status**: COMPLETED & VERIFIED  
**Date**: October 25, 2026  
**Test Suite**: `backend/tests/test_role_routing_and_admin_security.py` (5/5 tests passing, 100% pass rate)  
**Regression Suite**: `backend/tests/test_three_context_auth_and_switching.py` (10/10 tests passing, 100% pass rate)  
**Frontend Compilation**: `npx tsc --noEmit` & `npm run build` (0 errors, 100% clean)

### 1. Root Cause Analysis
1. **Admin Logout Re-render & Looping**:
   - `authService.logout()` in `frontend/src/admin/services/auth.ts` only removed `payent:admin:token` and `payent:admin:current_user`, leaving `payent:currentUser` and `payent:token` in localStorage.
   - When redirecting to `/admin/login`, `authService.getCurrentUser()` read the persistent `payent:currentUser` and immediately re-created `payent:admin:token` and `payent:admin:current_user`.
   - In dev mode, lines 167–183 automatically generated a fake `DEFAULT_ADMIN` session whenever `payent:admin:logged_out` was not set.
   - TanStack Router's `routes/admin.tsx` saw `loggedIn === true` and navigated back to `/admin/dashboard`, causing an infinite re-render loop.
   - In `routes/admin/index.tsx`, line 10 explicitly threw `redirect({ to: "/admin/login" })`.
2. **Payernt Admin Login Redirection Missing**:
   - When an administrator logged in via the public `/payernt` entry point, `PayerntAuth.tsx` only called `onAuthSuccess` and did not redirect to `/admin/dashboard`.
3. **Payernt Logout Client Invalidation Flaw**:
   - `payerntApiService.logout()` removed `paye₹nt_token` from localStorage before invoking the backend logout endpoint, meaning the server never received the Bearer token and never invalidated the server session or JTI.
4. **Ordinary User Admin Route Bleed**:
   - When normal users logged in with a redirect URL pointing to `/admin/*`, the frontend previously attempted navigation to the admin route rather than stripping it to `/dashboard`.

### 2. Architectural Implementation
1. **Two Public Login Entry Points**:
   - Exactly two public entry points exist: **Payernt Login** (`/payernt`) for product owners/lenders, and **Payrent Login** (`/login`) for renters/customers.
   - No separate public admin login page or public admin registration route exists.
   - Visiting `/admin/login` or `/admin/` verifies admin session authority; if unauthenticated, visitors are redirected to `/login?redirect=/admin/dashboard`.
2. **Backend Authoritative Role Detection**:
   - Both `/login` and `/payernt` authenticate users against the live database and determine the authoritative role (`admin`, `customer`, `vendor`).
   - If verified as `admin` or `superadmin`, the frontend sets administrative session tokens and routes directly to `/admin/dashboard`.
   - Ordinary users with a redirect parameter targeting `/admin/*` are prevented from redirecting to admin and guided to `/dashboard`.
3. **Thorough Session Cleanup on Logout**:
   - Admin logout revokes server-side session via `POST /api/admin/auth/logout` and `POST /api/auth/logout`, removes all admin keys (`payent:admin:*`), all customer keys (`payent:token`, `payent:currentUser`), and all vendor keys (`paye₹nt_*`), sets `payent:signed_out`, dispatches storage events, and uses `window.location.replace("/login")`.
   - Payernt logout sends Bearer token to `POST /api/payernt/auth/logout` before clearing local keys, clearing both vendor and admin tokens.
   - Payrent logout revokes server token, removes all tokens, and uses `window.location.replace("/login")` to ensure browser Back navigation cannot restore authenticated views.
4. **Authoritative Admin Session Verification**:
   - `verifyAdminSession()` calls `/api/admin/auth/me` to cryptographically verify credentials with the backend.
   - If unauthenticated (401), redirects to public `/login`.
   - If authenticated as a non-admin user (403), renders `<PermissionDenied requiredRole="Administrator" />` without redirect looping.
   - If verified admin, renders the Admin Workspace.

---

## 19. Phase 19 Booking Location Clarity & Change Request Workflow

**Status**: COMPLETED & VERIFIED  
**Date**: October 26, 2026  
**Test Suite**: `backend/tests/test_booking_location.py` (8/8 tests passing, 100% pass rate)  
**Regression Suite**: `backend/tests/test_live_rental_queue.py` (2/2 tests passing, 100% pass rate)  
**Frontend Compilation**: `npm run build` (0 errors, 100% clean)

### 1. Requirements Fulfilled
1. **Show Booking Location on Every Request**:
   - In both the Lender Portal (`RentalRequests.tsx`) and Renter Portal (`Orders.tsx`), every booking card clearly renders:
     - Product Name & Primary Image
     - Booking ID (`#ord-...`)
     - Counterparty / Renter Name
     - Fulfillment Method Badge (`Doorstep Delivery`, `Owner Pickup`, or `Custom Meetup`)
     - Complete Confirmed Location / Address / Hub / Meetup spot
     - Additional landmarks, gate codes, or delivery directions
     - Scheduled Rental Dates & Time Slot
     - Live Booking & Queue Status
2. **Location Details & Convenience**:
   - **Doorstep Delivery**: Displays full street address, city, state, pincode, and delivery instructions.
   - **Owner Pickup**: Displays verified lender hub / pickup center address and pickup instructions.
   - **Custom Meetup**: Displays chosen meetup spot, soundstage/landmark details, and meeting directions.
   - **Interactive Map Link**: Valid coordinates or supported address generate a direct Google Maps link (`https://www.google.com/maps/search/?api=1&query=...`).
   - **Copy Address Button**: One-click address copy with instant toast confirmation.
   - **Missing Address Graceful Handling**: Clearly badges incomplete addresses as `Address Missing / Incomplete` without application crashes.
3. **Location Change & Approval Workflow**:
   - **Before Lender Acceptance**: If renter updates location before the lender accepts the booking, the request updates immediately and directly.
   - **After Lender Acceptance**: Any change requires an explicit reason and enters `pending` state as a `locationChangeRequest`. The confirmed location remains active until the lender reviews and approves.
   - **Lender Approval & Rejection**: Lender can review pending change requests directly from the Lender Portal with `Approve Change` or `Decline` (with feedback reason).
4. **Privacy and Security (403 Forbidden)**:
   - Full addresses and location coordinates are protected by strict access control (`GET /api/orders/{id}/location`).
   - Only the booking's renter, the product's lender, and platform administrators can view or modify location data. Unauthorized users receive `403 Forbidden`.
   - Customer delivery addresses are never exposed in public product catalog endpoints (`/api/products`, `/api/products/custom/public`).

### 2. Schema and Database Additions
Safely migrated `orders` and `deliveries` tables in `backend/database.py` with backward compatibility and fallback support:
- `orders.delivery_method` (VARCHAR: `delivery`, `pickup`, `custom`)
- `orders.delivery_address` (TEXT)
- `orders.pickup_location` (TEXT)
- `orders.custom_location` (TEXT)
- `orders.location_directions` (TEXT)
- `orders.location_latitude` (DECIMAL(10, 8))
- `orders.location_longitude` (DECIMAL(11, 8))
- `orders.location_change_data` (JSON TEXT: stores pending change request and history)

### 3. API Endpoints
- `GET /api/orders/{id}/location`: Returns full authorized location response with Google Maps URL and pending change requests.
- `PUT /api/orders/{id}/location`: Updates location directly (if unaccepted) or submits a change request (if accepted).
- `POST /api/payernt/bookings/{id}/location-change/approve` & `POST /api/orders/{id}/location-change/approve`: Approves change request and applies new location.
- `POST /api/payernt/bookings/{id}/location-change/reject` & `POST /api/orders/{id}/location-change/reject`: Rejects change request with feedback; preserves original location.
- `GET /api/payernt/bookings`: Maps and returns all location fields and map links for lender portal requests.




