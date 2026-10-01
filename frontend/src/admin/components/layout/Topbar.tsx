import { Sun, Moon, Radio } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useRouterState } from "@tanstack/react-router";
import { SearchBar } from "./SearchBar";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown } from "./ProfileDropdown";
import { useState, useEffect } from "react";
import { adminWS, ConnectionStatus } from "@/admin/services/websocket";

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Dashboard", subtitle: "PAYENT marketplace overview & live telemetry" },
  "/admin/dashboard": { title: "Dashboard", subtitle: "PAYENT marketplace overview & live telemetry" },
  "/admin/analytics": { title: "Analytics", subtitle: "Marketplace performance, volume & growth insights" },
  "/admin/users": { title: "Users", subtitle: "Manage registered PAYENT accounts and access" },
  "/admin/agents": { title: "Agents", subtitle: "Verified gear fleet managers & lender profiles" },
  "/admin/products": { title: "Products", subtitle: "Catalog moderation, gear inventory & approvals" },
  "/admin/categories": { title: "Categories", subtitle: "Gear categories & taxonomy configuration" },
  "/admin/bookings": { title: "Bookings", subtitle: "Rental operations, schedules & gear dispatch" },
  "/admin/payments": { title: "Payments", subtitle: "Financial settlements, transactions & reconciliation" },
  "/admin/wallet": { title: "Wallet & Settlements", subtitle: "Financial settlements, transactions & reconciliation" },
  "/admin/reviews": { title: "Reviews", subtitle: "Customer feedback moderation & verified ratings" },
  "/admin/reports": { title: "Reports", subtitle: "Dispute resolution & marketplace compliance" },
  "/admin/notifications": { title: "Notifications", subtitle: "System announcements & communication dispatch" },
  "/admin/support": { title: "Support", subtitle: "Customer inquiries, help tickets & resolutions" },
  "/admin/messages": { title: "Messages & Inquiries", subtitle: "Customer inquiries, help tickets & resolutions" },
  "/admin/help": { title: "Help & Support", subtitle: "Platform guidance & ticket assistance" },
  "/admin/activity-logs": { title: "Activity Logs", subtitle: "Security audit trail & administrative event stream" },
  "/admin/activity": { title: "Activity Logs", subtitle: "Security audit trail & administrative event stream" },
  "/admin/profile": { title: "Profile", subtitle: "Admin account settings & authentication security" },
  "/admin/settings": { title: "Settings", subtitle: "Platform operations & marketplace configuration" },
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
        title: "Control Center",
        subtitle: "PAYENT Marketplace Operations",
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
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-8 h-16 bg-background/95 border-b border-border/70 backdrop-blur-md">
      {/* Left side: Current page title & contextual subtitle */}
      <div className="flex flex-col justify-center min-w-0 pr-4">
        <h1 className="text-base font-semibold tracking-tight text-foreground truncate">
          {currentMeta.title}
        </h1>
        <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
          {currentMeta.subtitle}
        </p>
      </div>

      {/* Right side: Operational Controls, Search & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Live Stream Telemetry Indicator (Desktop) */}
        <div className="hidden lg:flex items-center">
          {wsStatus === "LIVE" ? (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live Stream
            </span>
          ) : wsStatus === "CONNECTING" ? (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Connecting...
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-secondary text-muted-foreground border border-border/60 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"></span>
              Offline
            </span>
          )}
        </div>

        {/* Global Search */}
        <SearchBar />

        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-transparent hover:border-border/60 transition-all cursor-pointer"
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
        <div className="h-5 w-[1px] bg-border/60 shrink-0" />

        {/* Admin Profile */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
