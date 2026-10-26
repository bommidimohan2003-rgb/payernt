import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface AppPreloaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

type PreloaderPhase =
  | "top-left-p-hold"   // (1) 0.00s - 1.80s: "P" sitting in top-left corner on black background
  | "top-left-p-up"     // (2) 1.80s - 2.50s: Top-left "P" moves smoothly upward and exits
  | "center-typing"     // (3) 2.50s - 4.10s: "PAYENT" types letter-by-letter in center with glowing cursor
  | "center-hold"       // (4) 4.10s - 4.70s: Complete "PAYENT" glows in center and holds
  | "move-left-landing" // (5) 4.70s - 5.80s: "PAYENT" moves horizontally LEFT to navbar & home page lands
  | "complete";         // (6) 6.00s+: Preloader unmounts, permanent logo remains on the left

const LETTERS = ["P", "A", "Y", "E", "N", "T"];

export function AppPreloader({
  onComplete,
  forceShow = false,
}: AppPreloaderProps) {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<PreloaderPhase>("top-left-p-hold");
  const [typedCount, setTypedCount] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  // Target coordinates for permanent navbar brand logo
  const [navTarget, setNavTarget] = useState({
    top: 34,
    left: 80,
    width: 100,
    height: 32,
  });

  // Translation delta from viewport center to navbar target
  const [delta, setDelta] = useState({ x: -200, y: -300 });

  // Check if session has already seen the preloader or is on an auth route
  useEffect(() => {
    setMounted(true);
    let hasSeen = false;
    try {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      const isAuthRoute =
        pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/otp" ||
        pathname.startsWith("/account-pending") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");
      if (isAuthRoute) {
        if (onComplete) onComplete();
        return;
      }

      // Check query param ?preload=true for instant replay testing
      const urlParams = new URLSearchParams(window.location.search);
      const replay = urlParams.get("preload") === "true";
      hasSeen =
        !replay &&
        !forceShow &&
        Boolean(sessionStorage.getItem("payent:preloaded"));
    } catch {
      hasSeen = false;
    }

    if (hasSeen) {
      if (onComplete) onComplete();
      return;
    }

    setIsVisible(true);
  }, [forceShow, onComplete]);

  // Measure navbar logo coordinates and compute center-to-left translation delta
  useEffect(() => {
    if (!isVisible) return;

    const measureNavPos = () => {
      const navEl = document.getElementById("nav-logo");
      let targetTop = 34;
      let targetLeft = 80;
      let targetW = 100;
      let targetH = 32;

      if (navEl) {
        const rect = navEl.getBoundingClientRect();
        targetTop = rect.top + rect.height / 2;
        targetLeft = rect.left + rect.width / 2;
        targetW = rect.width;
        targetH = rect.height;
      } else {
        const isDesktop = window.innerWidth >= 1024;
        const isTablet = window.innerWidth >= 640;
        const maxW = 1280;
        const pad = isDesktop ? 32 : isTablet ? 24 : 16;
        const leftBase = Math.max(pad, (window.innerWidth - maxW) / 2 + pad);
        targetTop = isTablet ? 34 : 32;
        targetLeft = leftBase + 48;
        targetW = 90;
        targetH = 32;
      }

      setNavTarget({
        top: targetTop,
        left: targetLeft,
        width: targetW,
        height: targetH,
      });

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      setDelta({
        x: targetLeft - centerX,
        y: targetTop - centerY,
      });
    };

    measureNavPos();
    window.addEventListener("resize", measureNavPos);
    return () => window.removeEventListener("resize", measureNavPos);
  }, [isVisible]);

  // Sequence Timeline matching storyboard specs
  useEffect(() => {
    if (!isVisible) return;

    if (shouldReduceMotion) {
      const tReduce = setTimeout(() => {
        setIsVisible(false);
        try {
          sessionStorage.setItem("payent:preloaded", "true");
        } catch {}
        if (onComplete) onComplete();
      }, 700);
      return () => clearTimeout(tReduce);
    }

    // -------------------------------------------------------------------------
    // STORYBOARD TIMELINE:
    // (1) 0.00s - 1.80s: Black screen with "P" in top-left corner
    // (2) 1.80s - 2.50s: "P" moves upward smoothly and exits
    // (3) 2.50s - 4.10s: "PAYENT" types letter-by-letter in center with glowing cursor
    // (4) 4.10s - 4.70s: "PAYENT" fully typed in center and holds
    // (5) 4.70s - 5.80s: "PAYENT" moves horizontally LEFT; Home page lands underneath
    // (6) 5.80s+: Preloader completes; final "PAYENT" remains docked on left
    // -------------------------------------------------------------------------

    const timers: NodeJS.Timeout[] = [];

    // Frame 2: Top-left "P" moves upward after 1.8s
    timers.push(
      setTimeout(() => {
        setPhase("top-left-p-up");
      }, 1800)
    );

    // Frame 3: Typing animation starts in center at 2.5s
    timers.push(
      setTimeout(() => {
        setPhase("center-typing");
        setTypedCount(1); // 'P'
      }, 2500)
    );

    timers.push(setTimeout(() => setTypedCount(2), 2750)); // 'PA'
    timers.push(setTimeout(() => setTypedCount(3), 3000)); // 'PAY'
    timers.push(setTimeout(() => setTypedCount(4), 3250)); // 'PAYE'
    timers.push(setTimeout(() => setTypedCount(5), 3500)); // 'PAYEN'
    timers.push(setTimeout(() => setTypedCount(6), 3750)); // 'PAYENT'

    // Frame 4: Typing complete & center hold
    timers.push(
      setTimeout(() => {
        setPhase("center-hold");
      }, 4100)
    );

    // Frame 5 & 6: "PAYENT" moves horizontally left & Home page starts landing underneath
    timers.push(
      setTimeout(() => {
        setPhase("move-left-landing");
      }, 4700)
    );

    // Final Completion
    timers.push(
      setTimeout(() => {
        setPhase("complete");
        setIsVisible(false);
        try {
          sessionStorage.setItem("payent:preloaded", "true");
        } catch {}
        if (onComplete) onComplete();
      }, 5900)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isVisible, shouldReduceMotion, onComplete]);

  if (!mounted || !isVisible) return null;

  // Reduced motion fallback
  if (shouldReduceMotion) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="preloader-reduced"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#000000] text-white select-none pointer-events-none"
          >
            <span className="text-3xl font-sans font-black tracking-tight text-white">
              PAYENT
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const showTopLeftP =
    phase === "top-left-p-hold" || phase === "top-left-p-up";
  const isTopLeftPMovingUp = phase === "top-left-p-up";

  const showCenterWord =
    phase === "center-typing" ||
    phase === "center-hold" ||
    phase === "move-left-landing";

  const isMovingToLeft = phase === "move-left-landing";
  const isTyping = phase === "center-typing";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="payent-cinematic-preloader"
          initial={{ opacity: 1 }}
          animate={{
            // Black background dissolves as PAYENT moves to the left and home page lands underneath
            opacity: isMovingToLeft ? 0 : 1,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 1.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="fixed inset-0 z-[99999] bg-[#000000] text-white select-none overflow-hidden pointer-events-none"
          style={{ willChange: "opacity" }}
        >
          {/* Subtle Ambient Radial Glow in background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

          {/* ==================================================== */}
          {/* (1 & 2) TOP-LEFT CORNER "P"                          */}
          {/* Holds 1.8s, then moves upward with motion trail      */}
          {/* ==================================================== */}
          <AnimatePresence>
            {showTopLeftP && (
              <motion.div
                key="top-left-p-mark"
                initial={{
                  position: "absolute",
                  top: navTarget.top - 18,
                  left: navTarget.left - navTarget.width / 2,
                  y: 0,
                  opacity: 1,
                  filter: "blur(0px)",
                }}
                animate={{
                  position: "absolute",
                  top: navTarget.top - 18,
                  left: navTarget.left - navTarget.width / 2,
                  // After 1.8s, glides upwards smoothly with motion trail
                  y: isTopLeftPMovingUp ? -75 : 0,
                  opacity: isTopLeftPMovingUp ? 0 : 1,
                  filter: isTopLeftPMovingUp ? "blur(2px)" : "blur(0px)",
                }}
                exit={{
                  y: -75,
                  opacity: 0,
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="z-40 pointer-events-none flex items-center select-none"
              >
                <span className="font-sans font-black tracking-tight text-3xl sm:text-4xl text-white leading-none drop-shadow-[0_0_16px_rgba(255,255,255,0.4)]">
                  P
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==================================================== */}
          {/* (3 & 4 & 5) "PAYENT" TYPED IN CENTER                 */}
          {/* Followed by cursor, then glides horizontally LEFT    */}
          {/* and docks into the navbar logo spot as home lands    */}
          {/* ==================================================== */}
          {showCenterWord && (
            <motion.div
              initial={{
                position: "fixed",
                top: "50%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                scale: 1,
                opacity: 1,
                filter: "blur(0px)",
              }}
              animate={
                isMovingToLeft
                  ? {
                      position: "fixed",
                      top: "50%",
                      left: "50%",
                      // Translate strictly horizontally LEFT from viewport center to the left side
                      x: `calc(-50% + ${delta.x}px)`,
                      y: "-50%", // Strictly horizontal: NO vertical/upward movement
                      scale:
                        typeof window !== "undefined" && window.innerWidth < 640
                          ? 0.70
                          : 0.82,
                      opacity: 1,
                      filter: "blur(0px)",
                    }
                  : {
                      position: "fixed",
                      top: "50%",
                      left: "50%",
                      x: "-50%",
                      y: "-50%",
                      scale: 1,
                      opacity: 1,
                      filter: "blur(0px)",
                    }
              }
              transition={
                isMovingToLeft
                  ? {
                      duration: 1.15,
                      ease: [0.16, 1, 0.3, 1], // Cinematic horizontal glide curve
                    }
                  : {
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className="z-50 pointer-events-none flex items-center justify-center select-none origin-center"
              style={{ willChange: "transform, opacity" }}
            >
              <div className="relative inline-flex items-center justify-center font-sans font-black tracking-tight text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                {/* Horizontal speed trail glow during left motion */}
                {isMovingToLeft && (
                  <motion.div
                    initial={{ opacity: 0.6, scaleX: 1.4 }}
                    animate={{ opacity: 0, scaleX: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0 bg-white/20 blur-lg rounded-full pointer-events-none -z-10"
                  />
                )}

                {LETTERS.map((char, index) => {
                  const isCharVisible = index < typedCount;
                  return (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                      animate={{
                        opacity: isCharVisible ? 1 : 0,
                        scale: isCharVisible ? 1 : 0.9,
                        filter: isCharVisible ? "blur(0px)" : "blur(4px)",
                      }}
                      transition={{
                        duration: 0.22,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="inline-block"
                    >
                      {char}
                    </motion.span>
                  );
                })}

                {/* Blinking Typing Cursor Indicator */}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.65,
                      ease: "easeInOut",
                    }}
                    className="inline-block ml-1.5 w-1 md:w-1.5 h-[0.85em] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] align-middle"
                  />
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppPreloader;

