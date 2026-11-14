import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSync } from "esbuild";
import { createRequire } from "node:module";

const root = path.resolve(process.cwd(), "frontend");
const readSrc = (file: string) => fs.readFileSync(path.join(root, "src", file), "utf-8");
const requireFromTest = createRequire(import.meta.url);

function loadBundledSrc<T = Record<string, unknown>>(relPath: string): T {
  const result = buildSync({
    entryPoints: [path.join(root, "src", relPath)],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    tsconfig: path.join(root, "tsconfig.json"),
  });
  const code = result.outputFiles[0].text;
  const mod: { exports: unknown } = { exports: {} };
  const fn = new Function("module", "exports", "require", code);
  fn(mod, mod.exports, requireFromTest);
  return mod.exports as T;
}

describe("paYent Phase 5 Critical Bug Fixes & Resilience", () => {
  it("Fix 1: CustomerReviews handles empty state, error with retry, field normalization & no animate-pulse", () => {
    const reviewsSrc = readSrc("components/home/CustomerReviews.tsx");

    // Empty state without disappearing (not returning null)
    assert.match(reviewsSrc, /No customer reviews yet/);
    assert.match(reviewsSrc, /Be the first to share your rental experience/);
    assert.doesNotMatch(reviewsSrc, /if\s*\(!isLoading\s*&&\s*reviews\.length\s*===\s*0\)\s*return\s*null;/);

    // Error state with retry
    assert.match(reviewsSrc, /Unable to load reviews/);
    assert.match(reviewsSrc, /onClick=\{loadReviews\}/);

    // Field normalization for API compatibility
    assert.match(reviewsSrc, /product_title/);
    assert.match(reviewsSrc, /productTitle/);
    assert.match(reviewsSrc, /user_name/);

    // No pulse shimmer
    assert.doesNotMatch(reviewsSrc, /animate-pulse/);

    // Mobile swipe & desktop buttons with min 44px hitboxes
    assert.match(reviewsSrc, /min-h-\[44px\]/);
  });

  it("Fix 2: Exclude Authenticated User's Listings from Recommendations", () => {
    const recSectionSrc = readSrc("components/recommendations/RecommendationSection.tsx");
    const recHomeSrc = readSrc("components/home/RecommendedForYou.tsx");
    const apiSrc = readSrc("utils/api.ts");

    // Both components import isUserOwnProduct correctly
    assert.match(recSectionSrc, /import\s*\{[^}]*isUserOwnProduct[^}]*\}\s*from\s*["']@\/utils\/productFilters["']/);
    assert.match(recHomeSrc, /import\s*\{[^}]*isUserOwnProduct[^}]*\}\s*from\s*["']@\/utils\/productFilters["']/);

    // Frontend passes Authorization token
    assert.match(apiSrc, /getPersonalizedRecommendations[\s\S]*?headers\["Authorization"\]\s*=\s*`Bearer \$\{token\}`/);
    assert.match(apiSrc, /getTrendingRecommendations[\s\S]*?headers\["Authorization"\]\s*=\s*`Bearer \$\{token\}`/);
    assert.match(apiSrc, /getSimilarRecommendations[\s\S]*?headers\["Authorization"\]\s*=\s*`Bearer \$\{token\}`/);

    // Frontend filters user's own products
    assert.match(recSectionSrc, /isUserOwnProduct\(p,\s*user\)/);
    assert.match(recHomeSrc, /isUserOwnProduct\(p,\s*user\)/);

    // Runtime execution and null-safety of isUserOwnProduct
    const { isUserOwnProduct } = loadBundledSrc<{ isUserOwnProduct: (p: any, u: any) => boolean }>("utils/productFilters.ts");
    const testUser = { email: "alice@example.com", id: "u-101", fullName: "Alice Smith" };

    // 1. Matches by user email
    assert.equal(isUserOwnProduct({ id: "p-1", owner_email: "alice@example.com" }, testUser), true);
    assert.equal(isUserOwnProduct({ id: "p-1", owner: { email: "alice@example.com" } }, testUser), true);

    // 2. Matches by user ID
    assert.equal(isUserOwnProduct({ id: "p-2", owner_id: "u-101" }, testUser), true);
    assert.equal(isUserOwnProduct({ id: "p-2", owner: { id: "u-101" } }, testUser), true);

    // 3. Does not match products of other users
    assert.equal(isUserOwnProduct({ id: "p-3", owner_email: "bob@example.com", owner_id: "u-202" }, testUser), false);

    // 4. Guest user (null or undefined) returns false without throwing
    assert.equal(isUserOwnProduct({ id: "p-4", owner_email: "bob@example.com" }, null), false);
    assert.equal(isUserOwnProduct({ id: "p-4", owner_email: "bob@example.com" }, undefined), false);

    // 5. Null or undefined product returns false without throwing
    assert.equal(isUserOwnProduct(null, testUser), false);
    assert.equal(isUserOwnProduct(undefined, testUser), false);
  });

  it("Fix 3: Order page & Checkout respect blocked and reserved dates", () => {
    const checkoutSrc = readSrc("pages/Checkout.tsx");
    const calendarSrc = readSrc("components/booking/RenterBookingCalendar.tsx");

    // Checkout queries availability and blocks conflicting submission
    assert.match(checkoutSrc, /\/api\/products\/\$\{encodeURIComponent\(product\.id\)\}\/availability/);
    assert.match(checkoutSrc, /dateConflictError/);
    assert.match(checkoutSrc, /Dates Unavailable|conflict/i);

    // Booking calendar computes valid end dates skipping blocked dates
    assert.match(calendarSrc, /findNextAvailableEndDate/);
  });

  it("Fix 4: Filters and Explore navigation replaces history to eliminate back loop & syncs sort URL param", () => {
    const filtersSrc = readSrc("pages/Filters.tsx");
    const categoriesSrc = readSrc("pages/Categories.tsx");

    // Filters replaces history entry to prevent infinite loop
    assert.match(filtersSrc, /navigate\(\{\s*to:\s*fromRoute[\s\S]*?replace:\s*true\s*\}\)/);
    assert.match(filtersSrc, /handleBack/);

    // Categories syncs sort to search param and restores scroll position
    assert.match(categoriesSrc, /handleSortSelect/);
    assert.match(categoriesSrc, /search\.sort/);
    assert.match(categoriesSrc, /payent_browse_scroll/);
  });

  it("Resilience & Timeout: fetchWithTimeout preserves AbortError and getFilteredProductsPage falls back seamlessly", () => {
    const apiSrc = readSrc("utils/api.ts");
    const newArrivalsSrc = readSrc("components/home/NewArrivals.tsx");
    const exploreSrc = readSrc("components/home/ExploreRentals.tsx");

    // Only converts to TimeoutError when isTimeout is true
    assert.match(apiSrc, /if\s*\(isTimeout\)\s*\{\s*const timeoutErr = new Error/);
    assert.doesNotMatch(apiSrc, /if\s*\(isTimeout\s*\|\|\s*e\?\.name\s*===\s*"AbortError"\)/);

    // getFilteredProductsPage recovers with fallbackPool on timeout or error
    assert.match(apiSrc, /fallbackPool\.length\s*>\s*0/);

    // NewArrivals and ExploreRentals do not display error banner if products already exist in state
    assert.match(newArrivalsSrc, /if\s*\(current\.length\s*===\s*0\)\s*\{\s*setError/);
    assert.match(exploreSrc, /if\s*\(current\.length\s*===\s*0\)\s*\{\s*setError/);
  });

  it("SSR/CSR Hydration Parity: Home sections do not branch initial state on typeof window === 'undefined'", () => {
    const exploreSrc = readSrc("components/home/ExploreRentals.tsx");
    const newArrivalsSrc = readSrc("components/home/NewArrivals.tsx");
    const recommendedSrc = readSrc("components/home/RecommendedForYou.tsx");

    // Must not branch initial useState on typeof window === "undefined"
    assert.doesNotMatch(exploreSrc, /useState<Product\[\]>\(\s*\(\)\s*=>\s*\{\s*if\s*\(typeof window === "undefined"\)/);
    assert.doesNotMatch(newArrivalsSrc, /useState<Product\[\]>\(\s*\(\)\s*=>\s*\{\s*if\s*\(typeof window === "undefined"\)/);
    assert.doesNotMatch(recommendedSrc, /useState<Product\[\]>\(\s*\(\)\s*=>\s*\{\s*if\s*\(typeof window === "undefined"\)/);

    // Initial products are deterministic constants
    assert.match(exploreSrc, /const INITIAL_EXPLORE_PRODUCTS/);
    assert.match(newArrivalsSrc, /const INITIAL_NEW_ARRIVALS/);
    assert.match(recommendedSrc, /const INITIAL_RECOMMENDED_PRODUCTS/);

    // No suppressHydrationWarning workarounds
    assert.doesNotMatch(exploreSrc, /suppressHydrationWarning/);
    assert.doesNotMatch(newArrivalsSrc, /suppressHydrationWarning/);
    assert.doesNotMatch(recommendedSrc, /suppressHydrationWarning/);
  });
});
