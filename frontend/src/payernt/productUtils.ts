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
