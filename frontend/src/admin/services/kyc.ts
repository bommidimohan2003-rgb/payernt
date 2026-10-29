import { adminApi, API_BASE } from "./api";

export interface KycAuditEntry {
  reviewer_email: string;
  reviewed_at: string;
  decision: string;
  reason?: string | null;
}

export interface AdminKycVerification {
  id: string;
  user_id: string;
  email: string;
  account_type:
    | "payernt"
    | "payrent"
    | "vendor"
    | "lender"
    | "renter"
    | "customer"
    | string;
  document_type: "AADHAAR" | "PAN" | string;
  document_number_masked: string;
  document_file_name?: string | null;
  document_mime_type?: string | null;
  document_file_size?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFORMATION" | string;
  verification_source?: string;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  applicant_name?: string;
  applicant_phone?: string | null;
  applicant_avatar?: string | null;
  audit_history?: KycAuditEntry[];
}

export interface KycStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  needs_information: number;
}

export interface KycDocumentPayload {
  fileName?: string | null;
  fileType?: string | null;
  fileData?: string | null;
  maskedNumber?: string | null;
  fileSize?: number | null;
}

export interface KycReviewPayload {
  action: "approve" | "reject" | "needs_information" | "request_info";
  rejectionReason?: string;
  rejection_reason?: string;
  notes?: string;
}

export const kycService = {
  async getKycList(): Promise<{
    verifications: AdminKycVerification[];
    stats: KycStats;
  }> {
    const res = await adminApi.get("/kyc/list");
    const data = res.data || {};
    const verifications: AdminKycVerification[] = Array.isArray(
      data.verifications,
    )
      ? data.verifications
      : [];
    const stats: KycStats = data.stats || {
      total: verifications.length,
      pending: verifications.filter(
        (v) => (v.status || "").toUpperCase() === "PENDING",
      ).length,
      approved: verifications.filter(
        (v) => (v.status || "").toUpperCase() === "APPROVED",
      ).length,
      rejected: verifications.filter(
        (v) => (v.status || "").toUpperCase() === "REJECTED",
      ).length,
      needs_information: verifications.filter((v) =>
        ["NEEDS_INFORMATION", "NEEDS_INFO"].includes(
          (v.status || "").toUpperCase(),
        ),
      ).length,
    };
    return { verifications, stats };
  },

  async getKycStats(): Promise<KycStats> {
    try {
      const res = await adminApi.get("/kyc/stats");
      if (res.data?.stats) return res.data.stats;
    } catch {
      // fallback to list calculation
    }
    const { stats } = await this.getKycList();
    return stats;
  },

  async getKycDetails(verificationId: string): Promise<{
    verification: AdminKycVerification;
    document: KycDocumentPayload;
  }> {
    const res = await adminApi.get(
      `/kyc/${encodeURIComponent(verificationId)}`,
    );
    return {
      verification: res.data.verification,
      document: res.data.document || {},
    };
  },

  async getKycDocument(verificationId: string): Promise<KycDocumentPayload> {
    try {
      // First try the admin specific endpoint
      const details = await this.getKycDetails(verificationId);
      if (details.document && details.document.fileData) {
        return details.document;
      }
    } catch {
      // fallback to direct document endpoint
    }

    let token =
      localStorage.getItem("payent:admin:token") ||
      localStorage.getItem("payent:token") ||
      localStorage.getItem("paye₹nt_token") ||
      localStorage.getItem("payernt_token");
    if (token) {
      token = token.trim().replace(/^"|"$/g, "");
    }

    const res = await fetch(
      `${API_BASE}/api/kyc/document/${encodeURIComponent(verificationId)}`,
      {
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to load document (${res.status})`);
    }

    const data = await res.json();
    return {
      fileName: data.fileName,
      fileType: data.fileType,
      fileData: data.fileData,
      maskedNumber: data.maskedNumber,
      fileSize: data.fileSize,
    };
  },

  async reviewKyc(
    verificationId: string,
    payload: KycReviewPayload,
  ): Promise<{
    success: boolean;
    status: string;
    message: string;
    audit?: Record<string, unknown>;
  }> {
    const res = await adminApi.post(
      `/kyc/${encodeURIComponent(verificationId)}/review`,
      payload,
    );
    return res.data;
  },
};
