import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import type { Product } from "@/types";
import {
  RentalProductCard,
  RentalProductCardSkeleton,
} from "@/components/common/RentalProductCard";

interface RecentlyViewedCacheEntry {
  empty: boolean;
  items: Product[];
}

function getRecentlyViewedCacheKey(email?: string | null) {
  return `payent_recently_viewed_v1:${(email || "anon").toLowerCase().trim()}`;
}

function readRecentlyViewedCache(
  cacheKey: string,
): RecentlyViewedCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      empty: Boolean((parsed as RecentlyViewedCacheEntry).empty),
      items: Array.isArray((parsed as RecentlyViewedCacheEntry).items)
        ? (parsed as RecentlyViewedCacheEntry).items
        : [],
    };
  } catch {
    return null;
  }
}

function writeRecentlyViewedCache(
  cacheKey: string,
  entry: RecentlyViewedCacheEntry,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    /* ignore storage errors */
  }
}

export function RecentlyViewed() {
  const { user } = useAuth();
  const userEmail = user?.email ? user.email.toLowerCase().trim() : null;
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [knownEmpty, setKnownEmpty] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = direction === "left" ? -480 : 480;
    carouselRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  useEffect(() => {
    // Strictly for logged-in users only (user starts null in both SSR and initial CSR)
    if (!userEmail) {
      setProducts([]);
      setKnownEmpty(false);
      setLoaded(true);
      return;
    }

    let active = true;
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    const cacheKey = getRecentlyViewedCacheKey(userEmail);
    const cached = readRecentlyViewedCache(cacheKey);

    if (cached && cached.items.length > 0) {
      setProducts(cached.items.slice(0, 8));
      setKnownEmpty(false);
      setLoaded(true);
    } else if (cached?.empty) {
      setProducts([]);
      setKnownEmpty(true);
      setLoaded(true);
    } else {
      setKnownEmpty(false);
      setLoaded(false);
    }

    api
      .getRecentlyViewed(token, userEmail)
      .then((items) => {
        if (!active) return;
        const normalized = Array.isArray(items) ? items.slice(0, 8) : [];
        setProducts(normalized);
        setKnownEmpty(normalized.length === 0);
        setLoaded(true);
        writeRecentlyViewedCache(cacheKey, {
          empty: normalized.length === 0,
          items: normalized,
        });
      })
      .catch(() => {
        if (active) {
          setProducts([]);
          setKnownEmpty(true);
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  // Hide completely for logged-out users or confirmed empty history
  if (!user || knownEmpty || (loaded && products.length === 0)) {
    return null;
  }

  return (
    <section className="w-full py-5 sm:py-7 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-2.5">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              Recently Viewed
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Gear you recently inspected during your rental exploration
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll recently viewed left"
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll recently viewed right"
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Loading State or Product Carousel: Matching ExploreRentals, NewArrivals, and RecommendedForYou */}
        {!loaded ? (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1.5 pt-0.5 scrollbar-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <RentalProductCardSkeleton key={i} variant="portrait" />
            ))}
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1.5 pt-0.5 scrollbar-none scroll-smooth"
          >
            {products.map((p) => (
              <RentalProductCard key={p.id} product={p} variant="portrait" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentlyViewed;
