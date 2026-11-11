import { describe, expect, it } from "vitest";
import type { HabitScheduleRecord } from "../../domain/habits/models";
import { versionHabitSchedule } from "./versionHabitSchedule";

describe("versionHabitSchedule", () => {
  const current: HabitScheduleRecord = {
    id: "schedule-1",
    habitId: "exercise",
    type: "weekly_frequency",
    targetCount: 3,
    effectiveFrom: "2026-11-01",
  };

  it("shows a changed weekly target immediately and closes the previous version", () => {
    expect(versionHabitSchedule(
      [current],
      "exercise",
      { type: "weekly_frequency", targetCount: 5, effectiveFrom: "2026-11-01" },
      "2026-11-07",
    )).toEqual([
      { ...current, effectiveTo: "2026-11-06" },
      {
        habitId: "exercise",
        type: "weekly_frequency",
        targetCount: 5,
        effectiveFrom: "2026-11-07",
      },
    ]);
  });

  it("replaces a same-day optimistic version instead of duplicating it", () => {
    const sameDay = { ...current, effectiveFrom: "2026-11-07" };
    expect(versionHabitSchedule(
      [sameDay],
      "exercise",
      { type: "weekly_frequency", targetCount: 6, effectiveFrom: "2026-11-01" },
      "2026-11-07",
    )).toEqual([{
      ...sameDay,
      targetCount: 6,
      effectiveTo: undefined,
    }]);
  });
});
