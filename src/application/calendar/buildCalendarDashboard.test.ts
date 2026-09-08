import { describe, expect, it } from "vitest";
import type { CompletionRecord, HabitScheduleRecord, ManagedHabit } from "../../domain/habits/models";
import { addMonthsToLocalDateKey, buildCalendarDashboard } from "./buildCalendarDashboard";

const habit: ManagedHabit = {
  id: "journal",
  name: "Journal",
  type: "binary",
  status: "incomplete",
  timeOfDay: "evening",
  streak: 0,
  startDate: "2026-09-01",
  isArchived: false,
  sortOrder: 0,
  schedule: { type: "specific_days", daysOfWeek: ["mon", "wed", "fri"], effectiveFrom: "2026-09-01" },
};
const schedules: HabitScheduleRecord[] = [{ ...habit.schedule, habitId: habit.id }];

describe("calendar dashboard", () => {
  it("moves across local calendar months safely", () => {
    expect(addMonthsToLocalDateKey("2026-01-31", -1)).toBe("2025-12-01");
    expect(addMonthsToLocalDateKey("2026-12-15", 1)).toBe("2027-01-01");
  });

  it("uses the schedule to calculate expected monthly completions", () => {
    const completions: CompletionRecord[] = [
      { habitId: habit.id, date: "2026-09-02", status: "completed" },
      { habitId: habit.id, date: "2026-09-04", status: "missed" },
    ];
    const result = buildCalendarDashboard(
      [habit], schedules, completions, [], "2026-09-01", "2026-09-04",
    );
    expect(result.expectedCount).toBe(2);
    expect(result.completedCount).toBe(1);
    expect(result.completionPercentage).toBe(50);
    expect(result.rows[0].cells[1].canCorrect).toBe(true);
    expect(result.rows[0].cells[2].status).toBe("not_scheduled");
  });

  it("removes skipped days from the expected denominator", () => {
    const completions: CompletionRecord[] = [
      { habitId: habit.id, date: "2026-09-02", status: "skipped" },
      { habitId: habit.id, date: "2026-09-04", status: "completed" },
    ];
    const result = buildCalendarDashboard(
      [habit], schedules, completions, [], "2026-09-01", "2026-09-04",
    );
    expect(result.expectedCount).toBe(1);
    expect(result.completionPercentage).toBe(100);
    expect(result.skippedCount).toBe(1);
  });

  it("keeps archived habits visible in their historical month", () => {
    const archived = { ...habit, isArchived: true, endDate: "2026-09-04" };
    const result = buildCalendarDashboard(
      [archived], schedules, [], [], "2026-09-01", "2026-09-30",
    );
    expect(result.rows).toHaveLength(1);
  });

  it("reorders the month grid for Sunday-first calendars", () => {
    const result = buildCalendarDashboard(
      [habit], schedules, [], [], "2026-09-01", "2026-09-04", undefined, "sun",
    );
    expect(result.calendarDays[0].date).toBe("2026-08-30");
  });
});
