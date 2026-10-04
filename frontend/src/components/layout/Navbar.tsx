import React, { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Sun, Moon, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/common/LogoIcon";
import { useOriginReveal } from "@/components/navigation/OriginRevealTransition";
import { useLanguage, LanguageModal } from "@/i18n";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { tCommon, language } = useLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { triggerOriginTransition, registerOriginRef } = useOriginReveal();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isButton2Home = pathname === "/payant" || pathname === "/payent" || pathname === "/payent/";
  const isHome = pathname === "/" || isButton2Home;

  const handleThemeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerOriginTransition("theme", e.currentTarget);
    toggle();
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    triggerOriginTransition(isButton2Home ? "gateway" : "home", e.currentTarget);
  };

  const getLanguageShortCode = () => {
    if (language === "te") return "తె";
    if (language === "hi") return "हि";
    return "EN";
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300",
          pathname === "/" && "-mb-16 sm:-mb-[68px]",
          scrolled
            ? "bg-white/90 dark:bg-[#05090D]/90 backdrop-blur-xl shadow-xs"
            : pathname === "/"
              ? "bg-transparent shadow-none"
              : "bg-white/80 dark:bg-[#05090D]/80 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex h-16 sm:h-[68px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Identity Logo */}
          <div className="flex items-center gap-3">
            <Link
              to={isButton2Home ? "/" : "/payant"}
              ref={(el) => registerOriginRef("home-logo", el as HTMLElement | null)}
              onClick={handleLogoClick}
              className="flex items-center gap-3 shrink-0 focus:outline-none group select-none py-1 transition-transform active:scale-96 cursor-pointer"
              id="nav-logo"
              aria-label={isButton2Home ? "Return to Gateway (Choose Experience)" : "Payent Home"}
              title={isButton2Home ? "Click to return to Gateway" : "Click to go to Payent Home"}
            >
              <LogoIcon showTagline={false} />
            </Link>
          </div>

          {/* Right: Language Selector, Theme Toggle & Auth / Profile Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector Button */}
            {mounted && (
              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                aria-label={`Select Language (current: ${language})`}
                title={`${tCommon.languages} (${language.toUpperCase()})`}
                className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white border border-black/5 dark:border-white/10 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-96"
              >
                <Globe className="h-4 w-4 stroke-[1.7]" />
                <span className="text-[11px] sm:text-xs font-bold font-mono uppercase">
                  {getLanguageShortCode()}
                </span>
              </button>
            )}

            {/* Theme Toggle Button matching Dock Container Icon Style */}
            {mounted && (
              <button
                ref={(el) => registerOriginRef("theme", el)}
                type="button"
                onClick={handleThemeClick}
                aria-label="Toggle Color Theme"
                title={theme === "dark" ? tCommon.switchToLight : tCommon.switchToDark}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white border border-black/5 dark:border-white/10 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-96"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 sm:h-[17px] sm:w-[17px] stroke-[1.6]" />
                ) : (
                  <Moon className="h-4 w-4 sm:h-[17px] sm:w-[17px] stroke-[1.6]" />
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
                  to={user.role === "admin" || user.role === "superadmin" ? "/admin/dashboard" : "/profile"}
                  ref={(el) => registerOriginRef("profile", el as HTMLElement | null)}
                  onClick={(e) => triggerOriginTransition("profile", e.currentTarget)}
                  id="nav-profile-avatar"
                  className="flex items-center gap-2 p-1.5 pl-2 pr-3 sm:pr-4 rounded-xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-[#0D151D]/80 hover:border-black/20 dark:hover:border-white/30 shadow-xs hover:shadow-sm transition-all active:scale-96"
                >
                  <img
                    src={
                      user.profilePhotoUrl ||
                      user.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || "User")}&background=161616&color=ffffff`
                    }
                    alt={user.fullName || "User"}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/20"
                  />
                  <span className="hidden xs:inline sm:inline text-xs sm:text-sm font-bold text-neutral-900 dark:text-white max-w-[100px] sm:max-w-[120px] truncate">
                    {user.role === "admin" || user.role === "superadmin" ? "Admin" : user.fullName?.split(" ")[0] || tCommon.profile}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <Link
                  to="/login"
                  id="nav-login-btn"
                  ref={(el) => registerOriginRef("login", el as HTMLElement | null)}
                  onClick={(e) => triggerOriginTransition("login", e.currentTarget)}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-96"
                >
                  {tCommon.login}
                </Link>

                <Link
                  to="/register"
                  id="nav-signup-btn"
                  ref={(el) => registerOriginRef("register", el as HTMLElement | null)}
                  onClick={(e) => triggerOriginTransition("register", e.currentTarget)}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-neutral-950 hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 rounded-xl shadow-xs hover:shadow active:scale-96 transition-all cursor-pointer"
                >
                  <span>{tCommon.signup}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
    </>
  );
}

export default Navbar;
