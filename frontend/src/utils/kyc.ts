export type KycStatusValue = "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED";

export interface NormalizedKycStatus {
  status: KycStatusValue;
  documentType: string | null;
  maskedNumber: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  providerStatus: string | null;
  allowResubmission: boolean;
}

const VALID_KYC_STATUSES = new Set<KycStatusValue>([
  "NOT_STARTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

/**
 * Parses GET /api/kyc/status responses (flat top-level backend JSON or optional `.data` wrapper)
 * into a safe, strictly typed KYC status object.
 * Never fabricates APPROVED state when status is missing or malformed.
 */
export function parseKycStatusResponse(raw: unknown): NormalizedKycStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const top = raw as Record<string, unknown>;
  if (top.success === false) return null;

  const payload =
    top.data && typeof top.data === "object"
      ? (top.data as Record<string, unknown>)
      : top;

  const rawStatus =
    typeof payload.status === "string"
      ? payload.status.trim().toUpperCase()
      : "";

  const status: KycStatusValue = VALID_KYC_STATUSES.has(rawStatus as KycStatusValue)
    ? (rawStatus as KycStatusValue)
    : "NOT_STARTED";

  const documentType =
    typeof payload.documentType === "string" && payload.documentType.trim()
      ? payload.documentType.trim()
      : typeof payload.document_type === "string" && payload.document_type.trim()
      ? payload.document_type.trim()
      : null;

  const maskedNumber =
    typeof payload.maskedNumber === "string" && payload.maskedNumber.trim()
      ? payload.maskedNumber.trim()
      : typeof payload.masked_number === "string" && payload.masked_number.trim()
      ? payload.masked_number.trim()
      : null;

  const submittedAt =
    typeof payload.submittedAt === "string" && payload.submittedAt.trim()
      ? payload.submittedAt.trim()
      : typeof payload.submitted_at === "string" && payload.submitted_at.trim()
      ? payload.submitted_at.trim()
      : null;

  const verifiedAt =
    typeof payload.verifiedAt === "string" && payload.verifiedAt.trim()
      ? payload.verifiedAt.trim()
      : typeof payload.verified_at === "string" && payload.verified_at.trim()
      ? payload.verified_at.trim()
      : null;

  const rejectionReason =
    typeof payload.rejectionReason === "string" && payload.rejectionReason.trim()
      ? payload.rejectionReason.trim()
      : typeof payload.rejection_reason === "string" && payload.rejection_reason.trim()
      ? payload.rejection_reason.trim()
      : null;

  const providerStatus =
    typeof payload.providerStatus === "string" && payload.providerStatus.trim()
      ? payload.providerStatus.trim()
      : typeof payload.provider_status === "string" && payload.provider_status.trim()
      ? payload.provider_status.trim()
      : null;

  const allowResubmission = Boolean(
    payload.allowResubmission ?? payload.allow_resubmission ?? status !== "APPROVED"
  );

  return {
    status,
    documentType,
    maskedNumber,
    submittedAt,
    verifiedAt,
    rejectionReason,
    providerStatus,
    allowResubmission,
  };
}
