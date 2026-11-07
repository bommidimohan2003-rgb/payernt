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
        <nav className="card-premium p-3 space-y-1 bg-white/90 dark:bg-[#1E1E1E] backdrop-blur-md border border-neutral-200/90 dark:border-white/10 rounded-3xl shadow-sm">
          {/* Workspace Identity Header */}
          <div className="px-3.5 py-3 mb-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Creator Workspace
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400">
              {user?.role === "lender" ? "LENDER" : "RENTER"}
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
                  "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all",
                  active
                    ? "bg-[#161616] text-[#FFFFFF] dark:bg-[#F5F5F5] dark:text-[#050709] shadow-sm font-bold"
                    : "text-neutral-600 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-[#F5F5F5] hover:bg-neutral-100/80 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <it.icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-neutral-200 dark:text-[#050709]" : "text-neutral-500 dark:text-[#A1A1AA]"
                    )}
                  />
                  <span>{it.label}</span>
                </div>
                {isMessages && unreadCount > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 min-w-[20px] h-[20px] rounded-full text-[10px] font-bold flex items-center justify-center leading-none shadow-sm",
                    active
                      ? "bg-black text-white dark:bg-[#1E1E1E] dark:text-[#F5F5F5]"
                      : "bg-neutral-900 text-white dark:bg-white/15 dark:text-[#F5F5F5]"
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-neutral-600 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-[#F5F5F5] hover:bg-neutral-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-neutral-500 dark:text-[#A1A1AA]" />
              <span>{tCommon.languages}</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-neutral-200/80 dark:bg-white/10 text-neutral-800 dark:text-[#F5F5F5]">
              {getLanguageLabel()}
            </span>
          </button>

          {/* Logout Option directly below Languages */}
          {user && (
            <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-neutral-600 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-[#F5F5F5] hover:bg-neutral-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-neutral-500 dark:text-[#A1A1AA]" />
                <span>{tCommon.logout}</span>
              </button>
            </div>
          )}

          {/* Escrow Protected Callout Card (Integrated & fully visible) */}
          <div className="pt-2.5 border-t border-black/5 dark:border-white/5 mt-2">
            <div className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Escrow Protected
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  100% SAFE
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                All bookings secured with encrypted 4-digit handover PIN verification and zero-risk damage escrow.
              </p>
            </div>
          </div>
        </nav>

        {/* 24/7 Shoot Concierge Card */}
        <div className="p-3.5 rounded-3xl bg-neutral-950 dark:bg-white/[0.04] text-white border border-neutral-800 dark:border-white/10 shadow-sm space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-white/10 text-emerald-400 grid place-items-center">
              <Headphones className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">
              Production Concierge
            </span>
          </div>
          <p className="text-[11px] text-neutral-300 dark:text-neutral-400 leading-snug">
            Need urgent gear swaps or courier coordination?
          </p>
          <Link
            to="/support"
            className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-white text-black hover:bg-neutral-100 dark:bg-white dark:text-black text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <span>Chat With Concierge</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </aside>

      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}

export default Sidebar;
