import {
  addDaysToLocalDateKey,
  isValidLocalDateKey,
} from "../dates/localDate";
import type {
  CompletionRecord,
  HabitSchedule,
  HabitProgressRecord,
  ManagedHabit,
  MissedCompletion,
  TodayHabit,
  Weekday,
} from "../../domain/habits/models";
import { weeklyProgressKey, type WeeklyProgressOverrides } from "../week/weeklyProgress";

const weekdays: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function dateKeyParts(dateKey: string): [number, number, number] {
  if (!isValidLocalDateKey(dateKey)) throw new Error(`Invalid local date: ${dateKey}`);
  const [year, month, day] = dateKey.split("-").map(Number);
  return [year, month, day];
}

export function weekdayForLocalDate(dateKey: string): Weekday {
  const [year, month, day] = dateKeyParts(dateKey);
  return weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function startOfLocalWeek(
  dateKey: string,
  weekStartsOn: Weekday = "mon",
): string {
  const currentIndex = weekdays.indexOf(weekdayForLocalDate(dateKey));
  const startIndex = weekdays.indexOf(weekStartsOn);
  const distance = (currentIndex - startIndex + 7) % 7;
  return addDaysToLocalDateKey(dateKey, -distance);
}

export function endOfLocalWeek(
  dateKey: string,
  weekStartsOn: Weekday = "mon",
): string {
  return addDaysToLocalDateKey(startOfLocalWeek(dateKey, weekStartsOn), 6);
}

function scheduleAppliesOnDate(schedule: HabitSchedule, dateKey: string): boolean {
  return schedule.effectiveFrom <= dateKey &&
    (!schedule.effectiveTo || schedule.effectiveTo >= dateKey);
}

function fixedScheduleIsDue(schedule: HabitSchedule, dateKey: string): boolean {
  if (!scheduleAppliesOnDate(schedule, dateKey)) return false;
  if (schedule.type === "daily") return true;
  if (schedule.type === "specific_days") {
    return schedule.daysOfWeek?.includes(weekdayForLocalDate(dateKey)) ?? false;
  }
  return false;
}

function habitExistsOnDate(habit: ManagedHabit, dateKey: string): boolean {
  return habit.startDate <= dateKey && (!habit.endDate || habit.endDate >= dateKey);
}

function completionValue(habit: ManagedHabit, completion: CompletionRecord): number {
  if (completion.value !== undefined) return completion.value;
  if (habit.type === "binary") return 1;
  return habit.targetValue ?? 0;
}

function calculateFixedScheduleStreak(
  habit: ManagedHabit,
  completions: readonly CompletionRecord[],
  localDate: string,
): number {
  const completionByDate = new Map(
    completions
      .filter((completion) => completion.habitId === habit.id)
      .map((completion) => [completion.date, completion]),
  );
  let cursor = localDate;
  let streak = 0;
  let inspectedScheduledDays = 0;

  while (cursor >= habit.startDate && inspectedScheduledDays < 3660) {
    if (fixedScheduleIsDue(habit.schedule, cursor)) {
      inspectedScheduledDays += 1;
      const completion = completionByDate.get(cursor);
      if (completion?.status === "completed") {
        streak += 1;
      } else if (completion?.status !== "skipped") {
        if (cursor !== localDate || completion?.status === "missed") break;
      }
    }
    cursor = addDaysToLocalDateKey(cursor, -1);
  }
  return streak;
}

export function buildScheduledTodayHabits(
  habits: readonly ManagedHabit[],
  completions: readonly CompletionRecord[],
  localDate: string,
  progress: readonly HabitProgressRecord[] = [],
  weekStartsOn: Weekday = "mon",
  weeklyProgress: WeeklyProgressOverrides = {},
): readonly TodayHabit[] {
  const weekStart = startOfLocalWeek(localDate, weekStartsOn);
  const weekEnd = endOfLocalWeek(localDate, weekStartsOn);

  return habits.flatMap<TodayHabit>((habit) => {
    if (habit.isArchived || !habitExistsOnDate(habit, localDate)) return [];
    const schedule = habit.schedule;
    if (!scheduleAppliesOnDate(schedule, localDate)) return [];
    const todayCompletion = completions.find(
      (completion) => completion.habitId === habit.id && completion.date === localDate,
    );
    const todayProgress = progress.find(
      (entry) => entry.habitId === habit.id && entry.date === localDate,
    );
    const weekCompletions = completions.filter(
      (completion) =>
        completion.habitId === habit.id &&
        completion.date >= weekStart &&
        completion.date <= weekEnd &&
        completion.status === "completed",
    );

    if (schedule.type === "weekly_frequency") {
      const completed = weeklyProgress[weeklyProgressKey(habit.id, weekStart)] ?? weekCompletions.length;
      const target = schedule.targetCount ?? 1;
      return [{
        ...habit,
        status: todayCompletion?.status ?? "incomplete",
        value: completed,
        targetValue: target,
        targetUnit: "times",
        streak: 0,
      }];
    }

    if (schedule.type === "weekly_target") {
      const progressByDate = new Map(
        progress
          .filter((entry) =>
            entry.habitId === habit.id &&
            entry.date >= weekStart &&
            entry.date <= weekEnd,
          )
          .map((entry) => [entry.date, entry.value]),
      );
      const calculated = weekCompletions.reduce(
        (total, completion) =>
          total + (progressByDate.get(completion.date) ?? completionValue(habit, completion)),
        0,
      ) + [...progressByDate.entries()]
        .filter(([date]) => !weekCompletions.some((completion) => completion.date === date))
        .reduce((total, [, value]) => total + value, 0);
      const completed = weeklyProgress[weeklyProgressKey(habit.id, weekStart)] ?? calculated;
      const target = schedule.targetValue ?? habit.targetValue ?? 1;
      return [{
        ...habit,
        status: todayCompletion?.status ?? "incomplete",
        value: completed,
        targetValue: target,
        targetUnit: schedule.targetUnit ?? habit.targetUnit,
        todayValue: todayProgress?.value ?? todayCompletion?.value ?? 0,
        streak: 0,
      }];
    }

    if (!fixedScheduleIsDue(schedule, localDate)) return [];
    return [{
      ...habit,
      status: todayCompletion?.status ?? "incomplete",
      value: todayProgress?.value ?? todayCompletion?.value ??
        (todayCompletion?.status === "completed" ? habit.targetValue : habit.value),
      todayValue: todayProgress?.value ?? todayCompletion?.value ?? 0,
      streak: calculateFixedScheduleStreak(habit, completions, localDate),
    }];
  });
}

export function deriveMissedCompletions(
  habits: readonly ManagedHabit[],
  completions: readonly CompletionRecord[],
  localDate: string,
): readonly MissedCompletion[] {
  const yesterday = addDaysToLocalDateKey(localDate, -1);
  const recorded = new Set(
    completions.map((completion) => `${completion.habitId}:${completion.date}`),
  );
  const missed: MissedCompletion[] = [];

  for (const habit of habits) {
    if (habit.schedule.type !== "daily" && habit.schedule.type !== "specific_days") {
      continue;
    }
    let cursor = habit.startDate > habit.schedule.effectiveFrom
      ? habit.startDate
      : habit.schedule.effectiveFrom;
    const finalDate = habit.endDate && habit.endDate < yesterday
      ? habit.endDate
      : yesterday;

    while (cursor <= finalDate) {
      const key = `${habit.id}:${cursor}`;
      if (
        habitExistsOnDate(habit, cursor) &&
        fixedScheduleIsDue(habit.schedule, cursor) &&
        !recorded.has(key)
      ) {
        missed.push({ habitId: habit.id, date: cursor });
      }
      cursor = addDaysToLocalDateKey(cursor, 1);
    }
  }

  return missed;
}
