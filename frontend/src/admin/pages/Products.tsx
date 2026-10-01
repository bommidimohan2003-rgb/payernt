import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  Star,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { productsService } from "../services/products";
import { AdminProduct } from "../services/api";
import { toast } from "sonner";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { adminWS } from "../services/websocket";
import { AdminProductImage } from "../components/common/AdminProductImage";
import { cn } from "@/lib/utils";

export default function Products() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Router search params
  const routerSearch = useSearch({ strict: false }) as { search?: string; status?: string };
  const [search, setSearch] = useState(routerSearch?.search || "");
  const [statusFilter, setStatusFilter] = useState(routerSearch?.status || "all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchProducts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await productsService.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to fetch equipment catalog from database.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const unsubCreated = adminWS.subscribe("product.created", () => {
      fetchProducts(true);
    });
    const unsubUpdated = adminWS.subscribe("product.updated", () => {
      fetchProducts(true);
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [fetchProducts]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleApprove = async (id: string, title: string) => {
    try {
      setActionLoadingId(id);
      await productsService.approveProduct(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "approved", available: true } : p)));
      toast.success(`Listing "${title}" approved and published.`);
    } catch {
      toast.error("Failed to approve product.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string, title: string) => {
    try {
      setActionLoadingId(id);
      await productsService.rejectProduct(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "rejected", available: false } : p)));
      toast.info(`Listing "${title}" rejected.`);
    } catch {
      toast.error("Failed to reject product.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleHide = async (id: string) => {
    try {
      setActionLoadingId(id);
      const updated = await productsService.toggleHideProduct(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, hidden: updated.hidden } : p)));
      toast.info(updated.hidden ? "Listing hidden from public marketplace." : "Listing restored to public catalog.");
    } catch {
      toast.error("Failed to toggle listing visibility.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    try {
      setActionLoadingId(id);
      await productsService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Listing deleted permanently.");
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.owner?.name && p.owner.name.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "live" || statusFilter === "approved") {
        result = result.filter((p) => p.status === "approved" && !p.hidden);
      } else if (statusFilter === "pending") {
        result = result.filter((p) => p.status === "pending" || p.status === "under_review");
      } else if (statusFilter === "needs_correction") {
        result = result.filter((p) => p.status === "needs_correction");
      } else if (statusFilter === "price_not_set") {
        result = result.filter((p) => !p.approvedPriceRange);
      } else if (statusFilter === "price_set") {
        result = result.filter((p) => Boolean(p.approvedPriceRange));
      } else if (statusFilter === "suspended") {
        result = result.filter((p) => p.hidden || (!p.available && p.status === "approved"));
      } else {
        result = result.filter((p) => p.status === statusFilter);
      }
    }

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
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
  }, [products, search, statusFilter, categoryFilter, sortKey, sortOrder]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const columns: Column<AdminProduct>[] = [
    {
      key: "product",
      label: "Equipment Item",
      render: (row) => (
        <div className="flex items-center gap-3">
          <AdminProductImage src={row.image} alt={row.title} className="w-10 h-10 rounded-lg" />
          <div className="min-w-0">
            <div className="font-bold text-foreground truncate max-w-xs">{row.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">{row.category} {row.brand ? `• ${row.brand}` : ""}</div>
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      label: "Owner / Lender",
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{row.owner?.name || "Verified Lender"}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{row.owner?.email || "—"}</div>
        </div>
      ),
    },
    {
      key: "priceStatus",
      label: "Approved Price Range",
      render: (row) => {
        if (row.approvedPriceRange) {
          return (
            <div className="flex flex-col">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                ₹{row.approvedPriceRange.minPrice.toLocaleString("en-IN")} — ₹{row.approvedPriceRange.maxPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground uppercase">
                /{row.approvedPriceRange.unit || "day"} • SET
              </span>
            </div>
          );
        }
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-muted text-muted-foreground border border-border/60">
            PRICE NOT SET
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Review Status",
      sortable: true,
      render: (row) => {
        const isApproved = row.status === "approved";
        const isPending = row.status === "pending" || row.status === "under_review";
        const isNeedsCorrection = row.status === "needs_correction";
        const isRejected = row.status === "rejected";

        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1",
                isApproved
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isPending
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : isNeedsCorrection
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  : isRejected
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-secondary text-muted-foreground border-border/60"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {isPending ? "Pending Review" : isNeedsCorrection ? "Needs Revision" : row.status}
            </span>
            {row.hidden && (
              <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/60">
                Hidden
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Submitted Date",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Review & Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to="/admin/products/$id"
            params={{ id: row.id }}
            className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Open complete product review"
          >
            <span>Review</span>
            <Eye className="h-3 w-3" />
          </Link>

          <button
            onClick={() => handleToggleHide(row.id)}
            disabled={actionLoadingId === row.id}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title={row.hidden ? "Unhide from marketplace" : "Hide from marketplace"}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => handleDelete(row.id)}
            disabled={actionLoadingId === row.id}
            className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all cursor-pointer"
            title="Delete listing"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Products &amp; Moderation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Review lender listings, configure approved rental pricing ranges, and manage marketplace catalogue.
          </p>
        </div>

        <button
          onClick={() => fetchProducts()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", loading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* TABS: ALL | PENDING | APPROVED | REVISION REQUIRED | REJECTED | PRICE NOT SET | PRICE SET */}
      <div className="flex items-center gap-1.5 border-b border-border/40 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All Listings" },
          { id: "pending", label: "Pending Review" },
          { id: "approved", label: "Approved" },
          { id: "needs_correction", label: "Needs Revision" },
          { id: "price_not_set", label: "Price Not Set" },
          { id: "price_set", label: "Price Set" },
          { id: "rejected", label: "Rejected" },
          { id: "suspended", label: "Suspended / Hidden" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setCurrentPage(1);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
              statusFilter === tab.id
                ? "bg-secondary text-foreground font-semibold border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEARCH & CATEGORY FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search gear by title, category, owner..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-card text-foreground text-xs rounded-lg pl-9 pr-3 py-2 border border-border/70 focus:outline-none focus:border-foreground/40 font-medium placeholder:text-muted-foreground"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-card text-foreground text-xs rounded-lg px-2.5 py-2 border border-border/70 focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
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
            onClick={() => fetchProducts()}
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
            data={paginatedProducts}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No gear listings match criteria"
            emptyDescription="No equipment items found matching your current filter settings."
          />

          {filteredProducts.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
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
