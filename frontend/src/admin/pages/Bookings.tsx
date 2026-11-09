import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Eye,
  XCircle,
  CheckCircle,
  RotateCcw,
  Calendar,
  Package,
  User,
  IndianRupee,
  RefreshCw,
  X,
  Clock,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { bookingsService } from "../services/bookings";
import { AdminBooking } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminWS } from "../services/websocket";
import { AdminProductImage } from "../components/common/AdminProductImage";

const RENTER_CANCELLATION_REASONS = [
  "I no longer need this product.",
  "I found a better alternative.",
  "The rental price is too high.",
  "My plans have changed.",
  "The product is not suitable for my needs.",
  "I booked by mistake.",
  "Other reason.",
];

const REASON_CODE_LABELS: Record<string, string> = {
  NOT_NEEDED: "I no longer need this product.",
  FOUND_ALTERNATIVE: "I found a better alternative.",
  PRICE_HIGH: "The rental price is too high.",
  CHANGED_PLANS: "My plans have changed.",
  NOT_SUITABLE: "The product is not suitable for my needs.",
  MISTAKE: "I booked by mistake.",
  OTHER: "Other reason.",
  LENDER_UNAVAILABLE: "Lender unavailable",
  ITEM_DAMAGED: "Item damaged / unavailable",
  SCHEDULE_CONFLICT: "Schedule conflict",
};

export function formatCancellationReason(reason?: string): string {
  if (!reason) return "Not specified";
  if (REASON_CODE_LABELS[reason]) return REASON_CODE_LABELS[reason];
  return reason.replace(/_/g, " ");
}

export default function Bookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancellationReasonFilter, setCancellationReasonFilter] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer / Detail modal
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await bookingsService.getBookings();
      const sanitized = Array.isArray(data)
        ? data.filter(
            (b) =>
              !b.productTitle?.toLowerCase().includes("fx3") &&
              b.productId !== "prod-1790474939846-841"
          )
        : [];
      setBookings(sanitized);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load rental bookings from database.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleResetBookings = async () => {
    if (!confirm("Are you sure you want to reset all bookings? This will clear all booking entries.")) return;
    try {
      setActionLoading(true);
      await bookingsService.resetAllBookings();
      setBookings([]);
      toast.success("All bookings have been reset.");
    } catch {
      toast.error("Failed to reset bookings.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const unsubCreated = adminWS.subscribe("booking.created", () => {
      fetchBookings(true);
    });
    const unsubUpdated = adminWS.subscribe("booking.updated", () => {
      fetchBookings(true);
    });
    const unsubCancelled = adminWS.subscribe("booking.cancelled", () => {
      fetchBookings(true);
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubCancelled();
    };
  }, [fetchBookings]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(`Are you sure you want to cancel booking #${id}?`)) return;
    try {
      setActionLoading(true);
      const updated = await bookingsService.cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated, status: "cancelled" } : b)));
      if (selectedBooking?.id === id) {
        setSelectedBooking((prev) => prev ? { ...prev, ...updated, status: "cancelled" } : null);
      }
      toast.warning(`Booking #${id} cancelled.`);
    } catch {
      toast.error("Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      setActionLoading(true);
      const updated = await bookingsService.completeBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated, status: "completed" } : b)));
      if (selectedBooking?.id === id) {
        setSelectedBooking((prev) => prev ? { ...prev, ...updated, status: "completed" } : null);
      }
      toast.success(`Booking #${id} marked as completed.`);
    } catch {
      toast.error("Failed to complete booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async (id: string) => {
    if (!confirm(`Are you sure you want to refund and cancel booking #${id}?`)) return;
    try {
      setActionLoading(true);
      const updated = await bookingsService.refundBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated, status: "cancelled" } : b)));
      if (selectedBooking?.id === id) {
        setSelectedBooking((prev) => prev ? { ...prev, ...updated, status: "cancelled" } : null);
      }
      toast.success(`Booking #${id} payment refunded.`);
    } catch {
      toast.error("Failed to process refund.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          (b.id && b.id.toLowerCase().includes(q)) ||
          (b.customerName && b.customerName.toLowerCase().includes(q)) ||
          (b.productTitle && b.productTitle.toLowerCase().includes(q)) ||
          (b.ownerName && b.ownerName.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (cancellationReasonFilter !== "all") {
      result = result.filter((b) => {
        if (b.status !== "cancelled") return false;
        const formatted = formatCancellationReason(b.cancellationReason);
        return (
          formatted.toLowerCase() === cancellationReasonFilter.toLowerCase() ||
          (b.cancellationReason && b.cancellationReason.toLowerCase() === cancellationReasonFilter.toLowerCase())
        );
      });
    }

    result.sort((a, b) => {
      const fieldA = (a as unknown as Record<string, string | number>)[sortKey];
      const fieldB = (b as unknown as Record<string, string | number>)[sortKey];

      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sortOrder === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
      }
      if (typeof fieldA === "number" && typeof fieldB === "number") {
        return sortOrder === "asc" ? fieldA - fieldB : fieldB - fieldA;
      }
      return 0;
    });

    return result;
  }, [bookings, search, statusFilter, cancellationReasonFilter, sortKey, sortOrder]);

  const cancellationStats = useMemo(() => {
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    const total = cancelled.length;
    const reasonCounts: Record<string, number> = {};

    cancelled.forEach((b) => {
      const rawReason = b.cancellationReason || "Not specified";
      const formatted = formatCancellationReason(rawReason);
      reasonCounts[formatted] = (reasonCounts[formatted] || 0) + 1;
    });

    const breakdown = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
    const topReason = breakdown.length > 0 ? breakdown[0] : null;

    return {
      total,
      breakdown,
      topReason,
    };
  }, [bookings]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(start, start + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const columns: Column<AdminBooking>[] = [
    {
      key: "id",
      label: "Booking ID",
      render: (row) => (
        <span className="font-mono font-bold text-foreground text-xs">
          #{row.id}
        </span>
      ),
    },
    {
      key: "productTitle",
      label: "Gear Item",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <AdminProductImage src={row.productImage} alt={row.productTitle} className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-foreground truncate max-w-xs text-xs">{row.productTitle}</span>
        </div>
      ),
    },
    {
      key: "customerName",
      label: "Renter",
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate text-xs">{row.customerName}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{row.customerId}</div>
        </div>
      ),
    },
    {
      key: "ownerName",
      label: "Lender",
      render: (row) => (
        <span className="text-xs text-muted-foreground truncate">{row.ownerName || "Verified Lender"}</span>
      ),
    },
    {
      key: "schedule" as any,
      label: "Schedule",
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-foreground">
            {row.startDate} {row.endDate && row.endDate !== row.startDate ? `➔ ${row.endDate}` : ""}
          </div>
          {row.timeSlot ? (
            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary uppercase">
              {row.timeSlot.replace(/_/g, " ")} {row.startTime && row.endTime ? `(${row.startTime}–${row.endTime})` : ""}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Full Day</span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      label: "Total Fee",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-foreground text-xs">
          ₹{(row.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment",
      render: (row) => (
        <span
          className={cn(
            "text-[11px] font-medium capitalize",
            row.paymentStatus === "paid"
              ? "text-emerald-600 dark:text-emerald-400"
              : row.paymentStatus === "failed"
              ? "text-[#FF1744]"
              : "text-muted-foreground"
          )}
        >
          {row.paymentStatus || "unpaid"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => {
        const isCompleted = row.status === "completed";
        const isActive = row.status === "active" || row.status === "confirmed";
        const isPending = row.status === "pending";
        const isCancelled = row.status === "cancelled";

        return (
          <div className="space-y-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border inline-flex items-center gap-1",
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isActive
                  ? "bg-secondary text-foreground border-border/70"
                  : isPending
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : isCancelled
                  ? "bg-red-500/10 text-[#FF1744] border-red-500/20"
                  : "bg-secondary text-muted-foreground border-border/60"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {row.status}
            </span>
            {isCancelled && (
              <div className="pt-0.5 space-y-0.5">
                <div
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-[#FF1744] border border-red-500/20 max-w-[200px] truncate"
                  title={`Reason: ${formatCancellationReason(row.cancellationReason)}${row.cancellationExplanation || row.cancellationFeedback ? `\nExplanation: ${row.cancellationExplanation || row.cancellationFeedback}` : ""}`}
                >
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-[#FF1744]" />
                  <span className="truncate">{formatCancellationReason(row.cancellationReason)}</span>
                </div>
                {(row.cancellationExplanation || row.cancellationFeedback) && (
                  <div
                    className="text-[10px] text-muted-foreground italic truncate max-w-[200px]"
                    title={row.cancellationExplanation || row.cancellationFeedback}
                  >
                    "{row.cancellationExplanation || row.cancellationFeedback}"
                  </div>
                )}
              </div>
            )}
            {!isCancelled && row.deliveryStatus && (
              <span className="block text-[9px] font-mono text-muted-foreground uppercase">
                {row.deliveryStatus.replace(/_/g, " ")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedBooking(row);
              setModalOpen(true);
            }}
            className="p-1.5 rounded-md hover:bg-secondary text-foreground transition-colors cursor-pointer"
            title="Inspect booking & handover lifecycle"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {row.status !== "completed" && row.status !== "cancelled" && (
            <>
              <button
                onClick={() => handleComplete(row.id)}
                disabled={actionLoading}
                className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                title="Mark as completed"
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleCancel(row.id)}
                disabled={actionLoading}
                className="p-1.5 rounded-md bg-red-500/10 text-[#FF1744] hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                title="Cancel booking"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const tabCounts = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      active: bookings.filter((b) => b.status === "active" || b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--admin-border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Bookings
          </h1>
          <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5 font-medium">
            Track and manage all rental bookings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleResetBookings}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-[#FF1744] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Reset all bookings data"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Bookings</span>
          </button>
          <button
            onClick={() => fetchBookings()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[var(--admin-text-secondary)]", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* TABS WITH COUNTERS */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All", count: tabCounts.all },
          { id: "pending", label: "Pending", count: tabCounts.pending },
          { id: "active", label: "Active", count: tabCounts.active },
          { id: "completed", label: "Completed", count: tabCounts.completed },
          { id: "cancelled", label: "Cancelled", count: tabCounts.cancelled },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setCurrentPage(1);
              if (tab.id !== "cancelled") {
                setCancellationReasonFilter("all");
              }
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2",
              statusFilter === tab.id
                ? "bg-[var(--admin-text)] text-[var(--admin-bg)] font-semibold shadow-xs"
                : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                statusFilter === tab.id
                  ? "bg-black/15 text-black dark:text-black font-bold"
                  : "bg-black/5 dark:bg-white/10 text-[var(--admin-text-secondary)]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* CANCELLATION REASON ANALYTICS & INSIGHTS (Shown when viewing Cancelled bookings) */}
      {statusFilter === "cancelled" && (
        <div className="bg-[var(--admin-card)] rounded-xl border border-red-500/20 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--admin-border)] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 text-[#FF1744] flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-2">
                  <span>Cancellation Reason Analytics</span>
                  {cancellationReasonFilter !== "all" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-[#FF1744] border border-red-500/20">
                      Filtering: {cancellationReasonFilter}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                  {cancellationStats.total} total cancelled booking{cancellationStats.total === 1 ? "" : "s"}
                  {cancellationStats.topReason && (
                    <> • Top Reason: <span className="font-semibold text-foreground">"{cancellationStats.topReason[0]}" ({cancellationStats.topReason[1]})</span></>
                  )}
                </p>
              </div>
            </div>

            {cancellationReasonFilter !== "all" && (
              <button
                type="button"
                onClick={() => {
                  setCancellationReasonFilter("all");
                  setCurrentPage(1);
                }}
                className="self-start sm:self-auto text-[11px] font-semibold text-[#FF1744] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Clear reason filter</span>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Interactive Reason Breakdown Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCancellationReasonFilter("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                cancellationReasonFilter === "all"
                  ? "bg-red-500/20 text-[#FF1744] border-red-500/40 font-bold"
                  : "bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:text-[var(--admin-text)]"
              )}
            >
              <span>All Reasons</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                {cancellationStats.total}
              </span>
            </button>

            {cancellationStats.breakdown.map(([reason, count]) => {
              const isSelected = cancellationReasonFilter.toLowerCase() === reason.toLowerCase();
              const pct = cancellationStats.total > 0 ? Math.round((count / cancellationStats.total) * 100) : 0;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setCancellationReasonFilter(isSelected ? "all" : reason);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                    isSelected
                      ? "bg-red-500 text-white border-red-600 font-bold shadow-xs"
                      : "bg-[var(--admin-elevated)] text-[var(--admin-text-secondary)] border-[var(--admin-border)] hover:border-red-500/40 hover:text-[var(--admin-text)]"
                  )}
                >
                  <span className="truncate max-w-[240px]">{reason}</span>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                      isSelected ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10 text-[var(--admin-text)]"
                    )}
                  >
                    {count} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--admin-card)] p-3 rounded-xl border border-[var(--admin-border)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-text-secondary)]" />
          <input
            type="text"
            placeholder="Search by order ID, user or product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg pl-9 pr-3 py-2 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)] font-medium placeholder:text-[var(--admin-text-secondary)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusFilter === "cancelled" && (
            <select
              value={cancellationReasonFilter}
              onChange={(e) => {
                setCancellationReasonFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-2 border border-red-500/30 focus:outline-none font-medium cursor-pointer max-w-[220px]"
              title="Filter by cancellation reason"
            >
              <option value="all">All Reasons ({cancellationStats.total})</option>
              {RENTER_CANCELLATION_REASONS.map((r) => {
                const count = cancellationStats.breakdown.find(([k]) => k.toLowerCase() === r.toLowerCase())?.[1] || 0;
                return (
                  <option key={r} value={r}>
                    {r} {count > 0 ? `(${count})` : ""}
                  </option>
                );
              })}
              {cancellationStats.breakdown
                .filter(([r]) => !RENTER_CANCELLATION_REASONS.some((k) => k.toLowerCase() === r.toLowerCase()))
                .map(([r, count]) => (
                  <option key={r} value={r}>
                    {r} ({count})
                  </option>
                ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
              if (e.target.value !== "cancelled") {
                setCancellationReasonFilter("all");
              }
            }}
            className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading && bookings.length === 0 ? (
        <div className="bg-[var(--admin-card)] rounded-2xl border border-red-500/20 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--admin-text)]">Database Sync Failed</h3>
          <p className="text-xs text-[var(--admin-text-secondary)] mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="mt-4 px-4 py-2 rounded-xl bg-[var(--admin-elevated)] hover:opacity-80 text-[var(--admin-text)] text-xs font-bold transition-all border border-[var(--admin-border)] cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      ) : (
        /* TABLE */
        <div className="space-y-4">
          <Table
            columns={columns}
            data={paginatedBookings}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No bookings found"
            emptyDescription="No rental bookings found matching the filters."
          />

          {filteredBookings.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredBookings.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* BOOKING DETAIL MODAL */}
      {modalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Booking #{selectedBooking.id}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleString() : "—"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 flex items-center gap-3">
                <AdminProductImage src={selectedBooking.productImage} alt={selectedBooking.productTitle} className="w-12 h-12 rounded-lg" />
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground truncate">{selectedBooking.productTitle}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Rental Dates: {selectedBooking.startDate || "Start"} ➔ {selectedBooking.endDate || "End"}
                  </p>
                  {selectedBooking.timeSlot && (
                    <div className="mt-1">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary uppercase">
                        Slot: {selectedBooking.timeSlot.replace(/_/g, " ")}{" "}
                        {selectedBooking.startTime && selectedBooking.endTime ? `(${selectedBooking.startTime} – ${selectedBooking.endTime})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancellation Audit Record (Admin Inspection) */}
              {(selectedBooking.status === "cancelled" || selectedBooking.cancellationReason) && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-destructive flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Cancellation Audit Record
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-destructive/20 text-destructive uppercase">
                      Initiated by {selectedBooking.cancellationInitiatedBy || "LENDER"}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1.5 border-t border-destructive/20">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">Reason:</span>
                      <span className="font-bold text-foreground text-[11px]">
                        {formatCancellationReason(selectedBooking.cancellationReason)}
                      </span>
                    </div>

                    {(selectedBooking.cancellationExplanation || selectedBooking.cancellationFeedback) && (
                      <div className="space-y-1 pt-1">
                        <span className="text-muted-foreground text-[10px] block font-semibold">Written Explanation / Feedback:</span>
                        <p className="p-2.5 rounded-lg bg-background/60 border border-border/40 text-[11px] text-foreground italic">
                          "{selectedBooking.cancellationExplanation || selectedBooking.cancellationFeedback}"
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-destructive/10 font-mono">
                      <span>Previous Status: {selectedBooking.cancellationPreviousStatus || "active/pending"}</span>
                      {selectedBooking.cancellationTimestamp && (
                        <span>Cancelled: {new Date(selectedBooking.cancellationTimestamp).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Customer / Renter</span>
                  <span className="font-bold text-foreground block">{selectedBooking.customerName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block truncate">{selectedBooking.customerId}</span>
                </div>

                <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold block">Lender / Agent</span>
                  <span className="font-bold text-foreground block">{selectedBooking.ownerName || "Verified Lender"}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block truncate">{selectedBooking.ownerId || "—"}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-mono font-black text-sm text-foreground">₹{(selectedBooking.amount || 0).toLocaleString("en-IN")}</span>
              </div>

              {/* Handover & Delivery Lifecycle Section */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Handover & Delivery Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                    {(selectedBooking.deliveryStatus || "WAITING_FOR_ADMIN").replace(/_/g, " ")}
                  </span>
                </div>

                {selectedBooking.deliveryBoyName && (
                  <div className="text-[11px] text-muted-foreground flex justify-between">
                    <span>Courier Assigned:</span>
                    <span className="font-bold text-foreground">
                      {selectedBooking.deliveryBoyName} ({selectedBooking.deliveryBoyPhone || "Active"})
                    </span>
                  </div>
                )}

                {/* Handover timestamps */}
                <div className="text-[10px] text-muted-foreground space-y-1 pt-1 border-t border-border/40 font-mono">
                  {selectedBooking.pickedUpAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor Pickup Verified:</span>
                      <span className="font-semibold text-foreground">{new Date(selectedBooking.pickedUpAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBooking.arrivedAtRenterAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Courier Arrived at Renter:</span>
                      <span className="font-semibold text-foreground">{new Date(selectedBooking.arrivedAtRenterAt).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedBooking.rentalSecurity?.renterConfirmedReceipt && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Renter Inspection Confirmed:</span>
                      <span>
                        {selectedBooking.rentalSecurity.inspectionConfirmedAt
                          ? new Date(selectedBooking.rentalSecurity.inspectionConfirmedAt).toLocaleString()
                          : "Verified"}
                      </span>
                    </div>
                  )}
                  {selectedBooking.rentalSecurity?.activatedAt && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Rental Active:</span>
                      <span>{new Date(selectedBooking.rentalSecurity.activatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Admin Handover Dispatch Controls */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                  {(!selectedBooking.deliveryStatus || selectedBooking.deliveryStatus === "WAITING_FOR_ADMIN") && (
                    <button
                      onClick={async () => {
                        try {
                          setActionLoading(true);
                          await bookingsService.processBooking(selectedBooking.id);
                          toast.success(`Booking #${selectedBooking.id} marked as Processing.`);
                          fetchBookings(true);
                          setSelectedBooking((prev) => prev ? { ...prev, deliveryStatus: "ADMIN_PROCESSING" } : null);
                        } catch {
                          toast.error("Failed to process booking.");
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      Process Booking
                    </button>
                  )}

                  {(selectedBooking.deliveryStatus === "ADMIN_PROCESSING" || selectedBooking.deliveryStatus === "WAITING_FOR_ADMIN") && (
                    <button
                      onClick={async () => {
                        try {
                          setActionLoading(true);
                          await bookingsService.notifyVendor(selectedBooking.id);
                          toast.success(`Vendor notified to prepare gear for booking #${selectedBooking.id}.`);
                          fetchBookings(true);
                          setSelectedBooking((prev) => prev ? { ...prev, deliveryStatus: "READY_FOR_VENDOR" } : null);
                        } catch {
                          toast.error("Failed to notify vendor.");
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      Notify Vendor (Ready for Pickup)
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      const name = prompt("Enter Delivery Courier Name:", selectedBooking.deliveryBoyName || "Express Courier");
                      if (!name) return;
                      const phone = prompt("Enter Courier Phone:", selectedBooking.deliveryBoyPhone || "+91 98765 43210");
                      try {
                        setActionLoading(true);
                        await bookingsService.assignDelivery(selectedBooking.id, { deliveryBoyName: name, deliveryBoyPhone: phone || "" });
                        toast.success(`Assigned courier ${name} to booking #${selectedBooking.id}.`);
                        fetchBookings(true);
                        setSelectedBooking((prev) => prev ? { ...prev, deliveryBoyName: name, deliveryBoyPhone: phone || "" } : null);
                      } catch {
                        toast.error("Failed to assign courier.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-bold cursor-pointer"
                  >
                    Assign Courier
                  </button>
                </div>
              </div>
            </div>

            {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  onClick={() => handleRefund(selectedBooking.id)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Refund & Cancel</span>
                </button>
                <button
                  onClick={() => handleComplete(selectedBooking.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Mark Completed</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
