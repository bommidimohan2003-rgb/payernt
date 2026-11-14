# paYent — Renter Side Rental Cart Page Implementation Plan

**Date:** November 13, 2026  
**Status:** In Progress (Planning Phase)  
**Scope:** Customer / Renter Storefront Rental Cart Architecture & Full Flow Integration  

---

## 1. Existing Architecture Analysis

### 1.1 Backend & Database Capabilities (Already Discovered)
- **FastAPI Endpoints in `backend/main.py`:**
  - `GET /api/cart`: Fetches user's cart items from `cart_items` table (or degraded in-memory `MOCK_CARTS`), joined with `custom_products`. Validates batch conflicts via `check_products_booking_conflicts`. Returns `{ items, count, subtotal, tax, total }`.
  - `POST /api/cart`: Accepts `AddToCartSchema` (`product_id`, `start_date`, `end_date`). Validates date formatting, prevents past dates, enforces date ordering, and performs an atomic upsert via `add_or_update_cart_item`.
  - `DELETE /api/cart/{item_id}`: Removes an item from the cart, scoped to the authenticated user's email.
  - `DELETE /api/cart`: Clears the user's cart.
  - `POST /api/cart/checkout`: Validates availability and conflict checks across all cart items before booking.
- **Database Schema in `backend/database.py`:**
  - `CREATE TABLE IF NOT EXISTS cart_items`: Unique key on `(user_email, product_id)`.
  - Functions: `get_user_cart`, `add_or_update_cart_item`, `remove_cart_item`, `clear_user_cart`.
  - Security: User email derived strictly from authenticated JWT (`get_current_user_email` or `get_approved_user`). Zero reliance on client-supplied user IDs.

### 1.2 Frontend Architecture (Discovered)
- **API Client (`frontend/src/utils/api.ts`):**
  - Contains `getCart()`, `addToCart()`, `removeFromCart()`, `clearCart()`, `validateCartCheckout()`.
  - In offline mode (`!API_BASE`), provides local fallback using `storage` and `_productCache`.
- **State & Query (`frontend/src/hooks/useCart.tsx`):**
  - `CartProvider` mounted in `frontend/src/routes/__root.tsx`.
  - Provides `cartItems`, `cartCount`, `subtotal`, `tax`, `total`, `addToCart`, `removeFromCart`, `clearCart`, `refreshCart`.
  - Note: `isCartEnabled` currently checks `window.location.pathname === "/"` which improperly disables cart synchronization on the Home page. Needs fix to remain active whenever an authenticated renter session is present.
- **Routes & Pages (`frontend/src/pages/Cart.tsx`, `frontend/src/routes/cart.tsx`):**
  - `Cart.tsx` exists with basic structure. Needs full redesign to match the paYent monochrome design system, rental date status, item details, Order Summary card with "Proceed to Booking" action, and empty state CTA matching specs.
  - Route `/cart` and `/payent/cart` need `<ProtectedRoute>` wrapper so unauthenticated visitors are redirected to `/login?redirect=/cart`.
- **Product Cards (`frontend/src/components/common/RentalProductCard.tsx`):**
  - Both `portrait` (Home page) and `explore` (Explore/Browse page) variants have a Cart button at the bottom-right.
  - Currently, both buttons simply call `navigate({ to: "/product/$id" })`.
  - Needs functional `handleCartClick` with:
    1. Auth validation (redirect to login with return path if unauthenticated).
    2. Duplicate prevention (toast warning if already in cart with "View Cart" action).
    3. Rapid click debouncing/locking.
    4. Successful addition with confirmation toast.
    5. Navigation stopPropagation to prevent accidental Product Details routing.
- **Navigation (`frontend/src/components/layout/Navbar.tsx` & `Navigation4.tsx`):**
  - `Navbar.tsx` currently lacks a Cart button in the desktop/tablet header. Needs a sleek Cart icon button with real-time numeric `cartCount` badge.
  - `Navigation4.tsx` dock already has `cartCount` on Orders, but should also ensure smooth navigation to `/cart`.

---

## 2. Requirements & Gap Analysis

| Requirement | Current State | Required Change |
|---|---|---|
| Cart Icon Click on Product Cards | Navigates to `/product/$id` | Call `addToCart(productId)` with duplicate check, auth check & feedback toast |
| Cart Icon in Desktop Header | Missing in `Navbar.tsx` | Add Cart button with badge linking to `/cart` |
| Protected `/cart` Route | Publicly accessible component | Enforce `<ProtectedRoute>` with `/login?redirect=/cart` redirect |
| Cart Page Header | Generic breadcrumb | "Your Rental Cart" + "Review your selected items before booking." + count + "Continue Shopping" |
| Cart Item Cards | Basic thumb + price | Image panel, title, brand/category, location, price/day, dates/duration, remove action, view product action |
| Rental Dates & Availability | Generic notice | Display selected dates or "Select rental dates" CTA; show availability status |
| Order Summary Panel | Static note | Number of products, daily subtotal, deposit note, final estimated total, "Proceed to Booking" CTA |
| Empty Cart State | Basic block | "Your cart is empty" + "Explore rentals and add the items you need." + "Explore Rentals" button -> `/explore` |
| Renter Authorization | Handled in backend | Verify renter-only role handling and cross-account isolation |
| Zero Git Pushes | Local working tree | Strictly no commits or pushes to Git without user approval |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Frontend State & API Hardening (`useCart.tsx`)
- Fix `isCartEnabled` so that whenever `user` and `token` exist, `useCart` queries the backend cart count and items seamlessly regardless of path (including `/`, `/explore`, `/browse`, `/cart`).
- Add a helper `isProductInCart(productId: string): boolean` for fast O(1) checks.
- Ensure `CartContext` exports safely and gracefully degrades if rendered outside provider (e.g. in unit test stubs).

### Step 2: Product Card Interactive Cart Button (`RentalProductCard.tsx`)
- Wire both `explore` and `portrait` bottom-right cart buttons to `handleCartClick`.
- If logged out: toast "Please log in to add items to your rental cart" with direct action to log in preserving current URL.
- If already in cart: toast "Item already in cart" with "View Cart" action.
- When clicked: call `addToCart(productId)`, show "Added [title] to cart!", update cart count, prevent event propagation.
- Maintain disabled/loading state during mutation to prevent rapid duplicate clicks.

### Step 3: Desktop Header Navigation Cart Integration (`Navbar.tsx`)
- Add a cart button with `<ShoppingCart />` icon and animated/static badge displaying `cartCount` (when `cartCount > 0`).
- Links to `/cart`.
- Accessible with minimum 44×44px hit target, keyboard focus rings, and dark/light mode styles.

### Step 4: Redesign the Rental Cart Page (`frontend/src/pages/Cart.tsx`)
- Protect route with `<ProtectedRoute>`.
- Header:
  - "Your Rental Cart"
  - "Review your selected items before booking."
  - Total unique items count pill.
  - "Continue Shopping" link back to `/explore`.
  - "Clear Cart" button with confirmation.
- Empty State:
  - Clean card with `<ShoppingBag />` icon.
  - "Your cart is empty"
  - "Explore rentals and add the items you need."
  - CTA button: "Explore Rentals" -> `/explore`.
- Cart Items List (Left Column):
  - Inset light panel for product thumbnail (`rounded-xl bg-neutral-100 dark:bg-neutral-800 object-cover`).
  - Product title, category/brand, location (`<MapPin />`).
  - Rental daily rate (`₹.../day`).
  - Rental dates status:
    - If dates selected: "Rental Period: [start] to [end] ([days] days)" -> calculate estimated total.
    - If dates not selected: "Dates not selected yet" with "Select Dates" action that navigates to `/product/$id`.
  - Actions:
    - "View Product" link.
    - "Remove item" button with `<Trash2 />`.
- Order Summary Card (Right Column):
  - Sticky container on desktop (`rounded-3xl border bg-white dark:bg-[#1E1E1E] p-6`).
  - Selected products count.
  - Daily rental subtotal (`₹.../day`).
  - Payent Shield security coverage note.
  - Estimated total.
  - Primary button: **"Proceed to Booking"** -> navigates to `/checkout?id={firstItemId}` (or first item with dates).

### Step 5: Route Protection (`frontend/src/routes/cart.tsx` & `frontend/src/routes/payent/cart.tsx`)
- Wrap route components in `<ProtectedRoute>` so unauthenticated requests redirect cleanly to `/login?redirect=/cart`.

### Step 6: Testing & Verification
- Unit tests: Run existing 54 tests to ensure zero regressions on `RentalProductCard`, `Navbar`, and routes.
- Add specific test suite for Cart behavior (`cart.test.ts`).
- Production build: `npm run build` to verify client and SSR bundles.
- Headless Chrome live verification: Capture screenshots of the empty cart, populated cart, and cart buttons across desktop and mobile viewports.
- Generate reports:
  - `RENTER_CART_IMPLEMENTATION_REPORT.md`
  - `RENTER_CART_RUNTIME_VERIFICATION_REPORT.md`
  - `RENTER_CART_CHANGELOG.md`

---

## 4. Safety & Commitments
- **Zero Git Pushes:** Strictly forbidden to commit or push to Git without user permission.
- **Backend Reuse:** Reusing the existing FastAPI `/api/cart` and `cart_items` tables.
- **Security:** Renter identity derived from JWT token. Cross-account isolation guaranteed.
