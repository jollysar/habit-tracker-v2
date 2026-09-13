import { forwardRef } from "react";
import type { PlantType } from "../../domain/habits/models";
import { cn } from "../../lib/cn";
import { AnimatedPlant, plantStageForStreak, plantStageLabel } from "./AnimatedPlant";

interface HabitStreakButtonProps {
  readonly habitName: string;
  readonly plantType?: PlantType;
  readonly streak: number;
  readonly cadence: "day" | "week";
  readonly menuOpen: boolean;
  readonly menuId?: string;
  readonly className?: string;
  readonly onClick: () => void;
}

export const HabitStreakButton = forwardRef<HTMLButtonElement, HabitStreakButtonProps>(
  function HabitStreakButton({
    habitName,
    plantType = "oak",
    streak,
    cadence,
    menuOpen,
    menuId,
    className,
    onClick,
  }, ref) {
    const unit = streak === 1 ? cadence : `${cadence}s`;
    const growthLabel = plantStageLabel(plantStageForStreak(streak));

    return (
      <button
        ref={ref}
        className={cn(
          "flex h-11 shrink-0 items-end gap-0.5 rounded-lg px-1 text-ink-600 transition hover:bg-leaf-50 hover:text-ink-950 focus:outline-none focus:ring-2 focus:ring-leaf-500",
          className,
        )}
        type="button"
        aria-label={`${habitName}: ${streak} ${unit} streak, ${growthLabel.toLowerCase()} ${plantType} tree. Open habit actions`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuOpen ? menuId : undefined}
        title={`${streak} ${unit} streak`}
        onClick={onClick}
      >
        <AnimatedPlant plantType={plantType} streak={streak} size={37} />
        <span className="mb-[3px] min-w-3 text-center text-xs font-bold leading-none tabular-nums" aria-hidden="true">{streak}</span>
      </button>
    );
  },
);
