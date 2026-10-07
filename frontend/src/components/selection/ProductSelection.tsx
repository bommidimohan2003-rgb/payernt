import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useOriginReveal } from "@/components/navigation/OriginRevealTransition";
import { useTheme } from "@/hooks/useTheme";
import {
  Coins,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  PackagePlus,
  Package,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";

// ============================================================================
// THEME SWITCHER
// ============================================================================

/**
 * Minimal Premium Monochrome Theme Switcher
 * Fixed at the top-right corner with smooth Light / Dark / System popover menu
 */
function GatewayThemeSwitcher() {
  const { themeMode, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click & Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Current icon indicator
  const currentIcon = themeMode === "light" ? "☀" : themeMode === "dark" ? "☾" : "◐";

  return (
    <div ref={containerRef} className="fixed top-5 right-5 sm:top-6 sm:right-8 z-50 select-none">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Theme Switcher (currently ${themeMode} mode)`}
        aria-expanded={isOpen}
        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md border border-border/70 bg-background/80 hover:bg-muted/40 hover:border-foreground/30 active:scale-95 transition-all duration-150 backdrop-blur-md text-foreground/80 hover:text-foreground text-xs font-mono shadow-xs focus-visible:ring-1 focus-visible:ring-foreground/40 outline-none cursor-pointer"
      >
        <span className="text-sm sm:text-base leading-none">{currentIcon}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-1.5 w-32 py-1 bg-background/95 backdrop-blur-md border border-border/80 rounded-md shadow-md text-[11px] font-mono tracking-wider overflow-hidden z-50"
          >
            <button
              type="button"
              onClick={() => {
                setThemeMode("light");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors duration-150 hover:bg-muted/50 cursor-pointer ${themeMode === "light"
                ? "text-foreground font-semibold bg-muted/30"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">☀</span> Light
              </span>
              {themeMode === "light" && <span className="text-[10px] text-foreground">●</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setThemeMode("dark");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors duration-150 hover:bg-muted/50 cursor-pointer ${themeMode === "dark"
                ? "text-foreground font-semibold bg-muted/30"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">☾</span> Dark
              </span>
              {themeMode === "dark" && <span className="text-[10px] text-foreground">●</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setThemeMode("system");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors duration-150 hover:bg-muted/50 cursor-pointer ${themeMode === "system"
                ? "text-foreground font-semibold bg-muted/30"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">◐</span> System
              </span>
              {themeMode === "system" && <span className="text-[10px] text-foreground">●</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TYPOGRAPHY & BRAND HELPERS
// ============================================================================

/** Styled choice title with currency symbol */
function ChoiceTitle({
  name,
  className = "",
  symbolClassName = "",
}: {
  name: "paye₹nt" | "pay₹ent";
  className?: string;
  symbolClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center tracking-tight font-extrabold ${className}`}>
      {name.split("").map((char, i) => (
        <span
          key={i}
          className={
            char === "₹"
              ? `font-serif font-black mx-[0.02em] text-[0.94em] ${symbolClassName}`
              : ""
          }
        >
          {char}
        </span>
      ))}
      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground/70 ml-1 self-start -mt-0.5">
        ™
      </span>
    </span>
  );
}

/** Wordmark for paYent */
function BrandTitle({
  className = "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center tracking-tight font-extrabold font-display ${className}`}>
      paYent
      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground/70 ml-1 self-start -mt-0.5">
        ™
      </span>
    </span>
  );
}

/**
 * Clean Minimal Ambient Background (No Grids)
 */
function CinematicBackground({
  shouldReduceMotion,
}: {
  shouldReduceMotion: boolean | null;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Subtle Analog Texture (Uniform Across Canvas) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.015] dark:opacity-[0.025] mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="cinematicNoise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinematicNoise)" />
      </svg>
    </div>
  );
}

// ============================================================================
// MAIN GATEWAY PAGE COMPONENT
// ============================================================================

export function ProductSelection() {
  const navigate = useNavigate();
  const { triggerOriginTransition } = useOriginReveal();
  const shouldReduceMotion = useReducedMotion();

  // Desktop active hover state
  const [hoveredSide, setHoveredSide] = useState<"payernt" | "payrent" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mobile interactive branch state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Smooth mouse follow light (Desktop only)
  const mouseX = useMotionValue(typeof window !== "undefined" ? window.innerWidth / 2 : 500);
  const mouseY = useMotionValue(typeof window !== "undefined" ? window.innerHeight / 2 : 400);

  const springConfig = { damping: 28, stiffness: 180, mass: 0.6 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (typeof window === "undefined" || shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, shouldReduceMotion]);

  // Smooth architectural easing curve
  const smoothEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

  // Navigation handler with cinematic exit sequence
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

    // Left path "paye₹nt" -> Lender experience (/payernt)
    // Right path "pay₹ent" -> Renter experience (/payant)
    const destination = product === "payernt" ? "/payernt" : "/payant";

    setTimeout(
      () => {
        navigate({ to: destination as any });
      },
      shouldReduceMotion ? 20 : 280
    );
  };

  return (
    <div className="relative min-h-screen h-screen w-screen bg-background text-foreground flex flex-col justify-between overflow-hidden selection:bg-foreground/15 select-none transition-colors duration-200">
      <CinematicBackground shouldReduceMotion={shouldReduceMotion} />
      <GatewayThemeSwitcher />

      {/* TOP-LEFT CORNER BRAND MARK (MOBILE ONLY) */}
      <div className="fixed top-5 left-5 sm:top-6 sm:left-8 z-40 md:hidden select-none">
        <BrandTitle className="text-sm sm:text-base font-extrabold tracking-tight text-foreground" />
      </div>

      {/* DESKTOP CURSOR-FOLLOW LIGHT (SUBTLE RADIAL AMBIENT FIELD) */}
      {!shouldReduceMotion && (
        <motion.div
          className="hidden md:block fixed w-[560px] h-[560px] rounded-full pointer-events-none z-0 -translate-x-1/2 -translate-y-1/2 opacity-[0.035] dark:opacity-[0.065] blur-3xl"
          style={{
            x: smoothMouseX,
            y: smoothMouseY,
            background:
              "radial-gradient(circle, var(--color-foreground, #ffffff) 0%, transparent 70%)",
          }}
        />
      )}

      {/* ================================================================== */}
      {/* DESKTOP / LARGE-SCREEN FULL-VIEWPORT GATEWAY (>= 768px)            */}
      {/* ================================================================== */}
      <div className="hidden md:flex flex-col h-full w-full relative z-10 justify-between py-8 px-10 lg:px-16 2xl:px-24">
        {/* EDITORIAL TOP CORNER METADATA */}
        <div className="flex items-center justify-between w-full text-[10px] font-mono tracking-[0.28em] text-muted-foreground/50 uppercase shrink-0 pr-12 sm:pr-14">
          <motion.span
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: smoothEase }}
          >
            ORIGIN
          </motion.span>

          <motion.span
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: smoothEase }}
            className="tracking-[0.32em] text-muted-foreground/40"
          >
            paYent / GATEWAY
          </motion.span>

          <motion.span
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: smoothEase }}
          >
            2026
          </motion.span>
        </div>

        {/* UPPER BRANDING & CENTRAL ORIGIN */}
        <header className="flex flex-col items-center text-center shrink-0 pt-1">
          {/* Main Brand Title */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: smoothEase }}
          >
            <BrandTitle className="text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-foreground" />
          </motion.div>

          {/* Tagline 1 */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: smoothEase }}
            className="text-xs lg:text-sm font-semibold tracking-[0.36em] uppercase text-muted-foreground mt-2.5"
          >
            RENT. LEND.
          </motion.p>

          {/* Tagline 2 */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: smoothEase }}
            className="text-[11px] lg:text-xs font-normal text-muted-foreground/60 tracking-wider mt-1"
          >
            One Platform. More Possibilities.
          </motion.p>

          {/* CENTRAL ORIGIN POINT & ORBITAL SIGNAL */}
          <div className="relative flex flex-col items-center mt-6 w-full max-w-3xl pointer-events-none">
            {/* Origin Dot with Expanding Signal Ring */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.45, ease: smoothEase }}
              className="relative flex items-center justify-center"
            >
              {/* Architectural static orbit ring */}
              <div className="w-5 h-5 rounded-full border border-foreground/20 absolute" />

              {/* Periodic expanding origin signal pulse */}
              {!shouldReduceMotion && (
                <motion.div
                  animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                  transition={{
                    duration: 3.4,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="w-4 h-4 rounded-full border border-foreground/40 absolute"
                />
              )}

              {/* Center Origin Dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
            </motion.div>

            {/* Instruction Label with Subtle Extending/Retracting Line */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.55 }}
              className="flex flex-col items-center mt-2.5"
            >
              <span className="text-[9px] font-mono tracking-[0.32em] text-muted-foreground/60 uppercase">
                CHOOSE YOUR PATH
              </span>
              <motion.div
                animate={{
                  width: ["24px", "44px", "24px"],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-px bg-foreground/40 mt-1"
              />
            </motion.div>

            {/* LONG ARCHITECTURAL PATH CONNECTORS */}
            <div className="w-full h-12 relative mt-1">
              <svg
                viewBox="0 0 700 48"
                fill="none"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Default Left Branch to 01 (paye₹nt) */}
                <motion.path
                  d="M 350 0 C 350 24, 175 24, 175 48"
                  stroke="var(--color-border, #e4e4e7)"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.55, ease: smoothEase }}
                />
                {/* Active Highlight Path Left */}
                <motion.path
                  d="M 350 0 C 350 24, 175 24, 175 48"
                  stroke="var(--color-foreground, #ffffff)"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: hoveredSide === "payernt" ? 1 : 0,
                    opacity: hoveredSide === "payernt" ? 1 : 0,
                  }}
                  transition={{ duration: 0.35, ease: smoothEase }}
                />

                {/* Default Right Branch to 02 (pay₹ent) */}
                <motion.path
                  d="M 350 0 C 350 24, 525 24, 525 48"
                  stroke="var(--color-border, #e4e4e7)"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.55, ease: smoothEase }}
                />
                {/* Active Highlight Path Right */}
                <motion.path
                  d="M 350 0 C 350 24, 525 24, 525 48"
                  stroke="var(--color-foreground, #ffffff)"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: hoveredSide === "payrent" ? 1 : 0,
                    opacity: hoveredSide === "payrent" ? 1 : 0,
                  }}
                  transition={{ duration: 0.35, ease: smoothEase }}
                />

                {/* Traveling light signal dot on left hover (moves once) */}
                {hoveredSide === "payernt" && !shouldReduceMotion && (
                  <motion.circle
                    r="2.5"
                    fill="var(--color-foreground, #ffffff)"
                    initial={{ offsetDistance: "0%", opacity: 1 }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    style={{
                      offsetPath: "path('M 350 0 C 350 24, 175 24, 175 48')",
                    }}
                  />
                )}

                {/* Traveling light signal dot on right hover (moves once) */}
                {hoveredSide === "payrent" && !shouldReduceMotion && (
                  <motion.circle
                    r="2.5"
                    fill="var(--color-foreground, #ffffff)"
                    initial={{ offsetDistance: "0%", opacity: 1 }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    style={{
                      offsetPath: "path('M 350 0 C 350 24, 525 24, 525 48')",
                    }}
                  />
                )}
              </svg>
            </div>
          </div>
        </header>

        {/* TWO PATHS MAIN AREA (FULL VIEWPORT SPANNING PATHS) */}
        <main className="flex-1 flex items-stretch w-full relative -mt-1">
          {/* LEFT PATH: LENDING (paye₹nt — LENDER) */}
          <motion.button
            type="button"
            tabIndex={1}
            onClick={(e) => handleSelect("payernt", e)}
            onMouseEnter={() => setHoveredSide("payernt")}
            onMouseLeave={() => setHoveredSide(null)}
            onFocus={() => setHoveredSide("payernt")}
            onBlur={() => setHoveredSide(null)}
            aria-label="Select paye₹nt — Lender Experience"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{
              opacity: hoveredSide === "payrent" ? 0.3 : 1,
              y: 0,
            }}
            transition={{ duration: 0.5, delay: 0.65, ease: smoothEase }}
            className="group relative flex-1 flex flex-col items-center justify-center p-8 lg:p-16 text-center cursor-pointer outline-none transition-all focus-visible:ring-1 focus-visible:ring-foreground/40"
          >
            {/* Soft neutral ambient spotlight illumination behind active path */}
            <motion.div
              animate={{
                opacity: hoveredSide === "payernt" ? 0.09 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 65% 55% at 50% 50%, var(--color-foreground, #ffffff) 0%, transparent 70%)",
              }}
            />

            <motion.div
              animate={{
                scale:
                  hoveredSide === "payernt" && !shouldReduceMotion
                    ? 1.045
                    : 1,
                y: hoveredSide === "payernt" && !shouldReduceMotion ? -4 : 0,
              }}
              transition={{ duration: 0.3, ease: smoothEase }}
              className="relative z-10 flex flex-col items-center max-w-md"
            >
              {/* Category Label with Dynamic Lead Line (LENDING ─────────────) */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs lg:text-sm font-mono tracking-[0.28em] uppercase transition-colors duration-200 ${hoveredSide === "payernt"
                    ? "text-foreground font-bold"
                    : "text-muted-foreground/70"
                    }`}
                >
                  LENDING
                </span>
                <motion.div
                  animate={{
                    width: hoveredSide === "payernt" ? "32px" : "16px",
                    opacity: hoveredSide === "payernt" ? 0.9 : 0.4,
                  }}
                  transition={{ duration: 0.25 }}
                  className="h-px bg-foreground"
                />
              </div>

              {/* Dominant Large Choice Name */}
              <div className="my-3">
                <ChoiceTitle
                  name="paye₹nt"
                  className="text-5xl lg:text-7xl xl:text-8xl font-extrabold text-foreground tracking-tight"
                />
              </div>

              {/* Exact Role Label */}
              <p
                className={`text-base lg:text-xl font-bold tracking-[0.24em] uppercase transition-colors duration-200 ${hoveredSide === "payernt"
                  ? "text-foreground"
                  : "text-foreground/80"
                  }`}
              >
                LENDER
              </p>

              {/* Plain Typography Tagline with Animated Underline */}
              <div className="relative mt-6">
                <p
                  className={`text-xs lg:text-sm font-mono tracking-[0.22em] uppercase transition-colors duration-200 ${hoveredSide === "payernt"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/70"
                    }`}
                >
                  Lendmore, Earnmore
                </p>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: hoveredSide === "payernt" ? 1 : 0,
                    opacity: hoveredSide === "payernt" ? 0.85 : 0,
                  }}
                  transition={{ duration: 0.3, ease: smoothEase }}
                  className="absolute -bottom-1.5 inset-x-0 h-px bg-foreground origin-left"
                />
              </div>
            </motion.div>
          </motion.button>

          {/* CENTER THIN VERTICAL DIVIDER */}
          <div className="w-px self-stretch relative pointer-events-none">
            <div
              className="absolute inset-y-6 left-0 w-px transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0) 0%, var(--color-border, rgba(255,255,255,0.25)) 50%, rgba(255,255,255,0) 100%)",
                opacity: hoveredSide ? 0.6 : 0.35,
              }}
            />
          </div>

          {/* RIGHT PATH: RENTING (pay₹ent — RENTER) */}
          <motion.button
            type="button"
            tabIndex={2}
            onClick={(e) => handleSelect("payrent", e)}
            onMouseEnter={() => setHoveredSide("payrent")}
            onMouseLeave={() => setHoveredSide(null)}
            onFocus={() => setHoveredSide("payrent")}
            onBlur={() => setHoveredSide(null)}
            aria-label="Select pay₹ent — Renter Experience"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{
              opacity: hoveredSide === "payernt" ? 0.3 : 1,
              y: 0,
            }}
            transition={{ duration: 0.5, delay: 0.65, ease: smoothEase }}
            className="group relative flex-1 flex flex-col items-center justify-center p-8 lg:p-16 text-center cursor-pointer outline-none transition-all focus-visible:ring-1 focus-visible:ring-foreground/40"
          >
            {/* Soft neutral ambient spotlight illumination behind active path */}
            <motion.div
              animate={{
                opacity: hoveredSide === "payrent" ? 0.09 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 65% 55% at 50% 50%, var(--color-foreground, #ffffff) 0%, transparent 70%)",
              }}
            />

            <motion.div
              animate={{
                scale:
                  hoveredSide === "payrent" && !shouldReduceMotion
                    ? 1.045
                    : 1,
                y: hoveredSide === "payrent" && !shouldReduceMotion ? -4 : 0,
              }}
              transition={{ duration: 0.3, ease: smoothEase }}
              className="relative z-10 flex flex-col items-center max-w-md"
            >
              {/* Category Label with Dynamic Lead Line (RENTING ─────────────) */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs lg:text-sm font-mono tracking-[0.28em] uppercase transition-colors duration-200 ${hoveredSide === "payrent"
                    ? "text-foreground font-bold"
                    : "text-muted-foreground/70"
                    }`}
                >
                  RENTING
                </span>
                <motion.div
                  animate={{
                    width: hoveredSide === "payrent" ? "32px" : "16px",
                    opacity: hoveredSide === "payrent" ? 0.9 : 0.4,
                  }}
                  transition={{ duration: 0.25 }}
                  className="h-px bg-foreground"
                />
              </div>

              {/* Dominant Large Choice Name */}
              <div className="my-3">
                <ChoiceTitle
                  name="pay₹ent"
                  className="text-5xl lg:text-7xl xl:text-8xl font-extrabold text-foreground tracking-tight"
                />
              </div>

              {/* Exact Role Label */}
              <p
                className={`text-base lg:text-xl font-bold tracking-[0.24em] uppercase transition-colors duration-200 ${hoveredSide === "payrent"
                  ? "text-foreground"
                  : "text-foreground/80"
                  }`}
              >
                RENTER
              </p>

              {/* Plain Typography Tagline with Animated Underline */}
              <div className="relative mt-6">
                <p
                  className={`text-xs lg:text-sm font-mono tracking-[0.22em] uppercase transition-colors duration-200 ${hoveredSide === "payrent"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/70"
                    }`}
                >
                  Rentmore, Savemore
                </p>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: hoveredSide === "payrent" ? 1 : 0,
                    opacity: hoveredSide === "payrent" ? 0.85 : 0,
                  }}
                  transition={{ duration: 0.3, ease: smoothEase }}
                  className="absolute -bottom-1.5 inset-x-0 h-px bg-foreground origin-left"
                />
              </div>
            </motion.div>
          </motion.button>
        </main>

        {/* BOTTOM STATUS & CORNER METADATA */}
        <footer className="flex items-center justify-between w-full text-[10px] font-mono tracking-[0.28em] text-muted-foreground/50 uppercase shrink-0 pt-1">
          <motion.span
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            RENT • LEND
          </motion.span>
          <motion.span
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="font-semibold text-muted-foreground/70 tracking-[0.32em]"
          >
            CHOOSE YOUR PATH
          </motion.span>
          <motion.span
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            ONE PLATFORM / TWO PATHS
          </motion.span>
        </footer>
      </div>

      {/* ================================================================== */}
      {/* MOBILE / SMALL-SCREEN PARENT → TWO CHILDREN GATEWAY (< 768px)       */}
      {/* ================================================================== */}
      <div className="flex md:hidden min-h-screen h-screen w-full flex-col items-center justify-center p-4 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* INITIAL CLOSED STATE: ONLY CENTERED PARENT NODE */}
          {!isMobileOpen ? (
            <motion.div
              key="mobile-closed"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: smoothEase }}
              className="flex flex-col items-center justify-center text-center"
            >
              {/* Origin Point with subtle pulse */}
              <div className="relative flex items-center justify-center mb-3">
                {!shouldReduceMotion && (
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0.75, 0.35] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    className="w-3.5 h-3.5 rounded-full border border-foreground/35 absolute"
                  />
                )}
                <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                aria-expanded={false}
                aria-label="paYent — Tap to choose between Lender and Renter pathways"
                className="cursor-pointer outline-none select-none py-4 px-8 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/60 active:scale-95 transition-all focus-visible:ring-1 focus-visible:ring-foreground/40 backdrop-blur-md shadow-sm"
              >
                <BrandTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground" />
              </button>

              <span className="text-[9px] font-mono tracking-[0.25em] text-muted-foreground/60 uppercase mt-3">
                Tap to choose path →
              </span>
            </motion.div>
          ) : (
            /* REVEALED STATE: PARENT ON LEFT → TWO STACKED CHILDREN ON RIGHT */
            <motion.div
              key="mobile-open"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: smoothEase }}
              className="w-full flex items-center justify-center"
            >
              {/* BRANCHING CONTAINER */}
              <div className="relative flex items-center justify-between w-full max-w-[350px] sm:max-w-[410px] h-[300px]">
                {/* 1. LEFT PARENT NODE (paYent) - TAP TO CLOSE */}
                <motion.button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-expanded={true}
                  aria-label="paYent — Tap to close path selection"
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1 }
                      : { opacity: 0, x: -16 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: smoothEase }}
                  className="shrink-0 z-20 cursor-pointer outline-none select-none text-left p-3.5 sm:p-4 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/60 active:scale-95 transition-all backdrop-blur-md focus-visible:ring-1 focus-visible:ring-foreground/40 shadow-sm group"
                >
                  <BrandTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground" />
                  <div className="text-[7.5px] sm:text-[8px] font-mono tracking-widest text-muted-foreground/60 group-hover:text-foreground/80 transition-colors uppercase mt-1">
                    TAP TO CLOSE
                  </div>
                </motion.button>

                {/* 2. CENTER CURVED CONNECTOR LINES (SVG) */}
                <div
                  className="relative shrink-0 z-10 pointer-events-none"
                  style={{
                    width: "clamp(32px, 10vw, 48px)",
                    height: "280px",
                  }}
                >
                  <svg
                    viewBox="0 0 48 280"
                    fill="none"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="mobileBranchGrad"
                        x1="0%"
                        y1="50%"
                        x2="100%"
                        y2="50%"
                      >
                        <stop offset="0%" stopColor="var(--color-foreground, #ffffff)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--color-foreground, #ffffff)" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>

                    {/* Upper Curved Connector -> paye₹nt */}
                    <motion.path
                      d="M 0 140 C 22 140, 24 50, 48 50"
                      stroke="url(#mobileBranchGrad)"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      initial={shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.45, delay: 0.08, ease: smoothEase }}
                    />

                    {/* Lower Curved Connector -> pay₹ent */}
                    <motion.path
                      d="M 0 140 C 22 140, 24 230, 48 230"
                      stroke="url(#mobileBranchGrad)"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      initial={shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.45, delay: 0.12, ease: smoothEase }}
                    />

                    {/* Origin junction ring and dot */}
                    <circle cx="2" cy="140" r="3.5" stroke="var(--color-foreground, #ffffff)" strokeWidth="1" fill="none" opacity="0.8" />
                    <circle cx="2" cy="140" r="1.5" fill="var(--color-foreground, #ffffff)" />
                  </svg>
                </div>

                {/* 3. RIGHT CHILD NODES (STACKED VERTICALLY) */}
                <div
                  className="flex flex-col justify-between shrink-0 z-20"
                  style={{
                    width: "clamp(152px, 48vw, 205px)",
                    height: "280px",
                  }}
                >
                  {/* UPPER CHILD: LENDING -> paye₹nt (LENDER) */}
                  <motion.button
                    type="button"
                    tabIndex={2}
                    onClick={(e) => handleSelect("payernt", e)}
                    aria-label="Select paye₹nt — Lender Experience"
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, x: 14 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.18, ease: smoothEase }}
                    className="group cursor-pointer outline-none select-none text-left p-3.5 sm:p-4 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/60 active:scale-95 transition-all focus-visible:ring-1 focus-visible:ring-foreground/40 flex flex-col justify-between backdrop-blur-md shadow-sm"
                    style={{ minHeight: "130px" }}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-mono tracking-widest text-muted-foreground/90 uppercase flex items-center gap-1.5">
                          <Coins className="w-3 h-3 text-foreground/80" />
                          LENDING
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      <div className="mt-1">
                        <ChoiceTitle
                          name="paye₹nt"
                          className="text-base sm:text-lg font-extrabold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-1.5">
                      <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                        LENDER
                      </p>
                      <div
                        className="relative w-7 h-7 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground/90 shrink-0"
                        title="Upload Gear to Inventory"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-muted-foreground/75 mt-1">
                      LENDMORE, EARNMORE
                    </div>
                  </motion.button>

                  {/* LOWER CHILD: RENTING -> pay₹ent (RENTER) */}
                  <motion.button
                    type="button"
                    tabIndex={3}
                    onClick={(e) => handleSelect("payrent", e)}
                    aria-label="Select pay₹ent — Renter Experience"
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, x: 14 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.24, ease: smoothEase }}
                    className="group cursor-pointer outline-none select-none text-left p-3.5 sm:p-4 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/60 active:scale-95 transition-all focus-visible:ring-1 focus-visible:ring-foreground/40 flex flex-col justify-between backdrop-blur-md shadow-sm"
                    style={{ minHeight: "130px" }}
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-mono tracking-widest text-muted-foreground/90 uppercase flex items-center gap-1.5">
                          <ShoppingBag className="w-3 h-3 text-foreground/80" />
                          RENTING
                        </span>
                        <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                      </div>
                      <div className="mt-1">
                        <ChoiceTitle
                          name="pay₹ent"
                          className="text-base sm:text-lg font-extrabold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-1.5">
                      <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                        RENTER
                      </p>
                      {/* Bag with product being added indicator */}
                      <div
                        className="relative w-7 h-7 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground/90 shrink-0"
                        title="Add Product to Rental Bag"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-foreground text-background rounded-full flex items-center justify-center text-[7px] font-black leading-none">
                          +
                        </span>
                      </div>
                    </div>

                    <div className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-muted-foreground/75 mt-1">
                      RENTMORE, SAVEMORE
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Screen reader announcement for accessibility */}
      <div className="sr-only" aria-live="polite">
        paYent Gateway. Choose paye₹nt for Lender experience, or pay₹ent for Renter experience.
      </div>
    </div>
  );
}

export default ProductSelection;
