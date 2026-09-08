import { describe, expect, it } from "vitest";
import { validateHabitConfiguration } from "./validateHabitConfiguration";

const validInput = {
  name: "Read",
  description: "Read deliberately",
  type: "quantity" as const,
  targetValue: 20,
  targetUnit: "pages",
  scheduleType: "daily" as const,
  daysOfWeek: [] as const,
  weeklyAmount: undefined,
  startDate: "2026-09-04",
};

describe("habit configuration validation", () => {
  it("accepts a complete daily quantity habit", () => {
    expect(validateHabitConfiguration(validInput)).toBeUndefined();
  });

  it("requires at least one selected weekday", () => {
    expect(validateHabitConfiguration({
      ...validInput,
      scheduleType: "specific_days",
    })).toBe("Choose at least one day of the week.");
  });

  it("limits flexible weekly frequency to seven", () => {
    expect(validateHabitConfiguration({
      ...validInput,
      scheduleType: "weekly_frequency",
      weeklyAmount: 8,
    })).toBe("Weekly frequency cannot be more than seven times.");
  });

  it("rejects impossible local calendar dates", () => {
    expect(validateHabitConfiguration({
      ...validInput,
      startDate: "2026-02-31",
    })).toBe("Choose a valid start date.");
  });
});
