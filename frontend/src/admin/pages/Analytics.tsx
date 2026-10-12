import { useEffect, useState, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  Search,
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
} from "../services/notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS = ["#71717A", "#A1A1AA", "#D4D4D8", "#52525B", "#3F3F46"];

export default function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const [activeTab, setActiveTab] = useState<"Overview" | "Users" | "Bookings" | "Revenue" | "Products">("Overview");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, chartsData] = await Promise.all([
        notificationsService.getDashboardStats(),
        notificationsService.getDashboardCharts(days),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch {
      toast.error("Failed to load analytics datasets.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const userCount = stats?.totalUsers ?? 0;
  const bookingCount = stats?.monthlyBookings ?? 0;
  const revenueCount = stats?.monthlyRevenue ?? 0;
  const utilizationRate = stats?.totalProducts
    ? `${Math.round(((stats?.activeBookings || 0) / stats.totalProducts) * 100)}%`
    : "0%";

  // Category Distribution from real database telemetry (charts.categoryDistribution)
  const categoryData: { name: string; value: number; percentage: string }[] = useMemo(() => {
    if (charts?.categoryDistribution && charts.categoryDistribution.length > 0) {
      const totalCat = charts.categoryDistribution.reduce((acc, c) => acc + (c.value || 0), 0) || 1;
      return charts.categoryDistribution.map((c) => ({
        name: c.name,
        value: c.value,
        percentage: `${Math.round(((c.value || 0) / totalCat) * 100)}%`,
      }));
    }
    return [
      { name: "Cameras", value: 1, percentage: "100%" },
    ];
  }, [charts?.categoryDistribution]);

  if (loading && !stats) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-pulse">
        <div className="flex items-center justify-between pb-5 border-b border-[var(--admin-border)]">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-[var(--admin-elevated)] rounded-md" />
            <div className="h-4 w-64 bg-[var(--admin-elevated)] rounded-md" />
          </div>
          <div className="h-9 w-32 bg-[var(--admin-elevated)] rounded-lg" />
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
          <div className="lg:col-span-8 h-72 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
          <div className="lg:col-span-4 h-72 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Header (Panel 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--admin-border)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[var(--admin-text-secondary)]">
            Platform growth, revenue and operational insights
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Supported date range filter */}
          <div className="flex items-center rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] p-0.5 text-xs font-medium">
            {(["7", "30", "90"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                  days === d
                    ? "bg-[var(--admin-text)] text-[var(--admin-bg)] font-bold shadow-xs"
                    : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]"
                )}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Panel 2) */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2 overflow-x-auto no-scrollbar">
        {(["Overview", "Users", "Bookings", "Revenue", "Products"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === tab
                ? "bg-[var(--admin-text)] text-[var(--admin-bg)] font-bold shadow-xs"
                : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4 Top KPI Cards (Panel 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* User Growth */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">User Growth</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {userCount.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            No comparison data
          </div>
        </div>

        {/* Bookings */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Bookings</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {bookingCount.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            No comparison data
          </div>
        </div>

        {/* Revenue */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Revenue</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            ₹{revenueCount.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            No comparison data
          </div>
        </div>

        {/* Equipment Utilization */}
        <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]">
          <div className="text-[11px] font-semibold text-[var(--admin-text-secondary)]">Equipment Utilization</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--admin-text)] font-mono mt-1">
            {utilizationRate}
          </div>
          <div className="text-[11px] font-medium text-[var(--admin-text-secondary)] mt-2">
            Active gear leased
          </div>
        </div>
      </div>

      {/* Row 2: Bookings & Revenue Chart & Top Categories Donut (Panel 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Bookings & Revenue (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[var(--admin-text)]">Bookings & Revenue</h3>
              <p className="text-[11px] text-[var(--admin-text-secondary)]">
                Daily transaction volume and rental leases
              </p>
            </div>
            <span className="text-[10px] text-[var(--admin-text-secondary)] bg-black/5 dark:bg-white/5 border border-[var(--admin-border)] px-2 py-0.5 rounded">
              {days} Days
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {charts?.revenueChart && charts.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueChart.slice(-14)}>
                  <defs>
                    <linearGradient id="analyticsDualRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--admin-text)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--admin-text)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                  <XAxis dataKey="name" stroke="var(--admin-text-secondary)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--admin-text-secondary)" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${v/1000}k` : v}`} />
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
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--admin-text)"
                    strokeWidth={2}
                    fill="url(#analyticsDualRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-secondary)]">
                No revenue records in selected date range.
              </div>
            )}
          </div>
        </div>

        {/* Top Categories Donut (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[var(--admin-text)] mb-2">Top Categories</h3>

          <div className="flex items-center justify-between gap-3 my-auto">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-extrabold text-[var(--admin-text)] font-mono leading-none">
                  {bookingCount}
                </span>
                <span className="text-[9px] text-[var(--admin-text-secondary)] uppercase">Total</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
              {categoryData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-[11px] text-[var(--admin-text-secondary)]">{item.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[var(--admin-text)]">
                    {item.percentage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Registration and Rental Activity (Panel 2) */}
      <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[var(--admin-text)]">Rental & Lease Activity</h3>
            <p className="text-[11px] text-[var(--admin-text-secondary)]">
              Daily booking volume across {days} days
            </p>
          </div>
          <span className="text-[10px] text-[var(--admin-text-secondary)] bg-black/5 dark:bg-white/5 border border-[var(--admin-border)] px-2 py-0.5 rounded">
            {days} Days
          </span>
        </div>

        <div className="h-44 w-full pt-2">
          {charts?.bookingChart && charts.bookingChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.bookingChart.slice(-14)}>
                <defs>
                  <linearGradient id="userRegGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--admin-text)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--admin-text)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                <XAxis dataKey="name" stroke="var(--admin-text-secondary)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--admin-text-secondary)" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--admin-card)",
                    borderColor: "var(--admin-border)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "var(--admin-text)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="var(--admin-text)"
                  strokeWidth={2}
                  fill="url(#userRegGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-secondary)]">
              No activity records available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
