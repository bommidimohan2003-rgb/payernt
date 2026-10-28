import type { PayerntProduct, ProductPhoto } from "./types";

/**
 * Safely resolves the primary image URL from a Payernt product across all
 * possible data shapes (primaryImage, primary_image, image, photos array/string, images array/string).
 * Prevents JavaScript string indexing bugs (e.g. `images?.[0]` returning `'['` when images is a JSON string).
 */
export function resolveProductImageUrl(product: any): string {
  if (!product) return "";

  // 1. Direct primary image fields
  const directFields = [
    product.primaryImage,
    product.primary_image,
    product.image,
    product.imageUrl,
    product.image_url,
  ];
  for (const field of directFields) {
    if (typeof field === "string") {
      const trimmed = field.trim();
      if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
        return trimmed;
      }
    }
  }

  // 2. Photos field (could be array of objects, array of strings, or JSON string)
  let photos = product.photos;
  if (typeof photos === "string") {
    try {
      photos = JSON.parse(photos);
    } catch {
      photos = null;
    }
  }
  if (Array.isArray(photos) && photos.length > 0) {
    for (const ph of photos) {
      if (typeof ph === "string") {
        const trimmed = ph.trim();
        if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
          return trimmed;
        }
      } else if (ph && typeof ph === "object") {
        const u = ph.url || ph.imageUrl || ph.image_url || ph.src;
        if (typeof u === "string") {
          const trimmed = u.trim();
          if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
            return trimmed;
          }
        }
      }
    }
  }

  // 3. Images field (could be array of strings, array of objects, or JSON string)
  let images = product.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = null;
    }
  }
  if (Array.isArray(images) && images.length > 0) {
    for (const img of images) {
      if (typeof img === "string") {
        const trimmed = img.trim();
        if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
          return trimmed;
        }
      } else if (img && typeof img === "object") {
        const u = img.url || img.imageUrl || img.image_url || img.src;
        if (typeof u === "string") {
          const trimmed = u.trim();
          if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
            return trimmed;
          }
        }
      }
    }
  }

  return "";
}

/**
 * Resolves all valid, distinct product image URLs for inspection gallery views.
 */
export function resolveAllProductImages(product: any): string[] {
  if (!product) return [];

  const collected: string[] = [];
  const primary = resolveProductImageUrl(product);
  if (primary) collected.push(primary);

  // Collect from photos
  let photos = product.photos;
  if (typeof photos === "string") {
    try {
      photos = JSON.parse(photos);
    } catch {
      photos = null;
    }
  }
  if (Array.isArray(photos)) {
    for (const ph of photos) {
      const u = typeof ph === "string" ? ph : ph?.url || ph?.imageUrl || ph?.image_url || ph?.src;
      if (typeof u === "string") {
        const trimmed = u.trim();
        if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
          collected.push(trimmed);
        }
      }
    }
  }

  // Collect from images
  let images = product.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = null;
    }
  }
  if (Array.isArray(images)) {
    for (const img of images) {
      const u = typeof img === "string" ? img : img?.url || img?.imageUrl || img?.image_url || img?.src;
      if (typeof u === "string") {
        const trimmed = u.trim();
        if (trimmed.length > 3 && !trimmed.startsWith("[") && !trimmed.startsWith("{")) {
          collected.push(trimmed);
        }
      }
    }
  }

  // Deduplicate preserving order
  return Array.from(new Set(collected));
}

/**
 * Safely resolves the numeric daily rental rate from any product shape.
 * Honors valid zero when genuinely present, while falling back across
 * canonical aliases (pricing.daily, pricing.dailyRate, daily_rate, dailyRate, price, pricePerDay).
 */
export function resolveProductDailyRate(product: any, fallback: number = 0): number {
  if (!product) return fallback;

  const candidates = [
    product.pricing?.daily,
    product.pricing?.dailyRate,
    product.daily_rate,
    product.dailyRate,
    product.price,
    product.pricePerDay,
    product.fairMarketPrice,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      const num = Number(candidate);
      if (!isNaN(num)) {
        return num;
      }
    }
  }

  return fallback;
}

/**
 * Normalizes a raw product object into a well-formed PayerntProduct with guaranteed image and pricing fields.
 */
export function normalizePayerntProduct(raw: any): PayerntProduct {
  if (!raw) return raw;

  const primaryImage = resolveProductImageUrl(raw);
  const allImages = resolveAllProductImages(raw);

  const photos: ProductPhoto[] = allImages.map((url, idx) => ({
    id: `photo-${idx}`,
    url,
    tag: idx === 0 ? "Front View" : `Angle ${idx + 1}`,
    isPrimary: idx === 0 || url === primaryImage,
  }));

  const dailyPrice = resolveProductDailyRate(raw, 0);

  const weeklyPrice =
    raw.pricing?.weekly !== undefined && raw.pricing?.weekly !== null
      ? Number(raw.pricing.weekly)
      : raw.weekly_rate !== undefined && raw.weekly_rate !== null
      ? Number(raw.weekly_rate)
      : raw.weeklyRate !== undefined && raw.weeklyRate !== null
      ? Number(raw.weeklyRate)
      : Math.round(dailyPrice * 7 * 0.85);

  const monthlyPrice =
    raw.pricing?.monthly !== undefined && raw.pricing?.monthly !== null
      ? Number(raw.pricing.monthly)
      : raw.monthly_rate !== undefined && raw.monthly_rate !== null
      ? Number(raw.monthly_rate)
      : raw.monthlyRate !== undefined && raw.monthlyRate !== null
      ? Number(raw.monthlyRate)
      : Math.round(dailyPrice * 30 * 0.7);

  const deposit = Number(
    raw.pricing?.securityDeposit ??
    raw.security_deposit ??
    raw.securityDeposit ??
    0
  );

  return {
    ...raw,
    primaryImage,
    primary_image: primaryImage,
    image: primaryImage,
    images: allImages,
    photos: photos.length > 0 ? photos : (raw.photos || []),
    pricing: {
      ...raw.pricing,
      daily: dailyPrice,
      weekly: weeklyPrice,
      monthly: monthlyPrice,
      securityDeposit: deposit,
      minimumRentalDays: raw.pricing?.minimumRentalDays ?? raw.min_rental_days ?? 1,
    },
    price: dailyPrice,
    daily_rate: dailyPrice,
    dailyRate: dailyPrice,
    pricePerDay: dailyPrice,
    security_deposit: deposit,
    securityDeposit: deposit,
  };
}

/**
 * Deduplicates adjacent or repeated tokens in an address string or list of components,
 * case-insensitively, preserving original casing of first occurrence.
 */
export function deduplicateAddressTokens(tokens: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (!token) continue;
    const subParts = token.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of subParts) {
      const lower = part.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(part);
      }
    }
  }

  return result;
}

/**
 * Formats a clean, deduplicated product location string (e.g. "Pendurthi, Visakhapatnam").
 * Prevents redundant outputs like "Pendurthi, Pendurthi".
 */
export function formatProductAddress(product: any): string {
  if (!product) return "Visakhapatnam, Andhra Pradesh";

  let area = (
    typeof product.location === "object"
      ? product.location?.area || product.location?.landmark || product.location?.address
      : product.area
  ) || "";

  const city = (
    typeof product.location === "object"
      ? product.location?.city
      : product.city
  ) || "";

  const state = (
    typeof product.location === "object"
      ? product.location?.state
      : (product as any).state
  ) || "";

  const pincode = (
    typeof product.location === "object"
      ? product.location?.pincode || (product.location as any)?.postalCode
      : (product as any).pincode || (product as any).postalCode
  ) || "";

  // If area is empty, attempt to extract locality from pickup_instructions (e.g. "Pickup: Pendurthi, ...")
  if (!area) {
    const rawInstr =
      product.pickupInstructions ||
      (product as any).pickup_instructions ||
      (typeof product.location === "object" ? product.location?.pickupInstructions : "");
    if (typeof rawInstr === "string") {
      const match = rawInstr.match(/Pickup:\s*([^,;]+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (
          candidate &&
          candidate.toLowerCase() !== city.toLowerCase() &&
          candidate.toLowerCase() !== state.toLowerCase() &&
          !candidate.toLowerCase().startsWith("same as")
        ) {
          area = candidate;
        }
      }
    }
  }

  const rawParts = [area, city, state, pincode].filter(Boolean);
  const deduplicated = deduplicateAddressTokens(rawParts);

  if (deduplicated.length === 0) {
    return "Visakhapatnam, Andhra Pradesh";
  }

  return deduplicated.join(", ");
}

/**
 * Normalizes pickup instructions by trimming whitespace and removing redundant,
 * duplicate adjacent and repeated address tokens within pickup/drop clauses.
 */
export function formatPickupInstructions(instructions: string): string {
  if (!instructions || typeof instructions !== "string") return "";

  const trimmed = instructions.trim();
  if (!trimmed) return "";

  // If instructions contain semicolons separating clauses (e.g. "Pickup: ...; Drop: ...")
  const clauses = trimmed.split(";").map((c) => c.trim()).filter(Boolean);

  const cleanedClauses = clauses.map((clause) => {
    const prefixMatch = clause.match(/^([A-Za-z\s]+:)\s*(.*)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const body = prefixMatch[2];

      if (body.toLowerCase() === "same as pickup") {
        return `${prefix} Same as pickup`;
      }

      const tokens = body.split(",").map((t) => t.trim()).filter(Boolean);
      const deduplicated = deduplicateAddressTokens(tokens);
      return `${prefix} ${deduplicated.join(", ")}`;
    } else {
      const tokens = clause.split(",").map((t) => t.trim()).filter(Boolean);
      if (tokens.length > 1) {
        const deduplicated = deduplicateAddressTokens(tokens);
        return deduplicated.join(", ");
      }
      return clause;
    }
  });

  return cleanedClauses.join("; ");
}

