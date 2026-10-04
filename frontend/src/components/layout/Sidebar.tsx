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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { LogoIcon } from "@/components/common/LogoIcon";
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
      <aside className="hidden lg:block w-64 shrink-0 sticky top-20 h-fit">
        <nav className="card-premium p-3 space-y-1 bg-white/90 dark:bg-[#0D151D]/90 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-3xl shadow-sm">
          {/* Brand Area */}
          <div className="px-3 py-2.5 mb-2 border-b border-black/5 dark:border-white/5">
            <LogoIcon showTagline={true} />
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
                    ? "bg-[#161616] text-[#FFFFFF] dark:bg-white/12 dark:text-white dark:border dark:border-white/15 shadow-sm font-bold"
                    : "text-neutral-600 dark:text-[#AAB3BC] hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <it.icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-neutral-200 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                    )}
                  />
                  <span>{it.label}</span>
                </div>
                {isMessages && unreadCount > 0 && (
                  <span className="px-2 py-0.5 min-w-[20px] h-[20px] rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-neutral-600 dark:text-[#AAB3BC] hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <span>{tCommon.languages}</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-neutral-200/80 dark:bg-white/10 text-neutral-800 dark:text-neutral-200">
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
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-neutral-600 dark:text-[#AAB3BC] hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <span>{tCommon.logout}</span>
              </button>
            </div>
          )}
        </nav>
      </aside>

      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}

export default Sidebar;
