import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { RentalProductCard } from "@/components/common/RentalProductCard";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/common/Button";
import { useWishlist } from "@/hooks/useWishlist";
import { storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Product } from "@/types";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import { INITIAL_FALLBACK_PRODUCTS } from "@/utils/fallbackProducts";

export default function Wishlist() {
  const { ids } = useWishlist();
  const navigate = useNavigate();

  const [allProductsList, setAllProductsList] = useState<Product[]>(() =>
    INITIAL_FALLBACK_PRODUCTS.filter((p) => !isFakeOrDeletedProduct(p))
  );

  useEffect(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    if (Array.isArray(cached) && cached.length > 0) {
      const cleanCached = cached.filter((p) => !isFakeOrDeletedProduct(p));
      if (cleanCached.length > 0) {
        setAllProductsList((prev) => {
          const merged = [...cleanCached];
          for (const item of prev) {
            if (!merged.some((m) => String(m.id) === String(item.id))) {
              merged.push(item);
            }
          }
          return merged;
        });
      }
    }

    api
      .getPublicProducts()
      .then((serverProducts) => {
        if (Array.isArray(serverProducts)) {
          const cleanServer = serverProducts.filter((p) => !isFakeOrDeletedProduct(p));
          const merged = [...cleanServer];
          for (const fb of INITIAL_FALLBACK_PRODUCTS) {
            if (!isFakeOrDeletedProduct(fb) && !merged.some((m) => String(m.id) === String(fb.id))) {
              merged.push(fb);
            }
          }
          setAllProductsList(merged);
        }
      })
      .catch((err) => console.warn("Failed to load wishlist products:", err));
  }, []);

  const items = allProductsList.filter(
    (p) => ids.includes(String(p.id)) && !isFakeOrDeletedProduct(p)
  );

  return (
    <MainLayout>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-8 sm:py-10">
        <BackButton fallback="/browse" className="mb-4" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-3 tracking-tight">
          <Heart className="h-7 w-7 text-foreground fill-foreground" aria-hidden="true" />
          <span>Your wishlist</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 tabular-nums">
          {items.length} saved {items.length === 1 ? "item" : "items"}
        </p>

        {items.length ? (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {items.map((p) => (
              <RentalProductCard key={String(p.id)} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] p-10 sm:p-16 text-center">
            <Heart className="h-10 w-10 mx-auto text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              Your wishlist is empty.
            </p>
            <Button
              className="mt-6"
              onClick={() => navigate({ to: "/browse" })}
            >
              Browse marketplace
            </Button>
          </div>
        )}
      </section>
    </MainLayout>
  );
}
