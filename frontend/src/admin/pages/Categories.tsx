import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Grid,
  RefreshCw,
  X,
  Package,
  ShieldAlert,
} from "lucide-react";
import { productsService } from "../services/products";
import { AdminCategory } from "../services/api";
import { Table, Column } from "../components/layout/Table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Categories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<AdminCategory | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Camera");
  const [color, setColor] = useState("bg-secondary text-foreground border border-border");
  const [submitting, setSubmitting] = useState(false);

  const fetchCats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productsService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load gear categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCats();
  }, [fetchCats]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const created = await productsService.createCategory({
        name: name.trim(),
        icon,
        color,
      });
      setCategories((prev) => [...prev, created]);
      setCreateModalOpen(false);
      setName("");
      toast.success("Category created successfully.");
    } catch {
      toast.error("Failed to create category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setSelectedCat(cat);
    setName(cat.name);
    setIcon(cat.icon || "Camera");
    setColor(cat.color || "bg-secondary text-foreground border border-border");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !name.trim()) return;

    try {
      setSubmitting(true);
      const updated = await productsService.updateCategory(selectedCat.id, {
        name: name.trim(),
        icon,
        color,
      });
      setCategories((prev) => prev.map((c) => (c.id === selectedCat.id ? { ...c, ...updated } : c)));
      setEditModalOpen(false);
      setSelectedCat(null);
      setName("");
      toast.success("Category updated.");
    } catch {
      toast.error("Failed to update category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat: AdminCategory) => {
    if (cat.count && cat.count > 0) {
      alert(`Cannot delete category '${cat.name}' because ${cat.count} active gear items depend on it. Reassign items first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete category '${cat.name}'?`)) return;

    try {
      await productsService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast.success("Category removed.");
    } catch {
      toast.error("Failed to remove category.");
    }
  };

  const [search, setSearch] = useState("");

  const filteredCategories = categories.filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const columns: Column<AdminCategory>[] = [
    {
      key: "name",
      label: "Category",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#171C23] flex items-center justify-center text-[#F5F5F5] border border-[rgba(161,161,170,0.18)]">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-[#F5F5F5] text-xs">{row.name}</div>
            <div className="text-[10px] text-[#A1A1AA] font-mono">ID: {row.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "icon",
      label: "Icon",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#171C23] text-[#A1A1AA] border border-[rgba(161,161,170,0.18)]">
          {row.icon || "Package"}
        </span>
      ),
    },
    {
      key: "count",
      label: "Products",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[#F5F5F5]">
          {row.count || 0}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: () => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Active
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
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg bg-[#171C23] hover:bg-white/10 text-[#F5F5F5] transition-all cursor-pointer border border-[rgba(161,161,170,0.18)]"
            title="Edit category"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
            title="Delete category"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Categories
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Manage product categories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(161,161,170,0.18)] bg-[#10151B] hover:bg-[#171C23] text-[#F5F5F5] text-xs font-medium transition-colors cursor-pointer"
            title="Refresh categories"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[#A1A1AA]", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setName("");
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center justify-between gap-3 bg-[#10151B] p-3 rounded-xl border border-[rgba(161,161,170,0.18)]">
        <div className="relative flex-1 max-w-sm">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050709] text-[#F5F5F5] text-xs rounded-lg pl-9 pr-3 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none focus:border-white/40 font-medium placeholder:text-[#A1A1AA]"
          />
        </div>
        <div className="text-xs font-mono text-[#A1A1AA]">
          {filteredCategories.length} Categories Total
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading ? (
        <div className="bg-[#10151B] rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Database Sync Failed</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={fetchCats}
            className="px-4 py-2 rounded-lg bg-[#171C23] hover:bg-[#171C23]/80 text-[#F5F5F5] text-xs font-medium transition-colors border border-[rgba(161,161,170,0.18)] cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      ) : (
        /* TABLE */
        <div className="space-y-4">
          <Table
            columns={columns}
            data={filteredCategories}
            loading={loading}
            emptyTitle="No categories found"
            emptyDescription="No categories have been configured in the database."
          />
        </div>
      )}

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-semibold text-foreground">Create New Category</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cinema Lenses, Audio..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border/70 text-foreground font-medium focus:outline-none focus:border-foreground/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && selectedCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-semibold text-foreground">Edit Category</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border/70 text-foreground font-medium focus:outline-none focus:border-foreground/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
