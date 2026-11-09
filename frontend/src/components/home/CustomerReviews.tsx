import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { api } from "@/utils/api";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string;
  product_name?: string;
  user_name?: string;
  created_at: string;
}

export function CustomerReviews() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getPublicReviews({ limit: 12, sort: "newest" })
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res?.reviews) && res.reviews.length > 0) {
          setReviews(res.reviews);
        } else {
          setReviews([]);
        }
      })
      .catch(() => {
        if (active) setReviews([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const dotCount = Math.min(reviews.length, 6);

  const getStepWidth = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return 1;
    const firstCard = container.firstElementChild as HTMLElement | null;
    if (!firstCard) return Math.max(1, container.clientWidth * 0.88);
    const styles = window.getComputedStyle(container);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "16") || 16;
    return Math.max(1, firstCard.offsetWidth + gap);
  }, []);

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(dotCount - 1, index));
    const step = getStepWidth();
    setActiveIndex(clamped);
    container.scrollTo({ left: clamped * step, behavior: "smooth" });
  };

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const step = getStepWidth();
    const scrollAmount = dir === "left" ? -step : step;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleScrollUpdate = () => {
    const container = scrollRef.current;
    if (!container || dotCount === 0) return;
    const step = getStepWidth();
    const rawIdx = Math.round(container.scrollLeft / step);
    setActiveIndex(Math.max(0, Math.min(dotCount - 1, rawIdx)));
  };

  if (!isLoading && reviews.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-5 sm:py-7 bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              Real Stories, Real Experiences
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Verified reviews from lenders and renters across the paYent community
            </p>
          </div>

          {reviews.length > 3 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Previous reviews"
                className="h-11 w-11 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <ChevronLeft className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Next reviews"
                className="h-11 w-11 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <ChevronRight className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Container */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900 p-6"
              />
            ))}
          </div>
        ) : (
          <div>
            <div
              ref={scrollRef}
              onScroll={handleScrollUpdate}
              className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none scroll-smooth"
            >
              {reviews.map((r, idx) => {
                const dateStr = r.created_at
                  ? new Date(r.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";

                return (
                  <div
                    key={r.id || idx}
                    className="snap-start shrink-0 w-[88vw] sm:w-[calc(33.333%-1rem)] flex flex-col justify-between rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-4 sm:p-5 shadow-xs"
                  >
                    <div>
                      {/* Monochrome 5-Star Rating */}
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 5 }).map((_, starIdx) => {
                          const isFilled = starIdx < (r.rating || 5);
                          return (
                            <Star
                              key={starIdx}
                              className={cn(
                                "h-4 w-4 stroke-[1.75]",
                                isFilled
                                  ? "fill-neutral-950 dark:fill-white text-neutral-950 dark:text-white"
                                  : "text-neutral-300 dark:text-neutral-700"
                              )}
                              aria-hidden="true"
                            />
                          );
                        })}
                      </div>

                      {/* Review Comment */}
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed line-clamp-4">
                        "{r.comment}"
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <div className="font-semibold text-neutral-900 dark:text-white truncate max-w-[150px]">
                        {r.product_name || r.user_name || "Verified Rental"}
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400 shrink-0 tabular-nums">
                        {dateStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Interactive Swipe Indicators (dots with >= 44px touch height) */}
            {dotCount > 1 && (
              <div className="flex sm:hidden items-center justify-center gap-1 mt-1" role="tablist" aria-label="Review slides">
                {Array.from({ length: dotCount }).map((_, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollToIndex(i)}
                      aria-label={`Go to review ${i + 1}`}
                      aria-current={isActive ? "true" : undefined}
                      className="min-h-[44px] min-w-[28px] px-1.5 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
                    >
                      <span
                        className={cn(
                          "block h-1.5 rounded-full transition-[width,background-color] duration-200",
                          isActive
                            ? "w-5 bg-neutral-950 dark:bg-white"
                            : "w-1.5 bg-neutral-300 dark:bg-neutral-700"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomerReviews;
