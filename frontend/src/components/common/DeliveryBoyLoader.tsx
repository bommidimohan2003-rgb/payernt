import React, { useState, useEffect } from "react";

export interface DeliveryBoyLoaderProps {
  className?: string;
  size?: number | string;
}

/**
 * 24-Frame Master Human Walking Cycle Data
 *
 * Mathematically calculated using analytical 2-bone Inverse Kinematics (IK):
 * - Canonical human walking cadence: 24 frames @ 24 FPS = 1.0s cycle (120 steps/min)
 * - True anatomical 2-phase gait: Stance phase (58%) & Swing phase (42%)
 * - Flat ground contact along ground plane (y = 96.0) with heel strike (-14°), roll (0°), and toe push-off (+27.5°)
 * - High knee flexion during swing phase to clear the ground without scuffing
 * - Coordinated secondary motion:
 *   * Torso micro-sway & pelvic balance (±0.7°)
 *   * Backpack vertical lag and elastic tilt responding to footsteps
 *   * Dual-hand parcel suspension with vertical cushioning and inertia tilt
 *   * Ground contact shadow pulsing dynamically with foot impacts
 * - Fully accessible: displays static Frame 0 when prefers-reduced-motion is active
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
  pack_lag: number;
  pack_tilt: number;
  box_bob: number;
  box_tilt: number;
  torso_tilt: number;
}

const WALK_FRAMES: WalkFrame[] = [
  // Frame  0: Right heel contact, Left toe push-off
  { bob: 2.00, r_ax: 62.5, r_ay: 96.0, r_ang: -14.0, r_kx: 63.6, r_ky: 77.5, l_ax: 42.0, l_ay: 95.6, l_ang: 12.6, l_kx: 52.3, l_ky: 80.3, pack_lag: -0.34, pack_tilt: -0.48, box_bob: 0.81, box_tilt: 0.00, torso_tilt: 0.00 },
  // Frame  1: Right foot rolling down, Left foot lifting
  { bob: 1.73, r_ax: 60.7, r_ay: 96.0, r_ang: -9.0, r_kx: 63.6, r_ky: 77.7, l_ax: 40.7, l_ay: 95.4, l_ang: 20.6, l_kx: 51.8, l_ky: 80.6, pack_lag: -0.17, pack_tilt: -0.24, box_bob: 0.99, box_tilt: 0.40, torso_tilt: 0.18 },
  // Frame  2: Right foot reaching flat, Left knee flexing forward
  { bob: 1.00, r_ax: 58.9, r_ay: 96.0, r_ang: -3.9, r_kx: 64.0, r_ky: 78.2, l_ax: 39.5, l_ay: 95.8, l_ang: 27.5, l_kx: 51.2, l_ky: 81.4, pack_lag: 0.01, pack_tilt: 0.02, box_bob: 0.91, box_tilt: 0.69, torso_tilt: 0.35 },
  // Frame  3: Right foot flat on ground, Left leg passing under body
  { bob: 0.00, r_ax: 57.1, r_ay: 96.0, r_ang: 0.0, r_kx: 64.4, r_ky: 79.0, l_ax: 40.2, l_ay: 93.0, l_ang: 20.7, l_kx: 54.9, l_ky: 81.7, pack_lag: 0.20, pack_tilt: 0.28, box_bob: 0.59, box_tilt: 0.80, torso_tilt: 0.49 },
  // Frame  4: Right leg taking full weight, Left knee bent swinging forward
  { bob: -1.00, r_ax: 55.4, r_ay: 96.0, r_ang: 0.0, r_kx: 64.5, r_ky: 79.9, l_ax: 42.0, l_ay: 90.6, l_ang: 14.0, l_kx: 58.1, l_ky: 81.4, pack_lag: 0.36, pack_tilt: 0.52, box_bob: 0.10, box_tilt: 0.69, torso_tilt: 0.61 },
  // Frame  5: Mid-stance cushion, Left foot rising to peak clearance
  { bob: -1.73, r_ax: 53.6, r_ay: 96.0, r_ang: 0.0, r_kx: 64.2, r_ky: 80.8, l_ax: 44.6, l_ay: 88.6, l_ang: 7.2, l_kx: 61.1, l_ky: 80.2, pack_lag: 0.51, pack_tilt: 0.72, box_bob: -0.41, box_tilt: 0.40, torso_tilt: 0.68 },
  // Frame  6: Mid-stance apex, Left foot at peak clearance (y=87.4)
  { bob: -2.00, r_ax: 51.8, r_ay: 96.0, r_ang: 0.0, r_kx: 63.4, r_ky: 81.6, l_ax: 47.8, l_ay: 87.4, l_ang: 0.5, l_kx: 63.6, l_ky: 77.9, pack_lag: 0.61, pack_tilt: 0.88, box_bob: -0.81, box_tilt: 0.00, torso_tilt: 0.70 },
  // Frame  7: Right hip rolling over stance leg, Left leg extending forward
  { bob: -1.73, r_ax: 50.1, r_ay: 96.0, r_ang: 0.0, r_kx: 62.2, r_ky: 82.0, l_ax: 51.1, l_ay: 87.0, l_ang: -6.1, l_kx: 65.4, l_ky: 75.2, pack_lag: 0.68, pack_tilt: 0.97, box_bob: -0.99, box_tilt: -0.40, torso_tilt: 0.68 },
  // Frame  8: Right heel beginning to prepare lift, Left foot reaching out
  { bob: -1.00, r_ax: 48.3, r_ay: 96.0, r_ang: 0.0, r_kx: 60.5, r_ky: 82.1, l_ax: 54.5, l_ay: 87.5, l_ang: -7.7, l_kx: 66.1, l_ky: 73.1, pack_lag: 0.70, pack_tilt: 1.00, box_bob: -0.91, box_tilt: -0.69, torso_tilt: 0.61 },
  // Frame  9: Terminal stance, Left leg reaching forward for contact
  { bob: -0.00, r_ax: 46.5, r_ay: 96.0, r_ang: 0.0, r_kx: 58.4, r_ky: 81.8, l_ax: 57.6, l_ay: 88.8, l_ang: -9.2, l_kx: 66.0, l_ky: 72.3, pack_lag: 0.67, pack_tilt: 0.96, box_bob: -0.59, box_tilt: -0.80, torso_tilt: 0.49 },
  // Frame 10: Right heel lifting, Left foot descending toward floor
  { bob: 1.00, r_ax: 44.8, r_ay: 96.0, r_ang: 0.0, r_kx: 56.0, r_ky: 81.3, l_ax: 60.1, l_ay: 90.7, l_ang: -10.8, l_kx: 65.1, l_ky: 72.9, pack_lag: 0.60, pack_tilt: 0.86, box_bob: -0.10, box_tilt: -0.69, torso_tilt: 0.35 },
  // Frame 11: Right foot pushing off ball, Left heel preparing contact
  { bob: 1.73, r_ax: 43.3, r_ay: 95.9, r_ang: 4.5, r_kx: 54.0, r_ky: 80.8, l_ax: 61.9, l_ay: 93.2, l_ang: -12.4, l_kx: 63.1, l_ky: 74.8, pack_lag: 0.48, pack_tilt: 0.69, box_bob: 0.41, box_tilt: -0.40, torso_tilt: 0.18 },
  // Frame 12: Right toe push-off, Left heel contact (180° inverted phase)
  { bob: 2.00, r_ax: 42.0, r_ay: 95.6, r_ang: 12.6, r_kx: 52.6, r_ky: 80.5, l_ax: 62.5, l_ay: 96.0, l_ang: -14.0, l_kx: 59.1, l_ky: 77.8, pack_lag: 0.34, pack_tilt: 0.48, box_bob: 0.81, box_tilt: -0.00, torso_tilt: 0.00 },
  // Frame 13: Right foot lifting, Left foot rolling down
  { bob: 1.73, r_ax: 40.7, r_ay: 95.4, r_ang: 20.6, r_kx: 51.9, r_ky: 80.7, l_ax: 60.7, l_ay: 96.0, l_ang: -9.0, l_kx: 60.0, l_ky: 77.5, pack_lag: 0.17, pack_tilt: 0.24, box_bob: 0.99, box_tilt: 0.40, torso_tilt: -0.18 },
  // Frame 14: Right knee flexing forward, Left foot reaching flat
  { bob: 1.00, r_ax: 39.5, r_ay: 95.8, r_ang: 27.5, r_kx: 51.1, r_ky: 81.3, l_ax: 58.9, l_ay: 96.0, l_ang: -3.9, l_kx: 60.9, l_ky: 77.6, pack_lag: -0.01, pack_tilt: -0.02, box_bob: 0.91, box_tilt: 0.69, torso_tilt: -0.35 },
  // Frame 15: Right leg passing under body, Left foot flat on ground
  { bob: 0.00, r_ax: 40.2, r_ay: 93.0, r_ang: 20.7, r_kx: 55.4, r_ky: 82.4, l_ax: 57.1, l_ay: 96.0, l_ang: 0.0, l_kx: 61.5, l_ky: 78.0, pack_lag: -0.20, pack_tilt: -0.28, box_bob: 0.59, box_tilt: 0.80, torso_tilt: -0.49 },
  // Frame 16: Right knee bent swinging forward, Left leg taking full weight
  { bob: -1.00, r_ax: 42.0, r_ay: 90.6, r_ang: 14.0, r_kx: 58.8, r_ky: 82.7, l_ax: 55.4, l_ay: 96.0, l_ang: 0.0, l_kx: 61.9, l_ky: 78.7, pack_lag: -0.36, pack_tilt: -0.52, box_bob: 0.10, box_tilt: 0.69, torso_tilt: -0.61 },
  // Frame 17: Right foot rising to peak clearance, Left mid-stance cushion
  { bob: -1.73, r_ax: 44.6, r_ay: 88.6, r_ang: 7.2, r_kx: 62.0, r_ky: 82.2, l_ax: 53.6, l_ay: 96.0, l_ang: 0.0, l_kx: 61.9, l_ky: 79.5, pack_lag: -0.51, pack_tilt: -0.72, box_bob: -0.41, box_tilt: 0.40, torso_tilt: -0.68 },
  // Frame 18: Right foot at peak clearance (y=87.4), Left mid-stance apex
  { bob: -2.00, r_ax: 47.8, r_ay: 87.4, r_ang: 0.5, r_kx: 64.9, r_ky: 80.5, l_ax: 51.8, l_ay: 96.0, l_ang: 0.0, l_kx: 61.4, l_ky: 80.2, pack_lag: -0.61, pack_tilt: -0.88, box_bob: -0.81, box_tilt: 0.00, torso_tilt: -0.70 },
  // Frame 19: Right leg extending forward, Left hip rolling over stance leg
  { bob: -1.73, r_ax: 51.1, r_ay: 87.0, r_ang: -6.1, r_kx: 67.3, r_ky: 78.0, l_ax: 50.1, l_ay: 96.0, l_ang: 0.0, l_kx: 60.4, l_ky: 80.7, pack_lag: -0.68, pack_tilt: -0.97, box_bob: -0.99, box_tilt: -0.40, torso_tilt: -0.68 },
  // Frame 20: Right foot reaching out, Left heel beginning to prepare lift
  { bob: -1.00, r_ax: 54.5, r_ay: 87.5, r_ang: -7.7, r_kx: 68.7, r_ky: 75.6, l_ax: 48.3, l_ay: 96.0, l_ang: 0.0, l_kx: 59.0, l_ky: 80.9, pack_lag: -0.70, pack_tilt: -1.00, box_bob: -0.91, box_tilt: -0.69, torso_tilt: -0.61 },
  // Frame 21: Right leg reaching forward for contact, Left terminal stance
  { bob: -0.00, r_ax: 57.6, r_ay: 88.8, r_ang: -9.2, r_kx: 69.0, r_ky: 74.2, l_ax: 46.5, l_ay: 96.0, l_ang: 0.0, l_kx: 57.1, l_ky: 80.8, pack_lag: -0.67, pack_tilt: -0.96, box_bob: -0.59, box_tilt: -0.80, torso_tilt: -0.49 },
  // Frame 22: Right foot descending toward floor, Left heel lifting
  { bob: 1.00, r_ax: 60.1, r_ay: 90.7, r_ang: -10.8, r_kx: 68.3, r_ky: 74.1, l_ax: 44.8, l_ay: 96.0, l_ang: 0.0, l_kx: 55.1, l_ky: 80.6, pack_lag: -0.60, pack_tilt: -0.86, box_bob: -0.10, box_tilt: -0.69, torso_tilt: -0.35 },
  // Frame 23: Right heel preparing contact, Left foot pushing off ball
  { bob: 1.73, r_ax: 61.9, r_ay: 93.2, r_ang: -12.4, r_kx: 66.6, r_ky: 75.4, l_ax: 43.3, l_ay: 95.9, l_ang: 4.5, l_kx: 53.4, l_ky: 80.4, pack_lag: -0.48, pack_tilt: -0.69, box_bob: 0.41, box_tilt: -0.40, torso_tilt: -0.18 },
];

export function DeliveryBoyLoader({
  className = "",
  size = 84,
}: DeliveryBoyLoaderProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion: keep static Frame 0
    if (typeof window !== "undefined" && window.matchMedia) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) return;
    }

    let animId: number;
    let lastTime = performance.now();
    const frameDuration = 41.67; // 24 FPS (classic 2D animation cadence)

    const loop = (now: number) => {
      const delta = now - lastTime;
      if (delta >= frameDuration) {
        const advance = Math.min(Math.floor(delta / frameDuration), 4);
        setFrameIdx((prev) => (prev + advance) % 24);
        lastTime = now - (delta % frameDuration);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const f = WALK_FRAMES[frameIdx];
  const upperBodyY = -f.bob;
  const shadowScale = 1.0 + f.bob * 0.07;

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
            {/* Ground Contact Shadow Radial Gradient */}
            <radialGradient
              id="groundShadowGrad"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="#17191C" stopOpacity="0.30" />
              <stop offset="65%" stopColor="#17191C" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#17191C" stopOpacity="0" />
            </radialGradient>

            {/* Plain Black T-Shirt Fabric Gradient */}
            <linearGradient id="tshirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#252A32" />
              <stop offset="100%" stopColor="#17191C" />
            </linearGradient>

            {/* Courier Backpack Depth Gradient */}
            <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#242930" />
              <stop offset="100%" stopColor="#181B1F" />
            </linearGradient>

            {/* 3D Isometric Kraft Courier Parcel Gradients */}
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

          {/* Contact Ground Shadow (Dynamic pulse matching foot impact) */}
          <ellipse
            cx={52 + f.torso_tilt * 0.4}
            cy="100.5"
            rx={19 * shadowScale}
            ry={4 * shadowScale}
            fill="url(#groundShadowGrad)"
          />

          {/* ========================================================
              BACK LEG (LEFT LEG — DEEPER CHARCOAL #1D2126 FOR DEPTH)
              ======================================================== */}
          {/* Back Thigh */}
          <line
            x1="49.5"
            y1={64 - f.bob}
            x2={f.l_kx}
            y2={f.l_ky}
            stroke="#1D2126"
            strokeWidth="6.2"
            strokeLinecap="round"
          />
          {/* Back Calf */}
          <line
            x1={f.l_kx}
            y1={f.l_ky}
            x2={f.l_ax}
            y2={f.l_ay}
            stroke="#181B20"
            strokeWidth="5.2"
            strokeLinecap="round"
          />
          {/* Back Sneaker */}
          <g transform={`translate(${f.l_ax}, ${f.l_ay}) rotate(${f.l_ang})`}>
            {/* Sneaker Upper */}
            <path
              d="M -7 2 C -5 0 2 0 6 2 L 12 3.5 C 13 4.5 12 5 11 5 H -7 C -8 5 -8 2 -7 2 Z"
              fill="#111315"
            />
            {/* Crisp White Midsole */}
            <rect x="-8" y="5" width="20" height="1.6" rx="0.8" fill="#FFFFFF" />
            {/* Dark Sole Tread */}
            <rect x="-7.5" y="6.4" width="19" height="0.8" rx="0.4" fill="#E1E4E8" />
          </g>

          {/* ========================================================
              UPPER BODY (TORSO, HEAD, BACKPACK, PARCEL & ARMS)
              Harmonious secondary kinematics with pelvic/shoulder sway
              ======================================================== */}
          <g transform={`translate(0, ${upperBodyY}) rotate(${f.torso_tilt}, 51, 64)`}>
            {/* Ergonomic Delivery Backpack with Footstep Inertia */}
            <g transform={`translate(0, ${f.pack_lag}) rotate(${f.pack_tilt}, 32, 50)`}>
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
            </g>

            {/* Back Arm (Reaching behind to support far side of parcel) */}
            <path
              d="M48 37L61 46"
              stroke="#17191C"
              strokeWidth="4.5"
              strokeLinecap="round"
            />

            {/* Plain Black T-Shirt (STRICTLY NO text, logos, or markings) */}
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
            {/* Emerald Green Visor Piping Accent Line */}
            <path
              d="M58 15.5L63.5 15.5"
              stroke="#16A36A"
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* ========================================================
                DIMENSIONAL PARCEL BOX & ARMS (SUSPENSION DAMPENING)
                ======================================================== */}
            <g transform={`translate(0, ${f.box_bob}) rotate(${f.box_tilt}, 68, 50)`}>
              {/* 3D Isometric Kraft Cardboard Box */}
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

              {/* Front Arm (Forearm bent at elbow, supporting parcel securely) */}
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
          </g>

          {/* ========================================================
              FRONT LEG (RIGHT LEG — CHARCOAL #282D35 FOR CONTRAST)
              ======================================================== */}
          {/* Front Thigh */}
          <line
            x1="53.5"
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
            {/* Crisp White Midsole */}
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
