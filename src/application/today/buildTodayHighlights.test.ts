import { describe, expect, it } from "vitest";
import type {
  HabitScheduleRecord,
  ManagedHabit,
  WeekDashboard,
  WeekHabitRow,
} from "../../domain/habits/models";
import { buildTodayHighlights, splitTodayHabits } from "./buildTodayHighlights";

function row(
  id: string,
  schedule: ManagedHabit["schedule"],
  currentStreak: number,
  isArchived = false,
): WeekHabitRow {
  return {
    habit: {
      id,
      name: id,
      type: "binary",
      status: "incomplete",
      timeOfDay: "anytime",
      streak: currentStreak,
      startDate: "2026-08-01",
      isArchived,
      sortOrder: 0,
      schedule,
    },
    cells: [],
    completed: 2,
    target: 3,
    unit: "times",
    statistics: {
      habitId: id,
      currentStreak,
      bestStreak: currentStreak + 2,
      totalCompletions: 10,
      scheduledCount: 12,
      completedScheduledCount: 10,
      completionPercentage: 83,
    },
  };
}

describe("today highlights", () => {
  it("keeps archived habits out of weekly goals and streak previews", () => {
    const activeSchedule = {
      type: "weekly_frequency" as const,
      targetCount: 3,
      effectiveFrom: "2026-08-01",
    };
    const archivedSchedule = { ...activeSchedule };
    const dashboard: WeekDashboard = {
      startDate: "2026-08-31",
      endDate: "2026-09-06",
      dateLabel: "Aug 31 – Sep 6, 2026",
      days: [],
      habits: [
        row("active", activeSchedule, 4),
        row("deleted", archivedSchedule, 12, true),
      ],
      completedCount: 1,
      scheduledCount: 2,
      completionPercentage: 50,
    };
    const schedules: HabitScheduleRecord[] = [
      { habitId: "active", ...activeSchedule },
      { habitId: "deleted", ...archivedSchedule },
    ];

    const highlights = buildTodayHighlights(
      dashboard,
      schedules,
      "2026-09-03",
    );

    expect(highlights.weeklyGoals.map((goal) => goal.id)).toEqual(["active"]);
    expect(highlights.streaks).toEqual([
      expect.objectContaining({ id: "active", cadence: "weekly" }),
    ]);
  });

  it("orders every active streak by current streak", () => {
    const daily = { type: "daily" as const, effectiveFrom: "2026-08-01" };
    const dashboard: WeekDashboard = {
      startDate: "2026-08-31",
      endDate: "2026-09-06",
      dateLabel: "Aug 31 – Sep 6, 2026",
      days: [],
      habits: [row("two", daily, 2), row("seven", daily, 7), row("four", daily, 4)],
      completedCount: 0,
      scheduledCount: 3,
      completionPercentage: 0,
    };

    expect(buildTodayHighlights(dashboard, [], "2026-09-03").streaks)
      .toEqual([
        expect.objectContaining({ id: "seven", cadence: "daily" }),
        expect.objectContaining({ id: "four", cadence: "daily" }),
        expect.objectContaining({ id: "two", cadence: "daily" }),
      ]);
  });

  it("separates flexible weekly habits from today's fixed habits", () => {
    const daily = row("daily", { type: "daily", effectiveFrom: "2026-08-01" }, 2).habit;
    const weekly = row("weekly", {
      type: "weekly_target",
      targetValue: 20,
      effectiveFrom: "2026-08-01",
    }, 1).habit;

    const lanes = splitTodayHabits([daily, weekly]);

    expect(lanes.daily.map((habit) => habit.id)).toEqual(["daily"]);
    expect(lanes.weekly.map((habit) => habit.id)).toEqual(["weekly"]);
  });
});
