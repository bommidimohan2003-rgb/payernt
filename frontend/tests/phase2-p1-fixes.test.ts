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
const requireFromTest = createRequire(import.meta.url);

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, "src", relPath), "utf8");
}

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function createRouterStubPlugin(paramsId = "server-only-item-999"): Plugin {
  return {
    name: "router-and-browser-stubs",
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
            const href = typeof props.to === "string" ? props.to : "/";
            return React.createElement("a", { href, className: props.className, id: props.id, "aria-label": props["aria-label"] }, props.children);
          };
          exports.useNavigate = function useNavigate() { return function () {}; };
          exports.useSearch = function useSearch() { return {}; };
          exports.useParams = function useParams() { return { id: ${JSON.stringify(paramsId)} }; };
          exports.useRouterState = function useRouterState(opts) {
            const state = { location: { pathname: "/browse" } };
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

async function loadBundledModule<T = Record<string, unknown>>(
  relPath: string,
  options: { stubRouter?: boolean; paramsId?: string } = {}
): Promise<T> {
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
    plugins: options.stubRouter ? [createRouterStubPlugin(options.paramsId)] : [],
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

async function loadBundledProductDetailsWithCart(paramsId: string) {
  const result = await build({
    stdin: {
      contents: `
        import React from "react";
        import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
        import { CartProvider } from "./src/hooks/useCart";
        import ProductDetails from "./src/pages/ProductDetails";
        export function WrappedProductDetails() {
          const qc = React.useMemo(() => new QueryClient(), []);
          return React.createElement(
            QueryClientProvider,
            { client: qc },
            React.createElement(CartProvider, null, React.createElement(ProductDetails))
          );
        }
      `,
      resolveDir: FRONTEND_ROOT,
      loader: "tsx",
    },
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
    plugins: [createRouterStubPlugin(paramsId)],
    loader: {
      ".css": "empty",
      ".webp": "dataurl",
      ".jpg": "dataurl",
      ".png": "dataurl",
      ".svg": "dataurl",
    },
  });
  const mod = { exports: {} as { WrappedProductDetails: React.ComponentType } };
  const fn = new Function("require", "exports", "module", result.outputFiles[0].text);
  fn(requireFromTest, mod.exports, mod);
  return mod.exports.WrappedProductDetails;
}

async function withMockBrowser<T>(
  options: {
    apiBase?: string;
    seedStorage?: Record<string, string>;
    fetchImpl?: typeof globalThis.fetch;
  },
  fn: () => Promise<T> | T
): Promise<T> {
  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevFetch = globalThis.fetch;

  const localStorage = createMemoryStorage();
  if (options.seedStorage) {
    for (const [k, v] of Object.entries(options.seedStorage)) {
      localStorage.setItem(k, v);
    }
  }

  const mockWindow = {
    location: {
      hostname: "127.0.0.1",
      origin: "http://127.0.0.1:5173",
      pathname: "/browse",
      search: "",
    },
    PAYENT_API_URL: options.apiBase ?? "http://127.0.0.1:8009",
    localStorage,
    innerWidth: 1280,
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    CustomEvent: class CustomEventMock {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    Event: class EventMock {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
  };

  (globalThis as any).window = mockWindow;
  (globalThis as any).document = {
    documentElement: {
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
    },
    body: { style: {} },
  };
  if (options.fetchImpl) {
    globalThis.fetch = options.fetchImpl;
  }

  const restore = () => {
    if (prevWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = prevWindow;
    }
    if (prevDocument === undefined) {
      delete (globalThis as any).document;
    } else {
      (globalThis as any).document = prevDocument;
    }
    globalThis.fetch = prevFetch;
  };

  try {
    return await fn();
  } finally {
    restore();
  }
}

describe("Obs A: /api/search/stats contract alignment & removal of fabricated popular searches", () => {
  it("api.getPopularSearches() and getSearchStats() return [] on HTTP 500 or empty payload (never hardcoded items)", async () => {
    await withMockBrowser(
      {
        seedStorage: { "payent:cache_version": "v14_slot_dynamic_pricing_50" },
        fetchImpl: async () =>
          new Response(JSON.stringify({ detail: "Stats failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
      },
      async () => {
        const { api } = await loadBundledModule<{
          api: { getPopularSearches: () => Promise<string[]> };
        }>("utils/api.ts");
        const { getSearchStats } = await loadBundledModule<{
          getSearchStats: () => Promise<{
            isIndexed: boolean;
            indexedProductsCount: number;
            vocabularySize: number;
            popularQueries: string[];
          }>;
        }>("utils/smartSearch.ts");

        const popular = await api.getPopularSearches();
        assert.deepEqual(popular, []);

        const stats = await getSearchStats();
        assert.deepEqual(stats, {
          isIndexed: false,
          indexedProductsCount: 0,
          vocabularySize: 0,
          popularQueries: [],
        });
      }
    );
  });

  it("getSearchStats() and api.getPopularSearches() parse live indexed counts and genuine popular_queries", async () => {
    const liveStatsPayload = {
      success: true,
      is_indexed: true,
      total_indexed: 18,
      indexed_products_count: 18,
      vocabulary_size: 142,
      popular_queries: ["Sony Alpha A7", "MacBook Pro"],
    };

    await withMockBrowser(
      {
        seedStorage: { "payent:cache_version": "v14_slot_dynamic_pricing_50" },
        fetchImpl: async () =>
          new Response(JSON.stringify(liveStatsPayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      },
      async () => {
        const { api } = await loadBundledModule<{
          api: { getPopularSearches: () => Promise<string[]> };
        }>("utils/api.ts");
        const { getSearchStats } = await loadBundledModule<{
          getSearchStats: () => Promise<{
            isIndexed: boolean;
            indexedProductsCount: number;
            vocabularySize: number;
            popularQueries: string[];
          }>;
        }>("utils/smartSearch.ts");

        const stats = await getSearchStats();
        assert.deepEqual(stats, {
          isIndexed: true,
          indexedProductsCount: 18,
          vocabularySize: 142,
          popularQueries: ["Sony Alpha A7", "MacBook Pro"],
        });

        const popular = await api.getPopularSearches();
        assert.deepEqual(popular, ["Sony Alpha A7", "MacBook Pro"]);
      }
    );
  });

  it("SearchOverlay removes fake default popular searches and hides trending section until loaded", () => {
    const src = readSrc("components/home/SearchOverlay.tsx");
    assert.match(src, /useState<string\[\]>\(\[\]\)/);
    assert.doesNotMatch(src, /"Royal Enfield"/);
    assert.doesNotMatch(src, /"Camping Tent"/);
  });
});

describe("Obs B: React 19 SSR/CSR initial render parity under populated localStorage", () => {
  const seededProducts = JSON.stringify([
    {
      id: "server-only-item-999",
      title: "RED Komodo 6K Cinema Camera",
      price: 4500,
      category: "cameras",
      image: "https://example.com/komodo.jpg",
      available: true,
    },
    {
      id: "server-laptop-888",
      title: "MacBook Pro 16 M3 Max",
      price: 2200,
      category: "laptops",
      image: "https://example.com/mbp.jpg",
      available: true,
    },
  ]);

  const seededCategories = JSON.stringify([
    { id: "cameras", name: "Cameras", slug: "cameras", count: 9 },
  ]);

  it("Categories, Filters, and ProductDetails do not use suppressHydrationWarning and keep synchronous initial state deterministic", () => {
    for (const file of [
      "pages/Categories.tsx",
      "pages/Filters.tsx",
      "pages/ProductDetails.tsx",
      "pages/Wishlist.tsx",
    ]) {
      const src = readSrc(file);
      assert.doesNotMatch(src, /suppressHydrationWarning/);
    }
  });

  it("Categories (/browse) SSR HTML matches initial CSR HTML even with payent_server_products & payent_live_categories populated", async () => {
    const mod = await loadBundledModule<{ default: React.ComponentType }>("pages/Categories.tsx", {
      stubRouter: true,
    });
    const ssrHtml = renderToString(React.createElement(mod.default));

    const csrHtml = await withMockBrowser(
      {
        seedStorage: {
          "payent:cache_version": "v14_slot_dynamic_pricing_50",
          payent_server_products: seededProducts,
          payent_live_categories: seededCategories,
        },
      },
      () => renderToString(React.createElement(mod.default))
    );

    assert.equal(csrHtml, ssrHtml);
    assert.doesNotMatch(csrHtml, /server-only-item-999/);
  });

  it("Filters (/filters) SSR HTML matches initial CSR HTML even with payent_server_products populated", async () => {
    const mod = await loadBundledModule<{ default: React.ComponentType }>("pages/Filters.tsx", {
      stubRouter: true,
    });
    const ssrHtml = renderToString(React.createElement(mod.default));

    const csrHtml = await withMockBrowser(
      {
        seedStorage: {
          "payent:cache_version": "v14_slot_dynamic_pricing_50",
          payent_server_products: seededProducts,
        },
      },
      () => renderToString(React.createElement(mod.default))
    );

    assert.equal(csrHtml, ssrHtml);
  });

  it("ProductDetails (/product/$id) SSR HTML matches initial CSR HTML for both cached-only server IDs and fallback IDs", async () => {
    for (const targetId of ["server-only-item-999", "sony-alpha-a7-iii"]) {
      const WrappedProductDetails = await loadBundledProductDetailsWithCart(targetId);
      const ssrHtml = renderToString(React.createElement(WrappedProductDetails));

      const csrHtml = await withMockBrowser(
        {
          seedStorage: {
            "payent:cache_version": "v14_slot_dynamic_pricing_50",
            payent_server_products: seededProducts,
          },
        },
        () => renderToString(React.createElement(WrappedProductDetails))
      );

      assert.equal(csrHtml, ssrHtml, `SSR/CSR mismatch detected for /product/${targetId}`);
    }
  });
});

describe("Obs C: api.getOrders() surfaces backend failures instead of masking HTTP 500 with []", () => {
  it("api.getOrders() rejects with backend error detail when /api/orders returns HTTP 500", async () => {
    await assert.rejects(
      async () => {
        await withMockBrowser(
          {
            seedStorage: {
              "payent:cache_version": "v14_slot_dynamic_pricing_50",
              "payent:token": JSON.stringify("tok_test_123"),
            },
            fetchImpl: async () =>
              new Response(JSON.stringify({ detail: "Database temporarily unavailable" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }),
          },
          async () => {
            const { api } = await loadBundledModule<{
              api: { getOrders: (token: string) => Promise<unknown[]> };
            }>("utils/api.ts");
            return api.getOrders("tok_test_123");
          }
        );
      },
      /Database temporarily unavailable/
    );
  });

  it("api.getOrders() rejects cleanly when HTTP 500 returns non-JSON body and Orders invalidates user_orders cache on retry", async () => {
    await assert.rejects(
      async () => {
        await withMockBrowser(
          {
            seedStorage: {
              "payent:cache_version": "v14_slot_dynamic_pricing_50",
              "payent:token": JSON.stringify("tok_test_456"),
            },
            fetchImpl: async () => new Response("Internal Server Error", { status: 500 }),
          },
          async () => {
            const { api } = await loadBundledModule<{
              api: { getOrders: (token: string) => Promise<unknown[]> };
            }>("utils/api.ts");
            return api.getOrders("tok_test_456");
          }
        );
      },
      /Unable to load your rental bookings right now\./
    );

    const ordersSrc = readSrc("pages/Orders.tsx");
    assert.match(ordersSrc, /api\.invalidateCache\("user_orders"\)/);
  });
});

describe("Obs D & F-20: Filters.tsx desktop vs mobile ID separation and F-07 checkbox preservation", () => {
  it("Filters initial render emits #desktop-filter-* IDs and zero #mobile-filter-* IDs while preserving F-07 accessibly", async () => {
    const mod = await loadBundledModule<{ default: React.ComponentType }>("pages/Filters.tsx", {
      stubRouter: true,
    });
    const html = renderToString(React.createElement(mod.default));

    assert.match(html, /id="desktop-filter-cat-cameras"/);
    assert.match(html, /id="desktop-filter-cond-new"/);
    assert.match(html, /id="desktop-filter-price-min"/);
    assert.match(html, /id="desktop-filter-price-max"/);
    assert.match(html, /id="desktop-filter-date-start"/);
    assert.match(html, /id="desktop-filter-date-end"/);
    assert.match(html, /id="desktop-filter-city"/);
    assert.match(html, /id="desktop-filter-pin"/);
    assert.doesNotMatch(html, /id="mobile-filter-/);

    const filtersSrc = readSrc("pages/Filters.tsx");
    assert.match(filtersSrc, /renderSidebarFilters\(false\)/);
    assert.match(filtersSrc, /renderSidebarFilters\(true\)/);
    assert.match(filtersSrc, /\$\{idPrefix\}-filter-price-min/);
    assert.match(filtersSrc, /\$\{idPrefix\}-filter-city/);
    assert.match(filtersSrc, /\$\{idPrefix\}-filter-pin/);
    assert.doesNotMatch(filtersSrc, /Fixed Bottom-Right/i);
    assert.match(filtersSrc, /pb-28 md:pb-32/);
    assert.doesNotMatch(filtersSrc, />&lt;</);
    assert.match(filtersSrc, /if \(e\.key === "Escape"\)[\s\S]{0,40}setIsMobileFilterOpen\(false\)/);
  });
});

describe("F-09, F-11, F-13: Monochrome design system, Hero non-live caption & touch target preservation", () => {
  it("styles.css enforces monochrome tokens in Light & Dark without cobalt btn-gradient or CSS order override", () => {
    const css = readSrc("styles.css");
    assert.doesNotMatch(css, /#2563EB/i);
    assert.doesNotMatch(css, /#3B82F6/i);
    assert.doesNotMatch(css, /rgba\(59,\s*130,\s*246/);
    assert.doesNotMatch(css, /order:\s*-1/);
    assert.match(css, /--background:\s*#0A0A0A/);
    assert.match(css, /--card:\s*#141414/);
    assert.match(css, /--primary:\s*#FAFAFA/);

    const chatbot = readSrc("components/common/HelpChatbot.tsx");
    assert.doesNotMatch(chatbot, /#16A36A/i);
    assert.doesNotMatch(chatbot, /animate-ping/);
  });

  it("Hero preserves exact brand copy, 2-col layout, 44px CTA, sr-only caption, and removes aria-live & animate-pulse", async () => {
    const { Hero } = await loadBundledModule<{ Hero: React.ComponentType }>("components/home/Hero.tsx");
    const html = renderToStaticMarkup(React.createElement(Hero));

    assert.match(html, /Rent Anything/);
    assert.match(html, /You Need/);
    assert.match(html, /Get What You Need, Without Owning It\./);
    assert.match(html, /Explore Rentals/);
    assert.match(html, /grid-cols-\[minmax\(0,48fr\)_minmax\(0,52fr\)\]/);
    assert.match(html, /min-h-\[44px\]/);
    assert.match(html, /<p class="sr-only">Get What You Need, Without Owning It\.<\/p>/);
    assert.match(html, /<p aria-hidden="true"/);
    assert.doesNotMatch(html, /aria-live/);
    assert.doesNotMatch(html, /animate-pulse/);
  });
});

describe("F-10, F-12, F-14, F-15, F-16, F-18, F-19, F-21, F-22: Secondary UI & A11y Verifications", () => {
  it("MainLayout, Navigation4, Navbar, and Home satisfy clearance, 44px dock/header targets, and preloader fixes (F-12, F-18)", () => {
    const layout = readSrc("layouts/MainLayout.tsx");
    const nav4 = readSrc("components/navigation/Navigation4.tsx");
    const navbar = readSrc("components/layout/Navbar.tsx");
    const home = readSrc("pages/Home.tsx");

    assert.match(layout, /md:pb-32/);
    assert.match(nav4, /isDesktop \? 46 : 48/);
    assert.match(nav4, /min-w-\[46px\] min-h-\[46px\]/);
    assert.doesNotMatch(nav4, /py-0\.2\b/);

    assert.doesNotMatch(navbar, /-translate-y-full/);
    assert.match(navbar, /id="nav-mobile-search-btn"[\s\S]*?h-11 w-11/);
    assert.match(navbar, /to="\/payent"/);

    assert.doesNotMatch(home, /animate-pulse/);
  });

  it("SearchOverlay implements AbortController, Escape/Tab focus trap, and removes window.alert (F-14)", () => {
    const src = readSrc("components/home/SearchOverlay.tsx");
    assert.match(src, /new AbortController\(\)/);
    assert.match(src, /searchSeqRef/);
    assert.match(src, /role="dialog"/);
    assert.match(src, /aria-modal="true"/);
    assert.match(src, /previousFocusRef/);
    assert.match(src, /aria-label="Clear search"/);
    assert.doesNotMatch(src, /window\.alert/);
  });

  it("Categories, Filters, ProductDetails, and Wishlist enforce grid-cols-2 mobile, <h1>, 44px hitboxes, and clean heading/T&C (F-10, F-15, F-16, F-19)", () => {
    const categories = readSrc("pages/Categories.tsx");
    const wishlist = readSrc("pages/Wishlist.tsx");
    const filters = readSrc("pages/Filters.tsx");
    const pd = readSrc("pages/ProductDetails.tsx");

    assert.match(categories, /<h1[\s>]/);
    assert.match(categories, /<RentalProductCard/);
    assert.match(categories, /id="explore-notifications-btn"[\s\S]*?h-11 w-11/);
    assert.match(wishlist, /<RentalProductCard/);

    assert.match(filters, /grid-cols-2 lg:grid-cols-3/);
    assert.doesNotMatch(filters, /\bgrid grid-cols-3\b/);

    assert.match(pd, /const relatedPageSize = 4;/);
    assert.match(pd, /grid-cols-2 lg:grid-cols-4/);
    assert.match(pd, /<h1[\s>][\s\S]*?\{product\.title\}/);
    assert.doesNotMatch(pd, /text-red-500[^>]*>\s*T&C will apply/);
  });

  it("Profile and Orders enforce form label bindings, dialog ARIA, Escape handling, and remove fake timestamps/animate-ping (F-21, F-22)", () => {
    const profile = readSrc("pages/Profile.tsx");
    assert.match(profile, /htmlFor="profile-bio-input"/);
    assert.match(profile, /id="profile-bio-input"/);
    assert.match(profile, /htmlFor="profile-pan-input"/);
    assert.match(profile, /id="profile-pan-input"/);
    assert.doesNotMatch(profile, /Verified Account/);

    const orders = readSrc("pages/Orders.tsx");
    assert.doesNotMatch(orders, /27 Oct 2026, 08:41 PM/);
    assert.doesNotMatch(orders, /animate-ping/);
    assert.doesNotMatch(orders, /py-0\.2\b/);
    assert.doesNotMatch(orders, />✕</);
    assert.match(orders, /Date unavailable/);
    assert.match(orders, /aria-labelledby="cancel-modal-title"/);
    assert.match(orders, /aria-labelledby="location-modal-title"/);
    assert.match(orders, /aria-labelledby="receipt-modal-title"/);
    assert.match(orders, /htmlFor="order-location-address"/);
    assert.match(orders, /id="order-location-address"/);
  });
});
