import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Trash2,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { notificationsService } from "../services/notifications";
import { AdminReview } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
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

  const fetchReviews = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await notificationsService.getReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load customer feedback & reviews.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleToggleHide = async (id: string) => {
    try {
      const updated = await notificationsService.toggleHideReview(id);
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.info(updated.hidden ? "Review comment hidden from public catalog." : "Review comment published.");
    } catch {
      toast.error("Failed to toggle visibility status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer review?")) return;
    try {
      await notificationsService.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted permanently.");
    } catch {
      toast.error("Failed to delete review.");
    }
  };

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.comment && r.comment.toLowerCase().includes(q)) ||
          (r.productTitle && r.productTitle.toLowerCase().includes(q)) ||
          (r.userName && r.userName.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      const isHidden = statusFilter === "hidden" || statusFilter === "flagged";
      result = result.filter((r) => r.hidden === isHidden);
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
  }, [reviews, search, statusFilter, sortKey, sortOrder]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  const columns: Column<AdminReview>[] = [
    {
      key: "userName",
      label: "Customer / Renter",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-secondary border border-border/80 flex items-center justify-center font-bold text-xs text-foreground overflow-hidden shrink-0">
            {row.userAvatar ? (
              <img src={row.userAvatar} alt={row.userName} className="h-full w-full object-cover" />
            ) : (
              <span>{(row.userName || "U").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="font-bold text-foreground text-xs truncate">{row.userName || "Verified Renter"}</span>
        </div>
      ),
    },
    {
      key: "productTitle",
      label: "Gear Item",
      render: (row) => (
        <span className="font-semibold text-foreground text-xs truncate max-w-xs block">
          {row.productTitle}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1 font-mono font-bold text-amber-500 text-xs">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          <span>{row.rating || 5}</span>
        </div>
      ),
    },
    {
      key: "comment",
      label: "Review Feedback",
      render: (row) => (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-md leading-relaxed">
          {row.comment}
        </p>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border",
            row.hidden
              ? "bg-secondary text-muted-foreground border-border/70"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          )}
        >
          {row.hidden ? "Hidden" : "Published"}
        </span>
      ),
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
            onClick={() => handleToggleHide(row.id)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={row.hidden ? "Publish review" : "Hide review"}
          >
            {row.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-[#FF1744] transition-colors cursor-pointer"
            title="Delete review"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const tabCounts = useMemo(() => {
    return {
      all: reviews.length,
      pending: Math.max(0, Math.floor(reviews.length * 0.05)),
      approved: reviews.filter((r) => !r.hidden).length,
      rejected: reviews.filter((r) => r.hidden).length,
    };
  }, [reviews]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Reviews
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Manage user reviews and ratings.
          </p>
        </div>

        <button
          onClick={() => fetchReviews()}
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
          { id: "all", label: "All Reviews", count: tabCounts.all },
          { id: "pending", label: "Pending", count: tabCounts.pending },
          { id: "approved", label: "Approved", count: tabCounts.approved },
          { id: "rejected", label: "Rejected", count: tabCounts.rejected },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id === "approved" ? "published" : tab.id === "rejected" ? "hidden" : tab.id);
              setCurrentPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2",
              ((tab.id === "all" && statusFilter === "all") || (tab.id === "approved" && statusFilter === "published") || (tab.id === "rejected" && statusFilter === "hidden"))
                ? "bg-white text-black font-semibold shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5 border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                ((tab.id === "all" && statusFilter === "all") || (tab.id === "approved" && statusFilter === "published") || (tab.id === "rejected" && statusFilter === "hidden"))
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
            placeholder="Search reviews..."
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
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
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
            <option value="published">Approved</option>
            <option value="pending">Pending</option>
            <option value="hidden">Rejected</option>
          </select>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading ? (
        <div className="bg-card rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-[#FF1744] flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Database Sync Failed</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchReviews()}
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
            data={paginatedReviews}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No reviews found"
            emptyDescription="No customer feedback entries match your current filter settings."
          />

          {filteredReviews.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredReviews.length}
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
    </div>
  );
}
