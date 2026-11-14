# paYent — Phase 5: Four Critical Functional Bug Fixes Plan

## Overview
This document specifies the root causes, affected files, required fixes, regression risks, and verification test cases for the four functional bug fixes in Phase 5.

---

## 1. Issue 1: Customer Reviews Section Not Working

### Root Cause
1. **Empty State Silence & Section Vanishing**: In `frontend/src/components/home/CustomerReviews.tsx` (line 80), `if (!isLoading && reviews.length === 0) return null;` silently unmounts the entire section whenever the reviews table has 0 records or degraded fallback is active. Users perceived the section as missing or broken.
2. **Missing Error & Retry UI**: If `api.getPublicReviews` timed out or failed, it silently caught the error and returned `[]`, triggering the unmount with no visible feedback or retry capability.
3. **Property Mismatch in Payload**: The backend (`get_reviews_from_db` in `backend/database.py`) serializes product titles as `product_title` and `productTitle`. `CustomerReviews.tsx` only read `r.product_name`, causing product titles to always display as `undefined` or fallback to `"Verified Rental"`.
4. **Pagination Envelope Inconsistency**: Backend returns `{ reviews: [...], pagination: { total: N, ... } }`, whereas `frontend/src/utils/api.ts`'s `getPublicReviews` parsed `data?.total` instead of `data?.pagination?.total || data?.total`.
5. **Desktop & Mobile Carousel Controls**: Carousel controls on desktop were gated behind `reviews.length > 3`, which hid arrows on smaller desktop viewports even when cards overflowed. Touch scrolling and dot indicators did not handle empty/sparse arrays cleanly.

### Affected Files
- `frontend/src/components/home/CustomerReviews.tsx`
- `frontend/src/utils/api.ts`
- `backend/database.py` (degraded fallback reviews / field normalization)

### Required Fixes
- Add a genuine empty state: when 0 reviews exist, render an elegant paYent monochrome empty state: "No reviews yet. Be the first renter to share your experience!" with a link to `/browse` and a "Refresh" action.
- Add an explicit error state with a "Retry" button that re-invokes the review fetch on network failure.
- Fix property mapping in `CustomerReviews.tsx` to read `r.product_title || r.productTitle || r.product_name` and `r.user_name || r.userName`.
- Fix `getPublicReviews` in `frontend/src/utils/api.ts` to parse `data?.pagination?.total ?? data?.total ?? data?.reviews?.length ?? 0`.
- Ensure carousel navigation, step calculation (`getStepWidth`), and dot navigation work responsively across desktop (1440/1280) and mobile (375).

---

## 2. Issue 2: Recommended Products Exclude Authenticated Renter's Own Listings

### Root Cause
1. **Unfiltered Backend Recommendation Queries**: In `backend/main.py`:
   - `get_recommendation_catalog()` stripped owner emails/IDs (`owner_email`, `user_email`, `owner_id`), populating only display names.
   - `get_personalized_recommendations` (`/api/recommendations/personalized`), `get_trending_recommendations` (`/api/recommendations/trending`), `get_similar_recommendations`, and `get_frequently_together_recommendations` did not accept or inspect verified JWT authentication tokens.
   - None of the recommendation endpoints filtered out products owned by the requesting user.
2. **Insecure Identity Trust**: Relying on client-supplied `user_email` query parameter would violate security rules. Identification must come from verified backend JWT tokens.
3. **Frontend Stale Cache on Account Switch**: `RecommendedForYou.tsx` cached computer products without invalidating or checking user ownership on login, logout, or account switch.

### Affected Files
- `backend/main.py` (`get_recommendation_catalog`, `get_personalized_recommendations`, `get_trending_recommendations`, `get_similar_recommendations`, `get_frequently_together_recommendations`)
- `frontend/src/components/home/RecommendedForYou.tsx`
- `frontend/src/components/recommendations/RecommendationSection.tsx`

### Required Fixes
- In `backend/main.py`:
  - Retain `owner_email`, `user_email`, and `owner_id` in `get_recommendation_catalog()`.
  - Accept `authorization: Optional[str] = Header(None)` across all recommendation routes.
  - Decode and verify the JWT access token using `decode_access_token` and Firebase auth to extract `caller_email` and `caller_id`.
  - At the backend query/filtering level, exclude any product where `product.owner_email == caller_email` or `product.user_email == caller_email` or `product.owner_id == caller_id`.
  - If a guest accesses recommendations, no owner exclusion is applied (preserving guest behavior).
- In `frontend/src/components/home/RecommendedForYou.tsx` and `RecommendationSection.tsx`:
  - Clear and refresh recommendation state when `user` changes or logs in/out.
  - Apply client-side defense-in-depth filtering: exclude `isUserOwnProduct(p, user)`.

---

## 3. Issue 3: Order Page Rental Schedule and Return Date Blocked-Date Validation

### Root Cause
1. **Missing Backend Order Conflict Check**: In `backend/main.py`, the `POST /api/orders` endpoint (`add_order`) verified general product existence and KYC, but NEVER checked `check_product_interval_conflicts(pid, s_dt, e_dt, product=prod)`. A forged or unvalidated request could book blocked or already-reserved dates.
2. **Missing Frontend Validation on Checkout**: In `frontend/src/pages/Checkout.tsx` ("Product & Rental Schedule"), users could pick dates using raw `<Input type="date">`. The component never validated the range against `/api/products/{id}/availability`, allowing users to confirm orders on blocked dates.
3. **Calendar Auto-Selection Bug**: In `frontend/src/components/booking/RenterBookingCalendar.tsx`, when selecting a start date, if `dateKey >= newEnd`, it defaulted `newEnd` to `dateKey + 1` WITHOUT checking if `dateKey + 1` or intermediate dates were blocked or booked.
4. **Range Continuity Validation**: `checkRangeUnavailable` verified intermediate dates, but if the initial end date or clicked date landed on an auto-incremented date, conflict warnings were bypassed.

### Affected Files
- `backend/main.py` (`add_order` endpoint)
- `frontend/src/pages/Checkout.tsx`
- `frontend/src/components/booking/RenterBookingCalendar.tsx`

### Required Fixes
- **Backend**:
  - In `backend/main.py` `add_order`: Invoke `check_product_interval_conflicts(product_id=pid, req_start_dt=s_dt, req_end_dt=e_dt, product=prod)`.
  - If conflicted, raise `HTTPException(status_code=400, detail=f"Selected rental dates are unavailable: {reason}")`.
- **Frontend**:
  - In `Checkout.tsx`: Integrate real-time availability checking when `start` or `end` changes. Disable the "Confirm & Pay" button and display clear error banners if the selected start, end, or interval contains blocked/booked dates.
  - In `RenterBookingCalendar.tsx`: When auto-advancing `newEnd` on start-date click, find the next contiguous available date that is NOT blocked or booked. Prevent selecting ranges spanning blocked dates.

---

## 4. Issue 4: Filters and Explore Browser Back Button Restoration

### Root Cause
1. **History Stack Pollution via `<Link>` in Filters**: In `frontend/src/pages/Filters.tsx`, "Back to Explore" and "Done" were implemented as `<Link to="/categories" search={search as any}>`. This pushed a new `/categories` entry onto the history stack (`/categories` → `/filters` → `/categories`), causing the browser Back button to trap the user in an infinite loop back into `/filters`.
2. **Unsynchronized Sort State**: In `frontend/src/pages/Categories.tsx`, the sort dropdown only called `setSort(opt.id)` (local React state). It never updated the URL search params. When navigating away and pressing browser Back, the sort order was lost.
3. **Hardcoded Destination Route**: In `Filters.tsx`, `<Link to="/categories">` hardcoded `/categories`, breaking navigation if the user arrived from `/browse` or `/payent/explore`.
4. **Pagination & Filter State in ExploreRentals**: In `ExploreRentals.tsx`, `currentPage` was stored only in `sessionStorage` and local state without reflecting in router search or handling `popstate`.

### Affected Files
- `frontend/src/pages/Filters.tsx`
- `frontend/src/pages/Categories.tsx`
- `frontend/src/components/home/ExploreRentals.tsx`

### Required Fixes
- In `Filters.tsx`:
  - When clicking "Done" or "Back to Explore", use `history.back()` or `navigate({ to: originRoute, search: currentFilterParams, replace: true })` so history is not polluted with duplicate forward entries.
  - Dynamically preserve the origin route (`/browse`, `/categories`, `/payent/explore`) from `search.from` or referer.
- In `Categories.tsx`:
  - Read `sort` directly from `search.sort` (defaulting to `"featured"`).
  - When changing sort, call `navigate({ to: targetRoute, search: (prev) => ({ ...prev, sort: newSort === "featured" ? undefined : newSort }) })`.
  - Synchronize `q` with `search.q` on URL changes.
- Ensure browser Back and Forward naturally reconstruct the exact URL, filter chips, category selections, sort order, and scroll state.

---

## 5. Regression Guardrails & Safety
- Preserve all 62 existing tests (P0 F-01 through F-08, P1 F-09 through F-22, P2 F-23 through F-34, P3 F-35 through F-40, Obs A through Obs D, Renter Cart).
- Do not commit or push to Git until explicit user permission is given.
- Strict TypeScript compilation (`tsc --noEmit`).
- Production Vite build (`npm --prefix frontend run build`).
