import { describe, expect, it } from "vitest";
import { moveHabitId } from "./reorderHabitIds";

describe("moveHabitId", () => {
  it("moves a habit to the hovered habit position", () => {
    expect(moveHabitId(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
    expect(moveHabitId(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });

  it("leaves the order unchanged for unknown or identical habits", () => {
    const ids = ["a", "b", "c"];
    expect(moveHabitId(ids, "a", "a")).toBe(ids);
    expect(moveHabitId(ids, "missing", "a")).toBe(ids);
  });
});
