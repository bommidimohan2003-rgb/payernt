import { useState, useEffect } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Radio,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
      { to: "/admin/users", icon: Users, label: "Users" },
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({
    reports: 0,
    notifications: 0,
    support: 0,
  });
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const fetchBadges = async () => {
    try {
      const stats = await notificationsService.getDashboardStats();
      setBadges({
        reports: stats.pendingReports || 0,
        notifications: stats.unreadNotifications || 0,
        support: 0,
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
    navigate({ to: "/" });
  };

  const getBadgeValue = (key?: string) => {
    if (!key) return 0;
    return badges[key as keyof typeof badges] || 0;
  };

  return (
    <>
      {/* Mobile Menu Trigger Button */}
      <div className="lg:hidden fixed top-3.5 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-card border border-border/80 text-foreground shadow-xs hover:bg-secondary transition-colors"
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

      {/* Main Workspace Navigation Rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-card border-r border-border/70 transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:h-screen shrink-0 select-none",
          collapsed ? "w-[72px]" : "w-[264px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border/50 shrink-0">
          <Link
            to="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 overflow-hidden group"
          >
            <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span className="font-mono font-black text-xs text-emerald-500">P</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-extrabold text-sm tracking-tight text-foreground">
                    PAYENT
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                    OPS
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium truncate">
                  Control Center
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Rail Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={collapsed ? "Expand rail (⌘+B)" : "Collapse rail"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Navigation Groups List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5 no-scrollbar">
          {menuItems.map((group) => (
            <div key={group.group} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest font-mono">
                  {group.group}
                </div>
              )}
              {group.items.map((it) => {
                const active =
                  pathname === it.to ||
                  (it.to !== "/admin/dashboard" && pathname.startsWith(it.to)) ||
                  (it.to === "/admin/payments" && pathname.startsWith("/admin/wallet")) ||
                  (it.to === "/admin/support" && (pathname.startsWith("/admin/help") || pathname.startsWith("/admin/messages"))) ||
                  (it.to === "/admin/activity-logs" && pathname.startsWith("/admin/activity"));
                const badgeVal = "badgeKey" in it ? getBadgeValue(it.badgeKey) : 0;

                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                      active
                        ? "bg-secondary text-foreground font-semibold before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-emerald-500 before:rounded-r"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <it.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-emerald-500" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {!collapsed && badgeVal > 0 && (
                      <span className="ml-auto shrink-0 flex items-center justify-center px-1.5 py-0.2 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-mono font-bold">
                        {badgeVal}
                      </span>
                    )}
                    {collapsed && badgeVal > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Identity & Logout Rail Footer */}
        <div className="p-3 border-t border-border/50 shrink-0 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1.5 rounded-md bg-secondary/40 border border-border/40 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.fullName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">
                  {currentUser?.fullName || currentUser?.email?.split("@")[0] || "Administrator"}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {currentUser?.email || "admin@payent"}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Sign out of Admin Session"
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
