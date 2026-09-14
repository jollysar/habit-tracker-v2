import { useEffect, useRef, useState } from "react";

interface ProgressRingProps {
  readonly percentage: number;
  readonly compact?: boolean;
  readonly minimal?: boolean;
}

export function ProgressRing({ percentage, compact = false, minimal = false }: ProgressRingProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const previousPercentage = useRef(percentage);
  const [poweringUp, setPoweringUp] = useState(false);

  useEffect(() => {
    const increased = percentage > previousPercentage.current;
    previousPercentage.current = percentage;
    if (!increased) return;

    setPoweringUp(false);
    const frame = window.requestAnimationFrame(() => setPoweringUp(true));
    const timer = window.setTimeout(() => setPoweringUp(false), 620);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [percentage]);

  return (
    <div
      className={`relative grid shrink-0 place-items-center ${poweringUp ? "progress-ring-power" : ""} ${minimal ? "size-10" : compact ? "size-24" : "size-28"}`}
      role="progressbar"
      aria-label="Completion progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-valuetext={`${percentage}% complete`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
          className="progress-ring-value"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-leaf-500)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {!minimal && (
        <div className="text-center">
          <strong className={`block font-bold tracking-[-0.04em] ${compact ? "text-xl" : "text-2xl"}`}>{percentage}%</strong>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">Done</span>
        </div>
      )}
    </div>
  );
}
