import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
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
  UserCheck,
  UserX,
  Eye,
  Check,
  X,
  TrendingUp,
  FileText,
  MessageSquare,
  ChevronDown,
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
} from "recharts";
import { Loader } from "../components/layout/Loader";
import {
  notificationsService,
  DashboardStats,
  DashboardCharts,
} from "../services/notifications";
import { productsService } from "../services/products";
import { bookingsService } from "../services/bookings";
import { usersService } from "../services/users";
import { AdminProduct, AdminBooking, AdminUser } from "../services/api";
import { authService } from "../services/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminProductImage } from "../components/common/AdminProductImage";

const BOOKING_STATUS_COLORS: Record<string, string> = {
  Active: "#10b981",
  Pending: "#f59e0b",
  Ongoing: "#3b82f6",
  Completed: "#71717a",
  Cancelled: "#ef4444",
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [pendingProductsList, setPendingProductsList] = useState<AdminProduct[]>([]);
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive review modal targets
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, chartsData, productsData, bookingsData, usersData] =
        await Promise.allSettled([
          notificationsService.getDashboardStats(),
          notificationsService.getDashboardCharts("30"),
          productsService.getProducts("pending"),
          bookingsService.getBookings(),
          usersService.getUsers(),
        ]);

      if (statsData.status === "fulfilled") {
        setStats(statsData.value);
      }
      if (chartsData.status === "fulfilled") {
        setCharts(chartsData.value);
      }
      if (productsData.status === "fulfilled") {
        setPendingProductsList(productsData.value.filter((p) => p.status === "pending"));
      }
      if (bookingsData.status === "fulfilled") {
        setRecentBookings(bookingsData.value.slice(0, 6));
      }
      if (usersData.status === "fulfilled") {
        setPendingUsers(
          usersData.value.filter((u) => {
            if (u.role === "admin") return false;
            const s = String(u.status || "").toUpperCase();
            return (
              s === "PENDING" ||
              s === "PENDING_REVIEW" ||
              s === "UNVERIFIED" ||
              (!u.verified && s !== "ACTIVE" && s !== "APPROVED" && s !== "SUSPENDED" && s !== "REJECTED")
            );
          })
        );
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
      await productsService.rejectProduct(id, "Does not meet specifications.");
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
      setPendingUsers((prev) => prev.filter((u) => u.id !== id && u.accountId !== id));
      toast.success(`User account "${name}" approved & verified.`);
    } catch {
      toast.error("Failed to approve user.");
    } finally {
      setApprovingUserId(null);
    }
  };

  // Real database metric derivations (no fabricated production numbers)
  const totalUsersDisplay = stats?.totalUsers ?? 0;
  const activeAgentsDisplay = stats?.totalAgents ?? 0;
  const totalProductsDisplay = stats?.totalProducts ?? 0;
  const totalBookingsDisplay = stats?.monthlyBookings ?? 0;
  const revenueTotalDisplay = stats?.monthlyRevenue ?? 0;

  // Real booking distribution donut data
  const bookingDistributionData = [
    { name: "Active", value: stats?.activeBookings ?? recentBookings.filter((b) => b.status === "active").length, color: BOOKING_STATUS_COLORS.Active },
    { name: "Pending", value: recentBookings.filter((b) => b.status === "pending").length, color: BOOKING_STATUS_COLORS.Pending },
    { name: "Ongoing", value: recentBookings.filter((b) => b.status === "confirmed" || b.status === "delivered").length, color: BOOKING_STATUS_COLORS.Ongoing },
    { name: "Completed", value: stats?.completedBookings ?? recentBookings.filter((b) => b.status === "completed").length, color: BOOKING_STATUS_COLORS.Completed },
    { name: "Cancelled", value: recentBookings.filter((b) => b.status === "cancelled").length, color: BOOKING_STATUS_COLORS.Cancelled },
  ];

  if (loading && !stats) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-pulse">
        <div className="flex items-center justify-between pb-5 border-b border-[var(--admin-border)]">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-[var(--admin-elevated)] rounded-md" />
            <div className="h-4 w-64 bg-[var(--admin-elevated)] rounded-md" />
          </div>
          <div className="h-9 w-24 bg-[var(--admin-elevated)] rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 space-y-2">
              <div className="h-3 w-20 bg-[var(--admin-elevated)] rounded" />
              <div className="h-7 w-24 bg-[var(--admin-elevated)] rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 h-60 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
          <div className="lg:col-span-4 h-60 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
          <div className="lg:col-span-4 h-60 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Header (Panel 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--admin-border)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--admin-text-secondary)]">
            Overview of your Payent platform
          </p>
        </div>

        {/* Date Filter & Sync Button */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-xs text-[var(--admin-text)] font-medium flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[var(--admin-text-secondary)]" />
            <span>Last 30 Days</span>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboardData} className="underline font-semibold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* 4 Top KPI Cards (Panel 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Total Users</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {totalUsersDisplay.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            <span>Verified platform users</span>
          </div>
        </div>

        {/* Active Agents */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Active Agents</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {activeAgentsDisplay.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            <span>Registered vendors</span>
          </div>
        </div>

        {/* Total Products */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Total Products</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {totalProductsDisplay.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            <span>Catalog equipment</span>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Total Bookings</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {totalBookingsDisplay.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            <span>Rental orders</span>
          </div>
        </div>
      </div>

      {/* Row 2: Charts (Bookings Trend, Revenue Overview, Booking Status Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bookings Trend (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[var(--admin-text)]">Bookings Trend</h3>
            <span className="text-[10px] text-[var(--admin-text-secondary)] bg-black/5 dark:bg-white/5 border border-[var(--admin-border)] px-2 py-0.5 rounded">
              Last 30 Days
            </span>
          </div>

          <div className="h-44 w-full pt-2">
            {charts?.bookingChart && charts.bookingChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.bookingChart.slice(-14)}>
                  <Bar dataKey="bookings" fill="var(--admin-text)" radius={[2, 2, 0, 0]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--admin-card)",
                      borderColor: "var(--admin-border)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "var(--admin-text)",
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-secondary)]">
                Telemetry data loading...
              </div>
            )}
          </div>
        </div>

        {/* Revenue Overview (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-[var(--admin-text)]">Revenue Overview</h3>
              <div className="text-base font-extrabold text-[var(--admin-text)] font-mono mt-0.5">
                ₹{revenueTotalDisplay.toLocaleString("en-IN")}
                <span className="text-[10px] font-semibold text-[var(--admin-text-secondary)] ml-1.5 font-sans">Gross total</span>
              </div>
            </div>
            <span className="text-[10px] text-[var(--admin-text-secondary)] bg-black/5 dark:bg-white/5 border border-[var(--admin-border)] px-2 py-0.5 rounded self-start">
              Last 30 Days
            </span>
          </div>

          <div className="h-40 w-full pt-2">
            {charts?.revenueChart && charts.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueChart.slice(-14)}>
                  <defs>
                    <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--admin-text)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--admin-text)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--admin-text)"
                    strokeWidth={2}
                    fill="url(#dashRevGrad)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--admin-card)",
                      borderColor: "var(--admin-border)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "var(--admin-text)",
                    }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}`, "Revenue"]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-secondary)]">
                Revenue data loading...
              </div>
            )}
          </div>
        </div>

        {/* Booking Status Donut Chart (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[var(--admin-text)] mb-2">Booking Status</h3>

          <div className="flex items-center justify-between gap-2">
            {/* Center-donut representation */}
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {bookingDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-extrabold text-[var(--admin-text)] font-mono leading-none">
                  {totalBookingsDisplay}
                </span>
                <span className="text-[9px] text-[var(--admin-text-secondary)] uppercase">Total</span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="flex-1 space-y-1.5 text-xs">
              {bookingDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-[var(--admin-text-secondary)]">{item.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[var(--admin-text)]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Bookings Table & Pending Approvals Card (Panel 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Recent Bookings (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <h3 className="text-xs font-bold text-[var(--admin-text)]">Recent Bookings</h3>
            <Link
              to="/admin/bookings"
              className="text-xs font-semibold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--admin-text)]">
              <thead className="text-[10px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider border-b border-[var(--admin-border)]">
                <tr>
                  <th className="pb-2.5">User</th>
                  <th className="pb-2.5">Product</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--admin-text-secondary)]">
                      No recent bookings found.
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/[0.02]">
                      <td className="py-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-center font-bold text-[10px] shrink-0">
                          {b.customerName ? b.customerName[0] : "U"}
                        </div>
                        <span className="font-medium text-[var(--admin-text)] truncate max-w-[120px]">
                          {b.customerName || "Customer"}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-[var(--admin-text)] truncate max-w-[140px]">
                        {b.productTitle || "Rental Product"}
                      </td>
                      <td className="py-3 font-mono font-semibold">
                        ₹{(b.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            b.status === "completed" || b.status === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
                              : b.status === "pending"
                              ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20"
                              : "bg-black/5 dark:bg-white/10 text-[var(--admin-text)] border border-[var(--admin-border)]"
                          )}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-[var(--admin-text-secondary)] font-mono">
                        {b.startDate || (b.createdAt ? b.createdAt.slice(0, 10) : "-")}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to="/admin/bookings"
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] inline-flex"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals Card (4 cols) (Panel 1) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--admin-border)]">
            <h3 className="text-xs font-bold text-[var(--admin-text)]">Pending Approvals</h3>
            <span className="text-[10px] text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
              Action Req.
            </span>
          </div>

          <div className="space-y-3">
            {/* Account Approvals */}
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  {stats?.pendingUsers ?? pendingUsers.length}
                </span>
                <span className="text-xs font-medium text-[var(--admin-text)]">
                  Account Approvals
                </span>
              </div>
              <Link
                to="/admin/users"
                search={{ status: "pending" } as any}
                className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-[11px] font-semibold transition-colors"
              >
                Review
              </Link>
            </div>

            {/* Product Approvals */}
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  {stats?.pendingProducts ?? pendingProductsList.length}
                </span>
                <span className="text-xs font-medium text-[var(--admin-text)]">
                  Product Approvals
                </span>
              </div>
              <Link
                to="/admin/products"
                className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--admin-text)] text-[11px] font-semibold transition-colors"
              >
                Review
              </Link>
            </div>

            {/* Agent Approvals */}
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  {pendingUsers.filter((u) => u.accountType?.toLowerCase().includes("payernt") || u.role === "agent" || u.role === "lender" || u.role === "vendor").length}
                </span>
                <span className="text-xs font-medium text-[var(--admin-text)]">
                  Agent Approvals
                </span>
              </div>
              <Link
                to="/admin/agents"
                className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--admin-text)] text-[11px] font-semibold transition-colors"
              >
                Review
              </Link>
            </div>

            {/* Reviews Reported */}
            <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                  {stats?.pendingReports ?? 0}
                </span>
                <span className="text-xs font-medium text-[var(--admin-text)]">
                  Reviews Reported
                </span>
              </div>
              <Link
                to="/admin/reviews"
                className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--admin-text)] text-[11px] font-semibold transition-colors"
              >
                Review
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
