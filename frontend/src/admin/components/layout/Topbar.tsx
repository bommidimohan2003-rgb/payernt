import { Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useRouterState } from "@tanstack/react-router";
import { SearchBar } from "./SearchBar";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown } from "./ProfileDropdown";
import { useState, useEffect } from "react";
import { adminWS, ConnectionStatus } from "@/admin/services/websocket";
import { cn } from "@/lib/utils";

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Dashboard", subtitle: "Marketplace operations and review queue" },
  "/admin/dashboard": { title: "Dashboard", subtitle: "Marketplace operations and review queue" },
  "/admin/analytics": { title: "Analytics", subtitle: "Booking trends, utilization, and revenue" },
  "/admin/users": { title: "Users", subtitle: "Account directory and KYC status" },
  "/admin/kyc": { title: "KYC verification", subtitle: "Identity document inspection for vendors and renters" },
  "/admin/agents": { title: "Agents", subtitle: "Verified equipment lenders and fleet performance" },
  "/admin/products": { title: "Products", subtitle: "Equipment listings and price configuration" },
  "/admin/categories": { title: "Categories", subtitle: "Catalog equipment categories" },
  "/admin/knowledge": { title: "Knowledge base", subtitle: "Support retrieval articles and drafts" },
  "/admin/bookings": { title: "Bookings", subtitle: "Rental orders, handovers, and cancellations" },
  "/admin/payments": { title: "Payments", subtitle: "Transactions, escrow settlements, and refunds" },
  "/admin/wallet": { title: "Payments", subtitle: "Transactions, escrow settlements, and refunds" },
  "/admin/reviews": { title: "Reviews", subtitle: "Customer feedback and moderation" },
  "/admin/reports": { title: "Reports", subtitle: "Platform exports and dispute resolution" },
  "/admin/notifications": { title: "Notifications", subtitle: "System and operational alerts" },
  "/admin/support": { title: "Support", subtitle: "Customer tickets and escalations" },
  "/admin/help": { title: "Support", subtitle: "Customer tickets and escalations" },
  "/admin/messages": { title: "Support", subtitle: "Customer tickets and escalations" },
  "/admin/activity-logs": { title: "Activity logs", subtitle: "Administrative audit trail" },
  "/admin/activity": { title: "Activity logs", subtitle: "Administrative audit trail" },
  "/admin/pin-verification": { title: "PIN verification", subtitle: "Verify vendor and renter 8-digit handover code" },
  "/admin/profile": { title: "Profile", subtitle: "Administrator account credentials" },
  "/admin/settings": { title: "Settings", subtitle: "Marketplace configuration and theme" },
};

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("DISCONNECTED");
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  let currentMeta = ROUTE_META[currentPath];
  if (!currentMeta) {
    if (currentPath.startsWith("/admin/products/") && currentPath.length > "/admin/products/".length) {
      currentMeta = {
        title: "Product inspection",
        subtitle: "Listing verification, specifications, and pricing",
      };
    } else if (currentPath.startsWith("/admin/kyc/") && currentPath.length > "/admin/kyc/".length) {
      currentMeta = {
        title: "KYC application",
        subtitle: "Government document check and decision",
      };
    } else {
      currentMeta = {
        title: "Admin portal",
        subtitle: "Payent marketplace operations",
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

  const statusMeta =
    wsStatus === "LIVE" || wsStatus === "ONLINE"
      ? { label: "Live", dotClass: "bg-[var(--admin-success)]" }
      : wsStatus === "POLLING"
      ? { label: "Synced", dotClass: "bg-[var(--admin-success)]" }
      : wsStatus === "CONNECTING"
      ? { label: "Connecting", dotClass: "bg-[var(--admin-warning)]" }
      : { label: "Polling", dotClass: "bg-[var(--admin-text-muted)]" };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 lg:px-8 h-16 bg-[var(--admin-sidebar)] border-b border-[var(--admin-border)] transition-colors duration-150">
      {/* Left: Mobile Drawer Trigger + Current Page Heading */}
      <div className="flex items-center gap-3 min-w-0 lg:w-56 xl:w-64 shrink-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-[var(--admin-text)] truncate">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-[var(--admin-text-muted)] truncate hidden xl:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Symbol-Free Search Bar with Typewriter Animation */}
      <div className="flex-1 min-w-0 flex justify-end sm:justify-center">
        <SearchBar className="max-w-44 sm:max-w-xs lg:max-w-sm xl:max-w-md" />
      </div>

      {/* Right: Operational Telemetry, Theme, Notifications & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div
          className="hidden xl:inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-xs text-[var(--admin-text-secondary)] font-mono tabular-nums"
          title={`WebSocket telemetry: ${wsStatus}`}
        >
          <span className={cn("h-2 w-2 rounded-full shrink-0", statusMeta.dotClass)} />
          <span>{statusMeta.label}</span>
        </div>

        <button
          type="button"
          onClick={toggle}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] border border-transparent hover:border-[var(--admin-border)] transition-colors cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>

        <NotificationDropdown />

        <div className="hidden sm:block h-4 w-px bg-[var(--admin-border)] shrink-0" />

        <ProfileDropdown />
      </div>
    </header>
  );
}
