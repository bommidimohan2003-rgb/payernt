import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Package,
  Grid,
  Calendar,
  CreditCard,
  Star,
  Flag,
  Bell,
  BarChart3,
  Shield,
  ShieldCheck,
  LifeBuoy,
  Settings,
  User,
  LogOut,
  X,
  KeyRound,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { PayentAgentIcon } from "@/components/common/PayentAgentIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authService } from "../../services/auth";
import { notificationsService } from "../../services/notifications";

const menuGroups = [
  {
    group: "Core",
    items: [
      { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    group: "Management",
    items: [
      { to: "/admin/users", icon: Users, label: "Users", badgeKey: "users" },
      {
        to: "/admin/kyc",
        icon: ShieldCheck,
        label: "KYC verification",
        badgeKey: "kyc",
      },
      { to: "/admin/agents", icon: UserCheck, label: "Agents" },
      { to: "/admin/products", icon: Package, label: "Products" },
      { to: "/admin/categories", icon: Grid, label: "Categories" },
      { to: "/admin/knowledge", icon: PayentAgentIcon as any, label: "Knowledge base" },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/admin/bookings", icon: Calendar, label: "Bookings" },
      { to: "/admin/payments", icon: CreditCard, label: "Payments" },
      { to: "/admin/reviews", icon: Star, label: "Reviews" },
      {
        to: "/admin/reports",
        icon: Flag,
        label: "Reports",
        badgeKey: "reports",
      },
    ],
  },
  {
    group: "Security & support",
    items: [
      {
        to: "/admin/notifications",
        icon: Bell,
        label: "Notifications",
        badgeKey: "notifications",
      },
      {
        to: "/admin/support",
        icon: LifeBuoy,
        label: "Support",
        badgeKey: "support",
      },
      { to: "/admin/activity-logs", icon: Shield, label: "Activity logs" },
      {
        to: "/admin/pin-verification",
        icon: KeyRound,
        label: "PIN verification",
      },
    ],
  },
] as const;

interface SidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const TOOLTIP_CLASS =
  "bg-[var(--admin-card)] text-[var(--admin-text)] text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--admin-border)] shadow-md flex items-center gap-2";

const SIDEBAR_COLLAPSE_KEY = "payent:admin:sidebar_collapsed";

export function Sidebar({
  className = "",
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState({
    reports: 0,
    notifications: 0,
    support: 0,
    users: 0,
    kyc: 0,
  });
  const currentUser = authService.getCurrentUser();

  const isMobileOpen =
    controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const setMobileOpen = (open: boolean) => {
    if (onMobileOpenChange) {
      onMobileOpenChange(open);
    } else {
      setInternalMobileOpen(open);
    }
  };

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const fetchBadges = async () => {
    try {
      const stats = await notificationsService.getDashboardStats();
      let pendingKyc = 0;
      try {
        const { kycService } = await import("../../services/kyc");
        const kycStats = await kycService.getKycStats();
        pendingKyc = kycStats.pending || 0;
      } catch {
        // fallback
      }

      setBadges({
        reports: stats.pendingReports || 0,
        notifications: stats.unreadNotifications || 0,
        support: 0,
        users: stats.pendingUsers || 0,
        kyc: pendingKyc,
      });
    } catch {
      // Ignore badge errors silently
    }
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
  };

  const getBadgeValue = (key?: string) => {
    if (!key) return 0;
    return badges[key as keyof typeof badges] || 0;
  };

  const isRouteActive = (to: string) => {
    if (pathname === to) return true;
    if (to !== "/admin/dashboard" && pathname.startsWith(to)) return true;
    if (to === "/admin/payments" && pathname.startsWith("/admin/wallet")) return true;
    if (
      to === "/admin/support" &&
      (pathname.startsWith("/admin/help") || pathname.startsWith("/admin/messages"))
    ) {
      return true;
    }
    if (to === "/admin/activity-logs" && pathname.startsWith("/admin/activity")) return true;
    return false;
  };

  const renderExpandedGroups = (options: { compact?: boolean; onItemClick?: () => void }) => (
    <>
      {menuGroups.map((group, gIdx) => (
        <div
          key={group.group}
          className={cn(
            "space-y-1",
            gIdx > 0 ? (options.compact ? "mt-4" : "mt-6") : "mt-1"
          )}
        >
          <p className="px-2.5 pb-1 text-[11px] font-medium text-[var(--admin-text-muted)]">
            {group.group}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.to);
            const badgeVal = "badgeKey" in item ? getBadgeValue(item.badgeKey) : 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={options.onItemClick}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 rounded-lg font-medium transition-colors cursor-pointer",
                  options.compact ? "h-8 text-[13px]" : "h-9 text-sm",
                  active
                    ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                    : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-4 flex items-center justify-center shrink-0">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        active ? "text-[var(--admin-text)]" : "text-[var(--admin-text-muted)]"
                      )}
                      strokeWidth={1.5}
                    />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {badgeVal > 0 && (
                  <span className="text-[11px] font-mono tabular-nums text-[var(--admin-text-muted)] shrink-0">
                    {badgeVal > 99 ? "99+" : badgeVal}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <TooltipProvider delayDuration={120}>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Slide-in Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--admin-sidebar)] border-r border-[var(--admin-border)] flex flex-col overflow-hidden lg:hidden select-none"
          >
            {/* Header matching Topbar h-16 height */}
            <div className="h-16 px-4 shrink-0 flex items-center justify-between border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-3">
                <img
                  src="/brand/payent-logo.svg"
                  alt="Payent Operations"
                  className="w-8 h-8 select-none shrink-0"
                  width={32}
                  height={32}
                />
                <div>
                  <span className="text-sm font-semibold text-[var(--admin-text)] block leading-tight">
                    Payent Operations
                  </span>
                  <span className="text-xs text-[var(--admin-text-muted)]">
                    Admin console
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Mobile Navigation Groups */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
              {renderExpandedGroups({ onItemClick: () => setMobileOpen(false) })}

              <div className="space-y-1 mt-6">
                <p className="px-2.5 pb-1 text-[11px] font-medium text-[var(--admin-text-muted)]">
                  Account
                </p>
                <Link
                  to="/admin/profile"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    pathname === "/admin/profile"
                      ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                      : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 border border-transparent"
                  )}
                >
                  <span className="w-4 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                  </span>
                  <span>Profile</span>
                </Link>
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    pathname === "/admin/settings"
                      ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                      : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 border border-transparent"
                  )}
                >
                  <span className="w-4 flex items-center justify-center shrink-0">
                    <Settings className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                  </span>
                  <span>Settings</span>
                </Link>
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-[var(--admin-border)] space-y-2 shrink-0">
              <div className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-[var(--admin-elevated)]">
                <ProfilePhoto
                  src={
                    currentUser?.profilePhotoUrl ||
                    (currentUser as any)?.profile_photo_url ||
                    currentUser?.avatar
                  }
                  alt={currentUser?.fullName || "Admin"}
                  size="sm"
                  shape="rounded"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--admin-text)] truncate">
                    {currentUser?.fullName || "Administrator"}
                  </p>
                  <p className="text-xs text-[var(--admin-text-muted)] truncate">
                    {currentUser?.email || "admin@payent.in"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="w-full h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span>Sign out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Docked Sidebar — aligned flush with Topbar h-16 header band */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 bg-[var(--admin-sidebar)] border-r border-[var(--admin-border)] sticky top-0 h-screen transition-[width] duration-200 select-none z-30",
          collapsed ? "w-16" : "w-60",
          className
        )}
        aria-label="Admin Navigation"
      >
        {/* Top Header Slot matching Topbar exact h-16 height and bottom divider */}
        <div
          className={cn(
            "h-16 shrink-0 border-b border-[var(--admin-border)] flex items-center",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/dashboard"
                  className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer select-none"
                  aria-label="Payent Admin Portal"
                >
                  <img
                    src="/brand/payent-logo.svg"
                    alt="Payent Admin Portal"
                    className="w-7 h-7 select-none"
                    width={28}
                    height={28}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className={TOOLTIP_CLASS}>
                Payent Admin
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-2.5 min-w-0 rounded-lg py-1 hover:opacity-90 transition-opacity"
              >
                <img
                  src="/brand/payent-logo.svg"
                  alt="Payent Admin"
                  className="w-7 h-7 select-none shrink-0"
                  width={28}
                  height={28}
                />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-[var(--admin-text)] block leading-tight truncate">
                    Payent
                  </span>
                  <span className="text-[11px] text-[var(--admin-text-muted)] block leading-tight">
                    Admin console
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={toggleCollapsed}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Center Navigation List */}
        {collapsed ? (
          <nav className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-1 py-3 px-2">
            {menuGroups.map((group, gIdx) => (
              <div key={group.group} className="w-full flex flex-col items-center gap-1">
                {gIdx > 0 && (
                  <div className="w-6 h-px bg-[var(--admin-border)] my-2 shrink-0" />
                )}

                {group.items.map((it) => {
                  const active = isRouteActive(it.to);
                  const badgeVal = "badgeKey" in it ? getBadgeValue(it.badgeKey) : 0;

                  return (
                    <Tooltip key={it.to}>
                      <TooltipTrigger asChild>
                        <Link
                          to={it.to}
                          aria-label={it.label}
                          className={cn(
                            "relative group flex items-center justify-center h-9 w-9 rounded-lg transition-colors duration-150 cursor-pointer shrink-0",
                            active
                              ? "bg-[var(--admin-text)] text-[var(--admin-bg)]"
                              : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]"
                          )}
                        >
                          <it.icon className="h-4 w-4" strokeWidth={1.5} />

                          {badgeVal > 0 && (
                            <span
                              className={cn(
                                "absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-md text-[11px] font-mono tabular-nums font-medium border",
                                active
                                  ? "bg-[var(--admin-bg)] text-[var(--admin-text)] border-[var(--admin-border)]"
                                  : "bg-[var(--admin-elevated)] text-[var(--admin-text)] border-[var(--admin-border)]"
                              )}
                            >
                              {badgeVal > 99 ? "99+" : badgeVal}
                            </span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12} className={TOOLTIP_CLASS}>
                        <span>{it.label}</span>
                        {badgeVal > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] text-xs font-mono tabular-nums">
                            {badgeVal}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </nav>
        ) : (
          <nav className="flex-1 w-full overflow-y-auto no-scrollbar px-3 py-3">
            {renderExpandedGroups({ compact: true })}
          </nav>
        )}

        {/* Bottom Stack: Expand toggle (when collapsed), Settings, Profile & Logout */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 w-full py-3 border-t border-[var(--admin-border)] mt-auto shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="flex items-center justify-center h-9 w-9 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className={TOOLTIP_CLASS}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/settings"
                  aria-label="Settings"
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg transition-colors duration-150 cursor-pointer",
                    pathname === "/admin/settings"
                      ? "bg-[var(--admin-text)] text-[var(--admin-bg)]"
                      : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]"
                  )}
                >
                  <Settings className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className={TOOLTIP_CLASS}>
                Settings
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/profile"
                  aria-label="Admin Profile"
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg overflow-hidden border transition-colors duration-150 cursor-pointer",
                    pathname === "/admin/profile"
                      ? "border-[var(--admin-text)]"
                      : "border-[var(--admin-border)] hover:border-[var(--admin-text-secondary)]"
                  )}
                >
                  <ProfilePhoto
                    src={
                      currentUser?.profilePhotoUrl ||
                      (currentUser as any)?.profile_photo_url ||
                      currentUser?.avatar
                    }
                    alt={currentUser?.fullName || "Admin"}
                    size="sm"
                    shape="rounded"
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className={TOOLTIP_CLASS}>
                <div className="flex flex-col">
                  <span className="font-medium">{currentUser?.fullName || "Administrator"}</span>
                  <span className="text-xs text-[var(--admin-text-muted)] font-mono font-normal">
                    {currentUser?.email || "admin@payent.in"}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-colors duration-150 cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className={TOOLTIP_CLASS}>
                <span className="text-destructive">Sign out</span>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="p-3 border-t border-[var(--admin-border)] space-y-1 shrink-0">
            <Link
              to="/admin/settings"
              className={cn(
                "w-full h-8 flex items-center gap-2.5 px-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
                pathname === "/admin/settings"
                  ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 border border-transparent"
              )}
            >
              <span className="w-4 flex items-center justify-center shrink-0">
                <Settings
                  className={cn(
                    "h-4 w-4",
                    pathname === "/admin/settings"
                      ? "text-[var(--admin-text)]"
                      : "text-[var(--admin-text-muted)]"
                  )}
                  strokeWidth={1.5}
                />
              </span>
              <span>Settings</span>
            </Link>

            <Link
              to="/admin/profile"
              className={cn(
                "w-full h-8 flex items-center gap-2.5 px-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
                pathname === "/admin/profile"
                  ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]/60 border border-transparent"
              )}
            >
              <span className="w-4 flex items-center justify-center shrink-0">
                <User
                  className={cn(
                    "h-4 w-4",
                    pathname === "/admin/profile"
                      ? "text-[var(--admin-text)]"
                      : "text-[var(--admin-text-muted)]"
                  )}
                  strokeWidth={1.5}
                />
              </span>
              <span className="truncate">{currentUser?.fullName || "Profile"}</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-8 flex items-center gap-2.5 px-2.5 rounded-lg text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <span className="w-4 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <span>Sign out</span>
            </button>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
