import { addDaysToLocalDateKey, toLocalDateKey } from "../dates/localDate";
import {
  buildScheduledTodayHabits,
  endOfLocalWeek,
  startOfLocalWeek,
} from "../scheduling/habitScheduling";
import { buildWeekDashboard } from "../week/buildWeekDashboard";
import type { WeeklyProgressOverrides } from "../week/weeklyProgress";
import type {
  CompletionRecord,
  HabitProgressRecord,
  HabitReminder,
  HabitScheduleRecord,
  ManagedHabit,
  NotificationPreferences,
  Weekday,
} from "../../domain/habits/models";

export type NotificationKind =
  | "habit_reminder"
  | "end_of_day"
  | "weekly_progress"
  | "weekly_summary"
  | "daily_briefing"
  | "fresh_start"
  | "inactivity_check_in";

export interface PlannedNotification {
  readonly id: number;
  readonly key: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly at: Date;
  readonly habitId?: string;
  readonly date?: string;
  readonly canComplete?: boolean;
}

interface NotificationPlanInput {
  readonly now: Date;
  readonly habits: readonly ManagedHabit[];
  readonly schedules: readonly HabitScheduleRecord[];
  readonly completions: readonly CompletionRecord[];
  readonly progress: readonly HabitProgressRecord[];
  readonly reminders: readonly HabitReminder[];
  readonly preferences: NotificationPreferences;
  readonly weekStartsOn: Extract<Weekday, "mon" | "sun">;
  readonly weeklyProgress: WeeklyProgressOverrides;
  readonly horizonDays?: number;
}

function stableId(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash & 0x7fffffff;
}

function atLocalTime(date: string, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(`${date}T12:00:00`);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function minutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isQuietTime(time: string, preferences: NotificationPreferences): boolean {
  const value = minutes(time);
  const start = minutes(preferences.quietHoursStart);
  const end = minutes(preferences.quietHoursEnd);
  return start > end
    ? value >= start || value < end
    : value >= start && value < end;
}

function beforeQuietHours(date: string, preferences: NotificationPreferences): Date {
  const result = atLocalTime(date, preferences.quietHoursStart);
  result.setMinutes(result.getMinutes() - 30);
  return result;
}

function safeEveningTime(date: string, preferences: NotificationPreferences): Date {
  const preferred = atLocalTime(date, "18:00");
  const quietStart = minutes(preferences.quietHoursStart);
  const quietEnd = minutes(preferences.quietHoursEnd);
  const preferredMinutes = 18 * 60;
  const quietWraps = quietStart > quietEnd;
  const inQuietHours = quietWraps
    ? preferredMinutes >= quietStart || preferredMinutes < quietEnd
    : preferredMinutes >= quietStart && preferredMinutes < quietEnd;
  return inQuietHours ? beforeQuietHours(date, preferences) : preferred;
}

function formatNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function todayFocus(habits: ReturnType<typeof buildScheduledTodayHabits>): string | undefined {
  return [...habits]
    .filter((habit) => habit.status !== "completed" && habit.status !== "skipped")
    .sort((left, right) => {
      const leftScore = (left.timeOfDay === "morning" ? 0 : 2) + (left.type === "binary" ? 0 : 1);
      const rightScore = (right.timeOfDay === "morning" ? 0 : 2) + (right.type === "binary" ? 0 : 1);
      return leftScore - rightScore || left.name.localeCompare(right.name);
    })[0]?.name;
}

function countPreviousInactiveDays(
  localDate: string,
  completions: readonly CompletionRecord[],
): number {
  const completedDates = new Set(
    completions.filter((item) => item.status === "completed").map((item) => item.date),
  );
  let days = 0;
  let cursor = addDaysToLocalDateKey(localDate, -1);
  while (days < 30 && !completedDates.has(cursor)) {
    days += 1;
    cursor = addDaysToLocalDateKey(cursor, -1);
  }
  return days;
}

function morningMessage(
  date: string,
  input: NotificationPlanInput,
): Omit<PlannedNotification, "id" | "key" | "at"> | undefined {
  const yesterday = addDaysToLocalDateKey(date, -1);
  const yesterdayHabits = buildScheduledTodayHabits(
    input.habits, input.completions, yesterday, input.progress,
    input.weekStartsOn, input.weeklyProgress,
  ).filter((habit) =>
    habit.schedule?.type === "daily" || habit.schedule?.type === "specific_days"
  );
  const todayHabits = buildScheduledTodayHabits(
    input.habits, input.completions, date, input.progress,
    input.weekStartsOn, input.weeklyProgress,
  );
  const focus = todayFocus(todayHabits);
  const completed = yesterdayHabits.filter((habit) => habit.status === "completed").length;
  const missed = yesterdayHabits.filter((habit) => habit.status === "missed").length;
  const inactiveDays = countPreviousInactiveDays(date, input.completions);

  if (input.preferences.inactivityCheckIn && inactiveDays >= 3 && focus) {
    return {
      kind: "inactivity_check_in",
      title: "Your garden is still here",
      body: `No catching up needed. Start gently with ${focus} when you’re ready.`,
      date,
    };
  }
  if (input.preferences.freshStart && missed > 0 && focus) {
    return {
      kind: "fresh_start",
      title: "A fresh start for today",
      body: `Yesterday is complete. ${focus} is a simple place to begin today.`,
      date,
    };
  }
  if (!input.preferences.dailyBriefing) return undefined;

  const yesterdayResult = yesterdayHabits.length === 0
    ? "Yesterday was open"
    : completed === yesterdayHabits.length
      ? `Yesterday: all ${completed} completed`
      : `Yesterday: ${completed} of ${yesterdayHabits.length} completed`;
  return {
    kind: "daily_briefing",
    title: "Today in Habitree",
    body: focus
      ? `${yesterdayResult}. Today, start with ${focus}.`
      : `${yesterdayResult}. Nothing needs your attention right now.`,
    date,
  };
}

function addIfFuture(
  plan: PlannedNotification[],
  now: Date,
  notification: Omit<PlannedNotification, "id">,
): void {
  if (notification.at.getTime() <= now.getTime()) return;
  plan.push({ ...notification, id: stableId(notification.key) });
}

export function buildNotificationPlan(input: NotificationPlanInput): readonly PlannedNotification[] {
  if (!input.preferences.enabled) return [];
  const plan: PlannedNotification[] = [];
  const localDate = toLocalDateKey(input.now);
  const horizonDays = Math.min(14, Math.max(1, input.horizonDays ?? 7));

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = addDaysToLocalDateKey(localDate, offset);
    const scheduled = buildScheduledTodayHabits(
      input.habits, input.completions, date, input.progress,
      input.weekStartsOn, input.weeklyProgress,
    );
    const dueById = new Map(scheduled.map((habit) => [habit.id, habit]));
    const remindersByTime = new Map<string, typeof scheduled>();

    for (const reminder of input.reminders.filter((item) => item.enabled)) {
      const habit = dueById.get(reminder.habitId);
      if (!habit || habit.status === "completed" || habit.status === "skipped") continue;
      const isWeekly = habit.schedule?.type === "weekly_frequency" ||
        habit.schedule?.type === "weekly_target";
      if (isWeekly && date !== startOfLocalWeek(date, input.weekStartsOn)) continue;
      const group = remindersByTime.get(reminder.time) ?? [];
      remindersByTime.set(reminder.time, [...group, habit]);
    }

    for (const [time, dueHabits] of remindersByTime) {
      if (isQuietTime(time, input.preferences)) continue;
      const key = `habit:${date}:${time}:${dueHabits.map((habit) => habit.id).sort().join(",")}`;
      const single = dueHabits.length === 1 ? dueHabits[0] : undefined;
      addIfFuture(plan, input.now, {
        key,
        kind: "habit_reminder",
        title: single ? single.name : `${dueHabits.length} habits are ready`,
        body: single
          ? "Ready when you are. One small check-in keeps it growing."
          : `${formatNames(dueHabits.map((habit) => habit.name))} are waiting when you’re ready.`,
        at: atLocalTime(date, time),
        habitId: single?.id,
        date,
        canComplete: Boolean(single),
      });
    }

    if (offset === 0 && input.preferences.endOfDay) {
      const incompleteDaily = scheduled.filter((habit) =>
        habit.status !== "completed" &&
        habit.status !== "skipped" &&
        habit.schedule?.type !== "weekly_frequency" &&
        habit.schedule?.type !== "weekly_target"
      );
      if (incompleteDaily.length > 0) {
        addIfFuture(plan, input.now, {
          key: `end-of-day:${date}`,
          kind: "end_of_day",
          title: "A gentle end-of-day nudge",
          body: incompleteDaily.length === 1
            ? `${incompleteDaily[0].name} is still open. Complete it, skip it, or leave it for tomorrow.`
            : `${incompleteDaily.length} habits are still open. Even one small check-in counts.`,
          at: beforeQuietHours(date, input.preferences),
          date,
        });
      }
    }
  }

  const todayBriefing = atLocalTime(localDate, input.preferences.dailyBriefingTime);
  const morningDate = todayBriefing.getTime() > input.now.getTime()
    ? localDate
    : addDaysToLocalDateKey(localDate, 1);
  const morning = morningMessage(morningDate, input);
  if (morning) {
    addIfFuture(plan, input.now, {
      ...morning,
      key: `morning:${morningDate}`,
      at: atLocalTime(morningDate, input.preferences.dailyBriefingTime),
    });
  }

  const weekStart = startOfLocalWeek(localDate, input.weekStartsOn);
  const weekEnd = endOfLocalWeek(localDate, input.weekStartsOn);
  const week = buildWeekDashboard(
    input.habits, input.schedules, input.completions, input.progress,
    localDate, localDate, input.weekStartsOn, input.weeklyProgress,
  );
  const weeklyRows = week.habits.filter((row) =>
    row.habit.schedule.type === "weekly_frequency" ||
    row.habit.schedule.type === "weekly_target"
  );
  const progressDate = addDaysToLocalDateKey(weekStart, 3);
  if (input.preferences.weeklyProgress && localDate <= progressDate) {
    const behind = weeklyRows.filter((row) => row.target > 0 && row.completed < row.target * 0.5);
    if (behind.length > 0) {
      addIfFuture(plan, input.now, {
        key: `weekly-progress:${weekStart}`,
        kind: "weekly_progress",
        title: behind.length === 1 ? `${behind[0].habit.name}: ${behind[0].completed} of ${behind[0].target}` : "A midweek garden check",
        body: behind.length === 1
          ? "A small step today keeps this week’s goal within reach."
          : `${behind.length} weekly habits could use a little attention. Choose the easiest one.`,
        at: safeEveningTime(progressDate, input.preferences),
        date: progressDate,
      });
    }
  }

  if (input.preferences.weeklySummary) {
    addIfFuture(plan, input.now, {
      key: `weekly-summary:${weekStart}`,
      kind: "weekly_summary",
      title: "Your week in Habitree",
      body: week.scheduledCount === 0
        ? "A quiet week. Your garden is ready whenever you are."
        : `You completed ${week.completedCount} of ${week.scheduledCount} opportunities. Every check-in helped your garden grow.`,
      at: safeEveningTime(weekEnd, input.preferences),
      date: weekEnd,
    });
  }

  return plan
    .sort((left, right) => left.at.getTime() - right.at.getTime())
    .slice(0, 60);
}
