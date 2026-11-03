import React from "react";

export interface PayentAgentIconProps {
  size?: number | string;
  className?: string;
  showAccent?: boolean;
  alt?: string;
}

/**
 * Custom paYent Agent Brand Symbol
 * - Stylized geometric letter "P"
 * - Integrated parcel cross / delivery-route transit elements
 * - White primary symbol on circular near-black background (#17191C)
 * - Subtle emerald green accent (#16A36A)
 */
export function PayentAgentIcon({
  size = 32,
  className = "",
  showAccent = true,
  alt = "Payent Agent",
}: PayentAgentIconProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Circular near-black background */}
      <circle cx="16" cy="16" r="16" fill="#17191C" />

      {/* Subtle background outer border for contrast against dark surfaces */}
      <circle cx="16" cy="16" r="15.5" stroke="#FFFFFF" strokeOpacity="0.08" />

      {/* Stem of the P (also acts as vertical delivery route guide) */}
      <path
        d="M10 7.5V24.5"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Loop of the P forming the courier parcel container */}
      <path
        d="M10 7.5H16.8C19.8 7.5 22.2 9.4 22.2 12.5C22.2 15.6 19.8 17.5 16.8 17.5H10"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal parcel horizontal seam / route divider */}
      <path
        d="M13.5 12.5H21.5"
        stroke="#FFFFFF"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />

      {/* Internal parcel vertical cross-band */}
      <path
        d="M16.5 7.5V17.5"
        stroke="#FFFFFF"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />

      {/* Route waypoint origin node at base */}
      <circle cx="10" cy="24.5" r="1.2" fill="#FFFFFF" />

      {/* Subtle green destination beacon accent */}
      {showAccent && (
        <circle cx="20.5" cy="8.2" r="1.6" fill="#16A36A" />
      )}
    </svg>
  );
}

export default PayentAgentIcon;
