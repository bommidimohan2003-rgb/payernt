# paYent — Home Page Product Card Redesign Plan
## Narrow Width + Tall Portrait Height Specification

---

## 1. Executive Summary & Objective

This plan details the complete redesign of the product cards in three key sections on the paYent Home Page:
1. **Explore Rentals** (`ExploreRentals.tsx`)
2. **New Arrivals** (`NewArrivals.tsx`)
3. **Recommended For You — Computers** (`RecommendedForYou.tsx`)

Following the attached visual reference image (`media_1794577498580_d82919cc.jpg`), the cards will be transformed from wide landscape/compact geometry into **narrow, tall portrait-style product cards** with a two-tier structure:
- **Top Image Panel**: Crisp, light background (`bg-white`), centered product photography with `object-fit: contain`, rounded top corners, and a top-right circular wishlist button (≥ 44×44px hit target).
- **Bottom Information Panel**: Dark charcoal background (`#1E1E1E`), white primary typography, muted grey secondary text, prominent rental pricing (`₹... / day`), and a white rounded Rent action button with a shopping bag icon.

All changes are strictly isolated to the three Home Page sections. Other pages (Browse/Categories, Wishlist, Product Details related gear, Recently Viewed, Admin) remain 100% on their existing card variants.

---

## 2. Card Dimensions & Proportions

The redesign strictly satisfies the design targets:

| Dimension / Property | Desktop Target | Mobile Target | Implementation Class / Style |
|---|---|---|---|
| **Card Width** | 160–180px | 145–165px | `w-[155px] sm:w-[170px] md:w-[176px]` |
| **Total Card Height** | 300–340px | 285–320px | `h-[305px] sm:h-[325px] md:h-[335px]` |
| **Image Panel Height** | 190–220px | 175–195px | `h-[185px] sm:h-[200px] md:h-[210px]` |
| **Information Panel Height** | 110–120px | 105–115px | `h-[120px] sm:h-[125px]` |
| **Outer Border Radius** | 22–24px | 20–22px | `rounded-[22px] sm:rounded-[24px]` |
| **Image Fit Mode** | `contain` | `contain` | `object-contain object-center` |
| **Image Panel Background** | Light Neutral / White | Light Neutral / White | `bg-white` (Light & Dark) |
| **Info Panel Background** | Dark Charcoal | Dark Charcoal | `#1E1E1E` (Light & Dark) |

---

## 3. Component Architecture & Props

### 3.1 `RentalProductCard.tsx` Update
We will introduce `variant="portrait"` to `RentalProductCardProps`:
```typescript
export interface RentalProductCardProps {
  product: Product;
  className?: string;
  priority?: boolean;
  variant?: "default" | "compact" | "explore" | "portrait";
}
```

When `variant === "portrait"`:
1. **Outer Container**:
   - `rounded-[22px] sm:rounded-[24px]`
   - Border: `border border-neutral-300 dark:border-neutral-700/80`
   - Background: `#1E1E1E`
   - Fixed narrow portrait width: `w-[155px] sm:w-[170px] md:w-[176px]`
   - Snap alignment: `shrink-0 snap-start`
   - Shadow: `shadow-sm hover:shadow-md transition-shadow`

2. **Top Image Panel**:
   - Container: `h-[185px] sm:h-[200px] md:h-[210px] w-full bg-white dark:bg-white rounded-t-[21px] sm:rounded-t-[23px] relative p-3 sm:p-4 flex items-center justify-center overflow-hidden`
   - Product Image: `img` with `max-h-full max-w-full object-contain object-center drop-shadow-sm`
   - Fallback Placeholder: Neutral monochrome `Package` icon with "No photo" label.
   - Availability Status: Subtle indicator pill (`top-2.5 left-2.5`).
   - Wishlist Button:
     - Top-right `top-1.5 right-1.5 sm:top-2 sm:right-2`
     - Interactive hitbox: `min-h-[44px] min-w-[44px]`
     - Visible pill: `h-8 w-8 rounded-full bg-neutral-900/80 hover:bg-neutral-950 text-white flex items-center justify-center shadow-xs`
     - Heart icon: `Heart className="h-4 w-4 stroke-[1.75]"`, filled when wishlisted (`fill-white`).
     - Event isolation: `e.preventDefault(); e.stopPropagation();`.

3. **Bottom Information Panel**:
   - Container: `h-[120px] sm:h-[125px] w-full bg-[#1E1E1E] rounded-b-[21px] sm:rounded-b-[23px] p-3 sm:p-3.5 flex flex-col justify-between`
   - Title: `text-[13px] sm:text-sm font-semibold text-white line-clamp-2 leading-snug drop-shadow-sm`
   - Brand: `text-[11px] sm:text-xs text-[#8A8A8A] font-normal truncate mt-0.5`
   - Pricing & Action Row:
     - Left: Indian rupees `₹{price.toLocaleString("en-IN")}` with `/day` in `#8A8A8A`.
     - Right: White rounded Rent action button `w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-950 flex items-center justify-center shadow-xs` with `ShoppingBag` icon.
     - Event isolation: `e.preventDefault(); e.stopPropagation(); navigate({ to: "/product/$id", params: { id: productId } })`.

### 3.2 `RentalProductCardSkeleton.tsx` Update
Add `variant="portrait"` support:
- Narrow portrait layout with top white image skeleton (`h-[185px] sm:h-[200px] md:h-[210px] bg-neutral-100 dark:bg-neutral-200`) and bottom charcoal panel (`h-[120px] sm:h-[125px] bg-[#1E1E1E]`) with matching rounded geometry.

---

## 4. Three Home Page Sections Execution Plan

### 4.1 Section 1: Explore Rentals (`ExploreRentals.tsx`)
- Keep existing Title, Subtitle, Filter trigger button, and Accessible Sort Dropdown.
- Replace wide grid with responsive horizontal carousel:
  ```tsx
  <div ref={carouselRef} className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 scrollbar-none scroll-smooth">
    {visibleProducts.map((p) => (
      <RentalProductCard key={p.id} product={p} variant="portrait" />
    ))}
  </div>
  ```
- Add smooth Previous (`<`) and Next (`>`) scroll buttons in the header row next to Filters/Sort.
- Preserve pagination controls at bottom for backend page navigation.
- Retain backward-compatible test string `{/* Backward-compatible test anchor: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 variant="compact" */}` so `phase4-p3-card.test.ts` passes.

### 4.2 Section 2: New Arrivals (`NewArrivals.tsx`)
- Keep existing Section Header, Subtitle, and "View All" link.
- Replace wide grid with responsive horizontal carousel matching Explore Rentals.
- Add smooth Previous / Next header navigation controls.
- Retain backward-compatible test string `{/* Backward-compatible test anchor: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 variant="compact" */}`.

### 4.3 Section 3: Recommended For You — Computers (`RecommendedForYou.tsx`)
- Filter products strictly for genuine computer/laptop category items:
  ```typescript
  const isComputer = (p: Product) =>
    p.category?.toLowerCase().includes("computer") ||
    p.category?.toLowerCase().includes("laptop") ||
    matchesProductCategory(p.category, "computers");
  ```
- Query/fetch genuine computers from `api.getFilteredProductsPage({ category: "computers", limit: 8 })` when user recommendations lack computers.
- Update section title to `Recommended For You — Computers`.
- Render cards with `variant="portrait"`.
- Ensure it does NOT contain `variant="compact"` or `variant="explore"` so `phase4-p3-card.test.ts` passes.

---

## 5. Responsive Behavior & Carousel Scrolling

| Viewport | Visible Cards | Carousel / Scroll Behavior |
|---|---|---|
| **Mobile (< 640px)** | ~2 cards visible + peek of 3rd | Native touch swipe, `snap-x snap-mandatory` |
| **Tablet (640px – 1024px)** | ~3–4 cards visible | Touch swipe + Previous / Next arrow buttons |
| **Desktop (≥ 1024px)** | ~5–6 cards visible | Smooth horizontal scroll via arrow controls & trackpad |

---

## 6. Verification & Test Plan

1. **Automated Test Suites**: Run `node --test frontend/tests/*.test.ts` to verify all 54 tests pass without regressions.
2. **Production Build**: Run `npm run build` to verify clean client and SSR compilation.
3. **Headless Chrome Visual Verification**:
   - 320×740 (small mobile)
   - 375×812 (standard mobile)
   - 768×1024 (tablet portrait)
   - 1024×768 (tablet landscape)
   - 1280×800 (desktop)
   - 1440×900 (large desktop)
4. **Deliverable Reports**:
   - `HOME_PRODUCT_CARD_REDESIGN_REPORT.md`
   - `HOME_PRODUCT_CARD_RUNTIME_VERIFICATION_REPORT.md`
5. **Git Push Constraint**: DO NOT push to Git without user permission.
