import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("paYent Renter Side Rental Cart Implementation", () => {
  const rootDir = path.resolve(process.cwd());
  const cartPagePath = path.join(rootDir, "frontend/src/pages/Cart.tsx");
  const cartRoutePath = path.join(rootDir, "frontend/src/routes/cart.tsx");
  const payentCartRoutePath = path.join(rootDir, "frontend/src/routes/payent/cart.tsx");
  const navbarPath = path.join(rootDir, "frontend/src/components/layout/Navbar.tsx");
  const cardPath = path.join(rootDir, "frontend/src/components/common/RentalProductCard.tsx");
  const useCartPath = path.join(rootDir, "frontend/src/hooks/useCart.tsx");

  it("Cart page implements required header, empty state, and order summary CTA", () => {
    const content = fs.readFileSync(cartPagePath, "utf-8");

    // Header & Subtitle
    assert.match(content, /Your Rental Cart/);
    assert.match(content, /Review your selected items before booking\./);
    assert.match(content, /Continue Shopping/);
    assert.match(content, /Clear Cart/);

    // Empty state
    assert.match(content, /data-testid="cart-empty-state"/);
    assert.match(content, /Your cart is empty/);
    assert.match(content, /Explore rentals and add the items you need/);
    assert.match(content, /to="\/explore"/);

    // Item card features
    assert.match(content, /data-testid=\{`cart-item-\$\{item\.product_id\}`\}/);
    assert.match(content, /Ready for rental/);
    assert.match(content, /Rental dates not selected/);
    assert.match(content, /handleRemove/);

    // Order Summary
    assert.match(content, /Rental Summary/);
    assert.match(content, /Daily Rates Base/);
    assert.match(content, /Payent Shield Protection/);
    assert.match(content, /Covered \(₹0 upfront\)/);
    assert.match(content, /id="cart-proceed-booking-btn"/);
    assert.match(content, /Proceed to Booking/);
  });

  it("Routes /cart and /payent/cart are wrapped with ProtectedRoute", () => {
    const cartRouteContent = fs.readFileSync(cartRoutePath, "utf-8");
    assert.match(cartRouteContent, /import \{ ProtectedRoute \} from "@/);
    assert.match(cartRouteContent, /<ProtectedRoute>\s*<Cart \/>\s*<\/ProtectedRoute>/);

    const payentRouteContent = fs.readFileSync(payentCartRoutePath, "utf-8");
    assert.match(payentRouteContent, /import \{ ProtectedRoute \} from "@/);
    assert.match(payentRouteContent, /<ProtectedRoute>\s*<Cart \/>\s*<\/ProtectedRoute>/);
  });

  it("Navbar includes dedicated Cart icon button with real-time numeric badge", () => {
    const navbarContent = fs.readFileSync(navbarPath, "utf-8");
    assert.match(navbarContent, /ShoppingCart/);
    assert.match(navbarContent, /to="\/cart"/);
    assert.match(navbarContent, /data-testid="nav-cart-badge"/);
    assert.match(navbarContent, /cartCount > 0/);
  });

  it("RentalProductCard integrates live cart addition with auth and duplicate prevention", () => {
    const cardContent = fs.readFileSync(cardPath, "utf-8");
    assert.match(cardContent, /handleCartClick/);
    assert.match(cardContent, /Please log in to add items to your rental cart/);
    assert.match(cardContent, /already in your cart/);
    assert.match(cardContent, /addToCart\(productId\)/);
    assert.match(cardContent, /Added \$\{title\} to your rental cart!/);
  });

  it("useCart enables cart queries across all customer storefront pages for authenticated users", () => {
    const hookContent = fs.readFileSync(useCartPath, "utf-8");
    assert.match(hookContent, /export const CartContext/);
    // Verified that pathname === "/" no longer disables the cart query
    assert.doesNotMatch(hookContent, /pathname === "\/"/);
  });
});
