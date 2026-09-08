export type WeeklyProgressOverrides = Readonly<Record<string, number>>;

const SETTING_PREFIX = "weekly_progress:";

export function weeklyProgressKey(habitId: string, weekStart: string): string {
  return `${habitId}:${weekStart}`;
}

export function weeklyProgressSettingKey(habitId: string, weekStart: string): string {
  return `${SETTING_PREFIX}${weeklyProgressKey(habitId, weekStart)}`;
}

export function weeklyProgressFromSettings(
  settings: Readonly<Record<string, string>>,
): WeeklyProgressOverrides {
  const entries = Object.entries(settings).flatMap(([key, rawValue]) => {
    if (!key.startsWith(SETTING_PREFIX)) return [];
    const value = Number(rawValue);
    return Number.isFinite(value) && value >= 0
      ? [[key.slice(SETTING_PREFIX.length), value] as const]
      : [];
  });
  return Object.fromEntries(entries);
}
