import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useRouterState } from "@tanstack/react-router";
import { SearchBar } from "./SearchBar";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown } from "./ProfileDropdown";
import { useState, useEffect } from "react";
import { adminWS, ConnectionStatus } from "@/admin/services/websocket";

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Dashboard", subtitle: "Overview of your Payent platform" },
  "/admin/dashboard": { title: "Dashboard", subtitle: "Overview of your Payent platform" },
  "/admin/analytics": { title: "Analytics", subtitle: "Platform growth, revenue and operational insights" },
  "/admin/users": { title: "Users", subtitle: "Manage all Payent and Payrent users" },
  "/admin/agents": { title: "Agents", subtitle: "Manage verified agents and vendor accounts" },
  "/admin/products": { title: "Products", subtitle: "Manage all listed equipment and rental products" },
  "/admin/categories": { title: "Categories", subtitle: "Manage product categories" },
  "/admin/bookings": { title: "Bookings", subtitle: "Track and manage all rental bookings" },
  "/admin/payments": { title: "Payments", subtitle: "Track all transactions and payouts" },
  "/admin/reviews": { title: "Reviews", subtitle: "Manage user reviews and ratings" },
  "/admin/reports": { title: "Reports", subtitle: "Generate and view platform reports" },
  "/admin/notifications": { title: "Notifications", subtitle: "Send and manage platform notifications" },
  "/admin/support": { title: "Support", subtitle: "Manage user support tickets" },
  "/admin/activity-logs": { title: "Activity Logs", subtitle: "Track all administrative activities" },
  "/admin/pin-verification": { title: "8-Digit PIN Verification", subtitle: "Verify product security PIN (Vendor 4-digit + Renter 4-digit)" },
  "/admin/profile": { title: "Profile", subtitle: "Administrator profile details and credentials" },
  "/admin/settings": { title: "Settings", subtitle: "Platform configuration and preferences" },
};

export function Topbar() {
  const { theme, toggle } = useTheme();
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  let currentMeta = ROUTE_META[currentPath];
  if (!currentMeta) {
    if (currentPath.startsWith("/admin/products/") && currentPath.length > "/admin/products/".length) {
      currentMeta = {
        title: "Product Inspection",
        subtitle: "Listing verification, specifications & price configuration",
      };
    } else {
      currentMeta = {
        title: "Admin Portal",
        subtitle: "Payent Marketplace Operations",
      };
    }
  }

  useEffect(() => {
    const unsubscribe = adminWS.onStatusChange((status) => {
      setWsStatus(status);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-8 h-16 bg-[var(--admin-bg)]/95 border-b border-[var(--admin-border)] backdrop-blur-md transition-colors duration-200">
      {/* Left side: Current page title & contextual subtitle */}
      <div className="flex flex-col justify-center min-w-0 pr-4">
        <h1 className="text-base font-semibold tracking-tight text-[var(--admin-text)] truncate">
          {currentMeta.title}
        </h1>
        <p className="text-[11px] text-[var(--admin-text-secondary)] truncate hidden sm:block">
          {currentMeta.subtitle}
        </p>
      </div>

      {/* Right side: Operational Controls, Search & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Live Stream Telemetry Indicator (Desktop) */}
        <div className="hidden lg:flex items-center">
          {wsStatus === "LIVE" ? (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live Telemetry
            </span>
          ) : wsStatus === "CONNECTING" ? (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Connecting...
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-black/5 dark:bg-white/5 text-[var(--admin-text-secondary)] border border-[var(--admin-border)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
              Online
            </span>
          )}
        </div>

        {/* Global Search */}
        <SearchBar />

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--admin-border)] transition-all cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notification Dropdown */}
        <NotificationDropdown />

        {/* Subtle Divider */}
        <div className="h-5 w-[1px] bg-[var(--admin-border)] shrink-0" />

        {/* Admin Profile */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
