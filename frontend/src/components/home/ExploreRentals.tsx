import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, ChevronLeft, ChevronRight, ChevronDown, Check, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { RentalProductCard, RentalProductCardSkeleton } from "@/components/common/RentalProductCard";

const ITEMS_PER_PAGE = 8;
const EXPLORE_PAGE_STATE_KEY = "payent_explore_state";

const SORT_OPTIONS = [
  { value: "relevant", label: "Most Relevant" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

export function ExploreRentals() {
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Read saved state if returning from product details
  const [savedState] = useState(() => {
    try {
      const raw = sessionStorage.getItem(EXPLORE_PAGE_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(savedState?.page || 1);
  const [sortBy, setSortBy] = useState<string>(savedState?.sort || "relevant");
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Close custom sort dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isSortOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortOpen]);

  // Preserve state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        EXPLORE_PAGE_STATE_KEY,
        JSON.stringify({ page: currentPage, sort: sortBy })
      );
    } catch {}
  }, [currentPage, sortBy]);

  const loadProducts = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      let apiSort = "";
      if (sortBy === "newest") apiSort = "newest";
      else if (sortBy === "price_asc") apiSort = "price_asc";
      else if (sortBy === "price_desc") apiSort = "price_desc";

      const result = await api.getFilteredProductsPage(
        {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          sort: apiSort || undefined,
        },
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
      setError(err?.message || "Unable to load rental equipment. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentPage, sortBy]);

  useEffect(() => {
    loadProducts();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadProducts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const visibleProducts = products.slice(0, ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      document.getElementById("explore-rentals")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenFilters = () => {
    navigate({ to: "/filters" });
  };

  return (
    <section
      id="explore-rentals"
      className="w-full py-5 sm:py-7 bg-neutral-50/50 dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80 scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header with Title, Filter Button, and Sort Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              Explore Rentals
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Verified gear ready for instant pickup or scheduled delivery
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* Filter Button: Opens dedicated /filters screen */}
            <button
              type="button"
              onClick={handleOpenFilters}
              id="explore-open-filters-btn"
              className="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <SlidersHorizontal className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              <span>Filters</span>
            </button>

            {/* Custom Accessible Sort Dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                id="explore-sort-trigger"
                onClick={() => setIsSortOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isSortOpen}
                aria-controls="explore-sort-listbox"
                aria-label="Sort rental products"
                className="inline-flex items-center justify-between gap-2.5 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white select-none"
              >
                <span>{SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? "Most Relevant"}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 stroke-[1.75] text-neutral-500 dark:text-neutral-400 transition-transform duration-200 motion-reduce:transform-none",
                    isSortOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Synchronized hidden select for DOM & test query parity */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                id="explore-sort-select"
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only pointer-events-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Polished Floating Menu */}
              {isSortOpen && (
                <div
                  role="listbox"
                  id="explore-sort-listbox"
                  aria-label="Sort options"
                  className="absolute right-0 top-full mt-2 w-48 sm:w-52 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] p-1.5 shadow-xl shadow-black/10 dark:shadow-black/50 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                >
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSortBy(opt.value);
                          setCurrentPage(1);
                          setIsSortOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left cursor-pointer",
                          isSelected
                            ? "bg-neutral-100 dark:bg-neutral-800/90 text-neutral-950 dark:text-white font-semibold"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 hover:text-neutral-950 dark:hover:text-white"
                        )}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 stroke-[2] text-neutral-950 dark:text-white ml-2 shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State: Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <RentalProductCardSkeleton key={i} variant="compact" />
            ))}
          </div>
        )}

        {/* Error State with Retry Button */}
        {!isLoading && error && (
          <div className="rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] p-8 text-center max-w-md mx-auto my-6">
            <AlertCircle className="mx-auto h-8 w-8 text-neutral-600 dark:text-neutral-400 stroke-[1.75]" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-neutral-900 dark:text-white">
              Unable to Load Rentals
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{error}</p>
            <button
              type="button"
              onClick={loadProducts}
              className="mt-4 inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && visibleProducts.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] p-12 text-center max-w-md mx-auto my-6">
            <p className="text-base font-semibold text-neutral-900 dark:text-white">
              No products found
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Try adjusting your filter options or selecting another category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSortBy("relevant");
                setCurrentPage(1);
                loadProducts();
              }}
              className="mt-4 min-h-[40px] px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Compact Product Grid: 2 cols mobile, 3 tablet, 4 desktop */}
        {!isLoading && !error && visibleProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4">
              {visibleProducts.map((p) => (
                <RentalProductCard key={p.id} product={p} variant="compact" />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-neutral-100 dark:hover:enabled:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
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
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-neutral-100 dark:hover:enabled:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
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

export default ExploreRentals;
