import React from "react";
import pristineShowcaseImg from "@/assets/images/pristine_photographic_showcase.webp";
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
      aria-label="Drone pilot operating high-definition controller feed outdoors"
    >
      {/* Desktop Pristine Visual Composition (Hidden on small mobile) */}
      <div className="hidden md:block w-full h-full relative">
        <img
          src={pristineShowcaseImg}
          alt="Hands operating professional drone controller outdoors with mountain camera feed, drone case, and landing pad on wooden table"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center pointer-events-none"
        />

        {/* Interactive Hotspot: Remote Controller Screen */}
        <button
          type="button"
          onClick={onExploreGear}
          aria-label="DJI Smart Controller 4K Aerial Live Feed - Click to explore drones"
          className="group absolute bottom-[18%] left-[45%] w-[16%] h-[20%] rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          title="Live 4K Aerial View"
        >
          <span className="sr-only">Explore Drones</span>
          <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />
        </button>

        {/* Interactive Hotspot: Camera Panel in bottom-right */}
        <button
          type="button"
          onClick={onExploreGear}
          aria-label="Sony Cinema Camera Rig - Click to explore cameras"
          className="group absolute bottom-[3%] right-[3%] w-[25%] h-[32%] rounded-tl-[36px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          title="Full-Frame Cinema Camera"
        >
          <span className="sr-only">Explore Cinema Cameras</span>
          <span className="absolute inset-0 rounded-tl-[36px] bg-white/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
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
