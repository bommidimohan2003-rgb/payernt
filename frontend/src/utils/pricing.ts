/**
 * Centralized Payent Rental Slot Pricing Rule
 * 
 * Pricing Rule:
 * Morning Price = Full Day Price × 0.5
 * Afternoon Price = Full Day Price × 0.5
 * Full Day Price: retains configured product daily rate (product.price / dailyRate)
 * 
 * Dynamically calculated based on the product's Full Day price.
 * Full Day pricing remains unchanged.
 */

export const DEFAULT_SLOT_PRICING = {
  morning: 500,
  afternoon: 500,
} as const;

export interface SlotPriceOptions {
  slotId: string;
  product?: {
    price?: number | string;
    daily_rate?: number | string;
    dailyRate?: number | string;
    morning_rate?: number | string;
    morningRate?: number | string;
    afternoon_rate?: number | string;
    afternoonRate?: number | string;
    half_day_rate?: number | string;
    halfDayRate?: number | string;
  } | null;
  daySlots?: Array<{
    id: string;
    price?: number;
    rate?: number;
  }>;
}

export function getSlotPrice(
  slotId: string,
  product?: SlotPriceOptions["product"],
  daySlots?: SlotPriceOptions["daySlots"]
): number {
  const normSlot = (slotId || "full_day").toLowerCase().trim();

  // 1. Resolve Full Day price from product or daySlots
  let fullDayPrice = 0;
  if (product) {
    const fullPrice = product.dailyRate ?? product.daily_rate ?? product.price;
    if (fullPrice !== undefined && fullPrice !== null && !isNaN(Number(fullPrice)) && Number(fullPrice) > 0) {
      fullDayPrice = Number(fullPrice);
    }
  }
  if (!fullDayPrice && daySlots && daySlots.length > 0) {
    const matchedFullSlot = daySlots.find((s) => s.id.toLowerCase() === "full_day");
    const pVal = matchedFullSlot?.price ?? matchedFullSlot?.rate;
    if (pVal !== undefined && pVal !== null && !isNaN(Number(pVal)) && Number(pVal) > 0) {
      fullDayPrice = Number(pVal);
    }
  }
  if (!fullDayPrice) {
    fullDayPrice = 1000;
  }

  // 2. Dynamic 50% rule: Morning Price = Full Day Price × 0.5
  if (normSlot === "morning" || normSlot === "half_day_morning") {
    return Math.round(fullDayPrice * 0.5);
  }

  // 3. Dynamic 50% rule: Afternoon Price = Full Day Price × 0.5
  if (normSlot === "afternoon" || normSlot === "half_day_afternoon") {
    return Math.round(fullDayPrice * 0.5);
  }

  // 4. Full Day: Retain product configured full-day price unchanged
  return fullDayPrice;
}
