import { describe, expect, it } from "vitest";
import { plantStageForStreak, plantStageLabel } from "./AnimatedPlant";

describe("animated plant growth", () => {
  it("maps streaks across five stable growth stages", () => {
    expect([
      plantStageForStreak(0),
      plantStageForStreak(1),
      plantStageForStreak(3),
      plantStageForStreak(7),
      plantStageForStreak(14),
    ]).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps soil for broken or not-yet-started streaks", () => {
    expect(plantStageForStreak(-2)).toBe(0);
    expect(plantStageLabel(0)).toBe("Planted");
    expect(plantStageLabel(4)).toBe("Flourishing");
  });
});
