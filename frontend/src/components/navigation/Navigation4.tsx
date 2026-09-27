import React, { useState, useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
  type SpringOptions,
} from "framer-motion";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Compass,
  ShoppingBag,
  LayoutDashboard,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useOriginReveal } from "./OriginRevealTransition";

export interface Navigation4Item {
  id: string;
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  isActive?: boolean;
  className?: string;
}

interface Navigation4ItemProps {
  item: Navigation4Item;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
}

function Nav4DockItem({
  item,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
}: Navigation4ItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { triggerOriginTransition, registerOriginRef } = useOriginReveal();

  useEffect(() => {
    if (ref.current) {
      registerOriginRef(item.id, ref.current);
    }
    return () => registerOriginRef(item.id, null);
  }, [item.id, registerOriginRef]);

  const mouseDistance = useTransform(mouseX, (val: number) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );
  const size = useSpring(targetSize, spring);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ref.current) {
      triggerOriginTransition(item.id, ref.current);
    }
    item.onClick?.();
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${item.className || ""}`}>
      <motion.button
        ref={ref}
        style={{
          width: size,
          height: size,
        }}
        whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        whileTap={{ scale: 0.96, transition: { duration: 0.12, ease: "easeOut" } }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={handleClick}
        className={`relative flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 ${
          item.isActive
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md"
            : "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
        }`}
        aria-label={item.label}
        aria-current={item.isActive ? "page" : undefined}
      >
        {/* Active Pill Indicator on Bottom Edge */}
        {item.isActive && (
          <motion.span
            layoutId="nav4-active-pill"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 sm:w-5 h-1 sm:h-1 rounded-full bg-neutral-900 dark:bg-white"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        <div className="relative flex items-center justify-center pointer-events-none">
          {item.icon}

          {item.badge !== undefined && item.badge !== 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[16px] h-[16px] rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 text-[9px] font-bold flex items-center justify-center shadow-md pointer-events-none z-20">
              {item.badge}
            </span>
          )}
        </div>
      </motion.button>

      {/* Tooltip positioned above dock item */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl bg-neutral-950/90 dark:bg-white/95 text-white dark:text-neutral-950 text-xs sm:text-sm font-bold shadow-xl border border-white/15 dark:border-black/10 backdrop-blur-md flex items-center gap-1.5"
            role="tooltip"
          >
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-950 text-[10px] font-extrabold">
                {item.badge}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface Navigation4Props {
  className?: string;
  baseItemSize?: number;
  magnification?: number;
  distance?: number;
  spring?: SpringOptions;
}

/**
 * Universal Navigation Dock for pay₹ent
 * Exactly 4 items:
 * 1. Home
 * 2. Explore
 * 3. Cart
 * 4. User Dashboard
 */
export function Navigation4({
  className = "",
  baseItemSize,
  magnification,
  distance,
  spring = { mass: 0.1, stiffness: 200, damping: 15 },
}: Navigation4Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { cartCount } = useCart();

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const effectiveBaseItemSize = baseItemSize ?? (isDesktop ? 48 : 42);
  const effectiveMagnification = magnification ?? (isDesktop ? 62 : 52);
  const effectiveDistance = distance ?? (isDesktop ? 130 : 110);

  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const isRouteActive = (to: string) => {
    if (to === "/browse") {
      return (
        pathname.startsWith("/browse") ||
        pathname.startsWith("/categories") ||
        pathname.startsWith("/product")
      );
    }
    if (to === "/cart") {
      return pathname.startsWith("/cart") || pathname.startsWith("/checkout");
    }
    if (to === "/dashboard") {
      return (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/wishlist") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/notifications")
      );
    }
    return pathname === to;
  };

  const mainItems: Navigation4Item[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.6]" />,
      isActive: pathname === "/payant" || pathname === "/payent",
      onClick: () => navigate({ to: "/payant" }),
    },
    {
      id: "browse",
      label: "Explore",
      icon: <Compass className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.6]" />,
      isActive: isRouteActive("/browse"),
      onClick: () => navigate({ to: "/browse" }),
    },
    {
      id: "cart",
      label: "Cart",
      icon: <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.6]" />,
      badge: cartCount > 0 ? cartCount : undefined,
      isActive: isRouteActive("/cart"),
      onClick: () => navigate({ to: "/cart" }),
    },
    {
      id: "dashboard",
      label: "User Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.6]" />,
      isActive: isRouteActive("/dashboard"),
      onClick: () => navigate({ to: "/dashboard" }),
    },
  ];

  if (pathname.startsWith("/admin") || pathname === "/payernt") {
    return null;
  }

  return (
    <aside
      aria-label="pay₹ent Navigation Dock"
      className={`fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-0 mx-auto z-50 flex justify-center items-center pointer-events-none select-none px-3 w-full max-w-full ${className}`}
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        onTouchStart={() => isHovered.set(1)}
        onTouchMove={(e) => {
          if (e.touches[0]) {
            isHovered.set(1);
            mouseX.set(e.touches[0].pageX);
          }
        }}
        onTouchEnd={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className="pointer-events-auto py-2 sm:py-2.5 px-6 sm:px-8 md:px-10 rounded-2xl bg-white/92 dark:bg-[#0D151D]/95 backdrop-blur-2xl border-2 border-neutral-300 dark:border-neutral-700 shadow-xl shadow-black/20 dark:shadow-black/80 flex items-center justify-center gap-3 sm:gap-4 md:gap-5 w-auto min-w-[320px] sm:min-w-[400px] md:min-w-[460px] max-w-[calc(100vw-1.5rem)] overflow-visible"
      >
        {/* The 4 Main Items: Home, Explore, Cart, User Dashboard */}
        <div className="flex items-center justify-around w-full gap-2.5 sm:gap-4 md:gap-6 shrink-0">
          {mainItems.map((item) => (
            <Nav4DockItem
              key={item.id}
              item={item}
              mouseX={mouseX}
              spring={spring}
              distance={effectiveDistance}
              magnification={effectiveMagnification}
              baseItemSize={effectiveBaseItemSize}
            />
          ))}
        </div>
      </motion.div>
    </aside>
  );
}

export default Navigation4;
