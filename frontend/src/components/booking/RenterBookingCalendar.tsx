import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Lock,
  CalendarOff,
  RefreshCw,
  Info,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/utils/api";
import { storage, STORAGE_KEYS } from "@/utils/storage";

export interface RenterBookingCalendarProps {
  productId: string | number;
  selectedStartDate: string; // YYYY-MM-DD
  selectedEndDate: string; // YYYY-MM-DD
  onDateChange?: (startDate: string, endDate: string) => void;
  onSelectStartDate?: (startDate: string) => void;
  onSelectEndDate?: (endDate: string) => void;
  durationMode?: "single" | "custom" | string;
  minDate?: string; // YYYY-MM-DD, defaults to today
  disabled?: boolean;
  className?: string;
  session?: "morning" | "afternoon" | "full_day" | string;
  selectedSlot?: string;
  onSelectDurationMode?: (mode: string) => void;
  onSelectSlot?: (slot: string) => void;
  productTitle?: string;
  pricePerDay?: number;
  productAvailable?: boolean;
  [key: string]: any;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function getTodayKey(): string {
  const d = new Date();
  return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

interface CachedAvailability {
  blockedDates: Set<string>;
  bookedDates: Set<string>;
  preparationBlockedDates: Set<string>;
  timestamp: number;
}

const AVAILABILITY_CACHE_TTL_MS = 30_000; // 30 seconds fresh cache
const availabilityCache = new Map<string, CachedAvailability>();
const inFlightRequests = new Map<string, Promise<{ blocked: Set<string>; booked: Set<string>; prepBlocked: Set<string> }>>();

export function invalidateCalendarAvailabilityCache(productId?: string | number) {
  if (!productId) {
    availabilityCache.clear();
  } else {
    const prefix = `${productId}:`;
    for (const key of availabilityCache.keys()) {
      if (key.startsWith(prefix)) {
        availabilityCache.delete(key);
      }
    }
  }
}

export const RenterBookingCalendar: React.FC<RenterBookingCalendarProps> = ({
  productId,
  selectedStartDate,
  selectedEndDate,
  onDateChange,
  onSelectStartDate,
  onSelectEndDate,
  durationMode = "single",
  minDate,
  disabled = false,
  className,
  session = "full_day",
  selectedSlot,
  onSelectDurationMode,
  ...rest
}) => {
  const handleDatesUpdate = useCallback((start: string, end: string) => {
    if (onDateChange) onDateChange(start, end);
    if (onSelectStartDate) onSelectStartDate(start);
    if (onSelectEndDate) onSelectEndDate(end);
  }, [onDateChange, onSelectStartDate, onSelectEndDate]);
  const todayKey = useMemo(() => getTodayKey(), []);
  const effectiveMinDate = minDate || todayKey;

  // View state (Year & Month)
  const [viewDate, setViewDate] = useState(() => {
    if (selectedStartDate) {
      const parts = selectedStartDate.split("-").map(Number);
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date();
  });

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Availability data fetched from backend
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [preparationBlockedDates, setPreparationBlockedDates] = useState<Set<string>>(new Set());
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isProvisional, setIsProvisional] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Range selection UX state
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<"start" | "end">("end");
  const isPickingEnd = activeTarget === "end";

  // Controller and debounce references
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const debounceTimerRef = React.useRef<any>(null);

  // Determine date bounds for current calendar view to fetch availability
  const { viewStartDateStr, viewEndDateStr } = useMemo(() => {
    const start = formatDateKey(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const end = formatDateKey(viewYear, viewMonth, lastDayOfMonth);
    return { viewStartDateStr: start, viewEndDateStr: end };
  }, [viewYear, viewMonth]);

  // Fetch availability from backend with caching, deduplication, and abort handling
  const fetchAvailability = useCallback(async (forceRefresh = false) => {
    if (!productId) return;

    // Lookahead 3 months for smooth navigation
    const threeMonthsLater = new Date(viewYear, viewMonth + 3, 0);
    const lookaheadEndStr = formatDateKey(
      threeMonthsLater.getFullYear(),
      threeMonthsLater.getMonth(),
      threeMonthsLater.getDate()
    );

    const effectiveSession = durationMode === "custom" ? "full_day" : (session || "full_day");
    const sessionQuery = `&session=${encodeURIComponent(effectiveSession)}`;
    const cacheKey = `${productId}:${viewStartDateStr}:${lookaheadEndStr}:${effectiveSession}`;

    // 1. Check client-side short-lived cache
    if (!forceRefresh) {
      const cached = availabilityCache.get(cacheKey);
      if (cached) {
        const isFresh = Date.now() - cached.timestamp < AVAILABILITY_CACHE_TTL_MS;
        setBlockedDates(cached.blockedDates);
        setBookedDates(cached.bookedDates);
        setPreparationBlockedDates(cached.preparationBlockedDates || new Set());
        setFetchError(null);
        if (isFresh) {
          setIsLoadingAvailability(false);
          setIsProvisional(false);
          return;
        } else {
          // Display cached data immediately while refreshing in background
          setIsProvisional(true);
        }
      }
    }

    // 2. Abort any previous pending request for this component
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingAvailability(true);
    setFetchError(null);

    // Timeout guard (8s) to prevent endless synchronization spinner
    const timeoutId = setTimeout(() => {
      controller.abort("TIMEOUT");
    }, 8000);

    try {
      // 3. Deduplicate concurrent identical requests
      let reqPromise = inFlightRequests.get(cacheKey);
      if (!reqPromise) {
        reqPromise = (async () => {
          const apiBase = getApiBase();
          const res = await fetch(
            `${apiBase}/api/products/${encodeURIComponent(productId)}/availability?start_date=${viewStartDateStr}&end_date=${lookaheadEndStr}${sessionQuery}`,
            { signal: controller.signal }
          );

          if (!res.ok) {
            if (res.status === 404) {
              // Gracefully handle unseeded showcase products: inspect local active orders
              const localOrders = storage.get<any[]>(STORAGE_KEYS.orders, []);
              const relevant = localOrders.filter(
                (o) =>
                  (String(o.productId || o.product_id) === String(productId)) &&
                  o.status !== "cancelled"
              );
              const booked = new Set<string>();
              const prepBlocked = new Set<string>();
              const blocked = new Set<string>();
              for (const o of relevant) {
                if (o.startDate && o.endDate) {
                  const [sY, sM, sD] = String(o.startDate).split("-").map(Number);
                  const [eY, eM, eD] = String(o.endDate).split("-").map(Number);
                  const cur = new Date(sY, sM - 1, sD);
                  const end = new Date(eY, eM - 1, eD);
                  while (cur <= end) {
                    booked.add(formatDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate()));
                    cur.setDate(cur.getDate() + 1);
                  }
                  // Automatically block next calendar day following existing booking
                  const nextDay = new Date(eY, eM - 1, eD + 1);
                  const nextKey = formatDateKey(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
                  prepBlocked.add(nextKey);
                  blocked.add(nextKey);
                }
              }
              return { blocked, booked, prepBlocked };
            }
            throw new Error(`Availability check failed with status ${res.status}`);
          }

          const data = await res.json();
          const prepList = Array.isArray(data.preparationBlockedDates)
            ? data.preparationBlockedDates
            : Array.isArray(data.preparation_blocked_dates)
            ? data.preparation_blocked_dates
            : [];
          const prepBlocked = new Set<string>(prepList);
          const blocked = new Set<string>(
            Array.isArray(data.blockedDates) ? data.blockedDates : (Array.isArray(data.blocked_dates) ? data.blocked_dates : [])
          );
          const booked = new Set<string>(
            Array.isArray(data.bookedDates) ? data.bookedDates : (Array.isArray(data.booked_dates) ? data.booked_dates : [])
          );

          return { blocked, booked, prepBlocked };
        })();

        inFlightRequests.set(cacheKey, reqPromise);
      }

      const { blocked, booked, prepBlocked } = await reqPromise;

      // Update short-lived cache
      availabilityCache.set(cacheKey, {
        blockedDates: blocked,
        bookedDates: booked,
        preparationBlockedDates: prepBlocked,
        timestamp: Date.now(),
      });

      setBlockedDates(blocked);
      setBookedDates(booked);
      setPreparationBlockedDates(prepBlocked);
      setIsProvisional(false);
      setFetchError(null);
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        if (controller.signal.reason === "TIMEOUT") {
          setFetchError("Availability check timed out. Please retry.");
        }
        return;
      }
      console.error("Failed to fetch product calendar availability:", err);
      setFetchError("Could not load real-time availability. Please retry.");
    } finally {
      clearTimeout(timeoutId);
      inFlightRequests.delete(cacheKey);
      if (abortControllerRef.current === controller) {
        setIsLoadingAvailability(false);
      }
    }
  }, [productId, viewStartDateStr, viewYear, viewMonth, session, durationMode]);

  // Debounced fetch on calendar parameter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchAvailability();
    }, 120);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchAvailability]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Live availability synchronization on booking creation, cancellation, or local storage change
  useEffect(() => {
    const handleSync = () => {
      invalidateCalendarAvailabilityCache(productId);
      fetchAvailability(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("payent_orders_updated", handleSync);
      window.addEventListener("payent_booking_updated", handleSync);
      window.addEventListener("storage", handleSync);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("payent_orders_updated", handleSync);
        window.removeEventListener("payent_booking_updated", handleSync);
        window.removeEventListener("storage", handleSync);
      }
    };
  }, [productId, fetchAvailability]);

  // Previous month navigation guard (cannot go before current month)
  const isPrevDisabled = useMemo(() => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth();
    return viewYear < curYear || (viewYear === curYear && viewMonth <= curMonth);
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleTodayJump = () => {
    setViewDate(new Date());
  };

  // Calendar cells generation
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isPast: boolean;
      isBlocked: boolean;
      isBooked: boolean;
      isPrepBlocked?: boolean;
    }> = [];

    // Empty lead cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        dayNumber: 0,
        dateKey: `prev-empty-${i}`,
        isCurrentMonth: false,
        isPast: true,
        isBlocked: false,
        isBooked: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(viewYear, viewMonth, day);
      const isPast = dateKey < effectiveMinDate;
      const isPrepBlocked = preparationBlockedDates.has(dateKey);
      const isBlocked = blockedDates.has(dateKey) || isPrepBlocked;
      const isBooked = bookedDates.has(dateKey);

      days.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: true,
        isPast,
        isBlocked,
        isBooked,
        isPrepBlocked,
      });
    }

    return days;
  }, [viewYear, viewMonth, effectiveMinDate, blockedDates, bookedDates, preparationBlockedDates]);

  // Check if a range [start, end] contains any unavailable dates
  const checkRangeUnavailable = useCallback(
    (startKey: string, endKey: string): { hasConflict: boolean; reason?: "preparation_blocked" | "blocked" | "booked"; date?: string } => {
      if (startKey > endKey) {
        [startKey, endKey] = [endKey, startKey];
      }

      const [sY, sM, sD] = startKey.split("-").map(Number);
      const [eY, eM, eD] = endKey.split("-").map(Number);

      const cur = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);

      while (cur <= end) {
        const key = formatDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
        if (preparationBlockedDates.has(key)) {
          return { hasConflict: true, reason: "preparation_blocked", date: key };
        }
        if (blockedDates.has(key)) {
          return { hasConflict: true, reason: "blocked", date: key };
        }
        if (bookedDates.has(key)) {
          return { hasConflict: true, reason: "booked", date: key };
        }
        cur.setDate(cur.getDate() + 1);
      }

      return { hasConflict: false };
    },
    [blockedDates, bookedDates, preparationBlockedDates]
  );

  // Cell Click Handler
  const handleDateClick = (dateKey: string, isBlocked: boolean, isBooked: boolean, isPast: boolean, isPrepBlocked?: boolean) => {
    if (disabled || isPast) return;

    // Prevent selecting unverified dates if availability check failed completely
    if (fetchError && blockedDates.size === 0 && bookedDates.size === 0) {
      setConflictMessage("Availability could not be verified from the server. Please click Retry to verify dates before selecting.");
      return;
    }

    // Direct click on preparation blocked date (day following existing booking)
    if (isPrepBlocked || preparationBlockedDates.has(dateKey)) {
      setConflictMessage("This product is unavailable on the day following an existing booking.");
      return;
    }

    // Direct click on blocked date
    if (isBlocked) {
      setConflictMessage(`Date ${dateKey} is BLOCKED by the owner for maintenance or personal use. Please select an available date.`);
      return;
    }

    // Direct click on booked date
    if (isBooked) {
      const sessionLabel = durationMode === "custom" ? "Full Day rentals" : session === "morning" ? "Morning session" : session === "afternoon" ? "Afternoon session" : "Full Day session";
      setConflictMessage(`Date ${dateKey} is ALREADY BOOKED for the ${sessionLabel}. Please select another date or session.`);
      return;
    }

    setConflictMessage(null);

    // Single-day mode
    if (durationMode !== "custom") {
      handleDatesUpdate(dateKey, dateKey);
      setActiveTarget("start");
      return;
    }

    // Multi-day custom mode: Picking / Changing Start Date
    if (activeTarget === "start" || !selectedStartDate) {
      let newEnd = selectedEndDate;
      if (!newEnd || dateKey >= newEnd) {
        // Automatically default return date to start date + 1 day
        const [y, m, d] = dateKey.split("-").map(Number);
        const nextDay = new Date(y, m - 1, d + 1);
        newEnd = formatDateKey(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
      }
      handleDatesUpdate(dateKey, newEnd);
      setActiveTarget("end");
      return;
    }

    // Multi-day custom mode: Picking / Changing Return Date (activeTarget === "end")
    if (dateKey < selectedStartDate) {
      // User clicked an earlier date, seamlessly restart range with start as this date
      const [y, m, d] = dateKey.split("-").map(Number);
      const nextDay = new Date(y, m - 1, d + 1);
      const defaultEnd = formatDateKey(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
      handleDatesUpdate(dateKey, defaultEnd);
      setActiveTarget("end");
      return;
    }

    if (dateKey === selectedStartDate) {
      // Clicking same date: enforce at least 2 days for multi-day rental
      const [y, m, d] = dateKey.split("-").map(Number);
      const nextDay = new Date(y, m - 1, d + 1);
      const defaultEnd = formatDateKey(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());
      handleDatesUpdate(selectedStartDate, defaultEnd);
      setActiveTarget("end");
      return;
    }

    // Verify all dates in between are continuously available
    const conflict = checkRangeUnavailable(selectedStartDate, dateKey);
    if (conflict.hasConflict) {
      if (conflict.reason === "preparation_blocked") {
        setConflictMessage(
          `Cannot select this range: Date ${conflict.date} is unavailable on the day following an existing booking.`
        );
      } else if (conflict.reason === "blocked") {
        setConflictMessage(
          `Cannot select this range: Date ${conflict.date} is blocked by the owner. Please choose continuous available dates.`
        );
      } else {
        setConflictMessage(
          `Cannot select this range: Date ${conflict.date} is already reserved. Please choose continuous available dates.`
        );
      }
      return;
    }

    // Valid range selected!
    handleDatesUpdate(selectedStartDate, dateKey);
    setHoveredDate(null);
  };

  // Helper to determine styling for a cell
  const getCellState = (dateKey: string, isBlocked: boolean, isBooked: boolean, isPast: boolean, isPrepBlocked?: boolean) => {
    if (isPast) return "past";
    if (isPrepBlocked || preparationBlockedDates.has(dateKey)) return "preparation-blocked";
    if (isBooked) return "booked";
    if (isBlocked) return "blocked";

    const isStart = dateKey === selectedStartDate;
    const isEnd = dateKey === selectedEndDate;

    if (isStart && isEnd) return "selected-single";
    if (isStart) return "selected-start";
    if (isEnd) return "selected-end";

    // Check if in selected range
    if (selectedStartDate && selectedEndDate && dateKey > selectedStartDate && dateKey < selectedEndDate) {
      return "selected-in-range";
    }

    // Check hover preview during range selection
    if (
      isPickingEnd &&
      selectedStartDate &&
      hoveredDate &&
      hoveredDate > selectedStartDate &&
      dateKey > selectedStartDate &&
      dateKey <= hoveredDate
    ) {
      return "hover-in-range";
    }

    return "available";
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-3 sm:p-3.5 space-y-2.5 sm:space-y-3",
        className
      )}
    >
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground block font-medium">
              {durationMode === "custom"
                ? isPickingEnd
                  ? "Select return date"
                  : "Select rental start date"
                : "Select rental date"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTodayJump}
            className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
            title="Jump to today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-1 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-foreground"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer text-foreground"
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented Mode Switcher (Single Day vs Multi-Day Range) */}
      {onSelectDurationMode && (
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200/90 dark:border-neutral-700/80 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              onSelectDurationMode("full_day");
              setActiveTarget("start");
              if (selectedStartDate) {
                handleDatesUpdate(selectedStartDate, selectedStartDate);
              }
            }}
            className={cn(
              "flex-1 py-1 px-2.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1",
              durationMode !== "custom"
                ? "bg-white dark:bg-[#1E1E1E] text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="w-3 h-3 shrink-0" />
            <span>Single Day</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectDurationMode("custom");
              setActiveTarget(selectedStartDate ? "end" : "start");
            }}
            className={cn(
              "flex-1 py-1 px-2.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1",
              durationMode === "custom"
                ? "bg-white dark:bg-[#1E1E1E] text-primary shadow-xs font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-3 h-3 shrink-0 text-emerald-500" />
            <span>Multi-Day Range</span>
          </button>
        </div>
      )}

      {/* Date Range Selection Tabs in Multi-Day Mode */}
      {durationMode === "custom" && (
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200/90 dark:border-neutral-700/80 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTarget("start");
              setConflictMessage(null);
            }}
            className={cn(
              "p-2 rounded-lg text-left transition-all cursor-pointer flex flex-col min-w-0",
              activeTarget === "start"
                ? "bg-white dark:bg-[#1E1E1E] text-primary shadow-xs font-bold ring-2 ring-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70 truncate">
              1. Start Date {activeTarget === "start" && "• Picking"}
            </span>
            <span className="font-mono font-bold text-xs truncate">
              {selectedStartDate || "Pick start"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTarget("end");
              setConflictMessage(null);
            }}
            className={cn(
              "p-2 rounded-lg text-left transition-all cursor-pointer flex flex-col min-w-0",
              activeTarget === "end"
                ? "bg-white dark:bg-[#1E1E1E] text-primary shadow-xs font-bold ring-2 ring-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70 truncate">
              2. Return Date {activeTarget === "end" && "• Picking"}
            </span>
            <span className="font-mono font-bold text-xs truncate">
              {selectedEndDate || "Pick return"}
            </span>
          </button>
        </div>
      )}

      {/* Real-time sync / fetch status indicator */}
      {isLoadingAvailability && (
        <div className="flex items-center justify-between text-[11px] text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-primary shrink-0" />
            <span>Synchronizing live product availability...</span>
          </div>
          {isProvisional && (
            <span className="text-[10px] font-medium text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded shrink-0">
              Cached (revalidating)
            </span>
          )}
        </div>
      )}

      {fetchError && (
        <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              invalidateCalendarAvailabilityCache(productId);
              fetchAvailability(true);
            }}
            className="text-xs underline font-bold cursor-pointer hover:opacity-80 ml-2 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Conflict / Validation Message Banner */}
      {conflictMessage && (
        <div className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 animate-in fade-in duration-200">
          <CalendarOff className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] leading-tight font-medium">
            {conflictMessage}
          </div>
          <button
            type="button"
            onClick={() => setConflictMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-muted-foreground pb-1">
        {WEEKDAY_NAMES.map((name, idx) => (
          <div
            key={name}
            className={cn(
              "py-1",
              idx === 0 || idx === 6 ? "text-muted-foreground/70" : ""
            )}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell) => {
          if (!cell.isCurrentMonth) {
            return (
              <div
                key={cell.dateKey}
                className="h-8 sm:h-8.5 rounded-xl bg-transparent"
              />
            );
          }

          const cellState = getCellState(
            cell.dateKey,
            cell.isBlocked,
            cell.isBooked,
            cell.isPast,
            cell.isPrepBlocked
          );

          // State-based Styling
          const isSingle = cellState === "selected-single";
          const isStart = cellState === "selected-start";
          const isEnd = cellState === "selected-end";
          const isInRange = cellState === "selected-in-range";
          const isHoverRange = cellState === "hover-in-range";
          const isPrepBlocked = cellState === "preparation-blocked";
          const isBlocked = cellState === "blocked";
          const isBooked = cellState === "booked";
          const isPast = cellState === "past";

          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={disabled || isPast}
              onClick={() =>
                handleDateClick(
                  cell.dateKey,
                  cell.isBlocked,
                  cell.isBooked,
                  cell.isPast,
                  cell.isPrepBlocked
                )
              }
              onMouseEnter={() => {
                if (isPickingEnd && !cell.isPast && !cell.isBlocked && !cell.isBooked && !cell.isPrepBlocked) {
                  setHoveredDate(cell.dateKey);
                }
              }}
              title={
                isPrepBlocked
                  ? `BLOCKED / PREPARATION DAY — This product is unavailable on the day following an existing booking. (${cell.dateKey})`
                  : isBooked
                  ? `BOOKED — Already reserved by a renter (${cell.dateKey})`
                  : isBlocked
                  ? `Blocked by Owner (${cell.dateKey})`
                  : isPast
                  ? `Past Date (${cell.dateKey})`
                  : `Available: ${cell.dateKey}`
              }
              className={cn(
                "relative h-8 sm:h-8.5 flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all select-none",
                // Available Normal
                cellState === "available" &&
                  "bg-card hover:bg-primary/10 hover:border-primary/50 text-foreground border border-border/80 cursor-pointer",
                // Past Disabled
                isPast &&
                  "opacity-30 text-muted-foreground bg-muted/20 border border-transparent cursor-not-allowed",
                // Actual Booked Day - RED + High Contrast Strikethrough
                isBooked &&
                  "bg-red-500/15 dark:bg-red-950/40 border border-red-500/50 text-red-600 dark:text-red-400 font-bold cursor-not-allowed shadow-inner",
                // Automatic Next-Day Blocked / Preparation Day - AMBER + Strikethrough
                isPrepBlocked &&
                  "bg-amber-500/15 dark:bg-amber-950/40 border border-amber-500/50 text-amber-700 dark:text-amber-400 font-bold cursor-not-allowed shadow-inner",
                // Owner Blocked Day
                isBlocked &&
                  "bg-neutral-500/15 dark:bg-neutral-800/40 border border-neutral-400/50 text-neutral-500 dark:text-neutral-400 font-bold cursor-not-allowed",
                // Selected Single
                isSingle &&
                  "bg-primary text-primary-foreground font-black shadow-md border border-primary ring-2 ring-primary/30 z-10 scale-[1.03]",
                // Selected Start
                isStart &&
                  "bg-primary text-primary-foreground font-black rounded-r-none shadow-md border-y border-l border-primary z-10",
                // Selected End
                isEnd &&
                  "bg-primary text-primary-foreground font-black rounded-l-none shadow-md border-y border-r border-primary z-10",
                // In range
                isInRange &&
                  "bg-primary/20 text-primary font-bold rounded-none border-y border-primary/30",
                // Hover Range Preview
                isHoverRange &&
                  "bg-primary/10 text-primary rounded-none border-y border-dashed border-primary/40"
              )}
            >
              <span
                className={cn(
                  "relative z-10 leading-none",
                  isBooked &&
                    "line-through decoration-red-600 dark:decoration-red-400 decoration-2 font-medium text-red-600 dark:text-red-400",
                  isPrepBlocked &&
                    "line-through decoration-amber-600 dark:decoration-amber-400 decoration-2 font-medium text-amber-700 dark:text-amber-400",
                  isBlocked && !isPrepBlocked &&
                    "line-through decoration-neutral-500 decoration-1 text-neutral-500 dark:text-neutral-400"
                )}
              >
                {cell.dayNumber}
              </span>

              {/* Status indicator pin/dot */}
              {isBooked && (
                <span
                  className="w-1 h-1 rounded-full bg-red-600 dark:bg-red-400 absolute bottom-1"
                  aria-label="Already booked"
                />
              )}
              {isPrepBlocked && (
                <span
                  className="w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-400 absolute bottom-1"
                  aria-label="Preparation day blocked"
                />
              )}
              {isBlocked && !isPrepBlocked && (
                <span
                  className="w-1 h-1 rounded-full bg-neutral-400 absolute bottom-1"
                  aria-label="Blocked by owner"
                />
              )}
              {(isSingle || isStart || isEnd) && (
                <span className="w-1 h-1 rounded-full bg-primary-foreground absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Dates Summary Bar */}
      <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-medium text-muted-foreground">
            {selectedStartDate ? (
              <span>
                Selected:{" "}
                <strong className="text-foreground font-mono">
                  {selectedStartDate}
                </strong>
                {durationMode === "custom" && selectedEndDate && selectedEndDate !== selectedStartDate && (
                  <>
                    {" "}
                    →{" "}
                    <strong className="text-foreground font-mono">
                      {selectedEndDate}
                    </strong>
                  </>
                )}
              </span>
            ) : (
              <span className="italic">No date selected yet</span>
            )}
          </div>
        </div>

        {selectedStartDate && (
          <button
            type="button"
            onClick={() => {
              handleDatesUpdate("", "");
              setActiveTarget("start");
              setConflictMessage(null);
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground font-semibold underline cursor-pointer"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Compact Legend Explaining Date States */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-card border border-border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-red-500/20 border border-red-500/50 flex items-center justify-center">
            <span className="text-[8px] font-bold line-through text-red-600 dark:text-red-400">12</span>
          </div>
          <span className="text-red-600 dark:text-red-400 font-semibold">
            Booked
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
            <span className="text-[8px] font-bold line-through text-amber-700 dark:text-amber-400">13</span>
          </div>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">
            Blocked / Prep Day
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-neutral-500/15 border border-neutral-400/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
          </div>
          <span className="text-muted-foreground">Owner Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-primary text-primary-foreground font-bold flex items-center justify-center text-[8px]">
            ✓
          </div>
          <span className="text-foreground font-semibold">Selected</span>
        </div>
      </div>
    </div>
  );
};

export default RenterBookingCalendar;
