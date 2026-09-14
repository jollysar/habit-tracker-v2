import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToLocalDateKey } from "../../application/dates/localDate";
import type { Weekday } from "../../domain/habits/models";
import { cn } from "../../lib/cn";

interface HomeDatePickerProps {
  readonly selectedDate: string;
  readonly maxDate: string;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
  readonly onSelect: (date: string) => void;
  readonly onClose: () => void;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

function moveMonth(value: string, amount: number): string {
  const date = new Date(`${monthStart(value)}T12:00:00`);
  const moved = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  return dateKey(moved.getFullYear(), moved.getMonth(), 1);
}

export function HomeDatePicker({
  selectedDate,
  maxDate,
  weekStartsOn,
  onSelect,
  onClose,
}: HomeDatePickerProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(selectedDate));
  const [focusedDate, setFocusedDate] = useState(selectedDate);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-home-date-trigger]")) return;
      if (!pickerRef.current?.contains(event.target as Node)) onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const trigger = document.querySelector<HTMLElement>("[data-home-date-trigger]");
    const focusFrame = window.requestAnimationFrame(() => {
      pickerRef.current
        ?.querySelector<HTMLButtonElement>(`[data-calendar-date='${selectedDate}']`)
        ?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };
  }, [selectedDate]);

  const monthDate = new Date(`${visibleMonth}T12:00:00`);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingDays = weekStartsOn === "mon"
    ? (monthDate.getDay() + 6) % 7
    : monthDate.getDay();
  const dayLabels = weekStartsOn === "mon"
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];
  const cells = useMemo(
    () => Array.from({ length: leadingDays + daysInMonth }, (_, index) => (
      index < leadingDays ? undefined : index - leadingDays + 1
    )),
    [daysInMonth, leadingDays],
  );
  const nextMonth = moveMonth(visibleMonth, 1);
  const focusDate = (value: string) => {
    if (value > maxDate) return;
    setFocusedDate(value);
    setVisibleMonth(monthStart(value));
    window.requestAnimationFrame(() => {
      pickerRef.current
        ?.querySelector<HTMLButtonElement>(`[data-calendar-date='${value}']`)
        ?.focus({ preventScroll: true });
    });
  };
  const showMonth = (amount: number) => {
    const targetMonth = moveMonth(visibleMonth, amount);
    if (targetMonth > monthStart(maxDate)) return;
    focusDate(targetMonth === monthStart(maxDate) ? maxDate : targetMonth);
  };

  return (
    <div
      ref={pickerRef}
      id="home-date-picker"
      className="pointer-events-auto fixed left-5 right-5 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-50 w-auto rounded-3xl border border-line bg-surface p-4 shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-72"
      role="dialog"
      aria-label="Choose a date"
    >
      <div className="flex items-center justify-between">
        <button className="grid size-8 place-items-center rounded-full text-ink-600 hover:bg-leaf-50" type="button" onClick={() => showMonth(-1)} aria-label="Previous month">
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <strong className="text-sm tracking-[-0.01em]">{monthLabel}</strong>
        <button className="grid size-8 place-items-center rounded-full text-ink-600 hover:bg-leaf-50 disabled:opacity-30" type="button" onClick={() => showMonth(1)} disabled={nextMonth > monthStart(maxDate)} aria-label="Next month">
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center" role="grid" aria-label={monthLabel}>
        {dayLabels.map((label, index) => (
          <span key={`${label}-${index}`} className="py-1 text-[10px] font-bold text-ink-400" role="columnheader">{label}</span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} role="gridcell" />;
          const value = dateKey(monthDate.getFullYear(), monthDate.getMonth(), day);
          const isSelected = value === selectedDate;
          const isToday = value === maxDate;
          return (
            <span key={value} role="gridcell">
            <button
              data-calendar-date={value}
              className={cn(
                "grid size-8 place-items-center justify-self-center rounded-full text-xs font-semibold transition",
                isSelected ? "bg-leaf-500 text-white" : "text-ink-800 hover:bg-leaf-50",
                isToday && !isSelected && "ring-1 ring-inset ring-leaf-500 text-leaf-700",
              )}
              type="button"
              disabled={value > maxDate}
              onClick={() => onSelect(value)}
              onFocus={() => setFocusedDate(value)}
              onKeyDown={(event) => {
                let nextDate: string | undefined;
                if (event.key === undefined) return;
                if (event.key === "ArrowLeft") nextDate = addDaysToLocalDateKey(value, -1);
                if (event.key === "ArrowRight") nextDate = addDaysToLocalDateKey(value, 1);
                if (event.key === "ArrowUp") nextDate = addDaysToLocalDateKey(value, -7);
                if (event.key === "ArrowDown") nextDate = addDaysToLocalDateKey(value, 7);
                if (event.key === "PageUp") nextDate = moveMonth(value, -1);
                if (event.key === "PageDown") nextDate = moveMonth(value, 1);
                if (!nextDate) return;
                event.preventDefault();
                focusDate(nextDate);
              }}
              tabIndex={value === focusedDate ? 0 : -1}
              aria-label={new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              aria-current={isToday ? "date" : undefined}
            >
              {day}
            </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
