import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Eye,
  RotateCcw,
  Download,
  CreditCard,
  RefreshCw,
  X,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { paymentsService } from "../services/payments";
import { AdminPayment } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminWS } from "../services/websocket";
import { ConfirmDialog } from "../components/layout/ConfirmDialog";

export default function Payments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Detail Modal
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundTargetId, setRefundTargetId] = useState<string | null>(null);

  const fetchPayments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await paymentsService.getPayments();
      setPayments(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load payment transactions.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();

    const unsubCreated = adminWS.subscribe("payment.created", () => {
      fetchPayments(true);
    });
    const unsubRefunded = adminWS.subscribe("payment.refunded", () => {
      fetchPayments(true);
    });

    return () => {
      unsubCreated();
      unsubRefunded();
    };
  }, [fetchPayments]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleRefund = (id: string) => {
    setRefundTargetId(id);
  };

  const executeRefund = async () => {
    if (!refundTargetId) return;
    const id = refundTargetId;
    try {
      setRefunding(true);
      const updated = await paymentsService.refundPayment(id);
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated, status: "refunded" } : p)));
      if (selectedPayment?.id === id) {
        setSelectedPayment((prev) => prev ? { ...prev, ...updated, status: "refunded" } : null);
      }
      toast.success(`Payment #${id} refunded.`);
      setRefundTargetId(null);
    } catch {
      toast.error("Failed to refund payment.");
    } finally {
      setRefunding(false);
    }
  };

  const filteredPayments = useMemo(() => {
    let result = [...payments];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.bookingId && p.bookingId.toLowerCase().includes(q)) ||
          (p.customerName && p.customerName.toLowerCase().includes(q)) ||
          (p.customerId && p.customerId.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((p) => {
        const rawType = String((p as any).type || "").toLowerCase();
        if (rawType) return rawType === typeFilter;
        const st = String(p.status || "").toLowerCase();
        const method = String(p.method || "").toLowerCase();
        if (typeFilter === "refund") return st === "refunded";
        if (typeFilter === "payout") return method.includes("payout") || method.includes("bank transfer");
        if (typeFilter === "fee") return Boolean((p as any).isFee);
        return st !== "refunded";
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
  }, [payments, search, statusFilter, typeFilter, sortKey, sortOrder]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  const columns: Column<AdminPayment>[] = [
    {
      key: "id",
      label: "Payment ID",
      render: (row) => (
        <span className="font-mono font-bold text-[var(--admin-text)] text-xs">
          #{row.id}
        </span>
      ),
    },
    {
      key: "bookingId",
      label: "Order Ref",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--admin-text-muted)]">
          #{row.bookingId}
        </span>
      ),
    },
    {
      key: "customerName",
      label: "Customer",
      render: (row) => (
        <div className="min-w-0">
          <div className="font-bold text-[var(--admin-text)] truncate text-xs">{row.customerName}</div>
          <div className="text-[11px] text-[var(--admin-text-muted)] font-mono truncate">{row.customerId}</div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-[var(--admin-text)] text-xs">
          ₹{(row.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "method",
      label: "Gateway",
      render: (row) => (
        <span className="text-xs font-medium text-[var(--admin-text-muted)]">
          {row.method || "Razorpay Verified"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => {
        const isSuccess = row.status === "successful" || row.status === "captured";
        const isPending = row.status === "pending";
        const isRefunded = row.status === "refunded";
        const isFailed = row.status === "failed";

        return (
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium  border inline-flex items-center gap-1",
              isSuccess
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : isPending
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : isRefunded
                ? "bg-[var(--admin-elevated)] text-[var(--admin-text)] border-border/70"
                : isFailed
                ? "bg-red-500/10 text-[var(--admin-error)] border-red-500/20"
                : "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] border-[var(--admin-border)]"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {row.status}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[var(--admin-text-muted)] font-mono">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedPayment(row);
              setModalOpen(true);
            }}
            className="p-1.5 rounded-md hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] transition-colors cursor-pointer"
            title="Inspect payment transaction"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {row.status === "successful" && (
            <button
              onClick={() => handleRefund(row.id)}
              disabled={refunding}
              className="p-1.5 rounded-md bg-red-500/10 text-[var(--admin-error)] hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
              title="Issue refund"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const tabCounts = useMemo(() => {
    return {
      all: payments.length,
      platform: payments.filter((p) => p.status === "successful" || p.status === "captured").length,
      payouts: payments.filter((p) => (p as any).type === "payout" || (p as any).type === "payout_to_lender").length,
      refunds: payments.filter((p) => p.status === "refunded").length,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Payments
          </h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
            Track all transactions and payouts.
          </p>
        </div>

        <button
          onClick={() => fetchPayments()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-[var(--admin-text-muted)]", loading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TABS WITH COUNTERS */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All Transactions", count: tabCounts.all },
          { id: "platform", label: "Platform Revenue", count: tabCounts.platform },
          { id: "payouts", label: "Payouts", count: tabCounts.payouts },
          { id: "refunded", label: "Refunds", count: tabCounts.refunds },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id === "platform" ? "successful" : tab.id === "payouts" ? "all" : tab.id);
              setCurrentPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
              (statusFilter === tab.id || (tab.id === "platform" && statusFilter === "successful"))
                ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[11px] font-mono",
                (statusFilter === tab.id || (tab.id === "platform" && statusFilter === "successful"))
                  ? "bg-white/20 dark:bg-black/15 text-[var(--admin-bg)] font-medium"
                  : "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--admin-card)] p-3 rounded-xl border border-[var(--admin-border)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
          <input
            type="text"
            placeholder="Search by payment ID, user, or order"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg pl-9 pr-3 py-2 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)]/40 font-medium placeholder:text-[var(--admin-text-muted)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="rental">Rental</option>
            <option value="payout">Payout to Lender</option>
            <option value="refund">Refund</option>
            <option value="fee">Platform Fee</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="successful">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading && payments.length === 0 ? (
        <div className="bg-[var(--admin-card)] rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-[var(--admin-error)] flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Database Sync Failed</h3>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchPayments()}
            className="px-4 py-2 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors border border-[var(--admin-border)] cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      ) : (
        /* TABLE */
        <div className="space-y-4">
          <Table
            columns={columns}
            data={paginatedPayments}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No payments found"
            emptyDescription="No payment transaction records match your current filter settings."
          />

          {filteredPayments.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPayments.length}
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

      {/* PAYMENT DETAIL MODAL */}
      {modalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--admin-text)]">Payment #{selectedPayment.id}</h3>
                <p className="text-[11px] text-[var(--admin-text-muted)] font-mono">
                  {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : "—"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex justify-between items-center">
                <span className="text-[var(--admin-text-muted)]">Verification Status</span>
                <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-[var(--admin-elevated)] border border-[var(--admin-border)]">
                  {selectedPayment.status}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex justify-between items-center">
                <span className="text-[var(--admin-text-muted)]">Order Reference</span>
                <span className="font-mono font-bold">#{selectedPayment.bookingId}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex justify-between items-center">
                <span className="text-[var(--admin-text-muted)]">Customer / Payer</span>
                <span className="font-bold">{selectedPayment.customerName} ({selectedPayment.customerId})</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex justify-between items-center">
                <span className="text-[var(--admin-text-muted)]">Gateway Provider</span>
                <span className="font-medium">{selectedPayment.method || "Razorpay Standard"}</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)] flex justify-between items-center">
                <span className="text-[var(--admin-text-muted)]">Total Transacted</span>
                <span className="font-mono font-semibold tabular-nums text-sm text-[var(--admin-text)]">₹{(selectedPayment.amount || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {selectedPayment.status === "successful" && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--admin-border)]">
                <button
                  onClick={() => handleRefund(selectedPayment.id)}
                  disabled={refunding}
                  className="px-4 py-2 rounded-xl bg-destructive text-white font-bold text-xs hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {refunding ? "Processing Refund..." : "Issue Verified Refund"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!refundTargetId}
        onClose={() => setRefundTargetId(null)}
        onConfirm={executeRefund}
        title="Issue verified refund"
        description={`Issue a refund for payment #${refundTargetId || ""}? This reverses the transaction and cancels the associated order.`}
        confirmLabel="Issue refund"
        destructive
        loading={refunding}
      />
    </div>
  );
}
