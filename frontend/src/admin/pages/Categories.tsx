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
import { ConfirmDialog } from "../components/layout/ConfirmDialog";

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
  const [color, setColor] = useState("bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-border");
  const [submitting, setSubmitting] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<AdminCategory | null>(null);

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
    setColor(cat.color || "bg-[var(--admin-elevated)] text-[var(--admin-text)] border border-border");
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

  const handleDelete = (cat: AdminCategory) => {
    if (cat.count && cat.count > 0) {
      toast.error(`Cannot delete category '${cat.name}' because ${cat.count} active gear items depend on it. Reassign items first.`);
      return;
    }
    setDeleteCategoryTarget(cat);
  };

  const executeDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    try {
      setSubmitting(true);
      await productsService.deleteCategory(deleteCategoryTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteCategoryTarget.id));
      toast.success("Category removed.");
      setDeleteCategoryTarget(null);
    } catch {
      toast.error("Failed to remove category.");
    } finally {
      setSubmitting(false);
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
          <div className="h-8 w-8 rounded-lg bg-[var(--admin-elevated)] flex items-center justify-center text-[var(--admin-text)] border border-[var(--admin-border)]">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-[var(--admin-text)] text-xs">{row.name}</div>
            <div className="text-[11px] text-[var(--admin-text-muted)] font-mono">ID: {row.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "icon",
      label: "Icon",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]">
          {row.icon || "Package"}
        </span>
      ),
    },
    {
      key: "count",
      label: "Products",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-[var(--admin-text)]">
          {row.count || 0}
        </span>
      ),
    },
    {
      key: "enabled",
      label: "Status",
      render: () => (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
            className="p-1.5 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] transition-colors cursor-pointer border border-[var(--admin-border)]"
            title="Edit category"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--admin-border)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Categories
          </h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
            Manage product categories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer"
            title="Refresh categories"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[var(--admin-text-muted)]", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setName("");
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-[var(--admin-bg)] font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center justify-between gap-3 bg-[var(--admin-card)] p-3 rounded-xl border border-[var(--admin-border)]">
        <div className="relative flex-1 max-w-sm">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
          <input
            type="text"
            placeholder="Search categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg pl-9 pr-3 py-2 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)]/40 font-medium placeholder:text-[var(--admin-text-muted)]"
          />
        </div>
        <div className="text-xs font-mono text-[var(--admin-text-muted)]">
          {filteredCategories.length} Categories Total
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading ? (
        <div className="bg-[var(--admin-card)] rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Database Sync Failed</h3>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={fetchCats}
            className="px-4 py-2 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)]/80 text-[var(--admin-text)] text-xs font-medium transition-colors border border-[var(--admin-border)] cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">Create New Category</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--admin-text)]">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cinema Lenses, Audio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-[var(--admin-text)]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--admin-success)] hover:opacity-90 text-white dark:text-[#111] font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">Edit Category</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[var(--admin-text)]">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium focus:outline-none focus:border-[var(--admin-text)]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--admin-success)] hover:opacity-90 text-white dark:text-[#111] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={executeDeleteCategory}
        title="Delete category"
        description={`Remove category "${deleteCategoryTarget?.name || ""}"?`}
        confirmLabel="Delete category"
        destructive
        loading={submitting}
      />
    </div>
  );
}
