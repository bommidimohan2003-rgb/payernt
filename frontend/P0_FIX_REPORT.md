# paYent Frontend — Phase 1 P0 Critical Fixes Report

> **Scope**: Fixes for all 8 verified `P0` Critical findings (`F-01` – `F-08`) from [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md)  
> **Date**: 2026-11-09  
> **Frontend Root**: `C:\payernt-main\payernt-main\frontend`  
> **Backend Root**: `C:\payernt-main\payernt-main\backend` (read-only inspection; zero backend files modified during Phase 1)  

---

## 1. Status of F-01 through F-08

| Finding | Title | Verification Status | Summary of Empirical Verification vs Remaining Runtime Scope |
| :--- | :--- | :--- | :--- |
| **F-01** | Wishlist Product ID Mismatch (`RentalProductCard` / `useWishlist` / `Wishlist`) | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors in P0 files; `vite build` exit 0; `tests/p0-fixes.test.ts` (3/3 pass). Live authenticated `/api/wishlist` toggle, multi-tab storage sync, and Home ↔ `/wishlist` DOM click-through require a running browser + FastAPI backend. |
| **F-02** | Category Filter URL Parameter Mismatch (`?category=` vs `?cat=`) | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors in P0 files; `vite build` exit 0; live unit tests for `normalizeCategoryParam`, `matchesProductCategory`, `getCategoryDisplayLabel` + route/component contract checks (5/5 pass). Live browser Back/Forward + live `/api/search` ML integration require a running browser + FastAPI backend. |
| **F-03** | Orders Receipt Modal Crash (`Loader2`) & Fake Paid Fallback | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors in `Orders.tsx`; `vite build` exit 0; `tests/p0-fixes.test.ts` confirms `Loader2` import, sequence guard, error + retry UI, and disabled print button. Live modal interaction & `/api/payments/receipt/:id` HTTP error/success states require a running browser + FastAPI backend. |
| **F-04** | Global CSS SVG Reversal (`order: -1`) & `Button` `rightIcon` Placement | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors; `vite build` exit 0; compiled CSS (`dist/client/assets/*.css`) verified free of `order: -1` / `data-no-auto-order`; live `renderToStaticMarkup` JSX execution verifies `<Button>` & `<UiButton>` place leading icon before text and `rightIcon` after text (2/2 suites pass). Live Chromium viewport inspection of Hero CTA, pagination buttons, and mobile Footer accordions remains pending. |
| **F-05** | Fake Hardcoded Fallbacks (`Sony Alpha a7 III`, Owners, Ratings, PAN `XXXXX1234F`) | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors in `ProductDetails.tsx`, `Profile.tsx`, `fallbackProducts.ts`; `vite build` exit 0; live runtime execution proves `findFallbackProduct("1")` and `findFallbackProduct("sony")` return `undefined` (3/3 tests pass). Live 404 / 5xx network failure rendering on `/product/$id` and `/profile` save failure toast require a running browser + FastAPI backend. |
| **F-06** | Sample Cancelled Orders Seeding (`DEFAULT_SAMPLE_ORDERS`) & `/payments` Nav Error | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors in `Orders.tsx`; `vite build` exit 0; contract tests pass. Empty-state rendering after stripping legacy `localStorage` IDs and typed `/payments` navigation click require a running browser session. |
| **F-07** | Keyboard-Inaccessible Filter Checkboxes (`Filters.tsx`) | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete; `tsc --noEmit` = 0 errors in `Filters.tsx`; `vite build` exit 0; contract test confirms native `sr-only peer` `<input type="checkbox">` + `htmlFor` + `peer-focus-visible:ring-2` + `aria-disabled`. Live `Tab` / `Space` keyboard focus ring and screen-reader announcements require a running browser. |
| **F-08** | Broken Profile KYC Response Parsing (`res.data` & `user?.kycStatus`) | **FIXED BUT NOT FULLY VERIFIED** | Code fixes complete against verified `backend/main.py` (`GET /api/kyc/status`); `tsc --noEmit` = 0 errors in `Profile.tsx` & `kyc.ts`; `vite build` exit 0; live unit tests validate `parseKycStatusResponse` across flat/envelope/unknown/error payloads (2/2 pass). Live authenticated `/api/kyc/status` hydration & retry click require a running browser + FastAPI backend. |

> **Why `FIXED BUT NOT FULLY VERIFIED` is reported across all 8 findings**: Every P0 source fix, TypeScript alignment, production bundle, and Node-executable test passed cleanly, **but** live interactive Chromium click/keyboard flows against a running Vite + FastAPI + TiDB stack could not run in this sandbox (`vite dev` via `@cloudflare/vite-plugin` failed inside the sandbox due to external log path `EPERM` and `127.0.0.1` workerd socket `EACCES`, and no FastAPI backend daemon was running on port `8001`). Verification details are documented transparently in Sections 6 and 9.

---

## 2. Root Cause of Each Issue

1. **F-01 (Wishlist Product ID Mismatch & Sync)**:
   - [`RentalProductCard.tsx`](src/components/common/RentalProductCard.tsx) passed the full `Product` object (`toggle(product)`) instead of `String(product.id)`, causing `TS2345` against [`useWishlist.ts`](src/hooks/useWishlist.ts) (`(id: string)`), broken heart active checks, and malformed API calls.
   - [`useWishlist.ts`](src/hooks/useWishlist.ts) also had race/state bugs: failed API toggles invoked stale cached `fetchWishlistDeduplicated(token)` (15s cache window) instead of deterministically reverting using pre-toggle state, lacked per-ID concurrency locking, only read auth token once on mount without listening to login/logout storage events, and compared raw values without string normalization.
   - [`Product`](src/types/index.ts) lacked optional runtime API properties (`daily_rate`, `name`, `created_at`, `condition`, etc.) read by Home/Wishlist cards (`TS2339`).

2. **F-02 (Category Filter URL Parameter Mismatch)**:
   - Home [`Categories.tsx`](src/components/home/Categories.tsx) and [`SearchOverlay.tsx`](src/components/home/SearchOverlay.tsx) emitted `?category=<id>`, whereas Browse/Filter routes ([`routes/browse.tsx`](src/routes/browse.tsx), [`routes/categories.tsx`](src/routes/categories.tsx), [`routes/filters.tsx`](src/routes/filters.tsx), [`routes/payent/explore.tsx`](src/routes/payent/explore.tsx)) and pages ([`pages/Categories.tsx`](src/pages/Categories.tsx), [`pages/Filters.tsx`](src/pages/Filters.tsx)) read `?cat=<id>`.
   - Additionally, Home uses parent category IDs (`electronics`, `vehicles`, `music`, `gaming`) while `/browse` & `/filters` used granular IDs (`laptops`, `audio`, `bikes`), and [`backend/search_ml.py`](../backend/search_ml.py#L215-L234) filters strictly by `p.get("category") != category`. When `mlResults` returned matches on [`pages/Categories.tsx`](src/pages/Categories.tsx), `selectedCats` filtering was skipped entirely. [`pages/Filters.tsx`](src/pages/Filters.tsx) also initialized state once without syncing external URL search changes.

3. **F-03 (Orders Receipt Modal Crash & Fake Paid Receipts)**:
   - [`Orders.tsx`](src/pages/Orders.tsx) rendered `<Loader2 />` inside the Receipt Modal without importing `Loader2` from `lucide-react`, causing `TS2304` and a runtime `ReferenceError` when opening a receipt while loading.
   - `handleOpenReceipt` allowed unauthenticated execution and, inside its `catch` block, fabricated a paid receipt object (`REC-...`, `payment_status: "paid"`) even when `api.getPaymentReceipt` failed. Stale async responses were not guarded against closing/reopening the modal.

4. **F-04 (Global SVG Icon Reversal & `Button` `rightIcon` Slot Bug)**:
   - [`styles.css`](src/styles.css) contained a global rule (`button:where(:not([data-no-auto-order])) > svg ... { order: -1 !important; }`) that forced all icons inside buttons to render on the left.
   - Both [`src/components/common/Button.tsx`](src/components/common/Button.tsx) and [`src/components/ui/button.tsx`](src/components/ui/button.tsx) also applied `[&_svg]:order-first` utility classes, and `common/Button.tsx` rendered `rightIcon` inside the left icon slot (`icon || leftIcon || rightIcon`) while `ui/button.tsx` omitted `rightIcon` support completely.

5. **F-05 (Fake Hardcoded Fallback Data Across Product Details & Profile)**:
   - [`fallbackProducts.ts`](src/utils/fallbackProducts.ts) and [`ProductDetails.tsx`](src/pages/ProductDetails.tsx) had `targetKey === "1" || targetKey.includes("sony")` overrides plus a `catch`-all hardcoded `"Sony Alpha a7 III"` (`Sai Teja`, `Vizag, AP`, `₹499`, `124` reviews), making the `"Product not found"` screen unreachable for missing products and hiding HTTP 5xx/network failures.
   - [`ProductDetails.tsx`](src/pages/ProductDetails.tsx) also hardcoded `"Arun Kumar"`, `"Bengaluru"`, camera-biased description fallbacks, fake SEO `aggregateRating` (`4.8`/`124`), fake `"5.0"`/`"4.9"` zero-review ratings, and fake `4.7`/`84` on Related cards, plus nullable `JsonLd` and strict callback type errors.
   - [`Profile.tsx`](src/pages/Profile.tsx) defaulted missing PAN inputs to `"XXXXX1234F"`, lacked a loading guard before `useAuth` settled (`!ready && !user`), silently swallowed `getUserStats` errors, and could fail silently or mislead users during `saveProfile` sync errors.

6. **F-06 (Mock Cancelled Sample Orders & Invalid `/payments` Route Navigation)**:
   - [`Orders.tsx`](src/pages/Orders.tsx) defined `DEFAULT_SAMPLE_ORDERS` (4 cancelled mock orders with untyped `cancelledAt` causing 4 `TS2353` errors) and wrote them into `localStorage` on initial empty/logged-out visits, suppressing the real empty state and error UI.
   - The `"Payments History"` button called `navigate({ to: "/payments" })` without the required `{ q, status }` search params expected by `routes/payments.tsx` (`TS2345`).

7. **F-07 (Keyboard & Screen-Reader Inaccessible Filter Checkboxes)**:
   - [`Filters.tsx`](src/pages/Filters.tsx) rendered Category and Condition filters as clickable `<label onClick={...}>` wrappers containing visual `<div>` squares without `<input type="checkbox">`, `role`, `tabIndex`, keyboard handlers, or focus rings.

8. **F-08 (Broken Profile KYC Response Parsing)**:
   - [`backend/main.py`](../backend/main.py#L2801-L2812) `GET /api/kyc/status` returns flat top-level fields (`{ success: true, accountType, expectedDocumentType, status, documentType, maskedNumber, ... }`).
   - [`Profile.tsx`](src/pages/Profile.tsx) checked `res.success && res.data` (`TS2339`, since `.data` does not exist on the response) and fell back to non-existent `user?.kycStatus` (`TS2551`), alongside missing `kycLoading`/`kycError` error feedback.

---

## 3. Files Modified

### P0 Files Modified
- [`frontend/src/types/index.ts`](src/types/index.ts) — Extended `Product` with optional backend/normalized fields (`name`, `daily_rate`, `dailyRate`, `condition`, `condition_grade`, `brand`, `created_at`, `createdAt`, `pincode`, owner address fields).
- [`frontend/src/hooks/useWishlist.ts`](src/hooks/useWishlist.ts) — String ID normalization, `_pendingToggleIds` per-ID lock, deterministic error rollback, `force` cache invalidation, storage/auth listeners, async `Promise<boolean>` return.
- [`frontend/src/components/common/RentalProductCard.tsx`](src/components/common/RentalProductCard.tsx) — Pass `productId = String(product.id)` to `has()`, `toggle()`, and `<Link params={{ id: productId }}>`; added `aria-pressed` & failure toast check.
- [`frontend/src/pages/Wishlist.tsx`](src/pages/Wishlist.tsx) — Stringified ID comparison `ids.includes(String(p.id))` and cached product pre-load.
- [`frontend/src/components/home/Categories.tsx`](src/components/home/Categories.tsx) — Standardized navigation `search` params from `{ category }` to `{ cat }`.
- [`frontend/src/components/home/SearchOverlay.tsx`](src/components/home/SearchOverlay.tsx) — Standardized matching-category and quick-category navigation `search` params from `{ category }` to `{ cat }`.
- [`frontend/src/routes/browse.tsx`](src/routes/browse.tsx) — Switched search schema `cat` parsing to `normalizeCategoryParam(search)`.
- [`frontend/src/routes/categories.tsx`](src/routes/categories.tsx) — Switched search schema `cat` parsing to `normalizeCategoryParam(search)`.
- [`frontend/src/routes/filters.tsx`](src/routes/filters.tsx) — Switched search schema `cat` parsing to `normalizeCategoryParam(search)`.
- [`frontend/src/routes/payent/explore.tsx`](src/routes/payent/explore.tsx) — Switched search schema `cat` parsing to `normalizeCategoryParam(search)`.
- [`frontend/src/utils/smartSearch.ts`](src/utils/smartSearch.ts) — Client fallback category filtering now calls `matchesProductCategory(p.category, selectedCat)`.
- [`frontend/src/pages/Categories.tsx`](src/pages/Categories.tsx) — Replaced `matchCategory` with `matchesProductCategory`; normalized `?cat=` / legacy `?category=`; fixed `CategoryDefinition.icon` & `categoryIconMap` (`strokeWidth?: number`, added `electronics`, `vehicles`, `music`, `gaming`); applied `selectedCats` filtering after `searchWithML(..., undefined, 50)`; used `getCategoryDisplayLabel` for headings & active filter chips; aligned neutral monochrome filter chrome.
- [`frontend/src/pages/Filters.tsx`](src/pages/Filters.tsx) — Integrated `normalizeCategoryParam`, `matchesProductCategory`, `getCategoryDisplayLabel`, and URL-to-state sync effect (respecting active search debounce); replaced `<label onClick>` boxes with native accessible `<input type="checkbox" className="sr-only peer">` controls wired via unique `htmlFor`/`id` and `peer-focus-visible:ring-2`.
- [`frontend/src/styles.css`](src/styles.css) — Removed global `button:where(:not([data-no-auto-order])) > svg ... { order: -1 !important; }` override.
- [`frontend/src/components/common/Button.tsx`](src/components/common/Button.tsx) — Removed `[&_svg]:order-first`; separated leading (`icon || leftIcon`) and trailing (`rightIcon`) slots around `{displayText}`.
- [`frontend/src/components/ui/button.tsx`](src/components/ui/button.tsx) — Removed `[&_svg]:order-first`; added `rightIcon?: React.ReactNode` prop and separated leading/trailing icon slots.
- [`frontend/src/utils/fallbackProducts.ts`](src/utils/fallbackProducts.ts) — Removed `targetKey === "1" || targetKey.includes("sony")` catchall fallback in `findFallbackProduct`.
- [`frontend/src/pages/ProductDetails.tsx`](src/pages/ProductDetails.tsx) — Removed fake `"Sony Alpha a7 III"` fallback, `"1"`/`"sony"` hijack, `"Arun Kumar"`, `"Bengaluru"`, camera-biased description fallback, fake SEO `aggregateRating`, zero-review `"5.0"`/`"4.9"` ratings, and fake `4.7`/`84` Related badges; added `productError` + `reloadCount` Retry state distinguishing 404 from 5xx/network errors; fixed `JsonLd` null guards & `handleDurationModeChange`/`handleSlotSelect` typing; synced wishlist `toggle(String(product.id))` error handling.
- [`frontend/src/pages/Orders.tsx`](src/pages/Orders.tsx) — Imported `Loader2` and `cn`; replaced fake receipt `catch` fallback with explicit `receiptError`, Retry button, disabled Print button, `handleCloseReceipt`, and `receiptReqSeqRef` stale-response guard; removed `DEFAULT_SAMPLE_ORDERS` seeding; added `stripLegacySampleOrders`; surfaced `errorState` on API failure with empty cache; fixed `/payments` navigation `{ to: "/payments", search: { q: "", status: "all" } }`.
- [`frontend/src/pages/Profile.tsx`](src/pages/Profile.tsx) — Removed `"XXXXX1234F"` fake PAN; added `if (!ready && !user)` loading guard, `statsError` + Retry UI, and error toast in `saveProfile` instead of false success toast; replaced `res.data` & `user?.kycStatus` with `parseKycStatusResponse(res)`, `kycLoading`, `kycError`, Retry button, `"UNAVAILABLE"` error badge, and `"payent_kyc_updated"` listener.

### New P0 Files Created
- [`frontend/src/utils/categoryFilter.ts`](src/utils/categoryFilter.ts) — Shared canonical category normalizer, label resolver, and cross-hierarchy category matcher (`F-02`).
- [`frontend/src/utils/kyc.ts`](src/utils/kyc.ts) — Strict `/api/kyc/status` parser & types (`F-08`).
- [`frontend/tests/p0-fixes.test.ts`](frontend/tests/p0-fixes.test.ts) — Phase 1 regression test suite covering `F-01` – `F-08`.

### Pre-Existing Uncommitted Changes Preserved Untouched
All pre-existing uncommitted work (`backend/main.py`, `Hero.tsx`, `Home.tsx`, `Navbar.tsx`, `Footer.tsx`, `HowItWorks.tsx`, `WhyChoose.tsx`, `Navigation4.tsx`, `MainLayout.tsx`, `api.ts`, `ExploreRentals.tsx`, `NewArrivals.tsx`, `RecentlyViewed.tsx`, `RecommendedForYou.tsx`, `CustomerReviews.tsx`, `hero_*.webp`, `.agents/`, `UNSLOP_AUDIT_REPORT.md`) was preserved cleanly. Note `SearchOverlay.tsx` and `home/Categories.tsx` (previously untracked/modified) received only targeted `?category=` → `?cat=` route param fixes, and `RentalProductCard.tsx` received only the `F-01` wishlist string ID fix + `aria-pressed`.

---

## 4. Exact Changes Made

- **F-01**:
  - [`RentalProductCard.tsx:20-58`](src/components/common/RentalProductCard.tsx#L20-L58): computes `const productId = String(product.id);`, passes `productId` into `has(productId)`, `await toggle(productId)`, and `<Link params={{ id: productId }}>`, adds `aria-pressed={isWishlisted}`, and shows an error toast if `toggle(productId)` returns `false`.
  - [`useWishlist.ts:11-168`](src/hooks/useWishlist.ts#L11-L168): normalizes wishlist arrays into deduplicated trimmed strings; guards concurrent clicks per ID using `_pendingToggleIds`; snapshots `wasWishlisted` prior to optimistic update to cleanly revert only that ID on failure; reads live `STORAGE_KEYS.token`; subscribes to `"storage"` and `"payent:storage_change"`; invalidates cache when `force = true`.
  - [`Wishlist.tsx:18-36`](src/pages/Wishlist.tsx#L18-L36): hydrates initial product list from valid cached `payent_server_products` and filters via `ids.includes(String(p.id))`.
  - [`types/index.ts:39-100`](src/types/index.ts#L39-L100): adds typed optional API fields onto `Product`.

- **F-02**:
  - [`categoryFilter.ts:1-172`](src/utils/categoryFilter.ts#L1-L172): exports `CANONICAL_CATEGORY_LABELS`, `normalizeCategoryParam` (preferring `cat`, falling back to legacy `category`), `getCategoryDisplayLabel`, and `matchesProductCategory` (mapping parent categories like `electronics`/`vehicles`/`cameras`/`music`/`gaming` across catalog subcategories like `laptops`, `audio`, `bikes`, `drones`, `sound`, `lighting`).
  - [`home/Categories.tsx:96,182`](src/components/home/Categories.tsx#L96) & [`SearchOverlay.tsx:305,478`](src/components/home/SearchOverlay.tsx#L305): emit `{ cat: ... }`.
  - [`routes/browse.tsx`](src/routes/browse.tsx), [`routes/categories.tsx`](src/routes/categories.tsx), [`routes/filters.tsx`](src/routes/filters.tsx), [`routes/payent/explore.tsx`](src/routes/payent/explore.tsx): `cat: normalizeCategoryParam(search)`.
  - [`pages/Categories.tsx`](src/pages/Categories.tsx): fixes `CategoryDefinition.icon` signature (`TS2769`), adds missing canonical icons (`electronics`, `vehicles`, `music`, `gaming`), strips legacy `category` when writing `cat`, runs `searchWithML(allProductsList, q.trim(), undefined, 50)` so backend strict category equality does not discard parent-category items, and applies `selectedCats` via `matchesProductCategory` post-ML.
  - [`pages/Filters.tsx`](src/pages/Filters.tsx): integrates `normalizeCategoryParam`, `matchesProductCategory`, `getCategoryDisplayLabel`, and `useEffect` syncing URL query params back into local state (preserving in-flight debounce timer `searchTimeoutRef.current`).

- **F-03**:
  - [`Orders.tsx:37,48`](src/pages/Orders.tsx#L37): imports `Loader2` (`lucide-react`) and `cn` (`@/lib/utils`).
  - [`Orders.tsx:450-515,2320-2430`](src/pages/Orders.tsx#L450-L515): adds typed `receiptData`, `receiptError`, `receiptReqSeqRef`, and `handleCloseReceipt`; blocks unauthenticated receipt fetches with clear message; drops fake `REC-...` / `"paid"` error fallback; displays `"Receipt unavailable"` + **Retry** button on failure and disables `"Print / Save Receipt"` whenever `receiptLoading || Boolean(receiptError) || !receiptData`.

- **F-04**:
  - [`styles.css`](src/styles.css): deletes global `.btn`/`button` `> svg { order: -1 !important; }` CSS rule at lines 819–833.
  - [`common/Button.tsx`](src/components/common/Button.tsx) & [`ui/button.tsx`](src/components/ui/button.tsx): remove `[&_svg]:order-first` classes and explicitly render `leadingIcon` (`icon || leftIcon`) before children text and `rightIcon` after children text.

- **F-05**:
  - [`fallbackProducts.ts:266-273`](src/utils/fallbackProducts.ts#L266-L273): removes `targetKey === "1" || targetKey.includes("sony")` catchall.
  - [`ProductDetails.tsx`](src/pages/ProductDetails.tsx): removes Sony/`"1"` fallback (`172-185, 361-395`), separates HTTP 404 (`"Product not found"`) from 5xx/network error (`"Unable to load product"` + **Retry** button), removes `"Arun Kumar"`, `|| "Bengaluru"`, camera-only description fallback, fake SEO `aggregateRating` on zero-review items, `"5.0"` / `4.9` zero-review badge values (`"New"`), and `4.7`/`84` on Related cards; guards `JsonLd` renders with `{productSchema && ...}`; widens `handleDurationModeChange` and `handleSlotSelect` parameters cleanly.
  - [`Profile.tsx`](src/pages/Profile.tsx): removes `"XXXXX1234F"` fallbacks (renders `"Not linked"` / `"Checking..."` / `"Unavailable"`), guards `!ready && !user` loading state, adds `statsError` + Retry panel, and displays backend error toast when `api.updateProfile` rejects.

- **F-06**:
  - [`Orders.tsx:81-91,613-678`](src/pages/Orders.tsx#L81-L91): removes `DEFAULT_SAMPLE_ORDERS` array and seeding; adds `LEGACY_SAMPLE_ORDER_IDS` + `stripLegacySampleOrders` so any pre-seeded sample IDs in `localStorage` are pruned on load without deleting genuine orders; surfaces `setErrorState` when `getOrders` fails with zero cached orders.
  - [`Orders.tsx:1125`](src/pages/Orders.tsx#L1125): changes `navigate({ to: "/payments" })` to `navigate({ to: "/payments", search: { q: "", status: "all" } })`.

- **F-07**:
  - [`Filters.tsx`](src/pages/Filters.tsx): replaces interactive `<label onClick>` visual boxes in Category (`~581-615`) and Condition (`~906-960`) lists with `<label htmlFor={inputId}>` wrapping a native `<input id={inputId} type="checkbox" checked={...} onChange={...} className="sr-only peer" />`, `aria-hidden="true"` visual indicator with `peer-focus-visible:ring-2`, and `aria-disabled={isOnlySelected}` on single-remaining Condition selection.

- **F-08**:
  - [`kyc.ts:1-101`](src/utils/kyc.ts#L1-L101): adds `parseKycStatusResponse(raw)` parsing top-level `/api/kyc/status` JSON (and optional `.data` envelopes), normalizing `NOT_STARTED | PENDING | APPROVED | REJECTED` (and camel/snake field names) cleanly.
  - [`Profile.tsx:100-150,1175-1260`](src/pages/Profile.tsx#L100-L150): replaces `res.success && res.data` and `user?.kycStatus` with `parseKycStatusResponse(res)`, adds `kycLoading`, `kycError`, `loadKycStatus` Retry UI, `"UNAVAILABLE"` error badge when `/api/kyc/status` fails, and `"payent_kyc_updated"` event listener.

---

## 5. Tests Added or Updated

- Added [`frontend/tests/p0-fixes.test.ts`](tests/p0-fixes.test.ts) (`18` tests across `8` suites covering `F-01` – `F-08`), combining:
  - **Live TypeScript utility execution**: `normalizeCategoryParam`, `matchesProductCategory`, `getCategoryDisplayLabel` (`categoryFilter.ts`), and `parseKycStatusResponse` (`kyc.ts`).
  - **Live React JSX SSR DOM verification (via `esbuild` + `react-dom/server` `renderToStaticMarkup`)**: renders actual `common/Button` and `ui/button` components with `leftIcon` + text + `rightIcon` and asserts strict DOM order (`lead` < label < `trail`) with zero `order-first`.
  - **Live runtime module verification (via `esbuild` in-memory bundle)**: executes `findFallbackProduct` (`fallbackProducts.ts`) against `"1"`, `"sony"`, `"sony-fake-id"`, `"does-not-exist"`, and `"sony-alpha-a7-iii"`.
  - **Compiled production CSS asset inspection**: reads built CSS in `dist/client/assets/*.css` to verify `order: -1` and `data-no-auto-order` are absent from the final production stylesheet.
  - **Source & route contract checks**: validates `RentalProductCard`, `useWishlist`, `Wishlist`, `home/Categories`, `SearchOverlay`, `routes/*`, `pages/Categories`, `Filters`, `Orders`, `ProductDetails`, and `Profile` against regressions.

---

## 6. Tests Executed and Results

### A. P0 Regression Test Suite
```powershell
node --test --experimental-strip-types "c:\payernt-main\payernt-main\frontend\tests\p0-fixes.test.ts"
```
- **Exit Code**: `0`
- **Result**: `tests 18`, `suites 8`, `pass 18`, `fail 0`, `cancelled 0`, `skipped 0`, `duration_ms 388.717`
- **All 8 suites passed verbatim**:
  - `F-01` (3/3 pass)
  - `F-02` (5/5 pass)
  - `F-03` (1/1 pass)
  - `F-04` (2/2 pass, including live `renderToStaticMarkup` DOM icon order & compiled CSS verification)
  - `F-05` (3/3 pass, including live `findFallbackProduct` calls)
  - `F-06` (1/1 pass)
  - `F-07` (1/1 pass)
  - `F-08` (2/2 pass, including live `parseKycStatusResponse` test matrix)

### B. Compiled Client CSS Verification
```powershell
node -e "const fs = require('fs'); const dir = 'c:/payernt-main/payernt-main/frontend/dist/client/assets'; const cssFiles = fs.readdirSync(dir).filter(f => f.endsWith('.css')); const combined = cssFiles.map(f => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n'); console.log('has auto-order selector:', combined.includes('data-no-auto-order')); console.log('has order:-1:', /order\s*:\s*-1/.test(combined));"
```
- **Exit Code**: `0`
- **Output**:
  - `has auto-order selector: false`
  - `has order:-1: false`

### C. Local SSR Server / Bundle Probe (Blocked by Sandbox & Pre-Existing SSR Split)
- **Vite dev server (`vite --port 4181 --host 127.0.0.1`)**: Failed in sandbox because `@cloudflare/vite-plugin` spawns Wrangler/Miniflare, which exited with `EPERM` attempting to write logs to `C:\Users\LENOVO\AppData\Roaming\xdg.config\.wrangler\logs\...` outside the workspace and `connect EACCES 127.0.0.1:60736`.
- **Direct Node evaluation of built `dist/server/index.js`**: Returned HTTP `500` (`Error: No QueryClient set, use QueryClientProvider to set one at CartProvider`) due to a pre-existing SSR bundle / manual chunking behavior between `vendor-tanstack-*.js` and `router-*.js` when executed outside Cloudflare `workerd` (left untouched because `vite.config.ts`, `router.tsx`, and `__root.tsx` are outside P0 scope).

---

## 7. TypeScript Check Result

```powershell
npx --prefix "c:\payernt-main\payernt-main\frontend" tsc --noEmit -p "c:\payernt-main\payernt-main\frontend\tsconfig.json"
```
- **Result**: `Total TS errors: 48` (exit code `1`), **ALL 48 errors reside in 19 unrelated pre-existing files outside P0 scope** (`KycApplicationDetails.tsx`, `KycVerification.tsx`, `OTPVerification.tsx`, `RenterBookingCalendar.tsx`, `CartDrawer.tsx`, `PhotoDetailViewer.tsx`, `SectionBox.tsx`, `HeroHeader.tsx`, `BecomeLender.tsx`, `BookingDetails.tsx`, `Cart.tsx`, `Checkout.tsx`, `Messages.tsx`, `PayrentKycPage.tsx`, `Support.tsx`, `LenderProductEdit.tsx`, `MyProducts.tsx`, `PayerntKycPage.tsx`, and `api.ts(1914)` duplicate `rejectOrder` property).
- **Zero (`0`) TypeScript errors remain in ALL P0-modified and audited P0 files**:
  - `RentalProductCard.tsx`, `ExploreRentals.tsx`, `NewArrivals.tsx`, `Categories.tsx`, `Filters.tsx`, `Orders.tsx`, `Button.tsx`, `ui/button.tsx`, `ProductDetails.tsx`, `Profile.tsx`, `Wishlist.tsx`, `useWishlist.ts`, `SearchOverlay.tsx`, `home/Categories.tsx`, `categoryFilter.ts`, `kyc.ts`, `fallbackProducts.ts`, `smartSearch.ts`, `types/index.ts`, and all 4 route schemas (`browse.tsx`, `categories.tsx`, `filters.tsx`, `payent/explore.tsx`).

---

## 8. Production Build Result

```powershell
npm --prefix "c:\payernt-main\payernt-main\frontend" run build
```
- **Command**: `vite build` (`Vite v8.3.2`)
- **Exit Code**: `0`
- **Client Bundle**: `5495 modules transformed`, built in `2.68s` (`dist/client/assets/styles-EoL7T6EQ.css` `373.36 kB`, `index-Ca2HegWg.js` `2,478.79 kB`, etc.).
- **SSR / Worker Bundle**: built in `2.38s` (`dist/server/index.js` `6.46 kB`, `router-CU9W0meD.js` `3,488.71 kB`, `vendor-tanstack-CMSf-POE.js` `1,052.81 kB`, etc.).

---

## 9. Any Unresolved Issues

1. **Interactive Browser & Authenticated Backend End-to-End Run Pending**: Because `vite dev` (`@cloudflare/vite-plugin`) cannot bind workerd sockets or write Wrangler user logs inside this sandbox and no FastAPI + TiDB instance was running on `http://127.0.0.1:8001`, interactive click-through in Chromium should be verified in a normal local dev session (`npm run dev` + `npm run dev:backend`) for:
   - Logged-in wishlist toggle persistence across Home ↔ Wishlist ↔ ProductDetails and network failure toast/reversion (`F-01`).
   - Browser Back/Forward category filter transitions across Home → `/browse?cat=...` → `/filters?cat=...` (`F-02`).
   - Clicking `Official Rental Receipt` and testing loading spinner, error retry, Close, and disabled print (`F-03`).
   - Visual spot-check of `Explore Rentals →`, `Next >`, and mobile Footer accordion chevrons (`F-04`).
   - Navigating to `/product/does-not-exist-check` to visually inspect `"Product not found"` vs HTTP 5xx `"Unable to load product"` and `/profile` error/save handling (`F-05`).
   - Verifying `/orders` empty state with cleared `localStorage` and clicking `"Payments History"` (`F-06`).
   - `Tab` + `Space` keyboard toggling and focus-visible rings on `/filters` Category & Condition checkboxes (`F-07`).
   - Authenticated `Profile` KYC status badge/PAN hydration across `NOT_STARTED`, `PENDING`, `APPROVED`, `REJECTED`, and failed request Retry (`F-08`).
2. **Pre-Existing Unrelated TypeScript Errors (`48` errors)**: Logged across 19 non-P0 files (`Admin`, `Checkout`, `Cart`, `BookingDetails`, `OTPVerification`, `api.ts(1914)`, etc.); left untouched to stay strictly scoped to P0 fixes.
3. **Pre-Existing Node Direct SSR Issue on Built `dist/server/index.js`**: Direct Node execution outside Cloudflare `workerd` fails at `CartProvider` (`No QueryClient set`) due to Vite `manualChunks` / SSR context separation (deferred outside Phase 1 P0 scope).
4. **Deferred `P1` – `P3` Audit Findings**: All non-P0 design-system, copywriting, typography, icon-size, motion, and responsive polish items (`F-09` – `F-40`) remain scheduled for subsequent phases.

---

## 10. Any Backend Changes

- **Zero backend files were modified.**
- **Verified Existing Backend Contracts**:
  - [`backend/main.py`](../backend/main.py#L2801-L2812) `GET /api/kyc/status` returns `{ "success": true, **status_info }` with top-level `status`, `documentType`, `maskedNumber`, `submittedAt`, `verifiedAt`, `rejectionReason`, `providerStatus`, `allowResubmission` — frontend [`kyc.ts`](src/utils/kyc.ts) and [`Profile.tsx`](src/pages/Profile.tsx) were aligned directly to this payload shape.
  - [`backend/main.py`](../backend/main.py#L14664-L14690) `POST /api/search` and [`backend/search_ml.py`](../backend/search_ml.py#L215-L234) compare `p.get("category") != category` strictly; therefore [`Categories.tsx`](src/pages/Categories.tsx) queries `searchWithML(..., undefined, 50)` and evaluates parent/subcategory taxonomy aliases via `matchesProductCategory`.
