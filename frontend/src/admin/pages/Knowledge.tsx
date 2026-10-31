import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Lightbulb,
  AlertTriangle,
  Database,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit3,
  CheckSquare,
  XSquare,
  UploadCloud,
  DownloadCloud,
  History,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText,
  HelpCircle,
  Tag,
  ArrowRight,
  X,
  ExternalLink,
} from "lucide-react";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { StatsCard } from "../components/layout/StatsCard";
import { Modal } from "../components/layout/Modal";
import {
  KnowledgeEntry,
  KnowledgeVersion,
  KnowledgeDraft,
  KnowledgeStats,
  IndexHealth,
  getKnowledgeStats,
  listKnowledgeEntries,
  getKnowledgeEntry,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  verifyKnowledgeEntry,
  revokeKnowledgeVerification,
  publishKnowledgeEntry,
  unpublishKnowledgeEntry,
  getKnowledgeVersionHistory,
  rollbackKnowledgeVersion,
  listKnowledgeDrafts,
  approveKnowledgeDraft,
  rejectKnowledgeDraft,
  requestChangesKnowledgeDraft,
  getIndexStatus,
  refreshIndexManual,
} from "../services/knowledge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Markdown preview component
function MarkdownPreview({ content }: { content: string }) {
  const hasVerifyMarker = /\[VERIFY(?:\s+IN\s+PAYENT)?\]/i.test(content);
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-xs leading-relaxed text-[#F5F5F5] font-sans">
      {hasVerifyMarker && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Policy Placeholder:</strong> Contains <code>[VERIFY IN PAYENT]</code>. Must be replaced before publication.
          </span>
        </div>
      )}
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1.5" />;
        if (line.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-sm text-[#F5F5F5] mt-2">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={idx} className="font-bold text-base text-[#F5F5F5] mt-3">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={idx} className="font-bold text-lg text-[#F5F5F5] mt-3">
              {line.slice(2)}
            </h2>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[#A1A1AA]">•</span>
              <span>{renderInlineMarkdown(line.slice(2))}</span>
            </div>
          );
        }
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[#A1A1AA] font-mono text-[10px]">{numMatch[1]}.</span>
              <span>{renderInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Bold **bold**
  const parts = text.split(/(\*\*[^*]+\*\*|\[VERIFY(?:\s+IN\s+PAYENT)?\])/gi);
  return parts.map((part, pIdx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={pIdx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^\[VERIFY(?:\s+IN\s+PAYENT)?\]$/i.test(part)) {
      return (
        <span
          key={pIdx}
          className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/40"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState<"articles" | "drafts" | "index">("articles");

  // Stats state
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Articles table state
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [retrievalTypeFilter, setRetrievalTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const itemsPerPage = 10;

  // Drafts state
  const [drafts, setDrafts] = useState<KnowledgeDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState("pending_review");
  const [draftsPage, setDraftsPage] = useState(1);
  const [totalDrafts, setTotalDrafts] = useState(0);

  // Index health state
  const [indexHealth, setIndexHealth] = useState<IndexHealth | null>(null);
  const [indexRefreshing, setIndexRefreshing] = useState(false);

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [formCategory, setFormCategory] = useState("GENERAL");
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formRetrievalType, setFormRetrievalType] = useState("GUIDE");
  const [formSynonyms, setFormSynonyms] = useState("");
  const [formChangeReason, setFormChangeReason] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  // Version history modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<KnowledgeEntry | null>(null);
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Draft review modal state
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<KnowledgeDraft | null>(null);
  const [draftCategory, setDraftCategory] = useState("GENERAL");
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftRetrievalType, setDraftRetrievalType] = useState("GUIDE");
  const [draftSynonyms, setDraftSynonyms] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [processingDraft, setProcessingDraft] = useState(false);

  // 1. Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getKnowledgeStats();
      setStats(data);
    } catch {
      toast.error("Failed to fetch knowledge statistics.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 2. Fetch Articles
  const loadEntries = useCallback(async () => {
    try {
      setEntriesLoading(true);
      const res = await listKnowledgeEntries({
        query: search || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        is_verified:
          verificationFilter === "verified"
            ? true
            : verificationFilter === "unverified"
            ? false
            : undefined,
        retrieval_type: retrievalTypeFilter !== "all" ? retrievalTypeFilter : undefined,
        page: currentPage,
        per_page: itemsPerPage,
      });
      setEntries(res.items || []);
      setTotalEntries(res.total || 0);
    } catch {
      toast.error("Failed to load knowledge entries.");
    } finally {
      setEntriesLoading(false);
    }
  }, [
    search,
    categoryFilter,
    statusFilter,
    verificationFilter,
    retrievalTypeFilter,
    currentPage,
  ]);

  // 3. Fetch Drafts
  const loadDrafts = useCallback(async () => {
    try {
      setDraftsLoading(true);
      const res = await listKnowledgeDrafts({
        status: draftStatusFilter !== "all" ? draftStatusFilter : undefined,
        page: draftsPage,
        per_page: itemsPerPage,
      });
      setDrafts(res.items || []);
      setTotalDrafts(res.total || 0);
    } catch {
      toast.error("Failed to load draft suggestions.");
    } finally {
      setDraftsLoading(false);
    }
  }, [draftStatusFilter, draftsPage]);

  // 4. Fetch Index Health
  const loadIndexHealth = useCallback(async () => {
    try {
      const res = await getIndexStatus();
      if (res.success) {
        setIndexHealth(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadIndexHealth();
  }, [loadStats, loadIndexHealth]);

  useEffect(() => {
    if (activeTab === "articles") {
      loadEntries();
    } else if (activeTab === "drafts") {
      loadDrafts();
    } else if (activeTab === "index") {
      loadIndexHealth();
    }
  }, [activeTab, loadEntries, loadDrafts, loadIndexHealth]);

  // Handle Create / Edit Open
  const handleOpenEditor = (entry?: KnowledgeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormCategory(entry.category);
      setFormQuestion(entry.canonical_question);
      setFormAnswer(entry.answer_markdown);
      setFormRetrievalType(entry.retrieval_type);
      setFormSynonyms(entry.synonyms ? entry.synonyms.join(", ") : "");
      setFormChangeReason("");
    } else {
      setEditingEntry(null);
      setFormCategory("GENERAL");
      setFormQuestion("");
      setFormAnswer("");
      setFormRetrievalType("GUIDE");
      setFormSynonyms("");
      setFormChangeReason("");
    }
    setEditorOpen(true);
  };

  // Save Entry Form
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.error("Question and Answer are required.");
      return;
    }

    const parsedSynonyms = formSynonyms
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setSavingEntry(true);
      if (editingEntry) {
        await updateKnowledgeEntry(editingEntry.id, {
          category: formCategory,
          canonical_question: formQuestion.trim(),
          answer_markdown: formAnswer.trim(),
          retrieval_type: formRetrievalType,
          synonyms: parsedSynonyms,
          change_reason: formChangeReason.trim() || "Admin update",
        });
        toast.success(`Updated "${editingEntry.id}" (new version created)`);
      } else {
        await createKnowledgeEntry({
          category: formCategory,
          canonical_question: formQuestion.trim(),
          answer_markdown: formAnswer.trim(),
          retrieval_type: formRetrievalType,
          synonyms: parsedSynonyms,
        });
        toast.success("Created new knowledge entry in pending review");
      }
      setEditorOpen(false);
      loadEntries();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save knowledge entry.");
    } finally {
      setSavingEntry(false);
    }
  };

  // Verify Entry
  const handleVerify = async (entry: KnowledgeEntry) => {
    if (/\[VERIFY(?:\s+IN\s+PAYENT)?\]/i.test(entry.answer_markdown)) {
      toast.error("Cannot verify: Entry contains [VERIFY IN PAYENT] placeholder.");
      return;
    }
    try {
      await verifyKnowledgeEntry(entry.id, "Verified by admin");
      toast.success(`Entry "${entry.id}" verified!`);
      loadEntries();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to verify entry.");
    }
  };

  // Revoke Verification
  const handleRevoke = async (entry: KnowledgeEntry) => {
    try {
      await revokeKnowledgeVerification(entry.id, "Admin revoked verification");
      toast.info(`Verification revoked for "${entry.id}". Entry set to pending review.`);
      loadEntries();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to revoke verification.");
    }
  };

  // Publish Entry
  const handlePublish = async (entry: KnowledgeEntry) => {
    if (!entry.is_verified) {
      toast.error("Cannot publish: Entry must be explicitly verified first.");
      return;
    }
    if (/\[VERIFY(?:\s+IN\s+PAYENT)?\]/i.test(entry.answer_markdown)) {
      toast.error("Cannot publish: Entry contains [VERIFY IN PAYENT] placeholder.");
      return;
    }
    try {
      await publishKnowledgeEntry(entry.id);
      toast.success(`Published "${entry.id}" to live agent retrieval!`);
      loadEntries();
      loadStats();
      loadIndexHealth();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to publish entry.");
    }
  };

  // Unpublish Entry
  const handleUnpublish = async (entry: KnowledgeEntry) => {
    try {
      await unpublishKnowledgeEntry(entry.id, "Unpublished by admin");
      toast.info(`Unpublished "${entry.id}" and removed from live index.`);
      loadEntries();
      loadStats();
      loadIndexHealth();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to unpublish entry.");
    }
  };

  // Open Version History
  const handleOpenHistory = async (entry: KnowledgeEntry) => {
    setHistoryEntry(entry);
    setHistoryOpen(true);
    try {
      setLoadingVersions(true);
      const res = await getKnowledgeVersionHistory(entry.id);
      setVersions(res.data || []);
    } catch {
      toast.error("Failed to load version history.");
    } finally {
      setLoadingVersions(false);
    }
  };

  // Rollback Version
  const handleRollback = async (version: number) => {
    if (!historyEntry) return;
    if (!confirm(`Are you sure you want to rollback "${historyEntry.id}" to version ${version}? A new version will be created.`)) {
      return;
    }
    try {
      setRollingBack(true);
      await rollbackKnowledgeVersion(historyEntry.id, version, `Rollback to version ${version}`);
      toast.success(`Rolled back "${historyEntry.id}" to version ${version}!`);
      setHistoryOpen(false);
      loadEntries();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to rollback.");
    } finally {
      setRollingBack(false);
    }
  };

  // Open Draft Modal
  const handleOpenDraftReview = (draft: KnowledgeDraft) => {
    setSelectedDraft(draft);
    setDraftCategory(draft.category || "GENERAL");
    setDraftQuestion(draft.customer_query || "");
    setDraftAnswer(draft.suggested_answer || "");
    setDraftRetrievalType(draft.suggested_retrieval_type || "GUIDE");
    setDraftSynonyms("");
    setRejectReason("");
    setChangeNotes("");
    setDraftModalOpen(true);
  };

  // Approve Draft
  const handleApproveDraft = async () => {
    if (!selectedDraft) return;
    try {
      setProcessingDraft(true);
      await approveKnowledgeDraft(selectedDraft.id, {
        category: draftCategory,
        canonical_question: draftQuestion.trim(),
        answer_markdown: draftAnswer.trim(),
        retrieval_type: draftRetrievalType,
        synonyms: draftSynonyms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("Draft approved and converted to pending_review knowledge entry!");
      setDraftModalOpen(false);
      loadDrafts();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to approve draft.");
    } finally {
      setProcessingDraft(false);
    }
  };

  // Reject Draft
  const handleRejectDraft = async () => {
    if (!selectedDraft || !rejectReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    try {
      setProcessingDraft(true);
      await rejectKnowledgeDraft(selectedDraft.id, rejectReason.trim());
      toast.info("Draft rejected.");
      setDraftModalOpen(false);
      loadDrafts();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to reject draft.");
    } finally {
      setProcessingDraft(false);
    }
  };

  // Request Changes on Draft
  const handleRequestChanges = async () => {
    if (!selectedDraft || !changeNotes.trim()) {
      toast.error("Change notes are required.");
      return;
    }
    try {
      setProcessingDraft(true);
      await requestChangesKnowledgeDraft(selectedDraft.id, changeNotes.trim());
      toast.info("Changes requested on draft.");
      setDraftModalOpen(false);
      loadDrafts();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to request changes.");
    } finally {
      setProcessingDraft(false);
    }
  };

  // Rebuild Retrieval Index
  const handleRebuildIndex = async () => {
    try {
      setIndexRefreshing(true);
      const res = await refreshIndexManual();
      toast.success(res.message || "Index refreshed successfully!");
      setIndexHealth(res.data);
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to refresh index.");
    } finally {
      setIndexRefreshing(false);
    }
  };

  // Table Columns Definition
  const columns: Column<KnowledgeEntry>[] = [
    {
      key: "id",
      label: "Entry",
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-mono text-xs font-bold text-[#F5F5F5]">{row.id}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#171C23] text-[#A1A1AA] border border-[rgba(161,161,170,0.18)]">
              {row.category}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">v{row.version}</span>
          </div>
        </div>
      ),
    },
    {
      key: "canonical_question",
      label: "Canonical Question & Answers",
      render: (row) => {
        const hasMarker = row.has_verify_marker || /\[VERIFY(?:\s+IN\s+PAYENT)?\]/i.test(row.answer_markdown);
        return (
          <div className="space-y-1 max-w-md">
            <p className="text-xs font-semibold text-[#F5F5F5] line-clamp-1">{row.canonical_question}</p>
            <p className="text-[11px] text-[#A1A1AA] line-clamp-2">{row.answer_markdown}</p>
            {hasMarker && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                <AlertTriangle className="h-3 w-3" />
                [VERIFY IN PAYENT]
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "retrieval_type",
      label: "Type",
      render: (row) => (
        <span
          className={cn(
            "text-[10px] font-mono font-medium px-2 py-0.5 rounded border uppercase",
            row.retrieval_type === "GUIDE"
              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
              : row.retrieval_type === "LIVE_DB"
              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          )}
        >
          {row.retrieval_type}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status & Verified",
      render: (row) => (
        <div className="space-y-1">
          <div>
            <span
              className={cn(
                "text-[10px] font-mono font-medium px-2 py-0.5 rounded border uppercase",
                row.status === "published"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : row.status === "pending_review"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
              )}
            >
              {row.status}
            </span>
          </div>
          <div>
            {row.is_verified ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                <AlertTriangle className="h-3 w-3" /> Unverified
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Edit */}
          <button
            onClick={() => handleOpenEditor(row)}
            title="Edit Entry"
            className="p-1.5 rounded-lg bg-[#171C23] hover:bg-neutral-800 text-[#F5F5F5] border border-[rgba(161,161,170,0.18)] transition-colors cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          {/* Verification toggle */}
          {row.is_verified ? (
            <button
              onClick={() => handleRevoke(row)}
              title="Revoke Verification"
              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <XSquare className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleVerify(row)}
              title="Verify Entry"
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Publish / Unpublish */}
          {row.status === "published" ? (
            <button
              onClick={() => handleUnpublish(row)}
              title="Unpublish (Remove from Live)"
              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <DownloadCloud className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handlePublish(row)}
              title="Publish to Live Retrieval"
              disabled={!row.is_verified}
              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UploadCloud className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Version History */}
          <button
            onClick={() => handleOpenHistory(row)}
            title="Version History & Rollback"
            className="p-1.5 rounded-lg bg-[#171C23] hover:bg-neutral-800 text-[#A1A1AA] hover:text-[#F5F5F5] border border-[rgba(161,161,170,0.18)] transition-colors cursor-pointer"
          >
            <History className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            Agent Knowledge & Retrieval Manager
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Deterministic Q&A knowledge base, editorial approval lifecycle, and in-memory TF-IDF index
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEditor()}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Knowledge Entry</span>
          </button>
          <button
            onClick={() => {
              loadStats();
              loadEntries();
              loadIndexHealth();
            }}
            className="p-2 rounded-lg bg-[#10151B] hover:bg-[#171C23] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[rgba(161,161,170,0.18)] transition-colors cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard
          title="Total Entries"
          value={stats?.total ?? 0}
          icon={BookOpen}
          loading={statsLoading}
        />
        <StatsCard
          title="Published Live"
          value={stats?.published ?? 0}
          icon={CheckCircle2}
          subtext="In active TF-IDF index"
          loading={statsLoading}
        />
        <StatsCard
          title="Pending Review"
          value={stats?.pending_review ?? 0}
          icon={Clock}
          loading={statsLoading}
        />
        <StatsCard
          title="Draft Suggestions"
          value={stats?.draft_suggestions ?? 0}
          icon={Lightbulb}
          subtext="From support tickets"
          loading={statsLoading}
        />
        <StatsCard
          title="Needs Policy Verification"
          value={stats?.needs_verification ?? 0}
          icon={AlertTriangle}
          subtext="Has [VERIFY IN PAYENT]"
          loading={statsLoading}
        />
        <StatsCard
          title="Retrieval Index"
          value={indexHealth?.total_indexed ?? stats?.index_status?.total_indexed ?? 0}
          icon={Database}
          subtext={indexHealth?.status?.toUpperCase() ?? "READY"}
          loading={statsLoading}
        />
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[rgba(161,161,170,0.18)] gap-2">
        <button
          onClick={() => setActiveTab("articles")}
          className={cn(
            "pb-3 px-4 text-xs font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer",
            activeTab === "articles"
              ? "border-emerald-400 text-[#F5F5F5]"
              : "border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]"
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Knowledge Base ({totalEntries})</span>
        </button>
        <button
          onClick={() => setActiveTab("drafts")}
          className={cn(
            "pb-3 px-4 text-xs font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer",
            activeTab === "drafts"
              ? "border-emerald-400 text-[#F5F5F5]"
              : "border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]"
          )}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          <span>Draft Suggestions ({stats?.draft_suggestions ?? 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("index")}
          className={cn(
            "pb-3 px-4 text-xs font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer",
            activeTab === "index"
              ? "border-emerald-400 text-[#F5F5F5]"
              : "border-transparent text-[#A1A1AA] hover:text-[#F5F5F5]"
          )}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Search Index & Health</span>
        </button>
      </div>

      {/* TAB 1: ARTICLES */}
      {activeTab === "articles" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#10151B] p-3 rounded-xl border border-[rgba(161,161,170,0.18)]">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Search question, answer, or synonyms..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs cursor-pointer font-medium"
            >
              <option value="all">All Categories</option>
              <option value="BOOKING">BOOKING</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="CANCELLATION">CANCELLATION</option>
              <option value="REFUND">REFUND</option>
              <option value="KYC">KYC</option>
              <option value="DELIVERY">DELIVERY</option>
              <option value="ACCOUNT">ACCOUNT</option>
              <option value="SECURITY">SECURITY</option>
              <option value="DISPUTE">DISPUTE</option>
              <option value="PLATFORM">PLATFORM</option>
              <option value="COMPLIANCE">COMPLIANCE</option>
              <option value="GENERAL">GENERAL</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="pending_review">Pending Review</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Verification filter */}
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs cursor-pointer font-medium"
            >
              <option value="all">All Verification</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Needs Verification</option>
            </select>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            data={entries}
            loading={entriesLoading}
            emptyTitle="No knowledge entries found"
            emptyDescription="Try adjusting your search criteria or create a new entry."
          />

          <Pagination
            currentPage={currentPage}
            totalItems={totalEntries}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* TAB 2: DRAFT SUGGESTIONS */}
      {activeTab === "drafts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#10151B] p-3 rounded-xl border border-[rgba(161,161,170,0.18)]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#A1A1AA]">Status:</span>
              <select
                value={draftStatusFilter}
                onChange={(e) => {
                  setDraftStatusFilter(e.target.value);
                  setDraftsPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs cursor-pointer"
              >
                <option value="all">All Drafts</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button
              onClick={loadDrafts}
              className="p-1.5 rounded-lg bg-[#050709] hover:bg-neutral-800 text-[#A1A1AA] border border-[rgba(161,161,170,0.18)]"
              title="Refresh Drafts"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {draftsLoading ? (
            <div className="py-16 text-center text-xs text-[#A1A1AA]">Loading draft suggestions...</div>
          ) : drafts.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#A1A1AA] bg-[#10151B] rounded-xl border border-[rgba(161,161,170,0.18)]">
              No draft suggestions found. Resolved support tickets with helpful answers can be suggested as knowledge articles.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#F5F5F5]">{d.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171C23] text-[#A1A1AA] border border-[rgba(161,161,170,0.18)]">
                        {d.category || "GENERAL"}
                      </span>
                      {d.source_ticket_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          From Ticket #{d.source_ticket_id}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-mono font-medium px-2 py-0.5 rounded border uppercase",
                        d.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : d.status === "pending_review"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      )}
                    >
                      {d.status}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#F5F5F5]">
                      <span className="text-[#A1A1AA]">Customer Query:</span> {d.customer_query}
                    </p>
                    <p className="text-xs text-[#A1A1AA] bg-[#050709] p-3 rounded-lg border border-[rgba(161,161,170,0.1)] leading-relaxed">
                      {d.suggested_answer}
                    </p>
                  </div>

                  {d.similarity_score !== undefined && d.similarity_score > 0.5 && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>
                        Potential duplicate match score: <strong>{Math.round(d.similarity_score * 100)}%</strong>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(161,161,170,0.1)]">
                    <span className="text-[10px] font-mono text-[#A1A1AA]">
                      Created: {new Date(d.created_at).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleOpenDraftReview(d)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Review & Approve</span>
                    </button>
                  </div>
                </div>
              ))}

              <Pagination
                currentPage={draftsPage}
                totalItems={totalDrafts}
                itemsPerPage={itemsPerPage}
                onPageChange={setDraftsPage}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INDEX & HEALTH */}
      {activeTab === "index" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#10151B] border border-[rgba(161,161,170,0.18)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-400" />
                  Pure-Python TF-IDF Retrieval Index Status
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  The in-memory retrieval index powers deterministic sub-second customer query answering.
                </p>
              </div>

              <span
                className={cn(
                  "text-xs font-mono font-bold px-3 py-1 rounded-full border uppercase",
                  indexHealth?.status === "healthy"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                )}
              >
                ● {indexHealth?.status || "UNKNOWN"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#050709] border border-[rgba(161,161,170,0.1)]">
                <span className="text-xs text-[#A1A1AA]">Active Indexed Documents</span>
                <p className="text-xl font-bold font-mono text-[#F5F5F5] mt-1">
                  {indexHealth?.total_indexed ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Only verified & published entries</p>
              </div>

              <div className="p-4 rounded-xl bg-[#050709] border border-[rgba(161,161,170,0.1)]">
                <span className="text-xs text-[#A1A1AA]">Loaded Synonyms</span>
                <p className="text-xl font-bold font-mono text-[#F5F5F5] mt-1">
                  {indexHealth?.synonym_count ?? indexHealth?.in_memory_synonyms_loaded ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Including Telugu transliterations</p>
              </div>

              <div className="p-4 rounded-xl bg-[#050709] border border-[rgba(161,161,170,0.1)]">
                <span className="text-xs text-[#A1A1AA]">Last Rebuilt</span>
                <p className="text-sm font-semibold font-mono text-[#F5F5F5] mt-2 truncate">
                  {indexHealth?.last_refresh ? new Date(indexHealth.last_refresh).toLocaleString() : "System Startup"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Atomic memory swap</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[rgba(161,161,170,0.1)] flex items-center justify-between">
              <div className="text-xs text-[#A1A1AA]">
                Rebuilding refreshes the TF-IDF matrix from all published knowledge entries in TiDB.
              </div>
              <button
                onClick={handleRebuildIndex}
                disabled={indexRefreshing}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", indexRefreshing && "animate-spin")} />
                <span>{indexRefreshing ? "Rebuilding Index..." : "Rebuild Retrieval Index Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ENTRY EDITOR (CREATE / EDIT) */}
      <Modal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingEntry ? `Edit Entry: ${editingEntry.id}` : "Create New Knowledge Entry"}
        size="xl"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-medium"
              >
                <option value="BOOKING">BOOKING</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="CANCELLATION">CANCELLATION</option>
                <option value="REFUND">REFUND</option>
                <option value="KYC">KYC</option>
                <option value="DELIVERY">DELIVERY</option>
                <option value="ACCOUNT">ACCOUNT</option>
                <option value="SECURITY">SECURITY</option>
                <option value="DISPUTE">DISPUTE</option>
                <option value="PLATFORM">PLATFORM</option>
                <option value="COMPLIANCE">COMPLIANCE</option>
                <option value="GENERAL">GENERAL</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Retrieval Type</label>
              <select
                value={formRetrievalType}
                onChange={(e) => setFormRetrievalType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-medium"
              >
                <option value="GUIDE">GUIDE (Static knowledge base)</option>
                <option value="LIVE_DB">LIVE_DB (Account/Order lookup)</option>
                <option value="HYBRID">HYBRID (Static policy + user order context)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Canonical Question</label>
            <input
              type="text"
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              placeholder="e.g., How do I cancel a booking and what is the refund fee?"
              className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-medium focus:outline-none focus:border-emerald-400"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">
              Alternative Questions & Synonyms (Comma separated)
            </label>
            <input
              type="text"
              value={formSynonyms}
              onChange={(e) => setFormSynonyms(e.target.value)}
              placeholder="e.g. cancel order, refund policy, raddhu cheyatam ela, booking raddhu"
              className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-medium focus:outline-none focus:border-emerald-400"
            />
            <p className="text-[10px] text-[#A1A1AA] mt-1">Supports Telugu-English transliterated phrasings.</p>
          </div>

          {/* Answer Markdown + Realtime Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">
                Answer Markdown
              </label>
              <textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                placeholder="Enter markdown formatted response..."
                rows={10}
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-mono focus:outline-none focus:border-emerald-400 leading-relaxed"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Live Markdown Preview</label>
              <div className="p-3 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] h-[225px] overflow-y-auto">
                {formAnswer.trim() ? (
                  <MarkdownPreview content={formAnswer} />
                ) : (
                  <span className="text-xs text-[#A1A1AA]">Markdown preview will render here...</span>
                )}
              </div>
            </div>
          </div>

          {editingEntry && (
            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">
                Audit Change Reason (Stored in version history)
              </label>
              <input
                type="text"
                value={formChangeReason}
                onChange={(e) => setFormChangeReason(e.target.value)}
                placeholder="Explain the reason for this edit..."
                className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-medium focus:outline-none focus:border-emerald-400"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[rgba(161,161,170,0.1)]">
            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="px-4 py-2 rounded-lg bg-[#171C23] hover:bg-[#171C23]/80 text-[#F5F5F5] text-xs font-medium transition-colors border border-[rgba(161,161,170,0.18)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEntry}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingEntry ? "Saving..." : editingEntry ? "Save Changes (v" + (editingEntry.version + 1) + ")" : "Submit for Review"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VERSION HISTORY & ROLLBACK */}
      <Modal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Version History: ${historyEntry?.id}`}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="text-xs text-[#A1A1AA]">
            Immutable audit record of all previous revisions. Rolling back creates a new forward version preserving full history.
          </div>

          {loadingVersions ? (
            <div className="py-12 text-center text-xs text-[#A1A1AA]">Loading revision history...</div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#A1A1AA]">No historical revisions found.</div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {versions.map((v) => {
                const isCurrent = historyEntry && historyEntry.version === v.version;
                return (
                  <div
                    key={v.id}
                    className={cn(
                      "p-4 rounded-xl border space-y-2",
                      isCurrent
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-[#050709] border-[rgba(161,161,170,0.18)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#F5F5F5]">Version {v.version}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Current Active
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#A1A1AA]">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleRollback(v.version)}
                          disabled={rollingBack}
                          className="px-2.5 py-1 rounded bg-[#171C23] hover:bg-neutral-800 text-[#F5F5F5] border border-[rgba(161,161,170,0.18)] text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Rollback to this</span>
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-[#F5F5F5] font-medium">{v.canonical_question}</div>
                    <div className="text-[11px] text-[#A1A1AA] line-clamp-2">{v.answer_markdown}</div>

                    <div className="text-[10px] font-mono text-[#A1A1AA] flex items-center gap-3 pt-1 border-t border-[rgba(161,161,170,0.1)]">
                      <span>Changed By: {v.changed_by || "System"}</span>
                      {v.change_reason && <span>Reason: {v.change_reason}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 3: DRAFT REVIEW & APPROVAL */}
      <Modal
        isOpen={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        title={`Review Draft Suggestion: ${selectedDraft?.id}`}
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] space-y-1">
            <span className="text-[11px] font-semibold text-[#A1A1AA]">Customer Query (Source):</span>
            <p className="text-xs text-[#F5F5F5] font-medium">{selectedDraft?.customer_query}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Category</label>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs"
              >
                <option value="BOOKING">BOOKING</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="CANCELLATION">CANCELLATION</option>
                <option value="REFUND">REFUND</option>
                <option value="KYC">KYC</option>
                <option value="DELIVERY">DELIVERY</option>
                <option value="ACCOUNT">ACCOUNT</option>
                <option value="SECURITY">SECURITY</option>
                <option value="DISPUTE">DISPUTE</option>
                <option value="PLATFORM">PLATFORM</option>
                <option value="COMPLIANCE">COMPLIANCE</option>
                <option value="GENERAL">GENERAL</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Retrieval Type</label>
              <select
                value={draftRetrievalType}
                onChange={(e) => setDraftRetrievalType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs"
              >
                <option value="GUIDE">GUIDE</option>
                <option value="LIVE_DB">LIVE_DB</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Canonical Question</label>
            <input
              type="text"
              value={draftQuestion}
              onChange={(e) => setDraftQuestion(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Suggested Answer</label>
            <textarea
              value={draftAnswer}
              onChange={(e) => setDraftAnswer(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] mb-1 block">Synonyms</label>
            <input
              type="text"
              value={draftSynonyms}
              onChange={(e) => setDraftSynonyms(e.target.value)}
              placeholder="Comma-separated synonyms..."
              className="w-full px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <input
                type="text"
                placeholder="Reason to reject..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Notes to request changes..."
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#050709] border border-[rgba(161,161,170,0.18)] text-[#F5F5F5] text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[rgba(161,161,170,0.1)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRejectDraft}
                disabled={processingDraft || !rejectReason.trim()}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Reject Draft
              </button>
              <button
                type="button"
                onClick={handleRequestChanges}
                disabled={processingDraft || !changeNotes.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Request Changes
              </button>
            </div>

            <button
              type="button"
              onClick={handleApproveDraft}
              disabled={processingDraft || !draftQuestion.trim() || !draftAnswer.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {processingDraft ? "Approving..." : "Approve & Convert to Knowledge Entry"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
