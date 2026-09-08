import { describe, expect, it } from "vitest";
import type { TodayHabit } from "../../domain/habits/models";
import {
  deleteHabit,
  markHabitSkipped,
  resetHabitCheckIn,
  toggleHabitCompletion,
} from "./updateTodayHabit";

const quantityHabit: TodayHabit = {
  id: "reading",
  name: "Read",
  type: "quantity",
  status: "incomplete",
  timeOfDay: "morning",
  streak: 4,
  value: 12,
  targetValue: 20,
  targetUnit: "pages",
};

describe("today habit updates", () => {
  it("completes a habit and records its target value", () => {
    const [habit] = toggleHabitCompletion([quantityHabit], "reading");

    expect(habit.status).toBe("completed");
    expect(habit.value).toBe(20);
  });

  it("unchecks a completed habit without mutating the source record", () => {
    const completed = { ...quantityHabit, status: "completed" as const, value: 20 };
    const [habit] = toggleHabitCompletion([completed], "reading");

    expect(habit.status).toBe("incomplete");
    expect(habit.value).toBe(0);
    expect(completed.status).toBe("completed");
  });

  it("keeps skipped and reset states distinct", () => {
    const [skipped] = markHabitSkipped([quantityHabit], "reading");
    const [reset] = resetHabitCheckIn([skipped], "reading");

    expect(skipped.status).toBe("skipped");
    expect(reset.status).toBe("incomplete");
  });

  it("deletes only the selected habit", () => {
    const otherHabit = { ...quantityHabit, id: "meditation", name: "Meditate" };

    expect(deleteHabit([quantityHabit, otherHabit], "reading")).toEqual([otherHabit]);
  });
});
