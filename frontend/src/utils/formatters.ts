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

/**
 * Format booking creation timestamp into the required standard:
 * "DD-MM-YYYY, HH:MM AM/PM" (Asia/Kolkata timezone)
 * Example: "26-10-2026, 03:45 PM"
 */
export function formatBookingDateTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(d);
    let day = "";
    let month = "";
    let year = "";
    let hour = "";
    let minute = "";
    let dayPeriod = "";

    for (const part of parts) {
      if (part.type === "day") day = part.value;
      else if (part.type === "month") month = part.value;
      else if (part.type === "year") year = part.value;
      else if (part.type === "hour") hour = part.value;
      else if (part.type === "minute") minute = part.value;
      else if (part.type === "dayPeriod") dayPeriod = part.value.toUpperCase();
    }

    if (day && month && year && hour && minute) {
      return `${day}-${month}-${year}, ${hour}:${minute} ${dayPeriod || "AM"}`;
    }

    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
}
