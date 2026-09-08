import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleMinus,
  History,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { addDaysToLocalDateKey } from "../../application/dates/localDate";
import {
  buildWeekDashboard,
  scheduleForHabitDate,
} from "../../application/week/buildWeekDashboard";
import type { WeeklyProgressOverrides } from "../../application/week/weeklyProgress";
import type {
  CompletionRecord,
  CompletionStatus,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  WeekHabitCell,
  Weekday,
} from "../../domain/habits/models";
import {
  HistoryCorrectionDialog,
  type HistoryCorrection,
} from "../components/HistoryCorrectionDialog";
import { ProgressRing } from "../components/ProgressRing";
import { AnimatedPlant } from "../components/AnimatedPlant";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { cn } from "../../lib/cn";

interface WeekPageProps {
  readonly habits: readonly ManagedHabit[];
  readonly schedules: readonly HabitScheduleRecord[];
  readonly completions: readonly CompletionRecord[];
  readonly progress: readonly HabitProgressRecord[];
  readonly localDate: string;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
  readonly weeklyProgress: WeeklyProgressOverrides;
  readonly habitView: WeekHabitView;
  readonly onHabitViewChange: (view: WeekHabitView) => void;
  readonly onCorrectHistory: (
    habit: ManagedHabit,
    date: string,
    status: CompletionStatus,
    value?: number,
  ) => void;
}

export type WeekHabitView = "daily" | "weekly";

function CellIcon({ cell }: { readonly cell: WeekHabitCell }) {
  if (cell.status === "completed") return <Check size={17} strokeWidth={2.7} />;
  if (cell.status === "missed") return <X size={16} strokeWidth={2.2} />;
  if (cell.status === "skipped") return <CircleMinus size={16} />;
  return null;
}

export function WeekPage({
  habits,
  schedules,
  completions,
  progress,
  localDate,
  weekStartsOn,
  weeklyProgress,
  habitView,
  onHabitViewChange,
  onCorrectHistory,
}: WeekPageProps) {
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [correction, setCorrection] = useState<HistoryCorrection>();
  const visibleHabits = useMemo(() => habits.filter((habit) => {
    if (habit.isArchived) return false;
    const schedule = scheduleForHabitDate(habit, schedules, selectedDate) ?? habit.schedule;
    const isWeekly = schedule.type === "weekly_frequency" ||
      schedule.type === "weekly_target";
    return habitView === "weekly" ? isWeekly : !isWeekly;
  }), [habitView, habits, schedules, selectedDate]);
  const dashboard = useMemo(
    () => buildWeekDashboard(
      visibleHabits,
      schedules,
      completions,
      progress,
      selectedDate,
      localDate,
      weekStartsOn,
      weeklyProgress,
    ),
    [visibleHabits, schedules, completions, progress, selectedDate, localDate, weekStartsOn, weeklyProgress],
  );
  const totalCompletions = dashboard.habits.reduce(
    (sum, row) => sum + row.statistics.totalCompletions,
    0,
  );
  const strongestCurrentStreak = dashboard.habits.reduce(
    (best, row) => Math.max(best, row.statistics.currentStreak),
    0,
  );
  const bestStreak = dashboard.habits.reduce(
    (best, row) => Math.max(best, row.statistics.bestStreak),
    0,
  );
  const canMoveForward = dashboard.endDate < localDate;

  return (
    <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 sm:py-9 xl:px-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-400">{dashboard.dateLabel}</p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Your week</h1>
          <p className="mt-2 text-sm text-ink-600">Review progress and select any past cell to correct it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setSelectedDate(addDaysToLocalDateKey(selectedDate, -7))} aria-label="Previous week">
            <ChevronLeft size={18} />
          </Button>
          <Button variant="secondary" onClick={() => setSelectedDate(localDate)}>
            <CalendarDays size={16} /> This week
          </Button>
          <Button
            variant="secondary"
            size="icon"
            disabled={!canMoveForward}
            onClick={() => setSelectedDate(addDaysToLocalDateKey(selectedDate, 7))}
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </header>

      <div
        className="mt-7 inline-flex w-full rounded-xl border border-line bg-canvas p-1 sm:w-auto"
        role="tablist"
        aria-label="Week habit type"
      >
        {(["daily", "weekly"] as const).map((view) => (
          <button
            key={view}
            className={cn(
              "flex-1 rounded-lg px-5 py-2 text-sm font-semibold transition sm:flex-none",
              habitView === view
                ? "bg-surface text-ink-950 shadow-sm"
                : "text-ink-600 hover:text-ink-950",
            )}
            type="button"
            role="tab"
            aria-selected={habitView === view}
            onClick={() => onHabitViewChange(view)}
          >
            {view === "daily" ? "Daily habits" : "Weekly habits"}
          </button>
        ))}
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_repeat(3,1fr)]" aria-label={`${habitView === "daily" ? "Daily" : "Weekly"} habit summary`}>
        <Card className="flex items-center gap-5 p-5 sm:col-span-2 xl:col-span-1">
          <ProgressRing percentage={dashboard.completionPercentage} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
              {habitView === "daily" ? "Daily habits" : "Weekly habits"}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.04em]">{dashboard.completedCount} of {dashboard.scheduledCount}</p>
            <p className="mt-1 text-xs text-ink-600">habits at target</p>
          </div>
        </Card>
        <Card className="p-5">
          <span className="grid size-10 place-items-center"><AnimatedPlant plantType="oak" streak={strongestCurrentStreak} size={34} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{strongestCurrentStreak}</p>
          <p className="mt-1 text-xs text-ink-600">Longest current streak</p>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"><Trophy size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{bestStreak}</p>
          <p className="mt-1 text-xs text-ink-600">All-time best streak</p>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"><History size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{totalCompletions}</p>
          <p className="mt-1 text-xs text-ink-600">Total completions</p>
        </Card>
      </section>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[minmax(220px,1fr)_repeat(7,68px)_150px] border-b border-line bg-leaf-50/45 px-4">
              <div aria-hidden="true" />
              {dashboard.days.map((day) => (
                <div key={day.date} className={cn("py-3 text-center", day.isToday && "text-leaf-700")}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{day.dayLabel}</p>
                  <span className={cn(
                    "mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-bold",
                    day.isToday ? "bg-ink-950 text-surface" : "text-ink-800",
                  )}>{day.dateLabel}</span>
                </div>
              ))}
              <div aria-hidden="true" />
            </div>

            {dashboard.habits.length === 0 ? (
              <div className="grid min-h-56 place-items-center px-6 text-center">
                <div>
                  <Target className="mx-auto text-ink-400" size={28} />
                  <p className="mt-3 font-semibold">No {habitView} habits were scheduled this week.</p>
                  <p className="mt-1 text-sm text-ink-400">
                    Try another week or create a {habitView} habit.
                  </p>
                </div>
              </div>
            ) : dashboard.habits.map((row) => {
              const percentage = row.target === 0 ? 0 : Math.min(100, Math.round((row.completed / row.target) * 100));
              return (
                <div key={row.habit.id} className="grid grid-cols-[minmax(220px,1fr)_repeat(7,68px)_150px] items-center border-b border-line px-4 last:border-b-0">
                  <div className="min-w-0 px-2 py-4">
                    <div className="flex items-center gap-3">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.habit.colour ?? "#777872" }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.habit.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-400">
                          {row.statistics.currentStreak} current · {row.statistics.bestStreak} best
                        </p>
                      </div>
                    </div>
                  </div>
                  {row.cells.map((cell) => (
                    <div key={cell.date} className="grid place-items-center py-4">
                      {cell.status === "not_scheduled" ? (
                        <span className="h-px w-4 bg-line" aria-label="Not scheduled" />
                      ) : (
                        <button
                          className={cn(
                            "grid size-9 place-items-center rounded-xl border text-ink-400 transition",
                            cell.status === "completed" && "border-leaf-500 bg-leaf-500 text-white",
                            cell.status === "missed" && "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/30",
                            cell.status === "skipped" && "border-line bg-canvas text-ink-400",
                            cell.status === "incomplete" && "border-line bg-surface hover:border-leaf-500 hover:bg-leaf-50",
                            cell.isFuture && "cursor-default opacity-35",
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
                          <CellIcon cell={cell} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="px-2 py-4 text-right">
                    <p className="text-xs font-bold text-ink-800">{row.completed} / {row.target} {row.unit}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-leaf-500" style={{ width: `${percentage}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10px] font-medium text-ink-400">{row.statistics.completionPercentage}% all time</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

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
