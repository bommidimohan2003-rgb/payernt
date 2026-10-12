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

const CATEGORY_COLORS = ["#F5F5F5", "#A1A1AA", "#71717A", "#52525B", "#3F3F46"];

export default function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"Overview" | "Users" | "Bookings" | "Revenue" | "Products">("Overview");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, chartsData] = await Promise.all([
        notificationsService.getDashboardStats(),
        notificationsService.getDashboardCharts("30"),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch {
      toast.error("Failed to load analytics datasets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const userCount = stats?.totalUsers ?? 0;
  const bookingCount = stats?.monthlyBookings ?? 0;
  const revenueCount = stats?.monthlyRevenue ?? 0;

  // Category Distribution from real database telemetry (charts.categoryDistribution)
  const categoryData: { name: string; value: number; percentage: string }[] = useMemo(() => {
    if (charts?.categoryDistribution && charts.categoryDistribution.length > 0) {
      const totalCat = charts.categoryDistribution.reduce((acc, c) => acc + (c.value || 0), 0) || 1;
      return charts.categoryDistribution.slice(0, 5).map((c) => ({
        name: c.name,
        value: c.value,
        percentage: `${Math.round(((c.value || 0) / totalCat) * 100)}%`,
      }));
    }
    return [
      { name: "Laptops", value: 0, percentage: "0%" },
      { name: "Cameras", value: 0, percentage: "0%" },
      { name: "Bikes", value: 0, percentage: "0%" },
      { name: "Phones", value: 0, percentage: "0%" },
      { name: "Others", value: 0, percentage: "0%" },
    ];
  }, [charts?.categoryDistribution]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Page Header (Panel 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(161,161,170,0.18)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Platform growth, revenue and operational insights
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-lg bg-[#10151B] border border-[rgba(161,161,170,0.18)] text-xs text-[#F5F5F5] font-medium flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#A1A1AA]" />
            <span>Oct 1, 2026 - Oct 31, 2026</span>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-lg bg-[#10151B] border border-[rgba(161,161,170,0.18)] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Panel 2) */}
      <div className="flex items-center gap-2 border-b border-[rgba(161,161,170,0.18)] pb-2 overflow-x-auto no-scrollbar">
        {(["Overview", "Users", "Bookings", "Revenue", "Products"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === tab
                ? "bg-white text-black font-bold shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4 Top KPI Cards (Panel 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* User Growth */}
        <div className="p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)]">
          <div className="text-[11px] font-semibold text-[#A1A1AA]">User Growth</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] font-mono mt-1">
            {userCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-2">
            <TrendingUp className="h-3 w-3" />
            <span>+12%</span>
          </div>
        </div>

        {/* Bookings */}
        <div className="p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)]">
          <div className="text-[11px] font-semibold text-[#A1A1AA]">Bookings</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] font-mono mt-1">
            {bookingCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-2">
            <TrendingUp className="h-3 w-3" />
            <span>+20%</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)]">
          <div className="text-[11px] font-semibold text-[#A1A1AA]">Revenue</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] font-mono mt-1">
            ₹{revenueCount.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-2">
            <TrendingUp className="h-3 w-3" />
            <span>+18%</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)]">
          <div className="text-[11px] font-semibold text-[#A1A1AA]">Conversion Rate</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F5F5F5] font-mono mt-1">
            4.8%
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-2">
            <TrendingUp className="h-3 w-3" />
            <span>+0.6%</span>
          </div>
        </div>
      </div>

      {/* Row 2: Bookings & Revenue Chart & Top Categories Donut (Panel 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Bookings & Revenue (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[#F5F5F5]">Bookings & Revenue</h3>
              <p className="text-[11px] text-[#A1A1AA]">
                Daily transaction volume and rental leases
              </p>
            </div>
            <span className="text-[10px] text-[#A1A1AA] bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              30 Days
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {charts?.revenueChart && charts.revenueChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueChart.slice(-14)}>
                  <defs>
                    <linearGradient id="analyticsDualRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5F5F5" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#F5F5F5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161,161,170,0.1)" />
                  <XAxis dataKey="name" stroke="#71717A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717A" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${v/1000}k` : v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#10151B",
                      borderColor: "rgba(161,161,170,0.2)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#F5F5F5",
                    }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F5F5F5"
                    strokeWidth={2}
                    fill="url(#analyticsDualRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#A1A1AA]">
                Loading telemetry chart...
              </div>
            )}
          </div>
        </div>

        {/* Top Categories Donut (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[#F5F5F5] mb-2">Top Categories</h3>

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
                <span className="text-base font-extrabold text-[#F5F5F5] font-mono leading-none">
                  {bookingCount}
                </span>
                <span className="text-[9px] text-[#A1A1AA] uppercase">Total</span>
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
                    <span className="text-[11px] text-[#A1A1AA]">{item.name}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[#F5F5F5]">
                    {item.percentage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Registration Area Chart (Panel 2) */}
      <div className="p-5 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#F5F5F5]">Top Registration</h3>
            <p className="text-[11px] text-[#A1A1AA]">
              New user verification and KYC completions
            </p>
          </div>
          <span className="text-[10px] text-[#A1A1AA] bg-white/5 border border-white/10 px-2 py-0.5 rounded">
            Last 30 Days
          </span>
        </div>

        <div className="h-44 w-full pt-2">
          {charts?.bookingChart && charts.bookingChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.bookingChart.slice(-14)}>
                <defs>
                  <linearGradient id="userRegGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161,161,170,0.1)" />
                <XAxis dataKey="name" stroke="#71717A" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#10151B",
                    borderColor: "rgba(161,161,170,0.2)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "#F5F5F5",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#A1A1AA"
                  strokeWidth={2}
                  fill="url(#userRegGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[#A1A1AA]">
              Registration data loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
