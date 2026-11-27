import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Eye,
  UserCheck,
  ShieldAlert,
  Star,
  IndianRupee,
  Package,
  Calendar,
  RefreshCw,
  X,
  Mail,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { usersService, isFakeUserEmail } from "../services/users";
import { AdminAgent } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import { ConfirmDialog } from "../components/layout/ConfirmDialog";

export default function Agents() {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Agent detail modal
  const [selectedAgent, setSelectedAgent] = useState<AdminAgent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [suspendAgentId, setSuspendAgentId] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);

  const navigate = useNavigate();

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersService.getAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load agent lenders directory.");
      toast.error("Failed to load agents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleSuspend = (id: string) => {
    setSuspendAgentId(id);
  };

  const executeSuspendAgent = async () => {
    if (!suspendAgentId) return;
    const id = suspendAgentId;
    try {
      setSuspending(true);
      const updated = await usersService.suspendAgent(id);
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (selectedAgent?.id === id) setSelectedAgent(updated);
      toast.warning("Agent suspended successfully.");
      setSuspendAgentId(null);
    } catch {
      toast.error("Failed to suspend agent.");
    } finally {
      setSuspending(false);
    }
  };

  const handleViewProducts = (agentName: string) => {
    navigate({
      to: "/admin/products",
      search: { search: agentName } as { search?: string },
    });
  };

  const filteredAgents = useMemo(() => {
    let result = agents.filter((a) => !isFakeUserEmail(a.email));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.fullName && a.fullName.toLowerCase().includes(q)) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.id && a.id.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((a) => {
        const s = String(a.status || "").toLowerCase();
        if (statusFilter === "pending") {
          return s === "pending" || s === "pending_review" || s === "unverified" || (s !== "active" && s !== "approved" && s !== "suspended");
        }
        if (statusFilter === "active") {
          return s === "active" || s === "approved";
        }
        return s === statusFilter.toLowerCase();
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
  }, [agents, search, statusFilter, sortKey, sortOrder]);

  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAgents.slice(start, start + itemsPerPage);
  }, [filteredAgents, currentPage, itemsPerPage]);

  const columns: Column<AdminAgent>[] = [
    {
      key: "fullName",
      label: "Agent / Lender",
      render: (row) => (
        <div className="flex items-center gap-3">
          <ProfilePhoto
            src={(row as any).profilePhotoUrl || (row as any).profile_photo_url || row.avatar}
            alt={row.fullName}
            size="sm"
            shape="circle"
          />
          <div className="min-w-0">
            <div className="font-bold text-[var(--admin-text)] truncate">{row.fullName || "Verified Agent"}</div>
            <div className="text-[11px] text-[var(--admin-text-muted)] font-mono truncate">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "productsCount",
      label: "Listings",
      sortable: true,
      render: (row) => (
        <button
          onClick={() => handleViewProducts(row.fullName || row.email)}
          className="text-xs font-mono font-bold text-primary hover:underline"
        >
          {row.productsCount || 0} gear items
        </button>
      ),
    },
    {
      key: "bookingsCount",
      label: "Leases Completed",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-semibold text-[var(--admin-text)]">
          {row.bookingsCount || 0} bookings
        </span>
      ),
    },
    {
      key: "revenue",
      label: "Gross Revenue",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-bold text-[var(--admin-text)]">
          ₹{(row.revenue || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-500">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          <span>{(row.rating || 5.0).toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[11px] font-bold  border",
            row.status === "active"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {row.status || "active"}
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
              setSelectedAgent(row);
              setModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] transition-colors cursor-pointer"
            title="View agent details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {row.status === "active" && (
            <button
              onClick={() => handleSuspend(row.id)}
              className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors cursor-pointer"
              title="Suspend agent"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const totalCount = agents.filter((a) => !isFakeUserEmail(a.email)).length;
  const verifiedCount = agents.filter((a) => {
    if (isFakeUserEmail(a.email)) return false;
    const s = String(a.status || "").toLowerCase();
    return s === "active" || s === "approved";
  }).length;
  const pendingCount = agents.filter((a) => {
    if (isFakeUserEmail(a.email)) return false;
    const s = String(a.status || "").toLowerCase();
    return s === "pending" || s === "pending_review" || s === "unverified" || (s !== "active" && s !== "approved" && s !== "suspended");
  }).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* HEADER (Panel 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--admin-border)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Agents
          </h1>
          <p className="text-xs sm:text-sm text-[var(--admin-text-muted)]">
            Manage verified agents and vendor accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAgents}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
            title="Refresh agents"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* TABS (Panel 4: All Agents, Pending, Verified) */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All Agents", count: totalCount },
          { id: "pending", label: "Pending", count: pendingCount },
          { id: "active", label: "Verified", count: verifiedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setCurrentPage(1);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2",
              statusFilter === tab.id
                ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)]"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[11px] font-mono",
                statusFilter === tab.id
                  ? "bg-white/20 dark:bg-black/15 text-[var(--admin-bg)]"
                  : "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* SEARCH & ADD AGENT CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
          <input
            type="text"
            placeholder="Search agents by name, email, or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg pl-9 pr-3 py-2 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)]/40 font-medium placeholder:text-[var(--admin-text-muted)]"
          />
        </div>

        <button
          onClick={() => navigate({ to: "/admin/kyc" })}
          className="px-3.5 py-2 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-card)] text-[var(--admin-text)] border border-[var(--admin-border)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span>Vendor KYC queue</span>
        </button>
      </div>

      {/* 3-STATE CONTAINER: ERROR vs TABLE (LOADING / REAL DATA / EMPTY DB) */}
      {error ? (
        <div className="bg-[var(--admin-card)] border border-red-500/20 p-8 rounded-xl text-center space-y-3">
          <div className="inline-flex p-2.5 rounded-full bg-red-500/10 text-[var(--admin-error)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Unable to Load Agents</h3>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">{error}</p>
          </div>
          <div>
            <button
              onClick={() => fetchAgents()}
              className="px-4 py-2 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors border border-[var(--admin-border)] cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
              <span>Retry Database Fetch</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Table
            columns={columns}
            data={paginatedAgents}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No Agents Found"
            emptyDescription="The database contains no registered agent lender records matching your filter criteria."
          />

          {filteredAgents.length > itemsPerPage && !loading && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredAgents.length}
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

      {/* AGENT DETAIL MODAL */}
      {modalOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-4">
              <div className="flex items-center gap-3">
                <ProfilePhoto
                  src={(selectedAgent as any).profilePhotoUrl || (selectedAgent as any).profile_photo_url || selectedAgent.avatar}
                  alt={selectedAgent.fullName}
                  size="md"
                  shape="circle"
                />
                <div>
                  <h3 className="text-sm font-bold text-[var(--admin-text)]">{selectedAgent.fullName || "Agent Profile"}</h3>
                  <p className="text-[11px] text-[var(--admin-text-muted)] font-mono">{selectedAgent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)]">
                <span className="text-[var(--admin-text-muted)] block text-[11px] font-bold">Listings</span>
                <span className="text-base font-semibold tabular-nums font-mono mt-1 block">{selectedAgent.productsCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)]">
                <span className="text-[var(--admin-text-muted)] block text-[11px] font-bold">Completed Leases</span>
                <span className="text-base font-semibold tabular-nums font-mono mt-1 block">{selectedAgent.bookingsCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)]">
                <span className="text-[var(--admin-text-muted)] block text-[11px] font-bold">Gross Revenue</span>
                <span className="text-base font-semibold tabular-nums font-mono mt-1 block">₹{(selectedAgent.revenue || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-elevated)] border border-[var(--admin-border)]">
                <span className="text-[var(--admin-text-muted)] block text-[11px] font-bold">Average Rating</span>
                <span className="text-base font-semibold tabular-nums font-mono mt-1 block text-amber-500">★ {(selectedAgent.rating || 5.0).toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--admin-border)]">
              <button
                onClick={() => {
                  setModalOpen(false);
                  handleViewProducts(selectedAgent.fullName || selectedAgent.email);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold text-xs hover:bg-[var(--admin-accent-hover)] transition-colors cursor-pointer"
              >
                View Agent Products
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!suspendAgentId}
        onClose={() => setSuspendAgentId(null)}
        onConfirm={executeSuspendAgent}
        title="Suspend agent account"
        description="This suspends the agent lender account and hides their gear listings until reactivated."
        confirmLabel="Suspend agent"
        destructive
        loading={suspending}
      />
    </div>
  );
}
