export function isFakeOrDeletedProduct(product: any): boolean {
  if (!product) return true;
  const title = String(product.title || product.name || "").toLowerCase();
  const model = String(product.model || "").toLowerCase();
  const id = String(product.id || "").toLowerCase();
  const desc = String(product.description || "").toLowerCase();

  const price = Number(product.price || product.daily_rate || product.dailyRate || 0);

  // Specifically remove Sony FX3 fake listing requested by user
  if (
    title.includes("fx3") ||
    model.includes("fx3") ||
    id.includes("fx3") ||
    desc.includes("fx3") ||
    title.includes("cinema line") ||
    (title.includes("sony") && price === 3499) ||
    id === "prod-1790474939846-841" ||
    id === "prod-1790474367552-646" ||
    id === "p-custom-1791012883229" ||
    id === "sony-fx3"
  ) {
    return true;
  }

  // Also check standard mock / fake prefix IDs
  if (
    id.startsWith("mock-") ||
    id.startsWith("fake-") ||
    id.startsWith("dummy-") ||
    id === "test-gear-1"
  ) {
    return true;
  }

  return false;
}

/**
 * Determines whether a product belongs to the given user or current vendor session.
 * Used on the renter side so that vendor products are never shown to their own owner.
 */
export function isUserOwnProduct(product: any, user: any): boolean {
  if (!product) return false;

  // 1. Gather all potential user identifiers
  const userEmails = new Set<string>();
  const userIds = new Set<string>();
  const userNames = new Set<string>();

  if (user) {
    if (user.email) userEmails.add(String(user.email).trim().toLowerCase());
    if (user.id) userIds.add(String(user.id).trim().toLowerCase());
    if (user._id) userIds.add(String(user._id).trim().toLowerCase());
    if (user.person_id) userIds.add(String(user.person_id).trim().toLowerCase());
    if (user.uid) userIds.add(String(user.uid).trim().toLowerCase());
    const fullName = String(user.fullName || user.full_name || user.name || "").trim().toLowerCase();
    if (fullName && fullName.length >= 3) {
      userNames.add(fullName);
    }
  }

  // 2. Also check if the browser has a vendor session in localStorage (same browser vendor login)
  if (typeof window !== "undefined") {
    try {
      const vendorUserStr = localStorage.getItem("payent:admin:current_user");
      if (vendorUserStr) {
        const vendorObj = JSON.parse(vendorUserStr);
        if (vendorObj?.email) userEmails.add(String(vendorObj.email).trim().toLowerCase());
        if (vendorObj?.id) userIds.add(String(vendorObj.id).trim().toLowerCase());
        const vendorName = String(vendorObj?.fullName || vendorObj?.name || "").trim().toLowerCase();
        if (vendorName && vendorName.length >= 3) {
          userNames.add(vendorName);
        }
      }
    } catch {
      // Ignore storage read error
    }
  }

  if (userEmails.size === 0 && userIds.size === 0 && userNames.size === 0) {
    return false;
  }

  // 3. Match against product owner ID
  const pOwnerId = String(
    product.ownerId ||
    product.owner_id ||
    product.owner?.id ||
    product.owner?._id ||
    product.owner?.person_id ||
    product.userId ||
    product.user_id ||
    ""
  ).trim().toLowerCase();

  if (pOwnerId && userIds.has(pOwnerId)) {
    return true;
  }

  // 4. Match against product owner email
  const pOwnerEmail = String(
    product.owner_email ||
    product.ownerEmail ||
    product.user_email ||
    product.userEmail ||
    product.owner?.email ||
    ""
  ).trim().toLowerCase();

  if (pOwnerEmail && userEmails.has(pOwnerEmail)) {
    return true;
  }

  // 5. Match against product owner name (excluding generic fallback titles)
  const pOwnerName = String(
    product.owner?.name ||
    product.owner?.fullName ||
    product.owner_name ||
    product.owner_full_name ||
    product.verificationDocs?.ownerFullName ||
    ""
  ).trim().toLowerCase();

  const genericNames = new Set([
    "lender",
    "admin",
    "payent verified vendor",
    "payent vendor",
    "verified vendor",
    "payent verified",
    "gear owner",
    "equipment owner",
  ]);

  if (pOwnerName && !genericNames.has(pOwnerName) && userNames.has(pOwnerName)) {
    return true;
  }

  return false;
}
