import { describe, expect, it } from "vitest";
import type { CompletionRecord, HabitProgressRecord, HabitScheduleRecord, ManagedHabit } from "../../domain/habits/models";
import { buildAnalyticsDashboard, calculatePeriodScore } from "./buildAnalyticsDashboard";

const dailyHabit: ManagedHabit = {
  id: "daily",
  name: "Daily",
  type: "binary",
  status: "incomplete",
  timeOfDay: "morning",
  streak: 0,
  startDate: "2026-08-31",
  isArchived: false,
  sortOrder: 0,
  schedule: { type: "daily", effectiveFrom: "2026-08-31" },
};

describe("analytics calculations", () => {
  it("uses scheduled opportunities and excludes skipped records", () => {
    const completions: CompletionRecord[] = [
      { habitId: "daily", date: "2026-08-31", status: "completed" },
      { habitId: "daily", date: "2026-09-01", status: "skipped" },
      { habitId: "daily", date: "2026-09-02", status: "missed" },
    ];
    const result = calculatePeriodScore(
      [dailyHabit], [{ habitId: "daily", ...dailyHabit.schedule }], completions, [],
      "2026-08-31", "2026-09-02", "2026-09-02",
    );
    expect(result.expectedCount).toBe(2);
    expect(result.completedScore).toBe(1);
    expect(result.completionPercentage).toBe(50);
  });

  it("scores a weekly quantity target proportionally without mixing its raw units", () => {
    const habit: ManagedHabit = {
      ...dailyHabit,
      id: "pages",
      name: "Read",
      type: "quantity",
      targetValue: 100,
      targetUnit: "pages",
      schedule: { type: "weekly_target", targetValue: 100, targetUnit: "pages", effectiveFrom: "2026-08-31" },
    };
    const schedules: HabitScheduleRecord[] = [{ habitId: habit.id, ...habit.schedule }];
    const progress: HabitProgressRecord[] = [
      { habitId: habit.id, date: "2026-09-01", value: 30 },
      { habitId: habit.id, date: "2026-09-02", value: 20 },
    ];
    const result = calculatePeriodScore(
      [habit], schedules, [], progress, "2026-08-31", "2026-09-06", "2026-09-03",
    );
    expect(result.expectedCount).toBe(1);
    expect(result.completedScore).toBe(0.5);
    expect(result.completionPercentage).toBe(50);
  });

  it("builds eight weekly and six monthly trend periods", () => {
    const dashboard = buildAnalyticsDashboard(
      [dailyHabit], [{ habitId: "daily", ...dailyHabit.schedule }], [], [], "2026-09-04",
    );
    expect(dashboard.weeklyPerformance).toHaveLength(8);
    expect(dashboard.monthlyPerformance).toHaveLength(6);
    expect(dashboard.monthLabel).toBe("September");
  });

  it("filters every headline metric to one selected habit", () => {
    const second = { ...dailyHabit, id: "second", name: "Second" };
    const completions: CompletionRecord[] = [
      { habitId: "daily", date: "2026-09-01", status: "completed" },
      { habitId: "second", date: "2026-09-01", status: "completed" },
    ];
    const dashboard = buildAnalyticsDashboard(
      [dailyHabit, second],
      [
        { habitId: "daily", ...dailyHabit.schedule },
        { habitId: "second", ...second.schedule },
      ],
      completions,
      [],
      "2026-09-01",
      "second",
    );
    expect(dashboard.totalCompletions).toBe(1);
    expect(dashboard.habitPerformance).toHaveLength(1);
    expect(dashboard.habitPerformance[0].habit.id).toBe("second");
  });

  it("does not fabricate insights from sparse data", () => {
    const dashboard = buildAnalyticsDashboard(
      [dailyHabit],
      [{ habitId: "daily", ...dailyHabit.schedule }],
      [{ habitId: "daily", date: "2026-09-01", status: "completed" }],
      [],
      "2026-09-01",
    );
    expect(dashboard.insights).toEqual([]);
  });

  it("reports a trend only after eight data-bearing weeks", () => {
    const first = {
      ...dailyHabit,
      startDate: "2026-07-06",
      schedule: { type: "daily" as const, effectiveFrom: "2026-07-06" },
    };
    const second = { ...first, id: "second", name: "Second" };
    const completions: CompletionRecord[] = [];
    const start = new Date("2026-08-03T12:00:00");
    for (let offset = 0; offset < 28; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      completions.push(
        { habitId: first.id, date: key, status: "completed" },
        { habitId: second.id, date: key, status: "completed" },
      );
    }
    const dashboard = buildAnalyticsDashboard(
      [first, second],
      [
        { habitId: first.id, ...first.schedule },
        { habitId: second.id, ...second.schedule },
      ],
      completions,
      [],
      "2026-08-30",
    );
    expect(dashboard.insights.some((insight) => insight.id === "trend")).toBe(true);
  });

  it("uses the configured first weekday for weekly analytics", () => {
    const dashboard = buildAnalyticsDashboard(
      [dailyHabit], [{ habitId: "daily", ...dailyHabit.schedule }],
      [], [], "2026-09-04", undefined, "sun",
    );
    expect(dashboard.weeklyPerformance[7].from).toBe("2026-08-30");
    expect(dashboard.weeklyPerformance[7].through).toBe("2026-09-05");
  });
});
