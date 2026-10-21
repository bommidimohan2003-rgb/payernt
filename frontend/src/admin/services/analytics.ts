import { bookingsService } from "./bookings";
import { paymentsService } from "./payments";
import { productsService } from "./products";
import { usersService } from "./users";
import { notificationsService, DashboardFunnel } from "./notifications";
import { AdminBooking, AdminPayment, AdminProduct, AdminUser } from "./api";

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  preset: DateRangePreset;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
}

export interface MetricDelta {
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number | null; // null if previous was 0 and current is 0
  trend: "up" | "down" | "neutral";
  isPositiveGood: boolean;
}

export interface AnalyticsKpis {
  totalBookings: MetricDelta;
  confirmedBookings: MetricDelta;
  completedRentals: MetricDelta;
  cancelledBookings: MetricDelta;
  cancellationRate: MetricDelta;
  activeRentals: MetricDelta;
  grossRentalValue: MetricDelta;
  platformRevenue: MetricDelta;
  openIssues: MetricDelta;
  rentalUtilizationRate: MetricDelta;
  totalUsers: MetricDelta;
  newUsers: MetricDelta;
  activeListings: MetricDelta;
}

export interface BookingTrendPoint {
  date: string;
  label: string;
  currentBookings: number;
  previousBookings: number;
  currentRevenue: number;
  previousRevenue: number;
}

export interface CategoryBreakdown {
  name: string;
  bookings: number;
  revenue: number;
  percentage: number;
}

export interface BookingStatusDistribution {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface ProductUtilizationMetric {
  id: string;
  title: string;
  category: string;
  price: number;
  totalRentals: number;
  revenue: number;
  occupiedDays: number;
  availableDays: number;
  utilizationRate: number;
  status: string;
}

export interface FinancialReconciliationRecord {
  id: string;
  bookingId: string;
  customerName: string;
  bookingDate: string;
  rentalPeriod: string;
  grossAmount: number;
  paymentStatus: string;
  platformFee: number; // 10% standard platform commission
  vendorPayout: number; // 90% of gross
  refundAmount: number;
  refundStatus: string;
  reconciliationStatus: "Reconciled" | "Pending Payment" | "Refunded" | "Settlement Due";
}

export interface DeliveryMetricItem {
  id: string;
  bookingId: string;
  productTitle: string;
  customerName: string;
  deliveryStatus: string;
  deliveryAgent: string;
  destination: string;
  vendorPinVerified: boolean;
  renterPinVerified: boolean;
  handoverCompleted: boolean;
  date: string;
}

export interface BusinessInsight {
  id: string;
  title: string;
  description: string;
  metric: string;
  type: "positive" | "attention" | "info";
  tabTarget: string;
}

export interface AnalyticsDataset {
  range: DateRange;
  kpis: AnalyticsKpis;
  bookingTrend: BookingTrendPoint[];
  statusDistribution: BookingStatusDistribution[];
  categoryBreakdown: CategoryBreakdown[];
  funnel: DashboardFunnel;
  productUtilization: {
    totalEligibleProducts: number;
    totalRentableDays: number;
    totalOccupiedDays: number;
    utilizationRate: number;
    products: ProductUtilizationMetric[];
  };
  userMetrics: {
    totalUsers: number;
    newUsersInPeriod: number;
    rentersCount: number;
    vendorsCount: number;
    adminsCount: number;
    userTrend: { label: string; count: number }[];
  };
  deliveryMetrics: {
    totalAssigned: number;
    completed: number;
    inTransit: number;
    pending: number;
    pinVerificationRate: number;
    records: DeliveryMetricItem[];
  };
  finance: {
    grossRentalValue: number;
    platformRevenue: number;
    paymentsCollected: number;
    pendingPayments: number;
    completedRefunds: number;
    reconciliationRecords: FinancialReconciliationRecord[];
  };
  insights: BusinessInsight[];
  rawBookings: AdminBooking[];
}

/**
 * Calculates start, end, and previous-period dates given a preset or custom boundaries.
 */
export function calculateDateRange(preset: DateRangePreset, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  let prevStart = new Date(now);
  let prevEnd = new Date(now);

  if (preset === "today") {
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(prevStart);
    prevEnd.setHours(23, 59, 59, 999);
    return { preset, start, end, prevStart, prevEnd, label: "Today" };
  }

  let daySpan = 7;
  if (preset === "7d") {
    daySpan = 7;
    start.setDate(end.getDate() - 6);
  } else if (preset === "30d") {
    daySpan = 30;
    start.setDate(end.getDate() - 29);
  } else if (preset === "90d") {
    daySpan = 90;
    start.setDate(end.getDate() - 89);
  } else if (preset === "custom" && customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const resolvedEnd = new Date(customEnd);
    resolvedEnd.setHours(23, 59, 59, 999);
    daySpan = Math.max(1, Math.round((resolvedEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    prevEnd = new Date(start);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daySpan + 1);
    prevStart.setHours(0, 0, 0, 0);
    return {
      preset,
      start,
      end: resolvedEnd,
      prevStart,
      prevEnd,
      label: `${start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${resolvedEnd.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }

  prevEnd = new Date(start);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
  prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - daySpan + 1);
  prevStart.setHours(0, 0, 0, 0);

  const labelMap: Record<string, string> = {
    today: "Today",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
  };

  return { preset, start, end, prevStart, prevEnd, label: labelMap[preset] || "Last 7 Days" };
}

/**
 * Calculates delta and % change between current and previous periods.
 */
function computeDelta(current: number, previous: number, isPositiveGood = true): MetricDelta {
  const absoluteChange = current - previous;
  let percentageChange: number | null = null;
  if (previous > 0) {
    percentageChange = Math.round(((current - previous) / previous) * 100);
  } else if (previous === 0 && current > 0) {
    percentageChange = 100;
  } else if (previous === 0 && current === 0) {
    percentageChange = 0;
  }

  let trend: "up" | "down" | "neutral" = "neutral";
  if (absoluteChange > 0) trend = "up";
  else if (absoluteChange < 0) trend = "down";

  return {
    current,
    previous,
    absoluteChange,
    percentageChange,
    trend,
    isPositiveGood,
  };
}

/**
 * Checks if a date string falls between start and end.
 */
function isDateInRange(dateStr: string | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}

/**
 * Main aggregator: pulls live data from existing APIs and computes full analytics dataset.
 */
export async function fetchAnalyticsData(range: DateRange): Promise<AnalyticsDataset> {
  const daysCount = Math.max(
    1,
    Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const [bookings, payments, products, users, stats, funnel] = await Promise.all([
    bookingsService.getBookings().catch(() => [] as AdminBooking[]),
    paymentsService.getPayments().catch(() => [] as AdminPayment[]),
    productsService.getProducts().catch(() => [] as AdminProduct[]),
    usersService.getUsers().catch(() => [] as AdminUser[]),
    notificationsService.getDashboardStats().catch(() => null),
    notificationsService.getDashboardFunnel(daysCount).catch(() => ({
      days: daysCount,
      stages: [
        { id: "views", label: "Product Views", count: 0, event_name: "view_product", is_tracked: true },
        { id: "initiated", label: "Booking Initiated (Cart)", count: 0, event_name: "add_to_cart", is_tracked: true },
        { id: "submitted", label: "Bookings Created", count: 0, event_name: "orders", is_tracked: true },
        { id: "confirmed", label: "Bookings Confirmed", count: 0, event_name: "orders_confirmed", is_tracked: true },
        { id: "completed", label: "Rentals Completed", count: 0, event_name: "orders_completed", is_tracked: true },
      ],
    })),
  ]);

  // Current window bookings vs previous window bookings
  const currentBookings = bookings.filter((b) => isDateInRange(b.createdAt || b.startDate, range.start, range.end));
  const previousBookings = bookings.filter((b) => isDateInRange(b.createdAt || b.startDate, range.prevStart, range.prevEnd));

  // Current window payments vs previous window payments
  const currentPayments = payments.filter((p) => isDateInRange(p.createdAt, range.start, range.end));
  const previousPayments = payments.filter((p) => isDateInRange(p.createdAt, range.prevStart, range.prevEnd));

  // 1. KPI Calculations
  const curTotalBookings = currentBookings.length;
  const prevTotalBookings = previousBookings.length;

  const curConfirmed = currentBookings.filter((b) =>
    ["confirmed", "active", "completed", "delivered", "in_progress"].includes((b.status || "").toLowerCase())
  ).length;
  const prevConfirmed = previousBookings.filter((b) =>
    ["confirmed", "active", "completed", "delivered", "in_progress"].includes((b.status || "").toLowerCase())
  ).length;

  const curCompleted = currentBookings.filter((b) => (b.status || "").toLowerCase() === "completed").length;
  const prevCompleted = previousBookings.filter((b) => (b.status || "").toLowerCase() === "completed").length;

  const curCancelled = currentBookings.filter((b) => (b.status || "").toLowerCase() === "cancelled").length;
  const prevCancelled = previousBookings.filter((b) => (b.status || "").toLowerCase() === "cancelled").length;

  const curCancRate = curTotalBookings > 0 ? Math.round((curCancelled / curTotalBookings) * 100) : 0;
  const prevCancRate = prevTotalBookings > 0 ? Math.round((prevCancelled / prevTotalBookings) * 100) : 0;

  const curActiveRentals = currentBookings.filter((b) =>
    ["active", "in_progress", "delivered"].includes((b.status || "").toLowerCase())
  ).length;
  const prevActiveRentals = previousBookings.filter((b) =>
    ["active", "in_progress", "delivered"].includes((b.status || "").toLowerCase())
  ).length;

  const curGrv = currentBookings.reduce((sum, b) => {
    const isPaid = (b.paymentStatus || "").toLowerCase() === "paid" || ["active", "completed"].includes((b.status || "").toLowerCase());
    return sum + (isPaid ? Number(b.amount || 0) : 0);
  }, 0);
  const prevGrv = previousBookings.reduce((sum, b) => {
    const isPaid = (b.paymentStatus || "").toLowerCase() === "paid" || ["active", "completed"].includes((b.status || "").toLowerCase());
    return sum + (isPaid ? Number(b.amount || 0) : 0);
  }, 0);

  // Platform commission: 10% standard platform take-rate on realized rental volume
  const curRev = Math.round(curGrv * 0.1);
  const prevRev = Math.round(prevGrv * 0.1);

  // Users in period
  const curUsers = users.filter((u) => isDateInRange(u.createdAt, range.start, range.end)).length;
  const prevUsers = users.filter((u) => isDateInRange(u.createdAt, range.prevStart, range.prevEnd)).length;

  // Active products in period
  const activeProducts = products.filter((p) => p.status === "approved" || p.available);

  // Rental utilization calculation:
  // Formula: Occupied Product-Days / (Total Rentable Products * Days in Period) * 100
  let occupiedDaysSum = 0;
  currentBookings.forEach((b) => {
    if ((b.status || "").toLowerCase() !== "cancelled") {
      const s = new Date(b.startDate);
      const e = new Date(b.endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const overlapStart = Math.max(s.getTime(), range.start.getTime());
        const overlapEnd = Math.min(e.getTime(), range.end.getTime());
        if (overlapEnd >= overlapStart) {
          const days = Math.max(1, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)));
          occupiedDaysSum += days;
        }
      } else {
        occupiedDaysSum += 1;
      }
    }
  });

  const totalRentableProductDays = Math.max(1, activeProducts.length * daysCount);
  const currentUtilRate = Math.min(100, Math.round((occupiedDaysSum / totalRentableProductDays) * 100));

  let prevOccupiedDaysSum = 0;
  previousBookings.forEach((b) => {
    if ((b.status || "").toLowerCase() !== "cancelled") {
      const s = new Date(b.startDate);
      const e = new Date(b.endDate);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const overlapStart = Math.max(s.getTime(), range.prevStart.getTime());
        const overlapEnd = Math.min(e.getTime(), range.prevEnd.getTime());
        if (overlapEnd >= overlapStart) {
          const days = Math.max(1, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)));
          prevOccupiedDaysSum += days;
        }
      } else {
        prevOccupiedDaysSum += 1;
      }
    }
  });
  const prevRentableProductDays = Math.max(1, activeProducts.length * daysCount);
  const previousUtilRate = Math.min(100, Math.round((prevOccupiedDaysSum / prevRentableProductDays) * 100));

  const kpis: AnalyticsKpis = {
    totalBookings: computeDelta(curTotalBookings, prevTotalBookings, true),
    confirmedBookings: computeDelta(curConfirmed, prevConfirmed, true),
    completedRentals: computeDelta(curCompleted, prevCompleted, true),
    cancelledBookings: computeDelta(curCancelled, prevCancelled, false),
    cancellationRate: computeDelta(curCancRate, prevCancRate, false),
    activeRentals: computeDelta(curActiveRentals, prevActiveRentals, true),
    grossRentalValue: computeDelta(curGrv, prevGrv, true),
    platformRevenue: computeDelta(curRev, prevRev, true),
    openIssues: computeDelta(stats?.pendingReports ?? 0, 0, false),
    rentalUtilizationRate: computeDelta(currentUtilRate, previousUtilRate, true),
    totalUsers: computeDelta(users.length, users.length - curUsers, true),
    newUsers: computeDelta(curUsers, prevUsers, true),
    activeListings: computeDelta(activeProducts.length, activeProducts.length, true),
  };

  // 2. Booking & Revenue Trend over time (daily buckets)
  const bookingTrend: BookingTrendPoint[] = [];
  const bucketCount = Math.min(daysCount, 30);
  const stepMs = (range.end.getTime() - range.start.getTime()) / bucketCount;

  for (let i = 0; i < bucketCount; i++) {
    const bStart = new Date(range.start.getTime() + i * stepMs);
    const bEnd = new Date(range.start.getTime() + (i + 1) * stepMs);

    const prevBStart = new Date(range.prevStart.getTime() + i * stepMs);
    const prevBEnd = new Date(range.prevStart.getTime() + (i + 1) * stepMs);

    const curPoints = currentBookings.filter((b) => isDateInRange(b.createdAt || b.startDate, bStart, bEnd));
    const prevPoints = previousBookings.filter((b) => isDateInRange(b.createdAt || b.startDate, prevBStart, prevBEnd));

    const curRevPoint = curPoints.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const prevRevPoint = prevPoints.reduce((sum, b) => sum + Number(b.amount || 0), 0);

    bookingTrend.push({
      date: bStart.toISOString(),
      label: bStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      currentBookings: curPoints.length,
      previousBookings: prevPoints.length,
      currentRevenue: curRevPoint,
      previousRevenue: prevRevPoint,
    });
  }

  // 3. Status Distribution
  const statusCounts: Record<string, number> = {
    Confirmed: 0,
    Active: 0,
    Completed: 0,
    Pending: 0,
    Cancelled: 0,
  };

  currentBookings.forEach((b) => {
    const st = (b.status || "").toLowerCase();
    if (st === "completed") statusCounts.Completed++;
    else if (st === "cancelled") statusCounts.Cancelled++;
    else if (st === "active" || st === "in_progress" || st === "delivered") statusCounts.Active++;
    else if (st === "confirmed") statusCounts.Confirmed++;
    else statusCounts.Pending++;
  });

  const statusColorMap: Record<string, string> = {
    Confirmed: "#3B82F6",
    Active: "#10B981",
    Completed: "#6366F1",
    Pending: "#F59E0B",
    Cancelled: "#EF4444",
  };

  const statusDistribution: BookingStatusDistribution[] = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0 || currentBookings.length === 0)
    .map(([status, count]) => ({
      status,
      label: status,
      count,
      color: statusColorMap[status] || "#71717A",
    }));

  // 4. Category Breakdown
  const catMap: Record<string, { bookings: number; revenue: number }> = {};
  currentBookings.forEach((b) => {
    const cat = (b as any).category || (b as any).productCategory || "Cameras & Optics";
    if (!catMap[cat]) catMap[cat] = { bookings: 0, revenue: 0 };
    catMap[cat].bookings += 1;
    catMap[cat].revenue += Number(b.amount || 0);
  });

  if (Object.keys(catMap).length === 0 && products.length > 0) {
    products.forEach((p) => {
      const cat = p.category || "General";
      if (!catMap[cat]) catMap[cat] = { bookings: 0, revenue: 0 };
    });
  }

  const totalCatBookings = Math.max(1, Object.values(catMap).reduce((acc, c) => acc + c.bookings, 0));
  const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap).map(([name, data]) => ({
    name,
    bookings: data.bookings,
    revenue: data.revenue,
    percentage: Math.round((data.bookings / totalCatBookings) * 100),
  }));

  // 5. Product Utilization Details
  const productRentalsMap: Record<string, { count: number; revenue: number; occupiedDays: number }> = {};
  currentBookings.forEach((b) => {
    const pid = b.productId || b.id;
    if (!productRentalsMap[pid]) productRentalsMap[pid] = { count: 0, revenue: 0, occupiedDays: 0 };
    productRentalsMap[pid].count += 1;
    productRentalsMap[pid].revenue += Number(b.amount || 0);

    const s = new Date(b.startDate);
    const e = new Date(b.endDate);
    const days = !isNaN(s.getTime()) && !isNaN(e.getTime()) ? Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))) : 1;
    productRentalsMap[pid].occupiedDays += days;
  });

  const productMetrics: ProductUtilizationMetric[] = products.map((p) => {
    const rentData = productRentalsMap[p.id] || { count: 0, revenue: 0, occupiedDays: 0 };
    const util = Math.min(100, Math.round((rentData.occupiedDays / Math.max(1, daysCount)) * 100));
    return {
      id: p.id,
      title: p.title,
      category: p.category || "General",
      price: p.price || 0,
      totalRentals: rentData.count,
      revenue: rentData.revenue,
      occupiedDays: rentData.occupiedDays,
      availableDays: Math.max(0, daysCount - rentData.occupiedDays),
      utilizationRate: util,
      status: p.status,
    };
  });

  // Sort by rental count & revenue
  productMetrics.sort((a, b) => b.totalRentals - a.totalRentals || b.revenue - a.revenue);

  // 6. User Metrics
  const renterCount = users.filter((u) => ["renter", "customer", "user"].includes((u.role || "").toLowerCase())).length;
  const vendorCount = users.filter((u) => ["vendor", "lender", "both"].includes((u.role || "").toLowerCase())).length;
  const adminCount = users.filter((u) => (u.role || "").toLowerCase() === "admin").length;

  // 7. Delivery Metrics
  const deliveryRecords: DeliveryMetricItem[] = currentBookings.map((b) => {
    const sec = (b as any).rentalSecurity || {};
    const vendorPinOk = Boolean(sec.vendorPinVerified || (b as any).vendor_pin_verified);
    const renterPinOk = Boolean(sec.renterPinVerified || (b as any).renter_pin_verified);
    const delivStatus = b.deliveryStatus || "DELIVERED";
    return {
      id: `del-${b.id}`,
      bookingId: b.id,
      productTitle: b.productTitle || "Rental Gear",
      customerName: b.customerName || "Customer",
      deliveryStatus: delivStatus,
      deliveryAgent: (b as any).deliveryBoyName || "Field Agent",
      destination: (b as any).deliveryAddress || "Hyderabad Hub",
      vendorPinVerified: vendorPinOk,
      renterPinVerified: renterPinOk,
      handoverCompleted: vendorPinOk && renterPinOk,
      date: b.createdAt || b.startDate,
    };
  });

  const assignedDeliv = deliveryRecords.length;
  const completedDeliv = deliveryRecords.filter((d) => d.deliveryStatus === "DELIVERED" || d.handoverCompleted).length;
  const inTransitDeliv = deliveryRecords.filter((d) => d.deliveryStatus === "PICKED_UP" || d.deliveryStatus === "IN_TRANSIT").length;
  const pendingDeliv = Math.max(0, assignedDeliv - completedDeliv - inTransitDeliv);
  const pinVerificationRate = assignedDeliv > 0 ? Math.round((deliveryRecords.filter((d) => d.handoverCompleted).length / assignedDeliv) * 100) : 100;

  // 8. Financial Reconciliation Records
  const reconciliationRecords: FinancialReconciliationRecord[] = currentBookings.map((b) => {
    const gross = Number(b.amount || 0);
    const platformFee = Math.round(gross * 0.1);
    const vendorPayout = Math.max(0, gross - platformFee);
    const isRefunded = (b.paymentStatus || "").toLowerCase() === "refunded" || (b.status || "").toLowerCase() === "cancelled";
    const refundAmt = isRefunded ? gross : 0;

    let reconStatus: FinancialReconciliationRecord["reconciliationStatus"] = "Reconciled";
    if (isRefunded) reconStatus = "Refunded";
    else if ((b.paymentStatus || "").toLowerCase() === "pending") reconStatus = "Pending Payment";
    else if (["active", "confirmed"].includes((b.status || "").toLowerCase())) reconStatus = "Settlement Due";

    return {
      id: `rec-${b.id}`,
      bookingId: b.id,
      customerName: b.customerName || "Customer",
      bookingDate: b.createdAt || b.startDate,
      rentalPeriod: `${b.startDate || "N/A"} → ${b.endDate || "N/A"}`,
      grossAmount: gross,
      paymentStatus: b.paymentStatus || "paid",
      platformFee,
      vendorPayout,
      refundAmount: refundAmt,
      refundStatus: isRefunded ? "Processed" : "None",
      reconciliationStatus: reconStatus,
    };
  });

  const collectedPayments = currentPayments
    .filter((p) => p.status === "successful" || p.status === "captured")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0) || curGrv;

  const pendingPayments = currentPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const completedRefunds = currentPayments
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // 9. Automated Deterministic Business Insights
  const insights: BusinessInsight[] = [];

  // Booking trend insight
  if (kpis.totalBookings.percentageChange !== null && kpis.totalBookings.percentageChange !== 0) {
    const isGrowth = kpis.totalBookings.percentageChange > 0;
    insights.push({
      id: "insight-booking-velocity",
      title: isGrowth ? "Booking Velocity Accelerated" : "Booking Volume Softened",
      description: `Bookings changed by ${isGrowth ? "+" : ""}${kpis.totalBookings.percentageChange}% compared with the prior ${range.label.toLowerCase()} period (${curTotalBookings} vs ${prevTotalBookings}).`,
      metric: `${isGrowth ? "+" : ""}${kpis.totalBookings.percentageChange}%`,
      type: isGrowth ? "positive" : "attention",
      tabTarget: "Bookings",
    });
  } else {
    insights.push({
      id: "insight-booking-steady",
      title: "Booking Activity Monitored",
      description: `A total of ${curTotalBookings} bookings recorded for ${range.label.toLowerCase()}.`,
      metric: `${curTotalBookings} Bookings`,
      type: "info",
      tabTarget: "Bookings",
    });
  }

  // Top category insight
  if (categoryBreakdown.length > 0) {
    const topCat = [...categoryBreakdown].sort((a, b) => b.bookings - a.bookings)[0];
    if (topCat && topCat.bookings > 0) {
      insights.push({
        id: "insight-top-category",
        title: `${topCat.name} Leads Category Demand`,
        description: `${topCat.name} accounts for ${topCat.percentage}% of all reservation volume in this window.`,
        metric: `${topCat.percentage}% share`,
        type: "positive",
        tabTarget: "Products",
      });
    }
  }

  // Rental utilization insight
  insights.push({
    id: "insight-utilization",
    title: "Equipment Fleet Utilization",
    description: `Fleet utilization is at ${currentUtilRate}% across ${activeProducts.length} active rentable listings (${occupiedDaysSum} product-days occupied).`,
    metric: `${currentUtilRate}% Utilization`,
    type: currentUtilRate > 50 ? "positive" : "info",
    tabTarget: "Products",
  });

  // Security & delivery insight
  if (deliveryRecords.length > 0) {
    insights.push({
      id: "insight-security-pin",
      title: "Handover PIN Compliance",
      description: `Security dual-PIN verification compliance is at ${pinVerificationRate}% across all assigned field dispatches.`,
      metric: `${pinVerificationRate}% Verified`,
      type: pinVerificationRate >= 85 ? "positive" : "attention",
      tabTarget: "Deliveries",
    });
  }

  // Financial reconciliation insight
  insights.push({
    id: "insight-revenue-reconciliation",
    title: "Financial Reconciliation Status",
    description: `Gross rental turnover stands at ₹${curGrv.toLocaleString("en-IN")}, generating ₹${curRev.toLocaleString("en-IN")} in net platform commission.`,
    metric: `₹${curRev.toLocaleString("en-IN")}`,
    type: "positive",
    tabTarget: "Finance",
  });

  return {
    range,
    kpis,
    bookingTrend,
    statusDistribution,
    categoryBreakdown,
    funnel,
    productUtilization: {
      totalEligibleProducts: activeProducts.length,
      totalRentableDays: totalRentableProductDays,
      totalOccupiedDays: occupiedDaysSum,
      utilizationRate: currentUtilRate,
      products: productMetrics,
    },
    userMetrics: {
      totalUsers: users.length,
      newUsersInPeriod: curUsers,
      rentersCount: renterCount,
      vendorsCount: vendorCount,
      adminsCount: adminCount,
      userTrend: [],
    },
    deliveryMetrics: {
      totalAssigned: assignedDeliv,
      completed: completedDeliv,
      inTransit: inTransitDeliv,
      pending: pendingDeliv,
      pinVerificationRate,
      records: deliveryRecords,
    },
    finance: {
      grossRentalValue: curGrv,
      platformRevenue: curRev,
      paymentsCollected: collectedPayments,
      pendingPayments,
      completedRefunds,
      reconciliationRecords,
    },
    insights,
    rawBookings: currentBookings,
  };
}

/**
 * Sanitizes cell values to prevent CSV / Spreadsheet formula injection.
 * As required by security guidelines: values starting with '=', '+', '-', '@' are prepended with a quote.
 */
function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Exports data to CSV with UTF-8 BOM so Excel opens it with Indian Rupee (₹) intact.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent =
    "\uFEFF" +
    [
      headers.map(sanitizeCsvValue).join(","),
      ...rows.map((r) => r.map(sanitizeCsvValue).join(",")),
    ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
