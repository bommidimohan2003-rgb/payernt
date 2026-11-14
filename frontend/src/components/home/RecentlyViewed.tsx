import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import type { Product } from "@/types";
import { RentalProductCard, RentalProductCardSkeleton } from "@/components/common/RentalProductCard";

interface RecentlyViewedCacheEntry {
  empty: boolean;
  items: Product[];
}

function getRecentlyViewedCacheKey(email?: string | null) {
  return `payent_recently_viewed_v1:${(email || "anon").toLowerCase().trim()}`;
}

function readRecentlyViewedCache(cacheKey: string): RecentlyViewedCacheEntry | null {
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

function writeRecentlyViewedCache(cacheKey: string, entry: RecentlyViewedCacheEntry) {
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

    api.getRecentlyViewed(token, userEmail)
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
    <section className="w-full py-5 sm:py-7 bg-neutral-50/50 dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3.5">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Recently Viewed
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Gear you recently inspected during your rental exploration
          </p>
        </div>

        {/* Reserve steady 4-col section height while logged-in history loads for the first time */}
        {!loaded ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <RentalProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {products.map((p) => (
              <RentalProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RecentlyViewed;
