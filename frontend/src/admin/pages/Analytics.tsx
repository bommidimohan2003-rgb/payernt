import { useEffect, useState, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Package,
  Users,
  Truck,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Check,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip as RadixTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DateRangePreset,
  DateRange,
  calculateDateRange,
  fetchAnalyticsData,
  AnalyticsDataset,
  exportToCsv,
} from "../services/analytics";

const CATEGORY_COLORS = ["#F9856A", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#64748B"];

type TabType = "Bookings" | "Funnel" | "Products" | "Users" | "Deliveries" | "Finance";

export default function Analytics() {
  const [preset, setPreset] = useState<DateRangePreset>("7d"); // Default: Last 7 Days as required
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<TabType>("Bookings");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dataset, setDataset] = useState<AnalyticsDataset | null>(null);

  // Table filtering states
  const [bookingSearch, setBookingSearch] = useState<string>("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [bookingPage, setBookingPage] = useState<number>(1);
  const itemsPerPage = 8;

  const [productSearch, setProductSearch] = useState<string>("");
  const [productPage, setProductPage] = useState<number>(1);

  const [reconciliationSearch, setReconciliationSearch] = useState<string>("");
  const [reconciliationPage, setReconciliationPage] = useState<number>(1);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Compute active date range
  const dateRange = useMemo(() => {
    if (preset === "custom" && customStart && customEnd) {
      return calculateDateRange("custom", new Date(customStart), new Date(customEnd));
    }
    return calculateDateRange(preset);
  }, [preset, customStart, customEnd]);

  // Load analytics data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await fetchAnalyticsData(dateRange);
      setDataset(data);
    } catch (err) {
      console.error("[Analytics] Error loading analytics data:", err);
      toast.error("Failed to load real-time analytics telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered detailed bookings table
  const filteredBookings = useMemo(() => {
    if (!dataset?.rawBookings) return [];
    return dataset.rawBookings.filter((b) => {
      const matchSearch =
        !bookingSearch ||
        b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.productTitle.toLowerCase().includes(bookingSearch.toLowerCase()) ||
        b.customerName.toLowerCase().includes(bookingSearch.toLowerCase());

      const matchStatus =
        bookingStatusFilter === "all" || (b.status || "").toLowerCase() === bookingStatusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [dataset?.rawBookings, bookingSearch, bookingStatusFilter]);

  const paginatedBookings = useMemo(() => {
    const start = (bookingPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, bookingPage]);

  // Filtered product utilization table
  const filteredProducts = useMemo(() => {
    if (!dataset?.productUtilization.products) return [];
    return dataset.productUtilization.products.filter(
      (p) =>
        !productSearch ||
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [dataset?.productUtilization.products, productSearch]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, productPage]);

  // Filtered financial reconciliation table
  const filteredReconciliation = useMemo(() => {
    if (!dataset?.finance.reconciliationRecords) return [];
    return dataset.finance.reconciliationRecords.filter(
      (r) =>
        !reconciliationSearch ||
        r.bookingId.toLowerCase().includes(reconciliationSearch.toLowerCase()) ||
        r.customerName.toLowerCase().includes(reconciliationSearch.toLowerCase()) ||
        r.reconciliationStatus.toLowerCase().includes(reconciliationSearch.toLowerCase())
    );
  }, [dataset?.finance.reconciliationRecords, reconciliationSearch]);

  const paginatedReconciliation = useMemo(() => {
    const start = (reconciliationPage - 1) * itemsPerPage;
    return filteredReconciliation.slice(start, start + itemsPerPage);
  }, [filteredReconciliation, reconciliationPage]);

  // CSV Exporters with formula injection protection
  const handleExportBookings = () => {
    if (!dataset) return;
    const headers = [
      "Booking ID",
      "Product Title",
      "Customer Name",
      "Start Date",
      "End Date",
      "Amount (INR)",
      "Booking Status",
      "Payment Status",
      "Delivery Status",
      "Created At",
    ];
    const rows = dataset.rawBookings.map((b) => [
      b.id,
      b.productTitle,
      b.customerName,
      b.startDate || "",
      b.endDate || "",
      b.amount,
      b.status,
      b.paymentStatus || "unpaid",
      b.deliveryStatus || "PENDING",
      b.createdAt || "",
    ]);
    exportToCsv(`Payent_Bookings_${dataset.range.label.replace(/\s+/g, "_")}`, headers, rows);
    setShowExportMenu(false);
    toast.success("Bookings CSV exported successfully");
  };

  const handleExportReconciliation = () => {
    if (!dataset) return;
    const headers = [
      "Record ID",
      "Booking ID",
      "Customer",
      "Rental Period",
      "Gross Rental (INR)",
      "Payment Status",
      "Platform Fee 10% (INR)",
      "Vendor Payout 90% (INR)",
      "Refund Status",
      "Reconciliation Status",
    ];
    const rows = dataset.finance.reconciliationRecords.map((r) => [
      r.id,
      r.bookingId,
      r.customerName,
      r.rentalPeriod,
      r.grossAmount,
      r.paymentStatus,
      r.platformFee,
      r.vendorPayout,
      r.refundStatus,
      r.reconciliationStatus,
    ]);
    exportToCsv(`Payent_Financial_Reconciliation_${dataset.range.label.replace(/\s+/g, "_")}`, headers, rows);
    setShowExportMenu(false);
    toast.success("Financial Reconciliation CSV exported successfully");
  };

  const handleExportFleetUtilization = () => {
    if (!dataset) return;
    const headers = [
      "Product ID",
      "Title",
      "Category",
      "Daily Rate (INR)",
      "Total Rentals",
      "Generated Revenue (INR)",
      "Occupied Days",
      "Available Days",
      "Utilization Rate %",
      "Listing Status",
    ];
    const rows = dataset.productUtilization.products.map((p) => [
      p.id,
      p.title,
      p.category,
      p.price,
      p.totalRentals,
      p.revenue,
      p.occupiedDays,
      p.availableDays,
      `${p.utilizationRate}%`,
      p.status,
    ]);
    exportToCsv(`Payent_Fleet_Utilization_${dataset.range.label.replace(/\s+/g, "_")}`, headers, rows);
    setShowExportMenu(false);
    toast.success("Fleet Utilization CSV exported successfully");
  };

  if (loading && !dataset) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E6E4E9] dark:border-[#273244]">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-[#E6E4E9] dark:bg-[#162238] rounded-lg" />
            <div className="h-4 w-72 bg-[#E6E4E9] dark:bg-[#162238] rounded-md" />
          </div>
          <div className="h-10 w-96 bg-[#E6E4E9] dark:bg-[#162238] rounded-xl" />
        </div>

        {/* 8 KPI Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-5 space-y-3">
              <div className="h-3 w-24 bg-[#F3F2F5] dark:bg-[#162238] rounded" />
              <div className="h-7 w-32 bg-[#F3F2F5] dark:bg-[#162238] rounded-md" />
              <div className="h-3 w-20 bg-[#F3F2F5] dark:bg-[#162238] rounded" />
            </div>
          ))}
        </div>

        {/* Big Chart Skeleton */}
        <div className="h-96 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-6" />
      </div>
    );
  }

  const kpis = dataset?.kpis;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* 1. TOP HEADER & OPERATIONAL FILTERS (Section 4) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#E6E4E9] dark:border-[#273244]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FF7655] animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#77757D] dark:text-[#9AAAC2]">
                PAYENT BUSINESS TELEMETRY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#242424] dark:text-[#F8FAFC] mt-0.5">
              Analytics
            </h1>
            <p className="text-xs sm:text-sm text-[#77757D] dark:text-[#9AAAC2]">
              Business performance and operational insights
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date-Range Selector (Today, 7D default, 30D, 90D, Custom) */}
            <div className="flex items-center rounded-xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-1 shadow-xs text-xs font-semibold">
              <button
                onClick={() => setPreset("today")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  preset === "today"
                    ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] shadow-xs"
                    : "text-[#77757D] hover:text-[#242424] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC]"
                )}
              >
                Today
              </button>
              <button
                onClick={() => setPreset("7d")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  preset === "7d"
                    ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] shadow-xs"
                    : "text-[#77757D] hover:text-[#242424] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC]"
                )}
              >
                7 Days
              </button>
              <button
                onClick={() => setPreset("30d")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  preset === "30d"
                    ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] shadow-xs"
                    : "text-[#77757D] hover:text-[#242424] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC]"
                )}
              >
                30 Days
              </button>
              <button
                onClick={() => setPreset("90d")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  preset === "90d"
                    ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] shadow-xs"
                    : "text-[#77757D] hover:text-[#242424] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC]"
                )}
              >
                90 Days
              </button>
              <button
                onClick={() => setShowCustomModal(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  preset === "custom"
                    ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] shadow-xs"
                    : "text-[#77757D] hover:text-[#242424] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC]"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{preset === "custom" ? "Custom" : "Custom..."}</span>
              </button>
            </div>

            {/* Compare Toggle */}
            <button
              onClick={() => setComparePrevious(!comparePrevious)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5",
                comparePrevious
                  ? "bg-white dark:bg-[#111827] text-[#242424] dark:text-[#F8FAFC] border-[#E6E4E9] dark:border-[#273244] shadow-xs"
                  : "bg-transparent text-[#77757D] dark:text-[#9AAAC2] border-dashed border-[#E6E4E9] dark:border-[#273244]"
              )}
              title="Compare with previous equivalent period"
            >
              <Activity className="h-3.5 w-3.5 text-[#FF7655]" />
              <span className="hidden sm:inline">Compare Prev</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] text-[#77757D] hover:text-[#242424] dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC] shadow-xs transition-colors cursor-pointer"
              title="Refresh live analytics data"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin text-[#FF7655]")} />
            </button>

            {/* Export Menu (CSV / Excel) */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] text-[#242424] dark:text-[#F8FAFC] text-xs font-semibold shadow-xs hover:bg-[#F8F7F9] dark:hover:bg-[#162238] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-[#FF7655]" />
                <span>Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xl p-1.5 z-50 text-xs">
                  <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase text-[#77757D] dark:text-[#9AAAC2]">
                    Export Formats
                  </div>
                  <button
                    onClick={handleExportBookings}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F8F7F9] dark:hover:bg-[#162238] text-[#242424] dark:text-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Bookings Dataset (CSV)</span>
                  </button>
                  <button
                    onClick={handleExportReconciliation}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F8F7F9] dark:hover:bg-[#162238] text-[#242424] dark:text-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <span>Financial Reconciliation (CSV)</span>
                  </button>
                  <button
                    onClick={handleExportFleetUtilization}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#F8F7F9] dark:hover:bg-[#162238] text-[#242424] dark:text-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 text-orange-500" />
                    <span>Fleet Utilization (CSV)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Date Range Modal */}
        <AnimatePresence>
          {showCustomModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#242424] dark:text-[#F8FAFC]">
                    Custom Date Range
                  </h3>
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="text-[#77757D] hover:text-[#242424] dark:hover:text-[#F8FAFC]"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-[#242424] dark:text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-[#242424] dark:text-[#F8FAFC]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#E6E4E9] dark:border-[#273244] text-xs font-semibold text-[#77757D] dark:text-[#9AAAC2]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!customStart || !customEnd) {
                        toast.error("Please pick both start and end dates");
                        return;
                      }
                      if (new Date(customStart) > new Date(customEnd)) {
                        toast.error("Start date cannot be after end date");
                        return;
                      }
                      setPreset("custom");
                      setShowCustomModal(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] text-xs font-bold text-white shadow-md cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 2. AUTOMATIC BUSINESS INSIGHTS PANEL (Section 12) */}
        {dataset?.insights && dataset.insights.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#FF7655]/15 flex items-center justify-center text-[#FF7655]">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold tracking-tight text-[#242424] dark:text-[#F8FAFC]">
                  Automated Deterministic Insights
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F8F7F9] dark:bg-[#162238] text-[#77757D] dark:text-[#9AAAC2] border border-[#E6E4E9] dark:border-[#273244]">
                  {dataset.range.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dataset.insights.slice(0, 3).map((ins) => (
                <div
                  key={ins.id}
                  onClick={() => setActiveTab(ins.tabTarget as TabType)}
                  className="group p-3.5 rounded-xl bg-[#F8F7F9] dark:bg-[#162238]/60 border border-[#E6E4E9] dark:border-[#273244] hover:border-[#FF7655]/50 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#242424] dark:text-[#F8FAFC]">
                        {ins.title}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                          ins.type === "positive"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : ins.type === "attention"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {ins.metric}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#77757D] dark:text-[#9AAAC2] leading-relaxed">
                      {ins.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-[#FF7655] mt-2 group-hover:underline">
                    <span>View in {ins.tabTarget}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. BUSINESS OVERVIEW KPI CARDS (8 Cards) (Section 5) */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* 1. Total Bookings */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Total Bookings
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Total customer order reservations created during {dataset?.range.label.toLowerCase()}
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                {kpis.totalBookings.current.toLocaleString()}
              </div>
              {comparePrevious && (
                <div className="flex items-center gap-1.5 text-[11px] mt-2">
                  <span
                    className={cn(
                      "font-mono font-bold flex items-center",
                      kpis.totalBookings.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : kpis.totalBookings.trend === "down"
                        ? "text-rose-500"
                        : "text-[#77757D]"
                    )}
                  >
                    {kpis.totalBookings.trend === "up" && <ArrowUpRight className="h-3 w-3 inline" />}
                    {kpis.totalBookings.trend === "down" && <ArrowDownRight className="h-3 w-3 inline" />}
                    {kpis.totalBookings.percentageChange !== null
                      ? `${kpis.totalBookings.percentageChange > 0 ? "+" : ""}${kpis.totalBookings.percentageChange}%`
                      : "0%"}
                  </span>
                  <span className="text-[#77757D] dark:text-[#9AAAC2] text-[10px]">vs prev period</span>
                </div>
              )}
            </div>

            {/* 2. Confirmed Bookings */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Confirmed Bookings
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Bookings approved and accepted by verified lenders
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                {kpis.confirmedBookings.current.toLocaleString()}
              </div>
              {comparePrevious && (
                <div className="flex items-center gap-1.5 text-[11px] mt-2">
                  <span
                    className={cn(
                      "font-mono font-bold flex items-center",
                      kpis.confirmedBookings.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : kpis.confirmedBookings.trend === "down"
                        ? "text-rose-500"
                        : "text-[#77757D]"
                    )}
                  >
                    {kpis.confirmedBookings.percentageChange !== null
                      ? `${kpis.confirmedBookings.percentageChange > 0 ? "+" : ""}${kpis.confirmedBookings.percentageChange}%`
                      : "0%"}
                  </span>
                  <span className="text-[#77757D] dark:text-[#9AAAC2] text-[10px]">vs prev period</span>
                </div>
              )}
            </div>

            {/* 3. Completed Rentals */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Completed Rentals
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Equipment returned, verified via dual-PIN, and safely closed
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                {kpis.completedRentals.current.toLocaleString()}
              </div>
              {comparePrevious && (
                <div className="flex items-center gap-1.5 text-[11px] mt-2">
                  <span
                    className={cn(
                      "font-mono font-bold flex items-center",
                      kpis.completedRentals.trend === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[#77757D]"
                    )}
                  >
                    {kpis.completedRentals.percentageChange !== null
                      ? `${kpis.completedRentals.percentageChange > 0 ? "+" : ""}${kpis.completedRentals.percentageChange}%`
                      : "0%"}
                  </span>
                  <span className="text-[#77757D] dark:text-[#9AAAC2] text-[10px]">vs prev period</span>
                </div>
              )}
            </div>

            {/* 4. Cancelled Bookings */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Cancelled Bookings
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Reservations terminated before delivery or cancelled by user/vendor
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-500 font-mono mt-1">
                {kpis.cancelledBookings.current.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] mt-2 text-[#77757D] dark:text-[#9AAAC2]">
                <span className="font-mono font-semibold text-rose-500">
                  {kpis.cancellationRate.current}% rate
                </span>
                <span className="text-[10px]">of total volume</span>
              </div>
            </div>

            {/* 5. Active Rentals */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Active Rentals
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Tech gear currently in circulation with verified renters
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                {kpis.activeRentals.current.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] mt-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  In circulation
                </span>
              </div>
            </div>

            {/* 6. Gross Rental Value (CORAL/ORANGE GRADIENT SIGNATURE HIGHLIGHT CARD) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] text-white shadow-[0_8px_20px_rgba(255,118,85,0.25)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
                  Gross Rental Value
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-white/80 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Total cumulative gross transaction volume for rental leases
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1">
                ₹{kpis.grossRentalValue.current.toLocaleString("en-IN")}
              </div>
              {comparePrevious && (
                <div className="flex items-center gap-1.5 text-[11px] mt-2 text-white/90">
                  <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                    {kpis.grossRentalValue.percentageChange !== null
                      ? `${kpis.grossRentalValue.percentageChange > 0 ? "+" : ""}${kpis.grossRentalValue.percentageChange}%`
                      : "0%"}
                  </span>
                  <span className="text-[10px] text-white/80">vs prev period</span>
                </div>
              )}
            </div>

            {/* 7. Platform Revenue (10% Take-Rate) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Platform Revenue
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Payent platform commission (10% fee on realized rental transactions)
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                ₹{kpis.platformRevenue.current.toLocaleString("en-IN")}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] mt-2 text-[#77757D] dark:text-[#9AAAC2]">
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  10% take-rate
                </span>
                <span className="text-[10px]">net platform share</span>
              </div>
            </div>

            {/* 8. Open Issues */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Open Issues
                </span>
                <RadixTooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-[#77757D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Pending administrative dispute tickets or flagged items requiring review
                  </TooltipContent>
                </RadixTooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                {kpis.openIssues.current}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] mt-2 text-[#77757D] dark:text-[#9AAAC2]">
                <span className="text-[10px]">Pending admin triage</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB NAVIGATION (V14 STYLE PILL NAVIGATION) */}
        <div className="flex items-center gap-2 border-b border-[#E6E4E9] dark:border-[#273244] pb-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "Bookings", label: "Bookings & Velocity", icon: Calendar },
              { id: "Funnel", label: "Booking Funnel", icon: Layers },
              { id: "Products", label: "Products & Fleet Utilization", icon: Package },
              { id: "Users", label: "Users & Growth", icon: Users },
              { id: "Deliveries", label: "Deliveries & Field Security", icon: Truck },
              { id: "Finance", label: "Finance & Reconciliation", icon: DollarSign },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-[#242424] text-white dark:bg-[#162238] dark:text-[#F8FAFC] dark:border dark:border-[#3B82F6]/40 shadow-xs"
                  : "text-[#77757D] hover:text-[#242424] hover:bg-black/5 dark:text-[#9AAAC2] dark:hover:text-[#F8FAFC] dark:hover:bg-white/5"
              )}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 5. TAB 1: BOOKINGS & VELOCITY (Default) */}
        {activeTab === "Bookings" && (
          <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Booking Trend Comparison (8 cols) */}
              <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#242424] dark:text-[#F8FAFC]">
                      Booking Velocity Trend
                    </h3>
                    <p className="text-[11px] text-[#77757D] dark:text-[#9AAAC2]">
                      Current period reservations vs previous equivalent window
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#242424] dark:text-[#F8FAFC]">
                      <span className="h-2 w-2 rounded-full bg-[#FF7655]" />
                      Current Period
                    </span>
                    {comparePrevious && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[#77757D] dark:text-[#9AAAC2]">
                        <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                        Previous Period
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  {dataset?.bookingTrend && dataset.bookingTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataset.bookingTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" opacity={0.6} />
                        <XAxis dataKey="label" stroke="#77757D" fontSize={10} tickLine={false} />
                        <YAxis stroke="#77757D" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--admin-card)",
                            borderColor: "var(--admin-border)",
                            borderRadius: "12px",
                            fontSize: "11px",
                            color: "var(--admin-text)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="currentBookings"
                          name="Current Period"
                          stroke="#FF7655"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#FF7655" }}
                          activeDot={{ r: 5 }}
                        />
                        {comparePrevious && (
                          <Line
                            type="monotone"
                            dataKey="previousBookings"
                            name="Previous Period"
                            stroke="#94A3B8"
                            strokeWidth={1.8}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#77757D]">
                      No booking telemetry in selected date range.
                    </div>
                  )}
                </div>
              </div>

              {/* Status Donut Chart (4 cols) */}
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#242424] dark:text-[#F8FAFC]">
                    Booking Status Distribution
                  </h3>
                  <p className="text-[11px] text-[#77757D] dark:text-[#9AAAC2]">
                    Operational reservation status breakdown
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center my-auto py-2">
                  <div className="relative w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataset?.statusDistribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {dataset?.statusDistribution.map((entry) => (
                            <Cell key={entry.status} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--admin-card)",
                            borderColor: "var(--admin-border)",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono leading-none">
                        {kpis?.totalBookings.current}
                      </span>
                      <span className="text-[10px] text-[#77757D] uppercase font-semibold">Orders</span>
                    </div>
                  </div>

                  <div className="w-full space-y-1.5 mt-2">
                    {dataset?.statusDistribution.map((st) => (
                      <div key={st.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />
                          <span className="text-[11px] text-[#77757D] dark:text-[#9AAAC2]">{st.label}</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#242424] dark:text-[#F8FAFC]">
                          {st.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Bookings Table (Section 6.E) */}
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#242424] dark:text-[#F8FAFC]">
                    Detailed Booking Records
                  </h3>
                  <p className="text-xs text-[#77757D] dark:text-[#9AAAC2]">
                    Inspect active reservations and transaction states
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Search */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#77757D]" />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={bookingSearch}
                      onChange={(e) => {
                        setBookingSearch(e.target.value);
                        setBookingPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-xs text-[#242424] dark:text-[#F8FAFC] placeholder:text-[#77757D] w-48 focus:outline-none focus:border-[#FF7655]"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => {
                      setBookingStatusFilter(e.target.value);
                      setBookingPage(1);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-xs text-[#242424] dark:text-[#F8FAFC] cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E4E9] dark:border-[#273244] text-[11px] font-mono uppercase text-[#77757D] dark:text-[#9AAAC2]">
                      <th className="py-2.5 px-3">Booking ID</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Rental Dates</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E4E9] dark:divide-[#273244]">
                    {paginatedBookings.length > 0 ? (
                      paginatedBookings.map((b) => (
                        <tr
                          key={b.id}
                          className="hover:bg-[#F8F7F9] dark:hover:bg-[#162238]/40 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono text-[11px] font-bold text-[#FF7655]">
                            {b.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#242424] dark:text-[#F8FAFC] truncate max-w-[200px]">
                              {b.productTitle}
                            </div>
                            <div className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">
                              Owner: {b.ownerName || "Verified Lender"}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#242424] dark:text-[#F8FAFC]">
                            {b.customerName || "Customer"}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#77757D] dark:text-[#9AAAC2]">
                            {b.startDate ? `${b.startDate.slice(5)} → ${b.endDate?.slice(5) || ""}` : "Flexible"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#242424] dark:text-[#F8FAFC]">
                            ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                                b.status === "completed"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : b.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : b.status === "confirmed"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : b.status === "cancelled"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-[#77757D] dark:text-[#9AAAC2]">
                              {b.deliveryStatus || "DELIVERED"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-xs text-[#77757D]">
                          No bookings matching criteria in selected window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredBookings.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E6E4E9] dark:border-[#273244] text-xs">
                  <span className="text-[#77757D] dark:text-[#9AAAC2] text-[11px]">
                    Showing {(bookingPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(bookingPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                      disabled={bookingPage === 1}
                      className="p-1 rounded-lg border border-[#E6E4E9] dark:border-[#273244] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-2">{bookingPage}</span>
                    <button
                      onClick={() =>
                        setBookingPage((p) =>
                          p * itemsPerPage < filteredBookings.length ? p + 1 : p
                        )
                      }
                      disabled={bookingPage * itemsPerPage >= filteredBookings.length}
                      className="p-1 rounded-lg border border-[#E6E4E9] dark:border-[#273244] disabled:opacity-40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. TAB 2: BOOKING FUNNEL (Section 7) */}
        {activeTab === "Funnel" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#242424] dark:text-[#F8FAFC]">
                  Real Telemetry Conversion Funnel
                </h3>
                <p className="text-xs text-[#77757D] dark:text-[#9AAAC2]">
                  Tracked end-to-end user actions from product view to completed gear return
                </p>
              </div>

              {/* Horizontal Funnel Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                {dataset?.funnel.stages.map((stage, idx, arr) => {
                  const prevCount = idx > 0 ? arr[idx - 1].count : null;
                  const convRate =
                    prevCount !== null && prevCount > 0
                      ? Math.round((stage.count / prevCount) * 100)
                      : null;
                  const dropOff = prevCount !== null ? Math.max(0, prevCount - stage.count) : null;

                  return (
                    <div
                      key={stage.id}
                      className="p-4 rounded-xl bg-[#F8F7F9] dark:bg-[#162238]/60 border border-[#E6E4E9] dark:border-[#273244] flex flex-col justify-between space-y-3 relative overflow-hidden"
                    >
                      {/* Stage indicator top badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#77757D] dark:text-[#9AAAC2]">
                          STEP 0{idx + 1}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Tracked
                        </span>
                      </div>

                      {/* Main Count & Label */}
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono">
                          {stage.count.toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-[#77757D] dark:text-[#9AAAC2] mt-0.5">
                          {stage.label}
                        </div>
                      </div>

                      {/* Conversion & Drop-off info */}
                      <div className="pt-2 border-t border-[#E6E4E9] dark:border-[#273244] space-y-1">
                        {convRate !== null ? (
                          <>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#77757D] dark:text-[#9AAAC2]">Conversion</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {convRate}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#77757D] dark:text-[#9AAAC2]">
                              <span>Drop-off</span>
                              <span className="font-mono text-rose-500">
                                -{dropOff} ({prevCount! > 0 ? Math.round((dropOff! / prevCount!) * 100) : 0}%)
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">
                            Top-of-funnel discovery benchmark
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Verification Note */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 text-xs text-[#242424] dark:text-[#F8FAFC] flex items-start gap-3 mt-4">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] text-[#77757D] dark:text-[#9AAAC2]">
                  <span className="font-bold text-[#242424] dark:text-[#F8FAFC] block">
                    Instrumentation & Telemetry Integrity
                  </span>
                  Product views and booking requests are captured directly through the client event tracker stream (<code className="font-mono text-[10px] bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">/api/events</code>), recording verified user sessions. Confirmed orders and completed rentals are synchronized with the authoritative SQL orders datastore without fabricated mock projections.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. TAB 3: PRODUCTS & FLEET UTILIZATION (Section 8) */}
        {activeTab === "Products" && (
          <div className="space-y-6">
            {/* Top Utilization KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Eligible Rentable Products
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.productUtilization.totalEligibleProducts}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Approved listings</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Fleet Rentable Product-Days
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.productUtilization.totalRentableDays.toLocaleString()}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Capacity in period</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Occupied Product-Days
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.productUtilization.totalOccupiedDays.toLocaleString()}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Leased to renters</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] text-white shadow-md">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
                  Rental Utilization Rate
                </span>
                <div className="text-2xl font-extrabold font-mono mt-1">
                  {dataset?.productUtilization.utilizationRate}%
                </div>
                <span className="text-[10px] text-white/80">Occupied / Total Days × 100</span>
              </div>
            </div>

            {/* Products Table */}
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#242424] dark:text-[#F8FAFC]">
                    Product Utilization & Revenue Performance
                  </h3>
                  <p className="text-xs text-[#77757D] dark:text-[#9AAAC2]">
                    High-performing vs low-performing gear ranked by rental demand
                  </p>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#77757D]" />
                  <input
                    type="text"
                    placeholder="Search gear..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-xs text-[#242424] dark:text-[#F8FAFC] placeholder:text-[#77757D] w-48 focus:outline-none focus:border-[#FF7655]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E4E9] dark:border-[#273244] text-[11px] font-mono uppercase text-[#77757D] dark:text-[#9AAAC2]">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Daily Rate</th>
                      <th className="py-2.5 px-3 text-center">Rentals</th>
                      <th className="py-2.5 px-3 text-center">Occupied Days</th>
                      <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                      <th className="py-2.5 px-3 text-center">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E4E9] dark:divide-[#273244]">
                    {paginatedProducts.length > 0 ? (
                      paginatedProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#F8F7F9] dark:hover:bg-[#162238]/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-[#242424] dark:text-[#F8FAFC]">
                            {p.title}
                          </td>
                          <td className="py-3 px-3 text-[#77757D] dark:text-[#9AAAC2]">
                            {p.category}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#242424] dark:text-[#F8FAFC]">
                            ₹{p.price.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-[#242424] dark:text-[#F8FAFC]">
                            {p.totalRentals}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[#77757D] dark:text-[#9AAAC2]">
                            {p.occupiedDays}d
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#FF7655]">
                            ₹{p.revenue.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                                p.utilizationRate >= 50
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : p.utilizationRate > 0
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-black/5 dark:bg-white/10 text-[#77757D]"
                              )}
                            >
                              {p.utilizationRate}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-xs text-[#77757D]">
                          No product utilization records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 8. TAB 4: USERS & GROWTH (Section 9) */}
        {activeTab === "Users" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Total Registered Users
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.userMetrics.totalUsers}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Platform accounts</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  New Users in Period
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  +{dataset?.userMetrics.newUsersInPeriod}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Acquired in {dataset?.range.label.toLowerCase()}</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Renter Accounts
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.userMetrics.rentersCount}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Demand side</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Vendor / Lender Accounts
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.userMetrics.vendorsCount}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Supply side</span>
              </div>
            </div>

            {/* Distribution */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
              <h3 className="text-xs font-bold text-[#242424] dark:text-[#F8FAFC] mb-2">
                User Role Distribution
              </h3>
              <p className="text-[11px] text-[#77757D] dark:text-[#9AAAC2] mb-6">
                Breakdown between equipment renters, verified tech gear vendors, and administrators
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#242424] dark:text-[#F8FAFC]">Renters</span>
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-xl font-mono font-bold mt-2">{dataset?.userMetrics.rentersCount}</div>
                  <span className="text-[10px] text-[#77757D]">Equipment consumers</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#242424] dark:text-[#F8FAFC]">Vendors / Lenders</span>
                    <Package className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-mono font-bold mt-2">{dataset?.userMetrics.vendorsCount}</div>
                  <span className="text-[10px] text-[#77757D]">Gear providers</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#242424] dark:text-[#F8FAFC]">Administrators</span>
                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-xl font-mono font-bold mt-2">{dataset?.userMetrics.adminsCount}</div>
                  <span className="text-[10px] text-[#77757D]">Platform governance</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. TAB 5: DELIVERIES & SECURITY (Section 10) */}
        {activeTab === "Deliveries" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Total Assigned Dispatches
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.deliveryMetrics.totalAssigned}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Handover dispatches</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Completed Deliveries
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {dataset?.deliveryMetrics.completed}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Fulfillments confirmed</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  In-Transit / En Route
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  {dataset?.deliveryMetrics.inTransit}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Active dispatches</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Dual-PIN Compliance Rate
                </span>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1">
                  {dataset?.deliveryMetrics.pinVerificationRate}%
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Cryptographic verification</span>
              </div>
            </div>

            {/* Delivery Audit Table */}
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#242424] dark:text-[#F8FAFC]">
                  Field Delivery & PIN Verification Logs
                </h3>
                <p className="text-xs text-[#77757D] dark:text-[#9AAAC2]">
                  Audit dual-PIN verification states for equipment handover
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E4E9] dark:border-[#273244] text-[11px] font-mono uppercase text-[#77757D] dark:text-[#9AAAC2]">
                      <th className="py-2.5 px-3">Booking ID</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Agent</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Vendor PIN</th>
                      <th className="py-2.5 px-3 text-center">Renter PIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E4E9] dark:divide-[#273244]">
                    {dataset?.deliveryMetrics.records.slice(0, 8).map((d) => (
                      <tr key={d.id} className="hover:bg-[#F8F7F9] dark:hover:bg-[#162238]/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#FF7655]">
                          {d.bookingId}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#242424] dark:text-[#F8FAFC]">
                          {d.productTitle}
                        </td>
                        <td className="py-3 px-3 text-[#77757D] dark:text-[#9AAAC2]">
                          {d.customerName}
                        </td>
                        <td className="py-3 px-3 text-[#242424] dark:text-[#F8FAFC]">
                          {d.deliveryAgent}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244]">
                            {d.deliveryStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.vendorPinVerified ? (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-500">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.renterPinVerified ? (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-500">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 10. TAB 6: FINANCE & RECONCILIATION (Section 11) */}
        {activeTab === "Finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Gross Rental Value
                </span>
                <div className="text-2xl font-extrabold text-[#242424] dark:text-[#F8FAFC] font-mono mt-1">
                  ₹{dataset?.finance.grossRentalValue.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Total transaction volume</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F9856A] to-[#FF7655] text-white shadow-md">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
                  Platform Commission (10%)
                </span>
                <div className="text-2xl font-extrabold font-mono mt-1">
                  ₹{dataset?.finance.platformRevenue.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-white/80">Net platform earnings</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Payments Collected
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  ₹{dataset?.finance.paymentsCollected.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Realized settlement funds</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] shadow-xs">
                <span className="text-[11px] font-semibold text-[#77757D] dark:text-[#9AAAC2]">
                  Completed Refunds
                </span>
                <div className="text-2xl font-extrabold text-rose-500 font-mono mt-1">
                  ₹{dataset?.finance.completedRefunds.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-[#77757D] dark:text-[#9AAAC2]">Processed returns</span>
              </div>
            </div>

            {/* Financial Reconciliation Table (Read-Only) */}
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-[#E6E4E9] dark:border-[#273244] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#242424] dark:text-[#F8FAFC]">
                    Read-Only Financial Reconciliation Audit
                  </h3>
                  <p className="text-xs text-[#77757D] dark:text-[#9AAAC2]">
                    10% Platform fee calculation, 90% vendor payout allocation, and settlement status
                  </p>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#77757D]" />
                  <input
                    type="text"
                    placeholder="Search reconciliation..."
                    value={reconciliationSearch}
                    onChange={(e) => {
                      setReconciliationSearch(e.target.value);
                      setReconciliationPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244] text-xs text-[#242424] dark:text-[#F8FAFC] placeholder:text-[#77757D] w-52 focus:outline-none focus:border-[#FF7655]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E4E9] dark:border-[#273244] text-[11px] font-mono uppercase text-[#77757D] dark:text-[#9AAAC2]">
                      <th className="py-2.5 px-3">Booking ID</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3 text-right">Gross Amount</th>
                      <th className="py-2.5 px-3 text-right">Platform (10%)</th>
                      <th className="py-2.5 px-3 text-right">Vendor (90%)</th>
                      <th className="py-2.5 px-3 text-center">Payment</th>
                      <th className="py-2.5 px-3 text-center">Reconciliation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E4E9] dark:divide-[#273244]">
                    {paginatedReconciliation.length > 0 ? (
                      paginatedReconciliation.map((r) => (
                        <tr key={r.id} className="hover:bg-[#F8F7F9] dark:hover:bg-[#162238]/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#FF7655]">
                            {r.bookingId}
                          </td>
                          <td className="py-3 px-3 text-[#242424] dark:text-[#F8FAFC]">
                            {r.customerName}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#242424] dark:text-[#F8FAFC]">
                            ₹{r.grossAmount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{r.platformFee.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#77757D] dark:text-[#9AAAC2]">
                            ₹{r.vendorPayout.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="capitalize text-[10px] font-mono px-2 py-0.5 rounded bg-[#F8F7F9] dark:bg-[#162238] border border-[#E6E4E9] dark:border-[#273244]">
                              {r.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-semibold",
                                r.reconciliationStatus === "Reconciled"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : r.reconciliationStatus === "Settlement Due"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : r.reconciliationStatus === "Refunded"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {r.reconciliationStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-xs text-[#77757D]">
                          No financial records in selected window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
