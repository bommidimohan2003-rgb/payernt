import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MapPin, Package } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { formatProductLocation, isProductAvailable } from "@/utils/formatters";

export interface RentalProductCardProps {
  product: Product;
  className?: string;
  priority?: boolean;
  variant?: "default" | "compact" | "explore";
}

export function RentalProductCard({
  product,
  className,
  priority = false,
  variant = "default",
}: RentalProductCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const productId = String(product.id);
  const isWishlisted = has(productId);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isCompact = variant === "compact";
  const isExplore = variant === "explore";

  const price = Number(product.daily_rate || product.price || 0);
  const title = product.title || product.name || "Rental Product";
  const location = formatProductLocation(product);
  const isAvailable = isProductAvailable(product);
  const rawImageUrl =
    product.image ||
    (Array.isArray(product.images) && product.images[0]) ||
    "";
  const imageUrl = typeof rawImageUrl === "string" ? rawImageUrl.trim() : "";
  const showFallbackPlaceholder = !imageUrl || imageError;

  useEffect(() => {
    setImageError(false);
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setImageLoaded(true);
      } else {
        setImageError(true);
        setImageLoaded(true);
      }
    } else {
      setImageLoaded(false);
    }
  }, [imageUrl]);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please log in to add items to your wishlist", {
        action: {
          label: "Log In",
          onClick: () => navigate({ to: "/login" }),
        },
      });
      return;
    }

    const nextState = !isWishlisted;
    const succeeded = await toggle(productId);
    if (!succeeded) {
      toast.error("Failed to update wishlist. Please try again.");
      return;
    }
    if (nextState) {
      toast.success("Added to Wishlist");
    } else {
      toast.info("Removed from Wishlist");
    }
  };

  return (
    <article
      className={cn(
        "group relative bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors duration-200 shadow-xs overflow-hidden select-none",
        isCompact ? "rounded-xl" : "rounded-2xl",
        className
      )}
    >
      <Link
        to="/product/$id"
        params={{ id: productId }}
        className={cn(
          "relative flex w-full flex-col justify-end overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white",
          isExplore
            ? "aspect-[4/5] rounded-2xl"
            : isCompact
            ? "aspect-[5/4] sm:aspect-[3/2] rounded-xl"
            : "aspect-[4/3] rounded-2xl"
        )}
        aria-label={`View details for ${title}`}
      >
        {/* Static neutral backdrop while image loads */}
        {!imageLoaded && !showFallbackPlaceholder && (
          <div className="absolute inset-0 bg-neutral-200/80 dark:bg-neutral-800" />
        )}

        {showFallbackPlaceholder ? (
          <div
            className={cn(
              "absolute inset-x-0 flex flex-col items-center justify-center gap-0.5 text-neutral-600 dark:text-neutral-400",
              isExplore
                ? "top-10 bottom-[42%]"
                : "top-8 bottom-[58%] sm:bottom-[50%]"
            )}
          >
            <Package
              className={cn("stroke-[1.75]", isCompact ? "h-5 w-5 sm:h-6 sm:w-6" : "h-6 w-6")}
              aria-hidden="true"
            />
            <span className="text-[10px] sm:text-xs font-medium leading-none">No photo</span>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Genuine Availability Status Pill */}
        <div
          aria-label={`Status: ${isAvailable ? "Available" : "Unavailable"}`}
          className={cn(
            "pointer-events-none absolute z-10 inline-flex items-center gap-1.5 rounded-full backdrop-blur-md border shadow-xs font-medium leading-none tracking-tight",
            isExplore
              ? "top-2.5 left-2.5 px-2.5 py-1 text-[10px] sm:text-[11px]"
              : "top-2 left-2 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px]",
            isAvailable
              ? "bg-neutral-950/75 text-white border-white/15"
              : "bg-neutral-950/85 text-neutral-300 border-white/15"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              isAvailable ? "bg-emerald-400" : "bg-rose-400"
            )}
            aria-hidden="true"
          />
          <span>{isAvailable ? "Available" : "Unavailable"}</span>
        </div>

        {/* Overlaid Product Information (Strictly NO fake ratings, discounts, or condition badges) */}
        {isExplore ? (
          <div className="relative z-10 w-full bg-gradient-to-t from-black/92 via-black/72 to-transparent px-3 pt-12 pb-3 sm:px-3.5 sm:pt-14 sm:pb-3.5 flex flex-col gap-1">
            <h3 className="text-[13px] sm:text-sm font-semibold text-white line-clamp-2 break-words leading-snug drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)] group-hover:text-neutral-200 transition-colors">
              {title}
            </h3>

            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-white/90 min-w-0">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 stroke-[1.75]" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </div>

            <div className="flex items-baseline gap-1 font-sans tabular-nums whitespace-nowrap pt-0.5 text-white">
              <span className="text-[13px] sm:text-base font-semibold">
                ₹{price.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] sm:text-xs font-normal text-white/80">
                /day
              </span>
            </div>
          </div>
        ) : isCompact ? (
          <div className="relative z-10 w-full bg-gradient-to-t from-black/92 via-black/72 to-transparent px-2.5 pt-7 pb-2 sm:px-3 sm:pt-9 sm:pb-2.5 flex flex-col gap-0.5">
            <h3 className="text-xs sm:text-[13px] font-semibold text-white line-clamp-1 sm:line-clamp-2 break-words leading-snug drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)] group-hover:text-neutral-200 transition-colors">
              {title}
            </h3>

            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-white/85 min-w-0">
              <MapPin className="h-3 w-3 shrink-0 stroke-[1.75]" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </div>

            <div className="flex items-baseline gap-0.5 font-sans tabular-nums whitespace-nowrap pt-0.5">
              <span className="text-xs sm:text-sm font-semibold text-white">
                ₹{price.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] sm:text-[11px] font-normal text-white/80">
                /day
              </span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full bg-gradient-to-t from-black/92 via-black/72 to-transparent px-2.5 pt-8 pb-2 sm:px-3 sm:pt-10 sm:pb-2.5 flex flex-col gap-0.5">
            <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-1 leading-snug drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)] group-hover:text-neutral-200 transition-colors">
              {title}
            </h3>

            <div className="flex items-center justify-between gap-2 min-w-0 pt-0.5">
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-white/85 min-w-0">
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 stroke-[1.75]" aria-hidden="true" />
                <span className="truncate">{location}</span>
              </div>

              <div className="flex items-baseline gap-1 font-sans tabular-nums whitespace-nowrap shrink-0 text-white">
                <span className="hidden sm:inline text-[11px] text-white/75 font-medium">
                  Daily Rental ·
                </span>
                <span className="text-xs sm:text-sm font-semibold">
                  ₹{price.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] sm:text-[11px] font-normal text-white/80">
                  / day
                </span>
              </div>
            </div>
          </div>
        )}
      </Link>

      {/* Wishlist Button (Heart) - 44x44px hit target across mobile & desktop */}
      {isCompact ? (
        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          className="group/wish absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 group-hover/wish:border-neutral-400 dark:group-hover/wish:border-neutral-500 group-hover/wish:text-neutral-950 dark:group-hover/wish:text-white transition-colors shadow-xs"
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors stroke-[1.75]",
                isWishlisted
                  ? "fill-neutral-950 dark:fill-white text-neutral-950 dark:text-white"
                  : "text-neutral-700 dark:text-neutral-300"
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          className="group/wish absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 group-hover/wish:border-neutral-400 dark:group-hover/wish:border-neutral-500 group-hover/wish:text-neutral-950 dark:group-hover/wish:text-white transition-colors shadow-xs"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors stroke-[1.75]",
                isWishlisted
                  ? "fill-neutral-950 dark:fill-white text-neutral-950 dark:text-white"
                  : "text-neutral-700 dark:text-neutral-300"
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      )}
    </article>
  );
}

export function RentalProductCardSkeleton({
  variant = "default",
}: {
  variant?: "default" | "compact" | "explore";
}) {
  if (variant === "explore") {
    return (
      <div className="relative w-full aspect-[4/5] rounded-2xl bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs flex flex-col justify-end px-3 pb-3 sm:px-3.5 sm:pb-3.5 gap-1.5">
        <div className="h-4 w-3/4 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
        <div className="h-3 w-1/2 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
        <div className="h-4 w-20 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="relative w-full aspect-[5/4] sm:aspect-[3/2] rounded-xl bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs flex flex-col justify-end px-2.5 pb-2 sm:px-3 sm:pb-2.5 gap-1.5">
        <div className="h-3.5 w-3/4 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-1/2 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
          <div className="h-3.5 w-16 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs flex flex-col justify-end px-3 pb-2.5 gap-1.5">
      <div className="h-4 w-3/4 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
      <div className="flex items-center justify-between gap-2">
        <div className="h-3 w-1/3 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
        <div className="h-3.5 w-20 rounded bg-neutral-300/90 dark:bg-neutral-700/90" />
      </div>
    </div>
  );
}
