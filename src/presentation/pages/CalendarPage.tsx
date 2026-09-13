import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  Filter,
  History,
  RotateCcw,
  X,
} from "lucide-react";
import {
  addMonthsToLocalDateKey,
  buildCalendarDashboard,
  type CalendarHabitCell,
} from "../../application/calendar/buildCalendarDashboard";
import type {
  CompletionRecord,
  CompletionStatus,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  Weekday,
} from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import {
  HistoryCorrectionDialog,
  type HistoryCorrection,
} from "../components/HistoryCorrectionDialog";
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
  readonly onCorrectHistory: (
    habit: ManagedHabit,
    date: string,
    status: CompletionStatus,
    value?: number,
  ) => void;
}

function HistoryCellIcon({ cell }: { readonly cell: CalendarHabitCell }) {
  if (cell.status === "completed") return <Check size={14} strokeWidth={2.8} />;
  if (cell.status === "missed") return <X size={14} strokeWidth={2.3} />;
  if (cell.status === "skipped") return <CircleMinus size={14} />;
  if (cell.isFlexible) return <span className="size-1.5 rounded-full bg-ink-400/45" />;
  return null;
}

export function CalendarPage({
  habits,
  schedules,
  completions,
  progress,
  localDate,
  weekStartsOn,
  onCorrectHistory,
}: CalendarPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(localDate);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [correction, setCorrection] = useState<HistoryCorrection>();
  const dashboard = useMemo(
    () => buildCalendarDashboard(
      habits,
      schedules,
      completions,
      progress,
      selectedMonth,
      localDate,
      selectedHabitId || undefined,
      weekStartsOn,
    ),
    [habits, schedules, completions, progress, selectedMonth, localDate, selectedHabitId, weekStartsOn],
  );
  const weekdayLabels = weekStartsOn === "sun"
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const canMoveForward = dashboard.monthEnd < localDate.slice(0, 7) + "-01";

  return (
    <div className="mobile-page-safe mx-auto max-w-[1540px] px-5 pb-7 sm:px-8 sm:py-9 xl:px-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Calendar</h1>
          <p className="mt-2 hidden text-sm text-ink-600 lg:block">See what happened, spot gaps, and correct past check-ins.</p>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
          <label className="relative col-span-4 sm:col-span-1">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={15} />
            <select
              className="h-11 w-full appearance-none rounded-xl border border-line bg-surface pl-9 pr-8 text-sm font-semibold text-ink-800 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100 sm:h-10 sm:max-w-56"
              value={selectedHabitId}
              onChange={(event) => setSelectedHabitId(event.currentTarget.value)}
              aria-label="Filter calendar by habit"
            >
              <option value="">All habits</option>
              {habits.map((habit) => (
                <option key={habit.id} value={habit.id}>{habit.name}{habit.isArchived ? " (archived)" : ""}</option>
              ))}
            </select>
          </label>
          <Button variant="secondary" size="icon" onClick={() => setSelectedMonth(addMonthsToLocalDateKey(selectedMonth, -1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </Button>
          <Button className="col-span-2 sm:col-span-1" variant="secondary" onClick={() => setSelectedMonth(localDate)}>
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

      <section className="mt-8 hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-[1.35fr_repeat(3,1fr)]" aria-label="Monthly summary">
        <Card className="flex items-center gap-5 p-5 sm:col-span-2 xl:col-span-1">
          <ProgressRing percentage={dashboard.completionPercentage} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{dashboard.monthLabel}</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.04em]">{dashboard.completedCount} of {dashboard.expectedCount}</p>
            <p className="mt-1 text-xs text-ink-600">scheduled check-ins complete</p>
          </div>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-leaf-50 text-leaf-700"><History size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{dashboard.totalCheckIns}</p>
          <p className="mt-1 text-xs text-ink-600">Total completions</p>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"><X size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{dashboard.missedCount}</p>
          <p className="mt-1 text-xs text-ink-600">Missed check-ins</p>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-canvas text-ink-600"><CircleMinus size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{dashboard.skippedCount}</p>
          <p className="mt-1 text-xs text-ink-600">Skipped check-ins</p>
        </Card>
      </section>

      <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 2xl:grid-cols-[440px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden p-3 shadow-none sm:p-5">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-lg font-bold tracking-[-0.025em]">{dashboard.monthLabel}</h2>
            <span className="text-xs text-ink-400">{selectedHabitId ? "Filtered" : "All habits"}</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <div key={label} className="pb-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{label}</div>
            ))}
            {dashboard.calendarDays.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "relative min-h-14 rounded-xl border p-1.5 transition sm:min-h-[72px] sm:p-2",
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

        <section className="space-y-3 lg:hidden" aria-labelledby="mobile-history-title">
          <h2 id="mobile-history-title" className="px-1 text-lg font-bold tracking-[-0.025em]">Habit history</h2>
          {dashboard.rows.length === 0 ? (
            <Card className="grid min-h-36 place-items-center px-6 text-center shadow-none">
              <div><RotateCcw className="mx-auto text-ink-400" size={24} /><p className="mt-3 text-sm font-semibold">No history this month</p></div>
            </Card>
          ) : dashboard.rows.map((row) => (
            <Card key={row.habit.id} className="p-4 shadow-none">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.habit.colour ?? "#3e9b68" }} />
                  <h3 className="truncate text-sm font-bold">{row.habit.name}</h3>
                </div>
                <span className="text-xs font-bold text-ink-600">{row.completionPercentage}%</span>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {row.cells.map((cell) => (
                  <div key={cell.date} className="min-w-0 text-center">
                    <span className="block text-[8px] font-semibold text-ink-400">{Number(cell.date.slice(-2))}</span>
                    {cell.status === "not_scheduled" && !cell.isFlexible ? (
                      <span className="mt-1 grid aspect-square w-full place-items-center rounded-lg bg-canvas text-line" aria-label={`${cell.date}: not scheduled`}>·</span>
                    ) : (
                      <button
                        className={cn(
                          "mt-1 grid aspect-square w-full place-items-center rounded-lg border transition",
                          cell.status === "completed" && "border-leaf-500 bg-leaf-500 text-white",
                          cell.status === "missed" && "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/30",
                          cell.status === "skipped" && "border-line bg-canvas text-ink-400",
                          cell.status === "incomplete" && "border-line bg-surface text-ink-400",
                          cell.status === "not_scheduled" && cell.isFlexible && "border-dashed border-line bg-transparent text-ink-400",
                          cell.isFuture && "opacity-30",
                        )}
                        type="button"
                        disabled={!cell.canCorrect}
                        onClick={() => setCorrection({
                          habit: row.habit,
                          date: cell.date,
                          status: cell.status === "not_scheduled" ? "incomplete" : cell.status,
                          value: cell.value,
                        })}
                        aria-label={`${row.habit.name}, ${cell.date}: ${cell.status}`}
                      >
                        <HistoryCellIcon cell={cell} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <Card className="hidden min-w-0 overflow-hidden lg:block">
          <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold tracking-[-0.02em]">Habit history</h2>
              <p className="mt-0.5 text-xs text-ink-400">Select a past scheduled cell to correct it.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] font-medium text-ink-400">
              <span className="flex items-center gap-1"><Check size={12} className="text-leaf-600" /> Done</span>
              <span className="flex items-center gap-1"><X size={12} className="text-red-500" /> Missed</span>
              <span className="flex items-center gap-1"><CircleMinus size={12} /> Skipped</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${300 + dashboard.monthDates.length * 38}px` }}>
              <div
                className="grid border-b border-line bg-leaf-50/40 px-3"
                style={{ gridTemplateColumns: `minmax(220px, 1fr) repeat(${dashboard.monthDates.length}, 38px) 76px` }}
              >
                <div className="flex items-end px-2 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Habit</div>
                {dashboard.monthDates.map((date) => (
                  <div key={date} className="py-3 text-center text-[10px] font-semibold text-ink-400">{Number(date.slice(-2))}</div>
                ))}
                <div className="flex items-end justify-end px-2 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Rate</div>
              </div>
              {dashboard.rows.length === 0 ? (
                <div className="grid min-h-44 place-items-center px-6 text-center">
                  <div>
                    <RotateCcw className="mx-auto text-ink-400" size={24} />
                    <p className="mt-3 text-sm font-semibold">No history for this month.</p>
                  </div>
                </div>
              ) : dashboard.rows.map((row) => (
                <div
                  key={row.habit.id}
                  className="grid items-center border-b border-line px-3 last:border-0"
                  style={{ gridTemplateColumns: `minmax(220px, 1fr) repeat(${dashboard.monthDates.length}, 38px) 76px` }}
                >
                  <div className="flex min-w-0 items-center gap-3 px-2 py-3">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.habit.colour ?? "#3e9b68" }} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{row.habit.name}</p>
                      <p className="mt-0.5 text-[9px] text-ink-400">{row.habit.isArchived ? "Archived" : row.habit.categoryName ?? "Uncategorised"}</p>
                    </div>
                  </div>
                  {row.cells.map((cell) => (
                    <div key={cell.date} className="grid place-items-center py-3">
                      {cell.status === "not_scheduled" && !cell.isFlexible ? (
                        <span className="size-1 rounded-full bg-line" />
                      ) : (
                        <button
                          className={cn(
                            "grid size-6 place-items-center rounded-md border transition",
                            cell.status === "completed" && "border-leaf-500 bg-leaf-500 text-white",
                            cell.status === "missed" && "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/30",
                            cell.status === "skipped" && "border-line bg-canvas text-ink-400",
                            cell.status === "incomplete" && "border-line bg-surface hover:border-leaf-500",
                            cell.status === "not_scheduled" && cell.isFlexible && "border-dashed border-line bg-transparent text-ink-400 hover:border-leaf-500",
                            cell.isFuture && "cursor-default opacity-30",
                          )}
                          type="button"
                          disabled={!cell.canCorrect}
                          onClick={() => setCorrection({
                            habit: row.habit,
                            date: cell.date,
                            status: cell.status === "not_scheduled" ? "incomplete" : cell.status,
                            value: cell.value,
                          })}
                          aria-label={`${row.habit.name}, ${cell.date}: ${cell.status}`}
                          title={`${cell.date}: ${cell.status}`}
                        >
                          <HistoryCellIcon cell={cell} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="px-2 py-3 text-right text-[10px] font-bold text-ink-600">{row.completionPercentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <HistoryCorrectionDialog
        correction={correction}
        onCancel={() => setCorrection(undefined)}
        onSave={(status, value) => {
          if (!correction) return;
          onCorrectHistory(correction.habit, correction.date, status, value);
          setCorrection(undefined);
        }}
      />
    </div>
  );
}
