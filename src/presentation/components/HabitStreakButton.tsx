import { forwardRef } from "react";
import type { PlantType } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { AnimatedPlant, plantStageForStreak, plantStageLabel } from "./AnimatedPlant";

interface HabitStreakButtonProps {
  readonly habitName: string;
  readonly plantType?: PlantType;
  readonly streak: number;
  readonly cadence: "day" | "week";
  readonly className?: string;
}

export const HabitStreakButton = forwardRef<HTMLDivElement, HabitStreakButtonProps>(
  function HabitStreakButton({
    habitName,
    plantType = "oak",
    streak,
    cadence,
    className,
  }, ref) {
    const unit = streak === 1 ? cadence : `${cadence}s`;
    const growthLabel = plantStageLabel(plantStageForStreak(streak));

    return (
      <div
        ref={ref}
        className={cn(
          "grid h-10 shrink-0 place-items-center rounded-full px-1 text-ink-600",
          className,
        )}
        role="img"
        aria-label={`${habitName}: ${streak} ${unit} streak, ${growthLabel.toLowerCase()} ${plantType} tree`}
        title={`${streak} ${unit} streak`}
      >
        <span className="flex h-[37px] items-end gap-0.5" aria-hidden="true">
          <AnimatedPlant plantType={plantType} streak={streak} size={37} />
          <span className="mb-[3px] min-w-3 text-center text-xs font-bold leading-none tabular-nums">{streak}</span>
        </span>
      </div>
    );
  },
);
