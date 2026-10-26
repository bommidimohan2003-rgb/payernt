import React from "react";
import { ArrowRight, Play } from "lucide-react";

interface PrimaryActionsProps {
  onExplore: () => void;
  onHowItWorks: () => void;
  className?: string;
  disabled?: boolean;
}

export function PrimaryActions({
  onExplore,
  onHowItWorks,
  className = "",
  disabled = false,
}: PrimaryActionsProps) {
  return (
    <div
      role="group"
      aria-label="Homepage Primary Actions"
      className={`flex items-center flex-wrap gap-2.5 sm:gap-3.5 pt-1 ${className}`}
    >
      {/* 1. Explore Button: Dark forest green pill with arrow */}
      <button
        type="button"
        onClick={onExplore}
        disabled={disabled}
        aria-label="Explore rental gear catalog"
        className="group relative inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#0d2a1f] hover:bg-[#143a2b] active:bg-[#081b13] text-white font-medium text-xs sm:text-sm tracking-wide shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d2a1f] focus-visible:ring-offset-2 select-none"
      >
        <span>Explore</span>
        <ArrowRight
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:translate-x-1 transition-transform duration-200"
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>

      {/* 2. How It Works Button: White background with thin gray-green border and dark circular play icon */}
      <button
        type="button"
        onClick={onHowItWorks}
        disabled={disabled}
        aria-label="Learn how Paye₹nt peer-to-peer gear rentals work"
        className="group relative inline-flex items-center justify-center gap-2 px-4.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 font-medium text-xs sm:text-sm tracking-wide border border-[#1b3d2b]/30 hover:border-[#1b3d2b]/60 shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3d2b] focus-visible:ring-offset-2 select-none"
      >
        <span>How It Works</span>
        <span
          className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-[#0d2a1f] group-hover:bg-[#143a2b] flex items-center justify-center text-white shrink-0 ml-1 transition-colors duration-200"
          aria-hidden="true"
        >
          <Play
            className="w-2.5 h-2.5 fill-white text-white translate-x-[1px]"
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
  );
}

export default PrimaryActions;
