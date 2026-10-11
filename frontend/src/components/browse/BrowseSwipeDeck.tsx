import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import {
  Clock,
  Heart,
  RotateCcw,
  Tag,
  ArrowRight,
  Package,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Play,
  Video,
  Sparkles,
  X,
  ShieldCheck,
  Film,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Product } from "@/types";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, getResponsiveImageSrcSet } from "@/utils/images";
import { api } from "@/utils/api";

const KNOWN_BRANDS = [
  "Sony",
  "DJI",
  "Apple",
  "Canon",
  "Nikon",
  "Fujifilm",
  "Blackmagic",
  "RED",
  "RODE",
  "Sennheiser",
  "Shure",
  "Aputure",
  "Godox",
  "GoPro",
  "Royal Enfield",
];

function getProductBrand(product: Product): string | null {
  if ((product as unknown as { brand?: string }).brand) {
    return (product as unknown as { brand: string }).brand;
  }
  const text = `${product.title} ${product.description || ""}`.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (text.includes(b.toLowerCase())) {
      return b;
    }
  }
  return null;
}

export function getProductPrimaryImage(product?: Product | null): string {
  if (!product) return "";
  if (product.image && typeof product.image === "string" && product.image.trim()) {
    return product.image.trim();
  }
  if (
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    typeof product.images[0] === "string" &&
    product.images[0].trim()
  ) {
    return product.images[0].trim();
  }
  return "";
}

export interface BrowseSwipeDeckProps {
  products: Product[];
  className?: string;
  onResetFilters?: () => void;
}

export function BrowseSwipeDeck({
  products,
  className,
  onResetFilters,
}: BrowseSwipeDeckProps) {
  const [queue, setQueue] = useState<Product[]>(() => products);
  const [, setCycleIndex] = useState<number>(0);

  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Reset queue when products array changes (due to filter or search)
  useEffect(() => {
    setQueue(products);
    setCycleIndex(0);
  }, [products]);

  const activeProduct = queue[0] || null;
  const nextProduct = queue[1] || null;
  const thirdProduct = queue[2] || null;

  // Extract all images for the active product
  const productImages = useMemo(() => {
    if (!activeProduct) return [];
    let imgs: string[] = [];
    const rawImgs = (activeProduct as any)?.images;
    if (Array.isArray(rawImgs)) {
      imgs = [...rawImgs];
    } else if (typeof rawImgs === "string") {
      try {
        const parsed = JSON.parse(rawImgs);
        if (Array.isArray(parsed)) imgs = parsed;
        else if (typeof parsed === "string") imgs = [parsed];
      } catch {
        imgs = [rawImgs];
      }
    }
    imgs = imgs.filter(Boolean);
    const prim = getProductPrimaryImage(activeProduct);
    if (prim && !imgs.includes(prim)) {
      imgs = [prim, ...imgs];
    } else if (!imgs.length && prim) {
      imgs = [prim];
    }
    return imgs;
  }, [activeProduct]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setShowVideoModal(false);
  }, [activeProduct?.id]);

  const activeVideoUrl =
    activeProduct?.videoUrl ||
    activeProduct?.video_url ||
    (activeProduct as any)?.video_url ||
    null;

  // Preload next 1-2 product images to guarantee zero flicker / blank card
  useEffect(() => {
    const nextImgUrl = getProductPrimaryImage(nextProduct);
    if (nextImgUrl) {
      const img = new Image();
      img.src = getOptimizedImageUrl(nextImgUrl, "card");
    }
    const thirdImgUrl = getProductPrimaryImage(thirdProduct);
    if (thirdImgUrl) {
      const img = new Image();
      img.src = getOptimizedImageUrl(thirdImgUrl, "card");
    }
  }, [nextProduct, thirdProduct]);

  const isAvailable = useMemo(() => {
    if (!activeProduct) return false;
    return (
      activeProduct.available !== false &&
      activeProduct.availability_status !== "unavailable"
    );
  }, [activeProduct]);

  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const displayImage =
    productImages[activeImageIndex] ||
    (activeProduct ? getProductPrimaryImage(activeProduct) : "");

  // Motion values for real-time physics tracking on the active card
  const x = useMotionValue(0);

  // Subtle rotation: 3–6° max proportional to drag distance
  const rotate = useTransform(x, [-320, 320], [-6, 6]);

  // Subtle scale adjustment: 0.985 -> 1 -> 0.985
  const scale = useTransform(x, [-320, 0, 320], [0.985, 1, 0.985]);

  // Active card gentle opacity fade near full swipe boundaries
  const opacity = useTransform(x, [-450, -320, 0, 320, 450], [0.35, 0.9, 1, 0.9, 0.35]);

  // LINKED STACK TRANSITIONS: Background Card 2 rises & scales up in real-time as Card 1 is dragged away
  const nextScale = useTransform(x, [-320, 0, 320], [1, 0.96, 1]);
  const nextY = useTransform(x, [-320, 0, 320], [0, 12, 0]);
  const nextOpacity = useTransform(x, [-320, 0, 320], [1, 0.85, 1]);

  // LINKED STACK TRANSITIONS: Background Card 3 subtly scales up toward Card 2's position
  const thirdScale = useTransform(x, [-320, 0, 320], [0.96, 0.91, 0.96]);
  const thirdY = useTransform(x, [-320, 0, 320], [12, 24, 12]);
  const thirdOpacity = useTransform(x, [-320, 0, 320], [0.85, 0.5, 0.85]);

  // Gesture state tracking refs
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const pointerDownRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const hasMeaningfulDragRef = useRef<boolean>(false);
  const directionLockRef = useRef<"horizontal" | "vertical" | null>(null);
  const startPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastPosRef = useRef<{ x: number; time: number }>({ x: 0, time: 0 });
  const velocityRef = useRef<number>(0);
  const [isDraggingVisual, setIsDraggingVisual] = useState<boolean>(false);

  // Execute swipe: smooth exit followed by queue rotation
  const executeSwipe = useCallback(
    (direction: "left" | "right") => {
      if (queue.length === 0 || isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      const targetX = direction === "left" ? -500 : 500;

      animate(x, targetX, {
        duration: 0.22,
        ease: [0.32, 0.72, 0, 1],
      }).then(() => {
        setQueue((prevQueue) => {
          if (prevQueue.length <= 1) return prevQueue;
          const [first, ...rest] = prevQueue;
          return [...rest, first];
        });
        x.set(0);
        setCycleIndex((c) => c + 1);
        isAnimatingRef.current = false;
      });
    },
    [queue.length, x],
  );

  // Keyboard navigation for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        executeSwipe("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        executeSwipe("right");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeSwipe]);

  // REAL-TIME POINTER EVENT HANDLERS
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isAnimatingRef.current) return;
    if (e.button !== 0) return; // Only primary mouse button or touch

    pointerDownRef.current = true;
    isDraggingRef.current = false;
    hasMeaningfulDragRef.current = false;
    directionLockRef.current = null;

    const now = performance.now();
    startPosRef.current = { x: e.clientX, y: e.clientY, time: now };
    lastPosRef.current = { x: e.clientX, time: now };
    velocityRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current || isAnimatingRef.current) return;

    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const now = performance.now();
    const dt = Math.max(1, now - lastPosRef.current.time);
    velocityRef.current = (e.clientX - lastPosRef.current.x) / dt;
    lastPosRef.current = { x: e.clientX, time: now };

    // Initial gesture direction lock: ensure vertical scrolling is never blocked
    if (directionLockRef.current === null) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        // Vertical motion dominant -> cancel card drag, allow native browser page scroll
        directionLockRef.current = "vertical";
        hasMeaningfulDragRef.current = true;
        pointerDownRef.current = false;
        return;
      }
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        // Horizontal motion dominant -> lock to card drag
        directionLockRef.current = "horizontal";
        isDraggingRef.current = true;
        hasMeaningfulDragRef.current = true;
        setIsDraggingVisual(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignored if capture unsupported
        }
      }
    }

    if (directionLockRef.current === "horizontal") {
      hasMeaningfulDragRef.current = true;
      // Direct GPU translation: 1:1 real-time finger/mouse follow
      x.set(dx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current && !isDraggingRef.current) return;
    pointerDownRef.current = false;
    setIsDraggingVisual(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }

    if (directionLockRef.current === "horizontal" && isDraggingRef.current) {
      const dx = x.get();
      const cardWidth = cardRef.current?.offsetWidth || 380;
      const distanceThreshold = cardWidth * 0.22; // ~80px
      const velocityThreshold = 0.40; // ~400px/s flick

      const isFlick = Math.abs(velocityRef.current) > velocityThreshold;
      const isLongDrag = Math.abs(dx) > distanceThreshold;
      const sameDirection = isFlick ? (velocityRef.current > 0 ? dx > 0 : dx < 0) : true;

      if ((isLongDrag || isFlick) && sameDirection && dx !== 0) {
        // SUCCESSFUL SWIPE
        const direction = dx > 0 ? "right" : "left";
        executeSwipe(direction);
      } else {
        // FAILED SWIPE: Smooth spring settling back to center
        isAnimatingRef.current = true;
        animate(x, 0, {
          type: "spring",
          stiffness: 420,
          damping: 28,
          mass: 0.8,
        }).then(() => {
          isAnimatingRef.current = false;
        });
      }
    }

    // Reset drag flags after a short delay so onClick doesn't accidentally navigate
    setTimeout(() => {
      isDraggingRef.current = false;
      hasMeaningfulDragRef.current = false;
      directionLockRef.current = null;
    }, 150);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = false;
    setIsDraggingVisual(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }

    if (isDraggingRef.current) {
      isAnimatingRef.current = true;
      animate(x, 0, {
        type: "spring",
        stiffness: 420,
        damping: 28,
        mass: 0.8,
      }).then(() => {
        isAnimatingRef.current = false;
      });
    }

    setTimeout(() => {
      isDraggingRef.current = false;
      hasMeaningfulDragRef.current = false;
      directionLockRef.current = null;
    }, 150);
  };

  // Primary Interaction: Click/Tap on the product card navigates directly to the real product details page
  const handleCardClick = () => {
    if (
      hasMeaningfulDragRef.current ||
      isDraggingRef.current ||
      isAnimatingRef.current ||
      directionLockRef.current !== null
    ) {
      return;
    }
    if (!activeProduct) return;
    api.cacheProduct(activeProduct);

    if (!user) {
      const redirectTarget = `/product/${activeProduct.id}`;
      try {
        localStorage.setItem("pay₹ent_pending_product_redirect", redirectTarget);
        localStorage.setItem("pendingProductId", String(activeProduct.id));
      } catch (e) {}
      navigate({
        to: "/login",
        search: { redirect: redirectTarget } as any,
      });
      return;
    }

    navigate({
      to: "/product/$id",
      params: { id: activeProduct.id },
    });
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!activeProduct) return;

    if (!user) {
      const redirectTarget = `/product/${activeProduct.id}`;
      try {
        localStorage.setItem("pay₹ent_pending_product_redirect", redirectTarget);
        localStorage.setItem("pendingProductId", String(activeProduct.id));
      } catch (e) {}
      toast.info("Please log in to save gear to your wishlist.");
      navigate({
        to: "/login",
        search: { redirect: redirectTarget } as any,
      });
      return;
    }

    toggle(activeProduct.id);
    toast.success(
      has(activeProduct.id) ? "Removed from wishlist" : "Saved to wishlist!",
    );
  };

  // If no products match the filters/search
  if (!activeProduct || queue.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] max-w-xl mx-auto">
        <div className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 mx-auto grid place-items-center text-neutral-400 mb-3">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          No gear in current swipe queue
        </h3>
        <p className="text-xs text-neutral-500 dark:text-[#8D98A3] mt-1 max-w-sm mx-auto">
          Try adjusting your price range, selected brand, or search keywords to populate available gear.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 px-5 py-2 rounded-full bg-[#161616] text-white dark:bg-[#F2F0EA] dark:text-[#161616] text-xs font-bold shadow-sm hover:opacity-90 cursor-pointer"
          >
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  const brand = getProductBrand(activeProduct);

  return (
    <div
      className={cn(
        "relative w-full flex flex-col items-center justify-center select-none py-2",
        className,
      )}
    >
      {/* CARD STACK CONTAINER — COMPACT IMAGE-FIRST PRESENTATION */}
      <div className="relative w-full max-w-[290px] sm:max-w-[320px] lg:max-w-[340px] min-h-[380px] sm:min-h-[410px] flex items-center justify-center">
        {/* SUBTLE BACKGROUND STACK CARD 3 (THIRD IN QUEUE) */}
        {thirdProduct && (
          <motion.div
            key={thirdProduct.id}
            style={{
              scale: thirdScale,
              y: thirdY,
              opacity: thirdOpacity,
              zIndex: 1,
            }}
            className="absolute inset-x-4 sm:inset-x-5 top-5 bottom-0 rounded-[24px] bg-white/40 dark:bg-[#090F15]/40 border border-black/5 dark:border-white/5 pointer-events-none shadow-sm overflow-hidden will-change-transform"
          >
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <img
                src={
                  getOptimizedImageUrl(
                    getProductPrimaryImage(thirdProduct),
                    "card",
                  ) || getProductPrimaryImage(thirdProduct)
                }
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover opacity-40 blur-[1px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
          </motion.div>
        )}

        {/* SUBTLE BACKGROUND STACK CARD 2 (NEXT CARD IN QUEUE) */}
        {nextProduct && (
          <motion.div
            key={nextProduct.id}
            style={{
              scale: nextScale,
              y: nextY,
              opacity: nextOpacity,
              zIndex: 2,
            }}
            className="absolute inset-x-2 sm:inset-x-2.5 top-2.5 bottom-0 rounded-[24px] bg-white/80 dark:bg-[#0B121A]/80 border border-black/10 dark:border-white/10 pointer-events-none shadow-md overflow-hidden will-change-transform"
          >
            {getProductPrimaryImage(nextProduct) ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden">
                <img
                  src={
                    getOptimizedImageUrl(
                      getProductPrimaryImage(nextProduct),
                      "card",
                    ) || getProductPrimaryImage(nextProduct)
                  }
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-muted-foreground/40">
                <Package className="h-7 w-7 mb-1 opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white/90 text-[11px] font-bold">
              <span className="truncate max-w-[160px]">{nextProduct.title}</span>
              <span className="font-mono text-emerald-400">
                ₹{nextProduct.price.toLocaleString("en-IN")}/d
              </span>
            </div>
          </motion.div>
        )}

        {/* PRIMARY ACTIVE IMAGE-FIRST CARD */}
        <motion.div
          ref={cardRef}
          key={activeProduct.id}
          style={{
            x,
            rotate,
            scale,
            opacity,
            zIndex: 10,
            touchAction: "pan-y",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleCardClick}
          id="browse-primary-active-card"
          role="button"
          tabIndex={0}
          aria-label={`View ${activeProduct.title} details`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCardClick();
            }
          }}
          className={cn(
            "group relative w-full aspect-[4/5] rounded-[24px] bg-neutral-950 border border-black/10 dark:border-white/15 shadow-xl overflow-hidden will-change-transform select-none transition-shadow",
            isDraggingVisual
              ? "cursor-grabbing shadow-2xl"
              : "cursor-grab hover:shadow-2xl",
          )}
        >
          {/* REAL HERO PRODUCT IMAGE (Full Bleed Image with Clean Text Overlay) */}
          {displayImage && !imageErrorMap[activeProduct.id] ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-900">
              <img
                key={activeProduct.id}
                src={getOptimizedImageUrl(displayImage, "card") || displayImage}
                srcSet={
                  getResponsiveImageSrcSet(displayImage, [320, 480, 640]) ||
                  undefined
                }
                sizes="(max-width: 640px) 85vw, 340px"
                alt={activeProduct.title}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (displayImage && target.src !== displayImage) {
                    target.src = displayImage;
                  } else if (activeProduct?.id) {
                    setImageErrorMap((prev) => ({ ...prev, [activeProduct.id]: true }));
                  }
                }}
                draggable={false}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-center pointer-events-none group-hover:scale-105 transition-transform duration-500 ease-out"
              />
              {/* Deep multi-stop gradient for crystal-clear text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-muted-foreground/40 p-5 text-center">
              <Package className="h-12 w-12 mb-2 opacity-40 text-neutral-500" />
              <span className="text-xs font-semibold text-neutral-400">No image available</span>
            </div>
          )}

          {/* TOP CONTROLS: Real Availability, 10s Video Badge & Wishlist */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-20 pointer-events-auto">
            {/* Left Top Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Availability Badge */}
              <div
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {isAvailable ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Available</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-neutral-300 border border-white/10 shadow-md">
                    <Clock className="h-3 w-3 text-neutral-400" />
                    <span>Not Available</span>
                  </span>
                )}
              </div>

              {/* 10s Equipment Video Badge */}
              {activeVideoUrl && (
                <button
                  type="button"
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowVideoModal(true);
                  }}
                  aria-label="Watch 10s Equipment Inspection Video"
                  title="Watch verified inspection video"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-0.5 text-[10px] font-extrabold shadow-md transition-all active:scale-95 cursor-pointer backdrop-blur-md"
                >
                  <Play className="h-2.5 w-2.5 fill-black text-black" />
                  <span>10s Video</span>
                </button>
              )}
            </div>

            {/* Right Top: Wishlist & Photo Counter */}
            <div className="flex items-center gap-1.5">
              {productImages.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/15 shadow-sm">
                  {activeImageIndex + 1}/{productImages.length}
                </span>
              )}

              {/* Wishlist Toggle Button */}
              <button
                type="button"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={handleWishlistToggle}
                aria-label="Toggle Wishlist"
                className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white/90 hover:text-red-500 transition-colors shadow-md border border-white/20 flex items-center justify-center cursor-pointer"
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5 transition-all",
                    has(activeProduct.id) &&
                      "fill-red-500 text-red-500 scale-110",
                  )}
                />
              </button>
            </div>
          </div>

          {/* MULTI-PHOTO TOP DOTS (If >1 photos exist) */}
          {productImages.length > 1 && (
            <div
              onPointerDownCapture={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 pointer-events-auto"
            >
              {productImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(idx);
                  }}
                  aria-label={`View photo ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    activeImageIndex === idx
                      ? "w-4 bg-emerald-400"
                      : "w-1.5 bg-white/40 hover:bg-white/70"
                  )}
                />
              ))}
            </div>
          )}

          {/* MULTI-PHOTO LEFT & RIGHT CHEVRONS (If >1 photos exist) */}
          {productImages.length > 1 && (
            <>
              <button
                type="button"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setActiveImageIndex((prev) =>
                    prev > 0 ? prev - 1 : productImages.length - 1
                  );
                }}
                aria-label="Previous product image"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-75 hover:opacity-100 transition-all shadow-md active:scale-95 cursor-pointer pointer-events-auto"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setActiveImageIndex((prev) =>
                    prev < productImages.length - 1 ? prev + 1 : 0
                  );
                }}
                aria-label="Next product image"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-75 hover:opacity-100 transition-all shadow-md active:scale-95 cursor-pointer pointer-events-auto"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* BOTTOM IMAGE OVERLAY: Clean, Compact Text on Image */}
          <div className="absolute bottom-0 inset-x-0 p-4 space-y-1.5 z-20 pointer-events-none text-left">
            {/* Category & Brand Pill */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/15">
                <Tag className="h-2.5 w-2.5 text-emerald-400" />
                <span>{activeProduct.category}</span>
              </span>
              {brand && (
                <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-bold border border-white/10">
                  {brand}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h2
              id="active-product-card-title"
              className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-snug drop-shadow-md line-clamp-1"
            >
              {activeProduct.title}
            </h2>

            {/* Price & Swipe/Tap Navigation Cue */}
            <div className="pt-0.5 flex items-center justify-between text-white">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-white/70 block">
                  Daily Rate
                </span>
                <div className="text-lg sm:text-xl font-black tracking-tight font-mono leading-none mt-0.5 text-white">
                  ₹{activeProduct.price.toLocaleString("en-IN")}
                  <span className="text-[11px] font-normal text-white/70 ml-0.5">
                    /day
                  </span>
                </div>
              </div>

              {/* Click / Tap Prompt: RENT GEAR */}
              <div className="flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/25 shadow-md">
                <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                <span>Rent Gear</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform opacity-75" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Queue Indicators & Reset Action */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1.5">
          {queue.slice(0, Math.min(queue.length, 6)).map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setQueue((prev) => {
                  const targetIdx = prev.findIndex((item) => item.id === p.id);
                  if (targetIdx <= 0) return prev;
                  return [
                    prev[targetIdx],
                    ...prev.slice(0, targetIdx),
                    ...prev.slice(targetIdx + 1),
                  ];
                });
              }}
              title={p.title}
              className={cn(
                "h-2 rounded-full transition-all cursor-pointer",
                idx === 0
                  ? "w-6 bg-[#161616] dark:bg-[#F2F0EA]"
                  : "w-2 bg-black/20 dark:bg-white/20 hover:bg-black/40 dark:hover:bg-white/40",
              )}
            />
          ))}
          {queue.length > 6 && (
            <span className="text-[10px] font-mono text-neutral-400">
              +{queue.length - 6}
            </span>
          )}
        </div>

        {queue.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setQueue(products);
              toast.info("Queue reset to initial order");
            }}
            title="Reset queue order"
            className="ml-3 text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Inspection Video Modal for Direct Explore Playback */}
      <AnimatePresence>
        {showVideoModal && activeVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl overflow-hidden p-5 space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Video className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground">
                      Verified 10s Inspection Video
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {activeProduct?.title} • 100% Physical Check
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-border/80 shadow-inner">
                <video
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1 text-emerald-500 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Recorded prior to listing to verify pristine gear condition.
                </span>
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
