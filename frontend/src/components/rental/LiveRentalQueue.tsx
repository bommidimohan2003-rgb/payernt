import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Timer,
  Play,
  Pause,
  Award,
  SearchCheck,
  Check,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/utils/api";
import { payerntApi } from "@/payernt/payerntApiService";
import { storage, STORAGE_KEYS } from "@/utils/storage";

export type QueueMilestoneKey =
  | "confirmed"
  | "ready_for_pickup"
  | "picked_up"
  | "rental_in_progress"
  | "return_initiated"
  | "handed_back"
  | "awaiting_inspection"
  | "completed";

export interface QueueMilestone {
  key: QueueMilestoneKey;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  timestamp?: string | null;
  status: "completed" | "current" | "pending";
  icon: React.ComponentType<{ className?: string }>;
}

export interface LiveRentalQueueProps {
  orderId: string;
  currentStatus: string;
  role?: "renter" | "lender" | "admin";
  startDate?: string;
  endDate?: string;
  timeSlot?: string;
  confirmedAt?: string | null;
  readyForPickupAt?: string | null;
  pickedUpAt?: string | null;
  returnInitiatedAt?: string | null;
  handedBackAt?: string | null;
  awaitingInspectionAt?: string | null;
  completedAt?: string | null;
  queueNotes?: string;
  onStatusUpdated?: (newStatus: string, timestamps?: Record<string, string>) => void;
  compact?: boolean;
}

/**
 * Format milliseconds into days, hours, minutes, seconds
 */
function formatTimeBreakdown(totalMs: number) {
  const safeMs = Math.max(0, totalMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    formatted: `${days > 0 ? `${days}d ` : ""}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`,
  };
}

/**
 * Format ISO timestamp nicely into readable local string
 */
function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

/**
 * Live Rental Timer Hook
 * Persisted and idempotent: refreshing never resets the timer.
 * Timer STARTS only after pickup is confirmed (picked_up_at).
 * Timer STOPS at verified return handover timestamp (handed_back_at).
 */
export function useRentalTimer({
  pickedUpAt,
  handedBackAt,
  completedAt,
  endDate,
}: {
  pickedUpAt?: string | null;
  handedBackAt?: string | null;
  completedAt?: string | null;
  endDate?: string | null;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  const isStarted = Boolean(pickedUpAt && !isNaN(Date.parse(pickedUpAt)));
  const isStopped = Boolean(
    (handedBackAt && !isNaN(Date.parse(handedBackAt))) ||
    (completedAt && !isNaN(Date.parse(completedAt)))
  );

  useEffect(() => {
    if (!isStarted || isStopped) return;

    // Tick every 1,000 ms while rental is actively running
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isStopped]);

  const timerData = useMemo(() => {
    if (!isStarted) {
      return {
        state: "NOT_STARTED" as const,
        elapsedFormatted: "00h 00m 00s",
        elapsed: { days: 0, hours: 0, minutes: 0, seconds: 0, formatted: "00h 00m 00s" },
        remainingFormatted: "Awaiting Pickup",
        remaining: null,
        isOverdue: false,
        durationVerifiedMs: 0,
      };
    }

    const startTime = Date.parse(pickedUpAt!);

    if (isStopped) {
      // FROZEN AT HANDOVER TIMESTAMP
      const stopIso = handedBackAt || completedAt!;
      const stopTime = Date.parse(stopIso);
      const totalDurationMs = Math.max(0, stopTime - startTime);
      const breakdown = formatTimeBreakdown(totalDurationMs);

      return {
        state: "STOPPED" as const,
        elapsedFormatted: breakdown.formatted,
        elapsed: breakdown,
        remainingFormatted: "Rental Handover Verified",
        remaining: null,
        isOverdue: false,
        durationVerifiedMs: totalDurationMs,
        stoppedAtIso: stopIso,
      };
    }

    // ACTUALLY RUNNING LIVE
    const elapsedMs = Math.max(0, now - startTime);
    const elapsed = formatTimeBreakdown(elapsedMs);

    let remainingBreakdown = null;
    let isOverdue = false;
    let remainingFormatted = "Ongoing";

    if (endDate) {
      // Calculate remaining time against target end date (assumed end of day 23:59:59 if no time given)
      const endParsed = Date.parse(endDate.includes("T") ? endDate : `${endDate}T23:59:59`);
      if (!isNaN(endParsed)) {
        const remainingMs = endParsed - now;
        if (remainingMs <= 0) {
          isOverdue = true;
          const over = formatTimeBreakdown(Math.abs(remainingMs));
          remainingFormatted = `+${over.formatted} Overdue`;
          remainingBreakdown = over;
        } else {
          remainingBreakdown = formatTimeBreakdown(remainingMs);
          remainingFormatted = remainingBreakdown.formatted;
        }
      }
    }

    return {
      state: "RUNNING" as const,
      elapsedFormatted: elapsed.formatted,
      elapsed,
      remainingFormatted,
      remaining: remainingBreakdown,
      isOverdue,
      durationVerifiedMs: elapsedMs,
    };
  }, [isStarted, isStopped, pickedUpAt, handedBackAt, completedAt, endDate, now]);

  return timerData;
}

/**
 * Determine milestone index (0 to 7) from status string
 */
export function getMilestoneIndex(status: string): number {
  const norm = (status || "").toLowerCase().trim().replace(/\s+/g, "_");
  switch (norm) {
    case "order_confirmed":
    case "confirmed":
      return 0;
    case "ready_for_pickup":
    case "ready":
      return 1;
    case "picked_up":
      return 2;
    case "rental_in_progress":
    case "active":
      return 3;
    case "return_initiated":
      return 4;
    case "item_handed_back_to_owner":
    case "item_handed_back":
    case "handed_back":
    case "returned":
      return 5;
    case "awaiting_owner_inspection":
    case "awaiting_inspection":
    case "inspection":
      return 6;
    case "rental_completed":
    case "completed":
      return 7;
    default:
      return 0;
  }
}

export function LiveRentalQueue({
  orderId,
  currentStatus,
  role = "renter",
  startDate,
  endDate,
  timeSlot,
  confirmedAt: propConfirmedAt,
  readyForPickupAt: propReadyForPickupAt,
  pickedUpAt: propPickedUpAt,
  returnInitiatedAt: propReturnInitiatedAt,
  handedBackAt: propHandedBackAt,
  awaitingInspectionAt: propAwaitingInspectionAt,
  completedAt: propCompletedAt,
  queueNotes: propQueueNotes,
  onStatusUpdated,
  compact = false,
}: LiveRentalQueueProps) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [timestamps, setTimestamps] = useState<Record<string, string | null>>({
    confirmed_at: propConfirmedAt || null,
    ready_for_pickup_at: propReadyForPickupAt || null,
    picked_up_at: propPickedUpAt || null,
    return_initiated_at: propReturnInitiatedAt || null,
    handed_back_at: propHandedBackAt || null,
    awaiting_inspection_at: propAwaitingInspectionAt || null,
    completed_at: propCompletedAt || null,
  });
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Keep state synced with incoming props
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setTimestamps({
      confirmed_at: propConfirmedAt || null,
      ready_for_pickup_at: propReadyForPickupAt || null,
      picked_up_at: propPickedUpAt || null,
      return_initiated_at: propReturnInitiatedAt || null,
      handed_back_at: propHandedBackAt || null,
      awaiting_inspection_at: propAwaitingInspectionAt || null,
      completed_at: propCompletedAt || null,
    });
  }, [
    propConfirmedAt,
    propReadyForPickupAt,
    propPickedUpAt,
    propReturnInitiatedAt,
    propHandedBackAt,
    propAwaitingInspectionAt,
    propCompletedAt,
  ]);

  // Current milestone index
  const currentIndex = useMemo(() => getMilestoneIndex(status), [status]);

  // Timer logic
  const timer = useRentalTimer({
    pickedUpAt: timestamps.picked_up_at,
    handedBackAt: timestamps.handed_back_at,
    completedAt: timestamps.completed_at,
    endDate,
  });

  // Cross-portal event listener to update live queue seamlessly
  useEffect(() => {
    const handleQueueUpdate = (e: Event) => {
      const custom = e as CustomEvent<{
        bookingId: string;
        milestone: string;
        data?: any;
      }>;
      if (custom.detail?.bookingId === orderId) {
        if (custom.detail.data?.status) {
          setStatus(custom.detail.data.status);
        }
        if (custom.detail.data?.all_timestamps || custom.detail.data?.timestamps) {
          const incoming = custom.detail.data.all_timestamps || custom.detail.data.timestamps;
          setTimestamps((prev) => ({
            ...prev,
            ...incoming,
          }));
        }
      }
    };

    window.addEventListener("payent_queue_updated", handleQueueUpdate);
    return () => {
      window.removeEventListener("payent_queue_updated", handleQueueUpdate);
    };
  }, [orderId]);

  // Milestone Definitions
  const milestones: QueueMilestone[] = useMemo(() => {
    const defs: {
      key: QueueMilestoneKey;
      label: string;
      shortLabel: string;
      desc: string;
      tsKey: string;
      icon: React.ComponentType<{ className?: string }>;
    }[] = [
      {
        key: "confirmed",
        label: "Order Confirmed",
        shortLabel: "Confirmed",
        desc: "Reservation verified and payment secured in escrow.",
        tsKey: "confirmed_at",
        icon: ShieldCheck,
      },
      {
        key: "ready_for_pickup",
        label: "Ready for Pickup",
        shortLabel: "Ready",
        desc: "Lender packed the gear and set up handover coordinates.",
        tsKey: "ready_for_pickup_at",
        icon: Package,
      },
      {
        key: "picked_up",
        label: "Picked Up",
        shortLabel: "Picked Up",
        desc: "Gear handed over to renter. Rental timer started.",
        tsKey: "picked_up_at",
        icon: Truck,
      },
      {
        key: "rental_in_progress",
        label: "Rental in Progress",
        shortLabel: "In Progress",
        desc: "Active production shoot with ongoing live rental timer.",
        tsKey: "picked_up_at", // Progress is active while picked up
        icon: Timer,
      },
      {
        key: "return_initiated",
        label: "Return Initiated",
        shortLabel: "Returning",
        desc: "Renter is heading to return location or transit booked.",
        tsKey: "return_initiated_at",
        icon: RotateCcw,
      },
      {
        key: "handed_back",
        label: "Item Handed Back to Owner",
        shortLabel: "Handed Back",
        desc: "Verified gear physical return. Rental timer stopped.",
        tsKey: "handed_back_at",
        icon: Pause,
      },
      {
        key: "awaiting_inspection",
        label: "Awaiting Owner Inspection",
        shortLabel: "Inspecting",
        desc: "Lender checking hardware, accessories, and sensor condition.",
        tsKey: "awaiting_inspection_at",
        icon: SearchCheck,
      },
      {
        key: "completed",
        label: "Rental Completed",
        shortLabel: "Completed",
        desc: "Deposit returned & payout finalized to lender wallet.",
        tsKey: "completed_at",
        icon: Award,
      },
    ];

    return defs.map((d, idx) => {
      const stepNumber = idx + 1;
      let milestoneStatus: "completed" | "current" | "pending" = "pending";
      if (currentIndex > idx) {
        milestoneStatus = "completed";
      } else if (currentIndex === idx) {
        milestoneStatus = "current";
      }

      // If order is completed, all steps are completed
      if (currentIndex === 7) {
        milestoneStatus = "completed";
      }

      return {
        key: d.key,
        stepNumber,
        label: d.label,
        shortLabel: d.shortLabel,
        description: d.desc,
        timestamp: (timestamps as any)[d.tsKey],
        status: milestoneStatus,
        icon: d.icon,
      };
    });
  }, [currentIndex, timestamps]);

  // Advance milestone handler
  const handleAdvanceMilestone = async (targetMilestone: string, actionLabel: string) => {
    setIsAdvancing(true);
    const token = storage.get<string | null>(STORAGE_KEYS.token, null);

    try {
      let res: any;
      if (role === "lender") {
        res = await payerntApi.advanceRentalQueue(orderId, targetMilestone);
      } else {
        if (!token) {
          toast.error("Please login to proceed.");
          setIsAdvancing(false);
          return;
        }
        res = await api.advanceRentalQueue(token, orderId, targetMilestone);
      }

      if (res && (res.success || res.status)) {
        toast.success(`Milestone reached: ${actionLabel}!`);
        const updatedStatus = res.status || targetMilestone;
        setStatus(updatedStatus);

        const newTimestamps = res.all_timestamps || res.timestamps || {};
        setTimestamps((prev) => ({
          ...prev,
          ...newTimestamps,
        }));

        if (onStatusUpdated) {
          onStatusUpdated(updatedStatus, newTimestamps);
        }
      } else {
        toast.error(res?.error || res?.detail || "Could not advance rental status.");
      }
    } catch (err: any) {
      console.error("Queue advance error:", err);
      toast.error(err?.message || "Failed to advance rental queue.");
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-black/10 dark:border-[#A1A1AA]/20 bg-white/95 dark:bg-[#0E1318]/95 backdrop-blur-md p-4 sm:p-5 shadow-sm space-y-5 transition-all text-left">
      {/* 1. Header & Live Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-neutral-900 dark:bg-white/10 text-white dark:text-[#F5F5F5] flex items-center justify-center shadow-xs shrink-0">
            <Timer className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm sm:text-base text-neutral-950 dark:text-[#F5F5F5] font-display">
                Live Rental Queue
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-[#A1A1AA] border border-black/5 dark:border-white/5">
                Stage {currentIndex + 1} of 8
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-[#A1A1AA]">
              Synchronized milestone tracking & persistent duration verification.
            </p>
          </div>
        </div>

        {/* Current status chip */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              currentIndex === 7
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                : currentIndex >= 2 && currentIndex <= 4
                ? "bg-primary/10 text-primary border-primary/25"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
            }`}
          >
            {currentIndex >= 2 && currentIndex <= 4 && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            )}
            <span>{milestones[currentIndex]?.label || "Rental Active"}</span>
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-neutral-500 dark:text-[#A1A1AA] hover:text-neutral-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            {isExpanded ? "Collapse" : "Details"}
          </button>
        </div>
      </div>

      {/* 2. PERSISTENT RENTAL TIMER HUD */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 bg-neutral-50 dark:bg-[#050709]/80 p-4 sm:p-5 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div
          className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl pointer-events-none transition-all ${
            timer.state === "RUNNING"
              ? "bg-emerald-500/15"
              : timer.state === "STOPPED"
              ? "bg-blue-500/15"
              : "bg-amber-500/10"
          }`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          {/* Box A: Elapsed Duration */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider">
              {timer.state === "RUNNING" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>Live Rental Elapsed Time</span>
                </>
              ) : timer.state === "STOPPED" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Verified Total Rental Duration</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Rental Timer Status</span>
                </>
              )}
            </div>

            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-neutral-950 dark:text-[#F5F5F5]">
              {timer.state === "NOT_STARTED" ? (
                <span className="text-xs font-medium text-neutral-400 dark:text-[#A1A1AA] font-sans">
                  Starts immediately upon equipment pickup confirmation
                </span>
              ) : (
                timer.elapsedFormatted
              )}
            </div>

            {timer.state === "STOPPED" && timestamps.handed_back_at && (
              <p className="text-[11px] text-neutral-500 dark:text-[#A1A1AA] font-medium">
                Verified handover timestamp:{" "}
                <strong className="text-neutral-800 dark:text-neutral-200">
                  {formatTimestamp(timestamps.handed_back_at)}
                </strong>
              </p>
            )}
          </div>

          {/* Box B: Time Remaining / Target */}
          <div className="space-y-1 sm:border-l border-black/5 dark:border-white/10 sm:pl-4">
            <div className="text-[11px] font-bold text-neutral-500 dark:text-[#A1A1AA] uppercase tracking-wider">
              {timer.state === "STOPPED" ? "Return Status" : "Rental Period Remaining"}
            </div>
            <div
              className={`text-base sm:text-lg font-bold font-mono ${
                timer.isOverdue
                  ? "text-red-500 dark:text-red-400 animate-pulse"
                  : timer.state === "RUNNING"
                  ? "text-neutral-900 dark:text-[#F5F5F5]"
                  : "text-neutral-500 dark:text-[#A1A1AA]"
              }`}
            >
              {timer.remainingFormatted}
            </div>
            {endDate && (
              <p className="text-[11px] text-neutral-500 dark:text-[#A1A1AA]">
                Scheduled Return: <strong className="text-neutral-700 dark:text-neutral-300">{endDate}</strong>
                {timeSlot ? ` (${timeSlot.replace(/_/g, " ")})` : ""}
              </p>
            )}
          </div>

          {/* Box C: Role-Aware Quick Milestone Action */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-center sm:items-end">
            {role === "lender" && (
              <div className="w-full sm:w-auto">
                {currentIndex === 0 && (
                  <button
                    onClick={() => handleAdvanceMilestone("ready_for_pickup", "Gear Packed & Ready")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>{isAdvancing ? "Updating..." : "Mark Ready for Pickup"}</span>
                  </button>
                )}
                {currentIndex === 1 && (
                  <button
                    onClick={() => handleAdvanceMilestone("picked_up", "Pickup Verified (Timer Started)")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{isAdvancing ? "Starting Timer..." : "Confirm Pickup Handover"}</span>
                  </button>
                )}
                {(currentIndex === 3 || currentIndex === 4) && (
                  <button
                    onClick={() => handleAdvanceMilestone("handed_back", "Return Verified (Timer Stopped)")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    <span>{isAdvancing ? "Stopping Timer..." : "Confirm Return Received"}</span>
                  </button>
                )}
                {currentIndex === 5 && (
                  <button
                    onClick={() => handleAdvanceMilestone("awaiting_inspection", "Equipment Inspection Begun")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <SearchCheck className="h-3.5 w-3.5" />
                    <span>{isAdvancing ? "Updating..." : "Start Gear Inspection"}</span>
                  </button>
                )}
                {currentIndex === 6 && (
                  <button
                    onClick={() => handleAdvanceMilestone("completed", "Rental Completed & Wallet Credited")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>{isAdvancing ? "Finalizing..." : "Approve & Complete Rental"}</span>
                  </button>
                )}
                {currentIndex === 7 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Completed & Wallet Credited</span>
                  </span>
                )}
              </div>
            )}

            {role === "renter" && (
              <div className="w-full sm:w-auto">
                {currentIndex === 1 && (
                  <button
                    onClick={() => handleAdvanceMilestone("picked_up", "Pickup Confirmed (Timer Started)")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{isAdvancing ? "Starting Timer..." : "Confirm Gear Pickup"}</span>
                  </button>
                )}
                {currentIndex === 3 && (
                  <button
                    onClick={() => handleAdvanceMilestone("return_initiated", "Return Initiated")}
                    disabled={isAdvancing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{isAdvancing ? "Updating..." : "Initiate Gear Return"}</span>
                  </button>
                )}
                {currentIndex === 4 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Truck className="h-4 w-4" />
                    <span>Return in transit to lender</span>
                  </span>
                )}
                {currentIndex >= 5 && currentIndex < 7 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                    <SearchCheck className="h-4 w-4" />
                    <span>Lender inspecting equipment condition</span>
                  </span>
                )}
                {currentIndex === 7 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Rental Completed & Deposit Released</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 8-MILESTONE PROGRESS TRACKER */}
      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* Desktop/Tablet Horizontal Rail */}
          <div className="hidden lg:grid grid-cols-8 gap-2 relative">
            {milestones.map((m, idx) => {
              const isCompleted = m.status === "completed";
              const isCurrent = m.status === "current";
              const Icon = m.icon;

              return (
                <div
                  key={m.key}
                  className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/20"
                      : isCompleted
                      ? "border-black/5 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02]"
                      : "border-black/5 dark:border-white/5 bg-transparent opacity-60"
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 animate-pulse"
                        : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-[#A1A1AA]"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : m.stepNumber}
                  </div>

                  <span
                    className={`text-[11px] font-bold line-clamp-1 ${
                      isCurrent
                        ? "text-neutral-950 dark:text-[#F5F5F5] font-extrabold"
                        : isCompleted
                        ? "text-neutral-800 dark:text-neutral-300"
                        : "text-neutral-400 dark:text-[#A1A1AA]/60"
                    }`}
                  >
                    {m.shortLabel}
                  </span>

                  {m.timestamp ? (
                    <span className="text-[9px] font-mono text-neutral-500 dark:text-[#A1A1AA] mt-1">
                      {formatTimestamp(m.timestamp)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-600 mt-1">
                      {isCompleted ? "Verified" : "Pending"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile / Compact Stepper View */}
          <div className="lg:hidden space-y-2">
            {milestones.map((m) => {
              const isCompleted = m.status === "completed";
              const isCurrent = m.status === "current";
              const Icon = m.icon;

              return (
                <div
                  key={m.key}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs"
                      : isCompleted
                      ? "border-black/5 dark:border-white/10 bg-neutral-50/60 dark:bg-white/[0.02]"
                      : "border-black/5 dark:border-white/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                          : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-[#A1A1AA]"
                      }`}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : m.stepNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-neutral-900 dark:text-[#F5F5F5] truncate">
                        {m.label}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-[#A1A1AA] line-clamp-1">
                        {m.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {m.timestamp ? (
                      <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400">
                        {formatTimestamp(m.timestamp)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400">
                        {isCompleted ? "Verified" : "Pending"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveRentalQueue;
