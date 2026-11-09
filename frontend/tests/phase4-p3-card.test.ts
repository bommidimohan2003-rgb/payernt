import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build, type Plugin } from "esbuild";
import React from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");
const requireFromTest = createRequire(import.meta.url);

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), "utf8");
}

function collectAllSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAllSourceFiles(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function createRouterAndToastStubPlugin(): Plugin {
  return {
    name: "phase4-router-stubs",
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
            const to = typeof props.to === "string" ? props.to : "/";
            const href = props.params && props.params.id ? to.replace("$id", props.params.id) : to;
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
    entryPoints: [path.join(SRC_ROOT, relPath)],
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

describe("Phase 4 Part A — Final P3 Cleanup (F-35 through F-40)", () => {
  it("F-35: Navigation4 accurately documents 5 dock items and has no unused CircleHelp/tCommon", () => {
    const nav4 = readSrc("components/navigation/Navigation4.tsx");
    assert.match(
      nav4,
      /5 primary destinations:[\s\S]*1\. Home[\s\S]*2\. Explore[\s\S]*3\. Orders[\s\S]*4\. Profile[\s\S]*5\. More/
    );
    assert.match(nav4, /id:\s*"home"[\s\S]*id:\s*"explore"[\s\S]*id:\s*"orders"[\s\S]*id:\s*"profile"[\s\S]*id:\s*"more"/);
    assert.doesNotMatch(nav4, /\bCircleHelp\b/);
    assert.doesNotMatch(nav4, /\btCommon\b/);
  });

  it("F-36: Home section padding rhythm unified, skeleton pulse removed, RecentlyViewed stabilizes jump & bottom sections are compact", async () => {
    const catSrc = readSrc("components/home/Categories.tsx");
    assert.match(catSrc, /py-3 sm:py-4\.5/, "Categories.tsx should use compact py-3 sm:py-4.5 vertical padding");
    assert.doesNotMatch(catSrc, /animate-pulse/, "Categories.tsx should not use pulsing skeleton shimmers");

    for (const rel of [
      "components/home/ExploreRentals.tsx",
      "components/home/NewArrivals.tsx",
      "components/home/RecentlyViewed.tsx",
      "components/home/RecommendedForYou.tsx",
      "components/home/CustomerReviews.tsx",
    ]) {
      const src = readSrc(rel);
      assert.match(src, /py-5 sm:py-7/, `${rel} should align vertical section padding to py-5 sm:py-7`);
      assert.doesNotMatch(src, /animate-pulse/, `${rel} should not use pulsing skeleton shimmers`);
    }

    for (const rel of [
      "components/home/HowItWorks.tsx",
      "components/home/WhyChoose.tsx",
      "components/layout/Footer.tsx",
    ]) {
      const src = readSrc(rel);
      assert.match(src, /py-2\.5 sm:py-3\.5/, `${rel} should use compact py-2.5 sm:py-3.5 vertical padding`);
      assert.doesNotMatch(src, /animate-pulse/, `${rel} should not use pulsing skeleton shimmers`);
    }
    assert.match(readSrc("components/layout/Footer.tsx"), /lg:grid-cols-6/);

    const rvSrc = readSrc("components/home/RecentlyViewed.tsx");
    assert.match(rvSrc, /RentalProductCardSkeleton/);
    assert.match(rvSrc, /payent_recently_viewed_v1:/);
    assert.doesNotMatch(rvSrc, /text-neutral-500/);
    assert.match(rvSrc, /font-semibold/);

    const recSrc = readSrc("components/home/RecommendedForYou.tsx");
    assert.doesNotMatch(recSrc, /text-neutral-500/);
    assert.match(recSrc, /font-semibold/);

    // Verify SSR/CSR parity of RecentlyViewed (renders null before mount for both server and client)
    const { RecentlyViewed } = await loadBundledModule<{ RecentlyViewed: React.ComponentType }>(
      "components/home/RecentlyViewed.tsx"
    );
    const rvHtml = renderToString(React.createElement(RecentlyViewed));
    assert.equal(rvHtml, "");

    for (const rel of [
      "components/ui/skeleton.tsx",
      "components/states/LoadingState.tsx",
      "pages/BookingDetails.tsx",
      "pages/Reviews.tsx",
      "admin/components/layout/StatsCard.tsx",
      "admin/pages/Analytics.tsx",
    ]) {
      assert.doesNotMatch(readSrc(rel), /animate-pulse/, `${rel} skeleton states must be static`);
    }

    const msgSrc = readSrc("pages/Messages.tsx");
    const msgSkeletonMatch = msgSrc.match(/\{\/\*\s*Conversation List Feed\s*\*\/\}[\s\S]*?error \?/);
    assert.ok(msgSkeletonMatch, "Messages.tsx conversation list skeleton block must exist");
    assert.doesNotMatch(
      msgSkeletonMatch[0],
      /animate-pulse/,
      "Messages.tsx conversation skeleton rows must be static"
    );
  });

  it("F-37: Input preserves rounded-xl and SectionBox omits conflicting HTMLAttributes title", () => {
    const input = readSrc("components/common/Input.tsx");
    const box = readSrc("components/common/SectionBox.tsx");
    assert.match(input, /rounded-xl/);
    assert.doesNotMatch(input, /rounded-\[20px\]/);
    assert.match(box, /extends Omit<HTMLAttributes<HTMLDivElement>,\s*"title">/);
  });

  it("F-38: Non-existent Tailwind py-0.2 class is eliminated repository-wide in favor of py-0.5", () => {
    const srcFiles = collectAllSourceFiles(SRC_ROOT);
    const offenders: string[] = [];
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (/\bpy-0\.2\b/.test(content)) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    assert.deepEqual(offenders, [], `Unexpected py-0.2 offenders found: ${offenders.join(", ")}`);
  });

  it("F-39: Filters standardizes Clear all and ProductDetails replaces uppercase BOOK NOW with Book Now", () => {
    const filters = readSrc("pages/Filters.tsx");
    assert.match(filters, /Clear all/i);
    assert.doesNotMatch(filters, />\s*Reset\s*</);

    const pd = readSrc("pages/ProductDetails.tsx");
    assert.match(pd, /<span>Book Now<\/span>/);
    assert.doesNotMatch(pd, /<span>BOOK NOW<\/span>/);
    assert.match(pd, /MessageSquareQuote/);
  });

  it("F-40: ProductSelection Gateway removes feTurbulence filter, ORIGIN/GATEWAY telemetry strips & unused imports", () => {
    const sel = readSrc("components/selection/ProductSelection.tsx");
    const selCode = sel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(sel, /feTurbulence/);
    assert.doesNotMatch(sel, /cinematicNoise/);
    assert.doesNotMatch(selCode, /\bORIGIN\b/);
    assert.doesNotMatch(selCode, /paYent \/ GATEWAY/);
    assert.doesNotMatch(selCode, /ONE PLATFORM \/ TWO PATHS/);
    assert.doesNotMatch(selCode, /RENT\. LEND\.|CHOOSE YOUR PATH/);
    assert.doesNotMatch(sel, /\bSparkles\b|\buseAuth\b|\buseRef\b|\bLink\b/);
    assert.match(selCode, /paYent/);
    assert.match(selCode, /paye₹nt/);
    assert.match(selCode, /pay₹ent/);
  });
});

describe("Phase 4 Part B — Overlay Product Card, Explore Cards, Location & Availability", () => {
  it("RentalProductCard renders photo-overlay geometry, explore height variant, genuine Available pill, real location & 44px wishlist target", async () => {
    const { RentalProductCard, RentalProductCardSkeleton } = await loadBundledModule<{
      RentalProductCard: React.ComponentType<any>;
      RentalProductCardSkeleton: React.ComponentType<{ variant?: "default" | "compact" | "explore" }>;
    }>("components/common/RentalProductCard.tsx");

    const { formatProductLocation } = await loadBundledModule<{
      formatProductLocation: (p: any) => string;
    }>("utils/formatters.ts");

    // Verify genuine locality formatting & deduplication against generic "India" owner city
    assert.equal(
      formatProductLocation({
        id: "p1",
        city: "visakhapatnam",
        area: "Gajuwaka",
        location: "India",
        owner: { name: "V", city: "India" },
      }),
      "Gajuwaka, Visakhapatnam"
    );
    assert.equal(
      formatProductLocation({
        id: "p2",
        city: "Pendurthi",
        area: "Pendurthi",
        location: "India",
        owner: { name: "M", city: "India" },
      }),
      "Pendurthi"
    );
    assert.equal(
      formatProductLocation({
        id: "p3",
        city: "Bengaluru",
        area: "",
        location: "Location unavailable",
        owner: { name: "A", city: null },
      }),
      "Bengaluru"
    );
    assert.equal(
      formatProductLocation({
        id: "p4",
        city: "",
        area: "",
        location: "India",
        owner: { name: "X", city: "India" },
      }),
      "Location unavailable"
    );

    const sampleProduct = {
      id: "cam-fx3-001",
      title: "Sony FX3 Full-Frame Cinema Camera Kit with 24-70mm GM II Lens & Batteries",
      price: 3500,
      daily_rate: 3500,
      city: "Hyderabad",
      area: "Banjara Hills",
      location: "Banjara Hills, Hyderabad",
      image: "https://example.com/fx3.jpg",
      category: "cameras",
      available: true,
      availability_status: "available",
    };

    const exploreHtml = renderToStaticMarkup(
      React.createElement(RentalProductCard, { product: sampleProduct, variant: "explore" })
    );
    assert.match(exploreHtml, /aspect-\[4\/5\]/);
    assert.match(exploreHtml, /rounded-2xl/);
    assert.match(exploreHtml, /Available/);
    assert.match(exploreHtml, /Banjara Hills, Hyderabad/);
    assert.match(exploreHtml, /₹3,500/);
    assert.match(exploreHtml, /\/day/);

    const unavailableHtml = renderToStaticMarkup(
      React.createElement(RentalProductCard, {
        product: { ...sampleProduct, available: false, availability_status: "unavailable" },
        variant: "explore",
      })
    );
    assert.match(unavailableHtml, /Unavailable/);

    const compactHtml = renderToStaticMarkup(
      React.createElement(RentalProductCard, { product: sampleProduct, variant: "compact" })
    );

    assert.match(compactHtml, /aspect-\[5\/4\] sm:aspect-\[3\/2\]/);
    assert.match(compactHtml, /rounded-xl/);
    assert.match(compactHtml, /bg-gradient-to-t/);
    assert.match(compactHtml, /line-clamp-2/);
    assert.match(compactHtml, /object-cover/);
    assert.match(compactHtml, /absolute inset-0/);
    assert.match(compactHtml, /tabular-nums/);
    assert.match(compactHtml, /₹3,500/);
    assert.match(compactHtml, /\/day/);
    assert.match(compactHtml, /Available/);
    assert.match(compactHtml, /Banjara Hills, Hyderabad/);
    assert.match(compactHtml, /min-h-\[44px\] min-w-\[44px\]/);
    assert.match(compactHtml, /aria-pressed="false"/);
    assert.doesNotMatch(compactHtml, /Daily Rental/);
    assert.doesNotMatch(compactHtml, /Like New|Brand New|views|off\b/i);

    const noPhotoCompactHtml = renderToStaticMarkup(
      React.createElement(RentalProductCard, {
        product: { ...sampleProduct, id: "no-img-1", image: "", images: [] },
        variant: "compact",
      })
    );
    assert.match(noPhotoCompactHtml, /No photo/);
    assert.match(noPhotoCompactHtml, /bottom-\[58%\]/);
    assert.doesNotMatch(noPhotoCompactHtml, /placeholder-gear|placeholder\.png/);

    const defaultHtml = renderToStaticMarkup(
      React.createElement(RentalProductCard, { product: sampleProduct })
    );
    assert.match(defaultHtml, /aspect-\[4\/3\]/);
    assert.match(defaultHtml, /bg-gradient-to-t/);
    assert.match(defaultHtml, /Daily Rental/);
    assert.match(defaultHtml, /Available/);

    const exploreSkeletonHtml = renderToStaticMarkup(
      React.createElement(RentalProductCardSkeleton, { variant: "explore" })
    );
    assert.match(exploreSkeletonHtml, /aspect-\[4\/5\]/);
    assert.doesNotMatch(exploreSkeletonHtml, /animate-pulse/);

    const compactSkeletonHtml = renderToStaticMarkup(
      React.createElement(RentalProductCardSkeleton, { variant: "compact" })
    );
    assert.match(compactSkeletonHtml, /aspect-\[5\/4\] sm:aspect-\[3\/2\]/);
    assert.doesNotMatch(compactSkeletonHtml, /animate-pulse/);

    // Ensure styles.css keeps base img reset inside @layer base so h-full object-cover fills overlay frames
    const stylesCss = readSrc("styles.css");
    assert.match(stylesCss, /@layer base\s*\{[\s\S]*img,\s*video,\s*canvas,\s*svg\s*\{[\s\S]*height:\s*auto/);
  });

  it("Explore page adopts taller explore cards while Home ExploreRentals/NewArrivals keep compact 2/3/4 col grid", () => {
    const targetGrid = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

    for (const rel of [
      "components/home/ExploreRentals.tsx",
      "components/home/NewArrivals.tsx",
    ]) {
      const src = readSrc(rel);
      assert.ok(src.includes(targetGrid), `${rel} must use responsive 2/3/4 column grid`);
      assert.match(src, /variant="compact"/, `${rel} must opt into variant="compact"`);
    }

    const categoriesSrc = readSrc("pages/Categories.tsx");
    assert.ok(categoriesSrc.includes(targetGrid), "Categories.tsx must use responsive 2/3/4 column grid");
    assert.match(categoriesSrc, /variant="explore"/, "Explore/Categories page must use taller variant='explore' cards");

    assert.match(readSrc("components/home/ExploreRentals.tsx"), /const ITEMS_PER_PAGE = 8;/);
    assert.match(readSrc("components/home/NewArrivals.tsx"), /const ITEMS_PER_PAGE = 8;/);

    // Filters cards also display real product location & availability word
    const filtersSrc = readSrc("pages/Filters.tsx");
    assert.match(filtersSrc, /formatProductLocation/);
    assert.match(filtersSrc, /isProductAvailable/);

    // Unrelated sections remain untouched on default cards
    for (const rel of [
      "pages/Wishlist.tsx",
      "pages/ProductDetails.tsx",
      "components/home/RecentlyViewed.tsx",
      "components/home/RecommendedForYou.tsx",
    ]) {
      assert.doesNotMatch(readSrc(rel), /variant="compact"|variant="explore"/, `${rel} must remain on default card variant`);
    }
  });
});
