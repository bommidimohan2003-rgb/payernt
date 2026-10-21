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
  KeyRound,
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({
    reports: 0,
    notifications: 0,
    support: 0,
    users: 0,
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
    <>
      {/* Mobile Menu Trigger Button */}
      <div className="lg:hidden fixed top-3.5 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-[#10151B] border border-white/10 text-[#F5F5F5] shadow-xs hover:bg-white/5 transition-colors"
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
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Workspace Navigation Rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-[#E6E4E9] transition-[width,background-color] duration-200 ease-out lg:sticky lg:top-0 lg:h-screen shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]",
          collapsed ? "w-[72px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between px-3.5 h-16 border-b border-[#E6E4E9] shrink-0">
          <Link
            to="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 overflow-hidden group"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(255,118,85,0.25)] transition-transform group-hover:scale-105">
              <span className="font-mono font-black text-sm text-white tracking-tight">P</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-extrabold text-sm tracking-tight text-[#242424]">
                    Payent
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#FF7655] font-bold bg-[#FF7655]/10 border border-[#FF7655]/25 px-1.5 py-0.2 rounded">
                    Admin
                  </span>
                </div>
                <span className="text-[10px] text-[#77757D] font-medium truncate">
                  Enterprise Ops
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Rail Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-[#F8F7F9] text-[#77757D] hover:text-[#242424] transition-colors cursor-pointer"
            title={collapsed ? "Expand rail" : "Collapse rail"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Navigation Groups List */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4 no-scrollbar">
          {menuItems.map((group) => (
            <div key={group.group} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[9px] font-bold text-[#77757D] uppercase tracking-widest font-mono">
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
                    className={cn(
                      "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150",
                      active
                        ? "bg-[#242424] text-white font-semibold shadow-xs"
                        : "text-[#77757D] hover:text-[#242424] hover:bg-[#F8F7F9]",
                      collapsed && "justify-center px-0 h-10 w-10 mx-auto"
                    )}
                  >
                    <it.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-white" : "text-[#77757D] group-hover:text-[#242424]"
                      )}
                    />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {!collapsed && badgeVal > 0 && (
                      <span className={cn(
                        "ml-auto shrink-0 flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold",
                        active ? "bg-white/20 text-white" : "bg-[#FF7655]/15 text-[#FF7655] border border-[#FF7655]/30"
                      )}>
                        {badgeVal}
                      </span>
                    )}
                    {collapsed && badgeVal > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#FF7655] ring-2 ring-white" />
                    )}

                    {/* Collapsed Tooltip */}
                    {collapsed && (
                      <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[#242424] text-white text-xs font-semibold whitespace-nowrap shadow-xl border border-black/10 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center gap-2">
                        <span>{it.label}</span>
                        {badgeVal > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#FF7655] text-white text-[10px] font-mono">
                            {badgeVal}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Identity & Logout Rail Footer */}
        <div className="p-3 border-t border-[#E6E4E9] shrink-0 space-y-2">
          {!collapsed && (
            <div className="px-2.5 py-2 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#242424] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.fullName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#242424] truncate">
                  {currentUser?.fullName || currentUser?.email?.split("@")[0] || "Administrator"}
                </div>
                <div className="text-[10px] text-[#77757D] font-mono truncate">
                  {currentUser?.email || "admin@payent.in"}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Sign out of Admin Session"
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer",
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
