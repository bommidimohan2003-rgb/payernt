import React, { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Sun, Moon, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/common/LogoIcon";
import { useLanguage } from "@/i18n";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { api } from "@/utils/api";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { tCommon } = useLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!user) {
      setUnreadNotifsCount(0);
      return;
    }
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;
    const checkNotifs = async () => {
      try {
        const notifs = await api.getNotifications(token);
        if (Array.isArray(notifs)) {
          const unread = notifs.filter((n) => !n.read).length;
          setUnreadNotifsCount(unread);
        }
      } catch {}
    };
    checkNotifs();
    const interval = setInterval(checkNotifs, 30000);
    window.addEventListener("payent_orders_updated", checkNotifs);
    window.addEventListener("payent_notifications_updated", checkNotifs);
    return () => {
      clearInterval(interval);
      window.removeEventListener("payent_orders_updated", checkNotifs);
      window.removeEventListener("payent_notifications_updated", checkNotifs);
    };
  }, [user]);
  const isButton2Home = pathname === "/payant" || pathname === "/payent" || pathname === "/payent/";
  const isHome = pathname === "/" || isButton2Home;
  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 border-none border-b-0 shadow-none",
          pathname === "/" && "-mb-16 sm:-mb-[68px]",
          scrolled
            ? "bg-background/90 backdrop-blur-xl"
            : pathname === "/"
              ? "bg-transparent shadow-none"
              : "bg-background/80 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex h-16 sm:h-[68px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity Logo */}
          <div className="flex items-center gap-3">
            <Link
              to={isButton2Home ? "/" : "/payant"}
              className="flex items-center gap-3 shrink-0 focus:outline-none group select-none py-1 transition-transform active:scale-96 cursor-pointer"
              id="nav-logo"
              aria-label={isButton2Home ? "Return to Gateway (Choose Experience)" : "Payent Home"}
              title={isButton2Home ? "Click to return to Gateway" : "Click to go to Payent Home"}
            >
              <LogoIcon showTagline={false} />
            </Link>
          </div>
          {/* Right: Theme Toggle & Auth / Profile Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button matching Payent Theme (Circular outline) */}
            {mounted && (
              <button
                type="button"
                onClick={toggle}
                aria-label="Toggle Color Theme"
                title={theme === "dark" ? tCommon.switchToLight : tCommon.switchToDark}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 bg-transparent hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.6]" />
                ) : (
                  <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px] stroke-[1.6]" />
                )}
              </button>
            )}
            {mounted && user ? (
              <div className="flex items-center gap-2">
                {(user.role === "admin" || user.role === "superadmin") && (
                  <Link
                    to="/admin/dashboard"
                    id="nav-admin-portal-btn"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Admin Portal
                  </Link>
                )}
                <Link
                  to="/notifications"
                  id="nav-notifications-btn"
                  aria-label="Notifications"
                  title="Notifications"
                  className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white border border-neutral-300 dark:border-neutral-700/80 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <Bell className="h-4 w-4 sm:h-[17px] sm:w-[17px] stroke-[1.6]" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </span>
                  )}
                </Link>
                <Link
                  to={user.role === "admin" || user.role === "superadmin" ? "/admin/dashboard" : "/profile"}
                  id="nav-profile-avatar"
                  className="flex items-center gap-2 p-1.5 pl-2 pr-3 sm:pr-4 rounded-full border border-black/10 dark:border-white/15 bg-white/80 dark:bg-[#0D151D]/80 hover:border-black/20 dark:hover:border-white/30 shadow-xs hover:shadow-sm transition-all active:scale-95"
                >
                  <ProfilePhoto
                    src={user.profilePhotoUrl || user.profile_photo_url || user.avatar}
                    alt={user.fullName || "User"}
                    size="sm"
                    shape="circle"
                  />
                  <span className="hidden xs:inline sm:inline text-xs sm:text-sm font-bold text-neutral-900 dark:text-white max-w-[100px] sm:max-w-[120px] truncate">
                    {user.role === "admin" || user.role === "superadmin" ? "Admin" : user.fullName?.split(" ")[0] || tCommon.profile}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  id="nav-login-btn"
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer select-none"
                >
                  {tCommon.login}
                </Link>
                <Link
                  to="/register"
                  id="nav-signup-btn"
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold sm:font-semibold rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 select-none"
                >
                  <span>{tCommon.signup}</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.2]" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
export default Navbar;
