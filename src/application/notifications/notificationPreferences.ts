import type { NotificationPreferences } from "../../domain/habits/models";

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: false,
  dailyBriefing: true,
  dailyBriefingTime: "08:00",
  endOfDay: true,
  weeklyProgress: true,
  weeklySummary: true,
  freshStart: true,
  inactivityCheckIn: true,
  quietHoursStart: "21:30",
  quietHoursEnd: "08:00",
};

export const NOTIFICATION_SETTINGS_KEY = "notification_preferences";

export function notificationPreferencesFromSettings(
  settings: Readonly<Record<string, string>>,
): NotificationPreferences {
  const stored = settings[NOTIFICATION_SETTINGS_KEY];
  if (!stored) return defaultNotificationPreferences;
  try {
    const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
    return {
      ...defaultNotificationPreferences,
      ...parsed,
      enabled: parsed.enabled === true,
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

export function serializeNotificationPreferences(
  preferences: NotificationPreferences,
): string {
  return JSON.stringify(preferences);
}
