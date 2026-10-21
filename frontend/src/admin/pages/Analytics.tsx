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
  Users as UsersIcon,
  Truck,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  FileSpreadsheet,
  Check,
  BarChart2,
  Activity,
  SlidersHorizontal,
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
  calculateDateRange,
  fetchAnalyticsData,
  AnalyticsDataset,
  exportToCsv,
} from "../services/analytics";

type TabType = "Overview" | "Bookings" | "Products" | "Users" | "Delivery" | "Finance";

const PALETTE = {
  accent: "#635BFF", // Primary Stripe-grade indigo
  accentMuted: "rgba(99, 91, 255, 0.12)",
  positive: "#16865C",
  warning: "#D99118",
  negative: "#DC4545",
  gray: "#71717A",
  prevLine: "#94A3B8",
};

const CATEGORY_COLORS = ["#635BFF", "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"];

export default function Analytics() {
  const [preset, setPreset] = useState<DateRangePreset>("7d"); // Default: Last 7 Days
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);

  // Default view is Overview as requested in Section 5
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
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
      <div className="space-y-6 max-w-[1520px] mx-auto pb-12 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div className="space-y-1.5">
            <div className="h-7 w-40 bg-[#E4E4E7] dark:bg-[#1E2330] rounded-md" />
            <div className="h-4 w-64 bg-[#E4E4E7] dark:bg-[#1E2330] rounded" />
          </div>
          <div className="h-9 w-80 bg-[#E4E4E7] dark:bg-[#1E2330] rounded-lg" />
        </div>
        <div className="h-28 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A]" />
        <div className="h-96 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A]" />
      </div>
    );
  }

  const kpis = dataset?.kpis;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6 max-w-[1520px] mx-auto pb-16 antialiased text-[#18181B] dark:text-[#F4F4F5]">
        {/* =========================================================================
            1. PAGE HEADER (Section 3)
            Clean, editorial header with inline controls and Last 7 Days default
           ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#E4E4E7] dark:border-[#27272A]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#635BFF]" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                Intelligence Workspace
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18181B] dark:text-[#FAFAFA] mt-0.5">
              Analytics
            </h1>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
              Understand bookings, rentals, and business performance.
            </p>
          </div>

          {/* Compact Control Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date-Range Segmented Selector */}
            <div className="flex items-center rounded-lg bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] p-0.5 text-xs font-medium">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "90d", label: "90 Days" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPreset(opt.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md transition-all cursor-pointer text-xs",
                    preset === opt.id
                      ? "bg-white dark:bg-[#12161F] text-[#18181B] dark:text-[#FAFAFA] font-semibold shadow-xs"
                      : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#FAFAFA]"
                  )}
                >
                  {opt.label}
                </button>
              ))}

              <button
                onClick={() => setShowCustomModal(true)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs",
                  preset === "custom"
                    ? "bg-white dark:bg-[#12161F] text-[#18181B] dark:text-[#FAFAFA] font-semibold shadow-xs"
                    : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#FAFAFA]"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>{preset === "custom" ? "Custom" : "Custom"}</span>
              </button>
            </div>

            {/* Compare Previous Period Toggle */}
            <button
              onClick={() => setComparePrevious(!comparePrevious)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5",
                comparePrevious
                  ? "bg-white dark:bg-[#12161F] text-[#18181B] dark:text-[#FAFAFA] border-[#E4E4E7] dark:border-[#27272A] shadow-xs"
                  : "bg-transparent text-[#71717A] dark:text-[#A1A1AA] border-[#E4E4E7] dark:border-[#27272A] opacity-70"
              )}
              title="Compare metrics with previous equivalent period"
            >
              <Activity className={cn("h-3 w-3", comparePrevious ? "text-[#635BFF]" : "text-[#71717A]")} />
              <span className="hidden sm:inline">Compare</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] text-[#71717A] hover:text-[#18181B] dark:hover:text-[#FAFAFA] shadow-xs transition-colors cursor-pointer"
              title="Refresh live analytics data"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-[#635BFF]")} />
            </button>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] text-[#18181B] dark:text-[#FAFAFA] text-xs font-medium shadow-xs hover:bg-[#F4F4F5] dark:hover:bg-[#1A1F2C] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-[#635BFF]" />
                <span>Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-lg p-1.5 z-50 text-xs">
                  <button
                    onClick={handleExportBookings}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#F4F4F5] dark:hover:bg-[#1A1F2C] text-[#18181B] dark:text-[#FAFAFA] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-[#16865C]" />
                    <span>Bookings Summary (CSV)</span>
                  </button>
                  <button
                    onClick={handleExportReconciliation}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#F4F4F5] dark:hover:bg-[#1A1F2C] text-[#18181B] dark:text-[#FAFAFA] flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-[#635BFF]" />
                    <span>Reconciliation Report (CSV)</span>
                  </button>
                  <button
                    onClick={handleExportFleetUtilization}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#F4F4F5] dark:hover:bg-[#1A1F2C] text-[#18181B] dark:text-[#FAFAFA] flex items-center gap-2 cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 text-[#D99118]" />
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="w-full max-w-sm rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] p-5 shadow-xl space-y-4 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E4E7] dark:border-[#27272A]">
                  <h3 className="font-semibold text-sm text-[#18181B] dark:text-[#FAFAFA]">
                    Select Date Range
                  </h3>
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="text-[#71717A] hover:text-[#18181B] dark:hover:text-[#FAFAFA]"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] text-[#18181B] dark:text-[#FAFAFA]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] text-[#18181B] dark:text-[#FAFAFA]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#27272A] font-medium text-[#71717A]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!customStart || !customEnd) {
                        toast.error("Please pick both dates");
                        return;
                      }
                      if (new Date(customStart) > new Date(customEnd)) {
                        toast.error("Start date must be before end date");
                        return;
                      }
                      setPreset("custom");
                      setShowCustomModal(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#635BFF] text-white font-medium cursor-pointer shadow-xs"
                  >
                    Apply Range
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            2. REFINED KPI STRIP & OPERATIONAL SUMMARY (Section 4)
            Typographic emphasis, structured horizontal grid, no gaudy gradients
           ========================================================================= */}
        {kpis && (
          <div className="space-y-2.5">
            {/* Primary 6-Metric Strip */}
            <div className="rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7] dark:divide-[#27272A]">
                {/* 1. Total Bookings */}
                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                      Total Bookings
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[#71717A] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Customer reservation orders initiated</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[#18181B] dark:text-[#FAFAFA] mt-1.5">
                    {kpis.totalBookings.current.toLocaleString()}
                  </div>
                  {comparePrevious && (
                    <div className="flex items-center gap-1 text-[11px] mt-1.5">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.totalBookings.trend === "up"
                            ? "text-[#16865C]"
                            : kpis.totalBookings.trend === "down"
                            ? "text-[#DC4545]"
                            : "text-[#71717A]"
                        )}
                      >
                        {kpis.totalBookings.trend === "up" && <ArrowUpRight className="h-3 w-3 inline" />}
                        {kpis.totalBookings.trend === "down" && <ArrowDownRight className="h-3 w-3 inline" />}
                        {kpis.totalBookings.percentageChange !== null
                          ? `${kpis.totalBookings.percentageChange > 0 ? "+" : ""}${kpis.totalBookings.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">vs prior</span>
                    </div>
                  )}
                </div>

                {/* 2. Completed Rentals */}
                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                      Completed Rentals
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[#71717A] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Fulfillments safely returned and closed</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[#18181B] dark:text-[#FAFAFA] mt-1.5">
                    {kpis.completedRentals.current.toLocaleString()}
                  </div>
                  {comparePrevious && (
                    <div className="flex items-center gap-1 text-[11px] mt-1.5">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.completedRentals.trend === "up" ? "text-[#16865C]" : "text-[#71717A]"
                        )}
                      >
                        {kpis.completedRentals.percentageChange !== null
                          ? `${kpis.completedRentals.percentageChange > 0 ? "+" : ""}${kpis.completedRentals.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">vs prior</span>
                    </div>
                  )}
                </div>

                {/* 3. Confirmed Bookings */}
                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                      Confirmed Bookings
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[#71717A] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Lender accepted & active reservations</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[#18181B] dark:text-[#FAFAFA] mt-1.5">
                    {kpis.confirmedBookings.current.toLocaleString()}
                  </div>
                  {comparePrevious && (
                    <div className="flex items-center gap-1 text-[11px] mt-1.5">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.confirmedBookings.trend === "up" ? "text-[#16865C]" : "text-[#71717A]"
                        )}
                      >
                        {kpis.confirmedBookings.percentageChange !== null
                          ? `${kpis.confirmedBookings.percentageChange > 0 ? "+" : ""}${kpis.confirmedBookings.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">vs prior</span>
                    </div>
                  )}
                </div>

                {/* 4. Cancelled Bookings */}
                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                      Cancelled Bookings
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[#71717A] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Terminated or refunded bookings</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[#DC4545] mt-1.5">
                    {kpis.cancelledBookings.current.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-1.5 text-[#71717A] dark:text-[#A1A1AA]">
                    <span className="font-mono text-[#DC4545] font-medium">
                      {kpis.cancellationRate.current}%
                    </span>
                    <span className="text-[10px]">rate</span>
                  </div>
                </div>

                {/* 5. Gross Rental Value */}
                <div className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                      Gross Rental Value
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[#71717A] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Total gross rental turnover</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[#18181B] dark:text-[#FAFAFA] mt-1.5">
                    ₹{kpis.grossRentalValue.current.toLocaleString("en-IN")}
                  </div>
                  {comparePrevious && (
                    <div className="flex items-center gap-1 text-[11px] mt-1.5">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.grossRentalValue.trend === "up" ? "text-[#16865C]" : "text-[#71717A]"
                        )}
                      >
                        {kpis.grossRentalValue.percentageChange !== null
                          ? `${kpis.grossRentalValue.percentageChange > 0 ? "+" : ""}${kpis.grossRentalValue.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">vs prior</span>
                    </div>
                  )}
                </div>

                {/* 6. Platform Revenue (10% Take-rate) */}
                <div className="p-4 flex flex-col justify-between bg-[#FAFAFB] dark:bg-[#161B26]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#635BFF]">
                      Platform Revenue
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[#635BFF] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">10% Platform fee on realized transactions</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[#635BFF] mt-1.5">
                    ₹{kpis.platformRevenue.current.toLocaleString("en-IN")}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-1.5 text-[#71717A] dark:text-[#A1A1AA]">
                    <span className="font-mono text-[#16865C] font-semibold text-[10px]">10% fee</span>
                    <span className="text-[10px]">take-rate</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Operational Summary Strip (Section 4) */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] text-xs text-[#71717A] dark:text-[#A1A1AA]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>
                    <strong className="text-[#18181B] dark:text-[#FAFAFA] font-mono">
                      {kpis.activeRentals.current}
                    </strong>{" "}
                    Active Rentals in circulation
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#635BFF]" />
                  <span>
                    <strong className="text-[#18181B] dark:text-[#FAFAFA] font-mono">
                      {kpis.rentalUtilizationRate.current}%
                    </strong>{" "}
                    Fleet Utilization Rate
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>
                    <strong className="text-[#18181B] dark:text-[#FAFAFA] font-mono">
                      {kpis.openIssues.current}
                    </strong>{" "}
                    Open Operational Issues
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#71717A]">
                Datastore: MySQL Live / Ingest Stream
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. SECTION NAVIGATION (Section 5)
            Compact segmented navigation: Overview (initial), Bookings, Products, Users, Delivery, Finance
           ========================================================================= */}
        <div className="flex items-center justify-between border-b border-[#E4E4E7] dark:border-[#27272A] pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "Overview", label: "Overview" },
                { id: "Bookings", label: "Bookings" },
                { id: "Products", label: "Products & Utilization" },
                { id: "Users", label: "Users" },
                { id: "Delivery", label: "Delivery" },
                { id: "Finance", label: "Finance" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-[#18181B] text-white dark:bg-[#FAFAFA] dark:text-[#18181B] shadow-xs"
                    : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#1A1F2C]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-[#71717A] hidden sm:inline">
            Period: {dataset?.range.label}
          </span>
        </div>

        {/* =========================================================================
            4. TAB 1: OVERVIEW SECTION (Section 6)
            Asymmetric grid: Primary Booking Trend, Secondary Donut, 2-col supporting,
            Business Insights, and Recent Bookings table
           ========================================================================= */}
        {activeTab === "Overview" && (
          <div className="space-y-6">
            {/* Primary & Secondary Row: Asymmetric 8 / 4 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Primary: Large Booking Trend Chart (8 cols) - Visual Centerpiece */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#18181B] dark:text-[#FAFAFA] uppercase tracking-wide">
                      Booking Velocity
                    </h3>
                    <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                      Daily reservation volume across selected interval
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#18181B] dark:text-[#FAFAFA]">
                      <span className="h-2 w-2 rounded-full bg-[#635BFF]" />
                      Current Period
                    </span>
                    {comparePrevious && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                        <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                        Previous Window
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-72 w-full pt-1">
                  {dataset?.bookingTrend && dataset.bookingTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataset.bookingTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="label" stroke="#71717A" fontSize={10} tickLine={false} />
                        <YAxis stroke="#71717A" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181B",
                            borderColor: "#27272A",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "#FFFFFF",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="currentBookings"
                          name="Current"
                          stroke="#635BFF"
                          strokeWidth={2.2}
                          dot={{ r: 2.5, fill: "#635BFF" }}
                          activeDot={{ r: 4.5 }}
                        />
                        {comparePrevious && (
                          <Line
                            type="monotone"
                            dataKey="previousBookings"
                            name="Previous"
                            stroke="#94A3B8"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#71717A]">
                      No activity in this date range.
                    </div>
                  )}
                </div>
              </div>

              {/* Secondary: Booking Status Donut Chart (4 cols) */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#18181B] dark:text-[#FAFAFA] uppercase tracking-wide">
                    Booking Status
                  </h3>
                  <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                    Current order states
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center my-auto py-2">
                  <div className="relative w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataset?.statusDistribution || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={66}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {dataset?.statusDistribution.map((entry) => (
                            <Cell key={entry.status} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181B",
                            borderColor: "#27272A",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "#FFFFFF",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold font-mono leading-none">
                        {kpis?.totalBookings.current}
                      </span>
                      <span className="text-[9px] text-[#71717A] uppercase font-semibold">Orders</span>
                    </div>
                  </div>

                  <div className="w-full space-y-1.5 mt-2">
                    {dataset?.statusDistribution.map((st) => (
                      <div key={st.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />
                          <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{st.label}</span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[#18181B] dark:text-[#FAFAFA]">
                          {st.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Supporting Two-Column Section: Category Performance & Rental Revenue Progression */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Category Breakdown (Bar comparison) */}
              <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-[#18181B] dark:text-[#FAFAFA] uppercase tracking-wide">
                    Category Performance
                  </h3>
                  <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                    Booking demand across gear categories
                  </p>
                </div>

                <div className="h-56 w-full">
                  {dataset?.categoryBreakdown && dataset.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataset.categoryBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis type="number" stroke="#71717A" fontSize={10} tickLine={false} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" stroke="#71717A" fontSize={11} tickLine={false} width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181B",
                            borderColor: "#27272A",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "#FFFFFF",
                          }}
                        />
                        <Bar dataKey="bookings" fill="#635BFF" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#71717A]">
                      No category metrics available.
                    </div>
                  )}
                </div>
              </div>

              {/* Rental Revenue Progression (Area chart) */}
              <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-[#18181B] dark:text-[#FAFAFA] uppercase tracking-wide">
                    Rental Turnover Progression
                  </h3>
                  <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                    Realized transaction turnover over time
                  </p>
                </div>

                <div className="h-56 w-full">
                  {dataset?.bookingTrend && dataset.bookingTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataset.bookingTrend}>
                        <defs>
                          <linearGradient id="editorialRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#635BFF" stopOpacity={0.16} />
                            <stop offset="100%" stopColor="#635BFF" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="label" stroke="#71717A" fontSize={10} tickLine={false} />
                        <YAxis stroke="#71717A" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${v/1000}k` : v}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#18181B",
                            borderColor: "#27272A",
                            borderRadius: "8px",
                            fontSize: "11px",
                            color: "#FFFFFF",
                          }}
                          formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Turnover"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="currentRevenue"
                          stroke="#635BFF"
                          strokeWidth={2}
                          fill="url(#editorialRevGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#71717A]">
                      No revenue progression data.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Insights Section (Section 6.D) */}
            {dataset?.insights && dataset.insights.length > 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#635BFF]" />
                    <h3 className="text-xs font-bold text-[#18181B] dark:text-[#FAFAFA] uppercase tracking-wide">
                      Deterministic Business Insights
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717A]">
                    Verified calculations for {dataset.range.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dataset.insights.slice(0, 3).map((ins) => (
                    <div
                      key={ins.id}
                      onClick={() => setActiveTab(ins.tabTarget === "Products" ? "Products" : ins.tabTarget === "Deliveries" ? "Delivery" : ins.tabTarget as TabType)}
                      className="p-3 rounded-lg bg-[#F7F7F8] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] hover:border-[#635BFF]/40 transition-colors cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[#18181B] dark:text-[#FAFAFA]">
                            {ins.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#635BFF]">
                            {ins.metric}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
                          {ins.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-[#635BFF] flex items-center gap-1 mt-2">
                        Inspect in {ins.tabTarget} <ArrowUpRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Records Section: Recent Bookings Table (Section 6.E) */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-[#18181B] dark:text-[#FAFAFA] uppercase tracking-wide">
                    Recent Bookings
                  </h3>
                  <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                    Real reservation ledger across the platform
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={bookingSearch}
                      onChange={(e) => {
                        setBookingSearch(e.target.value);
                        setBookingPage(1);
                      }}
                      className="pl-7 pr-2.5 py-1 rounded-md bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] text-xs text-[#18181B] dark:text-[#FAFAFA] placeholder:text-[#71717A] w-44 focus:outline-none focus:border-[#635BFF]"
                    />
                  </div>

                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => {
                      setBookingStatusFilter(e.target.value);
                      setBookingPage(1);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] text-xs text-[#18181B] dark:text-[#FAFAFA] cursor-pointer"
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

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-[#27272A] text-[10px] font-mono uppercase text-[#71717A] dark:text-[#A1A1AA]">
                      <th className="py-2 px-2.5">ID</th>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5">Period</th>
                      <th className="py-2 px-2.5 text-right">Amount</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
                    {paginatedBookings.length > 0 ? (
                      paginatedBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F7F7F8] dark:hover:bg-[#1A1F2C]/50 transition-colors">
                          <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[#635BFF]">
                            {b.id}
                          </td>
                          <td className="py-2.5 px-2.5 font-medium text-[#18181B] dark:text-[#FAFAFA] truncate max-w-[180px]">
                            {b.productTitle}
                          </td>
                          <td className="py-2.5 px-2.5 text-[#71717A] dark:text-[#A1A1AA]">
                            {b.customerName || "Customer"}
                          </td>
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-[#71717A]">
                            {b.startDate ? `${b.startDate.slice(5)} → ${b.endDate?.slice(5) || ""}` : "Standard"}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-medium text-[#18181B] dark:text-[#FAFAFA]">
                            ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-medium capitalize",
                                b.status === "completed"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50"
                                  : b.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50"
                                  : b.status === "confirmed"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50"
                                  : b.status === "cancelled"
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50"
                              )}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono text-[10px] text-[#71717A]">
                            {b.paymentStatus || "paid"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-xs text-[#71717A]">
                          No bookings matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E4E4E7] dark:border-[#27272A] text-xs">
                  <span className="text-[#71717A] text-[11px]">
                    Showing {(bookingPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(bookingPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                      disabled={bookingPage === 1}
                      className="p-1 rounded border border-[#E4E4E7] dark:border-[#27272A] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <span className="font-mono text-[11px] px-1.5">{bookingPage}</span>
                    <button
                      onClick={() =>
                        setBookingPage((p) =>
                          p * itemsPerPage < filteredBookings.length ? p + 1 : p
                        )
                      }
                      disabled={bookingPage * itemsPerPage >= filteredBookings.length}
                      className="p-1 rounded border border-[#E4E4E7] dark:border-[#27272A] disabled:opacity-40"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            5. TAB 2: BOOKINGS ANALYTICS (Section 7)
           ========================================================================= */}
        {activeTab === "Bookings" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide">
                      Booking Trajectory & Comparison
                    </h3>
                    <p className="text-[11px] text-[#71717A]">
                      Comparing current interval against preceding equivalent window
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataset?.bookingTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="label" stroke="#71717A" fontSize={10} tickLine={false} />
                      <YAxis stroke="#71717A" fontSize={10} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181B",
                          borderColor: "#27272A",
                          borderRadius: "8px",
                          fontSize: "11px",
                          color: "#FFFFFF",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="currentBookings"
                        name="Current"
                        stroke="#635BFF"
                        strokeWidth={2.2}
                        dot={{ r: 2.5, fill: "#635BFF" }}
                      />
                      {comparePrevious && (
                        <Line
                          type="monotone"
                          dataKey="previousBookings"
                          name="Previous Period"
                          stroke="#94A3B8"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide">
                    Confirmed vs Completed
                  </h3>
                  <p className="text-[11px] text-[#71717A]">
                    Fulfillment resolution ratio
                  </p>
                </div>

                <div className="py-6 space-y-4 my-auto">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Confirmed Bookings</span>
                      <span className="font-mono font-bold">{kpis?.confirmedBookings.current}</span>
                    </div>
                    <div className="h-2 w-full bg-[#F4F4F5] dark:bg-[#1A1F2C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((kpis?.confirmedBookings.current || 0) / Math.max(1, kpis?.totalBookings.current || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Completed Rentals</span>
                      <span className="font-mono font-bold">{kpis?.completedRentals.current}</span>
                    </div>
                    <div className="h-2 w-full bg-[#F4F4F5] dark:bg-[#1A1F2C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((kpis?.completedRentals.current || 0) / Math.max(1, kpis?.totalBookings.current || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Cancelled Bookings</span>
                      <span className="font-mono font-bold text-[#DC4545]">{kpis?.cancelledBookings.current}</span>
                    </div>
                    <div className="h-2 w-full bg-[#F4F4F5] dark:bg-[#1A1F2C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#DC4545] rounded-full"
                        style={{
                          width: `${Math.min(100, ((kpis?.cancelledBookings.current || 0) / Math.max(1, kpis?.totalBookings.current || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Comprehensive Booking Records
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-[#27272A] text-[10px] font-mono uppercase text-[#71717A]">
                      <th className="py-2 px-2.5">ID</th>
                      <th className="py-2 px-2.5">Item</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5 text-right">Amount</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-center">Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
                    {paginatedBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F7F7F8] dark:hover:bg-[#1A1F2C]/40">
                        <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[#635BFF]">{b.id}</td>
                        <td className="py-2.5 px-2.5 font-medium truncate max-w-[200px]">{b.productTitle}</td>
                        <td className="py-2.5 px-2.5 text-[#71717A]">{b.customerName}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium">₹{Number(b.amount || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-black/5 dark:bg-white/10">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center text-[10px] font-mono text-[#71717A]">
                          {b.deliveryStatus || "DELIVERED"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. TAB 3: PRODUCTS & UTILIZATION (Section 8)
           ========================================================================= */}
        {activeTab === "Products" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Eligible Products</span>
                <div className="text-2xl font-bold font-mono mt-1">
                  {dataset?.productUtilization.totalEligibleProducts}
                </div>
                <span className="text-[10px] text-[#71717A]">Active rentable fleet</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Rentable Product-Days</span>
                <div className="text-2xl font-bold font-mono mt-1">
                  {dataset?.productUtilization.totalRentableDays.toLocaleString()}
                </div>
                <span className="text-[10px] text-[#71717A]">Total capacity in interval</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Occupied Product-Days</span>
                <div className="text-2xl font-bold font-mono mt-1">
                  {dataset?.productUtilization.totalOccupiedDays.toLocaleString()}
                </div>
                <span className="text-[10px] text-[#71717A]">Days rented</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#635BFF]">Utilization Rate</span>
                <div className="text-2xl font-bold font-mono text-[#635BFF] mt-1">
                  {dataset?.productUtilization.utilizationRate}%
                </div>
                <span className="text-[10px] text-[#71717A]">Occupied / Total Days × 100</span>
              </div>
            </div>

            {/* Product Table */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">
                  Gear Utilization & Turnover Ledger
                </h3>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text"
                    placeholder="Search gear..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductPage(1);
                    }}
                    className="pl-7 pr-2.5 py-1 rounded-md bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] text-xs w-44"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-[#27272A] text-[10px] font-mono uppercase text-[#71717A]">
                      <th className="py-2 px-2.5">Title</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5 text-right">Daily Rate</th>
                      <th className="py-2 px-2.5 text-center">Rentals</th>
                      <th className="py-2 px-2.5 text-center">Occupied Days</th>
                      <th className="py-2 px-2.5 text-right">Turnover</th>
                      <th className="py-2 px-2.5 text-center">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F7F7F8] dark:hover:bg-[#1A1F2C]/40">
                        <td className="py-2.5 px-2.5 font-medium">{p.title}</td>
                        <td className="py-2.5 px-2.5 text-[#71717A]">{p.category}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono">₹{p.price.toLocaleString()}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-medium">{p.totalRentals}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[#71717A]">{p.occupiedDays}d</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-[#635BFF]">₹{p.revenue.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[11px] font-medium">{p.utilizationRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            7. TAB 4: USERS (Section 9)
           ========================================================================= */}
        {activeTab === "Users" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Total Accounts</span>
                <div className="text-2xl font-bold font-mono mt-1">{dataset?.userMetrics.totalUsers}</div>
                <span className="text-[10px] text-[#71717A]">Registered accounts</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#16865C]">New Registrations</span>
                <div className="text-2xl font-bold font-mono text-[#16865C] mt-1">+{dataset?.userMetrics.newUsersInPeriod}</div>
                <span className="text-[10px] text-[#71717A]">Joined in interval</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Renters</span>
                <div className="text-2xl font-bold font-mono mt-1">{dataset?.userMetrics.rentersCount}</div>
                <span className="text-[10px] text-[#71717A]">Gear consumers</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Vendors / Lenders</span>
                <div className="text-2xl font-bold font-mono mt-1">{dataset?.userMetrics.vendorsCount}</div>
                <span className="text-[10px] text-[#71717A]">Gear providers</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-1">
                Account Typology Breakdown
              </h3>
              <p className="text-[11px] text-[#71717A] mb-4">
                Platform actor distribution between consumers and tech equipment suppliers
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F7F7F8] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A]">
                  <span className="font-semibold block">Verified Renters</span>
                  <div className="text-xl font-bold font-mono mt-1">{dataset?.userMetrics.rentersCount}</div>
                  <span className="text-[10px] text-[#71717A]">Demand side active customers</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F7F8] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A]">
                  <span className="font-semibold block">Verified Vendors</span>
                  <div className="text-xl font-bold font-mono mt-1">{dataset?.userMetrics.vendorsCount}</div>
                  <span className="text-[10px] text-[#71717A]">Supply side inventory owners</span>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F7F7F8] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A]">
                  <span className="font-semibold block">Staff Administrators</span>
                  <div className="text-xl font-bold font-mono mt-1">{dataset?.userMetrics.adminsCount}</div>
                  <span className="text-[10px] text-[#71717A]">Platform operators & moderators</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. TAB 5: DELIVERY (Section 10)
           ========================================================================= */}
        {activeTab === "Delivery" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Assigned Dispatches</span>
                <div className="text-2xl font-bold font-mono mt-1">{dataset?.deliveryMetrics.totalAssigned}</div>
                <span className="text-[10px] text-[#71717A]">Field dispatches</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#16865C]">Delivered Orders</span>
                <div className="text-2xl font-bold font-mono text-[#16865C] mt-1">{dataset?.deliveryMetrics.completed}</div>
                <span className="text-[10px] text-[#71717A]">Successfully handed over</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">In-Transit</span>
                <div className="text-2xl font-bold font-mono mt-1">{dataset?.deliveryMetrics.inTransit}</div>
                <span className="text-[10px] text-[#71717A]">En route dispatches</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#635BFF]">Dual-PIN Compliance</span>
                <div className="text-2xl font-bold font-mono text-[#635BFF] mt-1">{dataset?.deliveryMetrics.pinVerificationRate}%</div>
                <span className="text-[10px] text-[#71717A]">Handover verification</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Delivery Dispatch Audit
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-[#27272A] text-[10px] font-mono uppercase text-[#71717A]">
                      <th className="py-2 px-2.5">Booking ID</th>
                      <th className="py-2 px-2.5">Gear</th>
                      <th className="py-2 px-2.5">Agent</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5 text-center">Vendor PIN</th>
                      <th className="py-2 px-2.5 text-center">Renter PIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
                    {dataset?.deliveryMetrics.records.map((d) => (
                      <tr key={d.id} className="hover:bg-[#F7F7F8] dark:hover:bg-[#1A1F2C]/40">
                        <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[#635BFF]">{d.bookingId}</td>
                        <td className="py-2.5 px-2.5 font-medium">{d.productTitle}</td>
                        <td className="py-2.5 px-2.5 text-[#71717A]">{d.deliveryAgent}</td>
                        <td className="py-2.5 px-2.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                            {d.deliveryStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center text-[10px] font-semibold text-[#16865C]">
                          {d.vendorPinVerified ? "✓ Verified" : "Pending"}
                        </td>
                        <td className="py-2.5 px-2.5 text-center text-[10px] font-semibold text-[#16865C]">
                          {d.renterPinVerified ? "✓ Verified" : "Pending"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            9. TAB 6: FINANCE & RECONCILIATION (Section 11)
           ========================================================================= */}
        {activeTab === "Finance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#71717A]">Gross Rental Value</span>
                <div className="text-2xl font-bold font-mono mt-1">₹{dataset?.finance.grossRentalValue.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-[#71717A]">Gross rental turnover</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#635BFF]">Platform Commission</span>
                <div className="text-2xl font-bold font-mono text-[#635BFF] mt-1">₹{dataset?.finance.platformRevenue.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-[#71717A]">10% platform take-rate</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#16865C]">Payments Collected</span>
                <div className="text-2xl font-bold font-mono text-[#16865C] mt-1">₹{dataset?.finance.paymentsCollected.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-[#71717A]">Realized funds</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs">
                <span className="text-[11px] font-medium text-[#DC4545]">Completed Refunds</span>
                <div className="text-2xl font-bold font-mono text-[#DC4545] mt-1">₹{dataset?.finance.completedRefunds.toLocaleString("en-IN")}</div>
                <span className="text-[10px] text-[#71717A]">Settled returns</span>
              </div>
            </div>

            {/* Read-Only Reconciliation Table */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#12161F] border border-[#E4E4E7] dark:border-[#27272A] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide">
                    Financial Reconciliation Ledger (Read-Only)
                  </h3>
                  <p className="text-[11px] text-[#71717A]">
                    10% Platform fee calculation, 90% vendor payout allocation, and reconciliation status
                  </p>
                </div>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text"
                    placeholder="Search reconciliation..."
                    value={reconciliationSearch}
                    onChange={(e) => {
                      setReconciliationSearch(e.target.value);
                      setReconciliationPage(1);
                    }}
                    className="pl-7 pr-2.5 py-1 rounded-md bg-[#F4F4F5] dark:bg-[#1A1F2C] border border-[#E4E4E7] dark:border-[#27272A] text-xs w-48"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E4E7] dark:border-[#27272A] text-[10px] font-mono uppercase text-[#71717A]">
                      <th className="py-2 px-2.5">Booking ID</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5 text-right">Gross Amount</th>
                      <th className="py-2 px-2.5 text-right">Platform Fee (10%)</th>
                      <th className="py-2 px-2.5 text-right">Vendor Settlement (90%)</th>
                      <th className="py-2 px-2.5 text-center">Payment</th>
                      <th className="py-2 px-2.5 text-center">Reconciliation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
                    {paginatedReconciliation.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F7F7F8] dark:hover:bg-[#1A1F2C]/40">
                        <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[#635BFF]">{r.bookingId}</td>
                        <td className="py-2.5 px-2.5 text-[#71717A]">{r.customerName}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium">₹{r.grossAmount.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-[#635BFF]">₹{r.platformFee.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-[#71717A]">₹{r.vendorPayout.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[10px] capitalize text-[#71717A]">{r.paymentStatus}</td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-medium",
                              r.reconciliationStatus === "Reconciled"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50"
                                : r.reconciliationStatus === "Settlement Due"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50"
                                : r.reconciliationStatus === "Refunded"
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50"
                            )}
                          >
                            {r.reconciliationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
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
