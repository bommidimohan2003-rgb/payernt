import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  X,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Lock,
  FileCheck,
  Info,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import payerntApi from "@/payernt/payerntApiService";
import { usePayernt } from "@/payernt/context";
import { useKycScreenshotProtection } from "@/hooks/useKycScreenshotProtection";
import {
  KycScreenShield,
  KycProtectionBadge,
} from "@/components/security/KycScreenShield";

export function PayerntKycPage() {
  const navigate = useNavigate();
  const { activeAccount } = usePayernt();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Status from backend
  const [kycStatus, setKycStatus] = useState<
    "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED"
  >("NOT_STARTED");
  const [maskedNumber, setMaskedNumber] = useState<string | null>(null);
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [allowResubmission, setAllowResubmission] = useState(true);

  // Edit mode state: permitted strictly before admin approval
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = kycStatus !== "APPROVED";

  // Anti-Screenshot & Screen Capture Protection (Page-Specific: applies across entry, submission, and verification)
  const { isObscured, unobscure, setFileDialogOpen, protectProps } =
    useKycScreenshotProtection({
      documentType: "Aadhaar Card",
      enabled: true,
    });

  // Form states
  const [aadhaarRaw, setAadhaarRaw] = useState("");
  const [showAadhaar, setShowAadhaar] = useState(true);
  const [numberError, setNumberError] = useState<string | null>(null);

  // Document photo states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    size: number;
    data: string; // base64 Data URI
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const fetchKycStatus = async () => {
    try {
      setLoading(true);
      const res = await payerntApi.getKycStatus();
      if (res && res.success) {
        setKycStatus(res.status || "NOT_STARTED");
        setMaskedNumber(res.maskedNumber || null);
        setDocumentFileName(res.documentFileName || null);
        setSubmittedAt(res.submittedAt || null);
        setRejectionReason(res.rejectionReason || null);
        setAllowResubmission(res.allowResubmission ?? true);
      }
    } catch (err: unknown) {
      console.warn("Could not load KYC status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, [activeAccount?.email]);

  useEffect(() => {
    const inputEl = fileInputRef.current;
    if (!inputEl) return;
    const handleDialogCancel = () => setFileDialogOpen(false);
    inputEl.addEventListener("cancel", handleDialogCancel);
    return () => inputEl.removeEventListener("cancel", handleDialogCancel);
  }, [setFileDialogOpen]);

  // Format 12-digit number with spaces for display (e.g. 1234 5678 9012)
  const formatAadhaarInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join(" ");
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, 12);
    setAadhaarRaw(rawVal);
    if (numberError) setNumberError(null);
  };

  // Masked display helper
  const getDisplayedAadhaar = () => {
    if (!aadhaarRaw) return "";
    if (showAadhaar) {
      return formatAadhaarInput(aadhaarRaw);
    }
    // Mask first 8 digits, keep last 4 visible
    if (aadhaarRaw.length <= 4) {
      return aadhaarRaw.replace(/\d/g, "•");
    }
    if (aadhaarRaw.length <= 8) {
      const first4 = "••••";
      const rest = aadhaarRaw.slice(4).replace(/\d/g, "•");
      return `${first4} ${rest}`.trim();
    }
    const firstPart = "•••• ••••";
    const lastPart = aadhaarRaw.slice(8);
    return `${firstPart} ${lastPart}`;
  };

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Validate size (max 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError(
        "File size exceeds 5MB limit. Please upload a smaller photo.",
      );
      return;
    }

    // Validate MIME type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setFileError("Unsupported format. Allowed formats: JPG, JPEG, PNG, PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result as string,
      });
    };
    reader.onerror = () => {
      setFileError("Failed to read file. Please try selecting again.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error("Approved KYC documents cannot be modified.");
      return;
    }

    // Validation
    let hasError = false;
    const cleanNum = aadhaarRaw.replace(/\s+/g, "");

    if (!cleanNum) {
      setNumberError("Aadhaar Number is required.");
      hasError = true;
    } else if (!/^\d{12}$/.test(cleanNum)) {
      setNumberError(
        "Aadhaar Number must consist of exactly 12 numeric digits.",
      );
      hasError = true;
    }

    if (!selectedFile && !isEditing) {
      setFileError("Please upload a clear photo or scan of your Aadhaar card.");
      hasError = true;
    }

    if (hasError) {
      toast.error("Please correct the highlighted fields before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: {
        documentType: "AADHAAR";
        documentNumber: string;
        fileName?: string;
        fileType?: string;
        fileData?: string;
        fileSize?: number;
        isEdit?: boolean;
      } = {
        documentType: "AADHAAR",
        documentNumber: cleanNum,
        isEdit: isEditing || kycStatus === "PENDING",
      };

      if (selectedFile) {
        payload.fileName = selectedFile.name;
        payload.fileType = selectedFile.type;
        payload.fileData = selectedFile.data;
        payload.fileSize = selectedFile.size;
      }

      const res = await payerntApi.submitKyc(payload);

      if (res && res.success) {
        toast.success(
          isEditing
            ? "Aadhaar details updated successfully! Placed under review."
            : "Aadhaar document submitted successfully! Placed under review.",
        );
        setKycStatus(res.status || "PENDING");
        setMaskedNumber(res.maskedNumber || `XXXX-XXXX-${cleanNum.slice(-4)}`);
        if (selectedFile) {
          setDocumentFileName(selectedFile.name);
        }
        setSubmittedAt(new Date().toISOString());
        setIsEditing(false);
        setAllowResubmission(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("payent_kyc_updated"));
        }
      } else {
        toast.error(
          res?.message || "Verification submission failed. Please try again.",
        );
      }
    } catch (err: unknown) {
      toast.error(
        (err as Error)?.message ||
          "Failed to submit Aadhaar verification. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartResubmission = () => {
    setAadhaarRaw("");
    setSelectedFile(null);
    setNumberError(null);
    setFileError(null);
    setKycStatus("NOT_STARTED");
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (!canEdit) {
      toast.error("Approved KYC documents cannot be modified.");
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNumberError(null);
    setFileError(null);
    setSelectedFile(null);
    setAadhaarRaw("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-left pb-16">
      <KycScreenShield
        isObscured={isObscured}
        documentType="Aadhaar Card"
        onDismiss={unobscure}
      />
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/payernt/profile" })}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Lender Profile</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Payernt Host Verification</span>
        </span>
      </div>

      {/* Page Title & Context Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
          Aadhaar Verification
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Verify your identity as an equipment lender on Payernt using your
          12-digit Aadhaar card. All identity documents are securely encrypted,
          stored privately, and reviewed by our compliance team.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 rounded-3xl border border-border/80 bg-card flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">
            Checking Aadhaar KYC verification status...
          </p>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          {kycStatus === "APPROVED" && (
            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <span>Aadhaar Identity Verified</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                  <Lock className="h-3 w-3" />
                  <span>Approved & Locked</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Aadhaar card verification has been approved. Your lender
                account now carries the verified host trust badge, enabling
                zero-deposit gear protection and verified community listings.
              </p>
              <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">Document: </span>
                  <span className="font-bold text-foreground">
                    Aadhaar Card
                  </span>
                </div>
                {maskedNumber && (
                  <div>
                    <span className="text-muted-foreground">Number: </span>
                    <span className="font-bold text-foreground">
                      {maskedNumber}
                    </span>
                  </div>
                )}
                {submittedAt && (
                  <div>
                    <span className="text-muted-foreground">Verified: </span>
                    <span className="text-foreground">
                      {new Date(submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-1 text-[11px] text-muted-foreground italic">
                Note: Verified KYC documents are officially approved by
                compliance and cannot be edited.
              </div>
            </div>
          )}

          {kycStatus === "PENDING" && (
            <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold text-base">
                  <Clock className="h-6 w-6 shrink-0 animate-pulse" />
                  <span>Verification Under Administrative Review</span>
                </div>
                {!isEditing && canEdit && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
                    aria-label="Edit pending Aadhaar details"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit KYC Details</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Aadhaar card photo and 12-digit number have been securely
                received. Our compliance team is verifying the submitted
                details. Verification typically completes within 24 hours.
              </p>
              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                    PENDING REVIEW
                  </span>
                </div>
                {maskedNumber && (
                  <div>
                    <span className="text-muted-foreground">Aadhaar: </span>
                    <span className="font-bold text-foreground">
                      {maskedNumber}
                    </span>
                  </div>
                )}
                {documentFileName && (
                  <div>
                    <span className="text-muted-foreground">File: </span>
                    <span className="font-bold text-foreground">
                      {documentFileName}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>
                    Notice: You can update your Aadhaar details or document
                    anytime before compliance approval.
                  </span>
                </div>
                {!isEditing && canEdit && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="font-bold text-amber-900 dark:text-amber-200 underline hover:opacity-80 cursor-pointer shrink-0"
                  >
                    Edit now
                  </button>
                )}
              </div>
            </div>
          )}

          {isEditing && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-950 dark:text-amber-200">
                <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Editing Pending Aadhaar Submission:</strong> You can
                  update your 12-digit Aadhaar number and replace your uploaded
                  document before our team approves it.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-card hover:bg-secondary text-xs font-semibold text-foreground cursor-pointer shrink-0 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {kycStatus === "REJECTED" && (
            <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 space-y-3">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-base">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <span>Aadhaar Verification Rejected</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your prior Aadhaar submission could not be verified. You may
                review the safe feedback below and submit a clear, valid Aadhaar
                card.
              </p>
              {rejectionReason && (
                <div className="p-3.5 rounded-2xl bg-card border border-rose-500/20 text-xs">
                  <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">
                    Reason:
                  </span>
                  <span className="text-foreground">{rejectionReason}</span>
                </div>
              )}
              {allowResubmission && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartResubmission}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-foreground text-background font-bold text-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Submit New Aadhaar Document</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Verification Form (Active when NOT_STARTED or after clicking resubmit or in edit mode) */}
          {(kycStatus === "NOT_STARTED" ||
            isEditing ||
            (kycStatus === "REJECTED" && !rejectionReason)) && (
            <form
              onSubmit={handleSubmit}
              className="relative rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-sm overflow-hidden kyc-secure-container select-none"
              data-kyc-form="true"
              onContextMenu={protectProps.onContextMenu}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {isEditing
                      ? "Edit Aadhaar Details"
                      : "Submit Aadhaar Details"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEditing
                      ? "Update your 12-digit Aadhaar number or upload a replacement photo."
                      : "Enter your 12-digit Aadhaar number and attach a clear image of the card."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <KycProtectionBadge documentType="Aadhaar" />
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>256-Bit Encrypted</span>
                  </div>
                </div>
              </div>

              {/* Field 1 — Aadhaar Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="aadhaar-number-input"
                    className="block text-xs font-bold text-foreground"
                  >
                    Field 1 — Aadhaar Number{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Exactly 12 digits (e.g. 1234 5678 9012)
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-2xl border bg-secondary/30 px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
                    numberError
                      ? "border-destructive focus-within:ring-destructive/20"
                      : ""
                  }`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    id="aadhaar-number-input"
                    type={showAadhaar ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={14}
                    value={
                      showAadhaar ? formatAadhaarInput(aadhaarRaw) : aadhaarRaw
                    }
                    onChange={handleAadhaarChange}
                    onCopy={protectProps.onCopy}
                    onCut={protectProps.onCut}
                    placeholder="1234 5678 9012"
                    className="flex-1 bg-transparent outline-none text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground select-none"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAadhaar(!showAadhaar)}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title={showAadhaar ? "Mask Aadhaar" : "Reveal Aadhaar"}
                    aria-label={
                      showAadhaar
                        ? "Mask Aadhaar Number"
                        : "Show Aadhaar Number"
                    }
                  >
                    {showAadhaar ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {numberError && (
                  <p className="text-xs text-destructive font-medium">
                    {numberError}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Your Aadhaar number is masked after entry. We never store or
                  log complete Aadhaar numbers in plaintext.
                </p>
              </div>

              {/* Field 2 — Aadhaar Card Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Field 2 — Aadhaar Card Photo{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    JPG, JPEG, PNG, or PDF (Max 5MB)
                  </span>
                </div>

                {isEditing && documentFileName && !selectedFile && (
                  <div className="p-3 rounded-2xl bg-secondary/40 border border-border/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        Current document:{" "}
                        <strong className="font-semibold text-foreground">
                          {documentFileName}
                        </strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      Upload below to replace
                    </span>
                  </div>
                )}

                {/* Upload Area / Preview Box */}
                {!selectedFile ? (
                  <div
                    onClick={() => {
                      setFileDialogOpen(true);
                      fileInputRef.current?.click();
                    }}
                    className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-secondary/40 text-center ${
                      fileError
                        ? "border-destructive/80 bg-destructive/5"
                        : "border-border bg-secondary/15"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        Click to upload or drag & drop your Aadhaar card photo
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Ensure full card name, 12-digit number, and photo are
                        sharp and legible.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileDialogOpen(true);
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-secondary cursor-pointer"
                    >
                      Browse File
                    </button>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 rounded-3xl border border-border bg-secondary/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <FileCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                            {selectedFile.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setFileDialogOpen(true);
                            fileInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold cursor-pointer"
                        >
                          Replace Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Remove uploaded photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview thumbnail if image */}
                    {selectedFile.type.startsWith("image/") && (
                      <div className="relative rounded-2xl overflow-hidden border border-border max-h-56 bg-neutral-950 flex items-center justify-center">
                        <img
                          src={selectedFile.data}
                          alt="Aadhaar Card Preview"
                          className="max-h-56 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => {
                    setFileDialogOpen(false);
                    handleFileChange(e);
                  }}
                  className="hidden"
                />

                {fileError && (
                  <p className="text-xs text-destructive font-medium">
                    {fileError}
                  </p>
                )}
              </div>

              {/* Security Privacy Notice */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Privacy and Document Storage Policy</span>
                </div>
                <p>
                  Identity documents are stored in secure private storage with
                  strict access controls. Uploaded files are never exposed
                  publicly and are used strictly for equipment lending host
                  verification.
                </p>
              </div>

              {/* Submit & Cancel Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-3 rounded-2xl border border-border bg-card hover:bg-secondary font-bold text-xs uppercase tracking-wider text-foreground cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-44"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {isEditing
                          ? "Updating Aadhaar..."
                          : "Verifying Aadhaar..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        {isEditing ? "Save & Update KYC" : "Verify Aadhaar"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default PayerntKycPage;
