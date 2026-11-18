import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath: string): string {
  const full = path.resolve(process.cwd(), "frontend/src", relPath);
  return fs.readFileSync(full, "utf8");
}

describe("paYent Universal Navigation & Button States Verification", () => {
  it("Navigation4 defines all 5 primary dock buttons with exact required IDs and destinations", () => {
    const nav4 = readSrc("components/navigation/Navigation4.tsx");

    // 5 primary dock buttons
    assert.match(nav4, /id:\s*"home"[\s\S]*?onClick:\s*\(\)\s*=>\s*navigate\(\{\s*to:\s*"\/payent"\s*\}\)/);
    assert.match(nav4, /id:\s*"explore"[\s\S]*?onClick:\s*\(\)\s*=>\s*navigate\(\{\s*to:\s*"\/browse"\s*\}\)/);
    assert.match(nav4, /id:\s*"orders"[\s\S]*?onClick:\s*\(\)\s*=>\s*navigate\(\{\s*to:\s*"\/orders"\s*\}\)/);
    assert.match(nav4, /id:\s*"profile"[\s\S]*?onClick:\s*\(\)\s*=>\s*navigate\(\{\s*to:\s*"\/profile"\s*\}\)/);
    assert.match(nav4, /id:\s*"more"[\s\S]*?onClick:\s*\(\)\s*=>\s*navigate\(\{\s*to:\s*"\/dashboard"\s*\}\)/);
  });

  it("Explore button is active across all catalog, gear exploration and product routes", () => {
    const nav4 = readSrc("components/navigation/Navigation4.tsx");

    // Checks all exploration routes
    assert.match(nav4, /pathname\.startsWith\("\/browse"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/explore"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/explore"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/categories"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/filters"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/product"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/products"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/products"\)/);
  });

  it("Orders button is active across all order, cart, checkout, payment, booking and delivery routes", () => {
    const nav4 = readSrc("components/navigation/Navigation4.tsx");

    assert.match(nav4, /pathname\.startsWith\("\/orders"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/orders"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/cart"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/cart"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/checkout"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payment"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payments"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/bookings"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/bookings"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/delivery"\)/);
  });

  it("Profile button is active across profile, settings, and KYC routes", () => {
    const nav4 = readSrc("components/navigation/Navigation4.tsx");

    assert.match(nav4, /pathname\.startsWith\("\/profile"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/profile"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/settings"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/settings"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/kyc"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/kyc"\)/);
  });

  it("More button is active across dashboard, wishlist, messages, notifications, and support routes", () => {
    const nav4 = readSrc("components/navigation/Navigation4.tsx");

    assert.match(nav4, /pathname\.startsWith\("\/dashboard"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/wishlist"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/wishlist"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/messages"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/messages"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/notifications"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/payent\/notifications"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/support"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/faq"\)/);
    assert.match(nav4, /pathname\.startsWith\("\/contact"\)/);
  });

  it("Orders page quick cart button is visible on mobile (< md) without breakpoint gaps", () => {
    const orders = readSrc("pages/Orders.tsx");
    assert.match(orders, /id="orders-top-cart-btn"[\s\S]*?to="\/cart"/);
    assert.match(orders, /className="md:hidden inline-flex items-center gap-1.5/);
    assert.match(orders, /<ShoppingCart/);
  });

  it("Profile page includes theme toggle button with immediate toggleTheme action", () => {
    const profile = readSrc("pages/Profile.tsx");
    assert.match(profile, /id="profile-theme-toggle-btn"/);
    assert.match(profile, /onClick=\{toggleTheme\}/);
    assert.match(profile, /aria-label=\{theme === "dark" \? "Switch to Light Theme" : "Switch to Dark Theme"\}/);
  });

  it("PayerntMobileBottomNav keeps More tab active on secondary drawer routes", () => {
    const payerntNav = readSrc("payernt/components/PayerntMobileBottomNav.tsx");
    assert.match(payerntNav, /isMoreActive\s*=\s*isMoreOpen\s*\|\|\s*moreItems\.some/);
    assert.match(payerntNav, /aria-label=\{tCommon\.more\}/);
  });

  it("BackButton component implements safe internal history verification and default /payent fallback", () => {
    const backBtn = readSrc("components/common/BackButton.tsx");
    assert.match(backBtn, /fallback\s*=\s*"\/payent"/);
    assert.match(backBtn, /hasInternalHistory[\s\S]*?window\.history\.length > 1/);
    assert.match(backBtn, /window\.history\.state\?\.idx > 0/);
    assert.match(backBtn, /window\.history\.back\(\)/);
    assert.match(backBtn, /navigate\(\{\s*to:\s*fallback\s*as\s*any\s*\}\)/);
    assert.match(backBtn, /id="page-back-button"/);
    assert.match(backBtn, /data-testid="back-button"/);
  });

  it("All primary customer pages implement BackButton with correct non-breaking fallbacks and top-left placement", () => {
    const pagesToCheck: Array<{ file: string; expectedFallback: string | RegExp; hasTopLeftWrapper?: boolean }> = [
      { file: "pages/Orders.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/ProductDetails.tsx", expectedFallback: `fallback="/browse"` },
      { file: "pages/Support.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Payment.tsx", expectedFallback: `fallback="/orders"` },
      { file: "pages/PaymentHistory.tsx", expectedFallback: `fallback="/orders"` },
      { file: "pages/BookingDetails.tsx", expectedFallback: `fallback="/orders"` },
      { file: "components/auth/AuthLayout.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/About.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Contact.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Reviews.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Dashboard.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Profile.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Settings.tsx", expectedFallback: `fallback="/profile"` },
      { file: "pages/Messages.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Notifications.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/PrivacyPolicy.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/DeviceVerificationPage.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/Filters.tsx", expectedFallback: /fallback=\{fromRoute\}/ },
      { file: "pages/Wishlist.tsx", expectedFallback: `fallback="/browse"` },
      { file: "pages/Checkout.tsx", expectedFallback: `fallback="/cart"` },
      { file: "pages/Cart.tsx", expectedFallback: `fallback="/explore"` },
      { file: "pages/BecomeLender.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/DeliveryTracking.tsx", expectedFallback: /fallback=\{isCustomer\s*\?\s*"\/orders"\s*:\s*"\/lender-portal"\}/ },
      { file: "pages/LenderPortal.tsx", expectedFallback: `fallback="/dashboard"` },
      { file: "pages/OTP.tsx", expectedFallback: `fallback="/login"` },
      { file: "pages/NotFound.tsx", expectedFallback: `fallback="/payent"` },
      { file: "pages/AccountPending.tsx", expectedFallback: `fallback="/payent"` },
    ];

    for (const page of pagesToCheck) {
      const src = readSrc(page.file);
      assert.ok(
        src.includes("BackButton"),
        `Expected ${page.file} to import or use BackButton`
      );
      if (typeof page.expectedFallback === "string") {
        assert.ok(
          src.includes(page.expectedFallback),
          `Expected ${page.file} to contain ${page.expectedFallback}`
        );
      } else {
        assert.match(
          src,
          page.expectedFallback,
          `Expected ${page.file} to match fallback pattern ${page.expectedFallback}`
        );
      }
    }
  });
});
