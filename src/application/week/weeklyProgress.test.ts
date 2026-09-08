import { describe, expect, it } from "vitest";
import {
  weeklyProgressFromSettings,
  weeklyProgressSettingKey,
} from "./weeklyProgress";

describe("weekly progress settings", () => {
  it("round-trips non-destructive weekly totals and ignores unrelated settings", () => {
    const key = weeklyProgressSettingKey("gym", "2026-08-31");
    expect(weeklyProgressFromSettings({
      [key]: "3",
      theme: "dark",
      "weekly_progress:broken": "not-a-number",
    })).toEqual({ "gym:2026-08-31": 3 });
  });
});
