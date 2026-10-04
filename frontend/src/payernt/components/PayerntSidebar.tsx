import React, { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Package,
  Calendar,
  Wallet,
  MessageSquare,
  BarChart3,
  Settings,
  Globe,
  LogOut,
} from "lucide-react";
import { useLanguage, LanguageModal } from "@/i18n";

interface PayerntSidebarProps {
  pendingRequestsCount?: number;
  unreadMessagesCount?: number;
  onNavigateTab?: (tab: string, path: string) => void;
  className?: string;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  onLogout?: () => void;
}

export function PayerntSidebar({
  pendingRequestsCount = 0,
  unreadMessagesCount = 0,
  onNavigateTab,
  className = "",
  isMobileDrawer = false,
  onCloseMobileDrawer,
  onLogout,
}: PayerntSidebarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { tCommon, language } = useLanguage();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const currentTab = (() => {
    if (pathname === "/payernt" || pathname === "/payernt/") return "home";
    if (pathname.startsWith("/payernt/products")) return "products";
    if (pathname.startsWith("/payernt/bookings") || pathname.startsWith("/payernt/requests")) return "bookings";
    if (pathname.startsWith("/payernt/wallet")) return "wallet";
    if (pathname.startsWith("/payernt/messages")) return "messages";
    if (pathname.startsWith("/payernt/analytics") || pathname.startsWith("/payernt/earnings")) return "analytics";
    if (pathname.startsWith("/payernt/settings") || pathname.startsWith("/payernt/profile")) return "settings";
    return "home";
  })();

  const handleNav = (id: string, path: string) => {
    if (onCloseMobileDrawer) onCloseMobileDrawer();
    if (onNavigateTab) {
      onNavigateTab(id, path);
      return;
    }
    navigate({ to: path as any });
  };

  const navItems = [
    { id: "home", label: tCommon.home, icon: Home, path: "/payernt" },
    { id: "products", label: tCommon.products, icon: Package, path: "/payernt/products" },
    {
      id: "bookings",
      label: tCommon.bookings,
      icon: Calendar,
      path: "/payernt/bookings",
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    { id: "wallet", label: tCommon.wallet, icon: Wallet, path: "/payernt/wallet" },
    {
      id: "messages",
      label: tCommon.messages,
      icon: MessageSquare,
      path: "/payernt/messages",
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { id: "analytics", label: tCommon.analytics, icon: BarChart3, path: "/payernt/analytics" },
  ];

  const getLanguageLabel = () => {
    if (language === "te") return "తెలుగు";
    if (language === "hi") return "हिन्दी";
    return "English";
  };

  if (isMobileDrawer) {
    return (
      <>
        <div className="flex flex-col gap-1.5 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id, item.path)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white text-[10px] font-extrabold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-neutral-200 dark:border-white/10 mt-1 space-y-1">
            {/* Settings */}
            <button
              onClick={() => handleNav("settings", "/payernt/settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === "settings"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>{tCommon.settings}</span>
            </button>

            {/* Languages Option directly below Settings */}
            <button
              type="button"
              onClick={() => {
                if (onCloseMobileDrawer) onCloseMobileDrawer();
                setIsLangModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4" />
                <span>{tCommon.languages}</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-neutral-200/80 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">
                {getLanguageLabel()}
              </span>
            </button>

            {/* Logout */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (onCloseMobileDrawer) onCloseMobileDrawer();
                  onLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>{tCommon.logout}</span>
              </button>
            )}
          </div>
        </div>

        <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <aside
        className={`hidden md:flex flex-col items-center justify-between py-4 px-2 w-16 sm:w-18 shrink-0 self-stretch rounded-3xl bg-white/95 dark:bg-[#0b0e14]/90 border border-neutral-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-2xl backdrop-blur-xl transition-colors duration-200 ${className}`}
        aria-label="Lender Navigation"
      >
        {/* Top Main Navigation Stack */}
        <div className="flex flex-col items-center gap-2.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id, item.path)}
                className={`relative group flex items-center justify-center h-11 w-11 rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-white/[0.12] dark:text-white border border-neutral-800 dark:border-white/20 shadow-md scale-102"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-transparent"
                }`}
                title={item.label}
                aria-label={item.label}
              >
                <Icon className="h-4.5 w-4.5 stroke-[1.8]" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-black text-white dark:bg-neutral-300 dark:text-black shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Stack: Settings & Languages directly below Settings */}
        <div className="flex flex-col items-center gap-2.5 w-full pt-4 border-t border-neutral-200/60 dark:border-white/10">
          {/* Settings */}
          <button
            onClick={() => handleNav("settings", "/payernt/settings")}
            className={`flex items-center justify-center h-11 w-11 rounded-2xl transition-all duration-200 cursor-pointer ${
              currentTab === "settings"
                ? "bg-neutral-900 text-white dark:bg-white/[0.12] dark:text-white border border-neutral-800 dark:border-white/20 shadow-md"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-transparent"
            }`}
            title={tCommon.settings}
            aria-label={tCommon.settings}
          >
            <Settings className="h-4.5 w-4.5 stroke-[1.8]" />
          </button>

          {/* Languages Button directly below Settings */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="flex items-center justify-center h-11 w-11 rounded-2xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-transparent transition-all duration-200 cursor-pointer relative group"
            title={`${tCommon.languages} (${getLanguageLabel()})`}
            aria-label={`${tCommon.languages} (${getLanguageLabel()})`}
          >
            <Globe className="h-4.5 w-4.5 stroke-[1.8]" />
            <span className="absolute -bottom-1 -right-1 text-[8px] font-extrabold uppercase px-1 rounded-sm bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {language}
            </span>
          </button>
        </div>
      </aside>

      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}

export default PayerntSidebar;
