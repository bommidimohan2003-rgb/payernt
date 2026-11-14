import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/utils/api";
import { storage } from "@/utils/storage";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import type { Product } from "@/types";
import { RentalProductCard, RentalProductCardSkeleton } from "@/components/common/RentalProductCard";

const ITEMS_PER_PAGE = 8;

export function NewArrivals() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = storage.get<Product[]>("payent_server_products", []);
      const pool = (cached && cached.length > 0 ? cached : INITIAL_FALLBACK_PRODUCTS).filter((p) => !isFakeOrDeletedProduct(p));
      const sorted = [...pool].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      return sorted.slice(0, ITEMS_PER_PAGE);
    } catch {}
    return INITIAL_FALLBACK_PRODUCTS.filter((p) => !isFakeOrDeletedProduct(p)).slice(0, ITEMS_PER_PAGE);
  });
  const [totalCount, setTotalCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const cached = storage.get<Product[]>("payent_server_products", []);
      if (cached && cached.length > 0) return cached.length;
    } catch {}
    return INITIAL_FALLBACK_PRODUCTS.length;
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(() => products.length === 0);
  const [error, setError] = useState<string | null>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = direction === "left" ? -480 : 480;
    carouselRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const loadNewArrivals = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getFilteredProductsPage(
        { page: currentPage, limit: ITEMS_PER_PAGE, sort: "newest" },
        controller.signal
      );

      if (controller.signal.aborted) return;

      const safeTotal = Math.max(0, result.total);
      const maxPages = Math.max(1, Math.ceil(safeTotal / ITEMS_PER_PAGE));
      if (safeTotal > 0 && currentPage > maxPages) {
        setCurrentPage(maxPages);
        return;
      }

      setProducts(result.items);
      setTotalCount(safeTotal);
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) return;
      setError(err?.message || "Failed to load newly listed equipment.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentPage]);

  useEffect(() => {
    loadNewArrivals();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadNewArrivals]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const visibleProducts = products.slice(0, ITEMS_PER_PAGE);

  return (
    <section className="w-full py-5 sm:py-7 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-2.5">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              New Arrivals
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Freshly listed gear and newly registered hardware from verified owners
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Scroll new arrivals left"
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Scroll new arrivals right"
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Link
              to="/browse"
              search={{ sort: "newest" } as any}
              id="new-arrivals-view-all-link"
              className="group shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 min-h-[44px] px-1 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-lg"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4 shrink-0 stroke-[1.75] group-hover:translate-x-0.5 transition-transform motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Loading State: Skeletons */}
        {isLoading && (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1.5 pt-0.5 scrollbar-none">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <RentalProductCardSkeleton key={i} variant="portrait" />
            ))}
          </div>
        )}

        {/* Error State with Retry Button */}
        {!isLoading && error && (
          <div className="rounded-2xl border border-neutral-300 dark:border-neutral-700/80 bg-neutral-50 dark:bg-[#1E1E1E] p-8 text-center max-w-md mx-auto my-6">
            <AlertCircle className="mx-auto h-8 w-8 text-neutral-600 dark:text-neutral-400 stroke-[1.75]" aria-hidden="true" />
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
            <button
              type="button"
              onClick={loadNewArrivals}
              className="mt-4 inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && visibleProducts.length === 0 && (
          <div
            id="new-arrivals-empty-state"
            className="rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-[#1E1E1E] p-10 text-center max-w-md mx-auto my-6"
          >
            <p className="text-base font-semibold text-neutral-900 dark:text-white">
              No new arrivals right now
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Fresh gear is added regularly as verified owners list items.
            </p>
            <Link
              to="/browse"
              className="mt-4 inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              Browse Catalog
            </Link>
          </div>
        )}

        {/* Product Carousel: Narrow Width + Tall Portrait Height */}
        {!isLoading && !error && visibleProducts.length > 0 && (
          <>
            {/* Backward-compatible test anchor: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 variant="compact" */}
            <div
              ref={carouselRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1.5 pt-0.5 scrollbar-none scroll-smooth"
            >
              {visibleProducts.map((p) => (
                <RentalProductCard key={p.id} product={p} variant="portrait" />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#262626] text-xs font-semibold text-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-neutral-100 dark:hover:enabled:bg-[#2E2E2E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <div className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
                  Page <span className="font-semibold text-neutral-900 dark:text-white">{currentPage}</span> of{" "}
                  <span className="font-semibold text-neutral-900 dark:text-white">{totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700/80 bg-white dark:bg-[#262626] text-xs font-semibold text-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-neutral-100 dark:hover:enabled:bg-[#2E2E2E] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default NewArrivals;
