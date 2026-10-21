import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { ProductCard } from "@/components/common/ProductCard";
import { Button } from "@/components/common/Button";
import { useWishlist } from "@/hooks/useWishlist";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { api } from "@/utils/api";
import type { Product } from "@/types";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";

export default function Wishlist() {
  const { ids } = useWishlist();
  const navigate = useNavigate();

  const [allProductsList, setAllProductsList] = useState<Product[]>([]);

  useEffect(() => {
    api
      .getPublicProducts()
      .then((serverProducts) => {
        if (Array.isArray(serverProducts)) {
          setAllProductsList(serverProducts.filter((p) => !isFakeOrDeletedProduct(p)));
        }
      })
      .catch((err) => console.warn("Failed to load wishlist products:", err));
  }, []);

  const items = allProductsList.filter((p) => ids.includes(p.id) && !isFakeOrDeletedProduct(p));

  return (
    <MainLayout>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <Heart className="h-7 w-7 text-foreground fill-foreground" /> Your
          wishlist
        </h1>
        <p className="mt-2 text-muted-foreground">{items.length} saved items</p>

        {items.length ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-10 card-premium p-16 text-center">
            <Heart className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Your wishlist is empty.
            </p>
            <Button
              className="mt-6"
              onClick={() => navigate({ to: "/categories" })}
            >
              Browse marketplace
            </Button>
          </div>
        )}
      </section>
    </MainLayout>
  );
}
