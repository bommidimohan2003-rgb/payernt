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
  ShieldCheck,
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
    if (pathname.startsWith("/payernt/kyc")) return "kyc";
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
    { id: "kyc", label: "Aadhaar KYC", icon: ShieldCheck, path: "/payernt/kyc" },
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
                    ? "bg-accent-primary text-white shadow-md font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`h-4 min-w-4 px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-secondary text-foreground"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-border mt-1 space-y-1">
            {/* Settings */}
            <button
              onClick={() => handleNav("settings", "/payernt/settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === "settings"
                  ? "bg-accent-primary text-white shadow-md font-bold"
                  : "text-text-secondary hover:text-text-primary hover:bg-secondary"
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
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-secondary transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4" />
                <span>{tCommon.languages}</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-secondary text-foreground">
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-secondary transition-all cursor-pointer"
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
        className={`hidden md:flex flex-col items-center justify-between py-4 px-2 w-16 sm:w-18 shrink-0 self-stretch rounded-3xl bg-surface-navigation border border-border shadow-elevation-1 backdrop-blur-xl transition-colors duration-200 ${className}`}
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
                    ? "bg-accent-primary text-white shadow-md scale-102 font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-secondary border border-transparent"
                }`}
                title={item.label}
                aria-label={item.label}
              >
                <Icon className="h-4.5 w-4.5 stroke-[1.8]" />
                {item.badge !== undefined && (
                  <span className={`absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full text-[9px] font-black shadow-xs ${
                    isActive
                      ? "bg-white text-accent-primary"
                      : "bg-accent-primary text-white"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Stack: Settings & Languages directly below Settings */}
        <div className="flex flex-col items-center gap-2.5 w-full pt-4 border-t border-border">
          {/* Settings */}
          <button
            onClick={() => handleNav("settings", "/payernt/settings")}
            className={`flex items-center justify-center h-11 w-11 rounded-2xl transition-all duration-200 cursor-pointer ${
              currentTab === "settings"
                ? "bg-accent-primary text-white shadow-md font-bold"
                : "text-text-secondary hover:text-text-primary hover:bg-secondary border border-transparent"
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
            className="flex items-center justify-center h-11 w-11 rounded-2xl text-text-secondary hover:text-text-primary hover:bg-secondary border border-transparent transition-all duration-200 cursor-pointer relative group"
            title={`${tCommon.languages} (${getLanguageLabel()})`}
            aria-label={`${tCommon.languages} (${getLanguageLabel()})`}
          >
            <Globe className="h-4.5 w-4.5 stroke-[1.8]" />
            <span className="absolute -bottom-1 -right-1 text-[8px] font-extrabold uppercase px-1 rounded-sm bg-secondary text-text-primary">
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
