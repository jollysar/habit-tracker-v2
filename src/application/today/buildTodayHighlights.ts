import type {
  HabitScheduleRecord,
  PlantType,
  TodayHabit,
  WeekDashboard,
  WeeklyGoal,
} from "../../domain/habits/models";
import { scheduleForHabitDate } from "../week/buildWeekDashboard";

export interface TodayStreakPreview {
  readonly id: string;
  readonly name: string;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly cadence: "daily" | "weekly";
  readonly colour?: string;
  readonly plantType: PlantType;
}

export interface TodayHighlights {
  readonly weeklyGoals: readonly WeeklyGoal[];
  readonly weeklyCompletionPercentage: number;
  readonly completedWeeklyGoals: number;
  readonly streaks: readonly TodayStreakPreview[];
}

export interface TodayHabitLanes {
  readonly daily: readonly TodayHabit[];
  readonly weekly: readonly TodayHabit[];
}

export function splitTodayHabits(habits: readonly TodayHabit[]): TodayHabitLanes {
  return habits.reduce<TodayHabitLanes>((lanes, habit) => {
    const isWeekly = habit.schedule?.type === "weekly_frequency" ||
      habit.schedule?.type === "weekly_target";
    return isWeekly
      ? { daily: lanes.daily, weekly: [...lanes.weekly, habit] }
      : { daily: [...lanes.daily, habit], weekly: lanes.weekly };
  }, { daily: [], weekly: [] });
}

export function buildTodayHighlights(
  week: WeekDashboard,
  schedules: readonly HabitScheduleRecord[],
  localDate: string,
): TodayHighlights {
  const activeRows = week.habits.filter((row) => !row.habit.isArchived);

  const weeklyGoals = activeRows.flatMap((row) => {
    const schedule = scheduleForHabitDate(row.habit, schedules, localDate);
    if (schedule?.type !== "weekly_frequency" && schedule?.type !== "weekly_target") return [];
    return [{
      id: row.habit.id,
      name: row.habit.name,
      completed: row.completed,
      target: row.target,
      unit: row.unit,
    }];
  });

  const streaks = activeRows
    .map((row) => {
      const schedule = scheduleForHabitDate(row.habit, schedules, localDate) ?? row.habit.schedule;
      return {
        id: row.habit.id,
        name: row.habit.name,
        currentStreak: row.statistics.currentStreak,
        bestStreak: row.statistics.bestStreak,
        cadence: schedule.type === "weekly_frequency" || schedule.type === "weekly_target"
          ? "weekly" as const
          : "daily" as const,
        colour: row.habit.colour,
        plantType: row.habit.plantType ?? "oak",
      };
    })
    .sort((a, b) =>
      b.currentStreak - a.currentStreak ||
      b.bestStreak - a.bestStreak ||
      a.name.localeCompare(b.name),
    );

  const completedWeeklyGoals = weeklyGoals.filter(
    (goal) => goal.target > 0 && goal.completed >= goal.target,
  ).length;
  const weeklyCompletionPercentage = weeklyGoals.length === 0
    ? 0
    : Math.round(weeklyGoals.reduce((total, goal) => (
        total + Math.min(100, goal.target <= 0 ? 0 : (goal.completed / goal.target) * 100)
      ), 0) / weeklyGoals.length);

  return {
    weeklyGoals,
    weeklyCompletionPercentage,
    completedWeeklyGoals,
    streaks,
  };
}
