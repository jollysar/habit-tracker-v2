import { describe, expect, it } from "vitest";
import { habitRowSwipeAction } from "./useHabitRowGestures";

describe("habitRowSwipeAction", () => {
  it("reveals delete after a deliberate left swipe", () => {
    expect(habitRowSwipeAction({ x: 100, y: 30 }, { x: 30, y: 34 })).toBe("reveal-delete");
  });

  it("closes delete after a deliberate right swipe", () => {
    expect(habitRowSwipeAction({ x: 20, y: 30 }, { x: 90, y: 34 })).toBe("close-delete");
  });

  it("ignores short or mostly vertical movement", () => {
    expect(habitRowSwipeAction({ x: 20, y: 20 }, { x: 60, y: 22 })).toBeUndefined();
    expect(habitRowSwipeAction({ x: 20, y: 20 }, { x: 85, y: 100 })).toBeUndefined();
  });
});
