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
  LifeBuoy,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authService } from "../../services/auth";
import { notificationsService } from "../../services/notifications";

const menuItems = [
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
      { to: "/admin/agents", icon: UserCheck, label: "Agents" },
      { to: "/admin/products", icon: Package, label: "Products" },
      { to: "/admin/categories", icon: Grid, label: "Categories" },
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
      { to: "/admin/pin-verification", icon: KeyRound, label: "8-Digit PIN Verification" },
    ],
  },
  {
    group: "Account",
    items: [
      { to: "/admin/profile", icon: User, label: "Profile" },
      { to: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({
    reports: 0,
    notifications: 0,
    support: 0,
    users: 0,
  });
  const currentUser = authService.getCurrentUser();

  const fetchBadges = async () => {
    try {
      const stats = await notificationsService.getDashboardStats();
      setBadges({
        reports: stats.pendingReports || 0,
        notifications: stats.unreadNotifications || 0,
        support: 0,
        users: stats.pendingUsers || 0,
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

  return (
    <TooltipProvider delayDuration={100}>
      {/* Mobile Menu Trigger Button */}
      <div className="lg:hidden fixed top-3.5 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-white dark:bg-[#10151B] border border-[#E6E4E9] dark:border-white/10 text-[#242424] dark:text-[#F5F5F5] shadow-xs hover:bg-[#F8F7F9] dark:hover:bg-white/5 transition-colors"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
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

      {/* Icon-Only Compact Navigation Rail (Symbols Only, No Names) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-[72px] bg-white dark:bg-[#0D1524] border-r border-[#E6E4E9] dark:border-[#273244] transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Workspace Brand Header (Icon Only) */}
        <div className="flex items-center justify-center h-16 border-b border-[#E6E4E9] dark:border-[#273244] shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileOpen(false)}
                className="group relative flex items-center justify-center"
                aria-label="Payent Admin Portal"
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] flex items-center justify-center shadow-[0_4px_12px_rgba(255,118,85,0.25)] transition-transform group-hover:scale-105">
                  <span className="font-mono font-black text-sm text-white tracking-tight">P</span>
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#273244] shadow-xl"
            >
              Payent Admin Portal
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation Rail Items (Symbols Only) */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-2 no-scrollbar flex flex-col items-center">
          {menuItems.map((group, gIdx) => (
            <div key={group.group} className="w-full flex flex-col items-center space-y-1.5">
              {/* Subtle hairline between groups */}
              {gIdx > 0 && (
                <div className="w-7 h-[1px] bg-[#E6E4E9] dark:bg-[#273244] my-1 opacity-70" />
              )}

              {group.items.map((it) => {
                const active =
                  pathname === it.to ||
                  (it.to !== "/admin/dashboard" && pathname.startsWith(it.to)) ||
                  (it.to === "/admin/payments" && pathname.startsWith("/admin/wallet")) ||
                  (it.to === "/admin/support" &&
                    (pathname.startsWith("/admin/help") || pathname.startsWith("/admin/messages"))) ||
                  (it.to === "/admin/activity-logs" && pathname.startsWith("/admin/activity"));
                const badgeVal = "badgeKey" in it ? getBadgeValue(it.badgeKey) : 0;

                return (
                  <Tooltip key={it.to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={it.to}
                        onClick={() => setMobileOpen(false)}
                        aria-label={it.label}
                        className={cn(
                          "group relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-150 cursor-pointer",
                          active
                            ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] dark:border dark:border-[#3B82F6]/40 shadow-xs"
                            : "text-[#77757D] hover:text-[#242424] hover:bg-[#F8F7F9] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC] dark:hover:bg-[#162238]/60"
                        )}
                      >
                        <it.icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                            active
                              ? "text-white dark:text-[#F8FAFC]"
                              : "text-[#77757D] group-hover:text-[#242424] dark:text-[#9AAAC2] dark:group-hover:text-[#F8FAFC]"
                          )}
                        />

                        {/* Pending notification dot */}
                        {badgeVal > 0 && (
                          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FF7655] ring-2 ring-white dark:ring-[#0D1524]" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={12}
                      className="bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#273244] shadow-xl flex items-center gap-2"
                    >
                      <span>{it.label}</span>
                      {badgeVal > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#FF7655] text-white text-[10px] font-mono">
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

        {/* User Identity & Logout Rail Footer (Symbols Only) */}
        <div className="p-2 border-t border-[#E6E4E9] dark:border-[#273244] shrink-0 flex flex-col items-center gap-2">
          {/* User Profile Avatar with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/admin/profile"
                aria-label="Admin Profile"
                className="group relative h-9 w-9 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] flex items-center justify-center text-xs font-bold text-[#242424] dark:text-[#F8FAFC] hover:border-[#3B82F6]/50 transition-colors"
              >
                <span>
                  {currentUser?.fullName?.[0]?.toUpperCase() ||
                    currentUser?.email?.[0]?.toUpperCase() ||
                    "A"}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-[#273244] shadow-xl flex flex-col"
            >
              <span>{currentUser?.fullName || "Administrator"}</span>
              <span className="text-[10px] text-[#9AAAC2] font-mono font-normal">
                {currentUser?.email || "admin@payent.in"}
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Sign Out Button (Symbol Only with Tooltip) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="group relative h-9 w-9 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                aria-label="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#242424] text-white dark:bg-[#162238] dark:text-rose-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-black/10 dark:border-[#273244] shadow-xl"
            >
              Sign Out
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
