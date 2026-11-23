import React from "react";

export interface PayentAgentIconProps {
  size?: number | string;
  className?: string;
  showAccent?: boolean;
  alt?: string;
}

/**
 * paYent Agent Brand Symbol
 * - Chat bubble on a deep charcoal circular foundation (#17191C)
 * - Emerald green accent dot (#16A36A) for the online / active indicator
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

      {/* Chat bubble body */}
      <path
        d="M8 11.5C8 10.12 9.12 9 10.5 9H21.5C22.88 9 24 10.12 24 11.5V18.5C24 19.88 22.88 21 21.5 21H17.5L14 24V21H10.5C9.12 21 8 19.88 8 18.5V11.5Z"
        fill="#FFFFFF"
        fillOpacity="0.12"
        stroke="#FFFFFF"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Three chat dots */}
      <circle cx="12" cy="15" r="1.2" fill="#FFFFFF" />
      <circle cx="16" cy="15" r="1.2" fill="#FFFFFF" />
      <circle cx="20" cy="15" r="1.2" fill="#FFFFFF" />

      {/* Emerald online / active accent */}
      {showAccent && (
        <circle cx="21.5" cy="9.5" r="2" fill="#16A36A" />
      )}
    </svg>
  );
}

export default PayentAgentIcon;
