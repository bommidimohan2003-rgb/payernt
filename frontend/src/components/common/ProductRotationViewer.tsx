import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, RotateCcw, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductRotationViewerProps {
  frames: string[];
  productTitle: string;
  className?: string;
  autoRotate?: boolean;
}

export function ProductRotationViewer({
  frames,
  productTitle,
  className,
  autoRotate = true,
}: ProductRotationViewerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const startXRef = useRef(0);
  const startFrameRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalFrames = frames.length;

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setPrefersReducedMotion(reducedMotion);
    }
  }, []);

  // Preload frame images with percentage progress tracking
  useEffect(() => {
    let count = 0;
    const total = frames.length;

    if (total === 0) {
      setIsLoaded(true);
      return;
    }

    const preloadedImages: HTMLImageElement[] = [];

    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        count++;
        setLoadedCount(count);
        // Pipelined readiness: Allow interaction as soon as first 4 key frames arrive
        if (count >= Math.min(total, 4)) {
          setIsLoaded(true);
        }
      };
      img.onerror = () => {
        count++;
        setLoadedCount(count);
        if (count >= Math.min(total, 4)) {
          setIsLoaded(true);
        }
      };
      preloadedImages.push(img);
    });

    return () => {
      preloadedImages.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [frames]);

  // Optional auto-rotate mode respecting prefers-reduced-motion
  useEffect(() => {
    if (
      !autoRotate ||
      !isLoaded ||
      isDragging ||
      hasInteracted ||
      prefersReducedMotion
    )
      return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 180);

    return () => clearInterval(interval);
  }, [
    autoRotate,
    isLoaded,
    isDragging,
    hasInteracted,
    totalFrames,
    prefersReducedMotion,
  ]);

  // Keyboard Left/Right Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setHasInteracted(true);
        setCurrentFrame((prev) => (prev - 1 + totalFrames) % totalFrames);
      } else if (e.key === "ArrowRight") {
        setHasInteracted(true);
        setCurrentFrame((prev) => (prev + 1) % totalFrames);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalFrames]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setHasInteracted(true);
    startXRef.current = e.clientX;
    startFrameRef.current = currentFrame;
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    const sensitivity = 8; // Pixels per frame shift
    const frameOffset = Math.floor(deltaX / sensitivity);

    let newFrame = (startFrameRef.current - frameOffset) % totalFrames;
    if (newFrame < 0) newFrame += totalFrames;

    setCurrentFrame(newFrame);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const loadPercentage =
    totalFrames > 0 ? Math.round((loadedCount / totalFrames) * 100) : 100;
  const currentAngleDegrees = Math.round((currentFrame / totalFrames) * 360);

  return (
    <div
      className={cn(
        "w-full h-[360px] md:h-[440px] relative spatial-surface rounded-3xl overflow-hidden group select-none bg-card/60 border border-border/80",
        className,
      )}
    >
      {/* Header Badge */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <span className="px-3.5 py-1.5 rounded-full spatial-float text-xs font-bold text-primary flex items-center gap-1.5 border border-primary/30 shadow-md">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Real 360° Photography ({totalFrames} Angles)</span>
        </span>
        <span className="px-3 py-1 rounded-full bg-background/80 backdrop-blur-md text-[11px] font-semibold text-muted-foreground border border-border/60">
          Drag horizontally or use ← → keys
        </span>
      </div>

      {/* Preloading Progress Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-30 bg-card/90 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-4">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              Loading Real Product Photography
            </h4>
            <p className="text-xs text-muted-foreground">
              Preloading turntable frames ({loadedCount}/{totalFrames})
            </p>
          </div>
          <div className="w-48 h-2 rounded-full bg-secondary overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-200"
              style={{ width: `${loadPercentage}%` }}
            />
          </div>
          <span className="text-xs font-bold text-primary">
            {loadPercentage}%
          </span>
        </div>
      )}

      {/* Brief Initial Render "Drag to Rotate" Hint Badge */}
      {isLoaded && !hasInteracted && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none bg-black/75 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl border border-white/20 flex items-center gap-2 animate-bounce">
          <Hand className="h-4 w-4 text-primary" />
          <span>Drag horizontally to rotate 360°</span>
        </div>
      )}

      {/* Interactive Turntable Stage */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative",
          isDragging && "cursor-grabbing",
        )}
        tabIndex={0}
        role="slider"
        aria-label={`Interactive 360 degree product view of ${productTitle}. Use left and right arrow keys to rotate.`}
        aria-valuenow={currentAngleDegrees}
        aria-valuemin={0}
        aria-valuemax={360}
      >
        <img
          src={frames[currentFrame]}
          alt={`${productTitle} - 360 degree view angle ${currentAngleDegrees} degrees`}
          decoding="async"
          className="h-full w-full object-cover pointer-events-none"
        />

        {/* Dynamic Angle Indicator */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-white/20 shadow-lg flex items-center gap-1">
            <RotateCcw className="h-3 w-3 text-primary" />
            {currentAngleDegrees}°
          </span>
        </div>
      </div>
    </div>
  );
}
