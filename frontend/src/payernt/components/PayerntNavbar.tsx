import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LenderNotification, DemoUser, PayerntAccount } from "../types";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/i18n";

interface PayerntNavbarProps {
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  pendingRequestsCount?: number;
  notifications?: LenderNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onResetDemo?: () => void;
  activeUser?: DemoUser;
  activeAccount?: PayerntAccount | null;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export function PayerntNavbar({
  activeTab,
  onTabChange,
  pendingRequestsCount = 0,
  notifications = [],
  onMarkNotificationRead = () => {},
  onMarkAllNotificationsRead = () => {},
  activeUser,
  activeAccount,
  onLogout,
  onToggleSidebar,
}: PayerntNavbarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle: toggleTheme } = useTheme();
  const { tCommon } = useLanguage();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isHome =
    (pathname === "/payernt" ||
      pathname === "/payernt/" ||
      pathname === "/paye₹nt" ||
      pathname === "/paye₹nt/") &&
    (!activeTab || activeTab === "home");

  const handleBrandClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (isHome) {
      navigate({ to: "/" as any });
    } else {
      if (onTabChange) {
        onTabChange("home");
      }
      navigate({ to: "/payernt" as any });
    }
  };

  const displayName = activeAccount?.name || activeUser?.fullName || activeUser?.name || "Mohan";
  const avatarLetter = (displayName.trim()[0] || "M").toUpperCase();
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface-navigation/85 backdrop-blur-2xl shadow-elevation-1 transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand Name Only (No Logo, No Online Pill) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleBrandClick}
              className="flex items-center text-left cursor-pointer focus:outline-none group select-none transition-transform active:scale-95"
              title={isHome ? "Return to Gateway (Choose Experience)" : "Payernt Home"}
              aria-label={isHome ? "Return to Gateway (Choose Experience)" : "Payernt Home"}
            >
              <span className="font-extrabold tracking-tight text-xl sm:text-2xl text-foreground font-display">
                paye₹nt
              </span>
            </button>
          </div>

          {/* Right: Theme Toggle, Notifications, Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-text-secondary hover:text-text-primary transition-transform" />
              ) : (
                <Moon className="h-4 w-4 text-text-secondary hover:text-text-primary transition-transform" />
              )}
            </button>

            {/* Notification Icon */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={tCommon.notifications}
                title={tCommon.notifications}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface-modal shadow-elevation-3 p-4 z-50 text-left space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-bold text-xs text-foreground">{tCommon.notifications}</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllNotificationsRead}
                          className="text-[11px] text-text-secondary hover:text-foreground font-medium cursor-pointer"
                        >
                          {tCommon.markAllAsRead}
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-text-secondary text-center py-4">
                          {tCommon.noNotifications}
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              onMarkNotificationRead(n.id);
                              setIsNotifOpen(false);
                              if (n.actionRoute) {
                                navigate({ to: `/payernt/${n.actionRoute}` as any });
                              } else if (n.bookingId) {
                                navigate({ to: "/payernt/requests" as any });
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                              n.read
                                ? "border-border bg-secondary/50 text-text-secondary"
                                : "border-border bg-secondary text-foreground font-medium"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-neutral-900 dark:text-white">{n.title}</span>
                              <span className="text-[10px] text-neutral-500">{n.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">{n.message}</p>
                            {n.productName && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                                <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">📦 {n.productName}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 border-t border-neutral-200/80 dark:border-white/10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigate({ to: "/payernt/notifications" as any });
                        }}
                        className="text-xs font-bold text-neutral-900 dark:text-white hover:underline cursor-pointer"
                      >
                        View all notifications &rarr;
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile / Avatar (Monochrome 'M') */}
            <button
              type="button"
              onClick={() => navigate({ to: "/payernt/profile" })}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 border border-neutral-300 text-neutral-900 dark:bg-[#1c202a] dark:hover:bg-[#252b38] dark:border-white/15 dark:text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              title={`${tCommon.profile} (${displayName})`}
              aria-label={`${tCommon.profile}: ${displayName}`}
            >
              {avatarLetter}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export default PayerntNavbar;
