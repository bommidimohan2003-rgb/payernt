import React, { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Sun,
  Moon,
  Search,
  Settings,
} from "lucide-react";
import type { LenderNotification, DemoUser, PayerntAccount, PayerntProduct, RentalRequest } from "../types";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/i18n";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { PayerntGlobalSearch } from "./PayerntGlobalSearch";

const PAYERNT_SEARCH_PLACEHOLDERS = [
  "Search my listed gear...",
  "Search bookings & renters...",
  "Search serial numbers...",
  "Search payouts & wallet...",
  "Search lender dashboard...",
];

interface PayerntNavbarProps {
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  pendingRequestsCount?: number;
  notifications?: LenderNotification[];
  products?: PayerntProduct[];
  rentalRequests?: RentalRequest[];
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
  products,
  rentalRequests,
  onMarkNotificationRead = () => {},
  onMarkAllNotificationsRead = () => {},
  activeUser,
  activeAccount,
  onToggleSidebar,
}: PayerntNavbarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle: toggleTheme } = useTheme();
  const { tCommon } = useLanguage();

  // Search modal state and typewriter animation
  const [searchOpen, setSearchOpen] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter animation effect
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayText("Search lender gear & bookings...");
      return;
    }

    const currentPhrase = PAYERNT_SEARCH_PLACEHOLDERS[phraseIndex % PAYERNT_SEARCH_PLACEHOLDERS.length];
    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, 60);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1800);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 30);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % PAYERNT_SEARCH_PLACEHOLDERS.length);
        }, 350);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

  // Global key shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const isNotifActive = pathname === "/payernt/notifications" || pathname.startsWith("/payernt/notifications");
  const isProfileActive = pathname === "/payernt/profile" || pathname.startsWith("/payernt/profile");
  const isSettingsActive = pathname === "/payernt/settings" || pathname.startsWith("/payernt/settings");

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-none border-b-0 shadow-none bg-background/85 backdrop-blur-2xl transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand Identity with Official Logo */}
          <div className="flex items-center shrink-0">
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

          {/* Center: Search Bar with Typewriter Animation */}
          <div className="flex-1 min-w-0 max-w-[170px] xs:max-w-[210px] sm:max-w-[270px] md:max-w-[340px] mx-1 sm:mx-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              id="payernt-nav-search-btn"
              aria-label="Search lender gear and bookings"
              className="w-full flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 min-h-[44px] sm:min-h-[40px] px-2.5 xs:px-3 sm:px-3.5 py-2 rounded-full border border-neutral-300 dark:border-neutral-700/80 bg-neutral-50 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400 hover:border-neutral-950 dark:hover:border-white hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer text-xs sm:text-sm shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-white"
            >
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[1.75] shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              <span className="truncate text-left text-[11px] xs:text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                {displayText || "\u00A0"}
              </span>
              <span
                className="inline-block w-[1.5px] h-3 sm:h-3.5 bg-neutral-900 dark:bg-neutral-100 animate-pulse ml-0.5 shrink-0"
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Right Controls in exact order: 1.notification, 2.theme, 3.profile, 4.settings */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* 1. Notification Icon - Direct Link to notification page with reliable tap/click targets */}
            <Link
              to="/payernt/notifications"
              preload="intent"
              preloadDelay={0}
              onClick={() => {
                if (onTabChange) onTabChange("notifications");
              }}
              className={`relative flex min-h-[44px] min-w-[44px] h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 ${
                isNotifActive
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-xs font-bold"
                  : "border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 bg-transparent hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
              }`}
              aria-label={tCommon.notifications}
              title={tCommon.notifications}
            >
              <Bell className="h-4 w-4 pointer-events-none" />
              {unreadCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold shadow-xs pointer-events-none ${
                    isNotifActive
                      ? "bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white border border-neutral-300 dark:border-neutral-700"
                      : "bg-destructive text-white"
                  }`}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* 2. Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex min-h-[44px] min-w-[44px] h-9 w-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 bg-transparent hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-neutral-300 hover:text-white transition-transform pointer-events-none" />
              ) : (
                <Moon className="h-4 w-4 text-neutral-700 hover:text-neutral-950 transition-transform pointer-events-none" />
              )}
            </button>

            {/* 3. Real User Profile Photo */}
            <Link
              to="/payernt/profile"
              preload="intent"
              preloadDelay={0}
              onClick={() => {
                if (onTabChange) onTabChange("profile");
              }}
              className={`flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 ${
                isProfileActive
                  ? "ring-2 ring-neutral-950 dark:ring-white shadow-xs"
                  : "hover:ring-2 hover:ring-primary/40"
              }`}
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
            </Link>

            {/* 4. Settings Button */}
            <Link
              to="/payernt/settings"
              preload="intent"
              preloadDelay={0}
              onClick={() => {
                if (onTabChange) onTabChange("settings");
              }}
              className={`flex min-h-[44px] min-w-[44px] h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 ${
                isSettingsActive
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-xs font-bold"
                  : "border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-500 bg-transparent hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
              }`}
              aria-label={tCommon.settings}
              title={tCommon.settings}
            >
              <Settings className="h-4 w-4 pointer-events-none" />
            </Link>
          </div>
        </div>
      </header>

      {/* Lender Global Search Command Palette Modal */}
      <PayerntGlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={onTabChange}
        products={products}
        rentalRequests={rentalRequests}
      />
    </>
  );
}

export default PayerntNavbar;
