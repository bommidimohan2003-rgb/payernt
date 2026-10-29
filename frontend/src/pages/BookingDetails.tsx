import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Truck,
  RotateCcw,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  User,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import type { Order } from "@/types";
import { getOptimizedImageUrl } from "@/utils/images";
import { formatBookingDateTime } from "@/utils/formatters";

export function BookingDetails() {
  const params = useParams({ strict: false }) as {
    id?: string;
    bookingId?: string;
  };
  const routeParamId =
    params?.id ||
    params?.bookingId ||
    (typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean).pop() || ""
      : "");
  const id = String(routeParamId || "").trim();

  const navigate = useNavigate();
  const [booking, setBooking] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fetchBooking = useCallback(
    async (showLoading = true) => {
      if (!id) {
        setError("Invalid booking ID.");
        setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);
      setError(null);

      const token = storage.get<string | null>(STORAGE_KEYS.token, null) || "";

      // 1. Try authoritative backend endpoint
      try {
        const orderData = await api.getOrderDetails(token, id);
        if (orderData && orderData.id) {
          setBooking(orderData);
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message || "";
        console.warn("[BookingDetails] API fetch warning:", msg);
      }

      // 2. Direct fetch fallback to /api/bookings/{id}
      try {
        const res = await api.fetchWithAuth(
          `/api/bookings/${encodeURIComponent(id)}`,
          {
            method: "GET",
          },
        );
        if (res.ok) {
          const directData = await res.json();
          if (directData && (directData.id || directData.bookingId)) {
            const mappedOrder: Order = {
              id: String(directData.id || directData.bookingId),
              productId: String(
                directData.productId || directData.product_id || "",
              ),
              productTitle: String(
                directData.productTitle ||
                  directData.product_title ||
                  "Gear Rental",
              ),
              productImage: String(
                directData.productImage || directData.product_image || "",
              ),
              startDate: String(
                directData.startDate || directData.start_date || "",
              ),
              endDate: String(directData.endDate || directData.end_date || ""),
              total: Number(directData.total || 0),
              status: (directData.status as Order["status"]) || "active",
              createdAt: String(
                directData.createdAt ||
                  directData.created_at ||
                  new Date().toISOString(),
              ),
              deliveryMethod:
                directData.deliveryMethod ||
                directData.delivery_method ||
                "delivery",
              deliveryAddress:
                directData.deliveryAddress || directData.delivery_address || "",
              pickupLocation:
                directData.pickupLocation || directData.pickup_location || "",
              customLocation:
                directData.customLocation || directData.custom_location || "",
              locationDirections:
                directData.locationDirections ||
                directData.location_directions ||
                "",
              latitude:
                directData.latitude ?? directData.location_latitude ?? null,
              longitude:
                directData.longitude ?? directData.location_longitude ?? null,
              mapUrl: directData.mapUrl || directData.map_url || "",
              vendor:
                directData.vendor ||
                (directData.vendorName
                  ? {
                      id: directData.vendorId || directData.vendor_id,
                      name: directData.vendorName,
                      city: directData.vendorCity,
                      verified: directData.vendorVerified,
                    }
                  : undefined),
              vendorName: directData.vendorName || directData.vendor?.name,
              vendorCity: directData.vendorCity || directData.vendor?.city,
              vendorVerified:
                directData.vendorVerified ?? directData.vendor?.verified,
              paymentStatus:
                directData.paymentStatus || directData.payment_status || "paid",
              dailyRate: directData.dailyRate || directData.daily_rate,
              bookingStatus: directData.bookingStatus || "ACTIVE",
            };
            setBooking(mappedOrder);
            setLoading(false);
            return;
          }
        }
      } catch (directErr) {
        console.warn("[BookingDetails] Direct fetch failed:", directErr);
      }

      // 3. Client storage fallback
      const cachedOrders = storage.get<Order[]>(STORAGE_KEYS.orders, []);
      const matched = cachedOrders.find(
        (o) => String(o.id).toLowerCase() === id.toLowerCase(),
      );
      if (matched) {
        setBooking(matched);
        setLoading(false);
        return;
      }

      setError(
        `Booking #${id} could not be found or you do not have permission to view it.`,
      );
      setLoading(false);
    },
    [id],
  );

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setIsCopied(true);
    toast.success("Booking ID copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const statusInfo = getStatusDisplay(booking?.status);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-muted/60 rounded-xl" />
          <div className="h-12 w-3/4 bg-muted/60 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 h-64 bg-muted/40 rounded-3xl" />
            <div className="h-64 bg-muted/40 rounded-3xl" />
          </div>
          <div className="h-48 bg-muted/30 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-foreground">
          Booking Not Found
        </h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          {error ||
            "We couldn't locate this rental reservation. It may have been cancelled or the link is invalid."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => fetchBooking(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => navigate({ to: "/payent/bookings" })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Bookings</span>
          </button>
        </div>
      </div>
    );
  }

  const primaryLocation =
    booking.deliveryMethod === "custom"
      ? booking.customLocation
      : booking.deliveryMethod === "pickup"
        ? booking.pickupLocation
        : booking.deliveryAddress;

  const mapUrl =
    booking.mapUrl ||
    (booking.latitude && booking.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`
      : primaryLocation
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryLocation)}`
        : null);

  const vendorName =
    booking.vendorName || booking.vendor?.name || "Verified Equipment Partner";
  const vendorCity =
    booking.vendorCity || booking.vendor?.city || "Bengaluru, Karnataka";
  const vendorVerified =
    booking.vendorVerified ?? booking.vendor?.verified ?? true;

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <button
              onClick={() => navigate({ to: "/payent/bookings" })}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Bookings</span>
            </button>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Booking Details
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
              >
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Booking ID:</span>
              <code className="font-mono font-bold text-foreground bg-secondary/80 px-2 py-0.5 rounded-lg border border-border">
                {booking.id}
              </code>
              <button
                onClick={handleCopyId}
                className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                title="Copy ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {isCopied && (
                <span className="text-emerald-500 font-bold text-[11px]">
                  Copied!
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => fetchBooking(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/product/$id"
              params={{ id: booking.productId }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-sm hover:opacity-90 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View Product</span>
            </Link>
          </div>
        </div>

        {/* Success Confirmation Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 sm:p-5 flex items-start gap-3.5 text-emerald-950 dark:text-emerald-100"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <h2 className="font-black text-emerald-900 dark:text-emerald-200">
              Booking Confirmed & Under Protection
            </h2>
            <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
              Your rental reservation has been officially submitted and saved in
              Payent. The equipment owner has been notified and your rental is
              backed by Payent Escrow Protection.
            </p>
          </div>
        </motion.div>

        {/* Product & Rental Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Product Details Card */}
          <div className="md:col-span-2 rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-full sm:w-36 h-36 rounded-2xl overflow-hidden bg-muted/40 border border-border shrink-0 flex items-center justify-center">
                {booking.productImage ? (
                  <img
                    src={getOptimizedImageUrl(booking.productImage, {
                      width: 300,
                    })}
                    alt={booking.productTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-secondary text-muted-foreground border border-border">
                  {booking.category || "Tech Equipment"}
                </div>
                <h3 className="text-xl font-black text-foreground tracking-tight">
                  {booking.productTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Product ID:{" "}
                  <span className="font-mono text-foreground font-semibold">
                    {booking.productId}
                  </span>
                </p>

                {booking.dailyRate && (
                  <div className="pt-2 text-xs font-semibold text-muted-foreground">
                    Daily Rate:{" "}
                    <span className="text-foreground font-extrabold text-sm">
                      ₹{booking.dailyRate.toLocaleString("en-IN")}
                    </span>{" "}
                    / day
                  </div>
                )}
              </div>
            </div>

            {/* Rental Schedule Bar */}
            <div className="pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/80 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-card border border-border text-primary shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Rental Start
                  </div>
                  <div className="font-black text-foreground text-sm">
                    {formatBookingDateTime(booking.startDate)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/80 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-card border border-border text-primary shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Rental Return
                  </div>
                  <div className="font-black text-foreground text-sm">
                    {formatBookingDateTime(booking.endDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery / Location Information */}
            <div className="pt-5 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Fulfillment & Location</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                  {booking.deliveryMethod === "pickup"
                    ? "Self Pickup"
                    : booking.deliveryMethod === "custom"
                      ? "Custom Meetup"
                      : "Doorstep Delivery"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 text-xs space-y-2">
                <div className="font-bold text-foreground">
                  {primaryLocation ||
                    "Location scheduled upon owner confirmation"}
                </div>
                {booking.locationDirections && (
                  <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>Directions: {booking.locationDirections}</span>
                  </div>
                )}
                {mapUrl && (
                  <div className="pt-1">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Google Maps</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Authorized Vendor Card */}
          <div className="space-y-6">
            {/* Authorized Vendor Card */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Product Owner (Vendor)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-secondary border border-border flex items-center justify-center font-black text-foreground text-sm">
                  {vendorName.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-black text-foreground text-sm">
                    <span>{vendorName}</span>
                    {vendorVerified && (
                      <span
                        className="text-emerald-500"
                        title="Verified Lender"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{vendorCity}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-secondary/40 border border-border text-[11px] text-muted-foreground space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Authorized Vendor Profile</span>
                </div>
                <p>
                  Identity & gear verified by Payent operations team. Direct
                  phone & contact details become active upon handover
                  coordination.
                </p>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span>Payment Summary</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Rental Total</span>
                  <span className="font-bold text-foreground">
                    ₹{Number(booking.total).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Platform Fee</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹0 (Free)
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Refundable Deposit</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Waived with KYC
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between font-black text-sm text-foreground">
                  <span>Total Paid / Escrow</span>
                  <span className="text-base text-primary">
                    ₹{Number(booking.total).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                    {booking.paymentStatus || "Paid"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Helpful Navigation
              </div>
              <div className="space-y-2">
                <Link
                  to="/delivery/$id"
                  params={{ id: booking.id }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold text-foreground hover:bg-secondary transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span>Track Delivery Progress</span>
                  </span>
                  <ArrowLeft className="w-3 h-3 rotate-180 text-muted-foreground" />
                </Link>

                <Link
                  to="/payent/bookings"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs font-bold text-foreground hover:bg-secondary transition-all"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-primary" />
                    <span>All My Rental Bookings</span>
                  </span>
                  <ArrowLeft className="w-3 h-3 rotate-180 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps for Renter */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>What happens next?</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                1
              </div>
              <div className="font-bold text-foreground">
                Vendor Review & Handover
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                The product owner confirms availability and prepares the gear
                for dispatch or hand-off.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                2
              </div>
              <div className="font-bold text-foreground">
                Security Handover PIN
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                When you inspect and receive the device, exchange your 4-digit
                secret PIN to activate the rental safely.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                3
              </div>
              <div className="font-bold text-foreground">
                Hassle-Free Return
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Enjoy your rental. At the scheduled return time, the item is
                inspected and closed smoothly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusDisplay(status?: string): {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
} {
  const s = String(status || "")
    .toLowerCase()
    .trim();

  if (s === "pending" || s === "security_pending" || s === "requested") {
    return {
      label: "Pending Owner Confirmation",
      badgeClass:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }
  if (s === "confirmed" || s === "order_confirmed" || s === "accepted") {
    return {
      label: "Booking Confirmed",
      badgeClass:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (s === "active" || s === "rental_in_progress" || s === "picked_up") {
    return {
      label: "Active Rental",
      badgeClass:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    };
  }
  if (s === "completed" || s === "returned") {
    return {
      label: "Rental Completed",
      badgeClass:
        "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (s === "cancelled" || s === "canceled" || s === "rejected") {
    return {
      label: "Cancelled",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    };
  }

  return {
    label: "Confirmed",
    badgeClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  };
}

export default BookingDetails;
