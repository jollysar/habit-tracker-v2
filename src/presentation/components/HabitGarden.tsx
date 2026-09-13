import type { CSSProperties } from "react";
import type { HabitAnalyticsRow } from "../../application/analytics/buildAnalyticsDashboard";
import { AnimatedPlant, plantStageForStreak, plantStageLabel } from "./AnimatedPlant";

interface HabitGardenProps {
  readonly rows: readonly HabitAnalyticsRow[];
}

function streakUnit(row: HabitAnalyticsRow): "day" | "week" {
  return row.habit.schedule.type === "weekly_frequency" || row.habit.schedule.type === "weekly_target"
    ? "week"
    : "day";
}

export function HabitGarden({ rows }: HabitGardenProps) {
  const growingRows = [...rows]
    .filter((row) => !row.habit.isArchived)
    .sort((a, b) => b.currentStreak - a.currentStreak || a.habit.name.localeCompare(b.habit.name));

  return (
    <section className="mt-6" aria-labelledby="habit-garden-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1 sm:mb-4">
        <div>
          <p className="hidden text-xs font-bold uppercase tracking-[0.14em] text-leaf-700 sm:block">Growing together</p>
          <h2 id="habit-garden-title" className="text-xl font-bold tracking-[-0.03em] sm:mt-1">Your garden</h2>
        </div>
        <p className="hidden text-xs text-ink-400 sm:block">Each current streak grows its own tree.</p>
      </div>

      <div className="habit-garden relative overflow-hidden rounded-2xl border border-line px-4 pb-5 pt-7 shadow-soft sm:px-6">
        <div className="garden-horizon pointer-events-none absolute inset-x-0 bottom-0 h-[62%]" aria-hidden="true" />
        {growingRows.length === 0 ? (
          <div className="relative grid min-h-40 place-items-center text-center">
            <div>
              <AnimatedPlant plantType="oak" stage={0} size={64} className="mx-auto" />
              <p className="mt-2 text-sm font-semibold">Your first tree is ready to be planted</p>
              <p className="mt-1 text-xs text-ink-400">Complete a habit to begin growing your garden.</p>
            </div>
          </div>
        ) : (
          <div className="relative grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {growingRows.map((row, index) => {
              const unit = streakUnit(row);
              const stage = plantStageForStreak(row.currentStreak);
              const plantType = row.habit.plantType ?? "oak";
              return (
                <figure
                  key={row.habit.id}
                  className="garden-plot flex min-w-0 flex-col items-center justify-end text-center"
                  style={{ "--garden-delay": `${Math.min(index, 11) * 45}ms` } as CSSProperties}
                  aria-label={`${row.habit.name}: ${row.currentStreak} ${row.currentStreak === 1 ? unit : `${unit}s`} streak, ${plantStageLabel(stage).toLowerCase()} ${plantType} tree`}
                >
                  <AnimatedPlant
                    plantType={plantType}
                    streak={row.currentStreak}
                    size={76}
                    className="drop-shadow-[0_5px_5px_rgba(31,74,48,0.15)]"
                  />
                  <figcaption className="mt-1 w-full">
                    <span className="block truncate text-xs font-semibold text-ink-950">{row.habit.name}</span>
                    <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                      {row.currentStreak} {row.currentStreak === 1 ? unit : `${unit}s`}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
