import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Camera, ChevronLeft, ChevronRight, Heart } from "lucide-react";

export interface AngleItem {
  label: string;
  image: string;
}

interface ProductAngleViewerProps {
  angles: AngleItem[];
  productTitle: string;
  onWishlistToggle?: () => void;
  isWishlisted?: boolean;
}

export function ProductAngleViewer({
  angles,
  productTitle,
  onWishlistToggle,
  isWishlisted = false,
}: ProductAngleViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preload all angle images on mount for instant switching
  useEffect(() => {
    angles.forEach((angle) => {
      if (angle.image) {
        const img = new Image();
        img.src = angle.image;
      }
    });
  }, [angles]);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) =>
        setIsReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Keyboard Navigation (Left / Right Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture arrow keys if user is not typing in an input
      const activeElement = document.activeElement;
      const isInput =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        (activeElement as HTMLElement)?.isContentEditable;

      if (isInput) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : angles.length - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIdx((prev) => (prev < angles.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [angles.length]);

  if (!angles || angles.length === 0) return null;

  const currentAngle = angles[activeIdx] || angles[0];

  return (
    <div
      className="space-y-4"
      ref={containerRef}
      tabIndex={0}
      aria-label={`Angle viewer for ${productTitle}`}
    >
      {/* Main Image Stage */}
      <div className="aspect-[4/3] rounded-3xl overflow-hidden relative group bg-card border border-border/80 shadow-xl transition-all duration-300">
        {/* Main Photo Display with Crossfade */}
        {angles.map((angle, idx) => (
          <img
            key={idx}
            src={angle.image}
            alt={`${productTitle} - ${angle.label} view`}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-center",
              isReducedMotion
                ? "transition-none"
                : "transition-opacity duration-300 ease-in-out",
              idx === activeIdx
                ? "opacity-100 z-10"
                : "opacity-0 z-0 pointer-events-none",
            )}
          />
        ))}

        {/* Top Badges & Controls */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <span className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md text-[11px] font-bold text-foreground flex items-center gap-1.5 border border-border/60 shadow-md">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span>{currentAngle.label} View</span>
          </span>

          {onWishlistToggle && (
            <button
              onClick={onWishlistToggle}
              className="p-2.5 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-muted-foreground hover:text-red-500 hover:bg-background pointer-events-auto transition-all shadow-md active:scale-95"
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isWishlisted && "fill-red-500 text-red-500",
                )}
              />
            </button>
          )}
        </div>

        {/* Left / Right Arrow Steppers (Visible on Hover) */}
        {angles.length > 1 && (
          <>
            <button
              onClick={() =>
                setActiveIdx((prev) =>
                  prev > 0 ? prev - 1 : angles.length - 1,
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-foreground opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg cursor-pointer"
              aria-label="Previous angle (Left arrow)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                setActiveIdx((prev) =>
                  prev < angles.length - 1 ? prev + 1 : 0,
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-foreground opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg cursor-pointer"
              aria-label="Next angle (Right arrow)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Bottom Left Illustrative Image Marker */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-md text-[10px] font-medium text-muted-foreground border border-border/50 shadow-sm flex items-center gap-1">
            <span>Illustrative image</span>
          </span>
        </div>

        {/* Keyboard Instruction Pill */}
        <div className="absolute bottom-3 right-3 z-20 hidden md:block pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-md text-[10px] font-mono text-muted-foreground border border-border/50 shadow-sm">
            Use ← → arrow keys
          </span>
        </div>
      </div>

      {/* Discrete Labeled Thumbnail Switcher Buttons */}
      {angles.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {angles.map((angle, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "group relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer bg-card flex flex-col items-center justify-between p-1",
                activeIdx === idx
                  ? "border-primary ring-2 ring-primary/30 scale-105 shadow-md"
                  : "border-border/50 opacity-75 hover:opacity-100 hover:border-primary/50",
              )}
              aria-label={`Switch to ${angle.label} view`}
              aria-selected={activeIdx === idx}
            >
              <img
                src={angle.image}
                alt={`${productTitle} ${angle.label}`}
                className="h-full w-full object-cover rounded-xl"
              />
              <span
                className={cn(
                  "absolute bottom-1 inset-x-1 py-0.5 text-center text-[10px] font-bold rounded-lg backdrop-blur-md transition-all",
                  activeIdx === idx
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-background/80 text-foreground/80 group-hover:bg-background",
                )}
              >
                {angle.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
