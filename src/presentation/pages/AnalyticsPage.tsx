import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Filter,
  History,
  Lightbulb,
  Sparkles,
  Trophy,
} from "lucide-react";
import { buildAnalyticsDashboard } from "../../application/analytics/buildAnalyticsDashboard";
import type { WeeklyProgressOverrides } from "../../application/week/weeklyProgress";
import type {
  CompletionRecord,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  Weekday,
} from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { ProgressRing } from "../components/ProgressRing";
import { AnimatedPlant } from "../components/AnimatedPlant";
import { HabitGarden } from "../components/HabitGarden";
import { Card } from "../components/ui/Card";

interface AnalyticsPageProps {
  readonly habits: readonly ManagedHabit[];
  readonly schedules: readonly HabitScheduleRecord[];
  readonly completions: readonly CompletionRecord[];
  readonly progress: readonly HabitProgressRecord[];
  readonly localDate: string;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
  readonly weeklyProgress: WeeklyProgressOverrides;
}

function changeBetween(first: number, last: number): number {
  return last - first;
}

export function AnalyticsPage({
  habits,
  schedules,
  completions,
  progress,
  localDate,
  weekStartsOn,
  weeklyProgress,
}: AnalyticsPageProps) {
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const dashboard = useMemo(
    () => buildAnalyticsDashboard(
      habits,
      schedules,
      completions,
      progress,
      localDate,
      selectedHabitId || undefined,
      weekStartsOn,
      weeklyProgress,
    ),
    [habits, schedules, completions, progress, localDate, selectedHabitId, weekStartsOn, weeklyProgress],
  );
  const monthsWithData = dashboard.monthlyPerformance.filter((month) => month.expectedCount > 0);
  const firstMonth = monthsWithData[0]?.completionPercentage ?? 0;
  const lastMonth = monthsWithData[monthsWithData.length - 1]?.completionPercentage ?? 0;
  const monthlyChange = monthsWithData.length >= 2 ? changeBetween(firstMonth, lastMonth) : 0;
  const selectedHabitName = selectedHabitId
    ? habits.find((habit) => habit.id === selectedHabitId)?.name ?? "Selected habit"
    : "All habits";

  return (
    <div className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 sm:py-9 xl:px-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-400">Patterns, not pressure</p>
          <h1 className="text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Analytics</h1>
          <p className="mt-2 text-sm text-ink-600">Understand consistency using your real schedule and history.</p>
        </div>
        <label className="relative self-start sm:self-auto">
          <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={15} />
          <select
            className="h-10 max-w-64 appearance-none rounded-xl border border-line bg-surface pl-9 pr-8 text-sm font-semibold text-ink-800 outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
            value={selectedHabitId}
            onChange={(event) => setSelectedHabitId(event.currentTarget.value)}
            aria-label="Filter analytics by habit"
          >
            <option value="">All habits</option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>{habit.name}{habit.isArchived ? " (archived)" : ""}</option>
            ))}
          </select>
        </label>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.35fr_repeat(3,1fr)]" aria-label="Analytics summary">
        <Card className="flex items-center gap-5 p-5 sm:col-span-2 xl:col-span-1">
          <ProgressRing percentage={dashboard.completionPercentage} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">{dashboard.monthLabel} completion</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.04em]">{selectedHabitName}</p>
            <p className="mt-1 text-xs text-ink-600">Schedule-aware completion rate</p>
          </div>
        </Card>
        <Card className="p-5">
          <span className="grid size-10 place-items-center"><AnimatedPlant plantType="oak" streak={dashboard.currentStreak} size={34} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{dashboard.currentStreak}</p>
          <p className="mt-1 text-xs text-ink-600">Longest current streak</p>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"><Trophy size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{dashboard.bestStreak}</p>
          <p className="mt-1 text-xs text-ink-600">Best streak</p>
        </Card>
        <Card className="p-5">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"><History size={18} /></span>
          <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{dashboard.totalCompletions}</p>
          <p className="mt-1 text-xs text-ink-600">Total completions</p>
        </Card>
      </section>

      <HabitGarden rows={dashboard.habitPerformance} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Monthly trend</p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.025em]">Six-month consistency</h2>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold",
              monthlyChange > 0 && "bg-leaf-50 text-leaf-700",
              monthlyChange < 0 && "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
              monthlyChange === 0 && "bg-canvas text-ink-400",
            )}>
              {monthlyChange > 0 ? <ArrowUpRight size={14} /> : monthlyChange < 0 ? <ArrowDownRight size={14} /> : null}
              {monthlyChange > 0 ? "+" : ""}{monthlyChange} pts
            </span>
          </div>
          <div className="mt-7 grid h-52 grid-cols-6 items-end gap-3 sm:gap-5">
            {dashboard.monthlyPerformance.map((month, index) => (
              <div key={month.key} className="flex h-full min-w-0 flex-col justify-end text-center">
                <span className="mb-2 text-[11px] font-bold text-ink-600">{month.expectedCount > 0 ? `${month.completionPercentage}%` : "—"}</span>
                <div className="relative h-36 overflow-hidden rounded-xl bg-canvas">
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 rounded-lg transition-[height] duration-300 ease-out",
                      index === dashboard.monthlyPerformance.length - 1 ? "bg-leaf-500" : "bg-leaf-100 dark:bg-leaf-100",
                    )}
                    style={{ height: `${month.expectedCount > 0 ? Math.max(5, month.completionPercentage) : 0}%` }}
                  />
                </div>
                <span className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">{month.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink-400">
            Current-month results include scheduled opportunities through today. Weekly targets are normalised so pages or minutes do not overpower other habits.
          </p>
        </Card>

        <Card className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Weekly performance</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.025em]">Last eight weeks</h2>
          <div className="mt-6 space-y-3.5">
            {dashboard.weeklyPerformance.map((week, index) => (
              <div key={week.key} className="grid grid-cols-[54px_1fr_36px] items-center gap-3">
                <span className={cn("text-[10px] font-semibold text-ink-400", index === 7 && "text-leaf-700")}>{week.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={cn("h-full rounded-full", index === 7 ? "bg-leaf-500" : "bg-leaf-100")}
                    style={{ width: `${week.expectedCount > 0 ? week.completionPercentage : 0}%` }}
                  />
                </div>
                <span className="text-right text-[10px] font-bold text-ink-600">{week.expectedCount > 0 ? `${week.completionPercentage}%` : "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Habit completion</p>
            <h2 className="mt-1 text-lg font-bold tracking-[-0.025em]">Six-month comparison</h2>
          </div>
          {dashboard.habitPerformance.length === 0 ? (
            <div className="grid min-h-48 place-items-center px-6 text-center">
              <div><BarChart3 className="mx-auto text-ink-400" size={26} /><p className="mt-3 text-sm font-semibold">No scheduled history yet.</p></div>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {dashboard.habitPerformance.map((row) => (
                <div key={row.habit.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(160px,0.8fr)_minmax(180px,1fr)_190px] sm:items-center sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.habit.colour ?? "#3e9b68" }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.habit.name}</p>
                      <p className="mt-0.5 text-[10px] text-ink-400">{row.habit.isArchived ? "Archived" : row.habit.categoryName ?? "Uncategorised"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-leaf-500" style={{ width: `${row.completionPercentage}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs font-bold">{row.completionPercentage}%</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-ink-400 sm:justify-end">
                    <span><strong className="text-ink-800">{row.currentStreak}</strong> current</span>
                    <span><strong className="text-ink-800">{row.bestStreak}</strong> best</span>
                    <span><strong className="text-ink-800">{row.totalCompletions}</strong> total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">Time of day</p>
            <h2 className="mt-1 text-lg font-bold tracking-[-0.025em]">Completion by routine</h2>
            <div className="mt-5 space-y-4">
              {dashboard.timeOfDayPerformance.map((item) => (
                <div key={item.id}>
                  <div className="mb-2 flex justify-between gap-3 text-xs">
                    <span className="font-semibold">{item.label}</span>
                    <span className="font-bold text-ink-600">{item.completionPercentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-leaf-500" style={{ width: `${item.completionPercentage}%` }} />
                  </div>
                </div>
              ))}
              {dashboard.timeOfDayPerformance.length === 0 && (
                <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-xs text-ink-400">More scheduled history is needed.</p>
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-leaf-700">
              <Sparkles size={16} />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Patterns in your data</p>
            </div>
            {dashboard.insights.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-line px-4 py-5 text-center">
                <Lightbulb className="mx-auto text-ink-400" size={22} />
                <p className="mt-3 text-sm font-semibold">No reliable pattern yet</p>
                <p className="mt-1 text-xs leading-5 text-ink-400">Insights appear only when enough actual history supports them.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {dashboard.insights.map((insight) => (
                  <div key={insight.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold leading-5">{insight.title}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-400">{insight.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
