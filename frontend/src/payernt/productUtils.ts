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
 * Normalizes a raw product object into a well-formed PayerntProduct with guaranteed image fields.
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

  const dailyPrice = Number(
    raw.pricing?.daily ??
    raw.daily_rate ??
    raw.dailyRate ??
    raw.price ??
    raw.pricePerDay ??
    raw.fairMarketPrice ??
    500
  );

  return {
    ...raw,
    primaryImage,
    primary_image: primaryImage,
    image: primaryImage,
    images: allImages,
    photos: photos.length > 0 ? photos : (raw.photos || []),
    pricing: {
      daily: dailyPrice,
      weekly: raw.pricing?.weekly ?? (raw.weekly_rate ? Number(raw.weekly_rate) : Math.round(dailyPrice * 7 * 0.85)),
      monthly: raw.pricing?.monthly ?? (raw.monthly_rate ? Number(raw.monthly_rate) : Math.round(dailyPrice * 30 * 0.7)),
      securityDeposit: 0,
      minimumRentalDays: raw.pricing?.minimumRentalDays ?? raw.min_rental_days ?? 1,
      ...raw.pricing,
    },
    price: dailyPrice,
    daily_rate: dailyPrice,
    dailyRate: dailyPrice,
  };
}
