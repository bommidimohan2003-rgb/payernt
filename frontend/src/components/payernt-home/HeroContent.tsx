import React from "react";
import { DroneThumbnail } from "./DroneThumbnail";
import { PrimaryActions } from "./PrimaryActions";

interface HeroContentProps {
  onExplore: () => void;
  onHowItWorks: () => void;
  className?: string;
}

export function HeroContent({
  onExplore,
  onHowItWorks,
  className = "",
}: HeroContentProps) {
  return (
    <div
      className={`flex flex-col z-20 max-w-[540px] xl:max-w-[580px] select-none ${className}`}
    >
      {/* Main Heading: Bold sans-serif, black text, tight tracking */}
      <h1 className="font-display font-extrabold text-[34px] sm:text-[42px] md:text-[46px] lg:text-[48px] xl:text-[52px] text-[#0a0a0a] tracking-tight leading-[1.08] mb-5 sm:mb-6">
        Rent Professional Tech.
      </h1>

      {/* Supporting Row: Thumbnail on left, description and actions on right */}
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Drone Thumbnail */}
        <DroneThumbnail />

        {/* Text & Primary Actions Column */}
        <div className="flex flex-col gap-3 sm:gap-3.5">
          <p className="text-[13.5px] sm:text-[14.5px] lg:text-[15px] font-normal text-[#5a6460] leading-[1.5] max-w-[340px] sm:max-w-[360px]">
            Create Without Limits. Peer-to-peer marketplace to rent cinema
            cameras, drones, laptops, and production gear.
          </p>

          <PrimaryActions onExplore={onExplore} onHowItWorks={onHowItWorks} />
        </div>
      </div>
    </div>
  );
}

export default HeroContent;
