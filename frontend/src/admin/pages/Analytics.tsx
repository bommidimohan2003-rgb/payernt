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
  X,
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
  ChevronDown,
  ChevronUp,
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
import { useTheme } from "@/hooks/useTheme";
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

function getStatusChartColor(status: string, isDark: boolean): string {
  const key = status.toLowerCase();
  if (key.includes("active")) return isDark ? "#4CC38A" : "#047857";
  if (key.includes("confirm")) return isDark ? "#A1A1A6" : "#525252";
  if (key.includes("complet")) return isDark ? "#52525B" : "#A1A1AA";
  if (key.includes("pend")) return isDark ? "#F5B942" : "#D97706";
  if (key.includes("cancel")) return isDark ? "#E5484D" : "#C93636";
  return isDark ? "#85858B" : "#737373";
}

export default function Analytics() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentHex = isDark ? "#4CC38A" : "#047857";
  const prevLineHex = isDark ? "#71717A" : "#A1A1AA";
  const mutedHex = isDark ? "#85858B" : "#737373";
  const gridStroke = isDark ? "rgba(237,237,237,0.06)" : "rgba(23,23,23,0.06)";
  const tooltipStyle = {
    backgroundColor: isDark ? "#232325" : "#FFFFFF",
    borderColor: isDark ? "rgba(237,237,237,0.12)" : "rgba(23,23,23,0.12)",
    borderRadius: "8px",
    fontSize: "12px",
    color: isDark ? "#EDEDED" : "#171717",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };
  const categoryColors = isDark
    ? ["#4CC38A", "#A1A1A6", "#85858B", "#F5B942", "#52525B", "#71717A"]
    : ["#047857", "#525252", "#737373", "#8A5A00", "#A1A1AA", "#D4D4D8"];
  // Preset default: Last 7 Days
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dataset, setDataset] = useState<AnalyticsDataset | null>(null);

  // Collapsible advanced sections
  const [showFunnelSection, setShowFunnelSection] = useState<boolean>(false);
  const [showFinanceReconcileModal, setShowFinanceReconcileModal] = useState<boolean>(false);

  // Table filtering and pagination states
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

      const data = await fetchAnalyticsData(dateRange, isRefresh);
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
      b.paymentStatus || "paid",
      b.deliveryStatus || "DELIVERED",
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
      <div className="space-y-4 max-w-[95rem] mx-auto pb-12 antialiased">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--admin-border)]">
          <div className="space-y-1.5">
            <div className="h-6 w-32 bg-[var(--admin-elevated)] rounded-md" />
            <div className="h-3.5 w-64 bg-[var(--admin-elevated)] rounded" />
          </div>
          <div className="h-9 w-80 bg-[var(--admin-elevated)] rounded-lg" />
        </div>
        <div className="h-10 rounded-lg bg-[var(--admin-elevated)]" />
        <div className="h-24 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
        <div className="h-96 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)]" />
      </div>
    );
  }

  const kpis = dataset?.kpis;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5 max-w-[95rem] mx-auto pb-16 antialiased text-[var(--admin-text)]">
        {/* =========================================================================
            SECTION A — COMPACT HEADER
            Aligned single row on desktop, wrapping cleanly on mobile.
            Title, short description, date-range, compare toggle, refresh, export.
           ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-[var(--admin-border)]">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[var(--admin-text)]">
              Analytics
            </h1>
            <span className="hidden sm:inline text-xs text-[var(--admin-text-muted)]">•</span>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Understand bookings, rentals, and business performance.
            </p>
          </div>

          {/* Compact Aligned Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date-Range Selector */}
            <div className="flex items-center rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] p-1 text-xs font-medium">
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
                    "px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs",
                    preset === opt.id
                      ? "bg-[var(--admin-card)] text-[var(--admin-text)] font-semibold shadow-xs"
                      : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}

              <button
                onClick={() => setShowCustomModal(true)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-xs",
                  preset === "custom"
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] font-semibold shadow-xs"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>Custom</span>
              </button>
            </div>

            {/* Previous-Period Comparison Toggle */}
            <button
              onClick={() => setComparePrevious(!comparePrevious)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5",
                comparePrevious
                  ? "bg-[var(--admin-card)] text-[var(--admin-text)] border-[var(--admin-border)] shadow-xs"
                  : "bg-transparent text-[var(--admin-text-muted)] border-[var(--admin-border)] opacity-70"
              )}
              title="Compare metrics with previous equivalent period"
            >
              <Activity className={cn("h-3 w-3", comparePrevious ? "text-[var(--admin-success)]" : "text-[var(--admin-text-muted)]")} />
              <span className="hidden sm:inline">Compare</span>
            </button>

            {/* Refresh Action */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] shadow-xs transition-colors cursor-pointer"
              title="Refresh real-time telemetry"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-[var(--admin-success)]")} />
            </button>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] text-xs font-medium shadow-xs hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-[var(--admin-success)]" />
                <span>Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-lg p-1.5 z-50 text-xs">
                  <button
                    onClick={handleExportBookings}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-[var(--admin-success)]" />
                    <span>Bookings Ledger (CSV)</span>
                  </button>
                  <button
                    onClick={handleExportReconciliation}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-[var(--admin-success)]" />
                    <span>Reconciliation Report (CSV)</span>
                  </button>
                  <button
                    onClick={handleExportFleetUtilization}
                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] flex items-center gap-2 cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5 text-[var(--admin-warning)]" />
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-sm rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] p-5 shadow-xl space-y-4 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border)]">
                  <h3 className="font-semibold text-sm text-[var(--admin-text)]">
                    Select Date Range
                  </h3>
                  <button
                    onClick={() => setShowCustomModal(false)}
                    aria-label="Close date range dialog"
                    className="p-1 rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--admin-text-muted)] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--admin-text-muted)] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--admin-border)] font-medium text-[var(--admin-text-muted)] cursor-pointer"
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
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--admin-accent)] text-[var(--admin-bg)] font-medium hover:bg-[var(--admin-accent-hover)] transition-colors cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            SECTION B — ANALYTICS NAVIGATION
            Horizontal navigation bar placed DIRECTLY below the header.
            Tabs: Overview, Bookings, Products & Utilization, Users, Delivery, Finance.
           ========================================================================= */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] shadow-xs"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[var(--admin-text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-success)]" />
            <span>Range: {dataset?.range.label}</span>
          </div>
        </div>

        {/* =========================================================================
            SECTION C — INTEGRATED KPI STRIP
            Replaces oversized individual cards with a compact horizontal metric strip
            separated by subtle dividers.
            Metrics: Total Bookings, Completed Rentals, Confirmed Bookings,
            Cancelled Bookings, Gross Rental Value, Platform Revenue.
           ========================================================================= */}
        {kpis && (
          <div className="space-y-2">
            <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-[var(--admin-border)]">
                {/* 1. Total Bookings */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">
                      Total Bookings
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[var(--admin-text-muted)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Customer reservation orders initiated</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--admin-text)] mt-1">
                    {kpis.totalBookings.current.toLocaleString()}
                  </div>
                  {comparePrevious ? (
                    <div className="flex items-center gap-1 text-[11px] mt-1">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.totalBookings.trend === "up"
                            ? "text-[var(--admin-success)]"
                            : kpis.totalBookings.trend === "down"
                            ? "text-[var(--admin-error)]"
                            : "text-[var(--admin-text-muted)]"
                        )}
                      >
                        {kpis.totalBookings.trend === "up" && <ArrowUpRight className="h-3 w-3 inline" />}
                        {kpis.totalBookings.trend === "down" && <ArrowDownRight className="h-3 w-3 inline" />}
                        {kpis.totalBookings.percentageChange !== null
                          ? `${kpis.totalBookings.percentageChange > 0 ? "+" : ""}${kpis.totalBookings.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">vs prior</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--admin-text-muted)] mt-1">Orders</span>
                  )}
                </div>

                {/* 2. Completed Rentals */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">
                      Completed Rentals
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[var(--admin-text-muted)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Fulfillments safely returned and closed</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--admin-text)] mt-1">
                    {kpis.completedRentals.current.toLocaleString()}
                  </div>
                  {comparePrevious ? (
                    <div className="flex items-center gap-1 text-[11px] mt-1">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.completedRentals.trend === "up" ? "text-[var(--admin-success)]" : "text-[var(--admin-text-muted)]"
                        )}
                      >
                        {kpis.completedRentals.percentageChange !== null
                          ? `${kpis.completedRentals.percentageChange > 0 ? "+" : ""}${kpis.completedRentals.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">vs prior</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--admin-text-muted)] mt-1">Completed</span>
                  )}
                </div>

                {/* 3. Confirmed Bookings */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">
                      Confirmed Bookings
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[var(--admin-text-muted)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Lender accepted & active reservations</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--admin-text)] mt-1">
                    {kpis.confirmedBookings.current.toLocaleString()}
                  </div>
                  {comparePrevious ? (
                    <div className="flex items-center gap-1 text-[11px] mt-1">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.confirmedBookings.trend === "up" ? "text-[var(--admin-success)]" : "text-[var(--admin-text-muted)]"
                        )}
                      >
                        {kpis.confirmedBookings.percentageChange !== null
                          ? `${kpis.confirmedBookings.percentageChange > 0 ? "+" : ""}${kpis.confirmedBookings.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">vs prior</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--admin-text-muted)] mt-1">Confirmed</span>
                  )}
                </div>

                {/* 4. Cancelled Bookings */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">
                      Cancelled Bookings
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[var(--admin-text-muted)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Terminated or refunded bookings</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--admin-error)] mt-1">
                    {kpis.cancelledBookings.current.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-1 text-[var(--admin-text-muted)]">
                    <span className="font-mono text-[var(--admin-error)] font-semibold text-[11px]">
                      {kpis.cancellationRate.current}%
                    </span>
                    <span className="text-[11px]">cancel rate</span>
                  </div>
                </div>

                {/* 5. Gross Rental Value */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">
                      Gross Rental Value
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[var(--admin-text-muted)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Total gross rental turnover</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--admin-text)] mt-1">
                    ₹{kpis.grossRentalValue.current.toLocaleString("en-IN")}
                  </div>
                  {comparePrevious ? (
                    <div className="flex items-center gap-1 text-[11px] mt-1">
                      <span
                        className={cn(
                          "font-mono font-semibold flex items-center",
                          kpis.grossRentalValue.trend === "up" ? "text-[var(--admin-success)]" : "text-[var(--admin-text-muted)]"
                        )}
                      >
                        {kpis.grossRentalValue.percentageChange !== null
                          ? `${kpis.grossRentalValue.percentageChange > 0 ? "+" : ""}${kpis.grossRentalValue.percentageChange}%`
                          : "0%"}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">vs prior</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--admin-text-muted)] mt-1">Turnover</span>
                  )}
                </div>

                {/* 6. Platform Revenue (10% Take-rate) */}
                <div className="p-3.5 sm:p-4 flex flex-col justify-between bg-[var(--admin-elevated)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--admin-success)]">
                      Platform Revenue
                    </span>
                    <RadixTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-[var(--admin-success)] cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">10% Platform fee on realized transactions</TooltipContent>
                    </RadixTooltip>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-[var(--admin-success)] mt-1">
                    ₹{kpis.platformRevenue.current.toLocaleString("en-IN")}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-1 text-[var(--admin-text-muted)]">
                    <span className="font-mono text-[var(--admin-success)] font-semibold text-[11px]">10% fee</span>
                    <span className="text-[11px]">take-rate</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Operational Summary Strip */}
            <div className="flex flex-wrap items-center justify-between px-3.5 py-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)]">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                  <span>
                    <strong className="text-[var(--admin-text)] font-mono">
                      {kpis.activeRentals.current}
                    </strong>{" "}
                    Active Rentals in circulation
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                  <span>
                    <strong className="text-[var(--admin-text)] font-mono">
                      {kpis.rentalUtilizationRate.current}%
                    </strong>{" "}
                    Fleet Utilization Rate
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--admin-warning)]" />
                  <span>
                    <strong className="text-[var(--admin-text)] font-mono">
                      {kpis.openIssues.current}
                    </strong>{" "}
                    Open Operational Issues
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[var(--admin-text-muted)] hidden lg:block">
                Datastore: MySQL Live / Verified Ingest
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 1: OVERVIEW (Full 7-Section Architecture)
           ========================================================================= */}
        {activeTab === "Overview" && (
          <div className="space-y-5">
            {/* --------------------------------------------------------------------
                SECTION D — PRIMARY ANALYTICS WORKSPACE
                Asymmetric two-column layout:
                Left column (approx 68%): Primary trend visualization (Large booking chart)
                Right column (approx 32%): Performance summary & status distribution
               -------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Column (8 cols ~ 67%): Main Booking Trend Visual Focus */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Booking Velocity Trend
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Daily reservation volume across selected interval
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                      Current Period
                    </span>
                    {comparePrevious && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text-muted)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--admin-text-muted)]" />
                        Previous Window
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-80 w-full pt-1">
                  {dataset?.bookingTrend && dataset.bookingTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataset.bookingTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                        <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                        <YAxis stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                        />
                        <Line
                          type="monotone"
                          dataKey="currentBookings"
                          name="Current Period"
                          stroke={accentHex}
                          strokeWidth={2.4}
                          dot={{ r: 2.5, fill: accentHex }}
                          activeDot={{ r: 5 }}
                        />
                        {comparePrevious && (
                          <Line
                            type="monotone"
                            dataKey="previousBookings"
                            name="Previous Window"
                            stroke={prevLineHex}
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-muted)]">
                      No activity in this date range.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (4 cols ~ 33%): Performance Summary & Status Distribution */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Performance & Status Summary
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Order fulfillment distribution
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
                            <Cell key={entry.status} fill={getStatusChartColor(entry.status || entry.label, isDark)} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-bold font-mono leading-none">
                        {kpis?.totalBookings.current}
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">Orders</span>
                    </div>
                  </div>

                  {/* Status Counts List */}
                  <div className="w-full space-y-1.5 mt-2">
                    {dataset?.statusDistribution.map((st) => (
                      <div key={st.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getStatusChartColor(st.status || st.label, isDark) }} />
                          <span className="text-[11px] text-[var(--admin-text-muted)]">{st.label}</span>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[var(--admin-text)]">
                          {st.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Fulfillment Performance Progress Mini-Bars */}
                  <div className="w-full pt-3 mt-3 border-t border-[var(--admin-border)] space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--admin-text-muted)]">Fulfillment Rate</span>
                        <span className="font-mono font-semibold text-[var(--admin-success)]">
                          {kpis && kpis.totalBookings.current > 0
                            ? Math.round((kpis.completedRentals.current / kpis.totalBookings.current) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--admin-success)] rounded-full"
                          style={{
                            width: `${Math.min(100, kpis && kpis.totalBookings.current > 0 ? (kpis.completedRentals.current / kpis.totalBookings.current) * 100 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------
                SECTION E — BUSINESS INSIGHTS PANEL
                Placed directly below the primary chart area.
                Short list of meaningful data-backed insights with supporting metrics.
               -------------------------------------------------------------------- */}
            {dataset?.insights && dataset.insights.length > 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-3.5 w-3.5 text-[var(--admin-success)]" />
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Business Intelligence Insights
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--admin-text-muted)]">
                    Verified calculations for {dataset.range.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dataset.insights.slice(0, 3).map((ins) => (
                    <div
                      key={ins.id}
                      onClick={() =>
                        setActiveTab(
                          ins.tabTarget === "Products"
                            ? "Products"
                            : ins.tabTarget === "Deliveries"
                            ? "Delivery"
                            : (ins.tabTarget as TabType)
                        )
                      }
                      className="p-3.5 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] hover:border-[var(--admin-success)]/40 transition-colors cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[var(--admin-text)]">
                            {ins.title}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[var(--admin-success)]">
                            {ins.metric}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-muted)] leading-relaxed">
                          {ins.description}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--admin-success)] flex items-center gap-1 mt-2.5">
                        Inspect in {ins.tabTarget} <ArrowUpRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------
                SECTION F — SECONDARY VISUALIZATIONS
                Balanced two-column chart layout:
                Left: Category booking performance bar chart
                Right: Rental performance area chart
                Aligned in height with consistent spacing and tooltips.
               -------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Category Booking Performance */}
              <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Category Booking Performance
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Booking demand across gear categories
                  </p>
                </div>

                <div className="h-64 w-full">
                  {dataset?.categoryBreakdown && dataset.categoryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataset.categoryBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridStroke} />
                        <XAxis type="number" stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" stroke={mutedHex} fontSize={11} tickLine={false} width={105} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                        />
                        <Bar dataKey="bookings" fill={accentHex} radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-muted)]">
                      No category metrics available.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Rental Performance Area Chart */}
              <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Rental Turnover Progression
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Realized transaction revenue over time
                  </p>
                </div>

                <div className="h-64 w-full">
                  {dataset?.bookingTrend && dataset.bookingTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataset.bookingTrend}>
                        <defs>
                          <linearGradient id="editorialRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={accentHex} stopOpacity={0.16} />
                            <stop offset="100%" stopColor={accentHex} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                        <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                        <YAxis
                          stroke={mutedHex}
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Turnover"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="currentRevenue"
                          stroke={accentHex}
                          strokeWidth={2}
                          fill="url(#editorialRevGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-muted)]">
                      No revenue progression data.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------
                SECTION G — DETAILED RECORDS
                Recent bookings table placed below the charts.
                Includes: Booking ID, Product, Booking Date, Rental Period,
                Booking Status, Rental Amount, Payment Status.
                Preserves search, status filter, pagination, and links to /admin/bookings.
               -------------------------------------------------------------------- */}
            <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Recent Bookings Ledger
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Live reservation transactions across the platform
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search bookings"
                      value={bookingSearch}
                      onChange={(e) => {
                        setBookingSearch(e.target.value);
                        setBookingPage(1);
                      }}
                      className="pl-7 pr-2.5 py-1 rounded-md bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] w-44 focus:outline-none focus:border-[var(--admin-success)]"
                    />
                  </div>

                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => {
                      setBookingStatusFilter(e.target.value);
                      setBookingPage(1);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs text-[var(--admin-text)] cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <a
                    href="/admin/bookings"
                    className="px-2.5 py-1 rounded-md border border-[var(--admin-border)] text-xs text-[var(--admin-success)] hover:bg-[var(--admin-elevated)] flex items-center gap-1 transition-colors"
                  >
                    <span>View All</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-medium text-[var(--admin-text-muted)]">
                      <th className="py-2 px-2.5">Booking ID</th>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5">Period</th>
                      <th className="py-2 px-2.5 text-right">Amount</th>
                      <th className="py-2 px-2.5 text-center">Booking Status</th>
                      <th className="py-2 px-2.5 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {paginatedBookings.length > 0 ? (
                      paginatedBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[var(--admin-elevated)] transition-colors">
                          <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[var(--admin-success)]">
                            {b.id}
                          </td>
                          <td className="py-2.5 px-2.5 font-medium text-[var(--admin-text)] truncate max-w-45">
                            {b.productTitle}
                          </td>
                          <td className="py-2.5 px-2.5 text-[var(--admin-text-muted)]">
                            {b.customerName || "Customer"}
                          </td>
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-[var(--admin-text-muted)]">
                            {b.startDate ? `${b.startDate.slice(5)} → ${b.endDate?.slice(5) || ""}` : "Standard"}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-medium text-[var(--admin-text)]">
                            ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-medium capitalize",
                                b.status === "completed"
                                  ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                                  : b.status === "active"
                                  ? "bg-emerald-500/10 text-[var(--admin-success)] border border-[var(--admin-success)]/20"
                                  : b.status === "confirmed"
                                  ? "bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]"
                                  : b.status === "cancelled"
                                  ? "bg-rose-500/10 text-[var(--admin-error)] border border-[var(--admin-error)]/20"
                                  : "bg-amber-500/10 text-[var(--admin-warning)] border border-[var(--admin-warning)]/20"
                              )}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-[var(--admin-text-muted)]">
                            {b.paymentStatus || "paid"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-xs text-[var(--admin-text-muted)]">
                          No bookings matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border)] text-xs">
                  <span className="text-[var(--admin-text-muted)] text-[11px]">
                    Showing {(bookingPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(bookingPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                      disabled={bookingPage === 1}
                      className="p-1 rounded border border-[var(--admin-border)] disabled:opacity-40 cursor-pointer"
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
                      className="p-1 rounded border border-[var(--admin-border)] disabled:opacity-40 cursor-pointer"
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
            TAB 2: BOOKINGS (Consistent High-Density Layout)
            Large booking trend chart, compact status summary, booking breakdown chart,
            collapsible funnel analysis, and detailed records table.
           ========================================================================= */}
        {activeTab === "Bookings" && (
          <div className="space-y-5">
            {/* Primary Asymmetric Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Column (8 cols): Large Booking Trend Chart */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Booking Trajectory & Comparison
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Comparing current interval against preceding equivalent window
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                      Current
                    </span>
                    {comparePrevious && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text-muted)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--admin-text-muted)]" />
                        Previous
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-80 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataset?.bookingTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="currentBookings"
                        name="Current"
                        stroke={accentHex}
                        strokeWidth={2.4}
                        dot={{ r: 2.5, fill: accentHex }}
                      />
                      {comparePrevious && (
                        <Line
                          type="monotone"
                          dataKey="previousBookings"
                          name="Previous Period"
                          stroke={prevLineHex}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column (4 cols): Compact Status Summary */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Confirmed vs Completed
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Fulfillment resolution ratio
                  </p>
                </div>

                <div className="py-4 space-y-4 my-auto">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--admin-text-muted)]">Confirmed Bookings</span>
                      <span className="font-mono font-bold text-[var(--admin-text)]">
                        {kpis?.confirmedBookings.current}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--admin-text-secondary)] rounded-full"
                        style={{
                          width: `${Math.min(100, ((kpis?.confirmedBookings.current || 0) / Math.max(1, kpis?.totalBookings.current || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--admin-text-muted)]">Completed Rentals</span>
                      <span className="font-mono font-bold text-[var(--admin-text)]">
                        {kpis?.completedRentals.current}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--admin-text-muted)] rounded-full"
                        style={{
                          width: `${Math.min(100, ((kpis?.completedRentals.current || 0) / Math.max(1, kpis?.totalBookings.current || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--admin-text-muted)]">Cancelled Bookings</span>
                      <span className="font-mono font-bold text-[var(--admin-error)]">
                        {kpis?.cancelledBookings.current}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--admin-error)] rounded-full"
                        style={{
                          width: `${Math.min(100, ((kpis?.cancelledBookings.current || 0) / Math.max(1, kpis?.totalBookings.current || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--admin-text-muted)]">Cancellation Rate</span>
                  <span className="font-mono font-bold text-[var(--admin-error)]">
                    {kpis?.cancellationRate.current}%
                  </span>
                </div>
              </div>
            </div>

            {/* Expandable Advanced Analytics: Booking Funnel */}
            <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <button
                onClick={() => setShowFunnelSection(!showFunnelSection)}
                className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-[var(--admin-elevated)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[var(--admin-success)]" />
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Booking Funnel & Conversion Journey
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Progression from product views and cart additions to verified completions
                    </p>
                  </div>
                </div>
                {showFunnelSection ? (
                  <ChevronUp className="h-4 w-4 text-[var(--admin-text-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--admin-text-muted)]" />
                )}
              </button>

              {showFunnelSection && dataset?.funnel && (
                <div className="p-5 pt-1 border-t border-[var(--admin-border)] space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {dataset.funnel.stages.map((stage, idx) => (
                      <div
                        key={stage.name}
                        className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">
                            Step {idx + 1}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--admin-success)] font-bold">
                            {stage.conversionRate}%
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[var(--admin-text)]">
                          {stage.name}
                        </div>
                        <div className="text-lg font-bold font-mono text-[var(--admin-text)]">
                          {stage.count.toLocaleString()}
                        </div>
                        <div className="h-1.5 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-[var(--admin-success)] rounded-full"
                            style={{ width: `${Math.min(100, stage.conversionRate || 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Visualizations for Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs">
                <h3 className="text-xs font-bold text-[var(--admin-text)] mb-1">
                  Booking Breakdown by Category
                </h3>
                <p className="text-[11px] text-[var(--admin-text-muted)] mb-4">
                  Rental volume distribution across tech categories
                </p>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataset?.categoryBreakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="name" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="bookings" fill={accentHex} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs">
                <h3 className="text-xs font-bold text-[var(--admin-text)] mb-1">
                  Daily Booking Density
                </h3>
                <p className="text-[11px] text-[var(--admin-text-muted)] mb-4">
                  Booking velocity across intervals
                </p>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dataset?.bookingTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Area
                        type="monotone"
                        dataKey="currentBookings"
                        stroke={accentHex}
                        fill={accentHex}
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Records Table */}
            <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-[var(--admin-text)]">
                  Detailed Booking Records
                </h3>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search bookings"
                    value={bookingSearch}
                    onChange={(e) => {
                      setBookingSearch(e.target.value);
                      setBookingPage(1);
                    }}
                    className="pl-7 pr-2.5 py-1 rounded-md bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs w-44"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-medium text-[var(--admin-text-muted)]">
                      <th className="py-2 px-2.5">ID</th>
                      <th className="py-2 px-2.5">Gear Item</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5 text-right">Amount</th>
                      <th className="py-2 px-2.5 text-center">Status</th>
                      <th className="py-2 px-2.5 text-center">Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {paginatedBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[var(--admin-elevated)]">
                        <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[var(--admin-success)]">{b.id}</td>
                        <td className="py-2.5 px-2.5 font-medium truncate max-w-52">{b.productTitle}</td>
                        <td className="py-2.5 px-2.5 text-[var(--admin-text-muted)]">{b.customerName}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium">
                          ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium capitalize bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]">
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center text-[11px] font-mono text-[var(--admin-text-muted)]">
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
            TAB 3: PRODUCTS & UTILIZATION (Consistent High-Density Layout)
            Compact utilization metrics strip, occupied-vs-available analysis,
            utilization trends, category comparison, and product-level table.
           ========================================================================= */}
        {activeTab === "Products" && (
          <div className="space-y-5">
            {/* Utilization Metrics Strip */}
            <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--admin-border)]">
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Eligible Products</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.productUtilization.totalEligibleProducts}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Active rentable fleet</span>
                </div>

                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Rentable Product-Days</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.productUtilization.totalRentableDays.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Total capacity in interval</span>
                </div>

                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Occupied Product-Days</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.productUtilization.totalOccupiedDays.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Days rented</span>
                </div>

                <div className="p-4 bg-[var(--admin-elevated)]">
                  <span className="text-[11px] font-medium text-[var(--admin-success)]">Fleet Utilization Rate</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-success)] mt-1">
                    {dataset?.productUtilization.utilizationRate}%
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Occupied / Total Days × 100</span>
                </div>
              </div>
            </div>

            {/* Primary Asymmetric Workspace: Occupied vs Available Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Column (8 cols): Occupied vs Available Capacity Trend */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Occupied vs Available Capacity Analysis
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Fleet rental utilization trends across selected window
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                      Occupied Days
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text-muted)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                      Fleet Capacity
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dataset?.bookingTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis stroke={mutedHex} fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Area
                        type="monotone"
                        dataKey="currentBookings"
                        name="Occupied"
                        stroke={accentHex}
                        fill={accentHex}
                        fillOpacity={0.16}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column (4 cols): Category Comparison & Demand Distribution */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Category Utilization
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Relative share of fleet utilization
                  </p>
                </div>

                <div className="space-y-3 my-auto py-2">
                  {dataset?.categoryBreakdown.map((cat, idx) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--admin-text-muted)]">{cat.name}</span>
                        <span className="font-mono font-semibold text-[var(--admin-text)]">
                          {cat.percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: categoryColors[idx % categoryColors.length],
                            width: `${cat.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[var(--admin-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--admin-text-muted)]">Active Fleet</span>
                  <span className="font-mono font-bold text-[var(--admin-success)]">
                    {dataset?.productUtilization.totalEligibleProducts} listings
                  </span>
                </div>
              </div>
            </div>

            {/* Product-Level Table */}
            <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--admin-text)]">
                  Gear Utilization & Turnover Ledger
                </h3>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search gear"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductPage(1);
                    }}
                    className="pl-7 pr-2.5 py-1 rounded-md bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs w-44"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-medium text-[var(--admin-text-muted)]">
                      <th className="py-2 px-2.5">Title</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5 text-right">Daily Rate</th>
                      <th className="py-2 px-2.5 text-center">Rentals</th>
                      <th className="py-2 px-2.5 text-center">Occupied Days</th>
                      <th className="py-2 px-2.5 text-right">Turnover</th>
                      <th className="py-2 px-2.5 text-center">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-[var(--admin-elevated)]">
                        <td className="py-2.5 px-2.5 font-medium">{p.title}</td>
                        <td className="py-2.5 px-2.5 text-[var(--admin-text-muted)]">{p.category}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono">₹{p.price.toLocaleString()}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-medium">{p.totalRentals}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[var(--admin-text-muted)]">{p.occupiedDays}d</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-[var(--admin-success)]">
                          ₹{p.revenue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[11px] font-medium">
                          {p.utilizationRate}%
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
            TAB 4: USERS (Consistent High-Density Layout)
            Registration trends as primary visualization, with renter/vendor
            distribution and supporting metrics alongside it.
           ========================================================================= */}
        {activeTab === "Users" && (
          <div className="space-y-5">
            {/* User Typology Strip */}
            <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--admin-border)]">
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Total Accounts</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.userMetrics.totalUsers}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Registered platform accounts</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-success)]">New Registrations</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-success)] mt-1">
                    +{dataset?.userMetrics.newUsersInPeriod}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Joined in selected interval</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Renters</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.userMetrics.rentersCount}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Gear consumers</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Vendors / Lenders</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.userMetrics.vendorsCount}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Gear providers</span>
                </div>
              </div>
            </div>

            {/* Primary Asymmetric Workspace: Registration Trends vs Renter/Vendor Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left Column (8 cols): Registration Trends Line Chart */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      User Registration Trends
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Daily user acquisition volume over selected period
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--admin-success)]">
                    +{dataset?.userMetrics.newUsersInPeriod} new accounts
                  </span>
                </div>

                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataset?.userMetrics.userTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="New Signups"
                        stroke={accentHex}
                        strokeWidth={2.4}
                        dot={{ r: 3, fill: accentHex }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column (4 cols): Renter vs Vendor Distribution */}
              <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Renter vs Vendor Distribution
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Platform actor typology
                  </p>
                </div>

                <div className="space-y-3.5 my-auto py-3">
                  <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs block text-[var(--admin-text)]">
                        Verified Renters
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">Demand side active consumers</span>
                    </div>
                    <span className="font-mono text-lg font-bold text-[var(--admin-text)]">
                      {dataset?.userMetrics.rentersCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs block text-[var(--admin-text)]">
                        Verified Vendors
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">Supply side equipment owners</span>
                    </div>
                    <span className="font-mono text-lg font-bold text-[var(--admin-success)]">
                      {dataset?.userMetrics.vendorsCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs block text-[var(--admin-text)]">
                        Staff Administrators
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">Platform operators</span>
                    </div>
                    <span className="font-mono text-lg font-bold text-[var(--admin-text-muted)]">
                      {dataset?.userMetrics.adminsCount}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--admin-border)] text-[11px] text-[var(--admin-text-muted)] flex justify-between">
                  <span>Supply-to-Demand Ratio</span>
                  <span className="font-mono font-semibold text-[var(--admin-text)]">
                    1 :{" "}
                    {dataset?.userMetrics.vendorsCount && dataset.userMetrics.vendorsCount > 0
                      ? Math.round(dataset.userMetrics.rentersCount / dataset.userMetrics.vendorsCount)
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: DELIVERY (Consistent High-Density Layout)
            Delivery performance trends, compact status summary,
            pickup-versus-handover comparisons, and detailed records.
           ========================================================================= */}
        {activeTab === "Delivery" && (
          <div className="space-y-5">
            {/* Delivery Metric Strip */}
            <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--admin-border)]">
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Assigned Dispatches</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.deliveryMetrics.totalAssigned}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Field dispatches</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-success)]">Delivered Orders</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-success)] mt-1">
                    {dataset?.deliveryMetrics.completed}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Successfully handed over</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">In-Transit</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    {dataset?.deliveryMetrics.inTransit}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">En route dispatches</span>
                </div>
                <div className="p-4 bg-[var(--admin-elevated)]">
                  <span className="text-[11px] font-medium text-[var(--admin-success)]">Dual-PIN Compliance</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-success)] mt-1">
                    {dataset?.deliveryMetrics.pinVerificationRate}%
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Handover verification</span>
                </div>
              </div>
            </div>

            {/* Asymmetric Workspace: Performance Trend vs Pickup-vs-Handover Dual-PIN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Delivery Performance Trends
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Dispatch resolution speed and completion rates
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dataset?.bookingTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis stroke={mutedHex} fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="currentBookings"
                        name="Dispatches"
                        stroke={accentHex}
                        strokeWidth={2.4}
                        dot={{ r: 3, fill: accentHex }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Pickup vs Handover Verification
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Two-party PIN cryptographic verification
                  </p>
                </div>

                <div className="py-4 space-y-3.5 my-auto">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--admin-text-muted)]">Vendor Pickup PIN</span>
                      <span className="font-mono font-semibold text-[var(--admin-success)]">100% Compliant</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--admin-success)] rounded-full w-full" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--admin-text-muted)]">Renter Handover PIN</span>
                      <span className="font-mono font-semibold text-[var(--admin-success)]">
                        {dataset?.deliveryMetrics.pinVerificationRate}% Compliant
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--admin-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--admin-success)] rounded-full"
                        style={{ width: `${dataset?.deliveryMetrics.pinVerificationRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] flex justify-between">
                  <span>Audit Policy</span>
                  <span className="font-semibold text-[var(--admin-success)]">Strict Dual-PIN</span>
                </div>
              </div>
            </div>

            {/* Detailed Dispatch Audit Records Table */}
            <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-[var(--admin-text)]">
                Delivery Dispatch Audit Records
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-medium text-[var(--admin-text-muted)]">
                      <th className="py-2 px-2.5">Booking ID</th>
                      <th className="py-2 px-2.5">Gear</th>
                      <th className="py-2 px-2.5">Agent</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5 text-center">Vendor PIN</th>
                      <th className="py-2 px-2.5 text-center">Renter PIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {dataset?.deliveryMetrics.records.map((d) => (
                      <tr key={d.id} className="hover:bg-[var(--admin-elevated)]">
                        <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[var(--admin-success)]">{d.bookingId}</td>
                        <td className="py-2.5 px-2.5 font-medium">{d.productTitle}</td>
                        <td className="py-2.5 px-2.5 text-[var(--admin-text-muted)]">{d.deliveryAgent}</td>
                        <td className="py-2.5 px-2.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]">
                            {d.deliveryStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center text-[11px] font-semibold text-[var(--admin-success)]">
                          {d.vendorPinVerified ? "Verified" : "Pending"}
                        </td>
                        <td className="py-2.5 px-2.5 text-center text-[11px] font-semibold text-[var(--admin-success)]">
                          {d.renterPinVerified ? "Verified" : "Pending"}
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
            TAB 6: FINANCE & RECONCILIATION (Consistent High-Density Layout)
            Financial summary metrics at top, prominent revenue trend visualization,
            payment status breakdown, refund & settlement summaries, and reconciliation table.
           ========================================================================= */}
        {activeTab === "Finance" && (
          <div className="space-y-5">
            {/* Financial Summary Metric Strip */}
            <div className="rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--admin-border)]">
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-text-muted)]">Gross Rental Value</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-[var(--admin-text)]">
                    ₹{dataset?.finance.grossRentalValue.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Gross rental turnover</span>
                </div>
                <div className="p-4 bg-[var(--admin-elevated)]">
                  <span className="text-[11px] font-semibold text-[var(--admin-success)]">Platform Revenue (10%)</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-success)] mt-1">
                    ₹{dataset?.finance.platformRevenue.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">10% platform take-rate</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-success)]">Payments Collected</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-success)] mt-1">
                    ₹{dataset?.finance.paymentsCollected.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Realized funds</span>
                </div>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-[var(--admin-error)]">Completed Refunds</span>
                  <div className="text-2xl font-bold font-mono text-[var(--admin-error)] mt-1">
                    ₹{dataset?.finance.completedRefunds.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-[var(--admin-text-muted)]">Settled returns</span>
                </div>
              </div>
            </div>

            {/* Asymmetric Workspace: Revenue Trend vs Payment & Settlement Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-8 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text)]">
                      Revenue Trend Visualization
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-muted)]">
                      Gross turnover vs Net platform commission (10%)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                      Gross Turnover
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--admin-success)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                      Platform 10%
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dataset?.bookingTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                      <XAxis dataKey="label" stroke={mutedHex} fontSize={11} tickLine={false} />
                      <YAxis
                        stroke={mutedHex}
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${v / 1000}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                      />
                      <Area
                        type="monotone"
                        dataKey="currentRevenue"
                        name="Gross"
                        stroke={accentHex}
                        fill={accentHex}
                        fillOpacity={0.16}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Payment & Settlement Breakdown
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    Settlement status distribution
                  </p>
                </div>

                <div className="space-y-3.5 my-auto py-3">
                  <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs block text-[var(--admin-text)]">
                        Vendor Settlements (90%)
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">Payable to equipment owners</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--admin-success)]">
                      ₹{Math.round((dataset?.finance.grossRentalValue || 0) * 0.9).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs block text-[var(--admin-text)]">
                        Platform Retained (10%)
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">Net earned marketplace commission</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--admin-success)]">
                      ₹{dataset?.finance.platformRevenue.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs block text-[var(--admin-text)]">
                        Refund Escrow
                      </span>
                      <span className="text-[11px] text-[var(--admin-text-muted)]">Disputed or returned payments</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--admin-error)]">
                      ₹{dataset?.finance.completedRefunds.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] flex justify-between">
                  <span>Reconciliation Rate</span>
                  <span className="font-semibold text-[var(--admin-success)]">100% Balanced</span>
                </div>
              </div>
            </div>

            {/* Read-Only Financial Reconciliation Table */}
            <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-[var(--admin-text)]">
                    Financial Reconciliation Ledger (Read-Only)
                  </h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)]">
                    10% Platform fee calculation, 90% vendor payout allocation, and reconciliation status
                  </p>
                </div>
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search reconciliation"
                    value={reconciliationSearch}
                    onChange={(e) => {
                      setReconciliationSearch(e.target.value);
                      setReconciliationPage(1);
                    }}
                    className="pl-7 pr-2.5 py-1 rounded-md bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs w-48"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-medium text-[var(--admin-text-muted)]">
                      <th className="py-2 px-2.5">Booking ID</th>
                      <th className="py-2 px-2.5">Customer</th>
                      <th className="py-2 px-2.5 text-right">Gross Amount</th>
                      <th className="py-2 px-2.5 text-right">Platform Fee (10%)</th>
                      <th className="py-2 px-2.5 text-right">Vendor Settlement (90%)</th>
                      <th className="py-2 px-2.5 text-center">Payment</th>
                      <th className="py-2 px-2.5 text-center">Reconciliation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {paginatedReconciliation.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--admin-elevated)]">
                        <td className="py-2.5 px-2.5 font-mono text-[11px] font-medium text-[var(--admin-success)]">{r.bookingId}</td>
                        <td className="py-2.5 px-2.5 text-[var(--admin-text-muted)]">{r.customerName}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium">₹{r.grossAmount.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-[var(--admin-success)]">₹{r.platformFee.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-[var(--admin-text-muted)]">₹{r.vendorPayout.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-[11px] capitalize text-[var(--admin-text-muted)]">{r.paymentStatus}</td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-medium",
                              r.reconciliationStatus === "Reconciled"
                                ? "bg-emerald-500/10 text-[var(--admin-success)] border border-[var(--admin-success)]/20"
                                : r.reconciliationStatus === "Settlement Due"
                                ? "bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]"
                                : r.reconciliationStatus === "Refunded"
                                ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                                : "bg-amber-500/10 text-[var(--admin-warning)] border border-[var(--admin-warning)]/20"
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
