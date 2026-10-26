import React from "react";
import cameraImg from "@/assets/images/camera_product_panel.webp";

interface CameraProductPanelProps {
  onSelectGear?: () => void;
  className?: string;
  isStandalone?: boolean;
}

export function CameraProductPanel({
  onSelectGear,
  className = "",
  isStandalone = false,
}: CameraProductPanelProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelectGear}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectGear?.();
        }
      }}
      aria-label="View professional mirrorless cinema cameras available for rent"
      className={`group relative overflow-hidden cursor-pointer select-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3828] focus-visible:ring-offset-2 ${
        isStandalone
          ? "rounded-2xl bg-[#f0f2f1] border border-neutral-200/80 p-3 sm:p-4 aspect-4/3"
          : "rounded-tl-[32px] sm:rounded-tl-[38px] rounded-br-[24px] sm:rounded-br-[28px] rounded-bl-[16px] bg-[#eef1f0] shadow-xs"
      } ${className}`}
    >
      <img
        src={cameraImg}
        alt="Professional black full-frame mirrorless digital camera with cinema prime lens"
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover object-center group-hover:scale-104 transition-transform duration-500 ease-out pointer-events-none"
      />

      {/* Subtle hover overlay badge */}
      <div className="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[10px] font-mono tracking-wider uppercase font-medium">
          Cinema Rig
        </span>
      </div>

      {/* Glass rim border */}
      <div className="absolute inset-0 ring-1 ring-inset ring-black/5 pointer-events-none" />
    </div>
  );
}

export default CameraProductPanel;
