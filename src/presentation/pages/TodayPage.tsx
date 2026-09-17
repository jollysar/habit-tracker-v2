import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { TodayDashboard } from "../../application/today/buildTodayDashboard";
import type { TodayHabit, Weekday, WeeklyGoal } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { AnimatedPlant } from "../components/AnimatedPlant";
import { HabitRow } from "../components/HabitRow";
import { HomeDatePicker } from "../components/HomeDatePicker";
import { ProgressRing } from "../components/ProgressRing";
import { WeeklyHabitRow } from "../components/WeeklyHabitRow";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { handleRovingTabKey } from "../hooks/rovingTabs";
import { useHorizontalDateSwipe } from "../hooks/useHorizontalDateSwipe";
import { addDaysToLocalDateKey } from "../../application/dates/localDate";

type HomeView = "daily" | "weekly";
const homeViews: readonly HomeView[] = ["daily", "weekly"];

interface TodayPageProps {
  readonly dashboard: TodayDashboard;
  readonly weekDateLabel: string;
  readonly weeklyHabits: readonly TodayHabit[];
  readonly weeklyGoals: readonly WeeklyGoal[];
  readonly weeklyCompletionPercentage: number;
  readonly completedWeeklyGoals: number;
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
  const pageRef = useRef<HTMLDivElement>(null);
  const dateTransitionInProgress = useRef(false);

  const isDailyView = activeView === "daily";
  const isToday = selectedDate === localDate;
  const allHabits = dashboard.sections.flatMap((section) => section.habits);
  const remainingWeeklyGoals = Math.max(0, weeklyGoals.length - completedWeeklyGoals);

  const changeDateWithTransition = async (direction: "previous" | "next") => {
    if (dateTransitionInProgress.current) return;
    const interval = isDailyView ? 1 : 7;
    const offset = direction === "previous" ? -interval : interval;
    let candidate = addDaysToLocalDateKey(selectedDate, offset);
    if (direction === "next" && candidate > localDate) {
      if (selectedDate >= localDate) return;
      candidate = localDate;
    }

    setDatePickerOpen(false);
    const page = pageRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!page || reducedMotion || typeof page.animate !== "function") {
      onSelectDate(candidate);
      return;
    }

    dateTransitionInProgress.current = true;
    const outgoingX = direction === "previous" ? "12%" : "-12%";
    const incomingX = direction === "previous" ? "-12%" : "12%";
    let dateChanged = false;

    try {
      await page.animate(
        [
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
          { transform: `translate3d(${outgoingX}, 0, 0)`, opacity: 0.28 },
        ],
        { duration: 135, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
      ).finished;

      dateChanged = true;
      onSelectDate(candidate);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });

      await page.animate(
        [
          { transform: `translate3d(${incomingX}, 0, 0)`, opacity: 0.28 },
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
        ],
        { duration: 245, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      ).finished;
    } catch {
      if (!dateChanged) onSelectDate(candidate);
    } finally {
      page.getAnimations().forEach((animation) => animation.cancel());
      dateTransitionInProgress.current = false;
    }
  };

  const swipeHandlers = useHorizontalDateSwipe((direction) => {
    void changeDateWithTransition(direction);
  });

  const renderHabit = (habit: TodayHabit) => (
    <HabitRow
      key={habit.id}
      habit={habit}
      onToggle={() => onToggleHabit(habit.id)}
      onEdit={() => onEditHabit(habit.id)}
      onSkip={() => onSkipHabit(habit.id)}
      onReset={() => onResetHabit(habit.id)}
      onDelete={() => onDeleteHabit(habit.id)}
      onLogProgress={() => onLogProgress(habit.id)}
      onViewStreakHistory={() => onViewWeek("daily")}
    />
  );

  return (
    <div
      ref={pageRef}
      className="app-content-page mx-auto max-w-[1440px] touch-pan-y px-5 pb-4 pt-[calc(max(0px,env(safe-area-inset-top,0px)-0.25rem)+0.5rem)] sm:px-8 sm:py-9 xl:px-12"
      {...swipeHandlers}
    >
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="relative flex min-h-11 items-center">
            {isDailyView && isToday && (
              <AnimatedPlant plantType="oak" stage={4} size={44} className="shrink-0 lg:hidden" />
            )}
            <div className={cn(
              "min-w-0",
              isDailyView && isToday
                ? "pointer-events-none absolute inset-x-0 flex justify-center lg:pointer-events-auto lg:static lg:mr-auto lg:block"
                : "mr-auto max-w-[calc(100%-3.5rem)]",
            )}>
              <h1 className={cn(
                "pointer-events-auto font-bold tracking-[-0.035em] sm:text-3xl",
                isDailyView && isToday ? "text-[1.9rem]" : "text-[1.05rem]",
              )}>
              <button
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-left text-ink-950 transition hover:bg-leaf-50 focus:outline-none focus:ring-2 focus:ring-leaf-500"
                type="button"
                onClick={() => setDatePickerOpen((open) => !open)}
                title="Choose a date"
                aria-expanded={datePickerOpen}
                aria-haspopup="dialog"
                aria-controls={datePickerOpen ? "home-date-picker" : undefined}
                data-home-date-trigger
              >
                {isDailyView && isToday ? "Today" : isDailyView ? dashboard.dateLabel : weekDateLabel}
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
            <div className="ml-auto lg:hidden">
              <ProgressRing
                percentage={isDailyView ? dashboard.completionPercentage : weeklyCompletionPercentage}
                minimal
              />
            </div>
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-2 lg:flex">
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

        <div className="hidden flex-wrap items-center gap-2 lg:flex lg:pt-1">
          <Button className="h-[60px] px-6 text-base" onClick={onAddHabit} aria-keyshortcuts="Meta+N Control+N">
            <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
            Add habit
            <kbd className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 font-sans text-[10px]">⌘N</kbd>
          </Button>
        </div>
      </header>

      <div className="mt-4 inline-flex w-full rounded-full border border-line bg-canvas p-1 sm:mt-7 sm:w-auto" role="tablist" aria-label="Home habit view">
        {([['daily', 'Today’s habits'], ['weekly', 'Weekly habits']] as const).map(([view, label]) => (
          <button
            key={view}
            className={cn(
              "flex-1 rounded-full px-5 py-2 text-sm font-semibold transition sm:flex-none",
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
                setDatePickerOpen(false);
              },
            )}
            onClick={() => {
              setActiveView(view);
              setDatePickerOpen(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-w-[1040px] sm:mt-5">
        <div className="min-w-0 space-y-6">
          <Card className="hidden overflow-hidden lg:block">
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
              <div className="space-y-2">
                {allHabits.map((habit) => (
                  <Card key={habit.id} className="habit-card overflow-visible rounded-[1.75rem] shadow-none">
                    {renderHabit(habit)}
                  </Card>
                ))}
              </div>
            </section>
          ) : (
            <section aria-label="Weekly habits" role="tabpanel">
              {weeklyHabits.length === 0 ? (
                <Card className="rounded-[1.75rem] shadow-none">
                  <div className="px-5 py-7 text-center">
                    <p className="text-sm font-semibold">No weekly habits yet</p>
                    <p className="mt-1 text-xs text-ink-400">Add a weekly habit to start tracking one.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {weeklyHabits.map((habit) => {
                  const goal = weeklyGoals.find((candidate) => candidate.id === habit.id);
                  return goal ? (
                    <Card key={habit.id} className="habit-card overflow-visible rounded-[1.75rem] shadow-none">
                      <WeeklyHabitRow
                        habit={habit}
                        goal={goal}
                        onSaveValue={(value) => onSaveWeeklyValue(habit.id, value)}
                        onEdit={() => onEditHabit(habit.id)}
                        onDelete={() => onDeleteHabit(habit.id)}
                        onViewStreakHistory={() => onViewWeek("weekly")}
                      />
                    </Card>
                  ) : null;
                  })}
                </div>
              )}
            </section>
          )}
        </div>

      </div>
    </div>
  );
}
