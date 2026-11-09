# paYent Marketplace — Phase 4 Live Runtime Verification Report (`F-35` – `F-40`, Compact Card Redesign & Full Regression)

> **Phase**: Phase 4 — Final P3 Cleanup & Compact Product Card Live Chromium Audit  
> **Date**: 2026-11-09  
> **Frontend Root**: `c:\payernt-main\payernt-main\frontend`  
> **Backend Root**: `c:\payernt-main\payernt-main\backend`  
> **Artifact Directory**: `C:\Users\LENOVO\.gemini\antigravity\brain\698f942f-0cda-4a44-9051-168629245c77`  
> **Reference Reports**: [`PHASE_4_IMPLEMENTATION_REPORT.md`](./PHASE_4_IMPLEMENTATION_REPORT.md) | [`PHASE_3_RUNTIME_VERIFICATION_REPORT.md`](./PHASE_3_RUNTIME_VERIFICATION_REPORT.md) | [`UNSLOP_AUDIT_REPORT.md`](./UNSLOP_AUDIT_REPORT.md)

---

## 1. Environment & Production Data Safety Boundary

| Layer | Runtime Target | Isolation / Cleanup |
| :--- | :--- | :--- |
| **Frontend Dev Server** | Vite + TanStack Start (`http://127.0.0.1:5173`) | Started for live MCP Playwright verification and terminated cleanly afterward (`manage_task list` confirmed no active background dev server). |
| **Backend API Server** | Python FastAPI (`http://127.0.0.1:8001`) + TiDB Cloud Serverless MySQL | Verified live `GET /api/products?page=1&limit=8` (`X-Total-Count: 5`), `/browse` (`16` public catalog items), `/filters`, `/product/prod-1792996506773`, and `/payent`. |
| **Browser Engine** | Playwright Chromium | Exercised real DOM geometry, image cascade sizing, CSS theme variables (Light & Dark), keyboard/click interactions, `localStorage`, and route transitions across all `6` viewports (`320×740`, `375×812`, `768×1024`, `1024×768`, `1280×800`, `1440×900`). `.playwright-mcp` working folder removed after archiving deliverables. |

### Data Safety Compliance
Zero live TiDB Cloud database records or user accounts were modified. Edge-case stress data (`10`-item multi-page dataset, `120`-character product title, ultra-long location string, missing `""` image, broken URL `http://127.0.0.1:9/nonexistent.jpg`), authenticated wishlist toggle + HTTP `500` rollback, `RecentlyViewed` single-fetch verification, and `/orders` HTTP `500` error exposure were tested exclusively via ephemeral Playwright `page.route` interception and cleared before closing Chromium.

---

## 2. Final Automated Verification Gates (Post-Final-Edit)

| Gate | Command | Result | Empirical Output |
| :--- | :--- | :---: | :--- |
| **TypeScript (`tsc`)** | `node c:\payernt-main\payernt-main\node_modules\typescript\bin\tsc --project c:\payernt-main\payernt-main\frontend\tsconfig.json --noEmit` | **PASS (`Exit 0`)** | `0` errors across all source and test files. |
| **Node Regression, SSR/CSR & Phase 4 Suite** | `node --experimental-strip-types --test "...\p0-fixes.test.ts" "...\phase2-p1-fixes.test.ts" "...\phase3-p2-fixes.test.ts" "...\phase4-p3-card.test.ts"` | **PASS (`Exit 0`)** | **`52 / 52` passed**, `17` suites, `0` failed, `0` skipped (`5213.38 ms`). |
| **Backend Pytest** | `python -m pytest -vv -o pythonpath=c:/payernt-main/payernt-main/backend "...\test_search_stats_phase2.py" "...\test_security.py" "...\test_products_pagination.py"` | **PASS (`Exit 0`)** | **`13 passed`** in `3.55s`. |
| **Production Vite Build** | `npm --prefix c:\payernt-main\payernt-main\frontend run build` | **PASS (`Exit 0`)** | `vite v8.3.2`: client (`5491` modules, `2.29s`) + SSR worker (`1.98s`). |

---

## 3. Compact Card Before vs After Comparison

### 3.1 Measured Desktop & Mobile Transformation (`/payent` `#explore-rentals` & `/browse`)

| Surface & Viewport | Metric | Before (`aspect-[3/4]`, 4 cols) | Final (`aspect-[3/2]` `compact`, 4 cols) | Delta / Verification |
| :--- | :--- | :---: | :---: | :--- |
| **`/payent` Desktop (`1280×800`)** | Columns / Image Ratio | `4 cols` / `0.750` (`3:4`) | **`4 cols` / `1.500` (`3:2`)** | +`62px` wider vs `5`-col (`230px -> 292px`) |
| **`/payent` Desktop (`1280×800`)** | Card Box (`W × H`) | `289 × 487 px` *(5-col pass: `230 × 394`)* | **`292 × 276 px`** | **`-43.3%` height vs baseline (`-29.9%` vs `394px`)** |
| **`/payent` Desktop (`1280×800`)** | Image Box / Image (`W × H`) | `288 × 384 px`, letterboxed `288 × 214` | **`291 × 194 px`, fills `291 × 194 px`** | Full-bleed `object-cover` fixed via `@layer base` |
| **`/payent` Desktop (`1280×800`)** | Wishlist Button Hitbox | `36 × 36 px` | **`44 × 44 px`** | WCAG 2.1 AA touch/pointer target satisfied |
| **`/payent` Mobile (`375×812`)** | Card Box (`W × H`, `2` cols) | `166 × 338 px` *(4:5 pass: `167 × 306`)* | **`168 × 191 px`** | **`-43.5%` height (`+2px` W, `111px` img)** |
| **`/browse` Desktop (`1280×800`)** | Columns / Card Box | `4 cols` / `286 × 483 px` | **`4 cols` / `292 × 276 px`** | **`-42.9%` height**, `291 × 194 px` image |
| **`/product/$id` Related (`default`)** | Card Box / Image Ratio | `aspect-[3/4]` (`~487px` H) | **`289 × 309 px` (`4:3` `1.333`)** | `-178px` shorter; `"Daily Rental"` preserved |

### 3.2 Complete Multi-Viewport Matrix (`Final`, Light Verified + Mobile 320 Stress)

| Viewport | Route | Overflow (`scrollW > innerW`) | Cols | Card (`W×H`) | Photo Overlay (`Gradient`) | Heart Hitbox | Row Heights Equal | Overlap (`Price/Loc`, `Heart/Title`, `NoPhoto`) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`320×740`** | `/payent` | `false` (`320 / 320`) | `2` | `140 × 112` | `true` (`fill: true`) | `44 × 44` | `true` | **`false` (all 0 overlaps, incl. 2-line stress & No photo)** |
| **`375×812`** | `/payent` | `false` (`375 / 375`) | `2` | `168 × 134` | `true` (`fill: true`) | `44 × 44` | `true` | `false` (`0` overlaps) |
| **`768×1024`** | `/payent` | `false` (`768 / 768`) | `3` | `231 × 154` | `true` (`fill: true`) | `44 × 44` | `true` | `false` (`0` overlaps) |
| **`1024×768`** | `/payent` | `false` (`1024 / 1024`) | `4` | `228 × 152` | `true` (`fill: true`) | `44 × 44` | `true` | `false` (`0` overlaps) |
| **`1280×800`** | `/payent` | `false` (`1280 / 1280`) | `4` | `292 × 195` | `true` (`fill: true`) | `44 × 44` | `true` | `false` (`0` overlaps) |
| **`1440×900`** | `/payent` | `false` (`1440 / 1440`) | `4` | `292 × 195` | `true` (`fill: true`) | `44 × 44` | `true` | `false` (`0` overlaps) |
| **`1280×800`** | `/browse` | `false` | `4` | `292 × 195` | `true` (`fill: true`) | `44 × 44` | `true` | `false` (`0` overlaps) |
| **`1280×800`** | `/product/sony-alpha-a7-iii` *(Related)* | `false` | `4` | `289 × 217` | `true` (`4:3`) | `44 × 44` | `true` | `hasDailyRental: true` |

### 3.3 Compact Height Summary: `HowItWorks`, `WhyChoose` & `Footer`

| Section | Desktop `1280×800` | Mobile `375×812` | Structural Verification |
| :--- | :---: | :---: | :--- |
| **`How paYent Works`** | **`154 px`** | **`262 px`** | 3 horizontal compact cards (`Step 01` – `Step 03`), zero line overlap |
| **`Why Choose paYent`** | **`215 px`** | **`394 px`** | Inline icon + heading across all `8` symmetric `<h3>` benefit cards, no mid-sentence ellipses |
| **`Footer`** | **`224 px`** | **`384 px`** | Single 6-column horizontal row (`lg:grid-cols-6`); mobile accordion interactive & verified |

- **Dark Mode (`1280×800`, `html.dark`)**: Body background `rgb(10, 10, 10)`, card surface `oklab(0.205 0 0 / 0.9)`, title color `rgb(255, 255, 255)` — crisp contrast with zero washed-out labels.
- **No `"Daily Rental"` in Compact Surfaces**: `hasDailyRentalInExplore: false` across all 6 viewports (`₹{price}/day` with `tabular-nums` verified).
- **Home Static Skeletons**: `animatePulseInHomeCount: 0` across all viewports.

---

## 4. Functional, Edge-Case & Full-Regression Live Matrix

| Check / Flow | Route / Condition | Empirical Result | Status |
| :--- | :--- | :--- | :---: |
| **F-40 Gateway Cleanup** | `/` (`1280×800` & `375×812`) | `hasFeTurbulence: false`, `hasCinematicNoise: false`, `hasOrigin: false`, `hasGatewayTelemetry: false`; preserved `paYent`, `paye₹nt`, `pay₹ent`, and `overflow: false` on desktop & mobile. | **PASS** |
| **Edge Case: Long Title & Location + Broken Photos + Fake Badges** | `/payent` `#explore-rentals` | **Final Pass (`320×740`, `3:2`, 2-col)**: Synthetic stress card (`₹18,500/day`, `120`-char title, ultra-long Hyderabad location) measured `heights: [173, 173]` (`equalHeight: true`), `priceLocNoOverlap320: true`, `locTruncates320: true`, `overflow: false`. **Pass 1 (`1280×800`, `4:5`, 5-col)**: `10`-item mock confirmed `120`-char `line-clamp-2`, missing `""` & broken `http://127.0.0.1:9/...` URLs rendered `<Package>` + `"No photo"`, zero fake ratings/condition badges, and equal Row 1 heights (`[394, 394, 394, 394, 394]`). | **PASS** |
| **Bounded Pagination (`F-32`)** | `/payent` `#explore-rentals` (`10` items, Pass 1) | Initial fetch issued `/api/products?page=1&limit=8` & `/api/products?sort=newest&page=1&limit=8`; clicking `Next` issued `/api/products?page=2&limit=8` and rendered `"Page 2 Cinema Gimbal"` (`cardCount: 2`). | **PASS** |
| **Wishlist Logged-Out Guard & `e.stopPropagation()` (`F-01`)** | `/payent` `#explore-rentals` (Pass 1) | Clicking card heart while logged out remained on `/payent` (`stayedOnPayent: true`) and displayed `"Please log in to add items to your wishlist"`. | **PASS** |
| **Wishlist Logged-In Toggle, HTTP 500 Rollback & `RecentlyViewed` Single Fetch (`F-01`, `F-36`)** | `/payent` (`test@example.com` mock session, Pass 1) | Heart 1 toggled `aria-pressed="false"` -> `"true"` (`addedToastShown: true`). Heart 2 (`500` on `/api/wishlist/toggle`) rolled back `"false"` (`rollbackToastShown: true`, `"Failed to update wishlist"`). `/api/products/recently-viewed` executed **`recentlyViewedFetchCount: 1`** (zero loop) and populated `payent_recently_viewed_v1:test@example.com`. | **PASS** |
| **Card Navigation & `Book Now` Casing (`F-39`)** | `/payent` -> `/product/prod-1792996506773` | Clicking card opened `/product/prod-1792996506773`; `hasBookNowProperCase: true`, `hasBookNowUpper: false`, `writeReviewHasSparkles: false`. **Final Pass (`default` `4:3`)**: Related cards measured **`289 × 309 px`** (`aspectRatio: 1.333`, `hasDailyRental: true`). | **PASS** |
| **`Wishlist` Isolation** | `/wishlist` | Uses `variant="default"` (`hasCards: true`, `hasDailyRental: true`, compact price-row removal absent — verified in Pass 1 before lowering `default` image height from `3:4` to `4:3` in Final Pass). | **PASS** |
| **Category Navigation (`F-02`)** | `/payent` `Cameras` -> `/browse?cat=cameras` -> reload | `urlAfterClick: ".../browse?cat=cameras"`, `urlAfterReload: ".../browse?cat=cameras"`, `preservedCatCameras: true`. | **PASS** |
| **`Obs A` SearchOverlay** | `/payent` header search | `obsA_searchOverlayOpen: true` (`Escape` cleanly closed dialog). | **PASS** |
| **`Obs B` SSR/CSR Hydration** | `/browse`, `/filters`, `/product/prod-1792996506773` with `payent_server_products` seeded | **`obsB_hydrationWarningsOnDirectNav: 0`**. | **PASS** |
| **`Obs C` Orders HTTP 500** | `/orders` with mocked `500` | Stayed on `/orders` (`stayedOnOrders: true`), rendered failure UI (`surfacesFailureUI: true`), exposed zero sample IDs (`noSampleOrderIds: true`). | **PASS** |
| **`Obs D` & `F-39` Filters** | `/filters` (`1280×800`) | `desktopIdsCount: 17`, `mobileIdsCountInDom: 0`, `hasClearAll: true`, `hasResetOnlyButton: false`, `hasAnyAnimatePulse: 0`. | **PASS** |
| **Hero & Footer Preservation** | `/payent` (`1280×800` Light) | Hero height `450px`, `heroImgsCount: 3`, `heroImgsValid: true`, `"Get What You Need, Without Owning It."`, footer `support@payent.com`, `overflow: false`. | **PASS** |

---

## 5. Browser Telemetry & Archived Screenshot Evidence

- **`pageErrors`**: **`[]`** across all runs.
- **`hydrationWarnings`**: **`[]`** across all direct routes and cold reloads.
- **`consoleErrors` (Real Navigation)**: **`[]`** on post-fix clean Light/Dark `/payent`, Gateway `/`, `/product/$id`, and `/orders` verified runs (the single synthetic broken-image URL `http://127.0.0.1:9/nonexistent.jpg` triggered expected `net::ERR_UNSAFE_PORT` purely to prove `<Package>` `"No photo"` error fallback).

### Archived Visual Evidence (`C:\Users\LENOVO\.gemini\antigravity\brain\698f942f-0cda-4a44-9051-168629245c77\`)
- **Before**: `phase4_before_desktop_1280.png`, `phase4_before_mobile_375.png`, `phase4_before_browse_1280.png`
- **Intermediate Compact (`3:2`, 4 cols)**: `phase4_resize_desktop_1280.png`, `phase4_resize_mobile_375.png`, `phase4_resize_browse_1280.png`
- **Final Photo-Overlay Cards & Compact Bottom Sections**: `overlay_cards_desktop_1280.png`, `overlay_cards_mobile_375.png`, `overlay_cards_dark_1280.png`, `compact_bottom_desktop_1280.png`, `compact_bottom_mobile_375.png`
