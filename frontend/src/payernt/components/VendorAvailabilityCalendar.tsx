import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarOff,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  AlertCircle,
  Lock,
  Sparkles,
  Info,
  CalendarDays,
  X,
} from "lucide-react";
import { toast } from "sonner";

export interface VendorAvailabilityCalendarProps {
  productId?: string | number;
  initialBlockedDates?: string[];
  bookedDates?: string[];
  onDatesChange?: (blockedDates: string[]) => void;
  // If in standalone product edit mode (e.g. LenderProductDetails)
  standalone?: boolean;
  onSave?: (blockedDates: string[]) => Promise<boolean | void>;
  onCancel?: () => void;
  isSaving?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
}

// Format Date object to YYYY-MM-DD safely
export function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseDateKey(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

export const VendorAvailabilityCalendar: React.FC<VendorAvailabilityCalendarProps> = ({
  productId,
  initialBlockedDates = [],
  bookedDates = [],
  onDatesChange,
  standalone = false,
  onSave,
  onCancel,
  isSaving = false,
  className = "",
  title = "Manage Availability",
  subtitle = "Block specific dates or continuous date ranges when your equipment is unavailable due to personal use, servicing, or maintenance. Renters cannot book blocked dates.",
}) => {
  // Normalize saved blocked dates (YYYY-MM-DD, sorted, unique)
  const savedDatesSet = useMemo(() => {
    const s = new Set<string>();
    initialBlockedDates.forEach((d) => {
      if (d && typeof d === "string") s.add(d.trim());
    });
    return s;
  }, [initialBlockedDates]);

  // Current blocked dates state (draft before save, or live in wizard)
  const [currentBlockedDates, setCurrentBlockedDates] = useState<string[]>(() =>
    Array.from(savedDatesSet).sort()
  );

  // Sync state if initialBlockedDates changes externally
  React.useEffect(() => {
    setCurrentBlockedDates(Array.from(savedDatesSet).sort());
  }, [savedDatesSet]);

  // Booked dates set (from active renter reservations)
  const bookedDatesSet = useMemo(() => {
    const s = new Set<string>();
    bookedDates.forEach((d) => {
      if (d && typeof d === "string") s.add(d.trim());
    });
    return s;
  }, [bookedDates]);

  // Calendar Viewport Navigation (Year & Month)
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => {
    return formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }, [today]);

  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth() + 1); // 1-12

  // Selection Mode: "single" or "range"
  const [selectionMode, setSelectionMode] = useState<"single" | "range">("single");
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Quick custom input
  const [manualDateInput, setManualDateInput] = useState("");

  // Track if there are unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    if (!standalone) return false;
    const currentSet = new Set(currentBlockedDates);
    if (currentSet.size !== savedDatesSet.size) return true;
    for (const d of currentSet) {
      if (!savedDatesSet.has(d)) return true;
    }
    return false;
  }, [standalone, currentBlockedDates, savedDatesSet]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewYear === today.getFullYear() && viewMonth <= today.getMonth() + 1) {
      // Don't navigate to past months
      return;
    }
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  };

  const isCurrentOrPastMonth = useMemo(() => {
    return viewYear === today.getFullYear() && viewMonth <= today.getMonth() + 1;
  }, [viewYear, viewMonth, today]);

  // Generate days in the active month grid
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    // 0 = Sunday, 1 = Monday, etc.
    return new Date(viewYear, viewMonth - 1, 1).getDay();
  }, [viewYear, viewMonth]);

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth - 1, 1).toLocaleString("default", { month: "long" });
  }, [viewYear, viewMonth]);

  // Notify parent component of changes
  const updateBlockedList = (newList: string[]) => {
    const sorted = Array.from(new Set(newList)).sort();
    setCurrentBlockedDates(sorted);
    if (onDatesChange) {
      onDatesChange(sorted);
    }
  };

  // Toggle single date
  const handleDateClick = (dateKey: string) => {
    // Don't allow past dates
    if (dateKey < todayKey) {
      toast.info("Past dates cannot be blocked.");
      return;
    }

    // Don't allow blocking dates already booked by renters
    if (bookedDatesSet.has(dateKey)) {
      toast.error(`Date ${dateKey} is already booked by a renter and cannot be blocked.`);
      return;
    }

    if (selectionMode === "single") {
      if (currentBlockedDates.includes(dateKey)) {
        // Unblock
        const updated = currentBlockedDates.filter((d) => d !== dateKey);
        updateBlockedList(updated);
        toast.info(`Unblocked ${dateKey}`);
      } else {
        // Block
        const updated = [...currentBlockedDates, dateKey];
        updateBlockedList(updated);
        toast.success(`Blocked ${dateKey}`);
      }
    } else {
      // Range mode
      if (!rangeStart) {
        setRangeStart(dateKey);
        toast.info(`Range start set to ${dateKey}. Click an end date.`);
      } else {
        const [start, end] = [rangeStart, dateKey].sort();
        // Generate all dates in [start, end]
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        const datesToBlock: string[] = [];
        let curr = new Date(startDateObj);
        let conflictFound = false;

        while (curr <= endDateObj) {
          const y = curr.getFullYear();
          const m = curr.getMonth() + 1;
          const d = curr.getDate();
          const k = formatDateKey(y, m, d);

          if (bookedDatesSet.has(k)) {
            conflictFound = true;
          } else {
            datesToBlock.push(k);
          }
          curr.setDate(curr.getDate() + 1);
        }

        if (conflictFound) {
          toast.warning("Some dates in this range are already booked by renters and were skipped.");
        }

        const combined = Array.from(new Set([...currentBlockedDates, ...datesToBlock])).sort();
        updateBlockedList(combined);
        setRangeStart(null);
        setHoverDate(null);
        toast.success(`Blocked ${datesToBlock.length} dates from ${start} to ${end}.`);
      }
    }
  };

  // Remove single date
  const handleRemoveDate = (dateKey: string) => {
    const updated = currentBlockedDates.filter((d) => d !== dateKey);
    updateBlockedList(updated);
    toast.info(`Removed ${dateKey} from blocked dates.`);
  };

  // Quick manual date add
  const handleAddManualDate = () => {
    if (!manualDateInput) return;
    if (manualDateInput < todayKey) {
      toast.error("Cannot block dates in the past.");
      return;
    }
    if (bookedDatesSet.has(manualDateInput)) {
      toast.error("This date is already booked by a renter.");
      return;
    }
    if (currentBlockedDates.includes(manualDateInput)) {
      toast.info("Date is already blocked.");
      return;
    }
    const updated = [...currentBlockedDates, manualDateInput].sort();
    updateBlockedList(updated);
    setManualDateInput("");
    toast.success(`Added ${manualDateInput} to blocked list.`);
  };

  // Block upcoming weekend helper
  const handleBlockUpcomingWeekend = () => {
    const nextSaturday = new Date();
    const daysUntilSaturday = (6 - nextSaturday.getDay() + 7) % 7 || 7;
    nextSaturday.setDate(nextSaturday.getDate() + daysUntilSaturday);

    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSunday.getDate() + 1);

    const satKey = formatDateKey(
      nextSaturday.getFullYear(),
      nextSaturday.getMonth() + 1,
      nextSaturday.getDate()
    );
    const sunKey = formatDateKey(
      nextSunday.getFullYear(),
      nextSunday.getMonth() + 1,
      nextSunday.getDate()
    );

    const toAdd = [satKey, sunKey].filter((k) => !bookedDatesSet.has(k));
    if (toAdd.length === 0) {
      toast.error("Upcoming weekend is already booked by renters.");
      return;
    }
    const combined = Array.from(new Set([...currentBlockedDates, ...toAdd])).sort();
    updateBlockedList(combined);
    toast.success(`Blocked upcoming weekend (${satKey} – ${sunKey}).`);
  };

  // Reset to saved state
  const handleReset = () => {
    const original = Array.from(savedDatesSet).sort();
    setCurrentBlockedDates(original);
    setRangeStart(null);
    setHoverDate(null);
    if (onDatesChange) onDatesChange(original);
    toast.info("Reset to saved availability settings.");
  };

  // Save changes (standalone mode)
  const handleSaveClick = async () => {
    if (!onSave) return;
    try {
      await onSave(currentBlockedDates);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save availability changes.");
    }
  };

  // Helper to determine if a date is inside the currently previewed range
  const isDateInPreviewRange = (dateKey: string) => {
    if (!rangeStart || !hoverDate) return false;
    const [start, end] = [rangeStart, hoverDate].sort();
    return dateKey >= start && dateKey <= end;
  };

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-6 shadow-sm ${className}`}
    >
      {/* 1. Header & Explanation */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <CalendarOff className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {currentBlockedDates.length} Blocked
            </span>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-xl">{subtitle}</p>}
        </div>

        {/* Selection Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              setSelectionMode("single");
              setRangeStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectionMode === "single"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Dates
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectionMode("range");
              setRangeStart(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectionMode === "range"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Date Range
          </button>
        </div>
      </div>

      {/* 2. Calendar Month Viewport Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h4 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
            {monthName} {viewYear}
          </h4>
          <button
            type="button"
            onClick={handleJumpToToday}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            Jump to Today
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isCurrentOrPastMonth}
            aria-label="Previous Month"
            className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-foreground transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Range Selection In-Progress Banner */}
      {selectionMode === "range" && rangeStart && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between text-xs font-medium text-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>
              Range Start: <strong className="font-mono">{rangeStart}</strong>. Click an end date to
              block the full period.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRangeStart(null)}
            className="text-[11px] text-muted-foreground hover:text-destructive font-bold underline cursor-pointer"
          >
            Cancel Range
          </button>
        </div>
      )}

      {/* 3. Modern Monthly Calendar Grid */}
      <div className="space-y-1">
        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square rounded-xl bg-transparent" />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateKey = formatDateKey(viewYear, viewMonth, dayNum);
            const isPast = dateKey < todayKey;
            const isToday = dateKey === todayKey;
            const isBooked = bookedDatesSet.has(dateKey);
            const isBlocked = currentBlockedDates.includes(dateKey);
            const isSaved = savedDatesSet.has(dateKey);
            const isUnsavedBlock = isBlocked && !isSaved;
            const isUnsavedUnblock = !isBlocked && isSaved;
            const isRangeSelected = rangeStart === dateKey;
            const isInPreview = isDateInPreviewRange(dateKey);

            return (
              <button
                key={dateKey}
                type="button"
                disabled={isPast || isBooked}
                onClick={() => handleDateClick(dateKey)}
                onMouseEnter={() => {
                  if (rangeStart) setHoverDate(dateKey);
                }}
                className={`relative aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer select-none group ${
                  isPast
                    ? "opacity-25 bg-muted/20 text-muted-foreground cursor-not-allowed border border-transparent"
                    : isBooked
                    ? "bg-muted/80 text-muted-foreground/60 line-through cursor-not-allowed border border-border/40"
                    : isRangeSelected
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary scale-105 z-10"
                    : isBlocked
                    ? isUnsavedBlock
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-2 border-dashed border-amber-500 shadow-xs"
                      : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/25"
                    : isInPreview
                    ? "bg-primary/20 text-primary border border-primary/40 ring-1 ring-primary/30"
                    : isUnsavedUnblock
                    ? "bg-secondary/40 text-muted-foreground border-2 border-dashed border-destructive/40"
                    : "bg-background hover:bg-secondary/70 text-foreground border border-border/80 hover:border-primary/40 hover:shadow-xs active:scale-95"
                }`}
                title={
                  isBooked
                    ? "Booked by a renter"
                    : isBlocked
                    ? isUnsavedBlock
                      ? "Unsaved blocked date"
                      : "Blocked for personal use / maintenance"
                    : isPast
                    ? "Past date"
                    : "Available — click to block"
                }
              >
                {/* Date Number */}
                <span className="relative z-10 leading-none">{dayNum}</span>

                {/* Sub-icons & Badges */}
                <div className="absolute bottom-1 flex items-center justify-center">
                  {isBlocked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
                  )}
                  {isBooked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  )}
                  {isToday && !isBlocked && !isBooked && (
                    <span className="w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>

                {/* Today Indicator Ring */}
                {isToday && !isRangeSelected && (
                  <span className="absolute inset-0 rounded-xl border border-primary pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Compact Calendar Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 text-[11px] font-medium text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-background border border-border" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-red-500/20 border border-red-500/40 text-red-600 font-bold flex items-center justify-center text-[9px]">
              •
            </span>
            <span className="text-foreground font-semibold">Blocked for Personal Use</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-muted/80 border border-border/40 line-through" />
            <span>Renter Reservation</span>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              <span className="w-3 h-3 rounded-md border-2 border-dashed border-amber-500 bg-amber-500/20" />
              <span>Unsaved Modification</span>
            </div>
          )}
        </div>

        {/* Quick Weekend Block Shortcut */}
        <button
          type="button"
          onClick={handleBlockUpcomingWeekend}
          className="text-xs font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Block Upcoming Weekend
        </button>
      </div>

      {/* 5. Blocked Dates Pills & Summary List */}
      <div className="space-y-2 pt-2 border-t border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            Currently Blocked Dates ({currentBlockedDates.length})
          </span>
          {currentBlockedDates.length > 0 && (
            <button
              type="button"
              onClick={() => updateBlockedList([])}
              className="text-[11px] text-destructive hover:underline font-bold cursor-pointer"
            >
              Clear All Blocked Dates
            </button>
          )}
        </div>

        {currentBlockedDates.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/20 text-center">
            <CalendarDays className="w-6 h-6 text-muted-foreground/60 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-foreground">No dates blocked</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Your equipment is currently open for booking on all scheduled available days.
            </p>
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-xl border border-border bg-background">
            {currentBlockedDates.map((dateKey) => {
              const isUnsaved = !savedDatesSet.has(dateKey);
              return (
                <span
                  key={dateKey}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    isUnsaved
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/20"
                      : "bg-destructive/10 border border-destructive/20 text-destructive"
                  }`}
                >
                  <CalendarOff className="w-3 h-3 opacity-80" />
                  <span>{dateKey}</span>
                  {isUnsaved && (
                    <span className="text-[9px] uppercase tracking-wider font-sans px-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      New
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveDate(dateKey)}
                    className="ml-0.5 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full cursor-pointer transition-colors"
                    title={`Unblock ${dateKey}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Standalone Save & Revert Action Controls */}
      {standalone && (
        <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                Unsaved availability changes pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Check className="w-4 h-4 text-emerald-500" />
                Availability synced with database
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-border bg-background hover:bg-secondary text-foreground transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              type="button"
              disabled={isSaving || !hasUnsavedChanges}
              onClick={handleSaveClick}
              className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Availability</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAvailabilityCalendar;
