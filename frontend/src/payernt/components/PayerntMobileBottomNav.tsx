import React, { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Package,
  Calendar,
  Wallet,
  MoreHorizontal,
  MessageSquare,
  BarChart3,
  HelpCircle,
  Settings,
  User,
  LogOut,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PayerntMobileBottomNavProps {
  pendingRequestsCount?: number;
  unreadMessagesCount?: number;
  onLogout?: () => void;
}

export function PayerntMobileBottomNav({
  pendingRequestsCount = 0,
  unreadMessagesCount = 0,
  onLogout,
}: PayerntMobileBottomNavProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const currentTab = (() => {
    if (pathname === "/payernt" || pathname === "/payernt/") return "home";
    if (pathname.startsWith("/payernt/products")) return "products";
    if (pathname.startsWith("/payernt/bookings") || pathname.startsWith("/payernt/requests")) return "bookings";
    if (pathname.startsWith("/payernt/wallet") || pathname.startsWith("/payernt/earnings")) return "wallet";
    return "";
  })();

  const handleNav = (path: string) => {
    setIsMoreOpen(false);
    navigate({ to: path as any });
  };

  const primaryTabs = [
    { id: "home", label: "Home", icon: Home, path: "/payernt" },
    { id: "products", label: "Products", icon: Package, path: "/payernt/products" },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      path: "/payernt/bookings",
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    { id: "wallet", label: "Wallet", icon: Wallet, path: "/payernt/wallet" },
  ];

  const moreItems = [
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      path: "/payernt/messages",
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { id: "analytics", label: "Analytics", icon: BarChart3, path: "/payernt/analytics" },
    { id: "help", label: "Help & Support", icon: HelpCircle, path: "/payernt/help" },
    { id: "settings", label: "Settings", icon: Settings, path: "/payernt/settings" },
    { id: "profile", label: "Profile", icon: User, path: "/payernt/profile" },
  ];

  return (
    <>
      {/* Floating Transparent Bottom Navigation Bar - Hovering on Screen */}
      <div className="fixed bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 z-40 md:hidden pointer-events-none flex justify-center">
        <nav
          className="pointer-events-auto w-full max-w-md bg-white/70 dark:bg-[#0b0e14]/75 backdrop-blur-2xl border border-neutral-200/70 dark:border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-2xl sm:rounded-3xl transition-all duration-200 py-1.5 px-2 ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          aria-label="Mobile Bottom Navigation"
        >
          <div className="grid grid-cols-5 items-center w-full">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNav(tab.path)}
                className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "text-neutral-950 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
                aria-label={tab.label}
              >
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors ${
                    isActive ? "bg-neutral-100 dark:bg-white/[0.12]" : ""
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 stroke-[1.9]" />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-0.5 leading-none ${
                    isActive ? "font-bold text-neutral-950 dark:text-white" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>

                {tab.badge !== undefined && (
                  <span className="absolute top-0.5 right-3 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full bg-neutral-900 dark:bg-white text-[9px] font-black text-white dark:text-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* 5th Tab: More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isMoreOpen
                ? "text-neutral-950 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
            aria-label="More navigation items"
          >
            <div
              className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors ${
                isMoreOpen ? "bg-neutral-100 dark:bg-white/[0.12]" : ""
              }`}
            >
              <MoreHorizontal className="h-4.5 w-4.5 stroke-[1.9]" />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 leading-none ${
                isMoreOpen ? "font-bold text-neutral-950 dark:text-white" : "font-medium"
              }`}
            >
              More
            </span>

            {unreadMessagesCount > 0 && (
              <span className="absolute top-0.5 right-3 flex h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />
            )}
          </button>
        </div>
      </nav>
    </div>

      {/* More Menu Sheet Modal */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative z-10 w-full rounded-t-3xl bg-white dark:bg-[#0f121a] border-t border-neutral-200/90 dark:border-white/[0.1] p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl space-y-4"
            >
              {/* Sheet Drag Handle + Close */}
              <div className="flex items-center justify-between pb-1">
                <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
                <span className="text-sm font-bold text-neutral-900 dark:text-white font-display">
                  More Options
                </span>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="h-8 w-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/10 flex items-center justify-center text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.path)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] active:scale-[0.99] transition-all min-h-[48px] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200">
                          <Icon className="h-4 w-4 stroke-[1.8]" />
                        </div>
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="h-4 min-w-4 px-1.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-black flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                {onLogout && (
                  <div className="pt-2 border-t border-neutral-200/80 dark:border-white/10 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] active:scale-[0.99] transition-all min-h-[48px] cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300">
                        <LogOut className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">Log Out of paye₹nt</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PayerntMobileBottomNav;
