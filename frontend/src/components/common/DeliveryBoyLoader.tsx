import React from "react";

export interface DeliveryBoyLoaderProps {
  className?: string;
  size?: number | string;
}

/**
 * paYent AI Agent — Premium Smooth Walking Delivery Boy Loader
 *
 * Professional Biomechanical Walk-Cycle & Polished Vector Character:
 * - Plain black crewneck T-shirt (#17191C with subtle fabric depth #22262B)
 * - Tailored dark charcoal trousers (#2A2F37 front leg, #1E2228 back leg)
 * - Modern running sneakers with black uppers and crisp white midsoles
 * - Ergonomic black delivery backpack (#1B1E22) with radiant emerald accent (#16A36A)
 * - Dimensional kraft courier parcel with packaging tape and paYent green shipping label
 * - Friendly face profile, stylish curved delivery cap with emerald green visor piping
 * - Articulated 2-joint leg kinematics: thighs swing from hip while calves flex and bend
 *   naturally at the knees during the swing phase, eliminating wooden/rigid leg motion
 * - Coordinated torso bob, secondary parcel bounce, and pulsing ground shadow
 * - Pure standalone rendering (no cards, no background bubble, no text, no avatars)
 * - Fully accessible with prefers-reduced-motion fallback
 */
export function DeliveryBoyLoader({
  className = "",
  size = 82,
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
          viewBox="0 0 120 120"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              /* ============================================================
                 SMOOTH BIOMECHANICAL WALK CYCLE (0.8s Loop, 60fps Curves)
                 ============================================================ */

              /* Double-frequency torso bobbing (two footsteps per walk cycle) */
              @keyframes walkBob {
                0%, 50%, 100% {
                  transform: translateY(-0.5px) rotate(0deg);
                }
                25%, 75% {
                  transform: translateY(-3.5px) rotate(0.6deg);
                }
              }

              /* Primary hip rotation: swings forward (+22deg) and back (-20deg) */
              @keyframes hipSwing {
                0%   { transform: rotate(22deg); }
                25%  { transform: rotate(0deg); }
                50%  { transform: rotate(-20deg); }
                75%  { transform: rotate(-2deg); }
                100% { transform: rotate(22deg); }
              }

              /* Secondary knee articulation: bends deeply (+38deg) during forward swing */
              @keyframes kneeFlex {
                0%   { transform: rotate(2deg); }
                25%  { transform: rotate(8deg); }
                50%  { transform: rotate(14deg); }
                72%  { transform: rotate(38deg); }
                86%  { transform: rotate(14deg); }
                100% { transform: rotate(2deg); }
              }

              /* Secondary parcel inertia bounce */
              @keyframes parcelBob {
                0%, 50%, 100% {
                  transform: translateY(0px) rotate(0deg);
                }
                25%, 75% {
                  transform: translateY(-2.2px) rotate(-1deg);
                }
              }

              /* Dynamic ground contact shadow pulse */
              @keyframes shadowPulse {
                0%, 50%, 100% {
                  transform: scaleX(1) scaleY(1);
                  opacity: 0.28;
                }
                25%, 75% {
                  transform: scaleX(0.8) scaleY(0.85);
                  opacity: 0.16;
                }
              }

              /* Smooth ground speed dashes gliding underneath */
              @keyframes groundDash {
                0%   { transform: translateX(25px); opacity: 0; }
                30%  { opacity: 0.55; }
                100% { transform: translateX(-30px); opacity: 0; }
              }

              /* Class Assignments with negative animation delay for 180° leg phase offset */
              .anim-torso {
                animation: walkBob 0.8s cubic-bezier(0.42, 0, 0.58, 1) infinite;
                transform-origin: 52px 66px;
              }

              .anim-hip-f {
                animation: hipSwing 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                transform-origin: 55px 66px;
              }

              .anim-knee-f {
                animation: kneeFlex 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                transform-origin: 59px 84px;
              }

              .anim-hip-b {
                animation: hipSwing 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite -0.4s;
                transform-origin: 48px 66px;
              }

              .anim-knee-b {
                animation: kneeFlex 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite -0.4s;
                transform-origin: 44px 84px;
              }

              .anim-box {
                animation: parcelBob 0.8s cubic-bezier(0.42, 0, 0.58, 1) infinite;
                transform-origin: 70px 48px;
              }

              .anim-shadow {
                animation: shadowPulse 0.8s ease-in-out infinite;
                transform-origin: 54px 105px;
              }

              .anim-dash-1 {
                animation: groundDash 1.1s linear infinite;
              }

              .anim-dash-2 {
                animation: groundDash 1.1s linear infinite 0.55s;
              }

              @media (prefers-reduced-motion: reduce) {
                .anim-torso,
                .anim-hip-f,
                .anim-knee-f,
                .anim-hip-b,
                .anim-knee-b,
                .anim-box,
                .anim-shadow,
                .anim-dash-1,
                .anim-dash-2 {
                  animation: none !important;
                }
              }
            `}</style>

            {/* Soft Radial Ambient Shadow */}
            <radialGradient
              id="groundShadowGrad"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="#17191C" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#17191C" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#17191C" stopOpacity="0" />
            </radialGradient>

            {/* Subtle T-Shirt Fabric Gradient */}
            <linearGradient id="tshirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#242930" />
              <stop offset="100%" stopColor="#17191C" />
            </linearGradient>

            {/* Backpack Subtle Depth */}
            <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#252A30" />
              <stop offset="100%" stopColor="#181B1F" />
            </linearGradient>

            {/* Courier Parcel Craft Gradients */}
            <linearGradient id="boxTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2B284" />
              <stop offset="100%" stopColor="#D5A475" />
            </linearGradient>
            <linearGradient id="boxFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CF9764" />
              <stop offset="100%" stopColor="#BD8552" />
            </linearGradient>
            <linearGradient id="boxRightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#BD8552" />
              <stop offset="100%" stopColor="#A87140" />
            </linearGradient>
          </defs>

          {/* Smooth Ground Motion Dashes */}
          <g className="anim-dash-1">
            <line
              x1="62"
              y1="105"
              x2="78"
              y2="105"
              stroke="#E1E4E8"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </g>
          <g className="anim-dash-2">
            <line
              x1="82"
              y1="105"
              x2="95"
              y2="105"
              stroke="#E1E4E8"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </g>

          {/* Ground Contact Shadow */}
          <ellipse
            cx="54"
            cy="105"
            rx="20"
            ry="4"
            fill="url(#groundShadowGrad)"
            className="anim-shadow"
          />

          {/* ========================================================
              BACK LEG (DEEPER CHARCOAL #1E2228 FOR ARTISTIC DEPTH)
              ======================================================== */}
          <g className="anim-hip-b">
            {/* Back Thigh */}
            <path
              d="M48 66L44 84"
              stroke="#1E2228"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Back Knee + Calf + Sneaker Group */}
            <g className="anim-knee-b">
              {/* Back Calf */}
              <path
                d="M44 84L41 100"
                stroke="#181B20"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Back Sneaker */}
              <g transform="translate(32, 98)">
                {/* Black Upper */}
                <path
                  d="M3 3C3 1.5 5 0.5 7.5 0.5H12C13.5 0.5 15 2 16 3.5L17.5 4.5C18.5 5.5 17 6.5 15.5 6.5H3C2 6.5 2 4.5 3 3Z"
                  fill="#111315"
                />
                {/* Crisp White Midsole */}
                <rect x="2" y="6" width="16" height="1.6" rx="0.8" fill="#FFFFFF" />
                {/* Dark Sole Tread */}
                <rect x="2.5" y="7.2" width="15" height="0.8" rx="0.4" fill="#E1E4E8" />
              </g>
            </g>
          </g>

          {/* ========================================================
              UPPER BODY: TORSO, BACKPACK, HEAD, PARCEL & ARMS
              ======================================================== */}
          <g className="anim-torso">
            {/* Ergonomic Delivery Backpack */}
            <g>
              <rect
                x="24"
                y="36"
                width="17"
                height="28"
                rx="6"
                fill="url(#backpackGrad)"
              />
              {/* Backpack Top Flap & Texture */}
              <path
                d="M26 40C26 38 28 36.5 32 36.5H35C39 36.5 40 38 40 40"
                stroke="#2E333B"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Luminous Emerald Green Safety Reflector Stripe */}
              <rect
                x="25.5"
                y="48"
                width="14"
                height="3.6"
                rx="1.8"
                fill="#16A36A"
              />
              {/* Reflector Internal Highlight */}
              <line
                x1="27"
                y1="49.8"
                x2="38"
                y2="49.8"
                stroke="#FFFFFF"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeOpacity="0.4"
              />
            </g>

            {/* Back Arm (Cradling far side of parcel) */}
            <path
              d="M48 37L61 46"
              stroke="#17191C"
              strokeWidth="4.5"
              strokeLinecap="round"
            />

            {/* Torso: Plain Black Crewneck T-Shirt (STRICTLY NO text or logos) */}
            <path
              d="M42 33H59C61 33 62.5 35 61.5 37.5L57 66H43.5L39.5 37.5C38.5 35 40 33 42 33Z"
              fill="url(#tshirtGrad)"
            />
            {/* Clean Crewneck Collar */}
            <path
              d="M47 33C47 35.5 53 35.5 53 33"
              stroke="#2A2F37"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Subtle Waist Hem Stitch Line */}
            <line
              x1="44"
              y1="64"
              x2="56.5"
              y2="64"
              stroke="#22262C"
              strokeWidth="1"
            />

            {/* Neck */}
            <rect
              x="47.5"
              y="26"
              width="6"
              height="7.5"
              fill="#E5B28F"
              rx="2"
            />

            {/* Head */}
            <circle cx="51" cy="20" r="8.5" fill="#F0C09E" />

            {/* Warm Friendly Ear */}
            <ellipse cx="46" cy="21" rx="1.8" ry="2.4" fill="#E5B28F" />

            {/* Friendly Smiling Eye */}
            <path
              d="M55.5 19C55.5 20.2 56.5 20.2 56.5 19"
              stroke="#17191C"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            {/* Subtle Cheerful Smile */}
            <path
              d="M57 23.5C57 24.5 58.5 24.5 58.8 23.5"
              stroke="#D49A75"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* Contemporary Black Courier Cap */}
            <path
              d="M43.5 19.5C43.5 14 47 11.5 52 11.5C57.5 11.5 59.5 14 59.5 19.5C57.5 18 54 18 52 18C47.5 18 45.5 19.5 43.5 19.5Z"
              fill="#17191C"
            />
            {/* Curved Forward Visor */}
            <path
              d="M52 15H64C64.5 15 63.5 17.5 60.5 17.5H52V15Z"
              fill="#17191C"
            />
            {/* High-Vis Emerald Green Piping on Visor Edge */}
            <path
              d="M58 15.5L63.5 15.5"
              stroke="#16A36A"
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* ========================================================
                DIMENSIONAL COURIER PARCEL BOX WITH SECONDARY BOUNCE
                ======================================================== */}
            <g className="anim-box">
              {/* 3D Isometric Cardboard Box */}
              {/* Top Face */}
              <polygon
                points="56,41 71,37 84,41.5 69,45.5"
                fill="url(#boxTopGrad)"
              />
              {/* Front Face */}
              <polygon
                points="56,41 69,45.5 69,60 56,55.5"
                fill="url(#boxFrontGrad)"
              />
              {/* Right Face */}
              <polygon
                points="69,45.5 84,41.5 84,56 69,60"
                fill="url(#boxRightGrad)"
              />

              {/* Packaging Tape (Horizontal Across Faces) */}
              <polygon
                points="61,42.5 65,43.7 65,58.5 61,57.2"
                fill="#E8CBA3"
              />
              <polygon
                points="75,44 79,42.8 79,57.2 75,58.5"
                fill="#D8BB95"
              />

              {/* paYent Emerald Delivery Destination Label */}
              <g transform="translate(71, 48)">
                <rect
                  x="0"
                  y="0"
                  width="7.5"
                  height="5.5"
                  rx="1"
                  fill="#16A36A"
                />
                {/* Barcode Lines */}
                <line x1="1.5" y1="1.8" x2="6" y2="1.8" stroke="#FFFFFF" strokeWidth="0.8" />
                <line x1="1.5" y1="3.2" x2="4.5" y2="3.2" stroke="#FFFFFF" strokeWidth="0.8" />
              </g>

              {/* Fragile / Route Upward Arrows Accent on Box */}
              <path
                d="M58 48L60 46L60 52M60 46L62 48"
                stroke="#A87140"
                strokeWidth="0.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Front Arm (Bent at elbow, holding and supporting parcel) */}
            <path
              d="M47 36L57 47L70 45"
              stroke="#17191C"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Front Hand Gripping Parcel Edge */}
            <ellipse cx="69" cy="45" rx="2.4" ry="2.8" fill="#F0C09E" />
          </g>

          {/* ========================================================
              FRONT LEG (LIGHTER DARK CHARCOAL #2A2F37 FOR CONTRAST)
              ======================================================== */}
          <g className="anim-hip-f">
            {/* Front Thigh */}
            <path
              d="M55 66L59 84"
              stroke="#2A2F37"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Front Knee + Calf + Sneaker Group */}
            <g className="anim-knee-f">
              {/* Front Calf */}
              <path
                d="M59 84L63 100"
                stroke="#22262D"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Front Sneaker */}
              <g transform="translate(54, 98)">
                {/* Black Upper */}
                <path
                  d="M3 3C3 1.5 5 0.5 7.5 0.5H13C14.5 0.5 16 2 17.5 3.5L19 4.5C20 5.5 18.5 6.5 17 6.5H3C2 6.5 2 4.5 3 3Z"
                  fill="#111315"
                />
                {/* Crisp White Midsole */}
                <rect x="2" y="6" width="17.5" height="1.6" rx="0.8" fill="#FFFFFF" />
                {/* Dark Sole Tread */}
                <rect x="2.5" y="7.2" width="16.5" height="0.8" rx="0.4" fill="#E1E4E8" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default DeliveryBoyLoader;
