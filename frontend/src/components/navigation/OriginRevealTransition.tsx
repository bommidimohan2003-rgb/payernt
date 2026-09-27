import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

export interface OriginData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  vw: number;
  vh: number;
  timestamp: number;
  isReverse?: boolean;
}

interface OriginRevealContextType {
  origin: OriginData;
  triggerOriginTransition: (
    id: string,
    target?: HTMLElement | { x: number; y: number; width?: number; height?: number } | null,
    isReverse?: boolean
  ) => void;
  registerOriginRef: (id: string, element: HTMLElement | null) => void;
  activeId: string;
  isReducedMotion: boolean;
}

const getDefaultOrigin = (id = "home"): OriginData => {
  // Deterministic values for SSR and initial client hydration
  return {
    id,
    x: 472,
    y: 740,
    width: 56,
    height: 56,
    cx: 500,
    cy: 768,
    vw: 1000,
    vh: 800,
    timestamp: 0,
    isReverse: false,
  };
};

const OriginRevealContext = createContext<OriginRevealContextType>({
  origin: getDefaultOrigin(),
  triggerOriginTransition: () => {},
  registerOriginRef: () => {},
  activeId: "home",
  isReducedMotion: false,
});

export function OriginRevealProvider({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<OriginData>(() => getDefaultOrigin());
  const [activeId, setActiveId] = useState<string>("home");
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const isPopStateRef = useRef<boolean>(false);

  // Monitor prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Update client dimensions post-hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin((prev) => ({
      ...prev,
      vw: window.innerWidth,
      vh: window.innerHeight,
      cx: window.innerWidth / 2,
      cy: window.innerHeight - 32,
    }));
  }, []);

  // Monitor browser back / forward navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const registerOriginRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      elementsRef.current.set(id, element);
    } else {
      elementsRef.current.delete(id);
    }
  }, []);

  const triggerOriginTransition = useCallback(
    (
      id: string,
      target?: HTMLElement | { x: number; y: number; width?: number; height?: number } | null,
      isReverse = false
    ) => {
      const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;

      let rect = {
        left: vw / 2 - 28,
        top: vh - 60,
        width: 56,
        height: 56,
      };

      if (target && "getBoundingClientRect" in target) {
        const domRect = (target as HTMLElement).getBoundingClientRect();
        rect = {
          left: domRect.left,
          top: domRect.top,
          width: domRect.width,
          height: domRect.height,
        };
      } else if (target && "x" in target && "y" in target) {
        rect = {
          left: target.x,
          top: target.y,
          width: target.width ?? 48,
          height: target.height ?? 48,
        };
      } else {
        const registeredEl = elementsRef.current.get(id);
        if (registeredEl) {
          const domRect = registeredEl.getBoundingClientRect();
          rect = {
            left: domRect.left,
            top: domRect.top,
            width: domRect.width,
            height: domRect.height,
          };
        }
      }

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      setActiveId(id);
      setOrigin({
        id,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        cx,
        cy,
        vw,
        vh,
        timestamp: Date.now(),
        isReverse: isReverse || isPopStateRef.current,
      });

      isPopStateRef.current = false;
    },
    []
  );

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Map current route to registered element key for automatic origin recovery
  useEffect(() => {
    let targetId = "home";
    if (pathname === "/") targetId = "home";
    else if (pathname.startsWith("/browse") || pathname.startsWith("/categories") || pathname.startsWith("/product"))
      targetId = "browse";
    else if (pathname.startsWith("/become-lender") || pathname.startsWith("/lender-portal"))
      targetId = "lend";
    else if (pathname.startsWith("/cart") || pathname.startsWith("/checkout"))
      targetId = "cart";
    else if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/settings")
    )
      targetId = "dashboard";
    else if (pathname.startsWith("/wishlist"))
      targetId = "wishlist";
    else if (pathname.startsWith("/messages"))
      targetId = "messages";
    else if (pathname.startsWith("/profile"))
      targetId = "profile";

    const el = elementsRef.current.get(targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;

      setActiveId(targetId);
      setOrigin({
        id: targetId,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        cx,
        cy,
        vw,
        vh,
        timestamp: Date.now(),
        isReverse: isPopStateRef.current,
      });
      isPopStateRef.current = false;
    }
  }, [pathname]);

  return (
    <OriginRevealContext.Provider
      value={{
        origin,
        triggerOriginTransition,
        registerOriginRef,
        activeId,
        isReducedMotion,
      }}
    >
      {children}
    </OriginRevealContext.Provider>
  );
}

export function useOriginReveal() {
  return useContext(OriginRevealContext);
}

/**
 * Generate smooth organic squircle/curved expansion paths centered at (cx, cy)
 */
function createOrganicMorphPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  curvatureFactor = 0.55
) {
  // 4-point Bézier approximation of an organic rounded curved surface
  const kx = rx * curvatureFactor;
  const ky = ry * curvatureFactor;

  return `M ${cx} ${cy - ry} ` +
    `C ${cx + kx} ${cy - ry}, ${cx + rx} ${cy - ky}, ${cx + rx} ${cy} ` +
    `C ${cx + rx} ${cy + ky}, ${cx + kx} ${cy + ry}, ${cx} ${cy + ry} ` +
    `C ${cx - kx} ${cy + ry}, ${cx - rx} ${cy + ky}, ${cx - rx} ${cy} ` +
    `C ${cx - rx} ${cy - ky}, ${cx - kx} ${cy - ry}, ${cx} ${cy - ry} Z`;
}

/**
 * Origin-Based Expanding Reveal Transition
 * 
 * An Apple-inspired spatial transition where the destination page organically expands
 * from the exact click location of the navigation item.
 * 
 * Features:
 * - Dynamic origin calculation via getBoundingClientRect()
 * - Organic, curved boundary expansion (zero sharp geometric shapes/triangles)
 * - Progressive destination page reveal with subtle physical scale settle
 * - Ambient glass luminous leading-edge glow
 * - Apple-grade cubic-bezier(0.16, 1, 0.3, 1) easing
 * - prefers-reduced-motion accessibility support
 * - Zero post-transition artifacts or layout restrictions
 */
export function OriginRevealPageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { origin, isReducedMotion } = useOriginReveal();
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  const clipId = `origin-reveal-clip-${safeId}`;
  const auraGradientId = `origin-aura-grad-${safeId}`;
  const blurId = `aura-blur-${safeId}`;

  const [isMounted, setIsMounted] = useState(false);
  const [viewport, setViewport] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    setIsMounted(true);
    const updateSize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const vw = isMounted ? viewport.width : 1000;
  const vh = isMounted ? viewport.height : 800;

  const cx = isMounted && origin.cx != null ? origin.cx : vw / 2;
  const cy = isMounted && origin.cy != null ? origin.cy : vh - 40;

  // Calculate maximum distance from origin to the 4 viewport corners
  const maxRadius = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(vw - cx, cy),
    Math.hypot(cx, vh - cy),
    Math.hypot(vw - cx, vh - cy)
  ) * 1.35;

  // Organic smooth expansion keyframe paths
  const r0 = 4;
  const r1 = Math.max(40, maxRadius * 0.18);
  const r2 = Math.max(120, maxRadius * 0.52);
  const r3 = Math.max(260, maxRadius * 0.88);
  const r4 = maxRadius;

  const pathStart = createOrganicMorphPath(cx, cy, r0, r0 * 0.95);
  const pathEarly = createOrganicMorphPath(cx, cy, r1 * 1.12, r1 * 0.98);
  const pathMid = createOrganicMorphPath(cx, cy, r2 * 1.08, r2 * 1.02);
  const pathLate = createOrganicMorphPath(cx, cy, r3 * 1.04, r3 * 1.01);
  const pathFull = createOrganicMorphPath(cx, cy, r4, r4);

  // Full rectangular fallback path
  const pathRect = `M -100 -100 L ${vw + 100} -100 L ${vw + 100} ${vh + 100} L -100 ${vh + 100} Z`;

  // Reduced motion alternative: clean fade & micro-scale
  if (isReducedMotion) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, scale: 0.995 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full flex-1 flex flex-col min-h-screen"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${pathname}-${isMounted ? origin.timestamp : 0}`}
        className="relative w-full flex-1 flex flex-col min-h-screen"
      >
        {/* Dynamic SVG Clip Path Definition */}
        <svg
          className="absolute inset-0 w-0 h-0 pointer-events-none select-none opacity-0"
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId}>
              <motion.path
                initial={{ d: pathStart }}
                animate={{
                  d: origin.isReverse
                    ? [pathRect, pathLate, pathMid, pathEarly, pathStart]
                    : [pathStart, pathEarly, pathMid, pathLate, pathFull, pathRect],
                }}
                transition={{
                  duration: 0.92,
                  ease: [0.16, 1, 0.3, 1],
                  times: origin.isReverse
                    ? [0, 0.2, 0.5, 0.8, 1]
                    : [0, 0.18, 0.45, 0.72, 0.92, 1],
                }}
              />
            </clipPath>
          </defs>
        </svg>

        {/* LAYER 1: Ambient Luminous Organic Leading-Edge Aura */}
        <motion.svg
          viewBox={`0 0 ${vw} ${vh}`}
          className="fixed inset-0 w-full h-full pointer-events-none z-40 select-none"
          initial={{ opacity: 0.85 }}
          animate={{
            opacity: [0.85, 0.7, 0.45, 0.15, 0],
          }}
          transition={{
            duration: 0.92,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.2, 0.5, 0.8, 1],
          }}
        >
          <defs>
            <radialGradient
              id={auraGradientId}
              cx={cx}
              cy={cy}
              r={r4}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="rgba(255, 23, 68, 0)" />
              <stop offset="75%" stopColor="rgba(255, 23, 68, 0.12)" />
              <stop offset="92%" stopColor="rgba(255, 255, 255, 0.35)" />
              <stop offset="100%" stopColor="rgba(255, 23, 68, 0.5)" />
            </radialGradient>
            <filter id={blurId}>
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <motion.path
            fill="none"
            stroke={`url(#${auraGradientId})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${blurId})`}
            initial={{ d: pathStart }}
            animate={{
              d: origin.isReverse
                ? [pathFull, pathLate, pathMid, pathEarly, pathStart]
                : [pathStart, pathEarly, pathMid, pathLate, pathFull],
            }}
            transition={{
              duration: 0.92,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.2, 0.5, 0.8, 1],
            }}
          />
        </motion.svg>

        {/* LAYER 2 & 3: Unfolding Destination Page with Soft Organic Expansion & Progressive Content Settle */}
        <motion.div
          initial={{
            clipPath: `url(#${clipId})`,
            opacity: 0.92,
            scale: 0.988,
            y: 8,
            filter: "blur(2px)",
          }}
          animate={{
            clipPath: `url(#${clipId})`,
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
            transitionEnd: {
              clipPath: "none",
              filter: "none",
            },
          }}
          exit={{
            opacity: 0,
            scale: 0.99,
            transition: { duration: 0.18, ease: "easeIn" },
          }}
          transition={{
            duration: 0.92,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
