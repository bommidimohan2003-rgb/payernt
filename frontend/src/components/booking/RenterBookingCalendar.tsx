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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiBase } from "@/utils/api";

export interface RenterBookingCalendarProps {
  productId: string | number;
  selectedStartDate: string; // YYYY-MM-DD
  selectedEndDate: string; // YYYY-MM-DD
  onDateChange: (startDate: string, endDate: string) => void;
  durationMode?: "single" | "custom" | string;
  minDate?: string; // YYYY-MM-DD, defaults to today
  disabled?: boolean;
  className?: string;
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

export const RenterBookingCalendar: React.FC<RenterBookingCalendarProps> = ({
  productId,
  selectedStartDate,
  selectedEndDate,
  onDateChange,
  durationMode = "single",
  minDate,
  disabled = false,
  className,
}) => {
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
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Range selection UX state
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isPickingEnd, setIsPickingEnd] = useState(false);

  // Determine date bounds for current calendar view to fetch availability
  const { viewStartDateStr, viewEndDateStr } = useMemo(() => {
    const start = formatDateKey(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const end = formatDateKey(viewYear, viewMonth, lastDayOfMonth);
    return { viewStartDateStr: start, viewEndDateStr: end };
  }, [viewYear, viewMonth]);

  // Fetch availability from backend
  const fetchAvailability = useCallback(async () => {
    if (!productId) return;
    setIsLoadingAvailability(true);
    setFetchError(null);

    try {
      // Lookahead 3 months for smooth navigation
      const threeMonthsLater = new Date(viewYear, viewMonth + 3, 0);
      const lookaheadEndStr = formatDateKey(
        threeMonthsLater.getFullYear(),
        threeMonthsLater.getMonth(),
        threeMonthsLater.getDate()
      );

      const apiBase = getApiBase();
      const res = await fetch(
        `${apiBase}/api/products/${encodeURIComponent(productId)}/availability?start_date=${viewStartDateStr}&end_date=${lookaheadEndStr}`
      );

      if (!res.ok) {
        throw new Error(`Availability check failed with status ${res.status}`);
      }

      const data = await res.json();
      const blocked = new Set<string>(
        Array.isArray(data.blockedDates) ? data.blockedDates : []
      );
      const booked = new Set<string>(
        Array.isArray(data.bookedDates) ? data.bookedDates : []
      );

      setBlockedDates(blocked);
      setBookedDates(booked);
    } catch (err: any) {
      console.error("Failed to fetch product calendar availability:", err);
      setFetchError("Could not load real-time availability. Please refresh.");
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [productId, viewStartDateStr, viewYear, viewMonth]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

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
      const isBlocked = blockedDates.has(dateKey);
      const isBooked = bookedDates.has(dateKey);

      days.push({
        dayNumber: day,
        dateKey,
        isCurrentMonth: true,
        isPast,
        isBlocked,
        isBooked,
      });
    }

    return days;
  }, [viewYear, viewMonth, effectiveMinDate, blockedDates, bookedDates]);

  // Check if a range [start, end] contains any unavailable dates
  const checkRangeUnavailable = useCallback(
    (startKey: string, endKey: string): { hasConflict: boolean; reason?: "blocked" | "booked"; date?: string } => {
      if (startKey > endKey) {
        [startKey, endKey] = [endKey, startKey];
      }

      const [sY, sM, sD] = startKey.split("-").map(Number);
      const [eY, eM, eD] = endKey.split("-").map(Number);

      const cur = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);

      while (cur <= end) {
        const key = formatDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
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
    [blockedDates, bookedDates]
  );

  // Cell Click Handler
  const handleDateClick = (dateKey: string, isBlocked: boolean, isBooked: boolean, isPast: boolean) => {
    if (disabled || isPast) return;

    // Direct click on blocked date
    if (isBlocked) {
      setConflictMessage(`Date ${dateKey} is BLOCKED by the owner for maintenance or personal use.`);
      return;
    }

    // Direct click on booked date
    if (isBooked) {
      setConflictMessage(`Date ${dateKey} is ALREADY BOOKED by another renter.`);
      return;
    }

    setConflictMessage(null);

    // Single-day mode
    if (durationMode !== "custom") {
      onDateChange(dateKey, dateKey);
      setIsPickingEnd(false);
      return;
    }

    // Multi-day custom mode
    if (!isPickingEnd || !selectedStartDate) {
      // Pick start date
      onDateChange(dateKey, dateKey);
      setIsPickingEnd(true);
      return;
    }

    // We are picking the return / end date
    if (dateKey < selectedStartDate) {
      // User clicked an earlier date, seamlessly restart range from here
      onDateChange(dateKey, dateKey);
      setIsPickingEnd(true);
      return;
    }

    if (dateKey === selectedStartDate) {
      // Clicking same date finishes single-day span
      onDateChange(selectedStartDate, selectedStartDate);
      setIsPickingEnd(false);
      return;
    }

    // Verify all dates in between are continuously available
    const conflict = checkRangeUnavailable(selectedStartDate, dateKey);
    if (conflict.hasConflict) {
      if (conflict.reason === "blocked") {
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
    onDateChange(selectedStartDate, dateKey);
    setIsPickingEnd(false);
    setHoveredDate(null);
  };

  // Helper to determine styling for a cell
  const getCellState = (dateKey: string, isBlocked: boolean, isBooked: boolean, isPast: boolean) => {
    if (isPast) return "past";
    if (isBlocked) return "blocked";
    if (isBooked) return "booked";

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
        "rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-4 space-y-4",
        className
      )}
    >
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>
            <span className="text-[10px] text-muted-foreground block font-medium">
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
            className="px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
            title="Jump to today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-foreground"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer text-foreground"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time sync / fetch status indicator */}
      {isLoadingAvailability && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary animate-pulse bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/20">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Synchronizing live product availability...</span>
        </div>
      )}

      {fetchError && (
        <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchAvailability}
            className="text-xs underline font-bold cursor-pointer hover:opacity-80"
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
                className="h-9 sm:h-10 rounded-xl bg-transparent"
              />
            );
          }

          const cellState = getCellState(
            cell.dateKey,
            cell.isBlocked,
            cell.isBooked,
            cell.isPast
          );

          // State-based Styling
          const isSingle = cellState === "selected-single";
          const isStart = cellState === "selected-start";
          const isEnd = cellState === "selected-end";
          const isInRange = cellState === "selected-in-range";
          const isHoverRange = cellState === "hover-in-range";
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
                  cell.isPast
                )
              }
              onMouseEnter={() => {
                if (isPickingEnd && !cell.isPast && !cell.isBlocked && !cell.isBooked) {
                  setHoveredDate(cell.dateKey);
                }
              }}
              title={
                isBlocked
                  ? `Blocked by Owner (${cell.dateKey})`
                  : isBooked
                  ? `Already Reserved (${cell.dateKey})`
                  : isPast
                  ? `Past Date (${cell.dateKey})`
                  : `Available: ${cell.dateKey}`
              }
              className={cn(
                "relative h-9 sm:h-10 flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all select-none",
                // Available Normal
                cellState === "available" &&
                  "bg-card hover:bg-primary/10 hover:border-primary/50 text-foreground border border-border/80 cursor-pointer",
                // Past Disabled
                isPast &&
                  "opacity-30 text-muted-foreground bg-muted/20 border border-transparent cursor-not-allowed",
                // Vendor Blocked (RED - High Contrast, Strict Requirement)
                isBlocked &&
                  "bg-rose-500/15 dark:bg-rose-950/40 border border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold line-through cursor-not-allowed shadow-inner",
                // Already Booked (Muted Gray / Crossed)
                isBooked &&
                  "bg-muted/70 text-muted-foreground/60 border border-border/50 line-through cursor-not-allowed opacity-80",
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
              <span>{cell.dayNumber}</span>

              {/* Status indicator pin/dot */}
              {isBlocked && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 absolute bottom-1"
                  aria-label="Blocked by owner"
                />
              )}
              {isBooked && !isBlocked && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 absolute bottom-1"
                  aria-label="Already booked"
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
              onDateChange("", "");
              setIsPickingEnd(false);
              setConflictMessage(null);
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground font-semibold underline cursor-pointer"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Compact Legend Explaining Date States */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-card border border-border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
          </div>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            Blocked (Owner)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-md bg-muted/80 border border-border/70 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
          </div>
          <span>Already Booked</span>
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
