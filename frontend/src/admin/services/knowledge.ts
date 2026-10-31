import { adminApi } from "./api";

export interface KnowledgeEntry {
  id: string;
  category: string;
  canonical_question: string;
  answer_markdown: string;
  retrieval_type: "GUIDE" | "LIVE_DB" | "HYBRID" | string;
  status: "published" | "pending_review" | "draft" | "archived" | string;
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  version: number;
  created_at?: string | null;
  updated_at?: string | null;
  synonyms?: string[];
  has_verify_marker?: boolean;
}

export interface KnowledgeVersion {
  id: number;
  knowledge_id: string;
  version: number;
  category: string;
  canonical_question: string;
  answer_markdown: string;
  retrieval_type: string;
  status: string;
  is_verified: boolean;
  changed_by?: string | null;
  change_reason?: string | null;
  created_at: string;
}

export interface KnowledgeDraft {
  id: string;
  source_ticket_id?: string | null;
  customer_query: string;
  suggested_answer: string;
  category: string;
  suggested_retrieval_type: string;
  similarity_score?: number;
  duplicate_of_id?: string | null;
  status: "pending_review" | "approved" | "rejected" | "changes_requested" | string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface KnowledgeStats {
  total: number;
  published: number;
  pending_review: number;
  draft_suggestions: number;
  unpublished: number;
  verified: number;
  needs_verification: number;
  index_status: {
    status: "healthy" | "empty" | "degraded" | string;
    total_indexed: number;
    last_refresh?: string | null;
    synonym_count?: number;
  };
}

export interface IndexHealth {
  status: "healthy" | "empty" | "degraded" | string;
  total_indexed: number;
  last_refresh?: string | null;
  synonym_count?: number;
  in_memory_synonyms_loaded?: number;
}

export interface ListEntriesParams {
  query?: string;
  category?: string;
  status?: string;
  is_verified?: boolean | string;
  retrieval_type?: string;
  page?: number;
  per_page?: number;
}

export interface ListDraftsParams {
  status?: string;
  category?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedResult<T> {
  success: boolean;
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ----------------------------------------------------------------------
// Knowledge Service Functions
// ----------------------------------------------------------------------

export const getKnowledgeStats = async (): Promise<KnowledgeStats> => {
  const res = await adminApi.get("/agent-knowledge/stats");
  return res.data?.data || res.data;
};

export const listKnowledgeEntries = async (
  params?: ListEntriesParams
): Promise<PaginatedResult<KnowledgeEntry>> => {
  const res = await adminApi.get("/agent-knowledge", { params });
  return res.data;
};

export const getKnowledgeEntry = async (
  knowledgeId: string
): Promise<{ success: boolean; data: KnowledgeEntry; versions?: KnowledgeVersion[] }> => {
  const res = await adminApi.get(`/agent-knowledge/${knowledgeId}`);
  return res.data;
};

export const createKnowledgeEntry = async (data: {
  category: string;
  canonical_question: string;
  answer_markdown: string;
  retrieval_type?: string;
  synonyms?: string[];
  verification_notes?: string;
}): Promise<{ success: boolean; data: KnowledgeEntry }> => {
  const res = await adminApi.post("/agent-knowledge", data);
  return res.data;
};

export const updateKnowledgeEntry = async (
  knowledgeId: string,
  data: {
    category?: string;
    canonical_question?: string;
    answer_markdown?: string;
    retrieval_type?: string;
    synonyms?: string[];
    change_reason?: string;
  }
): Promise<{ success: boolean; data: KnowledgeEntry }> => {
  const res = await adminApi.put(`/agent-knowledge/${knowledgeId}`, data);
  return res.data;
};

export const verifyKnowledgeEntry = async (
  knowledgeId: string,
  verificationNotes?: string
): Promise<{ success: boolean; data: KnowledgeEntry }> => {
  const res = await adminApi.post(`/agent-knowledge/${knowledgeId}/verify`, {
    verification_notes: verificationNotes || "Verified by admin",
  });
  return res.data;
};

export const revokeKnowledgeVerification = async (
  knowledgeId: string,
  reason?: string
): Promise<{ success: boolean; data: KnowledgeEntry }> => {
  const res = await adminApi.post(`/agent-knowledge/${knowledgeId}/revoke-verification`, {
    reason: reason || "Verification revoked",
  });
  return res.data;
};

export const publishKnowledgeEntry = async (
  knowledgeId: string
): Promise<{ success: boolean; data: KnowledgeEntry; index_refreshed: boolean }> => {
  const res = await adminApi.post(`/agent-knowledge/${knowledgeId}/publish`);
  return res.data;
};

export const unpublishKnowledgeEntry = async (
  knowledgeId: string,
  reason?: string
): Promise<{ success: boolean; data: KnowledgeEntry; index_refreshed: boolean }> => {
  const res = await adminApi.post(`/agent-knowledge/${knowledgeId}/unpublish`, {
    reason: reason || "Unpublished by admin",
  });
  return res.data;
};

export const getKnowledgeVersionHistory = async (
  knowledgeId: string
): Promise<{ success: boolean; data: KnowledgeVersion[] }> => {
  const res = await adminApi.get(`/agent-knowledge/${knowledgeId}/versions`);
  return res.data;
};

export const rollbackKnowledgeVersion = async (
  knowledgeId: string,
  version: number,
  reason?: string
): Promise<{ success: boolean; data: KnowledgeEntry }> => {
  const res = await adminApi.post(`/agent-knowledge/${knowledgeId}/rollback`, {
    target_version: version,
    rollback_reason: reason || `Rollback to version ${version}`,
  });
  return res.data;
};

export const listKnowledgeDrafts = async (
  params?: ListDraftsParams
): Promise<PaginatedResult<KnowledgeDraft>> => {
  const res = await adminApi.get("/agent-knowledge-drafts", { params });
  return res.data;
};

export const getKnowledgeDraft = async (
  draftId: string
): Promise<{ success: boolean; data: KnowledgeDraft }> => {
  const res = await adminApi.get(`/agent-knowledge-drafts/${draftId}`);
  return res.data;
};

export const approveKnowledgeDraft = async (
  draftId: string,
  data?: {
    category?: string;
    canonical_question?: string;
    answer_markdown?: string;
    retrieval_type?: string;
    synonyms?: string[];
  }
): Promise<{ success: boolean; draft: KnowledgeDraft; knowledge_entry: KnowledgeEntry }> => {
  const res = await adminApi.post(`/agent-knowledge-drafts/${draftId}/approve`, data || {});
  return res.data;
};

export const rejectKnowledgeDraft = async (
  draftId: string,
  rejectionReason: string
): Promise<{ success: boolean; data: KnowledgeDraft }> => {
  const res = await adminApi.post(`/agent-knowledge-drafts/${draftId}/reject`, {
    rejection_reason: rejectionReason,
  });
  return res.data;
};

export const requestChangesKnowledgeDraft = async (
  draftId: string,
  changeNotes: string
): Promise<{ success: boolean; data: KnowledgeDraft }> => {
  const res = await adminApi.post(`/agent-knowledge-drafts/${draftId}/request-changes`, {
    change_notes: changeNotes,
  });
  return res.data;
};

export const suggestKnowledgeFromTicket = async (
  ticketId: string
): Promise<{ success: boolean; message: string; data: KnowledgeDraft }> => {
  const res = await adminApi.post(`/support/${ticketId}/suggest-knowledge`);
  return res.data;
};

export const getIndexStatus = async (): Promise<{ success: boolean; data: IndexHealth }> => {
  const res = await adminApi.get("/agent-knowledge/index-status");
  return res.data;
};

export const refreshIndexManual = async (): Promise<{
  success: boolean;
  message: string;
  data: IndexHealth;
}> => {
  const res = await adminApi.post("/agent-knowledge/index-refresh");
  return res.data;
};
