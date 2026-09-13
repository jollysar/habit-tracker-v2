import { describe, expect, it } from "vitest";
import { horizontalSwipeDirection, shouldHandleDateSwipe } from "./useHorizontalDateSwipe";

describe("horizontalSwipeDirection", () => {
  it("maps deliberate horizontal gestures to date directions", () => {
    expect(horizontalSwipeDirection({ x: 20, y: 100 }, { x: 100, y: 106 })).toBe("previous");
    expect(horizontalSwipeDirection({ x: 120, y: 100 }, { x: 40, y: 94 })).toBe("next");
  });

  it("ignores short or mostly vertical gestures", () => {
    expect(horizontalSwipeDirection({ x: 20, y: 100 }, { x: 60, y: 102 })).toBeUndefined();
    expect(horizontalSwipeDirection({ x: 20, y: 100 }, { x: 90, y: 180 })).toBeUndefined();
  });

  it("reserves a habit-row left swipe for delete but allows right swipe date navigation", () => {
    expect(shouldHandleDateSwipe("next", true)).toBe(false);
    expect(shouldHandleDateSwipe("previous", true)).toBe(true);
    expect(shouldHandleDateSwipe("next", false)).toBe(true);
  });
});
