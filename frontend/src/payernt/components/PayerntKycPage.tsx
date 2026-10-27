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
} from "lucide-react";
import { toast } from "sonner";
import payerntApi from "@/payernt/payerntApiService";
import { usePayernt } from "@/payernt/context";

export function PayerntKycPage() {
  const navigate = useNavigate();
  const { activeAccount } = usePayernt();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Status from backend
  const [kycStatus, setKycStatus] = useState<"NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED">("NOT_STARTED");
  const [maskedNumber, setMaskedNumber] = useState<string | null>(null);
  const [documentFileName, setDocumentFileName] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [allowResubmission, setAllowResubmission] = useState(true);

  // Form states
  const [aadhaarRaw, setAadhaarRaw] = useState("");
  const [showAadhaar, setShowAadhaar] = useState(false);
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
    } catch (err: any) {
      console.warn("Could not load KYC status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, [activeAccount?.email]);

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
      setFileError("File size exceeds 5MB limit. Please upload a smaller photo.");
      return;
    }

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
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

    // Validation
    let hasError = false;
    const cleanNum = aadhaarRaw.replace(/\s+/g, "");

    if (!cleanNum) {
      setNumberError("Aadhaar Number is required.");
      hasError = true;
    } else if (!/^\d{12}$/.test(cleanNum)) {
      setNumberError("Aadhaar Number must consist of exactly 12 numeric digits.");
      hasError = true;
    }

    if (!selectedFile) {
      setFileError("Please upload a clear photo or scan of your Aadhaar card.");
      hasError = true;
    }

    if (hasError) {
      toast.error("Please correct the highlighted fields before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await payerntApi.submitKyc({
        documentType: "AADHAAR",
        documentNumber: cleanNum,
        fileName: selectedFile!.name,
        fileType: selectedFile!.type,
        fileData: selectedFile!.data,
        fileSize: selectedFile!.size,
      });

      if (res && res.success) {
        toast.success("Aadhaar document submitted successfully! Placed under review.");
        setKycStatus(res.status || "PENDING");
        setMaskedNumber(res.maskedNumber || `XXXX-XXXX-${cleanNum.slice(-4)}`);
        setDocumentFileName(selectedFile!.name);
        setSubmittedAt(new Date().toISOString());
        setAllowResubmission(false);
      } else {
        toast.error(res?.message || "Verification submission failed. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit Aadhaar verification. Please try again.");
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
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-left pb-16">
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
          Verify your identity as an equipment lender on Payernt using your 12-digit Aadhaar card.
          All identity documents are securely encrypted, stored privately, and reviewed by our compliance team.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 rounded-3xl border border-border/80 bg-card flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Checking Aadhaar KYC verification status...</p>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          {kycStatus === "APPROVED" && (
            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <span>Aadhaar Identity Verified</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Aadhaar card verification has been approved. Your lender account now carries the verified host trust badge, enabling zero-deposit gear protection and verified community listings.
              </p>
              <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">Document: </span>
                  <span className="font-bold text-foreground">Aadhaar Card</span>
                </div>
                {maskedNumber && (
                  <div>
                    <span className="text-muted-foreground">Number: </span>
                    <span className="font-bold text-foreground">{maskedNumber}</span>
                  </div>
                )}
                {submittedAt && (
                  <div>
                    <span className="text-muted-foreground">Verified: </span>
                    <span className="text-foreground">{new Date(submittedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {kycStatus === "PENDING" && (
            <div className="p-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 space-y-3">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold text-base">
                <Clock className="h-6 w-6 shrink-0 animate-pulse" />
                <span>Verification Under Administrative Review</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your Aadhaar card photo and 12-digit number have been securely received. Our compliance team is verifying the submitted details. Verification typically completes within 24 hours.
              </p>
              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">PENDING REVIEW</span>
                </div>
                {maskedNumber && (
                  <div>
                    <span className="text-muted-foreground">Aadhaar: </span>
                    <span className="font-bold text-foreground">{maskedNumber}</span>
                  </div>
                )}
                {documentFileName && (
                  <div>
                    <span className="text-muted-foreground">File: </span>
                    <span className="font-bold text-foreground">{documentFileName}</span>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>Notice: Instant government database verification is pending real verification provider API credentials.</span>
              </div>
            </div>
          )}

          {kycStatus === "REJECTED" && (
            <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 space-y-3">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-base">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <span>Aadhaar Verification Rejected</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your prior Aadhaar submission could not be verified. You may review the safe feedback below and submit a clear, valid Aadhaar card.
              </p>
              {rejectionReason && (
                <div className="p-3.5 rounded-2xl bg-card border border-rose-500/20 text-xs">
                  <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">Reason:</span>
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

          {/* Verification Form (Active when NOT_STARTED or after clicking resubmit) */}
          {(kycStatus === "NOT_STARTED" || (kycStatus === "REJECTED" && !rejectionReason)) && (
            <form onSubmit={handleSubmit} className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Submit Aadhaar Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter your 12-digit Aadhaar number and attach a clear image of the card.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  <span>256-Bit Encrypted</span>
                </div>
              </div>

              {/* Field 1 — Aadhaar Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="aadhaar-number-input" className="block text-xs font-bold text-foreground">
                    Field 1 — Aadhaar Number <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Exactly 12 digits (e.g. 1234 5678 9012)
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-2xl border bg-secondary/30 px-4 h-12 transition-colors border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
                    numberError ? "border-destructive focus-within:ring-destructive/20" : ""
                  }`}
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    id="aadhaar-number-input"
                    type={showAadhaar ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={14}
                    value={showAadhaar ? formatAadhaarInput(aadhaarRaw) : getDisplayedAadhaar()}
                    onChange={handleAadhaarChange}
                    placeholder="1234 5678 9012"
                    className="flex-1 bg-transparent outline-none text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAadhaar(!showAadhaar)}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    title={showAadhaar ? "Mask Aadhaar" : "Reveal Aadhaar"}
                    aria-label={showAadhaar ? "Mask Aadhaar Number" : "Show Aadhaar Number"}
                  >
                    {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {numberError && (
                  <p className="text-xs text-destructive font-medium">{numberError}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Your Aadhaar number is masked after entry. We never store or log complete Aadhaar numbers in plaintext.
                </p>
              </div>

              {/* Field 2 — Aadhaar Card Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">
                    Field 2 — Aadhaar Card Photo <span className="text-destructive">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    JPG, JPEG, PNG, or PDF (Max 5MB)
                  </span>
                </div>

                {/* Upload Area / Preview Box */}
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-secondary/40 text-center ${
                      fileError ? "border-destructive/80 bg-destructive/5" : "border-border bg-secondary/15"
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
                        Ensure full card name, 12-digit number, and photo are sharp and legible.
                      </p>
                    </div>
                    <button
                      type="button"
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
                          <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
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
                  onChange={handleFileChange}
                  className="hidden"
                />

                {fileError && (
                  <p className="text-xs text-destructive font-medium">{fileError}</p>
                )}
              </div>

              {/* Security Privacy Notice */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Privacy and Document Storage Policy</span>
                </div>
                <p>
                  Identity documents are stored in secure private storage with strict access controls. Uploaded files are never exposed publicly and are used strictly for equipment lending host verification.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-44"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying Aadhaar...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify Aadhaar</span>
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
