import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  ShieldCheck,
  X,
  Package,
  Layers,
  Activity,
  ArrowUpRight,
  BarChart3,
  Database,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  notificationsService,
  DashboardStats,
  DashboardCharts,
  DashboardActivity,
} from "../services/notifications";
import { productsService } from "../services/products";
import { bookingsService } from "../services/bookings";
import { usersService } from "../services/users";
import {
  AdminProduct,
  AdminBooking,
  AdminUser,
  AdminReport,
  AdminSupportTicket,
  checkAdminHealth,
} from "../services/api";
import { adminWS, ConnectionStatus } from "../services/websocket";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AnalyticsTab = "Bookings" | "Products" | "Users" | "Delivery" | "Finance";
type DateRange = "7D" | "30D" | "90D";

export function Dashboard() {
  const shouldReduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const accentHex = isDark ? "#4CC38A" : "#047857";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("Bookings");
  const [dateRange, setDateRange] = useState<DateRange>("30D");

  const [pendingProductsList, setPendingProductsList] = useState<AdminProduct[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("LIVE");
  const [healthStatus, setHealthStatus] = useState<"ok" | "degraded" | "checking">("ok");

  const days = useMemo(() => {
    switch (dateRange) {
      case "7D":
        return 7;
      case "90D":
        return 90;
      default:
        return 30;
    }
  }, [dateRange]);

  const fetchDashboardData = useCallback(async (selectedDays: number, showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);

      const [
        statsData,
        chartsData,
        activityData,
        bookingsRes,
        productsRes,
        usersRes,
        reportsRes,
        ticketsRes,
        pendingProdRes,
      ] = await Promise.allSettled([
        notificationsService.getDashboardStats(),
        notificationsService.getDashboardCharts(selectedDays),
        notificationsService.getRecentActivity(),
        bookingsService.getBookings(),
        productsService.getProducts(),
        usersService.getUsers(),
        notificationsService.getReports().catch(() => []),
        notificationsService.getSupportTickets().catch(() => []),
        productsService.getPendingApprovalProducts().catch(() => []),
      ]);

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (chartsData.status === "fulfilled") setCharts(chartsData.value);
      if (activityData.status === "fulfilled") setRecentActivity(activityData.value);
      if (bookingsRes.status === "fulfilled") {
        const val = bookingsRes.value;
        setBookings(Array.isArray(val) ? val : ((val as any)?.items || []));
      }
      if (productsRes.status === "fulfilled") {
        const val = productsRes.value;
        setProducts(Array.isArray(val) ? val : ((val as any)?.items || []));
      }
      if (usersRes.status === "fulfilled") {
        const val = usersRes.value;
        setUsers(Array.isArray(val) ? val : ((val as any)?.items || []));
      }
      if (reportsRes.status === "fulfilled") {
        const val = reportsRes.value;
        setReports(Array.isArray(val) ? val : ((val as any)?.items || []));
      }
      if (ticketsRes.status === "fulfilled") {
        const val = ticketsRes.value;
        setSupportTickets(Array.isArray(val) ? val : ((val as any)?.items || []));
      }
      if (pendingProdRes.status === "fulfilled") {
        const val = pendingProdRes.value;
        setPendingProductsList(Array.isArray(val) ? val : ((val as any)?.items || []));
      }

      try {
        const health = await checkAdminHealth();
        setHealthStatus(health);
      } catch {
        setHealthStatus("ok");
      }

      const now = new Date();
      setLastSyncTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );

      if (showToast) toast.success("Dashboard synchronized");
    } catch {
      if (showToast) toast.error("Failed to refresh dashboard data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(days, false);
  }, [days, fetchDashboardData]);

  useEffect(() => {
    adminWS.connect();
    const unsub = adminWS.onStatusChange((status) => {
      setWsStatus(status);
    });
    return () => unsub();
  }, []);

  const handleApproveProduct = async (id: string, title: string) => {
    try {
      setApprovingId(id);
      await productsService.approveProduct(id);
      setPendingProductsList((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Listing "${title}" approved`);
    } catch {
      toast.error("Failed to approve product");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectProduct = async (id: string, title: string) => {
    try {
      setRejectingId(id);
      await productsService.rejectProduct(id, "Does not meet platform specifications.");
      setPendingProductsList((prev) => prev.filter((p) => p.id !== id));
      toast.info(`Listing "${title}" rejected`);
    } catch {
      toast.error("Failed to reject product");
    } finally {
      setRejectingId(null);
    }
  };

  const handleApproveUser = async (id: string, name: string) => {
    try {
      setApprovingUserId(id);
      await usersService.approveUser(id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id || u.accountId === id ? { ...u, status: "approved", verified: true } : u
        )
      );
      toast.success(`Account "${name}" approved`);
    } catch {
      toast.error("Failed to approve user");
    } finally {
      setApprovingUserId(null);
    }
  };

  const pendingUsersList = useMemo(() => {
    return users.filter((u) => {
      if (u.role === "admin") return false;
      const s = String(u.status || "").toUpperCase();
      return (
        s === "PENDING" ||
        s === "PENDING_REVIEW" ||
        s === "UNVERIFIED" ||
        (!u.verified && s !== "ACTIVE" && s !== "APPROVED" && s !== "SUSPENDED" && s !== "REJECTED")
      );
    });
  }, [users]);

  const openSupportTicketsCount = useMemo(() => {
    return supportTickets.filter((t) => t.status === "open" || t.status === "pending").length;
  }, [supportTickets]);

  const openReportsCount = useMemo(() => {
    return reports.filter((r) => r.status === "open").length;
  }, [reports]);

  const totalBookingsVal = stats?.monthlyBookings ?? bookings.length;
  const activeRentalsVal =
    stats?.activeBookings ??
    bookings.filter((b) => ["active", "in_progress", "confirmed", "delivered"].includes(b.status)).length;
  const pendingApprovalsVal =
    (stats?.pendingUsers ?? pendingUsersList.length) +
    (stats?.pendingProducts ?? pendingProductsList.length) +
    (stats?.pendingWithdrawals ?? 0);
  const openIssuesVal = openReportsCount + openSupportTicketsCount;

  const bookingDistributionData = useMemo(() => {
    const act = stats?.activeBookings ?? bookings.filter((b) => b.status === "active").length;
    const pend = bookings.filter((b) => b.status === "pending" || b.status === "requested").length;
    const ong = bookings.filter((b) => b.status === "confirmed" || b.status === "delivered" || b.status === "in_progress").length;
    const comp = stats?.completedBookings ?? bookings.filter((b) => b.status === "completed").length;
    const canc = bookings.filter((b) => b.status === "cancelled").length;

    return [
      { name: "Active", value: act, color: accentHex },
      { name: "Pending", value: pend, color: isDark ? "#F5B942" : "#D97706" },
      { name: "Ongoing", value: ong, color: isDark ? "#85858B" : "#525252" },
      { name: "Completed", value: comp, color: isDark ? "#52525B" : "#A1A1AA" },
      { name: "Cancelled", value: canc, color: isDark ? "#E5484D" : "#C93636" },
    ];
  }, [stats, bookings, accentHex, isDark]);

  const totalDistributedOrders = useMemo(() => {
    return bookingDistributionData.reduce((acc, curr) => acc + curr.value, 0);
  }, [bookingDistributionData]);

  const upcomingBookingsList = useMemo(() => {
    return bookings
      .filter((b) => ["pending", "confirmed", "active"].includes(b.status))
      .slice(0, 5);
  }, [bookings]);

  const issuesList = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      type: "report" | "ticket";
      severity: string;
      date: string;
      author: string;
      status: string;
    }> = [];

    reports.slice(0, 3).forEach((r) => {
      items.push({
        id: r.id,
        title: r.reason || `Report against ${r.reportedType || "entity"}`,
        type: "report",
        severity: r.status === "open" ? "High" : "Normal",
        date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent",
        author: r.reporterName || "User",
        status: r.status || "open",
      });
    });

    supportTickets.slice(0, 3).forEach((t) => {
      items.push({
        id: t.id,
        title: t.subject || "Customer support request",
        type: "ticket",
        severity: t.priority === "high" || t.priority === "urgent" ? "Critical" : "Normal",
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Recent",
        author: t.userName || "Customer",
        status: t.status || "open",
      });
    });

    return items.slice(0, 5);
  }, [reports, supportTickets]);

  const topRentedGear = useMemo(() => {
    if (charts?.topProducts && charts.topProducts.length > 0) {
      return charts.topProducts.slice(0, 4).map((tp, idx) => ({
        id: `tp-${idx}`,
        title: tp.name,
        category: "Equipment",
        rentalCount: tp.rentals,
      }));
    }
    return [...products]
      .sort((a, b) => (b.rentalCount || b.reviewsCount || 0) - (a.rentalCount || a.reviewsCount || 0))
      .slice(0, 4);
  }, [charts, products]);

  const deliveredRate = useMemo(() => {
    if (!bookings.length) return 0;
    const delivered = bookings.filter(
      (b) => b.status === "completed" || b.deliveryStatus === "DELIVERED" || b.status === "active"
    ).length;
    return Math.round((delivered / bookings.length) * 100);
  }, [bookings]);

  const activeChartConfig = useMemo(() => {
    switch (activeTab) {
      case "Bookings":
        return {
          data: charts?.bookingChart || [],
          dataKey: "bookings",
        };
      case "Finance":
        return {
          data: charts?.revenueChart || [],
          dataKey: "revenue",
        };
      case "Users":
        return {
          data: charts?.userGrowth || [],
          dataKey: "users",
        };
      case "Products":
        return {
          data: charts?.productGrowth || [],
          dataKey: "products",
        };
      case "Delivery":
        return {
          data: (charts?.bookingChart || []).map((b) => ({
            name: b.name,
            fulfillment: b.bookings > 0 ? 100 : 0,
          })),
          dataKey: "fulfillment",
        };
      default:
        return {
          data: charts?.bookingChart || [],
          dataKey: "bookings",
        };
    }
  }, [activeTab, charts]);

  const categoryVelocity = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || "General gear";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = products.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [products]);

  const overdueActions = useMemo(() => {
    const list: Array<{ id: string; title: string; category: string; duration: string; urgent: boolean }> = [];

    pendingProductsList.forEach((p, idx) => {
      list.push({
        id: `p-${p.id}`,
        title: `Verify gear listing "${p.title}"`,
        category: "Catalog moderation",
        duration: idx === 0 ? "Priority review" : "Pending review",
        urgent: idx === 0,
      });
    });

    pendingUsersList.forEach((u, idx) => {
      list.push({
        id: `u-${u.id}`,
        title: `Verify KYC documents for ${u.fullName || u.email}`,
        category: "Identity verification",
        duration: idx === 0 ? "Priority review" : "Pending review",
        urgent: idx === 0,
      });
    });

    return list.slice(0, 4);
  }, [pendingProductsList, pendingUsersList]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.2,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  const panelVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -4,
      transition: { duration: shouldReduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* 1. Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--admin-border)]">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-[var(--admin-text)]">
            Operations overview
          </h2>
          <p className="text-xs text-[var(--admin-text-secondary)]">
            Platform performance, review queue, and operational status
          </p>
        </div>

        {/* Global Controls: Telemetry, Date Range & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-xs text-[var(--admin-text-secondary)]">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                wsStatus === "LIVE"
                  ? "bg-[var(--admin-success)]"
                  : wsStatus === "CONNECTING"
                  ? "bg-[var(--admin-warning)]"
                  : "bg-[var(--admin-text-muted)]"
              )}
            />
            <span>
              {wsStatus === "LIVE" ? "Live stream" : wsStatus === "CONNECTING" ? "Connecting" : "Synced"}
            </span>
          </div>

          <div className="bg-[var(--admin-elevated)] p-1 rounded-lg border border-[var(--admin-border)] flex items-center gap-1">
            {(["7D", "30D", "90D"] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 h-6 text-xs font-medium rounded-md transition-colors cursor-pointer tabular-nums",
                  dateRange === range
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                    : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-[var(--admin-text-secondary)] px-3 h-8 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)]">
            <Clock className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
            <span>{lastSyncTime || "Synced"}</span>
          </div>

          <button
            onClick={() => fetchDashboardData(days, true)}
            disabled={isRefreshing}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] border border-[var(--admin-border)] transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* 2. Core KPI Row (Quiet Neutral Cards with Semantic Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Bookings */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
              Total bookings
            </span>
            <Calendar className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-medium text-[var(--admin-text)] tabular-nums my-3">
            {loading ? "—" : totalBookingsVal.toLocaleString()}
          </div>
          <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--admin-success)] font-medium tabular-nums">
              +{stats?.todayBookings || 0} today
            </span>
            <Link
              to="/admin/bookings"
              className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Bookings</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* KPI 2: Active Rentals */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
              Active rentals
            </span>
            <Package className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-medium text-[var(--admin-text)] tabular-nums my-3">
            {loading ? "—" : activeRentalsVal.toLocaleString()}
          </div>
          <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-[var(--admin-text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
              <span>In circulation</span>
            </span>
            <Link
              to="/admin/bookings"
              className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Roster</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* KPI 3: Pending Approvals */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
              Pending approvals
            </span>
            <Clock className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-medium text-[var(--admin-text)] tabular-nums my-3">
            {loading ? "—" : pendingApprovalsVal.toLocaleString()}
          </div>
          <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--admin-text-secondary)] tabular-nums">
              <strong className="font-medium text-[var(--admin-warning)]">
                {stats?.pendingUsers ?? pendingUsersList.length}
              </strong>{" "}
              KYC ·{" "}
              <strong className="font-medium text-[var(--admin-warning)]">
                {stats?.pendingProducts ?? pendingProductsList.length}
              </strong>{" "}
              gear
            </span>
            <a
              href="#operational-queue"
              className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Review</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {/* KPI 4: Open Issues */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
              Open issues
            </span>
            <AlertTriangle className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
          </div>
          <div className="text-3xl font-medium text-[var(--admin-text)] tabular-nums my-3">
            {loading ? "—" : openIssuesVal.toLocaleString()}
          </div>
          <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--admin-text-secondary)] tabular-nums">
              <strong className="font-medium text-[var(--admin-error)]">
                {openReportsCount}
              </strong>{" "}
              reports ·{" "}
              <strong className="font-medium text-[var(--admin-error)]">
                {openSupportTicketsCount}
              </strong>{" "}
              support
            </span>
            <Link
              to="/admin/reports"
              className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>Resolve</span>
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Primary Chart & Distribution Panel (Asymmetric 2/3 + 1/3 Moment) */}
      <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--admin-border)] pb-4">
          <div className="bg-[var(--admin-elevated)] p-1 rounded-lg border border-[var(--admin-border)] inline-flex flex-wrap items-center gap-1">
            {(["Bookings", "Products", "Users", "Delivery", "Finance"] as AnalyticsTab[]).map(
              (tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 h-7 text-xs font-medium rounded-md transition-colors cursor-pointer",
                      isActive
                        ? "bg-[var(--admin-card)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                        : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] border border-transparent"
                    )}
                  >
                    {tab}
                  </button>
                );
              }
            )}
          </div>

          <div className="text-xs text-[var(--admin-text-secondary)] tabular-nums hidden sm:block">
            Window: <span className="font-medium text-[var(--admin-text)]">Last {days} days</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                  {activeTab === "Bookings" && "Booking volume"}
                  {activeTab === "Products" && "Equipment listings"}
                  {activeTab === "Users" && "Account registrations"}
                  {activeTab === "Delivery" && "Delivery fulfillment"}
                  {activeTab === "Finance" && "Gross rental volume"}
                </h3>
                <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                  {activeTab === "Bookings" && "Daily reservation count across the marketplace"}
                  {activeTab === "Products" && "Hardware listings added across categories"}
                  {activeTab === "Users" && "New customer, lender, and courier registrations"}
                  {activeTab === "Delivery" && "Completed and active handover rate across orders"}
                  {activeTab === "Finance" && "Processed transaction turnover"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[var(--admin-text)] tabular-nums">
                  {activeTab === "Bookings" && `${totalBookingsVal.toLocaleString()} orders`}
                  {activeTab === "Products" && `${products.length.toLocaleString()} listings`}
                  {activeTab === "Users" && `${users.length.toLocaleString()} accounts`}
                  {activeTab === "Delivery" && `${deliveredRate}% fulfilled`}
                  {activeTab === "Finance" && `₹${((stats?.totalRevenue ?? stats?.monthlyRevenue) || 0).toLocaleString("en-IN")}`}
                </div>
                <span className="text-xs font-mono text-[var(--admin-text-muted)] tabular-nums">
                  Last {days} days
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="w-full h-full"
                >
                  {activeChartConfig.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={activeChartConfig.data}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="payentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={accentHex} stopOpacity={0.22} />
                            <stop offset="95%" stopColor={accentHex} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke={isDark ? "rgba(237,237,237,0.06)" : "rgba(23,23,23,0.06)"}
                          strokeDasharray="3 3"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke={isDark ? "#85858B" : "#737373"}
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: isDark ? "rgba(237,237,237,0.08)" : "rgba(23,23,23,0.08)" }}
                        />
                        <YAxis
                          stroke={isDark ? "#85858B" : "#737373"}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? "#232325" : "#FFFFFF",
                            borderColor: isDark ? "rgba(237,237,237,0.12)" : "rgba(23,23,23,0.12)",
                            borderRadius: 8,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            color: isDark ? "#EDEDED" : "#171717",
                            fontSize: 12,
                          }}
                          labelStyle={{ color: isDark ? "#A1A1A6" : "#525252", fontWeight: 500 }}
                        />
                        <Area
                          type="monotone"
                          dataKey={activeChartConfig.dataKey}
                          stroke={accentHex}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#payentAreaGrad)"
                          isAnimationActive={!shouldReduceMotion}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--admin-elevated)]/40 rounded-lg border border-dashed border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)]">
                      <BarChart3 className="h-5 w-5 mb-2 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                      <span>No {activeTab.toLowerCase()} telemetry in selected window</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Secondary Distribution Panel (1 Col) */}
          <div className="bg-[var(--admin-elevated)]/50 rounded-xl border border-[var(--admin-border)] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
              <span className="text-xs font-semibold text-[var(--admin-text)]">
                Order status
              </span>
              <span className="text-xs font-mono text-[var(--admin-text-muted)]">Breakdown</span>
            </div>

            <div className="relative h-40 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingDistributionData.filter((d) => d.value > 0)}
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={!shouldReduceMotion}
                  >
                    {bookingDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={isDark ? "#19191B" : "#FFFFFF"}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-medium text-[var(--admin-text)] tabular-nums">
                  {totalDistributedOrders}
                </span>
                <span className="text-xs text-[var(--admin-text-muted)]">Orders</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-3 border-t border-[var(--admin-border)]">
              {bookingDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[var(--admin-text-secondary)] truncate">{item.name}</span>
                  </div>
                  <span className="font-mono font-medium text-[var(--admin-text)] tabular-nums ml-2">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Secondary Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Top Rented Gear */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                Top rented gear
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--admin-text-muted)]">Volume</span>
          </div>

          <div className="space-y-2">
            {topRentedGear.length > 0 ? (
              topRentedGear.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--admin-elevated)]/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--admin-text)] truncate">
                        {p.title}
                      </div>
                      <div className="text-xs text-[var(--admin-text-muted)] truncate">
                        {p.category || "Equipment"}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)] tabular-nums shrink-0 ml-2">
                    {p.rentalCount || 0}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[var(--admin-text-muted)]">
                No equipment rental records available
              </div>
            )}
          </div>
        </div>

        {/* Category Velocity */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                Category share
              </h3>
            </div>
            <Link
              to="/admin/categories"
              className="text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {categoryVelocity.length > 0 ? (
              categoryVelocity.map((cat, idx) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--admin-text)] font-medium truncate max-w-40">
                      {cat.name}
                    </span>
                    <span className="font-mono text-[var(--admin-text-secondary)] tabular-nums">
                      {cat.count} ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--admin-elevated)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        idx === 0 ? "bg-[var(--admin-success)]" : "bg-[var(--admin-text-muted)]"
                      )}
                      style={{ width: `${Math.min(cat.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[var(--admin-text-muted)]">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Platform Safeguards */}
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                Platform safeguards
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--admin-success)]">
              Enforced
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)]/60 border border-[var(--admin-border)] flex items-center justify-between">
              <span className="text-[var(--admin-text)]">Dual-PIN handover check</span>
              <span className="text-[var(--admin-success)] font-medium">Active</span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)]/60 border border-[var(--admin-border)] flex items-center justify-between">
              <span className="text-[var(--admin-text)]">Escrow settlement</span>
              <span className="text-[var(--admin-text-secondary)] font-mono">Razorpay</span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)]/60 border border-[var(--admin-border)] flex items-center justify-between">
              <span className="text-[var(--admin-text)]">Fulfillment completion</span>
              <span className="text-[var(--admin-text)] font-mono font-medium tabular-nums">
                {deliveredRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Operational Workspace: Needs Attention */}
      <div id="operational-queue" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">
              Needs attention
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs font-mono tabular-nums text-[var(--admin-text-secondary)]">
              {pendingApprovalsVal + openIssuesVal} items
            </span>
          </div>
          <span className="text-xs text-[var(--admin-text-muted)] hidden sm:inline">
            Pending listings, KYC reviews, and open disputes
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pending Approvals */}
          <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                  Pending approvals
                </h3>
              </div>
              <Link
                to="/admin/products"
                className="text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:underline"
              >
                Manage queue
              </Link>
            </div>

            <div className="space-y-2">
              {pendingProductsList.length > 0 || pendingUsersList.length > 0 ? (
                <>
                  {pendingProductsList.slice(0, 3).map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-warning)] shrink-0">
                            Gear
                          </span>
                          <span className="text-xs font-medium text-[var(--admin-text)] truncate">
                            {prod.title}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--admin-text-secondary)] truncate mt-1 tabular-nums">
                          ₹{(prod.dailyRate ?? prod.price ?? 0).toLocaleString("en-IN")}/day ·{" "}
                          {prod.ownerName || prod.owner?.name || "Vendor"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveProduct(prod.id, prod.title)}
                          disabled={approvingId === prod.id}
                          className="px-3 h-7 text-xs font-medium rounded-md bg-[var(--admin-text)] text-[var(--admin-bg)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          {approvingId === prod.id ? "Approving" : "Approve"}
                        </button>
                        <button
                          onClick={() => handleRejectProduct(prod.id, prod.title)}
                          disabled={rejectingId === prod.id}
                          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-[var(--admin-error)] transition-colors cursor-pointer"
                          title="Reject listing"
                          aria-label="Reject listing"
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingUsersList.slice(0, 2).map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] shrink-0">
                            KYC
                          </span>
                          <span className="text-xs font-medium text-[var(--admin-text)] truncate">
                            {u.fullName || u.email}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--admin-text-secondary)] truncate mt-1">
                          {u.role} · {u.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveUser(u.id, u.fullName || u.email)}
                          disabled={approvingUserId === u.id}
                          className="px-3 h-7 text-xs font-medium rounded-md bg-[var(--admin-text)] text-[var(--admin-bg)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          {approvingUserId === u.id ? "Approving" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-10 text-center bg-[var(--admin-elevated)]/30 rounded-lg border border-dashed border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)]">
                  <CheckCircle2 className="h-5 w-5 text-[var(--admin-success)] mx-auto mb-2" strokeWidth={1.5} />
                  <span>All submissions reviewed</span>
                </div>
              )}
            </div>
          </div>

          {/* Issues & Exceptions */}
          <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                  Issues & exceptions
                </h3>
              </div>
              <Link
                to="/admin/reports"
                className="text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-2">
              {issuesList.length > 0 ? (
                issuesList.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-mono px-1.5 py-0.5 rounded border shrink-0",
                            issue.severity === "Critical"
                              ? "bg-destructive/10 text-[var(--admin-error)] border-destructive/20"
                              : "bg-[var(--admin-card)] text-[var(--admin-warning)] border-[var(--admin-border)]"
                          )}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs font-medium text-[var(--admin-text)] truncate">
                          {issue.title}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--admin-text-secondary)] truncate mt-1">
                        {issue.author} · {issue.date}
                      </div>
                    </div>

                    <Link
                      to={issue.type === "report" ? "/admin/reports" : "/admin/support"}
                      className="px-3 h-7 inline-flex items-center text-xs font-medium rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors shrink-0"
                    >
                      Resolve
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center bg-[var(--admin-elevated)]/30 rounded-lg border border-dashed border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)]">
                  <CheckCircle2 className="h-5 w-5 text-[var(--admin-success)] mx-auto mb-2" strokeWidth={1.5} />
                  <span>No open reports or support disputes</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Upcoming Bookings & Action Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                Upcoming bookings
              </h3>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:underline"
            >
              View roster
            </Link>
          </div>

          <div className="space-y-2">
            {upcomingBookingsList.length > 0 ? (
              upcomingBookingsList.map((bk) => (
                <div
                  key={bk.id}
                  className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--admin-text)] truncate">
                      {bk.productTitle || `Booking #${bk.id.slice(0, 8)}`}
                    </div>
                    <div className="text-xs text-[var(--admin-text-secondary)] truncate mt-1 tabular-nums">
                      {bk.renterName || bk.customerName || "Customer"} · ₹
                      {(bk.totalAmount ?? bk.amount ?? 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-mono rounded-md capitalize border shrink-0",
                      bk.status === "active"
                        ? "bg-[var(--admin-success)]/10 text-[var(--admin-success)] border-[var(--admin-success)]/20"
                        : "bg-[var(--admin-card)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]"
                    )}
                  >
                    {bk.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[var(--admin-text-muted)]">
                No scheduled reservations active
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                Action required
              </h3>
            </div>
            <span className="text-xs font-mono tabular-nums text-[var(--admin-text-muted)]">
              {overdueActions.length} tasks
            </span>
          </div>

          <div className="space-y-2">
            {overdueActions.length > 0 ? (
              overdueActions.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--admin-text)] truncate">
                      {task.title}
                    </div>
                    <div className="text-xs text-[var(--admin-text-secondary)] truncate mt-1">
                      {task.category}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-mono rounded-md shrink-0 border",
                      task.urgent
                        ? "bg-destructive/10 text-[var(--admin-error)] border-destructive/20"
                        : "bg-[var(--admin-card)] text-[var(--admin-warning)] border-[var(--admin-border)]"
                    )}
                  >
                    {task.duration}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[var(--admin-text-muted)]">
                No pending action items
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Audit Trail & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                Recent activity trail
              </h3>
            </div>
            <Link
              to="/admin/activity-logs"
              className="text-xs font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:underline"
            >
              Audit logs
            </Link>
          </div>

          <div className="space-y-2">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--admin-text)]">{act.action}</span>
                    <div className="text-xs text-[var(--admin-text-secondary)] truncate mt-0.5">
                      {act.target || "Platform"} · {act.user || "System"}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[var(--admin-text-muted)] shrink-0">
                    {act.timestamp
                      ? new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Recent"}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[var(--admin-text-muted)]">
                No recent audit activity recorded
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--admin-text-muted)]" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                System health
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--admin-success)]">
              Operational
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[var(--admin-text)]">FastAPI service</div>
                <div className="text-[11px] font-mono text-[var(--admin-text-muted)]">/api/health/ready</div>
              </div>
              <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
            </div>

            <div className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[var(--admin-text)]">MySQL datastore</div>
                <div className="text-[11px] font-mono text-[var(--admin-text-muted)]">TiDB Cloud SSL</div>
              </div>
              <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
            </div>

            <div className="p-3 rounded-lg bg-[var(--admin-elevated)]/50 border border-[var(--admin-border)] flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[var(--admin-text)]">WebSocket stream</div>
                <div className="text-[11px] font-mono text-[var(--admin-text-muted)]">/api/admin/ws</div>
              </div>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  wsStatus === "LIVE" || wsStatus === "ONLINE" || wsStatus === "POLLING" || healthStatus === "ok"
                    ? "bg-[var(--admin-success)]"
                    : "bg-[var(--admin-warning)]"
                )}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs text-[var(--admin-text-muted)]">
            <span>Sync interval</span>
            <span className="font-mono text-[var(--admin-text)]">Realtime</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Dashboard;
