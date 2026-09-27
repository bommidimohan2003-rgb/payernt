import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Heart,
  MapPin,
  Package,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Product } from "@/types";
import { getOptimizedImageUrl, getResponsiveImageSrcSet } from "@/utils/images";

interface DisplayProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviewsCount: number;
  location: string;
  image: string;
  badge?: string;
}

export function FeaturedProducts() {
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const [products, setProducts] = useState<DisplayProduct[]>(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    const seen = new Set<string>();
    const unique = cached.filter((p) => {
      if (!p || !p.id || !p.title || seen.has(p.id)) return false;
      seen.add(p.id);
      return p.status === "approved" || !p.status;
    });
    return unique.map((p, idx) => ({
      id: p.id,
      title: p.title,
      category: p.category || "Gear",
      price: Number(p.price) || 0,
      rating: Number(p.rating) || 5.0,
      reviewsCount: Number(p.reviews) || 0,
      location: p.location || p.owner?.city || p.owner?.address || "India",
      image: p.image || (p.images && p.images[0]) || "",
      badge: idx === 0 ? "Featured" : p.status === "approved" ? "Verified" : undefined,
    }));
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = storage.get<Product[]>("payent_server_products", []);
    return cached.length === 0;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const loadRealProducts = useCallback(async () => {
    if (products.length === 0) {
      setIsLoading(true);
    }
    try {
      let realListings: Product[] = [];

      // 1. Fetch real products from backend public listings
      const serverProds = await api.getPublicProducts();
      if (Array.isArray(serverProds)) {
        realListings = serverProds;
      } else {
        const cachedServer = storage.get<Product[]>("payent_server_products", []);
        realListings = cachedServer;
      }

      // Deduplicate by ID and only accept real approved items (no fake hardcoded items)
      const seen = new Set<string>();
      const uniqueReal = realListings.filter((p) => {
        if (!p || !p.id || !p.title || seen.has(p.id)) return false;
        seen.add(p.id);
        return p.status === "approved" || !p.status;
      });

      const mapped: DisplayProduct[] = uniqueReal.map((p, idx) => ({
        id: p.id,
        title: p.title,
        category: p.category || "Gear",
        price: Number(p.price) || 0,
        rating: Number(p.rating) || 5.0,
        reviewsCount: Number(p.reviews) || 0,
        location: p.location || p.owner?.city || p.owner?.address || "India",
        image: p.image || (p.images && p.images[0]) || "",
        badge: idx === 0 ? "Featured" : p.status === "approved" ? "Verified" : undefined,
      }));

      setProducts(mapped);
    } catch (err) {
      console.warn("[FeaturedProducts] Could not load real products:", err);
      if (products.length === 0) {
        setProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [products.length]);

  useEffect(() => {
    loadRealProducts();

    // Listen for live product updates from lenders or admins
    const handleUpdate = () => loadRealProducts();
    window.addEventListener("payent_products_updated", handleUpdate);
    window.addEventListener("payent:storage_change", handleUpdate);

    return () => {
      window.removeEventListener("payent_products_updated", handleUpdate);
      window.removeEventListener("payent:storage_change", handleUpdate);
    };
  }, [loadRealProducts]);

  const handleWishlist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      const redirectTarget = `/product/${id}`;
      try {
        localStorage.setItem("pay₹ent_pending_product_redirect", redirectTarget);
        localStorage.setItem("pendingProductId", String(id));
      } catch (e) {}
      toast.info("Please log in to save gear to your wishlist.");
      navigate({ to: "/login", search: { redirect: redirectTarget } as any });
      return;
    }
    toggle(id);
    const isLiked = has(id);
    toast.success(isLiked ? "Removed from wishlist" : "Saved to wishlist!");
  };

  const handleDetails = (id: string) => {
    if (!user) {
      const redirectTarget = `/product/${id}`;
      try {
        localStorage.setItem("pay₹ent_pending_product_redirect", redirectTarget);
        localStorage.setItem("pendingProductId", String(id));
      } catch (e) {}
      navigate({ to: "/login", search: { redirect: redirectTarget } as any });
      return;
    }
    navigate({ to: "/product/$id", params: { id } });
  };

  // Dynamically compute category tabs strictly from existing real items
  const categoryTabs = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return cats.length > 0 ? ["All", ...cats] : ["All"];
  }, [products]);

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter(
        (p) =>
          p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().includes(p.category.toLowerCase())
      );

  const displayedProducts = filteredProducts.slice(0, 8);

  return (
    <section className="relative overflow-hidden bg-white dark:bg-[#05090D] py-12 sm:py-16 text-neutral-900 dark:text-white transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
                Featured Rentals
              </h2>
              <span className="inline-block w-8 h-[3px] bg-primary rounded-full" />
            </div>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 dark:text-[#A8B1BA]">
              Real verified equipment listed by trusted creators across India.
            </p>
          </div>

          {/* Interactive Filter Pills & View All Link */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {categoryTabs.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-[#0A1017] border border-black/5 dark:border-white/10">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedCategory(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${selectedCategory === tab
                        ? "bg-white dark:bg-[#141F2B] text-neutral-950 dark:text-white shadow-xs border border-black/5 dark:border-white/10"
                        : "text-neutral-500 dark:text-[#8B98A5] hover:text-neutral-900 dark:hover:text-white"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            <Link
              to="/categories"
              className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-[#A8B1BA] hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors group ml-2"
            >
              <span>Browse All Gear</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 text-neutral-700 dark:text-neutral-300" />
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-neutral-100 dark:bg-[#0A1017] border border-black/5 dark:border-white/10 h-72 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State (Only Real Items Allowed - Zero Fake Mock Data) */}
        {!isLoading && displayedProducts.length === 0 && (
          <div className="rounded-2xl p-8 sm:p-12 border border-dashed border-black/15 dark:border-white/15 bg-neutral-50/50 dark:bg-[#070D13] text-center max-w-xl mx-auto flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary dark:bg-white/10 dark:text-white flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
              No Live Rentals Yet
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 dark:text-[#A8B1BA] max-w-md">
              Be the first creator or lender to list your equipment and start earning daily rental income.
            </p>
            <Link
              to="/browse"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#161616] hover:bg-[#262626] text-[#F2F0EA] dark:bg-[#F2F0EA] dark:text-[#161616] dark:hover:bg-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <span>Explore All Gear</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Responsive Showcase Grid (Real Listings Only) */}
        {!isLoading && displayedProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {displayedProducts.map((p) => {
              const isLiked = has(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => handleDetails(p.id)}
                  onMouseEnter={() => {
                    api.cacheProduct({ id: p.id, title: p.title, price: p.price, image: p.image, category: p.category } as any);
                    api.getProduct(p.id).catch(() => {});
                  }}
                  onFocus={() => {
                    api.getProduct(p.id).catch(() => {});
                  }}
                  className="group relative rounded-3xl overflow-hidden bg-neutral-950 border border-black/10 dark:border-white/15 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer p-4 select-none aspect-[4/5] sm:aspect-[3/4] min-h-[350px] sm:min-h-[380px]"
                >
                  {/* Full-bleed background image */}
                  <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-900 pointer-events-none">
                    {p.image ? (
                      <img
                        src={getOptimizedImageUrl(p.image, 'card')}
                        srcSet={getResponsiveImageSrcSet(p.image, [320, 480, 640]) || undefined}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/40 text-center h-full">
                        <Package className="h-10 w-10 mb-1 opacity-40 text-neutral-500" />
                        <span className="text-[11px] font-semibold text-neutral-400">No image</span>
                      </div>
                    )}
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />
                  </div>

                  {/* Top Row: Badges & Wishlist */}
                  <div className="relative z-10 flex items-center justify-between gap-2 pointer-events-auto">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/15 shadow-sm">
                          {p.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/15 shadow-sm">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{p.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={(e) => handleWishlist(e, p.id)}
                      aria-label="Save to wishlist"
                      className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md flex items-center justify-center text-white hover:text-rose-500 transition-all cursor-pointer shadow-md border border-white/20"
                    >
                      <Heart
                        className={`h-3.5 w-3.5 transition-colors ${
                          isLiked ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: Details sitting directly on the image */}
                  <div className="relative z-10 space-y-2 mt-auto text-left pointer-events-auto">
                    {/* Meta Pill: Category + Location */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/15">
                        <Tag className="h-2.5 w-2.5 text-emerald-400" />
                        <span>{p.category}</span>
                      </span>
                      {p.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-medium border border-white/10 truncate max-w-[130px]">
                          <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </span>
                      )}
                    </div>

                    {/* Product Title */}
                    <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-primary transition-colors line-clamp-1 leading-snug drop-shadow-md">
                      {p.title}
                    </h3>

                    {/* Price & Action */}
                    <div className="pt-2 border-t border-white/15 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-white/70 block">
                          Daily Rate
                        </span>
                        <div className="text-lg sm:text-xl font-black tracking-tight font-mono leading-none mt-0.5 text-white">
                          ₹{p.price.toLocaleString("en-IN")}
                          <span className="text-[11px] font-normal text-white/70 ml-0.5">
                            /day
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDetails(p.id);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold shadow-md border border-white/25 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <span>Rent Gear</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
