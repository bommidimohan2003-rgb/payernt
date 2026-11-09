import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const requireFromTest = createRequire(import.meta.url);

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, "src", relPath), "utf8");
}

function createRouterAndToastStubPlugin(): Plugin {
  return {
    name: "phase3-router-stubs",
    setup(buildHook) {
      buildHook.onResolve({ filter: /^@tanstack\/react-router$/ }, () => ({
        path: "tanstack-router-stub",
        namespace: "stub",
      }));
      buildHook.onResolve({ filter: /^sonner$/ }, () => ({
        path: "sonner-stub",
        namespace: "stub",
      }));
      buildHook.onLoad({ filter: /^tanstack-router-stub$/, namespace: "stub" }, () => ({
        resolveDir: FRONTEND_ROOT,
        contents: `
          const React = require("react");
          exports.Link = function Link(props) {
            const base = typeof props.to === "string" ? props.to : "/";
            const href = props.hash ? base + "#" + props.hash : base;
            return React.createElement("a", { href, className: props.className, id: props.id, "aria-label": props["aria-label"] }, props.children);
          };
          exports.useNavigate = function useNavigate() { return function () {}; };
          exports.useSearch = function useSearch() { return {}; };
          exports.useParams = function useParams() { return {}; };
          exports.useRouterState = function useRouterState(opts) {
            const state = { location: { pathname: "/payent" } };
            return opts && opts.select ? opts.select(state) : state;
          };
        `,
        loader: "js",
      }));
      buildHook.onLoad({ filter: /^sonner-stub$/, namespace: "stub" }, () => ({
        contents: `
          exports.toast = {
            success: function () {},
            error: function () {},
            info: function () {},
            warning: function () {},
          };
        `,
        loader: "js",
      }));
    },
  };
}

async function loadBundledModule<T = Record<string, unknown>>(relPath: string): Promise<T> {
  const result = await build({
    entryPoints: [path.join(FRONTEND_ROOT, "src", relPath)],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    tsconfig: path.join(FRONTEND_ROOT, "tsconfig.json"),
    packages: "external",
    jsx: "automatic",
    define: {
      "import.meta.env.VITE_API_URL": '""',
      "import.meta.env.VITE_PAYERNT_API_URL": '""',
      "import.meta.env": "{}",
    },
    plugins: [createRouterAndToastStubPlugin()],
    loader: {
      ".css": "empty",
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

describe("Phase 3 P2 Fixes (F-23 through F-34)", () => {
  it("F-23: Standardizes brand name/tagline to paYent & removes dead PayentLogoMark / unused ProductCard", async () => {
    const branding = await loadBundledModule<{
      BRAND_CONFIG: { name: string; tagline: string; description: string };
    }>("config/branding.ts");

    assert.equal(branding.BRAND_CONFIG.name, "paYent");
    assert.equal(branding.BRAND_CONFIG.tagline, "Get What You Need, Without Owning It.");
    assert.match(branding.BRAND_CONFIG.description, /Get What You Need, Without Owning It\./);

    const logoSrc = readSrc("components/common/LogoIcon.tsx");
    assert.equal(logoSrc.includes("PayentLogoMark"), false);

    assert.equal(
      fs.existsSync(path.join(FRONTEND_ROOT, "src/components/common/ProductCard.tsx")),
      false,
      "Unused legacy ProductCard.tsx should be removed"
    );

    const seoSrc = readSrc("utils/seo.ts");
    assert.match(seoSrc, /name:\s*"author",\s*content:\s*"paYent"/);
    assert.match(seoSrc, /property:\s*"og:site_name",\s*content:\s*"paYent"/);

    const preloaderSrc = readSrc("components/common/AppPreloader.tsx");
    assert.match(preloaderSrc, /\["p",\s*"a",\s*"Y",\s*"e",\s*"n",\s*"t"\]/);

    for (const rel of [
      "routes/__root.tsx",
      "routes/browse.tsx",
      "routes/categories.tsx",
      "routes/filters.tsx",
      "routes/wishlist.tsx",
      "routes/about.tsx",
      "routes/support.tsx",
      "routes/faq.tsx",
    ]) {
      const src = readSrc(rel);
      assert.match(src, /paYent/);
      assert.doesNotMatch(src, /\|\s*Payent\b|\|\s*PAYENT\b/);
    }

    const selectionSrc = readSrc("components/selection/ProductSelection.tsx");
    assert.match(selectionSrc, /paye₹nt/);
    assert.match(selectionSrc, /pay₹ent/);
  });

  it("F-24: Replaces transition-all, hover/active scale bounces & missing-image 404 fallbacks across Home & secondary UI", () => {
    const cleanTransitionFiles = [
      "components/common/Input.tsx",
      "components/home/Categories.tsx",
      "components/home/ExploreRentals.tsx",
      "components/home/NewArrivals.tsx",
      "components/home/CustomerReviews.tsx",
      "components/home/CreatorCommunity.tsx",
      "components/selection/ProductSelection.tsx",
      "pages/Orders.tsx",
      "pages/Support.tsx",
      "pages/About.tsx",
    ];

    for (const rel of cleanTransitionFiles) {
      const src = readSrc(rel);
      assert.doesNotMatch(src, /\btransition-all\b/, `${rel} should not contain transition-all`);
      assert.doesNotMatch(src, /\bscale-102\b|\bhover:scale-102\b|\bactive:scale-95\b|\bactive:scale-98\b/, `${rel} should not contain bouncy scale utilities`);
    }

    const pdSrc = readSrc("pages/ProductDetails.tsx");
    assert.doesNotMatch(pdSrc, /group-hover:scale-\[1\.02\]/);

    const aboutSrc = readSrc("pages/About.tsx");
    assert.doesNotMatch(aboutSrc, /group-hover:scale-105/);

    const cardSrc = readSrc("components/common/RentalProductCard.tsx");
    const filtersSrc = readSrc("pages/Filters.tsx");
    const overlaySrc = readSrc("components/home/SearchOverlay.tsx");
    for (const [name, src] of [
      ["RentalProductCard.tsx", cardSrc],
      ["Filters.tsx", filtersSrc],
      ["SearchOverlay.tsx", overlaySrc],
    ] as const) {
      assert.doesNotMatch(src, /\/placeholder-gear\.webp|\/placeholder\.png/, `${name} must not point to nonexistent placeholder image files`);
      assert.doesNotMatch(src, /photo-1516035069371-29a1b244cc32/, `${name} must not fall back to generic Unsplash DSLR photo`);
      assert.match(src, /<Package\b/, `${name} should render monochrome <Package /> fallback on missing/errored media`);
    }
  });

  it("F-25 & F-26: Cleans typography weights, uppercase wide tracking, italics, AA contrast & hype/exclamation copy", () => {
    const howItWorksSrc = readSrc("components/home/HowItWorks.tsx");
    assert.doesNotMatch(howItWorksSrc, /\bDISCOVER\b|\bENJOY & RETURN\b|\bSTEP\b/);
    assert.doesNotMatch(howItWorksSrc, /tracking-widest/);
    assert.doesNotMatch(howItWorksSrc, /frictionless/i);
    assert.match(howItWorksSrc, /Step \{s\.num\}/);
    assert.match(howItWorksSrc, /text-neutral-600 dark:text-neutral-400/);

    const whyChooseSrc = readSrc("components/home/WhyChoose.tsx");
    assert.doesNotMatch(whyChooseSrc, /world-class/i);

    const aboutSrc = readSrc("pages/About.tsx");
    assert.doesNotMatch(aboutSrc, /world-class/i);
    assert.doesNotMatch(aboutSrc, /\bfont-black\b/);

    for (const rel of [
      "components/common/LogoIcon.tsx",
      "components/common/AppPreloader.tsx",
      "components/home/CreatorCommunity.tsx",
      "pages/PrivacyPolicy.tsx",
      "pages/Orders.tsx",
      "pages/Profile.tsx",
      "pages/ProductDetails.tsx",
      "pages/Support.tsx",
    ]) {
      const src = readSrc(rel);
      assert.doesNotMatch(src, /\bfont-black\b|\bfont-extrabold\b/, `${rel} should use <= font-semibold outside Hero brand rules`);
    }

    const ordersSrc = readSrc("pages/Orders.tsx");
    assert.doesNotMatch(ordersSrc, /\bitalic\b/);
    assert.doesNotMatch(ordersSrc, /Booking location updated successfully!|Explore the marketplace to find gear!|copied to clipboard!|Payment verified!/);

    const pdSrc = readSrc("pages/ProductDetails.tsx");
    assert.doesNotMatch(pdSrc, /Terms & conditions accepted!/);

    const profileSrc = readSrc("pages/Profile.tsx");
    assert.doesNotMatch(profileSrc, /Profile photo updated successfully!/);

    const heroSrc = readSrc("components/home/Hero.tsx");
    assert.match(heroSrc, /Get What You Need, Without Owning It\./);
  });

  it("F-27: Hero emits single <img> per product (3 total) with exact width/height & single-layer shadows", async () => {
    const { Hero } = await loadBundledModule<{ Hero: React.ComponentType }>("components/home/Hero.tsx");
    const html = renderToStaticMarkup(React.createElement(Hero));

    const imgs = html.match(/<img\b[^>]*>/g) ?? [];
    assert.equal(imgs.length, 3, "Hero initial SSR HTML must emit 3 images instead of 6 duplicate light/dark nodes");
    assert.equal(html.includes("_dark.webp"), false, "Initial Light SSR render must not eagerly request dark Hero webp assets");

    for (const imgTag of imgs) {
      assert.match(imgTag, /\bwidth="(944|746|781)"/);
      assert.match(imgTag, /\bheight="(680|819|782)"/);
      assert.match(imgTag, /\bdecoding="async"/);
    }

    const heroSrc = readSrc("components/home/Hero.tsx");
    assert.match(heroSrc, /MutationObserver/);
    assert.doesNotMatch(heroSrc, /\bsm:tracking-tight\b/);
  });

  it("F-28: Categories uses grid-cols-2 on mobile, removes line-clamp-1, and matches NewArrivals h-4 w-4 View All arrow", () => {
    const categoriesSrc = readSrc("components/home/Categories.tsx");
    const newArrivalsSrc = readSrc("components/home/NewArrivals.tsx");

    assert.match(categoriesSrc, /grid-cols-2\s+sm:grid-cols-3\s+lg:grid-cols-6/);
    assert.doesNotMatch(categoriesSrc, /line-clamp-1/);
    assert.match(categoriesSrc, /View All[\s\S]*?<ArrowRight className="h-4 w-4 shrink-0 stroke-\[1\.75\]/);
    assert.match(newArrivalsSrc, /View All[\s\S]*?<ArrowRight className="h-4 w-4 shrink-0 stroke-\[1\.75\]/);
  });

  it("F-29: WhyChoose renders 8 symmetric benefits without decorative Sparkles icons", async () => {
    const { WhyChoose } = await loadBundledModule<{ WhyChoose: React.ComponentType }>("components/home/WhyChoose.tsx");
    const html = renderToStaticMarkup(React.createElement(WhyChoose));
    const cardHeadings = html.match(/<h3\b/g) ?? [];
    assert.equal(cardHeadings.length, 8, "WhyChoose must contain 8 benefit cards so md:grid-cols-4 renders 4x2 without orphaned slots");

    const whyChooseSrc = readSrc("components/home/WhyChoose.tsx");
    const aboutSrc = readSrc("pages/About.tsx");
    assert.equal(whyChooseSrc.includes("Sparkles"), false);
    assert.equal(aboutSrc.includes("Sparkles"), false);
  });

  it("F-30: CustomerReviews restores text selection, dynamic getStepWidth, interactive dot buttons & 44px desktop arrows", () => {
    const reviewsSrc = readSrc("components/home/CustomerReviews.tsx");
    assert.doesNotMatch(reviewsSrc, /select-none/);
    assert.match(reviewsSrc, /const getStepWidth = useCallback/);
    assert.match(reviewsSrc, /aria-label=\{`Go to review \$\{i \+ 1\}`\}/);
    assert.match(reviewsSrc, /aria-current=\{isActive \? "true" : undefined\}/);
    assert.match(reviewsSrc, /h-11 w-11 rounded-full/);
  });

  it("F-31: Footer legal links map to distinct anchored sections, contact email is unified & dead static app box is removed", () => {
    const footerSrc = readSrc("components/layout/Footer.tsx");
    assert.match(footerSrc, /to:\s*"\/privacy",\s*hash:\s*"privacy-policy"/);
    assert.match(footerSrc, /to:\s*"\/privacy",\s*hash:\s*"terms-of-service"/);
    assert.match(footerSrc, /to:\s*"\/support",\s*hash:\s*"cancellation-refunds"/);
    assert.match(footerSrc, /to="\/support"\s+hash="security-protocol"/);
    assert.match(footerSrc, /to:\s*"\/about",\s*hash:\s*"rental-agreement-escrow"/);
    assert.doesNotMatch(footerSrc, /Payent Web App|Get quick mobile access/);
    assert.match(footerSrc, /beforeinstallprompt/);

    const privacySrc = readSrc("pages/PrivacyPolicy.tsx");
    assert.match(privacySrc, /id="privacy-policy"/);
    assert.match(privacySrc, /id="terms-of-service"/);
    assert.match(privacySrc, /support@payent\.com/);
    assert.doesNotMatch(privacySrc, /payent_support@gmail\.com/);

    const supportSrc = readSrc("pages/Support.tsx");
    assert.match(supportSrc, /id="cancellation-refunds"/);
    assert.match(supportSrc, /id="security-protocol"/);

    const aboutSrc = readSrc("pages/About.tsx");
    assert.match(aboutSrc, /id="rental-agreement-escrow"/);
  });

  it("F-32: Input uses rounded-xl; ExploreRentals & NewArrivals request paginated backend pages; NewArrivals handles empty state", async () => {
    const inputSrc = readSrc("components/common/Input.tsx");
    assert.match(inputSrc, /rounded-xl/);
    assert.doesNotMatch(inputSrc, /rounded-\[20px\]/);

    const exploreSrc = readSrc("components/home/ExploreRentals.tsx");
    assert.match(exploreSrc, /api\.getFilteredProductsPage/);
    assert.match(exploreSrc, /page:\s*currentPage,\s*limit:\s*ITEMS_PER_PAGE/);

    const arrivalsSrc = readSrc("components/home/NewArrivals.tsx");
    assert.match(arrivalsSrc, /api\.getFilteredProductsPage/);
    assert.match(arrivalsSrc, /id="new-arrivals-empty-state"/);
    assert.match(arrivalsSrc, /to="\/browse"/);

    // Verify api.getFilteredProductsPage parses X-Total-Count header and forwards page & limit params
    const apiMod = await loadBundledModule<{
      api: {
        getFilteredProductsPage: (filters: { page?: number; limit?: number; sort?: string }) => Promise<{
          items: unknown[];
          total: number;
          page: number;
          limit: number;
        }>;
      };
    }>("utils/api.ts");

    let requestedUrl = "";
    const prevFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify([{ id: "p-1", title: "Camera", price: 1200, image: "", available: true, category: "cameras", condition: "Like New" }]),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Total-Count": "27",
            },
          }
        );
      }) as typeof fetch;

      const pageData = await apiMod.api.getFilteredProductsPage({ page: 2, limit: 8, sort: "newest" });
      assert.match(requestedUrl, /limit=8/);
      assert.match(requestedUrl, /page=2/);
      assert.match(requestedUrl, /sort=newest/);
      assert.equal(pageData.total, 27);
      assert.equal(pageData.page, 2);
      assert.equal(pageData.limit, 8);
      assert.equal(pageData.items.length, 1);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  it("F-33 & F-34: Wishlist renders neutral cards linking /browse; tabular-nums & stroke-[1.75] standardized across metrics & UI", () => {
    const wishlistSrc = readSrc("pages/Wishlist.tsx");
    assert.match(wishlistSrc, /RentalProductCard/);
    assert.doesNotMatch(wishlistSrc, /card-premium|\bProductCard\b/);
    assert.match(wishlistSrc, /to:\s*"\/browse"/);
    assert.match(wishlistSrc, /tabular-nums/);

    for (const rel of [
      "pages/Orders.tsx",
      "pages/Filters.tsx",
      "pages/Profile.tsx",
      "pages/ProductDetails.tsx",
      "components/home/ExploreRentals.tsx",
      "components/home/NewArrivals.tsx",
      "components/home/CreatorCommunity.tsx",
      "components/layout/Navbar.tsx",
      "components/navigation/Navigation4.tsx",
    ]) {
      const src = readSrc(rel);
      assert.match(src, /stroke-\[1\.75\]/, `${rel} should align UI icons to stroke-[1.75]`);
    }

    const ordersSrc = readSrc("pages/Orders.tsx");
    assert.match(ordersSrc, /tabular-nums text-neutral-950 dark:text-white/);
    assert.match(ordersSrc, /tabular-nums text-neutral-900 dark:text-white/);
  });
});
