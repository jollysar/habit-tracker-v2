import { describe, expect, it } from "vitest";
import {
  addDaysToLocalDateKey,
  isValidLocalDateKey,
  toLocalDateKey,
} from "./localDate";

describe("local calendar dates", () => {
  it("formats using local calendar fields instead of UTC", () => {
    const date = new Date(2026, 8, 4, 0, 15);
    expect(toLocalDateKey(date)).toBe("2026-09-04");
  });

  it("moves safely across month boundaries", () => {
    expect(addDaysToLocalDateKey("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDaysToLocalDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("rejects malformed date keys", () => {
    expect(() => addDaysToLocalDateKey("04/09/2026", 1)).toThrow(
      "Invalid local date",
    );
  });

  it("detects impossible calendar dates", () => {
    expect(isValidLocalDateKey("2026-02-28")).toBe(true);
    expect(isValidLocalDateKey("2026-02-31")).toBe(false);
  });
});
