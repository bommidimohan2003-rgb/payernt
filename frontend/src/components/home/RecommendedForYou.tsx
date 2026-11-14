import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/utils/api";
import { storage } from "@/utils/storage";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import { matchesProductCategory } from "@/utils/categoryFilter";
import type { Product } from "@/types";
import { RentalProductCard, RentalProductCardSkeleton } from "@/components/common/RentalProductCard";

const isComputerProduct = (p: Product) => {
  if (!p) return false;
  const cat = (p.category || "").toLowerCase();
  const title = (p.title || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  return (
    matchesProductCategory(cat, "laptops") ||
    matchesProductCategory(cat, "computers") ||
    cat.includes("computer") ||
    cat.includes("laptop") ||
    cat.includes("pc") ||
    cat.includes("mac") ||
    /macbook|laptop|thinkpad|dell|hp|asus|acer|lenovo|surface|desktop|pc|computer|imac/i.test(title) ||
    /laptop|macbook|processor|intel|ryzen|ram|workstation/i.test(desc)
  );
};

export function RecommendedForYou() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = storage.get<Product[]>("payent_server_products", []);
      const pool = (cached && cached.length > 0 ? cached : INITIAL_FALLBACK_PRODUCTS).filter((p) => !isFakeOrDeletedProduct(p));
      const comps = pool.filter(isComputerProduct);
      if (comps.length > 0) return comps.slice(0, 8);
    } catch {}
    return INITIAL_FALLBACK_PRODUCTS.filter(isComputerProduct).slice(0, 8);
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => products.length === 0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = direction === "left" ? -480 : 480;
    carouselRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  useEffect(() => {
    let active = true;

    const loadComputers = async () => {
      try {
        let computerItems: Product[] = [];

        // Parallel fetch recommendations & category query
        const [persRes, lapRes] = await Promise.all([
          user?.email ? api.getPersonalizedRecommendations(user.email).catch(() => null) : Promise.resolve(null),
          api.getFilteredProductsPage({ categories: "laptops", limit: 12 }).catch(() => null),
        ]);

        if (!active) return;

        if (Array.isArray(persRes?.items)) {
          computerItems = persRes.items.filter(isComputerProduct);
        }

        if (Array.isArray(lapRes?.items)) {
          const matched = lapRes.items.filter(isComputerProduct);
          const seen = new Set(computerItems.map((p) => p.id));
          for (const item of matched) {
            if (!seen.has(item.id)) {
              computerItems.push(item);
              seen.add(item.id);
            }
          }
        }

        // Fallback: search all catalog products for computers if still under target
        if (active && computerItems.length < 4) {
          try {
            const allResult = await api.getFilteredProductsPage({ limit: 40 }).catch(() => null);
            if (active && Array.isArray(allResult?.items)) {
              const matched = allResult.items.filter(isComputerProduct);
              const seen = new Set(computerItems.map((p) => p.id));
              for (const item of matched) {
                if (!seen.has(item.id)) {
                  computerItems.push(item);
                  seen.add(item.id);
                }
              }
            }
          } catch {}
        }

        // Fallback to trending computers if catalog search had none
        if (active && computerItems.length === 0) {
          try {
            const trending = await api.getTrendingRecommendations().catch(() => null);
            if (active && Array.isArray(trending)) {
              computerItems = trending.filter(isComputerProduct);
            }
          } catch {}
        }

        if (active && computerItems.length > 0) {
          setProducts(computerItems.slice(0, 8));
        }
      } catch {
        // Safe fallback
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadComputers();

    return () => {
      active = false;
    };
  }, [user]);

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-5 sm:py-7 bg-white dark:bg-[#1E1E1E] border-b border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-2 sm:mb-2.5">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              Recommended For You — Computers
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Curated laptops, workstations, and high-performance computing hardware
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Scroll recommended computers left"
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Scroll recommended computers right"
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1E1E1E] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isLoading ? (
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

export default RecommendedForYou;
