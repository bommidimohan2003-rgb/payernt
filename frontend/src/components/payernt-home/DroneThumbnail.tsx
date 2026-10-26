import React from "react";
import droneThumbImg from "@/assets/images/drone_thumb_product.webp";

interface DroneThumbnailProps {
  className?: string;
  size?: number;
}

export function DroneThumbnail({ className = "" }: DroneThumbnailProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[20px] sm:rounded-[22px] bg-[#8da594] border border-emerald-950/10 shadow-xs shrink-0 select-none ${className}`}
      style={{
        width: "clamp(90px, 12vw, 112px)",
        height: "clamp(90px, 12vw, 112px)",
      }}
      aria-hidden="true"
    >
      <img
        src={droneThumbImg}
        alt="Compact 4K camera drone with gimbal"
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500 ease-out pointer-events-none"
      />
      {/* Subtle ambient rim light */}
      <div className="absolute inset-0 rounded-[20px] sm:rounded-[22px] ring-1 ring-inset ring-black/5 pointer-events-none" />
    </div>
  );
}

export default DroneThumbnail;
