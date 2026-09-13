interface CompactProgressProps {
  readonly completed: number;
  readonly total: number;
  readonly percentage: number;
  readonly label: string;
}

export function CompactProgress({ completed, total, percentage, label }: CompactProgressProps) {
  const boundedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div
      className="w-32 shrink-0 sm:w-40"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={boundedPercentage}
      aria-valuetext={`${completed} of ${total} complete`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px] tabular-nums">
        <strong className="font-bold text-ink-950">{completed}/{total}</strong>
        <span className="font-semibold text-ink-400">{boundedPercentage}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div
          key={`${completed}-${total}`}
          className="progress-power-up relative h-full overflow-hidden rounded-full bg-leaf-500 transition-[width] duration-500 ease-out"
          style={{ width: `${boundedPercentage}%` }}
        />
      </div>
    </div>
  );
}
