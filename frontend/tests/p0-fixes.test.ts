import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CANONICAL_CATEGORY_LABELS,
  normalizeCategoryParam,
  getCategoryDisplayLabel,
  matchesProductCategory,
} from "../src/utils/categoryFilter.ts";
import { parseKycStatusResponse } from "../src/utils/kyc.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const requireFromTest = createRequire(import.meta.url);

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, "src", relPath), "utf8");
}

function loadBundledSrc<T = Record<string, unknown>>(relPath: string): T {
  const result = buildSync({
    entryPoints: [path.join(FRONTEND_ROOT, "src", relPath)],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    tsconfig: path.join(FRONTEND_ROOT, "tsconfig.json"),
    packages: "external",
    jsx: "automatic",
    loader: {
      ".webp": "dataurl",
      ".jpg": "dataurl",
      ".png": "dataurl",
      ".svg": "dataurl",
    },
  });
  const mod = { exports: {} as T };
  const fn = new Function("require", "exports", "module", result.outputFiles[0].text);
  fn(requireFromTest, mod.exports, mod);
  return mod.exports;
}

describe("F-01: Wishlist product ID passing, rollback, and synchronization", () => {
  it("RentalProductCard passes string product.id to toggle() and has(), with aria-pressed", () => {
    const card = readSrc("components/common/RentalProductCard.tsx");
    assert.match(card, /const productId = String\(product\.id\);/);
    assert.match(card, /has\(productId\)/);
    assert.match(card, /await toggle\(productId\)/);
    assert.doesNotMatch(card, /toggle\(product\)/);
    assert.match(card, /aria-pressed=\{isWishlisted\}/);
    assert.match(card, /if \(!succeeded\)/);
  });

  it("useWishlist normalizes string IDs, locks per-ID toggles, safely reverts failures, and syncs auth events", () => {
    const hook = readSrc("hooks/useWishlist.ts");
    assert.match(hook, /_pendingToggleIds/);
    assert.match(hook, /async \(id: string\): Promise<boolean>/);
    assert.match(hook, /const wasWishlisted = _globalWishlistIds\.includes\(targetId\)/);
    const toggleSection = hook.slice(hook.indexOf("const toggle"));
    assert.doesNotMatch(toggleSection, /catch[\s\S]*fetchWishlistDeduplicated/);
    assert.match(hook, /window\.addEventListener\("storage", handleStorageUpdate\)/);
    assert.match(hook, /window\.addEventListener\("payent:storage_change", handleStorageUpdate\)/);
  });

  it("Wishlist page compares stringified product IDs and Product type exposes API fields", () => {
    const wishlist = readSrc("pages/Wishlist.tsx");
    assert.match(wishlist, /ids\.includes\(String\(p\.id\)\)/);
    const types = readSrc("types/index.ts");
    assert.match(types, /daily_rate\?: number;/);
    assert.match(types, /name\?: string;/);
  });
});

describe("F-02: Category filter URL parameter canonicalization and filtering", () => {
  it("normalizeCategoryParam reads canonical cat first and falls back to legacy category", () => {
    assert.equal(normalizeCategoryParam({ cat: "electronics" }), "electronics");
    assert.equal(normalizeCategoryParam({ category: "cameras" }), "cameras");
    assert.equal(
      normalizeCategoryParam({ cat: "vehicles", category: "cameras" }),
      "vehicles"
    );
    assert.equal(normalizeCategoryParam({ category: "   " }), undefined);
    assert.equal(normalizeCategoryParam({}), undefined);
  });

  it("matchesProductCategory resolves Home parent IDs and Browse granular IDs", () => {
    assert.equal(matchesProductCategory("laptops", "electronics"), true);
    assert.equal(matchesProductCategory("audio", "electronics"), true);
    assert.equal(matchesProductCategory("bikes", "vehicles"), true);
    assert.equal(matchesProductCategory("drones", "cameras"), true);
    assert.equal(matchesProductCategory("sound", "music"), true);
    assert.equal(matchesProductCategory("console", "gaming"), true);
    assert.equal(matchesProductCategory("drills", "tools"), true);
    assert.equal(matchesProductCategory("cameras", "vehicles"), false);
    assert.equal(matchesProductCategory("Sony", "all"), true);
  });

  it("getCategoryDisplayLabel maps canonical IDs cleanly", () => {
    assert.equal(CANONICAL_CATEGORY_LABELS.electronics, "Electronics");
    assert.equal(getCategoryDisplayLabel("electronics"), "Electronics");
    assert.equal(getCategoryDisplayLabel("cameras"), "Cameras & Photography");
    assert.equal(getCategoryDisplayLabel("custom"), "Custom");
  });

  it("Home Categories and SearchOverlay emit canonical cat param, and all browse routes normalize it", () => {
    const homeCats = readSrc("components/home/Categories.tsx");
    const overlay = readSrc("components/home/SearchOverlay.tsx");
    assert.doesNotMatch(homeCats, /search:\s*\{\s*category:/);
    assert.doesNotMatch(overlay, /search:\s*\{\s*category:/);
    assert.match(homeCats, /search:\s*\{\s*cat:/);
    assert.match(overlay, /search:\s*\{\s*cat:/);

    for (const route of [
      "routes/browse.tsx",
      "routes/categories.tsx",
      "routes/filters.tsx",
      "routes/payent/explore.tsx",
    ]) {
      const src = readSrc(route);
      assert.match(src, /normalizeCategoryParam\(search\)/, `${route} must normalize cat param`);
    }
  });

  it("Categories and Filters pages apply selectedCats even when search/ML results exist", () => {
    const catsPage = readSrc("pages/Categories.tsx");
    const filtersPage = readSrc("pages/Filters.tsx");
    assert.match(catsPage, /matchesProductCategory\(p\.category, c\)/);
    assert.match(catsPage, /normalizeCategoryParam/);
    assert.match(filtersPage, /matchesProductCategory\(p\.category, c\)/);
    assert.match(filtersPage, /normalizeCategoryParam/);
  });
});

describe("F-03: Orders Receipt Modal imports Loader2 and never fabricates paid receipts", () => {
  it("Orders.tsx imports Loader2 and surfaces explicit receipt errors without fake paid fallbacks", () => {
    const orders = readSrc("pages/Orders.tsx");
    assert.match(orders, /\bLoader2\b[\s\S]*from\s+"lucide-react"/);
    assert.doesNotMatch(orders, /REC-\$\{order\.id\.replace/);
    assert.doesNotMatch(orders, /payment_status:\s*order\.paymentStatus[\s\S]*"paid"/);
    assert.match(orders, /receiptError/);
    assert.match(orders, /handleCloseReceipt/);
    assert.match(orders, /disabled=\{receiptLoading \|\| Boolean\(receiptError\) \|\| !receiptData\}/);
  });
});

describe("F-04: Button trailing icon orientation is preserved without global CSS/prop overrides", () => {
  it("styles.css and Button components no longer force SVG order-first / order: -1", () => {
    const css = readSrc("styles.css");
    const commonBtn = readSrc("components/common/Button.tsx");
    const uiBtn = readSrc("components/ui/button.tsx");

    assert.doesNotMatch(css, /order:\s*-1/);
    assert.doesNotMatch(commonBtn, /order-first/);
    assert.doesNotMatch(uiBtn, /order-first/);
    assert.match(commonBtn, /rightIcon\s*\?\s*rightIcon\s*:\s*null/);
    assert.match(uiBtn, /rightIcon\?: React\.ReactNode;/);
    assert.match(uiBtn, /rightIcon\s*\?\s*rightIcon\s*:\s*null/);

    const clientAssetsDir = path.join(FRONTEND_ROOT, "dist", "client", "assets");
    if (fs.existsSync(clientAssetsDir)) {
      const builtCss = fs
        .readdirSync(clientAssetsDir)
        .filter((f) => f.endsWith(".css"))
        .map((f) => fs.readFileSync(path.join(clientAssetsDir, f), "utf8"))
        .join("\n");
      assert.equal(builtCss.includes("data-no-auto-order"), false);
      assert.doesNotMatch(builtCss, /order\s*:\s*-1/);
    }
  });

  it("renders common Button and ui/button leading & trailing icons in natural DOM order without order-first", () => {
    const { Button } = loadBundledSrc<{ Button: React.ComponentType<any> }>(
      "components/common/Button.tsx"
    );
    const { Button: UiButton } = loadBundledSrc<{ Button: React.ComponentType<any> }>(
      "components/ui/button.tsx"
    );

    const commonHtml = renderToStaticMarkup(
      React.createElement(
        Button,
        {
          leftIcon: React.createElement("span", { "data-slot": "lead" }, "L"),
          rightIcon: React.createElement("span", { "data-slot": "trail" }, "R"),
        },
        "Explore Rentals"
      )
    );
    assert.doesNotMatch(commonHtml, /order-first/);
    assert.ok(commonHtml.indexOf('data-slot="lead"') < commonHtml.indexOf("Explore Rentals"));
    assert.ok(commonHtml.indexOf("Explore Rentals") < commonHtml.indexOf('data-slot="trail"'));

    const uiHtml = renderToStaticMarkup(
      React.createElement(
        UiButton,
        {
          leftIcon: React.createElement("span", { "data-slot": "lead" }, "L"),
          rightIcon: React.createElement("span", { "data-slot": "trail" }, "R"),
        },
        "Next Page"
      )
    );
    assert.doesNotMatch(uiHtml, /order-first/);
    assert.ok(uiHtml.indexOf('data-slot="lead"') < uiHtml.indexOf("Next Page"));
    assert.ok(uiHtml.indexOf("Next Page") < uiHtml.indexOf('data-slot="trail"'));
  });
});

describe("F-05: No fake fallback products, owners, ratings, locations, or fake PAN strings", () => {
  it("findFallbackProduct resolves exact fallback IDs and returns undefined for missing or substring-only IDs", () => {
    const { findFallbackProduct } = loadBundledSrc<{
      findFallbackProduct: (id: string | number) => { id?: string } | undefined;
    }>("utils/fallbackProducts.ts");

    assert.equal(findFallbackProduct("1"), undefined);
    assert.equal(findFallbackProduct("sony"), undefined);
    assert.equal(findFallbackProduct("sony-fake-id"), undefined);
    assert.equal(findFallbackProduct("does-not-exist"), undefined);
    assert.equal(findFallbackProduct("sony-alpha-a7-iii")?.id, "sony-alpha-a7-iii");
    assert.equal(findFallbackProduct("  SONY-ALPHA-A7-III ")?.id, "sony-alpha-a7-iii");
  });

  it("fallbackProducts and ProductDetails remove Sony/1 hijacks and hardcoded fake lender/location/rating data", () => {
    const fb = readSrc("utils/fallbackProducts.ts");
    const pd = readSrc("pages/ProductDetails.tsx");

    assert.doesNotMatch(fb, /targetKey === "1"\s*\|\|\s*targetKey\.includes\("sony"\)/);
    assert.doesNotMatch(pd, /targetKey === "1"\s*\|\|\s*targetKey\.includes\("sony"\)/);
    assert.doesNotMatch(pd, /Sai Teja/);
    assert.doesNotMatch(pd, /Vizag, AP/);
    assert.doesNotMatch(pd, /Arun Kumar/);
    assert.doesNotMatch(pd, /formatOwnerAddress\(product\)\s*\|\|\s*"Bengaluru"/);
    assert.doesNotMatch(pd, /reviewCount:\s*product\.reviews\s*\|\|\s*124/);
    assert.doesNotMatch(pd, /\|\|\s*84\}/);
    assert.match(pd, /productError/);
    assert.match(pd, /Unable to load product/);
  });

  it("Profile removes XXXXX1234F, guards loading state, tracks statsError, and never toasts success on save failure", () => {
    const profile = readSrc("pages/Profile.tsx");
    assert.doesNotMatch(profile, /XXXXX1234F/);
    assert.match(profile, /if \(!ready && !user\)/);
    assert.match(profile, /statsError/);
    assert.match(profile, /toast\.error\(msg\)/);
  });
});

describe("F-06: Orders page removes DEFAULT_SAMPLE_ORDERS seeding and passes typed search params to /payments", () => {
  it("Orders.tsx removes DEFAULT_SAMPLE_ORDERS, strips legacy sample IDs, and navigates to /payments with search params", () => {
    const orders = readSrc("pages/Orders.tsx");
    assert.doesNotMatch(orders, /DEFAULT_SAMPLE_ORDERS/);
    assert.match(orders, /stripLegacySampleOrders/);
    assert.match(orders, /ord_1793113916585/);
    assert.match(
      orders,
      /navigate\(\{\s*to:\s*"\/payments",\s*search:\s*\{\s*q:\s*"",\s*status:\s*"all"\s*\}\s*\}\)/
    );
  });
});

describe("F-07: Filters page checkboxes are native accessible controls without label onClick double-toggles", () => {
  it("Filters.tsx uses sr-only peer native checkbox inputs wired to htmlFor and keyboard focus rings", () => {
    const filters = readSrc("pages/Filters.tsx");
    assert.doesNotMatch(filters, /<label[\s\S]{0,120}onClick=\{/);
    assert.match(filters, /htmlFor=\{inputId\}/);
    assert.match(filters, /<input[\s\S]{0,160}type="checkbox"/);
    assert.match(filters, /peer-focus-visible:ring-2/);
    assert.match(filters, /aria-disabled=\{isOnlySelected\}/);
  });
});

describe("F-08: Profile KYC status parses top-level /api/kyc/status responses accurately", () => {
  it("parseKycStatusResponse parses flat backend JSON and optional data envelopes safely", () => {
    const approved = parseKycStatusResponse({
      success: true,
      accountType: "payrent",
      expectedDocumentType: "PAN",
      status: "APPROVED",
      documentType: "PAN",
      maskedNumber: "XXXXX6789K",
      submittedAt: "2026-10-01T10:00:00Z",
      providerStatus: "verified",
      allowResubmission: false,
    });
    assert.deepEqual(approved, {
      status: "APPROVED",
      documentType: "PAN",
      maskedNumber: "XXXXX6789K",
      submittedAt: "2026-10-01T10:00:00Z",
      verifiedAt: null,
      rejectionReason: null,
      providerStatus: "verified",
      allowResubmission: false,
    });

    const notStarted = parseKycStatusResponse({
      success: true,
      status: "NOT_STARTED",
      documentType: null,
      maskedNumber: null,
    });
    assert.equal(notStarted?.status, "NOT_STARTED");
    assert.equal(notStarted?.documentType, null);
    assert.equal(notStarted?.maskedNumber, null);

    const unknownStatus = parseKycStatusResponse({
      success: true,
      status: "WEIRD_UNKNOWN_STATUS",
    });
    assert.equal(unknownStatus?.status, "NOT_STARTED");

    assert.equal(parseKycStatusResponse({ success: false }), null);
    assert.equal(parseKycStatusResponse(null), null);
  });

  it("Profile.tsx no longer accesses res.data on getKycStatus or user?.kycStatus", () => {
    const profile = readSrc("pages/Profile.tsx");
    assert.doesNotMatch(profile, /res\.data/);
    assert.doesNotMatch(profile, /user\?\.kycStatus/);
    assert.match(profile, /parseKycStatusResponse/);
    assert.match(profile, /kycLoading/);
    assert.match(profile, /kycError/);
    assert.match(profile, /payent_kyc_updated/);
  });
});
