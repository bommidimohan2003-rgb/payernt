import type { Product } from "@/types";

/**
 * Formats a product owner's address cleanly.
 * Example output: "Hyderabad, Telangana" or "Vijayawada, Andhra Pradesh"
 * Fallback: "Location unavailable"
 */
function safeTrim(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val).trim();
  return "";
}

function parseLocationValue(loc: unknown): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc.trim();
  if (typeof loc === "object" && loc !== null) {
    const obj = loc as Record<string, unknown>;
    const area = safeTrim(obj.area || obj.address || obj.landmark || obj.street);
    const city = safeTrim(obj.city);
    const state = safeTrim(obj.state);
    const parts = [area, city, state].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    const pincode = safeTrim(obj.pincode || obj.postalCode);
    if (pincode) return pincode;
  }
  return "";
}

export function formatOwnerAddress(product: Product | null | undefined): string {
  if (!product) return "Location unavailable";

  const owner = product.owner;
  const ownerCity = safeTrim(owner?.city) || safeTrim((product as any)?.owner_city);
  const ownerState = safeTrim(owner?.state) || safeTrim((product as any)?.owner_state);
  const ownerAddr = safeTrim(owner?.address) || safeTrim((product as any)?.owner_address);
  const ownerLoc = parseLocationValue(owner?.location);
  const prodLoc = parseLocationValue(product.location);

  // 1. Prefer City, State format
  if (ownerCity && ownerState) {
    return `${ownerCity}, ${ownerState}`;
  }

  // 2. City only
  if (ownerCity) {
    return ownerCity;
  }

  // 3. State only
  if (ownerState) {
    return ownerState;
  }

  // 4. Product top-level location if valid
  if (prodLoc && prodLoc !== "Location unavailable") {
    return prodLoc;
  }

  // 5. Owner location if valid
  if (ownerLoc && ownerLoc !== "Location unavailable") {
    return ownerLoc;
  }

  // 6. Owner street address
  if (ownerAddr) {
    return ownerAddr;
  }

  return "Location unavailable";
}

/**
 * Formats a date string into a user-friendly relative timestamp.
 * Example: "Just now", "2h ago", "Yesterday", "3d ago", "2mo ago"
 */
export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y ago`;
  } catch {
    return dateStr;
  }
}
