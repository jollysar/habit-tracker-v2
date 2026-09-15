import Database from "@tauri-apps/plugin-sql";
import { addDaysToLocalDateKey } from "../../application/dates/localDate";
import type {
  HabitRepository,
  RecordedCompletionStatus,
} from "../../domain/habits/HabitRepository";
import type {
  CompletionStatus,
  CompletionRecord,
  HabitCategory,
  HabitProgressRecord,
  HabitReminder,
  HabitSchedule,
  HabitScheduleRecord,
  HabitType,
  ManagedHabit,
  MissedCompletion,
  PlantType,
  ScheduleType,
  TimeOfDay,
  TodayHabit,
  Weekday,
} from "../../domain/habits/models";

const DATABASE_URL = "sqlite:habit-tracker.db";
const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * The small portion of the Tauri SQL API used by the repository. Keeping this
 * boundary explicit lets the same repository contract run against real SQLite
 * in Node during integration tests, without weakening production types.
 */
export interface HabitDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
}

export type HabitDatabaseLoader = () => Promise<HabitDatabase>;

interface HabitRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: HabitType;
  readonly category_id: string | null;
  readonly category_name: string | null;
  readonly target_value: number | null;
  readonly target_unit: string | null;
  readonly time_of_day: TimeOfDay;
  readonly icon: string | null;
  readonly colour: string | null;
  readonly plant_type: PlantType;
  readonly start_date: string;
  readonly end_date: string | null;
  readonly is_archived: number;
  readonly sort_order: number;
  readonly status: CompletionStatus;
  readonly value: number | null;
  readonly schedule_id: string | null;
  readonly schedule_type: ScheduleType | null;
  readonly days_of_week: string | null;
  readonly target_count: number | null;
  readonly schedule_target_value: number | null;
  readonly schedule_target_unit: string | null;
  readonly effective_from: string | null;
  readonly effective_to: string | null;
}

interface ScheduleRow {
  readonly id: string;
  readonly habit_id?: string;
  readonly schedule_type: ScheduleType;
  readonly days_of_week: string | null;
  readonly target_count: number | null;
  readonly target_value: number | null;
  readonly target_unit: string | null;
  readonly effective_from: string;
  readonly effective_to?: string | null;
}

interface CompletionDateRow {
  readonly habit_id: string;
  readonly date: string;
}

interface CompletionRow {
  readonly id: string;
  readonly habit_id: string;
  readonly date: string;
  readonly status: RecordedCompletionStatus;
  readonly value: number | null;
}

interface ProgressRow {
  readonly habit_id: string;
  readonly date: string;
  readonly value: number;
}

interface ReminderRow {
  readonly habit_id: string;
  readonly enabled: number;
  readonly time: string;
}

interface CountRow {
  readonly count: number;
}

interface SettingRow {
  readonly value: string;
}

interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly sort_order: number;
}

function calculateCalendarStreak(
  completedDates: ReadonlySet<string>,
  localDate: string,
): number {
  let cursor = completedDates.has(localDate)
    ? localDate
    : addDaysToLocalDateKey(localDate, -1);
  let streak = 0;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDaysToLocalDateKey(cursor, -1);
  }

  return streak;
}

function parseWeekdays(value: string | null): readonly Weekday[] | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter(
      (item): item is Weekday =>
        typeof item === "string" && WEEKDAYS.includes(item as Weekday),
    );
  } catch {
    return undefined;
  }
}

function scheduleFromRow(row: HabitRow): HabitSchedule {
  return {
    id: row.schedule_id ?? undefined,
    type: row.schedule_type ?? "daily",
    daysOfWeek: parseWeekdays(row.days_of_week),
    targetCount: row.target_count ?? undefined,
    targetValue: row.schedule_target_value ?? undefined,
    targetUnit: row.schedule_target_unit ?? undefined,
    effectiveFrom: row.effective_from ?? row.start_date,
    effectiveTo: row.effective_to ?? undefined,
  };
}

function mapHabitRow(row: HabitRow, streak = 0): ManagedHabit {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    status: row.status,
    timeOfDay: row.time_of_day,
    streak,
    value: row.value ?? (row.type === "binary" ? undefined : 0),
    targetValue: row.target_value ?? undefined,
    targetUnit: row.target_unit ?? undefined,
    categoryId: row.category_id ?? undefined,
    categoryName: row.category_name ?? undefined,
    icon: row.icon ?? undefined,
    colour: row.colour ?? undefined,
    plantType: row.plant_type ?? "oak",
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    isArchived: row.is_archived === 1,
    sortOrder: row.sort_order,
    schedule: scheduleFromRow(row),
  };
}

function scheduleSignature(schedule: HabitSchedule): string {
  return JSON.stringify({
    type: schedule.type,
    daysOfWeek: [...(schedule.daysOfWeek ?? [])].sort(),
    targetCount: schedule.targetCount ?? null,
    targetValue: schedule.targetValue ?? null,
    targetUnit: schedule.targetUnit ?? null,
  });
}

export class TauriHabitRepository implements HabitRepository {
  private databasePromise: Promise<HabitDatabase> | null = null;

  constructor(
    private readonly loadDatabase: HabitDatabaseLoader = () => Database.load(DATABASE_URL),
  ) {}

  private async database(): Promise<HabitDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = this.loadDatabase().then(async (database) => {
        await database.execute("PRAGMA foreign_keys = ON");
        return database;
      });
    }
    return this.databasePromise;
  }

  async ensureStarterData(
    habits: readonly TodayHabit[],
    localDate: string,
  ): Promise<void> {
    const database = await this.database();
    const initialized = await database.select<SettingRow[]>(
      "SELECT value FROM settings WHERE key = $1",
      ["starter_data_initialized"],
    );
    if (initialized.length > 0) return;

    const [{ count }] = await database.select<CountRow[]>(
      "SELECT COUNT(*) AS count FROM habits",
    );
    if (count === 0) {
      for (const [index, habit] of habits.entries()) {
        await this.insertHabit(database, habit, localDate, index, true);
        if (habit.status !== "incomplete" && habit.status !== "missed") {
          await this.upsertCheckIn(database, habit, localDate, habit.status);
        }
      }
    }
    await database.execute(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ["starter_data_initialized", "true"],
    );
  }

  async listForDate(localDate: string): Promise<readonly TodayHabit[]> {
    const database = await this.database();
    const rows = await database.select<HabitRow[]>(
      `${this.habitSelect(`COALESCE(c.status, 'incomplete')`, "COALESCE(p.value, c.value)")}
       LEFT JOIN completions c ON c.habit_id = h.id AND c.date = $1
       LEFT JOIN habit_progress p ON p.habit_id = h.id AND p.date = $1
       WHERE h.is_archived = 0
         AND h.start_date <= $1
         AND (h.end_date IS NULL OR h.end_date >= $1)
       ORDER BY h.sort_order ASC, h.created_at ASC`,
      [localDate],
    );

    const completionRows = await database.select<CompletionDateRow[]>(
      `SELECT habit_id, date
       FROM completions
       WHERE status = 'completed' AND date <= $1
       ORDER BY date DESC`,
      [localDate],
    );
    const datesByHabit = new Map<string, Set<string>>();
    for (const completion of completionRows) {
      const dates = datesByHabit.get(completion.habit_id) ?? new Set<string>();
      dates.add(completion.date);
      datesByHabit.set(completion.habit_id, dates);
    }

    return rows.map((row) =>
      mapHabitRow(
        row,
        calculateCalendarStreak(
          datesByHabit.get(row.id) ?? new Set<string>(),
          localDate,
        ),
      ),
    );
  }

  async listAll(): Promise<readonly ManagedHabit[]> {
    const database = await this.database();
    const rows = await database.select<HabitRow[]>(
      `${this.habitSelect("'incomplete'", "NULL")}
       ORDER BY h.is_archived ASC, h.sort_order ASC, h.created_at ASC`,
    );
    return rows.map((row) => mapHabitRow(row));
  }

  async listCategories(): Promise<readonly HabitCategory[]> {
    const database = await this.database();
    const rows = await database.select<CategoryRow[]>(
      "SELECT id, name, icon, sort_order FROM categories ORDER BY sort_order, name",
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon ?? undefined,
      sortOrder: row.sort_order,
    }));
  }

  async listSchedules(): Promise<readonly HabitScheduleRecord[]> {
    const database = await this.database();
    const rows = await database.select<ScheduleRow[]>(
      `SELECT id, habit_id, schedule_type, days_of_week, target_count,
              target_value, target_unit, effective_from, effective_to
       FROM habit_schedules
       ORDER BY habit_id, effective_from, created_at`,
    );
    return rows.map((row) => ({
      id: row.id,
      habitId: row.habit_id ?? "",
      type: row.schedule_type,
      daysOfWeek: parseWeekdays(row.days_of_week),
      targetCount: row.target_count ?? undefined,
      targetValue: row.target_value ?? undefined,
      targetUnit: row.target_unit ?? undefined,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to ?? undefined,
    }));
  }

  async listReminders(): Promise<readonly HabitReminder[]> {
    const database = await this.database();
    const rows = await database.select<ReminderRow[]>(
      `SELECT habit_id, enabled, time
       FROM reminders
       ORDER BY created_at ASC`,
    );
    return rows.map((row) => ({
      habitId: row.habit_id,
      enabled: row.enabled === 1,
      time: row.time,
    }));
  }

  async setHabitReminder(
    habitId: string,
    reminder: Omit<HabitReminder, "habitId"> | null,
  ): Promise<void> {
    const database = await this.database();
    if (!reminder) {
      await database.execute("DELETE FROM reminders WHERE habit_id = $1", [habitId]);
      return;
    }
    await database.execute(
      `INSERT INTO reminders (id, habit_id, enabled, time, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT(habit_id) DO UPDATE SET
         enabled = excluded.enabled,
         time = excluded.time,
         updated_at = CURRENT_TIMESTAMP`,
      [crypto.randomUUID(), habitId, reminder.enabled ? 1 : 0, reminder.time],
    );
  }

  async listSettings(): Promise<Readonly<Record<string, string>>> {
    const database = await this.database();
    const rows = await database.select<Array<{ key: string; value: string }>>(
      "SELECT key, value FROM settings ORDER BY key",
    );
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async setSetting(key: string, value: string): Promise<void> {
    const database = await this.database();
    await database.execute(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value],
    );
  }

  async listCompletions(
    fromLocalDate: string,
    throughLocalDate: string,
  ): Promise<readonly CompletionRecord[]> {
    const database = await this.database();
    const rows = await database.select<CompletionRow[]>(
      `SELECT id, habit_id, date, status, value
       FROM completions
       WHERE date >= $1 AND date <= $2
       ORDER BY date ASC, created_at ASC`,
      [fromLocalDate, throughLocalDate],
    );
    return rows.map((row) => ({
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      status: row.status,
      value: row.value ?? undefined,
    }));
  }

  async listProgress(
    fromLocalDate: string,
    throughLocalDate: string,
  ): Promise<readonly HabitProgressRecord[]> {
    const database = await this.database();
    const rows = await database.select<ProgressRow[]>(
      `SELECT habit_id, date, value
       FROM habit_progress
       WHERE date >= $1 AND date <= $2
       ORDER BY date ASC, created_at ASC`,
      [fromLocalDate, throughLocalDate],
    );
    return rows.map((row) => ({
      habitId: row.habit_id,
      date: row.date,
      value: row.value,
    }));
  }

  async createHabit(habit: ManagedHabit, localDate: string): Promise<void> {
    const database = await this.database();
    const [{ count }] = await database.select<CountRow[]>(
      "SELECT COUNT(*) AS count FROM habits WHERE is_archived = 0",
    );
    await this.insertHabit(database, habit, localDate, count);
    await this.updateSchedule(database, habit.id, habit.schedule, habit.startDate);
  }

  async updateHabit(habit: ManagedHabit, localDate: string): Promise<void> {
    const database = await this.database();
    await database.execute(
      `UPDATE habits
       SET name = $1,
           description = $2,
           type = $3,
           category_id = $4,
           target_value = $5,
           target_unit = $6,
           time_of_day = $7,
           icon = $8,
           colour = $9,
           plant_type = $10,
           start_date = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND is_archived = 0`,
      [
        habit.name,
        habit.description ?? null,
        habit.type,
        habit.categoryId ?? null,
        habit.targetValue ?? null,
        habit.targetUnit ?? null,
        habit.timeOfDay,
        habit.icon ?? null,
        habit.colour ?? null,
        habit.plantType ?? "oak",
        habit.startDate,
        habit.id,
      ],
    );
    await this.updateSchedule(database, habit.id, habit.schedule, localDate);
  }

  async archiveHabit(habitId: string, localDate: string): Promise<void> {
    const database = await this.database();
    await database.execute(
      `UPDATE habits
       SET is_archived = 1,
           end_date = COALESCE(
             end_date,
             CASE WHEN start_date > $1 THEN start_date ELSE $1 END
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [localDate, habitId],
    );
  }

  async restoreHabit(habitId: string): Promise<void> {
    const database = await this.database();
    await database.execute(
      `UPDATE habits
       SET is_archived = 0,
           end_date = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [habitId],
    );
  }

  async reorderHabits(orderedHabitIds: readonly string[]): Promise<void> {
    if (orderedHabitIds.length === 0) return;
    const database = await this.database();
    const cases = orderedHabitIds
      .map((_, index) => `WHEN $${index + 1} THEN ${index}`)
      .join(" ");
    const placeholders = orderedHabitIds
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    await database.execute(
      `UPDATE habits
       SET sort_order = CASE id ${cases} ELSE sort_order END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})`,
      [...orderedHabitIds],
    );
  }

  async recordMissedCompletions(
    completions: readonly MissedCompletion[],
  ): Promise<void> {
    if (completions.length === 0) return;
    const database = await this.database();
    for (const completion of completions) {
      await database.execute(
        `INSERT OR IGNORE INTO completions (id, habit_id, date, status)
         VALUES ($1, $2, $3, 'missed')`,
        [crypto.randomUUID(), completion.habitId, completion.date],
      );
    }
  }

  async setProgress(
    habitId: string,
    localDate: string,
    value: number,
  ): Promise<void> {
    const database = await this.database();
    if (value <= 0) {
      await database.execute(
        "DELETE FROM habit_progress WHERE habit_id = $1 AND date = $2",
        [habitId, localDate],
      );
      return;
    }
    await this.upsertProgress(database, habitId, localDate, value);
  }

  async clearCompletionStatus(habitId: string, localDate: string): Promise<void> {
    const database = await this.database();
    await database.execute(
      "DELETE FROM completions WHERE habit_id = $1 AND date = $2",
      [habitId, localDate],
    );
  }

  async setCheckIn(
    habit: TodayHabit,
    localDate: string,
    status: RecordedCompletionStatus,
  ): Promise<void> {
    const database = await this.database();
    await this.upsertCheckIn(database, habit, localDate, status);
    if (status !== "completed") {
      await database.execute(
        "DELETE FROM habit_progress WHERE habit_id = $1 AND date = $2",
        [habit.id, localDate],
      );
    }
  }

  async clearCheckIn(habitId: string, localDate: string): Promise<void> {
    const database = await this.database();
    await database.execute(
      "DELETE FROM completions WHERE habit_id = $1 AND date = $2",
      [habitId, localDate],
    );
    await database.execute(
      "DELETE FROM habit_progress WHERE habit_id = $1 AND date = $2",
      [habitId, localDate],
    );
  }

  async prepareBackup(): Promise<void> {
    const database = await this.database();
    await database.select("PRAGMA wal_checkpoint(FULL)");
  }

  private habitSelect(statusExpression: string, valueExpression: string): string {
    return `SELECT
      h.id,
      h.name,
      h.description,
      h.type,
      h.category_id,
      category.name AS category_name,
      h.target_value,
      h.target_unit,
      h.time_of_day,
      h.icon,
      h.colour,
      h.plant_type,
      h.start_date,
      h.end_date,
      h.is_archived,
      h.sort_order,
      ${statusExpression} AS status,
      ${valueExpression} AS value,
      schedule.id AS schedule_id,
      schedule.schedule_type,
      schedule.days_of_week,
      schedule.target_count,
      schedule.target_value AS schedule_target_value,
      schedule.target_unit AS schedule_target_unit,
      schedule.effective_from,
      schedule.effective_to
    FROM habits h
    LEFT JOIN categories category ON category.id = h.category_id
    LEFT JOIN habit_schedules schedule ON schedule.id = (
      SELECT candidate.id
      FROM habit_schedules candidate
      WHERE candidate.habit_id = h.id
      ORDER BY
        CASE WHEN candidate.effective_to IS NULL THEN 0 ELSE 1 END,
        candidate.effective_from DESC,
        candidate.created_at DESC
      LIMIT 1
    )`;
  }

  private async insertHabit(
    database: HabitDatabase,
    habit: TodayHabit,
    localDate: string,
    sortOrder: number,
    ignoreConflict = false,
  ): Promise<void> {
    await database.execute(
      `${ignoreConflict ? "INSERT OR IGNORE" : "INSERT"} INTO habits (
         id, name, description, type, category_id, target_value, target_unit,
         time_of_day, icon, colour, plant_type, start_date, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        habit.id,
        habit.name,
        habit.description ?? null,
        habit.type,
        habit.categoryId ?? null,
        habit.targetValue ?? null,
        habit.targetUnit ?? null,
        habit.timeOfDay,
        habit.icon ?? null,
        habit.colour ?? null,
        habit.plantType ?? "oak",
        habit.startDate ?? localDate,
        sortOrder,
      ],
    );
  }

  private async updateSchedule(
    database: HabitDatabase,
    habitId: string,
    schedule: HabitSchedule,
    localDate: string,
  ): Promise<void> {
    const [current] = await database.select<ScheduleRow[]>(
      `SELECT id, schedule_type, days_of_week, target_count, target_value,
              target_unit, effective_from
       FROM habit_schedules
       WHERE habit_id = $1 AND effective_to IS NULL
       ORDER BY effective_from DESC, created_at DESC
       LIMIT 1`,
      [habitId],
    );
    const currentSchedule: HabitSchedule | undefined = current
      ? {
          id: current.id,
          type: current.schedule_type,
          daysOfWeek: parseWeekdays(current.days_of_week),
          targetCount: current.target_count ?? undefined,
          targetValue: current.target_value ?? undefined,
          targetUnit: current.target_unit ?? undefined,
          effectiveFrom: current.effective_from,
        }
      : undefined;
    if (currentSchedule && scheduleSignature(currentSchedule) === scheduleSignature(schedule)) {
      return;
    }

    if (current && current.effective_from === localDate) {
      await database.execute(
        `UPDATE habit_schedules
         SET schedule_type = $1,
             frequency = $2,
             days_of_week = $3,
             target_count = $4,
             target_value = $5,
             target_unit = $6
         WHERE id = $7`,
        this.scheduleValues(schedule, current.id),
      );
      return;
    }

    await database.execute(
      `INSERT INTO habit_schedules (
         id, habit_id, schedule_type, frequency, days_of_week,
         target_count, target_value, target_unit, effective_from
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        habitId,
        schedule.type,
        schedule.type === "daily" ? 1 : null,
        schedule.daysOfWeek ? JSON.stringify(schedule.daysOfWeek) : null,
        schedule.targetCount ?? null,
        schedule.targetValue ?? null,
        schedule.targetUnit ?? null,
        localDate,
      ],
    );
  }

  private scheduleValues(schedule: HabitSchedule, scheduleId: string): unknown[] {
    return [
      schedule.type,
      schedule.type === "daily" ? 1 : null,
      schedule.daysOfWeek ? JSON.stringify(schedule.daysOfWeek) : null,
      schedule.targetCount ?? null,
      schedule.targetValue ?? null,
      schedule.targetUnit ?? null,
      scheduleId,
    ];
  }

  private async upsertCheckIn(
    database: HabitDatabase,
    habit: TodayHabit,
    localDate: string,
    status: RecordedCompletionStatus,
  ): Promise<void> {
    await database.execute(
      `INSERT INTO completions (
         id, habit_id, date, status, value,
         target_value_snapshot, target_unit_snapshot
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         status = excluded.status,
         value = excluded.value,
         target_value_snapshot = excluded.target_value_snapshot,
         target_unit_snapshot = excluded.target_unit_snapshot,
         updated_at = CURRENT_TIMESTAMP`,
      [
        crypto.randomUUID(),
        habit.id,
        localDate,
        status,
        habit.value ?? null,
        habit.targetValue ?? null,
        habit.targetUnit ?? null,
      ],
    );
    if (status === "completed" && habit.type !== "binary" && habit.value !== undefined) {
      await this.upsertProgress(database, habit.id, localDate, habit.value);
    }
  }

  private async upsertProgress(
    database: HabitDatabase,
    habitId: string,
    localDate: string,
    value: number,
  ): Promise<void> {
    await database.execute(
      `INSERT INTO habit_progress (id, habit_id, date, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
      [crypto.randomUUID(), habitId, localDate, value],
    );
  }
}
