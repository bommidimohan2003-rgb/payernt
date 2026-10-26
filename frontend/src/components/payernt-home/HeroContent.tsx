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
      {/* Main Heading: Bold sans-serif, black text, tight tracking, single line on desktop */}
      <h1 className="font-display font-extrabold text-[32px] sm:text-[38px] md:text-[40px] lg:text-[44px] xl:text-[48px] text-[#0a0a0a] tracking-tight leading-tight mb-4 sm:mb-5 whitespace-nowrap">
        Rent Professional Tech.
      </h1>

      {/* Supporting Row: Thumbnail on left, description and actions on right */}
      <div className="flex items-start gap-3.5 sm:gap-4.5">
        {/* Drone Thumbnail */}
        <DroneThumbnail />

        {/* Text & Primary Actions Column */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <p className="text-[13px] sm:text-[14px] lg:text-[14.5px] font-normal text-[#525f58] leading-[1.46] max-w-[330px] sm:max-w-[350px]">
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
