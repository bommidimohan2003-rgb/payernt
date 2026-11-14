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
  LayoutGrid,
  User,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";

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

  const handleClick = (_e: React.MouseEvent<HTMLButtonElement>) => {
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
        whileHover={{ y: -2, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
        whileTap={{ scale: 0.96, transition: { duration: 0.12, ease: "easeOut" } }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={handleClick}
        className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[46px] min-h-[46px] px-1 rounded-2xl transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white shrink-0 ${
          item.isActive
            ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs font-semibold"
            : "hover:bg-neutral-100 dark:hover:bg-[#262626] text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
        }`}
        aria-label={item.label}
        aria-current={item.isActive ? "page" : undefined}
      >
        {/* Active Pill Indicator on Bottom Edge */}
        {item.isActive && (
          <motion.span
            layoutId="nav4-active-pill"
            className="hidden md:block absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-neutral-950 dark:bg-white"
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        <div className="relative flex items-center justify-center pointer-events-none">
          {item.icon}

          {item.badge !== undefined && item.badge !== 0 && (
            <span className="absolute -top-1.5 -right-2 px-1 min-w-[16px] h-[16px] rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 ring-2 ring-white dark:ring-neutral-950 text-[9px] font-semibold flex items-center justify-center shadow-xs pointer-events-none z-20 tabular-nums">
              {item.badge}
            </span>
          )}
        </div>
        <span className="md:hidden text-[10px] leading-none font-medium pointer-events-none">
          {item.label}
        </span>
      </motion.button>

      {/* Desktop tooltip positioned above dock item */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="hidden md:flex absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-neutral-950/90 dark:bg-white/95 text-white dark:text-neutral-950 text-xs sm:text-sm font-semibold shadow-xl border border-white/15 dark:border-black/10 backdrop-blur-md items-center gap-1.5"
            role="tooltip"
          >
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-950 text-[10px] font-semibold tabular-nums">
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
 * Universal Navigation Dock for paYent
 * Renders 5 primary destinations:
 * 1. Home
 * 2. Explore
 * 3. Orders
 * 4. Profile
 * 5. More
 */
export function Navigation4({
  className = "",
  baseItemSize,
  magnification,
  distance,
  spring = { mass: 0.25, stiffness: 260, damping: 24 },
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

  const effectiveBaseItemSize = baseItemSize ?? (isDesktop ? 46 : 48);
  const effectiveMagnification = magnification ?? (isDesktop ? 52 : 48);
  const effectiveDistance = distance ?? (isDesktop ? 105 : 0);

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
    if (to === "/orders") {
      return (
        pathname.startsWith("/orders") ||
        pathname.startsWith("/cart") ||
        pathname.startsWith("/checkout")
      );
    }
    if (to === "/dashboard") {
      return (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/wishlist") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/notifications")
      );
    }
    if (to === "/support") {
      return pathname.startsWith("/support") || pathname.startsWith("/faq");
    }
    return pathname === to;
  };

  // 5 Navigation Items:
  // 1. Home
  // 2. Explore
  // 3. Orders
  // 4. Profile
  // 5. More
  const mainItems: Navigation4Item[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.75]" />,
      isActive: pathname === "/" || pathname === "/payant" || pathname === "/payent" || pathname === "/payent/",
      onClick: () => navigate({ to: "/payent" }),
    },
    {
      id: "explore",
      label: "Explore",
      icon: <Compass className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.75]" />,
      isActive: isRouteActive("/browse"),
      onClick: () => navigate({ to: "/browse" }),
    },
    {
      id: "orders",
      label: "Orders",
      icon: <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.75]" />,
      badge: cartCount > 0 ? cartCount : undefined,
      isActive: isRouteActive("/orders"),
      onClick: () => navigate({ to: "/orders" }),
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.75]" />,
      isActive: pathname.startsWith("/profile") || pathname.startsWith("/settings"),
      onClick: () => navigate({ to: "/profile" }),
    },
    {
      id: "more",
      label: "More",
      icon: <LayoutGrid className="h-4 w-4 sm:h-[18px] sm:w-[18px] md:h-[19px] md:w-[19px] stroke-[1.75]" />,
      isActive: isRouteActive("/dashboard") && !pathname.startsWith("/profile") && !pathname.startsWith("/settings"),
      onClick: () => navigate({ to: "/dashboard" }),
    },
  ];

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/payernt") ||
    pathname.startsWith("/paye₹nt")
  ) {
    return null;
  }

  return (
    <aside
      aria-label="paYent Navigation Dock"
      className={`fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-0 mx-auto z-50 flex justify-center items-center pointer-events-none select-none px-2 sm:px-4 w-full max-w-full ${className}`}
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
        className="pointer-events-auto py-1.5 sm:py-2 px-2 sm:px-5 md:px-7 rounded-2xl bg-surface-navigation/95 backdrop-blur-2xl border border-border shadow-elevation-2 flex items-center justify-center gap-1 sm:gap-2.5 md:gap-3.5 w-auto sm:min-w-[360px] md:min-w-[420px] max-w-[calc(100vw-1rem)] overflow-visible transition-colors duration-200"
      >
        {/* The 5 Main Items in exact required order */}
        <div className="flex items-center justify-between sm:justify-around w-full gap-1.5 sm:gap-2.5 md:gap-4 shrink-0">
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
