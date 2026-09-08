import type { TodayHabit } from "../../domain/habits/models";

export function toggleHabitCompletion(
  habits: readonly TodayHabit[],
  habitId: string,
): readonly TodayHabit[] {
  return habits.map((habit) =>
    habit.id === habitId
      ? {
          ...habit,
          status: habit.status === "completed" ? "incomplete" : "completed",
          value:
            habit.status === "completed"
              ? habit.type === "binary"
                ? undefined
                : 0
              : habit.targetValue ?? habit.value,
        }
      : habit,
  );
}

export function markHabitSkipped(
  habits: readonly TodayHabit[],
  habitId: string,
): readonly TodayHabit[] {
  return habits.map((habit) =>
    habit.id === habitId ? { ...habit, status: "skipped" } : habit,
  );
}

export function resetHabitCheckIn(
  habits: readonly TodayHabit[],
  habitId: string,
): readonly TodayHabit[] {
  return habits.map((habit) =>
    habit.id === habitId
      ? {
          ...habit,
          status: "incomplete",
          value: habit.type === "binary" ? undefined : 0,
        }
      : habit,
  );
}

export function deleteHabit(
  habits: readonly TodayHabit[],
  habitId: string,
): readonly TodayHabit[] {
  return habits.filter((habit) => habit.id !== habitId);
}
