import React, { useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useOriginReveal } from "@/components/navigation/OriginRevealTransition";

// ============================================================================
// CUSTOM MONOCHROME ICONS (MATCHING REFERENCE IMAGE)
// ============================================================================

/** Minimal storefront / marketplace icon for paye₹nt */
function StorefrontIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Roof / Awning */}
      <path d="M8 20L11.5 8H36.5L40 20" />
      <path d="M8 20C8 22.2 9.8 24 12 24C14.2 24 16 22.2 16 20C16 22.2 17.8 24 20 24C22.2 24 24 22.2 24 20C24 22.2 25.8 24 28 24C30.2 24 32 22.2 32 20C32 22.2 33.8 24 36 24C38.2 24 40 22.2 40 20" />
      {/* Store Walls & Door */}
      <path d="M10 24V40H38V24" />
      <rect x="19" y="28" width="10" height="12" rx="1" />
    </svg>
  );
}

/** Minimal shopping cart / trolley icon for pay₹ent */
function ShoppingCartIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Trolley Basket */}
      <path d="M8 10H14L18.5 32H38L42 16H16" />
      {/* Left & Right Wheels */}
      <circle cx="20" cy="39" r="3" />
      <circle cx="36" cy="39" r="3" />
    </svg>
  );
}

/** Subtle ambient curved light wave graphics in background */
function AmbientLightWaves() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-40">
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-100 520C220 540 380 380 640 460C900 540 1100 360 1540 480"
          stroke="url(#silverWave1)"
          strokeWidth="1.2"
          strokeDasharray="6 3"
          opacity="0.3"
        />
        <path
          d="M-120 480C180 500 420 340 720 420C1020 500 1200 320 1560 440"
          stroke="url(#silverWave2)"
          strokeWidth="1.8"
          opacity="0.2"
        />
        <path
          d="M-80 560C260 580 460 420 760 500C1060 580 1260 400 1520 520"
          stroke="url(#silverWave1)"
          strokeWidth="1"
          opacity="0.15"
        />
        <defs>
          <linearGradient id="silverWave1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="silverWave2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ============================================================================
// GATEWAY CARD COMPONENT
// ============================================================================

interface GatewayCardProps {
  id: "payernt" | "payrent";
  title: string;
  subtitle: string;
  bottomTagline: string;
  icon: React.ReactNode;
  isHovered: boolean;
  isOtherHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  tabIndex: number;
}

function GatewayCard({
  title,
  subtitle,
  bottomTagline,
  icon,
  isHovered,
  isOtherHovered,
  onHoverStart,
  onHoverEnd,
  onClick,
  tabIndex,
}: GatewayCardProps) {
  const shouldReduceMotion = useReducedMotion();

  // Split title to style currency symbol ₹ specially if present
  const renderStyledTitle = () => {
    return (
      <span className="inline-flex items-center tracking-tight text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
        {title.split("").map((char, i) => (
          <span
            key={i}
            className={
              char === "₹"
                ? "font-serif font-black mx-[0.03em] text-[0.98em] text-white"
                : ""
            }
          >
            {char}
          </span>
        ))}
        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 ml-1.5 self-start -mt-0.5">
          ™
        </span>
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center group/card">
      {/* 1. FLOATING GLASS PANEL BUTTON */}
      <motion.button
        type="button"
        tabIndex={tabIndex}
        onClick={onClick}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        onFocus={onHoverStart}
        onBlur={onHoverEnd}
        aria-label={`Enter ${title} - ${subtitle}`}
        whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
        animate={{
          y: isHovered && !shouldReduceMotion ? -4 : 0,
          opacity: isOtherHovered ? 0.6 : 1,
          borderColor: isHovered
            ? "rgba(255, 255, 255, 0.42)"
            : "rgba(255, 255, 255, 0.16)",
          boxShadow: isHovered
            ? "0 20px 40px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 255, 255, 0.08)"
            : "0 10px 30px -10px rgba(0, 0, 0, 0.8)",
        }}
        transition={{
          duration: 0.28,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative flex items-center justify-between cursor-pointer outline-none select-none text-left rounded-3xl p-5 sm:p-7 md:p-8 backdrop-blur-2xl transition-all focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-4 focus-visible:ring-offset-black z-20"
        style={{
          width: "clamp(290px, 42vw, 440px)",
          minHeight: "clamp(150px, 18vw, 190px)",
          backgroundColor: isHovered
            ? "rgba(22, 22, 24, 0.82)"
            : "rgba(14, 14, 16, 0.72)",
          borderWidth: "1px",
        }}
      >
        {/* Subtle Top Glass Reflection Highlight */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-60"
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.01) 40%, rgba(0, 0, 0, 0.2) 100%)",
          }}
        />

        {/* Card Content: Icon + Titles */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center flex-1 pr-2">
          {/* Top Monochrome Icon */}
          <div className="text-white mb-3 transition-transform duration-300 group-hover/card:scale-105">
            {icon}
          </div>

          {/* Brand Name Title */}
          <div>{renderStyledTitle()}</div>

          {/* Subtitle / Role Description */}
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide mt-1.5 transition-colors group-hover/card:text-slate-300">
            {subtitle}
          </p>
        </div>

        {/* Right Circular Arrow Button */}
        <div className="relative z-10 shrink-0">
          <motion.div
            animate={{
              x: isHovered && !shouldReduceMotion ? 3 : 0,
              backgroundColor: isHovered
                ? "rgba(255, 255, 255, 0.22)"
                : "rgba(255, 255, 255, 0.08)",
              borderColor: isHovered
                ? "rgba(255, 255, 255, 0.45)"
                : "rgba(255, 255, 255, 0.18)",
            }}
            transition={{ duration: 0.25 }}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center text-white shadow-inner"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </motion.div>
        </div>
      </motion.button>

      {/* 2. SLENDER REFLECTIVE PEDESTAL PLATFORM BASE */}
      <div className="relative -mt-3.5 z-10 flex flex-col items-center pointer-events-none select-none">
        {/* Pedestal Top Edge */}
        <div
          className="rounded-full opacity-70 transition-opacity duration-300"
          style={{
            width: "clamp(260px, 38vw, 400px)",
            height: "14px",
            background:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.18) 50%, rgba(0,0,0,0) 100%)",
            filter: "blur(1px)",
          }}
        />

        {/* Pedestal Cylindrical Rim */}
        <div
          className="rounded-2xl border border-white/10"
          style={{
            width: "clamp(270px, 40vw, 410px)",
            height: "26px",
            background:
              "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
            boxShadow:
              "0 15px 25px -5px rgba(0, 0, 0, 0.95), inset 0 1px 1px rgba(255, 255, 255, 0.2)",
          }}
        />

        {/* Floor Rim Glow */}
        <div
          className="rounded-full transition-opacity duration-300"
          style={{
            width: "clamp(290px, 44vw, 440px)",
            height: "8px",
            marginTop: "-2px",
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)",
            opacity: isHovered ? 0.7 : 0.35,
          }}
        />
      </div>

      {/* 3. SUPPORTING TAGLINE (PLAIN TEXT UNDERNEATH — NOT A BUTTON) */}
      <div className="mt-4 sm:mt-5 text-center select-none">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm">
          <span className="text-[10px] sm:text-[11px] md:text-xs font-mono font-medium tracking-[0.18em] text-slate-300 uppercase">
            {bottomTagline}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN GATEWAY PAGE COMPONENT
// ============================================================================

export function ProductSelection() {
  const navigate = useNavigate();
  const { triggerOriginTransition } = useOriginReveal();
  const [hoveredProduct, setHoveredProduct] = useState<"payernt" | "payrent" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Navigation Trigger Handler
  const handleSelect = (
    product: "payernt" | "payrent",
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const targetPayload = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };

    triggerOriginTransition(product, targetPayload);

    // Left card "paye₹nt" -> Lender/Vendor portal (/payernt)
    // Right card "pay₹ent" -> Renter Marketplace (/payant)
    const destination = product === "payernt" ? "/payernt" : "/payant";

    setTimeout(
      () => {
        navigate({ to: destination as any });
      },
      shouldReduceMotion ? 20 : 250
    );
  };

  // Subtle Easing Curve for Apple-Grade Flow
  const smoothEase = [0.16, 1, 0.3, 1];

  return (
    <div className="relative min-h-screen w-full bg-[#000000] text-white flex flex-col justify-between overflow-x-hidden overflow-y-auto selection:bg-white/20 select-none">
      {/* 1. CINEMATIC BACKGROUND LIGHTING & ATMOSPHERE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Soft Radial Spotlight from Top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 50% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 80%)",
          }}
        />

        {/* Ambient Flowing Light Waves (Reference Graphic) */}
        <AmbientLightWaves />

        {/* Subtle Dark Reflective Floor Shadow at Bottom */}
        <div
          className="absolute bottom-0 inset-x-0 h-64 pointer-events-none"
          style={{
            background:
              "linear-gradient(0deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0) 100%)",
          }}
        />
      </div>

      {/* 2. AMBIENT PRODUCT SHOWCASE IMAGERY IN BACKGROUND (LEFT & RIGHT) */}
      {/* LEFT SIDE: LENDER GEAR (Camera, Laptop, Armchair, Tools, Studio Mics) */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -25 }}
        animate={{ opacity: 0.35, x: 0 }}
        transition={{ duration: 1.2, delay: 0.6, ease: smoothEase }}
        className="hidden xl:block absolute left-4 2xl:left-12 top-1/2 -translate-y-1/2 pointer-events-none z-0 select-none max-w-xs xl:max-w-sm 2xl:max-w-md filter grayscale brightness-75 contrast-125 opacity-35"
      >
        <div className="relative space-y-4">
          <img
            src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=70"
            alt=""
            className="w-44 2xl:w-56 rounded-2xl object-cover shadow-2xl opacity-60 ml-8 -rotate-6 border border-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=70"
            alt=""
            className="w-40 2xl:w-48 rounded-2xl object-cover shadow-2xl opacity-70 -mt-8 rotate-3 border border-white/10"
          />
        </div>
      </motion.div>

      {/* RIGHT SIDE: RENTER GEAR (Car, Mountain Bike, Camping Tent, Gaming Rig) */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 25 }}
        animate={{ opacity: 0.35, x: 0 }}
        transition={{ duration: 1.2, delay: 0.6, ease: smoothEase }}
        className="hidden xl:block absolute right-4 2xl:right-12 top-1/2 -translate-y-1/2 pointer-events-none z-0 select-none max-w-xs xl:max-w-sm 2xl:max-w-md filter grayscale brightness-75 contrast-125 opacity-35 text-right"
      >
        <div className="relative space-y-4 flex flex-col items-end">
          <img
            src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=70"
            alt=""
            className="w-48 2xl:w-64 rounded-2xl object-cover shadow-2xl opacity-60 mr-4 rotate-6 border border-white/10"
          />
          <img
            src="https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=400&q=70"
            alt=""
            className="w-40 2xl:w-48 rounded-2xl object-cover shadow-2xl opacity-70 -mt-6 -rotate-3 border border-white/10"
          />
        </div>
      </motion.div>

      {/* 3. MAIN CENTERPIECE: BRAND HEADER + 2 GATEWAY CARDS */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 md:py-16 max-w-7xl mx-auto w-full">
        {/* ============================================================ */}
        {/* UPPER-CENTER BRANDING HEADER */}
        {/* ============================================================ */}
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          {/* Brand Title with Custom Styled Leaf Emblem */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: smoothEase }}
            className="inline-flex items-center justify-center relative"
          >
            <div className="relative inline-block">
              {/* Leaf Accent over the letter Y */}
              <div
                className="absolute left-[44%] -top-3.5 sm:-top-5 transform -translate-x-1/2 pointer-events-none"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400 opacity-90 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17 3.5c-4.4 0-8 3.6-8 8 0 1.2.3 2.4.8 3.5C7.2 16.5 5 19.3 5 22.5h2c0-2.8 1.8-5.2 4.4-6.1 1.1.4 2.4.6 3.6.6 4.4 0 8-3.6 8-8 0-4.9-2.7-5.5-6-5.5zm0 10.5c-2.8 0-5-2.2-5-5 0-1.7.9-3.2 2.2-4.1.4 1.8 1.9 3.2 3.8 3.6-.5 3.1-1 5.5-1 5.5z" />
                </svg>
              </div>

              {/* Main paYent Wordmark */}
              <span className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white inline-block">
                paYent
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400 align-super ml-1">
                ™
              </span>
            </div>
          </motion.div>

          {/* Subtitle: Rent. Lend. Empower. */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: smoothEase }}
            className="text-xs sm:text-sm md:text-base font-semibold tracking-[0.24em] uppercase text-slate-300 mt-2.5 sm:mt-3"
          >
            Rent. Lend. Empower.
          </motion.p>

          {/* Platform Statement: One Platform. More Possibilities. */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75, ease: smoothEase }}
            className="text-xs sm:text-sm font-normal text-slate-400 tracking-wide mt-2"
          >
            One Platform. More Possibilities.
          </motion.p>
        </div>

        {/* ============================================================ */}
        {/* TWO GATEWAY CARDS (EXACTLY TWO — NO "OR" SEPARATOR) */}
        {/* ============================================================ */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.95, ease: smoothEase }}
          className="flex flex-col md:flex-row items-center justify-center gap-10 sm:gap-12 md:gap-14 lg:gap-20 w-full max-w-5xl mx-auto"
        >
          {/* CARD 1: paye₹nt (Owner / Vendor / Lender) */}
          <GatewayCard
            id="payernt"
            title="paye₹nt"
            subtitle="Owner / Vendor / Lender"
            bottomTagline="Lendmore, Earnmore"
            icon={<StorefrontIcon className="w-8 h-8 sm:w-10 sm:h-10" />}
            isHovered={hoveredProduct === "payernt"}
            isOtherHovered={hoveredProduct === "payrent"}
            onHoverStart={() => setHoveredProduct("payernt")}
            onHoverEnd={() => setHoveredProduct(null)}
            onClick={(e) => handleSelect("payernt", e)}
            tabIndex={1}
          />

          {/* CARD 2: pay₹ent (Renter / Customer) */}
          <GatewayCard
            id="payrent"
            title="pay₹ent"
            subtitle="Renter / Customer"
            bottomTagline="Rentmore, Savemore"
            icon={<ShoppingCartIcon className="w-8 h-8 sm:w-10 sm:h-10" />}
            isHovered={hoveredProduct === "payrent"}
            isOtherHovered={hoveredProduct === "payernt"}
            onHoverStart={() => setHoveredProduct("payrent")}
            onHoverEnd={() => setHoveredProduct(null)}
            onClick={(e) => handleSelect("payrent", e)}
            tabIndex={2}
          />
        </motion.div>
      </div>

      {/* Screen Reader Announcement */}
      <div className="sr-only" aria-live="polite">
        Welcome to paYent. Choose paye₹nt for equipment lending or pay₹ent for gear rental.
      </div>
    </div>
  );
}

export default ProductSelection;
