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
    (title.includes("sony") && title.includes("cinema")) ||
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
