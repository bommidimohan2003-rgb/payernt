import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  ShieldAlert,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  Flag,
  Calendar,
  Users,
  Package,
  CreditCard,
  Star,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { notificationsService } from "../services/notifications";
import { usersService } from "../services/users";
import { productsService } from "../services/products";
import { bookingsService } from "../services/bookings";
import { paymentsService } from "../services/payments";
import { AdminReport } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { ConfirmDialog } from "../components/layout/ConfirmDialog";

type ReportType = "revenue" | "bookings" | "users" | "products" | "payments" | "agents" | "reviews";

export default function Reports() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentHex = isDark ? "#4CC38A" : "#047857";
  const mutedHex = isDark ? "#85858B" : "#737373";
  const tooltipStyle = {
    backgroundColor: isDark ? "#232325" : "#FFFFFF",
    borderColor: isDark ? "rgba(237,237,237,0.12)" : "rgba(23,23,23,0.12)",
    borderRadius: "8px",
    color: isDark ? "#EDEDED" : "#171717",
    fontSize: "12px",
  };
  const currentMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date()),
    []
  );
  const [confirmDisputeAction, setConfirmDisputeAction] = useState<{ type: "product" | "user"; id: string } | null>(null);
  const [disputeActionLoading, setDisputeActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"generator" | "disputes">("generator");

  // Dispute reports state
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Operational reports generator state
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "all">("30");
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<Record<string, unknown>[] | null>(null);

  // Pagination for disputes
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [disputeSearch, setDisputeSearch] = useState("");

  // Platform telemetry stats and charts
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        notificationsService.getDashboardStats().catch(() => null),
        notificationsService.getDashboardCharts("180").catch(() => null),
      ]);
      setStats(s);
      setCharts(c);
    } catch {
      // silently handle
    }
  }, []);

  const fetchDisputes = useCallback(async () => {
    try {
      setLoadingDisputes(true);
      setDisputeError(null);
      const data = await notificationsService.getReports();
      setReports(data);
    } catch (err) {
      console.error(err);
      setDisputeError("Failed to load dispute reports.");
    } finally {
      setLoadingDisputes(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
    fetchTelemetry();
  }, [fetchDisputes, fetchTelemetry]);

  const handleResolve = async (id: string) => {
    try {
      const updated = await notificationsService.resolveReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Dispute resolved successfully.");
    } catch {
      toast.error("Failed to resolve dispute.");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const updated = await notificationsService.dismissReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.info("Report dismissed.");
    } catch {
      toast.error("Failed to dismiss report.");
    }
  };

  const handleSuspendProduct = (id: string) => {
    setConfirmDisputeAction({ type: "product", id });
  };

  const handleBanUser = (id: string) => {
    setConfirmDisputeAction({ type: "user", id });
  };

  const executeDisputeAction = async () => {
    if (!confirmDisputeAction) return;
    try {
      setDisputeActionLoading(true);
      if (confirmDisputeAction.type === "product") {
        const updated = await notificationsService.suspendProductReport(confirmDisputeAction.id);
        setReports((prev) => prev.map((r) => (r.id === confirmDisputeAction.id ? updated : r)));
        toast.success("Product listing suspended.");
      } else {
        const updated = await notificationsService.banUserReport(confirmDisputeAction.id);
        setReports((prev) => prev.map((r) => (r.id === confirmDisputeAction.id ? updated : r)));
        toast.success("User account suspended.");
      }
      setConfirmDisputeAction(null);
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setDisputeActionLoading(false);
    }
  };

  // Generate real operational report from backend endpoints
  const handleGenerateReport = async (overrideType?: ReportType) => {
    try {
      setGenerating(true);
      setGeneratedData(null);

      const activeReportType = overrideType || reportType;
      if (activeReportType === "revenue") {
        const stats = await notificationsService.getDashboardStats();
        const charts = await notificationsService.getDashboardCharts(dateRange === "all" ? "365" : dateRange);
        const rows = (charts.revenueChart || []).map((r) => ({
          Period: r.name,
          "Gross Revenue (INR)": r.revenue,
          "Monthly Total (INR)": stats.monthlyRevenue,
          "Today's Revenue (INR)": stats.revenueToday,
        }));
        setGeneratedData(rows);
      } else if (activeReportType === "bookings") {
        const bookings = await bookingsService.getBookings();
        const rows = bookings.map((b) => ({
          "Booking ID": b.id,
          Customer: b.customerName,
          Email: b.customerId,
          Gear: b.productTitle,
          Lender: b.ownerName,
          "Amount (INR)": b.amount,
          Status: b.status,
          Date: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—",
        }));
        setGeneratedData(rows);
      } else if (activeReportType === "users") {
        const users = await usersService.getUsers();
        const rows = users.map((u) => ({
          "User ID": u.id,
          "Full Name": u.fullName,
          Email: u.email,
          Role: u.role,
          Status: u.status,
          Verified: u.verified ? "YES" : "NO",
          Joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—",
        }));
        setGeneratedData(rows);
      } else if (activeReportType === "products") {
        const products = await productsService.getProducts();
        const rows = products.map((p) => ({
          "Product ID": p.id,
          Title: p.title,
          Category: p.category,
          "Rate / Day (INR)": p.price,
          Owner: p.owner?.name || "Lender",
          Status: p.status,
          Visibility: p.hidden ? "HIDDEN" : "LIVE",
          Created: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—",
        }));
        setGeneratedData(rows);
      } else if (activeReportType === "payments") {
        const payments = await paymentsService.getPayments();
        const rows = payments.map((py) => ({
          "Payment ID": py.id,
          "Order ID": py.bookingId,
          Customer: py.customerName,
          "Amount (INR)": py.amount,
          Gateway: py.method || "Razorpay",
          Status: py.status,
          Date: py.createdAt ? new Date(py.createdAt).toLocaleString() : "—",
        }));
        setGeneratedData(rows);
      } else if (activeReportType === "agents") {
        const agents = await usersService.getAgents();
        const rows = agents.map((a) => ({
          "Agent ID": a.id,
          Name: a.fullName,
          Email: a.email,
          "Listings Count": a.productsCount,
          "Completed Leases": a.bookingsCount,
          "Gross Revenue (INR)": a.revenue,
          Rating: a.rating,
          Status: a.status,
        }));
        setGeneratedData(rows);
      } else if (activeReportType === "reviews") {
        const reviews = await notificationsService.getReviews();
        const rows = reviews.map((rv) => ({
          "Review ID": rv.id,
          Product: rv.productTitle,
          Customer: rv.userName,
          Rating: rv.rating,
          Comment: rv.comment,
          Status: rv.hidden ? "HIDDEN" : "PUBLISHED",
          Date: rv.createdAt ? new Date(rv.createdAt).toLocaleDateString() : "—",
        }));
        setGeneratedData(rows);
      }
      toast.success("Operational report generated from live database.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile operational report.");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!generatedData || generatedData.length === 0) return;

    const headers = Object.keys(generatedData[0]);
    const csvRows = [headers.join(",")];

    generatedData.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payent_${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report CSV exported successfully.");
  };

  const filteredDisputes = useMemo(() => {
    let result = [...reports];
    if (disputeSearch.trim()) {
      const q = disputeSearch.toLowerCase();
      result = result.filter(
        (r) =>
          (r.reason && r.reason.toLowerCase().includes(q)) ||
          (r.productTitle && r.productTitle.toLowerCase().includes(q)) ||
          (r.reporterName && r.reporterName.toLowerCase().includes(q)) ||
          (r.ownerName && r.ownerName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [reports, disputeSearch]);

  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDisputes.slice(start, start + itemsPerPage);
  }, [filteredDisputes, currentPage, itemsPerPage]);

  const disputeColumns: Column<AdminReport>[] = [
    {
      key: "productTitle",
      label: "Reported Resource",
      render: (row) => (
        <div className="min-w-0">
          <span className="font-bold text-[var(--admin-text)] text-xs truncate block">{row.productTitle || `Item #${row.productId}`}</span>
          <span className="text-[11px] text-[var(--admin-text-muted)] font-mono truncate block">Owner: {row.ownerName}</span>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Violation Alleged",
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--admin-text)]">{row.reason || "Disputed listing"}</span>
      ),
    },
    {
      key: "evidence",
      label: "Dispute Detail / Evidence",
      render: (row) => (
        <p className="text-xs text-[var(--admin-text-muted)] line-clamp-2 max-w-sm leading-relaxed">{row.evidence || "—"}</p>
      ),
    },
    {
      key: "reporterName",
      label: "Reporter",
      render: (row) => (
        <span className="text-xs text-[var(--admin-text-muted)]">{row.reporterName || "Platform User"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-bold  border",
            row.status === "open"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : row.status === "resolved"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] border-border/60"
          )}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Resolution Actions",
      align: "right",
      render: (row) =>
        row.status === "open" ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleResolve(row.id)}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
              title="Mark as resolved"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleSuspendProduct(row.id)}
              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
              title="Suspend reported listing"
            >
              <Package className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleBanUser(row.id)}
              className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors cursor-pointer"
              title="Suspend offender account"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDismiss(row.id)}
              className="p-1.5 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
              title="Dismiss report"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--admin-text-muted)] font-mono">Closed</span>
        ),
    },
  ];

  const monthlyReportData = useMemo(() => {
    if (charts?.revenueChart && charts.revenueChart.length > 0) {
      return charts.revenueChart.slice(-6).map((r: any) => ({
        month: r.name,
        value: r.revenue,
      }));
    }
    return [
      { month: "Current", value: stats?.monthlyRevenue ?? 0 },
    ];
  }, [charts?.revenueChart, stats?.monthlyRevenue]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Reports
          </h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
            Generate and view platform reports.
          </p>
        </div>

        {/* TABS SWITCH */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-[var(--admin-card)] rounded-lg border border-[var(--admin-border)] text-xs font-medium">
            <button
              onClick={() => setActiveTab("generator")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs",
                activeTab === "generator" ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs" : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Platform Reports</span>
            </button>
            <button
              onClick={() => setActiveTab("disputes")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs",
                activeTab === "disputes" ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs" : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Disputes & Claims</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "generator" ? (
        <div className="space-y-6">
          {/* CATEGORY TABS (Panel 10): Revenue | Bookings | Users | Products */}
          <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: "revenue", label: "Revenue" },
              { id: "bookings", label: "Bookings" },
              { id: "users", label: "Users" },
              { id: "products", label: "Products" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as ReportType)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                  reportType === tab.id
                    ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs"
                    : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] border border-transparent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 3 TOP KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-1">
              <span className="text-xs text-[var(--admin-text-muted)] font-medium">Total Revenue</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[var(--admin-text)]">
                  ₹{(stats?.monthlyRevenue ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-1">
              <span className="text-xs text-[var(--admin-text-muted)] font-medium">Total Bookings</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[var(--admin-text)]">
                  {(stats?.monthlyBookings ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-1">
              <span className="text-xs text-[var(--admin-text-muted)] font-medium">Total Users</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[var(--admin-text)]">
                  {(stats?.totalUsers ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* MONTHLY CHART */}
          <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--admin-text)]">
                Monthly Trend Analysis
              </h3>
              <span className="text-[11px] font-mono text-[var(--admin-text-muted)]">Last 6 Months</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReportData}>
                  <XAxis dataKey="month" stroke={mutedHex} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={mutedHex} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="value" fill={accentHex} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RECENT REPORTS LIST (Panel 10) */}
          <div className="p-5 rounded-xl bg-[var(--admin-card)] border border-[var(--admin-border)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--admin-text)]">
              Recent Reports
            </h3>
            <div className="divide-y divide-[var(--admin-border)]">
              {[
                { title: `Revenue Summary (${currentMonthLabel})`, date: "Live ledger snapshot", type: "revenue" },
                { title: `User Directory Report (${currentMonthLabel})`, date: "Live account breakdown", type: "users" },
                { title: `Product Performance Report (${currentMonthLabel})`, date: "Live catalog metrics", type: "products" },
                { title: `Booking Operations Report (${currentMonthLabel})`, date: "Live rental fulfillment log", type: "bookings" },
              ].map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[var(--admin-text)]">{item.title}</div>
                    <div className="text-[11px] text-[var(--admin-text-muted)] font-mono mt-0.5">{item.date}</div>
                  </div>
                  <button
                    onClick={() => {
                      const nextType = item.type as ReportType;
                      setReportType(nextType);
                      handleGenerateReport(nextType);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium border border-[var(--admin-border)] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* REPORT GENERATOR CONTROLS */}
          <div className="p-5 bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] space-y-4">
            <h3 className="text-xs font-bold text-[var(--admin-text)]">
              Live Database Export
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text)]">Report Scope</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-3 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
                >
                  <option value="revenue">Revenue Report</option>
                  <option value="bookings">Booking & Lease Report</option>
                  <option value="users">User Accounts Report</option>
                  <option value="products">Equipment Fleet Report</option>
                  <option value="payments">Payment Reconciliation Report</option>
                  <option value="agents">Agent & Lender Report</option>
                  <option value="reviews">Customer Feedback Report</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--admin-text)]">Date Range Window</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-3 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="all">All-Time Dataset</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => handleGenerateReport()}
                  disabled={generating}
                  className="flex-1 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
                  <span>{generating ? "Compiling..." : "Generate Dataset"}</span>
                </button>

                {generatedData && generatedData.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-2 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Export CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>CSV</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* GENERATED DATA VIEW */}
          {generatedData && (
            <div className="bg-[var(--admin-card)] rounded-2xl border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[var(--admin-border)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--admin-text-muted)]">
                  Compiled Records ({generatedData.length} rows)
                </span>
                <span className="text-[11px] font-mono text-[var(--admin-text-muted)]">Live Database Extract</span>
              </div>

              {generatedData.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--admin-text-muted)]">
                  No records found for the selected operational scope.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-elevated)]/30">
                        {Object.keys(generatedData[0]).map((k) => (
                          <th key={k} className="py-3 px-4 font-medium text-[var(--admin-text-muted)] text-[11px]">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {generatedData.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--admin-elevated)]/30 transition-colors">
                          {Object.keys(row).map((k) => (
                            <td key={k} className="py-2.5 px-4 font-medium text-[var(--admin-text)]">
                              {String(row[k])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {generatedData.length > 15 && (
                    <div className="p-3 text-center text-[11px] text-[var(--admin-text-muted)] bg-[var(--admin-elevated)]/10 border-t border-border/30">
                      Showing preview of 15 of {generatedData.length} records. Click 'Export CSV' for full dataset.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* DISPUTES LIST */
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
              <input
                type="text"
                placeholder="Search disputes by reason, resource, or reporter"
                value={disputeSearch}
                onChange={(e) => {
                  setDisputeSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[var(--admin-card)] text-[var(--admin-text)] text-xs rounded-xl pl-9 pr-4 py-2 border border-[var(--admin-border)] focus:outline-none focus:border-primary font-medium"
              />
            </div>
          </div>

          {disputeError && !loadingDisputes ? (
            <div className="bg-[var(--admin-card)] rounded-2xl border border-destructive/30 p-12 text-center shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--admin-text)] font-display">Database Sync Failed</h3>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1 max-w-sm">{disputeError}</p>
              <button
                onClick={fetchDisputes}
                className="mt-4 px-4 py-2 rounded-xl bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-[var(--admin-bg)] text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Retry Database Fetch
              </button>
            </div>
          ) : (
            <div className="bg-[var(--admin-card)] rounded-2xl border border-[var(--admin-border)] shadow-xs overflow-hidden">
              <Table
                columns={disputeColumns}
                data={paginatedDisputes}
                loading={loadingDisputes}
                emptyTitle="No Dispute Reports"
                emptyDescription="No open dispute reports or violation claims found."
              />

              {filteredDisputes.length > itemsPerPage && (
                <div className="p-4 border-t border-[var(--admin-border)]">
                  <Pagination
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredDisputes.length}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!confirmDisputeAction}
        onClose={() => setConfirmDisputeAction(null)}
        onConfirm={executeDisputeAction}
        title={confirmDisputeAction?.type === "product" ? "Suspend reported product" : "Suspend reported user"}
        description={
          confirmDisputeAction?.type === "product"
            ? "This suspends the reported gear listing from the marketplace."
            : "This suspends the reported user account until reactivated."
        }
        confirmLabel={confirmDisputeAction?.type === "product" ? "Suspend product" : "Suspend user"}
        destructive
        loading={disputeActionLoading}
      />
    </div>
  );
}
