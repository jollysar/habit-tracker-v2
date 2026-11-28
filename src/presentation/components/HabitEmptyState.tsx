import { useState } from "react";
import { Plus } from "lucide-react";
import { AnimatedPlant } from "./AnimatedPlant";
import { Button } from "./ui/Button";

interface HabitEmptyStateProps {
  readonly onAddHabit: () => void;
}

export function HabitEmptyState({ onAddHabit }: HabitEmptyStateProps) {
  const [animationKey, setAnimationKey] = useState(0);

  return (
    <div className="habit-empty-state text-center">
      <button
        className="habit-empty-scene"
        type="button"
        onClick={() => setAnimationKey((key) => key + 1)}
        aria-label="Replay the squirrel animation"
      >
        <AnimatedPlant plantType="oak" stage={4} size={224} className="habit-empty-tree" />
        <span key={`squirrel-${animationKey}`} className="habit-empty-squirrel" aria-hidden="true">
          <span className="habit-empty-squirrel-head" />
          <span className="habit-empty-squirrel-ear habit-empty-squirrel-ear-left" />
          <span className="habit-empty-squirrel-ear habit-empty-squirrel-ear-right" />
          <span className="habit-empty-squirrel-eye" />
          <span className="habit-empty-squirrel-nose" />
        </span>
        <span key={`acorn-${animationKey}`} className="habit-empty-acorn" aria-hidden="true" />
        <span className="habit-empty-foreground-leaf" aria-hidden="true" />
      </button>

      <h2 className="text-[1.3rem] font-semibold tracking-[-0.025em] text-ink-950">
        Grow your first habit today
      </h2>
      <Button className="h-12 px-5 text-[0.95rem]" onClick={onAddHabit}>
        <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
        Add first habit
      </Button>
    </div>
  );
}
