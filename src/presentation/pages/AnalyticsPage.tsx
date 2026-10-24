import { useMemo } from "react";
import { CircleMinus, History, Lightbulb, Sparkles, X } from "lucide-react";
import { buildAnalyticsDashboard } from "../../application/analytics/buildAnalyticsDashboard";
import type { WeeklyProgressOverrides } from "../../application/week/weeklyProgress";
import type {
  CompletionRecord,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  Weekday,
} from "../../domain/habits/models";
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

export function AnalyticsPage({
  habits,
  schedules,
  completions,
  progress,
  localDate,
  weekStartsOn,
  weeklyProgress,
}: AnalyticsPageProps) {
  const dashboard = useMemo(
    () => buildAnalyticsDashboard(
      habits,
      schedules,
      completions,
      progress,
      localDate,
      undefined,
      weekStartsOn,
      weeklyProgress,
    ),
    [habits, schedules, completions, progress, localDate, weekStartsOn, weeklyProgress],
  );

  return (
    <div className="app-content-page mobile-page-safe mx-auto max-w-[1440px] px-5 pb-7 sm:px-8 sm:py-9 xl:px-12">
      <header>
        <h1 className="app-section-title">Analytics</h1>
      </header>

      <HabitGarden rows={dashboard.habitPerformance} />

      <section className="mt-6 grid grid-cols-3 gap-3 sm:gap-4" aria-label="Habit totals">
        <Card className="rounded-[1.75rem] p-4 sm:p-5">
          <span className="grid size-9 place-items-center rounded-full bg-leaf-50 text-leaf-700"><History size={18} /></span>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:mt-4">{dashboard.totalCompletions}</p>
          <p className="mt-1 text-[10px] leading-4 text-ink-600 sm:text-xs">Total completions</p>
        </Card>
        <Card className="rounded-[1.75rem] p-4 sm:p-5">
          <span className="grid size-9 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"><X size={18} /></span>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:mt-4">{dashboard.missedCount}</p>
          <p className="mt-1 text-[10px] leading-4 text-ink-600 sm:text-xs">Missed check-ins</p>
        </Card>
        <Card className="rounded-[1.75rem] p-4 sm:p-5">
          <span className="grid size-9 place-items-center rounded-full bg-canvas text-ink-600"><CircleMinus size={18} /></span>
          <p className="mt-3 text-2xl font-bold tracking-[-0.04em] sm:mt-4">{dashboard.skippedCount}</p>
          <p className="mt-1 text-[10px] leading-4 text-ink-600 sm:text-xs">Skipped check-ins</p>
        </Card>
      </section>

      <Card className="mt-6 rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-leaf-700">
          <Sparkles size={16} />
          <h2 className="text-xs font-bold uppercase tracking-[0.14em]">Patterns in your data</h2>
        </div>
        {dashboard.insights.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-line px-4 py-6 text-center">
            <Lightbulb className="mx-auto text-ink-400" size={22} />
            <p className="mt-3 text-sm font-semibold">No reliable pattern yet</p>
            <p className="mt-1 text-xs leading-5 text-ink-400">Patterns will appear once there is enough habit history.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {dashboard.insights.map((insight) => (
              <article key={insight.id} className="rounded-[1.5rem] bg-canvas px-4 py-4">
                <p className="text-sm font-semibold leading-5">{insight.title}</p>
                <p className="mt-1 text-xs leading-5 text-ink-400">{insight.detail}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
