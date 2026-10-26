import React from "react";
import droneControllerImg from "@/assets/images/drone_controller_showcase.webp";

interface DroneShowcaseProps {
  className?: string;
  onExploreGear?: () => void;
}

export function DroneShowcase({
  className = "",
  onExploreGear,
}: DroneShowcaseProps) {
  return (
    <div
      className={`relative w-full h-full select-none ${className}`}
      aria-label="Professional drone controller operation feed"
    >
      {/* SVG Definitions for Organic Curves */}
      <svg
        className="absolute w-0 h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id="droneHeroMask" clipPathUnits="objectBoundingBox">
            <path
              d="
                M 0, 0.485
                C 0, 0.435 0.02, 0.420 0.05, 0.420
                L 0.465, 0.420
                C 0.505, 0.420 0.525, 0.380 0.525, 0.320
                L 0.525, 0.080
                C 0.525, 0.020 0.545, 0 0.585, 0
                L 1.0, 0
                L 1.0, 0.575
                L 0.675, 1.0
                L 0, 1.0
                Z
              "
            />
          </clipPath>
        </defs>
      </svg>

      {/* Desktop Photographic View with Pure SVG Organic Masking */}
      <div
        className="hidden md:block w-full h-full relative"
        style={{
          clipPath: "url(#droneHeroMask)",
          WebkitClipPath: "url(#droneHeroMask)",
        }}
      >
        <img
          src={droneControllerImg}
          alt="Hands operating professional drone controller outdoors with mountain valley camera feed, drone case, and landing pad on wooden table"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center pointer-events-none"
        />

        {/* Interactive Hotspot: Remote Controller Screen */}
        <button
          type="button"
          onClick={onExploreGear}
          aria-label="DJI Smart Controller 4K Aerial Live Feed - Click to explore drones"
          className="group absolute bottom-[22%] left-[45%] w-[16%] h-[22%] rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          title="Live 4K Aerial View — Explore Drones"
        >
          <span className="sr-only">Explore Drones</span>
          <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
        </button>
      </div>

      {/* Mobile / Small Screen Optimized Photographic View */}
      <div className="block md:hidden w-full rounded-2xl overflow-hidden shadow-xs border border-neutral-200/80 bg-neutral-100">
        <img
          src={droneControllerImg}
          alt="Operator holding drone controller with mountain valley view on screen"
          loading="eager"
          decoding="async"
          className="w-full h-auto object-cover aspect-4/3"
        />
      </div>
    </div>
  );
}

export default DroneShowcase;
