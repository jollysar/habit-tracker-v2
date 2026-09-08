import type { HabitType, ScheduleType, Weekday } from "../../domain/habits/models";
import { isValidLocalDateKey } from "../dates/localDate";

export interface HabitConfigurationInput {
  readonly name: string;
  readonly description: string;
  readonly type: HabitType;
  readonly targetValue?: number;
  readonly targetUnit?: string;
  readonly scheduleType: ScheduleType;
  readonly daysOfWeek: readonly Weekday[];
  readonly weeklyAmount?: number;
  readonly startDate: string;
}

export function validateHabitConfiguration(
  input: HabitConfigurationInput,
): string | undefined {
  if (!input.name.trim()) return "Give this habit a name.";
  if (input.name.trim().length > 80) {
    return "Keep the habit name to 80 characters or fewer.";
  }
  if (input.description.trim().length > 240) {
    return "Keep the description to 240 characters or fewer.";
  }
  if (
    input.type !== "binary" &&
    (!Number.isFinite(input.targetValue) || (input.targetValue ?? 0) <= 0)
  ) {
    return "The habit target must be greater than zero.";
  }
  if (input.type !== "binary" && !input.targetUnit?.trim()) {
    return "Add a unit, such as pages, litres, or minutes.";
  }
  if (input.scheduleType === "specific_days" && input.daysOfWeek.length === 0) {
    return "Choose at least one day of the week.";
  }
  if (
    (input.scheduleType === "weekly_frequency" || input.scheduleType === "weekly_target") &&
    (!Number.isFinite(input.weeklyAmount) || (input.weeklyAmount ?? 0) <= 0)
  ) {
    return "The weekly amount must be greater than zero.";
  }
  if (input.scheduleType === "weekly_frequency" && (input.weeklyAmount ?? 0) > 7) {
    return "Weekly frequency cannot be more than seven times.";
  }
  if (input.scheduleType === "weekly_target" && input.type === "binary") {
    return "Weekly targets require a quantity or duration habit.";
  }
  if (!isValidLocalDateKey(input.startDate)) return "Choose a valid start date.";
  return undefined;
}
