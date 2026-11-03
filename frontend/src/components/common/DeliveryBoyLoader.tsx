import React, { useState, useEffect } from "react";
import { WALK_FRAMES } from "./walkFramesData";

export interface DeliveryBoyLoaderProps {
  className?: string;
  size?: number | string;
}

/**
 * paYent AI Agent — Semi-Realistic Human Delivery Person Walking Animation
 *
 * Professional 2.5D Character Rig & Biomechanical Gait Engine:
 * - Semi-realistic young adult human anatomy & natural body proportions (not a stick figure or flat cartoon)
 * - Fitted plain black crewneck T-shirt with chest/pectoral contour and waist fabric folds
 * - Volumetric dark charcoal tailored trousers with quadriceps/hamstring curvature, patella contour, and calf muscle bulge
 * - Contemporary athletic running sneakers with sculpted white EVA midsoles, flex grooves, and outsole tread
 * - Ergonomic black ballistic nylon courier backpack with emerald green safety reflector band (#16A36A)
 * - Sturdy corrugated kraft parcel box held securely with both hands, featuring the emerald destination tag and white "P" logo
 * - Sculpted facial profile: natural jawline, chin, nose bridge, lips, almond eye, ear, and styled dark hair taper
 * - 3D curved baseball cap with stitched crown panels and radiant emerald green visor piping trim (#16A36A)
 * - 24-Frame analytical Inverse Kinematics gait cycle operating at 24 FPS (1.0s loop, 120 steps/min cadence)
 * - True 2-phase gait: flat stance foot roll (y=96.0) with heel strike (-14°) and high knee flexion (+40°) during swing phase
 * - Coordinated secondary physics: torso micro-sway, backpack shockwave lag, and dual-hand parcel suspension dampening
 * - Accessible: renders static contact pose (Frame 0) when prefers-reduced-motion is active
 */
export function DeliveryBoyLoader({
  className = "",
  size = 96,
}: DeliveryBoyLoaderProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion: maintain static contact pose
    if (typeof window !== "undefined" && window.matchMedia) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) return;
    }

    let animId: number;
    let lastTime = performance.now();
    const frameDuration = 41.67; // 24 FPS (classical character animation standard)

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
          className="w-full h-full drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ground Contact Soft Radial Shadows */}
            <radialGradient
              id="groundShadowGrad"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="#17191C" stopOpacity="0.32" />
              <stop offset="50%" stopColor="#17191C" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#17191C" stopOpacity="0" />
            </radialGradient>

            {/* Fitted Black T-Shirt Fabric Gradient (Volumetric Torso) */}
            <linearGradient id="tshirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A3038" />
              <stop offset="50%" stopColor="#1A1D22" />
              <stop offset="100%" stopColor="#121417" />
            </linearGradient>

            {/* Front Leg Trousers (Key Light Charcoal) */}
            <linearGradient id="trousersFrontGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#2E343D" />
              <stop offset="60%" stopColor="#23272F" />
              <stop offset="100%" stopColor="#191C21" />
            </linearGradient>

            {/* Back Leg Trousers (Atmospheric Depth Shadow) */}
            <linearGradient id="trousersBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C2026" />
              <stop offset="100%" stopColor="#111317" />
            </linearGradient>

            {/* Human Skin Tone Gradients (Warm Young Adult Complexion) */}
            <linearGradient id="skinGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#F5C4A3" />
              <stop offset="60%" stopColor="#E9B28F" />
              <stop offset="100%" stopColor="#D59B76" />
            </linearGradient>

            <linearGradient id="skinShadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#DE9E77" />
              <stop offset="100%" stopColor="#C4845E" />
            </linearGradient>

            {/* Dark Styled Textured Hair */}
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#262220" />
              <stop offset="100%" stopColor="#131110" />
            </linearGradient>

            {/* Ergonomic Ballistic Nylon Courier Backpack */}
            <linearGradient id="backpackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#262C34" />
              <stop offset="65%" stopColor="#171A1F" />
              <stop offset="100%" stopColor="#0E1013" />
            </linearGradient>

            {/* 3D Corrugated Kraft Parcel Box Faces */}
            <linearGradient id="boxTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DFC09E" />
              <stop offset="100%" stopColor="#D2A87E" />
            </linearGradient>
            <linearGradient id="boxFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C59868" />
              <stop offset="100%" stopColor="#AF8252" />
            </linearGradient>
            <linearGradient id="boxRightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A67848" />
              <stop offset="100%" stopColor="#8C5F32" />
            </linearGradient>

            {/* Athletic Molded Sneaker Midsole */}
            <linearGradient id="midsoleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
          </defs>

          {/* Contact Ground Shadow (Dynamic pulse matching foot impact) */}
          <ellipse
            cx={52 + f.torso_tilt * 0.4}
            cy="100.5"
            rx={20 * shadowScale}
            ry={4.2 * shadowScale}
            fill="url(#groundShadowGrad)"
          />

          {/* ========================================================
              BACK LEG (LEFT LEG — DEEPER CHARCOAL FOR VOLUMETRIC DEPTH)
              ======================================================== */}
          {/* Back Thigh Volumetric Polygon */}
          <path d={f.l_thigh} fill="url(#trousersBackGrad)" />

          {/* Back Knee Articulation Joint Shading */}
          <circle cx={f.l_kx} cy={f.l_ky} r="3.2" fill="#13161A" />

          {/* Back Calf Volumetric Polygon with Gastrocnemius Contour */}
          <path d={f.l_calf} fill="url(#trousersBackGrad)" />

          {/* Back Pant Cuff Bunched at Ankle */}
          <ellipse cx={f.l_ax} cy={f.l_ay - 1.5} rx="3.0" ry="1.6" fill="#181B20" />

          {/* Back Sneaker */}
          <g transform={`translate(${f.l_ax}, ${f.l_ay}) rotate(${f.l_ang})`}>
            {/* Sneaker Upper */}
            <path
              d="M -7 2 C -5 -0.5 2 -0.5 6 1.5 L 12 3 C 13.5 4.5 12 5.5 11 5.5 H -7 C -8.5 5.5 -8.5 2 -7 2 Z"
              fill="#111315"
            />
            {/* Collar & Tongue */}
            <path d="M -4 1.5 L -1 -0.5 L 2 1.5" stroke="#22262B" strokeWidth="0.8" />
            {/* White EVA Midsole with Running Cushion Wedge */}
            <path
              d="M -8.5 5.2 C -6 5 -2 5.2 3 5 L 12 5.2 C 12.8 5.4 12.5 7 11.5 7 H -8 C -9 7 -9 5.4 -8.5 5.2 Z"
              fill="url(#midsoleGrad)"
            />
            {/* Dark Rubber Tread Outsole */}
            <rect x="-8" y="7" width="20" height="1.0" rx="0.5" fill="#17191C" />
          </g>

          {/* ========================================================
              UPPER BODY (TORSO, HEAD, BACKPACK, PARCEL & ARMS)
              Volumetric anatomy with secondary motion physics
              ======================================================== */}
          <g transform={`translate(0, ${upperBodyY}) rotate(${f.torso_tilt}, 51, 64)`}>
            {/* Ergonomic Delivery Backpack with Footstep Inertia */}
            <g transform={`translate(0, ${f.pack_lag}) rotate(${f.pack_tilt}, 32, 50)`}>
              {/* Backpack Main Padded Body */}
              <path
                d="M 23 35 C 23 33 26 31 31 31 H 36 C 41 31 43 33 43 36 V 62 C 43 65 39 67 35 67 H 27 C 24 67 23 64 23 61 Z"
                fill="url(#backpackGrad)"
              />
              {/* Backpack Top Grab Handle */}
              <path
                d="M 29 31 C 29 28.5 37 28.5 37 31"
                stroke="#1B1E23"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Backpack Side Pocket Contour */}
              <path
                d="M 23 48 C 23 44 26 44 26 48 V 60 H 23 Z"
                fill="#121417"
              />
              {/* Backpack Main Flap Seam */}
              <path
                d="M 24 40 C 27 41 39 41 42 40"
                stroke="#2F3640"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Emerald Green Safety Reflector Stripe on Backpack */}
              <rect
                x="24"
                y="48"
                width="17"
                height="4"
                rx="1.5"
                fill="#16A36A"
              />
              {/* Reflector Internal Specular Highlight */}
              <line
                x1="26"
                y1="50"
                x2="39"
                y2="50"
                stroke="#FFFFFF"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeOpacity="0.55"
              />
              {/* Padded Shoulder Harness Strap Wrapping Over Shoulder */}
              <path
                d="M 37 34 C 41 35 44 38 45 44"
                stroke="#1B1E23"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>

            {/* Back Arm (Reaching behind to support far lower corner of parcel) */}
            <path
              d="M 47 37 L 54 44 L 62 48"
              stroke="#E9B28F"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Back Hand Supporting Box */}
            <ellipse cx="62" cy="48" rx="2.0" ry="2.2" fill="#D59B76" />

            {/* ========================================================
                FITTED BLACK T-SHIRT (VOLUMETRIC ATHLETIC HUMAN TORSO)
                ======================================================== */}
            {/* Main Torso Contour (Broad shoulders, chest contour, waist taper) */}
            <path
              d="M 42 33 C 44 32.5 58 32.5 60 33 C 62 34.5 63 37 62 39 L 57.5 64.5 C 57.5 65 43 65 43 64.5 L 39 39 C 38 37 39 34.5 42 33 Z"
              fill="url(#tshirtGrad)"
            />
            {/* Pectoral & Chest Form Shadow */}
            <path
              d="M 44 41 C 48 44 57 44 60 41"
              stroke="#121417"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
            {/* Diagonal Fabric Wrinkle Folds (Reflecting Torso Twist) */}
            <path
              d="M 42 53 C 46 55 53 54 57 52"
              stroke="#14171A"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeOpacity="0.75"
            />
            <path
              d="M 43 59 C 47 60 52 60 56 58"
              stroke="#14171A"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeOpacity="0.75"
            />
            {/* Clean Ribbed Crewneck Collar */}
            <path
              d="M 47.5 33 C 47.5 36 53.5 36 53.5 33"
              stroke="#323842"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Waistband Hem Line */}
            <line
              x1="43.5"
              y1="64.5"
              x2="57"
              y2="64.5"
              stroke="#141619"
              strokeWidth="1.2"
            />

            {/* Anatomical Neck with Sternocleidomastoid Shadow */}
            <path
              d="M 47.5 25.5 C 47.5 29 48 33 48 33 H 53 C 53 33 53.5 29 53.5 25.5 Z"
              fill="url(#skinGrad)"
            />
            {/* Throat & Jaw Shadow Contour */}
            <path
              d="M 47.5 25.5 C 48.5 28 50 29 51 29"
              stroke="url(#skinShadowGrad)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />

            {/* ========================================================
                HEAD & SEMI-REALISTIC HUMAN FACIAL PROFILE
                ======================================================== */}
            {/* Styled Dark Textured Hair (Temple fade and nape locks) */}
            <path
              d="M 43 20 C 42 16 45 13 50 12 C 55 12 58 14 58 18 C 58 21 56 22 55 22 C 54 22 53 20 50 20 C 47 20 44 22 43 20 Z"
              fill="url(#hairGrad)"
            />
            {/* Hair Sideburn Taper */}
            <path
              d="M 46 20 L 46 23 L 47.5 21 Z"
              fill="#131110"
            />

            {/* Sculpted Human Head Profile (Brow, nose bridge, lips, chin, jawline) */}
            <path
              d="M 49 14 C 54 14 57 16 57 19 C 57 19.5 58.5 20.2 59 21 C 59.5 21.8 59 22.5 58 22.8 C 58.2 23.3 58 23.8 57.5 24.2 C 57 24.8 56 25 55 25.2 C 53 25.5 49 25 47 23 C 45.5 21.5 45.5 17 49 14 Z"
              fill="url(#skinGrad)"
            />

            {/* Anatomical Ear with Helix & Lobe Profile */}
            <path
              d="M 46 19 C 45 19 44.5 20 44.5 21.5 C 44.5 23 45.5 24 46.5 24 C 47.2 24 47.5 23 47.5 21.5 C 47.5 20 47 19 46 19 Z"
              fill="url(#skinGrad)"
            />
            {/* Inner Ear Concha Shadow */}
            <path
              d="M 45.8 20.5 C 45.3 21 45.3 22 46 22.5"
              stroke="#C4845E"
              strokeWidth="0.8"
              strokeLinecap="round"
            />

            {/* Almond-Shaped Human Eye & Brow */}
            <path
              d="M 54 18 C 55 17.5 56.5 17.5 57.2 18"
              stroke="#2B2420"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            <ellipse cx="55.8" cy="19.2" rx="0.8" ry="1.0" fill="#17191C" />

            {/* Nose Profile Shading */}
            <path
              d="M 57 19 L 58.6 21 L 57.5 21.6"
              stroke="#DE9E77"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Confident Human Smile & Lip Contour */}
            <path
              d="M 56 23.2 C 56.8 23.6 57.6 23.4 58 22.8"
              stroke="#B36F49"
              strokeWidth="0.9"
              strokeLinecap="round"
            />

            {/* ========================================================
                3D STRUCTURED BASEBALL CAP WITH EMERALD VISOR PIPING
                ======================================================== */}
            {/* Cap Crown Panels (Covering upper head) */}
            <path
              d="M 43 19 C 42.5 13.5 46.5 11 51.5 11 C 57 11 59 13.5 58.5 19 C 56.5 17.5 53 17.5 51 17.5 C 47 17.5 44.5 19 43 19 Z"
              fill="#17191C"
            />
            {/* Cap Crown Stitched Seam */}
            <path
              d="M 51.5 11 C 52 13 52.5 15.5 52.5 17.5"
              stroke="#2E333C"
              strokeWidth="0.7"
            />
            {/* Top Squatchee Button */}
            <circle cx="51.5" cy="10.8" r="1.1" fill="#242932" />

            {/* 3D Curved Visor Extending Forward */}
            <path
              d="M 52 15 C 55 14.8 62 14.8 65 15.5 C 65.5 15.7 64.5 17.8 61 17.8 H 52 V 15 Z"
              fill="#17191C"
            />
            {/* Visor Top Specular Highlight */}
            <path
              d="M 54 15.3 C 57 15.2 62 15.2 64.5 15.7"
              stroke="#383F4A"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
            {/* Radiant Emerald Green Visor Piping Trim (#16A36A) */}
            <path
              d="M 58 16 L 64.5 16.2"
              stroke="#16A36A"
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* ========================================================
                3D KRAFT PARCEL BOX & ANATOMICAL FRONT ARM/HAND
                Dual-hand suspension dampening secondary physics
                ======================================================== */}
            <g transform={`translate(0, ${f.box_bob}) rotate(${f.box_tilt}, 68, 50)`}>
              {/* 3D Isometric Cardboard Box */}
              {/* Top Face (Receiving overhead skylight) */}
              <polygon
                points="56,41 71,37 84,41.5 69,45.5"
                fill="url(#boxTopGrad)"
              />
              {/* Front Face (Primary viewing face) */}
              <polygon
                points="56,41 69,45.5 69,60 56,55.5"
                fill="url(#boxFrontGrad)"
              />
              {/* Right Face (Side perspective with depth shading) */}
              <polygon
                points="69,45.5 84,41.5 84,56 69,60"
                fill="url(#boxRightGrad)"
              />

              {/* Packaging Tape Sealing Faces */}
              <polygon
                points="61,42.5 65,43.7 65,58.5 61,57.2"
                fill="#E8CBA3"
              />
              <polygon
                points="75,44 79,42.8 79,57.2 75,58.5"
                fill="#D8BB95"
              />

              {/* paYent Emerald Delivery Destination Tag (#16A36A) */}
              <g transform="translate(70, 48)">
                <rect
                  x="0"
                  y="0"
                  width="8.5"
                  height="6"
                  rx="1.2"
                  fill="#16A36A"
                />
                {/* Stylized White 'P' Brand Symbol */}
                <path
                  d="M 2.4 1.4 H 5.2 C 6.2 1.4 6.8 2.0 6.8 2.8 C 6.8 3.6 6.2 4.2 5.2 4.2 H 3.4 V 5.0 H 2.4 Z M 3.4 2.2 V 3.4 H 5.0 C 5.5 3.4 5.8 3.1 5.8 2.8 C 5.8 2.5 5.5 2.2 5.0 2.2 Z"
                  fill="#FFFFFF"
                />
              </g>

              {/* Fragile Transit Stamp on Box */}
              <path
                d="M 58 48 L 60 46 L 60 52 M 60 46 L 62 48"
                stroke="#A87140"
                strokeWidth="0.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* ========================================================
                  ANATOMICAL FRONT ARM (BICEP, FOREARM & DETAILED HAND)
                  ======================================================== */}
              {/* Short Sleeve T-Shirt Cuff on Bicep */}
              <path
                d="M 45 35 L 50 34.5 L 53 42 L 48 43.5 Z"
                fill="url(#tshirtGrad)"
              />
              {/* Sleeve Hem Ring */}
              <ellipse cx="50.5" cy="42.5" rx="3.0" ry="1.2" fill="#14171A" />

              {/* Muscular Forearm (Brachioradialis & flexor muscles) */}
              <path
                d="M 50 42 C 53 43 57 46 68 45.5 L 68 49 C 58 49.5 52 48 48 43 Z"
                fill="url(#skinGrad)"
              />
              {/* Forearm Form Shading */}
              <path
                d="M 51 43 C 55 45 61 46.5 67 46"
                stroke="url(#skinShadowGrad)"
                strokeWidth="0.8"
              />

              {/* Detailed Anatomical Human Hand Gripping Parcel Edge */}
              <g transform="translate(67, 44)">
                {/* Palm Base & Thumb Resting on Top Edge */}
                <ellipse cx="1.5" cy="1.2" rx="1.8" ry="1.4" fill="#F5C4A3" />
                <path
                  d="M 0.5 0.2 C 1.5 -0.5 3.0 -0.5 3.8 0.5"
                  stroke="#DE9E77"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />

                {/* Index Finger Gripping Box Face */}
                <rect x="1.5" y="1.2" width="2.8" height="1.4" rx="0.7" fill="#F5C4A3" />
                {/* Middle Finger */}
                <rect x="1.4" y="2.7" width="2.9" height="1.4" rx="0.7" fill="#E9B28F" />
                {/* Ring Finger */}
                <rect x="1.3" y="4.2" width="2.8" height="1.4" rx="0.7" fill="#E9B28F" />
                {/* Pinky Finger */}
                <rect x="1.2" y="5.7" width="2.6" height="1.3" rx="0.65" fill="#D59B76" />

                {/* Knuckle Highlights */}
                <circle cx="1.6" cy="1.9" r="0.4" fill="#FFFFFF" fillOpacity="0.4" />
                <circle cx="1.5" cy="3.4" r="0.4" fill="#FFFFFF" fillOpacity="0.4" />
              </g>
            </g>
          </g>

          {/* ========================================================
              FRONT LEG (RIGHT LEG — VOLUMETRIC KEY-LIGHT CHARCOAL)
              ======================================================== */}
          {/* Front Thigh Volumetric Polygon */}
          <path d={f.r_thigh} fill="url(#trousersFrontGrad)" />

          {/* Front Knee Joint Structure (Patella Contour & Creases) */}
          <ellipse
            cx={f.r_kx}
            cy={f.r_ky}
            rx="3.6"
            ry="3.8"
            fill="#2A3038"
          />
          {/* Dynamic Knee Crease Folds */}
          <path
            d={`M ${f.r_kx - 2.5} ${f.r_ky - 2} C ${f.r_kx} ${f.r_ky - 1} ${f.r_kx + 2.5} ${f.r_ky - 2}`}
            stroke="#16181C"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <path
            d={`M ${f.r_kx - 2.2} ${f.r_ky + 2.5} C ${f.r_kx} ${f.r_ky + 1.5} ${f.r_kx + 2.2} ${f.r_ky + 2.5}`}
            stroke="#16181C"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Front Calf Volumetric Polygon with Gastrocnemius Contour */}
          <path d={f.r_calf} fill="url(#trousersFrontGrad)" />

          {/* Front Pant Cuff Bunched at Ankle */}
          <ellipse cx={f.r_ax} cy={f.r_ay - 1.5} rx="3.2" ry="1.8" fill="#242930" />

          {/* Front Sneaker */}
          <g transform={`translate(${f.r_ax}, ${f.r_ay}) rotate(${f.r_ang})`}>
            {/* Sneaker Upper */}
            <path
              d="M -7 2 C -5 -0.5 2 -0.5 6 1.5 L 12 3 C 13.5 4.5 12 5.5 11 5.5 H -7 C -8.5 5.5 -8.5 2 -7 2 Z"
              fill="#14171A"
            />
            {/* Lacing Eyelets & Tongue */}
            <path d="M -4 1.5 L -1 -0.5 L 2 1.5" stroke="#2D333B" strokeWidth="0.8" />
            <circle cx="1" cy="1.2" r="0.6" fill="#FFFFFF" fillOpacity="0.6" />
            <circle cx="4" cy="2.2" r="0.6" fill="#FFFFFF" fillOpacity="0.6" />

            {/* Crisp Molded White EVA Midsole with Running Cushion Wedge */}
            <path
              d="M -8.5 5.2 C -6 5 -2 5.2 3 5 L 12 5.2 C 12.8 5.4 12.5 7 11.5 7 H -8 C -9 7 -9 5.4 -8.5 5.2 Z"
              fill="url(#midsoleGrad)"
            />
            {/* Midsole Flex Grooves */}
            <line x1="2" y1="5.4" x2="2" y2="6.6" stroke="#CBD5E1" strokeWidth="0.6" />
            <line x1="6" y1="5.4" x2="6" y2="6.6" stroke="#CBD5E1" strokeWidth="0.6" />

            {/* Dark Rubber Tread Outsole */}
            <rect x="-8" y="7" width="20" height="1.0" rx="0.5" fill="#17191C" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default DeliveryBoyLoader;
