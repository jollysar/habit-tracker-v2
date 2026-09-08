import { addDaysToLocalDateKey } from "../dates/localDate";
import {
  endOfLocalWeek,
  startOfLocalWeek,
  weekdayForLocalDate,
} from "../scheduling/habitScheduling";
import type {
  CompletionRecord,
  HabitProgressRecord,
  HabitSchedule,
  HabitScheduleRecord,
  HabitStatistics,
  ManagedHabit,
  WeekDashboard,
  WeekHabitCell,
  WeekHabitRow,
  Weekday,
} from "../../domain/habits/models";
import { weeklyProgressKey, type WeeklyProgressOverrides } from "./weeklyProgress";

function displayDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

function applies(schedule: HabitSchedule, date: string): boolean {
  return schedule.effectiveFrom <= date &&
    (!schedule.effectiveTo || schedule.effectiveTo >= date);
}

export function scheduleForHabitDate(
  habit: ManagedHabit,
  schedules: readonly HabitScheduleRecord[],
  date: string,
): HabitSchedule | undefined {
  const historical = schedules
    .filter((schedule) => schedule.habitId === habit.id && applies(schedule, date))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  if (historical) return historical;
  return applies(habit.schedule, date) ? habit.schedule : undefined;
}

function habitExists(habit: ManagedHabit, date: string): boolean {
  return habit.startDate <= date && (!habit.endDate || habit.endDate >= date);
}

function isFixedDue(schedule: HabitSchedule, date: string): boolean {
  return schedule.type === "daily" || (
    schedule.type === "specific_days" &&
    (schedule.daysOfWeek?.includes(weekdayForLocalDate(date)) ?? false)
  );
}

function recordKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

function valueForDate(
  habit: ManagedHabit,
  date: string,
  completionByDate: ReadonlyMap<string, CompletionRecord>,
  progressByDate: ReadonlyMap<string, HabitProgressRecord>,
): number {
  const key = recordKey(habit.id, date);
  const progress = progressByDate.get(key);
  if (progress) return progress.value;
  const completion = completionByDate.get(key);
  if (completion?.value !== undefined) return completion.value;
  if (completion?.status !== "completed") return 0;
  return habit.type === "binary" ? 1 : habit.targetValue ?? 0;
}

type Outcome = "completed" | "failed" | "neutral" | "pending";

interface StreakOutcome {
  readonly key: string;
  readonly date: string;
  readonly outcome: Outcome;
}

export function calculateHabitStatistics(
  habit: ManagedHabit,
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  throughDate: string,
  weekStartsOn: Weekday = "mon",
  weeklyProgress: WeeklyProgressOverrides = {},
): HabitStatistics {
  const habitCompletions = completions.filter(
    (record) => record.habitId === habit.id && record.date <= throughDate,
  );
  const completionByDate = new Map(
    habitCompletions.map((record) => [recordKey(record.habitId, record.date), record]),
  );
  const progressByDate = new Map(
    progress
      .filter((record) => record.habitId === habit.id && record.date <= throughDate)
      .map((record) => [recordKey(record.habitId, record.date), record]),
  );
  const outcomes: StreakOutcome[] = [];
  const weeklySchedules = new Map<string, HabitSchedule>();
  const finalDate = habit.endDate && habit.endDate < throughDate ? habit.endDate : throughDate;
  let cursor = habit.startDate;
  let inspectedDays = 0;

  while (cursor <= finalDate && inspectedDays < 10000) {
    const schedule = scheduleForHabitDate(habit, schedules, cursor);
    if (schedule && habitExists(habit, cursor)) {
      if (isFixedDue(schedule, cursor)) {
        const record = completionByDate.get(recordKey(habit.id, cursor));
        const outcome: Outcome = record?.status === "completed"
          ? "completed"
          : record?.status === "skipped"
            ? "neutral"
            : cursor === throughDate && !record
              ? "pending"
              : "failed";
        outcomes.push({ key: cursor, date: cursor, outcome });
      } else if (schedule.type === "weekly_frequency" || schedule.type === "weekly_target") {
        const weekStart = startOfLocalWeek(cursor, weekStartsOn);
        if (!weeklySchedules.has(weekStart)) weeklySchedules.set(weekStart, schedule);
      }
    }
    cursor = addDaysToLocalDateKey(cursor, 1);
    inspectedDays += 1;
  }

  for (const [weekStart, schedule] of weeklySchedules) {
    const weekEnd = endOfLocalWeek(weekStart, weekStartsOn);
    const rangeEnd = weekEnd < finalDate ? weekEnd : finalDate;
    let completed = 0;
    let date = weekStart < habit.startDate ? habit.startDate : weekStart;
    while (date <= rangeEnd) {
      if (schedule.type === "weekly_frequency") {
        if (completionByDate.get(recordKey(habit.id, date))?.status === "completed") completed += 1;
      } else {
        completed += valueForDate(habit, date, completionByDate, progressByDate);
      }
      date = addDaysToLocalDateKey(date, 1);
    }
    completed = weeklyProgress[weeklyProgressKey(habit.id, weekStart)] ?? completed;
    const target = schedule.type === "weekly_frequency"
      ? schedule.targetCount ?? 1
      : schedule.targetValue ?? habit.targetValue ?? 1;
    outcomes.push({
      key: `week:${weekStart}`,
      date: weekEnd,
      outcome: completed >= target
        ? "completed"
        : weekEnd >= throughDate
          ? "pending"
          : "failed",
    });
  }

  outcomes.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
  let bestStreak = 0;
  let running = 0;
  for (const item of outcomes) {
    if (item.outcome === "completed") {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else if (item.outcome === "failed") {
      running = 0;
    }
  }
  let currentStreak = 0;
  for (const item of [...outcomes].reverse()) {
    if (item.outcome === "pending" || item.outcome === "neutral") continue;
    if (item.outcome === "completed") currentStreak += 1;
    else break;
  }
  const settled = outcomes.filter((item) => item.outcome !== "pending" && item.outcome !== "neutral");
  const completedScheduledCount = settled.filter((item) => item.outcome === "completed").length;

  return {
    habitId: habit.id,
    currentStreak,
    bestStreak,
    totalCompletions: habitCompletions.filter((record) => record.status === "completed").length,
    scheduledCount: settled.length,
    completedScheduledCount,
    completionPercentage: settled.length === 0
      ? 0
      : Math.round((completedScheduledCount / settled.length) * 100),
  };
}

function weekRow(
  habit: ManagedHabit,
  dates: readonly string[],
  localDate: string,
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  weekStartsOn: Weekday,
  weeklyProgress: WeeklyProgressOverrides,
): WeekHabitRow {
  const completionByDate = new Map(
    completions.map((record) => [recordKey(record.habitId, record.date), record]),
  );
  const progressByDate = new Map(
    progress.map((record) => [recordKey(record.habitId, record.date), record]),
  );
  const cells: WeekHabitCell[] = dates.map((date) => {
    const schedule = scheduleForHabitDate(habit, schedules, date);
    const isAvailable = Boolean(schedule && habitExists(habit, date));
    const isScheduled = Boolean(schedule && (
      isFixedDue(schedule, date) ||
      schedule.type === "weekly_frequency" ||
      schedule.type === "weekly_target"
    ));
    const completion = completionByDate.get(recordKey(habit.id, date));
    return {
      date,
      status: !isAvailable || !isScheduled
        ? "not_scheduled"
        : completion?.status ?? "incomplete",
      value: valueForDate(habit, date, completionByDate, progressByDate) || undefined,
      isFuture: date > localDate,
      canCorrect: isAvailable && isScheduled && date <= localDate,
    };
  });
  const schedulesInWeek = dates
    .map((date) => scheduleForHabitDate(habit, schedules, date))
    .filter((schedule): schedule is HabitSchedule => Boolean(schedule));
  const flexible = schedulesInWeek.find(
    (schedule) => schedule.type === "weekly_frequency" || schedule.type === "weekly_target",
  );
  let completed: number;
  let target: number;
  let unit: string;
  if (flexible?.type === "weekly_frequency") {
    completed = weeklyProgress[weeklyProgressKey(habit.id, dates[0])] ??
      cells.filter((cell) => cell.status === "completed").length;
    target = flexible.targetCount ?? 1;
    unit = "times";
  } else if (flexible?.type === "weekly_target") {
    completed = weeklyProgress[weeklyProgressKey(habit.id, dates[0])] ??
      cells.reduce((total, cell) => total + (cell.value ?? 0), 0);
    target = flexible.targetValue ?? habit.targetValue ?? 1;
    unit = flexible.targetUnit ?? habit.targetUnit ?? "units";
  } else {
    completed = cells.filter((cell) => cell.status === "completed").length;
    target = cells.filter(
      (cell) => cell.status !== "not_scheduled" && !cell.isFuture,
    ).length;
    unit = target === 1 ? "day" : "days";
  }
  return {
    habit,
    cells,
    completed,
    target,
    unit,
    statistics: calculateHabitStatistics(
      habit, schedules, completions, progress, localDate, weekStartsOn, weeklyProgress,
    ),
  };
}

export function buildWeekDashboard(
  habits: readonly ManagedHabit[],
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  selectedDate: string,
  localDate: string,
  weekStartsOn: Weekday = "mon",
  weeklyProgress: WeeklyProgressOverrides = {},
): WeekDashboard {
  const startDate = startOfLocalWeek(selectedDate, weekStartsOn);
  const endDate = endOfLocalWeek(selectedDate, weekStartsOn);
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToLocalDateKey(startDate, index));
  const rows = habits
    .filter((habit) => habit.startDate <= endDate && (!habit.endDate || habit.endDate >= startDate))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((habit) => weekRow(
      habit, dates, localDate, schedules, completions, progress, weekStartsOn, weeklyProgress,
    ))
    .filter((row) => row.cells.some((cell) => cell.status !== "not_scheduled"));

  const days = dates.map((date) => {
    const fixedCells = rows.flatMap((row) => {
      const schedule = scheduleForHabitDate(row.habit, schedules, date);
      const cell = row.cells.find((candidate) => candidate.date === date);
      return schedule && isFixedDue(schedule, date) && cell ? [cell] : [];
    });
    const completedCount = fixedCells.filter((cell) => cell.status === "completed").length;
    return {
      date,
      dayLabel: displayDate(date).toLocaleDateString(undefined, { weekday: "short" }),
      dateLabel: displayDate(date).toLocaleDateString(undefined, { day: "numeric" }),
      isToday: date === localDate,
      isFuture: date > localDate,
      completedCount,
      scheduledCount: fixedCells.length,
      completionPercentage: fixedCells.length === 0
        ? 0
        : Math.round((completedCount / fixedCells.length) * 100),
    };
  });
  const normalized = rows.map((row) => ({
    complete: row.target > 0 && row.completed >= row.target ? 1 : 0,
    target: row.target > 0 ? 1 : 0,
  }));
  const completedCount = normalized.reduce((sum, item) => sum + item.complete, 0);
  const scheduledCount = normalized.reduce((sum, item) => sum + item.target, 0);
  const startLabel = displayDate(startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = displayDate(endDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    startDate,
    endDate,
    dateLabel: `${startLabel} – ${endLabel}`,
    days,
    habits: rows,
    completedCount,
    scheduledCount,
    completionPercentage: scheduledCount === 0
      ? 0
      : Math.round((completedCount / scheduledCount) * 100),
  };
}
