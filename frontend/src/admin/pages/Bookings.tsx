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
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { bookingsService } from "../services/bookings";
import { AdminBooking } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminWS } from "../services/websocket";
import { AdminProductImage } from "../components/common/AdminProductImage";

export default function Bookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
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

  // Drawer / Detail modal
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await bookingsService.getBookings();
      setBookings(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load rental bookings from database.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
  }, [bookings, search, statusFilter, sortKey, sortOrder]);

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
            {row.deliveryStatus && (
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Bookings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Rental operations, gear dispatch timelines, schedules, and fulfillment
          </p>
        </div>

        <button
          onClick={() => fetchBookings()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", loading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bookings by ID, customer, product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-card text-foreground text-xs rounded-lg pl-9 pr-3 py-2 border border-border/70 focus:outline-none focus:border-foreground/40 font-medium placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center p-0.5 bg-secondary/60 rounded-lg border border-border/60 text-xs font-medium overflow-x-auto no-scrollbar">
          {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer text-xs whitespace-nowrap",
                statusFilter === st
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading ? (
        <div className="bg-card rounded-2xl border border-destructive/30 p-12 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground font-display">Database Sync Failed</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      ) : (
        /* TABLE */
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          <Table
            columns={columns}
            data={paginatedBookings}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyMessage="No rental bookings found matching the filters."
          />

          {filteredBookings.length > itemsPerPage && (
            <div className="p-4 border-t border-border/40">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredBookings.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredBookings.length}
              />
            </div>
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  className="px-3.5 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-xs transition-all cursor-pointer"
                >
                  Refund & Cancel
                </button>
                <button
                  onClick={() => handleComplete(selectedBooking.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Mark Completed
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
