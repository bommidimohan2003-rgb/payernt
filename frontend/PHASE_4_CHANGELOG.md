# paYent Marketplace — Phase 4 Changelog (`F-35` – `F-40` & Compact Product Card Redesign)

> **Phase**: Phase 4 — Final P3 Defect Cleanup + Compact Product Card Redesign  
> **Date**: 2026-11-09  

---

## Frontend (`c:\payernt-main\payernt-main\frontend`)

### CSS Cascade & Base Reset Fix
- `src/styles.css`
  - Wrapped global element reset rules (`*`, `html`, `body`, scrollbar hiding, `img, video, canvas, svg { max-width: 100%; height: auto; }`) inside `@layer base { ... }` so Tailwind v4 `@layer utilities` classes such as `h-full` fill `aspect-[3/2]` and `aspect-[4/3]` image containers cleanly without being overridden.

### Part B — Overlay Product Card, Responsive Grid & Compact Footer / Value-Prop Sections
- `src/components/common/RentalProductCard.tsx`
  - Added optional `variant?: "default" | "compact"` (default `"default"`) to `RentalProductCard` and `RentalProductCardSkeleton`.
  - Redesigned cards so title, pricing, and location overlay directly at the bottom of the product photo over a high-contrast dark gradient scrim (`bg-gradient-to-t from-black/92 via-black/72 to-transparent`), removing the separate bottom info box:
    - `compact` (`ExploreRentals`, `NewArrivals`, `/browse`): `aspect-[5/4] sm:aspect-[3/2] rounded-xl`, full-bleed `object-cover object-center`, monochrome `<Package />` `"No photo"` upper fallback (`bottom-[58%] sm:bottom-[50%]`) that never overlaps overlay text, permanent `44×44px` top-right wishlist toggle hitbox, 2-line title clamp (`line-clamp-2`), and single bottom row (`₹{price}/day` with `tabular-nums` + `<MapPin>` `truncate` location).
    - `default` (`Wishlist`, `ProductDetails` Related, `RecentlyViewed`, `RecommendedForYou`): `aspect-[4/3] rounded-2xl`, bottom photo overlay preserving `"Daily Rental ·"` (`sm+`) and `₹{price} / day`.
  - Updated `RentalProductCardSkeleton` (`compact`: `aspect-[5/4] sm:aspect-[3/2]`, `default`: `aspect-[4/3]`) to match overlay geometry 1:1.
- `src/components/home/HowItWorks.tsx`
  - Reduced vertical height (`py-2.5 sm:py-3.5`, compact header `mb-2 sm:mb-2.5`) using horizontal `Step 01 · Discover` step cards (`px-3 py-2`) while preserving all 3 steps and AA contrast.
- `src/components/home/WhyChoose.tsx`
  - Reduced vertical height (`py-2.5 sm:py-3.5`, `mb-2 sm:mb-2.5`, `p-2 sm:p-2.5` cards) by pairing the circular icon inline beside each of the 8 benefit `<h3>` headings with concise zero-truncation copy.
- `src/components/layout/Footer.tsx`
  - Reduced desktop and mobile height (`py-2.5 sm:py-3.5`), consolidated desktop groups onto a single 6-column row (`lg:grid-cols-6`), placed mobile brand logo + tagline inline (`flex-row`), and tightened accordion & copyright spacing while keeping `44px` mobile accordion controls and all `F-31` links intact.
- `src/components/home/ExploreRentals.tsx`
  - Updated card and skeleton grids from `xl:grid-cols-5 gap-2.5` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4` (wider `292 px` desktop cards in balanced `4×2` rows) and passed `variant="compact"`, preserving `ITEMS_PER_PAGE = 8` bounded server pagination (`F-32`).
- `src/components/home/NewArrivals.tsx`
  - Updated card and skeleton grids to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4` and passed `variant="compact"`, preserving `ITEMS_PER_PAGE = 8` and `#new-arrivals-empty-state`.
- `src/pages/Categories.tsx` (`/browse`, `/categories`, `/payent/explore`)
  - Updated catalog card and skeleton grids to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4` (reduced skeleton count from `10` to `8` for balanced `4×2` rows) and passed `variant="compact"`.

### Part A — P3 Cleanup (`F-36`, `F-38`, `F-39`, `F-40`; `F-35` & `F-37` Verified Already Resolved)
- `src/components/home/Categories.tsx` (`F-36`): Unified section padding from `py-5 sm:py-6` to `py-5 sm:py-7`.
- `src/components/home/RecentlyViewed.tsx` (`F-36`): Aligned header typography (`font-semibold`, `text-neutral-600 dark:text-neutral-400`), added static `<RentalProductCardSkeleton />` row fallback for uncached first-time logged-in loads, preserved SSR/CSR pre-mount parity (`Obs B`), and keyed `useEffect` on primitive `userEmail` with private `localStorage` (`payent_recently_viewed_v1:<email>`) to prevent storage-event refetch loops.
- `src/components/home/RecommendedForYou.tsx` (`F-36`): Aligned section header (`font-semibold`) and description contrast (`text-neutral-600 dark:text-neutral-400`).
- Static Skeleton `animate-pulse` Removal (`F-36`): Removed pulsing animations from static skeleton blocks across:
  - `src/components/ui/skeleton.tsx`
  - `src/components/states/LoadingState.tsx`
  - `src/pages/BookingDetails.tsx`
  - `src/pages/Messages.tsx`
  - `src/pages/Reviews.tsx`
  - `src/payernt/components/PayerntHome.tsx`
  - `src/payernt/components/RentalRequests.tsx`
  - `src/components/home/FeaturedProducts.tsx`
  - `src/components/home/Testimonials.tsx`
  - `src/admin/components/layout/StatsCard.tsx`
  - `src/admin/pages/Analytics.tsx`
- Invalid `py-0.2` -> `py-0.5` Replacement (`F-38` — 35 instances across 22 files):
  - `src/admin/components/layout/Sidebar.tsx`
  - `src/admin/pages/{Agents,Bookings,Dashboard,Knowledge,KycVerification,Notifications,Payments,Products,Reviews,Support,Users}.tsx`
  - `src/components/browse/ProductMessageModal.tsx`
  - `src/components/common/SecretPinDisplay.tsx`
  - `src/pages/{Messages,Notifications,Payment,Settings}.tsx`
  - `src/payernt/components/{LenderSettings,ListProductWizard,PayerntGlobalSearch}.tsx`
  - `src/routes/payernt/notifications.tsx`
- `src/pages/ProductDetails.tsx` (`F-39`): Converted `<span>BOOK NOW</span>` CTA copy to `<span>Book Now</span>`.
- `src/components/selection/ProductSelection.tsx` (`F-40`): Removed `<filter id="cinematicNoise"><feTurbulence .../></filter>`, stripped `ORIGIN \| paYent / GATEWAY \| 2026`, `RENT. LEND.`, `CHOOSE YOUR PATH`, `ONE PLATFORM / TWO PATHS`, uppercase wide-tracked labels, and unused imports (`useRef`, `Link`, `useAuth`, `Sparkles`) while preserving `"paYent"`, `"paye₹nt"`, `"pay₹ent"`, Light/Dark toggle, desktop cards, and mobile branching tree.

### Tests & Documentation Deliverables
- `tests/phase4-p3-card.test.ts` *(new)*: Added 8 Phase 4 automated tests covering `F-35`–`F-40`, photo-overlay `RentalProductCard` (`aspect-[5/4] sm:aspect-[3/2]` compact, `aspect-[4/3]` `default`), gradient scrim, upper `bottom-[58%]` `"No photo"` guard, `44px` wishlist hitbox, `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, and compact `HowItWorks` / `WhyChoose` / `Footer` heights.
- `PHASE_4_IMPLEMENTATION_PLAN.md`, `PHASE_4_IMPLEMENTATION_REPORT.md`, `PHASE_4_RUNTIME_VERIFICATION_REPORT.md`, `PHASE_4_CHANGELOG.md` *(new)*.
