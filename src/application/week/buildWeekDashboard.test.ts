import { describe, expect, it } from "vitest";
import type { CompletionRecord, HabitScheduleRecord, ManagedHabit } from "../../domain/habits/models";
import { buildWeekDashboard, calculateHabitStatistics } from "./buildWeekDashboard";

const habit: ManagedHabit = {
  id: "read",
  name: "Read",
  type: "binary",
  status: "incomplete",
  timeOfDay: "evening",
  streak: 0,
  startDate: "2026-08-31",
  isArchived: false,
  sortOrder: 0,
  schedule: { type: "daily", effectiveFrom: "2026-08-31" },
};
const schedules: HabitScheduleRecord[] = [{
  habitId: "read",
  type: "daily",
  effectiveFrom: "2026-08-31",
}];

describe("week dashboard", () => {
  it("builds a Monday-to-Sunday grid and leaves today's empty check-in pending", () => {
    const completions: CompletionRecord[] = [
      { habitId: "read", date: "2026-08-31", status: "completed" },
      { habitId: "read", date: "2026-09-01", status: "completed" },
      { habitId: "read", date: "2026-09-02", status: "missed" },
    ];
    const dashboard = buildWeekDashboard(
      [habit], schedules, completions, [], "2026-09-03", "2026-09-03",
    );
    expect(dashboard.startDate).toBe("2026-08-31");
    expect(dashboard.endDate).toBe("2026-09-06");
    expect(dashboard.days).toHaveLength(7);
    expect(dashboard.habits[0].cells[3].status).toBe("incomplete");
    expect(dashboard.habits[0].cells[4].isFuture).toBe(true);
  });

  it("calculates schedule-aware current and best streaks", () => {
    const completions: CompletionRecord[] = [
      { habitId: "read", date: "2026-08-31", status: "completed" },
      { habitId: "read", date: "2026-09-01", status: "completed" },
      { habitId: "read", date: "2026-09-02", status: "missed" },
      { habitId: "read", date: "2026-09-03", status: "completed" },
      { habitId: "read", date: "2026-09-04", status: "skipped" },
      { habitId: "read", date: "2026-09-05", status: "completed" },
    ];
    const result = calculateHabitStatistics(habit, schedules, completions, [], "2026-09-05");
    expect(result.currentStreak).toBe(2);
    expect(result.bestStreak).toBe(2);
    expect(result.totalCompletions).toBe(4);
    expect(result.scheduledCount).toBe(5);
    expect(result.completionPercentage).toBe(80);
  });

  it("treats a flexible weekly target as one streak period", () => {
    const weeklyHabit: ManagedHabit = {
      ...habit,
      id: "exercise",
      startDate: "2026-08-24",
      schedule: { type: "weekly_frequency", targetCount: 2, effectiveFrom: "2026-08-24" },
    };
    const weeklySchedules: HabitScheduleRecord[] = [{
      habitId: "exercise",
      type: "weekly_frequency",
      targetCount: 2,
      effectiveFrom: "2026-08-24",
    }];
    const completions: CompletionRecord[] = [
      { habitId: "exercise", date: "2026-08-25", status: "completed" },
      { habitId: "exercise", date: "2026-08-27", status: "completed" },
      { habitId: "exercise", date: "2026-09-01", status: "completed" },
      { habitId: "exercise", date: "2026-09-03", status: "completed" },
    ];
    const result = calculateHabitStatistics(
      weeklyHabit, weeklySchedules, completions, [], "2026-09-03",
    );
    expect(result.currentStreak).toBe(2);
    expect(result.bestStreak).toBe(2);
  });

  it("uses an editable total for weekly progress and streak completion", () => {
    const weeklyHabit: ManagedHabit = {
      ...habit,
      id: "gym",
      schedule: { type: "weekly_frequency", targetCount: 5, effectiveFrom: "2026-08-31" },
    };
    const weeklySchedules: HabitScheduleRecord[] = [{
      habitId: "gym",
      type: "weekly_frequency",
      targetCount: 5,
      effectiveFrom: "2026-08-31",
    }];
    const overrides = { "gym:2026-08-31": 5 };
    const dashboard = buildWeekDashboard(
      [weeklyHabit], weeklySchedules, [], [], "2026-09-04", "2026-09-04", "mon", overrides,
    );
    expect(dashboard.habits[0].completed).toBe(5);
    expect(dashboard.completedCount).toBe(1);
    expect(dashboard.habits[0].statistics.currentStreak).toBe(1);
  });

  it("supports Sunday-first week boundaries", () => {
    const dashboard = buildWeekDashboard(
      [habit], schedules, [], [], "2026-09-03", "2026-09-03", "sun",
    );
    expect(dashboard.startDate).toBe("2026-08-30");
    expect(dashboard.endDate).toBe("2026-09-05");
  });
});
