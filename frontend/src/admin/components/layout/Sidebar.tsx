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
  Menu,
  X,
  KeyRound,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
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
        label: "KYC Verification",
        badgeKey: "kyc",
      },
      { to: "/admin/agents", icon: UserCheck, label: "Agents" },
      { to: "/admin/products", icon: Package, label: "Products" },
      { to: "/admin/categories", icon: Grid, label: "Categories" },
      { to: "/admin/knowledge", icon: BookOpen, label: "Knowledge Base" },
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
    group: "Security & Support",
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
      { to: "/admin/activity-logs", icon: Shield, label: "Activity Logs" },
      {
        to: "/admin/pin-verification",
        icon: KeyRound,
        label: "8-Digit PIN Verification",
      },
    ],
  },
] as const;

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = "" }: SidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({
    reports: 0,
    notifications: 0,
    support: 0,
    users: 0,
    kyc: 0,
  });
  const currentUser = authService.getCurrentUser();

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
    )
      return true;
    if (to === "/admin/activity-logs" && pathname.startsWith("/admin/activity")) return true;
    return false;
  };

  return (
    <TooltipProvider delayDuration={100}>
      {/* Mobile Menu Trigger Button */}
      <div className="lg:hidden fixed top-3.5 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-2xl bg-surface-navigation border border-border text-text-primary shadow-elevation-1 hover:bg-secondary transition-all cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? (
            <X className="h-4.5 w-4.5" />
          ) : (
            <Menu className="h-4.5 w-4.5" />
          )}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Slide-in Drawer (Matching Payernt Mobile Drawer Style) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-surface-navigation border-r border-border shadow-elevation-2 flex flex-col p-4 overflow-y-auto lg:hidden select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-border mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-black flex items-center justify-center shadow-md border border-neutral-800">
                  <span
                    className="font-sans font-black text-base text-white leading-none -translate-x-[0.5px]"
                    style={{ fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif" }}
                  >
                    p
                  </span>
                </div>
                <div>
                  <span className="text-sm font-bold text-text-primary">
                    Payent Ops
                  </span>
                  <p className="text-[10px] text-text-secondary">
                    Admin Workspace
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-xl hover:bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close Navigation"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 space-y-3.5 overflow-y-auto no-scrollbar">
              {menuGroups.map((group) => (
                <div key={group.group} className="space-y-1">
                  <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary/70">
                    {group.group}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.to);
                    const badgeVal =
                      "badgeKey" in item ? getBadgeValue(item.badgeKey) : 0;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                          active
                            ? "bg-accent-primary text-white shadow-md font-bold"
                            : "text-text-secondary hover:text-text-primary hover:bg-secondary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        {badgeVal > 0 && (
                          <span
                            className={cn(
                              "h-4 min-w-4 px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center",
                              active
                                ? "bg-white/20 text-white"
                                : "bg-accent-primary text-white"
                            )}
                          >
                            {badgeVal > 99 ? "99+" : badgeVal}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Account Group */}
              <div className="space-y-1 pt-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary/70">
                  Account
                </p>
                <Link
                  to="/admin/profile"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                    pathname === "/admin/profile"
                      ? "bg-accent-primary text-white shadow-md font-bold"
                      : "text-text-secondary hover:text-text-primary hover:bg-secondary"
                  )}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                    pathname === "/admin/settings"
                      ? "bg-accent-primary text-white shadow-md font-bold"
                      : "text-text-secondary hover:text-text-primary hover:bg-secondary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="pt-3 border-t border-border mt-3 space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-secondary/50">
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
                  <p className="text-xs font-bold text-text-primary truncate">
                    {currentUser?.fullName || "Administrator"}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate">
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Floating Rail (Matching PayerntSidebar Exactly) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col items-center justify-between py-4 px-2 w-16 sm:w-18 shrink-0 self-stretch my-3 ml-3 rounded-3xl bg-surface-navigation border border-border shadow-elevation-1 backdrop-blur-xl sticky top-3 h-[calc(100vh-1.5rem)] transition-colors duration-200 select-none z-30",
          className
        )}
        aria-label="Admin Navigation"
      >
        {/* Top Workspace Brand Icon */}
        <div className="flex flex-col items-center shrink-0 mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/dashboard"
                className="flex items-center justify-center h-11 w-11 rounded-2xl bg-black shadow-md hover:scale-105 transition-transform duration-200 cursor-pointer border border-neutral-800"
                aria-label="Payent Admin Portal"
              >
                <span
                  className="font-sans font-black text-xl text-white leading-none -translate-x-[0.5px]"
                  style={{ fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif" }}
                >
                  p
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#1E1E1E] dark:text-[#FFFFFF] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#383838] shadow-xl"
            >
              Payent Admin Portal
            </TooltipContent>
          </Tooltip>
          <div className="w-7 h-[1px] bg-border my-1.5 opacity-60" />
        </div>

        {/* Center Main Navigation Rail */}
        <nav className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center gap-2 py-1">
          {menuGroups.map((group, gIdx) => (
            <div
              key={group.group}
              className="w-full flex flex-col items-center gap-2"
            >
              {gIdx > 0 && (
                <div className="w-7 h-[1px] bg-border my-1 opacity-60 shrink-0" />
              )}

              {group.items.map((it) => {
                const active = isRouteActive(it.to);
                const badgeVal =
                  "badgeKey" in it ? getBadgeValue(it.badgeKey) : 0;

                return (
                  <Tooltip key={it.to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={it.to}
                        aria-label={it.label}
                        className={cn(
                          "relative group flex items-center justify-center h-11 w-11 rounded-2xl transition-all duration-200 cursor-pointer shrink-0",
                          active
                            ? "bg-accent-primary text-white shadow-md scale-102 font-bold"
                            : "text-text-secondary hover:text-text-primary hover:bg-secondary border border-transparent"
                        )}
                      >
                        <it.icon className="h-4.5 w-4.5 stroke-[1.8]" />

                        {badgeVal > 0 && (
                          <span
                            className={cn(
                              "absolute -top-1 -right-1 flex h-3.5 min-w-3.5 px-1 items-center justify-center rounded-full text-[9px] font-black shadow-xs",
                              active
                                ? "bg-white text-accent-primary"
                                : "bg-accent-primary text-white"
                            )}
                          >
                            {badgeVal > 99 ? "99+" : badgeVal}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={12}
                      className="bg-[#242424] text-white dark:bg-[#1E1E1E] dark:text-[#FFFFFF] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#383838] shadow-xl flex items-center gap-2"
                    >
                      <span>{it.label}</span>
                      {badgeVal > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-accent-primary text-white text-[10px] font-mono">
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

        {/* Bottom Stack: Settings, Profile & Logout */}
        <div className="flex flex-col items-center gap-2.5 w-full pt-3.5 border-t border-border mt-auto shrink-0">
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/settings"
                aria-label="Settings"
                className={cn(
                  "relative group flex items-center justify-center h-11 w-11 rounded-2xl transition-all duration-200 cursor-pointer",
                  pathname === "/admin/settings"
                    ? "bg-accent-primary text-white shadow-md font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-secondary border border-transparent"
                )}
              >
                <Settings className="h-4.5 w-4.5 stroke-[1.8]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#1E1E1E] dark:text-[#FFFFFF] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#383838] shadow-xl"
            >
              Settings
            </TooltipContent>
          </Tooltip>

          {/* Admin Profile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/profile"
                aria-label="Admin Profile"
                className={cn(
                  "relative group flex items-center justify-center h-11 w-11 rounded-2xl overflow-hidden border border-border hover:scale-105 transition-all cursor-pointer",
                  pathname === "/admin/profile"
                    ? "ring-2 ring-accent-primary border-transparent"
                    : "hover:border-foreground/40"
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
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#1E1E1E] dark:text-[#FFFFFF] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#383838] shadow-xl flex flex-col"
            >
              <span>{currentUser?.fullName || "Administrator"}</span>
              <span className="text-[10px] text-muted-foreground font-mono font-normal">
                {currentUser?.email || "admin@payent.in"}
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Sign Out Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center h-11 w-11 rounded-2xl text-destructive hover:bg-destructive/10 border border-transparent transition-all duration-200 cursor-pointer relative group"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5 stroke-[1.8]" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#1E1E1E] dark:text-rose-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-black/10 dark:border-[#383838] shadow-xl"
            >
              Sign Out
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
