import type { TimeOfDay, TodayHabit } from "../../domain/habits/models";

const sectionOrder: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

export interface TodaySection {
  readonly id: TimeOfDay;
  readonly label: string;
  readonly habits: readonly TodayHabit[];
}

export interface TodayDashboard {
  readonly dateLabel: string;
  readonly completedCount: number;
  readonly remainingCount: number;
  readonly scheduledCount: number;
  readonly completionPercentage: number;
  readonly sections: readonly TodaySection[];
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function buildTodayDashboard(
  habits: readonly TodayHabit[],
  localDate: Date,
): TodayDashboard {
  const completedCount = habits.filter((habit) => habit.status === "completed").length;
  const remainingCount = habits.filter((habit) => habit.status === "incomplete").length;
  const scheduledCount = habits.length;
  const completionPercentage = scheduledCount === 0
    ? 0
    : Math.round((completedCount / scheduledCount) * 100);

  const sections = sectionOrder.flatMap((timeOfDay) => {
    const sectionHabits = habits.filter((habit) => habit.timeOfDay === timeOfDay);
    return sectionHabits.length > 0
      ? [{ id: timeOfDay, label: titleCase(timeOfDay), habits: sectionHabits }]
      : [];
  });

  return {
    dateLabel: formatLocalDate(localDate),
    completedCount,
    remainingCount,
    scheduledCount,
    completionPercentage,
    sections,
  };
}
