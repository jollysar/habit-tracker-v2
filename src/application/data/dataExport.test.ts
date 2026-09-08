import { describe, expect, it } from "vitest";
import type { ManagedHabit } from "../../domain/habits/models";
import { buildDataExport, serializeCsvExport, serializeJsonExport } from "./dataExport";

const habit: ManagedHabit = {
  id: "read",
  name: "Read, reflect & learn",
  type: "quantity",
  status: "incomplete",
  timeOfDay: "evening",
  streak: 0,
  targetValue: 20,
  targetUnit: "pages",
  startDate: "2026-09-01",
  isArchived: false,
  sortOrder: 0,
  schedule: { type: "daily", effectiveFrom: "2026-09-01" },
};

const data = buildDataExport({
  settings: { theme: "dark" },
  categories: [],
  habits: [habit],
  schedules: [{ habitId: habit.id, ...habit.schedule }],
  completions: [{ habitId: habit.id, date: "2026-09-03", status: "completed", value: 20 }],
  progress: [{ habitId: habit.id, date: "2026-09-03", value: 20 }],
}, "2026-09-04T00:00:00.000Z");

describe("data export", () => {
  it("creates a versioned, portable JSON export", () => {
    const parsed = JSON.parse(serializeJsonExport(data));
    expect(parsed.format).toBe("habit-tracker-export");
    expect(parsed.version).toBe(1);
    expect(parsed.habits[0].id).toBe("read");
    expect(parsed.progress[0].value).toBe(20);
  });

  it("escapes CSV labels and includes the historical schedule", () => {
    const csv = serializeCsvExport(data);
    expect(csv).toContain('"Read, reflect & learn"');
    expect(csv).toContain("daily,2026-09-03,completed,20,20,pages");
  });
});
