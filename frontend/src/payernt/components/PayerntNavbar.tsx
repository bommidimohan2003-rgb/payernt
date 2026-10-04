import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LenderNotification, DemoUser, PayerntAccount } from "../types";
import { useTheme } from "@/hooks/useTheme";
import { useOriginReveal } from "@/components/navigation/OriginRevealTransition";
import { useLanguage, LanguageModal } from "@/i18n";

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
  const { triggerOriginTransition } = useOriginReveal();
  const { theme, toggle: toggleTheme } = useTheme();
  const { tCommon, language } = useLanguage();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isHome =
    (pathname === "/payernt" ||
      pathname === "/payernt/" ||
      pathname === "/paye₹nt" ||
      pathname === "/paye₹nt/") &&
    (!activeTab || activeTab === "home");

  const handleBrandClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      triggerOriginTransition(isHome ? "gateway" : "home", e.currentTarget);
    } catch {
      // Safe fallback if outside provider
    }

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

  const getLanguageShortCode = () => {
    if (language === "te") return "తె";
    if (language === "hi") return "हि";
    return "EN";
  };

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
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/60 dark:border-white/[0.06] bg-white/70 dark:bg-[#07090e]/75 backdrop-blur-2xl transition-colors duration-200">
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
              <span className="font-extrabold tracking-tight text-xl sm:text-2xl text-neutral-900 dark:text-white font-display">
                paye₹nt
              </span>
            </button>
          </div>

          {/* Right: Language, Theme Toggle, Notifications, Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Button */}
            <button
              type="button"
              onClick={() => setIsLangModalOpen(true)}
              className="h-9 px-2.5 flex items-center gap-1.5 rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer border border-neutral-200/60 dark:border-white/10"
              aria-label={`${tCommon.languages}: ${language}`}
              title={`${tCommon.languages} (${language.toUpperCase()})`}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-bold font-mono uppercase">
                {getLanguageShortCode()}
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-neutral-300 hover:text-white transition-transform" />
              ) : (
                <Moon className="h-4 w-4 text-neutral-700 hover:text-black transition-transform" />
              )}
            </button>

            {/* Notification Icon */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label={tCommon.notifications}
                title={tCommon.notifications}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-neutral-900 dark:bg-white shadow-xs animate-pulse" />
                )}
              </button>

              {/* Notification Drawer Popover */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0d1017] shadow-2xl p-4 z-50 text-left space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-white/10 pb-2">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">{tCommon.notifications}</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={onMarkAllNotificationsRead}
                          className="text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white font-medium cursor-pointer"
                        >
                          {tCommon.markAllAsRead}
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-4">
                          {tCommon.noNotifications}
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => onMarkNotificationRead(n.id)}
                            className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                              n.read
                                ? "border-neutral-200/60 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] text-neutral-500 dark:text-neutral-400"
                                : "border-neutral-300 dark:border-white/15 bg-neutral-100/70 dark:bg-white/[0.06] text-neutral-900 dark:text-white font-medium"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-neutral-900 dark:text-white">{n.title}</span>
                              <span className="text-[10px] text-neutral-500">{n.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
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

      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}

export default PayerntNavbar;
