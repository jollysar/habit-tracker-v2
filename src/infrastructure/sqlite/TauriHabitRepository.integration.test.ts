import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ManagedHabit } from "../../domain/habits/models";
import {
  TauriHabitRepository,
  type HabitDatabase,
} from "./TauriHabitRepository";

const migrationDirectory = fileURLToPath(
  new URL("../../../src-tauri/migrations/", import.meta.url),
);
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort();

function normalizeParameters(query: string): string {
  return query.replace(/\$(\d+)/g, "?$1");
}

class NodeSqliteAdapter implements HabitDatabase {
  constructor(private readonly database: DatabaseSync) {}

  async execute(query: string, bindValues: unknown[] = []): Promise<void> {
    this.database
      .prepare(normalizeParameters(query))
      .run(...(bindValues as SQLInputValue[]));
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    return this.database
      .prepare(normalizeParameters(query))
      .all(...(bindValues as SQLInputValue[])) as T;
  }
}

function habit(
  id: string,
  overrides: Partial<ManagedHabit> = {},
): ManagedHabit {
  return {
    id,
    name: `Habit ${id}`,
    type: "binary",
    status: "incomplete",
    timeOfDay: "anytime",
    streak: 0,
    plantType: "oak",
    startDate: "2026-09-01",
    isArchived: false,
    sortOrder: 0,
    schedule: {
      type: "daily",
      effectiveFrom: "2026-09-01",
    },
    ...overrides,
  };
}

describe("TauriHabitRepository with SQLite", () => {
  let database: DatabaseSync;
  let repository: TauriHabitRepository;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec("PRAGMA foreign_keys = ON");
    for (const file of migrationFiles) {
      database.exec(readFileSync(`${migrationDirectory}/${file}`, "utf8"));
    }
    const adapter = new NodeSqliteAdapter(database);
    repository = new TauriHabitRepository(async () => adapter);
  });

  afterEach(() => database.close());

  it("creates, updates, orders, archives, and restores habits without losing history", async () => {
    await repository.createHabit(habit("water", {
      name: "Drink water",
      type: "quantity",
      targetValue: 2.5,
      targetUnit: "L",
      categoryId: "health",
      plantType: "pine",
    }), "2026-09-01");
    await repository.createHabit(habit("journal", {
      name: "Journal",
      sortOrder: 1,
      schedule: {
        type: "specific_days",
        daysOfWeek: ["mon", "wed", "fri"],
        effectiveFrom: "2026-09-01",
      },
    }), "2026-09-01");

    expect((await repository.listAll()).map(({ id }) => id)).toEqual(["water", "journal"]);
    expect(await repository.listForDate("2026-09-01")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "water",
        categoryName: "Health",
        plantType: "pine",
        targetValue: 2.5,
      }),
    ]));

    const updated = habit("water", {
      name: "Hydrate",
      type: "quantity",
      targetValue: 3,
      targetUnit: "L",
      categoryId: "health",
      plantType: "cherry",
      schedule: {
        type: "weekly_target",
        targetValue: 15,
        targetUnit: "L",
        effectiveFrom: "2026-09-08",
      },
    });
    await repository.updateHabit(updated, "2026-09-08");
    const schedules = await repository.listSchedules();

    expect(await repository.listAll()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "water", name: "Hydrate", plantType: "cherry" }),
    ]));
    expect(schedules.filter(({ habitId }) => habitId === "water")).toEqual([
      expect.objectContaining({ type: "daily", effectiveTo: "2026-09-07" }),
      expect.objectContaining({ type: "weekly_target", effectiveFrom: "2026-09-08" }),
    ]);

    await repository.reorderHabits(["journal", "water"]);
    expect((await repository.listAll()).map(({ id }) => id)).toEqual(["journal", "water"]);

    await repository.setCheckIn(updated, "2026-09-08", "completed");
    await repository.archiveHabit("water", "2026-09-09");
    expect((await repository.listForDate("2026-09-09")).map(({ id }) => id)).not.toContain("water");
    expect(await repository.listCompletions("2026-09-01", "2026-09-30"))
      .toEqual([expect.objectContaining({ habitId: "water", status: "completed" })]);

    await repository.restoreHabit("water");
    expect(await repository.listAll()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "water", isArchived: false, endDate: undefined }),
    ]));
  });

  it("persists check-ins, partial progress, streaks, corrections, and missed days", async () => {
    const reading = habit("reading", {
      name: "Read",
      type: "quantity",
      targetValue: 20,
      targetUnit: "pages",
    });
    await repository.createHabit(reading, "2026-09-01");

    await repository.setProgress("reading", "2026-09-01", 8);
    expect(await repository.listProgress("2026-09-01", "2026-09-01"))
      .toEqual([{ habitId: "reading", date: "2026-09-01", value: 8 }]);

    await repository.setCheckIn({ ...reading, value: 20 }, "2026-09-01", "completed");
    await repository.setCheckIn({ ...reading, value: 20 }, "2026-09-02", "completed");
    await repository.setCheckIn({ ...reading, value: 20 }, "2026-09-03", "completed");
    expect(await repository.listForDate("2026-09-03"))
      .toEqual([expect.objectContaining({ id: "reading", status: "completed", value: 20, streak: 3 })]);

    await repository.setCheckIn(reading, "2026-09-03", "skipped");
    expect(await repository.listProgress("2026-09-03", "2026-09-03")).toEqual([]);
    expect(await repository.listForDate("2026-09-03"))
      .toEqual([expect.objectContaining({ status: "skipped", streak: 2 })]);

    await repository.recordMissedCompletions([
      { habitId: "reading", date: "2026-09-04" },
      { habitId: "reading", date: "2026-09-04" },
    ]);
    expect(await repository.listCompletions("2026-09-04", "2026-09-04"))
      .toEqual([expect.objectContaining({ status: "missed" })]);

    await repository.clearCheckIn("reading", "2026-09-03");
    expect(await repository.listCompletions("2026-09-03", "2026-09-03")).toEqual([]);
  });

  it("initializes starter data and settings exactly once", async () => {
    const starter = habit("starter", { name: "Starter habit" });
    await repository.ensureStarterData([starter], "2026-09-01");
    await repository.ensureStarterData([
      habit("unexpected", { name: "Should not be inserted" }),
    ], "2026-09-02");

    expect((await repository.listAll()).map(({ id }) => id)).toEqual(["starter"]);
    expect(await repository.listSettings()).toMatchObject({
      starter_data_initialized: "true",
    });

    await repository.setSetting("week_starts_on", "sun");
    await repository.setSetting("week_starts_on", "mon");
    expect((await repository.listSettings()).week_starts_on).toBe("mon");

    await expect(repository.prepareBackup()).resolves.toBeUndefined();
  });
});
