"""
PAYENT AGENT — PHASE 8.6 ADMIN KNOWLEDGE MANAGEMENT ROUTER
Provides complete administrative control over the Payent Knowledge Base:
- Dashboard statistics & retrieval health
- Paginated search and multi-criteria filtering
- Entry creation, editing, explicit admin verification, and publication lifecycle
- Immutable version history & safe non-destructive rollback
- Draft suggestion review, approval, rejection, and change requests
- Support ticket to sanitized knowledge draft suggestion workflow
- Atomic retrieval index monitoring and manual rebuilds

Strict Security Guarantees:
- Enforces cryptographic admin JWT verification via get_current_admin_user.
- Reviewer identity (approved_by, verified_by, changed_by) derived strictly from JWT claims.
- Never trusts client-supplied identities or frontend role flags.
- Rejects unverified or [VERIFY]-marked entries from publication.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from agent_engine.retrieval.knowledge_manager import (
    KnowledgeIndexManager,
    KnowledgeManager,
)
from auth import decode_access_token
from config import IS_PRODUCTION
from database import DatabaseConnectionError, get_user, is_token_revoked

logger = logging.getLogger("payent.agent.admin_knowledge")

admin_knowledge_router = APIRouter(prefix="/api/admin", tags=["Admin Knowledge Management"])

# Singleton knowledge manager instance proxy
class _KMProxy:
    def __getattr__(self, name):
        return getattr(KnowledgeManager.get_instance(), name)

_km = _KMProxy()


# ============================================================================
# AUTHORIZATION DEPENDENCY
# ============================================================================

def get_current_admin_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Dict[str, Any]:
    """
    Authoritatively verifies administrator identity:
    1. Checks for Bearer token.
    2. Decodes JWT with pinned algorithm, expiration, and nbf validation.
    3. Verifies token is not on the revocation list (JTI check).
    4. Confirms role == 'admin' (case-insensitive) from payload or authoritative user record.
    Never trusts client request body for reviewer or publisher identity.
    """
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with administrator credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    payload = decode_access_token(token, expected_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    if jti and is_token_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = (payload.get("sub") or payload.get("email") or "").strip().lower()
    role = str(payload.get("role") or "").strip().lower()

    # Authoritative DB lookup if available
    user = get_user(email)
    if user:
        user_role = str(user.get("role") or "").strip().lower()
        if user_role:
            role = user_role

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Administrator authorization required for knowledge management.",
        )

    return {
        "email": email,
        "role": "admin",
        "user_id": user.get("id") if user else payload.get("user_id"),
        "full_name": user.get("full_name") if user else payload.get("name"),
    }


# ============================================================================
# SCHEMAS
# ============================================================================

class KnowledgeEntryCreateSchema(BaseModel):
    category: str = Field(..., min_length=2, max_length=100, description="Functional category")
    canonical_question: str = Field(..., min_length=5, max_length=500, description="Canonical question phrasing")
    answer_markdown: str = Field(..., min_length=5, description="Full markdown answer")
    retrieval_type: str = Field("guide", description="'guide', 'live_db', or 'hybrid'")
    synonyms: Optional[List[str]] = Field(default_factory=list, description="Alternative phrasing variants")
    verification_notes: Optional[str] = Field(None, max_length=1000)
    source_document: Optional[str] = Field(None, max_length=255)


class KnowledgeEntryUpdateSchema(BaseModel):
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    canonical_question: Optional[str] = Field(None, min_length=5, max_length=500)
    answer_markdown: Optional[str] = Field(None, min_length=5)
    retrieval_type: Optional[str] = None
    synonyms: Optional[List[str]] = None
    verification_notes: Optional[str] = None
    change_summary: Optional[str] = Field(None, max_length=500)


class VerifyEntrySchema(BaseModel):
    verification_notes: Optional[str] = Field(None, max_length=1000, description="Verification review notes")


class UnpublishEntrySchema(BaseModel):
    reason: Optional[str] = Field("Unpublished by administrator", max_length=500)


class RollbackVersionSchema(BaseModel):
    target_version: int = Field(..., ge=1, description="Target version number to restore")
    reason: Optional[str] = Field(None, max_length=500)


class DraftApproveSchema(BaseModel):
    convert_to_entry: bool = Field(True, description="Whether to generate an entry in pending_review")
    custom_question: Optional[str] = None
    canonical_question: Optional[str] = None
    custom_answer: Optional[str] = None
    answer_markdown: Optional[str] = None
    custom_category: Optional[str] = None
    category: Optional[str] = None
    synonyms: Optional[List[str]] = None


class DraftRejectSchema(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)
    rejection_reason: Optional[str] = Field(None, max_length=500)


class DraftRequestChangesSchema(BaseModel):
    notes: Optional[str] = Field(None, max_length=1000)
    change_notes: Optional[str] = Field(None, max_length=1000)


class TicketSuggestSchema(BaseModel):
    ticket_id: str = Field(..., min_length=1, max_length=128)


# ============================================================================
# DASHBOARD & INDEX STATUS ENDPOINTS
# ============================================================================

@admin_knowledge_router.get("/agent-knowledge/stats")
def get_knowledge_dashboard_stats(
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Returns aggregated knowledge base counts and current retrieval index status."""
    try:
        stats = _km.get_stats()
        return {"success": True, "stats": stats, "data": stats}
    except DatabaseConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payent knowledge repository temporarily unavailable due to database connection delay.",
        )
    except Exception as e:
        logger.error(f"Error fetching knowledge stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve knowledge statistics: {str(e)}",
        )


@admin_knowledge_router.get("/agent-knowledge/index-status")
def get_knowledge_index_status(
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Returns retrieval index operational metadata and health."""
    im = KnowledgeIndexManager.get_instance()
    meta = im.get_metadata()
    status_str = "healthy" if meta.get("is_indexed") else ("empty" if meta.get("document_count", 0) == 0 else "degraded")
    full_meta = {
        "status": status_str,
        "total_indexed": meta.get("document_count", 0),
        **meta,
    }
    return {"success": True, "index_status": full_meta, "data": full_meta}


@admin_knowledge_router.post("/agent-knowledge/index-refresh")
def trigger_manual_index_refresh(
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Manually triggers an atomic index rebuild from active published articles."""
    im = KnowledgeIndexManager.get_instance()
    res = im.refresh_index_manual(triggered_by=admin["email"])
    if not res.get("success"):
        return {
            "success": False,
            "error": "Failed to refresh knowledge index. Previous valid index has been safely retained.",
            "index_status": res,
            "data": res,
        }
    full_data = {
        "status": "healthy" if res.get("is_indexed") else ("empty" if res.get("document_count", 0) == 0 else "degraded"),
        "total_indexed": res.get("document_count", 0),
        **res,
    }
    return {
        "success": True,
        "message": f"Index rebuilt successfully with {res.get('document_count', 0)} active documents.",
        "index_status": full_data,
        "data": full_data,
    }


# ============================================================================
# KNOWLEDGE BASE ENTRIES ENDPOINTS
# ============================================================================

@admin_knowledge_router.get("/agent-knowledge")
def list_knowledge_entries(
    search: Optional[str] = Query(None, description="Search questions, answers, and synonyms"),
    query: Optional[str] = Query(None, description="Search query alias for search"),
    category: Optional[str] = Query(None, description="Category filter"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter"),
    is_verified: Optional[bool] = Query(None, description="Verification status filter"),
    retrieval_type: Optional[str] = Query(None, description="Retrieval type filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    per_page: Optional[int] = Query(None, description="Items per page (alias for page_size)"),
    sort_by: str = Query("updated_at", description="Field to sort by"),
    sort_order: str = Query("desc", description="'asc' or 'desc'"),
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Retrieves paginated knowledge base entries with search and multi-criteria filtering."""
    try:
        actual_page_size = per_page if per_page is not None else page_size
        actual_search = query if query is not None else search
        result = _km.list_entries_paginated(
            search=actual_search,
            category=category,
            status=status_filter,
            is_verified=is_verified,
            retrieval_type=retrieval_type,
            page=page,
            page_size=actual_page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        result["page_size"] = actual_page_size
        result["per_page"] = actual_page_size
        return {"success": True, **result}
    except DatabaseConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payent knowledge repository temporarily unavailable due to database connection delay.",
        )
    except Exception as e:
        logger.error(f"Error listing knowledge entries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.get("/agent-knowledge/{knowledge_id}")
def get_knowledge_entry_detail(
    knowledge_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Retrieves a single knowledge entry with synonyms and version history."""
    entry = _km.get_entry(knowledge_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge entry '{knowledge_id}' not found.",
        )
    versions = _km.get_version_history(knowledge_id)
    return {
        "success": True,
        "entry": entry,
        "data": entry,
        "version_history": versions,
        "versions": versions,
    }


@admin_knowledge_router.post("/agent-knowledge", status_code=status.HTTP_201_CREATED)
def create_knowledge_entry(
    data: KnowledgeEntryCreateSchema,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Creates a new knowledge entry.
    Initial state is pending_review and is_verified=False.
    Never automatically publishes to customer retrieval.
    """
    try:
        entry = _km.create_entry(
            category=data.category,
            canonical_question=data.canonical_question,
            answer_markdown=data.answer_markdown,
            retrieval_type=data.retrieval_type,
            status="pending_review",
            is_verified=False,
            verification_notes=data.verification_notes,
            source_document=data.source_document,
            synonyms=data.synonyms,
            approved_by=admin["email"],
        )
        return {"success": True, "entry": entry, "data": entry}
    except Exception as e:
        logger.error(f"Error creating knowledge entry: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@admin_knowledge_router.put("/agent-knowledge/{knowledge_id}")
def update_knowledge_entry(
    knowledge_id: str,
    data: KnowledgeEntryUpdateSchema,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Updates an existing knowledge entry.
    Bumps version number and creates an immutable version history record.
    Never automatically publishes edited content.
    """
    current = _km.get_entry(knowledge_id)
    if not current:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge entry '{knowledge_id}' not found.",
        )

    summary = data.change_summary or f"Revised by {admin['email']}"
    updated = _km.update_entry(
        knowledge_id=knowledge_id,
        canonical_question=data.canonical_question,
        answer_markdown=data.answer_markdown,
        category=data.category,
        retrieval_type=data.retrieval_type,
        verification_notes=data.verification_notes,
        new_synonyms=data.synonyms,
        changed_by=admin["email"],
        change_summary=summary,
    )
    return {"success": True, "entry": updated, "data": updated}


@admin_knowledge_router.post("/agent-knowledge/{knowledge_id}/verify")
def verify_knowledge_entry(
    knowledge_id: str,
    data: VerifyEntrySchema = None,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Explicit administrative verification action.
    Validates content and marks is_verified=True.
    Rejects entries containing unresolved [VERIFY IN PAYENT] markers.
    Verification does NOT publish automatically.
    """
    notes = data.verification_notes if data else None
    try:
        entry = _km.verify_entry(
            knowledge_id=knowledge_id,
            verified_by=admin["email"],
            verification_notes=notes,
        )
        if not entry:
            raise HTTPException(status_code=404, detail=f"Knowledge entry '{knowledge_id}' not found.")
        return {"success": True, "entry": entry, "data": entry}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        logger.error(f"Error verifying knowledge entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.post("/agent-knowledge/{knowledge_id}/revoke-verification")
def revoke_knowledge_verification(
    knowledge_id: str,
    data: UnpublishEntrySchema = None,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Revokes verification status and removes published articles from active retrieval.
    """
    reason = data.reason if data else "Verification revoked by administrator"
    entry = _km.revoke_verification(
        knowledge_id=knowledge_id,
        revoked_by=admin["email"],
        reason=reason,
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Knowledge entry '{knowledge_id}' not found.")
    return {"success": True, "entry": entry, "data": entry}


@admin_knowledge_router.post("/agent-knowledge/{knowledge_id}/publish")
def publish_knowledge_entry(
    knowledge_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Publishes an entry to customer retrieval.
    Strictly requires:
    1. Entry exists.
    2. Content is verified (is_verified=True).
    3. No unresolved [VERIFY IN PAYENT] markers.
    4. Successful atomic index rebuild.
    """
    try:
        published = _km.publish_entry(
            knowledge_id=knowledge_id,
            approved_by=admin["email"],
            is_admin=True,
            require_verified=True,
        )
        if not published:
            raise HTTPException(status_code=404, detail=f"Knowledge entry '{knowledge_id}' not found.")
        return {"success": True, "entry": published, "data": published, "index_refreshed": True}
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Error publishing knowledge entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.post("/agent-knowledge/{knowledge_id}/unpublish")
def unpublish_knowledge_entry(
    knowledge_id: str,
    data: UnpublishEntrySchema = None,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Reverts an entry from published to pending_review and refreshes the retrieval index.
    Preserves version history.
    """
    reason = data.reason if data else "Unpublished by administrator"
    try:
        unpublished = _km.unpublish_entry(
            knowledge_id=knowledge_id,
            reason=reason,
        )
        if not unpublished:
            raise HTTPException(status_code=404, detail=f"Knowledge entry '{knowledge_id}' not found.")
        return {"success": True, "entry": unpublished, "data": unpublished, "index_refreshed": True}
    except Exception as e:
        logger.error(f"Error unpublishing knowledge entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.get("/agent-knowledge/{knowledge_id}/versions")
def get_knowledge_version_history(
    knowledge_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Returns immutable version history audit trail for an entry."""
    entry = _km.get_entry(knowledge_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Knowledge entry '{knowledge_id}' not found.")
    versions = _km.get_version_history(knowledge_id)
    return {"success": True, "versions": versions, "data": versions}


@admin_knowledge_router.post("/agent-knowledge/{knowledge_id}/rollback")
def rollback_knowledge_entry_version(
    knowledge_id: str,
    data: RollbackVersionSchema,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Reverts an entry to a historical version.
    Crucial safety invariant: Creates a NEW version recording the rollback audit trail.
    Never overwrites or deletes historical version records!
    """
    entry = _km.rollback_entry_version(
        knowledge_id=knowledge_id,
        target_version=data.target_version,
        rolled_back_by=admin["email"],
        reason=data.reason,
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target version {data.target_version} not found for entry '{knowledge_id}'.",
        )
    return {"success": True, "entry": entry, "data": entry}


# ============================================================================
# DRAFT SUGGESTIONS & SUPPORT INTEGRATION ENDPOINTS
# ============================================================================

@admin_knowledge_router.get("/agent-knowledge-drafts")
def list_knowledge_drafts(
    status_filter: Optional[str] = Query(None, alias="status", description="Draft status filter"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    per_page: Optional[int] = Query(None, description="Items per page (alias for page_size)"),
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Lists draft suggestions with optional status/category filter and pagination."""
    try:
        actual_size = per_page if per_page is not None else page_size
        res = _km.list_drafts(
            status=status_filter,
            category=category,
            page=page,
            page_size=actual_size,
        )
        res["page_size"] = actual_size
        res["per_page"] = actual_size
        return {"success": True, **res}
    except DatabaseConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payent knowledge repository temporarily unavailable due to database connection delay.",
        )
    except Exception as e:
        logger.error(f"Error listing drafts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.get("/agent-knowledge-drafts/{draft_id}")
def get_knowledge_draft_detail(
    draft_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Retrieves a single knowledge draft suggestion."""
    draft = _km.get_draft(draft_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge draft '{draft_id}' not found.",
        )
    return {"success": True, "draft": draft}


@admin_knowledge_router.post("/agent-knowledge-drafts/{draft_id}/approve")
def approve_knowledge_draft(
    draft_id: str,
    data: DraftApproveSchema,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Approves a draft suggestion and converts it into a pending_review knowledge entry.
    CRITICAL: Never automatically publishes the entry to customer retrieval!
    """
    try:
        q = data.canonical_question or data.custom_question
        a = data.answer_markdown or data.custom_answer
        cat = data.category or data.custom_category
        res = _km.approve_draft(
            draft_id=draft_id,
            reviewed_by=admin["email"],
            convert_to_entry=data.convert_to_entry,
            custom_question=q,
            custom_answer=a,
            custom_category=cat,
            synonyms=data.synonyms,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error approving draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.post("/agent-knowledge-drafts/{draft_id}/reject")
def reject_knowledge_draft(
    draft_id: str,
    data: DraftRejectSchema = None,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Rejects a knowledge draft suggestion."""
    reason = (data.rejection_reason or data.reason) if data else None
    try:
        res = _km.reject_draft(
            draft_id=draft_id,
            reviewed_by=admin["email"],
            reason=reason,
            rejection_reason=reason,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error rejecting draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.post("/agent-knowledge-drafts/{draft_id}/request-changes")
def request_changes_on_knowledge_draft(
    draft_id: str,
    data: DraftRequestChangesSchema = None,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Marks a draft as changes_requested with administrator notes."""
    notes = (data.change_notes or data.notes) if data else None
    try:
        res = _km.request_changes_draft(
            draft_id=draft_id,
            reviewed_by=admin["email"],
            notes=notes,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error requesting changes on draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.post("/agent-knowledge-drafts/suggest-from-ticket")
def suggest_knowledge_from_ticket_endpoint(
    data: TicketSuggestSchema,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """
    Converts a resolved support ticket into a sanitized knowledge draft suggestion:
    - Strips customer phone numbers, emails, cards, OTPs, PINs, transaction IDs.
    - Excludes internal confidential notes.
    - Runs duplicate similarity detection.
    - Stores as a draft suggestion for mandatory human review.
    - Never automatically publishes!
    """
    try:
        draft = _km.suggest_knowledge_from_ticket(
            ticket_id=data.ticket_id,
            admin_email=admin["email"],
        )
        return {"success": True, "message": "Draft created successfully", "draft": draft, "data": draft}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating draft from ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@admin_knowledge_router.post("/support/{ticket_id}/suggest-knowledge")
def suggest_knowledge_direct_from_support_ticket(
    ticket_id: str,
    admin: Dict[str, Any] = Depends(get_current_admin_user),
):
    """Direct support ticket route alias for 'Suggest as Knowledge Article'."""
    try:
        draft = _km.suggest_knowledge_from_ticket(
            ticket_id=ticket_id,
            admin_email=admin["email"],
        )
        return {"success": True, "message": "Draft created successfully", "draft": draft, "data": draft}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error creating draft from ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))
