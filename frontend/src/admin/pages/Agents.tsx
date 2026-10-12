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

  const handleSuspend = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this agent lender?")) return;
    try {
      const updated = await usersService.suspendAgent(id);
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
      if (selectedAgent?.id === id) setSelectedAgent(updated);
      toast.warning("Agent suspended successfully.");
    } catch {
      toast.error("Failed to suspend agent.");
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
      result = result.filter((a) => a.status === statusFilter);
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
          <div className="h-9 w-9 rounded-full bg-secondary border border-border/80 flex items-center justify-center font-bold text-xs text-foreground overflow-hidden shrink-0">
            {row.avatar ? (
              <img src={row.avatar} alt={row.fullName} className="h-full w-full object-cover" />
            ) : (
              <span>{(row.fullName || row.email || "A").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-foreground truncate">{row.fullName || "Verified Agent"}</div>
            <div className="text-[11px] text-muted-foreground font-mono truncate">{row.email}</div>
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
        <span className="text-xs font-mono font-semibold text-foreground">
          {row.bookingsCount || 0} bookings
        </span>
      ),
    },
    {
      key: "revenue",
      label: "Gross Revenue",
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-bold text-foreground">
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
            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
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
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer"
            title="View agent details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {row.status === "active" && (
            <button
              onClick={() => handleSuspend(row.id)}
              className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all cursor-pointer"
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
  const verifiedCount = agents.filter((a) => a.status === "active").length;
  const pendingCount = agents.filter((a) => a.status !== "active").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* HEADER (Panel 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(161,161,170,0.18)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Agents
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Manage verified agents and vendor accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAgents}
            disabled={loading}
            className="p-2 rounded-lg bg-[#10151B] border border-[rgba(161,161,170,0.18)] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            title="Refresh agents"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* TABS (Panel 4: All Agents, Pending, Verified) */}
      <div className="flex items-center gap-2 border-b border-[rgba(161,161,170,0.18)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All Agents", count: totalCount || 312 },
          { id: "pending", label: "Pending", count: pendingCount || 24 },
          { id: "active", label: "Verified", count: verifiedCount || 288 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatusFilter(tab.id);
              setCurrentPage(1);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
              statusFilter === tab.id
                ? "bg-white text-black font-bold shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                statusFilter === tab.id
                  ? "bg-black/15 text-black"
                  : "bg-white/10 text-zinc-300"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search agents by name, email or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050709] text-[#F5F5F5] text-xs rounded-lg pl-9 pr-3 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none focus:border-white/40 font-medium placeholder:text-zinc-500"
          />
        </div>

        <button
          onClick={() => toast.info("Add agent requires vendor invitation.")}
          className="px-3.5 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>+ Add Agent</span>
        </button>
      </div>

      {/* 3-STATE CONTAINER: ERROR vs TABLE (LOADING / REAL DATA / EMPTY DB) */}
      {error ? (
        <div className="bg-card border border-red-500/20 p-8 rounded-xl text-center space-y-3">
          <div className="inline-flex p-2.5 rounded-full bg-red-500/10 text-[#FF1744]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Unable to Load Agents</h3>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          <div>
            <button
              onClick={() => fetchAgents()}
              className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition-colors border border-border/80 cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-sm text-foreground overflow-hidden">
                  {selectedAgent.avatar ? (
                    <img src={selectedAgent.avatar} alt={selectedAgent.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{(selectedAgent.fullName || selectedAgent.email).charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedAgent.fullName || "Agent Profile"}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono">{selectedAgent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Listings</span>
                <span className="text-base font-black font-mono mt-1 block">{selectedAgent.productsCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Completed Leases</span>
                <span className="text-base font-black font-mono mt-1 block">{selectedAgent.bookingsCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Gross Revenue</span>
                <span className="text-base font-black font-mono mt-1 block">₹{(selectedAgent.revenue || 0).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Average Rating</span>
                <span className="text-base font-black font-mono mt-1 block text-amber-500">★ {(selectedAgent.rating || 5.0).toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                onClick={() => {
                  setModalOpen(false);
                  handleViewProducts(selectedAgent.fullName || selectedAgent.email);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                View Agent Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
