import React, { useState, useEffect } from "react";

export interface DeliveryBoyLoaderProps {
  className?: string;
  size?: number | string;
}

/**
 * 12-Frame Biomechanical Walking Cycle Data
 *
 * Mathematically calculated using 2-bone Inverse Kinematics (IK):
 * - Left and right legs alternate seamlessly with 180° phase offset
 * - Proper heel-to-toe roll during the stance phase (flat along ground plane y=97)
 * - Natural knee flexion (+38° bend) during swing phase to clear the ground
 * - Harmonious 2-beat body bobbing (cushion & push-off)
 * - Parcel held securely with both hands without floating or erratic rotation
 * - 12 consistent frames at 16 FPS (62.5ms/frame) = 750ms seamless loop
 */
interface WalkFrame {
  bob: number;
  r_ax: number;
  r_ay: number;
  r_ang: number;
  r_kx: number;
  r_ky: number;
  l_ax: number;
  l_ay: number;
  l_ang: number;
  l_kx: number;
  l_ky: number;
}

const WALK_FRAMES: WalkFrame[] = [
  // Frame 0: Right heel contact, Left toe push-off
  { bob: 2.2, r_ax: 64.0, r_ay: 97.0, r_ang: -14.0, r_kx: 59.1, r_ky: 79.2, l_ax: 38.0, l_ay: 97.0, l_ang: 22.0, l_kx: 43.8, l_ky: 78.9 },
  // Frame 1: Right foot rolling to flat, Left foot lifting
  { bob: 1.1, r_ax: 59.7, r_ay: 97.0, r_ang: -2.3, r_kx: 52.0, r_ky: 80.7, l_ax: 42.3, l_ay: 91.5, l_ang: -4.0, l_kx: 35.9, l_ky: 74.7 },
  // Frame 2: Right leg bearing weight, Left knee flexing forward
  { bob: -1.1, r_ax: 55.3, r_ay: 97.0, r_ang: 0.0, r_kx: 46.6, r_ky: 81.3, l_ax: 46.7, l_ay: 87.5, l_ang: -6.9, l_kx: 34.2, l_ky: 74.6 },
  // Frame 3: Right leg under hip, Left knee bent passing under body
  { bob: -2.2, r_ax: 51.0, r_ay: 97.0, r_ang: 0.0, r_kx: 43.7, r_ky: 80.6, l_ax: 51.0, l_ay: 86.0, l_ang: -8.0, l_kx: 35.3, l_ky: 77.2 },
  // Frame 4: Right foot pushing back, Left leg reaching forward
  { bob: -1.1, r_ax: 46.7, r_ay: 97.0, r_ang: 0.0, r_kx: 43.4, r_ky: 79.3, l_ax: 55.3, l_ay: 87.5, l_ang: -6.9, l_kx: 39.1, l_ky: 79.8 },
  // Frame 5: Right heel lifting, Left foot preparing contact
  { bob: 1.1, r_ax: 42.3, r_ay: 97.0, r_ang: 9.8, r_kx: 48.3, r_ky: 79.8, l_ax: 59.7, l_ay: 91.5, l_ang: -4.0, l_kx: 45.5, l_ky: 80.4 },
  // Frame 6: Right toe push-off, Left heel contact
  { bob: 2.2, r_ax: 38.0, r_ay: 97.0, r_ang: 22.0, r_kx: 46.7, r_ky: 78.0, l_ax: 64.0, l_ay: 97.0, l_ang: -14.0, l_kx: 56.2, l_ky: 78.5 },
  // Frame 7: Right foot lifting, Left foot rolling to flat
  { bob: 1.1, r_ax: 42.3, r_ay: 91.5, r_ang: -4.0, r_kx: 40.1, r_ky: 73.6, l_ax: 59.7, l_ay: 97.0, l_ang: -2.3, l_kx: 52.0, l_ky: 80.7 },
  // Frame 8: Right knee flexing forward, Left leg bearing weight
  { bob: -1.1, r_ax: 46.7, r_ay: 87.5, r_ang: -6.9, r_kx: 37.8, r_ky: 71.8, l_ax: 55.3, l_ay: 97.0, l_ang: 0.0, l_kx: 44.7, l_ky: 82.4 },
  // Frame 9: Right knee bent passing under body, Left leg under hip
  { bob: -2.2, r_ax: 51.0, r_ay: 86.0, r_ang: -8.0, r_kx: 38.0, r_ky: 73.5, l_ax: 51.0, l_ay: 97.0, l_ang: 0.0, l_kx: 41.0, l_ky: 82.1 },
  // Frame 10: Right leg reaching forward, Left foot pushing back
  { bob: -1.1, r_ax: 55.3, r_ay: 87.5, r_ang: -6.9, r_kx: 40.8, r_ky: 76.8, l_ax: 46.7, l_ay: 97.0, l_ang: 0.0, l_kx: 39.9, l_ky: 80.3 },
  // Frame 11: Right foot preparing contact, Left heel lifting
  { bob: 1.1, r_ax: 59.7, r_ay: 91.5, r_ang: -4.0, r_kx: 46.7, r_ky: 79.1, l_ax: 42.3, l_ay: 97.0, l_ang: 9.8, l_kx: 41.5, l_ky: 79.0 },
];

export function DeliveryBoyLoader({
  className = "",
  size = 82,
}: DeliveryBoyLoaderProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion: keep static frame 0
    if (typeof window !== "undefined" && window.matchMedia) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) return;
    }

    let animId: number;
    let lastTime = performance.now();
    const frameDuration = 62.5; // ~16 FPS (12 frames in 750ms)

    const loop = (now: number) => {
      if (now - lastTime >= frameDuration) {
        setFrameIdx((prev) => (prev + 1) % 12);
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const f = WALK_FRAMES[frameIdx];
  const upperBodyY = -f.bob; // Bobbing translation for upper body
  const shadowScale = 1.0 + f.bob * 0.08;

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
            {/* Ground Contact Shadow Gradient */}
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

            {/* Plain Black T-Shirt Fabric Gradient */}
            <linearGradient id="tshirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#242930" />
              <stop offset="100%" stopColor="#17191C" />
            </linearGradient>

            {/* Courier Backpack Depth */}
            <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#252A30" />
              <stop offset="100%" stopColor="#181B1F" />
            </linearGradient>

            {/* Dimensional Kraft Parcel Box Gradients */}
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

          {/* Contact Ground Shadow (Pulses with foot impact) */}
          <ellipse
            cx="52"
            cy="101"
            rx={19 * shadowScale}
            ry={4 * shadowScale}
            fill="url(#groundShadowGrad)"
          />

          {/* ========================================================
              BACK LEG (LEFT LEG — DEEPER CHARCOAL FOR DEPTH)
              ======================================================== */}
          {/* Back Thigh */}
          <line
            x1="49.5"
            y1={64 - f.bob}
            x2={f.l_kx}
            y2={f.l_ky}
            stroke="#1D2126"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Back Calf */}
          <line
            x1={f.l_kx}
            y1={f.l_ky}
            x2={f.l_ax}
            y2={f.l_ay}
            stroke="#181B20"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Back Sneaker */}
          <g transform={`translate(${f.l_ax}, ${f.l_ay}) rotate(${f.l_ang})`}>
            {/* Sneaker Upper */}
            <path
              d="M -7 2 C -5 0 2 0 6 2 L 12 3.5 C 13 4.5 12 5 11 5 H -7 C -8 5 -8 2 -7 2 Z"
              fill="#111315"
            />
            {/* White Midsole */}
            <rect x="-8" y="5" width="20" height="1.6" rx="0.8" fill="#FFFFFF" />
            {/* Dark Sole Tread */}
            <rect x="-7.5" y="6.4" width="19" height="0.8" rx="0.4" fill="#E1E4E8" />
          </g>

          {/* ========================================================
              UPPER BODY (TORSO, HEAD, BACKPACK, PARCEL & ARMS)
              Bobbing together as a single unified structure
              ======================================================== */}
          <g transform={`translate(0, ${upperBodyY})`}>
            {/* Ergonomic Delivery Backpack */}
            <rect
              x="24"
              y="36"
              width="17"
              height="28"
              rx="6"
              fill="url(#backpackGrad)"
            />
            {/* Backpack Flap */}
            <path
              d="M26 40C26 38 28 36.5 32 36.5H35C39 36.5 40 38 40 40"
              stroke="#2E333B"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Emerald Green Safety Reflector Stripe on Backpack */}
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
              strokeOpacity="0.45"
            />

            {/* Back Arm (Reaching behind to hold far side of box) */}
            <path
              d="M48 37L61 46"
              stroke="#17191C"
              strokeWidth="4.5"
              strokeLinecap="round"
            />

            {/* Plain Black T-Shirt (STRICTLY NO text or logos) */}
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
            {/* Subtle Waist Hem Line */}
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

            {/* Cheerful Ear Profile */}
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

            {/* Black Delivery Cap */}
            <path
              d="M43.5 19.5C43.5 14 47 11.5 52 11.5C57.5 11.5 59.5 14 59.5 19.5C57.5 18 54 18 52 18C47.5 18 45.5 19.5 43.5 19.5Z"
              fill="#17191C"
            />
            {/* Forward Visor */}
            <path
              d="M52 15H64C64.5 15 63.5 17.5 60.5 17.5H52V15Z"
              fill="#17191C"
            />
            {/* Emerald Green Visor Accent Line */}
            <path
              d="M58 15.5L63.5 15.5"
              stroke="#16A36A"
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* ========================================================
                DIMENSIONAL PARCEL BOX (STABLE IN HANDS)
                ======================================================== */}
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

            {/* paYent Emerald Delivery Destination Tag with White 'P' Brand Symbol */}
            <g transform="translate(70, 48)">
              <rect
                x="0"
                y="0"
                width="8.5"
                height="6"
                rx="1.2"
                fill="#16A36A"
              />
              {/* Stylized White 'P' Logo */}
              <path
                d="M 2.4 1.4 H 5.2 C 6.2 1.4 6.8 2.0 6.8 2.8 C 6.8 3.6 6.2 4.2 5.2 4.2 H 3.4 V 5.0 H 2.4 Z M 3.4 2.2 V 3.4 H 5.0 C 5.5 3.4 5.8 3.1 5.8 2.8 C 5.8 2.5 5.5 2.2 5.0 2.2 Z"
                fill="#FFFFFF"
              />
            </g>

            {/* Fragile / Route Upward Arrows Accent on Box */}
            <path
              d="M58 48L60 46L60 52M60 46L62 48"
              stroke="#A87140"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Front Arm (Forearm supporting box securely) */}
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
              FRONT LEG (RIGHT LEG — CHARCOAL #282D35 FOR CONTRAST)
              ======================================================== */}
          {/* Front Thigh */}
          <line
            x1="54.5"
            y1={64 - f.bob}
            x2={f.r_kx}
            y2={f.r_ky}
            stroke="#282D35"
            strokeWidth="6.2"
            strokeLinecap="round"
          />
          {/* Front Calf */}
          <line
            x1={f.r_kx}
            y1={f.r_ky}
            x2={f.r_ax}
            y2={f.r_ay}
            stroke="#20242B"
            strokeWidth="5.2"
            strokeLinecap="round"
          />
          {/* Front Sneaker */}
          <g transform={`translate(${f.r_ax}, ${f.r_ay}) rotate(${f.r_ang})`}>
            {/* Sneaker Upper */}
            <path
              d="M -7 2 C -5 0 2 0 6 2 L 12 3.5 C 13 4.5 12 5 11 5 H -7 C -8 5 -8 2 -7 2 Z"
              fill="#111315"
            />
            {/* White Midsole */}
            <rect x="-8" y="5" width="20" height="1.6" rx="0.8" fill="#FFFFFF" />
            {/* Dark Sole Tread */}
            <rect x="-7.5" y="6.4" width="19" height="0.8" rx="0.4" fill="#E1E4E8" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default DeliveryBoyLoader;
