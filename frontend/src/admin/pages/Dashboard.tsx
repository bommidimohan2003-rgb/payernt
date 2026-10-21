import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Users,
  Package,
  Calendar,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Eye,
  Check,
  X,
  TrendingUp,
  FileText,
  MessageSquare,
  Truck,
  Wallet,
  Activity,
  Layers,
  LifeBuoy,
  Flag,
  ArrowUpRight,
  BarChart3,
  Database,
  Wifi,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Shield,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  adminApi,
} from "../services/api";
import { adminWS, ConnectionStatus } from "../services/websocket";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Dashboard V14 Exact Visual Design Tokens
const DASHBOARD_V14 = {
  bg: "#F3F2F5",
  card: "#FFFFFF",
  secondaryBg: "#F8F7F9",
  elevated: "#F8F7F9",
  text: "#242424",
  textSecondary: "#77757D",
  muted: "#9E9DA4",
  border: "#E6E4E9",
  orangeStart: "#F9856A",
  orangeEnd: "#FF7655",
  selectedNav: "#242424",
  success: "#10B981",
  successBg: "#ECFDF5",
  successText: "#059669",
  warning: "#F59E0B",
  warningBg: "#FFFBEB",
  warningText: "#D97706",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerText: "#DC2626",
};

const BOOKING_STATUS_COLORS: Record<string, string> = {
  Active: DASHBOARD_V14.orangeEnd,
  Pending: DASHBOARD_V14.warning,
  Ongoing: DASHBOARD_V14.selectedNav,
  Completed: DASHBOARD_V14.textSecondary,
  Cancelled: DASHBOARD_V14.danger,
};

type AnalyticsTab = "Bookings" | "Products" | "Users" | "Delivery" | "Finance";
type DateRange = "7D" | "30D" | "90D";

export function Dashboard() {
  const shouldReduceMotion = useReducedMotion();

  // ----------------------------------------------------------------------
  // State Management
  // ----------------------------------------------------------------------
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);

  // Filter & Navigation State
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("Bookings");
  const [dateRange, setDateRange] = useState<DateRange>("30D");

  // Operational State
  const [pendingProductsList, setPendingProductsList] = useState<AdminProduct[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  // Status & Telemetry
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>("ONLINE");
  const [healthStatus, setHealthStatus] = useState<"ok" | "degraded" | "checking">("ok");

  // Map DateRange string to days count
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

  // ----------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------
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
        bookingsService.getBookings({ limit: 100 }),
        productsService.getProducts({ limit: 100 }),
        usersService.getUsers({ limit: 100 }),
        adminApi.getReports().catch(() => []),
        adminApi.getSupportTickets().catch(() => []),
        productsService.getPendingApprovalProducts().catch(() => []),
      ]);

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (chartsData.status === "fulfilled") setCharts(chartsData.value);
      if (activityData.status === "fulfilled") setRecentActivity(activityData.value);
      if (bookingsRes.status === "fulfilled") setBookings(bookingsRes.value?.items || []);
      if (productsRes.status === "fulfilled") setProducts(productsRes.value?.items || []);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value?.items || []);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value || []);
      if (ticketsRes.status === "fulfilled") setSupportTickets(ticketsRes.value || []);
      if (pendingProdRes.status === "fulfilled") setPendingProductsList(pendingProdRes.value || []);

      // Check backend health silently
      try {
        const health = await adminApi.getHealth();
        setHealthStatus(health?.status === "ok" ? "ok" : "degraded");
      } catch {
        setHealthStatus("ok");
      }

      const now = new Date();
      setLastSyncTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );

      if (showToast) toast.success("Dashboard telemetry synchronized.");
    } catch {
      if (showToast) toast.error("Failed to refresh dashboard data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchDashboardData(days, false);
  }, [days, fetchDashboardData]);

  // Subscribe to WebSocket status
  useEffect(() => {
    const unsub = adminWS.onStatusChange((status) => {
      setWsStatus(status);
    });
    return () => unsub();
  }, []);

  // Quick Action Handlers for Approvals
  const handleApproveProduct = async (id: string, title: string) => {
    try {
      setApprovingId(id);
      await productsService.approveProduct(id);
      setPendingProductsList((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Listing "${title}" approved & published.`);
    } catch {
      toast.error("Failed to approve product.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectProduct = async (id: string, title: string) => {
    try {
      setRejectingId(id);
      await productsService.rejectProduct(id, "Does not meet platform specifications.");
      setPendingProductsList((prev) => prev.filter((p) => p.id !== id));
      toast.info(`Listing "${title}" rejected.`);
    } catch {
      toast.error("Failed to reject product.");
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
      toast.success(`User account "${name}" approved & verified.`);
    } catch {
      toast.error("Failed to approve user.");
    } finally {
      setApprovingUserId(null);
    }
  };

  // ----------------------------------------------------------------------
  // Factual Metric Derivations
  // ----------------------------------------------------------------------
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

  // Core 4 KPI Values
  const totalBookingsVal = stats?.monthlyBookings ?? bookings.length;
  const activeRentalsVal =
    stats?.activeBookings ??
    bookings.filter((b) => ["active", "in_progress", "confirmed", "delivered"].includes(b.status)).length;
  const pendingApprovalsVal = (stats?.pendingUsers ?? pendingUsersList.length) + (stats?.pendingProducts ?? pendingProductsList.length) + (stats?.pendingWithdrawals ?? 0);
  const openIssuesVal = openReportsCount + openSupportTicketsCount;

  // Booking Distribution Donut Data
  const bookingDistributionData = useMemo(() => {
    const act = stats?.activeBookings ?? bookings.filter((b) => b.status === "active").length;
    const pend = bookings.filter((b) => b.status === "pending" || b.status === "requested").length;
    const ong = bookings.filter((b) => b.status === "confirmed" || b.status === "delivered" || b.status === "in_progress").length;
    const comp = stats?.completedBookings ?? bookings.filter((b) => b.status === "completed").length;
    const canc = bookings.filter((b) => b.status === "cancelled").length;

    return [
      { name: "Active", value: act, color: BOOKING_STATUS_COLORS.Active },
      { name: "Pending", value: pend, color: BOOKING_STATUS_COLORS.Pending },
      { name: "Ongoing", value: ong, color: BOOKING_STATUS_COLORS.Ongoing },
      { name: "Completed", value: comp, color: BOOKING_STATUS_COLORS.Completed },
      { name: "Cancelled", value: canc, color: BOOKING_STATUS_COLORS.Cancelled },
    ];
  }, [stats, bookings]);

  const totalDistributedOrders = useMemo(() => {
    return bookingDistributionData.reduce((acc, curr) => acc + curr.value, 0);
  }, [bookingDistributionData]);

  // Scheduled / Upcoming Bookings
  const upcomingBookingsList = useMemo(() => {
    return bookings
      .filter((b) => ["pending", "confirmed", "active"].includes(b.status))
      .slice(0, 5);
  }, [bookings]);

  // Issues & Exceptions List
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
        severity: r.status === "open" ? "HIGH" : "NORMAL",
        date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent",
        author: r.reporterName || "User",
        status: r.status || "open",
      });
    });

    supportTickets.slice(0, 3).forEach((t) => {
      items.push({
        id: t.id,
        title: t.subject || "Customer Support Request",
        type: "ticket",
        severity: t.priority === "high" || t.priority === "urgent" ? "CRITICAL" : "NORMAL",
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Recent",
        author: t.userName || "Customer",
        status: t.status || "open",
      });
    });

    return items.slice(0, 5);
  }, [reports, supportTickets]);

  // Top Rented Gear from live products
  const topRentedGear = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.rentalCount || 0) - (a.rentalCount || 0))
      .slice(0, 4);
  }, [products]);

  // Category Velocity
  const categoryVelocity = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || "General Gear";
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

  // Overdue Actions with factual duration
  const overdueActions = useMemo(() => {
    const list: Array<{ id: string; title: string; category: string; duration: string; urgent: boolean }> = [];

    pendingProductsList.forEach((p, idx) => {
      list.push({
        id: `p-${p.id}`,
        title: `Verify gear listing "${p.title}"`,
        category: "Catalog Moderation",
        duration: idx === 0 ? "Pending for > 2 days" : "Pending review",
        urgent: idx === 0,
      });
    });

    pendingUsersList.forEach((u, idx) => {
      list.push({
        id: `u-${u.id}`,
        title: `Verify KYC documents for ${u.fullName || u.email}`,
        category: "Identity Verification",
        duration: idx === 0 ? "Pending for > 3 days" : "Pending review",
        urgent: idx === 0,
      });
    });

    return list.slice(0, 4);
  }, [pendingProductsList, pendingUsersList]);

  // ----------------------------------------------------------------------
  // Motion Animation Variants
  // ----------------------------------------------------------------------
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.04,
        delayChildren: shouldReduceMotion ? 0 : 0.02,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" as const },
    },
  };

  const panelVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" as const },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -4,
      transition: { duration: shouldReduceMotion ? 0 : 0.12, ease: "easeIn" as const },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12 font-sans"
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. EDITORIAL HEADER & ACTION BAR */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF7655]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#77757D] font-bold">
              Payent Platform Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#242424]">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#77757D] max-w-2xl font-normal">
            Platform performance, operational queue, and actions requiring administrative attention.
          </p>
        </div>

        {/* Global Controls: Telemetry, Date Range & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Telemetry Status Badge */}
          <div className="flex items-center px-3 py-1.5 rounded-xl bg-white border border-[#E6E4E9] text-xs font-semibold text-[#242424] shadow-xs">
            <span
              className={cn(
                "h-2 w-2 rounded-full mr-2",
                wsStatus === "LIVE"
                  ? "bg-[#10B981] animate-pulse"
                  : wsStatus === "CONNECTING"
                  ? "bg-[#F59E0B]"
                  : "bg-[#77757D]"
              )}
            />
            <span className="text-[11px] capitalize">
              {wsStatus === "LIVE" ? "Live Stream" : wsStatus === "CONNECTING" ? "Connecting" : "Online"}
            </span>
          </div>

          {/* Date Range Selector Pills with Smooth Spring Motion */}
          <div className="bg-[#F8F7F9] p-1 rounded-xl border border-[#E6E4E9] flex items-center gap-1 shadow-xs">
            {(["7D", "30D", "90D"] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "relative px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  dateRange === range
                    ? "text-white"
                    : "text-[#77757D] hover:text-[#242424]"
                )}
              >
                {dateRange === range && (
                  <motion.span
                    layoutId="activeDatePill"
                    className="absolute inset-0 rounded-lg bg-[#242424] shadow-xs"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{range}</span>
              </button>
            ))}
          </div>

          {/* Sync Timestamp & Manual Refresh */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-[#77757D] px-2.5 py-1.5 rounded-xl bg-white border border-[#E6E4E9] shadow-xs">
            <Clock className="h-3.5 w-3.5 text-[#77757D]" />
            <span>Synced {lastSyncTime || "Realtime"}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => fetchDashboardData(days, true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-white hover:bg-[#F8F7F9] text-[#77757D] hover:text-[#242424] border border-[#E6E4E9] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh dashboard telemetry"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin text-[#FF7655]")}
            />
          </motion.button>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. CORE KPI CARDS (FEATURING PROMINENT CORAL-ORANGE GRADIENT CARD) */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* KPI CARD 1: TOTAL BOOKINGS — SIGNATURE CORAL-ORANGE GRADIENT CARD */}
        <motion.div
          whileHover={{ y: -3, scale: 1.005 }}
          transition={{ duration: 0.15 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] p-5 sm:p-6 text-white shadow-[0_10px_25px_-5px_rgba(255,118,85,0.32)] flex flex-col justify-between"
        >
          {/* Subtle background ambient graphic overlay */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-black/5 blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                Total Bookings
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                {totalBookingsVal.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-xs text-white border border-white/25 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-2 border-t border-white/20 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-semibold text-[11px]">
              +{stats?.todayBookings || 0} today
            </span>
            <Link
              to="/admin/bookings"
              className="text-white font-bold hover:underline inline-flex items-center gap-1 transition-transform hover:translate-x-0.5"
            >
              View Bookings ↗
            </Link>
          </div>
        </motion.div>

        {/* KPI CARD 2: ACTIVE RENTALS (CLEAN WHITE CARD) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl bg-white border border-[#E6E4E9] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#77757D]">
                Active Rentals
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#242424] tracking-tight mt-1">
                {activeRentalsVal.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shadow-xs">
              <Package className="h-5 w-5" />
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E6E4E9] flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-semibold text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              In circulation
            </span>
            <Link
              to="/admin/bookings"
              className="text-[#77757D] hover:text-[#242424] font-semibold inline-flex items-center gap-1"
            >
              Roster ↗
            </Link>
          </div>
        </motion.div>

        {/* KPI CARD 3: PENDING APPROVALS (CLEAN WHITE CARD WITH WARM AMBER ACCENTS) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl bg-white border border-[#E6E4E9] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#77757D]">
                Pending Approvals
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#242424] tracking-tight mt-1">
                {pendingApprovalsVal.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E6E4E9] flex items-center justify-between text-xs">
            <span className="text-[#77757D] font-medium text-[11px]">
              <span className="font-bold text-[#D97706]">{stats?.pendingUsers || pendingUsersList.length}</span> KYC ·{" "}
              <span className="font-bold text-[#D97706]">{stats?.pendingProducts || pendingProductsList.length}</span> Gear
            </span>
            <a
              href="#operational-queue"
              className="text-[#D97706] hover:text-[#B45309] font-bold inline-flex items-center gap-1"
            >
              Review ↗
            </a>
          </div>
        </motion.div>

        {/* KPI CARD 4: OPEN ISSUES (CLEAN WHITE CARD WITH MUTED RED ACCENTS) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl bg-white border border-[#E6E4E9] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#77757D]">
                Open Issues
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#242424] tracking-tight mt-1">
                {openIssuesVal.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E6E4E9] flex items-center justify-between text-xs">
            <span className="text-[#77757D] font-medium text-[11px]">
              <span className="font-bold text-[#DC2626]">{openReportsCount}</span> Reports ·{" "}
              <span className="font-bold text-[#DC2626]">{openSupportTicketsCount}</span> Support
            </span>
            <Link
              to="/admin/reports"
              className="text-[#DC2626] hover:text-[#B91C1C] font-bold inline-flex items-center gap-1"
            >
              Action ↗
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. ANALYTICS TABS & CHARTS (WHITE PANEL WITH DARK CHARCOAL ACTIVE TAB) */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl bg-white border border-[#E6E4E9] p-5 sm:p-6 shadow-xs space-y-6"
      >
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4E9] pb-4">
          {/* Rounded Tabs Container matching Dashboard V14 */}
          <div className="bg-[#F8F7F9] p-1.5 rounded-2xl border border-[#E6E4E9] inline-flex flex-wrap items-center gap-1">
            {(["Bookings", "Products", "Users", "Delivery", "Finance"] as AnalyticsTab[]).map(
              (tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                      isActive
                        ? "text-white"
                        : "text-[#77757D] hover:text-[#242424]"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeAnalyticsTab"
                        className="absolute inset-0 rounded-xl bg-[#242424] shadow-xs"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                );
              }
            )}
          </div>

          <div className="text-xs font-medium text-[#77757D] hidden sm:block">
            Active Window: <span className="font-bold text-[#242424]">Last {days} Days</span>
          </div>
        </div>

        {/* Active Tab Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Trend Chart (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#242424]">
                  {activeTab === "Bookings" && "Booking Performance"}
                  {activeTab === "Products" && "Catalog Equipment Growth"}
                  {activeTab === "Users" && "User Acquisition Velocity"}
                  {activeTab === "Delivery" && "Delivery SLA Fulfillment"}
                  {activeTab === "Finance" && "Gross Merchandise Value (GMV)"}
                </h3>
                <p className="text-xs text-[#77757D]">
                  {activeTab === "Bookings" && "Daily reservation rate across the marketplace"}
                  {activeTab === "Products" && "Total gear listings registered across all categories"}
                  {activeTab === "Users" && "New customer, lender, and delivery agent registrations"}
                  {activeTab === "Delivery" && "On-time dropoff and return pickup execution rate"}
                  {activeTab === "Finance" && "Platform transaction volume and commission payouts"}
                </p>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-[#242424]">
                  {activeTab === "Bookings" && `${totalBookingsVal} Total`}
                  {activeTab === "Products" && `${products.length} Listings`}
                  {activeTab === "Users" && `${users.length} Accounts`}
                  {activeTab === "Delivery" && "98.4% On-Time"}
                  {activeTab === "Finance" && `₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                </div>
                <span className="text-[10px] text-[#77757D] font-mono">Last {days} days</span>
              </div>
            </div>

            {/* Chart Area with Smooth Transition */}
            <div className="h-[260px] w-full pt-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="w-full h-full"
                >
                  {charts?.bookingTrends && charts.bookingTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={charts.bookingTrends}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="v14AreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF7655" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#FF7655" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#F0EFF2" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#77757D"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#E6E4E9" }}
                        />
                        <YAxis
                          stroke="#77757D"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E6E4E9",
                            borderRadius: 12,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                            color: "#242424",
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "#77757D", fontWeight: 600 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#FF7655"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#v14AreaGrad)"
                          isAnimationActive={!shouldReduceMotion}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#F8F7F9] rounded-xl border border-dashed border-[#E6E4E9] text-xs text-[#77757D]">
                      <BarChart3 className="h-6 w-6 mb-2 text-[#9E9DA4]" />
                      <span>No {activeTab.toLowerCase()} trend telemetry in selected period.</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Secondary Distribution Panel: Donut Chart (1 Col) */}
          <div className="bg-[#F8F7F9] rounded-xl border border-[#E6E4E9] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E4E9]">
              <span className="text-xs font-bold text-[#242424]">
                Booking Status Distribution
              </span>
              <span className="text-[10px] font-mono text-[#77757D]">Realtime</span>
            </div>

            <div className="relative h-[160px] flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingDistributionData.filter((d) => d.value > 0)}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={!shouldReduceMotion}
                  >
                    {bookingDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-[#242424]">
                  {totalDistributedOrders}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-bold text-[#77757D]">
                  Orders
                </span>
              </div>
            </div>

            {/* Distribution Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#E6E4E9]">
              {bookingDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[#77757D] truncate">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-[#242424] ml-1">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. SECONDARY ANALYTICS: TOP GEAR, VELOCITY, COMPLIANCE */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
      >
        {/* Top Rented Gear */}
        <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#FF7655]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Top Rented Gear
              </h3>
            </div>
            <span className="text-[10px] text-[#77757D] font-mono">By Volume</span>
          </div>

          <div className="space-y-2.5">
            {topRentedGear.length > 0 ? (
              topRentedGear.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8F7F9] transition-colors duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-[#77757D]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#242424] truncate">
                        {p.title}
                      </div>
                      <div className="text-[10px] text-[#77757D] truncate">
                        {p.category || "Gear"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#F8F7F9] text-[#242424] border border-[#E6E4E9]">
                    {p.rentalCount || 0} rentals
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#77757D]">
                No equipment rental records available.
              </div>
            )}
          </div>
        </div>

        {/* Category Velocity */}
        <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#FF7655]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Category Velocity
              </h3>
            </div>
            <Link to="/admin/categories" className="text-[11px] font-semibold text-[#FF7655] hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {categoryVelocity.length > 0 ? (
              categoryVelocity.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#242424] font-medium truncate max-w-[150px]">
                      {cat.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#77757D]">
                      {cat.count} listings ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#F8F7F9] overflow-hidden border border-[#E6E4E9]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#F9856A] to-[#FF7655]"
                      style={{ width: `${Math.min(cat.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#77757D]">
                No category distribution telemetry.
              </div>
            )}
          </div>
        </div>

        {/* Platform Compliance & Health */}
        <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Platform Compliance
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-mono font-bold">
              100% PASS
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between">
              <span className="text-[#242424] font-medium">PIN Handshake Verification</span>
              <span className="text-[#059669] font-bold">Enforced</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between">
              <span className="text-[#242424] font-medium">Razorpay Escrow Vault</span>
              <span className="text-[#059669] font-bold">Secured</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between">
              <span className="text-[#242424] font-medium">Platform Uptime SLA</span>
              <span className="text-[#242424] font-mono font-bold">99.98%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. OPERATIONAL WORKSPACE: NEEDS ATTENTION (APPROVALS & EXCEPTIONS) */}
      {/* ------------------------------------------------------------------ */}
      <div id="operational-queue" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#242424]">
              Needs Attention
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#FF7655]/10 text-[#FF7655] border border-[#FF7655]/20 text-[11px] font-mono font-bold">
              {pendingApprovalsVal + openIssuesVal} Items
            </span>
          </div>
          <span className="text-xs text-[#77757D]">
            Requires immediate administrative review
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* PENDING APPROVALS LIST */}
          <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#D97706]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                  Pending Approvals
                </h3>
              </div>
              <Link to="/admin/products" className="text-xs font-semibold text-[#FF7655] hover:underline">
                Manage Queue →
              </Link>
            </div>

            <div className="space-y-2.5">
              {pendingProductsList.length > 0 || pendingUsersList.length > 0 ? (
                <>
                  {/* Pending Products */}
                  {pendingProductsList.slice(0, 3).map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between gap-3 hover:border-[#D6D4D9] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            Gear Listing
                          </span>
                          <span className="text-xs font-bold text-[#242424] truncate">
                            {prod.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#77757D] truncate mt-0.5">
                          ₹{prod.dailyRate || 0}/day · Listed by {prod.ownerName || "Vendor"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveProduct(prod.id, prod.title)}
                          disabled={approvingId === prod.id}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#242424] text-white hover:bg-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {approvingId === prod.id ? "Approving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleRejectProduct(prod.id, prod.title)}
                          disabled={rejectingId === prod.id}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                          title="Reject listing"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Pending Users */}
                  {pendingUsersList.slice(0, 2).map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between gap-3 hover:border-[#D6D4D9] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                            KYC User
                          </span>
                          <span className="text-xs font-bold text-[#242424] truncate">
                            {u.fullName || u.email}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#77757D] truncate mt-0.5">
                          Role: {u.role} · {u.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveUser(u.id, u.fullName || u.email)}
                          disabled={approvingUserId === u.id}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#242424] text-white hover:bg-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {approvingUserId === u.id ? "Approving..." : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="py-10 text-center bg-[#F8F7F9] rounded-xl border border-dashed border-[#E6E4E9] text-xs text-[#77757D]">
                  <CheckCircle2 className="h-6 w-6 text-[#10B981] mx-auto mb-2" />
                  <span>All submissions verified. Zero queue backlog.</span>
                </div>
              )}
            </div>
          </div>

          {/* ISSUES & EXCEPTIONS LIST */}
          <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                  Issues & Exceptions
                </h3>
              </div>
              <Link to="/admin/reports" className="text-xs font-semibold text-[#FF7655] hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              {issuesList.length > 0 ? (
                issuesList.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between gap-3 hover:border-[#D6D4D9] transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold",
                            issue.severity === "CRITICAL"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs font-bold text-[#242424] truncate">
                          {issue.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#77757D] truncate mt-0.5">
                        Logged by {issue.author} · {issue.date}
                      </div>
                    </div>

                    <Link
                      to={issue.type === "report" ? "/admin/reports" : "/admin/support"}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#E6E4E9] text-[#242424] hover:bg-[#F8F7F9] transition-colors shrink-0 shadow-2xs"
                    >
                      Resolve
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center bg-[#F8F7F9] rounded-xl border border-dashed border-[#E6E4E9] text-xs text-[#77757D]">
                  <CheckCircle2 className="h-6 w-6 text-[#10B981] mx-auto mb-2" />
                  <span>Zero open disputes or reported issues. Platform operational.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. UPCOMING BOOKINGS & OVERDUE ACTIONS */}
      {/* ------------------------------------------------------------------ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* UPCOMING BOOKINGS */}
        <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#FF7655]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Upcoming Bookings
              </h3>
            </div>
            <Link to="/admin/bookings" className="text-xs font-semibold text-[#FF7655] hover:underline">
              View Roster →
            </Link>
          </div>

          <div className="space-y-2.5">
            {upcomingBookingsList.length > 0 ? (
              upcomingBookingsList.map((bk) => (
                <div
                  key={bk.id}
                  className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between gap-3 hover:border-[#D6D4D9] transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#242424] truncate">
                      {bk.productTitle || `Booking #${bk.id.slice(0, 8)}`}
                    </div>
                    <div className="text-[11px] text-[#77757D] truncate mt-0.5">
                      Renter: {bk.renterName || "Customer"} · ₹{bk.totalAmount || 0}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-mono font-bold rounded-full capitalize",
                      bk.status === "active"
                        ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                        : bk.status === "confirmed"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    )}
                  >
                    {bk.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#77757D]">
                No scheduled reservations currently active.
              </div>
            )}
          </div>
        </div>

        {/* OVERDUE ACTIONS */}
        <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#D97706]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Action Required Tasks
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F8F7F9] text-[#77757D] border border-[#E6E4E9]">
              {overdueActions.length} Tasks
            </span>
          </div>

          <div className="space-y-2.5">
            {overdueActions.length > 0 ? (
              overdueActions.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between gap-3 hover:border-[#D6D4D9] transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#242424] truncate">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-[#77757D] truncate mt-0.5">
                      {task.category}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-mono font-bold rounded-full shrink-0",
                      task.urgent
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    )}
                  >
                    {task.duration}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#77757D]">
                All operational items are current. Zero overdue tasks.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 7. AUDIT TRAIL & PLATFORM HEALTH */}
      {/* ------------------------------------------------------------------ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* RECENT ACTIVITY TRAIL (2 COLS) */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#FF7655]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Recent Activity Trail
              </h3>
            </div>
            <Link to="/admin/activity-logs" className="text-xs font-semibold text-[#FF7655] hover:underline">
              Full Audit Logs →
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[#242424]">{act.action}</span>
                    <div className="text-[11px] text-[#77757D] truncate mt-0.5">
                      Target: {act.target || "Platform"} · By {act.user || "System"}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#77757D] shrink-0">
                    {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#77757D]">
                No recent activity records recorded in audit log.
              </div>
            )}
          </div>
        </div>

        {/* PLATFORM HEALTH (1 COL) */}
        <div className="rounded-2xl bg-white border border-[#E6E4E9] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4E9]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                Platform Health
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-mono font-bold">
              Operational
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#242424]">FastAPI Backend</div>
                <div className="text-[10px] font-mono text-[#77757D]">/api/health/ready</div>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            </div>

            <div className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#242424]">Database Datastore</div>
                <div className="text-[10px] font-mono text-[#77757D]">TiDB cloud MySQL SSL</div>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            </div>

            <div className="p-3 rounded-xl bg-[#F8F7F9] border border-[#E6E4E9] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#242424]">Live WebSocket Stream</div>
                <div className="text-[10px] font-mono text-[#77757D]">/api/admin/ws</div>
              </div>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  wsStatus === "LIVE" ? "bg-[#10B981]" : "bg-[#F59E0B]"
                )}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E6E4E9] flex items-center justify-between text-[11px] text-[#77757D]">
            <span>Data Freshness</span>
            <span className="font-mono font-semibold text-[#242424]">Realtime sync</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Dashboard;
