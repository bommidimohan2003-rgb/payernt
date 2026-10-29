import { toast } from "sonner";
import { isFakeOrDeletedProduct } from "@/utils/productFilters";
import type { Product } from "@/types";

export interface ShareResult {
  success: boolean;
  method: "native" | "clipboard" | "modal" | "aborted" | "error";
  url: string;
  error?: string;
}

/**
 * Returns the canonical, publicly accessible URL for a rental product.
 * Formats directly to `/product/:id` which is public and accessible without login.
 */
export function getCanonicalProductUrl(productId: string | number): string {
  const cleanId = String(productId || "").trim();
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://payent.in";
  return `${origin}/product/${encodeURIComponent(cleanId)}`;
}

/**
 * Validates whether a product is eligible for public sharing.
 * Prevents sharing unpublished, unapproved, deleted, or fake listings.
 */
export function isProductShareable(product: any): { eligible: boolean; reason?: string } {
  if (!product || (!product.id && product.id !== 0)) {
    return { eligible: false, reason: "Product details are missing or invalid." };
  }

  if (isFakeOrDeletedProduct(product)) {
    return { eligible: false, reason: "This gear listing is no longer available." };
  }

  if (product.deleted === true || product.is_deleted === true || product.isDeleted === true) {
    return { eligible: false, reason: "This product listing has been deleted." };
  }

  // Unpublished products under admin review or draft cannot be shared publicly
  const status = String(product.status || product.reviewStatus || product.review_status || "").toLowerCase().trim();
  if (status && !["approved", "active", "published", "available"].includes(status)) {
    return { eligible: false, reason: "This listing is currently pending review or unpublished." };
  }

  return { eligible: true };
}

/**
 * Authoritative share execution helper for Payrent rental products.
 * 1. Checks eligibility (not deleted / unpublished / fake).
 * 2. Generates canonical public URL.
 * 3. Uses Web Share API when supported.
 * 4. Falls back to Clipboard API.
 * 5. Falls back to manual copy modal if clipboard is unavailable/denied.
 */
export async function shareRentalProduct(
  product: Partial<Product> | any,
  onManualCopyFallback?: (url: string) => void
): Promise<ShareResult> {
  const validation = isProductShareable(product);
  if (!validation.eligible) {
    const errorMsg = validation.reason || "This product cannot be shared.";
    toast.error(errorMsg);
    return { success: false, method: "error", url: "", error: errorMsg };
  }

  const canonicalUrl = getCanonicalProductUrl(product.id);
  const title = product.title || product.name || "Rent on Payent";
  const shareText = `Rent ${title} on Payent — Verified peer-to-peer gear rentals.`;

  // 1. Attempt Native Web Share API if supported
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const shareData = {
      title,
      text: shareText,
      url: canonicalUrl,
    };

    const canShare = typeof navigator.canShare === "function" ? navigator.canShare(shareData) : true;
    if (canShare) {
      try {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
        return { success: true, method: "native", url: canonicalUrl };
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // User closed the share sheet
          return { success: false, method: "aborted", url: canonicalUrl };
        }
        // Fall through to clipboard if native share failed unexpectedly
      }
    }
  }

  // 2. Attempt Clipboard API write
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      toast.success("Product link copied to clipboard!");
      return { success: true, method: "clipboard", url: canonicalUrl };
    } catch {
      // Fall through to manual selectable field fallback
    }
  }

  // 3. Fallback: Manual copy dialog/field
  if (onManualCopyFallback) {
    onManualCopyFallback(canonicalUrl);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("payent_manual_share_fallback", {
        detail: {
          url: canonicalUrl,
          title,
        },
      })
    );
  }

  return { success: true, method: "modal", url: canonicalUrl };
}

