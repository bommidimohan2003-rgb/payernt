import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  ArrowRight,
  Info,
  RefreshCw,
} from "lucide-react";
import { api } from "@/utils/api";
import payerntApi from "@/payernt/payerntApiService";
import { useAuth } from "@/hooks/useAuth";

export type KycPortalRole = "renter" | "vendor";

export interface KycStatusBannerProps {
  role: KycPortalRole;
  className?: string;
}

export type NormalizedKycStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_INFORMATION";

export function normalizeKycStatus(rawStatus?: string | null): NormalizedKycStatus {
  const s = String(rawStatus || "").toUpperCase().trim();
  if (!s || s === "NOT_STARTED" || s === "UNVERIFIED" || s === "NONE") {
    return "NOT_STARTED";
  }
  if (["PENDING", "PENDING_REVIEW", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"].includes(s)) {
    return "PENDING";
  }
  if (["APPROVED", "VERIFIED", "ACTIVE"].includes(s)) {
    return "APPROVED";
  }
  if (["REJECTED", "DECLINED", "FAILED"].includes(s)) {
    return "REJECTED";
  }
  if (["NEEDS_INFORMATION", "ACTION_REQUIRED", "ADDITIONAL_INFO_REQUIRED"].includes(s)) {
    return "NEEDS_INFORMATION";
  }
  return "NOT_STARTED";
}

export function KycStatusBanner({ role, className = "" }: KycStatusBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<NormalizedKycStatus>("NOT_STARTED");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [expectedDoc, setExpectedDoc] = useState<string>(role === "vendor" ? "Aadhaar" : "PAN Card");

  const kycRoute = role === "vendor" ? "/payernt/kyc" : "/kyc";

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      if (role === "vendor") {
        const res = await payerntApi.getKycStatus();
        if (res && res.success) {
          setStatus(normalizeKycStatus(res.status));
          setRejectionReason(res.rejectionReason || null);
          setExpectedDoc(res.expectedDocumentType === "AADHAAR" ? "Aadhaar" : "PAN Card");
        }
      } else {
        const res = await api.getKycStatus();
        if (res && res.success) {
          setStatus(normalizeKycStatus(res.status));
          setRejectionReason(res.rejectionReason || null);
          setExpectedDoc(res.expectedDocumentType === "PAN" ? "PAN Card" : "Aadhaar");
        }
      }
    } catch {
      // Degrade gracefully without crashing UI
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchStatus();

    const handleUpdate = () => {
      fetchStatus();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("payent_kyc_updated", handleUpdate);
      return () => {
        window.removeEventListener("payent_kyc_updated", handleUpdate);
      };
    }
  }, [fetchStatus]);

  const handleAction = () => {
    try {
      navigate({ to: kycRoute as any });
    } catch {
      if (typeof window !== "undefined") {
        window.location.href = kycRoute;
      }
    }
  };

  if (loading) {
    return null;
  }

  // 1. APPROVED Status: Discreet verified indicator; avoid repeatedly prompting verified users
  if (status === "APPROVED") {
    return (
      <div
        className={`w-full rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs ${className}`}
        role="status"
        aria-label="KYC Verified"
      >
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong className="font-bold">Your KYC is verified.</strong> Account is fully verified for {role === "vendor" ? "lender listings & payouts" : "rentals & bookings"}.
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
          Verified
        </span>
      </div>
    );
  }

  // 2. PENDING Status: Verification in progress
  if (status === "PENDING") {
    return (
      <div
        className={`w-full rounded-2xl bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
        role="status"
        aria-label="KYC Under Review"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-sky-950 dark:text-sky-200">
              Your KYC verification is in progress.
            </div>
            <p className="text-sky-800 dark:text-sky-300/80 mt-0.5">
              Our compliance team is verifying your submitted {expectedDoc}. Features will be unlocked shortly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAction}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
        >
          <span>View Status</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // 3. REJECTED Status: Needs attention
  if (status === "REJECTED") {
    return (
      <div
        className={`w-full rounded-2xl bg-red-500/10 dark:bg-red-500/10 border border-red-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
        role="alert"
        aria-label="KYC Rejected"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 shrink-0 mt-0.5 sm:mt-0">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-red-950 dark:text-red-200">
              Your KYC needs attention. Please review and resubmit.
            </div>
            {rejectionReason ? (
              <p className="text-red-800 dark:text-red-300/90 mt-0.5 font-medium">
                Reason: {rejectionReason}
              </p>
            ) : (
              <p className="text-red-800 dark:text-red-300/80 mt-0.5">
                The uploaded {expectedDoc} could not be verified. Please update your document to proceed.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAction}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
        >
          <span>Review & Resubmit</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // 4. NEEDS_INFORMATION Status: Additional info needed
  if (status === "NEEDS_INFORMATION") {
    return (
      <div
        className={`w-full rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
        role="alert"
        aria-label="KYC Information Required"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-amber-950 dark:text-amber-200">
              Additional information is required to complete verification.
            </div>
            <p className="text-amber-800 dark:text-amber-300/80 mt-0.5">
              Please review the feedback provided by admin reviewers and supply the requested document details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAction}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
        >
          <span>Update Information</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // 5. NOT_STARTED Status: Start verification
  return (
    <div
      className={`w-full rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${className}`}
      role="status"
      aria-label="KYC Required"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div>
          <div className="font-bold text-amber-950 dark:text-amber-200">
            Complete your KYC to access eligible features.
          </div>
          <p className="text-amber-800 dark:text-amber-300/80 mt-0.5">
            {role === "vendor"
              ? "Verify your identity with Aadhaar to list gear and receive rental payouts securely."
              : "Verify your identity with PAN card to complete bookings and rent high-value tech gear."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAction}
        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
      >
        <span>Complete KYC</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

