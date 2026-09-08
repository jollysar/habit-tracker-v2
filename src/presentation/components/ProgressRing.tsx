interface ProgressRingProps {
  readonly percentage: number;
  readonly compact?: boolean;
}

export function ProgressRing({ percentage, compact = false }: ProgressRingProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative grid shrink-0 place-items-center ${compact ? "size-24" : "size-28"}`} aria-label={`${percentage}% complete`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
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
      <div className="text-center">
        <strong className={`block font-bold tracking-[-0.04em] ${compact ? "text-xl" : "text-2xl"}`}>{percentage}%</strong>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">Done</span>
      </div>
    </div>
  );
}
