# paYent — Renter Side Rental Cart Changelog

**Date:** November 13, 2026  
**Scope:** Renter Customer Storefront Rental Cart Architecture & Full Flow Integration  
**Policy:** Local working copy only (No Git commits or pushes made)

---

## 1. Summary of Changes

### State & Hooks
- `frontend/src/hooks/useCart.tsx`:
  - Exported `CartContext` so components can consume it safely via `useContext(CartContext)` without throwing errors when unmounted.
  - Removed `pathname === "/"` restriction from `isCartEnabled` so cart queries remain active for authenticated renters across the entire customer storefront.
  - Decoupled item addition from forced cart drawer expansion, enabling clean toast feedback instead.

### Components
- `frontend/src/components/common/RentalProductCard.tsx`:
  - Added `useContext(CartContext)` with fallback to prevent test crashes.
  - Implemented `handleCartClick` with:
    - Logged-out auth check: surfaces toast prompting user to log in with direct navigation action preserving return URL.
    - Duplicate check: detects if product is already in cart, notifying user with `"View Cart"` action.
    - Rapid click debouncing: disables button and displays `<Loader2 className="animate-spin" />` during mutation.
    - Event isolation: stops event propagation to prevent triggering parent card navigation (`/product/$id`).
  - Applied `handleCartClick` to both `portrait` (Home page) and `explore` (Explore/Browse page) product card variants.
- `frontend/src/components/layout/Navbar.tsx`:
  - Added dedicated Cart icon button (`<ShoppingCart />`) with minimum 44×44px hit target, keyboard focus rings, and dark/light styling.
  - Integrated dynamic numeric badge (`data-testid="nav-cart-badge"`) displaying `cartCount` when `cartCount > 0`.

### Pages & Routes
- `frontend/src/pages/Cart.tsx`:
  - Fully redesigned page to match paYent monochrome design system and dark surface `#1E1E1E`.
  - Added Page Header with `"Your Rental Cart"`, subtitle, dynamic count badge, `"Continue Shopping"` link, and `"Clear Cart"` button with confirmation prompt.
  - Created Empty Cart state with `<ShoppingBag />` icon, descriptive guidance, and `"Explore Rentals"` CTA.
  - Designed Cart Items list with product thumbnail, category, `"Ready for rental"` badge, location, rental dates/duration status, daily rate, and removal actions.
  - Designed sticky Order Summary panel with daily rates base, Payent Shield protection note, security deposit status, and primary CTA button **"Proceed to Booking"** (`id="cart-proceed-booking-btn"`).
- `frontend/src/routes/cart.tsx`:
  - Wrapped `Cart` component in `<ProtectedRoute>` to enforce authentication and redirect unauthenticated users to `/login?redirect=/cart`.
- `frontend/src/routes/payent/cart.tsx`:
  - Wrapped `Cart` component in `<ProtectedRoute>` matching `/cart`.

### Tests
- `frontend/tests/renter-cart.test.ts`:
  - Added unit test suite covering header, empty state, order summary CTA, route protection, Navbar integration, and duplicate prevention.
