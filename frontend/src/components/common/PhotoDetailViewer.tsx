import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Maximize2, ChevronLeft, ChevronRight, Video, Sparkles, Image as ImageIcon } from "lucide-react";
import { getOptimizedImageUrl, getResponsiveImageSrcSet } from "@/utils/images";

interface PhotoDetailViewerProps {
  primaryImage: string;
  productTitle: string;
  angles?: string[];
  videoUrl?: string | null;
  onWishlistToggle?: () => void;
  isWishlisted?: boolean;
}

export function PhotoDetailViewer({
  primaryImage,
  productTitle,
  angles,
  videoUrl,
}: PhotoDetailViewerProps) {
  const [activeAngleIndex, setActiveAngleIndex] = useState(0);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [transformStyle, setTransformStyle] = useState("");
  const [shadowStyle, setShadowStyle] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const imagesList = angles && angles.length > 0 ? angles : (primaryImage ? [primaryImage] : []);
  const activeSrc = imagesList[activeAngleIndex] || primaryImage;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const isTouch =
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window;
      setIsDisabled(reducedMotion || isTouch);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled || isVideoActive || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxTilt = 12;
    const rotateX = (((y - centerY) / centerY) * -maxTilt).toFixed(2);
    const rotateY = (((x - centerX) / centerX) * maxTilt).toFixed(2);

    const shadowX = (((x - centerX) / centerX) * -24).toFixed(1);
    const shadowY = (((y - centerY) / centerY) * -24).toFixed(1);

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.025, 1.025, 1.025)`,
    );
    setShadowStyle(`${shadowX}px ${shadowY}px 40px -8px rgba(0, 0, 0, 0.3)`);
  };

  const handleMouseLeave = () => {
    if (isDisabled) return;
    setTransformStyle(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    );
    setShadowStyle("0 20px 40px -10px rgba(0, 0, 0, 0.15)");
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVideoActive(false);
    setActiveAngleIndex((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVideoActive(false);
    setActiveAngleIndex((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-4">
      {/* Stage Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isVideoActive ? "none" : transformStyle,
          boxShadow: isVideoActive ? "none" : shadowStyle,
          transition: transformStyle.includes("rotateX(0deg)")
            ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            : "transform 0.1s ease-out, box-shadow 0.1s ease-out",
        }}
        className="spatial-surface aspect-[4/3] rounded-3xl overflow-hidden relative group will-change-transform bg-card/60 border border-border/80 shadow-xl"
      >
        {isVideoActive && videoUrl ? (
          <div className="w-full h-full bg-black flex items-center justify-center relative">
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <>
            {/* Real Product Photo */}
            <img
              key={activeSrc}
              src={getOptimizedImageUrl(activeSrc, 'detail') || activeSrc}
              srcSet={getResponsiveImageSrcSet(activeSrc, [480, 768, 1024, 1200]) || undefined}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 800px"
              alt={productTitle}
              fetchPriority="high"
              decoding="async"
              width={800}
              height={600}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />

            {/* Left / Right Chevron Controls (If Multiple Images) */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-80 hover:opacity-100 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-80 hover:opacity-100 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </>
        )}

        {/* Floating Top Badges */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full spatial-float text-[11px] font-bold text-primary flex items-center gap-1.5 border border-primary/20 shadow-md backdrop-blur-md">
            <Maximize2 className="h-3.5 w-3.5" />
            <span>High-Res Detail View</span>
          </span>
          {imagesList.length > 1 && !isVideoActive && (
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-md">
              {activeAngleIndex + 1} / {imagesList.length}
            </span>
          )}
        </div>

        {/* Video Mode Badge if available */}
        {videoUrl && (
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={() => setIsVideoActive(!isVideoActive)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border shadow-md transition-all cursor-pointer backdrop-blur-md",
                isVideoActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-black/60 text-white hover:bg-black/85 border-white/20"
              )}
            >
              <Video className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isVideoActive ? "Show Photos" : "Play 10s Video"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Discrete Angle & Video Switcher */}
      {((imagesList && imagesList.length > 1) || videoUrl) && (
        <div className="flex items-center gap-3 pt-2 overflow-x-auto pb-1">
          {imagesList.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsVideoActive(false);
                setActiveAngleIndex(idx);
              }}
              className={cn(
                "relative aspect-square w-16 sm:w-20 rounded-2xl overflow-hidden border-2 transition-all spatial-surface cursor-pointer bg-card shrink-0",
                !isVideoActive && activeAngleIndex === idx
                  ? "border-primary ring-2 ring-primary/30 scale-105 opacity-100 shadow-md"
                  : "border-border/40 opacity-75 hover:opacity-100 hover:border-primary/50",
              )}
            >
              <img
                src={getOptimizedImageUrl(src, 'thumb') || src}
                alt={`Photo ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold">
                #{idx + 1}
              </span>
            </button>
          ))}

          {/* Video Thumbnail Button */}
          {videoUrl && (
            <button
              type="button"
              onClick={() => setIsVideoActive(true)}
              className={cn(
                "relative aspect-square w-16 sm:w-20 rounded-2xl overflow-hidden border-2 transition-all spatial-surface cursor-pointer bg-neutral-950 flex flex-col items-center justify-center text-white shrink-0",
                isVideoActive
                  ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105 opacity-100 shadow-md"
                  : "border-border/40 opacity-75 hover:opacity-100 hover:border-emerald-500/50",
              )}
            >
              <Video className="h-6 w-6 text-emerald-400 mb-1" />
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">
                10s Video
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
