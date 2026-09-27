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
} from "lucide-react";
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

type ReportType = "revenue" | "bookings" | "users" | "products" | "payments" | "agents" | "reviews";

export default function Reports() {
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
  }, [fetchDisputes]);

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

  const handleSuspendProduct = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this reported product?")) return;
    try {
      const updated = await notificationsService.suspendProductReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Product listing suspended.");
    } catch {
      toast.error("Failed to suspend product.");
    }
  };

  const handleBanUser = async (id: string) => {
    if (!confirm("Are you sure you want to suspend the reported user account?")) return;
    try {
      const updated = await notificationsService.banUserReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("User account suspended.");
    } catch {
      toast.error("Failed to suspend user.");
    }
  };

  // Generate real operational report from backend endpoints
  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setGeneratedData(null);

      if (reportType === "revenue") {
        const stats = await notificationsService.getDashboardStats();
        const charts = await notificationsService.getDashboardCharts(dateRange === "all" ? "365" : dateRange);
        const rows = (charts.revenueChart || []).map((r) => ({
          Period: r.name,
          "Gross Revenue (INR)": r.revenue,
          "Monthly Total (INR)": stats.monthlyRevenue,
          "Today's Revenue (INR)": stats.revenueToday,
        }));
        setGeneratedData(rows);
      } else if (reportType === "bookings") {
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
      } else if (reportType === "users") {
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
      } else if (reportType === "products") {
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
      } else if (reportType === "payments") {
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
      } else if (reportType === "agents") {
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
      } else if (reportType === "reviews") {
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
          <span className="font-bold text-foreground text-xs truncate block">{row.productTitle || `Item #${row.productId}`}</span>
          <span className="text-[10px] text-muted-foreground font-mono truncate block">Owner: {row.ownerName}</span>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Violation Alleged",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground">{row.reason || "Disputed listing"}</span>
      ),
    },
    {
      key: "evidence",
      label: "Dispute Detail / Evidence",
      render: (row) => (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-sm leading-relaxed">{row.evidence || "—"}</p>
      ),
    },
    {
      key: "reporterName",
      label: "Reporter",
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.reporterName || "Platform User"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            row.status === "open"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : row.status === "resolved"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-secondary text-muted-foreground border-border/60"
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
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
              title="Mark as resolved"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleSuspendProduct(row.id)}
              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
              title="Suspend reported listing"
            >
              <Package className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleBanUser(row.id)}
              className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all cursor-pointer"
              title="Suspend offender account"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDismiss(row.id)}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Dismiss report"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground font-mono">Closed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Operational telemetry reports, CSV exports, and marketplace dispute arbitration
          </p>
        </div>

        {/* TABS SWITCH */}
        <div className="flex items-center p-0.5 bg-secondary/60 rounded-lg border border-border/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab("generator")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs",
              activeTab === "generator" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Operational Reports</span>
          </button>
          <button
            onClick={() => setActiveTab("disputes")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs",
              activeTab === "disputes" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flag className="h-3.5 w-3.5" />
            <span>Disputes & Claims</span>
          </button>
        </div>
      </div>

      {activeTab === "generator" ? (
        <div className="space-y-6">
          {/* REPORT GENERATOR CONTROLS */}
          <div className="p-5 bg-card rounded-xl border border-border/70 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full bg-secondary/40 text-foreground text-xs rounded-lg px-3 py-2 border border-border/70 focus:outline-none font-medium cursor-pointer"
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
                <label className="text-xs font-medium text-foreground">Date Range Window</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                  className="w-full bg-secondary/40 text-foreground text-xs rounded-lg px-3 py-2 border border-border/70 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="all">All-Time Dataset</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
                  <span>{generating ? "Compiling..." : "Generate Dataset"}</span>
                </button>

                {generatedData && generatedData.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border/70 text-foreground font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
            <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Compiled Records ({generatedData.length} rows)
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">Live Database Extract</span>
              </div>

              {generatedData.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No records found for the selected operational scope.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/30">
                        {Object.keys(generatedData[0]).map((k) => (
                          <th key={k} className="py-3 px-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {generatedData.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                          {Object.keys(row).map((k) => (
                            <td key={k} className="py-2.5 px-4 font-medium text-foreground">
                              {String(row[k])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {generatedData.length > 15 && (
                    <div className="p-3 text-center text-[11px] text-muted-foreground bg-secondary/10 border-t border-border/30">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search disputes by reason, resource, reporter..."
                value={disputeSearch}
                onChange={(e) => {
                  setDisputeSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-card text-foreground text-xs rounded-xl pl-9 pr-4 py-2 border border-border/80 focus:outline-none focus:border-primary font-medium"
              />
            </div>
          </div>

          {disputeError && !loadingDisputes ? (
            <div className="bg-card rounded-2xl border border-destructive/30 p-12 text-center shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground font-display">Database Sync Failed</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">{disputeError}</p>
              <button
                onClick={fetchDisputes}
                className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Retry Database Fetch
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
              <Table
                columns={disputeColumns}
                data={paginatedDisputes}
                loading={loadingDisputes}
                emptyTitle="No Dispute Reports"
                emptyDescription="No open dispute reports or violation claims found."
              />

              {filteredDisputes.length > itemsPerPage && (
                <div className="p-4 border-t border-border/40">
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
    </div>
  );
}
