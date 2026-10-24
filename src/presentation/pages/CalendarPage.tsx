import { useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  History,
  X,
} from "lucide-react";
import {
  addMonthsToLocalDateKey,
  buildCalendarDashboard,
} from "../../application/calendar/buildCalendarDashboard";
import type {
  CompletionRecord,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  Weekday,
} from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { ProgressRing } from "../components/ProgressRing";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

interface CalendarPageProps {
  readonly habits: readonly ManagedHabit[];
  readonly schedules: readonly HabitScheduleRecord[];
  readonly completions: readonly CompletionRecord[];
  readonly progress: readonly HabitProgressRecord[];
  readonly localDate: string;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
}

export function CalendarPage({
  habits,
  schedules,
  completions,
  progress,
  localDate,
  weekStartsOn,
}: CalendarPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(localDate);
  const dashboard = useMemo(
    () => buildCalendarDashboard(
      habits,
      schedules,
      completions,
      progress,
      selectedMonth,
      localDate,
      undefined,
      weekStartsOn,
    ),
    [habits, schedules, completions, progress, selectedMonth, localDate, weekStartsOn],
  );
  const weekdayLabels = weekStartsOn === "sun"
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const canMoveForward = dashboard.monthEnd < localDate.slice(0, 7) + "-01";

  return (
    <div className="app-content-page mobile-page-safe mx-auto max-w-[1440px] px-5 pb-7 sm:px-8 sm:py-9 xl:px-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="app-section-title">Calendar</h1>
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-2 lg:w-[28rem]">
          <Button variant="secondary" size="icon" onClick={() => setSelectedMonth(addMonthsToLocalDateKey(selectedMonth, -1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </Button>
          <Button className="w-full justify-center rounded-full" variant="secondary" onClick={() => setSelectedMonth(localDate)}>
            <CalendarCheck size={16} /> This month
          </Button>
          <Button
            variant="secondary"
            size="icon"
            disabled={!canMoveForward}
            onClick={() => setSelectedMonth(addMonthsToLocalDateKey(selectedMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-[1.35fr_repeat(3,1fr)]" aria-label="Monthly analytics">
        <Card className="col-span-2 flex items-center gap-5 rounded-[1.75rem] p-5 xl:col-span-1">
          <ProgressRing percentage={dashboard.completionPercentage} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Monthly analytics</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.04em]">{dashboard.completedCount} of {dashboard.expectedCount}</p>
            <p className="mt-1 text-xs text-ink-600">{dashboard.monthLabel}</p>
          </div>
        </Card>
        <Card className="rounded-[1.75rem] p-4 sm:p-5">
          <span className="grid size-9 place-items-center rounded-full bg-leaf-50 text-leaf-700"><History size={18} /></span>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:mt-4">{dashboard.totalCheckIns}</p>
          <p className="mt-1 text-xs text-ink-600">Total completions</p>
        </Card>
        <Card className="rounded-[1.75rem] p-4 sm:p-5">
          <span className="grid size-9 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"><X size={18} /></span>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:mt-4">{dashboard.missedCount}</p>
          <p className="mt-1 text-xs text-ink-600">Missed check-ins</p>
        </Card>
        <Card className="col-span-2 rounded-[1.75rem] p-4 sm:col-span-1 sm:p-5">
          <span className="grid size-9 place-items-center rounded-full bg-canvas text-ink-600"><CircleMinus size={18} /></span>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:mt-4">{dashboard.skippedCount}</p>
          <p className="mt-1 text-xs text-ink-600">Skipped check-ins</p>
        </Card>
      </section>

      <Card className="mt-5 overflow-hidden rounded-[1.75rem] p-3 shadow-none sm:mt-6 sm:p-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold tracking-[-0.025em]">{dashboard.monthLabel}</h2>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((label) => (
            <div key={label} className="pb-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{label}</div>
          ))}
          {dashboard.calendarDays.map((day) => (
            <div
              key={day.date}
              className={cn(
                "relative min-h-14 rounded-2xl border p-1.5 transition sm:min-h-[72px] sm:p-2",
                !day.isInMonth && "border-transparent opacity-25",
                day.isInMonth && "border-line bg-surface",
                day.isToday && "border-leaf-500 ring-2 ring-leaf-100",
                day.isFuture && "opacity-45",
              )}
              title={`${day.date}: ${day.completedCount} of ${day.expectedCount} completed`}
            >
              <span className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-bold",
                day.isToday ? "bg-ink-950 text-surface" : "text-ink-800",
              )}>{day.dayNumber}</span>
              {day.isInMonth && day.expectedCount > 0 && (
                <>
                  <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        day.completionPercentage === 100 ? "bg-leaf-500" : day.completionPercentage > 0 ? "bg-amber-500" : "bg-red-400",
                      )}
                      style={{ width: `${Math.max(8, day.completionPercentage)}%` }}
                    />
                  </div>
                  <span className="absolute bottom-4 right-1.5 text-[8px] font-semibold text-ink-400 sm:bottom-4.5 sm:right-2 sm:text-[9px]">{day.completedCount}/{day.expectedCount}</span>
                </>
              )}
              {day.isInMonth && day.expectedCount === 0 && day.hasCheckIn && (
                <span className="absolute bottom-2 right-2 size-1.5 rounded-full bg-blue-500" title="Flexible check-in" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-1 pt-4 text-[10px] font-medium text-ink-400">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-leaf-500" />Complete</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" />Partial day</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-400" />Missed</span>
          <span className="hidden items-center gap-1.5 sm:flex"><span className="size-2 rounded-full bg-blue-500" />Flexible</span>
        </div>
      </Card>
    </div>
  );
}
