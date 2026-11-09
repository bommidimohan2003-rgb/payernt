# paYent Marketplace — Phase 2 Implementation Plan (P1 Resolution & Runtime Reliability)

> **Phase**: Phase 2 — P1 Defect Resolution (`F-09` – `F-22`) & Runtime Reliability (`Obs A` – `Obs D`)  
> **Project Roots**: `c:\payernt-main\payernt-main\frontend` | `c:\payernt-main\payernt-main\backend`  
> **Architecture**: React 19, Vite v8.3.2, TanStack Start, Tailwind CSS v4 (Cloudflare Workers) + Python FastAPI (Railway) + TiDB Cloud Serverless MySQL  
> **Status**: **Planning Gate Complete — Zero Code Edited Prior to Plan Creation**  
> **References**: [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md) | [`P0_FIX_REPORT.md`](./P0_FIX_REPORT.md) | [`P0_RUNTIME_VERIFICATION_REPORT.md`](./P0_RUNTIME_VERIFICATION_REPORT.md)

---

## 1. Objective & Strict Safeguards

This plan governs Phase 2 remediation across frontend and backend before any production file is altered.

### Primary Scope
1. **Resolve all 14 P1 findings (`F-09` – `F-22`)** verified in [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md), including getting `tsc --noEmit` to exit cleanly with code `0` (`F-17`).
2. **Independently classify and resolve all 4 runtime observations (`Obs A` – `Obs D`)** documented in [`P0_RUNTIME_VERIFICATION_REPORT.md`](./P0_RUNTIME_VERIFICATION_REPORT.md) Section 4.
3. **Preserve 100% of verified P0 fixes (`F-01` – `F-08`)** and every assertion in [`tests/p0-fixes.test.ts`](./tests/p0-fixes.test.ts) (`18/18` passing).
4. **Preserve the approved paYent Hero brand composition** (`"Rent Anything / You Need"`, `"Get What You Need, Without Owning It."`, single `"Explore Rentals"` CTA, 2-column layout across mobile/tablet/desktop, studio laptop/headphones/camera imagery, monochrome Light/Dark polarity).
5. **Preserve anti-fabrication guarantees**: zero fake trending search defaults, zero mock bookings/PANs/products/owners, zero global SSR bypasses, and zero `suppressHydrationWarning` masking.

---

## 2. Independent Investigation & Severity Classification of Runtime Observations (`Obs A` – `Obs D`)

### Obs A — `GET /api/search/stats` Returns HTTP 500 When Opening `SearchOverlay`
- **Assigned Severity**: **P1 — High (Backend Runtime Crash & Frontend/Backend API Contract Mismatch)**  
  *(Promoted to P1 rather than P2/P3 because it causes a live HTTP 500 error in browser network/console telemetry on every `SearchOverlay` open across the app.)*
- **Verified Root Cause**:
  1. `backend/main.py:14705` accesses `ml_search_engine.total_documents`, whereas `MLSearchEngine` in `backend/search_ml.py:40-48` only defines `self.products`, `self.doc_vectors`, `self.idf`, `self.vocabulary`, `self.category_products`, and `self.is_indexed`. Accessing `.total_documents` raises `AttributeError: 'MLSearchEngine' object has no attribute 'total_documents'` -> `HTTP 500`.
  2. Contract mismatch: `backend/main.py:14703-14707` returns `{"success": True, "total_indexed": ..., "popular_queries": ...}` while `frontend/src/utils/smartSearch.ts:151-159` expects `is_indexed`, `indexed_products_count`, `vocabulary_size`, `popular_queries`.
  3. Defensive DB hardening: `backend/database.py:5481-5509` (`get_popular_search_queries`) opens `with conn.cursor() as cur:` without an `if conn:` check (though guarded by `try/except`), risking unnecessary exception noise when the connection pool is unavailable.
  4. Fake frontend fallback masking: `frontend/src/utils/api.ts:2482-2493`, `frontend/src/utils/smartSearch.ts:165-176`, and `frontend/src/components/search/SearchOverlay.tsx:33-39` substitute hardcoded query chips (`"Laptops"`, `"Sony Alpha"`, `"Royal Enfield"`, etc.) whenever stats fail or return empty.
- **Technical Fix**:
  - `backend/search_ml.py`: Add `@property def total_documents(self) -> int: return len(self.products)` on `MLSearchEngine`.
  - `backend/main.py` (`GET /api/search/stats`): Ensure lazy index rebuild via `get_recommendation_catalog()` when unindexed and return `{ "success": True, "is_indexed": ml_search_engine.is_indexed, "total_indexed": len(ml_search_engine.products), "indexed_products_count": len(ml_search_engine.products), "vocabulary_size": len(ml_search_engine.vocabulary), "popular_queries": popular }` (returning genuine DB events or `[]`).
  - `backend/database.py`: Guard `if not conn: return []` in `get_popular_search_queries` (and `record_search_event` if needed).
  - `frontend/src/utils/api.ts`, `smartSearch.ts`, `SearchOverlay.tsx`: Remove fabricated default `popular_queries` arrays; initialize `popularSearches` to `[]` and render genuine backend queries when non-empty.
- **Verification**:
  - `pytest` FastAPI `TestClient` suite (`backend/tests/test_search_stats_phase2.py`) verifying HTTP 200, exact payload keys, unindexed->indexed recovery, empty DB returning `[]`, and recorded-query aggregation.
  - Playwright Chromium live check opening `SearchOverlay` on `/` or `/payent` confirming `GET /api/search/stats` returns `HTTP 200` with zero HTTP 500 errors.

### Obs B — React 19 SSR/CSR Hydration Mismatches on Direct Navigation to `/browse`, `/filters`, `/product/$id`
- **Assigned Severity**: **P1 — High (SSR/CSR Hydration Reliability Defect)**  
  *(Confirmed P1: Causes active React 19 hydration errors/warnings and UI node/text flashes (`11` vs `16`, `3` vs `4/7/14`, `<div>` vs `<JsonLd>` `<script>`) whenever returning users open or reload deep links.)*
- **Verified Root Cause**:
  1. `frontend/src/pages/Categories.tsx:158-169` reads `storage.get("payent_server_products", [])` (and calls `storage.set(...)`) + reads `payent_live_categories` synchronously inside initial `useState` initializers. SSR sees `typeof window === "undefined"` -> `INITIAL_FALLBACK_PRODUCTS` (`11` items), whereas CSR finds cached server items (`16+`).
  2. `frontend/src/pages/Filters.tsx:124-128` reads `storage.get("payent_server_products", [])` synchronously in `useState` initializer (`3` vs `4/7/14` facet counts). Line `104` also computes `new Date().toISOString().split("T")[0]` during render.
  3. `frontend/src/pages/ProductDetails.tsx:170-181` calls `api.getCachedProduct(id)` synchronously inside `useMemo` to initialize `product` and `productLoading`. For server-created products not in `INITIAL_FALLBACK_PRODUCTS`, SSR renders a loading skeleton `<div>` (`1372-1388`), while CSR immediately renders `<JsonLd>` (`<script>`) + full gallery HTML (`1444+`), triggering a React 19 tag mismatch. Additionally, `existingProductBookings` (`417-425`) and `relatedProductsList` (`1344`) read `localStorage` synchronously during render/memoization.
- **Technical Fix (Zero `suppressHydrationWarning`, Zero SSR Disablement)**:
  - Ensure SSR and initial CSR render pass compute **strictly identical deterministic initial state**:
    - `Categories.tsx`: Initialize `allProductsList` to `INITIAL_FALLBACK_PRODUCTS` and `liveCategories` to `[]` (no `storage.get`/`storage.set` in `useState` initializers). Move cache read (`storage.get("payent_server_products", [])`, `storage.get("payent_live_categories", [])`) into `useEffect` on mount immediately before/alongside live fetch.
    - `Filters.tsx`: Initialize `products` to `INITIAL_FALLBACK_PRODUCTS` (SSR-deterministic) and hydrate cached `payent_server_products` inside `useEffect` on mount. Defer `todayStr` `min` date attribute or initialize safely post-mount (`""` until mount -> ISO date in `useEffect`) so timezone skew never diverges between SSR and browser.
    - `ProductDetails.tsx`: Restrict `initialCachedProduct` synchronous lookup to deterministic `INITIAL_FALLBACK_PRODUCTS` only; hydrate `api.getCachedProduct(id)` + `storage.get(STORAGE_KEYS.orders, [])` + cached `payent_server_products` (for `relatedProductsList`) inside `useEffect` immediately on mount so first client paint matches SSR skeleton before instant post-mount hydration. Check date initialization (`todayStr`/`tomorrowStr`) for SSR/CSR parity.
    - Audit companion components (`Wishlist.tsx`, `Profile.tsx`, `ExploreRentals.tsx`, `FeaturedProducts.tsx`) and eliminate any synchronous `localStorage` reads in initial render.
- **Verification**:
  - `node --test`: Automated React 19 `renderToString` SSR vs CSR initial-tree parity check with seeded `window.localStorage["payent_server_products"]` across `/browse`, `/filters`, and `/product/$id`.
  - Live Playwright Chromium: Populate `localStorage["payent_server_products"]`, hard-navigate (`page.goto` & `page.reload()`) directly to `/browse`, `/filters`, and `/product/<id>` and assert `0` React hydration errors or mismatches in console/pageerror listeners.

### Obs C — `api.getOrders()` Swallows HTTP 500 With Empty Cache
- **Assigned Severity**: **P1 — High (Silent API Error Masking & Misleading Empty State)**  
  *(Confirmed P1: Returning `[]` on HTTP 500 tells customers who expect existing bookings that they have "No orders yet", bypassing explicit error + retry UI already built in `Orders.tsx`.)*
- **Verified Root Cause**:
  1. `frontend/src/utils/api.ts:1061-1132`: `getOrders` catches `!res.ok` (`1071-1073`) and outer network exceptions (`1125-1128`), returning `storage.get<Order[]>(STORAGE_KEYS.orders, [])` (`[]` when empty) instead of throwing.
  2. Verified all callers of `api.getOrders`:
     - `Orders.tsx:632-652`: Already wraps in `.catch()` setting `setErrorState(msg)` + `<ErrorState title="Unable to load orders" ... onRetry={loadOrders} />`.
     - `Dashboard.tsx:66`: Uses `Promise.allSettled([...])`.
     - `Support.tsx:576`: Uses `.catch(() => [])`.
     - `api.ts:3149`: Uses `Promise.allSettled([...])`.
     - `payrentApi.ts:408`: Returns safely or handles errors.
  3. Cache interaction note: `getOrders` sets `staleWhileRevalidate: true` at `1130`, and `getCachedOrFetch` (`184-189`) silently swallows background revalidation errors when a stale cache entry exists. Retry clicks and fresh visits with cold/invalidated cache must propagate HTTP 500 cleanly, and `Orders.tsx` Retry button should call `api.invalidateCache("user_orders")` before calling `loadOrders()`.
- **Technical Fix**:
  - `frontend/src/utils/api.ts`: Throw descriptive `new Error(parseApiError(errData, "Failed to load rental bookings"))` when `!res.ok` or when fetch/network fails (do not silently fall back to `[]` inside `catch`). Clean up unused `try/catch` masking in `getOrders`.
  - `frontend/src/pages/Orders.tsx`: Keep P0 `stripLegacySampleOrders` + `"No orders yet"` when API genuinely returns `[]`; ensure `onRetry` invalidates `"user_orders"` and refetches cleanly; surface error UI cleanly when `getOrders` throws and cache is empty (or non-blocking stale-data error banner if local non-sample bookings exist).
- **Verification**:
  - Unit test in `phase2-p1-fixes.test.ts` verifying `api.getOrders()` rejects with server message on HTTP 500 with empty cache.
  - Playwright live test on `/orders` with empty cache and `/api/orders` returning `HTTP 500` asserting `"Unable to load orders"` + `"Retry"` UI renders (replacing the Phase 1.5 observation).

### Obs D — `Filters.tsx` Shared Sidebar Calls `renderSidebarFilters(true)` Generating `#mobile-filter-*` IDs on Desktop
- **Assigned Severity**: **P2 — Moderate (Semantic DOM Prefix Mismatch & Breakpoint Hygiene)**  
  *(Confirmed P2, NOT P1: Single `<aside>` prevented duplicate DOM IDs so `F-07` worked reliably, but desktop inputs carried `#mobile-filter-*` IDs and white notch cutouts onto `neutral-50` desktop backgrounds.)*
- **Verified Root Cause**: `Filters.tsx:1038-1092` uses one shared `<aside>` across breakpoints and invokes `renderSidebarFilters(true)` unconditionally at line `1079`.
- **Technical Fix**:
  - Split sidebar rendering in `Filters.tsx` cleanly into:
    - Desktop static sidebar (`hidden sm:flex sm:flex-col ...`) invoking `renderSidebarFilters(false)` -> `#desktop-filter-cat-*`, `#desktop-filter-cond-*`, neutral desktop notch cutouts (`bg-neutral-50 dark:bg-neutral-950`).
    - Mobile slide-over drawer (`sm:hidden fixed inset-y-0 ...` rendered only when `isMobileFilterOpen` or hidden cleanly outside active desktop DOM / unique prefixes `#mobile-filter-cat-*`, `#mobile-filter-cond-*`) invoking `renderSidebarFilters(true)`. Zero duplicate IDs anywhere in DOM!
  - Preserve **every `F-07` invariant** (native `<input type="checkbox" className="sr-only peer">`, `htmlFor={inputId}`, `peer-focus-visible:ring-2`, `aria-disabled={isOnlySelected}`, no `onClick` on `<label>`).

---

## 3. Remediation Plan for All 14 P1 Findings (`F-09` – `F-22`)

### F-09 — Global Monochrome Color & Dark Surface Alignment
- **Locations**: `frontend/src/styles.css`, `SearchBar.tsx`, `CallToAction.tsx`, `Newsletter.tsx`, `EmptyState.tsx`, `PermissionDenied.tsx`, `HelpChatbot.tsx`, `Filters.tsx`, `ProductDetails.tsx`, `Profile.tsx`, `Orders.tsx`, `Categories.tsx`, `ProductCard.tsx`, `Sidebar.tsx`.
- **Changes**:
  - Update `:root` and `.dark` tokens in `styles.css`: set `--primary` / `--ring` / `--payent-accent` / `--payent-accent-hover` to monochrome Light (`#0A0A0A` / `#FFFFFF` foreground) & Dark (`#FAFAFA` / `#0A0A0A` foreground) tokens; align dark `--background` / `--card` / `--secondary` / `--border` to Home's obsidian ramp (`#0A0A0A`, `#141414`, `#171717`, `#262626`) instead of conflicting `#1E1E1E` overrides (preserving readable dark input/modal contrast).
  - Replace cobalt `@utility btn-gradient` linear gradient & blue box-shadow in `styles.css` with solid high-contrast monochrome button styling, and replace `.btn-gradient` classes in `Profile.tsx`, `SearchBar.tsx`, `CallToAction.tsx`, `Newsletter.tsx`, `EmptyState.tsx`, `PermissionDenied.tsx` with clean monochrome button classes.
  - Neutralize `HelpChatbot.tsx` (`#16A36A` focus ring, green status dot, `animate-ping`), `Filters.tsx` (`text-amber-400`/`text-blue-400` icons, `#8FAF7E` accents), and decorative multi-hue icons across secondary pages while retaining accessible semantic status pills (`emerald`/`amber`/`red` with AA `>= 4.5:1` contrast) solely where communicating genuine availability, order, payment, KYC, or validation states.
  - Keep Zero `order: -1` CSS rules (`F-04`).

### F-10 — Mobile `grid-cols-3` Sub-11px Card Cramping
- **Locations**: `frontend/src/pages/Filters.tsx`, `frontend/src/pages/ProductDetails.tsx`.
- **Changes**:
  - `Filters.tsx`: Update results grid (`1189`) from `grid-cols-3` -> `grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5`. Increase card body padding (`p-2.5 sm:p-3.5`) and raise mobile card title, condition badge, price, and `/day` labels to `>= 12px` (`text-xs` / `text-sm`), making vendor name visible on mobile.
  - `ProductDetails.tsx`: Update `relatedPageSize` (`1330`) from `isMobile ? 3 : 4` -> `4`, update Related Products grid (`2412`) from `grid-cols-3` -> `grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`, remove `idx === 3 && "hidden sm:block"`, raise mobile card typography to `>= 12px`, and align links to `/product/$id`.

### F-11 — Mobile Hero Text & Touch-Target Squeeze
- **Location**: `frontend/src/components/home/Hero.tsx`.
- **Changes**:
  - **Preserve** 2-column grid layout across all breakpoints (`grid-cols-[minmax(0,48fr)_minmax(0,52fr)]`), exact heading (`"Rent Anything / You Need"`), caption (`"Get What You Need, Without Owning It."`), divider, single `"Explore Rentals"` CTA with trailing `ArrowRight`, and studio product imagery.
  - Enlarge `#hero-explore-rentals-cta` minimum touch height to `min-h-[44px]` on mobile (`px-3.5 py-2.5 sm:px-5 sm:py-2.5 md:px-6 md:py-3`), upgrade mobile caption font to `text-xs` without tight negative letter spacing on sub-16px text, and remove hover scale transforms from non-interactive product wrappers.

### F-12 — Floating `Navigation4` Footer Overlap & Sub-44px Mobile Dock Targets
- **Locations**: `frontend/src/layouts/MainLayout.tsx`, `frontend/src/components/navigation/Navigation4.tsx`.
- **Changes**:
  - `MainLayout.tsx`: Increase bottom padding from `md:pb-12` to `pb-28 md:pb-32` so fixed `Navigation4` (`bottom-6`) never occludes `Footer` links or copyright row.
  - `Navigation4.tsx`: Increase mobile `effectiveBaseItemSize` from `38` -> `44` (`>= 44×44px`), include concise visible mobile labels (`text-[10px]`) alongside/under icons so touch users are not dependent on hover tooltips, replace non-existent `py-0.2` with valid Tailwind spacing (`py-0.5`), soften spring magnification (`mass`/`stiffness`) toward calm ease-out `transition-colors`, verify total bar width fits within `360px` (`calc(100vw - 1rem)`), and remove unused imports/stale JSDoc (`CircleHelp`, `tCommon`).

### F-13 — Hero Typewriter `aria-live` Screen-Reader Flood
- **Location**: `frontend/src/components/home/Hero.tsx`.
- **Changes**:
  - Remove `aria-live="polite" aria-atomic="true"` from the typewriter container (`109-121`).
  - Render `<p className="sr-only">{HERO_CAPTION}</p>` once for assistive tech, and mark the animated visual `<p aria-hidden="true">` with a static non-pulsing caret (removing `animate-pulse`).

### F-14 — `SearchOverlay` Keystroke Full-Fetch Races, `window.alert()`, Escape/Focus Restoration & Fake Popular Searches
- **Locations**: `frontend/src/components/search/SearchOverlay.tsx`, `frontend/src/utils/api.ts`, `frontend/src/utils/smartSearch.ts`.
- **Changes**:
  - Cancel stale in-flight requests via `AbortController` + monotonically incremented request sequence ID (`searchSeqRef`). Search using server query parameters / `api.searchML` (`q`) with clean cached fallback rather than polling the entire unfiltered catalog on every keystroke; type fields safely against normalized `Product` (`title`, `price`, no un-typed `.name`).
  - Replace both `window.alert(...)` calls (`148, 161`) with inline accessible status error messaging + `toast.error`.
  - Initialize `popularSearches` to `[]` (removing hardcoded defaults in `SearchOverlay.tsx`, `api.ts:getPopularSearches`, `smartSearch.ts:getSearchStats`), hiding trending chips when empty.
  - Handle window `Escape` anywhere inside the open overlay, implement modal `Tab`/`Shift+Tab` focus trap, restore focus to the triggering button (`previousFocusRef`) on close, add `aria-label="Clear search"` on clear `<button>`, keep `?cat=` URL parameter parity (`F-02`), and shorten verbose placeholder to `"Search rentals"`.

### F-15 — Storefront Card & Route Split (`RentalProductCard` vs `ProductCard`)
- **Locations**: `frontend/src/pages/Categories.tsx`, `frontend/src/pages/Wishlist.tsx`, `frontend/src/components/product/RentalProductCard.tsx`.
- **Changes**:
  - Switch `Categories.tsx` (`/browse`, `/categories`, `/payent/explore`) and `Wishlist.tsx` (`/wishlist`, `/payent/wishlist`) from dark full-bleed `ProductCard` (`/payent/products/$id`) to Home's consistent monochrome `<RentalProductCard />` (`/product/$id`) with unified `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` grids (keeping `/payent/products/$id` route active).
  - Polish `RentalProductCard.tsx` (`tabular-nums`, enlarge mobile wishlist button hit area to `h-11 w-11 sm:h-9 sm:w-9` with crisp visual button size, remove `animate-pulse` & `hover:-translate-y-1`) while strictly preserving every `F-01` wishlist invariant (`const productId = String(product.id);`, `has(productId)`, `await toggle(productId)`, `aria-pressed={isWishlisted}`, `if (!succeeded)`).

### F-16 — `ProductDetails` Gallery-Baked `<h1>`, Red `"T&C will apply"`, Spring SVG & Route Hardcode
- **Location**: `frontend/src/pages/ProductDetails.tsx`.
- **Changes**:
  - Move `<h1>` (`1559`) off the image dark-gradient overlay onto the clean monochrome header above/beside the gallery so title/category/brand remain readable even when `"10s Video"` is active.
  - Restyle `"T&C will apply"` button (`2082-2098`, `2337-2353`) in crisp high-contrast monochrome underlined text instead of error red, and replace multi-stage spring SVG overshoot paths (`2002-2080`, `2252-2333`) with a crisp monochrome checkbox/checkmark visual while preserving `role="checkbox"`, `aria-checked={termsAccepted}`, `"T&C will apply"` modal trigger, and `BOOK NOW` gating.
  - Remove `animate-pulse` availability dot and `bg-primary/5 blur-3xl` glow; add `role="dialog" aria-modal="true" aria-labelledby` on fullscreen Lightbox and verify Terms modal `Escape` handling; add descriptive `alt` text / `aria-label` on photo thumbnails; change Related Products links (`2416`) to `/product/$id`.
  - Preserve **every `F-05` invariant** (`productError`, `Unable to load product`, no fake `"Sony Alpha a7 III"`/`"Sai Teja"`/`"Arun Kumar"`/fallback review counts).

### F-17 — Strict TypeScript Compilation (`tsc --noEmit` -> Exit 0)
- **Locations (all 19 current failing files from baseline `tsc --noEmit`)**:
  1. `src/utils/api.ts:1914`: Merge/remove duplicate `rejectOrder` definition cleanly.
  2. `src/components/common/SectionBox.tsx:4`: Extend `Omit<HTMLAttributes<HTMLDivElement>, "title">` so custom `ReactNode` `title` compiles cleanly.
  3. `src/admin/pages/KycApplicationDetails.tsx`: Stringify search params cleanly before `URLSearchParams`; remove/type `name` prop passed to `ProfilePhoto` (`ProfilePhotoProps`).
  4. `src/admin/pages/KycVerification.tsx`: Fix `ProfilePhoto` prop (`name` -> supported alt/fallback prop or extend `ProfilePhotoProps` cleanly) & `StatsCard` `onClick` optional prop (`StatsCardProps` + interactive wrapping).
  5. `src/components/auth/OTPVerification.tsx`: Fix missing `setDigits` state setter & `null` -> `undefined` aria/attr prop.
  6. `src/components/booking/RenterBookingCalendar.tsx`: Declare optional `isPrepBlocked?: boolean` in day cell interface.
  7. `src/components/cart/CartDrawer.tsx` & `src/pages/Cart.tsx`: Pass complete typed `/checkout` search params (`start`, `end`, `slot`, `mode`) on navigation.
  8. `src/components/common/PhotoDetailViewer.tsx:108`: Resolve undefined `photos` variable reference (use actual `images`/`gallery` prop).
  9. `src/components/payernt-home/HeroHeader.tsx`: Use `user.fullName` / optional fallback safely instead of missing `user.name`.
  10. `src/pages/BecomeLender.tsx:398`: Resolve missing `setPhotos` setter reference cleanly.
  11. `src/pages/BookingDetails.tsx:690,704`: Import missing `Package` from `lucide-react` & pass valid `ImageSizeTier` (`"card"`/`number`) to `getOptimizedImageUrl`.
  12. `src/pages/Checkout.tsx`: Narrow `product` null-checks safely (`if (!product) return` / optional chaining) and cast `User | null` via `unknown` safely (`user as unknown as Record<string, unknown>`).
  13. `src/pages/Messages.tsx:894`: Use supported avatar/photo field safely or extend participant interface cleanly.
  14. `src/pages/PayrentKycPage.tsx:508` & `src/payernt/components/PayerntKycPage.tsx:530`: Remove invalid native `<input onCancel={...}>` React prop or handle via safe ref/effect pattern.
  15. `src/pages/Support.tsx:1391`: Import `LifeBuoy` from `lucide-react`.
  16. `src/payernt/components/LenderProductEdit.tsx:341,351`: Supply required defaults for `ProductCondition.scratches` and `ProductLocation.pickupAvailable` to match interface contracts.
  17. `src/payernt/components/MyProducts.tsx:343,346`: Extend `PayerntProduct` type with optional `rating?: number` or narrow cleanly.

### F-18 — Double Preloading Delay, Route Consistency & Mobile Navbar Autohide
- **Locations**: `frontend/src/components/common/AppPreloader.tsx`, `frontend/src/pages/Home.tsx`, `frontend/src/components/layout/Navbar.tsx`.
- **Changes**:
  - Eliminate `Home.tsx` redundant `200ms` `animate-pulse` splash overlay (`45-73`); streamline `AppPreloader.tsx` initial entry delay on non-curtain routes / short transition while respecting `prefers-reduced-motion` and session skip.
  - `Navbar.tsx`: Remove mobile autohide (`-translate-y-full`) so search, theme toggle, and login remain accessible while scrolling; enlarge mobile Search button (`#nav-mobile-search-btn`) and mobile Theme toggle from `h-9 w-9` (`36px`) to `h-11 w-11` (`44px`); shorten placeholder `"Search gear, vehicles, electronics..."` -> `"Search rentals"`; standardize Home logo `<Link to="/payent">` consistent with footer/dock while keeping `/payant` route alias intact.

### F-19 — Categories (`/browse`) Missing `<h1>`, Label-Free Category Circles & Small Header Hitboxes
- **Location**: `frontend/src/pages/Categories.tsx`.
- **Changes**:
  - Upgrade results section title `<h2>` (`788`) -> `<h1>` (one clear landmark `<h1>` per browse page).
  - Add concise visible category label text (`text-xs font-medium`) beneath each category circle button (`747-777`) so touch users don't rely on hover tooltips.
  - Enlarge Notification/Wishlist/Messages links (`589-630`) to `min-h-[44px] min-w-[44px]`; keep Filters button label readable across viewports; add `aria-label` on search clear (`534`), detect-location (`572`), and every active filter chip remove `<button>` (`650-725`); unify grid (`grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) with `<RentalProductCard />` (`F-15`) and replace `#1E1E1E` dark override classes with `#0A0A0A`/`#141414` monochrome tokens.
  - Preserve **F-02** `?cat=` / `?category=` param normalization & browser history.

### F-20 — Filters Page Duplicate Theme Pill Collision, Dock Clearance, ASCII `<` & ID Prefix
- **Location**: `frontend/src/pages/Filters.tsx`.
- **Changes**:
  - Remove the fixed bottom-right `Theme` button (`1283-1302`) that collides with `HelpChatbot` / `Navigation4`, and place a monochrome Theme toggle button cleanly inside the sticky top header (`>= 44×44px` on mobile).
  - Add `pb-28 md:pb-32` clearance to `<main>` (`1098`) for `Navigation4`.
  - Replace literal `&lt;` (`1055, 1139`) with Lucide `<X>` and `<SlidersHorizontal>` (`aria-hidden="true"`).
  - Unify reset copy (`"Reset"` -> `"Clear all"`), fix heading levels (`<h4>` -> `<h2>`/`<h3>` under `<h1>`), remove `py-0.2` / `emerald-500/20` / `#1E1E1E` tokens, close mobile drawer on `Escape`, add `aria-label="Clear search"`, and apply **Obs D** (`#desktop-filter-*` vs `#mobile-filter-*`) with **F-07** intact.

### F-21 — Profile Heavy Gradient/Slop Styling & Unlabeled Form Controls
- **Locations**: `frontend/src/pages/Profile.tsx`, `frontend/src/components/layout/Sidebar.tsx`.
- **Changes**:
  - Remove `.btn-gradient` cobalt buttons (`493, 542, 1257`) -> monochrome `<Button>`; remove `<Sparkles>` `"Verified Account"` badge (`480-483`); replace `bg-primary` tabs (`708-760`) with monochrome tabs (`bg-neutral-950 text-white dark:bg-white dark:text-neutral-950`); remove multi-hue decorative icons (`text-purple-500`, `text-primary`, non-status `text-emerald-500`), `hover:scale-102`, and negative `-mt-16` banner occlusion.
  - Bind Creator Bio `<textarea>` via `htmlFor="profile-bio-input"` / `id="profile-bio-input"` (`795-813`) and PAN `<Input>` via `htmlFor="profile-pan-input"` / `id="profile-pan-input"` (`945-985`).
  - Clean `Sidebar.tsx`: remove `animate-pulse` dot (`55`), emerald `"100% SAFE"` box (`137-148`), `.card-premium` on non-clickable wrappers, and `uppercase tracking-wider` labels.
  - Preserve **every P0 `F-05` / `F-08` check** (`if (!ready && !user)`, `statsError`, `toast.error(msg)`, `parseKycStatusResponse`, `kycLoading`, `kycError`, `payent_kyc_updated`, zero `"XXXXX1234F"`).

### F-22 — Orders Multi-Hue KPI Noise, `animate-ping`, Contrast & Modal Accessibility
- **Location**: `frontend/src/pages/Orders.tsx`.
- **Changes**:
  - Restrain Orders KPI cards & filter tabs to crisp monochrome surfaces/borders (`#0A0A0A`/`#141414` dark, `white`/`neutral-50` light), reserving semantic colors strictly for order/payment status badges with verified Light/Dark AA contrast (`>= 4.5:1`).
  - Remove `animate-ping` dots (`369, 966, 1283`) and non-existent `py-0.2` classes (`355, 905, 1055, 1243, 1474, 1479, 1513`).
  - Replace low-contrast `text-neutral-400`/`500` captions (especially in KPI sub-labels & Receipt Modal details `2360-2388`) with AA-compliant `text-neutral-600 dark:text-neutral-400`.
  - Replace literal `✕` close button (`2326`) with Lucide `<X className="h-4 w-4" aria-hidden="true" />` + `aria-label="Close receipt modal"`.
  - Add `role="dialog" aria-modal="true" aria-labelledby` + `Escape` key handler on Cancellation (`1915`), Location (`2160`), and Receipt (`2310`) modals, and bind form inputs via explicit `htmlFor`/`id` in the Location modal (`2242-2279`).
  - Preserve **every P0 `F-03` / `F-06` check** (`Loader2`, `receiptError`, `handleCloseReceipt`, `disabled={receiptLoading || Boolean(receiptError) || !receiptData}`, `stripLegacySampleOrders`, `ord_1793113916585`, `navigate({ to: "/payments", search: { q: "", status: "all" } })`).

---

## 4. Preservation Matrix (Must Remain Intact)

| Invariant / Requirement | Protected File(s) & Patterns |
| :--- | :--- |
| **F-01** Wishlist String ID Sync & Rollback | `RentalProductCard.tsx` (`const productId = String(product.id);`, `has(productId)`, `await toggle(productId)`, `aria-pressed`, `if (!succeeded)`); `Wishlist.tsx` (`ids.includes(String(p.id))`) |
| **F-02** `?cat=` URL Normalization | `SearchOverlay.tsx` & `home/Categories.tsx` (`search: { cat:`, zero `search: { category:`); `Filters.tsx` (`normalizeCategoryParam`, `matchesProductCategory`) |
| **F-03** Receipt Modal Spinner, Retry & Race Guard | `Orders.tsx` (`import { Loader2 }`, `receiptError`, `handleCloseReceipt`, `disabled={receiptLoading || Boolean(receiptError) || !receiptData}`, zero fake `REC-` template) |
| **F-04** CSS Icon Order (`rightIcon` Right) | `styles.css` (zero `order: -1`), `Button.tsx` (`rightIcon ? rightIcon : null`) |
| **F-05** No Fake Data Fallbacks | `ProductDetails.tsx` (`productError`, `Unable to load product`, zero `"Sony Alpha"`, `"Sai Teja"`, `"Arun Kumar"`, `|| 124`, `|| 84`), `Profile.tsx` (zero `"XXXXX1234F"`) |
| **F-06** No Mock Cancelled Orders + `/payments` Search | `Orders.tsx` (`stripLegacySampleOrders`, `ord_1793113916585`, `navigate({ to: "/payments", search: { q: "", status: "all" } })`, zero `DEFAULT_SAMPLE_ORDERS`) |
| **F-07** Accessible Filter Checkboxes | `Filters.tsx` (native `<input type="checkbox"`, `htmlFor={inputId}`, `peer-focus-visible:ring-2`, `aria-disabled={isOnlySelected}`, zero `<label onClick`) |
| **F-08** KYC Response Parsing | `Profile.tsx` (`if (!ready && !user)`, `parseKycStatusResponse`, `kycLoading`, `kycError`, `payent_kyc_updated`, zero `res.data` or `user?.kycStatus`) |
| **Approved Hero Composition** | `Hero.tsx` (`"Rent Anything"`, `"You Need"`, `"Get What You Need, Without Owning It."`, `"Explore Rentals"`, 2-column layout across breakpoints, studio imagery) |

---

## 5. Implementation Order & Verification Protocol

### Execution Sequence
1. **Backend (`Obs A`)**: Patch `backend/search_ml.py`, `backend/main.py`, `backend/database.py`; create & run `backend/tests/test_search_stats_phase2.py` + `backend/tests/test_security.py`.
2. **Core Frontend Infrastructure (`Obs B`, `Obs C`, `F-09`, `F-11`, `F-12`, `F-13`, `F-14`, `F-17`, `F-18`)**: Patch `api.ts`, `smartSearch.ts`, `SectionBox.tsx`, `styles.css`, `.btn-gradient` component callers, `HelpChatbot.tsx`, `MainLayout.tsx`, `Navigation4.tsx`, `Navbar.tsx`, `AppPreloader.tsx`, `Home.tsx`, `Hero.tsx`, `Footer.tsx`, `SearchOverlay.tsx`.
3. **Secondary Pages (`Obs B`, `Obs D`, `F-10`, `F-15`, `F-16`, `F-19`, `F-20`, `F-21`, `F-22`)**: Patch `RentalProductCard.tsx`, `Wishlist.tsx`, `Categories.tsx`, `Filters.tsx`, `ProductDetails.tsx`, `Sidebar.tsx`, `Profile.tsx`, `Orders.tsx`.
4. **TypeScript Sweep (`F-17`)**: Resolve remaining compile errors across the remaining admin/auth/booking/cart/checkout/lender/kyc/support files until `tsc --noEmit` exits `0`.
5. **Automated Test Suite (`node --test` + `pytest` + `tsc` + `vite build`)**:
   - Create `frontend/tests/phase2-p1-fixes.test.ts` testing React 19 `renderToString` SSR vs CSR hydration parity under populated `localStorage`, `api.getOrders()` `500` throwing, desktop vs mobile `#desktop-filter-*` / `#mobile-filter-*` separation, Hero non-live caption + `sr-only`, `SearchOverlay` accessibility + no fake queries, and `/api/search/stats` schema.
   - Re-run `frontend/tests/p0-fixes.test.ts` (`18/18` PASS), `frontend/tests/phase2-p1-fixes.test.ts`, `pytest`, `tsc --noEmit` (`Exit 0`), and `npm run build` (`Exit 0`).
6. **Live Chromium Playwright Runtime Verification (`1280×800` Desktop & `375×812` Mobile, Light & Dark)**:
   - Verify all 4 observations (`Obs A`–`D`), all 14 P1 fixes (`F-09`–`F-22`), and full P0 regression gate (`F-01`–`F-08`) with zero uncaught page/hydration errors and zero live TiDB mutations.
7. **Final Documentation**: Publish [`PHASE_2_IMPLEMENTATION_REPORT.md`](./PHASE_2_IMPLEMENTATION_REPORT.md) and [`PHASE_2_RUNTIME_VERIFICATION_REPORT.md`](./PHASE_2_RUNTIME_VERIFICATION_REPORT.md).
