# paYent Frontend — Phase 1.5 Live Runtime Verification Report (P0 Fixes)

> **Phase**: Phase 1.5 — Live Runtime Verification of P0 Fixes (`F-01` – `F-08`)  
> **Verification Mode**: Empirical Runtime QA Only (Zero production code, routes, styles, or backend files modified)  
> **Date**: 2026-11-09  
> **Frontend Root**: `C:\payernt-main\payernt-main\frontend`  
> **Reference Reports**: [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md) | [`P0_FIX_REPORT.md`](./P0_FIX_REPORT.md)  

---

## 1. Environment & Data Safety Summary

| Layer | Configuration & Runtime Target | Notes |
| :--- | :--- | :--- |
| **Frontend Dev Server** | Vite + TanStack Start (`http://127.0.0.1:5173`) | Started locally in browser verification environment (`desktop 1280×800`, `mobile 375×812`) and stopped cleanly on completion. |
| **Backend API Server** | FastAPI (`http://127.0.0.1:8001`) connected to TiDB Cloud (`payent_marketplace_db`) | Pre-existing local API server serving 5 public catalog items led by `prod-1792996506773` (`"Laptop"`, lender `"mohan bommidi"`). |
| **Browser Engine** | Playwright Chromium | Exercised real user clicks, URL navigation, `goBack`/`goForward`, reloads, `Tab`/`Space` keyboard controls, and accessibility snapshots. |

### Direct Live Backend vs. Controlled Browser Interception Boundary
To guarantee **zero mutation of live customer orders, payments, profiles, or KYC rows** in TiDB Cloud:
- **Direct against live FastAPI + TiDB (`127.0.0.1:8001`)**:
  - Public catalog loading on `/payent`, `/browse`, `/categories`, `/filters`, `/payent/explore`, and `/product/prod-1792996506773`
  - Unauthenticated wishlist login-prompt guard on `/payent`
  - Live `POST /api/search` ML search integration from `SearchOverlay` and `/browse?cat=electronics&q=laptop`
  - Live `HTTP 404` missing-product behavior on `/product/1` and `/product/does-not-exist-check`
  - Hero CTA, ExploreRentals/Footer layout, and `/filters` checkbox keyboard/screen-reader behavior
- **Controlled via Playwright `page.route` HTTP interception in live browser runtime**:
  - Authenticated identity (`qa-verifier@local.invalid`, session token `"demo-qa-verifier-session"`), `/api/wishlist*` toggle + `500` failure rollback, `/api/products/server-error-check` `500` -> Retry recovery, `/api/products` 10-item pagination catalog (`> 8` items threshold), `/api/orders`, `/api/payments/receipt/**` (`450ms` loading / `500` failure / Retry `200` / stale `750ms` vs `50ms` race), `/api/profile/stats` `500` + Retry, `PATCH /api/me/profile` `500` error toast, and `/api/kyc/status` (`NOT_STARTED`, `PENDING`, `REJECTED`, `500` `UNAVAILABLE`, Retry -> `APPROVED`, reload persistence).

---

## 2. Executive Verification Summary (`F-01` – `F-08`)

| Finding | Title | Runtime Coverage | Result | Status |
| :--- | :--- | :--- | :---: | :--- |
| **F-01** | Wishlist Product ID Mismatch & Sync (`RentalProductCard`, `ProductDetails`, `useWishlist`, `Wishlist`) | Logged-out Home + Authenticated Home ↔ `/wishlist` ↔ `ProductDetails` + `500` rollback | **PASS** | **VERIFIED** |
| **F-02** | Category Filter URL Params (`?cat=` vs `?category=`), Hierarchy & History | Home Categories, `SearchOverlay`, `/browse`, `/categories`, `/payent/explore`, `/filters`, `Back`/`Forward`, reload, live `POST /api/search` | **PASS** | **VERIFIED** |
| **F-03** | Orders Receipt Modal Loading (`Loader2`), Failure/Retry & Close/Race Guard | Real collapsed order expansion, `450ms` spinner, `500` error + disabled print, Retry -> `200`, Close-before-settle & cross-order race (`750ms` vs `50ms`) | **PASS** | **VERIFIED** |
| **F-04** | Global CSS SVG Icon Placement (`Hero` CTA, Pagination, Mobile Footer) | `1280×800` Hero CTA & `ExploreRentals` pagination + `375×812` Footer accordion bounding-box checks & clicks | **PASS** | **VERIFIED** |
| **F-05** | Fake Hardcoded Fallbacks (`Sony Alpha a7 III`, Owners, Ratings, PAN `XXXXX1234F`) | Live DB `Laptop`, live `404` `/product/1` & missing slug, `500` Retry on `ProductDetails`, unlinked PAN, `Profile` stats Retry & save error toast | **PASS** | **VERIFIED** |
| **F-06** | Sample Cancelled Orders Seeding & `/payments` Navigation | Unauth `/orders` redirect, legacy `ord_1793113916585` stripping, `"No orders yet"`, `500` empty-cache check, `"Pay Now"`, `"Payment History"` -> `/payments` | **PASS** | **VERIFIED** |
| **F-07** | Keyboard & Screen-Reader Accessible Filter Checkboxes (`Filters.tsx`) | Mouse click, `Tab` + `Space` toggles, `peer-focus-visible:ring-2`, `ariaSnapshot()` roles, minimum-1 Condition `aria-disabled` guard | **PASS** | **VERIFIED** |
| **F-08** | Broken Profile KYC Response Parsing (`NOT_STARTED`, `PENDING`, `REJECTED`, `APPROVED`, API Failure) | Full KYC status matrix on `/profile` (`parseKycStatusResponse`), `500` `UNAVAILABLE` + Retry recovery, `page.reload()` persistence | **PASS** | **VERIFIED** |

> **Phase 1 P0 Verification Total**: **8 / 8 PASS (VERIFIED)**. Zero P0 regressions were detected during Chromium verification; zero application files were altered.

---

## 3. Detailed Finding Verification Results

### F-01 — Wishlist Product ID Mismatch & Sync
- **Test Scenarios**:
  1. Logged-out click on Home `/payent` product card heart icon (`prod-1792996506773`, `"Laptop"`).
  2. Authenticated click to add `"Laptop"` from Home `/payent`, navigate to `/wishlist`, full `page.reload()`, return to `/payent`, inject `HTTP 500` on `POST /api/wishlist/toggle` to verify rollback, then complete removal and re-check `/wishlist`.
  3. Authenticated click on [`ProductDetails`](src/pages/ProductDetails.tsx) (`/product/prod-1792996506773`) `"Add to favourites"` button + `HTTP 500` removal failure rollback.
- **Expected Result**:
  - Logged-out click keeps `aria-pressed="false"` and prompts login.
  - String ID `"prod-1792996506773"` is sent to `POST /api/wishlist/toggle`, active heart `aria-pressed` flips `"false" -> "true"`, item appears on `/wishlist` (`"1 saved items"`), persists across reload and navigation back to `/payent`, and deterministically rolls back with toast on `500`.
- **Actual Result**:
  - All transitions behaved exactly as expected across Home, `/wishlist`, and `ProductDetails`.
- **Evidence**:
  - **Logged-out `/payent` (live backend)**: `5` wishlist buttons rendered; clicking `button[aria-label="Add Laptop to wishlist"]` kept `beforePressed: "false"`, `afterPressed: "false"`, stayed at `http://127.0.0.1:5173/payent`, and rendered toast `"Please log in to add items to your wishlistLog In"`.
  - **Authenticated Home <-> `/wishlist`**:
    - Initial `aria-pressed="false"` -> click -> `pressedAfterAdd: "true"`.
    - `/wishlist` rendered `"1 saved items"` (`has1SavedItems: true`) and `"Laptop"` card (`hasLaptopCard: true`) both before and after `page.reload()` (`wishlistHasLaptopAfterReload: true`).
    - Return to `/payent`: `heartAfterReturnPressed: "true"`.
    - Injecting `HTTP 500` on `POST /api/wishlist/toggle`: toast `["Failed to update wishlist. Please try again."]`, `pressedAfter500Revert: "true"`.
    - Restoring `200` and clicking again: `pressedAfterRemove: "false"`, `wishlistIdsFinal: []`, and `/wishlist` confirmed empty (`wishlistEmptyAfterRemove: true`).
  - **Authenticated `ProductDetails` (`/product/prod-1792996506773`)**:
    - `"Add to favourites"` started at `initialAriaPressed: "false"`; click updated `wlIds: ["prod-1792996506773"]`, `ariaPressed: "true"`, `ariaLabel: "Remove from favourites"`.
    - Injecting `HTTP 500` on removal displayed toast `"Failed to update wishlist. Please try again."`, preserved `wlIds: ["prod-1792996506773"]`, and reverted `ariaPressed: "true"`.
- **Status**: **`PASS` — VERIFIED**

---

### F-02 — Category Filter URL Params, Hierarchy & Browser History
- **Test Scenarios**:
  1. Home `Categories` section: click `"Cameras & Photography"` -> follow `"Browse Cameras"`, and click `"Electronics"` -> `"Laptops"` subcategory chip.
  2. `SearchOverlay` (`#nav-desktop-search-btn`): click empty-state Quick Category `"Cameras & Photography"`, then search `"laptop"` and click Matching Category `"Electronics"`.
  3. Direct URLs & alternate routes: `/browse?category=cameras` (+ `page.reload()`), `/categories?cat=vehicles`, `/payent/explore?cat=music`, and `/browse?cat=electronics&q=laptop`.
  4. Browser Back / Forward history across `/browse` category chips (`cameras` <-> `laptops`) and `/browse` -> `/filters`.
- **Expected Result**:
  - Home and `SearchOverlay` emit canonical `?cat=...` (no `?category=...`); legacy `?category=...` URLs normalize without breaking bookmarks; parent categories (`electronics`, `vehicles`, `music`) match granular catalog items via `matchesProductCategory`; live ML `POST /api/search` executes cleanly; Back/Forward restores route query params and active filters.
- **Actual Result**:
  - Every entry point, direct URL, reload, live ML search, and history transition worked cleanly with matching headings and item sets.
  - *Observed `/filters` sidebar note*: Navigating directly to `/filters?cat=electronics` displays all `7 gears` in the main grid via `matchesProductCategory`, while the sidebar Category checklist lists leaf subcategories (`cameras`, `laptops`, etc.) and `syncUrlParams` replaces URL search in-place on intra-page checkbox toggles (`navigate({ replace: true })`), whereas route-to-route navigation (`/browse` <-> `/filters`) and `/browse` chip navigation push history cleanly for `Back`/`Forward`.
- **Evidence**:
  - **Home Categories CTA & Subcategory**:
    - `"Browse Cameras"` `<a href="/browse?cat=cameras">` navigated to `http://127.0.0.1:5173/browse?cat=cameras` (`hasCategoryParam: false`, `catParam: "cameras"`).
    - `"Electronics"` -> `"Laptops"` pill navigated to `http://127.0.0.1:5173/browse?cat=electronics&q=Laptops` (`hasCategoryParam: false`, `catParam: "electronics"`, `qParam: "Laptops"`, `bodyHasLaptop: true`).
  - **`SearchOverlay`**:
    - Quick category `"Cameras & Photography"` -> `http://127.0.0.1:5173/browse?cat=cameras` (`hasLegacyCategory: false`, `heading: "Cameras(7 gears)"`).
    - Query `"laptop"` -> matching category `"Electronics"` -> `http://127.0.0.1:5173/browse?cat=electronics` (`hasLegacyCategory: false`, `heading: "Electronics(7 gears)"`, `hasLaptopItem: true`).
  - **Direct URLs & Live Search**:
    - `/browse?category=cameras` persisted after `page.reload()` (`http://127.0.0.1:5173/browse?category=cameras&cat=cameras`).
    - `/categories?cat=vehicles` -> `h2: "Vehicles(1 gear)"`.
    - `/payent/explore?cat=music` -> `h2: "Musical Instruments(1 gear)"`.
    - `/browse?cat=electronics&q=laptop` -> live `POST http://127.0.0.1:8001/api/search` (`status: 200`, `mlSearchResultCount: 2`).
  - **History Back/Forward**:
    - On `/browse?cat=cameras`, clicking `Laptops / PCs` chip -> `/browse?cat=laptops` (`"Laptops / PCs(4 gears)"`); `goBack()` -> `/browse?cat=cameras` (`"Cameras(7 gears)"`); `goForward()` -> `/browse?cat=laptops` (`"Laptops / PCs(4 gears)"`).
    - Navigating `/browse?category=cameras&cat=cameras` -> `/filters?cat=electronics`, toggling `"Cameras"` (`?cat=electronics%2Ccameras`), `goBack()` restored `/browse?...` with unchecked filter state, and `goForward()` restored `/filters?cat=electronics%2Ccameras` with `mobile-filter-cat-cameras` checked.
- **Status**: **`PASS` — VERIFIED**

---

### F-03 — Orders Receipt Modal Loading, Failure, Retry & Race Guard
- **Test Scenarios**:
  1. On `/orders` with paid completed orders (`ord-qa-receipt-1`, `ord-qa-receipt-2`), expand `#booking-card-ord-qa-receipt-1` (`"View Details"`) and click `"View Receipt"` while `GET /api/payments/receipt/ord-qa-receipt-1` delays `450ms` then returns `HTTP 500`.
  2. Click `"Retry"` once the endpoint returns `HTTP 200`.
  3. Close modal (`button[aria-label="Close receipt modal"]`), then run two race-condition tests (`receiptReqSeqRef`):
     - Close modal `100ms` after initiating a `750ms` receipt fetch and wait `850ms`.
     - Initiate slow `ord-qa-receipt-1` (`750ms` -> `REC-STALE-1111`), close at `80ms`, immediately open `ord-qa-receipt-2` fast receipt (`50ms` -> `REC-QA-9002`), and wait `900ms` past the stale response deadline.
- **Expected Result**:
  - Loading state renders `<Loader2 />` spinner without `ReferenceError` and keeps `"Print / Save Receipt"` disabled.
  - `500` shows `"Receipt unavailable"`, backend error detail, `"Retry"` button, disabled print button, and zero fake `REC-` fallback.
  - Retry loads real receipt details and enables print.
  - Stale responses from closed or superseded receipt requests never reopen the modal or overwrite newer receipt data.
- **Actual Result**:
  - Every state and async race assertion passed with `pageErrors: []`.
- **Evidence**:
  - **Loading (`450ms`)**: `"Retrieving official receipt..."` visible (`spinnerTextVisible: true`), `printDisabledDuringLoad: true`, zero `Loader2` `ReferenceError`.
  - **Failure (`HTTP 500`)**: `"Receipt unavailable"` visible (`receiptUnavailableVisible: true`), `"Receipt service temporarily unavailable"` displayed, `"Retry"` button visible (`retryVisible: true`), `printDisabledOnError: true`, `hasFakeRecFallback: false`.
  - **Retry (`HTTP 200`)**: `"REC-QA-9001"`, `"pay_QA_12345"`, `"paid"`, and `"2,400"` all rendered; `printEnabledOnSuccess: true`.
  - **Close & Race Guard**:
    - `modalClosedCleanly: true`.
    - Close-before-settle: `stayedClosedAfterStale: true`.
    - Cross-order race (`900ms` settle wait): `stillShowsOrd2Receipt: true` (`"REC-QA-9002"`), `hasStaleOrd1Receipt: false` (`"REC-STALE-1111"` discarded).
- **Status**: **`PASS` — VERIFIED**

---

### F-04 — Global CSS SVG Icon Placement
- **Test Scenarios**:
  1. `1280×800` desktop on `/payent`: inspect bounding boxes of text `<span>` vs `<svg>` inside Hero `"Explore Rentals"` CTA button.
  2. `1280×800` desktop on `/payent` (`ExploreRentals` with controlled 10-item catalog `> 8` items/page): inspect `"Previous"` and `"Next"` pagination icon alignment and click `"Next"`.
  3. `375×812` mobile on `/payent`: inspect Footer accordion button text vs `<ChevronDown>` `<svg>` alignment and click to toggle `aria-expanded`.
- **Expected Result**:
  - Trailing icons (`Explore Rentals ->`, `Next >`, Footer `<ChevronDown>`) render strictly to the right of button text; leading icons (`< Previous`) render strictly to the left of text.
- **Actual Result**:
  - All bounding boxes and interactions confirmed exact left/right icon placement.
- **Evidence**:
  - **Hero CTA (`/payent`)**: Text `"Explore Rentals"` box `x=[56..155]` (`top=379`), `<svg>` box `x=[165..181]` (`top=381`) -> `svgIsToRightOfText: true`.
  - **`ExploreRentals` Pagination (10 items -> 2 pages)**:
    - `"Previous"`: `svgRect={left: 47, right: 63}`, `textRect={left: 69, right: 119}` -> `svgIsLeft: true`, `svgIsRight: false`, `disabled: true`.
    - `"Next"`: `textRect={left: 1184, right: 1211}`, `svgRect={left: 1217, right: 1233}` -> `svgIsRight: true`, `svgIsLeft: false`, `disabled: false`.
    - Clicking `"Next"` rendered `"Page 2 of 2"`.
  - **Mobile Footer Accordion (`375×812`)**:
    - `btnCount: 6`; `"About paYent"` `textRect={left: 16, right: 117}`, `svgRect={left: 343, right: 359}` -> `svgIsToRightOfText: true`.
    - Click toggled `aria-expanded` from `"false"` -> `"true"`.
- **Status**: **`PASS` — VERIFIED**

---

### F-05 — Real Backend Data, Missing-Data States & Retry (`ProductDetails` & `Profile`)
- **Test Scenarios**:
  1. Live TiDB product `/product/prod-1792996506773` (with `localStorage` cleared).
  2. Missing products `/product/1` and `/product/does-not-exist-check` against live FastAPI `404`.
  3. Simulated `HTTP 500` on `/product/server-error-check`, followed by clearing the fault and clicking `"Retry"`.
  4. Authenticated `/profile` with unlinked PAN (`panNumber: ""`, `panMasked: ""`), initial `500` on `/api/profile/stats` -> Retry -> `200`, and `500` failure on `"Save Creator Info"` (`PATCH /api/me/profile`).
- **Expected Result**:
  - `ProductDetails` displays authentic TiDB metadata without `"Sony Alpha a7 III"`, `"Arun Kumar"`, `"Sai Teja"`, `"5.0 (0"`, or `"4.7 (84)"`.
  - `404` renders `"Product not found"`; `500` renders `"Unable to load product"` + `"Retry"` and recovers on retry.
  - `Profile` displays `"PAN: Not linked"` (zero `"XXXXX1234F"`), surfaces stats failure + Retry, and shows backend error toast instead of false success on save failure.
- **Actual Result**:
  - All `ProductDetails` and `Profile` scenarios behaved as expected.
- **Evidence**:
  - **Live `/product/prod-1792996506773`**: `h1="Laptop"`, `"New (0 reviews)"`, `"Lender: mohan bommidi"`, `"Location: India"`; `hasSonyFake: false`, `hasArunFake: false`, `hasSaiTejaFake: false`, `hasHardcoded50: false`, `hasHardcoded47_84: false`.
  - **Live `404` (`/product/1` & `/product/does-not-exist-check`)**: Backend returned `404`; frontend rendered `"Product not found — The equipment you requested may have been unlisted or moved."` with `hasSonyFake: false`.
  - **Controlled `500` + Retry (`/product/server-error-check`)**:
    - On `500`: `hasUnableToLoad: true`, `hasNotFound: false`, `hasSonyFake: false`, `hasRetryBtn: true`.
    - After clearing `500` and clicking `"Retry"`: `h1: "Recovered Retry Cinema Kit"`, `hasRecoveredTitle: true`.
  - **Authenticated `/profile`**:
    - `hasNotLinkedPan: true` (`"PAN: Not linked"`), `hasFakePanXxxxx1234F: false`.
    - Stats `500`: `statsErrorVisible: true` (`"Stats database temporarily unavailable"`), `statsRetryVisible: true`; after Retry: `completedRentalsLabel: true`, `rating48Visible: true` (`"4.8"`), `onTime98Visible: true` (`"98%"`).
    - Profile save `500`: `errorToastVisible: true` (`"Profile update service temporarily unavailable"`), `falseSuccessToastVisible: false` (`"Profile details saved successfully."` not shown).
- **Status**: **`PASS` — VERIFIED**

---

### F-06 — Orders Real Records, Legacy Stripping & Payment Navigation
- **Test Scenarios**:
  1. Visit `/orders` while logged out.
  2. Seed legacy sample booking `ord_1793113916585` (`"Sony Alpha a7 III"`) into `localStorage["payent:orders:qa-verifier@local.invalid"]` while authenticated `GET /api/orders` returns `[]`, and load `/orders`.
  3. Test `GET /api/orders` `HTTP 500` with empty cache to ensure no fake sample orders are injected.
  4. Expand an unpaid order (`ord-qa-unpaid-1`) and click `"Pay Now"`, and click `"Payment History"` on `/orders`.
- **Expected Result**:
  - Unauthenticated access redirects to login.
  - Legacy sample order ID `ord_1793113916585` is stripped cleanly; empty accounts render `"No orders yet"` with zero mock cards even on error.
  - `"Pay Now"` navigates to `/payment?orderId=...` and `"Payment History"` navigates to `/payments?q=&status=all`.
- **Actual Result**:
  - All checks passed cleanly.
  - *(Documented API client observation)*: When `GET /api/orders` returns `500` with empty cache, [`api.getOrders`](src/utils/api.ts#L1071-L1073) catches non-OK HTTP statuses and returns cached `storage.get(STORAGE_KEYS.orders, [])` (`[]`) rather than throwing, so `/orders` renders `"No orders yet"` cleanly rather than `Orders.tsx`'s `"Unable to load orders"` catch branch and injects zero fake orders.
- **Evidence**:
  - Unauth redirect: `http://127.0.0.1:5173/login?redirect=%2Forders`.
  - Legacy strip (`[]` from API): `storedOrdersAfterStrip: "[]"`, `bodyTextHasNoOrdersYet: true`, `bodyTextHasFakeSonyOrder: false`, `bodyTextHasLegacyId: false`.
  - `500` with empty cache: `showsNoOrdersYet: true`, `showsFakeSampleOrder: false`, `storedOrders: "[]"`.
  - `"Pay Now"` click: `http://127.0.0.1:5173/payment?orderId=ord-qa-unpaid-1&id=&total=0&start=&end=`.
  - `"Payment History"` click: `http://127.0.0.1:5173/payments?q=&status=all` (`Page Title: Payment History & Transactions | Payent`, `hasPageHeading: true`).
- **Status**: **`PASS` — VERIFIED**

---

### F-07 — Accessible Filter Checkboxes (`Filters.tsx`)
- **Test Scenarios**:
  1. At `1280×800` on `/filters?cat=electronics`, inspect DOM elements and `aria-disabled` across all Category and Condition filters.
  2. Click `label[for$="filter-cat-cameras"]` with mouse.
  3. Focus `filter-cat-laptops`, press `Tab` to move focus to `filter-cat-drones`, and press `Space` to toggle.
  4. Verify accessibility snapshot (`ariaSnapshot()`) roles/checked states and Condition `Space` toggle + minimum-1-selected `aria-disabled="true"` guard.
- **Expected Result**:
  - Real `<input type="checkbox" className="sr-only peer">` controls exist for all 9 Categories and 2 Conditions, expose `checkbox` ARIA roles, show `peer-focus-visible:ring-2`, toggle once per click/`Space`, and keep at least 1 Condition selected.
- **Actual Result**:
  - All mouse, keyboard (`Tab` + `Space`), focus ring, accessibility tree, and minimum-selection guard assertions passed.
- **Evidence**:
  - **Native Inputs Rendered (`1280×800`)**: All `11` controls (`9` categories `#mobile-filter-cat-cameras`..`#mobile-filter-cat-bikes` + `2` conditions `#mobile-filter-cond-new`, `#mobile-filter-cond-used`) rendered as native `<input type="checkbox">` bound to `<label for="...">` with indicator class containing `peer-focus-visible:ring-2`.
  - **Mouse Click**: Clicking `label[for$="filter-cat-cameras"]` toggled `afterMouseCheckedCats: ["mobile-filter-cat-cameras"]` and URL -> `/filters?cat=electronics%2Ccameras`.
  - **Keyboard `Tab` + `Space`**:
    - Focused `#mobile-filter-cat-laptops` (`INPUT`, `type="checkbox"`).
    - `Tab` focused `#mobile-filter-cat-drones` (`INPUT`, `type="checkbox"`, `checkedBefore: false`).
    - `Space` toggled `checkedAfter: true` and URL -> `/filters?cat=electronics%2Ccameras%2Cdrones`.
  - **Accessibility Tree (`aside.ariaSnapshot()`)**: Reported native roles & states (`checkbox "Cameras 7" [checked]`, `checkbox "Laptops / PCs 4"`, `checkbox "Drones 2" [checked]`, etc.).
  - **Condition Guard**: `Space` toggled `#mobile-filter-cond-new` (`true -> false`) and flipped `#mobile-filter-cond-used` `aria-disabled="true"`; subsequent `Space` on `#mobile-filter-cond-used` kept `condUsedStayedChecked: true`.
- **Status**: **`PASS` — VERIFIED**

---

### F-08 — Profile KYC Response Parsing & Failure Recovery
- **Test Scenarios**:
  1. Navigate to authenticated `/profile` and exercise `/api/kyc/status` payloads matching `backend/main.py`: `NOT_STARTED`, `PENDING`, `REJECTED` (`rejectionReason: "PAN document blurry"`), `HTTP 500` API failure, Retry -> `APPROVED`, and full `page.reload()`.
- **Expected Result**:
  - Top-level response fields parse cleanly (`parseKycStatusResponse`) across all 4 lifecycle states; API failures show `"UNAVAILABLE"` + Retry button; Retry recovery & reload show `"APPROVED"` + masked PAN without flashing `"XXXXX1234F"`.
- **Actual Result**:
  - Every KYC state, error badge, Retry button recovery, and reload hydration passed (`pageErrors: []`).
- **Evidence**:
  - **`NOT_STARTED`**: `badgeNotStarted: true` (`"NOT_STARTED"`), `panNotLinked: true` (`"PAN: Not linked"`), `verifyPanCta: true` (`"Verify PAN Card Now"`).
  - **`PENDING`**: `badgePending: true` (`"PENDING"`), `maskedPanVisible: true` (`"PAN: XXXXX9012K"`), `pendingCtaVisible: true` (`"Check PAN Verification Status"`).
  - **`REJECTED`**: `badgeRejected: true` (`"REJECTED"`), `rejectionReasonVisible: true` (`"Rejection Reason: PAN document blurry"`), `verifyPanCta: true`.
  - **`HTTP 500` Failure**: `badgeUnavailable: true` (`"UNAVAILABLE"`), `panUnavailable: true` (`"PAN: Unavailable"`), `errorTextVisible: true` (`"KYC verification provider unreachable"`), `kycRetryVisible: true`.
  - **`APPROVED` after Retry**: `badgeApproved: true` (`"APPROVED"`), `maskedPanVisible: true` (`"PAN: XXXXX9012K"`), `viewPanKycButton: true` (`"View PAN KYC"`), `verifyPanCtaHidden: true`.
  - **`APPROVED` after `page.reload()`**: `badgeApprovedAfterReload: true`, `maskedPanAfterReload: true`, `hasFakePanAfterReload: false`.
- **Status**: **`PASS` — VERIFIED**

---

## 4. Incidental Non-P0 Findings Observed During Runtime Testing

Recorded transparently for subsequent non-P0 cleanup phases (no files were altered during Phase 1.5):

1. **Live Backend `GET /api/search/stats` Returns `HTTP 500`**: Observed in browser network logs when opening `SearchOverlay` against `http://127.0.0.1:8001/api/search/stats`. Search and matching-category flows continue working normally via `POST /api/search` and `/api/products`.
2. **React 19 SSR Hydration Mismatches on Direct Navigation When `localStorage` Is Populated**: Direct full-page navigation (`page.goto` / hard reload) to `/browse`, `/filters`, and `/product/$id` after prior browsing populates `localStorage["payent_server_products"]` triggers React hydration mismatch logs because SSR renders with empty/default cache counts (`11` vs `16` on `/browse`, `3` vs `4`/`7`/`14` on `/filters`, `<div>` vs `<JsonLd>` `<script>` on `/product/$id`) while CSR reads `localStorage` synchronously on initial render.
3. **[`api.getOrders`](src/utils/api.ts#L1061-L1132) Swallows Non-OK HTTP Statuses**: Lines `1071–1073` return `storage.get(STORAGE_KEYS.orders, [])` instead of throwing on `!res.ok`, preventing `Orders.tsx`'s error banner catch branch from showing on `500` when the cache is empty (falls back to clean `"No orders yet"` UI without injecting sample orders).
4. **Shared Sidebar Checkbox ID Prefix ([`Filters.tsx:1079`](src/pages/Filters.tsx#L1079))**: The unified responsive `<aside>` calls `renderSidebarFilters(true)` for both desktop and mobile viewports, so desktop checkbox DOM IDs currently carry the `#mobile-filter-*` prefix.

---

## 5. Phase 1 Closure Verdict

- **Verdict**: **PHASE 1 P0 FIXES (`F-01` – `F-08`) ARE VERIFIED IN LIVE CHROMIUM RUNTIME (`8 / 8 PASS`)**.
- All runtime regressions previously marked `FIXED BUT NOT FULLY VERIFIED` in [`P0_FIX_REPORT.md`](./P0_FIX_REPORT.md) have now been empirically exercised in Chromium against the local Vite + FastAPI + TiDB Cloud application.
- Zero production source files were modified during Phase 1.5. Remaining non-P0 audit items (`F-09` – `F-40` in [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md)) and the 4 incidental non-P0 observations above remain cleanly scoped for Phases 2–6.
