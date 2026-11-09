import React, { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  User,
  Globe,
  LogOut,
  ShieldCheck,
  Sparkles,
  Headphones,
  ArrowRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useLanguage, LanguageModal } from "@/i18n";

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { tCommon, language } = useLanguage();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const getLanguageLabel = () => {
    if (language === "te") return "తెలుగు";
    if (language === "hi") return "हिन्दी";
    return "English";
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: tCommon.overview },
    { to: "/orders", icon: Package, label: tCommon.orders },
    { to: "/wishlist", icon: Heart, label: tCommon.wishlist },
    { to: "/notifications", icon: Bell, label: tCommon.notifications },
    { to: "/messages", icon: MessageSquare, label: tCommon.messages },
    { to: "/profile", icon: User, label: tCommon.profile },
    { to: "/settings", icon: Settings, label: tCommon.settings },
  ];

  return (
    <>
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 h-fit space-y-3 pb-8">
        <nav className="p-3 space-y-1 bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
          {/* Workspace Identity Header */}
          <div className="px-3.5 py-3 mb-2 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-neutral-950 dark:bg-white inline-block" aria-hidden="true" />
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Creator Workspace
              </span>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {user?.role === "lender" ? "Lender" : "Renter"}
            </span>
          </div>

          {/* Navigation Items */}
          {navItems.map((it) => {
            const active = pathname === it.to;
            const isMessages = it.to === "/messages";
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <it.icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-white dark:text-neutral-950" : "text-neutral-600 dark:text-neutral-400"
                    )}
                    aria-hidden="true"
                  />
                  <span>{it.label}</span>
                </div>
                {isMessages && unreadCount > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 min-w-[20px] h-[20px] rounded-full text-[11px] font-semibold flex items-center justify-center leading-none tabular-nums",
                    active
                      ? "bg-white text-neutral-950 dark:bg-neutral-900 dark:text-white"
                      : "bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white"
                  )}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Languages Option directly below Settings */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
              <span>{tCommon.languages}</span>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              {getLanguageLabel()}
            </span>
          </button>

          {/* Logout Option directly below Languages */}
          {user && (
            <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800 mt-2">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
                <span>{tCommon.logout}</span>
              </button>
            </div>
          )}

          {/* Escrow Protected Callout Card (Monochrome) */}
          <div className="pt-2.5 border-t border-neutral-200/80 dark:border-neutral-800 mt-2">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-neutral-900 dark:text-white" aria-hidden="true" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Escrow Protected
                  </span>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  Verified
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
                Bookings use 4-digit handover PIN verification and deposit escrow.
              </p>
            </div>
          </div>
        </nav>

        {/* Shoot Concierge Card (Monochrome) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141414] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white grid place-items-center">
              <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">
              Production Concierge
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
            Need urgent gear swaps or courier coordination?
          </p>
          <Link
            to="/support"
            className="inline-flex items-center justify-center gap-1.5 w-full min-h-[40px] py-1.5 px-3 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 text-xs font-semibold transition-colors"
          >
            <span>Chat With Concierge</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </aside>

      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}

export default Sidebar;
