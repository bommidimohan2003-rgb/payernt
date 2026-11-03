import React from "react";

export interface DeliveryBoyLoaderProps {
  className?: string;
  size?: number | string;
}

/**
 * paYent AI Agent — Walking Delivery Boy Loading Indicator
 * 
 * Strict Design Specifications:
 * - Plain black T-shirt (#17191C) — zero logo or text
 * - Dark charcoal trousers (#282D34 / #20242A)
 * - Black shoes (#111315)
 * - Black delivery backpack (#1A1D20) with green accent reflector (#16A36A)
 * - Cardboard parcel held in both hands with green delivery tag
 * - Continuous natural walking cycle (smooth 24+ FPS CSS keyframes)
 * - Displayed ALONE on the left of the conversation
 * - Zero cards, zero background bubbles, zero dots, zero text, zero extra avatars
 * - Automatically respects prefers-reduced-motion
 */
export function DeliveryBoyLoader({
  className = "",
  size = 72,
}: DeliveryBoyLoaderProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={`inline-flex items-center justify-start select-none py-1 pl-1 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Payent Agent is preparing your response"
    >
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="relative shrink-0 overflow-visible"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              @keyframes boyBob {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-3px); }
              }
              @keyframes boyLegBack {
                0% { transform: rotate(-22deg); }
                50% { transform: rotate(20deg); }
                100% { transform: rotate(-22deg); }
              }
              @keyframes boyLegFront {
                0% { transform: rotate(20deg); }
                50% { transform: rotate(-22deg); }
                100% { transform: rotate(20deg); }
              }
              @keyframes boyParcel {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-2px) rotate(-1.5deg); }
              }
              @keyframes boyShadow {
                0%, 100% { transform: scaleX(1); opacity: 0.22; }
                50% { transform: scaleX(0.75); opacity: 0.12; }
              }
              @keyframes boyDash {
                0% { transform: translateX(20px); opacity: 0; }
                40% { opacity: 0.55; }
                100% { transform: translateX(-22px); opacity: 0; }
              }

              .anim-boy-bob {
                animation: boyBob 0.75s ease-in-out infinite;
              }
              .anim-boy-leg-b {
                transform-origin: 47px 58px;
                animation: boyLegBack 0.75s ease-in-out infinite;
              }
              .anim-boy-leg-f {
                transform-origin: 53px 58px;
                animation: boyLegFront 0.75s ease-in-out infinite;
              }
              .anim-boy-parcel {
                transform-origin: 55px 44px;
                animation: boyParcel 0.75s ease-in-out infinite;
              }
              .anim-boy-shadow {
                transform-origin: 50px 92px;
                animation: boyShadow 0.75s ease-in-out infinite;
              }
              .anim-boy-dash-1 {
                animation: boyDash 1.1s linear infinite;
              }
              .anim-boy-dash-2 {
                animation: boyDash 1.1s linear infinite 0.55s;
              }

              @media (prefers-reduced-motion: reduce) {
                .anim-boy-bob,
                .anim-boy-leg-b,
                .anim-boy-leg-f,
                .anim-boy-parcel,
                .anim-boy-shadow,
                .anim-boy-dash-1,
                .anim-boy-dash-2 {
                  animation: none !important;
                }
              }
            `}</style>
          </defs>

          {/* Dynamic Ground Dashes */}
          <g className="anim-boy-dash-1">
            <line
              x1="58"
              y1="92"
              x2="72"
              y2="92"
              stroke="#E1E4E8"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </g>
          <g className="anim-boy-dash-2">
            <line
              x1="74"
              y1="92"
              x2="85"
              y2="92"
              stroke="#E1E4E8"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </g>

          {/* Ground Contact Shadow */}
          <ellipse
            cx="50"
            cy="92"
            rx="16"
            ry="3.5"
            fill="#17191C"
            className="anim-boy-shadow"
          />

          {/* BACK LEG (Dark charcoal trousers + black sneaker) */}
          <g className="anim-boy-leg-b">
            {/* Upper Leg */}
            <path
              d="M47 58L41 74"
              stroke="#22262C"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Lower Leg */}
            <path
              d="M41 74L37 88"
              stroke="#1C2025"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Black Shoe */}
            <path
              d="M35 88H43C43 88 43 91 41 91H33C33 91 33 88 35 88Z"
              fill="#111315"
            />
          </g>

          {/* UPPER BODY (Bobbing naturally with walking cadence) */}
          <g className="anim-boy-bob">
            {/* Dark Courier Backpack */}
            <rect
              x="28"
              y="33"
              width="14"
              height="24"
              rx="4"
              fill="#1A1D20"
            />
            {/* Green Reflector Accent Stripe on Backpack */}
            <rect
              x="29"
              y="43"
              width="12"
              height="2.8"
              rx="1.2"
              fill="#16A36A"
            />

            {/* Torso: Plain Black T-Shirt (STRICTLY NO text or logos) */}
            <path
              d="M41 31H58C60 31 61.5 33 60.5 35.5L56 59H43.5L39.5 35.5C38.5 33 40 31 41 31Z"
              fill="#17191C"
            />
            {/* Clean T-Shirt Crewneck Collar */}
            <path
              d="M47 31C47 33.5 53 33.5 53 31"
              stroke="#252930"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Neck */}
            <rect x="47" y="26" width="6" height="6" fill="#D8A47F" rx="1.5" />

            {/* Head */}
            <circle cx="50" cy="19.5" r="8" fill="#E2B694" />

            {/* Smiling Eye Profile */}
            <path
              d="M54 18.5C54 19.5 55 19.5 55 18.5"
              stroke="#17191C"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* Courier Baseball Cap (Black with Forward Brim) */}
            <path
              d="M43 18.5C43 13.5 46 11.5 51 11.5C56 11.5 58 13.5 58 18.5C56 17.5 53 17.5 51 17.5C47 17.5 45 18.5 43 18.5Z"
              fill="#17191C"
            />
            {/* Forward Cap Visor */}
            <path
              d="M51 14.5H62C62 14.5 61 16.5 58 16.5H51V14.5Z"
              fill="#17191C"
            />
            {/* Tiny Green Accent Stitch on Cap Visor */}
            <rect x="58" y="14.8" width="2" height="1.2" fill="#16A36A" rx="0.4" />

            {/* ARMS HOLDING COURIER PARCEL */}
            <g className="anim-boy-parcel">
              {/* Back Arm (Reaching forward around parcel) */}
              <path
                d="M47 34L56 43"
                stroke="#17191C"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Courier Parcel Box */}
              <g transform="translate(55, 35)">
                {/* Kraft Cardboard Box */}
                <rect
                  x="0"
                  y="0"
                  width="19"
                  height="17"
                  rx="2.2"
                  fill="#C59461"
                  stroke="#A87648"
                  strokeWidth="0.8"
                />
                {/* Horizontal Sealing Tape */}
                <rect x="0" y="7.5" width="19" height="2.5" fill="#E1B78B" />
                {/* Vertical Sealing Tape */}
                <rect x="8.5" y="0" width="2.5" height="17" fill="#E1B78B" />
                {/* Green paYent Delivery Destination Tag */}
                <rect
                  x="12"
                  y="2.5"
                  width="4.5"
                  height="3.5"
                  rx="0.6"
                  fill="#16A36A"
                />
                {/* Barcode Lines on Tag */}
                <line x1="13" y1="3.5" x2="15.5" y2="3.5" stroke="#FFFFFF" strokeWidth="0.6" />
                <line x1="13" y1="4.5" x2="15" y2="4.5" stroke="#FFFFFF" strokeWidth="0.6" />
              </g>

              {/* Front Arm (Holding and supporting front of parcel) */}
              <path
                d="M45 35L54 45L66 44"
                stroke="#17191C"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Courier Hand gripping parcel */}
              <circle cx="66" cy="44" r="2.5" fill="#E2B694" />
            </g>
          </g>

          {/* FRONT LEG (Dark charcoal trousers + black sneaker) */}
          <g className="anim-boy-leg-f">
            {/* Upper Leg */}
            <path
              d="M53 58L59 73"
              stroke="#2B3037"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Lower Leg */}
            <path
              d="M59 73L64 87"
              stroke="#242830"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Black Sneaker */}
            <path
              d="M62 87H71C71 87 71 90 69 90H61C61 90 61 87 62 87Z"
              fill="#111315"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default DeliveryBoyLoader;
