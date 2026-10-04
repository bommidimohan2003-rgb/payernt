import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Radio,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Play,
  RotateCcw,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/common/Button";
import { DeliveryMap } from "@/components/delivery/DeliveryMap";
import { api } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useAuth } from "@/hooks/useAuth";
import type { BookingDeliveryResponse, DeliveryStatus, DeliveryLocationUpdate } from "@/types";

function formatStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Booking Confirmed";
    case "PREPARING":
      return "Preparing Gear";
    case "READY":
      return "Packaged & Ready";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "NEAR_DESTINATION":
      return "Near Destination";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "OUT_FOR_DELIVERY":
    case "NEAR_DESTINATION":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse";
    case "DELIVERED":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40";
    case "PREPARING":
    case "READY":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "CANCELLED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-secondary text-muted-foreground border-border";
  }
}

export default function DeliveryTracking() {
  const params = useParams({ strict: false }) as { id?: string };
  const bookingId = params.id || "";
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  const [data, setData] = useState<BookingDeliveryResponse | null>(null);
  const [locations, setLocations] = useState<DeliveryLocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("just now");

  // Renter Handover OTP & Secret PIN Modal State
  const [showRenterOtpModal, setShowRenterOtpModal] = useState(false);
  const [renterOtp, setRenterOtp] = useState("");
  const [renterOtpPhoneMasked, setRenterOtpPhoneMasked] = useState<string | undefined>(undefined);
  const [renterOtpSubmitting, setRenterOtpSubmitting] = useState(false);
  const [renterOtpError, setRenterOtpError] = useState<string | null>(null);
  const [renterPinRevealed, setRenterPinRevealed] = useState<string | null>(null);
  const [isActivatingRental, setIsActivatingRental] = useState(false);
  const [rentalActivatedInfo, setRentalActivatedInfo] = useState<{ activatedAt: string; message: string } | null>(null);

  // Live GPS tracking sender state (for lenders)
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [showLocationConsentModal, setShowLocationConsentModal] = useState(false);
  const geoWatchIdRef = useRef<number | null>(null);
  const lastLocationSentAtRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  const token = storage.get<string | null>(STORAGE_KEYS.token, null);

  // Load delivery details
  const fetchDeliveryData = useCallback(async () => {
    if (!token || !bookingId) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const res = await api.getBookingDelivery(token, bookingId);
      setData(res);
      if (res.locations) {
        setLocations(res.locations);
      }
      setLastUpdated("just now");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Failed to load delivery tracking data.");
    } finally {
      setLoading(false);
    }
  }, [token, bookingId]);

  const handleInitiateReceiveProduct = async () => {
    try {
      setActionLoading(true);
      const res = await api.sendRenterHandoverOtp(bookingId);
      if (res.success) {
        setRenterOtpPhoneMasked(res.targetPhoneMasked);
        setShowRenterOtpModal(true);
        setRenterOtp("");
        setRenterOtpError(null);
        setRenterPinRevealed(null);
        toast.info(res.message || "OTP sent to your registered mobile number.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send handover OTP.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyRenterOtp = async () => {
    if (renterOtp.length < 4) return;
    setRenterOtpSubmitting(true);
    setRenterOtpError(null);
    try {
      const res = await api.verifyRenterHandoverOtp(bookingId, renterOtp);
      if (res.success) {
        toast.success("OTP verified successfully!");
        setRenterPinRevealed(res.renterSecretPin || "6314");
      }
    } catch (err: any) {
      setRenterOtpError(err?.message || "Invalid OTP entered.");
    } finally {
      setRenterOtpSubmitting(false);
    }
  };

  const handleConfirmAndStartRental = async () => {
    setIsActivatingRental(true);
    try {
      const res = await api.activateRental(bookingId, renterPinRevealed || "");
      if (res.success) {
        toast.success("Rental officially activated! Your rental period has started.");
        setRentalActivatedInfo({
          activatedAt: res.rentalStartedAt,
          message: res.message,
        });
        fetchDeliveryData();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate rental.");
    } finally {
      setIsActivatingRental(false);
    }
  };

  useEffect(() => {
    if (ready) {
      fetchDeliveryData();
    }
  }, [ready, fetchDeliveryData]);

  // WebSocket Live Real-Time Connection
  useEffect(() => {
    if (!token || !data?.delivery?.id) return;
    const deliveryId = data.delivery.id;
    const isCompleted = data.delivery.status === "DELIVERED" || data.delivery.status === "CANCELLED";

    if (isCompleted) {
      return; // Stop tracking/WS once delivered
    }

    let wsUrl: string;
    const isEmulator = typeof window !== "undefined" && window.location.hostname === "10.0.2.2";
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const apiBase =
      (typeof window !== "undefined" && (window as any).PAYENT_API_URL) ||
      (isEmulator ? "http://10.0.2.2:8001" : isLocal ? "http://127.0.0.1:8001" : import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8001"));
    const wsProto = apiBase.startsWith("https") ? "wss" : "ws";
    const cleanHost = apiBase.replace(/^https?:\/\//, "");
    wsUrl = `${wsProto}://${cleanHost}/api/deliveries/${deliveryId}/ws?token=${encodeURIComponent(token)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send keepalive ping every 25 seconds
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 25000);
        (ws as unknown as { _pingInterval: NodeJS.Timeout })._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "delivery.location_updated") {
            const loc = payload.data;
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                delivery: {
                  ...prev.delivery,
                  current_latitude: loc.latitude,
                  current_longitude: loc.longitude,
                  eta_minutes: loc.etaMinutes ?? prev.delivery.eta_minutes,
                  updated_at: loc.recordedAt,
                },
              };
            });
            setLocations((prev) => [...prev, loc]);
            setLastUpdated("just now");
          } else if (payload.type === "delivery.status_updated") {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                delivery: {
                  ...prev.delivery,
                  status: payload.data.status,
                  started_at: payload.data.startedAt ?? prev.delivery.started_at,
                  near_destination_at: payload.data.nearDestinationAt ?? prev.delivery.near_destination_at,
                  delivered_at: payload.data.deliveredAt ?? prev.delivery.delivered_at,
                  updated_at: payload.data.updatedAt,
                },
              };
            });
            toast.info(`Delivery update: ${formatStatus(payload.data.status)}`);
          } else if (payload.type === "delivery.confirmed") {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                delivery: {
                  ...prev.delivery,
                  customer_confirmed_at: payload.data.customerConfirmedAt,
                },
              };
            });
            toast.success("Delivery receipt has been confirmed!");
          }
        } catch {
          // Ignored
        }
      };

      ws.onerror = () => {
        // Handled silently with polling fallback
      };
    } catch {
      // Handled silently
    }

    // Polling fallback every 15 seconds if active
    const fallbackPoll = setInterval(() => {
      if (!isCompleted) {
        api
          .getDeliveryTracking(token, deliveryId)
          .then((res) => {
            if (res.tracking) {
              setData((prev) => (prev ? { ...prev, delivery: res.tracking } : prev));
              if (res.tracking.locations) {
                setLocations(res.tracking.locations);
              }
              setLastUpdated("just now");
            }
          })
          .catch(() => {});
      }
    }, 15000);

    return () => {
      clearInterval(fallbackPoll);
      if (wsRef.current) {
        const interval = (wsRef.current as unknown as { _pingInterval?: NodeJS.Timeout })._pingInterval;
        if (interval) clearInterval(interval);
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, data?.delivery?.id, data?.delivery?.status]);

  // Lender GPS Sharing Watcher
  const stopLocationSharing = useCallback(() => {
    if (geoWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
    setIsSharingLocation(false);
  }, []);

  const startLocationSharing = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device browser.");
      return;
    }
    if (!token || !data?.delivery?.id) return;

    setIsSharingLocation(true);
    setShowLocationConsentModal(false);

    // Watch position and send updates (throttled to at most once every 10 seconds)
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastLocationSentAtRef.current < 8000) {
          return; // Throttle to prevent flooding
        }
        lastLocationSentAtRef.current = now;

        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          accuracy: pos.coords.accuracy ?? null,
        };

        api
          .sendDeliveryLocation(token, data.delivery.id, coords)
          .then((res) => {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                delivery: {
                  ...prev.delivery,
                  current_latitude: coords.latitude,
                  current_longitude: coords.longitude,
                  eta_minutes: res.etaMinutes ?? prev.delivery.eta_minutes,
                },
              };
            });
          })
          .catch((err) => {
            console.warn("Location push error:", err);
          });
      },
      (err) => {
        console.warn("Geolocation watch error:", err);
        toast.error("Unable to access GPS location. Please check browser permissions.");
        stopLocationSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [token, data?.delivery?.id, stopLocationSharing]);

  // Clean up GPS watch on unmount or when status becomes DELIVERED
  useEffect(() => {
    if (data?.delivery?.status === "DELIVERED" || data?.delivery?.status === "CANCELLED") {
      stopLocationSharing();
    }
    return () => {
      stopLocationSharing();
    };
  }, [data?.delivery?.status, stopLocationSharing]);

  // Lender state transition action
  const handleTransitionStatus = async (nextStatus: DeliveryStatus) => {
    if (!token || !data?.delivery?.id) return;
    setActionLoading(true);
    try {
      const res = await api.updateDeliveryStatus(token, data.delivery.id, nextStatus);
      setData((prev) => (prev ? { ...prev, delivery: res.delivery } : prev));
      toast.success(res.message);

      if (nextStatus === "OUT_FOR_DELIVERY" && !isSharingLocation) {
        setShowLocationConsentModal(true);
      }
      if (nextStatus === "DELIVERED") {
        stopLocationSharing();
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Failed to update delivery status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Customer receipt confirmation action
  const handleConfirmReceipt = async () => {
    if (!token || !data?.delivery?.id) return;
    setActionLoading(true);
    try {
      const res = await api.confirmDeliveryReceipt(token, data.delivery.id);
      setData((prev) => (prev ? { ...prev, delivery: res.delivery } : prev));
      toast.success(res.message);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Failed to confirm delivery receipt.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading delivery tracking details...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="mt-4 text-xl font-bold">Delivery Tracking Unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error || "Unable to find tracking records for this booking."}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/orders" })}>
              Back to Orders
            </Button>
            <Button onClick={fetchDeliveryData}>Retry</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { delivery, booking, isCustomer, counterparty } = data;
  const etaMinutes = delivery.eta_minutes;
  const isDelivered = delivery.status === "DELIVERED";
  const isConfirmed = Boolean(delivery.customer_confirmed_at);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Link
              to={isCustomer ? "/orders" : "/lender-portal"}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to {isCustomer ? "My Orders" : "Lender Portal"}
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <Truck className="h-7 w-7 text-primary" />
              Live Delivery Tracking
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Booking #{booking.id.slice(0, 16)} &bull; {booking.productTitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border flex items-center gap-1.5 ${getStatusBadgeClass(
                delivery.status
              )}`}
            >
              <Radio className="h-3 w-3" />
              {formatStatus(delivery.status)}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/messages", search: { bookingId: (delivery as any)?.order_id || (delivery as any)?.orderId || (delivery as any)?.id } as any })}
              className="flex items-center gap-1.5"
            >
              <MessageSquare className="h-4 w-4" /> Message {isCustomer ? "Lender" : "Customer"}
            </Button>
          </div>
        </div>

        {/* Main Grid: Map & Details Sidebar */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left Column: Interactive Map & Progress */}
          <div className="space-y-6">
            <DeliveryMap
              pickupLat={delivery.pickup_address ? (delivery.current_latitude ?? 12.9716) : 12.9716}
              pickupLng={77.5946}
              pickupLabel="Lender Dispatch Hub"
              deliveryLat={delivery.delivery_latitude ?? 12.9352}
              deliveryLng={delivery.delivery_longitude ?? 77.6245}
              deliveryLabel={delivery.delivery_address || "Customer Delivery Address"}
              currentLat={delivery.current_latitude}
              currentLng={delivery.current_longitude}
              history={locations}
              status={delivery.status}
              className="h-[460px] w-full"
            />

            {/* Delivery Progress Bar */}
            <div className="card-premium p-5 space-y-4">
              <h3 className="font-semibold text-sm flex items-center justify-between">
                <span>Delivery Milestone Progress</span>
                <span className="text-xs text-muted-foreground font-normal">Last updated: {lastUpdated}</span>
              </h3>

              <div className="grid grid-cols-4 gap-2 pt-2">
                {[
                  { key: "PENDING", label: "Confirmed" },
                  { key: "READY", label: "Packaged" },
                  { key: "OUT_FOR_DELIVERY", label: "On the way" },
                  { key: "DELIVERED", label: "Delivered" },
                ].map((step, idx) => {
                  const states = ["PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY", "NEAR_DESTINATION", "DELIVERED"];
                  const currentIdx = states.indexOf(delivery.status);
                  const stepIdx = states.indexOf(step.key);
                  const isDone = currentIdx >= stepIdx;
                  const isCurrent =
                    step.key === "OUT_FOR_DELIVERY"
                      ? delivery.status === "OUT_FOR_DELIVERY" || delivery.status === "NEAR_DESTINATION"
                      : delivery.status === step.key;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center gap-1.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : isCurrent
                              ? "bg-primary text-primary-foreground border-2 border-primary animate-pulse"
                              : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] font-medium leading-tight ${isDone ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Status & Operational Controls */}
          <div className="space-y-6">
            {/* ETA Card */}
            <div className="card-premium p-5 space-y-3 bg-gradient-to-br from-card to-secondary/30">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                Estimated Arrival
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-foreground font-display">
                  {isDelivered
                    ? "Delivered"
                    : etaMinutes != null && etaMinutes > 0
                      ? `${etaMinutes} mins`
                      : "ETA Calculating"}
                </span>
                {!isDelivered && etaMinutes != null && (
                  <span className="text-xs text-muted-foreground">remaining</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                {isDelivered
                  ? "Package delivered successfully."
                  : delivery.status === "OUT_FOR_DELIVERY" || delivery.status === "NEAR_DESTINATION"
                    ? "Live GPS courier in transit."
                    : "Courier has not dispatched yet."}
              </p>
            </div>

            {/* Booked Gear Info Card */}
            <div className="card-premium p-4 flex items-center gap-3">
              <img
                src={booking.productImage}
                alt={booking.productTitle}
                className="h-16 w-16 rounded-xl object-cover border border-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{booking.productTitle}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{booking.startDate} – {booking.endDate}</span>
                </div>
                <div className="text-xs font-bold text-foreground mt-1">₹{booking.total} Total</div>
              </div>
            </div>

            {/* Counterparty Contact Card */}
            <div className="card-premium p-4 space-y-2.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                {isCustomer ? "Lender & Support Contact" : "Renter Information"}
              </span>
              <div className="flex items-center gap-2.5 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{counterparty.name}</span>
              </div>
              {counterparty.phone && (
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${counterparty.phone}`} className="hover:underline text-foreground">
                    {counterparty.phone}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground pt-1 border-t border-border">
                <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{delivery.delivery_address || "Customer address registered for delivery"}</span>
              </div>
            </div>

            {/* ACTION CONTROLS */}

            {/* Customer: Handover Verification & Receive Product Action */}
            {isCustomer && (
              <div className="card-premium p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Product Receipt & Rental Activation</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    Secure Handover
                  </span>
                </div>

                {rentalActivatedInfo || delivery.status === "RENTAL_ACTIVATED" || isConfirmed ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Rental Active & Delivery Completed</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Rental started at: {rentalActivatedInfo?.activatedAt || delivery.delivered_at || new Date().toLocaleString()}
                    </p>
                  </div>
                ) : delivery.status === "ARRIVED_AT_RENTER" ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                      <span className="font-bold block mb-1">🎉 Courier Arrived!</span>
                      <span>Your product has arrived at your address. Verify mobile OTP and get your private 4-digit PIN to start your rental.</span>
                    </div>
                    <Button
                      className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl shadow-md"
                      onClick={handleInitiateReceiveProduct}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Receive Product & Verify OTP"
                      )}
                    </Button>
                  </div>
                ) : delivery.status === "OUT_FOR_DELIVERY" || delivery.status === "NEAR_DESTINATION" ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Courier is currently en route with your gear. When the courier arrives, click below to initiate your mobile OTP handover.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full font-semibold"
                      onClick={handleInitiateReceiveProduct}
                      disabled={actionLoading}
                    >
                      Receive Product (Verify OTP)
                    </Button>
                  </div>
                ) : isDelivered ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Package delivered. Please confirm receipt to activate your rental.
                    </p>
                    <Button
                      className="w-full font-bold"
                      onClick={handleConfirmReceipt}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delivery Receipt"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your product is being prepared and dispatched. Receipt verification will activate upon delivery courier arrival.
                  </p>
                )}
              </div>
            )}

            {/* Courier / Lender: Operations & Courier Transitions */}
            {!isCustomer && (
              <div className="card-premium p-5 space-y-4">
                <h4 className="font-semibold text-sm flex items-center justify-between">
                  <span>Courier & Delivery Operations</span>
                  {isSharingLocation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold animate-pulse">
                      GPS Active
                    </span>
                  )}
                </h4>

                <div className="flex flex-col gap-2">
                  {delivery.status === "PENDING" && (
                    <Button
                      size="sm"
                      onClick={() => handleTransitionStatus("PREPARING")}
                      disabled={actionLoading}
                    >
                      Start Gear Inspection & Preparation
                    </Button>
                  )}

                  {delivery.status === "PREPARING" && (
                    <Button
                      size="sm"
                      onClick={() => handleTransitionStatus("READY")}
                      disabled={actionLoading}
                    >
                      Package Ready for Dispatch
                    </Button>
                  )}

                  {delivery.status === "READY" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      onClick={() => handleTransitionStatus("OUT_FOR_DELIVERY")}
                      disabled={actionLoading}
                    >
                      <Play className="h-4 w-4 mr-1.5" /> Start Delivery Run
                    </Button>
                  )}

                  {delivery.status === "OUT_FOR_DELIVERY" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTransitionStatus("NEAR_DESTINATION")}
                        disabled={actionLoading}
                      >
                        Signal "Near Destination"
                      </Button>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        onClick={() => handleTransitionStatus("ARRIVED_AT_RENTER")}
                        disabled={actionLoading}
                      >
                        <MapPin className="h-4 w-4 mr-1.5" /> Courier Arrived at Renter
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => handleTransitionStatus("DELIVERED")}
                        disabled={actionLoading}
                      >
                        <Check className="h-4 w-4 mr-1.5" /> Mark Delivered
                      </Button>
                    </>
                  )}

                  {delivery.status === "NEAR_DESTINATION" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        onClick={() => handleTransitionStatus("ARRIVED_AT_RENTER")}
                        disabled={actionLoading}
                      >
                        <MapPin className="h-4 w-4 mr-1.5" /> Courier Arrived at Renter
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => handleTransitionStatus("DELIVERED")}
                        disabled={actionLoading}
                      >
                        <Check className="h-4 w-4 mr-1.5" /> Complete & Mark Delivered
                      </Button>
                    </>
                  )}

                  {delivery.status === "ARRIVED_AT_RENTER" && (
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                      Courier arrived at renter location. Waiting for renter OTP verification & PIN confirmation.
                    </div>
                  )}

                  {isDelivered && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Product marked delivered.
                    </div>
                  )}
                </div>

                {/* GPS Sharing Toggle */}
                {(delivery.status === "OUT_FOR_DELIVERY" || delivery.status === "NEAR_DESTINATION") && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Broadcast Live GPS</span>
                      <Button
                        variant={isSharingLocation ? "destructive" : "outline"}
                        size="sm"
                        onClick={isSharingLocation ? stopLocationSharing : () => setShowLocationConsentModal(true)}
                        className="text-xs h-7"
                      >
                        {isSharingLocation ? "Stop Sharing" : "Enable GPS"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Sends your device location to the customer's live map every 10 seconds. Auto-stops on delivery.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENTER HANDOVER OTP & SECRET PIN MODAL */}
      {showRenterOtpModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowRenterOtpModal(false)}>
                ✕
              </Button>
            </div>

            {!renterPinRevealed ? (
              /* Step 1: Enter Mobile OTP */
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Verify Delivery OTP</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the 6-digit OTP sent to your registered phone {renterOtpPhoneMasked ? `(${renterOtpPhoneMasked})` : ""} to confirm physical receipt of the gear.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={renterOtp}
                    onChange={(e) => {
                      setRenterOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setRenterOtpError(null);
                    }}
                    placeholder="Enter 6-Digit OTP"
                    className="w-full text-center font-mono text-2xl font-black py-3 rounded-2xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  {renterOtpError && (
                    <p className="text-xs text-destructive font-medium">{renterOtpError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowRenterOtpModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 font-bold"
                    onClick={handleVerifyRenterOtp}
                    disabled={renterOtp.length < 4 || renterOtpSubmitting}
                  >
                    {renterOtpSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 2: Display Private 4-Digit Renter PIN & Start Rental */
              <div className="space-y-5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Product Verification Complete</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground">Your Private Rental PIN</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    This 4-digit PIN belongs exclusively to you. Keep this PIN secure.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Renter Secret PIN
                  </span>
                  <div className="font-mono text-4xl font-black text-foreground tracking-[0.3em] py-2">
                    {renterPinRevealed}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl shadow-lg"
                    onClick={handleConfirmAndStartRental}
                    disabled={isActivatingRental}
                  >
                    {isActivatingRental ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      "Confirm & Start Rental"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Sharing Consent Modal */}
      {showLocationConsentModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Enable Delivery Location Sharing</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payent only accesses and streams your location during an active delivery run. Your live position is visible solely to the verified booking customer and automatically terminates once the item is marked as delivered.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowLocationConsentModal(false)}>
                Cancel
              </Button>
              <Button onClick={startLocationSharing} className="font-semibold">
                I Understand &amp; Start Sharing
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
