import { scheduleForHabitDate } from "../week/buildWeekDashboard";
import type {
  CompletionRecord,
  HabitCategory,
  HabitProgressRecord,
  HabitScheduleRecord,
  ManagedHabit,
} from "../../domain/habits/models";

export interface HabitTrackerExport {
  readonly format: "habit-tracker-export";
  readonly version: 1;
  readonly exportedAt: string;
  readonly settings: Readonly<Record<string, string>>;
  readonly categories: readonly HabitCategory[];
  readonly habits: readonly ManagedHabit[];
  readonly schedules: readonly HabitScheduleRecord[];
  readonly completions: readonly CompletionRecord[];
  readonly progress: readonly HabitProgressRecord[];
}

interface ExportSource {
  readonly settings: Readonly<Record<string, string>>;
  readonly categories: readonly HabitCategory[];
  readonly habits: readonly ManagedHabit[];
  readonly schedules: readonly HabitScheduleRecord[];
  readonly completions: readonly CompletionRecord[];
  readonly progress: readonly HabitProgressRecord[];
}

export function buildDataExport(
  source: ExportSource,
  exportedAt = new Date().toISOString(),
): HabitTrackerExport {
  return {
    format: "habit-tracker-export",
    version: 1,
    exportedAt,
    ...source,
  };
}

export function serializeJsonExport(data: HabitTrackerExport): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function csvValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeCsvExport(data: HabitTrackerExport): string {
  const header = [
    "habit_id",
    "habit_name",
    "category",
    "habit_type",
    "time_of_day",
    "schedule_type",
    "date",
    "status",
    "value",
    "target_value",
    "target_unit",
  ];
  const rows = data.completions.map((completion) => {
    const habit = data.habits.find((candidate) => candidate.id === completion.habitId);
    const schedule = habit
      ? scheduleForHabitDate(habit, data.schedules, completion.date)
      : undefined;
    return [
      completion.habitId,
      habit?.name,
      habit?.categoryName,
      habit?.type,
      habit?.timeOfDay,
      schedule?.type,
      completion.date,
      completion.status,
      completion.value,
      schedule?.targetValue ?? habit?.targetValue,
      schedule?.targetUnit ?? habit?.targetUnit,
    ];
  });
  return [header, ...rows]
    .map((row) => row.map(csvValue).join(","))
    .join("\n") + "\n";
}
