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

export default function Payments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const handleRefund = async (id: string) => {
    if (!confirm(`Are you sure you want to issue a refund for payment #${id}? This will reverse the transaction and cancel the order.`)) return;
    try {
      setRefunding(true);
      const updated = await paymentsService.refundPayment(id);
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated, status: "refunded" } : p)));
      if (selectedPayment?.id === id) {
        setSelectedPayment((prev) => prev ? { ...prev, ...updated, status: "refunded" } : null);
      }
      toast.success(`Payment #${id} refunded.`);
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
  }, [payments, search, statusFilter, sortKey, sortOrder]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  const columns: Column<AdminPayment>[] = [
    {
      key: "id",
      label: "Payment ID",
      render: (row) => (
        <span className="font-mono font-bold text-foreground text-xs">
          #{row.id}
        </span>
      ),
    },
    {
      key: "bookingId",
      label: "Order Ref",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.bookingId}
        </span>
      ),
    },
    {
      key: "customerName",
      label: "Customer",
      render: (row) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground truncate text-xs">{row.customerName}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{row.customerId}</div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (row) => (
        <span className="font-mono font-bold text-foreground text-xs">
          ₹{(row.amount || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "method",
      label: "Gateway",
      render: (row) => (
        <span className="text-xs font-medium text-muted-foreground">
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
              "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border inline-flex items-center gap-1",
              isSuccess
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : isPending
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : isRefunded
                ? "bg-secondary text-foreground border-border/70"
                : isFailed
                ? "bg-red-500/10 text-[#FF1744] border-red-500/20"
                : "bg-secondary text-muted-foreground border-border/60"
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
        <span className="text-xs text-muted-foreground font-mono">
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
            className="p-1.5 rounded-md hover:bg-secondary text-foreground transition-colors cursor-pointer"
            title="Inspect payment transaction"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {row.status === "successful" && (
            <button
              onClick={() => handleRefund(row.id)}
              disabled={refunding}
              className="p-1.5 rounded-md bg-red-500/10 text-[#FF1744] hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Payments
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Track all transactions and payouts.
          </p>
        </div>

        <button
          onClick={() => fetchPayments()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(161,161,170,0.18)] bg-[#10151B] hover:bg-[#171C23] text-[#F5F5F5] text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-[#A1A1AA]", loading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TABS WITH COUNTERS */}
      <div className="flex items-center gap-2 border-b border-[rgba(161,161,170,0.18)] pb-2 overflow-x-auto no-scrollbar">
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
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2",
              (statusFilter === tab.id || (tab.id === "platform" && statusFilter === "successful"))
                ? "bg-white text-black font-semibold shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5 border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                (statusFilter === tab.id || (tab.id === "platform" && statusFilter === "successful"))
                  ? "bg-black/15 text-black font-bold"
                  : "bg-white/10 text-[#A1A1AA]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#10151B] p-3 rounded-xl border border-[rgba(161,161,170,0.18)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search by payment ID, user or order..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050709] text-[#F5F5F5] text-xs rounded-lg pl-9 pr-3 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none focus:border-white/40 font-medium placeholder:text-[#A1A1AA]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="bg-[#050709] text-[#F5F5F5] text-xs rounded-lg px-2.5 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none font-medium cursor-pointer"
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
            className="bg-[#050709] text-[#F5F5F5] text-xs rounded-lg px-2.5 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none font-medium cursor-pointer"
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
        <div className="bg-card rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-[#FF1744] flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Database Sync Failed</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchPayments()}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border/80 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Payment #{selectedPayment.id}</h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {selectedPayment.createdAt ? new Date(selectedPayment.createdAt).toLocaleString() : "—"}
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
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground">Verification Status</span>
                <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-secondary border border-border/60">
                  {selectedPayment.status}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground">Order Reference</span>
                <span className="font-mono font-bold">#{selectedPayment.bookingId}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground">Customer / Payer</span>
                <span className="font-bold">{selectedPayment.customerName} ({selectedPayment.customerId})</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground">Gateway Provider</span>
                <span className="font-medium">{selectedPayment.method || "Razorpay Standard"}</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex justify-between items-center">
                <span className="text-muted-foreground">Total Transacted</span>
                <span className="font-mono font-black text-sm text-foreground">₹{(selectedPayment.amount || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {selectedPayment.status === "successful" && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  onClick={() => handleRefund(selectedPayment.id)}
                  disabled={refunding}
                  className="px-4 py-2 rounded-xl bg-destructive text-white font-bold text-xs hover:bg-destructive/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {refunding ? "Processing Refund..." : "Issue Verified Refund"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
