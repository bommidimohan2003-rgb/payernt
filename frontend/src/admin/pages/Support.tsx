import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Send,
  User,
  Shield,
  LifeBuoy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { notificationsService } from "../services/notifications";
import { AdminSupportTicket } from "../services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Support() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);

  // Reply state
  const [reply, setReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await notificationsService.getSupportTickets();
      setTickets(data);

      if (data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (err) {
      console.error(err);
      if (!silent) setError("Support service is not configured or unreachable.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedTicket]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reply.trim()) return;

    try {
      setSubmittingReply(true);
      const updated = await notificationsService.replyToTicket(selectedTicket.id, reply.trim());
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
      setSelectedTicket(updated);
      setReply("");
      toast.success("Response sent to customer.");
    } catch {
      toast.error("Failed to submit support reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (status: AdminSupportTicket["status"]) => {
    if (!selectedTicket) return;

    try {
      const updated = await notificationsService.updateTicketStatus(selectedTicket.id, status);
      setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? updated : t)));
      setSelectedTicket(updated);
      toast.info(`Ticket status updated to ${status}.`);
    } catch {
      toast.error("Failed to modify ticket status.");
    }
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.userName && t.userName.toLowerCase().includes(q)) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    return result;
  }, [tickets, search, statusFilter]);

  const [priorityFilter, setPriorityFilter] = useState("all");

  const tabCounts = useMemo(() => {
    return {
      all: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "pending" || t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
    };
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5]">
            Support
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 font-medium">
            Manage user support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(161,161,170,0.18)] bg-[#10151B] hover:bg-[#171C23] text-[#F5F5F5] text-xs font-medium transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[#A1A1AA]", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              toast.info("Ticket creator initiated.");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* TABS (Panel 12): All Tickets | Open | In Progress | Resolved */}
      <div className="flex items-center gap-2 border-b border-[rgba(161,161,170,0.18)] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All Tickets", count: tabCounts.all },
          { id: "open", label: "Open", count: tabCounts.open },
          { id: "pending", label: "In Progress", count: tabCounts.in_progress },
          { id: "resolved", label: "Resolved", count: tabCounts.resolved },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2",
              statusFilter === tab.id
                ? "bg-white text-black font-semibold shadow-xs"
                : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/5 border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                statusFilter === tab.id ? "bg-black/15 text-black font-bold" : "bg-white/10 text-[#A1A1AA]"
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
            placeholder="Search tickets by user, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050709] text-[#F5F5F5] text-xs rounded-lg pl-9 pr-3 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none focus:border-white/40 font-medium placeholder:text-[#A1A1AA]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#050709] text-[#F5F5F5] text-xs rounded-lg px-2.5 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#050709] text-[#F5F5F5] text-xs rounded-lg px-2.5 py-2 border border-[rgba(161,161,170,0.18)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* ERROR / UNCONFIGURED BANNER */}
      {error && !loading && (
        <div className="bg-[#10151B] rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Database Sync Failed</h3>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchTickets()}
            className="px-4 py-2 rounded-lg bg-[#171C23] hover:bg-[#171C23]/80 text-[#F5F5F5] text-xs font-medium transition-colors border border-[rgba(161,161,170,0.18)] cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      )}

      {/* TICKETS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* TICKET LIST PANEL (TABLE/CARDS) */}
        <div className="bg-[#10151B] rounded-xl border border-[rgba(161,161,170,0.18)] overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-[rgba(161,161,170,0.18)] bg-[#0B1015] flex items-center justify-between text-xs font-bold text-[#F5F5F5]">
            <span>Ticket Queue ({filteredTickets.length})</span>
            <span className="text-[11px] font-mono text-[#A1A1AA]">Real-time Sync</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[rgba(161,161,170,0.1)]">
            {filteredTickets.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#A1A1AA]">
                No tickets match criteria.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={cn(
                      "p-3.5 cursor-pointer transition-colors text-xs space-y-1 relative",
                      isSelected ? "bg-white/[0.04] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-white" : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F5F5F5] truncate max-w-[180px]">{t.subject}</span>
                      <span
                        className={cn(
                          "text-[9px] font-mono font-medium uppercase px-1.5 py-0.2 rounded border",
                          t.status === "open"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : t.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-[#171C23] text-[#A1A1AA] border-[rgba(161,161,170,0.18)]"
                        )}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#A1A1AA] truncate">{t.userName} ({t.userEmail})</p>

                    <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-mono">
                      <span>{t.category || "General"}</span>
                      <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Recent"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TICKET CONVERSATION THREAD */}
        <div className="lg:col-span-2 bg-[#10151B] rounded-xl border border-[rgba(161,161,170,0.18)] flex flex-col h-[650px] overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[rgba(161,161,170,0.18)] bg-[#0B1015] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5]">{selectedTicket.subject}</h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    From: <span className="font-medium text-[#F5F5F5]">{selectedTicket.userName}</span> ({selectedTicket.userEmail})
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as AdminSupportTicket["status"])}
                    className="bg-[#050709] text-[#F5F5F5] text-xs rounded-lg px-2.5 py-1.5 border border-[rgba(161,161,170,0.18)] font-medium uppercase cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="pending">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                  selectedTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "p-3 rounded-lg max-w-lg space-y-1 leading-relaxed",
                        m.sender === "admin"
                          ? "ml-auto bg-secondary text-foreground font-medium border border-border/70"
                          : "bg-secondary/40 border border-border/50 text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] font-medium opacity-75">
                        <span>{m.sender === "admin" ? "Support Admin" : selectedTicket.userName}</span>
                        <span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                      <p>{m.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No replies sent yet in this ticket thread.
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-[rgba(161,161,170,0.18)] bg-[#0B1015] flex gap-2">
                <input
                  type="text"
                  placeholder="Type an official admin response..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-medium focus:outline-none focus:border-white/40 placeholder:text-[#A1A1AA]"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !reply.trim()}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Select a ticket to view thread history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
