import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  IndianRupee,
  PackageCheck,
  Truck,
  RotateCcw,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  BadgeCheck,
  Info,
  ChevronRight,
  KeyRound,
  Lock,
  X,
  RefreshCw,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Navigation,
  ChevronDown,
  Ban,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { rentalSecurityService } from "@/services/rentalSecurityService";
import { payerntApi } from "../payerntApiService";
import type { RentalRequest, RentalRequestStatus } from "../types";
import { SecretPinDisplay, SecretPinInput } from "@/components/common/SecretPinDisplay";
import { LiveRentalQueue } from "@/components/rental/LiveRentalQueue";
import { formatBookingDateTime } from "@/utils/formatters";

interface RentalRequestsProps {
  requests: RentalRequest[];
  onRequestAction: (requestId: string, action: "accept" | "reject") => void;
  onAdvanceLifecycle: (requestId: string, nextStatus: RentalRequestStatus) => void;
  onNavigateToWallet: () => void;
  onBack?: () => void;
  onApproveLocationChange?: (bookingId: string) => Promise<{ success: boolean; message?: string }>;
  onRejectLocationChange?: (bookingId: string, feedback?: string) => Promise<{ success: boolean; message?: string }>;
}

const LIFECYCLE_STEPS: { key: RentalRequestStatus; label: string; desc: string }[] = [
  { key: "requested", label: "Requested", desc: "Awaiting approval" },
  { key: "accepted", label: "Accepted", desc: "Prepare for pickup" },
  { key: "handover", label: "Handover", desc: "Inspect & handover" },
  { key: "active", label: "Active Rental", desc: "Currently with renter" },
  { key: "returned", label: "Returned", desc: "Inspect return" },
  { key: "completed", label: "Completed", desc: "Wallet credited" },
];

function getLifecycleStepIndex(status: RentalRequestStatus): number {
  switch (status) {
    case "requested":
      return 0;
    case "accepted":
      return 1;
    case "handover":
      return 2;
    case "active":
    case "return_initiated":
      return 3;
    case "returned":
      return 4;
    case "completed":
      return 5;
    case "rejected":
      return -1;
    default:
      return 0;
  }
}

export type LenderBookingFilter = "all" | "pending" | "ongoing" | "cancelled" | "completed";

export const isCancelledRequest = (r: RentalRequest): boolean => {
  const s = String(r.status || "").toLowerCase().trim();
  return (
    s === "cancelled" ||
    s === "canceled" ||
    s === "rejected" ||
    Boolean((r as any).cancelledAt || (r as any).cancelled_at)
  );
};

export const isCompletedRequest = (r: RentalRequest): boolean => {
  if (isCancelledRequest(r)) return false;
  const s = String(r.status || "").toLowerCase().trim();
  return s === "completed";
};

export const isPendingRequest = (r: RentalRequest): boolean => {
  if (isCancelledRequest(r) || isCompletedRequest(r)) return false;
  const s = String(r.status || "").toLowerCase().trim();
  return s === "requested" || s === "pending";
};

export const isOngoingRequest = (r: RentalRequest): boolean => {
  if (isCancelledRequest(r) || isCompletedRequest(r) || isPendingRequest(r)) return false;
  return true;
};

export function RentalRequests({
  requests,
  onRequestAction,
  onAdvanceLifecycle,
  onNavigateToWallet,
  onBack,
  onApproveLocationChange,
  onRejectLocationChange,
}: RentalRequestsProps) {
  const [filter, setFilter] = useState<LenderBookingFilter>("all");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [approvingChangeId, setApprovingChangeId] = useState<string | null>(null);
  const [rejectingChangeId, setRejectingChangeId] = useState<string | null>(null);

  const handleCopyAddress = (text: string) => {
    if (!text || text.trim() === "") {
      toast.error("No address available to copy.");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success("Location address copied to clipboard!");
  };

  const handleApproveLocationChange = async (bookingId: string) => {
    setApprovingChangeId(bookingId);
    try {
      if (onApproveLocationChange) {
        const res = await onApproveLocationChange(bookingId);
        if (res.success) {
          toast.success("Location change approved successfully!");
        } else {
          toast.error(res.message || "Failed to approve location change");
        }
      } else {
        const res = await payerntApi.approveLocationChange(bookingId);
        if (res.success) {
          toast.success("Location change approved successfully!");
        } else {
          toast.error(res.message || "Failed to approve location change");
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve location change");
    } finally {
      setApprovingChangeId(null);
    }
  };

  const handleRejectLocationChange = async (bookingId: string) => {
    const feedback = window.prompt("Reason for declining location change (optional):") || "";
    setRejectingChangeId(bookingId);
    try {
      if (onRejectLocationChange) {
        const res = await onRejectLocationChange(bookingId, feedback);
        if (res.success) {
          toast.info("Location change declined.");
        } else {
          toast.error(res.message || "Failed to decline location change");
        }
      } else {
        const res = await payerntApi.rejectLocationChange(bookingId, feedback);
        if (res.success) {
          toast.info("Location change declined.");
        } else {
          toast.error(res.message || "Failed to decline location change");
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to decline location change");
    } finally {
      setRejectingChangeId(null);
    }
  };

  const getLocationDisplay = (req: RentalRequest) => {
    const method = (req.deliveryMethod || req.delivery_method || "delivery").toLowerCase();
    let methodLabel = "Doorstep Delivery";
    let methodIcon = Truck;

    if (method === "pickup") {
      methodLabel = "Owner Pickup";
      methodIcon = MapPin;
    } else if (method === "custom") {
      methodLabel = "Custom Meetup";
      methodIcon = Navigation;
    }

    let address = "";
    if (method === "delivery") {
      address = req.deliveryAddress || req.delivery_address || req.renter?.city || "";
    } else if (method === "pickup") {
      address = req.pickupLocation || req.pickup_location || "Lender Verified Hub (Details shared after confirmation)";
    } else {
      address = req.customLocation || req.custom_location || "Agreed Public Meeting Point";
    }

    const directions = req.locationDirections || req.location_directions || "";
    const lat = req.latitude ?? req.location_latitude ?? null;
    const lng = req.longitude ?? req.location_longitude ?? null;

    let mapUrl = req.mapUrl || req.map_url || "";
    if (!mapUrl && lat && lng) {
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (!mapUrl && address && address !== "Address Pending Confirmation") {
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }

    return {
      method,
      methodLabel,
      methodIcon,
      address,
      directions,
      lat,
      lng,
      mapUrl,
    };
  };

  // Handover Security Clearance Modal State
  const [handoverReq, setHandoverReq] = useState<RentalRequest | null>(null);
  const [enteredRenterPin, setEnteredRenterPin] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const pinInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Vendor Preparation & Secret PIN Modal State
  const [vendorPinModal, setVendorPinModal] = useState<{
    isOpen: boolean;
    bookingId: string;
    pin: string;
    productTitle: string;
  } | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [showPinMap, setShowPinMap] = useState<Record<string, boolean>>({});
  const [vendorPinDataMap, setVendorPinDataMap] = useState<Record<string, { pin: string; createdAt: string }>>({});
  const [generatingPinId, setGeneratingPinId] = useState<string | null>(null);

  // Lender Cancellation Modal State
  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    booking: RentalRequest | null;
    reasonCode: string;
    feedback: string;
    submitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    booking: null,
    reasonCode: "PERSONAL_USE",
    feedback: "",
    submitting: false,
    error: null,
  });

  const CANCELLATION_REASONS = [
    { code: "PERSONAL_USE", label: "I need the product for personal use." },
    { code: "NO_LONGER_AVAILABLE", label: "Product is no longer available." },
    { code: "DAMAGED_OR_TECHNICAL_ISSUE", label: "Product has a technical issue or is damaged." },
    { code: "CANNOT_COMPLETE_HANDOVER", label: "I cannot complete the handover at the scheduled time." },
    { code: "RENTER_REQUESTED", label: "The renter requested cancellation." },
    { code: "SCHEDULING_CONFLICT", label: "Scheduling conflict." },
    { code: "OTHER", label: "Other." },
  ];

  const handleOpenCancellationModal = (booking: RentalRequest) => {
    setCancellationModal({
      isOpen: true,
      booking,
      reasonCode: "PERSONAL_USE",
      feedback: "",
      submitting: false,
      error: null,
    });
  };

  const handleConfirmCancellation = async () => {
    if (!cancellationModal.booking) return;
    const { booking, reasonCode, feedback } = cancellationModal;
    const cleanFeedback = feedback.trim();

    if (reasonCode === "OTHER") {
      if (!cleanFeedback || cleanFeedback.length < 5) {
        setCancellationModal((prev) => ({
          ...prev,
          error: "Written explanation is required when selecting 'Other' (minimum 5 characters).",
        }));
        return;
      }
      if (cleanFeedback.length > 500) {
        setCancellationModal((prev) => ({
          ...prev,
          error: "Explanation cannot exceed 500 characters.",
        }));
        return;
      }
    } else if (cleanFeedback.length > 500) {
      setCancellationModal((prev) => ({
        ...prev,
        error: "Feedback cannot exceed 500 characters.",
      }));
      return;
    }

    setCancellationModal((prev) => ({ ...prev, submitting: true, error: null }));
    try {
      const res = await payerntApi.cancelBooking(
        booking.id,
        reasonCode,
        cleanFeedback || undefined
      );

      if (res.success) {
        toast.success("Booking cancelled successfully. Reservation interval released.");
        onAdvanceLifecycle(booking.id, "cancelled" as any);
        setCancellationModal({
          isOpen: false,
          booking: null,
          reasonCode: "PERSONAL_USE",
          feedback: "",
          submitting: false,
          error: null,
        });
      } else {
        setCancellationModal((prev) => ({
          ...prev,
          submitting: false,
          error: res.error || "Failed to cancel booking.",
        }));
      }
    } catch (err: any) {
      setCancellationModal((prev) => ({
        ...prev,
        submitting: false,
        error: err?.message || "Error occurred during cancellation.",
      }));
    }
  };

  const handleGenerateSecretPin = async (req: RentalRequest) => {
    setGeneratingPinId(req.id);
    try {
      const res = await payerntApi.prepareProductForDelivery(req.id);
      if (res.success && res.vendorSecretPin) {
        const pin: string = String(res.vendorSecretPin);
        setVendorPinDataMap((prev) => ({
          ...prev,
          [req.id]: { pin, createdAt: new Date().toISOString() },
        }));
        setShowPinMap((prev) => ({ ...prev, [req.id]: true }));
        setVendorPinModal({
          isOpen: true,
          bookingId: req.id,
          pin: res.vendorSecretPin,
          productTitle: req.productTitle,
        });
        toast.success("Vendor Secret PIN generated successfully!");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate Secret PIN.");
    } finally {
      setGeneratingPinId(null);
    }
  };

  const handleCopyPin = (pin: string) => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    toast.success("Vendor Secret PIN copied to clipboard!");
  };

  // Delivery Boy Pickup OTP Modal State
  const [deliveryBoyOtpModal, setDeliveryBoyOtpModal] = useState<{
    isOpen: boolean;
    bookingId: string;
    otp: string;
    phoneMasked?: string;
    isSubmitting: boolean;
    error: string | null;
  } | null>(null);

  const handlePrepareProductForDelivery = async (req: RentalRequest) => {
    setIsPreparing(true);
    try {
      const res = await payerntApi.prepareProductForDelivery(req.id);
      if (res.success && res.vendorSecretPin) {
        setVendorPinModal({
          isOpen: true,
          bookingId: req.id,
          pin: res.vendorSecretPin,
          productTitle: req.productTitle,
        });
        toast.success("Product prepared! Status updated to Waiting for Delivery Boy.");
        onAdvanceLifecycle(req.id, "accepted");
      } else {
        toast.error(res.error || "Failed to prepare product for delivery.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Error preparing product for delivery.");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleSendVendorPickupOtp = async (bookingId: string) => {
    try {
      const res = await payerntApi.sendVendorHandoverOtp(bookingId);
      if (res.success) {
        setDeliveryBoyOtpModal({
          isOpen: true,
          bookingId,
          otp: "",
          phoneMasked: res.targetPhoneMasked,
          isSubmitting: false,
          error: null,
        });
        toast.info(res.message || "OTP sent for pickup verification.");
      } else {
        toast.error(res.error || "Failed to send pickup OTP.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send pickup OTP.");
    }
  };

  const handleVerifyVendorPickupOtp = async () => {
    if (!deliveryBoyOtpModal || deliveryBoyOtpModal.otp.length < 4) return;
    setDeliveryBoyOtpModal((prev) => prev ? { ...prev, isSubmitting: true, error: null } : null);
    try {
      const res = await payerntApi.verifyVendorHandoverOtp(
        deliveryBoyOtpModal.bookingId,
        deliveryBoyOtpModal.otp
      );
      if (res.success) {
        toast.success("Pickup verified! Product handed over to delivery courier.");
        const currentBookingId = deliveryBoyOtpModal.bookingId;
        setDeliveryBoyOtpModal(null);
        onAdvanceLifecycle(currentBookingId, "handover");
      } else {
        setDeliveryBoyOtpModal((prev) =>
          prev ? { ...prev, isSubmitting: false, error: res.error || "Invalid OTP code." } : null
        );
      }
    } catch (e: any) {
      setDeliveryBoyOtpModal((prev) =>
        prev ? { ...prev, isSubmitting: false, error: e?.message || "Verification failed." } : null
      );
    }
  };

  const handleOpenHandoverModal = (req: RentalRequest) => {
    rentalSecurityService.getOrCreateSecurityRecord({
      bookingId: req.id,
      productId: req.productId,
      vendorId: "PAYERNT_USER_001",
      renterId: req.renter.email,
    });
    setHandoverReq(req);
    setEnteredRenterPin(["", "", "", ""]);
    setPinError(null);
    setIsVerifying(false);
    setTimeout(() => pinInputRefs.current[0]?.focus(), 150);
  };

  const handleRenterPinChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setPinError(null);
    const copy = [...enteredRenterPin];
    copy[idx] = digit;
    setEnteredRenterPin(copy);

    if (digit && idx < 3) {
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleRenterPinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !enteredRenterPin[idx] && idx > 0) {
      pinInputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      pinInputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 3) {
      e.preventDefault();
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleVerifyAndStartRental = () => {
    if (!handoverReq) return;
    const pin = enteredRenterPin.join("");
    if (pin.length !== 4) {
      setPinError("Please enter all 4 digits of the borrower's Renter PIN.");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const res = rentalSecurityService.verifyRenterPin(handoverReq.id, pin);
      if (!res.valid) {
        setPinError(res.error || "Incorrect Renter PIN. Rental will NOT start.");
        toast.error(res.error || "Incorrect Renter PIN. Try again.");
        return;
      }

      // Also mark vendor side verified
      const sec = rentalSecurityService.getSecurityRecord(handoverReq.id);
      if (sec) {
        rentalSecurityService.verifyVendorPin(handoverReq.id, sec.vendorSecretPin);
      }

      onAdvanceLifecycle(handoverReq.id, "active");
      toast.success("Security PIN verified! Equipment handed over and rental is active.");
      setHandoverReq(null);
    }, 350);
  };

  const filterCounts = React.useMemo(() => {
    let pending = 0;
    let ongoing = 0;
    let cancelled = 0;
    let completed = 0;

    for (const r of requests) {
      if (isCancelledRequest(r)) {
        cancelled++;
      } else if (isCompletedRequest(r)) {
        completed++;
      } else if (isPendingRequest(r)) {
        pending++;
      } else {
        ongoing++;
      }
    }

    return {
      all: requests.length,
      pending,
      ongoing,
      cancelled,
      completed,
    };
  }, [requests]);

  const filteredRequests = React.useMemo(() => {
    return requests.filter((r) => {
      switch (filter) {
        case "pending":
          return isPendingRequest(r);
        case "ongoing":
          return isOngoingRequest(r);
        case "cancelled":
          return isCancelledRequest(r);
        case "completed":
          return isCompletedRequest(r);
        case "all":
        default:
          return true;
      }
    });
  }, [requests, filter]);

  const FILTER_TABS: { id: LenderBookingFilter; label: string; count: number; highlight?: boolean }[] = [
    { id: "all", label: "All", count: filterCounts.all },
    { id: "pending", label: "Pending", count: filterCounts.pending, highlight: filterCounts.pending > 0 },
    { id: "ongoing", label: "Ongoing", count: filterCounts.ongoing },
    { id: "cancelled", label: "Cancelled", count: filterCounts.cancelled },
    { id: "completed", label: "Completed", count: filterCounts.completed },
  ];

  const emptyFilterMessages: Record<LenderBookingFilter, { title: string; desc: string }> = {
    all: {
      title: "No bookings found",
      desc: "When verified borrowers book your listed gear, rental requests will appear here.",
    },
    pending: {
      title: "No pending bookings found",
      desc: "You have no rental requests currently awaiting your decision or action.",
    },
    ongoing: {
      title: "No ongoing rentals found",
      desc: "You have no active equipment rentals or handovers in progress right now.",
    },
    cancelled: {
      title: "No cancelled bookings found",
      desc: "You have zero cancelled or rejected bookings in your rental history.",
    },
    completed: {
      title: "No completed bookings found",
      desc: "You don't have any completed or settled rentals yet.",
    },
  };

  const getStatusBadge = (status: RentalRequestStatus, isCancelled?: boolean) => {
    if (isCancelled || status === "cancelled" || status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25">
          <Ban className="h-3.5 w-3.5" /> Booking Cancelled
        </span>
      );
    }
    switch (status) {
      case "requested":
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse">
            <Clock className="h-3.5 w-3.5" /> Action Required: Awaiting Decision
          </span>
        );
      case "accepted":
      case "approved":
      case "order_confirmed":
      case "ready_for_pickup":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <PackageCheck className="h-3.5 w-3.5" /> Accepted • Ready For Handover
          </span>
        );
      case "handover":
      case "picked_up":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            <Truck className="h-3.5 w-3.5" /> Handover in Progress
          </span>
        );
      case "active":
      case "rental_in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Active Ongoing Rental
          </span>
        );
      case "return_initiated":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/25">
            <RotateCcw className="h-3.5 w-3.5" /> Return Transit Initiated
          </span>
        );
      case "returned":
      case "handed_back":
      case "awaiting_inspection":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 border border-teal-500/25">
            <CheckCircle2 className="h-3.5 w-3.5" /> Item Returned • Inspect Condition
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed & Settled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-[#A1A1AA] border border-neutral-200 dark:border-white/10">
            {String(status).replace(/_/g, " ")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left pb-16 max-w-6xl mx-auto">
      {/* Back Button */}
      {onBack && (
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/10 dark:border-[#A1A1AA]/25 bg-white dark:bg-[#10151B] hover:bg-neutral-100 dark:hover:bg-white/5 text-xs font-semibold text-neutral-800 dark:text-[#F5F5F5] transition-all cursor-pointer shadow-xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform text-[#A1A1AA]" />
            <span>Back to Home</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/[0.05] text-neutral-800 dark:text-[#A1A1AA] border border-black/5 dark:border-white/10 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Rental Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 dark:text-[#F5F5F5] font-display">
              Bookings & Rental Lifecycles
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-[#A1A1AA] max-w-xl">
              Manage incoming borrower requests, execute secure device handovers, confirm returns, and approve escrow payout settlements directly into your User Wallet.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToWallet}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] dark:hover:bg-white font-bold text-xs shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <span>Go to User Wallet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Protection Assurance Strip */}
        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500 dark:text-[#A1A1AA]">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>All rentals backed by ₹50,000 Lender Protection & Verified Escrow</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Net Payout</span>
            <span>•</span>
            <span>Zero Lender Commission</span>
            <span>•</span>
            <span>Direct Wallet Credit</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center gap-2 active:scale-98 ${
                isActive
                  ? "bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] border-transparent shadow-sm"
                  : "bg-white dark:bg-[#10151B] text-neutral-600 dark:text-[#A1A1AA] border-black/10 dark:border-[#A1A1AA]/20 hover:text-black dark:hover:text-[#F5F5F5] hover:bg-neutral-50 dark:hover:bg-white/5"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 dark:bg-black/20 text-white dark:text-[#050709]"
                    : tab.highlight
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
                    : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-[#A1A1AA]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4 bg-card/50">
          <div className="h-16 w-16 rounded-3xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto shadow-inner">
            <Filter className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground font-display">
              {emptyFilterMessages[filter]?.title || "No Bookings in this View"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {emptyFilterMessages[filter]?.desc || "When verified tech creators book your listed gear, rental requests will appear with full escrow verification here."}
            </p>
          </div>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
            >
              View All Bookings ({requests.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedBookingId === req.id;
            const isCancelled = isCancelledRequest(req);
            const isDeclined = req.status === "rejected" || isCancelled;
            const actualCreationTs = req.createdAt || (req as any).created_at || req.requestDate;
            const formattedBookingTime = formatBookingDateTime(actualCreationTs);
            const bookingDate = formattedBookingTime || req.requestDate || req.startDate || "Recent";

            return (
              <motion.div
                layout
                key={req.id}
                className={`rounded-3xl border transition-all ${
                  isExpanded
                    ? "border-black/20 dark:border-[#A1A1AA]/35 bg-white dark:bg-[#10151B] p-5 sm:p-7 space-y-6 shadow-sm"
                    : "border-black/10 dark:border-[#A1A1AA]/20 bg-white dark:bg-[#10151B] p-4 sm:p-4.5 shadow-xs hover:border-black/20 dark:hover:border-[#A1A1AA]/30"
                }`}
              >
                {/* 1. COMPACT ROW / CARD (Always visible) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Small image + product name + booking ID + booking date */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={req.productImage}
                      alt={req.productTitle}
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl object-cover bg-neutral-100 dark:bg-[#050709] border border-black/10 dark:border-[#A1A1AA]/20 shrink-0 shadow-xs"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-bold text-sm sm:text-base text-neutral-950 dark:text-[#F5F5F5] font-display truncate">
                        {req.productTitle}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-[#A1A1AA]">
                        <span className="font-mono">
                          #{req.id.length > 20 ? `${req.id.slice(0, 16)}...` : req.id}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-[#A1A1AA]" />
                          <span suppressHydrationWarning>
                            {formattedBookingTime ? `Booked On: ${formattedBookingTime}` : `Booked on ${bookingDate}`}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Current Booking Status + View Details Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                    <div>{getStatusBadge(req.status, isCancelled)}</div>

                    <button
                      type="button"
                      onClick={() => setExpandedBookingId(isExpanded ? null : req.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isExpanded
                          ? "bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] border-transparent shadow-xs"
                          : "border-black/10 dark:border-[#A1A1AA]/30 bg-neutral-900/5 dark:bg-white/5 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-[#050709] text-neutral-900 dark:text-[#F5F5F5]"
                      }`}
                    >
                      <span>{isExpanded ? "Close Details" : "View Details"}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* 2. FULL DETAILS CONTAINER (ONLY rendered when isExpanded is true!) */}
                {isExpanded && (
                  <div className="space-y-6 pt-5 border-t border-black/5 dark:border-white/5">
                    {/* Close Details Top Bar */}
                    <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
                      <span className="text-xs font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider">
                        Booking Details & Operations
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedBookingId(null)}
                        className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-white font-semibold cursor-pointer transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Hide Details</span>
                      </button>
                    </div>

                    {/* Cancelled Booking Banner (if cancelled) */}
                    {isCancelled && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-3.5">
                        <Ban className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-red-600 dark:text-red-400">
                            Booking Cancelled
                          </div>
                          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            This booking has been cancelled. Active milestone buttons, handover actions, and Live Rental Queue operations are permanently disabled.
                          </p>
                          {(req.cancellation?.reasonCode || (req as any).cancellationReason || (req as any).cancellation_reason) && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium pt-0.5">
                              Reason: {String(req.cancellation?.reasonCode || (req as any).cancellationReason || (req as any).cancellation_reason).replace(/_/g, " ")}
                            </p>
                          )}
                          {((req as any).cancelledAt || (req as any).cancelled_at) && (
                            <p className="text-[11px] text-neutral-500 dark:text-[#A1A1AA] font-mono pt-0.5">
                              Cancelled on: {new Date((req as any).cancelledAt || (req as any).cancelled_at).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Live Rental Queue with 8 Milestones, Persistent Timer & Lender Actions */}
                    <LiveRentalQueue
                      key={`request-queue-${req.id}`}
                      orderId={req.id}
                      currentStatus={req.status}
                      role="lender"
                      startDate={req.startDate}
                      endDate={req.endDate}
                      createdAt={req.createdAt || (req as any).created_at || req.requestDate}
                      requestDate={req.requestDate || req.createdAt || (req as any).created_at}
                      confirmedAt={req.confirmedAt || req.requestDate}
                      readyForPickupAt={req.readyForPickupAt}
                      pickedUpAt={req.pickedUpAt}
                      returnInitiatedAt={req.returnInitiatedAt}
                      handedBackAt={req.handedBackAt}
                      awaitingInspectionAt={req.awaitingInspectionAt}
                      completedAt={req.completedAt}
                      cancelledAt={(req as any).cancelledAt || (req as any).cancelled_at}
                      cancellationReason={(req as any).cancellationReason || (req as any).cancellation_reason || req.cancellation?.reasonCode}
                      queueNotes={req.queueNotes}
                      onStatusUpdated={(newStatus) => {
                        onAdvanceLifecycle(req.id, newStatus as any);
                      }}
                    />

                    {/* Card Middle 3-Column Info Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Column 1: Borrower Profile */}
                      <div className="p-4 rounded-2xl border border-black/5 dark:border-[#A1A1AA]/15 bg-neutral-50/50 dark:bg-[#050709]/50 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider">
                            Verified Borrower
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <BadgeCheck className="h-3 w-3" /> KYC Verified
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={req.renter.avatar}
                            alt={req.renter.name}
                            className="h-10 w-10 rounded-full object-cover border border-black/10 dark:border-[#A1A1AA]/20 shadow-xs"
                          />
                          <div>
                            <p className="font-bold text-neutral-950 dark:text-[#F5F5F5] text-sm">{req.renter.name}</p>
                            <p className="text-[11px] text-neutral-500 dark:text-[#A1A1AA] flex items-center gap-1">
                              <span className="text-amber-500 font-bold">★ {req.renter.rating}</span>
                              <span>•</span>
                              <span>{req.renter.completedRentals} past rentals</span>
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-neutral-500 dark:text-[#A1A1AA] space-y-1">
                          <p className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-[#A1A1AA] shrink-0" />
                            <span className="text-neutral-900 dark:text-[#F5F5F5] font-medium">{req.renter.phone}</span>
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 text-[#A1A1AA] shrink-0" />
                            <span className="text-neutral-900 dark:text-[#F5F5F5] font-medium truncate">{req.renter.email}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[#A1A1AA] shrink-0" />
                            <span>{req.renter.city}</span>
                          </p>
                        </div>
                      </div>

                      {/* Column 2: Schedule & Duration */}
                      <div className="p-4 rounded-2xl border border-black/5 dark:border-[#A1A1AA]/15 bg-neutral-50/50 dark:bg-[#050709]/50 space-y-3 shadow-xs">
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider block">
                          Rental Schedule
                        </span>

                        <div className="space-y-1.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-neutral-950 dark:text-[#F5F5F5] font-display">{req.totalDays}</span>
                            <span className="text-xs text-neutral-500 dark:text-[#A1A1AA] font-semibold">Days Total</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-neutral-100/60 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-[11px] space-y-1">
                            <div className="flex justify-between items-center pb-1 border-b border-black/5 dark:border-white/5">
                              <span className="text-neutral-500 dark:text-[#A1A1AA] flex items-center gap-1 font-medium">
                                <Clock className="h-3 w-3 text-primary" />
                                <span>Booking Placed:</span>
                              </span>
                              <span className="font-bold text-neutral-950 dark:text-[#F5F5F5] font-mono">
                                {formattedBookingTime ? `Booked On: ${formattedBookingTime}` : `Booked on ${bookingDate}`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500 dark:text-[#A1A1AA]">Start:</span>
                              <span className="font-bold text-neutral-950 dark:text-[#F5F5F5]">{req.startDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500 dark:text-[#A1A1AA]">Return:</span>
                              <span className="font-bold text-neutral-950 dark:text-[#F5F5F5]">{req.endDate}</span>
                            </div>
                            {req.timeSlot && (
                              <div className="flex justify-between pt-1 border-t border-black/5 dark:border-white/5">
                                <span className="text-neutral-500 dark:text-[#A1A1AA]">Slot:</span>
                                <span className="font-bold text-neutral-950 dark:text-[#F5F5F5] capitalize">
                                  {req.timeSlot === "morning"
                                    ? "Morning (8:00 AM – 12:00 PM)"
                                    : req.timeSlot === "afternoon"
                                    ? "Afternoon (1:00 PM – 5:00 PM)"
                                    : req.timeSlot === "full_day"
                                    ? "Full Day (8:00 AM – 5:00 PM)"
                                    : req.timeSlot}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-1 border-t border-black/5 dark:border-white/5 flex justify-between text-[11px] text-neutral-500 dark:text-[#A1A1AA]">
                          <span>Daily Base Rate:</span>
                          <span className="font-semibold text-neutral-900 dark:text-[#F5F5F5]">₹{req.dailyRate} / day</span>
                        </div>
                      </div>

                      {/* Column 3: Financial Settlement & Escrow */}
                      <div className="p-4 rounded-2xl border border-black/5 dark:border-[#A1A1AA]/15 bg-neutral-50/50 dark:bg-[#050709]/50 space-y-3 shadow-xs">
                        <span className="text-[10px] font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider block">
                          Financial Summary
                        </span>

                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-neutral-500 dark:text-[#A1A1AA]">Total Payout:</span>
                            <span className="text-2xl font-black text-neutral-950 dark:text-[#F5F5F5] font-display">
                              ₹{req.grossRental.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-[11px] text-neutral-500 dark:text-[#A1A1AA]">
                            <span>Escrow Deposit:</span>
                            <span className="font-semibold text-neutral-900 dark:text-[#F5F5F5]">
                              ₹{req.securityDeposit.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-bold">
                          <span className="text-neutral-500 dark:text-[#A1A1AA]">Payent Platform Fee:</span>
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-[#F5F5F5]">0% (₹0 Deducted)</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Location & Fulfillment Card */}
                    {(() => {
                      const loc = getLocationDisplay(req);
                      const changeReq = req.locationChangeRequest;
                      const isChangePending = changeReq && (changeReq.status === "pending" || !changeReq.status);

                      return (
                        <div className="space-y-3">
                          {/* Pending Location Change Request Alert Banner */}
                          {isChangePending && (
                            <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
                                  <AlertTriangle className="h-4 w-4 shrink-0" />
                                  <span>Location Change Requested by Renter</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  Approval Needed
                                </span>
                              </div>

                              <div className="text-xs space-y-1.5 text-neutral-800 dark:text-neutral-200 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Proposed Method:</span>
                                  <span className="capitalize font-bold text-neutral-900 dark:text-white px-2 py-0.5 rounded bg-amber-500/15">
                                    {changeReq.deliveryMethod ? changeReq.deliveryMethod.replace(/_/g, " ") : loc.methodLabel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Proposed Location: </span>
                                  <span className="font-bold text-neutral-900 dark:text-white">
                                    {changeReq.deliveryAddress || changeReq.customLocation || changeReq.pickupLocation || "New location proposed"}
                                  </span>
                                </div>
                                {changeReq.locationDirections && (
                                  <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                                    <span className="font-medium text-neutral-500">Directions: </span>
                                    {changeReq.locationDirections}
                                  </div>
                                )}
                                {changeReq.reason && (
                                  <div className="text-[11px] text-amber-800 dark:text-amber-300 italic pt-1 border-t border-amber-500/20">
                                    Reason: "{changeReq.reason}"
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleApproveLocationChange(req.id)}
                                  disabled={approvingChangeId === req.id}
                                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>{approvingChangeId === req.id ? "Approving..." : "Approve Change"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectLocationChange(req.id)}
                                  disabled={rejectingChangeId === req.id}
                                  className="px-4 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span>{rejectingChangeId === req.id ? "Declining..." : "Decline"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Confirmed Booking Location Card */}
                          <div className="p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-[#A1A1AA]/15 bg-neutral-50/70 dark:bg-[#050709]/60 space-y-3 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider">
                                  Confirmed Booking Location
                                </span>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                  loc.method === "delivery"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : loc.method === "pickup"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                }`}>
                                  <loc.methodIcon className="h-3 w-3" />
                                  <span>{loc.methodLabel}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {loc.address && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyAddress(loc.address)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-neutral-200/50 dark:hover:bg-white/5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                                    title="Copy Address to clipboard"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy Address</span>
                                  </button>
                                )}
                                {loc.mapUrl && (
                                  <a
                                    href={loc.mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] hover:opacity-95 dark:hover:bg-white text-xs font-bold transition-all shadow-xs"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Open in Google Maps</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Primary Address Details */}
                            <div className="space-y-1.5 pt-1">
                              {loc.address ? (
                                <div className="flex items-start gap-2.5 text-xs text-neutral-900 dark:text-[#F5F5F5]">
                                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="font-semibold text-sm leading-relaxed text-neutral-900 dark:text-white">
                                      {loc.address}
                                    </p>
                                    {loc.directions && (
                                      <p className="text-xs text-neutral-600 dark:text-[#A1A1AA] italic">
                                        <strong>Directions / Landmark:</strong> {loc.directions}
                                      </p>
                                    )}
                                    {loc.lat && loc.lng && (
                                      <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                        GPS Coordinates: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                                  <span>Address Pending Confirmation — Renter will provide delivery address prior to handover.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Vendor Secret PIN Section (Stage 3) - Only if not cancelled */}
                    {!isCancelled && (() => {
                      const sec = rentalSecurityService.getSecurityRecord(req.id);
                      const pin = vendorPinDataMap[req.id]?.pin || sec?.vendorSecretPin || "5831";
                      return (
                        <SecretPinDisplay
                          pin={pin}
                          type="vendor"
                          title="Vendor Secret PIN (4-Digit)"
                          subtitle="Private security credential generated for this booking stage. Keep secure."
                          isMaskedDefault={!showPinMap[req.id]}
                          showToggleMask={true}
                          showCopy={true}
                          onGenerate={
                            req.status === "accepted" || req.status === "handover"
                              ? () => handleGenerateSecretPin(req)
                              : undefined
                          }
                          isGenerating={generatingPinId === req.id}
                          statusBadge="Status: Pickup Ready"
                        />
                      );
                    })()}

                    {/* Card Action Controls & Lifecycle Triggers - Only if not cancelled */}
                    {!isCancelled && (
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-black/5 dark:border-white/5">
                        {/* 1. When PENDING: Accept / Reject Buttons */}
                        {req.status === "requested" && (
                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                onRequestAction(req.id, "accept");
                                toast.success(`Booking approved for ${req.renter.name}! Prepare equipment for handover.`);
                              }}
                              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] dark:hover:bg-white font-bold text-xs shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Accept & Confirm Booking</span>
                            </button>
                            <button
                              onClick={() => {
                                onRequestAction(req.id, "reject");
                                toast.info("Rental request declined.");
                              }}
                              className="px-4 py-3 rounded-2xl border border-black/10 dark:border-[#A1A1AA]/30 text-xs font-semibold text-neutral-600 dark:text-[#A1A1AA] hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* 2. When ACCEPTED: Handover & Preparation Actions */}
                        {req.status === "accepted" && (
                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => handlePrepareProductForDelivery(req)}
                              disabled={isPreparing}
                              className="px-5 py-3 rounded-2xl bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] dark:hover:bg-white font-bold text-xs shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <PackageCheck className="h-4 w-4" />
                              <span>{isPreparing ? "Preparing..." : "Prepare Product for Delivery"}</span>
                            </button>

                            <button
                              onClick={() => handleSendVendorPickupOtp(req.id)}
                              className="px-5 py-3 rounded-2xl border border-black/10 dark:border-[#A1A1AA]/30 bg-transparent text-neutral-900 dark:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-white/5 font-bold text-xs shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Truck className="h-4 w-4 text-[#A1A1AA]" />
                              <span>Verify Delivery Boy Pickup (OTP)</span>
                            </button>

                            <button
                              onClick={() => handleOpenHandoverModal(req)}
                              className="px-4 py-3 rounded-2xl border border-black/10 dark:border-[#A1A1AA]/30 bg-transparent text-neutral-900 dark:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
                            >
                              <KeyRound className="h-4 w-4 text-[#A1A1AA]" />
                              <span>Direct Handover PIN</span>
                            </button>
                          </div>
                        )}

                        {/* 2.1 When in HANDOVER state (Waiting for Delivery Boy or in transit) */}
                        {req.status === "handover" && (
                          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-800 dark:text-[#F5F5F5] border border-black/5 dark:border-white/10 text-xs font-semibold">
                              <Truck className="h-3.5 w-3.5 text-[#A1A1AA]" />
                              <span>In Delivery Transit / Handover to Borrower</span>
                            </div>
                            <button
                              onClick={() => handleOpenHandoverModal(req)}
                              className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] dark:hover:bg-white font-bold text-xs shadow-sm cursor-pointer"
                            >
                              Authorize Handover
                            </button>
                          </div>
                        )}

                        {/* 3. When ACTIVE: Return Initiation */}
                        {req.status === "active" && (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                onAdvanceLifecycle(req.id, "returned");
                                toast.success("Return marked as received. Ready for post-rental inspection.");
                              }}
                              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-black/10 dark:border-[#A1A1AA]/30 text-neutral-900 dark:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-white/5 font-bold text-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-xs"
                            >
                              <RotateCcw className="h-4 w-4 text-[#A1A1AA]" />
                              <span>Receive Return from Borrower (Inspect Condition)</span>
                            </button>
                          </div>
                        )}

                        {/* 4. When RETURNED: Inspection & Settlement to Wallet */}
                        {req.status === "returned" && (
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => {
                                onAdvanceLifecycle(req.id, "completed");
                                toast.success(
                                  `Inspection passed! ₹${req.grossRental.toLocaleString("en-IN")} credited to your User Wallet.`
                                );
                              }}
                              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-900 text-white dark:bg-[#F5F5F5] dark:text-[#050709] dark:hover:bg-white font-bold text-xs shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              <span>Approve Inspection & Credit Payout (₹{req.grossRental.toLocaleString("en-IN")})</span>
                            </button>
                          </div>
                        )}

                        {/* 5. When COMPLETED: Settled Note */}
                        {req.status === "completed" && (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>₹{req.grossRental.toLocaleString("en-IN")} credited to User Wallet Balance</span>
                          </div>
                        )}

                        {/* Lender Cancellation Button */}
                        {(req.status === "requested" || req.status === "accepted" || req.status === "handover") && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancellationModal(req)}
                            className="px-4 py-2.5 rounded-2xl border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancel Booking</span>
                          </button>
                        )}

                        {/* Right side escrow note */}
                        <div className="text-[11px] text-neutral-400 dark:text-[#A1A1AA] ml-auto hidden sm:block">
                          Zero Fees • Instant Settlement
                        </div>
                      </div>
                    )}

                    {/* Bottom Close Details Button */}
                    <div className="pt-2 flex justify-end border-t border-black/5 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setExpandedBookingId(null)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/10 dark:border-[#A1A1AA]/30 text-xs font-bold text-neutral-700 dark:text-[#A1A1AA] hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Close Details</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VENDOR SECRET PIN MODAL (PRIVATE TO VENDOR)               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {vendorPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVendorPinModal(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-2xl text-center z-10"
            >
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-secondary text-foreground border border-border flex items-center justify-center shadow-xs">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setVendorPinModal(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-foreground border border-border text-[10px] font-bold uppercase tracking-wider">
                  <Lock className="h-3 w-3" />
                  <span>Private Vendor Security PIN</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Product Prepared for Delivery
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your product is ready. Below is your private 4-digit Vendor Secret PIN.
                </p>
              </div>

              {/* Secure PIN Display */}
              <SecretPinDisplay
                pin={vendorPinModal.pin}
                type="vendor"
                title="Your Private Vendor Secret PIN"
                subtitle="Keep this PIN secure. Do not share with courier or renter."
                isMaskedDefault={false}
              />

              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border text-left text-xs text-muted-foreground space-y-1">
                <span className="font-bold text-foreground block">Next Steps:</span>
                <p>1. Status updated to <span className="font-semibold text-foreground">Waiting for Delivery Boy</span>.</p>
                <p>2. Complete mobile OTP verification when the courier arrives for pickup.</p>
              </div>

              <button
                type="button"
                onClick={() => setVendorPinModal(null)}
                className="w-full py-3 px-4 rounded-2xl bg-[#F5F5F5] text-[#050709] text-xs font-bold shadow-md hover:bg-white transition-all cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* DELIVERY BOY PICKUP OTP VERIFICATION MODAL                */}
      {/* ========================================================= */}
      <AnimatePresence>
        {deliveryBoyOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeliveryBoyOtpModal(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-2xl text-center z-10"
            >
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-secondary text-foreground border border-border flex items-center justify-center shadow-xs">
                  <Truck className="h-6 w-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setDeliveryBoyOtpModal(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-foreground border border-border text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Pickup Handover Verification</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Courier Pickup OTP
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter the 6-digit OTP received on your mobile {deliveryBoyOtpModal.phoneMasked ? `(${deliveryBoyOtpModal.phoneMasked})` : ""} to confirm handover to the delivery courier.
                </p>
              </div>

              <div className="space-y-3 text-left">
                <input
                  type="text"
                  maxLength={6}
                  value={deliveryBoyOtpModal.otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setDeliveryBoyOtpModal((prev) => prev ? { ...prev, otp: val, error: null } : null);
                  }}
                  placeholder="Enter 6-Digit OTP"
                  className="w-full text-center font-mono text-2xl font-black rounded-2xl border border-white/20 bg-[#050709] text-[#F5F5F5] py-3 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white transition-all shadow-inner tracking-widest placeholder:text-muted-foreground/40 placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:font-normal"
                />

                {deliveryBoyOtpModal.error && (
                  <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{deliveryBoyOtpModal.error}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliveryBoyOtpModal(null)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-border bg-[#10151B] hover:bg-secondary text-[#A1A1AA] hover:text-[#F5F5F5] text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyVendorPickupOtp}
                  disabled={deliveryBoyOtpModal.otp.length < 4 || deliveryBoyOtpModal.isSubmitting}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#F5F5F5] text-[#050709] text-xs font-bold shadow-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  {deliveryBoyOtpModal.isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Pickup</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* HANDOVER SECURITY CLEARANCE MODAL                         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {handoverReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHandoverReq(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-2xl text-center z-10"
            >
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-secondary text-foreground border border-border flex items-center justify-center shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setHandoverReq(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-foreground border border-border text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Handover Security Clearance</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground font-display">
                  Authorize Equipment Handover
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verify the borrower's identity and match credentials before releasing "{handoverReq.productTitle}".
                </p>
              </div>

              {/* Step A: Vendor's Product Secret PIN (Originating from product) */}
              {(() => {
                const sec = rentalSecurityService.getSecurityRecord(handoverReq.id);
                const vendorPin = sec?.vendorSecretPin || "5831";
                return (
                  <SecretPinDisplay
                    pin={vendorPin}
                    type="vendor"
                    title="Your Product Vendor PIN"
                    subtitle="Private security credential for this listing. Verify that this matches your records."
                    isMaskedDefault={false}
                  />
                );
              })()}

              {/* Step B: Borrower's Renter PIN Input */}
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground block">
                      Enter Borrower's 4-Digit Renter PIN *
                    </label>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary border border-border">
                      Renter PIN
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ask {handoverReq.renter.name} for the 4-digit PIN generated on their booking confirmation screen.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-1" role="group" aria-label="Borrower 4-Digit Renter PIN input">
                  {enteredRenterPin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        pinInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      aria-label={`Digit ${idx + 1} of borrower PIN`}
                      value={digit}
                      onChange={(e) => handleRenterPinChange(idx, e.target.value)}
                      onKeyDown={(e) => handleRenterPinKeyDown(idx, e)}
                      className="w-12 h-14 text-center font-mono text-2xl font-black rounded-2xl border border-white/20 bg-[#050709] text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white transition-all shadow-inner"
                    />
                  ))}
                </div>

                {pinError && (
                  <p className="text-xs text-rose-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoverReq(null)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-border bg-[#10151B] hover:bg-secondary text-[#A1A1AA] hover:text-[#F5F5F5] text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndStartRental}
                  disabled={enteredRenterPin.join("").length !== 4 || isVerifying}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#F5F5F5] text-[#050709] text-xs font-bold shadow-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Verify & Start Rental</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* LENDER-INITIATED CANCELLATION MODAL                      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {cancellationModal.isOpen && cancellationModal.booking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!cancellationModal.submitting) {
                  setCancellationModal((prev) => ({ ...prev, isOpen: false }));
                }
              }}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#10151B] p-6 shadow-2xl space-y-5 z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-950 dark:text-[#F5F5F5]">
                      Cancel Booking
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-[#A1A1AA]">
                      Booking #{cancellationModal.booking.id} • {cancellationModal.booking.productTitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!cancellationModal.submitting) {
                      setCancellationModal((prev) => ({ ...prev, isOpen: false }));
                    }
                  }}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-4">
                {/* Reason Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-[#F5F5F5] block">
                    Cancellation Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cancellationModal.reasonCode}
                    onChange={(e) =>
                      setCancellationModal((prev) => ({
                        ...prev,
                        reasonCode: e.target.value,
                        error: null,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-neutral-50 dark:bg-[#050709] text-xs font-semibold text-neutral-950 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all cursor-pointer"
                  >
                    {CANCELLATION_REASONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Feedback */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 dark:text-[#F5F5F5]">
                      Additional Feedback {cancellationModal.reasonCode === "OTHER" ? (
                        <span className="text-red-500">* (Required)</span>
                      ) : (
                        <span className="text-neutral-400 font-normal">(Optional)</span>
                      )}
                    </label>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {cancellationModal.feedback.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder={
                      cancellationModal.reasonCode === "OTHER"
                        ? "Please explain why you need to cancel this booking (minimum 5 characters)..."
                        : "Provide any additional context for the renter (optional)..."
                    }
                    value={cancellationModal.feedback}
                    onChange={(e) =>
                      setCancellationModal((prev) => ({
                        ...prev,
                        feedback: e.target.value,
                        error: null,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-neutral-50 dark:bg-[#050709] text-xs text-neutral-950 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all placeholder:text-neutral-400"
                  />
                </div>

                {/* Error Banner */}
                {cancellationModal.error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{cancellationModal.error}</span>
                  </div>
                )}

                {/* Impact Notice */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Renter Impact Notice</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                    You are about to cancel this booking. The renter may be affected by this change. Please confirm that you want to continue.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancellationModal.submitting}
                  onClick={() =>
                    setCancellationModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="flex-1 py-3 px-4 rounded-xl border border-black/10 dark:border-white/15 text-xs font-bold text-neutral-700 dark:text-[#A1A1AA] hover:bg-neutral-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={
                    cancellationModal.submitting ||
                    (cancellationModal.reasonCode === "OTHER" &&
                      cancellationModal.feedback.trim().length < 5)
                  }
                  onClick={handleConfirmCancellation}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellationModal.submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Confirm Cancellation</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RentalRequests;
