import React from "react";

export interface PayentAgentIconProps {
  size?: number | string;
  className?: string;
  showAccent?: boolean;
  alt?: string;
}

/**
 * paYent Agent Brand Symbol
 * - White stylized geometric "P"
 * - Deep Charcoal circular foundation (#17191C)
 * - Subtle emerald green parcel accent (#16A36A)
 * - Clean vector construction, optimized for small and large sizes
 */
export function PayentAgentIcon({
  size = 26,
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
      {/* Deep Charcoal Circular Foundation */}
      <circle cx="16" cy="16" r="16" fill="#17191C" />
      <circle
        cx="16"
        cy="16"
        r="15.25"
        stroke="#FFFFFF"
        strokeOpacity="0.08"
        strokeWidth="1.5"
      />

      {/* Stem of the P */}
      <path
        d="M10.5 8V24"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Loop of the P forming a precision parcel container */}
      <path
        d="M10.5 8H17C19.76 8 22 10.01 22 12.5C22 14.99 19.76 17 17 17H10.5"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal parcel ribbon / route seam */}
      <path
        d="M10.5 12.5H21.5"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M16 8V17"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />

      {/* Waypoint base anchor */}
      <circle cx="10.5" cy="24" r="1.25" fill="#FFFFFF" />

      {/* Subtle emerald green parcel accent node */}
      {showAccent && (
        <circle cx="20.5" cy="8.5" r="1.75" fill="#16A36A" />
      )}
    </svg>
  );
}

export default PayentAgentIcon;
