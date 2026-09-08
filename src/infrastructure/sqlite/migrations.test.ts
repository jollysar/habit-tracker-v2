import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const migrationDirectory = fileURLToPath(
  new URL("../../../src-tauri/migrations/", import.meta.url),
);

const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort();

const databases: DatabaseSync[] = [];

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  databases.push(database);
  return database;
}

function applyMigrations(database: DatabaseSync, files = migrationFiles) {
  for (const file of files) {
    database.exec(readFileSync(`${migrationDirectory}/${file}`, "utf8"));
  }
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe("SQLite migrations", () => {
  it("builds the complete schema from a fresh database", () => {
    const database = createDatabase();
    applyMigrations(database);

    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => String(row.name));

    expect(tables).toEqual(expect.arrayContaining([
      "categories",
      "completions",
      "habit_progress",
      "habit_schedules",
      "habits",
      "reminders",
      "settings",
    ]));
    expect(database.prepare("SELECT COUNT(*) AS count FROM categories").get()?.count).toBe(4);

    database.exec(`
      INSERT INTO habits (id, name, type, start_date, plant_type)
      VALUES ('fresh-habit', 'Fresh habit', 'binary', '2026-09-08', 'pine')
    `);

    expect(database.prepare(
      "SELECT schedule_type FROM habit_schedules WHERE habit_id = ?",
    ).get("fresh-habit")?.schedule_type).toBe("daily");
    expect(() => database.exec(`
      INSERT INTO habits (id, name, type, start_date, plant_type)
      VALUES ('invalid-plant', 'Invalid plant', 'binary', '2026-09-08', 'palm')
    `)).toThrow();
  });

  it("upgrades an existing version 6 database without losing habit data", () => {
    const database = createDatabase();
    applyMigrations(database, migrationFiles.slice(0, 6));

    database.exec(`
      INSERT INTO habits (id, name, description, type, start_date, sort_order)
      VALUES ('existing-habit', 'Existing habit', 'Keep this history', 'binary', '2026-08-01', 7)
    `);
    database.exec(`
      INSERT INTO completions (id, habit_id, date, status)
      VALUES ('existing-completion', 'existing-habit', '2026-09-07', 'completed')
    `);

    applyMigrations(database, migrationFiles.slice(6));

    expect(database.prepare(`
      SELECT name, description, sort_order, plant_type
      FROM habits WHERE id = 'existing-habit'
    `).get()).toMatchObject({
      name: "Existing habit",
      description: "Keep this history",
      sort_order: 7,
      plant_type: "oak",
    });
    expect(database.prepare(
      "SELECT status FROM completions WHERE habit_id = 'existing-habit'",
    ).get()?.status).toBe("completed");
  });
});
