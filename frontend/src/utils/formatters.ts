import type { Product } from "@/types";

/**
 * Formats a product owner's address cleanly.
 * Example output: "Hyderabad, Telangana" or "Vijayawada, Andhra Pradesh"
 * Fallback: "Location unavailable"
 */
const LOCATION_PLACEHOLDERS = new Set([
  "",
  "null",
  "none",
  "undefined",
  "n/a",
  "na",
  "not provided",
  "location unavailable",
]);

function safeTrim(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val).trim();
  return "";
}

function cleanLocToken(val: unknown, allowCountryOnly = false): string {
  const raw = safeTrim(val);
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (LOCATION_PLACEHOLDERS.has(lower)) return "";
  if (!allowCountryOnly && (lower === "india" || lower === "in")) return "";
  if (raw === lower && /[a-z]/i.test(raw)) {
    return raw.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
  }
  return raw;
}

function parseLocationValue(loc: unknown): string {
  if (!loc) return "";
  if (typeof loc === "string") return cleanLocToken(loc);
  if (typeof loc === "object" && loc !== null) {
    const obj = loc as Record<string, unknown>;
    const area = cleanLocToken(obj.area || obj.address || obj.landmark || obj.street);
    const city = cleanLocToken(obj.city);
    const state = cleanLocToken(obj.state);
    const parts = [area, city, state].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    const pincode = cleanLocToken(obj.pincode || obj.postalCode);
    if (pincode) return pincode;
  }
  return "";
}

function joinUniqueLocationParts(parts: string[]): string {
  const unique: string[] = [];
  for (const part of parts) {
    const clean = cleanLocToken(part);
    if (!clean) continue;
    const lower = clean.toLowerCase();
    const alreadyPresent = unique.some(
      (existing) =>
        existing.toLowerCase() === lower ||
        existing.toLowerCase().includes(lower) ||
        lower.includes(existing.toLowerCase())
    );
    if (!alreadyPresent) {
      unique.push(clean);
    }
  }
  return unique.join(", ");
}

/**
 * Resolves the genuine locality of a listed product (Area / City / State)
 * without fabricating locations or masking real cities behind generic "India".
 */
export function formatProductLocation(product: Product | null | undefined): string {
  if (!product) return "Location unavailable";

  const prod = product as any;
  const owner = product.owner;
  const prodArea = cleanLocToken(prod?.product_area ?? prod?.area);
  const prodCity = cleanLocToken(prod?.product_city ?? prod?.city);
  const ownerCity = cleanLocToken(owner?.city ?? prod?.owner_city);
  const ownerState = cleanLocToken(prod?.product_state ?? owner?.state ?? prod?.owner_state ?? prod?.state);
  const ownerAddr = cleanLocToken(owner?.address ?? prod?.owner_address);
  const prodLoc = parseLocationValue(product.location);
  const ownerLoc = parseLocationValue(owner?.location);

  // 1. Product's own locality (area + city, deduplicated case-insensitively)
  const effectiveCity = prodCity || ownerCity;
  if (prodArea && effectiveCity) {
    return joinUniqueLocationParts([prodArea, effectiveCity]);
  }
  if (prodCity && ownerState) {
    return joinUniqueLocationParts([prodCity, ownerState]);
  }
  if (prodCity) return prodCity;
  if (prodArea) return prodArea;

  // 2. Valid structured product top-level location (e.g. "Hyderabad, Telangana")
  if (prodLoc) return prodLoc;

  // 3. Owner City, State
  if (ownerCity && ownerState) {
    return joinUniqueLocationParts([ownerCity, ownerState]);
  }
  if (ownerCity) return ownerCity;
  if (ownerState) return ownerState;

  // 4. Owner location string or address fallback
  if (ownerLoc) return ownerLoc;
  if (ownerAddr) return ownerAddr;

  return "Location unavailable";
}

export function formatOwnerAddress(product: Product | null | undefined): string {
  return formatProductLocation(product);
}

/**
 * Evaluates authoritative product availability from backend flags without
 * fabricating "Available" for paused, pending, or booked listings.
 */
export function isProductAvailable(product: Partial<Product> | null | undefined): boolean {
  if (!product) return false;
  const statusStr = String(product.availability_status || "").toLowerCase().trim();
  if (
    statusStr === "unavailable" ||
    statusStr === "pending" ||
    statusStr === "rejected" ||
    statusStr === "suspended" ||
    statusStr === "paused" ||
    statusStr === "deleted"
  ) {
    return false;
  }
  if (product.available === false) return false;
  const availObj = (product as any).availability;
  if (availObj && typeof availObj === "object" && availObj.availableNow === false) {
    return false;
  }
  return Boolean(product.available ?? statusStr === "available");
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
