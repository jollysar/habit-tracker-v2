import { useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Pencil,
  Plus,
} from "lucide-react";
import type { TodayDashboard } from "../../application/today/buildTodayDashboard";
import type { TodayStreakPreview } from "../../application/today/buildTodayHighlights";
import type { TodayHabit, Weekday, WeeklyGoal } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { HabitRow } from "../components/HabitRow";
import { HomeDatePicker } from "../components/HomeDatePicker";
import { ProgressRing } from "../components/ProgressRing";
import { AnimatedPlant, plantStageForStreak, plantStageLabel } from "../components/AnimatedPlant";
import { WeeklyHabitRow } from "../components/WeeklyHabitRow";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { handleRovingTabKey } from "../hooks/rovingTabs";

type HomeView = "daily" | "weekly";
const homeViews: readonly HomeView[] = ["daily", "weekly"];

interface TodayPageProps {
  readonly dashboard: TodayDashboard;
  readonly weekDateLabel: string;
  readonly weeklyHabits: readonly TodayHabit[];
  readonly weeklyGoals: readonly WeeklyGoal[];
  readonly weeklyCompletionPercentage: number;
  readonly completedWeeklyGoals: number;
  readonly streaks: readonly TodayStreakPreview[];
  readonly selectedDate: string;
  readonly localDate: string;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
  readonly onSelectDate: (date: string) => void;
  readonly onReturnToToday: () => void;
  readonly onAddHabit: () => void;
  readonly onEditHabit: (habitId: string) => void;
  readonly onToggleHabit: (habitId: string) => void;
  readonly onSkipHabit: (habitId: string) => void;
  readonly onResetHabit: (habitId: string) => void;
  readonly onDeleteHabit: (habitId: string) => void;
  readonly onLogProgress: (habitId: string) => void;
  readonly onSaveWeeklyValue: (habitId: string, value: number) => void;
  readonly onViewWeek: (view: HomeView) => void;
}

export function TodayPage({
  dashboard,
  weekDateLabel,
  weeklyHabits,
  weeklyGoals,
  weeklyCompletionPercentage,
  completedWeeklyGoals,
  streaks,
  selectedDate,
  localDate,
  weekStartsOn,
  onSelectDate,
  onReturnToToday,
  onAddHabit,
  onEditHabit,
  onToggleHabit,
  onSkipHabit,
  onResetHabit,
  onDeleteHabit,
  onLogProgress,
  onSaveWeeklyValue,
  onViewWeek,
}: TodayPageProps) {
  const [activeView, setActiveView] = useState<HomeView>("daily");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [groupByTime, setGroupByTime] = useState(() =>
    localStorage.getItem("habit-tracker-group-by-time") !== "false",
  );

  const isDailyView = activeView === "daily";
  const isToday = selectedDate === localDate;
  const visibleStreaks = [...streaks]
    .filter((streak) => streak.cadence === activeView)
    .sort((a, b) =>
      b.currentStreak - a.currentStreak || a.name.localeCompare(b.name),
    );
  const allHabits = dashboard.sections.flatMap((section) => section.habits);
  const remainingWeeklyGoals = Math.max(0, weeklyGoals.length - completedWeeklyGoals);

  const updateGrouping = (grouped: boolean) => {
    setGroupByTime(grouped);
    localStorage.setItem("habit-tracker-group-by-time", String(grouped));
  };

  const renderHabit = (habit: TodayHabit) => (
    <HabitRow
      key={habit.id}
      habit={habit}
      isEditing={isEditing}
      onToggle={() => onToggleHabit(habit.id)}
      onEdit={() => onEditHabit(habit.id)}
      onSkip={() => onSkipHabit(habit.id)}
      onReset={() => onResetHabit(habit.id)}
      onDelete={() => onDeleteHabit(habit.id)}
      onLogProgress={() => onLogProgress(habit.id)}
    />
  );

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 xl:px-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="-ml-1.5 flex items-center">
            <div className="relative min-w-0">
              <h1 className="text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
              <button
                className="rounded-lg px-1.5 py-1 text-left transition hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-leaf-500"
                type="button"
                onClick={() => setDatePickerOpen((open) => !open)}
                title="Choose a date"
                aria-expanded={datePickerOpen}
                aria-haspopup="dialog"
                aria-controls={datePickerOpen ? "home-date-picker" : undefined}
                data-home-date-trigger
              >
                {isDailyView ? dashboard.dateLabel : weekDateLabel}
              </button>
              </h1>
              {datePickerOpen && (
                <HomeDatePicker
                  selectedDate={selectedDate}
                  maxDate={localDate}
                  weekStartsOn={weekStartsOn}
                  onSelect={(date) => {
                    onSelectDate(date);
                    setDatePickerOpen(false);
                  }}
                  onClose={() => setDatePickerOpen(false)}
                />
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-ink-600">
              {isDailyView
                ? dashboard.remainingCount === 0
                  ? "Everything is complete. Nicely done."
                  : `${dashboard.remainingCount} habits left — keep the day moving.`
                : remainingWeeklyGoals === 0
                  ? "Every weekly goal is at target. Nicely done."
                  : `${remainingWeeklyGoals} weekly ${remainingWeeklyGoals === 1 ? "goal" : "goals"} still in progress.`}
            </p>
            {!isToday && (
              <button
                className="text-xs font-bold text-leaf-700 underline decoration-leaf-300 underline-offset-4"
                type="button"
                onClick={onReturnToToday}
              >
                {isDailyView ? "Return to today" : "Return to this week"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:pt-1">
          <Button className="h-[60px] rounded-xl px-6 text-base" onClick={onAddHabit} aria-keyshortcuts="Meta+N Control+N">
            <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
            Add habit
            <kbd className="ml-1 rounded-md bg-white/15 px-1.5 py-0.5 font-sans text-[10px]">⌘N</kbd>
          </Button>
        </div>
      </header>

      <div className="mt-7 inline-flex w-full rounded-xl border border-line bg-canvas p-1 sm:w-auto" role="tablist" aria-label="Home habit view">
        {([['daily', 'Today’s habits'], ['weekly', 'Weekly habits']] as const).map(([view, label]) => (
          <button
            key={view}
            className={cn(
              "flex-1 rounded-lg px-5 py-2 text-sm font-semibold transition sm:flex-none",
              activeView === view
                ? "bg-surface text-ink-950 shadow-sm"
                : "text-ink-600 hover:text-ink-950",
            )}
            type="button"
            role="tab"
            aria-selected={activeView === view}
            tabIndex={activeView === view ? 0 : -1}
            onKeyDown={(event) => handleRovingTabKey(
              event,
              homeViews,
              activeView,
              (nextView) => {
                setActiveView(nextView);
                setIsEditing(false);
                setDatePickerOpen(false);
              },
            )}
            onClick={() => {
              setActiveView(view);
              setIsEditing(false);
              setDatePickerOpen(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <ProgressRing percentage={isDailyView ? dashboard.completionPercentage : weeklyCompletionPercentage} compact />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                  {isDailyView ? "Daily progress" : "Weekly progress"}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <strong className="text-2xl font-bold tracking-[-0.04em]">
                    {isDailyView ? dashboard.completedCount : completedWeeklyGoals}
                  </strong>
                  <span className="text-xs text-ink-600">
                    of {isDailyView ? dashboard.scheduledCount : weeklyGoals.length} {isDailyView ? "complete" : "at target"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {isDailyView ? (
            <section aria-label="Today’s habits" role="tabpanel">
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2 px-1">
                <button
                  className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-medium text-ink-600 transition hover:bg-leaf-50"
                  type="button"
                  role="switch"
                  aria-checked={groupByTime}
                  onClick={() => updateGrouping(!groupByTime)}
                >
                  <span className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${groupByTime ? "justify-end bg-leaf-500" : "justify-start bg-line"}`} aria-hidden="true">
                    <span className="size-4 shrink-0 rounded-full bg-white shadow-sm" />
                  </span>
                  Group by time
                </button>
                <Button
                  variant={isEditing ? "secondary" : "ghost"}
                  className="h-8 px-2 text-xs"
                  onClick={() => setIsEditing((current) => !current)}
                  aria-pressed={isEditing}
                >
                  {isEditing ? <Check size={14} aria-hidden="true" /> : <Pencil size={13} aria-hidden="true" />}
                  {isEditing ? "Done editing" : "Edit day"}
                  {!isEditing && <ChevronRight size={14} aria-hidden="true" />}
                </Button>
              </div>
              {isEditing && (
                <div className="mb-3 flex items-center justify-between rounded-xl border border-leaf-100 bg-leaf-50 px-4 py-3 text-xs text-ink-600">
                  <span>Use Skip for habits that don’t apply on this day.</span>
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onAddHabit}>Add another</Button>
                </div>
              )}
              <div className="space-y-4">
                {groupByTime ? dashboard.sections.map((section) => (
                  <Card key={section.id} className="overflow-visible shadow-none">
                    <div className="rounded-t-[9px] bg-leaf-50/55 px-5 py-2.5">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-600">{section.label}</h2>
                    </div>
                    {section.habits.map(renderHabit)}
                  </Card>
                )) : (
                  <Card className="overflow-visible shadow-none">
                    {allHabits.map(renderHabit)}
                  </Card>
                )}
              </div>
            </section>
          ) : (
            <section aria-label="Weekly habits" role="tabpanel">
              <Card className="overflow-visible shadow-none">
                {weeklyHabits.length === 0 ? (
                  <div className="px-5 py-7 text-center">
                    <p className="text-sm font-semibold">No weekly habits yet</p>
                    <p className="mt-1 text-xs text-ink-400">Add a weekly habit to start tracking one.</p>
                  </div>
                ) : weeklyHabits.map((habit) => {
                  const goal = weeklyGoals.find((candidate) => candidate.id === habit.id);
                  return goal ? (
                    <WeeklyHabitRow
                      key={habit.id}
                      habit={habit}
                      goal={goal}
                      onSaveValue={(value) => onSaveWeeklyValue(habit.id, value)}
                      onEdit={() => onEditHabit(habit.id)}
                      onDelete={() => onDeleteHabit(habit.id)}
                    />
                  ) : null;
                })}
              </Card>
            </section>
          )}
        </div>

        <aside className="space-y-6" aria-label={isDailyView ? "Daily summary" : "Weekly summary"}>
          <Card className="overflow-hidden">
            <button
              className="flex w-full items-center justify-between border-b border-line px-5 py-4 text-left transition hover:bg-leaf-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-leaf-500"
              type="button"
              onClick={() => onViewWeek(activeView)}
              aria-label={`Open ${isDailyView ? "daily" : "weekly"} streak history`}
            >
              <span className="block text-xl font-bold tracking-[-0.03em]">
                {isDailyView ? "Daily streaks" : "Weekly streaks"}
              </span>
              <ArrowUpRight size={18} className="text-ink-400" aria-hidden="true" />
            </button>

            {visibleStreaks.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm font-semibold">Your record starts here</p>
                <p className="mt-1 text-xs leading-5 text-ink-400">Complete a habit to begin a {isDailyView ? "daily" : "weekly"} streak.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visibleStreaks.map((streak, index) => (
                  <div key={streak.id} className="streak-row flex items-center gap-2 px-3 py-4" style={{ "--streak-delay": `${index * 28}ms` } as CSSProperties}>
                    <span
                      className="-ml-1.5 grid size-12 shrink-0 place-items-center"
                      role="img"
                      aria-label={`${plantStageLabel(plantStageForStreak(streak.currentStreak))} ${streak.plantType} tree`}
                    >
                      <AnimatedPlant plantType={streak.plantType} streak={streak.currentStreak} size={43} className="relative -top-2 drop-shadow-[0_2px_3px_rgba(47,118,80,0.16)]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base font-semibold">{streak.name}</span>
                    <span className="flex shrink-0 items-baseline gap-1" aria-label={`${streak.currentStreak} ${isDailyView ? "day" : "week"} streak`}>
                      <strong className="text-2xl font-bold leading-none tracking-[-0.04em] tabular-nums text-ink-950">
                        {streak.currentStreak}
                      </strong>
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                        {isDailyView
                          ? streak.currentStreak === 1 ? "day" : "days"
                          : streak.currentStreak === 1 ? "week" : "weeks"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
