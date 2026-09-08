import { describe, expect, it } from "vitest";
import type { TodayHabit } from "../../domain/habits/models";
import { buildTodayDashboard } from "./buildTodayDashboard";

const habits: TodayHabit[] = [
  {
    id: "one",
    name: "First",
    type: "binary",
    status: "completed",
    timeOfDay: "morning",
    streak: 2,
  },
  {
    id: "two",
    name: "Second",
    type: "binary",
    status: "incomplete",
    timeOfDay: "evening",
    streak: 0,
  },
];

describe("buildTodayDashboard", () => {
  it("derives completion counts and percentage from habit records", () => {
    const result = buildTodayDashboard(habits, new Date(2026, 8, 3));

    expect(result.completedCount).toBe(1);
    expect(result.remainingCount).toBe(1);
    expect(result.scheduledCount).toBe(2);
    expect(result.completionPercentage).toBe(50);
  });

  it("groups habits into a stable time-of-day order", () => {
    const result = buildTodayDashboard(habits, new Date(2026, 8, 3));

    expect(result.sections.map((section) => section.id)).toEqual(["morning", "evening"]);
  });

  it("does not divide by zero when nothing is scheduled", () => {
    const result = buildTodayDashboard([], new Date(2026, 8, 3));

    expect(result.completionPercentage).toBe(0);
    expect(result.remainingCount).toBe(0);
  });
});
