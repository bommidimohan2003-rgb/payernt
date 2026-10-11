import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Star,
  Compass,
  Flame,
  TrendingUp,
  Layers,
  Heart,
  ArrowRight,
} from "lucide-react";
import type { Product } from "@/types";
import { tracker } from "@/utils/eventTracker";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/common/Button";
import { Rating } from "@/components/common/Rating";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  type: "similar" | "trending" | "frequently_together" | "personalized";
  badge?: string;
  layout?: "grid" | "compact";
  className?: string;
}

export function RecommendationSection({
  title,
  subtitle,
  products,
  type,
  badge,
  layout = "grid",
  className,
}: RecommendationSectionProps) {
  const navigate = useNavigate();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();


  useEffect(() => {
    if (products && products.length > 0) {
      products.forEach((p) => {
        tracker.recommendationImpression(p.id, type);
      });
    }
  }, [products, type]);

  if (!products || products.length === 0) return null;

  const getIcon = () => {
    switch (type) {
      case "personalized":
        return <Flame className="h-4 w-4 text-amber-500" />;
      case "trending":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "frequently_together":
        return <Layers className="h-4 w-4 text-primary" />;
      default:
        return <Compass className="h-4 w-4 text-primary" />;
    }
  };

  const handleProductClick = (productId: string) => {
    tracker.recommendationClick(productId, type);
    navigate({ to: "/product/$id", params: { id: productId } });
  };

  const handleWishlistToggle = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      const redirectTarget = `/product/${productId}`;
      try {
        localStorage.setItem("pay₹ent_pending_product_redirect", redirectTarget);
        localStorage.setItem("pendingProductId", String(productId));
      } catch (e) {}
      toast.info("Please log in to save gear to your wishlist.");
      navigate({ to: "/login", search: { redirect: redirectTarget } as any });
      return;
    }
    toggle(productId);
  };

  if (layout === "compact") {
    return (
      <div
        className={cn("space-y-4 pt-6 border-t border-border/80", className)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">{getIcon()}</div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-foreground font-display">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
              {badge}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {products.slice(0, 4).map((product) => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              className="group flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <img
                src={product.image}
                alt={product.title}
                className="h-16 w-16 rounded-xl object-cover shrink-0 bg-secondary"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {product.title}
                </h4>
                <p className="text-[11px] font-extrabold text-foreground mt-0.5">
                  ₹{product.price.toLocaleString("en-IN")}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    /day
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className={cn("space-y-6 py-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Curated Selection
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-foreground font-display mt-1">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        </div>

        <Link
          to="/categories"
          className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 group transition-colors self-start sm:self-auto"
        >
          <span>View all in category</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((product) => {
          const isWishlisted = has(product.id);

          return (
            <div
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              className="group rounded-3xl p-3.5 bg-card border border-border hover:border-primary/40 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-secondary/30 mb-3">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <button
                  type="button"
                  onClick={(e) => handleWishlistToggle(e, product.id)}
                  aria-label="Wishlist item"
                  className={cn(
                    "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer shadow-md",
                    isWishlisted
                      ? "bg-rose-500 text-white"
                      : "bg-black/40 text-white hover:bg-black/60",
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4", isWishlisted && "fill-white")}
                  />
                </button>

                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                  {product.category}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Rating value={product.rating} />
                    {product.reviews > 0 && (
                      <span className="text-[11px] font-bold text-muted-foreground">
                        ({product.reviews} reviews)
                      </span>
                    )}
                  </div>

                  <div className="block group-hover:text-primary transition-colors">
                    <h3 className="font-extrabold text-sm md:text-base text-foreground line-clamp-1">
                      {product.title}
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-normal">
                    {product.description}
                  </p>
                </div>

                {/* Footer / Price & Rent Button */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">
                      Daily Rental
                    </span>
                    <span className="text-base md:text-lg font-black text-foreground">
                      ₹{product.price.toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-muted-foreground">
                        /day
                      </span>
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                    className="rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 gap-1 text-xs"
                  >
                    <span>Rent</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
