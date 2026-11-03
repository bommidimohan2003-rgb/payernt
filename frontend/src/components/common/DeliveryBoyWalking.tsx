import React from "react";

export interface DeliveryBoyWalkingProps {
  className?: string;
  statusText?: string;
}

/**
 * Animated Delivery Courier Character for paYent AI Agent
 * - Plain black T-shirt (zero logos or text)
 * - Dark charcoal trousers (#2B3037)
 * - Black shoes (#111315)
 * - Dark delivery backpack (#1C2024) with subtle green accent (#16A36A)
 * - Holding courier parcel box
 * - Continuous, smooth CSS walk cycle active while AI generates response
 */
export function DeliveryBoyWalking({
  className = "",
  statusText = "Verifying platform records & policy...",
}: DeliveryBoyWalkingProps) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-[#F5F6F8] border border-[#E1E4E8] text-[#252930] shadow-xs select-none ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Agent is preparing response"
    >
      <div className="relative w-16 h-16 shrink-0 overflow-hidden">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              @keyframes payentBob {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-3px); }
              }
              @keyframes payentLegL {
                0% { transform: rotate(-20deg); }
                50% { transform: rotate(20deg); }
                100% { transform: rotate(-20deg); }
              }
              @keyframes payentLegR {
                0% { transform: rotate(20deg); }
                50% { transform: rotate(-20deg); }
                100% { transform: rotate(20deg); }
              }
              @keyframes payentParcel {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-2px) rotate(-1deg); }
              }
              @keyframes payentShadow {
                0%, 100% { transform: scaleX(1); opacity: 0.25; }
                50% { transform: scaleX(0.8); opacity: 0.15; }
              }
              @keyframes payentSpeedLine {
                0% { transform: translateX(25px); opacity: 0; }
                40% { opacity: 0.6; }
                100% { transform: translateX(-25px); opacity: 0; }
              }

              .anim-bob {
                animation: payentBob 0.8s ease-in-out infinite;
              }
              .anim-leg-l {
                transform-origin: 48px 58px;
                animation: payentLegL 0.8s ease-in-out infinite;
              }
              .anim-leg-r {
                transform-origin: 52px 58px;
                animation: payentLegR 0.8s ease-in-out infinite;
              }
              .anim-parcel {
                transform-origin: 56px 42px;
                animation: payentParcel 0.8s ease-in-out infinite;
              }
              .anim-shadow {
                transform-origin: 50px 92px;
                animation: payentShadow 0.8s ease-in-out infinite;
              }
              .anim-speed-1 {
                animation: payentSpeedLine 1.2s linear infinite;
              }
              .anim-speed-2 {
                animation: payentSpeedLine 1.2s linear infinite 0.6s;
              }
            `}</style>
          </defs>

          {/* Ground motion speed dashes */}
          <g className="anim-speed-1">
            <line x1="60" y1="92" x2="72" y2="92" stroke="#E1E4E8" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="anim-speed-2">
            <line x1="75" y1="92" x2="84" y2="92" stroke="#E1E4E8" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Contact shadow */}
          <ellipse
            cx="50"
            cy="92"
            rx="16"
            ry="3.5"
            fill="#17191C"
            className="anim-shadow"
          />

          {/* BACK LEG (Dark charcoal trousers + black shoe) */}
          <g className="anim-leg-l">
            {/* Upper leg */}
            <path
              d="M48 58L42 74"
              stroke="#252930"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Lower leg */}
            <path
              d="M42 74L38 88"
              stroke="#20242A"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Black shoe */}
            <path
              d="M36 88H44C44 88 44 91 42 91H34C34 91 34 88 36 88Z"
              fill="#111315"
            />
          </g>

          {/* UPPER BODY (Bobbing with walking stride) */}
          <g className="anim-bob">
            {/* Dark delivery backpack behind torso */}
            <rect
              x="29"
              y="34"
              width="13"
              height="23"
              rx="4"
              fill="#1C2024"
            />
            {/* Subtle green accent reflector band on backpack */}
            <rect
              x="30"
              y="44"
              width="11"
              height="2.5"
              rx="1"
              fill="#16A36A"
            />

            {/* Torso: Plain Black T-Shirt (NO logo or text) */}
            <path
              d="M42 32H58C60 32 61 34 60 36L56 59H44L40 36C39 34 40 32 42 32Z"
              fill="#17191C"
            />

            {/* Head & Neck */}
            <rect x="47" y="27" width="6" height="6" fill="#D4A373" rx="1.5" />
            {/* Head */}
            <circle cx="50" cy="20" r="8" fill="#E0BB95" />
            {/* Modern dark hair / cap */}
            <path
              d="M43 19C43 14 46 12 51 12C56 12 58 14 58 19C56 18 53 18 51 18C47 18 45 19 43 19Z"
              fill="#17191C"
            />
            {/* Cap brim pointing forward */}
            <path
              d="M51 15H61C61 15 60 17 58 17H51V15Z"
              fill="#17191C"
            />

            {/* ARMS HOLDING PARCEL */}
            <g className="anim-parcel">
              {/* Back arm */}
              <path
                d="M48 35L57 44"
                stroke="#17191C"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Courier Parcel Box */}
              <g transform="translate(56, 36)">
                {/* Box body (kraft courier card) */}
                <rect
                  x="0"
                  y="0"
                  width="18"
                  height="16"
                  rx="2"
                  fill="#C69563"
                  stroke="#A87547"
                  strokeWidth="0.75"
                />
                {/* Horizontal sealing tape */}
                <rect x="0" y="7" width="18" height="2.5" fill="#E2BA8E" />
                {/* Vertical sealing tape */}
                <rect x="8" y="0" width="2.5" height="16" fill="#E2BA8E" />
                {/* Subtle green Payent delivery accent tag */}
                <rect
                  x="11"
                  y="3"
                  width="4"
                  height="3"
                  rx="0.5"
                  fill="#16A36A"
                />
              </g>

              {/* Front Arm (holding front side of parcel) */}
              <path
                d="M46 36L55 46L66 45"
                stroke="#17191C"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Hand holding parcel */}
              <circle cx="66" cy="45" r="2.5" fill="#E0BB95" />
            </g>
          </g>

          {/* FRONT LEG (Dark charcoal trousers + black shoe) */}
          <g className="anim-leg-r">
            {/* Upper leg */}
            <path
              d="M52 58L58 73"
              stroke="#2E333B"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Lower leg */}
            <path
              d="M58 73L63 87"
              stroke="#282D34"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Black shoe */}
            <path
              d="M61 87H70C70 87 70 90 68 90H60C60 90 60 87 61 87Z"
              fill="#111315"
            />
          </g>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[#17191C] flex items-center gap-1.5">
          <span>Payent Agent</span>
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-[#16A36A] animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1 w-1 rounded-full bg-[#16A36A] animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1 w-1 rounded-full bg-[#16A36A] animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
        <p className="text-[11px] text-[#707780] truncate mt-0.5">
          {statusText}
        </p>
      </div>
    </div>
  );
}

export default DeliveryBoyWalking;
