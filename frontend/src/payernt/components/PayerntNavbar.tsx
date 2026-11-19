import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LenderNotification, DemoUser, PayerntAccount } from "../types";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/i18n";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
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
  const displayName = activeAccount?.name || activeUser?.fullName || activeUser?.name || "Lender";
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
      <header className="sticky top-0 z-40 w-full border-none border-b-0 shadow-none bg-background/85 backdrop-blur-2xl transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand Identity with Official Logo */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleBrandClick}
              className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none group select-none transition-transform active:scale-95"
              title={isHome ? "Return to Gateway (Choose Experience)" : "Payernt Home"}
              aria-label={isHome ? "Return to Gateway (Choose Experience)" : "Payernt Home"}
            >
              <svg
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 select-none drop-shadow-xs"
                aria-hidden="true"
              >
                <rect width="512" height="512" rx="112" fill="#000000" />
                <path
                  d="M173.70 361.71V154.12H227.65V176.43C 235.11 167.06 241.95 160.71 248.18 157.40 256.08 152.95 265.88 150.72 276.08 150.72 296.19 150.72 311.74 158.41 322.74 173.80 333.73 189.19 339.23 208.21 339.23 230.87 339.23 255.88 333.24 274.98 321.25 288.15 309.26 301.31 294.11 307.90 275.79 307.90 266.92 307.90 258.83 306.39 251.51 303.37 244.19 300.35 237.66 295.86 231.90 289.92V361.71H173.70M231.47 229.81C 231.47 241.68 233.98 250.48 238.98 256.23 243.98 261.98 250.31 264.85 257.95 264.85 264.66 264.85 270.27 262.10 274.80 256.59 279.33 251.07 281.60 241.72 281.60 228.53 281.60 216.38 279.24 207.45 274.52 201.75 269.80 196.05 264.04 193.20 257.25 193.20 249.88 193.20 243.75 196.07 238.84 201.82 233.93 207.57 231.47 216.90 231.47 229.81Z"
                  fill="#FFFFFF"
                />
              </svg>
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
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 bg-transparent hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-neutral-300 hover:text-white transition-transform" />
              ) : (
                <Moon className="h-4 w-4 text-neutral-700 hover:text-neutral-950 transition-transform" />
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
                    className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface-modal shadow-elevation-3 p-4 z-50 text-left space-y-3"
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
            {/* Real User Profile Photo */}
            <button
              type="button"
              onClick={() => navigate({ to: "/payernt/profile" })}
              className="flex items-center justify-center rounded-full hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
              title={`${tCommon.profile} (${displayName})`}
              aria-label={`${tCommon.profile}: ${displayName}`}
            >
              <ProfilePhoto
                src={
                  activeAccount?.profilePhotoUrl ||
                  activeAccount?.profile_photo_url ||
                  activeAccount?.avatar ||
                  activeUser?.profilePhotoUrl ||
                  activeUser?.profile_photo_url ||
                  activeUser?.avatar
                }
                alt={displayName}
                size="sm"
                shape="circle"
              />
            </button>

            {/* Direct One-Click Logout Button on Header (Visible on ALL screen sizes) */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700/80 hover:border-destructive/50 dark:hover:border-destructive/50 bg-transparent hover:bg-destructive/10 text-neutral-600 dark:text-neutral-400 hover:text-destructive dark:hover:text-destructive transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive shrink-0"
                aria-label={tCommon.logout}
                title={tCommon.logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
export default PayerntNavbar;
