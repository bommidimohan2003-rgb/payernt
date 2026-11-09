import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Sun, Moon, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/common/LogoIcon";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { SearchOverlay } from "@/components/home/SearchOverlay";

export function Navbar() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOverlayOpen((prev) => !prev);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/otp" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/otp") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify");

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-colors duration-200",
          scrolled
            ? "bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 shadow-xs"
            : "bg-white dark:bg-[#1E1E1E] border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          {/* 1. paYent Logo */}
          <div className="flex items-center shrink-0">
            <Link
              to="/payent"
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white rounded-lg select-none py-1 transition-colors"
              id="nav-logo"
              aria-label="paYent Rentals Home"
            >
              <LogoIcon showTagline={false} />
            </Link>
          </div>

          {/* 2. Search Trigger (hidden on auth/login pages, width reduced, symbol removed) */}
          {!isAuthPage && (
            <div className="flex-1 max-w-[240px] md:max-w-[280px] hidden sm:block">
              <button
                type="button"
                onClick={() => setSearchOverlayOpen(true)}
                id="nav-desktop-search-btn"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-neutral-300 dark:border-neutral-700/90 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-neutral-950 dark:hover:border-white hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer text-xs sm:text-sm shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <Search className="h-4 w-4 stroke-[1.75] shrink-0" aria-hidden="true" />
                <span className="truncate">Search rentals</span>
              </button>
            </div>
          )}

          {/* 3. Controls: Search (mobile), Theme Toggle, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Icon Button (>= 44x44px touch target, hidden on auth/login pages) */}
            {!isAuthPage && (
              <button
                type="button"
                onClick={() => setSearchOverlayOpen(true)}
                id="nav-mobile-search-btn"
                aria-label="Search Rentals"
                className="sm:hidden flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-950 dark:hover:border-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <Search className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
              </button>
            )}

            {/* Quick Monochrome Theme Toggle (>= 44x44px touch target on mobile) */}
            {mounted && (
              <button
                type="button"
                onClick={toggle}
                aria-label={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                className="h-11 w-11 sm:h-10 sm:w-10 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-950 dark:hover:border-white bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4 stroke-[1.75]" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Profile Navigation */}
            {mounted && user ? (
              <Link
                to="/profile"
                id="nav-profile-btn"
                aria-label="My Profile"
                className="flex items-center gap-2 min-h-[44px] sm:min-h-[40px] p-1.5 pl-2 pr-3 sm:pr-4 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-950 dark:hover:border-white text-neutral-900 dark:text-white transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <ProfilePhoto
                  src={user.profilePhotoUrl || user.profile_photo_url || user.avatar}
                  alt={user.fullName || "User"}
                  size="sm"
                  shape="circle"
                />
                <span className="hidden xs:inline sm:inline text-xs sm:text-sm font-semibold max-w-[110px] truncate">
                  {user.fullName?.split(" ")[0] || "Profile"}
                </span>
              </Link>
            ) : isAuthPage ? null : (
              <Link
                to="/login"
                id="nav-login-cta-btn"
                className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
              >
                <UserIcon className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden="true" />
                <span>Log In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Full Search Overlay */}
      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
      />
    </>
  );
}

export default Navbar;
