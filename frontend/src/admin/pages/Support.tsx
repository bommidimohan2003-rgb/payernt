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
  BookOpen,
} from "lucide-react";
import { notificationsService } from "../services/notifications";
import { suggestKnowledgeFromTicket } from "../services/knowledge";
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
  const [suggestingKnowledge, setSuggestingKnowledge] = useState(false);

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await notificationsService.getSupportTickets();
      setTickets(data);

      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const targetId = urlParams?.get("id") || urlParams?.get("ticket");

      if (data.length > 0) {
        if (targetId) {
          const match = data.find((t) => t.id === targetId);
          setSelectedTicket(match || data[0]);
        } else if (!selectedTicket) {
          setSelectedTicket(data[0]);
        }
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

  const handleSuggestKnowledge = async () => {
    if (!selectedTicket) return;
    try {
      setSuggestingKnowledge(true);
      const res = await suggestKnowledgeFromTicket(selectedTicket.id);
      toast.success(res.message || "Draft suggested for knowledge base review!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create draft suggestion.");
    } finally {
      setSuggestingKnowledge(false);
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

  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.userName && t.userName.toLowerCase().includes(q)) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.originalInquiry && t.originalInquiry.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => (t.priority || "").toLowerCase() === priorityFilter.toLowerCase());
    }

    return result;
  }, [tickets, search, statusFilter, priorityFilter]);

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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
            Support
          </h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5 font-medium">
            Manage user support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] hover:bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-[var(--admin-text-muted)]", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>


        </div>
      </div>

      {/* TABS (Panel 12): All Tickets | Open | In Progress | Resolved */}
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-2 overflow-x-auto no-scrollbar">
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
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
              statusFilter === tab.id
                ? "bg-[var(--admin-accent)] text-[var(--admin-bg)] font-semibold shadow-xs"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-elevated)] border border-transparent"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[11px] font-mono",
                statusFilter === tab.id ? "bg-white/20 dark:bg-black/15 text-[var(--admin-bg)] font-medium" : "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)]"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--admin-card)] p-3 rounded-xl border border-[var(--admin-border)]">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
          <input
            type="text"
            placeholder="Search tickets by user or subject"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg pl-9 pr-3 py-2 border border-[var(--admin-border)] focus:outline-none focus:border-[var(--admin-text)]/40 font-medium placeholder:text-[var(--admin-text-muted)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-2 border border-[var(--admin-border)] focus:outline-none font-medium cursor-pointer"
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
        <div className="bg-[var(--admin-card)] rounded-xl border border-red-500/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">Database Sync Failed</h3>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1 max-w-sm">{error}</p>
          </div>
          <button
            onClick={() => fetchTickets()}
            className="px-4 py-2 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)]/80 text-[var(--admin-text)] text-xs font-medium transition-colors border border-[var(--admin-border)] cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      )}

      {/* TICKETS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* TICKET LIST PANEL (TABLE/CARDS) */}
        <div className="bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] overflow-hidden flex flex-col h-[40rem]">
          <div className="p-3 border-b border-[var(--admin-border)] bg-[var(--admin-sidebar)] flex items-center justify-between text-xs font-bold text-[var(--admin-text)]">
            <span>Ticket Queue ({filteredTickets.length})</span>
            <span className="text-[11px] font-mono text-[var(--admin-text-muted)]">Real-time Sync</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[rgba(161,161,170,0.1)]">
            {filteredTickets.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--admin-text-muted)]">
                No tickets match criteria.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const firstMsg = t.messages && t.messages.length > 0 ? t.messages[0] : null;
                const preview =
                  t.originalInquiry ||
                  firstMsg?.originalInquiry ||
                  (firstMsg?.message || firstMsg?.content || t.description || "")
                    .split("\n")[0]
                    .replace(/^Original user inquiry:\s*/i, "")
                    .trim();
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={cn(
                      "p-3.5 cursor-pointer transition-colors text-xs space-y-1.5 relative",
                      isSelected
                        ? "bg-white/[0.04] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-white"
                        : "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--admin-text)] truncate max-w-45">{t.subject}</span>
                      <span
                        className={cn(
                          "text-[11px] font-mono font-medium  px-1.5 py-0.5 rounded border",
                          t.status === "open"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : t.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-[var(--admin-elevated)] text-[var(--admin-text-muted)] border-[var(--admin-border)]"
                        )}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--admin-text-muted)] truncate">
                      {t.userName} ({t.userEmail})
                    </p>

                    {preview && (
                      <p className="text-[11px] text-[#D4D4D8] truncate font-medium">
                        <span className="text-[var(--admin-text-muted)]">Preview: </span>
                        "{preview}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[var(--admin-text-muted)] font-mono">
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
        <div className="lg:col-span-2 bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] flex flex-col h-[40rem] overflow-hidden">
          {selectedTicket ? (
            (() => {
              const firstMsg =
                selectedTicket.messages && selectedTicket.messages.length > 0
                  ? selectedTicket.messages[0]
                  : null;

              const originalInquiryText =
                selectedTicket.originalInquiry ||
                firstMsg?.originalInquiry ||
                (selectedTicket.description && selectedTicket.description.includes("Original user inquiry:")
                  ? selectedTicket.description
                      .split("Original user inquiry:")[1]
                      .split("Escalation reason:")[0]
                      .trim()
                  : selectedTicket.description) ||
                (firstMsg && (firstMsg.message || firstMsg.content || "").includes("Original user inquiry:")
                  ? (firstMsg.message || firstMsg.content || "")
                      .split("Original user inquiry:")[1]
                      .split("Escalation reason:")[0]
                      .trim()
                  : firstMsg?.message || firstMsg?.content || "");

              const contextItems =
                selectedTicket.conversationContext && selectedTicket.conversationContext.length > 0
                  ? selectedTicket.conversationContext
                  : firstMsg?.conversationContext && firstMsg.conversationContext.length > 0
                  ? firstMsg.conversationContext
                  : [];

              return (
                <>
                  {/* Thread Header */}
                  <div className="p-4 border-b border-[var(--admin-border)] bg-[var(--admin-sidebar)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[var(--admin-text)]">{selectedTicket.subject}</h3>
                        <span className="font-mono text-[11px] text-[var(--admin-text-muted)] bg-[var(--admin-elevated)] px-2 py-0.5 rounded border border-[var(--admin-border)]">
                          #{selectedTicket.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)] mt-1 flex-wrap">
                        <span>
                          Requester: <strong className="font-medium text-[var(--admin-text)]">{selectedTicket.userName}</strong>
                        </span>
                        <span>•</span>
                        <span>{selectedTicket.userEmail}</span>
                        <span>•</span>
                        <span>{selectedTicket.category || "General Help"}</span>
                        <span>•</span>
                        <span>Priority: <strong className="text-amber-400">{selectedTicket.priority || "medium"}</strong></span>
                        <span>•</span>
                        <span>{selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : "Recent"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {selectedTicket.status === "resolved" && (
                        <button
                          type="button"
                          onClick={handleSuggestKnowledge}
                          disabled={suggestingKnowledge}
                          title="Suggest this resolved support thread as a draft knowledge article"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{suggestingKnowledge ? "Suggesting..." : "Suggest as Knowledge"}</span>
                        </button>
                      )}
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as AdminSupportTicket["status"])}
                        className="bg-[var(--admin-elevated)] text-[var(--admin-text)] text-xs rounded-lg px-2.5 py-1.5 border border-[var(--admin-border)] font-medium cursor-pointer"
                      >
                        <option value="open">Open</option>
                        <option value="pending">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Dedicated Original Inquiry & Conversation Context Panel */}
                  <div className="p-3 border-b border-[var(--admin-border)] bg-[var(--admin-elevated)]/60 space-y-2.5">
                    {originalInquiryText ? (
                      <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] space-y-1">
                        <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                          <LifeBuoy className="h-3.5 w-3.5" />
                          <span>Original User Inquiry</span>
                        </div>
                        <p className="text-xs text-[var(--admin-text)] font-medium leading-relaxed whitespace-pre-wrap">
                          "{originalInquiryText}"
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)]">
                        Original inquiry description is unavailable for this ticket.
                      </div>
                    )}

                    {contextItems.length > 0 && (
                      <div className="p-3 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] space-y-1.5">
                        <div className="text-[11px] font-mono text-[var(--admin-text-muted)] font-bold">
                          Conversation Context
                        </div>
                        <div className="space-y-1.5 border-l-2 border-[var(--admin-border)] pl-2.5">
                          {contextItems.map((c, idx) => (
                            <div key={idx} className="text-xs space-y-0.5">
                              <span className="font-semibold text-[var(--admin-text-muted)] text-[11px] font-mono">
                                {c.sender}:
                              </span>
                              <p className="text-[var(--admin-text)] whitespace-pre-wrap">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((m) => {
                        const msgContent = m.message || m.content || "";
                        const msgTime = m.createdAt || m.timestamp;
                        const isUserSender = m.sender !== "admin" && m.senderType !== "admin";
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "p-3 rounded-lg max-w-lg space-y-1 leading-relaxed",
                              !isUserSender
                                ? "ml-auto bg-secondary text-foreground font-medium border border-border/70"
                                : "bg-secondary/40 border border-border/50 text-foreground"
                            )}
                          >
                            <div className="flex items-center justify-between text-[11px] font-medium opacity-75">
                              <span>{!isUserSender ? "Support Admin" : selectedTicket.userName}</span>
                              <span>
                                {msgTime
                                  ? new Date(msgTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                  : ""}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">
                              {msgContent || (
                                <span className="text-[var(--admin-text-muted)]">No description content recorded.</span>
                              )}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-[var(--admin-text-muted)]">
                        No replies sent yet in this ticket thread.
                      </div>
                    )}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="p-3 border-t border-[var(--admin-border)] bg-[var(--admin-sidebar)] flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a response to the customer"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--admin-elevated)] border border-[var(--admin-border)] text-[var(--admin-text)] text-xs font-medium focus:outline-none focus:border-[var(--admin-text)]/40 placeholder:text-[var(--admin-text-muted)]"
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !reply.trim()}
                      className="px-3.5 py-2 rounded-lg bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-[var(--admin-bg)] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </>
              );
            })()
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-[var(--admin-text-muted)]">
              Select a ticket to view thread history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
