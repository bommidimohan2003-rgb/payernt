import React, { useEffect, useRef, useState, useContext } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, MapPin, Package, ShoppingBag, ShoppingCart, Loader2 } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { CartContext } from "@/hooks/useCart";
import { toast } from "sonner";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { formatProductLocation, isProductAvailable } from "@/utils/formatters";

export interface RentalProductCardProps {
  product: Product;
  className?: string;
  priority?: boolean;
  variant?: "default" | "compact" | "explore" | "portrait";
}

function getProductBrand(product: Product): string {
  if (product.brand && product.brand.trim()) return product.brand.trim();
  const title = product.title || product.name || "";
  const firstWord = title.trim().split(/\s+/)[0];
  const knownBrands = [
    "Sony", "Apple", "Canon", "DJI", "RED", "Fujifilm", "Nikon",
    "Blackmagic", "Rode", "GoPro", "Panasonic", "Sennheiser",
    "MacBook", "Dell", "HP", "Lenovo", "Asus", "Bose", "Shure"
  ];
  const matched = knownBrands.find((b) => b.toLowerCase() === firstWord.toLowerCase());
  if (matched) return matched;
  if (product.category) {
    return product.category.charAt(0).toUpperCase() + product.category.slice(1);
  }
  return "Tech Gear";
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
  const isPortrait = variant === "portrait";

  const cartCtx = useContext(CartContext);
  const cartItems = cartCtx?.cartItems || [];
  const addToCart = cartCtx?.addToCart;

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const isInCart = cartItems.some(
    (it) => it.product_id === productId || String(it.id) === productId
  );

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

  const handleCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Auth check: if logged out, redirect to login preserving intended path
    if (!user) {
      toast.info("Please log in to add items to your rental cart.", {
        action: {
          label: "Log In",
          onClick: () => {
            const currentPath =
              typeof window !== "undefined"
                ? window.location.pathname + window.location.search
                : "/explore";
            navigate({
              to: "/login",
              search: { redirect: currentPath } as any,
            });
          },
        },
      });
      return;
    }

    // 2. Prevent repeated rapid clicks from creating duplicate requests
    if (isAddingToCart) return;

    // 3. Duplicate check: prevent duplicate cart entries for same product
    if (isInCart) {
      toast.info(`${title} is already in your cart.`, {
        action: {
          label: "View Cart",
          onClick: () => navigate({ to: "/cart" }),
        },
      });
      return;
    }

    // 4. Add to cart using live backend API
    if (addToCart) {
      setIsAddingToCart(true);
      try {
        const ok = await addToCart(productId);
        if (ok) {
          toast.success(`Added ${title} to your rental cart!`, {
            action: {
              label: "View Cart",
              onClick: () => navigate({ to: "/cart" }),
            },
          });
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        toast.error(errObj?.message || "Failed to add to cart.");
      } finally {
        setIsAddingToCart(false);
      }
    } else {
      navigate({ to: "/product/$id", params: { id: productId } });
    }
  };

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

  // =========================================================================
  // PORTRAIT VARIANT: Compact Height + Image Reaching Available Space
  // Exact 1:1 Match to Sneaker Reference Image:
  // - Outer dark shell with thick border frame (rounded-[24px] sm:rounded-[26px], p-1.5 sm:p-2)
  // - Inner white image panel with ALL 4 CORNERS ROUNDED (rounded-[18px] sm:rounded-[20px])
  // - Product photography fills the panel (w-full h-full object-contain, p-1.5 sm:p-2)
  // - Top-right dark circular wishlist button with white outline heart (44x44 hitbox)
  // - Clean: NO status pill / NO tags cluttering the image
  // - Bottom info panel: White bold title, muted grey brand
  // - Bottom action row: Prominent daily price (₹... /day), white squircle Rent button with custom bag+arrow icon
  // =========================================================================
  if (isPortrait) {
    const brand = getProductBrand(product);
    return (
      <article
        data-testid={`portrait-product-card-${productId}`}
        className={cn(
          "group relative flex flex-col justify-between w-[206px] sm:w-[226px] md:w-[240px] h-[270px] sm:h-[285px] md:h-[295px] rounded-[24px] sm:rounded-[26px] border border-neutral-800/60 dark:border-neutral-700/60 bg-[#1E1E1E] text-white overflow-hidden select-none shrink-0 snap-start shadow-xs hover:border-neutral-600 dark:hover:border-neutral-500 transition-all duration-200 cursor-pointer",
          className
        )}
      >
        <Link
          to="/product/$id"
          params={{ id: productId }}
          className="flex flex-col h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-[24px] sm:rounded-[26px]"
          aria-label={`View details for ${title}`}
        >
          {/* Top Inner Image Panel - Flush to outer card frame with rounded bottom corners */}
          <div className="relative w-full h-[172px] sm:h-[184px] md:h-[192px] bg-neutral-100 dark:bg-neutral-800 rounded-b-[20px] sm:rounded-b-[22px] flex items-center justify-center overflow-hidden shrink-0">
            {/* Product Image: Reaches fully and fits edge-to-edge */}
            {showFallbackPlaceholder ? (
              <div className="flex flex-col items-center justify-center gap-1 text-neutral-400">
                <Package className="h-7 w-7 stroke-[1.75]" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-none">No photo</span>
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
                  "w-full h-full object-cover object-center transition-all duration-300 group-hover:scale-105",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            )}
          </div>

          {/* Bottom Information Panel - Integrated inside dark card frame */}
          <div className="relative w-full flex-1 flex flex-col justify-between pt-2 pb-2.5 px-3 sm:px-3.5 shrink-0">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-[13px] font-semibold text-white truncate leading-tight drop-shadow-sm group-hover:text-neutral-200 transition-colors">
                {title}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-normal truncate mt-0.5">
                {brand}
              </p>
            </div>

            {/* Bottom Row: Large Prominent Price + White Squircle Rent Action Button */}
            <div className="flex items-end justify-between gap-1.5 mt-auto pt-1">
              <div className="min-w-0 flex items-baseline gap-0.5 text-white tabular-nums">
                <span className="text-base sm:text-lg md:text-xl font-bold tracking-tight leading-none">
                  ₹{price.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] sm:text-[11px] text-neutral-400 font-normal">
                  /day
                </span>
              </div>

              {/* White Squircle Rent / Cart Action Button */}
              <button
                type="button"
                onClick={handleCartClick}
                disabled={isAddingToCart}
                aria-label={isInCart ? `${title} is in your cart - View Cart` : `Add ${title} to rental cart`}
                className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-[12px] sm:rounded-[14px] bg-white hover:bg-neutral-100 active:scale-95 text-neutral-950 flex items-center justify-center transition-all cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0 disabled:opacity-75"
              >
                {isAddingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-950" aria-hidden="true" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-neutral-950"
                    aria-hidden="true"
                  >
                    <path d="M8.5 7.5a3.5 3.5 0 0 1 7 0" />
                    <path d="M4 8.5h16l-1.8 10.5a2 2 0 0 1-2 1.7H7.8a2 2 0 0 1-2-1.7L4 8.5z" />
                    <path d="M16 19.5v-6" />
                    <path d="m13.5 16 2.5-2.5 2.5 2.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </Link>

        {/* Wishlist Button: Elevated circle at Top-Right of inner light panel (44x44px interaction hitbox) */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          className="group/wish absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 cursor-pointer"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex h-7 w-7 sm:h-7.5 sm:w-7.5 items-center justify-center rounded-full transition-colors shadow-sm",
              isWishlisted
                ? "bg-[#1E1E1E] text-white"
                : "bg-[#1E1E1E]/90 hover:bg-[#1E1E1E] text-white"
            )}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors stroke-[2]",
                isWishlisted
                  ? "fill-white text-white"
                  : "text-white"
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      </article>
    );
  }

  // =========================================================================
  // STANDARD OVERLAY VARIANTS: default, compact, explore (Browse & Other Pages)
  // Preserved for Phase 1-4 Test Parity & Multi-Page Consistency
  // =========================================================================
  return (
    <article
      className={cn(
        "group relative bg-neutral-100 dark:bg-[#1E1E1E] border border-neutral-200/90 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors duration-200 shadow-xs overflow-hidden select-none",
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
          <div className="absolute inset-0 bg-neutral-200/80 dark:bg-[#262626]" />
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

            <div className="flex items-end justify-between gap-1.5 pt-0.5">
              <div className="flex items-baseline gap-1 font-sans tabular-nums whitespace-nowrap text-white">
                <span className="text-[13px] sm:text-base font-semibold">
                  ₹{price.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] sm:text-xs font-normal text-white/80">
                  /day
                </span>
              </div>

              {/* Cart Symbol on Bottom-Right */}
              <button
                type="button"
                onClick={handleCartClick}
                disabled={isAddingToCart}
                aria-label={isInCart ? `${title} is in your cart - View Cart` : `Add ${title} to rental cart`}
                className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full sm:rounded-[12px] bg-white hover:bg-neutral-100 active:scale-95 text-neutral-950 flex items-center justify-center transition-all cursor-pointer shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0 disabled:opacity-75"
              >
                {isAddingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-950" aria-hidden="true" />
                ) : (
                  <ShoppingCart className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2] text-neutral-950" aria-hidden="true" />
                )}
              </button>
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
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 group-hover/wish:border-neutral-400 dark:group-hover/wish:border-neutral-500 group-hover/wish:text-neutral-950 dark:group-hover/wish:text-white transition-colors shadow-xs"
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
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 group-hover/wish:border-neutral-400 dark:group-hover/wish:border-neutral-500 group-hover/wish:text-neutral-950 dark:group-hover/wish:text-white transition-colors shadow-xs"
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
  variant?: "default" | "compact" | "explore" | "portrait";
}) {
  if (variant === "portrait") {
    return (
      <div className="w-[206px] sm:w-[226px] md:w-[240px] h-[270px] sm:h-[285px] md:h-[295px] rounded-[24px] sm:rounded-[26px] border border-neutral-800/60 dark:border-neutral-700/60 bg-[#1E1E1E] overflow-hidden shadow-xs flex flex-col justify-between shrink-0 snap-start">
        <div className="w-full h-[172px] sm:h-[184px] md:h-[192px] bg-neutral-200 dark:bg-neutral-800 rounded-b-[20px] sm:rounded-b-[22px] shrink-0" />
        <div className="w-full flex-1 flex flex-col justify-between pt-2 pb-2.5 px-3 sm:px-3.5 shrink-0">
          <div className="space-y-1">
            <div className="h-3 w-3/4 rounded bg-neutral-700/80" />
            <div className="h-2 w-1/3 rounded bg-neutral-700/60" />
          </div>
          <div className="flex items-end justify-between gap-1.5 mt-auto pt-1">
            <div className="h-5 w-14 rounded bg-neutral-700/80" />
            <div className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-[12px] sm:rounded-[14px] bg-white/20" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "explore") {
    return (
      <div className="relative w-full aspect-[4/5] rounded-2xl bg-neutral-200 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-700/80 overflow-hidden shadow-xs flex flex-col justify-end px-3 pb-3 sm:px-3.5 sm:pb-3.5 gap-1.5">
        <div className="h-4 w-3/4 rounded bg-neutral-300/90 dark:bg-[#282828]" />
        <div className="h-3 w-1/2 rounded bg-neutral-300/90 dark:bg-[#282828]" />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="h-4 w-20 rounded bg-neutral-300/90 dark:bg-[#282828]" />
          <div className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-full sm:rounded-[12px] bg-neutral-300/90 dark:bg-[#282828]" />
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="relative w-full aspect-[5/4] sm:aspect-[3/2] rounded-xl bg-neutral-200 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-700/80 overflow-hidden shadow-xs flex flex-col justify-end px-2.5 pb-2 sm:px-3 sm:pb-2.5 gap-1.5">
        <div className="h-3.5 w-3/4 rounded bg-neutral-300/90 dark:bg-[#282828]" />
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-1/2 rounded bg-neutral-300/90 dark:bg-[#282828]" />
          <div className="h-3.5 w-16 rounded bg-neutral-300/90 dark:bg-[#282828]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl bg-neutral-200 dark:bg-[#1E1E1E] border border-neutral-200 dark:border-neutral-700/80 overflow-hidden shadow-xs flex flex-col justify-end px-3 pb-2.5 gap-1.5">
      <div className="h-4 w-3/4 rounded bg-neutral-300/90 dark:bg-[#282828]" />
      <div className="flex items-center justify-between gap-2">
        <div className="h-3 w-1/3 rounded bg-neutral-300/90 dark:bg-[#282828]" />
        <div className="h-3.5 w-20 rounded bg-neutral-300/90 dark:bg-[#282828]" />
      </div>
    </div>
  );
}
