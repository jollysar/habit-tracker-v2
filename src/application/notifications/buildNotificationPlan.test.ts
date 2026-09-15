import { describe, expect, it } from "vitest";
import type {
  CompletionRecord,
  ManagedHabit,
  NotificationPreferences,
} from "../../domain/habits/models";
import { buildNotificationPlan } from "./buildNotificationPlan";
import { defaultNotificationPreferences } from "./notificationPreferences";

function habit(id: string, name: string, overrides: Partial<ManagedHabit> = {}): ManagedHabit {
  return {
    id,
    name,
    type: "binary",
    status: "incomplete",
    timeOfDay: "morning",
    streak: 0,
    startDate: "2026-09-01",
    isArchived: false,
    sortOrder: 0,
    plantType: "oak",
    schedule: { type: "daily", effectiveFrom: "2026-09-01" },
    ...overrides,
  };
}

function preferences(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return {
    ...defaultNotificationPreferences,
    enabled: true,
    weeklyProgress: false,
    weeklySummary: false,
    ...overrides,
  };
}

function plan(
  habits: readonly ManagedHabit[],
  completions: readonly CompletionRecord[] = [],
  overrides: Partial<NotificationPreferences> = {},
) {
  return buildNotificationPlan({
    now: new Date("2026-09-15T07:00:00"),
    habits,
    schedules: habits.map((item) => ({ habitId: item.id, ...item.schedule })),
    completions,
    progress: [],
    reminders: habits.map((item) => ({ habitId: item.id, enabled: true, time: "09:00" })),
    preferences: preferences(overrides),
    weekStartsOn: "mon",
    weeklyProgress: {},
    horizonDays: 1,
  });
}

describe("buildNotificationPlan", () => {
  it("does not plan anything before the user opts in", () => {
    const result = buildNotificationPlan({
      now: new Date("2026-09-15T07:00:00"),
      habits: [habit("water", "Drink water")],
      schedules: [],
      completions: [],
      progress: [],
      reminders: [],
      preferences: defaultNotificationPreferences,
      weekStartsOn: "mon",
      weeklyProgress: {},
    });
    expect(result).toEqual([]);
  });

  it("groups reminders at the same time and omits completed habits", () => {
    const habits = [habit("water", "Drink water"), habit("read", "Read")];
    const grouped = plan(habits, [], { dailyBriefing: false, endOfDay: false });
    expect(grouped).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "habit_reminder",
        title: "2 habits are ready",
        canComplete: false,
      }),
    ]));

    const completed: CompletionRecord[] = [{
      habitId: "water",
      date: "2026-09-15",
      status: "completed",
    }];
    const single = plan(habits, completed, { dailyBriefing: false, endOfDay: false });
    expect(single).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "habit_reminder",
        title: "Read",
        habitId: "read",
        canComplete: true,
      }),
    ]));
  });

  it("summarizes yesterday and chooses a low-friction morning habit for today", () => {
    const habits = [
      habit("water", "Drink water", { type: "quantity", targetValue: 2, targetUnit: "L" }),
      habit("journal", "Journal"),
    ];
    const result = plan(habits, [{
      habitId: "water",
      date: "2026-09-14",
      status: "completed",
    }], { endOfDay: false, freshStart: false, inactivityCheckIn: false });
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "daily_briefing",
        body: "Yesterday: 1 of 2 completed. Today, start with Journal.",
      }),
    ]));
  });

  it("uses a neutral fresh-start message after a missed day", () => {
    const result = plan([habit("journal", "Journal")], [{
      habitId: "journal",
      date: "2026-09-14",
      status: "missed",
    }], { endOfDay: false, inactivityCheckIn: false });
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "fresh_start",
        title: "A fresh start for today",
      }),
    ]));
  });

  it("schedules the end-of-day nudge shortly before quiet hours", () => {
    const result = plan([habit("journal", "Journal")], [], {
      dailyBriefing: false,
      freshStart: false,
      inactivityCheckIn: false,
      quietHoursStart: "22:00",
    });
    const endOfDay = result.find((item) => item.kind === "end_of_day");
    expect(endOfDay?.at.getHours()).toBe(21);
    expect(endOfDay?.at.getMinutes()).toBe(30);
  });

  it("does not schedule habit reminders during quiet hours", () => {
    const result = plan([habit("journal", "Journal")], [], {
      dailyBriefing: false,
      endOfDay: false,
      freshStart: false,
      inactivityCheckIn: false,
      quietHoursStart: "08:30",
      quietHoursEnd: "10:00",
    });
    expect(result.filter((item) => item.kind === "habit_reminder")).toEqual([]);
  });
});
