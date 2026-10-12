import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Shield, RefreshCw, Lock, Terminal, ShieldAlert } from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { notificationsService } from "../services/notifications";
import { AdminActivityLog } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Helper function to sanitize and redact any sensitive strings from audit logs
function sanitizeLogText(text: string): string {
  if (!text) return "";
  return text
    .replace(/(password|secret|jwt|token|apiKey|api_key|key|auth)\s*[:=]\s*["']?[^"'\s,]+["']?/gi, "$1=REDACTED")
    .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, "Bearer REDACTED");
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchLogs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await notificationsService.getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load security audit trail from database.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.userName && l.userName.toLowerCase().includes(q)) ||
          (l.action && l.action.toLowerCase().includes(q)) ||
          (l.module && l.module.toLowerCase().includes(q)) ||
          (l.ipAddress && l.ipAddress.includes(q))
      );
    }

    if (moduleFilter !== "all") {
      result = result.filter((l) => l.module === moduleFilter);
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
  }, [logs, search, moduleFilter, sortKey, sortOrder]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const modules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set);
  }, [logs]);

  const columns: Column<AdminActivityLog>[] = [
    {
      key: "userName",
      label: "Admin",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-[#171C23] border border-[rgba(161,161,170,0.18)] flex items-center justify-center font-bold text-xs text-[#F5F5F5] shrink-0">
            {(row.userName || "A").charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-[#F5F5F5] text-xs">{row.userName || "Admin"}</span>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#171C23] text-[#F5F5F5] border border-[rgba(161,161,170,0.18)]">
          {sanitizeLogText(row.action)}
        </span>
      ),
    },
    {
      key: "module",
      label: "Target",
      render: (row) => (
        <span className="text-xs font-semibold text-[#F5F5F5]">
          {row.module || "System Context"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      label: "Details",
      render: (row) => (
        <span className="font-mono text-xs text-[#A1A1AA]">
          {row.ipAddress ? `IP: ${row.ipAddress}` : "Audit event verified"}
        </span>
      ),
    },
    {
      key: "timestamp",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-[#A1A1AA]">
          {row.timestamp ? new Date(row.timestamp).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Activity Logs
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Track all administrative activities.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(161,161,170,0.18)] bg-[#10151B] hover:bg-[#171C23] text-[#F5F5F5] text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 text-[#A1A1AA]", loading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#10151B] p-3 rounded-xl border border-[rgba(161,161,170,0.18)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search by admin, action or target..."
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
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#050709] text-[#F5F5F5] text-xs rounded-lg px-2.5 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Actions</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-xs text-[#A1A1AA] font-mono">
            <span>Oct 12, 2026</span>
          </div>
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
            onClick={() => fetchLogs()}
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
            data={paginatedLogs}
            loading={loading}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyTitle="No activity logs found"
            emptyDescription="No administrative activity records match your current filter settings."
          />

          {filteredLogs.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
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
