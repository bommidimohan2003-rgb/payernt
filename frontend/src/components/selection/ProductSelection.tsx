import React, { useState, useEffect } from "react";
import {
  motion,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "@/hooks/useTheme";
import {
  Coins,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  PackagePlus,
  Sun,
  Moon,
} from "lucide-react";

// ============================================================================
// THEME SWITCHER
// ============================================================================

/**
 * Minimal Premium Monochrome Theme Switcher
 * Fixed at the top-right corner with smooth Light / Dark / System popover menu
 */
function GatewayTopNav() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-8 z-50 select-none flex items-center gap-2 sm:gap-3">
      {/* Theme Toggle Button matching Payent Theme (Circular outline) */}
      {mounted && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle Color Theme"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 bg-background/80 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.75]" />
          ) : (
            <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.75]" />
          )}
        </button>
      )}
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
 * Clean Minimal Canvas Backdrop (Zero Noise Filters)
 */
function GatewayBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none"
    />
  );
}

// ============================================================================
// MAIN GATEWAY PAGE COMPONENT
// ============================================================================

export function ProductSelection() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Desktop active hover state
  const [hoveredSide, setHoveredSide] = useState<"payernt" | "payrent" | null>(null);

  // Mobile interactive branch state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Smooth architectural easing curve
  const smoothEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

  // Navigation handler
  const handleSelect = (
    product: "payernt" | "payrent",
    _e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Left path "paye₹nt" -> Lender experience (/payernt)
    // Right path "pay₹ent" -> Renter experience (/payant)
    const destination = product === "payernt" ? "/payernt" : "/payant";
    navigate({ to: destination as any });
  };

  return (
    <div className="relative min-h-[100dvh] h-[100dvh] w-full bg-background text-foreground flex flex-col justify-between overflow-hidden selection:bg-foreground/15 select-none transition-colors duration-200">
      <GatewayBackdrop />
      <GatewayTopNav />

      {/* TOP-LEFT CORNER BRAND MARK (MOBILE ONLY) */}
      <div className="fixed top-5 left-5 sm:top-6 sm:left-8 z-40 md:hidden select-none">
        <BrandTitle className="text-sm sm:text-base font-extrabold tracking-tight text-foreground" />
      </div>

      {/* ================================================================== */}
      {/* DESKTOP / LARGE-SCREEN FULL-VIEWPORT GATEWAY (>= 768px)            */}
      {/* ================================================================== */}
      <div className="hidden md:flex flex-col h-full w-full relative z-10 justify-center py-10 px-10 lg:px-16 2xl:px-24">
        {/* UPPER BRANDING & CENTRAL ORIGIN */}
        <header className="flex flex-col items-center text-center shrink-0 pt-2">
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
            className="text-sm lg:text-base font-medium tracking-wide text-muted-foreground mt-2.5"
          >
            Rent &amp; Lend
          </motion.p>

          {/* Tagline 2 */}
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: smoothEase }}
            className="text-xs lg:text-sm font-normal text-muted-foreground/80 mt-1"
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
              <span className="text-xs font-medium text-muted-foreground/80">
                Choose your experience
              </span>
              <motion.div
                animate={{
                  width: ["24px", "44px", "24px"],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-px bg-foreground/40 mt-1.5"
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
            className="group relative flex-1 flex flex-col items-center justify-center p-8 lg:p-16 text-center cursor-pointer outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-foreground/50"
          >
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
              {/* Category Label with Dynamic Lead Line */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs lg:text-sm font-medium tracking-wide transition-colors duration-200 ${hoveredSide === "payernt"
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground/80"
                    }`}
                >
                  Lending
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
                className={`text-base lg:text-xl font-semibold tracking-wide transition-colors duration-200 ${hoveredSide === "payernt"
                  ? "text-foreground"
                  : "text-foreground/85"
                  }`}
              >
                Lender
              </p>

              {/* Plain Typography Tagline with Animated Underline */}
              <div className="relative mt-5">
                <p
                  className={`text-xs lg:text-sm font-normal transition-colors duration-200 ${hoveredSide === "payernt"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/80"
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
            className="group relative flex-1 flex flex-col items-center justify-center p-8 lg:p-16 text-center cursor-pointer outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-foreground/50"
          >
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
              {/* Category Label with Dynamic Lead Line */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs lg:text-sm font-medium tracking-wide transition-colors duration-200 ${hoveredSide === "payrent"
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground/80"
                    }`}
                >
                  Renting
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
                className={`text-base lg:text-xl font-semibold tracking-wide transition-colors duration-200 ${hoveredSide === "payrent"
                  ? "text-foreground"
                  : "text-foreground/85"
                  }`}
              >
                Renter
              </p>

              {/* Plain Typography Tagline with Animated Underline */}
              <div className="relative mt-5">
                <p
                  className={`text-xs lg:text-sm font-normal transition-colors duration-200 ${hoveredSide === "payrent"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/80"
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
      </div>

      {/* ================================================================== */}
      {/* MOBILE / SMALL-SCREEN PARENT → TWO CHILDREN GATEWAY (< 768px)       */}
      {/* ================================================================== */}
      <div className="flex md:hidden min-h-[100dvh] h-[100dvh] w-full flex-col items-center justify-center p-3 sm:p-4 relative z-10 overflow-hidden">
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
                className="cursor-pointer outline-none select-none py-4 px-8 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/60 transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 backdrop-blur-md shadow-sm"
              >
                <BrandTitle className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground" />
              </button>

              <span className="text-xs font-medium text-muted-foreground/80 mt-3">
                Tap to choose path
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
              className="w-full flex items-center justify-center px-1"
            >
              {/* BRANCHING CONTAINER: Exact alignment between parent node, connector tree, and child cards */}
              <div className="relative flex items-center justify-center w-full max-w-[340px] xs:max-w-[365px] sm:max-w-[400px] h-[212px]">
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
                  className="shrink-0 flex-none self-center my-auto z-20 cursor-pointer outline-none select-none text-left p-2 sm:p-2.5 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/80 transition-colors backdrop-blur-md focus-visible:ring-2 focus-visible:ring-foreground/50 shadow-xs group -mr-[1px]"
                >
                  <BrandTitle className="text-base xs:text-lg font-extrabold tracking-tight text-foreground" />
                  <div className="text-[10px] font-medium text-muted-foreground/80 group-hover:text-foreground/90 transition-colors mt-0.5">
                    Tap to close
                  </div>
                </motion.button>

                {/* 2. CENTER CURLY BRACES CONNECTOR (SVG) - Perfectly connects vertical middle of paYent to middle of both child cards */}
                <div
                  className="relative shrink-0 flex-none z-10 pointer-events-none w-7 xs:w-8 sm:w-10 h-[212px] overflow-visible"
                >
                  <svg
                    viewBox="0 0 32 212"
                    fill="none"
                    className="w-full h-full overflow-visible"
                    style={{ width: "100%", height: "212px" }}
                    preserveAspectRatio="none"
                  >
                    {/* Upper Curly Branch -> connects middle of paYent (0, 106) to middle of paye₹nt LENDER card (33, 50) */}
                    <motion.path
                      d="M 0 106 C 8 106, 14 90, 14 74 C 14 58, 20 50, 33 50"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground/80 dark:text-foreground/85"
                      initial={shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.32, delay: 0.06, ease: smoothEase }}
                    />

                    {/* Lower Curly Branch -> connects middle of paYent (0, 106) to middle of pay₹ent RENTER card (33, 162) */}
                    <motion.path
                      d="M 0 106 C 8 106, 14 122, 14 138 C 14 154, 20 162, 33 162"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-foreground/80 dark:text-foreground/85"
                      initial={shouldReduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.32, delay: 0.08, ease: smoothEase }}
                    />
                  </svg>
                </div>

                {/* 3. RIGHT CHILD NODES (STACKED VERTICALLY - REDUCED COMPACT SIZING) */}
                <div
                  className="flex flex-col justify-between shrink-0 flex-none z-20 w-[140px] xs:w-[155px] sm:w-[170px] h-[212px]"
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
                    className="group cursor-pointer outline-none select-none text-left p-2 xs:p-2.5 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/80 transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 flex flex-col justify-between backdrop-blur-md shadow-xs h-[100px] min-h-[100px] max-h-[100px] flex-none"
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <Coins className="w-2.5 h-2.5 text-foreground/80 stroke-[1.75]" />
                          Lending
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-colors stroke-[1.75]" />
                      </div>
                      <div className="mt-0.5">
                        <ChoiceTitle
                          name="paye₹nt"
                          className="text-sm xs:text-[15px] font-extrabold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-0.5">
                      <p className="text-[11px] xs:text-xs font-semibold text-foreground">
                        Lender
                      </p>
                      <div
                        className="relative w-6 h-6 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground/90 shrink-0"
                        title="Upload Gear to Inventory"
                      >
                        <PackagePlus className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground/80">
                      Lendmore, Earnmore
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
                    className="group cursor-pointer outline-none select-none text-left p-2 xs:p-2.5 border border-border/80 hover:border-foreground/60 rounded-2xl bg-card/80 transition-colors focus-visible:ring-2 focus-visible:ring-foreground/50 flex flex-col justify-between backdrop-blur-md shadow-xs h-[100px] min-h-[100px] max-h-[100px] flex-none"
                  >
                    <div>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <ShoppingBag className="w-2.5 h-2.5 text-foreground/80 stroke-[1.75]" />
                          Renting
                        </span>
                        <ArrowDownRight className="w-3 h-3 text-muted-foreground/60 group-hover:text-foreground transition-colors stroke-[1.75]" />
                      </div>
                      <div className="mt-0.5">
                        <ChoiceTitle
                          name="pay₹ent"
                          className="text-sm xs:text-[15px] font-extrabold text-foreground"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full mt-0.5">
                      <p className="text-[11px] xs:text-xs font-semibold text-foreground">
                        Renter
                      </p>
                      {/* Bag with product being added indicator */}
                      <div
                        className="relative w-6 h-6 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground/90 shrink-0"
                        title="Add Product to Rental Bag"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-foreground text-background rounded-full flex items-center justify-center text-[6px] font-black leading-none">
                          +
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground/80">
                      Rentmore, Savemore
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
