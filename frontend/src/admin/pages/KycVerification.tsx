import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ExternalLink,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  FileCheck,
  Building,
  Info,
  Check,
  X,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatsCard } from "../components/layout/StatsCard";
import { Table, Column } from "../components/layout/Table";
import { Pagination } from "../components/layout/Pagination";
import { Modal } from "../components/layout/Modal";
import { Loader } from "../components/layout/Loader";
import { EmptyState } from "../components/layout/EmptyState";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import {
  kycService,
  AdminKycVerification,
  KycStats,
  KycDocumentPayload,
} from "../services/kyc";

const REJECTION_TEMPLATES = [
  "Document photo is blurry, dark, or illegible.",
  "Name on identity document does not match profile registration name.",
  "Document is cropped; all four corners and details must be visible.",
  "Invalid or expired document format.",
  "Incorrect document type submitted for this account type.",
];

const REQUEST_INFO_TEMPLATES = [
  "Please re-upload a clear, high-resolution photo of your document with all four corners visible.",
  "Please provide a document where your full name, photo, and government ID number are clearly readable.",
  "For Payernt vendor accounts, please upload a valid Aadhaar card. Ensure details are not obscured.",
  "For Payrent renter accounts, please upload a valid PAN card with clear signature.",
];

export default function KycVerification() {
  const [verifications, setVerifications] = useState<AdminKycVerification[]>(
    [],
  );
  const [stats, setStats] = useState<KycStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    needs_information: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Detail & Document Preview Modal
  const [selectedVerification, setSelectedVerification] =
    useState<AdminKycVerification | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docPayload, setDocPayload] = useState<KycDocumentPayload | null>(null);

  // Document Viewer Controls (Zoom, Pan, Rotation)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Decision Modals State
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch real applications from backend
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await kycService.getKycList();
      setVerifications(res.verifications || []);
      setStats(
        res.stats || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          needs_information: 0,
        },
      );
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      console.error("Failed to load KYC verifications:", err);
      setError(
        errorObj?.response?.data?.detail ||
          "Failed to load KYC verification applications.",
      );
      toast.error("Failed to load KYC applications from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load document payload securely when viewing details
  const handleOpenDetails = async (item: AdminKycVerification) => {
    setSelectedVerification(item);
    setDocPayload(null);
    setDocError(null);
    setZoomLevel(1);
    setRotationAngle(0);

    try {
      setDocLoading(true);
      const doc = await kycService.getKycDocument(item.id);
      setDocPayload(doc);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      console.warn("Could not load KYC document payload:", err);
      setDocError(
        errorObj?.message || "Failed to load identity document image.",
      );
    } finally {
      setDocLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedVerification(null);
    setDocPayload(null);
    setDocError(null);
    setZoomLevel(1);
    setRotationAngle(0);
  };

  // Zoom / Rotation actions
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotationAngle(0);
  };
  const handleRotate = () => setRotationAngle((r) => (r + 90) % 360);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return verifications
      .filter((item) => {
        // Status filter
        if (statusFilter !== "all") {
          const itemStatus = (item.status || "").toUpperCase();
          if (statusFilter === "PENDING" && itemStatus !== "PENDING")
            return false;
          if (statusFilter === "APPROVED" && itemStatus !== "APPROVED")
            return false;
          if (statusFilter === "REJECTED" && itemStatus !== "REJECTED")
            return false;
          if (
            statusFilter === "NEEDS_INFORMATION" &&
            !["NEEDS_INFORMATION", "NEEDS_INFO"].includes(itemStatus)
          )
            return false;
        }

        // Account type filter
        if (accountTypeFilter !== "all") {
          const accType = (item.account_type || "").toLowerCase();
          if (accountTypeFilter === "payernt") {
            if (!["payernt", "vendor", "lender"].includes(accType))
              return false;
          } else if (accountTypeFilter === "payrent") {
            if (!["payrent", "renter", "customer", "user"].includes(accType))
              return false;
          }
        }

        // Search query (name, email, id, masked number)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const name = (item.applicant_name || "").toLowerCase();
          const email = (item.email || "").toLowerCase();
          const id = (item.id || "").toLowerCase();
          const num = (item.document_number_masked || "").toLowerCase();
          return (
            name.includes(q) ||
            email.includes(q) ||
            id.includes(q) ||
            num.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize PENDING status at the top
        const aPending = (a.status || "").toUpperCase() === "PENDING" ? 1 : 0;
        const bPending = (b.status || "").toUpperCase() === "PENDING" ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;

        // Then sort by submission/creation date descending
        const aTime = new Date(a.submitted_at || a.created_at || 0).getTime();
        const bTime = new Date(b.submitted_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [verifications, statusFilter, accountTypeFilter, searchQuery]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Decision Execution: Approve
  const handleConfirmApprove = async () => {
    if (!selectedVerification) return;
    try {
      setSubmittingAction(true);
      const res = await kycService.reviewKyc(selectedVerification.id, {
        action: "approve",
      });
      toast.success(res.message || "KYC verification approved successfully!");
      setIsApproveOpen(false);
      handleCloseDetails();
      await fetchData(true);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(
        errorObj?.response?.data?.detail ||
          "Failed to approve KYC application.",
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // Decision Execution: Reject
  const handleConfirmReject = async () => {
    if (!selectedVerification) return;
    const cleanReason = actionReason.trim();
    if (!cleanReason) {
      toast.error("Rejection reason is mandatory.");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await kycService.reviewKyc(selectedVerification.id, {
        action: "reject",
        rejection_reason: cleanReason,
        rejectionReason: cleanReason,
      });
      toast.success(res.message || "KYC verification rejected.");
      setIsRejectOpen(false);
      setActionReason("");
      handleCloseDetails();
      await fetchData(true);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(
        errorObj?.response?.data?.detail || "Failed to reject KYC application.",
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // Decision Execution: Request More Info
  const handleConfirmRequestInfo = async () => {
    if (!selectedVerification) return;
    const cleanNotes = actionReason.trim();
    if (!cleanNotes) {
      toast.error("Information request details are mandatory.");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await kycService.reviewKyc(selectedVerification.id, {
        action: "needs_information",
        notes: cleanNotes,
        rejection_reason: cleanNotes,
      });
      toast.success(
        res.message || "Requested additional information from applicant.",
      );
      setIsRequestInfoOpen(false);
      setActionReason("");
      handleCloseDetails();
      await fetchData(true);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(
        errorObj?.response?.data?.detail ||
          "Failed to request additional information.",
      );
    } finally {
      setSubmittingAction(false);
    }
  };

  // Table Column Definitions
  const columns: Column<AdminKycVerification>[] = [
    {
      key: "id",
      label: "Application ID",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground/80 tracking-tight">
          {row.id.slice(0, 14)}...
        </span>
      ),
    },
    {
      key: "applicant",
      label: "Applicant",
      sortable: true,
      render: (row) => {
        const isVendor = ["payernt", "vendor", "lender"].includes(
          (row.account_type || "").toLowerCase(),
        );
        return (
          <div className="flex items-center gap-3">
            <ProfilePhoto
              src={row.applicant_avatar || undefined}
              name={row.applicant_name || row.email}
              size="sm"
            />
            <div className="min-w-0">
              <p className="font-semibold text-xs text-foreground truncate max-w-[160px]">
                {row.applicant_name || "Applicant"}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                  isVendor
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                )}
              >
                {isVendor ? (
                  <Building className="h-2.5 w-2.5" />
                ) : (
                  <User className="h-2.5 w-2.5" />
                )}
                {isVendor ? "Vendor (Payernt)" : "Renter (Payrent)"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      label: "Contact Email",
      render: (row) => (
        <div className="text-xs">
          <span className="text-foreground font-mono">{row.email}</span>
          {row.applicant_phone && (
            <span className="text-[11px] text-muted-foreground block font-mono">
              {row.applicant_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "document",
      label: "Document & Number",
      render: (row) => {
        const isAadhaar = (row.document_type || "").toUpperCase() === "AADHAAR";
        return (
          <div className="text-xs">
            <span className="font-bold text-foreground">
              {isAadhaar ? "Aadhaar Card" : "PAN Card"}
            </span>
            <span className="text-[11px] text-muted-foreground block font-mono">
              {row.document_number_masked || "••••••••"}
            </span>
          </div>
        );
      },
    },
    {
      key: "submitted_at",
      label: "Submitted Date",
      sortable: true,
      render: (row) => {
        const dateStr = row.submitted_at || row.created_at;
        if (!dateStr)
          return <span className="text-muted-foreground text-xs">—</span>;
        const d = new Date(dateStr);
        return (
          <div className="text-xs">
            <span className="text-foreground">{d.toLocaleDateString()}</span>
            <span className="text-[10px] text-muted-foreground block font-mono">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "KYC Status",
      sortable: true,
      render: (row) => {
        const st = (row.status || "").toUpperCase();
        let badgeStyle = "bg-secondary text-muted-foreground border-border";
        let icon = <Clock className="h-3 w-3" />;
        let label = st;

        if (st === "APPROVED") {
          badgeStyle =
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
          icon = <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
          label = "Approved";
        } else if (st === "PENDING") {
          badgeStyle =
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
          icon = <Clock className="h-3 w-3 text-amber-500 animate-pulse" />;
          label = "Pending Review";
        } else if (st === "REJECTED") {
          badgeStyle =
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
          icon = <XCircle className="h-3 w-3 text-rose-500" />;
          label = "Rejected";
        } else if (st === "NEEDS_INFORMATION" || st === "NEEDS_INFO") {
          badgeStyle =
            "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
          icon = <HelpCircle className="h-3 w-3 text-indigo-500" />;
          label = "Needs Info";
        }

        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border tracking-wide",
              badgeStyle,
            )}
          >
            {icon}
            {label}
          </span>
        );
      },
    },
    {
      key: "reviewed_by",
      label: "Last Reviewed",
      render: (row) => {
        if (!row.reviewed_by)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="text-xs">
            <span className="text-foreground truncate max-w-[130px] block font-mono">
              {row.reviewed_by}
            </span>
            {row.reviewed_at && (
              <span className="text-[10px] text-muted-foreground block">
                {new Date(row.reviewed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      align: "right",
      render: (row) => (
        <button
          onClick={() => handleOpenDetails(row)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all cursor-pointer shadow-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View Details</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              KYC Verification
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Compliance</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Review submitted government identity documents (Aadhaar for Vendors,
            PAN for Renters) and enforce platform safety.
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-secondary/80 text-foreground transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              refreshing && "animate-spin text-primary",
            )}
          />
          <span>{refreshing ? "Refreshing..." : "Refresh Applications"}</span>
        </button>
      </div>

      {/* Phase 3: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatsCard
          title="Total Submissions"
          value={stats.total}
          icon={Layers}
          loading={loading}
          subtext="All-time applications"
          className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => setStatusFilter("all")}
        />
        <StatsCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          loading={loading}
          trend={stats.pending > 0 ? "up" : "neutral"}
          subtext="Requires admin decision"
          className={cn(
            "cursor-pointer hover:border-amber-500/40 transition-colors",
            stats.pending > 0 && "ring-1 ring-amber-500/30 bg-amber-500/[0.03]",
          )}
          onClick={() => setStatusFilter("PENDING")}
        />
        <StatsCard
          title="Approved KYC"
          value={stats.approved}
          icon={CheckCircle2}
          loading={loading}
          subtext="Eligible to trade/rent"
          className="cursor-pointer hover:border-emerald-500/40 transition-colors"
          onClick={() => setStatusFilter("APPROVED")}
        />
        <StatsCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          loading={loading}
          subtext="Declined with reason"
          className="cursor-pointer hover:border-rose-500/40 transition-colors"
          onClick={() => setStatusFilter("REJECTED")}
        />
        <StatsCard
          title="Needs Information"
          value={stats.needs_information}
          icon={HelpCircle}
          loading={loading}
          subtext="Awaiting resubmission"
          className="cursor-pointer hover:border-indigo-500/40 transition-colors col-span-2 lg:col-span-1"
          onClick={() => setStatusFilter("NEEDS_INFORMATION")}
        />
      </div>

      {/* Phase 4: Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Applications", count: stats.total },
              {
                id: "PENDING",
                label: "Pending Review",
                count: stats.pending,
                highlight: true,
              },
              { id: "APPROVED", label: "Approved", count: stats.approved },
              { id: "REJECTED", label: "Rejected", count: stats.rejected },
              {
                id: "NEEDS_INFORMATION",
                label: "Needs Info",
                count: stats.needs_information,
              },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : tab.highlight && tab.count > 0
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Account Type Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Type:
            </span>
            <select
              value={accountTypeFilter}
              onChange={(e) => {
                setAccountTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary/80 border border-border/80 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Accounts (Vendor & Renter)</option>
              <option value="payernt">Vendors only (Aadhaar KYC)</option>
              <option value="payrent">Renters only (PAN KYC)</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by applicant name, email, application ID, or document number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/70 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <Table<AdminKycVerification>
        columns={columns}
        data={paginatedItems}
        loading={loading}
        emptyTitle="No KYC Applications Found"
        emptyDescription="No KYC submissions match your active filter and search criteria."
      />

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Phase 5: Detail & Document Preview Modal */}
      {selectedVerification && (
        <Modal
          isOpen={Boolean(selectedVerification)}
          onClose={handleCloseDetails}
          title="KYC Application Review & Document Verification"
          size="xl"
        >
          <div className="flex flex-col h-full max-h-[78vh] overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Top Applicant Banner */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <ProfilePhoto
                  src={selectedVerification.applicant_avatar || undefined}
                  name={
                    selectedVerification.applicant_name ||
                    selectedVerification.email
                  }
                  size="md"
                />
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {selectedVerification.applicant_name || "Applicant"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedVerification.email}
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md",
                        ["payernt", "vendor", "lender"].includes(
                          (
                            selectedVerification.account_type || ""
                          ).toLowerCase(),
                        )
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                      )}
                    >
                      {["payernt", "vendor", "lender"].includes(
                        (selectedVerification.account_type || "").toLowerCase(),
                      )
                        ? "Vendor (Payernt Lender)"
                        : "Renter (Payrent Customer)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Current Status
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide",
                    (selectedVerification.status || "").toUpperCase() ===
                      "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : (selectedVerification.status || "").toUpperCase() ===
                          "PENDING"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : (selectedVerification.status || "").toUpperCase() ===
                            "REJECTED"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                  )}
                >
                  {(selectedVerification.status || "").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Document Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-secondary/30 border border-border/60 text-xs">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Document Type
                </span>
                <span className="font-bold text-foreground">
                  {(selectedVerification.document_type || "").toUpperCase() ===
                  "AADHAAR"
                    ? "Aadhaar Card (12-digit)"
                    : "PAN Card (10-char)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Masked Number
                </span>
                <span className="font-mono font-bold text-foreground">
                  {selectedVerification.document_number_masked || "••••••••"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Submitted On
                </span>
                <span className="text-foreground">
                  {new Date(
                    selectedVerification.submitted_at ||
                      selectedVerification.created_at ||
                      "",
                  ).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Application ID
                </span>
                <span className="font-mono text-[11px] text-muted-foreground truncate block">
                  {selectedVerification.id}
                </span>
              </div>
            </div>

            {/* Existing Rejection / Information Notice if present */}
            {selectedVerification.rejection_reason && (
              <div
                className={cn(
                  "p-4 rounded-2xl border text-xs space-y-1.5",
                  (selectedVerification.status || "").toUpperCase() ===
                    "REJECTED"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
                )}
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {(selectedVerification.status || "").toUpperCase() ===
                    "REJECTED"
                      ? "Rejection Reason Feedback:"
                      : "Information Requested from Applicant:"}
                  </span>
                </div>
                <p className="text-foreground leading-relaxed pl-6">
                  {selectedVerification.rejection_reason}
                </p>
                {selectedVerification.reviewed_by && (
                  <p className="text-[10px] text-muted-foreground pl-6">
                    Recorded by {selectedVerification.reviewed_by} on{" "}
                    {selectedVerification.reviewed_at
                      ? new Date(
                          selectedVerification.reviewed_at,
                        ).toLocaleString()
                      : "prior review"}
                  </p>
                )}
              </div>
            )}

            {/* Embedded Document Previewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Submitted Identity Document Preview</span>
                  {docPayload?.fileName && (
                    <span className="text-muted-foreground font-normal text-[11px]">
                      ({docPayload.fileName})
                    </span>
                  )}
                </span>

                {/* Viewer Zoom & Rotation Controls */}
                <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/80">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="Zoom Out"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5 text-muted-foreground">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="Zoom In"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-3 w-px bg-border mx-0.5" />
                  <button
                    type="button"
                    onClick={handleRotate}
                    title="Rotate 90 degrees"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Fit to Window"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Canvas */}
              <div className="relative min-h-[340px] max-h-[460px] rounded-2xl bg-neutral-900 border border-border/80 overflow-auto flex items-center justify-center p-4">
                {docLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
                    <Loader
                      size="md"
                      message="Decryption and loading identity document..."
                    />
                  </div>
                ) : docError ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-center p-6 text-rose-400">
                    <AlertTriangle className="h-8 w-8" />
                    <p className="text-xs font-bold">{docError}</p>
                    <p className="text-[11px] text-muted-foreground">
                      The document file could not be retrieved from private
                      secure storage.
                    </p>
                  </div>
                ) : docPayload?.fileData ? (
                  docPayload.fileType === "application/pdf" ? (
                    <iframe
                      src={docPayload.fileData}
                      title="PDF Document Preview"
                      className="w-full h-[400px] rounded-xl border border-border/40"
                    />
                  ) : (
                    <div
                      className="transition-transform duration-150 ease-out flex items-center justify-center"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                        transformOrigin: "center center",
                      }}
                    >
                      <img
                        src={docPayload.fileData}
                        alt="Submitted Identity Document"
                        className="max-h-[380px] max-w-full object-contain rounded-lg shadow-2xl select-none"
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center p-6 text-muted-foreground text-xs">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No document preview payload available.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit History Timeline */}
            {selectedVerification.audit_history &&
              selectedVerification.audit_history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground">
                    Audit History & Decision Trail
                  </span>
                  <div className="space-y-2">
                    {selectedVerification.audit_history.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-card border border-border/60 text-xs flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground uppercase">
                              {entry.decision}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              by {entry.reviewer_email}
                            </span>
                          </div>
                          {entry.reason && (
                            <p className="text-muted-foreground mt-1 text-[11px]">
                              Notes: {entry.reason}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {new Date(entry.reviewed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Phase 6: Action Buttons Footer */}
            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseDetails}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                Close Preview
              </button>

              <div className="flex items-center gap-2">
                {/* Request More Information Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActionReason("");
                    setIsRequestInfoOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Request More Info</span>
                </button>

                {/* Reject KYC Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActionReason("");
                    setIsRejectOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-xs"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Reject KYC</span>
                </button>

                {/* Approve KYC Button */}
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve KYC</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Approve KYC */}
      {isApproveOpen && selectedVerification && (
        <Modal
          isOpen={isApproveOpen}
          onClose={() => setIsApproveOpen(false)}
          title="Confirm KYC Approval"
          size="sm"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <span>
                You are about to approve KYC for{" "}
                <strong>
                  {selectedVerification.applicant_name ||
                    selectedVerification.email}
                </strong>
                .
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Approving this application will grant verified status. The user
              will immediately be permitted to:
            </p>

            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
              {["payernt", "vendor", "lender"].includes(
                (selectedVerification.account_type || "").toLowerCase(),
              ) ? (
                <>
                  <li>Publish and activate product listings on Payernt.</li>
                  <li>Receive rental requests and verified lender badges.</li>
                </>
              ) : (
                <>
                  <li>
                    Initiate checkout and confirm rental bookings on Payrent.
                  </li>
                  <li>Access zero-security-deposit rental perks.</li>
                </>
              )}
            </ul>

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                disabled={submittingAction}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={submittingAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {submittingAction && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>
                  {submittingAction ? "Approving..." : "Confirm Approval"}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Reject KYC (Mandatory Reason) */}
      {isRejectOpen && selectedVerification && (
        <Modal
          isOpen={isRejectOpen}
          onClose={() => setIsRejectOpen(false)}
          title="Reject KYC Application"
          size="md"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <span>
                A rejection reason is <strong>mandatory</strong>. It will be
                communicated to{" "}
                <strong>
                  {selectedVerification.applicant_name ||
                    selectedVerification.email}
                </strong>{" "}
                via notification.
              </span>
            </div>

            {/* Quick Template Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Quick Reason Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActionReason(tmpl)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-colors text-left cursor-pointer"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain clearly why this KYC document was rejected..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full p-3 rounded-xl text-xs bg-secondary/40 border border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 transition-all resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                disabled={submittingAction}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submittingAction || !actionReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {submittingAction && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>
                  {submittingAction ? "Rejecting..." : "Confirm Rejection"}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Request More Information */}
      {isRequestInfoOpen && selectedVerification && (
        <Modal
          isOpen={isRequestInfoOpen}
          onClose={() => setIsRequestInfoOpen(false)}
          title="Request More Information"
          size="md"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <HelpCircle className="h-6 w-6 shrink-0" />
              <span>
                Enter clear instructions on what document or correction the
                applicant must submit.
              </span>
            </div>

            {/* Quick Template Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Quick Request Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REQUEST_INFO_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActionReason(tmpl)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-colors text-left cursor-pointer"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                Requested Information Details{" "}
                <span className="text-amber-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain what needs to be corrected or re-uploaded..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full p-3 rounded-xl text-xs bg-secondary/40 border border-border/80 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all resize-none"
              />
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRequestInfoOpen(false)}
                disabled={submittingAction}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestInfo}
                disabled={submittingAction || !actionReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {submittingAction && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>{submittingAction ? "Sending..." : "Send Request"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
