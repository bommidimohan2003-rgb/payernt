import React, { useEffect, useState, useCallback } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  FileText,
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
  Building,
  Info,
  Check,
  X,
  Lock,
  Copy,
  RefreshCw,
  Download,
  AlertCircle,
  FileQuestion,
  FileX,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Modal } from "../components/layout/Modal";
import { Loader } from "../components/layout/Loader";
import { ProfilePhoto } from "@/components/common/ProfilePhoto";
import {
  kycService,
  AdminKycVerification,
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

export default function KycApplicationDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as {
    id?: string;
    applicationId?: string;
  };

  const pathTokens = (
    location?.pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "")
  )
    .split("/")
    .filter(Boolean);

  let routeId = params?.id || params?.applicationId || "";
  if (
    !routeId &&
    pathTokens.length >= 3 &&
    pathTokens[0] === "admin" &&
    pathTokens[1] === "kyc"
  ) {
    routeId = pathTokens[2];
  }
  const applicationId = routeId === "kyc" ? "" : routeId;

  // Search parameters for preserving back navigation
  const searchParams = new URLSearchParams(location?.search || "");
  const returnStatus = searchParams.get("status") || undefined;
  const returnType = searchParams.get("type") || undefined;
  const returnQuery = searchParams.get("q") || undefined;

  // Main state
  const [verification, setVerification] = useState<AdminKycVerification | null>(
    null,
  );
  const [document, setDocument] = useState<KycDocumentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Document Viewer Controls (Zoom, Pan, Rotation)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Decision Modals State
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch KYC details and document payload from backend
  const loadDetails = useCallback(
    async (isSilent = false) => {
      if (!applicationId) {
        setError("Missing KYC Application ID.");
        setLoading(false);
        return;
      }

      try {
        if (isSilent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        setDocError(null);

        const res = await kycService.getKycDetails(applicationId);
        setVerification(res.verification);

        if (res.document && res.document.fileData) {
          setDocument(res.document);
        } else {
          // If document data wasn't in details endpoint, attempt direct retrieval
          setDocLoading(true);
          try {
            const doc = await kycService.getKycDocument(applicationId);
            setDocument(doc);
          } catch (docErr: unknown) {
            const errObj = docErr as { message?: string };
            console.warn("Could not load KYC document payload:", docErr);
            setDocError(
              errObj?.message || "Document preview could not be loaded.",
            );
          } finally {
            setDocLoading(false);
          }
        }
      } catch (err: unknown) {
        const errorObj = err as {
          response?: { status?: number; data?: { detail?: string } };
          message?: string;
        };
        console.error("Failed to load KYC application details:", err);
        const status = errorObj?.response?.status;
        if (status === 404) {
          setError("KYC Application not found.");
        } else if (status === 403) {
          setError(
            "Forbidden: Administrator privileges are required to view KYC details.",
          );
        } else {
          setError(
            errorObj?.response?.data?.detail ||
              errorObj?.message ||
              "Failed to load KYC verification application.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applicationId],
  );

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Viewer controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotationAngle(0);
  };
  const handleRotate = () => setRotationAngle((r) => (r + 90) % 360);

  // Safe Back Navigation
  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({
        to: "/admin/kyc",
        search: {
          status: returnStatus,
          type: returnType,
          q: returnQuery,
        } as Record<string, unknown>,
      });
    }
  };

  // Copy Application ID
  const handleCopyId = () => {
    if (applicationId) {
      navigator.clipboard.writeText(applicationId);
      toast.success("Application ID copied to clipboard");
    }
  };

  // Open Document in New Window
  const handleOpenDocInNewTab = () => {
    if (!document?.fileData) return;
    try {
      const win = window.open();
      if (win) {
        if (document.fileType === "application/pdf") {
          win.document.write(
            `<iframe src="${document.fileData}" style="width:100%;height:100%;border:none;"></iframe>`,
          );
        } else {
          win.document.write(
            `<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${document.fileData}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body>`,
          );
        }
      }
    } catch (e) {
      console.warn("Failed to open document preview in new tab", e);
    }
  };

  // Decision Execution: Approve
  const handleConfirmApprove = async () => {
    if (!applicationId) return;
    try {
      setSubmittingAction(true);
      const res = await kycService.reviewKyc(applicationId, {
        action: "approve",
      });
      toast.success(res.message || "KYC verification approved successfully!");
      setIsApproveOpen(false);
      await loadDetails(true);
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
    if (!applicationId) return;
    const cleanReason = actionReason.trim();
    if (!cleanReason) {
      toast.error("Rejection reason is mandatory.");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await kycService.reviewKyc(applicationId, {
        action: "reject",
        rejection_reason: cleanReason,
        rejectionReason: cleanReason,
      });
      toast.success(res.message || "KYC verification rejected.");
      setIsRejectOpen(false);
      setActionReason("");
      await loadDetails(true);
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
    if (!applicationId) return;
    const cleanNotes = actionReason.trim();
    if (!cleanNotes) {
      toast.error("Information request details are mandatory.");
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await kycService.reviewKyc(applicationId, {
        action: "needs_information",
        notes: cleanNotes,
        rejection_reason: cleanNotes,
      });
      toast.success(
        res.message || "Requested additional information from applicant.",
      );
      setIsRequestInfoOpen(false);
      setActionReason("");
      await loadDetails(true);
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

  // Loading State
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader size="lg" message="Loading KYC application details..." />
        <span className="text-xs text-muted-foreground font-mono">
          Fetching verification record #{applicationId?.slice(0, 8)}...
        </span>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !verification) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="p-8 rounded-2xl bg-card border border-border shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/20">
            <FileX className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">
              {error || "KYC Application Not Found"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The requested KYC verification application (ID:{" "}
              <code className="font-mono text-foreground">
                {applicationId || "unknown"}
              </code>
              ) could not be found in the database, or you may lack
              administrator permissions.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleBackNavigation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to KYC Applications</span>
            </button>
            <button
              onClick={() => loadDetails()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVendor = ["payernt", "vendor", "lender"].includes(
    (verification.account_type || "").toLowerCase(),
  );
  const statusUpper = (verification.status || "").toUpperCase();
  const isAadhaar =
    (verification.document_type || "").toUpperCase() === "AADHAAR";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to KYC Applications</span>
          </button>
          <span className="text-muted-foreground/40 hidden sm:inline">•</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            KYC Review Console
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDetails(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer"
            title="Refresh application data"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                refreshing && "animate-spin text-primary",
              )}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Applicant Identity & Badges */}
          <div className="flex items-start sm:items-center gap-4">
            <ProfilePhoto
              src={verification.applicant_avatar || undefined}
              name={verification.applicant_name || verification.email}
              size="lg"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-foreground">
                  {verification.applicant_name || "Applicant Name"}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md",
                    isVendor
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                  )}
                >
                  {isVendor ? (
                    <Building className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {isVendor
                    ? "Vendor (Payernt Lender)"
                    : "Renter (Payrent Customer)"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono text-foreground/80">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {verification.email}
                </span>
                {verification.applicant_phone && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="flex items-center gap-1 font-mono text-foreground/80">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {verification.applicant_phone}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/40">•</span>
                <div className="flex items-center gap-1 font-mono text-[11px] bg-secondary/80 px-2 py-0.5 rounded-md border border-border/60">
                  <span>ID: {verification.id.slice(0, 16)}...</span>
                  <button
                    onClick={handleCopyId}
                    title="Copy Full Application ID"
                    className="hover:text-foreground transition-colors ml-1 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Status Badge & Primary Action Bar */}
          <div className="flex flex-col sm:items-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Status:
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide",
                  statusUpper === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : statusUpper === "PENDING"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : statusUpper === "REJECTED"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                )}
              >
                {statusUpper === "APPROVED" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                )}
                {statusUpper === "PENDING" && (
                  <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                )}
                {statusUpper === "REJECTED" && (
                  <XCircle className="h-3.5 w-3.5 text-rose-500" />
                )}
                {["NEEDS_INFORMATION", "NEEDS_INFO"].includes(statusUpper) && (
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                )}
                {statusUpper === "PENDING"
                  ? "Pending Review"
                  : statusUpper === "APPROVED"
                    ? "Approved"
                    : statusUpper === "REJECTED"
                      ? "Rejected"
                      : "Needs More Information"}
              </span>
            </div>

            {/* Review Decision Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionReason("");
                  setIsRequestInfoOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/30 transition-all cursor-pointer shadow-xs"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Request Info</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionReason("");
                  setIsRejectOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all cursor-pointer shadow-xs"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject KYC</span>
              </button>

              <button
                type="button"
                onClick={() => setIsApproveOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve KYC</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection / Information Notice Feedback if set */}
      {verification.rejection_reason && (
        <div
          className={cn(
            "p-4 rounded-2xl border text-xs space-y-1.5 shadow-2xs",
            statusUpper === "REJECTED"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
          )}
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {statusUpper === "REJECTED"
                ? "Official Rejection Feedback:"
                : "Information Requested from Applicant:"}
            </span>
          </div>
          <p className="text-foreground leading-relaxed pl-6 font-medium">
            {verification.rejection_reason}
          </p>
          {verification.reviewed_by && (
            <p className="text-[10px] text-muted-foreground pl-6">
              Recorded by{" "}
              <span className="font-mono">{verification.reviewed_by}</span> on{" "}
              {verification.reviewed_at
                ? new Date(verification.reviewed_at).toLocaleString()
                : "prior review"}
            </p>
          )}
        </div>
      )}

      {/* Grid: Applicant & Document Metadata (Left/Top) and Embedded Preview Canvas (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applicant & Document Info + Review Audit */}
        <div className="lg:col-span-5 space-y-6">
          {/* Applicant Profile Information Card */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span>Applicant Details</span>
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border/60">
                {verification.verification_source || "Manual Admin Review"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Full Legal Name:</span>
                <span className="font-semibold text-foreground">
                  {verification.applicant_name || "Applicant"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered Email:</span>
                <span className="font-mono font-medium text-foreground">
                  {verification.email}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contact Phone:</span>
                <span className="font-mono text-foreground">
                  {verification.applicant_phone || "Not provided"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Role:</span>
                <span className="font-bold text-foreground">
                  {isVendor
                    ? "Payernt Vendor (Equipment Owner)"
                    : "Payrent Renter (Customer)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {verification.user_id || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Submitted At:</span>
                <span className="text-foreground">
                  {new Date(
                    verification.submitted_at || verification.created_at || "",
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Security / Impact Notice */}
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-start gap-2.5 text-[11px] text-muted-foreground">
              <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {isVendor
                  ? "Approved KYC permits this vendor to publish and monetize equipment listings across Payernt."
                  : "Approved KYC permits this customer to book high-value equipment without upfront cash security deposits."}
              </span>
            </div>
          </div>

          {/* Submitted Document Metadata Card */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Document Details</span>
              </h2>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                {isAadhaar ? "Government ID: Aadhaar" : "Government ID: PAN"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Document Type
                </span>
                <span className="font-bold text-foreground">
                  {isAadhaar ? "Aadhaar Card" : "PAN Card"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Masked Number
                </span>
                <span className="font-mono font-bold text-foreground">
                  {verification.document_number_masked || "••••••••"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Original File Name
                </span>
                <span className="font-mono text-[11px] text-foreground truncate block">
                  {document?.fileName ||
                    verification.document_file_name ||
                    "document.jpg"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  File Size / Type
                </span>
                <span className="text-foreground">
                  {document?.fileSize
                    ? `${(document.fileSize / 1024).toFixed(1)} KB`
                    : verification.document_file_size
                      ? `${(verification.document_file_size / 1024).toFixed(1)} KB`
                      : "—"}{" "}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    (
                    {document?.fileType ||
                      verification.document_mime_type ||
                      "image"}
                    )
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Audit History & Decision Trail */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span>Audit Trail & Review History</span>
            </h2>

            {verification.audit_history &&
            verification.audit_history.length > 0 ? (
              <div className="space-y-3">
                {verification.audit_history.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          entry.decision === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : entry.decision === "REJECTED"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        )}
                      >
                        {entry.decision}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(entry.reviewed_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Reviewed by:{" "}
                      <span className="font-mono text-foreground">
                        {entry.reviewer_email}
                      </span>
                    </div>

                    {entry.reason && (
                      <p className="text-[11px] text-foreground bg-card/60 p-2 rounded-lg border border-border/40">
                        {entry.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : verification.reviewed_by ? (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    Last Decision:
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {verification.reviewed_at
                      ? new Date(verification.reviewed_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Reviewed by:{" "}
                  <span className="font-mono text-foreground">
                    {verification.reviewed_by}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                No previous review actions recorded. This application is
                awaiting initial decision.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Embedded Identity Document Preview Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4 flex flex-col h-full">
            {/* Viewer Header with Title & Zoom/Rotation Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Submitted Identity Document Preview</span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Secure encrypted preview rendered directly in the admin
                  console.
                </p>
              </div>

              {/* Viewer Interactive Controls */}
              <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-muted-foreground select-none">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="h-3 w-px bg-border mx-0.5" />
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate 90 degrees"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Fit to Window"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                {document?.fileData && (
                  <>
                    <div className="h-3 w-px bg-border mx-0.5" />
                    <button
                      type="button"
                      onClick={handleOpenDocInNewTab}
                      title="Open full size in new tab"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Document Preview Viewport Canvas */}
            <div className="relative flex-1 min-h-[480px] max-h-[640px] rounded-2xl bg-neutral-950 border border-neutral-800 overflow-auto flex items-center justify-center p-4">
              {docLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 text-neutral-400">
                  <Loader
                    size="md"
                    message="Decrypting and loading document..."
                  />
                </div>
              ) : docError ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center p-6 text-rose-400 max-w-sm">
                  <AlertTriangle className="h-8 w-8" />
                  <p className="text-xs font-bold">{docError}</p>
                  <p className="text-[11px] text-neutral-500">
                    The document file could not be decrypted or loaded from
                    private secure storage.
                  </p>
                  <button
                    onClick={() => loadDetails(true)}
                    className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : document?.fileData ? (
                document.fileType === "application/pdf" ? (
                  <iframe
                    src={document.fileData}
                    title="PDF Document Preview"
                    className="w-full h-full min-h-[460px] rounded-xl border border-neutral-800 bg-white"
                  />
                ) : (
                  <div
                    className="transition-transform duration-150 ease-out flex items-center justify-center select-none"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                      transformOrigin: "center center",
                    }}
                  >
                    <img
                      src={document.fileData}
                      alt="Submitted Identity Document"
                      className="max-h-[520px] max-w-full object-contain rounded-lg shadow-2xl"
                    />
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-neutral-500 text-xs space-y-2">
                  <FileText className="h-10 w-10 mx-auto opacity-40 text-neutral-400" />
                  <p className="font-semibold">
                    No document image payload available.
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    Document binary may have been saved to local path or
                    database storage.
                  </p>
                </div>
              )}
            </div>

            {/* Verification Checklist Guidelines */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs space-y-1.5">
              <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block">
                Verification Checklist:
              </span>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                <li>
                  Verify all 4 corners of the government ID are clearly visible
                  and uncropped.
                </li>
                <li>
                  Confirm legal name on ID matches the applicant profile name:{" "}
                  <strong className="text-foreground">
                    {verification.applicant_name || verification.email}
                  </strong>
                  .
                </li>
                <li>
                  Check that the document photo is sharp, authentic, and free of
                  glare or digital edits.
                </li>
                <li>
                  Confirm the masked number matches the expected format
                  (12-digit Aadhaar / 10-char PAN).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Approve KYC */}
      {isApproveOpen && (
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
                  {verification.applicant_name || verification.email}
                </strong>
                .
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Approving this application will grant verified status. The user
              will immediately be permitted to:
            </p>

            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
              {isVendor ? (
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
      {isRejectOpen && (
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
                  {verification.applicant_name || verification.email}
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
      {isRequestInfoOpen && (
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
