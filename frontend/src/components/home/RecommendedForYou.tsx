import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import type { Product } from "@/types";
import { RentalProductCard, RentalProductCardSkeleton } from "@/components/common/RentalProductCard";

export function RecommendedForYou() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState<string>("Recommended For You");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Logged-in users only
    if (!user) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    api.getPersonalizedRecommendations(user.email)
      .then((res) => {
        if (!active) return;
        const items = res?.items;
        if (Array.isArray(items) && items.length > 0) {
          setProducts(items.slice(0, 8));
          if (res?.title) setTitle(res.title);
        } else {
          // Fallback to trending
          return api.getTrendingRecommendations().then((trending) => {
            if (active && Array.isArray(trending) && trending.length > 0) {
              setProducts(trending.slice(0, 8));
              setTitle("Recommended Gear");
            }
          });
        }
      })
      .catch(() => {
        if (active) {
          api.getTrendingRecommendations().then((trending) => {
            if (active && Array.isArray(trending) && trending.length > 0) {
              setProducts(trending.slice(0, 8));
            }
          }).catch(() => {});
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Only displayed for logged-in users with recommendations
  if (!user || (!isLoading && products.length === 0)) {
    return null;
  }

  return (
    <section className="w-full py-5 sm:py-7 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3.5">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Curated gear matching your rental interests and gear categories
          </p>
        </div>

        {isLoading ? (
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

export default RecommendedForYou;
