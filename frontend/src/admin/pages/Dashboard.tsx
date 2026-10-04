import { useEffect, useState, useCallback, useMemo } from "react";
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
  ShieldAlert,
  ShieldCheck,
  LifeBuoy,
  Eye,
  Check,
  X,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
import { AdminProduct, AdminBooking, AdminUser, AdminSupportTicket } from "../services/api";
import { authService } from "../services/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminWS, ConnectionStatus } from "../services/websocket";
import { AdminProductImage } from "../components/common/AdminProductImage";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [pendingProductsList, setPendingProductsList] = useState<AdminProduct[]>([]);
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [openTickets, setOpenTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<"revenue" | "bookings">("revenue");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        statsData,
        chartsData,
        productsData,
        bookingsData,
        usersData,
        ticketsData,
      ] = await Promise.allSettled([
        notificationsService.getDashboardStats(),
        notificationsService.getDashboardCharts("30"),
        productsService.getProducts("pending"),
        bookingsService.getBookings(),
        usersService.getUsers(),
        notificationsService.getSupportTickets(),
      ]);

      if (statsData.status === "fulfilled") {
        setStats(statsData.value);
      } else {
        console.error("Stats fetch error:", statsData.reason);
      }

      if (chartsData.status === "fulfilled") {
        setCharts(chartsData.value);
      }

      if (productsData.status === "fulfilled") {
        setPendingProductsList(productsData.value.slice(0, 6));
      }

      if (bookingsData.status === "fulfilled") {
        setRecentBookings(bookingsData.value.slice(0, 5));
      }

      if (usersData.status === "fulfilled") {
        const unverified = usersData.value.filter(
          (u) =>
            !u.email?.endsWith("@example.com") &&
            !u.email?.endsWith("@test.com") &&
            !u.email?.includes("reset_test_") &&
            (u.status === "pending" ||
              (u as any).verificationStatus === "pending" ||
              !u.verified ||
              u.status === "unverified" ||
              u.payerntAccount?.verificationStatus === "pending" ||
              u.payerntAccount?.accountStatus === "pending")
        );
        setPendingUsers(unverified.slice(0, 6));
      }

      if (ticketsData.status === "fulfilled") {
        const open = ticketsData.value.filter(
          (t) => t.status === "open" || t.status === "pending"
        );
        setOpenTickets(open.slice(0, 4));
      }

      if (statsData.status === "rejected") {
        setError("Failed to fetch live dashboard operational metrics.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to backend control plane.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // WebSocket listeners for live marketplace activity
    const unsubProductCreated = adminWS.subscribe("product.created", () => fetchDashboardData());
    const unsubBookingCreated = adminWS.subscribe("booking.created", () => fetchDashboardData());
    const unsubPayment = adminWS.subscribe("payment.created", () => fetchDashboardData());

    return () => {
      unsubProductCreated();
      unsubBookingCreated();
      unsubPayment();
    };
  }, [fetchDashboardData]);

  const handleApproveProduct = async (id: string, title: string) => {
    try {
      setApprovingId(id);
      await productsService.approveProduct(id);
      setPendingProductsList((prev) => prev.filter((p) => p.id !== id));
      if (stats) {
        setStats({
          ...stats,
          pendingProducts: Math.max(0, stats.pendingProducts - 1),
          approvedProducts: stats.approvedProducts + 1,
        });
      }
      toast.success(`Listing "${title}" approved & live.`);
    } catch {
      toast.error("Failed to approve product.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectProduct = async (id: string, title: string) => {
    try {
      setRejectingId(id);
      await productsService.rejectProduct(id);
      setPendingProductsList((prev) => prev.filter((p) => p.id !== id));
      if (stats) {
        setStats({
          ...stats,
          pendingProducts: Math.max(0, stats.pendingProducts - 1),
          rejectedProducts: stats.rejectedProducts + 1,
        });
      }
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
      setPendingUsers((prev) => prev.filter((u) => u.id !== id && u.email !== id));
      toast.success(`User account "${name}" approved & verified.`);
      if (stats) {
        setStats({
          ...stats,
          totalUsers: stats.totalUsers,
        });
      }
    } catch {
      toast.error("Failed to approve user.");
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleRejectUser = async (id: string, name: string) => {
    try {
      setRejectingUserId(id);
      await usersService.rejectUser(id);
      setPendingUsers((prev) => prev.filter((u) => u.id !== id && u.email !== id));
      toast.info(`User account "${name}" verification rejected.`);
    } catch {
      toast.error("Failed to reject user verification.");
    } finally {
      setRejectingUserId(null);
    }
  };

  const adminName = currentUser?.fullName?.split(" ")[0] || currentUser?.email?.split("@")[0] || "Admin";

  if (loading && !stats) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader message="Loading PAYENT Control Center..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ============================================================ */}
      {/* TOP: Greeting & Overview Header */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {greeting}, {adminName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            PAYENT marketplace overview & operational telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer"
            title="Sync live telemetry"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", loading && "animate-spin")} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF1744]" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="font-semibold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TOP PRIORITY REVIEW SECTION: Pending Listings & User Review Accounts */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-6">
        {/* PENDING LISTINGS REVIEW QUEUE */}
        <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-foreground/80" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Listings
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {pendingProductsList.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {pendingProductsList.length} review
                </span>
              )}
              <Link
                to="/admin/products"
                className="text-xs font-semibold text-foreground hover:text-emerald-500 inline-flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {pendingProductsList.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-80" />
              <span>All gear listings reviewed. Queue clear.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto pr-1">
              {pendingProductsList.map((p) => (
                <div key={p.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AdminProductImage
                      src={p.image}
                      alt={p.title}
                      className="w-9 h-9 rounded-md shrink-0 object-cover border border-border/40"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-medium text-foreground truncate">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        ₹{p.price}/day • {p.owner?.name || "Lender"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleApproveProduct(p.id, p.title)}
                      disabled={approvingId === p.id || rejectingId === p.id}
                      className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-transparent hover:border-emerald-500/30 transition-colors cursor-pointer"
                      title="Approve listing"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectProduct(p.id, p.title)}
                      disabled={approvingId === p.id || rejectingId === p.id}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-[#FF1744] border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                      title="Reject listing"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* USER REVIEW ACCOUNT SECTION */}
        <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-foreground/80" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                User Review Accounts
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {pendingUsers.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {pendingUsers.length} pending
                </span>
              )}
              <Link
                to="/admin/users"
                className="text-xs font-semibold text-foreground hover:text-emerald-500 inline-flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-80" />
              <span>All user accounts & KYC profiles reviewed. Queue clear.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[300px] overflow-y-auto pr-1">
              {pendingUsers.map((u) => {
                const displayName = u.fullName || u.email.split("@")[0] || "User";
                const isVendor = u.accountType === "payernt" || u.accountType === "vendor" || u.payerntAccount !== null;
                return (
                  <div key={u.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-secondary/80 flex items-center justify-center text-xs font-semibold uppercase border border-border/40 shrink-0">
                        {displayName.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-medium text-foreground truncate">
                            {displayName}
                          </h4>
                          <span className={cn(
                            "px-1 py-0.2 text-[9px] font-medium rounded uppercase",
                            isVendor ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}>
                            {isVendor ? "Vendor" : "Customer"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {u.email} {u.phone ? `• ${u.phone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleApproveUser(u.id, displayName)}
                        disabled={approvingUserId === u.id || rejectingUserId === u.id}
                        className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-transparent hover:border-emerald-500/30 transition-colors cursor-pointer"
                        title="Approve & Verify Account"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRejectUser(u.id, displayName)}
                        disabled={approvingUserId === u.id || rejectingUserId === u.id}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-[#FF1744] border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                        title="Reject Account Verification"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* COMPACT KPI STRIP: Users, Active Products, Bookings, Revenue */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Users
            </span>
            <Users className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats ? stats.totalUsers.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {stats ? `${stats.totalAgents || 0} verified agents` : "Live accounts"}
          </div>
        </div>

        {/* Active Products */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Products
            </span>
            <Package className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats ? stats.approvedProducts.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
            {stats && stats.pendingProducts > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {stats.pendingProducts} pending review
              </span>
            ) : (
              <span>All catalog approved</span>
            )}
          </div>
        </div>

        {/* Bookings */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Bookings
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats ? stats.monthlyBookings.toLocaleString() : "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {stats?.bookingsToday ? `${stats.bookingsToday} new today` : "Monthly rental orders"}
          </div>
        </div>

        {/* Revenue */}
        <div className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Revenue
            </span>
            <IndianRupee className="h-4 w-4 text-muted-foreground/70" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground font-mono">
            {stats ? `₹${stats.monthlyRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {stats?.revenueToday ? `₹${stats.revenueToday.toLocaleString("en-IN")} today` : "Total gross volume"}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MARKETPLACE ACTIVITY: Large Primary Visualization */}
      {/* ============================================================ */}
      <div className="p-5 sm:p-6 rounded-xl border border-border/70 bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Marketplace Activity
            </h2>
            <p className="text-[11px] text-muted-foreground">
              30-day transactional volume and rental lease performance
            </p>
          </div>

          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab("revenue")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                activeChartTab === "revenue"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Revenue Trajectory
            </button>
            <button
              onClick={() => setActiveChartTab("bookings")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer",
                activeChartTab === "bookings"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Booking Volume
            </button>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {activeChartTab === "revenue" ? (
            charts && charts.revenueChart && charts.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueChart}>
                  <defs>
                    <linearGradient id="editorialRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "var(--foreground)",
                    }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}`, "Gross Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--foreground)"
                    strokeWidth={1.75}
                    fillOpacity={1}
                    fill="url(#editorialRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No revenue records available for the last 30 days.
              </div>
            )
          ) : charts && charts.bookingChart && charts.bookingChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.bookingChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  formatter={(val: number) => [val, "Rental Orders"]}
                />
                <Bar dataKey="bookings" fill="var(--foreground)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No booking records available for the last 30 days.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* OPERATIONS: 2-Column (LEFT: Recent Bookings | RIGHT: Open Support & Health) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Recent Bookings / Orders */}
        <div className="lg:col-span-7 rounded-xl border border-border/70 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent Bookings
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Latest gear rental requests and dispatched orders
              </p>
            </div>
            <Link
              to="/admin/bookings"
              className="text-xs font-semibold text-foreground hover:text-emerald-500 inline-flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No recent bookings found.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {recentBookings.map((b) => (
                <div key={b.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        #{b.id.slice(0, 8)}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 text-[10px] font-medium rounded",
                          b.status === "confirmed" || b.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : b.status === "cancelled"
                            ? "bg-red-500/10 text-[#FF1744] border border-red-500/20"
                            : "bg-secondary text-muted-foreground border border-border/60"
                        )}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 font-medium truncate mt-0.5">
                      {b.productTitle || "Tech Gear"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.customerName || "Customer"} • {b.startDate || "Date"} → {b.endDate || "Date"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-semibold text-foreground">
                      ₹{(b.amount || 0).toLocaleString("en-IN")}
                    </div>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {b.paymentStatus || "unpaid"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): Open Support Tickets */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-foreground/80" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Support Queue
                </h3>
              </div>
              <Link
                to="/admin/support"
                className="text-xs font-semibold text-foreground hover:text-emerald-500 inline-flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {openTickets.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-80" />
                <span>All support tickets resolved.</span>
              </div>
            ) : (
              <div className="space-y-2.5 divide-y divide-border/30">
                {openTickets.map((t) => (
                  <div key={t.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{t.subject || "Support Ticket"}</p>
                      <p className="text-[11px] text-muted-foreground">{t.userName || "User"} • {t.priority || "normal"} priority</p>
                    </div>
                    <Link
                      to="/admin/support"
                      className="px-2 py-1 text-[11px] font-medium rounded bg-secondary hover:bg-secondary/80 border border-border/60 shrink-0"
                    >
                      Respond
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MARKETPLACE HEALTH: Compact Operational Indicators */}
      {/* ============================================================ */}
      <div className="pt-2 border-t border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Marketplace Health & Cluster Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20">
            <span className="text-[11px] text-muted-foreground block">Active Users</span>
            <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
              {stats?.totalUsers || 0} Accounts
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20">
            <span className="text-[11px] text-muted-foreground block">Live Listings</span>
            <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
              {stats?.approvedProducts || 0} Verified
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20">
            <span className="text-[11px] text-muted-foreground block">Pending Listings</span>
            <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
              {stats?.pendingProducts || 0} In Queue
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20">
            <span className="text-[11px] text-muted-foreground block">Completed Bookings</span>
            <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
              {stats?.monthlyBookings || 0} Fulfilled
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/20">
            <span className="text-[11px] text-muted-foreground block">Pending Reports</span>
            <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
              {stats?.pendingReports || 0} Open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
