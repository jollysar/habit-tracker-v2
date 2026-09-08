import { describe, expect, it } from "vitest";
import type { CompletionRecord, ManagedHabit } from "../../domain/habits/models";
import {
  buildScheduledTodayHabits,
  deriveMissedCompletions,
  endOfLocalWeek,
  startOfLocalWeek,
  weekdayForLocalDate,
} from "./habitScheduling";

function habit(overrides: Partial<ManagedHabit> = {}): ManagedHabit {
  return {
    id: "habit-1",
    name: "Read",
    type: "binary",
    status: "incomplete",
    timeOfDay: "morning",
    streak: 0,
    startDate: "2026-08-31",
    isArchived: false,
    sortOrder: 0,
    schedule: { type: "daily", effectiveFrom: "2026-08-31" },
    ...overrides,
  };
}

describe("local scheduling", () => {
  it("calculates weekdays and Monday-based week boundaries", () => {
    expect(weekdayForLocalDate("2026-09-04")).toBe("fri");
    expect(startOfLocalWeek("2026-09-04")).toBe("2026-08-31");
    expect(endOfLocalWeek("2026-09-04")).toBe("2026-09-06");
  });

  it("shows selected-day habits only on configured weekdays", () => {
    const selected = habit({
      schedule: {
        type: "specific_days",
        daysOfWeek: ["mon", "wed", "fri"],
        effectiveFrom: "2026-08-31",
      },
    });
    expect(buildScheduledTodayHabits([selected], [], "2026-09-04")).toHaveLength(1);
    expect(buildScheduledTodayHabits([selected], [], "2026-09-05")).toHaveLength(0);
  });

  it("keeps a flexible weekly habit visible after its target is met", () => {
    const weekly = habit({
      schedule: {
        type: "weekly_frequency",
        targetCount: 2,
        effectiveFrom: "2026-08-31",
      },
    });
    const oneCompletion: CompletionRecord[] = [
      { habitId: weekly.id, date: "2026-09-01", status: "completed" },
    ];
    const twoCompletions: CompletionRecord[] = [
      ...oneCompletion,
      { habitId: weekly.id, date: "2026-09-03", status: "completed" },
    ];
    expect(buildScheduledTodayHabits([weekly], oneCompletion, "2026-09-04")[0]).toMatchObject({
      value: 1,
      targetValue: 2,
      targetUnit: "times",
    });
    expect(buildScheduledTodayHabits([weekly], twoCompletions, "2026-09-04")[0]).toMatchObject({
      value: 2,
      targetValue: 2,
      targetUnit: "times",
    });
  });

  it("uses an editable weekly total without removing existing check-ins", () => {
    const weekly = habit({
      schedule: {
        type: "weekly_frequency",
        targetCount: 5,
        effectiveFrom: "2026-08-31",
      },
    });
    const completions: CompletionRecord[] = [
      { habitId: weekly.id, date: "2026-09-01", status: "completed" },
    ];
    expect(buildScheduledTodayHabits(
      [weekly],
      completions,
      "2026-09-04",
      [],
      "mon",
      { [`${weekly.id}:2026-08-31`]: 3 },
    )[0]).toMatchObject({ value: 3, targetValue: 5, targetUnit: "times" });
  });

  it("adds quantity progress across a weekly target", () => {
    const weekly = habit({
      type: "quantity",
      targetValue: 20,
      targetUnit: "pages",
      schedule: {
        type: "weekly_target",
        targetValue: 100,
        targetUnit: "pages",
        effectiveFrom: "2026-08-31",
      },
    });
    const completions: CompletionRecord[] = [
      { habitId: weekly.id, date: "2026-09-01", status: "completed", value: 25 },
      { habitId: weekly.id, date: "2026-09-03", status: "completed", value: 30 },
    ];
    expect(buildScheduledTodayHabits(
      [weekly],
      completions,
      "2026-09-04",
      [{ habitId: weekly.id, date: "2026-09-04", value: 10 }],
    )[0]).toMatchObject({
      value: 65,
      targetValue: 100,
      targetUnit: "pages",
      todayValue: 10,
    });
  });

  it("backfills only missing fixed-schedule dates before today", () => {
    const selected = habit({
      schedule: {
        type: "specific_days",
        daysOfWeek: ["mon", "wed", "fri"],
        effectiveFrom: "2026-08-31",
      },
    });
    const completions: CompletionRecord[] = [
      { habitId: selected.id, date: "2026-08-31", status: "completed" },
    ];
    expect(deriveMissedCompletions([selected], completions, "2026-09-05")).toEqual([
      { habitId: selected.id, date: "2026-09-02" },
      { habitId: selected.id, date: "2026-09-04" },
    ]);
  });

  it("does not create daily misses for flexible weekly schedules", () => {
    const weekly = habit({
      schedule: {
        type: "weekly_frequency",
        targetCount: 3,
        effectiveFrom: "2026-08-31",
      },
    });
    expect(deriveMissedCompletions([weekly], [], "2026-09-05")).toEqual([]);
  });
});
