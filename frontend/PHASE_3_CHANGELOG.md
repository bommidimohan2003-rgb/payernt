# paYent Marketplace — Phase 3 Changelog (`F-23` – `F-34`)

> **Phase**: Phase 3 — P2 Defect Resolution & Runtime Verification  
> **Date**: 2026-11-09  

---

## Backend (`c:\payernt-main\payernt-main\backend`)

- `backend/main.py`
  - Exposed `X-Total-Count` in `CORSMiddleware` `expose_headers` (`"X-Request-ID", "X-Total-Count"`).
  - Updated `fetch_public_listings` (`/api/products`, `/api/products/custom/public`) to merge approved custom listings and active `payernt_items`, apply search/filter/caller exclusions before setting `response.headers["X-Total-Count"]`, and apply `[offset : offset + limit]` slicing consistently even when `has_filters` is `False`.
- `backend/tests/test_products_pagination.py` *(new)*
  - Added 3 pytest regression tests validating CORS `X-Total-Count` exposure, merged pagination slicing + header accuracy (`page=1`/`page=2`, `has_filters=False`), and caller email exclusion ordering prior to `X-Total-Count` and slice bounds.

---

## Frontend (`c:\payernt-main\payernt-main\frontend`)

### Branding, Metadata & Common Controls
- `src/config/branding.ts`: Standardized canonical `name` (`"paYent"`) and tagline (`"Get What You Need, Without Owning It."`).
- `src/utils/seo.ts`: Unified `author` and `og:site_name` metadata to `"paYent"`.
- `src/routes/{__root,browse,categories,filters,wishlist,about,support,faq,select}.tsx`: Unified `<head>` document titles and descriptions to `"paYent"` (preserving gateway pathway branding).
- `src/components/common/LogoIcon.tsx`: Removed dead `PayentLogoMark` returning `null`; replaced `font-black` and wide-tracked micro uppercase tagline with restrained typography.
- `src/components/common/AppPreloader.tsx`: Unified animated brand mark to `["p", "a", "Y", "e", "n", "t"]` and reduced-motion label to `"paYent"`; reduced weight to `font-semibold`.
- `src/components/common/Input.tsx`: Aligned container radius (`rounded-[20px]` -> `rounded-xl`), replaced `transition-all` with `transition-colors`, and removed `tracking-tight` on small floating label.
- `src/components/common/RentalProductCard.tsx`: Replaced `/placeholder-gear.webp` fallback with clean monochrome `<Package />` `"No photo"` fallback; aligned `stroke-[1.75]`, removed `<16px` `tracking-tight`, and kept sans `font-semibold tabular-nums` price display.
- `src/components/common/TermsAndConditionsModal.tsx`: Aligned brand references to `"paYent"`, `font-semibold`, `focus-visible:ring-2`, and `stroke-[1.75]`.
- `src/components/common/ProductCard.tsx`: Removed unused legacy component after confirming zero workspace imports.

### Home Showcase & Navigation
- `src/components/home/Hero.tsx`: Replaced 6 dual light/dark `<img>` tags with 3 single `<img>` elements synced via `MutationObserver` on `html.dark` (initial `false` preserving SSR/CSR hydration parity), added explicit `width`/`height` (`944×680`, `746×819`, `781×782`) + `decoding="async"`, simplified stacked blur blobs to crisp single-layer shadows, removed `<16px` tight tracking, and unified `stroke-[1.75]`.
- `src/components/home/Categories.tsx`: Switched mobile grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`, removed `line-clamp-1`, added `min-w-0` + `shrink-0 whitespace-nowrap` on `View All` to preserve exact `16×16` `<ArrowRight stroke-[1.75] />` matching `NewArrivals`, replaced `transition-all`/`scale-102`/`active:scale-95` and uppercase eyebrow tracking, and added `focus-visible:ring-2`.
- `src/components/home/ExploreRentals.tsx`: Switched to bounded server-paginated `api.getFilteredProductsPage` (`page`/`limit=8`) + `AbortController`, removed `transition-all`/`active:scale-95`, added `tabular-nums` page indicator and `focus-visible:ring-2`, unified `stroke-[1.75]`.
- `src/components/home/NewArrivals.tsx`: Switched to bounded server-paginated `api.getFilteredProductsPage` (`sort: "newest"`, `page`/`limit=8`) + `AbortController`, added `#new-arrivals-empty-state` (`"No new arrivals right now"` + `/browse` CTA), added `min-w-0` / `shrink-0 whitespace-nowrap` on `View All` link + `16×16` `<ArrowRight>`, `tabular-nums`, `focus-visible:ring-2`, and `stroke-[1.75]`.
- `src/components/home/HowItWorks.tsx`: Updated steps to sentence case (`Discover`, `Book`, `Enjoy and return`, `Step 01..03`), upgraded WCAG AA step label contrast (`text-xs font-medium text-neutral-600 dark:text-neutral-400 tabular-nums`), replaced `"frictionless"`, stripped trailing periods, and unified `stroke-[1.75]`.
- `src/components/home/WhyChoose.tsx`: Curated benefit cards from 10 to **8** (`4×2` Desktop / `2×4` Mobile, zero orphaned row), replaced `<Sparkles />` with `<CalendarCheck stroke-[1.75] />`, removed `"world-class"`, and stripped trailing periods.
- `src/components/home/CustomerReviews.tsx`: Removed `select-none` from review cards, implemented dynamic `getStepWidth()` scroll indexing, converted `<span>` pagination indicators to interactive `<button type="button">` dots with `aria-label` & `aria-current`, enlarged desktop arrows to `h-11 w-11`, removed `transition-all`/`active:scale-95`, and aligned `stroke-[1.75]`.
- `src/components/home/CreatorCommunity.tsx`: Standardized brand copy (`"paYent"`), `font-semibold`, `tabular-nums`, `transition-colors`, `focus-visible:ring-2`, and `stroke-[1.75]`.
- `src/components/home/SearchOverlay.tsx`: Replaced broken image fallback with stateful `<Package />` icon fallback (`failedImages`), unified `stroke-[1.75]`, added `focus-visible:ring-2`, and restrained price weight (`font-semibold`).
- `src/components/layout/Navbar.tsx` & `src/components/navigation/Navigation4.tsx`: Unified `stroke-[1.75]`, restrained badge/brand weights (`font-semibold`), removed `<16px` `tracking-tight`, and added `tabular-nums` badge styling.
- `src/components/layout/Footer.tsx`: Wired all 5 legal links cleanly to distinct `{ to, hash }` targets (`#privacy-policy`, `#terms-of-service`, `#cancellation-refunds`, `#rental-agreement-escrow`, `#security-protocol`), replaced fake static `"paYent Web App"` bordered card with functional `beforeinstallprompt` install button / plain-text browser instructions, and unified `stroke-[1.75]`.

### Secondary Storefront Pages & API Utilities
- `src/utils/api.ts`: Added optional `limit`/`page` query serialization to `getFilteredProducts` and implemented `getFilteredProductsPage` parsing `X-Total-Count`.
- `src/components/selection/ProductSelection.tsx`: Replaced `transition-all`/`active:scale-95` and upgraded `focus-visible:ring-2` while preserving dual-pathway `paye₹nt` & `pay₹ent` cards.
- `src/pages/PrivacyPolicy.tsx`: Added `#privacy-policy` and `#terms-of-service` anchors with hash scrolling, monochrome styling, `"paYent"` copy, and `support@payent.com` contact address.
- `src/pages/About.tsx`: Added `#rental-agreement-escrow` anchor, removed unused `PayentLogoMark` & `Sparkles` imports, standardized `"paYent"` / `"professional storytelling technology"`, monochrome accents, sans `tabular-nums`, `transition-colors`, and `stroke-[1.75]`.
- `src/pages/Support.tsx`: Added hash scroll handling and `#support-policies` (`#cancellation-refunds` & `#security-protocol`) section on FAQ/Support view, standardized `"paYent"`, removed `transition-all`/`hover:-translate-y-1`/`font-black`/`tracking-tight`/`!`, and unified `stroke-[1.75]`.
- `src/pages/Filters.tsx`: Added `<Package />` `failedImages` fallback replacing `/placeholder.png` and external Unsplash fallback, unified consumer prices & counts to sans `font-semibold tabular-nums`, aligned `stroke-[1.75]`/`stroke-[2]`, and restrained `<h1>` to `font-semibold` (preserving `#desktop-filter-*`/`#mobile-filter-*` & `F-07`).
- `src/pages/Profile.tsx`: Restrained heavy weights (`font-semibold`), converted uppercase tracking badges cleanly, removed `!` in photo toast, added `tabular-nums` + focus-visible rings, and aligned `stroke-[1.75]` (preserving `F-05` & `F-08`).
- `src/pages/ProductDetails.tsx`: Aligned JSON-LD (`"paYent"`), calm gallery photo hover, restrained typography weights & sans `tabular-nums` pricing/date counters, calm T&C toast (`"Terms and conditions accepted"`), and standardized `stroke-[1.75]`/`stroke-[2]`.
- `src/pages/Orders.tsx`: Replaced remaining `transition-all`, removed `italic`, restrained heavy weights & small `tracking-tight`, unified consumer ₹ prices & KPI metrics to sans `font-semibold tabular-nums` (keeping `font-mono` strictly on technical IDs/receipts/timestamps), removed `!` in copy/location/empty/payment copy, and aligned `stroke-[1.75]` (preserving `F-03`, `F-06`, `F-22`, `Obs C`).

### Verification & Reports
- `tests/phase3-p2-fixes.test.ts` *(new)*: Added 10 comprehensive Phase 3 unit/SSR tests covering `F-23` through `F-34`.
- `PHASE_3_IMPLEMENTATION_REPORT.md`, `PHASE_3_RUNTIME_VERIFICATION_REPORT.md`, `PHASE_3_CHANGELOG.md` *(new)*.
