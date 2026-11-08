import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  CreditCard,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Receipt,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { api } from "@/utils/api";
import type { UserPaymentTransaction } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PaymentHistory() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/payments" }) as { q?: string; status?: string };

  const [transactions, setTransactions] = useState<UserPaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams?.q || "");
  const [statusFilter, setStatusFilter] = useState(searchParams?.status || "all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Transaction for Details / Receipt Modal
  const [selectedTx, setSelectedTx] = useState<UserPaymentTransaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) {
      toast.error("Please sign in to view payment history.");
      navigate({ to: "/login" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.getUserPaymentHistory(token, {
        q: searchQuery,
        status: statusFilter,
      });
      const txs = (res?.transactions as UserPaymentTransaction[]) || [];
      setTransactions(txs);
    } catch (err: any) {
      console.error("Error fetching payment transactions:", err);
      toast.error(err?.message || "Failed to load payment transactions.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, navigate]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalSpent = 0;
    let successfulCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;

    for (const tx of transactions) {
      const st = String(tx.status || "").toLowerCase();
      if (st === "successful" || st === "paid") {
        totalSpent += Number(tx.amount || 0);
        successfulCount++;
      } else if (st === "pending" || st === "processing" || st === "unpaid") {
        pendingCount++;
      } else if (st === "refunded" || tx.refund_status === "refunded") {
        refundedCount++;
      }
    }

    return { totalSpent, successfulCount, pendingCount, refundedCount };
  }, [transactions]);

  // Filtered & Paginated List
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "all") {
        const st = String(tx.status || "").toLowerCase();
        if (statusFilter === "successful" && st !== "successful" && st !== "paid") return false;
        if (statusFilter === "pending" && !["pending", "processing", "unpaid"].includes(st)) return false;
        if (statusFilter === "failed" && st !== "failed" && st !== "cancelled") return false;
        if (statusFilter === "refunded" && st !== "refunded" && tx.refund_status !== "refunded") return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = String(tx.id || "").toLowerCase().includes(q);
        const matchesBooking = String(tx.booking_id || "").toLowerCase().includes(q);
        const matchesTitle = String(tx.product_title || "").toLowerCase().includes(q);
        const matchesRzp = String(tx.razorpay_payment_id || "").toLowerCase().includes(q);
        if (!matchesId && !matchesBooking && !matchesTitle && !matchesRzp) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const handleOpenReceipt = async (tx: UserPaymentTransaction) => {
    setSelectedTx(tx);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);
    if (!token) return;

    setReceiptLoading(true);
    setShowReceiptModal(true);
    try {
      const res = await api.getPaymentReceipt(token, tx.booking_id);
      setReceiptData(res);
    } catch {
      // Fallback from transaction
      setReceiptData({
        receipt_number: `REC-${tx.booking_id.replace("ord_", "")}`,
        order_id: tx.booking_id,
        product_title: tx.product_title || "Equipment Rental",
        transaction_id: tx.razorpay_payment_id || tx.id,
        total_amount: tx.amount,
        payment_status: tx.status,
        issued_at: tx.created_at,
        escrow_guarantee: "100% Escrow Secured by Payent Protection",
      });
    } finally {
      setReceiptLoading(false);
    }
  };

  const getStatusBadge = (status: string, refundStatus?: string) => {
    const s = String(status || "").toLowerCase();
    if (refundStatus === "refunded" || s === "refunded") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          <RotateCcw className="h-3 w-3" />
          Refunded
        </span>
      );
    }
    if (s === "successful" || s === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Successful
        </span>
      );
    }
    if (s === "pending" || s === "processing" || s === "unpaid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-neutral-50 dark:bg-[#1E1E1E] text-neutral-900 dark:text-neutral-100 font-sans antialiased transition-colors pb-16">
        {/* Navigation Breadcrumb & Title */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#1E1E1E]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                title="Back to Orders"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Payment History & Transactions
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Track real-time escrow payments, order receipts, and refunds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="py-1.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                View My Orders
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Total Amount Paid
              </span>
              <p className="text-lg sm:text-2xl font-mono font-black text-neutral-900 dark:text-white">
                ₹{stats.totalSpent.toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Escrow Protected
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Successful Payments
              </span>
              <p className="text-lg sm:text-2xl font-mono font-black text-neutral-900 dark:text-white">
                {stats.successfulCount}
              </p>
              <span className="text-[10px] text-neutral-400">Verified by gateway</span>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Pending / Unpaid
              </span>
              <p className="text-lg sm:text-2xl font-mono font-black text-amber-600 dark:text-amber-400">
                {stats.pendingCount}
              </p>
              <span className="text-[10px] text-neutral-400">Awaiting payment</span>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Refunds Settled
              </span>
              <p className="text-lg sm:text-2xl font-mono font-black text-purple-600 dark:text-purple-400">
                {stats.refundedCount}
              </p>
              <span className="text-[10px] text-neutral-400">Returned to account</span>
            </div>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by Order ID, Transaction ID, product..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.03] text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { id: "all", label: "All" },
                { id: "successful", label: "Successful" },
                { id: "pending", label: "Pending" },
                { id: "failed", label: "Failed" },
                { id: "refunded", label: "Refunded" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(pill.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                    statusFilter === pill.id
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs"
                      : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* TRANSACTIONS LIST */}
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-700 dark:text-neutral-300" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading transactions...</p>
            </div>
          ) : paginatedList.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 space-y-3">
              <CreditCard className="h-10 w-10 text-neutral-400 mx-auto" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                No Transactions Found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No payments matched your search or status filter."
                  : "You haven't initiated any rental payments yet. Confirm a gear rental to see your transaction records here."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedList.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  {/* Left: Product & Transaction info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {tx.product_image ? (
                      <img
                        src={tx.product_image}
                        alt={tx.product_title || "Gear"}
                        className="h-12 w-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-400">
                        <CreditCard className="h-6 w-6" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {tx.product_title || "Equipment Rental"}
                        </h4>
                        {getStatusBadge(tx.status, tx.refund_status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-mono flex-wrap">
                        <span>Order #{tx.booking_id}</span>
                        <span>•</span>
                        <span>Tx ID: {tx.razorpay_payment_id || tx.id}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-sans">
                          <Calendar className="h-3 w-3" />
                          {new Date(tx.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Quick Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800/80 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold">Amount</span>
                      <p className="text-base sm:text-lg font-mono font-extrabold text-neutral-900 dark:text-white">
                        ₹{Number(tx.amount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {String(tx.status).toLowerCase() === "unpaid" && (
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/payment", search: { orderId: tx.booking_id } as any })}
                          className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Pay Now
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(tx)}
                        className="py-1.5 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="View Official Receipt"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate({ to: "/orders" })}
                        className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Open in My Orders"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} transactions
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                  Payment Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {receiptLoading ? (
              <div className="p-8 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-neutral-700 dark:text-neutral-300" />
                <p className="text-xs text-neutral-500">Retrieving official receipt...</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Receipt No:</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {receiptData?.receipt_number || `REC-${selectedTx?.booking_id.replace("ord_", "")}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400">Order Reference:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    #{receiptData?.order_id || selectedTx?.booking_id}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400">Transaction ID:</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                    {receiptData?.transaction_id || selectedTx?.razorpay_payment_id || selectedTx?.id}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400">Item:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                    {receiptData?.product_title || selectedTx?.product_title}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    {receiptData?.payment_status || selectedTx?.status || "PAID"}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="font-bold text-neutral-900 dark:text-white">Amount:</span>
                  <span className="font-mono font-extrabold text-base text-neutral-900 dark:text-white">
                    ₹{Number(receiptData?.total_amount || selectedTx?.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Print / Save Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="py-2 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
