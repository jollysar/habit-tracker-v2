import { addDaysToLocalDateKey } from "../dates/localDate";
import { endOfLocalWeek, startOfLocalWeek } from "../scheduling/habitScheduling";
import { scheduleForHabitDate } from "../week/buildWeekDashboard";
import type {
  CompletionRecord,
  CompletionStatus,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
  Weekday,
} from "../../domain/habits/models";

export type CalendarCellStatus = CompletionStatus | "not_scheduled";

export interface CalendarHabitCell {
  readonly date: string;
  readonly dayNumber: number;
  readonly status: CalendarCellStatus;
  readonly value?: number;
  readonly isExpected: boolean;
  readonly isFlexible: boolean;
  readonly isFuture: boolean;
  readonly canCorrect: boolean;
}

export interface CalendarHabitRow {
  readonly habit: ManagedHabit;
  readonly cells: readonly CalendarHabitCell[];
  readonly completedCount: number;
  readonly expectedCount: number;
  readonly completionPercentage: number;
}

export interface CalendarDay {
  readonly date: string;
  readonly dayNumber: number;
  readonly isInMonth: boolean;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly completedCount: number;
  readonly expectedCount: number;
  readonly completionPercentage: number;
  readonly hasCheckIn: boolean;
}

export interface CalendarDashboard {
  readonly monthStart: string;
  readonly monthEnd: string;
  readonly monthLabel: string;
  readonly monthDates: readonly string[];
  readonly calendarDays: readonly CalendarDay[];
  readonly rows: readonly CalendarHabitRow[];
  readonly completionPercentage: number;
  readonly completedCount: number;
  readonly expectedCount: number;
  readonly totalCheckIns: number;
  readonly missedCount: number;
  readonly skippedCount: number;
}

function displayDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function monthBounds(selectedDate: string): { start: string; end: string } {
  const [year, month] = selectedDate.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return { start: `${prefix}-01`, end: `${prefix}-${String(lastDay).padStart(2, "0")}` };
}

function existsOnDate(habit: ManagedHabit, date: string): boolean {
  return habit.startDate <= date && (!habit.endDate || habit.endDate >= date);
}

function expectedOnDate(
  habit: ManagedHabit,
  schedules: readonly HabitScheduleRecord[],
  date: string,
): { expected: boolean; flexible: boolean; available: boolean } {
  if (!existsOnDate(habit, date)) return { expected: false, flexible: false, available: false };
  const schedule = scheduleForHabitDate(habit, schedules, date);
  if (!schedule) return { expected: false, flexible: false, available: false };
  if (schedule.type === "daily") return { expected: true, flexible: false, available: true };
  if (schedule.type === "specific_days") {
    const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      displayDate(date).getDay()
    ];
    return {
      expected: schedule.daysOfWeek?.includes(day as Weekday) ?? false,
      flexible: false,
      available: true,
    };
  }
  return { expected: false, flexible: true, available: true };
}

function key(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

export function addMonthsToLocalDateKey(date: string, months: number): string {
  const [year, month] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1 + months, 1, 12);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-01`;
}

export function buildCalendarDashboard(
  habits: readonly ManagedHabit[],
  schedules: readonly HabitScheduleRecord[],
  completions: readonly CompletionRecord[],
  progress: readonly HabitProgressRecord[],
  selectedDate: string,
  localDate: string,
  selectedHabitId?: string,
  weekStartsOn: Weekday = "mon",
): CalendarDashboard {
  const { start: monthStart, end: monthEnd } = monthBounds(selectedDate);
  const monthDates: string[] = [];
  let cursor = monthStart;
  while (cursor <= monthEnd) {
    monthDates.push(cursor);
    cursor = addDaysToLocalDateKey(cursor, 1);
  }
  const visibleHabits = habits
    .filter((habit) => !selectedHabitId || habit.id === selectedHabitId)
    .filter((habit) => habit.startDate <= monthEnd && (!habit.endDate || habit.endDate >= monthStart))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const completionByKey = new Map(completions.map((record) => [key(record.habitId, record.date), record]));
  const progressByKey = new Map(progress.map((record) => [key(record.habitId, record.date), record]));

  const rows = visibleHabits.map<CalendarHabitRow>((habit) => {
    const cells = monthDates.map<CalendarHabitCell>((date, index) => {
      const expectation = expectedOnDate(habit, schedules, date);
      const completion = completionByKey.get(key(habit.id, date));
      const progressRecord = progressByKey.get(key(habit.id, date));
      const status: CalendarCellStatus = completion?.status ?? (
        expectation.expected ? "incomplete" : "not_scheduled"
      );
      return {
        date,
        dayNumber: index + 1,
        status,
        value: progressRecord?.value ?? completion?.value,
        isExpected: expectation.expected,
        isFlexible: expectation.flexible,
        isFuture: date > localDate,
        canCorrect: expectation.available && date <= localDate && (expectation.expected || expectation.flexible),
      };
    });
    const settledExpected = cells.filter(
      (cell) => cell.isExpected && !cell.isFuture && cell.status !== "skipped",
    );
    const completedCount = settledExpected.filter((cell) => cell.status === "completed").length;
    return {
      habit,
      cells,
      completedCount,
      expectedCount: settledExpected.length,
      completionPercentage: settledExpected.length === 0
        ? 0
        : Math.round((completedCount / settledExpected.length) * 100),
    };
  });

  const gridStart = startOfLocalWeek(monthStart, weekStartsOn);
  const gridEnd = endOfLocalWeek(monthEnd, weekStartsOn);
  const calendarDates: string[] = [];
  cursor = gridStart;
  while (cursor <= gridEnd) {
    calendarDates.push(cursor);
    cursor = addDaysToLocalDateKey(cursor, 1);
  }
  const calendarDays = calendarDates.map<CalendarDay>((date) => {
    const expectedCells = visibleHabits.flatMap((habit) => {
      const expectation = expectedOnDate(habit, schedules, date);
      if (!expectation.expected || date > localDate) return [];
      const completion = completionByKey.get(key(habit.id, date));
      return completion?.status === "skipped" ? [] : [completion];
    });
    const completedCount = expectedCells.filter((record) => record?.status === "completed").length;
    const hasCheckIn = visibleHabits.some((habit) => completionByKey.has(key(habit.id, date)));
    return {
      date,
      dayNumber: Number(date.slice(-2)),
      isInMonth: date >= monthStart && date <= monthEnd,
      isToday: date === localDate,
      isFuture: date > localDate,
      completedCount,
      expectedCount: expectedCells.length,
      completionPercentage: expectedCells.length === 0
        ? 0
        : Math.round((completedCount / expectedCells.length) * 100),
      hasCheckIn,
    };
  });

  const expectedCount = rows.reduce((sum, row) => sum + row.expectedCount, 0);
  const completedCount = rows.reduce((sum, row) => sum + row.completedCount, 0);
  const monthRecords = completions.filter((record) =>
    record.date >= monthStart && record.date <= monthEnd &&
    (!selectedHabitId || record.habitId === selectedHabitId)
  );

  return {
    monthStart,
    monthEnd,
    monthLabel: displayDate(monthStart).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    monthDates,
    calendarDays,
    rows,
    completionPercentage: expectedCount === 0 ? 0 : Math.round((completedCount / expectedCount) * 100),
    completedCount,
    expectedCount,
    totalCheckIns: monthRecords.filter((record) => record.status === "completed").length,
    missedCount: monthRecords.filter((record) => record.status === "missed").length,
    skippedCount: monthRecords.filter((record) => record.status === "skipped").length,
  };
}
