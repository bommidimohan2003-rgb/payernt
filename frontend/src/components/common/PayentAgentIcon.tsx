import React from "react";

export interface PayentAgentIconProps {
  size?: number | string;
  className?: string;
  showAccent?: boolean;
  alt?: string;
  color?: string;
}

/**
 * paYent Cloud-Into-Message AI Agent Symbol
 * - Distinct 3-lobe fluffy cloud silhouette with speech bubble chat pointer
 * - Zero background box/circle (pure standalone vector glyph)
 * - Three conversational message dots inside the cloud
 * - Vibrant emerald live node accent (#10B981)
 * - Generously padded in 24x24 viewBox with 0% clipping
 */
export function PayentAgentIcon({
  size,
  className = "",
  showAccent = true,
  alt = "Payent AI Agent",
  color,
}: PayentAgentIconProps) {
  const hasDimensionClass = /\b(w-|h-)\S+/.test(className);
  const effectiveSize = size !== undefined ? size : (hasDimensionClass ? undefined : 24);
  const pixelSize = typeof effectiveSize === "number" ? `${effectiveSize}px` : effectiveSize;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Cloud into Message Speech Bubble Contour */}
      <path
        d="M 8.5 16.5 L 4 20.5 L 6.5 16.2 A 4.2 4.2 0 0 1 7.2 9.5 A 5.5 5.5 0 0 1 17 8.5 A 4.5 4.5 0 0 1 17.8 16.5 H 8.5 Z"
        stroke={color || "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.14"
      />

      {/* 3 Message Dots inside the Cloud */}
      <circle cx="9" cy="13" r="1.35" fill={color || "currentColor"} />
      <circle cx="12.5" cy="13" r="1.35" fill={color || "currentColor"} />
      <circle
        cx="16"
        cy="13"
        r="1.35"
        fill={showAccent ? "#10B981" : (color || "currentColor")}
      />
    </svg>
  );
}

export default PayentAgentIcon;
